(function(){
'use strict';
const $=s=>document.querySelector(s),$$=(s,r)=>[...(r||document).querySelectorAll(s)];
const cv=$('#labCv');if(!cv)return;
const stage=$('#stageBox');
const W=1000,H=640,DPR=Math.min(2,Math.max(1,window.devicePixelRatio||1)),PW=W*DPR,PH=H*DPR;
const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
cv.width=PW;cv.height=PH;const ctx=cv.getContext('2d');
const base=mk(PW,PH),bx=base.getContext('2d'),M=mk(PW,PH),mx=M.getContext('2d'),E=mk(PW,PH),ex=E.getContext('2d'),T=mk(PW,PH),tx=T.getContext('2d');
const MKs=window.MK||{};const P=MKs.products||[];
const money=n=>MKs.money?MKs.money(n):'$'+n;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const noise=mk(256,256);{const n=noise.getContext('2d'),id=n.createImageData(256,256);for(let i=0;i<id.data.length;i+=4){id.data[i]=id.data[i+1]=id.data[i+2]=255;id.data[i+3]=Math.random()<.5?Math.random()*255:0}n.putImageData(id,0,0)}
const brush=mk(512,256);{const b=brush.getContext('2d');for(let i=0;i<1700;i++){const y=Math.random()*256,x=Math.random()*512,l=40+Math.random()*260;b.strokeStyle=Math.random()<.5?'rgba(255,255,255,'+(Math.random()*.11).toFixed(3)+')':'rgba(0,0,0,'+(Math.random()*.11).toFixed(3)+')';b.lineWidth=.5+Math.random()*.8;b.beginPath();b.moveTo(x,y);b.lineTo(x+l,y+(Math.random()-.5)*1.2);b.stroke()}}
const MET={
Dorado:{st:['#7c5a1f','#d9b467','#f7e3a6','#c49543','#a57a31','#f1d48e','#b8893b'],edge:['rgba(255,246,214,.95)','rgba(92,62,16,.85)'],mid:'#c99a45',lt:'#f7e5ae',dk:'#6e4f1a',eng:'rgba(48,33,10,.93)',hi:'rgba(255,242,205,.6)',sh:'rgba(70,46,10,.55)'},
Plateado:{st:['#6f737a','#c9ccd2','#f7f8fa','#a4a8af','#8b8f96','#eceef1','#9a9ea5'],edge:['rgba(255,255,255,.95)','rgba(48,50,56,.85)'],mid:'#aeb2b9',lt:'#fafbfc',dk:'#5f636a',eng:'rgba(26,27,31,.9)',hi:'rgba(255,255,255,.65)',sh:'rgba(30,32,36,.5)'},
Negro:{st:['#0b0b0d','#2b2b30','#4a4a51','#1a1a1e','#121215','#3c3c42','#161619'],edge:['rgba(255,255,255,.42)','rgba(0,0,0,.95)'],mid:'#2a2a2f',lt:'#77777f',dk:'#050506',eng:'rgba(226,228,232,.95)',hi:'rgba(255,255,255,.1)',sh:'rgba(0,0,0,.7)',light:true}};
const PIECES=[
{k:'esclava',n:'Esclava placa',prod:'Esclava Personalizada Texto',sizes:['Delgada','Gruesa'],orient:'h',svg:'<rect x="9" y="16" width="22" height="8" rx="2"/><path d="M9 20H3M31 20h6"/>'},
{k:'placa',n:'Placa militar',prod:'Collar Placa Militar Personalizado',sizes:['Grande','Pequeño','Mini'],orient:'v',svg:'<rect x="12" y="8" width="16" height="25" rx="5"/><circle cx="20" cy="12.5" r="1.6"/><path d="M20 8V3"/>'},
{k:'medalla',n:'Medalla',prod:'Collar Círculo Personalizado',sizes:[],orient:'v',svg:'<circle cx="20" cy="24" r="10"/><path d="M20 14V9"/><ellipse cx="20" cy="7" rx="1.6" ry="2.4"/>'},
{k:'brazalete',n:'Brazalete',prod:'Brazalete Personalizado Texto',sizes:['Delgada','Gruesa'],orient:'h',svg:'<ellipse cx="20" cy="20" rx="15" ry="7.5"/><path d="M8 17.5c3-2 7-3 12-3s9 1 12 3"/>'},
{k:'corazon',n:'Corazón',prod:'Esclava Placa Corazón Imán Dúo',sizes:[],orient:'v',svg:'<path d="M20 32s-11-6.6-11-14a6 6 0 0 1 11-3.3A6 6 0 0 1 31 18c0 7.4-11 14-11 14z"/>'}];
const FONTS=[['script','Caligrafía','Great Vibes',1.3],['clasica','Clásica','Playfair Display',1],['romana','Romana','Cinzel',.9],['moderna','Moderna','Montserrat',.92],['maquina','Máquina','Courier Prime',1],['gotica','Gótica','UnifrakturMaguntia',1.05],['mano','A mano','Dancing Script',1.15]];
const FW={script:'400',clasica:'italic 500',romana:'600',moderna:'600',maquina:'700',gotica:'400',mano:'600'};
const HEART='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
const ICONS={none:{n:'Ninguno',d:''},heart:{n:'Corazón',d:HEART},inf:{n:'Infinito',d:'M6.6 7.6C4 7.6 2.2 9.6 2.2 12s1.8 4.4 4.4 4.4c3.6 0 7.2-8.8 10.8-8.8 2.6 0 4.4 2 4.4 4.4s-1.8 4.4-4.4 4.4c-3.6 0-7.2-8.8-10.8-8.8z',stroke:1},star:{n:'Estrella',d:'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'},paw:{n:'Huellita',d:'M2.6 9.8a2.2 2.6 0 1 0 4.4 0a2.2 2.6 0 1 0-4.4 0zM6.8 5.6a2.2 2.6 0 1 0 4.4 0a2.2 2.6 0 1 0-4.4 0zM12.8 5.6a2.2 2.6 0 1 0 4.4 0a2.2 2.6 0 1 0-4.4 0zM17 9.8a2.2 2.6 0 1 0 4.4 0a2.2 2.6 0 1 0-4.4 0zM12 11.6c-3.3 0-6.6 4.6-6.6 7.2 0 1.8 1.4 2.9 3 2.9 1.4 0 2.3-.7 3.6-.7s2.2.7 3.6.7c1.6 0 3-1.1 3-2.9 0-2.6-3.3-7.2-6.6-7.2z'},moon:{n:'Luna',d:'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z'},cross:{n:'Cruz',d:'M10.4 2h3.2v6h5.4v3.2h-5.4V22h-3.2V11.2H5V8h5.4z'},crown:{n:'Corona',d:'M3 18h18v2.2H3zM3 7l4.6 4L12 4l4.4 7L21 7l-1.8 9.4H4.8z'}};
Object.values(ICONS).forEach(i=>{if(i.d)i.p=new Path2D(i.d)});
const blank=o=>Object.assign({l1:'',l2:'',font:'script',fsz:100,fsp:1,icon:'none',photo:null,pid:0,ph:{st:'trama',z:100,b:0,c:125,inv:false,x:0,y:0}},o||{});
const S={piece:'esclava',size:'Delgada',metal:'Dorado',side:'front',sides:{front:blank({l1:'Ana & Leo',icon:'heart'}),back:blank({l1:'29.12.25',font:'clasica'})}};
const side=()=>S.sides[S.side],piece=()=>PIECES.find(p=>p.k===S.piece);
function rrp(x,y,w,h,r){const p=new Path2D();r=Math.min(r,w/2,h/2);p.moveTo(x+r,y);p.arcTo(x+w,y,x+w,y+h,r);p.arcTo(x+w,y+h,x,y+h,r);p.arcTo(x,y+h,x,y,r);p.arcTo(x,y,x+w,y,r);p.closePath();return p}
function geo(){const k=S.piece,sz=S.size,cx=W/2,cy=H/2,pc=piece();let g;
if(k==='esclava'){const h=sz==='Gruesa'?150:120,w=620,x=cx-w/2,y=cy-h/2;g={type:'rect',x,y,w,h,r:h*.2,chain:'curb',safe:{x:x+34,y:y+15,w:w-68,h:h-30},bb:{x,y,w,h}}}
else if(k==='brazalete'){const h=sz==='Gruesa'?104:80,w=720,x=cx-w/2,y=cy-h/2;g={type:'rect',x,y,w,h,r:h/2,cyl:1,safe:{x:x+h*.6,y:y+11,w:w-h*1.2,h:h-22},bb:{x,y,w,h}}}
else if(k==='placa'){const s={Grande:1,'Pequeño':.86,Mini:.72}[sz]||1,w=300*s,h=440*s,x=cx-w/2,y=cy-h/2+34;const hole={x:cx,y:y+36*s,r:12*s};g={type:'rect',x,y,w,h,r:64*s,hole,chain:'ball',att:{x:cx,y:hole.y-42*s},ring:{x:cx,y:hole.y-16*s,rx:15*s,ry:27*s},safe:{x:x+30*s,y:y+70*s,w:w-60*s,h:h-100*s},bb:{x,y,w,h}}}
else if(k==='medalla'){const r=190,y=cy+34;g={type:'circle',cx,cy:y,r,chain:'ball',att:{x:cx,y:y-r-34},bail:{x:cx,y:y-r-12,rx:11,ry:21},safe:{x:cx-r*.72,y:y-r*.6,w:r*1.44,h:r*1.2},bb:{x:cx-r,y:y-r,w:2*r,h:2*r}}}
else{const w=440,sc=w/20,y=cy+16,top=y-7.1*sc;g={type:'heart',cx,cy:y,w,sc,chain:'ball',att:{x:cx,y:top-34},bail:{x:cx,y:top-12,rx:11,ry:21},safe:{x:cx-140,y:y-125,w:280,h:180},bb:{x:cx-w/2,y:y-9.2*sc,w,h:18.4*sc}}}
g.orient=pc.orient;return g}
function shape(g){if(g.type==='rect')return rrp(g.x,g.y,g.w,g.h,g.r);const p=new Path2D();if(g.type==='circle'){p.arc(g.cx,g.cy,g.r,0,Math.PI*2);return p}p.addPath(new Path2D(HEART),new DOMMatrix([g.sc,0,0,g.sc,g.cx-12*g.sc,g.cy-12.2*g.sc]));return p}
function metalGrad(c,g,m){const b=g.bb;const lg=c.createLinearGradient(b.x-b.w*.1,b.y-b.h*.35,b.x+b.w*.9,b.y+b.h*1.35);m.st.forEach((s,i)=>lg.addColorStop(i/(m.st.length-1),s));return lg}
function ball(c,x,y,r,m){const g=c.createRadialGradient(x-r*.35,y-r*.4,r*.1,x,y,r);g.addColorStop(0,m.lt);g.addColorStop(.5,m.mid);g.addColorStop(1,m.dk);c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}
function qpt(a,b,ctl,t){const u=1-t;return {x:u*u*a.x+2*u*t*ctl.x+t*t*b.x,y:u*u*a.y+2*u*t*ctl.y+t*t*b.y}}
function ballChain(c,a,b,ctl,m){const len=Math.hypot(b.x-a.x,b.y-a.y)*1.05,n=Math.ceil(len/11);for(let i=0;i<=n;i++){const p=qpt(a,b,ctl,i/n);ball(c,p.x,p.y,4.4,m)}}
function curb(c,a,b,ctl,m){const len=Math.hypot(b.x-a.x,b.y-a.y)*1.1,n=Math.ceil(len/19);for(let i=0;i<=n;i++){const t=i/n,p=qpt(a,b,ctl,t),q=qpt(a,b,ctl,Math.min(1,t+.01));const ang=Math.atan2(q.y-p.y,q.x-p.x)+(i%2?.42:-.42);c.save();c.translate(p.x,p.y);c.rotate(ang);c.lineWidth=5.5;c.strokeStyle=m.dk;c.beginPath();c.ellipse(0,1,14,8.5,0,0,Math.PI*2);c.stroke();c.strokeStyle=m.mid;c.lineWidth=4.5;c.beginPath();c.ellipse(0,0,14,8.5,0,0,Math.PI*2);c.stroke();c.strokeStyle=m.lt;c.lineWidth=1.6;c.beginPath();c.ellipse(0,-1,13,7.5,0,Math.PI*1.05,Math.PI*1.9);c.stroke();c.restore()}}
function ring(c,x,y,rx,ry,m,lw){c.lineWidth=(lw||6)+1.5;c.strokeStyle=m.dk;c.beginPath();c.ellipse(x,y+1,rx,ry,0,0,Math.PI*2);c.stroke();c.lineWidth=lw||6;c.strokeStyle=m.mid;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.stroke();c.lineWidth=1.8;c.strokeStyle=m.lt;c.beginPath();c.ellipse(x-1,y-1,rx,ry,0,Math.PI*.95,Math.PI*1.75);c.stroke()}
let G=null,GP=null;
function drawBase(){const g=G=geo(),path=GP=shape(g),m=MET[S.metal],c=bx;c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,PW,PH);c.setTransform(DPR,0,0,DPR,0,0);
const bg=c.createRadialGradient(W/2,H*.4,30,W/2,H*.5,720);bg.addColorStop(0,'#3a362f');bg.addColorStop(.42,'#1b1a18');bg.addColorStop(1,'#09090a');c.fillStyle=bg;c.fillRect(0,0,W,H);c.globalAlpha=.06;c.fillStyle=c.createPattern(noise,'repeat');c.fillRect(0,0,W,H);c.globalAlpha=1;
const fl=c.createRadialGradient(W/2,g.bb.y+g.bb.h+40,10,W/2,g.bb.y+g.bb.h+40,g.bb.w*.6);fl.addColorStop(0,'rgba(0,0,0,.45)');fl.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=fl;c.fillRect(0,0,W,H);
if(g.chain==='ball'){const a=g.att;ballChain(c,a,{x:a.x-190,y:-14},{x:a.x-50,y:a.y-140},m);ballChain(c,a,{x:a.x+190,y:-14},{x:a.x+50,y:a.y-140},m)}
if(g.chain==='curb'){const cy=g.y+g.h/2;curb(c,{x:g.x-16,y:cy},{x:-40,y:cy+70},{x:g.x-170,y:cy+14},m);curb(c,{x:g.x+g.w+16,y:cy},{x:W+40,y:cy+70},{x:g.x+g.w+170,y:cy+14},m)}
if(g.bail)ring(c,g.bail.x,g.bail.y,g.bail.rx,g.bail.ry,m,7);
c.save();c.shadowColor='rgba(0,0,0,.7)';c.shadowBlur=60;c.shadowOffsetY=30;c.fillStyle=metalGrad(c,g,m);c.fill(path);c.restore();
c.save();c.clip(path);c.globalCompositeOperation='overlay';c.fillStyle=c.createPattern(brush,'repeat');c.fillRect(0,0,W,H);c.globalCompositeOperation='source-over';
const b=g.bb;if(g.type==='rect'){const k=g.cyl?1:.45;const vg=c.createLinearGradient(0,b.y,0,b.y+b.h);vg.addColorStop(0,'rgba(255,255,255,'+(.4*k)+')');vg.addColorStop(.22,'rgba(255,255,255,0)');vg.addColorStop(.6,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,'+(.55*k)+')');c.fillStyle=vg;c.fillRect(b.x,b.y,b.w,b.h)}else{const rg=c.createRadialGradient(b.x+b.w*.36,b.y+b.h*.3,4,b.x+b.w*.5,b.y+b.h*.5,b.w*.62);rg.addColorStop(0,'rgba(255,255,255,.28)');rg.addColorStop(.5,'rgba(255,255,255,0)');rg.addColorStop(1,'rgba(0,0,0,.35)');c.fillStyle=rg;c.fillRect(b.x,b.y,b.w,b.h)}
const eg=c.createLinearGradient(b.x,b.y,b.x+b.w*.7,b.y+b.h);eg.addColorStop(0,m.edge[0]);eg.addColorStop(1,m.edge[1]);c.lineWidth=10;c.strokeStyle=eg;c.stroke(path);c.lineWidth=2;c.strokeStyle='rgba(255,255,255,.14)';c.stroke(path);c.restore();
c.lineWidth=1.2;c.strokeStyle='rgba(0,0,0,.55)';c.stroke(path);
if(g.hole){const h=g.hole;const hg=c.createRadialGradient(h.x,h.y-3,1,h.x,h.y,h.r);hg.addColorStop(0,'#0c0c0d');hg.addColorStop(1,'#25221e');c.fillStyle=hg;c.beginPath();c.arc(h.x,h.y,h.r,0,Math.PI*2);c.fill();c.lineWidth=2;c.strokeStyle=m.dk;c.stroke();ring(c,g.ring.x,g.ring.y,g.ring.rx,g.ring.ry,m,6)}
if(g.chain==='curb'){const cy=g.y+g.h/2;ring(c,g.x-6,cy,12,12,m,5);ring(c,g.x+g.w+6,cy,12,12,m,5)}}
let phCache={k:'',c:null};
function procPhoto(s,R){const o=s.ph,Q=1.35,pw=Math.max(2,Math.round(R.w*Q)),phh=Math.max(2,Math.round(R.h*Q)),light=!!MET[S.metal].light;const key=[s.pid,pw,phh,o.st,o.z,o.b,o.c,o.inv,o.x,o.y,light].join('|');if(phCache.k===key)return phCache.c;
const c=mk(pw,phh),x=c.getContext('2d',{willReadFrequently:true});const img=s.photo,iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;const sc=Math.max(pw/iw,phh/ih)*o.z/100,dw=iw*sc,dh=ih*sc;x.fillStyle='#fff';x.fillRect(0,0,pw,phh);x.drawImage(img,(pw-dw)/2+o.x*Q,(phh-dh)/2+o.y*Q,dw,dh);
const id=x.getImageData(0,0,pw,phh),d=id.data,n=pw*phh,v=new Float32Array(n),C=o.c/100,B=o.b;const hist=new Uint32Array(256);for(let i=0;i<n;i++)hist[(.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2])|0]++;let lo=0,hi=255,acc=0;for(let k=0;k<256;k++){acc+=hist[k];if(acc>n*.02){lo=k;break}}acc=0;for(let k=255;k>=0;k--){acc+=hist[k];if(acc>n*.02){hi=k;break}}const span=Math.max(24,hi-lo);
for(let i=0;i<n;i++){let L=.299*d[i*4]+.587*d[i*4+1]+.114*d[i*4+2];L=(L-lo)*255/span;L=(L-128)*C+128+B;L=L<0?0:L>255?255:L;let e=light?L/255:1-L/255;if(o.inv)e=1-e;v[i]=e}
if(o.st==='trama'){for(let y=0;y<phh;y++)for(let xx=0;xx<pw;xx++){const i=y*pw+xx,old=v[i],nw=old>.5?1:0,er=old-nw;v[i]=nw;if(xx+1<pw)v[i+1]+=er*.4375;if(y+1<phh){if(xx>0)v[i+pw-1]+=er*.1875;v[i+pw]+=er*.3125;if(xx+1<pw)v[i+pw+1]+=er*.0625}}}
else if(o.st==='silueta'){for(let i=0;i<n;i++)v[i]=v[i]>.5?1:0}else{for(let i=0;i<n;i++)v[i]=Math.pow(v[i],1.12)}
for(let i=0;i<n;i++){d[i*4]=d[i*4+1]=d[i*4+2]=255;d[i*4+3]=Math.max(0,Math.min(1,v[i]))*255}x.putImageData(id,0,0);phCache={k:key,c};return c}
function layout(s,g){const R=g.safe,hasPh=!!s.photo,hasTx=!!((s.l1||'').trim()||(s.l2||'').trim()||s.icon!=='none');
if(hasPh&&hasTx){if(g.orient==='h'){const pw=Math.min(R.w*.52,R.h*2.5);return {ph:{x:R.x,y:R.y,w:pw,h:R.h},tx:{x:R.x+pw+14,y:R.y,w:R.w-pw-14,h:R.h}}}const ph=R.h*.64;return {ph:{x:R.x,y:R.y,w:R.w,h:ph},tx:{x:R.x,y:R.y+ph+6,w:R.w,h:R.h-ph-6}}}
if(hasPh)return {ph:Object.assign({},R)};return {tx:Object.assign({},R)}}
function drawIcon(k,cx,cy,s){const ic=ICONS[k];if(!ic||!ic.p)return;mx.save();mx.translate(cx-s/2,cy-s/2);mx.scale(s/24,s/24);if(ic.stroke){mx.lineWidth=2.4;mx.lineCap='round';mx.lineJoin='round';mx.stroke(ic.p)}else mx.fill(ic.p);mx.restore()}
function drawText(s,R,orient){const F=FONTS.find(f=>f[0]===s.font)||FONTS[0];const lines=[s.l1,s.l2].map(t=>(t||'').trim()).filter(Boolean);const hasIc=s.icon!=='none';if(!lines.length&&!hasIc)return;const u=s.fsz/100;
if(!lines.length){drawIcon(s.icon,R.x+R.w/2,R.y+R.h/2,Math.min(R.w,R.h)*.8*u);return}
const two=lines.length===2,ratio=.6,canLS='letterSpacing' in mx;const fstr=z=>FW[F[0]]+' '+z.toFixed(1)+'px "'+F[2]+'"';const setSp=z=>{if(canLS)mx.letterSpacing=(s.fsp*z/60).toFixed(2)+'px'};const wOf=(t,z)=>{mx.font=fstr(z);setSp(z);return mx.measureText(t).width};
let icS=0,gap=0,avW=R.w,avH=R.h;if(hasIc){if(orient==='h'){icS=Math.min(R.h*.66,R.w*.2);gap=icS*.28;avW=R.w-icS-gap}else{icS=Math.min(R.w*.3,R.h*.32);gap=icS*.16;avH=R.h-icS-gap}}
let fs=(two?avH/(1+ratio+.22):avH*.8)*F[3]*u;const tw0=()=>Math.max(wOf(lines[0],fs),two?wOf(lines[1],fs*ratio):0);let tw=tw0();if(tw>avW){fs*=avW/tw;tw=tw0()}
const h1=fs/F[3],h2=two?fs*ratio/F[3]:0,gp=two?fs*.22/F[3]:0,th=h1+h2+gp;let cx=R.x+R.w/2,cy=R.y+R.h/2;
if(hasIc&&orient==='h'){const gw=icS+gap+tw,sx=R.x+(R.w-gw)/2;drawIcon(s.icon,sx+icS/2,cy,icS);cx=sx+icS+gap+tw/2}else if(hasIc){const gh=icS+gap+th,sy=R.y+(R.h-gh)/2;drawIcon(s.icon,cx,sy+icS/2,icS);cy=sy+icS+gap+th/2}
mx.textAlign='center';mx.textBaseline='middle';const top=cy-th/2;mx.font=fstr(fs);setSp(fs);mx.fillText(lines[0],cx,top+h1/2);if(two){mx.font=fstr(fs*ratio);setSp(fs*ratio);mx.fillText(lines[1],cx,top+h1+gp+h2/2)}if(canLS)mx.letterSpacing='0px'}
let LAY={};
function tintTo(col,dx,dy,a){tx.setTransform(1,0,0,1,0,0);tx.globalCompositeOperation='source-over';tx.clearRect(0,0,PW,PH);tx.drawImage(M,0,0);tx.globalCompositeOperation='source-in';tx.fillStyle=col;tx.fillRect(0,0,PW,PH);tx.globalCompositeOperation='source-over';ex.globalAlpha=a;ex.drawImage(T,dx,dy);ex.globalAlpha=1}
function buildEng(){const g=G||geo(),s=side(),m=MET[S.metal];mx.setTransform(1,0,0,1,0,0);mx.clearRect(0,0,PW,PH);mx.setTransform(DPR,0,0,DPR,0,0);mx.fillStyle='#fff';mx.strokeStyle='#fff';
const L=LAY=layout(s,g);if(L.ph&&s.photo){const pc=procPhoto(s,L.ph);mx.save();if(g.type==='circle'&&!L.tx){const p=new Path2D();p.arc(g.cx,g.cy,g.r*.8,0,Math.PI*2);mx.clip(p)}else mx.clip(rrp(L.ph.x,L.ph.y,L.ph.w,L.ph.h,12));mx.imageSmoothingEnabled=s.ph.st!=='trama';mx.drawImage(pc,L.ph.x,L.ph.y,L.ph.w,L.ph.h);mx.imageSmoothingEnabled=true;mx.restore()}
if(L.tx)drawText(s,L.tx,g.orient);
ex.setTransform(1,0,0,1,0,0);ex.globalCompositeOperation='source-over';ex.clearRect(0,0,PW,PH);tintTo(m.hi,0,1.3*DPR,.6);tintTo(m.sh,0,-.8*DPR,.4);tintTo(m.eng,0,0,1);
ex.globalCompositeOperation='destination-out';ex.globalAlpha=.07;ex.fillStyle=ex.createPattern(noise,'repeat');ex.fillRect(0,0,PW,PH);ex.globalAlpha=1;ex.globalCompositeOperation='destination-in';ex.setTransform(DPR,0,0,DPR,0,0);ex.fill(GP||shape(g));ex.setTransform(1,0,0,1,0,0);ex.globalCompositeOperation='source-over'}
let dB=true,dE=true,vis=true,hover=false,sheen=.3,sheenT=.3,burn=null,sparks=[],flipping=false;
function frame(now){requestAnimationFrame(frame);if(!vis&&!burn)return;if(dB){drawBase();dB=false;dE=true}if(dE){buildEng();dE=false}
if(!hover)sheenT=.5+Math.sin(now/2400)*.5;sheen+=(sheenT-sheen)*.08;const g=G;
ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.drawImage(base,0,0);
if(burn){const p=Math.min(1,(now-burn.t0)/burn.dur),b=burn.bb,pp=p*burn.n,row=Math.min(burn.n-1,Math.floor(pp)),fr=p>=1?1:pp-row,rh=b.h/burn.n,y=b.y+row*rh,dir=row%2?-1:1,x=dir>0?b.x+fr*b.w:b.x+b.w-fr*b.w;
ctx.save();ctx.beginPath();ctx.rect(0,0,PW,y*DPR);if(dir>0)ctx.rect(b.x*DPR,y*DPR,(x-b.x)*DPR,rh*DPR);else ctx.rect(x*DPR,y*DPR,(b.x+b.w-x)*DPR,rh*DPR);ctx.clip();ctx.drawImage(E,0,0);ctx.restore();
ctx.setTransform(DPR,0,0,DPR,0,0);const ly=y+rh/2;const bm=ctx.createLinearGradient(x,0,x,ly);bm.addColorStop(0,'rgba(217,255,63,0)');bm.addColorStop(1,'rgba(235,255,160,.6)');ctx.strokeStyle=bm;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,ly);ctx.stroke();
const gl=ctx.createRadialGradient(x,ly,0,x,ly,30);gl.addColorStop(0,'rgba(255,255,255,1)');gl.addColorStop(.22,'rgba(225,255,110,.9)');gl.addColorStop(1,'rgba(217,255,63,0)');ctx.fillStyle=gl;ctx.beginPath();ctx.arc(x,ly,30,0,Math.PI*2);ctx.fill();
for(let i=0;i<3;i++)sparks.push({x,y:ly,vx:(Math.random()-.5)*6,vy:-Math.random()*4-1,l:1});stage.style.setProperty('--lx',(x/W*100)+'%');stage.style.setProperty('--ly',(ly/H*100)+'%');
if(p>=1){burn=null;stage.classList.remove('burning')}}else ctx.drawImage(E,0,0);
ctx.setTransform(DPR,0,0,DPR,0,0);
if(g&&GP){const b=g.bb;ctx.save();ctx.clip(GP);const sx=b.x-b.w*.35+sheen*b.w*1.7;const sg=ctx.createLinearGradient(sx-120,b.y,sx+120,b.y+b.h*.5);sg.addColorStop(0,'rgba(255,255,255,0)');sg.addColorStop(.5,'rgba(255,255,255,'+(S.metal==='Negro'?.13:.3)+')');sg.addColorStop(1,'rgba(255,255,255,0)');ctx.globalCompositeOperation='screen';ctx.fillStyle=sg;ctx.fillRect(b.x,b.y,b.w,b.h);ctx.restore()}
if(sparks.length){sparks=sparks.filter(s=>(s.l-=.04)>0);sparks.forEach(s=>{s.x+=s.vx;s.y+=s.vy;s.vy+=.28;ctx.strokeStyle='rgba(255,'+(190+Math.random()*65|0)+',110,'+s.l.toFixed(2)+')';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(s.x,s.y);ctx.lineTo(s.x-s.vx*2.2,s.y-s.vy*2.2);ctx.stroke()})}}
requestAnimationFrame(frame);
new IntersectionObserver(es=>{vis=es[0].isIntersecting},{rootMargin:'100px'}).observe(stage);

