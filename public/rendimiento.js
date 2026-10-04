/* VOLCANO CARS · RENDIMIENTO (rendimiento.js) — va copiado (inline) en la cabecera de las 4 páginas SPA:
   python3 tools/pagespeed/inline-rendimiento.py   (ver rendimiento.css para el detalle)
   · MODO LIGERO: pone la clase «lite» en <html> SOLO en móviles de verdad flojos. Los móviles buenos cargan la web completa, con todos los efectos.
       - Seguro desde el principio (sin parpadeos): móvil con 2 GB de memoria o menos, o «ahorro de datos» activado en el aparato.
       - Medido: cuando la página ya ha cargado y está quieta se miden fotogramas dos veces seguidas; solo si las DOS veces
         va a menos de ~22 fotogramas por segundo se pasa a ligero (solo esa visita). Núcleos y tipo de conexión YA NO deciden nada:
         navegadores como Brave o Firefox esconden o falsean los núcleos, y una cobertura mala no vuelve lento un móvil rápido.
       - ?lite=1 lo fuerza (solo en esa pestaña) y ?lite=0 lo quita y se recuerda en el aparato. ?diag=1 enseña por qué se decidió.
   · PAUSA lo que no se ve: las animaciones de las zonas fuera de pantalla se paran (clase vc-off).
   Si algo falla no pasa nada: la web se ve y funciona igual. */
(function () {
  var d = document.documentElement, n = navigator, c = n.connection || {}, K = "vc-lite2", v = "", why = "";
  d.classList.add("js");
  var q = /[?&]lite=([01])/.exec(location.search), dg = /[?&]diag=1/.test(location.search);
  try {
    // clave antigua (guardaba «ligero» para siempre): se borra, así nadie se queda atascado en el modo ligero
    localStorage.removeItem("vc-lite");
    if (q) {
      if (q[1] === "0") { localStorage.setItem(K, "0"); sessionStorage.removeItem(K); }
      else { sessionStorage.setItem(K, "1"); localStorage.removeItem(K); }
    }
    v = sessionStorage.getItem(K) || localStorage.getItem(K) || "";
  } catch (e) { if (q) v = q[1]; }
  // móvil = pantalla táctil. Solo dos señales fiables deciden desde el principio: memoria ≤2 GB y «ahorro de datos»
  var movil = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
  var poca = movil && n.deviceMemory && n.deviceMemory <= 2;
  if (v === "1") { d.classList.add("lite"); why = "forzado ?lite=1"; }
  else if (v !== "0") {
    if (c.saveData) { d.classList.add("lite"); why = "ahorro de datos"; }
    else if (poca) { d.classList.add("lite"); why = "memoria " + n.deviceMemory + " GB"; }
  }
  if (v === "0") why = "forzado ?lite=0";

  // sondeo de fluidez: 40 fotogramas, con la página cargada y sin tocar la pantalla; hace falta fallar DOS veces seguidas
  var UMBRAL = 45, ultScroll = 0, medidas = [];
  addEventListener("scroll", function () { ultScroll = Date.now(); }, { passive: true });
  function medir(fin) {
    var t = [], ult = 0;
    function f(ts) {
      if (document.hidden) return fin(null);
      if (ult) t.push(ts - ult);
      ult = ts;
      if (t.length < 40) return requestAnimationFrame(f);
      t.sort(function (a, b) { return a - b; });
      fin(t[t.length >> 1]);
    }
    requestAnimationFrame(f);
  }
  function sondeo(intento, ronda) {
    if (v !== "" || d.classList.contains("lite") || !window.requestAnimationFrame) return;
    if (document.hidden || (Date.now() - ultScroll < 700 && intento < 4)) return setTimeout(function () { sondeo(intento + 1, ronda); }, 900);
    medir(function (m) {
      if (m === null) return setTimeout(function () { sondeo(intento + 1, ronda); }, 1500);
      medidas.push(Math.round(m));
      if (m <= UMBRAL) { why = "fluido (" + Math.round(m) + " ms/fotograma)"; return aviso(); }
      if (ronda === 1) return setTimeout(function () { sondeo(0, 2); }, 1500);
      d.classList.add("lite"); why = "a tirones (" + medidas.join(" y ") + " ms/fotograma)"; aviso();
    });
  }

  // ?diag=1: cuadro pequeño que dice si va en modo ligero y por qué (para entender qué pasa en un móvil concreto)
  function aviso() {
    d.setAttribute("data-lite", d.classList.contains("lite") ? "si" : "no");
    if (!dg || !document.body) return;
    var e = document.getElementById("vc-diag");
    if (!e) {
      e = document.createElement("div"); e.id = "vc-diag";
      e.style.cssText = "position:fixed;left:8px;right:8px;top:8px;z-index:99999;background:#000c;color:#fff;font:12px/1.4 system-ui;padding:8px 10px;border-radius:8px;pointer-events:none";
      document.body.appendChild(e);
    }
    e.textContent = "Modo " + (d.classList.contains("lite") ? "LIGERO" : "COMPLETO") + " · " + (why || "midiendo…") + " · memoria " + (n.deviceMemory || "?") + " GB · núcleos " + (n.hardwareConcurrency || "?") +
      " · táctil " + (movil ? "sí" : "no") + " · ahorro datos " + (c.saveData ? "sí" : "no") + " · red " + (c.effectiveType || "?") +
      " · reducir movimiento " + (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches ? "SÍ" : "no");
  }

  // lo que está fuera de pantalla no se anima
  var ANIM = ".hero,.marquee,.ruta,.garantia,.sello,.vc-hero,.ofe-head,.esf-hint,.gal-360,.rsv-cta";
  function pausas() {
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        e.target.classList.toggle("vc-off", !e.isIntersecting);
        // lo que baja el camión de la ruta (se mueve con transform, no con «top»)
        if (e.isIntersecting && e.target.classList.contains("ruta")) e.target.style.setProperty("--ruta-d", Math.max(60, e.target.offsetHeight - 36) + "px");
      });
    }, { rootMargin: "60px" });
    var l = document.querySelectorAll(ANIM);
    for (var i = 0; i < l.length; i++) io.observe(l[i]);
  }

  function listo() {
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 300); };
    idle(pausas);
    setTimeout(function () { sondeo(0, 1); }, 2500);
    aviso();
  }
  if (document.readyState === "complete") listo(); else window.addEventListener("load", listo);
})();
