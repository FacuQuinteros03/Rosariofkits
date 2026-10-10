# ERP de Rosario F Kits — plan de implementación

> Acompaña a [`erp-diseno.md`](erp-diseno.md), que dice **qué** se construye y por qué.
> Este dice **en qué orden, quién hace cada cosa y cómo se sabe que está terminado**.
> Fecha: 2026-10-10. Nada empieza hasta que Facu apruebe los dos documentos.

## La regla que ordena todo

**Producción no se toca hasta el corte.** La web en `rosariofkits.vercel.app`, el CSV de
`Stock_RosarioFkits` y el Apps Script siguen exactamente como hoy, y las ventas se siguen
cargando ahí. El ERP se construye al costado:

| | Producción (no se toca) | ERP (en paralelo) |
|---|---|---|
| Código | rama `main` | rama `erp`, nunca mergeada hasta el corte |
| Deploy | `rosariofkits.vercel.app` | deploy de preview de Vercel de la rama `erp` |
| Datos | los dos libros de Sheets | proyecto de Supabase nuevo, recargado desde los libros |
| Variables de Vercel | las de hoy | alcance **Preview** solamente |
| Carga de ventas | Apps Script | `/admin` del preview, solo para probar (se descarta) |

El corte (etapa 9) es el único paso que cambia algo de lo de la izquierda, y se deshace
con una variable de entorno.

## Quién hace qué

Hay cosas que Claude no puede ni debe hacer: crear cuentas, aceptar términos, manejar
claves de producción. Esas quedan marcadas con **👤 Facu**. Son pocas y cortas.

| 👤 Facu | Claude |
|---|---|
| Crear la cuenta y el proyecto de Supabase | Escribir el SQL, los tests, los scripts y las pantallas |
| Pegar las claves en Vercel (alcance Preview) y en `.env.local` | Correr los tests contra una base local |
| Crear el repo privado de backups y sus *secrets* | Escribir el workflow de backups |
| Probar las pantallas en el celular y decir qué falta | Arreglar lo que salga |
| Corregir en el libro lo que marque el informe de migración | Generar el informe |
| Aprobar el corte y hacer los clics del corte | Preparar el corte paso a paso |

## Antes de empezar: las decisiones pendientes

Son las de la sección 9 del diseño. Para no frenar, el plan arranca con la opción
recomendada; cualquiera se puede cambiar después sin rehacer nada grande.

| Decisión | Arranque recomendado | Cuándo duele cambiarla |
|---|---|---|
| Supabase + `/admin` en la misma web | Sí | Antes de la etapa 1 |
| Login | "Entrar con Google" (un toque en el celular) | Barato hasta la etapa 5 |
| Vani | Admin con los mismos permisos | Barato en cualquier momento |
| Métodos de pago | Transferencia, Efectivo, Mercado Pago | Barato (es un enum) |
| Vender por encargue sin pedido | No: primero se carga el pedido | Antes de la etapa 6 |
| Tabla `consultas` de encargues | Sí, chica, en la etapa 5b | Barato |
| Fecha del corte | Objetivo **fines de noviembre**, antes del pedido de China | La regla manda: si no está probado, no hay corte |

## Calendario

Tomado como referencia, no como compromiso. El ritmo real lo pone cuánto tiempo tiene
Facu para probar.

```
oct  13-19   etapas 0, 1, 2   base, tests, backups           (sin pantallas todavía)
oct  20-26   etapa 3          migración en ensayo, informe   ← Facu corrige el libro
oct 27-nov 2 etapas 4, 5, 5b  web en preview, login, tablero, métricas
nov   3-9    etapa 6          cargar venta, pago, gasto       ← Facu prueba en el celular
nov  10-16   etapa 7          recibir pedido, ajustes, productos
nov  17-23   etapa 8          semana de prueba completa
nov  24-30   etapa 9          EL CORTE (si la checklist está completa)
dic          llega China      se recibe ya en el ERP
```

---

## Fase A — en paralelo (no toca producción)

