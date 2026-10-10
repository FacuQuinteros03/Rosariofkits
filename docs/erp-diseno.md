# ERP de Rosario F Kits — documento de diseño

> Estado: **propuesta para aprobar**. Nada de esto está implementado. Fecha: 2026-10-10.

## 1. Por qué, en una página

Hoy hay dos libros de Google Sheets y ninguno sabe del otro:

- `Stock_RosarioFkits` (el viejo) alimenta la web por un CSV publicado. Tiene precio,
  `Nuevo` y `Precio Antes`, pero no tiene plata: ni pagos, ni caja, ni pedidos.
- `Libro_RosarioFkits` (el nuevo) lleva la contabilidad: pedidos, costos, señas, caja.
  No alimenta la web.

Una venta cargada en uno no aparece en el otro. Y las fórmulas fallan **en silencio**:
`SUMIFS` sobre columnas enteras no se queja si un SKU está mal tipeado, si una fila quedó
corrida de modelo (pasó con los shorts Argentina) o si alguien escribe un número encima
de una fórmula (pasó con el SKU 3004, que ofreció en la web una camiseta que no existía).

La idea es una sola base de datos que:

1. **No acepte datos inválidos** en vez de calcularlos mal: un SKU que no existe, una
   venta sin stock o un pago sin cliente se rechazan al cargarlos, con un mensaje.
2. **Calcule** todo lo calculable (stock, saldos, costos, caja) en vistas que nadie puede
   pisar a mano.
3. Sea la **única** fuente: la web pública, el panel `/admin` y la exportación a Sheets
   leen de ahí.

Dato a favor: de los cuatro disparadores para migrar que dejamos anotados en
septiembre, uno ya se cumplió (hay **tres pedidos en tránsito a la vez**: P-003, P-004 y
P-005), y el carrito de la web va camino a cobrar online, que es otro.

### Decisiones de base

| Tema | Decisión | Por qué |
|---|---|---|
| Base | **Supabase**, plan gratis, región São Paulo (`sa-east-1`) | Postgres de verdad, auth incluida, API REST, la más cercana a Rosario |
| Panel | **`/admin` dentro de la misma web Next.js** | Un solo repo, un solo deploy en Vercel; reusa estilos y tipos |
| Escrituras | **Funciones SQL (RPC)** que hacen la operación entera en una transacción | Una venta = items + pago + caja, o nada. Igual que `registrarVenta` del Apps Script, pero con garantías |
| Plata | `numeric(12,2)` en pesos | El costo unitario tiene centavos ($17.703,71) |
| IDs | Se mantienen los códigos humanos: `V-0001`, `P-003`, `C-012`, `PG-0045` | Facu los usa por WhatsApp y en las notas; la migración los conserva tal cual |
| SKU | Entero, lo sigue fijando `Diezcba/subir_fotos.py` | Las fotos de `public/fotos/<SKU>.jpg` dependen de esa numeración |

## 2. El modelo de datos

### 2.1 Diagrama

```
proveedores ─┐
             └─< pedidos ─< pedido_items >─┐
                                           │
modelos ─< skus ───────────────────────────┤
                                           │
clientes ─< ventas ─< venta_items >────────┤
              │                            │
              └─< pagos ── caja_movimientos│
                                           │
                     ajustes >─────────────┘
admins (quién puede entrar)    eventos (auditoría)
```

`>─` = muchos a uno. Todo `sku` de `pedido_items`, `venta_items` y `ajustes` es **clave
foránea** a `skus`: un SKU mal tipeado no entra.

### 2.2 Cambios respecto del libro nuevo (y por qué)

1. **`modelos` separado de `skus`.** Hoy el nombre del modelo se repite en cada talle; si
   se tipea distinto en uno, la web arma dos productos. Con una tabla de modelos, el
   nombre, la categoría, el tipo y `nuevo` viven una sola vez. Es también lo que agrupa
   `getCatalogo()`, que hoy lo deduce del texto.
2. **`ventas` (cabecera) separada de `venta_items`.** Hoy el `Venta_ID` se repite en
   cada fila y nada impide que dos filas del mismo ID tengan cliente o fecha distintos.
3. **El estado vive en cada item, no en la venta.** Una misma venta puede llevar una
   camiseta en mano (Entregada) y otra de la preventa (Señada). La vista de ventas
   resume el estado de la cabecera.
4. **`cantidad_recibida` por item de pedido.** Hoy "Recibido" es todo o nada por
   pedido. Con los rebotes de octubre (8 camisetas y 20 shorts sin stock en el
   proveedor) hace falta poder decir "llegaron 112 de 120".
5. **Pagos y caja quedan atados.** Cada pago genera su movimiento de caja **solo**, en la
   misma transacción. Hoy hay que cargar las dos filas a mano y por eso existe el
   control "caja = pagos"; acá no se pueden desincronizar.
6. **`Nuevo` y `Precio Antes`** pasan a la base (hoy solo están en el libro viejo).

