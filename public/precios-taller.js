/* =====================================================================
   VOLCANO CARS · PRECIOS «DESDE» DEL TALLER  (precios-taller.js)
   ---------------------------------------------------------------------
   Los precios se cambian en el panel: Taller → «Precios en la web».
   Se guardan en /api/precios-taller y este archivo los pinta solo:
     · en cada tarjeta de servicio del taller (/taller y la portada),
       con una etiqueta de precio animada;
     · en las etiquetas de las tarjetas «Chapa y pintura» y «Mecánica
       rápida» de la portada;
     · en las páginas de servicio (/pre-itv-fuerteventura/,
       /taller-mecanico-fuerteventura/, /chapa-y-pintura-fuerteventura/,
       /itv-fuerteventura/ y /taller-mecanico-<pueblo>) con un bloque
       «Precios desde» y su botón de reserva;
     · y los datos estructurados para Google (precio mínimo con IGIC).
   Si un servicio no tiene precio, no sale nada: la web nunca enseña un
   precio que no hayas puesto tú.
   Lo usa también /taller-ui.js (el bloque «Tu presupuesto» de la cita).
   ===================================================================== */
(() => {
  "use strict";
  if (window.VCPrecios) return;

  const EN = (document.documentElement.lang || "").toLowerCase().startsWith("en");
  const T = (es, en) => (EN ? en : es);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const QUIETO = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // estilos (un solo archivo aparte: así no hay que tocar las páginas)
  if (!document.querySelector('link[href^="/precios-taller.css"]')) {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = "/precios-taller.css";
    document.head.appendChild(l);
  }

  /* ---------------- textos ---------------- */
  const NOMBRES = {
    golpes: ["Golpes y abolladuras", "Dents and knocks", "Reparación de chapa", "Panel repair"],
    pintura: ["Pintura", "Paint", "Parcial o completa", "Partial or full respray"],
    aranazos: ["Arañazos y rozaduras", "Scratches and scuffs", "Pulido y retoque", "Polish and touch-up"],
    aceite: ["Cambio de aceite y filtros", "Oil and filter change", "Mantenimiento", "Servicing"],
    frenos: ["Frenos", "Brakes", "Pastillas y discos", "Pads and discs"],
    neumaticos: ["Neumáticos", "Tyres", "Cambio y alineado", "Fitting and alignment"],
    diagnosis: ["Diagnosis electrónica", "Electronic diagnostics", "Testigos y averías", "Warning lights and faults"],
    itv: ["Pre-ITV", "Pre-ITV (MOT) check", "Lo dejamos listo para pasarla", "We get it ready to pass"],
    aire: ["Aire acondicionado", "Air conditioning", "Carga y revisión", "Re-gas and check"],
    distribucion: ["Correa de distribución", "Timing belt", "Kit completo", "Full kit"],
    bateria: ["Batería y arranque", "Battery and starting", "Prueba y sustitución", "Test and replace"],
  };
  const CARROCERIA = ["golpes", "pintura", "aranazos"];
  const MECANICA = ["aceite", "frenos", "neumaticos", "diagnosis", "itv", "aire", "distribucion", "bateria"];
  const ETQ = { oferta: ["Oferta", "Offer"], popular: ["Más pedido", "Most popular"], nuevo: ["Nuevo", "New"], rapido: ["En el día", "Same day"] };
  const SUF = { pieza: ["/ pieza", "/ panel"], rueda: ["/ rueda", "/ tyre"], eje: ["/ eje", "/ axle"], hora: ["/ hora", "/ hour"] };
  const NOTA_ES = "Precios «desde» con IGIC incluido. El precio final depende del coche y te lo damos por escrito antes de empezar.";
  const NOTA_EN = "Starting prices, tax (IGIC) included. The final price depends on your car and we confirm it in writing before starting.";

  const nombre = (k) => (NOMBRES[k] ? NOMBRES[k][EN ? 1 : 0] : k);
  const detalle = (k) => (NOMBRES[k] ? NOMBRES[k][EN ? 3 : 2] : "");
  const fmt = (n) => {
    const entero = Math.abs(n - Math.round(n)) < 0.005;
    return new Intl.NumberFormat(EN ? "en-GB" : "es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: entero ? 0 : 2, maximumFractionDigits: entero ? 0 : 2 }).format(entero ? Math.round(n) : n);
  };
  // «49 €» → número y símbolo por separado para animar solo las cifras
  const partes = (n) => { const t = fmt(n); const m = t.match(/^([^\d]*)([\d.,\s ]+)([^\d]*)$/); return m ? { pre: m[1].trim(), num: m[2].trim(), post: m[3].trim() } : { pre: "", num: t, post: "" }; };

  /* ---------------- datos ---------------- */
  let DATOS = null;
  const precio = (k) => {
    if (!DATOS || !DATOS.activa) return null;
    const s = DATOS.servicios && DATOS.servicios[k];
    if (!s || !s.visible || typeof s.precio !== "number" || !(s.precio > 0)) return null;
    return s;
  };
  const nota = () => (DATOS ? (EN ? DATOS.notaEn || NOTA_EN : DATOS.nota || NOTA_ES) : "");
  const sufijo = (s) => (s && SUF[s.sufijo] ? SUF[s.sufijo][EN ? 1 : 0] : "");
  const etiqueta = (s) => (s && ETQ[s.etiqueta] ? ETQ[s.etiqueta][EN ? 1 : 0] : "");
  const minimo = (lista) => { const v = lista.map(precio).filter(Boolean).map((s) => s.precio); return v.length ? Math.min(...v) : null; };

  /* ---------------- etiqueta de precio ---------------- */
  // tamaño: "s" (tarjeta), "l" (páginas de servicio)
  function tagHTML(k, s, tam = "s", d = 0) {
    const p = partes(s.precio), suf = sufijo(s);
    const aria = `${T("Desde", "From")} ${fmt(s.precio)}${suf ? " " + suf : ""}${T(", IGIC incluido", ", tax included")}`;
    return `<span class="pt-tagw pt-${tam}" style="--pt-d:${d}ms" data-pt-k="${esc(k)}"><span class="pt-tag" role="img" aria-label="${esc(aria)}">`
      + `<span class="pt-desde" aria-hidden="true">${T("Desde", "From")}</span>`
      + `<span class="pt-num" aria-hidden="true">${p.pre ? `<i>${esc(p.pre)}</i>` : ""}<b data-pt-val="${s.precio}">${esc(p.num)}</b>${p.post ? `<i>${esc(p.post)}</i>` : ""}</span>`
      + (suf ? `<span class="pt-suf" aria-hidden="true">${esc(suf)}</span>` : "")
      + `</span></span>`;
  }
  const badgeHTML = (s) => { const e = etiqueta(s); return e ? `<span class="pt-badge pt-b-${esc(s.etiqueta)}">${esc(e)}</span>` : ""; };

  /* ---------------- animaciones ---------------- */
  // cifras que suben de 0 al precio cuando la etiqueta aparece en pantalla
  function contar(b) {
    const fin = Number(b.dataset.ptVal);
    if (!fin || QUIETO) return;
    const final = partes(fin).num, t0 = performance.now(), dur = 900 + Math.min(700, fin * 2);
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      b.textContent = k < 1 ? partes(Math.floor(fin * e)).num : final; // cifras enteras mientras sube; al final, el precio exacto
      if (k < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  }
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((en) => {
    if (!en.isIntersecting) return;
    io.unobserve(en.target);
    const w = en.target;
    const d = parseInt(w.style.getPropertyValue("--pt-d")) || 0;
    requestAnimationFrame(() => w.classList.add("pt-on"));
    const b = w.querySelector("b[data-pt-val]");
    if (b) setTimeout(() => contar(b), d + 120);
  }), { threshold: 0.35 }) : null;
  const activar = (raiz) => raiz.querySelectorAll(".pt-tagw:not(.pt-on)").forEach((w) => (io && !QUIETO ? io.observe(w) : w.classList.add("pt-on")));

  // la etiqueta se balancea al tocar/pasar por la tarjeta
  document.addEventListener("pointerover", (e) => {
    const c = e.target.closest && e.target.closest(".svc label, .pt-card");
    if (!c || QUIETO) return;
    const w = c.querySelector(".pt-tagw.pt-on");
    if (!w || w.classList.contains("pt-swing")) return;
    w.classList.add("pt-swing");
    setTimeout(() => w.classList.remove("pt-swing"), 950);
  });

  /* ---------------- 1. tarjetas de servicio del taller (#services) ---------------- */
  function pintarServicios() {
    const cont = document.getElementById("services");
    if (!cont) return;
    let i = 0;
    cont.querySelectorAll(".svc input[data-k]").forEach((inp) => {
      const k = inp.dataset.k, label = inp.nextElementSibling;
      if (!label) return;
      label.querySelectorAll(".pt-fila,.pt-tagw,.pt-badge").forEach((x) => x.remove());
      label.classList.remove("pt-con");
      const s = precio(k), txt = label.querySelector(":scope > span:not(.ic):not(.tick)");
      if (!s || !txt) return;
      txt.insertAdjacentHTML("beforeend", `<span class="pt-fila">${tagHTML(k, s, "s", 60 * i++)}${badgeHTML(s)}</span>`);
      label.classList.add("pt-con");
      label.setAttribute("title", `${nombre(k)} · ${T("desde", "from")} ${fmt(s.precio)}${sufijo(s) ? " " + sufijo(s) : ""}`);
    });
    activar(cont);
  }

  /* ---------------- 2. portada: tarjetas «Chapa y pintura» y «Mecánica rápida» ---------------- */
  const PILDORAS = {
    "golpes y abolladuras": "golpes", "dents and knocks": "golpes",
    "arañazos": "aranazos", "scratches": "aranazos",
    "pintura parcial o completa": "pintura", "partial or full respray": "pintura",
    "aceite y filtros": "aceite", "oil and filters": "aceite",
    "frenos": "frenos", "brakes": "frenos",
    "neumáticos": "neumaticos", "tyres": "neumaticos",
    "diagnosis": "diagnosis", "diagnostics": "diagnosis",
    "pre-itv": "itv", "pre-itv (mot) check": "itv",
  };
  function pintarPortada() {
    document.querySelectorAll(".feature").forEach((f) => {
      f.querySelectorAll(".pt-mini,.pt-from").forEach((x) => x.remove());
      f.querySelectorAll("ul li").forEach((li) => {
        const k = PILDORAS[li.textContent.trim().toLowerCase()], s = k && precio(k);
        if (s) li.insertAdjacentHTML("beforeend", ` <em class="pt-mini">${fmt(s.precio)}</em>`);
      });
      const grupo = f.classList.contains("paint") ? CARROCERIA : f.classList.contains("mech") ? MECANICA : null;
      const m = grupo && minimo(grupo), h3 = f.querySelector("h3");
      if (m && h3) {
        h3.insertAdjacentHTML("afterend", `<div class="pt-from">${tagHTML(grupo[0], { precio: m }, "m", 150)}<span>${T("IGIC incluido", "Tax included")}</span></div>`);
        activar(f);
      }
    });
  }

  /* ---------------- 3. páginas de servicio ---------------- */
  const RUTA = location.pathname.replace(/\/+$/, "/");
  const PAGINAS = {
    "/pre-itv-fuerteventura/": ["itv", "frenos", "neumaticos", "diagnosis"],
    "/itv-fuerteventura/": ["itv", "frenos", "neumaticos", "diagnosis"],
    "/taller-mecanico-fuerteventura/": MECANICA,
    "/chapa-y-pintura-fuerteventura/": CARROCERIA,
  };
  const deLaPagina = () => PAGINAS[RUTA] || (/^\/taller-mecanico-[a-z-]+\/?$/.test(location.pathname) ? [...CARROCERIA, ...MECANICA] : null);

  function pintarPagina() {
    const lista = deLaPagina();
    if (!lista) return;
    document.querySelectorAll(".pt-land").forEach((x) => x.remove());
    const con = lista.filter((k) => precio(k));
    if (!con.length) return;
    const hero = document.querySelector(".pg-hero");
    if (!hero) return;
    const cards = con.map((k, i) => {
      const s = precio(k);
      return `<article class="pt-card${s.etiqueta ? " pt-card-dest" : ""}">${badgeHTML(s)}
        <h3>${esc(nombre(k))}</h3><p>${esc(detalle(k))}</p>
        ${tagHTML(k, s, "l", 90 * i)}
        <a class="pt-cta" href="/taller?servicio=${encodeURIComponent(k)}">${T("Reservar cita", "Book now")}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
      </article>`;
    }).join("");
    hero.insertAdjacentHTML("afterend", `<section class="sec pt-land" aria-labelledby="pt-land-h">
      <div class="pt-land-head"><span class="eyebrow">${T("Precios claros", "Clear prices")}</span><h2 id="pt-land-h">${T("Precios", "Prices")} <span class="r">${T("desde", "from")}</span></h2></div>
      <div class="pt-grid">${cards}</div>
      <p class="pt-nota">${esc(nota())}</p>
    </section>`);
    activar(document.querySelector(".pt-land"));
    // la pregunta «¿Cuánto cuesta la pre-ITV?» ya tiene respuesta
    const itv = precio("itv");
    if (itv) document.querySelectorAll(".faq details").forEach((d) => {
      const sm = d.querySelector("summary"), p = d.querySelector("p");
      if (sm && p && /cu[aá]nto cuesta la pre-itv/i.test(sm.textContent) && !p.dataset.pt) {
        p.dataset.pt = "1";
        p.textContent = `Desde ${fmt(itv.precio)} con IGIC incluido. Si luego hay que reparar algo, te damos presupuesto por escrito antes de hacerlo.`;
      }
    });
  }

  /* ---------------- 4. datos estructurados para Google ---------------- */
  function pintarLD() {
    document.querySelectorAll("script[data-pt-ld]").forEach((x) => x.remove());
    const lista = deLaPagina() || (document.getElementById("services") ? [...CARROCERIA, ...MECANICA] : []);
    const con = lista.filter((k) => precio(k));
    if (!con.length) return;
    const ld = {
      "@context": "https://schema.org", "@type": "OfferCatalog", name: T("Precios del taller Volcano Cars", "Volcano Cars workshop prices"),
      itemListElement: con.map((k) => ({
        "@type": "Offer", priceCurrency: "EUR",
        itemOffered: { "@type": "Service", name: nombre(k), provider: { "@id": "https://volcanocars.com/#negocio" }, areaServed: { "@type": "Island", name: "Fuerteventura" } },
        priceSpecification: { "@type": "PriceSpecification", minPrice: precio(k).precio, priceCurrency: "EUR", valueAddedTaxIncluded: true },
      })),
    };
    const sc = document.createElement("script");
    sc.type = "application/ld+json"; sc.dataset.ptLd = "1";
    sc.textContent = JSON.stringify(ld).replace(/</g, "\\u003c");
    document.head.appendChild(sc);
  }

  /* ---------------- 5. /taller?servicio=itv → sale ya marcado ---------------- */
  function preseleccionar() {
    const k = new URLSearchParams(location.search).get("servicio");
    if (!k || !/^[a-z]{2,20}$/.test(k)) return;
    const inp = document.querySelector(`#services input[data-k="${k}"]`);
    if (inp && !inp.checked) { inp.checked = true; inp.dispatchEvent(new Event("change", { bubbles: true })); }
  }

  function pintarTodo() {
    try { pintarServicios(); } catch (_) {}
    try { pintarPortada(); } catch (_) {}
    try { pintarPagina(); } catch (_) {}
    try { pintarLD(); } catch (_) {}
    document.dispatchEvent(new CustomEvent("vc:precios", { detail: DATOS }));
  }

  let soltar;
  const listo = new Promise((r) => (soltar = r));
  const cargar = () => fetch("/api/precios-taller", { cache: "no-cache" })
    .then((r) => (r.ok ? r.json() : null)).catch(() => null)
    .then((d) => { DATOS = d && d.servicios ? d : null; soltar(API); });

  const API = { listo, precio, fmt, partes, sufijo, etiqueta, nota, nombre, tagHTML, activar, contar, get datos() { return DATOS; } };
  window.VCPrecios = API;

  const arrancar = () => {
    // en las páginas sin servicios del taller (fichas de coches, vendidos…) no se pide nada
    if (!document.getElementById("services") && !document.querySelector(".feature") && !deLaPagina()) { soltar(API); return; }
    cargar();
    preseleccionar();
    listo.then(() => {
      pintarTodo();
      // si la web vuelve a pintar los servicios (cambio de idioma, etc.), se vuelven a poner los precios
      const cont = document.getElementById("services");
      if (cont) new MutationObserver((m) => { if (m.some((x) => [...x.addedNodes].some((n) => n.classList && n.classList.contains("svc")))) pintarServicios(); }).observe(cont, { childList: true });
    });
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", arrancar); else arrancar();
})();
