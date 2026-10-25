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

# la ruleta
RULETA_SECRET=<cadena larga y secreta, distinta en local y en produccion>
CUPONES_URL=<la URL /exec del Apps Script de cupones, vacia = sin registro>
CUPONES_TOKEN=<la misma cadena que esta pegada en Cupones.gs>
```

`RULETA_SECRET` firma los cupones. **No se cambia con cupones vigentes**: los
que ya están emitidos dejan de verificar de golpe y sus dueños se quedan sin
premio. Si falta en producción, la ruleta directamente no aparece — es
preferible a emitirlos firmados con la clave de desarrollo, que está escrita
en el código y puede leerla cualquiera.

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

### Favicon

`app/favicon.ico`, `app/icon.png` y `app/apple-icon.png`. Next los detecta por
el nombre y arma los `<link>` solo: no hay que declarar nada en el layout.

```bash
python herramientas/hacer-favicon.py
```

Usa **solo el monograma RF**, no el escudo completo: el texto circular a 16 px
es una mancha. El corte salió de medir la tinta por anillo — el monograma
termina en el radio 0.55 y el texto arranca en 0.60, así que en 0.575 se
separan sin tocar ninguno de los dos.

La fuente es el logo **negro**, no el blanco: al blanco lo generamos desde un
gris y le quedó un halo en el canal alfa que ensuciaba el recorte.

### Frente y dorso

```
3029.jpg    el frente, la que sale en la grilla
3029-2.jpg  el dorso
3029-3.jpg  detalles, y así hasta 8
```

Para sumar una foto no se toca código ni el Sheet:

```bash
python herramientas/agregar-foto.py 3029 "C:/ruta/a/la/foto.jpeg"
```

El script arregla la rotación del EXIF (las de WhatsApp vienen giradas), limita
el lado largo a 1600 px y la guarda con el nombre que corresponde.

En la tarjeta, el dorso aparece **al pasar el mouse**. En el celular no hay
hover, así que se toca la pastilla con el contador (`1/2`) abajo a la derecha.
La segunda foto **no se monta hasta el primer hover**: dejarla en `opacity: 0`
la descargaría igual y serían el doble de imágenes en la grilla para algo que
la mayoría no mira.

Las fotos del proveedor son de 800×800 — ese es el techo de calidad. Las
propias entran a 1200×1600 y se ven bastante mejor en pantalla completa.

### Agotados

El catálogo muestra los modelos sin stock, apagados y en su propio bloque al
final ("Se agotaron"). No es un descuido: son la prueba de que ese modelo se
vende, y el botón abre un pedido **por encargue** en vez de una compra.

Reglas:

- Un modelo está agotado cuando `total === 0`.
- Los agotados **sin foto se descartan** (`lib/sheets.ts`): una tarjeta vacía es
  ruido. Con foto valen, porque muestran qué se vendió.
- Nunca se mezclan con lo que hay en mano: van después, en su propia sección, y
  no cuentan en "X modelos · Y unidades".
- **No se muestra el precio.** Entre que se agota y llega el encargue el
  proveedor puede aumentar; un número viejo es una promesa que no podemos
  sostener. Dice "Precio a confirmar" y el JSON-LD no declara ninguna oferta.
- En el JSON-LD cada talle declara su disponibilidad (`InStock` / `OutOfStock`),
  así Google sabe que el producto existe y está sin stock. Un talle agotado
  dentro de un modelo que sí tiene stock conserva el precio: ese es real.

**Depende del Sheet:** la hoja `Web` tiene que traer también las filas con
`Disponible = 0`. Si filtra por `> 0`, esta sección simplemente no aparece —
no rompe nada, pero tampoco muestra nada.

### Filtro por talle

Segunda fila de chips debajo de las categorías. Casi todo el stock es una
unidad por talle, así que "¿lo tenés en mi talle?" es la pregunta principal y
por eso tiene fila propia en vez de quedar al final del scroll horizontal.

- Los chips salen de los talles **con stock** de la categoría elegida.
- Si al cambiar de categoría el talle elegido ya no existe, el filtro se ignora
  solo, pero queda guardado por si vuelve a esa categoría.
- Un agotado entra en el filtro si **alguna vez** tuvo ese talle: quien busca su
  medida también quiere ver qué puede encargar.

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

Y en todo el sitio (`app/layout.tsx`) un **OnlineStore** + **WebSite**: quién
vende, en qué ciudad, el WhatsApp y el Instagram. Las ofertas de cada ficha lo
citan por `@id`. Tienda online y no LocalBusiness: no hay local a la calle, y
Google pide dirección completa para un LocalBusiness.

**La descripción de cada camiseta** sale de `descripcionProducto()` en
`lib/seo.ts`: una oración suelta con modelo, talles, precio, Rosario, envío y
pago. La usan la meta description y el JSON-LD. Está escrita para que la pueda
citar una IA (ChatGPT, Gemini, la visión general de Google) cuando alguien
pregunta dónde conseguir esa camiseta.

**El nombre del modelo es el SEO.** El título, la URL y la descripción salen
del nombre del Sheet, así que tiene que llevar las palabras que busca la gente:
"Camiseta Arsenal 25/26 Terrace Icons adidas Originals (bordó)" y no "Arsenal
Casual". Renombrar cambia la URL: **cada renombre deja su redirección en
`next.config.ts`**, o los links compartidos y lo que Google ya indexó dan 404.

Para verificarlo en producción: `search.google.com/test/rich-results`.

## La ruleta de descuentos

Un botón flotante abre una rueda de ocho gajos. El visitante pone nombre y
WhatsApp, gira una vez y se lleva un cupón que canjea escribiendo.

```
components/Ruleta.tsx  ->  POST /api/ruleta  ->  lib/ruleta-server.ts  (sortea y firma)
                                              ->  lib/cupones.ts       (anota en el Sheet)
