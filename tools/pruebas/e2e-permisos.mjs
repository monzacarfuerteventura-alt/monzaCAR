// =====================================================================
// PRUEBA DE PERMISOS DE PRINCIPIO A FIN (27-09-2026)
// Ejecuta las funciones reales de netlify/functions con un almacén en memoria y recorre el panel con
// cada puesto: Gerente (contraseña), Lestter (puesto Gerente con PIN), Calidad, Recepción y Mecánico.
// Uso (en el ordenador del desarrollador, con bun):  bun tools/pruebas/e2e-permisos.mjs
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
for (const p of personas) { const r = await llamar("POST", "/api/taller/equipo", G, p); esperar("da de alta a " + p.nombre + " (" + p.rol + ")", r.status === 201, est(r)); }

// ---------- recorrido por puesto ----------
async function recorrido(p) {
  console.log(`\n2) ${p.nombre} · puesto ${p.rol}`);
  const l = await llamar("POST", "/api/login", "", { usuario: p.usuario, pin: p.pin });
  esperar("entra con usuario y PIN", l.status === 200 && l.data.token, est(l));
  const T = l.data.token;
  const sinFichar = await llamar("GET", "/api/solicitudes", T);
  esperar("sin fichar, el panel pide fichar (423, no «No autorizado»)", sinFichar.status === 423, est(sinFichar));
  const f = await llamar("POST", "/api/jornada/fichar", T, { accion: "entrada" });
  esperar("ficha la entrada", f.status === 200, est(f));

  // Taller: nueva recepción (el fallo que daba «No autorizado»)
  const rc = await llamar("POST", "/api/taller/recepcion", T, { cliente: { nombre: "Cliente " + p.usuario, telefono: "643566098" }, vehiculo: { matricula: "1234" + p.usuario.slice(0, 3).toUpperCase(), marcaModelo: "Seat Ibiza" }, tipoEntrada: "reparacion" });
  esperar("Taller · Nueva recepción → «Crear y abrir FORM-01»", rc.status === 201, est(rc));
  const tok = rc.data?.orden?.token;
  if (tok) {
    const g = await llamar("GET", "/api/taller/fichas/" + tok, T);
    esperar("Taller · abre la orden y sus 4 fichas", g.status === 200, est(g));
    const f1 = await llamar("PUT", "/api/taller/fichas/" + tok + "/f1", T, { ...g.data.fichas.f1, motivo: "Ruido al frenar" });
    esperar("Taller · guarda FORM-01", f1.status === 200, est(f1));
    if (p.rol !== "recepcion") { const f2 = await llamar("PUT", "/api/taller/fichas/" + tok + "/f2", T, { items: {}, horasEst: 1.5 }); esperar("Taller · guarda FORM-02 (inspección)", f2.status === 200, est(f2)); }
    const pat = await llamar("PATCH", "/api/ordenes/" + tok, T, { interno: "Nota de " + p.nombre });
    esperar("Taller · orden completa: nota interna / presupuesto", pat.status === 200, est(pat));
  }
  const ords = await llamar("GET", "/api/ordenes", T); esperar("Taller · lista de órdenes", ords.status === 200 && Array.isArray(ords.data), est(ords));
  // CRM
  const crm = await llamar("GET", "/api/solicitudes", T); esperar("CRM · ver clientes y solicitudes", crm.status === 200, est(crm));
  const alta = await llamar("POST", "/api/solicitudes", T, { manual: true, tipo: "taller", nombre: "Cliente CRM " + p.usuario, telefono: "643566098", mensaje: "Apuntado a mano" });
  esperar("CRM · apuntar un cliente a mano", alta.status === 201, est(alta));
  if (alta.data?.id) { const pa = await llamar("PATCH", "/api/solicitudes/" + alta.data.id, T, { estado: "contactado" }); esperar("CRM · cambiar el estado", pa.status === 200, est(pa)); }
  // Agenda
  const bl = await llamar("GET", "/api/citas/bloqueos", T); esperar("Agenda · ver días cerrados", bl.status === 200, est(bl));
  // Coches
  const co = await llamar("GET", "/api/coches?todos=1", T); esperar("Coches · lista del panel", co.status === 200, est(co));
  const rv = await llamar("GET", "/api/reservas", T); esperar("Coches · reservas online", rv.status === 200, est(rv));
  const en = await llamar("GET", "/api/entregas", T); esperar("Coches · entregas", en.status === 200, est(en));
  // Inventario
  const al = await llamar("GET", "/api/almacen/estado", T); esperar("Inventario · piezas y herramientas", al.status === 200, est(al));
  // Jornada propia
  const yo = await llamar("GET", "/api/jornada/yo", T); esperar("Jornada · mi registro", yo.status === 200, est(yo));
  // Solo gerente
  const fin = await llamar("GET", "/api/finanzas/resumen", T);
  const seg = await llamar("GET", "/api/seguridad", T);
  const st = await llamar("GET", "/api/stats", T);
  if (p.rol === "gerente") {
    esperar("Finanzas (puesto Gerente)", fin.status === 200, est(fin));
    esperar("Seguridad (puesto Gerente)", seg.status === 200, est(seg));
    esperar("Dashboard · estadísticas (puesto Gerente)", st.status === 200, est(st));
    const eq = await llamar("GET", "/api/taller/equipo", T); esperar("Equipo · gestionar personas (puesto Gerente)", eq.status === 200, est(eq));
    const pl = await llamar("GET", "/api/jornada/plantilla", T); esperar("Jornada · plantilla de todos (puesto Gerente)", pl.status === 200, est(pl));
  } else {
    esperar("Finanzas queda para el gerente (mensaje claro, no «No autorizado»)", fin.status === 403 && !/no autorizado/i.test(fin.data?.error || ""), est(fin));
    esperar("Seguridad queda para el gerente", seg.status === 403, est(seg));
  }
  const sal = await llamar("POST", "/api/jornada/fichar", T, { accion: "salida" });
  esperar("ficha la salida", sal.status === 200, est(sal));
}
for (const p of personas) await recorrido(p);

// Contraseña del gerente: todo
console.log("\n3) Gerente con contraseña: secciones de gerente");
for (const [n, path] of [["Finanzas", "/api/finanzas/resumen"], ["Seguridad", "/api/seguridad"], ["Dashboard", "/api/stats"], ["Marketing", "/api/marketing"], ["Caja", "/api/caja/estado"]]) {
  const r = await llamar("GET", path, G); esperar(n, r.status === 200, est(r));
}
const sin = await llamar("GET", "/api/solicitudes", ""); esperar("Sin sesión: 401 (el panel vuelve a la entrada)", sin.status === 401, est(sin));

console.log(`\nRESULTADO: ${ok} correctas · ${mal} fallidas`);
if (mal) { console.log("Fallos:\n - " + fallos.join("\n - ")); process.exit(1); }
