# Video de la portada

El clip que se ve detrás del título de la portada sale de `escena.html`, una
escena 3D hecha con three.js. No se sirve en el sitio: se graba a video una vez
y al sitio van solo los `.mp4` y las imágenes fijas de `public/`.

Todo lo que aparece es propio: el muñeco está armado con formas simples, no hay
escudos ni marcas de terceros, y three.js es MIT. Se puede usar comercialmente.

## Regrabar

1. `python herramientas/hero-3d/servidor.py` (puerto 8793; los cuadros van a la
   carpeta temporal del sistema, `rfk-hero-cuadros`).
2. Abrir en Chrome `http://localhost:8793/escena.html?grabar=land` y esperar a
   que abajo diga "listo". Después lo mismo con `?grabar=port`.
3. `python herramientas/hero-3d/armar.py <carpeta-de-cuadros> v2`
4. Cambiar `VERSION_HERO` en `lib/hero.ts` a `v2` y borrar los `v1` de `public/`.

Para mirar sin grabar: `escena.html?encuadre=land` (o `port`), y `&r=3.6` la
deja quieta en ese segundo.

## Por qué dos clips

En escritorio el texto va a la izquierda y el jugador a la derecha (`land`,
1280x720). En el celular el texto ocupa la mitad de abajo y el jugador va
arriba (`port`, 720x1080). Un solo video recortado con `object-cover` dejaba al
jugador afuera en uno de los dos.

## Cosas que ya probamos

- **Pasto muy espejado**: los reflectores hacen un manchón blanco justo donde
  va el texto. Por eso `roughness` 0.62 y casi nada de `metalness`.
- **Estela de movimiento alta** (AfterimagePass): a 30 cuadros por segundo deja
  tres jugadores fantasma en la carrera. Quedó en 0.22.
- **La versión no puede vivir en `HeroVideo.tsx`**: es un archivo "use client"
  y Hero, que corre en el servidor, recibe una función en vez del texto.
