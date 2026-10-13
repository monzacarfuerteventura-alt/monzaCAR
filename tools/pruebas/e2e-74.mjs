// =====================================================================
// PRUEBA ACTUALIZACIÓN 74: desglose de ganancia, pago dividido, correcciones del gerente y «empezar de cero»
// Ejecuta las funciones reales de netlify/functions con un almacén en memoria y recorre el panel con
// cada puesto: Gerente (contraseña), Lestter (puesto Gerente con PIN), Calidad, Recepción y Mecánico.
// Uso (en el ordenador del desarrollador, con bun):  bun tools/pruebas/e2e-resultado-taller.mjs
// Necesita un @netlify/blobs de pruebas en node_modules (ver tools/pruebas/LEEME.md).
// =====================================================================
import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENV = { ADMIN_PASSWORD: "clave-de-pruebas-larga-2026", SESSION_SECRET: "secreto-de-pruebas" };
globalThis.Netlify = { env: { get: (k) => ENV[k] || "" }, context: { deploy: { context: "production" } } };
const ORIGEN = "https://volcanocars.com";

// ---------- enrutador: lee config.path de cada función ----------
const rutas = [];
for (const f of readdirSync(join(RAIZ, "netlify/functions")).filter((x) => x.endsWith(".mts"))) {
  const m = await import(join(RAIZ, "netlify/functions", f));
  const paths = m.config?.path ? [].concat(m.config.path) : [];
  for (const p of paths) {
    const re = new RegExp("^" + p.replace(/\*/g, ".*").replace(/:[a-zA-Z]+/g, "[^/]+") + "$");
    rutas.push({ re, fn: m.default, f, n: p.split("/").length });
  }
}
rutas.sort((a, b) => b.n - a.n);
async function llamar(method, path, token, body) {
  const url = new URL(path, ORIGEN);
  const r = rutas.find((x) => x.re.test(url.pathname));
  if (!r) throw new Error("Sin función para " + path);
  const headers = { "content-type": "application/json", origin: ORIGEN, "user-agent": "prueba-e2e" };
  if (token) headers.authorization = "Bearer " + token;
  const req = new Request(url, { method, headers, body: body === undefined || method === "GET" ? undefined : JSON.stringify(body) });
  const res = await r.fn(req, { ip: "10.0.0." + (1 + Math.floor(Math.random() * 200)), geo: { country: { code: "ES" } }, params: {} });
  let data = null; try { data = await res.clone().json(); } catch { data = await res.text().catch(() => ""); }
  return { status: res.status, data };
}

// ---------- resultado ----------
let ok = 0, mal = 0; const fallos = [];
function esperar(nombre, cond, detalle = "") { if (cond) { ok++; console.log("  ✔ " + nombre); } else { mal++; fallos.push(nombre + " " + detalle); console.log("  ✘ " + nombre + " " + detalle); } }
const est = (r) => `(HTTP ${r.status}${r.data && r.data.error ? ": " + r.data.error : ""})`;

// Sin verificación en dos pasos del equipo para la prueba
const { store } = await import(join(RAIZ, "netlify/lib/shared.mts"));
await store("seguridad").set("config/2fa-equipo", "0");


const { tstore, calculo, leerConfig } = await import(join(RAIZ, "netlify/lib/taller.mts"));
console.log("\n1) Gerente y equipo");
const G = (await llamar("POST", "/api/login", "", { clave: ENV.ADMIN_PASSWORD })).data.token;
esperar("el gerente entra", !!G);
const personas = [{ nombre: "Recepción Prueba", usuario: "recep1", pin: "112233", rol: "recepcion" }, { nombre: "Pedro", usuario: "pedro", pin: "445566", rol: "mecanico" }];
for (const p of personas) await llamar("POST", "/api/taller/equipo", G, p);
const tk = {};
for (const p of personas) { const l = await llamar("POST", "/api/login", "", { usuario: p.usuario, pin: p.pin }); tk[p.rol] = l.data.token; await llamar("POST", "/api/jornada/fichar", l.data.token, { accion: "entrada" }); }
const [R, M] = [tk.recepcion, tk.mecanico];
const eq = (await llamar("GET", "/api/taller/equipo", G)).data; const pedro = (eq.equipo || eq).find((x) => x.usuario === "pedro");
esperar("Pedro está en el equipo", !!pedro?.id);
const FIN = async () => (await llamar("GET", "/api/finanzas/resumen?desde=2020-01-01&hasta=2099-12-31", G)).data;
const e2 = (c) => (c / 100).toFixed(2);
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Atlantic/Canary", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const laborable = [1, 2, 3, 4, 5].includes(new Date(hoy + "T12:00:00Z").getUTCDay());

