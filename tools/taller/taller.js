/* =====================================================================
   TALLER · Manual SOP-01 (FORM-01 Recepción, FORM-02 Inspección 360°,
   FORM-03 Control de tiempos, FORM-04 Control de calidad)
   Fuente: tools/taller/taller.js → se copia dentro de admin.html con
   python3 tools/taller/inyectar.py. Para cambiar textos, edita aquí.
   ===================================================================== */
const T_VER="Manual SOP-01 · Versión 1.1";
const T_ROL={gerente:"Gerente",mecanico:"Mecánico",calidad:"Calidad",recepcion:"Recepción"};
const T_FASES=[["rec","Recepcionado",["recibido"]],["insp","En inspección",["diagnostico","presupuesto"]],["trab","En trabajo",["reparacion"]],["cal","Control calidad",["calidad","listo"]],["ent","Entregado",["entregado"]]];
const T_SUB={presupuesto:"Esperando presupuesto",listo:"Listo para entregar"};
const tFase=e=>Math.max(0,T_FASES.findIndex(f=>f[2].includes(e)));
const T_INV=[["llaves","Llaves y mando"],["repuesto","Rueda de repuesto o kit"],["gato","Gato y herramientas"],["baliza","Triángulos / baliza V-16 y chaleco"],["documentacion","Documentación del coche"],["radio","Radio / pantalla extraíble"],["valor","Objetos de valor"],["personales","Objetos personales"]];
const T_DANO={R:["Rayón","#2F55A4"],A:["Abolladura","#D9481C"],P:["Picado de pintura","#8A4B00"],G:["Golpe","#B3261E"],S:["Salitre / óxido","#6B5A1E"],O:["Otro","#5A564F"]};
const T_VISTAS=[["izq","Lateral izquierdo","lado",300,120],["frontal","Frontal","frente",200,120],["techo","Techo","techo",300,130],["trasera","Trasera","detras",200,120],["dcho","Lateral derecho","lado",300,120]];
const T_TESTIGOS=["Motor","ABS","Airbag","Aceite","Batería","Temperatura","Frenos","Neumáticos","Ninguno"];
const T_MOTIVOS=["Recambio pendiente","Otro coche urgente","Comida / descanso","Espera de autorización del cliente","Falta de herramienta","Otro"];
const T_JUST=[["A","Avería oculta que apareció al desmontar"],["B","Pieza gripada, oxidada o rota al desmontar (salitre)"],["C","Recambio equivocado o defectuoso"],["D","Trabajo extra aprobado por el cliente"],["E","El tiempo estimado era demasiado bajo"],["F","Faltaba herramienta o equipo"],["G","Faltaba información técnica o el diagnóstico fue difícil"],["H","Hubo que repetir un trabajo (retrabajo)"],["I","Otra causa (explícala)"]];
const T_TIPO3={inspeccion:"Inspección",mantenimiento:"Mantenimiento",reparacion:"Reparación",preparacion:"Preparación para venta"};
const F2_SECCIONES=[
  ["A","Exterior y carrocería","",[["a1","Paragolpes delantero y trasero"],["a2","Capó, aletas y puertas: alineación y holguras"],["a3","Portón / maletero y cierres"],["a4","Pintura: rayones, picados, diferencias de tono"],["a5","Abolladuras o golpes"],["a6","Óxido por salitre (bajos de puertas, pasos de rueda)"],["a7","Parabrisas y cristales: grietas, impactos"],["a8","Retrovisores"],["a9","Limpiaparabrisas y escobillas"],["a10","Faros, pilotos, intermitentes, freno, marcha atrás"],["a11","Matrícula y soportes"],["a12","Bajos y protector de cárter (golpes de pistas)"],["a13","Escape: estado, fugas, soportes"]]],
  ["B","Habitáculo e interior","",[["b1","Tapicería y asientos: roturas, manchas, mecanismos"],["b2","Cinturones: anclaje, retracción, hebillas"],["b3","Volante, palanca y pedales: desgaste"],["b4","Cuadro: testigos con contacto y con motor en marcha"],["b5","Aire acondicionado: enfría y no huele"],["b6","Calefacción y desempañado"],["b7","Elevalunas, cierre centralizado y mandos"],["b8","Radio, pantalla y conectividad"],["b9","Airbags: testigo apagado, tapas sin manipular"],["b10","Olores, humedad, arena o filtraciones"],["b11","Luces interiores y claxon"],["b12","Maletero: rueda, gato, herramientas"]]],
  ["C","Mecánica básica","capó abierto",[["c1","Aceite motor: nivel y aspecto"],["c2","Refrigerante: nivel, color y circuito"],["c3","Líquido de frenos: nivel y color"],["c4","Líquido dirección asistida (si aplica)"],["c5","Líquido lavaparabrisas"],["c6","Batería: fecha, bornes, test de carga","Voltios"],["c7","Correa de accesorios: grietas, tensión, ruido"],["c8","Distribución: fecha / km del último cambio","Fecha · km"],["c9","Mangueras y abrazaderas"],["c10","Fugas de aceite, refrigerante o combustible"],["c11","Filtro de aire: polvo y arena (calima)"],["c12","Radiador y condensador A/C: obstruido o corroído"],["c13","Ruido y ralentí en frío"],["c14","Último mantenimiento (libro o factura)","Fecha"]]],
  ["D","Neumáticos, frenos y suspensión","",[["d1","Dibujo neumáticos (mín. legal 1,6 mm)","DI · DD · TI · TD mm"],["d2","Presión, fecha DOT, grietas, hernias","DOT más antiguo"],["d3","Desgaste irregular (alineación)"],["d4","Rueda de repuesto o kit"],["d5","Llantas: golpes o deformaciones"],["d6","Pastillas delanteras: espesor","mm"],["d7","Pastillas traseras / zapatas: espesor","mm"],["d8","Discos y tambores: rayado, bordes, alabeo"],["d9","Latiguillos y tuberías de freno"],["d10","Freno de mano: recorrido y eficacia"],["d11","Amortiguadores: fugas y rebote"],["d12","Rótulas, silentblocks, fuelles, bieletas"],["d13","Holguras en dirección y cojinetes"],["d14","Palieres y juntas: grasa o ruidos"]]],
  ["E","Diagnosis OBD","",[["e1","Equipo OBD utilizado","Equipo"],["e2","Códigos de avería activos (DTC)","Códigos"],["e3","Códigos pendientes y almacenados"],["e4","Monitores de emisiones (listos / no listos)"],["e5","Datos en vivo: temperatura, sondas, ralentí, mezcla"],["e6","Módulos: ABS, airbag, transmisión, carrocería"],["e7","Kilometraje coherente entre módulos"],["e8","Informe OBD guardado en la carpeta"]]],
  ["F","Prueba en carretera","10–15 km, ciudad y tramo rápido",[["f1","Arranque en frío y ralentí estable"],["f2","Aceleración: respuesta, tirones, humo"],["f3","Cambio / caja automática: suavidad, ruidos"],["f4","Embrague: punto de agarre, patina"],["f5","Frenada recta, sin vibración ni ruidos"],["f6","Dirección centrada, sin holguras ni vibración"],["f7","Suspensión: ruidos en baches y curvas"],["f8","Ruidos anómalos (rodamientos, transmisión)"],["f9","Temperatura de motor estable"],["f10","A/C funcionando en marcha"],["f11","Testigos encendidos durante la prueba"],["f12","Km recorridos en la prueba","km"]]],
  ["G","Documentación","obligatorio en compra o retoma",[["g1","Permiso de circulación y ficha técnica"],["g2","ITV en vigor","Caduca"],["g3","Informe DGT: titularidad, cargas, embargos"],["g4","Impuesto de circulación al corriente"],["g5","Libro de mantenimiento y facturas"],["g6","Número de llaves y mando","Llaves"],["g7","Kilometraje coherente (ITV, facturas, OBD)"]]]
];
const F2_IDS=F2_SECCIONES.flatMap(s=>s[3].map(i=>i[0]));
const F4_SECC=[
  ["A","Trabajo y seguridad",[["a1","Todos los trabajos autorizados en el presupuesto están hechos"],["a2","Puntos en ROJO de FORM-02 corregidos o rechazados por escrito"],["a3","No hay trabajos hechos sin autorización"],["a4","Recambios instalados = presupuesto = factura"],["a5","Piezas sustituidas guardadas para el cliente (si las pide)"],["a6","Pares de apriete revisados (ruedas, tren delantero, frenos)"],["a7","Sin fugas tras la reparación (revisado con motor caliente)"],["a8","Niveles de aceite, refrigerante y frenos correctos"],["a9","Presión de neumáticos según fabricante"],["a10","Testigos apagados y OBD sin averías nuevas"],["a11","Testigo de mantenimiento reiniciado (si procede)"],["a12","Prueba en carretera final sin ruidos ni vibraciones"],["a13","Luces, intermitentes, limpias, claxon y A/C funcionan"]]],
  ["B","Limpieza y presentación",[["b1","Exterior lavado: sin grasa, huellas, arena ni salitre"],["b2","Cristales limpios por dentro y por fuera"],["b3","Interior aspirado, salpicadero y plásticos limpios"],["b4","Sin grasa en volante, palanca, tapicería y moquetas"],["b5","Protectores de asiento, alfombrilla y volante retirados"],["b6","Sin olores extraños (aceite, humedad, humo)"],["b7","Ningún daño nuevo respecto al croquis de FORM-01"],["b8","Herramientas y accesorios del coche en su sitio"]]],
  ["C","Entrega al cliente",[["c1","Objetos personales devueltos a su sitio"],["c2","Km y combustible de salida anotados"],["c3","Factura desglosada preparada"],["c4","Garantía explicada y entregada por escrito"],["c5","Puntos en ÁMBAR pendientes explicados"],["c6","Cliente avisado de la hora de recogida"],["c7","Repaso del coche y factura con el cliente"],["c8","Firma de conformidad del cliente"],["c9","QR de reseñas mostrado y tarjeta entregada"]]],
  ["D","Alta para venta",[["d1","Documentación completa y verificada"],["d2","Sin cargas ni embargos (o cancelados)"],["d3","Coste total anotado (compra + taller)"],["d4","Precio de venta y margen calculados"],["d5","Fotos del anuncio con el coche limpio"],["d6","Ficha con historial para el comprador"],["d7","2 llaves y libro en la carpeta del coche"],["d8","En exposición con llave etiquetada"],["d9","Anuncio publicado (web y portales)"]]]
];
const T_RECO={reparar:"Reparar lo marcado",reservas:"Apto con reservas","no-recomendable":"No recomendable"};
const T_RES={aprobado:"Aprobado",observaciones:"Aprobado con observaciones",rechazado:"Rechazado: vuelve a taller"};
const T_ACC={crear:"Recepción creada",guardar:"Guardado",firmar:"Firmado",fichaje:"Fichaje",justificar:"Desviación justificada","visto-bueno":"Visto bueno del gerente","corregir-hora":"Hora corregida",reabrir:"Ficha reabierta","editar-cerrada":"Cambio en ficha firmada","tiempo-estimado":"Tiempo estimado cambiado","calidad-rechazo":"Calidad rechazada",cierre:"Orden cerrada"};

/* ---------- estado ---------- */
let TF=null, TW={}, TF_TAB="f1", TEQ=[], TVISTA="", TBUSQ="", TFILTRO="activas", TDIRTY=false, TSAVING=false, T_SKEW=0, TTOOL="R", TVER=0, TSAVED="";
const T_OPEN=new Set(["A"]);
const ES_EQ=()=>!!(ME&&ME.equipo);
const ES_GER=()=>!ME||ME.rol==="gerente";
const tNombre=uid=>!uid?"—":uid==="gerente"?"Gerente":(TEQ.find(p=>p.id===uid)||{}).nombre||"Persona dada de baja";
const tClone=o=>o==null?o:JSON.parse(JSON.stringify(o));
const tGet=(o,p)=>p.split(".").reduce((a,k)=>a==null?a:a[k],o);
function tSet(o,p,v){ const k=p.split("."); let a=o; for(let i=0;i<k.length-1;i++){ if(a[k[i]]==null||typeof a[k[i]]!=="object") a[k[i]]={}; a=a[k[i]]; } a[k[k.length-1]]=v; }
const tApi=(ruta,method="GET",body)=>api("/api/taller/"+ruta,method==="GET"?{}:{method,headers:{"content-type":"application/json"},body:JSON.stringify(body||{})});
const tAhora=()=>Date.now()+T_SKEW;
const tHora=iso=>iso?new Date(iso).toLocaleTimeString("es-ES",{hour:"2-digit",minute:"2-digit",timeZone:"Atlantic/Canary"}):"";
const tFH=iso=>iso?new Date(iso).toLocaleString("es-ES",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"Atlantic/Canary"}):"";
const tF=d=>d?d.split("-").reverse().join("/"):"";
const tHms=ms=>{ const s=Math.max(0,Math.floor(ms/1000)); return String(Math.floor(s/3600)).padStart(2,"0")+":"+String(Math.floor(s/60)%60).padStart(2,"0")+":"+String(s%60).padStart(2,"0"); };
const tMin=m=>{ m=Math.round(m||0); const a=Math.abs(m), h=Math.floor(a/60), r=a%60; return (m<0?"−":"")+(h?h+" h"+(r?" "+r+" min":""):r+" min"); };
const tH=m=>String(Math.round((m||0)/6)/10).replace(".",",")+" h";
const tPct=v=>v==null?"—":(v>0?"+":"")+String(v).replace(".",",")+" %";
const tNum=v=>{ const n=Number(String(v??"").replace(/\s/g,"").replace(",",".")); return Number.isFinite(n)?n:0; };

/* ---------- tiempos (misma cuenta que el servidor) ---------- */
function tTramos(ev,ahora=tAhora()){
  const out=[]; let ab=null;
  for(const e of [...ev].sort((a,b)=>a.t.localeCompare(b.t))){ const t=Date.parse(e.t);
    if(ab) out.push({ini:ab.t,fin:t,trabajo:ab.trabajo,motivo:ab.motivo,por:ab.por});
    ab=e.tipo==="inicio"||e.tipo==="reanudar"?{t,trabajo:true,motivo:"",por:e.por}:e.tipo==="pausa"?{t,trabajo:false,motivo:e.motivo||"Otro",por:e.por}:null; }
  if(ab) out.push({ini:ab.t,fin:ahora,trabajo:ab.trabajo,motivo:ab.motivo,por:ab.por});
  return out.filter(x=>x.fin>x.ini);
}
const tEstado=ev=>{ const u=[...ev].sort((a,b)=>a.t.localeCompare(b.t)).pop(); return !u?"sin":u.tipo==="pausa"?"pausa":u.tipo==="fin"?"fin":"trabajando"; };
function tCalc(f3,cfg){
  if(!f3) return null; const tr=tTramos(f3.eventos);
  const netoMs=tr.filter(x=>x.trabajo).reduce((a,x)=>a+x.fin-x.ini,0), pausaMs=tr.filter(x=>!x.trabajo).reduce((a,x)=>a+x.fin-x.ini,0);
  const netoMin=Math.round(netoMs/6e4), pausasMin=Math.round(pausaMs/6e4), est=f3.estMin||0;
  const desvMin=est?netoMin-est:0, desvPct=est?Math.round((netoMin-est)/est*1000)/10:0, estado=tEstado(f3.eventos);
  const exige=estado==="fin"&&est>0&&(desvPct>cfg.umbralPct||desvMin>cfg.umbralMin), tarifa=f3.tarifa||cfg.tarifa;
  const pausas={}; tr.filter(x=>!x.trabajo).forEach(x=>pausas[x.motivo]=(pausas[x.motivo]||0)+(x.fin-x.ini)/6e4);
  return {netoMs,pausaMs,netoMin,pausasMin,totalMin:netoMin+pausasMin,desvMin,desvPct,estado,exige,justificada:!!f3.justificacion,aprobada:!!f3.vistoBueno,tarifa,manoObra:Math.round(netoMin/60*tarifa*100)/100,pausas};
}
function tResF2(f2){ let r=0,a=0,ok=0,na=0,h=0; if(f2) for(const id of F2_IDS){ const e=f2.items?.[id]?.e; if(e) h++; if(e==="r") r++; if(e==="a") a++; if(e==="ok") ok++; if(e==="na") na++; } return {rojos:r,ambar:a,ok,na,hechos:h,total:F2_IDS.length}; }

/* ---------- modo equipo (usuario + PIN: solo ve el taller) ---------- */
async function entrarEquipo(d){
  ME={rol:d.rol,nombre:d.nombre,uid:d.uid,equipo:true,caja:!!d.caja};
  try{ sessionStorage.setItem("vc_me",JSON.stringify(ME)); }catch(_){}
  document.body.classList.add("modo-equipo"); document.body.classList.toggle("con-caja",!!ME.caja); tUsuario(); if(ME.rol==="gerente") setTimeout(()=>cjVigilar(),1200);
  TVISTA=TVISTA||"mios";
  await Promise.all([tCargarEquipo(), api("/api/ordenes").then(r=>{ ORDENES=r; }).catch(()=>{})]);
  let abierta=""; try{ abierta=sessionStorage.getItem("vc_tf")||""; }catch(_){}
  if(abierta&&location.hash==="#fichas") abrirFichas(abierta); else abrirTab(location.hash==="#caja"&&ME.caja?"caja":location.hash==="#inventario"?"alm":"ordenes",false);
}
function tUsuario(){
  let el=$("#t-yo"); if(!el){ el=document.createElement("span"); el.id="t-yo"; el.className="t-yo"; $("#topacts").prepend(el); }
  el.hidden=!ME; if(ME) el.innerHTML=`<i>${esc((ME.nombre||"?").slice(0,1).toUpperCase())}</i><span><b>${esc(ME.nombre)}</b><small>${esc(T_ROL[ME.rol]||ME.rol)}</small></span>`;
}
async function tCargarEquipo(){ try{ TEQ=await tApi("equipo"); }catch(_){ } }
async function tallerTick(){ // refresco del equipo (no llama a nada del gerente)
  try{ const r=await api("/api/ordenes"); vivoOk=true; ultimo=Date.now();
    const sig=JSON.stringify(r); if(sig!==sigLeads){ sigLeads=sig; ORDENES=r; const foco=document.activeElement; if(!(foco&&foco.matches&&foco.matches("#t-busq"))) renderOrdenes(); } }
  catch(_){ vivoOk=false; }
  pintarVivo();
}

