// =====================================================================
// PRUEBA DE LA «FACTURA DE REPARACIÓN» (FORM-14) DE PRINCIPIO A FIN (30-09-2026)
// Ejecuta las funciones reales de netlify/functions con un almacén en memoria y recorre el panel con
// cada puesto: Gerente (contraseña), Lestter (puesto Gerente con PIN), Calidad, Recepción y Mecánico.
// Uso (en el ordenador del desarrollador, con bun):  bun tools/pruebas/e2e-factura.mjs
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
const { store } = await import(join(RAIZ, "netlify/lib/shared.mts"));
await store("seguridad").set("config/2fa-equipo", "0");
const lg = await llamar("POST", "/api/login", "", { clave: ENV.ADMIN_PASSWORD }); const G = lg.data.token;
const alta = async (nombre, usuario, rol) => { await llamar("POST", "/api/taller/equipo", G, { nombre, usuario, pin: "445566", rol }); const l = await llamar("POST", "/api/login", "", { usuario, pin: "445566" }); await llamar("POST", "/api/jornada/fichar", l.data.token, { accion: "entrada" }); return l.data.token; };
const R = await alta("Rosa", "rosa", "recepcion"), M = await alta("Pedro", "pedro", "mecanico"), C = await alta("Carla", "carla", "calidad");
const rc = await llamar("POST", "/api/taller/recepcion", G, { cliente: { nombre: "Ana Pérez", telefono: "643566098" }, vehiculo: { matricula: "1234ABC", marcaModelo: "Seat Ibiza" }, tipoEntrada: "reparacion" });
const tok = rc.data.orden.token, ruta = "/api/taller/fichas/" + tok;
let r;
console.log("\n1) Totales y validación");
const base = { cliente: { nombre: "Ana Pérez", doc: "12345678z", direccion: "C/ Sol 1", cp: "35600 Puerto del Rosario", telefono: "643566098", email: "ana@x.es" }, vehiculo: { matricula: "1234abc", marcaModelo: "Seat Ibiza", vin: "", kmEntrada: "120.500 km", kmSalida: "" }, descuentoGlobal: 0, igicTipo: "7", lineas: [{ tipo: "MO", desc: "Mano de obra frenos", cant: "2", precio: "40", dto: 0 }, { tipo: "REC", ref: "PF-1", desc: "Pastillas", cant: 1, precio: "33,33", dto: 10 }] };
r = await llamar("PUT", ruta + "/f5", G, base); esperar("gerente guarda el borrador", r.status === 200 && r.data.fichas.f5 && !r.data.fichas.f5.cerrada, est(r));
const f5 = r.data.fichas.f5;
esperar("matrícula y DNI en mayúsculas, km solo dígitos", f5.vehiculo.matricula === "1234ABC" && f5.cliente.doc === "12345678Z" && f5.vehiculo.kmEntrada === "120500");
esperar("coma decimal aceptada (33,33)", f5.lineas[1].precio === 33.33);
r = await llamar("PUT", ruta + "/f5", G, { ...base, cerrar: true, cliente: { ...base.cliente, nombre: "" } }); esperar("no emite sin cliente (400)", r.status === 400, est(r));
r = await llamar("PUT", ruta + "/f5", G, { ...base, cerrar: true, lineas: [] }); esperar("no emite sin líneas (400)", r.status === 400);
r = await llamar("PUT", ruta + "/f5", G, { ...base, cerrar: true, igicTipo: "" }); esperar("no emite sin tipo de IGIC (400)", r.status === 400);
r = await llamar("PUT", ruta + "/f5", G, { ...base, cerrar: true, lineas: [{ desc: "x", cant: 0, precio: 5 }] }); esperar("no emite con cantidad 0 (400)", r.status === 400);
console.log("\n2) Permisos");
r = await llamar("GET", ruta, M); esperar("el mecánico abre la orden", r.status === 200);
esperar("el mecánico NO recibe importes ni líneas de la factura", !r.data.fichas.f5 || (r.data.fichas.f5.lineas === undefined && r.data.fichas.f5.cliente === undefined), JSON.stringify(r.data.fichas.f5));
r = await llamar("PUT", ruta + "/f5", M, base); esperar("el mecánico NO edita la factura (403)", r.status === 403);
r = await llamar("PUT", ruta + "/f5", C, base); esperar("calidad NO edita la factura (403)", r.status === 403);
r = await llamar("GET", ruta, R); esperar("recepción ve la factura completa", r.status === 200 && r.data.fichas.f5.lineas.length === 2);
r = await llamar("GET", "/api/taller/fichas/" + tok, ""); esperar("sin sesión no se ve nada", r.status === 401 || r.status === 403, est(r));
console.log("\n3) Emisión y numeración");
r = await llamar("PUT", ruta + "/f5", R, { ...base, cerrar: true }); esperar("recepción emite", r.status === 200 && r.data.fichas.f5.cerrada, est(r));
const em = r.data.fichas.f5.emision, num = r.data.fichas.num;
esperar("la factura sale con serie propia F-AAAA-0001 (no con el nº de orden)", /^F-\d{4}-0001$/.test(em.numero) && em.numero !== num && /^[0-9A-F]{64}$/.test(em.huella), em.numero);
esperar("resumen de la orden marca la factura emitida sin importes", r.data.orden.fichas && r.data.orden.fichas.f5 && r.data.orden.fichas.f5.emitida === true && !/total|precio/.test(JSON.stringify(r.data.orden.fichas.f5)));
r = await llamar("PUT", ruta + "/f5", G, base); esperar("emitida no se puede editar (409)", r.status === 409);
r = await llamar("POST", ruta + "/reabrir", R, { ficha: "f5", motivo: "error de precio" }); esperar("recepción NO reabre (403)", r.status === 403);
r = await llamar("POST", ruta + "/reabrir", G, { ficha: "f5", motivo: "x" }); esperar("reabrir exige motivo (400)", r.status === 400);
r = await llamar("POST", ruta + "/reabrir", G, { ficha: "f5", motivo: "error de precio" }); esperar("gerente reabre con motivo", r.status === 200 && !r.data.fichas.f5.cerrada && r.data.fichas.f5.rect === 1, est(r));
r = await llamar("PUT", ruta + "/f5", G, { ...base, cerrar: true, lineas: [{ tipo: "MO", desc: "Mano de obra frenos", cant: 2, precio: 35, dto: 0 }] });
esperar("la nueva emisión sale como rectificativa R-AAAA-0001", r.status === 200 && /^R-\d{4}-0001$/.test(r.data.fichas.f5.emision.numero) && r.data.fichas.f5.emision.tipo === "R1", r.data.fichas?.f5?.emision?.numero);
const aud = r.data.fichas.audit.map((a) => a.accion + ":" + a.detalle).join(" | ");
esperar("la auditoría recoge emisión, reapertura y rectificativa con importes", /emitir-factura/.test(aud) && /reabrir/.test(aud) && /R-\d{4}-0001/.test(aud) && /74\.90/.test(aud), aud);
r = await llamar("GET", ruta, M); esperar("el mecánico ve en la auditoría que se emitió, pero sin importes", r.data.fichas.audit.some((a) => a.accion === "emitir-factura") && !/€/.test(JSON.stringify(r.data.fichas.audit.filter((a) => a.accion === "emitir-factura"))));
console.log("\n4) Importes (IGIC 7 %)");
const { totalesF5 } = await import(join(RAIZ, "netlify/lib/taller.mts"));
let t = totalesF5({ lineas: [{ cant: 2, precio: 40, dto: 0 }, { cant: 1, precio: 33.33, dto: 10 }], descuentoGlobal: 0, igicTipo: "7", igicOtro: 0 });
esperar("80 + 29,997→30,00 = 110,00 base; IGIC 7,70; total 117,70", t.suma === 110 && t.igic === 7.7 && t.total === 117.7, JSON.stringify(t));
t = totalesF5({ lineas: [{ cant: 1, precio: 100, dto: 0 }], descuentoGlobal: 20, igicTipo: "0", igicOtro: 0 }); esperar("exento con descuento global: 80,00", t.total === 80 && t.igic === 0);
t = totalesF5({ lineas: [{ cant: 1, precio: 100, dto: 0 }], descuentoGlobal: 500, igicTipo: "otro", igicOtro: 3 }); esperar("descuento no supera la suma; IGIC otro 3 %", t.total === 0);

