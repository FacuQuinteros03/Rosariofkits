-- Una venta cargada como el usuario del panel (rol authenticated), hasta los controles
-- diferidos de stock, que son los que corren al confirmar.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir datos.inc

select plan(3);

set local role authenticated;
select lives_ok($$ select registrar_venta('{"id":"C-901"}', '[{"sku":6002}]', 'Pagada',
                                         '{"monto":42500,"metodo":"Transferencia","tipo":"Total"}') $$,
                'El admin carga la venta desde el panel');
select lives_ok($$ set constraints all immediate $$,
                'Los controles de stock del commit corren con el rol del panel');
set constraints all deferred;
select throws_like($$ select registrar_venta('{"id":"C-901"}', '[{"sku":6002, "cantidad":99}]', 'Reservada') $$,
                   'Sin stock%', 'Y siguen frenando una venta sin stock');
reset role;

select * from finish();
rollback;
