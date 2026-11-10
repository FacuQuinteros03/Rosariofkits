"""Arma los videos y las imágenes fijas de la portada con los cuadros grabados.

    python herramientas/hero-3d/armar.py <carpeta-de-cuadros> [version]

Necesita `pip install imageio-ffmpeg pillow`. Escribe en public/:
    hero-golazo-land-<version>.mp4 / .jpg   (1280x720, escritorio)
    hero-golazo-port-<version>.mp4 / .jpg   (720x1080, celular)

La versión va en el nombre porque next/image y el CDN cachean por URL: clip
nuevo = nombre nuevo, y se cambia VERSION_HERO en lib/hero.ts.
"""
import subprocess
import sys
from pathlib import Path

import imageio_ffmpeg
from PIL import Image

CUADROS = Path(sys.argv[1])
VERSION = sys.argv[2] if len(sys.argv) > 2 else "v1"
PUBLIC = Path(__file__).resolve().parents[2] / "public"
FPS = 30
FIJA = 150  # el cuadro de la imagen fija: la pelota recién salió del pie
SALIDA = {"land": (1280, 720), "port": (720, 1080)}

ffmpeg = imageio_ffmpeg.get_ffmpeg_exe()
for clip, (ancho, alto) in SALIDA.items():
    carpeta = CUADROS / clip
    total = len(list(carpeta.glob("*.jpg")))
    if not (carpeta / "fin.txt").exists():
        sys.exit(f"{clip}: la grabación no terminó ({total} cuadros)")
    dura = total / FPS
    destino = PUBLIC / f"hero-golazo-{clip}-{VERSION}.mp4"
    filtros = f"scale={ancho}:{alto}:flags=lanczos,fade=t=in:st=0:d=0.35,fade=t=out:st={dura - 0.5:.3f}:d=0.5"
    subprocess.run(
        [ffmpeg, "-y", "-loglevel", "error", "-framerate", str(FPS), "-i", str(carpeta / "%04d.jpg"),
         "-vf", filtros, "-c:v", "libx264", "-profile:v", "high", "-crf", "27", "-preset", "veryslow",
         "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", str(destino)],
        check=True,
    )
    fija = PUBLIC / f"hero-golazo-{clip}-{VERSION}.jpg"
    Image.open(carpeta / f"{FIJA:04d}.jpg").save(fija, quality=90, optimize=True, progressive=True)
    print(f"{destino.name}: {destino.stat().st_size / 1e6:.2f} MB, {dura:.1f} s   {fija.name}: {fija.stat().st_size / 1e3:.0f} KB")
