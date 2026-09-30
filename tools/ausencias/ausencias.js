/* =====================================================================
   AUSENCIAS · RRHH (tools/ausencias) — se copia dentro de admin.html con python3 tools/ausencias/inyectar.py
   · Trabajador: en su pantalla de fichaje, botón «Ausencias y permisos»: comunica una baja, cita médica, permiso,
     vacaciones… con fechas, motivo y documentos (foto o PDF). Ve la respuesta del gerente y puede completar la información.
   · Gerente: en la pestaña «Jornada», arriba: quién falta hoy, solicitudes por revisar (aprobar / rechazar / pedir más
     información), historial filtrable y registro de ausencias a nombre de otra persona. Aviso arriba en todo el panel.
   · Los documentos solo los ve su dueño y el gerente (no salen del panel, nunca en cachés).
   ===================================================================== */
let AU_M=null, AU_G=null, AU_TAB="revisar", AU_F={estado:"",uid:"",mes:""}, AU_INIT=0, AU_DOCS=[], AU_BUSY=false;
const AU_EST={pendiente:"Pendiente",aprobada:"Aprobada",rechazada:"Rechazada","pide-info":"Falta información",cancelada:"Cancelada"};
const AU_ICO={"baja-medica":"🩺","cita-medica":"🏥","permiso-retribuido":"📄",vacaciones:"🏖️","asuntos-propios":"🗂️","deber-publico":"⚖️",retraso:"⏰",otro:"✉️"};
const auGer=()=>!ME||!ME.equipo||ME.rol==="gerente";
const auPost=(ruta,b)=>api("/api/ausencias/"+ruta,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(b||{})});
const auChip=e=>`<span class="chip au-${esc(e)}">${esc(AU_EST[e]||e)}</span>`;
const auRango=s=>s.desde===s.hasta?fecha(s.desde)+(s.horaDesde&&s.horaHasta?` · ${s.horaDesde}–${s.horaHasta}`:""):`${fecha(s.desde)} → ${fecha(s.hasta)}`;
const auDias=s=>s.desde===s.hasta&&s.horaDesde?"unas horas":s.dias===1?"1 día":`${s.dias} días`;
const auKB=n=>n>1048576?(n/1048576).toFixed(1).replace(".",",")+" MB":Math.max(1,Math.round(n/1024))+" KB";
const auTipos=()=>(AU_M&&AU_M.tipos)||Object.entries(AU_ICO).map(([k,i])=>[k,k,"","opcional",i]);
const auTipoTxt=k=>{ const t=auTipos().find(x=>x[0]===k); return t?t[1]:k; };
function auDlg(id,cls){ let d=$("#"+id); if(!d){ d=document.createElement("dialog"); d.id=id; d.className="t-dlg fn-dlg "+(cls||""); document.body.appendChild(d); } return d; }

/* ---------- documentos: ver (con la sesión, sin enlaces públicos) ---------- */
async function auSubir(file){
  const pdf=file.type==="application/pdf"||/\.pdf$/i.test(file.name);
  const blob=pdf?file:await shrink(file), mime=pdf?"application/pdf":"image/jpeg";
  if(blob.size>4*1024*1024) throw new Error("«"+file.name+"» pesa más de 4 MB.");
  const r=await api("/api/ausencias/subir",{method:"POST",headers:{"content-type":mime,"x-nombre":encodeURIComponent(file.name)},body:blob});
  return {key:r.key,nombre:r.nombre,mime:r.mime,size:r.size};
}
async function auVerDoc(key,nombre){
  const d=auDlg("dlg-au-doc","au-dlg au-vdlg"); d.innerHTML='<div class="t-dlg-in"><p class="hint">Abriendo el documento…</p></div>'; if(!d.open) d.showModal();
  try{ const r=await fetch("/api/ausencias/doc/"+encodeURIComponent(key),{headers:{authorization:"Bearer "+PW}}); if(!r.ok) throw new Error("No se ha podido abrir el documento.");
    const b=await r.blob(), u=URL.createObjectURL(b), pdf=b.type==="application/pdf";
    d.innerHTML=`<div class="t-dlg-in"><h2>${esc(nombre||"Documento")}</h2><div class="au-visor">${pdf?`<iframe src="${u}" title="${esc(nombre||"PDF")}"></iframe>`:`<img src="${u}" alt="${esc(nombre||"Documento")}">`}</div>
      <div class="t-dlg-acts"><a class="btn b-ghost" href="${u}" target="_blank" rel="noopener">Abrir en pestaña nueva</a><button type="button" class="btn b-acc" data-aucerrar>Cerrar</button></div></div>`;
    d.querySelector("[data-aucerrar]").onclick=()=>d.close(); d.addEventListener("close",()=>URL.revokeObjectURL(u),{once:true});
  }catch(err){ d.innerHTML=`<div class="t-dlg-in"><p class="msg bad">${esc(err.message)}</p><div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-aucerrar>Cerrar</button></div></div>`; d.querySelector("[data-aucerrar]").onclick=()=>d.close(); }
}
const auDocChips=(docs,quitar)=>docs.map((x,i)=>`<span class="au-doc"><button type="button" data-audoc="${esc(x.key)}" data-aunom="${esc(x.nombre)}" title="Ver"><span aria-hidden="true">${x.mime==="application/pdf"?"📄":"🖼️"}</span> ${esc(x.nombre)} <small>${auKB(x.size)}</small></button>${quitar?`<button type="button" class="au-x" data-auquitar="${i}" aria-label="Quitar ${esc(x.nombre)}">✕</button>`:""}</span>`).join("");

