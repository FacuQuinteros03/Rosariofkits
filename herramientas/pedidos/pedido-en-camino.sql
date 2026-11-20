-- Pedido 2026-11-20 a Indumentaria BA10: 34 prendas a $ 27.000 = $ 918.000.
-- Generado por herramientas/pedidos/armar_sql.py desde lib/pedido-en-camino.json.
-- NO editar a mano: cambiar el JSON y volver a generar.
--
-- Qué hace, todo junto o nada (si algo falla, no queda nada a medias):
--   1. Crea los modelos que no existen. Los que ya existen se reusan.
--   2. Por cada talle: si el modelo ya tiene ese talle sin estampado, usa ese SKU;
--      si no, crea uno nuevo desde el 8001, en Stock: se vende desde ya.
--   3. Crea el pedido (estado Encargado) con el costo por unidad.
-- Al final muestra el pedido creado y los SKU, para nombrar las fotos.
-- Correrlo dos veces crea dos pedidos: mirá en /admin antes de repetir.

begin;

create temp table _carga (
  nombre text, categoria text, tipo text, linea text, talle text, precio numeric, cantidad int, sku int
) on commit drop;

insert into _carga (nombre, categoria, tipo, linea, talle, precio, cantidad) values
    ('Camiseta Roma Titular', 'Camiseta', 'Jugador', 'Clubes', 'L', 49000, 1),
    ('Camiseta Roma Titular', 'Camiseta', 'Jugador', 'Clubes', 'XL', 49000, 1),
    ('Camiseta River Plate 2027 Tricolor', 'Camiseta', 'Jugador', 'Clubes', 'M', 49000, 1),
    ('Camiseta River Plate 2027 Tricolor', 'Camiseta', 'Jugador', 'Clubes', 'L', 49000, 1),
    ('Camiseta River Plate 2027 Tricolor', 'Camiseta', 'Jugador', 'Clubes', 'XL', 49000, 1),
    ('Camiseta PSG Blanca', 'Camiseta', 'Jugador', 'Clubes', 'L', 49000, 1),
    ('Camiseta PSG Blanca', 'Camiseta', 'Jugador', 'Clubes', 'XL', 49000, 1),
    ('Camiseta Flamengo Titular', 'Camiseta', 'Jugador', 'Clubes', 'L', 49000, 1),
    ('Camiseta Flamengo Titular', 'Camiseta', 'Jugador', 'Clubes', 'XL', 49000, 1),
    ('Camiseta Boca Juniors Edición Aniversario', 'Camiseta', 'FAN', 'Clubes', 'M', 49000, 1),
    ('Camiseta Boca Juniors Edición Aniversario', 'Camiseta', 'FAN', 'Clubes', 'L', 49000, 1),
    ('Camiseta River Plate Retro 1996 Titular', 'Camiseta', 'Retro', 'Retro', 'XL', 50000, 1),
    ('Camiseta River Plate Retro 1996 Titular', 'Camiseta', 'Retro', 'Retro', 'XXL', 50000, 1),
    ('Camiseta AC Milan Retro 2007', 'Camiseta', 'Retro', 'Retro', 'L', 50000, 1),
    ('Camiseta AC Milan Retro 2007', 'Camiseta', 'Retro', 'Retro', 'XL', 50000, 1),
    ('Camiseta Boca Juniors Retro 1996', 'Camiseta', 'Retro', 'Retro', 'M', 50000, 1),
    ('Camiseta Boca Juniors Retro 1996', 'Camiseta', 'Retro', 'Retro', 'L', 50000, 1),
    ('Camiseta Boca Juniors Retro 1996', 'Camiseta', 'Retro', 'Retro', 'XL', 50000, 1),
    ('Camiseta Boca Juniors Retro 1996', 'Camiseta', 'Retro', 'Retro', 'XXL', 50000, 1),
    ('Camiseta Argentina Retro 2006 Suplente (azul)', 'Camiseta', 'Retro', 'Retro', 'L', 50000, 1),
    ('Camiseta Argentina Retro 2006 Suplente (azul)', 'Camiseta', 'Retro', 'Retro', 'XXL', 50000, 1),
    ('Camiseta Argentina Retro 2006 Titular', 'Camiseta', 'Retro', 'Retro', 'L', 50000, 1),
    ('Camiseta Argentina Retro 2006 Titular', 'Camiseta', 'Retro', 'Retro', 'XL', 50000, 1),
    ('Camiseta Argentina Retro 2006 Titular', 'Camiseta', 'Retro', 'Retro', 'XXL', 50000, 1),
    ('Short Real Madrid Celeste', 'Short', 'Short', 'Shorts', 'L', 49000, 1),
    ('Short Real Madrid Celeste', 'Short', 'Short', 'Shorts', 'XL', 49000, 2),
    ('Short Bayern Munich Blanco', 'Short', 'Short', 'Shorts', 'XL', 49000, 2),
    ('Short Real Madrid Blanco', 'Short', 'Short', 'Shorts', 'XL', 49000, 1),
    ('Short Tottenham', 'Short', 'Short', 'Shorts', 'XL', 49000, 1),
    ('Short Argentina', 'Short', 'Short', 'Shorts', 'L', 49000, 1),
    ('Short Argentina', 'Short', 'Short', 'Shorts', 'XL', 49000, 2);

do $$
declare
  f        record;
  v_modelo bigint;
  v_sku    int;
  v_prov   bigint;
  v_pedido text;
  v_proximo int := greatest(8000, coalesce((select max(sku) from skus where sku between 8000 and 8999), 8000)) + 1;
begin
  for f in select * from _carga order by nombre, talle loop
    select id into v_modelo from modelos where nombre = f.nombre;
    if v_modelo is null then
      insert into modelos (nombre, categoria, tipo, linea, nuevo)
      values (f.nombre, f.categoria, f.tipo::tipo_producto, f.linea::linea, true)
      returning id into v_modelo;
    end if;

    select sku into v_sku from skus
    where modelo_id = v_modelo and talle = f.talle and estampado is null
    order by sku limit 1;

    if v_sku is null then
      while exists (select 1 from skus where sku = v_proximo) loop
        v_proximo := v_proximo + 1;
      end loop;
      v_sku := v_proximo;
      v_proximo := v_proximo + 1;
      insert into skus (sku, modelo_id, talle, precio, estado_pub)
      values (v_sku, v_modelo, f.talle, f.precio, 'Stock');
    end if;

    update _carga set sku = v_sku where nombre = f.nombre and talle = f.talle;
  end loop;

  insert into proveedores (nombre) values ('Indumentaria BA10') on conflict (nombre) do nothing;
  select id into v_prov from proveedores where nombre = 'Indumentaria BA10';

  insert into pedidos (fecha, proveedor_id, costo_mercaderia, notas)
  values (date '2026-11-20', v_prov, 918000, 'Pedido de 34 prendas (24 camisetas y 10 shorts) a $ 27.000 cada una. Llega el martes 24/11.')
  returning id into v_pedido;

  insert into pedido_items (pedido_id, sku, cantidad, costo_unit)
  select v_pedido, sku, sum(cantidad), 27000 from _carga group by sku;

  raise notice 'Pedido % creado', v_pedido;
end $$;

select c.sku, c.nombre, c.talle, c.cantidad, s.estado_pub, s.precio
from _carga c join skus s on s.sku = c.sku
order by c.sku;

commit;
