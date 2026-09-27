/* =====================================================================
   RESPUESTAS · pestaña del gerente para contestar con un clic.
   Ahora: reseñas de Google. Los textos y el generador están en
   respuestas-datos.js; esto es solo la pantalla.
   ===================================================================== */
let RS = {canal:"google", nombre:"", estrellas:5, caso:"texto", serv:"general", destaca:[], idioma:"es", v:0, coche:"", cuando:"", link:"", tel:""};
const RS_CANALES = [["google","⭐ Reseñas de Google",true],["whatsapp","💬 WhatsApp",true],["redes","📷 Instagram y Facebook",true]];
const RS_GBP = "https://business.google.com/reviews";

function rsPintar(){
  const el = $("#rs"); if(!el) return;
  if(RS.canal==="whatsapp") return rsPintarWa(el);
  if(RS.canal==="redes") return rsPintarRedes(el);
  if(!RS_CASOS[RS.estrellas].some(c=>c[0]===RS.caso)) RS.caso = RS_CASOS[RS.estrellas][0][0];
  const texto = rsGenerar(RS);
  const chip = (attr,val,txt,on)=>`<button type="button" class="rs-chip" ${attr}="${val}" aria-pressed="${on}">${esc(txt)}</button>`;
  const positiva = RS.estrellas>=4 && RS.caso==="texto";
  el.innerHTML = `
  ${rsCanalesHtml()}
  <div class="rs-grid">
    <section class="card rs-form">
      <div class="field"><label for="rs-nombre">Nombre del cliente <small>(tal cual sale en Google)</small></label><input class="in" id="rs-nombre" value="${esc(RS.nombre)}" placeholder="Ej.: Bunny Green" autocomplete="off"></div>
      <div class="field"><label>Estrellas</label><div class="rs-stars">${[5,4,3,2,1].map(n=>`<button type="button" data-rsest="${n}" aria-pressed="${RS.estrellas===n}">${n} ★</button>`).join("")}</div></div>
      <div class="field"><label>¿Qué tipo de reseña es?</label><div class="rs-chips">${RS_CASOS[RS.estrellas].map(([k,t])=>chip("data-rscaso",k,t,RS.caso===k)).join("")}</div></div>
      ${RS.estrellas>=3 && RS.caso!=="solo"?`<div class="field"><label>¿Qué servicio usó?</label><div class="rs-chips">${RS_SERV.map(([k,t])=>chip("data-rsserv",k,t,RS.serv===k)).join("")}</div></div>`:""}
      ${positiva?`<div class="field"><label>¿Qué destaca en su reseña? <small>(hasta 2)</small></label><div class="rs-chips">${RS_DESTACA.map(([k,t])=>chip("data-rsdest",k,t,RS.destaca.includes(k))).join("")}</div></div>`:""}
      <div class="field"><label>Idioma de la reseña</label><div class="rs-chips">${chip("data-rsidi","es","Español",RS.idioma==="es")}${chip("data-rsidi","en","English",RS.idioma==="en")}</div></div>
    </section>
    <section class="card rs-out">
      <div class="rs-out-h"><h3>Tu respuesta</h3><span class="chip ${RS.estrellas>=4?"ok":RS.estrellas===3?"":"rojo"}">${RS.estrellas} ★</span></div>
      <textarea class="in" id="rs-texto" rows="14" aria-label="Respuesta para copiar">${esc(texto)}</textarea>
      <div class="quick">
        <button type="button" class="btn b-brand" data-rscopiar>Copiar respuesta</button>
        <button type="button" class="btn b-ghost" data-rsotra>↻ Otra versión</button>
        <a class="btn b-ghost" href="${RS_GBP}" target="_blank" rel="noopener">Abrir mis reseñas ↗</a>
      </div>
      <p class="hint">Puedes retocar el texto antes de copiarlo. Cambia de versión para no repetir la misma respuesta: Google y los clientes lo notan.</p>
      ${RS.estrellas<=2?`<div class="rs-aviso"><b>Antes de contestar una mala reseña:</b> no discutas en público ni des datos del cliente (matrícula, importes, averías). Lleva la conversación al teléfono. ${RS.caso==="noconsta"?"Si crees que es falsa o de otro negocio, además de contestar, denúnciala: en la reseña, <b>⋮ → Denunciar reseña</b>.":"Si lo solucionáis, puedes pedirle con amabilidad que actualice su reseña."}</div>`:""}
    </section>
  </div>
  <section class="card rs-tips"><h3>Cómo contestar bien</h3><ul>
    <li><b>Contesta en 24–48 horas</b>, también a las de 5 estrellas: Google lo tiene en cuenta y los clientes lo ven.</li>
    <li><b>Usa su nombre</b> y menciona lo que destaca: parece (y es) una respuesta de verdad.</li>
    <li><b>Nunca copies la misma respuesta</b> dos veces seguidas: pulsa «Otra versión».</li>
    <li><b>Quejas:</b> disculpa, explica en una línea y lleva la conversación al ${RS_TEL}. Nada de discusiones en público.</li>
    <li><b>Dónde se contesta:</b> Google Maps → Empresa → Reseñas → Responder, o en «Abrir mis reseñas».</li>
  </ul></section>`;
}
const rsCanalesHtml=()=>`<div class="rs-canales">${RS_CANALES.map(([k,t,ok])=>`<button type="button" class="rs-canal" data-rscanal="${k}" aria-pressed="${RS.canal===k}" ${ok?"":"disabled"}>${t}${ok?"":" <small>pronto</small>"}</button>`).join("")}</div>`;
const rsTel=t=>{ let d=String(t||"").replace(/\D/g,""); if(d.length===9) d="34"+d; return d; };
function rsPintarWa(el){
  const grupos=[...new Set(RS_WA.map(m=>m.g))], tel=rsTel(RS.tel);
  el.innerHTML = rsCanalesHtml()+`
  <section class="card rs-waform">
    <div class="field"><label for="rs-wn">Nombre</label><input class="in" id="rs-wn" data-rsw="nombre" value="${esc(RS.nombre)}" placeholder="Ej.: Pedro" autocomplete="off"></div>
    <div class="field"><label for="rs-wc">Coche</label><input class="in" id="rs-wc" data-rsw="coche" value="${esc(RS.coche)}" placeholder="Ej.: Seat Ibiza" autocomplete="off"></div>
    <div class="field"><label for="rs-wq">Día y hora</label><input class="in" id="rs-wq" data-rsw="cuando" value="${esc(RS.cuando)}" placeholder="Ej.: el martes a las 10:00" autocomplete="off"></div>
    <div class="field"><label for="rs-wl">Enlace <small>(presupuesto o ficha)</small></label><input class="in" id="rs-wl" data-rsw="link" value="${esc(RS.link)}" placeholder="https://volcanocars.com/…" autocomplete="off"></div>
    <div class="field"><label for="rs-wt">Teléfono del cliente <small>(para abrir su chat)</small></label><input class="in" id="rs-wt" data-rsw="tel" value="${esc(RS.tel)}" placeholder="Ej.: 612 345 678" inputmode="tel" autocomplete="off"></div>
    <div class="field"><label>Idioma</label><div class="rs-chips"><button type="button" class="rs-chip" data-rsidi="es" aria-pressed="${RS.idioma==="es"}">Español</button><button type="button" class="rs-chip" data-rsidi="en" aria-pressed="${RS.idioma==="en"}">English</button></div></div>
  </section>
  <p class="hint" style="margin:10px 0 14px">Rellena lo que sepas y copia el mensaje. En WhatsApp Business escribe el <b>atajo</b> (ej. <b>/cita</b>) si ya los guardaste como respuestas rápidas.</p>
  ${grupos.map(g=>`<h3 class="rs-wag">${esc(g)}</h3><div class="rs-walist">${RS_WA.filter(m=>m.g===g).map(m=>{ const x=rsWa(m,RS); return `<article class="card rs-wa"><div class="rs-wa-h"><b>${esc(m.t)}</b><code>${esc(m.a)}</code></div><p>${esc(x)}</p><div class="quick"><button type="button" class="btn b-brand b-sm" data-rswcopiar="${m.k}">Copiar</button>${tel&&m.a.startsWith("/")?`<a class="btn b-wa b-sm" target="_blank" rel="noopener" href="https://wa.me/${tel}?text=${encodeURIComponent(x)}">Abrir en WhatsApp</a>`:""}</div></article>`; }).join("")}</div>`).join("")}`;
}
/* ---------- Instagram y Facebook ---------- */
function rsPintarRedes(el){
  const grupos=[...new Set(RS_RS.map(m=>m.g))], lnk=(o,cls)=>`<a class="btn ${cls} b-sm" href="${o.url}" target="_blank" rel="noopener">${esc(o.txt)} ↗</a>`;
  el.innerHTML = rsCanalesHtml()+`
  <section class="card rs-perfiles"><div><b>Perfiles oficiales</b><p class="hint" style="margin:4px 0 0">Contesta desde la bandeja de Meta Business Suite: ahí llegan juntos los mensajes y comentarios de Instagram y Facebook.</p></div>
    <div class="quick">${lnk(RS_REDES.meta,"b-brand")}${lnk(RS_REDES.ig,"b-ghost")}${lnk(RS_REDES.igDm,"b-ghost")}${lnk(RS_REDES.fb,"b-ghost")}</div></section>
  <section class="card rs-waform">
    <div class="field"><label for="rs-rn">Nombre <small>(o @usuario)</small></label><input class="in" id="rs-rn" data-rsw="nombre" value="${esc(RS.nombre)}" placeholder="Ej.: Laura" autocomplete="off"></div>
    <div class="field"><label for="rs-rc">Coche</label><input class="in" id="rs-rc" data-rsw="coche" value="${esc(RS.coche)}" placeholder="Ej.: Opel Astra 2010" autocomplete="off"></div>
    <div class="field"><label for="rs-rq">Día y hora</label><input class="in" id="rs-rq" data-rsw="cuando" value="${esc(RS.cuando)}" placeholder="Ej.: el martes a las 10:00" autocomplete="off"></div>
    <div class="field"><label for="rs-rl">Enlace <small>(ficha del coche)</small></label><input class="in" id="rs-rl" data-rsw="link" value="${esc(RS.link)}" placeholder="https://volcanocars.com/coche/…" autocomplete="off"></div>
    <div class="field"><label>Idioma</label><div class="rs-chips"><button type="button" class="rs-chip" data-rsidi="es" aria-pressed="${RS.idioma==="es"}">Español</button><button type="button" class="rs-chip" data-rsidi="en" aria-pressed="${RS.idioma==="en"}">English</button></div></div>
  </section>
  <p class="hint" style="margin:10px 0 14px"><b>Regla de oro:</b> en público, nunca precios de reparaciones ni datos del cliente; lleva la conversación a privado o a WhatsApp. Contesta en menos de 1 hora en horario de taller: Instagram premia las cuentas que responden rápido.</p>
  ${grupos.map(g=>`<h3 class="rs-wag">${esc(g)}</h3><div class="rs-walist">${RS_RS.filter(m=>m.g===g).map(m=>{ const x=rsWa(m,RS); return `<article class="card rs-wa"><div class="rs-wa-h"><b>${esc(m.t)}</b><code>${esc(m.a)}</code></div><p>${esc(x)}</p><div class="quick"><button type="button" class="btn b-brand b-sm" data-rswcopiar="${m.k}">Copiar</button><a class="btn b-ghost b-sm" href="${m.a.includes("privado")?RS_REDES.meta.url:RS_REDES.ig.url}" target="_blank" rel="noopener">${m.a.includes("privado")?"Abrir bandeja":"Abrir Instagram"} ↗</a></div></article>`; }).join("")}</div>`).join("")}
  <section class="card rs-tips"><h3>Respuestas automáticas en Instagram y Facebook (se configuran una vez)</h3><ol style="margin:0;padding-left:20px;display:grid;gap:6px;font-size:14.5px;line-height:1.45">
    <li>Abre <a href="${RS_REDES.meta.url}" target="_blank" rel="noopener">Meta Business Suite</a> con la cuenta que administra la página «Volcanocars».</li>
    <li>Bandeja de entrada → <b>Automatizaciones</b> → <b>Respuesta instantánea</b>: pega el mensaje «Información de un coche» (versión sin enlace) y actívalo para Instagram y Facebook.</li>
    <li>En <b>Mensaje de ausencia</b> pon el horario (lunes a viernes, de 8:00 a 16:00) y el WhatsApp 643 56 60 98.</li>
    <li>En <b>Preguntas frecuentes</b> añade: «¿Dónde estáis?», «¿Financiáis?», «¿Pedir cita en el taller?» con las respuestas de esta pantalla.</li>
  </ol></section>`;
}
function rsTexto(){ const t=$("#rs-texto"); return t?t.value:""; }

