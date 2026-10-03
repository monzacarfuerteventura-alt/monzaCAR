/* =====================================================================
   AYUDA · VOZ DE DAN (ElevenLabs) en los vídeos de la pestaña Ayuda
   No cambia la Ayuda: se engancha a ayVidEnlazar() y añade, debajo de los pasos del vídeo,
   el interruptor «Voz de DAN», el guion y (solo gerente) el botón para generar la voz.
   Los MP3 los guarda el servidor (/api/voz) en el almacén de archivos del panel.
   Fuente: tools/voz/voz.js (+ voz.css) → python3 tools/voz/inyectar.py (después de tools/ayuda/inyectar.py)
   ===================================================================== */
/*AY_VOZ*/const AY_VOZ={"inicio":{"v":"153dcbaea8","dur":254,"l":[{"t":2.6,"x":"Esta es la puerta del panel"},{"t":21.9,"x":"Dos formas de entrar"},{"t":42.6,"x":"Escribe tu contraseña"},{"t":61.5,"x":"Pulsa Entrar"},{"t":79.4,"x":"La barra de arriba"},{"t":98.2,"x":"Las pestañas del negocio"},{"t":116.6,"x":"Más pestañas"},{"t":141.5,"x":"Los números rojos"},{"t":158.5,"x":"Abre una pestaña"},{"t":169.4,"x":"El botón ¿Cómo funciona?"},{"t":185,"x":"Los paneles que se abren al lado"},{"t":200.6,"x":"Esta pestaña de Ayuda"}]},"dash":{"v":"5dd7f44fc8","dur":381.8,"l":[{"t":2.6,"x":"Para qué sirve"},{"t":24.7,"x":"El mes y las flechas"},{"t":40.8,"x":"Informe PDF y Excel"},{"t":61,"x":"El pulso del negocio"},{"t":86.8,"x":"Toca una tarjeta"},{"t":104.8,"x":"Visitas, solicitudes y facturación"},{"t":122.2,"x":"Cómo cerrará el mes"},{"t":140.6,"x":"El simulador ¿Y si…?"},{"t":163.1,"x":"Cuándo te buscan"},{"t":181.5,"x":"Qué coches se miran"},{"t":199.9,"x":"De dónde viene el dinero"},{"t":218.3,"x":"El detalle, en cajitas"},{"t":239,"x":"Público, horarios y promedios"},{"t":256.4,"x":"Informes automáticos"},{"t":275.7,"x":"Taller, inventario y equipo"},{"t":297.8,"x":"Marketing en vivo"}]},"crm":{"v":"306f594ad9","dur":358.8,"l":[{"t":2.7,"x":"Para qué sirve"},{"t":25.2,"x":"Los botones de arriba"},{"t":45,"x":"Las cuatro tareas del día"},{"t":67.1,"x":"Buscar y cambiar de vista"},{"t":83.6,"x":"La vista Embudo"},{"t":102,"x":"La vista Clientes"},{"t":118.1,"x":"Los filtros por estado"},{"t":134.6,"x":"Cómo leer una fila"},{"t":163.2,"x":"Apuntar a un cliente nuevo"},{"t":173.6,"x":"Nombre, teléfono y qué busca"},{"t":191.6,"x":"Guardar el cliente"},{"t":201.6,"x":"Mandar un WhatsApp ya escrito"},{"t":220.4,"x":"Anotar lo que has hecho"},{"t":239.3,"x":"No olvidarte de volver a llamar"},{"t":257.2,"x":"Cambiar el estado"},{"t":281.1,"x":"Pasarlo al taller o borrarlo"}]},"agenda":{"v":"ca11770e54","dur":212.3,"l":[{"t":2.7,"x":"Para qué sirve"},{"t":22.9,"x":"La lista de citas"},{"t":47.8,"x":"Visita o taller"},{"t":66.7,"x":"Recordar la cita por WhatsApp"},{"t":86.9,"x":"Llamar al cliente"},{"t":100.6,"x":"Cuando el cliente viene"},{"t":116.7,"x":"Cancelar una cita"},{"t":136.9,"x":"Cerrar un día"},{"t":157.6,"x":"Volver a abrir un día"}]},"coches":{"v":"6937e2acbd","dur":366.4,"l":[{"t":2.7,"x":"Para qué sirve"},{"t":21,"x":"Las cifras rápidas"},{"t":35.2,"x":"Financiación en la web"},{"t":63.4,"x":"Reservas online"},{"t":90.1,"x":"Cómo te pagan la reserva"},{"t":106.2,"x":"Cerrar una reserva"},{"t":129.7,"x":"Lista de espera"},{"t":149,"x":"Tus coches"},{"t":172.9,"x":"Cambiar el estado"},{"t":189,"x":"Añadir un coche"},{"t":206,"x":"Las fotos primero"},{"t":228.5,"x":"Los datos del coche"},{"t":247,"x":"Comparar con el mercado"},{"t":265.4,"x":"Descripción y equipamiento"},{"t":280.9,"x":"Publicar"}]},"taller":{"v":"8f062a1031","dur":630.3,"l":[{"t":2.6,"x":"Para qué sirve"},{"t":26.1,"x":"Las vistas del taller"},{"t":52.4,"x":"Buscar una orden"},{"t":66.1,"x":"Los avisos"},{"t":88.2,"x":"La tabla de órdenes"},{"t":108.5,"x":"Recibir un coche"},{"t":115.7,"x":"Los datos para empezar"},{"t":138.7,"x":"Crear la orden"},{"t":152.4,"x":"FORM-01: kilómetros y combustible"},{"t":169.4,"x":"Testigos y motivo"},{"t":185.9,"x":"Inventario, llaves y daños"},{"t":208.5,"x":"Autorización y firma"},{"t":229.2,"x":"Las pestañas de la orden"},{"t":244.8,"x":"FORM-02: la inspección 360"},{"t":267.8,"x":"Notas y fotos"},{"t":289.5,"x":"Presupuesto y cliente"},{"t":313,"x":"FORM-14: la factura"},{"t":337.4,"x":"Emitir y rectificar"},{"t":360.9,"x":"Libro de facturas"},{"t":376.5,"x":"FORM-03: los tiempos"},{"t":399,"x":"Recambios y herramientas"},{"t":420.2,"x":"FORM-04: control de calidad"},{"t":444.6,"x":"Auditoría de la orden"},{"t":462.5,"x":"Imprimir y mandar el enlace"},{"t":489.1,"x":"Cerrar y entregar"}]},"tablero":{"v":"40e1eb304e","dur":174.4,"l":[{"t":2.6,"x":"Para qué sirve"},{"t":21,"x":"En marcha"},{"t":35.7,"x":"El tablero"},{"t":49.4,"x":"Leer una tarjeta"},{"t":65.9,"x":"Avisos de ITV"},{"t":81.5,"x":"Los plazos"},{"t":98.1,"x":"Avisar por WhatsApp"},{"t":115.5,"x":"Deshacer y dar de baja"},{"t":128.4,"x":"Por qué es útil"}]},"propios":{"v":"d04b242fef","dur":216.5,"l":[{"t":2.6,"x":"Para qué sirve"},{"t":23.8,"x":"Las fases"},{"t":43.6,"x":"Añadir un coche nuevo"},{"t":56.4,"x":"Los datos del coche"},{"t":75.8,"x":"Coste y precio"},{"t":90.5,"x":"Guardar"},{"t":102.4,"x":"La ficha del coche"},{"t":123.5,"x":"Mover de fase"},{"t":139.6,"x":"Piezas, horas y costes"},{"t":160.7,"x":"Coste por hora y registro"}]},"equipo":{"v":"912127a7da","dur":154.2,"l":[{"t":2.7,"x":"Para qué sirve"},{"t":17.4,"x":"Abrir Equipo y ajustes"},{"t":26.9,"x":"Cómo entra el equipo"},{"t":43.9,"x":"El equipo"},{"t":59,"x":"Añadir una persona"},{"t":74.2,"x":"El PIN y la caja"},{"t":87,"x":"Dar de baja"},{"t":99.8,"x":"Ajustes del taller"},{"t":122.8,"x":"Guardar"}]},"alm":{"v":"aa80fdc7d8","dur":309.7,"l":[{"t":2.7,"x":"Para qué sirve"},{"t":20.1,"x":"Las cuatro pestañas"},{"t":38.5,"x":"Repuestos"},{"t":56.9,"x":"Buscar y escanear"},{"t":77.1,"x":"Nueva pieza"},{"t":82.5,"x":"Rellenar la ficha"},{"t":106,"x":"Guardar"},{"t":121.6,"x":"Entrada de material"},{"t":141.4,"x":"Hacer un recuento"},{"t":162.1,"x":"Herramientas"},{"t":179,"x":"Coger y devolver"},{"t":200.2,"x":"Pedido al proveedor"},{"t":219.5,"x":"Movimientos"},{"t":236,"x":"Recuerda"}]},"caja":{"v":"74fc4ec2fc","dur":299.3,"l":[{"t":2.6,"x":"Para qué sirve"},{"t":21.9,"x":"El estado de la caja"},{"t":43.1,"x":"Los tres botones grandes"},{"t":60.1,"x":"Un cobro en efectivo"},{"t":80.3,"x":"Registrar el cobro"},{"t":96.8,"x":"Una salida de dinero"},{"t":115.7,"x":"La foto del ticket"},{"t":134,"x":"Movimientos del turno"},{"t":148.7,"x":"Cerrar la caja"},{"t":168.9,"x":"Contar con más y menos"},{"t":184.5,"x":"Comprobar y cerrar"},{"t":203.4,"x":"Abrir la caja al día siguiente"},{"t":225,"x":"Solo para el gerente"}]},"jornada":{"v":"865ea2479f","dur":156.1,"l":[{"t":2.6,"x":"Para qué sirve"},{"t":16.8,"x":"Entrar con tu usuario"},{"t":27.7,"x":"El botón grande"},{"t":41.5,"x":"Fichar la entrada"},{"t":51.9,"x":"El reloj de arriba"},{"t":64.3,"x":"Hacer una pausa"},{"t":84.5,"x":"Volver de la pausa"},{"t":92.2,"x":"Fichar la salida"},{"t":105,"x":"Si te equivocas"},{"t":118.7,"x":"Tus horas del mes"},{"t":131.5,"x":"Si te olvidas"}]},"fin":{"v":"7fbb887e8e","dur":261.3,"l":[{"t":3,"x":"Para qué sirve"},{"t":18.5,"x":"Elegir el periodo"},{"t":33.7,"x":"Los números principales"},{"t":50.3,"x":"Los gráficos"},{"t":69.6,"x":"Pendientes"},{"t":86.6,"x":"Apuntar un gasto"},{"t":91.5,"x":"Rellenar el gasto"},{"t":113,"x":"Guardar el gasto"},{"t":129.5,"x":"Cobrar con tarjeta o transferencia"},{"t":145.1,"x":"Completar la venta de un coche"},{"t":168.1,"x":"Clasificar las salidas de caja"},{"t":183.8,"x":"Facturas emitidas y recibidas"},{"t":197.1,"x":"Para la gestoría"}]},"resp":{"v":"77398ae4a6","dur":187.7,"l":[{"t":2.6,"x":"Para qué sirve"},{"t":23.3,"x":"Los tres canales"},{"t":33.3,"x":"Reseñas de Google: el nombre"},{"t":43.8,"x":"Las estrellas"},{"t":57.5,"x":"El tipo de reseña y el servicio"},{"t":77.3,"x":"Idioma, español o inglés"},{"t":89.6,"x":"Tu respuesta"},{"t":100.6,"x":"Copiar y pegar"},{"t":114.3,"x":"WhatsApp: mensajes ya escritos"},{"t":138.2,"x":"Instagram y Facebook"}]}};/*AY_VOZ_FIN*/
let VZ=null, VZ_TRIED=false, VZ_CLIPS={}, VZ_AUDIO=null;
const vzOn=()=>{ try{ return localStorage.getItem("vc_vz_on")!=="0"; }catch(_){ return true; } };
async function vzFetch(ruta,body){
  const r=await fetch(ruta,{method:body===undefined?"GET":"POST",headers:{authorization:"Bearer "+PW,...(body===undefined?{}:{"content-type":"application/json"})},body:body===undefined?undefined:JSON.stringify(body)});
  if(r.status===401){ logout("Tu sesión ha caducado. Vuelve a entrar."); throw new Error("La sesión ha caducado."); }
  return r;
}
async function vzCargar(){ try{ const r=await vzFetch("/api/voz"); VZ=r.ok?await r.json():null; }catch(_){ VZ=null; } }
function vzParar(){ if(VZ_AUDIO){ try{ VZ_AUDIO.pause(); }catch(_){ } VZ_AUDIO=null; } }
function vzLimpiar(id){ for(const k of Object.keys(VZ_CLIPS)) if(k.startsWith(id+"/")){ VZ_CLIPS[k].then(u=>u&&URL.revokeObjectURL(u)).catch(()=>{}); delete VZ_CLIPS[k]; } }
// El MP3 se pide con la sesión del panel y se guarda en memoria como blob (así suena sin esperas)
function vzClip(id,i){ const k=id+"/"+i; if(!VZ_CLIPS[k]) VZ_CLIPS[k]=vzFetch(`/api/voz/clip/${id}/${i}`).then(async r=>r.ok?URL.createObjectURL(await r.blob()):null).catch(()=>null); return VZ_CLIPS[k]; }

