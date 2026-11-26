<?php
/* API privada del panel (requiere sesión). Uso: api.php?a=<acción>, JSON. */
declare(strict_types=1);
require __DIR__ . '/inc/db.php';
require __DIR__ . '/inc/inventario.php';
mk_errores(true);

$u = usuario();
if (!$u) fail('Tu sesión terminó. Vuelve a entrar.', 401);
$a = $_GET['a'] ?? '';
$b = body();
$uid = (int) $u['id'];
if ($_SERVER['REQUEST_METHOD'] === 'POST' && !hash_equals(csrf(), $_SERVER['HTTP_X_CSRF'] ?? '')) fail('Solicitud no válida, recarga la página.', 403);

$SOLO_DUENO = ['ajustes_set', 'producto_guardar', 'producto_borrar', 'ajustar', 'entrada', 'gastos', 'gasto_guardar', 'gasto_borrar',
    'proveedores', 'proveedor_guardar', 'proveedor_borrar', 'reporte', 'reporte_mensual', 'usuarios', 'usuario_guardar', 'subir_foto', 'venta_borrar_pago'];
if (in_array($a, $SOLO_DUENO, true) && $u['rol'] !== 'dueno') fail('Solo el Dueño puede hacer esto.', 403);

function n($v): float { return round((float) $v, 2); }
function txt($v, int $max = 255): string { return mb_substr(trim((string) $v), 0, $max); }
function rango(): array {
    $d = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['desde'] ?? '') ? $_GET['desde'] : date('Y-m-01');
    $h = preg_match('/^\d{4}-\d{2}-\d{2}$/', $_GET['hasta'] ?? '') ? $_GET['hasta'] : date('Y-m-d');
    return [$d, $h, $d . ' 00:00:00', $h . ' 23:59:59'];
}
const VALIDA = "v.estado IN ('pagada','pendiente')";

/* Busca o crea cliente por teléfono */
function cliente_de(?int $id, string $nombre, string $tel, string $origen = 'mostrador'): ?int {
    if ($id) return $id;
    $tel = tel_limpio($tel);
    if ($tel) { $c = val('SELECT id FROM clientes WHERE telefono=?', [$tel]); if ($c) return (int) $c; }
    if (!$nombre) return null;
    return insert('clientes', ['nombre' => txt($nombre, 160), 'telefono' => $tel ?: null, 'notas' => '', 'origen' => $origen, 'creado' => ahora()]);
}

