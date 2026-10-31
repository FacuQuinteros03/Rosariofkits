-- ERP Rosario F Kits — 0020: la ganancia cuenta cuando la venta está cobrada entera.
--
-- Facu, 20/10/2026: "no ganancia YA porque todavía no la tenemos". Una reserva o una
-- seña es plata a cobrar, no ganancia: hasta este cambio, el 40% de la ganancia de
-- octubre eran reservas de preventa que se pagan recién en diciembre.
--
-- La regla: un item suma a facturado y ganancia cuando su venta no debe nada, en el mes
-- en que entró el último pago (o el de la venta, si se pagó antes). Lo que se debe va a
-- "a cobrar" (v_tablero.a_cobrar y ganancia_a_cobrar). Lo que se paga entero aunque no
-- se haya entregado (Cirilo, V-0020) sí es ganancia.
--
-- Las métricas de demanda (talles, curva, rotación, rebajas, preventa) siguen contando
-- toda venta no cancelada, en el mes de la venta: una reserva es una camiseta que se pidió.

-- ---------------------------------------------------------------------------
-- La base: las mismas columnas, más si está cobrada y cuándo.
-- ---------------------------------------------------------------------------
create or replace view v_hechos_venta with (security_invoker = true) as
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
                                                   as dato_estimado,
  cv.saldo <= 0                                    as cobrada,
  case when cv.saldo <= 0 then greatest(v.fecha, coalesce(cv.ultimo_pago, v.fecha)) end
                                                   as fecha_cobro,
  case when cv.saldo <= 0
       then date_trunc('month', greatest(v.fecha, coalesce(cv.ultimo_pago, v.fecha)))::date end
                                                   as mes_cobro
from venta_items vi
join ventas v            on v.id = vi.venta_id
join clientes c          on c.id = v.cliente_id
join skus s              on s.sku = vi.sku
join modelos m           on m.id = s.modelo_id
left join equipos e      on e.id = m.equipo_id
left join pedidos p      on p.id = vi.pedido_id
left join proveedores pr on pr.id = p.proveedor_id
join (
  select vv.id, vv.saldo,
         (select max(pg.fecha) from pagos pg where pg.venta_id = vv.id and pg.monto > 0) as ultimo_pago
  from v_ventas vv
) cv on cv.id = v.id
where vi.estado <> 'Cancelada';

-- ---------------------------------------------------------------------------
-- Ventas y margen por dimensión: solo lo cobrado, en el mes del cobro.
-- ---------------------------------------------------------------------------
create or replace view v_ventas_por_modelo with (security_invoker = true) as
select mes_cobro as mes, modelo_id, modelo, linea, tipo,
  sum(cantidad) as unidades, sum(facturado) as facturado, sum(costo) as costo,
  sum(ganancia) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes_cobro), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_venta where cobrada group by mes_cobro, modelo_id, modelo, linea, tipo;

create or replace view v_ventas_por_equipo with (security_invoker = true) as
select mes_cobro as mes, equipo,
  sum(cantidad) as unidades, sum(facturado) as facturado, sum(costo) as costo,
  sum(ganancia) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes_cobro), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_venta where cobrada group by mes_cobro, equipo;

create or replace view v_ventas_por_linea with (security_invoker = true) as
select mes_cobro as mes, linea,
  sum(cantidad) as unidades, sum(facturado) as facturado, sum(costo) as costo,
  sum(ganancia) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes_cobro), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_venta where cobrada group by mes_cobro, linea;

create or replace view v_ventas_por_talle with (security_invoker = true) as
select mes_cobro as mes, tipo, talle,
  sum(cantidad) as unidades, sum(facturado) as facturado, sum(costo) as costo,
  sum(ganancia) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes_cobro), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_venta where cobrada group by mes_cobro, tipo, talle;

