/* =====================================================================
   PANEL · ORDEN Y PLIEGUES (actualización 75)
   1) Coches → «Herramientas de venta»: Financiación, Multipublicación, Publicar en portales, Reservas online y Pruebas a domicilio
      (FORM-12, antes en Documentación) agrupadas en UNA barra plegada: un clic y se despliega, otro y se pliega. Se acuerda lo que dejaste.
   2) Cada tarjeta de Finanzas, Caja, Compras, Banco, Gestoría, Contabilidad, Incentivos, Margen y Clientes 360 se puede plegar
      pulsando su título (se acuerda por dispositivo): así se resume la pantalla y no hay tantas cosas a la vez.
   ===================================================================== */
(function () {
  "use strict";
  var LS = { get: function (k) { try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch (_) { return {}; } }, set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_) { } } };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var css = document.createElement("style");
  css.textContent = [
    "#vc-herr{padding:0;overflow:hidden;margin-top:12px}",
    "#vc-herr>.vc-herr-h{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;min-height:52px;padding:10px 16px;background:none;border:0;color:inherit;cursor:pointer;text-align:left;font:inherit}",
    "#vc-herr>.vc-herr-h b{font-size:16px}#vc-herr>.vc-herr-h small{display:block;opacity:.7;font-size:12.5px;margin-top:2px}",
    "#vc-herr>.vc-herr-h svg{transition:transform .18s}#vc-herr.abierta>.vc-herr-h svg{transform:rotate(180deg)}",
    "#vc-herr>.vc-herr-b{display:none;padding:0 12px 12px}#vc-herr.abierta>.vc-herr-b{display:block}",
    "#vc-herr .vc-herr-b>*{margin:8px 0 0!important}",
    /* Reservas online: solo la cabecera hasta que se abre */
    "#rv-box:not(.vc-abierto)>*:not(.rv-head){display:none!important}#rv-box .rv-head{cursor:pointer}",
    "#rv-box .rv-head h2::after{content:'  ▾';font-size:.7em;opacity:.6}#rv-box.vc-abierto .rv-head h2::after{content:'  ▴'}",
    /* pliegues de tarjetas */
    ".card.vc-cpc>*:not(.vc-cph){display:none!important}",
    ".vc-cph{cursor:pointer;display:flex!important;align-items:center;justify-content:space-between;gap:10px}",
    ".vc-cph .vc-cpi{flex:none;opacity:.65;transition:transform .18s;display:inline-flex}.card:not(.vc-cpc) .vc-cph .vc-cpi{transform:rotate(180deg)}",
    ".card.vc-cpc{padding-bottom:10px}.card.vc-cpc .vc-cph{margin-bottom:0!important}"
  ].join("\n");
  document.head.appendChild(css);
  var CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

  /* ---------- 1) Herramientas de venta (Coches) ---------- */
  var KH = "vc_herr75";
  function herramientas() {
    var fin = $("#fin-cfg"); if (!fin) return;
    var w = $("#vc-herr");
    if (!w) {
      w = document.createElement("section"); w.id = "vc-herr"; w.className = "card"; var st = LS.get(KH);
      w.innerHTML = '<button type="button" class="vc-herr-h" aria-expanded="false"><span><b>Herramientas de venta</b><small>Financiación · Multipublicación · Publicar en portales · Reservas online · Pruebas a domicilio</small></span>' + CHEV + '</button><div class="vc-herr-b"></div>';
      fin.parentNode.insertBefore(w, fin); if (st.abierta) { w.classList.add("abierta"); w.firstChild.setAttribute("aria-expanded", "true"); }
    }
    var b = $(".vc-herr-b", w), orden = ["fin-cfg", "mp-cfg", "pp-cfg", "vc-pruebas", "rv-box"];
    if (!$("#vc-pruebas")) pruebas(b);
    orden.forEach(function (id) { var el = document.getElementById(id); if (el && el.parentNode !== b) b.appendChild(el); });
    orden.forEach(function (id) { var el = document.getElementById(id); if (el && el.parentNode === b) b.appendChild(el); }); // mantiene el orden aunque lleguen tarde
  }
  function pruebas(b) {
    var d = document.createElement("details"); d.id = "vc-pruebas"; d.className = "card fin-cfg";
    d.innerHTML = '<summary><span><b>Pruebas a domicilio · fianza de 50 €</b><small id="vc-pr-res">Sin el «de acuerdo» del cliente a las 4 reglas no se cobra ni se agenda · liquidación en 48 h</small></span><span class="fin-ab">Abrir</span></summary><div style="padding:12px 4px"><p class="hint" id="vc-pr-txt">Cargando…</p><button type="button" class="btn b-acc b-sm" id="vc-pr-abrir">Abrir las pruebas a domicilio</button></div>';
    b.appendChild(d);
    d.addEventListener("toggle", function () { if (!d.open) return; api("/api/sistemas?form=FORM-12").then(function (r) { var l = (r.registros || []), ab = l.filter(function (x) { return !x.cerrado; }); $("#vc-pr-txt").textContent = ab.length + " abierta(s) · " + l.length + " en total."; $("#vc-pr-res").textContent = ab.length + " abierta(s) · fianza 50 € · liquidación en 48 h como máximo"; }).catch(function (e) { $("#vc-pr-txt").textContent = e.message; }); });
    $("#vc-pr-abrir", d).onclick = function () { if (window.VCSistemas) window.VCSistemas.abrir("FORM-12"); else if (typeof toast === "function") toast("Todavía se está cargando: prueba otra vez."); };
  }
  document.addEventListener("click", function (e) {
    var h = e.target.closest && e.target.closest("#vc-herr>.vc-herr-h");
    if (h) { var w = h.parentNode, ab = !w.classList.contains("abierta"); w.classList.toggle("abierta", ab); h.setAttribute("aria-expanded", String(ab)); LS.set(KH, { abierta: ab }); return; }
    var rh = e.target.closest && e.target.closest("#rv-box .rv-head");
    if (rh && !e.target.closest("button,a,input,select,summary")) { $("#rv-box").classList.toggle("vc-abierto"); }
  }, true);

  /* ---------- 2) Pliegues por tarjeta ---------- */
  var KC = "vc_cp75", EC = LS.get(KC), SECS = ["s-fin", "s-caja", "s-compras", "s-banco", "s-gest", "s-conta", "s-inc", "s-mcar", "s-cli", "s-perm"];
  function slug(t) { return String(t || "").toLowerCase().replace(/[^a-z0-9áéíóúñ]+/g, "-").slice(0, 40); }
  function tarjetas() {
    SECS.forEach(function (sid) {
      var s = document.getElementById(sid); if (!s || s.hidden) return;
      s.querySelectorAll(".card").forEach(function (c) {
        if (c.dataset.vccp) return; var h = c.firstElementChild; if (!h || !/^H[23]$/.test(h.tagName) || h.classList.contains("vc-cph")) return;
        var txt = (h.textContent || "").trim(); if (!txt || c.closest("dialog")) return;
        var id = sid + ":" + slug(txt); c.dataset.vccp = id; h.classList.add("vc-cph"); h.insertAdjacentHTML("beforeend", '<span class="vc-cpi">' + CHEV + "</span>");
        h.setAttribute("title", "Pulsa para plegar o desplegar"); if (EC[id]) c.classList.add("vc-cpc");
      });
    });
  }
  document.addEventListener("click", function (e) {
    var h = e.target.closest && e.target.closest(".vc-cph"); if (!h || e.target.closest("button,a,input,select")) return;
    var c = h.parentNode; if (!c || !c.dataset.vccp) return; var p = c.classList.toggle("vc-cpc"); EC[c.dataset.vccp] = p ? 1 : 0; LS.set(KC, EC);
  });
  var t = 0; function armar() { clearTimeout(t); t = setTimeout(function () { try { herramientas(); tarjetas(); } catch (_) { } }, 120); }
  new MutationObserver(armar).observe(document.querySelector("main") || document.body, { childList: true, subtree: true });
  armar();
  window.VCOrden = { irPruebas: function () { if (typeof abrirTab === "function") abrirTab("coches"); setTimeout(function () { herramientas(); var w = $("#vc-herr"); if (w) { w.classList.add("abierta"); LS.set(KH, { abierta: true }); var p = $("#vc-pruebas"); if (p) { p.open = true; p.scrollIntoView({ behavior: "smooth", block: "center" }); } } }, 500); } };
})();
