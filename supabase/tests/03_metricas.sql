-- Las métricas: que todas las vistas respondan y que las cuentas den lo que tienen que dar.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir datos.inc

select plan(22);

-- Una venta en mano (6001, del pedido de Diez Store) y una preventa señada (4001).
select registrar_venta('{"id":"C-901"}', '[{"sku":6001}]', 'Entregada',
                       '{"monto":42500,"metodo":"Transferencia","tipo":"Total"}', 'WhatsApp');
select registrar_venta('{"nombre":"Mayorista Prueba","tipo":"Mayorista"}',
                       '[{"sku":4001,"precio_unit":40000,"promo":"Mayorista"}]', 'Señada',
                       '{"monto":20000,"metodo":"Efectivo","tipo":"Seña"}', 'Instagram');

-- Todas las vistas responden.
select lives_ok($$
  do $d$
  declare v text;
  begin
    foreach v in array array[
      'v_ventas_por_modelo', 'v_ventas_por_equipo', 'v_ventas_por_linea', 'v_ventas_por_talle',
      'v_ventas_por_proveedor', 'v_rotacion', 'v_stock_inmovilizado', 'v_talles', 'v_curva_talles',
      'v_clientes_metricas', 'v_ticket', 'v_cobros_metodo', 'v_promos', 'v_rebajas', 'v_preventa',
      'v_posicion', 'v_flujo_mensual', 'v_flujo_mes', 'v_consultas', 'v_margen_pedido', 'v_tablero'
    ] loop
      execute format('select count(*) from %I', v);
    end loop;
  end $d$
$$, 'Todas las vistas de métricas responden');

select is((select count(*)::int from v_hechos_venta), 2, 'Una fila por item vendido');

-- Margen del pedido de Diez Store: 27.000 + 24.000 + 28 x 24.000 + 20.000 de envío.
select results_eq(
  $$ select costo_total, unidades_vendidas, facturado, round(ganancia_realizada, 2), unidades_sin_vender
     from v_margen_pedido where pedido_id = 'P-901' $$,
  $$ values (743000::numeric, 1::bigint, 42500::numeric, 14833.33::numeric, 29::bigint) $$,
  'Margen real del pedido, con el envío prorrateado');

select is((select fue_preventa from v_hechos_venta where sku = 4001), true, 'La de China cuenta como preventa');
select is((select descuento from v_hechos_venta where sku = 4001), 5000::numeric, 'El descuento mayorista se mide contra la lista');
select results_eq(
  $$ select ventas, unidades, descuento from v_promos where promo = 'Mayorista' $$,
  $$ values (0::bigint, 0::bigint, 2500::numeric) $$,
  'Señada a la mitad: cuenta la mitad del descuento, sin ventas ni unidades cerradas');

select results_eq(
  $$ select vendidas_antes_de_llegar, senadas, faltantes from v_preventa where pedido_id = 'P-902' $$,
  $$ values (1::bigint, 1::bigint, 0::bigint) $$,
  'Preventa: 1 vendida antes de llegar, señada, sin faltantes');

select results_eq(
  $$ select senas_sin_entregar, a_cobrar from v_posicion $$,
  $$ values (20000::numeric, 20000::numeric) $$,
  'Posición: la seña es plata del cliente hasta entregar, y faltan 20.000 por cobrar');

select is((select saldo_acumulado from v_flujo_mes), 62500::numeric, 'Flujo: entró 42.500 + 20.000');

select is((select tramo from v_stock_inmovilizado where sku = 6002) is not null, true, 'El stock quieto tiene su tramo');

select results_eq(
  $$ select recurrente, tipo from v_clientes_metricas where nombre = 'Mayorista Prueba' $$,
  $$ values (false, 'Mayorista'::text) $$,
  'Clientes: un mayorista con una compra no es recurrente');

select ok((select pct_mayorista from v_ticket where canal is null) = 0.5, 'Ticket: mitad de las ventas fueron mayoristas');

select is((select de_cada_10 from v_curva_talles where tipo = 'Jugador' and talle = 'M'), 5,
          'Curva: de cada 10 Jugador, 5 M');

-- La ganancia cuenta en proporción a lo cobrado (0022): la seña de 20.000 sobre 40.000
-- es la mitad de la ganancia; la otra mitad, y el saldo que debe, quedan a cobrar.
select results_eq(
  $$ select ganancia, ganancia_a_cobrar, a_cobrar, ventas_a_cobrar from v_tablero $$,
  $$ select round((select ganancia from v_hechos_venta where sku = 6001)
                  + (select ganancia from v_hechos_venta where sku = 4001) / 2, 2),
            round((select ganancia from v_hechos_venta where sku = 4001), 2)
              - round((select ganancia from v_hechos_venta where sku = 4001) / 2, 2),
            20000::numeric, 1::bigint $$,
  'Tablero: la seña cuenta la mitad de la ganancia; lo que debe sigue a cobrar');
select results_eq(
  $$ select unidades_vendidas, facturado, a_cobrar from v_margen_pedido where pedido_id = 'P-902' $$,
  $$ values (0::bigint, 20000::numeric, 20000::numeric) $$,
  'Margen del pedido: la seña es realizada, el saldo a cobrar, y la unidad todavía no se cerró');
select is((select sum(facturado) from v_resumen_mensual), 62500::numeric, 'Resumen: lo cobrado, seña incluida');

select registrar_pago((select venta_id from v_hechos_venta where sku = 4001), 20000, 'Efectivo', 'Saldo', false, current_date, null);
select results_eq(
  $$ select cobrada, fecha_cobro from v_hechos_venta where sku = 4001 $$,
  $$ values (true, current_date) $$,
  'Pagada entera: cuenta, en la fecha del último pago, aunque no se entregó');
select is((select ganancia_a_cobrar from v_tablero), 0::numeric, 'Ya no queda ganancia a cobrar');
select is((select descuento from v_promos where promo = 'Mayorista'), 5000::numeric, 'Y aparece en promos');

-- Una rebaja: queda registrada con su fecha y su precio anterior.
select editar_sku(6002, 39000, 42500);
select results_eq(
  $$ select precio_anterior, precio_nuevo, precio_tachado from v_rebajas where sku = 6002 $$,
  $$ values (42500::numeric, 39000::numeric, 42500::numeric) $$,
  'Rebajas: el cambio de precio sale de la auditoría');

-- Fecha de corte: lo anterior queda marcado como estimado.
update parametros set valor = (current_date + 1)::text where clave = 'fecha_corte';
select is((select bool_and(dato_estimado) from v_hechos_venta), true, 'Antes del corte, todo es dato estimado');
update parametros set valor = '2000-01-01' where clave = 'fecha_corte';
select is((select bool_or(dato_estimado) from v_hechos_venta), false, 'Después del corte, no');

select * from finish();
rollback;