/* ---------- formulario (trabajador y gerente) ---------- */
function auForm(d,opts){ // opts: {volver, admin, responder: id}
  AU_DOCS=[]; const admin=!!opts.admin, resp=opts.responder||"", tipos=auTipos();
  d.innerHTML=`<form class="t-dlg-in au-form" novalidate>
    <h2>${resp?"Responder al gerente":admin?"Registrar una ausencia":"Comunicar una ausencia"}</h2>
    ${resp?`<p class="hint">Escribe lo que te pide o adjunta el documento. Volverá a su bandeja de pendientes.</p>`:`<p class="hint">${admin?"La ausencia queda a nombre del trabajador, con tu nombre como quien la registró.":"Cuéntanos qué ha pasado: el gerente lo verá a primera hora y te responderá aquí mismo."}</p>`}
    ${resp?"":`${admin?`<div class="field"><label for="au-uid">Trabajador *</label><select class="in" id="au-uid">${((AU_G&&AU_G.equipo)||[]).map(p=>`<option value="${esc(p.uid)}">${esc(p.nombre)}</option>`).join("")||'<option value="">Aún no hay trabajadores dados de alta</option>'}</select></div>`:""}
    <div class="field"><label>¿Qué tipo de ausencia es? *</label><div class="au-tipos" role="radiogroup" aria-label="Tipo de ausencia">${tipos.map(t=>`<button type="button" role="radio" aria-checked="false" data-autipo="${esc(t[0])}"><span class="au-ti" aria-hidden="true">${t[4]||AU_ICO[t[0]]||""}</span><b>${esc(t[1])}</b><small>${esc(t[2]||"")}</small></button>`).join("")}</div></div>
    <div class="t-g2"><div class="field"><label for="au-d">Desde *</label><input class="in" type="date" id="au-d" value="${hoyC()}"></div><div class="field"><label for="au-h">Hasta *</label><input class="in" type="date" id="au-h" value="${hoyC()}"></div></div>
    <div class="au-rap"><button type="button" class="chipb" data-aurap="hoy">Solo hoy</button><button type="button" class="chipb" data-aurap="man">Solo mañana</button><button type="button" class="chipb" data-aurap="sem">Toda esta semana</button></div>
    <label class="t-chk au-hrs" id="au-hrs-l"><input type="checkbox" id="au-hrs"><span>Solo unas horas del día</span></label>
    <div class="t-g2" id="au-hrs-b" hidden><div class="field"><label for="au-hd">De las</label><input class="in num" type="time" id="au-hd"></div><div class="field"><label for="au-hh">Hasta las</label><input class="in num" type="time" id="au-hh"></div></div>`}
    <div class="field"><label for="au-mo">${resp?"Tu respuesta":"Motivo"} <span class="au-op" id="au-mo-op">(opcional)</span></label><textarea class="in" id="au-mo" rows="3" maxlength="${resp?600:800}" placeholder="${resp?"Ej.: Adjunto el justificante que faltaba.":"Cuéntalo con tus palabras, sin detalles médicos si no quieres."}"></textarea></div>
    <div class="field au-adj"><label>Documentación <span class="au-op">(foto o PDF, hasta 4 MB cada uno)</span></label>
      <p class="hint" id="au-dochint" style="margin:0">${resp?"Adjunta lo que te ha pedido el gerente.":"Elige un tipo para ver qué documento conviene adjuntar."}</p>
      <div class="au-docs" id="au-docs"></div>
      <label class="btn b-ghost au-file"><span aria-hidden="true">📎</span> Hacer foto o elegir archivo<input type="file" id="au-fi" accept="image/*,application/pdf" multiple hidden></label></div>
    ${admin&&!resp?`<label class="t-chk"><input type="checkbox" id="au-apr"><span>Dejarla ya aprobada</span></label><div class="field" id="au-ret-b" hidden><label for="au-ret">Retribución</label><select class="in" id="au-ret"><option value="">Sin especificar</option><option value="si">Con sueldo</option><option value="no">Sin sueldo</option></select></div>`:""}
    <div class="msg bad" id="au-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-auvolver>${opts.volver?"← Volver":"Cancelar"}</button><button type="submit" class="btn b-acc" id="au-ok">${resp?"Enviar respuesta":admin?"Registrar":"Enviar al gerente"}</button></div></form>`;
  const f=d.querySelector("form"), err=t=>{ const m=$("#au-err"); m.textContent=t||""; m.hidden=!t; }, docsPintar=()=>{ $("#au-docs").innerHTML=auDocChips(AU_DOCS,true); };
  let tipo="";
  const tipoSel=k=>{ tipo=k; f.querySelectorAll("[data-autipo]").forEach(b=>b.setAttribute("aria-checked",String(b.dataset.autipo===k)));
    const t=auTipos().find(x=>x[0]===k)||[], rec=t[3]==="recomendado";
    $("#au-dochint").innerHTML=k==="baja-medica"?"Adjunta el <b>parte de baja</b>. Si todavía no lo tienes, envía ya el aviso y súbelo después desde «Mis ausencias».":rec?"Conviene adjuntar el <b>justificante</b>. Si no lo tienes ahora, podrás añadirlo después.":"No hace falta documento, pero puedes añadir uno si ayuda.";
    $("#au-mo-op").textContent=k==="otro"||k==="retraso"?"(obligatorio)":"(opcional)"; if(k==="vacaciones"&&$("#au-d").value===hoyC()){ /* nada: que elija */ } };
  d.querySelector("[data-auvolver]").onclick=()=>{ if(opts.volver) opts.volver(); else d.close(); };
  if(!resp){
    f.querySelectorAll("[data-autipo]").forEach(b=>b.onclick=()=>tipoSel(b.dataset.autipo));
    const suma=n=>{ const x=new Date(hoyC()+"T12:00:00Z"); x.setUTCDate(x.getUTCDate()+n); return x.toISOString().slice(0,10); };
    const horas=()=>{ const uno=$("#au-d").value&&$("#au-d").value===$("#au-h").value; $("#au-hrs-l").hidden=!uno; if(!uno){ $("#au-hrs").checked=false; } $("#au-hrs-b").hidden=!($("#au-hrs").checked&&uno); };
    f.querySelectorAll("[data-aurap]").forEach(b=>b.onclick=()=>{ const k=b.dataset.aurap; const dw=new Date(hoyC()+"T12:00:00Z").getUTCDay(); $("#au-d").value=k==="man"?suma(1):hoyC(); $("#au-h").value=k==="sem"?suma(dw===0?0:7-dw):$("#au-d").value; horas(); });
    $("#au-d").onchange=()=>{ if($("#au-h").value<$("#au-d").value) $("#au-h").value=$("#au-d").value; horas(); }; $("#au-h").onchange=horas; $("#au-hrs").onchange=horas; horas();
    const ap=$("#au-apr"); if(ap) ap.onchange=()=>{ $("#au-ret-b").hidden=!ap.checked; };
  }
  $("#au-fi").onchange=async ev=>{ const fs=[...ev.target.files]; ev.target.value=""; if(!fs.length) return; err(""); const ok=$("#au-ok"); ok.disabled=true; const tx=ok.textContent; ok.textContent="Subiendo…";
    for(const fl of fs){ if(AU_DOCS.length>=6){ err("Máximo 6 documentos."); break; } try{ AU_DOCS.push(await auSubir(fl)); docsPintar(); }catch(e){ err(e.message); } }
    ok.disabled=false; ok.textContent=tx; };
  f.addEventListener("click",e=>{ const q=e.target.closest("[data-auquitar]"); if(q){ AU_DOCS.splice(+q.dataset.auquitar,1); docsPintar(); return; } const v=e.target.closest("[data-audoc]"); if(v){ e.preventDefault(); auVerDoc(v.dataset.audoc,v.dataset.aunom); } });
  f.onsubmit=async ev=>{ ev.preventDefault(); if(AU_BUSY) return; err("");
    const mo=$("#au-mo").value.trim(), docs=AU_DOCS.map(x=>x.key);
    let body,ruta;
    if(resp){ if(!mo&&!docs.length) return err("Escribe tu respuesta o adjunta un documento."); ruta="responder/"+resp; body={texto:mo,docs}; }
    else { if(!tipo) return err("Elige el tipo de ausencia."); if(!$("#au-d").value||!$("#au-h").value) return err("Pon las fechas."); if($("#au-h").value<$("#au-d").value) return err("La fecha de fin no puede ser anterior a la de inicio.");
      if((tipo==="otro"||tipo==="retraso")&&mo.length<5) return err("Cuéntanos brevemente el motivo.");
      const hrs=$("#au-hrs").checked&&!$("#au-hrs-b").hidden; if(hrs&&(!$("#au-hd").value||!$("#au-hh").value)) return err("Pon la hora de inicio y la de fin.");
      ruta="crear"; body={tipo,desde:$("#au-d").value,hasta:$("#au-h").value,motivo:mo,docs,...(hrs?{horaDesde:$("#au-hd").value,horaHasta:$("#au-hh").value}:{})};
      if(admin){ body.uid=$("#au-uid").value; if($("#au-apr")&&$("#au-apr").checked){ body.aprobar=true; body.retribuida=$("#au-ret").value; } } }
    AU_BUSY=true; const ok=$("#au-ok"); ok.disabled=true; ok.textContent="Enviando…";
    try{ await auPost(ruta,body); AU_BUSY=false; toast(resp?"Respuesta enviada":admin?"Ausencia registrada":"Enviado: el gerente lo verá a primera hora"); if(opts.hecho) await opts.hecho(); else d.close(); }
    catch(e){ AU_BUSY=false; ok.disabled=false; ok.textContent=resp?"Enviar respuesta":admin?"Registrar":"Enviar al gerente"; err(e.message); } };
}

