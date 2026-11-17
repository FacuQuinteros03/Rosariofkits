# Funciones del sitio

Qué hace cada parte y dónde vive. El detalle técnico de la planilla, la ruleta y el ERP está en
`LEEME.md`.

| Función | Qué hace | Dónde |
|---|---|---|
| Catálogo | Stock real por talle, desde la base del ERP (o la planilla). Se refresca cada minuto | `lib/sheets.ts`, `components/Catalogo.tsx` |
| Filtros | Por categoría, talle, equipo y búsqueda | `components/Catalogo.tsx`, `components/EncontraTuEquipo.tsx` |
| Tarjeta de producto | Fotos, etiquetas, precio, talles, pedir y sumar al pedido | `components/ProductCard.tsx` |
| Ficha | Fotos ampliables, talles, preguntas frecuentes, relacionados | `app/producto/[slug]/page.tsx` |
| Pedido | Carrito en el navegador que arma un solo mensaje de WhatsApp | `lib/carrito.ts`, `components/Carrito.tsx` |
| Pago por transferencia | Muestra alias, recibe el comprobante y reserva el stock. Se activa con variables de Vercel | `components/PagoTransferencia.tsx`, `app/api/pedido/route.ts`, `lib/transferencia.ts` |
| Verificación de pagos | "Transferencia a verificar": ver comprobante, Cobrar o Revertir | `/admin` → Ventas |
| Mystery Box | Camiseta sorpresa: el cliente elige versión (Fan $35.000, Player $45.000; la retro va como Player), tipo, talle y qué equipos no quiere. Entra al carrito como un producto más. Solo ofrece talles con stock | `app/mystery-box/page.tsx`, `components/ConfiguradorBox.tsx`, `components/BannerBox.tsx`, `lib/box.ts` |
| Asignar Mystery Box | Las boxes pagadas por transferencia esperan en el panel: ver comprobante, elegir la camiseta (recién ahí es venta y descuenta stock) o rechazar | `/admin/mystery-box`, `supabase/migrations/0025_mystery_box.sql` |
| Encargues | Los agotados siguen visibles y se piden por WhatsApp | `lib/whatsapp.ts` |
| Ruleta | Un cupón firmado por teléfono | `components/Ruleta.tsx`, `app/api/ruleta/route.ts` |
| Portada | Fotos propias que rotan | `components/Hero.tsx`, `components/HeroFotos.tsx`, `lib/portada.ts` |
| Guía de talles | Tabla Fan y Player. Oculta hasta tener medidas reales | `components/GuiaTalles.tsx`, `lib/talles.ts` |
| Legales | Privacidad y botón de arrepentimiento | `app/privacidad`, `app/arrepentimiento`, `lib/legal.ts` |
| Seguridad | Encabezados, límites y validaciones de las rutas públicas | `next.config.ts`, `lib/pedidos-web.ts` |
| Panel | Ventas, stock y caja. Oculto sin sesión | `app/admin` |