const ui={pieces:$('#labPieces'),size:$('#labSize'),fonts:$('#labFonts'),icons:$('#labIcons')};
ui.pieces.innerHTML=PIECES.map(p=>'<button data-pc="'+p.k+'"><svg viewBox="0 0 40 40" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">'+p.svg+'</svg>'+p.n+'</button>').join('');
ui.fonts.innerHTML=FONTS.map(f=>'<button data-ft="'+f[0]+'"><b style="font-family:\''+f[2]+'\';font-style:'+(f[0]==='clasica'?'italic':'normal')+'">Aa</b><small>'+f[1]+'</small></button>').join('');
ui.icons.innerHTML=Object.entries(ICONS).map(([k,i])=>'<button data-ic="'+k+'">'+(i.d?'<svg viewBox="0 0 24 24" '+(i.stroke?'fill="none" stroke="currentColor" stroke-width="2.2"':'')+'><path d="'+i.d+'"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="8"/><path d="M6.5 17.5l11-11"/></svg>')+i.n+'</button>').join('');
function roman(n){const t=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let s='';for(const [a,r] of t)while(n>=a){s+=r;n-=a}return s}
const MES=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
function dfm(){const v=$('#dIn').value;if(!v)return [];const [y,m,d]=v.split('-').map(Number),p2=x=>String(x).padStart(2,'0');return [[p2(d)+'.'+p2(m)+'.'+String(y).slice(2),'Con puntos'],[p2(d)+' · '+p2(m)+' · '+y,'Completa'],[roman(d)+' · '+roman(m)+' · '+roman(y),'Números romanos'],[roman(d)+'.'+roman(m)+'.'+roman(y%100),'Romanos corto'],[d+' de '+MES[m-1]+' de '+y,'Con letra'],[p2(d)+'/'+p2(m)+'/'+y,'Diagonal']]}
function renderDates(){$('#dFmts').innerHTML=dfm().map(f=>'<button data-df="'+esc(f[0])+'">'+esc(f[0])+'<small>'+f[1]+'</small></button>').join('')}
function priceInfo(){const pc=piece(),p=P.find(x=>x.n===pc.prod);if(!p)return {price:null,name:pc.prod};let vs=p.vs;const ci=p.o.indexOf('Color');if(ci>=0){const f=vs.filter(v=>v.o[ci]===S.metal);if(f.length)vs=f}if(S.size){const f=vs.filter(v=>v.o.includes(S.size));if(f.length)vs=f}const v=vs.find(v=>v.stock>0)||vs[0];return {price:v?v.price:p.min,name:p.n,p}}
function sideDesc(s){const a=[],t=[s.l1,s.l2].map(x=>(x||'').trim()).filter(Boolean);if(t.length)a.push('“'+t.join(' / ')+'” · letra '+(FONTS.find(f=>f[0]===s.font)||FONTS[0])[1]);if(s.icon!=='none')a.push('ícono '+ICONS[s.icon].n.toLowerCase());if(s.photo)a.push('foto ('+{trama:'tramado',suave:'suave',silueta:'silueta'}[s.ph.st]+')');return a.join(' · ')||'sin grabado'}
function updSum(){const pc=piece(),pi=priceInfo();$('#labPrice').textContent=pi.price?money(pi.price):'Cotizar';$('#labPname').textContent=pi.name+(S.size?' · '+S.size:'');$('#labSpec').innerHTML='<b>'+pc.n+(S.size?' ('+S.size+')':'')+' · '+S.metal+'</b><br>Frente: '+esc(sideDesc(S.sides.front))+'<br>Reverso: '+esc(sideDesc(S.sides.back))}
function sync(){const s=side(),pc=piece();$$('#labPieces button').forEach(b=>b.classList.toggle('on',b.dataset.pc===S.piece));ui.size.innerHTML=pc.sizes.map(z=>'<button class="chip '+(z===S.size?'on':'')+'" data-sz="'+z+'">'+z+'</button>').join('');$$('#labMetal button').forEach(b=>b.classList.toggle('on',b.dataset.metal===S.metal));$('#l1').value=s.l1;$('#l2').value=s.l2;$$('#labFonts button').forEach(b=>b.classList.toggle('on',b.dataset.ft===s.font));$$('#labIcons button').forEach(b=>b.classList.toggle('on',b.dataset.ic===s.icon));$('#fsz').value=s.fsz;$('#fsp').value=s.fsp;$('#sideLbl').textContent='· '+(S.side==='front'?'Frente':'Reverso');$$('#sideSeg button').forEach(b=>b.classList.toggle('on',b.dataset.side===S.side));const has=!!s.photo;$('#phCtrl').hidden=!has;$('#phSample').hidden=has;if(has){$$('#phStyle button').forEach(b=>b.classList.toggle('on',b.dataset.st===s.ph.st));$('#phZ').value=s.ph.z;$('#phB').value=s.ph.b;$('#phC').value=s.ph.c}$('#stageHint').textContent=has?'Arrastra la foto sobre la pieza para acomodarla':'Mueve el cursor sobre la pieza para ver el brillo';updSum()}
const redo=()=>{dE=true;updSum()};
function setTab(t){$$('#labTabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===t));$$('.lab .tab').forEach(p=>p.classList.toggle('on',p.dataset.pane===t))}
function setPiece(k){const pc=PIECES.find(p=>p.k===k);if(!pc)return;S.piece=k;if(!pc.sizes.includes(S.size))S.size=pc.sizes[0]||'';dB=true;sync()}
function flipTo(sd){if(sd===S.side||flipping)return;flipping=true;cv.style.transition='transform .2s ease-in';cv.style.transform='rotateY(90deg)';setTimeout(()=>{S.side=sd;dE=true;sync();cv.style.transition='transform .45s cubic-bezier(.2,.7,.2,1)';cv.style.transform='rotateY(0deg)';setTimeout(()=>{flipping=false;cv.style.transform=''},460)},210)}
document.querySelector('.lab-app').addEventListener('click',e=>{const t=e.target.closest('button');if(!t)return;const d=t.dataset;
if(d.pc)setPiece(d.pc);else if(d.sz){S.size=d.sz;dB=true;sync()}else if(d.metal){S.metal=d.metal;dB=true;sync()}else if(d.side)flipTo(d.side);else if(d.tab)setTab(d.tab);
else if(d.ft){side().font=d.ft;sync();redo()}else if(d.ic){side().icon=d.ic;sync();redo()}
else if(d.df){const s=side();if($('#dL2').checked)s.l2=d.df;else s.l1=d.df;sync();redo()}
else if(d.st){side().ph.st=d.st;sync();redo()}
else if(d.idea)idea(d.idea)});
$('#l1').addEventListener('input',e=>{side().l1=e.target.value;redo()});$('#l2').addEventListener('input',e=>{side().l2=e.target.value;redo()});
$('#fsz').addEventListener('input',e=>{side().fsz=+e.target.value;dE=true});$('#fsp').addEventListener('input',e=>{side().fsp=+e.target.value;dE=true});
$('#dIn').addEventListener('input',renderDates);renderDates();
['phZ','phB','phC'].forEach(id=>$('#'+id).addEventListener('input',e=>{const k={phZ:'z',phB:'b',phC:'c'}[id];side().ph[k]=+e.target.value;dE=true}));
$('#phInv').addEventListener('click',()=>{side().ph.inv=!side().ph.inv;redo()});$('#phDel').addEventListener('click',()=>{side().photo=null;sync();redo()});
let pid=0;function setPhoto(src,revoke){const img=new Image();img.onload=()=>{const s=side();s.photo=img;s.pid=++pid;Object.assign(s.ph,{z:100,b:0,c:125,x:0,y:0,inv:false});sync();redo();if(revoke)URL.revokeObjectURL(src)};img.src=src}
$('#phIn').addEventListener('change',e=>{const f=e.target.files[0];if(f)setPhoto(URL.createObjectURL(f),true);e.target.value=''});
$('#phSample').addEventListener('click',()=>{setPhoto('img/avatar.webp');setTimeout(()=>{side().ph.st='silueta';sync();redo()},300)});
const drop=$('#drop');['dragenter','dragover'].forEach(v=>drop.addEventListener(v,()=>drop.classList.add('ov')));['dragleave','drop'].forEach(v=>drop.addEventListener(v,()=>drop.classList.remove('ov')));
function idea(k){const f=S.sides.front,b=S.sides.back;
if(k==='pareja'){Object.assign(f,{l1:'Ana & Leo',l2:'',font:'script',icon:'heart',fsz:100});Object.assign(b,{l1:'29.12.25',l2:'',font:'clasica',icon:'none'})}
if(k==='romanos'){Object.assign(side(),{l1:'XXIX · XII · MMXXV',l2:'',font:'romana',icon:'none',fsz:100})}
if(k==='coord'){Object.assign(side(),{l1:'20.1195° N',l2:'98.7377° O',font:'maquina',icon:'none',fsz:100})}
if(k==='mascota'){setPiece('medalla');Object.assign(f,{l1:'Rocky',l2:'Si me pierdo, llama a casa',font:'moderna',icon:'paw',fsz:100})}
if(k==='medica'){setPiece('placa');Object.assign(f,{l1:'ALERGIA',l2:'PENICILINA',font:'moderna',icon:'cross',fsz:100})}
sync();redo()}
stage.addEventListener('pointermove',e=>{const r=stage.getBoundingClientRect(),px=(e.clientX-r.left)/r.width,py=(e.clientY-r.top)/r.height;hover=true;sheenT=px;if(drag){const s=side(),k=W/r.width;s.ph.x=drag.ox+(e.clientX-drag.x)*k;s.ph.y=drag.oy+(e.clientY-drag.y)*k;dE=true;return}if(!flipping&&e.pointerType==='mouse'){cv.style.transition='transform .25s';cv.style.transform='rotateY('+((px-.5)*7).toFixed(2)+'deg) rotateX('+(-(py-.5)*5).toFixed(2)+'deg)'}});
stage.addEventListener('pointerleave',()=>{hover=false;if(!flipping){cv.style.transition='transform .6s';cv.style.transform=''}});
let drag=null;stage.addEventListener('pointerdown',e=>{const s=side();if(!s.photo||!LAY.ph)return;const r=stage.getBoundingClientRect(),k=W/r.width,lx=(e.clientX-r.left)*k,ly=(e.clientY-r.top)*k,R=LAY.ph;if(lx<R.x||lx>R.x+R.w||ly<R.y||ly>R.y+R.h)return;drag={x:e.clientX,y:e.clientY,ox:s.ph.x,oy:s.ph.y};stage.setPointerCapture(e.pointerId);cv.style.cursor='grabbing'});
const endDrag=()=>{if(drag){drag=null;cv.style.cursor='';updSum()}};stage.addEventListener('pointerup',endDrag);stage.addEventListener('pointercancel',endDrag);
$('#labBurn').addEventListener('click',()=>{if(dB){drawBase();dB=false}buildEng();dE=false;const R=G.safe;burn={t0:performance.now(),dur:2900,n:18,bb:{x:R.x-6,y:R.y-6,w:R.w+12,h:R.h+12}};sparks=[];stage.classList.add('burning');if(stage.getBoundingClientRect().top<0)stage.scrollIntoView({behavior:'smooth',block:'center'})});
function snap(){const c=mk(PW,PH),x=c.getContext('2d');x.drawImage(base,0,0);x.drawImage(E,0,0);x.setTransform(DPR,0,0,DPR,0,0);x.font='600 14px Inter, sans-serif';x.fillStyle='rgba(255,255,255,.55)';x.textAlign='right';x.fillText('MEKAMONO · diseño de referencia',W-22,H-20);return c}
$('#labDl').addEventListener('click',()=>{snap().toBlob(b=>{const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='mekamono-diseno-'+(S.side==='front'?'frente':'reverso')+'.png';document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800)},'image/png')});
$('#labCart').addEventListener('click',()=>{const pc=piece(),pi=priceInfo(),c=snap(),t=mk(240,154);t.getContext('2d').drawImage(c,0,0,240,154);if(MKs.addItem)MKs.addItem({key:'lab-'+Date.now(),id:pi.p?pi.p.id:null,n:'Diseño Lab · '+pc.n,opts:S.metal+(S.size?' · '+S.size:''),price:pi.price||0,qty:1,img:t.toDataURL('image/jpeg',.78),eng:['Frente: '+sideDesc(S.sides.front),'Reverso: '+sideDesc(S.sides.back)]})});
$('#labWa').addEventListener('click',()=>{const pc=piece(),pi=priceInfo();const m='Hola MEKAMONO 🐵, diseñé esta pieza en su simulador:\n• Pieza: '+pc.n+(S.size?' ('+S.size+')':'')+' · '+S.metal+'\n• Frente: '+sideDesc(S.sides.front)+'\n• Reverso: '+sideDesc(S.sides.back)+'\n• Precio de referencia: '+(pi.price?money(pi.price):'por cotizar')+'\nLes comparto la imagen del diseño. ¿Me ayudan a confirmarlo?';if(MKs.sendOrder)MKs.sendOrder({origen:'lab',items:[{key:'lab-'+Date.now(),id:null,n:'Diseño Lab · '+pc.n,opts:S.metal+(S.size?' · '+S.size:''),price:pi.price||0,qty:1,eng:['Frente: '+sideDesc(S.sides.front),'Reverso: '+sideDesc(S.sides.back)]}],notas:'Cotización desde el simulador'});open((MKs.wa?MKs.wa(m):'https://wa.me/525659206025?text='+encodeURIComponent(m)),'_blank')});
window.MKLab={load(o){const n=o.name||'';let k='esclava';if(/brazalete/i.test(n))k='brazalete';else if(/militar|rectangular|alerta|mirada/i.test(n)&&!/esclava/i.test(n))k='placa';else if(/c[ií]rculo|medalla|redond/i.test(n))k='medalla';else if(/coraz/i.test(n))k='corazon';setPiece(k);const mt=['Dorado','Plateado','Negro'].find(x=>(o.metal||'').includes(x));if(mt){S.metal=mt;dB=true}const t=o.text||[];if(t[0])S.sides.front.l1=t[0];if(t[1])S.sides.back.l1=t[1];S.side='front';if(/mirada/i.test(n))setTab('pho');else setTab('txt');sync();redo()}};
const ff=FONTS.map(f=>FW[f[0]]+' 40px "'+f[2]+'"');Promise.all(ff.map(x=>document.fonts.load(x).catch(()=>0))).then(()=>{dE=true});if(document.fonts)document.fonts.ready.then(()=>{dE=true});
sync();
})();
