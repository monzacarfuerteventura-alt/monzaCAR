// =====================================================================
// PRUEBA DE «AUSENCIAS (RRHH)» DE PRINCIPIO A FIN (30-09-2026)
// Ejecuta las funciones reales de netlify/functions con un almacén en memoria y recorre el panel con
// cada puesto: Gerente (contraseña), Lestter (puesto Gerente con PIN), Calidad, Recepción y Mecánico.
// Uso (en el ordenador del desarrollador, con bun):  bun tools/pruebas/e2e-ausencias.mjs
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
async function subir(token, mime, bytes, nombre = "doc", uid = "") {
  const r = await rutas.find((x) => x.re.test("/api/ausencias/subir")).fn(new Request(new URL("/api/ausencias/subir" + (uid ? "?uid=" + uid : ""), ORIGEN), { method: "POST", headers: { "content-type": mime, origin: ORIGEN, authorization: "Bearer " + token, "x-nombre": encodeURIComponent(nombre) }, body: bytes }), { ip: "10.0.0.9", geo: {}, params: {} });
  return { status: r.status, data: await r.json().catch(() => ({})) };
}
async function bajar(token, key) {
  const r = await rutas.find((x) => x.re.test("/api/ausencias/doc/" + key)).fn(new Request(new URL("/api/ausencias/doc/" + key, ORIGEN), { headers: { authorization: "Bearer " + token, origin: ORIGEN } }), { ip: "10.0.0.9", geo: {}, params: {} });
  return { status: r.status, tipo: r.headers.get("content-type"), cache: r.headers.get("cache-control"), n: r.status === 200 ? (await r.arrayBuffer()).byteLength : 0 };
}
await store("seguridad").set("config/2fa-equipo", "0");
const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Atlantic/Canary" }).format(new Date());
const suma = (n) => new Date(Date.parse(hoy + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);

console.log("\n1) Puestos");
const lg = await llamar("POST", "/api/login", "", { clave: ENV.ADMIN_PASSWORD }); const G = lg.data.token; esperar("gerente entra", !!G, est(lg));
const personas = [{ nombre: "Pedro", usuario: "pedro", pin: "445566", rol: "mecanico" }, { nombre: "Ana", usuario: "ana", pin: "112233", rol: "recepcion" }];
const tk = {}, uid = {};
for (const p of personas) { const a = await llamar("POST", "/api/taller/equipo", G, p); uid[p.usuario] = a.data.id || (a.data.persona && a.data.persona.id); const l = await llamar("POST", "/api/login", "", { usuario: p.usuario, pin: p.pin }); tk[p.usuario] = l.data.token; esperar("entra " + p.nombre + " SIN fichar", !!l.data.token, est(l)); }
const [P, A] = [tk.pedro, tk.ana];
if (!uid.pedro) { const e = await llamar("GET", "/api/taller/equipo", G); for (const x of (e.data.equipo || e.data)) uid[x.usuario] = x.id; }
esperar("Pedro no ha fichado (bloqueado en el resto)", (await llamar("GET", "/api/vehiculos/estado", P)).status === 423);
let r = await llamar("GET", "/api/ausencias/mias", P); esperar("aun sin fichar puede comunicar ausencias (mias)", r.status === 200 && r.data.tipos.length === 8, est(r));
r = await llamar("GET", "/api/ausencias/mias", ""); esperar("sin sesión 401", r.status === 401);

console.log("\n2) Documentos");
const PDF = new TextEncoder().encode("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF"), JPG = new Uint8Array([255, 216, 255, 224, 0, 16, 74, 70, 73, 70, 0, 1]);
let d1 = await subir(P, "application/pdf", PDF, "parte-de-baja.pdf"); esperar("sube un PDF", d1.status === 201 && /\.pdf$/.test(d1.data.key), est(d1));
let d2 = await subir(P, "image/jpeg", JPG, "foto.jpg"); esperar("sube una foto", d2.status === 201, est(d2));
r = await subir(P, "application/pdf", new TextEncoder().encode("esto no es pdf"), "x.pdf"); esperar("PDF falso rechazado", r.status === 415, est(r));
r = await subir(P, "application/x-msdownload", PDF); esperar("formato .exe rechazado", r.status === 415, est(r));
r = await subir(P, "image/png", new Uint8Array(4 * 1024 * 1024 + 10)); esperar("más de 4 MB rechazado", r.status === 413, est(r));
r = await subir("", "image/png", JPG); esperar("subir sin sesión 401", r.status === 401);
let b = await bajar(P, d1.data.key); esperar("el dueño descarga su PDF sin caché", b.status === 200 && b.tipo === "application/pdf" && /no-store/.test(b.cache) && b.n === PDF.length, JSON.stringify(b));
b = await bajar(A, d1.data.key); esperar("otro trabajador NO ve el documento (404)", b.status === 404);
b = await bajar(G, d1.data.key); esperar("el gerente sí lo ve", b.status === 200);
b = await bajar(P, "manipulada.pdf"); esperar("clave manipulada 404", b.status === 404);

console.log("\n3) Comunicar una ausencia");
const base = { tipo: "baja-medica", desde: hoy, hasta: suma(4), motivo: "Gripe con fiebre", docs: [d1.data.key] };
r = await llamar("POST", "/api/ausencias/crear", P, { ...base, tipo: "inventado" }); esperar("tipo inventado rechazado", r.status === 400);
r = await llamar("POST", "/api/ausencias/crear", P, { ...base, desde: "hoy" }); esperar("fecha mala rechazada", r.status === 400);
r = await llamar("POST", "/api/ausencias/crear", P, { ...base, hasta: suma(-2) }); esperar("fin antes de inicio rechazado", r.status === 400);
r = await llamar("POST", "/api/ausencias/crear", P, { ...base, desde: suma(-90), hasta: suma(-85) }); esperar("más de 60 días atrás rechazado", r.status === 400);
r = await llamar("POST", "/api/ausencias/crear", P, { ...base, tipo: "otro", motivo: "" }); esperar("«otro» exige motivo", r.status === 400);
r = await llamar("POST", "/api/ausencias/crear", P, { ...base, docs: [d1.data.key.replace(/^./, "0")] }); esperar("documento ajeno/inexistente rechazado", r.status === 400);
r = await llamar("POST", "/api/ausencias/crear", A, { ...base, docs: [d1.data.key] }); esperar("no puede usar el documento de otra persona", r.status === 400);
r = await llamar("POST", "/api/ausencias/crear", P, base); esperar("Pedro comunica su baja médica", r.status === 201 && r.data.solicitud.estado === "pendiente" && /^AUS-\d{4}-001$/.test(r.data.solicitud.ref), est(r));
const s1 = r.data.solicitud; esperar("cuenta 5 días naturales", s1.dias === 5 && s1.laborables >= 3 && s1.laborables <= 5);
esperar("la solicitud lleva su documento", s1.docs.length === 1 && s1.docs[0].nombre === "parte-de-baja.pdf");
r = await llamar("POST", "/api/ausencias/crear", P, { ...base, desde: suma(2), hasta: suma(3), docs: [] }); esperar("solape con otra solicitud → 409", r.status === 409, est(r));
r = await llamar("POST", "/api/ausencias/crear", P, { tipo: "cita-medica", desde: suma(10), horaDesde: "10:00", horaHasta: "09:00" }); esperar("horas al revés rechazadas", r.status === 400);
r = await llamar("POST", "/api/ausencias/crear", P, { tipo: "cita-medica", desde: suma(10), horaDesde: "09:00", horaHasta: "11:00", motivo: "Dentista" }); esperar("cita médica de 9 a 11 (sin documento aún)", r.status === 201 && r.data.solicitud.horaDesde === "09:00", est(r));
const s2 = r.data.solicitud;
r = await llamar("POST", "/api/ausencias/crear", A, { tipo: "vacaciones", desde: suma(30), hasta: suma(40) }); esperar("Ana pide vacaciones", r.status === 201, est(r)); const s3 = r.data.solicitud;
r = await llamar("GET", "/api/ausencias/mias", A); esperar("Ana solo ve las suyas", r.data.solicitudes.length === 1 && r.data.solicitudes[0].id === s3.id);
r = await llamar("GET", "/api/ausencias/gestion", P); esperar("un trabajador NO entra en la gestión (403)", r.status === 403);
r = await llamar("POST", "/api/ausencias/decidir/" + s1.id, P, { decision: "aprobar" }); esperar("un trabajador NO decide (403)", r.status === 403);

console.log("\n4) El gerente a primera hora");
r = await llamar("GET", "/api/ausencias/gestion", G);
esperar("3 pendientes, ninguna decidida", r.status === 200 && r.data.contadores.pendientes === 3 && r.data.contadores.sinLeer === 3, JSON.stringify(r.data.contadores));
esperar("Pedro aparece como ausente hoy", r.data.contadores.ausentesHoy === 1 && r.data.hoyLista[0].nombre === "Pedro" && r.data.hoyLista[0].docs.length === 1);
esperar("los pendientes van por fecha de inicio", r.data.pendientes[0].id === s1.id);
r = await llamar("GET", "/api/ausencias/gestion?uid=" + uid.ana, G); esperar("filtro por trabajador", r.data.lista.length === 1 && r.data.lista[0].nombre === "Ana");
r = await llamar("GET", "/api/ausencias/ficha/" + s1.id, G); esperar("abre la ficha y la marca leída", r.status === 200 && r.data.motivo === "Gripe con fiebre");
r = await llamar("GET", "/api/ausencias/gestion", G); esperar("sinLeer baja a 2", r.data.contadores.sinLeer === 2);
r = await llamar("POST", "/api/ausencias/decidir/" + s1.id, G, { decision: "rechazar" }); esperar("rechazar sin motivo → 400", r.status === 400);
r = await llamar("POST", "/api/ausencias/decidir/" + s2.id, G, { decision: "pedir-info", motivo: "Sube el justificante de la cita" }); esperar("pide información", r.status === 200 && r.data.solicitud.estado === "pide-info", est(r));
r = await llamar("GET", "/api/ausencias/mias", P); const s2p = r.data.solicitudes.find((x) => x.id === s2.id);
esperar("Pedro ve la pregunta y un aviso nuevo", s2p.estado === "pide-info" && s2p.decision.motivo.includes("justificante") && r.data.sinVer === 1);
r = await llamar("POST", "/api/ausencias/responder/" + s1.id, P, { texto: "x" }); esperar("responder sin pregunta pendiente → 409", r.status === 409);
r = await llamar("POST", "/api/ausencias/responder/" + s2.id, P, {}); esperar("responder vacío → 400", r.status === 400);
const d3 = await subir(P, "image/jpeg", JPG, "justificante.jpg");
r = await llamar("POST", "/api/ausencias/responder/" + s2.id, P, { texto: "Aquí lo tienes", docs: [d3.data.key] }); esperar("Pedro responde y adjunta", r.status === 200 && r.data.solicitud.estado === "pendiente" && r.data.solicitud.docs.length === 1, est(r));
r = await llamar("POST", "/api/ausencias/decidir/" + s1.id, G, { decision: "aprobar", retribuida: "si", motivo: "Que te mejores" }); esperar("gerente APRUEBA la baja (con sueldo)", r.status === 200 && r.data.solicitud.estado === "aprobada" && r.data.solicitud.decision.retribuida === "si", est(r));
r = await llamar("POST", "/api/ausencias/decidir/" + s3.id, G, { decision: "rechazar", motivo: "Esas semanas hay mucha carga" }); esperar("gerente RECHAZA las vacaciones con motivo", r.status === 200 && r.data.solicitud.estado === "rechazada");
r = await llamar("GET", "/api/ausencias/mias", A); esperar("Ana ve el rechazo y su motivo", r.data.solicitudes[0].estado === "rechazada" && r.data.solicitudes[0].decision.motivo.includes("carga") && r.data.sinVer === 1);
r = await llamar("POST", "/api/ausencias/visto/" + s3.id, A, {}); r = await llamar("GET", "/api/ausencias/mias", A); esperar("al marcarla vista desaparece el aviso", r.data.sinVer === 0);
r = await llamar("POST", "/api/ausencias/cancelar/" + s3.id, A, {}); esperar("no se cancela una ya decidida (409)", r.status === 409);
r = await llamar("POST", "/api/ausencias/adjuntar/" + s3.id, A, { docs: [] }); esperar("no se adjunta a una rechazada (409)", r.status === 409);
r = await llamar("POST", "/api/ausencias/cancelar/" + s1.id, A, {}); esperar("Ana no puede cancelar la de Pedro (404)", r.status === 404);
r = await llamar("POST", "/api/ausencias/crear", A, { tipo: "retraso", desde: hoy, motivo: "Avería del coche" }); const s4 = r.data.solicitud; esperar("Ana avisa de un retraso", r.status === 201);
r = await llamar("POST", "/api/ausencias/cancelar/" + s4.id, A, { motivo: "Ya llego" }); esperar("Ana la cancela mientras está pendiente", r.status === 200 && r.data.solicitud.estado === "cancelada");
r = await llamar("GET", "/api/ausencias/gestion?estado=aprobada", G); esperar("filtro por estado", r.data.lista.length === 1 && r.data.lista[0].id === s1.id);
r = await llamar("GET", "/api/ausencias/gestion", G); esperar("hoy sigue ausente Pedro (aprobada)", r.data.hoyLista.length === 1 && r.data.hoyLista[0].estado === "aprobada");
r = await llamar("POST", "/api/ausencias/crear", G, { uid: uid.ana, tipo: "asuntos-propios", desde: suma(6), aprobar: true, retribuida: "no" }); esperar("gerente registra una ausencia a nombre de Ana ya aprobada", r.status === 201 && r.data.solicitud.estado === "aprobada" && r.data.solicitud.nombre === "Ana", est(r));

console.log("\n5) Libro y privacidad");
r = await llamar("GET", "/api/ausencias/libro", G); esperar("libro íntegro con anotaciones", r.status === 200 && r.data.integro && r.data.total >= 8, est(r));
esperar("el libro NO guarda el motivo ni la salud", !JSON.stringify(r.data).includes("Gripe") && !JSON.stringify(r.data).includes("fiebre"));
r = await llamar("GET", "/api/ausencias/libro", P); esperar("libro solo para el gerente", r.status === 403);
r = await llamar("GET", "/api/ausencias/mias", P); esperar("el trabajador no ve el nombre de otros ni datos del gerente", !JSON.stringify(r.data).includes("Ana") && r.data.solicitudes.every((x) => x.leida === undefined && x.uid === undefined));
const raw = await llamar("POST", "/api/ausencias/crear", P, { tipo: "vacaciones", desde: suma(50) }); 
const sinOrigen = await rutas.find((x) => x.re.test("/api/ausencias/crear")).fn(new Request(new URL("/api/ausencias/crear", ORIGEN), { method: "POST", headers: { "content-type": "application/json", origin: "https://malo.example", authorization: "Bearer " + P }, body: "{}" }), { ip: "10.0.0.9", geo: {}, params: {} });
esperar("origen ajeno bloqueado", sinOrigen.status === 403);

console.log(`\n${ok} bien, ${mal} mal`); if (mal) { console.log(fallos.join("\n")); process.exit(1); }
