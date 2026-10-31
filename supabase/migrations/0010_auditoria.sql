-- ERP Rosario F Kits — 0010: quién hizo qué.
--
-- Una fila por cada alta, cambio o baja en las tablas de negocio. A esta escala
-- ocupa nada, y es lo que hoy falta cuando un número del libro no cierra. Además es
-- de donde sale la fecha de cada cambio de precio para las métricas de rebajas.

create table eventos (
  id      bigint generated always as identity primary key,
  en      timestamptz not null default now(),
  usuario uuid,
  tabla   text not null,
  accion  text not null check (accion in ('insert', 'update', 'delete')),
  antes   jsonb,
  despues jsonb
);
create index eventos_tabla_en on eventos (tabla, en);

alter table eventos enable row level security;
create policy admin_lee on eventos for select to authenticated using (es_admin());
grant select on eventos to authenticated;

create function auditar() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  insert into eventos (usuario, tabla, accion, antes, despues)
  values (auth.uid(), tg_table_name, lower(tg_op),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;
revoke execute on function auditar() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array[
    'equipos', 'modelos', 'skus', 'proveedores', 'pedidos', 'pedido_items',
    'clientes', 'ventas', 'venta_items', 'pagos', 'caja_movimientos', 'ajustes',
    'parametros', 'admins'
  ] loop
    execute format(
      'create trigger auditar after insert or update or delete on %I
         for each row execute function auditar()', t);
  end loop;
end $$;
