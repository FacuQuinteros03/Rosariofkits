-- ERP Rosario F Kits — 0014: en el libro de consulta, "Comprado" cuenta también lo que
-- está en camino (la preventa). Antes contaba solo lo recibido y una camiseta de China
-- vendida con seña aparecía con 0 comprado y 1 vendido.
create or replace view v_consulta_stock with (security_invoker = true) as
select s.sku,
  m.nombre || coalesce(' (' || s.estampado || ')', '') || ' - Talle ' || s.talle as producto,
  m.linea::text as categoria,
  s.precio,
  st.esperado + greatest(st.ajustes, 0)  as comprado,
  st.entregado + st.comprometido         as vendido,
  st.fisico                              as en_casa,
  st.disponible,
  s.estado_pub::text                     as publicado
from skus s
join modelos m  on m.id = s.modelo_id
join v_stock st on st.sku = s.sku
where s.estado_pub <> 'Archivado' or st.fisico <> 0;
