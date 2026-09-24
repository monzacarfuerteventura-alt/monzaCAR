import type { Config } from "@netlify/functions";
import { createHash } from "node:crypto";
import { store, json, mismoOrigen, type Car } from "../lib/shared.mts";
import { quien, hoyCanarias, leerConfig, type Quien } from "../lib/taller.mts";
import { str, cent, eur, esFoto, rid, ahora, listar as listarCaja, movsDe, turnoAbierto, crearMovimiento, leerMov, libro as libroCaja, s as sCaja, teorico, type Turno, type Mov } from "../lib/caja.mts";

/*
  GESTIÓN DE INGRESOS Y EGRESOS GLOBALES (solo el gerente)
  Ingresos automáticos, sin duplicar trabajo:
    · Taller: cada presupuesto ACEPTADO por el cliente es una factura emitida. Los cobros salen de
      «Registrar cobro» o, solos, de los cobros de caja que el equipo enlaza a esa orden.
    · Venta de coches: cada coche marcado «Vendido» es una venta. Con «Registrar la venta» se anotan
      precio final, coste de compra y forma de pago → beneficio estimado.
    · Caja: cobros en efectivo sin orden ni coche → «otros ingresos en efectivo».
  Egresos: gastos con categoría estricta + las salidas de caja (que se pueden clasificar).
  Cualquier cobro o pago en EFECTIVO pasa por la caja abierta (resta o suma al teórico del cierre ciego).
  Retiros del propietario e ingresos al banco no son gastos: son movimientos internos.
  Los descuadres de los cierres de caja entran en la cuenta como pérdida (falta) o sobrante.
  Importes en céntimos.

  GET  /api/finanzas/resumen?desde&hasta
  POST /api/finanzas/gasto · /gasto-anular/:id
  POST /api/finanzas/ingreso · /ingreso-anular/:id
  POST /api/finanzas/cobro/:tipo/:id        (tipo = taller | venta)
  POST /api/finanzas/venta/:coche           (datos de la venta)
  POST /api/finanzas/coste/:coche           (coste de compra de un coche en stock)
  POST /api/finanzas/clasificar/:movCaja    (clasifica una salida de caja registrada en la caja)
  GET  /api/finanzas/libro
*/

const f = () => store("finanzas");
export const GASTOS: [string, string, [string, string, string][]][] = [
  ["fijos", "Gastos fijos", [["alquiler", "Alquiler del local", "general"], ["nominas", "Nóminas de empleados", "general"], ["seguros", "Seguros", "general"], ["asesoria", "Asesoría / gestoría", "general"], ["autonomos", "Cuotas de autónomos / Seguridad Social", "general"]]],
  ["suministros", "Suministros y servicios", [["luz", "Luz", "general"], ["agua", "Agua", "general"], ["telefono", "Internet / teléfono", "general"], ["software", "Licencias de software", "general"], ["publicidad", "Publicidad / marketing", "general"]]],
  ["operativos", "Gastos operativos de taller y venta", [["recambios", "Compra de recambios / piezas", "taller"], ["itv", "ITV / tasas", "venta"], ["combustible", "Combustible", "general"], ["herramientas", "Herramientas", "taller"], ["reacondicionamiento", "Reacondicionamiento de coches (retoma / clientes)", "venta"], ["mantenimiento", "Mantenimiento del local", "general"]]],
];
const CAT = new Map(GASTOS.flatMap(([g, gt, l]) => l.map(([k, t, a]) => [k, { grupo: g, grupoTxt: gt, txt: t, area: a }] as const)));
const AREAS = ["taller", "venta", "general"];
const PAGOS = ["efectivo", "tarjeta", "transferencia", "domiciliacion"];
const COBROS = ["efectivo", "tarjeta", "transferencia", "financiacion"];
const TXT_M: Record<string, string> = { efectivo: "Efectivo (caja)", tarjeta: "Tarjeta / TPV", transferencia: "Transferencia", domiciliacion: "Domiciliación bancaria", financiacion: "Financiación" };
const fecha = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");
const diaDe = (iso: string) => hoyCanarias(new Date(iso));

type Adj = { key: string; tipo: "foto" | "pdf" } | null;
type Gasto = { id: string; fecha: string; categoria: string; area: string; proveedor: string; concepto: string; factura: string; base: number; impuestoPct: number; impuesto: number; total: number; metodo: string; adjunto: Adj; coche: string; cajaMov: string; t: string; por: string; anulado: null | { t: string; motivo: string } };
type Cobro = { id: string; fecha: string; metodo: string; importe: number; cajaMov: string; nota: string; t: string; por: string };
type Venta = { coche: string; fecha: string; importe: number; igicPct: number; comprador: string; factura: string; costeCompra: number; nota: string; cobros: Cobro[]; t: string };
type Ingreso = { id: string; fecha: string; concepto: string; cliente: string; factura: string; area: string; base: number; impuestoPct: number; impuesto: number; total: number; metodo: string; adjunto: Adj; cajaMov: string; t: string; anulado: null | { t: string; motivo: string } };