### 2.3 Esquema SQL

Es diseño, no el archivo final de migración; los nombres y tipos son los que se van a
usar.

```sql
-- ============ catálogo ============
create type tipo_producto  as enum ('FAN', 'Jugador', 'Retro', 'Short');
create type estado_pub     as enum ('Stock', 'Preventa', 'Archivado');

create table modelos (
  id          bigint generated always as identity primary key,
  nombre      text not null unique,          -- "Camiseta Boca 25/26"
  categoria   text not null check (categoria in ('Camiseta', 'Short')),
  tipo        tipo_producto not null,
  nuevo       boolean not null default false, -- franja "Recién llegadas"
  creado_en   timestamptz not null default now()
);

create table skus (
  sku          integer primary key check (sku between 1000 and 9999),
  modelo_id    bigint not null references modelos,
  talle        text not null check (talle in ('XS','S','M','L','XL','XXL','XXXL','ÚNICO')),
  estampado    text,                          -- "MESSI 10"; parte de la unidad en preventa
  dorsal       boolean not null default false,
  precio       numeric(12,2) not null check (precio > 0),
  precio_antes numeric(12,2) check (precio_antes is null or precio_antes > precio),
  estado_pub   estado_pub not null default 'Stock',
  unique (modelo_id, talle, estampado)       -- no dos SKUs para la misma unidad
);

-- ============ compras ============
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
  costo_mercaderia numeric(12,2) check (costo_mercaderia >= 0),
  costo_envio      numeric(12,2) check (costo_envio >= 0),
  otros            numeric(12,2) check (otros >= 0),
  notas            text
  -- regla de facturación: no se marca Recibido sin el costo cargado. La valida
  -- recibir_pedido(): pide costo_mercaderia, o costo_unit en todos los items (P-001, P-002)
);

create table pedido_items (
  id                 bigint generated always as identity primary key,
  pedido_id          text not null references pedidos,
  sku                integer not null references skus,
  cantidad           integer not null check (cantidad > 0),
  cantidad_recibida  integer not null default 0 check (cantidad_recibida between 0 and cantidad),
  costo_unit         numeric(12,2) check (costo_unit >= 0), -- si se sabe por item (P-001, P-002)
  apellido           text,
  nota_estampado     text,
  unique (pedido_id, sku)
);

-- ============ clientes y ventas ============
create type estado_item as enum ('Reservada', 'Señada', 'Pagada', 'Entregada', 'Cancelada');

create sequence cliente_seq;
create table clientes (
  id        text primary key default 'C-' || lpad(nextval('cliente_seq')::text, 3, '0'),
  nombre    text not null,
  telefono  text unique,                     -- normalizado con lib/telefono.ts
  notas     text
);

create sequence venta_seq;
create table ventas (
  id         text primary key default 'V-' || lpad(nextval('venta_seq')::text, 4, '0'),
  fecha      date not null default current_date,
  cliente_id text not null references clientes,
  canal      text,                           -- WhatsApp, Instagram, web, en persona
  cupon      text,
  notas      text,
  creado_por uuid references auth.users,
  creado_en  timestamptz not null default now()
);

create table venta_items (
  id               bigint generated always as identity primary key,
  venta_id         text not null references ventas on delete cascade,
  sku              integer not null references skus,
  cantidad         integer not null check (cantidad > 0),
  precio_unit      numeric(12,2) not null check (precio_unit >= 0),
  costo_unit       numeric(12,2) not null,   -- foto del costo al vender (ver v_costo_sku)
  estado           estado_item not null,
  motivo_descuento text,
  -- si se cobra menos que la lista, tiene que decir por qué (se valida en la RPC)
  entregado_en     timestamptz
);

-- ============ plata ============
create type tipo_pago   as enum ('Total', 'Seña', 'Saldo', 'Devolucion');
create type metodo_pago as enum ('Transferencia', 'Efectivo', 'Mercado Pago');

create sequence pago_seq;
create table pagos (
  id         text primary key default 'PG-' || lpad(nextval('pago_seq')::text, 4, '0'),
  fecha      date not null default current_date,
  venta_id   text not null references ventas,
  monto      numeric(12,2) not null check (monto <> 0), -- negativo solo si tipo = Devolucion
  metodo     metodo_pago not null,
  tipo       tipo_pago not null,
  notas      text,
  check ((tipo = 'Devolucion') = (monto < 0))
);
-- El cliente del pago es el de la venta: no se guarda dos veces, así no puede diferir.

create type tipo_mov as enum ('Ingreso', 'Egreso');
create type categoria_mov as enum
  ('Venta', 'Pago proveedor', 'Envio China', 'Envio cliente', 'Publicidad', 'Retiro', 'Aporte', 'Otro');

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
  check ((categoria = 'Venta') = (pago_id is not null)),
  check (categoria not in ('Pago proveedor', 'Envio China') or pedido_id is not null)
);

-- ============ inventario ============
create table ajustes (
  id        bigint generated always as identity primary key,
  fecha     date not null default current_date,
  sku       integer not null references skus,
  cantidad  integer not null check (cantidad <> 0),
  motivo    text not null check (length(trim(motivo)) >= 5),
  creado_por uuid references auth.users
);

-- ============ acceso y auditoría ============
create table admins (email text primary key);   -- Facu y Vani

create table eventos (                           -- quién hizo qué, para cuando algo no cierra
  id      bigint generated always as identity primary key,
  en      timestamptz not null default now(),
  usuario uuid,
  tabla   text not null,
  accion  text not null,                         -- insert / update / delete
  antes   jsonb,
  despues jsonb
);
```