/* ---------- trabajador: «Mis ausencias» ---------- */
async function auCargarM(){ try{ AU_M=await api("/api/ausencias/mias"); }catch(_){ } auMarcarBoton(); return AU_M; }
function auMarcarBoton(){ const b=$("[data-auabrir]"); if(!b) return; const n=AU_M?AU_M.sinVer:0; b.classList.toggle("au-nuevo",n>0); b.innerHTML=`<span aria-hidden="true">📋</span> Ausencias y permisos${n?` <i class="au-badge">${n}</i>`:""}`; }
const _auJP=jPintar;
jPintar=function(m){ _auJP(m); const pie=document.querySelector("#j-fichar .j-pie"); if(pie&&ME&&ME.equipo&&!$("[data-auabrir]")){ const b=document.createElement("button"); b.type="button"; b.className="btn b-ghost b-sm"; b.setAttribute("data-auabrir",""); pie.appendChild(b); }
  auMarcarBoton(); if(!AU_M&&ME&&ME.equipo) auCargarM(); };
async function auMisAbrir(){ const d=auDlg("dlg-au","au-dlg"); if(!d.open){ d.innerHTML='<div class="t-dlg-in"><p class="hint">Cargando…</p></div>'; d.showModal(); } await auCargarM(); auMisLista(d); }
function auMisLista(d){
  const l=(AU_M&&AU_M.solicitudes)||[];
  d.innerHTML=`<div class="t-dlg-in au-mis"><h2>Ausencias y permisos</h2><p class="hint">Comunica una baja, una cita médica, un permiso o vacaciones. El gerente lo ve a primera hora y te responde aquí.</p>
    <button type="button" class="btn b-acc au-nueva" data-aunueva>+ Comunicar una ausencia</button>
    <div class="au-lista">${l.map(s=>`<article class="au-card ${esc(s.estado)}" data-auid="${esc(s.id)}">
      <header><span class="au-ti" aria-hidden="true">${AU_ICO[s.tipo]||""}</span><div><b>${esc(s.tipoTxt)}</b><small>${esc(auRango(s))} · ${auDias(s)} · ${esc(s.ref)}</small></div>${auChip(s.estado)}</header>
      ${s.motivo?`<p class="au-mot">${esc(s.motivo)}</p>`:""}
      ${s.docs.length?`<div class="au-docs">${auDocChips(s.docs)}</div>`:""}
      ${s.decision?`<div class="au-resp ${esc(s.estado)}"><b>${s.estado==="aprobada"?"Aprobada":s.estado==="rechazada"?"Rechazada":"El gerente pregunta"}</b> · ${esc(s.decision.por)} · ${esc(fechaHora(s.decision.t))}${s.estado==="aprobada"&&s.decision.retribuida?` · ${s.decision.retribuida==="si"?"con sueldo":"sin sueldo"}`:""}${s.decision.motivo?`<p>${esc(s.decision.motivo)}</p>`:""}</div>`:""}
      ${["pendiente","pide-info","aprobada"].includes(s.estado)?`<footer>${s.estado==="pide-info"?`<button type="button" class="btn b-acc b-sm" data-auresp="${esc(s.id)}">Responder</button>`:`<button type="button" class="btn b-ghost b-sm" data-auadj="${esc(s.id)}">+ Añadir documento</button>`}${s.estado!=="aprobada"?`<button type="button" class="btn b-ghost b-sm" data-aucanc="${esc(s.id)}">Cancelar solicitud</button>`:""}</footer>`:""}
    </article>`).join("")||'<div class="empty">Todavía no has comunicado ninguna ausencia.</div>'}</div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-aucerrar>Cerrar</button></div></div>`;
  d.querySelector("[data-aucerrar]").onclick=()=>d.close();
  l.filter(s=>s.nuevo).forEach(s=>auPost("visto/"+s.id).then(()=>{ s.nuevo=false; if(AU_M) AU_M.sinVer=Math.max(0,(AU_M.sinVer||0)-1); auMarcarBoton(); }).catch(()=>{}));
}
function auAdjuntar(d,id,resp){
  AU_DOCS=[]; d.innerHTML=`<form class="t-dlg-in au-form"><h2>${resp?"Responder al gerente":"Añadir documento"}</h2><p class="hint">${resp?"Escribe lo que te pide o adjunta el documento.":"Foto o PDF del parte, justificante o citación."}</p>
    ${resp?'<div class="field"><label for="au-mo">Tu respuesta</label><textarea class="in" id="au-mo" rows="3" maxlength="600"></textarea></div>':""}
    <div class="au-docs" id="au-docs"></div><label class="btn b-ghost au-file"><span aria-hidden="true">📎</span> Hacer foto o elegir archivo<input type="file" id="au-fi" accept="image/*,application/pdf" multiple hidden></label>
    <div class="msg bad" id="au-err" hidden></div><div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-auvolver>← Volver</button><button type="submit" class="btn b-acc" id="au-ok">${resp?"Enviar respuesta":"Guardar"}</button></div></form>`;
  const err=t=>{ const m=$("#au-err"); m.textContent=t||""; m.hidden=!t; };
  d.querySelector("[data-auvolver]").onclick=()=>auMisLista(d);
  $("#au-fi").onchange=async ev=>{ const fs=[...ev.target.files]; ev.target.value=""; err(""); const ok=$("#au-ok"); ok.disabled=true;
    for(const fl of fs){ if(AU_DOCS.length>=6) break; try{ AU_DOCS.push(await auSubir(fl)); $("#au-docs").innerHTML=auDocChips(AU_DOCS,true); }catch(e){ err(e.message); } } ok.disabled=false; };
  d.querySelector("form").addEventListener("click",e=>{ const q=e.target.closest("[data-auquitar]"); if(q){ AU_DOCS.splice(+q.dataset.auquitar,1); $("#au-docs").innerHTML=auDocChips(AU_DOCS,true); } });
  d.querySelector("form").onsubmit=async ev=>{ ev.preventDefault(); err(""); try{ await auPost((resp?"responder/":"adjuntar/")+id,{docs:AU_DOCS.map(x=>x.key),texto:resp?$("#au-mo").value:""}); toast(resp?"Respuesta enviada":"Documento guardado"); await auCargarM(); auMisLista(d); }catch(e){ err(e.message); } };
}

