/* =====================================================================
   COSTE DE PERSONAL EN TIEMPO REAL (tools/costes) — dentro de la pestaña «Jornada» (solo gerente)
   · Tarifa (€/hora) de cada trabajador, con fecha de inicio: los días anteriores conservan la tarifa de entonces.
   · Estadística teórica = horas trabajadas (sin pausas) × tarifa. NO sale nada de la Caja: eso lo haces tú a mano.
   · Se actualiza cada segundo mientras alguien tiene la jornada abierta; el mes se suma día a día.
   Se copia dentro de admin.html con python3 tools/costes/inyectar.py
   ===================================================================== */
let CO=null, CO_REF=null, CO_T=Date.now();
const coE=c=>eur((Number(c)||0)/100);
const coNum=v=>{ const n=Number(String(v??"").replace(/\s|€/g,"").replace(",",".")); return Number.isFinite(n)?n:NaN; };
const coTxtTarifa=c=>c?`${coE(c)}/h`:"—";
async function coCargar(){ try{ CO=await api("/api/jornada/costes"); }catch(_){ } }
// minutos de hoy contando en vivo desde la última respuesta del servidor
function coMin(p){ if(J_PL!==CO_REF){ CO_REF=J_PL; CO_T=Date.now(); } const base=(p.hoy&&p.hoy.trabajoMin)||0; return p.estado==="trabajando"?base+(Date.now()-CO_T)/6e4:base; }
function coFila(p){ const min=coMin(p), hoy=p.costeHoyCent+Math.round(((min-((p.hoy&&p.hoy.trabajoMin)||0))*p.tarifaCent)/60), mes=p.costeMesCent+(hoy-p.costeHoyCent); return {min,hoy,mes}; }
function coSeccion(){
  const ps=(J_PL&&J_PL.personas)||[]; if(!J_PL||J_PL.error) return "";
  const sin=ps.filter(p=>!p.tarifaCent);
  return `<section class="card co-card" id="co-card"><div class="au-gh"><div><h3>Coste de personal en directo</h3><p class="hint" style="margin:2px 0 0">Horas trabajadas × tarifa de cada persona. Es una estadística: <b>no sale dinero de la Caja</b>.</p></div>
    <button type="button" class="btn b-ghost b-sm" data-cotarifas>Tarifas por hora</button></div>
    <div class="co-kpis"><div><small>Hoy</small><b class="num" data-cok="hoy">—</b></div><div><small>Este mes</small><b class="num" data-cok="mes">—</b></div><div><small>Horas hoy</small><b class="num" data-cok="horas">—</b></div><div><small>Ahora mismo</small><b class="num" data-cok="ahora">—</b></div></div>
    ${sin.length?`<p class="msg co-aviso">Falta la tarifa de ${sin.map(p=>`<b>${esc(p.nombre)}</b>`).join(", ")}: su coste sale a 0 € hasta que la pongas. <button type="button" class="btn b-acc b-sm" data-cotarifas>Ponerla</button></p>`:""}
    <div class="tabla-wrap"><table class="tabla co-tab"><thead><tr><th>Persona</th><th>Estado</th><th class="n">Horas hoy</th><th class="n">Tarifa</th><th class="n">Coste hoy</th><th class="n">Coste mes</th></tr></thead><tbody>
    ${ps.map(p=>`<tr data-couid="${esc(p.uid)}"><td><b>${esc(p.nombre)}</b></td><td><span class="co-est ${esc(p.estado)}"><i></i>${p.estado==="trabajando"?"Trabajando":p.estado==="pausa"?"En pausa":"Fuera"}</span></td><td class="n num" data-cov="h">—</td><td class="n num">${coTxtTarifa(p.tarifaCent)}</td><td class="n num"><b data-cov="hoy">—</b></td><td class="n num" data-cov="mes">—</td></tr>`).join("")||'<tr><td colspan="6" class="hint">Aún no hay trabajadores dados de alta.</td></tr>'}</tbody></table></div>
    <p class="hint" style="margin:8px 0 0">Las horas extra cuentan a la misma tarifa. Las pausas no cuentan. Se actualiza solo mientras alguien tiene la jornada abierta.</p></section>`;
}
function coValores(){
  const c=$("#co-card"); if(!c||!J_PL||!J_PL.personas) return; let h=0,hm=0,m=0,ah=0,ahN=0;
  for(const p of J_PL.personas){ const f=coFila(p), tr=c.querySelector(`[data-couid="${CSS.escape(p.uid)}"]`); if(!tr) continue;
    tr.querySelector('[data-cov="h"]').textContent=jH(f.min); tr.querySelector('[data-cov="hoy"]').textContent=coE(f.hoy); tr.querySelector('[data-cov="mes"]').textContent=coE(f.mes);
    h+=f.hoy; m+=f.mes; hm+=f.min; if(p.estado==="trabajando"){ ah+=p.tarifaCent; ahN++; } }
  const set=(k,v)=>{ const e=c.querySelector(`[data-cok="${k}"]`); if(e) e.textContent=v; };
  set("hoy",coE(h)); set("mes",coE(m)); set("horas",jH(hm)); set("ahora",ahN?`${coE(ah)}/h · ${ahN} ${ahN===1?"persona":"personas"}`:"Nadie trabajando");
}
setInterval(()=>{ if(!document.hidden) coValores(); },1000);
const _coJG=jgPintar;
jgPintar=function(){ _coJG(); const box=$("#jg"); if(!box) return; const old=box.querySelector("#co-card"); if(old) old.remove();
  const html=coSeccion(); const live=box.querySelector(".jg-live"); if(html&&live) live.insertAdjacentHTML("afterend",html); coValores();
  // coste teórico del mes que se está viendo en el registro
  const reg=box.querySelector(".jg-reg"), ps=J_REG&&J_REG.personas; if(reg&&ps&&ps.length&&ps[0].costeCent!==undefined){ const tot=ps.reduce((a,p)=>a+p.costeCent,0);
    reg.insertAdjacentHTML("beforeend",`<div class="co-mes"><b>Coste teórico de ${esc(nombreMes(J_MES))}: ${coE(tot)}</b>${ps.filter(p=>p.costeCent).map(p=>`<span class="chip">${esc(p.nombre)} · ${coE(p.costeCent)}</span>`).join("")}</div>`); } };
