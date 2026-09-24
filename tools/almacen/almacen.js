/* =====================================================================
   INVENTARIO · repuestos (stock en tiempo real) y herramientas (anti-pérdida)
   Integrado con FORM-03 (recambios y herramientas de cada orden) y con el
   cierre de caja (auditoría de herramientas no devueltas).
   Fuente: tools/almacen/almacen.js → python3 tools/almacen/inyectar.py
   ===================================================================== */
let AL=null, AL_VISTA="rep", AL_BUSQ="", AL_MOVS=null, AL_MOVF="todos", AL_MES=hoyC().slice(0,7), AL_PED={}, AL_ORDEN=null;
const AL_EST={disponible:["Disponible","ok"],uso:["En uso","uso"],mantenimiento:["Mantenimiento / avería","mant"],extraviada:["Extraviada","mal"]};
const AL_TIPO={inicial:"Stock inicial",entrada:"Entrada",salida:"Salida a orden",devolucion:"Devuelto al almacén",ajuste:"Ajuste (recuento)"};
const alN=v=>String(Math.round((+v||0)*100)/100).replace(".",",");
const alNum=v=>{ const n=Number(String(v??"").replace(/\s/g,"").replace(",",".")); return Number.isFinite(n)?n:NaN; };
const alPuedeCat=()=>!!AL&&AL.puedeCatalogo;

/* ---------- carga ---------- */
async function alCargar(quieto){
  if(!quieto&&!AL) $("#al").innerHTML='<div class="empty">Cargando el inventario…</div>';
  try{ AL=await api("/api/almacen/estado"); alBadge(); if(!$("#s-alm").hidden) alPintar(); }
  catch(err){ if(!quieto) $("#al").innerHTML=`<div class="empty">${esc(err.message)}</div>`; }
}
function alAbrirTab(){ show("s-alm"); history.replaceState(null,"","#inventario"); if(AL) alPintar(); alCargar(); }
function alBadge(){ const b=$("#n-alm"); if(!b||!AL) return; const n=AL.piezas.filter(p=>p.stock<=p.minimo).length+AL.herramientas.filter(h=>h.estado==="extraviada").length; b.hidden=!n; b.textContent=n; }

/* ---------- búsqueda y códigos (QR, código de barras, SKU, referencia) ---------- */
function alResolver(codigo){
  const c=String(codigo||"").trim(); if(!c||!AL) return null; const u=c.toUpperCase();
  const m=u.match(/^VC-([PH]):(.+)$/);
  if(m){ if(m[1]==="P"){ const p=AL.piezas.find(x=>x.sku===m[2]); return p?{tipo:"pieza",x:p}:null; } const h=AL.herramientas.find(x=>x.codigo===m[2]); return h?{tipo:"herr",x:h}:null; }
  const p=AL.piezas.find(x=>x.sku===u||x.ean===c||(x.ref&&x.ref.toUpperCase()===u)); if(p) return {tipo:"pieza",x:p};
  const h=AL.herramientas.find(x=>x.codigo===u||(x.serie&&x.serie.toUpperCase()===u)); if(h) return {tipo:"herr",x:h};
  return null;
}
const alCoincide=(x,q)=>{ q=q.trim().toLowerCase(); if(!q) return true; return [x.nombre,x.sku,x.ref,x.ean,x.codigo,x.serie,x.categoria,x.ubicacion,x.proveedor].some(v=>v&&String(v).toLowerCase().includes(q)); };

/* ---------- escáner con la cámara (lector nativo del navegador; si no hay, a mano o lector USB/Bluetooth) ---------- */
async function alEscanear(titulo,cb){
  let d=$("#dlg-scan"); if(!d){ d=document.createElement("dialog"); d.id="dlg-scan"; d.className="t-dlg al-scan"; document.body.appendChild(d); }
  const hay="BarcodeDetector" in window;
  d.innerHTML=`<form method="dialog" id="f-scan"><h2>${esc(titulo||"Escanear código")}</h2>
    ${hay?`<div class="al-video"><video playsinline muted></video><i></i></div><p class="hint" id="scan-msg">Apunta al código QR o de barras de la pieza o la herramienta.</p>`:`<p class="msg bad" style="font-weight:500">Este navegador no trae lector de códigos (pasa en iPhone y iPad). Escribe el código o usa un lector USB/Bluetooth: escribe solo en la casilla.</p>`}
    <div class="field"><label for="scan-in">…o escribe el código</label><input class="in" id="scan-in" autocomplete="off" autocapitalize="characters" placeholder="P-0001, H-001, código de barras o referencia"></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-scancerrar>Cerrar</button><button type="submit" class="btn b-acc">Buscar</button></div></form>`;
  let stream=null, vivo=true;
  const parar=()=>{ vivo=false; if(stream) stream.getTracks().forEach(t=>t.stop()); };
  const listo=v=>{ parar(); d.close(); cb(v); };
  d.querySelector("[data-scancerrar]").onclick=()=>{ parar(); d.close(); };
  d.addEventListener("close",parar,{once:true});
  $("#f-scan").onsubmit=e=>{ e.preventDefault(); const v=$("#scan-in").value.trim(); if(v) listo(v); };
  d.showModal(); setTimeout(()=>{ if(!hay) $("#scan-in").focus(); },40);
  if(!hay) return;
  try{
    const formatos=await BarcodeDetector.getSupportedFormats().catch(()=>["qr_code"]);
    const det=new BarcodeDetector({formats:formatos.filter(f=>["qr_code","ean_13","ean_8","code_128","code_39","upc_a","upc_e","itf","data_matrix"].includes(f))});
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:"environment"},width:{ideal:1280}},audio:false});
    const v=d.querySelector("video"); v.srcObject=stream; await v.play();
    const bucle=async()=>{ if(!vivo) return; try{ const r=await det.detect(v); if(r.length){ if(navigator.vibrate) navigator.vibrate(60); return listo(r[0].rawValue); } }catch(_){ } setTimeout(bucle,160); };
    bucle();
  }catch(err){ const m=$("#scan-msg"); if(m){ m.textContent="No se ha podido abrir la cámara ("+(err.name==="NotAllowedError"?"permiso denegado: actívalo en el candado de la barra de direcciones":err.message)+"). Escribe el código abajo."; m.classList.add("al-err"); } }
}
function alTrasEscanear(codigo){
  const r=alResolver(codigo); if(!r){ toast("No hay ninguna pieza ni herramienta con el código «"+codigo+"»"); AL_BUSQ=codigo; if(!$("#s-alm").hidden) alPintar(); return; }
  if(r.tipo==="pieza") alFichaRapida(r.x); else alHerrRapida(r.x);
}

