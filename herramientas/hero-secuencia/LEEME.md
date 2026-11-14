# Secuencia de la portada

El fondo de la portada es una tira de cuadros WebP que avanza con el scroll
(`components/HeroScroll.tsx`). Los cuadros salen de un video propio, filmado
con el celular en vertical. Al repo van solo los cuadros, no el video.

## Regenerar con otro video

Hace falta `ffmpeg` con `vidstab`. Desde la raíz del repo, con el video en
`entrada.mp4` y eligiendo el tramo (`-ss` inicio, `-t` duración, en segundos):

```bash
ffmpeg -ss 2.8 -t 16.1 -i entrada.mp4 -vf vidstabdetect=shakiness=6:accuracy=12:result=tr.trf -f null -
```

```bash
ffmpeg -ss 2.8 -t 16.1 -i entrada.mp4 -vf "vidstabtransform=input=tr.trf:smoothing=18:optzoom=1:interpol=bicubic,unsharp=5:5:0.5" -c:v libx264 -crf 14 -an estab.mp4
```

```bash
mkdir -p public/hero/NOMBRE-v1/d public/hero/NOMBRE-v1/m
```

```bash
ffmpeg -i estab.mp4 -vf "fps=96/16.1" -c:v libwebp -quality 62 public/hero/NOMBRE-v1/d/%03d.webp
```

```bash
ffmpeg -i estab.mp4 -vf "fps=72/16.1,scale=432:-2" -c:v libwebp -quality 58 public/hero/NOMBRE-v1/m/%03d.webp
```

```bash
ffmpeg -i estab.mp4 -frames:v 1 -q:v 2 public/hero/NOMBRE-v1/poster.jpg
```

Después se actualiza `lib/hero-secuencia.ts` (carpeta y cantidad de cuadros) y
se borra la carpeta vieja.

## Reglas

- **Carpeta nueva por cada versión.** Los cuadros se cachean un año
  (`next.config.ts`); si se pisan bajo el mismo nombre, la gente sigue viendo
  los viejos.
- **Peso:** cada carpeta (`d` y `m`) por debajo de 4 MB. Hoy son 2,2 MB y 1,1 MB.
- **El primer cuadro manda:** es el póster, lo que se ve antes de que cargue
  nada y lo que queda fijo con movimiento reducido o ahorro de datos. Tiene
  que ser una imagen linda por sí sola.
- La estabilización importa: un video a pulso, cuadro por cuadro con el dedo,
  tiembla mucho más que reproducido.
