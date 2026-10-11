// Pruebas del núcleo del ERP (Actualización 64). Ejecutar: node tools/pruebas/erp-logica.test.cjs
const assert = require("node:assert/strict");
// El proyecto es «type: module»: se carga erp-logic.js como script suelto (UMD) para que valga igual en el navegador y aquí
const E = (() => { const fs = require("node:fs"), path = require("node:path"), m = { exports: {} }; new Function("module", "exports", fs.readFileSync(path.join(__dirname, "../../public/erp-logic.js"), "utf8")).call(m.exports, m, m.exports); return m.exports; })();
let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); }; const eq = (a, b, m) => { n++; assert.deepEqual(a, b, m); };

// ---- dinero ----
eq(E.cent("1.234,56"), 123456); eq(E.cent("1234,56"), 123456); eq(E.cent("1234.56"), 123456); eq(E.cent("7.490"), 749000); eq(E.cent("12,5"), 1250);
eq(E.cent("-45,10"), -4510); eq(E.cent("(45,10)"), -4510); eq(E.cent("1,234.56"), 123456); eq(E.cent(12.34), 1234); eq(E.cent("0,07"), 7); eq(E.cent("1.234.567,89"), 123456789);
ok(Number.isNaN(E.cent("")), "vacío"); ok(Number.isNaN(E.cent("abc"))); ok(Number.isNaN(E.cent("12,3,4a"))); ok(Number.isNaN(E.cent(".")));
eq(E.eur(123456), "1.234,56 €"); eq(E.eur(-5), "−0,05 €"); eq(E.eur(0), "0,00 €"); eq(E.eur(100000000), "1.000.000,00 €");
eq(E.numES(-1234), "-12,34");

// ---- fechas ----
eq(E.fechaOk("2026-02-31"), ""); eq(E.fechaOk("2026-02-28"), "2026-02-28"); eq(E.addMeses("2026-01-31", 1), "2026-02-28"); eq(E.addMeses("2026-10-10", 12), "2027-10-10"); eq(E.addMeses("2026-03-31", -1), "2026-02-28");
eq(E.difDias("2026-10-10", "2026-10-01"), 9); eq(E.rangoTrimestre(2026, 4), { desde: "2026-10-01", hasta: "2026-12-31" }); eq(E.rangoTrimestre(2028, 1).hasta, "2028-03-31");
eq(E.vencimiento420(2026, 4), "2027-01-30"); eq(E.vencimiento420(2026, 3), "2026-10-20"); eq(E.trimestreDe("2026-12-31"), 4);

// ---- CSV ----
eq(E.celdaCSV("=1+1"), "'=1+1"); eq(E.celdaCSV('di"jo; x'), '"di""jo; x"'); eq(E.celdaCSV("-12,50", true), "-12,50");
{ const c = E.aCSV(E.COLS_EMITIDAS, [{ fecha: "2026-10-01", num: "F-2026-0001", cliente: "=HYPERLINK(x)", concepto: "A;B", base: 10000, pct: 7, cuota: 700, total: 10700, cobrado: 0, obs: "" }]);
  ok(c.includes("'=HYPERLINK(x)")); ok(c.includes("01/10/2026")); ok(c.includes("100,00;7;7,00;107,00;0,00")); }