/* ---------- pintar ---------- */
function alPintar(){
  if(!AL) return;
  const bajo=AL.piezas.filter(p=>p.stock<=p.minimo), extr=AL.herramientas.filter(h=>h.estado==="extraviada"), enUso=AL.herramientas.filter(h=>h.estado==="uso"), mant=AL.herramientas.filter(h=>h.estado==="mantenimiento");
  const vistas=[["rep","Repuestos"],["herr","Herramientas"],["ped","Pedido"+(bajo.length?` (${bajo.length})`:"")],...(AL.admin?[["mov","Movimientos"]]:[])];
  const k=AL.kpis;
  $("#al").innerHTML=`
  ${k?`<div class="al-kpis"><div class="al-kpi dest"><small>Valor del inventario (a coste)</small><b class="num">${cjE(k.valor)}</b><span>${k.referencias} referencias · a precio de venta ${cjE(k.valorVenta)}</span></div>
    <div class="al-kpi ${k.bajoMinimo?"mal":""}"><small>Bajo mínimo</small><b class="num">${k.bajoMinimo}</b><span>${k.agotadas} agotada${k.agotadas===1?"":"s"}</span></div>
    <div class="al-kpi"><small>Herramientas en uso</small><b class="num">${enUso.length}</b><span>${mant.length} en mantenimiento</span></div>
    <div class="al-kpi ${extr.length?"mal":""}"><small>Extraviadas</small><b class="num">${extr.length}</b><span>${extr.length?"Revisa y localízalas":"Ninguna"}</span></div></div>`:""}
  ${bajo.length||extr.length?`<div class="t-alertas">${bajo.length?`<button type="button" class="t-al ambar" data-alvista="ped"><i>!</i><span><b>${bajo.length} repuesto${bajo.length>1?"s":""} por debajo del mínimo</b> · ${esc(bajo.slice(0,4).map(p=>p.nombre).join(", "))}${bajo.length>4?"…":""} → preparar pedido</span></button>`:""}${extr.map(h=>`<button type="button" class="t-al" data-alherr="${esc(h.id)}"><i>⚠</i><span><b>Extraviada:</b> ${esc(h.nombre)} (${esc(h.codigo)})</span></button>`).join("")}</div>`:""}
  <div class="al-bar">
    <div class="segv" role="group" aria-label="Sección">${vistas.map(([v,t])=>`<button type="button" data-alvista="${v}" aria-pressed="${AL_VISTA===v}">${t}</button>`).join("")}</div>
    ${AL_VISTA==="rep"||AL_VISTA==="herr"?`<input class="in" id="al-busq" type="search" placeholder="${AL_VISTA==="rep"?"Buscar pieza, código, referencia, ubicación…":"Buscar herramienta, etiqueta, nº de serie…"}" value="${esc(AL_BUSQ)}" aria-label="Buscar">`:""}
    <div class="al-acts"><button type="button" class="btn b-brand b-sm" data-alscan>📷 Escanear</button>
      ${AL_VISTA==="rep"?`<button type="button" class="btn b-acc b-sm" data-alentrada>+ Entrada de material</button>${alPuedeCat()?'<button type="button" class="btn b-ghost b-sm" data-alpieza>Nueva pieza</button>':""}`:""}
      ${AL_VISTA==="herr"&&alPuedeCat()?'<button type="button" class="btn b-acc b-sm" data-alherrnueva>Nueva herramienta</button>':""}
      ${AL_VISTA==="rep"||AL_VISTA==="herr"?`<button type="button" class="btn b-ghost b-sm" data-aletiq="${AL_VISTA}">Etiquetas QR</button>`:""}</div>
  </div>
  <div id="al-body">${AL_VISTA==="herr"?alHerramientas():AL_VISTA==="ped"?alPedido():AL_VISTA==="mov"?alMovimientos():alRepuestos()}</div>`;
  const b=$("#al-busq"); if(b&&alPintar.foco){ b.focus(); const n=b.value.length; b.setSelectionRange(n,n); alPintar.foco=false; }
}
function alRepuestos(){
  const l=AL.piezas.filter(p=>alCoincide(p,AL_BUSQ));
  if(!AL.piezas.length) return `<div class="empty"><b style="color:var(--ink)">Todavía no hay repuestos.</b><br>${alPuedeCat()?"Pulsa «Nueva pieza» para dar de alta el primero (con su stock inicial).":"Pídele al gerente o a recepción que den de alta las piezas."}</div>`;
  if(!l.length) return '<div class="empty">Ninguna pieza coincide con la búsqueda.</div>';
  return `<div class="t-tabla-wrap"><table class="t-tabla al-t"><thead><tr><th>Código</th><th>Repuesto</th><th>Ubicación</th><th class="n">Stock</th><th class="n">Mínimo</th>${AL.admin?'<th class="n">Coste</th>':""}<th class="n">Venta</th><th></th></tr></thead><tbody>${l.map(p=>{ const cls=p.stock<=0?"agot":p.stock<=p.minimo?"bajo":"";
    return `<tr class="${cls}"><td data-l="Código"><b class="num">${esc(p.sku)}</b><small>${esc(p.ref||"")}</small></td><td data-l="Repuesto"><b>${esc(p.nombre)}</b><small>${esc(p.categoria)}${p.proveedor?" · "+esc(p.proveedor):""}</small></td><td data-l="Ubicación">${p.ubicacion?`<span class="al-ubi">${esc(p.ubicacion)}</span>`:'<small class="t-mut">—</small>'}</td>
      <td data-l="Stock" class="n"><b class="num al-stock">${alN(p.stock)}</b> <small>${esc(p.unidad)}</small></td><td data-l="Mínimo" class="n num">${alN(p.minimo)}</td>${AL.admin?`<td data-l="Coste" class="n num">${cjE(p.coste)}</td>`:""}<td data-l="Venta" class="n num">${cjE(p.pvp)}</td>
      <td class="t-acc"><button type="button" class="btn b-ghost b-sm" data-alentrada="${esc(p.id)}">+ Entrada</button>${alPuedeCat()?`<button type="button" class="btn b-ghost b-sm" data-alajuste="${esc(p.id)}">Recuento</button><button type="button" class="btn b-ghost b-sm" data-alpieza="${esc(p.id)}">Editar</button>`:""}</td></tr>`; }).join("")}</tbody></table></div>`;
}
function alHerramientas(){
  const l=AL.herramientas.filter(h=>alCoincide(h,AL_BUSQ));
  if(!AL.herramientas.length) return `<div class="empty"><b style="color:var(--ink)">Todavía no hay herramientas registradas.</b><br>${alPuedeCat()?"Da de alta primero las de más valor: diagnosis, maquinaria, gatos, llaves dinamométricas…":"Pídele al gerente que las registre."}</div>`;
  if(!l.length) return '<div class="empty">Ninguna herramienta coincide con la búsqueda.</div>';
  return `<div class="al-hgrid">${l.map(h=>{ const [et,cl]=AL_EST[h.estado], mia=h.uso&&ME&&h.uso.uid===ME.uid;
    return `<article class="al-h ${cl}"><div class="al-hfoto">${h.foto?`<img src="${FOTO(h.foto)}" alt="" loading="lazy">`:`<span>${esc(h.nombre.slice(0,1))}</span>`}</div>
      <div class="al-hd"><b>${esc(h.nombre)}</b><small><span class="num">${esc(h.codigo)}</span> · ${esc(h.categoria)}${h.serie?" · S/N "+esc(h.serie):""}${h.especial?" · especial":""}</small>
      <span class="al-est ${cl}">${et}</span>${h.uso?`<small class="al-quien">La tiene <b>${esc(h.uso.nombre)}</b>${h.uso.num?" · orden "+esc(h.uso.num):""} · desde ${esc(fechaHora(h.uso.desde))}${h.uso.nota?`<br>«${esc(h.uso.nota)}»`:""}</small>`:h.ubicacion?`<small>Sitio: ${esc(h.ubicacion)}</small>`:""}</div>
      <div class="al-hacts">${h.estado==="disponible"?`<button type="button" class="btn b-acc b-sm" data-alcoger="${esc(h.id)}">Coger</button>`:""}${h.estado==="uso"&&(mia||ES_GER())?`<button type="button" class="btn b-brand b-sm" data-aldevolver="${esc(h.id)}">Devolver</button>`:""}
        ${h.estado==="mantenimiento"?`<button type="button" class="btn b-ghost b-sm" data-alh="reparada" data-id="${esc(h.id)}">Ya está reparada</button>`:""}${h.estado==="extraviada"?`<button type="button" class="btn b-ghost b-sm" data-alh="encontrada" data-id="${esc(h.id)}">Encontrada</button>`:""}
        <details class="al-mas"><summary aria-label="Más acciones">⋯</summary><div>${h.estado!=="mantenimiento"&&h.estado!=="extraviada"?`<button type="button" class="chipb" data-alh="mantenimiento" data-id="${esc(h.id)}">Avería / mantenimiento</button>`:""}${h.estado!=="extraviada"?`<button type="button" class="chipb" data-alh="extraviada" data-id="${esc(h.id)}">No la encuentro</button>`:""}${alPuedeCat()?`<button type="button" class="chipb" data-alherrnueva="${esc(h.id)}">Editar</button>`:""}<button type="button" class="chipb" data-aletiq1="H:${esc(h.id)}">Etiqueta QR</button></div></details></div></article>`; }).join("")}</div>`;
}
function alSugerido(p){ const f=p.minimo>0?p.minimo*2-p.stock:1-p.stock; return Math.max(1,Math.ceil(f)); }
function alPedido(){
  const bajo=AL.piezas.filter(p=>p.stock<=p.minimo); if(!bajo.length) return '<div class="empty">Todo por encima del mínimo. Cuando una pieza baje de su mínimo aparecerá aquí para pedirla.</div>';
  const grupos={}; bajo.forEach(p=>(grupos[p.proveedor||"Sin proveedor"]||=[]).push(p));
  return `<p class="hint">Cantidad sugerida: lo que falta para llegar al doble del mínimo. Cámbiala si quieres. El pedido no se envía solo: cópialo o mándalo por WhatsApp.</p>
  ${Object.entries(grupos).map(([prov,l])=>`<section class="card al-ped" data-prov="${esc(prov)}"><div class="al-ped-h"><h3>${esc(prov)}</h3><div class="quick" style="margin:0"><button type="button" class="btn b-ghost b-sm" data-alpedcopiar="${esc(prov)}">Copiar pedido</button><button type="button" class="btn b-wa b-sm" data-alpedwa="${esc(prov)}">WhatsApp</button></div></div>
    <table class="tabla"><thead><tr><th>Pieza</th><th class="n">Stock / mín.</th><th class="n">Pedir</th></tr></thead><tbody>${l.map(p=>`<tr><td><b>${esc(p.nombre)}</b><small class="t-mut" style="display:block">${esc(p.sku)}${p.ref?" · ref. "+esc(p.ref):""}</small></td><td class="n num ${p.stock<=0?"cj-rojo":"cj-ambar"}">${alN(p.stock)} / ${alN(p.minimo)} ${esc(p.unidad)}</td><td class="n"><input class="in num al-q" data-alped="${esc(p.id)}" inputmode="decimal" value="${alN(AL_PED[p.id]??alSugerido(p))}"></td></tr>`).join("")}</tbody></table></section>`).join("")}
  <div class="quick"><button type="button" class="btn b-ghost b-sm" data-alpedcsv>Excel del pedido</button><button type="button" class="btn b-brand b-sm" data-alpedimp>Imprimir pedido</button></div>`;
}
function alTextoPedido(prov){
  const l=AL.piezas.filter(p=>p.stock<=p.minimo&&(p.proveedor||"Sin proveedor")===prov);
  return `Hola, somos Volcano Cars (Antigua, Fuerteventura). Queremos pedir:\n${l.map(p=>`- ${alN(AL_PED[p.id]??alSugerido(p))} ${p.unidad} · ${p.nombre}${p.ref?" (ref. "+p.ref+")":""}`).join("\n")}\n¿Nos confirmas precio y plazo? Gracias.`;
}
function alMovimientos(){
  if(!AL_MOVS){ alCargarMovs(); return '<div class="empty">Cargando movimientos…</div>'; }
  const M=AL_MOVS, filtro={todos:()=>true,entrada:m=>m.tipo==="entrada"||m.tipo==="inicial",salida:m=>m.tipo==="salida"||m.tipo==="devolucion",ajuste:m=>m.tipo==="ajuste"};
  const ajustes=M.movimientos.filter(m=>m.tipo==="ajuste"), merma=ajustes.filter(m=>m.cantidad<0).reduce((s,m)=>s-Math.round(m.cantidad*m.coste),0), sobra=ajustes.filter(m=>m.cantidad>0).reduce((s,m)=>s+Math.round(m.cantidad*m.coste),0);
  const cons=AL.consumo||[];
  return `<div class="al-bar" style="margin-top:-4px"><div class="mesnav"><button type="button" data-almes="-1" aria-label="Mes anterior">‹</button><b>${esc(nombreMes(AL_MES))}</b><button type="button" data-almes="1" aria-label="Mes siguiente" ${AL_MES>=hoyC().slice(0,7)?"disabled":""}>›</button></div><button type="button" class="btn b-ghost b-sm" data-allibro>Libro de registro</button><button type="button" class="btn b-ghost b-sm" data-almovcsv>Excel</button></div>
  <div class="fn-grid"><section class="card"><h3>Mermas y ajustes del mes</h3><div class="al-merma"><div class="${merma?"mal":""}"><small>Mermas (falta material)</small><b class="num">${cjE(merma)}</b></div><div><small>Sobrantes</small><b class="num">${cjE(sobra)}</b></div><div><small>Ajustes</small><b class="num">${ajustes.length}</b></div></div>
    ${ajustes.length?`<div class="tabla-wrap"><table class="tabla"><tbody>${ajustes.map(m=>`<tr><td class="num"><small>${esc(fechaHora(m.t))}</small></td><td><b>${esc(m.nombre)}</b><small class="t-mut" style="display:block">«${esc(m.motivo)}» · ${esc(m.porNombre)}</small></td><td class="n num"><b class="${m.cantidad<0?"cj-rojo":"cj-verde"}">${m.cantidad>0?"+":""}${alN(m.cantidad)}</b><small class="t-mut" style="display:block">${cjE(Math.abs(Math.round(m.cantidad*m.coste)))}</small></td></tr>`).join("")}</tbody></table></div>`:'<p class="hint">Ningún ajuste este mes: el stock cuadra con las entradas y salidas.</p>'}</section>
  <section class="card"><h3>Repuestos más consumidos</h3><p class="hint">Últimos 90 días, por coste.</p>${cons.length?barrasH(cons.map(c=>[c.nombre,c.coste,`${alN(c.cantidad)} ${c.unidad}`]),{fmt:v=>cjE(v)}):'<p class="hint">Todavía no se ha cargado ningún recambio a una orden.</p>'}</section></div>
  <section class="card"><div class="fn-th"><h3>Movimientos de stock</h3><div class="segv" role="group">${[["todos","Todos"],["entrada","Entradas"],["salida","A órdenes"],["ajuste","Ajustes"]].map(([k,t])=>`<button type="button" data-almovf="${k}" aria-pressed="${AL_MOVF===k}">${t}</button>`).join("")}</div></div>
    ${(()=>{ const l=M.movimientos.filter(filtro[AL_MOVF]); return l.length?`<div class="tabla-wrap"><table class="tabla al-mov"><thead><tr><th>Cuándo</th><th>Pieza</th><th>Movimiento</th><th class="n">Cant.</th><th class="n">Stock</th><th>Quién</th></tr></thead><tbody>${l.map(m=>`<tr class="${m.tipo}"><td class="num"><small>${esc(fechaHora(m.t))}</small></td><td><b>${esc(m.nombre)}</b><small class="t-mut" style="display:block">${esc(m.sku)}</small></td><td>${esc(AL_TIPO[m.tipo]||m.tipo)}<small class="t-mut" style="display:block">${m.num?"Orden "+esc(m.num):""}${m.albaran?"Albarán "+esc(m.albaran):""}${m.proveedor?" · "+esc(m.proveedor):""}${m.motivo?" · «"+esc(m.motivo)+"»":""}</small></td><td class="n num"><b class="${m.cantidad<0?"cj-rojo":"cj-verde"}">${m.cantidad>0?"+":""}${alN(m.cantidad)}</b></td><td class="n num">${alN(m.antes)} → ${alN(m.despues)}</td><td>${esc(m.porNombre)}</td></tr>`).join("")}</tbody></table></div>`:'<p class="hint">Sin movimientos.</p>'; })()}</section>
  <section class="card"><h3>Herramientas: quién las ha tenido</h3>${M.herramientas.length?`<div class="tabla-wrap"><table class="tabla"><tbody>${M.herramientas.map(x=>`<tr><td class="num"><small>${esc(fechaHora(x.t))}</small></td><td><b>${esc(x.nombre)}</b><small class="t-mut" style="display:block">${esc(x.codigo)}</small></td><td>${esc({coger:"Cogida",devolver:"Devuelta",localizada:"Localizada al cierre",mantenimiento:"A mantenimiento",reparada:"Reparada",extraviada:"EXTRAVIADA",encontrada:"Encontrada"}[x.tipo]||x.tipo)}${x.num?` · orden ${esc(x.num)}`:""}${x.nota?`<small class="t-mut" style="display:block">«${esc(x.nota)}»</small>`:""}</td><td>${esc(x.quien)}${x.de&&x.de!==x.quien?`<small class="t-mut" style="display:block">la tenía ${esc(x.de)}</small>`:""}</td></tr>`).join("")}</tbody></table></div>`:'<p class="hint">Sin movimientos de herramientas este mes.</p>'}</section>`;
}
async function alCargarMovs(){ try{ AL_MOVS=await api(`/api/almacen/movimientos?desde=${AL_MES}-01&hasta=${finMes(AL_MES)}`); if(AL_VISTA==="mov") $("#al-body").innerHTML=alMovimientos(); }catch(err){ toast(err.message); } }

