# Panel de control MEKAMONO (APARECE · Plan Negocio)

PHP + MySQL en el mismo hosting de Hostinger. Se abre en `https://apareceweb.com/demos/mekamono/panel/` (enlace "Acceso" en el menú de la web).

## Qué incluye
- **Inicio**: ventas del día y del mes, por cobrar, gastos, pedidos web por confirmar, citas de hoy, productos por agotarse, trabajos en grabado.
- **Punto de venta**: búsqueda y categorías, variantes, texto de grabado, descuento, efectivo/tarjeta/transferencia, cambio, anticipos, ticket imprimible (80 mm) y por WhatsApp.
- **Ventas y pedidos**: historial con filtros, pedidos de la web (carrito, Mekamono Lab y pago con tarjeta), cobros parciales, estado de entrega, cancelaciones, carritos sin terminar.
- **Inventario**: los productos de la web; existencia mínima con aviso de faltantes, ajustes con historial, entradas de mercancía ligadas a proveedor y gasto, alta y edición de productos con fotos. **Lo que se guarda aquí es lo que muestra la tienda en línea** (precios, existencias, productos visibles).
- **Clientes** con historial, **Agenda** (incluye citas desde la web), **Cotizaciones** (imprimir/WhatsApp/convertir en venta).
- **Gastos** y **Proveedores**.
- **Reportes** por mes, producto, categoría, vendedor, forma de pago y canal, con descarga a Excel (CSV), y **Reporte mensual** imprimible/PDF.
- **Usuarios**: hasta 8 activos. Rol Dueño (todo) o Vendedor (sin gastos, reportes, costos ni usuarios).

## Inventario sin desfases
- Venta en mostrador: descuenta al cobrar.
- Pedido web (WhatsApp o tarjeta): **aparta** las piezas al llegar. Si se cancela en el panel, regresan.
- Pago con tarjeta no completado en 2 horas: se cancela solo y libera las piezas. Si el pago llega después, se reactiva.
- La web lee el catálogo de `panel/api/catalogo.php`; si el panel no responde usa `productos.js` como respaldo.

## Instalación (una vez)
1. Crear base de datos MySQL en hPanel.
2. Copiar `config.ejemplo.php` a `/home/<usuario>/domains/apareceweb.com/mekamono-panel.config.php` (fuera de public_html) con los datos reales.
3. Abrir `panel/instalar.php`, escribir la clave de instalación y crear la cuenta del Dueño. Importa los productos de `productos.js`.

## Endpoints para la web (POST JSON)
`api/pedido.php`, `api/carrito.php`, `api/cita.php`; `api/catalogo.php` (GET, JavaScript). Para el módulo de pagos: `inc/catalogo.php` (`mk_catalogo()`) e `inc/pagos.php` (`mk_pedido_pagado()`). Avisos: `inc/notificar.php` (en pausa).

Fotos subidas desde el panel: `public_html/demos/mekamono-subidas/` (fuera de la carpeta que se publica desde Git).
