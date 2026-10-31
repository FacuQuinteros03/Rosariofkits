-- ERP Rosario F Kits — 0006: las vistas que reemplazan a las fórmulas del libro.
-- Todas con security_invoker: corren con los permisos de quien consulta, así la
-- seguridad por filas (0009) se aplica también a través de las vistas.

-- ---------------------------------------------------------------------------
-- Pedidos: reemplaza PEDIDOS!E,I:L
-- ---------------------------------------------------------------------------
create view v_pedidos with (security_invoker = true) as
select p.*,
  pr.nombre as proveedor,
  coalesce(u.unidades, 0)           as unidades,
  coalesce(u.recibidas, 0)          as unidades_recibidas,
  -- P-001 y P-002 no tienen costo de mercadería: el costo está item por item.
  coalesce(p.costo_mercaderia, u.mercaderia_items, 0)
    + coalesce(p.costo_envio, 0) + coalesce(p.otros, 0)           as costo_total,
  (coalesce(p.costo_mercaderia, u.mercaderia_items, 0)
    + coalesce(p.costo_envio, 0) + coalesce(p.otros, 0))
    / nullif(u.unidades, 0)                                       as costo_unit_prom,
  coalesce(c.pagado, 0)                                           as pagado,
  coalesce(p.costo_mercaderia, u.mercaderia_items, 0)
    + coalesce(p.costo_envio, 0) + coalesce(p.otros, 0)
    - coalesce(c.pagado, 0)                                       as saldo_a_pagar
from pedidos p
join proveedores pr on pr.id = p.proveedor_id
left join (
  select pedido_id,
    sum(cantidad)            as unidades,
    sum(cantidad_recibida)   as recibidas,
    -- solo si todos los items tienen costo propio
    case when bool_and(costo_unit is not null) then sum(cantidad * costo_unit) end as mercaderia_items
  from pedido_items group by pedido_id
) u on u.pedido_id = p.id
left join (
  select pedido_id, sum(monto) as pagado
  from caja_movimientos where tipo = 'Egreso' and pedido_id is not null
  group by pedido_id
) c on c.pedido_id = p.id;

-- ---------------------------------------------------------------------------
-- Costo real de cada item de pedido, con la importación prorrateada.
-- Si el item tiene costo propio se respeta (Diez Store: $27.000 con dorsal y $24.000
-- sin); si no, la mercadería del pedido por unidad. Más envío y otros por unidad.
-- ---------------------------------------------------------------------------
create view v_costo_item with (security_invoker = true) as
select i.id, i.pedido_id, i.sku, i.cantidad, i.cantidad_recibida,
  coalesce(i.costo_unit, p.costo_mercaderia / nullif(p.unidades, 0))
    + (coalesce(p.costo_envio, 0) + coalesce(p.otros, 0)) / nullif(p.unidades, 0) as costo_unit_real
from pedido_items i
join v_pedidos p on p.id = i.pedido_id
where p.estado <> 'Cancelado';

-- Lo que hoy se tipea a mano en VENTAS!H. Promedio ponderado si vino en varios pedidos.
create view v_costo_sku with (security_invoker = true) as
select sku, sum(cantidad * costo_unit_real) / nullif(sum(cantidad), 0) as costo_unit
from v_costo_item
where costo_unit_real is not null
group by sku;

-- ---------------------------------------------------------------------------
-- Stock por SKU: reemplaza PRODUCTOS!K:Q
--   Físico     = Recibido − Entregado + Ajustes        lo que hay en la caja de casa
--   Disponible = Esperado − Entregado − Comprometido + Ajustes
-- Esperado y Recibido van separados a propósito: así se vende la preventa sin que el
-- inventario mienta.
-- ---------------------------------------------------------------------------
create view v_stock with (security_invoker = true) as
select s.sku,
  coalesce(pi.esperado, 0)::integer      as esperado,
  coalesce(pi.recibido, 0)::integer      as recibido,
  coalesce(vi.comprometido, 0)::integer  as comprometido,
  coalesce(vi.entregado, 0)::integer     as entregado,
  coalesce(a.ajustes, 0)::integer        as ajustes,
  (coalesce(pi.recibido, 0) - coalesce(vi.entregado, 0) + coalesce(a.ajustes, 0))::integer as fisico,
  (coalesce(pi.esperado, 0) - coalesce(vi.entregado, 0)
     - coalesce(vi.comprometido, 0) + coalesce(a.ajustes, 0))::integer                     as disponible