// ---------- libro de finanzas (encadenado, igual que el de caja) ----------
async function libro(q: Quien, accion: string, datos: Record<string, unknown>) {
  const head = ((await f().get("libro-cabeza", { type: "json" }).catch(() => null)) as { hash: string; n: number } | null) || { hash: "0".repeat(64), n: 0 };
  const e: any = { n: head.n + 1, t: ahora(), uid: q.uid, nombre: q.nombre, rol: q.rol, accion, datos, prev: head.hash };
  e.hash = createHash("sha256").update(JSON.stringify({ ...e, hash: undefined })).digest("hex");
  await f().setJSON(`log/${e.t}-${rid()}`, e); await f().setJSON("libro-cabeza", { hash: e.hash, n: e.n });
}
async function lista<T>(prefix: string) { const { blobs } = await f().list({ prefix }); return (await Promise.all(blobs.map((b) => f().get(b.key, { type: "json" }).catch(() => null)))).filter(Boolean) as T[]; }
const existeArchivo = async (k: string) => !!(await store("monzacar-fotos").get(k, { type: "arrayBuffer" }).catch(() => null));
function importes(b: any) {
  // Base + % de impuesto → total. Si solo viene el total, se desglosa con el %.
  const pct = Math.min(30, Math.max(0, Number(String(b.impuestoPct ?? "").replace(",", ".")) || 0));
  const vacio = (v: unknown) => String(v ?? "").trim() === "";
  let base = vacio(b.base) ? NaN : cent(b.base), total = vacio(b.total) ? NaN : cent(b.total);
  if (!Number.isFinite(base) && Number.isFinite(total)) base = Math.round(total / (1 + pct / 100));
  if (!Number.isFinite(base) || base <= 0) return null;
  const impuesto = Math.round(base * pct / 100);
  if (!Number.isFinite(total)) total = base + impuesto;
  if (Math.abs(total - (base + impuesto)) > 2) return { error: `El total no cuadra: base ${eur(base)} + ${String(pct).replace(".", ",")} % (${eur(impuesto)}) = ${eur(base + impuesto)}.` };
  return { base, impuestoPct: pct, impuesto, total: base + impuesto };
}

// Pago o cobro en efectivo → movimiento en la caja abierta (con las mismas reglas que la caja)
async function porCaja(q: Quien, datos: any, origin: string) {
  const r = await crearMovimiento(q, { ...datos, origen: "finanzas", responsable: datos.tipo === "egreso" ? q.uid : "" }, origin);
  if (r.error) return { error: r.status === 409 && /abrir la caja/.test(r.error) ? "Para pagar o cobrar en efectivo la caja tiene que estar abierta (Control de Caja → Abrir la caja). Si no pasa por la caja, elige otro método." : r.error };
  return { id: r.mov!.id };
}