// ---- IGIC ----
{
  const em = [
    { fecha: "2026-10-02", num: "F1", base: 10000, impuestoPct: 7, impuesto: 700, total: 10700, tipo: "taller" },
    { fecha: "2026-10-03", num: "F2", base: 20000, impuestoPct: 7, impuesto: 1400, total: 21400, tipo: "taller" },
    { fecha: "2026-10-05", num: "F3", base: 5000, impuestoPct: 0, impuesto: 0, total: 5000, tipo: "caja", sinFactura: true },
    { fecha: "2026-09-30", num: "FX", base: 99999, impuestoPct: 7, impuesto: 7000, total: 1, tipo: "taller" },
  ];
  const re = [{ fecha: "2026-10-04", factura: "A-1", base: 8000, impuestoPct: 7, impuesto: 560, total: 8560 }, { fecha: "2026-10-06", factura: "", base: 1000, impuestoPct: 7, impuesto: 70, total: 1070 }];
  const pend = [{ fecha: "2026-10-07", num: "P-9", base: 3000, igicPct: 7, igic: 210, total: 3210 }];
  const r = E.igicResumen(em, re, pend, "2026-10-01", "2026-12-31");
  eq(r.repercutido, 2100); eq(r.soportado, 840); eq(r.resultado, 1260); eq(r.nEmitidas, 3); eq(r.nRecibidas, 3);
  ok(r.avisos.some((a) => a.nivel === "rojo" && /SIN nº de factura/.test(a.txt)), "aviso gasto sin factura");
  ok(r.avisos.some((a) => /sin factura/.test(a.txt) && a.nivel === "ambar"));
  eq(r.emitidas.find((g) => g.pct === 7).base, 30000);
  const csv = E.aCSV(E.COLS_IGIC, E.igicFilasCSV(r)); ok(csv.includes("RESULTADO: a ingresar"));
}

// ---- compras ----
eq(E.totalFactura(10000, 7), { base: 10000, igic: 700, total: 10700 }); eq(E.totalFactura(3333, 9.5), { base: 3333, igic: 317, total: 3650 });
eq(E.lineasTotal([{ n: 2, precio: 1250 }, { n: 1.5, precio: 1000 }]), 4000);
{ const f = [
  { proveedor: "A", estado: "pendiente", total: 1000, vence: "2026-10-01" }, { proveedor: "A", estado: "pendiente", total: 500, vence: "2026-10-12" }, { proveedor: "A", estado: "pagada", total: 9999, vence: "2026-09-01" },
  { proveedor: "B", estado: "pendiente", total: 700, vence: "2026-11-30" }];
  const d = E.deudaProveedores(f, "2026-10-10");
  eq(d[0].proveedor, "A"); eq(d[0].vencida, 1000); eq(d[0].proxima, 500); eq(d[0].total, 1500); eq(d[1].alDia, 700); }
eq(E.estadoPedido({ estado: "enviado", lineas: [{ n: 2, recibido: 0 }, { n: 1, recibido: 0 }] }), "enviado");
eq(E.estadoPedido({ estado: "enviado", lineas: [{ n: 2, recibido: 2 }, { n: 1, recibido: 0 }] }), "parcial");
eq(E.estadoPedido({ estado: "enviado", lineas: [{ n: 2, recibido: 5 }, { n: 1, recibido: 1 }] }), "recibido");