console.log("\n2) Un coche de cliente: pieza del inventario + horas de dos personas + presupuesto + cobro");
let r = await llamar("POST", "/api/caja/abrir", G, { desglose: { 10000: 5 } }); esperar("se abre la caja con 500,00 €", r.status === 200, est(r));
r = await llamar("POST", "/api/almacen/pieza", G, { nombre: "Pastillas delanteras", categoria: "Frenos", unidad: "ud", minimo: "1", coste: "45", pvp: "80", stock: "0" }); const p1 = r.data.pieza?.id;
r = await llamar("POST", "/api/almacen/pieza", G, { nombre: "Aceite 5W30", categoria: "Lubricantes", unidad: "ud", minimo: "1", coste: "6,25", pvp: "12", stock: "0" }); const p2 = r.data.pieza?.id;
r = await llamar("POST", "/api/almacen/entrada", G, { albaran: "A-1", proveedor: "Recambios", lineas: [{ pieza: p1, cantidad: "5", coste: "45" }, { pieza: p2, cantidad: "10", coste: "6,25" }] }); esperar("entran piezas al inventario", r.status === 200, est(r));
r = await llamar("POST", "/api/taller/recepcion", R, { cliente: { nombre: "Cliente Uno", telefono: "600111222" }, vehiculo: { matricula: "1234ABC", marcaModelo: "Renault Clio" }, tipoEntrada: "reparacion", recibidoPor: "Recepción" });
esperar("recepción crea la orden", r.status === 201, est(r)); const T1 = r.data.orden.token;
r = await llamar("POST", "/api/almacen/imputar", M, { orden: T1, pieza: p1, cantidad: "1" }); esperar("mecánico carga las pastillas (45,00 €)", r.status === 200, est(r));
r = await llamar("POST", "/api/almacen/imputar", M, { orden: T1, pieza: p2, cantidad: "2" }); esperar("mecánico carga 2 aceites (6,25 € cada uno)", r.status === 200, est(r)); const movAceite = r.data.movimiento.id;
r = await llamar("POST", "/api/almacen/devolver-pieza/" + movAceite, G, { cantidad: "1", motivo: "Sobró una lata" }); esperar("se devuelve 1 aceite al estante", r.status === 200, est(r));
// Horas: Pedro 120 min y el gerente 30 min, a 40 €/h  →  2,5 h = 100,00 €  (Pedro 80,00 · Gerente 20,00)
const fi = await tstore().get("f/" + T1, { type: "json" }); const t0 = Date.now() - 4 * 3600e3, mm = (n) => new Date(t0 + n * 60e3).toISOString();
fi.f3 = { mecanico: pedro.id, tarifa: 40, estMin: 0, tipo: "reparacion", hoja: "1 de 1", justificacion: null, vistoBueno: null, retrabajos: [],
  eventos: [{ tipo: "inicio", t: mm(0), por: pedro.id, motivo: "", nota: "" }, { tipo: "pausa", t: mm(120), por: pedro.id, motivo: "Otro", nota: "" }, { tipo: "reanudar", t: mm(150), por: "gerente", motivo: "", nota: "" }, { tipo: "fin", t: mm(180), por: "gerente", motivo: "", nota: "" }] };
await tstore().setJSON("f/" + T1, fi);
r = await llamar("PATCH", "/api/ordenes/" + T1, G, { presupuesto: { lineas: [{ c: "Pastillas delanteras", n: 1, p: 120 }, { c: "Mano de obra", n: 3, p: 50 }], igic: 7, enviar: true } }); esperar("presupuesto: 120 + 150 = 270,00 sin IGIC", r.status === 200 && r.data.totales.base === 270 && r.data.totales.total === 288.9, est(r));
r = await llamar("POST", "/api/seguimiento/" + T1 + "/respuesta", "", { accion: "aceptar", nombre: "Cliente Uno", acepta: true }); esperar("el cliente acepta (288,90 € con IGIC)", r.status === 200, est(r));
r = await llamar("PATCH", "/api/ordenes/" + T1, G, { estado: "entregado" }); esperar("el cliente se va: orden entregada", r.status === 200, est(r));
r = await llamar("POST", "/api/finanzas/cobro/taller/" + T1, G, { importe: "288,90", metodo: "efectivo" }); esperar("cobro en efectivo de 288,90 €", r.status === 200, est(r));
// ---------- Act. 74 ----------
console.log("\n3) Desglose de ganancia por coche de taller (piezas cobradas vs compradas, mano de obra)");
const fi5 = await tstore().get("f/" + T1, { type: "json" });
fi5.f5 = { fechaOperacion: hoy, cliente: { nombre: "Cliente Uno", doc: "", direccion: "", cp: "", telefono: "", email: "" }, vehiculo: { matricula: "1234ABC", vin: "", marcaModelo: "Renault Clio", kmEntrada: "", kmSalida: "" },
  lineas: [{ tipo: "REC", ref: "", desc: "Pastillas delanteras", cant: 1, precio: 120, dto: 0 }, { tipo: "MO", ref: "", desc: "Mano de obra", cant: 3, precio: 50, dto: 0 }], descuentoGlobal: 0, igicTipo: "7", igicOtro: 0, observaciones: "", cerrada: false, rect: 0, emision: null };
