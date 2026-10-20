"""Puente ERP -> libro viejo: copia las ventas cargadas en /admin a Stock_RosarioFkits.

Hasta el corte, la web de producción descuenta el stock leyendo el libro viejo
(STOCK!Disponible = Stock - SUMIFS de VENTAS). Las ventas que se cargan en el panel
viven solo en Supabase, así que este script las copia a la hoja VENTAS para que la web
las vea. Se apaga el día del corte, cuando la web pasa a leer del ERP.

Qué copia: los ítems de las ventas cargadas desde el panel (ventas.creado_por no nulo).
Las V-0001..V-0032 vinieron de los libros en la migración: ya están en el libro.

Cada fila copiada lleva en VENTAS!M la clave "V-0033 #57" (venta e ítem del ERP). Con eso
el script es idempotente: lo que ya está no se vuelve a escribir, y si en el ERP cambia
la cantidad, el precio, el medio de pago o el cliente, o el ítem se cancela (cantidad 0),
se corrige la fila existente. Nunca borra filas.

Si en STOCK la columna Vendido del SKU está tipeada (el Apps Script del celular la pisa
con un número), le suma la diferencia igual que hace ese script; si es fórmula, no la toca.

Variables de entorno:
  SUPABASE_DB_URL     cadena del Session pooler
  GOOGLE_SA_JSON      el JSON de la cuenta de servicio (contenido, no ruta), o
  GOOGLE_SA_FILE      la ruta al JSON

    python puente_ventas.py            # sincroniza
    python puente_ventas.py --seco     # muestra lo que haría, sin tocar nada
    python puente_ventas.py --vincular V-00041=V-0033#57
                                       # marca una fila cargada a mano como copia de ese ítem
"""

import json
import os
import re
import sys
from zoneinfo import ZoneInfo

import psycopg

LIBRO = "1pmjQafZdaLugqD6xbGaqQgZYz6C696QVk5Z4r05w5W4"  # Stock_RosarioFkits, el que lee la web
AR = ZoneInfo("America/Argentina/Buenos_Aires")
ENCABEZADO_CLAVE = "ERP"

ITEMS = """
select v.id, vi.id, v.creado_en, vi.sku, vi.cantidad, vi.precio_unit, vi.estado::text,
       cl.nombre,
       (select p.metodo::text from pagos p
         where p.venta_id = v.id and p.tipo <> 'Devolucion'
         order by p.fecha, p.id limit 1)
from ventas v
join venta_items vi on vi.venta_id = v.id
join clientes cl on cl.id = v.cliente_id
where v.creado_por is not null
order by v.creado_en, vi.id
"""


def api_sheets():
    from google.oauth2 import service_account
    from googleapiclient.discovery import build
    scopes = ["https://www.googleapis.com/auth/spreadsheets"]
    if os.environ.get("GOOGLE_SA_JSON"):
        cred = service_account.Credentials.from_service_account_info(
            json.loads(os.environ["GOOGLE_SA_JSON"]), scopes=scopes)
    else:
        cred = service_account.Credentials.from_service_account_file(
            os.environ["GOOGLE_SA_FILE"], scopes=scopes)
    return build("sheets", "v4", credentials=cred, cache_discovery=False).spreadsheets()


def leer(api, rango, render="UNFORMATTED_VALUE"):
    r = api.values().get(spreadsheetId=LIBRO, range=rango, valueRenderOption=render,
                         dateTimeRenderOption="SERIAL_NUMBER").execute()
    return r.get("values", [])


def col(fila, i):
    return fila[i] if i < len(fila) else ""


def numero(v):
    if isinstance(v, (int, float)):
        return v
    try:
        return float(str(v).replace(".", "").replace(",", "."))
    except ValueError:
        return 0


def clave(venta, item):
    return f"{venta} #{item}"


def formulas(n):
    # El libro está en es_ES: las fórmulas van con punto y coma (ver la skill rosariofkits-sheet).
    return [f'=IF($C{n}="";"";D{n}*F{n})',
            f'=IF($C{n}="";"";D{n}*E{n})',
            f'=IF($C{n}="";"";G{n}-H{n})',
            f'=IF(OR($C{n}="";G{n}=0);"";IFERROR(I{n}/G{n};""))']


class Libro:
    def __init__(self, api):
        self.api = api
        ventas = leer(api, "VENTAS!A1:M")
        self.enc = next(i for i, f in enumerate(ventas) if str(col(f, 0)).strip() == "ID Venta") + 1
        self.filas = {}          # clave ERP -> (nro de fila, fila)
        self.ultima = self.enc   # última fila con un ID de venta de verdad
        self.ultimo_id = 0
        for i, f in enumerate(ventas[self.enc:], start=self.enc + 1):
            m = re.match(r"V-?(\d+)$", str(col(f, 0)).strip(), re.I)
            if m:
                self.ultima = i
                self.ultimo_id = max(self.ultimo_id, int(m.group(1)))
            k = str(col(f, 12)).strip()
            if k:
                self.filas[k] = (i, f)
        self.tiene_encabezado = str(col(ventas[self.enc - 1], 12)).strip() == ENCABEZADO_CLAVE

        stock = leer(api, "STOCK!A1:I")
        stock_f = leer(api, "STOCK!A1:I", "FORMULA")
        self.stock = {}          # sku -> {fila, nombre, costo, vendido, vendido_tipeado, disponible}
        for i, f in enumerate(stock, start=1):
            sku = str(col(f, 0)).strip()
            if not re.fullmatch(r"\d+", sku):
                continue
            ff = stock_f[i - 1] if i - 1 < len(stock_f) else []
            h_formula, i_formula = str(col(ff, 7)), str(col(ff, 8))
            self.stock[int(sku)] = {"fila": i, "nombre": col(f, 1), "costo": numero(col(f, 3)),
                                    "vendido": numero(col(f, 7)),
                                    "vendido_tipeado": not h_formula.startswith("="),
                                    "disponible_tipeado": not i_formula.startswith("="),
                                    "disponible": numero(col(f, 8))}
        self.cambios = []        # (rango, [[valores]])

    def poner(self, rango, fila):
        self.cambios.append({"range": rango, "values": [fila]})

    def sumar_vendido(self, sku, delta, avisos, problemas):
        s = self.stock[sku]
        if s["disponible_tipeado"] and delta:
            problemas.append(f"STOCK!I{s['fila']} (SKU {sku}): Disponible está tipeado, no es fórmula; "
                             "la web no ve esta venta hasta que se vuelva a poner la fórmula =G-H.")
        s["disponible"] -= delta
        if s["vendido_tipeado"] and delta:
            s["vendido"] += delta
            self.poner(f"STOCK!H{s['fila']}", [s["vendido"]])
            avisos.append(f"  STOCK!H{s['fila']} (SKU {sku}) estaba tipeado: se le suma {delta}.")

    def guardar(self):
        if self.cambios:
            self.api.values().batchUpdate(spreadsheetId=LIBRO, body={
                "valueInputOption": "USER_ENTERED", "data": self.cambios}).execute()


