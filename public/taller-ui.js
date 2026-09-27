/* =====================================================================
   VOLCANO CARS · TALLER «HIGH-TECH»  (taller-ui.js)
   ---------------------------------------------------------------------
   Detalles visuales del taller. No toca la reserva: solo escucha los
   servicios que marca el cliente y pinta:
   · el contador «3 seleccionados» encima de las tarjetas;
   · el bloque «Tu presupuesto» del panel de la cita.

   PRECIOS «DESDE»: ya no se escriben aquí. Se ponen en el panel
   (Taller → «Precios en la web») y los trae /precios-taller.js, que
   también pinta las etiquetas animadas de cada tarjeta. Si un servicio
   no tiene precio, sale como «a presupuestar». Sin ningún precio, el
   bloque solo recuerda que el presupuesto es gratis y por escrito:
   así la web nunca enseña un precio que no hayas decidido tú.
   ===================================================================== */
(() => {
  "use strict";
  // carga los precios del panel (y sus etiquetas animadas) en todas las páginas que usan este archivo
  if (!window.VCPrecios && !document.querySelector('script[src^="/precios-taller.js"]')) {
    const s = document.createElement("script");
    s.src = "/precios-taller.js"; s.defer = true;
    document.head.appendChild(s);
  }
  // fondo en vídeo (render CAD / X-Ray) del servicio que se marca: /taller-vfx.js
  if (document.getElementById("v-taller") && !document.querySelector('script[src^="/taller-vfx.js"]')) {
    const s = document.createElement("script");
    s.src = "/taller-vfx.js"; s.defer = true;
    document.head.appendChild(s);
  }

  const servicios = document.getElementById("services");
  const caja = document.getElementById("t-estimado");
  const contador = document.getElementById("t-count");
  if (!servicios || !caja) return;

  const EN = document.documentElement.lang === "en";
  const T = (es, en) => (EN ? en : es);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const P = () => window.VCPrecios || null;
  const eur = (n) => (P() ? P().fmt(n) : Math.round(n).toLocaleString(EN ? "en-GB" : "es-ES") + " €");
  const precioDe = (k) => { const p = P(); const s = p && p.precio(k); return s ? s : null; };
  let totalAnterior = 0;

  // el total sube o baja animado hasta la cifra nueva
  function animarTotal(el, de, a) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || de === a) { el.textContent = eur(a); return; }
    const t0 = performance.now(), dur = 650;
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = k < 1 ? eur(Math.round(de + (a - de) * e)) : eur(a);
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
    el.classList.remove("tx-bump"); void el.offsetWidth; el.classList.add("tx-bump");
  }

  function pintar() {
    const marcados = [...servicios.querySelectorAll("input:checked")].map((i) => ({ k: i.dataset.k, n: i.value }));
    const n = marcados.length;
    if (contador) {
      contador.textContent = n === 0 ? T("Ninguno marcado", "None selected") : n === 1 ? T("1 seleccionado", "1 selected") : T(`${n} seleccionados`, `${n} selected`);
      contador.classList.toggle("on", n > 0);
    }
    if (!n) { caja.hidden = true; caja.innerHTML = ""; totalAnterior = 0; return; }
    const conPrecio = marcados.filter((m) => precioDe(m.k));
    const total = conPrecio.reduce((a, m) => a + precioDe(m.k).precio, 0);
    const titulo = conPrecio.length
      ? `<span>${T("Presupuesto orientativo", "Estimated price")}</span><b><small>${T("desde", "from")}</small> <em data-tx-total>${eur(totalAnterior || total)}</em></b>`
      : `<span>${T("Tu presupuesto", "Your quote")}</span><b>${T("Gratis", "Free")}</b>`;
    const lista = marcados.map((m) => {
      const s = precioDe(m.k), suf = s && P().sufijo(s);
      return `<li>${esc(m.n)}<em>${s ? T("desde ", "from ") + eur(s.precio) + (suf ? " " + esc(suf) : "") : T("a presupuestar", "to be quoted")}</em></li>`;
    }).join("");
    const parcial = conPrecio.length && conPrecio.length < n;
    const pie = conPrecio.length
      ? T("Precios orientativos con IGIC. " + (parcial ? "Lo marcado «a presupuestar» se suma cuando veamos el coche. " : "") + "El precio final te lo damos por escrito antes de empezar.", "Guide prices incl. tax. " + (parcial ? "Items «to be quoted» are added once we've seen the car. " : "") + "We confirm the final price in writing before starting.")
      : T("Revisamos el coche y te damos el precio cerrado por escrito antes de tocar nada. Sin compromiso.", "We check the car and give you a fixed written price before touching anything. No obligation.");
    caja.innerHTML = `<div class="tx-estim-top">${titulo}</div><ul>${lista}</ul>
      <div class="tx-free"><span>${T("Por escrito", "In writing")}</span><span>${T("Antes de reparar", "Before any work")}</span><span>${T("Sin compromiso", "No obligation")}</span></div>
      <p>${pie}</p>`;
    caja.hidden = false;
    const el = caja.querySelector("[data-tx-total]");
    if (el) animarTotal(el, totalAnterior || 0, total);
    totalAnterior = conPrecio.length ? total : 0;
  }

  // varios avisos seguidos (cambio + resumen) = un solo repintado, para que la cifra se anime bien
  let pend = 0;
  const pedir = () => { cancelAnimationFrame(pend); pend = requestAnimationFrame(pintar); };
  servicios.addEventListener("change", pedir);
  // también cuando se quitan desde las etiquetas del resumen o los marca el asistente
  new MutationObserver(pedir).observe(document.getElementById("t-resumen") || servicios, { childList: true, subtree: true });
  // cuando llegan los precios del panel
  document.addEventListener("vc:precios", pedir);
  pintar();
})();
