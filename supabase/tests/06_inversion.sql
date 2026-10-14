-- Inversión y gasto total.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir datos.inc

select plan(3);

select registrar_movimiento('Ingreso', 'Aporte', 300000, 'Transferencia', null, 'aporte');
select registrar_movimiento('Egreso', 'Retiro', 50000, 'Efectivo', null, 'retiro');
select registrar_movimiento('Egreso', 'Publicidad', 10000, 'Transferencia', null, 'ads');

select is((select inversion from v_inversion), 250000::numeric, 'Inversión = aportes - retiros');
select is((select gastado_otros from v_inversion), 10000::numeric, 'Los retiros no cuentan como gasto');
select is((select costo_total - gastado - deuda_proveedores from v_inversion), 0::numeric,
          'Costo total = gastado + lo que falta pagar');

select * from finish();
rollback;
