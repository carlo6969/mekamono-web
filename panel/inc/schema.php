<?php
/* Estructura de la base de datos del panel. Funciona en MySQL (Hostinger) y SQLite (pruebas). */
declare(strict_types=1);

function mk_schema(): array {
    $my = mk_driver() === 'mysql';
    $ID = $my ? 'INT AUTO_INCREMENT PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
    $T = $my ? ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' : '';
    $DT = $my ? 'DATETIME' : 'TEXT';
    $D = $my ? 'DATE' : 'TEXT';
    $TX = $my ? 'MEDIUMTEXT' : 'TEXT';
    $M = 'DECIMAL(10,2) NOT NULL DEFAULT 0';
    return [
        "CREATE TABLE IF NOT EXISTS ajustes (clave VARCHAR(60) PRIMARY KEY, valor TEXT)$T",
        "CREATE TABLE IF NOT EXISTS usuarios (id $ID, nombre VARCHAR(120) NOT NULL, email VARCHAR(160) NOT NULL UNIQUE, pass_hash VARCHAR(255) NOT NULL, rol VARCHAR(20) NOT NULL DEFAULT 'vendedor', activo TINYINT NOT NULL DEFAULT 1, ultimo_acceso $DT NULL, creado $DT NOT NULL)$T",
        "CREATE TABLE IF NOT EXISTS intentos (id $ID, ip VARCHAR(64) NOT NULL, tipo VARCHAR(20) NOT NULL, fecha $DT NOT NULL)$T",
        "CREATE TABLE IF NOT EXISTS productos (id $ID, ext_id VARCHAR(40) NULL, nombre VARCHAR(200) NOT NULL, categoria VARCHAR(80) NOT NULL DEFAULT '', descripcion $TX, opciones TEXT, fotos TEXT, en_web TINYINT NOT NULL DEFAULT 1, activo TINYINT NOT NULL DEFAULT 1, orden INT NOT NULL DEFAULT 0, creado $DT NOT NULL)$T",
        "CREATE TABLE IF NOT EXISTS variantes (id $ID, producto_id INT NOT NULL, ops TEXT, etiqueta VARCHAR(200) NOT NULL DEFAULT '', sku VARCHAR(60) NULL, precio $M, precio_anterior $M, costo $M, existencia INT NOT NULL DEFAULT 0, minimo INT NOT NULL DEFAULT 2, foto INT NOT NULL DEFAULT 0, activo TINYINT NOT NULL DEFAULT 1)$T",
        "CREATE TABLE IF NOT EXISTS movimientos (id $ID, variante_id INT NOT NULL, fecha $DT NOT NULL, cantidad INT NOT NULL, motivo VARCHAR(40) NOT NULL, ref VARCHAR(60) NULL, usuario_id INT NULL, notas VARCHAR(255) NULL)$T",
        "CREATE TABLE IF NOT EXISTS clientes (id $ID, nombre VARCHAR(160) NOT NULL, telefono VARCHAR(20) NULL, email VARCHAR(160) NULL, cumple $D NULL, notas TEXT, origen VARCHAR(30) NOT NULL DEFAULT 'mostrador', creado $DT NOT NULL)$T",
        "CREATE TABLE IF NOT EXISTS citas (id $ID, cliente_id INT NULL, nombre VARCHAR(160) NOT NULL, telefono VARCHAR(20) NULL, fecha $D NOT NULL, hora VARCHAR(10) NOT NULL DEFAULT '', motivo VARCHAR(255) NULL, estado VARCHAR(20) NOT NULL DEFAULT 'pendiente', origen VARCHAR(20) NOT NULL DEFAULT 'panel', usuario_id INT NULL, notas TEXT, creado $DT NOT NULL)$T",
        "CREATE TABLE IF NOT EXISTS cotizaciones (id $ID, folio VARCHAR(20) NOT NULL, cliente_id INT NULL, nombre VARCHAR(160) NULL, telefono VARCHAR(20) NULL, fecha $DT NOT NULL, vigencia $D NULL, estado VARCHAR(20) NOT NULL DEFAULT 'abierta', descuento $M, total $M, notas TEXT, origen VARCHAR(20) NOT NULL DEFAULT 'panel', usuario_id INT NULL, venta_id INT NULL)$T",
        "CREATE TABLE IF NOT EXISTS cotizacion_items (id $ID, cotizacion_id INT NOT NULL, variante_id INT NULL, descripcion VARCHAR(255) NOT NULL, grabado VARCHAR(255) NULL, cantidad INT NOT NULL DEFAULT 1, precio $M)$T",
        "CREATE TABLE IF NOT EXISTS ventas (id $ID, folio VARCHAR(20) NOT NULL, fecha $DT NOT NULL, cliente_id INT NULL, nombre VARCHAR(160) NULL, telefono VARCHAR(20) NULL, usuario_id INT NULL, canal VARCHAR(20) NOT NULL DEFAULT 'mostrador', estado VARCHAR(20) NOT NULL DEFAULT 'pagada', entrega VARCHAR(20) NOT NULL DEFAULT 'entregado', envio VARCHAR(20) NULL, cp VARCHAR(10) NULL, subtotal $M, descuento $M, total $M, pagado $M, costo $M, notas TEXT, sid VARCHAR(64) NULL, metodo_web VARCHAR(20) NULL, inventario_aplicado TINYINT NOT NULL DEFAULT 0)$T",
        "CREATE TABLE IF NOT EXISTS venta_items (id $ID, venta_id INT NOT NULL, variante_id INT NULL, descripcion VARCHAR(255) NOT NULL, grabado VARCHAR(255) NULL, cantidad INT NOT NULL DEFAULT 1, precio $M, costo $M)$T",
        "CREATE TABLE IF NOT EXISTS pagos (id $ID, venta_id INT NOT NULL, fecha $DT NOT NULL, monto $M, metodo VARCHAR(20) NOT NULL DEFAULT 'efectivo', usuario_id INT NULL, notas VARCHAR(255) NULL)$T",
        "CREATE TABLE IF NOT EXISTS proveedores (id $ID, nombre VARCHAR(160) NOT NULL, contacto VARCHAR(160) NULL, telefono VARCHAR(20) NULL, email VARCHAR(160) NULL, surte VARCHAR(255) NULL, notas TEXT, activo TINYINT NOT NULL DEFAULT 1, creado $DT NOT NULL)$T",
        "CREATE TABLE IF NOT EXISTS gastos (id $ID, fecha $D NOT NULL, concepto VARCHAR(200) NOT NULL, categoria VARCHAR(60) NOT NULL DEFAULT 'Otros', monto $M, metodo VARCHAR(20) NOT NULL DEFAULT 'efectivo', proveedor_id INT NULL, usuario_id INT NULL, notas TEXT, creado $DT NOT NULL)$T",
        "CREATE TABLE IF NOT EXISTS carritos (id $ID, sid VARCHAR(64) NOT NULL UNIQUE, nombre VARCHAR(160) NULL, telefono VARCHAR(20) NULL, items TEXT, subtotal $M, estado VARCHAR(20) NOT NULL DEFAULT 'abierto', creado $DT NOT NULL, actualizado $DT NOT NULL)$T",
    ];
}

