/* =====================================================================
   CONTROL DE CAJA Y PREVENCIÓN DE PÉRDIDAS
   Arqueo ciego (apertura y cierre), cobros y salidas con ticket, cuadro
   de mando del propietario y libro de registro encadenado.
   Fuente: tools/caja/caja.js → se copia dentro de admin.html con
   python3 tools/caja/inyectar.py
   ===================================================================== */
const CJ_BILLETES=[50000,20000,10000,5000,2000,1000,500], CJ_MONEDAS=[200,100,50,20,10,5,2,1];
const CJ_CAT_E=[["proveedor","Pago a proveedor"],["compra","Compra rápida"],["propietario","Retiro del propietario"],["banco","Ingreso en el banco"],["otro","Otro"]];
const CJ_CAT_I=[["taller","Cobro de taller"],["venta","Venta de coche"],["senal","Señal / reserva"],["otro","Otro"]];
const CJ_TXT=Object.fromEntries([...CJ_CAT_E,...CJ_CAT_I]);
const CJ_ACC={apertura:"Apertura de caja","apertura-no-cuadra":"Apertura: recuento que no cuadra",cobro:"Cobro en efectivo",salida:"Salida de dinero","ticket-añadido":"Ticket añadido después",cierre:"Cierre de caja","cierre-no-cuadra":"Cierre: recuento que no cuadra",anulacion:"Movimiento anulado (gerente)",ajuste:"Ajuste (gerente)",revision:"Descuadre revisado (gerente)"};
let CJ=null, CJR=null, CJ_MES=hoyC().slice(0,7), CJ_CONTEO=null, CJ_MODO="", CJ_JUST=false, CJ_ALERTAS_VISTAS=new Set();
const cjE=c=>{ const v=Math.abs(Math.round(c||0)), e=String(Math.floor(v/100)).replace(/\B(?=(\d{3})+(?!\d))/g,"."); return (c<0?"−":"")+e+","+String(v%100).padStart(2,"0")+" €"; };
const cjD=c=>c===0?"0,00 €":(c>0?"+":"")+cjE(c);
const cjNum=v=>{ let s=String(v||"").replace(/\s|€/g,""); if(s.includes(",")) s=s.replace(/\./g,"").replace(",","."); const n=Number(s); return Number.isFinite(n)?n:NaN; };
const cjDen=c=>c>=100?(c/100)+" €":c+" cént.";
const cjPuede=()=>!!ME&&(!ME.equipo||ME.caja);

/* ---------- carga ---------- */
async function cjCargar(quieto){
  if(!quieto) $("#cj").innerHTML='<div class="empty">Cargando la caja…</div>';
  try{
    const [e,r]=await Promise.all([api("/api/caja/estado"),ES_GER()?api(`/api/caja/resumen?desde=${CJ_MES}-01&hasta=${finMes(CJ_MES)}`):null]);
    CJ=e; CJR=r; cjPintar(); if(r&&CJ_MES===hoyC().slice(0,7)) cjBadge(r.alertas.filter(a=>!a.vista).length);
  }catch(err){ $("#cj").innerHTML=`<div class="empty">${esc(err.message)}</div>`; }
}
function cjAbrirTab(){ if(!cjPuede()){ toast("No tienes permiso para usar la caja"); return abrirTab("ordenes"); } show("s-caja"); history.replaceState(null,"","#caja"); CJ_MODO=""; cjCargar(); }

/* ---------- contador de billetes y monedas ---------- */
function cjNuevoConteo(){ CJ_CONTEO={}; [...CJ_BILLETES,...CJ_MONEDAS].forEach(d=>CJ_CONTEO[d]=0); CJ_JUST=false; }
const cjTotal=()=>Object.entries(CJ_CONTEO||{}).reduce((a,[d,n])=>a+ +d*n,0);
function cjContador(){
  const fila=d=>`<div class="cj-den ${d>=500?"bil":"mon"}"><span class="cj-dv">${cjDen(d)}</span><div class="cj-step"><button type="button" data-cjmenos="${d}" aria-label="Quitar uno de ${cjDen(d)}">−</button><input class="num" data-cjn="${d}" inputmode="numeric" value="${CJ_CONTEO[d]||""}" placeholder="0" aria-label="Cuántos de ${cjDen(d)}"><button type="button" data-cjmas="${d}" aria-label="Añadir uno de ${cjDen(d)}">+</button></div><b class="num" data-cjsub="${d}">${CJ_CONTEO[d]?cjE(d*CJ_CONTEO[d]):""}</b></div>`;
  return `<div class="cj-cont"><div><h4>Billetes</h4>${CJ_BILLETES.map(fila).join("")}</div><div><h4>Monedas</h4>${CJ_MONEDAS.map(fila).join("")}</div></div>
    <div class="cj-total"><span>Total que has contado</span><b class="num" id="cj-total">${cjE(cjTotal())}</b></div>`;
}
function cjActualizar(d){ const s=document.querySelector(`[data-cjsub="${d}"]`); if(s) s.textContent=CJ_CONTEO[d]?cjE(d*CJ_CONTEO[d]):""; const t=$("#cj-total"); if(t) t.textContent=cjE(cjTotal()); }