### Etapa 0 — Arranque

**Objetivo:** que exista dónde trabajar.

- [ ] 👤 Facu aprueba `erp-diseno.md` y este plan (o pide cambios).
- [ ] Claude crea la rama `erp` desde `main` y mueve ahí los dos documentos. Hoy están
      commiteados en el `main` local sin push; se sacan de `main` para que el primer
      push de `main` no los publique por accidente.
- [ ] 👤 Facu crea la cuenta de Supabase con su mail, activa **2FA**, y crea el proyecto
      `rosariofkits-erp` en **South America (São Paulo)**, plan Free. Guarda la
      contraseña de la base en su gestor de contraseñas.
- [ ] 👤 Facu deshabilita el registro abierto (Authentication → Sign In / Providers →
      "Allow new users to sign up": off) y, si se elige Google, activa el proveedor.
- [ ] 👤 Facu copia en `rosariofkits-web/.env.local` (que está en `.gitignore`):
      `SUPABASE_URL`, `SUPABASE_ANON_KEY`, y la cadena de conexión de la base para los
      scripts (`SUPABASE_DB_URL`). La `service_role` key **no** va a Vercel nunca.
- [ ] 👤 Facu carga en Vercel las mismas dos primeras variables con alcance
      **Preview**, más `CATALOGO_FUENTE=supabase`, también solo Preview.
- [ ] Claude verifica que Docker Desktop arranca: los tests de la etapa 1 corren contra
      una base local (`npx supabase start`), no contra el proyecto real.

**Terminada cuando:** la rama `erp` existe, `npx supabase status` muestra la base local, y
desde la compu se puede conectar al proyecto real.
**Toca producción:** no.

### Etapa 1 — La base de datos

**Objetivo:** el esquema completo del diseño (sección 2), con sus reglas probadas.

Archivos, en la rama `erp`:

```
supabase/config.toml
supabase/migrations/
  0001_catalogo.sql        equipos, modelos, skus, enums
  0002_compras.sql         proveedores, pedidos, pedido_items
  0003_ventas.sql          clientes, ventas, venta_items
  0004_plata.sql           pagos, caja_movimientos, trigger pago → caja
  0005_inventario.sql      ajustes, stock_diario
  0006_vistas.sql          v_stock, v_pedidos, v_costo_item, v_costo_sku, v_ventas, v_saldo_cliente, v_caja, v_tablero
  0007_reglas.sql          trigger diferido de stock (disponible y físico ≥ 0, con lock por SKU)
  0008_operaciones.sql     registrar_venta, registrar_pago, cambiar_estado, registrar_movimiento,
                           crear_pedido, recibir_pedido, ajustar_stock, alta_producto
  0009_acceso.sql          admins, es_admin(), RLS en todas las tablas, grants
  0010_auditoria.sql       eventos + trigger genérico
  0011_catalogo_web.sql    catalogo_web() para anon
  0012_metricas.sql        v_hechos_venta y las vistas de la sección 4.2
supabase/tests/            pgTAP, uno por regla
```

Tests mínimos (cada uno es "esto tiene que fallar" o "esto tiene que dar X"):

- [ ] Venta de un SKU inexistente → error.
- [ ] Vender la última unidad dos veces en transacciones simultáneas → una falla.
- [ ] Entregar algo que todavía no llegó (físico < 0) → error.
- [ ] Cancelar un pedido con preventas vendidas → error con el detalle.
- [ ] Un pago crea exactamente un movimiento de caja; no se puede crear caja `Venta` sin pago.
- [ ] Precio bajo lista sin motivo → error.
- [ ] `v_stock` reproduce a mano un caso de preventa: vendido antes de llegar → disponible
      baja, físico no.
- [ ] Costo con importación prorrateada: un pedido tipo P-005 da $27.666,67 / $24.666,67.
- [ ] Un usuario logueado que no está en `admins` no ve ninguna fila.
- [ ] `anon` puede ejecutar `catalogo_web()` y nada más; la función no devuelve costos.