switch ($a) {

/* ================= INICIO ================= */
case 'inicio':
    mk_liberar_vencidos();
    $h = hoy(); $m = date('Y-m-01');
    $ventasHoy = row("SELECT COUNT(*) n, COALESCE(SUM(total),0) t FROM ventas v WHERE " . VALIDA . " AND fecha>=?", [$h . ' 00:00:00']);
    $ventasMes = row("SELECT COUNT(*) n, COALESCE(SUM(total),0) t FROM ventas v WHERE " . VALIDA . " AND fecha>=?", [$m . ' 00:00:00']);
    $cobradoHoy = val('SELECT COALESCE(SUM(monto),0) FROM pagos WHERE fecha>=?', [$h . ' 00:00:00']);
    $porCobrar = row("SELECT COUNT(*) n, COALESCE(SUM(total-pagado),0) t FROM ventas WHERE estado='pendiente'");
    $gastosMes = val('SELECT COALESCE(SUM(monto),0) FROM gastos WHERE fecha>=?', [$m]);
    $pedidosWeb = rows("SELECT id,folio,fecha,nombre,telefono,total FROM ventas WHERE estado='pedido' ORDER BY fecha DESC LIMIT 10");
    $citas = rows("SELECT * FROM citas WHERE fecha=? AND estado IN ('pendiente','confirmada') ORDER BY hora", [$h]);
    $faltantes = faltantes(8);
    $nFalt = (int) val('SELECT COUNT(*) FROM variantes v JOIN productos p ON p.id=v.producto_id WHERE p.activo=1 AND v.activo=1 AND v.existencia<=v.minimo');
    $produccion = rows("SELECT id,folio,nombre,entrega,total,pagado FROM ventas WHERE estado IN ('pendiente','pagada') AND entrega IN ('en_produccion','listo') ORDER BY fecha LIMIT 10");
    $dias = [];
    for ($i = 13; $i >= 0; $i--) { $d = date('Y-m-d', strtotime("-$i day")); $dias[$d] = 0; }
    foreach (rows("SELECT SUBSTR(fecha,1,10) d, SUM(total) t FROM ventas v WHERE " . VALIDA . " AND fecha>=? GROUP BY SUBSTR(fecha,1,10)", [array_key_first($dias) . ' 00:00:00']) as $r) $dias[$r['d']] = n($r['t']);
    $carritos = (int) val("SELECT COUNT(*) FROM carritos WHERE estado='abierto' AND telefono IS NOT NULL AND actualizado>=?", [date('Y-m-d H:i:s', strtotime('-7 day'))]);
    json_out(['ok' => true, 'hoy' => $ventasHoy, 'mes' => $ventasMes, 'cobradoHoy' => n($cobradoHoy), 'porCobrar' => $porCobrar,
        'gastosMes' => es_dueno() ? n($gastosMes) : null, 'pedidosWeb' => $pedidosWeb, 'citas' => $citas, 'faltantes' => $faltantes, 'nFaltantes' => $nFalt,
        'produccion' => $produccion, 'dias' => $dias, 'carritos' => $carritos]);

/* ================= PRODUCTOS / INVENTARIO ================= */
case 'productos':
    $ps = rows('SELECT id,nombre,categoria,opciones,fotos,en_web,activo,orden FROM productos WHERE activo=1 ORDER BY orden,nombre');
    $vs = rows('SELECT id,producto_id,ops,etiqueta,sku,precio,precio_anterior,' . (es_dueno() ? 'costo,' : '') . 'existencia,minimo,foto,activo FROM variantes WHERE activo=1 ORDER BY id');
    $por = [];
    foreach ($vs as $v) { $v['ops'] = json_decode($v['ops'] ?: '[]', true); $por[$v['producto_id']][] = $v; }
    foreach ($ps as &$p) { $p['opciones'] = json_decode($p['opciones'] ?: '[]', true); $p['fotos'] = json_decode($p['fotos'] ?: '[]', true); $p['v'] = $por[$p['id']] ?? []; }
    json_out(['ok' => true, 'productos' => $ps, 'categorias' => array_column(rows('SELECT DISTINCT categoria FROM productos WHERE activo=1 ORDER BY categoria'), 'categoria')]);

case 'producto':
    $p = row('SELECT * FROM productos WHERE id=?', [(int) ($_GET['id'] ?? 0)]);
    if (!$p) fail('No existe el producto');
    $p['opciones'] = json_decode($p['opciones'] ?: '[]', true); $p['fotos'] = json_decode($p['fotos'] ?: '[]', true);
    $p['v'] = rows('SELECT * FROM variantes WHERE producto_id=? AND activo=1 ORDER BY id', [$p['id']]);
    foreach ($p['v'] as &$v) $v['ops'] = json_decode($v['ops'] ?: '[]', true);
    json_out(['ok' => true, 'producto' => $p]);

case 'producto_guardar':
    $id = (int) ($b['id'] ?? 0);
    $ops = array_values(array_filter(array_map(fn($x) => txt($x, 40), $b['opciones'] ?? []), 'strlen'));
    $fotos = array_values(array_filter(array_map(fn($x) => txt($x, 200), $b['fotos'] ?? []), 'strlen'));
    $d = ['nombre' => txt($b['nombre'] ?? '', 200), 'categoria' => txt($b['categoria'] ?? '', 80), 'descripcion' => (string) ($b['descripcion'] ?? ''),
        'opciones' => json_encode($ops, JSON_UNESCAPED_UNICODE), 'fotos' => json_encode($fotos, JSON_UNESCAPED_UNICODE), 'en_web' => empty($b['en_web']) ? 0 : 1];
    if (!$d['nombre']) fail('Escribe el nombre del producto');
    $vars = $b['v'] ?? [];
    if (!$vars) fail('Agrega al menos una variante (con su precio)');
    mk_db()->beginTransaction();
    if ($id) update('productos', $id, $d);
    else { $d += ['activo' => 1, 'orden' => (int) val('SELECT COALESCE(MAX(orden),0)+1 FROM productos'), 'creado' => ahora()]; $id = insert('productos', $d); }
    $vivas = [];
    foreach ($vars as $v) {
        $vo = array_map(fn($x) => txt($x, 60), array_slice(array_pad($v['ops'] ?? [], count($ops), ''), 0, count($ops)));
        $vd = ['ops' => json_encode($vo, JSON_UNESCAPED_UNICODE), 'etiqueta' => implode(' / ', $vo), 'sku' => txt($v['sku'] ?? '', 60) ?: null,
            'precio' => n($v['precio'] ?? 0), 'precio_anterior' => n($v['precio_anterior'] ?? 0), 'costo' => n($v['costo'] ?? 0),
            'minimo' => max(0, (int) ($v['minimo'] ?? 2)), 'foto' => max(0, (int) ($v['foto'] ?? 0))];
        $vid = (int) ($v['id'] ?? 0);
        $nueva = (int) ($v['existencia'] ?? 0);
        if ($vid && val('SELECT 1 FROM variantes WHERE id=? AND producto_id=?', [$vid, $id])) {
            update('variantes', $vid, $vd);
            $act = (int) val('SELECT existencia FROM variantes WHERE id=?', [$vid]);
            if ($nueva !== $act) mover($vid, $nueva - $act, 'ajuste', null, $uid, 'Edición de producto');
        } else {
            $vid = insert('variantes', $vd + ['producto_id' => $id, 'existencia' => 0, 'activo' => 1]);
            if ($nueva) mover($vid, $nueva, 'alta', null, $uid, 'Existencia inicial');
        }
        $vivas[] = $vid;
    }
    $marcas = implode(',', array_map('intval', $vivas));
    q("UPDATE variantes SET activo=0 WHERE producto_id=? AND id NOT IN ($marcas)", [$id]);
    mk_db()->commit();
    json_out(['ok' => true, 'id' => $id]);

case 'producto_borrar':
    q('UPDATE productos SET activo=0, en_web=0 WHERE id=?', [(int) ($b['id'] ?? 0)]);
    json_out(['ok' => true]);

case 'ajustar':      // fija la existencia contada físicamente
    $vid = (int) ($b['variante_id'] ?? 0); $nueva = (int) ($b['existencia'] ?? 0);
    $act = val('SELECT existencia FROM variantes WHERE id=?', [$vid]);
    if ($act === null) fail('No existe la variante');
    if ($nueva !== (int) $act) mover($vid, $nueva - (int) $act, 'ajuste', null, $uid, txt($b['notas'] ?? 'Conteo físico'));
    if (isset($b['minimo'])) q('UPDATE variantes SET minimo=? WHERE id=?', [max(0, (int) $b['minimo']), $vid]);
    json_out(['ok' => true]);

case 'entrada':      // compra / resurtido de mercancía
    $items = $b['items'] ?? [];
    if (!$items) fail('Agrega al menos un producto');
    $prov = (int) ($b['proveedor_id'] ?? 0) ?: null;
    mk_db()->beginTransaction();
    $total = 0;
    foreach ($items as $it) {
        $vid = (int) $it['variante_id']; $c = max(1, (int) $it['cantidad']); $costo = n($it['costo'] ?? 0);
        mover($vid, $c, 'compra', $prov ? 'PROV-' . $prov : null, $uid, txt($b['notas'] ?? ''));
        if ($costo > 0) q('UPDATE variantes SET costo=? WHERE id=?', [$costo, $vid]);
        $total += $c * $costo;
    }
    if (!empty($b['registrar_gasto']) && $total > 0)
        insert('gastos', ['fecha' => hoy(), 'concepto' => 'Compra de mercancía' . ($b['notas'] ? ': ' . txt($b['notas'], 150) : ''), 'categoria' => 'Mercancía', 'monto' => $total,
            'metodo' => txt($b['metodo'] ?? 'efectivo', 20), 'proveedor_id' => $prov, 'usuario_id' => $uid, 'notas' => '', 'creado' => ahora()]);
    mk_db()->commit();
    json_out(['ok' => true, 'total' => $total]);

case 'faltantes':
    json_out(['ok' => true, 'faltantes' => faltantes(500)]);

case 'movimientos':
    json_out(['ok' => true, 'movimientos' => rows('SELECT m.*, u.nombre usuario FROM movimientos m LEFT JOIN usuarios u ON u.id=m.usuario_id WHERE variante_id=? ORDER BY m.id DESC LIMIT 100', [(int) ($_GET['id'] ?? 0)])]);

case 'subir_foto':
    if (empty($_FILES['foto']) || $_FILES['foto']['error'] !== UPLOAD_ERR_OK) fail('No llegó la foto');
    if ($_FILES['foto']['size'] > 8 * 1024 * 1024) fail('La foto pesa más de 8 MB');
    $info = @getimagesize($_FILES['foto']['tmp_name']);
    if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP], true)) fail('Sube una foto JPG, PNG o WEBP');
    $dir = dir_subidas();
    if (!is_dir($dir) && !@mkdir($dir, 0755, true)) fail('No se pudo crear la carpeta de fotos', 500);
    $nombre = 'p' . date('ymdHis') . bin2hex(random_bytes(3));
    if (function_exists('imagewebp')) {
        $src = $info[2] === IMAGETYPE_JPEG ? imagecreatefromjpeg($_FILES['foto']['tmp_name']) : ($info[2] === IMAGETYPE_PNG ? imagecreatefrompng($_FILES['foto']['tmp_name']) : imagecreatefromwebp($_FILES['foto']['tmp_name']));
        $w = imagesx($src); $h = imagesy($src); $s = min(1, 1024 / max($w, $h));
        $dst = imagecreatetruecolor((int) ($w * $s), (int) ($h * $s));
        imagealphablending($dst, false); imagesavealpha($dst, true);
        imagecopyresampled($dst, $src, 0, 0, 0, 0, (int) ($w * $s), (int) ($h * $s), $w, $h);
        imagewebp($dst, "$dir/$nombre.webp", 82);
    } elseif ($info[2] === IMAGETYPE_WEBP) {
        move_uploaded_file($_FILES['foto']['tmp_name'], "$dir/$nombre.webp");
    } else fail('El servidor no puede convertir la foto; súbela en formato WEBP', 500);
    json_out(['ok' => true, 'foto' => 'sub:' . $nombre]);