/* ---------- diálogos ---------- */
function alDlg(html){ let d=$("#dlg-al"); if(!d){ d=document.createElement("dialog"); d.id="dlg-al"; d.className="t-dlg fn-dlg"; document.body.appendChild(d); } d.innerHTML=html; d.showModal(); d.querySelectorAll("[data-alcancel]").forEach(b=>b.onclick=()=>d.close()); return d; }
const alErr=m=>{ const e=$("#al-err"); e.textContent=m; e.hidden=false; };
const alPost=(ruta,body)=>api("/api/almacen/"+ruta,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body||{})});
function alPiezaForm(id){
  const p=id?AL.piezas.find(x=>x.id===id):null, v=k=>p?p[k]??"":"";
  const d=alDlg(`<form id="f-al" novalidate><h2>${p?"Editar pieza":"Nueva pieza"}</h2>
    <div class="t-g2"><div class="field"><label for="al-nom">Nombre del repuesto *</label><input class="in" id="al-nom" maxlength="120" value="${esc(v("nombre"))}" placeholder="Ej.: Pastillas de freno delanteras"></div>
    <div class="field"><label for="al-cat">Categoría</label><select class="in" id="al-cat">${AL.categorias.piezas.map(c=>`<option ${c===(p?p.categoria:"")?"selected":""}>${esc(c)}</option>`).join("")}</select></div></div>
    <div class="t-g3"><div class="field"><label for="al-sku">Código / SKU</label><input class="in" id="al-sku" maxlength="30" value="${esc(v("sku"))}" placeholder="Se pone solo si lo dejas vacío"></div><div class="field"><label for="al-ref">Ref. del fabricante</label><input class="in" id="al-ref" maxlength="60" value="${esc(v("ref"))}"></div><div class="field"><label for="al-ean">Código de barras</label><div class="al-inb"><input class="in" id="al-ean" maxlength="30" value="${esc(v("ean"))}" inputmode="numeric"><button type="button" class="btn b-ghost b-sm" data-alscanean aria-label="Escanear código de barras">📷</button></div></div></div>
    <div class="t-g3"><div class="field"><label for="al-ubi">Ubicación (estantería / caja)</label><input class="in" id="al-ubi" maxlength="60" value="${esc(v("ubicacion"))}" placeholder="Ej.: E2 · balda 3 · caja 14"></div><div class="field"><label for="al-uni">Unidad</label><select class="in" id="al-uni">${AL.categorias.unidades.map(u=>`<option ${u===(p?p.unidad:"ud")?"selected":""}>${u}</option>`).join("")}</select></div><div class="field"><label for="al-prov">Proveedor habitual</label><input class="in" id="al-prov" maxlength="80" value="${esc(v("proveedor"))}"></div></div>
    <div class="t-g3"><div class="field"><label for="al-min">Stock mínimo de seguridad *</label><input class="in num" id="al-min" inputmode="decimal" value="${p?alN(p.minimo):""}" placeholder="Ej.: 2"></div>
      ${AL.admin?`<div class="field"><label for="al-cos">Precio de coste (€)</label><input class="in num" id="al-cos" inputmode="decimal" value="${p?(p.coste/100).toFixed(2).replace(".",","):""}"></div>`:""}
      <div class="field"><label for="al-pvp">Precio de venta (€, sin IGIC)</label><input class="in num" id="al-pvp" inputmode="decimal" value="${p?(p.pvp/100).toFixed(2).replace(".",","):""}"></div></div>
    ${p?`<p class="hint">Stock actual: <b>${alN(p.stock)} ${esc(p.unidad)}</b>. El stock no se cambia aquí: usa «Entrada» o «Recuento» para que quede registrado.</p>`:`<div class="field"><label for="al-ini">Stock inicial (lo que hay ahora en la estantería)</label><input class="in num" id="al-ini" inputmode="decimal" placeholder="0"></div>`}
    <div class="msg bad" id="al-err" hidden></div>
    <div class="t-dlg-acts">${p&&AL.admin?`<button type="button" class="btn b-bad b-sm" data-albaja="${esc(p.id)}" style="margin-right:auto">Dar de baja</button>`:""}<button type="button" class="btn b-ghost" data-alcancel>Cancelar</button><button type="submit" class="btn b-acc" id="al-ok">Guardar</button></div></form>`);
  d.querySelector("[data-alscanean]").onclick=()=>{ d.close(); alEscanear("Código de barras de la caja",c=>{ d.showModal(); $("#al-ean").value=c; }); };
  const bj=d.querySelector("[data-albaja]"); if(bj) bj.onclick=async()=>{ if(!confirm("¿Dar de baja esta pieza? Sus movimientos se conservan.")) return; try{ await alPost("pieza-baja/"+p.id); d.close(); toast("Pieza dada de baja"); alCargar(); }catch(err){ alErr(err.message); } };
  $("#f-al").onsubmit=async e=>{ e.preventDefault(); if($("#al-nom").value.trim().length<2) return alErr("Escribe el nombre."); if(!(alNum($("#al-min").value)>=0)) return alErr("Pon el stock mínimo (0 si no hace falta avisar).");
    $("#al-ok").disabled=true;
    try{ const r=await alPost("pieza"+(p?"/"+p.id:""),{nombre:$("#al-nom").value,categoria:$("#al-cat").value,sku:$("#al-sku").value,ref:$("#al-ref").value,ean:$("#al-ean").value,ubicacion:$("#al-ubi").value,unidad:$("#al-uni").value,proveedor:$("#al-prov").value,minimo:$("#al-min").value,coste:$("#al-cos")?$("#al-cos").value:"",pvp:$("#al-pvp").value,stockInicial:$("#al-ini")?$("#al-ini").value:""});
      d.close(); toast(p?"Pieza guardada":`Pieza creada con el código ${r.pieza.sku}`); await alCargar(); }catch(err){ alErr(err.message); }
    $("#al-ok").disabled=false; };
}
function alEntrada(preId){
  const lineas=preId?[{pieza:preId,cantidad:"",coste:""}]:[];
  const d=alDlg(`<form id="f-al" novalidate><h2>Entrada de material</h2><p class="hint">Cuando llega un pedido: el albarán o la factura y cuántas unidades de cada pieza.</p>
    <div class="t-g2"><div class="field"><label for="al-alb">Nº de albarán o factura *</label><input class="in" id="al-alb" maxlength="40"></div><div class="field"><label for="al-prov">Proveedor</label><input class="in" id="al-prov" maxlength="80" list="al-provs"><datalist id="al-provs">${[...new Set(AL.piezas.map(p=>p.proveedor).filter(Boolean))].map(x=>`<option>${esc(x)}</option>`).join("")}</datalist></div></div>
    <div class="field"><label>Piezas que llegan</label><div class="al-inb"><input class="in" id="al-add" placeholder="Busca por nombre o código…" autocomplete="off"><button type="button" class="btn b-brand b-sm" data-alscanadd>📷</button></div><div class="al-sug" id="al-sug"></div></div>
    <div id="al-lin"></div>
    ${AL.admin?`<label class="t-chk"><input type="checkbox" id="al-fin"><span>Registrar también el gasto en <b>Finanzas</b> (compra de recambios)</span></label>
    <div id="al-finf" hidden><div class="t-g2"><div class="field"><label for="al-imp">IGIC de la factura</label><select class="in" id="al-imp">${FN_IMP.map(([v,t])=>`<option value="${v}" ${v==="7"?"selected":""}>${t}</option>`).join("")}</select></div><div class="field"><label>¿Cómo se pagó?</label>${fnSeg("al-met",FN_PAGO,"")}</div></div>${fnAdjuntoUI("al-adj",true)}</div>`:""}
    <div class="msg bad" id="al-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-alcancel>Cancelar</button><button type="submit" class="btn b-acc" id="al-ok">Registrar entrada</button></div></form>`);
  const pintar=()=>{ $("#al-lin").innerHTML=lineas.length?`<table class="tabla al-lt"><thead><tr><th>Pieza</th><th class="n">Cantidad</th>${AL.admin?'<th class="n">Coste ud. (€)</th>':""}<th></th></tr></thead><tbody>${lineas.map((l,i)=>{ const p=AL.piezas.find(x=>x.id===l.pieza); return `<tr><td><b>${esc(p.nombre)}</b><small class="t-mut" style="display:block">${esc(p.sku)} · hay ${alN(p.stock)} ${esc(p.unidad)}</small></td><td class="n"><input class="in num al-q" data-li="${i}" data-k="cantidad" inputmode="decimal" value="${esc(l.cantidad)}"></td>${AL.admin?`<td class="n"><input class="in num al-q" data-li="${i}" data-k="coste" inputmode="decimal" value="${esc(l.coste)}" placeholder="${(p.coste/100).toFixed(2).replace(".",",")}"></td>`:""}<td><button type="button" class="x" data-lix="${i}" aria-label="Quitar">✕</button></td></tr>`; }).join("")}</tbody></table>`:'<p class="hint">Añade las piezas del albarán.</p>'; };
  const añadir=p=>{ if(!lineas.some(l=>l.pieza===p.id)) lineas.push({pieza:p.id,cantidad:"",coste:""}); $("#al-add").value=""; $("#al-sug").innerHTML=""; pintar(); const i=d.querySelector(`[data-li="${lineas.findIndex(l=>l.pieza===p.id)}"][data-k=cantidad]`); if(i) i.focus(); };
  pintar();
  $("#al-add").oninput=()=>{ const q=$("#al-add").value; const r=q.trim()?AL.piezas.filter(p=>alCoincide(p,q)).slice(0,6):[]; $("#al-sug").innerHTML=r.map(p=>`<button type="button" data-alsug="${esc(p.id)}">${esc(p.nombre)} <small>${esc(p.sku)}</small></button>`).join(""); };
  $("#al-add").onkeydown=e=>{ if(e.key==="Enter"){ e.preventDefault(); const r=alResolver($("#al-add").value)||(()=>{ const l=AL.piezas.filter(p=>alCoincide(p,$("#al-add").value)); return l.length===1?{tipo:"pieza",x:l[0]}:null; })(); if(r&&r.tipo==="pieza") añadir(r.x); } };
  d.addEventListener("click",e=>{ const s=e.target.closest("[data-alsug]"); if(s) añadir(AL.piezas.find(p=>p.id===s.dataset.alsug)); const x=e.target.closest("[data-lix]"); if(x){ lineas.splice(+x.dataset.lix,1); pintar(); } });
  d.addEventListener("input",e=>{ const i=e.target.closest("[data-li]"); if(i) lineas[+i.dataset.li][i.dataset.k]=i.value; });
  d.querySelector("[data-alscanadd]").onclick=()=>{ d.close(); alEscanear("Escanea la pieza que llega",c=>{ d.showModal(); const r=alResolver(c); if(r&&r.tipo==="pieza") añadir(r.x); else toast("Código no encontrado: da de alta la pieza primero"); }); };
  if($("#al-fin")){ $("#al-fin").onchange=()=>{ $("#al-finf").hidden=!$("#al-fin").checked; }; fnSegBind("al-met"); fnAdjuntoBind("al-adj"); }
  $("#f-al").onsubmit=async e=>{ e.preventDefault(); $("#al-err").hidden=true;
    if(!$("#al-alb").value.trim()) return alErr("Escribe el nº de albarán o factura.");
    if(!lineas.length) return alErr("Añade al menos una pieza.");
    if(lineas.some(l=>!(alNum(l.cantidad)>0))) return alErr("Pon la cantidad de cada pieza.");
    const conFin=$("#al-fin")&&$("#al-fin").checked;
    const base=lineas.reduce((s,l)=>{ const p=AL.piezas.find(x=>x.id===l.pieza), c=String(l.coste).trim()?alNum(l.coste):p.coste/100; return s+alNum(l.cantidad)*c; },0);
    if(conFin){ if(!(base>0)) return alErr("Para el gasto en Finanzas hace falta el coste de las piezas."); if(!fnSegVal("al-met")) return alErr("Elige cómo se pagó la factura."); if(!$("#al-adj").dataset.key) return alErr("Adjunta la factura para Finanzas."); }
    $("#al-ok").disabled=true;
    try{ await alPost("entrada",{albaran:$("#al-alb").value,proveedor:$("#al-prov").value,lineas});
      let aviso="";
      if(conFin){ try{ await api("/api/finanzas/gasto",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({fecha:hoyC(),categoria:"recambios",area:"taller",proveedor:$("#al-prov").value||"Proveedor",factura:$("#al-alb").value,concepto:"Recambios: "+lineas.map(l=>alN(alNum(l.cantidad))+" × "+AL.piezas.find(x=>x.id===l.pieza).nombre).join(", ").slice(0,280),base:base.toFixed(2),impuestoPct:$("#al-imp").value,metodo:fnSegVal("al-met"),adjunto:$("#al-adj").dataset.key})}); aviso=" y gasto guardado en Finanzas"; }catch(err){ aviso=". OJO: el gasto no se guardó en Finanzas ("+err.message+")"; } }
      d.close(); toast("Entrada registrada"+aviso); await alCargar(); }catch(err){ alErr(err.message); }
    $("#al-ok").disabled=false; };
  setTimeout(()=>$("#al-alb").focus(),40);
}
function alAjuste(id){
  const p=AL.piezas.find(x=>x.id===id);
  const d=alDlg(`<form id="f-al" novalidate><h2>Recuento de stock</h2><p class="hint"><b>${esc(p.nombre)}</b> · ${esc(p.sku)}${p.ubicacion?" · "+esc(p.ubicacion):""}<br>El sistema dice que hay <b>${alN(p.stock)} ${esc(p.unidad)}</b>. Cuenta lo que hay de verdad.</p>
    <div class="field"><label for="al-real">Unidades que hay de verdad *</label><input class="in num cj-imp" id="al-real" inputmode="decimal"></div>
    <div class="field"><label for="al-mot">Motivo del ajuste * <small class="hint">(queda registrado con tu nombre)</small></label><input class="in" id="al-mot" maxlength="300" placeholder="Ej.: recuento mensual, faltan 2 · pieza rota al montar · error al dar la entrada"></div>
    <p class="hint">Si falta material, el gerente lo verá como merma en Movimientos${AL.admin?"":" y, si pasa de 50 €, le llegará un email"}.</p>
    <div class="msg bad" id="al-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-alcancel>Cancelar</button><button type="submit" class="btn b-acc" id="al-ok">Guardar recuento</button></div></form>`);
  $("#f-al").onsubmit=async e=>{ e.preventDefault(); const r=alNum($("#al-real").value); if(!(r>=0)) return alErr("Escribe cuántas hay."); if($("#al-mot").value.trim().length<10) return alErr("Explica el motivo (mínimo 10 letras).");
    try{ const x=await alPost("ajuste/"+p.id,{stockReal:String(r),motivo:$("#al-mot").value}); d.close(); toast(`Stock ajustado (${x.diferencia>0?"+":""}${alN(x.diferencia)})`); AL_MOVS=null; await alCargar(); }catch(err){ alErr(err.message); } };
  setTimeout(()=>$("#al-real").focus(),40);
}
async function alHerrForm(id){
  const h=id?AL.herramientas.find(x=>x.id===id):null, v=k=>h?h[k]??"":"";
  const d=alDlg(`<form id="f-al" novalidate><h2>${h?"Editar herramienta":"Nueva herramienta"}</h2>
    <div class="t-g2"><div class="field"><label for="al-nom">Nombre *</label><input class="in" id="al-nom" maxlength="120" value="${esc(v("nombre"))}" placeholder="Ej.: Máquina de diagnosis Launch X431"></div><div class="field"><label for="al-cat">Tipo</label><select class="in" id="al-cat">${AL.categorias.herramientas.map(c=>`<option ${c===(h?h.categoria:"")?"selected":""}>${esc(c)}</option>`).join("")}</select></div></div>
    <div class="t-g3"><div class="field"><label for="al-cod">Etiqueta / código</label><input class="in" id="al-cod" maxlength="30" value="${esc(v("codigo"))}" placeholder="Se pone solo"></div><div class="field"><label for="al-ser">Nº de serie</label><input class="in" id="al-ser" maxlength="60" value="${esc(v("serie"))}"></div><div class="field"><label for="al-ubi">Sitio habitual</label><input class="in" id="al-ubi" maxlength="60" value="${esc(v("ubicacion"))}" placeholder="Ej.: armario 1"></div></div>
    ${AL.admin?`<div class="field"><label for="al-val">Valor aproximado (€)</label><input class="in num" id="al-val" inputmode="decimal" value="${h&&h.valor?(h.valor/100).toFixed(2).replace(".",","):""}"></div>`:""}
    <label class="t-chk"><input type="checkbox" id="al-esp" ${!h||h.especial?"checked":""}><span>Herramienta de valor o especial: al cogerla hay que indicar la orden de trabajo</span></label>
    <div class="field"><label>Foto</label><div class="fn-adj" id="al-fot"><label class="btn b-ghost b-sm"><input type="file" accept="image/*" capture="environment" hidden>📷 Hacer foto</label><span class="fn-adj-ok">${h&&h.foto?`<img src="${FOTO(h.foto)}" alt="" class="al-mini">`:""}</span></div></div>
    <div class="field"><label for="al-not">Notas</label><input class="in" id="al-not" maxlength="300" value="${esc(v("notas"))}"></div>
    <div class="msg bad" id="al-err" hidden></div>
    <div class="t-dlg-acts">${h&&AL.admin?`<button type="button" class="btn b-bad b-sm" data-albajah style="margin-right:auto">Dar de baja</button>`:""}<button type="button" class="btn b-ghost" data-alcancel>Cancelar</button><button type="submit" class="btn b-acc" id="al-ok">Guardar</button></div></form>`);
  let foto=h?h.foto:"";
  d.querySelector("#al-fot input").onchange=async ev=>{ const f=ev.target.files[0]; ev.target.value=""; if(!f) return; const ok=d.querySelector("#al-fot .fn-adj-ok"); ok.textContent="Subiendo…"; try{ const b=await shrink(f); foto=(await api("/api/fotos",{method:"POST",headers:{"content-type":"image/jpeg"},body:b})).key; ok.innerHTML=`<img src="${FOTO(foto)}" alt="" class="al-mini">`; }catch(err){ ok.textContent=err.message; } };
  const bj=d.querySelector("[data-albajah]"); if(bj) bj.onclick=async()=>{ const m=prompt("Motivo de la baja (rota, vendida…):"); if(!m||m.trim().length<5) return; try{ await alPost("herramienta-baja/"+h.id,{motivo:m}); d.close(); toast("Herramienta dada de baja"); alCargar(); }catch(err){ alErr(err.message); } };
  $("#f-al").onsubmit=async e=>{ e.preventDefault(); if($("#al-nom").value.trim().length<2) return alErr("Escribe el nombre."); $("#al-ok").disabled=true;
    try{ const r=await alPost("herramienta"+(h?"/"+h.id:""),{nombre:$("#al-nom").value,categoria:$("#al-cat").value,codigo:$("#al-cod").value,serie:$("#al-ser").value,ubicacion:$("#al-ubi").value,valor:$("#al-val")?$("#al-val").value:"",especial:$("#al-esp").checked,foto,notas:$("#al-not").value});
      d.close(); toast(h?"Guardada":`Herramienta creada con la etiqueta ${r.herramienta.codigo}`); await alCargar(); }catch(err){ alErr(err.message); }
    $("#al-ok").disabled=false; };
}
function alCoger(id,ordenFija){
  const h=AL.herramientas.find(x=>x.id===id); const ords=(ORDENES||[]).filter(o=>o.estado!=="entregado");
  const d=alDlg(`<form id="f-al" novalidate><h2>Coger herramienta</h2><p class="hint"><b>${esc(h.nombre)}</b> · ${esc(h.codigo)}. Queda a tu nombre hasta que la devuelvas.</p>
    <div class="field"><label for="al-ord">Orden de trabajo ${h.especial?"*":"(si es para una)"}</label><select class="in" id="al-ord"><option value="">— ${h.especial?"Elige la orden":"Ninguna (uso general del taller)"} —</option>${ords.map(o=>`<option value="${esc(o.token)}" ${o.token===ordenFija?"selected":""}>${esc((o.num||"")+" · "+(o.vehiculo.matricula||"").toUpperCase()+" · "+(o.vehiculo.coche||""))}</option>`).join("")}</select></div>
    <div class="field"><label for="al-not">Nota (opcional)</label><input class="in" id="al-not" maxlength="200" placeholder="Ej.: para el diagnóstico del ABS"></div>
    <div class="msg bad" id="al-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-alcancel>Cancelar</button><button type="submit" class="btn b-acc" id="al-ok">Me la llevo</button></div></form>`);
  $("#f-al").onsubmit=async e=>{ e.preventDefault(); if(h.especial&&!$("#al-ord").value) return alErr("Es una herramienta especial: elige la orden."); $("#al-ok").disabled=true;
    try{ await alPost(`herr/${h.id}/coger`,{orden:$("#al-ord").value,nota:$("#al-not").value}); d.close(); toast("Herramienta a tu nombre. Acuérdate de devolverla."); await alCargar(true); alRefrescarOrden(); }catch(err){ alErr(err.message); }
    $("#al-ok").disabled=false; };
}
async function alHerrAccion(id,accion){
  const txt={mantenimiento:"¿Qué le pasa?",extraviada:"¿Dónde se vio por última vez?"}[accion];
  let nota=""; if(txt){ nota=prompt(txt)||""; if(nota.trim().length<4) return toast("Hace falta una explicación"); }
  if(accion==="devolver"&&!confirm("¿Devolver la herramienta a su sitio?")) return;
  try{ await alPost(`herr/${id}/${accion}`,{nota}); toast({devolver:"Devuelta. Gracias.",mantenimiento:"Marcada en mantenimiento",reparada:"Disponible otra vez",extraviada:"Marcada como extraviada: el gerente recibe el aviso",encontrada:"¡Encontrada!"}[accion]||"Hecho"); await alCargar(true); alRefrescarOrden(); }catch(err){ toast(err.message); }
}
/* ficha rápida al escanear */
function alFichaRapida(p){
  const ords=(ORDENES||[]).filter(o=>o.estado!=="entregado");
  const d=alDlg(`<form id="f-al" novalidate><h2>${esc(p.nombre)}</h2><p class="hint">${esc(p.sku)}${p.ref?" · ref. "+esc(p.ref):""}${p.ubicacion?" · 📍 "+esc(p.ubicacion):""}</p>
    <div class="al-rap"><div><small>Stock</small><b class="num ${p.stock<=p.minimo?"cj-rojo":""}">${alN(p.stock)} ${esc(p.unidad)}</b></div><div><small>Mínimo</small><b class="num">${alN(p.minimo)}</b></div><div><small>Venta</small><b class="num">${cjE(p.pvp)}</b></div></div>
    ${ords.length?`<div class="field"><label>Usarla en una orden (descuenta del stock)</label><div class="al-inb"><select class="in" id="al-ord"><option value="">— Elige la orden —</option>${ords.map(o=>`<option value="${esc(o.token)}">${esc((o.num||"")+" · "+(o.vehiculo.matricula||"").toUpperCase()+" · "+(o.vehiculo.coche||""))}</option>`).join("")}</select><input class="in num al-q" id="al-cant" inputmode="decimal" value="1" aria-label="Cantidad"></div></div>`:""}
    <div class="msg bad" id="al-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-alcancel>Cerrar</button><button type="button" class="btn b-ghost" data-alrent>+ Entrada</button>${alPuedeCat()?'<button type="button" class="btn b-ghost" data-alraj>Recuento</button>':""}${ords.length?'<button type="submit" class="btn b-acc" id="al-ok">Descontar</button>':""}</div></form>`);
  d.querySelector("[data-alrent]").onclick=()=>{ d.close(); alEntrada(p.id); };
  const aj=d.querySelector("[data-alraj]"); if(aj) aj.onclick=()=>{ d.close(); alAjuste(p.id); };
  $("#f-al").onsubmit=async e=>{ e.preventDefault(); if(!$("#al-ord")||!$("#al-ord").value) return alErr("Elige la orden."); try{ const r=await alPost("imputar",{orden:$("#al-ord").value,pieza:p.id,cantidad:$("#al-cant").value}); d.close(); toast(`Descontado. Quedan ${alN(r.stock)} ${p.unidad}`+(r.bajoMinimo?" · ¡por debajo del mínimo!":"")); await alCargar(true); alRefrescarOrden(); }catch(err){ alErr(err.message); } };
}
function alHerrRapida(h){
  const [et]=AL_EST[h.estado], mia=h.uso&&ME&&h.uso.uid===ME.uid;
  const d=alDlg(`<form id="f-al" novalidate><h2>${esc(h.nombre)}</h2><p class="hint">${esc(h.codigo)} · ${esc(et)}${h.uso?` · la tiene ${esc(h.uso.nombre)}${h.uso.num?" (orden "+esc(h.uso.num)+")":""}`:""}</p>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-alcancel>Cerrar</button>${h.estado==="disponible"?'<button type="button" class="btn b-acc" data-r="coger">Coger</button>':""}${h.estado==="uso"&&(mia||ES_GER())?'<button type="button" class="btn b-brand" data-r="devolver">Devolver</button>':""}</div></form>`);
  d.querySelectorAll("[data-r]").forEach(b=>b.onclick=()=>{ d.close(); b.dataset.r==="coger"?alCoger(h.id):alHerrAccion(h.id,"devolver"); });
}