// ---- banco: lectura ----
{
  const csv = "\uFEFFFecha;Concepto;Importe;Saldo\n01/10/2026;TRANSFERENCIA DE JUAN PEREZ F-2026-0001;107,00;1.500,00\n02/10/2026;PAGO RECAMBIOS SUR FACTURA A-1;-85,60;1.414,40\n03/10/26;\"COMISION; MANTENIMIENTO\";-1,50;1.412,90\n31/02/2026;MAL;10,00;0\n04/10/2026;SIN IMPORTE;;0\n";
  const r = E.parseBancoCSV(csv);
  eq(r.filas.length, 3); eq(r.errores.length, 2); eq(r.filas[0], { fecha: "2026-10-01", concepto: "TRANSFERENCIA DE JUAN PEREZ F-2026-0001", importe: 10700, saldo: 150000 });
  eq(r.filas[1].importe, -8560); eq(r.filas[2].concepto, "COMISION; MANTENIMIENTO"); eq(r.filas[2].fecha, "2026-10-03");
  const r2 = E.parseBancoCSV("Fecha,Descripción,Cargo,Abono\n2026-10-01,Pago luz,45.10,\n2026-10-02,Cobro bizum,,20.00\n");
  eq(r2.filas.map((x) => x.importe), [-4510, 2000]);
  const r3 = E.parseBancoCSV("hola\nmundo"); ok(r3.errores.length === 1 && !r3.filas.length);
  eq(E.parseBancoCSV("").filas.length, 0);
}
// ---- banco: conciliación ----
{
  const movs = [
    { fecha: "2026-10-01", concepto: "TRANSF JUAN PEREZ F-2026-0001", importe: 10700 },
    { fecha: "2026-10-02", concepto: "PAGO RECAMBIOS SUR", importe: -8560 },
    { fecha: "2026-10-03", concepto: "BIZUM", importe: 5000 },
    { fecha: "2026-10-09", concepto: "NADA QUE VER", importe: 77777 },
  ];
  const cobros = [{ id: "c1", fecha: "2026-10-01", importe: 10700, nombre: "Juan Perez", num: "F-2026-0001", metodo: "transferencia" }, { id: "c2", fecha: "2026-10-03", importe: 5000, nombre: "Ana", num: "F-2026-0002" }, { id: "c3", fecha: "2026-10-04", importe: 5000, nombre: "Luis", num: "F-2026-0003" }];
  const pagos = [{ id: "g1", tipo: "gasto", fecha: "2026-10-02", importe: 8560, nombre: "Recambios Sur", num: "A-1" }, { id: "p1", tipo: "fprov", fecha: "2026-10-02", importe: 8560, nombre: "Otro", num: "" }];
  const r = E.conciliar(movs, cobros, pagos);
  eq(r[0].candidato.id, "c1"); eq(r[0].confianza, "alta");
  eq(r[1].candidato.id, "g1"); // gana por nombre
  ok(r[2].candidato && ["c2", "c3"].includes(r[2].candidato.id)); ok(r[2].confianza !== "alta", "dos candidatos del mismo importe: no es alta");
  eq(r[3].candidato, null); eq(r[3].confianza, "ninguna");
  // un candidato no se usa dos veces
  const usados = r.filter((x) => x.candidato).map((x) => x.candidato.tipo + ":" + x.candidato.id); eq(usados.length, new Set(usados).size);
}

// ---- incentivos ----
{
  const fila = (o) => ({ token: "t" + Math.random(), num: "VC", coche: "X", fecha: "2026-10-05", facturada: true, pendiente: 0, avisos: [], trabajadores: [{ nombre: "Ana", minutos: 120 }, { nombre: "Luis", minutos: 60 }, { nombre: "Gerente", minutos: 600 }], beneficio: 100000, ...o });
  const base = { desde: "2026-10-01", hasta: "2026-10-31" };
  let r = E.calcularIncentivo({ ...base, filas: [fila({}), fila({})], fijos: 150000, cfg: { pct: 10 } });
  eq(r.beneficio, 200000); eq(r.excedente, 50000); eq(r.pool, 5000); ok(r.pagado <= r.pool); eq(r.filas.length, 2, "el gerente no cobra");
  eq(r.filas.find((x) => x.nombre === "Ana").importe, Math.floor(5000 * 240 / 360));
  // fijos sin cubrir → 0
  r = E.calcularIncentivo({ ...base, filas: [fila({})], fijos: 100000, cfg: { pct: 10 } }); eq(r.pool, 0); ok(/fijos/.test(r.motivoCero)); eq(r.pagado, 0);
  // sin cobrar / sin horas no cuentan
  r = E.calcularIncentivo({ ...base, filas: [fila({ pendiente: 500 }), fila({ avisos: ["No se fichó ningún tiempo (FORM-03): la mano de obra sale a 0"] }), fila({ facturada: false })], fijos: 0, cfg: {} }); eq(r.coches, 0); eq(r.pagado, 0); eq(r.excluidas.length, 3);
  // tope duro 15 % aunque pidan 90
  r = E.calcularIncentivo({ ...base, filas: [fila({ beneficio: 1000000 })], fijos: 0, cfg: { pct: 90, topePersona: 99999999 } }); eq(r.cfg.pct, 15); eq(r.pool, 150000); ok(r.pagado <= 150000);
  // tope por persona
  r = E.calcularIncentivo({ ...base, filas: [fila({ beneficio: 1000000 })], fijos: 0, cfg: { pct: 10, topePersona: 10000 } }); ok(r.filas.every((x) => x.importe <= 10000)); ok(r.filas.some((x) => x.recortado)); ok(r.empresaSeQueda >= 1000000 - 20000);
  // retrabajos penalizan
  r = E.calcularIncentivo({ ...base, filas: [fila({ trabajadores: [{ nombre: "Ana", minutos: 100 }, { nombre: "Luis", minutos: 100 }] , beneficio: 500000 })], fijos: 0, cfg: { pct: 10, topePersona: 1e9 }, retrabajos: { Ana: 2 } });
  ok(r.filas.find((x) => x.nombre === "Ana").importe < r.filas.find((x) => x.nombre === "Luis").importe);
  r = E.calcularIncentivo({ ...base, filas: [fila({ trabajadores: [{ nombre: "Ana", minutos: 100 }], beneficio: 500000 })], fijos: 0, cfg: { pct: 10 }, retrabajos: { Ana: 7 } }); eq(r.filas[0].factor, 0); eq(r.pagado, 0);
  // fuera de fechas
  r = E.calcularIncentivo({ ...base, filas: [fila({ fecha: "2026-09-30" })], fijos: 0, cfg: {} }); eq(r.coches, 0);
}

