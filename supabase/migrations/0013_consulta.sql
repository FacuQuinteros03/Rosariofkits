-- ERP Rosario F Kits — 0013: las vistas del libro de consulta (diseño 6.5).
-- Simple y por mes: una fila por cosa, nada que cruzar. Las usa el job nocturno que
-- escribe ERP_RosarioFkits_consulta, y sirven igual para el panel.

-- Una fila por camiseta y talle, como el libro viejo.
create view v_consulta_stock with (security_invoker = true) as
select s.sku,
  m.nombre || coalesce(' (' || s.estampado || ')', '') || ' - Talle ' || s.talle as producto,
  m.linea::text as categoria,
  s.precio,
  st.recibido + greatest(st.ajustes, 0)  as comprado,
  st.entregado + st.comprometido         as vendido,
  st.fisico                              as en_casa,
  st.disponible,
  s.estado_pub::text                     as publicado
from skus s
join modelos m  on m.id = s.modelo_id
join v_stock st on st.sku = s.sku
where s.estado_pub <> 'Archivado' or st.fisico <> 0;

-- Una fila por venta, con lo que llevó en una sola celda.
create view v_consulta_ventas with (security_invoker = true) as
select date_trunc('month', v.fecha)::date as mes,
  v.fecha, v.id as venta_id, v.cliente,
  (select string_agg(m.nombre || ' ' || s.talle
                     || case when vi.cantidad > 1 then ' x' || vi.cantidad else '' end
                     || case when vi.estado = 'Cancelada' then ' (cancelada)' else '' end,
                     ' + ' order by vi.id)
     from venta_items vi join skus s on s.sku = vi.sku join modelos m on m.id = s.modelo_id
    where vi.venta_id = v.id)            as detalle,
  v.unidades, v.total, v.cobrado as pagado, v.saldo as debe, v.estado::text as estado,
  coalesce(v.canal, '') as canal
from v_ventas v;

-- Una fila por mes. La caja al cierre es acumulada.
create view v_resumen_mensual with (security_invoker = true) as
with meses as (
  select date_trunc('month', fecha)::date as mes from ventas
  union
  select date_trunc('month', fecha)::date from caja_movimientos
),
ventas_mes as (
  select mes, count(distinct venta_id) as ventas, sum(cantidad) as unidades,
         sum(facturado) as facturado, sum(ganancia) as ganancia
  from v_hechos_venta group by mes
),
caja_mes as (
  select date_trunc('month', fecha)::date as mes,
    coalesce(sum(monto) filter (where categoria = 'Venta' and tipo = 'Ingreso'), 0)
      - coalesce(sum(monto) filter (where categoria = 'Venta' and tipo = 'Egreso'), 0)  as cobrado,
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
  coalesce(c.gastos, 0)    as gastos,
  coalesce(c.neto, 0)      as caja_del_mes,
  sum(coalesce(c.neto, 0)) over (order by m.mes) as caja_al_cierre
from meses m
left join ventas_mes v on v.mes = m.mes
left join caja_mes c   on c.mes = m.mes;

grant select on v_consulta_stock, v_consulta_ventas, v_resumen_mensual to authenticated;