// Si el servidor no responde, los pasos del vídeo (ya incluidos en la Ayuda) sirven de guion para la voz del navegador
function vzGuionDe(id){ const m=VZ&&VZ.modulos&&VZ.modulos[id]; if(m) return m;
  const v=typeof AY_VID!=="undefined"&&AY_VID[id]; if(!v) return null;
  return { titulo:id, dur:v.dur, listas:0, total:(v.pasos||[]).length, lineas:(v.pasos||[]).map(p=>({t:p.t,txt:String(p.voz||p.txt).replace(/<[^>]+>/g,"")})) }; }
const vzHayVozNav=()=>"speechSynthesis" in window&&typeof window.vcDecir==="function";
function vzInfo(){ const e=$("#vz-info"); if(!e||typeof window.vcVozInfo!=="function") return; const v=window.vcVozInfo();
  e.innerHTML=v?`Voz que se usará: <b>${esc(v.name)}</b> (${esc(v.lang)}).`:`⚠️ Este aparato no tiene voz en español, así que no puede leer los pasos con claridad. Para oírlos bien: instala la voz en español del móvil (Ajustes → Idioma → Salida de texto a voz) o usa la <b>voz de ElevenLabs</b> de más abajo.`;
  e.style.color=v?"":"#FFB070"; }