// ---- clientes y avisos ----
{
  const ords = [
    { token: "a", num: "VC-1", cliente: { nombre: "Juan Pérez", telefono: "+34 643 56 60 98" }, vehiculo: { coche: "Seat Ibiza", matricula: "1234 abc", km: 90000 }, estado: "entregado", creado: "2025-09-01T10:00:00Z", pasos: [{ estado: "entregado", t: "2025-09-03T10:00:00Z" }], presupuesto: { estado: "aceptado", igic: 7, lineas: [{ c: "Cambio de aceite y filtros", n: 1, p: 80 }, { c: "Pastillas delanteras", n: 1, p: 60 }] } },
    { token: "b", num: "VC-2", cliente: { nombre: "Juan Perez", telefono: "643566098" }, vehiculo: { coche: "Seat Ibiza", matricula: "1234ABC", km: 99000 }, estado: "entregado", creado: "2026-03-01T10:00:00Z", pasos: [{ estado: "entregado", t: "2026-03-02T10:00:00Z" }], presupuesto: { estado: "aceptado", igic: 7, lineas: [{ c: "Revisión", n: 1, p: 50 }] } },
    { token: "c", num: "VC-3", cliente: { nombre: "Ana", telefono: "" }, vehiculo: { coche: "Kia Rio", matricula: "" }, estado: "recibido", creado: "2026-10-08T10:00:00Z", presupuesto: { estado: "borrador", lineas: [] } },
  ];
  const leads = [{ id: "L1", nombre: "Juan Pérez", telefono: "643 566 098", tipo: "taller", estado: "ganada" }];
  const cl = E.agruparClientes(leads, ords, { a: { total: 14980, cobrado: 14980, num: "F-2025-0001" } });
  eq(cl.length, 2); const j = cl.find((c) => c.nombre.startsWith("Juan")); eq(j.vehiculos.length, 1); eq(j.visitas, 2); eq(j.historial[0].token, "b");
  eq(j.historial.find((h) => h.token === "a").total, 14980); eq(j.historial.find((h) => h.token === "b").total, 5350); eq(j.gastado, 20330); eq(j.leads.length, 1);
  const sv = E.serviciosVehiculo(j.historial.filter((h) => h.matricula === "1234ABC"), {}, "2026-10-10", {});
  const aceite = sv.find((s) => s.tipo === "aceite"), rev = sv.find((s) => s.tipo === "revision"), itv = sv.find((s) => s.tipo === "itv");
  eq(aceite.vence, "2026-09-03"); eq(aceite.estado, "vencido"); eq(rev.vence, "2027-03-02"); eq(rev.estado, "ok"); eq(itv.estado, "sin-dato");
  const sv2 = E.serviciosVehiculo([], { matriculacion: "2018-06-15", itvUltima: "2024-07-01" }, "2026-10-10", {}); eq(sv2.find((s) => s.tipo === "itv").vence, "2026-07-01"); eq(sv2.find((s) => s.tipo === "itv").estado, "vencido");
  const sv3 = E.serviciosVehiculo([], { matriculacion: "2012-06-15", itvUltima: "2026-05-01" }, "2026-10-10", {}); eq(sv3.find((s) => s.tipo === "itv").vence, "2027-05-01", "más de 10 años: cada año");
  const sv4 = E.serviciosVehiculo([], { matriculacion: "2023-06-15" }, "2026-10-10", {}); eq(sv4.find((s) => s.tipo === "itv").vence, "2027-06-15");
  const sv5 = E.serviciosVehiculo([], { itvVence: "2026-10-25" }, "2026-10-10", {}); eq(sv5.find((s) => s.tipo === "itv").estado, "proximo");
  const sv6 = E.serviciosVehiculo([], { aceiteFecha: "2026-08-01", aceiteKm: 100000, kmActual: 116000 }, "2026-10-10", {}); eq(sv6.find((s) => s.tipo === "aceite").estado, "vencido", "por km");
  eq(E.waNum("643 56 60 98"), "34643566098"); eq(E.waNum("+34643566098"), "34643566098");
  ok(E.mensajeAviso("Juan Pérez", "Seat Ibiza", "1234ABC", { tipo: "itv", txt: "ITV", estado: "vencido" }, "2026-07-01").includes("la ITV lleva retraso desde el 01/07/2026"));
}