/* ---------- gerente: datos, aviso y pestaña ---------- */
async function auRefrescarG(avisar){
  if(!PW||!auGer()) return;
  try{ const q=new URLSearchParams(); for(const k of ["estado","uid","mes"]) if(AU_F[k]) q.set(k,AU_F[k]); AU_G=await api("/api/ausencias/gestion"+(q.toString()?"?"+q:"")); }catch(_){ return; }
  auBanner(); auInsignia();
  if(avisar&&AU_G.contadores.pendientes+AU_G.contadores.pideInfo>0&&typeof toast==="function") toast(`RRHH: ${AU_G.contadores.pendientes} ausencia${AU_G.contadores.pendientes===1?"":"s"} por revisar${AU_G.contadores.ausentesHoy?` · hoy falta ${AU_G.hoyLista.map(s=>s.nombre.split(" ")[0]).join(", ")}`:""}`);
  const s=$("#s-jornada"); if(s&&!s.hidden&&typeof jgPintar==="function") jgPintar();
}
function auInsignia(){ const b=document.querySelector('#tabs [data-tab="jornada"]'); if(!b) return; let i=b.querySelector(".au-badge"); const n=AU_G?AU_G.contadores.pendientes:0;
  if(!n){ if(i) i.remove(); return; } if(!i){ i=document.createElement("i"); i.className="au-badge"; b.appendChild(i); } i.textContent=n; i.title=n+" ausencia(s) por revisar"; }
