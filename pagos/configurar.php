<?php
/*
 * MEKAMONO · Configuración de pagos y envíos (Mercado Pago + Envia.com)
 * Solo entra el Dueño con sesión en el panel, o quien conozca la clave de instalación del panel.
 * Los tokens se guardan en el archivo privado de configuración del servidor (nunca en Git).
 */
declare(strict_types=1);
require_once __DIR__ . '/../panel/inc/db.php';
require_once __DIR__ . '/inc/envia.php';
header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');
header('X-Frame-Options: DENY');

function cfg_h($s): string { return htmlspecialchars((string) $s, ENT_QUOTES, 'UTF-8'); }
function cfg_ruta(): ?string {
    $r = [];
    if (getenv('MK_PANEL_CONFIG')) $r[] = (string) getenv('MK_PANEL_CONFIG');
    $d = dirname(__DIR__);
    while (($p = dirname($d)) !== $d) { if (basename($d) === 'public_html') { $r[] = $p . '/mekamono-panel.config.php'; break; } $d = $p; }
    $r[] = dirname(__DIR__, 2) . '/mekamono-privado/mekamono-panel.config.php';
    foreach ($r as $x) if (is_file($x)) return $x;
    return null;
}
function cfg_mask(string $t): string { return $t === '' ? 'sin configurar' : substr($t, 0, 8) . '…' . substr($t, -4); }

$ruta = cfg_ruta();
mk_sesion();
$dueno = false;
try { $dueno = $ruta && es_dueno(); } catch (Throwable $e) { $dueno = false; }
$ok = $dueno || !empty($_SESSION['mkp_cfg']);
$msg = ''; $tipo = 'alerta';

if (!$ruta) { $msg = 'Primero instala el panel (panel/instalar.php): ahí se crea el archivo privado de configuración.'; }

/* Acceso con la clave de instalación */
if ($ruta && !$ok && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['clave'])) {
    $clave = (string) (mk_config()['clave_instalacion'] ?? '');
    if ($clave !== '' && hash_equals($clave, (string) $_POST['clave'])) { session_regenerate_id(true); $_SESSION['mkp_cfg'] = 1; $ok = true; }
    else { sleep(2); $msg = 'Clave incorrecta.'; }
}

$cfg = $ruta ? (array) (require $ruta) : [];
$res = null;

if ($ok && $_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['accion'])) {
    if (!hash_equals(csrf(), (string) ($_POST['csrf'] ?? ''))) { $msg = 'La sesión expiró, recarga la página.'; }
    elseif ($_POST['accion'] === 'guardar') {
        $t = fn($k) => trim((string) ($_POST[$k] ?? ''));
        foreach (['mp_access_token', 'mp_webhook_secret', 'envia_api_key'] as $k) if ($t($k) !== '') $cfg[$k] = preg_replace('/\s+/', '', $t($k));
        foreach (['mp_access_token', 'mp_webhook_secret', 'envia_api_key'] as $k) if (!empty($_POST['borrar_' . $k])) $cfg[$k] = '';
        $cfg['envia_env'] = $t('envia_env') === 'sandbox' ? 'sandbox' : 'production';
        $car = array_values(array_intersect((array) ($_POST['carriers'] ?? []), ['estafeta', 'fedex', 'dhl', 'paquetexpress', 'redpack', 'ups', '99minutos', 'jtexpress']));
        $cfg['envia_carriers'] = $car ?: ['estafeta', 'fedex', 'dhl'];
        $o = [];
        foreach (['name', 'company', 'email', 'phone', 'street', 'number', 'district', 'city', 'state', 'postalCode'] as $k) $o[$k] = mb_substr($t('o_' . $k), 0, 120);
        $o['phone'] = preg_replace('/\D+/', '', $o['phone']); $o['state'] = strtoupper($o['state']);
        $cfg['origen'] = $o;
        $cfg['paquete'] = ['largo' => max(1, (float) $t('p_largo')), 'ancho' => max(1, (float) $t('p_ancho')), 'alto' => max(1, (float) $t('p_alto')),
            'peso_base' => max(0.1, (float) $t('p_peso')), 'peso_por_pieza' => max(0, (float) $t('p_pieza'))];
        $cfg['envio_gratis_desde'] = max(0, (float) $t('envio_gratis_desde'));
        if (!isset($cfg['sitio_url'])) $cfg['sitio_url'] = 'https://apareceweb.com/demos/mekamono/';
        $txt = "<?php\n/* Configuración privada del panel MekaMono. No se publica en Git. */\nreturn " . var_export($cfg, true) . ";\n";
        if (@file_put_contents($ruta, $txt, LOCK_EX) !== false) { @chmod($ruta, 0640); if (function_exists('opcache_invalidate')) @opcache_invalidate($ruta, true); header('Location: configurar.php?guardado=1'); exit; }
        else $msg = 'No se pudo escribir el archivo de configuración.';
    }
}
if ($ok && isset($_GET['guardado'])) {
    $msg = 'Guardado. Resultado de la prueba de conexión:'; $tipo = 'alerta ok';
    {
        $res = [];
        $tok = (string) ($cfg['mp_access_token'] ?? '');
        if ($tok === '') $res[] = ['Mercado Pago', false, 'Falta el Access Token.'];
        else {
            $r = mkp_http('GET', 'https://api.mercadopago.com/users/me', ['Authorization: Bearer ' . $tok]);
            $j = (array) ($r['json'] ?? []);
            if ($r['code'] === 200 && !empty($j['id'])) $res[] = ['Mercado Pago', true, 'Cuenta conectada: ' . cfg_h($j['nickname'] ?? '') . ' (ID ' . cfg_h($j['id']) . ', ' . cfg_h($j['site_id'] ?? '') . ')' . (str_starts_with($tok, 'TEST-') ? ' · token de PRUEBA' : ' · token de PRODUCCIÓN')];
            else $res[] = ['Mercado Pago', false, $r['code'] ? 'No aceptó el token (HTTP ' . (int) $r['code'] . ' ' . cfg_h($j['message'] ?? '') . ').' : 'Sin respuesta de Mercado Pago. Intenta de nuevo en un minuto.'];
        }
        if ((string) ($cfg['envia_api_key'] ?? '') === '') $res[] = ['Envia.com', false, 'Falta el token de Envia.'];
        else {
            $cot = mkp_cotizar('06000', 1, 300);
            if ($cot['tarifas']) {
                $l = array_map(fn($x) => cfg_h($x['desc']) . ': $' . number_format($x['precio'], 2) . ($x['dias'] ? ' (' . cfg_h($x['dias']) . ')' : ''), $cot['tarifas']);
                $res[] = ['Envia.com', true, 'Cotización de prueba a CDMX (CP 06000, 1 pieza):<br>' . implode('<br>', $l)];
            } else $res[] = ['Envia.com', false, 'No devolvió tarifas. ' . cfg_h(implode(' · ', array_map(fn($k, $v) => "$k: $v", array_keys(mkp_envia_errores()), mkp_envia_errores())))];
            foreach (mkp_envia_errores() as $k => $v) if ($cot['tarifas']) $res[] = ['Envia · ' . cfg_h($k), false, 'Sin tarifa: ' . cfg_h($v)];
        }
    }
}

