(function(){
'use strict';
const $=(s,r)=>(r||document).querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];
const WA='525659206025',IMG=window.MK_IMG||'';
const im=(n,s)=>IMG+n+'.webp';
const money=n=>'$'+Number(n).toLocaleString('es-MX');
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>String(s).toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
const wa=t=>'https://wa.me/'+WA+'?text='+encodeURIComponent(t);
const LS={get(k,d){try{const v=JSON.parse(localStorage.getItem(k));return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};
const SOL={dorad:'#d4ad5f',platead:'#c7cacf',negr:'#1c1c1f',blanc:'#f3f3f3',roj:'#c4262e',verd:'#2e7d4f',azul:'#2a5bd7',rosa:'#e8a3b5',morad:'#7b4bb7'};
const GR={dorad:'linear-gradient(135deg,#f6e2a8,#c99a45 55%,#8f6a28)',platead:'linear-gradient(135deg,#fff,#c9ccd1 55%,#8d9198)',negr:'linear-gradient(135deg,#55555a,#111)'};
function swatch(val){const v=norm(val);if(/bicolor|combinad/.test(v))return 'linear-gradient(90deg,#d4ad5f 50%,#c7cacf 50%)';if(/multicolor/.test(v))return 'conic-gradient(#e2574c,#f2c037,#3cb371,#3f8efc,#9b59b6,#e2574c)';const hits=[];v.replace(/(dorad|platead|negr|blanc|roj|verd|azul|rosa|morad)/g,m=>{if(!hits.includes(m))hits.push(m)});if(!hits.length)return '#bbb';if(hits.length===1)return GR[hits[0]]||SOL[hits[0]];return 'linear-gradient(135deg,'+SOL[hits[0]]+' 50%,'+SOL[hits[1]]+' 50%)'}
const CATS=['Personalizados','Esclavas','Cadenas','Collares','Brazaletes','Anillos','Dijes','Accesorios'];
const P=(window.MK_P||[]).map((p,idx)=>{const no=p.o.length||1;const vs=p.v.map(v=>({o:v.slice(0,no).map(x=>x==null?'':String(x)),price:+v[no],stock:+v[no+2],img:+v[no+3]||0}));const pr=vs.map(v=>v.price);const avail=vs.some(v=>v.stock>0);const ci=p.o.indexOf('Color');const colors=ci<0?[]:[...new Set(vs.map(v=>v.o[ci]))];const tones=new Set();(colors.length?colors:[p.n]).forEach(c=>{const n=norm(c);if(/dorad/.test(n))tones.add('Dorado');if(/platead/.test(n))tones.add('Plateado');if(/negr/.test(n))tones.add('Negro')});const tot=vs.reduce((a,v)=>a+(v.stock>0?v.stock:0),0);return {id:p.id,n:p.n,c:CATS.includes(p.c)?p.c:'Accesorios',o:p.o,i:p.i,d:p.d||'',idx,vs,min:Math.min(...pr),max:Math.max(...pr),avail,pers:p.c==='Personalizados'||/personaliz/i.test(p.n),colors,tones:[...tones],low:avail&&tot<=2,k:norm(p.n+' '+p.c+' '+colors.join(' '))}});
const PMIN=Math.floor(Math.min(...P.map(p=>p.min))/10)*10,PMAX=Math.ceil(Math.max(...P.map(p=>p.min))/10)*10;
function dots(p){return p.colors.slice(0,4).map(c=>'<i style="background:'+swatch(c)+'"></i>').join('')}
function card(p){const b=p.i[1];return '<article class="pc"><button class="pc-media" data-open="'+p.id+'" aria-label="Ver '+esc(p.n)+'"><img src="'+im(p.i[0],480)+'" alt="'+esc(p.n)+'" loading="lazy">'+(b?'<img class="alt" src="'+im(b,480)+'" alt="" loading="lazy">':'')+'<span class="pc-tags">'+(p.pers?'<i class="tg tg-l">Personalizable</i>':'')+(!p.avail?'<i class="tg tg-x">Agotado</i>':p.low?'<i class="tg tg-w">Últimas piezas</i>':'')+'</span></button><div class="pc-body"><span class="pc-cat">'+esc(p.c)+'</span><h3 class="pc-name">'+esc(p.n)+'</h3><div class="pc-row"><span class="pc-price">'+(p.min!==p.max?'<small>Desde </small>':'')+money(p.min)+'</span><span class="pc-dots">'+dots(p)+'</span></div></div><button class="pc-add" data-open="'+p.id+'" '+(p.avail?'':'disabled')+' aria-label="Agregar '+esc(p.n)+'">+</button></article>'}

const hd=$('#hd');const onSc=()=>hd.classList.toggle('sc',scrollY>10);addEventListener('scroll',onSc,{passive:true});onSc();
$$('[data-wa]').forEach(a=>{a.href=wa(a.dataset.wa);a.target='_blank';a.rel='noopener'});
const mm=$('#mm');$('[data-menu]').addEventListener('click',()=>{mm.classList.toggle('on');document.body.style.overflow=mm.classList.contains('on')?'hidden':''});$$('a',mm).forEach(a=>a.addEventListener('click',()=>{mm.classList.remove('on');document.body.style.overflow=''}));

const HRS={0:[630,1140],1:[720,1170],2:[720,1170],3:[720,1170],4:[720,1170],5:[720,1170],6:[660,1140]};
const DN=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const fmt=m=>{let h=Math.floor(m/60),mi=m%60;const ap=h>=12?'p.m.':'a.m.';h=h%12||12;return h+(mi?':'+String(mi).padStart(2,'0'):'')+' '+ap};
function mx(d){const f=new Intl.DateTimeFormat('en-US',{timeZone:'America/Mexico_City',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23',day:'numeric',month:'numeric'}).formatToParts(d||new Date());const g=t=>(f.find(x=>x.type===t)||{}).value;return {d:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].indexOf(g('weekday')),m:(+g('hour')%24)*60+(+g('minute')),day:+g('day'),mon:+g('month')}}
function status(){const n=mx();const [a,b]=HRS[n.d];if(n.m>=a&&n.m<b)return {o:1,t:'Abierto · cierra '+fmt(b)};if(n.m<a)return {o:0,t:'Cerrado · abre hoy '+fmt(a)};return {o:0,t:'Cerrado · abre mañana '+fmt(HRS[(n.d+1)%7][0])}}
function paintStatus(){const s=status();$$('[data-status]').forEach(e=>{e.classList.toggle('open',!!s.o);$('b',e).textContent=s.t});$$('[data-status-txt]').forEach(e=>e.textContent=s.t);const n=mx();$('#hours').innerHTML=[1,2,3,4,5,6,0].map(d=>'<tr class="'+(d===n.d?'today':'')+'"><td>'+DN[d]+'</td><td>'+fmt(HRS[d][0])+' – '+fmt(HRS[d][1])+'</td></tr>').join('')}
paintStatus();setInterval(paintStatus,60000);

const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});$$('[data-rv]').forEach(e=>io.observe(e));

const hp=P.find(p=>p.n==='Esclava Personalizada Texto')||P[0];
if(hp){const e=$('[data-hero-prod]');e.dataset.open=hp.id;e.innerHTML='<img src="'+im(hp.i[0],480)+'" alt=""><div><small>Personalizable</small><b>'+esc(hp.n)+'</b><span>'+money(hp.min)+'</span></div>'}

const cnt=c=>P.filter(p=>p.c===c).length;
const catImg={Personalizados:'Collar Placa Militar Personalizado',Esclavas:'Esclava Van Cleef Aura',Cadenas:'Cadena Torzal',Collares:'Collar Piedra Ágata',Brazaletes:'Brazalete Personalizado Texto',Anillos:''};
$('#catGrid').innerHTML=CATS.filter(c=>cnt(c)).slice(0,6).map(c=>{const p=P.find(x=>x.n===catImg[c]&&x.c===c)||P.find(x=>x.c===c);return '<a class="cat" href="#tienda" data-cat="'+c+'"><img src="'+im(p.i[0],480)+'" alt="" loading="lazy"><div><b>'+c+'</b><span>'+cnt(c)+' piezas</span></div></a>'}).join('');
$('#ftCats').innerHTML=CATS.filter(c=>cnt(c)).map(c=>'<li><a href="#tienda" data-cat="'+c+'">'+c+'</a></li>').join('');
const fc=$('#featCar');fc.innerHTML=P.filter(p=>p.pers&&p.avail).concat(P.filter(p=>!p.pers&&p.avail&&p.i.length>2).slice(0,4)).slice(0,10).map(card).join('');
$$('[data-car]').forEach(b=>b.addEventListener('click',()=>fc.scrollBy({left:(+b.dataset.car)*fc.clientWidth*.8,behavior:'smooth'})));

const F={cat:'',tones:new Set(),max:PMAX,avail:false,pers:false,q:'',sort:'rel'};let shown=12;
const fmax=$('#fmax');fmax.min=PMIN;fmax.max=PMAX;fmax.step=10;fmax.value=PMAX;$('#fminv').textContent=money(PMIN);
function list(){const q=norm(F.q.trim());let a=P.filter(p=>(!F.cat||p.c===F.cat)&&(!F.tones.size||p.tones.some(t=>F.tones.has(t)))&&p.min<=F.max&&(!F.avail||p.avail)&&(!F.pers||p.pers)&&(!q||q.split(/\s+/).every(w=>p.k.includes(w))));if(F.sort==='pa')a.sort((x,y)=>x.min-y.min);else if(F.sort==='pd')a.sort((x,y)=>y.min-x.min);else if(F.sort==='az')a.sort((x,y)=>x.n.localeCompare(y.n,'es'));else a.sort((x,y)=>(y.avail-x.avail)||(x.idx-y.idx));return a}
function renderFilters(){$('#fcats').innerHTML='<button class="'+(F.cat?'':'on')+'" data-fc="">Todas<span>'+P.length+'</span></button>'+CATS.filter(c=>cnt(c)).map(c=>'<button class="'+(F.cat===c?'on':'')+'" data-fc="'+c+'">'+c+'<span>'+cnt(c)+'</span></button>').join('');$('#ftones').innerHTML=['Dorado','Plateado','Negro'].map(t=>'<button class="'+(F.tones.has(t)?'on':'')+'" data-ft="'+t+'"><i class="sw" style="background:'+swatch(t)+'"></i>'+t+'</button>').join('');$('#fmaxv').textContent=money(F.max);$('#favail').checked=F.avail;$('#fpers').checked=F.pers}
function renderStore(){const a=list();const g=$('#pgrid');g.innerHTML=a.length?a.slice(0,shown).map(card).join(''):'<div class="empty"><b style="font:700 22px var(--fd);color:var(--dk)">Sin resultados</b><br>Prueba con otra búsqueda o limpia los filtros.</div>';$('#rcount').textContent=a.length?('Mostrando '+Math.min(shown,a.length)+' de '+a.length+' piezas'):'';$('#pmore').style.display=a.length>shown?'':'none';const ch=[];if(F.cat)ch.push(['cat',F.cat]);F.tones.forEach(t=>ch.push(['tone',t]));if(F.max<PMAX)ch.push(['max','Hasta '+money(F.max)]);if(F.avail)ch.push(['avail','Disponibles']);if(F.pers)ch.push(['pers','Personalizables']);if(F.q)ch.push(['q','“'+F.q+'”']);$('#achips').innerHTML=ch.map(c=>'<button data-chip="'+c[0]+'" data-v="'+esc(c[1])+'">'+esc(c[1])+' ×</button>').join('');renderFilters()}
function upd(){shown=12;renderStore()}
document.addEventListener('click',e=>{const t=e.target.closest('[data-fc],[data-ft],[data-chip],[data-cat]');if(!t)return;if(t.dataset.fc!=null){F.cat=t.dataset.fc;upd()}else if(t.dataset.ft){F.tones.has(t.dataset.ft)?F.tones.delete(t.dataset.ft):F.tones.add(t.dataset.ft);upd()}else if(t.dataset.chip){const k=t.dataset.chip;if(k==='cat')F.cat='';if(k==='tone')F.tones.delete(t.dataset.v);if(k==='max')F.max=PMAX;if(k==='avail')F.avail=false;if(k==='pers')F.pers=false;if(k==='q'){F.q='';$('#sq').value=''}upd()}else if(t.dataset.cat!=null){F.cat=t.dataset.cat;upd()}});
fmax.addEventListener('input',()=>{F.max=+fmax.value;upd()});$('#favail').addEventListener('change',e=>{F.avail=e.target.checked;upd()});$('#fpers').addEventListener('change',e=>{F.pers=e.target.checked;upd()});
let sqT;$('#sq').addEventListener('input',e=>{clearTimeout(sqT);sqT=setTimeout(()=>{F.q=e.target.value;upd()},180)});$('#ssort').addEventListener('change',e=>{F.sort=e.target.value;upd()});
$('#pmore').addEventListener('click',()=>{shown+=12;renderStore()});
$('#fclear').addEventListener('click',()=>{F.cat='';F.tones.clear();F.max=PMAX;F.avail=false;F.pers=false;F.q='';$('#sq').value='';fmax.value=PMAX;upd()});
const fl=$('#filters'),fd=$('#fdone');$('#fopen').addEventListener('click',()=>{fl.classList.add('on');fd.style.display='inline-flex'});fd.addEventListener('click',()=>{fl.classList.remove('on');fd.style.display='none';$('#tienda').scrollIntoView({behavior:'smooth'})});
renderStore();

let openStack=[];
function openOv(id){const el=$('#'+id);el.hidden=false;openStack.push(id);document.body.style.overflow='hidden'}
function closeOv(id){const el=$('#'+id);if(!el)return;el.hidden=true;openStack=openStack.filter(x=>x!==id);if(!openStack.length)document.body.style.overflow=''}
document.addEventListener('click',e=>{const c=e.target.closest('[data-close]');if(c){const ov=c.closest('.ov');if(ov)closeOv(ov.id)}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&openStack.length)closeOv(openStack[openStack.length-1])});
$$('[data-cart]').forEach(b=>b.addEventListener('click',()=>{renderCart();openOv('cart')}));
document.addEventListener('click',e=>{const l=e.target.closest('[data-lb]');if(l){$('#lbImg').src=l.dataset.lb;openOv('lb')}});

let cur=null;
function variant(){const {p,sel}=cur;return p.vs.find(v=>v.o.every((x,i)=>x===sel[i]))||null}
function openP(id,keep){const p=P.find(x=>String(x.id)===String(id));if(!p)return;const first=p.vs.find(v=>v.stock>0)||p.vs[0];cur={p,sel:first.o.slice(),qty:1,img:first.img||0,eng:['','']};renderP();if(!keep)openOv('pm');$('#pm .pm-card').scrollTop=0}
function renderP(){const {p}=cur;const v=variant();const price=v?v.price:p.min;const st=v?v.stock:0;const ok=v&&st>0;
const img=$('#pmImg');img.src=im(p.i[cur.img]||p.i[0],1024);img.alt=p.n;
$('#pmThumbs').innerHTML=p.i.length>1?p.i.map((n,i)=>'<button class="'+(i===cur.img?'on':'')+'" data-th="'+i+'" aria-label="Imagen '+(i+1)+'"><img src="'+im(n,480)+'" alt=""></button>').join(''):'';
const opts=p.o.map((name,k)=>{const vals=[...new Set(p.vs.map(v=>v.o[k]))];return '<div class="og"><h5>'+esc(name)+': <span>'+esc(cur.sel[k])+'</span></h5><div class="ovals">'+vals.map(val=>{const av=p.vs.some(v=>v.o[k]===val&&v.stock>0&&v.o.every((x,j)=>j>=k||x===cur.sel[j]));return '<button class="'+(val===cur.sel[k]?'on ':'')+(av?'':'off')+'" data-ov="'+k+'" data-val="'+esc(val)+'">'+(name==='Color'?'<i class="sw" style="background:'+swatch(val)+'"></i>':'')+esc(val)+'</button>'}).join('')+'</div></div>'}).join('');
const stock=!ok?'<span class="stock out"><i></i>Agotado en esta opción · elige otra</span>':st<=2?'<span class="stock low"><i></i>¡Últimas '+(st===1?'pieza':st+' piezas')+'!</span>':'<span class="stock"><i></i>Disponible'+(p.pers?' · listo para grabar':'')+'</span>';
const eng=p.pers?'<div class="eng-box"><h5>✍️ Personaliza tu grabado</h5><input data-eng="0" maxlength="30" placeholder="Texto al frente (nombre, fecha, frase…)" value="'+esc(cur.eng[0])+'"><input data-eng="1" maxlength="30" placeholder="Texto al reverso (opcional)" value="'+esc(cur.eng[1])+'"><button class="link" data-tolab>Diseñarlo en el simulador y verlo en vivo →</button></div>':'';
$('#pmInfo').innerHTML='<span class="pc-cat">'+esc(p.c)+(p.pers?' · Personalizable':'')+'</span><h3>'+esc(p.n)+'</h3><div class="pm-price">'+money(price)+' <small>MXN</small></div>'+stock+opts+eng+'<div class="buy"><div class="qty"><button data-q="-1" aria-label="Menos">−</button><span>'+cur.qty+'</span><button data-q="1" aria-label="Más">+</button></div><button class="btn btn-dark" data-addcur '+(ok?'':'disabled style="opacity:.35;pointer-events:none"')+'>Agregar · '+money(price*cur.qty)+'</button></div><a class="btn btn-wa" target="_blank" rel="noopener" href="'+wa('Hola MEKAMONO 🐵, me interesa: '+p.n+(p.o.length?' ('+cur.sel.join(' · ')+')':'')+' — '+money(price))+'">Preguntar por WhatsApp</a><div class="pm-trust"><div><b>Acero inoxidable</b>No cambia de color</div><div><b>Envíos a todo México</b>'+(p.pers?'Producción 3–5 días':'Pide en línea')+'</div><div><b>Recoge en tienda</b>Av. Revolución 503</div></div>'+(p.d?'<div class="pm-desc" id="pmDesc">'+esc(p.d)+'</div><button class="link" data-more style="color:#8a6224">Ver descripción completa</button>':'')}
document.addEventListener('click',e=>{const o=e.target.closest('[data-open]');if(o){e.preventDefault();openP(o.dataset.open);return}
if(!cur)return;const t=e.target.closest('[data-th],[data-ov],[data-q],[data-addcur],[data-more],[data-tolab]');if(!t||!t.closest('#pm'))return;const {p}=cur;
if(t.dataset.th!=null){cur.img=+t.dataset.th;renderP()}
else if(t.dataset.ov!=null){const k=+t.dataset.ov;cur.sel[k]=t.dataset.val;for(let j=k+1;j<p.o.length;j++){const okj=p.vs.some(v=>v.stock>0&&v.o.every((x,i)=>i>j||x===cur.sel[i]));if(!okj){const alt=p.vs.find(v=>v.stock>0&&v.o.every((x,i)=>i>=j||x===cur.sel[i]));if(alt)cur.sel[j]=alt.o[j]}}const v=variant();if(v)cur.img=v.img;renderP()}
else if(t.dataset.q){cur.qty=Math.max(1,Math.min(10,cur.qty+(+t.dataset.q)));renderP()}
else if(t.dataset.addcur!=null){const v=variant();const eng=cur.eng.map(s=>s.trim()).filter(Boolean);addItem({key:p.id+'|'+cur.sel.join('|')+'|'+eng.join('|'),id:p.id,n:p.n,opts:p.o.length?cur.sel.join(' · '):'',price:v.price,qty:cur.qty,img:im(p.i[v.img]||p.i[0],480),eng});closeOv('pm')}
else if(t.dataset.more!=null){$('#pmDesc').classList.add('open');t.remove()}
else if(t.dataset.tolab!=null){const ci=p.o.indexOf('Color');closeOv('pm');if(window.MKLab)MKLab.load({name:p.n,metal:ci>=0?cur.sel[ci]:'',text:cur.eng.slice()});$('#lab').scrollIntoView({behavior:'smooth'})}});
document.addEventListener('input',e=>{const t=e.target;if(t.dataset&&t.dataset.eng!=null&&cur)cur.eng[+t.dataset.eng]=t.value});
$('#pmMain').addEventListener('mousemove',e=>{const r=e.currentTarget.getBoundingClientRect();const img=$('#pmImg');img.style.transformOrigin=((e.clientX-r.left)/r.width*100)+'% '+((e.clientY-r.top)/r.height*100)+'%';img.style.transform='scale(1.8)'});
$('#pmMain').addEventListener('mouseleave',()=>{$('#pmImg').style.transform=''});

let cart=LS.get('mk_cart',[]);let dlv='tienda',cname='',ccp='';
function saveCart(){LS.set('mk_cart',cart);renderCart()}
function addItem(it){const ex=cart.find(c=>c.key===it.key);if(ex)ex.qty+=it.qty;else cart.push(it);saveCart();$$('[data-count]').forEach(b=>{b.classList.remove('bump');void b.offsetWidth;b.classList.add('bump')});toast('<img src="'+it.img+'" alt=""><span><b>Agregado:</b> '+esc(it.n)+'</span><button data-cart-open>Ver carrito</button>')}
function renderCart(){const n=cart.reduce((a,c)=>a+c.qty,0);$$('[data-count]').forEach(b=>{b.textContent=n;b.classList.toggle('on',n>0)});$('[data-count2]').textContent=n?'('+n+')':'';
if(!cart.length){$('#crItems').innerHTML='<div class="dr-empty"><img src="img/avatar.webp" alt="" style="width:64px;height:64px;border-radius:50%;margin:0 auto"><b>Tu carrito está vacío</b>Encuentra tu próximo accesorio favorito.<br><br><a class="btn btn-dark" href="#tienda" data-close>Ir a la tienda</a></div>';$('#crFoot').innerHTML='';return}
$('#crItems').innerHTML=cart.map((c,i)=>'<div class="ci"><img src="'+c.img+'" alt=""><div><h4>'+esc(c.n)+'</h4>'+(c.opts?'<small>'+esc(c.opts)+'</small>':'')+(c.eng&&c.eng.length?'<small>✍️ '+esc(c.eng.join(' / '))+'</small>':'')+'<div class="q"><button data-cq="'+i+'" data-d="-1" aria-label="Menos">−</button><span>'+c.qty+'</span><button data-cq="'+i+'" data-d="1" aria-label="Más">+</button></div></div><div><div class="pr">'+(c.price?money(c.price*c.qty):'Cotizar')+'</div><button class="rm" data-rm="'+i+'">Quitar</button></div></div>').join('');
const sub=cart.reduce((a,c)=>a+(c.price||0)*c.qty,0);
$('#crFoot').innerHTML='<div class="dlv"><label><input type="radio" name="dlv" value="tienda" '+(dlv==='tienda'?'checked':'')+'><b>Recoger en tienda</b><small>Sin costo · Av. Revolución 503</small></label><label><input type="radio" name="dlv" value="envio" '+(dlv==='envio'?'checked':'')+'><b>Envío a domicilio</b><small>Todo México · costo por confirmar</small></label></div><input id="crName" placeholder="Tu nombre" value="'+esc(cname)+'" autocomplete="name">'+(dlv==='envio'?'<input id="crCp" placeholder="Código postal y ciudad" value="'+esc(ccp)+'">':'')+'<div class="tot"><span>Subtotal</span><b>'+money(sub)+' <small style="font:500 13px var(--fb);color:var(--dmut)">MXN</small></b></div><button class="btn btn-wa" id="crSend">Finalizar pedido por WhatsApp</button><p class="dr-note">Versión final: pago en línea con tarjeta y OXXO, conectado a tu inventario.</p>'}
document.addEventListener('click',e=>{const t=e.target.closest('[data-cq],[data-rm],#crSend,[data-cart-open]');if(!t)return;if(t.dataset.cartOpen!=null){renderCart();openOv('cart');return}if(t.dataset.cq!=null){const c=cart[+t.dataset.cq];c.qty=Math.max(1,Math.min(20,c.qty+(+t.dataset.d)));saveCart()}else if(t.dataset.rm!=null){cart.splice(+t.dataset.rm,1);saveCart()}else if(t.id==='crSend'){if(!cname.trim()){const i=$('#crName');i.focus();i.style.borderColor='#d33';return}const sub=cart.reduce((a,c)=>a+(c.price||0)*c.qty,0);let m='Hola MEKAMONO 🐵, quiero hacer este pedido desde su página:\n\n';cart.forEach((c,i)=>{m+=(i+1)+') '+c.n+(c.opts?' — '+c.opts:'')+' × '+c.qty+' — '+(c.price?money(c.price*c.qty):'por cotizar')+'\n';if(c.eng&&c.eng.length)m+='   ✍️ Grabado: '+c.eng.join(' / ')+'\n'});m+='\nSubtotal: '+money(sub)+' MXN\nEntrega: '+(dlv==='tienda'?'Recoger en tienda (Av. Revolución 503, Local C)':'Envío a domicilio · '+(ccp||'CP por confirmar'))+'\nNombre: '+cname;open(wa(m),'_blank')}});
document.addEventListener('change',e=>{if(e.target.name==='dlv'){dlv=e.target.value;renderCart()}});
document.addEventListener('input',e=>{if(e.target.id==='crName'){cname=e.target.value;e.target.style.borderColor=''}if(e.target.id==='crCp')ccp=e.target.value});
renderCart();
let tT;function toast(h){const t=$('#toast');t.innerHTML=h;t.classList.add('on');clearTimeout(tT);tT=setTimeout(()=>t.classList.remove('on'),3800)}

const srIn=$('#srIn');$$('[data-search]').forEach(b=>b.addEventListener('click',()=>{openOv('srch');srIn.value='';srRender();setTimeout(()=>srIn.focus(),60)}));
$('#srSug').innerHTML='Populares: '+['Personalizado','Esclava','Cadena cubana','Anillo','Mirada','Dorado'].map(s=>'<button data-sug="'+s+'">'+s+'</button>').join('');
function srRender(){const q=norm(srIn.value.trim());const r=q?P.filter(p=>q.split(/\s+/).every(w=>p.k.includes(w))).slice(0,10):P.filter(p=>p.pers).slice(0,6);$('#srRes').innerHTML=r.length?r.map(p=>'<button data-open="'+p.id+'" data-srclose><img src="'+im(p.i[0],480)+'" alt=""><div><b>'+esc(p.n)+'</b><span>'+(p.min!==p.max?'Desde ':'')+money(p.min)+'</span></div></button>').join(''):'<p style="color:var(--mut);padding:10px">Sin resultados para “'+esc(srIn.value)+'”.</p>'}
srIn.addEventListener('input',srRender);srIn.addEventListener('keydown',e=>{if(e.key==='Enter'){F.q=srIn.value;$('#sq').value=srIn.value;upd();closeOv('srch');$('#tienda').scrollIntoView({behavior:'smooth'})}});
document.addEventListener('click',e=>{const s=e.target.closest('[data-sug]');if(s){srIn.value=s.dataset.sug;srRender()}if(e.target.closest('[data-srclose]'))closeOv('srch')},true);

const REV=[['Ame Garc','Hace 9 meses','Excelente calidad en el producto, el grabado perfecto y bien centrado. Atención y precios inmejorables.','#b5873b'],['Moisés Pérez','Hace un año','Gran calidad de accesorios a precios 10/10 además de muy buena atención al cliente recomendable al 100','#2f6f5e'],['Jorge Luis Mondragón Espadas','Hace 7 meses','Me atendieron súper bien. Recomendación y toda la cosa. Sin duda vuelvo por unas joyas 💎💎💎🔥…','#5b4bb7'],['Sus dm','Hace un año','La tienda tiene varios productos con gran variedad de diseño muy bonitos todos, además la atención que te dan es muy amable n.n','#b8456a'],['Osmar Duran','Hace 3 meses','Muy atentos, cordiales y excelente trabajo','#2a5bd7']];
$('#revGrid').innerHTML=REV.map(r=>'<article class="rev" data-rv><span class="stars">★★★★★</span><p>'+esc(r[2])+'</p><footer><span class="av" style="background:'+r[3]+'">'+r[0].charAt(0)+'</span><div><b>'+esc(r[0])+'</b><small>'+r[1]+' · Google</small></div></footer></article>').join('');$$('#revGrid [data-rv]').forEach(e=>io.observe(e));

const agD=$('#agDays'),agT=$('#agTimes');let agSel={i:-1,t:''};const days=[];for(let i=0;i<7;i++){const d=new Date(Date.now()+i*864e5);const x=mx(d);days.push({wd:x.d,day:x.day,mon:x.mon,today:i===0})}
const MON=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
function slots(k){const d=days[k];const [a,b]=HRS[d.wd];const out=[];const now=mx().m;for(let m=a;m<=b-30;m+=30){if(d.today&&m<now+30)continue;out.push(m)}return out}
function agRender(){agD.innerHTML=days.map((d,i)=>'<button class="'+(i===agSel.i?'on':'')+'" data-agd="'+i+'">'+(d.today?'Hoy':DN[d.wd].slice(0,3))+'<b>'+d.day+'</b>'+MON[d.mon-1]+'</button>').join('');if(agSel.i<0){agT.innerHTML='<span style="color:var(--mut);font-size:13.5px">Elige un día para ver horarios.</span>';return}const s=slots(agSel.i);agT.innerHTML=s.length?s.map(m=>'<button class="'+(fmt(m)===agSel.t?'on':'')+'" data-agt="'+fmt(m)+'">'+fmt(m)+'</button>').join(''):'<span style="color:var(--mut);font-size:13.5px">Ya no hay horarios hoy, elige otro día.</span>'}
agD.addEventListener('click',e=>{const b=e.target.closest('[data-agd]');if(b){agSel.i=+b.dataset.agd;agSel.t='';agRender()}});agT.addEventListener('click',e=>{const b=e.target.closest('[data-agt]');if(b){agSel.t=b.dataset.agt;agRender()}});
agSel.i=slots(0).length?0:1;agRender();
$('#agSend').addEventListener('click',()=>{if(agSel.i<0||!agSel.t){toast('<span>Elige un día y una hora 🙂</span>');return}const d=days[agSel.i];const nm=$('#agName').value.trim();open(wa('Hola MEKAMONO 🐵, quiero agendar una visita para grabado:\n• Día: '+DN[d.wd]+' '+d.day+' de '+MON[d.mon-1]+'\n• Hora: '+agSel.t+'\n• Idea: '+$('#agWhat').value+(nm?'\n• Nombre: '+nm:'')),'_blank')});

window.MK={products:P,addItem,money,wa,esc,toast,openCart(){renderCart();openOv('cart')},im};
})();
