/* =====================================================================
   PANEL · ERP 2 (actualización 70): Clientes 360, Incentivos, Margen y documentos de coche, Permisos
   Pestañas nuevas DENTRO del panel con su formato. Usa window.PE (panel-erp.js) y /erp-logic.js.
   · Clientes 360 (#s-cli)  : historial, servicios pendientes y avisos (respeta permiso y bajas; la ITV la avisa Taller)
   · Incentivos (#s-inc)    : solo de lo que sobra tras los fijos (tope duro 15 %), solo gerente
   · Margen y documentos (#s-mcar): margen real por coche, contrato, garantía y lista de traspaso
   · Permisos (#s-perm)     : qué roles usan Compras, Clientes 360 y Documentos, y desde qué importe un pedido pide visto bueno
   ===================================================================== */
(function () {
  "use strict";
  if (!window.PE || !window.ERP || typeof TABS === "undefined") return;
  const PE = window.PE, E = window.ERP, { cent, eur, fechaES, addDias, difDias } = E;
  const { q, qa, H, kpi, kpis, chip, euros, campoEur, vacio, seg, tabla, cabecera, dlgE, err, post, mesTxt, cargar, invalidar, resumen, hoy, recargar, registrar, soyGerente, vigente, sec } = PE;
  const esc = H;
  const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (_) { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (_) { } } };
  const visible = (t) => { const s = sec(t); return !!s && !s.hidden; };
  const wa = (tel, msg) => `https://wa.me/${E.waNum(tel)}?text=${encodeURIComponent(msg)}`;

  /* =====================================================================
     CLIENTES 360
     ===================================================================== */
  const CL = { sub: "clientes", q: "", filtro: "todos" };
  const estChip = (s) => ({ vencido: chip("Vencido", "c-magma"), proximo: chip("Próximo", "c-ambar"), ok: chip("Al día", "c-verde"), "sin-dato": chip("Sin dato", "c-piedra") }[s.estado]);
  const diasTxt = (s) => (s.dias == null ? "" : s.dias < 0 ? `hace ${-s.dias} día(s)` : s.dias === 0 ? "hoy" : `en ${s.dias} día(s)`);
  async function datosClientes() {
    const d = hoy(), pideRes = soyGerente();
    const [leads, ords, res, ext, cons] = await Promise.all([
      api("/api/solicitudes").then((x) => (Array.isArray(x) ? x : x.solicitudes || [])).catch(() => []),
      api("/api/ordenes").then((x) => (Array.isArray(x) ? x : x.ordenes || [])).catch(() => []),
      pideRes ? resumen("2015-01-01", d).catch(() => null) : Promise.resolve(null),
      api("/api/erp/clientes").catch(() => ({ vehiculos: {}, avisos: [] })),
      api("/api/erp/consentimientos").catch(() => ({ porMatricula: {}, bajas: {} })),
    ]);
    const fac = {}; if (res) for (const x of res.emitidas || []) if (x.tipo === "taller") fac[x.ref] = { total: x.total, cobrado: x.cobrado, num: x.num };
    const clientes = E.agruparClientes(leads, ords, fac), avisados = new Map();
    for (const a of ext.avisos || []) { const k = a.clave + "|" + a.tipo; if (!avisados.has(k) || a.dia > avisados.get(k)) avisados.set(k, a.dia); }
    const pend = [];
    for (const c of clientes) for (const v of c.vehiculos) {
      v.clave = v.matricula ? "v" + v.matricula : "c" + c.id.slice(0, 20);
      const h = c.historial.filter((x) => (x.matricula || "") === v.matricula || (!v.matricula && !x.matricula && x.coche === v.coche));
      const co = v.matricula ? cons.porMatricula[v.matricula] || null : null, datos = v.matricula ? { ...(ext.vehiculos[v.matricula] || {}) } : null;
      if (datos && !datos.itvVence && co && co.itv) datos.itvVence = co.itv; // la fecha de ITV firmada en la recepción del taller
      v.cons = co; v.servicios = E.serviciosVehiculo(h, datos, d, {});
      for (const s of v.servicios) {
        s.clave = s.tipo === "otro" ? v.clave + "-o" + s.idx : v.clave; s.avisado = avisados.get(s.clave + "|" + s.tipo) || ""; s.reciente = !!s.avisado && difDias(d, s.avisado) < 14;
        s.aviso = E.puedeAvisar(s, co, cons.bajas, c.telefono);
        if ((s.estado === "vencido" || s.estado === "proximo") && !s.reciente && s.aviso.ok) pend.push({ cliente: c, veh: v, s });
      }
    }
    pend.sort((a, b) => (a.s.dias ?? 0) - (b.s.dias ?? 0));
    return { clientes, pend, ext, hoy: d, conImportes: !!res };
  }
  const D_CLI = (f) => cargar("cli", datosClientes, f);
  function listaCli(D) {
    const t = CL.q.toLowerCase(), nAv = (c) => D.pend.filter((p) => p.cliente.id === c.id).length;
    let l = D.clientes.filter((c) => !t || (c.nombre + " " + c.telefono + " " + c.vehiculos.map((v) => v.matricula + " " + v.coche).join(" ")).toLowerCase().includes(t));
    if (CL.filtro === "avisos") l = l.filter((c) => nAv(c)); if (CL.filtro === "deuda") l = l.filter((c) => c.pendienteCobro > 0);
    const cols = [{ t: "Cliente", h: (c) => `<b>${H(c.nombre || "(sin nombre)")}</b><br><small>${H(c.telefono)}</small>` }, { t: "Coches", h: (c) => H(c.vehiculos.map((v) => v.coche || v.matricula).filter(Boolean).join(", ")) || "—" }, { t: "Visitas", n: 1, k: "visitas" }, { t: "Última", h: (c) => fechaES(c.ultima) || "—" }];
    if (D.conImportes) cols.push({ t: "Gastado", n: 1, h: (c) => euros(c.gastado) });
    cols.push({ t: "Avisos", h: (c) => (nAv(c) ? chip(nAv(c) + " pendiente(s)", "c-ambar") : c.pendienteCobro > 0 ? chip("Debe " + eur(c.pendienteCobro), "c-magma") : "") });
    return `<p class="hint">${l.length} cliente(s)</p>` + tabla(cols, l.slice(0, 300), { pick: "id", vacio: "Ningún cliente con ese filtro." }) + (l.length > 300 ? `<p class="hint">Se muestran 300. Afina la búsqueda.</p>` : "");
  }
  const itvOk = () => typeof T_ITV_OK === "function" && T_ITV_OK(), itvN = () => (typeof tItvPendientes === "function" ? tItvPendientes() : 0);
  async function pintarCli(mi) {
    PE.setActual("cli"); const s = sec("cli"), D = await D_CLI(); if (!vigente(mi)) return;
    const cab = cabecera("Clientes 360", "Todo lo que ha hecho cada cliente en el taller y lo que le toca. Junta el CRM y las órdenes del taller por teléfono o nombre.", "")
      + `<div class="pe-barra">${seg("clisub", [["clientes", "Clientes"], ["avisos", `Avisos pendientes (${D.pend.length})`], ...(itvOk() ? [["itv", `Avisos de ITV${itvN() ? " (" + itvN() + ")" : ""}`]] : [])], CL.sub)}</div>`;
    if (CL.sub === "itv" && itvOk()) { // Act. 74: los avisos de ITV viven SOLO aquí (antes estaban en Taller)
      s.innerHTML = cab + `<div id="cli-itv"></div>`; tItvPintar(q("#cli-itv")); if (!TITV || Date.now() - TITV_T > 60000) tItvCargar(); return;
    }
    if (itvOk() && !TITV) tItvCargar();
    if (CL.sub === "avisos") {
      s.innerHTML = cab + `<p class="hint">Aceite, revisión y avisos propios, vencidos o que vencen en 30 días, a los que no has avisado en 2 semanas. El WhatsApp te sale ya escrito y lo envías tú (sin envíos masivos); el mensaje trae cómo darse de baja y no se ofrece a quien la pidió. La <b>ITV</b> se avisa en la pestaña «Avisos de ITV» de esta misma pantalla, solo a quien firmó el permiso.</p><div class="card pe-card">`
        + tabla([{ t: "Cliente", h: (x) => `<b>${H(x.cliente.nombre)}</b><br><small>${H(x.veh.coche)} ${H(x.veh.matricula)}</small>` }, { t: "Servicio", h: (x) => `${H(x.s.txt)}<br>${estChip(x.s)}` }, { t: "Fecha", h: (x) => `${fechaES(x.s.vence)}<br><small>${diasTxt(x.s)}</small>` },
          { t: "", h: (x) => `<a class="btn b-acc b-sm" target="_blank" rel="noopener" data-cli="avisar" data-k="${H(x.cliente.id)}|${H(x.s.clave)}|${x.s.tipo}" href="${H(wa(x.cliente.telefono, E.mensajeAviso(x.cliente.nombre, x.veh.coche, x.veh.matricula, x.s, x.s.vence)))}">WhatsApp</a> <button class="btn b-ghost b-sm" type="button" data-cli="avisado" data-k="${H(x.cliente.id)}|${H(x.s.clave)}|${x.s.tipo}">Ya avisado</button> <button class="btn b-ghost b-sm" type="button" data-cli="ficha" data-k="${H(x.cliente.id)}">Ficha</button>` }], D.pend, { vacio: "No hay avisos pendientes. Todo al día." }) + "</div>";
      return;
    }
    s.innerHTML = cab + `<div class="pe-barra"><input class="in pe-buscar" id="cli-q" type="search" placeholder="Buscar nombre, teléfono, matrícula o coche…" value="${H(CL.q)}" aria-label="Buscar cliente">${seg("clifil", [["todos", "Todos"], ["avisos", "Con avisos"], ...(D.conImportes ? [["deuda", "Con deuda"]] : [])], CL.filtro)}</div><div class="card pe-card" id="cli-lista">${listaCli(D)}</div>`;
  }
  function fichaCliente(D, c) {
    const H0 = c.historial, imp = D.conImportes;
    const veh = c.vehiculos.map((v) => `<div class="pe-lin"><div class="pe-th"><h3 class="pe-h3">${H(v.coche || "Coche")} ${H(v.matricula)}</h3>${v.matricula ? `<button class="btn b-ghost b-sm" type="button" data-cli="datos" data-k="${H(v.matricula)}|${H(v.coche)}">Editar datos del coche</button>` : '<small>Sin matrícula: añádela en la orden para guardar ITV y fechas.</small>'}</div>
      ${tabla([{ t: "Servicio", k: "txt" }, { t: "Estado", h: (s) => estChip(s) + (s.reciente ? " " + chip("avisado " + fechaES(s.avisado), "c-gris") : "") }, { t: "Último", h: (s) => fechaES(s.ultimo) || "—" }, { t: "Toca", h: (s) => (s.vence ? `${fechaES(s.vence)}<br><small>${diasTxt(s)}</small>` : "—") }, { t: "Origen", h: (s) => `<small>${H(s.origen || "")}${s.detalle ? "<br>" + H(s.detalle) : ""}</small>` },
        { t: "", h: (s) => !(s.estado === "vencido" || s.estado === "proximo") ? "" : !s.aviso.ok ? `<small>${H(s.aviso.motivo)}</small>` : `<a class="btn b-acc b-sm" target="_blank" rel="noopener" data-cli="avisar" data-k="${H(c.id)}|${H(s.clave)}|${s.tipo}" href="${H(wa(c.telefono, E.mensajeAviso(c.nombre, v.coche, v.matricula, s, s.vence)))}">Avisar</a> <button class="btn b-ghost b-sm" type="button" data-cli="avisado" data-k="${H(c.id)}|${H(s.clave)}|${s.tipo}">Ya avisado</button>` }], v.servicios)}</div>`).join("");
    return `<h2>${H(c.nombre || "(sin nombre)")}</h2><div class="pe-barra"><span>${H(c.telefono)}</span>${c.telefono ? `<a class="btn b-ghost b-sm" href="tel:${H(E.waNum(c.telefono))}">Llamar</a><a class="btn b-ghost b-sm" target="_blank" rel="noopener" href="${H(wa(c.telefono, "Hola " + (c.nombre.split(" ")[0] || "") + ", te escribimos de Volcano Cars."))}">WhatsApp</a>` : ""}<small>${H(c.email)}</small></div>
      ${kpis([kpi("Visitas al taller", String(c.visitas), c.primera ? "Desde " + fechaES(c.primera) : ""), ...(imp ? [kpi("Ha gastado", euros(c.gastado), "Ticket medio " + euros(c.ticket)), kpi("Pendiente de cobro", euros(c.pendienteCobro), "", c.pendienteCobro > 0 ? "neg" : "")] : []), kpi("Última visita", fechaES(c.ultima) || "—", c.ultima ? "hace " + difDias(D.hoy, c.ultima) + " día(s)" : "")])}
      <h3 class="pe-h3">Coches y servicios pendientes</h3>${veh || vacio("Este cliente no tiene coche apuntado todavía.")}
      <h3 class="pe-h3">Historial del taller</h3>${tabla([{ t: "Fecha", h: (h) => fechaES(h.fecha) }, { t: "Orden", k: "num" }, { t: "Coche", h: (h) => H(h.coche) + " " + H(h.matricula) }, { t: "Trabajos", h: (h) => H(h.trabajos.join(" · ") || "—") }, ...(imp ? [{ t: "Total", n: 1, h: (h) => (h.total ? euros(h.total) : "—") }] : []), { t: "Estado", h: (h) => chip(h.estado || "—", h.estado === "entregado" ? "c-verde" : "c-piedra") + (imp && h.total > h.cobrado && h.total ? " " + chip("sin cobrar", "c-magma") : "") }], H0, { vacio: "Todavía no tiene órdenes de taller." })}
      ${c.leads.length ? `<h3 class="pe-h3">En el CRM</h3>${tabla([{ t: "Fecha", h: (l) => fechaES(String(l.creado || "").slice(0, 10)) }, { t: "Tipo", k: "tipo" }, { t: "Estado", k: "estado" }], c.leads)}` : ""}
      <div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cerrar</button></div>`;
  }
  async function guardarAviso(vk, tipo, nombre) { try { await post("/api/erp/aviso", { clave: vk, tipo, cliente: nombre, matricula: "" }); invalidar("cli"); return true; } catch (e) { toast(e.message); return false; } }
  function formDatosVeh(D, mat, coche) {
    const x = D.ext.vehiculos[mat] || {};
    dlgE(`<form novalidate><h2>Datos de ${H(coche)} ${H(mat)}</h2><p class="hint">Lo que apuntes aquí manda sobre lo que detecta el sistema en las órdenes. Con la fecha de matriculación y la última ITV se calcula la próxima.</p>
      <div class="t-g2"><div class="field"><label for="v-itv">ITV vence el</label><input class="in" type="date" id="v-itv" value="${H(x.itvVence || "")}"></div><div class="field"><label for="v-itvu">Última ITV pasada</label><input class="in" type="date" id="v-itvu" value="${H(x.itvUltima || "")}"></div>
      <div class="field"><label for="v-mat">Fecha de matriculación</label><input class="in" type="date" id="v-mat" value="${H(x.matriculacion || "")}"></div><div class="field"><label for="v-km">Km actuales</label><input class="in num" inputmode="numeric" id="v-km" value="${H(x.kmActual || "")}"></div>
      <div class="field"><label for="v-ac">Último cambio de aceite</label><input class="in" type="date" id="v-ac" value="${H(x.aceiteFecha || "")}"></div><div class="field"><label for="v-ack">Km en ese cambio</label><input class="in num" inputmode="numeric" id="v-ack" value="${H(x.aceiteKm || "")}"></div>
      <div class="field"><label for="v-rev">Última revisión</label><input class="in" type="date" id="v-rev" value="${H(x.revisionFecha || "")}"></div></div>
      <h3 class="pe-h3">Otros avisos de este coche</h3><p class="hint">Para lo que no es ITV, aceite ni revisión: correa de distribución, neumáticos, batería… Pon qué es y cuándo toca.</p>
      ${[0, 1, 2].map((i) => `<div class="pe-fila"><input class="in" data-otro-t="${i}" maxlength="60" placeholder="Ej.: Cambio de correa" aria-label="Aviso ${i + 1}" value="${H(((x.otros || [])[i] || {}).txt || "")}"><input class="in" style="max-width:170px" type="date" data-otro-f="${i}" aria-label="Fecha del aviso ${i + 1}" value="${H(((x.otros || [])[i] || {}).vence || "")}"></div>`).join("")}
      <div class="field"><label for="v-nota">Nota</label><input class="in" id="v-nota" maxlength="300" value="${H(x.nota || "")}"></div><div class="msg bad" hidden></div>
      <div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cancelar</button><button class="btn b-acc" type="submit">Guardar</button></div></form>`, (d) => {
      q("form", d).onsubmit = async (e) => { e.preventDefault(); const n = (id) => q("#" + id, d).value.replace(/\D/g, "");
        try { await post("/api/erp/vehiculo-datos/" + encodeURIComponent(mat), { itvVence: q("#v-itv", d).value, itvUltima: q("#v-itvu", d).value, matriculacion: q("#v-mat", d).value, aceiteFecha: q("#v-ac", d).value, revisionFecha: q("#v-rev", d).value, aceiteKm: n("v-ack"), kmActual: n("v-km"), nota: q("#v-nota", d).value, otros: [0, 1, 2].map((i) => ({ txt: q(`[data-otro-t="${i}"]`, d).value, vence: q(`[data-otro-f="${i}"]`, d).value })) }); invalidar("cli"); d.close(); toast("Datos guardados"); recargar(); } catch (x) { err(d, x.message); } };
    });
  }
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-cli]"), r = e.target.closest("#s-cli tr[data-pick]"); if (!b && !r) { const sg = e.target.closest("[data-peseg=clisub] button, [data-peseg=clifil] button"); if (!sg || !visible("cli")) return; const id = sg.closest("[data-peseg]").dataset.peseg; if (id === "clisub") CL.sub = sg.dataset.k; else CL.filtro = sg.dataset.k; return recargar(); }
    try {
      const D = await D_CLI();
      if (r && !e.target.closest("button,a")) { const c = D.clientes.find((x) => x.id === r.dataset.pick); if (c) dlgE(fichaCliente(D, c)); return; }
      if (!b) return; const a = b.dataset.cli, k = b.dataset.k || "";
      if (a === "ficha") { const c = D.clientes.find((x) => x.id === k); if (c) dlgE(fichaCliente(D, c)); }
      else if (a === "avisar") { const [cid, vk, tp] = k.split("|"), c = D.clientes.find((x) => x.id === cid); if (c) await guardarAviso(vk, tp, c.nombre); } // el enlace de WhatsApp se abre solo; aquí se apunta que se avisó
      else if (a === "avisado") { const [cid, vk, tp] = k.split("|"), c = D.clientes.find((x) => x.id === cid); if (c && (await guardarAviso(vk, tp, c.nombre))) { toast("Apuntado: no se te vuelve a avisar en 2 semanas"); qa("dialog.erp-dlg[open]").forEach((x) => x.close()); recargar(); } }
      else if (a === "datos") { const [mat, coche] = k.split("|"); qa("dialog.erp-dlg[open]").forEach((x) => x.close()); formDatosVeh(D, mat, coche); }
    } catch (x) { toast(x.message); }
  });
  document.addEventListener("input", (e) => { if (e.target.id !== "cli-q" || !visible("cli")) return; CL.q = e.target.value; clearTimeout(CL._t); CL._t = setTimeout(async () => { const l = document.getElementById("cli-lista"); if (l) { try { l.innerHTML = listaCli(await D_CLI()); } catch (_) { } } }, 250); });

  /* =====================================================================
     INCENTIVOS
     ===================================================================== */
  const INC = { mes: hoy().slice(0, 7), retr: {} };
  async function pintarInc(mi) {
    PE.setActual("inc"); const s = sec("inc"), d = hoy(), mes = INC.mes, ini = mes + "-01", fin = E.addMeses(ini, 1), actualMes = mes === d.slice(0, 7), hasta = actualMes ? d : addDias(fin, -1);
    const [I, R] = await Promise.all([api("/api/erp/incentivos"), resumen(ini, hasta)]); if (!vigente(mi)) return;
    const fijos = actualMes ? R.mes.fijosHasta : R.ajustes.fijosMes, cfg = I.cfg, ya = I.periodos.find((p) => p.periodo === mes);
    const calc = E.calcularIncentivo({ filas: R.resultadoTaller, desde: ini, hasta, fijos, cfg, retrabajos: INC.retr });
    const meses = [0, 1, 2, 3, 4, 5].map((i) => E.addMeses(d.slice(0, 8) + "01", -i).slice(0, 7));
    s.innerHTML = cabecera("Incentivos del equipo", `Reparto para que el equipo gane <b>cuando la empresa gana</b>: solo sale de lo que sobra <b>después de cubrir los gastos fijos</b>, nunca más del ${I.maxPct} % de ese excedente, solo cuenta trabajo ya <b>facturado y cobrado</b> y hay un tope por persona. Si el mes no cubre los fijos, el incentivo es 0.`, "")
      + `<details class="card pe-card"><summary>Ajustes: ${cfg.activo ? "activados" : "desactivados"} · ${String(cfg.pct).replace(".", ",")} % · tope ${euros(cfg.topePersona)} por persona</summary><div class="t-g2" style="margin-top:10px"><div><label class="t-chk"><input type="checkbox" id="i-act" ${cfg.activo ? "checked" : ""}><span>Incentivos activados</span></label><div class="field"><label for="i-pct">% del excedente a repartir (máx. ${I.maxPct})</label><input class="in num" inputmode="decimal" id="i-pct" value="${H(String(cfg.pct).replace(".", ","))}"></div></div><div><div class="field"><label for="i-top">Tope por persona y mes (€)</label><input class="in num" inputmode="decimal" id="i-top" value="${H(campoEur(cfg.topePersona))}"></div><div class="field"><label for="i-pen">Descuento por cada retrabajo (%)</label><input class="in num" inputmode="numeric" id="i-pen" value="${cfg.penalRetrabajo}"></div></div></div><div class="msg bad" hidden></div><button class="btn b-ghost" type="button" data-inc="guardar">Guardar ajustes</button></details>`
      + `<div class="pe-barra">${seg("incmes", meses.map((m) => [m, mesTxt(m)]), mes)}</div>`
      + (!cfg.activo ? '<div class="msg pe-aviso">Los incentivos están desactivados: no se reparte nada hasta que los actives (arriba, en Ajustes).</div>' : "")
      + kpis([kpi("Beneficio de los coches", euros(calc.beneficio), calc.coches + " coche(s) entregado(s), facturado(s) y cobrado(s)"), kpi("Gastos fijos del periodo", euros(calc.fijos)), kpi("Excedente", euros(calc.excedente), "Lo que sobra tras los fijos", calc.excedente > 0 ? "" : "neg"), kpi("Para repartir (" + String(calc.cfg.pct).replace(".", ",") + " %)", euros(calc.pool), calc.motivoCero ? H(calc.motivoCero) : "La empresa se queda con " + eur(calc.empresaSeQueda), "hero")])
      + calc.avisos.map((a) => `<div class="msg pe-aviso">${H(a)}</div>`).join("")
      + `<div class="card pe-card"><h3 class="pe-h3">Reparto de ${H(mesTxt(mes))}</h3>${calc.filas.length ? tabla([{ t: "Persona", k: "nombre" }, { t: "Horas fichadas", n: 1, h: (x) => String(Math.round((x.minutos / 60) * 10) / 10).replace(".", ",") }, { t: "Retrabajos", h: (x) => `<input class="in num pe-peq" inputmode="numeric" data-incretr="${H(x.nombre)}" value="${x.retrabajos}" aria-label="Retrabajos de ${H(x.nombre)}" ${ya ? "disabled" : ""}>` }, { t: "Calidad", n: 1, h: (x) => Math.round(x.factor * 100) + " %" }, { t: "Incentivo", n: 1, h: (x) => `<b>${euros(x.importe)}</b>${x.recortado ? "<br>" + chip("recortado al tope", "c-ambar") : ""}` }], calc.filas) : vacio("Nadie ha fichado horas en coches cobrados este mes.")}
        <p class="pe-tot">Total a pagar: <b class="num">${euros(calc.pagado)}</b></p>
        ${ya ? `<div class="msg pe-ok">Mes liquidado el ${fechaES(String(ya.t).slice(0, 10))} por ${euros(ya.pagado)}. ${ya.estado === "pagado" ? "Pagado el " + fechaES(ya.pagadoEl) + "." : '<button class="btn b-acc b-sm" type="button" data-inc="pagado" data-k="' + H(mes) + '">Marcar como pagado</button>'}</div>` : `<div class="pe-barra"><button class="btn b-acc" type="button" data-inc="liquidar" ${!cfg.activo || !calc.pagado || actualMes ? "disabled" : ""}>Liquidar el mes</button>${actualMes ? '<small>El mes en curso es solo vista previa: se liquida cuando termina.</small>' : ""}</div>`}
        <p class="hint">Se paga por nómina. Al pagarlo apúntalo en Finanzas como gasto «Nóminas de empleados» para que cuente en los resultados.</p></div>`
      + (calc.excluidas.length ? `<div class="card pe-card"><h3 class="pe-h3">Coches que no cuentan este mes</h3>${tabla([{ t: "Orden", k: "num" }, { t: "Coche", k: "coche" }, { t: "Motivo", k: "motivo" }], calc.excluidas)}</div>` : "")
      + `<div class="card pe-card"><h3 class="pe-h3">Meses ya liquidados</h3>${tabla([{ t: "Mes", h: (p) => H(mesTxt(p.periodo)) }, { t: "Excedente", n: 1, h: (p) => euros(p.excedente) }, { t: "Repartido", n: 1, h: (p) => euros(p.pagado) }, { t: "Estado", h: (p) => chip(p.estado === "pagado" ? "Pagado" : "Pendiente de pago", p.estado === "pagado" ? "c-verde" : "c-ambar") }], I.periodos, { vacio: "Todavía no has liquidado ningún mes." })}</div>`;
    PE._inc = { calc, mes, ini, hasta, I };
  }
  document.addEventListener("input", (e) => { if (e.target.dataset && e.target.dataset.incretr !== undefined && visible("inc")) { INC.retr[e.target.dataset.incretr] = Math.max(0, parseInt(e.target.value, 10) || 0); clearTimeout(INC._t); INC._t = setTimeout(recargar, 600); } });
  document.addEventListener("click", async (e) => {
    if (!visible("inc")) return; const S = PE._inc; let b;
    if ((b = e.target.closest("[data-peseg=incmes] button"))) { INC.mes = b.dataset.k; INC.retr = {}; return recargar(); }
    if (!(b = e.target.closest("[data-inc]")) || !S) return; const a = b.dataset.inc;
    try {
      if (a === "guardar") {
        const box = b.closest("details"), msg = q(".msg.bad", box), pct = Number(String(q("#i-pct").value).replace(",", ".")), top = cent(q("#i-top").value), fallo = (t) => { msg.textContent = t; msg.hidden = false; };
        if (!Number.isFinite(pct) || pct < 0 || pct > S.I.maxPct) return fallo(`El porcentaje tiene que estar entre 0 y ${S.I.maxPct}.`); if (!Number.isFinite(top) || top < 0) return fallo("Pon el tope por persona en euros.");
        await post("/api/erp/incentivo-cfg", { activo: q("#i-act").checked, pct, topePersona: top, penalRetrabajo: parseInt(q("#i-pen").value, 10) || 0 }); invalidar(); toast("Ajustes guardados"); recargar();
      } else if (a === "liquidar") {
        const c = S.calc; if (!confirm(`¿Liquidar ${mesTxt(S.mes)}?\n\nSe reparten ${eur(c.pagado)} entre ${c.filas.filter((x) => x.importe > 0).length} persona(s). No se puede repetir.`)) return;
        await post("/api/erp/incentivo-liquidar", { periodo: S.mes, desde: S.ini, hasta: S.hasta, beneficio: c.beneficio, fijos: c.fijos, pct: c.cfg.pct, filas: c.filas.map((x) => ({ nombre: x.nombre, minutos: x.minutos, retrabajos: x.retrabajos, importe: x.importe })) }); invalidar(); toast("Mes liquidado"); recargar();
      } else if (a === "pagado") { await post("/api/erp/incentivo-pagado/" + b.dataset.k, { fecha: hoy() }); recargar(); }
    } catch (x) { toast(x.message); }
  });

  /* =====================================================================
     MARGEN Y DOCUMENTOS DE COCHE
     ===================================================================== */
  const CHECK = [["dgt", "Informe DGT: titularidad, cargas y embargos"], ["itv", "ITV en vigor"], ["imp", "Impuesto de circulación al corriente"], ["docs", "Permiso de circulación y ficha técnica entregados"], ["contrato", "Contrato firmado por las dos partes"], ["factura", "Factura de venta emitida (FORM-11)"], ["pago", "Pago recibido y justificante guardado"], ["seguro", "Seguro del comprador activo antes de llevárselo"], ["llaves", "Llaves (y 2.ª llave) y libro de mantenimiento entregados"], ["titular", "Cambio de titularidad presentado en Tráfico"], ["resena", "Pedir reseña de Google a los 7 días"]];
  const mes12 = (f, m) => (f ? E.addMeses(f, m) : "");
  // Act. 74 · «Solo motor» solo cabe si compra una EMPRESA o un AUTÓNOMO para su negocio. A un particular (consumidor) no se le puede reducir la garantía legal a una parte del coche.
  const soloMotor = (x) => x.compradorTipo === "empresa" && x.garantiaSoloMotor === true;
  const MOTOR_INCLUYE = "bloque motor y sus piezas internas lubricadas (culata, cigüeñal, bielas, pistones, árbol de levas, distribución y bomba de aceite)";
  const MOTOR_EXCLUYE = "caja de cambios, embrague y volante, turbocompresor, inyección, escape y catalizador, refrigeración, electricidad y electrónica, aire acondicionado, dirección, suspensión, frenos, carrocería e interior";
  function contratoHTML(x, emp) {
    const v = x.vehiculo || {}, c = x.comprador || {}, f = x.fechaEntrega || hoy(), em = emp || {};
    const l = (t, def) => esc(t || def || "________________");
    return `<h1>CONTRATO DE COMPRAVENTA DE VEHÍCULO DE OCASIÓN</h1><p style="text-align:right">En Antigua (Las Palmas), a ${fechaES(hoy())}</p>
      <h3>REUNIDOS</h3><p><b>De una parte (EL VENDEDOR):</b> MAYLIN Y YERAY SL (nombre comercial Volcano Cars), NIF ${l(em.nif)}, con domicilio en Calle Valle Largo S/N, puerta 8, 35610 Antigua (Las Palmas). Teléfonos 643 566 098 y 676 960 348 · volcanocars2026@gmail.com.</p>
      <p><b>De otra (EL COMPRADOR):</b> ${l(c.nombre)}, NIF ${l(c.nif)}, domicilio ${l(c.direccion)}, teléfono ${l(c.telefono)}${c.email ? ", correo " + esc(c.email) : ""}.</p>
      <h3>ESTIPULACIONES</h3>
      <p><b>1. Objeto.</b> El vendedor vende y el comprador compra el vehículo ${l(v.descripcion)}, matrícula ${l(v.matricula)}, nº de bastidor ${l(v.bastidor)}, con ${x.kmEntrega ? esc(x.kmEntrega.toLocaleString("es-ES")) : "________"} km en el momento de la entrega.</p>
      <p><b>2. Precio y pago.</b> El precio total es de <b>${esc(eur(x.precio || 0))}</b> (impuestos incluidos), pagado mediante ${l(x.forma, "________")}. El vendedor entregará factura de la venta.</p>
      <p><b>3. Entrega.</b> La entrega se realiza el ${fechaES(f)}. El comprador declara haber visto y probado el vehículo y conocer su estado general, que ha sido revisado en el taller del vendedor.</p>
      <p><b>4. Cargas.</b> El vendedor manifiesta que el vehículo se transmite libre de cargas, gravámenes y embargos, lo que se ha comprobado mediante informe de la DGT. En caso contrario se hace constar aquí: ________________________________.</p>
      <p><b>5. Garantía.</b> El vendedor responde de las faltas de conformidad del vehículo en los términos del Real Decreto Legislativo 1/2007 (Ley General para la Defensa de los Consumidores y Usuarios). ${soloMotor(x) ? `Al comprar el vehículo una empresa o un profesional para su actividad (no como consumidor), se pacta una garantía contractual de <b>${esc(x.garantiaMeses || 12)} meses</b> que cubre <b>únicamente el motor</b> (${MOTOR_INCLUYE}). Quedan excluidos de este pacto los demás componentes del vehículo (${MOTOR_EXCLUYE}).` : `Plazo de garantía pactado: <b>${esc(x.garantiaMeses || 12)} meses</b> desde la entrega (nunca inferior a 12 meses cuando el comprador es consumidor).`} Las reclamaciones se hacen en los teléfonos y el correo indicados arriba.</p>
      <p><b>6. Cambio de titularidad.</b> Las partes se comprometen a tramitar el cambio de titularidad ante la Dirección General de Tráfico dentro de los plazos legales. A partir de la entrega, el comprador asume el seguro, los impuestos y las sanciones del vehículo.</p>
      <p><b>7. Protección de datos.</b> Los datos personales se tratan por MAYLIN Y YERAY SL para gestionar esta compraventa, conforme al Reglamento (UE) 2016/679. Puedes ejercer tus derechos escribiendo al correo indicado; más información en volcanocars.com/privacidad.html.</p>
      ${x.notas ? `<p><b>Observaciones.</b> ${esc(x.notas)}</p>` : ""}
      <p>Y en prueba de conformidad, firman por duplicado en el lugar y fecha indicados.</p>
      <table style="width:100%;margin-top:60px"><tr><td style="width:50%;text-align:center">EL VENDEDOR<br><br><br>_____________________</td><td style="text-align:center">EL COMPRADOR<br><br><br>_____________________</td></tr></table>`;
  }
  function garantiaHTML(x) {
    const v = x.vehiculo || {}, c = x.comprador || {}, ini = x.fechaEntrega || hoy(), fin = mes12(ini, x.garantiaMeses || 12);
    return `<h1>CERTIFICADO DE GARANTÍA</h1><p style="text-align:center"><b>Volcano Cars · MAYLIN Y YERAY SL</b><br>Calle Valle Largo S/N, puerta 8, 35610 Antigua (Las Palmas)</p>
      <table border="1" cellpadding="6" cellspacing="0" style="width:100%;border-collapse:collapse;margin:14px 0"><tr><td>Vehículo</td><td>${esc(v.descripcion || "")}</td></tr><tr><td>Matrícula</td><td>${esc(v.matricula || "")}</td></tr><tr><td>Bastidor</td><td>${esc(v.bastidor || "")}</td></tr><tr><td>Titular</td><td>${esc(c.nombre || "")} ${esc(c.nif || "")}</td></tr><tr><td>Fecha de entrega</td><td>${fechaES(ini)}</td></tr><tr><td>Kilómetros</td><td>${x.kmEntrega ? esc(x.kmEntrega.toLocaleString("es-ES")) : ""}</td></tr><tr><td><b>Garantía</b></td><td><b>${esc(x.garantiaMeses || 12)} meses · hasta el ${fechaES(fin)}</b></td></tr></table>
      ${soloMotor(x) ? `<p><b>Garantía contractual pactada entre empresas.</b> El comprador declara adquirir el vehículo para su actividad empresarial o profesional. La garantía cubre <b>ÚNICAMENTE EL MOTOR</b>: ${MOTOR_INCLUYE}, frente a averías mecánicas internas que existieran en el momento de la entrega.</p><p><b>Quedan excluidos de la garantía</b> los demás componentes del vehículo: ${MOTOR_EXCLUYE}; el desgaste normal por uso, los daños por accidente, mal uso, falta de mantenimiento o manipulación por terceros.</p>` : `<p>El vendedor responde de las faltas de conformidad que existieran en el momento de la entrega, conforme al Real Decreto Legislativo 1/2007. No cubre el desgaste normal por uso (neumáticos, pastillas, discos, embrague, escobillas, lámparas, filtros y similares), los daños por accidente, mal uso, falta de mantenimiento o manipulación por terceros.</p>`}
      <p><b>Cómo reclamar:</b> llama al 643 566 098 o al 676 960 348, o escribe a volcanocars2026@gmail.com indicando la matrícula y el problema. No repares la avería por tu cuenta sin avisarnos antes.</p><p style="margin-top:50px;text-align:center">Sello y firma de Volcano Cars</p>`;
  }


  const MC = { anio: Number(hoy().slice(0, 4)) };
  const nomCoche = (c) => [c.marca, c.modelo, c.anio ? `(${c.anio})` : ""].filter(Boolean).join(" ");
  async function pintarMcar(mi) {
    PE.setActual("mcar"); const s = sec("mcar"), d = hoy(), y = MC.anio, ten = Number(LS.get("vc_tenencia", "0")) || 0, admin = soyGerente();
    const cars = await api("/api/coches").then((x) => (Array.isArray(x) ? x : x.coches || [])).catch(() => []); if (!vigente(mi)) return;
    if (!admin) {
      const lista = cars.map((c) => ({ id: c.id, nombre: nomCoche(c), estado: c.estado, km: c.km, precio: c.precio })).sort((a, b) => (a.estado === "vendido") - (b.estado === "vendido") || a.nombre.localeCompare(b.nombre));
      s.innerHTML = cabecera("Documentos de coche", "Contrato de compraventa, certificado de garantía y lista de traspaso de cada coche. Son modelos de ayuda: revísalos con el gestor.", "") + `<div class="card pe-card">${tabla([{ t: "Coche", k: "nombre" }, { t: "Estado", h: (x) => chip(x.estado, x.estado === "vendido" ? "c-verde" : x.estado === "reservado" ? "c-ambar" : "c-gris") }, { t: "Km", n: 1, h: (x) => (x.km ? x.km.toLocaleString("es-ES") : "—") }, { t: "Precio", n: 1, h: (x) => (x.precio ? H(eur(Math.round(x.precio * 100))) : "—") }], lista, { pick: "id", vacio: "No hay coches." })}</div>`;
      return;
    }
    const R = await resumen(y + "-01-01", y === Number(d.slice(0, 4)) ? d : y + "-12-31"); if (!vigente(mi)) return;
    const creado = new Map(cars.map((c) => [c.id, String(c.creado || "").slice(0, 10)]));
    const vend = (R.coches || []).map((x) => { const ini = creado.get(x.coche), dias = ini ? Math.max(0, difDias(x.fecha, ini)) : null, m = E.margenCoche({ venta: x.base, compra: x.compra, reac: x.reacondicionamiento, tenenciaDia: ten, dias: dias || 0 }); return { ...x, dias, ...m }; });
    const stock = (R.stock || []).map((st) => { const ini = creado.get(st.coche), dias = ini ? Math.max(0, difDias(d, ini)) : null; return { ...st, dias, invertido: (st.compra || 0) + (st.reacondicionamiento || 0), tenencia: Math.round(ten * (dias || 0)) }; });
    const rep = (R.resultadoTaller || []).map((t) => ({ ...t, id: t.token })); // Act. 74: coches de taller entregados con su desglose de ganancia
    const totM = vend.reduce((a, x) => a + x.margen, 0), totT = rep.reduce((a, x) => a + x.beneficio, 0), gPz = rep.reduce((a, x) => a + x.gananciaPiezas, 0), vPz = rep.reduce((a, x) => a + x.ventaPiezas, 0), cPz = rep.reduce((a, x) => a + x.piezas, 0);
    const conDias = vend.filter((x) => x.dias != null), medDias = conDias.length ? Math.round(conDias.reduce((a, x) => a + x.dias, 0) / conDias.length) : null;
    const cls = (v) => (v < 0 ? "pe-mal" : "pe-bien"), pct = (v) => (v == null ? "—" : String(v).replace(".", ",") + " %");
    const btn = (k, id) => `<button type="button" class="btn b-ghost b-sm" data-mdesg="${k}" data-id="${H(id)}">Desglose</button>`;
    s.innerHTML = cabecera("Margen y documentos de coche", "Ganancia real de cada vehículo: <b>venta de coches</b> (venta sin impuestos − compra − reacondicionamiento − coste de tenerlo parado) y <b>taller</b> (lo facturado en piezas y mano de obra − lo que costaron las piezas al proveedor − las horas de los trabajadores). Pulsa «Desglose» para ver el detalle de cada coche, o una fila de venta para su contrato, garantía y lista de traspaso.", "")
      + `<div class="pe-barra"><select class="in pe-sel" id="mc-anio" aria-label="Año">${[0, 1, 2].map((i) => Number(d.slice(0, 4)) - i).map((a) => `<option ${a === y ? "selected" : ""}>${a}</option>`).join("")}</select><label class="pe-mini">Coste de tener un coche parado (€/día) <input class="in num" id="mc-ten" inputmode="decimal" value="${H(campoEur(ten))}"></label></div>`
      + kpis([kpi("Ganancia total", euros(totM + totT), "Ventas + taller · " + y, totM + totT < 0 ? "neg" : "hero"), kpi("Venta de coches", euros(totM), vend.length + " vendido(s)", totM < 0 ? "neg" : ""), kpi("Taller", euros(totT), rep.length + " coche(s) reparado(s)", totT < 0 ? "neg" : ""), kpi("Ganancia en piezas", euros(gPz), "Compradas " + eur(cPz) + " · cobradas " + eur(vPz), gPz < 0 ? "neg" : ""), kpi("Coches en stock", String(stock.length), "Invertido " + eur(stock.reduce((a, st) => a + st.invertido, 0))), kpi("Días medios en vender", medDias == null ? "—" : String(medDias), "Desde que entró en la web")])
      + `<div class="card pe-card"><h3 class="pe-h3">Coches reparados en el taller</h3>${tabla([{ t: "Entrega", h: (x) => fechaES(x.fecha) }, { t: "Coche", h: (x) => `<b>${H(x.coche || "—")}</b> ${H(x.matricula)}<br><small>${H(x.cliente)} · ${H(x.num)}</small>` }, { t: "Facturado s/IGIC", n: 1, h: (x) => euros(x.base) }, { t: "Piezas", n: 1, h: (x) => (x.sinDesglose ? "—" : `<b class="${cls(x.gananciaPiezas)}">${euros(x.gananciaPiezas)}</b><br><small>cobradas ${euros(x.ventaPiezas)} · compradas ${euros(x.piezas)} · ${pct(x.margenPiezasPct)}</small>`) }, { t: "Mano de obra", n: 1, h: (x) => (x.sinDesglose ? "—" : `<b class="${cls(x.gananciaManoObra)}">${euros(x.gananciaManoObra)}</b><br><small>cobrada ${euros(x.ventaManoObra)} · horas ${euros(x.manoObra)}</small>`) }, { t: "Beneficio", n: 1, h: (x) => `<b class="${cls(x.beneficio)}">${euros(x.beneficio)}</b>${x.avisos && x.avisos.length ? "<br>" + chip("revisar", "c-ambar") : ""}` }, { t: "", h: (x) => btn("taller", x.token) }], rep, { vacio: "Ningún coche de taller entregado en este año." })}<p class="hint">Beneficio = lo facturado sin IGIC − piezas al coste − horas fichadas de los trabajadores (si el interruptor de Finanzas está activado). «Ganancia sobre lo comprado» = ganancia de piezas ÷ lo que costaron.</p></div>`
      + `<div class="card pe-card"><h3 class="pe-h3">Coches vendidos</h3>${tabla([{ t: "Coche", h: (x) => `<b>${H(x.nombre)}</b>${x.estimado || x.sinCoste ? "<br>" + chip("datos incompletos", "c-ambar") : ""}` }, { t: "Vendido", h: (x) => fechaES(x.fecha) }, { t: "Días", n: 1, h: (x) => (x.dias == null ? "—" : x.dias) }, { t: "Venta s/IGIC", n: 1, h: (x) => euros(x.base) }, { t: "Compra", n: 1, h: (x) => euros(x.compra) }, { t: "Reacond.", n: 1, h: (x) => euros(x.reacondicionamiento) }, { t: "Margen real", n: 1, h: (x) => `<b class="${cls(x.margen)}">${euros(x.margen)}</b><br><small>${String(x.pct).replace(".", ",")} %</small>` }, { t: "", h: (x) => btn("venta", x.coche) }], vend, { pick: "coche", vacio: "Ninguna venta en este año." })}</div>`
      + `<div class="card pe-card"><h3 class="pe-h3">En stock</h3>${tabla([{ t: "Coche", k: "nombre" }, { t: "Días", n: 1, h: (x) => (x.dias == null ? "—" : x.dias) }, { t: "Precio web", n: 1, h: (x) => euros(x.precio) }, { t: "Invertido", n: 1, h: (x) => euros(x.invertido) }, { t: "Parado cuesta", n: 1, h: (x) => (x.tenencia ? euros(x.tenencia) : "—") }, { t: "Precio − invertido", n: 1, h: (x) => { const v = x.precio - x.invertido - x.tenencia; return `<b class="${v < 0 ? "pe-mal" : ""}">${euros(v)}</b>`; } }], stock, { pick: "coche", vacio: "No hay coches en stock." })}<p class="hint">«Precio − invertido» es orientativo: el precio web lleva impuestos.</p></div>`;
    PE._mc = { vend, stock, rep };
  }
  document.addEventListener("change", (e) => { if (!visible("mcar")) return; if (e.target.id === "mc-anio") { MC.anio = Number(e.target.value); recargar(); } if (e.target.id === "mc-ten") { const c = cent(e.target.value); LS.set("vc_tenencia", String(Number.isFinite(c) && c >= 0 ? c : 0)); recargar(); } });
  function imprimir(html) { let el = document.getElementById("pe-print"); if (!el) { el = document.createElement("div"); el.id = "pe-print"; document.body.appendChild(el); } el.innerHTML = html; setTimeout(() => window.print(), 60); }
  async function docCoche(id, nombre) {
    const r = await api("/api/erp/coche-doc/" + encodeURIComponent(id)), x = r.doc || {}, c = x.comprador || {}, v = x.vehiculo || {}, ch = x.checklist || {}, emp = { nif: LS.get("vc_empresa_nif", "") };
    dlgE(`<form novalidate><h2>Documentos · ${H(nombre)}</h2><p class="hint">Rellena una vez: sirve para el contrato, la garantía y la lista de traspaso. Son modelos de ayuda: pásalos por tu gestor antes de usarlos.</p>
      <h3 class="pe-h3">Vehículo</h3><div class="t-g2"><div class="field"><label for="d-vd">Descripción</label><input class="in" id="d-vd" maxlength="160" value="${H(v.descripcion || nombre)}"></div><div class="field"><label for="d-vm">Matrícula</label><input class="in" id="d-vm" maxlength="12" value="${H(v.matricula || "")}"></div><div class="field"><label for="d-vb">Nº de bastidor</label><input class="in" id="d-vb" maxlength="24" value="${H(v.bastidor || "")}"></div><div class="field"><label for="d-km">Km en la entrega</label><input class="in num" inputmode="numeric" id="d-km" value="${H(x.kmEntrega || "")}"></div></div>
      <h3 class="pe-h3">Comprador</h3><div class="t-g2"><div class="field"><label for="d-cn">Nombre y apellidos</label><input class="in" id="d-cn" maxlength="120" value="${H(c.nombre || "")}"></div><div class="field"><label for="d-ci">NIF / NIE</label><input class="in" id="d-ci" maxlength="20" value="${H(c.nif || "")}"></div><div class="field"><label for="d-cd">Dirección</label><input class="in" id="d-cd" maxlength="200" value="${H(c.direccion || "")}"></div><div class="field"><label for="d-ct">Teléfono</label><input class="in" id="d-ct" maxlength="30" value="${H(c.telefono || "")}"></div><div class="field"><label for="d-ce">Correo</label><input class="in" id="d-ce" maxlength="120" value="${H(c.email || "")}"></div></div>
      <h3 class="pe-h3">Venta</h3><div class="t-g2"><div class="field"><label for="d-pr">Precio final con impuestos (€)</label><input class="in num" inputmode="decimal" id="d-pr" value="${H(campoEur(x.precio))}"></div><div class="field"><label for="d-fp">Forma de pago</label><input class="in" id="d-fp" maxlength="60" value="${H(x.forma || "")}" placeholder="Transferencia, efectivo, financiación…"></div><div class="field"><label for="d-fe">Fecha de entrega</label><input class="in" type="date" id="d-fe" value="${H(x.fechaEntrega || "")}"></div><div class="field"><label for="d-ga">Garantía (meses, mínimo 12)</label><input class="in num" inputmode="numeric" id="d-ga" value="${H(x.garantiaMeses || 12)}"></div><div class="field"><label for="d-tc">¿Quién compra?</label><select class="in" id="d-tc"><option value="particular" ${x.compradorTipo === "empresa" ? "" : "selected"}>Particular (garantía legal completa del coche)</option><option value="empresa" ${x.compradorTipo === "empresa" ? "selected" : ""}>Empresa o autónomo que compra para su negocio</option></select></div><div class="field" id="d-smbox" ${x.compradorTipo === "empresa" ? "" : "hidden"}><label class="t-chk"><input type="checkbox" id="d-sm" ${x.garantiaSoloMotor ? "checked" : ""}><span>La garantía cubre SOLO EL MOTOR (el resto queda excluido)</span></label><small class="hint">Solo se permite cuando compra una empresa o autónomo para su actividad. A un particular la ley le da la garantía de todo el coche y no se puede reducir.</small></div><div class="field"><label for="d-nif">NIF de la empresa (para el contrato)</label><input class="in" id="d-nif" maxlength="20" value="${H(emp.nif)}"></div></div><div class="field"><label for="d-no">Observaciones</label><input class="in" id="d-no" maxlength="500" value="${H(x.notas || "")}"></div>
      <h3 class="pe-h3">Traspaso y entrega</h3>${CHECK.map(([k, t]) => `<label class="t-chk"><input type="checkbox" data-ch="${k}" ${ch[k] ? "checked" : ""}><span>${H(t)}</span></label>`).join("")}<div class="msg bad" hidden></div>
      <div class="t-dlg-acts"><button class="btn b-ghost" type="button" id="d-con">Imprimir contrato</button><button class="btn b-ghost" type="button" id="d-gar">Imprimir garantía</button><button class="btn b-ghost" type="button" data-pecerrar>Cerrar</button><button class="btn b-acc" type="submit">Guardar</button></div></form>`, (d) => {
      const leer = () => ({ vehiculo: { descripcion: q("#d-vd", d).value, matricula: q("#d-vm", d).value, bastidor: q("#d-vb", d).value }, kmEntrega: q("#d-km", d).value.replace(/\D/g, ""), comprador: { nombre: q("#d-cn", d).value, nif: q("#d-ci", d).value, direccion: q("#d-cd", d).value, telefono: q("#d-ct", d).value, email: q("#d-ce", d).value }, precio: Number.isFinite(cent(q("#d-pr", d).value)) ? cent(q("#d-pr", d).value) : 0, forma: q("#d-fp", d).value, fechaEntrega: q("#d-fe", d).value, garantiaMeses: Math.max(12, parseInt(q("#d-ga", d).value, 10) || 12), compradorTipo: q("#d-tc", d).value, garantiaSoloMotor: q("#d-tc", d).value === "empresa" && q("#d-sm", d).checked, notas: q("#d-no", d).value, checklist: Object.fromEntries(qa("[data-ch]", d).map((i) => [i.dataset.ch, i.checked])) });
      q("#d-tc", d).onchange = () => { q("#d-smbox", d).hidden = q("#d-tc", d).value !== "empresa"; };
      const guardar = async () => { LS.set("vc_empresa_nif", q("#d-nif", d).value.trim()); return (await post("/api/erp/coche-doc/" + encodeURIComponent(id), leer())).doc; };
      q("form", d).onsubmit = async (e) => { e.preventDefault(); try { await guardar(); d.close(); toast("Guardado"); } catch (z) { err(d, z.message); } };
      q("#d-con", d).onclick = async () => { try { const doc = await guardar(); imprimir(contratoHTML(doc, { nif: q("#d-nif", d).value.trim() })); } catch (z) { err(d, z.message); } };
      q("#d-gar", d).onclick = async () => { try { imprimir(garantiaHTML(await guardar())); } catch (z) { err(d, z.message); } };
    });
  }
  /* Act. 74 · desglose de ganancia de un coche (taller o venta) */
  const fila = (t, v, c) => `<tr class="${c || ""}"><td>${t}</td><td class="n num">${v}</td></tr>`;
  const tb = (filas) => `<table class="tabla fn-mini"><tbody>${filas.join("")}</tbody></table>`;
  function desgloseTaller(x) {
    const pc = (v) => (v == null ? "—" : String(v).replace(".", ",") + " %"), cl = (v) => (v < 0 ? "pe-mal" : "pe-bien");
    dlgE(`<h2>${H(x.coche || "Coche")} ${H(x.matricula)}</h2><p class="hint">${H(x.cliente)} · orden ${H(x.num)} · entregado el ${fechaES(x.fecha)}${x.factura ? " · factura " + H(x.factura) : ""}</p>
      <h3 class="pe-h3">Lo que cobraste</h3>${tb([fila("Precio final (con IGIC)", euros(x.total)), fila("IGIC (no es tuyo)", "− " + euros(x.igic)), fila("<b>Facturado sin IGIC</b>", "<b>" + euros(x.base) + "</b>")])}
      ${x.sinDesglose ? '<p class="hint">Esta orden no tiene factura con líneas: no se puede separar piezas y mano de obra.</p>' : `
      <h3 class="pe-h3">Piezas</h3>
      ${x.lineasPiezas && x.lineasPiezas.length ? tabla([{ t: "Cobradas al cliente", h: (l) => H(l.desc || l.ref) }, { t: "Cant.", n: 1, k: "cant" }, { t: "Precio ud.", n: 1, h: (l) => euros(l.precio) }, { t: "Importe", n: 1, h: (l) => euros(l.importe) }], x.lineasPiezas) : '<p class="hint">No facturaste piezas en esta orden.</p>'}
      ${x.piezasDet && x.piezasDet.length ? tabla([{ t: "Compradas al proveedor (salidas del Inventario)", h: (l) => H(l.nombre) + (l.sinCoste ? " " + chip("sin coste", "c-ambar") : "") }, { t: "Cant.", n: 1, k: "cantidad" }, { t: "Coste", n: 1, h: (l) => euros(l.coste) }], x.piezasDet) : '<p class="hint">Ninguna pieza salió del Inventario con esta orden.</p>'}
      ${tb([fila("Cobrado en piezas", euros(x.ventaPiezas)), fila("Costaron al proveedor", "− " + euros(x.piezas)), fila("<b>Ganancia en piezas</b>", `<b class="${cl(x.gananciaPiezas)}">${euros(x.gananciaPiezas)}</b> <small>(${pc(x.margenPiezasPct)} sobre lo comprado)</small>`)])}
      <h3 class="pe-h3">Mano de obra</h3>
      ${tb([fila("Cobrada al cliente", euros(x.ventaManoObra)), ...(x.trabajadores || []).map((w) => fila(`${H(w.nombre)} · ${Math.floor(w.minutos / 60)} h ${w.minutos % 60} min × ${euros(Math.round(x.tarifa * 100))}/h`, "− " + euros(w.coste))), fila(x.descontadaMO ? "Coste de las horas" : "Horas (no se restan: están en los gastos fijos)", x.descontadaMO ? "− " + euros(x.manoObra) : euros(x.manoObra)), fila("<b>Ganancia en mano de obra</b>", `<b class="${cl(x.descontadaMO ? x.gananciaManoObra : x.ventaManoObra)}">${euros(x.descontadaMO ? x.gananciaManoObra : x.ventaManoObra)}</b>`)])}
      ${x.ventaOtros ? `<h3 class="pe-h3">Otros conceptos</h3>${tb([fila("Facturado en otros conceptos", euros(x.ventaOtros))])}` : ""}`}
      <h3 class="pe-h3">Resultado</h3>${tb([fila("<b>Beneficio de este coche</b>", `<b class="${cl(x.beneficio)}">${euros(x.beneficio)}</b>`)])}
      ${(x.avisos || []).map((a) => `<p class="hint">⚠ ${H(a)}</p>`).join("")}<div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cerrar</button></div>`);
  }
  function desgloseVenta(x) {
    const cl = (v) => (v < 0 ? "pe-mal" : "pe-bien");
    dlgE(`<h2>${H(x.nombre)}</h2><p class="hint">Vendido el ${fechaES(x.fecha)}${x.comprador ? " a " + H(x.comprador) : ""}${x.dias != null ? " · " + x.dias + " día(s) en venta" : ""}</p>
      ${x.estimado || x.sinCoste ? '<p class="hint">⚠ Datos incompletos: falta el precio real de venta o lo que costó comprarlo.</p>' : ""}
      <h3 class="pe-h3">Venta</h3>${tb([fila("Precio final (con impuestos)", euros(x.precio)), fila("Impuesto (no es tuyo)", "− " + euros(x.igic || 0)), fila("<b>Venta sin impuestos</b>", "<b>" + euros(x.base) + "</b>")])}
      <h3 class="pe-h3">Lo que costó</h3>${tb([fila("Compra del coche", "− " + euros(x.compra)), fila("Piezas del Inventario", "− " + euros(x.reacPiezas || 0)), fila("Horas de trabajadores", "− " + euros(x.reacHoras || 0)), fila("Otros costes aprobados", "− " + euros(x.reacOtros || 0)), fila("Gastos apuntados a este coche", "− " + euros(x.reacGastos || 0)), fila("Coste de tenerlo parado", "− " + euros(x.tenencia || 0))])}
      ${x.gastosDet && x.gastosDet.length ? tabla([{ t: "Gastos de este coche", h: (g) => `${H(g.proveedor)}<br><small>${H(g.concepto)} · ${H(g.categoria)}</small>` }, { t: "Fecha", h: (g) => fechaES(g.fecha) }, { t: "Base", n: 1, h: (g) => euros(g.base) }], x.gastosDet) : ""}
      <h3 class="pe-h3">Resultado</h3>${tb([fila("<b>Ganancia real</b>", `<b class="${cl(x.margen)}">${euros(x.margen)}</b>`), fila("Sobre lo que costó comprarlo", x.compra ? String(Math.round((x.margen / x.compra) * 1000) / 10).replace(".", ",") + " %" : "—"), fila("Sobre el precio de venta", String(x.pct).replace(".", ",") + " %")])}
      <div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cerrar</button></div>`);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-mdesg]"); if (!b || !visible("mcar") || !PE._mc) return; e.stopPropagation();
    const x = b.dataset.mdesg === "taller" ? PE._mc.rep.find((z) => z.token === b.dataset.id) : PE._mc.vend.find((z) => z.coche === b.dataset.id); if (!x) return;
    if (b.dataset.mdesg === "taller") desgloseTaller(x); else desgloseVenta(x);
  }, true);
  document.addEventListener("click", (e) => {
    const r = e.target.closest("#s-mcar tr[data-pick]"); if (!r || e.target.closest("button,a") || !PE._mc && soyGerente()) return;
    const id = r.dataset.pick, M = PE._mc, x = M ? M.vend.find((z) => z.coche === id) || M.stock.find((z) => z.coche === id) : null;
    docCoche(id, x ? x.nombre : (r.querySelector("td .v") || {}).textContent || "Coche").catch((z) => toast(z.message));
  });

  /* =====================================================================
     PERMISOS Y APROBACIONES (solo gerente)
     ===================================================================== */
  const MOD_TXT = { compras: ["Compras", "Pedidos al proveedor, recepción de mercancía y facturas de proveedor (sin pagarlas)"], cli: ["Clientes 360 y avisos", "Historial, servicios pendientes y avisos por WhatsApp (sin importes)"], mcar: ["Documentos de coche", "Contrato, garantía y lista de traspaso (sin márgenes)"] };
  const ROL_TXT = { mecanico: "Mecánico", calidad: "Calidad", recepcion: "Recepción" };
  async function pintarPerm(mi) {
    PE.setActual("perm"); const s = sec("perm"), P = await api("/api/erp/permisos"); if (!vigente(mi)) return;
    s.innerHTML = cabecera("Permisos y aprobaciones", "Tú decides qué puestos del equipo usan cada parte del ERP. El gerente lo ve todo siempre. Los importes, la contabilidad, el banco y los incentivos son solo tuyos.", "")
      + `<div class="card pe-card"><h3 class="pe-h3">Qué puesto usa cada módulo</h3>${tabla([{ t: "Módulo", h: (m) => `<b>${H(MOD_TXT[m][0])}</b><br><small>${H(MOD_TXT[m][1])}</small>` }, ...P.roles_posibles.map((r) => ({ t: ROL_TXT[r], h: (m) => `<label class="t-chk pe-chk"><input type="checkbox" data-perm-m="${m}" data-perm-r="${r}" ${(P.roles[m] || []).includes(r) ? "checked" : ""} aria-label="${H(ROL_TXT[r])} puede usar ${H(MOD_TXT[m][0])}"><span></span></label>` }))], P.modulos)}
        <p class="hint">Pagar facturas de proveedor, dar de baja proveedores, anular facturas y aprobar pedidos son siempre solo del gerente. Quien no ficha su jornada tampoco puede usar nada, como en el resto del panel.</p></div>`
      + `<div class="card pe-card"><h3 class="pe-h3">Aprobación de pedidos grandes</h3><p class="hint">Cuando una persona del equipo marca como «pedido al proveedor» un pedido de más de este importe (sin IGIC), queda esperando tu visto bueno y no se pide hasta que lo apruebes. Los tuyos nunca esperan. Pon 0 para no pedir aprobaciones.</p>
        <div class="field"><label for="pm-max">Importe máximo sin aprobación (€)</label><input class="in num" style="max-width:200px" id="pm-max" inputmode="decimal" value="${H(campoEur(P.pedidoMax))}"></div><div class="msg bad" hidden></div></div>
      <button class="btn b-acc" type="button" data-perm="guardar">Guardar permisos</button>`;
  }
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-perm=guardar]"); if (!b || !visible("perm")) return; const msg = q("#s-perm .msg.bad"), max = cent(q("#pm-max").value);
    if (!Number.isFinite(max) || max < 0) { msg.textContent = "Pon el importe en euros (o 0 para no pedir aprobaciones)."; msg.hidden = false; return; }
    const roles = {}; for (const m of Object.keys(MOD_TXT)) roles[m] = qa(`[data-perm-m="${m}"]:checked`).map((i) => i.dataset.permR);
    b.disabled = true; try { await post("/api/erp/permisos", { roles, pedidoMax: max }); toast("Permisos guardados"); recargar(); } catch (x) { toast(x.message); } b.disabled = false;
  });

  registrar("cli", "s-cli", pintarCli, "cli"); registrar("inc", "s-inc", pintarInc, "inc"); registrar("mcar", "s-mcar", pintarMcar, "mcar"); registrar("perm", "s-perm", pintarPerm, "perm");

})();
