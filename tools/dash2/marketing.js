/* =====================================================================
   MARKETING EN VIVO · panel lateral flotante (solo gerente)
   - En vivo: quién está mirando ahora, visitas/contactos/solicitudes de hoy y OPORTUNIDADES con acción
   - Campañas: visitas, solicitudes, ventas, gasto, CPA y ROI por campaña (utm_campaign) + creador de enlaces medibles
   - Piloto automático: micro-rebajas solas dentro de TUS límites (se aplican cada mañana, se pueden deshacer)
   - Registro: todo lo que ha hecho el motor, con «Deshacer»
   Lo que envía mensajes a clientes NUNCA se manda solo: queda preparado para enviarlo con un toque.
   ===================================================================== */
const MK={abierto:false,mini:false,tab:"vivo",hoy:null,t:null,conf:null};
const mkSlug=c=>{ if(!/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(c.id)) return c.id; const b=`${c.marca} ${c.modelo} ${c.anio}`.normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,""); return (b?b+"-":"")+c.id.slice(0,8).toLowerCase(); };
const mkURL=(ruta,src,med,camp)=>`https://volcanocars.com${ruta}${ruta.includes("?")?"&":"?"}utm_source=${encodeURIComponent(src)}&utm_medium=${encodeURIComponent(med)}&utm_campaign=${encodeURIComponent(camp)}`;
const mkGer=()=>typeof ME!=="undefined"&&ME&&!ME.equipo;
try{ const g=JSON.parse(localStorage.getItem("vc_mk")||"{}"); MK.abierto=!!g.a; MK.mini=!!g.m; MK.tab=g.t||"vivo"; }catch(_){}
const mkGuardarUI=()=>{ try{ localStorage.setItem("vc_mk",JSON.stringify({a:MK.abierto,m:MK.mini,t:MK.tab})); }catch(_){} };

function mkMontar(){
  if($("#mk-fab")) return;
  const fab=document.createElement("button"); fab.type="button"; fab.id="mk-fab"; fab.className="mk-fab"; fab.setAttribute("aria-controls","mk-dw");
  fab.innerHTML='<i class="mk-dot"></i><span>Marketing en vivo</span><b id="mk-badge" hidden></b>';
  const dw=document.createElement("aside"); dw.id="mk-dw"; dw.className="mk-dw"; dw.setAttribute("aria-label","Marketing en vivo"); dw.hidden=true;
  document.body.append(fab,dw);
  if(MK.abierto) mkAbrir(true);
}
function mkAbrir(si){ MK.abierto=si; mkGuardarUI(); const dw=$("#mk-dw"), fab=$("#mk-fab"); if(!dw) return;
  dw.hidden=!si; fab.setAttribute("aria-expanded",si); document.body.classList.toggle("mk-on",si&&!MK.mini); dw.classList.toggle("mini",MK.mini);
  if(si){ mkPintar(); mkRefrescar(); } }
