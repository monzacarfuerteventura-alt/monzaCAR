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

function vozMontar(){
  const side=document.querySelector("#s-ayuda .ay-vside"), v=$("#ay-v"); if(!side||!v||!VZ||!VZ.modulos) return;
  const id=AY_MOD, m=VZ.modulos[id]; if(!m) return;
  const old=$("#vz"); if(old) old.remove();
  const lista=m.listas===m.total, ger=!!VZ.admin;
  const box=document.createElement("div"); box.id="vz"; box.className="vz";
  box.innerHTML=`<p class="vz-h"><b>🎙️ Voz de ${esc(VZ.voz)}</b></p>
    ${lista?`<label class="vz-sw"><input type="checkbox" id="vz-on" ${vzOn()?"checked":""}><span>Oír la voz mientras veo el vídeo</span></label>
       <div class="vz-acc"><button type="button" class="btn b-ghost b-sm" data-vzdl="${id}">⬇ Descargar MP3</button>${ger&&VZ.configurado?`<button type="button" class="btn b-ghost b-sm" data-vzgen="${id}">🔁 Volver a generar</button>`:""}</div>`
    :`<p class="hint" style="margin:0">Este vídeo todavía no tiene voz${m.listas?` (${m.listas} de ${m.total} frases hechas)`:""}.</p>
       ${ger?(VZ.configurado?`<div class="vz-acc"><button type="button" class="btn b-brand b-sm" data-vzgen="${id}">Generar la voz de este vídeo</button><button type="button" class="btn b-ghost b-sm" data-vzgen="*">Generar los ${Object.keys(VZ.modulos).length} vídeos</button></div>`
         :`<p class="hint" style="margin:0">Falta la clave <b>ELEVENLABS_API_KEY</b> en Netlify (Project configuration → Environment variables). Cuando la pongas, aquí saldrá el botón para generarla.</p>`):""}`}
    <p class="vz-est" id="vz-est" role="status" aria-live="polite"></p>
    <details class="vz-g"><summary>Ver el guion que se lee</summary><ol>${m.lineas.map(l=>`<li><small>${ayT(l.t)}</small><span>${esc(l.txt)}</span></li>`).join("")}</ol></details>`;
  side.appendChild(box);
  if(lista) vzEnlazar(v,m,id);
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

async function vzGenerar(quien){
  if(!VZ||!VZ.admin) return;
  const ids=quien==="*"?Object.keys(VZ.modulos).filter(k=>VZ.modulos[k].listas!==VZ.modulos[k].total):[quien];
  const set=t=>{ const e=$("#vz-est"); if(e) e.textContent=t; };
  const btns=[...document.querySelectorAll("[data-vzgen]")]; btns.forEach(b=>b.disabled=true);
  try{
    for(const id of ids){ const m=VZ.modulos[id];
      for(let i=0;i<m.total;i++){
        set(`Generando «${m.titulo}»: frase ${i+1} de ${m.total}…`);
        let d={}, r=null;
        for(let intento=0;intento<2;intento++){ // un reintento por si la red falla un instante
          try{ r=await vzFetch("/api/voz/generar",{modulo:id,n:i}); d=await r.json().catch(()=>({})); if(r.ok||r.status<500) break; }catch(e){ d={error:e.message}; r=null; }
          await new Promise(k=>setTimeout(k,1200));
        }
        if(!r||!r.ok) throw new Error(d.error||"No se ha podido generar la voz.");
      }
      vzLimpiar(id);
    }
    await vzCargar(); vozMontar(); toast("Voz lista");
  }catch(e){ set("⚠️ "+e.message); btns.forEach(b=>b.disabled=false); }
}
async function vzDescargar(id){
  const set=t=>{ const e=$("#vz-est"); if(e) e.textContent=t; };
  try{ const r=await vzFetch("/api/voz/mp3/"+id); if(!r.ok){ const d=await r.json().catch(()=>({})); throw new Error(d.error||"No se pudo descargar."); }
    const u=URL.createObjectURL(await r.blob()), a=document.createElement("a"); a.href=u; a.download=`volcano-cars-${id}-voz-dan.mp3`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000); set("");
  }catch(e){ set("⚠️ "+e.message); }
}
document.addEventListener("click",e=>{ const t=e.target;
  const g=t.closest("[data-vzgen]"); if(g){ vzGenerar(g.dataset.vzgen); return; }
  const d=t.closest("[data-vzdl]"); if(d){ vzDescargar(d.dataset.vzdl); return; }
});

if(typeof ayVidEnlazar==="function"){
  const _ayVE=ayVidEnlazar;
  ayVidEnlazar=function(auto){ _ayVE(auto); vzParar();
    if(VZ||VZ_TRIED) vozMontar(); else { VZ_TRIED=true; vzCargar().then(vozMontar); } };
  const _vzShow=show;
  show=function(id){ if(id!=="s-ayuda") vzParar(); return _vzShow(id); };
}
