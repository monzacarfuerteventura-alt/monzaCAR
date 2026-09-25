/* =====================================================================
   VOLCANO CARS · MEJORAS DE CAPTACIÓN  (mejoras.js + mejoras.css)
   ---------------------------------------------------------------------
     1. ALERTAS DE COCHES NUEVOS POR PUEBLO, debajo del catálogo:
        quien no encuentra su coche deja pueblo + WhatsApp y recibe el aviso
        antes de que el coche se anuncie. Llega al CRM como «Alerta» y el
        panel, al dar de alta un coche, enseña qué alertas encajan con él.
     2. «HISTORIAL SIN SORPRESAS» en la ficha de cada coche: descarga del PDF
        con la inspección de 80 puntos (FORM-02) y el control de calidad
        FORM-04 firmado. Solo sale si ese coche tiene su PDF subido.
   Sin librerías externas. No toca nada de lo que ya existía: si falta este
   archivo, la web sigue exactamente igual.
   ===================================================================== */
(() => {
  "use strict";
  const EN = document.documentElement.lang === "en";
  const L = (es, en) => (EN ? en : es);
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const EMP = typeof EMPRESA !== "undefined" ? EMPRESA : { telefono: "677 96 03 48", whatsapp: "34677960348", email: "volcanocars2026@gmail.com" };
  const trk = (...a) => { try { if (typeof TRK === "function") TRK(...a); } catch (_) {} };
  const medirC = (k) => { try { if (typeof medir === "function") medir(k); } catch (_) {} };
  const ORIG = (typeof ORIGEN !== "undefined" && ORIGEN) || { landing: location.pathname, referrer: (document.referrer || "").slice(0, 300) };
  const telOk = (v) => String(v).replace(/[^\d]/g, "").length >= 9;
  const telBonito = (v) => { const d = String(v).replace(/[^\d+]/g, ""); return /^\d{9}$/.test(d) ? d.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3") : v; };

  const ICO = {
    bell: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1112 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 003.4 0"/></svg>',
    pin: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    ok: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>',
    wa: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.8 11.9 11.9 0 004.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>',
    save: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/></svg>',
    doc: '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5"/><path d="M9 14.5l2 2 4-4"/></svg>',
    dl: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
  };

  /* =================================================================
     1. ALERTAS DE COCHES NUEVOS POR PUEBLO
     ================================================================= */
  const PUEBLOS = ["Morro Jable", "Tuineje", "Antigua", "Puerto del Rosario", "La Oliva", "Pájara"];
  const PRESUP = [["Hasta 3.000 €", "Up to €3,000"], ["Hasta 5.000 €", "Up to €5,000"], ["Hasta 8.000 €", "Up to €8,000"], ["Hasta 12.000 €", "Up to €12,000"], ["Más de 12.000 €", "Over €12,000"]];
  const CARROC = [["Cualquiera", "Any"], ["Pequeño / ciudad", "Small / city car"], ["Familiar / berlina", "Family / saloon"], ["SUV / 4x4", "SUV / 4x4"], ["Furgoneta / trabajo", "Van / work"]];

  // Lo que el cliente ya estaba buscando en el catálogo (buscador y filtros) → alerta rellenada sola
  function contexto() {
    const f = typeof FX !== "undefined" ? FX : null;
    if (!f) return { presupuesto: "", cambio: "", busqueda: "" };
    const p = +f.pmax || 0;
    const presupuesto = !p ? "" : p <= 3000 ? PRESUP[0][0] : p <= 5000 ? PRESUP[1][0] : p <= 8000 ? PRESUP[2][0] : p <= 12000 ? PRESUP[3][0] : PRESUP[4][0];
    const cambio = Array.isArray(f.cambio) && f.cambio.length === 1 ? f.cambio[0] : "";
    const partes = [String(f.q || "").trim(), ...(Array.isArray(f.comb) ? f.comb : []), ...(Array.isArray(f.etq) ? f.etq.map((e) => L("etiqueta ", "label ") + e) : [])].filter(Boolean);
    return { presupuesto, cambio: ["Manual", "Automático"].includes(cambio) ? cambio : "", busqueda: partes.join(" · ").slice(0, 120) };
  }

  function alertas(ancla) {
    const card = document.createElement("section");
    card.className = "al";
    card.id = "alertas";
    card.setAttribute("aria-labelledby", "al-h");
    card.innerHTML = `
      <div class="al-head">
        <span class="al-bell" aria-hidden="true">${ICO.bell}<i></i></span>
        <div>
          <span class="al-kicker">${L("Alertas de coches · WhatsApp", "New-car alerts · WhatsApp")}</span>
          <h3 id="al-h">${L("¿No encuentras el coche exacto que buscas?", "Can't find the exact car you're after?")}</h3>
          <p>${L("Recibe avisos de nuevos coches antes de que se publiquen.", "Get alerts about new cars before they're published.")}</p>
        </div>
      </div>
      <ul class="al-why">
        <li>${ICO.ok}${L("Te enteras antes que nadie: los buenos coches duran poco", "You hear first: good cars go fast")}</li>
        <li>${ICO.ok}${L("Solo coches que encajan con lo que pides. Sin spam", "Only cars that match what you ask for. No spam")}</li>
        <li>${ICO.ok}<span data-entrega>${L("Revisados, con 1 año de garantía y entrega gratis en toda la isla", "Checked, 1-year warranty and free delivery island-wide")}</span></li>
      </ul>
      <form class="al-f" novalidate>
        <fieldset class="al-set">
          <legend>${ICO.pin}${L("1. ¿Dónde vives?", "1. Where do you live?")}</legend>
          <div class="al-chips" role="radiogroup" aria-label="${L("Tu pueblo", "Your town")}">
            ${PUEBLOS.map((p) => `<label class="al-chip"><input type="radio" name="al-zona" value="${esc(p)}"><span>${esc(p)}</span></label>`).join("")}
            <label class="al-chip"><input type="radio" name="al-zona" value="Otro pueblo"><span>${L("Otro pueblo", "Somewhere else")}</span></label>
          </div>
        </fieldset>
        <fieldset class="al-set">
          <legend>${L("2. ¿Qué buscas?", "2. What are you after?")} <small>${L("(opcional)", "(optional)")}</small></legend>
          <div class="al-row">
            <div class="field"><label for="al-p">${L("Presupuesto", "Budget")}</label>
              <select class="input" id="al-p"><option value="">${L("Me da igual", "Not sure yet")}</option>${PRESUP.map(([es, en]) => `<option value="${esc(es)}">${esc(L(es, en))}</option>`).join("")}</select></div>
            <div class="field"><label for="al-c">${L("Tipo de coche", "Type of car")}</label>
              <select class="input" id="al-c">${CARROC.map(([es, en]) => `<option value="${esc(es)}">${esc(L(es, en))}</option>`).join("")}</select></div>
          </div>
          <p class="al-ctx" hidden></p>
        </fieldset>
        <fieldset class="al-set">
          <legend>${L("3. ¿Dónde te avisamos?", "3. Where should we message you?")}</legend>
          <div class="al-row">
            <div class="field"><label for="al-n">${L("Nombre", "Name")}</label><input class="input" id="al-n" autocomplete="given-name" maxlength="80"></div>
            <div class="field"><label for="al-t">WhatsApp</label><input class="input" id="al-t" type="tel" inputmode="tel" autocomplete="tel" placeholder="6XX XX XX XX" maxlength="30"></div>
          </div>
        </fieldset>
        <input class="hp" type="text" id="al-web" tabindex="-1" autocomplete="off" aria-hidden="true">
        <label class="consent"><input type="checkbox" id="al-ok"><span>${L("Quiero recibir por WhatsApp avisos de coches que encajen con lo que busco. Me doy de baja cuando quiera respondiendo BAJA. <a href=\"/privacidad\" target=\"_blank\" rel=\"noopener\">Privacidad</a>.", "I'd like to receive WhatsApp alerts about cars that match what I'm looking for. I can unsubscribe any time by replying STOP. <a href=\"/privacidad\" target=\"_blank\" rel=\"noopener\">Privacy</a>.")}</span></label>
        <div class="form-err" id="al-err" role="alert" hidden></div>
        <button class="btn btn-rosso al-go" type="submit">${ICO.wa}<span>${L("Avisadme por WhatsApp", "Alert me on WhatsApp")}</span></button>
        <small class="al-fine">${L("Tardas 20 segundos. Tu número solo lo usamos para estos avisos.", "Takes 20 seconds. We only use your number for these alerts.")}</small>
      </form>
      <div class="al-done" hidden></div>`;
    ancla.insertAdjacentElement("afterend", card);

    const form = $(".al-f", card), err = $("#al-err", card), ctxEl = $(".al-ctx", card);
    const fallo = (m, foco) => { err.textContent = m || ""; err.hidden = !m; if (foco) foco.focus(); };
    // el pueblo elegido personaliza la promesa de entrega
    form.addEventListener("change", (e) => {
      if (e.target.name === "al-zona") {
        fallo("");
        const z = e.target.value, ent = $("[data-entrega]", card);
        ent.textContent = z === "Otro pueblo" ? L("Revisados, con 1 año de garantía y entrega gratis en toda la isla", "Checked, 1-year warranty and free delivery island-wide")
          : L(`Revisados, con 1 año de garantía y te lo llevamos gratis a ${z}`, `Checked, 1-year warranty and free delivery to ${z}`);
        trk("clk", "alerta-pueblo", z);
      }
    });
    // rellena con lo que ya estaba buscando cada vez que se asoma la tarjeta
    let empezado = false;
    const refrescar = () => {
      const c = contexto();
      if (c.presupuesto && !$("#al-p", card).dataset.tocado) $("#al-p", card).value = c.presupuesto;
      ctxEl.hidden = !(c.busqueda || c.cambio);
      ctxEl.innerHTML = ctxEl.hidden ? "" : `${L("Incluimos lo que estabas buscando:", "We'll include what you were searching for:")} <b>${esc([c.busqueda, c.cambio].filter(Boolean).join(" · "))}</b>`;
      card.dataset.busqueda = c.busqueda; card.dataset.cambio = c.cambio;
    };
    $("#al-p", card).addEventListener("change", (e) => { e.target.dataset.tocado = "1"; });
    form.addEventListener("focusin", () => { if (!empezado) { empezado = true; trk("clk", "alerta-empieza", ""); } refrescar(); });
    if ("IntersectionObserver" in window) new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) { refrescar(); card.classList.add("vista"); } }), { threshold: 0.2 }).observe(card);
    else refrescar();

    form.addEventListener("submit", async (e) => {
      e.preventDefault(); fallo("");
      const zona = (form.querySelector('input[name="al-zona"]:checked') || {}).value || "";
      const nombre = $("#al-n", card).value.trim(), telefono = $("#al-t", card).value.trim();
      if (!zona) return fallo(L("Elige tu pueblo para avisarte de los coches que te podemos llevar.", "Pick your town so we can tell you about cars we can bring you."), form.querySelector('input[name="al-zona"]'));
      if (nombre.length < 2) return fallo(L("Escribe tu nombre.", "Please write your name."), $("#al-n", card));
      if (!telOk(telefono)) return fallo(L("Revisa el número de WhatsApp.", "Please check your WhatsApp number."), $("#al-t", card));
      if (!$("#al-ok", card).checked) return fallo(L("Marca la casilla para poder mandarte los avisos por WhatsApp.", "Tick the box so we can send you the alerts on WhatsApp."), $("#al-ok", card));
      refrescar();
      const btn = $(".al-go", card); btn.disabled = true; btn.classList.add("busy");
      const antes = $("span", btn).textContent; $("span", btn).textContent = L("Guardando…", "Saving…");
      try {
        const r = await fetch("/api/solicitudes", { method: "POST", cache: "no-store", headers: { "content-type": "application/json" }, body: JSON.stringify({
          tipo: "alerta", nombre, telefono, acepta: true, aceptaAvisos: true, web: $("#al-web", card).value,
          alerta: { zona, presupuesto: $("#al-p", card).value, carroceria: $("#al-c", card).value, cambio: card.dataset.cambio || "", busqueda: card.dataset.busqueda || "" },
          idioma: EN ? "en" : "es", origen: ORIG }) });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || L("Algo ha fallado. Inténtalo de nuevo.", "Something went wrong. Please try again."));
        medirC("solicitud"); trk("clk", "alerta-creada", zona);
        exito(card, nombre, telefono, zona);
      } catch (x) { fallo(x.message); }
      finally { btn.disabled = false; btn.classList.remove("busy"); $("span", btn).textContent = antes; }
    });
  }

  // Tarjeta de contacto (.vcf) para guardar el número: WhatsApp solo entrega las listas de difusión a quien lo tiene guardado
  function vcard() {
    const tel = "+" + String(EMP.whatsapp || "34677960348").replace(/[^\d]/g, "");
    const v = ["BEGIN:VCARD", "VERSION:3.0", "N:;Volcano Cars;;;", "FN:Volcano Cars", "ORG:Volcano Cars", `TEL;TYPE=CELL,VOICE:${tel}`, EMP.email ? `EMAIL:${EMP.email}` : "", `URL:${location.origin}/`, "NOTE:Coches de ocasión y taller en Antigua (Fuerteventura). Avisos de coches nuevos por WhatsApp.", "END:VCARD"].filter(Boolean).join("\r\n");
    return URL.createObjectURL(new Blob([v], { type: "text/vcard;charset=utf-8" }));
  }
  function exito(card, nombre, telefono, zona) {
    const n = nombre.split(" ")[0];
    const done = $(".al-done", card);
    done.innerHTML = `<div class="al-done-ic">${ICO.ok}</div>
      <div><h4>${L(`¡Hecho, ${esc(n)}! Estás en la lista.`, `Done, ${esc(n)}! You're on the list.`)}</h4>
      <p>${L(`Cuando entre un coche que encaje, te escribimos al <b>${esc(telBonito(telefono))}</b> antes de anunciarlo${zona !== "Otro pueblo" ? ` (y te lo llevamos gratis a ${esc(zona)})` : ""}.`, `When a matching car comes in, we'll message <b>${esc(telBonito(telefono))}</b> before we advertise it${zona !== "Otro pueblo" ? ` (and deliver it free to ${esc(zona)})` : ""}.`)}</p>
      <p class="al-tip"><b>${L("Último paso (10 s):", "Last step (10 s):")}</b> ${L("guarda nuestro número. WhatsApp solo entrega los avisos a quien nos tiene en sus contactos.", "save our number. WhatsApp only delivers alerts to people who have us in their contacts.")}</p>
      <div class="al-acts"><a class="btn btn-rosso" href="${vcard()}" download="Volcano-Cars.vcf" data-vcf>${ICO.save}${L("Guardar contacto", "Save contact")}</a>
      <a class="btn btn-ghost" href="#comprar" data-arriba>${L("Seguir viendo coches", "Keep browsing")}</a></div></div>`;
    $(".al-f", card).hidden = true; $(".al-why", card).hidden = true; done.hidden = false;
    card.classList.add("hecho");
    done.querySelector("[data-vcf]").addEventListener("click", () => trk("clk", "alerta-vcf", ""));
    done.querySelector("[data-arriba]").addEventListener("click", (e) => { e.preventDefault(); ($("#fx") || $("#cat-grid") || document.body).scrollIntoView({ behavior: "smooth", block: "start" }); });
    done.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  /* =================================================================
     2. «HISTORIAL SIN SORPRESAS» EN LA FICHA DEL COCHE
     ================================================================= */
  let INDICE = null;
  const indice = () => (INDICE ||= fetch("/api/informes", { cache: "no-store" }).then((r) => (r.ok ? r.json() : {})).catch(() => ({})));
  const fechaTxt = (iso) => { try { return new Date(iso).toLocaleDateString(EN ? "en-GB" : "es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "Atlantic/Canary" }); } catch (_) { return ""; } };

  async function historial(modal) {
    const c = typeof gal !== "undefined" && gal && gal.c ? gal.c : null;
    const viejo = $("#m-hist", modal);
    if (!c || !modal.open) { if (viejo && !modal.open) viejo.remove(); return; }
    if (viejo && viejo.dataset.id === String(c.id)) return;
    if (viejo) viejo.remove();
    const inf = (await indice())[c.id];
    if (!inf || c.estado === "vendido" || !modal.open || (typeof gal !== "undefined" && gal.c && gal.c.id !== c.id)) return;
    const ya = $("#m-hist", modal); // dos avisos seguidos (se abre y cambia el precio): solo un botón
    if (ya && ya.dataset.id === String(c.id)) return;
    if (ya) ya.remove();
    const url = "/api/informes/" + encodeURIComponent(c.id);
    const box = document.createElement("div");
    box.className = "hist"; box.id = "m-hist"; box.dataset.id = String(c.id);
    box.innerHTML = `<a class="hist-btn" href="${url}" download>
        <span class="hist-ic">${ICO.doc}</span>
        <span class="hist-tx"><b>📄 ${L("Descargar Historial Sin Sorpresas (PDF)", "Download the No-Surprises History (PDF)")}</b>
        <small>${L("Inspección 360° de 80 puntos (FORM-02) y control de calidad pre-entrega FORM-04 firmado por el taller.", "80-point 360° inspection (FORM-02) and FORM-04 pre-delivery quality check signed by the workshop.")}</small></span>
        <span class="hist-dl" aria-hidden="true">${ICO.dl}</span></a>
      <p class="hist-sub"><span class="hist-seal">${ICO.ok}${L("Firmado por el taller", "Signed by the workshop")}</span>${L("Cero sorpresas, cero engaños: el estado mecánico y estético exacto del coche tras revisar los 80 puntos clave, incluidos los pequeños detalles de pintura si los tiene.", "No surprises, no tricks: the car's exact mechanical and cosmetic condition after checking all 80 key points, including small paint marks if it has any.")}
      <a href="${url}?ver=1" target="_blank" rel="noopener">${L("Verlo sin descargar", "View without downloading")}</a>${inf.fecha ? ` · <span>${L("publicado el", "published")} ${esc(fechaTxt(inf.fecha))}</span>` : ""}</p>`;
    box.querySelector(".hist-btn").addEventListener("click", () => trk("clk", "historial-pdf", String(c.id)));
    // justo debajo del precio («Añadido a la web hace…»), antes de la comparativa de mercado y la reserva
    const tras = $("#m-sig", modal) || $(".m-top", modal);
    if (tras) tras.insertAdjacentElement("afterend", box);
  }

  /* ---------------- arranque ---------------- */
  const cat = $("#cat-grid");
  if (cat) {
    alertas($("#fin-nota") || cat);
    // enlace directo (WhatsApp, anuncios, QR): /comprar#alertas  (también /en/#alertas)
    if (location.hash === "#alertas") setTimeout(() => {
      const v = $("#v-comprar"); if (v && v.hidden && typeof go === "function") try { go("comprar", false); } catch (_) {}
      const a = $("#alertas"); if (a) { a.classList.add("vista"); a.scrollIntoView({ behavior: "smooth", block: "start" }); }
    }, 700);
  }
  // /taller#prioridad y /taller#foto también en la versión inglesa (/en/#prioridad): abre la sección del taller y baja al formulario
  if (/^#(prioridad|vip|foto|presupuesto-foto)$/.test(location.hash)) setTimeout(() => {
    const v = $("#v-taller"); if (v && v.hidden && typeof go === "function") try { go("taller", false); } catch (_) {}
    const f = $("#t-foto"); if (f) f.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 700);
  const modal = $("#car-modal");
  if (modal) {
    const mira = () => historial(modal).catch(() => {});
    new MutationObserver(mira).observe(modal, { attributes: true, attributeFilter: ["open"] });
    const precio = $("#m-price", modal);
    if (precio) new MutationObserver(mira).observe(precio, { childList: true, characterData: true, subtree: true });
    if (modal.open) mira();
  }
})();