function auBanner(){ let b=$("#au-banner"); const tr=$("#tabsrow");
  if(!b){ b=document.createElement("div"); b.id="au-banner"; b.className="au-banner"; b.setAttribute("role","status"); tr.after(b); }
  const c=AU_G&&AU_G.contadores, n=c?c.pendientes+c.pideInfo:0, hoy=AU_G?AU_G.hoyLista:[];
  if(!AU_G||(!n&&!hoy.length)||tr.hidden||!auGer()){ b.hidden=true; return; }
  b.hidden=false; b.innerHTML=`<span class="au-bi" aria-hidden="true">🗂️</span><div><b>RRHH${n?` · ${c.pendientes} por revisar${c.pideInfo?` · ${c.pideInfo} esperando respuesta`:""}`:""}</b><small>${hoy.length?`Hoy falta: ${hoy.map(s=>`${esc(s.nombre)} (${esc(s.tipoTxt.toLowerCase())}${s.docs.length?", con documento":""})`).join(" · ")}`:"Nadie falta hoy por ausencia comunicada."}</small></div><button type="button" class="btn b-acc b-sm" data-aurev>Revisar</button>`; }
const _auShow=show; show=function(id){ _auShow(id); auBanner(); };
const _auTab=abrirTab;
abrirTab=function(t,push){ const r=_auTab(t,push); if(auGer()){ if(!AU_INIT){ AU_INIT=1; auRefrescarG(true); } else if(t==="jornada") auRefrescarG(); } return r; };
setInterval(()=>{ if(PW&&auGer()&&!document.hidden) auRefrescarG(); },60000);
const _auLogout=logout; logout=function(m){ AU_M=null; AU_G=null; AU_INIT=0; const b=$("#au-banner"); if(b) b.hidden=true; return _auLogout(m); };
const _auEntrar=entrarEquipo; entrarEquipo=async function(d){ AU_M=null; const r=await _auEntrar(d); if(d&&d.rol!=="gerente") auCargarM(); return r; };