await tstore().setJSON("f/" + T1, fi5);
let F = await FIN(); let x = F.resultadoTaller.find((z) => z.token === T1);
esperar("piezas cobradas = 120,00", x?.ventaPiezas === 12000, String(x?.ventaPiezas));
esperar("mano de obra cobrada = 150,00", x?.ventaManoObra === 15000, String(x?.ventaManoObra));
esperar("piezas compradas (coste) = 51,25", x?.piezas === 5125);
esperar("ganancia en piezas = 120,00 − 51,25 = 68,75", x?.gananciaPiezas === 6875, String(x?.gananciaPiezas));
esperar("ganancia sobre lo comprado = 134,1 %", x?.margenPiezasPct === 134.1, String(x?.margenPiezasPct));
esperar("ganancia en mano de obra = 150,00 − 100,00 = 50,00", x?.gananciaManoObra === 5000, String(x?.gananciaManoObra));
esperar("piezas + mano de obra + otros = base", x.ventaPiezas + x.ventaManoObra + x.ventaOtros === x.base);
esperar("beneficio = ganancia piezas + ganancia mano de obra = 118,75", x?.beneficio === 11875 && x.gananciaPiezas + x.gananciaManoObra === x.beneficio);
esperar("líneas de piezas cobradas con su precio", x?.lineasPiezas?.[0]?.precio === 12000 && x.lineasPiezas[0].importe === 12000);
esperar("totales del periodo con ganancia de piezas", F.resTot.gananciaPiezas === 6875 && F.resTot.ventaPiezas === 12000);

console.log("\n4) Venta de coche: desglose del coste");
r = await llamar("POST", "/api/coches", G, { marca: "Seat", modelo: "Ibiza", version: "1.0", anio: 2015, km: 90000, combustible: "Gasolina", cambio: "Manual", precio: 5000, estado: "disponible" });
const cocheId = r.data?.id || r.data?.coche?.id; esperar("se crea un coche", !!cocheId, est(r));
r = await llamar("POST", "/api/finanzas/venta/" + cocheId, G, { importe: "5000", costeCompra: "3000", fecha: hoy, igicPct: "7", comprador: "Comprador Uno", factura: "" }); esperar("se registra la venta", r.status === 200 || r.status === 201, est(r));
r = await llamar("POST", "/api/finanzas/gasto", G, { categoria: "recambios", fecha: hoy, proveedor: "Recambios SL", concepto: "Pastillas del Ibiza", base: "100", impuestoPct: "7", metodo: "transferencia", adjunto: "x.jpg", coche: cocheId });
// el adjunto es obligatorio: se sube una foto mínima
const fot = await store("monzacar-fotos").set("tk-prueba.jpg", new Uint8Array([255, 216, 255, 217]));
r = await llamar("POST", "/api/finanzas/gasto", G, { categoria: "recambios", fecha: hoy, proveedor: "Recambios SL", concepto: "Pastillas del Ibiza", base: "100", impuestoPct: "7", metodo: "transferencia", adjunto: "tk-prueba.jpg", coche: cocheId }); esperar("gasto del coche", r.status === 201, est(r)); const gId = r.data?.gasto?.id;
F = await FIN(); const v = F.coches.find((c) => c.coche === cocheId);
esperar("el coche vendido trae el desglose", !!v && v.reacGastos === 10000 && v.compra === 300000 && v.comprador === "Comprador Uno", JSON.stringify(v || {}).slice(0, 200));
esperar("gastos del coche detallados", v?.gastosDet?.length === 1 && v.gastosDet[0].base === 10000);
esperar("suma de costes = reacondicionamiento", (v.reacGastos + v.reacPiezas + v.reacHoras + v.reacOtros) === v.reacondicionamiento);