**Terminada cuando:** `npx supabase test db` pasa en verde en local, y las migraciones
se aplican limpias al proyecto real (`npx supabase db push`).
**Toca producción:** no.

### Etapa 2 — Backups y libro de consulta

**Objetivo:** que antes de que haya un dato que importe, ya haya backup.

- [ ] 👤 Facu crea un repo **privado** `rosariofkits-backups` en GitHub y le carga el
      *secret* `SUPABASE_DB_URL`. (No hay `gh` instalado en la compu; se hace desde la web.)
- [ ] Claude escribe `.github/workflows/backup.yml` en ese repo: todas las noches a las
      4 AM de Argentina (07:00 UTC):
      1. inserta la foto del día en `stock_diario`;
      2. hace un pedido a la API REST (para que el proyecto no se pause);
      3. `pg_dump` comprimido + un CSV por tabla, commit al repo;
      4. falla en rojo si el dump sale vacío o cae más de 20 % contra el anterior.
- [ ] Script `exportar_consulta.py` en el mismo workflow: escribe las vistas en un libro
      **nuevo** `ERP_RosarioFkits_consulta`, solo valores. 👤 Facu crea ese libro vacío
      y lo comparte como editor con la cuenta de servicio (la Drive API está
      deshabilitada y no se puede crear por API). Ese *secret* también va al repo.
- [ ] **Probar restaurar**: bajar el dump de anoche y levantarlo en la base local.

**Terminada cuando:** hay dos noches seguidas de backup en verde y uno se restauró.
**Toca producción:** no. El libro de consulta es nuevo; los dos libros vivos ni se abren.

### Etapa 3 — Migración en ensayo

**Objetivo:** que la base tenga los datos reales de ayer, y que den igual que el libro.

- [ ] `herramientas/migrar_erp.py` con `--revisar`, `--ensayo` y `--volver` (el `--final`
      es el mismo `--ensayo` con otra confirmación). Lee los dos libros con la cuenta de
      servicio del MCP, **solo lectura**: el script usa el scope
      `spreadsheets.readonly`, así ni por error puede escribir.
- [ ] Para `linea` y `equipo` reusa la lógica de `clasificar()` y `equipoDe()`: se porta a
      Python con un test que compara contra la salida de la web para todos los modelos.
- [ ] Primer `--revisar` → informe en `docs/migracion/informe-AAAA-MM-DD.md` (en la rama
      `erp`). 👤 Facu corrige en el libro lo que corresponda, en su carga normal.
- [ ] `--ensayo` → compara tablero de la base contra `TABLERO` del libro, y stock por SKU
      contra el CSV de la web. Las diferencias explicadas (cancelados en saldo de
      cliente, ventas del viejo sin pago) quedan listadas en el informe, no escondidas.
- [ ] Programar `--ensayo` todas las noches (en el mismo workflow de backups, después del
      dump), así el preview siempre tiene los datos de ayer.

**Terminada cuando:** `--ensayo` cierra sin diferencias sin explicar.
**Toca producción:** no. Lee los libros; no escribe.

### Etapa 4 — La web leyendo Supabase, en el preview

**Objetivo:** el catálogo público idéntico, con la otra fuente.

- [ ] `npm install @supabase/supabase-js @supabase/ssr` (en la rama `erp`).
- [ ] `lib/sheets.ts`: lo que hoy hace `fetch(CSV_URL)` + `parseCSV()` pasa a una función
      `leerFilas()` que devuelve `[encabezado, ...filas]` desde el CSV o desde
      `catalogo_web()`, según `CATALOGO_FUENTE`. El resto de `getCatalogo()` (agrupar,
      clasificar, fotos, orden) no cambia una línea.
- [ ] Sin `CATALOGO_FUENTE`, es `sheets`. Si es `supabase` y falla, cae al CSV.
- [ ] Tag `catalogo` en el fetch, para que el panel lo invalide con `updateTag`.
- [ ] Script `herramientas/comparar_catalogo.py`: baja `/api/stock` del preview y de
      producción y los compara SKU por SKU.