/* ---------- pintar ---------- */
function cjPintar(){
  const e=CJ; if(!e) return;
  let h=`<section class="cj-op ${e.abierta?"abierta":"cerrada"}">`;
  if(CJ_MODO==="abrir"||CJ_MODO==="cerrar"){
    const abrir=CJ_MODO==="abrir";
    h+=`<div class="cj-paso"><button type="button" class="btn b-ghost b-sm" data-cjvolver>← Volver</button><div><small>${abrir?"Apertura":"Cierre ciego"}</small><h2>${abrir?"Cuenta el fondo de caja":"Cuenta todo el dinero de la caja"}</h2></div></div>
      <p class="cj-guia">${abrir?"Cuenta billete a billete y moneda a moneda el dinero con el que empiezas el día y escribe cuántos hay de cada uno.":"Saca todo el dinero del cajón y cuéntalo. <b>La pantalla no te dice cuánto debería haber</b>: escribe solo lo que cuentas. El sistema lo compara solo."}</p>
      ${cjContador()}
      <div class="cj-just" ${CJ_JUST?"":"hidden"}><div class="msg bad" id="cj-msg"></div><div class="field"><label for="cj-jtxt">Explicación obligatoria (qué ha pasado)</label><textarea class="in" id="cj-jtxt" rows="3" maxlength="800" placeholder="${abrir?"Ej.: El gerente se llevó 50 € anoche para el banco y no lo registró.":"Ej.: Di cambio de 20 € en vez de 10 € a un cliente sobre las 12:00."}"></textarea><small class="hint">Mínimo 15 letras. Queda guardada con tu nombre y el gerente recibe un aviso.</small></div></div>
      <div class="cj-acts"><button type="button" class="btn b-acc cj-big" data-cjconfirmar>${abrir?"Abrir la caja":CJ_JUST?"Cerrar con esta explicación":"Comprobar y cerrar la caja"}</button></div>`;
  } else if(!e.abierta){
    h+=`<div class="cj-estado"><span class="cj-luz off"></span><div><b>Caja cerrada</b><small>${e.ultimoCierre?`Último cierre: ${esc(e.ultimoCierre.nombre)} · ${esc(fechaHora(e.ultimoCierre.t))}${e.ultimoCierre.contado!=null?` · quedaron ${cjE(e.ultimoCierre.contado)}`:""}`:"Todavía no se ha abierto nunca."}</small></div></div>
      <button type="button" class="btn b-acc cj-big" data-cjmodo="abrir">Abrir la caja</button>
      <p class="hint">Al abrir, cuentas el fondo con el que empiezas. Si no coincide con lo que quedó en el último cierre, tendrás que explicarlo.</p>`;
  } else {
    const t=e.turno, movs=e.movimientos, pend=movs.filter(m=>m.sinTicket&&!m.anulado);
    h+=`<div class="cj-estado"><span class="cj-luz"></span><div><b>Caja abierta</b><small>Abrió ${esc(t.apertura.nombre)} · ${esc(fechaHora(t.apertura.t))}${t.apertura.contado!=null?` · fondo ${cjE(t.apertura.contado)}`:""}</small></div>${e.calculo?`<div class="cj-teo"><small>Debería haber (solo lo ves tú)</small><b class="num">${cjE(e.calculo.teorico)}</b></div>`:""}</div>
      <div class="cj-botones"><button type="button" class="cj-bt ing" data-cjform="ingreso"><i>+</i><span><b>Cobro en efectivo</b><small>Un cliente paga en dinero</small></span></button>
        <button type="button" class="cj-bt egr" data-cjform="egreso"><i>−</i><span><b>Salida de dinero</b><small>Proveedor, compra, retiro… con ticket</small></span></button>
        <button type="button" class="cj-bt cie" data-cjmodo="cerrar"><i>✓</i><span><b>Cerrar la caja</b><small>Arqueo ciego del final del turno</small></span></button></div>
      ${pend.length?`<div class="msg bad cj-pend">${pend.length} salida${pend.length>1?"s":""} sin ticket. Haz la foto en cuanto lo tengas: el gerente ya ha recibido el aviso.</div>`:""}
      <h3 class="cj-h">Movimientos de este turno <span class="num">${movs.length}</span></h3>
      ${movs.length?`<div class="cj-movs">${movs.slice().reverse().map(m=>`<div class="cj-mov ${m.tipo} ${m.anulado?"anulado":""}"><i>${m.tipo==="egreso"?"−":"+"}</i><div><b>${esc(m.concepto)}</b><small>${esc(tHora(m.t))} · ${esc(CJ_TXT[m.categoria]||m.categoria)}${m.ref?" · "+esc(m.ref):""} · ${esc(m.porNombre)}${m.tipo==="egreso"&&m.responsableNombre&&m.responsableNombre!==m.porNombre?" · se lo lleva "+esc(m.responsableNombre):""}</small>
        ${m.sinTicket?`<span class="chip rojo">Sin ticket</span>${m.mio||e.admin?` <label class="chipb cj-tk"><input type="file" accept="image/*" capture="environment" hidden data-cjtk="${esc(m.id)}">📷 Añadir ticket</label>`:""}`:m.foto?`<a class="chip ok" href="${FOTO(m.foto)}" target="_blank" rel="noopener">${m.foto.endsWith(".pdf")?"Factura PDF ✓":"Ticket ✓"}</a>`:""}${m.anulado?' <span class="chip">Anulado</span>':""}</div>
        <b class="num">${m.importe!=null?(m.tipo==="egreso"?"−":"+")+cjE(m.importe):"•••"}</b></div>`).join("")}</div>`:'<p class="t-vacio">Todavía no hay movimientos.</p>'}
      ${!e.admin?'<p class="hint">Solo ves el importe de lo que registras tú. El total lo calcula el sistema al cerrar.</p>':""}`;
  }
  h+=`</section>`;
  if(CJR) h+=cjPanel();
  $("#cj").innerHTML=h;
}

