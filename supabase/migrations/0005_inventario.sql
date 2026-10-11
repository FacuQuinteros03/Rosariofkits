-- ERP Rosario F Kits — 0005: ajustes, foto diaria de stock, consultas y parámetros.

create table ajustes (
  id         bigint generated always as identity primary key,
  fecha      date not null default current_date,
  sku        integer not null references skus,
  cantidad   integer not null check (cantidad <> 0),
  motivo     text not null check (length(trim(motivo)) >= 5),
  creado_por uuid,
  creado_en  timestamptz not null default now()
);
create index ajustes_sku on ajustes (sku);

-- Una fila por SKU por noche, la escribe el job de backups con foto_stock_diaria().
-- Es lo único que permite contar los días que un talle estuvo agotado.
create table stock_diario (
  fecha      date not null,
  sku        integer not null references skus,
  fisico     integer not null,
  disponible integer not null,
  primary key (fecha, sku)
);

-- Consultas por encargue desde la web: demanda de lo que está agotado.
create table consultas (
  id      bigint generated always as identity primary key,
  en      timestamptz not null default now(),
  sku     integer not null references skus,
  origen  text check (length(origen) <= 40)  -- "tarjeta", "ficha"...
);
create index consultas_sku on consultas (sku);

-- Valores sueltos. Hoy solo `fecha_corte`: lo anterior se marca como dato estimado.
create table parametros (
  clave text primary key,
  valor text
);
insert into parametros (clave, valor) values ('fecha_corte', null);
