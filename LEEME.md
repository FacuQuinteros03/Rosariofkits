# Rosario F Kits — web nueva (Next.js)

Reescritura del catálogo. La versión vieja sigue online en
`rosariofkits.netlify.app` hasta que ésta la reemplace.

---

## Estructura

```
rosariofkits-web/
├─ app/
│  ├─ layout.tsx          fuentes, metadata, OG, tema oscuro
│  ├─ page.tsx            Server Component: trae el Sheet y arma la página
│  ├─ producto/[slug]/
│  │  └─ page.tsx         una página por modelo, con JSON-LD
│  └─ globals.css         tokens de color en @theme (Tailwind v4)
├─ components/
│  ├─ Hero.tsx            server — portada a sangre, entrada en CSS
│  ├─ Catalogo.tsx        "use client" — buscador, filtros, grilla
│  ├─ ProductCard.tsx     "use client" — selector de talle + WhatsApp
│  ├─ SelectorTalle.tsx   "use client" — talles + WhatsApp, en el detalle
│  ├─ TrustBar.tsx        server — barra de confianza
│  └─ PromoBanner.tsx     server — promo vigente
├─ lib/
│  ├─ sheets.ts           fetch + parseo del CSV + agrupado por modelo
│  ├─ site.ts             URL pública y datos del negocio
│  ├─ types.ts            Producto, Variante, Categoria
│  └─ whatsapp.ts         armado del link y formato de precio
├─ public/
│  ├─ hero.jpg            foto de portada — REEMPLAZAR por una de 2000px+
│  ├─ fotos/<SKU>.jpg     una por producto
│  ├─ logo.png
│  └─ og.png
└─ next.config.ts
```

**Por qué está partido así:** `page.tsx` es Server Component y hace el fetch,
así el CSV nunca viaja al navegador ni se ve el link del Sheet. Solo `Catalogo`
y `ProductCard` son cliente, porque necesitan estado. Es el mínimo de JS
posible del lado del usuario.

---

## Instalación

```bash
npx create-next-app@latest rosariofkits-web --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*"
cd rosariofkits-web
npm install lucide-react framer-motion
```

Después copiás encima las carpetas `app/`, `components/`, `lib/` y el
`next.config.ts` de este repo.

### Variables de entorno

`.env.local` (y las mismas en Vercel → Settings → Environment Variables):

```
SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/e/2PACX-1vROoCo0W5DOhGSZI42MinLymGPVOz3ZPxpR54GepCEU0smX7DAvsIfdmPQ_hWncRdh0_wMo9XPTCl0o/pub?gid=194079658&single=true&output=csv
NEXT_PUBLIC_SITE_URL=https://rosariofkits.vercel.app
```

`NEXT_PUBLIC_SITE_URL` tiene que ser el dominio real: de ahí salen las URLs
canónicas, las imágenes de Open Graph y el JSON-LD. Si queda mal, Google indexa
un dominio que no existe. Cuando compres `rosariofkits.com.ar`, se cambia acá.

Está en una variable y no hardcodeado para poder cambiar de planilla sin tocar
código, y para no publicar el link en el bundle del cliente.

### Assets

Copiar de la web vieja:

```
web/fotos/*.jpg   →  public/fotos/
web/logo.png      →  public/logo.png
web/og.png        →  public/og.png
```

Las miniaturas `-sm.jpg` **no hacen falta**: `next/image` genera los tamaños y
sirve AVIF/WebP solo. Copiá únicamente las de 800px.

---

## Cómo funciona el dato

El Sheet devuelve **una fila por SKU**, y un SKU es siempre *producto + talle*:

```
3019, Camiseta Real Madrid 26/27' Alternativa - Talle L,  Camiseta, $52.500, 1
3020, Camiseta Real Madrid 26/27' Alternativa - Talle XL, Camiseta, $52.500, 4
```

