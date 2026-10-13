"""Escribe el libro de consulta ERP_RosarioFkits_consulta (diseño 6.5): simple y por mes.

Hojas:
  STOCK      una fila por camiseta y talle, como el libro viejo
  RESUMEN    una fila por mes
  AAAA-MM    una por mes: totales arriba, las ventas, y los movimientos de caja

Solo valores, nada de fórmulas. Todo se pisa cada vez: el libro es para mirar.

Variables de entorno:
  SUPABASE_DB_URL     cadena del Session pooler
  GOOGLE_SA_JSON      el JSON de la cuenta de servicio (contenido, no ruta), o
  GOOGLE_SA_FILE      la ruta al JSON
  CONSULTA_ID         id del libro ERP_RosarioFkits_consulta

    python exportar_consulta.py            # escribe el libro
    python exportar_consulta.py --seco     # muestra lo que escribiría, sin tocar nada
"""

import json
import os
import sys
from datetime import date, datetime
from decimal import Decimal
from zoneinfo import ZoneInfo

import psycopg

MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
         "septiembre", "octubre", "noviembre", "diciembre"]


def celda(v):
    if v is None:
        return ""
    if isinstance(v, Decimal):
        return int(v) if v == v.to_integral_value() else float(round(v, 2))
    if isinstance(v, (date, datetime)):
        return v.strftime("%d/%m/%Y")
    if isinstance(v, bool):
        return "sí" if v else "no"
    return v


def consultar(c, sql, *args):
    cur = c.execute(sql, args)
    return [[celda(x) for x in fila] for fila in cur.fetchall()]


def armar_hojas(c):
    ahora = datetime.now(ZoneInfo("America/Argentina/Buenos_Aires")).strftime("%d/%m/%Y %H:%M")
    aviso = [f"Actualizado: {ahora}. No editar: se pisa todas las noches. Para cargar, usá /admin."]
    hojas = {}

    hojas["STOCK"] = [aviso, [],
        ["SKU", "Producto", "Categoría", "Precio", "Comprado", "Vendido", "En casa", "Disponible", "Publicado"],
        *consultar(c, """select sku, producto, categoria, precio, comprado, vendido, en_casa,
                                disponible, publicado
                         from v_consulta_stock order by producto, sku""")]

    resumen = consultar(c, """select mes, ventas, unidades, facturado, ganancia, cobrado, aportes,
                                     gastos, caja_del_mes, caja_al_cierre
                              from v_resumen_mensual order by mes desc""")
    hojas["RESUMEN"] = [aviso, [],
        ["Mes", "Ventas", "Unidades", "Facturado", "Ganancia", "Cobrado", "Aportes",
         "Pagos y gastos", "Caja del mes", "Caja al cierre"],
        *[[nombre_mes(f[0])] + f[1:] for f in resumen]]

    for f in resumen:
        mes = datetime.strptime(f[0], "%d/%m/%Y").date()
        ventas = consultar(c, """select fecha, venta_id, cliente, detalle, unidades, total, pagado,
                                        debe, estado, canal
                                 from v_consulta_ventas where mes = %s order by fecha, venta_id""", mes)
        caja = consultar(c, """select fecha, tipo::text, categoria::text, monto, metodo::text,
                                      coalesce(pedido_id, pago_id, ''), coalesce(nota, '')
                               from caja_movimientos
                               where date_trunc('month', fecha)::date = %s
                               order by fecha, id""", mes)
        hojas[mes.strftime("%Y-%m")] = [
            aviso, [],
            [nombre_mes(f[0]).capitalize()],
            ["Ventas", f[1]], ["Unidades", f[2]], ["Facturado", f[3]], ["Ganancia", f[4]],
            ["Cobrado", f[5]], ["Aportes", f[6]], ["Pagos y gastos", f[7]],
            ["Caja del mes", f[8]], ["Caja al cierre", f[9]],
            [],
            ["VENTAS"],
            ["Fecha", "Venta", "Cliente", "Qué llevó", "Unidades", "Total", "Pagado", "Debe",
             "Estado", "Canal"],
            *ventas,
            [],
            ["CAJA"],
            ["Fecha", "Tipo", "Categoría", "Monto", "Medio", "Referencia", "Nota"],
            *caja,
        ]
    return hojas


