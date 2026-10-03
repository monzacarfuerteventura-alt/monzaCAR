/* ---------- Piloto de conversión en la web: reglas ON/OFF (pestaña Piloto) ---------- */
const RG={r:null,e:null,res:null,cargando:false,err:""};
async function rgCargar(){
  if(RG.cargando) return; RG.cargando=true;
  try{ const d=await api("/api/piloto-web/admin"); RG.r=d.reglas; RG.e=d.estado; RG.res=d.resumen||{}; RG.err=""; }
  catch(err){ RG.err=err.message||"No se pudo cargar"; }
  RG.cargando=false; if(MK.abierto&&MK.tab==="piloto") mkPintar();
}
function rgSw(k,tit,sub,on){ return `<label class="mk-sw rg-sw"><input type="checkbox" data-rg="${k}" ${on?"checked":""}><span></span><div><b>${tit}</b><small>${sub}</small></div></label>`; }
function rgNum(k,l,v,mi,ma,suf){ return `<label class="rg-n"><span>${l}</span><input type="number" inputmode="numeric" min="${mi}" max="${ma}" value="${v}" data-rg="${k}"><em>${suf}</em></label>`; }
function rgRes(t){ const o=(RG.res||{})[t]||{}; const m=o.mostrado||0, c=o.clic||0; return m?`<small class="rg-res">Últimos 7 días: ${m} veces mostrada · ${c} toques a WhatsApp (${Math.round(c/m*100)} %)</small>`:`<small class="rg-res">Sin datos todavía</small>`; }
function rgPintar(){
  const r=RG.r;
  if(!r){ if(!RG.cargando&&!RG.err) rgCargar(); return `<section class="rg"><h4 class="mk-t">Reglas en la web</h4><p class="mk-vacio">${RG.err?esc(RG.err)+' <button type="button" class="mk-b" data-rgreint>Reintentar</button>':"Cargando reglas…"}</p></section>`; }
  const e=RG.e||{}, n=Object.values(e.coches||{}).filter(c=>c.banner).length, h=e.hora||{};
  const hp=h.desde>=0?`${String(h.desde).padStart(2,"0")}:00–${String(h.hasta%24).padStart(2,"0")}:00`:"sin datos suficientes";
  return `<section class="rg">
    <h4 class="mk-t">Reglas en la web <small>actúan solas en la ficha del coche</small></h4>
    <p class="mk-intro">Todo usa <b>datos reales</b> y enlaces gratuitos de WhatsApp (sin API de pago). Si no hay datos, no se enseña nada.</p>
    <div class="rg-card">${rgSw("prueba","Prueba social real","«N personas han pedido información hoy» y «N viendo ahora». Solo si es verdad.",r.prueba)}${rgRes("prueba")}</div>
    <div class="rg-card">${rgSw("A.on","Regla A · Poca conversión","Un coche con muchas visitas y 0 solicitudes enseña un banner y resalta Financiación o vídeo 360°.",r.A.on)}
      <div class="rg-g">${rgNum("A.visitas","Visitas (personas) a partir de",r.A.visitas,2,200,"personas")}${rgNum("A.dias","En los últimos",r.A.dias,1,14,"días")}
      <label class="rg-n"><span>Qué resaltar</span><select data-rg="A.accion"><option value="auto" ${r.A.accion==="auto"?"selected":""}>Automático</option><option value="fin" ${r.A.accion==="fin"?"selected":""}>Financiación</option><option value="video" ${r.A.accion==="video"?"selected":""}>Vídeo 360°</option><option value="informe" ${r.A.accion==="informe"?"selected":""}>Informe por WhatsApp</option></select></label></div>
      <small class="rg-res">${n?`Ahora mismo se cumple en <b>${n}</b> coche${n===1?"":"s"}.`:"Ahora mismo no se cumple en ningún coche."}</small>${rgRes("banner")}</div>
    <div class="rg-card">${rgSw("B.on","Regla B · Hora punta","En la hora de más tráfico, el botón flotante de WhatsApp se destaca en la ficha.",r.B.on)}
      <div class="rg-g"><label class="rg-n"><span>Horario</span><select data-rg="B.modo"><option value="auto" ${r.B.modo==="auto"?"selected":""}>Automático (la hora con más visitas)</option><option value="manual" ${r.B.modo==="manual"?"selected":""}>Manual</option></select></label>
      ${r.B.modo==="manual"?rgNum("B.desde","Desde las",r.B.desde,0,23,"h")+rgNum("B.hasta","Hasta las",r.B.hasta,1,24,"h"):""}</div>
      <small class="rg-res">Hora punta ahora: <b>${hp}</b>${h.punta?" · <b>activa ahora</b>":""}</small>${rgRes("punta")}</div>
    <div class="rg-card">${rgSw("lectura.on","Ventana tras leer la ficha","Si alguien lleva un rato leyendo, se le ofrece vídeo 360° o resolver dudas por WhatsApp.",r.lectura.on)}
      <div class="rg-g">${rgNum("lectura.seg","Segundos leyendo",r.lectura.seg,10,120,"s")}</div>${rgRes("lectura")}</div>
    <div class="rg-card">${rgSw("salida.on","Ventana al intentar salir","Cuando el visitante va a cerrar la ficha o la pestaña.",r.salida.on)}${rgRes("salida")}
      <div class="rg-g">${rgNum("maxSesion","Máximo de ventanas por visita",r.maxSesion,1,5,"")}</div></div>
    <div class="mk-oa"><button type="button" class="mk-b pri" data-rgguardar>Guardar reglas</button></div>
  </section>`;
}
document.addEventListener("change",e=>{ const t=e.target.closest&&e.target.closest("[data-rg]"); if(!t||!RG.r) return;
  const [a,b]=t.dataset.rg.split("."); const v=t.type==="checkbox"?t.checked:t.tagName==="SELECT"?t.value:+t.value;
  if(b) RG.r[a][b]=v; else RG.r[a]=v;
  if(t.dataset.rg==="B.modo") mkPintar(); });
document.addEventListener("click",async e=>{ const t=e.target;
  if(t.closest("[data-rgreint]")){ RG.err=""; rgCargar(); mkPintar(); return; }
  if(t.closest("[data-rgguardar]")){ const b=t.closest("[data-rgguardar]"); b.disabled=true;
    try{ const d=await api("/api/piloto-web/config",{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify(RG.r)}); RG.r=d.reglas; RG.e=d.estado; toast("Reglas guardadas: la web las aplica en menos de un minuto"); mkPintar(); }
    catch(err){ toast(err.message); b.disabled=false; } } });