// ---- coches ----
eq(E.margenCoche({ venta: 1000000, compra: 600000, reac: 100000, gastos: 20000, tenenciaDia: 500, dias: 30 }), { costes: 735000, tenencia: 15000, margen: 265000, pct: 26.5 });
eq(E.margenCoche({ venta: 0, compra: 100, dias: 0 }).margen, -100);

// ---- reposición ----
{
  const piezas = [{ id: "1", sku: "P1", nombre: "Pastillas", stock: 2, minimo: 4, coste: 1500 }, { id: "2", sku: "P2", nombre: "Aceite 5W30", stock: 20, minimo: 0, coste: 800 }, { id: "3", sku: "P3", nombre: "Rótula", stock: 3, minimo: 1, coste: 3000 }];
  const movs = [{ tipo: "salida", sku: "P1", cantidad: -9, t: "2026-09-01T10:00:00Z" }, { tipo: "salida", sku: "P2", cantidad: -45, t: "2026-09-15T10:00:00Z", devuelto: 0 }, { tipo: "salida", sku: "P3", cantidad: -1, t: "2025-01-01T10:00:00Z" }, { tipo: "entrada", sku: "P1", cantidad: 50, t: "2026-09-02T10:00:00Z" }];
  const r = E.reposicion(piezas, movs, "2026-10-10"); const p1 = r.find((x) => x.sku === "P1"), p2 = r.find((x) => x.sku === "P2"), p3 = r.find((x) => x.sku === "P3");
  ok(p1.bajoMinimo && p1.pedir > 0 && p1.consumo === 9); ok(p2.sinMinimo && p2.sugerido > 0 && p2.cobertura > 0); ok(p3.parado && p3.valorParado === 9000);
}
// avisos personalizados («y demás»)
{ const sv = E.serviciosVehiculo([], { otros: [{ txt: "Cambio de correa", vence: "2026-10-20" }, { txt: "", vence: "2026-10-20" }, { txt: "Sin fecha", vence: "" }] }, "2026-10-10", {}); const o = sv.filter((s) => s.tipo === "otro");
  eq(o.length, 1); eq(o[0].txt, "Cambio de correa"); eq(o[0].estado, "proximo"); eq(o[0].idx, 0);
  ok(E.mensajeAviso("Ana", "Kia Rio", "5678DEF", o[0], o[0].vence).includes("«Cambio de correa» toca el 20/10/2026")); }