/* ---------- pestaña Taller: tabla, tablero y mis trabajos ---------- */
const _kanbanOrdenes=renderOrdenes;
function tFichasChips(o){
  const f=o.fichas||{}, c=(n,cls,tip)=>`<span class="t-fb ${cls}" title="${esc(tip)}">${n}</span>`;
  const f1=f.f1?f.f1.cerrada?c("01","ok","FORM-01 firmada por el cliente"):c("01","curso","FORM-01 sin firmar"):c("01","","FORM-01 sin empezar");
  const f2=f.f2?f.f2.cerrada?c("02",f.f2.rojos?"rojo":f.f2.ambar?"ambar":"ok",`FORM-02 firmada: ${f.f2.rojos} rojos, ${f.f2.ambar} ámbar`):c("02","curso",`FORM-02 en curso (${f.f2.hechos}/${f.f2.total})`):c("02","","FORM-02 sin empezar");
  const e3=f.f3&&f.f3.estado, f3=!f.f3||e3==="sin"?c("03","","FORM-03 sin fichajes"):e3==="fin"?c("03",f.f3.exige&&!f.f3.aprobada?"rojo":"ok",`FORM-03 terminado · ${tPct(f.f3.desvPct)}`):c("03","vivo",e3==="pausa"?"FORM-03 en pausa":"FORM-03 trabajando ahora");
  const f4=!f.f4||!f.f4.firmada?c("04","","FORM-04 pendiente"):f.f4.resultado==="rechazado"?c("04","rojo","FORM-04 rechazado: vuelve a taller"):c("04",f.f4.cierre?"ok cerr":"ok","FORM-04 "+(T_RES[f.f4.resultado]||"").toLowerCase());
  return `<span class="t-fbs">${f1}${f2}${f3}${f4}</span>`;
}
function tPipe(o,mini){ const i=tFase(o.estado);
  return `<span class="t-pipe ${mini?"mini":""}" title="${esc(PASO_TXT[o.estado]||o.estado)}">${T_FASES.map((f,k)=>`<i class="${k<i?"hecho":k===i?"act":""}"></i>`).join("")}<b>${esc(T_FASES[i][1])}</b>${T_SUB[o.estado]?`<small>${esc(T_SUB[o.estado])}</small>`:""}</span>`; }
function tTiempo(o){ const f3=o.fichas&&o.fichas.f3; if(!f3||f3.estado==="sin") return f3&&f3.estMin?`<small class="t-mut">Est. ${tH(f3.estMin)}</small>`:'<small class="t-mut">—</small>';
  const vivo=f3.estado==="trabajando"?Math.round((tAhora()-Date.parse(f3.desde))/6e4):0, neto=f3.netoMin+Math.max(0,vivo);
  const pct=f3.estMin?Math.round((neto-f3.estMin)/f3.estMin*1000)/10:null, mal=f3.estado==="fin"&&f3.exige;
  return `<span class="t-tm"><b class="num">${tH(neto)}</b>${f3.estMin?`<small>de ${tH(f3.estMin)}</small>`:""}${pct!=null?`<em class="${mal?"mal":pct>0?"sube":"baja"}">${tPct(pct)}</em>`:""}</span>`; }
function tAlertasLocal(){
  return ORDENES.filter(o=>o.estado!=="entregado").flatMap(o=>{ const f=o.fichas||{}, out=[], coche=[o.vehiculo.coche,(o.vehiculo.matricula||"").toUpperCase()].filter(Boolean).join(" · ");
    if(f.f2&&f.f2.rojos>0&&!f.f2.rechazoFirmado&&!(o.presupuesto&&o.presupuesto.estado==="aceptado")) out.push({nivel:"rojo",token:o.token,tab:"f2",txt:`${coche}: ${f.f2.rojos} punto${f.f2.rojos>1?"s":""} en ROJO sin presupuesto aceptado`});
    if(f.f3&&f.f3.exige&&!f.f3.justificada) out.push({nivel:"rojo",token:o.token,tab:"f3",txt:`${coche}: desviación de ${tPct(f.f3.desvPct)} sin justificar`});
    else if(f.f3&&f.f3.exige&&!f.f3.aprobada) out.push({nivel:"ambar",token:o.token,tab:"f3",txt:`${coche}: falta el visto bueno del gerente a los tiempos`});
    if(o.estado==="calidad"&&!(f.f4&&f.f4.firmada&&f.f4.resultado!=="rechazado")) out.push({nivel:"ambar",token:o.token,tab:"f4",txt:`${coche}: terminado, pendiente de control de calidad`});
    return out; });
}
function tFiltrar(){
  const q=TBUSQ.trim().toLowerCase().replace(/\s+/g," "), qm=q.replace(/[\s-]/g,"");
  return ORDENES.filter(o=>{
    if(TFILTRO==="activas"&&o.estado==="entregado") return false;
    if(TFILTRO&&TFILTRO!=="activas"&&TFILTRO!=="todas"&&T_FASES[tFase(o.estado)][0]!==TFILTRO) return false;
    if(!q) return true;
    const mat=(o.vehiculo.matricula||"").toLowerCase().replace(/[\s-]/g,"");
    return (qm&&mat.includes(qm))||(o.num||"").toLowerCase().includes(q)||(o.cliente.nombre||"").toLowerCase().includes(q)||(o.vehiculo.coche||"").toLowerCase().includes(q)||(o.cliente.telefono||"").replace(/\D/g,"").includes(q.replace(/\D/g,"")||"#");
  }).sort((a,b)=>(b.num||"").localeCompare(a.num||"")||b.creado.localeCompare(a.creado));
}
function tBarra(){
  const n=k=>ORDENES.filter(o=>T_FASES[tFase(o.estado)][0]===k).length, al=tAlertasLocal();
  const vistas=[["mios",ES_EQ()?"Mis trabajos":"En marcha"],["tabla","Órdenes"],["tablero","Tablero"]];
  return `<div class="t-bar">
    <div class="segv" role="group" aria-label="Vista">${vistas.map(([k,t])=>`<button type="button" data-tvista="${k}" aria-pressed="${TVISTA===k}">${t}</button>`).join("")}</div>
    <input class="in" id="t-busq" type="search" placeholder="Buscar matrícula, cliente o Nº de orden" value="${esc(TBUSQ)}" aria-label="Buscar orden">
    <div class="t-bar-acts">${ES_GER()?`<button type="button" class="btn b-ghost b-sm" data-tequipo>Equipo y ajustes</button>`:""}${TVISTA==="tabla"&&ES_GER()?`<button type="button" class="btn b-ghost b-sm" data-tcsv>Excel</button>`:""}<button type="button" class="btn b-acc b-sm" data-tnueva>+ Nueva recepción</button></div>
  </div>
  ${TVISTA==="tabla"?`<div class="t-filtros" role="group" aria-label="Estado">${[["activas","En el taller"],...T_FASES.map(f=>[f[0],f[1]]),["todas","Todas"]].map(([k,t])=>`<button type="button" class="chipb" data-tfiltro="${k}" aria-pressed="${TFILTRO===k}">${t}${T_FASES.some(f=>f[0]===k)?` <b class="num">${n(k)}</b>`:""}</button>`).join("")}</div>`:""}
  ${al.length?`<div class="t-alertas"><b>${al.length} aviso${al.length>1?"s":""}</b>${al.slice(0,4).map(a=>`<button type="button" class="t-al ${a.nivel}" data-tabrir="${a.token}" data-ttab="${a.tab}">${esc(a.txt)}</button>`).join("")}${al.length>4?`<small>y ${al.length-4} más en el Dashboard</small>`:""}</div>`:""}`;
}
function tTabla(){
  const xs=tFiltrar();
  if(!xs.length) return `<div class="empty">${TBUSQ?"Ninguna orden coincide con la búsqueda.":"No hay órdenes en este estado."}</div>`;
  return `<div class="t-tabla-wrap"><table class="t-tabla"><thead><tr><th>Orden</th><th>Coche y cliente</th><th>Estado</th><th>Fichas</th><th class="n">Tiempo</th><th></th></tr></thead><tbody>${xs.map(o=>`
    <tr data-tabrir="${o.token}" tabindex="0">
      <td data-l="Orden"><b class="num">${esc(o.num||"Sin nº")}</b><small>${esc(fecha((o.creado||"").slice(0,10)))}</small></td>
      <td data-l="Coche"><span class="mat">${esc((o.vehiculo.matricula||"—").toUpperCase())}</span> <b>${esc(o.vehiculo.coche||"Coche")}</b><small>${esc(o.cliente.nombre)}</small></td>
      <td data-l="Estado">${tPipe(o,true)}</td>
      <td data-l="Fichas">${tFichasChips(o)}</td>
      <td data-l="Tiempo" class="n">${tTiempo(o)}</td>
      <td class="t-acc"><button type="button" class="btn b-brand b-sm" data-tabrir="${o.token}">Fichas</button><button type="button" class="btn b-ghost b-sm" data-tpdf="${o.token}" aria-label="PDF de la orden ${esc(o.num||"")}">PDF</button></td>
    </tr>`).join("")}</tbody></table></div>`;
}
function tTarjeta(o,tab,extra=""){ return `<button type="button" class="t-card-o" data-tabrir="${o.token}" data-ttab="${tab}"><span class="mat">${esc((o.vehiculo.matricula||"—").toUpperCase())}</span><b>${esc(o.vehiculo.coche||"Coche")}</b><small>${esc(o.num||"")} · ${esc(o.cliente.nombre)}</small>${extra}${tFichasChips(o)}</button>`; }
function tMios(){
  const vivas=ORDENES.filter(o=>o.estado!=="entregado"), f=o=>o.fichas||{}, uid=ME&&ME.uid, rol=ME?ME.rol:"gerente";
  const marcha=vivas.filter(o=>f(o).f3&&["trabajando","pausa"].includes(f(o).f3.estado)&&(ES_GER()||f(o).f3.mecanico===uid));
  const asign=vivas.filter(o=>!marcha.includes(o)&&f(o).f3&&f(o).f3.mecanico===uid&&f(o).f3.estado!=="fin"||o.estado==="reparacion"&&f(o).f3&&f(o).f3.mecanico===uid&&f(o).f3.estado==="fin"&&f(o).f4&&f(o).f4.resultado==="rechazado");
  const insp=vivas.filter(o=>["recibido","diagnostico"].includes(o.estado)&&!(f(o).f2&&f(o).f2.cerrada));
  const sinAsignar=vivas.filter(o=>!marcha.includes(o)&&!asign.includes(o)&&(o.estado==="reparacion"||o.estado==="presupuesto"&&o.presupuesto&&o.presupuesto.estado==="aceptado")&&!(f(o).f3&&f(o).f3.mecanico));
  const cal=vivas.filter(o=>o.estado==="calidad"&&!(f(o).f3&&f(o).f3.mecanico===uid));
  const rec=vivas.filter(o=>f(o).f1&&!f(o).f1.cerrada||!f(o).f1);
  const listos=vivas.filter(o=>o.estado==="listo");
  const bloque=(t,sub,xs,tab,vacio)=>`<section class="t-mbloque"><h3>${t} <span class="num">${xs.length}</span></h3>${sub?`<p class="hint">${sub}</p>`:""}${xs.length?`<div class="t-mgrid">${xs.map(o=>tTarjeta(o,typeof tab==="function"?tab(o):tab)).join("")}</div>`:`<p class="t-vacio">${vacio}</p>`}</section>`;
  const ahora=marcha.map(o=>{ const x=f(o).f3, vivo=x.estado==="trabajando"?Math.max(0,tAhora()-Date.parse(x.desde)):0;
    return `<button type="button" class="t-ahora ${x.estado}" data-tabrir="${o.token}" data-ttab="f3"><span class="t-dot"></span><span><small>${x.estado==="pausa"?"En pausa":"Trabajando ahora"}${ES_GER()?" · "+esc(tNombre(x.mecanico)):""}</small><b>${esc(o.vehiculo.coche||"Coche")} <span class="mat">${esc((o.vehiculo.matricula||"").toUpperCase())}</span></b></span><b class="num t-reloj" data-treloj-o="${x.netoMin*6e4}" data-tdesde="${x.estado==="trabajando"?esc(x.desde):""}">${tHms(x.netoMin*6e4+vivo)}</b></button>`; }).join("");
  let h=ahora?`<div class="t-ahoras">${ahora}</div>`:"";
  if(rol==="recepcion") h+=bloque("Recepciones sin firmar","Termina la ficha de entrada y que firme el cliente.",rec,"f1","Todo firmado.")+bloque("Listos para entregar","",listos,"f4","Ninguno ahora.");
  else if(rol==="calidad") h+=bloque("Pendientes de control de calidad","Revisa y firma FORM-04. Nunca un coche que hayas reparado tú.",cal,"f4","Nada pendiente.")+bloque("Por inspeccionar","",insp,"f2","Nada pendiente.");
  else { if(!ES_GER()) h+=bloque("Asignados a mí","Pulsa para fichar el inicio, las pausas y el final.",asign,"f3","No tienes trabajos asignados.");
    h+=bloque("Por inspeccionar (FORM-02)","Coches recibidos que esperan la inspección 360°.",insp,"f2","Nada pendiente.")+bloque("Aprobados sin mecánico","El cliente ya ha dicho que sí: asigna o empieza el trabajo.",sinAsignar,"f3","Ninguno.")+bloque("Control de calidad (FORM-04)",ES_GER()?"":"Solo coches que NO has reparado tú.",cal,"f4","Nada pendiente.");
    if(ES_GER()) h+=bloque("Recepciones sin firmar","",rec,"f1","Todo firmado."); }
  return h;
}
renderOrdenes=function(){
  if(!$("#ordenes")) return;
  if(!TVISTA) TVISTA=ES_EQ()?"mios":"tabla";
  const foco=document.activeElement, enBusq=foco&&foco.id==="t-busq", pos=enBusq?foco.selectionStart:0;
  $("#t-barra").innerHTML=tBarra();
  if(enBusq){ const b=$("#t-busq"); b.focus(); try{ b.setSelectionRange(pos,pos); }catch(_){} }
  if(TVISTA==="tablero") return _kanbanOrdenes();
  if(!ORDENES.length){ $("#ordenes").innerHTML='<div class="empty"><b style="color:var(--ink)">No hay coches en el taller.</b><br>Pulsa «+ Nueva recepción» cuando entre un coche: se crea la orden con su Nº y la ficha de recepción (FORM-01).</div>'; return; }
  $("#ordenes").innerHTML=TVISTA==="mios"?tMios():tTabla();
};
function tCabeceraTaller(){ const p=$("#s-ordenes .head p"); if(p) p.textContent=ES_EQ()?`Hola, ${ME.nombre}. Aquí tienes los coches del taller y tus trabajos.`:"Cada coche que entra lleva su orden (VC-año-número) con las 4 fichas del manual SOP-01: recepción, inspección 360°, tiempos y calidad."; }
document.addEventListener("click",async e=>{
  const t=e.target;
  const v=t.closest("[data-tvista]"); if(v){ TVISTA=v.dataset.tvista; renderOrdenes(); return; }
  const fl=t.closest("[data-tfiltro]"); if(fl){ TFILTRO=fl.dataset.tfiltro; renderOrdenes(); return; }
  const pd=t.closest("[data-tpdf]"); if(pd){ e.stopPropagation(); tPdfOrden(pd.dataset.tpdf); return; }
  const ab=t.closest("[data-tabrir]"); if(ab&&!t.closest("#tf")){ if(!$("#drawer").hidden) cerrarDrawer(); abrirFichas(ab.dataset.tabrir,ab.dataset.ttab||""); return; }
  if(t.closest("[data-tnueva]")){ tNuevaRecepcion(); return; }
  if(t.closest("[data-tcsv]")){ tCsv(); return; }
  if(t.closest("[data-tequipo]")){ tAbrirEquipo(); return; }
});
document.addEventListener("keydown",e=>{ if(e.key==="Enter"&&e.target.matches&&e.target.matches("tr[data-tabrir]")) abrirFichas(e.target.dataset.tabrir); });
document.addEventListener("input",e=>{ if(e.target.id==="t-busq"){ TBUSQ=e.target.value; if(TVISTA==="mios"&&TBUSQ) TVISTA="tabla"; renderOrdenes(); } });
function tCsv(){
  const filas=[["Nº orden","Entrada","Matrícula","Coche","Cliente","Teléfono","Estado","FORM-01","Rojos","Ámbar","Mecánico","Estimado (min)","Neto (min)","Desviación %","Calidad"]];
  for(const o of tFiltrar()){ const f=o.fichas||{};
    filas.push([o.num||"",(o.creado||"").slice(0,10),o.vehiculo.matricula||"",o.vehiculo.coche||"",o.cliente.nombre,o.cliente.telefono,PASO_TXT[o.estado]||o.estado,f.f1?f.f1.cerrada?"Firmada":"Sin firmar":"",f.f2?f.f2.rojos:"",f.f2?f.f2.ambar:"",f.f3?tNombre(f.f3.mecanico):"",f.f3?f.f3.estMin:"",f.f3?f.f3.netoMin:"",f.f3&&f.f3.estMin?String(f.f3.desvPct).replace(".",","):"",f.f4&&f.f4.firmada?T_RES[f.f4.resultado]||"":""]); }
  const csv="﻿"+filas.map(r=>r.map(x=>{ let v=String(x??""); if(/^[=+\-@\t\r]/.test(v)&&!/^-?\d/.test(v)) v="'"+v; return `"${v.replace(/"/g,'""')}"`; }).join(";")).join("\r\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})); a.download=`volcano-cars-ordenes-${hoyC()}.csv`; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); },500);
}

/* ---------- nueva recepción ---------- */
function tNuevaRecepcion(){
  let d=$("#dlg-rec");
  if(!d){ d=document.createElement("dialog"); d.id="dlg-rec"; d.className="t-dlg"; document.body.appendChild(d); }
  const cand=ES_EQ()?[]:LEADS.filter(x=>x.tipo==="taller"&&!x.orden&&x.estado!=="perdida").slice(0,40);
  d.innerHTML=`<form method="dialog" id="f-rec"><h2>Nueva recepción</h2><p class="hint">Se crea la orden con su número y se abre la ficha de recepción (FORM-01) para completarla con el cliente delante.</p>
    ${cand.length?`<div class="field"><label for="rc-lead">¿Viene de una cita o solicitud del CRM?</label><select class="in" id="rc-lead"><option value="">No, cliente nuevo</option>${cand.map(x=>`<option value="${esc(x.id)}">${esc(x.nombre)} · ${esc(queEs(x))}${x.cita?" · cita "+esc(fecha(x.cita.fecha)):""}</option>`).join("")}</select></div>`:""}
    <div id="rc-man" class="t-g2"><div class="field"><label for="rc-nom">Nombre del cliente *</label><input class="in" id="rc-nom" maxlength="80" autocomplete="off"></div><div class="field"><label for="rc-tel">Teléfono</label><input class="in num" id="rc-tel" inputmode="tel" maxlength="30" autocomplete="off"></div>
    <div class="field"><label for="rc-mat">Matrícula *</label><input class="in t-matin" id="rc-mat" maxlength="12" autocomplete="off" placeholder="1234 ABC"></div><div class="field"><label for="rc-coche">Marca y modelo</label><input class="in" id="rc-coche" maxlength="80" list="marcas" autocomplete="off"></div></div>
    <div class="field"><label>Tipo de entrada</label><div class="t-seg" id="rc-tipo">${[["reparacion","Reparación"],["compra","Compra"],["retoma","Retoma"]].map(([k,t],i)=>`<button type="button" data-v="${k}" aria-pressed="${!i}">${t}</button>`).join("")}</div></div>
    <div class="msg bad" id="rc-err" hidden></div>
    <div class="t-dlg-acts"><button type="button" class="btn b-ghost" data-rc-cancel>Cancelar</button><button type="submit" class="btn b-acc" id="rc-ok">Crear y abrir FORM-01</button></div></form>`;
  const lead=$("#rc-lead"); if(lead) lead.onchange=()=>{ $("#rc-man").hidden=!!lead.value; };
  $("#rc-tipo").onclick=e=>{ const b=e.target.closest("[data-v]"); if(!b) return; $("#rc-tipo").querySelectorAll("button").forEach(x=>x.setAttribute("aria-pressed",String(x===b))); };
  d.querySelector("[data-rc-cancel]").onclick=()=>d.close();
  $("#f-rec").onsubmit=async ev=>{ ev.preventDefault(); const btn=$("#rc-ok"); btn.disabled=true; $("#rc-err").hidden=true;
    const tipo=$("#rc-tipo [aria-pressed=true]").dataset.v;
    try{
      let token;
      if(lead&&lead.value){ const o=await api("/api/ordenes",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({lead:lead.value})}); ORDENES.unshift(o); token=o.token; loadLeads(false); }
      else { const r=await tApi("recepcion","POST",{cliente:{nombre:$("#rc-nom").value,telefono:$("#rc-tel").value},vehiculo:{matricula:$("#rc-mat").value,marcaModelo:$("#rc-coche").value},tipoEntrada:tipo,recibidoPor:ME?ME.nombre:""}); ORDENES.unshift(r.orden); token=r.orden.token; }
      d.close(); await abrirFichas(token,"f1"); if(TW.f1&&!TW.f1.tipoEntrada){ TW.f1.tipoEntrada=tipo; tMarcar(); }
      toast("Orden creada: completa la ficha de recepción");
    }catch(err){ $("#rc-err").textContent=err.message; $("#rc-err").hidden=false; }
    btn.disabled=false; };
  d.showModal(); setTimeout(()=>($("#rc-lead")||$("#rc-nom")).focus(),30);
}

