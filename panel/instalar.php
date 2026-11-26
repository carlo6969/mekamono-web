<?php
/* Instalador: crea las tablas, importa los 65 productos de la web y el usuario Dueño.
 * Solo funciona mientras no exista ningún usuario. Después se bloquea solo. */
declare(strict_types=1);
require __DIR__ . '/inc/db.php';
require __DIR__ . '/inc/schema.php';
mk_errores(false);

mk_instalar_schema();
$hay = (int) val('SELECT COUNT(*) FROM usuarios');
$msg = '';
if ($hay) { $msg = 'El panel ya está instalado. Entra en <a href="./">el panel</a>.'; }
elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nombre = trim($_POST['nombre'] ?? ''); $email = strtolower(trim($_POST['email'] ?? '')); $pass = $_POST['pass'] ?? '';
    $clave = $_POST['clave'] ?? '';
    $cfg = mk_config();
    if (!empty($cfg['clave_instalacion']) && !hash_equals((string) $cfg['clave_instalacion'], $clave)) $msg = 'La clave de instalación no es correcta.';
    elseif (!$nombre || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($pass) < 8) $msg = 'Escribe nombre, un correo válido y una contraseña de al menos 8 caracteres.';
    else {
        $n = mk_importar_catalogo(dirname(__DIR__) . '/productos.js');
        insert('usuarios', ['nombre' => $nombre, 'email' => $email, 'pass_hash' => password_hash($pass, PASSWORD_DEFAULT), 'rol' => 'dueno', 'activo' => 1, 'creado' => ahora()]);
        foreach (['negocio' => 'MEKAMONO', 'telefono' => '56 5920 6025', 'direccion' => 'Av. Revolución 503, Local C, Col. Periodistas, Pachuca, Hgo.', 'ticket_pie' => '¡Gracias por tu compra! Síguenos en Instagram @mekamono', 'gasto_cats' => 'Renta,Luz e internet,Mercancía,Material de grabado,Empaques,Envíos,Publicidad,Sueldos,Comisiones,Otros'] as $k => $v)
            q('INSERT INTO ajustes (clave,valor) VALUES (?,?)', [$k, $v]);
        $msg = "Listo. Se importaron $n productos. Ya puedes <a href=\"./\">entrar al panel</a>.";
        $hay = 1;
    }
}
?><!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Instalar panel · MEKAMONO</title>
<link rel="stylesheet" href="assets/panel.css"></head><body class="login">
<form class="login-card" method="post">
<img src="../img/logo.webp" alt="MEKAMONO" class="login-logo">
<h1>Instalar panel</h1>
<?php if ($msg): ?><p class="alerta"><?= $msg ?></p><?php endif; ?>
<?php if (!$hay): ?>
<p class="muted">Crea la cuenta del Dueño. Después podrás agregar hasta <?= MK_MAX_USUARIOS ?> usuarios.</p>
<?php if (!empty(mk_config()['clave_instalacion'])): ?><label>Clave de instalación<input name="clave" type="password" required></label><?php endif; ?>
<label>Nombre<input name="nombre" required></label>
<label>Correo<input name="email" type="email" required></label>
<label>Contraseña<input name="pass" type="password" minlength="8" required></label>
<button class="btn primario">Instalar</button>
<?php endif; ?>
</form></body></html>
