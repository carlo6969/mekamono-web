<?php
/*
 * MEKAMONO · Pagos y envíos (Mercado Pago + Envia.com)
 * Funciones compartidas. Las credenciales NUNCA van en este repositorio (es público):
 * se leen del archivo de configuración del panel, fuera de public_html:
 *   /home/<usuario>/domains/apareceweb.com/mekamono-panel.config.php
 * Ver pagos/config.ejemplo.php para las claves que usa este módulo.
 */
declare(strict_types=1);

function mkp_config(): array {
    static $cfg = null;
    if ($cfg !== null) return $cfg;
    if (function_exists('mk_config')) { $cfg = (array) mk_config(); return $cfg; }
    $file = getenv('MK_PANEL_CONFIG') ?: '';
    if (!$file) {
        $dir = __DIR__;
        while ($dir !== dirname($dir)) {
            if (basename($dir) === 'public_html') { $file = dirname($dir) . '/mekamono-panel.config.php'; break; }
            $dir = dirname($dir);
        }
    }
    $cfg = ($file && is_file($file)) ? (array) (require $file) : [];
    return $cfg;
}

function mkp_c(string $k, $def = null) { $c = mkp_config(); return array_key_exists($k, $c) && $c[$k] !== '' ? $c[$k] : $def; }

function mkp_json($data, int $code = 200): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function mkp_input(): array {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') mkp_json(['ok' => false, 'error' => 'metodo'], 405);
    $raw = file_get_contents('php://input', false, null, 0, 200000);
    $d = json_decode((string) $raw, true);
    if (!is_array($d)) mkp_json(['ok' => false, 'error' => 'json'], 400);
    return $d;
}

function mkp_str($v, int $max = 200): string { return mb_substr(trim(preg_replace('/[\x00-\x1F\x7F]/u', ' ', (string) $v)), 0, $max); }

/* Llamadas HTTP (varias en paralelo). $reqs = [clave => [metodo, url, headers[], cuerpo|null]] */
function mkp_http_multi(array $reqs, int $timeout = 12): array {
    $mh = curl_multi_init(); $hs = [];
    foreach ($reqs as $k => [$method, $url, $headers, $body]) {
        $h = curl_init($url);
        curl_setopt_array($h, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => $timeout, CURLOPT_CONNECTTIMEOUT => 6,
            CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers]);
        if ($body !== null) curl_setopt($h, CURLOPT_POSTFIELDS, is_string($body) ? $body : json_encode($body, JSON_UNESCAPED_UNICODE));
        curl_multi_add_handle($mh, $h); $hs[$k] = $h;
    }
    do { $st = curl_multi_exec($mh, $run); if ($run) curl_multi_select($mh, 1.0); } while ($run && $st === CURLM_OK);
    $out = [];
    foreach ($hs as $k => $h) {
        $out[$k] = ['code' => (int) curl_getinfo($h, CURLINFO_HTTP_CODE), 'json' => json_decode((string) curl_multi_getcontent($h), true)];
        curl_multi_remove_handle($mh, $h); curl_close($h);
    }
    curl_multi_close($mh);
    return $out;
}
function mkp_http(string $method, string $url, array $headers = [], $body = null): array { return mkp_http_multi(['x' => [$method, $url, $headers, $body]])['x']; }

/* Catálogo: si el panel expone mk_catalogo() (precios y existencias del panel), manda el panel; si no, productos.js. */
function mkp_catalogo(): array {
    static $cat = null;
    if ($cat !== null) return $cat;
    $panel = __DIR__ . '/../../panel/inc/catalogo.php';
    if (is_file($panel)) { require_once $panel; }
    if (function_exists('mk_catalogo')) { $list = (array) mk_catalogo(); }
    else {
        $js = (string) @file_get_contents(__DIR__ . '/../../productos.js');
        $i = strpos($js, 'MK_P='); $a = $i === false ? false : strpos($js, '[', $i); $b = strrpos($js, ']');
        $list = ($a !== false && $b !== false) ? (array) json_decode(substr($js, $a, $b - $a + 1), true) : [];
    }
    $cat = [];
    foreach ($list as $p) if (isset($p['id'])) $cat[(string) $p['id']] = $p;
    return $cat;
}

/* Precio real de una línea del carrito según el catálogo (nunca se confía en el precio que manda el navegador). */
function mkp_precio_linea(array $it): ?array {
    $cat = mkp_catalogo();
    $p = $cat[(string) ($it['id'] ?? '')] ?? null;
    if (!$p) return null;
    $no = max(1, count($p['o'] ?? []));
    $want = array_values(array_filter(array_map('trim', explode('·', (string) ($it['opts'] ?? ''))), 'strlen'));
    sort($want);
    foreach ($p['v'] as $v) {
        $vals = array_map(fn($x) => trim((string) $x), array_slice($v, 0, $no));
        $s = $vals; sort($s);
        if (!$p['o'] || $s === $want) {
            if ((int) $v[$no + 2] <= 0) return ['error' => 'agotado', 'n' => $p['n']];
            return ['n' => $p['n'], 'precio' => (float) $v[$no], 'opts' => implode(' · ', $vals)];
        }
    }
    /* Diseños del Lab: traen solo algunas opciones (p. ej. color); se toma la primera variante disponible que las incluya */
    foreach ($p['v'] as $v) {
        $vals = array_map(fn($x) => trim((string) $x), array_slice($v, 0, $no));
        if ($want && !array_diff($want, $vals) && (int) $v[$no + 2] > 0) return ['n' => $p['n'], 'precio' => (float) $v[$no], 'opts' => implode(' · ', $vals)];
    }
    return null;
}

/* Valida el carrito completo. Devuelve [lineas[], subtotal, piezas] o lanza error JSON. */
function mkp_carrito(array $items): array {
    if (!$items || count($items) > 40) mkp_json(['ok' => false, 'error' => 'carrito_vacio'], 400);
    $lines = []; $sub = 0.0; $pz = 0;
    foreach ($items as $it) {
        $q = max(1, min(20, (int) ($it['qty'] ?? 1)));
        $r = mkp_precio_linea((array) $it);
        if (!$r) mkp_json(['ok' => false, 'error' => 'producto_invalido', 'n' => mkp_str($it['n'] ?? '', 80)], 400);
        if (isset($r['error'])) mkp_json(['ok' => false, 'error' => 'agotado', 'n' => $r['n']], 409);
        $eng = array_slice(array_map(fn($e) => mkp_str($e, 120), (array) ($it['eng'] ?? [])), 0, 4);
        $lines[] = ['id' => (string) $it['id'], 'n' => $r['n'], 'opts' => $r['opts'], 'precio' => $r['precio'], 'qty' => $q, 'eng' => $eng];
        $sub += $r['precio'] * $q; $pz += $q;
    }
    return [$lines, round($sub, 2), $pz];
}

/* Bitácora privada (fuera de public_html, junto al archivo de configuración). */
function mkp_log(string $tipo, array $datos): void {
    $dir = getenv('MK_PANEL_CONFIG') ? dirname((string) getenv('MK_PANEL_CONFIG')) : null;
    if (!$dir) { $d = __DIR__; while ($d !== dirname($d)) { if (basename($d) === 'public_html') { $dir = dirname($d); break; } $d = dirname($d); } }
    if (!$dir || !is_writable($dir)) return;
    @file_put_contents($dir . '/mekamono-pagos.log.jsonl', json_encode(['t' => date('c'), 'tipo' => $tipo] + $datos, JSON_UNESCAPED_UNICODE) . "\n", FILE_APPEND | LOCK_EX);
}
