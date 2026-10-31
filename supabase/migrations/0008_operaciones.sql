-- ERP Rosario F Kits — 0008: las operaciones. Todo lo que escribe pasa por acá.
--
-- Cada función corre en una sola transacción: una venta con su pago y su caja entra
-- entera o no entra. Son SECURITY DEFINER (escriben aunque el usuario solo tenga
-- permiso de lectura) y por eso lo primero que hacen es exigir_admin().
-- Los errores salen en castellano, con un `hint` corto que la app puede usar.

-- ---------------------------------------------------------------------------
-- Acceso
-- ---------------------------------------------------------------------------
create table admins (email text primary key check (email = lower(email)));

-- true si el mail del usuario logueado está en admins, o si es el job con la clave de
-- servicio. security definer: lee admins sin que el usuario pueda leerla.
create function es_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role'
      or exists (select 1 from admins where email = lower(auth.jwt() ->> 'email'));
$$;

create function exigir_admin() returns void
language plpgsql stable as $$
begin
  if not es_admin() then
    raise exception 'No autorizado' using errcode = '42501', hint = 'no_autorizado';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Ayudas internas
-- ---------------------------------------------------------------------------

-- De qué pedido sale la próxima unidad de un SKU: el más viejo que todavía tiene
-- unidades sin vender (FIFO). null si el stock vino de un ajuste.
create function pedido_fifo(p_sku integer) returns text
language sql stable as $$
  select i.pedido_id
  from pedido_items i
  join pedidos p on p.id = i.pedido_id
  where i.sku = p_sku and p.estado <> 'Cancelado'
    and (case p.estado when 'Recibido' then i.cantidad_recibida else i.cantidad end)
        > (select coalesce(sum(vi.cantidad), 0) from venta_items vi
           where vi.sku = p_sku and vi.pedido_id = i.pedido_id and vi.estado <> 'Cancelada')
  order by p.fecha, p.id
  limit 1;
$$;

-- Busca un cliente por id, o por teléfono, o lo crea.
create function cliente_de(p_cliente jsonb) returns text
language plpgsql as $$
declare
  v_id   text := nullif(trim(p_cliente ->> 'id'), '');
  v_tel  text := nullif(regexp_replace(coalesce(p_cliente ->> 'telefono', ''), '\D', '', 'g'), '');
  v_nom  text := nullif(trim(p_cliente ->> 'nombre'), '');
begin
  if v_id is not null then
    if not exists (select 1 from clientes where id = v_id) then
      raise exception 'No existe el cliente %', v_id using hint = 'cliente_inexistente';
    end if;
    return v_id;
  end if;
  if v_tel is not null then
    select id into v_id from clientes where telefono = v_tel;
    if v_id is not null then return v_id; end if;
  end if;
  if v_nom is null then
    raise exception 'Falta el nombre del cliente' using hint = 'cliente_sin_nombre';
  end if;
  insert into clientes (nombre, telefono, tipo)
  values (v_nom, v_tel, coalesce(nullif(p_cliente ->> 'tipo', ''), 'Minorista'))
  returning id into v_id;
  return v_id;
end $$;

-- Pasa los items no cancelados de una venta a Pagada si ya está cobrada entera.
create function actualizar_pagada(p_venta text) returns void
language plpgsql as $$
begin
  if (select saldo from v_ventas where id = p_venta) <= 0 then
    update venta_items set estado = 'Pagada'
    where venta_id = p_venta and estado in ('Reservada', 'Señada');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- registrar_venta
--   p_cliente: {"id": "C-012"} o {"nombre": "...", "telefono": "...", "tipo": "Mayorista"}
--   p_items:   [{"sku": 4012, "cantidad": 1, "precio_unit": 45000,
--                "promo": "2x100000", "motivo_descuento": "..."}]
--              precio_unit es opcional: si no viene, el de lista.
--   p_estado:  Reservada / Señada / Pagada / Entregada
--   p_pago:    null o {"monto": 20000, "metodo": "Transferencia", "tipo": "Seña"}
-- Devuelve el Venta_ID.
-- ---------------------------------------------------------------------------
create function registrar_venta(
  p_cliente jsonb,
  p_items   jsonb,
  p_estado  estado_item,
  p_pago    jsonb default null,
  p_canal   text default null,
  p_fecha   date default current_date,
  p_cupon   text default null,
  p_notas   text default null
) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_cliente text;
  v_venta   text;
  v_item    jsonb;
  v_sku     skus%rowtype;
  v_cant    integer;
  v_precio  numeric;
  v_pedido  text;
  v_costo   numeric;
  v_skus    integer[];
