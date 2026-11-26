<?php
/* MekaMono · Panel de control (APARECE · Plan Negocio)
 * Conexión, configuración y utilidades comunes.
 *
 * La configuración (usuario y contraseña de MySQL) NO vive en el repositorio.
 * Se busca, en este orden:
 *   1) la ruta de la variable de entorno MK_PANEL_CONFIG
 *   2) <carpeta del dominio>/mekamono-panel.config.php  (fuera de public_html)
 * Ver panel/config.ejemplo.php.
 */
declare(strict_types=1);
date_default_timezone_set('America/Mexico_City');

const MK_MAX_USUARIOS = 8;          // Plan Negocio: hasta 8 usuarios
const MK_VERSION = '1.0';

function mk_config(): array {
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    $rutas = [];
    if (getenv('MK_PANEL_CONFIG')) $rutas[] = getenv('MK_PANEL_CONFIG');
    // Sube carpetas hasta encontrar public_html y busca el archivo en la carpeta de arriba (no es pública).
    $d = __DIR__;
    while (($p = dirname($d)) !== $d) {
        if (basename($d) === 'public_html') { $rutas[] = $p . '/mekamono-panel.config.php'; break; }
        $d = $p;
    }
    foreach ($rutas as $r) {
        if ($r && is_file($r)) { $cfg = require $r; return $cfg; }
    }
    $cfg = [];
    return $cfg;
}

function mk_db(): PDO {
    static $pdo = null;
    if ($pdo) return $pdo;
    $c = mk_config();
    if (!$c) throw new RuntimeException('Falta el archivo de configuración del panel (mekamono-panel.config.php).');
    $op = [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC, PDO::ATTR_EMULATE_PREPARES => false];
    if (($c['driver'] ?? 'mysql') === 'sqlite') {
        $pdo = new PDO('sqlite:' . $c['sqlite'], null, null, $op);
        $pdo->exec('PRAGMA foreign_keys=ON');
    } else {
        $dsn = 'mysql:host=' . ($c['host'] ?? 'localhost') . ';port=' . ($c['port'] ?? 3306) . ';dbname=' . $c['db'] . ';charset=utf8mb4';
        $pdo = new PDO($dsn, $c['user'], $c['pass'], $op);
        $pdo->exec("SET time_zone='-06:00'");
    }
    return $pdo;
}

function mk_driver(): string { return (mk_config()['driver'] ?? 'mysql') === 'sqlite' ? 'sqlite' : 'mysql'; }

function q(string $sql, array $p = []): PDOStatement { $s = mk_db()->prepare($sql); $s->execute($p); return $s; }
function rows(string $sql, array $p = []): array { return q($sql, $p)->fetchAll(); }
function row(string $sql, array $p = []): ?array { $r = q($sql, $p)->fetch(); return $r ?: null; }
function val(string $sql, array $p = []) { $r = q($sql, $p)->fetchColumn(); return $r === false ? null : $r; }
function lastid(): int { return (int) mk_db()->lastInsertId(); }
function ahora(): string { return date('Y-m-d H:i:s'); }
function hoy(): string { return date('Y-m-d'); }

function insert(string $tabla, array $d): int {
    $k = array_keys($d);
    q('INSERT INTO ' . $tabla . ' (' . implode(',', $k) . ') VALUES (' . implode(',', array_fill(0, count($k), '?')) . ')', array_values($d));
    return lastid();
}
function update(string $tabla, int $id, array $d): void {
    if (!$d) return;
    $set = implode(',', array_map(fn($k) => "$k=?", array_keys($d)));
    q("UPDATE $tabla SET $set WHERE id=?", [...array_values($d), $id]);
}

function ajuste(string $clave, $def = null) {
    static $cache = null;
    if ($cache === null) { $cache = []; try { foreach (rows('SELECT clave,valor FROM ajustes') as $r) $cache[$r['clave']] = $r['valor']; } catch (Throwable $e) {} }
    return $cache[$clave] ?? $def;
}