/* ---------- datos ---------- */
async function mkRefrescar(){
  if(!mkGer()) return;
  const hoy=hoyC();
  const [m,st,vi]=await Promise.all([
    api("/api/marketing").catch(()=>null),
    api(`/api/stats?desde=${sumaDias(hoy,-29)}&hasta=${hoy}`).catch(()=>null),
    fetch("/api/viendo").then(r=>r.ok?r.json():{}).catch(()=>({})),
  ]);
  if(m){ D2.mk=m; MK.conf=MK.conf||{...m.config}; }
  if(st) MK.st=st.dias||{};
  VIENDO=vi||{};
  MK.t=Date.now(); mkBadge(); if(MK.abierto) mkPintar();
}
function mkHoy(){
  const hoy=hoyC(), d=(MK.st&&MK.st[hoy])||{v:0,clkV:0,horas:Array(24).fill(0)};
  const prev=Object.entries(MK.st||{}).filter(([f])=>f<hoy).map(([,x])=>x);
  const mediaV=prev.length?prev.reduce((a,x)=>a+x.v,0)/prev.length:0;
  const sol=LEADS.filter(x=>diaC(x.creado)===hoy&&!x.manual).length;
  const solMedia=prev.length?LEADS.filter(x=>!x.manual&&diaC(x.creado)>=sumaDias(hoy,-29)&&diaC(x.creado)<hoy).length/prev.length:0;
  return {d,mediaV,sol,solMedia,viendo:Object.values(VIENDO||{}).reduce((a,b)=>a+b,0)};
}
/* ---------- oportunidades: cada una con su acción ---------- */
function mkOportunidades(){
  const o=[], hoy=hoyC(), disp=CARS.filter(c=>c.estado==="disponible"), mk=D2.mk||{};
  const sinContestar=LEADS.filter(x=>x.estado==="nueva"&&!x.manual);
  if(sinContestar.length) o.push({p:100,ico:"⏱",t:`${sinContestar.length} ${sinContestar.length===1?"cliente espera":"clientes esperan"} respuesta`,d:`El más antiguo desde ${durM((Date.now()-Date.parse(sinContestar.map(x=>x.creado).sort()[0]))/6e4)}. Contestar en menos de 15 min multiplica el cierre.`,a:`<button type="button" class="mk-b pri" data-mkir="leads">Contestar ahora</button>`});
  for(const [id,n] of Object.entries(VIENDO||{}).sort((a,b)=>b[1]-a[1]).slice(0,2)){ const c=CARS.find(x=>x.id===id); if(!c||n<1) continue;
    const url=mkURL(`/coche/${mkSlug(c)}`,"instagram","historia","caliente-"+mkSlug(c).slice(0,20));
    o.push({p:90,ico:"🔥",t:`${n} ${n===1?"persona mira":"personas miran"} el ${c.marca} ${c.modelo} ahora`,d:"Está caliente: súbelo a una historia de Instagram o a tu estado de WhatsApp ahora, con este enlace medible.",a:`<button type="button" class="mk-b" data-mkcopy="${esc(url)}">Copiar enlace</button>`}); }
  for(const c of (mk.candidatos||[]).slice(0,3)) o.push({p:70,ico:"🏷",t:`Micro-rebaja: ${esc(c.titulo)}`,d:`${esc(c.motivo)}. Propuesta: ${eur(c.precio)} → <b>${eur(c.nuevo)}</b> (−${String(c.pct).replace(".",",")} %).`,a:`<button type="button" class="mk-b pri" data-mkreb="${esc(c.id)}" data-precio="${c.nuevo}">Aplicar −${eur(c.precio-c.nuevo)}</button>`});
  const it=mk.interes||{personas:{},leads:{},dias:14};
  for(const c of disp){ const pers=it.personas[c.id]||0; if(pers>=10&&!(it.leads[c.id])){ o.push({p:60,ico:"👀",t:`${c.marca} ${c.modelo}: ${pers} personas lo miran, nadie pregunta`,d:"Suele faltar confianza o dinero: añade el vídeo 360°, la comparativa de mercado o la cuota de financiación en la ficha.",a:`<button type="button" class="mk-b" data-mkir="coches">Mejorar la ficha</button>`}); } }
  // Alertas de coches: personas que pidieron aviso y encajan con un coche disponible
  const tope=t=>{ const m=String(t||"").match(/([\d.]+)/); return /Más de/.test(t)?1e9:m?+m[1].replace(/\./g,""):1e9; };
  const alertas=LEADS.filter(x=>x.tipo==="alerta"&&x.estado!=="perdida"&&x.alerta);
  const matches=[]; for(const a of alertas){ const c=disp.filter(c=>c.precio<=tope(a.alerta.presupuesto)&&(Date.now()-Date.parse(c.creado)<21*864e5||c.rebaja)).sort((x,y)=>Date.parse(y.creado)-Date.parse(x.creado))[0]; if(c) matches.push([a,c]); }
  if(matches.length){ const [a,c]=matches[0]; const url=mkURL(`/coche/${mkSlug(c)}`,"whatsapp","alerta","alerta-coches");
    const txt=`Hola ${a.nombre.split(" ")[0]}, te escribimos de Volcano Cars. Nos pediste aviso de coches${a.alerta.presupuesto?" "+a.alerta.presupuesto.toLowerCase():""}: acaba de entrar un ${c.marca} ${c.modelo} de ${c.anio} por ${eur(c.precio)}. Míralo aquí: ${url}`;
    o.push({p:80,ico:"🔔",t:`${matches.length} ${matches.length===1?"persona pidió":"personas pidieron"} aviso de un coche como el ${c.marca} ${c.modelo}`,d:"Te dejo el WhatsApp escrito. Tú decides a quién enviarlo (así no hay envíos masivos no deseados).",a:`<a class="mk-b pri" target="_blank" rel="noopener" href="https://wa.me/${waNum(a.telefono)}?text=${encodeURIComponent(txt)}">Avisar a ${esc(a.nombre.split(" ")[0])}</a>${matches.length>1?`<button type="button" class="mk-b" data-mkir="leads">Ver las ${matches.length}</button>`:""}`}); }
  // Revisión anual: clientes de taller cerrados hace 11–13 meses
  const rev=LEADS.filter(x=>x.tipo==="taller"&&x.estado==="ganada"&&(()=>{ const c=cierre(x); if(!c) return false; const d=(Date.now()-Date.parse(c))/864e5; return d>=330&&d<=400; })());
  if(rev.length){ const x=rev[0], txt=`Hola ${x.nombre.split(" ")[0]}, te escribimos de Volcano Cars. Hace casi un año que revisamos tu ${(x.vehiculo&&x.vehiculo.coche)||"coche"}: ¿te damos cita para la revisión anual o la pre-ITV? Reserva aquí: ${mkURL("/taller-mecanico-fuerteventura/","whatsapp","recordatorio","revision-anual")}`;
    o.push({p:65,ico:"🔧",t:`${rev.length} ${rev.length===1?"cliente toca":"clientes tocan"} revisión anual`,d:"Clientes que ya confían en ti: es la venta más fácil del mes.",a:`<a class="mk-b pri" target="_blank" rel="noopener" href="https://wa.me/${waNum(x.telefono)}?text=${encodeURIComponent(txt)}">Escribir a ${esc(x.nombre.split(" ")[0])}</a>`}); }
  // Hora punta (últimos 28 días)
  const h=Array(24).fill(0); Object.values(MK.st||{}).forEach(d=>(d.horas||[]).forEach((v,i)=>h[i]+=v));
  const tot=h.reduce((a,b)=>a+b,0); if(tot>30){ const i=h.indexOf(Math.max(...h)); o.push({p:30,ico:"🕘",t:`Tu hora punta: ${i}:00–${i+1}:00`,d:`El ${Math.round(h[i]/tot*100)} % de las visitas llega en esa hora. Publica 30 min antes y concentra ahí el presupuesto de anuncios.`,a:""}); }
  return o.sort((a,b)=>b.p-a.p);
}
function mkBadge(){ const b=$("#mk-badge"); if(!b) return; const n=mkOportunidades().filter(x=>x.p>=60).length; b.hidden=!n; b.textContent=n; }
/* ---------- pintar ---------- */
function mkPintar(){
  const dw=$("#mk-dw"); if(!dw||dw.hidden) return;
  const cfg=(D2.mk&&D2.mk.config)||{}, piloto=!!cfg.piloto;
  const tabs=[["vivo","En vivo"],["camp","Campañas"],["piloto","Piloto"],["log","Registro"]];
  dw.innerHTML=`<header class="mk-h"><div><small>Motor de marketing</small><b>${MK.mini?"":"Marketing en vivo"}</b></div>
      <span class="mk-st ${piloto?"on":""}" title="Piloto automático">${piloto?"Piloto ON":"Piloto OFF"}</span>
      <button type="button" class="mk-ic" data-mkmini aria-label="${MK.mini?"Ampliar":"Plegar"}">${MK.mini?"⟨":"⟩"}</button><button type="button" class="mk-ic" data-mkcerrar aria-label="Cerrar">✕</button></header>
    ${MK.mini?mkMini():`<nav class="mk-tabs" role="tablist">${tabs.map(([k,t])=>`<button type="button" role="tab" data-mktab="${k}" aria-selected="${MK.tab===k}">${t}</button>`).join("")}</nav>
    <div class="mk-body">${MK.tab==="camp"?mkCampanas():MK.tab==="piloto"?mkPiloto():MK.tab==="log"?mkLog():mkVivo()}</div>
    <footer class="mk-f">${MK.t?`Actualizado ${new Date(MK.t).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",second:"2-digit"})} · se refresca solo`:"Cargando…"}</footer>`}`;
}
function mkMini(){ const H=mkHoy(); return `<div class="mk-mini"><div><b class="num">${H.viendo}</b><small>viendo</small></div><div><b class="num">${H.d.v}</b><small>visitas hoy</small></div><div><b class="num">${H.sol}</b><small>solicitudes</small></div><div><b class="num">${mkOportunidades().length}</b><small>ideas</small></div></div>`; }
function mkVivo(){
  const H=mkHoy(), op=mkOportunidades(), h=H.d.horas||[], ahora=+new Intl.DateTimeFormat("en-GB",{timeZone:"Atlantic/Canary",hour:"2-digit",hourCycle:"h23"}).format(new Date());
  const conv=H.d.v?H.sol/H.d.v:0;
  return `<section class="mk-live">
      <div class="mk-now"><i></i><b class="num">${H.viendo}</b><span>${H.viendo===1?"persona mirando":"personas mirando"} coches ahora mismo</span></div>
      <div class="mk-kp"><div><small>Visitas hoy</small><b class="num">${nfmt(H.d.v)}</b>${d2Chip(H.d.v,H.mediaV*Math.max(.2,(ahora+1)/24))}</div>
        <div><small>Contactos hoy</small><b class="num">${nfmt(H.d.clkV||0)}</b><em>WhatsApp, llamar…</em></div>
        <div><small>Solicitudes hoy</small><b class="num">${nfmt(H.sol)}</b>${d2Chip(H.sol,H.solMedia)}</div>
        <div><small>Conversión hoy</small><b class="num">${H.d.v?String(Math.round(conv*1000)/10).replace(".",",")+" %":"—"}</b><em>solicitudes / visitas</em></div></div>
      <div class="mk-hrs" aria-label="Visitas por hora hoy">${h.map((v,i)=>`<i class="${i===ahora?"now":""}" style="--h:${(v/Math.max(1,...h)).toFixed(3)}" data-tip="${i}:00 · ${v} páginas"></i>`).join("")}</div>
    </section>
    <h4 class="mk-t">Oportunidades ahora <small>${op.length}</small></h4>
    ${op.length?op.map(x=>`<article class="mk-op"><span class="mk-oi" aria-hidden="true">${x.ico}</span><div><b>${x.t}</b><p>${x.d}</p>${x.a?`<div class="mk-oa">${x.a}</div>`:""}</div></article>`).join(""):'<p class="mk-vacio">Todo en orden. Cuando aparezca una oportunidad (alguien mirando un coche, un cliente esperando, un coche que no se mueve), sale aquí.</p>'}`;
}
function mkCampanas(){
  const mk=D2.mk||{}, gastos=mk.gastos||[], desde=sumaDias(hoyC(),-89);
  const vis={}; Object.entries(STATS||{}).concat(Object.entries(MK.st||{})).forEach(([f,d])=>{ if(f>=desde&&d.camp) for(const [k,v] of Object.entries(d.camp)) vis[k+"|"+f]=v; });
  const visC={}; for(const [k,v] of Object.entries(vis)){ const c=k.split("|")[0]; visC[c]=(visC[c]||0)+v; }
  const L=LEADS.filter(x=>x.origen&&x.origen.utm_campaign&&diaC(x.creado)>=desde);
  const nombres=[...new Set([...Object.keys(visC),...L.map(x=>x.origen.utm_campaign.toLowerCase()),...gastos.map(g=>g.campana)])];
  const filas=nombres.map(n=>{ const l=L.filter(x=>x.origen.utm_campaign.toLowerCase()===n), g=l.filter(x=>x.estado==="ganada"), f=g.reduce((a,x)=>a+(x.importe||0),0), gasto=gastos.filter(x=>x.campana===n).reduce((a,x)=>a+x.gasto,0);
    return {n,v:visC[n]||0,s:l.length,g:g.length,f,gasto,cpa:gasto&&l.length?gasto/l.length:null,roi:gasto?(f-gasto)/gasto:null}; }).sort((a,b)=>b.f-a.f||b.s-a.s||b.v-a.v);
  const ops=CARS.filter(c=>c.estado!=="vendido").map(c=>`<option value="/coche/${esc(mkSlug(c))}">Coche: ${esc(c.marca+" "+c.modelo)}</option>`).join("");
  return `<p class="mk-intro">Últimos 90 días. Cada campaña se mide por su enlace (<code>utm_campaign</code>). Apunta lo que te gastas y verás el coste por cliente y el retorno.</p>
    ${filas.length?`<div class="mk-cps">${filas.map(r=>`<article class="mk-cp"><header><b>${esc(r.n)}</b>${r.roi===null?'<span class="d2-chip">sin gasto apuntado</span>':`<span class="d2-chip ${r.roi>=0?"up":"down"}">ROI ${(r.roi>=0?"+":"")+Math.round(r.roi*100)} %</span>`}</header>
      <div class="mk-cpk"><div><small>Visitas</small><b class="num">${nfmt(r.v)}</b></div><div><small>Solicitudes</small><b class="num">${r.s}</b></div><div><small>Ventas</small><b class="num">${r.g}</b>${r.f?`<em>${eur(Math.round(r.f))}</em>`:""}</div><div><small>Gasto</small><b class="num">${r.gasto?eur(r.gasto):"—"}</b>${r.cpa!==null?`<em>CPA ${eur(Math.round(r.cpa))}</em>`:""}</div></div></article>`).join("")}</div>`:'<p class="mk-vacio">Aún no hay campañas medidas. Crea un enlace abajo y úsalo en tu anuncio, historia, flyer o QR.</p>'}
    <details class="mk-det"><summary>Apuntar gasto de una campaña</summary><form class="mk-form" id="mk-gasto">
      <label>Campaña<input class="in" name="campana" list="mk-camps" required placeholder="p. ej. flyer-septiembre"></label><datalist id="mk-camps">${nombres.map(n=>`<option value="${esc(n)}">`).join("")}</datalist>
      <label>Canal<select class="in" name="canal"><option>Instagram</option><option>Facebook</option><option>Google Ads</option><option>Flyers / imprenta</option><option>Otro</option></select></label>
      <label>Gasto (€)<input class="in" name="gasto" inputmode="decimal" required placeholder="0"></label>
      <label>Desde<input class="in" type="date" name="desde"></label><label>Hasta<input class="in" type="date" name="hasta"></label>
      <button class="btn b-acc b-sm">Guardar gasto</button></form>
      ${gastos.length?`<ul class="mk-gl">${gastos.map(g=>`<li><span>${esc(g.campana)} · ${esc(g.canal)}${g.desde?` · ${esc(g.desde)}`:""}</span><b>${eur(g.gasto)}</b><button type="button" class="mk-ic" data-mkgdel="${esc(g.id)}" aria-label="Borrar">✕</button></li>`).join("")}</ul>`:""}</details>
    <details class="mk-det" open><summary>Crear enlace medible (para anuncios, historias, flyers y QR)</summary><form class="mk-form" id="mk-utm">
      <label>¿A dónde lleva?<select class="in" name="ruta"><option value="/">Portada</option><option value="/coches-segunda-mano-fuerteventura/">Catálogo de coches</option><option value="/taller-mecanico-fuerteventura/">Taller</option><option value="/pre-itv-fuerteventura/">Pre-ITV</option>${ops}</select></label>
      <label>¿Dónde lo pones?<select class="in" name="src"><option value="instagram|social">Instagram</option><option value="facebook|social">Facebook</option><option value="google|cpc">Google Ads</option><option value="whatsapp|mensaje">WhatsApp</option><option value="flyer|qr">Flyer / QR</option><option value="tiktok|social">TikTok</option></select></label>
      <label>Nombre de la campaña<input class="in" name="camp" required placeholder="p. ej. oferta-pre-itv-octubre"></label>
      <button class="btn b-acc b-sm">Crear enlace</button></form><div id="mk-utm-out"></div></details>`;
}
function mkPiloto(){
  const c=MK.conf||((D2.mk&&D2.mk.config)||{}), up=(D2.mk&&D2.mk.ultimoPiloto)||null, cand=(D2.mk&&D2.mk.candidatos)||[];
  const campo=(k,l,mi,ma,st,suf,ayuda)=>`<label class="mk-sl"><span>${l}<b data-mkv="${k}">${String(c[k]).replace(".",",")}${suf}</b></span><input type="range" min="${mi}" max="${ma}" step="${st}" value="${c[k]}" data-mkconf="${k}" data-suf="${suf}" style="--p:${((c[k]-mi)/(ma-mi)*100).toFixed(1)}%"><small>${ayuda}</small></label>`;
  return `<section class="mk-pil ${c.piloto?"on":""}"><label class="mk-sw"><input type="checkbox" data-mkconf="piloto" ${c.piloto?"checked":""}><span></span><div><b>Piloto automático</b><small>${c.piloto?"El motor rebaja él solo, cada mañana, los coches que casi nadie mira.":"Apagado: el motor solo te propone las rebajas."}</small></div></label></section>
    <p class="mk-intro">Actúa <b>solo dentro de estos límites</b>. Cada rebaja te llega por Telegram y la puedes deshacer en «Registro». La web solo tacha el precio anterior si es legal (el más bajo de los 30 días previos).</p>
    ${campo("maxPct","Rebaja máxima cada vez",1,10,.5," %","Nunca baja más de esto de una vez.")}
    ${campo("maxEur","Tope en euros cada vez",50,2000,50," €","Aunque el % dé más.")}
    ${campo("maxTotalPct","Rebaja total máxima",1,20,.5," %","Suma de todas las rebajas sobre el precio original.")}
    ${campo("diasMin","Días publicado antes de tocarlo",7,120,1," días","Un coche recién publicado necesita tiempo.")}
    ${campo("diasEntre","Días entre dos rebajas",7,60,1," días","Para medir si la anterior funcionó.")}
    ${campo("umbral","«Poco interés» por debajo de",.2,10,.1," personas/día","Media de personas distintas que abren su ficha.")}
    ${campo("maxSemana","Rebajas automáticas por semana",0,10,1,"","0 = el piloto no toca precios.")}
    <div class="mk-oa"><button type="button" class="mk-b pri" data-mkguardar>Guardar límites</button></div>
    <p class="mk-f2">${up?`Última revisión: ${esc(new Date(up.t).toLocaleString("es-ES",{dateStyle:"medium",timeStyle:"short"}))} · ${up.candidatos} candidatos · ${up.aplicadas} aplicadas.`:"Revisa los coches cada mañana a las 9:15 (hora de Canarias)."}</p>
    <h4 class="mk-t">Candidatos hoy <small>${cand.length}</small></h4>
    ${cand.length?cand.map(x=>`<article class="mk-op"><span class="mk-oi">🏷</span><div><b>${esc(x.titulo)}</b><p>${esc(x.motivo)}<br>${eur(x.precio)} → <b>${eur(x.nuevo)}</b></p><div class="mk-oa"><button type="button" class="mk-b" data-mkreb="${esc(x.id)}" data-precio="${x.nuevo}">Aplicar ya</button></div></div></article>`).join(""):'<p class="mk-vacio">Ningún coche cumple las condiciones ahora mismo.</p>'}`;
}
function mkLog(){
  const l=(D2.mk&&D2.mk.log)||[];
  return l.length?`<ol class="mk-log">${l.map(a=>`<li class="${a.deshecha?"des":""}"><span class="mk-li">${a.tipo==="deshacer"?"↩":a.auto?"⚡":"✋"}</span><div><b>${esc(a.titulo)}: ${eur(a.de)} → ${eur(a.a)}</b><small>${esc(new Date(a.t).toLocaleString("es-ES",{dateStyle:"medium",timeStyle:"short"}))} · ${a.auto?"automático":"a mano"} · ${esc(a.motivo)}</small>${a.tipo==="rebaja"&&!a.deshecha?`<button type="button" class="mk-b" data-mkundo="${esc(a.id)}">Deshacer</button>`:a.deshecha?"<em>Deshecha</em>":""}</div></li>`).join("")}</ol>`:'<p class="mk-vacio">Todavía no hay acciones. Aquí queda apuntado todo lo que haga el motor (y lo que apruebes tú).</p>';
}
/* ---------- eventos ---------- */
document.addEventListener("click",async e=>{ const t=e.target;
  if(t.closest("#mk-fab")){ mkAbrir(!MK.abierto); return; }
  if(!t.closest("#mk-dw")) return;
  if(t.closest("[data-mkcerrar]")){ mkAbrir(false); return; }
  if(t.closest("[data-mkmini]")){ MK.mini=!MK.mini; mkAbrir(true); return; }
  const tb=t.closest("[data-mktab]"); if(tb){ MK.tab=tb.dataset.mktab; mkGuardarUI(); mkPintar(); return; }
  const ir=t.closest("[data-mkir]"); if(ir){ abrirTab(ir.dataset.mkir); if(innerWidth<900) mkAbrir(false); return; }
  const cp=t.closest("[data-mkcopy]"); if(cp){ try{ await navigator.clipboard.writeText(cp.dataset.mkcopy); toast("Enlace copiado"); }catch(_){ prompt("Copia el enlace:",cp.dataset.mkcopy); } return; }
  const rb=t.closest("[data-mkreb]"); if(rb){
    if(!rb.dataset.ok){ rb.dataset.ok="1"; rb.dataset.txt=rb.textContent; rb.textContent="¿Seguro? Toca otra vez"; rb.classList.add("conf"); setTimeout(()=>{ if(rb.isConnected&&rb.dataset.ok){ delete rb.dataset.ok; rb.textContent=rb.dataset.txt; rb.classList.remove("conf"); } },4000); return; }
    rb.disabled=true; try{ await api("/api/marketing/rebaja",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id:rb.dataset.mkreb,precio:+rb.dataset.precio})}); toast("Rebaja aplicada: la web ya enseña el precio nuevo"); api("/api/coches?todos=1").then(l=>{ CARS=l; if(typeof renderList==="function") renderList(); }).catch(()=>{}); await mkRefrescar(); }catch(err){ toast(err.message); rb.disabled=false; } return; }
  const un=t.closest("[data-mkundo]"); if(un){ un.disabled=true; try{ await api("/api/marketing/deshacer",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({accion:un.dataset.mkundo})}); toast("Deshecho: el coche vuelve a su precio"); api("/api/coches?todos=1").then(l=>{ CARS=l; if(typeof renderList==="function") renderList(); }).catch(()=>{}); await mkRefrescar(); }catch(err){ toast(err.message); un.disabled=false; } return; }
  if(t.closest("[data-mkguardar]")){ try{ const c=await api("/api/marketing/config",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(MK.conf)}); D2.mk.config=c; MK.conf={...c}; toast(c.piloto?"Guardado. Piloto automático activado":"Guardado"); mkPintar(); }catch(err){ toast(err.message); } return; }
  const gd=t.closest("[data-mkgdel]"); if(gd){ const l=(D2.mk.gastos||[]).filter(g=>g.id!==gd.dataset.mkgdel); try{ D2.mk.gastos=await api("/api/marketing/gastos",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(l)}); mkPintar(); }catch(err){ toast(err.message); } return; }
});
document.addEventListener("input",e=>{ const s=e.target.closest&&e.target.closest("[data-mkconf]"); if(!s) return; MK.conf=MK.conf||{...D2.mk.config};
  if(s.type==="checkbox"){ MK.conf.piloto=s.checked; const p=s.closest(".mk-pil"); if(p) p.classList.toggle("on",s.checked); return; }
  MK.conf[s.dataset.mkconf]=+s.value; s.style.setProperty("--p",((s.value-s.min)/(s.max-s.min)*100)+"%"); const v=document.querySelector(`[data-mkv="${s.dataset.mkconf}"]`); if(v) v.textContent=String(s.value).replace(".",",")+s.dataset.suf; });
