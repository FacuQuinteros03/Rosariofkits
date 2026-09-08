# -*- coding: utf-8 -*-
"""
Mete una foto en public/fotos con el nombre que espera la web.

    python herramientas/agregar-foto.py 3029 "C:/.../Argentina Dorsal.jpeg"
    python herramientas/agregar-foto.py 3029 "C:/.../detalle.jpg" 3

Convencion (la lee lib/sheets.ts, no hay que tocar codigo):

    3029.jpg    el frente, la que sale en la grilla
    3029-2.jpg  el dorso, la que aparece al pasar el mouse
    3029-3.jpg  detalles, y asi hasta 8

Sin posicion, la deja en el primer lugar libre. Arregla la rotacion del EXIF
(las fotos de WhatsApp vienen giradas), limita el lado largo a 1600 px y
guarda sin metadatos.
"""
import os
import sys

from PIL import Image, ImageOps

DESTINO = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "fotos")
LADO_MAX = 1600
CALIDAD = 88
MAX_POR_SKU = 8
EXTENSIONES = (".jpg", ".webp", ".png")


def ruta(sku, pos):
    return os.path.join(DESTINO, f"{sku}.jpg" if pos == 1 else f"{sku}-{pos}.jpg")


def ocupada(sku, pos):
    base = f"{sku}" if pos == 1 else f"{sku}-{pos}"
    return any(os.path.exists(os.path.join(DESTINO, base + e)) for e in EXTENSIONES)


def primer_hueco(sku):
    for p in range(1, MAX_POR_SKU + 1):
        if not ocupada(sku, p):
            return p
    raise SystemExit(f"El SKU {sku} ya tiene {MAX_POR_SKU} fotos.")


def main():
    if len(sys.argv) < 3:
        raise SystemExit(__doc__)

    sku, origen = sys.argv[1].strip(), sys.argv[2]
    if not sku.isdigit():
        raise SystemExit(f'"{sku}" no parece un SKU. Va el numero de la columna SKU del Sheet.')
    if not os.path.isfile(origen):
        raise SystemExit(f"No encuentro el archivo: {origen}")

    pos = int(sys.argv[3]) if len(sys.argv) > 3 else primer_hueco(sku)

    if pos == 1 and ocupada(sku, 1):
        print("OJO: ya hay una foto principal para", sku)
        print("     next/image cachea por URL: reemplazar el archivo con el mismo")
        print("     nombre puede seguir sirviendo la vieja. Si la queres cambiar,")
        print("     borra la actual y guarda la nueva como .webp para forzar otra URL.")

    im = ImageOps.exif_transpose(Image.open(origen)).convert("RGB")
    antes = im.size
    im.thumbnail((LADO_MAX, LADO_MAX), Image.LANCZOS)

    salida = ruta(sku, pos)
    im.save(salida, "JPEG", quality=CALIDAD, subsampling=0, optimize=True)

    etiqueta = {1: "frente", 2: "dorso"}.get(pos, f"extra {pos}")
    print(f"{os.path.basename(salida):<16} {etiqueta:<9} {antes[0]}x{antes[1]} -> "
          f"{im.size[0]}x{im.size[1]}  {os.path.getsize(salida)//1024} KB")


if __name__ == "__main__":
    main()