const vzNf=x=>Number(x||0).toLocaleString("es-ES");
const vzHechas=()=>VZ&&VZ.modulos?Object.values(VZ.modulos).reduce((a,m)=>a+(m.listas||0),0):0;
const vzFaltan=()=>VZ&&VZ.modulos?Object.values(VZ.modulos).filter(m=>m.listas!==m.total).length:0;
const vzTotal=()=>VZ&&VZ.modulos?Object.values(VZ.modulos).reduce((a,m)=>a+(m.total||0),0):0;
// Créditos que le quedan a la cuenta de ElevenLabs (si la clave no deja verlos, no pasa nada: se avisa y se sigue)
let VZ_SALDO=null;
async function vzSaldo(){ const e=$("#vz-saldo"); if(!e) return null;
  try{ const r=await vzFetch("/api/voz/saldo"), d=await r.json().catch(()=>({})); VZ_SALDO=d&&!d.sinDatos&&typeof d.restantes==="number"?d:null;
    if(!$("#vz-saldo")) return VZ_SALDO;
    $("#vz-saldo").innerHTML=VZ_SALDO?`Créditos de ElevenLabs: te quedan <b>${vzNf(VZ_SALDO.restantes)}</b> de ${vzNf(VZ_SALDO.limite)}${VZ_SALDO.renueva?" · se renuevan el "+esc(VZ_SALDO.renueva):""}.`:`No puedo ver tu saldo desde aquí; míralo en elevenlabs.io → tu perfil → Suscripción.`;
  }catch(_){ VZ_SALDO=null; } return VZ_SALDO; }