def nombre_mes(dd_mm_aaaa):
    d = datetime.strptime(dd_mm_aaaa, "%d/%m/%Y")
    return f"{MESES[d.month - 1]} {d.year}"


def escribir(hojas, libro_id):
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    if os.environ.get("GOOGLE_SA_JSON"):
        info = json.loads(os.environ["GOOGLE_SA_JSON"])
        cred = service_account.Credentials.from_service_account_info(
            info, scopes=["https://www.googleapis.com/auth/spreadsheets"])
    else:
        cred = service_account.Credentials.from_service_account_file(
            os.environ["GOOGLE_SA_FILE"], scopes=["https://www.googleapis.com/auth/spreadsheets"])
    api = build("sheets", "v4", credentials=cred, cache_discovery=False).spreadsheets()

    existentes = {h["properties"]["title"]: h["properties"]["sheetId"]
                  for h in api.get(spreadsheetId=libro_id).execute()["sheets"]}

    # Orden: STOCK, RESUMEN y los meses del más nuevo al más viejo.
    orden = ["STOCK", "RESUMEN"] + sorted((t for t in hojas if t not in ("STOCK", "RESUMEN")), reverse=True)
    pedidos = [{"addSheet": {"properties": {"title": t}}} for t in orden if t not in existentes]
    if pedidos:
        api.batchUpdate(spreadsheetId=libro_id, body={"requests": pedidos}).execute()
        existentes = {h["properties"]["title"]: h["properties"]["sheetId"]
                      for h in api.get(spreadsheetId=libro_id).execute()["sheets"]}

    for t in orden:
        api.values().clear(spreadsheetId=libro_id, range=f"'{t}'").execute()
        api.values().update(spreadsheetId=libro_id, range=f"'{t}'!A1",
                            valueInputOption="RAW", body={"values": hojas[t]}).execute()

    formato = []
    for i, t in enumerate(orden):
        sid = existentes[t]
        formato.append({"updateSheetProperties": {
            "properties": {"sheetId": sid, "index": i}, "fields": "index"}})
        # Encabezados en negrita: la fila 3 en STOCK y RESUMEN; en los meses, los títulos.
        filas = [2] if t in ("STOCK", "RESUMEN") else [
            n for n, fila in enumerate(hojas[t]) if fila and fila[0] in
            ("VENTAS", "CAJA", "Fecha") or n == 2]
        for n in filas:
            formato.append({"repeatCell": {
                "range": {"sheetId": sid, "startRowIndex": n, "endRowIndex": n + 1},
                "cell": {"userEnteredFormat": {"textFormat": {"bold": True}}},
                "fields": "userEnteredFormat.textFormat.bold"}})
    # Si quedó la "Hoja 1" vacía del libro nuevo, se borra.
    for vieja in ("Hoja 1", "Sheet1"):
        if vieja in existentes and vieja not in hojas:
            formato.append({"deleteSheet": {"sheetId": existentes[vieja]}})
    api.batchUpdate(spreadsheetId=libro_id, body={"requests": formato}).execute()


def main():
    seco = "--seco" in sys.argv
    with psycopg.connect(os.environ["SUPABASE_DB_URL"]) as c:
        hojas = armar_hojas(c)
    if seco:
        for t, filas in hojas.items():
            print(f"===== {t} ({len(filas)} filas)")
            for f in filas[:12]:
                print("\t".join(str(x) for x in f))
        return
    escribir(hojas, os.environ["CONSULTA_ID"])
    print("Libro de consulta actualizado:", ", ".join(hojas))


if __name__ == "__main__":
    main()
