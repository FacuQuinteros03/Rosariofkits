-- ERP Rosario F Kits — 0009: quién ve y quién escribe.
--
-- * anon (la web pública sin login): nada, salvo las dos funciones de 0011.
-- * authenticated: puede LEER todo, pero la seguridad por filas solo le devuelve filas
--   si su mail está en `admins` (Facu y Vani). Otro mail logueado ve tablas vacías.
-- * Nadie escribe directo en las tablas: toda escritura pasa por las operaciones de
--   0008, que exigen ser admin y validan.
-- * service_role (el job de backups): Supabase lo deja pasar por encima de RLS.

-- Por las dudas, sacar lo que Supabase haya otorgado antes de 0001.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
-- Postgres da EXECUTE a PUBLIC en toda función nueva, y eso no se puede quitar con un
-- "default privileges" por esquema: se revoca acá, a mano.
revoke execute on all functions in schema public from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS en todas las tablas, con una sola política: leer si es admin.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'equipos', 'modelos', 'skus', 'proveedores', 'pedidos', 'pedido_items',
    'clientes', 'ventas', 'venta_items', 'pagos', 'caja_movimientos',
    'ajustes', 'stock_diario', 'consultas', 'parametros'
  ] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy admin_lee on %I for select to authenticated using (es_admin())', t);
    execute format('grant select on %I to authenticated', t);
  end loop;
end $$;

-- admins: RLS sin ninguna política y sin permisos. Solo la lee es_admin().
alter table admins enable row level security;

-- Las vistas son security_invoker: el permiso de la vista más RLS de las tablas.
grant select on
  v_pedidos, v_costo_item, v_costo_sku, v_stock, v_venta_items, v_ventas,
  v_saldo_cliente, v_caja, v_tablero
to authenticated;

-- Las políticas llaman a es_admin() con los permisos del usuario.
grant execute on function es_admin() to authenticated;

-- Las operaciones del panel.
grant execute on function
  registrar_venta(jsonb, jsonb, estado_item, jsonb, text, date, text, text),
  registrar_pago(text, numeric, metodo_pago, tipo_pago, boolean, date, text),
  cambiar_estado(text, bigint[], estado_item),
  registrar_movimiento(tipo_mov, categoria_mov, numeric, metodo_pago, text, text, date),
  crear_pedido(text, jsonb, date, numeric, numeric, numeric, text),
  marcar_pedido(text, estado_pedido),
  recibir_pedido(text, jsonb, numeric, numeric, date),
  recalcular_costos(text),
  ajustar_stock(integer, integer, text, date),
  alta_producto(jsonb, jsonb),
  editar_sku(integer, numeric, numeric, estado_pub, boolean),
  marcar_nuevo(bigint, boolean)
to authenticated;

grant execute on function foto_stock_diaria(date) to service_role;