function vozMontar(){
  const side=document.querySelector("#s-ayuda .ay-vside"), v=$("#ay-v"); if(!side||!v) return;
  const id=AY_MOD, est=typeof AY_VOZ!=="undefined"&&AY_VOZ[id];
  if(est){ vozEstMontar(side,v,id,est); return; }
  const m=vzGuionDe(id); if(!m) return;
  const old=$("#vz"); if(old) old.remove();
  const lista=!!VZ&&!!VZ.modulos&&m.listas===m.total&&m.total>0, ger=!!(VZ&&VZ.admin), conf=!!(VZ&&VZ.configurado), nombre=VZ?VZ.voz:"DAN";
  const box=document.createElement("div"); box.id="vz"; box.className="vz";
  const sw=`<label class="vz-sw"><input type="checkbox" id="vz-on" ${vzOn()?"checked":""}><span>Oír la voz mientras veo el vídeo</span></label>`;
  box.innerHTML=lista
   ?`<p class="vz-h"><b>🎙️ Voz de ${esc(nombre)}</b></p>${sw}
     <div class="vz-acc"><button type="button" class="btn b-ghost b-sm" data-vzdl="${id}">⬇ Descargar MP3</button>${ger&&conf?`<button type="button" class="btn b-ghost b-sm" data-vzgen="${id}">🔁 Volver a generar</button><button type="button" class="btn b-ghost b-sm" data-vzvoces>🎚️ Cambiar de voz</button>`:""}${ger&&conf&&vzFaltan()?`<button type="button" class="btn b-ghost b-sm" data-vzgen="*">Generar los ${vzFaltan()} vídeos que faltan</button>`:""}</div>
     <p class="vz-est" id="vz-est" role="status" aria-live="polite"></p><div id="vz-voces"></div>${ger&&conf?`<p class="hint" id="vz-saldo" style="margin:4px 0 0"></p>`:""}`
   :`<p class="vz-h"><b>🎙️ Voz</b></p>${vzHayVozNav()?`${sw}<p class="hint" style="margin:0">Suena con la voz de tu ordenador y el vídeo se para solo mientras habla. Funciona sin configurar nada.</p>
       <div class="vz-acc"><button type="button" class="btn b-ghost b-sm" data-vzprobar>🔊 Probar la voz</button></div><p class="hint" id="vz-info" style="margin:6px 0 0"></p>`
       :`<p class="hint" style="margin:0">Este navegador no tiene voz. Prueba con Chrome o Edge.</p>`}
     ${ger?`<details class="vz-g" ${conf?"":"open"}><summary>Voz más natural (ElevenLabs)</summary>
       ${conf?`<div class="vz-acc" style="margin-top:8px"><button type="button" class="btn b-brand b-sm" data-vzgen="${id}">Generar la voz de este vídeo</button><button type="button" class="btn b-ghost b-sm" data-vzgen="*">Generar los ${VZ?Object.keys(VZ.modulos).length:""} vídeos</button><button type="button" class="btn b-ghost b-sm" data-vzvoces>🎚️ Elegir voz</button></div>
       <p class="hint" style="margin:8px 0 0">Frases con voz: <b>${vzHechas()}</b> de ${vzTotal()}. Lo que ya está hecho no se vuelve a pedir ni gasta créditos.</p><p class="hint" id="vz-saldo" style="margin:4px 0 0"></p>`:""}
       <div class="vz-clave"><p class="hint" style="margin:10px 0 4px"><b>Clave de ElevenLabs</b>${conf?` · ahora hay una ${VZ.claveOrigen==="panel"?"guardada desde el panel":"puesta en Netlify"} (termina en <b>${esc(VZ.claveFin||"")}</b>)`:" · todavía no hay ninguna"}</p>
         <input id="vz-key" class="inp" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Pega aquí tu clave de ElevenLabs" aria-label="Clave de ElevenLabs">
         <div class="vz-acc"><button type="button" class="btn b-brand b-sm" data-vzclave>Guardar y comprobar la clave</button>${VZ&&VZ.claveOrigen==="panel"?`<button type="button" class="btn b-ghost b-sm" data-vzclaveborrar>Quitar la guardada</button>`:""}</div>
         <p class="hint" style="margin:6px 0 0">En elevenlabs.io: tu perfil → <b>API Keys</b> → crear clave (con todos los permisos) → copiar. Se guarda en el servidor y solo la usa el panel.</p></div></details>`:""}
    <p class="vz-est" id="vz-est" role="status" aria-live="polite"></p><div id="vz-voces"></div>
    <details class="vz-g"><summary>Ver el guion que se lee</summary><ol>${m.lineas.map(l=>`<li><small>${ayT(l.t)}</small><span>${esc(l.txt)}</span></li>`).join("")}</ol></details>`;
  side.appendChild(box);
  vzInfo(); if(window.speechSynthesis) speechSynthesis.addEventListener("voiceschanged",vzInfo,{once:true});
  if(ger&&conf) vzSaldo();
  if(lista) vzEnlazar(v,m,id); else if(vzHayVozNav()) vzNavEnlazar(v,m,id);
}
// VOZ DE DANIELA: audios ya hechos (public/ayuda/voz/<vídeo>/<frase>.mp3, se generan con tools/voz/estatica.py).
// Al llegar a cada paso el vídeo se para, Daniela lo explica y el vídeo sigue solo. No necesita ElevenLabs ni claves.
function vozEstMontar(side,v,id,est){
  const old=$("#vz"); if(old) old.remove();
  const box=document.createElement("div"); box.id="vz"; box.className="vz";
  box.innerHTML=`<p class="vz-h"><b>🎙️ Voz de Daniela</b></p>
    <label class="vz-sw"><input type="checkbox" id="vz-on" ${vzOn()?"checked":""}><span>Oír la voz mientras veo el vídeo</span></label>
    <p class="hint" style="margin:0">El vídeo se para solo mientras Daniela explica cada paso y sigue después.</p>
    <details class="vz-g"><summary>Ver el guion que se lee</summary><ol>${est.l.map(l=>`<li><small>${ayT(l.t)}</small><span>${esc(l.x)}</span></li>`).join("")}</ol></details>`;
  side.appendChild(box); vzEstEnlazar(v,est,id);
}
function vzEstEnlazar(v,est,id){
  const sw=$("#vz-on"), rot=document.querySelector("#s-ayuda .ay-vh span");
  const marca=()=>{ if(rot) rot.textContent=`${ayT(est.dur)} · ${vzOn()?"con voz de Daniela":"sin sonido"}`; }; marca();
  let hechas=new Set(), hablando=false, mio=0, aud=null, pre=null;
  const url=i=>`/ayuda/voz/${id}/${i}.mp3?v=${est.v}`;
  const precarga=i=>{ if(i<est.l.length){ pre=new Audio(); pre.preload="auto"; pre.src=url(i); } };
  const parar=()=>{ mio++; hablando=false; v._vzAuto=false; if(aud){ try{ aud.pause(); }catch(_){ } aud=null; } VZ_AUDIO=null; };
  const seguir=yo=>{ if(yo!==mio) return; hablando=false; v._vzAuto=false; aud=null; VZ_AUDIO=null; v.play().catch(()=>{}); };
  if(sw) sw.onchange=()=>{ try{ localStorage.setItem("vc_vz_on",sw.checked?"1":"0"); }catch(_){ } if(!sw.checked){ const eraAuto=hablando; parar(); if(eraAuto) v.play().catch(()=>{}); } marca(); };
  const tocar=()=>{ if(hablando||!vzOn()||v.paused||v.seeking) return;
    const i=est.l.findIndex((l,k)=>!hechas.has(k)&&v.currentTime>=l.t-0.05); if(i<0) return;
    hechas.add(i); hablando=true; const yo=++mio; v._vzAuto=true; v.pause();
    const a=(pre&&pre.src.includes(`/${i}.mp3`))?pre:new Audio(url(i)); aud=a; VZ_AUDIO=a;
    a.onended=()=>seguir(yo); a.onerror=()=>seguir(yo); a.play().catch(()=>seguir(yo));
    precarga(i+1); };
  precarga(0);
  v.addEventListener("timeupdate",tocar);
  v.addEventListener("seeked",()=>{ parar(); hechas=new Set(); est.l.forEach((l,k)=>{ if(l.t<v.currentTime-0.3) hechas.add(k); }); });
  v.addEventListener("pause",()=>{ if(!v._vzAuto) parar(); });
  v.addEventListener("play",()=>{ if(hablando&&v._vzAuto&&vzOn()) setTimeout(()=>{ if(hablando) v.pause(); },0); });
  v.addEventListener("ended",()=>{ parar(); hechas=new Set(); });
}
// Voz del navegador: al llegar a cada paso el vídeo se para, el paso se dice en voz alta y el vídeo sigue solo
function vzNavEnlazar(v,m,id){
  const sw=$("#vz-on"), rot=document.querySelector("#s-ayuda .ay-vh span");
  const marca=()=>{ if(rot) rot.textContent=`${ayT(m.dur)} · ${vzOn()?"con voz":"sin sonido"}`; }; marca();
  let hechas=new Set(), hablando=false, mio=0;
  const parar=()=>{ mio++; hablando=false; v._vzAuto=false; try{ speechSynthesis.cancel(); }catch(_){ } };
  if(sw) sw.onchange=()=>{ try{ localStorage.setItem("vc_vz_on",sw.checked?"1":"0"); }catch(_){ } if(!sw.checked){ const eraAuto=hablando; parar(); if(eraAuto) v.play().catch(()=>{}); } marca(); };
  const tocar=()=>{ if(hablando||!vzOn()||v.paused||v.seeking) return;
    const i=m.lineas.findIndex((l,k)=>!hechas.has(k)&&v.currentTime>=l.t-0.05); if(i<0) return;
    hechas.add(i); hablando=true; const yo=++mio, txt=String(m.lineas[i].voz||m.lineas[i].txt).replace(/<[^>]+>/g,""); v._vzAuto=true; v.pause();
    window.vcDecir(txt,()=>{ if(yo!==mio) return; hablando=false; v._vzAuto=false; v.play().catch(()=>{}); });
    setTimeout(()=>{ if(yo===mio&&hablando&&!speechSynthesis.speaking){ hablando=false; v._vzAuto=false; v.play().catch(()=>{}); } },1500); }; // por si el navegador no llega a hablar
  v.addEventListener("timeupdate",tocar);
  v.addEventListener("seeked",()=>{ parar(); hechas=new Set(); m.lineas.forEach((l,k)=>{ if(l.t<v.currentTime-0.3) hechas.add(k); }); });
  v.addEventListener("pause",()=>{ if(!v._vzAuto) parar(); });
  v.addEventListener("play",()=>{ if(hablando&&v._vzAuto&&vzOn()) setTimeout(()=>{ if(hablando) v.pause(); },0); });
  v.addEventListener("ended",()=>{ parar(); hechas=new Set(); });
  const prob=document.querySelector("[data-vzprobar]"); if(prob) prob.onclick=()=>window.vcDecir("Hola. Esta es la voz de las ayudas del panel de Volcano Cars. Si me oyes bien, ya puedes ver los vídeos.");
}

