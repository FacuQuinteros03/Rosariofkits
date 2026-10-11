-- Datos de prueba compartidos por los tests. No es un test: lo incluyen los demás con
-- \ir 00_datos.sql dentro de su transacción, así todo se deshace al final.
--
-- Arma un catálogo chico con los casos que importan:
--   P-901  Diez Store, recibido, costo por item ($27.000 con dorsal, $24.000 sin) y
--          $20.000 de envío para 30 unidades: el caso P-005 del libro.
--   P-902  Importador China, encargado (preventa), 2 unidades de 4001.

set local erp.migrando = 'off';

-- Un admin y su sesión. auth.jwt() lee request.jwt.claims.
insert into admins (email) values ('facu@test.com');
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","email":"facu@test.com","role":"authenticated"}', true);

insert into equipos (nombre) values ('Boca'), ('Argentina');
insert into modelos (nombre, categoria, tipo, linea, equipo_id) values
  ('Camiseta Boca 25/26',        'Camiseta', 'Jugador', 'Clubes',      (select id from equipos where nombre = 'Boca')),
  ('Camiseta Argentina 2026',    'Camiseta', 'Jugador', 'Selecciones', (select id from equipos where nombre = 'Argentina')),
  ('Short Argentina 2026',       'Short',    'Short',   'Shorts',      (select id from equipos where nombre = 'Argentina'));

insert into skus (sku, modelo_id, talle, dorsal, precio) values
  (6001, (select id from modelos where nombre = 'Camiseta Boca 25/26'),     'M',  true,  42500),
  (6002, (select id from modelos where nombre = 'Camiseta Boca 25/26'),     'L',  false, 42500),
  (4001, (select id from modelos where nombre = 'Camiseta Argentina 2026'), 'L',  false, 45000),
  (5001, (select id from modelos where nombre = 'Short Argentina 2026'),    'M',  false, 45000);

insert into proveedores (nombre) values ('Diez Store'), ('Importador China');

insert into pedidos (id, fecha, proveedor_id, estado, recibido_en, costo_envio) values
  ('P-901', '2026-10-01', (select id from proveedores where nombre = 'Diez Store'), 'Recibido', '2026-10-05', 20000);
-- 30 unidades en total: 6001 x1 con dorsal, 6002 x1 sin, y 28 de relleno en 5001.
insert into pedido_items (pedido_id, sku, cantidad, cantidad_recibida, costo_unit) values
  ('P-901', 6001, 1, 1, 27000),
  ('P-901', 6002, 1, 1, 24000),
  ('P-901', 5001, 28, 28, 24000);

insert into pedidos (id, fecha, proveedor_id, estado, costo_mercaderia) values
  ('P-902', '2026-09-16', (select id from proveedores where nombre = 'Importador China'), 'Encargado', 35407.42);
insert into pedido_items (pedido_id, sku, cantidad) values ('P-902', 4001, 2);

insert into clientes (id, nombre, telefono) values ('C-901', 'Cliente Prueba', '5493410000001');
