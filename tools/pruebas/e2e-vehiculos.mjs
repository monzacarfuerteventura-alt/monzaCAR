// =====================================================================
// PRUEBA DE «COCHES PROPIOS» DE PRINCIPIO A FIN (30-09-2026)
// Ejecuta las funciones reales de netlify/functions con un almacén en memoria y recorre el panel con
// cada puesto: Gerente (contraseña), Lestter (puesto Gerente con PIN), Calidad, Recepción y Mecánico.
// Uso (en el ordenador del desarrollador, con bun):  bun tools/pruebas/e2e-vehiculos.mjs
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

console.log("\n1) Gerente con contraseña");
const lg = await llamar("POST", "/api/login", "", { clave: ENV.ADMIN_PASSWORD });
esperar("entra al panel", lg.status === 200 && lg.data.token, est(lg));
const G = lg.data.token;
const personas = [
  { nombre: "Lestter", usuario: "lestter", pin: "246810", rol: "gerente" },
  { nombre: "Calidad Prueba", usuario: "calidad1", pin: "135791", rol: "calidad" },
  { nombre: "Recepción Prueba", usuario: "recep1", pin: "112233", rol: "recepcion" },
  { nombre: "Pedro", usuario: "pedro", pin: "445566", rol: "mecanico" },
];

for (const p of personas) { const r = await llamar("POST", "/api/taller/equipo", G, p); esperar("alta de " + p.nombre + " (" + p.rol + ")", r.status === 201, est(r)); }
const tk = {};
for (const p of personas) { const l = await llamar("POST", "/api/login", "", { usuario: p.usuario, pin: p.pin }); tk[p.rol] = l.data.token; const f = await llamar("POST", "/api/jornada/fichar", l.data.token, { accion: "entrada" }); esperar("ficha " + p.rol, f.status === 200, est(f)); }
const [L, C, R, M] = [tk.gerente, tk.calidad, tk.recepcion, tk.mecanico];

console.log("\nA) Alta y permisos");
const nuevo = { marca: "Seat", modelo: "Ibiza", anio: 2015, km: 142000, matricula: "9999xyz", danos: "Golpe trasero", compra: "3.000,00" };
let r = await llamar("POST", "/api/vehiculos/crear", M, nuevo); esperar("mecánico NO da de alta", r.status === 403, est(r));
r = await llamar("POST", "/api/vehiculos/crear", R, nuevo); esperar("recepción da de alta", r.status === 201, est(r));
const id = r.data.ficha.id;
esperar("recepción no ve ni puede fijar la compra", r.data.ficha.compra === undefined && r.data.ficha.eco === undefined);
r = await llamar("POST", "/api/vehiculos/crear", R, nuevo); esperar("matrícula duplicada activa rechazada", r.status === 409, est(r));
r = await llamar("POST", "/api/vehiculos/editar/" + id, L, { compra: "3.000,00", precioPrevisto: "6.000" }); esperar("gerente fija compra y precio previsto", r.status === 200 && r.data.ficha.compra === 300000 && r.data.ficha.precioPrevisto === 600000, est(r));
r = await llamar("POST", "/api/vehiculos/editar/" + id, M, { compra: "1" }); esperar("mecánico no edita datos", r.status === 403, est(r));
r = await llamar("GET", "/api/vehiculos/estado", M); esperar("mecánico ve la lista", r.status === 200 && r.data.fichas.length === 1, est(r));
esperar("mecánico NO ve importes", r.data.fichas[0].compra === undefined && r.data.fichas[0].eco === undefined && r.data.cfg === undefined && !JSON.stringify(r.data).includes("300000"));
r = await llamar("GET", "/api/vehiculos/estado", ""); esperar("sin sesión 401", r.status === 401, est(r));

