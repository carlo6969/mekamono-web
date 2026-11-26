<?php
/*
 * Crea el cobro en Mercado Pago (Checkout Pro) y devuelve la URL de pago.
 * POST {sid, nombre, whatsapp, entrega:'tienda'|'envio', cp, direccion, envio:'carrier|service', items:[{id,opts,qty,eng}]}
 * Docs: https://www.mercadopago.com.mx/developers/en/reference/online-payments/checkout-pro-preferences/create-preference/post
 */
declare(strict_types=1);
require_once __DIR__ . '/inc/envia.php';

$in = mkp_input();
$token = (string) mkp_c('mp_access_token', '');
if ($token === '') mkp_json(['ok' => false, 'error' => 'pagos_no_configurados']);

$sid = preg_replace('/[^a-z0-9]/i', '', (string) ($in['sid'] ?? '')) ?: bin2hex(random_bytes(6));
$nombre = mkp_str($in['nombre'] ?? '', 80);
$wa = preg_replace('/\D/', '', (string) ($in['whatsapp'] ?? ''));
$entrega = ($in['entrega'] ?? '') === 'envio' ? 'envio' : 'tienda';
$dir = mkp_str($in['direccion'] ?? '', 240);
if ($nombre === '') mkp_json(['ok' => false, 'error' => 'nombre'], 400);

[$lines, $sub, $pz] = mkp_carrito((array) ($in['items'] ?? []));
$items = [];
foreach ($lines as $l) {
    $items[] = ['id' => $l['id'], 'title' => mb_substr($l['n'] . ($l['opts'] ? ' (' . $l['opts'] . ')' : ''), 0, 250),
        'description' => mb_substr($l['eng'] ? 'Grabado: ' . implode(' / ', $l['eng']) : 'MEKAMONO', 0, 250),
        'quantity' => $l['qty'], 'unit_price' => $l['precio'], 'currency_id' => 'MXN'];
}

$envio = null; $cp = '';
if ($entrega === 'envio') {
    $cp = preg_replace('/\D/', '', (string) ($in['cp'] ?? ''));
    [$carrier, $service] = array_pad(explode('|', (string) ($in['envio'] ?? ''), 2), 2, '');
    if (strlen($cp) !== 5 || $carrier === '' || $dir === '') mkp_json(['ok' => false, 'error' => 'datos_envio'], 400);
    $q = mkp_cotizar($cp, $pz, $sub, preg_replace('/[^a-z0-9_-]/i', '', $carrier));
    if ($q['demo']) mkp_json(['ok' => false, 'error' => 'envios_no_configurados']);
    foreach ($q['tarifas'] as $t) if ($t['service'] === $service) { $envio = $t; break; }
    if (!$envio) mkp_json(['ok' => false, 'error' => 'tarifa_cambio'], 409);
    $items[] = ['id' => 'envio', 'title' => 'Envío ' . $envio['desc'], 'quantity' => 1, 'unit_price' => $envio['precio'], 'currency_id' => 'MXN'];
}

$site = (string) mkp_c('sitio_url', '');
if ($site === '') $site = 'https://' . ($_SERVER['HTTP_HOST'] ?? 'apareceweb.com') . rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'] ?? '/demos/mekamono/pagos/x.php')), '/') . '/';
$pref = [
    'items' => $items,
    'payer' => ['name' => $nombre],
    'external_reference' => $sid,
    'notification_url' => $site . 'pagos/webhook.php',
    'back_urls' => ['success' => $site . '?pago=ok', 'failure' => $site . '?pago=error', 'pending' => $site . '?pago=pendiente'],
    'auto_return' => 'approved',
    'statement_descriptor' => 'MEKAMONO',
    'metadata' => ['sid' => $sid, 'nombre' => $nombre, 'whatsapp' => $wa, 'entrega' => $entrega, 'cp' => $cp, 'direccion' => $dir, 'envio' => $envio ? $envio['id'] : ''],
];
$r = mkp_http('POST', 'https://api.mercadopago.com/checkout/preferences',
    ['Content-Type: application/json', 'Authorization: Bearer ' . $token, 'X-Idempotency-Key: ' . $sid . '-' . md5(json_encode($items))], $pref);
$url = $r['json']['init_point'] ?? '';
if (!$url) { mkp_log('error_preferencia', ['sid' => $sid, 'code' => $r['code']]); mkp_json(['ok' => false, 'error' => 'mercadopago'], 502); }

$total = $sub + ($envio['precio'] ?? 0);
mkp_log('preferencia', ['sid' => $sid, 'pref' => $r['json']['id'] ?? '', 'total' => $total, 'nombre' => $nombre, 'whatsapp' => $wa, 'entrega' => $entrega, 'cp' => $cp, 'direccion' => $dir, 'envio' => $envio, 'items' => $lines]);
mkp_json(['ok' => true, 'url' => $url, 'total' => $total, 'envio' => $envio]);
