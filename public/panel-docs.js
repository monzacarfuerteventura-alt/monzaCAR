/* =====================================================================
   DOCUMENTACIÓN (actualización 68; ordenada en la 73) · pestaña del panel
   Reúne en un solo sitio: el manual de marca (arriba), todos los formularios (FORM-01 a FORM-17, en el orden de los manuales)
   y los manuales S00–S11. Los PDF se abren con /api/manual/<nombre> y solo con sesión (netlify/functions/manuales.mts);
   los enlaces usan «#manual-<nombre>», que gestiona panel-sistemas.js.
   Act. 73: se quitó la tarjeta «Modelo de ventas» (sus manuales S04–S07 ya están en la lista de manuales) y la tarjeta
   «Sistemas Volcano Cars» de Taller: los formularios digitales (FORM-07, 08, 09, 12, 13, 14 y 15) se abren desde aquí
   con «Rellenar» (window.VCSistemas.abrir, de panel-sistemas.js).
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
  // Los 17 formularios, EN EL ORDEN DE LOS MANUALES (S01 a S11). [número, nombre, manual, dónde se rellena, PDF (o "")]
  // «Nunca se reutiliza un número» (S00): desde la act. 72 el orden es este y la tabla de equivalencias con los números antiguos está en la Hoja v3.3.
  const FORMULARIOS = [
    ["FORM-01", "Ficha de recepción", "S01", "Taller → orden → Fichas", "FORM-01"],
    ["FORM-02", "Inspección de entrada 360°", "S01", "Taller → orden → Fichas", "FORM-02"],
    ["FORM-03", "Presupuesto (validez 12 días hábiles)", "S01", "Taller → orden → Fichas", "FORM-03"],
    ["FORM-04", "Control de tiempos y mano de obra", "S01", "Taller → orden → Fichas", "FORM-04"],
    ["FORM-05", "Control de calidad pre-entrega", "S01", "Taller → orden → Fichas", "FORM-05"],
    ["FORM-06", "Factura de reparación", "S01", "Taller → orden → Fichas", "FORM-06"],
    ["FORM-07", "Cascos y abonos", "S02", "Formulario digital: se rellena aquí", ""],
    ["FORM-08", "Ronda 5S y seguridad", "S03", "Formulario digital: se rellena aquí", ""],
    ["FORM-09", "Hoja de preparación", "S04", "Formulario digital: se rellena aquí", ""],
    ["FORM-10", "Parte de reserva de vehículo", "S05 · S06", "Coches → reservar", "FORM-10"],
    ["FORM-11", "Factura de venta de vehículo", "S05", "Coches → vender", "FORM-11"],
    ["FORM-12", "Prueba a domicilio · fianza 50 €", "S06", "Formulario digital: se rellena aquí", ""],
    ["FORM-13", "Registro de postventa", "S07", "Formulario digital: se rellena aquí", ""],
    ["FORM-14", "Plan semanal de marketing", "S08", "Formulario digital: se rellena aquí (solo gerente)", ""],
    ["FORM-15", "Auditoría del viernes", "S09", "Formulario digital: se rellena aquí (solo gerente)", ""],
    ["FORM-16", "Organigrama y RACI", "S10", "En papel", ""],
    ["FORM-17", "Cuadro de mando", "S11", "En papel (los números salen del Dashboard, Finanzas y Jornada)", ""]
  ];
  const MANUALES = [
    ["S00", "Índice MO-00 · orden de implantación", SIS + "S00-Indice-MO-00-v3.0"], ["S00", "Hoja v3.3 · numeración de los formularios 01→17 (vigente)", SIS + "S00-Hoja-v3.3-Renumeracion-formularios"], ["S00", "Hoja v3.2 · fe de erratas (los números de formulario de esta hoja son los antiguos)", SIS + "S00-Hoja-v3.2-Fe-de-erratas"],
    ["S01", "Taller: de la recepción a la entrega", SIS + "S01-Taller-recepcion-a-entrega"], ["S02", "Recambios, almacén, cascos y abonos", SIS + "S02-Recambios-almacen-cascos-abonos"],
    ["S03", "Instalaciones, seguridad y 5S", SIS + "S03-Instalaciones-seguridad-5S"], ["S04", "Preparación y detailing anti-salitre", SIS + "S04-Preparacion-detailing-anti-salitre"],
    ["S05", "Ventas · hoja v3.1", SIS + "S05-Ventas-hoja-v3.1"], ["S06", "Embudo, prueba a domicilio y seguimiento", SIS + "S06-Embudo-prueba-domicilio-seguimiento"],
    ["S07", "Postventa, garantías y atención", SIS + "S07-Postventa-garantias-atencion"], ["S08", "Marketing digital, redes y marca", SIS + "S08-Marketing-digital-redes-marca"],
    ["S09", "Control financiero y anti-impagos", SIS + "S09-Control-financiero-anti-impagos"], ["S10", "Organización, puestos y RACI", SIS + "S10-Organizacion-puestos-RACI"],
    ["S11", "Cuadro de mando y métricas", SIS + "S11-Cuadro-de-mando-metricas"]
  ];

  // Formularios que se rellenan en el panel (los abre panel-sistemas.js). 14 y 15 son solo del gerente.
  const DIGITALES = new Set(["FORM-07", "FORM-08", "FORM-09", "FORM-12", "FORM-13", "FORM-14", "FORM-15"]);
  const soloGer = (n) => n === "FORM-14" || n === "FORM-15";
  const esGer = () => { try { return PUEDE_TODO(); } catch (_) { return true; } };

  const fila = (t, d, f, b) => `<div class="dc-row" data-q="${E((t + " " + d).toLowerCase())}"><div><b>${E(t)}</b><span>${E(d)}</span></div><a class="btn b-ghost b-sm" href="${pdf(f)}" target="_blank" rel="noopener">${E(b || "Abrir PDF")} ↗</a></div>`;
  function pintar() {
    sec.innerHTML = `
    <div class="head"><div><h1 style="font-size:28px">Documentación</h1><p>Todo en un sitio: la marca, las fichas y los manuales. Los PDF solo se abren con tu sesión.</p></div>
      <div class="acts"><input id="dc-q" type="search" placeholder="Buscar documento…" aria-label="Buscar documento" style="min-width:220px"></div></div>
    <div class="dc-grid">
      <section class="card dc-card dc-marca dc-full"><h3>Marca</h3><p class="hint">Cómo se ve y cómo habla Volcano Cars.</p>${MARCAS.map((x) => fila(...x)).join("")}</section>
      <section class="card dc-card dc-full"><h3>Formularios (FORM-01 a FORM-17)</h3><p class="hint">Numerados en el orden de los manuales: FORM-01 a 06 son las fichas del taller (S01), después los de cada manual hasta S11. Cada número tiene siempre el mismo nombre aquí, en el panel, en el PDF y en los manuales.</p>
        <div class="dc-row" data-q="todas las fichas del taller en un solo pdf"><div><b>Todas las fichas del taller (FORM-01 a FORM-06)</b><span>S01 · Un solo PDF, en orden: recepción, inspección, presupuesto, tiempos, calidad y factura.</span></div><a class="btn b-ghost b-sm" href="${pdf("FICHAS-TALLER")}" target="_blank" rel="noopener">Abrir PDF ↗</a></div>
        ${FORMULARIOS.map(([n, t, m, d, f]) => `<div class="dc-row" data-q="${E((n + " " + t + " " + m + " " + d).toLowerCase())}"><div><b>${n} · ${E(t)}</b><span>${E(m)} · ${E(d)}</span></div>${f ? `<a class="btn b-ghost b-sm" href="${pdf(f)}" target="_blank" rel="noopener">PDF ↗</a>` : DIGITALES.has(n) ? (soloGer(n) && !esGer() ? `<span class="dc-nota">Solo gerente</span>` : `<button type="button" class="btn b-ghost b-sm" data-dc-form="${n}">Rellenar</button>`) : ""}</div>`).join("")}
        <p class="hint" style="margin-top:10px">Si tienes impresos o manuales con la numeración antigua, la Hoja v3.3 de la lista de manuales trae la tabla de equivalencias.</p></section>
      <section class="card dc-card dc-full"><h3>Manuales de sistemas (S00 a S11)</h3><p class="hint">Se leen en este orden: primero la hoja v3.3 (numeración vigente de los formularios), después la v3.2, las hojas v3.1 y, al final, el manual original.</p>${MANUALES.map(([n, t, f]) => fila(n + " · " + t, "", f, "PDF")).join("")}</section>
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
    const b = e.target.closest("[data-dc-form]"); if (!b) return;
    if (window.VCSistemas) window.VCSistemas.abrir(b.dataset.dcForm);
    else if (typeof toast === "function") toast("El formulario todavía se está cargando. Prueba otra vez en un momento.");
  });

  TABS.docs = "s-docs";
  const _dShow = show;
  show = function (id) { sec.hidden = id !== "s-docs"; _dShow(id); };
  const _dTab = abrirTab;
  abrirTab = function (t, push = true) { if (t === "docs") { docsAbrir(); return; } return _dTab(t, push); };
  function docsAbrir() { show("s-docs"); try { history.replaceState(null, "", "#docs"); } catch (_) { } pintar(); }
  // la pestaña «Documentación» ya existe en el HTML: su clic normal pasa por abrirTab
})();
