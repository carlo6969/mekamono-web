<?php
declare(strict_types=1);

/* Mueve existencia de una variante y deja registro en movimientos. */
function mover(int $vid, int $cantidad, string $motivo, ?string $ref = null, ?int $uid = null, string $notas = ''): void {
    if (!$cantidad) return;
    q('UPDATE variantes SET existencia=existencia+? WHERE id=?', [$cantidad, $vid]);
    insert('movimientos', ['variante_id' => $vid, 'fecha' => ahora(), 'cantidad' => $cantidad, 'motivo' => $motivo, 'ref' => $ref, 'usuario_id' => $uid, 'notas' => $notas ?: null]);
}

/* Variantes en o por debajo de su existencia mínima. */
function faltantes(int $lim = 50): array {
    return rows('SELECT v.id, v.producto_id, p.nombre, v.etiqueta, v.existencia, v.minimo, p.fotos, v.foto FROM variantes v JOIN productos p ON p.id=v.producto_id
        WHERE p.activo=1 AND v.activo=1 AND v.existencia<=v.minimo ORDER BY v.existencia, p.nombre LIMIT ' . $lim);
}

/* Carpeta para fotos subidas desde el panel: fuera de la carpeta que se publica desde Git. */
function dir_subidas(): string {
    $c = mk_config();
    if (!empty($c['dir_subidas'])) return rtrim($c['dir_subidas'], '/');
    return dirname(__DIR__, 3) . '/mekamono-subidas';   // public_html/demos/mekamono-subidas
}
