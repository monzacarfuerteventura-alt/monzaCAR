/* =====================================================================
   JORNADA · fichaje de ultra-baja fricción + 2FA del equipo + registro legal
   Fuente: tools/jornada/jornada.js (+ jornada.css) → se copia dentro de admin.html con
   python3 tools/jornada/inyectar.py
   · Equipo: tras entrar con PIN, si no está trabajando ve UN botón gigante que cambia solo
     (Entrada → Pausa/Salida → Reanudar). 1 toque, hora del servidor, aviso de 2 s y «Deshacer».
   · Cartel QR / pegatina NFC del taller: escanear = fichar (sin menús).
   · Gerente: pestaña «Jornada» con la plantilla en vivo, horas del mes, correcciones con motivo,
     Excel (.xlsx), PDF para firmar, accesos y dispositivos de confianza.
   ===================================================================== */
let J_QRSEL="", J=null, J_SKEW=0, J_TAB="ordenes", J_MIAS=null, J_QR="", J_BUSY=false, J_MES=hoyC().slice(0,7), J_PL=null, J_REG=null, J_UID="", J_ACC=null;
const J_TXT={entrada:"Entrada",pausa:"Pausa",reanudar:"Vuelta de la pausa",salida:"Salida",anulacion:"Anulado"};
const J_VIA={boton:"Botón",qr:"QR del taller",nfc:"NFC",correccion:"Corrección del gerente"};
const jAhora=()=>Date.now()+J_SKEW;
const jHM=iso=>iso?new Date(iso).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",timeZone:"Atlantic/Canary"}):"—";
const jH=min=>{ min=Math.max(0,Math.round(min||0)); return `${Math.floor(min/60)} h ${String(min%60).padStart(2,"0")}`; };
const jHdec=min=>Math.round((min||0)/60*100)/100;
const jHoraLocal=()=>{ const [h,m]=new Intl.DateTimeFormat("en-GB",{timeZone:"Atlantic/Canary",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(jAhora())).split(":").map(Number); return h+m/60; };
function jRecibir(r){ if(!r) return; J=r; if(r.ahora) J_SKEW=Date.parse(r.ahora)-Date.now(); jChip(); }
async function jCargar(){ try{ jRecibir(await api("/api/jornada/yo")); }catch(_){ } return J; }
// minutos trabajados hoy, contando en vivo desde la última respuesta del servidor
function jTrabajadoAhora(){ if(!J||!J.hoy) return 0; const base=J.hoy.trabajoMin||0; return J.estado==="trabajando"&&J.ahora?base+(jAhora()-Date.parse(J.ahora))/6e4:base; }

/* ---------- pantalla de fichaje (el «candado» del equipo) ---------- */
function jPrincipal(){ // qué botón va grande según el momento del día
  if(!J||J.estado==="fuera") return ["entrada"];
  if(J.estado==="pausa") return ["reanudar","salida"];
  const tarde=jHoraLocal()>=15.5, cumplida=jTrabajadoAhora()>=(J.jornadaH||8)*60-30;
  return tarde||cumplida?["salida","pausa"]:["pausa","salida"];
}
const J_BTN={entrada:["🟢","Registrar entrada","j-b-ent"],pausa:["☕","Iniciar pausa / comida","j-b-pau"],reanudar:["▶️","Reanudar jornada","j-b-rea"],salida:["🔴","Registrar salida","j-b-sal"]};
function jPintar(msg){
  const box=$("#j-fichar"); if(!box||!ME) return;
  const [p,s]=jPrincipal(), [ico,txt,cls]=J_BTN[p], n=(ME.nombre||"").split(" ")[0];
  const est={fuera:["off","Fuera de jornada"],trabajando:["on","Trabajando"],pausa:["pau","En pausa"]}[J?J.estado:"fuera"];
  const evs=J&&J.eventos?J.eventos.filter(e=>e.tipo!=="anulacion"&&!J.eventos.some(a=>a.tipo==="anulacion"&&a.anula===e.n)):[];
  box.innerHTML=`<div class="j-card">
    <div class="j-top"><div><small>Hola, ${esc(n)}</small><b class="j-reloj num" id="j-reloj">${jHM(new Date(jAhora()).toISOString())}</b></div>
      <div class="j-est ${est[0]}"><i></i><span>${est[1]}${J&&J.desde&&J.estado!=="fuera"?` desde las ${jHM(J.desde)}`:""}</span></div></div>
    ${J&&J.olvido?`<div class="msg bad j-olv">El ${esc(fecha(J.olvido))} no fichaste la salida. Ficha la entrada de hoy y avisa al gerente para que la corrija.</div>`:""}
    ${msg?`<div class="msg bad">${esc(msg)}</div>`:""}
    <button type="button" class="j-big ${cls}" data-jacc="${p}" ${J_QRSEL?`data-jqr="${esc(J_QRSEL)}"`:""} ${J_BUSY?"disabled":""}><span class="j-ico" aria-hidden="true">${ico}</span><span>${txt}</span></button>
    ${s?`<button type="button" class="j-sec" data-jacc="${s}" ${J_QRSEL?`data-jqr="${esc(J_QRSEL)}"`:""} ${J_BUSY?"disabled":""}>${J_BTN[s][0]} ${J_BTN[s][1]}</button>`:""}
    <div class="j-hoy"><div><small>Trabajado hoy</small><b class="num" id="j-trab">${jH(jTrabajadoAhora())}</b></div><div><small>Pausas</small><b class="num">${jH(J&&J.hoy?J.hoy.pausaMin:0)}</b></div><div><small>Tu jornada</small><b class="num">${jH((J&&J.jornadaH||8)*60)}</b></div></div>
    ${evs.length?`<ol class="j-evs">${evs.map(e=>`<li class="${e.tipo}"><b class="num">${jHM(e.t)}</b>${J_TXT[e.tipo]}${e.via==="qr"||e.via==="nfc"?' <small>· QR</small>':e.via==="correccion"?' <small>· corregido</small>':""}</li>`).join("")}</ol>`:""}
    <div class="j-pie">${J&&J.estado==="trabajando"?`<button type="button" class="btn b-ghost b-sm" data-jvolver>← Volver al trabajo</button>`:""}<button type="button" class="btn b-ghost b-sm" data-jmias>Mis horas del mes</button></div>
    <div id="j-mias"></div>
  </div>`;
}
function jAbrir(msg){ if(!ME||!ME.equipo) return; show("s-fichar"); jPintar(msg); if(J&&J.estado==="trabajando") jPrecargarMias(); }
function jBloquear(d){ if(!ME||!ME.equipo) return; if(d&&d.jornada&&J&&J.estado==="trabajando") J.estado=d.jornada; jCargar().then(()=>{ if(!J||J.estado!=="trabajando") jAbrir(); }); }
function jPrecargarMias(){ J_MIAS=null; api("/api/almacen/mias").then(l=>J_MIAS=l).catch(()=>J_MIAS=[]); }
// El reloj y el contador avanzan solos (sin pedir nada al servidor)
setInterval(()=>{ const r=$("#j-reloj"); if(r&&!$("#s-fichar").hidden){ r.textContent=jHM(new Date(jAhora()).toISOString()); const t=$("#j-trab"); if(t) t.textContent=jH(jTrabajadoAhora()); } jChip(); },15000);

async function jFichar(acc,extra={}){
  if(J_BUSY) return; J_BUSY=true; jPintar();
  try{
    const r=await api("/api/jornada/fichar",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({accion:acc||undefined,...extra})});
    J_BUSY=false;
    if(r.elegir){ J_QRSEL=extra.qr||""; jRecibir(r.jornada); jAbrir(); jToast("Estás trabajando: elige pausa o salida"); return; }
    J_QRSEL="";
    jRecibir(r.jornada);
    const hora=jHM(r.t), txt={entrada:`Entrada registrada a las ${hora}`,pausa:`Pausa desde las ${hora}`,reanudar:`De vuelta a las ${hora}`,salida:`Salida registrada a las ${hora} · hoy ${jH(r.jornada.hoy.trabajoMin)}`}[r.accion]+(r.orden?` · orden ${r.orden} ${r.accion==="pausa"||r.accion==="salida"?"pausada":"reanudada"}`:"");
    jToast(txt,1);
    if(r.accion==="entrada"||r.accion==="reanudar"){ // directo al trabajo: se recarga en segundo plano lo que faltaba
      Promise.all([api("/api/ordenes").then(o=>{ ORDENES=o; }).catch(()=>{}),typeof tCargarEquipo==="function"?tCargarEquipo():null]).then(()=>{ if(!$("#s-ordenes").hidden) renderOrdenes(); });
      abrirTab(J_TAB||"ordenes");
    } else jAbrir();
  }catch(err){ J_BUSY=false; await jCargar(); jAbrir(err.message); }
}
async function jSalida(extra){ // antes de salir: herramientas a su nombre (ya precargadas, no retrasa)
  const l=J_MIAS||[]; if(!l.length||typeof alResolverHerramientas!=="function") return jFichar("salida",extra);
  let hecho=false; const go=()=>{ if(hecho) return; hecho=true; jFichar("salida",extra); };
  alResolverHerramientas(l,"Antes de salir","Tienes herramientas a tu nombre. Devuélvelas o di dónde se quedan (o pulsa «Ahora no»).",go);
  const d=$("#dlg-al"); if(d) d.addEventListener("close",go,{once:true});
}
async function jDeshacer(){ try{ const r=await api("/api/jornada/deshacer",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}); jRecibir(r.jornada); jToast("Fichaje deshecho: queda anotado como pulsación por error");
    if(J.estado==="trabajando") abrirTab(J_TAB||"ordenes"); else jAbrir(); }catch(err){ jToast(err.message); } }
