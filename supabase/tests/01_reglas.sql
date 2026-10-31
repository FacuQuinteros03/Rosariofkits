-- Las reglas del negocio: lo que la base tiene que rechazar y lo que tiene que calcular.
-- Corre con `npx supabase test db`. Todo pasa adentro de una transacción que se deshace.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir datos.inc

select plan(28);

-- ---------------------------------------------------------------- costos
select is((select round(costo_unit_real, 2) from v_costo_item where pedido_id = 'P-901' and sku = 6001),
          27666.67::numeric, 'Costo con dorsal: $27.000 + envío prorrateado = $27.666,67 (caso P-005)');
select is((select round(costo_unit_real, 2) from v_costo_item where pedido_id = 'P-901' and sku = 6002),
          24666.67::numeric, 'Costo sin dorsal: $24.666,67');
select is((select round(costo_unit_real, 2) from v_costo_item where pedido_id = 'P-902'),
          17703.71::numeric, 'Costo sin item propio: mercadería del pedido / unidades');

-- ---------------------------------------------------------------- venta en mano
select ok((select registrar_venta('{"id":"C-901"}', '[{"sku":6001}]', 'Entregada',
                                  '{"monto":42500,"metodo":"Transferencia","tipo":"Total"}')) like 'V-%',
          'Venta entregada y pagada en una sola operación');
select is((select fisico from v_stock where sku = 6001), 0, 'La unidad vendida sale del físico');
select is((select count(*)::int from caja_movimientos where categoria = 'Venta'), 1,
          'El pago generó su movimiento de caja solo');
select is((select costo_unit from venta_items where sku = 6001), 27666.67::numeric,
          'La venta guarda la foto del costo real');
select is((select pedido_id from venta_items where sku = 6001), 'P-901', 'La unidad sale del pedido P-901 (FIFO)');

-- ---------------------------------------------------------------- lo que se rechaza
select throws_like($$ select registrar_venta('{"id":"C-901"}', '[{"sku":6001}]', 'Entregada') $$,
                   'Sin stock:%', 'No se vende la misma unidad dos veces');
select throws_like($$ select registrar_venta('{"id":"C-901"}', '[{"sku":9999}]', 'Reservada') $$,
                   'El SKU 9999 no existe', 'Un SKU que no existe se rechaza');
select throws_like($$ select registrar_venta('{"id":"C-901"}', '[{"sku":6002,"precio_unit":30000}]', 'Reservada') $$,
                   '%falta el motivo del descuento', 'Cobrar menos que la lista pide motivo');
select throws_like($$ select registrar_movimiento('Ingreso', 'Venta', 1000, 'Efectivo') $$,
                   'Los cobros de ventas se cargan como pago%', 'Una venta no entra a caja por la puerta de atrás');
select throws_ok($$ insert into caja_movimientos (tipo, categoria, monto, metodo) values ('Ingreso', 'Venta', 1000, 'Efectivo') $$,
                 '23514', null, 'Caja de tipo Venta sin pago: la tabla lo rechaza');
select throws_like($$ select ajustar_stock(6002, -5, 'conteo de prueba') $$,
                   'Sin stock:%', 'Un ajuste no puede dejar stock negativo');
select throws_like($$ select ajustar_stock(6002, -1, 'no') $$,
                   'El ajuste necesita un motivo', 'Un ajuste sin motivo se rechaza');

-- La red de seguridad: escribir directo, salteando las operaciones. El trigger es
-- diferido (salta al confirmar); acá se lo pone inmediato para verlo saltar.
set constraints all immediate;
select throws_like($$
  insert into venta_items (venta_id, sku, cantidad, precio_unit, precio_lista, costo_unit, estado)
  select id, 6001, 1, 42500, 42500, 0, 'Reservada' from ventas limit 1
$$, 'Sin stock:%', 'Aunque se escriba directo en la tabla, el trigger frena la venta sin stock');
set constraints all deferred;

-- ---------------------------------------------------------------- preventa
select ok((select registrar_venta('{"nombre":"Cliente Preventa","telefono":"+54 9 341 000-0002"}',
                                  '[{"sku":4001}]', 'Señada',
                                  '{"monto":20000,"metodo":"Efectivo","tipo":"Seña"}')) like 'V-%',
          'Se vende con seña algo que todavía no llegó');
select results_eq($$ select esperado, recibido, comprometido, fisico, disponible from v_stock where sku = 4001 $$,
                  $$ values (2, 0, 1, 0, 1) $$,
                  'Preventa: comprometida 1, físico 0, queda 1 disponible');
select throws_like($$ select cambiar_estado((select venta_id from venta_items where sku = 4001), null, 'Entregada') $$,
                   'No llegó:%', 'No se entrega lo que no llegó');
select throws_like($$ select marcar_pedido('P-902', 'Cancelado') $$,
                   'Sin stock:%', 'No se cancela un pedido con preventas vendidas');
select throws_like($$ select registrar_pago((select venta_id from venta_items where sku = 4001), 999999, 'Efectivo', 'Saldo') $$,
                   'El pago%supera lo que falta cobrar%', 'No se cobra más que el saldo');

-- Llega 1 de 2 (un rebote): la vendida queda cubierta, la otra deja de esperarse.
select lives_ok($$ select recibir_pedido('P-902', '[{"sku":4001,"cantidad":1}]') $$, 'Recibir parcial');
select results_eq($$ select esperado, recibido, fisico, disponible from v_stock where sku = 4001 $$,
                  $$ values (1, 1, 1, 0) $$, 'Después del rebote: 1 en casa, 0 disponible');

select lives_ok($$ select registrar_pago((select venta_id from venta_items where sku = 4001), 25000, 'Transferencia', 'Saldo', true) $$,
                'Paga el saldo y se entrega');
select is((select estado from venta_items where sku = 4001), 'Entregada'::estado_item, 'Quedó entregada');
select is((select saldo from v_saldo_cliente where nombre = 'Cliente Preventa'), 0::numeric, 'Saldo del cliente en cero');

-- ---------------------------------------------------------------- tablero y auditoría
select is((select skus_en_negativo from v_tablero), 0::bigint, 'Ningún SKU en negativo');
select ok((select count(*) from eventos where tabla = 'venta_items') >= 2, 'Cada cambio queda auditado');

select * from finish();
rollback;
