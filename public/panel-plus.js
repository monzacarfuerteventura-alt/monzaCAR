/* =====================================================================
   VOLCANO CARS · PANEL PLUS (27-09-2026)
   1. Sonidos del panel (SFX): pasar el ratón, pulsar, enviar, avisos y vídeos.
      Se generan en el propio navegador (Web Audio): no hay archivos que descargar.
      Botón 🔊 arriba para quitarlos o ponerlos (se recuerda en cada dispositivo).
   2. Guía por voz (voz masculina en español): explica campo por campo la
      pantalla abierta, o cada campo al tocarlo (modo «Explicar al tocar»).
      En Ayuda, «Escuchar explicación» lee los pasos del módulo.
   3. Etiqueta «Powered by Netlify»: si aparece, los botones flotantes suben.
   Sin dependencias. Cumple la CSP del panel (script propio, sin eval).
   ===================================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) { } }
  };

  /* ================= 1. SONIDOS ================= */
  let AC = null, sfxOn = LS.get("vc_sfx", "1") === "1", ultimoHover = 0, ultimoHoverEl = null;
  const finoRaton = matchMedia("(hover: hover) and (pointer: fine)").matches;
  function ctx() {
    if (!AC) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; AC = new C(); }
    if (AC.state === "suspended") AC.resume().catch(() => { });
    return AC;
  }
  function tono(f1, f2, dur, vol, tipo = "sine", cuando = 0) {
    const a = ctx(); if (!a) return;
    const t = a.currentTime + cuando, o = a.createOscillator(), g = a.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f1, t); if (f2 && f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  function soplo(dur = 0.16, vol = 0.05) { // «whoosh» corto al cambiar de pestaña
    const a = ctx(); if (!a) return;
    const n = Math.floor(a.sampleRate * dur), b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime;
    f.type = "bandpass"; f.Q.value = 1.2; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(2600, t + dur);
    g.gain.value = vol; src.buffer = b; src.connect(f).connect(g).connect(a.destination); src.start(t);
  }
  const SFX = {
    hover: () => tono(2100, 2300, 0.035, 0.012, "sine"),
    click: () => { tono(720, 420, 0.06, 0.05, "triangle"); },
    tab: () => { soplo(0.14, 0.035); tono(520, 780, 0.08, 0.025, "sine", 0.02); },
    enviar: () => { tono(560, 560, 0.07, 0.04, "triangle"); tono(840, 840, 0.1, 0.04, "triangle", 0.07); },
    ok: () => { tono(660, 660, 0.09, 0.04, "sine"); tono(990, 990, 0.16, 0.04, "sine", 0.08); },
    error: () => { tono(240, 180, 0.18, 0.05, "sawtooth"); },
    play: () => tono(440, 880, 0.09, 0.035, "sine"),
    pausa: () => tono(700, 350, 0.09, 0.035, "sine"),
    salto: () => tono(1200, 1500, 0.04, 0.025, "square")
  };
  function sonar(k) { if (!sfxOn) return; try { SFX[k] && SFX[k](); } catch (_) { } }
  window.vcSonido = sonar;

  const INTERACTIVO = 'button,a[href],[role="tab"],.btn,summary,label.t-chk,[data-tab],input[type="checkbox"],input[type="radio"],select';
  document.addEventListener("pointerover", (e) => {
    if (!finoRaton || !sfxOn) return;
    const el = e.target.closest && e.target.closest(INTERACTIVO);
    if (!el || el === ultimoHoverEl || el.disabled) return;
    const ahora = performance.now(); if (ahora - ultimoHover < 70) return;
    ultimoHover = ahora; ultimoHoverEl = el; sonar("hover");
  }, { passive: true });
  document.addEventListener("pointerout", (e) => { if (e.target.closest && e.target.closest(INTERACTIVO) === ultimoHoverEl) ultimoHoverEl = null; }, { passive: true });
  document.addEventListener("pointerdown", () => ctx(), { once: true, passive: true });
  document.addEventListener("click", (e) => {
    const el = e.target.closest && e.target.closest(INTERACTIVO); if (!el || el.disabled) return;
    if (el.closest("#tabs") || el.matches('[role="tab"]')) sonar("tab"); else if (!el.matches('[type="submit"]')) sonar("click");
  }, true);
  document.addEventListener("submit", () => sonar("enviar"), true);
  // Vídeos de ayuda y del panel: reproducir, pausar y saltar a un capítulo
  document.addEventListener("play", (e) => { if (e.target.tagName === "VIDEO") sonar("play"); }, true);
  document.addEventListener("pause", (e) => { if (e.target.tagName === "VIDEO" && !e.target.ended) sonar("pausa"); }, true);
  document.addEventListener("seeked", (e) => { if (e.target.tagName === "VIDEO") sonar("salto"); }, true);
  // Avisos: los mensajes de error suenan distinto a los de «hecho»
  const MAL = /(no se ha|no se pudo|no puedes|error|falta|incorrect|caducad|no tienes|solo el|solo para|no existe|no válid|ha fallado|bloquead)/i;
  function envolverToast() {
    if (typeof window.toast !== "function" || window.toast.__vc) return;
    const orig = window.toast;
    const nuevo = function (t) { try { sonar(MAL.test(String(t)) ? "error" : "ok"); } catch (_) { } return orig.apply(this, arguments); };
    nuevo.__vc = true; window.toast = nuevo;
  }

  /* ================= 2. GUÍA POR VOZ ================= */
  const VOZ = { on: false, tocar: LS.get("vc_voz_tocar", "0") === "1", cola: [], i: 0, voz: null, marcado: null };
  const puedeHablar = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  // Voces masculinas conocidas en español (Windows, Edge «Natural», Android/Google, Apple)
  const MASC = /(pablo|alvaro|álvaro|jorge|diego|enrique|carlos|juan|raul|raúl|sergio|antonio|jose|josé|dario|darío|arnau|gerardo|jaime|male|hombre|masculin|es-es-x-eed|es-es-x-eef|es-us-x-esd|es-us-x-esf)/i;
  const FEM = /(helena|laura|elvira|lucia|lucía|monica|mónica|paulina|sabina|conchita|marisol|elena|female|mujer|es-es-x-eea|es-es-x-eec)/i;
  function elegirVoz() {
    if (!puedeHablar) return null;
    const v = speechSynthesis.getVoices(); if (!v.length) return null;
    const es = v.filter((x) => /^es(-|_|$)/i.test(x.lang));
    const pref = (l) => l.filter((x) => /es-ES/i.test(x.lang)).concat(l.filter((x) => !/es-ES/i.test(x.lang)));
    return pref(es.filter((x) => MASC.test(x.name + " " + x.voiceURI)))[0] || pref(es.filter((x) => !FEM.test(x.name + " " + x.voiceURI)))[0] || pref(es)[0] || null;
  }
  if (puedeHablar) { VOZ.voz = elegirVoz(); speechSynthesis.onvoiceschanged = () => { VOZ.voz = elegirVoz(); }; }
  function decir(texto, alTerminar) {
    if (!puedeHablar) { window.toast && window.toast("Este navegador no tiene voz. Prueba con Chrome o Edge."); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    VOZ.voz = VOZ.voz || elegirVoz();
    if (VOZ.voz) { u.voice = VOZ.voz; u.lang = VOZ.voz.lang; } else u.lang = "es-ES";
    const esMasc = VOZ.voz && MASC.test(VOZ.voz.name + " " + VOZ.voz.voiceURI);
    u.pitch = esMasc ? 0.95 : 0.72; // si no hay voz masculina instalada, se grava la que haya
    u.rate = 1.0; u.volume = 1;
    if (alTerminar) u.onend = alTerminar;
    speechSynthesis.speak(u);
  }
  window.vcDecir = decir;

  // Explicaciones propias para los campos más usados (por texto de la etiqueta)
  const EXPLICA = [
    [/matr[ií]cula/i, "Escribe la matrícula del coche tal como aparece en la placa, por ejemplo 1234 BCD. Es la llave para encontrar la orden después."],
    [/nombre del cliente|^nombre$/i, "Escribe el nombre y el primer apellido del cliente, como quiere que le llamemos."],
    [/tel[eé]fono/i, "El móvil del cliente, con WhatsApp si es posible: por ahí le mandamos avisos, presupuesto y el enlace de seguimiento."],
    [/marca y modelo|^coche$/i, "La marca y el modelo del coche, por ejemplo Seat Ibiza. Si lo sabes, añade la versión."],
    [/tipo de entrada/i, "Elige por qué entra el coche: reparación de un cliente, compra para vender, o retoma."],
    [/km|kil[oó]metros/i, "Los kilómetros que marca el cuadro al recibir el coche. Haz también la foto del cuentakilómetros."],
    [/bastidor|vin/i, "El número de bastidor de 17 caracteres. Está en la ficha técnica y en la base del parabrisas."],
    [/itv/i, "La fecha en que caduca la ITV, según la tarjeta o la pegatina del parabrisas."],
    [/combustible|nivel/i, "Marca el nivel de combustible que tiene el coche al entrar, para entregarlo igual."],
    [/motivo|qu[eé] le pasa|aver[ií]a/i, "Explica con las palabras del cliente qué le pasa al coche o qué quiere que hagamos."],
    [/entrega prometida|fecha de entrega/i, "El día y la hora en que prometemos el coche. Se le enseña al cliente en su enlace."],
    [/autoriz/i, "El importe máximo que el cliente autoriza sin volver a llamarle. Si se supera, hay que pedir permiso."],
    [/email|correo/i, "El correo del cliente, si quiere recibir la factura o el presupuesto por email. Es opcional."],
    [/fecha/i, "La fecha del día en que ocurre. Si es hoy, ya viene puesta."],
    [/categor[ií]a/i, "Elige de qué es el gasto o el ingreso: así las finanzas se ordenan solas por tipo."],
    [/proveedor|acreedor/i, "A quién le pagas: el nombre de la empresa o la persona que te hizo la factura."],
    [/n[ºo°]\.? de factura|n[uú]mero de factura/i, "El número que viene en la factura del proveedor. Sirve para encontrarla y para la gestoría."],
    [/concepto/i, "Qué has comprado o pagado, con detalle: por ejemplo, cuatro pastillas de freno para el Seat Ibiza."],
    [/base imponible/i, "El importe SIN impuestos. El IGIC y el total se calculan solos al guardar."],
    [/impuesto|igic/i, "El tipo de IGIC de la factura. Lo normal es el 7 por ciento general."],
    [/c[oó]mo se pag[oó]|forma de pago|m[eé]todo de pago/i, "Cómo se pagó: en efectivo sale de la caja; con tarjeta o transferencia, del banco."],
    [/precio|importe|pvp/i, "El precio en euros. Usa coma para los céntimos, por ejemplo 12,50."],
    [/usuario/i, "Tu nombre de usuario del taller, en minúsculas y sin espacios."],
    [/pin/i, "Tu PIN secreto de seis números. No se lo digas a nadie."],
    [/contrase[ñn]a/i, "La contraseña del panel del gerente."],
    [/enlace/i, "Pega aquí el enlace que quieras mandar: la ficha del coche o el presupuesto."],
    [/d[ií]a y hora|cu[aá]ndo/i, "El día y la hora, escritos como se los dirías al cliente, por ejemplo: el martes a las diez."],
    [/idioma/i, "Elige si el mensaje sale en español o en inglés."],
    [/estrellas/i, "Las estrellas que puso el cliente en Google: la respuesta cambia según la nota."],
    [/buscar|b[uú]squeda/i, "Escribe parte del nombre, la matrícula o el teléfono para encontrarlo al momento."],
    [/nota|observacion|comentario/i, "Anota aquí cualquier detalle importante para el resto del equipo."],
    [/foto/i, "Haz o sube las fotos. Con buena luz y sin reflejos: sirven de prueba."],
    [/firma/i, "La firma del cliente con el dedo en la pantalla. Sin firma, la ficha no se puede cerrar."]
  ];
  function textoDe(el) { return (el && (el.innerText || el.textContent) || "").replace(/\s+/g, " ").replace(/\*/g, "").trim(); }
  function etiquetaDe(el) {
    let l = el.id && document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
    if (!l) l = el.closest("label");
    if (!l) { const f = el.closest(".field"); l = f && f.querySelector("label"); }
    let t = l ? textoDe(l) : "";
    if (!t) t = el.getAttribute("aria-label") || el.getAttribute("title") || el.getAttribute("name") || "";
    return t.replace(/\s*\(.*?\)\s*/g, " ").trim();
  }
  function explicar(el) {
    const et = etiquetaDe(el), ph = el.getAttribute("placeholder") || "";
    const reg = EXPLICA.find(([r]) => r.test(et));
    const f = el.closest(".field"), hint = f && f.querySelector(".hint, small.hint, .t-hint");
    let t = et ? "Campo: " + et + ". " : "";
    if (reg) t += reg[1] + " ";
    else if (el.tagName === "SELECT") t += "Elige una opción de la lista. ";
    else if (el.type === "checkbox") t += "Marca la casilla si corresponde. ";
    else if (el.tagName === "TEXTAREA") t += "Escribe el texto con detalle. ";
    else t += "Rellena este dato. ";
    if (hint && textoDe(hint)) t += textoDe(hint) + " ";
    if (ph && !/^\s*$/.test(ph)) t += "Por ejemplo: " + ph.replace(/^Ej\.?:?\s*/i, "") + ". ";
    if (el.required) t += "Es obligatorio.";
    return t.trim();
  }
  function visible(el) { if (!el || el.disabled || el.type === "hidden") return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; }
  function camposPantalla() {
    const dlg = $$("dialog[open]").pop();
    const raiz = dlg || $$("main > section:not([hidden]), section[id^='s-']:not([hidden])").find(visible) || document.body;
    return $$("input,select,textarea", raiz).filter((x) => visible(x) && !/^(button|submit|reset|file|range|color)$/.test(x.type));
  }
  function marcar(el) {
    if (VOZ.marcado) VOZ.marcado.classList.remove("vc-voz-foco");
    VOZ.marcado = el; if (!el) return;
    el.classList.add("vc-voz-foco"); el.scrollIntoView({ block: "center", behavior: "smooth" });
  }
  function pasoGuia() {
    const panel = $("#vc-voz"); if (!VOZ.on) return;
    const el = VOZ.cola[VOZ.i];
    if (!el) { marcar(null); decir("Fin de la guía de esta pantalla. Si tienes dudas, abre Ayuda."); guiaUI(); return; }
    marcar(el); guiaUI();
    decir(explicar(el), () => { if (VOZ.on && VOZ.auto) { VOZ.i++; setTimeout(pasoGuia, 450); } });
  }
  function empezarGuia() {
    VOZ.cola = camposPantalla(); VOZ.i = 0; VOZ.on = true; VOZ.auto = true;
    const titulo = textoDe($$("section:not([hidden]) h1").find(visible)) || textoDe($("dialog[open] h2")) || "esta pantalla";
    if (!VOZ.cola.length) { decir("En " + titulo + " no hay campos para rellenar. Usa los botones de la pantalla o abre Ayuda para ver el vídeo."); VOZ.on = false; guiaUI(); return; }
    guiaUI();
    decir("Guía de " + titulo + ". Te explico " + VOZ.cola.length + " campos, uno a uno.", () => setTimeout(pasoGuia, 300));
  }
  function pararGuia() { VOZ.on = false; if (puedeHablar) speechSynthesis.cancel(); marcar(null); guiaUI(); }
  function guiaUI() {
    let p = $("#vc-voz");
    if (!p) {
      p = document.createElement("div"); p.id = "vc-voz"; p.setAttribute("role", "region"); p.setAttribute("aria-label", "Guía por voz"); p.hidden = true;
      p.innerHTML = '<b>🔈 Guía por voz</b><span id="vc-voz-n"></span><div class="vc-voz-b"><button type="button" data-vv="ant" aria-label="Campo anterior">‹</button><button type="button" data-vv="rep" aria-label="Repetir">↻</button><button type="button" data-vv="sig" aria-label="Campo siguiente">›</button><button type="button" data-vv="fin" aria-label="Terminar">✕</button></div>';
      document.body.appendChild(p);
      p.addEventListener("click", (e) => {
        const b = e.target.closest("[data-vv]"); if (!b) return; const a = b.dataset.vv;
        if (a === "fin") return pararGuia();
        if (a === "sig") VOZ.i = Math.min(VOZ.i + 1, VOZ.cola.length); if (a === "ant") VOZ.i = Math.max(0, VOZ.i - 1);
        VOZ.auto = a !== "rep" ? VOZ.auto : VOZ.auto; pasoGuia();
      });
    }
    p.hidden = !VOZ.on;
    const n = $("#vc-voz-n"); if (n) n.textContent = VOZ.cola.length ? " " + Math.min(VOZ.i + 1, VOZ.cola.length) + " de " + VOZ.cola.length : "";
  }
  // «Explicar al tocar»: al entrar en un campo, la voz lo explica
  document.addEventListener("focusin", (e) => {
    if (!VOZ.tocar || VOZ.on) return; const el = e.target;
    if (!el.matches || !el.matches("input,select,textarea") || /^(button|submit|hidden)$/.test(el.type)) return;
    decir(explicar(el));
  });

  /* ---------- botones de la barra superior ---------- */
  function botones() {
    const top = $("#topacts"); if (!top || $("#vc-bsfx")) return;
    const mk = (id, txt, aria) => { const b = document.createElement("button"); b.type = "button"; b.id = id; b.className = "btn b-ghost b-sm vc-bt"; b.setAttribute("aria-label", aria); b.title = aria; b.innerHTML = txt; return b; };
    const bs = mk("vc-bsfx", sfxOn ? "🔊" : "🔇", "Sonidos del panel");
    const bv = mk("vc-bvoz", "🗣️<span> Guía por voz</span>", "Guía por voz: te explica cada campo");
    bs.setAttribute("aria-pressed", String(sfxOn));
    bs.onclick = () => { sfxOn = !sfxOn; LS.set("vc_sfx", sfxOn ? "1" : "0"); bs.textContent = sfxOn ? "🔊" : "🔇"; bs.setAttribute("aria-pressed", String(sfxOn)); if (window.toast) window.toast(sfxOn ? "Sonidos activados" : "Sonidos desactivados"); };
    bv.onclick = (e) => { e.stopPropagation(); menuVoz(bv); };
    top.prepend(bv); top.prepend(bs);
  }
  function menuVoz(ancla) {
    let m = $("#vc-voz-menu");
    if (m) { m.remove(); return; }
    m = document.createElement("div"); m.id = "vc-voz-menu"; m.setAttribute("role", "menu");
    const hayVoz = puedeHablar;
    m.innerHTML = `<button type="button" role="menuitem" data-vm="guia">▶ Explicar esta pantalla campo por campo</button>
      <label class="vc-vm-chk"><input type="checkbox" data-vm="tocar" ${VOZ.tocar ? "checked" : ""}> Explicar cada campo al tocarlo</label>
      <button type="button" role="menuitem" data-vm="prueba">🔈 Probar la voz</button>
      <small>${hayVoz ? "Voz: " + (VOZ.voz ? VOZ.voz.name : "la del sistema") + (VOZ.voz && MASC.test(VOZ.voz.name + VOZ.voz.voiceURI) ? "" : " · si no suena masculina, instala en Windows la voz «Pablo» o «Álvaro» (Configuración → Hora e idioma → Voz)") : "Este navegador no tiene voz: usa Chrome o Edge."}</small>`;
    document.body.appendChild(m);
    const r = ancla.getBoundingClientRect();
    m.style.top = Math.round(r.bottom + 8) + "px"; m.style.right = Math.max(8, Math.round(innerWidth - r.right)) + "px";
    m.addEventListener("click", (e) => {
      const b = e.target.closest("[data-vm]"); if (!b) return;
      if (b.dataset.vm === "guia") { m.remove(); empezarGuia(); }
      if (b.dataset.vm === "prueba") decir("Hola, soy la guía por voz de Volcano Cars. Te explico cada campo del panel para que no se te escape nada.");
      if (b.dataset.vm === "tocar") { VOZ.tocar = b.checked; LS.set("vc_voz_tocar", VOZ.tocar ? "1" : "0"); if (VOZ.tocar) decir("Activado. Cuando toques un campo, te explico qué poner."); }
    });
    setTimeout(() => document.addEventListener("click", function fuera(e) { if (!m.contains(e.target)) { m.remove(); document.removeEventListener("click", fuera); } }), 0);
  }
  // Ayuda: «Escuchar explicación» en cada módulo (lee los pasos y capítulos del vídeo)
  function ayudaVoz() {
    $$("#s-ayuda .ay-mh").forEach((h) => {
      if (h.querySelector(".vc-ay-voz")) return;
      const b = document.createElement("button"); b.type = "button"; b.className = "btn b-ghost b-sm vc-ay-voz"; b.innerHTML = "🔈 Escuchar explicación";
      b.onclick = () => {
        const mod = h.closest("article, section, .ay-mod, .card") || h.parentElement;
        const tit = textoDe(h.querySelector("h2"));
        const pasos = $$(".ay-steps li p, .ay-cap b, .ay-chap b, ol li", mod).map(textoDe).filter(Boolean).slice(0, 18);
        if (b.dataset.on === "1") { speechSynthesis.cancel(); b.dataset.on = "0"; b.innerHTML = "🔈 Escuchar explicación"; return; }
        b.dataset.on = "1"; b.innerHTML = "⏹ Parar";
        decir("Módulo " + tit + ". " + (pasos.length ? pasos.map((p, i) => "Paso " + (i + 1) + ": " + p).join(". ") : "Mira el vídeo para ver cómo se usa."), () => { b.dataset.on = "0"; b.innerHTML = "🔈 Escuchar explicación"; });
      };
      h.appendChild(b);
    });
  }

  /* ================= 3. ETIQUETA DE NETLIFY ================= */
  function esNetlify(e) {
    if (!e || e.nodeType !== 1) return false;
    const txt = ((e.id || "") + " " + (typeof e.className === "string" ? e.className : "") + " " + e.tagName + " " + (e.getAttribute("src") || "") + " " + (e.getAttribute("href") || "")).toLowerCase();
    if (txt.includes("netlify")) return true;
    const t = (e.textContent || "").slice(0, 200).toLowerCase();
    return t.includes("powered by netlify");
  }
  function medirEtiqueta() {
    try {
      const W = innerWidth, H = innerHeight; let alto = 0;
      for (const [x, y] of [[W - 30, H - 26], [W - 100, H - 26], [W - 160, H - 30], [W - 60, H - 50]]) {
        for (const el of document.elementsFromPoint(x, y)) {
          let e = el, hallado = null;
          while (e && e !== document.documentElement) { if (esNetlify(e)) { hallado = e; } if (getComputedStyle(e).position === "fixed") break; e = e.parentElement; }
          if (hallado || (e && e !== document.documentElement && esNetlify(e))) { const r = (hallado || e).getBoundingClientRect(); alto = Math.max(alto, Math.ceil(H - r.top + 10)); }
        }
      }
      document.documentElement.style.setProperty("--badge", alto + "px");
      document.documentElement.style.setProperty("--badge-x", Math.max(0, alto - 70) + "px");
    } catch (_) { }
  }

  /* ================= estilos ================= */
  const css = document.createElement("style");
  css.textContent = `
  .vc-bt span{display:inline}@media (max-width:760px){.vc-bt span{display:none}}
  #vc-voz{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(18px + env(safe-area-inset-bottom,0px) + var(--badge-x,0px));z-index:1200;display:flex;gap:10px;align-items:center;background:#1B1B1A;color:#F2EFEA;border:1px solid rgba(224,74,34,.7);box-shadow:0 0 0 4px rgba(224,74,34,.15),0 18px 40px rgba(0,0,0,.45);border-radius:999px;padding:8px 10px 8px 16px;font:600 14px/1.2 var(--body,system-ui)}
  #vc-voz[hidden]{display:none}#vc-voz span{opacity:.8;font-variant-numeric:tabular-nums}
  .vc-voz-b{display:flex;gap:4px}.vc-voz-b button{appearance:none;border:0;background:rgba(255,255,255,.1);color:#fff;width:34px;height:34px;border-radius:50%;font-size:17px;cursor:pointer}.vc-voz-b button:hover{background:#E04A22}
  @media (max-width:640px){#vc-voz{bottom:calc(128px + env(safe-area-inset-bottom,0px))}}
  .vc-voz-foco{outline:3px solid #E04A22!important;outline-offset:3px;box-shadow:0 0 0 8px rgba(224,74,34,.22)!important;transition:box-shadow .2s}
  #vc-voz-menu{position:fixed;z-index:1300;width:min(330px,calc(100vw - 16px));background:var(--surface,#232322);color:var(--ink,#F2EFEA);border:1px solid var(--line,#3a3a38);border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.45);padding:8px;display:grid;gap:4px}
  #vc-voz-menu button{appearance:none;text-align:left;border:0;background:transparent;color:inherit;font:600 14.5px/1.3 var(--body,system-ui);padding:11px 12px;border-radius:10px;cursor:pointer}#vc-voz-menu button:hover{background:rgba(224,74,34,.14)}
  .vc-vm-chk{display:flex;gap:10px;align-items:center;padding:10px 12px;font-size:14.5px;cursor:pointer}.vc-vm-chk input{width:18px;height:18px;accent-color:#E04A22}
  #vc-voz-menu small{display:block;padding:6px 12px 8px;color:var(--muted,#9a958d);font-size:12px;line-height:1.4}
  .vc-ay-voz{margin-left:0}@media (max-width:640px){.ay-mh>.vc-ay-voz{flex:1 1 100%;order:4;justify-content:center}}`;
  document.head.appendChild(css);

  /* ================= arranque ================= */
  function tick() { envolverToast(); botones(); ayudaVoz(); }
  new MutationObserver(() => { clearTimeout(tick._t); tick._t = setTimeout(tick, 120); }).observe(document.body, { childList: true, subtree: true });
  tick();
  setTimeout(medirEtiqueta, 1500); setTimeout(medirEtiqueta, 5000); addEventListener("resize", () => { clearTimeout(medirEtiqueta._t); medirEtiqueta._t = setTimeout(medirEtiqueta, 300); });
})();