async function resumen(desde: string, hasta: string) {
  const [ords, cars, gastos, ingresosM, ventas, costes, clasif, cobrosT, cfg] = await Promise.all([
    (async () => { const s = store("ordenes"); const { blobs } = await s.list({ prefix: "o/" }); return (await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })))).filter(Boolean) as any[]; })(),
    (async () => ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null) || [])(),
    lista<Gasto>("gasto/"), lista<Ingreso>("ingreso/"), lista<Venta>("venta/"), lista<any>("coste/"), lista<any>("clasif/"), lista<{ token: string; cobros: Cobro[] }>("cobro-taller/"), leerConfig(),
  ]);
  const turnos = await listarCaja<Turno>("t/");
  const movs = (await Promise.all(turnos.map((t) => movsDe(t.id)))).flat().filter((m) => !m.anulado);
  const usadosCaja = new Set<string>([...gastos.map((g) => g.cajaMov), ...ingresosM.map((i) => i.cajaMov), ...ventas.flatMap((v) => v.cobros.map((c) => c.cajaMov)), ...cobrosT.flatMap((c) => c.cobros.map((x) => x.cajaMov))].filter(Boolean));
  const dentro = (d: string) => d >= desde && d <= hasta;
  const costeDe = new Map(costes.map((c) => [c.coche, c]));
  const carDe = new Map(cars.map((c) => [c.id, c]));

  // ================= INGRESOS (facturas emitidas) + COBROS =================
  const emitidas: any[] = [], cobros: any[] = [];
  const addCobro = (c: any) => cobros.push(c);
  // Taller: presupuesto aceptado (o cobrado)
  for (const o of ords) {
    const p = o.presupuesto, reg = cobrosT.find((c) => c.token === o.token);
    const caja = movs.filter((m) => m.tipo === "ingreso" && m.orden === o.token && !usadosCaja.has(m.id));
    if (!(p && p.estado === "aceptado") && !reg?.cobros.length && !caja.length) continue;
    const lineas = p?.lineas || [], base0 = Math.round(lineas.reduce((a: number, l: any) => a + (Number(l.n) || 0) * (Number(l.p) || 0), 0) * 100), igic = p ? Number(p.igic) || 0 : cfg.igic;
    const cobrado = [...(reg?.cobros || []).map((c) => ({ ...c, origen: "finanzas" })), ...caja.map((m) => ({ id: m.id, fecha: diaDe(m.t), metodo: "efectivo", importe: m.importe, cajaMov: m.id, nota: "Cobrado en caja por " + m.porNombre, origen: "caja" }))];
    const totalAcept = p && p.estado === "aceptado" ? base0 + Math.round(base0 * igic / 100) : 0;
    const total = totalAcept || cobrado.reduce((a, c) => a + c.importe, 0);
    const base = totalAcept ? base0 : Math.round(total / (1 + igic / 100));
    const fechaDoc = p?.respuesta?.t && p.estado === "aceptado" ? diaDe(p.respuesta.t) : (cobrado.map((c) => c.fecha).sort()[0] || diaDe(o.creado));
    const doc = { id: "t-" + o.token, tipo: "taller", area: "taller", ref: o.token, fecha: fechaDoc, num: o.num || "", cliente: o.cliente?.nombre || "", concepto: `Taller · ${o.vehiculo?.coche || ""} ${(o.vehiculo?.matricula || "").toUpperCase()}`.trim(), base, impuestoPct: igic, impuesto: total - base, total, cobrado: cobrado.reduce((a, c) => a + c.importe, 0), cobros: cobrado, sinPresupuesto: !totalAcept };
    emitidas.push(doc); cobrado.forEach((c) => addCobro({ ...c, doc: doc.id, area: "taller", concepto: doc.concepto }));
  }
  // Venta de coches
  const vendidos = cars.filter((c) => c.estado === "vendido");
  const idsVenta = new Set([...vendidos.map((c) => c.id), ...ventas.map((v) => v.coche)]);
  const porCoche: any[] = [];
  for (const id of idsVenta) {
    const c = carDe.get(id), v = ventas.find((x) => x.coche === id), co = costeDe.get(id);
    const caja = movs.filter((m) => m.tipo === "ingreso" && m.coche === id && !usadosCaja.has(m.id));
    const total = v ? v.importe : Math.round((c?.precio || 0) * 100), igic = v ? v.igicPct : 0, base = Math.round(total / (1 + igic / 100));
    const compra = v?.costeCompra ?? co?.compra ?? 0;
    const reac = gastos.filter((g) => !g.anulado && g.coche === id).reduce((a, g) => a + g.base, 0);
    const cobrado = [...(v?.cobros || []).map((x) => ({ ...x, origen: "finanzas" })), ...caja.map((m) => ({ id: m.id, fecha: diaDe(m.t), metodo: "efectivo", importe: m.importe, cajaMov: m.id, nota: "Cobrado en caja por " + m.porNombre, origen: "caja" }))];
    const fechaDoc = v?.fecha || (c?.vendidoEn ? diaDe(c.vendidoEn) : diaDe(c?.actualizado || ahora()));
    const nombre = c ? `${c.marca} ${c.modelo} ${c.version || ""}`.trim() + (c.anio ? ` (${c.anio})` : "") : "Coche borrado del inventario";
    const doc = { id: "v-" + id, tipo: "venta", area: "venta", ref: id, fecha: fechaDoc, num: v?.factura || "", cliente: v?.comprador || "", concepto: "Venta · " + nombre, base, impuestoPct: igic, impuesto: total - base, total, cobrado: cobrado.reduce((a, x) => a + x.importe, 0), cobros: cobrado, estimado: !v, costeCompra: compra, reacondicionamiento: reac, beneficio: base - compra - reac, sinCoste: !compra };
    emitidas.push(doc); cobrado.forEach((x) => addCobro({ ...x, doc: doc.id, area: "venta", concepto: doc.concepto }));
    porCoche.push({ coche: id, nombre, fecha: fechaDoc, precio: total, base, compra, reacondicionamiento: reac, beneficio: base - compra - reac, estimado: !v, sinCoste: !compra, pendiente: total - doc.cobrado });
  }
  // Ingresos manuales
  for (const i of ingresosM.filter((x) => !x.anulado)) {
    const doc = { id: "i-" + i.id, tipo: "manual", area: i.area, ref: i.id, fecha: i.fecha, num: i.factura, cliente: i.cliente, concepto: i.concepto, base: i.base, impuestoPct: i.impuestoPct, impuesto: i.impuesto, total: i.total, cobrado: i.total, cobros: [{ id: i.id, fecha: i.fecha, metodo: i.metodo, importe: i.total, cajaMov: i.cajaMov, nota: "" }], adjunto: i.adjunto };
    emitidas.push(doc); addCobro({ ...doc.cobros[0], doc: doc.id, area: i.area, concepto: i.concepto });
  }
  // Cobros de caja sin orden ni coche
  for (const m of movs.filter((m) => m.tipo === "ingreso" && !m.orden && !m.coche && !usadosCaja.has(m.id) && m.origen !== "finanzas" && !m.ajuste)) {
    const doc = { id: "c-" + m.id, tipo: "caja", area: m.categoria === "taller" ? "taller" : m.categoria === "venta" || m.categoria === "senal" ? "venta" : "general", ref: m.id, fecha: diaDe(m.t), num: m.ref, cliente: "", concepto: "Caja · " + m.concepto, base: m.importe, impuestoPct: 0, impuesto: 0, total: m.importe, cobrado: m.importe, cobros: [{ id: m.id, fecha: diaDe(m.t), metodo: "efectivo", importe: m.importe, cajaMov: m.id, nota: "Registrado en caja por " + m.porNombre }], sinFactura: true };
    emitidas.push(doc); addCobro({ ...doc.cobros[0], doc: doc.id, area: doc.area, concepto: doc.concepto });
  }

  // ================= EGRESOS (facturas recibidas) + PAGOS =================
  const recibidas: any[] = [];
  for (const g of gastos.filter((x) => !x.anulado)) { const c = CAT.get(g.categoria); recibidas.push({ ...g, origen: "gasto", categoriaTxt: c?.txt || g.categoria, grupo: c?.grupo || "", cocheNombre: g.coche && carDe.get(g.coche) ? `${carDe.get(g.coche)!.marca} ${carDe.get(g.coche)!.modelo}` : "" }); }
  const internos: any[] = [];
  for (const m of movs.filter((m) => m.tipo === "egreso" && !usadosCaja.has(m.id) && m.origen !== "finanzas" && !m.ajuste)) {
    if (m.categoria === "propietario" || m.categoria === "banco") { internos.push({ id: m.id, fecha: diaDe(m.t), tipo: m.categoria, importe: m.importe, concepto: m.concepto, quien: m.responsableNombre }); continue; }
    const cl = clasif.find((x) => x.mov === m.id), c = cl ? CAT.get(cl.categoria) : null;
    const base = cl ? cl.base : m.importe, pct = cl ? cl.impuestoPct : 0;
    recibidas.push({ id: "caja-" + m.id, origen: "caja", fecha: diaDe(m.t), categoria: cl?.categoria || "sin-clasificar", categoriaTxt: c?.txt || "Sin clasificar (salida de caja)", grupo: c?.grupo || "", area: cl?.area || "general", proveedor: cl?.proveedor || "", concepto: m.concepto, factura: m.ref, base, impuestoPct: pct, impuesto: m.importe - base, total: m.importe, metodo: "efectivo", adjunto: m.foto ? { key: m.foto, tipo: m.foto.endsWith(".pdf") ? "pdf" : "foto" } : null, coche: m.coche || "", cajaMov: m.id, sinClasificar: !cl, sinTicket: m.sinTicket && !m.foto, por: m.porNombre });
  }
  // Descuadres de caja (cuenta de efectivo): lo que falta es pérdida; lo que sobra, ingreso
  const descuadres = turnos.filter((t) => t.cierre && t.cierre.diferencia).map((t) => ({ turno: t.id, fecha: t.fecha, importe: t.cierre!.diferencia, quien: t.cierre!.nombre, justificacion: t.cierre!.justificacion }))
    .concat(turnos.filter((t) => t.apertura.diferencia).map((t) => ({ turno: t.id, fecha: t.fecha, importe: t.apertura.diferencia, quien: t.apertura.nombre, justificacion: t.apertura.justificacion })));

  // ================= PERIODO =================
  const E = emitidas.filter((d) => dentro(d.fecha)), R = recibidas.filter((d) => dentro(d.fecha)), C = cobros.filter((c) => dentro(c.fecha)), D = descuadres.filter((d) => dentro(d.fecha)), I = internos.filter((x) => dentro(x.fecha));
  const sum = (l: any[], k = "total") => l.reduce((a, x) => a + (x[k] || 0), 0);
  const porCanal: Record<string, number> = Object.fromEntries(COBROS.map((k) => [k, 0])); for (const c of C) porCanal[c.metodo] = (porCanal[c.metodo] || 0) + c.importe;
  const porPago: Record<string, number> = Object.fromEntries(PAGOS.map((k) => [k, 0])); for (const g of R) porPago[g.metodo] = (porPago[g.metodo] || 0) + g.total;
  const descNeto = sum(D, "importe");
  // Gastos que son inversión en coches aún en stock (se imputan cuando el coche se vende)
  const esStock = (g: any) => g.coche && carDe.get(g.coche) && carDe.get(g.coche)!.estado !== "vendido" && !ventas.some((v) => v.coche === g.coche);
  const Rgasto = R.filter((g) => !esStock(g)), Rstock = R.filter(esStock);
  const cochesVendidosPeriodo = porCoche.filter((x) => dentro(x.fecha));
  // Rentabilidad por área (bases, sin impuestos)
  const ingT = sum(E.filter((d) => d.area === "taller"), "base"), ingV = sum(E.filter((d) => d.area === "venta" && d.tipo !== "venta"), "base");
  const gT = sum(Rgasto.filter((g) => g.area === "taller"), "base");
  const gVsinCoche = sum(Rgasto.filter((g) => g.area === "venta" && !g.coche), "base");
  const margenCoches = cochesVendidosPeriodo.reduce((a, x) => a + x.beneficio, 0);
  const gG = sum(Rgasto.filter((g) => g.area === "general"), "base") + Math.max(0, -descNeto) - Math.max(0, descNeto);
  const baseVentas = cochesVendidosPeriodo.reduce((a, x) => a + x.base, 0);
  const pesoT = ingT + baseVentas + ingV ? ingT / (ingT + baseVentas + ingV) : 0.5;
  const taller = { ingresos: ingT, gastosDirectos: gT, margen: ingT - gT, generales: Math.round(gG * pesoT), neto: ingT - gT - Math.round(gG * pesoT) };
  const venta = { ingresos: baseVentas + ingV, costeCoches: cochesVendidosPeriodo.reduce((a, x) => a + x.compra + x.reacondicionamiento, 0), gastosDirectos: gVsinCoche, margen: margenCoches + ingV - gVsinCoche, generales: gG - Math.round(gG * pesoT), neto: margenCoches + ingV - gVsinCoche - (gG - Math.round(gG * pesoT)), coches: cochesVendidosPeriodo.length };
  const porCategoria: Record<string, number> = {}; for (const g of R) porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.total;
  if (descNeto < 0) porCategoria["descuadres"] = -descNeto;
  const cobrado = sum(C, "importe"), pagado = sum(R);
  // Efectivo (cuenta de caja): teórico ahora
  const abierto = await turnoAbierto(); let efectivo: any;
  if (abierto) { const c = teorico(abierto, await movsDe(abierto.id)); efectivo = { abierta: true, teorico: c.teorico, desde: abierto.apertura.t, nombre: abierto.apertura.nombre }; }
  else { const u = (await sCaja().get("ultimo-cierre", { type: "json" }).catch(() => null)) as any; efectivo = { abierta: false, teorico: u?.contado || 0, desde: u?.t || "", nombre: u?.nombre || "" }; }
  // Pendientes (de siempre, no solo del periodo)
  const porCobrar = emitidas.filter((d) => d.total - d.cobrado > 0).map((d) => ({ id: d.id, tipo: d.tipo, ref: d.ref, fecha: d.fecha, num: d.num, cliente: d.cliente, concepto: d.concepto, total: d.total, pendiente: d.total - d.cobrado, estimado: d.estimado }));
  const stock = cars.filter((c) => c.estado !== "vendido").map((c) => ({ coche: c.id, nombre: `${c.marca} ${c.modelo} ${c.version || ""}`.trim(), precio: Math.round(c.precio * 100), compra: costeDe.get(c.id)?.compra || 0, reacondicionamiento: gastos.filter((g) => !g.anulado && g.coche === c.id).reduce((a, g) => a + g.base, 0) }));
  const dias = [...new Set([...E.map((d) => d.fecha), ...C.map((c) => c.fecha), ...R.map((g) => g.fecha)])].sort();
  const serie = dias.map((d) => ({ fecha: d, cobrado: sum(C.filter((c) => c.fecha === d), "importe"), pagado: sum(R.filter((g) => g.fecha === d)) }));
  return {
    desde, hasta,
    kpis: { cobrado, pagado, flujo: cobrado - pagado + descNeto, facturado: sum(E), facturadoBase: sum(E, "base"), gastosBase: sum(Rgasto, "base"), resultado: taller.neto + venta.neto, porCobrar: porCobrar.reduce((a, x) => a + x.pendiente, 0), descuadres: descNeto, invertidoStock: sum(Rstock, "base"), sinClasificar: recibidas.filter((g) => g.sinClasificar).length, ventasSinDatos: porCoche.filter((x) => x.estimado || x.sinCoste).length },
    porCanal, porPago, porCategoria, taller, venta, coches: porCoche.sort((a, b) => b.fecha.localeCompare(a.fecha)), stock, efectivo, internos: I, descuadres: D,
    emitidas: E.sort((a, b) => b.fecha.localeCompare(a.fecha)), recibidas: R.sort((a, b) => b.fecha.localeCompare(a.fecha)), cobros: C.sort((a, b) => b.fecha.localeCompare(a.fecha)),
    porCobrar: porCobrar.sort((a, b) => a.fecha.localeCompare(b.fecha)), sinClasificar: recibidas.filter((g) => g.sinClasificar), serie,
    categorias: GASTOS, metodos: TXT_M,
  };
}