/* ---------- formulario de cobro / salida ---------- */
let CJ_COCHES=null;
function cjForm(tipo){
  let d=$("#dlg-cj"); if(!d){ d=document.createElement("dialog"); d.id="dlg-cj"; d.className="t-dlg cj-dlg"; document.body.appendChild(d); }
  const eg=tipo==="egreso", cats=eg?CJ_CAT_E:CJ_CAT_I, eq=(TEQ||[]).filter(p=>p.activo);
  const ords=(ORDENES||[]).filter(o=>o.estado!=="entregado"||Date.now()-Date.parse(o.actualizado)<7*864e5).slice(0,40);
  d.innerHTML=`<form id="f-cj" novalidate><h2>${eg?"Salida de dinero":"Cobro en efectivo"}</h2>
    <p class="hint">${eg?"Todo el dinero que sale de la caja se registra en el momento, con la foto del ticket o la factura.":"Registra cada cobro en efectivo en el momento de cobrarlo."}</p>
    <div class="field"><label for="cj-imp">Importe (€) *</label><input class="in num cj-imp" id="cj-imp" inputmode="decimal" autocomplete="off" placeholder="0,00" required></div>
    <div class="field"><label>${eg?"Tipo de salida":"Tipo de cobro"} *</label><div class="t-seg" id="cj-cat">${cats.map(([k,t])=>`<button type="button" data-v="${k}" aria-pressed="false">${t}</button>`).join("")}</div></div>
    ${eg?`<div class="field"><label for="cj-resp">¿Quién se lleva el dinero? *</label><select class="in" id="cj-resp"><option value="${esc(ME.uid)}">${esc(ME.nombre)} (yo)</option>${eq.filter(p=>p.id!==ME.uid).map(p=>`<option value="${esc(p.id)}">${esc(p.nombre)}</option>`).join("")}${ME.uid!=="gerente"?'<option value="gerente">Gerente / propietario</option>':""}</select></div>`:""}
    ${!eg&&ords.length?`<div class="field"><label for="cj-ord">Orden de taller (si es de una reparación)</label><select class="in" id="cj-ord"><option value="">— Ninguna —</option>${ords.map(o=>`<option value="${esc(o.token)}" data-num="${esc(o.num||"")}" data-txt="${esc((o.vehiculo.coche||"")+" "+(o.vehiculo.matricula||"").toUpperCase()+" · "+o.cliente.nombre)}">${esc((o.num||"")+" · "+(o.vehiculo.matricula||"").toUpperCase()+" · "+o.cliente.nombre)}</option>`).join("")}</select></div>`:""}
    ${!eg?`<div class="field" id="cj-coche-f" hidden><label for="cj-coche">¿De qué coche? (venta o señal)</label><select class="in" id="cj-coche"><option value="">— Ninguno —</option>${(CJ_COCHES||[]).filter(c=>c.estado!=="vendido"||Date.now()-Date.parse(c.actualizado||0)<30*864e5).map(c=>`<option value="${esc(c.id)}">${esc(c.marca+" "+c.modelo+" "+(c.version||""))}${c.estado==="vendido"?" · vendido":c.estado==="reservado"?" · reservado":""}</option>`).join("")}</select><small class="hint">Así la señal cuenta como parte del pago del coche y no como un ingreso aparte.</small></div>`:""}
    <div class="field"><label for="cj-con">Concepto *</label><input class="in" id="cj-con" maxlength="200" placeholder="${eg?"Ej.: 5 L aceite 5W30 en Recambios Sur":"Ej.: Cambio de pastillas, Toyota Yaris"}"></div>
    <div class="field"><label for="cj-ref">${eg?"Nº de factura, ticket u orden *":"Nº de factura u orden"}</label><input class="in" id="cj-ref" maxlength="40" placeholder="${eg?"Ej.: F-2026-0142 · si es un retiro: nº del vale firmado":"Ej.: VC-2026-0003"}"></div>
    ${eg?`<div class="field"><label>Foto del ticket o la factura *</label><div class="cj-foto" id="cj-foto"><label class="t-foto-add cj-foto-add"><input type="file" accept="image/*" capture="environment" hidden id="cj-file"><span>📷</span><small>Hacer foto</small></label></div>
      <label class="t-chk"><input type="checkbox" id="cj-sin"><span>No tengo el ticket ahora. <small class="hint">El gerente recibe un aviso al momento y la salida queda marcada hasta que subas la foto.</small></span></label></div>`:""}
    <div class="msg bad" id="cj-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-cjcancel>Cancelar</button><button type="submit" class="btn ${eg?"b-brand":"b-acc"}" id="cj-ok">${eg?"Registrar la salida":"Registrar el cobro"}</button></div></form>`;
  let foto="";
  $("#cj-cat").onclick=ev=>{ const b=ev.target.closest("[data-v]"); if(!b) return; $("#cj-cat").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); if($("#cj-coche-f")) $("#cj-coche-f").hidden=!["venta","senal"].includes(b.dataset.v); if(eg&&b.dataset.v==="propietario"&&$("#cj-resp")) $("#cj-resp").value=ME.uid==="gerente"?ME.uid:"gerente"; };
  const ord=$("#cj-ord"); if(ord) ord.onchange=()=>{ const o=ord.selectedOptions[0]; if(ord.value){ if(!$("#cj-ref").value) $("#cj-ref").value=o.dataset.num; if(!$("#cj-con").value) $("#cj-con").value="Reparación "+o.dataset.txt; const b=$("#cj-cat [data-v=taller]"); if(b) b.click(); } };
  if(eg) $("#cj-file").onchange=async ev=>{ const f=ev.target.files[0]; ev.target.value=""; if(!f) return; $("#cj-foto").classList.add("sub"); toast("Subiendo la foto…");
    try{ const b=await shrink(f); foto=(await api("/api/fotos",{method:"POST",headers:{"content-type":"image/jpeg"},body:b})).key; $("#cj-foto").innerHTML=`<span class="t-foto"><img src="${FOTO(foto)}" alt="Ticket"></span><small class="cj-fok">Ticket listo ✓</small>`; $("#cj-sin").checked=false; }catch(err){ toast(err.message); }
    $("#cj-foto").classList.remove("sub"); };
  d.querySelector("[data-cjcancel]").onclick=()=>d.close();
  $("#f-cj").onsubmit=async ev=>{ ev.preventDefault(); const err=$("#cj-err"), btn=$("#cj-ok"); err.hidden=true;
    const imp=cjNum($("#cj-imp").value), cat=($("#cj-cat [aria-pressed=true]")||{}).dataset?.v||"";
    const falla=m=>{ err.textContent=m; err.hidden=false; };
    if(!(imp>0)) return falla("Escribe el importe.");
    if(!cat) return falla("Elige el tipo de "+(eg?"salida.":"cobro."));
    if($("#cj-con").value.trim().length<3) return falla("Escribe el concepto.");
    if(eg&&!$("#cj-ref").value.trim()) return falla("Escribe el nº de factura, ticket u orden.");
    if(eg&&!foto&&!$("#cj-sin").checked) return falla("Haz la foto del ticket. Si de verdad no lo tienes, marca la casilla de abajo.");
    btn.disabled=true;
    try{ await api("/api/caja/movimiento",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({tipo,importe:String(imp),categoria:cat,concepto:$("#cj-con").value,ref:$("#cj-ref").value,foto,sinTicket:eg&&!foto&&$("#cj-sin").checked,responsable:eg?$("#cj-resp").value:"",orden:ord?ord.value:"",coche:$("#cj-coche")&&!$("#cj-coche-f").hidden?$("#cj-coche").value:""})});
      d.close(); toast(`${eg?"Salida":"Cobro"} de ${cjE(Math.round(imp*100))} registrad${eg?"a":"o"}`); cjCargar(true);
    }catch(x){ falla(x.message); }
    btn.disabled=false; };
  d.showModal(); setTimeout(()=>$("#cj-imp").focus(),30);
}

