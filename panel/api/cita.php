<?php
/* POST {nombre, whatsapp, fecha:'YYYY-MM-DD', hora, motivo}: cita de visita/grabado desde la agenda de la web. */
declare(strict_types=1);
require __DIR__ . '/_publico.php';
$b = publico_post('cita', 20);
$fecha = t($b['fecha'] ?? '', 10);
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fecha)) fail('Fecha no válida');
$nombre = t($b['nombre'] ?? '', 160); $tel = tel_limpio(t($b['whatsapp'] ?? '', 20));
$cid = cliente_web($nombre, $tel);
$id = insert('citas', ['cliente_id' => $cid, 'nombre' => $nombre ?: 'Cliente web', 'telefono' => $tel ?: null, 'fecha' => $fecha, 'hora' => t($b['hora'] ?? '', 10),
    'motivo' => t($b['motivo'] ?? ''), 'estado' => 'pendiente', 'origen' => 'web', 'notas' => '', 'creado' => ahora()]);
mk_notificar('cita', ['nombre' => $nombre, 'telefono' => $tel, 'fecha' => $fecha, 'hora' => t($b['hora'] ?? '', 10), 'motivo' => t($b['motivo'] ?? '')]);
json_out(['ok' => true, 'id' => $id]);