create or replace view v_ventas_por_proveedor with (security_invoker = true) as
select mes_cobro as mes, proveedor,
  sum(cantidad) as unidades, sum(facturado) as facturado, sum(costo) as costo,
  sum(ganancia) as ganancia, sum(ganancia) / nullif(sum(facturado), 0) as margen,
  sum(facturado) / nullif(sum(sum(facturado)) over (partition by mes_cobro), 0) as participacion,
  bool_or(dato_estimado) as dato_estimado
from v_hechos_venta where cobrada group by mes_cobro, proveedor;

create or replace view v_promos with (security_invoker = true) as
select coalesce(promo, case when cupon is not null then 'Cupón ' || cupon end, 'Sin promo') as promo,
  count(distinct venta_id) as ventas,
  sum(cantidad)            as unidades,
  sum(facturado)           as facturado,
  sum(descuento)           as descuento,
  sum(ganancia)            as ganancia,
  sum(ganancia) + sum(descuento) as ganancia_sin_descuento
from v_hechos_venta
where cobrada
group by 1;

-- ---------------------------------------------------------------------------
-- Margen por pedido: lo cobrado es realizado; lo reservado o señado, a cobrar.
-- La proyección suma las dos cosas más lo que queda sin vender a precio de lista.
-- ---------------------------------------------------------------------------
create or replace view v_margen_pedido with (security_invoker = true) as
with vendido as (
  select pedido_id, sum(cantidad) as unidades, sum(facturado) as facturado,
         sum(costo) as costo, sum(ganancia) as ganancia
  from v_hechos_venta where pedido_id is not null and cobrada group by pedido_id
),
a_cobrar as (
  select pedido_id, sum(facturado) as facturado, sum(ganancia) as ganancia
  from v_hechos_venta where pedido_id is not null and not cobrada group by pedido_id
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
  coalesce(v.facturado, 0) + coalesce(ac.facturado, 0) + coalesce(r.sin_vender_lista, 0)
    - p.costo_total as margen_proyectado,
  coalesce(ac.facturado, 0) as a_cobrar,
  coalesce(ac.ganancia, 0)  as ganancia_a_cobrar
from v_pedidos p
left join vendido v   on v.pedido_id = p.id
left join a_cobrar ac on ac.pedido_id = p.id
left join resto r     on r.pedido_id = p.id
where p.estado <> 'Cancelado';

-- ---------------------------------------------------------------------------
-- Resumen mensual (libro de consulta y gráfico del panel): ventas cobradas en el mes.
-- ---------------------------------------------------------------------------
create or replace view v_resumen_mensual with (security_invoker = true) as
with meses as (
  select date_trunc('month', fecha)::date as mes from ventas
  union
  select date_trunc('month', fecha)::date from caja_movimientos
),
ventas_mes as (
  select mes_cobro as mes, count(distinct venta_id) as ventas, sum(cantidad) as unidades,
         sum(facturado) as facturado, sum(ganancia) as ganancia
  from v_hechos_venta where cobrada group by mes_cobro
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
-- Tablero: vendido y ganancia de lo cobrado; lo demás, a cobrar.
-- ---------------------------------------------------------------------------
create or replace view v_tablero with (security_invoker = true) as
select
  (select coalesce(sum(case tipo when 'Ingreso' then monto else -monto end), 0)
     from caja_movimientos)                                               as saldo_caja,
  (select coalesce(sum(saldo_a_pagar) filter (where saldo_a_pagar > 0), 0)
     from v_pedidos where estado <> 'Cancelado')                          as deuda_proveedores,
  (select coalesce(sum(facturado), 0) from v_hechos_venta where cobrada)  as facturado,
  (select coalesce(sum(costo), 0) from v_hechos_venta where cobrada)      as costo_vendido,
  (select coalesce(sum(ganancia), 0) from v_hechos_venta where cobrada)   as ganancia,
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
  (select coalesce(sum(ganancia), 0) from v_hechos_venta where not cobrada) as ganancia_a_cobrar,
  (select count(*) from v_ventas where saldo > 0 and estado <> 'Cancelada') as ventas_a_cobrar;