/* ================= VENTAS / PUNTO DE VENTA ================= */
case 'venta_crear':
    $items = $b['items'] ?? [];
    if (!$items) fail('El ticket está vacío');
    mk_db()->beginTransaction();
    $cid = cliente_de((int) ($b['cliente_id'] ?? 0) ?: null, txt($b['nombre'] ?? '', 160), (string) ($b['telefono'] ?? ''));
    $cli = $cid ? row('SELECT nombre,telefono FROM clientes WHERE id=?', [$cid]) : null;
    $sub = 0; $costo = 0; $lineas = [];
    foreach ($items as $it) {
        $vid = (int) ($it['variante_id'] ?? 0) ?: null; $c = max(1, (int) ($it['cantidad'] ?? 1));
        $var = $vid ? row('SELECT v.*, p.nombre pn FROM variantes v JOIN productos p ON p.id=v.producto_id WHERE v.id=?', [$vid]) : null;
        $precio = isset($it['precio']) ? n($it['precio']) : n($var['precio'] ?? 0);
        $desc = $var ? $var['pn'] . ($var['etiqueta'] ? ' · ' . $var['etiqueta'] : '') : txt($it['descripcion'] ?? 'Artículo');
        $cu = $var ? n($var['costo']) : 0;
        $lineas[] = ['variante_id' => $vid, 'descripcion' => $desc, 'grabado' => txt($it['grabado'] ?? '') ?: null, 'cantidad' => $c, 'precio' => $precio, 'costo' => $cu];
        $sub += $precio * $c; $costo += $cu * $c;
    }
    $desc = min($sub, max(0, n($b['descuento'] ?? 0)));
    $total = n($sub - $desc);
    $pagos = array_filter($b['pagos'] ?? [], fn($p) => n($p['monto'] ?? 0) > 0);
    $pagado = min($total, n(array_sum(array_map(fn($p) => n($p['monto']), $pagos))));
    $folio = folio('V', 'ventas');
    $vid = insert('ventas', ['folio' => $folio, 'fecha' => ahora(), 'cliente_id' => $cid, 'nombre' => $cli['nombre'] ?? (txt($b['nombre'] ?? '') ?: null), 'telefono' => $cli['telefono'] ?? null,
        'usuario_id' => $uid, 'canal' => txt($b['canal'] ?? 'mostrador', 20), 'estado' => $pagado >= $total ? 'pagada' : 'pendiente', 'entrega' => txt($b['entrega'] ?? 'entregado', 20),
        'subtotal' => n($sub), 'descuento' => $desc, 'total' => $total, 'pagado' => $pagado, 'costo' => n($costo), 'notas' => txt($b['notas'] ?? '', 1000), 'inventario_aplicado' => 1]);
    foreach ($lineas as $l) { insert('venta_items', $l + ['venta_id' => $vid]); if ($l['variante_id']) mover($l['variante_id'], -$l['cantidad'], 'venta', $folio, $uid); }
    $resta = $pagado;
    foreach ($pagos as $p) { $m = min($resta, n($p['monto'])); if ($m <= 0) break; $resta -= $m;
        insert('pagos', ['venta_id' => $vid, 'fecha' => ahora(), 'monto' => $m, 'metodo' => txt($p['metodo'] ?? 'efectivo', 20), 'usuario_id' => $uid]); }
    if (!empty($b['cotizacion_id'])) q("UPDATE cotizaciones SET estado='vendida', venta_id=? WHERE id=?", [$vid, (int) $b['cotizacion_id']]);
    mk_db()->commit();
    json_out(['ok' => true, 'id' => $vid, 'folio' => $folio]);