function json_out($d, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($d, JSON_UNESCAPED_UNICODE);
    exit;
}
function fail(string $msg, int $code = 400): void { json_out(['ok' => false, 'error' => $msg], $code); }

function body(): array {
    static $b = null;
    if ($b !== null) return $b;
    $raw = file_get_contents('php://input');
    $b = $raw ? (json_decode($raw, true) ?: []) : [];
    if (!$b && $_POST) $b = $_POST;
    return $b;
}

function folio(string $pref, string $tabla): string {
    $n = (int) val("SELECT COUNT(*) FROM $tabla") + 1;
    do { $f = $pref . '-' . str_pad((string) $n, 5, '0', STR_PAD_LEFT); $n++; } while (val("SELECT 1 FROM $tabla WHERE folio=?", [$f]));
    return $f;
}

function tel_limpio(?string $t): string { return substr(preg_replace('/\D+/', '', (string) $t), -10); }

/* Para las páginas del panel: convierte errores en una respuesta clara (no se usa desde pagos/). */
function mk_errores(bool $json): void {
    set_exception_handler(function (Throwable $e) use ($json) {
        error_log('[mekamono-panel] ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
        if (mk_db_activa()) { try { if (mk_db()->inTransaction()) mk_db()->rollBack(); } catch (Throwable $x) {} }
        http_response_code(500);
        if ($json) { header('Content-Type: application/json; charset=utf-8'); echo json_encode(['ok' => false, 'error' => 'Error del servidor. Intenta de nuevo; si sigue, avisa a soporte.']); }
        else echo 'El panel no está disponible en este momento. Intenta de nuevo en unos minutos.';
    });
}
function mk_db_activa(): bool { try { return (bool) mk_config(); } catch (Throwable $e) { return false; } }

/* Libera pedidos web con pago en línea que no se pagaron a tiempo (regresa el inventario apartado). */
function mk_liberar_vencidos(int $horas = 2): void {
    try {
        $lim = date('Y-m-d H:i:s', time() - $horas * 3600);
        foreach (rows("SELECT * FROM ventas WHERE canal='web' AND estado='pedido' AND metodo_web='mercadopago' AND pagado=0 AND fecha<?", [$lim]) as $v) {
            mk_db()->beginTransaction();
            if ($v['inventario_aplicado'])
                foreach (rows('SELECT * FROM venta_items WHERE venta_id=?', [$v['id']]) as $it)
                    if ($it['variante_id']) { q('UPDATE variantes SET existencia=existencia+? WHERE id=?', [(int) $it['cantidad'], $it['variante_id']]);
                        insert('movimientos', ['variante_id' => $it['variante_id'], 'fecha' => ahora(), 'cantidad' => (int) $it['cantidad'], 'motivo' => 'liberado', 'ref' => $v['folio'], 'usuario_id' => null, 'notas' => 'Pago con tarjeta no completado en ' . $horas . ' h']); }
            q("UPDATE ventas SET estado='cancelada', inventario_aplicado=0, notas=? WHERE id=?", [trim($v['notas'] . "\nCancelado automáticamente: el pago con tarjeta no se completó en $horas horas."), $v['id']]);
            mk_db()->commit();
        }
    } catch (Throwable $e) { if (mk_db()->inTransaction()) mk_db()->rollBack(); }
}

/* ---------- Sesión y acceso ---------- */
function mk_sesion(): void {
    if (session_status() === PHP_SESSION_ACTIVE) return;
    session_name('mkpanel');
    session_set_cookie_params(['lifetime' => 0, 'path' => '/', 'httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
    session_start();
}
function usuario(): ?array {
    mk_sesion();
    if (empty($_SESSION['uid'])) return null;
    static $u = false;
    if ($u === false) $u = row('SELECT id,nombre,email,rol FROM usuarios WHERE id=? AND activo=1', [$_SESSION['uid']]);
    return $u ?: null;
}
function csrf(): string { mk_sesion(); if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16)); return $_SESSION['csrf']; }
function es_dueno(): bool { $u = usuario(); return $u && $u['rol'] === 'dueno'; }