Un trigger genérico escribe en `eventos` en cada insert/update/delete de las tablas de
negocio. A esta escala ocupa nada y es lo que hoy falta cuando un número no cierra.

**Nada se borra.** Una venta que se cae pasa a `Cancelada`, un pago mal cargado se
compensa con otro. Los `delete` quedan cerrados por permisos salvo en `venta_items`
mientras la venta está en `Reservada` (para corregir un error de carga en el momento).

### 2.4 Vistas: lo que reemplaza a las fórmulas

Cada vista es la misma cuenta que hoy hacen los `SUMIFS`, pero agrupada por clave
foránea en vez de por columna entera, y sin celdas que se puedan pisar.

**Stock por SKU** — reemplaza `PRODUCTOS!K:Q`:

```sql
create view v_stock as
select s.sku,
  coalesce(pi.esperado, 0)      as esperado,
  coalesce(pi.recibido, 0)      as recibido,
  coalesce(vi.comprometido, 0)  as comprometido,
  coalesce(vi.entregado, 0)     as entregado,
  coalesce(a.ajustes, 0)        as ajustes,
  coalesce(pi.recibido, 0) - coalesce(vi.entregado, 0) + coalesce(a.ajustes, 0)  as fisico,
  coalesce(pi.esperado, 0) - coalesce(vi.entregado, 0)
    - coalesce(vi.comprometido, 0) + coalesce(a.ajustes, 0)                       as disponible
from skus s
left join (
  select i.sku,
    sum(case p.estado when 'Cancelado' then 0
                      when 'Recibido'  then i.cantidad_recibida   -- lo que no llegó deja de esperarse
                      else i.cantidad end) as esperado,
    sum(i.cantidad_recibida)                as recibido
  from pedido_items i join pedidos p on p.id = i.pedido_id
  group by i.sku
) pi on pi.sku = s.sku
left join (
  select sku,
    sum(cantidad) filter (where estado in ('Reservada','Señada','Pagada')) as comprometido,
    sum(cantidad) filter (where estado = 'Entregada')                      as entregado
  from venta_items group by sku
) vi on vi.sku = s.sku
left join (select sku, sum(cantidad) as ajustes from ajustes group by sku) a on a.sku = s.sku;
```

Las dos fórmulas de fondo no cambian: **Físico = Recibido − Entregado + Ajustes** y
**Disponible = Esperado − Entregado − Comprometido + Ajustes**. La separación entre
esperado y recibido, que permite vender la preventa, se mantiene.

**Costo por pedido** — reemplaza `PEDIDOS!E,I:L`:

```sql
create view v_pedidos as
select p.*,
  u.unidades,
  coalesce(p.costo_mercaderia,0) + coalesce(p.costo_envio,0) + coalesce(p.otros,0) as costo_total,
  (coalesce(p.costo_mercaderia,0) + coalesce(p.costo_envio,0) + coalesce(p.otros,0))
     / nullif(u.unidades, 0)                                                      as costo_unit_prom,
  coalesce(c.pagado, 0) as pagado,
  coalesce(p.costo_mercaderia,0) + coalesce(p.costo_envio,0) + coalesce(p.otros,0)
     - coalesce(c.pagado, 0)                                                      as saldo_a_pagar
from pedidos p
left join (select pedido_id, sum(cantidad) unidades from pedido_items group by 1) u on u.pedido_id = p.id
left join (select pedido_id, sum(monto) pagado from caja_movimientos
           where tipo = 'Egreso' group by 1) c on c.pedido_id = p.id;
```

**Costo unitario de un SKU** — lo que hoy se tipea a mano en `VENTAS!H`. Si el item del
pedido tiene costo propio (P-001, P-002) se usa ese; si no, el promedio del pedido
(que ya incluye el envío). Si el SKU vino en más de un pedido, promedio ponderado:

```sql
create view v_costo_sku as
select i.sku,
  sum(i.cantidad * coalesce(i.costo_unit, p.costo_unit_prom)) / sum(i.cantidad) as costo_unit
from pedido_items i join v_pedidos p on p.id = i.pedido_id
where p.estado <> 'Cancelado'
group by i.sku;
```

`registrar_venta` copia ese número a `venta_items.costo_unit` en el momento de vender.
Es una foto a propósito: si después llega la factura del envío y el promedio cambia, la
ganancia de las ventas viejas se puede recalcular con una función explícita
(`recalcular_costos(pedido_id)`), no cambia sola sin que nadie se entere.

