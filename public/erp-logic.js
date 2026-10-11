/* =====================================================================
   VOLCANO CARS · ERP · NÚCLEO DE CÁLCULO (erp-logic.js) · Actualización 64
   Funciones PURAS (sin red, sin pantalla): dinero, IGIC, libros, banco, incentivos,
   avisos de clientes y margen de coches. Se usa en el navegador (window.ERP) y en las
   pruebas (require). Todo el dinero va en CÉNTIMOS ENTEROS.
   ===================================================================== */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ERP = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------------- dinero ---------------- */
  // «1.234,56» · «1234,56» · «1234.56» · «7.490» (= 7490) · «12,5» → céntimos. NaN si no es un número.
  function cent(v) {
    if (typeof v === "number") return Number.isFinite(v) ? Math.round(v * 100) : NaN;
    let s = String(v == null ? "" : v).replace(/\u2212/g, "-").replace(/[€\s\u00a0]/g, ""); // acepta el «−» que escribe eur()
    if (!s) return NaN;
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    if (s[0] === "-") { neg = !neg; s = s.slice(1); } else if (s[0] === "+") s = s.slice(1);
    if (!/^[\d.,]+$/.test(s)) return NaN;
    const c = s.lastIndexOf(","), p = s.lastIndexOf(".");
    if (c >= 0 && p >= 0) {
      // el separador que va el último es el decimal
      if (c > p) s = s.replace(/\./g, "").replace(",", ".");
      else s = s.replace(/,/g, "");
    } else if (c >= 0) {
      if ((s.match(/,/g) || []).length > 1) s = s.replace(/,/g, "");
      else s = s.replace(",", ".");
    } else if (p >= 0) {
      const n = (s.match(/\./g) || []).length;
      if (n > 1 || /^\d{1,3}\.\d{3}$/.test(s)) s = s.replace(/\./g, ""); // miles
    }
    if (!/^\d*\.?\d*$/.test(s) || s === "." || s === "") return NaN;
    const r = Math.round(parseFloat(s) * 100);
    return Number.isFinite(r) ? (neg ? -r : r) : NaN;
  }
  const miles = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  function eur(c, o) {
    c = Math.round(Number(c) || 0);
    const neg = c < 0, a = Math.abs(c), e = Math.trunc(a / 100), d = a % 100;
    const t = miles(e) + "," + String(d).padStart(2, "0") + " €";
    return (neg ? "−" : (o && o.signo ? "+" : "")) + t;
  }
  const numES = (c) => { const a = Math.abs(Math.round(c)), e = Math.trunc(a / 100), d = a % 100; return (c < 0 ? "-" : "") + e + "," + String(d).padStart(2, "0"); }; // para CSV/Excel: 1234,56
  const pctTxt = (p) => String(p).replace(".", ",") + " %";
  const baseDe = (total, pct) => Math.round(total / (1 + pct / 100));

  /* ---------------- fechas (ISO AAAA-MM-DD, sin zonas horarias) ---------------- */
  const reISO = /^\d{4}-\d{2}-\d{2}$/;
  function fechaOk(t) { t = String(t == null ? "" : t); if (!reISO.test(t)) return ""; const d = new Date(t + "T12:00:00Z"); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === t ? t : ""; }
  const addDias = (f, n) => new Date(Date.parse(f + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
  const difDias = (a, b) => Math.round((Date.parse(a + "T12:00:00Z") - Date.parse(b + "T12:00:00Z")) / 864e5); // a − b
  function addMeses(f, n) {
    const [y, m, d] = f.split("-").map(Number), t = y * 12 + (m - 1) + n, ny = Math.floor(t / 12), nm = (t % 12 + 12) % 12 + 1;
    const ult = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
    return `${ny}-${String(nm).padStart(2, "0")}-${String(Math.min(d, ult)).padStart(2, "0")}`;
  }
  const fechaES = (f) => (reISO.test(f || "") ? f.slice(8, 10) + "/" + f.slice(5, 7) + "/" + f.slice(0, 4) : "");
  const trimestreDe = (f) => Math.floor((Number(f.slice(5, 7)) - 1) / 3) + 1;
  function rangoTrimestre(y, q) {
    const m1 = (q - 1) * 3 + 1, m2 = m1 + 2, fin = new Date(Date.UTC(y, m2, 0)).getUTCDate();
    return { desde: `${y}-${String(m1).padStart(2, "0")}-01`, hasta: `${y}-${String(m2).padStart(2, "0")}-${String(fin).padStart(2, "0")}` };
  }
  // Presentación del IGIC (modelo 420, trimestral): del 1 al 20 del mes siguiente; el 4.º trimestre hasta el 30 de enero. ORIENTATIVO.
  function vencimiento420(y, q) { return q === 4 ? `${y + 1}-01-30` : `${y}-${String(q * 3 + 1).padStart(2, "0")}-20`; }

  /* ---------------- CSV seguro para Excel (es-ES) ---------------- */
  // Las celdas que empiezan por = + - @ se neutralizan (inyección de fórmulas con textos que vienen de fuera, como el concepto del banco)
  function celdaCSV(v, esNumero) {
    let s = String(v == null ? "" : v);
    if (!esNumero && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
    if (/[";\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function aCSV(cols, filas) { // cols: [{k, t, n?}] n = numérica
    const l = [cols.map((c) => celdaCSV(c.t)).join(";")];
    for (const f of filas) l.push(cols.map((c) => celdaCSV(typeof c.f === "function" ? c.f(f) : f[c.k], c.n)).join(";"));
    return l.join("\r\n");
  }

  /* =====================================================================
     GESTORÍA · libros de facturas e IGIC
     ===================================================================== */
  const clavePct = (p) => String(Number(p) || 0);
  function igicResumen(emitidas, recibidas, pendientesProv, desde, hasta) {
    const dentro = (f) => f >= desde && f <= hasta;
    const E = (emitidas || []).filter((d) => dentro(d.fecha));
    const R = (recibidas || []).filter((d) => dentro(d.fecha));
    // Facturas de proveedor aún sin pagar (Compras): usan igic / igicPct; se pasan al mismo formato que los gastos
    const P = (pendientesProv || []).filter((d) => dentro(d.fecha)).map((d) => ({ ...d, impuesto: d.igic || 0, impuestoPct: d.igicPct || 0, factura: d.num || "" }));
    const grupo = (l) => {
      const m = new Map();
      for (const d of l) {
        const k = clavePct(d.impuestoPct), g = m.get(k) || { pct: Number(k), base: 0, cuota: 0, total: 0, n: 0 };
        g.base += d.base || 0; g.cuota += d.impuesto || 0; g.total += d.total || 0; g.n++; m.set(k, g);
      }
      return [...m.values()].sort((a, b) => a.pct - b.pct);
    };
    const avisos = [];
    const sinFac = E.filter((d) => d.sinFactura);
    if (sinFac.length) avisos.push({ nivel: "ambar", txt: `${sinFac.length} cobro(s) en caja sin factura (${eur(sinFac.reduce((a, d) => a + d.total, 0))}): no llevan IGIC calculado. Pásalos a factura o confírmalos con tu gestor.` });
    const est = E.filter((d) => d.estimado);
    if (est.length) avisos.push({ nivel: "ambar", txt: `${est.length} venta(s) de coche con datos estimados (sin «Registrar la venta» en Finanzas): el IGIC puede no ser el real.` });
    const sinNum = E.filter((d) => !d.sinFactura && !d.num && d.tipo !== "caja");
    if (sinNum.length) avisos.push({ nivel: "ambar", txt: `${sinNum.length} factura(s) emitida(s) sin número: no podrán ir al libro oficial.` });
    const sinNumR = R.filter((d) => (d.impuesto || 0) > 0 && !String(d.factura || "").trim());
    if (sinNumR.length) avisos.push({ nivel: "rojo", txt: `${sinNumR.length} gasto(s) con IGIC y SIN nº de factura (${eur(sinNumR.reduce((a, d) => a + d.impuesto, 0))} de IGIC): sin factura válida no se puede deducir.` });
    const sinClas = R.filter((d) => d.sinClasificar);
    if (sinClas.length) avisos.push({ nivel: "ambar", txt: `${sinClas.length} salida(s) de caja sin clasificar: clasifícalas en Finanzas para que cuenten.` });
    if (E.some((d) => d.tipo === "venta" && Number(d.impuestoPct) > 0))
      avisos.push({ nivel: "info", txt: "Hay ventas de coches de ocasión con IGIC. Si te acoges al régimen especial de bienes usados (REBU), el IGIC se calcula sobre el margen: confírmalo con tu gestor." });
    const rep = E.reduce((a, d) => a + (d.impuesto || 0), 0);
    // El IGIC de una factura de proveedor se puede deducir al recibirla (aunque aún no esté pagada)
    const sop = R.reduce((a, d) => a + (d.impuesto || 0), 0) + P.reduce((a, d) => a + (d.impuesto || 0), 0);
    return {
      desde, hasta,
      emitidas: grupo(E), recibidas: grupo(R.concat(P)),
      baseEmitida: E.reduce((a, d) => a + (d.base || 0), 0), baseRecibida: R.concat(P).reduce((a, d) => a + (d.base || 0), 0),
      repercutido: rep, soportado: sop, resultado: rep - sop, // > 0 = a ingresar · < 0 = a compensar / devolver
      nEmitidas: E.length, nRecibidas: R.length + P.length, avisos,
    };
  }
  function libroEmitidas(emitidas, desde, hasta) {
    return (emitidas || []).filter((d) => d.fecha >= desde && d.fecha <= hasta).sort((a, b) => (a.fecha + (a.num || "")).localeCompare(b.fecha + (b.num || "")))
      .map((d) => ({ fecha: d.fecha, num: d.num || "", cliente: d.cliente || "", concepto: d.concepto || "", base: d.base || 0, pct: Number(d.impuestoPct) || 0, cuota: d.impuesto || 0, total: d.total || 0, cobrado: d.cobrado || 0, tipo: d.tipo || "", obs: d.sinFactura ? "SIN FACTURA" : d.estimado ? "ESTIMADA" : "" }));
  }
  function libroRecibidas(recibidas, pendientesProv, desde, hasta) {
    const a = (recibidas || []).filter((d) => d.fecha >= desde && d.fecha <= hasta).map((d) => ({ fecha: d.fecha, num: d.factura || "", proveedor: d.proveedor || "", concepto: d.concepto || "", base: d.base || 0, pct: Number(d.impuestoPct) || 0, cuota: d.impuesto || 0, total: d.total || 0, pagado: true, metodo: d.metodo || "", categoria: d.categoriaTxt || d.categoria || "", obs: d.sinClasificar ? "SIN CLASIFICAR" : "" }));
    const b = (pendientesProv || []).filter((d) => d.fecha >= desde && d.fecha <= hasta).map((d) => ({ fecha: d.fecha, num: d.num || "", proveedor: d.proveedor || "", concepto: d.concepto || "", base: d.base || 0, pct: Number(d.igicPct) || 0, cuota: d.igic || 0, total: d.total || 0, pagado: false, metodo: "", categoria: "Factura de proveedor", obs: "PENDIENTE DE PAGO" }));
    return a.concat(b).sort((x, y) => (x.fecha + x.num).localeCompare(y.fecha + y.num));
  }
  const COLS_EMITIDAS = [
    { t: "Fecha", f: (r) => fechaES(r.fecha) }, { t: "Nº factura", k: "num" }, { t: "Cliente", k: "cliente" }, { t: "Concepto", k: "concepto" },
    { t: "Base imponible", n: 1, f: (r) => numES(r.base) }, { t: "% IGIC", n: 1, f: (r) => String(r.pct).replace(".", ",") }, { t: "Cuota IGIC", n: 1, f: (r) => numES(r.cuota) },
    { t: "Total", n: 1, f: (r) => numES(r.total) }, { t: "Cobrado", n: 1, f: (r) => numES(r.cobrado) }, { t: "Observaciones", k: "obs" },
  ];
  const COLS_RECIBIDAS = [
    { t: "Fecha", f: (r) => fechaES(r.fecha) }, { t: "Nº factura", k: "num" }, { t: "Proveedor", k: "proveedor" }, { t: "Concepto", k: "concepto" }, { t: "Categoría", k: "categoria" },
    { t: "Base imponible", n: 1, f: (r) => numES(r.base) }, { t: "% IGIC", n: 1, f: (r) => String(r.pct).replace(".", ",") }, { t: "Cuota IGIC", n: 1, f: (r) => numES(r.cuota) },
    { t: "Total", n: 1, f: (r) => numES(r.total) }, { t: "Pagada", f: (r) => (r.pagado ? "Sí" : "No") }, { t: "Forma de pago", k: "metodo" }, { t: "Observaciones", k: "obs" },
  ];
  const COLS_IGIC = [{ t: "Libro", k: "libro" }, { t: "% IGIC", n: 1, f: (r) => String(r.pct).replace(".", ",") }, { t: "Operaciones", n: 1, k: "n" }, { t: "Base imponible", n: 1, f: (r) => numES(r.base) }, { t: "Cuota", n: 1, f: (r) => numES(r.cuota) }];
  function igicFilasCSV(r) {
    const f = [];
    for (const g of r.emitidas) f.push({ libro: "Repercutido (ventas)", ...g });
    for (const g of r.recibidas) f.push({ libro: "Soportado (compras)", ...g });
    f.push({ libro: "TOTAL repercutido", pct: "", n: r.nEmitidas, base: r.baseEmitida, cuota: r.repercutido });
    f.push({ libro: "TOTAL soportado", pct: "", n: r.nRecibidas, base: r.baseRecibida, cuota: r.soportado });
    f.push({ libro: r.resultado >= 0 ? "RESULTADO: a ingresar" : "RESULTADO: a compensar", pct: "", n: "", base: "", cuota: Math.abs(r.resultado) });
    return f;
  }

  /* =====================================================================
     COMPRAS · facturas de proveedor
     ===================================================================== */
  function totalFactura(base, pct) { const b = Math.round(base), i = Math.round(b * (Number(pct) || 0) / 100); return { base: b, igic: i, total: b + i }; }
  function lineasTotal(lineas) { return (lineas || []).reduce((a, l) => a + Math.round((Number(l.n) || 0) * (Number(l.precio) || 0)), 0); }
  // Deuda por proveedor con antigüedad: al corriente, vence en ≤7 días, vencida
  function deudaProveedores(facturas, hoy) {
    const m = new Map();
    for (const f of facturas || []) {
      if (f.estado !== "pendiente") continue;
      const g = m.get(f.proveedor) || { proveedor: f.proveedor, total: 0, vencida: 0, proxima: 0, alDia: 0, n: 0, primera: "" };
      g.total += f.total; g.n++;
      const d = f.vence ? difDias(f.vence, hoy) : 9999;
      if (d < 0) g.vencida += f.total; else if (d <= 7) g.proxima += f.total; else g.alDia += f.total;
      if (!g.primera || (f.vence && f.vence < g.primera)) g.primera = f.vence || g.primera;
      m.set(f.proveedor, g);
    }
    return [...m.values()].sort((a, b) => b.vencida - a.vencida || b.total - a.total);
  }
  function estadoPedido(p) {
    const ls = p.lineas || [];
    if (!ls.length) return p.estado;
    const rec = ls.reduce((a, l) => a + Math.min(Number(l.recibido) || 0, Number(l.n) || 0), 0), tot = ls.reduce((a, l) => a + (Number(l.n) || 0), 0);
    if (tot <= 0) return p.estado;
    return rec <= 0 ? "enviado" : rec >= tot ? "recibido" : "parcial";
  }

  /* =====================================================================
     BANCO · lectura del extracto y conciliación
     ===================================================================== */
  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const alnum = (s) => norm(s).replace(/[^a-z0-9]/g, "");
  function trocear(linea, d) { // CSV con comillas
    const o = []; let c = "", q = false;
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (q) { if (ch === '"') { if (linea[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
      else if (ch === '"') q = true; else if (ch === d) { o.push(c); c = ""; } else c += ch;
    }
    o.push(c); return o.map((x) => x.trim());
  }
  function fechaBanco(s) {
    s = String(s || "").trim().replace(/\s.*$/, "");
    let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
    if (m) return fechaOk(`${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`);
    m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
    if (m) { let y = m[3]; if (y.length === 2) y = (Number(y) > 70 ? "19" : "20") + y; return fechaOk(`${y}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`); }
    return "";
  }
  function parseBancoCSV(texto) {
    const errores = [], filas = [];
    let t = String(texto || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const L = t.split("\n").filter((l) => l.trim());
    if (!L.length) return { filas, errores: [{ linea: 0, motivo: "El archivo está vacío." }], cabecera: [] };
    // delimitador: el que más aparece en las primeras líneas
    const cnt = (d) => L.slice(0, 8).reduce((a, l) => a + trocear(l, d).length - 1, 0);
    const delim = [";", "\t", ","].map((d) => [d, cnt(d)]).sort((a, b) => b[1] - a[1])[0][0];
    // cabecera: la primera línea con alguna palabra conocida y SIN fecha
    let h = -1;
    for (let i = 0; i < Math.min(L.length, 15); i++) {
      const c = trocear(L[i], delim).map(norm);
      if (c.some((x) => /^(fecha|f\. ?valor|f\. ?operacion|date)/.test(x)) && c.some((x) => /concepto|descripcion|movimiento|detalle|importe|cargo|abono|debe|haber|amount/.test(x))) { h = i; break; }
    }
    if (h < 0) return { filas, errores: [{ linea: 1, motivo: "No encuentro la cabecera (Fecha, Concepto, Importe…). Descarga el extracto del banco en CSV con cabecera." }], cabecera: [] };
    const cab = trocear(L[h], delim).map(norm);
    const col = (re, evita) => cab.findIndex((x) => re.test(x) && !(evita && evita.test(x)));
    const iF = col(/^(fecha|f\. ?operacion|date)/, /valor/) >= 0 ? col(/^(fecha|f\. ?operacion|date)/, /valor/) : col(/fecha|date/);
    const iC = col(/concepto|descripcion|movimiento|detalle|referencia|observ/), iI = col(/^importe|amount/), iCar = col(/cargo|debe|salida/), iAbo = col(/abono|haber|entrada|ingreso/), iS = col(/saldo|balance/);
    if (iF < 0 || (iI < 0 && (iCar < 0 || iAbo < 0))) return { filas, errores: [{ linea: h + 1, motivo: "Faltan columnas: necesito Fecha e Importe (o Cargo y Abono)." }], cabecera: cab };
    // formato decimal del archivo: si algún importe tiene coma con 1-2 decimales → es-ES
    for (let i = h + 1; i < L.length; i++) {
      const c = trocear(L[i], delim);
      const f = fechaBanco(c[iF]);
      if (!f) { errores.push({ linea: i + 1, motivo: "Fecha no válida: «" + (c[iF] || "") + "»" }); continue; }
      let imp;
      if (iI >= 0 && String(c[iI] || "").trim() !== "") imp = cent(c[iI]);
      else { const car = String(c[iCar] || "").trim() ? cent(c[iCar]) : 0, abo = String(c[iAbo] || "").trim() ? cent(c[iAbo]) : 0; imp = Number.isNaN(car) || Number.isNaN(abo) ? NaN : Math.abs(abo) - Math.abs(car); }
      if (!Number.isFinite(imp) || imp === 0) { errores.push({ linea: i + 1, motivo: "Importe no válido o cero: «" + (c[iI >= 0 ? iI : iCar] || "") + "»" }); continue; }
      const concepto = String(iC >= 0 ? c[iC] : "").replace(/\s+/g, " ").trim().slice(0, 240);
      const saldo = iS >= 0 && String(c[iS] || "").trim() ? cent(c[iS]) : null;
      filas.push({ fecha: f, concepto, importe: imp, saldo: Number.isFinite(saldo) ? saldo : null });
    }
    return { filas, errores, cabecera: cab, delimitador: delim };
  }
  function puntuar(m, c) {
    let s = 50; const d = Math.abs(difDias(m.fecha, c.fecha));
    if (d <= 3) s += 25; else if (d <= 7) s += 15; else if (d <= 15) s += 5; else if (d <= 45) s -= 15; else return -1;
    const txt = alnum(m.concepto);
    if (c.num && alnum(c.num).length >= 3 && txt.includes(alnum(c.num))) s += 25;
    const nom = norm(c.nombre).split(/[^a-z0-9]+/).filter((w) => w.length >= 4);
    if (nom.some((w) => txt.includes(w))) s += 15;
    return s;
  }
  // movs: movimientos del banco SIN conciliar; cobros: [{id, fecha, importe, nombre, num, metodo}], pagos: [{id, fecha, importe, nombre, num, metodo, tipo:"gasto"|"fprov"}]
  function conciliar(movs, cobros, pagos) {
    const cand = [];
    for (const m of movs) {
      const lista = m.importe > 0 ? (cobros || []).filter((c) => c.importe === m.importe).map((c) => ({ ...c, tipo: "cobro" })) : (pagos || []).filter((c) => c.importe === -m.importe);
      const pts = lista.map((c) => [c, puntuar(m, c)]).filter(([, s]) => s >= 0).sort((a, b) => b[1] - a[1]);
      cand.push({ m, pts });
    }
    // asignación voraz sin repetir candidato
    const todas = []; cand.forEach((x, i) => x.pts.forEach(([c, s]) => todas.push({ i, c, s })));
    todas.sort((a, b) => b.s - a.s);
    const usados = new Set(), hechos = new Set(), asig = new Map();
    for (const t of todas) {
      const k = t.c.tipo + ":" + t.c.id;
      if (hechos.has(t.i) || usados.has(k)) continue;
      asig.set(t.i, t); hechos.add(t.i); usados.add(k);
    }
    return cand.map((x, i) => {
      const a = asig.get(i);
      if (!a) return { mov: x.m, candidato: null, confianza: "ninguna", alternativas: x.pts.slice(0, 3).map(([c, s]) => ({ ...c, puntos: s })) };
      const otras = x.pts.filter(([c]) => c.tipo + ":" + c.id !== a.c.tipo + ":" + a.c.id);
      const rival = otras.length ? otras[0][1] : -1;
      const conf = a.s >= 85 && a.s - rival >= 15 ? "alta" : a.s >= 65 ? "media" : "baja";
      return { mov: x.m, candidato: { ...a.c, puntos: a.s }, confianza: conf, alternativas: otras.slice(0, 3).map(([c, s]) => ({ ...c, puntos: s })) };
    });
  }

  /* =====================================================================
     INCENTIVOS · nunca por encima de lo que gana la empresa
     ===================================================================== */
  const INC_MAX_PCT = 15;                  // tope duro (el servidor lo vuelve a comprobar)
  const INC_DEF = { pct: 10, topePersona: 15000, penalRetrabajo: 15, soloCobradas: true }; // 10 % del excedente · 150 € por persona y periodo · −15 % por retrabajo
  function calcularIncentivo(p) {
    const cfg = { ...INC_DEF, ...(p.cfg || {}) };
    cfg.pct = Math.max(0, Math.min(INC_MAX_PCT, Number(cfg.pct) || 0));
    cfg.topePersona = Math.max(0, Math.round(Number(cfg.topePersona) || 0));
    const filas = p.filas || [], retr = p.retrabajos || {}, avisos = [], excluidas = [];
    const buenas = [];
    for (const r of filas) {
      if (r.fecha < p.desde || r.fecha > p.hasta) continue;
      const motivo = (cfg.soloCobradas && (r.pendiente || 0) > 0) ? "sin cobrar del todo" : !r.facturada ? "sin factura emitida" : (r.avisos || []).some((a) => /No se fich/i.test(a)) ? "sin horas fichadas (beneficio inflado)" : "";
      if (motivo) excluidas.push({ token: r.token, num: r.num, coche: r.coche, motivo }); else buenas.push(r);
    }
    const beneficio = buenas.reduce((a, r) => a + (r.beneficio || 0), 0);
    const fijos = Math.max(0, Math.round(p.fijos || 0));
    const excedente = Math.max(0, beneficio - fijos);
    const pool = Math.floor(excedente * cfg.pct / 100);
    let motivoCero = "";
    if (!cfg.activo && cfg.activo !== undefined) motivoCero = "Los incentivos están desactivados.";
    else if (!buenas.length) motivoCero = "No hay coches entregados, facturados y cobrados en el periodo.";
    else if (beneficio <= fijos) motivoCero = "Los gastos fijos del periodo todavía no están cubiertos: no hay excedente que repartir.";
    // reparto por horas × calidad (la persona «Gerente» no cobra incentivo)
    const min = new Map();
    for (const r of buenas) for (const t of r.trabajadores || []) { if (!t.nombre || /^gerente$/i.test(t.nombre) || t.nombre === "—") continue; min.set(t.nombre, (min.get(t.nombre) || 0) + (t.minutos || 0)); }
    const filasP = [...min.entries()].map(([nombre, minutos]) => {
      const n = Math.max(0, Math.round(Number(retr[nombre]) || 0)), factor = Math.max(0, 100 - cfg.penalRetrabajo * n) / 100;
      return { nombre, minutos, retrabajos: n, factor, peso: minutos * factor, importe: 0, recortado: false };
    }).sort((a, b) => b.minutos - a.minutos);
    const W = filasP.reduce((a, x) => a + x.peso, 0), poolEf = motivoCero ? 0 : pool;
    if (!motivoCero && W <= 0) motivoCero = "Nadie ha fichado horas en los coches del periodo.";
    for (const x of filasP) {
      if (motivoCero || W <= 0) break;
      const bruto = Math.floor(poolEf * x.peso / W);
      x.importe = Math.min(bruto, cfg.topePersona); x.recortado = bruto > cfg.topePersona;
    }
    const pagado = filasP.reduce((a, x) => a + x.importe, 0);
    if (excluidas.length) avisos.push(`${excluidas.length} coche(s) no cuentan para el incentivo: ${[...new Set(excluidas.map((e) => e.motivo))].join(", ")}.`);
    return { cfg, beneficio, fijos, excedente, pool: motivoCero ? 0 : pool, pagado, sobrante: (motivoCero ? 0 : pool) - pagado, empresaSeQueda: beneficio - pagado, motivoCero, filas: filasP, excluidas, avisos, coches: buenas.length };
  }

  /* =====================================================================
     CLIENTES 360 · historial y avisos pendientes
     ===================================================================== */
  const digitos = (s) => String(s || "").replace(/\D/g, "");
  const tel9 = (s) => { const d = digitos(s); return d.length >= 9 ? d.slice(-9) : ""; };
  const matricula = (s) => String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const claveCliente = (nombre, tel) => tel9(tel) ? "t" + tel9(tel) : "n" + alnum(nombre);
  const SERV = {
    aceite: { txt: "Cambio de aceite", re: /aceite|filtro de aceite|cambio de filtros/i, meses: 12, kmInt: 15000 },
    revision: { txt: "Revisión", re: /revisi[oó]n|mantenimiento|inspecci[oó]n|puesta a punto/i, meses: 12 },
    itv: { txt: "ITV", re: /\bitv\b|pre-?itv/i, meses: 24 },
  };
  function textoOrden(o) {
    const p = o.presupuesto || {}, ls = (p.lineas || []).map((l) => l.c || l.concepto || "").join(" · ");
    return [ls, o.motivo || "", o.descripcion || "", o.trabajo || "", (o.f1 && o.f1.motivo) || ""].join(" · ");
  }
  function fechaOrden(o) { return fechaOk(String(o.creado || "").slice(0, 10)) || ""; }
  function fechaEntrega(o) {
    const pe = [...(o.pasos || [])].reverse().find((x) => x.estado === "entregado");
    return pe && pe.t ? fechaOk(String(pe.t).slice(0, 10)) : "";
  }
  // Agrupa leads (CRM) + órdenes (taller) en clientes. facturas: mapa token → {total, cobrado, num} desde Finanzas.
  function agruparClientes(leads, ordenes, facturas) {
    const M = new Map();
    const dame = (nombre, tel, email) => {
      const k = claveCliente(nombre, tel); if (!alnum(nombre) && !tel9(tel)) return null;
      let c = M.get(k);
      if (!c) { c = { id: k, nombre: String(nombre || "").trim(), telefono: String(tel || "").trim(), email: String(email || "").trim(), leads: [], ordenes: [], vehiculos: new Map() }; M.set(k, c); }
      else { if (!c.telefono && tel) c.telefono = String(tel).trim(); if (!c.email && email) c.email = String(email).trim(); if (c.nombre.length < String(nombre || "").trim().length && !tel9(c.telefono)) c.nombre = String(nombre).trim(); }
      return c;
    };
    for (const l of leads || []) { const c = dame(l.nombre, l.telefono, l.email); if (!c) continue; c.leads.push(l); if (l.vehiculo && (l.vehiculo.matricula || l.vehiculo.coche)) addVeh(c, l.vehiculo); }
    for (const o of ordenes || []) { const cl = o.cliente || {}, c = dame(cl.nombre, cl.telefono, cl.email); if (!c) continue; c.ordenes.push(o); if (o.vehiculo) addVeh(c, o.vehiculo); }
    function addVeh(c, v) {
      const mat = matricula(v.matricula), k = mat || "sin-" + alnum(v.coche || v.marcaModelo || "coche");
      if (!c.vehiculos.has(k)) c.vehiculos.set(k, { clave: k, matricula: mat, coche: v.coche || v.marcaModelo || "", km: Number(v.km) || 0 });
      else { const x = c.vehiculos.get(k); if (!x.coche && (v.coche || v.marcaModelo)) x.coche = v.coche || v.marcaModelo; if (Number(v.km) > x.km) x.km = Number(v.km); }
    }
    const out = [];
    for (const c of M.values()) {
      const hist = c.ordenes.map((o) => {
        const f = facturas && facturas[o.token], p = o.presupuesto || {}, lineas = p.lineas || [];
        const baseP = Math.round(lineas.reduce((a, l) => a + (Number(l.n) || 0) * (Number(l.p) || 0), 0) * 100), igic = Number(p.igic);
        const totalP = p.estado === "aceptado" ? baseP + Math.round(baseP * (Number.isFinite(igic) ? igic : 0) / 100) : 0;
        const total = f ? f.total : totalP;
        return {
          token: o.token, num: o.num || "", fecha: fechaEntrega(o) || fechaOrden(o), estado: o.estado || "", coche: (o.vehiculo && (o.vehiculo.coche || o.vehiculo.marcaModelo)) || "", matricula: matricula(o.vehiculo && o.vehiculo.matricula),
          km: Number(o.vehiculo && o.vehiculo.km) || 0, trabajos: lineas.map((l) => l.c || l.concepto).filter(Boolean), texto: textoOrden(o), total, cobrado: f ? f.cobrado : 0, factura: f ? f.num : "", presupuesto: p.estado || "",
        };
      }).sort((a, b) => b.fecha.localeCompare(a.fecha));
      const hechas = hist.filter((h) => ["entregado", "listo"].includes(h.estado) || h.total > 0);
      const gastado = hechas.reduce((a, h) => a + h.total, 0);
      out.push({ id: c.id, nombre: c.nombre, telefono: c.telefono, email: c.email, vehiculos: [...c.vehiculos.values()], historial: hist, leads: c.leads, visitas: hist.length, gastado, pendienteCobro: hist.reduce((a, h) => a + Math.max(0, h.total - h.cobrado), 0), ultima: hist.length ? hist[0].fecha : "", primera: hist.length ? hist[hist.length - 1].fecha : "", ticket: hechas.length ? Math.round(gastado / hechas.length) : 0 });
    }
    return out.sort((a, b) => (b.ultima || "").localeCompare(a.ultima || "") || a.nombre.localeCompare(b.nombre));
  }
  // Estado de los servicios de UN vehículo. datos = lo que el gerente haya apuntado a mano (gana sobre lo detectado).
  function serviciosVehiculo(hist, datos, hoy, cfg) {
    const c = { aceiteMeses: 12, revisionMeses: 12, avisoDias: 30, ...(cfg || {}) }, d = datos || {}, out = [];
    const ultima = (re) => { const h = (hist || []).filter((x) => x.fecha && ["entregado", "listo"].includes(x.estado) && re.test(x.texto || "")).sort((a, b) => b.fecha.localeCompare(a.fecha))[0]; return h ? { fecha: h.fecha, km: h.km || 0, orden: h.num } : null; };
    const estado = (vence) => { if (!vence) return { estado: "sin-dato", dias: null }; const dd = difDias(vence, hoy); return { estado: dd < 0 ? "vencido" : dd <= c.avisoDias ? "proximo" : "ok", dias: dd }; };
    // aceite
    { const a = ultima(SERV.aceite.re), f = fechaOk(d.aceiteFecha) || (a && a.fecha) || "", km = Number(d.aceiteKm) || (a && a.km) || 0;
      let vence = f ? addMeses(f, c.aceiteMeses) : "";
      const kmAct = Number(d.kmActual) || 0, kmV = f && km && kmAct ? km + SERV.aceite.kmInt : 0;
      let por = vence ? "tiempo" : "";
      if (kmV && kmAct >= kmV) { vence = hoy; por = "km"; }
      const est = por === "km" ? { estado: "vencido", dias: -1 } : estado(vence); // pasado de kilómetros = vencido aunque la fecha aún no
      out.push({ tipo: "aceite", txt: SERV.aceite.txt, ultimo: f, origen: d.aceiteFecha ? "manual" : a ? "detectado en el taller" : "", vence, por, ...est, detalle: kmV && kmAct ? `${kmAct.toLocaleString("es-ES")} km (toca a los ${kmV.toLocaleString("es-ES")} km)` : "" }); }
    // revisión
    { const a = ultima(SERV.revision.re), f = fechaOk(d.revisionFecha) || (a && a.fecha) || "", vence = f ? addMeses(f, c.revisionMeses) : "";
      out.push({ tipo: "revision", txt: SERV.revision.txt, ultimo: f, origen: d.revisionFecha ? "manual" : a ? "detectado en el taller" : "", vence, por: "tiempo", ...estado(vence), detalle: "" }); }
    // ITV
    { let vence = fechaOk(d.itvVence), origen = vence ? "manual" : "", detalle = "";
      if (!vence) {
        const a = ultima(SERV.itv.re), mat = fechaOk(d.matriculacion), ult = fechaOk(d.itvUltima) || (a && a.fecha) || "";
        if (mat || ult) {
          if (ult) { const edad = mat ? (difDias(ult, mat) / 365.25) : 0, anios = mat && edad > 10 ? 1 : 2; vence = addMeses(ult, anios * 12); origen = "calculada"; detalle = `Última ITV ${fechaES(ult)}${mat ? "" : " (sin fecha de matriculación: se asume cada 2 años)"}`; }
          else { vence = addMeses(mat, 48); origen = "calculada"; detalle = "Primera ITV a los 4 años de la matriculación"; }
        }
      }
      out.push({ tipo: "itv", txt: SERV.itv.txt, ultimo: fechaOk(d.itvUltima), origen, vence, por: "tiempo", ...estado(vence), detalle }); }
    // «Y demás»: avisos que apunta el gerente a mano para ese coche (correa, neumáticos, batería…). Sin plazos inventados.
    (Array.isArray(d.otros) ? d.otros : []).slice(0, 6).forEach((o, i) => { const vence = fechaOk(o && o.vence), txt = String((o && o.txt) || "").trim().slice(0, 60); if (!txt || !vence) return; out.push({ tipo: "otro", idx: i, txt, ultimo: "", origen: "manual", vence, por: "tiempo", ...estado(vence), detalle: "" }); });
    return out;
  }
  // ¿Se puede ofrecer el WhatsApp de este servicio? ITV: NO desde aquí (Taller ya envía los avisos de ITV a 30 y 7 días, con permiso firmado y lista de bajas; si lo hiciera también el ERP el cliente recibiría dos).
  // Baja pedida después de dar permiso: no se avisa de nada. El resto de avisos los decide el gerente uno a uno y el mensaje trae la baja.
  function puedeAvisar(serv, cons, bajas, tel) {
    const t9 = tel9(tel), baja = bajas && t9 ? bajas[t9] : "";
    if (baja && (!cons || !cons.permiso || String(baja) > String(cons.permiso))) return { ok: false, motivo: "Pidió la baja de avisos" };
    if (serv.tipo === "itv") return { ok: false, motivo: cons && cons.avisosITV ? "Lo avisa Taller → Avisos de ITV (30 y 7 días antes)" : "Sin permiso firmado para avisos de ITV" };
    if (!t9) return { ok: false, motivo: "Sin teléfono" };
    return { ok: true, motivo: "" };
  }
  const waNum = (t) => { let d = digitos(t); if (d.length === 9) d = "34" + d; return d; };
  function mensajeAviso(nombre, coche, matricula_, serv, vence) {
    const n = String(nombre || "").trim().split(/\s+/)[0] || "";
    const v = [coche, matricula_].filter(Boolean).join(" · ");
    const que = { aceite: "el cambio de aceite", revision: "la revisión", itv: "la ITV" }[serv.tipo] || ("«" + serv.txt + "»");
    const cuando = serv.estado === "vencido" ? `lleva retraso desde el ${fechaES(vence)}` : `toca el ${fechaES(vence)}`;
    return `Hola${n ? " " + n : ""}, te escribimos de Volcano Cars. Mirando el historial de tu ${v || "coche"}, ${que} ${cuando}. ¿Te damos cita? Respóndenos por aquí y te buscamos hueco. Si prefieres no recibir más avisos, responde BAJA.`;
  }

  /* =====================================================================
     COCHES PROPIOS · margen real y días en stock
     ===================================================================== */
  function margenCoche(x) {
    // x: {venta (base sin IGIC, cents), compra, reac, gastos, tenenciaDia, dias}
    const tenencia = Math.round((x.tenenciaDia || 0) * (x.dias || 0));
    const costes = (x.compra || 0) + (x.reac || 0) + (x.gastos || 0) + tenencia;
    const margen = (x.venta || 0) - costes;
    return { costes, tenencia, margen, pct: x.venta ? Math.round((margen / x.venta) * 1000) / 10 : 0 };
  }

  /* =====================================================================
     RECAMBIOS · reposición inteligente
     ===================================================================== */
  // movs: movimientos del almacén de los últimos N días (salida = cantidad negativa). pz: piezas del almacén.
  function reposicion(piezas, movs, hoy, o) {
    const dias = (o && o.dias) || 90, plazo = (o && o.plazoDias) || 7, margen = (o && o.margenDias) || 7, desde = addDias(hoy, -dias);
    const cons = new Map(), ult = new Map();
    for (const m of movs || []) {
      const f = String(m.t || "").slice(0, 10);
      if (m.tipo === "salida") { if (f >= desde) cons.set(m.sku, (cons.get(m.sku) || 0) + Math.max(0, -m.cantidad - (m.devuelto || 0))); if (!ult.get(m.sku) || f > ult.get(m.sku)) ult.set(m.sku, f); }
    }
    return (piezas || []).map((p) => {
      const c = cons.get(p.sku) || 0, dia = c / dias, stock = Number(p.stock) || 0, min = Number(p.minimo) || 0;
      const cobertura = dia > 0 ? Math.floor(stock / dia) : null;
      const sugerido = Math.ceil(dia * (plazo + margen)); // mínimo recomendado = lo que se gasta mientras llega el pedido + margen
      const objetivo = Math.max(min, sugerido), pedir = stock <= Math.max(min, Math.ceil(dia * plazo)) ? Math.max(0, Math.ceil(objetivo * 2 - stock)) : 0;
      const ultimo = ult.get(p.sku) || "", parado = !c && stock > 0 && (!ultimo || difDias(hoy, ultimo) > 180);
      const coste = Number(p.coste) || 0;
      return { id: p.id, sku: p.sku, nombre: p.nombre, unidad: p.unidad || "", proveedor: p.proveedor || "", stock, minimo: min, consumo: c, consumoDia: dia, cobertura, sugerido, pedir, ultimoUso: ultimo, parado, valorParado: parado ? Math.round(stock * coste) : 0, coste, bajoMinimo: stock <= min, sinMinimo: min === 0 && c > 0 };
    });
  }


  /* =====================================================================
     CONTABILIDAD · asientos automáticos desde Finanzas + manuales, mayor, sumas y saldos, PyG y balance
     Todo en céntimos. Cada asiento cuadra por construcción (Σ debe = Σ haber).
     ===================================================================== */
  const PLAN = {
    "100": "Capital social", "112": "Reserva legal", "113": "Reservas voluntarias", "129": "Resultado del ejercicio",
    "170": "Deudas a largo plazo con entidades de crédito", "206": "Aplicaciones informáticas", "213": "Maquinaria", "214": "Utillaje", "216": "Mobiliario", "217": "Equipos para procesos de información", "218": "Elementos de transporte", "281": "Amortización acumulada del inmovilizado material",
    "300": "Mercaderías (vehículos)", "400": "Proveedores", "410": "Acreedores por prestaciones de servicios", "430": "Clientes", "465": "Remuneraciones pendientes de pago",
    "472": "H.P. IGIC soportado", "475": "H.P. acreedora por conceptos fiscales", "476": "Organismos de la Seguridad Social, acreedores", "477": "H.P. IGIC repercutido",
    "520": "Deudas a corto plazo con entidades de crédito", "555": "Partidas pendientes de aplicación", "570": "Caja, euros", "572": "Bancos e instituciones de crédito c/c vista",
    "600": "Compras de mercaderías", "602": "Compras de otros aprovisionamientos", "610": "Variación de existencias de mercaderías", "621": "Arrendamientos y cánones", "622": "Reparaciones y conservación", "623": "Servicios de profesionales independientes", "625": "Primas de seguros", "626": "Servicios bancarios y similares", "627": "Publicidad, propaganda y relaciones públicas", "628": "Suministros", "629": "Otros servicios", "631": "Otros tributos", "640": "Sueldos y salarios", "642": "Seguridad Social a cargo de la empresa", "662": "Intereses de deudas", "681": "Amortización del inmovilizado material",
    "700": "Ventas de mercaderías", "705": "Prestaciones de servicios", "759": "Ingresos por servicios diversos", "769": "Otros ingresos financieros",
  };
  // Qué cuenta usa cada categoría de gasto de Finanzas (orientativo: el gestor lo revisa)
  const CAT_CUENTA = { alquiler: "621", nominas: "640", seguros: "625", asesoria: "623", autonomos: "642", luz: "628", agua: "628", telefono: "629", software: "629", publicidad: "627", recambios: "602", itv: "631", combustible: "629", herramientas: "629", reacondicionamiento: "600", mantenimiento: "622" };
  const cuentaGasto = (g) => (g.sinClasificar ? "555" : CAT_CUENTA[g.categoria] || "629");
  const cuentaPago = (metodo, origen) => (metodo === "efectivo" || origen === "caja" ? "570" : "572");
  const ORDEN_ORIGEN = { apertura: 0, venta: 1, "coste-vehiculo": 2, proveedor: 3, gasto: 4, cobro: 5, manual: 6, regularizacion: 7 };
  function asiento(origen, fecha, concepto, ref, lin) {
    const lineas = []; let D = 0, H = 0;
    for (const [cuenta, v] of lin) { const n = Math.round(v); if (!n) continue; if (n > 0) { lineas.push({ cuenta, debe: n, haber: 0 }); D += n; } else { lineas.push({ cuenta, debe: 0, haber: -n }); H += -n; } }
    return lineas.length >= 2 && D === H ? { origen, fecha, concepto, ref, lineas, total: D, manual: false } : null;
  }
  // Genera TODOS los asientos automáticos hasta la fecha pedida (numeración estable A-AAAA-NNNN por año)
  function asientosAuto(d) {
    const A = [], hasta = d.hasta || "9999-12-31", ok = (f) => f && f <= hasta;
    for (const x of d.emitidas || []) {
      if (!ok(x.fecha)) continue; const total = Math.round(x.total || 0), imp = Math.round(x.impuesto || 0), ing = x.tipo === "venta" ? "700" : "705";
      const a = asiento("venta", x.fecha, `${x.num ? "Factura " + x.num : "Venta"} · ${x.cliente || x.concepto || ""}`.trim(), x.id, [["430", total], [ing, -(total - imp)], ["477", -imp]]); if (a) A.push(a);
    }
    for (const c of d.cobros || []) { if (!ok(c.fecha)) continue; const a = asiento("cobro", c.fecha, `Cobro ${c.metodo || ""} · ${c.concepto || ""}`.trim(), c.id, [[cuentaPago(c.metodo, c.origen), c.importe], ["430", -c.importe]]); if (a) A.push(a); }
    for (const g of d.recibidas || []) {
      if (!ok(g.fecha)) continue; const total = Math.round(g.total || 0), imp = g.sinClasificar ? 0 : Math.round(g.impuesto || 0);
      const a = asiento("gasto", g.fecha, `${g.proveedor || "Gasto"}${g.factura ? " · " + g.factura : ""} · ${g.concepto || ""}`.trim(), g.id, [[cuentaGasto(g), total - imp], ["472", imp], [cuentaPago(g.metodo, g.origen), -total]]); if (a) A.push(a);
    }
    for (const f of d.pendProv || []) {
      if (!ok(f.fecha)) continue; const total = Math.round(f.total || 0), imp = Math.round(f.igic || 0);
      const a = asiento("proveedor", f.fecha, `Factura ${f.num || ""} · ${f.proveedor || ""} (pendiente de pago)`.trim(), f.id, [[CAT_CUENTA[f.categoria] || "602", total - imp], ["472", imp], ["400", -total]]); if (a) A.push(a);
    }
    // Coste de compra del coche vendido: se reconoce el día de la venta (el reacondicionamiento ya está en los gastos)
    for (const c of d.coches || []) { if (!ok(c.fecha) || !(c.compra > 0)) continue; const a = asiento("coste-vehiculo", c.fecha, `Coste de compra del vehículo vendido · ${c.nombre || c.coche || ""}`.trim(), "cv-" + c.coche, [["600", c.compra], ["572", -c.compra]]); if (a) A.push(a); }
    return A;
  }
  // Junta automáticos y manuales (los anulados no cuentan), los ordena y les pone número; el filtro por periodo va aparte
  function libroDiario(auto, manuales) {
    const L = (auto || []).map((a) => ({ ...a, origen: a.origen })), seq = {};
    for (const m of manuales || []) { if (m.anulado) continue; L.push({ origen: m.tipo === "manual" ? "manual" : m.tipo, fecha: m.fecha, concepto: m.concepto, ref: m.id, num: m.num, lineas: m.lineas.map((l) => ({ cuenta: l.cuenta, debe: l.debe, haber: l.haber, nota: l.nota || "" })), total: m.total, manual: true }); }
    L.sort((a, b) => a.fecha.localeCompare(b.fecha) || (ORDEN_ORIGEN[a.origen] ?? 9) - (ORDEN_ORIGEN[b.origen] ?? 9) || String(a.ref).localeCompare(String(b.ref)));
    for (const a of L) { if (a.manual) continue; const y = a.fecha.slice(0, 4); seq[y] = (seq[y] || 0) + 1; a.num = `A-${y}-${String(seq[y]).padStart(4, "0")}`; }
    return L;
  }
  const entre = (L, desde, hasta) => L.filter((a) => a.fecha >= desde && a.fecha <= hasta);
  function filasDiario(L) { const f = []; for (const a of L) for (const l of a.lineas) f.push({ fecha: a.fecha, num: a.num, cuenta: l.cuenta, nombre: PLAN[l.cuenta] || "", concepto: a.concepto, debe: l.debe, haber: l.haber, origen: a.origen }); return f; }
  function mayor(L, cuenta) {
    let saldo = 0; const mov = [];
    for (const a of L) for (const l of a.lineas) if (l.cuenta === cuenta) { saldo += l.debe - l.haber; mov.push({ fecha: a.fecha, num: a.num, concepto: a.concepto, debe: l.debe, haber: l.haber, saldo }); }
    return { cuenta, nombre: PLAN[cuenta] || "", movimientos: mov, debe: mov.reduce((a, m) => a + m.debe, 0), haber: mov.reduce((a, m) => a + m.haber, 0), saldo };
  }
  function sumasSaldos(L) {
    const m = new Map();
    for (const a of L) for (const l of a.lineas) { const r = m.get(l.cuenta) || { cuenta: l.cuenta, nombre: PLAN[l.cuenta] || "", debe: 0, haber: 0 }; r.debe += l.debe; r.haber += l.haber; m.set(l.cuenta, r); }
    const filas = [...m.values()].sort((a, b) => a.cuenta.localeCompare(b.cuenta)).map((r) => ({ ...r, deudor: Math.max(0, r.debe - r.haber), acreedor: Math.max(0, r.haber - r.debe) }));
    const t = filas.reduce((a, r) => ({ debe: a.debe + r.debe, haber: a.haber + r.haber, deudor: a.deudor + r.deudor, acreedor: a.acreedor + r.acreedor }), { debe: 0, haber: 0, deudor: 0, acreedor: 0 });
    return { filas, total: t, cuadra: t.debe === t.haber && t.deudor === t.acreedor };
  }
  const GRUPOS_PYG = [
    ["Importe neto de la cifra de negocios", ["700", "705"]], ["Otros ingresos de explotación", ["759"]],
    ["Aprovisionamientos", ["600", "602", "610"]], ["Gastos de personal", ["640", "642"]],
    ["Otros gastos de explotación", ["621", "622", "623", "625", "626", "627", "628", "629", "631"]], ["Amortización del inmovilizado", ["681"]],
  ];
  function pyg(L) {
    const s = new Map(); for (const a of L) for (const l of a.lineas) s.set(l.cuenta, (s.get(l.cuenta) || 0) + l.debe - l.haber); // debe − haber
    const imp = (c) => (c[0] === "7" ? -(s.get(c) || 0) : -(s.get(c) || 0)); // ingresos positivos, gastos negativos
    const grupos = GRUPOS_PYG.map(([t, cs]) => ({ t, cuentas: cs.filter((c) => s.has(c)).map((c) => ({ cuenta: c, nombre: PLAN[c], importe: imp(c) })), importe: cs.reduce((a, c) => a + imp(c), 0) }));
    const explotacion = grupos.reduce((a, g) => a + g.importe, 0);
    const fin = ["662", "769"].map((c) => ({ cuenta: c, nombre: PLAN[c], importe: imp(c) })).filter((x) => s.has(x.cuenta)), financiero = fin.reduce((a, x) => a + x.importe, 0);
    const ingresos = [...s.keys()].filter((c) => c[0] === "7").reduce((a, c) => a + imp(c), 0), gastos = [...s.keys()].filter((c) => c[0] === "6").reduce((a, c) => a - imp(c), 0);
    return { grupos, explotacion, financiero, financieras: fin, resultado: explotacion + financiero, ingresos, gastos };
  }
  const ACTIVO_NC = ["206", "213", "214", "216", "217", "218", "281"], ACTIVO_C = ["300", "430", "472", "555", "570", "572"], PN = ["100", "112", "113", "129"], PASIVO_NC = ["170"], PASIVO_C = ["400", "410", "465", "475", "476", "477", "520"];
  function balance(L) {
    const s = new Map(); for (const a of L) for (const l of a.lineas) s.set(l.cuenta, (s.get(l.cuenta) || 0) + l.debe - l.haber);
    const act = (cs) => cs.filter((c) => s.has(c)).map((c) => ({ cuenta: c, nombre: PLAN[c], importe: s.get(c) })), pas = (cs) => cs.filter((c) => s.has(c)).map((c) => ({ cuenta: c, nombre: PLAN[c], importe: -s.get(c) }));
    const suma = (f) => f.reduce((a, x) => a + x.importe, 0);
    const resultado = -[...s.keys()].filter((c) => c[0] === "6" || c[0] === "7").reduce((a, c) => a + s.get(c), 0);
    const anc = act(ACTIVO_NC), ac = act(ACTIVO_C), pn = pas(PN), pnc = pas(PASIVO_NC), pc = pas(PASIVO_C);
    const activo = suma(anc) + suma(ac), pasivo = suma(pn) + resultado + suma(pnc) + suma(pc);
    const sinClasificar = [...s.keys()].filter((c) => !"67".includes(c[0]) && ![...ACTIVO_NC, ...ACTIVO_C, ...PN, ...PASIVO_NC, ...PASIVO_C].includes(c));
    return { activoNoCorriente: anc, activoCorriente: ac, patrimonio: pn, resultado, pasivoNoCorriente: pnc, pasivoCorriente: pc, activo, pasivo, descuadre: activo - pasivo, sinClasificar };
  }
  const COLS_DIARIO = [{ t: "Fecha", f: (r) => fechaES(r.fecha) }, { t: "Asiento", k: "num" }, { t: "Cuenta", k: "cuenta" }, { t: "Nombre de la cuenta", k: "nombre" }, { t: "Concepto", k: "concepto" }, { t: "Debe", n: 1, f: (r) => (r.debe ? numES(r.debe) : "") }, { t: "Haber", n: 1, f: (r) => (r.haber ? numES(r.haber) : "") }];
  const COLS_SUMAS = [{ t: "Cuenta", k: "cuenta" }, { t: "Nombre", k: "nombre" }, { t: "Debe", n: 1, f: (r) => numES(r.debe) }, { t: "Haber", n: 1, f: (r) => numES(r.haber) }, { t: "Saldo deudor", n: 1, f: (r) => (r.deudor ? numES(r.deudor) : "") }, { t: "Saldo acreedor", n: 1, f: (r) => (r.acreedor ? numES(r.acreedor) : "") }];

  return { cent, eur, numES, pctTxt, baseDe, fechaOk, addDias, difDias, addMeses, fechaES, trimestreDe, rangoTrimestre, vencimiento420, celdaCSV, aCSV,
    igicResumen, libroEmitidas, libroRecibidas, COLS_EMITIDAS, COLS_RECIBIDAS, COLS_IGIC, igicFilasCSV,
    totalFactura, lineasTotal, deudaProveedores, estadoPedido,
    parseBancoCSV, conciliar, fechaBanco, norm, alnum,
    INC_MAX_PCT, INC_DEF, calcularIncentivo,
    agruparClientes, serviciosVehiculo, mensajeAviso, puedeAvisar, waNum, tel9, matricula, claveCliente, SERV,
    margenCoche, reposicion,
    PLAN, CAT_CUENTA, cuentaGasto, cuentaPago, asientosAuto, libroDiario, entre, filasDiario, mayor, sumasSaldos, pyg, balance, COLS_DIARIO, COLS_SUMAS };
});