`lib/sheets.ts` parte el nombre, agrupa por modelo y arma un `Producto` con sus
`variantes`. Eso es lo que se ve como una tarjeta con talles L y XL.

Tres cosas que el Sheet **no** trae y se resuelven en código:

| Falta | Cómo se resuelve |
|---|---|
| Talle como columna | Se parsea de `"... - Talle XL"` |
| Categorías finas | `clasificar()` deduce Clubes / Selecciones / Retro / Shorts del nombre |
| URL de foto | Se busca `public/fotos/<SKU>.(jpg\|webp\|png)` en el servidor |

### Varias fotos por producto

La principal es `<SKU>.jpg`. Para sumar mas: `<SKU>-2.jpg`, `<SKU>-3.jpg`, hasta 8.
Alcanza con dejar el archivo en la carpeta: no hay que tocar codigo ni el Sheet.
La pagina de producto muestra la tira de miniaturas y el visor a pantalla
completa con flechas y teclado. Todas entran al JSON-LD.

Si sumás una selección nueva, agregala al array `SELECCIONES` de `sheets.ts` o
va a caer en "Clubes".

### ISR

`export const revalidate = 60` en `page.tsx`. La página se sirve cacheada al
instante y Next la refresca en segundo plano. Nadie espera a Google, y un corte
de Sheets no tira el sitio: sigue mostrando la última copia buena.

---

## Deploy en Vercel

1. `git init` y subir el repo a GitHub
2. Vercel → New Project → importar el repo
3. Cargar `SHEET_CSV_URL` en Environment Variables
4. Deploy

Desde ahí, cada `git push` publica solo.

Cuando esta versión esté lista, se apunta el dominio acá y recién ahí se baja
el sitio de Netlify.

---

## La portada

`Hero.tsx` es Server Component y la animación de entrada es CSS, no Framer
Motion. Es a propósito: el texto del hero es el mensaje principal del sitio y
no puede depender de que hidrate el JavaScript. Framer queda para lo
interactivo, donde si falla es solo cosmético.

Dos cosas a resolver antes de publicar:

1. **`public/hero.jpg` mide 987x555**, muy chica para una portada a sangre. En
   escritorio se ve blanda. Conseguir una de 2000px de ancho o más y
   reemplazarla; el componente no cambia.
2. **Es una foto de agencia.** Es material de prensa de la final de Qatar, no
   propio. Usarla en un sitio comercial es un riesgo de copyright, y a eso se
   suma el uso de la imagen de una persona para promocionar un negocio.

Si hay que cambiarla, la alternativa segura es una foto propia de producto:
`fotos/3029.jpg`, la Argentina Messi que ya tenés en stock.

El recorte se controla con `object-[34%_18%]` en vertical (cae sobre la cara) y
`sm:object-[center_25%]` en horizontal. Si cambiás la foto, ajustá esos dos.

## SEO

Cada modelo tiene su URL: `/producto/camiseta-boca-juniors-25-26-suplente-clubes`.
Se prerenderizan todas en el build con `generateStaticParams`, y `dynamicParams`
queda en true: si entra un modelo nuevo al Sheet, su página se genera sola en la
primera visita en vez de dar 404.

Cada una lleva dos bloques de JSON-LD:

- **Product** con una `Offer` por talle, cada una con su SKU real, precio en ARS
  y `InStock`. Cuando un talle se agota, el Sheet deja de devolverlo y la oferta
  desaparece sola.
- **BreadcrumbList** Catálogo › Producto.

Para verificarlo en producción: `search.google.com/test/rich-results`.

## Lo que falta y sabemos que falta

- **Carrito y checkout.** Cuando llegue, el stock tiene que salir de una base
  de datos y no del Sheet: con una unidad por talle, dos compras simultáneas
  venden la misma camiseta.
- **`sitemap.ts` y `robots.ts`**, para que Google descubra las 36 páginas sin
  depender de los links internos.