// Aviso pequeño de 2 s (5 s si trae «Deshacer»): no hay que cerrar nada
function jToast(txt,deshacer){ let t=$("#j-toast"); if(!t){ t=document.createElement("div"); t.id="j-toast"; t.setAttribute("role","status"); document.body.appendChild(t); }
  t.innerHTML=`<span>${esc(txt)}</span>${deshacer?'<button type="button" data-jdeshacer>Deshacer</button>':""}`; t.className="on";
  clearTimeout(jToast.t); jToast.t=setTimeout(()=>t.className="",deshacer?6000:2200); }

/* ---------- chip en la barra de arriba: estado + horas; 1 toque para pausa/salida ---------- */
function jChip(){ if(!ME||!ME.equipo){ const c=$("#j-chip"); if(c) c.hidden=true; return; }
  let c=$("#j-chip"); if(!c){ c=document.createElement("button"); c.type="button"; c.id="j-chip"; c.className="btn b-ghost b-sm"; const ta=$("#topacts"); ta.insertBefore(c,$("#logout")); }
  const e=J?J.estado:"fuera"; c.hidden=false; c.className="btn b-ghost b-sm j-chip "+e;
  c.innerHTML=`<i></i><span>${e==="trabajando"?jH(jTrabajadoAhora()):e==="pausa"?"En pausa":"Fichar"}</span>`; c.title="Fichaje: pausa, salida y tus horas"; }