/* ---------- etiquetas QR (imprimir y pegar en la estantería / herramienta) ---------- */
function alEtiquetas(items){
  let el=$("#al-print"); if(!el){ el=document.createElement("div"); el.id="al-print"; document.body.appendChild(el); }
  el.innerHTML=`<div class="al-labels">${items.map(x=>`<div class="al-lab"><div class="al-qr">${QR.svg(x.qr,110)}</div><div><b>${esc(x.nombre)}</b><span class="num">${esc(x.codigo)}</span>${x.sub?`<small>${esc(x.sub)}</small>`:""}<em>VOLCANO CARS</em></div></div>`).join("")}</div>`;
  document.body.classList.add("print-al"); const fin=()=>{ document.body.classList.remove("print-al"); removeEventListener("afterprint",fin); }; addEventListener("afterprint",fin); setTimeout(()=>window.print(),80);
}
const alEtqPieza=p=>({qr:"VC-P:"+p.sku,nombre:p.nombre,codigo:p.sku,sub:[p.ubicacion,p.ref&&"ref. "+p.ref].filter(Boolean).join(" · ")});
const alEtqHerr=h=>({qr:"VC-H:"+h.codigo,nombre:h.nombre,codigo:h.codigo,sub:h.serie?"S/N "+h.serie:""});

