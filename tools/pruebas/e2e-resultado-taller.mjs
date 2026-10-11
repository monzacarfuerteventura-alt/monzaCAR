// =====================================================================
// PRUEBA «RESULTADO DE CADA COCHE DE TALLER ENTREGADO + FIJOS + ¿HOY HUBO PÉRDIDAS?» (actualización 62)
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

console.log("\n3) Lo que ve el gerente cuando se va el cliente");
let F = await FIN(); let x = F.resultadoTaller.find((z) => z.token === T1);
esperar("sale el coche en «resultadoTaller»", !!x);
esperar("precio final con IGIC = 288,90", x?.total === 28890, String(x?.total));
esperar("precio sin IGIC = 270,00", x?.base === 27000, String(x?.base));
esperar("IGIC aparte = 18,90 (no es tuyo)", x?.igic === 1890, String(x?.igic));
esperar("piezas del inventario = 51,25 (45,00 + 1 aceite 6,25; el devuelto no cuenta)", x?.piezas === 5125, String(x?.piezas));
esperar("mano de obra = 100,00 (2,5 h × 40 €/h)", x?.manoObra === 10000 && x?.minutos === 150, `${x?.manoObra} ${x?.minutos}`);
const trab = x?.trabajadores || [];
esperar("por trabajador: Pedro 120 min = 80,00 y Gerente 30 min = 20,00", trab.length === 2 && trab.find((t) => t.nombre === "Pedro")?.coste === 8000 && trab.find((t) => t.nombre === "Pedro")?.minutos === 120 && trab.find((t) => t.nombre === "Gerente")?.coste === 2000, JSON.stringify(trab));
esperar("lo repartido suma justo la mano de obra", trab.reduce((a, t) => a + t.coste, 0) === x?.manoObra);
const cfg = await leerConfig(); const fi2 = await tstore().get("f/" + T1, { type: "json" });
esperar("la mano de obra es la misma que enseña FORM-04", Math.round(calculo(fi2.f3, cfg).manoObra * 100) === x?.manoObra);
esperar("beneficio = 270,00 − 51,25 − 100,00 = 118,75", x?.beneficio === 11875, String(x?.beneficio));
esperar("cobrado 288,90 y nada pendiente", x?.cobrado === 28890 && x?.pendiente === 0);
esperar("coherente: base + IGIC = precio final", x.base + x.igic === x.total);
esperar("Finanzas: lo cobrado en efectivo coincide con el coche", F.porCanal.efectivo === 28890, String(F.porCanal.efectivo));
r = await llamar("GET", "/api/caja/estado", G); esperar("Caja: teórico 500,00 + 288,90 = 788,90", r.data.calculo?.teorico === 78890 || r.data.calculo?.esperado === 78890, JSON.stringify(r.data.calculo || {}).slice(0, 120));
esperar("Finanzas: efectivo en cajón = 788,90", F.efectivo.teorico === 78890, String(F.efectivo.teorico));

console.log("\n4) ¿Hoy hubo pérdidas? Fijos 9.000 € / 20 días laborables = 450 €/día");
esperar("ajustes por defecto: mano de obra ON, 9.000,00 € y 20 días", F.ajustes.descontarMO === true && F.ajustes.fijosMes === 900000 && F.ajustes.diasLab === 20, JSON.stringify(F.ajustes));
const fd = laborable ? 45000 : 0;
esperar(`hoy ${laborable ? "es laborable: fijos del día 450,00" : "NO es laborable: fijos del día 0,00"}`, F.hoy.fijosDia === fd, String(F.hoy.fijosDia));
esperar("beneficio de hoy = 118,75", F.hoy.beneficio === 11875 && F.hoy.coches === 1, JSON.stringify(F.hoy));
esperar(`resultado de hoy = ${e2(11875 - fd)}`, F.hoy.resultado === 11875 - fd, String(F.hoy.resultado));
esperar(`«pérdida hoy» = ${laborable ? "SÍ (118,75 < 450)" : "NO"}`, F.hoy.perdida === laborable);
esperar("mes: fijos hasta hoy = 450 × días laborables transcurridos", F.mes.fijosHasta === 45000 * F.mes.diasLaborables, JSON.stringify(F.mes));