/* =====================================================================
   FICHAS DE UNA ORDEN
   ===================================================================== */
function tVacias(){
  const o=TF.orden, f=TF.fichas;
  const f1=tClone(f.f1)||{fecha:"",hora:"",cliente:{nombre:o.cliente.nombre||"",doc:"",telefono:o.cliente.telefono||"",email:o.cliente.email||"",titular:"",contacto:"whatsapp"},recibidoPor:ME?ME.nombre:"",entregaPrometida:o.entrega||"",tipoEntrada:"",
    vehiculo:{matricula:o.vehiculo.matricula||"",marcaModelo:o.vehiculo.coche||"",vin:"",anioColor:"",km:o.vehiculo.km||"",kmFoto:"",itv:"",combustible:"",nivel:"",testigos:""},motivo:"",inventario:{},llaves:"",danos:[],fotosDanos:[],sinDanos:false,autorizoHasta:"",avisosWhatsApp:true,firmaCliente:"",firmadoCliente:"",firmaTaller:null,cerrada:false};
  const f2=tClone(f.f2)||{mecanico:"",items:{},horasEst:0,recomendacion:"",rechazoFirmado:false,firma:null,cerrada:false,inicio:""};
  const f3=tClone(f.f3)||{mecanico:"",tarifa:TF.config.tarifa,estMin:0,tipo:"reparacion",hoja:"1 de 1",eventos:[],justificacion:null,vistoBueno:null,retrabajos:[]};
  let f4=tClone(f.f4)||{destino:f1.tipoEntrada==="compra"||f1.tipoEntrada==="retoma"?"venta":"cliente",items:{},notas:{},resultado:"",motivo:"",firma:null,cierreGerente:null,intentos:0};
  if(f4.firma&&f4.resultado==="rechazado"&&tNuevoIntento()){ f4={...f4,firma:null,resultado:"",motivo:""}; for(const k in f4.items) if(f4.items[k]==="no") f4.items[k]=""; }
  TW={f1,f2,f3,f4,j:TW.j&&TW.j.token===TF.orden.token?TW.j:{token:TF.orden.token,codigos:[],explicacion:"",avisado:"",mejora:""}};
}
function tNuevoIntento(){ const f=TF.fichas; if(!(f.f4&&f.f4.firma&&f.f4.resultado==="rechazado")) return false;
  const fin=(f.f3?f.f3.eventos:[]).filter(e=>e.tipo==="fin").map(e=>e.t).sort().pop()||""; return fin>f.f4.firma.t; }
function tRecibir(r){ TF=r; if(r.ahora) T_SKEW=Date.parse(r.ahora)-Date.now(); const i=ORDENES.findIndex(o=>o.token===r.orden.token); if(i>=0) ORDENES[i]={...ORDENES[i],...r.orden}; else ORDENES.unshift(r.orden); }
async function abrirFichas(token,tab){
  if(TDIRTY&&TF&&TF.orden.token!==token) await tGuardar(false,true);
  show("s-ficha"); $("#tf").innerHTML='<div class="empty">Cargando las fichas…</div>';
  try{ const [r]=await Promise.all([tApi("fichas/"+token),TEQ.length?null:tCargarEquipo(),typeof alCargarOrden==="function"?alCargarOrden(token):null]); tRecibir(r); }
  catch(err){ $("#tf").innerHTML=`<div class="empty">${esc(err.message)}<br><br><button type="button" class="btn b-ghost b-sm" data-tvolver>← Volver al taller</button></div>`; return; }
  TDIRTY=false; TSAVED=""; tVacias();
  TF_TAB=tab||tTabSugerida();
  try{ sessionStorage.setItem("vc_tf",token); }catch(_){}
  history.replaceState(null,"","#fichas");
  tRender();
}
function tTabSugerida(){ const f=TF.fichas, e=tEstado(f.f3?f.f3.eventos:[]);
  if(!f.f1||!f.f1.cerrada) return "f1"; if(!f.f2||!f.f2.cerrada) return "f2"; if(e!=="fin"||(f.f4&&f.f4.resultado==="rechazado"&&!tNuevoIntento())) return "f3"; return "f4"; }
function tEstadoFicha(k){ const f=TF.fichas;
  if(k==="f1") return !f.f1?["","Sin empezar"]:f.f1.cerrada?["ok","Firmada"]:["curso","Sin firmar"];
  if(k==="f2"){ if(!f.f2) return ["","Sin empezar"]; const r=tResF2(f.f2); return f.f2.cerrada?[r.rojos?"rojo":r.ambar?"ambar":"ok",`${r.rojos} R · ${r.ambar} Á`]:["curso",`${r.hechos}/${r.total}`]; }
  if(k==="f3"){ const c=tCalc(f.f3,TF.config); if(!c||c.estado==="sin") return ["","Sin fichajes"]; if(c.estado!=="fin") return ["vivo",c.estado==="pausa"?"En pausa":"Trabajando"]; return c.exige&&!c.aprobada?["rojo",tPct(c.desvPct)]:["ok",tPct(c.desvPct)]; }
  if(k==="f4"){ if(!f.f4||!f.f4.firma) return ["","Pendiente"]; return f.f4.resultado==="rechazado"?["rojo","Rechazado"]:["ok",f.f4.cierreGerente?"Cerrada":"Aprobado"]; }
  return ["",String(f.audit.length)];
}
function tCabecera(){
  const o=TF.orden, f=TF.fichas, i=tFase(o.estado);
  const tabs=[["f1","FORM-01","Recepción"],["f2","FORM-02","Inspección 360°"],["f3","FORM-03","Tiempos"],["f4","FORM-04","Calidad"],["audit","","Auditoría"]];
  return `<div class="t-fhead">
    <button type="button" class="btn b-ghost b-sm" data-tvolver>← Taller</button>
    <div class="t-fid"><small>Orden</small><b class="num">${esc(f.num||"—")}</b></div>
    <div class="t-fcar"><span class="mat">${esc((o.vehiculo.matricula||"—").toUpperCase())}</span><b>${esc(o.vehiculo.coche||"Coche")}</b><small>${esc(o.cliente.nombre)}${o.cliente.telefono?" · "+esc(o.cliente.telefono):""}</small></div>
    <div class="t-facts"><button type="button" class="btn b-ghost b-sm" data-tprint="uno">Imprimir esta ficha</button><button type="button" class="btn b-brand b-sm" data-tprint="todas">PDF de la orden</button>${ES_GER()&&!ES_EQ()?`<button type="button" class="btn b-ghost b-sm" data-tdrawer>Presupuesto y cliente</button>`:""}</div>
  </div>
  <ol class="t-fases">${T_FASES.map((x,k)=>`<li class="${k<i?"hecho":k===i?"act":""}"><i>${k<i?"✓":k+1}</i><span>${x[1]}${k===i&&T_SUB[o.estado]?`<small>${T_SUB[o.estado]}</small>`:""}</span></li>`).join("")}</ol>
  <nav class="t-tabs" role="tablist">${tabs.map(([k,n,t])=>{ const [c,s]=tEstadoFicha(k); return `<button type="button" role="tab" data-ttabb="${k}" aria-selected="${TF_TAB===k}">${n?`<small>${n}</small>`:""}<b>${t}</b><em class="t-st ${c}">${esc(s)}</em></button>`; }).join("")}</nav>`;
}
function tRender(){
  $("#tf").innerHTML=`<div id="tf-head">${tCabecera()}</div><div id="tf-body"></div><div class="t-save" id="tf-save" hidden></div>`;
  tRenderBody();
}
function tRenderHead(){ const h=$("#tf-head"); if(h) h.innerHTML=tCabecera(); }
function tRenderBody(keep){
  const b=$("#tf-body"); if(!b) return; const y=scrollY;
  b.innerHTML=({f1:tF1,f2:tF2,f3:tF3,f4:tF4,audit:tAud}[TF_TAB]||tF1)();
  if(keep) scrollTo(0,y);
  tFirmaInit(); tReloj(); tSaveBar();
}
function tMarcar(){ TDIRTY=TF_TAB; TVER++; tSaveBar(); clearTimeout(tMarcar.t); tMarcar.t=setTimeout(()=>{ if(TDIRTY&&!TSAVING) tGuardar(false,true); },2500); }
function tEditable(k){ const f=TF.fichas;
  if(k==="f1") return !(f.f1&&f.f1.cerrada);
  if(k==="f2") return !(f.f2&&f.f2.cerrada)&&(ES_GER()||ME.rol!=="recepcion");
  if(k==="f4") return tPuedeF4()[0];
  return true; }
function tSaveBar(){ const s=$("#tf-save"); if(!s) return; const k=TF_TAB;
  if(!["f1","f2","f4"].includes(k)||!tEditable(k)){ s.hidden=true; return; }
  s.hidden=false;
  const cerrar={f1:"Firmar y cerrar la recepción",f2:"Firmar la inspección",f4:"Firmar el control de calidad"}[k];
  s.innerHTML=`<span class="t-sv ${TDIRTY?"pend":""}">${TSAVING?"Guardando…":TDIRTY?"Cambios sin guardar":TSAVED?"Guardado a las "+TSAVED:"Se guarda solo mientras escribes"}</span><button type="button" class="btn b-ghost b-sm" data-tguardar>Guardar</button><button type="button" class="btn b-acc b-sm" data-tcerrar>${cerrar}</button>`;
}
async function tGuardar(cerrar,quieto){
  const cual=cerrar?TF_TAB:(TDIRTY||(quieto?null:TF_TAB)); if(!["f1","f2","f4"].includes(cual)){ TDIRTY=false; return; }
  if(!tEditable(cual)){ TDIRTY=false; return; }
  const body=tClone(TW[cual]); if(cerrar) body.cerrar=true;
  if(cual==="f1"&&cerrar){ const falta=tFaltaF1(); if(falta.length){ tFaltan(falta); return; } }
  if(cual==="f2"&&cerrar){ const falta=tFaltaF2(); if(falta.length){ tFaltan(falta); return; } }
  TSAVING=true; tSaveBar(); const ver=TVER, token=TF.orden.token;
  try{ const r=await tApi(`fichas/${token}/${cual}`,"PUT",body);
    if(!TF||TF.orden.token!==token) return;
    tRecibir(r); TSAVED=tHora(new Date().toISOString());
    if(TVER===ver){ TDIRTY=false; }
    if(cerrar){ TDIRTY=false; tVacias(); tRenderHead(); tRenderBody(); toast(cual==="f1"?"Recepción firmada y cerrada":cual==="f2"?"Inspección firmada. El tiempo estimado ya está en FORM-03":TF.fichas.f4&&TF.fichas.f4.resultado==="rechazado"?"Rechazado: el coche vuelve a taller":"Control de calidad firmado"); scrollTo(0,0); }
    else { if(TVER===ver) TW[cual]=Object.assign(tClone(TF.fichas[cual]),cual==="f4"?{firma:null}:{}); tRenderHead(); }
  }catch(err){ toast(err.message); if(cerrar) tFaltan([err.message]); }
  TSAVING=false; tSaveBar();
}
function tFaltan(l){ const b=$("#tf-faltan"); if(b){ b.hidden=false; b.innerHTML=`<b>Antes de firmar falta:</b><ul>${l.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`; b.scrollIntoView({behavior:"smooth",block:"center"}); } else toast(l[0]); }
window.addEventListener("beforeunload",e=>{ if(TDIRTY){ e.preventDefault(); e.returnValue=""; } });

/* ---------- piezas de formulario ---------- */
const tEsc=v=>esc(v==null?"":v);
function tIn(label,path,{tipo="text",ph="",attrs="",cls="",req=false,obj}={}){ const v=tGet(obj||TW[TF_TAB],path);
  return `<div class="field ${cls}"><label>${label}${req?' <b class="t-req">*</b>':""}</label><input class="in" type="${tipo}" data-f="${path}" value="${tEsc(v)}" placeholder="${esc(ph)}" ${attrs}></div>`; }
function tSeg(path,ops,{cls=""}={}){ const v=tGet(TW[TF_TAB],path);
  return `<div class="t-seg ${cls}" role="group">${ops.map(([k,t,c])=>`<button type="button" data-fset="${path}" data-v="${k}" class="${c||""}" aria-pressed="${v===k}">${t}</button>`).join("")}</div>`; }
function tFirmaBox(fi,txt){ return fi?`<div class="t-firmado"><span class="t-sello">✓</span><span><b>${txt}</b><small>${esc(fi.nombre)} · ${esc(tFH(fi.t))}</small></span></div>`:""; }
function tBloqueado(k,txt){ const f=TF.fichas[k];
  return `<div class="t-lock"><span>🔒</span><div><b>${txt}</b><small>Solo el gerente puede reabrirla. Queda anotado en la auditoría.</small></div>${ES_GER()&&k!=="f3"?`<button type="button" class="btn b-ghost b-sm" data-treabrir="${k}">Reabrir</button>`:""}</div>`; }
const tSec=(n,t,sub,body,extra="")=>`<section class="t-sec" ${extra}><h3><i>${n}</i><span>${t}${sub?`<small>${sub}</small>`:""}</span></h3>${body}</section>`;

