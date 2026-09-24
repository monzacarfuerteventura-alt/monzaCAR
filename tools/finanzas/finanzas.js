/* =====================================================================
   FINANZAS · Ingresos y egresos globales (solo el gerente)
   Integrado con Taller (presupuestos aceptados), Coches (vendidos) y Caja.
   Fuente: tools/finanzas/finanzas.js → python3 tools/finanzas/inyectar.py
   ===================================================================== */
const FN_CAT=[
  ["fijos","Gastos fijos",[["alquiler","Alquiler del local","general"],["nominas","Nóminas de empleados","general"],["seguros","Seguros","general"],["asesoria","Asesoría / gestoría","general"],["autonomos","Cuotas de autónomos / Seguridad Social","general"]]],
  ["suministros","Suministros y servicios",[["luz","Luz","general"],["agua","Agua","general"],["telefono","Internet / teléfono","general"],["software","Licencias de software","general"],["publicidad","Publicidad / marketing","general"]]],
  ["operativos","Gastos operativos de taller y venta",[["recambios","Compra de recambios / piezas","taller"],["itv","ITV / tasas","venta"],["combustible","Combustible","general"],["herramientas","Herramientas","taller"],["reacondicionamiento","Reacondicionamiento de coches (retoma / clientes)","venta"],["mantenimiento","Mantenimiento del local","general"]]]];
const FN_CATTXT=Object.fromEntries(FN_CAT.flatMap(g=>g[2].map(([k,t])=>[k,t]))); FN_CATTXT["sin-clasificar"]="Sin clasificar (salidas de caja)"; FN_CATTXT["descuadres"]="Descuadres de caja (falta dinero)";
const FN_AREA={taller:"Taller",venta:"Venta de coches",general:"General (común)"};
const FN_PAGO=[["efectivo","Efectivo (caja)"],["tarjeta","Tarjeta"],["transferencia","Transferencia"],["domiciliacion","Domiciliación"]];
const FN_COBRO=[["efectivo","Efectivo"],["tarjeta","Tarjeta / TPV"],["transferencia","Transferencia"],["financiacion","Financiación"]];
const FN_MTXT={efectivo:"Efectivo",tarjeta:"Tarjeta / TPV",transferencia:"Transferencia",domiciliacion:"Domiciliación",financiacion:"Financiación"};
const FN_IMP=[["0","0 % (exento)"],["3","3 % IGIC reducido"],["7","7 % IGIC general"],["9.5","9,5 % IGIC incrementado"],["15","15 % IGIC especial"],["21","21 % IVA (factura peninsular)"]];
let FN=null, FN_PER="mes", FN_REF=hoyC(), FN_VISTA_E="todas", FN_CARS=null;

/* ---------- periodo ---------- */
const fnD=(d,n)=>new Date(Date.parse(d+"T12:00:00Z")+n*864e5).toISOString().slice(0,10);
function fnRango(){
  const r=FN_REF;
  if(FN_PER==="dia") return [r,r,fechaLarga(r)];
  if(FN_PER==="semana"){ const w=(new Date(r+"T12:00:00Z").getUTCDay()+6)%7, a=fnD(r,-w), b=fnD(a,6); return [a,b,`Semana del ${tF(a)} al ${tF(b)}`]; }
  if(FN_PER==="anio") return [r.slice(0,4)+"-01-01",r.slice(0,4)+"-12-31","Año "+r.slice(0,4)];
  return [r.slice(0,8)+"01",finMes(r.slice(0,7)),nombreMes(r.slice(0,7))];
}
function fnMover(n){ const r=FN_REF;
  if(FN_PER==="dia") FN_REF=fnD(r,n); else if(FN_PER==="semana") FN_REF=fnD(r,7*n);
  else if(FN_PER==="anio") FN_REF=(+r.slice(0,4)+n)+r.slice(4); else FN_REF=mesMas(r.slice(0,7),n)+"-01";
  if(FN_REF>hoyC()) FN_REF=hoyC(); fnCargar(); }

/* ---------- carga ---------- */
async function fnCargar(){
  const [a,b]=fnRango(), hasta=b>hoyC()?hoyC():b;
  if(!FN) $("#fn").innerHTML='<div class="empty">Calculando…</div>';
  try{ const [r,cars]=await Promise.all([api(`/api/finanzas/resumen?desde=${a}&hasta=${hasta}`),FN_CARS?null:api("/api/coches?todos=1")]); FN=r; if(cars) FN_CARS=cars; fnPintar(); }
  catch(err){ $("#fn").innerHTML=`<div class="empty">${esc(err.message)}</div>`; }
}
function fnAbrirTab(){ if(!ES_GER()||ES_EQ()) return abrirTab("ordenes"); show("s-fin"); history.replaceState(null,"","#finanzas"); FN_CARS=null; fnCargar(); }