console.log("\n5) Registro inalterable, listado para la gestoría y numeración");
r = await llamar("GET", "/api/taller/facturas", G); esperar("el gerente ve el listado (2 registros: F y R)", r.status === 200 && r.data.length === 2, est(r));
const fF = r.data.find((x) => x.serie === "F"), fR = r.data.find((x) => x.serie === "R");
esperar("la original queda «Rectificada» y la nueva «Rectificativa» que la cita", fF.estado === "Rectificada" && fR.estado === "Rectificativa" && fR.rectifica === fF.numero && /error de precio/.test(fR.motivo), JSON.stringify([fF.estado, fR.estado, fR.rectifica]));
esperar("la original conserva sus importes aunque se haya reabierto (117,70 €)", fF.total === 117.7 && fF.base === 110 && fF.cuota === 7.7);
esperar("la segunda registra encadenada a la primera", fR.prev === fF.huella && fR.seq === 2);
r = await llamar("GET", "/api/taller/facturas", R); esperar("recepción también ve el listado", r.status === 200);
r = await llamar("GET", "/api/taller/facturas", M); esperar("el mecánico NO (403)", r.status === 403);
r = await llamar("GET", "/api/taller/facturas/verificar", G); esperar("integridad correcta: cadena, huellas y numeración", r.data.ok === true && r.data.registros === 2 && r.data.fallos.length === 0, JSON.stringify(r.data));
r = await llamar("GET", "/api/taller/facturas/csv", G); esperar("CSV con cabecera, ; y coma decimal", r.status === 200 && typeof r.data === "string" && /^\uFEFF?Nº factura;Fecha expedición/.test(r.data) && /117,70/.test(r.data) && /Rectificada/.test(r.data), String(r.data).slice(0, 120));
const { store: st2 } = await import(join(RAIZ, "netlify/lib/shared.mts")); const regs = st2("facturas");
const x1 = await regs.get("reg/000001", { type: "json" }); x1.total = 1; await regs.setJSON("reg/000001", x1);
r = await llamar("GET", "/api/taller/facturas/verificar", G); esperar("si alguien manipula un registro, la comprobación lo detecta", r.data.ok === false && r.data.fallos.some((z) => /huella/.test(z)), JSON.stringify(r.data));
x1.total = 117.7; await regs.setJSON("reg/000001", x1);
console.log("\n6) Numeración sin duplicados con emisiones y recepciones simultáneas");
const rs = await Promise.all(Array.from({ length: 8 }, (_, i) => llamar("POST", "/api/taller/recepcion", G, { cliente: { nombre: "Cliente " + i, telefono: "600000000" }, vehiculo: { matricula: "77" + i + "ZZZ", marcaModelo: "Seat" }, tipoEntrada: "reparacion" })));
const nums = rs.map((x) => x.data?.fichas?.num); esperar("8 recepciones a la vez: 8 números distintos", new Set(nums).size === 8 && nums.every(Boolean), nums.join(","));
const emit = async (tok) => { await llamar("PUT", "/api/taller/fichas/" + tok + "/f5", G, { ...base, lineas: [{ tipo: "MO", desc: "x", cant: 1, precio: 10, dto: 0 }] }); return llamar("PUT", "/api/taller/fichas/" + tok + "/f5", G, { ...base, lineas: [{ tipo: "MO", desc: "x", cant: 1, precio: 10, dto: 0 }], cerrar: true }); };
const es = await Promise.all(rs.map((x) => emit(x.data.orden.token))); const fn = es.map((x) => x.data?.fichas?.f5?.emision?.numero);
esperar("8 facturas a la vez: números distintos y correlativos", new Set(fn).size === 8 && fn.every((n) => /^F-\d{4}-\d{4}$/.test(n)) && fn.map((n) => Number(n.slice(7))).sort((a, b) => a - b).join() === "2,3,4,5,6,7,8,9", fn.join(","));
r = await llamar("GET", "/api/taller/facturas/verificar", G); esperar("la cadena sigue íntegra tras las 8 emisiones simultáneas", r.data.ok === true && r.data.registros === 10, JSON.stringify(r.data));
console.log(`\n${ok} bien, ${mal} mal`); if (mal) { console.log(fallos.join("\n")); process.exit(1); }
