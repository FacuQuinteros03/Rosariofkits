-- ERP Rosario F Kits — 0012: métricas (docs/erp-diseno.md, sección 4).
-- Todo sale de vistas: nadie calcula ni tipea nada.

-- ---------------------------------------------------------------------------
-- La base: una fila por item vendido no cancelado, con todas sus dimensiones.
-- ---------------------------------------------------------------------------
create view v_hechos_venta with (security_invoker = true) as
select
  vi.id, v.id as venta_id, v.fecha, date_trunc('month', v.fecha)::date as mes,
  v.cliente_id, c.nombre as cliente, c.tipo as tipo_cliente,
  coalesce(v.canal, 'Sin dato') as canal, v.cupon,
  vi.sku, s.talle, m.id as modelo_id, m.nombre as modelo, m.categoria, m.tipo, m.linea,
  coalesce(e.nombre, 'Sin equipo') as equipo,
  vi.pedido_id, coalesce(pr.nombre, 'Sin pedido') as proveedor,
  vi.estado, vi.cantidad,
  vi.cantidad * vi.precio_unit                     as facturado,
  vi.cantidad * vi.costo_unit                      as costo,
  vi.cantidad * (vi.precio_unit - vi.costo_unit)   as ganancia,
  vi.cantidad * (vi.precio_lista - vi.precio_unit) as descuento,
  vi.promo, vi.precio_unit, vi.precio_lista, vi.precio_antes,
  p.recibido_en,
  p.recibido_en is null or v.fecha < p.recibido_en as fue_preventa,
  greatest(v.fecha - p.recibido_en, 0)             as dias_en_stock,
  vi.costo_estimado
    or v.fecha < coalesce((select valor::date from parametros where clave = 'fecha_corte'), 'infinity'::date)
                                                   as dato_estimado
from venta_items vi
join ventas v            on v.id = vi.venta_id
join clientes c          on c.id = v.cliente_id
join skus s              on s.sku = vi.sku
join modelos m           on m.id = s.modelo_id
left join equipos e      on e.id = m.equipo_id
left join pedidos p      on p.id = vi.pedido_id
left join proveedores pr on pr.id = p.proveedor_id
where vi.estado <> 'Cancelada';

-- ---------------------------------------------------------------------------
-- Ventas y margen por dimensión, por mes.
-- ---------------------------------------------------------------------------
create view v_ventas_por_modelo with (security_invoker = true) as
select mes, modelo_id, modelo, linea, tipo,
  sum(cantidad) as unidades, sum(facturado) as facturado, sum(costo) as costo,
  sum(ganancia) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_venta group by mes, modelo_id, modelo, linea, tipo;

create view v_ventas_por_equipo with (security_invoker = true) as
select mes, equipo,
  sum(cantidad) as unidades, sum(facturado) as facturado, sum(costo) as costo,
  sum(ganancia) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_venta group by mes, equipo;

create view v_ventas_por_linea with (security_invoker = true) as
select mes, linea,
  sum(cantidad) as unidades, sum(facturado) as facturado, sum(costo) as costo,
  sum(ganancia) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_venta group by mes, linea;

create view v_ventas_por_talle with (security_invoker = true) as
select mes, tipo, talle,
  sum(cantidad) as unidades, sum(facturado) as facturado, sum(costo) as costo,
  sum(ganancia) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_venta group by mes, tipo, talle;

create view v_ventas_por_proveedor with (security_invoker = true) as
select mes, proveedor,
  sum(cantidad) as unidades, sum(facturado) as facturado, sum(costo) as costo,
  sum(ganancia) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_venta group by mes, proveedor;

-- ---------------------------------------------------------------------------
-- Rotación: días entre que llega y se vende. La preventa va aparte.
-- ---------------------------------------------------------------------------
create view v_rotacion with (security_invoker = true) as
select modelo_id, modelo, linea, proveedor,
  sum(cantidad) filter (where not fue_preventa)                         as unidades_en_stock,
  sum(cantidad) filter (where fue_preventa)                             as unidades_preventa,
  avg(dias_en_stock) filter (where not fue_preventa)                    as dias_promedio,
  percentile_cont(0.5) within group (order by dias_en_stock)
    filter (where not fue_preventa)                                     as dias_mediana,
  bool_or(dato_estimado)                                                as dato_estimado
from v_hechos_venta
group by modelo_id, modelo, linea, proveedor;