- [ ] `npm run build` limpio.

**Terminada cuando:** la comparación da cero diferencias y el preview se ve igual que
producción, en el celular y en la compu.
**Toca producción:** no. Hay commits nuevos solo en `erp`.

### Etapa 5 — Login y tablero

**Objetivo:** entrar al panel desde el celular y ver los números.

- [ ] `proxy.ts` (lo que en Next 16 reemplaza a `middleware`): `/admin/*` sin sesión →
      `/admin/entrar`. Leer antes `node_modules/next/dist/docs/` como pide `AGENTS.md`.
- [ ] Login con Google (o link mágico), callback, salir.
- [ ] 👤 Facu carga su mail y el de Vani en `admins`.
- [ ] `/admin`: tablero de solo lectura (`v_tablero`, `v_caja`, saldos de clientes,
      alertas). Estilo oscuro de la web, una columna en el celular.
- [ ] `/admin` con `noindex`, fuera del sitemap.

**Terminada cuando:** Facu y Vani entran desde sus celulares y ven el tablero con datos de
ayer; un tercer mail queda afuera.
**Toca producción:** no.

### Etapa 5b — Métricas

**Objetivo:** `/admin/metricas`, la razón principal del ERP, lo antes posible.

- [ ] Primera tanda: **Ventas** (por modelo, equipo, línea, talle, proveedor), **Pedidos**
      (margen real), **Caja** (posición neta, flujo mensual).
- [ ] Segunda tanda: **Talles** (con la curva sugerida y botón copiar), **Rotación y
      stock quieto**, **Clientes**, **Promos y rebajas**, **Preventa**.
- [ ] Filtros en la URL, fila de números arriba, barras en CSS, asterisco en los datos
      estimados.
- [ ] Opcional (decisión pendiente): tabla `consultas` y el botón de encargue del preview
      registrando el SKU. En producción no se activa hasta el corte.

**Terminada cuando:** Facu mira las métricas de agosto a hoy y los números le cierran con
lo que sabe del negocio. Si algo no le cierra, casi siempre es un dato mal migrado: se
vuelve a la etapa 3 con ese caso.
**Toca producción:** no.

### Etapa 6 — Cargar venta, pago y gasto

**Objetivo:** las dos pantallas que más se van a usar.

- [ ] `/admin/venta`: buscador, varios items, precio con motivo si baja, cliente nuevo o
      existente, estado, pago opcional → `registrar_venta`. Resumen con `V-00xx` y botón
      de WhatsApp.
- [ ] `/admin/pago`: por cliente, ventas con saldo, seña o saldo, "entregado" →
      `registrar_pago`. Y gasto / pago a proveedor / aporte → `registrar_movimiento`.
- [ ] Cambiar estado desde el resumen de una venta (entregar, cancelar).
- [ ] Los errores de la base (sin stock, SKU inválido) se muestran en castellano, no como
      excepción.
- [ ] 👤 Facu carga en el preview las ventas reales de un par de días **además** de en el
      Apps Script, y compara. Lo que carga en el preview se pisa con el ensayo de esa
      noche: es solo para probar.

**Terminada cuando:** cargar una venta con seña desde el celular lleva menos de un minuto y
el tablero da lo esperado.
**Toca producción:** no.

### Etapa 7 — Recibir pedido, ajustes y productos

- [ ] `/admin/pedidos/[id]`: tildar lo que llegó, costo de envío obligatorio, y al
      confirmar la lista de preventas que ya se pueden entregar.
- [ ] `/admin/ajuste`: SKU, cantidad, motivo.
- [ ] `/admin/productos`: alta de modelo con talles, precio, `Nuevo`, `Precio Antes`,
      estado de publicación, con los avisos de las reglas de `rosariofkits-negocio`
      (nunca un `Precio Antes` inventado; sacar `Nuevo` a un "Lanzamiento" también saca
      `Precio Antes`).
- [ ] Alta de pedido simple (proveedor, items, costo), para no depender del script.

