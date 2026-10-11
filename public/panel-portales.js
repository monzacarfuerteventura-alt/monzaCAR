/* =====================================================================
   VOLCANO CARS · PANEL: PUBLICAR EN PORTALES · KIT ASISTIDO  (panel-portales.js · actualización 66)
   ---------------------------------------------------------------------
   Tarjeta «Publicar en portales» en Coches. Para cada coche y cada portal (Coches.net, AutoScout24, Wallapop, Milanuncios,
   Facebook Marketplace) da: el texto del anuncio ya redactado (botón copiar), el enlace para publicar, las fotos en un ZIP
   y una casilla «Publicado» con el enlace del anuncio. Cuando un coche pasa a VENDIDO avisa en rojo de los anuncios que hay que retirar.
   No publica nada por sí solo ni cambia ningún coche: guarda solo la libreta de control en /api/portales.
   ===================================================================== */
(() => {
  "use strict";
  if (document.getElementById("pp-cfg")) return;
  const E = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const miles = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const COMB = { gasolina: "Gasolina", diesel: "Diésel", hibrido: "Híbrido", hibrido_enchufable: "Híbrido enchufable", electrico: "Eléctrico", glp: "GLP", gnc: "GNC", otro: "" };
  const PORTAL = {
    cochesnet: { n: "Coches.net", modo: "A mano (alta profesional)", url: "https://www.coches.net/", ayuda: "Publica desde tu cuenta profesional de Coches.net. La carga automática por fichero solo se contrata con ellos." },
    autoscout24: { n: "AutoScout24", modo: "A mano o por conexión (preparada, apagada)", url: "https://www.autoscout24.es/", ayuda: "Si activas la multipublicación de la tarjeta de arriba, se envía solo. Si no, publícalo a mano con este kit." },
    wallapop: { n: "Wallapop", modo: "A mano (plan Pro Coches)", url: "https://es.wallapop.com/", ayuda: "El plan básico de Wallapop Pro Coches se maneja a mano. La carga automática (API o multipublicador) es del plan Advanced." },
    milanuncios: { n: "Milanuncios", modo: "A mano", url: "https://www.milanuncios.com/", ayuda: "Publica desde tu cuenta profesional de Milanuncios." },
    marketplace: { n: "Facebook Marketplace", modo: "Automático con el catálogo de Meta (feed) o a mano", url: "https://www.facebook.com/marketplace/create/vehicle", ayuda: "Hay un feed de catálogo de Meta (meta.csv) en la tarjeta de multipublicación. Mientras no esté conectado, publica a mano. La página de Facebook de Volcano Cars es de otra persona: usa la cuenta que tenga permiso." },
  };
  const titulo = (v) => [v.marca, v.modelo, v.version].filter(Boolean).join(" ") + " · " + v.matriculacion.anio + " · " + miles(v.km) + " km";
  function texto(v, portal) {
    const t = titulo(v), cb = COMB[v.combustible] || "", cam = v.cambio === "automatico" ? "Automático" : "Manual";
    const datos = [`Año: ${v.matriculacion.anio}`, `Kilómetros: ${miles(v.km)} km`, cb && `Combustible: ${cb}`, `Cambio: ${cam}`, v.potencia.cv && `Potencia: ${v.potencia.cv} CV`,
      v.puertas && `Puertas: ${v.puertas}`, v.color && `Color: ${v.color}`, v.etiquetaDGT && `Etiqueta DGT: ${v.etiquetaDGT}`].filter(Boolean);
    const garantia = ["12 meses de garantía.", "Coche revisado en nuestro taller.", "Entrega gratis en toda Fuerteventura.", "Financiación disponible."];
    const contacto = `Volcano Cars · Costa de Antigua (Fuerteventura) · L–V de 8:00 a 16:00 · WhatsApp y llamadas: 643 56 60 98`;
    const eq = v.equipamiento.length ? "Equipamiento: " + v.equipamiento.join(", ") + "." : "";
    const desc = v.descripcion || "";
    const precio = `${miles(v.precio.contado)} € (IGIC incluido)`;
    let c;
    if (portal === "wallapop" || portal === "marketplace") c = [t, "", `Precio: ${precio}`, "", datos.join("\n"), "", desc, eq, "", garantia.join(" "), "", contacto, `Más fotos y datos: ${v.url}`];
    else c = [t, "", desc, eq, "", datos.join(" · "), `Precio: ${precio}`, "", garantia.join(" "), contacto, `Ficha completa: ${v.url}`];
    return { titulo: t.slice(0, 80), cuerpo: c.filter((x) => x !== undefined && x !== null && x !== false).join("\n").replace(/\n{3,}/g, "\n\n").trim() };
  }
  // ZIP sin comprimir (suficiente para fotos JPEG/WebP): sin librerías externas
  const CRC = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  function zip(ficheros) {
    const enc = new TextEncoder(), partes = [], cd = []; let pos = 0;
    for (const f of ficheros) {
      const nombre = enc.encode(f.nombre), crc = crc32(f.datos), L = new DataView(new ArrayBuffer(30));
      L.setUint32(0, 0x04034b50, true); L.setUint16(4, 20, true); L.setUint16(6, 0x0800, true); L.setUint16(8, 0, true); L.setUint16(10, 0, true); L.setUint16(12, 0x21, true);
      L.setUint32(14, crc, true); L.setUint32(18, f.datos.length, true); L.setUint32(22, f.datos.length, true); L.setUint16(26, nombre.length, true); L.setUint16(28, 0, true);
      partes.push(new Uint8Array(L.buffer), nombre, f.datos);
      const C = new DataView(new ArrayBuffer(46));
      C.setUint32(0, 0x02014b50, true); C.setUint16(4, 20, true); C.setUint16(6, 20, true); C.setUint16(8, 0x0800, true); C.setUint16(10, 0, true); C.setUint16(12, 0, true); C.setUint16(14, 0x21, true);
      C.setUint32(16, crc, true); C.setUint32(20, f.datos.length, true); C.setUint32(24, f.datos.length, true); C.setUint16(28, nombre.length, true); C.setUint32(42, pos, true);
      cd.push(new Uint8Array(C.buffer), nombre); pos += 30 + nombre.length + f.datos.length;
    }
    const tam = cd.reduce((a, x) => a + x.length, 0), F = new DataView(new ArrayBuffer(22));
    F.setUint32(0, 0x06054b50, true); F.setUint16(8, ficheros.length, true); F.setUint16(10, ficheros.length, true); F.setUint32(12, tam, true); F.setUint32(16, pos, true);
    return new Blob([...partes, ...cd, new Uint8Array(F.buffer)], { type: "application/zip" });
  }
  const ap = (m) => { try { toast(m); } catch (_) { alert(m); } };
  const hdr = () => ({ authorization: "Bearer " + (typeof PW !== "undefined" ? PW : ""), "content-type": "application/json" });
  async function api(met, cuerpo) {
    const r = await fetch("/api/portales", { method: met, headers: hdr(), body: cuerpo ? JSON.stringify(cuerpo) : undefined, cache: "no-store" });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || "No se ha podido completar."); return j;
  }
  let D = null, cargando = false, abierto = "";
  const css = document.createElement("style");
  css.textContent = `#pp-cfg .pp-b{display:grid;gap:12px;padding:6px 2px 4px}.pp-rojo{border:2px solid #d9481c;background:rgba(217,72,28,.12);border-radius:14px;padding:12px 14px}
  .pp-car{border:1px solid var(--line,#33322E);border-radius:14px;padding:12px 14px;background:var(--surface,#1c1c1a)}.pp-car>summary{cursor:pointer;font-weight:700;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;list-style:none}
  .pp-car>summary::-webkit-details-marker{display:none}.pp-car .sub{font-weight:400;opacity:.75;font-size:13px}.pp-por{border-top:1px solid var(--line,#33322E);padding:10px 0;display:grid;gap:8px}
  .pp-por h4{margin:0;font-size:15px;display:flex;gap:8px;flex-wrap:wrap;align-items:center}.pp-por .m{font-size:12.5px;opacity:.75;font-weight:400}.pp-act{display:flex;gap:8px;flex-wrap:wrap}
  .pp-por textarea{width:100%;min-height:150px;font:13.5px/1.45 inherit;border-radius:10px;padding:9px;border:1px solid var(--line,#33322E);background:var(--ground,#121210);color:inherit;resize:vertical}
  .pp-tag{font-size:12px;padding:2px 9px;border-radius:99px;background:rgba(22,121,74,.2);color:#3ddc84}.pp-tag.no{background:rgba(255,255,255,.08);color:inherit;opacity:.8}.pp-in{display:flex;gap:8px;flex-wrap:wrap;align-items:center}.pp-in input[type=url],.pp-in input[type=text]{flex:1;min-width:190px}`;
  document.head.appendChild(css);
  function crear() {
    if (document.getElementById("pp-cfg")) return true;
    const ref = document.getElementById("mp-cfg") || document.getElementById("fin-cfg"); if (!ref) return false;
    ref.insertAdjacentHTML("afterend", `<details class="card fin-cfg" id="pp-cfg"><summary><span><b>Publicar en portales</b><small id="pp-res">Kit para Coches.net, AutoScout24, Wallapop, Milanuncios y Marketplace</small></span><span class="fin-ab">Ver</span></summary><div class="pp-b" id="pp-b"><div class="empty">Cargando…</div></div></details>`);
    const c = document.getElementById("pp-cfg");
    c.addEventListener("toggle", () => { if (c.open) cargar(); });
    c.addEventListener("click", clic);
    return true;
  }
  async function cargar() {
    if (cargando || typeof PW === "undefined" || !PW) return; cargando = true;
    try { D = await api("GET"); } catch (e) { D = null; document.getElementById("pp-b").innerHTML = `<div class="empty">${E(e.message)}</div>`; cargando = false; return; }
    cargando = false; pintar();
  }
  function pintar() {
    const b = document.getElementById("pp-b"); if (!b || !D) return;
    const abiertos = new Set([...b.querySelectorAll("details.pp-car[open]")].map((x) => x.dataset.id));
    const rojo = D.retirar.length ? `<div class="pp-rojo"><b>⚠ Retira estos anuncios: el coche ya está vendido</b><br>${D.retirar.map((r) => `${E(r.titulo)} → ${r.portales.map((p) => E(PORTAL[p]?.n || p)).join(", ")}`).join("<br>")}<br><small>Quita el anuncio en cada portal y marca «Retirado» abajo.</small></div>` : "";
    const nPub = Object.values(D.estado).reduce((a, o) => a + Object.values(o).filter((x) => x.publicado && !x.retirado).length, 0);
    document.getElementById("pp-res").textContent = `${D.coches.length} coche${D.coches.length === 1 ? "" : "s"} · ${nPub} anuncio${nPub === 1 ? "" : "s"} activo${nPub === 1 ? "" : "s"}${D.retirar.length ? " · ¡hay anuncios que retirar!" : ""}`;
    b.innerHTML = `<p class="hint" style="margin:0">Elige un coche, copia el texto de cada portal, publícalo allí y marca la casilla. Esto <b>no publica nada solo</b>: es tu kit y tu libreta de control.${D.feed ? "" : " Los feeds automáticos (AutoScout24 y catálogo de Meta) siguen apagados hasta que pongas la clave FEED_TOKEN en Netlify."}</p>${rojo}` +
      (D.coches.length ? D.coches.map((x) => coche(x, abiertos.has(x.id))).join("") : `<div class="empty">No hay coches en la web todavía.</div>`);
  }
  function coche(x, abierto) {
    const v = x.v, est = D.estado[x.id] || {}, act = Object.values(est).filter((r) => r.publicado && !r.retirado).length;
    return `<details class="pp-car" data-id="${E(x.id)}" ${abierto ? "open" : ""}><summary><span>${E(titulo(v))}</span><span class="sub">${miles(v.precio.contado)} € · ${x.estado}${act ? ` · en ${act} portal${act === 1 ? "" : "es"}` : ""}</span></summary>
      <div class="pp-act" style="margin:10px 0"><button type="button" class="btn b-ghost b-sm" data-zip="${E(x.id)}">⬇ Descargar las ${v.fotos.length} fotos (ZIP)</button><a class="btn b-ghost b-sm" href="${E(v.url)}" target="_blank" rel="noopener">Ver ficha en la web</a></div>
      ${Object.keys(PORTAL).map((p) => portal(x, p, est[p] || {})).join("")}</details>`;
  }
  function portal(x, p, r) {
    const P = PORTAL[p], t = texto(x.v, p), estado = r.publicado && !r.retirado ? '<span class="pp-tag">Publicado</span>' : r.retirado ? '<span class="pp-tag no">Retirado</span>' : '<span class="pp-tag no">Sin publicar</span>';
    return `<div class="pp-por" data-p="${p}" data-id="${E(x.id)}"><h4>${E(P.n)} ${estado}<span class="m">${E(P.modo)}</span></h4>
      <div class="m">${E(P.ayuda)}</div>
      <textarea readonly aria-label="Texto del anuncio en ${E(P.n)}">${E(t.cuerpo)}</textarea>
      <div class="pp-act"><button type="button" class="btn b-acc b-sm" data-copia="1">📋 Copiar texto</button><button type="button" class="btn b-ghost b-sm" data-copiat="1">Copiar título</button><a class="btn b-ghost b-sm" href="${E(P.url)}" target="_blank" rel="noopener">Abrir ${E(P.n)} ↗</a></div>
      <div class="pp-in"><input class="in" type="url" placeholder="Enlace del anuncio (https://…)" value="${E(r.enlace || "")}" data-enlace="1"><label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-pub="1" ${r.publicado && !r.retirado ? "checked" : ""}> Publicado</label>${r.publicado && !r.retirado && x.estado === "vendido" ? '<button type="button" class="btn b-brand b-sm" data-ret="1">Ya lo he retirado</button>' : ""}</div></div>`;
  }
  async function guardar(el, datos) {
    const w = el.closest(".pp-por"); try { await api("PUT", { id: w.dataset.id, portal: w.dataset.p, ...datos }); ap("Guardado."); await cargar(); } catch (e) { ap(e.message); await cargar(); }
  }
  async function copiar(txt, ok) { try { await navigator.clipboard.writeText(txt); ap(ok); } catch (_) { const t = document.createElement("textarea"); t.value = txt; document.body.appendChild(t); t.select(); try { document.execCommand("copy"); ap(ok); } catch (e) { ap("No se ha podido copiar."); } t.remove(); } }
  async function descargarZip(id, btn) {
    const x = D.coches.find((c) => c.id === id); if (!x) return; const old = btn.textContent; btn.disabled = true;
    try {
      const f = []; let i = 0;
      for (const ft of x.v.fotos) { i++; btn.textContent = `Descargando ${i} de ${x.v.fotos.length}…`; const r = await fetch(ft.url.replace(/^https:\/\/volcanocars\.com/, "")); if (!r.ok) continue;
        const tipo = r.headers.get("content-type") || "", ext = /png/.test(tipo) ? "png" : /webp/.test(tipo) ? "webp" : "jpg";
        f.push({ nombre: String(i).padStart(2, "0") + "." + ext, datos: new Uint8Array(await r.arrayBuffer()) }); }
      if (!f.length) throw new Error("No se han podido descargar las fotos.");
      const a = document.createElement("a"); a.href = URL.createObjectURL(zip(f)); a.download = ("fotos-" + titulo(x.v).replace(/[^a-z0-9]+/gi, "-").slice(0, 50) + ".zip").toLowerCase(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      ap("ZIP descargado: " + f.length + " fotos.");
    } catch (e) { ap(e.message); } finally { btn.disabled = false; btn.textContent = old; }
  }
  function clic(e) {
    const t = e.target, w = t.closest(".pp-por");
    if (t.closest("[data-zip]")) { descargarZip(t.closest("[data-zip]").dataset.zip, t.closest("[data-zip]")); return; }
    if (!w) return; const x = D && D.coches.find((c) => c.id === w.dataset.id); if (!x) return;
    if (t.closest("[data-copia]")) copiar(w.querySelector("textarea").value, "Texto copiado. Pégalo en el anuncio.");
    else if (t.closest("[data-copiat]")) copiar(texto(x.v, w.dataset.p).titulo, "Título copiado.");
    else if (t.closest("[data-ret]")) guardar(t, { retirado: true });
  }
  document.addEventListener("change", (e) => {
    const t = e.target; if (!t.closest || !t.closest("#pp-cfg")) return;
    if (t.matches("[data-pub]")) guardar(t, { publicado: t.checked, ...(t.checked ? {} : { retirado: false }) });
    else if (t.matches("[data-enlace]")) guardar(t, { enlace: t.value.trim() });
  });
  function todo() { try { crear(); } catch (_) {} }
  todo(); let pend = 0;
  new MutationObserver(() => { if (pend) return; pend = requestAnimationFrame(() => { pend = 0; todo(); }); }).observe(document.body, { childList: true, subtree: true });
})();
