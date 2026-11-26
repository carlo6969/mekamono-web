<?php
/* Catálogo de la web armado desde el panel (misma estructura que productos.js: id,n,c,o,v,i,d).
 * Lo usan panel/api/catalogo.php y el módulo de pagos para validar precios y existencias. */
declare(strict_types=1);
require_once __DIR__ . '/db.php';

function mk_catalogo(): array {
    $ps = rows('SELECT * FROM productos WHERE activo=1 AND en_web=1 ORDER BY orden, nombre');
    $vs = rows('SELECT * FROM variantes WHERE activo=1 ORDER BY id');
    $por = []; foreach ($vs as $v) $por[$v['producto_id']][] = $v;
    $out = [];
    foreach ($ps as $p) {
        if (empty($por[$p['id']])) continue;
        $fotos = array_map(fn($f) => str_starts_with($f, 'sub:') ? '../mekamono-subidas/' . substr($f, 4) : 'img/productos/' . $f, json_decode($p['fotos'] ?: '[]', true) ?: []);
        if (!$fotos) continue;   // la web necesita al menos una foto
        $ops = json_decode($p['opciones'] ?: '[]', true) ?: [];
        $v = array_map(function ($x) use ($ops) {
            $o = array_pad(json_decode($x['ops'] ?: '[]', true) ?: [], count($ops), '');
            // Sin opciones, la web espera un valor de relleno al inicio.
            return [...(count($ops) ? array_slice($o, 0, count($ops)) : ['']), (float) $x['precio'], (float) $x['precio_anterior'], max(0, (int) $x['existencia']), (int) $x['foto']];
        }, $por[$p['id']]);
        $out[] = ['id' => ctype_digit((string) $p['ext_id']) ? (int) $p['ext_id'] : ($p['ext_id'] ?: 'mk' . $p['id']), 'n' => $p['nombre'], 'c' => $p['categoria'], 'o' => $ops, 'v' => $v, 'i' => $fotos, 'd' => (string) $p['descripcion']];
    }
    return $out;
}
