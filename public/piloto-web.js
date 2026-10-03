/* =====================================================================
   VOLCANO CARS · PILOTO DE CONVERSIÓN EN LA WEB  (piloto-web.js)
   ---------------------------------------------------------------------
   Actúa solo en la ficha del coche según las reglas que el gerente activa
   en el panel (Marketing en vivo → Piloto). Lee /api/piloto-web (datos REALES).
     1. Prueba social:  «2 personas han pedido información de este coche hoy».
        (el «N personas lo ven ahora mismo» ya lo pinta la ficha con /api/viendo)
     2. Regla A · baja conversión: muchas visitas y ninguna solicitud →
        micro-banner «Pide el informe o consulta la cuota» + destacado de
        financiación / vídeo 360°.
     3. Ventana amable (WhatsApp wa.me, gratis, sin API de pago) tras 25 s
        leyendo la ficha o al intentar salir.
     4. Regla B · hora punta: botón flotante de consulta rápida por WhatsApp.
   Nunca se inventa un número: si no hay datos, no se enseña nada.
   No usa cookies ni guarda nada personal (solo recuerda en este navegador
   que cerraste una ventana, para no insistirte).
   Si falta este archivo o la API falla, la web sigue exactamente igual.
   ===================================================================== */
(() => {
  "use strict";
  const EN = document.documentElement.lang === "en";
  const L = (es, en) => (EN ? en : es);
  const $ = (s, r = document) => r.querySelector(s);
  const modal = $("#car-modal");
  const WA = () => String((typeof EMPRESA !== "undefined" && EMPRESA.whatsapp) || "34643566098").replace(/\D/g, "");
  const wa = (t) => "https://wa.me/" + WA() + "?text=" + encodeURIComponent(t);
  const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
  const ssGet = (k) => { try { return sessionStorage.getItem(k); } catch (_) { return null; } };
  const ssSet = (k, v) => { try { sessionStorage.setItem(k, v); } catch (_) {} };
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (_) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (_) {} };
  const abierto = () => { try { return !(window.vcHorario && !window.vcHorario().abierto); } catch (_) { return true; } };

  /* ---------------- estado (reglas + datos reales) ---------------- */
  let E = null, tE = 0;
  async function cargar(forzar) {
    if (!forzar && E && Date.now() - tE < 120000) return E;
    try {
      const r = await fetch("/api/piloto-web", { credentials: "same-origin" });
      if (r.ok) { E = await r.json(); tE = Date.now(); }
    } catch (_) { /* sin datos: no se enseña nada */ }
    return E;
  }

  /* ---------------- medición de las ventanas ---------------- */
  const ya = new Set();
  function medir(tipo, acc, id) {
    const k = tipo + acc + (id || "");
    if (acc === "mostrado" && ya.has(k)) return; ya.add(k);
    try {
      const body = JSON.stringify({ tipo, acc });
      if (!(navigator.sendBeacon && navigator.sendBeacon("/api/piloto-web/evento", new Blob([body], { type: "application/json" }))))
        fetch("/api/piloto-web/evento", { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
    } catch (_) {}
  }

  /* ---------------- coche abierto ---------------- */
  const coche = () => {
    try { if (typeof gal !== "undefined" && gal && gal.c) return gal.c; } catch (_) {}
    return null;
  };
  const nombre = (c) => `${c.marca} ${c.modelo}${c.version ? " " + c.version : ""}`.trim();
  const precio = (c) => (typeof eur === "function" ? eur(c.precio) : Math.round(c.precio) + " €");
  const urlFicha = (c) => { try { return typeof fichaURL === "function" ? fichaURL(c) : location.href; } catch (_) { return location.href; } };
  const msgBase = (c) => L(`Hola, estoy viendo el ${nombre(c)} (${c.anio}, ${precio(c)}) en volcanocars.com. `, `Hi, I'm looking at the ${nombre(c)} (${c.anio}, ${precio(c)}) on volcanocars.com. `);
  const msgCoche = (c, extra) => msgBase(c) + extra + " " + urlFicha(c);

  /* ---------------- estilos ---------------- */
  function css() {
    if ($("#vc-pw-css")) return;
    const s = document.createElement("style"); s.id = "vc-pw-css";
    s.textContent = `
.vc-pw-box{display:grid;gap:10px;margin:2px 0 4px}
.vc-pw-box:empty{display:none}
.vc-pw-chips{display:flex;flex-wrap:wrap;gap:8px}
.vc-pw-chip{display:inline-flex;align-items:center;gap:8px;font-size:14px;font-weight:600;line-height:1.25;border-radius:999px;padding:8px 13px;color:var(--ink,#1B1B1A);background:var(--surface-2,#F2EFEA);border:1px solid var(--line,#DCD8D1);animation:vcpwIn .4s ease both}
.vc-pw-chip b{color:var(--rosso,#D9481C)}
.vc-pw-ban{display:grid;gap:10px;padding:13px 15px;border-radius:16px;border:1.5px solid var(--rosso,#D9481C);background:var(--rosso-soft,#FBE4DA);color:var(--ink,#1B1B1A);animation:vcpwIn .45s ease both}
.vc-pw-ban p{margin:2px 0 0;font-size:14.5px;line-height:1.4;color:var(--ink,#1B1B1A)}
.vc-pw-ban b.t{font-size:15.5px}
.vc-pw-acts{display:flex;flex-wrap:wrap;gap:8px}
.vc-pw-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:9px 16px;border-radius:12px;border:1.5px solid var(--ink,#1B1B1A);background:transparent;color:var(--ink,#1B1B1A);font:inherit;font-weight:700;font-size:14.5px;cursor:pointer;text-decoration:none;line-height:1.1}
.vc-pw-btn.pri{background:var(--rosso,#D9481C);border-color:var(--rosso,#D9481C);color:var(--rosso-ink,#fff)}
.vc-pw-btn:focus-visible,.vc-pw-x:focus-visible,.vc-pw-fab:focus-visible{outline:3px solid var(--rosso,#D9481C);outline-offset:2px}
.vc-pw-pulse{animation:vcpwPulse 1.6s ease-in-out 3;border-radius:14px}
@keyframes vcpwPulse{0%,100%{box-shadow:0 0 0 0 rgba(217,72,28,0)}50%{box-shadow:0 0 0 7px rgba(217,72,28,.28)}}
@keyframes vcpwIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.vc-pw-pop{position:fixed;z-index:90;right:18px;bottom:18px;width:min(360px,calc(100vw - 24px));padding:16px 16px 14px;border-radius:18px;background:var(--surface,#fff);color:var(--ink,#1B1B1A);border:1px solid var(--line,#DCD8D1);box-shadow:0 18px 50px rgba(0,0,0,.32);animation:vcpwUp .35s cubic-bezier(.2,.8,.2,1) both}
.vc-pw-pop p{margin:0 28px 12px 0;font-size:16px;line-height:1.4;font-weight:650}
.vc-pw-pop small{display:block;margin-top:9px;color:var(--muted,#6b6660);font-size:12.5px;line-height:1.35}
.vc-pw-x{position:absolute;top:6px;right:6px;width:36px;height:36px;border:0;border-radius:50%;background:transparent;color:var(--muted,#6b6660);font-size:22px;line-height:1;cursor:pointer}
.vc-pw-wa{background:#1F8B4C;border-color:#1F8B4C;color:#fff}
@keyframes vcpwUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
.vc-pw-fab{position:fixed;z-index:55;left:16px;bottom:calc(20px + var(--badge,0px));display:inline-flex;align-items:center;gap:9px;min-height:48px;padding:10px 18px 10px 14px;border-radius:999px;border:0;background:#1F8B4C;color:#fff;font:inherit;font-weight:800;font-size:15px;text-decoration:none;box-shadow:0 10px 28px rgba(31,139,76,.45);animation:vcpwUp .4s ease both,vcpwGlow 2.6s ease-in-out 1s infinite}
.vc-pw-fab svg{width:20px;height:20px;flex:0 0 auto}
.vc-pw-fab .x{margin-left:4px;width:26px;height:26px;display:grid;place-items:center;border-radius:50%;background:rgba(255,255,255,.2);font-size:16px;line-height:1}
@keyframes vcpwGlow{0%,100%{box-shadow:0 10px 28px rgba(31,139,76,.45)}50%{box-shadow:0 10px 28px rgba(31,139,76,.45),0 0 0 8px rgba(31,139,76,.16)}}
dialog .vc-pw-fab{position:fixed;left:14px;bottom:14px;z-index:6}
@media (max-width:760px){.vc-pw-fab{bottom:calc(150px + var(--badge,0px) + env(safe-area-inset-bottom,0px));left:12px;padding:10px 14px 10px 12px}.vc-pw-pop{right:12px;left:12px;width:auto;bottom:calc(12px + env(safe-area-inset-bottom,0px))}dialog .vc-pw-fab{bottom:calc(12px + env(safe-area-inset-bottom,0px))}}
@media (prefers-reduced-motion:reduce){.vc-pw-chip,.vc-pw-ban,.vc-pw-pop,.vc-pw-fab{animation:none}.vc-pw-pulse{animation:none;box-shadow:0 0 0 4px rgba(217,72,28,.28)}}
`;
    document.head.appendChild(s);
  }

  /* ---------------- 1 y 2 · prueba social + regla A (dentro de la ficha) ---------------- */
  let box = null;
  function pintarFicha(c) {
    quitarFicha();
    if (!E || !c || c.estado !== "disponible") return;
    const R = E.reglas || {}, d = (E.coches || {})[c.id];
    const caja = document.createElement("div"); caja.className = "vc-pw-box"; caja.id = "vc-pw-box";

    // prueba social (solo si es verdad)
    if (R.prueba && d) {
      const chips = [];
      if (d.sHoy > 0) chips.push(`📩 <span><b>${d.sHoy}</b> ${d.sHoy === 1 ? L("persona ha pedido información de este coche hoy", "person has asked about this car today") : L("personas han pedido información de este coche hoy", "people have asked about this car today")}</span>`);
      else if (d.s > 0) chips.push(`📩 <span><b>${d.s}</b> ${d.s === 1 ? L("solicitud de información", "enquiry") : L("solicitudes de información", "enquiries")} ${L("en los últimos", "in the last")} ${(R.A && R.A.dias) || 7} ${L("días", "days")}</span>`);
      if (d.p >= 3) chips.push(`👀 <span><b>${d.p}</b> ${L("personas han visto este coche en los últimos", "people have viewed this car in the last")} ${(R.A && R.A.dias) || 7} ${L("días", "days")}</span>`);
      if (chips.length) { const w = document.createElement("div"); w.className = "vc-pw-chips"; w.innerHTML = chips.map((h) => `<span class="vc-pw-chip">${h}</span>`).join(""); caja.appendChild(w); medir("prueba", "mostrado", c.id); }
    }

    // regla A · baja conversión
    if (R.A && R.A.on && d && d.banner) {
      const acc = R.A.accion || "auto";
      const tieneVideo = !!c.video, fin = $("#m-fin");
      const hayFin = !!(fin && !fin.hidden && !fin.querySelector(".fin-no"));
      const verVideo = tieneVideo && (acc === "auto" || acc === "video");
      const verFin = acc === "auto" || acc === "fin";
      const ban = document.createElement("div"); ban.className = "vc-pw-ban"; ban.setAttribute("role", "region"); ban.setAttribute("aria-label", L("Información útil sobre este coche", "Useful information about this car"));
      ban.innerHTML = `<div><b class="t">${L("Este coche está teniendo muchas visitas", "This car is getting a lot of views")}</b><p>${L("Pide el informe del vehículo o consulta la cuota de financiación.", "Ask for the vehicle report or check the finance payment.")}</p></div><div class="vc-pw-acts"></div>`;
      const acts = $(".vc-pw-acts", ban);
      const a1 = document.createElement("a"); a1.className = "vc-pw-btn pri"; a1.target = "_blank"; a1.rel = "noopener"; a1.textContent = L("📄 Pedir el informe", "📄 Ask for the report");
      a1.href = wa(msgCoche(c, L("¿Me enviáis el informe del vehículo?", "Could you send me the vehicle report?"))); a1.addEventListener("click", () => medir("banner", "clic")); acts.appendChild(a1);
      if (verFin) {
        const b = document.createElement(hayFin ? "button" : "a"); b.className = "vc-pw-btn"; b.textContent = L("💶 Ver la cuota", "💶 See the payment");
        if (hayFin) { b.type = "button"; b.addEventListener("click", () => { medir("banner", "clic"); fin.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); fin.classList.add("vc-pw-pulse"); setTimeout(() => fin.classList.remove("vc-pw-pulse"), 5200); }); }
        else { b.target = "_blank"; b.rel = "noopener"; b.href = wa(msgCoche(c, L("¿Me decís la cuota de financiación?", "Could you tell me the finance payment?"))); b.addEventListener("click", () => medir("banner", "clic")); }
        acts.appendChild(b);
      }
      if (verVideo) {
        const v = $("#m-360"), b = document.createElement("button"); b.type = "button"; b.className = "vc-pw-btn"; b.textContent = L("🎥 Ver el vídeo 360°", "🎥 Watch the 360° video");
        b.addEventListener("click", () => { medir("banner", "clic"); if (v) { v.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); v.click(); } });
        acts.appendChild(b);
      }
      caja.appendChild(ban);
      // destacado discreto del elemento real de la ficha
      const objetivo = acc === "fin" ? (hayFin ? fin : null) : acc === "video" ? (tieneVideo ? $("#m-360") : null) : (tieneVideo ? $("#m-360") : hayFin ? fin : null);
      if (objetivo) { objetivo.classList.add("vc-pw-pulse"); setTimeout(() => objetivo.classList.remove("vc-pw-pulse"), 5200); }
      medir("banner", "mostrado", c.id);
    }
    if (!caja.childNodes.length) return;
    const ancla = $("#m-sig");
    if (ancla) { ancla.insertAdjacentElement("afterend", caja); box = caja; }
  }
  function quitarFicha() { if (box) { box.remove(); box = null; } const b = $("#vc-pw-box"); if (b) b.remove(); }

  /* ---------------- 3 · lectura prolongada y gesto de salida ---------------- */
  let leido = 0, ultima = 0, tick = null, popEl = null, contactado = false, bajada = 0, previoY = 0, ultimoScroll = 0;
  const NS = "vc_pw_n", OFF = "vc_pw_off";
  const vecesSesion = () => +(ssGet(NS) || 0);
  const descartado = (id) => { try { const o = JSON.parse(lsGet(OFF) || "{}"); return o[id] && Date.now() - o[id] < 864e5; } catch (_) { return false; } };
  const descartar = (id) => { try { const o = JSON.parse(lsGet(OFF) || "{}"); o[id] = Date.now(); lsSet(OFF, JSON.stringify(o)); } catch (_) {} };
  const escribiendo = () => { const a = document.activeElement; return !!(a && modal && modal.contains(a) && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)); };
  const formConDatos = () => [...(modal ? modal.querySelectorAll("#book-form input:not([type=radio]):not([type=hidden]):not([type=checkbox]),#book-form textarea") : [])].some((i) => String(i.value || "").trim());

  function puedeMostrar(tipo, c) {
    if (!E || !c || c.estado !== "disponible" || popEl || contactado) return false;
    const R = E.reglas || {};
    if (!R[tipo] || !R[tipo].on) return false;
    if (vecesSesion() >= (R.maxSesion || 2) || ssGet("vc_pw_c_" + c.id) || descartado(c.id)) return false;
    if (escribiendo() || formConDatos()) return false;
    if (document.querySelector("dialog[open]:not(#car-modal)")) return false;
    return true;
  }
  function pop(tipo, c) {
    if (!puedeMostrar(tipo, c)) return;
    ssSet(NS, String(vecesSesion() + 1)); ssSet("vc_pw_c_" + c.id, "1");
    const video = !!c.video, abre = abierto();
    const cierre = abre ? L(" ahora mismo", " right now") : L(" y te respondemos en cuanto abramos (L–V, 8:00–16:00)", " and we'll reply as soon as we open (Mon–Fri, 8:00–16:00)");
    const que = video ? L("el vídeo 360°", "the 360° video") : L("más fotos", "more photos");
    const t = tipo === "salida"
      ? L(`Antes de irte: ¿te enviamos ${que} o resolvemos tus dudas por WhatsApp${cierre}?`, `Before you go: shall we send you ${que} or answer your questions on WhatsApp${cierre}?`)
      : L(`¿Te enviamos ${que} o resolvemos tus dudas por WhatsApp${cierre}?`, `Shall we send you ${que} or answer your questions on WhatsApp${cierre}?`);
    const texto = msgCoche(c, video ? L("¿Me podéis enviar el vídeo 360° y resolverme unas dudas?", "Could you send me the 360° video and answer a few questions?") : L("¿Me podéis enviar más fotos y resolverme unas dudas?", "Could you send me more photos and answer a few questions?"));
    const el = document.createElement("div"); el.className = "vc-pw-pop"; el.setAttribute("role", "dialog"); el.setAttribute("aria-live", "polite"); el.setAttribute("aria-label", L("Escríbenos por WhatsApp", "Message us on WhatsApp"));
    el.innerHTML = `<button type="button" class="vc-pw-x" aria-label="${L("Cerrar", "Close")}">×</button><p></p><div class="vc-pw-acts"><a class="vc-pw-btn vc-pw-wa" target="_blank" rel="noopener">💬 ${L("Escribir por WhatsApp", "Message on WhatsApp")}</a><button type="button" class="vc-pw-btn vc-pw-no">${L("Ahora no", "Not now")}</button></div><small>${L("Es un enlace de WhatsApp normal: tú decides si lo envías.", "It's a regular WhatsApp link: you decide whether to send it.")}</small>`;
    $("p", el).textContent = t; $(".vc-pw-wa", el).href = wa(texto);
    $(".vc-pw-wa", el).addEventListener("click", () => { medir(tipo, "clic"); contactado = true; cerrarPop(); });
    const no = () => { medir(tipo, "cerrado"); descartar(c.id); cerrarPop(); };
    $(".vc-pw-x", el).addEventListener("click", no); $(".vc-pw-no", el).addEventListener("click", no);
    el.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); no(); } });
    (modal && modal.open ? modal : document.body).appendChild(el); popEl = el;
    medir(tipo, "mostrado", c.id);
  }
  function cerrarPop() { if (popEl) { popEl.remove(); popEl = null; } }

  function actividad() { ultima = Date.now(); }
  function bucle() {
    if (!modal || !modal.open || document.hidden) return;
    if (Date.now() - ultima < 15000) leido++; // solo cuenta si hay actividad real (mover, tocar, desplazar)
    const R = (E && E.reglas) || {};
    if (R.lectura && R.lectura.on && leido >= (R.lectura.seg || 25)) pop("lectura", coche());
  }
  function salida(e) {
    if (!modal || !modal.open || leido < 4) return;
    if (!e.relatedTarget && e.clientY <= 8) pop("salida", coche()); // el ratón sale por arriba: va a cerrar la pestaña o a cambiar de ventana
  }
  function desplazar() { // móvil: subir de golpe hacia arriba tras haber leído abajo
    if (!modal || !modal.open) return;
    const y = modal.scrollTop, t = Date.now();
    bajada = Math.max(bajada, y);
    if (previoY - y > 140 && t - ultimoScroll < 350 && bajada > 500 && y < 260 && leido >= 8) pop("salida", coche());
    previoY = y; ultimoScroll = t; actividad();
  }
  ["pointermove", "keydown", "touchstart", "click", "wheel"].forEach((n) => document.addEventListener(n, actividad, { passive: true, capture: true }));
  document.addEventListener("mouseout", salida);
  document.addEventListener("click", (e) => { const a = e.target.closest && e.target.closest("a[href]"); if (!a) return; const h = a.getAttribute("href") || ""; if (/^https:\/\/wa\.me\/|^tel:/.test(h)) contactado = true; }, true);
  document.addEventListener("vc:solicitud", () => { contactado = true; cerrarPop(); });

  /* ---------------- 4 · regla B: botón flotante en hora punta ---------------- */
  let fab = null, fabCerrado = ssGet("vc_pw_fab") === "1";
  function waFab() { const c = modal && modal.open ? coche() : null; return c ? msgCoche(c, L("Tengo una consulta rápida.", "I have a quick question.")) : L("Hola, tengo una consulta rápida sobre Volcano Cars.", "Hi, I have a quick question about Volcano Cars."); }
  function pintarFab() {
    const on = !!(E && E.hora && E.hora.punta && E.reglas && E.reglas.B && E.reglas.B.on) && !fabCerrado;
    if (!on) { if (fab) { fab.remove(); fab = null; } return; }
    if (!fab) {
      fab = document.createElement("a"); fab.className = "vc-pw-fab"; fab.target = "_blank"; fab.rel = "noopener"; fab.id = "vc-pw-fab";
      fab.setAttribute("aria-label", L("Consulta rápida por WhatsApp", "Quick WhatsApp enquiry"));
      fab.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.5 3.5A11.8 11.8 0 0 0 12 0C5.4 0 .1 5.3.1 11.9c0 2.1.6 4.1 1.6 5.9L0 24l6.4-1.7a11.9 11.9 0 0 0 5.6 1.4h.1c6.6 0 11.9-5.3 11.9-11.9 0-3.2-1.2-6.2-3.5-8.3zM12 21.7a9.9 9.9 0 0 1-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.9 9.9 0 1 1 8.4 4.7zm5.4-7.4c-.3-.1-1.8-.9-2-1s-.5-.1-.7.1-.8 1-1 1.2-.4.2-.7.1a8 8 0 0 1-4-3.5c-.3-.5.3-.5.9-1.6.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.700 3.700 0 0 0-1.100 2.700c0 1.600 1.200 3.200 1.300 3.400s2.300 3.600 5.600 5c2 .9 2.800.9 3.800.8.600-.1 1.800-.7 2-1.400s.3-1.300.2-1.400-.3-.2-.6-.3z"/></svg><span>${L("Consulta rápida por WhatsApp", "Quick WhatsApp enquiry")}</span><i class="x" role="button" tabindex="0" aria-label="${L("Ocultar", "Hide")}">×</i>`;
      fab.addEventListener("click", (e) => {
        if (e.target.closest(".x")) { e.preventDefault(); e.stopPropagation(); fabCerrado = true; ssSet("vc_pw_fab", "1"); medir("punta", "cerrado"); pintarFab(); return; }
        medir("punta", "clic");
      });
      fab.addEventListener("keydown", (e) => { if (e.target.classList.contains("x") && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); e.target.click(); } });
      medir("punta", "mostrado", "p");
    }
    fab.href = wa(waFab());
    const dentro = modal && modal.open;
    const dest = dentro ? modal : document.body;
    if (fab.parentNode !== dest) dest.appendChild(fab);
  }

  /* ---------------- ficha abierta / cerrada ---------------- */
  async function alAbrir() {
    leido = 0; bajada = 0; previoY = 0; ultima = Date.now(); cerrarPop();
    await cargar();
    const c = coche(); if (!modal.open) return;
    pintarFicha(c); pintarFab();
  }
  function alCerrar() { leido = 0; cerrarPop(); quitarFicha(); pintarFab(); }

  function iniciar() {
    css();
    cargar().then(pintarFab);
    setInterval(() => cargar(true).then(pintarFab), 300000);
    if (!modal) return;
    let abiertaAntes = modal.open;
    new MutationObserver(() => { if (modal.open && !abiertaAntes) { abiertaAntes = true; alAbrir(); } else if (!modal.open && abiertaAntes) { abiertaAntes = false; alCerrar(); } }).observe(modal, { attributes: true, attributeFilter: ["open"] });
    modal.addEventListener("close", () => { if (abiertaAntes) { abiertaAntes = false; alCerrar(); } });
    modal.addEventListener("scroll", desplazar, { passive: true });
    tick = setInterval(bucle, 1000);
    if (modal.open) alAbrir();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar); else iniciar();
  window.VC_PILOTO = { estado: () => E, refrescar: () => cargar(true) };
})();