/* ---------- pintar ---------- */
const fnPct=(a,b)=>b?Math.round(a/b*1000)/10:0;
const fnPctTxt=v=>String(v).replace(".",",")+" %";
function fnPintar(){
  const r=FN, k=r.kpis, [,,etq]=fnRango();
  const canalTot=Object.values(r.porCanal).reduce((a,b)=>a+b,0), pagoTot=Object.values(r.porPago).reduce((a,b)=>a+b,0);
  const avisos=[];
  if(k.ventasSinDatos) avisos.push(`<b>${k.ventasSinDatos}</b> venta${k.ventasSinDatos>1?"s":""} de coche sin completar (precio final o coste de compra)`);
  if(k.sinClasificar) avisos.push(`<b>${k.sinClasificar}</b> salida${k.sinClasificar>1?"s":""} de caja sin clasificar`);
  if(k.porCobrar) avisos.push(`<b>${cjE(k.porCobrar)}</b> pendientes de cobro`);
  $("#fn").innerHTML=`
  <div class="fn-bar">
    <div class="segv" role="group" aria-label="Periodo">${[["dia","Día"],["semana","Semana"],["mes","Mes"],["anio","Año"]].map(([p,t])=>`<button type="button" data-fnper="${p}" aria-pressed="${FN_PER===p}">${t}</button>`).join("")}</div>
    <div class="mesnav"><button type="button" data-fnmov="-1" aria-label="Anterior">‹</button><b>${esc(etq)}</b><button type="button" data-fnmov="1" aria-label="Siguiente" ${fnRango()[1]>=hoyC()?"disabled":""}>›</button></div>
    <div class="fn-acts"><button type="button" class="btn b-acc b-sm" data-fngasto>− Nuevo gasto</button><button type="button" class="btn b-ghost b-sm" data-fningreso>+ Otro ingreso</button><button type="button" class="btn b-ghost b-sm" data-fnexp="emitidas">Excel emitidas</button><button type="button" class="btn b-ghost b-sm" data-fnexp="recibidas">Excel recibidas</button><button type="button" class="btn b-brand b-sm" data-fnexp="pdf">PDF asesoría</button></div>
  </div>
  ${avisos.length?`<div class="fn-avisos">${avisos.map(a=>`<span>${a}</span>`).join("")} <a href="#fn-pend" class="g-link">Resolver</a></div>`:""}
  <div class="fn-kpis">
    <div class="fn-kpi hero ${k.flujo<0?"neg":""}"><small>Flujo de caja neto</small><b class="num">${cjD(k.flujo)}</b><span>Cobrado ${cjE(k.cobrado)} − pagado ${cjE(k.pagado)}${k.descuadres?` ${k.descuadres<0?"−":"+"} descuadres ${cjE(Math.abs(k.descuadres))}`:""}</span></div>
    <div class="fn-kpi"><small>Cobrado</small><b class="num">${cjE(k.cobrado)}</b><span>Facturado ${cjE(k.facturado)}</span></div>
    <div class="fn-kpi"><small>Pagado</small><b class="num">${cjE(k.pagado)}</b><span>${cjE(k.gastosBase)} sin impuestos</span></div>
    <div class="fn-kpi ${k.resultado<0?"neg":"pos"}"><small>Beneficio neto real</small><b class="num">${cjD(k.resultado)}</b><span>Taller + venta, sin impuestos</span></div>
    <div class="fn-kpi ${k.porCobrar?"aviso":""}"><small>Pendiente de cobro</small><b class="num">${cjE(k.porCobrar)}</b><span>De todas las fechas</span></div>
  </div>
  <div class="fn-grid">
    <section class="card"><h3>Cobrado por canal</h3><p class="hint">Todo lo que ha entrado en ${esc(etq.toLowerCase())}. El efectivo es el que suma a la caja física.</p>
      <div class="fn-canales">${FN_COBRO.map(([c,t])=>`<div class="fn-canal ${c}"><small>${t}</small><b class="num">${cjE(r.porCanal[c]||0)}</b><span>${canalTot?fnPctTxt(fnPct(r.porCanal[c]||0,canalTot)):"—"}</span></div>`).join("")}</div>
      <p class="hint" style="margin-top:10px">Pagado: efectivo ${cjE(r.porPago.efectivo||0)} · banco (tarjeta, transferencia, domiciliación) ${cjE(pagoTot-(r.porPago.efectivo||0))}</p></section>
    <section class="card"><h3>Cuenta de efectivo</h3><p class="hint">Conciliada con los cierres ciegos de caja.</p>
      <div class="fn-efe"><b class="num">${cjE(r.efectivo.teorico)}</b><span>${r.efectivo.abierta?`Teórico ahora: caja abierta por ${esc(r.efectivo.nombre)}`:r.efectivo.desde?`Contado en el último cierre (${esc(r.efectivo.nombre)}, ${esc(fechaHora(r.efectivo.desde))})`:"La caja no se ha abierto todavía"}</span></div>
      <table class="tabla fn-mini"><tbody>
        <tr><td>Descuadres de caja en el periodo</td><td class="n num ${k.descuadres<0?"cj-rojo":""}">${cjD(k.descuadres)}</td></tr>
        ${r.internos.length?`<tr><td>Retiros del propietario</td><td class="n num">${cjE(r.internos.filter(x=>x.tipo==="propietario").reduce((a,x)=>a+x.importe,0))}</td></tr><tr><td>Llevado al banco</td><td class="n num">${cjE(r.internos.filter(x=>x.tipo==="banco").reduce((a,x)=>a+x.importe,0))}</td></tr>`:""}
      </tbody></table><p class="hint">Los retiros del propietario y los ingresos al banco no son gastos: solo cambian el dinero de sitio.</p>
      <button type="button" class="g-link" data-fncaja>Abrir Control de Caja →</button></section>
  </div>
  ${fnRentabilidad()}
  <div class="fn-grid">
    <section class="card"><h3>Entradas y salidas de dinero</h3>${fnEvolucion()}</section>
    <section class="card"><h3>¿A dónde se va el dinero?</h3><p class="hint">Reparto de lo pagado en ${esc(etq.toLowerCase())} (con impuestos).</p>${fnDestino()}</section>
  </div>
  ${fnPendientes()}
  ${fnEmitidas()}
  ${fnRecibidas()}
  ${fnCoches()}`;
}