console.log("\nB) Ajuste de coste/hora, horas, notas");
r = await llamar("POST", "/api/vehiculos/config", M, { costeHora: "18" }); esperar("mecánico no cambia coste/hora", r.status === 403, est(r));
r = await llamar("POST", "/api/vehiculos/config", L, { costeHora: "18,00" }); esperar("gerente pone 18 €/h", r.status === 200 && r.data.cfg.costeHora === 1800, est(r));
r = await llamar("POST", "/api/vehiculos/horas/" + id, M, { horas: "2,5", nota: "Chapa trasera" }); esperar("mecánico anota 2,5 h", r.status === 200, est(r));
esperar("primeras horas pasan a «En reparación»", r.data.ficha.fase === "reparacion");
r = await llamar("POST", "/api/vehiculos/horas/" + id, M, { horas: "0" }); esperar("horas cero rechazadas", r.status === 400, est(r));
r = await llamar("POST", "/api/vehiculos/horas/" + id, M, { horas: "1", fecha: "2099-01-01" }); esperar("horas de día futuro rechazadas", r.status === 400, est(r));
r = await llamar("POST", "/api/vehiculos/nota/" + id, M, { txt: "Cambiado paragolpes", tipo: "tecnica", fotos: ["no-valida"] }); esperar("nota técnica (foto inválida ignorada)", r.status === 200 && r.data.ficha.actualizaciones.at(-1).fotos.length === 0, est(r));
r = await llamar("POST", "/api/vehiculos/nota/" + id, M, {}); esperar("nota vacía rechazada", r.status === 400, est(r));

console.log("\nC) Piezas del inventario a un coche propio");
r = await llamar("POST", "/api/almacen/pieza", L, { nombre: "Paragolpes trasero Ibiza", categoria: "Carrocería y pintura", unidad: "ud", minimo: "1", coste: "120", pvp: "200", stock: "0" });
esperar("alta de la pieza", r.status === 201 || r.status === 200, est(r)); const pid = r.data.pieza?.id;
r = await llamar("POST", "/api/almacen/entrada", L, { albaran: "A-1", proveedor: "Recambios Canarias", lineas: [{ pieza: pid, cantidad: "3", coste: "120" }] }); esperar("entrada de 3 uds", r.status === 200, est(r));
r = await llamar("POST", "/api/almacen/imputar", M, { vehiculo: id, pieza: pid, cantidad: "1" }); esperar("mecánico carga 1 pieza al coche", r.status === 200 && r.data.stock === 2, est(r));
const movId = r.data.movimiento?.id;
r = await llamar("POST", "/api/almacen/imputar", M, { vehiculo: id, pieza: pid, cantidad: "9" }); esperar("sin stock suficiente: rechazado", r.status === 409, est(r));
r = await llamar("POST", "/api/almacen/imputar", M, { vehiculo: "zzzzzzzzzzzz", pieza: pid, cantidad: "1" }); esperar("coche inexistente rechazado", r.status === 404, est(r));
r = await llamar("GET", "/api/vehiculos/ficha/" + id, L); esperar("la ficha refleja la pieza al coste 120 €", r.data.piezas.length === 1 && r.data.piezas[0].coste === 12000 && r.data.eco.piezas === 12000, JSON.stringify(r.data.eco));
r = await llamar("GET", "/api/vehiculos/ficha/" + id, M); esperar("el mecánico ve la pieza pero no su coste", r.data.piezas.length === 1 && r.data.piezas[0].coste === undefined);

console.log("\nD) Costes con aprobación");
r = await llamar("POST", "/api/vehiculos/coste/" + id, M, { concepto: "Pintura paragolpes", importe: "150" }); esperar("mecánico propone coste (pendiente)", r.status === 200 && r.data.ficha.costes[0].estado === "pendiente", est(r));
const cid = r.data.ficha.costes[0].id;
r = await llamar("GET", "/api/vehiculos/ficha/" + id, L); esperar("pendiente NO suma todavía", r.data.eco.otros === 0 && r.data.eco.pendiente === 15000, JSON.stringify(r.data.eco));
r = await llamar("POST", "/api/vehiculos/decidir/" + id + "/" + cid, M, { decision: "aprobar" }); esperar("mecánico no aprueba", r.status === 403, est(r));
r = await llamar("POST", "/api/vehiculos/decidir/" + id + "/" + cid, L, { decision: "aprobar" }); esperar("gerente aprueba", r.status === 200 && r.data.ficha.eco.otros === 15000, est(r));
r = await llamar("POST", "/api/vehiculos/decidir/" + id + "/" + cid, L, { decision: "aprobar" }); esperar("no se decide dos veces", r.status === 409, est(r));
r = await llamar("POST", "/api/vehiculos/coste/" + id, L, { concepto: "ITV y tasas", importe: "40" }); esperar("el gerente anota directo (aprobado)", r.status === 200 && r.data.ficha.costes[1].estado === "aprobado", est(r));
const c2 = r.data.ficha.costes[1].id;
r = await llamar("POST", "/api/vehiculos/anular/" + id + "/coste/" + c2, L, { motivo: "corto" }); esperar("anular exige motivo largo", r.status === 400, est(r));
r = await llamar("POST", "/api/vehiculos/anular/" + id + "/coste/" + c2, L, { motivo: "Duplicado por error" }); esperar("gerente anula con motivo", r.status === 200 && r.data.ficha.eco.otros === 15000, est(r));
r = await llamar("POST", "/api/vehiculos/coste/" + id, M, { concepto: "Gasto ajeno", importe: "20" }); const c3 = r.data.ficha.costes.at(-1).id;

