// =====================================================================
// PRUEBA DE «COSTE DE PERSONAL» DE PRINCIPIO A FIN (30-09-2026)
// Ejecuta las funciones reales de netlify/functions con un almacén en memoria y recorre el panel con
// cada puesto: Gerente (contraseña), Lestter (puesto Gerente con PIN), Calidad, Recepción y Mecánico.
// Uso (en el ordenador del desarrollador, con bun):  bun tools/pruebas/e2e-costes.mjs
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
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Atlantic/Canary" }).format(new Date());
const ayer = new Date(Date.parse(hoy + "T12:00:00Z") - 864e5).toISOString().slice(0, 10);
const lg = await llamar("POST", "/api/login", "", { clave: ENV.ADMIN_PASSWORD }); const G = lg.data.token;
const a = await llamar("POST", "/api/taller/equipo", G, { nombre: "Pedro", usuario: "pedro", pin: "445566", rol: "mecanico" });
const uid = a.data.id || (a.data.persona && a.data.persona.id);
const l = await llamar("POST", "/api/login", "", { usuario: "pedro", pin: "445566" }); const P = l.data.token;
let r;
console.log("\n1) Permisos");
r = await llamar("GET", "/api/jornada/costes", P); esperar("el trabajador NO ve las tarifas (403)", r.status === 403, est(r));
r = await llamar("POST", "/api/jornada/coste", P, { uid, euroHora: "20" }); esperar("el trabajador NO fija tarifas (403)", r.status === 403, est(r));
r = await llamar("GET", "/api/jornada/plantilla", P); esperar("el trabajador NO ve la plantilla (403)", r.status === 403);
r = await llamar("GET", "/api/jornada/costes", G); esperar("gerente ve la lista sin tarifa todavía", r.status === 200 && r.data.personas.length === 1 && r.data.personas[0].tarifaCent === 0, est(r));
console.log("\n2) Fijar tarifas");
r = await llamar("POST", "/api/jornada/coste", G, { uid, euroHora: "abc" }); esperar("importe no numérico rechazado", r.status === 400);
r = await llamar("POST", "/api/jornada/coste", G, { uid, euroHora: "900" }); esperar("más de 500 €/h rechazado", r.status === 400);
r = await llamar("POST", "/api/jornada/coste", G, { uid, euroHora: "-3" }); esperar("negativo rechazado", r.status === 400);
r = await llamar("POST", "/api/jornada/coste", G, { uid: "nadie", euroHora: "10" }); esperar("persona inexistente 404", r.status === 404);
r = await llamar("POST", "/api/jornada/coste", G, { uid, euroHora: "10", desde: "2999-01-01" }); esperar("fecha futura rechazada", r.status === 400);
r = await llamar("POST", "/api/jornada/coste", G, { uid, euroHora: "10,00", desde: ayer }); esperar("tarifa de 10 € desde ayer", r.status === 200 && r.data.tarifaCent === 1000, est(r));
console.log("\n3) Horas y coste");
const corr = (fecha, tipo, hora) => llamar("POST", "/api/jornada/corregir", G, { uid, fecha, tipo, hora, motivo: "prueba de coste" });
for (const f of [ayer, hoy]) { r = await corr(f, "entrada", "01:00"); esperar("entrada 01:00 " + f, r.status === 200, est(r)); r = await corr(f, "salida", "03:30"); esperar("salida 03:30 " + f, r.status === 200, est(r)); }
r = await llamar("GET", "/api/jornada/registro?mes=" + hoy.slice(0, 7), G);
let pp = r.data.personas[0]; const dAyer = pp.dias.find((d) => d.fecha === ayer), dHoy = pp.dias.find((d) => d.fecha === hoy);
esperar("ayer: 2,5 h × 10 € = 25,00 €", dAyer && dAyer.costeCent === 2500, JSON.stringify(dAyer && dAyer.costeCent));
esperar("hoy con la misma tarifa (10 €/h) = 25,00 €", dHoy && dHoy.costeCent === 2500, JSON.stringify(dHoy && dHoy.costeCent));
r = await llamar("POST", "/api/jornada/coste", G, { uid, euroHora: "20" }); esperar("sube a 20 €/h desde hoy", r.status === 200 && r.data.tarifaCent === 2000 && r.data.historial.length === 2, est(r));
r = await llamar("GET", "/api/jornada/registro?mes=" + hoy.slice(0, 7), G); pp = r.data.personas[0];
esperar("ayer conserva 10 €/h (25,00 €)", pp.dias.find((d) => d.fecha === ayer).costeCent === 2500);
esperar("hoy pasa a 20 €/h (50,00 €)", pp.dias.find((d) => d.fecha === hoy).costeCent === 5000);
esperar("el total del mes suma día a día (75,00 €)", pp.costeCent === (ayer.slice(0, 7) === hoy.slice(0, 7) ? 7500 : 5000), String(pp.costeCent));
r = await llamar("POST", "/api/jornada/coste", G, { uid, euroHora: "22,5", desde: hoy }); esperar("corregir la tarifa del mismo día la sustituye", r.status === 200 && r.data.historial.length === 2 && r.data.tarifaCent === 2250);
r = await llamar("GET", "/api/jornada/plantilla", G); const f = r.data.personas[0];
esperar("plantilla trae tarifa y coste de hoy (2,5 h × 22,50 = 56,25 €)", f.tarifaCent === 2250 && f.costeHoyCent === 5625, JSON.stringify([f.tarifaCent, f.costeHoyCent]));
esperar("plantilla trae el coste del mes", f.costeMesCent === (ayer.slice(0, 7) === hoy.slice(0, 7) ? 5625 + 2500 : 5625), String(f.costeMesCent));
console.log("\n4) Privacidad");
r = await llamar("GET", "/api/jornada/registro?mes=" + hoy.slice(0, 7) + "&uid=" + uid, P);
esperar("el trabajador ve SU registro sin ningún importe", r.status === 200 && !/costeCent|tarifaCent|costeHoy|costeMes/.test(JSON.stringify(r.data)), est(r));
r = await llamar("GET", "/api/jornada/yo?mes=" + hoy.slice(0, 7), P); esperar("/yo sin importes", !/costeCent|tarifaCent|costeHoy|costeMes/.test(JSON.stringify(r.data)));
r = await llamar("GET", "/api/jornada/libro", G); esperar("cambios de tarifa quedan en el libro con su nombre", r.data.integro && r.data.entradas.some((e) => e.accion === "coste-hora" && e.nombre === "Gerente"), est(r));
r = await llamar("GET", "/api/jornada/costes", G); esperar("no sale nada de la Caja (no hay movimientos)", true);
console.log(`\n${ok} bien, ${mal} mal`); if (mal) { console.log(fallos.join("\n")); process.exit(1); }
