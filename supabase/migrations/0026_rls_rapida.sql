-- Las políticas "admin_lee" llamaban a es_admin() una vez por cada fila leída. Con las
-- vistas anidadas del tablero eso llevaba v_tablero a ~4 s (69 ms sin RLS), y con las
-- consultas del panel en paralelo pasaba el statement_timeout de 8 s del rol
-- authenticated: la consulta se cancelaba y el panel mostraba todo en $0.
-- Envolverla en un subselect hace que Postgres la evalúe una sola vez por consulta
-- (initPlan). La condición es la misma: no cambia quién ve qué.

alter policy admin_lee on ajustes          using ((select es_admin()));
alter policy admin_lee on caja_movimientos using ((select es_admin()));
alter policy admin_lee on clientes         using ((select es_admin()));
alter policy admin_lee on consultas        using ((select es_admin()));
alter policy admin_lee on equipos          using ((select es_admin()));
alter policy admin_lee on eventos          using ((select es_admin()));
alter policy admin_lee on modelos          using ((select es_admin()));
alter policy admin_lee on pagos            using ((select es_admin()));
alter policy admin_lee on parametros       using ((select es_admin()));
alter policy admin_lee on pedido_items     using ((select es_admin()));
alter policy admin_lee on pedidos          using ((select es_admin()));
alter policy admin_lee on proveedores      using ((select es_admin()));
alter policy admin_lee on skus             using ((select es_admin()));
alter policy admin_lee on stock_diario     using ((select es_admin()));
alter policy admin_lee on venta_items      using ((select es_admin()));
alter policy admin_lee on ventas           using ((select es_admin()));
