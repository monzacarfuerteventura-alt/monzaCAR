/* =====================================================================
   TALLER · COCHES PROPIOS (control interno de cada coche que entra para venderlo)
   Vista dentro de la pestaña Taller. Todo es privado: no toca la web pública.
   Fase: Entrada/dañado → En reparación → Control de calidad → Listo para venta (interno) → Vendido.
   Las piezas salen del Inventario; las horas y otros costes se anotan aquí; Finanzas suma todo al beneficio.
   Fuente: tools/vehiculos/vehiculos.js → python3 tools/vehiculos/inyectar.py
   ===================================================================== */
let VP=null, VP_ID="", VP_FILTRO="activos", VP_ALM=null;
const vpE=c=>eur((Number(c)||0)/100);
const vpNum=v=>{ const n=Number(String(v??"").replace(/\s|€/g,"").replace(",",".")); return Number.isFinite(n)?n:NaN; };
const vpHoras=m=>{ m=Math.round(m||0); const h=Math.floor(m/60), r=m%60; return h?`${h} h${r?` ${r} min`:""}`:`${r} min`; };
const vpFecha=t=>{ try{ return new Date(t).toLocaleString("es-ES",{timeZone:"Atlantic/Canary",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}); }catch(_){ return t||""; } };
const vpDias=d=>{ if(!d) return 0; return Math.max(0,Math.round((Date.parse(hoyC()+"T12:00:00Z")-Date.parse(d+"T12:00:00Z"))/864e5)); };
const vpPost=(ruta,body)=>api("/api/vehiculos/"+ruta,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})});
const vpAdmin=()=>!!(VP&&VP.admin);
const vpAlta=()=>vpAdmin()||(ME&&ME.rol==="recepcion");
const VP_PASOS=["entrada","reparacion","calidad","listo","vendido"];
const vpFicha=()=>VP&&VP.fichas.find(f=>f.id===VP_ID);
function vpPon(ficha){ if(!VP||!ficha) return; const i=VP.fichas.findIndex(f=>f.id===ficha.id); if(i>=0) VP.fichas[i]=ficha; else VP.fichas.unshift(ficha); }

/* ---------- carga y vista ---------- */
async function vpCargar(quieto){
  if(!quieto&&!VP) $("#ordenes").innerHTML='<div class="empty">Cargando los coches propios…</div>';
  try{ VP=await api("/api/vehiculos/estado"); if(TVISTA==="propios") vpPintar(); }
  catch(err){ if(!quieto) $("#ordenes").innerHTML=`<div class="empty">${esc(err.message)}</div>`; }
}
function vpPintar(){
  if(!$("#ordenes")) return;
  if(!VP){ vpCargar(); return; }
  $("#ordenes").innerHTML=VP_ID&&vpFicha()?vpDetalle(vpFicha()):vpLista();
}
function vpBadge(){ if(!VP) return 0; return VP.fichas.filter(f=>f.fase!=="vendido").length; }

function vpLista(){
  const act=VP.fichas.filter(f=>f.fase!=="vendido"), ven=VP.fichas.filter(f=>f.fase==="vendido");
  const filtros=[["activos","En el taller",act.length],...VP.fases.filter(([k])=>k!=="vendido").map(([k,t])=>[k,t,VP.fichas.filter(f=>f.fase===k).length]),["vendido","Vendidos",ven.length]];
  const lista=VP_FILTRO==="activos"?act:VP.fichas.filter(f=>f.fase===VP_FILTRO);
  return `<section class="card"><div class="t-bar" style="margin-bottom:6px"><div><h3 style="margin:0">Coches propios</h3><p class="hint" style="margin:2px 0 0">Coches que compráis para arreglar y vender. Solo interno: no sale nada en la web. Las piezas se cargan desde aquí y se descuentan del Inventario.</p></div>
    <div class="t-bar-acts">${vpAdmin()?'<button type="button" class="btn b-ghost b-sm" data-vpcfg>Coste por hora</button>':""}${vpAdmin()?'<button type="button" class="btn b-ghost b-sm" data-vplibro>Registro</button>':""}${vpAlta()?'<button type="button" class="btn b-acc b-sm" data-vpnuevo>+ Coche que entra</button>':""}</div></div>
    <div class="t-filtros" role="group" aria-label="Fase">${filtros.map(([k,t,n])=>`<button type="button" class="chipb" data-vpfiltro="${k}" aria-pressed="${VP_FILTRO===k}">${esc(t)} <b class="num">${n}</b></button>`).join("")}</div>
    ${lista.length?`<div class="vp-lista">${lista.map(vpTarjeta).join("")}</div>`:`<div class="empty" style="margin-top:10px"><b style="color:var(--ink)">No hay coches en esta fase.</b>${vpAlta()&&!VP.fichas.length?"<br>Pulsa «+ Coche que entra» cuando llegue uno que vayáis a arreglar para vender.":""}</div>`}</section>`;
}
function vpTarjeta(f){
  const e=f.eco, ben=e&&e.beneficio!=null?e.beneficio:null;
  return `<button type="button" class="vp-card" data-vpabrir="${esc(f.id)}"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><span class="mat">${esc(f.matricula||f.ref)}</span><span class="vp-fase f-${f.fase}">${esc(f.faseTxt)}</span></div>
    <b class="tit">${esc([f.marca,f.modelo,f.version].filter(Boolean).join(" "))}${f.anio?` · ${f.anio}`:""}</b>
    <div class="fila"><span>${esc(f.ref)}</span><span>${f.fase==="vendido"?"Vendido":vpDias(f.entrada)+" días en el taller"}</span><span>${vpHoras(f.horasMin)} trabajadas</span>${f.piezas.length?`<span>${f.piezas.length} pieza${f.piezas.length>1?"s":""}</span>`:""}${f.costes.some(c=>c.estado==="pendiente"&&!c.anulado)?'<span class="chip rojo">Costes por aprobar</span>':""}</div>
    ${e?`<div class="eco"><span>Invertido <b class="num">${vpE(e.total)}</b></span>${ben!=null?`<span class="${ben>=0?"vp-pos":"vp-neg"}">${f.fase==="vendido"?"Beneficio":"Beneficio previsto"} <b class="num">${vpE(ben)}</b></span>`:'<span>Sin precio previsto</span>'}</div>`:""}</button>`;
}

