/* =====================================================================
   PANEL · DEVOLUCIONES A PROVEEDOR (actualización 75) — dentro de Compras
   Antes «Cascos y abonos» (FORM-07) estaba en Documentación. Ahora vive en Compras → Devoluciones, con seguimiento:
   pieza devuelta → entregada al proveedor (fecha y albarán) → abono esperado → el gerente CONFIRMA el abono recibido
   (efectivo: entra en la caja abierta · transferencia: entra en Finanzas como banco). Los datos son los mismos del FORM-07
   (almacén «sistemas», clave física FORM-05): no se pierde nada de lo ya apuntado.
   ===================================================================== */
(function () {
  "use strict";
  if (!window.PE || !window.ERP) return;
  const PE = window.PE, E = window.ERP, { cent, fechaES, difDias } = E;
  const { q, H, kpi, kpis, chip, euros, campoEur, dlgE, err, post, recargar, soyGerente, hoy, invalidar, compras } = PE;
  const FORM = "FORM-07", TIPOS = [["C", "Casco (pieza vieja)"], ["E", "Error / sobrante"], ["D", "Defectuosa"]];
  let LISTA = [], PROVS = [];
  const num = (v) => { const c = cent(v); return Number.isFinite(c) ? c : 0; };
  const estado = (r) => { const d = r.datos || {}; return r.cerrado || d.ingresoId ? "abonada" : d.entregado ? "entregada" : "pendiente"; };
  const chipEst = (r) => { const e = estado(r), d = r.datos || {}, dd = d.fecha ? difDias(hoy(), d.fecha) : 0; return e === "abonada" ? chip("Abonada", "c-verde") : e === "entregada" ? chip("Entregada · falta el abono", "c-ambar") : chip(dd > 7 ? `Sin entregar · ${dd} días` : "Pendiente de entregar", dd > 7 ? "c-magma" : "c-ambar"); };
  const put = (id, datos, cerrar) => api("/api/sistemas", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ form: FORM, id, datos, cerrar: !!cerrar }) });

  async function cargar() {
    const [r, C] = await Promise.all([api("/api/sistemas?form=" + FORM), compras(false).catch(() => null)]);
    LISTA = r.registros || []; PROVS = C ? (C.proveedores || []).filter((p) => p.activo !== false).map((p) => p.nombre) : [];
  }
  async function html() {
    await cargar();
    const ab = LISTA.filter((r) => estado(r) !== "abonada"), sinEntregar = LISTA.filter((r) => estado(r) === "pendiente"), esperando = LISTA.filter((r) => estado(r) === "entregada");
    const debe = ab.reduce((a, r) => a + num(r.datos.esperado), 0), mes = hoy().slice(0, 7);
    const abonado = LISTA.filter((r) => estado(r) === "abonada" && String(r.datos.abonoFecha || "").slice(0, 7) === mes).reduce((a, r) => a + num(r.datos.cobrado), 0);
    const cols = [{ t: "Pieza", h: (r) => `<b>${H(r.datos.pieza || "—")}</b><br><small>${H(r.datos.proveedor || "sin proveedor")}${r.datos.orden ? " · orden " + H(r.datos.orden) : ""}</small>` },
      { t: "Devuelta", h: (r) => fechaES(r.datos.fecha) || "—" },
      { t: "Entregada al proveedor", h: (r) => (r.datos.entregado ? fechaES(r.datos.entregado) + (r.datos.albaran ? "<br><small>albarán " + H(r.datos.albaran) + "</small>" : "") : "—") },
      { t: "Abono esperado", n: 1, h: (r) => (num(r.datos.esperado) ? euros(num(r.datos.esperado)) : "—") },
      { t: "Abono recibido", n: 1, h: (r) => (estado(r) === "abonada" ? `<b class="pe-bien">${euros(num(r.datos.cobrado))}</b><br><small>${r.datos.abonoMetodo === "efectivo" ? "en efectivo (caja)" : "por transferencia"}${r.datos.nabono ? " · abono " + H(r.datos.nabono) : ""}</small>` : "—") },
      { t: "Estado", h: chipEst }, { t: "", h: (r) => `<button type="button" class="btn b-ghost b-sm" data-dev="ver" data-id="${H(r.id)}">Seguimiento</button>` }];
    const filas = [...LISTA].sort((a, b) => (estado(a) === "abonada") - (estado(b) === "abonada") || String(b.datos.fecha || "").localeCompare(String(a.datos.fecha || "")));
    return `<p class="hint">Piezas que se devuelven al proveedor (cascos, errores, defectuosas). Apunta cuándo se las entregas y cuánto esperas que te abonen; cuando te paguen, el gerente confirma el abono y el dinero entra en la caja (efectivo) o en Finanzas (transferencia).</p>`
      + kpis([kpi("Por entregar", String(sinEntregar.length), "Todavía en el taller", sinEntregar.length ? "neg" : ""), kpi("Entregadas, esperando abono", String(esperando.length), "Aún no han pagado"), kpi("Nos deben", euros(debe), "Abonos esperados"), kpi("Abonado este mes", euros(abonado), "Ya cobrado")])
      + `<div class="card pe-card" style="margin-top:10px">${(() => { const t = PE.tabla(cols, filas, { vacio: "Todavía no hay devoluciones. Pulsa «+ Nueva devolución»." }); return t; })()}</div>`;
  }

  function formNueva() {
    dlgE(`<form novalidate><h2>Nueva devolución a proveedor</h2><p class="hint">Apunta la pieza que vas a devolver. Después, desde «Seguimiento», marcas cuándo la entregas y cuándo te pagan el abono.</p>
      <div class="t-g2"><div class="field"><label for="dv-f">Fecha</label><input class="in" type="date" id="dv-f" value="${hoy()}"></div><div class="field"><label for="dv-o">Nº de orden (si es de un coche)</label><input class="in" id="dv-o" maxlength="30" placeholder="VC-2026-0001"></div></div>
      <div class="field"><label for="dv-p">Pieza y referencia *</label><input class="in" id="dv-p" maxlength="120"></div>
      <div class="t-g2"><div class="field"><label for="dv-pr">Proveedor *</label><input class="in" id="dv-pr" maxlength="80" list="dv-provs"><datalist id="dv-provs">${PROVS.map((p) => `<option value="${H(p)}">`).join("")}</datalist></div>
      <div class="field"><label for="dv-t">Motivo</label><select class="in" id="dv-t">${TIPOS.map(([k, t]) => `<option value="${k}">${H(t)}</option>`).join("")}</select></div></div>
      <div class="field"><label for="dv-e">Abono esperado (€) — lo que te costó la pieza</label><input class="in num" id="dv-e" inputmode="decimal" placeholder="5,00"></div>
      <div class="field"><label for="dv-n">Notas</label><input class="in" id="dv-n" maxlength="300"></div><div class="msg bad" hidden></div>
      <div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cancelar</button><button class="btn b-acc" type="submit">Guardar devolución</button></div></form>`, (d) => {
      q("form", d).onsubmit = async (ev) => {
        ev.preventDefault(); const pz = q("#dv-p", d).value.trim(), pr = q("#dv-pr", d).value.trim(); if (!pz || !pr) return err(d, "Escribe la pieza y el proveedor.");
        try { await post("/api/sistemas", { form: FORM, datos: { fecha: q("#dv-f", d).value, orden: q("#dv-o", d).value.trim(), pieza: pz, proveedor: pr, tipo: q("#dv-t", d).value, esperado: num(q("#dv-e", d).value) ? (num(q("#dv-e", d).value) / 100).toFixed(2) : "", nota: q("#dv-n", d).value.trim() } }); d.close(); toast("Devolución apuntada"); recargar(); }
        catch (z) { err(d, z.message); }
      };
    });
  }

  function seguimiento(id) {
    const r = LISTA.find((x) => x.id === id); if (!r) return; const d = r.datos || {}, e = estado(r), ger = soyGerente();
    const cab = `<h2>${H(d.pieza || "Pieza")}</h2><p class="hint">${H(d.proveedor || "sin proveedor")}${d.orden ? " · orden " + H(d.orden) : ""} · devuelta el ${fechaES(d.fecha) || "—"} · abono esperado <b>${num(d.esperado) ? euros(num(d.esperado)) : "sin indicar"}</b></p>`;
    if (e === "abonada") {
      dlgE(`${cab}<div class="msg">✓ <b>Abonada.</b> Recibido ${euros(num(d.cobrado))} ${d.abonoMetodo === "efectivo" ? "en efectivo (entró en la caja)" : "por transferencia (entró en Finanzas)"} el ${fechaES(d.abonoFecha) || "—"}${d.nabono ? " · nº de abono " + H(d.nabono) : ""}.</div>
        ${num(d.esperado) && num(d.cobrado) !== num(d.esperado) ? `<p class="hint">Esperabas ${euros(num(d.esperado))} y te abonaron ${euros(num(d.cobrado))} (diferencia ${euros(num(d.cobrado) - num(d.esperado))}).</p>` : ""}
        <div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cerrar</button></div>`); return;
    }
    dlgE(`${cab}
      <h3 class="pe-h3">1 · Entrega al proveedor</h3>
      <div class="t-g2"><div class="field"><label for="sg-ent">Fecha en que se la entregas</label><input class="in" type="date" id="sg-ent" value="${H(d.entregado || "")}"></div><div class="field"><label for="sg-alb">Nº de albarán de devolución</label><input class="in" id="sg-alb" maxlength="40" value="${H(d.albaran || "")}"></div></div>
      <div class="field"><label for="sg-esp">Abono esperado (€)</label><input class="in num" id="sg-esp" inputmode="decimal" value="${H(num(d.esperado) ? campoEur(num(d.esperado)) : "")}"></div>
      <div class="field"><label for="sg-not">Notas o reclamación</label><input class="in" id="sg-not" maxlength="300" value="${H(d.nota || "")}"></div>
      <div class="t-dlg-acts"><button class="btn b-acc" type="button" id="sg-g">Guardar entrega</button></div>
      <h3 class="pe-h3">2 · Abono recibido</h3>
      ${!d.entregado ? '<p class="hint">Primero apunta la fecha de entrega al proveedor.</p>' : ger ? `
      <div class="t-g2"><div class="field"><label for="sg-imp">Importe abonado (€) *</label><input class="in num" id="sg-imp" inputmode="decimal" value="${H(num(d.esperado) ? campoEur(num(d.esperado)) : "")}"></div><div class="field"><label for="sg-fa">Fecha</label><input class="in" type="date" id="sg-fa" value="${hoy()}" max="${hoy()}"></div></div>
      <div class="field"><label>¿Cómo te lo han abonado? *</label><div class="segv" id="sg-met" role="group"><button type="button" data-v="efectivo" aria-pressed="false">Efectivo (entra en la caja)</button><button type="button" data-v="transferencia" aria-pressed="false">Transferencia (entra en el banco)</button></div></div>
      <div class="field"><label for="sg-na">Nº de abono / abono del proveedor</label><input class="in" id="sg-na" maxlength="40" value="${H(d.nabono || "")}"></div>
      <div class="msg bad" hidden></div><div class="t-dlg-acts"><button class="btn b-acc" type="button" id="sg-ab">Confirmar abono recibido</button></div>`
      : '<p class="hint">Cuando el proveedor pague, el gerente confirma aquí si fue en efectivo o por transferencia.</p><div class="msg bad" hidden></div>'}
      <div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cerrar</button></div>`, (dl) => {
      let met = ""; const base = () => ({ ...d, entregado: q("#sg-ent", dl).value, albaran: q("#sg-alb", dl).value.trim(), nota: q("#sg-not", dl).value.trim(), esperado: num(q("#sg-esp", dl).value) ? (num(q("#sg-esp", dl).value) / 100).toFixed(2) : "" });
      q("#sg-g", dl).onclick = async () => { try { await put(id, base()); dl.close(); toast("Entrega guardada"); recargar(); } catch (z) { err(dl, z.message); } };
      const seg = q("#sg-met", dl); if (seg) seg.onclick = (ev) => { const b = ev.target.closest("[data-v]"); if (!b) return; met = b.dataset.v; seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b))); };
      const ab = q("#sg-ab", dl); if (ab) ab.onclick = async () => {
        const imp = num(q("#sg-imp", dl).value); if (!(imp > 0)) return err(dl, "Escribe el importe que te han abonado."); if (!met) return err(dl, "Elige si te lo abonaron en efectivo o por transferencia.");
        ab.disabled = true;
        try {
          if (d.ingresoId) throw new Error("Este abono ya estaba confirmado.");
          if (met === "efectivo") { const c = await api("/api/caja/estado"); if (!c.abierta) throw new Error("La caja está cerrada. Ábrela en Control de Caja para que el efectivo entre en ella, o elige transferencia."); }
          const fecha = met === "efectivo" ? hoy() : q("#sg-fa", dl).value || hoy(), nab = q("#sg-na", dl).value.trim();
          const r = await post("/api/finanzas/ingreso", { fecha, concepto: `Abono de proveedor · ${d.proveedor || ""} · ${d.pieza || ""}`.slice(0, 280), cliente: d.proveedor || "", factura: nab, area: "general", base: (imp / 100).toFixed(2), impuestoPct: "0", metodo: met });
          const iid = (r.ingreso && r.ingreso.id) || "ok";
          try { await put(id, { ...base(), cobrado: (imp / 100).toFixed(2), nabono: nab, abonoMetodo: met, abonoFecha: fecha, ingresoId: iid }, true); }
          catch (z) { throw new Error("El dinero SÍ se apuntó en " + (met === "efectivo" ? "la caja" : "Finanzas") + ", pero no pude cerrar la devolución: " + z.message + " No lo repitas: avisa al gerente."); }
          invalidar(); dl.close(); toast(`Abono de ${eur2(imp)} confirmado` + (met === "efectivo" ? " y sumado a la caja" : " en Finanzas (transferencia)")); recargar();
        } catch (z) { err(dl, z.message); ab.disabled = false; }
      };
    });
  }
  const eur2 = (c) => E.eur(c);
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-dev]"); if (!b) return; e.stopPropagation();
    if (b.dataset.dev === "nueva") formNueva(); else if (b.dataset.dev === "ver") seguimiento(b.dataset.id);
  }, true);
  window.PE_DEV = { html, ir() { window.__peSub = "dev"; if (typeof abrirTab === "function") abrirTab("compras"); } };
})();
