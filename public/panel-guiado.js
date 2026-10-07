/* =====================================================================
   VOLCANO CARS · PANEL GUIADO (actualización 46)
   Parte del panel admin.html (no es un panel aparte): se carga desde él, igual que panel-plus.js.
   1. Barra de acciones principales (3 botones grandes) + desplegable «Más opciones / Utilidades».
   2. Asistente de 4 pasos: Recepción → Asignación → Facturación (directa en 2 clics) → Cobro y cierre.
   3. Anular con motivo (nada se borra): cuadro único, recálculo de totales y confirmación visual.
   4. Registro de auditoría de anulaciones dentro de Finanzas.
   5. Antiduplicados: un formulario no se puede enviar dos veces seguidas.
   Usa lo que ya existe en el panel (api, toast, LEADS, ORDENES, CARS, fnVenta, abrirFichas…).
   No toca la web pública. Cumple la CSP del panel (script propio, sin eval).
   ===================================================================== */
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const num = v => { let s = String(v || "").replace(/\s|€/g, ""); if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); const n = Number(s); return Number.isFinite(n) ? n : NaN; };
  const eur = n => new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(n);
  const cent = c => eur((c || 0) / 100);
  const hoy = () => { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Atlantic/Canary" }).format(new Date()); } catch (_) { return new Date().toISOString().slice(0, 10); } };
  const norm = m => String(m || "").toUpperCase().replace(/[\s-]/g, "");
  const tel9 = t => String(t || "").replace(/\D/g, "").slice(-9);
  const aviso = t => { try { toast(t); } catch (_) { alert(t); } };
  /* ----- acceso a lo que ya hay en el panel (const/let globales de admin.html) ----- */
  const yo = () => { try { return ME; } catch (_) { return null; } };
  const esGer = () => { try { return ES_GER(); } catch (_) { return false; } };
  const puedeFactura = () => { const m = yo(); return esGer() || !!(m && m.rol === "recepcion"); };
  const leads = () => { try { return LEADS || []; } catch (_) { return []; } };
  const ordenes = () => { try { return ORDENES || []; } catch (_) { return []; } };
  const coches = () => { try { return CARS || []; } catch (_) { return []; } };
  const pestaña = k => { const b = $(`#tabs [data-tab="${k}"]`); return !!b && !b.hidden && b.offsetParent !== null; };
  const visible = id => { const el = $("#" + id); return !!el && !el.hidden; };
  const post = (url, body, method = "POST") => api(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body || {}) });

  /* ================= estilos ================= */
  const css = document.createElement("style");
  css.textContent = `
  .gd-bar{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:14px 0 4px;align-items:stretch}
  .gd-bar[hidden]{display:none}
  .gd-big{display:flex;align-items:center;gap:14px;text-align:left;border:0;border-radius:16px;padding:16px 18px;min-height:76px;cursor:pointer;color:#fff;font-family:inherit;box-shadow:0 10px 24px -14px rgba(0,0,0,.5);transition:transform .2s}
  .gd-big:hover{transform:translateY(-2px)}.gd-big:active{transform:scale(.98)}
  .gd-big i{font-style:normal;font-size:30px;font-weight:800;line-height:1;width:44px;height:44px;border-radius:12px;background:rgba(255,255,255,.2);display:grid;place-items:center;flex:none}
  .gd-big b{display:block;font-size:17px;line-height:1.2}.gd-big small{display:block;font-size:13px;opacity:.9;margin-top:2px;font-weight:500}
  .gd-a{background:#D9481C}.gd-b{background:#1F7A55}.gd-c{background:#1B1B1A;border:1.5px solid #4a4944}
  .gd-mas{position:relative;display:inline-block}
  .gd-mas>summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--line);border-radius:10px;padding:9px 14px;font-weight:700;font-size:14px;background:var(--surface);color:var(--ink);min-height:40px}
  .gd-mas>summary::-webkit-details-marker{display:none}.gd-mas>summary::after{content:"▾";font-size:12px}
  .gd-mas[open]>summary{background:var(--brand-soft)}
  .gd-menu{position:absolute;right:0;top:calc(100% + 6px);z-index:60;min-width:250px;background:var(--surface);border:1.5px solid var(--line);border-radius:14px;padding:6px;display:grid;gap:2px;box-shadow:0 18px 40px -16px rgba(0,0,0,.55)}
  .gd-menu .btn,.gd-menu button{justify-content:flex-start;width:100%;background:transparent;border:0;color:var(--ink);border-radius:9px;padding:11px 12px;font-size:14.5px;font-weight:600;text-align:left;cursor:pointer;font-family:inherit;white-space:normal}
  .gd-menu .btn:hover,.gd-menu button:hover{background:var(--brand-soft)}
  .gd-bar .gd-mas{grid-column:1/-1;justify-self:end}
  .fn-acts .gd-mas>summary{min-height:36px;padding:7px 12px}
  .gd-dlg{width:min(560px,calc(100% - 20px))}
  .gd-dlg form,.gd-dlg .gd-body{display:grid;gap:14px;padding:20px}
  .gd-prog{display:flex;gap:6px;align-items:center}.gd-prog i{flex:1;height:7px;border-radius:9px;background:var(--line)}.gd-prog i.ok{background:#1F7A55}.gd-prog i.now{background:#D9481C}
  .gd-paso{font-size:13px;color:var(--muted);font-weight:700;letter-spacing:.04em;text-transform:uppercase}
  .gd-dlg h2{font-size:25px;margin:0;line-height:1.15}
  .gd-opts{display:grid;gap:10px}
  .gd-opt{display:flex;align-items:center;gap:14px;border:2px solid var(--line);border-radius:16px;padding:16px;background:var(--surface);color:var(--ink);cursor:pointer;text-align:left;font-family:inherit;min-height:74px;width:100%}
  .gd-opt:hover{border-color:#D9481C}.gd-opt[aria-pressed=true]{border-color:#D9481C;background:rgba(217,72,28,.09)}
  .gd-opt[disabled]{opacity:.5;cursor:not-allowed}
  .gd-opt i{font-style:normal;font-size:30px;flex:none;width:44px;text-align:center}.gd-opt b{display:block;font-size:17px}.gd-opt small{display:block;color:var(--muted);font-size:13.5px;margin-top:2px}
  .gd-res{display:grid;gap:6px}.gd-res button{display:flex;justify-content:space-between;gap:10px;border:1.5px solid var(--line);background:var(--surface);color:var(--ink);border-radius:11px;padding:10px 12px;cursor:pointer;font-family:inherit;text-align:left}
  .gd-res button:hover{border-color:#D9481C}.gd-res small{color:var(--muted)}
  .gd-box{border-radius:12px;padding:12px 14px;font-size:14.5px;line-height:1.4}
  .gd-box.mal{background:rgba(200,40,40,.12);border:1.5px solid #C82828}.gd-box.bien{background:rgba(31,122,85,.14);border:1.5px solid #1F7A55}.gd-box.info{background:var(--brand-soft);border:1.5px solid var(--line)}
  .gd-box .btn{margin-top:8px}
  .gd-acts{display:flex;gap:10px;justify-content:space-between;flex-wrap:wrap}
  .gd-acts .btn{flex:1;min-width:130px;min-height:52px;font-size:16px}
  .gd-lin2,.gd-lin.gd-lin2{grid-template-columns:1fr 36px;align-items:start;border-top:1px solid var(--line);padding-top:10px}.gd-lin2>*{grid-column:1}.gd-lin2>button,.gd-lin2>span{grid-column:2;grid-row:1}
  .gd-sec{margin:12px 0 2px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--mute,#8a867f)}.gd-sec small{text-transform:none;letter-spacing:0;font-weight:400}
  .gd-lin{display:grid;grid-template-columns:1fr 120px 36px;gap:8px;align-items:end}
  .gd-lin button{height:44px;border-radius:9px;border:1.5px solid var(--line);background:transparent;color:var(--ink);cursor:pointer}
  .gd-tot{font-size:26px;font-weight:800;text-align:right}
  .gd-canal-res{display:grid;gap:8px;margin-top:12px}
  .gd-canal-res>div{border-radius:12px;padding:10px 12px;display:grid;gap:2px}
  .gd-efe{background:rgba(31,122,85,.12);border:1.5px solid #1F7A55}.gd-banco{background:rgba(59,111,216,.12);border:1.5px solid #3B6FD8}
  .gd-canal-res b{font-size:14px}.gd-canal-res .num{font-size:20px;font-weight:800}.gd-canal-res small{color:var(--muted);font-size:12.5px}
  .fn-canal em{display:block;font-style:normal;font-size:11.5px;font-weight:700;margin-top:2px;opacity:.85}
  .gd-aud table{width:100%}.gd-aud td,.gd-aud th{padding:6px 8px;text-align:left;font-size:13.5px;vertical-align:top}
  .gd-chips{display:flex;gap:6px;flex-wrap:wrap}.gd-chips button{border:1.5px solid var(--line);background:transparent;color:var(--ink);border-radius:20px;padding:6px 12px;cursor:pointer;font-size:13px;font-family:inherit}
  .gd-nota{margin:0;color:var(--muted);font-size:14px;max-width:340px}
  @media(max-width:720px){.gd-bar{grid-template-columns:1fr}.gd-lin{grid-template-columns:1fr 100px 36px}.gd-menu{right:auto;left:0}.gd-bar .gd-mas{justify-self:stretch}.gd-bar .gd-mas>summary{width:100%;justify-content:center}}
  `;
  document.head.appendChild(css);

  /* ================= 1. BARRA DE ACCIONES PRINCIPALES ================= */
  function utilidades() {
    const gerente = esGer();
    const l = [];
    if (gerente) {
      l.push(["ingreso", "+ Otro ingreso"], ["gasto", "− Nuevo gasto"], ["emitidas", "Excel emitidas"], ["recibidas", "Excel recibidas"], ["pdf", "PDF asesoría"]);
    }
    l.push(["blanco", "Fichas en blanco (PDF)"], ["cliente", "+ Nuevo cliente (CRM)"], ["informe", "Informe PDF del mes"], ["ayuda", "Ayuda paso a paso"]);
    return l;
  }
  function pintarBarra() {
    let bar = $("#gd-bar");
    if (!bar) {
      bar = document.createElement("section"); bar.id = "gd-bar"; bar.className = "gd-bar"; bar.hidden = true; bar.setAttribute("aria-label", "Acciones principales");
      const fila = $("#tabsrow"); if (!fila) return; fila.insertAdjacentElement("afterend", bar);
    }
    const pf = puedeFactura(), t = pestaña("ordenes"), c = pestaña("caja");
    const sig = [pf, t, c, esGer()].join();
    if (bar.dataset.sig === sig) return; bar.dataset.sig = sig;
    bar.innerHTML =
      (t ? `<button type="button" class="gd-big gd-a" data-gd="entrada"><i>＋</i><span><b>+ Nueva Entrada / Recepción de Coche</b><small>Un coche llega: te guío paso a paso</small></span></button>` : "") +
      (pf ? `<button type="button" class="gd-big gd-b" data-gd="factura"><i>€</i><span><b>+ Factura Rápida / Cobro Directo</b><small>El cliente está aquí y paga ya</small></span></button>` : "") +
      (c ? `<button type="button" class="gd-big gd-c" data-gd="caja"><i>⇄</i><span><b>Control de Caja (Entrada / Salida)</b><small>Abrir, cobrar, sacar dinero y cerrar</small></span></button>` : "") +
      `<details class="gd-mas"><summary>Más opciones / Utilidades</summary><div class="gd-menu">${utilidades().map(([k, t]) => `<button type="button" data-gdutil="${k}">${E(t)}</button>`).join("")}</div></details>`;
  }
  const PANTALLAS_BARRA = ["s-dash", "s-ordenes", "s-caja", "s-leads", "s-alm", "s-agenda"];
  function sincronizarBarra() {
    const fila = $("#tabsrow"), bar = $("#gd-bar");
    const dentro = fila && !fila.hidden && PANTALLAS_BARRA.some(visible);
    if (!dentro) { if (bar) bar.hidden = true; return; }
    pintarBarra(); const b = $("#gd-bar"); if (b) b.hidden = false;
    const bc = $("#gd-bar [data-gd=caja]"); if (bc) bc.hidden = visible("s-caja"); // ya estás en Caja: el botón sobra
  }
  setInterval(function () { if (!document.hidden) sincronizarBarra(); }, 700); document.addEventListener("DOMContentLoaded", sincronizarBarra);

  async function conFinanzas(fn) {
    if (!esGer()) return aviso("Esto lo hace el Gerente.");
    if (!visible("s-fin")) abrirTab("fin");
    for (let i = 0; i < 40; i++) { let listo = false; try { listo = !!FN && !!$("#fn .fn-kpis"); } catch (_) { } if (listo) break; await new Promise(r => setTimeout(r, 150)); }
    try { fn(); } catch (e) { aviso(e.message); }
  }
  function utilidad(k) {
    if (k === "ingreso") return conFinanzas(() => fnNuevoIngreso());
    if (k === "gasto") return conFinanzas(() => fnNuevoGasto());
    if (k === "emitidas" || k === "recibidas" || k === "pdf") return conFinanzas(() => fnExportar(k));
    if (k === "blanco") { if (typeof vcAbrirPDF === "function") vcAbrirPDF("FICHAS-TALLER"); return; }
    if (k === "cliente") { abrirTab("leads"); setTimeout(() => $("#nuevo-cliente") && $("#nuevo-cliente").click(), 60); return; }
    if (k === "cita") { abrirTab("leads"); setTimeout(() => $("#cita-nueva") && $("#cita-nueva").click(), 60); return; }
    if (k === "informe") { abrirTab("dash"); setTimeout(() => $("#dash-pdf") && $("#dash-pdf").click(), 400); return; }
    if (k === "ayuda") return abrirTab("ayuda");
  }

  /* ================= 2. ASISTENTE DE 4 PASOS ================= */
  const W = {};
  const TITULOS = ["Cliente y coche", "¿Qué hacemos?", "Facturación", "Cobro y cierre"];
  function reiniciar(modo) {
    Object.keys(W).forEach(k => delete W[k]);
    Object.assign(W, { modo, paso: 1, lead: null, nombre: "", tel: "", mat: "", coche: "", destino: modo === "factura" ? "taller" : "", ruta: "", orden: null, fact: null, cobro: null,
      lineas: [{ t: "OTRO", r: "", d: "", n: "1", p: "", dt: "" }], igic: "7", igicOtro: "", dtoG: "", doc: "", obs: "", dir: "", cp: "", email: "", vin: "", kmE: "", kmS: "", fOp: "", cocheId: "", metodo: "", busy: false, q: "" });
  }
  function dlg() {
    let d = $("#dlg-gd");
    if (!d) { d = document.createElement("dialog"); d.id = "dlg-gd"; d.className = "t-dlg gd-dlg"; document.body.appendChild(d); d.addEventListener("close", () => { W.busy = false; }); }
    return d;
  }
  function cabecera() {
    const n = W.modo === "factura" && W.paso >= 2 ? W.paso : W.paso;
    return `<div class="gd-prog" aria-hidden="true">${[1, 2, 3, 4].map(i => `<i class="${i < n ? "ok" : i === n ? "now" : ""}"></i>`).join("")}</div>
      <div class="gd-paso">Paso ${W.paso} de 4 · ${TITULOS[W.paso - 1]}</div>`;
  }
  function abrirAsistente(modo) {
    reiniciar(modo); const d = dlg(); pinta(); if (!d.open) d.showModal();
  }
  function cerrarAsistente() { const d = $("#dlg-gd"); if (d && d.open) d.close(); }
  function pinta() {
    const d = dlg();
    d.innerHTML = `<div class="gd-body">${cabecera()}${[p1, p2, p3, p4][W.paso - 1]()}</div>`;
    enlazar(d);
  }

  /* ---------- paso 1 · cliente y coche ---------- */
  function ordenAbierta(mat) {
    const m = norm(mat); if (!m) return null;
    return ordenes().find(o => norm(o.vehiculo && o.vehiculo.matricula) === m && !["entregado", "cancelado"].includes(o.estado)) || null;
  }
  function buscar(q) {
    q = String(q || "").trim().toLowerCase(); if (q.length < 2) return [];
    const t = q.replace(/\D/g, "");
    return leads().filter(x => x.estado !== "perdida" && (String(x.nombre || "").toLowerCase().includes(q) || (t.length >= 4 && tel9(x.telefono).includes(t)) || norm(x.vehiculo && x.vehiculo.matricula).toLowerCase().includes(q.replace(/[\s-]/g, "")) || String((x.vehiculo && x.vehiculo.coche) || "").toLowerCase().includes(q))).slice(0, 5);
  }
  function p1() {
    const res = !W.lead ? buscar(W.q) : [];
    const dup = ordenAbierta(W.mat);
    const dupTel = !W.lead && tel9(W.tel).length >= 9 ? leads().find(x => tel9(x.telefono) === tel9(W.tel)) : null;
    return `<h2>${W.modo === "factura" ? "¿A quién le cobras?" : "¿Quién viene y con qué coche?"}</h2>
      <div class="field"><label for="gd-q">Buscar un cliente que ya tengas (nombre, teléfono o matrícula)</label><input class="in" id="gd-q" value="${E(W.q)}" autocomplete="off" placeholder="Ej.: María, 612…, 1234ABC"></div>
      ${res.length ? `<div class="gd-res">${res.map(x => `<button type="button" data-gdlead="${E(x.id)}"><span><b>${E(x.nombre)}</b><br><small>${E(x.telefono || "")} ${x.vehiculo && x.vehiculo.matricula ? "· " + E(x.vehiculo.matricula) : ""}</small></span><b>Es este ›</b></button>`).join("")}</div>` : ""}
      ${W.lead ? `<div class="gd-box bien">✅ Cliente del CRM: <b>${E(W.lead.nombre)}</b>. <button type="button" class="g-link" data-gdquitar>Quitar y escribir otro</button></div>` : `<p class="hint" style="margin:0">¿No está? Escríbelo aquí abajo: se apunta solo.</p>`}
      <div class="t-g2"><div class="field"><label for="gd-nom">Nombre del cliente *</label><input class="in" id="gd-nom" data-gdf="nombre" maxlength="80" autocomplete="off" value="${E(W.nombre)}"></div>
      <div class="field"><label for="gd-tel">Teléfono</label><input class="in num" id="gd-tel" data-gdf="tel" inputmode="tel" maxlength="30" autocomplete="off" value="${E(W.tel)}"></div></div>
      <div class="t-g2"><div class="field"><label for="gd-mat">Matrícula *</label><input class="in t-matin" id="gd-mat" data-gdf="mat" maxlength="12" autocomplete="off" placeholder="1234 ABC" value="${E(W.mat)}"></div>
      <div class="field"><label for="gd-coche">Marca y modelo</label><input class="in" id="gd-coche" data-gdf="coche" maxlength="80" autocomplete="off" value="${E(W.coche)}"></div></div>
      ${dupTel ? `<div class="gd-box mal">⚠️ Ese teléfono ya es de <b>${E(dupTel.nombre)}</b> en el CRM. Para no duplicarlo, usa su ficha.<br><button type="button" class="btn b-brand b-sm" data-gdlead="${E(dupTel.id)}">Usar a ${E(dupTel.nombre)}</button></div>` : ""}
      ${dup ? `<div class="gd-box mal">⚠️ Ese coche <b>ya está en el taller</b> (orden ${E(dup.num || "")} · ${E(dup.estado)}). No se crea otra para no duplicar.<br>
        <button type="button" class="btn b-brand b-sm" data-gdabrir="${E(dup.token)}">Abrir esa orden</button>
        ${W.modo === "factura" && puedeFactura() ? ` <button type="button" class="btn b-acc b-sm" data-gdusar="${E(dup.token)}">Facturar esa orden</button>` : ""}</div>` : ""}
      <div class="gd-box mal" id="gd-err" hidden></div>
      <div class="gd-acts"><button type="button" class="btn b-ghost" data-gdcerrar>Cancelar</button><button type="button" class="btn b-acc" data-gdsig ${dup || dupTel ? "disabled" : ""}>Siguiente ›</button></div>`;
  }
  /* ---------- paso 2 · asignación ---------- */
  function p2() {
    const ger = esGer();
    return `<h2>¿Qué hacemos con este coche?</h2>
      <p class="hint" style="margin:0">${E(W.nombre)} · ${E(W.mat.toUpperCase())}</p>
      <div class="gd-opts">
        <button type="button" class="gd-opt" data-gddest="taller"><i>🔧</i><span><b>Taller</b><small>Reparación, mantenimiento o presupuesto</small></span></button>
        <button type="button" class="gd-opt" data-gddest="venta" ${ger ? "" : "disabled"}><i>🚗</i><span><b>Venta de coches</b><small>${ger ? "El cliente compra un coche nuestro" : "La venta la registra el Gerente"}</small></span></button>
      </div>
      <div class="gd-acts"><button type="button" class="btn b-ghost" data-gdatras>‹ Atrás</button></div>`;
  }
  /* ---------- paso 3 · facturación ---------- */
  function pctIgic() { return W.igic === "7" ? 7 : W.igic === "otro" ? Math.min(30, Math.max(0, num(W.igicOtro))) : 0; }
  function impLinea(l) { const n = num(l.n) > 0 ? num(l.n) : (String(l.n || "").trim() === "" ? 1 : 0), p = num(l.p) > 0 ? num(l.p) : 0, d = Math.min(100, Math.max(0, num(l.dt))); return Math.round(n * p * (1 - d / 100) * 100) / 100; }
  function totalCliente() { const s = W.lineas.reduce((a, l) => a + impLinea(l), 0); return Math.max(0, Math.round((s - Math.min(s, Math.max(0, num(W.dtoG)))) * 100) / 100); }
  function p3() {
    if (W.destino === "venta") {
      const lista = coches().filter(c => c.estado === "disponible" || c.estado === "reservado");
      return `<h2>¿Qué coche compra?</h2>
        <div class="field"><label for="gd-car">Elige el coche *</label><select class="in" id="gd-car"><option value="">— Elige —</option>${lista.map(c => `<option value="${E(c.id)}" ${W.cocheId === c.id ? "selected" : ""}>${E(c.marca + " " + c.modelo + " " + (c.version || ""))} · ${E(eur(c.precio))}</option>`).join("")}</select></div>
        <div class="gd-box info">Se abre la ficha de venta (precio final, comprador y forma de pago). Ahí mismo se registra el cobro y queda cerrada la venta.</div>
        <div class="gd-box mal" id="gd-err" hidden></div>
        <div class="gd-acts"><button type="button" class="btn b-ghost" data-gdatras>‹ Atrás</button><button type="button" class="btn b-acc" data-gdventa>Registrar la venta ›</button></div>`;
    }
    if (!W.ruta) {
      const pf = puedeFactura();
      return `<h2>¿Cómo seguimos?</h2>
        <div class="gd-opts">
          <button type="button" class="gd-opt" data-gdruta="directa" ${pf ? "" : "disabled"}><i>⚡</i><span><b>Factura directa / En persona</b><small>${pf ? "El cliente está aquí y paga ya. Sin ficha técnica, sin checklist y sin presupuesto." : "La factura la hace el Gerente o Recepción"}</small></span></button>
          <button type="button" class="gd-opt" data-gdruta="completa"><i>📋</i><span><b>Proceso completo del taller</b><small>Ficha de recepción, inspección, presupuesto y factura al final</small></span></button>
        </div>
        <div class="gd-box mal" id="gd-err" hidden></div>
        <div class="gd-acts"><button type="button" class="btn b-ghost" data-gdatras>‹ Atrás</button></div>`;
    }
    // factura directa: el formulario COMPLETO de la factura (FORM-14)
    const t = totalCliente(), pct = pctIgic(), base = pct ? t / (1 + pct / 100) : t, cuota = t - base;
    const F = (k, et, ex = "") => `<div class="field"><label for="gd-${k}">${et}</label><input class="in${ex.includes("num") ? " num" : ""}" id="gd-${k}" data-gdf="${k}" ${ex.replace("num", "")} value="${E(W[k] || "")}"></div>`;
    return `<h2>Factura directa</h2>
      <p class="hint" style="margin:0">${E(W.nombre)} · ${E(W.mat.toUpperCase())}${W.orden ? " · orden " + E(W.orden.num || "") : ""} · El número de factura (F-AAAA-NNNN) lo pone el sistema al emitir.</p>
      <p style="margin:0"><a class="g-link" href="#manual-FORM-14">Factura en blanco (PDF)</a></p>
      <h3 class="gd-sec">Cliente</h3>
      <div class="t-g2">${F("doc", "DNI / NIE / CIF " + (t > 400 ? "*" : "(obligatorio si pasa de 400 €)"), 'maxlength="20" autocomplete="off"')}${F("dir", "Dirección", 'maxlength="120" autocomplete="off"')}</div>
      <div class="t-g2">${F("cp", "CP / localidad", 'maxlength="80" autocomplete="off"')}${F("email", "Correo electrónico", 'maxlength="120" inputmode="email" autocomplete="off"')}</div>
      <h3 class="gd-sec">Vehículo</h3>
      <div class="t-g2">${F("vin", "Bastidor (VIN)", 'maxlength="17" autocomplete="off"')}${F("fOp", "Fecha de la operación", 'type="date"')}</div>
      <div class="t-g2">${F("kmE", "Km de entrada", 'inputmode="numeric" maxlength="10" num')}${F("kmS", "Km de salida", 'inputmode="numeric" maxlength="10" num')}</div>
      <h3 class="gd-sec">Detalle de la reparación <small>(el precio es por unidad, con el impuesto incluido)</small></h3>
      <div id="gd-lineas">${W.lineas.map((l, i) => `<div class="gd-lin gd-lin2"><div class="t-g2"><div class="field"><label>Tipo</label><select class="in" data-gdl="t" data-i="${i}"><option value="OTRO"${l.t === "OTRO" ? " selected" : ""}>Otro</option><option value="MO"${l.t === "MO" ? " selected" : ""}>MO · mano de obra</option><option value="REC"${l.t === "REC" ? " selected" : ""}>REC · recambio</option></select></div>
        <div class="field"><label>Referencia</label><input class="in" data-gdl="r" data-i="${i}" maxlength="40" value="${E(l.r)}"></div></div>
        <div class="field"><label>${i ? "Otro concepto" : "¿Qué se cobra? *"}</label><input class="in" data-gdl="d" data-i="${i}" maxlength="200" value="${E(l.d)}"></div>
        <div class="t-g3"><div class="field"><label>Cant.</label><input class="in num" data-gdl="n" data-i="${i}" inputmode="decimal" value="${E(l.n)}"></div>
        <div class="field"><label>Precio ud. (€) *</label><input class="in num" data-gdl="p" data-i="${i}" inputmode="decimal" value="${E(l.p)}"></div>
        <div class="field"><label>Dto. %</label><input class="in num" data-gdl="dt" data-i="${i}" inputmode="decimal" value="${E(l.dt)}"></div></div>${W.lineas.length > 1 ? `<button type="button" data-gdquitarl="${i}" aria-label="Quitar">✕</button>` : "<span></span>"}</div>`).join("")}</div>
      ${W.lineas.length < 12 ? `<button type="button" class="g-link" data-gdmasl>+ Añadir otro concepto</button>` : ""}
      <h3 class="gd-sec">Totales e IGIC</h3>
      <div class="field"><label>Tipo de IGIC</label><div class="t-seg" id="gd-igic"><button type="button" data-v="7" aria-pressed="${W.igic === "7"}">7 % general</button><button type="button" data-v="0" aria-pressed="${W.igic === "0"}">0 % exento</button><button type="button" data-v="otro" aria-pressed="${W.igic === "otro"}">Otro %</button></div><small class="hint">El precio que escribes es lo que paga el cliente, con el impuesto incluido.</small></div>
      ${W.igic === "otro" ? F("igicOtro", "Tipo de IGIC (%)", 'inputmode="decimal" maxlength="5" num') : ""}
      ${F("dtoG", "Descuento global (€)", 'inputmode="decimal" maxlength="10" num')}
      <div class="field"><label for="gd-obs">${W.igic === "0" ? "Motivo de la exención * (sale en la factura)" : "Observaciones"}</label><input class="in" id="gd-obs" maxlength="300" value="${E(W.obs)}"></div>
      <div class="gd-tot" id="gd-tot">${eur(t)}</div><small class="hint" id="gd-desg" style="text-align:right">${pct ? `Base ${eur(base)} + IGIC ${String(pct).replace(".", ",")} % ${eur(cuota)}` : "Sin impuesto"}</small>
      <div class="gd-box info">Al emitir, la factura queda con <b>número definitivo</b> (no se puede borrar; si hay un error se corrige con una rectificativa).</div>
      <div class="gd-box mal" id="gd-err" hidden></div>
      <div class="gd-acts"><button type="button" class="btn b-ghost" data-gdatras>‹ Atrás</button><button type="button" class="btn b-acc" data-gdemitir>Emitir factura ›</button></div>`;
  }
  /* ---------- paso 4 · cobro y cierre ---------- */
  const METODOS = [["efectivo", "💵", "Efectivo", "Entra en el cajón de caja"], ["tarjeta", "💳", "Tarjeta / TPV", "Va al banco: NO entra en el cajón"], ["transferencia", "🏦", "Transferencia", "Dinero abonado por Transferencia (En Cuenta Bancaria, NO presente en el cajón físico de caja)"]];
  function p4() {
    const f = W.fact;
    if (W.cobro) return `<h2>Todo listo</h2>
      <div class="gd-box bien">✅ <b>Factura ${E(f.numero)}</b> emitida por ${eur(f.total)}.<br>✅ <b>Cobro registrado:</b> ${E(W.cobro.txt)}.</div>
      <div class="gd-acts"><button type="button" class="btn b-ghost" data-gdver="${E(W.orden.token)}">Ver / imprimir factura</button><button type="button" class="btn b-acc" data-gdcerrar>Terminar</button></div>`;
    const ger = esGer(), ops = ger ? METODOS : METODOS.slice(0, 1);
    return `<h2>Cobro y cierre</h2>
      <div class="gd-box bien">✅ <b>Factura ${E(f.numero)}</b> emitida por ${eur(f.total)}.</div>
      <div class="gd-opts">${ops.map(([k, ic, t, h]) => `<button type="button" class="gd-opt" data-gdmet="${k}" aria-pressed="${W.metodo === k}"><i>${ic}</i><span><b>${t}</b><small>${h}</small></span></button>`).join("")}</div>
      ${ger ? "" : `<p class="hint" style="margin:0">Transferencia o tarjeta: las apunta el Gerente. Si no ha pagado aún, deja el cobro para luego.</p>`}
      <div class="gd-box mal" id="gd-err" hidden></div>
      <div class="gd-acts"><button type="button" class="btn b-ghost" data-gdcerrar>Cobrar más tarde</button><button type="button" class="btn b-acc" data-gdcobrar ${W.metodo ? "" : "disabled"}>Cobrar ${eur(f.total)} y cerrar</button></div>`;
  }

  function error(t, extra) { const e = $("#gd-err"); if (!e) return aviso(t); e.innerHTML = E(t) + (extra || ""); e.hidden = false; e.scrollIntoView({ block: "nearest" }); }
  function enlazar(d) {
    $$("[data-gdf]", d).forEach(i => i.oninput = () => { W[i.dataset.gdf] = i.value; if (i.dataset.gdf === "dtoG" || i.dataset.gdf === "igicOtro") refrescaTotal(); if (i.dataset.gdf === "mat" || i.dataset.gdf === "tel") { clearTimeout(enlazar.t); enlazar.t = setTimeout(() => { const foco = document.activeElement && document.activeElement.id, pos = document.activeElement && document.activeElement.selectionStart; pinta(); const n = foco && $("#" + foco); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (_) { } } }, 450); } });
    const q = $("#gd-q", d); if (q) q.oninput = () => { W.q = q.value; clearTimeout(enlazar.t); enlazar.t = setTimeout(() => { pinta(); const n = $("#gd-q"); n.focus(); n.setSelectionRange(n.value.length, n.value.length); }, 300); };
    $$("[data-gdl]", d).forEach(i => { i.oninput = i.onchange = () => { W.lineas[+i.dataset.i][i.dataset.gdl] = i.value; refrescaTotal(); }; });
    const doc = $("#gd-doc", d); if (doc) doc.oninput = () => { W.doc = doc.value; };
    const obs = $("#gd-obs", d); if (obs) obs.oninput = () => { W.obs = obs.value; };
    const car = $("#gd-car", d); if (car) car.onchange = () => { W.cocheId = car.value; };
  }
  function refrescaTotal() {
    const t = totalCliente(), pct = pctIgic(), base = pct ? t / (1 + pct / 100) : t;
    const a = $("#gd-tot"), b = $("#gd-desg"); if (a) a.textContent = eur(t); if (b) b.textContent = pct ? `Base ${eur(base)} + IGIC ${String(pct).replace(".", ",")} % ${eur(t - base)}` : "Sin impuesto";
  }
  async function refrescarOrdenes() { try { ORDENES = await api("/api/ordenes"); if (typeof renderOrdenes === "function") renderOrdenes(); } catch (_) { } }
  /* crea (una sola vez) la orden del coche; si ya existe una abierta, no crea otra */
  async function asegurarOrden() {
    if (W.orden) return W.orden;
    const ab = ordenAbierta(W.mat); if (ab) { W.orden = ab; return ab; }
    let r;
    try {
      r = await tApi("recepcion", "POST", { cliente: { nombre: W.nombre, telefono: W.tel, email: W.email || "" }, vehiculo: { matricula: W.mat, marcaModelo: W.coche, vin: W.vin || "" }, tipoEntrada: "reparacion", recibidoPor: yo() ? yo().nombre : "" });
    } catch (e) { throw e; }
    W.orden = r.orden; try { ORDENES.unshift(r.orden); } catch (_) { }
    return W.orden;
  }
  async function emitir() {
    if (W.busy) return; const lineas = W.lineas.filter(l => l.d.trim() || String(l.p).trim());
    if (!lineas.length) return error("Escribe qué se cobra y cuánto.");
    if (lineas.some(l => l.d.trim().length < 3)) return error("Cada concepto necesita un texto (mínimo 3 letras).");
    if (lineas.some(l => !(num(l.p) > 0))) return error("Cada concepto necesita un precio mayor que 0.");
    if (lineas.some(l => String(l.n).trim() !== "" && !(num(l.n) > 0))) return error("La cantidad de cada concepto debe ser mayor que 0.");
    if (lineas.some(l => num(l.dt) < 0 || num(l.dt) > 100)) return error("El descuento de cada línea va de 0 a 100 %.");
    const bruto = lineas.reduce((a, l) => a + impLinea(l), 0);
    if (num(W.dtoG) < 0 || num(W.dtoG) > bruto) return error("El descuento global no puede ser mayor que la suma de las líneas.");
    const total = totalCliente();
    if (!(total > 0)) return error("El total de la factura debe ser mayor que 0.");
    if (total > 400 && !W.doc.trim()) return error("Falta el NIF/CIF del cliente: por encima de 400 € es obligatorio.");
    if (W.igic === "0" && W.obs.trim().length < 8) return error("Con IGIC 0 % escribe el motivo de la exención (mínimo 8 letras).");
    if (W.igic === "otro" && !(num(W.igicOtro) > 0 && num(W.igicOtro) <= 30)) return error("Escribe el tipo de IGIC (entre 0,1 y 30 %).");
    if (!confirm(`¿Emitir la factura por ${eur(total)}?\n\nQueda con número definitivo y no se puede borrar.`)) return;
    W.busy = true; const b = $("[data-gdemitir]"); if (b) { b.disabled = true; b.textContent = "Emitiendo…"; }
    try {
      const o = await asegurarOrden();
      const pct = pctIgic(), k = 1 + pct / 100, r2 = x => Math.round(x * 100) / 100;
      const body = { cliente: { nombre: W.nombre, doc: W.doc.trim(), telefono: W.tel, direccion: W.dir.trim(), cp: W.cp.trim(), email: W.email.trim() },
        vehiculo: { matricula: W.mat, marcaModelo: W.coche, vin: W.vin.trim(), kmEntrada: W.kmE.trim(), kmSalida: W.kmS.trim() },
        lineas: lineas.map(l => ({ tipo: l.t || "OTRO", ref: (l.r || "").trim(), desc: l.d.trim(), cant: String(l.n).trim() === "" ? 1 : num(l.n), precio: r2(num(l.p) / k), dto: num(l.dt) })),
        descuentoGlobal: r2(Math.max(0, num(W.dtoG)) / k), igicTipo: W.igic, igicOtro: W.igic === "otro" ? num(W.igicOtro) : 0, fechaOperacion: W.fOp || "",
        observaciones: W.obs.trim() || "Factura directa en persona", cerrar: true };
      const r = await tApi(`fichas/${o.token}/f5`, "PUT", body);
      const em = r && r.fichas && r.fichas.f5 && r.fichas.f5.emision; if (!em || !em.numero) throw new Error("No he podido confirmar el número de factura. Mira en Taller antes de repetirla.");
      let tt = 0; try { tt = fcTotales(Object.assign({ lineas: [], descuentoGlobal: 0, igicTipo: "7", igicOtro: 0 }, r.fichas.f5)).total; } catch (_) { } W.fact = { numero: em.numero, total: tt > 0 ? tt : total };
      try { await post("/api/ordenes/" + o.token, { estado: "entregado", interno: "Factura directa en persona (sin ficha técnica ni presupuesto)" }, "PATCH"); } catch (_) { }
      refrescarOrdenes(); W.paso = 4; W.busy = false; pinta();
    } catch (e) {
      W.busy = false; if (b) { b.disabled = false; b.textContent = "Emitir factura ›"; }
      if (e.message && /ya est[aá] en el taller/.test(e.message)) return error(e.message);
      error(e.message || "No se ha podido emitir la factura.");
    }
  }
  async function cobrar() {
    if (W.busy || !W.metodo) return; W.busy = true; const b = $("[data-gdcobrar]"); if (b) { b.disabled = true; b.textContent = "Cobrando…"; }
    const f = W.fact, t = W.orden.token, desc = { efectivo: "Efectivo (entra en el cajón)", tarjeta: "Tarjeta / TPV (va al banco)", transferencia: "Transferencia (en cuenta bancaria, NO en el cajón físico)" }[W.metodo];
    try {
      if (esGer()) await post(`/api/finanzas/cobro/taller/${t}`, { importe: String(f.total.toFixed(2)), metodo: W.metodo, fecha: hoy() });
      else await post("/api/caja/movimiento", { tipo: "ingreso", importe: String(f.total.toFixed(2)), categoria: "taller", concepto: `Cobro factura ${f.numero} · ${W.mat.toUpperCase()}`, ref: f.numero, orden: t, metodo: "efectivo" });
      W.cobro = { txt: `${eur(f.total)} · ${desc}` }; W.busy = false;
      try { if (typeof FN !== "undefined" && FN && visible("s-fin")) fnCargar(); } catch (_) { }
      pinta();
    } catch (e) {
      W.busy = false; if (b) { b.disabled = false; b.textContent = `Cobrar ${eur(f.total)} y cerrar`; }
      const msg = e.message || "No se ha podido registrar el cobro.";
      error(msg + " La factura SÍ está emitida: no hace falta repetirla.", /caja/i.test(msg) ? ` <br><button type="button" class="btn b-brand b-sm" data-gdircaja>Abrir Control de Caja</button>` : "");
    }
  }
  async function crearCompleta() {
    if (W.busy) return; W.busy = true; const lead = W.lead;
    try {
      let token;
      if (lead && lead.tipo === "taller" && !lead.orden) { const o = await post("/api/ordenes", { lead: lead.id }); try { ORDENES.unshift(o); } catch (_) { } token = o.token; try { loadLeads(false); } catch (_) { } }
      else { const o = await asegurarOrden(); token = o.token; }
      cerrarAsistente(); abrirTab("ordenes"); if (typeof tPanelFichas === "function") { await tPanelFichas(token); aviso("Orden creada: estas son sus 6 fichas"); } else { await abrirFichas(token, "f1"); aviso("Orden creada: completa la ficha de recepción"); }
    } catch (e) { error(e.message); }
    W.busy = false;
  }

  /* ---------- clics del asistente y de la barra ---------- */
  document.addEventListener("click", ev => {
    const t = ev.target.closest("button,a,summary"); const det = $$(".gd-mas[open]"); det.forEach(x => { if (!x.contains(ev.target)) x.removeAttribute("open"); });
    if (!t) return;
    const g = t.dataset;
    if (g.gd) { ev.preventDefault(); if (g.gd === "caja") { abrirTab("caja"); return; } abrirAsistente(g.gd); return; }
    if (g.gdutil) { const m = t.closest(".gd-mas"); if (m) m.removeAttribute("open"); utilidad(g.gdutil); return; }
    if (t.hasAttribute("data-gdfactura")) { ev.preventDefault(); abrirAsistente("factura"); return; }
    if (t.closest("#dlg-gd") === null) return;
    if (t.hasAttribute("data-gdcerrar")) return cerrarAsistente();
    if (t.hasAttribute("data-gdatras")) { if (W.paso === 3 && W.destino !== "venta" && W.ruta) W.ruta = ""; else { W.paso = W.paso === 3 && W.modo === "factura" ? 1 : W.paso - 1; W.ruta = ""; } return pinta(); }
    if (g.gdlead) { const x = leads().find(l => l.id === g.gdlead); if (x) { W.lead = x; W.nombre = x.nombre || ""; W.tel = x.telefono || ""; if (x.vehiculo) { W.mat = x.vehiculo.matricula || W.mat; W.coche = x.vehiculo.coche || W.coche; } W.q = ""; } return pinta(); }
    if (t.hasAttribute("data-gdquitar")) { W.lead = null; return pinta(); }
    if (g.gdabrir) { cerrarAsistente(); abrirTab("ordenes"); abrirFichas(g.gdabrir, "f1"); return; }
    if (g.gdusar) { W.orden = ordenes().find(o => o.token === g.gdusar) || { token: g.gdusar, num: "" }; return siguiente(); }
    if (t.hasAttribute("data-gdsig")) return siguiente();
    if (g.gddest) { W.destino = g.gddest; W.paso = 3; W.ruta = ""; return pinta(); }
    if (g.gdruta) { if (g.gdruta === "completa") return crearCompleta(); W.ruta = "directa"; return pinta(); }
    if (t.hasAttribute("data-gdmasl")) { W.lineas.push({ t: "OTRO", r: "", d: "", n: "1", p: "", dt: "" }); return pinta(); }
    if (g.gdquitarl !== undefined) { W.lineas.splice(+g.gdquitarl, 1); return pinta(); }
    if (t.closest("#gd-igic") && g.v !== undefined) { W.igic = g.v; return pinta(); }
    if (t.hasAttribute("data-gdemitir")) return emitir();
    if (g.gdmet) { W.metodo = g.gdmet; return pinta(); }
    if (t.hasAttribute("data-gdcobrar")) return cobrar();
    if (g.gdver) { cerrarAsistente(); abrirTab("ordenes"); abrirFichas(g.gdver, "f5"); return; }
    if (t.hasAttribute("data-gdircaja")) { cerrarAsistente(); abrirTab("caja"); return; }
    if (t.hasAttribute("data-gdventa")) {
      if (!W.cocheId) return error("Elige el coche.");
      const id = W.cocheId, nombre = W.nombre; cerrarAsistente();
      Promise.resolve(fnVenta(id)).then(() => { const c = $("#fn-cli"); if (c && !c.value) c.value = nombre; }).catch(e => aviso(e.message)); return;
    }
  });
  function siguiente() {
    if (W.paso === 1) {
      if (W.nombre.trim().length < 2) return error("Escribe el nombre del cliente.");
      if (!norm(W.mat)) return error("Escribe la matrícula.");
      if (!W.orden && ordenAbierta(W.mat) && W.modo !== "factura") return error("Ese coche ya está en el taller. Ábrela desde el aviso rojo.");
      W.paso = W.modo === "factura" ? 3 : 2; W.ruta = W.modo === "factura" ? "directa" : ""; return pinta();
    }
  }

  /* ================= 3. ANULAR CON MOTIVO (nada se borra) ================= */
  const MOTIVOS = ["Registro de prueba", "Importe mal escrito", "Duplicado por error", "Cliente equivocado"];
  function pedirMotivo({ titulo, detalle, boton }) {
    return new Promise(res => {
      let d = $("#dlg-gd-anular"); if (!d) { d = document.createElement("dialog"); d.id = "dlg-gd-anular"; d.className = "t-dlg gd-dlg"; document.body.appendChild(d); }
      d.innerHTML = `<form method="dialog" class="gd-body" novalidate><h2>${E(titulo)}</h2><div class="gd-box info">${detalle}</div>
        <div class="gd-box info"><b>No se borra:</b> el registro queda tachado, con tu nombre y el motivo, en el libro de auditoría. Los totales (flujo de caja, cobrado y pendiente) se recalculan solos.</div>
        <div class="field"><label for="gd-mot">Motivo *</label><input class="in" id="gd-mot" maxlength="300" autocomplete="off" placeholder="Mínimo 5 letras"></div>
        <div class="gd-chips">${MOTIVOS.map(m => `<button type="button" data-m="${E(m)}">${E(m)}</button>`).join("")}</div>
        <div class="gd-box mal" id="gd-mot-err" hidden></div>
        <div class="gd-acts"><button type="button" class="btn b-ghost" id="gd-mot-no">No anular</button><button type="submit" class="btn b-acc" id="gd-mot-si">${E(boton || "Anular")}</button></div></form>`;
      let fin = false; const cerrar = v => { if (fin) return; fin = true; if (d.open) d.close(); res(v); };
      $$("[data-m]", d).forEach(b => b.onclick = () => { $("#gd-mot").value = b.dataset.m; });
      $("#gd-mot-no").onclick = () => cerrar(null);
      d.addEventListener("cancel", () => cerrar(null), { once: true });
      $("form", d).onsubmit = e => { e.preventDefault(); const v = $("#gd-mot").value.trim(); if (v.length < 5) { const x = $("#gd-mot-err"); x.textContent = "Escribe el motivo (mínimo 5 letras)."; x.hidden = false; return; } cerrar(v); };
      d.showModal(); setTimeout(() => $("#gd-mot").focus(), 30);
    });
  }
  function snapshot() { try { return FN ? { cobrado: FN.kpis.cobrado, flujo: FN.kpis.flujo, pend: FN.kpis.porCobrar } : null; } catch (_) { return null; } }
  async function anularFinanzas(url, titulo, detalle) {
    const motivo = await pedirMotivo({ titulo, detalle, boton: "Anular" }); if (!motivo) return;
    const antes = snapshot();
    try {
      await post(url, { motivo });
      await fnCargar();
      const des = snapshot();
      const cambio = antes && des ? ` Cobrado ${cent(antes.cobrado)} → ${cent(des.cobrado)} · Flujo ${cent(antes.flujo)} → ${cent(des.flujo)} · Pendiente ${cent(antes.pend)} → ${cent(des.pend)}.` : "";
      banner(`✅ Anulado y guardado en el libro de auditoría. Totales recalculados.${cambio}`);
    } catch (e) { aviso(e.message); }
  }
  function banner(t) {
    let b = $("#gd-banner"); if (!b) { b = document.createElement("div"); b.id = "gd-banner"; b.className = "gd-box bien"; b.style.cssText = "position:fixed;left:12px;right:12px;bottom:14px;z-index:9999;max-width:640px;margin:auto;box-shadow:0 14px 36px -12px rgba(0,0,0,.6);background:#e7f4ee;color:#0e3d2a"; document.body.appendChild(b); }
    b.textContent = t; b.hidden = false; clearTimeout(banner.t); banner.t = setTimeout(() => b.hidden = true, 9000);
  }
  document.addEventListener("click", async ev => {
    const a = ev.target.closest("[data-fnanular],[data-cjanular]"); if (!a) return;
    ev.preventDefault(); ev.stopPropagation();
    if (!esGer()) return aviso("Solo el Gerente (administrador) puede anular registros.");
    const fila = a.closest("tr,.fn-pend,.cj-mov,article,div") || a;
    const que = (fila.querySelector("b") || {}).textContent || "este registro";
    if (a.dataset.fnanular) return anularFinanzas(`/api/finanzas/${a.dataset.fnanular}-anular/${a.dataset.id}`, "Anular registro", `Vas a anular: <b>${E(que)}</b>`);
    if (a.dataset.cjanular) {
      const motivo = await pedirMotivo({ titulo: "Anular movimiento de caja", detalle: `Vas a anular: <b>${E(que)}</b>`, boton: "Anular" }); if (!motivo) return;
      try { await post("/api/caja/anular/" + a.dataset.cjanular, { motivo }); await cjCargar(true); try { cjTurno(DW.id); } catch (_) { } banner("✅ Movimiento anulado y guardado en el libro de caja. El teórico del cajón se ha recalculado."); }
      catch (e) { aviso(e.message); }
    }
  }, true);
  /* el cobro lleva su id en el cuerpo (la ruta solo admite tipo/ref) */
  async function anularCobro(a) {
    const motivo = await pedirMotivo({ titulo: "Anular cobro", detalle: `Vas a anular un cobro de <b>${E(a.dataset.imp || "")}</b>. <small>La factura sigue existiendo; solo se quita el cobro.</small>`, boton: "Anular cobro" }); if (!motivo) return;
    const antes = snapshot();
    try { await post(`/api/finanzas/cobro-anular/${a.dataset.fncobroanular}/${encodeURIComponent(a.dataset.ref)}`, { cobro: a.dataset.cobro, motivo }); await fnCargar(); const des = snapshot();
      banner(`✅ Cobro anulado y guardado en el libro de auditoría. Totales recalculados.${antes && des ? ` Cobrado ${cent(antes.cobrado)} → ${cent(des.cobrado)} · Pendiente ${cent(antes.pend)} → ${cent(des.pend)}.` : ""}`); }
    catch (e) { aviso(e.message); }
  }
  document.addEventListener("click", ev => { const a = ev.target.closest("[data-fncobroanular]"); if (a && esGer()) { ev.preventDefault(); ev.stopPropagation(); anularCobro(a); } }, true);

  /* ================= 4. AUDITORÍA DENTRO DE FINANZAS ================= */
  const ACC = { "gasto-anular": "Gasto anulado", "ingreso-anular": "Ingreso anulado", "cobro-anular": "Cobro anulado", anulacion: "Movimiento de caja anulado" };
  async function cargarAuditoria(box) {
    box.innerHTML = "<p class='hint'>Cargando…</p>";
    try {
      const r = await api("/api/finanzas/libro"), l = (r.entradas || []).filter(e => /anul/.test(e.accion));
      box.innerHTML = `<p class="gd-box ${r.integro ? "bien" : "mal"}">${r.integro ? "✅ Libro íntegro: nadie ha tocado los registros (cadena de huellas correcta)." : "⚠️ El libro NO cuadra: avisa a quien lleva el sistema."} ${r.total} apuntes en total.</p>
        ${l.length ? `<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Cuándo</th><th>Quién</th><th>Qué</th><th>Motivo</th></tr></thead><tbody>${l.map(e => `<tr><td>${E(new Date(e.t).toLocaleString("es-ES", { timeZone: "Atlantic/Canary", dateStyle: "short", timeStyle: "short" }))}</td><td>${E(e.nombre || "")}</td><td>${E(ACC[e.accion] || e.accion)}${e.datos && e.datos.importe ? " · " + E(cent(e.datos.importe)) : ""}</td><td>${E((e.datos && e.datos.motivo) || "")}</td></tr>`).join("")}</tbody></table></div>` : "<p class='hint'>Todavía no se ha anulado nada.</p>"}`;
    } catch (e) { box.innerHTML = `<p class="hint">${E(e.message)}</p>`; }
  }
  function auditoriaEnFinanzas() {
    const fn = $("#fn"); if (!fn || !esGer() || !fn.querySelector(".fn-kpis") || $("#gd-aud")) return;
    const d = document.createElement("details"); d.id = "gd-aud"; d.className = "card gd-aud";
    d.innerHTML = `<summary style="cursor:pointer;font-weight:800;min-height:44px;display:flex;align-items:center">Registro de anulaciones (auditoría)</summary><div id="gd-aud-c"></div>`;
    fn.appendChild(d); d.addEventListener("toggle", () => { if (d.open) cargarAuditoria($("#gd-aud-c")); });
  }
  new MutationObserver(auditoriaEnFinanzas).observe(document.body, { childList: true, subtree: true });

  /* ================= 5. ANTIDUPLICADOS: un formulario no se envía dos veces seguidas ================= */
  /* Bloquea el 2.º envío seguido (doble toque). Si el formulario deshabilita su botón mientras guarda, el bloqueo dura hasta que acabe;
     si fue un error de validación (no se deshabilitó nada), se libera enseguida para poder corregir y reenviar. */
  const enviando = new WeakMap();
  document.addEventListener("submit", ev => {
    const f = ev.target; if (!(f instanceof HTMLFormElement) || f.id === "login-form") return;
    const hasta = enviando.get(f);
    if (hasta && Date.now() < hasta) { ev.preventDefault(); ev.stopImmediatePropagation(); aviso("Ya se está guardando… espera un momento."); return; }
    enviando.set(f, Date.now() + 900);
    setTimeout(() => {
      const btns = $$("button", f).filter(x => x.type === "submit" || !x.getAttribute("type"));
      if (!btns.some(x => x.disabled)) return;
      enviando.set(f, Date.now() + 20000);
      const iv = setInterval(() => { if (!f.isConnected || !btns.some(x => x.disabled)) { clearInterval(iv); enviando.set(f, Date.now() + 300); } }, 150);
    }, 0);
  }, true);
  // Si la persona CAMBIA algo del formulario entre un envío y el siguiente, no es un doble toque sino un reintento (p. ej. corrige el PIN): se permite.
  document.addEventListener("input", ev => {
    const f = ev.target && ev.target.form; if (!f || !enviando.has(f)) return;
    if (!$$("button", f).some(x => x.disabled)) enviando.delete(f);
  }, true);

  /* ================= arranque ================= */
  document.addEventListener("click", ev => { const x = ev.target.closest("[data-gdagenda]"); if (x) { ev.preventDefault(); abrirTab("leads"); } });
  window.gdAsistente = abrirAsistente;
  window.VCGuiado = { utilidades, puedeFactura }; // lo usa la capa de móvil (panel-app.js)
})();