/* ---------- QR / NFC del taller: /admin#fichar=CÓDIGO ---------- */
(function(){ const m=location.hash.match(/^#fichar=([A-Za-z0-9]{10,40})$/); if(!m) return;
  try{ sessionStorage.setItem("vc_qr",m[1]); }catch(_){ } J_QR=m[1]; history.replaceState(null,"","#taller");
  if(!PW){ modoLogin(true); setTimeout(()=>{ const e=$("#login-err"); if(e){ e.textContent="Entra con tu usuario y PIN: al entrar se ficha solo."; e.hidden=false; e.classList.remove("bad"); } },50); } })();
function jQRpendiente(){ let c=J_QR; try{ c=c||sessionStorage.getItem("vc_qr")||""; sessionStorage.removeItem("vc_qr"); }catch(_){ } J_QR=""; return c; }

/* ---------- enganches con el resto del panel ---------- */
TABS.jornada="s-jornada";
const _jShow=show;
show=function(id){ ["s-fichar","s-jornada"].forEach(x=>{ const s=$("#"+x); if(s) s.hidden=x!==id; }); _jShow(id); if(id==="s-fichar") $("#tabsrow").hidden=true; };
const _jTab=abrirTab;
abrirTab=function(t,push=true){
  if(ME&&ME.equipo&&t!=="ayuda"&&(!J||J.estado!=="trabajando")){ J_TAB=t==="caja"||t==="alm"?t:"ordenes"; jAbrir(); return; }
  if(t==="jornada"){ jgAbrir(); return; }
  if(ME&&ME.equipo) J_TAB=t==="caja"||t==="alm"?t:"ordenes";
  return _jTab(t,push);
};
const _jEntrar=entrarEquipo;
entrarEquipo=async function(d){
  J=d.jornada||null; if(J&&J.ahora) J_SKEW=Date.parse(J.ahora)-Date.now();
  const qr=jQRpendiente();
  if(!J||J.estado!=="trabajando"){ ME={rol:d.rol,nombre:d.nombre,uid:d.uid,equipo:true,caja:!!d.caja}; jAbrir(); }
  await _jEntrar(d); if(!J) await jCargar(); jChip();
  if(!J||J.estado!=="trabajando") jAbrir();
  if(qr) jFichar("",{qr});
};
const _jModo=modoLogin;
modoLogin=function(eq){ _jModo(eq); const a=$("#j-alta"); if(a) a.hidden=true; };
const _jLogout=logout;
logout=function(msg){ J=null; const c=$("#j-chip"); if(c) c.hidden=true; const a=$("#j-alta"); if(a) a.hidden=true; return _jLogout(msg); };

/* ---------- login: alta de Google Authenticator del equipo y códigos de recuperación ---------- */
(function(){ const f2=$("#f-2fa"); if(!f2||$("#j-alta")) return;
  const a=document.createElement("div"); a.id="j-alta"; a.hidden=true; a.className="j-alta"; f2.before(a);
  const c=document.createElement("label"); c.className="check j-confiar"; c.innerHTML='<input type="checkbox" id="j-confiar" checked> <span>Confiar en este dispositivo 30 días <small>(no te volverá a pedir el código aquí; no lo marques en ordenadores compartidos)</small></span>';
  f2.after(c); })();
function jAlta2fa(c){ const a=$("#j-alta"); if(!a) return;
  a.innerHTML=`<b>Vincula tu móvil (solo esta vez)</b><ol><li>Instala <b>Google Authenticator</b> (o Microsoft Authenticator).</li><li>Pulsa <b>+</b> → <b>Escanear código QR</b> y escanea este:</li></ol>
    <div class="j-qr">${QR.svg(c.uri,190)}</div><small class="hint">¿No puedes escanear? Escribe esta clave: <b class="num">${esc(c.secreto)}</b></small>
    <p class="hint" style="margin:6px 0 0">3. Escribe abajo el código de 6 cifras que sale en la app.</p>`;
  a.hidden=false; $("#f-2fa").hidden=false; $("#f-2fa label").textContent="Código de 6 cifras de la app"; setTimeout(()=>$("#pw2").focus(),30); }
function jAltaFin(){ const a=$("#j-alta"); if(a) a.hidden=true; }
function jRecuperacion(codigos){
  let d=$("#dlg-jrec"); if(!d){ d=document.createElement("dialog"); d.id="dlg-jrec"; d.className="t-dlg"; document.body.appendChild(d); }
  d.innerHTML=`<h2>Guarda tus 8 códigos de recuperación</h2><p class="hint">Si pierdes el móvil, cada código sirve <b>una sola vez</b> en lugar del de 6 cifras. Hazles una foto o apúntalos en un papel y guárdalo en casa.</p>
    <div class="j-rec num">${codigos.map(c=>`<span>${esc(c)}</span>`).join("")}</div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-jcopiar>Copiar</button><button type="button" class="btn b-acc" data-jok>Ya los he guardado</button></div>`;
  d.querySelector("[data-jcopiar]").onclick=()=>{ try{ navigator.clipboard.writeText(codigos.join("\n")); toast("Copiados"); }catch(_){ } };
  d.querySelector("[data-jok]").onclick=()=>d.close(); d.showModal(); }

/* ---------- clics ---------- */
document.addEventListener("click",e=>{ const t=e.target;
  const a=t.closest("[data-jacc]"); if(a){ const acc=a.dataset.jacc, qr=a.dataset.jqr; const ex=qr?{qr}:{}; if(acc==="salida") jSalida(ex); else jFichar(acc,ex); return; }
  if(t.closest("[data-jdeshacer]")){ $("#j-toast").className=""; jDeshacer(); return; }
  if(t.closest("#j-chip")){ jCargar().then(()=>jAbrir()); return; }
  if(t.closest("[data-jvolver]")){ abrirTab(J_TAB||"ordenes"); return; }
  if(t.closest("[data-jmias]")){ jMias(); return; }
});
async function jMias(){ const box=$("#j-mias"); if(!box) return; box.innerHTML='<p class="hint">Cargando…</p>';
  try{ const r=await api(`/api/jornada/registro?mes=${hoyC().slice(0,7)}&uid=${encodeURIComponent(ME.uid)}`), p=r.personas[0];
    box.innerHTML=p?`<h3>${esc(nombreMes(r.mes))}</h3>${jTablaDias(p,false)}<button type="button" class="btn b-ghost b-sm" data-jgpdf="${esc(ME.uid)}" data-jgmes="${esc(r.mes)}">Descargar PDF</button>`:'<p class="hint">Sin fichajes este mes.</p>';
  }catch(err){ box.innerHTML=`<p class="hint">${esc(err.message)}</p>`; } }
function jTablaDias(p,ger){
  return `<div class="tabla-wrap"><table class="tabla j-tab"><thead><tr><th>Día</th><th>Entrada</th><th>Salida</th><th class="n">Pausas</th><th class="n">Trabajado</th><th class="n">Extra</th><th>Incidencias</th>${ger?"<th></th>":""}</tr></thead><tbody>
    ${p.dias.map(d=>`<tr class="${d.incidencias.length?"j-inc":""}"><td>${esc(fecha(d.fecha))}</td><td class="num">${jHM(d.entrada)}</td><td class="num">${d.abierta?"—":jHM(d.salida)}</td><td class="n num">${jH(d.pausaMin)}</td><td class="n num"><b>${jH(d.trabajoMin)}</b></td><td class="n num">${d.extraMin?jH(d.extraMin):""}</td><td>${esc(d.incidencias.join(" · "))}${d.correcciones||d.anulaciones?` <small>(${d.correcciones+d.anulaciones} corr.)</small>`:""}</td>${ger?`<td><button type="button" class="chipb" data-jgdia="${esc(p.uid)}|${esc(d.fecha)}">Ver / corregir</button></td>`:""}</tr>`).join("")||`<tr><td colspan="8" class="hint">Sin fichajes.</td></tr>`}
    </tbody><tfoot><tr><th colspan="3">${p.total.diasTrabajados} días</th><th class="n num">${jH(p.total.pausaMin)}</th><th class="n num">${jH(p.total.trabajoMin)}</th><th class="n num">${jH(p.total.extraMin)}</th><th colspan="${ger?2:1}">${p.total.incidencias?p.total.incidencias+" incidencias":""}</th></tr></tfoot></table></div>`;
}

/* =====================================================================
   PESTAÑA «JORNADA» (gerente)
   ===================================================================== */
async function jgAbrir(){ show("s-jornada"); history.replaceState(null,"","#jornada"); jgPintar(); await Promise.all([jgPlantilla(),jgRegistro()]); }
async function jgPlantilla(){ try{ J_PL=await api("/api/jornada/plantilla"); }catch(err){ J_PL={error:err.message}; } jgPintar(); }
async function jgRegistro(){ try{ J_REG=await api(`/api/jornada/registro?mes=${J_MES}`); }catch(err){ J_REG={error:err.message}; } jgPintar(); }
setInterval(()=>{ const s=$("#s-jornada"); if(s&&!s.hidden&&!document.hidden) jgPlantilla(); },30000);
function jgPintar(){
  const box=$("#jg"); if(!box) return;
  const ps=J_PL&&J_PL.personas||[], g=k=>ps.filter(p=>p.estado===k);
  const card=p=>`<div class="jg-p ${p.estado}"><i></i><div><b>${esc(p.nombre)}</b><small>${p.estado==="fuera"?(p.hoy.salida?`Salió a las ${jHM(p.hoy.salida)}`:"No ha fichado hoy"):`Desde las ${jHM(p.desde)}`}${p.olvido?` · <em>sin salida el ${esc(fecha(p.olvido))}</em>`:""}</small></div><span class="num">${jH(p.hoy.trabajoMin)}</span></div>`;
  const col=(k,t,xs)=>`<section class="jg-col ${k}"><h3>${t} <span class="num">${xs.length}</span></h3>${xs.map(card).join("")||'<p class="hint">Nadie.</p>'}</section>`;
  const reg=J_REG&&J_REG.personas||[], sel=J_UID?reg.filter(p=>p.uid===J_UID):reg;
  const inc=reg.flatMap(p=>p.dias.filter(d=>d.incidencias.length).map(d=>({p,d})));
  box.innerHTML=`${J_PL&&J_PL.error?`<div class="msg bad">${esc(J_PL.error)}</div>`:""}
    <div class="jg-live">${col("trabajando","🟢 Trabajando",g("trabajando"))}${col("pausa","🟡 En pausa",g("pausa"))}${col("fuera","🔴 Fuera de jornada",g("fuera"))}</div>
    <section class="card jg-reg"><div class="jg-rh"><h3>Registro de jornada</h3>
      <div class="mesnav"><button type="button" data-jgmes-mov="-1" aria-label="Mes anterior">‹</button><b>${esc(nombreMes(J_MES))}</b><button type="button" data-jgmes-mov="1" aria-label="Mes siguiente">›</button></div>
      <select class="in" id="jg-uid" aria-label="Trabajador"><option value="">Todo el equipo</option>${reg.map(p=>`<option value="${esc(p.uid)}" ${p.uid===J_UID?"selected":""}>${esc(p.nombre)}</option>`).join("")}</select>
      <div class="quick"><button type="button" class="btn b-brand b-sm" data-jgxlsx>Excel (.xlsx)</button><button type="button" class="btn b-ghost b-sm" data-jgpdf="${esc(J_UID)}" data-jgmes="${esc(J_MES)}">PDF para firmar</button></div></div>
      ${J_REG&&J_REG.error?`<div class="msg bad">${esc(J_REG.error)}</div>`:!J_REG?'<p class="hint">Cargando…</p>':J_UID?sel.map(p=>jTablaDias(p,true)).join(""):`<div class="tabla-wrap"><table class="tabla j-tab"><thead><tr><th>Trabajador</th><th class="n">Días</th><th class="n">Trabajado</th><th class="n">Ordinarias</th><th class="n">Extra</th><th class="n">Pausas</th><th class="n">Incidencias</th><th></th></tr></thead><tbody>
        ${reg.map(p=>`<tr><td><b>${esc(p.nombre)}</b><small> · ${String(p.jornadaH).replace(".",",")} h/día</small></td><td class="n num">${p.total.diasTrabajados}</td><td class="n num"><b>${jH(p.total.trabajoMin)}</b></td><td class="n num">${jH(p.total.ordinariasMin)}</td><td class="n num">${p.total.extraMin?jH(p.total.extraMin):"—"}</td><td class="n num">${jH(p.total.pausaMin)}</td><td class="n num">${p.total.incidencias||""}</td><td><button type="button" class="chipb" data-jguid="${esc(p.uid)}">Ver días</button></td></tr>`).join("")||'<tr><td colspan="8" class="hint">Sin fichajes este mes.</td></tr>'}</tbody></table></div>`}
      <p class="hint">Horas extra = lo trabajado por encima de la jornada diaria de cada persona (Taller → Equipo y ajustes). La hora de cada fichaje la pone el servidor. Nada se borra: las correcciones quedan con su motivo.</p></section>
    ${inc.length?`<section class="card"><h3>Incidencias del mes <span class="chip rojo">${inc.length}</span></h3>${inc.map(({p,d})=>`<button type="button" class="t-al ambar" data-jgdia="${esc(p.uid)}|${esc(d.fecha)}">${esc(p.nombre)} · ${esc(fecha(d.fecha))}: ${esc(d.incidencias.join(", "))}</button>`).join("")}</section>`:""}
    <div class="jg-dos">
      <section class="card"><h3>Cartel QR / NFC del taller</h3><p class="hint">Pégalo en la entrada del taller. Cada trabajador lo escanea con su móvil (ya de confianza) y ficha en 1 segundo: entrada o vuelta de la pausa directas; si está trabajando, elige pausa o salida.</p>
        <div class="quick"><button type="button" class="btn b-brand b-sm" data-jgqr>Ver e imprimir el cartel</button><button type="button" class="btn b-ghost b-sm" data-jgqrnuevo>Cambiar el código</button></div></section>
      <section class="card"><h3>Acceso y seguridad</h3><p class="hint">Google Authenticator del equipo, dispositivos de confianza (30 días) y accesos raros.</p><div class="quick"><button type="button" class="btn b-ghost b-sm" data-jgacc>Abrir</button><button type="button" class="btn b-ghost b-sm" data-jglibro>Comprobar el libro</button></div></section>
    </div>`;
}
document.addEventListener("click",async e=>{ const t=e.target;
  const mv=t.closest("[data-jgmes-mov]"); if(mv){ const [y,m]=J_MES.split("-").map(Number), d=new Date(Date.UTC(y,m-1+ +mv.dataset.jgmesMov,1)); J_MES=d.toISOString().slice(0,7); J_REG=null; jgPintar(); jgRegistro(); return; }
  const u=t.closest("[data-jguid]"); if(u){ J_UID=u.dataset.jguid; jgPintar(); return; }
  const dd=t.closest("[data-jgdia]"); if(dd){ const [uid,f]=dd.dataset.jgdia.split("|"); jgDia(uid,f); return; }
  if(t.closest("[data-jgxlsx]")){ jgXlsx(); return; }
  const pdf=t.closest("[data-jgpdf]"); if(pdf){ jgPdf(pdf.dataset.jgpdf,pdf.dataset.jgmes); return; }
  if(t.closest("[data-jgqr]")){ jgCartel(false); return; }
  if(t.closest("[data-jgqrnuevo]")){ if(confirm("¿Cambiar el código? El cartel y las pegatinas NFC actuales dejarán de valer: tendrás que imprimir el nuevo.")) jgCartel(true); return; }
  if(t.closest("[data-jgacc]")){ jgAcceso(); return; }
  if(t.closest("[data-jglibro]")){ try{ const r=await api("/api/jornada/libro"); toast(r.integro?`Libro íntegro: ${r.total} apuntes encadenados, nadie los ha tocado`:`⚠ El libro se ha tocado por fuera del panel (apuntes ${r.rotas.join(", ")})`); }catch(err){ toast(err.message); } return; }
});
document.addEventListener("change",e=>{ if(e.target.id==="jg-uid"){ J_UID=e.target.value; jgPintar(); } });

/* ---------- ver y corregir un día ---------- */
async function jgDia(uid,f){
  let d=$("#dlg-jdia"); if(!d){ d=document.createElement("dialog"); d.id="dlg-jdia"; d.className="t-dlg fn-dlg"; document.body.appendChild(d); }
  d.innerHTML='<p class="hint">Cargando…</p>'; d.showModal();
  const pint=r=>{ const anul=new Set(r.dia.eventos.filter(x=>x.tipo==="anulacion").map(x=>x.anula)), nom=(J_REG&&J_REG.personas.find(p=>p.uid===uid)||{}).nombre||"";
    d.innerHTML=`<h2>${esc(nom)} · ${esc(fecha(f))}</h2><p class="hint">Trabajado ${jH(r.calc.trabajoMin)} · pausas ${jH(r.calc.pausaMin)}${r.calc.extraMin?" · extra "+jH(r.calc.extraMin):""}${r.calc.incidencias.length?" · <b>"+esc(r.calc.incidencias.join(", "))+"</b>":""}</p>
      <div class="tabla-wrap"><table class="tabla j-tab"><thead><tr><th>#</th><th>Hora</th><th>Fichaje</th><th>Cómo</th><th>Registrado</th></tr></thead><tbody>${r.dia.eventos.map(x=>`<tr class="${anul.has(x.n)?"j-anul":""}"><td class="num">${x.n}</td><td class="num"><b>${jHM(x.t)}</b></td><td>${x.tipo==="anulacion"?`Anula el #${x.anula}`:J_TXT[x.tipo]}${x.motivo?`<br><small>${esc(x.motivo)}</small>`:""}</td><td><small>${esc(J_VIA[x.via]||x.via)}${x.disp?" · "+esc(x.disp):""}${x.ip?" · "+esc(x.ip):""}</small></td><td><small>${esc(x.nombre||"")} · ${esc(fechaHora(x.reg))}</small></td></tr>`).join("")||'<tr><td colspan="5" class="hint">Sin fichajes.</td></tr>'}</tbody></table></div>
      <form id="jg-corr" class="jg-corr"><h3>Corregir (queda registrado con tu nombre y el motivo)</h3>
        <div class="t-g2"><div class="field"><label>Qué</label><select class="in" name="que"><option value="add">Añadir un fichaje olvidado</option>${r.dia.eventos.filter(x=>x.tipo!=="anulacion"&&!anul.has(x.n)).map(x=>`<option value="${x.n}">Anular #${x.n} (${J_TXT[x.tipo]} ${jHM(x.t)})</option>`).join("")}</select></div>
        <div class="field"><label>Tipo y hora</label><div style="display:flex;gap:6px"><select class="in" name="tipo">${["entrada","pausa","reanudar","salida"].map(k=>`<option value="${k}">${J_TXT[k]}</option>`).join("")}</select><input class="in num" type="time" name="hora"></div></div></div>
        <div class="field"><label>Motivo *</label><input class="in" name="motivo" maxlength="300" placeholder="Ej.: olvidó fichar la salida; confirmado con el trabajador" required></div>
        <div class="msg bad" id="jg-err" hidden></div>
        <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-jgcerrar>Cerrar</button><button class="btn b-acc">Guardar corrección</button></div></form>`;
    d.querySelector("[data-jgcerrar]").onclick=()=>d.close();
    d.querySelector("#jg-corr").onsubmit=async ev=>{ ev.preventDefault(); const fd=Object.fromEntries(new FormData(ev.target));
      const b=fd.que==="add"?{uid,fecha:f,tipo:fd.tipo,hora:fd.hora,motivo:fd.motivo}:{uid,fecha:f,anular:+fd.que,motivo:fd.motivo};
      try{ const r2=await api("/api/jornada/corregir",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)}); toast("Corrección guardada"); pint(r2); jgRegistro(); jgPlantilla(); }
      catch(err){ const m=d.querySelector("#jg-err"); m.textContent=err.message; m.hidden=false; } }; };
  try{ pint(await api(`/api/jornada/dia?uid=${encodeURIComponent(uid)}&fecha=${f}`)); }catch(err){ d.innerHTML=`<p class="msg bad">${esc(err.message)}</p><button class="btn b-ghost" onclick="this.closest('dialog').close()">Cerrar</button>`; }
}

/* ---------- acceso: 2FA del equipo, dispositivos de confianza, accesos raros ---------- */
async function jgAcceso(){ DW={tipo:"jornada",id:"acc"}; abrirDrawer('<div class="empty">Cargando…</div>');
  try{ J_ACC=await api("/api/jornada/acceso"); jgAccPintar(); }catch(err){ $("#dw-body").innerHTML=`<div class="empty">${esc(err.message)}</div>`; } }
function jgAccPintar(){ const a=J_ACC, eq=(J_REG&&J_REG.personas)||[], TIPOS={"login-fallo":"PIN o contraseña mal","2fa-fallo":"Código 2FA mal",bloqueo:"Conexión bloqueada",inusual:"Hora poco habitual",recuperacion:"Código de recuperación usado","qr-invalido":"QR que no vale",trampa:"Robot"};
  $("#dw-body").innerHTML=`<div class="dw-head"><div><span class="tipo taller">Jornada</span><h2 class="dw-nombre" style="margin:0">Acceso y seguridad</h2></div><button class="x" type="button" data-cerrar aria-label="Cerrar">✕</button></div>
    <section class="dw-box"><h3>Google Authenticator del equipo</h3><label class="t-chk"><input type="checkbox" data-jgexige ${a.exige2fa?"checked":""}><span>Obligatorio para el equipo en cada dispositivo nuevo (después, 30 días de confianza en ese dispositivo)</span></label>
      ${eq.map(p=>`<div class="jg-row"><span><b>${esc(p.nombre)}</b><small>${a.totp[p.uid]?"✓ Vinculado":"Se vinculará al entrar"}</small></span>${a.totp[p.uid]?`<button type="button" class="btn b-ghost b-sm" data-jgreset="${esc(p.uid)}">Restablecer (perdió el móvil)</button>`:""}</div>`).join("")}</section>
    <section class="dw-box"><h3>Dispositivos de confianza <span class="num">${a.dispositivos.length}</span></h3>${a.dispositivos.map(x=>`<div class="jg-row"><span><b>${esc(x.nombre)}</b><small>${esc(x.disp)} · ${esc(x.ip)} · desde ${esc(fechaHora(x.t))} · caduca ${esc(fecha(new Date(x.exp).toISOString().slice(0,10)))}</small></span><button type="button" class="btn b-ghost b-sm" data-jgolv="${esc(x.id)}">Olvidar</button></div>`).join("")||'<p class="hint">Ninguno.</p>'}
      ${a.dispositivos.length?'<button type="button" class="btn b-bad b-sm" data-jgolvtodos>Olvidar todos</button>':""}</section>
    <section class="dw-box"><h3>Accesos raros (30 días)</h3>${a.raros.map(x=>`<div class="jg-row"><span><b>${esc(TIPOS[x.tipo]||x.tipo)}</b><small>${esc(fechaHora(x.t))} · ${esc(x.disp)} · ${esc(x.ip)}${x.pais?" · "+esc(x.pais):""}${x.txt?" · "+esc(x.txt):""}</small></span></div>`).join("")||'<p class="hint">Nada raro.</p>'}</section>`; }
$("#dw-body").addEventListener("click",async e=>{ if(!DW||DW.tipo!=="jornada") return; const t=e.target;
  const post=async b=>{ await api("/api/jornada/acceso",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b)}); J_ACC=await api("/api/jornada/acceso"); jgAccPintar(); };
  try{ const r=t.closest("[data-jgreset]"); if(r){ if(!confirm("¿Restablecer? La próxima vez que entre tendrá que vincular el móvil de nuevo.")) return; await post({accion:"reset2fa",uid:r.dataset.jgreset}); toast("Restablecido"); return; }
    const o=t.closest("[data-jgolv]"); if(o){ await post({accion:"olvidar",id:o.dataset.jgolv}); toast("Dispositivo olvidado"); return; }
    if(t.closest("[data-jgolvtodos]")){ if(!confirm("¿Olvidar todos? A todos les pedirá el código otra vez.")) return; await post({accion:"olvidar",todos:true}); toast("Todos olvidados"); return; }
  }catch(err){ toast(err.message); } });
$("#dw-body").addEventListener("change",async e=>{ if(!DW||DW.tipo!=="jornada"||!e.target.matches("[data-jgexige]")) return;
  try{ await api("/api/jornada/acceso",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({accion:"exigir",si:e.target.checked})}); toast(e.target.checked?"2FA obligatoria para el equipo":"2FA del equipo desactivada"); }catch(err){ toast(err.message); } });

/* ---------- cartel QR para imprimir ---------- */
async function jgCartel(nuevo){ try{ const r=await api("/api/jornada/qr",nuevo?{method:"POST",headers:{"content-type":"application/json"},body:"{}"}:{});
    jgImprimir(`<div class="jp-cartel"><small>VOLCANO CARS · TALLER</small><h1>Ficha aquí</h1><p>Abre la cámara del móvil y apunta al código.<br>Entrada y vuelta de la pausa: <b>automáticas</b>. Si estás trabajando, eliges pausa o salida.</p>
      <div class="jp-qr">${QR.svg(r.url,420)}</div><p class="jp-pie">¿Tienes NFC? Acerca el móvil a la pegatina.<br><small>Código válido desde ${esc(fechaHora(r.desde))}. Si se pierde el cartel, el gerente lo cambia y este deja de valer.</small></p></div>`,"Cartel de fichaje");
    if(nuevo) toast("Código nuevo: imprime el cartel y reescribe la pegatina NFC con el enlace nuevo");
    if(navigator.clipboard) navigator.clipboard.writeText(r.url).catch(()=>{});
  }catch(err){ toast(err.message); } }

/* ---------- PDF para firmar (uno por trabajador y mes) ---------- */
async function jgPdf(uid,mes){ try{ mes=mes||J_MES; const r=await api(`/api/jornada/registro?mes=${mes}${uid?"&uid="+encodeURIComponent(uid):""}`);
    const ps=r.personas.filter(p=>p.dias.length||uid); if(!ps.length) return toast("Sin fichajes en ese mes");
    jgImprimir(ps.map(p=>`<section class="jp-hoja"><header><div><small>REGISTRO DIARIO DE JORNADA · art. 34.9 del Estatuto de los Trabajadores</small><h1>${esc(nombreMes(mes))}</h1></div><div class="jp-emp"><b>Volcano Cars</b><br>${esc(typeof EMPRESA_DIR!=="undefined"?EMPRESA_DIR:"Calle Valle Largo, Nave 8, 35610 Antigua (Las Palmas)")}</div></header>
      <div class="jp-dat"><span>Trabajador: <b>${esc(p.nombre)}</b></span><span>Puesto: <b>${esc({mecanico:"Mecánico",calidad:"Calidad",recepcion:"Recepción",gerente:"Gerente"}[p.rol]||p.rol)}</b></span><span>Jornada: <b>${String(p.jornadaH).replace(".",",")} h/día</b></span></div>
      <table><thead><tr><th>Día</th><th>Entrada</th><th>Pausas</th><th>Salida</th><th>Pausa</th><th>Trabajado</th><th>Ordinarias</th><th>Extra</th><th>Observaciones</th></tr></thead><tbody>
      ${p.dias.map(d=>{ const v=d.eventos.filter(x=>x.tipo!=="anulacion"&&!d.eventos.some(a=>a.tipo==="anulacion"&&a.anula===x.n)).sort((a,b)=>a.t.localeCompare(b.t));
        const pz=[]; v.forEach((x,i)=>{ if(x.tipo==="pausa"){ const vu=v.slice(i+1).find(y=>y.tipo==="reanudar"||y.tipo==="salida"); pz.push(jHM(x.t)+"–"+(vu?jHM(vu.t):"…")); } });
        return `<tr><td>${esc(fecha(d.fecha))}</td><td>${jHM(d.entrada)}</td><td>${esc(pz.join(", "))}</td><td>${d.abierta?"—":jHM(d.salida)}</td><td>${jH(d.pausaMin)}</td><td><b>${jH(d.trabajoMin)}</b></td><td>${jH(d.ordinariasMin)}</td><td>${d.extraMin?jH(d.extraMin):""}</td><td>${esc([...d.incidencias,d.correcciones||d.anulaciones?`${d.correcciones+d.anulaciones} corrección(es) con motivo`:""].filter(Boolean).join(" · "))}</td></tr>`; }).join("")}
      </tbody><tfoot><tr><th colspan="4">Total del mes · ${p.total.diasTrabajados} días</th><th>${jH(p.total.pausaMin)}</th><th>${jH(p.total.trabajoMin)}</th><th>${jH(p.total.ordinariasMin)}</th><th>${jH(p.total.extraMin)}</th><th></th></tr></tfoot></table>
      <p class="jp-legal">Horas registradas con la hora del servidor en el momento de cada fichaje; las correcciones se hacen añadiendo o anulando fichajes con motivo, sin borrar el original, y figuran en el Excel de fichajes. Este registro se conserva 4 años y está a disposición del trabajador, de sus representantes y de la Inspección de Trabajo. Horas extraordinarias: las que superan la jornada diaria indicada.</p>
      <div class="jp-firmas"><div><span></span>Firma de la empresa</div><div><span></span>Firma del trabajador · recibí</div></div><small class="jp-gen">Generado el ${esc(new Date().toLocaleString("es-ES",{timeZone:"Atlantic/Canary"}))}</small></section>`).join(""),"Registro de jornada "+mes);
  }catch(err){ toast(err.message); } }
function jgImprimir(html,titulo){ let box=$("#j-print"); if(!box){ box=document.createElement("div"); box.id="j-print"; document.body.appendChild(box); }
  box.innerHTML=html; const t=document.title; document.title=titulo; document.body.classList.add("print-jornada");
  const fin=()=>{ document.body.classList.remove("print-jornada"); document.title=t; box.innerHTML=""; removeEventListener("afterprint",fin); };
  addEventListener("afterprint",fin); window.print(); setTimeout(()=>{ if(!matchMedia("print").matches&&document.body.classList.contains("print-jornada")) fin(); },60000); }

/* ---------- Excel .xlsx de verdad (sin librerías: ZIP «store» + CRC32) ---------- */
const J_CRC=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; t[n]=c>>>0; } return t; })();
function jCrc(b){ let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=J_CRC[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function jZip(files){ const enc=new TextEncoder(), partes=[], dir=[]; let off=0;
  const u16=n=>[n&255,(n>>>8)&255], u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
  for(const [nombre,txt] of files){ const nb=enc.encode(nombre), d=enc.encode(txt), crc=jCrc(d);
    const cab=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(d.length),...u32(d.length),...u16(nb.length),...u16(0)]);
    partes.push(cab,nb,d);
    dir.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(0),...u16(0x21),...u32(crc),...u32(d.length),...u32(d.length),...u16(nb.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(off)]),nb);
    off+=cab.length+nb.length+d.length; }
  const tam=dir.reduce((a,x)=>a+x.length,0);
  return new Blob([...partes,...dir,new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(tam),...u32(off),...u16(0)])],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}); }
function jXlsx(hojas){ // hojas: [[nombre,[[celdas]]]]; números como número, texto como texto (fila 1 en negrita)
  const x=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"");
  const col=i=>{ let s=""; i++; while(i){ const m=(i-1)%26; s=String.fromCharCode(65+m)+s; i=Math.floor((i-1)/26); } return s; };
  const hoja=filas=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetData>${filas.map((f,r)=>`<row r="${r+1}">${f.map((v,c)=>{ const ref=col(c)+(r+1), st=r===0?' s="1"':"";
    return typeof v==="number"&&isFinite(v)?`<c r="${ref}"${st}><v>${v}</v></c>`:`<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${x(v??"")}</t></is></c>`; }).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const files=[["[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${hojas.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`],
    ["_rels/.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${hojas.map(([n],i)=>`<sheet name="${x(n).slice(0,31)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")}</sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${hojas.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")}<Relationship Id="rId${hojas.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`],
    ...hojas.map(([,f],i)=>[`xl/worksheets/sheet${i+1}.xml`,hoja(f)])];
  return jZip(files); }
async function jgXlsx(){ try{ const r=await api(`/api/jornada/registro?mes=${J_MES}${J_UID?"&uid="+encodeURIComponent(J_UID):""}`);
    const res=[["Trabajador","Días trabajados","Horas trabajadas","Horas ordinarias","Horas extra","Horas de pausa","Incidencias"]], dias=[["Trabajador","Fecha","Entrada","Salida","Nº pausas","Horas de pausa","Horas trabajadas","Horas ordinarias","Horas extra","Incidencias","Correcciones"]], fich=[["Trabajador","Fecha","Nº","Fichaje","Hora efectiva","Registrado (servidor)","Vía","Dispositivo","Conexión","Anulado","Hecho por","Motivo"]];
    for(const p of r.personas){ res.push([p.nombre,p.total.diasTrabajados,jHdec(p.total.trabajoMin),jHdec(p.total.ordinariasMin),jHdec(p.total.extraMin),jHdec(p.total.pausaMin),p.total.incidencias]);
      for(const d of p.dias){ dias.push([p.nombre,d.fecha,jHM(d.entrada),d.abierta?"":jHM(d.salida),d.pausas,jHdec(d.pausaMin),jHdec(d.trabajoMin),jHdec(d.ordinariasMin),jHdec(d.extraMin),d.incidencias.join(" · "),d.correcciones+d.anulaciones]);
        const an=new Set(d.eventos.filter(x=>x.tipo==="anulacion").map(x=>x.anula));
        for(const x of d.eventos) fich.push([p.nombre,d.fecha,x.n,x.tipo==="anulacion"?`Anula el nº ${x.anula}`:J_TXT[x.tipo],jHM(x.t),new Date(x.reg).toLocaleString("es-ES",{timeZone:"Atlantic/Canary"}),J_VIA[x.via]||x.via,x.disp||"",x.ip||"",an.has(x.n)?"Sí":"",x.nombre||"",x.motivo||""]); } }
    const b=jXlsx([["Resumen",res],["Días",dias],["Fichajes",fich]]), a=document.createElement("a");
    a.href=URL.createObjectURL(b); a.download=`registro-jornada-${J_MES}${J_UID?"-"+J_UID:""}.xlsx`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
  }catch(err){ toast(err.message); } }
