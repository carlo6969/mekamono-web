<?php
/* POST {cp, items:[{id,opts,qty}]} → {ok, demo, destino, tarifas:[{id,desc,precio,dias}]} */
declare(strict_types=1);
require_once __DIR__ . '/inc/envia.php';

$in = mkp_input();
$cp = preg_replace('/\D/', '', (string) ($in['cp'] ?? ''));
if (strlen($cp) !== 5) mkp_json(['ok' => false, 'error' => 'cp'], 400);
[, $sub, $pz] = mkp_carrito((array) ($in['items'] ?? []));
$q = mkp_cotizar($cp, $pz, $sub);
if (!$q['tarifas']) mkp_json(['ok' => false, 'error' => 'sin_tarifas', 'destino' => $q['destino']]);
mkp_json(['ok' => true] + $q);