**Ventas** — reemplaza `VENTAS!G,I,J,P,Q`:

```sql
create view v_venta_items as
select vi.*, vi.cantidad * vi.precio_unit as subtotal,
       vi.cantidad * vi.costo_unit        as costo_total,
       vi.cantidad * (vi.precio_unit - vi.costo_unit) as ganancia
from venta_items vi;

create view v_ventas as
select v.*,
  sum(i.subtotal) filter (where i.estado <> 'Cancelada') as total,
  coalesce((select sum(monto) from pagos where venta_id = v.id), 0) as cobrado,
  -- estado de la cabecera: el "más atrasado" de sus items no cancelados
  min(i.estado) filter (where i.estado <> 'Cancelada') as estado
from ventas v join v_venta_items i on i.venta_id = v.id
group by v.id;
```

(El orden del enum `Reservada < Señada < Pagada < Entregada < Cancelada` es lo que hace
que `min()` devuelva el más atrasado.)

**Saldo de cliente** — reemplaza `CLIENTES!E:G`:

```sql
create view v_saldo_cliente as
select c.id, c.nombre, c.telefono,
  coalesce(sum(v.total), 0)   as comprado,
  coalesce(sum(v.cobrado), 0) as pagado,
  coalesce(sum(v.total), 0) - coalesce(sum(v.cobrado), 0) as saldo
from clientes c left join v_ventas v on v.cliente_id = c.id
group by c.id;
```

Diferencia con hoy: `Comprado` deja afuera los items cancelados. En el libro, una venta
cancelada sigue sumando en el saldo del cliente.

**Caja** — reemplaza la sección CAJA del `TABLERO`:

```sql
create view v_caja as
select metodo,
  sum(monto) filter (where tipo = 'Ingreso') as ingresos,
  sum(monto) filter (where tipo = 'Egreso')  as egresos,
  sum(case tipo when 'Ingreso' then monto else -monto end) as saldo
from caja_movimientos group by rollup (metodo);   -- por método y total
```

Por método porque "lo que hay entre efectivo y banco" se puede contar contra la billetera
y contra el homebanking.

**Tablero** — `v_tablero`, una fila con todos los números del `TABLERO` actual (saldo de
caja, deuda con proveedores, facturado, costo de lo vendido, ganancia, cobrado, a
cobrar, unidades en camino/recibidas/físico/comprometido/disponible, valor a precio de
lista, reservadas sin señar, señadas, pagadas sin entregar), armada sobre las vistas de
arriba.

**Catálogo público** — lo único que puede leer la web sin loguearse. Devuelve
exactamente las columnas que hoy publica la hoja `WEB` del libro viejo, así
`lib/sheets.ts` no cambia su lógica:

```sql
create function catalogo_web()
returns table (sku integer, producto text, categoria text, precio numeric,
               disponible integer, estado_pub estado_pub, nuevo boolean, precio_antes numeric)
language sql stable security definer set search_path = public as $$
  select s.sku,
         m.nombre || coalesce(' (' || s.estampado || ')', '') || ' - Talle ' || s.talle,
         m.categoria, s.precio, greatest(st.disponible, 0), s.estado_pub, m.nuevo, s.precio_antes
  from skus s join modelos m on m.id = s.modelo_id join v_stock st on st.sku = s.sku
  where s.estado_pub <> 'Archivado';
$$;
grant execute on function catalogo_web() to anon;
```

Nunca expone costo, margen, clientes ni pagos. Se usa una función `security definer`
en vez de una vista abierta porque Supabase marca como riesgo las vistas que se saltean
RLS, y porque así el permiso es una sola línea que se puede auditar.

### 2.5 Restricciones: lo que hoy falla en silencio y acá se rechaza

| Caso | Hoy | Con la base |
|---|---|---|
| SKU que no existe | `SUMIFS` da 0, nadie se entera | FK: la carga falla con "el SKU 4123 no existe" |
| Fila corrida de modelo (shorts Argentina) | Los números quedan en el modelo de al lado | No hay filas posicionales: el stock se agrupa por `sku`, no por número de fila |
| Número tipeado sobre una fórmula (SKU 3004) | La web ofrece algo que no hay | Las vistas no se pueden escribir |
| Vender sin stock | `SKUs en negativo` lo avisa después, si alguien mira | Se rechaza al cargar (ver abajo) |
| Entregar algo que no llegó | No se controla | Se rechaza: físico no puede quedar negativo |
| Pago sin caja, o caja sin pago | Control "caja = pagos" dice REVISAR | Imposible: el pago genera su movimiento |
| Estado con o sin eñe ("Senada") | La fórmula de `Compromete` no lo cuenta | Enum: solo entran los cinco valores |
| Fecha guardada como número (P-005 tiene `46300`) | Se ve rara, ordena mal | Columna `date` |
| Dos filas del mismo `Venta_ID` con distinto cliente | Posible | Imposible: el cliente está en la cabecera |
| Descuento sin motivo | Posible | La RPC exige `motivo_descuento` si `precio_unit < precio` de lista |

