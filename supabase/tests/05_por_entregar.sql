-- Lo vendido que falta entregar: en casa o cuando llegue el pedido.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir datos.inc

select plan(3);

select registrar_venta('{"id":"C-901"}', '[{"sku":6002}]', 'Pagada', '{"monto":42500,"metodo":"Efectivo","tipo":"Total"}');
select registrar_venta('{"id":"C-901"}', '[{"sku":4001}]', 'Señada', '{"monto":20000,"metodo":"Efectivo","tipo":"Seña"}');

select results_eq($$ select sku, llego from v_por_entregar order by sku $$,
                  $$ values (4001, false), (6002, true) $$,
                  'La de China se entrega cuando llegue; la otra ya está en casa');
select is((select pedido_id from v_por_entregar where sku = 4001), 'P-902', 'Dice qué pedido la trae');
select cambiar_estado((select venta_id from v_por_entregar where sku = 6002), null, 'Entregada');
select is((select count(*)::int from v_por_entregar), 1, 'Al entregarla sale de la lista');

select * from finish();
rollback;
