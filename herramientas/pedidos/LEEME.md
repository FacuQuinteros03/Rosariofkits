# Pedidos al proveedor

Un pedido que todavía no llegó vive en `lib/pedido-en-camino.json`. De ahí salen dos cosas:

- **La carga en la base**, con `armar_sql.py`.
- **La sección "En camino" de la portada**: muestra solo los modelos de ese archivo que en la base
  están en `Preventa`. El pedido a China, que también está en Preventa, no aparece.

## Cargar un pedido

1. Editar `lib/pedido-en-camino.json`: modelos, talles, precios y costo.
2. `python herramientas/pedidos/armar_sql.py`
3. Abrir Supabase → SQL Editor, pegar entero `herramientas/pedidos/pedido-en-camino.sql` y
   tocar **Run**. Abajo muestra la tabla de SKU creados: con esos números van las fotos
   (`python herramientas/agregar-foto.py 8001 "ruta/a/la/foto.jpg"`).
4. En /admin → Ventas ya se puede vender: las unidades del pedido cuentan como disponibles.

**Correrlo una sola vez.** Dos veces crea dos pedidos.

## Cuando llega

En Supabase → SQL Editor (cambiar `P-XXX` por el número de pedido que mostró la carga):

```sql
begin;
set local request.jwt.claims = '{"role":"service_role"}';
-- Si llegó todo, así. Si faltó algo, pasar lo recibido por SKU:
-- select recibir_pedido('P-XXX', '[{"sku": 8001, "cantidad": 0}]');
select recibir_pedido('P-XXX');
update skus set estado_pub = 'Stock'
where sku in (select sku from pedido_items where pedido_id = 'P-XXX') and estado_pub = 'Preventa';
commit;
```

Después vaciar `"modelos"` en `lib/pedido-en-camino.json` (o cargar el pedido siguiente). Las
camisetas pasan solas de "En camino" al catálogo.