function vzEnlazar(v,m,id){
  const sw=$("#vz-on"), rot=document.querySelector("#s-ayuda .ay-vh span");
  const marca=()=>{ if(rot) rot.textContent=`${ayT(m.dur)} · ${vzOn()?"con voz de "+VZ.voz:"sin sonido"}`; };
  marca(); m.lineas.forEach((_,i)=>vzClip(id,i)); // precarga: cuando toque, ya está
  let cola=[], sonando=false, hechas=new Set(), gen=0;
  const parar=()=>{ gen++; cola=[]; sonando=false; vzParar(); };
  const siguiente=()=>{
    if(sonando||!cola.length||!vzOn()||v.paused) return;
    const i=cola.shift(), mio=gen; sonando=true;
    vzClip(id,i).then(u=>{
      if(mio!==gen||!u||v.paused||!vzOn()){ if(mio===gen){ sonando=false; siguiente(); } return; }
      const a=new Audio(u); VZ_AUDIO=a;
      const fin=()=>{ if(mio!==gen) return; sonando=false; VZ_AUDIO=null; siguiente(); };
      a.onended=fin; a.onerror=fin; a.play().catch(fin);
    });
  };
  if(sw) sw.onchange=()=>{ try{ localStorage.setItem("vc_vz_on",sw.checked?"1":"0"); }catch(_){ } if(!sw.checked) parar(); marca(); };
  v.addEventListener("timeupdate",()=>{ if(!vzOn()||v.paused) return;
    m.lineas.forEach((l,i)=>{ if(!hechas.has(i)&&v.currentTime>=l.t&&v.currentTime<l.t+1.3){ hechas.add(i); cola.push(i); } }); siguiente(); });
  v.addEventListener("seeking",()=>{ parar(); hechas=new Set(); m.lineas.forEach((l,i)=>{ if(l.t<v.currentTime-1.3) hechas.add(i); }); });
  v.addEventListener("pause",()=>{ if(VZ_AUDIO) VZ_AUDIO.pause(); });
  v.addEventListener("play",()=>{ if(VZ_AUDIO&&!VZ_AUDIO.ended&&vzOn()) VZ_AUDIO.play().catch(()=>{}); });
  v.addEventListener("ended",()=>{ parar(); hechas=new Set(); });
}

