-- ERP Rosario F Kits — 0017: inversión y gasto total (Facu, 2026-10-13).
--
-- Inversión: la plata que pusieron ustedes (aportes) menos lo que sacaron (retiros).
-- Gastado: todo lo que salió de la caja para el negocio (mercadería, envíos,
-- publicidad...), sin contar los retiros, que no son gasto. Costo total suma además
-- lo que falta pagar a proveedores: es lo que va a terminar costando todo lo pedido.
create view v_inversion with (security_invoker = true) as
with m as (
  select
    coalesce(sum(monto) filter (where categoria = 'Aporte'), 0) as aportes,
    coalesce(sum(monto) filter (where categoria = 'Retiro'), 0) as retiros,
    coalesce(sum(monto) filter (where tipo = 'Egreso' and categoria in ('Pago proveedor', 'Envio China')), 0) as gastado_mercaderia,
    coalesce(sum(monto) filter (where tipo = 'Egreso' and categoria not in ('Pago proveedor', 'Envio China', 'Retiro')), 0) as gastado_otros
  from caja_movimientos
)
select m.aportes, m.retiros, m.aportes - m.retiros as inversion,
  m.gastado_mercaderia, m.gastado_otros, m.gastado_mercaderia + m.gastado_otros as gastado,
  t.deuda_proveedores,
  m.gastado_mercaderia + m.gastado_otros + t.deuda_proveedores as costo_total
from m cross join v_tablero t;

grant select on v_inversion to authenticated;