/* ---------- confirmar apertura / cierre ---------- */
async function cjConfirmar(){
  const abrir=CJ_MODO==="abrir", btn=document.querySelector("[data-cjconfirmar]"), total=cjTotal();
  const just=CJ_JUST?($("#cj-jtxt").value||"").trim():"";
  if(CJ_JUST&&just.length<15){ $("#cj-msg").textContent="Escribe la explicación (mínimo 15 letras). Sin explicación no se puede "+(abrir?"abrir.":"cerrar."); $("#cj-jtxt").focus(); return; }
  if(!abrir&&!CJ_JUST&&!confirm(`Vas a cerrar la caja con ${cjE(total)} contados. ¿Lo has contado todo?`)) return;
  btn.disabled=true;
  try{ const r=await api("/api/caja/"+(abrir?"abrir":"cerrar"),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({desglose:CJ_CONTEO,justificacion:just})});
    CJ_MODO=""; CJ_CONTEO=null; CJ_JUST=false;
    toast(abrir?(r.descuadre?"Caja abierta. La diferencia y tu explicación quedan registradas.":"Caja abierta: el fondo cuadra"):(r.descuadre?"Caja cerrada con descuadre. Tu explicación queda registrada y el gerente recibe el aviso.":"Caja cerrada: todo cuadra ✓"));
    await cjCargar(true); scrollTo(0,0);
  }catch(err){
    btn.disabled=false;
    if(/NO cuadra|no coincide/i.test(err.message)){ const txt=document.querySelector("#cj-jtxt")?.value||""; CJ_JUST=true; cjPintar(); $("#cj-msg").textContent=err.message; $("#cj-jtxt").value=txt; document.querySelector(".cj-just").scrollIntoView({behavior:"smooth",block:"center"}); }
    else toast(err.message);
  }
}

/* ---------- eventos ---------- */
$("#cj").addEventListener("click",async e=>{
  const t=e.target, q=s=>t.closest(s);
  const md=q("[data-cjmodo]"); if(md){ CJ_MODO=md.dataset.cjmodo; cjNuevoConteo(); if(!TEQ.length&&CJ_MODO) tCargarEquipo(); cjPintar(); scrollTo(0,0); return; }
  if(q("[data-cjvolver]")){ if(cjTotal()&&!confirm("¿Salir sin terminar? Se pierde el conteo.")) return; CJ_MODO=""; cjPintar(); return; }
  const mn=q("[data-cjmenos]"), ms=q("[data-cjmas]");
  if(mn||ms){ const d=(mn||ms).dataset[mn?"cjmenos":"cjmas"]; CJ_CONTEO[d]=Math.max(0,(CJ_CONTEO[d]||0)+(ms?1:-1)); const i=document.querySelector(`[data-cjn="${d}"]`); i.value=CJ_CONTEO[d]||""; cjActualizar(d); return; }
  if(q("[data-cjconfirmar]")){ cjConfirmar(); return; }
  const fm=q("[data-cjform]"); if(fm){ if(!TEQ.length) await tCargarEquipo(); if(!CJ_COCHES) CJ_COCHES=await fetch("/api/coches").then(r=>r.ok?r.json():[]).catch(()=>[]); cjForm(fm.dataset.cjform); return; }
  if(q("[data-cjmes]")){ CJ_MES=mesMas(CJ_MES,+q("[data-cjmes]").dataset.cjmes); cjCargar(true); return; }
  const tr=q("[data-cjturno]"); if(tr){ cjTurno(tr.dataset.cjturno); return; }
  if(q("[data-cjlibro]")){ cjLibro(); return; }
  if(q("[data-cjvistas]")){ await api("/api/caja/alertas-vistas",{method:"POST",headers:{"content-type":"application/json"},body:"{}"}); cjCargar(true); cjBadge(0); return; }
  if(q("[data-cjcsv]")){ cjCsv(); return; }
});
$("#cj").addEventListener("input",e=>{ const i=e.target.closest("[data-cjn]"); if(!i) return; const d=i.dataset.cjn, n=Math.max(0,Math.min(99999,parseInt(i.value.replace(/\D/g,""))||0)); CJ_CONTEO[d]=n; if(i.value&&String(n)!==i.value) i.value=n||""; cjActualizar(d); });
$("#cj").addEventListener("change",async e=>{ const f=e.target.closest("[data-cjtk]"); if(!f||!f.files[0]) return; toast("Subiendo el ticket…");
  try{ const b=await shrink(f.files[0]); const k=(await api("/api/fotos",{method:"POST",headers:{"content-type":"image/jpeg"},body:b})).key; await api("/api/caja/foto/"+f.dataset.cjtk,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({foto:k})}); toast("Ticket añadido ✓"); cjCargar(true); }catch(err){ toast(err.message); } });