// Vuelve a pintar la caja de voz sin perder el aviso ni el desplegable abierto
async function vzRemontar(msg){ const abierto=!!document.querySelector("#vz details.vz-g")?.open;
  await vzCargar(); vozMontar(); const d=document.querySelector("#vz details.vz-g"); if(d&&abierto) d.open=true;
  const e=$("#vz-est"); if(e&&msg) e.textContent=msg; }
async function vzGenerar(quien){
  if(!VZ||!VZ.admin) return;
  const todos=quien==="*", ids=todos?Object.keys(VZ.modulos).filter(k=>VZ.modulos[k].listas!==VZ.modulos[k].total):[quien];
  const forzar=!todos&&!!VZ.modulos[quien]&&VZ.modulos[quien].listas===VZ.modulos[quien].total; // «Volver a generar»
  const set=t=>{ const e=$("#vz-est"); if(e) e.textContent=t; };
  // Solo las frases que aún no tienen voz: las ya hechas no se piden otra vez (cada petición gasta créditos)
  const pend=[]; for(const id of ids){ const m=VZ.modulos[id]; if(!m) continue; for(let i=0;i<m.total;i++) if(forzar||!(m.hechas&&m.hechas[i])) pend.push([id,i]); }
  if(!pend.length){ set("✅ Todo tiene ya su voz: no hace falta generar nada."); return; }
  const chars=pend.reduce((a,[id,i])=>{ const l=VZ.modulos[id].lineas[i]; return a+String(l.voz||l.txt).length; },0);
  const btns=[...document.querySelectorAll("[data-vzgen]")]; btns.forEach(b=>b.disabled=true);
  set("Mirando tu saldo de ElevenLabs…"); const sal=await vzSaldo();
  const aviso=sal&&sal.restantes<chars?`Ojo: hacen falta unos ${vzNf(chars)} créditos y te quedan ${vzNf(sal.restantes)}; llegará hasta donde alcance y lo hecho se conserva. `:"";
  const tocados=new Set(); let hechas=0, fallo=null;
  try{
    for(const [id,i] of pend){ const m=VZ.modulos[id];
      set(`${aviso}Generando «${m.titulo}»: frase ${i+1} de ${m.total} (${hechas+1} de ${pend.length})…`);
      let d={}, r=null;
      for(let intento=0;intento<2;intento++){ // un reintento solo si falla la red, nunca si ElevenLabs ya ha dicho el motivo
        try{ r=await vzFetch("/api/voz/generar",{modulo:id,n:i,forzar}); d=await r.json().catch(()=>({})); if(r.ok||r.status<500||d.fatal||d.codigo) break; }catch(e){ d={error:e.message}; r=null; }
        await new Promise(k=>setTimeout(k,1200));
      }
      tocados.add(id);
      if(!r||!r.ok){ fallo=d; throw new Error(d.error||"No se ha podido generar la voz."); }
      hechas++;
    }
    tocados.forEach(vzLimpiar); await vzRemontar(); toast("Voz lista"); const e=$("#vz-est"); if(e) e.textContent="✅ Voz lista: "+hechas+" frases generadas.";
  }catch(e){
    tocados.forEach(vzLimpiar);
    await vzRemontar(`⚠️ ${e.message}${hechas?` Se habían generado ${hechas} frases antes del fallo y se conservan.`:""}`);
    if(fallo&&fallo.eligeVoz) vzVoces();
  }
}
async function vzVoces(){
  const box=$("#vz-voces"); if(!box) return; box.innerHTML='<p class="hint">Buscando las voces de tu cuenta…</p>';
  try{ const r=await vzFetch("/api/voz/voces"), d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||"No se han podido pedir las voces.");
    if(!d.voces.length){ box.innerHTML='<p class="hint">Tu cuenta de ElevenLabs no tiene voces. Añade una en elevenlabs.io → Voices y vuelve a pulsar.</p>'; return; }
    box.innerHTML=`<label class="hint" for="vz-sel">Elige la voz que quieres oír</label><select id="vz-sel" class="inp">${d.voces.map(x=>`<option value="${esc(x.id)}" ${x.id===d.actual?"selected":""}>${esc(x.name)}${x.idioma?" · "+esc(x.idioma):""}</option>`).join("")}</select>
      <div class="vz-acc"><button type="button" class="btn b-brand b-sm" data-vzusar>Usar esta voz</button></div>`;
  }catch(e){ box.innerHTML=`<p class="hint">⚠️ ${esc(e.message)}</p>`; } }