function fnRentabilidad(){
  const t=FN.taller, v=FN.venta, col=(tit,sub,filas,neto)=>`<div class="fn-rent"><div class="fn-rent-h"><b>${tit}</b><small>${sub}</small></div><table class="tabla fn-mini"><tbody>${filas.map(([l,x,cls])=>`<tr class="${cls||""}"><td>${l}</td><td class="n num">${x}</td></tr>`).join("")}</tbody></table><div class="fn-neto ${neto<0?"neg":"pos"}"><span>Ganancia neta real</span><b class="num">${cjD(neto)}</b></div></div>`;
  return `<section class="card fn-rents"><h3>Rentabilidad: taller frente a venta de coches</h3><p class="hint">Importes sin impuestos. Los gastos comunes (alquiler, nóminas, luz…) se reparten según lo que factura cada parte. Lo invertido en coches que aún no se han vendido no cuenta como gasto hasta que se venden${FN.kpis.invertidoStock?` (ahora ${cjE(FN.kpis.invertidoStock)})`:""}.</p>
    <div class="fn-rent-g">${col("Taller","Presupuestos aceptados y cobros de taller",[["Ingresos",cjE(t.ingresos)],["− Gastos del taller (recambios, herramientas…)",cjE(t.gastosDirectos)],["= Margen directo",cjD(t.margen),"sub"],["− Parte de gastos comunes",cjE(t.generales)]],t.neto)}
    ${col("Venta de coches",`${v.coches} coche${v.coches===1?"":"s"} vendido${v.coches===1?"":"s"}`,[["Ventas",cjE(v.ingresos)],["− Compra y reacondicionamiento de esos coches",cjE(v.costeCoches)],["− Otros gastos de venta",cjE(v.gastosDirectos)],["= Margen directo",cjD(v.margen),"sub"],["− Parte de gastos comunes",cjE(v.generales)]],v.neto)}</div></section>`;
}
function fnEvolucion(){
  const [a,b]=fnRango(), fin=b>hoyC()?hoyC():b, porDia=Object.fromEntries(FN.serie.map(s=>[s.fecha,s]));
  let cubos=[];
  if(FN_PER==="dia") return `<div class="fn-dia"><div><small>Entró</small><b class="num fn-c-ing">${cjE(FN.kpis.cobrado)}</b></div><div><small>Salió</small><b class="num fn-c-egr">${cjE(FN.kpis.pagado)}</b></div></div>`;
  if(FN_PER==="anio"){ for(let m=1;m<=12;m++){ const mm=a.slice(0,4)+"-"+String(m).padStart(2,"0"); if(mm>fin.slice(0,7)) break; const xs=FN.serie.filter(s=>s.fecha.startsWith(mm)); cubos.push({etq:MESES[m-1].slice(0,3),larga:nombreMes(mm),ing:xs.reduce((x,s)=>x+s.cobrado,0),egr:xs.reduce((x,s)=>x+s.pagado,0)}); } }
  else for(let d=a;d<=fin;d=fnD(d,1)){ const s=porDia[d]||{cobrado:0,pagado:0}; cubos.push({etq:FN_PER==="semana"?["L","M","X","J","V","S","D"][(new Date(d+"T12:00:00Z").getUTCDay()+6)%7]:String(+d.slice(8)),larga:fechaLarga(d),ing:s.cobrado,egr:s.pagado}); }
  const max=Math.max(1,...cubos.flatMap(c=>[c.ing,c.egr])), cada=cubos.length>16?Math.ceil(cubos.length/10):1;
  if(!cubos.some(c=>c.ing||c.egr)) return '<p class="hint">Sin movimientos en este periodo.</p>';
  return `<div class="fn-ley"><span><i class="fn-c-ing"></i>Cobrado</span><span><i class="fn-c-egr"></i>Pagado</span></div>
   <div class="fn-evo" role="img" aria-label="Cobrado y pagado por ${FN_PER==="anio"?"mes":"día"}"><div class="fn-evo-y"><span>${cjE(max).replace(/,00 €$/," €")}</span><span>0</span></div><div class="fn-evo-b">${cubos.map(c=>`<div class="fn-evo-c" data-tip="${esc(`${c.larga} · cobrado ${cjE(c.ing)} · pagado ${cjE(c.egr)} · neto ${cjD(c.ing-c.egr)}`)}"><i class="fn-c-ing" style="height:${(c.ing/max*100).toFixed(1)}%"></i><i class="fn-c-egr" style="height:${(c.egr/max*100).toFixed(1)}%"></i></div>`).join("")}</div></div>
   <div class="fn-evo-x">${cubos.map((c,i)=>`<span>${i%cada===0||i===cubos.length-1?esc(c.etq):""}</span>`).join("")}</div>
   <details class="fn-tabla-d"><summary>Ver como tabla</summary><div class="tabla-wrap"><table class="tabla"><thead><tr><th>${FN_PER==="anio"?"Mes":"Día"}</th><th class="n">Cobrado</th><th class="n">Pagado</th><th class="n">Neto</th></tr></thead><tbody>${cubos.filter(c=>c.ing||c.egr).map(c=>`<tr><td>${esc(c.larga)}</td><td class="n num">${cjE(c.ing)}</td><td class="n num">${cjE(c.egr)}</td><td class="n num">${cjD(c.ing-c.egr)}</td></tr>`).join("")}</tbody></table></div></details>`;
}
function fnDestino(){
  const tot=Object.values(FN.porCategoria).reduce((a,b)=>a+b,0); if(!tot) return '<p class="hint">Sin gastos en este periodo.</p>';
  const filas=Object.entries(FN.porCategoria).sort((a,b)=>b[1]-a[1]);
  return `<div class="bh fn-dest">${filas.map(([c,v])=>`<div class="bh-r" data-tip="${esc(`${FN_CATTXT[c]||c}: ${cjE(v)} · ${fnPctTxt(fnPct(v,tot))} del total`)}"><span class="bh-l">${esc(FN_CATTXT[c]||c)}</span><span class="bh-t"><i style="width:${(v/filas[0][1]*100).toFixed(1)}%"></i></span><span class="bh-v num">${fnPctTxt(fnPct(v,tot))}<small>${cjE(v)}</small></span></div>`).join("")}</div>
    <p class="hint" style="margin-top:8px">Total pagado: <b>${cjE(tot)}</b></p>`;
}
function fnPendientes(){
  const p=FN.porCobrar, sc=FN.sinClasificar, sinVenta=FN.coches.filter(c=>c.estimado||c.sinCoste);
  if(!p.length&&!sc.length&&!sinVenta.length) return `<section class="card" id="fn-pend"><h3>Pendientes</h3><p class="hint">Nada pendiente: todo cobrado, todas las ventas completas y todas las salidas de caja clasificadas.</p></section>`;
  return `<section class="card" id="fn-pend"><h3>Pendientes</h3>
    ${sinVenta.length?`<h4 class="fn-h4">Ventas de coches por completar</h4>${sinVenta.map(c=>`<div class="fn-pend"><span><b>${esc(c.nombre)}</b><small>${esc(tF(c.fecha))} · ${c.estimado?"sin precio final (se usa el anunciado: "+cjE(c.precio)+")":""}${c.estimado&&c.sinCoste?" · ":""}${c.sinCoste?"falta el coste de compra":""}</small></span><button type="button" class="btn b-acc b-sm" data-fnventa="${esc(c.coche)}">Completar venta</button></div>`).join("")}`:""}
    ${p.length?`<h4 class="fn-h4">Por cobrar</h4>${p.map(x=>`<div class="fn-pend"><span><b>${esc(x.concepto)}</b><small>${esc(tF(x.fecha))}${x.num?" · "+esc(x.num):""}${x.cliente?" · "+esc(x.cliente):""}</small></span><b class="num">${cjE(x.pendiente)}${x.pendiente!==x.total?`<small>de ${cjE(x.total)}</small>`:""}</b>${x.tipo==="taller"||x.tipo==="venta"?`<button type="button" class="btn b-brand b-sm" data-fncobro="${x.tipo}" data-ref="${esc(x.ref)}" data-pend="${x.pendiente}" data-txt="${esc(x.concepto)}" ${x.tipo==="venta"&&x.estimado?"disabled title=\"Primero completa la venta\"":""}>Registrar cobro</button>`:""}</div>`).join("")}`:""}
    ${sc.length?`<h4 class="fn-h4">Salidas de caja sin clasificar</h4><p class="hint" style="margin:0 0 6px">El equipo las registró en la caja. Dile a qué categoría pertenecen para que cuenten bien.</p>${sc.map(g=>`<div class="fn-pend"><span><b>${esc(g.concepto)}</b><small>${esc(tF(g.fecha))} · ${esc(g.factura||"")} · registró ${esc(g.por||"")}</small></span><b class="num">${cjE(g.total)}</b><button type="button" class="btn b-ghost b-sm" data-fnclasif="${esc(g.cajaMov)}" data-txt="${esc(g.concepto)}" data-imp="${g.total}">Clasificar</button></div>`).join("")}`:""}
  </section>`;
}
const fnAdj=a=>a?`<a class="chip" href="${FOTO(a.key)}" target="_blank" rel="noopener">${a.tipo==="pdf"?"PDF":"Foto"}</a>`:'<span class="chip rojo">Sin adjunto</span>';
function fnEmitidas(){
  const l=FN.emitidas.filter(d=>FN_VISTA_E==="todas"||d.area===FN_VISTA_E);
  return `<section class="card"><div class="fn-th"><h3>Facturas emitidas · ingresos <span class="num">${FN.emitidas.length}</span></h3><div class="segv" role="group">${[["todas","Todas"],["taller","Taller"],["venta","Venta"],["general","Otros"]].map(([k,t])=>`<button type="button" data-fnve="${k}" aria-pressed="${FN_VISTA_E===k}">${t}</button>`).join("")}</div></div>
   ${l.length?`<div class="tabla-wrap"><table class="tabla fn-t"><thead><tr><th>Fecha</th><th>Concepto</th><th class="n">Base</th><th class="n">Impuesto</th><th class="n">Total</th><th>Cobro</th><th></th></tr></thead><tbody>${l.map(d=>{ const pend=d.total-d.cobrado, canales=[...new Set(d.cobros.map(c=>FN_MTXT[c.metodo]))].join(" + ");
     return `<tr><td class="num">${esc(tF(d.fecha))}<small>${esc(d.num||"")}</small></td><td><b>${esc(d.concepto)}</b><small>${esc(d.cliente||"")}${d.estimado?' · <span class="cj-ambar">precio estimado</span>':""}${d.sinPresupuesto?' · <span class="cj-ambar">cobrado sin presupuesto aceptado</span>':""}${d.sinFactura?" · cobro de caja":""}</small></td><td class="n num">${cjE(d.base)}</td><td class="n num">${cjE(d.impuesto)}<small>${fnPctTxt(d.impuestoPct)}</small></td><td class="n num"><b>${cjE(d.total)}</b></td><td>${pend<=0?`<span class="chip ok">Cobrado</span>`:d.cobrado?`<span class="chip">Parcial</span>`:`<span class="chip rojo">Pendiente</span>`}<small>${esc(canales)}</small></td><td class="n">${d.tipo==="manual"?`<button type="button" class="chipb" data-fnanular="ingreso" data-id="${esc(d.ref)}">Anular</button>`:""}${d.adjunto?fnAdj(d.adjunto):""}</td></tr>`; }).join("")}</tbody></table></div>`:'<p class="hint">Sin ingresos en este periodo.</p>'}</section>`;
}
function fnRecibidas(){
  const l=FN.recibidas;
  return `<section class="card"><div class="fn-th"><h3>Facturas recibidas · gastos <span class="num">${l.length}</span></h3><button type="button" class="btn b-acc b-sm" data-fngasto>− Nuevo gasto</button></div>
   ${l.length?`<div class="tabla-wrap"><table class="tabla fn-t"><thead><tr><th>Fecha</th><th>Proveedor · concepto</th><th>Categoría</th><th class="n">Base</th><th class="n">Impuesto</th><th class="n">Total</th><th>Pago</th><th></th></tr></thead><tbody>${l.map(g=>`<tr class="${g.sinClasificar?"fn-sc":""}"><td class="num">${esc(tF(g.fecha))}<small>${esc(g.factura||"")}</small></td><td><b>${esc(g.proveedor||"—")}</b><small>${esc(g.concepto)}${g.cocheNombre?" · "+esc(g.cocheNombre):""}</small></td><td>${esc(FN_CATTXT[g.categoria]||g.categoria)}<small>${esc(FN_AREA[g.area]||"")}</small></td><td class="n num">${cjE(g.base)}</td><td class="n num">${cjE(g.impuesto)}<small>${fnPctTxt(g.impuestoPct)}</small></td><td class="n num"><b>${cjE(g.total)}</b></td><td>${esc(FN_MTXT[g.metodo]||g.metodo)}${g.origen==="caja"?"<small>salida de caja</small>":g.cajaMov?"<small>salió de la caja</small>":""}</td><td class="n">${fnAdj(g.adjunto)}${g.origen==="gasto"?` <button type="button" class="chipb" data-fnanular="gasto" data-id="${esc(g.id)}">Anular</button>`:g.sinClasificar?` <button type="button" class="chipb" data-fnclasif="${esc(g.cajaMov)}" data-txt="${esc(g.concepto)}" data-imp="${g.total}">Clasificar</button>`:""}</td></tr>`).join("")}</tbody></table></div>`:'<p class="hint">Sin gastos en este periodo.</p>'}</section>`;
}
function fnCoches(){
  const v=FN.coches.filter(c=>{ const [a,b]=fnRango(); return c.fecha>=a&&c.fecha<=b; }), s=FN.stock;
  return `<section class="card"><h3>Coches: beneficio por unidad</h3>
   ${v.length?`<div class="tabla-wrap"><table class="tabla fn-t"><thead><tr><th>Vendido</th><th>Coche</th><th class="n">Venta</th><th class="n">Compra</th><th class="n">Reacond.</th><th class="n">Beneficio</th><th></th></tr></thead><tbody>${v.map(c=>`<tr><td class="num">${esc(tF(c.fecha))}</td><td><b>${esc(c.nombre)}</b>${c.estimado?'<small class="cj-ambar">precio estimado</small>':""}${c.sinCoste?'<small class="cj-ambar">falta coste de compra</small>':""}</td><td class="n num">${cjE(c.base)}</td><td class="n num">${cjE(c.compra)}</td><td class="n num">${cjE(c.reacondicionamiento)}</td><td class="n num"><b class="${c.beneficio<0?"cj-rojo":"cj-verde"}">${cjD(c.beneficio)}</b><small>${c.base?fnPctTxt(fnPct(c.beneficio,c.base)):""}</small></td><td class="n"><button type="button" class="chipb" data-fnventa="${esc(c.coche)}">Editar</button></td></tr>`).join("")}</tbody></table></div>`:'<p class="hint">Ningún coche vendido en este periodo.</p>'}
   <h4 class="fn-h4">En stock: lo invertido</h4>
   ${s.length?`<div class="tabla-wrap"><table class="tabla fn-t"><thead><tr><th>Coche</th><th class="n">Precio anunciado</th><th class="n">Compra</th><th class="n">Reacond.</th><th class="n">Margen si se vende al anunciado</th><th></th></tr></thead><tbody>${s.map(c=>{ const m=c.precio-c.compra-c.reacondicionamiento; return `<tr><td><b>${esc(c.nombre)}</b></td><td class="n num">${cjE(c.precio)}</td><td class="n num">${c.compra?cjE(c.compra):'<span class="cj-ambar">sin dato</span>'}</td><td class="n num">${cjE(c.reacondicionamiento)}</td><td class="n num">${c.compra?`<b class="${m<0?"cj-rojo":""}">${cjD(m)}</b>`:"—"}</td><td class="n"><button type="button" class="chipb" data-fncoste="${esc(c.coche)}" data-txt="${esc(c.nombre)}" data-v="${c.compra}">Coste de compra</button></td></tr>`; }).join("")}</tbody></table></div><p class="hint">La compra de coches para stock no es un gasto del negocio: se descuenta de su venta al calcular el beneficio.</p>`:'<p class="hint">No hay coches en stock.</p>'}</section>`;
}