/* ---------- pedido: texto, WhatsApp, Excel, imprimir ---------- */
function alPedidoFilas(){ return AL.piezas.filter(p=>p.stock<=p.minimo).map(p=>[p.proveedor||"Sin proveedor",p.sku,p.ref,p.nombre,alN(p.stock),alN(p.minimo),alN(AL_PED[p.id]??alSugerido(p)),p.unidad]); }

/* ---------- eventos de la pestaña ---------- */
$("#al").addEventListener("click",async e=>{ const t=e.target, q=s=>t.closest(s);
  const v=q("[data-alvista]"); if(v){ AL_VISTA=v.dataset.alvista; AL_BUSQ=""; if(AL_VISTA==="mov") AL_MOVS=null; alPintar(); return; }
  if(q("[data-alscan]")){ alEscanear("Escanear pieza o herramienta",alTrasEscanear); return; }
  const en=q("[data-alentrada]"); if(en){ alEntrada(en.dataset.alentrada||""); return; }
  const pz=q("[data-alpieza]"); if(pz){ alPiezaForm(pz.dataset.alpieza||""); return; }
  const aj=q("[data-alajuste]"); if(aj){ alAjuste(aj.dataset.alajuste); return; }
  const hn=q("[data-alherrnueva]"); if(hn){ alHerrForm(hn.dataset.alherrnueva||""); return; }
  const cg=q("[data-alcoger]"); if(cg){ alCoger(cg.dataset.alcoger); return; }
  const dv=q("[data-aldevolver]"); if(dv){ alHerrAccion(dv.dataset.aldevolver,"devolver"); return; }
  const ha=q("[data-alh]"); if(ha){ alHerrAccion(ha.dataset.id,ha.dataset.alh); return; }
  const hx=q("[data-alherr]"); if(hx){ AL_VISTA="herr"; const h=AL.herramientas.find(x=>x.id===hx.dataset.alherr); AL_BUSQ=h?h.codigo:""; alPintar(); return; }
  const et=q("[data-aletiq]"); if(et){ const l=et.dataset.aletiq==="rep"?AL.piezas.filter(p=>alCoincide(p,AL_BUSQ)).map(alEtqPieza):AL.herramientas.filter(h=>alCoincide(h,AL_BUSQ)).map(alEtqHerr); if(!l.length) return toast("No hay nada que imprimir"); alEtiquetas(l); return; }
  const e1=q("[data-aletiq1]"); if(e1){ const h=AL.herramientas.find(x=>x.id===e1.dataset.aletiq1.slice(2)); if(h) alEtiquetas([alEtqHerr(h)]); return; }
  const pc=q("[data-alpedcopiar]"); if(pc){ const txt=alTextoPedido(pc.dataset.alpedcopiar); try{ await navigator.clipboard.writeText(txt); toast("Pedido copiado: pégalo en el email o WhatsApp del proveedor"); }catch(_){ prompt("Copia el pedido:",txt); } return; }
  const pw=q("[data-alpedwa]"); if(pw){ window.open("https://wa.me/?text="+encodeURIComponent(alTextoPedido(pw.dataset.alpedwa)),"_blank","noopener"); return; }
  if(q("[data-alpedcsv]")){ fnCsv(`volcano-cars-pedido-${hoyC()}.csv`,[["Proveedor","Código","Ref. fabricante","Pieza","Stock","Mínimo","Pedir","Unidad"],...alPedidoFilas()]); return; }
  if(q("[data-alpedimp]")){ let el=$("#al-print"); if(!el){ el=document.createElement("div"); el.id="al-print"; document.body.appendChild(el); }
    const g={}; alPedidoFilas().forEach(r=>(g[r[0]]||=[]).push(r));
    el.innerHTML=`<div class="al-pedp"><header class="tp-h"><img src="/marca/logo-oscuro.svg" alt="Volcano Cars" height="26"><div><b>Pedido de recambios</b><small>${esc(fechaLarga(hoyC()))}</small></div></header>${Object.entries(g).map(([p,l])=>`<h4>${esc(p)}</h4><table><thead><tr><th>Código</th><th>Ref.</th><th>Pieza</th><th>Pedir</th></tr></thead><tbody>${l.map(r=>`<tr><td>${esc(r[1])}</td><td>${esc(r[2]||"")}</td><td>${esc(r[3])}</td><td><b>${esc(r[6])} ${esc(r[7])}</b></td></tr>`).join("")}</tbody></table>`).join("")}</div>`;
    document.body.classList.add("print-al"); const fin=()=>{ document.body.classList.remove("print-al"); removeEventListener("afterprint",fin); }; addEventListener("afterprint",fin); setTimeout(()=>window.print(),80); return; }
  const mf=q("[data-almovf]"); if(mf){ AL_MOVF=mf.dataset.almovf; $("#al-body").innerHTML=alMovimientos(); return; }
  const mm=q("[data-almes]"); if(mm){ AL_MES=mesMas(AL_MES,+mm.dataset.almes); AL_MOVS=null; $("#al-body").innerHTML=alMovimientos(); alPintar(); return; }
  if(q("[data-almovcsv]")){ fnCsv(`volcano-cars-almacen-${AL_MES}.csv`,[["Fecha","Código","Pieza","Movimiento","Cantidad","Stock antes","Stock después","Orden","Albarán","Proveedor","Motivo","Quién"],...AL_MOVS.movimientos.map(m=>[m.t.slice(0,16).replace("T"," "),m.sku,m.nombre,AL_TIPO[m.tipo]||m.tipo,alN(m.cantidad),alN(m.antes),alN(m.despues),m.num,m.albaran,m.proveedor,m.motivo,m.porNombre])]); return; }
  if(q("[data-allibro]")){ try{ const r=await api("/api/almacen/libro"); alDlg(`<form><h2>Libro de registro del almacén</h2><div class="dw-box cj-integ ${r.integro?"ok":"mal"}"><b>${r.integro?"✓ Libro íntegro":"⚠ El libro ha sido manipulado"}</b><p class="hint" style="margin:4px 0 0">${r.total} anotaciones encadenadas con huella: altas, entradas, salidas, recuentos y herramientas.</p></div><div class="tabla-wrap" style="max-height:50vh;overflow:auto"><table class="tabla"><tbody>${r.entradas.slice(0,150).map(x=>`<tr><td class="num"><small>#${x.n} · ${esc(fechaHora(x.t))}</small></td><td><b>${esc(x.accion)}</b><small class="t-mut" style="display:block">${esc(Object.values(x.datos||{}).filter(v=>v!==""&&v!=null).join(" · "))}</small></td><td>${esc(x.nombre)}</td></tr>`).join("")}</tbody></table></div><div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-alcancel>Cerrar</button></div></form>`); }catch(err){ toast(err.message); } return; }
});
$("#al").addEventListener("input",e=>{ if(e.target.id==="al-busq"){ AL_BUSQ=e.target.value; alPintar.foco=true; alPintar(); } const q=e.target.closest("[data-alped]"); if(q) AL_PED[q.dataset.alped]=alNum(q.value); });
setInterval(()=>{ if(!PW||document.hidden) return; if(!$("#s-alm").hidden&&!document.querySelector("#dlg-al[open],#dlg-scan[open]")&&!(document.activeElement&&document.activeElement.id==="al-busq")) alCargar(true); else if(ES_GER()&&!ES_EQ()) alCargar(true); },30000);

/* =====================================================================
   FORM-03: recambios y herramientas de la orden
   ===================================================================== */
async function alCargarOrden(token){ try{ const [r]=await Promise.all([api("/api/almacen/orden/"+token),AL?null:api("/api/almacen/estado").then(x=>{ AL=x; })]); AL_ORDEN={token,...r}; }catch(_){ AL_ORDEN={token,recambios:[],herramientas:[],historial:[],error:true}; } }
async function alRefrescarOrden(){ if(!TF||$("#s-ficha").hidden) return; await alCargarOrden(TF.orden.token); if(TF_TAB==="f3"){ const b=$("#al-f3"); if(b) b.outerHTML=alF3(); } }
function alF3(){
  if(!TF) return "";
  if(!AL_ORDEN||AL_ORDEN.token!==TF.orden.token){ alCargarOrden(TF.orden.token).then(()=>{ const b=$("#al-f3"); if(b) b.outerHTML=alF3(); }); return `<div id="al-f3">${tSec("R","Recambios y herramientas de esta orden","",'<p class="hint">Cargando…</p>')}</div>`; }
  const R=AL_ORDEN.recambios, salidas=R.filter(m=>m.tipo==="salida"), entregado=TF.orden.estado==="entregado";
  const neto={}; for(const m of R){ const k=m.pieza; (neto[k]||={nombre:m.nombre,sku:m.sku,unidad:m.unidad,cant:0,pvp:m.pvp}).cant=Math.round((neto[k].cant-m.cantidad)*100)/100; }
  const totPvp=Object.values(neto).reduce((s,x)=>s+Math.round(x.cant*x.pvp),0);
  return `<div id="al-f3">${tSec("R","Recambios y herramientas de esta orden","lo que se usa se descuenta del almacén al momento",`
    ${entregado?"":`<div class="al-imp"><div class="al-inb"><input class="in" id="al-f3q" placeholder="Busca el recambio por nombre, código o referencia…" autocomplete="off"><button type="button" class="btn b-brand b-sm" data-alf3scan aria-label="Escanear recambio">📷</button></div><div class="al-sug" id="al-f3sug"></div></div>`}
    ${salidas.length?`<div class="tabla-wrap"><table class="tabla al-f3t"><thead><tr><th>Recambio</th><th class="n">Cant.</th><th class="n">PVP</th><th>Quién</th><th></th></tr></thead><tbody>${salidas.map(m=>{ const pend=Math.round((-m.cantidad-(m.devuelto||0))*100)/100; return `<tr><td><b>${esc(m.nombre)}</b><small class="t-mut" style="display:block">${esc(m.sku)}${m.ubicacion?" · 📍 "+esc(m.ubicacion):""} · ${esc(fechaHora(m.t))}</small></td><td class="n num">${alN(-m.cantidad)} ${esc(m.unidad)}${m.devuelto?`<small class="t-mut" style="display:block">devuelto ${alN(m.devuelto)}</small>`:""}</td><td class="n num">${cjE(Math.round(pend*m.pvp))}</td><td><small>${esc(m.porNombre)}</small></td><td class="n">${pend>0&&!entregado?`<button type="button" class="chipb" data-alf3dev="${esc(m.id)}" data-max="${pend}">Devolver</button>`:""}</td></tr>`; }).join("")}</tbody></table></div><p class="hint">Total recambios a precio de venta: <b>${cjE(totPvp)}</b> (sin IGIC). Revisa que estén en el presupuesto.</p>`:'<p class="hint">Todavía no se ha cargado ningún recambio a esta orden.</p>'}
    <h4 class="fn-h4">Herramientas en uso para esta orden</h4>
    ${AL_ORDEN.herramientas.length?AL_ORDEN.herramientas.map(h=>`<div class="fn-pend"><span><b>${esc(h.nombre)}</b><small>${esc(h.codigo)} · la tiene ${esc(h.uso.nombre)} desde ${esc(fechaHora(h.uso.desde))}</small></span>${(h.uso.uid===(ME&&ME.uid))||ES_GER()?`<button type="button" class="btn b-brand b-sm" data-alf3hdev="${esc(h.id)}">Devolver</button>`:""}</div>`).join(""):'<p class="hint">Ninguna.</p>'}
    ${entregado?"":`<button type="button" class="btn b-ghost b-sm" data-alf3coger>+ Coger herramienta para esta orden</button>`}`)}</div>`;
}
async function alF3Imputar(p){
  const n=prompt(`¿Cuántas unidades (${p.unidad}) de «${p.nombre}» has usado? Quedan ${alN(p.stock)}.`,"1"); if(n===null) return; const c=alNum(n); if(!(c>0)) return toast("Cantidad no válida");
  try{ const r=await alPost("imputar",{orden:TF.orden.token,pieza:p.id,cantidad:String(c)}); toast(`Descontado del almacén. Quedan ${alN(r.stock)} ${p.unidad}`+(r.bajoMinimo?" · ¡por debajo del mínimo!":"")); await alCargar(true); await alRefrescarOrden(); }catch(err){ toast(err.message); }
}
document.addEventListener("input",e=>{ if(e.target.id!=="al-f3q"||!AL) return; const q=e.target.value; const r=q.trim()?AL.piezas.filter(p=>alCoincide(p,q)).slice(0,6):[]; $("#al-f3sug").innerHTML=r.map(p=>`<button type="button" data-alf3pz="${esc(p.id)}">${esc(p.nombre)} <small>${esc(p.sku)} · quedan ${alN(p.stock)} ${esc(p.unidad)}${p.ubicacion?" · 📍 "+esc(p.ubicacion):""}</small></button>`).join("")||(q.trim()?'<p class="hint">Ninguna pieza coincide.</p>':""); });
document.addEventListener("keydown",e=>{ if(e.target.id==="al-f3q"&&e.key==="Enter"){ e.preventDefault(); const r=alResolver(e.target.value); if(r&&r.tipo==="pieza") alF3Imputar(r.x); } });
document.addEventListener("click",async e=>{ const t=e.target; if(!t.closest||!t.closest("#al-f3")) return;
  const pz=t.closest("[data-alf3pz]"); if(pz){ const p=AL.piezas.find(x=>x.id===pz.dataset.alf3pz); $("#al-f3q").value=""; $("#al-f3sug").innerHTML=""; alF3Imputar(p); return; }
  if(t.closest("[data-alf3scan]")){ alEscanear("Escanea el recambio",c=>{ const r=alResolver(c); if(r&&r.tipo==="pieza") alF3Imputar(r.x); else toast("No hay ningún recambio con ese código"); }); return; }
  const dv=t.closest("[data-alf3dev]"); if(dv){ const n=prompt(`¿Cuántas vuelven al almacén? (máx. ${alN(+dv.dataset.max)})`,alN(+dv.dataset.max)); if(n===null) return; const m=prompt("¿Por qué vuelve? (sobró, medida equivocada…)"); if(!m||m.trim().length<4) return toast("Hace falta el motivo");
    try{ await alPost("devolver-pieza/"+dv.dataset.alf3dev,{cantidad:n,motivo:m}); toast("Devuelto al almacén"); await alCargar(true); await alRefrescarOrden(); }catch(err){ toast(err.message); } return; }
  const hd=t.closest("[data-alf3hdev]"); if(hd){ alHerrAccion(hd.dataset.alf3hdev,"devolver"); return; }
  if(t.closest("[data-alf3coger]")){ if(!AL) await alCargar(true); alEscanear("Escanea la etiqueta de la herramienta",c=>{ const r=alResolver(c); if(r&&r.tipo==="herr") alCoger(r.x.id,TF.orden.token); else toast("No hay ninguna herramienta con ese código"); }); return; }
});

/* =====================================================================
   AUDITORÍA DE HERRAMIENTAS: al salir (equipo) y al cerrar la caja
   ===================================================================== */
function alResolverHerramientas(lista,titulo,texto,alTerminar){
  let pend=lista.slice();
  const d=alDlg(`<form id="f-al" novalidate><h2>${esc(titulo)}</h2><p class="hint">${esc(texto)}</p><div id="al-res"></div><div class="msg bad" id="al-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-alcancel>Ahora no</button></div></form>`);
  const pintar=()=>{ if(!pend.length){ d.close(); alTerminar(); return; }
    $("#al-res").innerHTML=pend.map(h=>`<div class="al-resh" data-id="${esc(h.id)}"><b>${esc(h.nombre)}</b><small>${esc(h.codigo)}${h.quien||h.uso?` · la tiene ${esc(h.quien||(h.uso&&h.uso.nombre))}`:""}${(h.num||(h.uso&&h.uso.num))?` · orden ${esc(h.num||h.uso.num)}`:""}</small>
      <div class="quick"><button type="button" class="btn b-acc b-sm" data-r="devolver">Ya está en su sitio</button><button type="button" class="btn b-ghost b-sm" data-r="localizar">Sigue fuera: digo dónde</button><button type="button" class="btn b-bad b-sm" data-r="extraviada">No la encuentro</button></div>
      <input class="in" data-nota placeholder="Dónde está exactamente / dónde se vio por última vez" maxlength="300" hidden></div>`).join(""); };
  d.addEventListener("click",async e=>{ const b=e.target.closest("[data-r]"); if(!b) return; const box=b.closest(".al-resh"), id=box.dataset.id, acc=b.dataset.r, nota=box.querySelector("[data-nota]");
    if(acc!=="devolver"&&(nota.hidden||nota.value.trim().length<5)){ nota.hidden=false; nota.focus(); if(nota.value.trim().length<5){ alErr("Escribe dónde está (mínimo 5 letras) y vuelve a pulsar."); return; } }
    try{ await alPost(`herr/${id}/${acc}`,{nota:nota.value}); $("#al-err").hidden=true; pend=pend.filter(x=>x.id!==id); pintar(); }catch(err){ alErr(err.message); } });
  pintar();
}
// Al salir, el equipo tiene que devolver o localizar lo que tiene a su nombre
$("#logout").onclick=async()=>{
  if(ME&&ME.equipo){ try{ const mias=await api("/api/almacen/mias"); if(mias.length) return alResolverHerramientas(mias,"Antes de salir","Tienes herramientas a tu nombre. Devuélvelas o di dónde se quedan.",()=>logout()); }catch(_){ } }
  logout();
};

/* =====================================================================
   DASHBOARD: aviso de almacén
   ===================================================================== */
const _alCargarDash=cargarDash;
cargarDash=async function(){ await _alCargarDash(); const box=$("#dash-alm"); if(!box||ES_EQ()) return;
  try{ if(!AL) AL=await api("/api/almacen/estado"); alBadge(); const bajo=AL.piezas.filter(p=>p.stock<=p.minimo), extr=AL.herramientas.filter(h=>h.estado==="extraviada"), uso=AL.herramientas.filter(h=>h.estado==="uso");
    box.innerHTML=!AL.piezas.length&&!AL.herramientas.length?"":`<section class="card al-dash"><div class="fn-th"><h3>Almacén</h3><button type="button" class="g-link" data-aldash>Abrir Inventario →</button></div>
      <div class="al-merma"><div><small>Valor en almacén</small><b class="num">${cjE(AL.kpis?AL.kpis.valor:0)}</b></div><div class="${bajo.length?"mal":""}"><small>Bajo mínimo</small><b class="num">${bajo.length}</b></div><div class="${extr.length?"mal":""}"><small>Herramientas extraviadas</small><b class="num">${extr.length}</b></div><div><small>Herramientas en uso</small><b class="num">${uso.length}</b></div></div>
      ${bajo.length?`<p style="margin:10px 0 0"><b>Reponer:</b> ${bajo.slice(0,8).map(p=>`${esc(p.nombre)} (${alN(p.stock)}/${alN(p.minimo)})`).join(" · ")}${bajo.length>8?"…":""} <button type="button" class="g-link" data-aldashped>Preparar pedido</button></p>`:""}
      ${uso.length?`<p class="hint" style="margin:6px 0 0">En uso: ${uso.map(h=>`${esc(h.nombre)} → ${esc(h.uso.nombre)}${h.uso.num?" ("+esc(h.uso.num)+")":""}`).join(" · ")}</p>`:""}</section>`;
  }catch(_){ box.innerHTML=""; } };
document.addEventListener("click",e=>{ if(e.target.closest("[data-aldash]")){ abrirTab("alm"); } if(e.target.closest("[data-aldashped]")){ AL_VISTA="ped"; abrirTab("alm"); } });
