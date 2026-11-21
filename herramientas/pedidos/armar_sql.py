# -*- coding: utf-8 -*-
"""
Arma el SQL para cargar en la base el pedido de lib/pedido-en-camino.json.

    python herramientas/pedidos/armar_sql.py

Escribe herramientas/pedidos/pedido-en-camino.sql. Ese archivo se pega entero en
Supabase -> SQL Editor -> Run. Ver herramientas/pedidos/LEEME.md.
"""
import json
import os

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
DATOS = os.path.join(RAIZ, "lib", "pedido-en-camino.json")
SALIDA = os.path.join(AQUI, "pedido-en-camino.sql")


def texto(s):
    """Literal de SQL: comillas simples duplicadas."""
    return "'" + str(s).replace("'", "''") + "'"


def main():
    d = json.load(open(DATOS, encoding="utf-8"))
    p = d["pedido"]
    unidades = sum(sum(m["talles"].values()) for m in d["modelos"])
    total = unidades * p["costo_unit"]

    filas = []
    for m in d["modelos"]:
        for talle, cant in m["talles"].items():
            filas.append(
                "    (%s, %s, %s, %s, %s, %s, %d, %s)"
                % (texto(m["nombre"]), texto(m["categoria"]), texto(m["tipo"]), texto(m["linea"]),
                   texto(talle), m["precio"], cant, texto(m["equipo"]) if m.get("equipo") else "null")
            )

    pesos = lambda n: f"{n:,}".replace(",", ".")
    sql = f"""-- Pedido {p['fecha']} a {p['proveedor']}: {unidades} prendas a $ {pesos(p['costo_unit'])} = $ {pesos(total)}.
-- Generado por herramientas/pedidos/armar_sql.py desde lib/pedido-en-camino.json.
-- NO editar a mano: cambiar el JSON y volver a generar.
--
-- Qué hace, todo junto o nada (si algo falla, no queda nada a medias):
--   1. Crea los modelos que no existen (con su equipo). Los que ya existen se reusan.
--   2. Por cada talle: si el modelo ya tiene ese talle sin estampado, usa ese SKU;
--      si no, crea uno nuevo desde el 8001, en Stock: se vende desde ya.
--   3. Crea el pedido (estado Encargado) con el costo por unidad.
-- Al final muestra el pedido creado y los SKU, para nombrar las fotos.
-- Correrlo dos veces crea dos pedidos: mirá en /admin antes de repetir.

begin;

create temp table _carga (
  nombre text, categoria text, tipo text, linea text, talle text, precio numeric, cantidad int, equipo text, sku int
) on commit drop;

insert into _carga (nombre, categoria, tipo, linea, talle, precio, cantidad, equipo) values
{",\n".join(filas)};

do $$
declare
  f        record;
  v_modelo bigint;
  v_sku    int;
  v_prov   bigint;
  v_pedido text;
  v_proximo int := greatest(8000, coalesce((select max(sku) from skus where sku between 8000 and 8999), 8000)) + 1;
begin
  for f in select * from _carga order by nombre, talle loop
    select id into v_modelo from modelos where nombre = f.nombre;
    if v_modelo is null then
      insert into modelos (nombre, categoria, tipo, linea, nuevo)
      values (f.nombre, f.categoria, f.tipo::tipo_producto, f.linea::linea, true)
      returning id into v_modelo;
    end if;

    -- El equipo, para las métricas por equipo: se crea si no existe y solo se pone si falta.
    if f.equipo is not null then
      insert into equipos (nombre) values (f.equipo) on conflict (nombre) do nothing;
      update modelos set equipo_id = (select id from equipos where nombre = f.equipo)
      where id = v_modelo and equipo_id is null;
    end if;

    select sku into v_sku from skus
    where modelo_id = v_modelo and talle = f.talle and estampado is null
    order by sku limit 1;

    if v_sku is null then
      while exists (select 1 from skus where sku = v_proximo) loop
        v_proximo := v_proximo + 1;
      end loop;
      v_sku := v_proximo;
      v_proximo := v_proximo + 1;
      insert into skus (sku, modelo_id, talle, precio, estado_pub)
      values (v_sku, v_modelo, f.talle, f.precio, 'Stock');
    end if;

    update _carga set sku = v_sku where nombre = f.nombre and talle = f.talle;
  end loop;

  insert into proveedores (nombre) values ({texto(p['proveedor'])}) on conflict (nombre) do nothing;
  select id into v_prov from proveedores where nombre = {texto(p['proveedor'])};

  insert into pedidos (fecha, proveedor_id, costo_mercaderia, notas)
  values (date {texto(p['fecha'])}, v_prov, {total}, {texto(p['notas'])})
  returning id into v_pedido;

  insert into pedido_items (pedido_id, sku, cantidad, costo_unit)
  select v_pedido, sku, sum(cantidad), {p['costo_unit']} from _carga group by sku;

  raise notice 'Pedido % creado', v_pedido;
end $$;

select c.sku, c.nombre, c.talle, c.cantidad, s.estado_pub, s.precio
from _carga c join skus s on s.sku = c.sku
order by c.sku;

commit;
"""
    open(SALIDA, "w", encoding="utf-8").write(sql)
    print(f"{SALIDA}: {unidades} prendas, $ {total:,}".replace(",", "."))


if __name__ == "__main__":
    main()
