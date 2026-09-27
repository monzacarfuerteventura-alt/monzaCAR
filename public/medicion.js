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
  ads: "",
  conv: { solicitud: "", whatsapp: "", llamada: "" }
};
(function () {
  var M = window.VC_MED, CK = "mz_cookies";
  if (!M.ga4 && !M.ads) return;
  if (document.getElementById("ck")) return; // la portada lo gestiona ella misma
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
    var d = document.createElement("div"); d.className = "vc-ck"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Cookies");
    d.innerHTML = '<p>Usamos cookies de Google (Analytics y Ads) solo para contar visitas y saber qué anuncios funcionan. <a href="/cookies">Más información</a></p><div><button type="button" data-no>Rechazar</button><button type="button" data-si>Aceptar</button></div>';
    d.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:999;max-width:560px;margin:0 auto;background:#1B1B1A;color:#F2EFEA;border-radius:14px;padding:14px 16px;display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;font:14px/1.4 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)";
    d.querySelector("p").style.margin = "0"; d.querySelector("a").style.color = "#F2EFEA";
    d.querySelectorAll("button").forEach(function (b) { b.style.cssText = "border:0;border-radius:10px;padding:9px 14px;font:inherit;font-weight:700;cursor:pointer;margin-left:6px;" + (b.hasAttribute("data-si") ? "background:#D9481C;color:#fff" : "background:#3a3936;color:#F2EFEA"); });
    d.addEventListener("click", function (e) { var si = e.target.hasAttribute("data-si"), no = e.target.hasAttribute("data-no"); if (!si && !no) return;
      try { localStorage.setItem(CK, si ? "si" : "no"); } catch (_) {} d.remove();
      if (si) cargar(); else if (window.gtag) window.gtag("consent", "update", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" }); });
    document.body.appendChild(d);
  }
  // «Configurar cookies» en el pie de cualquier página: vuelve a enseñar el aviso para cambiar la decisión
  document.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("[data-ck-open]"); if (!a) return; e.preventDefault(); if (!document.querySelector(".vc-ck")) aviso(); });
  var dec = leer();
  if (dec === "si") cargar(); else if (!dec) (document.readyState === "loading" ? document.addEventListener("DOMContentLoaded", aviso) : aviso());
})();
