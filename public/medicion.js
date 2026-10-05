/* =====================================================================
   MEDICIÓN · Google Analytics 4 + conversiones de Google Ads, con aviso de cookies
   ÚNICO sitio donde se ponen los códigos. Mientras estén vacíos, la web no carga nada de Google
   ni enseña el aviso de cookies.
   · ga4: «ID de medición» de Analytics (G-XXXXXXXXXX)
   · ads: «ID de conversión» de Google Ads (AW-XXXXXXXXX)
   · conv: la «etiqueta» de cada conversión (lo que va detrás de la barra: AW-123/<etiqueta>)
   La portada (index.html) usa estos mismos datos y su propio aviso de cookies.
   ===================================================================== */
window.VC_MED = {
  ga4: "G-2ZWYPY3TT4",
  ads: "AW-18469780390",
  conv: { solicitud: "5582CPLtzpEdEKb3iedE", whatsapp: "0ZVMCJfq2pEdEKb3iedE", llamada: "ZC-GCM2-2pEdEKb3iedE" }
};
(function () {
  var M = window.VC_MED, CK = "mz_cookies";
  if (!M.ga4 && !M.ads) return;
  // La portada (y /comprar, /taller, /en) tiene su propio aviso (#ck). Este archivo se carga en el <head>,
  // antes de que exista el <body>: por eso se comprueba al terminar de leer la página y no aquí
  // (antes salían DOS avisos de cookies a la vez en la portada).
  var esPortada = function () { return !!document.getElementById("ck"); };
  var leer = function () { try { return localStorage.getItem(CK) || ""; } catch (_) { return ""; } };
  function cargar() {
    if (window.gtag) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "denied", analytics_storage: "granted" });
    window.gtag("js", new Date());
    if (M.ga4) window.gtag("config", M.ga4);
    if (M.ads) window.gtag("config", M.ads);
    var s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(M.ga4 || M.ads); document.head.appendChild(s);
  }
  // Conversiones: clic en WhatsApp o en Llamar, y formularios enviados (se miden en toda la web)
  window.vcMedir = function (k) {
    try {
      if (!window.gtag) return;
      var ev = { solicitud: "generate_lead", whatsapp: "click_whatsapp", llamada: "click_llamar" }[k] || k;
      if (M.ga4) window.gtag("event", ev, { page_path: location.pathname });
      if (M.ads && M.conv[k]) window.gtag("event", "conversion", { send_to: M.ads + "/" + M.conv[k] });
    } catch (_) {}
  };
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]"); if (!a) return;
    var h = a.getAttribute("href") || "";
    if (/^https:\/\/wa\.me\//.test(h)) window.vcMedir("whatsapp");
    else if (/^tel:/.test(h)) window.vcMedir("llamada");
  }, true);
  document.addEventListener("vc:solicitud", function () { window.vcMedir("solicitud"); });
  function aviso() {
    if (esPortada() || document.querySelector(".vc-ck")) return;
    var d = document.createElement("div"); d.className = "vc-ck"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Cookies");
    d.innerHTML = '<p>Usamos cookies de Google solo para contar visitas. <a href="/cookies">Política de cookies</a></p><div><button type="button" data-no>Rechazar</button><button type="button" data-si>Aceptar</button></div>';
    d.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:999;max-width:560px;margin:0 auto;background:#1B1B1A;color:#F2EFEA;border-radius:12px;padding:8px 10px 8px 12px;display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;font:13px/1.35 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)";
    d.querySelector("p").style.margin = "0"; d.querySelector("a").style.color = "#F2EFEA";
    d.querySelectorAll("button").forEach(function (b) { b.style.cssText = "border:0;border-radius:10px;min-height:40px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer;margin-left:4px;" + "background:#F2EFEA;color:#1B1B1A"; });
    d.addEventListener("click", function (e) { var si = e.target.hasAttribute("data-si"), no = e.target.hasAttribute("data-no"); if (!si && !no) return;
      var antes = leer(); try { localStorage.setItem(CK, si ? "si" : "no"); } catch (_) {} d.remove();
      if (no && antes === "si") { document.cookie.split(";").map(function (c) { return c.split("=")[0].trim(); }).filter(function (n) { return /^_(gcl|ga|gac)/.test(n); }).forEach(function (n) { document.cookie = n + "=; Max-Age=0; path=/"; document.cookie = n + "=; Max-Age=0; path=/; domain=" + location.hostname; }); }
      if (si) cargar(); else if (window.gtag) window.gtag("consent", "update", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" }); });
    document.body.appendChild(d);
  }
  // «Configurar cookies» en el pie de cualquier página: vuelve a enseñar el aviso para cambiar la decisión
  document.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("[data-ck-open]"); if (!a) return; if (esPortada()) return; e.preventDefault(); aviso(); });
  function arrancar() {
    if (esPortada()) return; // la portada carga Google y enseña su aviso ella misma
    var dec = leer();
    if (dec === "si") cargar(); else if (!dec) aviso();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar); else arrancar();
})();/* El antiguo botón «Pagar mi reparación online» (enlace de Stripe suelto, sin orden) se ha quitado del pie: el pago se hace desde el enlace de seguimiento /s/… */
/* El antiguo botón «Reservar este coche con 50 € de señal» (enlace de pago suelto) se ha quitado:
   buscaba páginas /coches/… que no existen (las fichas son /coche/…), así que nunca salía, y además se
   saltaba la reserva online de 50 € que ya tiene la web (aparta el coche, evita que dos personas paguen
   el mismo y lo marca «Reservado»: netlify/functions/reservas.mts). */

/* Horario único de la web (hora de Canarias): L–V 8:00–16:00, salvo festivos. Lo usan «Abierto ahora» y el aviso del presupuesto por foto. */
window.vcHorario = function () {
  var FEST = "2026-10-12 2026-12-08 2026-12-25 2027-01-01 2027-01-06 2027-03-25 2027-03-26 2027-10-12 2027-11-01 2027-12-06 2027-12-08".split(" ");
  var d = "Mon", h = 0, m = 0, f = "";
  try {
    var p = {}; new Intl.DateTimeFormat("en-GB", { timeZone: "Atlantic/Canary", weekday: "short", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date()).forEach(function (x) { p[x.type] = x.value; });
    d = p.weekday; h = +p.hour; m = +p.minute; f = p.year + "-" + p.month + "-" + p.day;
  } catch (_) { var n = new Date(); d = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][n.getDay()]; h = n.getHours(); m = n.getMinutes(); }
  var lab = ["Mon", "Tue", "Wed", "Thu", "Fri"].indexOf(d) > -1 && FEST.indexOf(f) < 0, t = h * 60 + m;
  return { dia: d, laborable: lab, minutos: t, abierto: lab && t >= 480 && t < 960 };
};

/* Etiquetas de Twitter/X para compartir (se copian de las de Open Graph, que ya están en todas las páginas) */
(function () {
  function poner() { try {
    var og = function (n) { var m = document.querySelector('meta[property="og:' + n + '"]'); return m ? m.getAttribute("content") : ""; };
    if (document.querySelector('meta[name="twitter:card"]')) return;
    [["twitter:card", "summary_large_image"], ["twitter:title", og("title") || document.title], ["twitter:description", og("description")], ["twitter:image", og("image")]].forEach(function (p) {
      if (!p[1]) return; var m = document.createElement("meta"); m.name = p[0]; m.content = p[1]; document.head.appendChild(m);
    });
  } catch (_) {} }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", poner); else poner();
})();
