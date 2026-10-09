// =====================================================================
// PRUEBA «COCHE PROPIO SIN ENLAZAR → FINANZAS Y CAJA AL CÉNTIMO» (actualización 60)
// Ejecuta las funciones reales de netlify/functions con un almacén en memoria y recorre el panel con
// cada puesto: Gerente (contraseña), Lestter (puesto Gerente con PIN), Calidad, Recepción y Mecánico.
// Uso (en el ordenador del desarrollador, con bun):  bun tools/pruebas/e2e-propios-finanzas.mjs
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
const G = (await llamar("POST", "/api/login", "", { clave: ENV.ADMIN_PASSWORD })).data.token;
esperar("el gerente entra", !!G);
const personas = [
  { nombre: "Recepción Prueba", usuario: "recep1", pin: "112233", rol: "recepcion" },
  { nombre: "Pedro", usuario: "pedro", pin: "445566", rol: "mecanico" },
];
for (const p of personas) await llamar("POST", "/api/taller/equipo", G, p);
const tk = {};
for (const p of personas) { const l = await llamar("POST", "/api/login", "", { usuario: p.usuario, pin: p.pin }); tk[p.rol] = l.data.token; await llamar("POST", "/api/jornada/fichar", l.data.token, { accion: "entrada" }); }
const [R, M] = [tk.recepcion, tk.mecanico];
const FIN = async () => (await llamar("GET", "/api/finanzas/resumen?desde=2020-01-01&hasta=2099-12-31", G)).data;
const eur = (c) => (c / 100).toFixed(2);

console.log("\nA) Entra un coche dañado (sin enlazar a la web) y se le cargan piezas, horas y costes");
let r = await llamar("POST", "/api/vehiculos/config", G, { costeHora: "18,00" });
r = await llamar("POST", "/api/vehiculos/crear", R, { marca: "Seat", modelo: "Ibiza", matricula: "7777abc", danos: "Golpe trasero" });
esperar("recepción da de alta el coche dañado", r.status === 201, est(r)); const id = r.data.ficha.id, VP = "vp-" + id;
r = await llamar("POST", "/api/vehiculos/editar/" + id, G, { compra: "3.000,00", precioPrevisto: "6.000" });
esperar("compra 3.000,00 € y previsto 6.000,00 €", r.status === 200 && r.data.ficha.compra === 300000, est(r));
r = await llamar("POST", "/api/almacen/pieza", G, { nombre: "Paragolpes trasero", categoria: "Carrocería y pintura", unidad: "ud", minimo: "1", coste: "120", pvp: "200", stock: "0" }); const pid = r.data.pieza?.id;
r = await llamar("POST", "/api/almacen/entrada", G, { albaran: "A-9", proveedor: "Recambios Canarias", lineas: [{ pieza: pid, cantidad: "3", coste: "120" }] }); esperar("entrada de 3 piezas al inventario", r.status === 200, est(r));
r = await llamar("POST", "/api/almacen/imputar", M, { vehiculo: id, pieza: pid, cantidad: "1" }); esperar("mecánico carga 1 pieza al coche (stock 3→2)", r.status === 200 && r.data.stock === 2, est(r));
r = await llamar("POST", "/api/vehiculos/horas/" + id, M, { horas: "2,5", nota: "Chapa" }); esperar("2,5 h anotadas", r.status === 200, est(r));
r = await llamar("POST", "/api/vehiculos/coste/" + id, M, { concepto: "Pintura", importe: "150" }); const cid = r.data.ficha.costes[0].id;
r = await llamar("POST", "/api/vehiculos/decidir/" + id + "/" + cid, G, { decision: "aprobar" }); esperar("gerente aprueba 150 € de pintura", r.status === 200, est(r));
r = await llamar("GET", "/api/vehiculos/ficha/" + id, G);
esperar("la ficha suma 120 + 45 + 150 = 315,00 €", r.data.eco.reacondicionamiento === 31500, JSON.stringify(r.data.eco));
esperar("ficha: coste total 3.315,00 €", r.data.eco.total === 331500);

console.log("\nB) Finanzas ve el coche aunque NO esté en la web");
let fn = await FIN(); let st = fn.stock.find((x) => x.coche === VP);
esperar("sale en «En stock: lo invertido»", !!st, JSON.stringify(fn.stock));
esperar("stock: compra 3.000,00 € = la de la ficha", st && st.compra === 300000);
esperar("stock: reacondicionamiento 315,00 € = el de la ficha", st && st.reacondicionamiento === 31500);
esperar("stock: precio previsto 6.000,00 €", st && st.precio === 600000);
r = await llamar("POST", "/api/finanzas/coste/" + VP, G, { compra: "1" }); esperar("la compra no se cambia desde Finanzas (una sola cifra)", r.status === 409, est(r));
r = await llamar("GET", "/inventario.json", ""); esperar("sigue sin salir en la web pública", !/Ibiza|7777ABC|vp-/i.test(JSON.stringify(r.data)));
r = await llamar("GET", "/api/coches", ""); esperar("ni en /api/coches", !/7777ABC|vp-/i.test(JSON.stringify(r.data)));

