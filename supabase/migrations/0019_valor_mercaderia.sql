-- ERP Rosario F Kits — 0019: cuánto vale la mercadería sin vender (Facu, 2026-10-13).
--
-- Sin vender = lo disponible (ni reservado, ni señado, ni pagado, ni entregado), en casa
-- o en camino. En casa es lo físico menos lo vendido que ya está acá esperando que lo
-- retiren; el resto de lo disponible viene en un pedido. Se valúa a costo (lo que se
-- pagó, con el envío prorrateado) y a precio de lista (lo que entraría vendiendo todo).
create view v_valor_mercaderia with (security_invoker = true) as
with vendido_en_casa as (
  select vi.sku, sum(vi.cantidad) as cant
  from venta_items vi left join pedidos p on p.id = vi.pedido_id
  where vi.estado in ('Reservada', 'Señada', 'Pagada') and (p.id is null or p.estado = 'Recibido')
  group by vi.sku
),
por_sku as (
  select st.sku, s.precio, coalesce(c.costo_unit, 0) as costo,
    greatest(least(st.disponible, st.fisico - coalesce(v.cant, 0)), 0) as casa,
    greatest(st.disponible, 0) - greatest(least(st.disponible, st.fisico - coalesce(v.cant, 0)), 0) as camino
  from v_stock st
  join skus s on s.sku = st.sku
  left join v_costo_sku c on c.sku = st.sku
  left join vendido_en_casa v on v.sku = st.sku
  where st.disponible > 0
)
select
  sum(casa)::int                    as unidades_casa,
  sum(camino)::int                  as unidades_camino,
  round(sum(casa * costo), 2)       as costo_casa,
  round(sum(camino * costo), 2)     as costo_camino,
  sum(casa * precio)                as lista_casa,
  sum(camino * precio)              as lista_camino,
  round(sum((casa + camino) * costo), 2) as costo_total,
  sum((casa + camino) * precio)     as lista_total
from por_sku;

grant select on v_valor_mercaderia to authenticated;
