/* =====================================================================
   PANEL · RESERVAS ONLINE DE 50 €, LISTAS DE ESPERA Y FOTOS DEL DAÑO
   (se copia dentro de public/admin.html con: python3 tools/reservas/inyectar.py)
   ---------------------------------------------------------------------
   En la pestaña «Coches», encima de la lista:
   · Reservas activas: confirmar el pago, ver el justificante, alargar,
     marcar vendido, liberar y mandar la confirmación por WhatsApp.
   · Listas de espera: un botón por persona que abre WhatsApp con el
     aviso «¡Buenas noticias…! vuelve a estar disponible» ya escrito.
   · Datos para cobrar: IBAN, titular, Bizum y si la reserva está activa.
   En el CRM: las fotos del «presupuesto por foto» dentro de cada cliente.
   ===================================================================== */
let RV = null, rvCargando = false, rvUltima = 0, rvDoc = {};
const RV_EST = {
  iniciada: ["Pagando ahora", "warn"], pendiente: ["Falta comprobar el dinero", "warn"], confirmada: ["Confirmada", "ok"],
  cancelada: ["Liberada", "off"], vendida: ["Vendido a este cliente", "ok"],
};
const rvMetodo = { tarjeta: "Tarjeta / Google Pay (Stripe)", transferencia: "Transferencia", bizum: "Bizum" };
const rvCuando = (iso) => (iso ? new Date(iso).toLocaleString("es-ES", { timeZone: "Atlantic/Canary", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
const rvFalta = (iso) => {
  const m = Math.round((Date.parse(iso) - Date.now()) / 60e3);
  if (!isFinite(m)) return "";
  if (m <= 0) return "ya ha pasado";
  return m < 60 ? `${m} min` : m < 48 * 60 ? `${Math.floor(m / 60)} h ${m % 60 ? (m % 60) + " min" : ""}`.trim() : `${Math.round(m / 60 / 24)} días`;
};
const rvFecha = (f) => (f ? new Date(f + "T12:00:00Z").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "");
const rvEnlaceCoche = (id) => `${location.origin}/comprar?coche=${encodeURIComponent(id)}`;
// Mismos textos que la web (netlify/lib/reservas.mts)
function rvMsgConfirmacion(r) {
  const n = r.nombre.split(" ")[0];
  const cuando = r.cita ? ` Nos vemos el ${rvFecha(r.cita.fecha)} a las ${r.cita.hora} en nuestra exposición de Antigua para probarlo.` : " Ven a probarlo a nuestra exposición de Antigua cuando te venga bien.";
  return r.idioma === "en"
    ? `Congratulations, ${n}! Your ${r.coche.titulo} has been successfully reserved at Volcano Cars. You have 48 hours of exclusive reservation.${r.cita ? ` See you on ${r.cita.fecha} at ${r.cita.hora} at our showroom in Antigua to test drive it.` : ""} Your receipt: ${location.origin}/r/${r.token}`
    : `¡Enhorabuena, ${n}! Tu ${r.coche.titulo} ha sido bloqueado con éxito en Volcano Cars. Tienes 48 horas de reserva exclusiva.${cuando} Tu comprobante: ${location.origin}/r/${r.token}`;
}
function rvMsgDisponible(e, titulo, id) {
  const n = e.nombre.split(" ")[0];
  return e.idioma === "en"
    ? `Good news, ${n}! The ${titulo} is available again at Volcano Cars. Be the first to reserve it: ${rvEnlaceCoche(id)}`
    : `¡Buenas noticias, ${n}! El ${titulo} vuelve a estar disponible en Volcano Cars. Sé el primero en reservarlo: ${rvEnlaceCoche(id)}`;
}
const rvWa = (tel, txt) => `https://wa.me/${waNum(tel)}?text=${encodeURIComponent(txt)}`;

async function rvCargar(forzar) {
  if (!PW || (ME && ME.equipo) || rvCargando) return;
  if (!forzar && Date.now() - rvUltima < 4000) return;
  rvCargando = true;
  try { RV = await api("/api/reservas"); rvUltima = Date.now(); rvPintar(); rvContador(); }
  catch (err) { const b = $("#rv-box"); if (b) { b.hidden = false; b.innerHTML = `<div class="empty">${esc(err.message)}</div>`; } }
  finally { rvCargando = false; }
}
function rvContador() {
  const el = $("#n-rsv"); if (!el || !RV) return;
  const n = RV.reservas.filter((r) => r.estado === "pendiente" || (r.estado === "confirmada" && r.hasta && Date.parse(r.hasta) < Date.now())).length;
  el.textContent = n; el.hidden = !n;
}
function rvTarjeta(r) {
  const vencida = r.estado === "confirmada" && r.hasta && Date.parse(r.hasta) < Date.now();
  const [et, cl] = vencida ? ["48 h cumplidas: decide", "bad"] : RV_EST[r.estado] || [r.estado, ""];
  const plazo = r.estado === "iniciada" ? `Le guardamos el coche ${rvFalta(r.hastaPago)} más mientras paga`
    : r.estado === "pendiente" ? `Si no lo confirmas, se libera solo en <b>${rvFalta(r.hastaVerificar)}</b>`
    : r.estado === "confirmada" ? (vencida ? "La reserva no se libera sola: alárgala, márcalo vendido o libéralo" : `Reservado hasta ${rvCuando(r.hasta)} (quedan ${rvFalta(r.hasta)})`) : "";
  const doc = rvDoc[r.token];
  return `<article class="rv-item ${vencida ? "vencida" : r.estado}" data-rv="${esc(r.token)}">
    <div class="rv-top"><div><b class="rv-coche">${esc(r.coche.titulo)} ${esc(r.coche.anio)}</b><span class="rv-cod">${esc(r.codigo)}</span></div><span class="pill rv-${cl}">${esc(et)}</span></div>
    <dl class="rv-dl">
      <div><dt>Cliente</dt><dd>${esc(r.nombre)} · <a href="tel:${esc(r.telefono.replace(/[^\d+]/g, ""))}">${esc(r.telefono)}</a>${r.email ? ` · ${esc(r.email)}` : ""}</dd></div>
      <div><dt>Pago</dt><dd>${eurA(r.importe)} · ${esc(rvMetodo[r.metodo] || r.metodo)}${r.pagado ? ` · pagado ${esc(rvCuando(r.pagado))}` : ""}${r.reembolso === "pendiente" ? ' · <b class="rv-warn">devolución pendiente</b>' : r.reembolso === "hecho" ? " · devuelto" : ""}</dd></div>
      <div><dt>Visita</dt><dd>${r.cita ? esc(rvFecha(r.cita.fecha) + " · " + r.cita.hora + " h") : "Sin fecha: llámale para quedar"}</dd></div>
      ${plazo ? `<div><dt>Plazo</dt><dd>${plazo}</dd></div>` : ""}
    </dl>
    ${r.justificante ? `<div class="rv-doc">${doc ? (doc.pdf ? `<a class="btn b-ghost b-sm" href="${doc.url}" download="justificante-${esc(r.codigo)}.pdf">Descargar el justificante (PDF)</a>` : `<img src="${doc.url}" alt="Justificante de ${esc(r.nombre)}">`) : `<button type="button" class="btn b-ghost b-sm" data-rv-doc>Ver el justificante</button>`}</div>` : ""}
    <div class="rv-acts">
      ${["iniciada", "pendiente"].includes(r.estado) ? `<button type="button" class="btn b-acc b-sm" data-rv-acc="confirmar">✓ He visto el dinero: confirmar</button>` : ""}
      ${r.estado === "confirmada" ? `<button type="button" class="btn b-ghost b-sm" data-rv-acc="alargar">Alargar 48 h</button><button type="button" class="btn b-brand b-sm" data-rv-acc="vendida">Lo ha comprado</button>` : ""}
      ${["pendiente", "confirmada"].includes(r.estado) ? `<a class="btn b-wa b-sm" target="_blank" rel="noopener" href="${rvWa(r.telefono, rvMsgConfirmacion(r))}">WhatsApp: confirmación</a>` : `<a class="btn b-wa b-sm" target="_blank" rel="noopener" href="${rvWa(r.telefono, `Hola ${r.nombre.split(" ")[0]}, te escribimos de Volcano Cars por tu reserva ${r.codigo} del ${r.coche.titulo}. `)}">WhatsApp</a>`}
      ${["iniciada", "pendiente", "confirmada"].includes(r.estado) ? `<button type="button" class="btn b-ghost b-sm b-bad" data-rv-acc="liberar">Liberar</button>` : ""}
      ${r.reembolso === "pendiente" ? `<button type="button" class="btn b-ghost b-sm" data-rv-acc="reembolso">Ya le he devuelto los 50 €</button>` : ""}
      <a class="btn b-ghost b-sm" href="/r/${esc(r.token)}" target="_blank" rel="noopener">Lo que ve el cliente</a>
    </div>
  </article>`;
}
function rvEspera() {
  const coches = Object.fromEntries((RV.coches || []).map((c) => [c.id, c]));
  const ids = Object.keys(RV.espera || {}).filter((id) => coches[id] && coches[id].estado !== "vendido");
  if (!ids.length) return "";
  return `<div class="rv-sec"><h3>Listas de espera</h3>${ids.map((id) => {
    const c = coches[id], libre = c.estado === "disponible";
    return `<div class="rv-esp ${libre ? "libre" : ""}"><div class="rv-top"><b>${esc(c.titulo)} ${esc(c.anio)}</b><span class="pill ${libre ? "rv-ok" : "rv-warn"}">${libre ? "Disponible: ¡avísales!" : "Reservado: esperando"}</span></div>
      <ul>${RV.espera[id].map((e, i) => `<li><span><b>${i + 1}. ${esc(e.nombre)}</b> · ${esc(e.telefono)}${e.idioma === "en" ? " · EN" : ""}${e.avisado ? ` · <span class="rv-okt">avisado ${esc(rvCuando(e.avisado))}</span>` : ""}</span>
        <span class="rv-esp-acts">${libre ? `<a class="btn b-wa b-sm" target="_blank" rel="noopener" data-rv-avisar="${esc(id)}|${esc(e.id)}" href="${rvWa(e.telefono, rvMsgDisponible(e, c.titulo, id))}">Avisar por WhatsApp</a>` : ""}<button type="button" class="btn b-ghost b-sm" data-rv-quitar="${esc(id)}|${esc(e.id)}" aria-label="Quitar a ${esc(e.nombre)} de la lista">Quitar</button></span></li>`).join("")}</ul></div>`;
  }).join("")}</div>`;
}
function rvConfig() {
  const c = RV.config || {}, p = RV.publica || {};
  const estado = !c.activa ? "Desactivada: la web no enseña el botón de reserva"
    : p.activa ? `Activa · ${[RV.stripe && "tarjeta y Google Pay", p.transferencia && "transferencia", p.bizum && "Bizum"].filter(Boolean).join(", ")}`
    : "Falta poner cómo cobrar (IBAN, Bizum o Stripe): la web todavía no enseña el botón";
  return `<details class="fin-cfg rv-cfg" id="rv-cfg" ${p.activa ? "" : "open"}>
    <summary><span><b>Cómo te pagan la reserva</b><small>${esc(estado)}</small></span><span class="fin-ab">Cambiar</span></summary>
    <form id="rv-f" class="fin-grid">
      <label class="fin-sw"><input type="checkbox" id="rv-activa" ${c.activa !== false ? "checked" : ""}> <span>Enseñar «Reservar por 50 € (reembolsables)» en los coches disponibles</span></label>
      <div class="g2"><div class="field"><label for="rv-iban">IBAN de la cuenta</label><input class="in num" id="rv-iban" value="${esc(c.iban ? c.iban.replace(/(.{4})/g, "$1 ").trim() : "")}" placeholder="ES00 0000 0000 0000 0000 0000" autocomplete="off"></div>
        <div class="field"><label for="rv-tit">Titular (como sale en el banco)</label><input class="in" id="rv-tit" value="${esc(c.titular || "")}" maxlength="70"></div></div>
      <div class="g2"><div class="field"><label for="rv-banco">Banco (opcional)</label><input class="in" id="rv-banco" value="${esc(c.banco || "")}" maxlength="40"></div>
        <div class="field"><label for="rv-bizum">Móvil para Bizum (opcional)</label><input class="in num" id="rv-bizum" value="${esc(c.bizum || "")}" inputmode="tel" placeholder="6XX XXX XXX"></div></div>
      <p class="hint" style="margin:0"><b>Tarjeta, Google Pay y Apple Pay:</b> ${RV.stripe ? "conectado con Stripe ✓. El dinero llega a tu cuenta de Stripe y las devoluciones se hacen desde stripe.com → Pagos." : "sin conectar. Crea una cuenta gratis en stripe.com, copia la «clave secreta» y pégala en Netlify como variable <b>STRIPE_SECRET_KEY</b> (la guía lo explica paso a paso)."}</p>
      <p class="hint" style="margin:0">Con transferencia o Bizum el coche sale como RESERVADO en cuanto el cliente sube el justificante. Te llega un aviso: comprueba el dinero y pulsa «Confirmar». Si no lo confirmas en 12 h, vuelve a estar disponible solo.</p>
      <div><button class="btn b-brand" type="submit">Guardar</button></div>
    </form></details>`;
}
function rvPintar() {
  const box = $("#rv-box"); if (!box || !RV) return;
  // activas + las liberadas con los 50 € aún por devolver (para que no se olvide)
  const activas = RV.reservas.filter((r) => ["iniciada", "pendiente", "confirmada"].includes(r.estado) || r.reembolso === "pendiente");
  const cerradas = RV.reservas.filter((r) => !activas.includes(r)).slice(0, 15);
  const abierto = $("#rv-cfg") && $("#rv-cfg").open;
  box.hidden = false;
  box.innerHTML = `<div class="rv-head"><div><h2 id="rv-h">Reservas online</h2><p class="hint" style="margin:2px 0 0">Clientes que han pagado 50 € para apartar un coche. ${activas.length ? "" : "Ahora mismo no hay ninguna activa."}</p></div>
      <button type="button" class="btn b-ghost b-sm" data-rv-recargar>Actualizar</button></div>
    ${activas.length ? `<div class="rv-list">${activas.map(rvTarjeta).join("")}</div>` : ""}
    ${rvEspera()}
    ${cerradas.length ? `<details class="rv-hist"><summary>Reservas cerradas (${cerradas.length})</summary><div class="rv-list">${cerradas.map(rvTarjeta).join("")}</div></details>` : ""}
    ${rvConfig()}`;
  if (abierto && $("#rv-cfg")) $("#rv-cfg").open = true;
}
async function rvAccion(token, accion, extra = {}) {
  const r = RV.reservas.find((x) => x.token === token); if (!r) return;
  const txt = { confirmar: `¿Has visto los 50 € de ${r.nombre} en la cuenta? La reserva queda confirmada 48 h.`, liberar: `¿Liberar la reserva de ${r.nombre}? El coche vuelve a estar disponible en la web.${r.pagado || r.justificante ? " Acuérdate de devolverle los 50 €." : ""}`, vendida: `¿${r.nombre} ha comprado el ${r.coche.titulo}? Se marca como vendido y los 50 € van a cuenta.` }[accion];
  if (txt && !confirm(txt)) return;
  try {
    const j = await api("/api/reservas/" + token, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion, ...extra }) });
    toast({ confirmar: "Reserva confirmada", alargar: "Reserva alargada 48 h", liberar: "Reserva liberada: el coche vuelve a estar disponible", vendida: "Marcado como vendido", reembolso: "Apuntado: devolución hecha" }[accion] || "Hecho");
    await rvCargar(true);
    if (typeof loadList === "function" && ["confirmar", "liberar", "vendida"].includes(accion)) { try { CARS = await api("/api/coches?todos=1"); renderList(); } catch (_) {} }
    if (accion === "liberar" && j.espera && j.espera.length) { toast(`${j.espera.length} persona${j.espera.length > 1 ? "s" : ""} en la lista de espera: avísalas abajo`); const e = $("#rv-box .rv-esp.libre"); if (e) e.scrollIntoView({ behavior: "smooth", block: "center" }); }
    if (accion === "vendida" && typeof fnVenta === "function") { FN_CARS = null; fnVenta(r.coche.id); }
  } catch (err) { toast(err.message); }
}
async function rvVerDoc(token) {
  try {
    const res = await fetch(`/api/reservas/${token}/justificante`, { headers: { authorization: "Bearer " + PW } });
    if (!res.ok) throw new Error("No se ha podido abrir el justificante.");
    const b = await res.blob();
    rvDoc[token] = { url: URL.createObjectURL(b), pdf: b.type === "application/pdf" };
    rvPintar();
  } catch (err) { toast(err.message); }
}
document.addEventListener("click", async (e) => {
  const box = e.target.closest("#rv-box");
  if (e.target.closest("[data-ir-reservas]")) { e.preventDefault(); cerrarDrawer(); abrirTab("coches"); setTimeout(() => { const b = $("#rv-box"); if (b) b.scrollIntoView({ behavior: "smooth" }); }, 300); return; }
  if (!box) return;
  const it = e.target.closest("[data-rv]"), tok = it && it.dataset.rv;
  if (e.target.closest("[data-rv-recargar]")) return rvCargar(true);
  if (e.target.closest("[data-rv-doc]") && tok) return rvVerDoc(tok);
  const a = e.target.closest("[data-rv-acc]");
  if (a && tok) return rvAccion(tok, a.dataset.rvAcc, a.dataset.rvAcc === "reembolso" ? { hecho: true } : a.dataset.rvAcc === "alargar" ? { horas: 48 } : {});
  const av = e.target.closest("[data-rv-avisar]");
  if (av) { const [id, pid] = av.dataset.rvAvisar.split("|"); api(`/api/reservas/espera/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: pid }) }).then(() => rvCargar(true)).catch(() => {}); return; }
  const q = e.target.closest("[data-rv-quitar]");
  if (q) { const [id, pid] = q.dataset.rvQuitar.split("|"); if (!confirm("¿Quitar a esta persona de la lista de espera?")) return; try { await api(`/api/reservas/espera/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: pid, accion: "borrar" }) }); rvCargar(true); } catch (err) { toast(err.message); } }
});
document.addEventListener("submit", async (e) => {
  if (e.target.id !== "rv-f") return;
  e.preventDefault();
  try {
    await api("/api/reservas/config", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ activa: $("#rv-activa").checked, iban: $("#rv-iban").value, titular: $("#rv-tit").value, banco: $("#rv-banco").value, bizum: $("#rv-bizum").value }) });
    toast("Guardado: la web ya usa estos datos"); $("#rv-cfg").open = false; await rvCargar(true);
  } catch (err) { toast(err.message); }
});
// Fotos del daño dentro del cliente del CRM (son privadas: se piden con la sesión del panel)
const rvFotos = {};
async function rvPintarFotos() {
  for (const el of document.querySelectorAll("#dw-body [data-fotos]:not([data-hecho])")) {
    el.dataset.hecho = "1";
    const keys = el.dataset.fotos.split(",").filter(Boolean);
    el.innerHTML = keys.map((k) => `<a class="dw-foto" data-k="${esc(k)}" target="_blank" rel="noopener"><span>Cargando…</span></a>`).join("");
    for (const k of keys) {
      try {
        if (!rvFotos[k]) { const r = await fetch("/api/fotos-cliente/" + encodeURIComponent(k), { headers: { authorization: "Bearer " + PW } }); if (!r.ok) throw 0; rvFotos[k] = URL.createObjectURL(await r.blob()); }
        const a = el.querySelector(`[data-k="${CSS.escape(k)}"]`); if (a) { a.href = rvFotos[k]; a.innerHTML = `<img src="${rvFotos[k]}" alt="Foto del daño">`; }
      } catch (_) { const a = el.querySelector(`[data-k="${CSS.escape(k)}"]`); if (a) a.innerHTML = "<span>No disponible</span>"; }
    }
  }
}
if ($("#dw-body")) new MutationObserver(rvPintarFotos).observe($("#dw-body"), { childList: true, subtree: true });
// Cargar al abrir «Coches» y cada minuto (para el contador de la pestaña)
const rvShow0 = show;
show = function (id) { rvShow0(id); if (id === "s-list") rvCargar(); };
setInterval(() => { if (PW && !document.hidden && !(ME && ME.equipo)) rvCargar(); }, 60000);
