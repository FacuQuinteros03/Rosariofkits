# Guía para auditar y mejorar una web

Lo aprendido armando Rulo (Next.js + Supabase + Vercel, en producción con clientes reales),
pasado a reglas que sirven para cualquier página. Para usarla en otro repositorio: copiala como
`docs/guia-auditoria.md` y sumá en el `CLAUDE.md` de ese repo una línea como
"Antes de auditar o tocar la web, leer `docs/guia-auditoria.md`".

Si algo de acá choca con lo que pide el dueño de esa web, gana lo que pide el dueño.

---

## 0. Cómo trabajar (con el dueño y con Claude)

- **Hablar simple y en voseo**, sin jerga. Explicar qué se cambia y por qué en dos o tres frases.
- **Cambio grande o con dudas: primero pocas preguntas** (de opción múltiple si se puede) y
  después el código. Rehacer gasta más que preguntar. Cambio chico y claro: se hace directo.
- **Al terminar, dos líneas:** si quedó resuelto lo que pidió y si algo quedó a medias o se cortó
  camino (y por qué).
- **Publicar solo cuando el dueño lo pide en ese mismo mensaje** ("publicalo", "mergeá"). Un
  "mergeá" viejo no vale para un pedido nuevo. Mientras tanto: PR abierto y vista previa.
- **Nada de subagentes ni flujos automáticos salvo que el dueño los pida** (gastan mucho uso). Si
  los pide: el modelo más chico que alcance, con las rutas exactas y qué mirar en cada una; nunca
  "revisá todo el proyecto".
- **Elegir el modelo según la tarea:** si alcanza uno más liviano (textos, cambios chicos), avisarle
  que cambie con `/model`.
- **Secretos:** las claves las carga el dueño en Vercel o GitHub. Nunca pasan por el chat ni van al
  repo (las contraseñas de cuentas de prueba tampoco).
- **Dónde se anota cada cosa (en el mismo PR):** las funciones en un `docs/funciones.md`, las
  opiniones del dueño sobre diseño en una guía de diseño con fecha, lo que se publicó en un
  `docs/historial.md`. El `CLAUDE.md`, corto: reglas, datos de infraestructura y estado.
- **Lo que se aprende de un error se anota como regla de una línea** para que no se repita (ver
  la sección 9).

---

## 1. Cómo hacer la auditoría

1. **Leer antes de opinar:** qué es la web, para quién, qué tiene que lograr el visitante (comprar,
   reservar, escribir, leer). La auditoría se mide contra eso, no contra gustos.
2. **Una mirada por vez, solo lectura**, cada una con su lista (secciones 2 a 7):
   diseño y "hecho con IA", accesibilidad, textos, rendimiento, seguridad, legal.
3. **Capturas de lo que hay hoy** con Playwright en **320, 390, 768, 1024 y 1440 px** (celular y
   compu). Mirarlas todas antes de escribir nada.
4. **Probar con datos de peor caso:** nombres larguísimos, emails sin cortes, listas vacías,
   cientos de ítems, precios enormes, textos con emojis. Lo que más se rompe es eso, no el estilo.
5. **Cada hallazgo con:** dónde está (`archivo:línea` o URL y ancho), qué pasa, cuánto molesta
   (bloquea / molesta / detalle) y el arreglo concreto. Nada de "mejorar la experiencia".
6. **Lo que cambia cómo se ve, primero como maqueta** (captura con el cambio aplicado en el
   navegador) para que el dueño elija antes de tocar el código.
7. **Arreglar en tandas, no de a uno:** mirar todo, arreglar todo junto, mirar una vez más y
   cortar. Las vueltas infinitas de pulido gastan sin mejorar mucho.
8. **Antes y después con números:** Lighthouse (sección 5) y capturas comparadas.

Lo que más encontraron las auditorías de Rulo: cosas que no andan (errores fuera de la vista,
saltos de la página al cargar, nombres largos que empujan todo de costado, botones tapados en
el celular) más que cosas de estilo.

---

## 2. Diseño: que no se vea hecho con IA

**Lo que delata "hecho con IA" (y el dueño rechaza):**