/* ---------- gerente: sección dentro de «Jornada» ---------- */
const _auJG=jgPintar;
jgPintar=function(){ _auJG(); const box=$("#jg"); if(!box) return; box.querySelector("#aus-g")&&box.querySelector("#aus-g").remove(); box.insertAdjacentHTML("afterbegin",auSeccion()); };
function auFila(s,pend){ return `<button type="button" class="au-row ${esc(s.estado)} ${s.leida?"":"nuevo"}" data-augest="${esc(s.id)}"><span class="au-ti" aria-hidden="true">${AU_ICO[s.tipo]||""}</span>
  <span class="au-r1"><b>${esc(s.nombre)}</b><small>${esc(s.tipoTxt)} · ${esc(auRango(s))} · ${auDias(s)}</small></span>
  <span class="au-r2">${s.docs.length?`<span class="au-clip" title="${s.docs.length} documento(s)">📎 ${s.docs.length}</span>`:pend&&["baja-medica","cita-medica"].includes(s.tipo)?'<span class="au-clip sin" title="Sin documento">sin doc.</span>':""}${s.leida?"":'<span class="chip au-nuevo-c">Nuevo</span>'}${auChip(s.estado)}</span></button>`; }
function auSeccion(){
  const g=AU_G; if(!g) return `<section class="card" id="aus-g"><h3>Ausencias y permisos</h3><p class="hint">Cargando…</p></section>`;
  const c=g.contadores, rev=g.pendientes.concat((g.lista||[]).filter(s=>s.estado==="pide-info"&&!g.pendientes.some(p=>p.id===s.id)));
  return `<section class="card au-g" id="aus-g"><div class="au-gh"><div><h3>Ausencias y permisos</h3><p class="hint" style="margin:2px 0 0">Bajas, permisos y vacaciones del equipo. ${c.pendientes?`<b>${c.pendientes} por revisar.</b>`:"Todo al día."}</p></div>
    <button type="button" class="btn b-acc b-sm" data-augnueva>+ Registrar ausencia</button></div>
    <div class="au-hoy ${g.hoyLista.length?"hay":""}"><b>Hoy, ${esc(fecha(g.hoy))}</b>${g.hoyLista.length?g.hoyLista.map(s=>`<button type="button" class="au-hp" data-augest="${esc(s.id)}"><b>${esc(s.nombre)}</b> · ${esc(s.tipoTxt)}${s.docs.length?` · 📎 ${s.docs.length}`:""} ${auChip(s.estado)}</button>`).join(""):'<span class="hint">Nadie falta hoy por ausencia comunicada.</span>'}</div>
    <div class="au-tabs" role="tablist"><button type="button" role="tab" aria-selected="${AU_TAB==="revisar"}" data-autab="revisar">Por revisar${rev.length?` <i class="au-badge">${rev.length}</i>`:""}</button><button type="button" role="tab" aria-selected="${AU_TAB==="hist"}" data-autab="hist">Historial</button></div>
    ${AU_TAB==="revisar"?`<div class="au-lista">${rev.map(s=>auFila(s,true)).join("")||'<div class="empty">No hay nada por revisar. Cuando alguien comunique una ausencia aparecerá aquí.</div>'}</div>`
    :`<div class="au-filtros"><select class="in" data-aufil="estado" aria-label="Estado"><option value="">Todos los estados</option>${Object.entries(AU_EST).map(([k,t])=>`<option value="${k}" ${AU_F.estado===k?"selected":""}>${t}</option>`).join("")}</select>
      <select class="in" data-aufil="uid" aria-label="Trabajador"><option value="">Todo el equipo</option>${g.equipo.map(p=>`<option value="${esc(p.uid)}" ${AU_F.uid===p.uid?"selected":""}>${esc(p.nombre)}</option>`).join("")}</select>
      <input class="in" type="month" data-aufil="mes" value="${esc(AU_F.mes)}" aria-label="Mes"></div>
      <div class="au-lista">${g.lista.map(s=>auFila(s,false)).join("")||'<div class="empty">No hay solicitudes con esos filtros.</div>'}</div>`}
  </section>`; }
