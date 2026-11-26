<?php
declare(strict_types=1);
/* Avisos a MekaMono cuando llega un pedido, una cita o un carrito con WhatsApp.
 * En pausa por indicación de Carlo: no hace nada todavía. Nunca debe romper el guardado.
 * $tipo: 'pedido' | 'cita' | 'carrito'. $datos: arreglo con lo guardado (folio, nombre, telefono, total...).
 * Configuración disponible: mk_config()['callmebot_apikey'], ['callmebot_phone'], ['notificar_email']. */
function mk_notificar(string $tipo, array $datos): void {
    try {
        // Pendiente de aprobación.
    } catch (Throwable $e) { /* silencioso */ }
}