def sincronizar(items, libro, seco):
    hechos, avisos, problemas = [], [], []
    if not libro.tiene_encabezado:
        libro.poner(f"VENTAS!M{libro.enc}", [ENCABEZADO_CLAVE])
        hechos.append(f"Encabezado {ENCABEZADO_CLAVE} en VENTAS!M{libro.enc}.")

    for venta, item, creado, sku, cant, precio, estado, cliente, metodo in items:
        k = clave(venta, item)
        quiere = 0 if estado == "Cancelada" else cant
        precio = float(precio)
        metodo = metodo or ""
        if sku not in libro.stock:
            if quiere and k not in libro.filas:
                problemas.append(f"{k}: el SKU {sku} no existe en STOCK del libro viejo; "
                                 "la web no puede descontarlo. Hay que cargarlo a mano.")
            continue

        if k in libro.filas:
            n, f = libro.filas[k]
            antes = int(numero(col(f, 3)))
            cambia = (antes != quiere or numero(col(f, 5)) != precio
                      or str(col(f, 10)) != metodo or str(col(f, 11)) != cliente)
            if not cambia:
                continue
            libro.poner(f"VENTAS!D{n}", [quiere])
            libro.poner(f"VENTAS!F{n}", [precio])
            libro.poner(f"VENTAS!K{n}:L{n}", [metodo, cliente])
            libro.sumar_vendido(sku, quiere - antes, avisos, problemas)
            hechos.append(f"{k} (fila {n}, SKU {sku}): actualizada"
                          + (f", cantidad {antes} -> {quiere}" if antes != quiere else "") + ".")
            continue

        if not quiere:
            continue   # cancelada antes de copiarse: nada que hacer
        s = libro.stock[sku]
        if s["disponible"] < quiere:
            avisos.append(f"  {k}: el libro tenía {s['disponible']:g} disponibles del SKU {sku} y se "
                          f"venden {quiere}; la web lo va a sacar del catálogo (queda negativo).")
        libro.ultima += 1
        libro.ultimo_id += 1
        n = libro.ultima
        vid = f"V-{libro.ultimo_id:05d}"
        fecha = creado.astimezone(AR).strftime("%d/%m/%Y %H:%M:%S")
        libro.poner(f"VENTAS!A{n}:M{n}",
                    [vid, fecha, sku, quiere, s["costo"], precio, *formulas(n), metodo, cliente, k])
        libro.filas[k] = (n, None)
        libro.sumar_vendido(sku, quiere, avisos, problemas)
        hechos.append(f"{k} -> {vid} (fila {n}): SKU {sku} x{quiere}.")

    if not seco:
        libro.guardar()
    return hechos, avisos, problemas


def vincular(libro, pedido):
    m = re.fullmatch(r"(V-\d+)=(V-\d+)#(\d+)", pedido.replace(" ", ""))
    if not m:
        sys.exit("Formato: --vincular V-00041=V-0033#57")
    vid_libro, venta, item = m.groups()
    ids = leer(libro.api, f"VENTAS!A{libro.enc + 1}:A")
    n = next((i for i, f in enumerate(ids, start=libro.enc + 1) if f and str(f[0]).strip() == vid_libro), None)
    if not n:
        sys.exit(f"No encuentro {vid_libro} en VENTAS.")
    if not libro.tiene_encabezado:
        libro.poner(f"VENTAS!M{libro.enc}", [ENCABEZADO_CLAVE])
    libro.poner(f"VENTAS!M{n}", [clave(venta, int(item))])
    libro.guardar()
    print(f"{vid_libro} (fila {n}) queda vinculada a {clave(venta, int(item))}.")


def main():
    seco = "--seco" in sys.argv
    libro = Libro(api_sheets())
    if "--vincular" in sys.argv:
        vincular(libro, sys.argv[sys.argv.index("--vincular") + 1])
        return
    with psycopg.connect(os.environ["SUPABASE_DB_URL"]) as c:
        items = c.execute(ITEMS).fetchall()
    hechos, avisos, problemas = sincronizar(items, libro, seco)
    print(("[en seco] " if seco else "") + f"{len(items)} ítems del panel; {len(hechos)} cambios.")
    for h in hechos:
        print(" ", h)
    for a in avisos:
        print(a)
    for p in problemas:
        print("PROBLEMA:", p)
    if problemas:
        sys.exit(1)   # el run queda en rojo y GitHub manda el mail


if __name__ == "__main__":
    main()
