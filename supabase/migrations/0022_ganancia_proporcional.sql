-- ERP Rosario F Kits — 0022: la ganancia cuenta en proporción a lo cobrado.
--
-- Facu, 27/10/2026: con 0020 una seña no sumaba nada hasta pagar el saldo, aunque ya
-- hubiera entrado más de la mitad de la venta. Ahora cada pago reconoce su parte: el
-- 64% cobrado de una venta es el 64% de su facturado y de su ganancia, en el mes de
-- ese pago. El resto sigue en "a cobrar".
--
-- Lo que no cambia: "a cobrar" es el saldo de la venta (lo que nos deben), las unidades
-- y la cantidad de ventas cuentan recién cuando la venta queda pagada entera, y las
-- métricas de demanda siguen saliendo de v_hechos_venta.

-- ---------------------------------------------------------------------------
-- Una fila por item y por pago: la parte del item que cobró ese pago.
-- ---------------------------------------------------------------------------
create view v_hechos_cobro with (security_invoker = true) as
with pg as (
  select p.venta_id, p.fecha, p.monto,
         sum(p.monto) over (partition by p.venta_id order by p.fecha, p.id) as acumulado
  from pagos p
),
partes as (
  -- Cada pago se reparte entre los items según lo que vale cada uno. Se multiplica
  -- antes de dividir para que la suma de los pagos de una venta dé el total exacto.
  select h.*, greatest(h.fecha, pg.fecha) as fecha_pago,
         pg.monto as monto, vv.total as total_venta,
         pg.acumulado >= vv.total and pg.acumulado - pg.monto < vv.total as completa
  from v_hechos_venta h
  join v_ventas vv on vv.id = h.venta_id
  join pg          on pg.venta_id = h.venta_id
  where vv.total > 0
  union all
  -- Una venta de $0 no tiene pagos: su costo cuenta entero en la fecha de la venta.
  select h.*, h.fecha, 1, 1, true
  from v_hechos_venta h
  join v_ventas vv on vv.id = h.venta_id
  where vv.total <= 0
)
select id, venta_id, fecha, fecha_pago,
  date_trunc('month', fecha_pago)::date as mes,
  cliente_id, cliente, tipo_cliente, canal, cupon,
  sku, talle, modelo_id, modelo, categoria, tipo, linea, equipo, pedido_id, proveedor,
  estado, promo, dato_estimado, completa,
  case when completa then cantidad else 0 end as unidades,
  facturado * monto / total_venta as facturado,
  costo     * monto / total_venta as costo,
  ganancia  * monto / total_venta as ganancia,
  descuento * monto / total_venta as descuento
from partes;

grant select on v_hechos_cobro to authenticated;

-- ---------------------------------------------------------------------------
-- Ventas y margen por dimensión: lo cobrado, en el mes de cada pago.
-- ---------------------------------------------------------------------------
create or replace view v_ventas_por_modelo with (security_invoker = true) as
select mes, modelo_id, modelo, linea, tipo,
  sum(unidades) as unidades, round(sum(facturado), 2) as facturado, round(sum(costo), 2) as costo,
  round(sum(ganancia), 2) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_cobro group by mes, modelo_id, modelo, linea, tipo;

create or replace view v_ventas_por_equipo with (security_invoker = true) as
select mes, equipo,
  sum(unidades) as unidades, round(sum(facturado), 2) as facturado, round(sum(costo), 2) as costo,
  round(sum(ganancia), 2) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_cobro group by mes, equipo;

create or replace view v_ventas_por_linea with (security_invoker = true) as
select mes, linea,
  sum(unidades) as unidades, round(sum(facturado), 2) as facturado, round(sum(costo), 2) as costo,
  round(sum(ganancia), 2) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_cobro group by mes, linea;

create or replace view v_ventas_por_talle with (security_invoker = true) as
select mes, tipo, talle,
  sum(unidades) as unidades, round(sum(facturado), 2) as facturado, round(sum(costo), 2) as costo,
  round(sum(ganancia), 2) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_cobro group by mes, tipo, talle;

create or replace view v_ventas_por_proveedor with (security_invoker = true) as
select mes, proveedor,
  sum(unidades) as unidades, round(sum(facturado), 2) as facturado, round(sum(costo), 2) as costo,
  round(sum(ganancia), 2) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_cobro group by mes, proveedor;

create or replace view v_promos with (security_invoker = true) as
select coalesce(promo, case when cupon is not null then 'Cupón ' || cupon end, 'Sin promo') as promo,
  count(distinct venta_id) filter (where completa) as ventas,
  sum(unidades)                  as unidades,
  round(sum(facturado), 2)       as facturado,
  round(sum(descuento), 2)       as descuento,
  round(sum(ganancia), 2)        as ganancia,
  round(sum(ganancia) + sum(descuento), 2) as ganancia_sin_descuento
from v_hechos_cobro
group by 1;