/* ---------- ficha de un coche ---------- */
function vpDetalle(f){
  const e=f.eco, cerrado=f.fase==="vendido", idx=VP_PASOS.indexOf(f.fase);
  const hist=[...f.actualizaciones].reverse();
  const horasAct=f.horas.filter(h=>!h.anulada);
  return `<div class="t-bar"><button type="button" class="btn b-ghost b-sm" data-vpvolver>← Coches propios</button>${vpAlta()&&!cerrado?`<button type="button" class="btn b-ghost b-sm" data-vpeditar="${esc(f.id)}">Editar datos</button>`:""}</div>
  <section class="card"><div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><div><h2 style="margin:0;font-size:22px">${esc([f.marca,f.modelo,f.version].filter(Boolean).join(" "))}</h2>
      <p class="hint" style="margin:4px 0 0">${esc(f.ref)} · <b class="num">${esc(f.matricula||"sin matrícula")}</b>${f.anio?` · ${f.anio}`:""}${f.km?` · ${f.km.toLocaleString("es-ES")} km`:""}${f.color?` · ${esc(f.color)}`:""}${f.vin?` · VIN ${esc(f.vin)}`:""}<br>Entró el ${esc(String(f.entrada).split("-").reverse().join("/"))}${cerrado?"":` · ${vpDias(f.entrada)} días en el taller`}${f.cocheTxt?` · Enlazado con «${esc(f.cocheTxt)}» de la web`:""}</p></div><span class="vp-fase f-${f.fase}">${esc(f.faseTxt)}</span></div>
    ${f.danos?`<p style="margin:10px 0 0"><b>Daños / trabajo a hacer:</b> ${esc(f.danos)}</p>`:""}
    <ol class="vp-pasos" aria-label="Fases">${VP.fases.map(([k,t],i)=>`<li class="${i<idx?"hecho":i===idx?"ahora":""}">${esc(t)}</li>`).join("")}</ol>
    ${f.ultimaCalidad&&(f.fase==="listo"||f.fase==="vendido")?`<p class="hint">Calidad firmada por ${esc(f.ultimaCalidad.nombre)} el ${vpFecha(f.ultimaCalidad.t)}.</p>`:""}
    ${cerrado?'<p class="hint">Coche vendido: la ficha queda cerrada.</p>':`<div class="vp-acts">${vpAcciones(f)}</div>`}</section>
  <div class="vp-grid">
    ${e?`<section class="card"><h3>Economía del coche <small class="hint">(solo gerente)</small></h3><table class="vp-eco"><tbody>
      <tr><td>Compra</td><td>${vpE(e.compra)}</td></tr><tr><td>Piezas del inventario</td><td>${vpE(e.piezas)}</td></tr><tr><td>Mano de obra (${vpHoras(f.horasMin)})</td><td>${vpE(e.horas)}</td></tr><tr><td>Otros costes aprobados</td><td>${vpE(e.otros)}</td></tr>
      <tr class="tot"><td>Total invertido</td><td>${vpE(e.total)}</td></tr>
      <tr><td>${cerrado?"Precio de venta (sin IGIC)":"Precio previsto (sin IGIC)"}</td><td>${e.previsto?vpE(e.previsto):"—"}</td></tr>
      <tr class="tot"><td>${cerrado?"Beneficio":"Beneficio previsto"}</td><td class="${e.beneficio==null?"":e.beneficio>=0?"vp-pos":"vp-neg"}">${e.beneficio==null?"—":vpE(e.beneficio)}</td></tr></tbody></table>
      ${e.pendiente?`<p class="hint" style="margin-top:8px">Hay ${vpE(e.pendiente)} pendientes de aprobar: aún no cuentan.</p>`:""}
      ${!VP.cfg||!VP.cfg.costeHora?'<p class="msg bad" style="margin-top:8px">Falta el coste por hora del taller: pulsa «Coste por hora» para que las horas se valoren.</p>':""}
      <p class="hint" style="margin-top:8px">${f.coche?"Finanzas suma piezas, horas y costes de esta ficha al reacondicionamiento del coche enlazado.":"Sin enlazar con un coche de la web: Finanzas no ve estos costes. Enlázalo en «Editar datos» cuando lo publiques."}</p></section>`:""}
    <section class="card"><h3>Horas trabajadas <span class="chip">${vpHoras(f.horasMin)}</span></h3>
      ${horasAct.length||f.horas.length?`<div class="tabla-wrap"><table class="tabla"><tbody>${f.horas.map(h=>`<tr class="${h.anulada?"vp-anulado":""}"><td>${esc(h.fecha.split("-").reverse().join("/"))}</td><td>${esc(h.nombre)}</td><td class="num">${vpHoras(h.min)}</td><td>${esc(h.nota||"")}${h.anulada?` <small>(anulada: ${esc(h.anulada.motivo)})</small>`:""}</td>${vpAdmin()&&!h.anulada&&!cerrado?`<td><button type="button" class="chipb" data-vpanular="horas|${esc(h.id)}">Anular</button></td>`:"<td></td>"}</tr>`).join("")}</tbody></table></div>`:'<p class="hint">Aún no hay horas.</p>'}
      ${cerrado?"":'<div class="vp-acts"><button type="button" class="btn b-acc b-sm" data-vphoras>+ Anotar mis horas</button></div>'}</section>
    <section class="card"><h3>Piezas del inventario <span class="chip">${f.piezas.length}</span></h3>
      ${f.piezas.length?`<div class="tabla-wrap"><table class="tabla"><tbody>${f.piezas.map(p=>`<tr><td>${esc(p.sku)}</td><td>${esc(p.nombre)}</td><td class="num">${alN(p.cantidad)}${p.devuelto?` <small>(devueltas ${alN(p.devuelto)})</small>`:""}</td><td>${esc(p.por)}</td>${vpAdmin()&&p.coste!=null?`<td class="num">${vpE(Math.round((p.cantidad-p.devuelto)*p.coste))}</td>`:""}</tr>`).join("")}</tbody></table></div>`:'<p class="hint">Ninguna pieza cargada todavía.</p>'}
      ${cerrado?"":'<div class="vp-acts"><button type="button" class="btn b-acc b-sm" data-vppieza>+ Cargar pieza del inventario</button></div><p class="hint">Descuenta el stock al momento. Si la pieza sobra, devuélvela desde Inventario → Movimientos.</p>'}</section>
    <section class="card"><h3>Otros costes <span class="chip">${f.costes.filter(c=>!c.anulado).length}</span></h3>
      ${f.costes.length?`<div class="tabla-wrap"><table class="tabla"><tbody>${f.costes.map(c=>`<tr class="${c.anulado||c.estado==="rechazado"?"vp-anulado":""}"><td>${esc(c.fecha.split("-").reverse().join("/"))}</td><td>${esc(c.concepto)}<br><small class="hint">${esc(c.nombre)}${c.decidido&&c.estado==="rechazado"?" · rechazado: "+esc(c.decidido.motivo):""}${c.anulado?" · anulado: "+esc(c.anulado.motivo):""}</small></td>${vpAdmin()?`<td class="num">${vpE(c.importe)}</td>`:""}<td>${c.anulado?"":c.estado==="pendiente"?'<span class="chip rojo">Por aprobar</span>':c.estado==="aprobado"?'<span class="chip ok">Aprobado</span>':'<span class="chip">Rechazado</span>'}</td>
        <td>${vpAdmin()&&!cerrado&&!c.anulado?(c.estado==="pendiente"?`<button type="button" class="chipb" data-vpdecidir="aprobar|${esc(c.id)}">Aprobar</button> <button type="button" class="chipb" data-vpdecidir="rechazar|${esc(c.id)}">Rechazar</button>`:c.estado==="aprobado"?`<button type="button" class="chipb" data-vpanular="coste|${esc(c.id)}">Anular</button>`:""):""}</td></tr>`).join("")}</tbody></table></div>`:'<p class="hint">Pintura, grúa, tasas, piezas de fuera del inventario… El equipo los propone y el gerente los aprueba.</p>'}
      ${cerrado?"":'<div class="vp-acts"><button type="button" class="btn b-ghost b-sm" data-vpcoste>+ Proponer un coste</button></div>'}</section>
    <section class="card ancho"><h3>Avances, notas técnicas y fotos</h3>
      ${cerrado?"":'<div class="vp-acts" style="margin:0 0 8px"><button type="button" class="btn b-acc b-sm" data-vpnota>+ Nota o fotos de avance</button></div>'}
      ${hist.length?`<ul class="vp-hist">${hist.map(a=>`<li class="${a.tipo}"><small>${vpFecha(a.t)} · ${esc(a.nombre)}${a.tipo==="tecnica"?" · nota técnica":""}</small>${esc(a.txt)}${a.fotos&&a.fotos.length?`<div class="vp-fotos">${a.fotos.map(k=>`<a href="${esc(FOTO(k))}" target="_blank" rel="noopener"><img src="${esc(FOTO(k))}" alt="Foto de avance" loading="lazy"></a>`).join("")}</div>`:""}</li>`).join("")}</ul>`:'<p class="hint">Sin movimientos.</p>'}</section>
  </div>`;
}
function vpAcciones(f){
  const b=(fase,txt,cls="b-acc")=>`<button type="button" class="btn ${cls} b-sm" data-vpfase="${fase}">${txt}</button>`;
  if(f.fase==="entrada") return b("reparacion","Empezar la reparación");
  if(f.fase==="reparacion") return b("calidad","Pasar a control de calidad");
  if(f.fase==="calidad") return b("listo","Aprobar: listo para venta")+b("reparacion","Devolver a reparación","b-ghost");
  if(f.fase==="listo") return (vpAdmin()?b("vendido","Marcar como vendido")+b("reparacion","Reabrir","b-ghost"):"")||'<span class="hint">Listo para venta. Publicarlo en la web se hace desde Coches, cuando tú quieras.</span>';
  return "";
}

