/* =====================================================================
   PANEL · ERP (actualización 70) · pestañas nuevas DENTRO del panel, con su mismo formato
   · Compras  (#s-compras): pedidos, recepción con entrada al inventario, facturas de proveedor, pago, deuda y reposición
   · Banco    (#s-banco)  : importar el extracto y conciliar con cobros, gastos y facturas de proveedor
   · Gestoría (#s-gest)   : IGIC por trimestre, libros de facturas emitidas y recibidas, descargas para el gestor
   Compras la puede abrir el gerente a otros roles (Permisos); Banco y Gestoría son solo del gerente. Usa las piezas del panel (fn-kpi, tabla, segv, t-dlg, chip) y el cálculo de /erp-logic.js.
   Este archivo también publica window.PE (piezas y registro de pestañas) para panel-erp2.js y panel-conta.js.
   Servidor: /api/erp/* (netlify/functions/erp.mts).
   ===================================================================== */
(function () {
  "use strict";
  if (typeof TABS === "undefined" || typeof show !== "function" || typeof abrirTab !== "function" || !window.ERP) return;
  const E = window.ERP, { cent, eur, fechaES, addDias, difDias } = E;
  const q = (s, r = document) => r.querySelector(s), qa = (s, r = document) => [...r.querySelectorAll(s)];
  const H = (s) => esc(s);
  const SECC = { compras: "s-compras", banco: "s-banco", gest: "s-gest" };
  const MODULO = { compras: "compras", banco: "banco", gest: "gest" }; // pestaña → módulo de permisos
  const SOLO_GERENTE = new Set(["banco", "gest", "conta", "inc", "perm"]);
  const VISTA = {};
  let PERM = null; // lo que puede usar quien está dentro: { admin, modulos[], pedidoMax }
  const esGerente = () => !PERM || PERM.admin || (typeof PUEDE_TODO === "function" && PUEDE_TODO());
  const tienePermiso = (t) => (esGerente() ? true : !SOLO_GERENTE.has(t) && !!PERM && PERM.modulos.includes(MODULO[t] || t));

  /* ---------------- registro de las pestañas (mismo método que Documentación) ---------------- */
  Object.assign(TABS, SECC);
  const _show = show;
  show = function (id) { for (const v of Object.values(SECC)) { const s = document.getElementById(v); if (s) s.hidden = id !== v; } _show(id); };
  const _puede = puedeTab;
  puedeTab = function (t) { return SECC[t] ? tienePermiso(t) : _puede(t); };
  const _abrir = abrirTab;
  abrirTab = function (t, push = true) {
    if (!SECC[t]) return _abrir(t, push);
    if (!tienePermiso(t)) { toast(SOLO_GERENTE.has(t) ? "Esa sección es solo para el puesto de Gerente" : "El gerente no te ha abierto esa sección"); return _abrir("ordenes", push); }
    show(SECC[t]); try { history.replaceState(null, "", "#" + (HASH[t] || t)); } catch (_) { }
    pintarSeguro(t);
  };
  const HASH = { gest: "gestoria" };
  // Pinta una pestaña ignorando respuestas viejas si se cambió de pestaña mientras cargaba
  let TURNO = 0;
  async function pintarSeguro(t) { const mi = ++TURNO; ACTUAL = t; const s = sec(t); if (s && !s.innerHTML.trim()) s.innerHTML = '<div class="empty">Cargando…</div>'; try { await VISTA[t](mi); } catch (e) { if (mi === TURNO) porError(t, e); } }
  const vigente = (mi) => mi === undefined || mi === TURNO;
  // Registro de pestañas nuevas desde otros archivos (Clientes 360, Incentivos, Contabilidad…)
  function registrar(t, secId, pintar, modulo) { SECC[t] = secId; TABS[t] = secId; MODULO[t] = modulo || t; VISTA[t] = pintar; }

  /* ---------------- pequeñas piezas de pantalla (las del panel) ---------------- */
  const hoy = () => hoyC();
  const kpi = (t, v, s, k) => `<div class="fn-kpi ${k || ""}"><small>${H(t)}</small><b class="num">${v}</b>${s ? `<span>${s}</span>` : ""}</div>`;
  const kpis = (a) => `<div class="pe-kpis">${a.join("")}</div>`;
  const chip = (t, c) => `<span class="chip ${c || ""}">${H(t)}</span>`;
  const euros = (c) => H(eur(c));
  const campoEur = (v) => (v ? String(Math.round(v) / 100).replace(".", ",") : "");
  const vacio = (t) => `<div class="empty">${H(t)}</div>`;
  const seg = (id, ops, v) => `<div class="segv" data-peseg="${id}" role="group">${ops.map(([k, t]) => `<button type="button" data-k="${H(k)}" aria-pressed="${k === v}">${H(t)}</button>`).join("")}</div>`;
  const tabla = (cols, filas, o = {}) => filas.length
    ? `<div class="tabla-wrap pe-t"><table class="tabla"><thead><tr>${cols.map((c) => `<th class="${c.n ? "n" : ""}">${H(c.t)}</th>`).join("")}</tr></thead><tbody>${filas.map((f) => `<tr ${o.pick ? `class="pe-pick" data-pick="${H(f[o.pick])}"` : ""}>${cols.map((c) => `<td class="${c.n ? "n num" : ""}" data-l="${H(c.t)}"><span class="v">${c.h ? c.h(f) : H(f[c.k])}</span></td>`).join("")}</tr>`).join("")}</tbody></table></div>`
    : vacio(o.vacio || "Sin datos.");
  const cabecera = (titulo, texto, acciones) => `<div class="head"><div><h1 style="font-size:28px">${H(titulo)}</h1><p>${texto}</p></div>${acciones ? `<div class="fn-acts">${acciones}</div>` : ""}</div>`;
  const dlgE = (html, listo) => {
    const d = document.createElement("dialog"); d.className = "t-dlg fn-dlg erp-dlg"; d.innerHTML = `<div class="pe-in">${html}</div>`; document.body.appendChild(d);
    d.addEventListener("close", () => d.remove()); d.addEventListener("click", (e) => { if (e.target.closest("[data-pecerrar]")) d.close(); });
    d.showModal(); if (listo) listo(d); return d;
  };
  const err = (d, m) => { const e = q(".msg.bad", d); if (e) { e.textContent = m; e.hidden = false; } else toast(m); };
  const post = (p, b) => api(p, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(b || {}) });
  const descargarCSV = (nombre, csv) => { const b = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }), a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const mesTxt = (m) => (typeof nombreMes === "function" ? nombreMes(m) : m);

  /* ---------------- datos (caché corta; se vacía al guardar) ---------------- */
  const CA = new Map();
  const cargar = (k, fn, fuerza) => { const c = CA.get(k); if (!fuerza && c && Date.now() - c.t < 45000) return c.p; const p = fn(); CA.set(k, { t: Date.now(), p }); p.catch(() => CA.delete(k)); return p; };
  const invalidar = (pref) => { for (const k of [...CA.keys()]) if (!pref || k.startsWith(pref)) CA.delete(k); };
  const resumen = (d, h) => cargar(`res:${d}:${h}`, () => api(`/api/finanzas/resumen?desde=${d}&hasta=${h}`));
  const compras = (f) => cargar("compras", () => api("/api/erp/compras"), f);
  const almacen = (f) => cargar("almacen", () => api("/api/almacen/estado"), f);
  const provN = (C, id) => (C.proveedores.find((p) => p.id === id) || { nombre: "—" }).nombre;
  let ACTUAL = "";
  const recargar = () => { if (ACTUAL) pintarSeguro(ACTUAL); };
  const sec = (t) => document.getElementById(SECC[t]);
  const soyGerente = () => esGerente();
  const porError = (t, e) => { const s = sec(t); if (s) s.innerHTML = cabecera(({ gest: "Gestoría", banco: "Banco", compras: "Compras", cli: "Clientes 360", inc: "Incentivos", mcar: "Margen y documentos", conta: "Contabilidad", perm: "Permisos" })[t] || "ERP", "") + `<div class="msg bad">${H(e.message)}</div><div class="pe-barra"><button class="btn b-ghost" type="button" data-pereintentar>Reintentar</button>${typeof window.diagnosticoServidor === "function" ? '<button class="btn b-ghost" type="button" data-pediag>Diagnóstico</button>' : ""}</div>`; };

  /* =====================================================================
     COMPRAS
     ===================================================================== */
  const CO = { sub: "pedidos", rec: { filtro: "pedir", plazo: 7, margen: 7 } };
  const PED_T = { borrador: ["Borrador", "c-piedra"], enviado: ["Pedido al proveedor", "c-gris"], parcial: ["Recibido en parte", "c-ambar"], recibido: ["Recibido", "c-verde"], cancelado: ["Cancelado", "c-piedra"] };
  const pedTotal = (p) => E.lineasTotal(p.lineas);
  const chipPed = (p) => (p.estado === "borrador" && p.aprobacion && p.aprobacion.estado === "pendiente" ? chip("Esperando aprobación", "c-ambar") : p.estado === "borrador" && p.aprobacion && p.aprobacion.estado === "rechazado" ? chip("Rechazado", "c-magma") : chip(...PED_T[p.estado]));
  const chipFac = (f, d) => (f.estado === "pagada" ? chip("Pagada", "c-verde") : f.estado === "anulada" ? chip("Anulada", "c-piedra") : f.vence < d ? chip("Vencida", "c-magma") : chip("Pendiente", "c-ambar"));

  async function pintarCompras(mi) {
    ACTUAL = "compras"; const s = sec("compras"), d = hoy();
    try {
      const C = await compras(true), sb = CO.sub;
      const facs = C.facturas.map((f) => ({ ...f, proveedor: provN(C, f.proveedor) })), deuda = E.deudaProveedores(facs, d), pend = C.facturas.filter((f) => f.estado === "pendiente"), venc = pend.filter((f) => f.vence < d);
      const porAprobar = C.pedidos.filter((p) => p.estado === "borrador" && p.aprobacion && p.aprobacion.estado === "pendiente"), sinStock = C.albaranes.filter((a) => a.stock.estado === "pendiente"), abiertos = C.pedidos.filter((p) => ["enviado", "parcial"].includes(p.estado));
      const acc = { pedidos: '<button class="btn b-acc b-sm" type="button" data-pe="nped">+ Pedido al proveedor</button>', facturas: '<button class="btn b-acc b-sm" type="button" data-pe="nfac">+ Factura de proveedor</button>', proveedores: '<button class="btn b-acc b-sm" type="button" data-pe="nprov">+ Proveedor</button>' }[sb] || "";
      let cuerpo = "";
      if (sb === "pedidos") cuerpo = tabla([{ t: "Nº", k: "num" }, { t: "Fecha", h: (p) => fechaES(p.fecha) }, { t: "Proveedor", h: (p) => H(provN(C, p.proveedor)) }, { t: "Total sin IGIC", n: 1, h: (p) => euros(pedTotal(p)) }, { t: "Estado", h: chipPed }], C.pedidos, { pick: "id", vacio: "Todavía no hay pedidos. Pulsa «+ Pedido al proveedor»." });
      else if (sb === "facturas") cuerpo = tabla([{ t: "Fecha", h: (f) => fechaES(f.fecha) }, { t: "Proveedor", k: "proveedor" }, { t: "Nº", k: "num" }, { t: "Total", n: 1, h: (f) => euros(f.total) }, { t: "Vence", h: (f) => fechaES(f.vence) }, { t: "Estado", h: (f) => chipFac(f, d) }], facs, { pick: "id", vacio: "No hay facturas de proveedor registradas." });
      else if (sb === "proveedores") cuerpo = tabla([{ t: "Proveedor", h: (p) => `<b>${H(p.nombre)}</b>${p.activo ? "" : " " + chip("de baja", "c-piedra")}<br><small>${H(p.nif)}</small>` }, { t: "Contacto", h: (p) => H(p.telefono) + "<br>" + H(p.email) }, { t: "Plazo de pago", n: 1, h: (p) => p.plazoDias + " días" }, { t: "Pedidos", n: 1, h: (p) => C.pedidos.filter((x) => x.proveedor === p.id).length }], C.proveedores, { pick: "id", vacio: "Da de alta a tu primer proveedor." });
      else if (sb === "deuda") cuerpo = tabla([{ t: "Proveedor", k: "proveedor" }, { t: "Facturas", n: 1, k: "n" }, { t: "Total", n: 1, h: (x) => euros(x.total) }, { t: "Vencido", n: 1, h: (x) => (x.vencida ? `<b class="pe-mal">${euros(x.vencida)}</b>` : "—") }, { t: "Primer vencimiento", h: (x) => fechaES(x.primera) || "—" }], deuda, { vacio: "No debes nada a ningún proveedor." });
      else cuerpo = await htmlReposicion(C);
      if (!vigente(mi)) return;
      s.innerHTML = cabecera("Compras", "Para lo que compráis vosotros (piezas y material del taller y de la preparación de coches): pedido al proveedor → mercancía recibida (entra sola al inventario) → factura del proveedor → pago (se apunta en Finanzas), sin duplicar nada.", acc)
        + kpis([kpi("Debo a proveedores", euros(deuda.reduce((a, x) => a + x.total, 0)), pend.length + " factura(s) pendiente(s)", venc.length ? "neg" : ""), kpi("Vencido", euros(deuda.reduce((a, x) => a + x.vencida, 0)), venc.length ? venc.length + " factura(s)" : "Nada vencido", venc.length ? "neg" : ""), kpi("Vence en 7 días", euros(deuda.reduce((a, x) => a + x.proxima, 0))), kpi("Pedidos por recibir", String(abiertos.length), abiertos.length ? "Ya pedidos, esperando mercancía" : "Ninguno")])
        + (porAprobar.length && soyGerente() ? `<div class="msg pe-aviso">${porAprobar.length} pedido(s) esperan tu aprobación por ser de un importe grande. <button class="btn b-ghost b-sm" type="button" data-pe="verpend" data-id="${H(porAprobar[0].id)}">Revisar</button></div>` : "")
        + (sinStock.length ? `<div class="msg pe-aviso">${sinStock.length} albarán(es) recibido(s) cuya mercancía NO se ha dado de alta en el inventario. <button class="btn b-ghost b-sm" type="button" data-pe="stock" data-id="${H(sinStock[0].id)}">Dar entrada ahora</button></div>` : "")
        + `<div class="pe-barra">${seg("csub", [["pedidos", "Pedidos"], ["facturas", "Facturas"], ["proveedores", "Proveedores"], ["deuda", "Lo que debo"], ["rep", "Reposición"]], sb)}</div><div class="card pe-card">${cuerpo}</div>`;
    } catch (e) { porError("compras", e); }
  }

  /* ---- reposición inteligente (Inventario + consumo real) ---- */
  async function htmlReposicion(C) {
    const d = hoy(), r = CO.rec, ventanas = [0, 1, 2].map((i) => [addDias(d, -30 * (i + 1) + 1), i ? addDias(d, -30 * i) : d]);
    const [A, Ms] = await Promise.all([almacen(true), Promise.all(ventanas.map(([a, b]) => api(`/api/almacen/movimientos?desde=${a}&hasta=${b}`).catch(() => ({ movimientos: [] }))))]);
    const visto = new Set(), movs = Ms.flatMap((M) => (Array.isArray(M) ? M : M.movimientos || [])).filter((m) => { const k = (m.id || "") + "|" + m.t + "|" + m.sku + "|" + m.cantidad; if (visto.has(k)) return false; visto.add(k); return true; });
    const L = E.reposicion(A.piezas, movs, d, { plazoDias: r.plazo, margenDias: r.margen }); CO._L = L; CO._C = C;
    const f = r.filtro, lista = L.filter((x) => (f === "pedir" ? x.pedir > 0 : f === "bajo" ? x.bajoMinimo : f === "parados" ? x.parado : f === "sinmin" ? x.sinMinimo : true)).sort((a, b) => (b.pedir > 0) - (a.pedir > 0) || (a.cobertura ?? 9999) - (b.cobertura ?? 9999));
    const nPed = L.filter((x) => x.pedir > 0).length, parados = L.filter((x) => x.parado);
    return `<p class="hint">Calcula lo que debes pedir con lo que realmente gastas (últimos 90 días) y lo que tarda el proveedor. No cambia el inventario: solo te deja pedidos en borrador.</p>
      ${kpis([kpi("A pedir ahora", String(nPed), nPed ? "Se acaban antes de que llegue el pedido" : "Nada urgente", nPed ? "neg" : ""), kpi("Bajo mínimo", String(L.filter((x) => x.bajoMinimo).length)), kpi("Sin mínimo y con consumo", String(L.filter((x) => x.sinMinimo).length), "Conviene ponerles mínimo"), kpi("Dinero parado", euros(parados.reduce((a, x) => a + x.valorParado, 0)), parados.length + " pieza(s) sin salida en 6 meses")])}
      <div class="pe-barra">${seg("rf", [["pedir", "A pedir"], ["bajo", "Bajo mínimo"], ["sinmin", "Sin mínimo"], ["parados", "Parados"], ["todas", "Todas"]], f)}
        <label class="pe-mini">Plazo del proveedor <input class="in num" id="pe-pl" inputmode="numeric" value="${r.plazo}"> días</label><label class="pe-mini">Margen <input class="in num" id="pe-ma" inputmode="numeric" value="${r.margen}"> días</label>${nPed ? '<button class="btn b-acc b-sm" type="button" data-pe="crearsug">Crear pedidos sugeridos</button>' : ""}</div>`
      + tabla([{ t: "Pieza", h: (x) => `<b>${H(x.nombre)}</b><br><small>${H(x.sku)}${x.proveedor ? " · " + H(x.proveedor) : ""}</small>` }, { t: "Stock", n: 1, h: (x) => String(x.stock).replace(".", ",") }, { t: "Mín.", n: 1, h: (x) => String(x.minimo) }, { t: "Gasto 90 d", n: 1, h: (x) => String(Math.round(x.consumo * 10) / 10).replace(".", ",") }, { t: "Dura", n: 1, h: (x) => (x.cobertura == null ? "—" : x.cobertura + " d") }, { t: "Mín. sugerido", n: 1, h: (x) => (x.sugerido ? x.sugerido : "—") }, { t: "Pedir", n: 1, h: (x) => (x.pedir ? `<b class="pe-mal">${x.pedir}</b>` : "—") }, { t: "", h: (x) => (x.bajoMinimo ? chip("Bajo mínimo", "c-magma") : "") + (x.sinMinimo ? chip("Sin mínimo", "c-ambar") : "") + (x.parado ? chip("Parado", "c-piedra") : "") }], lista.slice(0, 400), { vacio: "Nada con este filtro." });
  }

  /* ---- formularios ---- */
  function formProveedor(p) {
    dlgE(`<form novalidate><h2>${p ? "Editar proveedor" : "Nuevo proveedor"}</h2><div class="field"><label for="pp-n">Nombre *</label><input class="in" id="pp-n" maxlength="120" value="${H(p ? p.nombre : "")}"></div>
      <div class="t-g2"><div class="field"><label for="pp-nif">NIF / CIF</label><input class="in" id="pp-nif" maxlength="20" value="${H(p ? p.nif : "")}"></div><div class="field"><label for="pp-pl">Plazo de pago (días)</label><input class="in num" id="pp-pl" inputmode="numeric" value="${p ? p.plazoDias : 30}"></div>
      <div class="field"><label for="pp-t">Teléfono</label><input class="in" id="pp-t" maxlength="30" value="${H(p ? p.telefono : "")}"></div><div class="field"><label for="pp-e">Correo</label><input class="in" id="pp-e" maxlength="120" value="${H(p ? p.email : "")}"></div></div>
      <div class="field"><label for="pp-d">Dirección</label><input class="in" id="pp-d" maxlength="200" value="${H(p ? p.direccion : "")}"></div><div class="field"><label for="pp-no">Notas</label><input class="in" id="pp-no" maxlength="500" value="${H(p ? p.notas : "")}"></div><div class="msg bad" hidden></div>
      <div class="t-dlg-acts">${p && soyGerente() ? `<button class="btn b-ghost" type="button" data-pebaja>${p.activo ? "Dar de baja" : "Reactivar"}</button>` : ""}<button class="btn b-ghost" type="button" data-pecerrar>Cancelar</button><button class="btn b-acc" type="submit">Guardar</button></div></form>`, (d) => {
      q("form", d).onsubmit = async (e) => { e.preventDefault(); try { await post("/api/erp/proveedor" + (p ? "/" + p.id : ""), { nombre: q("#pp-n", d).value, nif: q("#pp-nif", d).value, plazoDias: q("#pp-pl", d).value, telefono: q("#pp-t", d).value, email: q("#pp-e", d).value, direccion: q("#pp-d", d).value, notas: q("#pp-no", d).value }); d.close(); toast("Proveedor guardado"); invalidar("compras"); recargar(); } catch (x) { err(d, x.message); } };
      const bj = q("[data-pebaja]", d); if (bj) bj.onclick = async () => { try { await post("/api/erp/proveedor-baja/" + p.id, { activo: !p.activo }); d.close(); invalidar("compras"); recargar(); } catch (x) { err(d, x.message); } };
    });
  }
  async function formPedido(C, base) {
    if (!C.proveedores.some((p) => p.activo)) return toast("Primero da de alta un proveedor.");
    const al = await almacen().catch(() => null), piezas = al ? al.piezas : [], lineas = base && base.lineas ? base.lineas.map((l) => ({ ...l })) : [{ ref: "", desc: "", pieza: "", n: 1, precio: 0 }];
    const d = dlgE(`<form novalidate><h2>${base && base.id ? "Editar pedido " + H(base.num) : "Nuevo pedido de compra"}</h2><div class="t-g2"><div class="field"><label for="po-p">Proveedor *</label><select class="in" id="po-p">${C.proveedores.filter((p) => p.activo).map((p) => `<option value="${p.id}" ${base && base.proveedor === p.id ? "selected" : ""}>${H(p.nombre)}</option>`).join("")}</select></div><div class="field"><label for="po-f">Fecha</label><input class="in" type="date" id="po-f" max="${addDias(hoy(), 1)}" value="${H((base && base.fecha) || hoy())}"></div></div>
      <label class="pe-lab">Líneas</label><div id="po-l"></div><button class="btn b-ghost b-sm" type="button" id="po-add">+ Añadir línea</button><datalist id="po-dl">${piezas.map((p) => `<option value="${H(p.nombre)} · ${H(p.sku)}"></option>`).join("")}</datalist>
      <p class="pe-tot">Total sin IGIC: <b class="num" id="po-tot"></b></p><div class="field"><label for="po-n">Notas</label><input class="in" id="po-n" maxlength="500" value="${H((base && base.notas) || "")}"></div><div class="msg bad" hidden></div>
      <div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cancelar</button><button class="btn b-acc" type="submit">Guardar borrador</button></div></form>`);
    const pintar = () => { q("#po-l", d).innerHTML = lineas.map((l, i) => `<div class="pe-lin"><input class="in" list="po-dl" data-i="${i}" data-k="desc" placeholder="Pieza o concepto (escribe y elige del inventario)" value="${H(l.desc)}"><div class="pe-lin-b"><input class="in num" inputmode="decimal" data-i="${i}" data-k="n" aria-label="Cantidad" value="${H(String(l.n).replace(".", ","))}"><input class="in num" inputmode="decimal" data-i="${i}" data-k="precio" aria-label="Precio unidad sin IGIC" placeholder="€ ud." value="${H(campoEur(l.precio))}"><input class="in" data-i="${i}" data-k="ref" aria-label="Referencia" placeholder="Referencia" value="${H(l.ref)}"><span class="num pe-imp">${euros(Math.round((Number(l.n) || 0) * (l.precio || 0)))}</span><button class="btn b-ghost b-sm" type="button" data-x="${i}" aria-label="Quitar línea">✕</button></div></div>`).join(""); q("#po-tot", d).textContent = eur(E.lineasTotal(lineas)); };
    pintar();
    d.addEventListener("input", (e) => { const t = e.target.closest("[data-i]"); if (!t) return; const l = lineas[+t.dataset.i], k = t.dataset.k;
      if (k === "desc") { const p = piezas.find((x) => `${x.nombre} · ${x.sku}` === t.value); if (p) { l.desc = p.nombre; l.ref = p.sku; l.pieza = p.id; if (!l.precio && p.coste) l.precio = p.coste; pintar(); return; } l.desc = t.value; l.pieza = ""; }
      else if (k === "n") l.n = Number(String(t.value).replace(",", ".")) || 0; else if (k === "precio") { const c = cent(t.value); l.precio = Number.isFinite(c) ? c : 0; } else l.ref = t.value;
      q("#po-tot", d).textContent = eur(E.lineasTotal(lineas)); });
    d.addEventListener("change", (e) => { if (e.target.closest("[data-i]")) pintar(); });
    d.addEventListener("click", (e) => { const x = e.target.closest("[data-x]"); if (x) { lineas.splice(+x.dataset.x, 1); if (!lineas.length) lineas.push({ ref: "", desc: "", pieza: "", n: 1, precio: 0 }); pintar(); } });
    q("#po-add", d).onclick = () => { lineas.push({ ref: "", desc: "", pieza: "", n: 1, precio: 0 }); pintar(); };
    q("form", d).onsubmit = async (e) => { e.preventDefault(); try { const r = await post("/api/erp/pedido" + (base && base.id ? "/" + base.id : ""), { proveedor: q("#po-p", d).value, fecha: q("#po-f", d).value, notas: q("#po-n", d).value, lineas: lineas.filter((l) => l.desc.trim()).map((l) => ({ ref: l.ref, desc: l.desc, pieza: l.pieza, n: l.n, precio: l.precio })) }); d.close(); toast("Pedido " + r.pedido.num + " guardado"); invalidar("compras"); recargar(); } catch (x) { err(d, x.message); } };
  }
  function verPedido(C, p) {
    const alb = C.albaranes.filter((a) => a.pedido === p.id), prov = C.proveedores.find((x) => x.id === p.proveedor);
    dlgE(`<h2>Pedido ${H(p.num)} ${chipPed(p)}</h2><p class="hint">${H(prov ? prov.nombre : "—")} · ${fechaES(p.fecha)}</p>
      ${tabla([{ t: "Pieza", h: (l) => `${H(l.desc)}<br><small>${H(l.ref)}${l.pieza ? " · del inventario" : ""}</small>` }, { t: "Pedido", n: 1, h: (l) => String(l.n).replace(".", ",") }, { t: "Recibido", n: 1, h: (l) => String(l.recibido).replace(".", ",") }, { t: "Precio", n: 1, h: (l) => euros(l.precio) }, { t: "Importe", n: 1, h: (l) => euros(Math.round(l.n * l.precio)) }], p.lineas)}
      <p class="pe-tot">Total sin IGIC: <b class="num">${euros(pedTotal(p))}</b></p>${p.notas ? `<p class="hint">${H(p.notas)}</p>` : ""}${p.aprobacion && p.aprobacion.estado === "pendiente" ? `<div class="msg pe-aviso">Pedido de importe grande: ${H(p.aprobacion.por)} lo ha pedido y espera el visto bueno del gerente.</div>` : ""}${p.aprobacion && p.aprobacion.estado === "rechazado" ? `<div class="msg bad">El gerente lo ha rechazado: ${H(p.aprobacion.motivo || "")}. Puedes editarlo y volver a pedirlo.</div>` : ""}
      ${alb.length ? `<h3 class="pe-h3">Mercancía recibida</h3>${tabla([{ t: "Fecha", h: (a) => fechaES(a.fecha) }, { t: "Albarán", k: "numProv" }, { t: "Importe", n: 1, h: (a) => euros(a.importe) }, { t: "Inventario", h: (a) => (a.stock.estado === "ok" ? chip("Dado de alta", "c-verde") : a.stock.estado === "sin-pieza" ? chip("Sin piezas de inventario", "c-piedra") : `<button class="btn b-acc b-sm" type="button" data-pe="stock" data-id="${H(a.id)}">Dar entrada</button>`) }, { t: "Factura", h: (a) => (a.facturaId ? chip("Facturado", "c-verde") : chip("Sin factura", "c-ambar")) }], alb)}` : ""}<div class="msg bad" hidden></div>
      <div class="t-dlg-acts">${p.estado === "borrador" && !(p.aprobacion && p.aprobacion.estado === "pendiente") ? '<button class="btn b-ghost" type="button" data-x1="edit">Editar</button><button class="btn b-acc" type="button" data-x1="env">Marcar como pedido al proveedor</button>' : ""}${p.estado === "borrador" && p.aprobacion && p.aprobacion.estado === "pendiente" && soyGerente() ? '<button class="btn b-acc" type="button" data-x1="apr">Aprobar</button><button class="btn b-ghost" type="button" data-x1="rech">Rechazar…</button>' : ""}${["enviado", "parcial"].includes(p.estado) ? '<button class="btn b-acc" type="button" data-x1="rec">Recibir mercancía</button>' : ""}${["borrador", "enviado"].includes(p.estado) && !alb.length && !(p.aprobacion && p.aprobacion.estado === "pendiente" && !soyGerente()) ? '<button class="btn b-ghost" type="button" data-x1="canc">Cancelar pedido</button>' : ""}${alb.some((a) => !a.facturaId) ? '<button class="btn b-ghost" type="button" data-x1="fac">Registrar factura</button>' : ""}<button class="btn b-ghost" type="button" data-pecerrar>Cerrar</button></div>`, (d) => {
      d.addEventListener("click", async (e) => { const b = e.target.closest("[data-x1]"); if (!b) return; const a = b.dataset.x1;
        try {
          if (a === "edit") { d.close(); formPedido(C, p); }
          else if (a === "env") { const r = await post("/api/erp/pedido-estado/" + p.id, { estado: "enviado" }); d.close(); toast(r.pendienteAprobacion ? "Es un pedido grande: el gerente tiene que aprobarlo antes de pedirlo" : "Marcado como pedido al proveedor"); invalidar("compras"); recargar(); }
          else if (a === "apr") { await post("/api/erp/pedido-aprobar/" + p.id); d.close(); toast("Pedido aprobado y marcado como pedido al proveedor"); invalidar("compras"); recargar(); }
          else if (a === "rech") { const m = prompt("Motivo del rechazo (mínimo 5 letras):"); if (!m) return; await post("/api/erp/pedido-rechazar/" + p.id, { motivo: m }); d.close(); toast("Pedido rechazado"); invalidar("compras"); recargar(); }
          else if (a === "canc") { if (!confirm("¿Cancelar el pedido " + p.num + "?")) return; await post("/api/erp/pedido-estado/" + p.id, { estado: "cancelado" }); d.close(); invalidar("compras"); recargar(); }
          else if (a === "rec") { d.close(); formRecibir(C, p); }
          else if (a === "fac") { d.close(); formFactura(C, { proveedor: p.proveedor, pedido: p.id }); }
        } catch (x) { err(d, x.message); } });
    });
  }
  function formRecibir(C, p) {
    const pend = p.lineas.map((l, i) => ({ i, l, falta: Math.round((l.n - l.recibido) * 1000) / 1000 })).filter((x) => x.falta > 0);
    dlgE(`<form novalidate><h2>Recibir mercancía · ${H(p.num)}</h2><p class="hint">Pon lo que llega ahora (puede ser solo una parte). Lo que tenga pieza del inventario suma stock solo.</p>
      <div class="t-g2"><div class="field"><label for="re-n">Nº del albarán del proveedor *</label><input class="in" id="re-n" maxlength="40"></div><div class="field"><label for="re-f">Fecha de recepción</label><input class="in" type="date" id="re-f" max="${hoy()}" value="${hoy()}"></div></div>
      ${pend.map((x) => `<div class="pe-lin"><b>${H(x.l.desc)}</b> <small>faltan ${String(x.falta).replace(".", ",")}</small><input class="in num" style="max-width:130px" inputmode="decimal" data-rl="${x.i}" value="${String(x.falta).replace(".", ",")}" aria-label="Cantidad recibida de ${H(x.l.desc)}"></div>`).join("")}<div class="msg bad" hidden></div>
      <div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cancelar</button><button class="btn b-acc" type="submit" id="re-ok">Registrar recepción</button></div></form>`, (d) => {
      q("form", d).onsubmit = async (e) => { e.preventDefault(); const b = q("#re-ok", d); b.disabled = true;
        try { const r = await post("/api/erp/albaran", { pedido: p.id, numProv: q("#re-n", d).value, fecha: q("#re-f", d).value, lineas: qa("[data-rl]", d).map((i) => ({ i: +i.dataset.rl, n: String(i.value).replace(",", ".") })) });
          invalidar("compras"); d.close(); await darEntrada(C, r.albaran.id, r.albaran, p.proveedor); recargar(); } catch (x) { err(d, x.message); b.disabled = false; } };
    });
  }
  // Suma el stock con la misma ruta que «Entrada de material» del Inventario
  async function darEntrada(C, albId, alb, provId) {
    alb = alb || (await compras(true)).albaranes.find((a) => a.id === albId);
    if (!alb || alb.stock.estado === "ok" || alb.stock.estado === "sin-pieza") return toast("Recepción registrada");
    const prov = provN(C || (await compras()), provId || alb.proveedor), lineas = alb.lineas.filter((l) => l.pieza).map((l) => ({ pieza: l.pieza, cantidad: String(l.n).replace(".", ","), coste: campoEur(l.precio) || "" }));
    try { await post("/api/almacen/entrada", { albaran: alb.numProv, proveedor: prov, lineas }); await post("/api/erp/albaran-stock/" + alb.id, { ok: true }); invalidar("almacen"); invalidar("compras"); toast("Recepción registrada y stock actualizado"); if (typeof alCargar === "function") alCargar().catch(() => { }); }
    catch (x) { invalidar("compras"); toast("Albarán guardado, pero NO se dio entrada en el inventario (" + x.message + "). Pulsa «Dar entrada» para reintentarlo."); }
  }
  function formFactura(C, base) {
    const b = base || {}, f0 = b.id ? b : null, sinFac = C.albaranes.filter((a) => (!a.facturaId || (f0 && a.facturaId === f0.id)) && (!b.pedido || a.pedido === b.pedido) && (!b.proveedor || a.proveedor === b.proveedor));
    const d = dlgE(`<form novalidate><h2>${f0 ? "Editar factura de proveedor" : "Factura de proveedor"}</h2><div class="t-g2"><div class="field"><label for="fa-p">Proveedor *</label><select class="in" id="fa-p">${C.proveedores.filter((p) => p.activo || p.id === b.proveedor).map((p) => `<option value="${p.id}" ${b.proveedor === p.id ? "selected" : ""}>${H(p.nombre)}</option>`).join("")}</select></div><div class="field"><label for="fa-n">Nº de factura *</label><input class="in" id="fa-n" maxlength="40" value="${H(b.num || "")}"></div>
      <div class="field"><label for="fa-f">Fecha *</label><input class="in" type="date" id="fa-f" max="${hoy()}" value="${H(b.fecha || hoy())}"></div><div class="field"><label for="fa-v">Vence</label><input class="in" type="date" id="fa-v" value="${H(b.vence || "")}"></div>
      <div class="field"><label for="fa-b">Base imponible (€) *</label><input class="in num" inputmode="decimal" id="fa-b" value="${H(campoEur(b.base))}" placeholder="0,00"></div><div class="field"><label for="fa-i">Impuesto</label><select class="in" id="fa-i">${FN_IMP.map(([v, t]) => `<option value="${v}" ${String(b.igicPct ?? 7) === v ? "selected" : ""}>${t}</option>`).join("")}</select></div></div>
      <p class="pe-tot">Total: <b class="num" id="fa-t"></b></p><div class="field"><label for="fa-c">Concepto *</label><input class="in" id="fa-c" maxlength="300" value="${H(b.concepto || "")}" placeholder="Qué se compra (mín. 5 letras)"></div>
      ${sinFac.length ? `<label class="pe-lab">Albaranes que cubre esta factura</label>${sinFac.map((a) => `<label class="t-chk"><input type="checkbox" data-alb="${a.id}" data-imp="${a.importe}" ${b.albaranes ? (b.albaranes.includes(a.id) ? "checked" : "") : (b.pedido ? "checked" : "")}><span>${H(a.numProv)} · ${fechaES(a.fecha)} · ${euros(a.importe)}</span></label>`).join("")}` : ""}
      ${fnAdjuntoUI("fa-adj", false)}<div class="msg bad" hidden></div><div class="t-dlg-acts">${f0 && soyGerente() ? '<button class="btn b-ghost" type="button" data-anular>Anular factura</button>' : ""}<button class="btn b-ghost" type="button" data-pecerrar>Cancelar</button><button class="btn b-acc" type="submit">Guardar</button></div></form>`);
    fnAdjuntoBind("fa-adj"); if (f0 && f0.adjunto) { q("#fa-adj").dataset.key = f0.adjunto; const ok = q("#fa-adj .fn-adj-ok"); if (ok) { ok.hidden = false; ok.textContent = "✓ Ya hay un archivo adjunto"; } }
    const tot = () => { const c = cent(q("#fa-b", d).value), p = Number(q("#fa-i", d).value); q("#fa-t", d).textContent = Number.isFinite(c) && c > 0 ? eur(E.totalFactura(c, p).total) + "  (IGIC " + eur(E.totalFactura(c, p).igic) + ")" : "—"; };
    q("#fa-b", d).oninput = tot; q("#fa-i", d).onchange = tot; tot();
    const suma = () => qa("[data-alb]:checked", d).reduce((a, x) => a + Number(x.dataset.imp), 0);
    qa("[data-alb]", d).forEach((c) => (c.onchange = () => { if (!q("#fa-b", d).value.trim()) { const s = suma(); if (s) { q("#fa-b", d).value = campoEur(s); tot(); } } }));
    if (!f0 && b.pedido && !b.base) { const s = suma(); if (s) { q("#fa-b", d).value = campoEur(s); tot(); } }
    q("form", d).onsubmit = async (e) => { e.preventDefault(); const bs = cent(q("#fa-b", d).value); if (!Number.isFinite(bs)) return err(d, "Escribe la base imponible.");
      try { await post("/api/erp/factura" + (f0 ? "/" + f0.id : ""), { proveedor: q("#fa-p", d).value, num: q("#fa-n", d).value, fecha: q("#fa-f", d).value, vence: q("#fa-v", d).value, base: bs, igicPct: q("#fa-i", d).value, concepto: q("#fa-c", d).value, pedido: b.pedido || (f0 ? f0.pedido : ""), albaranes: qa("[data-alb]:checked", d).map((x) => x.dataset.alb), adjunto: q("#fa-adj", d).dataset.key }); d.close(); toast("Factura guardada"); invalidar("compras"); recargar(); } catch (x) { err(d, x.message); } };
    const an = q("[data-anular]", d); if (an) an.onclick = async () => { const m = prompt("Motivo de la anulación (mínimo 5 letras):"); if (!m) return; try { await post("/api/erp/factura-anular/" + f0.id, { motivo: m }); d.close(); invalidar("compras"); recargar(); } catch (x) { err(d, x.message); } };
  }
  function verFactura(C, f) {
    const prov = C.proveedores.find((p) => p.id === f.proveedor) || { nombre: "—" }, d0 = hoy();
    dlgE(`<h2>Factura ${H(f.num)} ${chipFac(f, d0)}</h2><p class="hint">${H(prov.nombre)} · ${fechaES(f.fecha)} · vence ${fechaES(f.vence)}</p>
      ${kpis([kpi("Base", euros(f.base)), kpi("IGIC " + String(f.igicPct).replace(".", ",") + " %", euros(f.igic)), kpi("Total", euros(f.total), "", "hero")])}<p>${H(f.concepto)}</p>${f.adjunto ? `<p><a target="_blank" rel="noopener" href="${FOTO(f.adjunto)}">Ver factura adjunta</a></p>` : ""}
      ${f.pagos.length ? `<div class="msg pe-ok">Pagada el ${fechaES(f.pagos[0].fecha)} (${H(f.pagos[0].metodo)}). Ya está en Finanzas.</div>` : ""}${f.anulada ? `<div class="msg bad">Anulada: ${H(f.anulada.motivo)}</div>` : ""}
      <div class="t-dlg-acts">${f.estado === "pendiente" ? '<button class="btn b-ghost" type="button" data-x1="edit">Editar</button>' + (soyGerente() ? '<button class="btn b-acc" type="button" data-x1="pagar">Pagar y apuntar en Finanzas</button>' : "") : ""}<button class="btn b-ghost" type="button" data-pecerrar>Cerrar</button></div>`, (d) => {
      d.addEventListener("click", (e) => { const b = e.target.closest("[data-x1]"); if (!b) return; d.close(); if (b.dataset.x1 === "edit") formFactura(C, f); else formPagar(C, f, prov); });
    });
  }
  function formPagar(C, f, prov, gastoPrevio) {
    const d = dlgE(`<form novalidate><h2>Pagar ${H(f.num)} · ${euros(f.total)}</h2><p class="hint">Se crea el gasto en Finanzas (categoría, IGIC y factura) y la factura queda pagada. En efectivo sale de la caja de hoy.</p>
      <div class="field"><label>¿Cómo se paga?</label>${fnSeg("pg-m", FN_PAGO, "transferencia")}</div>
      <div class="t-g2"><div class="field"><label for="pg-f">Fecha del pago</label><input class="in" type="date" id="pg-f" max="${hoy()}" value="${hoy()}"></div><div class="field"><label for="pg-c">Categoría en Finanzas</label><select class="in" id="pg-c">${FN_CAT.map(([g, gt, l]) => `<optgroup label="${H(gt)}">${l.map(([k, t]) => `<option value="${k}" ${k === f.categoria ? "selected" : ""}>${H(t)}</option>`).join("")}</optgroup>`).join("")}</select></div></div>
      ${fnAdjuntoUI("pg-adj", true)}${gastoPrevio ? `<div class="msg pe-aviso">El gasto ya se creó en Finanzas (${H(gastoPrevio)}). Falta ligarlo a la factura: pulsa «Reintentar».</div>` : ""}<div class="msg bad" hidden></div>
      <div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cancelar</button><button class="btn b-acc" type="submit" id="pg-ok">${gastoPrevio ? "Reintentar" : "Pagar"}</button></div></form>`);
    fnSegBind("pg-m"); fnAdjuntoBind("pg-adj"); if (f.adjunto) { q("#pg-adj").dataset.key = f.adjunto; const ok = q("#pg-adj .fn-adj-ok"); if (ok) { ok.hidden = false; ok.textContent = "✓ Ya hay un archivo adjunto"; } }
    q("form", d).onsubmit = async (e) => { e.preventDefault(); const bt = q("#pg-ok", d); bt.disabled = true; let gid = gastoPrevio || ""; const metodo = fnSegVal("pg-m") || "transferencia";
      try {
        if (!gid) {
          const adj = q("#pg-adj", d).dataset.key; if (!adj) throw new Error("Adjunta la foto o el PDF de la factura: Finanzas lo exige para cualquier gasto.");
          const r = await post("/api/finanzas/gasto", { fecha: q("#pg-f", d).value, categoria: q("#pg-c", d).value, area: f.area, proveedor: prov.nombre, factura: f.num, concepto: ("Factura " + f.num + " · " + f.concepto).slice(0, 300), base: (f.base / 100).toFixed(2), impuestoPct: String(f.igicPct), metodo, adjunto: adj });
          gid = r.gasto.id;
        }
        try { await post("/api/erp/factura-pagar/" + f.id, { gastoId: gid, metodo, fecha: q("#pg-f", d).value }); }
        catch (x) { d.close(); invalidar(); formPagar(C, f, prov, gid); toast("El gasto se creó pero no se pudo ligar a la factura: " + x.message); return; }
        invalidar(); d.close(); toast("Factura pagada y apuntada en Finanzas"); recargar(); if (typeof fnAbrirTab === "function") { /* Finanzas se refresca sola al abrirla */ }
      } catch (x) { err(d, x.message); bt.disabled = false; } };
  }
  async function crearSugeridos() {
    const L = CO._L, C = CO._C; if (!L || !C) return; const por = new Map();
    for (const x of L.filter((z) => z.pedir > 0)) { const k = (x.proveedor || "").trim().toLowerCase(), pv = C.proveedores.find((p) => p.activo && p.nombre.trim().toLowerCase() === k), g = por.get(pv ? pv.id : "?" + k) || { prov: pv || null, nombre: x.proveedor, lineas: [] }; g.lineas.push({ ref: x.sku, desc: x.nombre, pieza: x.id, n: x.pedir, precio: x.coste || 0 }); por.set(pv ? pv.id : "?" + k, g); }
    const ok = [...por.values()].filter((g) => g.prov), sin = [...por.values()].filter((g) => !g.prov);
    dlgE(`<h2>Pedidos sugeridos</h2><p class="hint">Se crean como <b>borrador</b>: tú los revisas y, cuando los pidas, los marcas como pedido al proveedor.</p>${ok.map((g) => `<div class="pe-lin"><b>${H(g.prov.nombre)}</b> · ${g.lineas.length} pieza(s) · ${euros(E.lineasTotal(g.lineas))}<br><small>${H(g.lineas.map((l) => l.n + " × " + l.desc).join(", "))}</small></div>`).join("")}${sin.length ? `<div class="msg pe-aviso">Sin proveedor dado de alta (no se crean): ${H(sin.map((g) => (g.nombre || "(sin proveedor)") + " — " + g.lineas.length + " pieza(s)").join("; "))}. Dalos de alta en Proveedores con el mismo nombre que tienes en el inventario.</div>` : ""}<div class="msg bad" hidden></div>
      <div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cancelar</button>${ok.length ? '<button class="btn b-acc" type="button" id="su-ok">Crear borradores</button>' : ""}</div>`, (d) => {
      const bt = q("#su-ok", d); if (bt) bt.onclick = async () => { bt.disabled = true; let n = 0; try { for (const g of ok) { await post("/api/erp/pedido", { proveedor: g.prov.id, fecha: hoy(), lineas: g.lineas, notas: "Pedido sugerido por consumo de los últimos 90 días" }); n++; } d.close(); invalidar("compras"); toast(n + " pedido(s) en borrador."); CO.sub = "pedidos"; recargar(); } catch (x) { err(d, x.message + (n ? ` (ya se crearon ${n})` : "")); bt.disabled = false; } };
    });
  }

  /* =====================================================================
     BANCO
     ===================================================================== */
  const BA = { filtro: "pend", rango: "90" };
  const refTxt = (c) => (c.tipo === "cobro" ? "Cobro" : c.tipo === "gasto" ? "Gasto" : c.tipo === "fprov" ? "Factura proveedor" : "") + ` · ${c.nombre || "—"}${c.num ? " · " + c.num : ""} · ${fechaES(c.fecha)}`;
  async function datosBanco() {
    const d = hoy(), rg = BA.rango, desde = rg === "todo" ? "2000-01-01" : rg === "anio" ? d.slice(0, 4) + "-01-01" : addDias(d, -Number(rg));
    const B = await api(`/api/erp/banco?desde=${desde}&hasta=${d}`), movs = B.movimientos, C = await compras(true), pend = movs.filter((m) => !m.conciliado);
    const min = movs.length ? movs.map((m) => m.fecha).sort()[0] : d, ini = addDias(min, -60) < "2015-01-01" ? "2015-01-01" : addDias(min, -60), R = await resumen(ini, d);
    const usados = new Set(movs.filter((m) => m.conciliado).map((m) => m.conciliado.tipo + ":" + m.conciliado.ref)), emi = new Map((R.emitidas || []).map((x) => [x.id, x]));
    const cobros = (R.cobros || []).filter((c) => c.metodo !== "efectivo" && !usados.has("cobro:" + c.id)).map((c) => ({ id: c.id, fecha: c.fecha, importe: c.importe, nombre: (emi.get(c.doc) || {}).cliente || "", num: (emi.get(c.doc) || {}).num || "", metodo: c.metodo }));
    const pagos = (R.recibidas || []).filter((g) => g.metodo !== "efectivo" && g.origen === "gasto" && !usados.has("gasto:" + g.id)).map((g) => ({ tipo: "gasto", id: g.id, fecha: g.fecha, importe: g.total, nombre: g.proveedor, num: g.factura, metodo: g.metodo }))
      .concat(C.facturas.filter((f) => f.estado === "pendiente" && !usados.has("fprov:" + f.id)).map((f) => ({ tipo: "fprov", id: f.id, fecha: f.fecha, importe: f.total, nombre: provN(C, f.proveedor), num: f.num, metodo: "" })));
    return { movs, pend, sug: E.conciliar(pend, cobros, pagos), cobros, pagos, C };
  }
  async function pintarBanco(mi) {
    ACTUAL = "banco"; const s = sec("banco");
    try {
      const D = await datosBanco(), f = BA.filtro, rg = BA.rango; BA.D = D;
      let lista = D.movs; if (f === "pend") lista = D.movs.filter((m) => !m.conciliado); else if (f === "conc") lista = D.movs.filter((m) => m.conciliado);
      const sugDe = new Map(D.sug.map((x) => [x.mov.id, x])), altas = D.sug.filter((x) => x.candidato && x.confianza === "alta"), ultimo = D.movs.find((m) => m.saldo !== null);
      if (!vigente(mi)) return;
      s.innerHTML = cabecera("Banco", "Sube el extracto de tu banco (CSV) y el panel casa cada movimiento con tus cobros y pagos. Nada se concilia sin que lo aceptes.", '<label class="btn b-acc b-sm pe-file"><input type="file" id="pb-file" accept=".csv,.txt,text/csv,text/plain" hidden>⬆ Importar extracto</label>')
        + kpis([kpi("Movimientos", String(D.movs.length), rg === "todo" ? "Todo el histórico" : "En el periodo elegido"), kpi("Sin conciliar", String(D.pend.length), D.pend.length ? "Revisa las sugerencias" : "Todo cuadrado", D.pend.length ? "neg" : ""), kpi("Último saldo del banco", ultimo ? euros(ultimo.saldo) : "—", ultimo ? "a " + fechaES(ultimo.fecha) : "El extracto no trae saldo", "hero")])
        + `<div class="pe-barra">${seg("bf", [["pend", "Sin conciliar"], ["conc", "Conciliados"], ["todos", "Todos"]], f)}<select class="in pe-sel" id="pb-rg" aria-label="Periodo"><option value="30" ${rg === "30" ? "selected" : ""}>30 días</option><option value="90" ${rg === "90" ? "selected" : ""}>90 días</option><option value="anio" ${rg === "anio" ? "selected" : ""}>Este año</option><option value="todo" ${rg === "todo" ? "selected" : ""}>Todo</option></select>${altas.length ? `<button class="btn b-acc b-sm" type="button" data-pe="bt">Aceptar las ${altas.length} de confianza alta</button>` : ""}</div>`
        + `<div class="card pe-card">${tabla([{ t: "Fecha", h: (m) => fechaES(m.fecha) }, { t: "Concepto del banco", h: (m) => H(m.concepto) }, { t: "Importe", n: 1, h: (m) => `<b class="${m.importe < 0 ? "pe-mal" : "pe-bien"}">${euros(m.importe)}</b>` },
          { t: "Cuadra con", h: (m) => { if (m.conciliado) return `${chip("Conciliado", "c-verde")} <small>${H(m.conciliado.tipo === "otro" ? m.conciliado.nota : m.conciliado.tipo + " " + m.conciliado.ref)}</small>`; const x = sugDe.get(m.id); if (!x || !x.candidato) return "<small>Sin sugerencia</small>"; return `${chip(x.confianza === "alta" ? "Alta" : x.confianza === "media" ? "Media" : "Baja", x.confianza === "alta" ? "c-verde" : x.confianza === "media" ? "c-ambar" : "c-piedra")} <small>${H(refTxt(x.candidato))}</small>`; } },
          { t: "", h: (m) => { if (m.conciliado) return `<button class="btn b-ghost b-sm" type="button" data-pe="bdes" data-id="${m.id}">Deshacer</button>`; const x = sugDe.get(m.id); return `${x && x.candidato ? `<button class="btn b-acc b-sm" type="button" data-pe="bok" data-id="${m.id}">Aceptar</button> ` : ""}<button class="btn b-ghost b-sm" type="button" data-pe="bman" data-id="${m.id}">Elegir…</button>`; } }], lista.slice(0, 500), { vacio: D.movs.length ? "Nada con este filtro." : "Todavía no has importado ningún extracto." })}${lista.length > 500 ? '<p class="hint">Se muestran 500. Cambia el periodo.</p>' : ""}</div>`;
    } catch (e) { porError("banco", e); }
  }
  async function leerArchivo(file) { const buf = await file.arrayBuffer(); let t = new TextDecoder("utf-8").decode(buf); if (t.includes("\uFFFD")) t = new TextDecoder("windows-1252").decode(buf); return t; }
  const conciliar = (id, tipo, ref, nota) => post("/api/erp/banco-conciliar/" + id, { tipo, ref, nota });
  async function importarExtracto(file) {
    let texto; try { texto = await leerArchivo(file); } catch (e) { return toast("No se pudo leer el archivo."); }
    const r = E.parseBancoCSV(texto);
    if (!r.filas.length) return dlgE(`<h2>No he podido leer el extracto</h2>${r.errores.slice(0, 5).map((x) => `<div class="msg bad">${H(x.motivo)}</div>`).join("")}<p class="hint">Descarga el extracto desde la banca online en formato CSV (con cabecera: Fecha, Concepto, Importe…).</p><div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cerrar</button></div>`);
    const ent = r.filas.filter((x) => x.importe > 0).reduce((a, x) => a + x.importe, 0), sal = r.filas.filter((x) => x.importe < 0).reduce((a, x) => a + x.importe, 0);
    dlgE(`<h2>Importar «${H(file.name)}»</h2>${kpis([kpi("Movimientos", String(r.filas.length)), kpi("Entradas", euros(ent)), kpi("Salidas", euros(sal))])}
      ${r.filas.length > 2000 ? '<div class="msg bad">Son más de 2.000 movimientos: divide el extracto por meses.</div>' : ""}${r.errores.length ? `<div class="msg pe-aviso">${r.errores.length} línea(s) no se han podido leer y se saltan: ${H(r.errores.slice(0, 3).map((x) => "línea " + x.linea + " (" + x.motivo + ")").join("; "))}${r.errores.length > 3 ? "…" : ""}</div>` : ""}
      <p class="hint">Primeros movimientos del archivo:</p>${tabla([{ t: "Fecha", h: (m) => fechaES(m.fecha) }, { t: "Concepto", k: "concepto" }, { t: "Importe", n: 1, h: (m) => euros(m.importe) }], r.filas.slice(0, 6))}<div class="msg bad" hidden></div>
      <div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cancelar</button><button class="btn b-acc" type="button" id="pb-imp" ${r.filas.length > 2000 ? "disabled" : ""}>Importar ${r.filas.length}</button></div>`, (d) => {
      q("#pb-imp", d).onclick = async () => { q("#pb-imp", d).disabled = true; try { const x = await post("/api/erp/banco-importar", { archivo: file.name, movs: r.filas }); d.close(); toast(`${x.nuevos} movimiento(s) nuevo(s)${x.duplicados ? ` · ${x.duplicados} ya estaban y no se repiten` : ""}`); invalidar(); recargar(); } catch (e) { err(d, e.message); q("#pb-imp", d).disabled = false; } };
    });
  }
  function elegirBanco(m) {
    const D = BA.D, base = m.importe > 0 ? D.cobros.map((c) => ({ ...c, tipo: "cobro" })) : D.pagos, ab = Math.abs(m.importe);
    const ops = base.filter((c) => Math.abs(difDias(m.fecha, c.fecha)) <= 60).sort((a, c) => (a.importe === ab ? -1 : 0) - (c.importe === ab ? -1 : 0) || Math.abs(difDias(m.fecha, a.fecha)) - Math.abs(difDias(m.fecha, c.fecha))).slice(0, 25);
    dlgE(`<h2>¿Con qué cuadra este movimiento?</h2><p><b>${fechaES(m.fecha)}</b> · ${H(m.concepto)} · <b class="${m.importe < 0 ? "pe-mal" : "pe-bien"}">${euros(m.importe)}</b></p><p class="hint">Solo puedes elegir apuntes del mismo importe exacto. Si el banco cobró comisión o es una cuota, usa «Otro».</p>
      ${tabla([{ t: "Apunte", h: (c) => H(refTxt(c)) }, { t: "Importe", n: 1, h: (c) => euros(c.importe) }, { t: "", h: (c) => (c.importe === ab ? `<button class="btn b-acc b-sm" type="button" data-elegir="${c.tipo}|${H(c.id)}">Elegir</button>` : "<small>importe distinto</small>") }], ops, { vacio: "No hay apuntes cercanos sin conciliar." })}
      <div class="field"><label for="pb-otro">Otro (comisión, nómina, impuestos, préstamo…)</label><div class="pe-fila"><input class="in" id="pb-otro" maxlength="200" placeholder="Qué es"><button class="btn b-ghost" type="button" id="pb-otrob">Guardar</button></div></div><div class="msg bad" hidden></div><div class="t-dlg-acts"><button class="btn b-ghost" type="button" data-pecerrar>Cerrar</button></div>`, (d) => {
      d.addEventListener("click", async (ev) => { const x = ev.target.closest("[data-elegir]"); if (!x) return; const [tp, id] = x.dataset.elegir.split("|"); try { await conciliar(m.id, tp, id); d.close(); toast("Conciliado"); invalidar(); recargar(); } catch (er) { err(d, er.message); } });
      q("#pb-otrob", d).onclick = async () => { try { await conciliar(m.id, "otro", "", q("#pb-otro", d).value); d.close(); toast("Apuntado"); invalidar(); recargar(); } catch (er) { err(d, er.message); } };
    });
  }

  /* =====================================================================
     GESTORÍA · IGIC y libros
     ===================================================================== */
  const GE = { anio: Number(hoyC().slice(0, 4)), per: "T" + E.trimestreDe(hoyC()) };
  async function pintarGest(mi) {
    ACTUAL = "gest"; const s = sec("gest"), g = GE, d = hoy();
    try {
      const rango = g.per === "A" ? { desde: g.anio + "-01-01", hasta: g.anio + "-12-31" } : E.rangoTrimestre(g.anio, Number(g.per[1])), hasta = rango.hasta > d ? d : rango.hasta;
      const [r, C] = await Promise.all([resumen(rango.desde, hasta), compras()]);
      const pend = C.facturas.filter((f) => f.estado === "pendiente").map((f) => ({ ...f, proveedor: provN(C, f.proveedor) }));
      const ig = E.igicResumen(r.emitidas, r.recibidas, pend, rango.desde, hasta), LE = E.libroEmitidas(r.emitidas, rango.desde, hasta), LR = E.libroRecibidas(r.recibidas, pend, rango.desde, hasta);
      const qn = g.per === "A" ? 0 : Number(g.per[1]), ven = qn ? E.vencimiento420(g.anio, qn) : "", anios = [0, 1, 2].map((i) => Number(d.slice(0, 4)) - i);
      const tg = (arr) => tabla([{ t: "% IGIC", h: (x) => H(String(x.pct).replace(".", ",")) + " %" }, { t: "Operaciones", n: 1, k: "n" }, { t: "Base imponible", n: 1, h: (x) => euros(x.base) }, { t: "Cuota", n: 1, h: (x) => euros(x.cuota) }], arr, { vacio: "Sin operaciones." });
      if (!vigente(mi)) return;
      s.innerHTML = cabecera("Gestoría", "IGIC y libros de facturas listos para tu gestor. Es una ayuda <b>orientativa</b>: el gestor es quien presenta el modelo 420.", `<button class="btn b-acc b-sm" type="button" data-pe="gtodo">Descargar los 3 archivos (Excel)</button>`)
        + `<div class="pe-barra">${seg("gper", [["T1", "1.er trim."], ["T2", "2.º"], ["T3", "3.º"], ["T4", "4.º"], ["A", "Año"]], g.per)}<select class="in pe-sel" id="pg-anio" aria-label="Año">${anios.map((a) => `<option ${a === g.anio ? "selected" : ""}>${a}</option>`).join("")}</select><span class="hint">${fechaES(rango.desde)} – ${fechaES(hasta)}${ven ? ` · presentación orientativa hasta el <b>${fechaES(ven)}</b>` : ""}</span></div>`
        + ig.avisos.map((a) => `<div class="msg ${a.nivel === "rojo" ? "bad" : a.nivel === "ambar" ? "pe-aviso" : "pe-info"}">${H(a.txt)}</div>`).join("")
        + kpis([kpi(ig.resultado >= 0 ? "IGIC a ingresar" : "IGIC a compensar", euros(Math.abs(ig.resultado)), "Repercutido − soportado", "hero " + (ig.resultado > 0 ? "neg" : "")), kpi("Repercutido (ventas)", euros(ig.repercutido), ig.nEmitidas + " factura(s)"), kpi("Soportado (compras)", euros(ig.soportado), ig.nRecibidas + " factura(s)")])
        + `<div class="fn-grid"><div class="card"><h3 class="pe-h3">Ventas por tipo</h3>${tg(ig.emitidas)}</div><div class="card"><h3 class="pe-h3">Compras por tipo</h3>${tg(ig.recibidas)}</div></div>`
        + `<div class="card pe-card"><div class="pe-th"><h3 class="pe-h3">Libro de facturas emitidas (${LE.length})</h3><button class="btn b-ghost b-sm" type="button" data-pe="gemi">Descargar</button></div>${tabla([{ t: "Fecha", h: (x) => fechaES(x.fecha) }, { t: "Nº", k: "num" }, { t: "Cliente", k: "cliente" }, { t: "Base", n: 1, h: (x) => euros(x.base) }, { t: "%", n: 1, h: (x) => String(x.pct).replace(".", ",") }, { t: "IGIC", n: 1, h: (x) => euros(x.cuota) }, { t: "Total", n: 1, h: (x) => euros(x.total) }, { t: "", h: (x) => (x.obs ? chip(x.obs, "c-ambar") : "") }], LE.slice(0, 400))}</div>`
        + `<div class="card pe-card"><div class="pe-th"><h3 class="pe-h3">Libro de facturas recibidas (${LR.length})</h3><button class="btn b-ghost b-sm" type="button" data-pe="grec">Descargar</button></div>${tabla([{ t: "Fecha", h: (x) => fechaES(x.fecha) }, { t: "Nº", k: "num" }, { t: "Proveedor", k: "proveedor" }, { t: "Base", n: 1, h: (x) => euros(x.base) }, { t: "%", n: 1, h: (x) => String(x.pct).replace(".", ",") }, { t: "IGIC", n: 1, h: (x) => euros(x.cuota) }, { t: "Total", n: 1, h: (x) => euros(x.total) }, { t: "", h: (x) => (x.obs ? chip(x.obs, "c-ambar") : "") }], LR.slice(0, 400))}</div>
        <p class="hint">Archivos CSV con «;» y tildes: se abren directos en Excel. Los textos que empiezan por = + - @ se protegen para que no ejecuten fórmulas. El resumen de IGIC también se descarga con «Descargar los 3 archivos».</p>`;
      GE.G = { rango: { desde: rango.desde, hasta }, ig, LE, LR };
    } catch (e) { porError("gest", e); }
  }

  VISTA.compras = pintarCompras; VISTA.banco = pintarBanco; VISTA.gest = pintarGest;

  /* =====================================================================
     eventos (uno por sección)
     ===================================================================== */
  document.addEventListener("click", async (e) => {
    const t = ACTUAL, s = t && sec(t); if (!s || s.hidden || (!s.contains(e.target) && !e.target.closest("dialog.erp-dlg"))) return; let b;
    if (e.target.closest("[data-pediag]")) return window.diagnosticoServidor();
    if (e.target.closest("[data-pereintentar]")) return recargar();
    if ((b = e.target.closest("[data-peseg]")) && (b = e.target.closest("[data-peseg] button"))) {
      const id = e.target.closest("[data-peseg]").dataset.peseg;
      if (!["csub", "rf", "bf", "gper"].includes(id)) return; // los de otras pestañas los gestionan sus archivos
      if (id === "csub") CO.sub = b.dataset.k; else if (id === "rf") CO.rec.filtro = b.dataset.k; else if (id === "bf") BA.filtro = b.dataset.k; else if (id === "gper") GE.per = b.dataset.k;
      return recargar();
    }
    if ((b = e.target.closest("[data-pe]"))) {
      const a = b.dataset.pe;
      try {
        if (t === "compras") { const C = await compras();
          if (a === "nprov") return formProveedor(null); if (a === "nped") return formPedido(C, null); if (a === "nfac") return formFactura(C, null);
          if (a === "stock") { b.disabled = true; qa("dialog[open]").forEach((x) => x.close()); await darEntrada(C, b.dataset.id); return recargar(); }
          if (a === "crearsug") return crearSugeridos();
          if (a === "verpend") { CO.sub = "pedidos"; const p = C.pedidos.find((x) => x.id === b.dataset.id); if (p) return verPedido(C, p); } }
        if (t === "banco") { const D = BA.D; if (!D) return;
          if (a === "bok") { const x = D.sug.find((z) => z.mov.id === b.dataset.id); if (!x || !x.candidato) return; b.disabled = true; await conciliar(x.mov.id, x.candidato.tipo, x.candidato.id); toast("Conciliado"); invalidar(); return recargar(); }
          if (a === "bt") { const altas = D.sug.filter((x) => x.candidato && x.confianza === "alta"); let n = 0, fallos = 0; for (const x of altas) { try { await conciliar(x.mov.id, x.candidato.tipo, x.candidato.id); n++; } catch (_) { fallos++; } } toast(`${n} conciliado(s)${fallos ? ` · ${fallos} no se pudieron (revísalos a mano)` : ""}`); invalidar(); return recargar(); }
          if (a === "bdes") { if (!confirm("¿Deshacer esta conciliación?")) return; await post("/api/erp/banco-desconciliar/" + b.dataset.id); invalidar(); return recargar(); }
          if (a === "bman") { const m = D.pend.find((x) => x.id === b.dataset.id); if (m) return elegirBanco(m); } }
        if (t === "gest") { const G = GE.G; if (!G) return; const suf = `${G.rango.desde}_${G.rango.hasta}`;
          const emi = () => descargarCSV(`facturas-emitidas_${suf}.csv`, E.aCSV(E.COLS_EMITIDAS, G.LE)), rec = () => descargarCSV(`facturas-recibidas_${suf}.csv`, E.aCSV(E.COLS_RECIBIDAS, G.LR)), igi = () => descargarCSV(`resumen-igic_${suf}.csv`, E.aCSV(E.COLS_IGIC, E.igicFilasCSV(G.ig)));
          if (a === "gemi") return emi(); if (a === "grec") return rec(); if (a === "gtodo") { emi(); setTimeout(rec, 400); setTimeout(igi, 800); } }
      } catch (x) { toast(x.message); }
      return;
    }
    if ((b = e.target.closest("tr[data-pick]")) && !e.target.closest("button,a")) {
      if (t !== "compras") return; const C = await compras(), id = b.dataset.pick, sb = CO.sub;
      if (sb === "pedidos") verPedido(C, C.pedidos.find((x) => x.id === id)); else if (sb === "facturas") verFactura(C, C.facturas.find((x) => x.id === id)); else if (sb === "proveedores") formProveedor(C.proveedores.find((x) => x.id === id));
    }
  });
  document.addEventListener("change", (e) => {
    const t = ACTUAL, s = t && sec(t); if (!s || s.hidden || !s.contains(e.target)) return;
    if (e.target.id === "pb-file" && e.target.files[0]) { const f = e.target.files[0]; e.target.value = ""; importarExtracto(f); }
    else if (e.target.id === "pb-rg") { BA.rango = e.target.value; recargar(); }
    else if (e.target.id === "pg-anio") { GE.anio = Number(e.target.value); recargar(); }
    else if (e.target.id === "pe-pl") { CO.rec.plazo = Math.max(0, Math.min(90, parseInt(e.target.value, 10) || 0)); recargar(); }
    else if (e.target.id === "pe-ma") { CO.rec.margen = Math.max(0, Math.min(90, parseInt(e.target.value, 10) || 0)); recargar(); }
  });
  /* ---------------- quién ve qué pestaña ---------------- */
  // Las pestañas del ERP salen ocultas en el HTML. Aquí se abren al gerente (todas) y al equipo (solo lo que el gerente les haya abierto).
  const BOTON = (t) => document.querySelector(`#tabs [data-tab="${t}"]`);
  const dentro = () => { const l = document.getElementById("s-login"); return !!l && l.hidden; };
  let ULTIMO_FALLO = 0;
  async function ajustarPestanas() {
    if (!dentro()) { PERM = null; return; }
    if (!PERM) {
      if (typeof PUEDE_TODO === "function" && PUEDE_TODO()) PERM = { admin: true, modulos: [], pedidoMax: 0 };
      else {
        // Si aún no ha fichado (o falla la red) no se da por bueno un «no tienes nada»: se reintenta cada 6 s hasta que conteste
        if (Date.now() - ULTIMO_FALLO < 6000) return;
        try { PERM = await api("/api/erp/mis-permisos"); } catch (_) { ULTIMO_FALLO = Date.now(); PERM = null; for (const t of Object.keys(SECC)) { const b = BOTON(t); if (b) b.hidden = true; } return; }
      }
      window.PE.perm = PERM;
    }
    for (const t of Object.keys(SECC)) { const b = BOTON(t); if (b) b.hidden = !tienePermiso(t); }
  }
  setInterval(() => { ajustarPestanas().catch(() => { }); }, 1500);
  document.addEventListener("click", (e) => { if (e.target.closest("#logout")) { PERM = null; CA.clear(); Object.keys(SECC).forEach((t) => { const b = BOTON(t); if (b) b.hidden = true; }); } });

  window.PE = { refrescarPermisos: () => { PERM = null; }, q, qa, H, kpi, kpis, chip, euros, campoEur, vacio, seg, tabla, cabecera, dlgE, err, post, descargarCSV, mesTxt, cargar, invalidar, resumen, compras, almacen, hoy, recargar, registrar, soyGerente, vigente, perm: PERM, sec, setActual: (t) => { ACTUAL = t; } };
  // al cerrar sesión se vacía todo lo cargado
  document.addEventListener("click", (e) => { if (e.target.closest("#logout")) { CA.clear(); } });
  // si el panel se abre ya en #compras / #banco / #gestoria
  window.addEventListener("load", () => { const h = (location.hash || "").slice(1), t = h === "gestoria" ? "gest" : h; if (SECC[t] && typeof PW !== "undefined" && PW && document.getElementById("tabsrow") && !document.getElementById("tabsrow").hidden) setTimeout(() => abrirTab(t), 600); });
})();
