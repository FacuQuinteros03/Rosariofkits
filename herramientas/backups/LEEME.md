# Backups nocturnos del ERP

Estos archivos van en el repo **privado** `rosariofkits-backups` de GitHub (no en la web):

| Archivo de acá | Dónde va en el repo de backups |
|---|---|
| `backup.yml` | `.github/workflows/backup.yml` |
| `respaldar.sh` | `respaldar.sh` (en la raíz) |
| `exportar_consulta.py` | `exportar_consulta.py` (en la raíz) |

Todas las noches a las 4 AM (hora de Argentina):

1. guarda la foto del stock del día en `stock_diario` (los "días agotado" de las métricas);
2. le pega a la API, para que Supabase no pause el proyecto por inactividad;
3. hace el backup de la base y lo commitea en `respaldos/AAAA-MM-DD/` (`base.sql.gz` y una
   CSV por tabla). Diarios por 30 días, después uno por semana;
4. actualiza el libro `ERP_RosarioFkits_consulta` (STOCK, RESUMEN y una hoja por mes).

Si algo falla, GitHub manda un mail y el run queda en rojo en la pestaña **Actions**.

## Secrets del repo

**Settings → Secrets and variables → Actions → New repository secret**:

| Nombre | Valor |
|---|---|
| `SUPABASE_DB_URL` | la cadena del Session pooler, con la contraseña (la misma del `.env.local`) |
| `SUPABASE_URL` | `https://pllefavvclhtkgbnmvuo.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | la clave `sb_publishable_...` |
| `GOOGLE_SA_JSON` | el contenido entero de `RosarioFkits\mcp-sheets\credenciales.json` |
| `CONSULTA_ID` | el id del libro `ERP_RosarioFkits_consulta` (lo que va entre `/d/` y `/edit` en su URL) |

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