/* ---------- croquis de daños (SVG propio, sin librerías) ---------- */
function tDibujo(v,W,H){
  const st='fill="var(--t-car)" stroke="var(--t-carl)" stroke-width="2" stroke-linejoin="round"', vid='fill="var(--t-glass)" stroke="var(--t-carl)" stroke-width="1.6"', rue='fill="var(--t-wheel)"';
  if(v==="izq"||v==="dcho"){ const g=`<path ${st} d="M18 90 L18 72 Q18 60 32 57 L78 52 L112 27 Q119 22 130 22 L196 22 Q207 22 215 29 L243 53 L272 58 Q284 61 284 74 L284 90 Z"/><path ${vid} d="M86 52 L114 31 Q118 28 124 28 L160 28 L160 52 Z"/><path ${vid} d="M167 28 L194 28 Q202 28 208 34 L231 52 L167 52 Z"/><path stroke="var(--t-carl)" stroke-width="1.5" fill="none" d="M163 54 L163 88 M100 56 L100 88 M226 58 L226 84 M140 64 h10 M186 64 h10"/><rect x="272" y="63" width="11" height="7" rx="2" fill="#F2C94C" stroke="var(--t-carl)"/><rect x="18" y="63" width="8" height="9" rx="2" fill="#E06C5A" stroke="var(--t-carl)"/><circle cx="70" cy="90" r="17" ${rue}/><circle cx="70" cy="90" r="7" fill="var(--t-rim)"/><circle cx="236" cy="90" r="17" ${rue}/><circle cx="236" cy="90" r="7" fill="var(--t-rim)"/>`;
    return (v==="izq"?`<g transform="translate(${W},0) scale(-1,1)">${g}</g>`:g)+`<text x="${v==="izq"?8:W-8}" y="116" text-anchor="${v==="izq"?"start":"end"}" class="t-svt">${v==="izq"?"← delante":"delante →"}</text>`; }
  if(v==="techo") return `<path ${st} d="M24 40 Q24 18 50 16 L246 16 Q280 18 284 48 L284 82 Q280 112 246 114 L50 114 Q24 112 24 90 Z"/><path ${vid} d="M190 26 L216 34 L216 96 L190 104 Z"/><path ${vid} d="M84 32 L100 26 L100 104 L84 98 Z"/><path fill="none" stroke="var(--t-carl)" stroke-width="1.4" d="M100 26 H190 M100 104 H190 M246 22 Q262 65 246 108"/><rect x="198" y="6" width="10" height="10" rx="2" ${rue}/><rect x="198" y="114" width="10" height="10" rx="2" ${rue}/><text x="${W-8}" y="127" text-anchor="end" class="t-svt">delante →</text>`;
  const cuerpo=`<path ${st} d="M28 96 L28 66 Q28 56 40 52 L54 26 Q58 18 70 18 L130 18 Q142 18 146 26 L160 52 Q172 56 172 66 L172 96 Z"/><rect x="34" y="96" width="22" height="13" rx="3" ${rue}/><rect x="144" y="96" width="22" height="13" rx="3" ${rue}/><path d="M40 46 h-14 v9 h14 M160 46 h14 v9 h-14" ${st}/>`;
  if(v==="frontal") return cuerpo+`<path ${vid} d="M60 26 L140 26 L152 50 L48 50 Z"/><rect x="36" y="60" width="30" height="10" rx="3" fill="#F2C94C" stroke="var(--t-carl)"/><rect x="134" y="60" width="30" height="10" rx="3" fill="#F2C94C" stroke="var(--t-carl)"/><rect x="76" y="62" width="48" height="15" rx="3" fill="var(--t-wheel)" opacity=".75"/><rect x="84" y="82" width="32" height="8" rx="1.5" fill="#fff" stroke="var(--t-carl)"/>`;
  return cuerpo+`<path ${vid} d="M58 26 L142 26 L150 46 L50 46 Z"/><rect x="32" y="58" width="26" height="12" rx="3" fill="#E06C5A" stroke="var(--t-carl)"/><rect x="142" y="58" width="26" height="12" rx="3" fill="#E06C5A" stroke="var(--t-carl)"/><rect x="82" y="64" width="36" height="10" rx="1.5" fill="#fff" stroke="var(--t-carl)"/><path d="M30 84 H170" stroke="var(--t-carl)" stroke-width="1.5"/>`;
}
function tCroquis(danos,editable){
  return `<div class="t-croquis ${editable?"edit":""}">${T_VISTAS.map(([v,t,,W,H])=>{ const ms=danos.map((d,i)=>[d,i]).filter(([d])=>d.v===v);
    return `<figure class="t-vista v-${v}"><figcaption>${t}${ms.length?` <b class="num">${ms.length}</b>`:""}</figcaption><svg viewBox="0 0 ${W} ${H}" data-tvista-svg="${v}" role="img" aria-label="${t}${editable?": toca donde está el daño":""}">${tDibujo(v,W,H)}${ms.map(([d,i])=>`<g class="t-mk" data-tmk="${i}" transform="translate(${d.x/100*W} ${d.y/100*H})"><circle r="10" fill="${T_DANO[d.t][1]}" stroke="#fff" stroke-width="2"/><text y="4" text-anchor="middle">${d.t}</text></g>`).join("")}</svg></figure>`; }).join("")}</div>`;
}

