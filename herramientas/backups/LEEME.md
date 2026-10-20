# Backups nocturnos del ERP

Estos archivos van en el repo **privado** `rosariofkits-backup` de GitHub (no en la web):

| Archivo de acá | Dónde va en el repo de backups |
|---|---|
| `backup.yml` | `.github/workflows/backup.yml` |
| `respaldar.sh` | `respaldar.sh` (en la raíz) |
| `exportar_consulta.py` | `exportar_consulta.py` (en la raíz) |
| `puente.yml` | `.github/workflows/puente.yml` |
| `puente_ventas.py` | `puente_ventas.py` (en la raíz) |

Todas las noches a las 4 AM (hora de Argentina):

1. guarda la foto del stock del día en `stock_diario` (los "días agotado" de las métricas);
2. le pega a la API, para que Supabase no pause el proyecto por inactividad;
3. hace el backup de la base y lo commitea en `respaldos/AAAA-MM-DD/` (`base.sql.gz` y una
   CSV por tabla). Diarios por 30 días, después uno por semana;
4. actualiza el libro `ERP_RosarioFkits_consulta` (STOCK, RESUMEN y una hoja por mes).

Si algo falla, GitHub manda un mail y el run queda en rojo en la pestaña **Actions**.

## Secrets del repo

Están cargados en **Settings → Environments → `SUPABASE_DB_URL`** (por eso el workflow
dice `environment: SUPABASE_DB_URL`):

| Nombre | Valor |
|---|---|
| `SUPABASE_DB_URL` | la cadena del Session pooler, con la contraseña (la misma del `.env.local`) |
| `SUPABASE_URL` | `https://pllefavvclhtkgbnmvuo.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | la clave `sb_publishable_...` |
| `GOOGLE_SA_JSON` | el contenido entero de `RosarioFkits\mcp-sheets\credenciales.json` |
| `CONSULTA_ID` | el id del libro `ERP_RosarioFkits_consulta` (lo que va entre `/d/` y `/edit` en su URL) |

## Puente: las ventas del panel a la web (hasta el corte)

Desde el 17/10/2026 las ventas se cargan en `/admin`, pero la web de producción sigue
descontando el stock del libro viejo `Stock_RosarioFkits`. `puente.yml` corre
`puente_ventas.py` cada 20 minutos, de 9 a 1 (hora de Argentina), y copia a
`VENTAS` cada ítem de las ventas cargadas desde el panel (`ventas.creado_por` no nulo).

- Cada fila copiada lleva en `VENTAS!M` (encabezado `ERP`) la clave `V-0033 #57`: venta e
  ítem del ERP. Así no duplica, y si en el panel se cancela un ítem o cambia el precio,
  el cobro o el cliente, corrige esa fila (una cancelada queda con cantidad 0). Nunca borra.
- Si `STOCK!H` (Vendido) del SKU está tipeado, le suma la diferencia, como el Apps Script.
- El run queda en rojo (y llega mail) si el SKU no existe en el libro viejo o si su
  `Disponible` está tipeado: en esos casos la web no puede descontar la venta sola.
- Una fila cargada a mano en el libro se marca como copia con
  `python puente_ventas.py --vincular V-00041=V-0033#57`. `--seco` muestra sin escribir.
- **Ya no se cargan ventas con el Apps Script del celular:** el ERP no las vería.
- `migrar_erp.py` se niega a recargar la base real si hay ventas del panel (las borraría),
  y saltea las filas del libro que tienen la clave en `M`.
- El día del corte se borra `puente.yml` del repo.

Correrlo a mano desde la compu (en esta carpeta):

```bash
SUPABASE_DB_URL="..." GOOGLE_SA_FILE='C:\Users\facuq\Desktop\RosarioFkits\mcp-sheets\credenciales.json' python puente_ventas.py
```

## Restaurar

Probado el 2026-10-13: se borró el esquema entero de la base local, se restauró desde el
backup y quedó idéntico (mismas filas, mismo tablero, mismos permisos, RLS en todas las
tablas).

```bash
gzip -dc respaldos/AAAA-MM-DD/base.sql.gz | psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1
```

Sobre un proyecto de Supabase **nuevo** o con el esquema `public` vaciado
(`drop schema public cascade; create schema public;` y los `grant usage` a anon,
authenticated y service_role). Después, para que `supabase db push` no quiera volver a
aplicar todo: `npx supabase migration repair --status applied 0001 0002 ...` con todas las
migraciones del repo.

Las CSV de `tablas/` se abren con Excel o Sheets sin saber nada de SQL.