**Cómo se garantiza "no vender sin stock".** Un trigger `constraint` diferido sobre
`venta_items`, `ajustes`, `pedido_items` y `pedidos`, que al cerrar la transacción
recalcula `v_stock` **solo de los SKU tocados** y aborta si alguno quedó con
`disponible < 0` o `fisico < 0`. Antes de calcular toma `select ... for update` sobre esas
filas de `skus`, así dos cargas simultáneas del mismo talle (Facu y Vani a la vez) se
ordenan en vez de vender las dos la última unidad. Es el equivalente al `LockService`
del Apps Script, pero por SKU y sin que la app tenga que acordarse.

Esto cubre también los casos indirectos: cancelar un pedido que ya tiene preventas
vendidas, o recibir menos unidades de las vendidas, se rechaza con el detalle de qué
ventas quedan sin mercadería. Para esos casos el camino es cancelar o reasignar esas
ventas primero (es lo que pasó con los rebotes de octubre).

**Encargues**: una venta de algo que no está en ningún pedido no entra. Primero se carga
el pedido (aunque sea `Encargado` y de una unidad) y después la venta. Es lo correcto:
si no, se promete algo que no se compró.

### 2.6 Las operaciones (RPC)

Todo lo que escribe pasa por una función SQL, que corre en una transacción y valida:

| Función | Hace |
|---|---|
| `registrar_venta(cliente, items[], estado, pago?)` | Crea o busca el cliente, la cabecera, los items con el costo del momento y, si viene, el pago (que genera su caja) |
| `registrar_pago(venta_id, monto, metodo, tipo, entregar bool)` | Seña, saldo o devolución; si `entregar`, pasa los items a `Entregada` |
| `cambiar_estado(venta_id, items[], estado)` | Entregar, cancelar, pasar de Reservada a Señada |
| `registrar_movimiento(tipo, categoria, monto, metodo, pedido?, nota)` | Gastos, pagos al proveedor, aportes y retiros |
| `crear_pedido(...)` / `recibir_pedido(pedido_id, recibidos[], costo_envio, otros)` | Alta y recepción |
| `ajustar_stock(sku, cantidad, motivo)` | Ajuste con motivo obligatorio |
| `alta_producto(modelo, talles[], precio, ...)` | Modelo + sus SKUs |

## 3. El panel `/admin`

### 3.1 Acceso

- **Supabase Auth con link mágico por mail** (o "Entrar con Google", que es un clic más
  cómodo en el celular; las dos opciones son gratis). Sin contraseñas que recordar.
- **Registro deshabilitado** en Supabase: nadie puede crearse una cuenta.
- **Lista blanca** en la tabla `admins` (Facu y Vani). Una función `es_admin()` mira el
  mail del token, y **todas** las tablas tienen RLS activado con una sola política:
  `es_admin()` para leer y escribir. Aunque alguien consiguiera una sesión, sin estar en
  la lista no ve ni una fila.
- En Next: el `proxy.ts` (en Next 16 así se llama lo que antes era `middleware`) redirige
  `/admin/*` al login si no hay sesión, y cada Server Action vuelve a chequear la sesión.
  El proxy es comodidad; la seguridad real está en RLS.
- Las acciones del panel corren **con la sesión del usuario**, no con la clave de
  servicio. La `service_role` key solo vive en el job de backups (GitHub Actions), nunca
  en Vercel.
- `/admin` lleva `noindex` y no entra al sitemap.

### 3.2 Pantallas mínimas

Todas pensadas primero para el celular: una columna, botones grandes, nada de tablas
anchas. Mismo estilo oscuro de la web.

**1. Tablero** (`/admin`) — lo que se mira al abrir:
- Saldo de caja (total, efectivo, banco), deuda con proveedores, a cobrar.
- Unidades: en camino, en casa, comprometidas, disponibles.
- **Alertas** arriba de todo, en vez de los controles de hoy: clientes con reservas sin
  seña hace más de N días (el caso Leo Uber), pedidos recibidos sin costo cargado,
  SKUs con disponible 0 que siguen marcados `Nuevo`.
- Lista de clientes con saldo, cada uno con su botón de WhatsApp.
- Accesos directos a las otras pantallas.

**2. Cargar venta** (`/admin/venta`) — la que más se usa:
1. Buscador de producto por nombre, equipo o SKU. Muestra foto chica, talle, precio y
   "disponible N / en casa N". Lo agotado no aparece.
2. Se agregan uno o varios items; el precio viene de lista y se puede cambiar, y si
   baja pide motivo (con la promo 2×$100.000 como opción rápida).
3. Cliente: buscador por nombre o teléfono, o "nuevo" con nombre y teléfono en la misma
   pantalla.