```

**El sorteo pasa en el servidor.** `lib/ruleta.ts` tiene lo que puede ver el
navegador (premios y geometría); las probabilidades viven en `PESOS`, dentro de
`lib/ruleta-server.ts`, y nunca salen de ahí. Si estuvieran en el cliente,
cualquiera abriría las devtools para ver qué gajo conviene.

**El cupón no se guarda en ningún lado: el código *es* el comprobante.**
`RFK-15-HR4QZ-K3M7-46Z9VY` lleva adentro el premio, el minuto en que se emitió,
cuatro caracteres al azar y una firma HMAC con `RULETA_SECRET`. La página
`/cupon/CODIGO` lo verifica sin consultar nada. Inventar un código no sirve: la
firma no cierra.

> Los cuatro caracteres al azar no son decorativos. Sin ellos, dos personas que
> giran en el mismo minuto y sacan el mismo premio se llevan el **mismo código**
> — el resto del código solo depende del premio y de la hora. Apareció en la
> primera prueba con dos teléfonos distintos.

**Un giro por persona, con dos cerrojos de distinta fuerza:**

1. una cookie `httpOnly` que el JS de la página no puede borrar. Frena el
   reintento fácil, pero no sobrevive a una ventana de incógnito;
2. el teléfono en la hoja CUPONES. Ese sí: un número que ya giró recibe siempre
   el mismo cupón, desde cualquier navegador. Y como el premio se canjea por
   WhatsApp **desde ese número**, inventar teléfonos tampoco sirve — queda un
   cupón que su dueño no puede usar.

El registro vive en `apps-script/cupones/Cupones.gs` (en la carpeta
`RosarioFkits`), un proyecto de Apps Script **separado** del de cargar ventas
porque este tiene que estar abierto a internet. Si `CUPONES_URL` está vacía, la
ruleta funciona igual con la cookie sola — es el modo para probar en localhost.
Si está configurada y Google no contesta, **no se emiten cupones**: es preferible
a repartir descuentos que no quedan anotados.

El 2x1 está dibujado en la rueda con peso **0**: se ve y no sale. Es una
decisión del negocio, no un descuido — está en `PESOS` con un comentario al
lado, y ponerle `1` lo vuelve real.

## Lo que falta y sabemos que falta

La web se actualiza **de a una etapa por vez**, no todo junto: cada etapa se
publica sola, se mira cómo anda y recién ahí se arranca la siguiente.

### Etapa: carrito por WhatsApp

Escrito y sin publicar (`lib/carrito.ts`, `components/Carrito.tsx`,
`BotonCarrito`, `AgregarAlCarrito`, `app/api/stock`). No cobra ni reserva:
junta lo elegido y lo manda en **un solo mensaje de WhatsApp**; la venta la
sigue confirmando Facu. Aplica la promo 2x$100.000 con las mismas reglas que el
banner, y al abrir el panel vuelve a mirar el stock del Sheet.

Para publicarlo: probarlo en el celular, revisar el mensaje que arma y
commitear esos archivos junto con los cambios de `layout.tsx`, `page.tsx`, la
ficha, `ProductCard` y `SelectorTalle` que lo enchufan.

**El checkout con pago es otra etapa, más adelante:** ahí el stock tiene que
salir del ERP (Supabase) y no del Sheet, porque con una unidad por talle dos
compras simultáneas venden la misma camiseta.

### Etapa: preventa pública

`/preventa` anda y se comparte por link, pero sin commitear y con
`PREVENTA_PUBLICA = false` (`noindex`, fuera del sitemap). Se publica cuando el
pedido esté por llegar (diciembre de 2026): commitear y pasar el interruptor a
`true`. Ver "La preventa" más arriba.

### Etapa: SEO y GEO, en orden

1. **Google Search Console** (lo hace Facu, 10 minutos): propiedad con prefijo
   de URL `https://rosariofkits.vercel.app/`, método **etiqueta HTML**; el
   código va en `metadata.verification.google` de `app/layout.tsx`. Después
   enviar `sitemap.xml` y pedir la indexación de las fichas nuevas. Sumar
   **Bing Webmaster Tools** importando desde Search Console: Bing alimenta a
   ChatGPT y Copilot.