begin
  perform exigir_admin();

  if p_estado = 'Cancelada' then
    raise exception 'Una venta nueva no puede nacer cancelada' using hint = 'estado_invalido';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene items' using hint = 'sin_items';
  end if;

  -- Bloquear los SKU primero: dos ventas de la misma última unidad se ordenan acá.
  select array_agg(distinct (x ->> 'sku')::integer) into v_skus
  from jsonb_array_elements(p_items) x;
  perform 1 from skus where sku = any (v_skus) order by sku for update;

  v_cliente := cliente_de(p_cliente);

  insert into ventas (fecha, cliente_id, canal, cupon, notas, creado_por)
  values (p_fecha, v_cliente, p_canal, p_cupon, p_notas, auth.uid())
  returning id into v_venta;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_sku from skus where sku = (v_item ->> 'sku')::integer;
    if not found then
      raise exception 'El SKU % no existe', v_item ->> 'sku' using hint = 'sku_inexistente';
    end if;

    v_cant   := coalesce((v_item ->> 'cantidad')::integer, 1);
    v_precio := coalesce((v_item ->> 'precio_unit')::numeric, v_sku.precio);
    v_pedido := pedido_fifo(v_sku.sku);

    select costo_unit_real into v_costo from v_costo_item
    where pedido_id = v_pedido and sku = v_sku.sku;
    if v_costo is null then
      select costo_unit into v_costo from v_costo_sku where sku = v_sku.sku;
    end if;
    if v_costo is null then
      raise exception 'No hay costo cargado para el SKU %: cargá el costo del pedido primero', v_sku.sku
        using hint = 'sin_costo';
    end if;

    if v_precio < v_sku.precio
       and nullif(trim(v_item ->> 'promo'), '') is null
       and nullif(trim(v_item ->> 'motivo_descuento'), '') is null then
      raise exception 'El SKU % va a % y la lista dice %: falta el motivo del descuento',
        v_sku.sku, v_precio, v_sku.precio using hint = 'descuento_sin_motivo';
    end if;

    insert into venta_items (venta_id, sku, cantidad, precio_unit, precio_lista, precio_antes,
                             costo_unit, pedido_id, estado, promo, motivo_descuento, entregado_en)
    values (v_venta, v_sku.sku, v_cant, v_precio, v_sku.precio, v_sku.precio_antes,
            round(v_costo, 2), v_pedido, p_estado,
            nullif(trim(v_item ->> 'promo'), ''), nullif(trim(v_item ->> 'motivo_descuento'), ''),
            case when p_estado = 'Entregada' then now() end);
  end loop;

  perform verificar_stock(v_skus);

  if p_pago is not null and coalesce((p_pago ->> 'monto')::numeric, 0) <> 0 then
    perform registrar_pago(v_venta, (p_pago ->> 'monto')::numeric,
                           (p_pago ->> 'metodo')::metodo_pago,
                           coalesce((p_pago ->> 'tipo')::tipo_pago, 'Total'),
                           false, p_fecha, null);
  end if;

  return v_venta;
end $$;

-- ---------------------------------------------------------------------------
-- registrar_pago: seña, saldo, pago total o devolución (monto negativo).
-- Genera su movimiento de caja (trigger de 0004). Si con esto la venta queda
-- cobrada entera, los items reservados o señados pasan a Pagada. p_entregar marca
-- además todo como entregado.
-- ---------------------------------------------------------------------------
create function registrar_pago(
  p_venta    text,
  p_monto    numeric,
  p_metodo   metodo_pago,
  p_tipo     tipo_pago,
  p_entregar boolean default false,
  p_fecha    date default current_date,
  p_notas    text default null
) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_saldo  numeric;
  v_cobrado numeric;
  v_pago   text;
