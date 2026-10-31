-- Quién ve y quién escribe: admin, otro usuario logueado, y la web pública (anon).
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir datos.inc

select plan(13);

-- Una venta de prueba, cargada como admin.
select registrar_venta('{"id":"C-901"}', '[{"sku":6002}]', 'Reservada');

-- ---------------------------------------------------------------- admin
set local role authenticated;
select is((select count(*)::int from ventas), 1, 'El admin ve las ventas');
select is((select count(*)::int from v_tablero), 1, 'El admin ve el tablero');
select throws_ok($$ insert into clientes (nombre) values ('directo') $$, '42501', null,
                 'Ni el admin escribe directo en las tablas: solo por las operaciones');
reset role;

-- ---------------------------------------------------------------- otro usuario logueado
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000002","email":"intruso@test.com","role":"authenticated"}', true);
set local role authenticated;
select is((select count(*)::int from ventas), 0, 'Otro mail logueado no ve ninguna venta');
select is((select count(*)::int from clientes), 0, 'Ni clientes');
select is((select count(*)::int from v_venta_items), 0, 'Ni a través de las vistas');
select throws_like($$ select registrar_venta('{"id":"C-901"}', '[{"sku":6001}]', 'Reservada') $$,
                   'No autorizado', 'Ni puede cargar ventas');
reset role;

-- ---------------------------------------------------------------- web pública
select set_config('request.jwt.claims', '{"role":"anon"}', true);
set local role anon;
select ok((select count(*) from catalogo_web()) = 4, 'La web lee el catálogo');
select results_eq(
  $$ select producto, disponible from catalogo_web() where sku = 6002 $$,
  $$ values ('Camiseta Boca 25/26 - Talle L'::text, 0) $$,
  'El catálogo trae el nombre armado como la hoja WEB, y la reservada ya no figura disponible');
select throws_ok($$ select * from ventas $$, '42501', null, 'La web no puede leer ventas');
select throws_ok($$ select * from v_costo_sku $$, '42501', null, 'Ni costos');
select throws_ok($$ select registrar_venta('{"id":"C-901"}', '[{"sku":6001}]', 'Reservada') $$,
                 '42501', null, 'Ni cargar ventas');
select lives_ok($$ select registrar_consulta(6002, 'tarjeta') $$, 'Puede registrar una consulta por encargue');
reset role;

select * from finish();
rollback;
