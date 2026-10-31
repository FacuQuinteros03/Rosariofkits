-- ERP Rosario F Kits — 0007: la regla "no vender sin stock", garantizada por la base.
--
-- Ningún SKU puede quedar con disponible < 0 (vender más de lo que hay o viene en
-- camino) ni con físico < 0 (entregar algo que no llegó). Se chequea:
--   1. en cada operación (0008), para devolver el error al instante y en castellano;
--   2. acá, con un trigger diferido al final de la transacción, como red de seguridad
--      para cualquier escritura que no pase por una operación (la migración, un arreglo
--      a mano en SQL).
-- Antes de calcular se bloquean las filas de esos SKU: dos cargas simultáneas de la
-- misma última unidad (Facu y Vani a la vez) se ordenan, y la segunda falla.

create function verificar_stock(p_skus integer[]) returns void
language plpgsql as $$
declare
  r record;
begin
  if p_skus is null or cardinality(p_skus) = 0 then
    return;
  end if;
  -- Siempre en el mismo orden, para no trabarse entre dos transacciones.
  perform 1 from skus where sku = any (p_skus) order by sku for update;

  for r in
    select st.sku, st.disponible, st.fisico, m.nombre, s.talle
    from v_stock st
    join skus s on s.sku = st.sku
    join modelos m on m.id = s.modelo_id
    where st.sku = any (p_skus) and (st.disponible < 0 or st.fisico < 0)
    order by st.sku
    limit 1
  loop
    if r.disponible < 0 then
      raise exception 'Sin stock: % talle % (SKU %) quedaría con % disponibles',
        r.nombre, r.talle, r.sku, r.disponible
        using errcode = 'P0001', hint = 'sin_stock';
    else
      raise exception 'No llegó: % talle % (SKU %) quedaría con % en casa',
        r.nombre, r.talle, r.sku, r.fisico
        using errcode = 'P0001', hint = 'sin_fisico';
    end if;
  end loop;
end $$;

create function trg_verificar_stock() returns trigger
language plpgsql as $$
declare
  v_skus integer[];
begin
  if tg_table_name = 'pedidos' then
    select array_agg(sku) into v_skus from pedido_items
    where pedido_id = coalesce(new.id, old.id);
  elsif tg_op = 'DELETE' then
    v_skus := array[old.sku];
  elsif tg_op = 'UPDATE' and new.sku <> old.sku then
    v_skus := array[new.sku, old.sku];
  else
    v_skus := array[new.sku];
  end if;
  perform verificar_stock(v_skus);
  return null;
end $$;

create constraint trigger stock_venta_items
  after insert or update or delete on venta_items
  deferrable initially deferred
  for each row execute function trg_verificar_stock();

create constraint trigger stock_ajustes
  after insert or update or delete on ajustes
  deferrable initially deferred
  for each row execute function trg_verificar_stock();

create constraint trigger stock_pedido_items
  after insert or update or delete on pedido_items
  deferrable initially deferred
  for each row execute function trg_verificar_stock();

create constraint trigger stock_pedidos
  after update of estado on pedidos
  deferrable initially deferred
  for each row execute function trg_verificar_stock();