begin
  perform exigir_admin();

  select saldo, cobrado into v_saldo, v_cobrado from v_ventas where id = p_venta;
  if not found then
    raise exception 'No existe la venta %', p_venta using hint = 'venta_inexistente';
  end if;
  if p_tipo = 'Devolucion' then
    if p_monto >= 0 or -p_monto > v_cobrado then
      raise exception 'Una devolución va en negativo y no puede superar lo cobrado (%)', v_cobrado
        using hint = 'devolucion_invalida';
    end if;
  elsif p_monto <= 0 then
    raise exception 'El monto tiene que ser mayor que cero' using hint = 'monto_invalido';
  elsif p_monto > v_saldo then
    raise exception 'El pago (%) supera lo que falta cobrar de % (%)', p_monto, p_venta, v_saldo
      using hint = 'pago_excede_saldo';
  end if;

  insert into pagos (fecha, venta_id, monto, metodo, tipo, notas)
  values (p_fecha, p_venta, p_monto, p_metodo, p_tipo, p_notas)
  returning id into v_pago;

  if p_tipo <> 'Devolucion' then
    perform actualizar_pagada(p_venta);
  end if;
  if p_entregar then
    perform cambiar_estado(p_venta, null, 'Entregada');
  end if;
  return v_pago;
end $$;