console.log("\nC) La venta pasa por Finanzas y Caja antes de cerrar la ficha");
r = await llamar("POST", "/api/finanzas/venta/" + VP, G, { importe: "7490", costeCompra: "1", igicPct: "7", comprador: "Cliente Prueba", factura: "F-2026-0001" });
esperar("no se registra la venta de un coche que no está «Listo»", r.status === 409, est(r));
for (const fase of ["calidad", "listo"]) { r = await llamar("POST", "/api/vehiculos/fase/" + id, G, { fase }); esperar("fase → " + fase, r.status === 200, est(r)); }
r = await llamar("POST", "/api/vehiculos/fase/" + id, G, { fase: "vendido", base: "6.999" }); esperar("«Vendido» sin la venta en Finanzas: rechazado (aunque se pase un precio)", r.status === 409 && /Finanzas/.test(r.data.error), est(r));
r = await llamar("POST", "/api/finanzas/venta/" + VP, R, { importe: "7490", igicPct: "7" }); esperar("recepción no registra ventas (solo gerente)", r.status === 403, est(r));
r = await llamar("POST", "/api/finanzas/venta/" + VP, G, { importe: "7490", costeCompra: "1", igicPct: "7", comprador: "Cliente Prueba", factura: "F-2026-0001" });
esperar("gerente registra la venta (7.490,00 € con 7 % IGIC)", r.status === 200, est(r));
esperar("la compra de la venta es la de la FICHA (3.000,00 €), no el 1 € enviado", r.data.venta?.costeCompra === 300000, JSON.stringify(r.data.venta));
// Caja: abrir con 500,00 € en billetes de 100 y cobrar 1.000,00 € en efectivo; el resto por transferencia
r = await llamar("POST", "/api/caja/abrir", G, { desglose: { 10000: 5 } }); esperar("se abre la caja con 500,00 €", r.status === 200, est(r));
r = await llamar("POST", "/api/finanzas/cobro/venta/" + VP, G, { importe: "999", metodo: "efectivo" }); esperar("cobro en efectivo 999,00 € (entra en la caja)", r.status === 200 && !!r.data.cobro.cajaMov, est(r));
const movCaja = r.data.cobro?.cajaMov;
r = await llamar("POST", "/api/finanzas/cobro/venta/" + VP, G, { importe: "6491", metodo: "transferencia" }); esperar("cobro por transferencia 6.491,00 € (no toca la caja)", r.status === 200 && !r.data.cobro.cajaMov, est(r));
r = await llamar("POST", "/api/finanzas/cobro/venta/" + VP, G, { importe: "999", metodo: "efectivo" }); esperar("el mismo cobro dos veces seguidas: rechazado", r.status === 409, est(r));
r = await llamar("GET", "/api/caja/estado", G);
esperar("Caja teórica = 500,00 + 999,00 = 1.499,00 €", (r.data.teorico ?? r.data.calculo?.teorico) === 149900, JSON.stringify(r.data).slice(0, 300));

fn = await FIN();
const vv = fn.coches.find((x) => x.coche === VP);
esperar("Finanzas: aparece en ventas", !!vv, JSON.stringify(fn.coches));
esperar("venta: total 7.490,00 €, base 7.000,00 € (7.490 / 1,07)", vv && vv.precio === 749000 && vv.base === 700000, JSON.stringify(vv));
esperar("venta: compra 3.000,00 € y reacondicionamiento 315,00 € como en la ficha", vv && vv.compra === 300000 && vv.reacondicionamiento === 31500);
esperar("beneficio = 7.000,00 − 3.000,00 − 315,00 = 3.685,00 €", vv && vv.beneficio === 368500, vv && eur(vv.beneficio));
esperar("nada pendiente de cobrar (7.490,00 € cobrados)", vv && vv.pendiente === 0);
esperar("ya no sale en stock", !fn.stock.some((x) => x.coche === VP));
esperar("sin ventas por completar", fn.kpis.ventasSinDatos === 0, String(fn.kpis.ventasSinDatos));
const doc = fn.emitidas.find((d) => d.id === "v-" + VP);
esperar("factura emitida: base 7.000,00 + IGIC 490,00 = 7.490,00 €", doc && doc.base === 700000 && doc.impuesto === 49000 && doc.total === 749000, JSON.stringify(doc && { b: doc.base, i: doc.impuesto, t: doc.total }));
esperar("cobrado total = 7.490,00 € (efectivo + transferencia)", doc && doc.cobrado === 749000);
esperar("Finanzas: cobrado en EFECTIVO = 999,00 €", fn.porCanal.efectivo === 99900, String(fn.porCanal.efectivo));
esperar("Finanzas: cobrado por TRANSFERENCIA = 6.491,00 €", fn.porCanal.transferencia === 649100, String(fn.porCanal.transferencia));
esperar("Finanzas: el efectivo del cajón (999,00 €) coincide con el cobro apuntado en la Caja", fn.kpis.efectivoNeto === 99900, String(fn.kpis.efectivoNeto));
esperar("Finanzas: resultado de ventas = beneficio del coche", fn.venta.margen === 368500 && fn.venta.coches === 1, JSON.stringify(fn.venta));