// quién puede recibir avisos (consentimiento y bajas)
{ const sv = (tipo) => ({ tipo }); const cons = { avisosITV: true, permiso: "2026-09-18T10:00:00Z" };
  eq(E.puedeAvisar(sv("itv"), cons, {}, "676960348").ok, false, "la ITV la avisa Taller, no el ERP"); ok(/Taller/.test(E.puedeAvisar(sv("itv"), cons, {}, "676960348").motivo));
  ok(/Sin permiso/.test(E.puedeAvisar(sv("itv"), { avisosITV: false }, {}, "676960348").motivo)); ok(/Sin permiso/.test(E.puedeAvisar(sv("itv"), null, {}, "676960348").motivo));
  eq(E.puedeAvisar(sv("aceite"), null, {}, "676960348").ok, true); eq(E.puedeAvisar(sv("aceite"), null, {}, "").ok, false, "sin teléfono");
  eq(E.puedeAvisar(sv("aceite"), cons, { 676960348: "2026-10-01T00:00:00Z" }, "676 96 03 48").ok, false, "baja posterior al permiso");
  eq(E.puedeAvisar(sv("aceite"), cons, { 676960348: "2026-09-01T00:00:00Z" }, "676960348").ok, true, "baja anterior al permiso: vale el permiso nuevo");
  eq(E.puedeAvisar(sv("revision"), null, { 600111222: "2026-09-01T00:00:00Z" }, "600111222").ok, false, "baja sin ningún permiso");
  ok(E.mensajeAviso("Ana", "Kia", "5678DEF", { tipo: "aceite", txt: "Cambio de aceite", estado: "vencido" }, "2026-09-01").endsWith("responde BAJA.")); }