/* ---------- diálogos ---------- */
function vpDlg(html){ let d=$("#dlg-vp"); if(!d){ d=document.createElement("dialog"); d.id="dlg-vp"; d.className="t-dlg fn-dlg"; document.body.appendChild(d); } d.innerHTML=html; d.showModal(); d.querySelectorAll("[data-vpcancel]").forEach(b=>b.onclick=()=>d.close()); return d; }
const vpErr=t=>{ const e=$("#vp-err"); if(e){ e.textContent=t; e.hidden=false; } };
function vpForm(f){
  const g=k=>f?f[k]??"":"", adm=vpAdmin();
  const d=vpDlg(`<form id="f-vp" novalidate><h2>${f?"Editar datos del coche":"Coche que entra"}</h2>
    <div class="t-g3"><div class="field"><label for="vp-mar">Marca *</label><input class="in" id="vp-mar" maxlength="40" value="${esc(g("marca"))}"></div><div class="field"><label for="vp-mod">Modelo *</label><input class="in" id="vp-mod" maxlength="60" value="${esc(g("modelo"))}"></div><div class="field"><label for="vp-ver">Versión</label><input class="in" id="vp-ver" maxlength="60" value="${esc(g("version"))}"></div></div>
    <div class="t-g3"><div class="field"><label for="vp-mat">Matrícula</label><input class="in" id="vp-mat" maxlength="12" autocapitalize="characters" value="${esc(g("matricula"))}"></div><div class="field"><label for="vp-anio">Año</label><input class="in num" id="vp-anio" inputmode="numeric" value="${g("anio")||""}"></div><div class="field"><label for="vp-km">Kilómetros</label><input class="in num" id="vp-km" inputmode="numeric" value="${g("km")||""}"></div></div>
    <div class="t-g2"><div class="field"><label for="vp-col">Color</label><input class="in" id="vp-col" maxlength="30" value="${esc(g("color"))}"></div><div class="field"><label for="vp-vin">Bastidor (VIN)</label><input class="in" id="vp-vin" maxlength="24" value="${esc(g("vin"))}"></div></div>
    <div class="field"><label for="vp-dan">Daños / trabajo a hacer</label><textarea class="in" id="vp-dan" rows="3" maxlength="1000">${esc(g("danos"))}</textarea></div>
    ${adm?`<div class="t-g2"><div class="field"><label for="vp-com">Precio de compra (€)</label><input class="in num" id="vp-com" inputmode="decimal" value="${f?(f.compra/100).toFixed(2).replace(".",","):""}"></div><div class="field"><label for="vp-pre">Precio de venta previsto (€, sin IGIC)</label><input class="in num" id="vp-pre" inputmode="decimal" value="${f&&f.precioPrevisto?(f.precioPrevisto/100).toFixed(2).replace(".",","):""}"></div></div>
      ${f?`<div class="field"><label for="vp-web">Coche de la web al que corresponde (opcional)</label><select class="in" id="vp-web"><option value="">Sin enlazar (interno)</option>${VP.coches.map(c=>`<option value="${esc(c.id)}" ${c.id===f.coche?"selected":""}>${esc(c.txt)}</option>`).join("")}${f.coche&&!VP.coches.some(c=>c.id===f.coche)?`<option value="${esc(f.coche)}" selected>${esc(f.cocheTxt||f.coche)}</option>`:""}</select><small class="hint">Solo sirve para que Finanzas calcule el beneficio cuando lo vendas. No publica nada.</small></div>`:""}`:'<p class="hint">El precio de compra y el de venta los pone el gerente.</p>'}
    <div class="msg bad" id="vp-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-vpcancel>Cancelar</button><button type="submit" class="btn b-acc" id="vp-ok">Guardar</button></div></form>`);
  $("#f-vp").onsubmit=async e=>{ e.preventDefault();
    const b={marca:$("#vp-mar").value,modelo:$("#vp-mod").value,version:$("#vp-ver").value,matricula:$("#vp-mat").value,anio:$("#vp-anio").value,km:$("#vp-km").value,color:$("#vp-col").value,vin:$("#vp-vin").value,danos:$("#vp-dan").value};
    if(b.marca.trim().length<2||!b.modelo.trim()) return vpErr("Escribe la marca y el modelo.");
    if(adm){ b.compra=$("#vp-com").value; b.precioPrevisto=$("#vp-pre").value; if(b.compra&&!(vpNum(b.compra)>=0)) return vpErr("El precio de compra no es válido."); if(b.precioPrevisto&&!(vpNum(b.precioPrevisto)>=0)) return vpErr("El precio previsto no es válido."); if(f&&$("#vp-web")) b.coche=$("#vp-web").value; }
    $("#vp-ok").disabled=true;
    try{ const r=await vpPost(f?"editar/"+f.id:"crear",b); vpPon(r.ficha); d.close(); if(!f){ VP_ID=r.ficha.id; } toast(f?"Datos guardados":"Coche dado de alta: "+r.ficha.ref); vpCargar(true); vpPintar(); }
    catch(err){ vpErr(err.message); $("#vp-ok").disabled=false; } };
}
function vpFaseDlg(fase){
  const f=vpFicha(), txt=VP.fases.find(x=>x[0]===fase)[1], pideNota=(f.fase==="calidad"&&fase==="reparacion")||(f.fase==="listo"&&fase==="reparacion"), pideVenta=fase==="vendido"&&!f.coche;
  const d=vpDlg(`<form id="f-vp" novalidate><h2>Pasar a «${esc(txt)}»</h2>
    ${fase==="listo"?'<p class="hint">Confirma que has revisado el coche. Esto es solo un estado interno: no lo publica en la web.</p>':""}
    ${pideNota?'<p class="hint">Explica qué hay que repetir o por qué se reabre.</p>':""}
    ${pideVenta?'<div class="field"><label for="vp-base">Precio de venta final (€, sin IGIC) *</label><input class="in num" id="vp-base" inputmode="decimal"></div>':fase==="vendido"?'<p class="hint">Este coche está enlazado con la web: márcalo «Vendido» en Coches y registra la venta en Finanzas antes. El beneficio real sale de Finanzas.</p>':""}
    <div class="field"><label for="vp-nota">Nota ${pideNota?"*":"(opcional)"}</label><textarea class="in" id="vp-nota" rows="2" maxlength="400"></textarea></div>
    <div class="msg bad" id="vp-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-vpcancel>Cancelar</button><button type="submit" class="btn b-acc" id="vp-ok">Confirmar</button></div></form>`);
  $("#f-vp").onsubmit=async e=>{ e.preventDefault(); const nota=$("#vp-nota").value.trim();
    if(pideNota&&nota.length<8) return vpErr("Explícalo con algo más de detalle (mínimo 8 letras).");
    const b={fase,nota}; if(pideVenta){ b.base=$("#vp-base").value; if(!(vpNum(b.base)>0)) return vpErr("Escribe el precio de venta."); }
    $("#vp-ok").disabled=true;
    try{ const r=await vpPost("fase/"+f.id,b); vpPon(r.ficha); d.close(); toast("Fase cambiada: "+txt); vpPintar(); }catch(err){ vpErr(err.message); $("#vp-ok").disabled=false; } };
}
function vpHorasDlg(){
  const f=vpFicha();
  const d=vpDlg(`<form id="f-vp" novalidate><h2>Anotar horas</h2><p class="hint">Las horas que has trabajado en este coche. Se valoran con el coste por hora del taller.</p>
    <div class="t-g3"><div class="field"><label for="vp-h">Horas *</label><input class="in num" id="vp-h" inputmode="decimal" placeholder="Ej.: 2,5"></div><div class="field"><label for="vp-f">Día</label><input class="in" id="vp-f" type="date" value="${hoyC()}" max="${hoyC()}"></div></div>
    <div class="field"><label for="vp-n">Qué has hecho</label><input class="in" id="vp-n" maxlength="200" placeholder="Ej.: chapa del paragolpes"></div>
    <div class="msg bad" id="vp-err" hidden></div><div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-vpcancel>Cancelar</button><button type="submit" class="btn b-acc" id="vp-ok">Guardar</button></div></form>`);
  $("#f-vp").onsubmit=async e=>{ e.preventDefault(); if(!(vpNum($("#vp-h").value)>0)) return vpErr("Pon las horas (por ejemplo 1,5).");
    $("#vp-ok").disabled=true; try{ const r=await vpPost("horas/"+f.id,{horas:$("#vp-h").value,fecha:$("#vp-f").value,nota:$("#vp-n").value}); vpPon(r.ficha); d.close(); toast("Horas anotadas"); vpPintar(); }catch(err){ vpErr(err.message); $("#vp-ok").disabled=false; } };
}
async function vpPiezaDlg(){
  const f=vpFicha();
  try{ VP_ALM=await api("/api/almacen/estado"); }catch(err){ toast(err.message); return; }
  const piezas=VP_ALM.piezas.filter(p=>p.stock>0);
  const d=vpDlg(`<form id="f-vp" novalidate><h2>Cargar pieza del inventario</h2>
    ${piezas.length?`<div class="field"><label for="vp-q">Buscar</label><input class="in" id="vp-q" type="search" placeholder="Nombre, código o referencia"></div>
    <div class="field"><label for="vp-p">Pieza *</label><select class="in" id="vp-p" size="6">${piezas.map(p=>`<option value="${esc(p.id)}" data-b="${esc([p.nombre,p.sku,p.ref,p.ubicacion].join(" ").toLowerCase())}">${esc(p.sku)} · ${esc(p.nombre)} — quedan ${alN(p.stock)} ${esc(p.unidad)}</option>`).join("")}</select></div>
    <div class="field"><label for="vp-c">Cantidad *</label><input class="in num" id="vp-c" inputmode="decimal" value="1"></div>`:'<p class="empty">No hay piezas con stock. Registra una entrada en Inventario.</p>'}
    <div class="msg bad" id="vp-err" hidden></div><div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-vpcancel>Cancelar</button>${piezas.length?'<button type="submit" class="btn b-acc" id="vp-ok">Descontar del stock</button>':""}</div></form>`);
  const q=$("#vp-q"); if(q) q.oninput=()=>{ const t=q.value.trim().toLowerCase(); d.querySelectorAll("#vp-p option").forEach(o=>o.hidden=!!t&&!o.dataset.b.includes(t)); };
  $("#f-vp").onsubmit=async e=>{ e.preventDefault(); if(!$("#vp-p")||!$("#vp-p").value) return vpErr("Elige la pieza."); if(!(vpNum($("#vp-c").value)>0)) return vpErr("Pon cuántas unidades.");
    $("#vp-ok").disabled=true;
    try{ const r=await api("/api/almacen/imputar",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({vehiculo:f.id,pieza:$("#vp-p").value,cantidad:$("#vp-c").value})}); d.close(); toast(`Descontado del inventario. Quedan ${alN(r.stock)}`+(r.bajoMinimo?" · ¡por debajo del mínimo!":"")); const n=await api("/api/vehiculos/ficha/"+f.id); vpPon(n); vpPintar(); if(typeof alCargar==="function") alCargar(true); }
    catch(err){ vpErr(err.message); $("#vp-ok").disabled=false; } };
}
function vpCosteDlg(){
  const f=vpFicha();
  const d=vpDlg(`<form id="f-vp" novalidate><h2>${vpAdmin()?"Anotar un coste":"Proponer un coste"}</h2><p class="hint">Gastos de este coche que no salen del inventario: pintura, grúa, tasas, piezas compradas fuera… ${vpAdmin()?"":"El gerente lo revisa antes de que cuente."}</p>
    <div class="field"><label for="vp-cc">Qué es *</label><input class="in" id="vp-cc" maxlength="160" placeholder="Ej.: pintura del paragolpes"></div>
    <div class="t-g2"><div class="field"><label for="vp-ci">Importe (€, sin IGIC) *</label><input class="in num" id="vp-ci" inputmode="decimal"></div><div class="field"><label for="vp-cf">Fecha</label><input class="in" id="vp-cf" type="date" value="${hoyC()}" max="${hoyC()}"></div></div>
    <div class="msg bad" id="vp-err" hidden></div><div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-vpcancel>Cancelar</button><button type="submit" class="btn b-acc" id="vp-ok">Guardar</button></div></form>`);
  $("#f-vp").onsubmit=async e=>{ e.preventDefault(); if($("#vp-cc").value.trim().length<4) return vpErr("Explica el gasto (mínimo 4 letras)."); if(!(vpNum($("#vp-ci").value)>0)) return vpErr("Pon el importe.");
    $("#vp-ok").disabled=true; try{ const r=await vpPost("coste/"+f.id,{concepto:$("#vp-cc").value,importe:$("#vp-ci").value,fecha:$("#vp-cf").value}); vpPon(r.ficha); d.close(); toast(vpAdmin()?"Coste anotado":"Enviado al gerente para su aprobación"); vpPintar(); }catch(err){ vpErr(err.message); $("#vp-ok").disabled=false; } };
}
function vpNotaDlg(){
  const f=vpFicha(); let fotos=[];
  const d=vpDlg(`<form id="f-vp" novalidate><h2>Nota o fotos de avance</h2>
    <div class="field"><label for="vp-t">Qué ha pasado</label><textarea class="in" id="vp-t" rows="3" maxlength="1500" placeholder="Ej.: paragolpes cambiado, falta pintar"></textarea></div>
    <label class="chipb" style="display:inline-flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" id="vp-tec"> Es una nota técnica</label>
    <div class="field" style="margin-top:8px"><label for="vp-fo">Fotos (opcional)</label><input class="in" id="vp-fo" type="file" accept="image/*" multiple></div><div class="vp-fotos" id="vp-prev"></div>
    <div class="msg bad" id="vp-err" hidden></div><div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-vpcancel>Cancelar</button><button type="submit" class="btn b-acc" id="vp-ok">Guardar</button></div></form>`);
  $("#vp-fo").onchange=async ev=>{ const files=[...ev.target.files].slice(0,8-fotos.length); $("#vp-ok").disabled=true; $("#vp-ok").textContent="Subiendo fotos…";
    for(const fl of files){ try{ const b=await shrink(fl); const r=await api("/api/fotos",{method:"POST",headers:{"content-type":b.type},body:b}); fotos.push(r.key); }catch(err){ vpErr(err.message); } }
    $("#vp-prev").innerHTML=fotos.map(k=>`<img src="${esc(FOTO(k))}" alt="" style="width:64px;height:48px;object-fit:cover;border-radius:6px">`).join(""); $("#vp-ok").disabled=false; $("#vp-ok").textContent="Guardar"; ev.target.value=""; };
  $("#f-vp").onsubmit=async e=>{ e.preventDefault(); if(!$("#vp-t").value.trim()&&!fotos.length) return vpErr("Escribe algo o añade una foto.");
    $("#vp-ok").disabled=true; try{ const r=await vpPost("nota/"+f.id,{txt:$("#vp-t").value,tipo:$("#vp-tec").checked?"tecnica":"nota",fotos}); vpPon(r.ficha); d.close(); toast("Guardado"); vpPintar(); }catch(err){ vpErr(err.message); $("#vp-ok").disabled=false; } };
}
function vpMotivoDlg(titulo,ayuda,obligatorio,cb){
  const d=vpDlg(`<form id="f-vp" novalidate><h2>${esc(titulo)}</h2><p class="hint">${esc(ayuda)}</p><div class="field"><label for="vp-mo">Motivo ${obligatorio?"*":"(opcional)"}</label><input class="in" id="vp-mo" maxlength="200"></div>
    <div class="msg bad" id="vp-err" hidden></div><div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-vpcancel>Cancelar</button><button type="submit" class="btn b-acc" id="vp-ok">Confirmar</button></div></form>`);
  $("#f-vp").onsubmit=async e=>{ e.preventDefault(); const m=$("#vp-mo").value.trim(); if(obligatorio&&m.length<4) return vpErr("Escribe el motivo."); $("#vp-ok").disabled=true; try{ await cb(m); d.close(); }catch(err){ vpErr(err.message); $("#vp-ok").disabled=false; } };
}
function vpCfgDlg(){
  const d=vpDlg(`<form id="f-vp" novalidate><h2>Coste por hora del taller</h2><p class="hint">Lo que os cuesta una hora de mano de obra (sueldo + seguros, sin margen). Se aplica a las horas que se anoten desde ahora; las ya anotadas conservan su valor.</p>
    <div class="field"><label for="vp-ch">€ por hora *</label><input class="in num" id="vp-ch" inputmode="decimal" value="${VP.cfg?(VP.cfg.costeHora/100).toFixed(2).replace(".",","):""}" placeholder="Ej.: 18,50"></div>
    <div class="msg bad" id="vp-err" hidden></div><div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-vpcancel>Cancelar</button><button type="submit" class="btn b-acc" id="vp-ok">Guardar</button></div></form>`);
  $("#f-vp").onsubmit=async e=>{ e.preventDefault(); if(!(vpNum($("#vp-ch").value)>=0)) return vpErr("Pon un importe válido."); try{ const r=await vpPost("config",{costeHora:$("#vp-ch").value}); VP.cfg=r.cfg; d.close(); toast("Coste por hora guardado"); vpPintar(); }catch(err){ vpErr(err.message); } };
}
async function vpLibro(){
  try{ const r=await api("/api/vehiculos/libro");
    vpDlg(`<div><h2>Registro de Coches propios</h2><p class="hint">${r.integro?`<span class="chip ok">Íntegro</span> ${r.total} anotaciones encadenadas: nadie ha cambiado nada por fuera.`:`<span class="chip rojo">¡Cadena rota!</span> Se ha tocado el registro por fuera del panel.`}</p>
      <div class="tabla-wrap" style="max-height:52vh;overflow:auto"><table class="tabla"><tbody>${r.entradas.slice(0,150).map(e=>`<tr><td>${vpFecha(e.t)}</td><td>${esc(e.nombre)}</td><td>${esc(e.accion)}</td><td><small>${esc(e.datos&&e.datos.ref||"")}</small></td></tr>`).join("")}</tbody></table></div>
      <div class="t-dlg-acts"><button type="button" class="btn b-acc" data-vpcancel>Cerrar</button></div></div>`);
  }catch(err){ toast(err.message); }
}

