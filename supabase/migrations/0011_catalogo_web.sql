-- ERP Rosario F Kits — 0011: lo único que la web pública puede tocar sin login.

-- El catálogo, con exactamente las columnas que hoy publica la hoja WEB, así
-- lib/sheets.ts arma los productos igual que con el CSV. Nunca devuelve costo,
-- margen, clientes ni pagos. Función security definer en vez de vista abierta:
-- Supabase marca como riesgo las vistas que se saltean RLS, y así el permiso es una
-- sola línea auditable.
create function catalogo_web()
returns table (
  sku          integer,
  producto     text,
  categoria    text,
  precio       numeric,
  disponible   integer,
  estado_pub   estado_pub,
  nuevo        boolean,
  precio_antes numeric
)
language sql stable security definer set search_path = public, pg_temp as $$
  select s.sku,
         m.nombre || coalesce(' (' || s.estampado || ')', '') || ' - Talle ' || s.talle,
         m.categoria,
         s.precio,
         greatest(st.disponible, 0),
         s.estado_pub,
         m.nuevo,
         s.precio_antes
  from skus s
  join modelos m  on m.id = s.modelo_id
  join v_stock st on st.sku = s.sku
  where s.estado_pub <> 'Archivado'
  order by s.sku;
$$;

-- El botón de encargue de un agotado deja registrado qué SKU se pidió. Solo inserta,
-- no devuelve nada, y valida el SKU y el largo del origen.
create function registrar_consulta(p_sku integer, p_origen text default null)
returns void
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists (select 1 from skus where sku = p_sku and estado_pub <> 'Archivado') then
    return;  -- en silencio: no se le confirma a nadie qué SKU existe
  end if;
  insert into consultas (sku, origen) values (p_sku, left(nullif(trim(p_origen), ''), 40));
end $$;

revoke execute on function catalogo_web(), registrar_consulta(integer, text) from public;
grant execute on function catalogo_web() to anon, authenticated;
grant execute on function registrar_consulta(integer, text) to anon, authenticated;