case 'ventas':
    mk_liberar_vencidos();
    [$d, $h, $di, $hf] = rango();
    $w = ['v.fecha BETWEEN ? AND ?']; $p = [$di, $hf];
    if (!empty($_GET['estado'])) { $w[] = 'v.estado=?'; $p[] = $_GET['estado']; }
    if (!empty($_GET['canal'])) { $w[] = 'v.canal=?'; $p[] = $_GET['canal']; }
    if (!empty($_GET['q'])) { $w[] = '(v.folio LIKE ? OR v.nombre LIKE ? OR v.telefono LIKE ?)'; $l = '%' . $_GET['q'] . '%'; array_push($p, $l, $l, $l); }
    if (($_GET['estado'] ?? '') === 'pendiente' || ($_GET['estado'] ?? '') === 'pedido') { $w[0] = '1=1'; array_splice($p, 0, 2); }
    $r = rows('SELECT v.id,v.folio,v.fecha,v.nombre,v.telefono,v.canal,v.estado,v.entrega,v.total,v.pagado,u.nombre vendedor FROM ventas v LEFT JOIN usuarios u ON u.id=v.usuario_id WHERE ' . implode(' AND ', $w) . ' ORDER BY v.fecha DESC LIMIT 500', $p);
    json_out(['ok' => true, 'ventas' => $r]);