/* ---------- eventos ---------- */
document.addEventListener("click",e=>{
  const t=e.target; if(!t.closest) return; const q=s=>t.closest(s);
  let x;
  if(q("[data-tvista]")&&q("[data-tvista]").dataset.tvista==="propios"){ VP_ID=""; vpPintar(); return; } // Taller ya ha cambiado la vista; aquí se vuelve a la lista
  if((x=q("[data-vpfiltro]"))){ VP_FILTRO=x.dataset.vpfiltro; vpPintar(); return; }
  if((x=q("[data-vpabrir]"))){ VP_ID=x.dataset.vpabrir; vpPintar(); window.scrollTo(0,0); return; }
  if(q("[data-vpvolver]")){ VP_ID=""; vpCargar(true); vpPintar(); return; }
  if(q("[data-vpnuevo]")){ vpForm(null); return; }
  if((x=q("[data-vpeditar]"))){ vpForm(vpFicha()); return; }
  if((x=q("[data-vpfase]"))){ vpFaseDlg(x.dataset.vpfase); return; }
  if(q("[data-vphoras]")){ vpHorasDlg(); return; }
  if(q("[data-vppieza]")){ vpPiezaDlg(); return; }
  if(q("[data-vpcoste]")){ vpCosteDlg(); return; }
  if(q("[data-vpnota]")){ vpNotaDlg(); return; }
  if(q("[data-vpcfg]")){ vpCfgDlg(); return; }
  if(q("[data-vplibro]")){ vpLibro(); return; }
  if((x=q("[data-vpdecidir]"))){ const [dec,cid]=x.dataset.vpdecidir.split("|"), f=vpFicha();
    if(dec==="aprobar"){ vpPost(`decidir/${f.id}/${cid}`,{decision:"aprobar"}).then(r=>{ vpPon(r.ficha); toast("Coste aprobado"); vpPintar(); }).catch(err=>toast(err.message)); }
    else vpMotivoDlg("Rechazar el coste","Queda registrado con tu motivo y no cuenta en el beneficio.",true,async m=>{ const r=await vpPost(`decidir/${f.id}/${cid}`,{decision:"rechazar",motivo:m}); vpPon(r.ficha); toast("Coste rechazado"); vpPintar(); });
    return; }
  if((x=q("[data-vpanular]"))){ const [tipo,xid]=x.dataset.vpanular.split("|"), f=vpFicha();
    vpMotivoDlg(tipo==="horas"?"Anular estas horas":"Anular este coste","No se borra: queda tachado y en el registro con tu motivo.",true,async m=>{ if(m.length<8) throw new Error("Explica el motivo (mínimo 8 letras)."); const r=await vpPost(`anular/${f.id}/${tipo}/${xid}`,{motivo:m}); vpPon(r.ficha); toast("Anulado"); vpPintar(); });
    return; }
});
// Refresco suave: si otra persona cambia algo, la lista se pone al día sin molestar
setInterval(()=>{ if(TVISTA==="propios"&&!document.hidden&&!$("#dlg-vp[open]")) vpCargar(true); },45000);