/* Valores del formulario (con los datos de MekaMono como base) */
$o = (array) ($cfg['origen'] ?? []) + ['name' => '', 'company' => 'MEKAMONO', 'email' => 'mekamono.mx@gmail.com', 'phone' => '5659206025',
    'street' => '', 'number' => '', 'district' => '', 'city' => 'Pachuca de Soto', 'state' => 'HG', 'postalCode' => ''];
$pq = (array) ($cfg['paquete'] ?? []) + ['largo' => 30, 'ancho' => 22, 'alto' => 10, 'peso_base' => 1, 'peso_por_pieza' => 0];
$car = (array) ($cfg['envia_carriers'] ?? ['estafeta', 'fedex', 'dhl', 'paquetexpress']);
$env = (string) ($cfg['envia_env'] ?? 'production');
?><!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Pagos y envíos · MEKAMONO</title><link rel="stylesheet" href="../panel/assets/panel.css">
<style>.login-card.ancho{max-width:640px}.g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.g5{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}
label{display:flex;flex-direction:column;gap:4px;font-size:12.5px;font-weight:600;color:#4b4945}fieldset{border:1px solid #e6e2d9;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px;margin:0}
legend{font-weight:700;padding:0 6px}.chips{display:flex;flex-wrap:wrap;gap:8px}.chips label{flex-direction:row;align-items:center;gap:6px;border:1px solid #e6e2d9;border-radius:999px;padding:6px 12px;font-weight:500}
.chips input{width:auto}.res{border-radius:10px;padding:10px 12px;font-size:13px;line-height:1.5}.res.si{background:#e3f4ea;color:#1d6b3e}.res.no{background:#fbe5e2;color:#a5321f}
.peque{font-size:12px;color:#6d6a63;font-weight:400}@media(max-width:560px){.g2,.g3,.g5{grid-template-columns:1fr 1fr}}</style></head>
<body class="login">
<?php if (!$ok): ?>
<form class="login-card" method="post"><img src="../img/logo.webp" alt="MEKAMONO" class="login-logo"><h1>Pagos y envíos</h1>
<?php if ($msg): ?><p class="alerta"><?= cfg_h($msg) ?></p><?php endif; ?>
<?php if ($ruta): ?><p class="peque">Entra con tu sesión de Dueño en el <a href="../panel/">panel</a>, o con la clave de instalación del panel.</p>
<label>Clave de instalación<input name="clave" type="password" required autocomplete="current-password"></label><button class="btn primario grande">Entrar</button><?php endif; ?>
</form>
<?php else: ?>
<form class="login-card ancho" method="post" autocomplete="off"><img src="../img/logo.webp" alt="MEKAMONO" class="login-logo"><h1>Pagos y envíos</h1>
<input type="hidden" name="csrf" value="<?= cfg_h(csrf()) ?>">
<?php if ($msg): ?><p class="<?= $tipo ?>"><?= cfg_h($msg) ?></p><?php endif; ?>
<?php if ($res): foreach ($res as [$n, $b, $t]): ?><div class="res <?= $b ? 'si' : 'no' ?>"><b><?= $b ? '✓' : '✗' ?> <?= $n ?></b><br><?= $t ?></div><?php endforeach; endif; ?>

<fieldset><legend>Mercado Pago</legend>
<label>Access Token de producción <span class="peque">Actual: <?= cfg_h(cfg_mask((string) ($cfg['mp_access_token'] ?? ''))) ?> · déjalo vacío para no cambiarlo</span><input name="mp_access_token" placeholder="APP_USR-..." spellcheck="false"></label>
<label>Clave secreta de Webhooks (opcional) <span class="peque">Actual: <?= cfg_h(cfg_mask((string) ($cfg['mp_webhook_secret'] ?? ''))) ?></span><input name="mp_webhook_secret" spellcheck="false"></label>
</fieldset>

<fieldset><legend>Envia.com</legend>
<label>Token de API <span class="peque">Actual: <?= cfg_h(cfg_mask((string) ($cfg['envia_api_key'] ?? ''))) ?> · déjalo vacío para no cambiarlo</span><input name="envia_api_key" spellcheck="false"></label>
<label>Ambiente<select name="envia_env"><option value="production"<?= $env === 'production' ? ' selected' : '' ?>>Producción (tarifas reales)</option><option value="sandbox"<?= $env === 'sandbox' ? ' selected' : '' ?>>Pruebas (sandbox)</option></select></label>
<div><span class="peque">Paqueterías que verá el cliente</span><div class="chips">
<?php foreach (['estafeta' => 'Estafeta', 'fedex' => 'FedEx', 'dhl' => 'DHL', 'paquetexpress' => 'Paquetexpress', 'redpack' => 'Redpack', 'ups' => 'UPS', '99minutos' => '99 Minutos', 'jtexpress' => 'J&T Express'] as $k => $v): ?>
<label><input type="checkbox" name="carriers[]" value="<?= $k ?>"<?= in_array($k, $car, true) ? ' checked' : '' ?>> <?= $v ?></label>
<?php endforeach; ?></div></div>
</fieldset>

<fieldset><legend>Origen de los paquetes</legend>
<div class="g2"><label>Remitente<input name="o_name" value="<?= cfg_h($o['name']) ?>" required></label><label>Negocio<input name="o_company" value="<?= cfg_h($o['company']) ?>"></label>
<label>Correo<input name="o_email" type="email" value="<?= cfg_h($o['email']) ?>" required></label><label>Teléfono (10 dígitos)<input name="o_phone" value="<?= cfg_h($o['phone']) ?>" required></label>
<label>Calle<input name="o_street" value="<?= cfg_h($o['street']) ?>" required></label><label>Número<input name="o_number" value="<?= cfg_h($o['number']) ?>" required></label>
<label>Colonia<input name="o_district" value="<?= cfg_h($o['district']) ?>" required></label><label>Ciudad<input name="o_city" value="<?= cfg_h($o['city']) ?>" required></label>
<label>Estado (clave)<input name="o_state" value="<?= cfg_h($o['state']) ?>" maxlength="3" required></label><label>Código postal<input name="o_postalCode" value="<?= cfg_h($o['postalCode']) ?>" pattern="\d{5}" required></label></div>
</fieldset>

<fieldset><legend>Caja y envío</legend>
<div class="g5"><label>Largo cm<input name="p_largo" type="number" step="0.1" value="<?= cfg_h($pq['largo']) ?>"></label><label>Ancho cm<input name="p_ancho" type="number" step="0.1" value="<?= cfg_h($pq['ancho']) ?>"></label>
<label>Alto cm<input name="p_alto" type="number" step="0.1" value="<?= cfg_h($pq['alto']) ?>"></label><label>Peso kg<input name="p_peso" type="number" step="0.01" value="<?= cfg_h($pq['peso_base']) ?>"></label>
<label>+kg por pieza<input name="p_pieza" type="number" step="0.01" value="<?= cfg_h($pq['peso_por_pieza']) ?>"></label></div>
<label>Envío gratis desde (MXN, 0 = el cliente siempre paga el envío)<input name="envio_gratis_desde" type="number" step="1" value="<?= cfg_h($cfg['envio_gratis_desde'] ?? 0) ?>"></label>
</fieldset>

<button class="btn primario grande" name="accion" value="guardar">Guardar y probar conexión</button>
<p class="peque">Los tokens se guardan solo en el archivo privado del servidor; nunca en el código público.</p>
</form>
<?php endif; ?>
</body></html>