4. Qué pasó: **Entregada y pagada** / **Pagada, entrega después** / **Señada** /
   **Reservada sin plata**. Si hay plata: monto (sugiere el total) y método.
5. Confirmar → resumen con el `V-0042` y botón para mandarle el resumen por WhatsApp
   al cliente.

**3. Cargar pago o seña** (`/admin/pago`) — se entra por el cliente: muestra sus
ventas con saldo, se elige una, monto, método, tipo (seña/saldo) y una casilla
"entregado". También desde acá: **gasto / pago a proveedor / aporte** (formulario corto
con categoría, monto, método y, si corresponde, pedido).

**4. Recibir pedido** (`/admin/pedidos/P-003`) — lista los items del pedido agrupados
por modelo con la cantidad pedida; se tilda lo que llegó (por defecto todo) y se corrige
lo que vino de menos. Antes de confirmar pide el costo de envío y otros, porque sin eso
la ganancia es un invento. Al confirmar muestra qué ventas de preventa ya se pueden
entregar.

**5. Ajustar stock** (`/admin/ajuste`) — SKU, más o menos N, motivo (lista: "conteo",
"falla", "regalo", "devolución", "otro" + texto). Muestra el stock antes y después.

**6. Productos** (`/admin/productos`) — necesaria para dejar el libro viejo: alta de un
modelo con sus talles, precio, `Nuevo`, `Precio Antes` y estado de publicación. Es lo
que hoy se hace escribiendo filas en `STOCK`. Ojo con la regla de `rosariofkits-negocio`:
`Precio Antes` nunca es un número inventado, y si se saca `Nuevo` a un "Lanzamiento",
sacarle también el `Precio Antes`. La pantalla lo avisa.

Fuera del mínimo, para después: listado de ventas con filtros, ficha de cliente, alta de
pedidos desde el panel (al principio se pueden crear con el script de migración).

## 4. La web pública: de CSV a Supabase sin cortar

Hoy: `hoja WEB → CSV publicado → lib/sheets.ts (parseCSV) → getCatalogo()`, con ISR de
60 segundos.

El cambio se hace **solo en la fuente**, no en lo que se arma con ella:

1. `lib/sheets.ts` se parte en dos: `leerFilasCSV()` (lo de hoy) y `leerFilasDB()`, que
   llama a `catalogo_web()` por la API REST de Supabase con la clave `anon`. Las dos
   devuelven **las mismas filas** (`sku, producto, categoria, precio, disponible,
   estado_pub, nuevo, precio_antes`), así todo lo de abajo —agrupar por modelo,
   `clasificar()`, `equipoDe()`, fotos, carrito, `/api/stock`— no se toca.
2. Una variable `CATALOGO_FUENTE=sheets|supabase` elige cuál. Si es `supabase` y la base
   no contesta o devuelve error, **cae al CSV** y deja un `console.error`. Mientras el
   libro viejo siga publicado, el sitio no se puede quedar sin catálogo.
3. Se mantiene el ISR de 60 s: ninguna visita espera a la base, y si la base está caída
   en el momento de revalidar, Next sigue sirviendo la última página buena.
4. Además, cada Server Action del panel que cambia stock o precios llama a
   `updateTag('catalogo')`: la venta cargada desde el celular se ve en la web al
   instante, no a los 7 minutos de hoy.
5. Verificación antes de prender: un script compara fila por fila la salida de las dos
   fuentes (después de migrar) y tiene que dar cero diferencias. Primero se prende en un
   **deploy de preview** de Vercel, después en producción.
6. Para volver atrás: cambiar la variable a `sheets` y redeployar. Un minuto.

`/preventa` sigue con su JSON por ahora. Su `SHEET_PREVENTA_CSV_URL` (los "quedan N")
se reemplaza en una etapa posterior por `catalogo_web()` filtrando `estado_pub =
'Preventa'`, con el estampado como parte de la unidad, que ya está en `skus`.

## 5. Migración desde los dos libros

### 5.1 Qué sale de cada libro

| Dato | Fuente | Por qué |
|---|---|---|
| Modelos, SKUs, talles, estampados | `Libro_RosarioFkits!PRODUCTOS` | Ya tiene modelo y talle separados |
| Precio, `Nuevo`, `Precio Antes` | `Stock_RosarioFkits!STOCK` | Es el que se mantiene al día para la web |
| Pedidos e items con costo | Libro nuevo | Solo existen ahí |
| Clientes, ventas, pagos, caja, ajustes | Libro nuevo | Solo existen ahí |
| Ventas cargadas **solo** en el viejo | `Stock_RosarioFkits!VENTAS` | Las que se cargaron ahí después de la migración del 22-09 y no pasaron al nuevo |

### 5.2 Cómo

Un script Python, `herramientas/migrar_erp.py`, que reusa la cuenta de servicio del MCP
de Sheets para leer y escribe en Supabase. Corre en tres modos:

1. **`--revisar`** — lee los dos libros, no escribe nada, y genera un informe de
   inconsistencias que Facu resuelve **en los libros** antes de seguir:
   - SKUs en un libro y no en el otro.
   - `Disponible` distinto entre el viejo y el nuevo, por SKU (acá van a aparecer el
     3004 y los shorts Argentina).
   - Ventas del viejo que no están en el nuevo (por fecha + SKU + monto).
   - Nombres de modelo que difieren entre talles del mismo modelo.
   - Un mismo `Venta_ID` con cliente o fecha distintos entre filas.
   - Pagos cuyo `Cliente_ID` no coincide con el de su venta.
   - Movimientos de caja `Venta` sin `PG-` en `Ref`, egresos a proveedor sin `P-`.
   - Fechas guardadas como número (P-005: `46300` = 05/10/2026) o como texto.
   - Estados escritos sin eñe o con espacios.
2. **`--ensayo`** — carga todo en un proyecto Supabase de prueba (o en un esquema
   `ensayo`) y compara el `TABLERO` de la base contra el del libro: saldo de caja,
   facturado, ganancia, a cobrar, físico, disponible. Tienen que dar igual (salvo las
   diferencias explicadas por el informe, como los cancelados que hoy suman en el saldo
   de cliente). Se repite hasta que cierre.
3. **`--final`** — lo mismo contra producción, y deja las secuencias (`venta_seq`,
   `pago_seq`...) en el máximo migrado para que la próxima venta sea `V-00xx + 1`.

### 5.3 El corte

1. Elegir una noche sin ventas en curso.
2. **Congelar los libros**: proteger todas las hojas (Datos → Proteger hojas y rangos),
   y cambiar el Apps Script del celular para que muestre "ya no se usa, entrá a
   /admin". Desde acá no se carga más nada en Sheets.
3. `migrar_erp.py --revisar` tiene que salir limpio; `--final`.
4. Comparar el tablero; comparar `catalogo_web()` contra el CSV.
5. `CATALOGO_FUENTE=supabase` en Vercel → redeploy.
6. A la mañana, cargar la primera venta real desde `/admin` y verla en la web.

Los libros **no se borran**: quedan congelados como histórico. El CSV publicado del libro
viejo sigue vivo como red de seguridad de la web durante un mes; después se despublica.

### 5.4 Backups nocturnos

El plan gratis de Supabase no tiene backups descargables ni restauración a un punto en
el tiempo. Se arma afuera, gratis:

- **GitHub Actions**, todas las noches a las 4 AM (hora de Argentina): `pg_dump` de la
  base completa (esquema + datos) comprimido, más un CSV por tabla.
- Se guarda **commiteado en un repo privado aparte** (`rosariofkits-backups`), uno por
  día. A esta escala son decenas de KB por noche; un año entero entra de sobra en el
  límite de GitHub, y la historia de git es la historia de los backups. Se pueden podar
  a uno por semana después de 30 días.
- La cadena de conexión va como *secret* del repo, nunca en el código.
- El job falla en rojo si el dump sale vacío o mide menos que el anterior por más de un
  20%, y GitHub manda mail.
- **Restaurar se prueba una vez** en la etapa 2, contra un proyecto vacío. Un backup que
  nunca se restauró no es un backup.

(No se usa Drive porque la Drive API está deshabilitada en el proyecto de la cuenta de
servicio; se podría habilitar, pero GitHub es más simple y ya está.)

### 5.5 Exportación a Sheets para consulta

El mismo job nocturno, después del backup, escribe un libro nuevo **solo de lectura**,
`ERP_RosarioFkits_consulta`, con una hoja por vista: `TABLERO`, `STOCK`, `VENTAS`,
`CLIENTES`, `PAGOS`, `CAJA`, `PEDIDOS`. Valores, no fórmulas (`RAW`, así no aplica la
trampa del `;` del locale), y en la fila 1 "Actualizado: <fecha>. No editar: se pisa
todas las noches". Sirve para mirar desde la compu, filtrar o armar una tabla dinámica,
y como tercer respaldo. Usa la cuenta de servicio que ya existe; el libro se comparte
con Facu como lector.

## 6. Riesgos del plan gratis

Los límites son los publicados a hoy; **confirmarlos en la página de precios de
Supabase al crear el proyecto**, porque cambian.

