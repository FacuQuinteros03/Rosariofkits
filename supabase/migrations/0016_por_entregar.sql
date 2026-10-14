-- ERP Rosario F Kits — 0016: lo vendido que falta entregar (Facu, 2026-10-13: "saber que
-- cuando llegue la tenemos que entregar").
--
-- No es un estado nuevo: es todo item reservado, señado o pagado. `llego` dice si la
-- unidad ya está en casa (su pedido se recibió, o no viene de ningún pedido) o si se
-- entrega cuando llegue el pedido. El panel lo agrupa por pedido.
create view v_por_entregar with (security_invoker = true) as
select vi.id, v.id as venta_id, v.fecha, v.cliente_id, c.nombre as cliente, c.telefono,
  m.nombre || coalesce(' (' || s.estampado || ')', '') || ' ' || s.talle as producto,
  vi.sku, vi.cantidad, vi.estado, vi.pedido_id,
  p.estado as estado_pedido,
  (p.id is null or p.estado = 'Recibido') as llego,
  vv.saldo as saldo_venta
from venta_items vi
join ventas v   on v.id = vi.venta_id
join clientes c on c.id = v.cliente_id
join skus s     on s.sku = vi.sku
join modelos m  on m.id = s.modelo_id
left join pedidos p on p.id = vi.pedido_id
join v_ventas vv on vv.id = v.id
where vi.estado in ('Reservada', 'Señada', 'Pagada');

grant select on v_por_entregar to authenticated;
