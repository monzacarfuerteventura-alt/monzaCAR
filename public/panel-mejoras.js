/* =====================================================================
   VOLCANO CARS · PANEL: HISTORIAL SIN SORPRESAS + ALERTAS QUE ENCAJAN
   ---------------------------------------------------------------------
   En la ficha de cada coche del panel (Coches → Editar / Añadir):
     1. «Historial Sin Sorpresas»: sube el PDF con el FORM-02 (inspección
        360°, 80 puntos) y el FORM-04 firmado de ESE coche. En la web sale
        el botón de descarga solo cuando hay PDF.
     2. «Alertas que encajan»: los clientes apuntados a las alertas de la
        web cuyo presupuesto y cambio encajan con este coche, con su
        WhatsApp listo para avisarles ANTES de publicarlo. Cada aviso
        queda apuntado en el CRM.
   Usa las funciones del panel (api, toast, esc). Si falta el archivo,
   el panel funciona igual que siempre.
   ===================================================================== */
(() => {
  "use strict";
  const q = (s, r = document) => r.querySelector(s);
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const aviso = (t) => { try { toast(t); } catch (_) { alert(t); } };
  const MAX = 5.5 * 1024 * 1024;
  let actual = null; // coche abierto en el editor (null = coche nuevo)

  /* ---------------- 1. Historial Sin Sorpresas ---------------- */
  async function pintarHist() {
    const box = q("#hist-card");
    if (!box) return;
    const cab = `<legend><span class="lg-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/><path d="M9 14.5l2 2 4-4"/></svg></span>Historial Sin Sorpresas (PDF) <span class="v-new">Confianza</span></legend>
      <p class="hint">Un solo PDF con el <b>FORM-02</b> (inspección 360°, 80 puntos con semáforo) y el <b>FORM-04</b> (control de calidad pre-entrega) <b>firmados</b> de este coche. En la web sale el botón «📄 Descargar Historial Sin Sorpresas» junto al precio.
      <br><b>Antes de subirlo:</b> tapa los datos del anterior dueño (nombre, DNI, dirección). Apunta también los detalles de pintura: es lo que más confianza da.</p>`;
    if (!actual) { box.innerHTML = cab + `<p class="msg" style="background:var(--surface-2)">Publica primero el coche; después, al editarlo, podrás subir su historial.</p>`; return; }
    box.innerHTML = cab + `<p class="hint">Cargando…</p>`;
    let inf = null;
    try { inf = (await (await fetch("/api/informes", { cache: "no-store" })).json())[actual.id] || null; } catch (_) {}
    const url = "/api/informes/" + encodeURIComponent(actual.id);
    box.innerHTML = cab + (inf
      ? `<div class="msg ok" style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:space-between">
          <span>✓ PDF publicado el ${E(new Date(inf.fecha).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" }))} · ${E(inf.kb)} KB</span>
          <span style="display:flex;gap:8px;flex-wrap:wrap"><a class="btn b-ghost b-sm" href="${url}?ver=1" target="_blank" rel="noopener">Ver</a>
          <label class="btn b-ghost b-sm" for="hist-file">Sustituir</label><button class="btn b-bad b-sm" type="button" id="hist-rm">Quitar</button></span></div>`
      : `<label class="drop" for="hist-file"><b>📄 Subir el PDF del historial</b><small>PDF de hasta 5,5 MB (escanea a 150 ppp). Se publica al momento.</small></label>`)
      + `<input id="hist-file" type="file" accept="application/pdf,.pdf" hidden><div class="msg bad" id="hist-err" role="alert" hidden></div>`;
    q("#hist-file", box).addEventListener("change", async (e) => {
      const f = e.target.files && e.target.files[0]; e.target.value = "";
      const err = q("#hist-err", box); err.hidden = true;
      if (!f) return;
      if (!/pdf$/i.test(f.type) && !/\.pdf$/i.test(f.name)) { err.textContent = "Tiene que ser un PDF."; err.hidden = false; return; }
      if (f.size > MAX) { err.textContent = `Pesa ${(f.size / 1048576).toFixed(1)} MB y el máximo es 5,5 MB. Escanéalo a 150 ppp o en blanco y negro.`; err.hidden = false; return; }
      e.target.disabled = true; box.querySelectorAll("label,button").forEach((b) => { b.setAttribute("aria-disabled", "true"); b.style.pointerEvents = "none"; b.style.opacity = ".6"; });
      const aviso0 = q(".drop b", box) || q(".msg.ok span", box); if (aviso0) aviso0.textContent = "Subiendo el PDF…";
      try {
        await api(url, { method: "PUT", headers: { "content-type": "application/pdf" }, body: f });
        aviso("Historial subido: ya se puede descargar en la web.");
      } catch (x) {
        e.target.disabled = false; box.querySelectorAll("label,button").forEach((b) => { b.removeAttribute("aria-disabled"); b.style.pointerEvents = ""; b.style.opacity = ""; });
        err.textContent = x.message; err.hidden = false; return;
      }
      pintarHist();
    });
    const rm = q("#hist-rm", box);
    if (rm) rm.addEventListener("click", async () => {
      if (!confirm("¿Quitar el historial de este coche? El botón desaparece de la web.")) return;
      try { await api(url, { method: "DELETE" }); aviso("Historial quitado."); } catch (x) { aviso(x.message); }
      pintarHist();
    });
  }

  /* ---------------- 2. Alertas que encajan ---------------- */
  let ALERTAS = null;
  const TOPE = { "Hasta 3.000 €": 3000, "Hasta 5.000 €": 5000, "Hasta 8.000 €": 8000, "Hasta 12.000 €": 12000, "Más de 12.000 €": Infinity };
  const numero = (v) => { const n = Number(String(v || "").replace(/\s|€/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", ".")); return Number.isFinite(n) ? n : 0; };
  const eurT = (n) => Math.round(n).toLocaleString("es-ES") + " €";
  const waNum = (t) => { let d = String(t || "").replace(/[^\d]/g, ""); if (d.startsWith("00")) d = d.slice(2); if (d.length === 9) d = "34" + d; return d; };
  function datosForm() {
    const v = (id) => (q("#" + id) ? q("#" + id).value.trim() : "");
    return { marca: v("marca"), modelo: v("modelo"), version: v("version"), anio: v("anio"), km: numero(v("km")), precio: numero(v("precio")), cambio: v("cambio") };
  }
  function encaja(a, c) {
    const al = a.alerta || {};
    const tope = TOPE[al.presupuesto];
    if (c.precio && tope && tope !== Infinity && c.precio > tope * 1.1) return false; // hasta un 10 % por encima de lo que dijo
    if (c.precio && al.presupuesto === "Más de 12.000 €" && c.precio < 10000) return false;
    if (al.cambio && c.cambio && al.cambio !== c.cambio) return false;
    return true;
  }
  function mensaje(a, c) {
    const n = a.nombre.split(" ")[0], en = a.idioma === "en", z = a.alerta && a.alerta.zona !== "Otro pueblo" ? a.alerta.zona : "";
    const coche = [c.marca, c.modelo, c.version].filter(Boolean).join(" ") || "coche";
    const det = [c.anio, c.km ? c.km.toLocaleString("es-ES") + " km" : ""].filter(Boolean).join(", ");
    return en
      ? `Hi ${n}, Volcano Cars here 🔔 As promised, you're hearing it first: a ${coche}${det ? " (" + det + ")" : ""}${c.precio ? " for " + eurT(c.precio) : ""} has just come in, checked in our workshop with a 1-year warranty${z ? " and free delivery to " + z : ""}. We haven't advertised it yet. Would it be a bad idea to hold it for you until you see it?`
      : `Hola ${n}, te escribimos de Volcano Cars 🔔 Como te prometimos, te enteras antes que nadie: acaba de entrar un ${coche}${det ? " (" + det + ")" : ""}${c.precio ? " por " + eurT(c.precio) : ""}, revisado en nuestro taller y con 1 año de garantía${z ? ", y te lo llevamos gratis a " + z : ""}. Todavía no lo hemos anunciado. ¿Sería una mala idea guardártelo hasta que lo veas?`;
  }
  async function pintarAlertas() {
    const box = q("#al-match");
    if (!box) return;
    if (!ALERTAS) {
      try { ALERTAS = (await api("/api/solicitudes")).filter((x) => x.tipo === "alerta" && x.estado !== "perdida"); }
      catch (_) { ALERTAS = []; }
    }
    const c = datosForm();
    const lista = ALERTAS.filter((a) => encaja(a, c));
    const cab = `<legend><span class="lg-ic"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></svg></span>Alertas que encajan <span class="pill">${lista.length} de ${ALERTAS.length}</span></legend>`;
    if (!ALERTAS.length) { box.innerHTML = cab + `<p class="hint">Aquí salen los clientes que se apuntan a «Avisadme por WhatsApp» debajo del catálogo de la web. Todavía no hay ninguno.</p>`; return; }
    box.innerHTML = cab + `<p class="hint">Avísales <b>antes de publicar</b> el coche: es lo que les prometió la web. Encajan por presupuesto (hasta un 10 % por encima) y cambio; el tipo de coche que piden sale en negrita. Cada aviso queda apuntado en su ficha del CRM.</p>`
      + (lista.length ? `<div style="display:grid;gap:8px">${lista.map((a) => `<div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:10px 12px;border:1px solid var(--line);border-radius:12px">
          <span><b>${E(a.nombre)}</b> · ${E(a.alerta.zona)}${a.alerta.presupuesto ? " · " + E(a.alerta.presupuesto) : ""}${a.alerta.cambio ? " · " + E(a.alerta.cambio) : ""}${a.alerta.carroceria && a.alerta.carroceria !== "Cualquiera" ? " · <b>" + E(a.alerta.carroceria) + "</b>" : ""}${a.alerta.busqueda ? `<br><small class="hint" style="margin:0">Busca: ${E(a.alerta.busqueda)}</small>` : ""}${(a.actividad || []).some((x) => /Aviso de coche/.test(x.txt || "")) ? `<br><small class="hint" style="margin:0">Ya avisado de otro coche</small>` : ""}</span>
          <a class="btn b-sm" style="background:#1F8B4C;color:#fff" target="_blank" rel="noopener" data-avisar="${E(a.id)}" href="https://wa.me/${waNum(a.telefono)}?text=${encodeURIComponent(mensaje(a, c))}">WhatsApp</a></div>`).join("")}</div>`
      : `<p class="msg" style="background:var(--surface-2)">Con este precio y cambio no encaja ninguna alerta.</p>`);
    const estadoDe = Object.fromEntries(ALERTAS.map((a) => [a.id, a.estado]));
    box.querySelectorAll("[data-avisar]").forEach((b) => b.addEventListener("click", () => {
      const coche = [c.marca, c.modelo, c.anio].filter(Boolean).join(" ");
      api("/api/solicitudes/" + encodeURIComponent(b.dataset.avisar), { method: "PATCH", headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...(estadoDe[b.dataset.avisar] === "nueva" ? { estado: "contactado" } : {}), actividad: { tipo: "whatsapp", txt: "Aviso de coche nuevo: " + coche + (c.precio ? " · " + eurT(c.precio) : "") } }) }).catch(() => {});
    }));
  }
  let t = null;
  document.addEventListener("input", (e) => { if (e.target.closest && e.target.closest("#car-form") && /^(precio|cambio|marca|modelo|version|anio|km)$/.test(e.target.id)) { clearTimeout(t); t = setTimeout(pintarAlertas, 350); } });
  document.addEventListener("change", (e) => { if (e.target.id === "cambio") pintarAlertas(); });

  window.VC_PANEL = {
    coche(c) { actual = c || null; ALERTAS = null; pintarHist(); setTimeout(pintarAlertas, 0); },
  };
})();