export default async (req: Request) => {
  const url = new URL(req.url), p = url.pathname.split("/").filter(Boolean), accion = p[2] || "", id = p[3] || "", id2 = p[4] || "";
  if (req.method !== "GET" && !mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
  const q = await quien(req);
  if (!q) return json({ error: "No autorizado" }, 401);
  if (!q.admin) return json({ error: "Las finanzas solo las ve el gerente." }, 403);
  const body = req.method === "POST" ? ((await req.json().catch(() => ({}))) as any) : {};
  const origin = url.origin;

  if (accion === "resumen" && req.method === "GET") {
    const hoy = hoyCanarias(), desde = fecha(url.searchParams.get("desde")) || hoy.slice(0, 8) + "01", hasta = fecha(url.searchParams.get("hasta")) || hoy;
    if (desde > hasta) return json({ error: "Fechas al revés." }, 400);
    return json(await resumen(desde, hasta));
  }

  if (accion === "libro" && req.method === "GET") {
    const todas = (await lista<any>("log/")).filter((e) => e.hash && e.t).sort((a, b) => a.n - b.n);
    let prev = "0".repeat(64); const rotas: number[] = [];
    for (const e of todas) { const h = createHash("sha256").update(JSON.stringify({ ...e, hash: undefined })).digest("hex"); if (h !== e.hash || e.prev !== prev) rotas.push(e.n); prev = e.hash; }
    return json({ total: todas.length, integro: !rotas.length, rotas, entradas: todas.reverse().slice(0, 300) });
  }

  // ---------- alta de gasto ----------
  if (accion === "gasto" && req.method === "POST") {
    const cat = CAT.get(body.categoria); if (!cat) return json({ error: "Elige la categoría del gasto." }, 400);
    const d = fecha(body.fecha); if (!d || d > hoyCanarias()) return json({ error: "Pon la fecha del gasto (no puede ser futura)." }, 400);
    const proveedor = str(body.proveedor, 120), concepto = str(body.concepto, 300), factura = str(body.factura, 40);
    if (proveedor.length < 2) return json({ error: "Escribe el proveedor o acreedor." }, 400);
    if (concepto.length < 5) return json({ error: "Escribe el concepto con detalle." }, 400);
    const imp = importes(body); if (!imp) return json({ error: "Escribe la base imponible." }, 400); if ("error" in imp) return json({ error: imp.error }, 400);
    const metodo = PAGOS.includes(body.metodo) ? body.metodo : ""; if (!metodo) return json({ error: "Elige cómo se pagó." }, 400);
    if (!esFoto(body.adjunto) || !(await existeArchivo(body.adjunto))) return json({ error: "Adjunta la foto o el PDF de la factura o el recibo." }, 400);
    const area = AREAS.includes(body.area) ? body.area : cat.area;
    const coche = /^[a-z0-9-]{3,80}$/.test(String(body.coche || "")) ? String(body.coche) : "";
    const g: Gasto = { id: rid(), fecha: d, categoria: body.categoria, area, proveedor, concepto, factura, ...imp, metodo, adjunto: { key: body.adjunto, tipo: body.adjunto.endsWith(".pdf") ? "pdf" : "foto" }, coche, cajaMov: "", t: ahora(), por: q.nombre, anulado: null };
    if (metodo === "efectivo") {
      if (d !== hoyCanarias()) return json({ error: "Un pago en efectivo sale de la caja de hoy: pon la fecha de hoy (para días pasados, pide un ajuste en Control de Caja)." }, 400);
      const r = await porCaja(q, { tipo: "egreso", importe: String(g.total / 100), categoria: body.categoria === "recambios" || body.categoria === "herramientas" ? "compra" : "proveedor", concepto: `${proveedor} · ${concepto}`.slice(0, 200), ref: factura || "sin nº", foto: body.adjunto, coche }, origin);
      if (r.error) return json({ error: r.error }, 409);
      g.cajaMov = r.id!;
    }
    await f().setJSON("gasto/" + g.id, g);
    await libro(q, "gasto", { importe: g.total, categoria: g.categoria, proveedor, concepto, metodo, caja: !!g.cajaMov });
    return json({ ok: true, gasto: g }, 201);
  }
  if ((accion === "gasto-anular" || accion === "ingreso-anular") && req.method === "POST") {
    const k = (accion === "gasto-anular" ? "gasto/" : "ingreso/") + id;
    const x = (await f().get(k, { type: "json" }).catch(() => null)) as Gasto | Ingreso | null; if (!x) return json({ error: "No existe." }, 404);
    if (x.anulado) return json({ error: "Ya está anulado." }, 409);
    const motivo = str(body.motivo, 300); if (motivo.length < 5) return json({ error: "Escribe el motivo de la anulación." }, 400);
    x.anulado = { t: ahora(), motivo }; await f().setJSON(k, x);
    if (x.cajaMov) { const r = await leerMov(x.cajaMov); if (r && !r.m.anulado) { r.m.anulado = { t: ahora(), motivo: "Anulado desde Finanzas: " + motivo }; await sCaja().setJSON(r.key, r.m); await libroCaja(q, "anulacion", { importe: r.m.importe, tipo: r.m.tipo, concepto: r.m.concepto, motivo: "Finanzas: " + motivo }, r.m.turno, r.m.id); } }
    await libro(q, accion, { id, importe: x.total, motivo });
    return json({ ok: true });
  }

  // ---------- ingreso manual (otros ingresos con factura) ----------
  if (accion === "ingreso" && req.method === "POST") {
    const d = fecha(body.fecha); if (!d || d > hoyCanarias()) return json({ error: "Pon la fecha." }, 400);
    const concepto = str(body.concepto, 300); if (concepto.length < 3) return json({ error: "Escribe el concepto." }, 400);
    const imp = importes(body); if (!imp) return json({ error: "Escribe la base imponible." }, 400); if ("error" in imp) return json({ error: imp.error }, 400);
    const metodo = COBROS.includes(body.metodo) ? body.metodo : ""; if (!metodo) return json({ error: "Elige cómo se cobró." }, 400);
    const i: Ingreso = { id: rid(), fecha: d, concepto, cliente: str(body.cliente, 120), factura: str(body.factura, 40), area: AREAS.includes(body.area) ? body.area : "general", ...imp, metodo, adjunto: esFoto(body.adjunto) ? { key: body.adjunto, tipo: body.adjunto.endsWith(".pdf") ? "pdf" : "foto" } : null, cajaMov: "", t: ahora(), anulado: null };
    if (metodo === "efectivo") {
      if (d !== hoyCanarias()) return json({ error: "Un cobro en efectivo entra en la caja de hoy: pon la fecha de hoy." }, 400);
      const r = await porCaja(q, { tipo: "ingreso", importe: String(i.total / 100), categoria: i.area === "taller" ? "taller" : i.area === "venta" ? "venta" : "otro", concepto, ref: i.factura }, origin);
      if (r.error) return json({ error: r.error }, 409); i.cajaMov = r.id!;
    }
    await f().setJSON("ingreso/" + i.id, i);
    await libro(q, "ingreso", { importe: i.total, concepto, metodo });
    return json({ ok: true, ingreso: i }, 201);
  }

  // ---------- cobro de una orden de taller o de una venta ----------
  if (accion === "cobro" && req.method === "POST" && (id === "taller" || id === "venta")) {
    const metodo = COBROS.includes(body.metodo) ? body.metodo : ""; if (!metodo) return json({ error: "Elige cómo ha pagado." }, 400);
    const importe = cent(body.importe); if (!Number.isFinite(importe) || importe <= 0) return json({ error: "Escribe el importe cobrado." }, 400);
    const d = fecha(body.fecha) || hoyCanarias(); if (d > hoyCanarias()) return json({ error: "La fecha no puede ser futura." }, 400);
    const c: Cobro = { id: rid(), fecha: d, metodo, importe, cajaMov: "", nota: str(body.nota, 200), t: ahora(), por: q.nombre };
    let concepto = "", ref = "";
    if (id === "taller") {
      if (!/^[A-Za-z0-9]{16}$/.test(id2)) return json({ error: "Orden no válida." }, 400);
      const o = (await store("ordenes").get("o/" + id2, { type: "json" })) as any; if (!o) return json({ error: "Orden no encontrada." }, 404);
      concepto = `Cobro taller ${o.num || ""} · ${o.vehiculo?.coche || ""} ${(o.vehiculo?.matricula || "").toUpperCase()}`.trim(); ref = o.num || "";
      if (metodo === "efectivo") { if (d !== hoyCanarias()) return json({ error: "Un cobro en efectivo entra en la caja de hoy: pon la fecha de hoy." }, 400); const r = await porCaja(q, { tipo: "ingreso", importe: String(importe / 100), categoria: "taller", concepto, ref, orden: id2 }, origin); if (r.error) return json({ error: r.error }, 409); c.cajaMov = r.id!; }
      const reg = ((await f().get("cobro-taller/" + id2, { type: "json" }).catch(() => null)) as any) || { token: id2, cobros: [] };
      reg.cobros.push(c); await f().setJSON("cobro-taller/" + id2, reg);
    } else {
      const cars = ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null) || [], car = cars.find((x) => x.id === id2);
      const v = (await f().get("venta/" + id2, { type: "json" }).catch(() => null)) as Venta | null;
      if (!v) return json({ error: "Primero registra los datos de la venta de este coche." }, 409);
      concepto = `Cobro venta · ${car ? car.marca + " " + car.modelo : id2}`; ref = v.factura;
      if (metodo === "efectivo") {
        if (d !== hoyCanarias()) return json({ error: "Un cobro en efectivo entra en la caja de hoy: pon la fecha de hoy." }, 400);
        const r = await porCaja(q, { tipo: "ingreso", importe: String(importe / 100), categoria: "venta", concepto, ref, coche: id2 }, origin); if (r.error) return json({ error: r.error }, 409); c.cajaMov = r.id!;
      }
      v.cobros.push(c); await f().setJSON("venta/" + id2, v);
    }
    await libro(q, "cobro-" + id, { ref: id2, importe, metodo, caja: !!c.cajaMov });
    return json({ ok: true, cobro: c, avisoEfectivo: metodo === "efectivo" && importe >= 100000 });
  }

  // ---------- datos de la venta de un coche ----------
  if (accion === "venta" && req.method === "POST") {
    const cars = ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null) || [], car = cars.find((x) => x.id === id);
    if (!car) return json({ error: "Coche no encontrado." }, 404);
    const importe = cent(body.importe); if (!Number.isFinite(importe) || importe <= 0) return json({ error: "Escribe el precio final de venta." }, 400);
    const costeCompra = cent(body.costeCompra); if (!Number.isFinite(costeCompra) || costeCompra < 0) return json({ error: "Escribe lo que costó comprar el coche (0 si no lo sabes aún)." }, 400);
    const d = fecha(body.fecha) || hoyCanarias(); if (d > hoyCanarias()) return json({ error: "La fecha no puede ser futura." }, 400);
    const prev = (await f().get("venta/" + id, { type: "json" }).catch(() => null)) as Venta | null;
    const v: Venta = { coche: id, fecha: d, importe, igicPct: Math.min(30, Math.max(0, Number(String(body.igicPct ?? 0).replace(",", ".")) || 0)), comprador: str(body.comprador, 120), factura: str(body.factura, 40), costeCompra, nota: str(body.nota, 300), cobros: prev?.cobros || [], t: ahora() };
    await f().setJSON("venta/" + id, v);
    await f().setJSON("coste/" + id, { coche: id, compra: costeCompra, t: ahora() });
    await libro(q, prev ? "venta-editada" : "venta", { coche: `${car.marca} ${car.modelo}`, importe, costeCompra });
    return json({ ok: true, venta: v });
  }
  if (accion === "coste" && req.method === "POST") {
    const compra = cent(body.compra); if (!Number.isFinite(compra) || compra < 0) return json({ error: "Escribe el coste de compra." }, 400);
    await f().setJSON("coste/" + id, { coche: id, compra, proveedor: str(body.proveedor, 120), t: ahora() });
    await libro(q, "coste-compra", { coche: id, compra });
    return json({ ok: true });
  }

  // ---------- clasificar una salida registrada en la caja ----------
  if (accion === "clasificar" && req.method === "POST") {
    const r = await leerMov(id); if (!r || r.m.tipo !== "egreso") return json({ error: "Salida de caja no encontrada." }, 404);
    const cat = CAT.get(body.categoria); if (!cat) return json({ error: "Elige la categoría." }, 400);
    const pct = Math.min(30, Math.max(0, Number(String(body.impuestoPct ?? 0).replace(",", ".")) || 0));
    const base = Math.round(r.m.importe / (1 + pct / 100));
    await f().setJSON("clasif/" + id, { mov: id, categoria: body.categoria, area: AREAS.includes(body.area) ? body.area : cat.area, proveedor: str(body.proveedor, 120), impuestoPct: pct, base, t: ahora() });
    await libro(q, "clasificar", { mov: id, categoria: body.categoria, importe: r.m.importe });
    return json({ ok: true });
  }

  return json({ error: "No encontrado" }, 404);
};

export const config: Config = {
  path: ["/api/finanzas/:accion", "/api/finanzas/:accion/:id", "/api/finanzas/:accion/:id/:sub"],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
