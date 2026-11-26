<?php
/* POST {sid, nombre, whatsapp, items, subtotal}: guarda el carrito para dar seguimiento si no se completa. */
declare(strict_types=1);
require __DIR__ . '/_publico.php';
$b = publico_post('carrito', 120);
$sid = t($b['sid'] ?? '', 64);
if (!$sid) fail('Falta sid');
$items = is_array($b['items'] ?? null) ? array_slice($b['items'], 0, 50) : [];
$limpio = array_map(fn($i) => ['id' => $i['id'] ?? null, 'n' => t($i['n'] ?? ''), 'opts' => t($i['opts'] ?? ''), 'price' => (float) ($i['price'] ?? 0), 'qty' => (int) ($i['qty'] ?? 1)], array_filter($items, 'is_array'));
$d = ['nombre' => t($b['nombre'] ?? '', 160) ?: null, 'telefono' => tel_limpio(t($b['whatsapp'] ?? '', 20)) ?: null, 'items' => json_encode($limpio, JSON_UNESCAPED_UNICODE),
    'subtotal' => round((float) ($b['subtotal'] ?? 0), 2), 'actualizado' => ahora()];
$id = val('SELECT id FROM carritos WHERE sid=?', [$sid]);
if ($id) { q("UPDATE carritos SET nombre=?, telefono=?, items=?, subtotal=?, actualizado=? WHERE id=? AND estado IN ('abierto','contactado')", [...array_values($d), $id]); }
else { insert('carritos', $d + ['sid' => $sid, 'estado' => 'abierto', 'creado' => ahora()]); mk_notificar('carrito', $d); }
json_out(['ok' => true]);
