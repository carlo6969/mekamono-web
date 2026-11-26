<?php
/* Lo llama pagos/webhook.php cuando Mercado Pago confirma un pago aprobado.
 * Marca como pagado el pedido web con ese sid. Es seguro llamarlo varias veces con el mismo pago. */
declare(strict_types=1);
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/inventario.php';

function mk_pedido_pagado(string $sid, array $pago): void {
    if ($sid === '' || ($pago['estado'] ?? '') !== 'approved') return;
    $ref = 'MP:' . (string) ($pago['id'] ?? '');
    if (val('SELECT 1 FROM pagos WHERE notas=?', [$ref])) return;          // ya registrado
    // El más reciente con ese sid; si se canceló (p. ej. liberado por no pagar a tiempo) y el pago llegó después, se reactiva.
    $v = row("SELECT * FROM ventas WHERE sid=? AND canal='web' ORDER BY id DESC LIMIT 1", [$sid]);
    if (!$v) return;
    $monto = round(min((float) ($pago['monto'] ?? 0), (float) $v['total'] - (float) $v['pagado']), 2);
    mk_db()->beginTransaction();
    if ($monto > 0) insert('pagos', ['venta_id' => $v['id'], 'fecha' => ahora(), 'monto' => $monto, 'metodo' => 'tarjeta', 'usuario_id' => null, 'notas' => $ref]);
    if (!$v['inventario_aplicado'])
        foreach (rows('SELECT * FROM venta_items WHERE venta_id=?', [$v['id']]) as $it) if ($it['variante_id']) mover((int) $it['variante_id'], -(int) $it['cantidad'], 'venta', $v['folio']);
    $pagado = round((float) $v['pagado'] + max(0, $monto), 2);
    q("UPDATE ventas SET pagado=?, estado=?, inventario_aplicado=1, entrega=CASE WHEN entrega='pendiente' THEN 'en_produccion' ELSE entrega END, notas=? WHERE id=?",
        [$pagado, $pagado >= (float) $v['total'] - 0.009 ? 'pagada' : 'pendiente', trim($v['notas'] . ($v['estado'] === 'cancelada' ? "\nReactivado: el pago llegó después de cancelarse." : '') . "\nPagado con Mercado Pago (" . ($pago['metodo'] ?? 'tarjeta') . ', operación ' . ($pago['id'] ?? '') . ')'), $v['id']]);
    mk_db()->commit();
}
