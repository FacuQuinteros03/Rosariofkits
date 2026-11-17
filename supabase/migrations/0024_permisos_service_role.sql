-- ERP Rosario F Kits — 0024: la clave secreta (service_role) recupera sus permisos.
--
-- 0001 y 0009 cerraron la base revocando permisos, y en el camino service_role quedó
-- sin poder leer tablas ni ejecutar funciones (lo que Supabase le da de fábrica). Se
-- notó el 17/11/2026: el pago por transferencia (/api/pedido) no podía contar los
-- pedidos pendientes ni registrar la venta.
--
-- service_role es la clave de administración: solo vive en el servidor (Vercel,
-- variable Sensitive) y Supabase la deja pasar por encima de RLS. Devolverle el acceso
-- completo es volver a cómo viene Supabase; anon y authenticated siguen cerrados.

grant usage on schema public to service_role;
grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on all functions in schema public to service_role;

-- Lo que creen las migraciones futuras también.
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