case 'venta':
    $v = row('SELECT v.*, u.nombre vendedor FROM ventas v LEFT JOIN usuarios u ON u.id=v.usuario_id WHERE v.id=?', [(int) ($_GET['id'] ?? 0)]);
    if (!$v) fail('No existe la venta');
    if (!es_dueno()) unset($v['costo']);
    $v['items'] = rows('SELECT id,variante_id,descripcion,grabado,cantidad,precio FROM venta_items WHERE venta_id=?', [$v['id']]);
    $v['pagos'] = rows('SELECT p.*, u.nombre usuario FROM pagos p LEFT JOIN usuarios u ON u.id=p.usuario_id WHERE venta_id=? ORDER BY p.id', [$v['id']]);
    json_out(['ok' => true, 'venta' => $v]);

case 'pago_agregar':
    $v = row('SELECT * FROM ventas WHERE id=?', [(int) ($b['venta_id'] ?? 0)]);
    if (!$v || $v['estado'] === 'cancelada') fail('No se puede cobrar esta venta');
    $m = min(n($b['monto'] ?? 0), n($v['total'] - $v['pagado']));
    if ($m <= 0) fail('Escribe un monto válido');
    mk_db()->beginTransaction();
    insert('pagos', ['venta_id' => $v['id'], 'fecha' => ahora(), 'monto' => $m, 'metodo' => txt($b['metodo'] ?? 'efectivo', 20), 'usuario_id' => $uid, 'notas' => txt($b['notas'] ?? '') ?: null]);
    $pag = n($v['pagado'] + $m);
    q('UPDATE ventas SET pagado=?, estado=? WHERE id=?', [$pag, $v['estado'] === 'pedido' ? 'pedido' : ($pag >= n($v['total']) ? 'pagada' : 'pendiente'), $v['id']]);
    mk_db()->commit();
    json_out(['ok' => true]);

case 'venta_confirmar':   // pedido de la web → venta (descuenta inventario)
    $v = row("SELECT * FROM ventas WHERE id=? AND estado='pedido'", [(int) ($b['id'] ?? 0)]);
    if (!$v) fail('Este pedido ya fue confirmado o no existe');
    mk_db()->beginTransaction();
    if (!$v['inventario_aplicado']) {
        foreach (rows('SELECT * FROM venta_items WHERE venta_id=?', [$v['id']]) as $it) if ($it['variante_id']) mover((int) $it['variante_id'], -(int) $it['cantidad'], 'venta', $v['folio'], $uid);
    }
    $costo = (float) val('SELECT COALESCE(SUM(vi.cantidad*COALESCE(va.costo,0)),0) FROM venta_items vi LEFT JOIN variantes va ON va.id=vi.variante_id WHERE vi.venta_id=?', [$v['id']]);
    q('UPDATE venta_items SET costo=COALESCE((SELECT costo FROM variantes WHERE variantes.id=venta_items.variante_id),0) WHERE venta_id=?', [$v['id']]);
    q('UPDATE ventas SET estado=?, inventario_aplicado=1, usuario_id=COALESCE(usuario_id,?), costo=?, entrega=? WHERE id=?',
        [n($v['pagado']) >= n($v['total']) ? 'pagada' : 'pendiente', $uid, n($costo), txt($b['entrega'] ?? 'en_produccion', 20), $v['id']]);
    mk_db()->commit();
    json_out(['ok' => true]);

case 'venta_actualizar':  // estado de entrega, notas, datos de cliente
    $id = (int) ($b['id'] ?? 0);
    $d = [];
    foreach (['entrega' => 20, 'notas' => 1000, 'envio' => 20] as $k => $l) if (isset($b[$k])) $d[$k] = txt($b[$k], $l);
    update('ventas', $id, $d);
    json_out(['ok' => true]);

case 'venta_cancelar':
    $v = row('SELECT * FROM ventas WHERE id=?', [(int) ($b['id'] ?? 0)]);
    if (!$v || $v['estado'] === 'cancelada') fail('No se puede cancelar');
    if (!es_dueno() && substr($v['fecha'], 0, 10) !== hoy()) fail('Solo el Dueño puede cancelar ventas de días anteriores', 403);
    mk_db()->beginTransaction();
    if ($v['inventario_aplicado'])
        foreach (rows('SELECT * FROM venta_items WHERE venta_id=?', [$v['id']]) as $it) if ($it['variante_id']) mover((int) $it['variante_id'], (int) $it['cantidad'], 'cancelación', $v['folio'], $uid);
    q("UPDATE ventas SET estado='cancelada', inventario_aplicado=0, notas=? WHERE id=?", [trim($v['notas'] . "\nCancelada por " . $u['nombre'] . ' el ' . date('d/m/Y H:i') . ($b['motivo'] ?? '' ? ': ' . txt($b['motivo']) : '')), $v['id']]);
    mk_db()->commit();
    json_out(['ok' => true]);

case 'carritos':
    $r = rows("SELECT * FROM carritos WHERE estado='abierto' AND telefono IS NOT NULL ORDER BY actualizado DESC LIMIT 100");
    foreach ($r as &$c) $c['items'] = json_decode($c['items'] ?: '[]', true);
    json_out(['ok' => true, 'carritos' => $r]);

