-- Valor de la mercadería sin vender, en casa y en camino.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir datos.inc

select plan(3);

create temp table antes as select * from v_valor_mercaderia;
select registrar_venta('{"id":"C-901"}', '[{"sku":6002}]', 'Pagada', '{"monto":42500,"metodo":"Efectivo","tipo":"Total"}');
select registrar_venta('{"id":"C-901"}', '[{"sku":4001}]', 'Reservada');

select is((select unidades_casa from v_valor_mercaderia), (select unidades_casa - 1 from antes),
          'Una vendida que está en casa deja de contar en casa');
select is((select unidades_camino from v_valor_mercaderia), (select unidades_camino - 1 from antes),
          'Una reservada de un pedido en camino deja de contar en camino');
select is((select lista_total - lista_casa - lista_camino from v_valor_mercaderia), 0::numeric,
          'El total es casa + camino');

select * from finish();
rollback;