2. **Perfil de Empresa de Google** (Facu): negocio con área de servicio en
   Rosario, sin dirección pública, con WhatsApp, link a la web y fotos. Pedir
   reseñas a los que ya compraron.
3. **Texto visible en cada ficha**: el párrafo de `descripcionProducto()`
   debajo del botón. Las preguntas frecuentes ya están (`lib/faq.ts`, plegadas
   al pie de la ficha y como JSON-LD `FAQPage`): talles, lavado, cómo comprar,
   envíos, pago, stock y encargue. Falta la de **cambios y devoluciones**, que
   se escribe cuando Facu defina la política.
4. **Columna opcional `Descripcion` en STOCK y en el QUERY de WEB**, para
   escribir a mano una o dos líneas por modelo con los términos que busca la
   gente. `lib/sheets.ts` ya lee columnas opcionales por nombre.
5. **Envío y cambios en el JSON-LD** (`shippingDetails`,
   `hasMerchantReturnPolicy`): Google los pide para mostrar el precio en
   Shopping. Antes Facu tiene que definir costo de envío y política de cambios.
6. **Páginas `/preguntas-frecuentes` y `/envios`**, en texto, enlazadas desde
   el pie.
7. **Dominio propio** (`rosariofkits.com.ar`): al cambiarlo, actualizar
   `NEXT_PUBLIC_SITE_URL` en Vercel.
8. **Alt de las fotos** con qué muestra cada una (frente, espalda, escudo) en
   vez de "foto 2 de 5".

En Instagram, nombrar los modelos con las mismas palabras que la web y poner el
link en la bio: para "Arsenal Icon bordó" Google hoy muestra un post de
Instagram de otra cuenta.

### Otros

- **Marcar el cupón como usado desde la web.** Hoy se pone `SI` a mano en la
  hoja CUPONES: la página `/cupon/CODIGO` es pública para cualquiera que tenga
  el código, así que no escribe nada.
