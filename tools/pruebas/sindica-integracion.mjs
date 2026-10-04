// Simulación completa del motor con un almacén falso y un portal simulado (sin red):  node tools/pruebas/sindica-integracion.mjs
import { mkdtempSync, cpSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "../..");
const T = mkdtempSync(join(tmpdir(), "sindica-"));
mkdirSync(join(T, "lib"), { recursive: true });
cpSync(join(RAIZ, "netlify/lib/sindica"), join(T, "lib/sindica"), { recursive: true });
writeFileSync(join(T, "lib/shared.mts"), `
const datos = new Map();
export const avisos = [];
export function store(n) { return {
  async get(k) { return datos.has(n+"/"+k) ? structuredClone(datos.get(n+"/"+k)) : null; },
  async setJSON(k, v, o) { if (o && o.onlyIfNew && datos.has(n+"/"+k)) return { modified: false }; datos.set(n+"/"+k, structuredClone(v)); return { modified: true }; },
  async delete(k) { datos.delete(n+"/"+k); } }; }
export async function enviarAviso(asunto, filas) { avisos.push({ asunto, filas }); return true; }
`);
const env = { SINDICA_ACTIVO: "1", SINDICA_CANALES: "autoscout24", AS24_URL: "https://api.test", AS24_TOKEN: "t", FEED_TOKEN: "x".repeat(30) };
globalThis.Netlify = { env: { get: (k) => env[k] } };
const llamadas = []; let modo = "ok", retryAfter = null;
globalThis.fetch = async (url, init) => { llamadas.push({ m: init.method, url: url.replace("https://api.test", "") });
  const h = retryAfter ? { "retry-after": retryAfter } : {};
  if (modo === "503") return new Response("caido", { status: 503, headers: h }); if (modo === "429") return new Response("lento", { status: 429, headers: h });
  if (modo === "422") return new Response("precio mal", { status: 422 });
  return new Response(JSON.stringify({ id: "AS-" + llamadas.length }), { status: 201 }); };
const { store, avisos } = await import(pathToFileURL(join(T, "lib/shared.mts")).href);
const M = await import(pathToFileURL(join(T, "lib/sindica/motor.mts")).href);
const sin = async () => {};
let reloj = new Date("2026-10-03T10:00:00Z"); const opts = () => ({ dormir: sin, ahora: () => reloj });
const c = (id, x = {}) => ({ id, marca: "Seat", modelo: "Ibiza", version: "1.0", anio: 2019, km: 80000, combustible: "Gasolina", cambio: "Manual", cv: 95, puertas: 5, color: "Rojo", etiqueta: "C", precio: 9990, descripcion: "ok", equipamiento: [], fotos: ["f.jpg"], estado: "disponible", creado: "2026-09-01T00:00:00Z", actualizado: "2026-09-01T00:00:00Z", ...x });
const A = "opel-astra-2010", B = "ford-tourneo-connect-2007", C3 = "cccccccc-3333-4333-8333-333333333333";
const poner = (l) => store("monzacar").setJSON("coches", l);
const ok = (m) => console.log("  ✔", m);

await poner([c(A, { precio: 2999.99 }), c(B, { precio: 3000 })]);
let r = await M.pasada(opts()); assert.equal(r.canales.autoscout24.hechas, 2); assert.deepEqual(llamadas.map((x) => x.m), ["POST", "POST"]); ok("alta de 2 coches (POST, POST)");
r = await M.pasada(opts()); assert.equal(r.canales.autoscout24.pendientes, 0); ok("segunda pasada sin cambios: 0 operaciones");

await poner([c(A, { precio: 2999.99, estado: "reservado" }), c(B, { precio: 3000 })]); llamadas.length = 0;
r = await M.pasada(opts()); assert.equal(llamadas.length, 0); ok("coche RESERVADO se mantiene anunciado (no se retira ni se toca)");

await poner([c(A, { precio: 2799.99 }), c(B, { estado: "vendido" })]); llamadas.length = 0;
r = await M.pasada(opts()); assert.deepEqual(llamadas.map((x) => x.m).sort(), ["DELETE", "PUT"]); ok("rebaja con céntimos → PUT; vendido → DELETE");

await poner([c(A, { precio: 2799.99 }), c(C3, { fotos: [] })]); r = await M.pasada(opts());
assert.deepEqual(r.canales.autoscout24.invalidos[C3], ["sin fotos"]); ok("coche sin fotos queda fuera con su motivo");

// cerrojo
const s = store("sindica"); await s.setJSON("cerrojo.json", { hasta: reloj.getTime() + 60_000 });
r = await M.pasada(opts()); assert.ok(r.omitido); await s.delete("cerrojo.json"); ok("cerrojo: no se pisan dos pasadas");

// Retry-After + circuito
modo = "503"; retryAfter = "3600"; const nuevos = ["d1", "d2", "d3", "d4", "d5", "d6", "d7"].map((i) => c(i + "0000000-4444-4444-8444-444444444444"));
await poner([c(A, { precio: 2799.99 }), ...nuevos]); llamadas.length = 0; avisos.length = 0; env.SINDICA_MAX = "20";
r = await M.pasada(opts());
assert.equal(r.canales.autoscout24.pausado, true); assert.ok(llamadas.length <= 3 * 5 + 3, "no machaca al portal: " + llamadas.length); assert.equal(avisos.length, 1);
ok(`portal caído: se pausa el canal tras ${llamadas.length} llamadas y se avisa UNA vez`);
const reg = await M.cargar("autoscout24"); const caido = Object.values(reg).find((x) => x.estado === "error");
assert.ok(Date.parse(caido.proximoIntento) - reloj.getTime() >= 3600_000); ok("respeta Retry-After de 1 h");
llamadas.length = 0; r = await M.pasada(opts()); assert.equal(llamadas.length, 0); assert.equal(r.canales.autoscout24.pausado, true); ok("mientras el circuito está abierto no llama al portal");
reloj = new Date(reloj.getTime() + 2 * 3600_000); modo = "ok"; retryAfter = null; llamadas.length = 0;
r = await M.pasada(opts()); assert.ok(llamadas.length >= 1 && !r.canales.autoscout24.pausado); ok("pasado el tiempo, se recupera solo");

// rechazo 422
modo = "422"; await poner([c(A, { precio: 2799.99 }), c("e0000000-5555-4555-8555-555555555555", { precio: 1234 })]); avisos.length = 0; llamadas.length = 0;
r = await M.pasada(opts()); llamadas.length = 0; await M.pasada(opts()); assert.equal(llamadas.length, 0); ok("rechazo 4xx: se avisa y no se insiste");

// informe para el panel
modo = "ok"; await poner([c(A, { precio: 2999.99, version: "1.6 115 CV", fotos: Array(6).fill("a.jpg") }), c(B, { estado: "reservado" })]);
const inf = await M.informe();
assert.equal(inf.feeds.activo, true); assert.ok(inf.feeds.xml.includes("token=")); assert.equal(inf.simulacro, false);
assert.equal(inf.coches.length, 2); assert.equal(inf.coches.find((x) => x.id === A).precio, 2999.99);
assert.equal(inf.coches.find((x) => x.id === B).feeds.xml.ok, false); assert.ok(inf.historial.length >= 1);
ok("informe del panel: feeds, coches, consejos e historial");
env.FEED_TOKEN = "corta"; assert.equal((await M.informe()).feeds.activo, false); ok("sin FEED_TOKEN válido el informe lo dice (feeds apagados)");
console.log("\nTODO CORRECTO");
