-- ERP Rosario F Kits — 0003: clientes, ventas (cabecera) y venta_items.

-- El orden importa: min() sobre este enum da el estado "más atrasado" de una venta.
create type estado_item as enum ('Reservada', 'Señada', 'Pagada', 'Entregada', 'Cancelada');

create sequence cliente_seq;
create table clientes (
  id        text primary key default 'C-' || lpad(nextval('cliente_seq')::text, 3, '0'),
  nombre    text not null check (length(trim(nombre)) > 0),
  tipo      text not null default 'Minorista' check (tipo in ('Minorista', 'Mayorista')),
  telefono  text unique,                     -- solo dígitos, normalizado por la app
  notas     text,
  creado_en timestamptz not null default now()
);

create sequence venta_seq;
create table ventas (
  id         text primary key default 'V-' || lpad(nextval('venta_seq')::text, 4, '0'),
  fecha      date not null default current_date,
  cliente_id text not null references clientes,
  -- El libro tenía el medio de pago en "Canal": la migración deja esto en null.
  canal      text check (canal in ('WhatsApp', 'Instagram', 'Web', 'En persona', 'Grupo de stock')),
  cupon      text,
  notas      text,
  creado_por uuid,
  creado_en  timestamptz not null default now()
);
create index ventas_cliente on ventas (cliente_id);
create index ventas_fecha on ventas (fecha);

create table venta_items (
  id               bigint generated always as identity primary key,
  venta_id         text not null references ventas on delete cascade,
  sku              integer not null references skus,
  cantidad         integer not null check (cantidad > 0),
  precio_unit      numeric(12,2) not null check (precio_unit >= 0),
  precio_lista     numeric(12,2) not null check (precio_lista >= 0), -- foto de skus.precio
  precio_antes     numeric(12,2),                                    -- foto de skus.precio_antes
  costo_unit       numeric(12,2) not null check (costo_unit >= 0),   -- foto del costo al vender
  -- true cuando el costo es un supuesto (los fijos de $10.000 / $15.000 / $25.500 de
  -- agosto y septiembre de 2026): las métricas lo marcan como estimado.
  costo_estimado   boolean not null default false,
  pedido_id        text references pedidos,  -- de qué pedido sale la unidad (FIFO)
  estado           estado_item not null,
  promo            text,                     -- "2x100000", "Mayorista"...
  motivo_descuento text,
  entregado_en     timestamptz,
  -- Cobrar menos que la lista tiene que decir por qué.
  check (precio_unit >= precio_lista or promo is not null or motivo_descuento is not null),
  check ((estado = 'Entregada') = (entregado_en is not null))
);
create index venta_items_venta on venta_items (venta_id);
create index venta_items_sku on venta_items (sku);
create index venta_items_pedido on venta_items (pedido_id);
