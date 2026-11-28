/* MEKAMONO · Panel de control (APARECE · Plan Negocio) */
(() => {
'use strict';
const U = MK.usuario, DUENO = U.rol === 'dueno';
const $ = (s, e = document) => e.querySelector(s), $$ = (s, e = document) => [...e.querySelectorAll(s)];
const h = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $m = n => '$' + (+n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const $c = n => '$' + Math.round(+n || 0).toLocaleString('es-MX');
const ent = n => (+n || 0).toLocaleString('es-MX');
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const HOY = () => iso(new Date());
const masDias = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return iso(d); };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const fF = s => { if (!s) return ''; const [d, t] = String(s).split(' '); const [y, m, dd] = d.split('-'); return dd + '/' + m + '/' + y.slice(2) + (t ? ' ' + t.slice(0, 5) : ''); };
const fD = s => { const d = new Date(s + 'T12:00:00'); return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()]; };
const nomMes = ym => { const [y, m] = ym.split('-'); return MESES[+m - 1] + ' ' + y; };
const foto = f => !f ? '' : f.startsWith('sub:') ? '../../mekamono-subidas/' + f.slice(4) + '.webp' : MK.img + f + '.webp';
const tel10 = t => String(t || '').replace(/\D/g, '').slice(-10);
const waLink = (t, msg) => 'https://wa.me/52' + tel10(t) + (msg ? '?text=' + encodeURIComponent(msg) : '');
const primer = n => String(n || '').split(' ')[0];
const METODOS = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia', otro: 'Otro' };
const ESTADOS = { pagada: ['Pagada', 'ok'], pendiente: ['Debe saldo', 'wa'], pedido: ['Pedido web nuevo', 'inf'], cancelada: ['Cancelada', 'er'] };
const ENTREGAS = { entregado: 'Entregado', en_produccion: 'En grabado / producción', listo: 'Listo para recoger', enviado: 'Enviado', pendiente: 'Por confirmar' };
const tg = (t, c) => '<span class="tg ' + (c || '') + '">' + h(t) + '</span>';
const estTg = e => tg((ESTADOS[e] || [e])[0], (ESTADOS[e] || [])[1]);

/* ---------- API ---------- */
async function api(a, data, params) {
  const qs = new URLSearchParams(Object.assign({ a }, params || {}));
  const op = { headers: { 'X-CSRF': MK.csrf }, credentials: 'same-origin' };
  if (data instanceof FormData) { op.method = 'POST'; op.body = data; }
  else if (data !== undefined) { op.method = 'POST'; op.headers['Content-Type'] = 'application/json'; op.body = JSON.stringify(data); }
  let r;
  try { r = await fetch('api.php?' + qs, op); } catch (e) { toast('Sin conexión. Revisa tu internet.', 1); throw e; }
  if (r.status === 401) { location.reload(); throw new Error('sesión'); }
  let j; try { j = await r.json(); } catch (e) { toast('Error del servidor', 1); throw e; }
  if (!j.ok) { toast(j.error || 'Algo salió mal', 1); throw new Error(j.error); }
  return j;
}
let tT;
function toast(m, er) { const t = $('#toast'); t.textContent = m; t.className = 'toast on' + (er ? ' er' : ''); clearTimeout(tT); tT = setTimeout(() => t.className = 'toast', 3200); }

/* ---------- Modal ---------- */
function modal({ titulo, cuerpo, pie = '', ancho = false, alAbrir }) {
  const ov = document.createElement('div'); ov.className = 'ov';
  ov.innerHTML = '<div class="modal' + (ancho ? ' ancho' : '') + '" role="dialog"><header><h2>' + h(titulo) + '</h2><button class="cerrar" data-x aria-label="Cerrar">×</button></header><div class="cuerpo">' + cuerpo + '</div>' + (pie ? '<footer>' + pie + '</footer>' : '') + '</div>';
  const cerrar = () => { ov.remove(); if (!$('.ov')) document.body.style.overflow = ''; };
  ov.addEventListener('click', e => { if (e.target === ov || e.target.closest('[data-x]')) cerrar(); });
  document.body.appendChild(ov); document.body.style.overflow = 'hidden';
  ov.cerrar = cerrar;
  if (alAbrir) alAbrir(ov);
  const f = $('input:not([type=hidden]),select,textarea', ov); if (f && innerWidth > 860) f.focus();
  return ov;
}
function confirmar(msg, si = 'Sí, continuar') {
  return new Promise(res => {
    const m = modal({ titulo: 'Confirmar', cuerpo: '<p style="margin:0">' + h(msg) + '</p>', pie: '<button class="btn" data-x>No</button><button class="btn primario" data-si>' + h(si) + '</button>' });
    $('[data-si]', m).onclick = () => { m.cerrar(); res(true); };
  });
}
const form = el => { const o = {}; $$('[name]', el).forEach(i => { o[i.name] = i.type === 'checkbox' ? i.checked : i.value; }); return o; };
const opt = (obj, sel) => Object.entries(obj).map(([k, v]) => '<option value="' + h(k) + '"' + (k === sel ? ' selected' : '') + '>' + h(v) + '</option>').join('');
function descargarCSV(nombre, cab, filas) {
  const esc = v => { v = v == null ? '' : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const txt = '﻿' + [cab, ...filas].map(f => f.map(esc).join(',')).join('\r\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
  a.download = nombre + '.csv'; document.body.appendChild(a); a.click(); a.remove();
}
function imprimir(html, rep) { $('#imprimir').innerHTML = html; document.body.classList.toggle('print-rep', !!rep); setTimeout(() => window.print(), 50); }

/* ---------- Íconos ---------- */
const I = {
  inicio: 'M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  pos: 'M3 4h18v4H3zM5 8v12h14V8M9 12h6',
  ventas: 'M4 4h16v16H4zM8 9h8M8 13h8M8 17h5',
  inventario: 'M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8',
  clientes: 'M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM22 19v-1a4 4 0 0 0-3-3.9M16 4.1a3 3 0 0 1 0 5.8',
  agenda: 'M4 5h16v15H4zM4 10h16M9 3v4M15 3v4',
  cotizaciones: 'M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 13h6M9 17h6',
  gastos: 'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  proveedores: 'M1 4h14v12H1zM15 9h4l4 4v3h-8M5.5 19a2 2 0 1 0 0-.1M18.5 19a2 2 0 1 0 0-.1',
  reportes: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  usuarios: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  ajustes: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 14H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.7 1.7 0 0 0 21 10h.1a2 2 0 1 1 0 4z',
  web: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20',
  menu: 'M3 6h18M3 12h18M3 18h18',
};
const ico = k => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="' + I[k] + '"/></svg>';

/* ---------- Layout y rutas ---------- */
const MENU = [
  ['inicio', 'Inicio'], ['pos', 'Punto de venta'], ['ventas', 'Ventas y pedidos'], ['inventario', 'Inventario'], ['clientes', 'Clientes'],
  ['agenda', 'Agenda'], ['cotizaciones', 'Cotizaciones'], '-', ['gastos', 'Gastos', 1], ['proveedores', 'Proveedores', 1], ['reportes', 'Reportes', 1], '-',
  ['usuarios', 'Usuarios', 1], ['ajustes', DUENO ? 'Ajustes' : 'Mi cuenta'],
];
document.getElementById('app').innerHTML =
  '<div class="lay"><aside class="side" id="side"><div class="marca"><img src="../img/logo.webp" alt="MEKAMONO"></div><div class="plan">Panel · Plan Negocio</div><nav>' +
  MENU.filter(m => m === '-' || !m[2] || DUENO).map(m => m === '-' ? '<div class="sep"></div>' : '<a href="#' + m[0] + '" data-r="' + m[0] + '">' + ico(m[0]) + '<span>' + m[1] + '</span>' + (m[0] === 'ventas' ? '<i class="bad" id="badPed" hidden></i>' : '') + '</a>').join('') +
  (DUENO ? '<a href="../pagos/configurar.php">' + ico('gastos') + '<span>Pagos y envíos</span></a>' : '') +
  '<div class="sep"></div><a href="../" target="_blank" rel="noopener">' + ico('web') + '<span>Ver la tienda en línea</span></a></nav>' +
  '<div class="yo"><div><b>' + h(U.nombre) + '</b>' + (DUENO ? 'Dueño' : 'Vendedor') + '</div><a href="./?salir=1">Salir</a></div></aside>' +
  '<div style="flex:1;min-width:0"><div class="mtop"><button id="mMenu" aria-label="Menú">' + ico('menu').replace('<svg', '<svg width="22" height="22"') + '</button><img src="../img/logo.webp" alt="MEKAMONO"><span class="sp"></span><a class="btn mini oro" href="#pos">Vender</a></div>' +
  '<main class="main" id="vista"></main></div></div><div class="toast" id="toast"></div><div id="imprimir"></div>';
$('#mMenu').onclick = () => $('#side').classList.add('abierto');
$('#side').addEventListener('click', e => { if (e.target.closest('a') || e.target === $('#side')) $('#side').classList.remove('abierto'); });
document.addEventListener('click', e => { if ($('#side').classList.contains('abierto') && !e.target.closest('#side') && !e.target.closest('#mMenu')) $('#side').classList.remove('abierto'); });

const V = {};
let rutaActual = '';
async function ruta() {
  let r = (location.hash || '#inicio').slice(1).split('?')[0];
  if (!V[r]) r = 'inicio';
  const m = MENU.find(x => x[0] === r); if (m && m[2] && !DUENO) r = 'inicio';
  rutaActual = r;
  $$('#side nav a[data-r]').forEach(a => a.classList.toggle('on', a.dataset.r === r));
  const v = $('#vista'); v.innerHTML = '<div class="vacio">Cargando…</div>';
  window.scrollTo(0, 0);
  try { await V[r](v); } catch (e) { console.error(e); if (rutaActual === r) v.innerHTML = '<div class="vacio">No se pudo cargar. <button class="btn mini" onclick="location.reload()">Reintentar</button></div>'; }
}
addEventListener('hashchange', ruta);
const top = (t, acciones = '') => '<div class="top"><h1>' + h(t) + '</h1>' + acciones + '</div>';
const recargar = () => ruta();

/* ---------- Catálogo en memoria ---------- */
let CAT = null;
async function catalogo(forzar) {
  if (CAT && !forzar) return CAT;
  const j = await api('productos');
  j.productos.forEach(p => { p.k = (p.nombre + ' ' + p.categoria + ' ' + p.v.map(v => v.etiqueta + ' ' + (v.sku || '')).join(' ')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); p.stock = p.v.reduce((a, v) => a + Math.max(0, +v.existencia), 0); p.min = Math.min(...p.v.map(v => +v.precio)); p.max = Math.max(...p.v.map(v => +v.precio)); p.falt = p.v.filter(v => +v.existencia <= +v.minimo).length; });
  CAT = j; return CAT;
}
const CATS_WEB = ['Personalizados', 'Esclavas', 'Cadenas', 'Collares', 'Brazaletes', 'Anillos', 'Dijes', 'Accesorios'];
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const fotoP = (p, v) => foto(p.fotos[(v && +v.foto) || 0] || p.fotos[0]);

/* Selector de producto/variante reutilizable */
async function elegirVariante(cb, { titulo = 'Elegir producto', conStock = false } = {}) {
  const c = await catalogo();
  const m = modal({ titulo, ancho: true, cuerpo: '<input placeholder="Buscar por nombre, color, medida…" data-b><div class="pgrid" data-g></div>' });
  const pintar = () => {
    const q = norm($('[data-b]', m).value).split(/\s+/).filter(Boolean);
    const l = c.productos.filter(p => q.every(w => p.k.includes(w))).slice(0, 60);
    $('[data-g]', m).innerHTML = l.map(p => '<button class="pitem' + (p.stock ? '' : ' agot') + '" data-p="' + p.id + '"><img src="' + fotoP(p) + '" alt="" loading="lazy"><div><b>' + h(p.nombre) + '</b><span>' + (p.min !== p.max ? 'Desde ' : '') + $c(p.min) + '</span> <small class="muted">· ' + p.stock + ' pzas</small></div></button>').join('') || '<div class="vacio">Sin resultados</div>';
  };
  $('[data-b]', m).oninput = pintar; pintar();
  $('[data-g]', m).onclick = e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    const p = c.productos.find(x => x.id == b.dataset.p);
    if (p.v.length === 1) { m.cerrar(); cb(p, p.v[0]); return; }
    $('.cuerpo', m).innerHTML = '<div class="fila"><button class="btn mini" data-back>← Volver</button><b>' + h(p.nombre) + '</b></div><div class="vopts">' + p.v.map(v => '<button data-v="' + v.id + '"' + (conStock && +v.existencia <= 0 ? ' disabled' : '') + '><b>' + h(v.etiqueta || 'Única') + '</b><small>' + $m(v.precio) + ' · ' + v.existencia + ' en existencia</small></button>').join('') + '</div>';
    $('[data-back]', m).onclick = () => { m.cerrar(); elegirVariante(cb, { titulo, conStock }); };
    $('.vopts', m).onclick = ev => { const vb = ev.target.closest('[data-v]'); if (!vb) return; m.cerrar(); cb(p, p.v.find(v => v.id == vb.dataset.v)); };
  };
}

/* Buscador de cliente con alta rápida */
async function elegirCliente(cb) {
  const m = modal({ titulo: 'Cliente', cuerpo: '<input placeholder="Buscar por nombre o teléfono" data-b><div class="lista" data-l></div><div class="sep"></div><h3>O cliente nuevo</h3><div class="f2"><label>Nombre<input name="nombre"></label><label>WhatsApp (10 dígitos)<input name="telefono" inputmode="tel"></label></div>', pie: '<button class="btn" data-x>Cancelar</button><button class="btn primario" data-ok>Usar cliente nuevo</button>' });
  let tm;
  const buscar = async () => {
    const q = $('[data-b]', m).value.trim();
    const j = await api('clientes', undefined, { q });
    $('[data-l]', m).innerHTML = j.clientes.slice(0, 8).map(c => '<div data-c="' + c.id + '" style="cursor:pointer"><div class="flex"><b>' + h(c.nombre) + '</b><small>' + h(c.telefono || 'Sin teléfono') + ' · ' + c.compras + ' compras</small></div><button class="btn mini">Elegir</button></div>').join('') || '<p class="muted">Sin coincidencias</p>';
  };
  $('[data-b]', m).oninput = () => { clearTimeout(tm); tm = setTimeout(buscar, 250); };
  buscar();
  $('[data-l]', m).onclick = async e => { const d = e.target.closest('[data-c]'); if (!d) return; const j = await api('cliente', undefined, { id: d.dataset.c }); m.cerrar(); cb({ id: j.cliente.id, nombre: j.cliente.nombre, telefono: j.cliente.telefono }); };
  $('[data-ok]', m).onclick = () => { const f = form(m); if (!f.nombre.trim()) return toast('Escribe el nombre', 1); m.cerrar(); cb({ id: null, nombre: f.nombre.trim(), telefono: tel10(f.telefono) }); };
}

/* ---------- Ticket impreso ---------- */
function htmlTicket(v) {
  return '<div class="tk"><h3>' + h(MK.negocio) + '</h3><div class="c">Bisutería + Grabado Láser<br>Av. Revolución 503, Local C, Pachuca<br>WhatsApp 56 5920 6025</div><hr>' +
    '<div>Folio: <b>' + h(v.folio) + '</b><br>' + fF(v.fecha) + '<br>Atendió: ' + h(v.vendedor || U.nombre) + (v.nombre ? '<br>Cliente: ' + h(v.nombre) : '') + '</div><hr><table>' +
    v.items.map(i => '<tr><td>' + i.cantidad + ' × ' + h(i.descripcion) + (i.grabado ? '<br><small>Grabado: ' + h(i.grabado) + '</small>' : '') + '</td><td style="text-align:right">' + $m(i.cantidad * i.precio) + '</td></tr>').join('') +
    '</table><hr><table><tr><td>Subtotal</td><td style="text-align:right">' + $m(v.subtotal) + '</td></tr>' + (+v.descuento ? '<tr><td>Descuento</td><td style="text-align:right">-' + $m(v.descuento) + '</td></tr>' : '') +
    '<tr><td><b>TOTAL</b></td><td style="text-align:right"><b>' + $m(v.total) + '</b></td></tr>' + (v.pagos || []).map(p => '<tr><td>' + (METODOS[p.metodo] || p.metodo) + '</td><td style="text-align:right">' + $m(p.monto) + '</td></tr>').join('') +
    (+v.total - +v.pagado > 0.009 ? '<tr><td><b>Saldo pendiente</b></td><td style="text-align:right"><b>' + $m(v.total - v.pagado) + '</b></td></tr>' : '') + (v.cambio ? '<tr><td>Cambio</td><td style="text-align:right">' + $m(v.cambio) + '</td></tr>' : '') +
    '</table>' + (v.entrega && v.entrega !== 'entregado' ? '<hr><div>Entrega: ' + h(ENTREGAS[v.entrega] || v.entrega) + '</div>' : '') + '<hr><div class="c">' + h(MK.pie || '¡Gracias por tu compra! @mekamono') + '</div></div>';
}
function textoTicket(v) {
  return 'Hola ' + primer(v.nombre) + ', gracias por tu compra en MEKAMONO 🐵\nFolio ' + v.folio + '\n' + v.items.map(i => '• ' + i.cantidad + ' × ' + i.descripcion + (i.grabado ? ' (grabado: ' + i.grabado + ')' : '') + ' ' + $m(i.cantidad * i.precio)).join('\n') +
    '\nTotal: ' + $m(v.total) + (+v.total - +v.pagado > 0.009 ? '\nPagado: ' + $m(v.pagado) + '\nSaldo: ' + $m(v.total - v.pagado) : '') + (v.entrega && v.entrega !== 'entregado' ? '\nEstado: ' + (ENTREGAS[v.entrega] || v.entrega) : '');
}

/* ================= INICIO ================= */
V.inicio = async v => {
  const d = await api('inicio');
  badge(d.pedidosWeb.length);
  const dias = Object.entries(d.dias), mx = Math.max(1, ...dias.map(x => x[1]));
  const hr = new Date().getHours();
  v.innerHTML = top((hr < 12 ? 'Buenos días' : hr < 19 ? 'Buenas tardes' : 'Buenas noches') + ', ' + primer(U.nombre), '<a class="btn primario" href="#pos">' + ico('pos').replace('<svg', '<svg width="16"') + ' Nueva venta</a>') +
    '<div class="grid g4">' +
    '<div class="card kpi"><span>Vendido hoy</span><b>' + $c(d.hoy.t) + '</b><small>' + d.hoy.n + ' ventas · cobrado ' + $c(d.cobradoHoy) + '</small></div>' +
    '<div class="card kpi"><span>Vendido este mes</span><b>' + $c(d.mes.t) + '</b><small>' + d.mes.n + ' ventas</small></div>' +
    '<div class="card kpi"><span>Por cobrar (anticipos)</span><b>' + $c(d.porCobrar.t) + '</b><small>' + d.porCobrar.n + ' ventas con saldo</small></div>' +
    (DUENO ? '<div class="card kpi"><span>Gastos del mes</span><b>' + $c(d.gastosMes) + '</b><small>Utilidad aprox. ' + $c(d.mes.t - d.gastosMes) + '</small></div>' : '<div class="card kpi"><span>Productos por agotarse</span><b>' + d.nFaltantes + '</b><small>en o bajo el mínimo</small></div>') +
    '</div><div class="esp"></div><div class="grid g2">' +
    '<div class="card"><h2>Pedidos de la web por confirmar <a class="btn mini" href="#ventas?t=pedido">Ver todos</a></h2>' + (d.pedidosWeb.length ? '<div class="lista">' + d.pedidosWeb.map(p => '<div><div class="flex"><b>' + h(p.folio) + ' · ' + h(p.nombre || 'Sin nombre') + '</b><small>' + fF(p.fecha) + ' · ' + $m(p.total) + '</small></div>' + (p.telefono ? '<a class="btn mini" target="_blank" rel="noopener" href="' + waLink(p.telefono, 'Hola ' + primer(p.nombre) + ', recibimos tu pedido ' + p.folio + ' en MEKAMONO 🐵') + '">WhatsApp</a>' : '') + '<button class="btn mini primario" data-venta="' + p.id + '">Abrir</button></div>').join('') + '</div>' : '<p class="muted">No hay pedidos nuevos. Cuando un cliente envíe su carrito desde la web aparecerá aquí.</p>') +
    (d.carritos ? '<p class="peque"><a href="#ventas?t=carritos">' + d.carritos + ' carrito(s) sin terminar en los últimos 7 días →</a></p>' : '') + '</div>' +
    '<div class="card"><h2>Citas de hoy <a class="btn mini" href="#agenda">Agenda</a></h2>' + (d.citas.length ? '<div class="lista">' + d.citas.map(c => '<div><b style="min-width:58px">' + h(c.hora || '—') + '</b><div class="flex"><b>' + h(c.nombre) + '</b><small>' + h(c.motivo || '') + '</small></div>' + tg(c.estado, c.estado === 'confirmada' ? 'inf' : 'wa') + '</div>').join('') + '</div>' : '<p class="muted">Sin citas para hoy.</p>') + '</div>' +
    '<div class="card"><h2>Ventas de los últimos 14 días</h2><div class="bars">' + dias.map(([k, t]) => '<div title="' + fF(k) + ': ' + $m(t) + '"><i style="height:' + Math.round(t / mx * 100) + '%"></i><span>' + +k.slice(8) + '</span></div>').join('') + '</div></div>' +
    '<div class="card"><h2>Por agotarse <a class="btn mini" href="#inventario?f=1">Ver ' + d.nFaltantes + '</a></h2>' + (d.faltantes.length ? '<div class="lista">' + d.faltantes.map(f => { const fs = JSON.parse(f.fotos || '[]'); return '<div><img class="mini" style="width:34px;height:34px;border-radius:6px;object-fit:cover" src="' + foto(fs[+f.foto] || fs[0]) + '" alt=""><div class="flex"><b>' + h(f.nombre) + '</b><small>' + h(f.etiqueta || 'Única') + '</small></div>' + tg(f.existencia + ' / mín ' + f.minimo, +f.existencia <= 0 ? 'er' : 'wa') + '</div>'; }).join('') + '</div>' : '<p class="muted">Todo con existencia suficiente.</p>') + '</div>' +
    (d.produccion.length ? '<div class="card"><h2>Trabajos en grabado o listos</h2><div class="lista">' + d.produccion.map(p => '<div><div class="flex"><b>' + h(p.folio) + ' · ' + h(p.nombre || 'Mostrador') + '</b><small>' + ENTREGAS[p.entrega] + (+p.total - +p.pagado > 0.009 ? ' · debe ' + $m(p.total - p.pagado) : '') + '</small></div><button class="btn mini" data-venta="' + p.id + '">Abrir</button></div>').join('') + '</div></div>' : '') +
    '</div>';
  v.onclick = e => { const b = e.target.closest('[data-venta]'); if (b) verVenta(+b.dataset.venta, recargar); };
};
function badge(n) { const b = $('#badPed'); if (b) { b.hidden = !n; b.textContent = n; } }

/* ================= PUNTO DE VENTA ================= */
const T = { items: [], cliente: null, descuento: 0, entrega: 'entregado', metodo: 'efectivo', monto: null, recibido: '', notas: '', cotizacion_id: null };
const tTotal = () => { const s = T.items.reduce((a, i) => a + i.precio * i.cantidad, 0); return { sub: s, total: Math.max(0, s - (+T.descuento || 0)) }; };
V.pos = async v => {
  const c = await catalogo(true);
  let cat = '', q = '';
  v.innerHTML = '<div class="pos"><div><div class="top"><h1>Punto de venta</h1><button class="btn" data-libre>+ Concepto libre</button></div><input placeholder="Buscar producto (nombre, color, medida)…" data-q autocomplete="off"><div class="esp" style="height:8px"></div><div class="chips" data-cats></div><div class="pgrid" data-g></div></div>' +
    '<div class="card ticket" id="ticket"></div></div><div class="fab"><button class="btn primario grande" style="width:100%" data-vert>Ver ticket · <span data-ftot></span></button></div>';
  const cats = ['', ...c.categorias];
  const pintarCats = () => $('[data-cats]', v).innerHTML = cats.map(k => '<button class="' + (k === cat ? 'on' : '') + '" data-cat="' + h(k) + '">' + (k || 'Todo') + '</button>').join('');
  const pintar = () => {
    const w = norm(q).split(/\s+/).filter(Boolean);
    const l = c.productos.filter(p => (!cat || p.categoria === cat) && w.every(x => p.k.includes(x)));
    $('[data-g]', v).innerHTML = l.map(p => '<button class="pitem' + (p.stock ? '' : ' agot') + '" data-p="' + p.id + '"><img src="' + fotoP(p) + '" alt="" loading="lazy"><div><b>' + h(p.nombre) + '</b><span>' + (p.min !== p.max ? 'Desde ' : '') + $c(p.min) + '</span> <small class="muted">· ' + p.stock + '</small></div></button>').join('') || '<div class="vacio">Sin resultados</div>';
  };
  pintarCats(); pintar(); pintarTicket();
  $('[data-q]', v).oninput = e => { q = e.target.value; pintar(); };
  $('[data-cats]', v).onclick = e => { const b = e.target.closest('[data-cat]'); if (!b) return; cat = b.dataset.cat; pintarCats(); pintar(); };
  $('[data-g]', v).onclick = e => {
    const b = e.target.closest('[data-p]'); if (!b) return;
    const p = c.productos.find(x => x.id == b.dataset.p);
    const add = va => { agregar(p, va); };
    if (p.v.length === 1) return add(p.v[0]);
    const m = modal({ titulo: p.nombre, cuerpo: '<div class="vopts">' + p.v.map(va => '<button data-v="' + va.id + '"><b>' + h(va.etiqueta || 'Única') + '</b><small>' + $m(va.precio) + ' · ' + va.existencia + ' en existencia</small></button>').join('') + '</div>' });
    $('.vopts', m).onclick = ev => { const vb = ev.target.closest('[data-v]'); if (!vb) return; m.cerrar(); add(p.v.find(x => x.id == vb.dataset.v)); };
  };
  $('[data-libre]', v).onclick = () => {
    const m = modal({ titulo: 'Concepto libre', cuerpo: '<label>Descripción<input name="d" placeholder="Ej. Grabado extra, servicio, pieza especial"></label><div class="f2"><label>Precio<input name="p" type="number" step="0.01" min="0"></label><label>Cantidad<input name="c" type="number" min="1" value="1"></label></div>', pie: '<button class="btn" data-x>Cancelar</button><button class="btn primario" data-ok>Agregar</button>' });
    $('[data-ok]', m).onclick = () => { const f = form(m); if (!f.d.trim() || !(+f.p >= 0)) return toast('Escribe descripción y precio', 1); T.items.push({ k: 'l' + Date.now(), variante_id: null, descripcion: f.d.trim(), precio: +f.p, cantidad: Math.max(1, +f.c || 1), grabado: '', stock: Infinity }); m.cerrar(); pintarTicket(); };
  };
  $('[data-vert]', v).onclick = () => $('#ticket').classList.add('abierto');
};
function agregar(p, va) {
  const ex = T.items.find(i => i.variante_id === va.id && !i.grabado);
  if (+va.existencia <= 0) toast('Ojo: ' + p.nombre + ' no tiene existencia registrada', 1);
  if (ex) ex.cantidad++;
  else T.items.push({ k: 'v' + va.id + '-' + Date.now(), variante_id: va.id, descripcion: p.nombre + (va.etiqueta ? ' · ' + va.etiqueta : ''), precio: +va.precio, cantidad: 1, grabado: '', stock: +va.existencia, img: fotoP(p, va), pers: /personaliz/i.test(p.nombre + p.categoria) });
  pintarTicket(); if (innerWidth > 860) return; toast('Agregado: ' + p.nombre);
}
function pintarTicket() {
  const el = $('#ticket'); if (!el) return;
  const { sub, total } = tTotal();
  if (!T.montoManual || T.monto > total) { T.monto = total; T.montoManual = false; }
  const debe = Math.max(0, total - (+T.monto || 0));
  const cambio = T.metodo === 'efectivo' && +T.recibido > +T.monto ? +T.recibido - +T.monto : 0;
  const ftot = $('[data-ftot]'); if (ftot) ftot.textContent = T.items.length ? $m(total) + ' (' + T.items.reduce((a, i) => a + i.cantidad, 0) + ')' : 'vacío';
  el.innerHTML = '<div class="fila"><h2 class="flex">Ticket</h2>' + (T.items.length ? '<button class="btn mini link" data-vaciar>Vaciar</button>' : '') + '<button class="btn mini fab-x" data-cerrar-t style="display:' + (innerWidth <= 860 ? '' : 'none') + '">Cerrar</button></div>' +
    '<div class="fila"><div class="flex">' + (T.cliente ? '<b>' + h(T.cliente.nombre) + '</b><br><small class="muted">' + h(T.cliente.telefono || '') + '</small>' : '<span class="muted">Venta de mostrador</span>') + '</div><button class="btn mini" data-cli>' + (T.cliente ? 'Cambiar' : '+ Cliente') + '</button>' + (T.cliente ? '<button class="btn mini link" data-sincli>Quitar</button>' : '') + '</div>' +
    (T.items.length ? T.items.map((i, n) => '<div class="tline" data-i="' + n + '"><div><div class="n">' + h(i.descripcion) + '</div>' + (i.cantidad > i.stock ? '<small style="color:var(--er)">Solo hay ' + i.stock + ' en existencia</small>' : '') + '</div><div class="q"><button data-menos>−</button><b style="min-width:20px;text-align:center">' + i.cantidad + '</b><button data-mas>+</button></div>' +
      '<div class="x"><input type="number" step="0.01" min="0" value="' + i.precio + '" data-precio style="width:96px" aria-label="Precio"><input placeholder="Texto del grabado (opcional)" value="' + h(i.grabado) + '" data-grab></div></div>').join('') : '<div class="vacio">Toca un producto para agregarlo</div>') +
    '<div class="fila"><span class="flex muted">Subtotal</span><b>' + $m(sub) + '</b></div><div class="fila"><span class="flex muted">Descuento $</span><input type="number" min="0" step="1" value="' + (T.descuento || '') + '" data-desc style="width:110px"></div>' +
    '<div class="total"><span>Total</span><span>' + $m(total) + '</span></div>' +
    '<div class="metodos">' + Object.entries(METODOS).map(([k, l]) => '<button class="' + (T.metodo === k ? 'on' : '') + '" data-met="' + k + '">' + l + '</button>').join('') + '</div>' +
    '<div class="f2"><label>Paga ahora<input type="number" min="0" step="0.01" value="' + (+T.monto).toFixed(2) + '" data-monto></label>' + (T.metodo === 'efectivo' ? '<label>Recibe efectivo<input type="number" min="0" step="1" value="' + h(T.recibido) + '" data-rec placeholder="Para calcular cambio"></label>' : '<span></span>') + '</div>' +
    (debe > 0.009 ? '<div class="alerta" style="background:var(--wal);color:var(--wa)">Anticipo: queda a deber <b>' + $m(debe) + '</b>' + (T.cliente ? '' : ' · agrega el cliente para darle seguimiento') + '</div>' : '') + (cambio ? '<div class="alerta ok">Cambio: <b>' + $m(cambio) + '</b></div>' : '') +
    '<label>Entrega<select data-ent>' + opt({ entregado: 'Se lo lleva ahora', en_produccion: 'Queda en grabado / producción', listo: 'Listo, pasa a recoger después' }, T.entrega) + '</select></label>' +
    '<label>Notas<input data-notas value="' + h(T.notas) + '" placeholder="Opcional"></label>' +
    '<div class="fila"><button class="btn" data-cot ' + (T.items.length ? '' : 'disabled') + '>Guardar como cotización</button><button class="btn primario grande flex" data-cobrar ' + (T.items.length ? '' : 'disabled') + '>Cobrar ' + $m(T.monto) + '</button></div>';
  const ix = e => T.items[+e.target.closest('[data-i]').dataset.i];
  el.onclick = async e => {
    const t = e.target;
    if (t.closest('[data-mas]')) { ix(e).cantidad++; pintarTicket(); }
    else if (t.closest('[data-menos]')) { const i = ix(e); i.cantidad--; if (i.cantidad < 1) T.items.splice(T.items.indexOf(i), 1); pintarTicket(); }
    else if (t.closest('[data-met]')) { T.metodo = t.closest('[data-met]').dataset.met; pintarTicket(); }
    else if (t.closest('[data-vaciar]')) { if (await confirmar('¿Vaciar el ticket?')) { resetT(); pintarTicket(); } }
    else if (t.closest('[data-cerrar-t]')) el.classList.remove('abierto');
    else if (t.closest('[data-cli]')) elegirCliente(c => { T.cliente = c; pintarTicket(); });
    else if (t.closest('[data-sincli]')) { T.cliente = null; pintarTicket(); }
    else if (t.closest('[data-cobrar]')) cobrar(t.closest('[data-cobrar]'));
    else if (t.closest('[data-cot]')) editarCotizacion({ items: T.items.map(i => ({ variante_id: i.variante_id, descripcion: i.descripcion, precio: i.precio, cantidad: i.cantidad, grabado: i.grabado })), nombre: T.cliente?.nombre || '', telefono: T.cliente?.telefono || '', cliente_id: T.cliente?.id || null, descuento: T.descuento }, () => { resetT(); pintarTicket(); location.hash = '#cotizaciones'; });
  };
  el.onchange = e => {
    const t = e.target;
    if (t.matches('[data-precio]')) { ix(e).precio = Math.max(0, +t.value || 0); T.monto = null; pintarTicket(); }
    else if (t.matches('[data-grab]')) ix(e).grabado = t.value;
    else if (t.matches('[data-desc]')) { T.descuento = Math.max(0, +t.value || 0); T.monto = null; pintarTicket(); }
    else if (t.matches('[data-monto]')) { T.monto = Math.max(0, +t.value || 0); T.montoManual = T.monto < tTotal().total; pintarTicket(); }
    else if (t.matches('[data-rec]')) { T.recibido = t.value; pintarTicket(); }
    else if (t.matches('[data-ent]')) T.entrega = t.value;
    else if (t.matches('[data-notas]')) T.notas = t.value;
  };
}
function resetT() { Object.assign(T, { items: [], cliente: null, descuento: 0, entrega: 'entregado', metodo: 'efectivo', monto: null, montoManual: false, recibido: '', notas: '', cotizacion_id: null }); }
async function cobrar(btn) {
  const { total } = tTotal();
  if (+T.monto < total - 0.009 && !T.cliente) { if (!await confirmar('La venta queda con saldo pendiente y sin cliente. ¿Continuar?')) return; }
  if (T.items.some(i => i.pers && !i.grabado.trim()) && T.entrega === 'entregado' && !await confirmar('Hay piezas personalizables sin texto de grabado. ¿Cobrar así?')) return;
  btn.disabled = true;
  const cambio = T.metodo === 'efectivo' && +T.recibido > +T.monto ? +T.recibido - +T.monto : 0;
  try {
    const r = await api('venta_crear', { items: T.items.map(i => ({ variante_id: i.variante_id, descripcion: i.descripcion, precio: i.precio, cantidad: i.cantidad, grabado: i.grabado })),
      cliente_id: T.cliente?.id || null, nombre: T.cliente?.nombre || '', telefono: T.cliente?.telefono || '', descuento: T.descuento, entrega: T.entrega, notas: T.notas,
      pagos: +T.monto > 0 ? [{ metodo: T.metodo, monto: +T.monto }] : [], cotizacion_id: T.cotizacion_id });
    resetT(); pintarTicket(); $('#ticket')?.classList.remove('abierto'); CAT = null;
    const j = await api('venta', undefined, { id: r.id }); j.venta.cambio = cambio;
    const m = modal({ titulo: 'Venta ' + r.folio + ' registrada', cuerpo: '<div class="total"><span>Total</span><span>' + $m(j.venta.total) + '</span></div>' + (cambio ? '<div class="alerta ok">Cambio a entregar: <b>' + $m(cambio) + '</b></div>' : '') + (+j.venta.total - +j.venta.pagado > 0.009 ? '<div class="alerta" style="background:var(--wal);color:var(--wa)">Queda a deber ' + $m(j.venta.total - j.venta.pagado) + '</div>' : ''),
      pie: '<button class="btn" data-imp>Imprimir ticket</button>' + (j.venta.telefono ? '<a class="btn" target="_blank" rel="noopener" href="' + waLink(j.venta.telefono, textoTicket(j.venta)) + '">Enviar por WhatsApp</a>' : '') + '<button class="btn primario" data-x>Nueva venta</button>' });
    $('[data-imp]', m).onclick = () => imprimir(htmlTicket(j.venta));
    CAT = null; catalogo(true).then(() => { if (rutaActual === 'pos') ruta(); });
  } catch (e) { btn.disabled = false; }
}

/* ================= VENTAS Y PEDIDOS ================= */
const qhash = () => new URLSearchParams((location.hash.split('?')[1]) || '');
V.ventas = async v => {
  let tab = qhash().get('t') || 'todas', desde = masDias(HOY(), -30), hasta = HOY(), canal = '', q = '';
  v.innerHTML = top('Ventas y pedidos', '<button class="btn" data-csv>Descargar Excel</button><a class="btn primario" href="#pos">Nueva venta</a>') +
    '<div class="tabs" data-tabs>' + [['todas', 'Todas'], ['pedido', 'Pedidos web nuevos'], ['pendiente', 'Por cobrar'], ['carritos', 'Carritos sin terminar']].map(t => '<button data-t="' + t[0] + '">' + t[1] + '</button>').join('') + '</div><div data-c></div>';
  let datos = [];
  const pintar = async () => {
    $$('[data-tabs] button', v).forEach(b => b.classList.toggle('on', b.dataset.t === tab));
    const c = $('[data-c]', v);
    if (tab === 'carritos') {
      const j = await api('carritos');
      c.innerHTML = '<div class="card"><p class="muted" style="margin-top:0">Clientes que dejaron su WhatsApp en el carrito de la web y no enviaron el pedido. Escríbeles para ayudarles a terminar su compra.</p>' + (j.carritos.length ? '<div class="tw"><table class="t"><thead><tr><th>Actualizado</th><th>Cliente</th><th>Productos</th><th class="num">Importe</th><th></th></tr></thead><tbody>' +
        j.carritos.map(k => '<tr><td>' + fF(k.actualizado) + '</td><td><b>' + h(k.nombre || 'Sin nombre') + '</b><br><small class="muted">' + h(k.telefono) + '</small></td><td>' + k.items.map(i => h(i.qty + ' × ' + i.n + (i.opts ? ' (' + i.opts + ')' : ''))).join('<br>') + '</td><td class="num">' + $m(k.subtotal) + '</td><td class="num"><a class="btn mini verde" target="_blank" rel="noopener" data-contacto="' + k.id + '" href="' + waLink(k.telefono, 'Hola ' + primer(k.nombre) + ', vimos que dejaste en tu carrito de MEKAMONO: ' + k.items.map(i => i.n).join(', ') + '. ¿Te ayudamos a terminar tu pedido? 🐵') + '">WhatsApp</a> <button class="btn mini" data-desc="' + k.id + '">Descartar</button></td></tr>').join('') + '</tbody></table></div>' : '<div class="vacio">No hay carritos pendientes.</div>') + '</div>';
      return;
    }
    const p = { desde, hasta }; if (tab !== 'todas') p.estado = tab; if (canal) p.canal = canal; if (q) p.q = q;
    const j = await api('ventas', undefined, p); datos = j.ventas;
    if (tab === 'pedido') badge(datos.length);
    const tot = datos.filter(x => x.estado !== 'cancelada' && x.estado !== 'pedido').reduce((a, x) => a + +x.total, 0);
    c.innerHTML = '<div class="card">' + (tab === 'todas' ? '<div class="fila" style="margin-bottom:12px"><label>Desde<input type="date" value="' + desde + '" data-d></label><label>Hasta<input type="date" value="' + hasta + '" data-h></label><label>Canal<select data-canal>' + opt({ '': 'Todos', mostrador: 'Mostrador', web: 'Web' }, canal) + '</select></label><label class="flex">Buscar<input placeholder="Folio, cliente o teléfono" value="' + h(q) + '" data-q></label></div>' : '') +
      (tab === 'pedido' ? '<p class="muted" style="margin-top:0">Pedidos enviados desde el carrito o el simulador de la web. Al confirmarlos se descuenta el inventario y pasan a ventas.</p>' : '') +
      (datos.length ? '<div class="tw"><table class="t"><thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th class="ocultar-m">Canal</th><th>Estado</th><th class="ocultar-m">Entrega</th><th class="num">Total</th>' + (tab === 'pendiente' ? '<th class="num">Debe</th>' : '') + '</tr></thead><tbody>' +
        datos.map(x => '<tr class="click" data-venta="' + x.id + '"><td><b>' + h(x.folio) + '</b></td><td>' + fF(x.fecha) + '</td><td>' + h(x.nombre || 'Mostrador') + '</td><td class="ocultar-m">' + (x.canal === 'web' ? tg('Web', 'oro') : 'Mostrador') + '</td><td>' + estTg(x.estado) + '</td><td class="ocultar-m">' + h(ENTREGAS[x.entrega] || x.entrega) + '</td><td class="num">' + $m(x.total) + '</td>' + (tab === 'pendiente' ? '<td class="num"><b>' + $m(x.total - x.pagado) + '</b></td>' : '') + '</tr>').join('') +
        '</tbody>' + (tab === 'todas' ? '<tfoot><tr><td colspan="6" class="ocultar-m">' + datos.length + ' registros (sin canceladas ni pedidos sin confirmar)</td><td class="num">' + $m(tot) + '</td></tr></tfoot>' : '') + '</table></div>' : '<div class="vacio">' + (tab === 'pedido' ? 'No hay pedidos nuevos de la web.' : tab === 'pendiente' ? 'Nadie debe saldo. 🎉' : 'Sin ventas en este periodo.') + '</div>') + '</div>';
  };
  v.onclick = async e => {
    const t = e.target;
    if (t.closest('[data-t]')) { tab = t.closest('[data-t]').dataset.t; history.replaceState(null, '', '#ventas?t=' + tab); pintar(); }
    else if (t.closest('[data-venta]')) verVenta(+t.closest('[data-venta]').dataset.venta, pintar);
    else if (t.closest('[data-contacto]')) api('carrito_estado', { id: +t.closest('[data-contacto]').dataset.contacto, estado: 'contactado' }).then(pintar);
    else if (t.closest('[data-desc]')) { await api('carrito_estado', { id: +t.closest('[data-desc]').dataset.desc, estado: 'descartado' }); pintar(); }
    else if (t.closest('[data-csv]')) descargarCSV('ventas-' + desde + '-a-' + hasta, ['Folio', 'Fecha', 'Cliente', 'Teléfono', 'Canal', 'Estado', 'Entrega', 'Vendedor', 'Total', 'Pagado', 'Saldo'], datos.map(x => [x.folio, x.fecha, x.nombre, x.telefono, x.canal, (ESTADOS[x.estado] || [x.estado])[0], ENTREGAS[x.entrega] || x.entrega, x.vendedor, x.total, x.pagado, (x.total - x.pagado).toFixed(2)]));
  };
  let tm;
  v.onchange = e => { const t = e.target; if (t.matches('[data-d]')) desde = t.value; else if (t.matches('[data-h]')) hasta = t.value; else if (t.matches('[data-canal]')) canal = t.value; else return; pintar(); };
  v.oninput = e => { if (e.target.matches('[data-q]')) { q = e.target.value; clearTimeout(tm); tm = setTimeout(pintar, 350); } };
  pintar();
};

async function verVenta(id, despues) {
  const j = await api('venta', undefined, { id }); const x = j.venta;
  const debe = +x.total - +x.pagado;
  const m = modal({ titulo: 'Venta ' + x.folio, ancho: true, cuerpo:
    '<div class="fila">' + estTg(x.estado) + (x.canal === 'web' ? tg('Pedido web' + (x.envio ? ' · ' + (x.envio === 'envio' ? 'Envío CP ' + (x.cp || '?') : 'Recoge en tienda') : ''), 'oro') : '') + '<span class="muted">' + fF(x.fecha) + (x.vendedor ? ' · ' + h(x.vendedor) : '') + '</span></div>' +
    '<div class="fila"><div class="flex"><b>' + h(x.nombre || 'Venta de mostrador') + '</b>' + (x.telefono ? '<br><span class="muted">' + h(x.telefono) + '</span>' : '') + '</div>' + (x.telefono ? '<a class="btn mini verde" target="_blank" rel="noopener" href="' + waLink(x.telefono, x.estado === 'pedido' ? 'Hola ' + primer(x.nombre) + ', recibimos tu pedido ' + x.folio + ' en MEKAMONO 🐵 Total ' + $m(x.total) + '. Te confirmo existencias y forma de pago:' : textoTicket(x)) + '">WhatsApp</a>' : '') + '</div>' +
    '<div class="tw"><table class="t"><thead><tr><th>Producto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Importe</th></tr></thead><tbody>' + x.items.map(i => '<tr><td>' + h(i.descripcion) + (i.grabado ? '<br><small class="muted">Grabado: ' + h(i.grabado) + '</small>' : '') + (!i.variante_id && x.canal === 'web' ? '<br><small style="color:var(--wa)">No ligado a inventario</small>' : '') + '</td><td class="num">' + i.cantidad + '</td><td class="num">' + $m(i.precio) + '</td><td class="num">' + $m(i.cantidad * i.precio) + '</td></tr>').join('') +
    '</tbody><tfoot>' + (+x.descuento ? '<tr><td colspan="3">Descuento</td><td class="num">-' + $m(x.descuento) + '</td></tr>' : '') + '<tr><td colspan="3">Total</td><td class="num">' + $m(x.total) + '</td></tr></tfoot></table></div>' +
    '<h3>Pagos</h3>' + (x.pagos.length ? '<div class="lista">' + x.pagos.map(p => '<div><div class="flex"><b>' + $m(p.monto) + '</b> · ' + (METODOS[p.metodo] || p.metodo) + '<small>' + fF(p.fecha) + ' · ' + h(p.usuario || '') + '</small></div></div>').join('') + '</div>' : '<p class="muted" style="margin:0">Sin pagos registrados.</p>') +
    (debe > 0.009 && x.estado !== 'cancelada' ? '<div class="card" style="background:#fbfaf6"><div class="fila"><b class="flex">Saldo: ' + $m(debe) + '</b></div><div class="f3" style="margin-top:8px"><label>Monto<input type="number" step="0.01" min="0" value="' + debe.toFixed(2) + '" name="monto"></label><label>Método<select name="metodo">' + opt(METODOS, 'efectivo') + '</select></label><label>&nbsp;<button class="btn primario" data-pago>Registrar pago</button></label></div></div>' : '') +
    (x.estado !== 'cancelada' ? '<label>Estado de entrega<select data-ent>' + opt(x.estado === 'pedido' ? { pendiente: 'Por confirmar', en_produccion: 'En grabado / producción', listo: 'Listo para recoger', enviado: 'Enviado', entregado: 'Entregado' } : { en_produccion: 'En grabado / producción', listo: 'Listo para recoger', enviado: 'Enviado', entregado: 'Entregado' }, x.entrega) + '</select></label>' : '') +
    (x.notas ? '<p class="muted peque" style="white-space:pre-line;margin:0">' + h(x.notas) + '</p>' : ''),
    pie: (x.estado !== 'cancelada' ? '<button class="btn peligro izq" data-cancel>Cancelar venta</button>' : '') + '<button class="btn" data-imp>Imprimir ticket</button>' + (x.estado === 'pedido' ? '<button class="btn primario" data-conf>Confirmar pedido</button>' : '<button class="btn primario" data-x>Listo</button>') });
  const fin = () => { m.cerrar(); despues && despues(); };
  $('[data-imp]', m).onclick = () => imprimir(htmlTicket(x));
  const pg = $('[data-pago]', m); if (pg) pg.onclick = async () => { const f = form(m); await api('pago_agregar', { venta_id: x.id, monto: +f.monto, metodo: f.metodo }); toast('Pago registrado'); fin(); };
  const en = $('[data-ent]', m); if (en) en.onchange = async () => { await api('venta_actualizar', { id: x.id, entrega: en.value }); toast('Entrega actualizada'); despues && despues(); };
  const cf = $('[data-conf]', m); if (cf) cf.onclick = async () => { await api('venta_confirmar', { id: x.id, entrega: en && en.value !== 'pendiente' ? en.value : 'en_produccion' }); CAT = null; toast('Pedido confirmado; inventario actualizado'); fin(); };
  const cc = $('[data-cancel]', m); if (cc) cc.onclick = async () => { if (!await confirmar('¿Cancelar la venta ' + x.folio + '? Las piezas regresan al inventario.', 'Cancelar venta')) return; await api('venta_cancelar', { id: x.id }); CAT = null; toast('Venta cancelada'); fin(); };
}

/* ================= INVENTARIO ================= */
V.inventario = async v => {
  const c = await catalogo(true);
  let q = '', cat = '', soloF = qhash().get('f') === '1';
  v.innerHTML = top('Inventario', '<button class="btn" data-csv>Descargar Excel</button>' + (DUENO ? '<button class="btn" data-entrada>Entrada de mercancía</button><button class="btn primario" data-nuevo>Nuevo producto</button>' : '')) +
    '<div class="grid g4" data-kpi></div><div class="esp"></div><div class="card"><div class="fila" style="margin-bottom:10px"><input class="flex" placeholder="Buscar producto" data-q style="flex:1;min-width:180px"><select data-cat style="width:auto">' + opt(Object.fromEntries([['', 'Todas las categorías'], ...c.categorias.map(x => [x, x])]), '') + '</select><label class="chk"><input type="checkbox" data-f' + (soloF ? ' checked' : '') + '> Solo por agotarse</label></div><div data-l></div></div>';
  const piezas = c.productos.reduce((a, p) => a + p.stock, 0), falt = c.productos.reduce((a, p) => a + p.falt, 0);
  const valor = DUENO ? c.productos.reduce((a, p) => a + p.v.reduce((b, x) => b + Math.max(0, +x.existencia) * +(x.costo || 0), 0), 0) : 0;
  const valorV = c.productos.reduce((a, p) => a + p.v.reduce((b, x) => b + Math.max(0, +x.existencia) * +x.precio, 0), 0);
  $('[data-kpi]', v).innerHTML = '<div class="card kpi"><span>Productos</span><b>' + c.productos.length + '</b><small>' + c.productos.reduce((a, p) => a + p.v.length, 0) + ' variantes</small></div><div class="card kpi"><span>Piezas en existencia</span><b>' + ent(piezas) + '</b></div>' +
    '<div class="card kpi"><span>Variantes por agotarse</span><b style="color:' + (falt ? 'var(--er)' : 'inherit') + '">' + falt + '</b><small>en o bajo su mínimo</small></div><div class="card kpi"><span>Valor a precio de venta</span><b>' + $c(valorV) + '</b>' + (DUENO ? '<small>' + (valor ? 'a costo ' + $c(valor) : 'Captura costos para ver el valor a costo') + '</small>' : '') + '</div>';
  const pintar = () => {
    const w = norm(q).split(/\s+/).filter(Boolean);
    const l = c.productos.filter(p => (!cat || p.categoria === cat) && w.every(x => p.k.includes(x)) && (!soloF || p.falt));
    if (soloF) {
      const vs = l.flatMap(p => p.v.filter(x => +x.existencia <= +x.minimo).map(x => [p, x]));
      $('[data-l]', v).innerHTML = vs.length ? '<div class="tw"><table class="t"><thead><tr><th class="th-img"></th><th>Producto</th><th>Variante</th><th class="num">Existencia</th><th class="num">Mínimo</th>' + (DUENO ? '<th></th>' : '') + '</tr></thead><tbody>' + vs.map(([p, x]) => '<tr><td><img class="mini" src="' + fotoP(p, x) + '" alt="" loading="lazy"></td><td><b>' + h(p.nombre) + '</b></td><td>' + h(x.etiqueta || 'Única') + '</td><td class="num">' + tg(x.existencia, +x.existencia <= 0 ? 'er' : 'wa') + '</td><td class="num">' + x.minimo + '</td>' + (DUENO ? '<td class="num"><button class="btn mini" data-aj="' + x.id + '" data-pp="' + p.id + '">Ajustar</button></td>' : '') + '</tr>').join('') + '</tbody></table></div>' : '<div class="vacio">Nada por agotarse. 👌</div>';
      return;
    }
    $('[data-l]', v).innerHTML = l.length ? '<div class="tw"><table class="t"><thead><tr><th class="th-img"></th><th>Producto</th><th class="ocultar-m">Categoría</th><th class="num">Precio</th><th class="num">Existencia</th><th>Estado</th><th class="ocultar-m">Web</th></tr></thead><tbody>' +
      l.map(p => '<tr class="click" data-prod="' + p.id + '"><td><img class="mini" src="' + fotoP(p) + '" alt="" loading="lazy"></td><td><b>' + h(p.nombre) + '</b><br><small class="muted">' + p.v.length + ' variante' + (p.v.length > 1 ? 's' : '') + '</small></td><td class="ocultar-m">' + h(p.categoria) + '</td><td class="num">' + (p.min !== p.max ? $c(p.min) + '–' + $c(p.max) : $c(p.min)) + '</td><td class="num">' + p.stock + '</td><td>' + (!p.stock ? tg('Agotado', 'er') : p.falt ? tg(p.falt + ' por agotarse', 'wa') : tg('Bien', 'ok')) + '</td><td class="ocultar-m">' + (+p.en_web ? tg('Visible', 'ok') : tg('Oculto')) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="vacio">Sin resultados</div>';
  };
  pintar();
  v.oninput = e => { if (e.target.matches('[data-q]')) { q = e.target.value; pintar(); } };
  v.onchange = e => { if (e.target.matches('[data-cat]')) { cat = e.target.value; pintar(); } if (e.target.matches('[data-f]')) { soloF = e.target.checked; pintar(); } };
  v.onclick = e => {
    const t = e.target;
    if (t.closest('[data-prod]')) editarProducto(+t.closest('[data-prod]').dataset.prod);
    else if (t.closest('[data-nuevo]')) editarProducto(0);
    else if (t.closest('[data-entrada]')) entradaMercancia();
    else if (t.closest('[data-aj]')) { const b = t.closest('[data-aj]'); const p = c.productos.find(x => x.id == b.dataset.pp); ajustarExistencia(p, p.v.find(x => x.id == b.dataset.aj)); }
    else if (t.closest('[data-csv]')) descargarCSV('inventario-' + HOY(), ['Producto', 'Categoría', 'Variante', 'SKU', 'Precio', 'Precio anterior', ...(DUENO ? ['Costo'] : []), 'Existencia', 'Mínimo', 'Visible en web'], c.productos.flatMap(p => p.v.map(x => [p.nombre, p.categoria, x.etiqueta, x.sku, x.precio, x.precio_anterior, ...(DUENO ? [x.costo] : []), x.existencia, x.minimo, +p.en_web ? 'Sí' : 'No'])));
  };
};
function ajustarExistencia(p, x) {
  const m = modal({ titulo: 'Ajustar existencia', cuerpo: '<p style="margin:0"><b>' + h(p.nombre) + '</b> · ' + h(x.etiqueta || 'Única') + '</p><div class="f2"><label>Existencia contada<input name="existencia" type="number" value="' + x.existencia + '"></label><label>Mínimo (avisa al llegar aquí)<input name="minimo" type="number" min="0" value="' + x.minimo + '"></label></div><label>Motivo<input name="notas" value="Conteo físico"></label><div data-mov></div>',
    pie: '<button class="btn" data-x>Cancelar</button><button class="btn primario" data-ok>Guardar</button>' });
  api('movimientos', undefined, { id: x.id }).then(j => { $('[data-mov]', m).innerHTML = j.movimientos.length ? '<h3>Últimos movimientos</h3><div class="lista">' + j.movimientos.slice(0, 8).map(r => '<div><div class="flex">' + h(r.motivo) + (r.ref ? ' · ' + h(r.ref) : '') + '<small>' + fF(r.fecha) + ' · ' + h(r.usuario || '') + (r.notas ? ' · ' + h(r.notas) : '') + '</small></div><b style="color:' + (r.cantidad > 0 ? 'var(--ok)' : 'var(--er)') + '">' + (r.cantidad > 0 ? '+' : '') + r.cantidad + '</b></div>').join('') + '</div>' : ''; });
  $('[data-ok]', m).onclick = async () => { const f = form(m); await api('ajustar', { variante_id: x.id, existencia: +f.existencia, minimo: +f.minimo, notas: f.notas }); m.cerrar(); toast('Existencia actualizada'); CAT = null; ruta(); };
}
async function editarProducto(id) {
  const c = await catalogo();
  let p = id ? (await api('producto', undefined, { id })).producto : { id: 0, nombre: '', categoria: '', descripcion: '', opciones: [], fotos: [], en_web: 1, v: [{ ops: [], precio: '', precio_anterior: 0, costo: 0, existencia: 0, minimo: 2, foto: 0 }] };
  const lee = !DUENO;
  const m = modal({ titulo: id ? (lee ? p.nombre : 'Editar producto') : 'Nuevo producto', ancho: true, cuerpo:
    '<div class="f2"><label>Nombre<input name="nombre" value="' + h(p.nombre) + '"' + (lee ? ' disabled' : '') + '></label><label>Categoría en la tienda<select name="categoria"' + (lee ? ' disabled' : '') + '>' + opt(Object.fromEntries([...new Set([...CATS_WEB, ...c.categorias, p.categoria].filter(Boolean))].map(x => [x, x])), p.categoria || 'Accesorios') + '</select></label></div>' +
    '<label>Fotos <small class="muted">(la primera es la principal; toca una para hacerla principal)</small></label><div class="fotos" data-fotos></div>' +
    '<label>Opciones <small class="muted">(separadas por coma, ej. Grosor, Color. Déjalo vacío si no tiene)</small><input name="opciones" value="' + h(p.opciones.join(', ')) + '" data-ops' + (lee ? ' disabled' : '') + '></label>' +
    '<label>Variantes, precios y existencias</label><div class="tw"><table class="t vtab"><thead data-vh></thead><tbody data-vb></tbody></table></div>' + (lee ? '' : '<div><button class="btn mini" data-addv>+ Agregar variante</button></div>') +
    '<label>Descripción<textarea name="descripcion" rows="5"' + (lee ? ' disabled' : '') + '>' + h(p.descripcion) + '</textarea></label>' +
    '<label class="chk"><input type="checkbox" name="en_web"' + (+p.en_web ? ' checked' : '') + (lee ? ' disabled' : '') + '> Mostrar en la tienda en línea</label>',
    pie: lee ? '<button class="btn primario" data-x>Cerrar</button>' : (id ? '<button class="btn peligro izq" data-del>Eliminar</button>' : '') + '<button class="btn" data-x>Cancelar</button><button class="btn primario" data-ok>Guardar</button>' });
  const ops = () => $('[data-ops]', m).value.split(',').map(s => s.trim()).filter(Boolean);
  const leerV = () => $$('[data-vb] tr', m).map((tr, i) => ({ id: p.v[i]?.id, ops: $$('[data-o]', tr).map(x => x.value.trim()), precio: +$('[data-pr]', tr).value || 0, precio_anterior: +$('[data-pa]', tr).value || 0, costo: DUENO ? +$('[data-co]', tr).value || 0 : 0, existencia: +$('[data-ex]', tr).value || 0, minimo: +$('[data-mi]', tr).value || 0, foto: +$('[data-fo]', tr).value || 0 }));
  const pintarV = () => {
    const o = ops(); const dis = lee ? ' disabled' : '';
    $('[data-vh]', m).innerHTML = '<tr>' + o.map(x => '<th>' + h(x) + '</th>').join('') + '<th>Precio</th><th>Antes</th>' + (DUENO ? '<th>Costo</th>' : '') + '<th>Exist.</th><th>Mín.</th><th>Foto #</th>' + (lee ? '' : '<th></th>') + '</tr>';
    $('[data-vb]', m).innerHTML = p.v.map((x, i) => '<tr>' + o.map((_, k) => '<td><input data-o value="' + h((x.ops || [])[k] || '') + '" style="min-width:80px"' + dis + '></td>').join('') + '<td><input data-pr type="number" step="0.01" value="' + h(x.precio) + '" style="width:80px"' + dis + '></td><td><input data-pa type="number" step="0.01" value="' + h(+x.precio_anterior || '') + '" style="width:75px"' + dis + '></td>' + (DUENO ? '<td><input data-co type="number" step="0.01" value="' + h(+x.costo || '') + '" style="width:75px"></td>' : '') + '<td><input data-ex type="number" value="' + h(x.existencia) + '" style="width:60px"' + dis + '></td><td><input data-mi type="number" min="0" value="' + h(x.minimo) + '" style="width:55px"' + dis + '></td><td><input data-fo type="number" min="1" value="' + ((+x.foto || 0) + 1) + '" style="width:55px"' + dis + '></td>' + (lee ? '' : '<td><button class="btn mini link" data-delv="' + i + '">Quitar</button></td>') + '</tr>').join('');
    $$('[data-fo]', m).forEach(i => i.value = +i.value); // se muestra base 1
  };
  const pintarF = () => { $('[data-fotos]', m).innerHTML = p.fotos.map((f, i) => '<div><img src="' + foto(f) + '" alt="" data-princ="' + i + '" style="cursor:pointer;' + (i ? '' : 'outline:2px solid var(--gd)') + '">' + (lee ? '' : '<button data-qf="' + i + '" aria-label="Quitar">×</button>') + '</div>').join('') + (lee ? '' : '<label class="sube">+<input type="file" accept="image/*" hidden data-up></label>'); };
  pintarV(); pintarF();
  if (lee) return;
  $('[data-ops]', m).onchange = () => { p.v = leerV().map(x => ({ ...x, foto: x.foto - 1 })); pintarV(); };
  m.addEventListener('click', async e => {
    const t = e.target;
    if (t.closest('[data-addv]')) { p.v = leerV().map(x => ({ ...x, foto: x.foto - 1 })); const u = p.v[p.v.length - 1] || {}; p.v.push({ ops: [], precio: u.precio || '', precio_anterior: 0, costo: u.costo || 0, existencia: 0, minimo: u.minimo ?? 2, foto: 0 }); pintarV(); }
    else if (t.closest('[data-delv]')) { p.v = leerV().map(x => ({ ...x, foto: x.foto - 1 })); p.v.splice(+t.closest('[data-delv]').dataset.delv, 1); pintarV(); }
    else if (t.closest('[data-qf]')) { p.fotos.splice(+t.closest('[data-qf]').dataset.qf, 1); pintarF(); }
    else if (t.closest('[data-princ]')) { const i = +t.closest('[data-princ]').dataset.princ; if (i) { const [f] = p.fotos.splice(i, 1); p.fotos.unshift(f); pintarF(); toast('Foto principal cambiada; revisa el número de foto de cada variante'); } }
    else if (t.closest('[data-del]')) { if (await confirmar('¿Eliminar ' + p.nombre + '? Dejará de verse en el panel y en la web (las ventas pasadas se conservan).', 'Eliminar')) { await api('producto_borrar', { id }); m.cerrar(); CAT = null; toast('Producto eliminado'); ruta(); } }
    else if (t.closest('[data-ok]')) {
      const f = form(m); const vs = leerV().map(x => ({ ...x, foto: Math.max(0, x.foto - 1) }));
      if (!p.fotos.length && f.en_web && !await confirmar('El producto no tiene fotos; no se mostrará en la web hasta que tenga al menos una. ¿Guardar así?')) return;
      if (vs.some(x => !(x.precio > 0)) && !await confirmar('Hay variantes con precio $0. ¿Guardar así?')) return;
      await api('producto_guardar', { id, nombre: f.nombre, categoria: f.categoria, descripcion: f.descripcion, en_web: f.en_web, opciones: ops(), fotos: p.fotos, v: vs });
      m.cerrar(); CAT = null; toast('Producto guardado; la web ya muestra los cambios'); ruta();
    }
  });
  m.addEventListener('change', async e => {
    if (!e.target.matches('[data-up]')) return;
    const fd = new FormData(); fd.append('foto', e.target.files[0]);
    toast('Subiendo foto…');
    try { const j = await api('subir_foto', fd); p.fotos.push(j.foto); pintarF(); toast('Foto agregada'); } catch (er) { }
  });
}
async function entradaMercancia() {
  const pv = (await api('proveedores')).proveedores;
  const L = [];
  const m = modal({ titulo: 'Entrada de mercancía', ancho: true, cuerpo: '<p class="muted" style="margin:0">Registra lo que te llegó del proveedor. Se suma a la existencia y, si quieres, se guarda como gasto.</p><label>Proveedor<select name="proveedor_id"><option value="">Sin proveedor</option>' + pv.map(x => '<option value="' + x.id + '">' + h(x.nombre) + '</option>').join('') + '</select></label><div data-l></div><div><button class="btn" data-add>+ Agregar producto</button></div><div class="f2"><label class="chk"><input type="checkbox" name="registrar_gasto" checked> Registrar como gasto (Mercancía)</label><label>Pagado con<select name="metodo">' + opt(METODOS, 'efectivo') + '</select></label></div><label>Notas<input name="notas" placeholder="Ej. factura o nota del proveedor"></label>',
    pie: '<button class="btn" data-x>Cancelar</button><button class="btn primario" data-ok>Guardar entrada</button>' });
  const pintar = () => { $('[data-l]', m).innerHTML = L.length ? '<div class="tw"><table class="t vtab"><thead><tr><th>Producto</th><th>Cantidad</th><th>Costo unitario</th><th></th></tr></thead><tbody>' + L.map((l, i) => '<tr data-i="' + i + '"><td>' + h(l.n) + '</td><td><input type="number" min="1" value="' + l.cantidad + '" data-c style="width:80px"></td><td><input type="number" min="0" step="0.01" value="' + (l.costo || '') + '" data-k style="width:100px"></td><td><button class="btn mini link" data-q>Quitar</button></td></tr>').join('') + '</tbody></table></div><p class="num"><b>Total: ' + $m(L.reduce((a, l) => a + l.cantidad * (l.costo || 0), 0)) + '</b></p>' : '<div class="vacio">Agrega los productos que llegaron</div>'; };
  pintar();
  $('[data-add]', m).onclick = () => elegirVariante((p, x) => { L.push({ variante_id: x.id, n: p.nombre + (x.etiqueta ? ' · ' + x.etiqueta : ''), cantidad: 1, costo: +x.costo || 0 }); pintar(); }, { titulo: 'Producto que llegó' });
  m.addEventListener('change', e => { const tr = e.target.closest('[data-i]'); if (!tr) return; const l = L[+tr.dataset.i]; if (e.target.matches('[data-c]')) l.cantidad = Math.max(1, +e.target.value || 1); if (e.target.matches('[data-k]')) l.costo = +e.target.value || 0; pintar(); });
  m.addEventListener('click', e => { if (e.target.closest('[data-q]')) { L.splice(+e.target.closest('[data-i]').dataset.i, 1); pintar(); } });
  $('[data-ok]', m).onclick = async () => { if (!L.length) return toast('Agrega al menos un producto', 1); const f = form(m); await api('entrada', { ...f, items: L }); m.cerrar(); CAT = null; toast('Entrada registrada'); ruta(); };
}

/* ================= CLIENTES ================= */
V.clientes = async v => {
  let q = '', datos = [];
  v.innerHTML = top('Clientes', '<button class="btn" data-csv>Descargar Excel</button><button class="btn primario" data-nuevo>Nuevo cliente</button>') + '<div class="card"><input placeholder="Buscar por nombre, teléfono o correo" data-q style="margin-bottom:10px"><div data-l></div></div>';
  const pintar = async () => {
    datos = (await api('clientes', undefined, { q })).clientes;
    $('[data-l]', v).innerHTML = datos.length ? '<div class="tw"><table class="t"><thead><tr><th>Nombre</th><th>WhatsApp</th><th class="num">Compras</th><th class="num">Total comprado</th><th class="ocultar-m">Última compra</th><th class="ocultar-m">Origen</th></tr></thead><tbody>' +
      datos.map(c => '<tr class="click" data-cli="' + c.id + '"><td><b>' + h(c.nombre) + '</b></td><td>' + h(c.telefono || '') + '</td><td class="num">' + c.compras + '</td><td class="num">' + $m(c.gastado) + '</td><td class="ocultar-m">' + fF(c.ultima) + '</td><td class="ocultar-m">' + (c.origen === 'web' ? tg('Web', 'oro') : 'Mostrador') + '</td></tr>').join('') + '</tbody></table></div><p class="muted peque">' + datos.length + ' clientes</p>' : '<div class="vacio">Aún no hay clientes. Se agregan solos al vender con cliente o cuando llegan pedidos de la web.</div>';
  };
  let tm; v.oninput = e => { if (e.target.matches('[data-q]')) { q = e.target.value; clearTimeout(tm); tm = setTimeout(pintar, 300); } };
  v.onclick = e => { const t = e.target; if (t.closest('[data-cli]')) verCliente(+t.closest('[data-cli]').dataset.cli, pintar); else if (t.closest('[data-nuevo]')) editarCliente({}, pintar);
    else if (t.closest('[data-csv]')) descargarCSV('clientes-' + HOY(), ['Nombre', 'WhatsApp', 'Correo', 'Cumpleaños', 'Compras', 'Total comprado', 'Última compra', 'Origen', 'Notas'], datos.map(c => [c.nombre, c.telefono, c.email, c.cumple, c.compras, c.gastado, c.ultima, c.origen, c.notas])); };
  pintar();
};
function editarCliente(c, despues) {
  const m = modal({ titulo: c.id ? 'Editar cliente' : 'Nuevo cliente', cuerpo: '<label>Nombre<input name="nombre" value="' + h(c.nombre) + '"></label><div class="f2"><label>WhatsApp (10 dígitos)<input name="telefono" inputmode="tel" value="' + h(c.telefono) + '"></label><label>Correo<input name="email" type="email" value="' + h(c.email) + '"></label></div><label>Cumpleaños<input name="cumple" type="date" value="' + h(c.cumple) + '"></label><label>Notas<textarea name="notas" placeholder="Gustos, medidas, fechas importantes…">' + h(c.notas) + '</textarea></label>',
    pie: (c.id ? '<button class="btn peligro izq" data-del>Borrar</button>' : '') + '<button class="btn" data-x>Cancelar</button><button class="btn primario" data-ok>Guardar</button>' });
  $('[data-ok]', m).onclick = async () => { await api('cliente_guardar', { id: c.id || 0, ...form(m) }); m.cerrar(); toast('Cliente guardado'); despues && despues(); };
  const d = $('[data-del]', m); if (d) d.onclick = async () => { if (await confirmar('¿Borrar a ' + c.nombre + '?', 'Borrar')) { await api('cliente_borrar', { id: c.id }); m.cerrar(); despues && despues(); } };
}
async function verCliente(id, despues) {
  const c = (await api('cliente', undefined, { id })).cliente;
  const tot = c.ventas.filter(x => x.estado === 'pagada' || x.estado === 'pendiente').reduce((a, x) => a + +x.total, 0);
  const m = modal({ titulo: c.nombre, ancho: true, cuerpo: '<div class="fila"><div class="flex">' + h(c.telefono || 'Sin teléfono') + (c.email ? ' · ' + h(c.email) : '') + (c.cumple ? ' · 🎂 ' + fF(c.cumple) : '') + '</div>' + (c.telefono ? '<a class="btn mini verde" target="_blank" rel="noopener" href="' + waLink(c.telefono, 'Hola ' + primer(c.nombre) + ' 🐵') + '">WhatsApp</a>' : '') + '</div>' + (c.notas ? '<p class="muted" style="margin:0;white-space:pre-line">' + h(c.notas) + '</p>' : '') +
    '<div class="grid g3"><div class="card kpi"><span>Compras</span><b>' + c.ventas.filter(x => x.estado !== 'cancelada' && x.estado !== 'pedido').length + '</b></div><div class="card kpi"><span>Total comprado</span><b>' + $c(tot) + '</b></div><div class="card kpi"><span>Citas</span><b>' + c.citas.length + '</b></div></div>' +
    '<h3>Historial de compras</h3>' + (c.ventas.length ? '<div class="tw"><table class="t"><tbody>' + c.ventas.map(x => '<tr class="click" data-venta="' + x.id + '"><td><b>' + h(x.folio) + '</b></td><td>' + fF(x.fecha) + '</td><td>' + estTg(x.estado) + '</td><td class="num">' + $m(x.total) + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted" style="margin:0">Sin compras.</p>') +
    (c.cotizaciones.length ? '<h3>Cotizaciones</h3><div class="lista">' + c.cotizaciones.map(x => '<div><div class="flex"><b>' + h(x.folio) + '</b><small>' + fF(x.fecha) + ' · ' + h(x.estado) + '</small></div><b>' + $m(x.total) + '</b></div>').join('') + '</div>' : '') +
    (c.citas.length ? '<h3>Citas</h3><div class="lista">' + c.citas.map(x => '<div><div class="flex"><b>' + fF(x.fecha) + ' ' + h(x.hora) + '</b><small>' + h(x.motivo || '') + '</small></div>' + tg(x.estado) + '</div>').join('') + '</div>' : ''),
    pie: '<button class="btn" data-edit>Editar</button><button class="btn" data-cita>Agendar cita</button><button class="btn primario" data-vender>Venderle</button>' });
  m.addEventListener('click', e => { const b = e.target.closest('[data-venta]'); if (b) verVenta(+b.dataset.venta); });
  $('[data-edit]', m).onclick = () => { m.cerrar(); editarCliente(c, despues); };
  $('[data-cita]', m).onclick = () => { m.cerrar(); editarCita({ cliente_id: c.id, nombre: c.nombre, telefono: c.telefono, fecha: HOY() }); };
  $('[data-vender]', m).onclick = () => { m.cerrar(); T.cliente = { id: c.id, nombre: c.nombre, telefono: c.telefono }; location.hash = '#pos'; };
}

/* ================= AGENDA ================= */
V.agenda = async v => {
  let desde = HOY();
  v.innerHTML = top('Agenda', '<button class="btn primario" data-nueva>Nueva cita</button>') + '<div class="fila" style="margin-bottom:14px"><button class="btn" data-prev>← Anterior</button><button class="btn" data-hoy>Hoy</button><button class="btn" data-next>Siguiente →</button><span class="muted" data-rango></span></div><div data-l></div>';
  const pintar = async () => {
    const hasta = masDias(desde, 13);
    $('[data-rango]', v).textContent = fF(desde) + ' al ' + fF(hasta);
    const cs = (await api('citas', undefined, { desde, hasta })).citas;
    let html = '';
    for (let i = 0; i < 14; i++) {
      const d = masDias(desde, i), dc = cs.filter(c => c.fecha === d);
      if (!dc.length && i > 6) continue;
      html += '<div class="cal-dia' + (d === HOY() ? ' hoy' : '') + '"><h3>' + (d === HOY() ? 'Hoy · ' : '') + fD(d) + '</h3>' + (dc.length ? dc.map(c => '<div class="cita ' + c.estado + '" data-cita="' + c.id + '"><span class="h">' + h(c.hora || '—') + '</span><div class="flex"><b>' + h(c.nombre) + '</b><small>' + h(c.motivo || 'Sin detalle') + (c.origen === 'web' ? ' · desde la web' : '') + '</small></div>' + tg(c.estado, { pendiente: 'wa', confirmada: 'inf', atendida: 'ok', cancelada: '' }[c.estado]) + '</div>').join('') : '<p class="muted peque" style="margin:0 0 8px">Sin citas</p>') + '</div>';
    }
    $('[data-l]', v).innerHTML = html;
    v.citas = cs;
  };
  v.onclick = e => {
    const t = e.target;
    if (t.closest('[data-nueva]')) editarCita({ fecha: desde }, pintar);
    else if (t.closest('[data-prev]')) { desde = masDias(desde, -14); pintar(); }
    else if (t.closest('[data-next]')) { desde = masDias(desde, 14); pintar(); }
    else if (t.closest('[data-hoy]')) { desde = HOY(); pintar(); }
    else if (t.closest('[data-cita]')) editarCita(v.citas.find(c => c.id == t.closest('[data-cita]').dataset.cita), pintar);
  };
  pintar();
};
function editarCita(c, despues) {
  const m = modal({ titulo: c.id ? 'Cita' : 'Nueva cita', cuerpo: '<div class="f2"><label>Nombre<input name="nombre" value="' + h(c.nombre) + '"></label><label>WhatsApp<input name="telefono" inputmode="tel" value="' + h(c.telefono) + '"></label></div><div class="f3"><label>Fecha<input type="date" name="fecha" value="' + h(c.fecha || HOY()) + '"></label><label>Hora<input name="hora" value="' + h(c.hora) + '" placeholder="Ej. 5:30 p.m."></label><label>Estado<select name="estado">' + opt({ pendiente: 'Pendiente', confirmada: 'Confirmada', atendida: 'Atendida', cancelada: 'Cancelada' }, c.estado || 'pendiente') + '</select></label></div><label>Motivo<input name="motivo" value="' + h(c.motivo) + '" placeholder="Ej. Grabar esclava con fecha"></label><label>Notas<textarea name="notas">' + h(c.notas) + '</textarea></label>',
    pie: (c.id ? '<button class="btn peligro izq" data-del>Borrar</button>' : '') + (c.telefono ? '<a class="btn verde" target="_blank" rel="noopener" href="' + waLink(c.telefono, 'Hola ' + primer(c.nombre) + ', te confirmamos tu visita a MEKAMONO el ' + (c.fecha ? fD(c.fecha) : '') + (c.hora ? ' a las ' + c.hora : '') + '. Av. Revolución 503, Local C 🐵') + '">Confirmar por WhatsApp</a>' : '') + '<button class="btn" data-x>Cerrar</button><button class="btn primario" data-ok>Guardar</button>' });
  $('[data-ok]', m).onclick = async () => { await api('cita_guardar', { id: c.id || 0, cliente_id: c.cliente_id || null, ...form(m) }); m.cerrar(); toast('Cita guardada'); despues ? despues() : (rutaActual === 'agenda' && ruta()); };
  const d = $('[data-del]', m); if (d) d.onclick = async () => { if (await confirmar('¿Borrar esta cita?', 'Borrar')) { await api('cita_borrar', { id: c.id }); m.cerrar(); despues && despues(); } };
}

/* ================= COTIZACIONES ================= */
const COT = { abierta: ['Abierta', 'wa'], aceptada: ['Aceptada', 'inf'], rechazada: ['Rechazada', ''], vendida: ['Vendida', 'ok'] };
V.cotizaciones = async v => {
  let est = '';
  v.innerHTML = top('Cotizaciones', '<button class="btn primario" data-nueva>Nueva cotización</button>') + '<div class="chips" data-e style="margin-bottom:12px"></div><div class="card" data-l></div>';
  const pintar = async () => {
    $('[data-e]', v).innerHTML = [['', 'Todas'], ...Object.entries(COT).map(([k, x]) => [k, x[0]])].map(([k, l]) => '<button class="' + (k === est ? 'on' : '') + '" data-est="' + k + '">' + l + '</button>').join('');
    const cs = (await api('cotizaciones', undefined, est ? { estado: est } : {})).cotizaciones;
    $('[data-l]', v).innerHTML = cs.length ? '<div class="tw"><table class="t"><thead><tr><th>Folio</th><th>Fecha</th><th>Cliente</th><th>Estado</th><th class="ocultar-m">Vigencia</th><th class="num">Total</th></tr></thead><tbody>' + cs.map(c => '<tr class="click" data-cot="' + c.id + '"><td><b>' + h(c.folio) + '</b></td><td>' + fF(c.fecha) + '</td><td>' + h(c.nombre || '') + '</td><td>' + tg(COT[c.estado][0], COT[c.estado][1]) + '</td><td class="ocultar-m">' + (c.vigencia ? fF(c.vigencia) + (c.estado === 'abierta' && c.vigencia < HOY() ? ' ' + tg('Vencida', 'er') : '') : '') + '</td><td class="num">' + $m(c.total) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="vacio">Sin cotizaciones. Útiles para pedidos especiales, mayoreo o regalos corporativos.</div>';
  };
  v.onclick = async e => { const t = e.target; if (t.closest('[data-est]')) { est = t.closest('[data-est]').dataset.est; pintar(); } else if (t.closest('[data-nueva]')) editarCotizacion({}, pintar); else if (t.closest('[data-cot]')) editarCotizacion((await api('cotizacion', undefined, { id: t.closest('[data-cot]').dataset.cot })).cotizacion, pintar); };
  pintar();
};
function editarCotizacion(c, despues) {
  const L = (c.items || []).map(i => ({ variante_id: i.variante_id, descripcion: i.descripcion, precio: +i.precio, cantidad: +i.cantidad, grabado: i.grabado || '' }));
  const cerrada = c.estado === 'vendida';
  const m = modal({ titulo: c.id ? 'Cotización ' + c.folio : 'Nueva cotización', ancho: true, cuerpo: (c.id ? '<div class="fila">' + tg(COT[c.estado][0], COT[c.estado][1]) + '<span class="muted">' + fF(c.fecha) + ' · ' + h(c.usuario || '') + '</span></div>' : '') +
    '<div class="f3"><label>Cliente<input name="nombre" value="' + h(c.nombre) + '"></label><label>WhatsApp<input name="telefono" inputmode="tel" value="' + h(c.telefono) + '"></label><label>Válida hasta<input type="date" name="vigencia" value="' + h(c.vigencia || masDias(HOY(), 15)) + '"></label></div><div data-l></div>' + (cerrada ? '' : '<div class="fila"><button class="btn" data-add>+ Producto del inventario</button><button class="btn" data-libre>+ Concepto libre</button></div>') +
    '<div class="f2"><label>Descuento $<input type="number" min="0" name="descuento" value="' + (+c.descuento || '') + '"></label><span></span></div><label>Notas / condiciones<textarea name="notas" placeholder="Ej. Tiempo de entrega 3 a 5 días hábiles. Anticipo del 50%.">' + h(c.notas ?? 'Tiempo de producción: 3 a 5 días hábiles. Se requiere 50% de anticipo.') + '</textarea></label>',
    pie: (c.id && !cerrada ? '<select data-est class="izq" style="width:auto">' + opt({ abierta: 'Abierta', aceptada: 'Aceptada', rechazada: 'Rechazada' }, c.estado) + '</select>' : '') + (c.id ? '<button class="btn" data-imp>Imprimir / PDF</button><button class="btn" data-wa>WhatsApp</button>' : '') + (cerrada ? '<button class="btn primario" data-x>Cerrar</button>' : '<button class="btn" data-ok>Guardar</button>' + (c.id ? '<button class="btn primario" data-vender>Convertir en venta</button>' : '')) });
  const tot = () => Math.max(0, L.reduce((a, l) => a + l.precio * l.cantidad, 0) - (+$('[name=descuento]', m).value || 0));
  const pintar = () => { $('[data-l]', m).innerHTML = L.length ? '<div class="tw"><table class="t vtab"><thead><tr><th>Concepto</th><th>Grabado</th><th>Cant.</th><th>Precio</th><th class="num">Importe</th><th></th></tr></thead><tbody>' + L.map((l, i) => '<tr data-i="' + i + '"><td>' + h(l.descripcion) + '</td><td><input data-g value="' + h(l.grabado) + '" placeholder="Texto"></td><td><input type="number" min="1" data-c value="' + l.cantidad + '" style="width:64px"></td><td><input type="number" step="0.01" data-p value="' + l.precio + '" style="width:90px"></td><td class="num">' + $m(l.precio * l.cantidad) + '</td><td>' + (cerrada ? '' : '<button class="btn mini link" data-q>Quitar</button>') + '</td></tr>').join('') + '</tbody><tfoot><tr><td colspan="4">Total</td><td class="num">' + $m(tot()) + '</td><td></td></tr></tfoot></table></div>' : '<div class="vacio">Agrega productos o conceptos</div>'; };
  pintar();
  const datos = () => ({ id: c.id || 0, ...form(m), items: L, cliente_id: c.cliente_id || null });
  const guardar = async () => { if (!L.length) { toast('Agrega al menos un concepto', 1); throw 0; } const r = await api('cotizacion_guardar', datos()); return r.id; };
  m.addEventListener('change', e => { const tr = e.target.closest('[data-i]'); if (e.target.name === 'descuento') return pintar(); if (!tr) return; const l = L[+tr.dataset.i]; if (e.target.matches('[data-c]')) l.cantidad = Math.max(1, +e.target.value || 1); if (e.target.matches('[data-p]')) l.precio = +e.target.value || 0; if (e.target.matches('[data-g]')) l.grabado = e.target.value; pintar(); });
  m.addEventListener('click', async e => {
    const t = e.target;
    if (t.closest('[data-q]')) { L.splice(+t.closest('[data-i]').dataset.i, 1); pintar(); }
    else if (t.closest('[data-add]')) elegirVariante((p, x) => { L.push({ variante_id: x.id, descripcion: p.nombre + (x.etiqueta ? ' · ' + x.etiqueta : ''), precio: +x.precio, cantidad: 1, grabado: '' }); pintar(); });
    else if (t.closest('[data-libre]')) { L.push({ variante_id: null, descripcion: prompt('Descripción del concepto') || 'Concepto', precio: 0, cantidad: 1, grabado: '' }); pintar(); }
    else if (t.closest('[data-ok]')) { await guardar(); m.cerrar(); toast('Cotización guardada'); despues && despues(); }
    else if (t.closest('[data-imp]')) { const f = form(m); imprimir(htmlCot({ ...c, ...f, items: L, total: tot() }), 1); }
    else if (t.closest('[data-wa]')) { const f = form(m); if (!tel10(f.telefono)) return toast('Escribe el WhatsApp del cliente', 1); open(waLink(f.telefono, 'Hola ' + primer(f.nombre) + ', te comparto tu cotización ' + c.folio + ' de MEKAMONO 🐵\n' + L.map(l => '• ' + l.cantidad + ' × ' + l.descripcion + (l.grabado ? ' (grabado: ' + l.grabado + ')' : '') + ' ' + $m(l.precio * l.cantidad)).join('\n') + (+f.descuento ? '\nDescuento: -' + $m(f.descuento) : '') + '\nTotal: ' + $m(tot()) + '\nVálida hasta ' + fF(f.vigencia) + (f.notas ? '\n' + f.notas : '')), '_blank'); }
    else if (t.closest('[data-vender]')) { const id = await guardar(); m.cerrar(); resetT(); Object.assign(T, { items: L.map((l, i) => ({ k: 'c' + i, ...l, stock: Infinity })), descuento: +form(m).descuento || 0, cotizacion_id: id, cliente: (form(m).nombre ? { id: c.cliente_id || null, nombre: form(m).nombre, telefono: tel10(form(m).telefono) } : null) }); location.hash = '#pos'; }
  });
  const es = $('[data-est]', m); if (es) es.onchange = async () => { await api('cotizacion_estado', { id: c.id, estado: es.value }); toast('Estado actualizado'); despues && despues(); };
}
function htmlCot(c) {
  return '<div class="rep" style="padding:10mm;font-family:Inter,sans-serif"><div class="portada"><img src="../img/logo.webp" alt="MEKAMONO"><div style="text-align:right"><h1>Cotización</h1><span>' + h(c.folio || '') + ' · ' + fF(HOY()) + '</span></div></div><div class="esp"></div>' +
    '<p><b>Para:</b> ' + h(c.nombre || '') + (c.telefono ? ' · ' + h(c.telefono) : '') + '<br><b>Válida hasta:</b> ' + fF(c.vigencia) + '</p><table class="t"><thead><tr><th>Concepto</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Importe</th></tr></thead><tbody>' +
    c.items.map(l => '<tr><td>' + h(l.descripcion) + (l.grabado ? '<br><small>Grabado: ' + h(l.grabado) + '</small>' : '') + '</td><td class="num">' + l.cantidad + '</td><td class="num">' + $m(l.precio) + '</td><td class="num">' + $m(l.precio * l.cantidad) + '</td></tr>').join('') +
    '</tbody><tfoot>' + (+c.descuento ? '<tr><td colspan="3">Descuento</td><td class="num">-' + $m(c.descuento) + '</td></tr>' : '') + '<tr><td colspan="3">Total</td><td class="num">' + $m(c.total) + '</td></tr></tfoot></table>' + (c.notas ? '<p style="white-space:pre-line">' + h(c.notas) + '</p>' : '') +
    '<p class="muted peque">MEKAMONO · Bisutería + Grabado Láser · Av. Revolución 503, Local C, Col. Periodistas, Pachuca, Hgo. · WhatsApp 56 5920 6025 · @mekamono</p></div>';
}

/* ================= GASTOS ================= */
const presets = () => { const d = new Date(), y = d.getFullYear(), mo = d.getMonth(); const f = (yy, mm, dd) => iso(new Date(yy, mm, dd)); return { mes: [f(y, mo, 1), HOY(), 'Este mes'], ant: [f(y, mo - 1, 1), f(y, mo, 0), 'Mes pasado'], tri: [f(y, mo - 2, 1), HOY(), 'Últimos 3 meses'], anio: [f(y, 0, 1), HOY(), 'Este año'] }; };
const barraRango = (sel, d, hst) => '<div class="fila" style="margin-bottom:14px"><div class="chips">' + Object.entries(presets()).map(([k, p]) => '<button data-pre="' + k + '" class="' + (k === sel ? 'on' : '') + '">' + p[2] + '</button>').join('') + '</div><label>Desde<input type="date" data-d value="' + d + '"></label><label>Hasta<input type="date" data-h value="' + hst + '"></label></div>';
V.gastos = async v => {
  let pre = 'mes', [desde, hasta] = presets().mes, datos = [], cats = [];
  const pintar = async () => {
    const j = await api('gastos', undefined, { desde, hasta }); datos = j.gastos; cats = j.categorias;
    const tot = datos.reduce((a, g) => a + +g.monto, 0);
    const pc = {}; datos.forEach(g => pc[g.categoria] = (pc[g.categoria] || 0) + +g.monto);
    const pcs = Object.entries(pc).sort((a, b) => b[1] - a[1]);
    v.innerHTML = top('Gastos', '<button class="btn" data-csv>Descargar Excel</button><button class="btn primario" data-nuevo>Registrar gasto</button>') + barraRango(pre, desde, hasta) +
      '<div class="grid g2"><div class="card kpi"><span>Total de gastos</span><b>' + $m(tot) + '</b><small>' + datos.length + ' registros</small></div><div class="card"><h3>Por categoría</h3>' + (pcs.length ? '<div class="lista">' + pcs.map(([k, x]) => '<div><span class="flex">' + h(k) + '</span><div class="hbar" style="width:120px"><i style="width:' + Math.round(x / tot * 100) + '%"></i></div><b class="num" style="min-width:90px">' + $m(x) + '</b></div>').join('') + '</div>' : '<p class="muted">Sin gastos</p>') + '</div></div><div class="esp"></div>' +
      '<div class="card">' + (datos.length ? '<div class="tw"><table class="t"><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th class="ocultar-m">Proveedor</th><th class="ocultar-m">Pago</th><th class="num">Monto</th></tr></thead><tbody>' + datos.map(g => '<tr class="click" data-g="' + g.id + '"><td>' + fF(g.fecha) + '</td><td><b>' + h(g.concepto) + '</b></td><td>' + tg(g.categoria) + '</td><td class="ocultar-m">' + h(g.proveedor || '') + '</td><td class="ocultar-m">' + (METODOS[g.metodo] || g.metodo) + '</td><td class="num">' + $m(g.monto) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="vacio">Sin gastos en este periodo. Registra renta, luz, mercancía, empaques… para ver tu utilidad real.</div>') + '</div>';
  };
  v.onclick = async e => {
    const t = e.target;
    if (t.closest('[data-pre]')) { pre = t.closest('[data-pre]').dataset.pre; [desde, hasta] = presets()[pre]; pintar(); }
    else if (t.closest('[data-nuevo]')) editarGasto({}, cats, pintar);
    else if (t.closest('[data-g]')) editarGasto(datos.find(g => g.id == t.closest('[data-g]').dataset.g), cats, pintar);
    else if (t.closest('[data-csv]')) descargarCSV('gastos-' + desde + '-a-' + hasta, ['Fecha', 'Concepto', 'Categoría', 'Proveedor', 'Método', 'Monto', 'Registró', 'Notas'], datos.map(g => [g.fecha, g.concepto, g.categoria, g.proveedor, METODOS[g.metodo] || g.metodo, g.monto, g.usuario, g.notas]));
  };
  v.onchange = e => { if (e.target.matches('[data-d]')) { desde = e.target.value; pre = ''; pintar(); } if (e.target.matches('[data-h]')) { hasta = e.target.value; pre = ''; pintar(); } };
  pintar();
};
async function editarGasto(g, cats, despues) {
  const pv = (await api('proveedores')).proveedores;
  const m = modal({ titulo: g.id ? 'Editar gasto' : 'Registrar gasto', cuerpo: '<label>Concepto<input name="concepto" value="' + h(g.concepto) + '" placeholder="Ej. Renta de diciembre"></label><div class="f2"><label>Monto<input type="number" step="0.01" min="0" name="monto" value="' + h(g.monto) + '"></label><label>Fecha<input type="date" name="fecha" value="' + h(g.fecha || HOY()) + '"></label></div><div class="f3"><label>Categoría<select name="categoria">' + opt(Object.fromEntries(cats.map(c => [c, c])), g.categoria || 'Otros') + '</select></label><label>Pagado con<select name="metodo">' + opt(METODOS, g.metodo || 'efectivo') + '</select></label><label>Proveedor<select name="proveedor_id"><option value="">—</option>' + pv.map(p => '<option value="' + p.id + '"' + (p.id == g.proveedor_id ? ' selected' : '') + '>' + h(p.nombre) + '</option>').join('') + '</select></label></div><label>Notas<textarea name="notas">' + h(g.notas) + '</textarea></label>',
    pie: (g.id ? '<button class="btn peligro izq" data-del>Borrar</button>' : '') + '<button class="btn" data-x>Cancelar</button><button class="btn primario" data-ok>Guardar</button>' });
  $('[data-ok]', m).onclick = async () => { await api('gasto_guardar', { id: g.id || 0, ...form(m) }); m.cerrar(); toast('Gasto guardado'); despues(); };
  const d = $('[data-del]', m); if (d) d.onclick = async () => { if (await confirmar('¿Borrar este gasto?', 'Borrar')) { await api('gasto_borrar', { id: g.id }); m.cerrar(); despues(); } };
}

/* ================= PROVEEDORES ================= */
V.proveedores = async v => {
  const pintar = async () => {
    const ps = (await api('proveedores')).proveedores;
    v.innerHTML = top('Proveedores', '<button class="btn primario" data-nuevo>Nuevo proveedor</button>') + '<div class="card">' + (ps.length ? '<div class="tw"><table class="t"><thead><tr><th>Proveedor</th><th>Contacto</th><th class="ocultar-m">Qué surte</th><th class="num">Comprado</th><th class="ocultar-m">Última compra</th><th></th></tr></thead><tbody>' +
      ps.map(p => '<tr class="click" data-p="' + p.id + '"><td><b>' + h(p.nombre) + '</b></td><td>' + h(p.contacto || '') + (p.telefono ? '<br><small class="muted">' + h(p.telefono) + '</small>' : '') + '</td><td class="ocultar-m">' + h(p.surte || '') + '</td><td class="num">' + $m(p.comprado) + '</td><td class="ocultar-m">' + fF(p.ultima) + '</td><td class="num">' + (p.telefono ? '<a class="btn mini verde" target="_blank" rel="noopener" href="' + waLink(p.telefono) + '" data-stop>WhatsApp</a>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="vacio">Agrega a tus proveedores de cadenas, placas, empaques… para ligar compras y gastos.</div>') + '</div>';
    v.ps = ps;
  };
  v.onclick = e => { const t = e.target; if (t.closest('[data-stop]')) return; if (t.closest('[data-nuevo]')) editarProv({}, pintar); else if (t.closest('[data-p]')) editarProv(v.ps.find(p => p.id == t.closest('[data-p]').dataset.p), pintar); };
  pintar();
};
function editarProv(p, despues) {
  const m = modal({ titulo: p.id ? p.nombre : 'Nuevo proveedor', cuerpo: '<label>Nombre o empresa<input name="nombre" value="' + h(p.nombre) + '"></label><div class="f2"><label>Contacto<input name="contacto" value="' + h(p.contacto) + '"></label><label>Teléfono / WhatsApp<input name="telefono" value="' + h(p.telefono) + '"></label></div><div class="f2"><label>Correo<input name="email" value="' + h(p.email) + '"></label><label>Qué surte<input name="surte" value="' + h(p.surte) + '" placeholder="Ej. Cadenas de acero, placas"></label></div><label>Notas<textarea name="notas" placeholder="Condiciones, tiempos de entrega, mínimo de compra…">' + h(p.notas) + '</textarea></label>',
    pie: (p.id ? '<button class="btn peligro izq" data-del>Eliminar</button>' : '') + '<button class="btn" data-x>Cancelar</button><button class="btn primario" data-ok>Guardar</button>' });
  $('[data-ok]', m).onclick = async () => { await api('proveedor_guardar', { id: p.id || 0, ...form(m) }); m.cerrar(); toast('Proveedor guardado'); despues(); };
  const d = $('[data-del]', m); if (d) d.onclick = async () => { if (await confirmar('¿Eliminar a ' + p.nombre + '? Sus compras registradas se conservan.', 'Eliminar')) { await api('proveedor_borrar', { id: p.id }); m.cerrar(); despues(); } };
}

/* ================= REPORTES ================= */
V.reportes = async v => {
  let tab = qhash().get('t') || 'periodo', pre = 'mes', [desde, hasta] = presets().mes;
  const mesPasado = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return iso(d).slice(0, 7); })();
  let mes = HOY().slice(0, 7);
  const pintar = async () => {
    v.innerHTML = top('Reportes') + '<div class="tabs"><button data-tab="periodo" class="' + (tab === 'periodo' ? 'on' : '') + '">Ventas por periodo</button><button data-tab="mensual" class="' + (tab === 'mensual' ? 'on' : '') + '">Reporte mensual del negocio</button></div><div data-c><div class="vacio">Cargando…</div></div>';
    const c = $('[data-c]', v);
    if (tab === 'mensual') return pintarMensual(c);
    const r = await api('reporte', undefined, { desde, hasta }); v.r = r; const t = r.totales;
    const util = t.ventas - t.costo - t.gastos;
    const tabla = (id, tit, cab, filas, total) => '<div class="card"><h3>' + tit + '<button class="btn mini" data-csv="' + id + '">Excel</button></h3>' + (filas.length ? '<div class="tw"><table class="t"><thead><tr>' + cab.map((x, i) => '<th' + (i ? ' class="num"' : '') + '>' + x + '</th>').join('') + '</tr></thead><tbody>' + filas.map(f => '<tr>' + f.map((x, i) => '<td' + (i ? ' class="num"' : '') + '>' + x + '</td>').join('') + '</tr>').join('') + '</tbody>' + (total ? '<tfoot><tr>' + total.map((x, i) => '<td' + (i ? ' class="num"' : '') + '>' + x + '</td>').join('') + '</tr></tfoot>' : '') + '</table></div>' : '<p class="muted">Sin datos en el periodo.</p>') + '</div>';
    const maxP = Math.max(1, ...r.por_producto.map(p => +p.importe));
    c.innerHTML = barraRango(pre, desde, hasta) +
      '<div class="grid g4"><div class="card kpi"><span>Ventas</span><b>' + $c(t.ventas) + '</b><small>' + t.tickets + ' tickets · ' + t.piezas + ' piezas</small></div><div class="card kpi"><span>Ticket promedio</span><b>' + $c(t.tickets ? t.ventas / t.tickets : 0) + '</b><small>Cobrado en el periodo ' + $c(t.cobrado) + '</small></div>' +
      '<div class="card kpi"><span>Gastos</span><b>' + $c(t.gastos) + '</b><small>Costo de mercancía ' + $c(t.costo) + '</small></div><div class="card kpi"><span>Utilidad estimada</span><b style="color:' + (util >= 0 ? 'var(--ok)' : 'var(--er)') + '">' + $c(util) + '</b><small>Ventas − costo − gastos' + (+t.costo ? '' : ' (sin costos capturados)') + '</small></div></div><div class="esp"></div>' +
      '<div class="grid g2">' +
      tabla('mes', 'Por mes', ['Mes', 'Tickets', 'Ventas', 'Gastos', 'Utilidad'], r.por_mes.map(x => [nomMes(x.mes), x.tickets, $m(x.ventas), $m(x.gastos), $m(x.ventas - x.costo - x.gastos)])) +
      tabla('vendedor', 'Por vendedor', ['Vendedor', 'Tickets', 'Ventas', 'Promedio'], r.por_vendedor.map(x => [h(x.vendedor), x.tickets, $m(x.ventas), $m(x.promedio)])) +
      '</div><div class="esp"></div>' +
      '<div class="card"><h3>Por producto<button class="btn mini" data-csv="producto">Excel</button></h3>' + (r.por_producto.length ? '<div class="tw"><table class="t"><thead><tr><th>Producto</th><th class="ocultar-m"></th><th class="num">Piezas</th><th class="num">Importe</th><th class="num ocultar-m">Margen</th></tr></thead><tbody>' + r.por_producto.map(x => '<tr><td>' + h(x.producto) + '<br><small class="muted">' + h(x.categoria) + '</small></td><td class="ocultar-m"><div class="hbar"><i style="width:' + Math.round(x.importe / maxP * 100) + '%"></i></div></td><td class="num">' + x.piezas + '</td><td class="num">' + $m(x.importe) + '</td><td class="num ocultar-m">' + (+x.costo ? Math.round((x.importe - x.costo) / x.importe * 100) + '%' : '—') + '</td></tr>').join('') + '</tbody></table></div>' : '<p class="muted">Sin ventas en el periodo.</p>') + '</div><div class="esp"></div>' +
      '<div class="grid g3">' +
      tabla('categoria', 'Por categoría', ['Categoría', 'Piezas', 'Importe'], r.por_categoria.map(x => [h(x.categoria), x.piezas, $m(x.importe)])) +
      tabla('metodo', 'Por forma de pago', ['Método', 'Pagos', 'Monto'], r.por_metodo.map(x => [METODOS[x.metodo] || h(x.metodo), x.pagos, $m(x.monto)])) +
      tabla('canal', 'Por canal', ['Canal', 'Tickets', 'Ventas'], r.por_canal.map(x => [x.canal === 'web' ? 'Tienda en línea' : 'Mostrador', x.tickets, $m(x.ventas)])) +
      '</div><div class="esp"></div><div class="grid g2">' +
      tabla('gastos', 'Gastos por categoría', ['Categoría', 'Registros', 'Monto'], r.gastos_cat.map(x => [h(x.categoria), x.n, $m(x.monto)])) +
      tabla('clientes', 'Mejores clientes', ['Cliente', 'Compras', 'Total'], r.top_clientes.map(x => [h(x.cliente), x.compras, $m(x.total)])) + '</div>';
  };
  const CSV = {
    mes: r => [['Mes', 'Tickets', 'Ventas', 'Costo', 'Gastos', 'Utilidad'], r.por_mes.map(x => [x.mes, x.tickets, x.ventas, x.costo, x.gastos, (x.ventas - x.costo - x.gastos).toFixed(2)])],
    vendedor: r => [['Vendedor', 'Tickets', 'Ventas', 'Ticket promedio'], r.por_vendedor.map(x => [x.vendedor, x.tickets, x.ventas, (+x.promedio).toFixed(2)])],
    producto: r => [['Producto', 'Categoría', 'Piezas', 'Importe', 'Costo'], r.por_producto.map(x => [x.producto, x.categoria, x.piezas, x.importe, x.costo])],
    categoria: r => [['Categoría', 'Piezas', 'Importe'], r.por_categoria.map(x => [x.categoria, x.piezas, x.importe])],
    metodo: r => [['Método', 'Pagos', 'Monto'], r.por_metodo.map(x => [METODOS[x.metodo] || x.metodo, x.pagos, x.monto])],
    canal: r => [['Canal', 'Tickets', 'Ventas'], r.por_canal.map(x => [x.canal, x.tickets, x.ventas])],
    gastos: r => [['Categoría', 'Registros', 'Monto'], r.gastos_cat.map(x => [x.categoria, x.n, x.monto])],
    clientes: r => [['Cliente', 'Compras', 'Total'], r.top_clientes.map(x => [x.cliente, x.compras, x.total])],
  };
  async function pintarMensual(c) {
    const opciones = []; const d = new Date(); d.setDate(1);
    for (let i = 0; i < 18; i++) { opciones.push(iso(d).slice(0, 7)); d.setMonth(d.getMonth() - 1); }
    const r = await api('reporte_mensual', undefined, { mes });
    const a = r.actual.totales, p = r.previo.totales, x = r.extra;
    const pct = (n, o) => !+o ? (+n ? null : 0) : Math.round((n - o) / o * 100);
    const vari = (n, o, inv) => { const v2 = pct(n, o); if (v2 === null) return '<small>sin mes previo para comparar</small>'; const bueno = inv ? v2 <= 0 : v2 >= 0; return '<small class="' + (v2 === 0 ? '' : bueno ? 'up' : 'down') + '">' + (v2 > 0 ? '▲ ' : v2 < 0 ? '▼ ' : '') + Math.abs(v2) + '% vs ' + MESES[+r.anterior.slice(5) - 1] + '</small>'; };
    const ua = a.ventas - a.costo - a.gastos, up = p.ventas - p.costo - p.gastos;
    const tp = a.tickets ? a.ventas / a.tickets : 0, tpp = p.tickets ? p.ventas / p.tickets : 0;
    const top3 = r.actual.por_producto.slice(0, 5), mejorV = r.actual.por_vendedor[0], gcat = r.actual.gastos_cat[0];
    const mejorDia = r.actual.por_dia.slice().sort((q1, q2) => q2.ventas - q1.ventas)[0];
    const ins = [];
    const pv = pct(a.ventas, p.ventas);
    if (pv !== null && a.ventas) ins.push(pv >= 0 ? 'Las ventas subieron ' + pv + '% frente a ' + MESES[+r.anterior.slice(5) - 1] + '.' : 'Las ventas bajaron ' + Math.abs(pv) + '% frente a ' + MESES[+r.anterior.slice(5) - 1] + '. Revisa promociones y seguimiento a clientes.');
    if (top3[0]) ins.push('Tu producto estrella fue ' + top3[0].producto + ' con ' + top3[0].piezas + ' piezas (' + $c(top3[0].importe) + ').');
    if (mejorDia) ins.push('El mejor día fue el ' + fD(mejorDia.dia) + ' con ' + $c(mejorDia.ventas) + '.');
    if (mejorV && r.actual.por_vendedor.length > 1) ins.push(mejorV.vendedor + ' fue quien más vendió: ' + $c(mejorV.ventas) + '.');
    if (gcat) ins.push('El gasto más alto fue ' + gcat.categoria + ' (' + $c(gcat.monto) + ', ' + Math.round(gcat.monto / Math.max(1, a.gastos) * 100) + '% de los gastos).');
    if (x.pedidos_web) ins.push('Llegaron ' + x.pedidos_web + ' pedidos desde la tienda en línea.');
    if (x.carritos) ins.push(x.carritos + ' clientes dejaron su carrito sin terminar' + (x.carritos_recuperados ? ' y ' + x.carritos_recuperados + ' sí completaron su pedido' : '') + '. Escribirles por WhatsApp ayuda a cerrar ventas.');
    if (x.cotizaciones) ins.push('Se hicieron ' + x.cotizaciones + ' cotizaciones y ' + x.cotizaciones_vendidas + ' se convirtieron en venta.');
    if (x.faltantes) ins.push('Hay ' + x.faltantes + ' variantes en o por debajo de su mínimo. Conviene resurtir antes de fin de mes.');
    if (x.sin_movimiento.length) ins.push('Productos con existencia que no se vendieron este mes: ' + x.sin_movimiento.slice(0, 4).map(s => s.nombre).join(', ') + '. Considera moverlos en redes o en promoción.');
    if (!+a.costo && a.ventas) ins.push('Captura el costo de tus productos en Inventario para ver la utilidad real.');
    const html = '<div class="rep"><div class="portada"><div><img src="../img/logo.webp" alt="MEKAMONO"><h1 style="margin-top:10px">Reporte de ' + nomMes(mes) + '</h1><span>Cómo va tu negocio · preparado por APARECE</span></div></div><div class="esp"></div>' +
      '<div class="grid g4"><div class="card kpi"><span>Ventas</span><b>' + $c(a.ventas) + '</b>' + vari(a.ventas, p.ventas) + '</div><div class="card kpi"><span>Tickets</span><b>' + a.tickets + '</b>' + vari(a.tickets, p.tickets) + '</div><div class="card kpi"><span>Ticket promedio</span><b>' + $c(tp) + '</b>' + vari(tp, tpp) + '</div><div class="card kpi"><span>Utilidad estimada</span><b>' + $c(ua) + '</b>' + vari(ua, up) + '</div></div><div class="esp"></div>' +
      '<div class="grid g4"><div class="card kpi"><span>Gastos</span><b>' + $c(a.gastos) + '</b>' + vari(a.gastos, p.gastos, 1) + '</div><div class="card kpi"><span>Clientes nuevos</span><b>' + a.clientes_nuevos + '</b>' + vari(a.clientes_nuevos, p.clientes_nuevos) + '</div><div class="card kpi"><span>Citas</span><b>' + x.citas + '</b></div><div class="card kpi"><span>Por cobrar</span><b>' + $c(a.por_cobrar) + '</b></div></div><div class="esp"></div>' +
      '<div class="card"><h3>Lo más importante del mes</h3>' + (ins.length ? '<ul class="ins">' + ins.map(s => '<li>' + h(s) + '</li>').join('') + '</ul>' : '<p class="muted">Aún no hay movimientos este mes.</p>') + '</div><div class="esp"></div>' +
      '<div class="grid g2"><div class="card"><h3>Top 5 productos</h3>' + (top3.length ? '<div class="lista">' + top3.map((t2, i) => '<div><b>' + (i + 1) + '.</b><span class="flex">' + h(t2.producto) + '</span><span class="muted">' + t2.piezas + ' pzas</span><b>' + $c(t2.importe) + '</b></div>').join('') + '</div>' : '<p class="muted">Sin ventas</p>') + '</div>' +
      '<div class="card"><h3>Ventas por semana del mes</h3>' + barrasSemana(r.actual.por_dia, mes) + '</div></div><div class="esp"></div>' +
      '<div class="grid g2"><div class="card"><h3>Gastos por categoría</h3>' + (r.actual.gastos_cat.length ? '<div class="lista">' + r.actual.gastos_cat.map(g => '<div><span class="flex">' + h(g.categoria) + '</span><b>' + $c(g.monto) + '</b></div>').join('') + '</div>' : '<p class="muted">Sin gastos registrados</p>') + '</div>' +
      '<div class="card"><h3>Por vendedor</h3>' + (r.actual.por_vendedor.length ? '<div class="lista">' + r.actual.por_vendedor.map(g => '<div><span class="flex">' + h(g.vendedor) + '</span><span class="muted">' + g.tickets + ' tickets</span><b>' + $c(g.ventas) + '</b></div>').join('') + '</div>' : '<p class="muted">Sin ventas</p>') + '</div></div></div>';
    c.innerHTML = '<div class="fila noprint" style="margin-bottom:14px"><label>Mes<select data-mes style="width:auto">' + opt(Object.fromEntries(opciones.map(o => [o, nomMes(o)])), mes) + '</select></label><span class="flex"></span><button class="btn primario" data-print>Imprimir / Guardar PDF</button></div>' + html;
    $('[data-mes]', c).onchange = e => { mes = e.target.value; pintar(); };
    $('[data-print]', c).onclick = () => imprimir(html, 1);
  }
  function barrasSemana(dias, ym) {
    const s = [0, 0, 0, 0, 0]; dias.forEach(d => { s[Math.min(4, Math.floor((+d.dia.slice(8) - 1) / 7))] += +d.ventas; });
    const mx = Math.max(1, ...s);
    return '<div class="bars">' + s.map((x, i) => '<div title="' + $m(x) + '"><i style="height:' + Math.round(x / mx * 100) + '%"></i><span>Sem ' + (i + 1) + '</span></div>').join('') + '</div>';
  }
  v.onclick = e => {
    const t = e.target;
    if (t.closest('[data-tab]')) { tab = t.closest('[data-tab]').dataset.tab; pintar(); }
    else if (t.closest('[data-pre]')) { pre = t.closest('[data-pre]').dataset.pre; [desde, hasta] = presets()[pre]; pintar(); }
    else if (t.closest('[data-csv]')) { const k = t.closest('[data-csv]').dataset.csv; const [cab, filas] = CSV[k](v.r); descargarCSV('reporte-' + k + '-' + desde + '-a-' + hasta, cab, filas); }
  };
  v.onchange = e => { if (e.target.matches('[data-d]')) { desde = e.target.value; pre = ''; pintar(); } if (e.target.matches('[data-h]')) { hasta = e.target.value; pre = ''; pintar(); } };
  pintar();
};

/* ================= USUARIOS ================= */
V.usuarios = async v => {
  const pintar = async () => {
    const j = await api('usuarios'); const act = j.usuarios.filter(u => +u.activo).length;
    v.innerHTML = top('Usuarios', '<button class="btn primario" data-nuevo' + (act >= j.max ? ' disabled title="Llegaste al límite de tu plan"' : '') + '>Agregar usuario</button>') +
      '<div class="card"><p class="muted" style="margin-top:0">Tu plan Negocio incluye hasta <b>' + j.max + ' usuarios</b>. Tienes <b>' + act + '</b> activos. <b>Dueño</b> ve todo (gastos, reportes, costos y usuarios). <b>Vendedor</b> usa punto de venta, ventas, clientes, agenda, cotizaciones y consulta inventario.</p>' +
      '<div class="tw"><table class="t"><thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Estado</th><th class="ocultar-m">Último acceso</th></tr></thead><tbody>' + j.usuarios.map(u => '<tr class="click" data-u="' + u.id + '"><td><b>' + h(u.nombre) + '</b>' + (u.id == U.id ? ' <small class="muted">(tú)</small>' : '') + '</td><td>' + h(u.email) + '</td><td>' + (u.rol === 'dueno' ? tg('Dueño', 'oro') : tg('Vendedor')) + '</td><td>' + (+u.activo ? tg('Activo', 'ok') : tg('Inactivo')) + '</td><td class="ocultar-m">' + (u.ultimo_acceso ? fF(u.ultimo_acceso) : 'Nunca') + '</td></tr>').join('') + '</tbody></table></div></div>';
    v.us = j.usuarios;
  };
  v.onclick = e => { const t = e.target; if (t.closest('[data-nuevo]')) editarUsuario({ activo: 1, rol: 'vendedor' }, pintar); else if (t.closest('[data-u]')) editarUsuario(v.us.find(u => u.id == t.closest('[data-u]').dataset.u), pintar); };
  pintar();
};
function editarUsuario(u, despues) {
  const m = modal({ titulo: u.id ? 'Editar usuario' : 'Agregar usuario', cuerpo: '<label>Nombre<input name="nombre" value="' + h(u.nombre) + '"></label><label>Correo (con este entra)<input type="email" name="email" value="' + h(u.email) + '"></label><div class="f2"><label>Rol<select name="rol">' + opt({ vendedor: 'Vendedor', dueno: 'Dueño' }, u.rol) + '</select></label><label>' + (u.id ? 'Nueva contraseña (opcional)' : 'Contraseña') + '<input type="text" name="pass" autocomplete="new-password" placeholder="Mínimo 8 caracteres"></label></div><label class="chk"><input type="checkbox" name="activo"' + (+u.activo ? ' checked' : '') + '> Activo (puede entrar al panel)</label>',
    pie: '<button class="btn" data-x>Cancelar</button><button class="btn primario" data-ok>Guardar</button>' });
  $('[data-ok]', m).onclick = async () => { const f = form(m); await api('usuario_guardar', { id: u.id || 0, ...f }); m.cerrar(); toast(f.pass ? 'Guardado. Comparte la contraseña con ' + primer(f.nombre) + ' por un medio seguro.' : 'Usuario guardado'); despues(); };
}

/* ================= AJUSTES ================= */
V.ajustes = async v => {
  const a = DUENO ? (await api('ajustes')).ajustes : {};
  v.innerHTML = top(DUENO ? 'Ajustes' : 'Mi cuenta') + '<div class="grid g2">' +
    (DUENO ? '<div class="card" data-neg><h2>Datos del negocio</h2><div class="cuerpo" style="display:flex;flex-direction:column;gap:10px"><label>Nombre<input name="negocio" value="' + h(a.negocio) + '"></label><label>Teléfono<input name="telefono" value="' + h(a.telefono) + '"></label><label>Dirección<input name="direccion" value="' + h(a.direccion) + '"></label><label>Mensaje al pie del ticket<input name="ticket_pie" value="' + h(a.ticket_pie) + '"></label><label>Categorías de gastos (separadas por coma)<textarea name="gasto_cats">' + h(a.gasto_cats) + '</textarea></label><div><button class="btn primario" data-gneg>Guardar</button></div></div></div>' : '') +
    '<div class="card" data-pw><h2>Cambiar mi contraseña</h2><div style="display:flex;flex-direction:column;gap:10px"><label>Contraseña actual<input type="password" name="actual" autocomplete="current-password"></label><label>Nueva contraseña<input type="password" name="nueva" autocomplete="new-password" placeholder="Mínimo 8 caracteres"></label><div><button class="btn primario" data-gpw>Cambiar</button></div></div>' +
    '<div class="esp"></div><h2>Ayuda</h2><p class="muted">Soporte de APARECE por WhatsApp, lunes a viernes de 10:00 a 16:00. Incluye 2 rondas de ajustes al mes y una sesión de capacitación mensual.</p></div></div>';
  const g = $('[data-gneg]', v); if (g) g.onclick = async () => { await api('ajustes_set', form($('[data-neg]', v))); MK.negocio = form($('[data-neg]', v)).negocio; toast('Ajustes guardados'); };
  $('[data-gpw]', v).onclick = async () => { const f = form($('[data-pw]', v)); await api('mi_pass', f); toast('Contraseña cambiada'); $$('[data-pw] input', v).forEach(i => i.value = ''); };
  if (a.ticket_pie) MK.pie = a.ticket_pie;
};

ruta();
})();
