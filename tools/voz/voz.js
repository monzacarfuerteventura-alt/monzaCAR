/* =====================================================================
   AYUDA · VOZ DE DAN (ElevenLabs) en los vídeos de la pestaña Ayuda
   No cambia la Ayuda: se engancha a ayVidEnlazar() y añade, debajo de los pasos del vídeo,
   el interruptor «Voz de DAN», el guion y (solo gerente) el botón para generar la voz.
   Los MP3 los guarda el servidor (/api/voz) en el almacén de archivos del panel.
   Fuente: tools/voz/voz.js (+ voz.css) → python3 tools/voz/inyectar.py (después de tools/ayuda/inyectar.py)
   ===================================================================== */
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
  const id=AY_MOD, m=vzGuionDe(id); if(!m) return;
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
