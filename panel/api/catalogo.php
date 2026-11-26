<?php
/* Catálogo para la web, en el mismo formato que productos.js. Lo controla el panel.
 * Si la base de datos no responde, no imprime nada y la web usa productos.js. */
declare(strict_types=1);
require dirname(__DIR__) . '/inc/catalogo.php';
header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: no-cache');
try {
    if (!mk_config()) exit('/* panel sin configurar */');
    $out = mk_catalogo();
    if (!$out) exit('/* catálogo vacío */');
    echo 'window.MK_IMG="";window.MK_P=' . json_encode($out, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';window.MK_PANEL=1;';
} catch (Throwable $e) {
    echo '/* panel no disponible */';
}