/* croquis para imprimir: cada vista como imagen (el PDF de Chrome corta los SVG en línea) */
function tCroquisImg(danos){
  const col={"var(--t-car)":"#FFFFFF","var(--t-carl)":"#5A564F","var(--t-glass)":"#DCE7F2","var(--t-wheel)":"#2B2A28","var(--t-rim)":"#B9B4AC"};
  return `<div class="tp-croquis">${T_VISTAS.map(([v,t,,W,H])=>{ const ms=danos.filter(d=>d.v===v);
    let svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${tDibujo(v,W,H).replace('class="t-svt"','font-family="Arial" font-size="10" font-weight="700" fill="#67635D"')}${ms.map(d=>`<g transform="translate(${d.x/100*W} ${d.y/100*H})"><circle r="10" fill="${T_DANO[d.t][1]}" stroke="#fff" stroke-width="2"/><text y="4" text-anchor="middle" font-family="Arial" font-size="11" font-weight="900" fill="#fff">${d.t}</text></g>`).join("")}</svg>`;
    for(const k in col) svg=svg.split(k).join(col[k]);
    return `<figure class="v-${v}"><figcaption>${t}${ms.length?` · ${ms.length}`:""}</figcaption><img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}" alt="${t}" width="${W}" height="${H}"></figure>`; }).join("")}</div>`;
}
const tLeyenda=()=>`<div class="t-ley">${Object.entries(T_DANO).map(([k,[t,c]])=>`<span><i style="background:${c}">${k}</i>${t}</span>`).join("")}</div>`;
function tFotos(lista,campo,{max=30,etiqueta="Añadir fotos",dis=false}={}){
  return `<div class="t-fotos">${lista.map((k,i)=>`<span class="t-foto"><a href="${FOTO(k)}" target="_blank" rel="noopener"><img src="${FOTO(k)}" alt="Foto ${i+1}" loading="lazy"></a>${dis?"":`<button type="button" class="x" data-tfotox="${campo}" data-i="${i}" aria-label="Quitar foto">✕</button>`}</span>`).join("")}
    ${dis||lista.length>=max?"":`<label class="t-foto-add"><input type="file" accept="image/*" capture="environment" multiple hidden data-tfoto="${campo}"><span>📷</span><small>${etiqueta}</small></label>`}</div>`;
}
async function tSubirFotos(files){ const keys=[]; for(const f of files){ try{ const b=await shrink(f); const r=await api("/api/fotos",{method:"POST",headers:{"content-type":"image/jpeg"},body:b}); keys.push(r.key); }catch(err){ toast(err.message); } } return keys; }

/* ---------- FORM-01 · recepción ---------- */
function tFaltaF1(){ const f=TW.f1, out=[];
  if((f.cliente.nombre||"").trim().length<2) out.push("Nombre del cliente");
  if((f.cliente.telefono||"").replace(/\D/g,"").length<9) out.push("Teléfono del cliente");
  if(!f.vehiculo.matricula) out.push("Matrícula"); if(!f.vehiculo.marcaModelo) out.push("Marca y modelo");
  if(!String(f.vehiculo.km||"").replace(/\D/g,"")) out.push("Kilómetros de entrada"); if(!f.vehiculo.nivel) out.push("Nivel de combustible");
  if(!(f.motivo||"").trim()) out.push("Motivo de entrada (con las palabras del cliente)");
  if(f.cliente.titular==="no"&&!/autoriz/i.test(f.motivo||"")) out.push("No es el titular: anota en el motivo que trae la autorización");
  const inv=T_INV.filter(([k])=>!(f.inventario[k]&&f.inventario[k].v)); if(inv.length) out.push("Inventario: marca Sí o No en "+inv.map(x=>x[1].toLowerCase()).join(", "));
  if(!f.danos.length&&!f.sinDanos) out.push("Daños previos: márcalos en el dibujo o la casilla «Sin daños previos»");
  if(f.danos.length&&!f.fotosDanos.length) out.push("Al menos una foto de los daños marcados");
  if(!f.firmaCliente) out.push("Firma del cliente");
  return out; }
function tF1(){
  const x=TW.f1, lock=!tEditable("f1"), f=TF.fichas.f1, dis=lock?"disabled":"";
  const inv=T_INV.map(([k,t])=>{ const v=(x.inventario[k]||{}).v||""; return `<div class="t-inv"><span>${t}</span>${tSeg(`inventario.${k}.v`,[["si","Sí"],["no","No"]],{cls:"sm"})}<input class="in" data-f="inventario.${k}.nota" value="${tEsc((x.inventario[k]||{}).nota)}" placeholder="${k==="valor"||k==="personales"?"¿Qué hay? (queda anotado)":"Nota"}" maxlength="120"></div>`; }).join("");
  return `${lock?tBloqueado("f1","Recepción firmada por el cliente"+(f&&f.firmadoCliente?" el "+tFH(f.firmadoCliente):"")):""}
  <fieldset class="t-fs" ${dis}>
  ${tSec(1,"Orden","",`<div class="t-g4"><div class="field"><label>Nº de orden</label><div class="in t-ro num">${esc(TF.fichas.num)}</div></div><div class="field"><label>Entrada</label><div class="in t-ro">${x.fecha?esc(tF(x.fecha))+" · "+esc(x.hora):"Al guardar"}</div></div>${tIn("Recibido por","recibidoPor",{attrs:'maxlength="60"'})}${tIn("Entrega prometida","entregaPrometida",{tipo:"date"})}</div>
    <div class="field"><label>Tipo de entrada</label>${tSeg("tipoEntrada",[["reparacion","Reparación de cliente"],["compra","Compra (para vender)"],["retoma","Retoma / parte de pago"]])}</div>`)}
  ${tSec(2,"Cliente","",`<div class="t-g2">${tIn("Nombre y apellidos","cliente.nombre",{req:1,attrs:'maxlength="80" autocomplete="off"'})}${tIn("DNI / NIE","cliente.doc",{attrs:'maxlength="20" autocomplete="off"'})}${tIn("Teléfono","cliente.telefono",{req:1,tipo:"tel",attrs:'maxlength="30" inputmode="tel"'})}${tIn("Email","cliente.email",{tipo:"email",attrs:'maxlength="120"'})}</div>
    <div class="t-g2"><div class="field"><label>¿Es el titular del coche?</label>${tSeg("cliente.titular",[["si","Sí"],["no","No"]])}${x.cliente.titular==="no"?'<small class="t-aviso">Pide la autorización firmada del titular y anótalo en el motivo.</small>':""}</div><div class="field"><label>Cómo prefiere que le avisemos</label>${tSeg("cliente.contacto",[["whatsapp","WhatsApp"],["llamada","Llamada"],["correo","Correo"]])}</div></div>`)}
  ${tSec(3,"Vehículo","",`<div class="t-g4">${tIn("Matrícula","vehiculo.matricula",{req:1,cls:"t-matf",attrs:'maxlength="12" autocomplete="off"'})}${tIn("Marca y modelo","vehiculo.marcaModelo",{req:1,cls:"t-span2",attrs:'maxlength="80" list="marcas"'})}${tIn("Año · color","vehiculo.anioColor",{attrs:'maxlength="40"',ph:"2019 · blanco"})}</div>
    <div class="t-g4">${tIn("Bastidor (VIN)","vehiculo.vin",{cls:"t-span2",attrs:'maxlength="17" autocomplete="off"',ph:"17 caracteres"})}${tIn("Kilómetros","vehiculo.km",{req:1,attrs:'inputmode="numeric" maxlength="10"'})}${tIn("ITV caduca","vehiculo.itv",{tipo:"date"})}</div>
    <div class="t-g2"><div class="field"><label>Foto del cuadro (km y testigos)</label>${tFotos(x.vehiculo.kmFoto?[x.vehiculo.kmFoto]:[],"kmFoto",{max:1,etiqueta:"Foto del cuadro",dis:lock})}</div>
      <div class="field"><label>Combustible</label><select class="in" data-f="vehiculo.combustible"><option value="">—</option>${["Gasolina","Diésel","Híbrido","Eléctrico","GLP"].map(c=>`<option ${x.vehiculo.combustible===c?"selected":""}>${c}</option>`).join("")}</select></div></div>
    <div class="field"><label>Nivel de combustible / batería <b class="t-req">*</b></label>${tSeg("vehiculo.nivel",[["reserva","Reserva"],["1/4","¼"],["1/2","½"],["3/4","¾"],["lleno","Lleno"]],{cls:"t-nivel"})}</div>
    <div class="field"><label>Testigos encendidos en el cuadro</label><input class="in" data-f="vehiculo.testigos" value="${tEsc(x.vehiculo.testigos)}" maxlength="200" placeholder="Toca los que veas o escribe"><div class="t-chips">${T_TESTIGOS.map(t=>`<button type="button" class="chipb" data-ttestigo="${t}">${t}</button>`).join("")}</div></div>`)}
  ${tSec(4,"Motivo de entrada","con las palabras del cliente",`<textarea class="in" data-f="motivo" rows="3" maxlength="1500" placeholder="«Hace un ruido metálico al frenar desde hace una semana, sobre todo en bajada»">${tEsc(x.motivo)}</textarea>`)}
  ${tSec(5,"Inventario de objetos","",`<div class="t-invs">${inv}</div><div class="t-g4">${tIn("Nº de llaves entregadas","llaves",{attrs:'inputmode="numeric" maxlength="3"'})}</div>`)}
  ${tSec(6,"Daños previos","toca el dibujo donde está el daño",`${lock?"":`<div class="t-tools" role="group" aria-label="Tipo de daño">${Object.entries(T_DANO).map(([k,[t,c]])=>`<button type="button" data-ttool="${k}" aria-pressed="${TTOOL===k}" style="--c:${c}"><i>${k}</i>${t}</button>`).join("")}</div>`}
    ${tCroquis(x.danos,!lock)}${tLeyenda()}
    ${x.danos.length?`<p class="hint">${x.danos.length} daño${x.danos.length>1?"s":""} marcado${x.danos.length>1?"s":""}.${lock?"":" Toca una marca para quitarla."}</p>`:""}
    <label class="t-chk"><input type="checkbox" data-f="sinDanos" ${x.sinDanos?"checked":""} ${x.danos.length?"disabled":""}><span>Sin daños previos (revisado con el cliente)</span></label>
    <div class="field"><label>Fotos de los daños ${x.danos.length?'<b class="t-req">* obligatoria al menos una</b>':""}</label>${tFotos(x.fotosDanos,"fotosDanos",{dis:lock})}</div>`)}
  ${tSec(7,"Autorización y firma","",`<div class="t-g2"><div class="field"><label>Autoriza el diagnóstico hasta (€, IGIC incl.)</label><input class="in num" data-f="autorizoHasta" value="${tEsc(x.autorizoHasta)}" inputmode="decimal" maxlength="10" placeholder="Ej. 60"></div><label class="t-chk" style="align-self:end"><input type="checkbox" data-f="avisosWhatsApp" ${x.avisosWhatsApp?"checked":""}><span>Acepta recibir los avisos de la reparación por WhatsApp</span></label></div>
    <p class="t-legal">El cliente confirma que los datos, el inventario y los daños anotados son correctos. Cualquier trabajo que supere el importe autorizado se presupuesta y se aprueba antes de hacerlo. Sus datos se usan solo para gestionar esta reparación (política de privacidad en volcanocars.es).</p>
    <div class="field"><label>Firma del cliente <b class="t-req">*</b></label>${x.firmaCliente?`<div class="t-firma-img"><img src="${x.firmaCliente}" alt="Firma del cliente">${lock?"":'<button type="button" class="btn b-ghost b-sm" data-tfirma-borrar>Repetir firma</button>'}</div>`:`<div class="t-firma"><canvas width="700" height="200" data-tfirma aria-label="Firma aquí con el dedo"></canvas><span class="t-firma-ph">Firma aquí con el dedo</span><button type="button" class="btn b-ghost b-sm" data-tfirma-limpiar>Borrar</button></div>`}</div>
    ${f&&f.firmaTaller?tFirmaBox(f.firmaTaller,"Recibido por el taller"):""}`)}
  </fieldset>
  <div class="t-faltan msg bad" id="tf-faltan" hidden></div>`;
}
/* firma con el dedo (canvas) */
function tFirmaInit(){
  const cv=document.querySelector("[data-tfirma]"); if(!cv) return;
  const cx=cv.getContext("2d"); cx.lineWidth=3; cx.lineCap="round"; cx.lineJoin="round"; cx.strokeStyle="#1B1B1A";
  let dib=false, hay=false, last=null;
  const pt=e=>{ const r=cv.getBoundingClientRect(); return [(e.clientX-r.left)*cv.width/r.width,(e.clientY-r.top)*cv.height/r.height]; };
  cv.addEventListener("pointerdown",e=>{ dib=true; last=pt(e); cv.setPointerCapture(e.pointerId); cx.beginPath(); cx.arc(last[0],last[1],1.4,0,7); cx.fillStyle="#1B1B1A"; cx.fill(); hay=true; cv.parentElement.classList.add("con"); });
  cv.addEventListener("pointermove",e=>{ if(!dib) return; const p=pt(e); cx.beginPath(); cx.moveTo(last[0],last[1]); cx.lineTo(p[0],p[1]); cx.stroke(); last=p; });
  const fin=()=>{ if(!dib) return; dib=false; if(hay){ TW.f1.firmaCliente=cv.toDataURL("image/png"); tMarcar(); } };
  cv.addEventListener("pointerup",fin); cv.addEventListener("pointercancel",fin);
}

/* ---------- FORM-02 · inspección 360° ---------- */
const T_SEM=[["ok","OK","ok"],["a","Ámbar","a"],["r","Rojo","r"],["na","NA","na"]];
function tFaltaF2(){ const f=TW.f2, out=[], sin=F2_IDS.filter(id=>!(f.items[id]&&f.items[id].e));
  if(sin.length) out.push(`${sin.length} punto${sin.length>1?"s":""} sin revisar (usa NA si no aplica): ${sin.slice(0,8).map(x=>x.toUpperCase()).join(", ")}${sin.length>8?"…":""}`);
  const sn=F2_IDS.filter(id=>f.items[id]&&["a","r"].includes(f.items[id].e)&&!(f.items[id].nota||"").trim()); if(sn.length) out.push("Nota en cada Ámbar o Rojo: faltan "+sn.map(x=>x.toUpperCase()).join(", "));
  if(!tNum(f.horasEst)) out.push("Horas estimadas de trabajo"); if(!f.recomendacion) out.push("Recomendación");
  return out; }
function tFila2(id,t,extra,lock){ const it=TW.f2.items[id]||{}, e=it.e||"";
  return `<div class="t-f2r e-${e||"x"}" data-trow="${id}"><span class="t-f2l"><b>${id.toUpperCase()}</b>${t}</span>
    <div class="t-sem" role="group" aria-label="${esc(t)}">${T_SEM.map(([k,n,c])=>`<button type="button" class="s-${c}" data-tsem="${id}" data-v="${k}" aria-pressed="${e===k}" ${lock?"disabled":""}>${n}</button>`).join("")}</div>
    ${extra?`<input class="in t-f2x" data-f="items.${id}.extra" value="${tEsc(it.extra)}" placeholder="${esc(extra)}" maxlength="80" ${lock?"disabled":""}>`:""}
    ${e==="a"||e==="r"?`<div class="t-f2n"><input class="in" data-f="items.${id}.nota" value="${tEsc(it.nota)}" placeholder="${e==="r"?"¿Qué pasa? Obligatorio (p. ej. pastillas a 2 mm)":"¿Qué hay que vigilar? Obligatorio"}" maxlength="300" ${lock?"disabled":""}>${tFotos(it.fotos||[],"items."+id+".fotos",{max:6,etiqueta:"Foto",dis:lock})}</div>`:""}</div>`; }
function tF2Resumen(){ const r=tResF2(TW.f2), p=Math.round(r.hechos/r.total*100);
  return `<div class="t-f2sum"><div class="t-prog"><i style="width:${p}%"></i></div><span><b class="num">${r.hechos}/${r.total}</b> revisados</span><span class="t-cnt ok"><i></i>${r.ok} OK</span><span class="t-cnt a"><i></i>${r.ambar} ámbar</span><span class="t-cnt r"><i></i>${r.rojos} rojo${r.rojos===1?"":"s"}</span><span class="t-cnt na"><i></i>${r.na} NA</span></div>`; }
function tF2(){
  const x=TW.f2, f=TF.fichas.f2, lock=!tEditable("f2"), r=tResF2(x);
  const noPuede=!ES_GER()&&ME.rol==="recepcion"&&!(f&&f.cerrada);
  return `${f&&f.cerrada?tBloqueado("f2","Inspección firmada"):""}${noPuede?'<div class="t-lock"><span>ℹ️</span><div><b>La inspección la hace un mecánico.</b><small>Puedes consultarla, pero no rellenarla.</small></div></div>':""}
  <div class="t-sticky" id="t-f2sum">${tF2Resumen()}</div>
  <p class="hint t-semhint"><b class="s-ok">OK</b> correcto · <b class="s-a">Ámbar</b> vigilar o cambiar pronto · <b class="s-r">Rojo</b> reparar ya (seguridad o avería) · <b class="s-na">NA</b> no aplica. Todo Ámbar o Rojo lleva nota y, si se puede, foto.</p>
  ${x.mecanico||f?`<p class="hint">Inspección de <b>${esc(tNombre(x.mecanico||(f&&f.mecanico)))}</b>${x.inicio?" · empezada "+esc(tFH(x.inicio)):""}</p>`:""}
  ${F2_SECCIONES.map(([L,t,sub,items])=>{ const hechos=items.filter(([id])=>x.items[id]&&x.items[id].e).length, rj=items.filter(([id])=>x.items[id]&&x.items[id].e==="r").length, am=items.filter(([id])=>x.items[id]&&x.items[id].e==="a").length;
    return `<details class="t-f2s" data-tsec="${L}" ${T_OPEN.has(L)?"open":""}><summary><i>${L}</i><span><b>${t}</b>${sub?`<small>${sub}</small>`:""}</span><em class="num" data-tsecn="${L}">${hechos}/${items.length}${rj?` · <b class="s-r">${rj} R</b>`:""}${am?` · <b class="s-a">${am} Á</b>`:""}</em></summary>
      ${items.map(([id,tt,ex])=>tFila2(id,tt,ex,lock)).join("")}
      ${lock?"":`<div class="t-f2acts"><button type="button" class="chipb" data-tresto="${L}">Marcar el resto como OK</button></div>`}</details>`; }).join("")}
  ${tSec("✓","Resultado de la inspección","",`<div class="t-g3"><div class="field"><label>Horas estimadas de trabajo <b class="t-req">*</b></label><input class="in num" data-f="horasEst" value="${x.horasEst?tEsc(String(x.horasEst).replace(".",",")):""}" inputmode="decimal" placeholder="Ej. 2,5" ${lock?"disabled":""}><small class="hint">Pasa a FORM-03 como tiempo estimado.</small></div>
    <div class="field t-span2"><label>Recomendación <b class="t-req">*</b></label>${lock?`<div class="in t-ro">${esc(T_RECO[x.recomendacion]||"—")}</div>`:tSeg("recomendacion",Object.entries(T_RECO).map(([k,t])=>[k,t]))}</div></div>
    ${r.rojos?`<label class="t-chk"><input type="checkbox" data-f="rechazoFirmado" ${x.rechazoFirmado?"checked":""} ${lock?"disabled":""}><span>El cliente <b>rechaza por escrito</b> reparar los puntos en ROJO (se guarda el papel firmado en la carpeta)</span></label>`:""}
    ${r.rojos?`<div class="msg bad" style="font-weight:600">Hay ${r.rojos} punto${r.rojos>1?"s":""} en ROJO: no se entrega el coche sin reparar o sin rechazo firmado. Al firmar, la orden pasa a «Presupuesto».</div>`:""}
    ${f&&f.firma?tFirmaBox(f.firma,"Inspección firmada"):""}`)}
  <div class="t-faltan msg bad" id="tf-faltan" hidden></div>`;
}
function tF2Refrescar(id){
  const row=document.querySelector(`[data-trow="${id}"]`); const L=id[0].toUpperCase(), s=F2_SECCIONES.find(z=>z[0]===L), it=s[3].find(i=>i[0]===id);
  if(row) row.outerHTML=tFila2(id,it[1],it[2],!tEditable("f2"));
  const x=TW.f2, items=s[3], hechos=items.filter(([i])=>x.items[i]&&x.items[i].e).length, rj=items.filter(([i])=>x.items[i]&&x.items[i].e==="r").length, am=items.filter(([i])=>x.items[i]&&x.items[i].e==="a").length;
  const n=document.querySelector(`[data-tsecn="${L}"]`); if(n) n.innerHTML=`${hechos}/${items.length}${rj?` · <b class="s-r">${rj} R</b>`:""}${am?` · <b class="s-a">${am} Á</b>`:""}`;
  const su=$("#t-f2sum"); if(su) su.innerHTML=tF2Resumen();
}

/* ---------- FORM-03 · control de tiempos ---------- */
function tF3(){
  const f3=TF.fichas.f3||TW.f3, c=tCalc(f3,TF.config), cfg=TF.config, x=TW.f3, empezado=f3.eventos.length>0, ger=ES_GER();
  const esMio=ger||ME.uid===f3.mecanico||(!f3.mecanico&&ME.rol==="mecanico");
  const mecs=TEQ.filter(p=>p.activo&&["mecanico","gerente","calidad"].includes(p.rol));
  const f1=TF.fichas.f1, estTxt={sin:"Sin empezar",trabajando:"Trabajando",pausa:"En pausa",fin:"Terminado"}[c.estado];
  const pct=f3.estMin?Math.min(100,c.netoMin/f3.estMin*100):0, sobre=f3.estMin&&c.netoMin>f3.estMin;
  const rechazo=TF.fichas.f4&&TF.fichas.f4.resultado==="rechazado"&&c.estado==="fin";
  const botones=!esMio?`<p class="hint">Este trabajo es de <b>${esc(tNombre(f3.mecanico))}</b>. Solo él o el gerente pueden fichar.</p>`:c.estado==="sin"||rechazo?`<button type="button" class="t-big go" data-tev="inicio">▶ ${rechazo?"Empezar el retrabajo":"Iniciar trabajo"}</button>`
    :c.estado==="trabajando"?`<button type="button" class="t-big pa" data-tpausa>❚❚ Pausa</button><button type="button" class="t-big fin" data-tev="fin">■ Terminar</button>`
    :c.estado==="pausa"?`<button type="button" class="t-big go" data-tev="reanudar">▶ Reanudar</button><button type="button" class="t-big fin" data-tev="fin">■ Terminar</button>`:"";
  const evs=[...f3.eventos].map((e,i)=>[e,i]).sort((a,b)=>a[0].t.localeCompare(b[0].t));
  const tn={inicio:"Inicio",pausa:"Pausa",reanudar:"Reanudar",fin:"Fin"};
  const j=f3.justificacion, jw=TW.j;
  return `<div class="t-g2 t-f3top">
    <section class="t-sec">${`<h3><i>1</i><span>Datos del trabajo</span></h3>`}
      <div class="t-g2"><div class="field"><label>Mecánico asignado</label><select class="in" data-f3="mecanico" ${!ger&&f3.mecanico?"disabled":""}><option value="">— Sin asignar —</option>${mecs.map(p=>`<option value="${esc(p.id)}" ${x.mecanico===p.id?"selected":""}>${esc(p.nombre)} · ${esc(T_ROL[p.rol])}</option>`).join("")}${ger?`<option value="gerente" ${x.mecanico==="gerente"?"selected":""}>Gerente</option>`:""}</select></div>
      <div class="field"><label>Tipo de trabajo</label><select class="in" data-f3="tipo">${Object.entries(T_TIPO3).map(([k,t])=>`<option value="${k}" ${x.tipo===k?"selected":""}>${t}</option>`).join("")}</select></div>
      <div class="field"><label>Tiempo estimado (horas)</label><input class="in num" data-f3="estH" value="${x.estMin?String(Math.round(x.estMin/6)/10).replace(".",","):""}" inputmode="decimal" placeholder="Ej. 2,5" ${!ger&&empezado?"disabled":""}>${!ger&&empezado?'<small class="hint">Ya ha empezado: solo el gerente lo cambia.</small>':""}</div>
      <div class="field"><label>Tarifa mano de obra (€/h)</label><input class="in num" data-f3="tarifa" value="${String(x.tarifa||cfg.tarifa).replace(".",",")}" inputmode="decimal" ${ger?"":"disabled"}></div>
      <div class="field"><label>Hoja</label><input class="in" data-f3="hoja" value="${tEsc(x.hoja)}" maxlength="12"></div>
      <div class="field"><label>Entrada del coche</label><div class="in t-ro">${f1&&f1.fecha?esc(tF(f1.fecha))+" · "+esc(f1.hora):esc(tFH(TF.orden.creado))}</div></div></div>
      <button type="button" class="btn b-ghost b-sm" data-tf3datos>Guardar datos</button>
    </section>
    <section class="t-sec t-reloj-box ${c.estado}"><h3><i>2</i><span>Fichaje <small>la hora la pone el servidor: nadie la escribe a mano</small></span></h3>
      <div class="t-est ${c.estado}"><span class="t-dot"></span>${estTxt}${c.estado==="pausa"?` · ${esc(([...f3.eventos].sort((a,b)=>a.t.localeCompare(b.t)).pop()||{}).motivo||"")}`:""}</div>
      <div class="t-crono num" data-treloj>${tHms(c.netoMs)}</div>
      <div class="t-crono-sub">trabajo neto${f3.estMin?` de ${tH(f3.estMin)} estimadas`:""}</div>
      ${f3.estMin?`<div class="t-prog big ${sobre?"sobre":""}"><i data-tbar style="width:${pct}%"></i></div>`:""}
      <div class="t-bigs" id="t-bigs">${botones}</div>
      <div id="t-pausas" hidden><p class="hint" style="margin:6px 0">¿Por qué paras?</p><div class="t-motivos">${T_MOTIVOS.map(m=>`<button type="button" class="chipb" data-tev="pausa" data-motivo="${esc(m)}">${esc(m)}</button>`).join("")}</div></div>
      <input class="in" id="t-evnota" placeholder="Nota del fichaje (opcional)" maxlength="200" ${esMio&&c.estado!=="fin"||rechazo?"":"hidden"}>
    </section></div>
  ${tSec(3,"Registro de fichajes",ger?"el gerente puede corregir una hora: queda la hora original y el motivo":"",evs.length?`<div class="t-tabla-wrap"><table class="t-tabla t-evs"><thead><tr><th>Fichaje</th><th>Hora</th><th>Quién</th><th>Motivo / nota</th>${ger?"<th></th>":""}</tr></thead><tbody>${evs.map(([e,i])=>`<tr><td><span class="t-ev ${e.tipo}">${tn[e.tipo]}</span></td><td class="num"><b>${esc(tFH(e.t))}</b>${(e.corr||[]).map(k=>`<small class="t-corr">Corregida: antes ${esc(tHora(k.t0))} · ${esc(tNombre(k.por))} · «${esc(k.motivo)}»</small>`).join("")}</td><td>${esc(tNombre(e.por))}</td><td>${esc(e.motivo||"")}${e.nota?`<small>${esc(e.nota)}</small>`:""}</td>${ger?`<td><button type="button" class="chipb" data-tcorr="${i}">Corregir</button></td>`:""}</tr><tr class="t-corr-f" data-tcorrf="${i}" hidden><td colspan="5"><div class="t-g3"><div class="field"><label>Hora correcta</label><input class="in" type="datetime-local" data-tcorrt value="${esc(new Date(Date.parse(e.t)+ (new Date(e.t).getTimezoneOffset()*-6e4)).toISOString().slice(0,16))}"></div><div class="field t-span2"><label>Motivo de la corrección (obligatorio)</label><input class="in" data-tcorrm maxlength="300" placeholder="Ej. Olvidó fichar la pausa de comida a su hora"></div></div><button type="button" class="btn b-acc b-sm" data-tcorrok="${i}">Guardar corrección</button></td></tr>`).join("")}</tbody></table></div>`:'<p class="hint">Todavía no hay fichajes.</p>')}
  ${tSec(4,"Cálculo","",`<div class="t-kpis"><div><small>Trabajo neto</small><b class="num" data-tneto>${tMin(c.netoMin)}</b></div><div><small>Pausas</small><b class="num">${tMin(c.pausasMin)}</b></div><div><small>Estimado</small><b class="num">${f3.estMin?tMin(f3.estMin):"—"}</b></div><div class="${c.exige?"mal":c.desvMin>0?"sube":"bien"}"><small>Desviación</small><b class="num">${f3.estMin?tPct(c.desvPct):"—"}</b><em>${f3.estMin?tMin(c.desvMin):""}</em></div><div><small>Mano de obra</small><b class="num">${eur(c.manoObra)}</b><em>${eur(c.tarifa)}/h · sin IGIC</em></div></div>
    <p class="hint">Desviación = (real − estimado) ÷ estimado × 100. Si pasa del <b>${String(cfg.umbralPct).replace(".",",")} %</b> o de <b>${cfg.umbralMin} min</b>, hay que justificarla y el gerente da el visto bueno.</p>
    ${Object.keys(c.pausas).length?`<div class="t-pmot">${Object.entries(c.pausas).sort((a,b)=>b[1]-a[1]).map(([m,v])=>`<span class="chip">${esc(m)} · ${tMin(v)}</span>`).join("")}</div>`:""}
    ${(f3.retrabajos||[]).length?`<div class="msg bad" style="margin-top:10px">Retrabajos por calidad: ${f3.retrabajos.map(r=>`${esc(tFH(r.t))} · «${esc(r.causa)}»`).join("<br>")}</div>`:""}`)}
  ${typeof alF3==="function"?alF3():""}
  ${c.estado==="fin"&&(c.exige||j||f3.vistoBueno)?tSec(5,"Justificación y visto bueno",c.exige?"obligatoria: el tiempo real se ha pasado del límite":"",`
    ${j?`<div class="t-just"><b>Causas:</b> ${j.codigos.map(k=>`<span class="chip">${k} · ${esc((T_JUST.find(z=>z[0]===k)||[])[1]||"")}</span>`).join(" ")}<p>${esc(j.explicacion)}</p><small>Cliente avisado: ${esc({si:"Sí",no:"No",na:"No aplica"}[j.avisado]||"—")}${j.mejora?" · Para la próxima: "+esc(j.mejora):""} · ${esc(tNombre(j.por))}, ${esc(tFH(j.t))}</small></div>`:""}
    ${c.exige&&!j&&(ger||ME.uid===f3.mecanico)?`<div class="t-jform"><div class="t-jcods">${T_JUST.map(([k,t])=>`<label class="t-chk"><input type="checkbox" data-tj="${k}" ${jw.codigos.includes(k)?"checked":""}><span><b>${k}</b> ${t}</span></label>`).join("")}</div>
      <div class="field"><label>Explicación breve <b class="t-req">*</b></label><textarea class="in" data-tjf="explicacion" rows="2" maxlength="600">${tEsc(jw.explicacion)}</textarea></div>
      <div class="t-g2"><div class="field"><label>¿Se avisó al cliente?</label><select class="in" data-tjf="avisado"><option value="">—</option><option value="si" ${jw.avisado==="si"?"selected":""}>Sí</option><option value="no" ${jw.avisado==="no"?"selected":""}>No</option><option value="na" ${jw.avisado==="na"?"selected":""}>No aplica</option></select></div><div class="field"><label>Qué haremos mejor la próxima vez</label><input class="in" data-tjf="mejora" value="${tEsc(jw.mejora)}" maxlength="400"></div></div>
      <button type="button" class="btn b-acc b-sm" data-tjustificar>Guardar justificación</button></div>`:c.exige&&!j?'<p class="hint">Falta la justificación del mecánico.</p>':""}
    ${f3.vistoBueno?`<div class="t-firmado"><span class="t-sello">✓</span><span><b>Visto bueno del gerente</b><small>${esc(tFH(f3.vistoBueno.t))}${f3.vistoBueno.nota?" · "+esc(f3.vistoBueno.nota):""}</small></span></div>`:ger&&(!c.exige||j)?`<div class="t-vb"><input class="in" id="t-vbnota" placeholder="Nota del gerente (opcional)" maxlength="300"><button type="button" class="btn b-brand b-sm" data-tvb>Dar el visto bueno</button></div>`:c.exige?'<p class="hint">Después, el gerente da el visto bueno.</p>':""}`):""}
  ${c.estado==="fin"&&!c.exige&&!f3.vistoBueno&&ger?`<p class="hint">Tiempo dentro del límite: no hace falta justificar. <button type="button" class="g-link" data-tvb>Dar el visto bueno igualmente</button></p>`:""}`;
}
function tReloj(){ const el=document.querySelector("[data-treloj]"); if(el&&TF&&TF.fichas.f3){ const c=tCalc(TF.fichas.f3,TF.config); el.textContent=tHms(c.netoMs); const b=document.querySelector("[data-tbar]"); if(b&&TF.fichas.f3.estMin) b.style.width=Math.min(100,c.netoMs/6e4/TF.fichas.f3.estMin*100)+"%"; }
  document.querySelectorAll("[data-treloj-o]").forEach(x=>{ const d=x.dataset.tdesde; x.textContent=tHms(+x.dataset.trelojO+(d?Math.max(0,tAhora()-Date.parse(d)):0)); }); }
setInterval(()=>{ if(document.hidden) return; if(!$("#s-ficha").hidden&&TF_TAB==="f3") tReloj(); else if(!$("#s-ordenes").hidden) tReloj(); },1000);
async function tF3Post(body,msg){ try{ const r=await tApi(`fichas/${TF.orden.token}/f3`,"POST",body); tRecibir(r); TW.f3=tClone(r.fichas.f3); tRenderHead(); tRenderBody(true); if(msg) toast(msg); return true; }catch(err){ toast(err.message); return false; } }

/* ---------- FORM-04 · control de calidad ---------- */
function tPuedeF4(){ const f=TF.fichas, e=tEstado(f.f3?f.f3.eventos:[]), uid=ME?ME.uid:"gerente";
  if(f.f4&&f.f4.firma&&!(f.f4.resultado==="rechazado"&&tNuevoIntento())) return [false,f.f4.resultado==="rechazado"?"espera":"firmada"];
  if(e!=="fin") return [false,"trabajo"];
  const trab=new Set([f.f3&&f.f3.mecanico,...((f.f3&&f.f3.eventos)||[]).map(x=>x.por)].filter(Boolean));
  if(trab.has(uid)) return [false,"mismo"];
  if(ME&&ME.rol==="recepcion") return [false,"rol"];
  return [true,""]; }
function tF4(){
  const x=TW.f4, f=TF.fichas.f4, [puede,por]=tPuedeF4(), lista=F4_SECC.filter(s=>s[0]==="A"||s[0]==="B"||(x.destino==="venta"?s[0]==="D":s[0]==="C"));
  const hayNo=lista.some(s=>s[2].some(([id])=>x.items[id]==="no")), lock=!puede;
  const hechos=lista.reduce((a,s)=>a+s[2].filter(([id])=>x.items[id]).length,0), total=lista.reduce((a,s)=>a+s[2].length,0);
  const aviso={trabajo:"Se rellena cuando el mecánico termina el trabajo en FORM-03.",mismo:"Tú has trabajado en este coche: el control de calidad lo firma otra persona (responsable de calidad, otro mecánico o el gerente).",rol:"El control de calidad lo hace calidad, otro mecánico o el gerente.",espera:"Rechazado: el coche ha vuelto a taller. Cuando el mecánico repita el trabajo y lo termine en FORM-03, se hace un nuevo control.",firmada:""}[por];
  const f3=TF.fichas.f3, c=tCalc(f3,TF.config);
  return `${aviso?`<div class="t-lock"><span>${por==="espera"?"↩️":"ℹ️"}</span><div><b>${esc(aviso)}</b>${por==="mismo"&&f3?`<small>Mecánico del trabajo: ${esc(tNombre(f3.mecanico))}</small>`:""}</div></div>`:""}
  ${f&&f.firma&&f.resultado!=="rechazado"?`<div class="t-res ${f.resultado}"><b>${esc(T_RES[f.resultado])}</b>${f.motivo?`<p>${esc(f.motivo)}</p>`:""}${tFirmaBox(f.firma,"Control de calidad firmado")}${f.cierreGerente?tFirmaBox({nombre:tNombre(f.cierreGerente.por),t:f.cierreGerente.t},"Orden cerrada por el gerente"):""}
    ${ES_GER()?`<div class="t-g2" style="margin-top:10px">${!f.cierreGerente?`<button type="button" class="btn b-brand b-sm" data-tcierre>Cerrar la orden (visto bueno final)</button>`:""}${TF.orden.estado!=="entregado"&&!ES_EQ()?`<button type="button" class="btn b-acc b-sm" data-tentregar>${f.destino==="venta"?"Pasar a exposición (entregado)":"Marcar como entregado al cliente"}</button>`:""}</div>`:""}</div>`:""}
  ${f&&f.intentos>1||(f3&&f3.retrabajos&&f3.retrabajos.length)?`<p class="hint">Intento nº ${(f&&f.intentos||0)+(puede?1:0)} · retrabajos: ${(f3.retrabajos||[]).length}</p>`:""}
  ${c&&c.estado==="fin"?`<p class="hint">Trabajo de <b>${esc(tNombre(f3.mecanico))}</b> · ${tMin(c.netoMin)} netos${f3.estMin?" · "+tPct(c.desvPct):""}</p>`:""}
  <fieldset class="t-fs" ${lock?"disabled":""}>
  <div class="field"><label>Destino del coche</label>${tSeg("destino",[["cliente","Entrega a cliente (A + B + C)"],["venta","Inventario de venta (A + B + D)"]])}</div>
  <div class="t-sticky"><div class="t-f2sum"><div class="t-prog"><i style="width:${Math.round(hechos/total*100)}%"></i></div><span><b class="num">${hechos}/${total}</b> comprobados</span>${hayNo?'<span class="t-cnt r"><i></i>Hay algún NO</span>':""}</div></div>
  ${lista.map(([L,t,items])=>`<section class="t-sec t-f4s"><h3><i>${L}</i><span>${t}</span></h3>${items.map(([id,tt])=>{ const v=x.items[id]||""; return `<div class="t-f4r v-${v||"x"}"><span class="t-f2l"><b>${id.toUpperCase()}</b>${tt}</span><div class="t-sem t4" role="group">${[["si","SÍ","ok"],["no","NO","r"],["na","NA","na"]].map(([k,n,cl])=>`<button type="button" class="s-${cl}" data-tf4="${id}" data-v="${k}" aria-pressed="${v===k}">${n}</button>`).join("")}</div>${v==="no"||x.notas[id]?`<input class="in t-f2x" data-f="notas.${id}" value="${tEsc(x.notas[id])}" placeholder="${v==="no"?"¿Qué falla?":"Nota"}" maxlength="160">`:""}</div>`; }).join("")}</section>`).join("")}
  ${tSec("✓","Resultado","",`${hayNo?'<div class="msg bad" style="margin-bottom:10px">Hay algún NO: el coche vuelve a taller. El resultado es «Rechazado» y hay que escribir la causa.</div>':""}
    ${tSeg("resultado",Object.entries(T_RES).map(([k,t])=>[k,t,k==="rechazado"?"s-r":k==="aprobado"?"s-ok":"s-a"]),{cls:"t-resseg"})}
    <div class="field" style="margin-top:10px"><label>${x.resultado==="aprobado"?"Observaciones (opcional)":"Motivo / observaciones <b class='t-req'>*</b>"}</label><textarea class="in" data-f="motivo" rows="2" maxlength="800">${tEsc(x.motivo)}</textarea></div>
    <p class="hint">Firma: <b>${esc(ME?ME.nombre:"Gerente")}</b>. Tiene que ser una persona distinta del mecánico que hizo el trabajo.</p>`)}
  </fieldset><div class="t-faltan msg bad" id="tf-faltan" hidden></div>`;
}

/* ---------- auditoría ---------- */
function tAud(){
  const a=[...TF.fichas.audit].reverse(), fil=[];
  for(const x of a){ const p=fil[fil.length-1]; if(p&&x.accion==="guardar"&&p.accion==="guardar"&&p.por===x.por&&p.detalle===x.detalle){ p.n=(p.n||1)+1; p.t0=x.t; continue; } fil.push({...x}); }
  const sens=["corregir-hora","reabrir","visto-bueno","editar-cerrada","tiempo-estimado","calidad-rechazo"];
  return `<p class="hint">Todo lo que se hace en las fichas de esta orden, con la persona y la hora. No se puede borrar. Los fichajes solo los corrige el gerente y queda la hora original.</p>
  ${fil.length?`<div class="t-tabla-wrap"><table class="t-tabla t-aud"><thead><tr><th>Cuándo</th><th>Quién</th><th>Qué</th></tr></thead><tbody>${fil.map(x=>`<tr class="${sens.includes(x.accion)?"sens":""}"><td class="num">${esc(tFH(x.t))}${x.n?`<small>${x.n} guardados desde ${esc(tHora(x.t0))}</small>`:""}</td><td><b>${esc(x.nombre)}</b><small>${esc(T_ROL[x.rol]||x.rol)}</small></td><td><b>${esc(T_ACC[x.accion]||x.accion)}</b><small>${esc(x.detalle)}</small></td></tr>`).join("")}</tbody></table></div>`:'<p class="empty">Sin movimientos.</p>'}`;
}

/* ---------- eventos de las fichas ---------- */
function tCampo(el){ // guarda en TW lo que se escribe
  const p=el.dataset.f; if(!p) return; const k=TF_TAB; if(!TW[k]) return;
  let v=el.type==="checkbox"?el.checked:el.value;
  if(k==="f2"&&p==="horasEst") v=tNum(v);
  if(k==="f2"&&p.startsWith("items.")){ const id=p.split(".")[1]; TW.f2.items[id]=TW.f2.items[id]||{e:"",nota:"",extra:"",fotos:[]}; }
  tSet(TW[k],p,v); tMarcar();
}
$("#tf").addEventListener("input",e=>{ const t=e.target;
  if(t.matches("[data-f]")) tCampo(t);
  else if(t.matches("[data-tjf]")) TW.j[t.dataset.tjf]=t.value;
});
$("#tf").addEventListener("change",async e=>{ const t=e.target;
  if(t.matches("select[data-f],input[type=checkbox][data-f],input[type=date][data-f]")){ tCampo(t); if(t.dataset.f==="sinDanos") return; }
  if(t.matches("[data-tj]")){ const s=new Set(TW.j.codigos); t.checked?s.add(t.dataset.tj):s.delete(t.dataset.tj); TW.j.codigos=[...s].sort(); return; }
  if(t.matches("[data-tjf]")){ TW.j[t.dataset.tjf]=t.value; return; }
  if(t.matches("[data-tfoto]")){ const campo=t.dataset.tfoto, files=[...t.files]; t.value=""; if(!files.length) return; toast("Subiendo "+files.length+" foto"+(files.length>1?"s":"")+"…");
    const keys=await tSubirFotos(files); if(!keys.length) return; const k=TF_TAB;
    if(campo==="kmFoto") TW.f1.vehiculo.kmFoto=keys[0];
    else { const cur=tGet(TW[k],campo)||[]; if(k==="f2"){ const id=campo.split(".")[1]; TW.f2.items[id]=TW.f2.items[id]||{e:"",nota:"",extra:"",fotos:[]}; } tSet(TW[k],campo,[...cur,...keys]); }
    tMarcar(); if(k==="f2") tF2Refrescar(campo.split(".")[1]); else tRenderBody(true); toast("Foto añadida"); }
});
$("#tf").addEventListener("toggle",e=>{ const d=e.target; if(d.matches&&d.matches("[data-tsec]")) d.open?T_OPEN.add(d.dataset.tsec):T_OPEN.delete(d.dataset.tsec); },true);
$("#tf").addEventListener("click",async e=>{
  const t=e.target, q=s=>t.closest(s);
  if(q("[data-tvolver]")){ if(TDIRTY) await tGuardar(false,true); try{ sessionStorage.removeItem("vc_tf"); }catch(_){} TF=null; abrirTab("ordenes"); return; }
  const tb=q("[data-ttabb]"); if(tb){ if(TDIRTY) await tGuardar(false,true); TF_TAB=tb.dataset.ttabb; tRenderHead(); tRenderBody(); return; }
  const pr=q("[data-tprint]"); if(pr){ if(TDIRTY) await tGuardar(false,true); tImprimir(pr.dataset.tprint==="uno"&&TF_TAB!=="audit"?[TF_TAB]:["f1","f2","f3","f4"]); return; }
  if(q("[data-tdrawer]")){ const o=ORDENES.find(z=>z.token===TF.orden.token); if(o) _tAbrirOrdenDrawer(o.token); return; }
  if(q("[data-tguardar]")){ await tGuardar(false); return; }
  if(q("[data-tcerrar]")){ const k=TF_TAB;
    if(k==="f1"&&!confirm("¿Cerrar la recepción con la firma del cliente? Después solo el gerente puede cambiarla.")) return;
    if(k==="f4"&&TW.f4.resultado!=="rechazado"&&!confirm("¿Firmar el control de calidad como "+(T_RES[TW.f4.resultado]||"").toLowerCase()+"?")) return;
    await tGuardar(true); return; }
  const rb=q("[data-treabrir]"); if(rb){ const m=prompt("Motivo para reabrir la ficha (queda en la auditoría):"); if(!m||m.trim().length<4) return toast("Hace falta un motivo");
    try{ const r=await tApi(`fichas/${TF.orden.token}/reabrir`,"POST",{ficha:rb.dataset.treabrir,motivo:m}); tRecibir(r); tVacias(); tRenderHead(); tRenderBody(); toast("Ficha reabierta"); }catch(err){ toast(err.message); } return; }
  // segmentados
  const sg=q("[data-fset]"); if(sg&&!sg.disabled){ const p=sg.dataset.fset; tSet(TW[TF_TAB],p,sg.dataset.v); sg.parentElement.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b===sg))); tMarcar();
    if(["cliente.titular","destino","resultado"].includes(p)) tRenderBody(true); return; }
  // FORM-01
  const tt=q("[data-ttestigo]"); if(tt&&tEditable("f1")){ const inp=$("#tf [data-f='vehiculo.testigos']"), l=inp.value.split(/,\s*/).filter(Boolean), w=tt.dataset.ttestigo;
    const nl=w==="Ninguno"?["Ninguno"]:l.includes(w)?l.filter(x=>x!==w):[...l.filter(x=>x!=="Ninguno"),w]; inp.value=nl.join(", "); tCampo(inp); return; }
  const tool=q("[data-ttool]"); if(tool){ TTOOL=tool.dataset.ttool; document.querySelectorAll("[data-ttool]").forEach(b=>b.setAttribute("aria-pressed",String(b===tool))); return; }
  const mk=q("[data-tmk]"); if(mk&&tEditable("f1")&&TF_TAB==="f1"){ TW.f1.danos.splice(+mk.dataset.tmk,1); tMarcar(); tRenderBody(true); return; }
  const sv=q("[data-tvista-svg]"); if(sv&&tEditable("f1")&&TF_TAB==="f1"){ const r=sv.getBoundingClientRect();
    TW.f1.danos.push({v:sv.dataset.tvistaSvg,x:Math.round((e.clientX-r.left)/r.width*100),y:Math.round((e.clientY-r.top)/r.height*100),t:TTOOL}); TW.f1.sinDanos=false; tMarcar(); tRenderBody(true); return; }
  const fx=q("[data-tfotox]"); if(fx){ const campo=fx.dataset.tfotox, k=TF_TAB;
    if(campo==="kmFoto") TW.f1.vehiculo.kmFoto=""; else { const l=(tGet(TW[k],campo)||[]).slice(); l.splice(+fx.dataset.i,1); tSet(TW[k],campo,l); }
    tMarcar(); if(k==="f2") tF2Refrescar(campo.split(".")[1]); else tRenderBody(true); return; }
  if(q("[data-tfirma-limpiar]")){ const cv=$("#tf [data-tfirma]"); cv.getContext("2d").clearRect(0,0,cv.width,cv.height); cv.parentElement.classList.remove("con"); TW.f1.firmaCliente=""; tMarcar(); return; }
  if(q("[data-tfirma-borrar]")){ TW.f1.firmaCliente=""; tMarcar(); tRenderBody(true); return; }
  // FORM-02
  const sm=q("[data-tsem]"); if(sm&&tEditable("f2")){ const id=sm.dataset.tsem; TW.f2.items[id]=TW.f2.items[id]||{e:"",nota:"",extra:"",fotos:[]}; const it=TW.f2.items[id]; it.e=it.e===sm.dataset.v?"":sm.dataset.v; tMarcar(); tF2Refrescar(id);
    if(it.e==="a"||it.e==="r"){ const n=document.querySelector(`[data-trow="${id}"] .t-f2n input`); if(n&&!n.value) n.focus({preventScroll:true}); } return; }
  const rs=q("[data-tresto]"); if(rs&&tEditable("f2")){ const s=F2_SECCIONES.find(z=>z[0]===rs.dataset.tresto); let n=0; for(const [id] of s[3]){ const it=TW.f2.items[id]=TW.f2.items[id]||{e:"",nota:"",extra:"",fotos:[]}; if(!it.e){ it.e="ok"; n++; } } tMarcar(); tRenderBody(true); toast(n?`${n} puntos marcados OK`:"No quedaba ninguno sin marcar"); return; }
  // FORM-04
  const f4=q("[data-tf4]"); if(f4&&tEditable("f4")){ const id=f4.dataset.tf4; TW.f4.items[id]=TW.f4.items[id]===f4.dataset.v?"":f4.dataset.v;
    if(TW.f4.items[id]==="no") TW.f4.resultado="rechazado"; tMarcar(); tRenderBody(true); return; }
  if(q("[data-tcierre]")){ try{ const r=await tApi(`fichas/${TF.orden.token}/f4-cierre`,"POST",{}); tRecibir(r); tVacias(); tRenderHead(); tRenderBody(); toast("Orden cerrada"); }catch(err){ toast(err.message); } return; }
  if(q("[data-tentregar]")){ if(!confirm("¿Marcar la orden como entregada? El cliente lo verá en su enlace.")) return; try{ await patchOrden(TF.orden.token,{estado:"entregado",nota:""}); const r=await tApi("fichas/"+TF.orden.token); tRecibir(r); tRenderHead(); tRenderBody(); toast("Entregado"); }catch(err){ toast(err.message); } return; }
  // FORM-03
  if(q("[data-tpausa]")){ $("#t-pausas").hidden=!$("#t-pausas").hidden; return; }
  const ev=q("[data-tev]"); if(ev){ const tipo=ev.dataset.tev; if(tipo==="fin"&&!confirm("¿Terminar el trabajo? Después pasa a control de calidad.")) return;
    ev.disabled=true; const ok=await tF3Post({accion:"evento",tipo,motivo:ev.dataset.motivo||"",nota:($("#t-evnota")||{}).value||""},{inicio:"Trabajo iniciado",pausa:"En pausa",reanudar:"Trabajo reanudado",fin:"Trabajo terminado: pasa a control de calidad"}[tipo]); if(!ok) ev.disabled=false; return; }
  if(q("[data-tf3datos]")){ const v=s=>($("#tf [data-f3='"+s+"']")||{}).value, b={accion:"datos",tipo:v("tipo"),hoja:v("hoja")};
    const mec=$("#tf [data-f3='mecanico']"); if(mec&&!mec.disabled) b.mecanico=mec.value;
    const est=$("#tf [data-f3='estH']"); if(est&&!est.disabled) b.estMin=Math.round(tNum(est.value)*60);
    const ta=$("#tf [data-f3='tarifa']"); if(ta&&!ta.disabled) b.tarifa=tNum(ta.value);
    await tF3Post(b,"Datos guardados"); return; }
  const co=q("[data-tcorr]"); if(co){ const f=$(`#tf [data-tcorrf="${co.dataset.tcorr}"]`); f.hidden=!f.hidden; return; }
  const cok=q("[data-tcorrok]"); if(cok){ const f=cok.closest("tr"), val=f.querySelector("[data-tcorrt]").value, m=f.querySelector("[data-tcorrm]").value.trim();
    if(!val) return toast("Pon la hora"); if(m.length<5) return toast("Escribe el motivo de la corrección");
    await tF3Post({accion:"corregir",i:+cok.dataset.tcorrok,t:new Date(val).toISOString(),motivo:m},"Hora corregida. Queda la original en el registro"); return; }
  if(q("[data-tjustificar]")){ const j=TW.j; if(!j.codigos.length) return toast("Marca al menos una causa"); if((j.explicacion||"").trim().length<5) return toast("Escribe una explicación breve");
    if(await tF3Post({accion:"justificar",...j},"Justificación guardada: falta el visto bueno del gerente")) TW.j={token:TF.orden.token,codigos:[],explicacion:"",avisado:"",mejora:""}; return; }
  if(q("[data-tvb]")){ await tF3Post({accion:"visto-bueno",nota:($("#t-vbnota")||{}).value||""},"Visto bueno dado"); return; }
});
// refresco de las fichas abiertas (otra persona ficha o firma)
setInterval(async()=>{ if(!TF||$("#s-ficha").hidden||document.hidden||TDIRTY||TSAVING) return; const foco=document.activeElement; if(foco&&foco.closest&&foco.closest("#tf")&&foco.matches("input,textarea,select")) return;
  if(document.querySelector("#tf [data-tfirma].con, #t-pausas:not([hidden]), .t-corr-f:not([hidden])")) return;
  try{ const r=await tApi("fichas/"+TF.orden.token); if(JSON.stringify(r.fichas)!==JSON.stringify(TF.fichas)||r.orden.estado!==TF.orden.estado){ tRecibir(r); tVacias(); tRenderHead(); tRenderBody(true); } else T_SKEW=Date.parse(r.ahora)-Date.now(); }catch(_){ }
},20000);

