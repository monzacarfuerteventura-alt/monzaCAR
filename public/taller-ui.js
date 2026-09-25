/* =====================================================================
   VOLCANO CARS · TALLER «HIGH-TECH»  (taller-ui.js)
   ---------------------------------------------------------------------
   Detalles visuales del taller. No toca la reserva: solo escucha los
   servicios que marca el cliente y pinta:
   · el contador «3 seleccionados» encima de las tarjetas;
   · el bloque «Tu presupuesto» del panel de la cita.

   PRECIOS ORIENTATIVOS: rellena PRECIOS_DESDE con tus precios «desde»
   (IGIC incluido) y el bloque enseñará un total orientativo. Si un
   servicio no tiene precio, sale como «a presupuestar». Con todo vacío
   (como viene) solo recuerda que el presupuesto es gratis y por escrito:
   así la web nunca enseña un precio que no hayas decidido tú.
   ===================================================================== */
(() => {
  "use strict";
  const servicios = document.getElementById("services");
  const caja = document.getElementById("t-estimado");
  const contador = document.getElementById("t-count");
  if (!servicios || !caja) return;

  // ← Tus precios «desde», en euros con IGIC (null = a presupuestar). Ej.: aceite: 59
  const PRECIOS_DESDE = {
    golpes: null, pintura: null, aranazos: null, aceite: null, frenos: null, neumaticos: null,
    diagnosis: null, itv: null, aire: null, distribucion: null, bateria: null, otro: null,
  };

  const EN = document.documentElement.lang === "en";
  const T = (es, en) => (EN ? en : es);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const eur = (n) => Math.round(n).toLocaleString(EN ? "en-GB" : "es-ES") + " €";

  function pintar() {
    const marcados = [...servicios.querySelectorAll("input:checked")].map((i) => ({ k: i.dataset.k, n: i.value }));
    const n = marcados.length;
    if (contador) {
      contador.textContent = n === 0 ? T("Ninguno marcado", "None selected") : n === 1 ? T("1 seleccionado", "1 selected") : T(`${n} seleccionados`, `${n} selected`);
      contador.classList.toggle("on", n > 0);
    }
    if (!n) { caja.hidden = true; caja.innerHTML = ""; return; }
    const conPrecio = marcados.filter((m) => typeof PRECIOS_DESDE[m.k] === "number");
    const total = conPrecio.reduce((a, m) => a + PRECIOS_DESDE[m.k], 0);
    const titulo = conPrecio.length
      ? `<span>${T("Presupuesto orientativo", "Estimated price")}</span><b>${T("desde", "from")} ${eur(total)}</b>`
      : `<span>${T("Tu presupuesto", "Your quote")}</span><b>${T("Gratis", "Free")}</b>`;
    const lista = marcados.map((m) => `<li>${esc(m.n)}<em>${typeof PRECIOS_DESDE[m.k] === "number" ? T("desde ", "from ") + eur(PRECIOS_DESDE[m.k]) : T("a presupuestar", "to be quoted")}</em></li>`).join("");
    const parcial = conPrecio.length && conPrecio.length < n;
    const pie = conPrecio.length
      ? T("Precios orientativos con IGIC. " + (parcial ? "Lo marcado «a presupuestar» se suma cuando veamos el coche. " : "") + "El precio final te lo damos por escrito antes de empezar.", "Guide prices incl. tax. " + (parcial ? "Items «to be quoted» are added once we've seen the car. " : "") + "We confirm the final price in writing before starting.")
      : T("Revisamos el coche y te damos el precio cerrado por escrito antes de tocar nada. Sin compromiso.", "We check the car and give you a fixed written price before touching anything. No obligation.");
    caja.innerHTML = `<div class="tx-estim-top">${titulo}</div><ul>${lista}</ul>
      <div class="tx-free"><span>${T("Por escrito", "In writing")}</span><span>${T("Antes de reparar", "Before any work")}</span><span>${T("Sin compromiso", "No obligation")}</span></div>
      <p>${pie}</p>`;
    caja.hidden = false;
  }

  servicios.addEventListener("change", pintar);
  // también cuando se quitan desde las etiquetas del resumen o los marca el asistente
  new MutationObserver(pintar).observe(document.getElementById("t-resumen") || servicios, { childList: true, subtree: true });
  pintar();
})();
