/* ORIGEN DE LA VISITA (actualización 19)
   Si alguien llega por un QR o un anuncio a una página interna (p. ej. /pre-itv-fuerteventura/?utm_source=flyer…) y luego pasa a
   otra página para pedir cita, los UTM se perdían y la solicitud salía como «Directo». Aquí se recuerdan solo durante la visita
   (sessionStorage: desaparece al cerrar la pestaña, no es una cookie y no se envía a ningún sitio). Los formularios lo leen con
   window.vcOrigenGuardado() si la dirección de su página ya no trae UTM. Si llega con UTM nuevos, mandan los nuevos. */
(function () {
  var K = "vc_origen", V = ["gclid", "gbraid", "wbraid", "utm_source", "utm_medium", "utm_campaign", "utm_term"];
  window.vcOrigenGuardado = function () { return {}; };
  try {
    var q = new URLSearchParams(location.search), o = {}, hay = false;
    V.forEach(function (k) { var v = q.get(k); if (v) { o[k] = v.slice(0, 200); hay = true; } });
    if (hay) sessionStorage.setItem(K, JSON.stringify(o));
    window.vcOrigenGuardado = function () { try { var x = JSON.parse(sessionStorage.getItem(K) || "{}"); return x && typeof x === "object" ? x : {}; } catch (_) { return {}; } };
  } catch (_) {}
})();