/* ---------- el cajón de la orden (gerente) enlaza con las fichas ---------- */
const _tAbrirOrdenDrawer=abrirOrden;
abrirOrden=function(token){ if(ES_EQ()) return abrirFichas(token); _tAbrirOrdenDrawer(token); };
const _tHtmlOrden=htmlOrden;
htmlOrden=function(o){ const h=_tHtmlOrden(o), f=o.fichas||{};
  const caja=`<section class="dw-box t-dwbox"><h3>Fichas SOP-01 ${o.num?`<span class="chip num">${esc(o.num)}</span>`:""}</h3><div class="t-dwrow">${tFichasChips(o)}${tPipe(o,true)}</div>
    <div class="quick" style="margin-top:10px"><button type="button" class="btn b-brand b-sm" data-tabrir="${o.token}">Abrir las fichas</button><button type="button" class="btn b-ghost b-sm" data-tpdf="${o.token}">PDF de la orden</button></div></section>`;
  const i=h.indexOf('<section class="dw-box enlace">'); return i<0?h+caja:h.slice(0,i)+caja+h.slice(i); };

/* =====================================================================
   DASHBOARD · rendimiento del taller (solo gerente)
   ===================================================================== */
const _tCargarDash=cargarDash;
cargarDash=async function(){ await _tCargarDash(); tDash(); };
async function tDash(){
  const box=$("#dash-taller"); if(!box||ES_EQ()) return;
  const desde=MES+"-01", hasta=finMes(MES)>hoyC()?hoyC():finMes(MES);
  if(MES>hoyC().slice(0,7)){ box.innerHTML=""; return; }
  try{ const [r]=await Promise.all([tApi(`resumen?desde=${desde}&hasta=${hasta}`),TEQ.length?null:tCargarEquipo()]); box.innerHTML=tDashHTML(r); }
  catch(err){ box.innerHTML=`<div class="empty">${esc(err.message)}</div>`; }
}
function tDashHTML(r){
  const ms=r.mecanicos.filter(m=>m.pagadoMin||m.prodMin).sort((a,b)=>(b.pct||0)-(a.pct||0));
  const prod=ms.reduce((a,m)=>a+m.prodMin,0), pag=ms.reduce((a,m)=>a+m.pagadoMin,0), fact=ms.reduce((a,m)=>a+m.facturable,0), ords=ms.reduce((a,m)=>a+m.ordenes,0);
  const dv=ms.filter(m=>m.desvMedia!=null), dvm=dv.length?Math.round(dv.reduce((a,m)=>a+m.desvMedia*m.ordenes,0)/Math.max(1,dv.reduce((a,m)=>a+m.ordenes,0))*10)/10:null;
  const color=p=>p==null?"":p>=85?"verde":p>=65?"ambar":"rojo";
  const icoAl={rojo:"⚠",desviacion:"⏱","visto-bueno":"✔",calidad:"✓",rechazo:"↩",f1:"✍"};
  return `<div class="t-dash">
  <div class="t-dash-h"><div><h2>Taller · ${esc(nombreMes(MES))}</h2><p class="hint">Fichajes de FORM-03 y firmas de FORM-02 y FORM-04. Horas pagadas: días laborables (lunes a viernes, sin los días cerrados de la agenda) × jornada de cada mecánico.</p></div><button type="button" class="btn b-ghost b-sm" data-tequipo>Equipo y ajustes</button></div>
  <div class="kpis"><div class="kpi"><b class="num">${pag?pct(prod,pag):"—"}</b><span>Productividad: ${tH(prod)} de trabajo de ${tH(pag)} pagadas</span></div><div class="kpi k2"><b class="num">${tPct(dvm)}</b><span>Desviación media sobre lo estimado</span></div><div class="kpi k3"><b class="num">${r.calidad.total?pct(r.calidad.primera,r.calidad.total):"—"}</b><span>Calidad a la primera (${r.calidad.primera}/${r.calidad.total})</span></div><div class="kpi k4"><b class="num">${eur(fact)}</b><span>Mano de obra de ${ords} trabajo${ords===1?"":"s"} terminado${ords===1?"":"s"}</span></div></div>
  <div class="dgrid">
    <section class="card ancho"><h3>Rendimiento por mecánico</h3><p class="hint">Horas productivas (trabajo neto fichado) frente a horas pagadas (jornada de ${esc(String(r.config.jornada).replace(".",","))} h × ${r.diasLaborables} días laborables).</p>
      ${ms.length?`<div class="t-mecs">${ms.map(m=>`<div class="t-mec"><div class="t-mec-h"><b>${esc(m.nombre)}</b><span class="num t-pct ${color(m.pct)}">${m.pct==null?"—":String(m.pct).replace(".",",")+" %"}</span></div>
        <div class="t-mbar"><i class="${color(m.pct)}" style="width:${Math.min(100,m.pct||0)}%"></i></div>
        <div class="t-mec-d"><span>${tH(m.prodMin)} de ${m.pagadoMin?tH(m.pagadoMin):"—"}</span><span>${m.ordenes} trabajo${m.ordenes===1?"":"s"}</span><span class="${m.desvMedia!=null&&m.desvMedia>r.config.umbralPct?"mal":""}">Desv. media ${tPct(m.desvMedia)}</span>${m.retrabajos?`<span class="mal">${m.retrabajos} retrabajo${m.retrabajos>1?"s":""}</span>`:""}<span>${eur(m.facturable)}</span></div></div>`).join("")}</div>`:'<p class="hint">Todavía no hay mecánicos ni fichajes este mes. Da de alta al equipo en «Equipo y ajustes».</p>'}</section>
    <section class="card"><h3>Motivos de las pausas</h3><p class="hint">Tiempo parado por motivo este mes.</p>${barrasH(r.pausas.map(p=>[p.motivo,p.min,p.n+" pausa"+(p.n>1?"s":"")]),{fmt:v=>tMin(v)})}</section>
    <section class="card"><h3>Trabajando ahora</h3>${r.enMarcha.length?`<div class="t-marcha">${r.enMarcha.map(x=>`<button type="button" class="t-ahora ${x.estado}" data-tabrir="${x.token}" data-ttab="f3"><span class="t-dot"></span><span><small>${esc(x.nombre)} · ${x.estado==="pausa"?"en pausa":"trabajando"}</small><b>${esc(x.coche)}</b></span><b class="num">${tMin(x.netoMin)}${x.estMin?` <small>/ ${tH(x.estMin)}</small>`:""}</b></button>`).join("")}</div>`:'<p class="hint">Nadie ha fichado un inicio ahora mismo.</p>'}</section>
    <section class="card ancho"><h3>Alertas del taller <span class="chip ${r.alertas.length?"rojo":"ok"}">${r.alertas.length}</span></h3>${r.alertas.length?`<div class="t-als">${r.alertas.map(a=>`<button type="button" class="t-al ${a.nivel}" data-tabrir="${a.token}" data-ttab="${{rojo:"f2",desviacion:"f3","visto-bueno":"f3",calidad:"f4",rechazo:"f3",f1:"f1"}[a.tipo]||""}"><i>${icoAl[a.tipo]||"!"}</i><span><b>${esc(a.num)}</b> ${esc(a.txt)}</span></button>`).join("")}</div>`:'<p class="hint">Todo en orden: ningún ROJO sin aprobar, ninguna desviación sin justificar.</p>'}</section>
    <section class="card ancho"><h3>Auditoría de tiempos y firmas</h3><p class="hint">Correcciones de fichajes, fichas reabiertas y vistos buenos. Solo el gerente puede hacerlos y quedan aquí.</p>${r.auditoria.length?`<div class="tabla-wrap"><table class="tabla"><tbody>${r.auditoria.map(a=>`<tr><td class="num"><small>${esc(tFH(a.t))}</small></td><td><b>${esc(T_ACC[a.accion]||a.accion)}</b><br><small>${esc(a.detalle)}</small></td><td><button type="button" class="chipb" data-tabrir="${a.token}" data-ttab="audit">${esc(a.num)}</button><br><small>${esc(a.coche)}</small></td></tr>`).join("")}</tbody></table></div>`:'<p class="hint">Sin correcciones este mes.</p>'}</section>
  </div></div>`;
}