console.log("\nE) Flujo de fases");
r = await llamar("POST", "/api/vehiculos/fase/" + id, M, { fase: "calidad" }); esperar("mecánico pasa a calidad", r.status === 200 && r.data.ficha.fase === "calidad", est(r));
r = await llamar("POST", "/api/vehiculos/fase/" + id, M, { fase: "listo" }); esperar("mecánico NO firma «Listo»", r.status === 403, est(r));
r = await llamar("POST", "/api/vehiculos/fase/" + id, C, { fase: "listo" }); esperar("con costes pendientes no se pasa a «Listo»", r.status === 409, est(r));
r = await llamar("POST", "/api/vehiculos/decidir/" + id + "/" + c3, L, { decision: "rechazar", motivo: "No corresponde a este coche" }); esperar("gerente rechaza con motivo", r.status === 200, est(r));
r = await llamar("POST", "/api/vehiculos/fase/" + id, C, { fase: "vendido" }); esperar("no se salta el flujo", r.status === 409, est(r));
r = await llamar("POST", "/api/vehiculos/fase/" + id, C, { fase: "reparacion" }); esperar("devolver a reparación exige motivo", r.status === 400, est(r));
r = await llamar("POST", "/api/vehiculos/fase/" + id, C, { fase: "listo" }); esperar("Calidad (que no ha trabajado) pasa a «Listo»", r.status === 200 && r.data.ficha.fase === "listo", est(r));
esperar("queda quién firmó la calidad", r.data.ficha.ultimaCalidad?.nombre === "Calidad Prueba");
r = await llamar("POST", "/api/vehiculos/fase/" + id, R, { fase: "reparacion", nota: "Reabrir por prueba" }); esperar("solo el gerente reabre «Listo»", r.status === 403, est(r));

console.log("\nF) Finanzas suma el reacondicionamiento (y no duplica)");
// Coche de la web enlazado a la ficha
const web = await llamar("POST", "/api/coches", L, { marca: "Seat", modelo: "Ibiza", version: "1.2", anio: 2015, km: 142000, combustible: "Gasolina", cambio: "Manual", precio: 6420, estado: "disponible", descripcion: "Prueba", equipamiento: [], fotos: [] });
esperar("coche de la web creado (prueba)", web.status === 201, est(web));
const cw = web.data?.id;
r = await llamar("POST", "/api/vehiculos/editar/" + id, R, { coche: cw }); esperar("recepción no enlaza (solo gerente)", r.status === 200 && r.data.ficha.coche === "", est(r));
r = await llamar("POST", "/api/vehiculos/editar/" + id, L, { coche: cw }); esperar("gerente enlaza con el coche de la web", r.status === 200 && r.data.ficha.coche === cw, est(r));
r = await llamar("POST", "/api/vehiculos/crear", R, { marca: "Kia", modelo: "Rio", matricula: "0001aaa" }); const id2 = r.data.ficha.id;
r = await llamar("POST", "/api/vehiculos/editar/" + id2, L, { coche: cw }); esperar("un coche web no se enlaza a dos fichas", r.status === 409, est(r));
const fn = await llamar("GET", "/api/finanzas/resumen?desde=2020-01-01&hasta=2099-12-31", L);
esperar("Finanzas responde", fn.status === 200, est(fn));
const st = fn.data.stock?.find((x) => x.coche === cw);
// piezas 120 + horas 2,5×18=45 + coste aprobado 150 = 315 €; compra 3.000 €
esperar("stock: reacondicionamiento = 315 € (piezas+horas+costes)", st && st.reacondicionamiento === 31500, JSON.stringify(st));
esperar("stock: compra 3.000 € tomada de la ficha", st && st.compra === 300000, JSON.stringify(st));
const carVend = await llamar("PUT", "/api/coches/" + cw, L, { ...(await llamar("GET", "/api/coches?todos=1", L)).data.find((c) => c.id === cw), estado: "vendido" });
esperar("coche web marcado vendido", carVend.status === 200, est(carVend));
const fn2 = await llamar("GET", "/api/finanzas/resumen?desde=2020-01-01&hasta=2099-12-31", L);
const vv = fn2.data.coches?.find((x) => x.coche === cw);
esperar("venta: beneficio = precio − compra − reacond.", vv && vv.compra === 300000 && vv.reacondicionamiento === 31500 && vv.beneficio === vv.base - 300000 - 31500, JSON.stringify(vv));