console.log("\nD) La ficha se cierra con el MISMO precio que Finanzas");
r = await llamar("POST", "/api/vehiculos/fase/" + id, R, { fase: "vendido" }); esperar("recepción no marca vendido", r.status === 403, est(r));
r = await llamar("POST", "/api/vehiculos/fase/" + id, G, { fase: "vendido", nota: "Entregado" }); esperar("gerente marca vendido (la venta ya está en Finanzas)", r.status === 200 && r.data.ficha.fase === "vendido", est(r));
r = await llamar("GET", "/api/vehiculos/ficha/" + id, G);
esperar("ficha vendida: base 7.000,00 € = base de Finanzas", r.data.vendido?.base === 700000 && r.data.eco.beneficio === 368500, JSON.stringify(r.data.vendido) + " " + JSON.stringify(r.data.eco));
esperar("ficha y Finanzas dan el mismo beneficio (3.685,00 €)", r.data.eco.beneficio === (await FIN()).coches.find((x) => x.coche === VP).beneficio);
r = await llamar("POST", "/api/finanzas/venta/" + VP, G, { importe: "7490,00", igicPct: "7", comprador: "Cliente Prueba", factura: "F-2026-0001" });
esperar("editar la venta mantiene la ficha alineada", r.status === 200);
r = await llamar("POST", "/api/finanzas/venta/" + VP, G, { importe: "8025", igicPct: "7", comprador: "Cliente Prueba", factura: "F-2026-0001" });
r = await llamar("GET", "/api/vehiculos/ficha/" + id, G); esperar("cambiar el precio en Finanzas (8.025 €) cambia la base de la ficha (7.500,00 €)", r.data.vendido.base === 750000, JSON.stringify(r.data.vendido));
await llamar("POST", "/api/finanzas/venta/" + VP, G, { importe: "7490", igicPct: "7", comprador: "Cliente Prueba", factura: "F-2026-0001" });

console.log("\nE) Cierre de caja: lo contado = lo que dicen la Caja y Finanzas");
r = await llamar("POST", "/api/caja/cerrar", G, { desglose: { 10000: 14, 5000: 1, 2000: 2, 500: 1, 200: 2, 100: 1 } }); // 1.400 + 50 + 40 + 5 + 4 + 1 = 1.500 → sobra 1 €
esperar("1 € de diferencia: pide explicación (cierre ciego)", r.status === 409 && r.data.descuadre, est(r));
r = await llamar("POST", "/api/caja/cerrar", G, { desglose: { 10000: 14, 5000: 1, 2000: 2, 500: 1, 200: 2 } }); // 1.400+50+40+5+4 = 1.499
esperar("contado 1.499,00 € = teórico: cierra cuadrada", r.status === 200 && r.data.descuadre === false, est(r));
fn = await FIN();
esperar("tras cerrar, Finanzas no inventa descuadres", fn.kpis.descuadres === 0, String(fn.kpis.descuadres));

console.log("\nF) Reglas para que no se pierda nada");
r = await llamar("POST", "/api/vehiculos/crear", R, { marca: "Kia", modelo: "Rio", matricula: "8888xyz" }); const id2 = r.data.ficha.id;
const web = await llamar("POST", "/api/coches", G, { marca: "Kia", modelo: "Rio", version: "1.2", anio: 2016, km: 100000, combustible: "Gasolina", cambio: "Manual", precio: 5900, estado: "disponible", descripcion: "x", equipamiento: [], fotos: [] });
const cw = web.data?.id;
r = await llamar("POST", "/api/vehiculos/editar/" + id, G, { coche: cw }); esperar("un coche ya vendido con dinero en Finanzas no se enlaza después", r.status === 409, est(r));
r = await llamar("POST", "/api/vehiculos/editar/" + id2, G, { compra: "2.000", coche: cw }); esperar("un coche nuevo sí puede enlazarse a la web (flujo de siempre)", r.status === 200 && r.data.ficha.coche === cw, est(r));
fn = await FIN(); const e = fn.stock.find((x) => x.coche === cw);
esperar("enlazado: cuenta una sola vez, con el nombre del coche de la web", e && e.compra === 200000 && !fn.stock.some((x) => x.coche === "vp-" + id2), JSON.stringify(fn.stock));
r = await llamar("POST", "/api/finanzas/venta/vp-zzzzzzzzzzzz", G, { importe: "1.000", igicPct: "0" }); esperar("coche propio inexistente: 404", r.status === 404, est(r));
r = await llamar("POST", "/api/finanzas/venta/" + "vp-" + id2, G, { importe: "1.000", igicPct: "0" }); esperar("un coche enlazado no se vende como «vp-» (se vende desde la web)", r.status === 404, est(r));

console.log("\n" + "=".repeat(60) + `\nRESULTADO: ${ok} correctas · ${mal} fallidas`);
if (mal) { console.log("Fallos:"); for (const f of fallos) console.log(" - " + f); process.exit(1); }
