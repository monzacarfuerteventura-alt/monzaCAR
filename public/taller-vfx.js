/* =====================================================================
   VOLCANO CARS · FONDO VFX DEL TALLER  (taller-vfx.js)
   ---------------------------------------------------------------------
   Al marcar un servicio del taller, el fondo de la sección pasa a un
   vídeo en bucle de ese servicio (render CAD / X-Ray), con fundido
   cruzado entre clips y una capa oscura para que el texto se lea bien.

   CÓMO FUNCIONA
   · Dos <video> apilados: el nuevo entra con su póster al instante y
     se funde sobre el anterior (sin saltos ni pantallazo negro).
   · Precarga: los pósters (≈50 KB) cuando la sección aparece; el vídeo
     del servicio en cuanto el dedo toca la tarjeta (pointerdown llega
     antes que el clic) y, con buena conexión, los 3 más pedidos en los
     ratos libres del navegador. Se guardan en memoria (blob) para que
     al volver a pulsar sea instantáneo. Nunca se precarga con «ahorro
     de datos» ni en 2G.
   · Batería: el vídeo se para al salir de la sección o cambiar de
     pestaña; el clip que se va se descarga de la memoria.
   · Con «reducir movimiento» del sistema solo se ve la imagen fija.
   · Si falta algún clip, no pasa nada: queda el tinte de color.

   ARCHIVOS: /vfx/taller/<servicio>-<v|h>.mp4 y .jpg (póster)
     v = vertical (móvil, 720×1280) · h = horizontal (ordenador, 1280×720)
   Para cambiar un clip por uno definitivo: sustituye el archivo con el
   mismo nombre y sube VFX.ver (abajo) para que los móviles lo renueven.
   ===================================================================== */