console.log("\nG) Cierre y devoluciones");
r = await llamar("POST", "/api/vehiculos/fase/" + id, R, { fase: "vendido" }); esperar("recepción no marca vendido", r.status === 403, est(r));
r = await llamar("POST", "/api/vehiculos/fase/" + id, L, { fase: "vendido" }); esperar("gerente marca vendido (enlazado y vendido en web)", r.status === 200 && r.data.ficha.fase === "vendido", est(r));
r = await llamar("POST", "/api/almacen/imputar", M, { vehiculo: id, pieza: pid, cantidad: "1" }); esperar("vendido: no admite más piezas", r.status === 409, est(r));
r = await llamar("POST", "/api/vehiculos/horas/" + id, M, { horas: "1" }); esperar("vendido: ficha cerrada", r.status === 409, est(r));
// devolución en otro coche
r = await llamar("POST", "/api/almacen/imputar", M, { vehiculo: id2, pieza: pid, cantidad: "1" }); esperar("carga pieza al 2.º coche", r.status === 200, est(r)); const mv2 = r.data.movimiento.id;
r = await llamar("POST", "/api/almacen/devolver-pieza/" + mv2, M, { motivo: "Era la medida equivocada" }); esperar("devolución al almacén", r.status === 200 && r.data.stock === 2, est(r));
r = await llamar("GET", "/api/vehiculos/ficha/" + id2, L); esperar("la ficha 2 no suma la pieza devuelta", r.data.eco.piezas === 0 && r.data.piezas[0].devuelto === 1, JSON.stringify(r.data.eco));
const mv = await llamar("GET", "/api/almacen/movimientos?desde=2020-01-01&hasta=2099-12-31", L); esperar("Inventario · movimientos muestran los del coche", mv.status === 200 && JSON.stringify(mv.data).includes("VP-"), est(mv));

console.log("\nH) Libro encadenado y aislamiento público");
const lb = await llamar("GET", "/api/vehiculos/libro", L); esperar("libro íntegro con anotaciones", lb.status === 200 && lb.data.integro && lb.data.total > 10, est(lb));
const lm = await llamar("GET", "/api/vehiculos/libro", M); esperar("libro solo gerente", lm.status === 403, est(lm));
const pub = await llamar("GET", "/api/coches", ""); const invj = JSON.stringify(pub.data) + JSON.stringify((await llamar("GET", "/inventario.json", "")).data);
esperar("la lista pública NO contiene datos internos (compra, VP-, costes)", !/VP-20|3000|300000|Paragolpes/.test(invj), invj.slice(0, 200));
const raro = await llamar("GET", "/api/vehiculos/estado", ""); esperar("las rutas internas exigen sesión", raro.status === 401);

console.log(`\nRESULTADO: ${ok} correctas · ${mal} fallidas`);
if (mal) { console.log("Fallos:\n - " + fallos.join("\n - ")); process.exit(1); }
