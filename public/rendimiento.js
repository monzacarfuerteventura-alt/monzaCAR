/* VOLCANO CARS · RENDIMIENTO (rendimiento.js) — va copiado (inline) en la cabecera de las 4 páginas SPA:
   python3 tools/pagespeed/inline-rendimiento.py   (ver rendimiento.css para el detalle)
   · MODO LIGERO: pone la clase «lite» en <html> en móviles flojos. Se decide antes de pintar nada, sin parpadeos.
       - móvil con poca memoria (≤2 GB) o 4 núcleos o menos, «ahorro de datos» o conexión 2G → ligero desde el principio
       - si, ya cargada la página, va a menos de ~26 fotogramas por segundo → ligero (solo esa visita)
       - ?lite=1 lo fuerza y ?lite=0 lo quita (se recuerda en el aparato)
   · PAUSA lo que no se ve: las animaciones de las zonas fuera de pantalla se paran (clase vc-off).
   Si algo falla no pasa nada: la web se ve y funciona igual. */
(function () {
  var d = document.documentElement, n = navigator, c = n.connection || {}, K = "vc-lite", v = "";
  d.classList.add("js");
  try {
    var q = /[?&]lite=([01])/.exec(location.search);
    if (q) localStorage.setItem(K, q[1]);
    v = localStorage.getItem(K) || "";
  } catch (e) { if (q) v = q[1]; }
  // en el móvil (pantalla táctil) se mira la memoria y los núcleos; «ahorro de datos» y 2G valen en cualquier aparato
  var movil = !!(window.matchMedia && matchMedia("(pointer: coarse)").matches);
  var flojo = c.saveData || /(^|-)2g$/.test(c.effectiveType || "") || (movil && ((n.deviceMemory && n.deviceMemory <= 2) || (n.hardwareConcurrency && n.hardwareConcurrency <= 4)));
  if (v === "1" || (v !== "0" && flojo)) d.classList.add("lite");

  // sondeo de fluidez: unos 45 fotogramas, cuando la página ya ha terminado de cargar
  function sondeo() {
    if (v === "0" || d.classList.contains("lite") || document.hidden || !window.requestAnimationFrame) return;
    var t = [], ult = 0;
    function f(ts) {
      if (ult) t.push(ts - ult);
      ult = ts;
      if (t.length < 45 && !document.hidden) return requestAnimationFrame(f);
      if (t.length < 20) return;
      t.sort(function (a, b) { return a - b; });
      if (t[t.length >> 1] > 38) d.classList.add("lite");
    }
    requestAnimationFrame(f);
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
    setTimeout(sondeo, 1200);
  }
  if (document.readyState === "complete") listo(); else window.addEventListener("load", listo);
})();
