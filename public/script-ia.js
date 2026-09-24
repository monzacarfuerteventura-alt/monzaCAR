/* =====================================================================
   VOLCANO CARS · ASISTENTE CON IA  (script-ia.js)
   ---------------------------------------------------------------------
   Se engancha al asistente que ya tiene la web (window.VC_BOT) sin
   rehacerlo:
   · Los atajos de siempre (Horario, Financiación, Garantía…) siguen
     igual y responden al momento, sin gastar IA.
   · Lo que el cliente ESCRIBE lo responde la IA (/api/asistente), que
     consulta el stock real, las horas libres y la financiación.
   · Si la IA propone una cita, rellena el formulario del taller (o la
     ficha del coche) que ya existe: el cliente revisa, marca la casilla
     de privacidad y confirma él.
   · Si el cliente quiere que le llamen, sale una tarjeta con nombre,
     teléfono y consentimiento que guarda en el CRM (/api/solicitudes,
     el mismo de los formularios) + botón de WhatsApp con el resumen.
   · Si la IA no está configurada o falla, contesta el asistente de
     siempre. Nada se rompe.
   Requisitos: cargar DESPUÉS del script principal de la web:
     <script src="/script-ia.js" defer></script>
   ===================================================================== */
(() => {
  "use strict";
  const B = window.VC_BOT;
  if (!B) return; // la web no tiene el asistente: no hacemos nada

  const EN = document.documentElement.lang === "en";
  const T = (es, en) => (EN ? en : es);
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const W = B.web || {};
  const g = (n) => (n === "gal" ? (W.gal ? W.gal() : undefined) : W[n]); // funciones de la web que ya existen (go, AG_T, wa…)
  const API = "/api/asistente";
  const MAX_HIST = 14;

  /* ---------------- memoria de la conversación (solo esta pestaña) ---------------- */
  const leerSS = (k, d) => { try { const v = sessionStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } };
  const ponerSS = (k, v) => { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (_) {} };
  let historial = leerSS("vc_ia_hist", []);
  let iaActiva = !leerSS("vc_ia_off", false);
  const guardarHist = () => ponerSS("vc_ia_hist", historial.slice(-MAX_HIST));
  const acciones = new Map(); let nAcc = 0;

  /* ---------------- estilos (misma paleta y formas que el chat) ---------------- */
  const css = document.createElement("style");
  css.textContent = `
  .bm.b .ia-md b{font-weight:800}
  .ia-aviso{display:block;margin-top:6px;font-size:12px;color:var(--muted);line-height:1.35}
  .ia-card{align-self:stretch;background:var(--surface);border:1.5px solid var(--line);border-radius:18px;padding:12px 12px 10px;display:grid;gap:8px;animation:bm .35s var(--ease)}
  .ia-card h5{margin:0;font-size:14px;font-weight:800}
  .ia-card p{margin:0;font-size:13px;color:var(--muted);line-height:1.4}
  .ia-card input[type=text],.ia-card input[type=tel]{width:100%;min-width:0;padding:11px 14px;border-radius:12px;border:1.5px solid var(--line);background:var(--ground);color:var(--ink);font:inherit;font-size:16px;outline:none}
  .ia-card input:focus{border-color:var(--rosso)}
  .ia-card label.ok{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;line-height:1.35;color:var(--muted)}
  .ia-card label.ok input{margin-top:2px;width:18px;height:18px;flex-shrink:0;accent-color:var(--rosso)}
  .ia-card .fila{display:flex;gap:8px;flex-wrap:wrap}
  .ia-card button[type=submit]{flex:1;min-height:44px;border:0;border-radius:999px;background:var(--rosso);color:#fff;font:inherit;font-weight:800;cursor:pointer}
  .ia-card button[disabled]{opacity:.6;cursor:wait}
  .ia-card .err{color:var(--rosso-text,#B53A12);font-size:13px;font-weight:700}
  .ia-card a.wa{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:44px;padding:0 16px;border-radius:999px;background:#1F8B4C;color:#fff;font-weight:800;text-decoration:none;font-size:14px}
  @keyframes iaFlash{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--rosso) 55%,transparent)}100%{box-shadow:0 0 0 18px transparent}}
  .ia-flash{animation:iaFlash 1.2s var(--ease) 2}
  .ia-nota{display:block;margin:10px 0 0;padding:10px 12px;border-radius:12px;background:var(--rosso-soft,#FBE6DC);color:var(--rosso-text,#B53A12);font-weight:700;font-size:14px}`;
  document.head.appendChild(css);

  /* ---------------- texto de la IA → HTML seguro (solo **negrita** y saltos) ---------------- */
  const md = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/^\s*[-•]\s+/gm, "· ");

  function escribiendo() {
    const t = document.createElement("div"); t.className = "bm b typing"; t.innerHTML = "<i></i><i></i><i></i>";
    B.M.appendChild(t); B.baja(); return t;
  }
  function burbuja(html, acts) {
    const d = document.createElement("div"); d.className = "bm b"; d.innerHTML = `<span class="ia-md">${html}</span>`; B.M.appendChild(d);
    if (acts && acts.length) { const a = document.createElement("div"); a.className = "b-acts"; a.innerHTML = acts.join(""); B.M.appendChild(a); }
    B.baja();
  }

  /* ---------------- dónde está el cliente (para que la IA tenga contexto) ---------------- */
  function pagina() {
    const modal = g("modal"), gal = g("gal");
    const cocheId = modal && modal.open && gal && gal.c ? gal.c.id : "";
    const vista = document.documentElement.dataset.vista || (location.hash || "").replace(/^#v?-?/, "") || location.pathname.replace(/\//g, "") || "inicio";
    return { vista, cocheId };
  }

  /* ---------------- resumen para WhatsApp (cierre en 1 clic) ---------------- */
  function resumenWA(extra) {
    const preguntas = historial.filter((m) => m.role === "user").slice(-3).map((m) => "· " + m.content).join("\n");
    return T("Hola Volcano Cars, vengo del asistente de la web.\n\n", "Hi Volcano Cars, I'm coming from the website assistant.\n\n")
      + (extra ? extra + "\n\n" : "")
      + (preguntas ? T("Lo que he preguntado:\n", "What I asked:\n") + preguntas : "");
  }

  /* ---------------- llamada a la IA ---------------- */
  async function preguntar(texto) {
    const ctrl = new AbortController(); const tope = setTimeout(() => ctrl.abort(), 14000);
    try {
      const r = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, signal: ctrl.signal,
        body: JSON.stringify({ mensajes: historial.slice(-MAX_HIST), idioma: EN ? "en" : "es", pagina: pagina() }) });
      const j = await r.json().catch(() => ({}));
      return { ok: r.ok && !j.sinIA && typeof j.respuesta === "string", j };
    } catch (_) { return { ok: false, j: {} }; } finally { clearTimeout(tope); }
  }

  async function procesar(texto) {
    if (!iaActiva) return B.responderClasico(texto);
    historial.push({ role: "user", content: texto.slice(0, 600) });
    const esp = escribiendo();
    const { ok, j } = await preguntar(texto);
    esp.remove();
    if (!ok) {
      historial.pop();
      if (j && j.motivo === "sin-clave") { iaActiva = false; ponerSS("vc_ia_off", true); }
      return B.responderClasico(texto); // el asistente de siempre
    }
    historial.push({ role: "assistant", content: j.respuesta.slice(0, 1200) }); guardarHist();
    pintarRespuesta(j);
  }

  function pintarRespuesta(j) {
    const acts = [];
    // coches encontrados → mismos botones que ya abren la ficha (data-car)
    (j.coches || []).slice(0, 4).forEach((c) => {
      acts.push(`<button type="button" class="b-car" data-car="${esc(c.id)}">${esc(c.titulo.split(" ").slice(0, 3).join(" "))} · ${esc(c.anio)}<span>${esc(c.precioTxt)}</span></button>`);
    });
    let tarjeta = null;
    (j.acciones || []).forEach((a) => {
      const id = "a" + (++nAcc); acciones.set(id, a);
      if (a.tipo === "cita_taller") acts.unshift(`<button type="button" class="pri" data-ia="${id}">${T("Revisar y confirmar la cita", "Review and confirm")}</button>`);
      if (a.tipo === "visita") acts.unshift(`<button type="button" class="pri" data-ia="${id}">${T("Ver el coche y elegir hora", "See the car and pick a time")}</button>`);
      if (a.tipo === "contacto") tarjeta = a;
    });
    if (!tarjeta) acts.push(B.waB(resumenWA(), T("Seguir por WhatsApp", "Continue on WhatsApp")), B.btn("menu", T("Otras opciones", "More options")));
    burbuja(md(j.respuesta), acts);
    if (tarjeta) tarjetaContacto(tarjeta);
  }

  /* ---------------- tarjeta «que me llamen» (consentimiento + CRM + WhatsApp) ---------------- */
  function tarjetaContacto(a) {
    const extra = [a.resumen && T("Consulta: ", "Request: ") + a.resumen, a.coche && T("Coche: ", "Car: ") + a.coche.titulo].filter(Boolean).join("\n");
    const waHref = g("wa") ? g("wa")(resumenWA(extra)) : "#";
    const f = document.createElement("form"); f.className = "ia-card"; f.noValidate = true;
    f.innerHTML = `<h5>${T("Te llamamos o te escribimos", "We'll call or message you")}</h5>
      <p>${esc(a.resumen || "")}</p>
      <input type="text" name="n" autocomplete="name" maxlength="80" placeholder="${T("Tu nombre", "Your name")}" aria-label="${T("Tu nombre", "Your name")}">
      <input type="tel" name="t" autocomplete="tel" maxlength="30" placeholder="${T("Tu teléfono", "Your phone")}" aria-label="${T("Tu teléfono", "Your phone")}">
      <label class="ok"><input type="checkbox" name="ok"><span>${T("Acepto que Volcano Cars use estos datos solo para responder a mi solicitud.", "I agree that Volcano Cars may use these details only to answer my request.")} <a href="/privacidad" target="_blank" rel="noopener">${T("Privacidad", "Privacy")}</a></span></label>
      <div class="err" hidden></div>
      <div class="fila"><button type="submit">${T("Enviar", "Send")}</button><a class="wa" href="${esc(waHref)}" target="_blank" rel="noopener">WhatsApp</a></div>`;
    B.M.appendChild(f); B.baja();
    f.addEventListener("submit", async (e) => {
      e.preventDefault();
      const err = f.querySelector(".err"), bt = f.querySelector("button[type=submit]");
      const nombre = f.n.value.trim(), tel = f.t.value.trim();
      const mal = (m, el) => { err.textContent = m; err.hidden = false; if (el) el.focus(); };
      if (nombre.length < 2) return mal(T("Escribe tu nombre.", "Please enter your name."), f.n);
      if (tel.replace(/\D/g, "").length < 9) return mal(T("Revisa el teléfono.", "Please check the phone number."), f.t);
      if (!f.ok.checked) return mal(T("Marca la casilla de privacidad para poder enviarlo.", "Please tick the privacy box."), f.ok);
      err.hidden = true; bt.disabled = true;
      const preguntas = historial.filter((m) => m.role === "user").slice(-4).map((m) => "· " + m.content).join("\n");
      const datos = { tipo: a.coche ? "coche" : "contacto", nombre, telefono: tel, acepta: true, web: "",
        mensaje: `[Asistente IA] ${a.resumen || ""}\n\nPreguntas del cliente:\n${preguntas}`.slice(0, 1500),
        coche: a.coche || undefined, origen: g("ORIGEN") || {}, idioma: EN ? "en" : "es" };
      try {
        const r = await fetch("/api/solicitudes", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(datos) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "");
        try { g("medir") && g("medir")("solicitud"); } catch (_) {}
        const abiertoAhora = B.abierto();
        f.innerHTML = `<h5>✓ ${T("¡Recibido!", "Got it!")}</h5><p>${abiertoAhora ? T("Te contactamos en unos minutos.", "We'll contact you within minutes.") : T("Te contactamos en cuanto abramos (L-V de 8:00 a 16:00).", "We'll contact you as soon as we open (Mon-Fri 8:00-16:00).")} ${T("Si prefieres adelantarlo, mándanos el resumen por WhatsApp:", "If you'd rather speed it up, send us the summary on WhatsApp:")}</p><div class="fila"><a class="wa" href="${esc(waHref)}" target="_blank" rel="noopener">${T("Enviar por WhatsApp", "Send on WhatsApp")}</a></div>`;
        historial.push({ role: "assistant", content: T("(El cliente ha dejado sus datos para que le contactemos.)", "(The customer left their details to be contacted.)") }); guardarHist();
        B.baja();
      } catch (e2) {
        bt.disabled = false;
        mal((e2 && e2.message) || T("No se ha podido enviar. Usa el botón de WhatsApp.", "Couldn't send it. Please use the WhatsApp button."));
      }
    });
  }

  /* ---------------- acciones sobre los formularios que ya existen ---------------- */
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  function nota(donde, txt) {
    let n = donde.querySelector(".ia-nota");
    if (!n) { n = document.createElement("p"); n.className = "ia-nota"; donde.prepend(n); }
    n.textContent = txt;
  }
  function rellenar(sel, v) { const el = $(sel); if (el && v && !el.value.trim()) { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); } }

  async function aplicarCitaTaller(a) {
    const go = g("go"), AG_T = g("AG_T");
    if (!go || !AG_T || !$("#shop-form")) return false;
    B.cerrar(); go("taller");
    const radio = document.querySelector('input[name="t-modo"][value="cita"]');
    if (radio && !radio.checked) { radio.checked = true; radio.dispatchEvent(new Event("change", { bubbles: true })); }
    (a.servicios || []).forEach((k) => { const c = $("#sv-" + k); if (c && !c.checked) c.checked = true; });
    $("#services") && $("#services").dispatchEvent(new Event("change", { bubbles: true }));
    rellenar("#t-car", a.coche); rellenar("#t-plate", a.matricula); rellenar("#t-msg", a.detalles); rellenar("#t-name", a.nombre); rellenar("#t-phone", a.telefono);
    await AG_T.cargar();
    if (a.fecha && a.hora) {
      const d = AG_T.st.dias.find((x) => x.fecha === a.fecha), h = d && d.horas.find((x) => x.hora === a.hora && x.libre);
      if (h) { AG_T.st.fecha = a.fecha; AG_T.st.hora = a.hora; AG_T.pintar(); }
    }
    try { g("actualizarPasos") && g("actualizarPasos")(); } catch (_) {}
    const panel = $("#shop-form .panel") || $("#shop-form");
    nota(panel, T("Lo ha preparado el asistente. Revisa los datos, marca la casilla de privacidad y pulsa «Confirmar cita».", "Prepared by the assistant. Check the details, tick the privacy box and press «Confirm»."));
    await esperar(120);
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
    panel.classList.remove("ia-flash"); void panel.offsetWidth; panel.classList.add("ia-flash");
    const vacio = ["#t-car", "#t-name", "#t-phone"].map((s) => $(s)).find((el) => el && !el.value.trim());
    setTimeout(() => (vacio || $("#t-ok"))?.focus({ preventScroll: true }), 700);
    return true;
  }

  async function aplicarVisita(a) {
    const el = document.querySelector(`.car[data-id="${CSS.escape(a.coche_id)}"]`), AG_B = g("AG_B");
    if (!el) return false;
    B.cerrar(); el.click();
    await esperar(250);
    const radio = document.querySelector('input[name="b-modo"][value="cita"]');
    if (radio && !radio.checked) { radio.checked = true; radio.dispatchEvent(new Event("change", { bubbles: true })); }
    if (AG_B) {
      await AG_B.cargar();
      if (a.fecha && a.hora) {
        const d = AG_B.st.dias.find((x) => x.fecha === a.fecha), h = d && d.horas.find((x) => x.hora === a.hora && x.libre);
        if (h) { AG_B.st.fecha = a.fecha; AG_B.st.hora = a.hora; AG_B.pintar(); }
      }
    }
    const form = $("#book-form");
    if (form) {
      nota(form, T("Lo ha preparado el asistente: pon tu nombre y teléfono, marca la casilla y confirma.", "Prepared by the assistant: add your name and phone, tick the box and confirm."));
      form.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => $("#b-name")?.focus({ preventScroll: true }), 600);
    }
    return true;
  }

  B.M.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-ia]"); if (!b) return;
    const a = acciones.get(b.dataset.ia); if (!a) return;
    b.disabled = true;
    const hecho = a.tipo === "cita_taller" ? await aplicarCitaTaller(a) : a.tipo === "visita" ? await aplicarVisita(a) : false;
    b.disabled = false;
    if (!hecho) burbuja(T("No he podido abrir el formulario desde aquí. Te lo paso a un asesor:", "I couldn't open the form from here. Let me pass you to an adviser:"), [B.waB(resumenWA())]);
  });

  /* ---------------- el asistente de siempre, con IA ---------------- */
  if (iaActiva) {
    const holaClasico = B.R.hola;
    B.R.hola = () => B.dice(T(
      "¡Hola! Soy el asistente de Volcano Cars. Pregúntame lo que quieras, por ejemplo: <b>«un coche de menos de 3.000 € con etiqueta C»</b> o <b>«cita para cambiar el aceite el lunes»</b>. <span class=\"ia-aviso\">Soy una inteligencia artificial y puedo equivocarme: los precios y las citas los confirmas tú en la web o con un asesor.</span>",
      "Hi! I'm the Volcano Cars assistant. Ask me anything, for example: <b>«a car under €3,000 with a C label»</b> or <b>«an oil change on Monday»</b>. <span class=\"ia-aviso\">I'm an AI and can make mistakes: you confirm prices and appointments on the website or with an adviser.</span>"), B.MENU());
    B.R.holaClasico = holaClasico;
    const inp = $("#bot-in");
    if (inp) inp.placeholder = T("Pregúntame lo que quieras…", "Ask me anything…");
  }
  B.procesar = procesar;
  window.VC_IA = { version: "1.0", activa: () => iaActiva, reiniciar() { historial = []; guardarHist(); } };
})();
