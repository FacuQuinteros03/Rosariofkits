# Pedidos al proveedor

Un pedido que ya se vende pero todavía no llegó vive en `lib/pedido-en-camino.json`. De ahí
salen dos cosas:

- **La carga en la base**, con `armar_sql.py`. Las prendas quedan en Stock: se venden desde ya,
  porque las unidades pedidas cuentan como disponibles.
- **El aviso "Llega el martes 24/11"** en la tarjeta y en la ficha de esos modelos. Se apaga
  solo el día de `pedido.llega`.

## Cargar un pedido

1. Editar `lib/pedido-en-camino.json`: modelos, talles, precios, costo y fecha de llegada.
2. `python herramientas/pedidos/armar_sql.py`
3. Abrir Supabase → SQL Editor, pegar entero `herramientas/pedidos/pedido-en-camino.sql` y
   tocar **Run**. Abajo muestra la tabla de SKU: con esos números van las fotos
   (`python herramientas/agregar-foto.py 8001 "ruta/a/la/foto.jpg"`).

**Correrlo una sola vez.** Dos veces crea dos pedidos.

## Cuando llega

En Supabase → SQL Editor (cambiar `P-XXX` por el número que mostró la carga):

```sql
begin;
set local request.jwt.claims = '{"role":"service_role"}';
-- Si llegó todo, así. Si faltó algo, pasar lo recibido por SKU:
-- select recibir_pedido('P-XXX', '[{"sku": 8001, "cantidad": 0}]');
select recibir_pedido('P-XXX');
commit;
```

Si faltó algo que ya estaba vendido, hay que avisarle a esa persona: la base no lo hace sola.