/* ---------- diálogos ---------- */
function fnDlg(html){ let d=$("#dlg-fn"); if(!d){ d=document.createElement("dialog"); d.id="dlg-fn"; d.className="t-dlg fn-dlg"; document.body.appendChild(d); } d.innerHTML=html; d.showModal(); d.querySelector("[data-fncancel]").onclick=()=>d.close(); return d; }
const fnSeg=(id,ops,v)=>`<div class="t-seg" id="${id}">${ops.map(([k,t])=>`<button type="button" data-v="${k}" aria-pressed="${k===v}">${t}</button>`).join("")}</div>`;
const fnSegVal=id=>(document.querySelector(`#${id} [aria-pressed=true]`)||{}).dataset?.v||"";
function fnSegBind(id,cb){ const el=$("#"+id); el.onclick=e=>{ const b=e.target.closest("[data-v]"); if(!b) return; el.querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); cb&&cb(b.dataset.v); }; }
async function fnSubir(file){
  if(file.type==="application/pdf"||/\.pdf$/i.test(file.name)){ if(file.size>5*1024*1024) throw new Error("El PDF pesa más de 5 MB."); return (await api("/api/fotos",{method:"POST",headers:{"content-type":"application/pdf"},body:file})).key; }
  const b=await shrink(file); return (await api("/api/fotos",{method:"POST",headers:{"content-type":"image/jpeg"},body:b})).key;
}
function fnAdjuntoUI(id,obligatorio){ return `<div class="field"><label>Factura o recibo ${obligatorio?'<b class="t-req">*</b>':"(opcional)"}</label><div class="fn-adj" id="${id}"><label class="btn b-ghost b-sm"><input type="file" accept="image/*" capture="environment" hidden data-fnfile>📷 Foto</label><label class="btn b-ghost b-sm"><input type="file" accept="application/pdf,image/*" hidden data-fnfile>📄 PDF o archivo</label><span class="fn-adj-ok" hidden></span></div></div>`; }
function fnAdjuntoBind(id){ const box=$("#"+id); box.dataset.key=""; box.querySelectorAll("[data-fnfile]").forEach(i=>i.onchange=async()=>{ const f=i.files[0]; i.value=""; if(!f) return; const ok=box.querySelector(".fn-adj-ok"); ok.hidden=false; ok.textContent="Subiendo…";
  try{ const k=await fnSubir(f); box.dataset.key=k; ok.innerHTML=`✓ <a href="${FOTO(k)}" target="_blank" rel="noopener">${k.endsWith(".pdf")?"PDF adjunto":"Foto adjunta"}</a>`; }catch(err){ ok.textContent=err.message; } }); }
