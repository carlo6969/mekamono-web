<?php
/* Cotización de envíos con Envia.com (https://docs.envia.com/reference/shipping-rates) */
declare(strict_types=1);
require_once __DIR__ . '/comun.php';

function mkp_envia_base(): string { return mkp_c('envia_env', 'sandbox') === 'production' ? 'https://api.envia.com' : 'https://api-test.envia.com'; }

/* Errores por paquetería de la última cotización (para la página de configuración). */
function mkp_envia_errores(?string $c = null, int $code = 0, $msg = ''): array {
    static $e = [];
    if ($c !== null) $e[$c] = trim('HTTP ' . $code . ' ' . (is_string($msg) ? $msg : json_encode($msg, JSON_UNESCAPED_UNICODE)));
    return $e;
}

function mkp_cp_info(string $cp): array {
    $r = mkp_http('GET', 'https://geocodes.envia.com/zipcode/MX/' . rawurlencode($cp), ['Accept: application/json']);
    $d = is_array($r['json']) ? ($r['json'][0] ?? $r['json']) : [];
    $state = $d['state']['code']['2digit'] ?? ($d['state']['name'] ?? '');
    $city = $d['locality'] ?? ($d['city'] ?? '');
    return ['city' => is_string($city) ? $city : '', 'state' => is_string($state) ? $state : '', 'nombre' => trim(($d['locality'] ?? '') . ', ' . ($d['state']['name'] ?? ''), ', ')];
}

function mkp_paquete(int $piezas, float $valor): array {
    $p = (array) mkp_c('paquete', []);
    $peso = (float) ($p['peso_base'] ?? 0.2) + $piezas * (float) ($p['peso_por_pieza'] ?? 0.08);
    return [['type' => 'box', 'content' => 'Joyeria de acero inoxidable', 'amount' => 1, 'declaredValue' => round($valor, 2),
        'lengthUnit' => 'CM', 'weightUnit' => 'KG', 'weight' => round(max(0.1, $peso), 2),
        'dimensions' => ['length' => (float) ($p['largo'] ?? 20), 'width' => (float) ($p['ancho'] ?? 15), 'height' => (float) ($p['alto'] ?? 8)]]];
}

/* Devuelve ['demo'=>bool, 'destino'=>str, 'tarifas'=>[[id, carrier, service, desc, precio, dias]]] */
function mkp_cotizar(string $cp, int $piezas, float $valor, ?string $soloCarrier = null): array {
    $key = (string) mkp_c('envia_api_key', '');
    $info = mkp_cp_info($cp);
    if ($key === '') {
        /* Sin cuenta conectada: tarifas de EJEMPLO para la demo. No se pueden pagar. */
        $base = 119 + $piezas * 6;
        return ['demo' => true, 'destino' => $info['nombre'], 'tarifas' => [
            ['id' => 'estafeta|ground', 'carrier' => 'estafeta', 'service' => 'ground', 'desc' => 'Estafeta · Terrestre', 'precio' => $base, 'dias' => '3 a 5 días hábiles'],
            ['id' => 'fedex|express', 'carrier' => 'fedex', 'service' => 'express', 'desc' => 'FedEx · Día siguiente', 'precio' => $base + 95, 'dias' => '1 a 2 días hábiles'],
            ['id' => 'dhl|express', 'carrier' => 'dhl', 'service' => 'express', 'desc' => 'DHL · Express', 'precio' => $base + 130, 'dias' => '1 a 2 días hábiles']]];
    }
    $o = (array) mkp_c('origen', []);
    $origin = ['name' => (string) ($o['name'] ?? 'MEKAMONO'), 'company' => (string) ($o['company'] ?? 'MEKAMONO'), 'email' => (string) ($o['email'] ?? ''),
        'phone' => (string) ($o['phone'] ?? ''), 'street' => (string) ($o['street'] ?? ''), 'number' => (string) ($o['number'] ?? ''),
        'district' => (string) ($o['district'] ?? ''), 'city' => (string) ($o['city'] ?? ''), 'state' => (string) ($o['state'] ?? ''),
        'country' => 'MX', 'postalCode' => (string) ($o['postalCode'] ?? '')];
    $dest = ['name' => 'Cliente', 'phone' => '0000000000', 'street' => 'Por confirmar', 'number' => 'S/N', 'district' => '', 'city' => $info['city'],
        'state' => $info['state'], 'country' => 'MX', 'postalCode' => $cp];
    $carriers = $soloCarrier ? [$soloCarrier] : (array) mkp_c('envia_carriers', ['estafeta', 'fedex', 'dhl', 'paquetexpress']);
    $reqs = [];
    foreach ($carriers as $c) {
        $reqs[$c] = ['POST', mkp_envia_base() . '/ship/rate/', ['Content-Type: application/json', 'Authorization: Bearer ' . $key],
            ['origin' => $origin, 'destination' => $dest, 'packages' => mkp_paquete($piezas, $valor), 'shipment' => ['type' => 1, 'carrier' => $c], 'settings' => ['currency' => 'MXN']]];
    }
    $rates = [];
    foreach (mkp_http_multi($reqs, 15) as $c => $r) {
        if (empty($r['json']['data'])) mkp_envia_errores($c, (int) ($r['code'] ?? 0), $r['json']['error']['message'] ?? ($r['json']['message'] ?? ($r['error'] ?: (empty($r['code']) ? 'sin respuesta de Envia' : ''))));
        foreach ((array) ($r['json']['data'] ?? []) as $d) {
            if (!is_array($d) || !isset($d['totalPrice'])) continue;
            $dias = (string) ($d['deliveryEstimate'] ?? '');
            $rates[] = ['id' => $c . '|' . ($d['service'] ?? ''), 'carrier' => (string) $c, 'service' => (string) ($d['service'] ?? ''),
                'desc' => trim(ucfirst((string) ($d['carrierDescription'] ?? $c)) . ' · ' . (string) ($d['serviceDescription'] ?? $d['service'] ?? '')),
                'precio' => round((float) $d['totalPrice'], 2), 'dias' => $dias];
        }
    }
    usort($rates, fn($a, $b) => $a['precio'] <=> $b['precio']);
    /* Envío gratis a partir de cierto monto: la opción más barata queda en $0 (MekaMono absorbe ese costo). */
    $gratis = (float) mkp_c('envio_gratis_desde', 0);
    if ($rates && $gratis > 0 && $valor >= $gratis) { $rates[0]['precio'] = 0.0; $rates[0]['desc'] .= ' · Envío gratis'; }
    return ['demo' => false, 'destino' => $info['nombre'], 'tarifas' => array_slice($rates, 0, 8)];
}