-- ---------------------------------------------------------------------------
-- Stock quieto: lo que está en casa sin vender, por antigüedad, a costo y a lista.
-- La antigüedad es desde el pedido recibido más viejo del SKU.
-- ---------------------------------------------------------------------------
create view v_stock_inmovilizado with (security_invoker = true) as
select st.sku, m.nombre as modelo, s.talle, m.linea, st.fisico,
  r.recibido_en,
  current_date - r.recibido_en as dias,
  case
    when r.recibido_en is null               then 'Sin fecha'
    when current_date - r.recibido_en <= 30  then '0-30'
    when current_date - r.recibido_en <= 60  then '31-60'
    when current_date - r.recibido_en <= 90  then '61-90'
    else '+90'
  end as tramo,
  st.fisico * coalesce(cs.costo_unit, 0) as valor_costo,
  st.fisico * s.precio                  as valor_lista
from v_stock st
join skus s    on s.sku = st.sku
join modelos m on m.id = s.modelo_id
left join v_costo_sku cs on cs.sku = st.sku
left join (
  select i.sku, min(p.recibido_en) as recibido_en
  from pedido_items i join pedidos p on p.id = i.pedido_id
  where p.estado = 'Recibido' and i.cantidad_recibida > 0
  group by i.sku
) r on r.sku = st.sku
where st.fisico > 0;

-- ---------------------------------------------------------------------------
-- Talles: cuánto se vende de lo que entra, cuánto tarda y cuántos días estuvo agotado.
-- ---------------------------------------------------------------------------
create view v_talles with (security_invoker = true) as
with entradas as (
  select m.tipo, s.talle, sum(st.recibido + greatest(st.ajustes, 0)) as recibidas
  from v_stock st join skus s on s.sku = st.sku join modelos m on m.id = s.modelo_id
  group by m.tipo, s.talle
),
ventas as (
  select tipo, talle, sum(cantidad) as vendidas,
         avg(dias_en_stock) filter (where not fue_preventa) as dias_hasta_venta
  from v_hechos_venta group by tipo, talle
),
agotado as (
  -- noches con disponible = 0 después de haber tenido stock alguna vez
  select m.tipo, s.talle, count(*) as dias_agotado
  from (
    select sku, fecha, disponible,
           bool_or(disponible > 0) over (partition by sku order by fecha) as tuvo_stock
    from stock_diario
  ) d
  join skus s on s.sku = d.sku join modelos m on m.id = s.modelo_id
  where d.disponible = 0 and d.tuvo_stock
  group by m.tipo, s.talle
)
select coalesce(e.tipo, v.tipo) as tipo, coalesce(e.talle, v.talle) as talle,
  coalesce(e.recibidas, 0) as recibidas,
  coalesce(v.vendidas, 0)  as vendidas,
  coalesce(v.vendidas, 0)::numeric / nullif(e.recibidas, 0) as tasa_venta,
  v.dias_hasta_venta,
  coalesce(a.dias_agotado, 0) as dias_agotado
from entradas e
full join ventas v on v.tipo = e.tipo and v.talle = e.talle
left join agotado a on a.tipo = coalesce(e.tipo, v.tipo) and a.talle = coalesce(e.talle, v.talle);

-- La curva para el próximo pedido: participación de cada talle en lo vendido en los
-- últimos 6 meses, por tipo, y "de cada 10".
create view v_curva_talles with (security_invoker = true) as
select tipo, talle, unidades,
  unidades::numeric / nullif(sum(unidades) over (partition by tipo), 0) as participacion,
  round(10 * unidades::numeric / nullif(sum(unidades) over (partition by tipo), 0))::integer as de_cada_10
from (
  select tipo, talle, sum(cantidad) as unidades
  from v_hechos_venta
  where fecha >= current_date - interval '6 months'
  group by tipo, talle
) t;

-- ---------------------------------------------------------------------------
-- Margen real por pedido, con la importación prorrateada.
-- ---------------------------------------------------------------------------
create view v_margen_pedido with (security_invoker = true) as
with vendido as (
  select pedido_id, sum(cantidad) as unidades, sum(facturado) as facturado,
         sum(costo) as costo, sum(ganancia) as ganancia
  from v_hechos_venta where pedido_id is not null group by pedido_id
),
resto as (
  -- lo que queda sin vender de cada pedido, a costo y a precio de lista
  select ci.pedido_id,
    sum(greatest(ci.esperado - coalesce(vs.vendidas, 0), 0))::bigint                 as sin_vender,
    sum(greatest(ci.esperado - coalesce(vs.vendidas, 0), 0) * ci.costo_unit_real)    as sin_vender_costo,
    sum(greatest(ci.esperado - coalesce(vs.vendidas, 0), 0) * s.precio)              as sin_vender_lista
  from (
    select c.*, case p.estado when 'Recibido' then c.cantidad_recibida else c.cantidad end as esperado
    from v_costo_item c join pedidos p on p.id = c.pedido_id
  ) ci
  join skus s on s.sku = ci.sku
  left join (
    select pedido_id, sku, sum(cantidad) as vendidas
    from venta_items where estado <> 'Cancelada' and pedido_id is not null
    group by pedido_id, sku
  ) vs on vs.pedido_id = ci.pedido_id and vs.sku = ci.sku
  group by ci.pedido_id
)
select p.id as pedido_id, p.fecha, p.proveedor, p.estado, p.recibido_en,
  p.costo_total, p.unidades, p.unidades_recibidas,
  coalesce(v.unidades, 0)   as unidades_vendidas,
  coalesce(v.facturado, 0)  as facturado,
  coalesce(v.costo, 0)      as costo_vendido,
  coalesce(v.ganancia, 0)   as ganancia_realizada,
  coalesce(r.sin_vender, 0) as unidades_sin_vender,
  coalesce(r.sin_vender_costo, 0) as sin_vender_a_costo,
  coalesce(r.sin_vender_lista, 0) as sin_vender_a_lista,
  coalesce(v.facturado, 0) / nullif(p.costo_total, 0) as recuperado,
  coalesce(v.facturado, 0) + coalesce(r.sin_vender_lista, 0) - p.costo_total as margen_proyectado
