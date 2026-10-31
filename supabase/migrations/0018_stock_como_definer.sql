-- ERP Rosario F Kits — 0018: el control de stock corre con permisos de la base.
--
-- Los triggers de stock son diferidos: se disparan al confirmar la transacción, ya
-- fuera de la función security definer que cargó la venta, con el rol del usuario
-- logueado (`authenticated`). Ese rol no puede ejecutar verificar_stock (0009 le saca
-- todo), así que cargar una venta desde el panel fallaba con "permission denied for
-- function verificar_stock". Los tests no lo veían porque corren como superusuario y
-- nunca llegan al commit. Encontrado probando el panel el 2026-10-13.
alter function trg_verificar_stock() security definer set search_path = public, pg_temp;
