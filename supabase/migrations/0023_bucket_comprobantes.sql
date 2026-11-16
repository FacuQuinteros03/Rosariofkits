-- ERP Rosario F Kits — 0023: el bucket de los comprobantes de transferencia.
--
-- El carrito sube acá el comprobante de cada pedido web (`V-0040/comprobante.jpg`).
-- Privado y sin políticas: solo lo toca la clave secreta del servidor (/api/pedido
-- para guardar, /admin/comprobante para dar un link firmado de 5 minutos a un admin).
-- Mismos topes que valida /api/pedido: 8 MB, imagen o PDF.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 8 * 1024 * 1024,
        array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
