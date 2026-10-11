import { readFileSync } from "node:fs";
// Prueba con el CÓDIGO REAL de finanzas, almacén, fotos, órdenes y sesiones + mi erp.mts. Solo el almacén de datos es simulado.
(globalThis as any).Netlify = { env: { get: (k: string) => ({ ADMIN_PASSWORD: "clave-de-prueba", SESSION_SECRET: "s3" } as any)[k] || "" }, context: { deploy: { context: "production" } } };
const { crearSesion } = await import("./netlify/lib/shared.mts");
const F = (await import("./netlify/functions/finanzas.mts")).default, A = (await import("./netlify/functions/almacen.mts")).default, FO = (await import("./netlify/functions/fotos.mts")).default, ERP = (await import("./netlify/functions/erp.mts")).default, OR = (await import("./netlify/functions/ordenes.mts")).default;
const tok = crearSesion().token;
const call = async (fn: any, m: string, path: string, body?: any, ct = "application/json") => { const raw = body !== undefined && ct === "application/json" ? JSON.stringify(body) : body; const r = await fn(new Request("https://volcanocars.test" + path, { method: m, headers: { authorization: "Bearer " + tok, "content-type": ct, origin: "https://volcanocars.test", host: "volcanocars.test" }, body: raw }), {}); let j: any = null; try { j = await r.json(); } catch { } return { s: r.status, j }; };
let n = 0; const ok = (c: any, m: string) => { n++; if (!c) { console.log("✗ " + m); process.exitCode = 1; } else console.log("✓ " + m); };
// 1. el ERP acepta la sesión real del gerente
let r = await call(ERP, "GET", "/api/erp/compras"); ok(r.s === 200, "ERP acepta la sesión real (" + r.s + ")");
// 2. almacén real: alta de pieza y entrada de mercancía con el MISMO formato que manda mi pantalla
r = await call(A, "POST", "/api/almacen/pieza", { nombre: "Pastillas delanteras", sku: "P-001", unidad: "ud", minimo: "4", coste: "10", proveedor: "Recambios Sur" }); ok(r.s === 200 || r.s === 201, "alta de pieza real (" + r.s + " " + JSON.stringify(r.j).slice(0, 120) + ")");
const pieza = (await call(A, "GET", "/api/almacen/estado")).j; ok(pieza && pieza.piezas && pieza.piezas.length === 1, "estado del almacén tiene piezas[]"); const pid = pieza.piezas[0].id;
r = await call(A, "POST", "/api/almacen/entrada", { albaran: "ALB-1", proveedor: "Recambios Sur", lineas: [{ pieza: pid, cantidad: "3", coste: "15" }, { pieza: pid, cantidad: "2,5", coste: "12,5" }] }); ok(r.s === 200, "entrada de mercancía real con mi formato (" + r.s + " " + JSON.stringify(r.j).slice(0, 150) + ")");
const est = (await call(A, "GET", "/api/almacen/estado")).j; ok(Math.abs(est.piezas[0].stock - 5.5) < 1e-9, "el stock sube a 5,5 (hay " + est.piezas[0].stock + ")");
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Atlantic/Canary" }).format(new Date());
const mv = (await call(A, "GET", `/api/almacen/movimientos?desde=2020-01-01&hasta=${hoy}`)).j; ok(Array.isArray(mv.movimientos) && mv.movimientos.some((m: any) => m.tipo === "entrada" && m.sku === "P-001"), "movimientos{movimientos[]} con tipo/sku como espera «Recambios»");
// 3. foto/PDF real + gasto real en Finanzas con mi formato, y luego mi factura-pagar sobre ese gasto
const pdf = Buffer.from("%PDF-1.4 prueba"); r = await call(FO, "POST", "/api/fotos", pdf, "application/pdf"); ok(r.s === 201 && r.j && r.j.key, "subida real de PDF (" + r.s + " " + JSON.stringify(r.j).slice(0, 100) + ")"); const key = r.j && r.j.key;
await call(ERP, "POST", "/api/erp/proveedor", { nombre: "Recambios Sur", plazoDias: 30 }); const prov = (await call(ERP, "GET", "/api/erp/compras")).j.proveedores[0];
r = await call(ERP, "POST", "/api/erp/factura", { proveedor: prov.id, num: "FR-100", fecha: hoy, base: 4500, igicPct: 7, concepto: "Pastillas delanteras 3 uds" }); ok(r.s === 201, "factura de proveedor creada"); const fac = r.j.factura;
r = await call(F, "POST", "/api/finanzas/gasto", { fecha: hoy, categoria: "recambios", area: "taller", proveedor: "Recambios Sur", factura: "FR-100", concepto: "Factura FR-100 · Pastillas delanteras 3 uds", base: (fac.base / 100).toFixed(2), impuestoPct: String(fac.igicPct), metodo: "transferencia", adjunto: key }); ok(r.s === 201 && r.j.gasto, "gasto real en Finanzas con mi formato (" + r.s + " " + JSON.stringify(r.j).slice(0, 160) + ")"); const g = r.j.gasto;
ok(g && g.total === fac.total, "el total del gasto de Finanzas (" + (g && g.total) + ") = el de mi factura (" + fac.total + ")");
r = await call(ERP, "POST", "/api/erp/factura-pagar/" + fac.id, { gastoId: g.id, metodo: "transferencia", fecha: hoy }); ok(r.s === 200, "mi factura-pagar acepta el id real del gasto «" + (g && g.id) + "» (" + r.s + " " + JSON.stringify(r.j).slice(0, 120) + ")");
// 4. resumen real de Finanzas: ¿están todos los campos que lee mi cuadro de mando, gestoría, banco, coches e incentivos?
r = await call(F, "GET", `/api/finanzas/resumen?desde=${hoy.slice(0, 8)}01&hasta=${hoy}`); ok(r.s === 200, "resumen real (" + r.s + ")"); const R = r.j || {};
const claves = ["kpis", "emitidas", "recibidas", "cobros", "serie", "resultadoTaller", "resTot", "hoy", "mes", "ajustes", "stock", "coches", "efectivo", "porCobrar"]; const falta = claves.filter((k) => !(k in R)); ok(!falta.length, "el resumen real trae todo lo que uso" + (falta.length ? " — FALTA: " + falta.join(", ") : ""));
const kp = ["facturadoBase", "resultado", "porCobrar", "cobrado", "pagado"].filter((k) => !(R.kpis && k in R.kpis)); ok(!kp.length, "kpis completos" + (kp.length ? " — FALTA: " + kp.join(", ") : ""));
const mes = ["fijosHasta", "fijosMes", "cubierto", "beneficio"].filter((k) => !(R.mes && k in R.mes)); ok(!mes.length, "mes{} completo" + (mes.length ? " — FALTA " + mes.join(", ") : ""));
const rg = (R.recibidas || [])[0]; ok(rg && ["id", "origen", "fecha", "proveedor", "factura", "base", "impuestoPct", "impuesto", "total", "metodo"].every((k) => k in rg), "una factura recibida real tiene los campos de mi libro: " + (rg ? Object.keys(rg).join(",") : "ninguna"));
ok(R.recibidas && R.recibidas.some((x: any) => x.id === g.id), "mi gasto aparece en «recibidas» del resumen real");
// 5. si pago un gasto repetido, Finanzas lo frena (no se duplica en pagos)
r = await call(F, "POST", "/api/finanzas/gasto", { fecha: hoy, categoria: "recambios", area: "taller", proveedor: "Recambios Sur", factura: "FR-100", concepto: "Factura FR-100 · Pastillas delanteras 3 uds", base: "45.00", impuestoPct: "7", metodo: "transferencia", adjunto: key }); ok(r.s === 409, "Finanzas real frena el gasto repetido (" + r.s + ")");
// 6. órdenes y clientes reales: creo una recepción real y miro la forma de /api/ordenes que leen Clientes 360 y el Cuadro
const TA = (await import("./netlify/functions/taller.mts")).default;
r = await call(TA, "POST", "/api/taller/recepcion", { cliente: { nombre: "Juan Pérez", telefono: "643566098" }, vehiculo: { matricula: "1234ABC", marcaModelo: "Seat Ibiza", km: "90000", itv: "2026-11-01" }, tipoEntrada: "mantenimiento" }); ok(r.s === 200 || r.s === 201, "recepción real (" + r.s + " " + JSON.stringify(r.j).slice(0, 140) + ")");
r = await call(OR, "GET", "/api/ordenes"); ok(r.s === 200 && Array.isArray(r.j) && r.j.length === 1, "/api/ordenes devuelve una lista (" + r.s + ")"); const o = (r.j || [])[0] || {};
ok(o.cliente && o.cliente.nombre === "Juan Pérez" && o.cliente.telefono && o.vehiculo && o.vehiculo.matricula && o.vehiculo.coche && o.token && o.creado && "estado" in o, "la orden real tiene cliente/vehiculo/token/creado/estado como los usa Clientes 360: " + Object.keys(o).join(","));
r = await call(ERP, "GET", "/api/erp/consentimientos"); ok(r.s === 200 && r.j && r.j.porMatricula && r.j.bajas, "consentimientos con el almacén «taller» REAL (" + r.s + ")");
const SO = (await import("./netlify/functions/solicitudes.mts")).default; r = await call(SO, "GET", "/api/solicitudes"); ok(r.s === 200 && Array.isArray(r.j), "/api/solicitudes devuelve lista (" + r.s + ")");
// 7. permisos y contabilidad con el acceso REAL (permiso/jornada) y el plan de cuentas real
r = await call(ERP, "GET", "/api/erp/mis-permisos"); ok(r.s === 200 && r.j.admin === true && r.j.modulos.includes("conta"), "mis-permisos del gerente con la sesión real");
r = await call(ERP, "GET", "/api/erp/permisos"); ok(r.s === 200 && r.j.roles && r.j.roles.cli.includes("recepcion"), "permisos por defecto: Clientes 360 abierto a Recepción");
r = await call(ERP, "POST", "/api/erp/permisos", { roles: { compras: ["recepcion"], cli: [], mcar: [] }, pedidoMax: 10000 }); ok(r.s === 200 && r.j.pedidoMax === 10000, "el gerente guarda permisos");
r = await call(ERP, "POST", "/api/erp/conta-asiento", { fecha: hoy, concepto: "Asiento de apertura de prueba", tipo: "apertura", lineas: [{ cuenta: "572", debe: 100000 }, { cuenta: "100", haber: 100000 }] }); ok(r.s === 201 && /^M-\d{4}-0001$/.test(r.j.asiento.num), "asiento manual real (" + r.s + " " + JSON.stringify(r.j).slice(0, 100) + ")");
r = await call(ERP, "POST", "/api/erp/conta-asiento", { fecha: hoy, concepto: "Asiento descuadrado", lineas: [{ cuenta: "572", debe: 100 }, { cuenta: "100", haber: 99 }] }); ok(r.s === 400, "un asiento descuadrado se rechaza");
r = await call(ERP, "GET", "/api/erp/conta-asientos"); ok(r.s === 200 && r.j.asientos.length === 1, "lista de asientos manuales");
// la contabilidad automática sale del resumen real de Finanzas y cuadra
const E = (() => { const m: any = { exports: {} }; new Function("module", "exports", readFileSync(new URL("./public-erp-logic.js", import.meta.url), "utf8")).call(m.exports, m, m.exports); return m.exports; })();
const R2 = (await call(F, "GET", `/api/finanzas/resumen?desde=2015-01-01&hasta=${hoy}`)).j, M2 = (await call(ERP, "GET", "/api/erp/conta-asientos")).j.asientos;
const L = E.libroDiario(E.asientosAuto({ emitidas: R2.emitidas, cobros: R2.cobros, recibidas: R2.recibidas, pendProv: [], coches: R2.coches, hasta: hoy }), M2);
ok(L.length >= 2 && E.sumasSaldos(L).cuadra && E.balance(L).descuadre === 0, "la contabilidad hecha con datos reales de Finanzas cuadra (" + L.length + " asientos)");
ok(E.pyg(L).resultado === E.pyg(L).ingresos - E.pyg(L).gastos, "PyG con datos reales coherente");
console.log(process.exitCode ? "HAY FALLOS" : "OK contra código real: " + n + " comprobaciones"); process.exit(process.exitCode || 0);
