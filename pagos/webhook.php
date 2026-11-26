<?php
/*
 * Aviso de Mercado Pago (notification_url). Siempre consulta el pago a la API antes de creerle.
 * Si el pago está aprobado: lo anota en la bitácora privada y, si el panel lo ofrece,
 * llama a mk_pedido_pagado($sid, $pago) (panel/inc/pagos.php) para marcar el pedido como pagado.
 */
declare(strict_types=1);
require_once __DIR__ . '/inc/comun.php';

$body = json_decode((string) file_get_contents('php://input', false, null, 0, 20000), true) ?: [];
$type = (string) ($body['type'] ?? $body['topic'] ?? $_GET['type'] ?? $_GET['topic'] ?? '');
$id = (string) ($body['data']['id'] ?? $_GET['data_id'] ?? $_GET['id'] ?? '');
$id = preg_replace('/\D/', '', $id);
$token = (string) mkp_c('mp_access_token', '');

if ($type !== 'payment' || $id === '' || $token === '') mkp_json(['ok' => true, 'ignorado' => true]);

/* Firma opcional (x-signature) si MekaMono configura la clave secreta del webhook */
$secret = (string) mkp_c('mp_webhook_secret', '');
if ($secret !== '') {
    $sig = (string) ($_SERVER['HTTP_X_SIGNATURE'] ?? ''); $rid = (string) ($_SERVER['HTTP_X_REQUEST_ID'] ?? '');
    $parts = []; foreach (explode(',', $sig) as $kv) { [$k, $v] = array_pad(explode('=', trim($kv), 2), 2, ''); $parts[$k] = $v; }
    $manifest = 'id:' . strtolower((string) ($_GET['data_id'] ?? $id)) . ';request-id:' . $rid . ';ts:' . ($parts['ts'] ?? '') . ';';
    if (!hash_equals(hash_hmac('sha256', $manifest, $secret), (string) ($parts['v1'] ?? ''))) { mkp_log('firma_invalida', ['id' => $id]); mkp_json(['ok' => false], 401); }
}

$r = mkp_http('GET', 'https://api.mercadopago.com/v1/payments/' . $id, ['Authorization: Bearer ' . $token]);
$p = (array) ($r['json'] ?? []);
$pago = ['id' => $id, 'estado' => (string) ($p['status'] ?? ''), 'detalle' => (string) ($p['status_detail'] ?? ''),
    'monto' => (float) ($p['transaction_amount'] ?? 0), 'sid' => (string) ($p['external_reference'] ?? ''),
    'metodo' => (string) ($p['payment_method_id'] ?? ''), 'metadata' => (array) ($p['metadata'] ?? [])];
mkp_log('pago', $pago);

if ($pago['estado'] === 'approved' && $pago['sid'] !== '') {
    $hook = __DIR__ . '/../panel/inc/pagos.php';
    if (is_file($hook)) { require_once $hook; if (function_exists('mk_pedido_pagado')) { try { mk_pedido_pagado($pago['sid'], $pago); } catch (Throwable $e) { mkp_log('error_panel', ['sid' => $pago['sid'], 'e' => $e->getMessage()]); } } }
}
mkp_json(['ok' => true]);
