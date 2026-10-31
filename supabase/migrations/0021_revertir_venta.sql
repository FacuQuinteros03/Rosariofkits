-- ERP Rosario F Kits — 0021: revertir una venta entera.
--
-- Para cuando la venta no va más: no le entró, se arrepintió, no la vino a buscar.
-- En una sola transacción cancela todos los items (las unidades vuelven al stock, y
-- el puente pone en 0 su fila de VENTAS en el libro viejo), devuelve lo cobrado como
-- un pago Devolucion (sale de la caja como Egreso) y deja el motivo en las notas.
--
-- Un cambio de talle no es esto: ahí la plata no se devuelve, pasa a la venta nueva.
--
--   p_metodo: por dónde sale la devolución. Solo hace falta si había algo cobrado.
create function revertir_venta(
  p_venta  text,
  p_motivo text,
  p_metodo metodo_pago default null,
  p_fecha  date default current_date
) returns void
language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_cobrado numeric;
  v_items   text;
begin
  perform exigir_admin();

  if nullif(trim(p_motivo), '') is null then
    raise exception 'Falta el motivo: por qué se revierte la venta' using hint = 'sin_motivo';
  end if;

  select cobrado into v_cobrado from v_ventas where id = p_venta;
  if not found then
    raise exception 'No existe la venta %', p_venta using hint = 'venta_inexistente';
  end if;
  if not exists (select 1 from venta_items where venta_id = p_venta and estado <> 'Cancelada') then
    raise exception 'La venta % ya está revertida', p_venta using hint = 'venta_cancelada';
  end if;
  if v_cobrado > 0 and p_metodo is null then
    raise exception 'La venta tiene % cobrados: decí por dónde se devuelven', v_cobrado
      using hint = 'falta_metodo';
  end if;

  -- Qué se revirtió, antes de cancelar: el listado de ventas no muestra los items
  -- cancelados, así que la nota es lo que queda a la vista.
  select string_agg(regexp_replace(m.nombre, '^(Camiseta|Short) ', '') || ' ' || s.talle
                    || case when vi.cantidad > 1 then ' x' || vi.cantidad else '' end, ' + ' order by vi.id)
  into v_items
  from venta_items vi join skus s on s.sku = vi.sku join modelos m on m.id = s.modelo_id
  where vi.venta_id = p_venta and vi.estado <> 'Cancelada';

  perform cambiar_estado(p_venta, null, 'Cancelada');

  if v_cobrado > 0 then
    perform registrar_pago(p_venta, -v_cobrado, p_metodo, 'Devolucion', false, p_fecha,
                           'Venta revertida: ' || trim(p_motivo));
  end if;

  update ventas
  set notas = concat_ws(' · ', nullif(notas, ''),
                        'Revertida el ' || to_char(p_fecha, 'DD/MM') || ' (' || v_items || '): '
                          || trim(p_motivo))
  where id = p_venta;
end $$;

revoke execute on function revertir_venta(text, text, metodo_pago, date) from public, anon;
grant execute on function revertir_venta(text, text, metodo_pago, date) to authenticated;
