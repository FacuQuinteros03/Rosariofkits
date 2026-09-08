# -*- coding: utf-8 -*-
"""
Genera el favicon de Rosario F Kits desde el logo original.

    python herramientas/hacer-favicon.py

El logo es un escudo circular: monograma RF al medio y "ROSARIO F KITS" en
micro-texto alrededor. A 16 px ese anillo es una mancha, asi que el favicon usa
**solo el monograma**. Un favicon no es el logo achicado: es la marca reducida
a lo que sobrevive en 16 pixeles.

De donde sale el recorte: midiendo la tinta por anillo, el monograma termina en
el radio 0.55 y el texto circular arranca en 0.60. Entre medio no hay nada, asi
que cortar en 0.575 los separa sin tocar ninguno de los dos.

Se usa el logo NEGRO como fuente, no el blanco: al blanco lo generamos en su
momento desde un gris y le quedo un halo en el canal alfa que ensucia el
recorte. Del negro sale una mascara limpia, y el blanco se pinta aca.
"""
import os

from PIL import Image, ImageDraw, ImageOps

ORIGEN = "C:/Users/facuq/Desktop/RosarioFkits/Logos/53a9f494-db48-4a44-b702-1cd7f03f2ab9.png"
DESTINO = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "app")

NAVY = (16, 35, 59)      # --color-navy del sitio
CORTE = 0.575            # radio, en fracciones de la mitad del ancho
MARGEN = 0.12            # aire alrededor del monograma
RADIO = 0.20             # redondeo de la caja

# ------------------------------------------------- aislar el monograma
plano = Image.open(ORIGEN).convert("L")
L = plano.size[0]
tinta = ImageOps.invert(plano)                       # el negro del logo pasa a 255

circulo = Image.new("L", (L, L), 0)
r = int(L / 2 * CORTE)
ImageDraw.Draw(circulo).ellipse([L // 2 - r, L // 2 - r, L // 2 + r, L // 2 + r], fill=255)

solo_mono = Image.new("L", (L, L), 0)
solo_mono.paste(tinta, (0, 0), circulo)
caja = solo_mono.point(lambda v: 255 if v > 60 else 0).getbbox()
mascara = solo_mono.crop(caja)

blanco = Image.new("RGBA", mascara.size, (255, 255, 255, 255))
blanco.putalpha(mascara)


def icono(tam, margen=MARGEN, radio=RADIO):
    caja_ic = Image.new("RGBA", (tam, tam), (0, 0, 0, 0))
    ImageDraw.Draw(caja_ic).rounded_rectangle(
        [0, 0, tam - 1, tam - 1], radius=int(tam * radio), fill=NAVY + (255,)
    )
    util = int(tam * (1 - margen * 2))
    m = blanco.copy()
    m.thumbnail((util, util), Image.LANCZOS)
    caja_ic.paste(m, ((tam - m.size[0]) // 2, (tam - m.size[1]) // 2), m)
    return caja_ic


# Next detecta estos tres nombres en app/ y arma los <link> solo
icono(512).convert("RGB").save(os.path.join(DESTINO, "icon.png"))
# iOS le pone su propio redondeo y no admite transparencia: cuadrado lleno
icono(180, radio=0).convert("RGB").save(os.path.join(DESTINO, "apple-icon.png"))
# El .ico lleva una imagen por tamano. Cuanto mas chico, menos aire: a 16 px
# cada pixel de margen es un pixel menos de marca, y ahi se juega la lectura.
CHICOS = [(48, 0.08, 0.18), (32, 0.06, 0.16), (16, 0.04, 0.14)]
icono(256).save(
    os.path.join(DESTINO, "favicon.ico"),
    sizes=[(256, 256)] + [(t, t) for t, _, _ in CHICOS],
    append_images=[icono(t, margen=mg, radio=rd) for t, mg, rd in CHICOS],
)

print("monograma aislado:", mascara.size)
for n in ("icon.png", "apple-icon.png", "favicon.ico"):
    p = os.path.join(DESTINO, n)
    print(f"  {n:<16} {os.path.getsize(p) // 1024} KB")