**Terminada cuando:** Facu puede hacer en el preview todo lo que hoy hace en los libros.
**Toca producción:** no.

### Etapa 8 — Prueba completa

**Objetivo:** cumplir la checklist del corte (diseño, sección 6.3).

- [ ] `--ensayo` siete noches seguidas sin diferencias sin explicar.
- [ ] Facu ensaya en el preview, sobre los datos reales de ayer, una de cada: venta
      entregada, venta con seña, saldo, reserva cancelada, gasto, recepción de pedido,
      ajuste, alta de producto. El tablero y las métricas dan lo esperado.
- [ ] Backups de todas esas noches en verde; una restauración más.
- [ ] Ensayo del corte en seco: Claude escribe `docs/erp-corte.md` con cada clic y cada
      comando, incluida la vuelta atrás, y se recorre sin ejecutarlo.
- [ ] 👤 Facu aprueba el corte y elige la noche.

**Toca producción:** no.

---

## Fase B — el corte

### Etapa 9 — El corte

El único paso que toca producción. Sigue `docs/erp-corte.md` al pie de la letra; en
resumen:

1. 👤 Proteger las hojas de los dos libros y poner el Apps Script en "ya no se usa".
2. `migrar_erp.py --revisar` limpio y `--final`.
3. Comparar tablero y catálogo.
4. 👤 Cargar en Vercel, alcance **Production**: claves de Supabase y
   `CATALOGO_FUENTE=supabase`.
5. Mergear `erp` a `main` y push: deploy de producción.
6. Revisar el sitio en vivo; a la mañana, primera venta real desde `/admin`.

**Vuelta atrás:** `CATALOGO_FUENTE=sheets` en Production + redeploy; desproteger las
hojas; reponer el Apps Script desde `apps-script/`; `migrar_erp.py --volver` lista lo
cargado en el ERP desde el corte para pasarlo al libro.

### Etapa 10 — Un mes de respaldo

- El CSV publicado y el fallback siguen vivos un mes.
- Al mes: despublicar el CSV, sacar el fallback del código, archivar el Apps Script,
  actualizar las skills `rosariofkits-sheet`, `-facturacion`, `-web` y `-apps-script`
  para que digan que la fuente es la base.

### Etapa 11 — Lo que sigue

En orden de valor, cada una en su rama y con su preview: `/preventa` leyendo la base,
listado de ventas y ficha de cliente, y el checkout del carrito escribiendo ventas
`Reservada` directo en la base.

---

## Riesgos del plan (no del sistema)

| Riesgo | Señal temprana | Qué se hace |
|---|---|---|
| Facu no tiene tiempo de probar | Las etapas 6 a 8 se estiran | Se corre el corte; no se saltea la prueba. China se recibe en Sheets y se migra igual |
| La migración no cierra | `--ensayo` con diferencias que no se explican | Cada diferencia es un caso; se mira en el libro. No se avanza a la etapa 4 con el tablero sin cerrar |
| La rama `erp` se aleja de `main` | Cambios en la web mientras tanto (precios, fotos, componentes) | Mergear `main` → `erp` cada semana. Nunca al revés hasta el corte |
| Un push a `main` con algo del ERP | — | El ERP vive solo en `erp`. Antes de cada push a `main`, mirar `git log origin/main..main`: no puede haber ningún commit del ERP |
| Supabase pausa el proyecto en el medio | Mail de aviso de Supabase | El workflow nocturno lo mantiene activo; si pasa igual, se reactiva desde el panel |
| Se cuela una clave en el repo | — | `.env.local` en `.gitignore`; la `service_role` solo en los *secrets* de GitHub |

## Qué necesito para arrancar la etapa 0

1. Que Facu apruebe `erp-diseno.md` y este plan, o diga qué cambiar.
2. Las respuestas de "Antes de empezar", o el OK a los valores recomendados.
3. Los cinco clics de Facu de la etapa 0 (cuenta, proyecto, registro cerrado, claves en
   `.env.local` y en Vercel con alcance Preview).