/* =====================================================================
   CUADRO DE MANDO DEL PROPIETARIO (solo gerente)
   ===================================================================== */
function cjPanel(){
  const r=CJR, cerr=r.turnos.filter(t=>t.cierre), difs=cerr.map(t=>t.cierre.diferencia).concat(r.turnos.filter(t=>t.apertura.diferencia).map(t=>t.apertura.diferencia));
  const falt=difs.filter(d=>d<0).reduce((a,d)=>a-d,0), sobr=difs.filter(d=>d>0).reduce((a,d)=>a+d,0), nDesc=difs.filter(Boolean).length;
  const salidas=r.turnos.flatMap(t=>t.movimientos.filter(m=>m.tipo==="egreso"&&!m.anulado)), cobros=r.turnos.flatMap(t=>t.movimientos.filter(m=>m.tipo==="ingreso"&&!m.anulado));
  const sinTk=r.turnos.reduce((a,t)=>a+t.sinTicket,0), nuevas=r.alertas.filter(a=>!a.vista).length, A=r.ahora;
  const maxAbs=Math.max(100,...cerr.map(t=>Math.abs(t.cierre.diferencia)));
  const orden=cerr.slice().reverse();
  return `<section class="cj-panel">
  <div class="cj-ph"><div><small>Solo para el propietario</small><h2>Cuadro de mando de la caja</h2></div>
    <div class="cj-ph-acts"><div class="mesnav"><button type="button" data-cjmes="-1" aria-label="Mes anterior">‹</button><b>${esc(nombreMes(CJ_MES))}</b><button type="button" data-cjmes="1" aria-label="Mes siguiente" ${CJ_MES>=hoyC().slice(0,7)?"disabled":""}>›</button></div><button type="button" class="btn b-ghost b-sm" data-cjlibro>Libro de registro</button><button type="button" class="btn b-ghost b-sm" data-cjcsv>Excel</button></div></div>
  <div class="cj-kpis">
    <div class="cj-kpi dest"><small>Efectivo teórico en el local ahora</small><b class="num">${cjE(A.teorico)}</b><span>${A.abierta?`Caja abierta por ${esc(A.nombre)}: fondo ${cjE(A.base)} + cobros ${cjE(A.ingresos)} − salidas ${cjE(A.egresos)}`:A.desde?`Caja cerrada: lo contado en el último cierre (${esc(A.nombre)}, ${esc(fechaHora(A.desde))})`:"La caja no se ha abierto todavía"}</span>${r.horasAbierta>14?`<em>Lleva ${Math.floor(r.horasAbierta)} h abierta sin cerrar</em>`:""}</div>
    <div class="cj-kpi ${falt?"mal":""}"><small>Faltante del mes</small><b class="num">${cjE(falt)}</b><span>${nDesc} descuadre${nDesc===1?"":"s"}${sobr?` · sobrante ${cjE(sobr)}`:""}</span></div>
    <div class="cj-kpi"><small>Cobros · salidas del mes</small><b class="num">${cjE(cobros.reduce((a,m)=>a+m.importe,0))}</b><span>salidas ${cjE(salidas.reduce((a,m)=>a+m.importe,0))} (${salidas.length})</span></div>
    <div class="cj-kpi ${sinTk?"mal":""}"><small>Salidas sin ticket</small><b class="num">${sinTk}</b><span>${sinTk?"Pendientes de justificar":"Todas con comprobante"}</span></div>
  </div>
  <div class="cj-grid">
    <section class="card cj-al"><h3>Alertas ${nuevas?`<span class="chip rojo">${nuevas} nueva${nuevas>1?"s":""}</span>`:""}</h3>${r.alertas.length?`<div class="t-als">${r.alertas.slice(0,12).map(a=>`<button type="button" class="t-al ${a.nivel==="rojo"?"":"ambar"} ${a.vista?"vista":""}" ${a.turno?`data-cjturno="${esc(a.turno)}"`:""}><i>${a.nivel==="rojo"?"⚠":"!"}</i><span><b>${esc(fechaHora(a.t))}</b> ${esc(a.txt)}</span></button>`).join("")}</div>${nuevas?'<button type="button" class="g-link" data-cjvistas style="margin-top:8px">Marcar todas como vistas</button>':""}`:'<p class="hint">Ninguna alerta. Aquí aparecen al momento los descuadres, las salidas sin ticket y los retiros grandes.</p>'}</section>
    <section class="card"><h3>Descuadre por cierre</h3><p class="hint">Rojo: falta dinero. Ámbar: sobra. Toca una barra para ver el turno.</p>${orden.length?`<div class="cj-bars">${orden.map(t=>{ const d=t.cierre.diferencia, h=Math.max(d?6:2,Math.abs(d)/maxAbs*50); return `<button type="button" class="cj-bar" data-cjturno="${esc(t.id)}" title="${esc(fecha(t.fecha))} · ${esc(t.cierre.nombre)}: ${esc(cjD(d))}"><i class="${d<0?"neg":d>0?"pos":"cero"}" style="height:${h}%;${d<0?"top:50%":`bottom:50%`}"></i></button>`; }).join("")}</div>`:'<p class="hint">Sin cierres este mes.</p>'}</section>
  </div>
  <section class="card"><h3>Descuadres por empleado</h3>${r.porEmpleado.length?`<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Empleado</th><th class="n">Cierres</th><th class="n">Descuadres</th><th class="n">Falta</th><th class="n">Sobra</th><th class="n">Neto</th><th class="n">Recuentos</th><th class="n">Sin ticket</th></tr></thead><tbody>${r.porEmpleado.sort((a,b)=>a.neto-b.neto).map(p=>`<tr><td><b>${esc(p.nombre)}</b></td><td class="n">${p.turnos}</td><td class="n">${p.descuadres}</td><td class="n ${p.faltante?"cj-rojo":""}">${cjE(p.faltante)}</td><td class="n">${cjE(p.sobrante)}</td><td class="n"><b class="${p.neto<0?"cj-rojo":""}">${cjD(p.neto)}</b></td><td class="n">${p.recuentos}</td><td class="n ${p.sinTicket?"cj-rojo":""}">${p.sinTicket}</td></tr>`).join("")}</tbody></table></div><p class="hint">Responde del cierre quien cierra la caja y de la apertura quien la abre. «Recuentos»: veces que alguien volvió a contar porque no cuadraba.</p>`:'<p class="hint">Sin datos este mes.</p>'}</section>
  <section class="card"><h3>Historial de turnos</h3>${r.turnos.length?`<div class="tabla-wrap"><table class="tabla cj-tur"><thead><tr><th>Turno</th><th>Abrió / cerró</th><th class="n">Debería haber</th><th class="n">Contado</th><th class="n">Diferencia</th><th>Explicación</th></tr></thead><tbody>${r.turnos.map(t=>{ const c=t.cierre, d=c?c.diferencia:null;
      return `<tr data-cjturno="${esc(t.id)}" tabindex="0" class="${d?"desc":""}"><td><b>${esc(fecha(t.fecha))}</b><small>${esc(tHora(t.apertura.t))}–${c?esc(tHora(c.t)):"abierta"}</small></td><td>${esc(t.apertura.nombre)}${t.apertura.diferencia?` <span class="chip rojo">apertura ${esc(cjD(t.apertura.diferencia))}</span>`:""}<small>${c?"Cerró "+esc(c.nombre):"Sin cerrar"}</small></td><td class="n num">${c?cjE(c.teorico):cjE(t.calculo.teorico)}</td><td class="n num">${c?cjE(c.contado):"—"}</td><td class="n num"><b class="${d<0?"cj-rojo":d>0?"cj-ambar":"cj-verde"}">${c?cjD(d):"—"}</b>${c&&c.intentos.length>1?`<small>${c.intentos.length} recuentos</small>`:""}</td><td>${c&&c.justificacion?`<small class="cj-j">«${esc(c.justificacion)}»</small>`:""}${t.sinTicket?' <span class="chip rojo">sin ticket</span>':""}${t.revision?' <span class="chip ok">Revisado</span>':d?' <span class="chip">Por revisar</span>':""}${t.ajustes.length?` <span class="chip">${t.ajustes.length} ajuste${t.ajustes.length>1?"s":""}</span>`:""}</td></tr>`; }).join("")}</tbody></table></div>`:'<p class="hint">No hay turnos en este mes.</p>'}</section>
  </section>`;
}
function cjCsv(){
  const filas=[["Fecha","Abrió","Hora apertura","Fondo","Diferencia apertura","Cobros","Salidas","Cerró","Hora cierre","Debería haber","Contado","Diferencia","Recuentos","Explicación","Revisado"]];
  for(const t of CJR.turnos){ const c=t.cierre, k=t.calculo; filas.push([t.fecha,t.apertura.nombre,tHora(t.apertura.t),(k.base/100).toFixed(2).replace(".",","),(t.apertura.diferencia/100).toFixed(2).replace(".",","),(k.ingresos/100).toFixed(2).replace(".",","),(k.egresos/100).toFixed(2).replace(".",","),c?c.nombre:"",c?tHora(c.t):"",c?(c.teorico/100).toFixed(2).replace(".",","):"",c?(c.contado/100).toFixed(2).replace(".",","):"",c?(c.diferencia/100).toFixed(2).replace(".",","):"",c?c.intentos.length:"",c?c.justificacion:"",t.revision?t.revision.nota:""]); }
  const csv="﻿"+filas.map(r=>r.map(x=>{ let v=String(x??""); if(/^[=+\-@\t\r]/.test(v)&&!/^-?\d/.test(v)) v="'"+v; return `"${v.replace(/"/g,'""')}"`; }).join(";")).join("\r\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})); a.download=`volcano-cars-caja-${CJ_MES}.csv`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
}

/* ---------- detalle de un turno (cajón) ---------- */
function cjTurno(id){
  const t=CJR&&CJR.turnos.find(x=>x.id===id); if(!t){ toast("Ese turno es de otro mes"); return; }
  DW={tipo:"caja",id}; const c=t.cierre, k=t.calculo;
  const desg=d=>Object.keys(d||{}).length?`<div class="cj-desg">${Object.entries(d).sort((a,b)=>b[0]-a[0]).map(([v,n])=>`<span>${n} × ${cjDen(+v)}</span>`).join("")}</div>`:'<small class="hint">Sin desglose</small>';
  abrirDrawer(`<div class="dw-head"><div><span class="tipo">Caja</span><h2 class="dw-nombre" style="margin:0">Turno del ${esc(fechaLarga(t.fecha))}</h2></div><button class="x" type="button" data-cerrar aria-label="Cerrar">✕</button></div>
    <section class="dw-box"><h3>Cuadre</h3><table class="tabla"><tbody>
      <tr><td>Fondo de apertura (${esc(t.apertura.nombre)}, ${esc(tHora(t.apertura.t))})</td><td class="n num">${cjE(k.base)}</td></tr>
      ${t.apertura.esperado!=null?`<tr><td><small>Quedó en el cierre anterior</small></td><td class="n num"><small>${cjE(t.apertura.esperado)}</small></td></tr>`:""}
      <tr><td>+ Cobros en efectivo</td><td class="n num">${cjE(k.ingresos)}</td></tr><tr><td>− Salidas</td><td class="n num">${cjE(k.egresos)}</td></tr>
      <tr><td><b>Debería haber</b></td><td class="n num"><b>${cjE(k.teorico)}</b></td></tr>
      ${c?`<tr><td><b>Contado al cerrar</b> (${esc(c.nombre)}, ${esc(tHora(c.t))})</td><td class="n num"><b>${cjE(c.contado)}</b></td></tr><tr class="${c.diferencia?"cj-fdesc":""}"><td><b>Diferencia</b></td><td class="n num"><b class="${c.diferencia<0?"cj-rojo":c.diferencia>0?"cj-ambar":"cj-verde"}">${cjD(c.diferencia)}</b></td></tr>`:""}
    </tbody></table>
    ${t.apertura.diferencia?`<div class="msg bad" style="margin-top:10px">Apertura con diferencia de ${esc(cjD(t.apertura.diferencia))}: «${esc(t.apertura.justificacion)}»</div>`:""}
    ${c&&c.justificacion?`<div class="msg bad" style="margin-top:10px">Explicación de ${esc(c.nombre)}: «${esc(c.justificacion)}»</div>`:""}</section>
    ${c?`<section class="dw-box"><h3>Conteos del cierre</h3>${c.intentos.map((x,i)=>`<div class="cj-int"><b>${i+1}º · ${esc(tHora(x.t))} · ${cjE(x.contado)}</b>${desg(x.desglose)}</div>`).join("")}${c.intentos.length>1?'<p class="hint">Varios recuentos: el empleado volvió a contar porque no cuadraba. Compara los importes.</p>':""}</section>`:""}
    <section class="dw-box"><h3>Movimientos (${t.movimientos.length})</h3>${t.movimientos.length?t.movimientos.map(m=>`<div class="cj-mov ${m.tipo} ${m.anulado?"anulado":""}"><i>${m.tipo==="egreso"?"−":"+"}</i><div><b>${esc(m.concepto)}</b><small>${esc(tHora(m.t))} · ${esc(CJ_TXT[m.categoria]||m.categoria)}${m.ref?" · "+esc(m.ref):""} · registra ${esc(m.porNombre)}${m.tipo==="egreso"?" · se lo lleva "+esc(m.responsableNombre):""}${m.ajuste?" · AJUSTE DEL GERENTE":""}</small>
      ${m.foto?`<a href="${FOTO(m.foto)}" target="_blank" rel="noopener" class="cj-tkimg">${m.foto.endsWith(".pdf")?'<span class="chip">Factura PDF</span>':`<img src="${FOTO(m.foto)}" alt="Ticket">`}</a>${m.sinTicket?`<small class="cj-ambar">Ticket añadido después (${esc(fechaHora(m.fotoT))})</small>`:""}`:m.tipo==="egreso"&&!m.ajuste?'<span class="chip rojo">Sin ticket</span>':""}
      ${m.anulado?`<small class="cj-rojo">Anulado: ${esc(m.anulado.motivo)} (${esc(fechaHora(m.anulado.t))})</small>`:`<button type="button" class="chipb" data-cjanular="${esc(m.id)}" style="margin-top:6px">Anular</button>`}</div><b class="num">${m.tipo==="egreso"?"−":"+"}${cjE(m.importe)}</b></div>`).join(""):'<p class="hint">Sin movimientos.</p>'}</section>
    ${t.ajustes.length?`<section class="dw-box"><h3>Ajustes del gerente</h3>${t.ajustes.map(a=>`<p style="margin:0 0 6px"><b>${esc(fechaHora(a.t))}</b> · ${esc(a.tipo)} ${esc(cjD(a.importe))} · ${esc(a.concepto)}<br><small>Motivo: ${esc(a.motivo)}</small></p>`).join("")}</section>`:""}
    ${c?`<section class="dw-box"><h3>Revisión</h3>${t.revision?`<div class="t-firmado"><span class="t-sello">✓</span><span><b>Revisado</b><small>${esc(fechaHora(t.revision.t))} · ${esc(t.revision.nota)}</small></span></div>`:`<div class="quick"><input class="in" id="cj-rev" placeholder="Qué has comprobado o decidido (p. ej. «Lo repone de su sueldo»)" maxlength="400" style="flex:1 1 240px"><button type="button" class="btn b-brand b-sm" data-cjrevisar="${esc(t.id)}">Dar por revisado</button></div>`}</section>
    <section class="dw-box"><h3>Ajuste del gerente</h3><p class="hint" style="margin:0 0 8px">Para corregir un turno cerrado (un cobro que no se registró, una salida olvidada…). No borra nada: añade un movimiento marcado como ajuste, recalcula la diferencia y queda en el libro.</p>
      <div class="t-g2"><div class="field"><label>Tipo</label><select class="in" id="cj-at"><option value="ingreso">Cobro no registrado (+)</option><option value="egreso">Salida no registrada (−)</option></select></div><div class="field"><label>Importe (€)</label><input class="in num" id="cj-ai" inputmode="decimal" placeholder="0,00"></div></div>
      <div class="field" style="margin-top:8px"><label>Concepto</label><input class="in" id="cj-ac" maxlength="200"></div><div class="field" style="margin-top:8px"><label>Motivo del ajuste</label><input class="in" id="cj-am" maxlength="300"></div>
      <button type="button" class="btn b-ghost b-sm" data-cjajuste="${esc(t.id)}" style="margin-top:10px">Añadir ajuste</button></section>`:""}
    <p style="padding-bottom:30px"></p>`);
}
$("#dw-body").addEventListener("click",async e=>{ if(!DW||DW.tipo!=="caja") return; const t=e.target;
  try{
    const an=t.closest("[data-cjanular]"); if(an){ const m=prompt("Motivo de la anulación (queda en el libro de registro):"); if(!m||m.trim().length<5) return toast("Hace falta un motivo");
      await api("/api/caja/anular/"+an.dataset.cjanular,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({motivo:m})}); toast("Movimiento anulado"); await cjCargar(true); cjTurno(DW.id); return; }
    const rv=t.closest("[data-cjrevisar]"); if(rv){ await api("/api/caja/revisar/"+rv.dataset.cjrevisar,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({nota:$("#cj-rev").value})}); toast("Turno revisado"); await cjCargar(true); cjTurno(DW.id); return; }
    const aj=t.closest("[data-cjajuste]"); if(aj){ const imp=cjNum($("#cj-ai").value); if(!(imp>0)) return toast("Escribe el importe");
      const r=await api("/api/caja/ajuste/"+aj.dataset.cjajuste,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({tipo:$("#cj-at").value,importe:String(imp),concepto:$("#cj-ac").value,motivo:$("#cj-am").value})});
      toast("Ajuste guardado. Nueva diferencia: "+cjD(r.diferencia)); await cjCargar(true); cjTurno(DW.id); return; }
  }catch(err){ toast(err.message); } });

