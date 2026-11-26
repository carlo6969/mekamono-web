<?php
/*
 * EJEMPLO. No pongas datos reales aquí: este repositorio es público.
 * Copia estas claves dentro del archivo de configuración del panel, que vive FUERA de public_html:
 *   /home/<usuario>/domains/apareceweb.com/mekamono-panel.config.php
 * (el mismo archivo que usa el panel para MySQL; devuelve un array PHP).
 */
return [
    // Mercado Pago → Tu negocio → Configuración → Credenciales de producción
    'mp_access_token'   => 'APP_USR-xxxxxxxxxxxxxxxx',   // obligatorio para cobrar
    'mp_webhook_secret' => '',                            // opcional: clave secreta de Webhooks (Tus integraciones)

    // Envia.com → Configuración → API → Token
    'envia_api_key'  => 'xxxxxxxxxxxxxxxx',
    'envia_env'      => 'sandbox',            // 'sandbox' para probar, 'production' para cobrar guías reales
    'envia_carriers' => ['estafeta', 'fedex', 'dhl', 'paquetexpress'],

    // Dirección desde donde salen los paquetes (la tienda)
    'origen' => [
        'name' => 'MEKAMONO', 'company' => 'MEKAMONO', 'email' => 'mekamono.mx@gmail.com', 'phone' => '5659206025',
        'street' => 'Av. Revolución', 'number' => '503 Local C', 'district' => 'Periodistas',
        'city' => 'Pachuca de Soto', 'state' => 'HG', 'postalCode' => '42060',
    ],

    // Caja estándar y peso (kg) para cotizar
    'paquete' => ['largo' => 20, 'ancho' => 15, 'alto' => 8, 'peso_base' => 0.2, 'peso_por_pieza' => 0.08],

    // URL pública de la tienda (con / al final)
    'sitio_url' => 'https://apareceweb.com/demos/mekamono/',
];
