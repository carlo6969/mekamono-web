<?php
/* Utilidades de los endpoints públicos que usa la web (sin sesión). */
declare(strict_types=1);
require dirname(__DIR__) . '/inc/db.php';
require dirname(__DIR__) . '/inc/notificar.php';
mk_errores(true);

function publico_post(string $tipo, int $max_por_hora): array {
    header('X-Robots-Tag: noindex');
    $origen = $_SERVER['HTTP_ORIGIN'] ?? '';
    $permitidos = mk_config()['origenes'] ?? [];
    $host = 'http' . (!empty($_SERVER['HTTPS']) ? 's' : '') . '://' . ($_SERVER['HTTP_HOST'] ?? '');
    if ($origen && $origen !== $host && !in_array($origen, $permitidos, true)) fail('Origen no permitido', 403);
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') fail('Usa POST', 405);
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $hace = date('Y-m-d H:i:s', time() - 3600);
    if ((int) val('SELECT COUNT(*) FROM intentos WHERE ip=? AND tipo=? AND fecha>?', [$ip, $tipo, $hace]) >= $max_por_hora) fail('Demasiadas solicitudes, intenta más tarde', 429);
    insert('intentos', ['ip' => $ip, 'tipo' => $tipo, 'fecha' => ahora()]);
    if (mt_rand(1, 50) === 1) q('DELETE FROM intentos WHERE fecha<?', [date('Y-m-d H:i:s', time() - 86400)]);
    $raw = file_get_contents('php://input');
    if (strlen($raw) > 200000) fail('Solicitud demasiado grande', 413);
    $b = json_decode($raw ?: '[]', true);
    if (!is_array($b)) fail('JSON no válido');
    return $b;
}
function t($v, int $max = 255): string { return mb_substr(trim(is_scalar($v) ? (string) $v : ''), 0, $max); }

/* Busca la variante de un artículo del carrito: id de producto (de la web) + opciones "A · B". */
function variante_web($pid, string $opts): ?array {
    if ($pid === null || $pid === '') return null;
    $p = row('SELECT id,nombre FROM productos WHERE ext_id=? OR id=?', [(string) $pid, preg_match('/^mk(\d+)$/', (string) $pid, $m) ? (int) $m[1] : -1]);
    if (!$p) return null;
    $vs = rows('SELECT * FROM variantes WHERE producto_id=? AND activo=1', [$p['id']]);
    $want = array_map('trim', $opts === '' ? [] : explode('·', $opts));
    foreach ($vs as $v) if (json_decode($v['ops'] ?: '[]', true) == $want) return $v + ['pn' => $p['nombre']];
    return count($vs) === 1 ? $vs[0] + ['pn' => $p['nombre']] : null;
}

function cliente_web(string $nombre, string $tel): ?int {
    $tel = tel_limpio($tel);
    if ($tel && ($c = val('SELECT id FROM clientes WHERE telefono=?', [$tel]))) {
        if ($nombre) q("UPDATE clientes SET nombre=? WHERE id=? AND (nombre='' OR nombre='Cliente web')", [$nombre, $c]);
        return (int) $c;
    }
    if (!$tel) return null;
    return insert('clientes', ['nombre' => $nombre ?: 'Cliente web', 'telefono' => $tel, 'notas' => '', 'origen' => 'web', 'creado' => ahora()]);
}
