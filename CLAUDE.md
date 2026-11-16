@AGENTS.md

# Rosario F Kits

Tienda de camisetas de fútbol de Rosario. Next.js + Supabase + Vercel. No hay checkout: se
vende por WhatsApp, y el pago por transferencia reserva stock con el comprobante.

## Reglas

- **Antes de auditar o tocar la web, leer `docs/guia-auditoria.md`.** Si choca con lo que pide
  Facu, gana Facu.
- Hablar simple y en voseo. Cambio grande o con dudas: primero pocas preguntas, después el código.
- **Publicar (merge a `main`) solo cuando Facu lo pide en ese mismo mensaje.** Mientras tanto,
  rama y vista previa.
- Nada de subagentes ni flujos automáticos salvo que Facu los pida.
- Las claves las carga Facu en Vercel. Nunca pasan por el chat ni van al repo (el repo es público).
- Al terminar: si quedó resuelto lo pedido y qué quedó a medias.

## Dónde se anota cada cosa

- `docs/funciones.md`: qué hace el sitio y dónde vive cada cosa.
- `docs/historial.md`: lo que se publicó, con fecha, y lo que está en rama sin publicar.
- `LEEME.md`: el detalle técnico histórico (planilla, ruleta, ERP).

## Diseño (decidido por Facu, noviembre de 2026)

- Fondo blanco con azules: marino `#0f2340`, azul `#1a5fd0` para pedir, celeste para detalles.
  Rojo solo en rebajas y urgencia. Sin verde, sin lima, sin degradados de relleno.
- Una sola regla de forma: esquinas de 12 px y botones de 48 px de alto. **Nada de cortes
  diagonales** (se probó y el texto se cortaba en tarjetas angostas).
- Títulos en Barlow Condensed cursiva; texto en Archivo. Nada por debajo de 13 px.
- Portada con fotos propias que rotan, sin puntos ni botón de pausa.
- El panel `/admin` y la ruleta siguen oscuros (clase `.tema-oscuro`).

## Cómo medir en este repo

- Siempre contra `next build` + `next start`, nunca `next dev`. **Matar los servidores viejos
  antes de medir** (`pgrep -f next-server`): uno colgado sirve archivos viejos.
- En entornos sin acceso a la planilla: `CATALOGO_FUENTE=sheets` y `SHEET_CSV_URL` apuntando a
  un CSV local de prueba.