/* ---------- libro de registro ---------- */
async function cjLibro(){
  DW={tipo:"caja-libro",id:"l"}; abrirDrawer('<div class="empty">Cargando el libro…</div>');
  try{ const r=await api(`/api/caja/libro?desde=${CJ_MES}-01&hasta=${finMes(CJ_MES)}`);
    $("#dw-body").innerHTML=`<div class="dw-head"><div><span class="tipo">Caja</span><h2 class="dw-nombre" style="margin:0">Libro de registro</h2></div><button class="x" type="button" data-cerrar aria-label="Cerrar">✕</button></div>
      <section class="dw-box cj-integ ${r.integro?"ok":"mal"}"><b>${r.integro?"✓ Libro íntegro":"⚠ El libro ha sido manipulado"}</b><p class="hint" style="margin:4px 0 0">${r.integro?`${r.total} registros encadenados: cada uno lleva la huella del anterior, así que nadie puede cambiar ni borrar uno sin que se note.`:`Registros con la huella rota: ${esc(r.rotas.join(", "))}. Alguien ha tocado los datos por fuera del panel.`}</p></section>
      <section class="dw-box"><h3>${esc(nombreMes(CJ_MES))}</h3>${r.entradas.length?`<div class="tabla-wrap"><table class="tabla t-aud"><tbody>${r.entradas.map(x=>`<tr class="${/no-cuadra|anulacion|ajuste/.test(x.accion)?"sens":""}"><td class="num"><small>#${x.n}</small><br><small>${esc(fechaHora(x.t))}</small></td><td><b>${esc(CJ_ACC[x.accion]||x.accion)}</b><small>${esc(cjResumenLog(x))}</small></td><td><b>${esc(x.nombre)}</b><small>${esc(T_ROL[x.rol]||x.rol)}</small></td></tr>`).join("")}</tbody></table></div>`:'<p class="hint">Sin registros este mes.</p>'}</section><p style="padding-bottom:30px"></p>`;
  }catch(err){ $("#dw-body").innerHTML=`<div class="empty">${esc(err.message)}</div>`; } }