document.addEventListener("click",async e=>{ const t=e.target; if(!t.closest) return;
  if(t.closest("[data-auabrir]")){ auMisAbrir(); return; }
  if(t.closest("[data-aunueva]")){ auForm(auDlg("dlg-au"),{volver:()=>auMisLista(auDlg("dlg-au")),hecho:async()=>{ await auCargarM(); auMisLista(auDlg("dlg-au")); }}); return; }
  const rs=t.closest("[data-auresp]"); if(rs){ auAdjuntar(auDlg("dlg-au"),rs.dataset.auresp,true); return; }
  const ad=t.closest("[data-auadj]"); if(ad){ auAdjuntar(auDlg("dlg-au"),ad.dataset.auadj,false); return; }
  const cn=t.closest("[data-aucanc]"); if(cn){ if(!confirm("¿Cancelar esta solicitud? El gerente ya no la verá como pendiente.")) return; try{ await auPost("cancelar/"+cn.dataset.aucanc); toast("Solicitud cancelada"); await auCargarM(); auMisLista(auDlg("dlg-au")); }catch(err){ toast(err.message); } return; }
  const dc=t.closest("[data-audoc]"); if(dc&&!dc.closest("form")){ auVerDoc(dc.dataset.audoc,dc.dataset.aunom); return; }
  if(t.closest("[data-aurev]")){ abrirTab("jornada"); setTimeout(()=>{ const s=$("#aus-g"); if(s) s.scrollIntoView({behavior:"smooth",block:"start"}); },700); return; }
  const tb=t.closest("[data-autab]"); if(tb){ AU_TAB=tb.dataset.autab; jgPintar(); return; }
  if(t.closest("[data-augnueva]")){ const d=auDlg("dlg-au-g","au-dlg"); if(!d.open) d.showModal(); if(!AU_M) await auCargarM(); auForm(d,{admin:true,hecho:async()=>{ d.close(); await auRefrescarG(); }}); return; }
  const gs=t.closest("[data-augest]"); if(gs){ auFicha(gs.dataset.augest); return; }
});
document.addEventListener("change",e=>{ const f=e.target.closest&&e.target.closest("[data-aufil]"); if(!f) return; AU_F[f.dataset.aufil]=f.value; auRefrescarG(); });

