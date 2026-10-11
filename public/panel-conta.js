/* =====================================================================
   PANEL · CONTABILIDAD (actualización 70) · pestaña nueva DENTRO del panel, solo gerente
   Los asientos AUTOMÁTICOS salen de lo que ya hay en Finanzas (facturas, cobros, gastos, facturas de proveedor y coste de los coches
   vendidos); los MANUALES (apertura, nóminas, préstamos, amortizaciones…) los apunta el gerente. Cada asiento cuadra (Debe = Haber).
   Es una ayuda para el gestor: el plan de cuentas es el abreviado de pymes y las reglas de contabilización están en la pestaña «Reglas».
   ===================================================================== */
(function () {
  "use strict";
  if (!window.PE || !window.ERP || typeof TABS === "undefined") return;
  const PE = window.PE, E = window.ERP, { cent, eur, fechaES, addDias } = E;
  const { q, qa, H, kpi, kpis, chip, euros, campoEur, vacio, seg, tabla, cabecera, dlgE, err, post, cargar, invalidar, resumen, compras, hoy, recargar, registrar, vigente, sec, descargarCSV } = PE;
  const visible = () => { const s = sec("conta"); return !!s && !s.hidden; };
  const CO = { anio: Number(hoy().slice(0, 4)), per: "A", sub: "diario", cuenta: "430", q: "" };
  const SUBS = [["diario", "Diario"], ["mayor", "Mayor"], ["sumas", "Sumas y saldos"], ["pyg", "Pérdidas y ganancias"], ["balance", "Balance"], ["manual", "Asientos manuales"], ["reglas", "Reglas"]];
  const nombreCta = (c) => `${c} · ${E.PLAN[c] || ""}`;
  const ORIGEN = { venta: "Venta", cobro: "Cobro", gasto: "Gasto", proveedor: "Factura proveedor", "coste-vehiculo": "Coste coche", apertura: "Apertura", manual: "Manual", regularizacion: "Regularización" };

  function rango() {
    const d = hoy(), y = CO.anio, r = CO.per === "A" ? { desde: y + "-01-01", hasta: y + "-12-31" } : E.rangoTrimestre(y, Number(CO.per[1]));
    return { desde: r.desde, hasta: r.hasta > d ? d : r.hasta, completoHasta: r.hasta };
  }
  async function datos(hasta) {
    const [R, C, M] = await Promise.all([resumen("2015-01-01", hasta), compras(), api("/api/erp/conta-asientos")]);
    const pend = C.facturas.filter((f) => f.estado === "pendiente").map((f) => ({ id: f.id, fecha: f.fecha, num: f.num, proveedor: (C.proveedores.find((p) => p.id === f.proveedor) || {}).nombre || "", categoria: f.categoria, total: f.total, igic: f.igic }));
    const auto = E.asientosAuto({ emitidas: R.emitidas, cobros: R.cobros, recibidas: R.recibidas, pendProv: pend, coches: R.coches, hasta });
    return { L: E.libroDiario(auto, M.asientos), manuales: M.asientos, R };
  }
  const D_CO = (hasta, f) => cargar("conta:" + hasta, () => datos(hasta), f);

  async function pintarConta(mi) {
    PE.setActual("conta"); const s = sec("conta"), r = rango(), D = await D_CO(r.hasta); if (!vigente(mi)) return;
    const L = D.L, Lp = E.entre(L, r.desde, r.hasta), py = E.pyg(Lp), anios = [0, 1, 2].map((i) => Number(hoy().slice(0, 4)) - i);
    const barra = `<div class="pe-barra">${seg("coper", [["T1", "1.er trim."], ["T2", "2.º"], ["T3", "3.º"], ["T4", "4.º"], ["A", "Año"]], CO.per)}<select class="in pe-sel" id="co-anio" aria-label="Año">${anios.map((a) => `<option ${a === CO.anio ? "selected" : ""}>${a}</option>`).join("")}</select><small>${fechaES(r.desde)} – ${fechaES(r.hasta)}</small></div>`;
    const ss = E.sumasSaldos(L), desc = !ss.cuadra ? '<div class="msg bad">¡Atención! Las sumas y saldos no cuadran. No debería pasar: avisa para revisarlo.</div>' : "";
    let cuerpo = "";
    if (CO.sub === "diario") cuerpo = vistaDiario(Lp);
    else if (CO.sub === "mayor") cuerpo = vistaMayor(Lp);
    else if (CO.sub === "sumas") cuerpo = vistaSumas(Lp, r);
    else if (CO.sub === "pyg") cuerpo = vistaPyg(py, Lp);
    else if (CO.sub === "balance") cuerpo = vistaBalance(E.entre(L, "2000-01-01", r.hasta), r);
    else if (CO.sub === "manual") cuerpo = vistaManual(D.manuales);
    else cuerpo = vistaReglas();
    s.innerHTML = cabecera("Contabilidad", "Libro diario, mayor, sumas y saldos, pérdidas y ganancias y balance, generados desde Finanzas y tus asientos manuales. <b>Ayuda para el gestor</b>: él valida el plan de cuentas y presenta los impuestos.", '<button class="btn b-acc b-sm" type="button" data-co="nuevo">+ Asiento manual</button>')
      + desc + barra
      + kpis([kpi("Resultado del periodo", euros(py.resultado), "Ingresos − gastos contables", py.resultado < 0 ? "neg" : "hero"), kpi("Ingresos", euros(py.ingresos)), kpi("Gastos", euros(py.gastos)), kpi("Asientos del periodo", String(Lp.length), `${Lp.filter((a) => a.manual).length} manual(es)`)])
      + `<div class="pe-barra">${seg("cosub", SUBS, CO.sub)}</div>` + cuerpo;
    PE._co = { L, Lp, r, D };
  }

  /* ---------------- vistas ---------------- */
  function vistaDiario(Lp) {
    const t = CO.q.toLowerCase(), l = Lp.filter((a) => !t || (a.concepto + " " + a.num + " " + a.lineas.map((x) => x.cuenta + " " + (E.PLAN[x.cuenta] || "")).join(" ")).toLowerCase().includes(t));
    const asientos = l.slice(-300).reverse().map((a) => `<div class="pe-lin"><div class="pe-th"><div><b>${H(a.num)}</b> · ${fechaES(a.fecha)} ${chip(ORIGEN[a.origen] || a.origen, a.manual ? "c-ambar" : "c-gris")}</div><b class="num">${euros(a.total)}</b></div><small>${H(a.concepto)}</small>
      ${tabla([{ t: "Cuenta", h: (x) => H(nombreCta(x.cuenta)) }, { t: "Debe", n: 1, h: (x) => (x.debe ? euros(x.debe) : "") }, { t: "Haber", n: 1, h: (x) => (x.haber ? euros(x.haber) : "") }], a.lineas)}</div>`).join("");
    return `<div class="pe-barra"><input class="in pe-buscar" id="co-q" type="search" placeholder="Buscar por concepto, nº de asiento o cuenta…" value="${H(CO.q)}" aria-label="Buscar en el diario"><button class="btn b-ghost b-sm" type="button" data-co="csv-diario">Descargar el diario</button></div>`
      + `<div id="co-lista">${asientos || vacio(l.length ? "" : "Sin asientos en este periodo.")}${l.length > 300 ? '<p class="hint">Se muestran los 300 últimos. Descarga el diario para verlos todos.</p>' : ""}</div>`;
  }
  function vistaMayor(Lp) {
    const cuentas = [...new Set(Lp.flatMap((a) => a.lineas.map((x) => x.cuenta)))].sort(); if (!cuentas.includes(CO.cuenta) && cuentas.length) CO.cuenta = cuentas[0];
    const m = E.mayor(Lp, CO.cuenta);
    return `<div class="pe-barra"><select class="in pe-sel" id="co-cta" style="min-width:260px" aria-label="Cuenta">${cuentas.map((c) => `<option value="${c}" ${c === CO.cuenta ? "selected" : ""}>${H(nombreCta(c))}</option>`).join("")}</select></div>`
      + (cuentas.length ? `<div class="card pe-card"><h3 class="pe-h3">${H(nombreCta(m.cuenta))}</h3>${tabla([{ t: "Fecha", h: (x) => fechaES(x.fecha) }, { t: "Asiento", k: "num" }, { t: "Concepto", k: "concepto" }, { t: "Debe", n: 1, h: (x) => (x.debe ? euros(x.debe) : "") }, { t: "Haber", n: 1, h: (x) => (x.haber ? euros(x.haber) : "") }, { t: "Saldo", n: 1, h: (x) => `<b>${euros(x.saldo)}</b>` }], m.movimientos.slice(-300))}<p class="pe-tot">Totales: Debe <b class="num">${euros(m.debe)}</b> · Haber <b class="num">${euros(m.haber)}</b> · Saldo <b class="num">${euros(m.saldo)}</b></p></div>` : vacio("Sin movimientos en este periodo."));
  }
  function vistaSumas(Lp, r) {
    const s = E.sumasSaldos(Lp);
    return `<div class="card pe-card"><div class="pe-th"><h3 class="pe-h3">Balance de sumas y saldos</h3><button class="btn b-ghost b-sm" type="button" data-co="csv-sumas">Descargar</button></div>${tabla([{ t: "Cuenta", k: "cuenta" }, { t: "Nombre", k: "nombre" }, { t: "Debe", n: 1, h: (x) => euros(x.debe) }, { t: "Haber", n: 1, h: (x) => euros(x.haber) }, { t: "Saldo deudor", n: 1, h: (x) => (x.deudor ? euros(x.deudor) : "") }, { t: "Saldo acreedor", n: 1, h: (x) => (x.acreedor ? euros(x.acreedor) : "") }], s.filas, { vacio: "Sin movimientos en este periodo." })}
      <p class="pe-tot">Totales: Debe <b class="num">${euros(s.total.debe)}</b> · Haber <b class="num">${euros(s.total.haber)}</b> ${s.cuadra ? chip("Cuadra", "c-verde") : chip("No cuadra", "c-magma")}</p></div>`;
  }
  function vistaPyg(py, Lp) {
    const fila = (t, imp, neg, nivel) => `<tr class="${nivel ? "pe-sub" : ""}"><td data-l="">${H(t)}</td><td class="n num" data-l="Importe"><span class="v"><b class="${imp < 0 ? "pe-mal" : ""}">${euros(imp)}</b></span></td></tr>`;
    const lineas = py.grupos.filter((g) => g.cuentas.length).map((g) => `${fila(g.t, g.importe, false, 1)}${g.cuentas.map((c) => `<tr><td data-l="" class="pe-det"><span class="v">${H(nombreCta(c.cuenta))}</span></td><td class="n num" data-l="Importe"><span class="v">${euros(c.importe)}</span></td></tr>`).join("")}`).join("");
    return `<div class="card pe-card"><h3 class="pe-h3">Cuenta de pérdidas y ganancias</h3><div class="tabla-wrap pe-t"><table class="tabla"><tbody>${lineas || ""}${fila("A) Resultado de explotación", py.explotacion, false, 1)}${py.financieras.map((c) => `<tr><td data-l="" class="pe-det"><span class="v">${H(nombreCta(c.cuenta))}</span></td><td class="n num" data-l="Importe"><span class="v">${euros(c.importe)}</span></td></tr>`).join("")}${fila("B) Resultado financiero", py.financiero, false, 1)}${fila("RESULTADO DEL EJERCICIO (A + B)", py.resultado, false, 1)}</tbody></table></div>
      <p class="hint">Antes de impuestos sobre beneficios. El coste de compra de cada coche se reconoce el día de su venta; el reacondicionamiento y demás gastos, cuando se pagan. Si tu gestor prefiere guardar como existencias lo gastado en coches sin vender, lo ajusta con un asiento manual de regularización.</p></div>`;
  }
  function vistaBalance(Lh, r) {
    const b = E.balance(Lh), f = (a) => tabla([{ t: "Cuenta", h: (x) => H(nombreCta(x.cuenta)) }, { t: "Importe", n: 1, h: (x) => euros(x.importe) }], a, { vacio: "—" });
    return `<div class="msg pe-info">Balance a ${fechaES(r.hasta)} con todo lo apuntado desde que se usa el panel. Para que coincida con el banco y la caja reales, añade el <b>asiento de apertura</b> con los saldos del día que empezaste (pestaña «Asientos manuales»).</div>`
      + kpis([kpi("Activo", euros(b.activo)), kpi("Pasivo + patrimonio", euros(b.pasivo)), kpi("Diferencia", euros(b.descuadre), b.descuadre === 0 ? "Cuadra" : "No cuadra: avisa", b.descuadre === 0 ? "" : "neg")])
      + `<div class="fn-grid"><div class="card"><h3 class="pe-h3">Activo</h3><p class="hint">No corriente</p>${f(b.activoNoCorriente)}<p class="hint">Corriente</p>${f(b.activoCorriente)}</div><div class="card"><h3 class="pe-h3">Patrimonio neto y pasivo</h3><p class="hint">Patrimonio neto</p>${f([...b.patrimonio, { cuenta: "129", importe: b.resultado }])}<p class="hint">Pasivo no corriente</p>${f(b.pasivoNoCorriente)}<p class="hint">Pasivo corriente</p>${f(b.pasivoCorriente)}</div></div>`;
  }
  function vistaManual(M) {
    return `<div class="pe-barra"><button class="btn b-acc b-sm" type="button" data-co="nuevo">+ Asiento manual</button><button class="btn b-ghost b-sm" type="button" data-co="apertura">Asiento de apertura</button></div><div class="card pe-card">${tabla([{ t: "Nº", k: "num" }, { t: "Fecha", h: (a) => fechaES(a.fecha) }, { t: "Tipo", h: (a) => chip(ORIGEN[a.tipo] || a.tipo, "c-ambar") }, { t: "Concepto", k: "concepto" }, { t: "Importe", n: 1, h: (a) => euros(a.total) }, { t: "", h: (a) => (a.anulado ? chip("Anulado", "c-piedra") + `<br><small>${H(a.anulado.motivo)}</small>` : `<button class="btn b-ghost b-sm" type="button" data-co="anular" data-id="${H(a.id)}">Anular</button>`) }], M, { vacio: "Todavía no hay asientos manuales." })}<p class="hint">Un asiento no se borra: se anula con motivo y queda registrado. Úsalos para nóminas, préstamos, amortizaciones, el capital y los saldos de apertura.</p></div>`;
  }
  function vistaReglas() {
    const cats = Object.entries(E.CAT_CUENTA).map(([k, c]) => ({ k, cuenta: nombreCta(c) }));
    return `<div class="card pe-card"><h3 class="pe-h3">Cómo se apunta cada cosa</h3>${tabla([{ t: "Qué", k: "k" }, { t: "Debe", k: "d" }, { t: "Haber", k: "h" }], [
      { k: "Factura de taller", d: "430 Clientes (total)", h: "705 Prestaciones de servicios (base) · 477 IGIC repercutido" }, { k: "Venta de coche", d: "430 Clientes (total)", h: "700 Ventas de mercaderías (base) · 477 IGIC repercutido" },
      { k: "Cobro", d: "570 Caja (efectivo) o 572 Bancos", h: "430 Clientes" }, { k: "Gasto pagado", d: "6xx según la categoría (base) · 472 IGIC soportado", h: "570 Caja o 572 Bancos" },
      { k: "Salida de caja sin clasificar", d: "555 Partidas pendientes de aplicación", h: "570 Caja" }, { k: "Factura de proveedor sin pagar", d: "602 o 6xx (base) · 472 IGIC soportado", h: "400 Proveedores" },
      { k: "Coste de compra del coche vendido (el día de la venta)", d: "600 Compras de mercaderías", h: "572 Bancos" }])}
      <h3 class="pe-h3" style="margin-top:14px">Cuenta de gasto por categoría de Finanzas</h3>${tabla([{ t: "Categoría de Finanzas", k: "k" }, { t: "Cuenta", k: "cuenta" }], cats)}
      <p class="hint">Es la asignación habitual para un taller, pero la valida tu gestor. Los abonos (importes negativos) invierten el asiento. Los coches de ocasión con régimen especial (REBU) los trata el gestor.</p></div>`;
  }

  /* ---------------- asiento manual ---------------- */
  function formAsiento(apertura) {
    const lineas = apertura ? [{ cuenta: "572", debe: 0, haber: 0 }, { cuenta: "570", debe: 0, haber: 0 }, { cuenta: "100", debe: 0, haber: 0 }] : [{ cuenta: "", debe: 0, haber: 0 }, { cuenta: "", debe: 0, haber: 0 }];
    const opts = (sel) => `<option value="">— cuenta —</option>` + Object.keys(E.PLAN).sort().map((c) => `<option value="${c}" ${c === sel ? "selected" : ""}>${H(nombreCta(c))}</option>`).join("");
    const d = dlgE(`<form novalidate><h2>${apertura ? "Asiento de apertura" : "Nuevo asiento manual"}</h2><p class="hint">${apertura ? "Pon los saldos del día que empezaste a usar el panel: lo que había en el banco y la caja (Debe) y el capital o lo aportado por los socios (Haber). Debe cuadrar." : "Cada apunte va en el Debe o en el Haber, y el total del Debe tiene que ser igual al del Haber."}</p>
      <div class="t-g2"><div class="field"><label for="as-f">Fecha *</label><input class="in" type="date" id="as-f" max="${hoy()}" value="${apertura ? hoy().slice(0, 4) + "-01-01" : hoy()}"></div><div class="field"><label for="as-c">Concepto *</label><input class="in" id="as-c" maxlength="200" value="${apertura ? "Asiento de apertura" : ""}" placeholder="Qué se apunta (mín. 5 letras)"></div></div>
      <div id="as-l"></div><button class="btn b-ghost b-sm" type="button" id="as-add">+ Añadir apunte</button>
      <p class="pe-tot">Debe <b class="num" id="as-d"></b> · Haber <b class="num" id="as-h"></b> <span id="as-ok"></span></p><div class="msg bad" hidden></div>
      <div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cancelar</button><button class="btn b-acc" type="submit">Guardar asiento</button></div></form>`);
    const pintar = () => { q("#as-l", d).innerHTML = lineas.map((l, i) => `<div class="pe-lin"><select class="in" data-i="${i}" data-k="cuenta" aria-label="Cuenta del apunte ${i + 1}">${opts(l.cuenta)}</select><div class="pe-lin-b"><input class="in num" inputmode="decimal" data-i="${i}" data-k="debe" placeholder="Debe" aria-label="Debe del apunte ${i + 1}" value="${H(campoEur(l.debe))}"><input class="in num" inputmode="decimal" data-i="${i}" data-k="haber" placeholder="Haber" aria-label="Haber del apunte ${i + 1}" value="${H(campoEur(l.haber))}"><button class="btn b-ghost b-sm" type="button" data-x="${i}" aria-label="Quitar apunte">✕</button></div></div>`).join(""); sumar(); };
    const sumar = () => { const D = lineas.reduce((a, l) => a + (l.debe || 0), 0), Hh = lineas.reduce((a, l) => a + (l.haber || 0), 0); q("#as-d", d).textContent = eur(D); q("#as-h", d).textContent = eur(Hh); q("#as-ok", d).innerHTML = D === Hh && D > 0 ? chip("Cuadra", "c-verde") : chip("No cuadra: faltan " + eur(Math.abs(D - Hh)), "c-ambar"); };
    pintar();
    d.addEventListener("input", (e) => { const t = e.target.closest("[data-i]"); if (!t || t.dataset.k === "cuenta") return; const l = lineas[+t.dataset.i], c = cent(t.value); l[t.dataset.k] = Number.isFinite(c) && c > 0 ? c : 0; sumar(); });
    d.addEventListener("change", (e) => { const t = e.target.closest("[data-i]"); if (t && t.dataset.k === "cuenta") lineas[+t.dataset.i].cuenta = t.value; });
    d.addEventListener("click", (e) => { const x = e.target.closest("[data-x]"); if (x && lineas.length > 2) { lineas.splice(+x.dataset.x, 1); pintar(); } });
    q("#as-add", d).onclick = () => { if (lineas.length < 20) { lineas.push({ cuenta: "", debe: 0, haber: 0 }); pintar(); } };
    q("form", d).onsubmit = async (e) => { e.preventDefault(); const ls = lineas.filter((l) => l.cuenta || l.debe || l.haber).map((l) => ({ cuenta: l.cuenta, debe: l.debe, haber: l.haber }));
      try { await post("/api/erp/conta-asiento", { fecha: q("#as-f", d).value, concepto: q("#as-c", d).value, tipo: apertura ? "apertura" : "manual", lineas: ls }); d.close(); toast("Asiento guardado"); invalidar("conta"); CO.sub = "manual"; recargar(); } catch (x) { err(d, x.message); } };
  }

  /* ---------------- eventos ---------------- */
  document.addEventListener("click", async (e) => {
    if (!visible()) return; let b;
    if ((b = e.target.closest("[data-peseg=coper] button, [data-peseg=cosub] button"))) { const id = b.closest("[data-peseg]").dataset.peseg; if (id === "coper") CO.per = b.dataset.k; else CO.sub = b.dataset.k; return recargar(); }
    if (!(b = e.target.closest("[data-co]"))) return; const a = b.dataset.co, S = PE._co;
    try {
      if (a === "nuevo") return formAsiento(false); if (a === "apertura") return formAsiento(true);
      if (a === "anular") { const m = prompt("Motivo de la anulación (mínimo 5 letras):"); if (!m) return; await post("/api/erp/conta-anular/" + b.dataset.id, { motivo: m }); invalidar("conta"); toast("Asiento anulado"); return recargar(); }
      if (!S) return; const suf = `${S.r.desde}_${S.r.hasta}`;
      if (a === "csv-diario") return descargarCSV(`libro-diario_${suf}.csv`, E.aCSV(E.COLS_DIARIO, E.filasDiario(S.Lp)));
      if (a === "csv-sumas") return descargarCSV(`sumas-y-saldos_${suf}.csv`, E.aCSV(E.COLS_SUMAS, E.sumasSaldos(S.Lp).filas));
    } catch (x) { toast(x.message); }
  });
  document.addEventListener("change", (e) => { if (!visible()) return; if (e.target.id === "co-anio") { CO.anio = Number(e.target.value); recargar(); } else if (e.target.id === "co-cta") { CO.cuenta = e.target.value; recargar(); } });
  document.addEventListener("input", (e) => { if (e.target.id !== "co-q" || !visible()) return; CO.q = e.target.value; clearTimeout(CO._t); CO._t = setTimeout(() => { const S = PE._co; if (S) { const cont = q("#co-lista"); if (cont) { const tmp = document.createElement("div"); tmp.innerHTML = vistaDiario(S.Lp); const n = tmp.querySelector("#co-lista"); if (n) cont.innerHTML = n.innerHTML; } } }, 250); });

  registrar("conta", "s-conta", pintarConta, "conta");
})();