case 'carrito_estado':
    q('UPDATE carritos SET estado=? WHERE id=?', [in_array($b['estado'] ?? '', ['contactado', 'descartado', 'abierto'], true) ? $b['estado'] : 'contactado', (int) ($b['id'] ?? 0)]);
    json_out(['ok' => true]);

/* ================= CLIENTES ================= */
case 'clientes':
    $l = '%' . ($_GET['q'] ?? '') . '%';
    json_out(['ok' => true, 'clientes' => rows("SELECT c.*, (SELECT COUNT(*) FROM ventas v WHERE v.cliente_id=c.id AND " . VALIDA . ") compras, (SELECT COALESCE(SUM(total),0) FROM ventas v WHERE v.cliente_id=c.id AND " . VALIDA . ") gastado, (SELECT MAX(fecha) FROM ventas v WHERE v.cliente_id=c.id AND " . VALIDA . ") ultima FROM clientes c WHERE c.nombre LIKE ? OR c.telefono LIKE ? OR c.email LIKE ? ORDER BY c.nombre LIMIT 500", [$l, $l, $l])]);

case 'cliente':
    $c = row('SELECT * FROM clientes WHERE id=?', [(int) ($_GET['id'] ?? 0)]);
    if (!$c) fail('No existe el cliente');
    $c['ventas'] = rows('SELECT id,folio,fecha,estado,total,pagado,canal FROM ventas WHERE cliente_id=? ORDER BY fecha DESC LIMIT 50', [$c['id']]);
    $c['citas'] = rows('SELECT * FROM citas WHERE cliente_id=? ORDER BY fecha DESC LIMIT 20', [$c['id']]);
    $c['cotizaciones'] = rows('SELECT id,folio,fecha,estado,total FROM cotizaciones WHERE cliente_id=? ORDER BY fecha DESC LIMIT 20', [$c['id']]);
    json_out(['ok' => true, 'cliente' => $c]);

case 'cliente_guardar':
    $id = (int) ($b['id'] ?? 0);
    $d = ['nombre' => txt($b['nombre'] ?? '', 160), 'telefono' => tel_limpio($b['telefono'] ?? '') ?: null, 'email' => txt($b['email'] ?? '', 160) ?: null,
        'cumple' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $b['cumple'] ?? '') ? $b['cumple'] : null, 'notas' => txt($b['notas'] ?? '', 2000)];
    if (!$d['nombre']) fail('Escribe el nombre');
    if ($d['telefono'] && val('SELECT id FROM clientes WHERE telefono=? AND id<>?', [$d['telefono'], $id])) fail('Ya hay un cliente con ese teléfono');
    if ($id) update('clientes', $id, $d); else $id = insert('clientes', $d + ['origen' => 'mostrador', 'creado' => ahora()]);
    json_out(['ok' => true, 'id' => $id]);

case 'cliente_borrar':
    $id = (int) ($b['id'] ?? 0);
    if (val('SELECT 1 FROM ventas WHERE cliente_id=?', [$id])) fail('El cliente tiene ventas; no se puede borrar');
    q('DELETE FROM clientes WHERE id=?', [$id]);
    json_out(['ok' => true]);

/* ================= AGENDA ================= */
case 'citas':
    [$d, $h] = rango();
    json_out(['ok' => true, 'citas' => rows('SELECT c.*, u.nombre usuario FROM citas c LEFT JOIN usuarios u ON u.id=c.usuario_id WHERE fecha BETWEEN ? AND ? ORDER BY fecha, hora', [$d, $h])]);

case 'cita_guardar':
    $id = (int) ($b['id'] ?? 0);
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $b['fecha'] ?? '')) fail('Elige la fecha');
    $cid = cliente_de((int) ($b['cliente_id'] ?? 0) ?: null, txt($b['nombre'] ?? '', 160), (string) ($b['telefono'] ?? ''));
    $d = ['cliente_id' => $cid, 'nombre' => txt($b['nombre'] ?? '', 160), 'telefono' => tel_limpio($b['telefono'] ?? '') ?: null, 'fecha' => $b['fecha'], 'hora' => txt($b['hora'] ?? '', 10),
        'motivo' => txt($b['motivo'] ?? ''), 'estado' => txt($b['estado'] ?? 'pendiente', 20), 'notas' => txt($b['notas'] ?? '', 2000)];
    if (!$d['nombre']) fail('Escribe el nombre');
    if ($id) update('citas', $id, $d); else $id = insert('citas', $d + ['origen' => 'panel', 'usuario_id' => $uid, 'creado' => ahora()]);
    json_out(['ok' => true, 'id' => $id]);

case 'cita_borrar':
    q('DELETE FROM citas WHERE id=?', [(int) ($b['id'] ?? 0)]);
    json_out(['ok' => true]);

/* ================= COTIZACIONES ================= */
case 'cotizaciones':
    $w = '1=1'; $p = [];
    if (!empty($_GET['estado'])) { $w = 'c.estado=?'; $p[] = $_GET['estado']; }
    json_out(['ok' => true, 'cotizaciones' => rows("SELECT c.*, u.nombre usuario FROM cotizaciones c LEFT JOIN usuarios u ON u.id=c.usuario_id WHERE $w ORDER BY c.fecha DESC LIMIT 300", $p)]);

