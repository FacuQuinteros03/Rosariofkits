# Historial

Lo que se publicó en `main`, con fecha, y lo que está hecho en rama esperando el OK.

## Publicado

### 17/11/2026 · Dominio, transferencia andando y portada con Messi

- Dominio `rosariofkits.com.ar` (delegado a Vercel; `www` redirige al dominio sin www).
- Pago por transferencia probado en producción. Hizo falta la migración `0024`: la clave
  secreta no tenía permisos en la base y toda reserva se rechazaba.
- Portada: Messi, Chelsea, Real Madrid y Arsenal. Argentina, Boca retro y Juventus salen
  hasta tener mejores fotos.

### 16/11/2026 · Rediseño auditado y pago por transferencia (PR 1)

- Todo lo que figuraba abajo como "En la rama `redesign-epico`" quedó publicado.

### 15/11/2026 · Rediseño

- Todo el sitio público en blanco con azules. El panel y la ruleta siguen oscuros.
- Portada con seis fotos propias que rotan, en lugar de la foto de agencia. Título
  "Bienvenido a Rosario F Kits · Indumentaria de fútbol importada".
- Barra de anuncios, tarjetas más grandes, etiquetas "Quedan N", "Última unidad", Player y Fan.
- El ahorro se muestra en pesos, calculado de los dos precios.
- Guía de talles armada pero **oculta** (`GUIA_TALLES_PUBLICA` en `lib/talles.ts`): faltan las
  medidas reales.

### 15/11/2026 · Portada sin controles

- Se sacaron el botón de pausa y los puntos del carrusel de la portada.

## En la rama `redesign-epico`, sin publicar

### Pago por transferencia con comprobante

- Traído de la rama `transferencia`. Necesita en Vercel `SUPABASE_SECRET_KEY`,
  `TRANSFERENCIA_ALIAS`, `TRANSFERENCIA_TITULAR` (y opcional `TRANSFERENCIA_CBU`), y el bucket
  privado `comprobantes` en Supabase. Sin eso el botón no aparece.
- **No se probó contra la base real.** Falta un pedido de prueba de punta a punta.

- 16/11/2026: el paso de pago muestra también CUIT y banco (`TRANSFERENCIA_CUIT`,
  `TRANSFERENCIA_BANCO`, opcionales). El bucket `comprobantes` se crea con la migración
  `0023_bucket_comprobantes.sql`. El Inicio del panel avisa cuántos comprobantes hay para
  verificar y lleva a Ventas.

### Seguridad (16/11/2026)

- Next 16.4.6; sin vulnerabilidades críticas ni altas.
- Encabezados de seguridad. La CSP completa está en modo "solo reporte": pasarla a firme
  cuando lleve unos días publicada sin avisos en la consola.
- `/api/pedido`: tipo de archivo leído de los bytes, tope de tamaño, límite por IP, tope de 12
  pedidos web sin verificar y control de origen.

### Auditoría completa con `docs/guia-auditoria.md` (16/11/2026)

Medido contra el build de producción, con un catálogo de prueba de peor caso, en 320, 390, 768,
1024 y 1440 px. Lighthouse: promedio de 3 vueltas en celular.

| | Antes (publicado) | Después (rama) |
|---|---|---|
| Rendimiento, celular | 85 | 91 |
| Rendimiento, compu | 99 | 100 |
| Accesibilidad | 93 | 100 |
| LCP celular, estimado por Lighthouse | 4,1 s | 3,4 s |
| LCP celular, con la red limitada de verdad (1 vuelta) | 3,8 s | 2,0 s |
| CLS | 0 | 0 |
| Peso de la home | 1004 KB | 811 KB |
| Controles de menos de 44 px (home) | 53 | 0 |
| Textos de menos de 13 px (home) | 33 | 0 |
| Textos cortados | 2 | 0 |

Qué se cambió:

- **Forma:** una sola regla (esquinas de 12 px, botones de 48 px). Se fueron los cortes
  diagonales y los degradados de relleno.
- **Tarjetas:** los textos de los botones se acomodan al ancho de la tarjeta ("Pedir" o "Pedir
  por WhatsApp"), así nunca se cortan.
- **Tamaños:** nada por debajo de 13 px; campos de 16 px; todo lo tocable de 44 px o más.
- **Rendimiento:** se precargan 3 archivos de letra en vez de 7, una sola foto con prioridad,
  logo de 7 KB en vez de 55, y se sacó la librería de animaciones (ahora es CSS).
- **Precios** con formato argentino: `$ 52.500`.
- **Legal:** páginas `/privacidad` y `/arrepentimiento` y línea de consentimiento, armadas
  pero **apagadas** (`LEGALES_PUBLICOS` en `lib/legal.ts`). Facu decidió esperar (16/11/2026).
- **Ancho máximo** de 1200 px y grilla de relacionados de 4 columnas.

Qué quedó pendiente:

- Confirmar en `lib/legal.ts` el responsable y el plazo de guardado. Inscribir la base en el
  Registro Nacional de Bases de Datos (trámite de Facu, por TAD).
- LanguageTool, prueba de carga (k6) y sondeo contra la web publicada: no se pudieron correr
  desde el entorno de trabajo.
- No hay pruebas automáticas (`npm test`) ni CI.
- La portada y la barra de anuncios rotan solas; se frenan con "reducir movimiento".
- Un aviso de hidratación de React apareció una vez en la ficha y no se pudo reproducir.