/* ---------- pestaña ---------- */
TABS.resp="s-resp";
const _rsShow=show;
show=function(id){ const s=$("#s-resp"); if(s) s.hidden=id!=="s-resp"; _rsShow(id); };
const _rsTab=abrirTab;
abrirTab=function(t,push=true){ if(t==="resp"){ show("s-resp"); history.replaceState(null,"","#resp"); rsPintar(); return; } return _rsTab(t,push); };
document.addEventListener("click",e=>{ const t=e.target; if(!t.closest || !t.closest("#rs")) return;
  const c=t.closest("[data-rscanal]"); if(c&&!c.disabled){ RS.canal=c.dataset.rscanal; rsPintar(); return; }
  const s=t.closest("[data-rsest]"); if(s){ RS.estrellas=Number(s.dataset.rsest); RS.v=0; rsPintar(); return; }
  const k=t.closest("[data-rscaso]"); if(k){ RS.caso=k.dataset.rscaso; RS.v=0; rsPintar(); return; }
  const sv=t.closest("[data-rsserv]"); if(sv){ RS.serv=sv.dataset.rsserv; rsPintar(); return; }
  const d=t.closest("[data-rsdest]"); if(d){ const x=d.dataset.rsdest; RS.destaca=RS.destaca.includes(x)?RS.destaca.filter(y=>y!==x):[...RS.destaca,x].slice(-2); rsPintar(); return; }
  const i=t.closest("[data-rsidi]"); if(i){ RS.idioma=i.dataset.rsidi; rsPintar(); return; }
  if(t.closest("[data-rsotra]")){ RS.v++; rsPintar(); return; }
  const wc=t.closest("[data-rswcopiar]"); if(wc){ const m=[...RS_WA,...RS_RS].find(x=>x.k===wc.dataset.rswcopiar); const x=rsWa(m,RS); (navigator.clipboard?navigator.clipboard.writeText(x):Promise.reject()).then(()=>toast("Mensaje copiado.")).catch(()=>toast("No se pudo copiar: mantén pulsado el texto.")); return; }
  if(t.closest("[data-rscopiar]")){ const x=rsTexto(); (navigator.clipboard?navigator.clipboard.writeText(x):Promise.reject()).then(()=>toast("Respuesta copiada. Pégala en Google.")).catch(()=>{ const a=$("#rs-texto"); a.select(); document.execCommand("copy"); toast("Respuesta copiada."); }); return; }
});
document.addEventListener("change",e=>{ const f=e.target&&e.target.dataset&&e.target.dataset.rsw; if(f){ RS[f]=e.target.value; rsPintar(); } });
document.addEventListener("input",e=>{ if(e.target&&e.target.id==="rs-nombre"){ RS.nombre=e.target.value; const ta=$("#rs-texto"); if(ta) ta.value=rsGenerar(RS); } });