function cjResumenLog(x){ const d=x.datos||{}, p=[];
  if(d.importe!=null) p.push(cjE(d.importe)); if(d.concepto) p.push(d.concepto); if(d.categoria) p.push(CJ_TXT[d.categoria]||d.categoria);
  if(d.contado!=null) p.push("contado "+cjE(d.contado)); if(d.teorico!=null) p.push("debería "+cjE(d.teorico)); if(d.diferencia) p.push("diferencia "+cjD(d.diferencia));
  if(d.intento) p.push("recuento nº "+d.intento); if(d.sinTicket) p.push("SIN TICKET"); if(d.justificacion) p.push("«"+d.justificacion+"»"); if(d.motivo) p.push("motivo: "+d.motivo); if(d.nota) p.push(d.nota);
  return p.join(" · "); }

/* ---------- avisos en vivo para el gerente (pestaña, notificación del navegador) ---------- */
function cjBadge(n){ const b=$("#n-caja"); if(b){ b.hidden=!n; b.textContent=n; } }
async function cjVigilar(){
  if(!PW||!ME||!ES_GER()||document.hidden||(ES_EQ()&&!ME.caja)) return;
  try{ const r=await api(`/api/caja/resumen?desde=${hoyC().slice(0,7)}-01&hasta=${hoyC()}`); const nuevas=r.alertas.filter(a=>!a.vista);
    cjBadge(nuevas.length);
    const frescas=nuevas.filter(a=>!CJ_ALERTAS_VISTAS.has(a.id)&&Date.now()-Date.parse(a.t)<10*60e3);
    nuevas.forEach(a=>CJ_ALERTAS_VISTAS.add(a.id));
    if(frescas.length&&cjVigilar.ya){ const a=frescas[0]; toast("Caja: "+a.txt); pitido&&pitido();
      try{ if("Notification" in window&&Notification.permission==="granted"){ const n=new Notification("Volcano Cars · Caja",{body:a.txt,tag:"vc-caja-"+a.id}); n.onclick=()=>{ window.focus(); cjAbrirTab(); n.close(); }; } }catch(_){ } }
    cjVigilar.ya=true;
    if(!$("#s-caja").hidden&&!CJ_MODO&&!document.querySelector("#dlg-cj[open]")){ CJR=CJ_MES===hoyC().slice(0,7)?r:CJR; CJ=await api("/api/caja/estado"); cjPintar(); }
  }catch(_){ }
}
setInterval(cjVigilar,15000);
setInterval(async()=>{ if(!PW||ES_GER()||$("#s-caja").hidden||CJ_MODO||document.querySelector("#dlg-cj[open]")) return; try{ CJ=await api("/api/caja/estado"); cjPintar(); }catch(_){ } },20000);