| Riesgo | Qué pasa | Mitigación |
|---|---|---|
| **Pausa por inactividad** (~7 días sin actividad) | La base se apaga; hay que reactivarla a mano desde el panel | El job nocturno de backup se conecta todas las noches y además hace un pedido a la API REST (no está documentado cuál de las dos cuenta como actividad, así que van las dos), y la web consulta cada vez que revalida. Además la web cae al CSV, y el ISR sigue sirviendo la última página |
| **Sin backups** | Un error borra datos sin vuelta | Backups nocturnos propios (5.4) y auditoría en `eventos` |
| Base de 500 MB | — | Hoy todo el negocio son unos cientos de filas: menos de 5 MB. No es un riesgo real por años |
| Tráfico (egress) ~5 GB/mes | — | La web pide el catálogo cada 60 s como mucho, unos KB. No hay fotos en Supabase: siguen en `public/fotos` |
| Dos proyectos gratis por cuenta | Si se usa uno para ensayo, no queda lugar | Ensayar en un esquema aparte, o borrar el de ensayo después del corte |
| Sin SLA ni soporte | Una caída de Supabase deja el panel sin andar | La web pública sigue (fallback CSV + ISR). Para cargar ventas en la caída: anotar y cargar después. Si algún día molesta, el plan Pro sale ~25 USD/mes |
| Dependencia de un proveedor | — | Es Postgres estándar: el `pg_dump` se levanta en cualquier lado (Neon, Railway, un Postgres propio) |
| La clave `anon` es pública | Cualquiera puede llamar a la API | RLS en todas las tablas sin política para `anon`; lo único ejecutable es `catalogo_web()`, que devuelve lo mismo que ya se ve en la web |
| Facu y Vani pierden el acceso al mail | No entran al panel | Dos admins; la cuenta de Supabase con 2FA y mail de recuperación |

Un riesgo que **no** es del plan gratis pero es el más probable: **cargar mal algo en la
base y no tener cómo corregirlo sin SQL**. Por eso las RPC de "corregir" (`cambiar_estado`,
devolución, ajuste con motivo) vienen en el mínimo, y por eso existe `eventos`.

## 7. Orden de implementación

Etapas chicas, cada una se puede probar y frenar sin dejar nada roto. Las primeras tres
no cambian nada de lo que ve el cliente ni de cómo carga Facu.

| # | Etapa | Termina cuando | Toca producción |
|---|---|---|---|
| 0 | **Aprobar este documento.** Facu crea la cuenta de Supabase (con su mail, 2FA) y el proyecto en São Paulo | Hay URL y claves | No |
| 1 | Esquema, vistas, triggers y RPC como migraciones SQL en `supabase/migrations/` del repo. Tests en SQL de las reglas: vender sin stock falla, pago sin venta falla, dos ventas simultáneas de la última unidad → una falla | Los tests pasan | No |
| 2 | Backups nocturnos + export a Sheets. **Probar restaurar** | Hay un backup de anoche y se restauró en limpio | No |
| 3 | `migrar_erp.py --revisar`. Facu limpia los libros con el informe. `--ensayo` hasta que el tablero cierre | Tablero de la base = tablero del libro | No |
| 4 | Web: `leerFilasDB()` + `CATALOGO_FUENTE` + fallback al CSV. Probar en preview con datos del ensayo | Comparación fila por fila da cero diferencias | Solo código, con la fuente en `sheets` |
| 5 | Auth + lista blanca + `/admin` con el **tablero de solo lectura** | Facu y Vani entran desde el celular; un tercer mail no | No (la base todavía es de ensayo) |
| 6 | **Cargar venta** y **cargar pago / gasto** | Se cargan contra el ensayo y el tablero da lo esperado | No |
| 7 | **Recibir pedido**, **ajustar stock**, **productos** | Se puede vivir sin abrir los libros | No |
| 8 | **El corte** (5.3) | Primera venta real desde `/admin`, vista en la web | **Sí** |
| 9 | Un mes con el CSV viejo como respaldo. Después: despublicarlo, sacar el fallback, archivar el Apps Script | — | Sí |
| 10 | Después, en orden de valor: `/preventa` leyendo la base, listado de ventas y ficha de cliente, alta de pedidos desde el panel, y el checkout del carrito escribiendo ventas `Reservada` directo en la base | — | Sí |

Entre la etapa 3 y el corte, **se sigue cargando en los libros como hoy**. Cada ensayo
vuelve a leer de cero, así que no hay doble carga.

Lo que se descarta con esto: instalar el `apps-script/libro-nuevo/` y escribirle el
`Index.html` que le falta. El panel de la etapa 6 hace lo mismo y más.

## 8. Lo que necesito que Facu decida

1. **¿Va Supabase + `/admin` en la misma web?** (la propuesta). La alternativa sería un
   panel aparte, pero duplica deploy y estilos sin ganar nada.
2. **Login**: ¿link mágico al mail, o "Entrar con Google"?
3. **¿Vani entra como admin con los mismos permisos?** El diseño asume que sí; si
   tiene que ver ventas pero no la caja, es un rol más y una política más.
4. **Métodos de pago**: ¿Transferencia, Efectivo y Mercado Pago alcanzan? ¿Hace falta
   distinguir cuentas (la tuya, la de Vani)?
5. **¿El panel debe dejar vender sin stock "por encargue"** sin cargar antes el pedido?
   El diseño dice que no (primero el pedido); es la regla que evita prometer lo que no
   se compró.
6. **Fecha del corte**: tiene sentido hacerlo **antes de que llegue el pedido de China
   en diciembre**, para recibir esas 189 unidades ya en el sistema nuevo.