-- ---------------------------------------------------------------------------
-- cambiar_estado: entregar, cancelar, o pasar de Reservada a Señada.
--   p_items: ids de venta_items, o null para todos los no cancelados de la venta.
-- Un item cancelado no vuelve: se carga una venta nueva.
-- ---------------------------------------------------------------------------
create function cambiar_estado(
  p_venta  text,
  p_items  bigint[],
  p_estado estado_item
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_skus integer[];
begin
  perform exigir_admin();

  select array_agg(distinct sku) into v_skus from venta_items
  where venta_id = p_venta and (p_items is null or id = any (p_items));
  if v_skus is null then
    raise exception 'La venta % no tiene esos items', p_venta using hint = 'items_inexistentes';
  end if;
  perform 1 from skus where sku = any (v_skus) order by sku for update;

  if exists (select 1 from venta_items
             where venta_id = p_venta and (p_items is null or id = any (p_items))
               and estado = 'Cancelada' and p_items is not null) then
    raise exception 'Un item cancelado no vuelve: cargá una venta nueva' using hint = 'item_cancelado';
  end if;

  update venta_items
  set estado = p_estado,
      entregado_en = case when p_estado = 'Entregada' then coalesce(entregado_en, now()) end
  where venta_id = p_venta
    and (p_items is null or id = any (p_items))
    and estado <> 'Cancelada';

  perform verificar_stock(v_skus);
end $$;

-- ---------------------------------------------------------------------------
-- registrar_movimiento: gastos, pagos al proveedor, aportes y retiros.
-- Las ventas entran por registrar_pago, nunca por acá.
-- ---------------------------------------------------------------------------
create function registrar_movimiento(
  p_tipo      tipo_mov,
  p_categoria categoria_mov,
  p_monto     numeric,
  p_metodo    metodo_pago,
  p_pedido    text default null,
  p_nota      text default null,
  p_fecha     date default current_date
) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id text;
begin
  perform exigir_admin();
  if p_categoria = 'Venta' then
    raise exception 'Los cobros de ventas se cargan como pago de la venta' using hint = 'usar_registrar_pago';
  end if;
  if p_monto <= 0 then
    raise exception 'El monto tiene que ser mayor que cero' using hint = 'monto_invalido';
  end if;
  insert into caja_movimientos (fecha, tipo, categoria, monto, metodo, pedido_id, nota)
  values (p_fecha, p_tipo, p_categoria, p_monto, p_metodo, p_pedido, p_nota)
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- Pedidos
--   p_items: [{"sku": 4012, "cantidad": 1, "costo_unit": 27000, "apellido": "MESSI",
--              "nota_estampado": "10"}]
-- ---------------------------------------------------------------------------
create function crear_pedido(
  p_proveedor        text,
  p_items            jsonb,
  p_fecha            date default current_date,
  p_costo_mercaderia numeric default null,
  p_costo_envio      numeric default null,
  p_otros            numeric default null,
  p_notas            text default null
) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_prov   bigint;
  v_pedido text;
begin
  perform exigir_admin();
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'El pedido no tiene items' using hint = 'sin_items';
  end if;

  insert into proveedores (nombre) values (trim(p_proveedor))
  on conflict (nombre) do nothing;
  select id into v_prov from proveedores where nombre = trim(p_proveedor);

  insert into pedidos (fecha, proveedor_id, costo_mercaderia, costo_envio, otros, notas)
  values (p_fecha, v_prov, p_costo_mercaderia, p_costo_envio, p_otros, p_notas)
  returning id into v_pedido;

  insert into pedido_items (pedido_id, sku, cantidad, costo_unit, apellido, nota_estampado)
  select v_pedido, (x ->> 'sku')::integer, coalesce((x ->> 'cantidad')::integer, 1),
         (x ->> 'costo_unit')::numeric, nullif(x ->> 'apellido', ''), nullif(x ->> 'nota_estampado', '')
  from jsonb_array_elements(p_items) x;

  return v_pedido;
end $$;

-- Encargado / En transito / Cancelado. Recibido va por recibir_pedido.
create function marcar_pedido(p_pedido text, p_estado estado_pedido) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform exigir_admin();
  if p_estado = 'Recibido' then
    raise exception 'Para recibir un pedido se usa la pantalla de recepción' using hint = 'usar_recibir_pedido';
  end if;
  if (select estado from pedidos where id = p_pedido) = 'Recibido' then
    raise exception 'El pedido % ya se recibió', p_pedido using hint = 'pedido_recibido';
  end if;
  update pedidos set estado = p_estado where id = p_pedido;
  if not found then
    raise exception 'No existe el pedido %', p_pedido using hint = 'pedido_inexistente';
  end if;
  perform verificar_stock((select array_agg(sku) from pedido_items where pedido_id = p_pedido));
end $$;

-- ---------------------------------------------------------------------------
-- recibir_pedido
--   p_recibidos: [{"sku": 4012, "cantidad": 1}] con lo que llegó. Los SKU que no
--   figuran se toman como llegados enteros; para decir "no llegó" se manda cantidad 0.
-- Exige el costo antes de recibir: sin eso la ganancia es un invento.
-- ---------------------------------------------------------------------------
create function recibir_pedido(
  p_pedido      text,
  p_recibidos   jsonb default '[]',
  p_costo_envio numeric default null,
  p_otros       numeric default null,
  p_fecha       date default current_date
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_ped pedidos%rowtype;
begin
  perform exigir_admin();
  select * into v_ped from pedidos where id = p_pedido for update;
  if not found then
    raise exception 'No existe el pedido %', p_pedido using hint = 'pedido_inexistente';
  end if;
  if v_ped.estado in ('Recibido', 'Cancelado') then
    raise exception 'El pedido % está %', p_pedido, v_ped.estado using hint = 'pedido_cerrado';
  end if;

  update pedidos set costo_envio = coalesce(p_costo_envio, costo_envio),
                     otros       = coalesce(p_otros, otros)
  where id = p_pedido;

  if (select costo_mercaderia from pedidos where id = p_pedido) is null
     and exists (select 1 from pedido_items where pedido_id = p_pedido and costo_unit is null) then
    raise exception 'Falta el costo de la mercadería de %: cargalo antes de recibir', p_pedido
      using hint = 'sin_costo';
  end if;

  update pedido_items i
  set cantidad_recibida = least(i.cantidad, coalesce(
        (select (x ->> 'cantidad')::integer from jsonb_array_elements(p_recibidos) x
         where (x ->> 'sku')::integer = i.sku limit 1), i.cantidad))
  where i.pedido_id = p_pedido;

  update pedidos set estado = 'Recibido', recibido_en = p_fecha where id = p_pedido;

  perform verificar_stock((select array_agg(sku) from pedido_items where pedido_id = p_pedido));
end $$;

-- Vuelve a calcular el costo de las ventas de un pedido, cuando llega una factura
-- tarde (el envío, por ejemplo). Explícito a propósito: el costo no cambia solo.
create function recalcular_costos(p_pedido text) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_n integer;
begin
  perform exigir_admin();
  update venta_items vi
  set costo_unit = round(c.costo_unit_real, 2), costo_estimado = false
  from v_costo_item c
  where vi.pedido_id = p_pedido and c.pedido_id = p_pedido and c.sku = vi.sku
    and c.costo_unit_real is not null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- ---------------------------------------------------------------------------
-- Inventario y productos
-- ---------------------------------------------------------------------------
create function ajustar_stock(
  p_sku      integer,
  p_cantidad integer,
  p_motivo   text,
  p_fecha    date default current_date
) returns bigint
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_id bigint;
begin
  perform exigir_admin();
  perform 1 from skus where sku = p_sku for update;
  if not found then
    raise exception 'El SKU % no existe', p_sku using hint = 'sku_inexistente';
  end if;
  if coalesce(length(trim(p_motivo)), 0) < 5 then
    raise exception 'El ajuste necesita un motivo' using hint = 'ajuste_sin_motivo';
  end if;
  insert into ajustes (fecha, sku, cantidad, motivo, creado_por)
  values (p_fecha, p_sku, p_cantidad, trim(p_motivo), auth.uid())
  returning id into v_id;
  perform verificar_stock(array[p_sku]);
  return v_id;
end $$;

-- p_modelo: {"nombre", "categoria", "tipo", "linea", "equipo", "nuevo"}
-- p_skus:   [{"sku", "talle", "estampado", "dorsal", "precio", "precio_antes", "estado_pub"}]
-- Si el modelo ya existe (por nombre) le agrega los talles.
create function alta_producto(p_modelo jsonb, p_skus jsonb) returns bigint
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_modelo bigint;
  v_equipo bigint;
begin
  perform exigir_admin();

  if nullif(trim(p_modelo ->> 'equipo'), '') is not null then
    insert into equipos (nombre) values (trim(p_modelo ->> 'equipo')) on conflict (nombre) do nothing;
    select id into v_equipo from equipos where nombre = trim(p_modelo ->> 'equipo');
  end if;

  select id into v_modelo from modelos where nombre = trim(p_modelo ->> 'nombre');
  if v_modelo is null then
    insert into modelos (nombre, categoria, tipo, linea, equipo_id, nuevo)
    values (trim(p_modelo ->> 'nombre'), p_modelo ->> 'categoria',
            (p_modelo ->> 'tipo')::tipo_producto, (p_modelo ->> 'linea')::linea,
            v_equipo, coalesce((p_modelo ->> 'nuevo')::boolean, false))
    returning id into v_modelo;
  end if;

  insert into skus (sku, modelo_id, talle, estampado, dorsal, precio, precio_antes, estado_pub)
  select (x ->> 'sku')::integer, v_modelo, x ->> 'talle', nullif(trim(x ->> 'estampado'), ''),
         coalesce((x ->> 'dorsal')::boolean, false), (x ->> 'precio')::numeric,
         (x ->> 'precio_antes')::numeric, coalesce((x ->> 'estado_pub')::estado_pub, 'Stock')
  from jsonb_array_elements(p_skus) x;

  return v_modelo;
end $$;

-- Precio, precio tachado y estado de publicación de un SKU. Un parámetro en null no
-- cambia; para borrar el precio tachado se manda p_sin_precio_antes = true.
create function editar_sku(
  p_sku              integer,
  p_precio           numeric default null,
  p_precio_antes     numeric default null,
  p_estado_pub       estado_pub default null,
  p_sin_precio_antes boolean default false
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform exigir_admin();
  update skus set
    precio       = coalesce(p_precio, precio),
    precio_antes = case when p_sin_precio_antes then null else coalesce(p_precio_antes, precio_antes) end,
    estado_pub   = coalesce(p_estado_pub, estado_pub)
  where sku = p_sku;
  if not found then
    raise exception 'El SKU % no existe', p_sku using hint = 'sku_inexistente';
  end if;
end $$;

create function marcar_nuevo(p_modelo bigint, p_nuevo boolean) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  perform exigir_admin();
  update modelos set nuevo = p_nuevo where id = p_modelo;
  if not found then
    raise exception 'No existe el modelo %', p_modelo using hint = 'modelo_inexistente';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Para el job nocturno: la foto del día en stock_diario.
-- ---------------------------------------------------------------------------
create function foto_stock_diaria(p_fecha date default current_date) returns integer
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_n integer;
begin
  perform exigir_admin();
  insert into stock_diario (fecha, sku, fisico, disponible)
  select p_fecha, sku, fisico, disponible from v_stock
  on conflict (fecha, sku) do update set fisico = excluded.fisico, disponible = excluded.disponible;
  get diagnostics v_n = row_count;
  return v_n;
end $$;
