/* =====================================================================
   DOCUMENTACIÓN (actualización 68) · pestaña nueva del panel
   Reúne en un solo sitio: el manual de marca, el modelo de ventas, todas las fichas (FORM-01 a FORM-17)
   y los manuales S00–S11. Los PDF se abren con /api/manual/<nombre> y solo con sesión (netlify/functions/manuales.mts);
   los enlaces usan «#manual-<nombre>», que ya gestiona panel-sistemas.js.
   ===================================================================== */
(function () {
  "use strict";
  if (typeof TABS === "undefined" || typeof show !== "function" || typeof abrirTab !== "function") return;
  const sec = document.getElementById("s-docs"); if (!sec) return;
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const pdf = (f) => `#manual-${f}`;
  const SIS = "VolcanoCars-";
  const MARCA = SIS + "S00-Manual-de-marca-v1";

  // [título, descripción, archivo, etiqueta]
  const MARCAS = [
    ["Manual de marca Volcano Cars · v1.0", "15 páginas: la idea, logotipo, versiones, color, tipografía, usos incorrectos, redes, rotulación, papelería, web y contacto.", MARCA, "Abrir PDF"]
  ];
  const VENTAS = [
    ["Modelo de ventas · El método de venta (S05)", "Los 6 pasos, la chuleta y el Anexo A de prueba en carretera. Hoja v3.1.", SIS + "S05-Ventas-hoja-v3.1", "Abrir PDF"],
    ["Embudo, prueba a domicilio y seguimiento (S06)", "Web + WhatsApp + CRM, fianza de 50 € y cadencia de seguimiento.", SIS + "S06-Embudo-prueba-domicilio-seguimiento", "Abrir PDF"],
    ["Preparación y detailing anti-salitre (S04)", "Del taller al escaparate: coche impecable y protegido.", SIS + "S04-Preparacion-detailing-anti-salitre", "Abrir PDF"],
    ["Postventa, garantías y atención al cliente (S07)", "Respuesta en menos de 48 h.", SIS + "S07-Postventa-garantias-atencion", "Abrir PDF"]
  ];
  const FICHAS = [
    ["FORM-01", "Ficha de recepción", "FORM-01"], ["FORM-02", "Orden de trabajo", "FORM-02"], ["FORM-03", "Control de calidad", "FORM-03"], ["FORM-04", "Acta de entrega", "FORM-04"],
    ["FORM-14", "Factura de reparación", "FORM-14"], ["FORM-15", "Presupuesto (12 días hábiles)", "FORM-15"],
    ["FORM-16", "Factura de venta de vehículo", "FORM-16"], ["FORM-17", "Parte de reserva", "FORM-17"]
  ];
  const MANUALES = [
    ["S00", "Índice MO-00 · orden de implantación", SIS + "S00-Indice-MO-00-v3.0"], ["S00", "Hoja v3.2 · erratas y formularios 01→17", SIS + "S00-Hoja-v3.2-Fe-de-erratas"],
    ["S01", "Taller: de la recepción a la entrega", SIS + "S01-Taller-recepcion-a-entrega"], ["S02", "Recambios, almacén, cascos y abonos", SIS + "S02-Recambios-almacen-cascos-abonos"],
    ["S03", "Instalaciones, seguridad y 5S", SIS + "S03-Instalaciones-seguridad-5S"], ["S04", "Preparación y detailing anti-salitre", SIS + "S04-Preparacion-detailing-anti-salitre"],
    ["S05", "Ventas · hoja v3.1", SIS + "S05-Ventas-hoja-v3.1"], ["S06", "Embudo, prueba a domicilio y seguimiento", SIS + "S06-Embudo-prueba-domicilio-seguimiento"],
    ["S07", "Postventa, garantías y atención", SIS + "S07-Postventa-garantias-atencion"], ["S08", "Marketing digital, redes y marca", SIS + "S08-Marketing-digital-redes-marca"],
    ["S09", "Control financiero y anti-impagos", SIS + "S09-Control-financiero-anti-impagos"], ["S10", "Organización, puestos y RACI", SIS + "S10-Organizacion-puestos-RACI"],
    ["S11", "Cuadro de mando y métricas", SIS + "S11-Cuadro-de-mando-metricas"]
  ];

  const fila = (t, d, f, b) => `<div class="dc-row" data-q="${E((t + " " + d).toLowerCase())}"><div><b>${E(t)}</b><span>${E(d)}</span></div><a class="btn b-ghost b-sm" href="${pdf(f)}" target="_blank" rel="noopener">${E(b || "Abrir PDF")} ↗</a></div>`;
  function pintar() {
    sec.innerHTML = `
    <div class="head"><div><h1 style="font-size:28px">Documentación</h1><p>Todo en un sitio: la marca, el modelo de ventas, las fichas y los manuales. Los PDF solo se abren con tu sesión.</p></div>
      <div class="acts"><input id="dc-q" type="search" placeholder="Buscar documento…" aria-label="Buscar documento" style="min-width:220px"></div></div>
    <div class="dc-grid">
      <section class="card dc-card dc-marca"><h3>Marca</h3><p class="hint">Cómo se ve y cómo habla Volcano Cars.</p>${MARCAS.map((x) => fila(...x)).join("")}</section>
      <section class="card dc-card"><h3>Modelo de ventas</h3><p class="hint">Cómo vendemos, de la primera visita a la entrega.</p>${VENTAS.map((x) => fila(...x)).join("")}
        <div class="dc-row" data-q="guía de venta panel coches"><div><b>Guía de venta en el panel</b><span>Los pasos de la venta dentro de Coches, con sus formularios.</span></div><button type="button" class="btn b-ghost b-sm" data-dc-ir="coches">Abrir Coches</button></div></section>
      <section class="card dc-card dc-full"><h3>Fichas (FORM-01 a FORM-17)</h3><p class="hint">Impresos en PDF, en orden. Las 6 del taller también salen rellenas desde cada orden (Taller → orden → Fichas).</p>
        <div class="dc-chips">${FICHAS.map(([n, t, f]) => `<a class="dc-chip" data-q="${E((n + " " + t).toLowerCase())}" href="${pdf(f)}" target="_blank" rel="noopener"><b>${n}</b><span>${E(t)}</span></a>`).join("")}<a class="dc-chip dc-chip-all" data-q="todas las fichas del taller" href="${pdf("FICHAS-TALLER")}" target="_blank" rel="noopener"><b>Todas</b><span>Las fichas del taller en un solo PDF</span></a></div>
        <p class="hint" style="margin-top:10px">Formularios digitales FORM-05 a FORM-11 (cascos, 5S, preparación, prueba a domicilio, postventa, marketing y auditoría del viernes): se rellenan en <button type="button" class="dc-link" data-dc-ir="ordenes-lib">Taller → Sistemas Volcano Cars</button>.</p></section>
      <section class="card dc-card dc-full"><h3>Manuales de sistemas (S00 a S11)</h3><p class="hint">Se leen en este orden: primero la hoja v3.2, después las hojas v3.1 y, al final, el manual original.</p>${MANUALES.map(([n, t, f]) => fila(n + " · " + t, "", f, "PDF")).join("")}</section>
    </div><p class="hint" id="dc-vacio" hidden>No hay ningún documento con ese nombre.</p>`;
  }
  function filtrar(q) {
    q = (q || "").trim().toLowerCase(); let n = 0;
    sec.querySelectorAll("[data-q]").forEach((x) => { const ok = !q || x.dataset.q.includes(q); x.hidden = !ok; if (ok) n++; });
    sec.querySelectorAll(".dc-card").forEach((c) => { c.hidden = !!q && !c.querySelector("[data-q]:not([hidden])"); });
    const v = document.getElementById("dc-vacio"); if (v) v.hidden = n > 0 || !q;
  }
  sec.addEventListener("input", (e) => { if (e.target.id === "dc-q") filtrar(e.target.value); });
  sec.addEventListener("click", (e) => {
    const b = e.target.closest("[data-dc-ir]"); if (!b) return;
    const t = b.dataset.dcIr;
    if (t === "ordenes-lib") { abrirTab("ordenes"); setTimeout(() => { const c = document.getElementById("sv-lib"); if (c) { c.open = true; c.scrollIntoView({ behavior: "smooth", block: "start" }); } }, 500); }
    else abrirTab(t);
  });

  TABS.docs = "s-docs";
  const _dShow = show;
  show = function (id) { sec.hidden = id !== "s-docs"; _dShow(id); };
  const _dTab = abrirTab;
  abrirTab = function (t, push = true) { if (t === "docs") { docsAbrir(); return; } return _dTab(t, push); };
  function docsAbrir() { show("s-docs"); try { history.replaceState(null, "", "#docs"); } catch (_) { } pintar(); }
  // la pestaña «Documentación» ya existe en el HTML: su clic normal pasa por abrirTab
})();
