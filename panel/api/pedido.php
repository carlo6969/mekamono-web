<?php
/* POST {origen, sid, nombre, whatsapp, entrega, cp, items:[{key,id,n,opts,price,qty,eng}], subtotal, notas}
 * Guarda el pedido de la web en el panel (estado "pedido": no descuenta inventario hasta que se confirma). */
declare(strict_types=1);
require __DIR__ . '/_publico.php';
require dirname(__DIR__) . '/inc/inventario.php';
$b = publico_post('pedido', 30);
mk_liberar_vencidos();
$items = is_array($b['items'] ?? null) ? array_slice($b['items'], 0, 50) : [];
if (!$items) fail('Pedido vacío');
$nombre = t($b['nombre'] ?? '', 160); $tel = tel_limpio(t($b['whatsapp'] ?? '', 20));
mk_db()->beginTransaction();
$cid = cliente_web($nombre, $tel);
$sub = 0; $lineas = [];
foreach ($items as $it) {
    if (!is_array($it)) continue;
    $c = max(1, min(99, (int) ($it['qty'] ?? 1)));
    $v = variante_web($it['id'] ?? null, t($it['opts'] ?? ''));
    // El precio lo pone el panel (no se confía en el que manda el navegador), salvo artículos del Lab.
    $precio = $v ? (float) $v['precio'] : max(0, round((float) ($it['price'] ?? 0), 2));
    $eng = is_array($it['eng'] ?? null) ? implode(' | ', array_filter(array_map(fn($x) => t($x, 120), $it['eng']))) : '';
    $lineas[] = ['variante_id' => $v ? (int) $v['id'] : null, 'descripcion' => $v ? $v['pn'] . ($v['etiqueta'] ? ' · ' . $v['etiqueta'] : '') : t($it['n'] ?? 'Artículo') . (($o = t($it['opts'] ?? '')) ? ' · ' . $o : ''),
        'grabado' => $eng ? mb_substr($eng, 0, 255) : null, 'cantidad' => $c, 'precio' => $precio, 'costo' => $v ? (float) $v['costo'] : 0];
    $sub += $precio * $c;
}
$entrega = ($b['entrega'] ?? '') === 'envio' ? 'envio' : 'tienda';
// Envío cotizado en la web (Envia.com): se agrega como concepto.
if ($entrega === 'envio' && is_array($b['envio'] ?? null) && (float) ($b['envio']['precio'] ?? 0) > 0) {
    $pe = round((float) $b['envio']['precio'], 2);
    $lineas[] = ['variante_id' => null, 'descripcion' => 'Envío' . (($d = t($b['envio']['desc'] ?? '', 120)) ? ' · ' . $d : ''), 'grabado' => null, 'cantidad' => 1, 'precio' => $pe, 'costo' => 0];
    $sub += $pe;
}
$tarjeta = ($b['metodo'] ?? '') === 'mercadopago';
$folio = folio('V', 'ventas');
$origen = ($b['origen'] ?? '') === 'lab' ? 'Mekamono Lab' : 'carrito';
$vid = insert('ventas', ['folio' => $folio, 'fecha' => ahora(), 'cliente_id' => $cid, 'nombre' => $nombre ?: null, 'telefono' => $tel ?: null, 'usuario_id' => null,
    'canal' => 'web', 'estado' => 'pedido', 'entrega' => 'pendiente', 'envio' => $entrega, 'cp' => t($b['cp'] ?? '', 10) ?: null,
    'subtotal' => round($sub, 2), 'descuento' => 0, 'total' => round($sub, 2), 'pagado' => 0, 'costo' => 0,
    'notas' => trim('Desde la web (' . $origen . ')' . ($tarjeta ? ' · esperando pago con tarjeta (Mercado Pago)' : ' · por WhatsApp')
        . (($dir = t($b['direccion'] ?? '', 300)) ? "\nDirección: " . $dir : '') . (($n = t($b['notas'] ?? '', 800)) ? "\n" . $n : '')),
    'sid' => t($b['sid'] ?? '', 64) ?: null, 'metodo_web' => $tarjeta ? 'mercadopago' : 'whatsapp', 'inventario_aplicado' => 1]);
// Las piezas se apartan desde que llega el pedido para que la web no venda lo que ya no hay.
// Si el pedido se cancela en el panel, regresan al inventario.
foreach ($lineas as $l) { insert('venta_items', $l + ['venta_id' => $vid]); if ($l['variante_id']) mover($l['variante_id'], -$l['cantidad'], 'apartado web', $folio); }
if (!empty($b['sid'])) q("UPDATE carritos SET estado='recuperado', actualizado=? WHERE sid=?", [ahora(), t($b['sid'], 64)]);
mk_db()->commit();
mk_notificar('pedido', ['folio' => $folio, 'nombre' => $nombre, 'telefono' => $tel, 'total' => round($sub, 2), 'entrega' => $entrega, 'items' => $lineas]);
json_out(['ok' => true, 'folio' => $folio]);