- Tarjetas y recuadros para todo, pasos numerados (1, 2, 3), secciones como bloques de color.
  Mejor: renglones con una raya fina, párrafos y aire.
- Degradados de relleno, violeta/azul brillante, neón, sombras de colores, círculos pastel,
  vidrio esmerilado en todos lados, sellos y efectos 3D.
- Tarjetas con borde de color a la izquierda, emojis como íconos, puntitos de estado de colores.
- Tres tarjetas iguales en fila con ícono + título + texto.
- Crema + terracota/bronce + marrón oscuro (lo más repetido en páginas hechas con IA).
- Fotos de banco. Mejor fotos reales del negocio o capturas reales del producto; si no hay, un
  recuadro liso del color de la marca, no ilustraciones genéricas.
- Frases de relleno ("potenciá tu negocio", "todo en un solo lugar"). Ver sección 4.

**Letras:** prohibidas por "sonar a IA": Inter, Roboto, Arial (como elección), Fraunces,
Instrument Serif, Bricolage, Space Grotesk y Playfair. Elegir a mano; 2 o 3 familias como mucho.
Para dar énfasis en un título: negrita o cursiva **de la misma letra**, no meter otra familia.

**Color:** dos colores de base y **un solo acento** para lo que importa (el botón principal, la
palabra que vende, lo activo). El mismo acento en toda la página.

**Forma:** una sola regla de esquinas para toda la página (por ejemplo: botones redondeados de
12 px o píldora, y se respeta en todo). Botones bien redondeados, alto mínimo 48 px.

**Íconos:** de trazo, del mismo grosor, una sola familia, con texto al lado cuando la acción no es
obvia.

**Modo oscuro:** si la web no lo diseñó, poner `color-scheme: only light` (meta y CSS) para que el
modo oscuro automático de Chrome en Android y Samsung no le dé vuelta los colores.

---

## 3. Uso, accesibilidad y responsive

### Accesibilidad (piso: WCAG 2.2 AA)

- **Contraste:** texto normal 4,5:1; texto grande y controles 3:1. Medir los grises de texto
  secundario y el texto sobre el color de acento: son los que más fallan.
- **Nada solo por color:** cada estado (elegido, cerrado, error) lleva además forma, texto o ícono.
- **Tamaño de toque:** 44×44 px en la práctica (mínimo legal 24×24), con 8 px entre vecinos.
- **Teclado:** todo se usa con Tab/Enter/Espacio, en orden, con el foco visible y sin quedar tapado
  por una cabecera fija.
- **HTML con significado:** `button` para acciones, `a href` para navegar, `label` en cada campo,
  un solo `h1` y títulos en orden, `alt` en las fotos, `role="alert"` en los errores.
- **Nada que haya que arrastrar sí o sí:** siempre una alternativa con toques.
- **Movimiento:** respetar `prefers-reduced-motion`; nada que parpadee.
- **Zoom:** funciona al 200 % y a 320 px de ancho sin scroll de costado.

### Principios de uso (heurísticas de Nielsen)

Estado visible ("Enviando…"), lenguaje del usuario, poder volver o cancelar, consistencia (los
mismos nombres en todos lados), prevenir errores (no dejar elegir lo que no se puede), reconocer
antes que recordar, atajos, una tarea por pantalla, errores que dicen qué pasó y cómo seguir, y
ayuda a mano (WhatsApp o contacto visible).

### Botones

- **Una sola acción principal por pantalla o tarjeta** (llena, color de acento). Las demás:
  con borde, más suaves o como link subrayado.
- **Verbos concretos:** "Guardar turno", "Enviar consulta"; nunca "Aceptar" u "OK".
- **Lo más usado primero; lo que no se deshace al final, separado y con confirmación** que dice
  exactamente qué va a pasar ("¿Borrar el pedido de Sofía?"). El "Sí" nunca queda donde estaba el
  primer toque. Lo que se puede deshacer no pregunta.