-- ---------------------------------------------------------------------------
-- Margen por pedido: lo cobrado es realizado; lo que falta cobrar, a cobrar.
-- ---------------------------------------------------------------------------
create or replace view v_margen_pedido with (security_invoker = true) as
with vendido as (
  select pedido_id, sum(unidades) as unidades, sum(facturado) as facturado,
         sum(costo) as costo, sum(ganancia) as ganancia
  from v_hechos_cobro where pedido_id is not null group by pedido_id
),
comprometido as (
  select pedido_id, sum(facturado) as facturado, sum(ganancia) as ganancia
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
  coalesce(v.unidades, 0)             as unidades_vendidas,
  round(coalesce(v.facturado, 0), 2)  as facturado,
  round(coalesce(v.costo, 0), 2)      as costo_vendido,
  round(coalesce(v.ganancia, 0), 2)   as ganancia_realizada,
  coalesce(r.sin_vender, 0) as unidades_sin_vender,
  coalesce(r.sin_vender_costo, 0) as sin_vender_a_costo,
  coalesce(r.sin_vender_lista, 0) as sin_vender_a_lista,
  coalesce(v.facturado, 0) / nullif(p.costo_total, 0) as recuperado,
  round(coalesce(c.facturado, 0) + coalesce(r.sin_vender_lista, 0) - p.costo_total, 2)
    as margen_proyectado,
  round(coalesce(c.facturado, 0) - coalesce(v.facturado, 0), 2) as a_cobrar,
  round(coalesce(c.ganancia, 0) - coalesce(v.ganancia, 0), 2)   as ganancia_a_cobrar
from v_pedidos p
left join vendido v      on v.pedido_id = p.id
left join comprometido c on c.pedido_id = p.id
left join resto r        on r.pedido_id = p.id
where p.estado <> 'Cancelado';

-- ---------------------------------------------------------------------------
-- Resumen mensual: lo cobrado en el mes; ventas y unidades, las que se cerraron.
-- ---------------------------------------------------------------------------
create or replace view v_resumen_mensual with (security_invoker = true) as
with meses as (
  select date_trunc('month', fecha)::date as mes from ventas
  union
  select date_trunc('month', fecha)::date from caja_movimientos
),
ventas_mes as (
  select mes, count(distinct venta_id) filter (where completa) as ventas, sum(unidades) as unidades,
         round(sum(facturado), 2) as facturado, round(sum(ganancia), 2) as ganancia
  from v_hechos_cobro group by mes
),
caja_mes as (
  select date_trunc('month', fecha)::date as mes,
    coalesce(sum(monto) filter (where categoria = 'Venta' and tipo = 'Ingreso'), 0)
      - coalesce(sum(monto) filter (where categoria = 'Venta' and tipo = 'Egreso'), 0)  as cobrado,
    coalesce(sum(monto) filter (where categoria <> 'Venta' and tipo = 'Ingreso'), 0)   as aportes,
    coalesce(sum(monto) filter (where categoria <> 'Venta' and tipo = 'Egreso'), 0)    as gastos,
    coalesce(sum(case tipo when 'Ingreso' then monto else -monto end), 0)              as neto
  from caja_movimientos group by 1
)
select m.mes,
  coalesce(v.ventas, 0)    as ventas,
  coalesce(v.unidades, 0)  as unidades,
  coalesce(v.facturado, 0) as facturado,
  coalesce(v.ganancia, 0)  as ganancia,
  coalesce(c.cobrado, 0)   as cobrado,
  coalesce(c.aportes, 0)   as aportes,
  coalesce(c.gastos, 0)    as gastos,
  coalesce(c.neto, 0)      as caja_del_mes,
  sum(coalesce(c.neto, 0)) over (order by m.mes) as caja_al_cierre
from meses m
left join ventas_mes v on v.mes = m.mes
left join caja_mes c   on c.mes = m.mes;

-- ---------------------------------------------------------------------------
-- Tablero: facturado y ganancia de lo cobrado; lo que falta, a cobrar. "a_cobrar"
-- sigue siendo el saldo de las ventas: lo que nos deben.
-- ---------------------------------------------------------------------------
create or replace view v_tablero with (security_invoker = true) as
select
  (select coalesce(sum(case tipo when 'Ingreso' then monto else -monto end), 0)
     from caja_movimientos)                                               as saldo_caja,
  (select coalesce(sum(saldo_a_pagar) filter (where saldo_a_pagar > 0), 0)
     from v_pedidos where estado <> 'Cancelado')                          as deuda_proveedores,
  (select round(coalesce(sum(facturado), 0), 2) from v_hechos_cobro)      as facturado,
  (select round(coalesce(sum(costo), 0), 2) from v_hechos_cobro)          as costo_vendido,
  (select round(coalesce(sum(ganancia), 0), 2) from v_hechos_cobro)       as ganancia,
  (select coalesce(sum(monto), 0) from pagos)                             as cobrado,
  (select coalesce(sum(saldo) filter (where saldo > 0), 0) from v_ventas) as a_cobrar,
  (select coalesce(sum(i.cantidad), 0) from pedido_items i join pedidos p on p.id = i.pedido_id
     where p.estado in ('Encargado', 'En transito'))                      as unidades_en_camino,
  (select coalesce(sum(recibido), 0) from v_stock)                        as unidades_recibidas,
  (select coalesce(sum(fisico), 0) from v_stock)                          as fisico,
  (select coalesce(sum(comprometido), 0) from v_stock)                    as comprometido,
  (select coalesce(sum(disponible), 0) from v_stock)                      as disponible,
  (select coalesce(sum(st.fisico * s.precio), 0)
     from v_stock st join skus s on s.sku = st.sku)                       as valor_lista_fisico,
  (select count(*) from v_stock where disponible < 0 or fisico < 0)       as skus_en_negativo,
  (select coalesce(sum(cantidad), 0) from venta_items where estado = 'Reservada') as reservadas_sin_senar,
  (select coalesce(sum(cantidad), 0) from venta_items where estado = 'Señada')    as senadas,
  (select coalesce(sum(cantidad), 0) from venta_items where estado = 'Pagada')    as pagadas_sin_entregar,
  (select round(coalesce(sum(ganancia), 0), 2) from v_hechos_venta)
    - (select round(coalesce(sum(ganancia), 0), 2) from v_hechos_cobro)   as ganancia_a_cobrar,
  (select count(*) from v_ventas where saldo > 0 and estado <> 'Cancelada') as ventas_a_cobrar;
