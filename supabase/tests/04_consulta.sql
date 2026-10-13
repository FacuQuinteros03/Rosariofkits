-- El libro de consulta: stock como el libro viejo, ventas en una fila, resumen por mes.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir datos.inc

select plan(6);

select registrar_venta('{"id":"C-901"}', '[{"sku":6001},{"sku":6002}]', 'Entregada',
                       '{"monto":85000,"metodo":"Transferencia","tipo":"Total"}');
select registrar_movimiento('Egreso', 'Envio cliente', 3000, 'Efectivo', null, 'Andreani');

select results_eq(
  $$ select comprado, vendido, en_casa, disponible from v_consulta_stock where sku = 6002 $$,
  $$ values (1, 1, 0, 0) $$,
  'STOCK: comprado, vendido, en casa y disponible como el libro viejo');

select is((select detalle from v_consulta_ventas),
          'Camiseta Boca 25/26 M + Camiseta Boca 25/26 L',
          'VENTAS: lo que llevó en una sola celda');

select results_eq(
  $$ select total, pagado, debe from v_consulta_ventas $$,
  $$ values (85000::numeric, 85000::numeric, 0::numeric) $$,
  'VENTAS: total, pagado y lo que debe');

select results_eq(
  $$ select ventas, unidades, facturado, cobrado, gastos, caja_al_cierre from v_resumen_mensual $$,
  $$ values (1::bigint, 2::bigint, 85000::numeric, 85000::numeric, 3000::numeric, 82000::numeric) $$,
  'RESUMEN: una fila por mes con ventas, cobros, gastos y caja');

select is((select count(*)::int from v_resumen_mensual), 1, 'Un solo mes');

-- Preventa: lo comprado que está en camino también cuenta como comprado.
select registrar_venta('{"id":"C-901"}', '[{"sku":4001}]', 'Señada');
select results_eq(
  $$ select comprado, vendido, en_casa, disponible from v_consulta_stock where sku = 4001 $$,
  $$ values (2, 1, 0, 1) $$,
  'STOCK: lo comprado en camino también cuenta (preventa)');

select * from finish();
rollback;