- Mientras trabaja, el botón lo dice ("Guardando…") y no deja tocar dos veces.
- **Texto del botón en una sola línea.** Si se corta en dos, se acorta el texto.
- **Formularios largos:** el botón de guardar o enviar queda fijo abajo en el celular.

### Formularios

- Etiqueta **visible arriba** del campo (no adentro como placeholder). Una sola columna.
- `autocomplete` correcto y el teclado que corresponde (`type="tel"`, `inputmode`).
- **16 px en los campos** (si no, el iPhone hace zoom).
- Validar al salir del campo, no mientras escribe; el error pegado al campo, en texto.
- **Pedir lo mínimo:** para captar clientes, mejor dos o tres preguntas con botones de un toque y
  nombre + WhatsApp que un formulario largo.
- Todo número editable se tiene que ver tocable y tener un tope con sentido.

### Tipografía y lectura

Texto principal 16 px en el celular, secundario no menos de 13 px; interlineado 1,4–1,6; líneas
de 45 a 75 caracteres (en la compu, limitar el ancho de los párrafos). Jerarquía por tamaño y
peso, no por mayúsculas largas.

### Responsive (celular primero)

- Diseñar primero a 390 px. Probar siempre en **320, 390, 768, 1024 y 1440 px**.
- **Reacomodar, no solo apilar:** lo grande a lo ancho y en orden de importancia; lo chico y
  parecido (números, fotos, logos) de a 2 o 3 por fila.
- En la compu, el contenido en una columna de 1200 px como máximo.
- Imágenes con proporción fija y en el tamaño en que se muestran.
- **Ningún recuadro suelto en la última fila** de una grilla (que cierre pareja o centrado).
- En el celular se pueden centrar títulos, bajadas y botones; las listas, a la izquierda.

### Estados que siempre hay que cubrir

Cargando, vacío (que diga cómo llenarlo), error, deshabilitado y elegido.

---

## 4. Textos

**La voz:** voseo, frases cortas con punto (una idea por frase, sin comas por todos lados),
oraciones completas con sujeto y verbo, detalles concretos y propios. Formatos argentinos:
`$ 12.000`, `11:00 h`, `mié 30/9`.

**Lo que suena a IA** (de la guía de Wikipedia "Signs of AI writing"; un rasgo solo no delata,
varios juntos sí):

- Inflar la importancia: "clave", "fundamental", "crucial", "un antes y un después".
- Palabras de chatbot: potenciar, optimizar, elevar, impulsar, fomentar, robusto, integral, sin
  complicaciones, sin esfuerzo, "descubrí", "llevá tu negocio al siguiente nivel", "todo en un
  solo lugar", "experiencia". Las más nuevas, más sutiles: práctico, claro, confiable, priorizar.
- Evitar el "es": "funciona como", "se posiciona como", "representa".
- Paralelos negativos: "No es solo X, es Y", "No se trata de X, sino de Y".
- De a tres por costumbre: "rápido, fácil y seguro".
- Relleno al final: "…, lo que refleja su compromiso con…".
- Atribuciones vagas: "muchos clientes dicen", "los expertos coinciden".
- Formato: Mayúscula En Cada Palabra, negritas por todos lados, "**Título:** texto" en cada
  renglón, emojis como viñetas, rayas largas (—) para todo.
- Hablarle al lector como asistente: "¡Claro!", "Espero que te sirva".

**Reglas:** botones con verbo; errores con qué pasó y cómo seguir; ningún texto promete un link,
un mail o un plazo que no se cumple ("25 minutos" es prometer algo); se entiende leyendo solo el
título y el botón. Ortografía y gramática con **LanguageTool** (es-AR) antes de publicar.

---

## 5. Rendimiento

**Metas (Core Web Vitals, en el 75 % de las visitas):** LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1.

**Antes de dar por terminado un cambio:**

1. **Fotos:** con `next/image` (o equivalente), con `sizes` bien puestos y `priority` solo en la
   de arriba de todo. Nunca servir la foto original sin achicar. Lugar reservado (evita saltos).
