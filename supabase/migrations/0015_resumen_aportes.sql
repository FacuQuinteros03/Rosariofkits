-- ERP Rosario F Kits — 0015: el RESUMEN del libro de consulta separa los aportes.
-- Sin esa columna, un mes con un aporte de Facu muestra "Gastos" grandes y una caja que
-- no se entiende (agosto: se pagaron $1.355.500 de pedidos con plata propia).
drop view v_resumen_mensual;

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

grant select on v_resumen_mensual to authenticated;
