<?php
declare(strict_types=1);

function reporte(string $di, string $hf, string $d, string $h): array {
    $V = "v.estado IN ('pagada','pendiente') AND v.fecha BETWEEN ? AND ?";
    $p = [$di, $hf];
    $tot = row("SELECT COUNT(*) tickets, COALESCE(SUM(total),0) ventas, COALESCE(SUM(costo),0) costo, COALESCE(SUM(descuento),0) descuentos, COALESCE(SUM(total-pagado),0) por_cobrar FROM ventas v WHERE $V", $p);
    $tot['gastos'] = (float) val('SELECT COALESCE(SUM(monto),0) FROM gastos WHERE fecha BETWEEN ? AND ?', [$d, $h]);
    $tot['cobrado'] = (float) val('SELECT COALESCE(SUM(p.monto),0) FROM pagos p JOIN ventas v ON v.id=p.venta_id WHERE v.estado<>\'cancelada\' AND p.fecha BETWEEN ? AND ?', $p);
    $tot['piezas'] = (int) val("SELECT COALESCE(SUM(vi.cantidad),0) FROM venta_items vi JOIN ventas v ON v.id=vi.venta_id WHERE $V", $p);
    $tot['clientes_nuevos'] = (int) val('SELECT COUNT(*) FROM clientes WHERE creado BETWEEN ? AND ?', $p);
    $tot['canceladas'] = (int) val("SELECT COUNT(*) FROM ventas v WHERE v.estado='cancelada' AND v.fecha BETWEEN ? AND ?", $p);

    $mes = [];
    foreach (rows("SELECT SUBSTR(fecha,1,7) mes, COUNT(*) tickets, SUM(total) ventas, SUM(costo) costo FROM ventas v WHERE $V GROUP BY SUBSTR(fecha,1,7) ORDER BY mes", $p) as $r) $mes[$r['mes']] = $r + ['gastos' => 0];
    foreach (rows('SELECT SUBSTR(fecha,1,7) mes, SUM(monto) g FROM gastos WHERE fecha BETWEEN ? AND ? GROUP BY SUBSTR(fecha,1,7)', [$d, $h]) as $r) {
        $mes[$r['mes']] = ($mes[$r['mes']] ?? ['mes' => $r['mes'], 'tickets' => 0, 'ventas' => 0, 'costo' => 0]) + ['gastos' => 0];
        $mes[$r['mes']]['gastos'] = $r['g'];
    }
    ksort($mes);

    return [
        'desde' => $d, 'hasta' => $h, 'totales' => $tot,
        'por_mes' => array_values($mes),
        'por_dia' => rows("SELECT SUBSTR(fecha,1,10) dia, COUNT(*) tickets, SUM(total) ventas FROM ventas v WHERE $V GROUP BY SUBSTR(fecha,1,10) ORDER BY dia", $p),
        'por_producto' => rows("SELECT COALESCE(pr.nombre, vi.descripcion) producto, COALESCE(pr.categoria,'') categoria, SUM(vi.cantidad) piezas, SUM(vi.cantidad*vi.precio) importe, SUM(vi.cantidad*vi.costo) costo
            FROM venta_items vi JOIN ventas v ON v.id=vi.venta_id LEFT JOIN variantes va ON va.id=vi.variante_id LEFT JOIN productos pr ON pr.id=va.producto_id
            WHERE $V GROUP BY COALESCE(pr.nombre, vi.descripcion), COALESCE(pr.categoria,'') ORDER BY importe DESC", $p),
        'por_categoria' => rows("SELECT COALESCE(NULLIF(pr.categoria,''),'Otros') categoria, SUM(vi.cantidad) piezas, SUM(vi.cantidad*vi.precio) importe
            FROM venta_items vi JOIN ventas v ON v.id=vi.venta_id LEFT JOIN variantes va ON va.id=vi.variante_id LEFT JOIN productos pr ON pr.id=va.producto_id
            WHERE $V GROUP BY COALESCE(NULLIF(pr.categoria,''),'Otros') ORDER BY importe DESC", $p),
        'por_vendedor' => rows("SELECT COALESCE(u.nombre,'Sin asignar') vendedor, COUNT(*) tickets, SUM(v.total) ventas, AVG(v.total) promedio FROM ventas v LEFT JOIN usuarios u ON u.id=v.usuario_id WHERE $V GROUP BY COALESCE(u.nombre,'Sin asignar') ORDER BY ventas DESC", $p),
        'por_canal' => rows("SELECT canal, COUNT(*) tickets, SUM(total) ventas FROM ventas v WHERE $V GROUP BY canal ORDER BY ventas DESC", $p),
        'por_metodo' => rows("SELECT p.metodo, COUNT(*) pagos, SUM(p.monto) monto FROM pagos p JOIN ventas v ON v.id=p.venta_id WHERE v.estado<>'cancelada' AND p.fecha BETWEEN ? AND ? GROUP BY p.metodo ORDER BY monto DESC", $p),
        'gastos_cat' => rows('SELECT categoria, COUNT(*) n, SUM(monto) monto FROM gastos WHERE fecha BETWEEN ? AND ? GROUP BY categoria ORDER BY monto DESC', [$d, $h]),
        'top_clientes' => rows("SELECT COALESCE(c.nombre, v.nombre, 'Mostrador') cliente, COUNT(*) compras, SUM(v.total) total FROM ventas v LEFT JOIN clientes c ON c.id=v.cliente_id WHERE $V AND v.cliente_id IS NOT NULL GROUP BY COALESCE(c.nombre, v.nombre, 'Mostrador') ORDER BY total DESC LIMIT 10", $p),
    ];
}

function reporte_mensual(string $mes): array {
    $ini = $mes . '-01'; $fin = date('Y-m-t', strtotime($ini));
    $pm = date('Y-m', strtotime($ini . ' -1 month')); $pini = $pm . '-01'; $pfin = date('Y-m-t', strtotime($pini));
    $act = reporte("$ini 00:00:00", "$fin 23:59:59", $ini, $fin);
    $ant = reporte("$pini 00:00:00", "$pfin 23:59:59", $pini, $pfin);
    $extra = [
        'citas' => (int) val("SELECT COUNT(*) FROM citas WHERE fecha BETWEEN ? AND ? AND estado<>'cancelada'", [$ini, $fin]),
        'cotizaciones' => (int) val('SELECT COUNT(*) FROM cotizaciones WHERE fecha BETWEEN ? AND ?', ["$ini 00:00:00", "$fin 23:59:59"]),
        'cotizaciones_vendidas' => (int) val("SELECT COUNT(*) FROM cotizaciones WHERE estado='vendida' AND fecha BETWEEN ? AND ?", ["$ini 00:00:00", "$fin 23:59:59"]),
        'pedidos_web' => (int) val("SELECT COUNT(*) FROM ventas WHERE canal='web' AND fecha BETWEEN ? AND ?", ["$ini 00:00:00", "$fin 23:59:59"]),
        'carritos' => (int) val("SELECT COUNT(*) FROM carritos WHERE creado BETWEEN ? AND ? AND telefono IS NOT NULL", ["$ini 00:00:00", "$fin 23:59:59"]),
        'carritos_recuperados' => (int) val("SELECT COUNT(*) FROM carritos WHERE estado='recuperado' AND creado BETWEEN ? AND ?", ["$ini 00:00:00", "$fin 23:59:59"]),
        'faltantes' => (int) val('SELECT COUNT(*) FROM variantes v JOIN productos p ON p.id=v.producto_id WHERE p.activo=1 AND v.activo=1 AND v.existencia<=v.minimo'),
        'sin_movimiento' => rows("SELECT p.nombre, SUM(v.existencia) existencia FROM productos p JOIN variantes v ON v.producto_id=p.id AND v.activo=1 WHERE p.activo=1 AND v.existencia>0 AND p.id NOT IN (
            SELECT DISTINCT va.producto_id FROM venta_items vi JOIN ventas ve ON ve.id=vi.venta_id JOIN variantes va ON va.id=vi.variante_id WHERE ve.estado IN ('pagada','pendiente') AND ve.fecha BETWEEN ? AND ?)
            GROUP BY p.id, p.nombre ORDER BY existencia DESC LIMIT 8", ["$ini 00:00:00", "$fin 23:59:59"]),
    ];
    return ['mes' => $mes, 'anterior' => $pm, 'actual' => $act, 'previo' => $ant, 'extra' => $extra];
}
