/* =====================================================================
   VOLCANO CARS · PANEL: PRECIOS «DESDE» DEL TALLER  (panel-precios.js)
   ---------------------------------------------------------------------
   Pestaña Taller → tarjeta «Precios en la web».
   El gerente pone el precio «desde» (IGIC incluido) de cada servicio
   del taller: Pre-ITV, frenos, pintura, aceite, neumáticos… Al pulsar
   «Guardar y publicar» sale al momento en la web con su etiqueta de
   precio animada (/precios-taller.js).
   · Vacío = «a presupuestar» (la web no enseña precio).
   · Sufijo opcional: / pieza, / rueda, / eje, / hora.
   · Etiqueta opcional: Oferta, Más pedido, Nuevo, En el día.
   · Ojo: ocultar un servicio sin borrar su precio.
   Solo el gerente (contraseña del panel) puede guardar; el equipo del
   taller no ve esta tarjeta. Usa las funciones del panel (api, toast).
   ===================================================================== */
(() => {
  "use strict";
  const q = (s, r = document) => r.querySelector(s);
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const aviso = (t) => { try { toast(t); } catch (_) { alert(t); } };
  const sec = q("#s-ordenes");
  if (!sec || q("#pt-cfg")) return;

  if (!q('link[href^="/precios-taller.css"]')) {
    const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "/precios-taller.css"; document.head.appendChild(l);
  }

  const GRUPOS = [
    ["Carrocería", [
      ["golpes", "Golpes y abolladuras", "Reparación de chapa"],
      ["pintura", "Pintura", "Parcial o completa"],
      ["aranazos", "Arañazos y rozaduras", "Pulido y retoque"],
    ]],
    ["Mecánica", [
      ["itv", "Pre-ITV", "Lo dejamos listo para pasarla"],
      ["aceite", "Cambio de aceite y filtros", "Mantenimiento"],
      ["frenos", "Frenos", "Pastillas y discos"],
      ["neumaticos", "Neumáticos", "Cambio y alineado"],
      ["diagnosis", "Diagnosis electrónica", "Testigos y averías"],
      ["aire", "Aire acondicionado", "Carga y revisión"],
      ["distribucion", "Correa de distribución", "Kit completo"],
      ["bateria", "Batería y arranque", "Prueba y sustitución"],
    ]],
  ];
  const TODOS = GRUPOS.flatMap((g) => g[1].map((s) => s[0]));
  const SUF = [["", "—"], ["pieza", "/ pieza"], ["rueda", "/ rueda"], ["eje", "/ eje"], ["hora", "/ hora"]];
  const ETQ = [["", "Sin etiqueta"], ["oferta", "🔥 Oferta"], ["popular", "⭐ Más pedido"], ["nuevo", "✨ Nuevo"], ["rapido", "⚡ En el día"]];
  const ETQ_TXT = { oferta: "Oferta", popular: "Más pedido", nuevo: "Nuevo", rapido: "En el día" };
  const NOTA_ES = "Precios «desde» con IGIC incluido. El precio final depende del coche y te lo damos por escrito antes de empezar.";
  const NOTA_EN = "Starting prices, tax (IGIC) included. The final price depends on your car and we confirm it in writing before starting.";

  const num = (v) => { const t = String(v ?? "").replace(/\s|€/g, "").replace(",", "."); if (!t) return null; const n = Number(t); return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : NaN; };
  const eurTxt = (n) => { const ent = Math.abs(n - Math.round(n)) < 0.005; return new Intl.NumberFormat("es-ES", { minimumFractionDigits: ent ? 0 : 2, maximumFractionDigits: ent ? 0 : 2 }).format(n); };
  const aInput = (n) => (typeof n === "number" ? (Number.isInteger(n) ? String(n) : n.toFixed(2)).replace(".", ",") : "");

  let DATOS = null, cambiado = false;

  /* ---------------- estilos propios de la tarjeta ---------------- */
  const css = document.createElement("style");
  css.textContent = `
  body.modo-equipo #pt-cfg{display:none!important}
  #pt-cfg summary .pt-ic{display:inline-grid;place-items:center;width:34px;height:34px;border-radius:10px;margin-right:12px;flex-shrink:0;color:#fff;background:linear-gradient(135deg,#D94A26,#FF7A45);box-shadow:0 8px 18px -8px rgba(217,74,38,.8)}
  #pt-cfg summary > span:first-child{display:flex;align-items:center}
  #pt-cfg .pt-live{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#3DDC84;margin-left:8px;vertical-align:middle}
  #pt-cfg .pt-live i{width:7px;height:7px;border-radius:50%;background:#3DDC84;box-shadow:0 0 0 0 rgba(61,220,132,.6);animation:ptLed 1.8s infinite}
  #pt-cfg .pt-live.off{color:var(--muted)} #pt-cfg .pt-live.off i{background:var(--muted);animation:none}
  @keyframes ptLed{0%{box-shadow:0 0 0 0 rgba(61,220,132,.55)}70%{box-shadow:0 0 0 8px rgba(61,220,132,0)}100%{box-shadow:0 0 0 0 rgba(61,220,132,0)}}
  .pt-ed-g{margin:4px 0 -4px;font-size:11.5px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--muted);display:flex;align-items:center;gap:10px}
  .pt-ed-g::after{content:"";flex:1;height:1px;background:var(--line)}
  .pt-ed-list{display:grid;gap:8px}
  .pt-row{display:grid;grid-template-columns:minmax(150px,1.3fr) 118px 104px 168px 44px minmax(130px,1fr);gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:14px;background:var(--surface-2,rgba(255,255,255,.03));transition:border-color .25s,background .25s,opacity .25s}
  .pt-row.con{border-color:rgba(217,74,38,.45);background:linear-gradient(90deg,rgba(217,74,38,.10),transparent 60%)}
  .pt-row.oculto{opacity:.55}
  .pt-row .pt-n b{display:block;font-size:15px;line-height:1.2}.pt-row .pt-n small{display:block;color:var(--muted);font-size:12.5px}
  .pt-row .in{padding:9px 10px;font-size:15px}
  .pt-eur{position:relative}.pt-eur .in{padding-right:26px;text-align:right;font-weight:800;font-variant-numeric:tabular-nums}
  .pt-eur::after{content:"€";position:absolute;right:10px;top:50%;transform:translateY(-50%);color:var(--muted);font-weight:700;pointer-events:none}
  .pt-eur .in.mal{border-color:#E5484D;box-shadow:0 0 0 3px rgba(229,72,77,.2)}
  .pt-ojo{width:40px;height:40px;border-radius:10px;border:1.5px solid var(--line);background:transparent;color:var(--ink);cursor:pointer;display:grid;place-items:center}
  .pt-ojo[aria-pressed="false"]{color:var(--muted);border-style:dashed}
  .pt-prev{min-height:40px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;position:relative}
  .pt-prev .pt-badge{position:static;border-radius:6px;padding:3px 7px}
  .pt-prev .pt-vacio{font-size:12.5px;color:var(--muted);font-style:italic}
  .pt-prev .pt-tagw{opacity:1;transform:none}
  .pt-prev .pt-tagw.pt-pop{animation:pt-marcado .5s var(--pt-spring)}
  .pt-cab{display:grid;grid-template-columns:minmax(150px,1.3fr) 118px 104px 168px 44px minmax(130px,1fr);gap:10px;padding:0 12px;font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
  .pt-acts{display:flex;gap:10px;flex-wrap:wrap;align-items:center}
  .pt-acts .pt-est{font-size:13px;color:var(--muted)} .pt-acts .pt-est.sin{color:#F2A33A;font-weight:700}
  @media (max-width:900px){
    .pt-cab{display:none}
    .pt-row{grid-template-columns:1fr 1fr 44px;grid-template-areas:"n n n" "p s o" "e e e" "v v v"}
    .pt-row .pt-n{grid-area:n}.pt-row .pt-eur{grid-area:p}.pt-row .pt-su{grid-area:s}.pt-row .pt-e{grid-area:e}.pt-row .pt-ojo{grid-area:o}.pt-row .pt-prev{grid-area:v}
  }`;
  document.head.appendChild(css);

  /* ---------------- la tarjeta ---------------- */
  const card = document.createElement("details");
  card.className = "card fin-cfg"; card.id = "pt-cfg";
  card.innerHTML = `<summary><span><span class="pt-ic" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg></span>
      <span><b>Precios en la web <span class="pt-live off" id="pt-live"><i></i><span>…</span></span></b><small id="pt-res">Cargando…</small></span></span><span class="fin-ab">Cambiar</span></summary>
    <form id="pt-f" class="fin-grid" novalidate>
      <label class="fin-sw"><input type="checkbox" id="pt-activa"> <span>Enseñar los precios «desde» en la web (taller, portada y páginas de servicio)</span></label>
      <p class="hint" style="margin:0">Pon el <b>precio final más bajo con IGIC incluido</b> («desde»). Déjalo vacío si ese servicio es «a presupuestar». Con el ojo puedes ocultar un servicio sin perder su precio. La etiqueta hace que destaque (con cinta animada).</p>
      <div class="pt-cab" aria-hidden="true"><span>Servicio</span><span>Desde (€)</span><span>Unidad</span><span>Etiqueta</span><span>Ver</span><span>Así se verá</span></div>
      <div class="pt-ed-list" id="pt-list"></div>
      <div class="g2">
        <div class="field"><label for="pt-nota">Letra pequeña (español)</label><input class="in" id="pt-nota" maxlength="200" placeholder="${E(NOTA_ES)}"></div>
        <div class="field"><label for="pt-nota-en">Letra pequeña (inglés)</label><input class="in" id="pt-nota-en" maxlength="200" placeholder="${E(NOTA_EN)}"></div>
      </div>
      <div class="pt-acts">
        <button class="btn b-brand" type="submit" id="pt-save">Guardar y publicar</button>
        <a class="btn b-ghost" href="/taller" target="_blank" rel="noopener">Ver el taller en la web ↗</a>
        <a class="btn b-ghost" href="/pre-itv-fuerteventura/" target="_blank" rel="noopener">Ver página Pre-ITV ↗</a>
        <span class="pt-est" id="pt-est" aria-live="polite"></span>
      </div>
    </form>`;
  const head = q(".head", sec);
  (head ? head : sec.firstElementChild).insertAdjacentElement("afterend", card);

  /* ---------------- vista previa de la etiqueta (la misma que en la web) ---------------- */
  function preview(fila) {
    const k = fila.dataset.k, box = q(".pt-prev", fila);
    const v = num(q(".pt-eur .in", fila).value), suf = q(".pt-su", fila).value, etq = q(".pt-e", fila).value, ver = q(".pt-ojo", fila).getAttribute("aria-pressed") === "true";
    q(".pt-eur .in", fila).classList.toggle("mal", Number.isNaN(v));
    fila.classList.toggle("con", typeof v === "number" && v > 0 && ver);
    fila.classList.toggle("oculto", !ver);
    if (Number.isNaN(v)) { box.innerHTML = `<span class="pt-vacio">Precio no válido</span>`; return; }
    if (!v) { box.innerHTML = `<span class="pt-vacio">a presupuestar</span>`; return; }
    const sufTxt = (SUF.find((s) => s[0] === suf) || ["", ""])[1];
    box.innerHTML = `<span class="pt-tagw pt-on"><span class="pt-tag"><span class="pt-desde">Desde</span><span class="pt-num"><b>${E(eurTxt(v))}</b><i>€</i></span>${suf ? `<span class="pt-suf">${E(sufTxt)}</span>` : ""}</span></span>`
      + (etq ? `<span class="pt-badge pt-b-${E(etq)}">${E(ETQ_TXT[etq])}</span>` : "")
      + (ver ? "" : `<span class="pt-vacio">oculto</span>`);
    const w = q(".pt-tagw", box); if (w) { void w.offsetWidth; w.classList.add("pt-pop"); }
  }

  function pintarLista() {
    const S = (DATOS && DATOS.servicios) || {};
    q("#pt-list", card).innerHTML = GRUPOS.map(([g, l]) => `<div class="pt-ed-g">${E(g)}</div>` + l.map(([k, n, d]) => {
      const s = S[k] || { precio: null, visible: true, etiqueta: "", sufijo: "" };
      return `<div class="pt-row" data-k="${k}">
        <div class="pt-n"><b>${E(n)}</b><small>${E(d)}</small></div>
        <div class="pt-eur"><input class="in" inputmode="decimal" autocomplete="off" aria-label="Precio desde de ${E(n)} en euros" placeholder="—" value="${E(aInput(s.precio))}"></div>
        <select class="in pt-su" aria-label="Unidad de ${E(n)}">${SUF.map(([v, t]) => `<option value="${v}" ${v === s.sufijo ? "selected" : ""}>${E(t)}</option>`).join("")}</select>
        <select class="in pt-e" aria-label="Etiqueta de ${E(n)}">${ETQ.map(([v, t]) => `<option value="${v}" ${v === s.etiqueta ? "selected" : ""}>${E(t)}</option>`).join("")}</select>
        <button type="button" class="pt-ojo" aria-pressed="${s.visible !== false}" title="Mostrar u ocultar en la web" aria-label="Mostrar ${E(n)} en la web">${s.visible !== false ? ojo(true) : ojo(false)}</button>
        <div class="pt-prev" aria-hidden="true"></div>
      </div>`;
    }).join("")).join("");
    card.querySelectorAll(".pt-row").forEach(preview);
    q("#pt-activa", card).checked = !DATOS || DATOS.activa !== false;
    q("#pt-nota", card).value = (DATOS && DATOS.nota) || "";
    q("#pt-nota-en", card).value = (DATOS && DATOS.notaEn) || "";
  }
  const ojo = (on) => on
    ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>`
    : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.9 17.9A10.4 10.4 0 0112 19C5 19 1 12 1 12a18.5 18.5 0 015.1-5.9M9.9 4.2A9.1 9.1 0 0112 4c7 0 11 7 11 7a18.3 18.3 0 01-2.2 3.2M1 1l22 22"/></svg>`;

  function resumen() {
    const S = (DATOS && DATOS.servicios) || {};
    const con = TODOS.filter((k) => S[k] && typeof S[k].precio === "number" && S[k].visible !== false);
    const live = q("#pt-live", card), on = DATOS && DATOS.activa !== false && con.length > 0;
    live.classList.toggle("off", !on); q("span", live).textContent = on ? "En la web" : "Sin publicar";
    const cuando = DATOS && DATOS.actualizado ? " · actualizado el " + new Date(DATOS.actualizado).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "";
    q("#pt-res", card).textContent = !DATOS ? "No se han podido cargar los precios."
      : DATOS.activa === false ? "Desactivados: la web no enseña precios" + cuando
      : con.length ? `${con.length} de ${TODOS.length} servicios con precio «desde»${cuando}` : "Todavía no hay precios: todos los servicios salen «a presupuestar»";
  }

  function marcarCambio(v = true) {
    cambiado = v;
    const est = q("#pt-est", card);
    est.textContent = v ? "● Cambios sin guardar" : ""; est.classList.toggle("sin", v);
  }

  async function cargar() {
    try {
      const r = await fetch("/api/precios-taller", { cache: "no-store" });
      if (r.ok) DATOS = await r.json();
    } catch (_) { DATOS = null; }
    pintarLista(); resumen(); marcarCambio(false);
  }

  /* ---------------- eventos ---------------- */
  card.addEventListener("input", (e) => { const f = e.target.closest(".pt-row"); if (f) preview(f); marcarCambio(); });
  card.addEventListener("change", (e) => { const f = e.target.closest(".pt-row"); if (f) preview(f); marcarCambio(); });
  card.addEventListener("click", (e) => {
    const b = e.target.closest(".pt-ojo"); if (!b) return;
    const on = b.getAttribute("aria-pressed") !== "true";
    b.setAttribute("aria-pressed", String(on)); b.innerHTML = ojo(on);
    preview(b.closest(".pt-row")); marcarCambio();
  });
  // Intro en un precio = siguiente precio (rápido de rellenar desde el móvil)
  card.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" || !e.target.closest(".pt-eur")) return;
    e.preventDefault();
    const l = [...card.querySelectorAll(".pt-eur .in")], i = l.indexOf(e.target);
    if (l[i + 1]) l[i + 1].focus(); else q("#pt-save", card).focus();
  });

  q("#pt-f", card).addEventListener("submit", async (e) => {
    e.preventDefault();
    const servicios = {};
    let mal = null;
    card.querySelectorAll(".pt-row").forEach((f) => {
      const v = num(q(".pt-eur .in", f).value);
      if (Number.isNaN(v) && !mal) mal = f;
      servicios[f.dataset.k] = { precio: Number.isNaN(v) ? null : v, sufijo: q(".pt-su", f).value, etiqueta: q(".pt-e", f).value, visible: q(".pt-ojo", f).getAttribute("aria-pressed") === "true" };
    });
    if (mal) { aviso("Revisa el precio de «" + q(".pt-n b", mal).textContent + "»: escribe solo el número, por ejemplo 49 o 49,90."); q(".pt-eur .in", mal).focus(); return; }
    const btn = q("#pt-save", card); btn.disabled = true; btn.textContent = "Publicando…";
    try {
      DATOS = await api("/api/precios-taller", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ activa: q("#pt-activa", card).checked, nota: q("#pt-nota", card).value, notaEn: q("#pt-nota-en", card).value, servicios }) });
      pintarLista(); resumen(); marcarCambio(false);
      aviso("Precios publicados: ya se ven en la web");
    } catch (err) { aviso(err.message); }
    btn.disabled = false; btn.textContent = "Guardar y publicar";
  });

  // aviso si se intenta salir con cambios sin guardar
  window.addEventListener("beforeunload", (e) => { if (cambiado) { e.preventDefault(); e.returnValue = ""; } });

  cargar();
})();
