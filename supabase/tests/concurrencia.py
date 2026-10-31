"""Dos ventas simultáneas de la última unidad: una tiene que fallar.

No entra en pgTAP porque necesita dos conexiones a la vez. Corre contra la base LOCAL
(npx supabase start) y deja todo como estaba:

    python supabase/tests/concurrencia.py

Simula a Facu y Vani cargando la misma camiseta en el mismo momento: las dos
transacciones arrancan, la primera vende y confirma, y la segunda —que estaba esperando
el bloqueo del SKU— tiene que recibir "Sin stock" en vez de vender una unidad que ya
no existe.
"""

import sys
import threading

import psycopg

URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
SKU = 9901
CLAIMS = '{"sub":"00000000-0000-0000-0000-000000000001","email":"concurrencia@test.com","role":"authenticated"}'


def preparar(c):
    c.execute("set erp.migrando = 'off'")
    c.execute("insert into admins (email) values ('concurrencia@test.com') on conflict do nothing")
    c.execute("insert into proveedores (nombre) values ('Concurrencia') on conflict do nothing")
    c.execute("""insert into modelos (nombre, categoria, tipo, linea)
                 values ('Camiseta Concurrencia', 'Camiseta', 'FAN', 'Clubes') on conflict do nothing""")
    c.execute(f"""insert into skus (sku, modelo_id, talle, precio)
                  select {SKU}, id, 'M', 30000 from modelos where nombre = 'Camiseta Concurrencia'""")
    c.execute("""insert into pedidos (id, fecha, proveedor_id, estado, recibido_en)
                 select 'P-990', '2026-10-01', id, 'Recibido', '2026-10-02' from proveedores
                 where nombre = 'Concurrencia'""")
    c.execute(f"""insert into pedido_items (pedido_id, sku, cantidad, cantidad_recibida, costo_unit)
                  values ('P-990', {SKU}, 1, 1, 15000)""")
    c.execute("insert into clientes (id, nombre) values ('C-990', 'Concurrencia')")


def limpiar(c):
    c.execute(f"delete from caja_movimientos where pago_id in "
              f"(select p.id from pagos p join venta_items vi on vi.venta_id = p.venta_id where vi.sku = {SKU})")
    c.execute(f"delete from pagos where venta_id in (select venta_id from venta_items where sku = {SKU})")
    c.execute(f"delete from ventas where id in (select venta_id from venta_items where sku = {SKU})")
    c.execute("delete from ventas where cliente_id = 'C-990'")
    c.execute("delete from clientes where id = 'C-990'")
    c.execute("delete from pedido_items where pedido_id = 'P-990'")
    c.execute("delete from pedidos where id = 'P-990'")
    c.execute(f"delete from skus where sku = {SKU}")
    c.execute("delete from modelos where nombre = 'Camiseta Concurrencia'")
    c.execute("delete from proveedores where nombre = 'Concurrencia'")
    c.execute("delete from admins where email = 'concurrencia@test.com'")


def vender(nombre, arranque, primero_vendio, resultados):
    with psycopg.connect(URL) as c:
        c.execute("select set_config('request.jwt.claims', %s, false)", (CLAIMS,))
        with c.transaction():
            arranque.wait()
            if nombre == "Vani":
                # Vani entra cuando Facu ya tomó el bloqueo pero todavía no confirmó.
                primero_vendio.wait()
            try:
                v = c.execute(
                    f"""select registrar_venta('{{"id":"C-990"}}', '[{{"sku":{SKU}}}]', 'Reservada')"""
                ).fetchone()[0]
                if nombre == "Facu":
                    primero_vendio.set()
                    # Sostener la transacción abierta un rato, con el SKU bloqueado.
                    c.execute("select pg_sleep(1.5)")
                resultados[nombre] = ("vendió", v)
            except psycopg.Error as e:
                resultados[nombre] = ("rechazada", e.diag.message_primary)
                raise


def main():
    with psycopg.connect(URL, autocommit=True) as c:
        with c.transaction():
            limpiar(c)
            preparar(c)
    arranque, primero = threading.Event(), threading.Event()
    resultados = {}
    hilos = [threading.Thread(target=lambda n=n: _seguro(vender, n, arranque, primero, resultados))
             for n in ("Facu", "Vani")]
    for h in hilos:
        h.start()
    arranque.set()
    for h in hilos:
        h.join()
    with psycopg.connect(URL, autocommit=True) as c:
        disponible = c.execute(f"select disponible from v_stock where sku = {SKU}").fetchone()[0]
        with c.transaction():
            limpiar(c)

    print(resultados, "disponible final:", disponible)
    ok = (resultados.get("Facu", ("",))[0] == "vendió"
          and resultados.get("Vani", ("",))[0] == "rechazada"
          and "Sin stock" in resultados["Vani"][1]
          and disponible == 0)
    print("OK: la segunda venta de la última unidad se rechazó" if ok else "FALLA")
    sys.exit(0 if ok else 1)


def _seguro(f, *args):
    try:
        f(*args)
    except psycopg.Error:
        pass


if __name__ == "__main__":
    main()