function fnTotalUI(){ const b=cjNum($("#fn-base").value), p=Number($("#fn-imp").value)||0; $("#fn-tot").textContent=b>0?`Impuesto ${cjE(Math.round(b*p))} · Total ${cjE(Math.round(b*100)+Math.round(b*p))}`:"Escribe la base"; }
function fnErr(m){ const e=$("#fn-err"); e.textContent=m; e.hidden=false; }

function fnNuevoGasto(){
  const cars=(FN_CARS||[]);
  const d=fnDlg(`<form id="f-fn" novalidate><h2>Nuevo gasto</h2><p class="hint">Cada gasto con su categoría, su factura y cómo se pagó. Si se paga en efectivo, sale de la caja al momento.</p>
    <div class="t-g2"><div class="field"><label for="fn-fecha">Fecha *</label><input class="in" type="date" id="fn-fecha" value="${hoyC()}" max="${hoyC()}"></div>
    <div class="field"><label for="fn-cat">Categoría *</label><select class="in" id="fn-cat"><option value="">— Elige —</option>${FN_CAT.map(([g,gt,l])=>`<optgroup label="${esc(gt)}">${l.map(([k,t])=>`<option value="${k}">${esc(t)}</option>`).join("")}</optgroup>`).join("")}</select></div></div>
    <div class="field"><label>¿De qué parte del negocio es?</label>${fnSeg("fn-area",Object.entries(FN_AREA),"general")}</div>
    <div class="field" id="fn-coche-f" hidden><label for="fn-coche">Coche (si el gasto es de un coche concreto)</label><select class="in" id="fn-coche"><option value="">— Ninguno —</option>${cars.map(c=>`<option value="${esc(c.id)}">${esc(c.marca+" "+c.modelo+" "+(c.version||""))} · ${esc(c.estado)}</option>`).join("")}</select></div>
    <div class="t-g2"><div class="field"><label for="fn-prov">Proveedor / acreedor *</label><input class="in" id="fn-prov" maxlength="120" placeholder="Ej.: Recambios Sur S.L."></div><div class="field"><label for="fn-fact">Nº de factura</label><input class="in" id="fn-fact" maxlength="40"></div></div>
    <div class="field"><label for="fn-con">Concepto detallado *</label><input class="in" id="fn-con" maxlength="300" placeholder="Ej.: 4 pastillas de freno Brembo para el Seat Ibiza 1111AAA"></div>
    <div class="t-g2"><div class="field"><label for="fn-base">Base imponible (€) *</label><input class="in num" id="fn-base" inputmode="decimal" placeholder="0,00"></div><div class="field"><label for="fn-imp">Impuesto</label><select class="in" id="fn-imp">${FN_IMP.map(([v,t])=>`<option value="${v}" ${v==="7"?"selected":""}>${t}</option>`).join("")}</select></div></div>
    <p class="fn-tot num" id="fn-tot">Escribe la base</p>
    <div class="field"><label>¿Cómo se pagó? *</label>${fnSeg("fn-met",FN_PAGO,"")}<small class="hint" id="fn-met-h"></small></div>
    ${fnAdjuntoUI("fn-adj",true)}
    <div class="msg bad" id="fn-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-fncancel>Cancelar</button><button type="submit" class="btn b-acc" id="fn-ok">Guardar gasto</button></div></form>`);
  const ajustarArea=()=>{ const k=$("#fn-cat").value, a=FN_CAT.flatMap(g=>g[2]).find(x=>x[0]===k); if(a) $("#fn-area").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===a[2]))); $("#fn-coche-f").hidden=!["reacondicionamiento","itv","recambios","combustible"].includes(k)&&fnSegVal("fn-area")!=="venta"; };
  $("#fn-cat").onchange=ajustarArea; fnSegBind("fn-area",()=>ajustarArea());
  fnSegBind("fn-met",v=>{ $("#fn-met-h").textContent=v==="efectivo"?"Sale de la caja abierta de hoy y se resta de su teórico. La fecha tiene que ser hoy.":""; if(v==="efectivo") $("#fn-fecha").value=hoyC(); });
  $("#fn-base").oninput=fnTotalUI; $("#fn-imp").onchange=fnTotalUI; fnAdjuntoBind("fn-adj");
  $("#f-fn").onsubmit=async e=>{ e.preventDefault(); $("#fn-err").hidden=true;
    const base=cjNum($("#fn-base").value), met=fnSegVal("fn-met"), adj=$("#fn-adj").dataset.key;
    if(!$("#fn-cat").value) return fnErr("Elige la categoría.");
    if($("#fn-prov").value.trim().length<2) return fnErr("Escribe el proveedor.");
    if($("#fn-con").value.trim().length<5) return fnErr("Escribe el concepto con detalle.");
    if(!(base>0)) return fnErr("Escribe la base imponible.");
    if(!met) return fnErr("Elige cómo se pagó.");
    if(!adj) return fnErr("Adjunta la foto o el PDF de la factura.");
    $("#fn-ok").disabled=true;
    try{ await api("/api/finanzas/gasto",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({fecha:$("#fn-fecha").value,categoria:$("#fn-cat").value,area:fnSegVal("fn-area"),coche:$("#fn-coche").value,proveedor:$("#fn-prov").value,factura:$("#fn-fact").value,concepto:$("#fn-con").value,base:String(base),impuestoPct:$("#fn-imp").value,metodo:met,adjunto:adj})});
      d.close(); toast(met==="efectivo"?"Gasto guardado y restado de la caja":"Gasto guardado"); fnCargar(); }catch(err){ fnErr(err.message); }
    $("#fn-ok").disabled=false; };
}
function fnNuevoIngreso(){
  const d=fnDlg(`<form id="f-fn" novalidate><h2>Otro ingreso</h2><p class="hint">Para ingresos que no vienen de un presupuesto de taller ni de la venta de un coche (esos entran solos).</p>
    <div class="t-g2"><div class="field"><label for="fn-fecha">Fecha *</label><input class="in" type="date" id="fn-fecha" value="${hoyC()}" max="${hoyC()}"></div><div class="field"><label for="fn-fact">Nº de factura</label><input class="in" id="fn-fact" maxlength="40"></div></div>
    <div class="t-g2"><div class="field"><label for="fn-cli">Cliente</label><input class="in" id="fn-cli" maxlength="120"></div><div class="field"><label>Parte del negocio</label>${fnSeg("fn-area",Object.entries(FN_AREA),"general")}</div></div>
    <div class="field"><label for="fn-con">Concepto *</label><input class="in" id="fn-con" maxlength="300"></div>
    <div class="t-g2"><div class="field"><label for="fn-base">Base imponible (€) *</label><input class="in num" id="fn-base" inputmode="decimal" placeholder="0,00"></div><div class="field"><label for="fn-imp">Impuesto</label><select class="in" id="fn-imp">${FN_IMP.map(([v,t])=>`<option value="${v}" ${v==="7"?"selected":""}>${t}</option>`).join("")}</select></div></div>
    <p class="fn-tot num" id="fn-tot">Escribe la base</p>
    <div class="field"><label>¿Cómo se cobró? *</label>${fnSeg("fn-met",FN_COBRO,"")}</div>
    ${fnAdjuntoUI("fn-adj",false)}
    <div class="msg bad" id="fn-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-fncancel>Cancelar</button><button type="submit" class="btn b-acc" id="fn-ok">Guardar ingreso</button></div></form>`);
  fnSegBind("fn-area"); fnSegBind("fn-met"); $("#fn-base").oninput=fnTotalUI; $("#fn-imp").onchange=fnTotalUI; fnAdjuntoBind("fn-adj");
  $("#f-fn").onsubmit=async e=>{ e.preventDefault(); $("#fn-err").hidden=true; const base=cjNum($("#fn-base").value), met=fnSegVal("fn-met");
    if($("#fn-con").value.trim().length<3) return fnErr("Escribe el concepto."); if(!(base>0)) return fnErr("Escribe la base imponible."); if(!met) return fnErr("Elige cómo se cobró.");
    $("#fn-ok").disabled=true;
    try{ await api("/api/finanzas/ingreso",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({fecha:$("#fn-fecha").value,factura:$("#fn-fact").value,cliente:$("#fn-cli").value,area:fnSegVal("fn-area"),concepto:$("#fn-con").value,base:String(base),impuestoPct:$("#fn-imp").value,metodo:met,adjunto:$("#fn-adj").dataset.key})});
      d.close(); toast("Ingreso guardado"); fnCargar(); }catch(err){ fnErr(err.message); }
    $("#fn-ok").disabled=false; };
}
function fnCobro(tipo,ref,pend,txt){
  const d=fnDlg(`<form id="f-fn" novalidate><h2>Registrar cobro</h2><p class="hint">${esc(txt)}</p>
    <div class="t-g2"><div class="field"><label for="fn-importe">Importe cobrado (€) *</label><input class="in num cj-imp" id="fn-importe" inputmode="decimal" value="${(pend/100).toFixed(2).replace(".",",")}"></div><div class="field"><label for="fn-fecha">Fecha</label><input class="in" type="date" id="fn-fecha" value="${hoyC()}" max="${hoyC()}"></div></div>
    <div class="field"><label>¿Cómo ha pagado? *</label>${fnSeg("fn-met",FN_COBRO,"")}<small class="hint" id="fn-met-h"></small></div>
    <div class="msg bad" id="fn-aviso" hidden></div><div class="msg bad" id="fn-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-fncancel>Cancelar</button><button type="submit" class="btn b-acc" id="fn-ok">Guardar cobro</button></div></form>`);
  const avisar=()=>{ const v=fnSegVal("fn-met"), imp=cjNum($("#fn-importe").value); $("#fn-met-h").textContent=v==="efectivo"?"Entra en la caja abierta de hoy (suma a su teórico).":v==="financiacion"?"La financiera paga al concesionario: cuenta como cobrado.":"";
    $("#fn-aviso").hidden=!(v==="efectivo"&&imp>=1000); $("#fn-aviso").textContent="Ojo: en España los pagos en efectivo de 1.000 € o más entre una empresa y un particular no están permitidos (Ley 11/2021). Confírmalo con tu gestoría."; };
  fnSegBind("fn-met",avisar); $("#fn-importe").oninput=avisar;
  $("#f-fn").onsubmit=async e=>{ e.preventDefault(); $("#fn-err").hidden=true; const imp=cjNum($("#fn-importe").value), met=fnSegVal("fn-met");
    if(!(imp>0)) return fnErr("Escribe el importe."); if(!met) return fnErr("Elige cómo ha pagado."); $("#fn-ok").disabled=true;
    try{ await api(`/api/finanzas/cobro/${tipo}/${encodeURIComponent(ref)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({importe:String(imp),metodo:met,fecha:$("#fn-fecha").value})});
      d.close(); toast("Cobro registrado"+(met==="efectivo"?" y sumado a la caja":"")); fnCargar(); }catch(err){ fnErr(err.message); }
    $("#fn-ok").disabled=false; };
}
async function fnVenta(id){
  if(!FN_CARS) try{ FN_CARS=await api("/api/coches?todos=1"); }catch(_){ FN_CARS=CARS||[]; }
  const c=(FN_CARS||[]).find(x=>x.id===id)||(CARS||[]).find(x=>x.id===id); if(!c) return toast("Coche no encontrado");
  const v=FN&&FN.coches.find(x=>x.coche===id);
  const d=fnDlg(`<form id="f-fn" novalidate><h2>Registrar la venta</h2><p class="hint"><b>${esc(c.marca+" "+c.modelo+" "+(c.version||""))}</b> · anunciado a ${cjE(Math.round(c.precio*100))}. Con estos datos se calcula el beneficio real del coche.</p>
    <div class="t-g2"><div class="field"><label for="fn-importe">Precio final de venta (€) *</label><input class="in num cj-imp" id="fn-importe" inputmode="decimal" value="${v&&!v.estimado?(v.precio/100).toFixed(2).replace(".",","):String(c.precio).replace(".",",")}"></div>
    <div class="field"><label for="fn-compra">Lo que costó comprarlo (€) *</label><input class="in num cj-imp" id="fn-compra" inputmode="decimal" value="${v&&v.compra?(v.compra/100).toFixed(2).replace(".",","):""}" placeholder="0,00"></div></div>
    <div class="t-g2"><div class="field"><label for="fn-fecha">Fecha de venta</label><input class="in" type="date" id="fn-fecha" value="${v?v.fecha:hoyC()}" max="${hoyC()}"></div><div class="field"><label for="fn-imp">Impuesto incluido en el precio</label><select class="in" id="fn-imp"><option value="0">Sin desglosar (REBU u otro: lo ve tu gestoría)</option><option value="7">7 % IGIC</option><option value="21">21 % IVA</option></select></div></div>
    <div class="t-g2"><div class="field"><label for="fn-cli">Comprador</label><input class="in" id="fn-cli" maxlength="120"></div><div class="field"><label for="fn-fact">Nº de factura o contrato</label><input class="in" id="fn-fact" maxlength="40"></div></div>
    ${!v||v.estimado?`<div class="field"><label>Forma de pago de lo cobrado ahora</label>${fnSeg("fn-met",[...FN_COBRO,["","Aún sin cobrar"]],"")}<small class="hint">El reacondicionamiento (gastos con este coche) se descuenta solo.</small></div><div class="msg bad" id="fn-aviso" hidden>Ojo: en España los pagos en efectivo de 1.000 € o más entre una empresa y un particular no están permitidos (Ley 11/2021). Confírmalo con tu gestoría.</div>`:""}
    <div class="msg bad" id="fn-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-fncancel>Más tarde</button><button type="submit" class="btn b-acc" id="fn-ok">Guardar la venta</button></div></form>`);
  if($("#fn-met")) fnSegBind("fn-met",x=>{ $("#fn-aviso").hidden=!(x==="efectivo"&&cjNum($("#fn-importe").value)>=1000); });
  $("#f-fn").onsubmit=async e=>{ e.preventDefault(); $("#fn-err").hidden=true; const imp=cjNum($("#fn-importe").value), compra=cjNum($("#fn-compra").value||"0");
    if(!(imp>0)) return fnErr("Escribe el precio final."); if(!(compra>=0)) return fnErr("Escribe el coste de compra (0 si no lo sabes aún).");
    $("#fn-ok").disabled=true;
    try{ await api("/api/finanzas/venta/"+encodeURIComponent(id),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({importe:String(imp),costeCompra:String(compra),fecha:$("#fn-fecha").value,igicPct:$("#fn-imp").value,comprador:$("#fn-cli").value,factura:$("#fn-fact").value})});
      const met=$("#fn-met")?fnSegVal("fn-met"):""; let aviso="";
      if(met){ try{ await api(`/api/finanzas/cobro/venta/${encodeURIComponent(id)}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({importe:String(imp),metodo:met,fecha:$("#fn-fecha").value})}); }catch(err){ aviso=" · el cobro no se pudo guardar: "+err.message; } }
      d.close(); toast("Venta registrada"+aviso); if(!$("#s-fin").hidden) fnCargar(); }catch(err){ fnErr(err.message); }
    $("#fn-ok").disabled=false; };
}
function fnClasificar(mov,txt,imp){
  const d=fnDlg(`<form id="f-fn" novalidate><h2>Clasificar salida de caja</h2><p class="hint">${esc(txt)} · ${cjE(+imp)}</p>
    <div class="field"><label for="fn-cat">Categoría *</label><select class="in" id="fn-cat"><option value="">— Elige —</option>${FN_CAT.map(([g,gt,l])=>`<optgroup label="${esc(gt)}">${l.map(([k,t])=>`<option value="${k}">${esc(t)}</option>`).join("")}</optgroup>`).join("")}</select></div>
    <div class="field"><label>Parte del negocio</label>${fnSeg("fn-area",Object.entries(FN_AREA),"general")}</div>
    <div class="t-g2"><div class="field"><label for="fn-prov">Proveedor</label><input class="in" id="fn-prov" maxlength="120"></div><div class="field"><label for="fn-imp">Impuesto incluido</label><select class="in" id="fn-imp">${FN_IMP.map(([v,t])=>`<option value="${v}" ${v==="7"?"selected":""}>${t}</option>`).join("")}</select></div></div>
    <div class="msg bad" id="fn-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-fncancel>Cancelar</button><button type="submit" class="btn b-acc" id="fn-ok">Guardar</button></div></form>`);
  fnSegBind("fn-area"); $("#fn-cat").onchange=()=>{ const a=FN_CAT.flatMap(g=>g[2]).find(x=>x[0]===$("#fn-cat").value); if(a) $("#fn-area").querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===a[2]))); };
  $("#f-fn").onsubmit=async e=>{ e.preventDefault(); if(!$("#fn-cat").value) return fnErr("Elige la categoría."); $("#fn-ok").disabled=true;
    try{ await api("/api/finanzas/clasificar/"+mov,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({categoria:$("#fn-cat").value,area:fnSegVal("fn-area"),proveedor:$("#fn-prov").value,impuestoPct:$("#fn-imp").value})}); d.close(); toast("Clasificada"); fnCargar(); }catch(err){ fnErr(err.message); }
    $("#fn-ok").disabled=false; };
}
function fnCoste(id,txt,v){
  const d=fnDlg(`<form id="f-fn" novalidate><h2>Coste de compra</h2><p class="hint">${esc(txt)}. Solo lo ves tú: no sale en la web.</p>
    <div class="field"><label for="fn-compra">Lo que costó comprarlo (€)</label><input class="in num cj-imp" id="fn-compra" inputmode="decimal" value="${+v?(v/100).toFixed(2).replace(".",","):""}"></div>
    <div class="msg bad" id="fn-err" hidden></div><div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-fncancel>Cancelar</button><button type="submit" class="btn b-acc" id="fn-ok">Guardar</button></div></form>`);
  $("#f-fn").onsubmit=async e=>{ e.preventDefault(); const c=cjNum($("#fn-compra").value); if(!(c>=0)) return fnErr("Escribe el coste.");
    try{ await api("/api/finanzas/coste/"+encodeURIComponent(id),{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({compra:String(c)})}); d.close(); toast("Coste guardado"); fnCargar(); }catch(err){ fnErr(err.message); } };
}

/* ---------- exportar para la asesoría ---------- */
function fnCsv(nombre,filas){
  const csv="﻿"+filas.map(r=>r.map(x=>{ let v=String(x??""); if(/^[=+\-@\t\r]/.test(v)&&!/^-?\d/.test(v)) v="'"+v; return `"${v.replace(/"/g,'""')}"`; }).join(";")).join("\r\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})); a.download=nombre; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
}
const fnN=c=>(c/100).toFixed(2).replace(".",",");
function fnExportar(que){
  const [a,b]=fnRango(), per=`${a}_${b>hoyC()?hoyC():b}`;
  if(que==="emitidas") return fnCsv(`volcano-cars-facturas-emitidas-${per}.csv`,[["Fecha","Nº factura / orden","Cliente","Concepto","Parte","Base imponible","% impuesto","Impuesto","Total","Cobrado","Pendiente","Canal de cobro"],...FN.emitidas.map(d=>[d.fecha,d.num,d.cliente,d.concepto,FN_AREA[d.area]||d.area,fnN(d.base),String(d.impuestoPct).replace(".",","),fnN(d.impuesto),fnN(d.total),fnN(d.cobrado),fnN(d.total-d.cobrado),[...new Set(d.cobros.map(c=>FN_MTXT[c.metodo]))].join(" + ")])]);
  if(que==="recibidas") return fnCsv(`volcano-cars-facturas-recibidas-${per}.csv`,[["Fecha","Nº factura","Proveedor","Concepto","Grupo","Categoría","Parte","Base imponible","% impuesto","Impuesto","Total","Método de pago","Adjunto"],...FN.recibidas.map(g=>[g.fecha,g.factura,g.proveedor,g.concepto,(FN_CAT.find(x=>x[0]===g.grupo)||[])[1]||"",FN_CATTXT[g.categoria]||g.categoria,FN_AREA[g.area]||g.area,fnN(g.base),String(g.impuestoPct).replace(".",","),fnN(g.impuesto),fnN(g.total),FN_MTXT[g.metodo]||g.metodo,g.adjunto?location.origin+FOTO(g.adjunto.key):""])]);
  fnPdf();
}
function fnPdf(){
  const [,,etq]=fnRango(), r=FN, k=r.kpis; let el=$("#fn-print"); if(!el){ el=document.createElement("div"); el.id="fn-print"; document.body.appendChild(el); }
  const sumE=k2=>r.emitidas.reduce((a,d)=>a+d[k2],0), sumR=k2=>r.recibidas.reduce((a,g)=>a+g[k2],0);
  el.innerHTML=`<article class="fp"><header class="tp-h"><img src="/marca/logo-oscuro.svg" alt="Volcano Cars" height="26"><div><b>Informe para la asesoría</b><small>${esc(etq)} · generado ${esc(fechaHora(new Date().toISOString()))}</small></div><span class="tp-badge">FINANZAS</span></header>
    <table class="tp-kv"><tbody><tr><th>Cobrado</th><td>${cjE(k.cobrado)}</td><th>Pagado</th><td>${cjE(k.pagado)}</td><th>Flujo neto</th><td><b>${cjD(k.flujo)}</b></td></tr>
    <tr><th>Facturado (base)</th><td>${cjE(k.facturadoBase)}</td><th>Gastos (base)</th><td>${cjE(k.gastosBase)}</td><th>Beneficio neto</th><td><b>${cjD(k.resultado)}</b></td></tr>
    <tr><th>Impuesto repercutido</th><td>${cjE(sumE("impuesto"))}</td><th>Impuesto soportado</th><td>${cjE(sumR("impuesto"))}</td><th>Pendiente de cobro</th><td>${cjE(k.porCobrar)}</td></tr></tbody></table>
    <h4>Facturas emitidas (${r.emitidas.length})</h4><table class="tp-t"><thead><tr><th>Fecha</th><th>Nº</th><th>Cliente · concepto</th><th>Base</th><th>%</th><th>Impuesto</th><th>Total</th><th>Cobro</th></tr></thead><tbody>${r.emitidas.map(d=>`<tr><td>${esc(tF(d.fecha))}</td><td>${esc(d.num||"")}</td><td>${esc(d.cliente?d.cliente+" · ":"")}${esc(d.concepto)}</td><td class="r">${fnN(d.base)}</td><td class="r">${String(d.impuestoPct).replace(".",",")}</td><td class="r">${fnN(d.impuesto)}</td><td class="r"><b>${fnN(d.total)}</b></td><td>${esc([...new Set(d.cobros.map(c=>FN_MTXT[c.metodo]))].join(" + ")||"Pendiente")}</td></tr>`).join("")}<tr class="tot"><td colspan="3">Total</td><td class="r">${fnN(sumE("base"))}</td><td></td><td class="r">${fnN(sumE("impuesto"))}</td><td class="r">${fnN(sumE("total"))}</td><td></td></tr></tbody></table>
    <h4>Facturas recibidas (${r.recibidas.length})</h4><table class="tp-t"><thead><tr><th>Fecha</th><th>Nº</th><th>Proveedor · concepto</th><th>Categoría</th><th>Base</th><th>%</th><th>Impuesto</th><th>Total</th><th>Pago</th></tr></thead><tbody>${r.recibidas.map(g=>`<tr><td>${esc(tF(g.fecha))}</td><td>${esc(g.factura||"")}</td><td>${esc(g.proveedor?g.proveedor+" · ":"")}${esc(g.concepto)}</td><td>${esc(FN_CATTXT[g.categoria]||g.categoria)}</td><td class="r">${fnN(g.base)}</td><td class="r">${String(g.impuestoPct).replace(".",",")}</td><td class="r">${fnN(g.impuesto)}</td><td class="r"><b>${fnN(g.total)}</b></td><td>${esc(FN_MTXT[g.metodo]||g.metodo)}</td></tr>`).join("")}<tr class="tot"><td colspan="4">Total</td><td class="r">${fnN(sumR("base"))}</td><td></td><td class="r">${fnN(sumR("impuesto"))}</td><td class="r">${fnN(sumR("total"))}</td><td></td></tr></tbody></table>
    <p class="tp-legal">Importes en euros. Las ventas de coches usados marcadas «sin desglosar» pueden estar en régimen especial (REBU): tu gestoría calcula su impuesto. Los adjuntos de cada gasto están en el panel (Finanzas) y en el Excel de facturas recibidas.</p>
    <footer class="tp-f">Volcano Cars · Finanzas · ${esc(etq)}</footer></article>`;
  document.body.classList.add("print-fin"); const fin=()=>{ document.body.classList.remove("print-fin"); removeEventListener("afterprint",fin); }; addEventListener("afterprint",fin);
  const img=el.querySelector("img"); (img.complete?Promise.resolve():new Promise(ok=>{ img.onload=img.onerror=ok; setTimeout(ok,2000); })).then(()=>setTimeout(()=>window.print(),60));
}

/* ---------- eventos ---------- */
$("#fn").addEventListener("click",async e=>{ const t=e.target, q=s=>t.closest(s);
  const pe=q("[data-fnper]"); if(pe){ FN_PER=pe.dataset.fnper; FN_REF=hoyC(); fnCargar(); return; }
  const mv=q("[data-fnmov]"); if(mv){ fnMover(+mv.dataset.fnmov); return; }
  if(q("[data-fngasto]")){ if(!FN_CARS) FN_CARS=await api("/api/coches?todos=1").catch(()=>[]); fnNuevoGasto(); return; }
  if(q("[data-fningreso]")){ fnNuevoIngreso(); return; }
  const ex=q("[data-fnexp]"); if(ex){ fnExportar(ex.dataset.fnexp); return; }
  const ve=q("[data-fnve]"); if(ve){ FN_VISTA_E=ve.dataset.fnve; fnPintar(); return; }
  const co=q("[data-fncobro]"); if(co){ fnCobro(co.dataset.fncobro,co.dataset.ref,+co.dataset.pend,co.dataset.txt); return; }
  const vt=q("[data-fnventa]"); if(vt){ fnVenta(vt.dataset.fnventa); return; }
  const cl=q("[data-fnclasif]"); if(cl){ fnClasificar(cl.dataset.fnclasif,cl.dataset.txt,cl.dataset.imp); return; }
  const cs=q("[data-fncoste]"); if(cs){ fnCoste(cs.dataset.fncoste,cs.dataset.txt,cs.dataset.v); return; }
  if(q("[data-fncaja]")){ abrirTab("caja"); return; }
  const an=q("[data-fnanular]"); if(an){ const m=prompt("Motivo de la anulación (queda en el libro):"); if(!m||m.trim().length<5) return toast("Hace falta un motivo");
    try{ await api(`/api/finanzas/${an.dataset.fnanular}-anular/${an.dataset.id}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({motivo:m})}); toast("Anulado"); fnCargar(); }catch(err){ toast(err.message); } return; }
});
setInterval(()=>{ if(PW&&$("#s-fin")&&!$("#s-fin").hidden&&!document.hidden&&!document.querySelector("#dlg-fn[open]")) fnCargar(); },60000);
