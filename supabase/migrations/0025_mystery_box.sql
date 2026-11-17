-- ERP Rosario F Kits — 0025: Mystery Box (camiseta sorpresa).
--
-- El cliente paga una box eligiendo versión, tipo, talle y qué prefiere o no quiere.
-- Qué camiseta le toca lo elige Facu a mano en /admin/mystery-box. Hasta entonces la
-- box no es una venta: no tiene SKU, así que no descuenta stock. Al asignarla se
-- registra la venta normal (registrar_venta) con el SKU elegido y el precio de la box.
--
-- Las boxes las crea /api/pedido con la clave secreta (service_role) cuando el pedido
-- del carrito se paga por transferencia con comprobante. Las que se piden por WhatsApp
-- no pasan por acá: Facu las carga como una venta común.

create sequence box_seq;

create table mystery_boxes (
  id           text primary key default 'MB-' || lpad(nextval('box_seq')::text, 4, '0'),
  creado_en    timestamptz not null default now(),
  nombre       text not null check (length(trim(nombre)) > 0),
  telefono     text not null,
  version      text not null check (version in ('fan', 'player')),
  tipo         text not null check (tipo in ('cualquiera', 'club', 'seleccion', 'retro')),
  talle        text not null,
  preferencia  text,
  excluir      text,
  precio       numeric not null check (precio > 0),
  -- La venta de las camisetas que vinieron en el mismo pedido, si hubo. Es texto y
  -- no FK a propósito: con dos vínculos a ventas la API de Supabase rechaza las
  -- consultas que piden las dos tablas juntas.
  venta_web    text,
  -- Ruta del comprobante en el bucket privado `comprobantes`.
  comprobante  text,
  estado       text not null default 'Pendiente' check (estado in ('Pendiente', 'Asignada', 'Rechazada')),
  venta_id     text references ventas,
  sku          integer references skus,
  motivo       text,
  resuelto_en  timestamptz,
  check (estado <> 'Asignada' or (venta_id is not null and sku is not null))
);
create index mystery_boxes_estado on mystery_boxes (estado, creado_en);
create index mystery_boxes_telefono on mystery_boxes (telefono) where estado = 'Pendiente';

alter table mystery_boxes enable row level security;
-- El panel solo lee; escribir es por las funciones de abajo (y la clave secreta,
-- que pasa por encima de RLS, para crearlas desde la web).
create policy admin_lee on mystery_boxes for select to authenticated using (es_admin());
revoke all on mystery_boxes from anon, authenticated;
grant select on mystery_boxes to authenticated;
grant all on mystery_boxes to service_role;
grant usage on sequence box_seq to service_role;

-- ---------------------------------------------------------------------------
-- asignar_mystery_box: Facu eligió la camiseta. Registra la venta con ese SKU al
-- precio de la box (el descuento contra la lista queda anotado como motivo) y, si
-- ya vio la transferencia, la cobra en el mismo paso.
-- ---------------------------------------------------------------------------
create function asignar_mystery_box(
  p_box    text,
  p_sku    integer,
  p_cobrar boolean default false,
  p_metodo metodo_pago default 'Transferencia'
) returns text
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_box   mystery_boxes%rowtype;
  v_talle text;
  v_venta text;
begin
  perform exigir_admin();

  select * into v_box from mystery_boxes where id = p_box for update;
  if not found then
    raise exception 'No existe la box %', p_box using hint = 'box_inexistente';
  end if;
  if v_box.estado <> 'Pendiente' then
    raise exception 'La box % ya está %', p_box, lower(v_box.estado) using hint = 'box_resuelta';
  end if;

  select talle into v_talle from skus where sku = p_sku;
  if not found then
    raise exception 'El SKU % no existe', p_sku using hint = 'sku_inexistente';
  end if;
  if upper(v_talle) <> upper(v_box.talle) then
    raise exception 'La box es talle % y el SKU % es talle %', v_box.talle, p_sku, v_talle
      using hint = 'box_otro_talle';
  end if;

  v_venta := registrar_venta(
    jsonb_build_object('nombre', v_box.nombre, 'telefono', v_box.telefono),
    jsonb_build_array(jsonb_build_object(
      'sku', p_sku, 'cantidad', 1, 'precio_unit', v_box.precio,
      'motivo_descuento', 'Mystery Box ' || v_box.id)),
    case when p_cobrar then 'Pagada' else 'Reservada' end::estado_item,
    case when p_cobrar
      then jsonb_build_object('monto', v_box.precio, 'metodo', p_metodo, 'tipo', 'Total') end,
    'Web',
    current_date,
    null,
    'Mystery Box ' || v_box.id || ' (' || v_box.version || ', ' || v_box.tipo || ', talle ' || v_box.talle || ')'
      || coalesce('. Prefiere: ' || nullif(v_box.preferencia, ''), '')
      || coalesce('. No quiere: ' || nullif(v_box.excluir, ''), '')
  );

  update mystery_boxes
  set estado = 'Asignada', venta_id = v_venta, sku = p_sku, resuelto_en = now()
  where id = p_box;

  return v_venta;
end $$;

-- ---------------------------------------------------------------------------
-- rechazar_mystery_box: el comprobante no está, o no hay cómo cumplirla. No toca
-- stock ni caja (la box nunca fue venta); si hay que devolver plata, se hace por
-- fuera y se anota en el motivo.
-- ---------------------------------------------------------------------------
create function rechazar_mystery_box(p_box text, p_motivo text) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_estado text;
begin
  perform exigir_admin();
  if nullif(trim(p_motivo), '') is null then
    raise exception 'Falta el motivo: por qué se rechaza la box' using hint = 'sin_motivo';
  end if;

  select estado into v_estado from mystery_boxes where id = p_box for update;
  if not found then
    raise exception 'No existe la box %', p_box using hint = 'box_inexistente';
  end if;
  if v_estado <> 'Pendiente' then
    raise exception 'La box % ya está %', p_box, lower(v_estado) using hint = 'box_resuelta';
  end if;

  update mystery_boxes
  set estado = 'Rechazada', motivo = trim(p_motivo), resuelto_en = now()
  where id = p_box;
end $$;

revoke execute on function asignar_mystery_box(text, integer, boolean, metodo_pago) from public, anon;
revoke execute on function rechazar_mystery_box(text, text) from public, anon;
grant execute on function asignar_mystery_box(text, integer, boolean, metodo_pago) to authenticated, service_role;
grant execute on function rechazar_mystery_box(text, text) to authenticated, service_role;
