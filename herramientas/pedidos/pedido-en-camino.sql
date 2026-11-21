-- Pedido 2026-11-20 a Balex Indumentaria: 34 prendas a $ 27.000 = $ 918.000.
-- Generado por herramientas/pedidos/armar_sql.py desde lib/pedido-en-camino.json.
-- NO editar a mano: cambiar el JSON y volver a generar.
--
-- Qué hace, todo junto o nada (si algo falla, no queda nada a medias):
--   1. Crea los modelos que no existen (con su equipo). Los que ya existen se reusan.
--   2. Por cada talle: si el modelo ya tiene ese talle sin estampado, usa ese SKU;
--      si no, crea uno nuevo desde el 8001, en Stock: se vende desde ya.
--   3. Crea el pedido (estado Encargado) con el costo por unidad.
-- Al final muestra el pedido creado y los SKU, para nombrar las fotos.
-- Correrlo dos veces crea dos pedidos: mirá en /admin antes de repetir.

begin;

create temp table _carga (
  nombre text, categoria text, tipo text, linea text, talle text, precio numeric, cantidad int, equipo text, sku int
) on commit drop;

insert into _carga (nombre, categoria, tipo, linea, talle, precio, cantidad, equipo) values
    ('Camiseta Roma 26/27'' Alternativa (crema)', 'Camiseta', 'Jugador', 'Clubes', 'L', 49000, 1, 'Roma'),
    ('Camiseta Roma 26/27'' Alternativa (crema)', 'Camiseta', 'Jugador', 'Clubes', 'XL', 49000, 1, 'Roma'),
    ('Camiseta River Plate 26/27'' Tricolor', 'Camiseta', 'Jugador', 'Clubes', 'M', 49000, 1, 'River'),
    ('Camiseta River Plate 26/27'' Tricolor', 'Camiseta', 'Jugador', 'Clubes', 'L', 49000, 1, 'River'),
    ('Camiseta River Plate 26/27'' Tricolor', 'Camiseta', 'Jugador', 'Clubes', 'XL', 49000, 1, 'River'),
    ('Camiseta PSG 26/27'' Alternativa (blanca)', 'Camiseta', 'Jugador', 'Clubes', 'L', 49000, 1, 'PSG'),
    ('Camiseta PSG 26/27'' Alternativa (blanca)', 'Camiseta', 'Jugador', 'Clubes', 'XL', 49000, 1, 'PSG'),
    ('Camiseta Flamengo 26/27'' Titular', 'Camiseta', 'Jugador', 'Clubes', 'L', 49000, 1, 'Flamengo'),
    ('Camiseta Flamengo 26/27'' Titular', 'Camiseta', 'Jugador', 'Clubes', 'XL', 49000, 1, 'Flamengo'),
    ('Camiseta Boca Juniors Edición Aniversario', 'Camiseta', 'Jugador', 'Clubes', 'M', 49000, 1, 'Boca'),
    ('Camiseta Boca Juniors Edición Aniversario', 'Camiseta', 'Jugador', 'Clubes', 'L', 49000, 1, 'Boca'),
    ('Camiseta River Plate Retro 1996 Titular', 'Camiseta', 'Retro', 'Retro', 'XL', 50000, 1, 'River'),
    ('Camiseta River Plate Retro 1996 Titular', 'Camiseta', 'Retro', 'Retro', 'XXL', 50000, 1, 'River'),
    ('Camiseta AC Milan 06/07'' Suplente', 'Camiseta', 'Retro', 'Clubes', 'L', 50000, 1, 'AC Milan'),
    ('Camiseta AC Milan 06/07'' Suplente', 'Camiseta', 'Retro', 'Clubes', 'XL', 50000, 1, 'AC Milan'),
    ('Camiseta Boca Juniors Retro 1996 Titular', 'Camiseta', 'Retro', 'Retro', 'M', 50000, 1, 'Boca'),
    ('Camiseta Boca Juniors Retro 1996 Titular', 'Camiseta', 'Retro', 'Retro', 'L', 50000, 1, 'Boca'),
    ('Camiseta Boca Juniors Retro 1996 Titular', 'Camiseta', 'Retro', 'Retro', 'XL', 50000, 1, 'Boca'),
    ('Camiseta Boca Juniors Retro 1996 Titular', 'Camiseta', 'Retro', 'Retro', 'XXL', 50000, 1, 'Boca'),
    ('Camiseta Argentina 2006 Suplente (Mundial)', 'Camiseta', 'Retro', 'Retro', 'L', 50000, 1, 'Argentina'),
    ('Camiseta Argentina 2006 Suplente (Mundial)', 'Camiseta', 'Retro', 'Retro', 'XXL', 50000, 1, 'Argentina'),
    ('Camiseta Argentina 2006 Titular', 'Camiseta', 'Retro', 'Retro', 'L', 50000, 1, 'Argentina'),
    ('Camiseta Argentina 2006 Titular', 'Camiseta', 'Retro', 'Retro', 'XL', 50000, 1, 'Argentina'),
    ('Camiseta Argentina 2006 Titular', 'Camiseta', 'Retro', 'Retro', 'XXL', 50000, 1, 'Argentina'),
    ('Short Real Madrid (azul)', 'Short', 'Short', 'Shorts', 'L', 49000, 1, 'Real Madrid'),
    ('Short Real Madrid (azul)', 'Short', 'Short', 'Shorts', 'XL', 49000, 2, 'Real Madrid'),
    ('Short Bayern Munich (blanco)', 'Short', 'Short', 'Shorts', 'XL', 49000, 2, 'Bayern Munich'),
    ('Short Real Madrid (blanco)', 'Short', 'Short', 'Shorts', 'XL', 49000, 1, 'Real Madrid'),
    ('Short Tottenham', 'Short', 'Short', 'Shorts', 'XL', 49000, 1, 'Tottenham'),
    ('Short Argentina (jugador)', 'Short', 'Short', 'Shorts', 'L', 49000, 1, 'Argentina'),
    ('Short Argentina (jugador)', 'Short', 'Short', 'Shorts', 'XL', 49000, 2, 'Argentina');

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

    -- El equipo, para las métricas por equipo: se crea si no existe y solo se pone si falta.
    if f.equipo is not null then
      insert into equipos (nombre) values (f.equipo) on conflict (nombre) do nothing;
      update modelos set equipo_id = (select id from equipos where nombre = f.equipo)
      where id = v_modelo and equipo_id is null;
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

  insert into proveedores (nombre) values ('Balex Indumentaria') on conflict (nombre) do nothing;
  select id into v_prov from proveedores where nombre = 'Balex Indumentaria';

  insert into pedidos (fecha, proveedor_id, costo_mercaderia, notas)
  values (date '2026-11-20', v_prov, 918000, 'Pedido a Balex (indumentaria-ba10) de 34 prendas versión jugador (24 camisetas y 10 shorts) a $ 27.000 cada una. Llega el martes 24/11.')
  returning id into v_pedido;

  insert into pedido_items (pedido_id, sku, cantidad, costo_unit)
  select v_pedido, sku, sum(cantidad), 27000 from _carga group by sku;

  raise notice 'Pedido % creado', v_pedido;
end $$;

select c.sku, c.nombre, c.talle, c.cantidad, s.estado_pub, s.precio
from _carga c join skus s on s.sku = c.sku
order by c.sku;

commit;
