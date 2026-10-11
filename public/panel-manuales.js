/* =====================================================================
   VOLCANO CARS · PANEL: MANUALES EN SU SITIO  (panel-manuales.js · actualización 65)
   ---------------------------------------------------------------------
   · Pone, arriba de cada pantalla del panel, el botón «Manual Sxx» del sistema al que pertenece
     (Inventario → S02, Caja y Finanzas → S09, CRM y Agenda → S06, ...).
     Act. 73: Taller ya no lleva botón de manual ni la tarjeta «Sistemas»: sus manuales están solo en Documentación.
   Los PDF se abren con la sesión del panel: el clic lo gestiona panel-sistemas.js (enlaces #manual-…).
   No cambia ningún dato ni ninguna pantalla existente: solo añade botones.
   ===================================================================== */
(() => {
  "use strict";
  const P = "VolcanoCars-";
  const M = {
    S01: [P + "S01-Taller-recepcion-a-entrega", "S01 · Taller"],
    S02: [P + "S02-Recambios-almacen-cascos-abonos", "S02 · Almacén"],
    S03: [P + "S03-Instalaciones-seguridad-5S", "S03 · Seguridad y 5S"],
    S04: [P + "S04-Preparacion-detailing-anti-salitre", "S04 · Preparación"],
    S05: [P + "S05-Ventas-hoja-v3.1", "S05 · Venta"],
    S06: [P + "S06-Embudo-prueba-domicilio-seguimiento", "S06 · Embudo y seguimiento"],
    S07: [P + "S07-Postventa-garantias-atencion", "S07 · Postventa"],
    S08: [P + "S08-Marketing-digital-redes-marca", "S08 · Marketing"],
    S09: [P + "S09-Control-financiero-anti-impagos", "S09 · Control financiero"],
    S10: [P + "S10-Organizacion-puestos-RACI", "S10 · Organización"],
    S11: [P + "S11-Cuadro-de-mando-metricas", "S11 · Cuadro de mando"],
  };
  const SECCIONES = { "s-dash": ["S11", "S08"], "s-leads": ["S06"], "s-alm": ["S02"], "s-caja": ["S09"], "s-fin": ["S09"],
    "s-agenda": ["S06"], "s-resp": ["S07"], "s-jornada": ["S10", "S03"], "s-fichar": ["S03"], "s-list": ["S05", "S04"] };
  const css = document.createElement("style");
  css.textContent = ".vm-bar{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0 2px}.vm-bar a{text-decoration:none}";
  document.head.appendChild(css);

  function barras() {
    for (const [id, lista] of Object.entries(SECCIONES)) {
      const sec = document.getElementById(id); if (!sec || sec.querySelector(".vm-bar")) continue;
      const cab = sec.querySelector(".head") || sec.firstElementChild; if (!cab) continue;
      const b = document.createElement("div"); b.className = "vm-bar";
      b.innerHTML = lista.map((k) => `<a class="btn b-ghost b-sm" href="#manual-${M[k][0]}" title="Abrir el manual en PDF">📘 Manual ${M[k][1]}</a>`).join("");
      cab.insertAdjacentElement("afterend", b);
    }
  }

  function todo() { try { barras(); } catch (_) {} }
  todo();
  let pend = 0;
  new MutationObserver(() => { if (pend) return; pend = requestAnimationFrame(() => { pend = 0; todo(); }); }).observe(document.body, { childList: true, subtree: true });
})();