console.log("\n5) Pago dividido: parte en efectivo y parte por transferencia");
r = await llamar("POST", "/api/finanzas/cobro/taller/" + T1, G, { importe: "0.01", metodo: "transferencia" });
r = await llamar("POST", "/api/taller/recepcion", R, { cliente: { nombre: "Cliente Dos", telefono: "600333444" }, vehiculo: { matricula: "9999ZZZ", marcaModelo: "Ford Fiesta" }, tipoEntrada: "reparacion", recibidoPor: "Recepción" }); const T2 = r.data.orden.token;
await llamar("PATCH", "/api/ordenes/" + T2, G, { presupuesto: { lineas: [{ c: "Revisión", n: 1, p: 200 }], igic: 7, enviar: true } });
await llamar("POST", "/api/seguimiento/" + T2 + "/respuesta", "", { accion: "aceptar", nombre: "Cliente Dos", acepta: true });
const antes = (await FIN()).porCanal;
r = await llamar("POST", "/api/finanzas/cobro/taller/" + T2, G, { importe: "100,00", metodo: "efectivo" }); esperar("100,00 en efectivo", r.status === 200, est(r));
r = await llamar("POST", "/api/finanzas/cobro/taller/" + T2, G, { importe: "114,00", metodo: "transferencia" }); esperar("114,00 por transferencia (resto de 214,00)", r.status === 200, est(r));
F = await FIN(); const d2 = F.emitidas.find((z) => z.ref === T2);
esperar("la factura queda cobrada entera con dos cobros", d2?.cobrado === 21400 && d2.cobros.length === 2, JSON.stringify(d2?.cobros?.map((c) => [c.metodo, c.importe])));
esperar("canal efectivo +100,00 y transferencia +114,00", F.porCanal.efectivo - antes.efectivo === 10000 && F.porCanal.transferencia - antes.transferencia === 11400);

console.log("\n6) El gerente corrige números (queda en el libro)");
r = await llamar("POST", "/api/finanzas/gasto-editar/" + gId, G, { base: "120", impuestoPct: "7", concepto: "Pastillas y discos del Ibiza", metodo: "transferencia", fecha: hoy, proveedor: "Recambios SL" }); esperar("corrige el gasto a 120,00 + 7 %", r.status === 200, est(r));
F = await FIN(); const g2 = F.recibidas.find((z) => z.id === gId);
esperar("el gasto ahora es 120,00 base y 128,40 total", g2?.base === 12000 && g2.total === 12840, JSON.stringify([g2?.base, g2?.total]));
esperar("el coche vendido recalcula su coste (120,00)", F.coches.find((c) => c.coche === cocheId).reacGastos === 12000);
r = await llamar("POST", "/api/finanzas/gasto-editar/" + gId, M, { base: "1" }); esperar("el mecánico NO puede corregir", r.status === 403, est(r));
const cobroId = d2.cobros.find((c) => c.metodo === "efectivo").id;
r = await llamar("POST", `/api/finanzas/cobro-editar/taller/${T2}`, G, { cobro: cobroId, importe: "80,00", metodo: "efectivo", fecha: hoy }); esperar("corrige el cobro en efectivo a 80,00", r.status === 200, est(r));
F = await FIN(); esperar("el cobro quedó en 80,00", F.emitidas.find((z) => z.ref === T2).cobrado === 19400);
let caja = (await llamar("GET", "/api/caja/estado", G)).data; const movC = caja.movimientos.find((m) => m.importe === 8000);
esperar("el movimiento de la caja se corrigió a la vez (80,00)", !!movC, JSON.stringify(caja.movimientos.map((m) => m.importe)));
const t0c = caja.calculo.teorico;
r = await llamar("POST", "/api/caja/movimiento-editar/" + movC.id, G, { importe: "90,00", concepto: "Cobro corregido" }); esperar("corrige el movimiento de caja a 90,00", r.status === 200, est(r));
caja = (await llamar("GET", "/api/caja/estado", G)).data; esperar("la caja recalcula lo que debería haber (+10,00)", caja.calculo.teorico === t0c + 1000, `${caja.calculo.teorico} vs ${t0c}`);
const turnoId = caja.turno.id;
r = await llamar("POST", "/api/caja/turno-editar/" + turnoId, G, { donde: "apertura", contado: "400,00" }); esperar("corrige lo contado en la apertura", r.status === 200, est(r));
r = await llamar("POST", "/api/caja/movimiento-editar/" + movC.id, M, { importe: "1" }); esperar("el mecánico NO puede corregir la caja", r.status === 403, est(r));
const lib = (await llamar("GET", "/api/finanzas/libro", G)).data; esperar("el libro guarda las correcciones y sigue íntegro", lib.integro && lib.entradas.some((e) => e.accion === "gasto-editar") && lib.entradas.some((e) => e.accion === "cobro-editar"));