/* ---------- gerente: ficha y decisión ---------- */
async function auFicha(id){
  const d=auDlg("dlg-au-g","au-dlg au-gdlg"); d.innerHTML='<div class="t-dlg-in"><p class="hint">Cargando…</p></div>'; if(!d.open) d.showModal();
  try{ const s=await api("/api/ausencias/ficha/"+id); auFichaPintar(d,s); auRefrescarG(); }
  catch(err){ d.innerHTML=`<div class="t-dlg-in"><p class="msg bad">${esc(err.message)}</p><div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-aucerrar>Cerrar</button></div></div>`; d.querySelector("[data-aucerrar]").onclick=()=>d.close(); }
}
function auFichaPintar(d,s){
  const cerrada=s.estado==="cancelada";
  d.innerHTML=`<div class="t-dlg-in au-ficha"><header class="au-fh"><span class="au-ti big" aria-hidden="true">${AU_ICO[s.tipo]||""}</span><div><h2>${esc(s.nombre)}</h2><p class="hint" style="margin:0">${esc(s.tipoTxt)} · ${esc(s.ref)}</p></div>${auChip(s.estado)}</header>
    <dl class="au-dl"><div><dt>Fechas</dt><dd>${esc(auRango(s))}</dd></div><div><dt>Duración</dt><dd>${auDias(s)}${s.desde!==s.hasta?` · ${s.laborables} laborable${s.laborables===1?"":"s"}`:""}</dd></div><div><dt>Comunicada</dt><dd>${esc(fechaHora(s.creada))}${s.creadaPor&&s.creadaPor!==s.nombre?` · por ${esc(s.creadaPor)}`:""}</dd></div></dl>
    ${s.motivo?`<div class="au-caja"><b>Motivo</b><p>${esc(s.motivo)}</p></div>`:""}
    <div class="au-caja"><b>Documentos (${s.docs.length})</b>${s.docs.length?`<div class="au-docs">${auDocChips(s.docs)}</div>`:`<p class="hint" style="margin:6px 0 0">No ha subido ningún documento${["baja-medica","cita-medica"].includes(s.tipo)?". Puedes pedírselo abajo.":"."}</p>`}</div>
    ${s.historial.length?`<details class="au-hist"><summary>Historial (${s.historial.length})</summary><ol>${s.historial.map(h=>`<li><b>${esc(h.acc)}</b> · ${esc(h.por)} · <small>${esc(fechaHora(h.t))}</small>${h.txt?`<p>${esc(h.txt)}</p>`:""}</li>`).join("")}</ol></details>`:""}
    ${cerrada?'<p class="msg">El trabajador retiró esta solicitud.</p>':`<form class="au-dec" id="au-dec"><h3>Tu decisión</h3>
      <div class="au-seg" role="radiogroup" aria-label="Decisión"><button type="button" role="radio" data-audec="aprobar" aria-checked="${s.estado==="aprobada"}">✓ Aprobar</button><button type="button" role="radio" data-audec="pedir-info" aria-checked="${s.estado==="pide-info"}">? Pedir información</button><button type="button" role="radio" data-audec="rechazar" aria-checked="${s.estado==="rechazada"}">✕ Rechazar</button></div>
      <div class="field" id="au-ret-b"><label for="au-ret">Retribución</label><select class="in" id="au-ret"><option value="">Sin especificar</option><option value="si" ${s.decision&&s.decision.retribuida==="si"?"selected":""}>Con sueldo</option><option value="no" ${s.decision&&s.decision.retribuida==="no"?"selected":""}>Sin sueldo</option></select></div>
      <div class="field"><label for="au-dm" id="au-dml">Comentario para el trabajador <span class="au-op">(opcional)</span></label><textarea class="in" id="au-dm" rows="2" maxlength="500" placeholder="Lo verá en su pantalla de fichaje."></textarea></div>
      <div class="msg bad" id="au-err" hidden></div>
      <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-aucerrar>Cerrar</button><button type="submit" class="btn b-acc" id="au-ok" disabled>Guarda una decisión</button></div></form>`}</div>`;
  d.querySelector("[data-aucerrar]").onclick=()=>d.close();
  if(cerrada) return;
  let dec=""; const f=$("#au-dec"), err=t=>{ const m=$("#au-err"); m.textContent=t||""; m.hidden=!t; };
  const txt={aprobar:"Aprobar la ausencia","pedir-info":"Pedir más información",rechazar:"Rechazar la ausencia"};
  f.querySelectorAll("[data-audec]").forEach(b=>b.onclick=()=>{ dec=b.dataset.audec; f.querySelectorAll("[data-audec]").forEach(x=>x.setAttribute("aria-checked",String(x===b))); $("#au-ret-b").hidden=dec!=="aprobar";
    $("#au-dml").innerHTML=dec==="aprobar"?'Comentario para el trabajador <span class="au-op">(opcional)</span>':dec==="rechazar"?"¿Por qué se rechaza? <span class=\"au-op\">(obligatorio)</span>":"¿Qué te falta? <span class=\"au-op\">(obligatorio)</span>"; const ok=$("#au-ok"); ok.disabled=false; ok.textContent=txt[dec]; ok.className="btn "+(dec==="rechazar"?"b-bad":"b-acc"); });
  $("#au-ret-b").hidden=true;
  f.onsubmit=async ev=>{ ev.preventDefault(); err(""); const mo=$("#au-dm").value.trim(); if(!dec) return err("Elige una decisión.");
    if(dec!=="aprobar"&&mo.length<4) return err(dec==="rechazar"?"Explica por qué se rechaza: lo verá el trabajador.":"Di qué te falta: lo verá el trabajador.");
    const ok=$("#au-ok"); ok.disabled=true;
    try{ const r=await auPost("decidir/"+s.id,{decision:dec,motivo:mo,retribuida:$("#au-ret").value}); toast(dec==="aprobar"?"Ausencia aprobada":dec==="rechazar"?"Ausencia rechazada":"Información solicitada"); await auRefrescarG(); auFichaPintar(d,r.solicitud); }
    catch(e){ ok.disabled=false; err(e.message); } };
}