// ---- contabilidad ----
{
  const fs = require("node:fs"), path = require("node:path");
  const txt = fs.readFileSync(path.join(__dirname, "../../netlify/lib/plan-contable.mts"), "utf8"), srv = {}; for (const m of txt.matchAll(/"(\d{3})": "([^"]+)"/g)) srv[m[1]] = m[2];
  eq(srv, E.PLAN, "el plan de cuentas del servidor y el de la pantalla son el mismo");
  const dat = {
    hasta: "2026-12-31",
    emitidas: [{ id: "t1", tipo: "taller", fecha: "2026-10-02", num: "F-1", cliente: "Juan", total: 10700, impuesto: 700, base: 10000 }, { id: "v1", tipo: "venta", fecha: "2026-10-03", num: "FV-1", cliente: "Pepe", total: 749000, impuesto: 49000, base: 700000 }],
    cobros: [{ id: "c1", doc: "t1", fecha: "2026-10-05", metodo: "transferencia", importe: 10700, concepto: "x" }, { id: "c2", doc: "v1", fecha: "2026-10-04", metodo: "efectivo", importe: 5000 }],
    recibidas: [{ id: "g1", origen: "gasto", fecha: "2026-10-06", proveedor: "Endesa", factura: "E-1", concepto: "Luz", categoria: "luz", total: 22470, impuesto: 1470, metodo: "tarjeta" }, { id: "g2", origen: "caja", fecha: "2026-10-07", proveedor: "", concepto: "Salida de caja", categoria: "", total: 3000, impuesto: 0, metodo: "efectivo", sinClasificar: true }],
    pendProv: [{ id: "f1", fecha: "2026-10-08", num: "AA-1", proveedor: "Aceites", categoria: "recambios", total: 68480, igic: 4480 }],
    coches: [{ coche: "car1", nombre: "Seat León", fecha: "2026-10-03", compra: 500000 }],
  };
  const auto = E.asientosAuto(dat), L = E.libroDiario(auto, []);
  eq(auto.length, 8, "2 ventas + 2 cobros + 2 gastos + 1 factura pendiente + 1 coste de coche");
  ok(L.every((a) => a.lineas.reduce((x, l) => x + l.debe, 0) === a.lineas.reduce((x, l) => x + l.haber, 0)), "todos los asientos cuadran");
  eq(L[0].num, "A-2026-0001"); eq(L[0].origen, "venta"); eq(L[0].lineas, [{ cuenta: "430", debe: 10700, haber: 0 }, { cuenta: "705", debe: 0, haber: 10000 }, { cuenta: "477", debe: 0, haber: 700 }]);
  const vta = L.find((a) => a.ref === "v1"); ok(vta.lineas.some((l) => l.cuenta === "700" && l.haber === 700000), "el coche va a 700 Ventas");
  const g1 = L.find((a) => a.ref === "g1"); eq(g1.lineas, [{ cuenta: "628", debe: 21000, haber: 0 }, { cuenta: "472", debe: 1470, haber: 0 }, { cuenta: "572", debe: 0, haber: 22470 }], "la luz a 628 + IGIC soportado, pagado por banco");
  const g2 = L.find((a) => a.ref === "g2"); eq(g2.lineas, [{ cuenta: "555", debe: 3000, haber: 0 }, { cuenta: "570", debe: 0, haber: 3000 }], "una salida de caja sin clasificar va a «partidas pendientes»");
  const f1 = L.find((a) => a.ref === "f1"); ok(f1.lineas.some((l) => l.cuenta === "400" && l.haber === 68480) && f1.lineas.some((l) => l.cuenta === "602" && l.debe === 64000), "factura sin pagar a proveedores");
  const ss = E.sumasSaldos(L); ok(ss.cuadra, "sumas y saldos cuadra"); eq(E.mayor(L, "430").saldo, 10700 + 749000 - 10700 - 5000, "clientes: lo facturado menos lo cobrado"); eq(E.mayor(L, "477").saldo, -(700 + 49000));
  const py = E.pyg(L); eq(py.ingresos, 10000 + 700000); eq(py.gastos, 21000 + 3000 * 0 + 64000 + 500000, "gastos: luz + aceites + coste del coche (lo sin clasificar no es gasto aún)"); eq(py.resultado, py.ingresos - py.gastos);
  eq(py.grupos.find((g) => g.t.startsWith("Importe neto")).importe, 710000);
  const ba = E.balance(L); eq(ba.descuadre, 0, "activo = pasivo + patrimonio + resultado"); eq(ba.resultado, py.resultado); eq(ba.sinClasificar, []);
  // manuales: apertura sube capital y bancos; anulado no cuenta
  const man = [{ id: "m1", num: "M-2026-0001", fecha: "2026-10-01", concepto: "Apertura", tipo: "apertura", lineas: [{ cuenta: "572", debe: 500000, haber: 0 }, { cuenta: "100", debe: 0, haber: 500000 }], total: 500000, anulado: null }, { id: "m2", num: "M-2026-0002", fecha: "2026-10-01", concepto: "Anulado", tipo: "manual", lineas: [{ cuenta: "572", debe: 1, haber: 0 }, { cuenta: "100", debe: 0, haber: 1 }], total: 1, anulado: { t: "x", motivo: "y" } }];
  const L2 = E.libroDiario(auto, man); eq(L2.length, L.length + 1); eq(L2[0].origen, "apertura", "la apertura va primero del día"); eq(E.balance(L2).descuadre, 0); eq(E.balance(L2).patrimonio.find((x) => x.cuenta === "100").importe, 500000);
  eq(E.entre(L2, "2026-10-05", "2026-10-06").length, 2); eq(E.libroDiario(auto, []).map((a) => a.num), L.map((a) => a.num), "la numeración automática es estable");
  // abonos (importes negativos) siguen cuadrando y se invierten
  const ab = E.asientosAuto({ emitidas: [{ id: "n1", tipo: "taller", fecha: "2026-10-09", num: "R-1", total: -10700, impuesto: -700 }] }); eq(ab[0].lineas, [{ cuenta: "430", debe: 0, haber: 10700 }, { cuenta: "705", debe: 10000, haber: 0 }, { cuenta: "477", debe: 700, haber: 0 }]);
  eq(E.asientosAuto({ emitidas: [{ id: "z", tipo: "taller", fecha: "2026-10-09", total: 0, impuesto: 0 }] }), [], "nada que apuntar con importe cero");
  eq(E.asientosAuto({ ...dat, hasta: "2026-10-04" }).length, 4, "hasta una fecha solo entra lo anterior");
  const csv = E.aCSV(E.COLS_DIARIO, E.filasDiario(L)); ok(csv.split("\r\n").length === 1 + L.reduce((a, x) => a + x.lineas.length, 0)); ok(csv.includes("A-2026-0001"));
}
console.log("OK " + n + " comprobaciones del núcleo");