from v_pedidos p
left join vendido v on v.pedido_id = p.id
left join resto r   on r.pedido_id = p.id
where p.estado <> 'Cancelado';

-- ---------------------------------------------------------------------------
-- Clientes y cómo compran.
-- ---------------------------------------------------------------------------
create view v_clientes_metricas with (security_invoker = true) as
select c.id, c.nombre, c.tipo, c.telefono,
  count(v.id)                 as compras,
  coalesce(sum(v.unidades), 0) as unidades,
  coalesce(sum(v.total), 0)   as total,
  avg(v.total)                as ticket_promedio,
  min(v.fecha)                as primera_compra,
  max(v.fecha)                as ultima_compra,
  count(v.id) >= 2            as recurrente,
  coalesce(sum(v.saldo), 0)   as saldo
from clientes c
left join v_ventas v on v.cliente_id = c.id and v.estado <> 'Cancelada'
group by c.id;

create view v_ticket with (security_invoker = true) as
with ventas_mes as (
  select date_trunc('month', v.fecha)::date as mes, v.id, v.cliente_id, v.total, v.unidades,
         coalesce(v.canal, 'Sin dato') as canal, c.tipo,
         -- recurrente: ya había comprado antes de esta venta
         exists (select 1 from ventas v2 where v2.cliente_id = v.cliente_id
                 and (v2.fecha, v2.id) < (v.fecha, v.id)) as recurrente
  from v_ventas v join clientes c on c.id = v.cliente_id
  where v.estado <> 'Cancelada'
)
select mes, canal,
  count(*)                                         as ventas,
  sum(total)                                       as facturado,
  avg(total)                                       as ticket_promedio,
  avg(unidades)                                    as unidades_por_venta,
  avg(recurrente::int)                             as pct_recurrentes,
  avg((tipo = 'Mayorista')::int)                   as pct_mayorista
from ventas_mes
group by grouping sets ((mes), (mes, canal));      -- canal null = total del mes

create view v_cobros_metodo with (security_invoker = true) as
select date_trunc('month', fecha)::date as mes, metodo, tipo,
  count(*) as pagos, sum(monto) as monto
from pagos group by 1, 2, 3;

-- ---------------------------------------------------------------------------
-- Promos, cupones y rebajas.
-- ---------------------------------------------------------------------------
create view v_promos with (security_invoker = true) as
select coalesce(promo, case when cupon is not null then 'Cupón ' || cupon end, 'Sin promo') as promo,
  count(distinct venta_id) as ventas,
  sum(cantidad)            as unidades,
  sum(facturado)           as facturado,
  sum(descuento)           as descuento,
  sum(ganancia)            as ganancia,
  sum(ganancia) + sum(descuento) as ganancia_sin_descuento
from v_hechos_venta
group by 1;

-- Cada cambio de precio (de `eventos`) con las ventas de las 4 semanas de antes y de
-- después. Las cargas iniciales de la migración no cuentan como cambio.
create view v_rebajas with (security_invoker = true) as
with cambios as (
  select (despues ->> 'sku')::integer as sku, en::date as fecha,
         (antes ->> 'precio')::numeric as precio_anterior,
         (despues ->> 'precio')::numeric as precio_nuevo,
         (despues ->> 'precio_antes')::numeric as precio_tachado
  from eventos
  where tabla = 'skus' and accion = 'update'
    and (antes ->> 'precio') is distinct from (despues ->> 'precio')
)
select c.sku, m.nombre as modelo, s.talle, c.fecha, c.precio_anterior, c.precio_nuevo, c.precio_tachado,
  (select coalesce(sum(h.cantidad), 0) from v_hechos_venta h
    where h.modelo_id = m.id and h.fecha >= c.fecha - 28 and h.fecha < c.fecha) / 4.0 as por_semana_antes,
  (select coalesce(sum(h.cantidad), 0) from v_hechos_venta h
    where h.modelo_id = m.id and h.fecha >= c.fecha and h.fecha < c.fecha + 28) / 4.0  as por_semana_despues
