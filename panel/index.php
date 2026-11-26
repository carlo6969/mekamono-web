<?php
declare(strict_types=1);
require __DIR__ . '/inc/db.php';
mk_errores(false);
mk_sesion();
header('X-Frame-Options: DENY');
header('Referrer-Policy: same-origin');

if (isset($_GET['salir'])) { $_SESSION = []; session_destroy(); header('Location: ./'); exit; }

$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['email'])) {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '';
    $hace = date('Y-m-d H:i:s', time() - 900);
    if ((int) val("SELECT COUNT(*) FROM intentos WHERE ip=? AND tipo='login' AND fecha>?", [$ip, $hace]) >= 8) {
        $err = 'Demasiados intentos. Espera 15 minutos.';
    } else {
        $u = row('SELECT * FROM usuarios WHERE email=? AND activo=1', [strtolower(trim($_POST['email']))]);
        if ($u && password_verify($_POST['pass'] ?? '', $u['pass_hash'])) {
            session_regenerate_id(true);
            $_SESSION['uid'] = (int) $u['id'];
            q('UPDATE usuarios SET ultimo_acceso=? WHERE id=?', [ahora(), $u['id']]);
            q("DELETE FROM intentos WHERE ip=? AND tipo='login'", [$ip]);
            header('Location: ./'); exit;
        }
        insert('intentos', ['ip' => $ip, 'tipo' => 'login', 'fecha' => ahora()]);
        $err = 'Correo o contraseña incorrectos.';
    }
}

$u = usuario();
if (!$u):
    if (!(int) val('SELECT COUNT(*) FROM usuarios')) { header('Location: instalar.php'); exit; } ?>
<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Panel · MEKAMONO</title>
<link rel="icon" href="../img/avatar.webp"><link rel="stylesheet" href="assets/panel.css?v=<?= MK_VERSION ?>"></head><body class="login">
<form class="login-card" method="post">
<img src="../img/logo.webp" alt="MEKAMONO" class="login-logo">
<h1>Panel de control</h1>
<?php if ($err): ?><p class="alerta"><?= htmlspecialchars($err) ?></p><?php endif; ?>
<label>Correo<input name="email" type="email" autocomplete="username" required autofocus></label>
<label>Contraseña<input name="pass" type="password" autocomplete="current-password" required></label>
<button class="btn primario">Entrar</button>
<p class="muted peque">¿Olvidaste tu contraseña? Pídele al Dueño que te asigne una nueva.</p>
</form>
<p class="firma">Panel por <b>APARECE</b> · Plan Negocio</p>
</body></html>
<?php exit; endif; ?>
<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow">
<title>Panel · MEKAMONO</title><link rel="icon" href="../img/avatar.webp"><meta name="theme-color" content="#0a0a0b">
<link rel="stylesheet" href="assets/panel.css?v=<?= MK_VERSION ?>"></head>
<body>
<div id="app"></div>
<script>window.MK={usuario:<?= json_encode($u, JSON_UNESCAPED_UNICODE) ?>,csrf:<?= json_encode(csrf()) ?>,img:'../img/productos/',max:<?= MK_MAX_USUARIOS ?>,negocio:<?= json_encode(ajuste('negocio', 'MEKAMONO'), JSON_UNESCAPED_UNICODE) ?>};</script>
<script src="assets/panel.js?v=<?= MK_VERSION ?>"></script>
</body></html>