async function vzUsar(){ const sel=$("#vz-sel"); if(!sel) return;
  try{ const r=await vzFetch("/api/voz/elegir",{id:sel.value}), d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||"No se pudo guardar.");
    await vzCargar(); vozMontar(); toast("Voz elegida: ahora pulsa «Generar los vídeos»"); }catch(e){ const x=$("#vz-est"); if(x) x.textContent="⚠️ "+e.message; } }
async function vzClave(){ const inp=$("#vz-key"), set=x=>{ const e=$("#vz-est"); if(e) e.textContent=x; }; if(!inp) return;
  const k=inp.value.trim(); if(!k){ set("⚠️ Pega primero la clave."); inp.focus(); return; }
  const b=document.querySelector("[data-vzclave]"); if(b) b.disabled=true; set("Comprobando la clave con ElevenLabs…");
  try{ const r=await vzFetch("/api/voz/clave",{clave:k}), d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.error||"No se ha podido guardar la clave.");
    inp.value=""; await vzCargar(); vozMontar(); toast("Clave guardada y comprobada"); const e=$("#vz-est"); if(e) e.textContent="✅ Clave buena. Ahora pulsa «Elegir voz» y luego «Generar los vídeos»."; vzVoces();
  }catch(e){ set("⚠️ "+e.message); if(b) b.disabled=false; } }