(() => {
  "use strict";
  const VFX = {
    base: "/vfx/taller/",
    ver: "1",          // ← súbelo (2, 3…) cada vez que cambies algún vídeo
    webm: false,       // true si también subes <servicio>-<v|h>.webm (VP9)
    fundido: 650,      // ms del fundido cruzado
    maxMemoria: 6,     // clips guardados en memoria a la vez
    favoritos: ["itv", "frenos", "pintura"], // se precargan con buena conexión
  };
  // color del tinte de cada servicio (se ve al instante, y si falta el vídeo)
  const COLOR = {
    golpes: "255,106,43", pintura: "255,106,43", aranazos: "178,120,255", aceite: "255,179,71",
    frenos: "255,59,48", neumaticos: "92,225,255", diagnosis: "92,225,255", itv: "61,220,132",
    aire: "170,230,255", distribucion: "255,106,43", bateria: "92,225,255", otro: "255,106,43",
  };

  const sec = document.getElementById("v-taller");
  const cont = document.getElementById("services");
  if (!sec || !cont || sec.querySelector(".vfx") || !("Promise" in window)) return;

  if (!document.querySelector('link[href^="/taller-vfx.css"]')) {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/taller-vfx.css"; document.head.appendChild(l);
  }

  const QUIETO = matchMedia("(prefers-reduced-motion: reduce)");
  const RED = navigator.connection || {};
  const ahorro = () => !!RED.saveData || /(^|-)2g$/.test(RED.effectiveType || "");
  const buenaRed = () => !ahorro() && (!RED.effectiveType || RED.effectiveType === "4g");
  const orient = () => (innerHeight > innerWidth ? "v" : "h");
  const EXT = VFX.webm && document.createElement("video").canPlayType('video/webm; codecs="vp9"') ? "webm" : "mp4";
  const urlVideo = (k, o = orient()) => `${VFX.base}${k}-${o}.${EXT}?v=${VFX.ver}`;
  const urlPoster = (k, o = orient()) => `${VFX.base}${k}-${o}.jpg?v=${VFX.ver}`;

  /* ---------------- capa de fondo ---------------- */
  const capa = document.createElement("div");
  capa.className = "vfx"; capa.setAttribute("aria-hidden", "true");
  const vid = '<video class="vfx-v" muted playsinline loop preload="none" disablepictureinpicture disableremoteplayback tabindex="-1"></video>';
  capa.innerHTML = `<div class="vfx-stage">${vid}${vid}<div class="vfx-tint"></div><div class="vfx-overlay"></div><div class="vfx-scan"></div><div class="vfx-hud"><i></i><span></span></div></div>`;
  sec.prepend(capa);
  capa.style.setProperty("--vfx-fade", VFX.fundido + "ms");
  const V = [...capa.querySelectorAll("video")];
  V.forEach((v) => { v.muted = true; v.defaultMuted = true; v.playsInline = true; });
  const hudTxt = capa.querySelector(".vfx-hud span");

  /* ---------------- memoria de clips (blob) ---------------- */
  const MEM = new Map(); // "k-o" → Promise<blob: URL | null>
  const FALTA = new Set();
  let enUso = "";
  function traer(k, o = orient()) {
    const id = k + "-" + o;
    if (FALTA.has(id)) return Promise.resolve(null);
    if (MEM.has(id)) { const p = MEM.get(id); MEM.delete(id); MEM.set(id, p); return p; } // el más reciente, al final
    const p = fetch(urlVideo(k, o), { credentials: "same-origin" })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => (b && b.size > 1000 ? URL.createObjectURL(b) : (FALTA.add(id), null)))
      .catch(() => { MEM.delete(id); return null; }); // sin red: se reintenta la próxima vez
    MEM.set(id, p);
    for (const [kk, pp] of MEM) { // se olvida lo más antiguo (nunca el clip que se está viendo)
      if (MEM.size <= VFX.maxMemoria) break;
      if (kk === enUso || kk === id) continue;
      MEM.delete(kk); pp.then((u) => u && setTimeout(() => URL.revokeObjectURL(u), VFX.fundido + 500));
    }
    return p;
  }
  const posterHecho = new Set();
  function prePoster(k) { const u = urlPoster(k); if (posterHecho.has(u)) return; posterHecho.add(u); const i = new Image(); i.decoding = "async"; i.src = u; }

  /* ---------------- cambio de clip con fundido cruzado ---------------- */
  let turno = 0, actual = null, activo = 0, visible = true, tFund = 0;
  function cruzar(v) {
    const viejo = V[activo];
    activo = V.indexOf(v);
    v.classList.add("on");
    if (viejo !== v) viejo.classList.remove("on");
    clearTimeout(tFund);
    tFund = setTimeout(() => { // el que se ha ido deja de gastar batería y memoria
      V.forEach((x) => { if (!x.classList.contains("on") && x.getAttribute("src")) { x.pause(); x.removeAttribute("src"); x.load(); } });
    }, VFX.fundido + 120);
  }
  function reproducir(v) { if (!visible || document.hidden) return; const p = v.play(); if (p && p.catch) p.catch(() => {}); }

  async function mostrar(k) {
    const mio = ++turno;
    actual = k;
    const o = orient(), nombre = (cont.querySelector(`input[data-k="${k}"]`) || {}).value || k;
    capa.style.setProperty("--vfx-c", COLOR[k] || COLOR.otro);
    sec.classList.add("vfx-on");
    hudTxt.textContent = nombre;
    capa.classList.remove("vfx-barre"); void capa.offsetWidth; capa.classList.add("vfx-barre"); // barrido de escáner al cambiar

    // 1) al instante: el póster del servicio entra con el fundido
    const v = V[activo] && V[activo].classList.contains("on") ? V[1 - activo] : V[activo];
    v.pause(); v.removeAttribute("src"); v.load();
    v.poster = urlPoster(k, o);
    cruzar(v);
    if (QUIETO.matches) return; // «reducir movimiento»: solo la imagen fija

    // 2) en cuanto está el vídeo (en memoria suele ser inmediato), empieza a moverse
    enUso = k + "-" + o;
    const src = await traer(k, o);
    if (mio !== turno) return;           // mientras tanto se ha pulsado otro servicio
    if (!src) return;                    // no hay clip: se queda el póster/tinte
    v.src = src;
    v.addEventListener("error", () => { if (mio === turno) v.classList.remove("on"); }, { once: true });
    reproducir(v);
  }

  function ocultar() {
    turno++; actual = null; enUso = "";
    sec.classList.remove("vfx-on");
    V.forEach((x) => x.classList.remove("on"));
    clearTimeout(tFund);
    tFund = setTimeout(() => V.forEach((x) => { x.pause(); x.removeAttribute("src"); x.load(); }), VFX.fundido + 120);
  }

  /* ---------------- qué servicio manda ---------------- */
  // Se pueden marcar varios: manda el último que se ha tocado. Si se desmarca, vuelve el anterior.
  const pila = [];
  const marcados = () => [...cont.querySelectorAll("input[data-k]:checked")].map((i) => i.dataset.k);
  function sincronizar(tocado) {
    const m = marcados();
    for (let i = pila.length - 1; i >= 0; i--) if (!m.includes(pila[i])) pila.splice(i, 1);
    m.forEach((k) => { if (!pila.includes(k)) pila.push(k); });
    if (tocado && m.includes(tocado)) { pila.splice(pila.indexOf(tocado), 1); pila.push(tocado); }
    const k = pila[pila.length - 1] || null;
    if (!k) { if (actual) ocultar(); return; }
    if (k !== actual) mostrar(k);
  }
  cont.addEventListener("change", (e) => { const i = e.target.closest && e.target.closest("input[data-k]"); if (i) sincronizar(i.dataset.k); });
  const res = document.getElementById("t-resumen"); // las etiquetas «×» del resumen también desmarcan
  if (res) new MutationObserver(() => sincronizar()).observe(res, { childList: true });

  /* ---------------- precarga por intención ---------------- */
  const kDe = (e) => { const l = e.target.closest && e.target.closest(".svc"); const i = l && l.querySelector("input[data-k]"); return i ? i.dataset.k : null; };
  // el dedo toca la tarjeta ~100-200 ms antes del clic: se aprovecha para empezar a descargar
  cont.addEventListener("pointerdown", (e) => { const k = kDe(e); if (k) { prePoster(k); if (!QUIETO.matches) traer(k); } }, { passive: true });
  let tHover = 0;
  cont.addEventListener("pointerover", (e) => {
    if (e.pointerType !== "mouse") return;
    const k = kDe(e); if (!k) return;
    clearTimeout(tHover); tHover = setTimeout(() => { prePoster(k); if (!QUIETO.matches && !ahorro()) traer(k); }, 90);
  });
  cont.addEventListener("focusin", (e) => { const k = kDe(e); if (k) prePoster(k); });

  /* ---------------- precarga en ratos libres ---------------- */
  const ocioso = window.requestIdleCallback || ((f) => setTimeout(f, 600));
  let precargado = false;
  function precargar() {
    if (precargado) return; precargado = true;
    ocioso(() => {
      if (ahorro()) return;
      cont.querySelectorAll("input[data-k]").forEach((i) => prePoster(i.dataset.k));
      if (QUIETO.matches || !buenaRed()) return;
      // de uno en uno, para no competir con lo que el cliente está haciendo
      VFX.favoritos.reduce((p, k) => p.then(() => new Promise((ok) => ocioso(() => traer(k).then(ok, ok)))), Promise.resolve());
    }, { timeout: 2500 });
  }

  /* ---------------- ahorro de batería ---------------- */
  const pausar = () => V.forEach((x) => x.pause());
  const seguir = () => { const v = V[activo]; if (actual && v.getAttribute("src") && v.classList.contains("on")) reproducir(v); };
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((es) => es.forEach((en) => { visible = en.isIntersecting; if (visible) { precargar(); seguir(); } else pausar(); })).observe(sec);
  } else { precargar(); }
  document.addEventListener("visibilitychange", () => (document.hidden ? pausar() : seguir()));
  // al girar el móvil se cambia a la versión vertical u horizontal
  matchMedia("(orientation: portrait)").addEventListener?.("change", () => { if (actual) { const k = actual; actual = null; mostrar(k); } });
  QUIETO.addEventListener?.("change", () => { if (actual) { const k = actual; actual = null; mostrar(k); } });

  // si la página ya llega con un servicio marcado (/taller?servicio=itv)
  if (marcados().length) sincronizar();
})();