from cambios c
join skus s on s.sku = c.sku
join modelos m on m.id = s.modelo_id;

-- ---------------------------------------------------------------------------
-- Preventa: lo reservado contra lo que llegó, con los faltantes y a quién afectan.
-- ---------------------------------------------------------------------------
create view v_preventa with (security_invoker = true) as
select i.pedido_id, p.estado as estado_pedido, i.sku, m.nombre as modelo, s.talle, s.estampado,
  i.cantidad as pedidas,
  i.cantidad_recibida as recibidas,
  coalesce(sum(vi.cantidad) filter (where v.fecha < coalesce(p.recibido_en, 'infinity'::date)), 0) as vendidas_antes_de_llegar,
  coalesce(sum(vi.cantidad) filter (where vi.estado = 'Señada'), 0)    as senadas,
  coalesce(sum(vi.cantidad) filter (where vi.estado = 'Reservada'), 0) as reservadas,
  coalesce(sum(vi.cantidad), 0) as vendidas,
  case when p.estado = 'Recibido'
       then greatest(coalesce(sum(vi.cantidad), 0) - i.cantidad_recibida, 0)
       else 0 end as faltantes,
  string_agg(distinct c.nombre, ', ') as clientes
from pedido_items i
join pedidos p on p.id = i.pedido_id
join skus s on s.sku = i.sku
join modelos m on m.id = s.modelo_id
left join venta_items vi on vi.pedido_id = i.pedido_id and vi.sku = i.sku and vi.estado <> 'Cancelada'
left join ventas v on v.id = vi.venta_id
left join clientes c on c.id = v.cliente_id
where p.estado <> 'Cancelado'
group by i.id, p.estado, p.recibido_en, m.nombre, s.talle, s.estampado;

-- ---------------------------------------------------------------------------
-- Caja: posición y flujo.
-- ---------------------------------------------------------------------------
create view v_posicion with (security_invoker = true) as
select
  t.saldo_caja,
  -- plata cobrada de mercadería que todavía no se entregó: es del cliente hasta entregar
  (select coalesce(sum(least(v.cobrado, pend.pendiente)), 0)
     from v_ventas v
     join (select venta_id, sum(cantidad * precio_unit) as pendiente from venta_items
           where estado in ('Reservada', 'Señada', 'Pagada') group by venta_id) pend
       on pend.venta_id = v.id)                                as senas_sin_entregar,
  t.a_cobrar,
  t.deuda_proveedores,
  t.saldo_caja + t.a_cobrar - t.deuda_proveedores               as posicion_neta
from v_tablero t;

create view v_flujo_mensual with (security_invoker = true) as
select date_trunc('month', fecha)::date as mes, categoria,
  coalesce(sum(monto) filter (where tipo = 'Ingreso'), 0) as ingresos,
  coalesce(sum(monto) filter (where tipo = 'Egreso'), 0)  as egresos,
  coalesce(sum(case tipo when 'Ingreso' then monto else -monto end), 0) as neto
from caja_movimientos group by 1, 2;

create view v_flujo_mes with (security_invoker = true) as
select mes, sum(ingresos) as ingresos, sum(egresos) as egresos, sum(neto) as neto,
  sum(sum(neto)) over (order by mes) as saldo_acumulado
from v_flujo_mensual group by mes;

-- Demanda de lo agotado (consultas por encargue desde la web).
create view v_consultas with (security_invoker = true) as
select c.sku, m.nombre as modelo, s.talle, count(*) as consultas, max(c.en) as ultima,
  st.disponible
from consultas c
join skus s on s.sku = c.sku
join modelos m on m.id = s.modelo_id
join v_stock st on st.sku = c.sku
group by c.sku, m.nombre, s.talle, st.disponible;

grant select on
  v_hechos_venta, v_ventas_por_modelo, v_ventas_por_equipo, v_ventas_por_linea,
  v_ventas_por_talle, v_ventas_por_proveedor, v_rotacion, v_stock_inmovilizado,
  v_talles, v_curva_talles, v_margen_pedido, v_clientes_metricas, v_ticket,
  v_cobros_metodo, v_promos, v_rebajas, v_preventa, v_posicion, v_flujo_mensual,
  v_flujo_mes, v_consultas
to authenticated;