async function vzClaveBorrar(){ try{ await vzFetch("/api/voz/claveborrar",{}); await vzCargar(); vozMontar(); toast("Clave quitada"); }catch(e){ const x=$("#vz-est"); if(x) x.textContent="⚠️ "+e.message; } }
async function vzDescargar(id){
  const set=t=>{ const e=$("#vz-est"); if(e) e.textContent=t; };
  try{ const r=await vzFetch("/api/voz/mp3/"+id); if(!r.ok){ const d=await r.json().catch(()=>({})); throw new Error(d.error||"No se pudo descargar."); }
    const u=URL.createObjectURL(await r.blob()), a=document.createElement("a"); a.href=u; a.download=`volcano-cars-${id}-voz-dan.mp3`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); set("");
  }catch(e){ set("⚠️ "+e.message); }
}
document.addEventListener("click",e=>{ const t=e.target;
  const g=t.closest("[data-vzgen]"); if(g){ vzGenerar(g.dataset.vzgen); return; }
  const d=t.closest("[data-vzdl]"); if(d){ vzDescargar(d.dataset.vzdl); return; }
  if(t.closest("[data-vzvoces]")){ vzVoces(); return; }
  if(t.closest("[data-vzusar]")){ vzUsar(); return; }
  if(t.closest("[data-vzclave]")){ vzClave(); return; }
  if(t.closest("[data-vzclaveborrar]")){ vzClaveBorrar(); return; }
});

if(typeof ayVidEnlazar==="function"){
  const _ayVE=ayVidEnlazar;
  ayVidEnlazar=function(auto){ _ayVE(auto); vzParar();
    vozMontar(); if(!VZ&&!VZ_TRIED){ VZ_TRIED=true; vzCargar().then(()=>{ if(VZ) vozMontar(); }); } };
  const _vzShow=show;
  show=function(id){ if(id!=="s-ayuda"){ vzParar(); try{ speechSynthesis.cancel(); }catch(_){ } } return _vzShow(id); };
}