/* =====================================================================
   EQUIPO Y AJUSTES (solo gerente)
   ===================================================================== */
async function tAbrirEquipo(){ DW={tipo:"equipo",id:"e"}; abrirDrawer('<div class="empty">Cargando…</div>');
  try{ const [eq,cfg]=await Promise.all([tApi("equipo"),tApi("config")]); TEQ=eq; tPintarEquipo(cfg); }catch(err){ $("#dw-body").innerHTML=`<div class="empty">${esc(err.message)}</div>`; } }
function tPintarEquipo(cfg){
  const roles=Object.entries(T_ROL).filter(([k])=>k!=="gerente").concat([["gerente","Gerente (ve y corrige todo)"]]);
  const fila=p=>`<details class="t-per ${p.activo?"":"baja"}"><summary><i>${esc(p.nombre.slice(0,1).toUpperCase())}</i><span><b>${esc(p.nombre)}</b><small>${esc(T_ROL[p.rol])}${p.caja&&p.rol!=="gerente"?" · caja":""} · usuario <b>${esc(p.usuario)}</b> · ${String(p.jornada).replace(".",",")} h/día${p.activo?"":" · de baja"}</small></span></summary>
    <form class="t-perf" data-tper="${esc(p.id)}"><div class="t-g2"><div class="field"><label>Nombre</label><input class="in" name="nombre" value="${esc(p.nombre)}" maxlength="40"></div><div class="field"><label>Usuario</label><input class="in" name="usuario" value="${esc(p.usuario)}" maxlength="20" autocomplete="off"></div>
    <div class="field"><label>Puesto</label><select class="in" name="rol">${roles.map(([k,t])=>`<option value="${k}" ${p.rol===k?"selected":""}>${t}</option>`).join("")}</select></div><div class="field"><label>Horas pagadas al día</label><input class="in num" name="jornada" value="${String(p.jornada).replace(".",",")}" inputmode="decimal"></div>
    <div class="field"><label>Fecha de alta</label><input class="in" type="date" name="alta" value="${esc(p.alta)}"></div><div class="field"><label>Nuevo PIN (déjalo vacío para no cambiarlo)</label><input class="in num" name="pin" inputmode="numeric" maxlength="8" autocomplete="new-password" placeholder="6 a 8 números"></div></div>
    <label class="t-chk"><input type="checkbox" name="caja" ${p.caja||p.rol==="gerente"?"checked":""} ${p.rol==="gerente"?"disabled":""}><span>Puede usar la caja (abrir, cerrar, cobrar y registrar salidas)</span></label>
    <div class="quick"><button class="btn b-brand b-sm">Guardar</button>${p.activo?`<button type="button" class="btn b-bad b-sm" data-tbaja="${esc(p.id)}">Dar de baja</button>`:`<button type="button" class="btn b-ghost b-sm" data-talta="${esc(p.id)}">Volver a activar</button>`}</div></form></details>`;
  $("#dw-body").innerHTML=`<div class="dw-head"><div><span class="tipo taller">Taller</span><h2 class="dw-nombre" style="margin:0">Equipo y ajustes</h2></div><button class="x" type="button" data-cerrar aria-label="Cerrar">✕</button></div>
    <section class="dw-box"><h3>Cómo entra el equipo</h3><p class="hint" style="margin:0">Cada persona abre <b>${esc(location.origin)}/admin</b> en la tablet o en su móvil, pulsa «Entrar como equipo del taller» y pone su usuario y PIN. Solo ve el taller: no ve coches en venta, clientes del CRM, ventas ni seguridad. Los intentos fallidos bloquean la conexión igual que con tu contraseña.</p></section>
    <section class="dw-box"><h3>Equipo</h3>${TEQ.length?TEQ.map(fila).join(""):'<p class="hint">Todavía no hay nadie. Añade a tus mecánicos abajo.</p>'}
      <details class="t-per t-nueva" ${TEQ.length?"":"open"}><summary><i>+</i><span><b>Añadir persona</b></span></summary><form class="t-perf" data-tper=""><div class="t-g2"><div class="field"><label>Nombre</label><input class="in" name="nombre" maxlength="40" required></div><div class="field"><label>Usuario (sin espacios)</label><input class="in" name="usuario" maxlength="20" autocomplete="off" required placeholder="pedro"></div>
      <div class="field"><label>Puesto</label><select class="in" name="rol">${roles.map(([k,t])=>`<option value="${k}">${t}</option>`).join("")}</select></div><div class="field"><label>Horas pagadas al día</label><input class="in num" name="jornada" value="${String(cfg.jornada).replace(".",",")}" inputmode="decimal"></div>
      <div class="field"><label>Fecha de alta</label><input class="in" type="date" name="alta" value="${hoyC()}"></div><div class="field"><label>PIN para entrar</label><input class="in num" name="pin" inputmode="numeric" maxlength="8" autocomplete="new-password" placeholder="6 a 8 números" required></div></div>
      <label class="t-chk"><input type="checkbox" name="caja"><span>Puede usar la caja (abrir, cerrar, cobrar y registrar salidas)</span></label>
      <button class="btn b-acc b-sm">Añadir</button></form></details></section>
    <section class="dw-box"><h3>Ajustes del taller</h3><form class="t-perf" data-tcfg><div class="t-g2"><div class="field"><label>Tarifa mano de obra (€/h, sin IGIC)</label><input class="in num" name="tarifa" value="${String(cfg.tarifa).replace(".",",")}" inputmode="decimal"></div><div class="field"><label>Jornada por defecto (h)</label><input class="in num" name="jornada" value="${String(cfg.jornada).replace(".",",")}" inputmode="decimal"></div>
      <div class="field"><label>Justificar si se pasa más de (%)</label><input class="in num" name="umbralPct" value="${String(cfg.umbralPct).replace(".",",")}" inputmode="decimal"></div><div class="field"><label>… o más de (minutos)</label><input class="in num" name="umbralMin" value="${cfg.umbralMin}" inputmode="numeric"></div>
      <div class="field"><label>IGIC (%)</label><input class="in num" name="igic" value="${String(cfg.igic).replace(".",",")}" inputmode="decimal"></div></div><button class="btn b-brand b-sm">Guardar ajustes</button></form></section>
    <p class="hint" style="padding-bottom:30px">Dar de baja no borra a nadie: sus fichajes siguen contando en los informes.</p>`;
}
$("#dw-body").addEventListener("submit",async e=>{ if(!DW||DW.tipo!=="equipo") return; e.preventDefault(); const f=e.target, d=Object.fromEntries(new FormData(f));
  try{ if(f.matches("[data-tcfg]")){ const cfg=await tApi("config","PUT",{tarifa:tNum(d.tarifa),jornada:tNum(d.jornada),umbralPct:tNum(d.umbralPct),umbralMin:tNum(d.umbralMin),igic:tNum(d.igic)}); tPintarEquipo(cfg); toast("Ajustes guardados"); return; }
    const id=f.dataset.tper, body={...d,jornada:tNum(d.jornada),caja:!!(f.querySelector("[name=caja]")||{}).checked}; if(!body.pin) delete body.pin;
    await tApi(id?"equipo/"+id:"equipo",id?"PUT":"POST",body); TEQ=await tApi("equipo"); tPintarEquipo(await tApi("config")); toast(id?"Guardado":"Añadido: ya puede entrar con su usuario y PIN");
  }catch(err){ toast(err.message); } });