2. **Letras:** bajarlas al proyecto (no pedirlas a Google en tiempo real), solo latín y los pesos
   que se usan, con una letra provisoria medida. Si se cambia el archivo, nombre nuevo (`-v2`).
   La provisoria tiene que buscar `local("Arial")`, `local("ArialMT")`, `local("Liberation Sans")`
   y `local("Roboto")`: en Android y Linux no hay Arial y la página salta (pasó: CLS 0,23).
3. **JavaScript:** `"use client"` solo en lo interactivo y lo más abajo posible. Nada de librerías
   grandes para algo de pocas líneas (animaciones con CSS antes que GSAP o Motion; gráficos en
   SVG propio).
4. **Lo que se ve al entrar sale del servidor:** nada de carteles, fondos o fotos de arriba que
   aparezcan con el JavaScript (el cartel de cookies incluido).
5. **Lo que se mueve, solo con `transform`/`translate`/`opacity`.** Nunca animar `box-shadow`,
   `filter`, `width`, `height`, `background-position` ni colores. Lo que se mueve solo arranca
   quieto o termina, y se frena con "reducir movimiento". Con la compu quieta, el procesador
   cerca de 0 %.
6. **Safari:** dos cosas pegadas arriba (`sticky`) van en un solo bloque pegado (si no, al deslizar
   se separan y tiemblan). Nada pegado con sombras gigantes, `clip-path` ni `transform`.
   `backdrop-filter` es caro en celulares: poco y nada.
7. **JavaScript que mide la página:** primero leer todas las medidas, después escribir. Lo que
   está fuera de pantalla, con `IntersectionObserver`.
8. **Consultas a la base:** solo las columnas que se usan, siempre filtradas, con `limit` en lo
   que crece y su índice. Lo que puede pasar de 1000 filas se pide de a 1000 con un desempate
   único en el orden (`order by fecha, id`). Lo independiente, en paralelo.

**Cómo medir sin engañarse:**

- Lighthouse en **celular y compu**, siempre contra el build de producción (`next build` +
  `next start`, nunca el servidor de desarrollo).
- **Antes y después intercalados** en la misma máquina (la versión publicada armada aparte con
  `git worktree`), 3 o 4 vueltas de cada una y el promedio: una sola vuelta varía ±5 puntos.
- Apagar servidores viejos antes de medir (uno colgado sirve archivos viejos y da números falsos).
- **Si la nota del celular baja, no se publica sin decírselo al dueño.**
- Al publicar: capturas de producción antes y después, Lighthouse, los errores del servidor
  (Vercel) y una prueba de carga chica (k6, 10 usuarios 30 s).

---

## 6. Seguridad

### Lista para cada cambio

1. **Toda entrada se valida en el servidor**, nunca solo en el navegador (zod o lectores propios),
   con largo máximo y formato. La base repite el control con `check`.
2. **Límites de uso** en todo lo público y en lo que manda algo afuera (mails, mensajes): por IP y
   por dato (mail, celular). Formularios públicos con anti-bots (Cloudflare Turnstile) y un campo
   trampa. Si el contador no responde, se rechaza.
3. **Leer el cuerpo con tope de bytes** (no `request.json()` suelto: el `content-length` se puede
   omitir). La API pública acepta solo JSON chico y desde el propio sitio.
4. **Permisos en la base, no solo en la pantalla** (RLS en Supabase). Funciones `security definer`
   con `set search_path = ''`. La clave que saltea los permisos, solo en el servidor y después de
   revisar quién pide.
5. **Tabla nueva:** permisos prendidos; el público no ve datos personales ni pagos; una prueba que
   muestre quién ve y quién no.
6. **Secretos** en variables de entorno; `NEXT_PUBLIC_` solo para lo que puede ver cualquiera;
   compararlos en tiempo constante; tokens de los clientes guardados solo como hash.
7. **Terceros:** cada script, iframe, fuente o destino de formulario nuevo se suma a la **CSP**
   (con nonce). Sumar algo de afuera es la excepción: se pregunta antes.
8. **Archivos:** solo JPG, PNG o WebP de hasta 5 MB, con el tipo leído de los **primeros bytes**
   (no de la extensión), siempre dentro de la carpeta de ese usuario.
