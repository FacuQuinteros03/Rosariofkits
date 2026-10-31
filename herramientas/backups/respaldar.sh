#!/usr/bin/env bash
# Backup nocturno de la base del ERP (diseño 6.4). Lo corre GitHub Actions en el repo
# privado rosariofkits-backups; también se puede correr a mano con las mismas variables.
#
#   SUPABASE_DB_URL                 cadena del Session pooler
#   NEXT_PUBLIC_SUPABASE_URL        https://<ref>.supabase.co
#   SUPABASE_PUBLISHABLE_KEY        la clave publishable (para el pedido que evita la pausa)
#
# Deja en respaldos/AAAA-MM-DD/:
#   base.sql.gz      pg_dump del esquema public (estructura + datos + permisos). Para
#                    restaurar en un proyecto de Supabase nuevo o vaciado:
#                    gzip -dc base.sql.gz | psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1
#   tablas/*.csv     una por tabla, para abrir sin saber SQL
set -euo pipefail

for v in SUPABASE_DB_URL NEXT_PUBLIC_SUPABASE_URL SUPABASE_PUBLISHABLE_KEY; do
  if [ -z "${!v:-}" ]; then
    echo "ERROR: falta $v. Revisar los secrets del repo (o del environment del workflow)."
    exit 1
  fi
done

hoy=$(TZ=America/Argentina/Buenos_Aires date +%F)
dir="respaldos/$hoy"
mkdir -p "$dir/tablas"

echo "1. Foto del stock del día (alimenta los días agotado de las métricas)"
psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -qAt -c \
  "select 'filas: ' || foto_stock_diaria()
   from (select set_config('request.jwt.claims', '{\"role\":\"service_role\"}', false)) c;"

echo "2. Un pedido a la API, para que Supabase no pause el proyecto por inactividad"
curl -sf -o /dev/null -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/rpc/catalogo_web" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" -H "Content-Type: application/json" -d '{}'

echo "3. pg_dump"
# Con permisos (los GRANT a anon/authenticated existen en todo proyecto de Supabase), sin
# dueños, y con CREATE SCHEMA IF NOT EXISTS: un proyecto nuevo ya trae el esquema public,
# y sin eso la restauración se corta en la primera línea. Los permisos por defecto de
# supabase_admin se sacan: son internos de Supabase y un usuario común no los puede aplicar.
pg_dump "$SUPABASE_DB_URL" --schema=public --no-owner --quote-all-identifiers \
  | sed -e 's/^CREATE SCHEMA "public";$/CREATE SCHEMA IF NOT EXISTS "public";/' \
        -e '/^ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin"/d' \
  | gzip -9 > "$dir/base.sql.gz"

echo "4. Una CSV por tabla"
for t in $(psql "$SUPABASE_DB_URL" -qAt -c \
    "select tablename from pg_tables where schemaname = 'public' order by 1"); do
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -q -c "\copy public.\"$t\" to '$dir/tablas/$t.csv' csv header"
done

echo "5. Controles"
tam=$(stat -c %s "$dir/base.sql.gz")
lineas=$(gzip -dc "$dir/base.sql.gz" | wc -l)
if [ "$lineas" -lt 100 ]; then
  echo "ERROR: el dump salió casi vacío ($lineas líneas)"; exit 1
fi
anterior=$(ls -d respaldos/*/ 2>/dev/null | grep -v "$hoy" | sort | tail -1 || true)
if [ -n "$anterior" ] && [ -f "$anterior/base.sql.gz" ]; then
  tam_ant=$(stat -c %s "$anterior/base.sql.gz")
  if [ "$tam" -lt $(( tam_ant * 80 / 100 )) ]; then
    echo "ERROR: el dump ($tam bytes) es más de 20% más chico que el de $anterior ($tam_ant bytes)"
    exit 1
  fi
fi
echo "OK: $dir/base.sql.gz ($tam bytes, $lineas líneas)"

echo "6. Poda: diarios de los últimos 30 días, después uno por semana (domingo)"
limite=$(date -d "$hoy -30 days" +%F)
for d in respaldos/*/; do
  f=$(basename "$d")
  if [[ "$f" < "$limite" ]] && [ "$(date -d "$f" +%u)" != "7" ]; then
    rm -rf "$d"
  fi
done
