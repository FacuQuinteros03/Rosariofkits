-- Revertir una venta: las unidades vuelven al stock y lo cobrado sale de la caja.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
\ir datos.inc

select plan(11);

-- Una reservada sin cobrar (el caso de Sofi) y una pagada.
select registrar_venta('{"id":"C-901"}', '[{"sku":6001}]', 'Reservada') as reservada \gset
select registrar_venta('{"id":"C-901"}', '[{"sku":6002}]', 'Pagada',
                       '{"monto":42500,"metodo":"Transferencia","tipo":"Total"}') as pagada \gset

select throws_like(format($$ select revertir_venta(%L, '  ') $$, :'reservada'),
                   'Falta el motivo%', 'Sin motivo no se revierte');

select lives_ok(format($$ select revertir_venta(%L, 'Le quedó chica') $$, :'reservada'),
                'Una reserva sin cobrar se revierte sin decir método');
select is((select disponible from v_stock where sku = 6001), 1, 'La unidad vuelve al stock');
select is((select estado::text from v_ventas where id = :'reservada'), 'Cancelada', 'La venta queda Cancelada');
select is((select count(*)::int from pagos where venta_id = :'reservada'), 0, 'Sin cobro no hay devolución');
select matches((select notas from ventas where id = :'reservada'), 'Revertida el \d\d/\d\d \(Boca 25/26 M\): Le quedó chica',
               'El motivo y lo que se revirtió quedan en las notas');

select throws_like(format($$ select revertir_venta(%L, 'De nuevo') $$, :'reservada'),
                   '%ya está revertida', 'No se revierte dos veces');

select throws_like(format($$ select revertir_venta(%L, 'No le entró') $$, :'pagada'),
                   '%decí por dónde se devuelven', 'Con plata cobrada hay que decir el método');
select lives_ok(format($$ select revertir_venta(%L, 'No le entró', 'Efectivo') $$, :'pagada'),
                'La pagada se revierte devolviendo en efectivo');
select is((select cobrado::numeric from v_ventas where id = :'pagada'), 0::numeric, 'Lo cobrado queda en cero');
select is((select c.monto::numeric from caja_movimientos c join pagos p on p.id = c.pago_id
           where p.venta_id = :'pagada' and c.tipo = 'Egreso'), 42500::numeric,
          'La devolución sale de la caja como egreso');

select * from finish();
rollback;