case 'cotizacion':
    $c = row('SELECT c.*, u.nombre usuario FROM cotizaciones c LEFT JOIN usuarios u ON u.id=c.usuario_id WHERE c.id=?', [(int) ($_GET['id'] ?? 0)]);
    if (!$c) fail('No existe la cotización');
    $c['items'] = rows('SELECT * FROM cotizacion_items WHERE cotizacion_id=?', [$c['id']]);
    json_out(['ok' => true, 'cotizacion' => $c]);

case 'cotizacion_guardar':
    $id = (int) ($b['id'] ?? 0);
    $items = $b['items'] ?? [];
    if (!$items) fail('Agrega al menos un concepto');
    mk_db()->beginTransaction();
    $cid = cliente_de((int) ($b['cliente_id'] ?? 0) ?: null, txt($b['nombre'] ?? '', 160), (string) ($b['telefono'] ?? ''));
    $sub = 0; foreach ($items as $it) $sub += n($it['precio'] ?? 0) * max(1, (int) ($it['cantidad'] ?? 1));
    $desc = min($sub, max(0, n($b['descuento'] ?? 0)));
    $d = ['cliente_id' => $cid, 'nombre' => txt($b['nombre'] ?? '', 160) ?: null, 'telefono' => tel_limpio($b['telefono'] ?? '') ?: null,
        'vigencia' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $b['vigencia'] ?? '') ? $b['vigencia'] : date('Y-m-d', strtotime('+15 day')),
        'descuento' => $desc, 'total' => n($sub - $desc), 'notas' => txt($b['notas'] ?? '', 2000)];
    if ($id) { update('cotizaciones', $id, $d); q('DELETE FROM cotizacion_items WHERE cotizacion_id=?', [$id]); }
    else $id = insert('cotizaciones', $d + ['folio' => folio('C', 'cotizaciones'), 'fecha' => ahora(), 'estado' => 'abierta', 'origen' => 'panel', 'usuario_id' => $uid]);
    foreach ($items as $it)
        insert('cotizacion_items', ['cotizacion_id' => $id, 'variante_id' => (int) ($it['variante_id'] ?? 0) ?: null, 'descripcion' => txt($it['descripcion'] ?? 'Concepto'),
            'grabado' => txt($it['grabado'] ?? '') ?: null, 'cantidad' => max(1, (int) ($it['cantidad'] ?? 1)), 'precio' => n($it['precio'] ?? 0)]);
    mk_db()->commit();
    json_out(['ok' => true, 'id' => $id]);

case 'cotizacion_estado':
    q('UPDATE cotizaciones SET estado=? WHERE id=?', [in_array($b['estado'] ?? '', ['abierta', 'aceptada', 'rechazada'], true) ? $b['estado'] : 'abierta', (int) ($b['id'] ?? 0)]);
    json_out(['ok' => true]);

/* ================= GASTOS Y PROVEEDORES ================= */
case 'gastos':
    [$d, $h] = rango();
    json_out(['ok' => true, 'gastos' => rows('SELECT g.*, p.nombre proveedor, u.nombre usuario FROM gastos g LEFT JOIN proveedores p ON p.id=g.proveedor_id LEFT JOIN usuarios u ON u.id=g.usuario_id WHERE g.fecha BETWEEN ? AND ? ORDER BY g.fecha DESC, g.id DESC', [$d, $h]),
        'categorias' => array_values(array_filter(array_map('trim', explode(',', (string) ajuste('gasto_cats', 'Otros')))))]);

case 'gasto_guardar':
    $id = (int) ($b['id'] ?? 0);
    $d = ['fecha' => preg_match('/^\d{4}-\d{2}-\d{2}$/', $b['fecha'] ?? '') ? $b['fecha'] : hoy(), 'concepto' => txt($b['concepto'] ?? '', 200), 'categoria' => txt($b['categoria'] ?? 'Otros', 60),
        'monto' => n($b['monto'] ?? 0), 'metodo' => txt($b['metodo'] ?? 'efectivo', 20), 'proveedor_id' => (int) ($b['proveedor_id'] ?? 0) ?: null, 'notas' => txt($b['notas'] ?? '', 2000)];
    if (!$d['concepto'] || $d['monto'] <= 0) fail('Escribe el concepto y el monto');
    if ($id) update('gastos', $id, $d); else $id = insert('gastos', $d + ['usuario_id' => $uid, 'creado' => ahora()]);
    json_out(['ok' => true, 'id' => $id]);

case 'gasto_borrar':
    q('DELETE FROM gastos WHERE id=?', [(int) ($b['id'] ?? 0)]);
    json_out(['ok' => true]);