console.log("\n5) Botón activar / desactivar el descuento de los trabajadores (solo gerente)");
r = await llamar("POST", "/api/finanzas/ajustes", G, { descontarMO: false }); esperar("el gerente lo desactiva", r.status === 200 && r.data.ajustes.descontarMO === false, est(r));
F = await FIN(); x = F.resultadoTaller.find((z) => z.token === T1);
esperar("con el botón OFF el beneficio es 270,00 − 51,25 = 218,75", x?.beneficio === 21875, String(x?.beneficio));
esperar("con OFF la mano de obra se sigue mostrando (100,00) pero no se resta", x?.manoObra === 10000 && x?.descontadaMO === false);
esperar(`hoy con OFF = ${e2(21875 - fd)}`, F.hoy.resultado === 21875 - fd);
r = await llamar("POST", "/api/finanzas/ajustes", G, { descontarMO: true, fijosMes: "9.000,00", diasLab: 20 }); esperar("se vuelve a activar", r.status === 200 && r.data.ajustes.descontarMO === true && r.data.ajustes.fijosMes === 900000, est(r));
r = await llamar("POST", "/api/finanzas/ajustes", G, { fijosMes: "-5" }); esperar("fijos negativos: rechazado", r.status === 400, est(r));
r = await llamar("POST", "/api/finanzas/ajustes", G, { diasLab: 0 }); esperar("0 días laborables: rechazado", r.status === 400, est(r));
r = await llamar("POST", "/api/finanzas/ajustes", M, { descontarMO: false }); esperar("el mecánico NO puede cambiarlo", r.status === 403, est(r));
r = await llamar("POST", "/api/finanzas/ajustes", R, { descontarMO: false }); esperar("recepción NO puede cambiarlo", r.status === 403, est(r));
r = await llamar("GET", "/api/finanzas/resumen", M); esperar("el mecánico NO ve el resultado (Finanzas)", r.status === 403, est(r));
r = await llamar("GET", "/api/finanzas/resumen", R); esperar("recepción NO ve el resultado (Finanzas)", r.status === 403, est(r));
r = await llamar("GET", "/api/ordenes", M); esperar("la lista de órdenes del equipo no trae beneficio", !JSON.stringify(r.data).includes("beneficio"));

console.log("\n6) Un segundo coche sin horas fichadas y con una pieza sin precio de coste: avisa");
r = await llamar("POST", "/api/almacen/pieza", G, { nombre: "Tornillería", categoria: "Otros", unidad: "ud", minimo: "1", stock: "0" }); const p3 = r.data.pieza?.id;
r = await llamar("POST", "/api/almacen/entrada", G, { albaran: "A-2", proveedor: "X", lineas: [{ pieza: p3, cantidad: "10", coste: "0" }] });
r = await llamar("POST", "/api/taller/recepcion", R, { cliente: { nombre: "Cliente Dos", telefono: "600333444" }, vehiculo: { matricula: "9999ZZZ", marcaModelo: "Seat Ibiza" }, tipoEntrada: "reparacion", recibidoPor: "Recepción" }); const T2 = r.data.orden.token;
await llamar("POST", "/api/almacen/imputar", M, { orden: T2, pieza: p3, cantidad: "3" });
await llamar("PATCH", "/api/ordenes/" + T2, G, { presupuesto: { lineas: [{ c: "Arreglo", n: 1, p: 100 }], igic: 7, enviar: true } });
await llamar("POST", "/api/seguimiento/" + T2 + "/respuesta", "", { accion: "aceptar", nombre: "Cliente Dos", acepta: true });
await llamar("PATCH", "/api/ordenes/" + T2, G, { estado: "entregado" });
F = await FIN(); const y = F.resultadoTaller.find((z) => z.token === T2);
esperar("sale el segundo coche: 100,00 sin IGIC", y?.base === 10000 && y?.total === 10700, JSON.stringify([y?.base, y?.total]));
esperar("avisa de que no se fichó ningún tiempo", (y?.avisos || []).some((a) => /No se fichó/.test(a)));
esperar("avisa de que falta cobrar 107,00", (y?.avisos || []).some((a) => /Falta cobrar 107,00/.test(a)) && y?.pendiente === 10700);
esperar("avisa de la pieza sin precio de coste", (y?.avisos || []).some((a) => /sin precio de coste|no tiene precio de coste/.test(a)));
esperar("hoy suma los dos coches: 118,75 + 100,00 = 218,75", F.hoy.beneficio === 21875 && F.hoy.coches === 2, JSON.stringify(F.hoy));
esperar("el total del periodo cuadra con la suma de las filas", F.resTot.beneficio === F.resultadoTaller.reduce((a, z) => a + z.beneficio, 0) && F.resTot.igic === F.resultadoTaller.reduce((a, z) => a + z.igic, 0));
esperar("IGIC total apartado = 18,90 + 7,00 = 25,90", F.resTot.igic === 2590, String(F.resTot.igic));

console.log(`\nRESULTADO: ${ok} correctas · ${mal} fallidas`);
if (mal) { console.log("Fallos:"); for (const x of fallos) console.log(" - " + x); process.exit(1); }