$("#dw-body").addEventListener("click",async e=>{ if(!DW||DW.tipo!=="equipo") return; const b=e.target.closest("[data-tbaja],[data-talta]"); if(!b) return;
  try{ if(b.dataset.tbaja){ if(!confirm("¿Dar de baja? Ya no podrá entrar. Sus fichajes se conservan.")) return; await tApi("equipo/"+b.dataset.tbaja,"DELETE"); }
    else await tApi("equipo/"+b.dataset.talta,"PUT",{activo:true});
    TEQ=await tApi("equipo"); tPintarEquipo(await tApi("config")); toast("Hecho"); }catch(err){ toast(err.message); } });

/* =====================================================================
   IMPRIMIR / PDF · réplica de las fichas en papel (A4)
   ===================================================================== */
async function tPdfOrden(token){ try{ const [r]=await Promise.all([tApi("fichas/"+token),TEQ.length?null:tCargarEquipo(),typeof alCargarOrden==="function"?alCargarOrden(token):null]); const prev=TF; TF=r; tImprimir(["f1","f2","f3","f4"]); TF=prev; }catch(err){ toast(err.message); } }
function tImprimir(cuales){
  let el=$("#t-print"); if(!el){ el=document.createElement("div"); el.id="t-print"; document.body.appendChild(el); }
  const T={f1:["FORM-01","Ficha de recepción del vehículo"],f2:["FORM-02","Inspección 360°"],f3:["FORM-03","Control de tiempos"],f4:["FORM-04","Control de calidad"]};
  el.innerHTML=cuales.map(k=>`<article class="tp-pag"><header class="tp-h"><img src="/marca/logo-oscuro.svg" alt="Volcano Cars" height="26"><div><b>${T[k][1]}</b><small>Orden <b>${esc(TF.fichas.num)}</b> · ${esc((TF.orden.vehiculo.matricula||"").toUpperCase())} · ${esc(TF.orden.vehiculo.coche||"")} · ${esc(TF.orden.cliente.nombre)}</small></div><span class="tp-badge">${T[k][0]}</span></header>
    ${({f1:tP1,f2:tP2,f3:tP3,f4:tP4})[k]()}
    <footer class="tp-f">Volcano Cars · Manual SOP-01 Recepción, inspección y control de tiempos · ${T[k][0]} · Versión 1.1 · Impreso ${esc(tFH(new Date().toISOString()))}</footer></article>`).join("");
  document.body.classList.add("print-taller");
  const fin=()=>{ document.body.classList.remove("print-taller"); removeEventListener("afterprint",fin); };
  addEventListener("afterprint",fin);
  const imgs=[...el.querySelectorAll("img")].filter(i=>!i.complete);
  Promise.race([Promise.all(imgs.map(i=>new Promise(ok=>{ i.onload=i.onerror=ok; }))),new Promise(ok=>setTimeout(ok,2500))]).then(()=>setTimeout(()=>window.print(),60));
}
const tpKV=l=>`<table class="tp-kv"><tbody>${l.map(r=>`<tr>${r.map(([k,v])=>`<th>${k}</th><td>${v==null||v===""?"&nbsp;":v}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const tpFirma=(t,fi,img)=>`<div class="tp-firma"><small>${t}</small>${img?`<img src="${img}" alt="">`:"<span></span>"}<b>${fi?esc(fi.nombre)+" · "+esc(tFH(fi.t)):"&nbsp;"}</b></div>`;
function tP1(){ const x=TF.fichas.f1; if(!x) return '<p class="tp-vacio">Sin rellenar.</p>';
  const fi=([k,t])=>`<tr><td class="tp-inv">${t}</td><td class="c">${x.inventario[k]?.v==="si"?"Sí":x.inventario[k]?.v==="no"?"No":""}</td><td>${esc(x.inventario[k]?.nota||"")}</td></tr>`;
  return `${tpKV([[["Fecha / hora",esc(tF(x.fecha)+" "+x.hora)],["Recibido por",esc(x.recibidoPor)],["Entrega prometida",esc(tF(x.entregaPrometida))],["Tipo",esc({reparacion:"Reparación",compra:"Compra",retoma:"Retoma"}[x.tipoEntrada]||"")]]])}
  <h4>Cliente</h4>${tpKV([[["Nombre",esc(x.cliente.nombre)],["DNI / NIE",esc(x.cliente.doc)],["Teléfono",esc(x.cliente.telefono)]],[["Email",esc(x.cliente.email)],["Titular",esc({si:"Sí",no:"No"}[x.cliente.titular]||"")],["Contacto",esc({whatsapp:"WhatsApp",llamada:"Llamada",correo:"Correo"}[x.cliente.contacto]||"")]]])}
  <h4>Vehículo</h4>${tpKV([[["Matrícula",`<b>${esc(x.vehiculo.matricula)}</b>`],["Marca y modelo",esc(x.vehiculo.marcaModelo)],["Año · color",esc(x.vehiculo.anioColor)]],[["VIN",esc(x.vehiculo.vin)],["Km",esc(x.vehiculo.km)],["ITV",esc(tF(x.vehiculo.itv))]],[["Combustible",esc(x.vehiculo.combustible)],["Nivel",esc(x.vehiculo.nivel)],["Testigos",esc(x.vehiculo.testigos)]]])}
  <h4>Motivo de entrada (palabras del cliente)</h4><div class="tp-box">${esc(x.motivo)||"&nbsp;"}</div>
  <h4>Inventario de objetos</h4><div class="tp-2"><table class="tp-t"><tbody>${T_INV.slice(0,4).map(fi).join("")}</tbody></table><table class="tp-t"><tbody>${T_INV.slice(4).map(fi).join("")}<tr><td class="tp-inv">Nº de llaves</td><td class="c">${esc(x.llaves)}</td><td></td></tr></tbody></table></div>
  <h4>Daños previos ${x.sinDanos?"· sin daños previos (revisado con el cliente)":`· ${x.danos.length} marcado${x.danos.length===1?"":"s"}`}</h4>${tCroquisImg(x.danos)}${tLeyenda()}
  ${x.fotosDanos.length?`<div class="tp-fotos">${x.fotosDanos.slice(0,8).map(k=>`<img src="${FOTO(k)}" alt="">`).join("")}</div>`:""}
  <p class="tp-legal">Autoriza el diagnóstico hasta <b>${esc(x.autorizoHasta||"—")} €</b>. Avisos por WhatsApp: ${x.avisosWhatsApp?"sí":"no"}. El cliente confirma que los datos, el inventario y los daños anotados son correctos; cualquier trabajo que supere el importe autorizado se presupuesta y se aprueba antes.</p>
  <div class="tp-2">${tpFirma("Firma del cliente",x.firmadoCliente?{nombre:x.cliente.nombre,t:x.firmadoCliente}:null,x.firmaCliente)}${tpFirma("Recibido por el taller",x.firmaTaller)}</div>`; }
function tP2(){ const x=TF.fichas.f2; if(!x) return '<p class="tp-vacio">Sin rellenar.</p>'; const r=tResF2(x), L={ok:"OK",a:"Á",r:"R",na:"NA"};
  return `${tpKV([[["Mecánico",esc(tNombre(x.mecanico))],["Inicio",esc(tFH(x.inicio))],["Rojos",`<b class="tp-r">${r.rojos}</b>`],["Ámbar",`<b class="tp-a">${r.ambar}</b>`],["Horas est.",esc(String(x.horasEst).replace(".",","))]]])}
  <div class="tp-cols">${F2_SECCIONES.map(([S,t,sub,items])=>`<table class="tp-t tp-sem"><thead><tr><th colspan="3">${S} · ${t}</th></tr></thead><tbody>${items.map(([id,tt])=>{ const it=x.items[id]||{}; return `<tr class="e-${it.e||"x"}"><td>${id.toUpperCase()}</td><td>${tt}${it.extra?` <i>(${esc(it.extra)})</i>`:""}${it.nota?`<small>${esc(it.nota)}</small>`:""}</td><td class="c"><b>${L[it.e]||""}</b></td></tr>`; }).join("")}</tbody></table>`).join("")}</div>
  ${tpKV([[["Recomendación",esc(T_RECO[x.recomendacion]||"")],["Rechazo firmado de los ROJOS",x.rechazoFirmado?"Sí":"No"]]])}
  <div class="tp-2">${tpFirma("Firma del mecánico",x.firma)}<div></div></div>`; }
function tP3(){ const x=TF.fichas.f3; if(!x) return '<p class="tp-vacio">Sin fichajes.</p>'; const c=tCalc(x,TF.config), tn={inicio:"Inicio",pausa:"Pausa",reanudar:"Reanudar",fin:"Fin"};
  return `${tpKV([[["Mecánico",esc(tNombre(x.mecanico))],["Tipo",esc(T_TIPO3[x.tipo]||"")],["Tarifa",eur(c.tarifa)+"/h"],["Hoja",esc(x.hoja)]],[["Estimado",x.estMin?tMin(x.estMin):"—"],["Neto real",tMin(c.netoMin)],["Pausas",tMin(c.pausasMin)],["Desviación",x.estMin?tPct(c.desvPct)+" ("+tMin(c.desvMin)+")":"—"]]])}
  <h4>Fichajes</h4><table class="tp-t"><thead><tr><th>Fichaje</th><th>Fecha y hora</th><th>Quién</th><th>Motivo / nota / corrección</th></tr></thead><tbody>${[...x.eventos].sort((a,b)=>a.t.localeCompare(b.t)).map(e=>`<tr><td>${tn[e.tipo]}</td><td>${esc(tFH(e.t))}</td><td>${esc(tNombre(e.por))}</td><td>${esc(e.motivo)}${e.nota?" · "+esc(e.nota):""}${(e.corr||[]).map(k=>`<small>Corregida por ${esc(tNombre(k.por))}: antes ${esc(tFH(k.t0))} · ${esc(k.motivo)}</small>`).join("")}</td></tr>`).join("")||'<tr><td colspan="4">&nbsp;</td></tr>'}</tbody></table>
  ${tpKV([[["Mano de obra (sin IGIC)",eur(c.manoObra)],["Justificación obligatoria",c.exige?"Sí":"No"],["Retrabajos",String((x.retrabajos||[]).length)]]])}
  ${x.justificacion?`<h4>Justificación de la desviación</h4><div class="tp-box">${x.justificacion.codigos.map(k=>`<b>${k}</b> ${esc((T_JUST.find(z=>z[0]===k)||[])[1]||"")}`).join(" · ")}<br>${esc(x.justificacion.explicacion)}${x.justificacion.mejora?"<br>Mejora: "+esc(x.justificacion.mejora):""}</div>`:""}
  ${typeof AL_ORDEN!=="undefined"&&AL_ORDEN&&AL_ORDEN.token===TF.orden.token&&AL_ORDEN.recambios.some(m=>m.tipo==="salida")?`<h4>Recambios del almacén usados en esta orden</h4><table class="tp-t"><thead><tr><th>Código</th><th>Recambio</th><th>Cantidad</th><th>Quién</th><th>Cuándo</th></tr></thead><tbody>${AL_ORDEN.recambios.filter(m=>m.tipo==="salida").map(m=>`<tr><td>${esc(m.sku)}</td><td>${esc(m.nombre)}</td><td>${alN(-m.cantidad-(m.devuelto||0))} ${esc(m.unidad)}${m.devuelto?` (devuelto ${alN(m.devuelto)})`:""}</td><td>${esc(m.porNombre)}</td><td>${esc(tFH(m.t))}</td></tr>`).join("")}</tbody></table>`:""}
  <div class="tp-2">${tpFirma("Mecánico",x.justificacion?{nombre:tNombre(x.justificacion.por),t:x.justificacion.t}:null)}${tpFirma("Visto bueno del gerente",x.vistoBueno?{nombre:tNombre(x.vistoBueno.por),t:x.vistoBueno.t}:null)}</div>`; }
function tP4(){ const x=TF.fichas.f4; if(!x) return '<p class="tp-vacio">Pendiente.</p>'; const L={si:"SÍ",no:"NO",na:"NA"};
  const secs=F4_SECC.filter(s=>s[0]==="A"||s[0]==="B"||(x.destino==="venta"?s[0]==="D":s[0]==="C"));
  return `${tpKV([[["Destino",x.destino==="venta"?"Inventario de venta":"Entrega a cliente"],["Mecánico del trabajo",esc(tNombre(TF.fichas.f3&&TF.fichas.f3.mecanico))],["Intento",String(x.intentos||1)]]])}
  <div class="tp-cols">${secs.map(([S,t,items])=>`<table class="tp-t tp-sem"><thead><tr><th colspan="3">${S} · ${t}</th></tr></thead><tbody>${items.map(([id,tt])=>`<tr class="v-${x.items[id]||"x"}"><td>${id.toUpperCase()}</td><td>${tt}${x.notas[id]?`<small>${esc(x.notas[id])}</small>`:""}</td><td class="c"><b>${L[x.items[id]]||""}</b></td></tr>`).join("")}</tbody></table>`).join("")}</div>
  ${tpKV([[["Resultado",`<b>${esc(T_RES[x.resultado]||"")}</b>`],["Motivo / observaciones",esc(x.motivo)]]])}
  <div class="tp-2">${tpFirma("Control de calidad (persona distinta del mecánico)",x.firma)}${tpFirma("Cierre del gerente",x.cierreGerente?{nombre:tNombre(x.cierreGerente.por),t:x.cierreGerente.t}:null)}</div>`; }