document.addEventListener("click",e=>{ if(e.target.closest&&e.target.closest("[data-cotarifas]")) coTarifas(); });
async function coTarifas(){
  let d=$("#dlg-co"); if(!d){ d=document.createElement("dialog"); d.id="dlg-co"; d.className="t-dlg fn-dlg au-dlg"; document.body.appendChild(d); }
  d.innerHTML='<div class="t-dlg-in"><p class="hint">Cargando…</p></div>'; if(!d.open) d.showModal(); await coCargar();
  if(!CO){ d.innerHTML='<div class="t-dlg-in"><p class="msg bad">No se han podido cargar las tarifas.</p><div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-cocerrar>Cerrar</button></div></div>'; d.querySelector("[data-cocerrar]").onclick=()=>d.close(); return; }
  d.innerHTML=`<form class="t-dlg-in co-form" novalidate><h2>Tarifas por hora</h2><p class="hint">Lo que te cuesta cada hora de cada persona (sueldo + Seguridad Social, sin margen). Solo sirve para tus estadísticas: no mueve la Caja ni Finanzas.</p>
    <div class="field"><label for="co-desde">Aplicar desde</label><input class="in" type="date" id="co-desde" value="${esc(CO.hoy)}" max="${esc(CO.hoy)}"><small class="hint" style="margin:0">Los días anteriores a esta fecha conservan la tarifa que tenían.</small></div>
    <div class="co-lista">${CO.personas.map(p=>`<div class="co-p"><div><b>${esc(p.nombre)}</b><small>${p.tarifaCent?`Ahora: ${coTxtTarifa(p.tarifaCent)}`:"Sin tarifa todavía"}${p.historial.length>1?` · antes: ${p.historial.slice(1,3).map(h=>`${esc(fecha(h.desde))} ${coE(h.cent)}`).join(", ")}`:""}</small></div>
      <label class="co-in"><input class="in num" inputmode="decimal" data-couid="${esc(p.uid)}" value="${p.tarifaCent?esc(String(p.tarifaCent/100).replace(".",",")):""}" placeholder="0,00" aria-label="Euros por hora de ${esc(p.nombre)}"><span>€/h</span></label></div>`).join("")||'<p class="hint">Aún no hay trabajadores dados de alta (Taller → Equipo y ajustes).</p>'}</div>
    <div class="msg bad" id="co-err" hidden></div><div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-cocerrar>Cancelar</button><button type="submit" class="btn b-acc" id="co-ok">Guardar tarifas</button></div></form>`;
  d.querySelector("[data-cocerrar]").onclick=()=>d.close();
  d.querySelector("form").onsubmit=async ev=>{ ev.preventDefault(); const er=$("#co-err"); er.hidden=true; const cambios=[];
    for(const i of d.querySelectorAll("[data-couid]")){ const p=CO.personas.find(x=>x.uid===i.dataset.couid), v=i.value.trim(); if(v===""&&!p.tarifaCent) continue; const n=coNum(v);
      if(!(n>=0&&n<=500)){ er.textContent=`Pon un importe válido para ${p.nombre} (0 a 500 €/h).`; er.hidden=false; return; } if(Math.round(n*100)!==p.tarifaCent||$("#co-desde").value!==CO.hoy) cambios.push({uid:p.uid,euroHora:v,desde:$("#co-desde").value}); }
    if(!cambios.length){ d.close(); return; } const ok=$("#co-ok"); ok.disabled=true;
    try{ for(const c of cambios) await api("/api/jornada/coste",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(c)}); toast("Tarifas guardadas"); d.close(); await jgPlantilla(); await jgRegistro(); }
    catch(e){ ok.disabled=false; er.textContent=e.message; er.hidden=false; } };
}