case 'proveedores':
    json_out(['ok' => true, 'proveedores' => rows('SELECT p.*, (SELECT COALESCE(SUM(monto),0) FROM gastos g WHERE g.proveedor_id=p.id) comprado, (SELECT MAX(fecha) FROM gastos g WHERE g.proveedor_id=p.id) ultima FROM proveedores p WHERE activo=1 ORDER BY nombre')]);

case 'proveedor_guardar':
    $id = (int) ($b['id'] ?? 0);
    $d = ['nombre' => txt($b['nombre'] ?? '', 160), 'contacto' => txt($b['contacto'] ?? '', 160) ?: null, 'telefono' => tel_limpio($b['telefono'] ?? '') ?: null,
        'email' => txt($b['email'] ?? '', 160) ?: null, 'surte' => txt($b['surte'] ?? '') ?: null, 'notas' => txt($b['notas'] ?? '', 2000)];
    if (!$d['nombre']) fail('Escribe el nombre del proveedor');
    if ($id) update('proveedores', $id, $d); else $id = insert('proveedores', $d + ['activo' => 1, 'creado' => ahora()]);
    json_out(['ok' => true, 'id' => $id]);

case 'proveedor_borrar':
    q('UPDATE proveedores SET activo=0 WHERE id=?', [(int) ($b['id'] ?? 0)]);
    json_out(['ok' => true]);

/* ================= REPORTES ================= */
case 'reporte':
    [$d, $h, $di, $hf] = rango();
    require __DIR__ . '/inc/reportes.php';
    json_out(['ok' => true] + reporte($di, $hf, $d, $h));

case 'reporte_mensual':
    $mes = preg_match('/^\d{4}-\d{2}$/', $_GET['mes'] ?? '') ? $_GET['mes'] : date('Y-m', strtotime('first day of last month'));
    require __DIR__ . '/inc/reportes.php';
    json_out(['ok' => true] + reporte_mensual($mes));

/* ================= USUARIOS Y AJUSTES ================= */
case 'usuarios':
    json_out(['ok' => true, 'usuarios' => rows('SELECT id,nombre,email,rol,activo,ultimo_acceso,creado FROM usuarios ORDER BY activo DESC, nombre'), 'max' => MK_MAX_USUARIOS]);

case 'usuario_guardar':
    $id = (int) ($b['id'] ?? 0);
    $email = strtolower(txt($b['email'] ?? '', 160));
    $d = ['nombre' => txt($b['nombre'] ?? '', 120), 'email' => $email, 'rol' => ($b['rol'] ?? '') === 'dueno' ? 'dueno' : 'vendedor', 'activo' => empty($b['activo']) ? 0 : 1];
    if (!$d['nombre'] || !filter_var($email, FILTER_VALIDATE_EMAIL)) fail('Escribe nombre y un correo válido');
    if (val('SELECT id FROM usuarios WHERE email=? AND id<>?', [$email, $id])) fail('Ese correo ya tiene usuario');
    $activos = (int) val('SELECT COUNT(*) FROM usuarios WHERE activo=1 AND id<>?', [$id]);
    if ($d['activo'] && $activos >= MK_MAX_USUARIOS) fail('Tu plan incluye hasta ' . MK_MAX_USUARIOS . ' usuarios activos. Desactiva uno o pasa al plan Empresa.');
    if ($id === $uid && ($d['rol'] !== 'dueno' || !$d['activo'])) fail('No puedes quitarte el rol de Dueño ni desactivarte a ti mismo');
    if (!empty($b['pass'])) { if (strlen($b['pass']) < 8) fail('La contraseña debe tener al menos 8 caracteres'); $d['pass_hash'] = password_hash($b['pass'], PASSWORD_DEFAULT); }
    if ($id) update('usuarios', $id, $d);
    else { if (empty($d['pass_hash'])) fail('Asigna una contraseña'); $id = insert('usuarios', $d + ['creado' => ahora()]); }
    json_out(['ok' => true, 'id' => $id]);

case 'mi_pass':
    $yo = row('SELECT pass_hash FROM usuarios WHERE id=?', [$uid]);
    if (!password_verify($b['actual'] ?? '', $yo['pass_hash'])) fail('La contraseña actual no es correcta');
    if (strlen($b['nueva'] ?? '') < 8) fail('La nueva contraseña debe tener al menos 8 caracteres');
    q('UPDATE usuarios SET pass_hash=? WHERE id=?', [password_hash($b['nueva'], PASSWORD_DEFAULT), $uid]);
    json_out(['ok' => true]);

case 'ajustes':
    json_out(['ok' => true, 'ajustes' => array_column(rows('SELECT clave,valor FROM ajustes'), 'valor', 'clave')]);

case 'ajustes_set':
    foreach (['negocio', 'telefono', 'direccion', 'ticket_pie', 'gasto_cats', 'envio_costo', 'web_pausa'] as $k) if (isset($b[$k])) {
        q('DELETE FROM ajustes WHERE clave=?', [$k]); q('INSERT INTO ajustes (clave,valor) VALUES (?,?)', [$k, txt($b[$k], 1000)]);
    }
    json_out(['ok' => true]);

default:
    fail('Acción desconocida', 404);
}