from skus s
left join (
  select i.sku,
    sum(case p.estado when 'Cancelado' then 0
                      when 'Recibido'  then i.cantidad_recibida  -- lo que no llegó deja de esperarse
                      else i.cantidad end) as esperado,
    sum(i.cantidad_recibida)               as recibido
  from pedido_items i join pedidos p on p.id = i.pedido_id
  group by i.sku
) pi on pi.sku = s.sku
left join (
  select sku,
    sum(cantidad) filter (where estado in ('Reservada', 'Señada', 'Pagada')) as comprometido,
    sum(cantidad) filter (where estado = 'Entregada')                        as entregado
  from venta_items group by sku
) vi on vi.sku = s.sku
left join (select sku, sum(cantidad) as ajustes from ajustes group by sku) a on a.sku = s.sku;

-- ---------------------------------------------------------------------------
-- Ventas: reemplaza VENTAS!G,I,J,P,Q y CLIENTES!E:G
-- ---------------------------------------------------------------------------
create view v_venta_items with (security_invoker = true) as
select vi.*,
  vi.cantidad * vi.precio_unit                   as subtotal,
  vi.cantidad * vi.costo_unit                    as costo_total,
  vi.cantidad * (vi.precio_unit - vi.costo_unit) as ganancia
from venta_items vi;

create view v_ventas with (security_invoker = true) as
select v.*,
  c.nombre as cliente,
  coalesce(sum(i.subtotal) filter (where i.estado <> 'Cancelada'), 0)    as total,
  coalesce(sum(i.cantidad) filter (where i.estado <> 'Cancelada'), 0)    as unidades,
  coalesce(pg.cobrado, 0)                                                as cobrado,
  coalesce(sum(i.subtotal) filter (where i.estado <> 'Cancelada'), 0)
    - coalesce(pg.cobrado, 0)                                            as saldo,
  -- el estado "más atrasado" de sus items no cancelados
  coalesce(min(i.estado) filter (where i.estado <> 'Cancelada'), 'Cancelada') as estado
from ventas v
join clientes c on c.id = v.cliente_id
left join v_venta_items i on i.venta_id = v.id
left join (select venta_id, sum(monto) as cobrado from pagos group by venta_id) pg on pg.venta_id = v.id
group by v.id, c.nombre, pg.cobrado;

-- Diferencia con el libro: Comprado deja afuera los items cancelados.
create view v_saldo_cliente with (security_invoker = true) as
select c.id, c.nombre, c.telefono, c.tipo,
  coalesce(sum(v.total), 0)   as comprado,
  coalesce(sum(v.cobrado), 0) as pagado,
  coalesce(sum(v.saldo), 0)   as saldo
from clientes c
left join v_ventas v on v.cliente_id = c.id
group by c.id;

-- ---------------------------------------------------------------------------
-- Caja, por método y total (metodo null = total)
-- ---------------------------------------------------------------------------
create view v_caja with (security_invoker = true) as
select metodo,
  coalesce(sum(monto) filter (where tipo = 'Ingreso'), 0)          as ingresos,
  coalesce(sum(monto) filter (where tipo = 'Egreso'), 0)           as egresos,
  coalesce(sum(case tipo when 'Ingreso' then monto else -monto end), 0) as saldo
from caja_movimientos
group by rollup (metodo);

-- ---------------------------------------------------------------------------
-- Tablero: una fila con los números del TABLERO del libro
-- ---------------------------------------------------------------------------
create view v_tablero with (security_invoker = true) as
select
  (select coalesce(sum(case tipo when 'Ingreso' then monto else -monto end), 0)
     from caja_movimientos)                                               as saldo_caja,
  (select coalesce(sum(saldo_a_pagar) filter (where saldo_a_pagar > 0), 0)
     from v_pedidos where estado <> 'Cancelado')                          as deuda_proveedores,
  (select coalesce(sum(total), 0) from v_ventas)                          as facturado,
  (select coalesce(sum(costo_total), 0) from v_venta_items
     where estado <> 'Cancelada')                                         as costo_vendido,
  (select coalesce(sum(ganancia), 0) from v_venta_items
     where estado <> 'Cancelada')                                         as ganancia,
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
  (select coalesce(sum(cantidad), 0) from venta_items where estado = 'Pagada')    as pagadas_sin_entregar;
