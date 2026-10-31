-- ERP Rosario F Kits — 0002: compras (proveedores, pedidos, pedido_items).

create type estado_pedido as enum ('Encargado', 'En transito', 'Recibido', 'Cancelado');

create table proveedores (
  id     bigint generated always as identity primary key,
  nombre text not null unique,               -- "Importador China", "Diez Store"...
  notas  text
);

create sequence pedido_seq;
create table pedidos (
  id               text primary key default 'P-' || lpad(nextval('pedido_seq')::text, 3, '0'),
  fecha            date not null,
  proveedor_id     bigint not null references proveedores,
  estado           estado_pedido not null default 'Encargado',
  recibido_en      date,                     -- lo pone recibir_pedido(); base de la rotación
  costo_mercaderia numeric(12,2) check (costo_mercaderia >= 0),
  costo_envio      numeric(12,2) check (costo_envio >= 0),
  otros            numeric(12,2) check (otros >= 0),
  notas            text,
  check ((estado = 'Recibido') = (recibido_en is not null)),
  check (recibido_en is null or recibido_en >= fecha)
);
-- La regla "no se marca Recibido sin costo" la valida recibir_pedido() (0008): pide
-- costo_mercaderia, o costo_unit en todos los items (P-001 y P-002 son así).

create table pedido_items (
  id                 bigint generated always as identity primary key,
  pedido_id          text not null references pedidos,
  sku                integer not null references skus,
  cantidad           integer not null check (cantidad > 0),
  cantidad_recibida  integer not null default 0 check (cantidad_recibida between 0 and cantidad),
  costo_unit         numeric(12,2) check (costo_unit >= 0), -- si se sabe por item
  apellido           text,
  nota_estampado     text,
  unique (pedido_id, sku)
);
create index pedido_items_sku on pedido_items (sku);