9. **Salidas:** planillas CSV con las fórmulas escapadas (`=`, `+`, `-`, `@`), HTML de mails
   escapado, JSON-LD con `<` escapado.
10. **Webhooks y cron:** verificar la firma antes de leer nada (Mercado Pago `x-signature`, Meta
    `x-hub-signature-256`, el cron con un `Bearer` secreto) y validar los ids que llegan.
11. **Encabezados:** sin `X-Powered-By` ni versiones, sin source maps publicados,
    `frame-ancestors 'none'`, lo privado con `Cache-Control: private, no-store`, cookies
    `SameSite=Lax`.
12. **Dependencias:** Dependabot y `npm audit` semanales.

### Ataques conocidos (repasar al sumar una función)

| Ataque | Qué cuida |
|---|---|
| Subir de carpeta con `../` | No leer archivos del disco; rutas de archivos armadas por el servidor |
| `{{7*7}}` que el servidor calcule | No usar motores de plantillas con lo que escribe el usuario |
| `__proto__` en el JSON | Armar objetos nuevos solo con los campos conocidos (zod) |
| Reconocimiento (versiones, quién tiene cuenta) | Mismo mensaje con o sin cuenta; sin versiones ni mapas |
| Operadores en vez de datos (`{"$ne":null}`, `,id.neq.0`) | Validar cada dato por su forma; sacar `,()*%"\` antes de filtrar |
| Leer el código o claves en el JS público | Buscar claves en los JS publicados; `server-only` |
| Probar millones de códigos | Un pedido por vez, límites por IP y por mail, tokens de 128+ bits al azar |
| Cambiar `rol=admin` o un id en la URL | Permisos en la base; nadie cambia su rol ni ve lo de otro |
| `' or 1=1 --` | Consultas con parámetros, nunca SQL armado con texto |
| XSS | Escapar todo (React lo hace), CSP con nonce |
| CSRF | Comparar `Origin`, cookies `SameSite` |
| Redirección abierta después del login | Aceptar solo rutas propias que empiezan con una sola `/` |
| SSRF | El servidor llama solo a direcciones fijas, nunca a un link que escriba alguien |
| Caché engañada (`/privado/x.css`) | Lo privado con `no-store` |
| Host falso (`X-Forwarded-Host`) | Los links salen de una variable, no del pedido |
| Archivo disfrazado (`.svg`/`.html` como `.jpg`) | Tipo leído de los bytes |
| Fórmulas en planillas | Escaparlas |
| Clickjacking | `frame-ancestors 'none'` |
| Tomar un subdominio | Revisar que los registros DNS apunten a servicios en uso |
| `/ADMIN`, `/.GIT` en mayúsculas | Rutas exactas; lo que no coincide da 404 |
| Pagar menos o dos veces | El monto lo calcula el servidor; el pago se verifica con el proveedor; id de pago único |
| Vaciar stock con pedidos falsos | Anti-bots, límites por IP y por celular, tope de pedidos abiertos, los que vencen devuelven |
| Límites por IP dentro de un local | Todos salen por el mismo wifi: el tope fino va por mesa, celular o pedido |

### Cómo se prueba

- **Automático:** pruebas de la base (quién ve qué), `npm audit`, Dependabot.
- **Sondeo a mano** con `curl` contra la vista previa: rutas con `../`, operadores en la API,
  `__proto__`, cuerpos enormes, cabeceras falsas, mayúsculas, claves en los JS.
- **Con dos navegadores**, una cuenta en cada uno: que ninguno vea ni toque lo del otro.
- En cambios grandes, una revisión con `/security-review`.

---

## 7. Legal (Argentina)

No reemplaza a un abogado; sirve para no olvidarse de nada.

- **Datos personales (Ley 25.326):** consentimiento libre, expreso e informado (casillas
  separadas para términos y privacidad, o una línea "Al enviar aceptás…" con los links junto al
  botón). **Guardar la prueba:** quién, cuándo, IP, navegador y qué versión aceptó. Página de
  privacidad con qué datos, para qué, dónde se guardan, cuánto tiempo y cómo pedirlos o borrarlos.
  Si los datos salen del país (Supabase en Brasil, Vercel en EE.UU.), decirlo y que se acepte.
  **Inscribir las bases** en el Registro Nacional de Bases de Datos (gratis, por TAD). Acceso en 10
  días corridos; corregir o borrar en 5 hábiles.
