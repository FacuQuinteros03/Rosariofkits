-- Mystery Box: Facu elige la camiseta y recién ahí es una venta.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir datos.inc

select plan(14);

-- Así las crea /api/pedido (con la clave secreta, que pasa por encima de RLS).
insert into mystery_boxes (id, nombre, telefono, version, tipo, talle, preferencia, excluir, precio, comprobante)
values ('MB-9001', 'Juan', '5493416123456', 'fan', 'club', 'M', 'Premier', 'River', 35000, 'MB-9001/comprobante.jpg'),
       ('MB-9002', 'Ana',  '5493416000000', 'player', 'retro', 'L', null, null, 45000, 'MB-9002/comprobante.jpg'),
       ('MB-9003', 'Leo',  '5493416111111', 'fan', 'cualquiera', 'M', null, null, 35000, null);

select is((select disponible from v_stock where sku = 6001), 1, 'Una box pendiente no descuenta stock');

select throws_like($$ select asignar_mystery_box('MB-9001', 6002) $$,
                   'La box es talle M y el SKU 6002 es talle L', 'No se asigna una camiseta de otro talle');
select throws_like($$ select asignar_mystery_box('MB-0000', 6001) $$,
                   'No existe la box%', 'Una box que no existe');

select lives_ok($$ select asignar_mystery_box('MB-9001', 6001, true) $$,
                'Se asigna y se cobra en el mismo paso');
select is((select estado from mystery_boxes where id = 'MB-9001'), 'Asignada', 'La box queda Asignada');
select is((select disponible from v_stock where sku = 6001), 0, 'Ahí sí descuenta la unidad');
select is((select vi.precio_unit::numeric from mystery_boxes b join venta_items vi on vi.venta_id = b.venta_id
           where b.id = 'MB-9001'), 35000::numeric, 'La venta sale al precio de la box, no al de lista');
select is((select vi.motivo_descuento from mystery_boxes b join venta_items vi on vi.venta_id = b.venta_id
           where b.id = 'MB-9001'), 'Mystery Box MB-9001', 'El descuento contra la lista queda explicado');
select is((select v.cobrado::numeric from mystery_boxes b join v_ventas v on v.id = b.venta_id
           where b.id = 'MB-9001'), 35000::numeric, 'Queda cobrada');
select is((select v.canal from mystery_boxes b join ventas v on v.id = b.venta_id where b.id = 'MB-9001'),
          'Web', 'Canal Web');

select throws_like($$ select asignar_mystery_box('MB-9001', 6001) $$,
                   'La box MB-9001 ya está asignada', 'No se asigna dos veces');

select throws_like($$ select rechazar_mystery_box('MB-9002', ' ') $$,
                   'Falta el motivo%', 'Sin motivo no se rechaza');
select lives_ok($$ select rechazar_mystery_box('MB-9002', 'No llegó la transferencia') $$, 'Se rechaza con motivo');

-- Alguien logueado que no es admin no ve las boxes (tienen nombre y teléfono).
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000002","email":"otro@test.com","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from mystery_boxes), 0, 'Un usuario que no es admin no ve ninguna box');
reset role;

select * from finish();
rollback;