document.addEventListener("submit",async e=>{ const f=e.target;
  if(f.id==="mk-utm"){ e.preventDefault(); const d=Object.fromEntries(new FormData(f)); const [src,med]=d.src.split("|"); const camp=String(d.camp).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9._-]+/g,"-").replace(/^-|-$/g,"");
    const url=mkURL(d.ruta,src,med,camp); $("#mk-utm-out").innerHTML=`<div class="mk-url"><code>${esc(url)}</code><div class="mk-oa"><button type="button" class="mk-b pri" data-mkcopy="${esc(url)}">Copiar</button>${typeof QR!=="undefined"&&QR.svg?`<span class="mk-qr">${QR.svg(url,140)}</span>`:""}</div></div>`; return; }
  if(f.id==="mk-gasto"){ e.preventDefault(); const d=Object.fromEntries(new FormData(f)); const l=[...(D2.mk.gastos||[]),{campana:d.campana,canal:d.canal,gasto:+String(d.gasto).replace(",","."),desde:d.desde,hasta:d.hasta}];
    try{ D2.mk.gastos=await api("/api/marketing/gastos",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(l)}); toast("Gasto guardado"); mkPintar(); }catch(err){ toast(err.message); } }
});
// Arranque: aparece al entrar el gerente; se refresca cada 30 s si está abierto (cada 2 min si no, para el contador)
setInterval(()=>{ if(mkGer()){ mkMontar(); } else { const f=$("#mk-fab"), d=$("#mk-dw"); if(f){ f.remove(); d&&d.remove(); document.body.classList.remove("mk-on"); } } },1000);
setInterval(()=>{ if(mkGer()&&(MK.abierto||!MK.t||Date.now()-MK.t>120000)&&!document.hidden) mkRefrescar(); },30000);
setTimeout(()=>{ if(mkGer()) mkRefrescar(); },2500);