- **Consumidores (Ley 24.240 y Disposición 954/2025):** precios claros, **botón de baja** y
  **botón de arrepentimiento** (10 días) visibles, sin cuenta y con número de gestión.
- **Firma electrónica (Ley 25.506):** marcar una casilla vale, pero hay que poder probarla (por eso
  se guarda la prueba). Al cambiar términos o privacidad, se sube la versión y se pide aceptar de
  nuevo.
- **Cookies:** no hay ley propia; se sigue el estándar europeo. Las necesarias van siempre; lo de
  terceros (mapa de Google, Instagram, TikTok, píxeles) se carga **recién cuando se acepta**.
  Página `/cookies` y la elección se cambia desde el pie. La medición sin cookies (Vercel Web
  Analytics) no necesita permiso.
- **Mensajes (Ley 26.951 "No Llame"):** todo mensaje para invitar a volver lleva cómo dejar de
  recibirlos.
- **Propiedad intelectual (Ley 11.723):** fotos, música y letras con licencia; si se usa un
  negocio real como ejemplo, con otro nombre y sin sus datos.
- **Accesibilidad (Ley 26.653):** obliga al Estado y concesionarios; para el resto, WCAG 2.2 AA
  como piso igual.

---

## 8. Pruebas antes de dar algo por terminado

- `npm run lint`, `npm run typecheck`, `npm test` y `npm run build` en verde (y las pruebas de la
  base si hay base).
- Las pantallas se **miran** en compu y celular (Playwright: capturas en 390 y 1440 como mínimo).
  Capturas que va a ver una persona, con `deviceScaleFactor: 2`.
- Un error visual **se reproduce antes de arreglarlo** (captura del problema).
- Probar con el teclado, con "reducir movimiento" y al 200 % de zoom.
- CI en cada PR y que GitHub exija las pruebas en verde para mergear.

### Lista final de diseño

- [ ] Contrastes medidos (texto 4,5:1, controles 3:1)
- [ ] Todo lo tocable ≥ 44 px
- [ ] Probado en 320, 390, 768, 1024 y 1440 px, sin scroll de costado
- [ ] Recorrido completo con teclado y foco visible
- [ ] Textos en voseo, sin "lo que suena a IA", con LanguageTool
- [ ] Estados: cargando, vacío, error, deshabilitado, elegido
- [ ] Nada depende solo del color
- [ ] Fotos con lugar reservado y `alt`
- [ ] Una acción principal por pantalla; lo que no se deshace, al final y con confirmación
- [ ] Lighthouse antes y después (celular y compu); la nota del celular no bajó

---

## 9. Reglas cortas aprendidas a los golpes

- Lo de un período pasado (precios, cobros, costos) sale de lo guardado en ese momento, nunca de
  un valor de hoy.
- Lo que puede pasar de 1000 filas, de a 1000 y con desempate por `id` (si no, se repiten o se
  saltean filas).
- Un solo vínculo (FK) entre dos tablas que se piden juntas en Supabase: con dos, la API rechaza
  la consulta en toda la app.
- Columna nueva que edita el usuario: acordarse de su permiso de `update`.
- Códigos de error comparados por el más largo que coincide ("plato_no_disponible" caía en
  "no_disponible").
- `next/og` (imágenes para compartir) se cae con un estilo en `undefined`: lo que no va, no se pone.
- Lo que se imprime o se comparte va sin el fondo que se mueve (su versión quieta).
- Antes de crear una clase CSS nueva, buscar que no exista.
- Un diseño que necesita un dato (una foto, un logo) tiene que caer a otro que ande sin él.
- Lo que es de un elemento se edita en ese elemento, no en una pantalla aparte.
- Avisos que piden algo traen el dato o el contacto para resolverlo.
- Mails con estilo que no se rompa en modo oscuro.
- Juntar cambios en un PR en vez de muchos PRs chicos.

