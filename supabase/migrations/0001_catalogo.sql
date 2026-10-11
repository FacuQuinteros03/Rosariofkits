-- ERP Rosario F Kits — 0001: permisos de base y catálogo (equipos, modelos, skus).
-- Diseño: docs/erp-diseno.md, sección 2.

-- ---------------------------------------------------------------------------
-- Permisos por defecto
-- ---------------------------------------------------------------------------
-- Supabase da por defecto SELECT/INSERT/... sobre las tablas nuevas y EXECUTE sobre
-- las funciones nuevas a anon y authenticated, y Postgres da EXECUTE a PUBLIC.
-- Acá se corta todo eso: nada queda expuesto salvo lo que se otorga a mano en 0009.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated, public;

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type tipo_producto as enum ('FAN', 'Jugador', 'Retro', 'Short');
create type estado_pub    as enum ('Stock', 'Preventa', 'Archivado');
-- La categoría fina de la web (lib/sheets.ts, clasificar()).
create type linea         as enum ('Clubes', 'Selecciones', 'Retro', 'Shorts');

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
create table equipos (
  id      bigint generated always as identity primary key,
  nombre  text not null unique,              -- "Boca", "Real Madrid", "Argentina"
  escudo  text                               -- slug del archivo en public/escudos
);

create table modelos (
  id          bigint generated always as identity primary key,
  nombre      text not null unique,          -- "Camiseta Boca 25/26"
  categoria   text not null check (categoria in ('Camiseta', 'Short')),
  tipo        tipo_producto not null,
  linea       linea not null,
  equipo_id   bigint references equipos,     -- null si no es un equipo (Oasis)
  nuevo       boolean not null default false, -- franja "Recién llegadas"
  creado_en   timestamptz not null default now(),
  check (length(trim(nombre)) > 0)
);

create table skus (
  -- Lo fija Diezcba/subir_fotos.py: public/fotos/<SKU>.jpg depende de este número.
  sku          integer primary key check (sku between 1000 and 9999),
  modelo_id    bigint not null references modelos,
  talle        text not null check (talle in ('XS','S','M','L','XL','XXL','XXXL','ÚNICO')),
  -- En la preventa el estampado es parte de la unidad: "Real Madrid 26/27 Titular"
  -- talle L existe con BELLINGHAM y con VINI JR.
  estampado    text,
  dorsal       boolean not null default false,
  precio       numeric(12,2) not null check (precio > 0),
  -- Precio tachado: solo si de verdad estuvo publicada a ese precio (ver rosariofkits-negocio).
  precio_antes numeric(12,2) check (precio_antes is null or precio_antes > precio),
  estado_pub   estado_pub not null default 'Stock'
);
-- Una unidad, un SKU. coalesce porque en un unique dos NULL no chocan.
create unique index skus_unidad_unica on skus (modelo_id, talle, coalesce(estampado, ''));
create index skus_modelo on skus (modelo_id);