console.log("\n7) Empezar de cero");
r = await llamar("POST", "/api/finanzas/reiniciar", G, { confirmar: "hola" }); esperar("sin la frase exacta no borra nada", r.status === 400, est(r));
r = await llamar("POST", "/api/finanzas/reiniciar", M, { confirmar: "EMPEZAR DE CERO" }); esperar("el mecánico NO puede", r.status === 403, est(r));
await store("facturas").setJSON("reg/000000001", { seq: 1, numero: "F-2026-0001", serie: "F", orden: T1, base: 270, total: 288.9 });
r = await llamar("POST", "/api/finanzas/reiniciar", G, { confirmar: "EMPEZAR DE CERO" }); esperar("el gerente empieza de cero", r.status === 200 && r.data.ok, est(r));
esperar("hay copia de seguridad", !!r.data.copia && !!(await store("copias").get(r.data.copia + "/finanzas.json")) && !!(await store("copias").get(r.data.copia + "/caja.json")) && !!(await store("copias").get(r.data.copia + "/facturas.json")));
F = await FIN();
esperar("Finanzas a cero: nada emitido, cobrado ni pagado", F.emitidas.length === 0 && F.recibidas.length === 0 && F.cobros.length === 0 && F.kpis.cobrado === 0 && F.kpis.pagado === 0 && F.kpis.facturado === 0, JSON.stringify(F.kpis).slice(0, 200));
esperar("sin coches de taller de prueba ni pérdidas heredadas", F.resultadoTaller.length === 0 && F.hoy.coches === 0);
esperar("el coche vendido de prueba ya no tiene venta ni gastos", !F.coches.find((c) => c.coche === cocheId) || F.coches.find((c) => c.coche === cocheId).reacGastos === 0);
caja = (await llamar("GET", "/api/caja/estado", G)).data; esperar("Caja a cero: cerrada y sin último cierre", caja.abierta === false && !caja.ultimoCierre);
esperar("registro de facturas vacío (la primera real será la 0001)", (await store("facturas").list({ prefix: "" })).blobs.length === 0);
esperar("coches y órdenes del taller siguen ahí", (await llamar("GET", "/api/ordenes", G)).data.length >= 2 || (await llamar("GET", "/api/ordenes", G)).data.ordenes?.length >= 2);
const lib2 = (await llamar("GET", "/api/finanzas/libro", G)).data; esperar("el libro sigue íntegro y anota el reinicio", lib2.integro && lib2.entradas.some((e) => e.accion === "reinicio"));
console.log("   … y ahora, datos REALES a partir de hoy");
r = await llamar("POST", "/api/caja/abrir", G, { desglose: { 5000: 2 } }); esperar("abre la caja con 100,00 sin pedir explicaciones", r.status === 200, est(r));
r = await llamar("POST", "/api/taller/recepcion", R, { cliente: { nombre: "Real Uno", telefono: "611000111" }, vehiculo: { matricula: "5555RRR", marcaModelo: "Seat Leon" }, tipoEntrada: "reparacion", recibidoPor: "Recepción" }); const T3 = r.data.orden.token;
await llamar("PATCH", "/api/ordenes/" + T3, G, { presupuesto: { lineas: [{ c: "Cambio de aceite", n: 1, p: 50 }], igic: 7, enviar: true } });
await llamar("POST", "/api/seguimiento/" + T3 + "/respuesta", "", { accion: "aceptar", nombre: "Real Uno", acepta: true });
r = await llamar("POST", "/api/finanzas/cobro/taller/" + T3, G, { importe: "53,50", metodo: "efectivo" });
F = await FIN(); esperar("lo nuevo SÍ cuenta: 53,50 facturado y cobrado, solo eso", F.kpis.facturado === 5350 && F.kpis.cobrado === 5350 && F.emitidas.length === 1, JSON.stringify(F.kpis).slice(0, 160));

console.log(`\nRESULTADO: ${ok} correctas · ${mal} fallidas`);
if (mal) { console.log(fallos.join("\n")); process.exit(1); }