---

## 10. Herramientas y skills de Claude que sirvieron

Las skills son archivos de instrucciones en `.claude/skills/`. **Antes de sumar una, leerla
entera:** que sea solo texto (sin scripts que bajen cosas, hooks ni pedidos de instalar). Copiar
la carpeta con su `LICENSE` y anotar de qué commit salió. Si una skill choca con las reglas del
proyecto, ganan las del proyecto.

| Skill | Repo | Para qué |
|---|---|---|
| `impeccable` | `pbakaus/impeccable` (Apache 2.0) | `critique`, `audit`, `polish`, `typeset`, `layout`, `clarify`, `harden` sobre una pantalla. Dejar afuera el programa que baja de internet, los hooks y el modo "en vivo" |
| `emil-design-eng`, `animate`, `review-animations`, `improve-animations`, `mobile-native`, `break-ui`, `apple-design` | `emilkowalski/skills` (MIT) | Detalles finos, movimiento, que en el celular se sienta app, **probar con datos de peor caso** (`break-ui`) |
| `design-taste-frontend`, `redesign-existing-projects` | `Leonxlnx/taste-skill` (MIT) | Lista de lo que delata "hecho con IA". Ojo: empuja a sumar Motion, Phosphor y letras como Geist; no hace falta |
| `make-interfaces-feel-better` | `jakubkrehel/make-interfaces-feel-better` (MIT) | Revisar detalles: radios anidados, `tabular-nums`, toques de 44 px |
| `transitions-dev` | `jakubantalik/transitions.dev` | Transiciones en CSS con su freno para "reducir movimiento" |
| `vercel-react-best-practices`, `vercel-composition-patterns` | `vercel-labs/agent-skills` (MIT) | Velocidad en React/Next |
| `supabase`, `supabase-postgres-best-practices` | `supabase/agent-skills` (MIT) | RLS, índices, migraciones |
| `supply-chain-risk-auditor` | `trailofbits/skills` (CC BY-SA 4.0) | Riesgo de las librerías |
| `gsap-*` | `greensock/gsap-skills` (MIT) | Solo para videos; en la web, animaciones con CSS |

**Otras herramientas:** Playwright (capturas y recorridos), Lighthouse (rendimiento), LanguageTool
(textos), k6 (carga), `/security-review` y `/code-review` de Claude Code, el asesor de seguridad y
rendimiento de Supabase (`get_advisors`) y los errores de Vercel (`get_runtime_errors`).

**Lo que se descartó y por qué:** ComfyUI (nodos de terceros con programas maliciosos en 2024;
genera imágenes "de IA"), Remotion (licencia paga para empresas), estilos futurista,
claymorfismo, "Liquid Glass" y 3D (pesan, andan mal en Safari y se ven hechos con IA).

---

## Fuentes

- W3C, [WCAG 2.2](https://www.w3.org/TR/WCAG22/) · NN/g, [10 heurísticas](https://www.nngroup.com/articles/ten-usability-heuristics/)
- Baymard, [Diseño de formularios](https://baymard.com/blog/form-design) · [Validación en línea](https://baymard.com/blog/inline-form-validation) · [Largo de línea](https://baymard.com/blog/line-length-readability)
- Google, [Core Web Vitals](https://developers.google.com/search/docs/appearance/core-web-vitals)
- Material Design 3, [Botones](https://m3.material.io/components/all-buttons) · Primer, [Diálogo de confirmación](https://primer.style/product/components/confirmation-dialog/guidelines)
- Smashing Magazine, [La zona del pulgar](https://www.smashingmagazine.com/2016/09/the-thumb-zone-designing-for-mobile-users/) · [Laws of UX](https://lawsofux.com/)
- Wikipedia, [Signs of AI writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)
- Argentina: [Ley 25.326](https://www.argentina.gob.ar/normativa/nacional/64790/texto), [Ley 24.240](https://www.argentina.gob.ar/normativa/nacional/638/texto), [Ley 26.653](https://www.argentina.gob.ar/normativa/nacional/175694/texto)
