-- ERP Rosario F Kits — 0004: pagos y caja, atados.

create type tipo_pago     as enum ('Total', 'Seña', 'Saldo', 'Devolucion');
create type metodo_pago   as enum ('Transferencia', 'Efectivo', 'Mercado Pago');
create type tipo_mov      as enum ('Ingreso', 'Egreso');
create type categoria_mov as enum
  ('Venta', 'Pago proveedor', 'Envio China', 'Envio cliente', 'Publicidad', 'Retiro', 'Aporte', 'Otro');

create sequence pago_seq;
create table pagos (
  id         text primary key default 'PG-' || lpad(nextval('pago_seq')::text, 4, '0'),
  fecha      date not null default current_date,
  venta_id   text not null references ventas,
  -- Negativo solo si es una devolución. El cliente es el de la venta: no se guarda dos
  -- veces, así no puede diferir (en el libro pasaba).
  monto      numeric(12,2) not null check (monto <> 0),
  metodo     metodo_pago not null,
  tipo       tipo_pago not null,
  notas      text,
  creado_en  timestamptz not null default now(),
  check ((tipo = 'Devolucion') = (monto < 0))
);
create index pagos_venta on pagos (venta_id);

create sequence mov_seq;
create table caja_movimientos (
  id         text primary key default 'M-' || lpad(nextval('mov_seq')::text, 4, '0'),
  fecha      date not null default current_date,
  tipo       tipo_mov not null,
  categoria  categoria_mov not null,
  monto      numeric(12,2) not null check (monto > 0),
  metodo     metodo_pago not null,
  pago_id    text unique references pagos,   -- lo llena el trigger de pagos
  pedido_id  text references pedidos,        -- para "Pago proveedor" y "Envio China"
  nota       text,
  creado_en  timestamptz not null default now(),
  check ((categoria = 'Venta') = (pago_id is not null)),
  check (categoria not in ('Pago proveedor', 'Envio China') or pedido_id is not null)
);
create index caja_pedido on caja_movimientos (pedido_id);

-- Cada pago genera su movimiento de caja en la misma transacción: no se pueden
-- desincronizar, y por eso desaparece el control "caja = pagos" del TABLERO.
-- La migración desde el libro trae los M-xxxx tal cual y apaga esto con
-- `set local erp.migrando = 'on'`.
create function pago_a_caja() returns trigger
language plpgsql as $$
begin
  if coalesce(current_setting('erp.migrando', true), '') = 'on' then
    return new;
  end if;
  insert into caja_movimientos (fecha, tipo, categoria, monto, metodo, pago_id, nota)
  values (new.fecha,
          case when new.monto > 0 then 'Ingreso' else 'Egreso' end::tipo_mov,
          'Venta', abs(new.monto), new.metodo, new.id,
          'Pago ' || new.tipo || ' de ' || new.venta_id);
  return new;
end $$;

create trigger pagos_caja after insert on pagos
  for each row execute function pago_a_caja();
