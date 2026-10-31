#!/usr/bin/env bash
# Compara el catalogo armado desde el CSV del libro contra el armado desde Supabase,
# con el mismo codigo de la web. Toma las variables de .env.local. Sale con error si
# hay una sola diferencia.
#
#   bash herramientas/comparar_catalogo.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# Sin `source`: la URL del CSV tiene & y el shell la partiria.
while IFS='=' read -r k v; do
  export "$k=$v"
done < <(grep -E '^(SHEET_CSV_URL|NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)=' .env.local | tr -d '\r"')

tmp=$(mktemp -d)
CATALOGO_FUENTE=sheets   npx -y tsx herramientas/comparar_catalogo.ts > "$tmp/sheets.json"
CATALOGO_FUENTE=supabase npx -y tsx herramientas/comparar_catalogo.ts > "$tmp/supabase.json" 2> "$tmp/err.txt"

if grep -q "la base no respondio" "$tmp/err.txt"; then
  echo "ERROR: la base no respondio y se uso el CSV; la comparacion no vale."; cat "$tmp/err.txt"; exit 1
fi
echo "Productos: $(grep -c '"id":' "$tmp/sheets.json") desde el CSV, $(grep -c '"id":' "$tmp/supabase.json") desde Supabase"
if diff -u "$tmp/sheets.json" "$tmp/supabase.json" > "$tmp/diff.txt"; then
  echo "OK: el catalogo es identico con las dos fuentes."
else
  echo "DIFERENCIAS:"; head -60 "$tmp/diff.txt"; exit 1
fi