function mk_instalar_schema(): void {
    foreach (mk_schema() as $sql) mk_db()->exec($sql);
    $idx = [
        'CREATE INDEX ix_var_prod ON variantes(producto_id)',
        'CREATE INDEX ix_ven_fecha ON ventas(fecha)',
        'CREATE INDEX ix_vi_venta ON venta_items(venta_id)',
        'CREATE INDEX ix_pag_venta ON pagos(venta_id)',
        'CREATE INDEX ix_gas_fecha ON gastos(fecha)',
        'CREATE INDEX ix_cit_fecha ON citas(fecha)',
        'CREATE INDEX ix_mov_var ON movimientos(variante_id)',
        'CREATE INDEX ix_int_ip ON intentos(ip, tipo, fecha)',
    ];
    foreach ($idx as $s) { try { mk_db()->exec($s); } catch (Throwable $e) { /* ya existe */ } }
}

/* Importa el catálogo de productos.js (formato de la web) a la base de datos. */
function mk_importar_catalogo(string $archivo): int {
    $js = file_get_contents($archivo);
    if (!preg_match('/MK_P\s*=\s*(\[.*\])\s*;?\s*$/s', $js, $m)) throw new RuntimeException('No se pudo leer productos.js');
    $lista = json_decode($m[1], true);
    if (!is_array($lista)) throw new RuntimeException('productos.js no tiene un JSON válido');
    $n = 0;
    mk_db()->beginTransaction();
    foreach ($lista as $i => $p) {
        if (val('SELECT 1 FROM productos WHERE ext_id=?', [(string) $p['id']])) continue;
        $pid = insert('productos', [
            'ext_id' => (string) $p['id'], 'nombre' => $p['n'], 'categoria' => $p['c'] ?? '', 'descripcion' => $p['d'] ?? '',
            'opciones' => json_encode($p['o'] ?? [], JSON_UNESCAPED_UNICODE), 'fotos' => json_encode($p['i'] ?? [], JSON_UNESCAPED_UNICODE),
            'en_web' => 1, 'activo' => 1, 'orden' => $i, 'creado' => ahora(),
        ]);
        $no = count($p['o'] ?? []);
        $sl = max(1, $no);   // sin opciones, la web guarda un valor de relleno al inicio
        foreach ($p['v'] ?? [] as $v) {
            $ops = $no ? array_map('strval', array_slice($v, 0, $no)) : [];
            [$precio, $ant, $stock, $foto] = array_slice($v, $sl, 4) + [0, 0, 0, 0];
            $precio = (float) $precio; $ant = (float) $ant;
            insert('variantes', [
                'producto_id' => $pid, 'ops' => json_encode($ops, JSON_UNESCAPED_UNICODE), 'etiqueta' => implode(' / ', $ops),
                'precio' => $precio, 'precio_anterior' => $ant, 'costo' => 0, 'existencia' => (int) $stock, 'minimo' => 1, 'foto' => (int) $foto, 'activo' => 1,
            ]);
        }
        $n++;
    }
    mk_db()->commit();
    return $n;
}
