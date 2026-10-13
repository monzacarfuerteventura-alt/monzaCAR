import type { Config } from "@netlify/functions";
import { createHash } from "node:crypto";
import { store, json, mismoOrigen, type Car } from "../lib/shared.mts";
import { quien, hoyCanarias, leerConfig, leerEquipo, tstore, tramos, totalesF5, type Quien, type F3, type Config as ConfigTaller } from "../lib/taller.mts";
import { listarA, type MovPieza } from "../lib/almacen.mts";
import { costesPorCoche, propiosSinEnlazar, esIdPropio, leerFicha, guardarFicha } from "../lib/vehiculos.mts";
import { todosLosRegistros } from "../lib/facturas.mts";
import { anotarSeguro } from "../lib/libro.mts";
import { volcar } from "../lib/copia.mts";
import { str, cent, eur, esFoto, rid, ahora, listar as listarCaja, turnoAbierto, crearMovimiento, leerMov, libro as libroCaja, s as sCaja, teorico, type Turno, type Mov } from "../lib/caja.mts";

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
  POST /api/finanzas/cobro-anular/:tipo/:id {cobro, motivo}   (Actualización 46: anula un cobro; no se borra)
  POST /api/finanzas/venta/:coche           (datos de la venta)
  POST /api/finanzas/coste/:coche           (coste de compra de un coche en stock)
  POST /api/finanzas/clasificar/:movCaja    (clasifica una salida de caja registrada en la caja)
  POST /api/finanzas/reiniciar {confirmar:"EMPEZAR DE CERO"}   (Actualización 74: copia de seguridad y deja Finanzas y Caja a cero; solo gerente)
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
// Fecha real del calendario (rechaza 2026-02-31)
const fecha = (v: unknown) => { const t = String(v ?? ""); if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return ""; const d = new Date(t + "T12:00:00Z"); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === t ? t : ""; };
const diaDe = (iso: string) => hoyCanarias(new Date(iso));

type Adj = { key: string; tipo: "foto" | "pdf" } | null;
type Gasto = { id: string; fecha: string; categoria: string; area: string; proveedor: string; concepto: string; factura: string; base: number; impuestoPct: number; impuesto: number; total: number; metodo: string; adjunto: Adj; coche: string; cajaMov: string; t: string; por: string; anulado: null | { t: string; motivo: string } };
type Cobro = { id: string; fecha: string; metodo: string; importe: number; cajaMov: string; nota: string; t: string; por: string; anulado?: null | { t: string; motivo: string } };
type Venta = { coche: string; fecha: string; importe: number; igicPct: number; comprador: string; factura: string; costeCompra: number; nota: string; cobros: Cobro[]; t: string };
type Ingreso = { id: string; fecha: string; concepto: string; cliente: string; factura: string; area: string; base: number; impuestoPct: number; impuesto: number; total: number; metodo: string; adjunto: Adj; cajaMov: string; t: string; anulado: null | { t: string; motivo: string } };

// ---------- libro de finanzas (encadenado, igual que el de caja) ----------
async function libro(q: Quien, accion: string, datos: Record<string, unknown>) {
  await anotarSeguro(f(), (head) => ({ n: head.n + 1, t: ahora(), uid: q.uid, nombre: q.nombre, rol: q.rol, accion, datos, prev: head.hash }));
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

// Actualización 46 · antiduplicados: el mismo apunte (mismo importe y mismo concepto) repetido en menos de 2 minutos NO se guarda otra vez
const RECIENTE = 120_000, hace = (iso: string) => Date.now() - Date.parse(iso || "");
const DUP_COBRO = "Este mismo cobro (mismo importe y forma de pago) ya se registró hace un momento. No se ha duplicado. Si de verdad es un segundo cobro, espera 2 minutos o cambia el importe.";

// Pago o cobro en efectivo → movimiento en la caja abierta (con las mismas reglas que la caja)
async function porCaja(q: Quien, datos: any, origin: string) {
  const r = await crearMovimiento(q, { ...datos, origen: "finanzas", responsable: datos.tipo === "egreso" ? q.uid : "" }, origin);
  if (r.error) return { error: r.status === 409 && /abrir la caja/.test(r.error) ? "Para pagar o cobrar en efectivo la caja tiene que estar abierta (Control de Caja → Abrir la caja). Si no pasa por la caja, elige otro método." : r.error };
  return { id: r.mov!.id };
}

// ---------- Actualización 74 · EMPEZAR DE CERO (solo Finanzas y Caja) ----------
// Antes de borrar nada se guarda una copia completa de «finanzas» y «caja» en copias/reinicio/<fecha>/ (la limpieza automática de copias solo toca «diaria/»).
// Se borra: gastos, ingresos, ventas y cobros de Finanzas, clasificaciones de salidas de caja, facturas de proveedor, banco, asientos manuales, liquidaciones de incentivos y TODA la caja
// (turnos, movimientos, alertas y último cierre). NO se borra: coches, CRM, órdenes del taller, inventario, equipo, costes de compra de los coches en stock ni los libros encadenados. SÍ se vacía el registro de facturas (eran de prueba) para que la numeración real empiece en 0001.
// Las órdenes de taller anteriores al reinicio dejan de contar en Finanzas (ajustes.reinicio), pero siguen en Taller.
async function borrarPrefijos(s: ReturnType<typeof store>, prefijos: string[], claves: string[] = []) {
  let n = 0;
  for (const prefix of prefijos) {
    const { blobs } = await s.list({ prefix });
    for (let i = 0; i < blobs.length; i += 25) await Promise.all(blobs.slice(i, i + 25).map((b) => s.delete(b.key)));
    n += blobs.length;
  }
  for (const k of claves) if ((await s.get(k).catch(() => null)) != null) { await s.delete(k); n++; }
  return n;
}
async function reiniciarFinanzas(q: Quien) {
  const t = ahora(), carpeta = "reinicio/" + t.replace(/[:.]/g, "-"), copias = store("copias"), cuenta: Record<string, number> = {};
  for (const nombre of ["finanzas", "caja", "facturas"]) await copias.set(`${carpeta}/${nombre}.json`, JSON.stringify(await volcar(nombre))); // si esto falla NO se borra nada
  const prev = await leerAjustes(); await f().setJSON("ajustes", { ...prev, reinicio: t });
  cuenta.finanzas = await borrarPrefijos(f(), ["gasto/", "ingreso/", "venta/", "cobro-taller/", "clasif/", "erp/fprov/", "erp/banco/", "erp/conta/", "erp/inc/p/"]);
  cuenta.caja = await borrarPrefijos(sCaja(), ["t/", "m/", "alerta/"], ["abierto", "ultimo-cierre", "intentos-apertura"]);
  // Registro de facturas (todas eran de prueba): se vacía para que la primera factura REAL sea la F-AAAA-0001
  cuenta.facturas = await borrarPrefijos(store("facturas"), [""]);
  // los albaranes que estaban ligados a una factura de proveedor borrada vuelven a «sin facturar»
  const { blobs } = await f().list({ prefix: "erp/alb/" });
  for (const b of blobs) { const a = (await f().get(b.key, { type: "json" }).catch(() => null)) as any; if (a && a.facturaId) { a.facturaId = ""; await f().setJSON(b.key, a); } }
  await libro(q, "reinicio", { copia: carpeta, borradosFinanzas: cuenta.finanzas, borradosCaja: cuenta.caja, borradasFacturas: cuenta.facturas });
  await libroCaja(q, "reinicio", { copia: carpeta, borrados: cuenta.caja });
  return { t, copia: carpeta, borrados: cuenta };
}

// ---------- Actualización 62 · resultado de cada coche de taller entregado ----------
// Precio final (con IGIC) → base sin IGIC (el IGIC no es tuyo) → piezas del inventario a su coste → mano de obra por trabajador → beneficio.
// Los fijos del taller (por defecto 9.000 €/mes en 20 días laborables = 450 €/día) se restan cada día laborable para saber si «hoy hubo pérdidas».
type Ajustes = { descontarMO: boolean; fijosMes: number; diasLab: number; reinicio?: string }; // reinicio: instante del último «Empezar de cero» (Act. 74): las órdenes creadas antes no cuentan en Finanzas
const AJUSTES_DEF: Ajustes = { descontarMO: true, fijosMes: 900000, diasLab: 20 };
async function leerAjustes(): Promise<Ajustes> { const a = (await f().get("ajustes", { type: "json" }).catch(() => null)) as Partial<Ajustes> | null; return { ...AJUSTES_DEF, ...(a || {}) }; }
const esLaborable = (d: string) => { const w = new Date(d + "T12:00:00Z").getUTCDay(); return w >= 1 && w <= 5; };
const laborablesHasta = (d: string) => { let n = 0; for (let i = 1; i <= Number(d.slice(8)); i++) if (esLaborable(d.slice(0, 8) + String(i).padStart(2, "0"))) n++; return n; };
const fijosDia = (a: Ajustes) => Math.round(a.fijosMes / a.diasLab);

function piezasDeOrden(movs: MovPieza[], token: string) {
  const det: { nombre: string; sku: string; cantidad: number; coste: number; sinCoste: boolean }[] = []; let coste = 0;
  for (const m of movs) {
    if (m.tipo !== "salida" || m.orden !== token) continue;
    const net = Math.round((-m.cantidad - (m.devuelto || 0)) * 1000) / 1000; if (net <= 0) continue; // lo devuelto al estante no cuesta
    const c = Math.round(net * (m.coste || 0)); coste += c; det.push({ nombre: m.nombre, sku: m.sku, cantidad: net, coste: c, sinCoste: !m.coste });
  }
  return { coste, det };
}
// Horas netas trabajadas por cada persona (FORM-04) × tarifa. La suma es EXACTAMENTE la mano de obra que enseña FORM-04.
function manoObraDe(f3: F3 | null, cfg: ConfigTaller, nombre: (u: string) => string) {
  const tarifa = f3?.tarifa || cfg.tarifa;
  if (!f3 || !(f3.eventos || []).length) return { coste: 0, minutos: 0, tarifa, trabajadores: [] as { nombre: string; minutos: number; coste: number }[], sinHoras: true };
  const ultimo = Math.max(...f3.eventos.map((e) => Date.parse(e.t)));
  const ms = new Map<string, number>();
  for (const x of tramos(f3.eventos, ultimo).filter((x) => x.trabajo)) ms.set(x.por, (ms.get(x.por) || 0) + (x.fin - x.ini));
  const filas = [...ms.entries()].sort((a, b) => b[1] - a[1]);
  const minutos = Math.round(filas.reduce((a, [, v]) => a + v, 0) / 6e4), coste = Math.round((minutos / 60) * tarifa * 100);
  const trab = filas.map(([u, v]) => ({ nombre: nombre(u), minutos: Math.round(v / 6e4), coste: 0 }));
  if (trab.length) trab[0].minutos += minutos - trab.reduce((a, t) => a + t.minutos, 0);
  for (const t of trab) t.coste = Math.round((t.minutos / 60) * tarifa * 100);
  if (trab.length) trab[0].coste += coste - trab.reduce((a, t) => a + t.coste, 0);
  return { coste, minutos, tarifa, trabajadores: trab, sinHoras: !minutos };
}

// Act. 74 · De lo facturado (FORM-06) cuánto es de PIEZAS (REC), de MANO DE OBRA (MO) y de OTROS, ya con el descuento global repartido. Céntimos.
function desgloseF5(f5: any) {
  if (!f5 || !Array.isArray(f5.lineas) || !f5.lineas.length) return null;
  const t = totalesF5(f5), baseC = Math.round(t.base * 100), factor = t.suma > 0 ? t.base / t.suma : 1;
  const g = { REC: 0, MO: 0, OTRO: 0 }; const piezas: { ref: string; desc: string; cant: number; precio: number; importe: number }[] = [];
  f5.lineas.forEach((l: any, i: number) => {
    const imp = Math.round((t.importes[i] || 0) * factor * 100), k = l.tipo === "REC" || l.tipo === "MO" ? l.tipo : "OTRO";
    g[k as "REC" | "MO" | "OTRO"] += imp;
    if (k === "REC") piezas.push({ ref: String(l.ref || "").slice(0, 40), desc: String(l.desc || "").slice(0, 120), cant: Number(l.cant) || 0, precio: Math.round((Number(l.precio) || 0) * 100), importe: imp });
  });
  const resto = baseC - (g.REC + g.MO + g.OTRO); // ajuste de céntimos por los redondeos
  if (resto) { const k = (Object.entries(g).sort((a, b) => b[1] - a[1])[0][0]) as "REC" | "MO" | "OTRO"; g[k] += resto; if (k === "REC" && piezas.length) piezas[0].importe += resto; }
  return { piezas: g.REC, manoObra: g.MO, otros: g.OTRO, lineasPiezas: piezas, descuentoGlobal: Math.round(t.dto * 100) };
}

// Caja para el resumen: turnos, movimientos de cada turno (mismo orden que movsDe: por hora) y caja abierta. Un solo listado de «m/» en vez de uno por turno.
async function cajaParaResumen() {
  const sc = sCaja();
  const [turnos, porTurno, abierto, ultimoCierre] = await Promise.all([
    listarCaja<Turno>("t/"),
    (async () => {
      const { blobs } = await sc.list({ prefix: "m/" });
      const vals = await Promise.all(blobs.map((b) => sc.get(b.key, { type: "json" }).catch(() => null)));
      const de = new Map<string, Mov[]>();
      blobs.forEach((b, i) => { const m = vals[i] as Mov | null; if (!m) return; const t = b.key.split("/")[1] || ""; (de.get(t) || de.set(t, []).get(t)!).push(m); });
      for (const l of de.values()) l.sort((a, b) => a.t.localeCompare(b.t));
      return de;
    })(),
    turnoAbierto(),
    sc.get("ultimo-cierre", { type: "json" }).catch(() => null) as Promise<any>,
  ]);
  return { turnos, movsDeTurno: (id: string) => porTurno.get(id) || [], abierto, ultimoCierre };
}

async function resumen(desde: string, hasta: string) {
  // Act. 73 · Las lecturas van en DOS tandas en paralelo. Antes iban en cadena (órdenes → facturas → turnos → movimientos de cada turno →
  // ajustes → equipo → almacén → fichas → caja): hasta 16 viajes al almacén uno detrás de otro; ahora 4. Los cálculos de abajo no cambian.
  // Tanda 1 (la de siempre) + ajustes y equipo:
  const [ordsTodas, carsWeb, gastos, ingresosM, ventas, costes, clasif, cobrosT, cfg, propios, sinEnlazar, aju, equipoT] = await Promise.all([
    (async () => { const s = store("ordenes"); const { blobs } = await s.list({ prefix: "o/" }); return (await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })))).filter(Boolean) as any[]; })(),
    (async () => ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null) || [])(),
    lista<Gasto>("gasto/"), lista<Ingreso>("ingreso/"), lista<Venta>("venta/"), lista<any>("coste/"), lista<any>("clasif/"), lista<{ token: string; cobros: Cobro[] }>("cobro-taller/"), leerConfig(), costesPorCoche(), propiosSinEnlazar(),
    leerAjustes(), leerEquipo().catch(() => []),
  ]);
  // Act. 74 · «Empezar de cero»: las órdenes de taller creadas ANTES del reinicio (datos de prueba) no cuentan en Finanzas; siguen existiendo en Taller.
  const ords = aju.reinicio ? ordsTodas.filter((o) => String(o.creado || "") >= aju.reinicio!) : ordsTodas;
  // Tanda 2: facturas emitidas, caja, movimientos del almacén y las fichas de los coches de taller entregados en el periodo (o en el mes en curso)
  const hoyD = hoyCanarias(), mesIni = hoyD.slice(0, 8) + "01";
  const desdeR = desde < mesIni ? desde : mesIni, hastaR = hasta > hoyD ? hasta : hoyD;
  const entregadasR = ords.filter((o) => o.estado === "entregado").map((o) => {
    const pe = [...(o.pasos || [])].reverse().find((x: any) => x.estado === "entregado"), dia = pe ? diaDe(pe.t) : diaDe(o.actualizado || o.creado);
    return { o, dia };
  }).filter((x) => !(x.dia < desdeR || x.dia > hastaR));
  const [registros, cajaR, movsAlm, fichasEnt] = await Promise.all([
    todosLosRegistros().catch(() => []) as Promise<any[]>, cajaParaResumen(), listarA<MovPieza>("m/").catch(() => [] as MovPieza[]),
    Promise.all(entregadasR.map((x) => tstore().get("f/" + x.o.token, { type: "json" }).catch(() => null) as Promise<any>)),
  ]);
  // Los coches propios sin enlazar a la web (vp-…) cuentan como un coche más: stock invertido, venta, cobros y beneficio al céntimo
  // (si su venta ya está apuntada en Finanzas deja de contar como stock aunque la ficha aún no esté cerrada)
  const cars = [...carsWeb, ...sinEnlazar.map((c) => (ventas.some((v) => v.coche === c.id) ? { ...c, estado: "vendido" as const } : c))];
  // Actualización 11: presupuesto aceptado -> factura emitida (FORM-06). Cada orden toma el número y el importe de su última factura (F o R).
  const facDeOrden = new Map<string, any>();
  for (const r of registros) if (r.serie !== "H" && r.orden) facDeOrden.set(r.orden, r);
  const turnos = cajaR.turnos;
  const movs = turnos.flatMap((t) => cajaR.movsDeTurno(t.id)).filter((m) => !m.anulado);
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
    if (!(p && p.estado === "aceptado") && !(reg?.cobros || []).some((c) => !c.anulado) && !caja.length && !facDeOrden.get(o.token)) continue;
    const lineas = p?.lineas || [], base0 = Math.round(lineas.reduce((a: number, l: any) => a + (Number(l.n) || 0) * (Number(l.p) || 0), 0) * 100), igic = p ? Number(p.igic) || 0 : cfg.igic;
    const cobrado = [...(reg?.cobros || []).filter((c) => !c.anulado).map((c) => ({ ...c, origen: "finanzas" })), ...caja.map((m) => ({ id: m.id, fecha: diaDe(m.t), metodo: "efectivo", importe: m.importe, cajaMov: m.id, nota: "Cobrado en caja por " + m.porNombre, origen: "caja" }))];
    const fac = facDeOrden.get(o.token);
    const totalAcept = fac ? Math.round(fac.total * 100) : (p && p.estado === "aceptado" ? base0 + Math.round(base0 * igic / 100) : 0);
    const total = totalAcept || cobrado.reduce((a, c) => a + c.importe, 0);
    const base = fac ? Math.round(fac.base * 100) : (totalAcept ? base0 : Math.round(total / (1 + igic / 100)));
    const fechaDoc = p?.respuesta?.t && p.estado === "aceptado" ? diaDe(p.respuesta.t) : (cobrado.map((c) => c.fecha).sort()[0] || diaDe(o.creado));
    const doc = { id: "t-" + o.token, tipo: "taller", area: "taller", ref: o.token, fecha: fechaDoc, num: fac ? fac.numero : (o.num || ""), facturaEmitida: !!fac, faltaFactura: !fac && !!(p && p.estado === "aceptado"), ordenNum: o.num || "", cliente: o.cliente?.nombre || "", concepto: `Taller · ${o.vehiculo?.coche || ""} ${(o.vehiculo?.matricula || "").toUpperCase()}`.trim(), base, impuestoPct: fac ? Number(fac.pct) || igic : igic, impuesto: total - base, total, cobrado: cobrado.reduce((a, c) => a + c.importe, 0), cobros: cobrado, sinPresupuesto: !totalAcept };
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
    const compra = esIdPropio(id) && propios.has(id) ? propios.get(id)!.compra : (v?.costeCompra ?? co?.compra ?? propios.get(id)?.compra ?? 0);
    // Reacondicionamiento = gastos apuntados a este coche + piezas, horas y costes aprobados de su ficha en Taller → Coches propios
    const reac = gastos.filter((g) => !g.anulado && g.coche === id).reduce((a, g) => a + g.base, 0) + (propios.get(id)?.reac || 0);
    const cobrado = [...(v?.cobros || []).filter((x) => !x.anulado).map((x) => ({ ...x, origen: "finanzas" })), ...caja.map((m) => ({ id: m.id, fecha: diaDe(m.t), metodo: "efectivo", importe: m.importe, cajaMov: m.id, nota: "Cobrado en caja por " + m.porNombre, origen: "caja" }))];
    const fechaDoc = v?.fecha || (c?.vendidoEn ? diaDe(c.vendidoEn) : diaDe(c?.actualizado || ahora()));
    const nombre = c ? `${c.marca} ${c.modelo} ${c.version || ""}`.trim() + (c.anio ? ` (${c.anio})` : "") : "Coche borrado del inventario";
    const doc = { id: "v-" + id, tipo: "venta", area: "venta", ref: id, fecha: fechaDoc, num: v?.factura || "", cliente: v?.comprador || "", concepto: "Venta · " + nombre, base, impuestoPct: igic, impuesto: total - base, total, cobrado: cobrado.reduce((a, x) => a + x.importe, 0), cobros: cobrado, estimado: !v, costeCompra: compra, reacondicionamiento: reac, beneficio: base - compra - reac, sinCoste: !compra };
    emitidas.push(doc); cobrado.forEach((x) => addCobro({ ...x, doc: doc.id, area: "venta", concepto: doc.concepto }));
    const pr = propios.get(id), gDet = gastos.filter((g) => !g.anulado && g.coche === id), reacGastos = gDet.reduce((a, g) => a + g.base, 0);
    porCoche.push({ coche: id, nombre, fecha: fechaDoc, precio: total, base, compra, reacondicionamiento: reac, beneficio: base - compra - reac, estimado: !v, sinCoste: !compra, pendiente: total - doc.cobrado,
      // Act. 74 · desglose del coste: gastos apuntados al coche + piezas, horas y costes aprobados de su ficha
      comprador: v?.comprador || "", igic: total - base, reacGastos, reacPiezas: pr?.piezas || 0, reacHoras: pr?.horas || 0, reacOtros: pr?.otros || 0,
      gastosDet: gDet.slice(0, 40).map((g) => ({ fecha: g.fecha, proveedor: g.proveedor, concepto: g.concepto, categoria: CAT.get(g.categoria)?.txt || g.categoria, base: g.base })) });
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
  const descuadres = turnos.filter((t) => t.cierre && t.cierre.diferencia && !(t.cierre as any).corregida).map((t) => ({ turno: t.id, fecha: t.fecha, importe: t.cierre!.diferencia, quien: t.cierre!.nombre, justificacion: t.cierre!.justificacion }))
    .concat(turnos.filter((t) => t.apertura.diferencia && !(t.apertura as any).corregida).map((t) => ({ turno: t.id, fecha: t.fecha, importe: t.apertura.diferencia, quien: t.apertura.nombre, justificacion: t.apertura.justificacion })));

  // ================= PERIODO =================
  const E = emitidas.filter((d) => dentro(d.fecha)), R = recibidas.filter((d) => dentro(d.fecha)), C = cobros.filter((c) => dentro(c.fecha)), D = descuadres.filter((d) => dentro(d.fecha)), I = internos.filter((x) => dentro(x.fecha));
  const sum = (l: any[], k = "total") => l.reduce((a, x) => a + (x[k] || 0), 0);
  const porCanal: Record<string, number> = Object.fromEntries(COBROS.map((k) => [k, 0])); for (const c of C) porCanal[c.metodo] = (porCanal[c.metodo] || 0) + c.importe;
  const porPago: Record<string, number> = Object.fromEntries(PAGOS.map((k) => [k, 0])); for (const g of R) porPago[g.metodo] = (porPago[g.metodo] || 0) + g.total;
  const descNeto = sum(D, "importe");
  // Efectivo que debe quedar en el cajón en el periodo: lo cobrado en efectivo MENOS lo pagado en efectivo y lo retirado/llevado al banco (los descuadres ya sumados con su signo)
  const efectivoNeto = (porCanal.efectivo || 0) - (porPago.efectivo || 0) - sum(I, "importe") + descNeto;
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
  // ===== Actualización 62 · coches de taller ENTREGADOS: precio final, base sin IGIC, piezas, mano de obra por trabajador y beneficio =====
  const nombreDe = (u: string) => (u === "gerente" ? "Gerente" : equipoT.find((x) => x.id === u)?.nombre || "—");
  const docT = new Map(emitidas.filter((d) => d.tipo === "taller").map((d) => [d.id, d]));
  const entregadas = entregadasR.map(({ o, dia }, i) => {
    const doc = docT.get("t-" + o.token), fi = fichasEnt[i];
    const pz = piezasDeOrden(movsAlm, o.token), mo = manoObraDe(fi?.f3 || null, cfg, nombreDe);
    const base = doc ? doc.base : 0, total = doc ? doc.total : 0, descMO = aju.descontarMO ? mo.coste : 0, avisos: string[] = [];
    if (!doc) avisos.push("Sin factura ni presupuesto aceptado: no hay ingreso que contar.");
    else if (!doc.facturaEmitida) avisos.push("Todavía no tiene factura emitida.");
    if (doc && doc.total - doc.cobrado > 0) avisos.push(`Falta cobrar ${eur(doc.total - doc.cobrado)}.`);
    if (aju.descontarMO && mo.sinHoras) avisos.push("No se fichó ningún tiempo (FORM-04): la mano de obra sale a 0 y el beneficio puede estar inflado.");
    if (pz.det.some((d) => d.sinCoste)) avisos.push("Alguna pieza no tiene precio de coste en el Inventario: su coste sale a 0.");
    const dg = desgloseF5(fi?.f5 || null);
    if (dg && dg.piezas > 0 && pz.coste === 0) avisos.push("Facturaste piezas, pero ninguna salió del Inventario con esta orden: el coste de piezas sale a 0 y la ganancia en piezas está inflada.");
    if (!dg && doc) avisos.push("Esta orden no tiene la factura (FORM-06) con líneas: no se puede separar lo cobrado en piezas y mano de obra.");
    return { token: o.token, num: o.num || "", cliente: o.cliente?.nombre || "", coche: o.vehiculo?.coche || "", matricula: (o.vehiculo?.matricula || "").toUpperCase(), fecha: dia, factura: doc?.num || "", facturada: !!doc?.facturaEmitida,
      total, base, igic: total - base, igicPct: doc?.impuestoPct ?? cfg.igic, cobrado: doc?.cobrado || 0, pendiente: doc ? doc.total - doc.cobrado : 0,
      piezas: pz.coste, piezasDet: pz.det, manoObra: mo.coste, minutos: mo.minutos, tarifa: mo.tarifa, trabajadores: mo.trabajadores, descontadaMO: aju.descontarMO,
      beneficio: base - pz.coste - descMO, avisos,
      // Act. 74 · desglose de la ganancia: lo facturado en piezas frente a lo que costaron al proveedor, y la mano de obra frente a las horas fichadas
      sinDesglose: !dg, ventaPiezas: dg?.piezas || 0, ventaManoObra: dg?.manoObra || 0, ventaOtros: dg?.otros || 0, descuentoGlobal: dg?.descuentoGlobal || 0, lineasPiezas: dg?.lineasPiezas || [],
      gananciaPiezas: (dg?.piezas || 0) - pz.coste, margenPiezasPct: pz.coste > 0 ? Math.round((((dg?.piezas || 0) - pz.coste) / pz.coste) * 1000) / 10 : null,
      gananciaManoObra: (dg?.manoObra || 0) - mo.coste, gananciaOtros: dg?.otros || 0 };
  });
  const resAll = entregadas.filter(Boolean) as any[];
  const resultadoTaller = resAll.filter((x) => dentro(x.fecha)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const resTot = { coches: resultadoTaller.length, total: sum(resultadoTaller), base: sum(resultadoTaller, "base"), igic: sum(resultadoTaller, "igic"), piezas: sum(resultadoTaller, "piezas"), manoObra: sum(resultadoTaller, "manoObra"), beneficio: sum(resultadoTaller, "beneficio"), ventaPiezas: sum(resultadoTaller, "ventaPiezas"), gananciaPiezas: sum(resultadoTaller, "gananciaPiezas"), ventaManoObra: sum(resultadoTaller, "ventaManoObra"), gananciaManoObra: sum(resultadoTaller, "gananciaManoObra"), ventaOtros: sum(resultadoTaller, "ventaOtros") };
  // ¿Hoy hubo pérdidas? Beneficio de los coches entregados hoy − la parte de los fijos del taller de un día laborable
  const lab = esLaborable(hoyD), fd = lab ? fijosDia(aju) : 0, delHoy = resAll.filter((x) => x.fecha === hoyD), benHoy = sum(delHoy, "beneficio");
  const delMes = resAll.filter((x) => x.fecha >= mesIni && x.fecha <= hoyD), benMes = sum(delMes, "beneficio"), fijosHasta = fijosDia(aju) * Math.min(laborablesHasta(hoyD), aju.diasLab);
  const hoy = { fecha: hoyD, laborable: lab, coches: delHoy.length, base: sum(delHoy, "base"), beneficio: benHoy, fijosDia: fd, resultado: benHoy - fd, perdida: benHoy - fd < 0 };
  const mes = { desde: mesIni, coches: delMes.length, beneficio: benMes, fijosMes: aju.fijosMes, fijosHasta, resultado: benMes - fijosHasta, cubierto: aju.fijosMes ? Math.round((benMes / aju.fijosMes) * 1000) / 10 : 0, diasLaborables: Math.min(laborablesHasta(hoyD), aju.diasLab) };
  const taller = { ingresos: ingT, gastosDirectos: gT, margen: ingT - gT, generales: Math.round(gG * pesoT), neto: ingT - gT - Math.round(gG * pesoT) };
  const venta = { ingresos: baseVentas + ingV, costeCoches: cochesVendidosPeriodo.reduce((a, x) => a + x.compra + x.reacondicionamiento, 0), gastosDirectos: gVsinCoche, margen: margenCoches + ingV - gVsinCoche, generales: gG - Math.round(gG * pesoT), neto: margenCoches + ingV - gVsinCoche - (gG - Math.round(gG * pesoT)), coches: cochesVendidosPeriodo.length };
  const porCategoria: Record<string, number> = {}; for (const g of R) porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + g.total;
  if (descNeto < 0) porCategoria["descuadres"] = -descNeto;
  const cobrado = sum(C, "importe"), pagado = sum(R);
  // Efectivo (cuenta de caja): teórico ahora
  const abierto = cajaR.abierto; let efectivo: any;
  if (abierto) { const c = teorico(abierto, cajaR.movsDeTurno(abierto.id)); efectivo = { abierta: true, teorico: c.teorico, desde: abierto.apertura.t, nombre: abierto.apertura.nombre }; }
  else { const u = cajaR.ultimoCierre; efectivo = { abierta: false, teorico: u?.contado || 0, desde: u?.t || "", nombre: u?.nombre || "" }; }
  // Pendientes (de siempre, no solo del periodo)
  const porCobrar = emitidas.filter((d) => d.total - d.cobrado > 0).map((d) => ({ id: d.id, tipo: d.tipo, ref: d.ref, fecha: d.fecha, num: d.num, cliente: d.cliente, concepto: d.concepto, total: d.total, pendiente: d.total - d.cobrado, estimado: d.estimado }));
  const stock = cars.filter((c) => c.estado !== "vendido").map((c) => ({ coche: c.id, nombre: `${c.marca} ${c.modelo} ${c.version || ""}`.trim(), precio: Math.round(c.precio * 100), compra: costeDe.get(c.id)?.compra || propios.get(c.id)?.compra || 0, reacondicionamiento: gastos.filter((g) => !g.anulado && g.coche === c.id).reduce((a, g) => a + g.base, 0) + (propios.get(c.id)?.reac || 0) }));
  const dias = [...new Set([...E.map((d) => d.fecha), ...C.map((c) => c.fecha), ...R.map((g) => g.fecha)])].sort();
  const serie = dias.map((d) => ({ fecha: d, cobrado: sum(C.filter((c) => c.fecha === d), "importe"), pagado: sum(R.filter((g) => g.fecha === d)) }));
  return {
    desde, hasta,
    kpis: { efectivoNeto, cobrado, pagado, flujo: cobrado - pagado + descNeto, facturado: sum(E), facturadoBase: sum(E, "base"), gastosBase: sum(Rgasto, "base"), resultado: taller.neto + venta.neto, porCobrar: porCobrar.reduce((a, x) => a + x.pendiente, 0), descuadres: descNeto, invertidoStock: sum(Rstock, "base"), sinClasificar: recibidas.filter((g) => g.sinClasificar).length, ventasSinDatos: porCoche.filter((x) => x.estimado || x.sinCoste).length },
    porCanal, porPago, porCategoria, taller, venta, coches: porCoche.sort((a, b) => b.fecha.localeCompare(a.fecha)), stock, efectivo, internos: I, descuadres: D,
    emitidas: E.sort((a, b) => b.fecha.localeCompare(a.fecha)), recibidas: R.sort((a, b) => b.fecha.localeCompare(a.fecha)), cobros: C.sort((a, b) => b.fecha.localeCompare(a.fecha)),
    porCobrar: porCobrar.sort((a, b) => a.fecha.localeCompare(b.fecha)), sinClasificar: recibidas.filter((g) => g.sinClasificar), serie,
    resultadoTaller, resTot, hoy, mes, ajustes: aju,
    categorias: GASTOS, metodos: TXT_M,
  };
}

export default async (req: Request) => {
  const url = new URL(req.url), p = url.pathname.split("/").filter(Boolean), accion = p[2] || "", id = p[3] || "", id2 = p[4] || "";
  if (req.method !== "GET" && !mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
  const q = await quien(req);
  if (!q) return json({ error: "Tu sesión ha caducado. Vuelve a entrar." }, 401);
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
    { const dup = (await lista<Gasto>("gasto/")).find((x) => !x.anulado && hace(x.t) < RECIENTE && x.total === imp.total && x.metodo === metodo && x.proveedor.toLowerCase() === proveedor.toLowerCase());
      if (dup) return json({ error: "Este mismo gasto (mismo proveedor, importe y forma de pago) ya se guardó hace un momento. No se ha duplicado.", duplicado: true }, 409); }
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

  // ---------- anular un cobro de taller o de venta (Actualización 46: nunca se borra; sale de los totales y queda en el libro) ----------
  if (accion === "cobro-anular" && req.method === "POST" && (id === "taller" || id === "venta")) {
    const motivo = str(body.motivo, 300); if (motivo.length < 5) return json({ error: "Escribe el motivo de la anulación." }, 400);
    const k = id === "taller" ? "cobro-taller/" + id2 : "venta/" + id2;
    const reg = (await f().get(k, { type: "json" }).catch(() => null)) as any; if (!reg) return json({ error: "No existe." }, 404);
    const c = (reg.cobros || []).find((x: Cobro) => x.id === String(body.cobro || "")); if (!c) return json({ error: "Cobro no encontrado." }, 404);
    if (c.anulado) return json({ error: "Ya está anulado." }, 409);
    c.anulado = { t: ahora(), motivo }; await f().setJSON(k, reg);
    if (c.cajaMov) { const r = await leerMov(c.cajaMov); if (r && !r.m.anulado) { r.m.anulado = { t: ahora(), motivo: "Anulado desde Finanzas: " + motivo }; await sCaja().setJSON(r.key, r.m); await libroCaja(q, "anulacion", { importe: r.m.importe, tipo: r.m.tipo, concepto: r.m.concepto, motivo: "Finanzas: " + motivo }, r.m.turno, r.m.id); } }
    await libro(q, "cobro-anular", { tipo: id, ref: id2, cobro: c.id, importe: c.importe, metodo: c.metodo, motivo });
    return json({ ok: true });
  }

  // ---------- Actualización 74 · CORREGIR (el gerente corrige cualquier número desde el panel; queda en el libro con el antes y el después) ----------
  // Sin las exigencias del alta (foto obligatoria, fecha no pasada para el efectivo…): corregir un error no debería ser más difícil que cometerlo.
  // Si el apunte salió de la caja, su movimiento de caja se corrige a la vez; si deja de ser efectivo, ese movimiento se anula; si pasa a efectivo, entra en la caja abierta.
  async function cajaSegunMetodo(x: any, metodoNuevo: string, mov: { tipo: "ingreso" | "egreso"; categoria: string; concepto: string; ref: string; coche?: string }) {
    if (x.cajaMov) {
      const l = await leerMov(x.cajaMov);
      if (l) {
        if (metodoNuevo !== "efectivo") { l.m.anulado = { t: ahora(), motivo: "Corregido desde Finanzas: ya no es efectivo" }; await sCaja().setJSON(l.key, l.m); x.cajaMov = ""; }
        else { l.m.importe = x.total ?? x.importe; l.m.concepto = mov.concepto || l.m.concepto; await sCaja().setJSON(l.key, l.m); }
      }
    } else if (metodoNuevo === "efectivo") {
      const r = await porCaja(q, { tipo: mov.tipo, importe: String((x.total ?? x.importe) / 100), categoria: mov.categoria, concepto: mov.concepto, ref: mov.ref, coche: mov.coche || "" }, origin);
      if (r.error) return r.error; x.cajaMov = r.id!;
    }
    return "";
  }
  if ((accion === "gasto-editar" || accion === "ingreso-editar") && req.method === "POST") {
    const esG = accion === "gasto-editar", k = (esG ? "gasto/" : "ingreso/") + id;
    if (!/^[a-z0-9]{6,20}$/.test(id)) return json({ error: "Apunte no válido." }, 400);
    const x = (await f().get(k, { type: "json" }).catch(() => null)) as any; if (!x) return json({ error: "No existe ese apunte." }, 404);
    if (x.anulado) return json({ error: "Está anulado: no se puede corregir." }, 409);
    const antes = { fecha: x.fecha, base: x.base, impuestoPct: x.impuestoPct, total: x.total, metodo: x.metodo, categoria: x.categoria, proveedor: x.proveedor, concepto: x.concepto };
    const d = fecha(body.fecha) || x.fecha; if (d > hoyCanarias()) return json({ error: "La fecha no puede ser futura." }, 400);
    const imp = importes(body); if (!imp) return json({ error: "Escribe la base imponible." }, 400); if ("error" in imp) return json({ error: imp.error }, 400);
    const metodo = (esG ? PAGOS : COBROS).includes(body.metodo) ? body.metodo : x.metodo;
    const concepto = str(body.concepto ?? x.concepto, 300); if (concepto.length < 2) return json({ error: "Escribe el concepto." }, 400);
    if (esG) { if (body.categoria !== undefined) { if (!CAT.get(body.categoria)) return json({ error: "Categoría no válida." }, 400); x.categoria = body.categoria; } x.proveedor = str(body.proveedor ?? x.proveedor, 120) || x.proveedor; if (AREAS.includes(body.area)) x.area = body.area; }
    else { x.cliente = str(body.cliente ?? x.cliente, 120); if (AREAS.includes(body.area)) x.area = body.area; }
    x.factura = str(body.factura ?? x.factura, 40); x.fecha = d; x.concepto = concepto; Object.assign(x, imp); x.metodo = metodo;
    const e = await cajaSegunMetodo(x, metodo, esG ? { tipo: "egreso", categoria: x.categoria === "recambios" || x.categoria === "herramientas" ? "compra" : "proveedor", concepto: `${x.proveedor} · ${concepto}`.slice(0, 200), ref: x.factura || "sin nº", coche: x.coche } : { tipo: "ingreso", categoria: x.area === "taller" ? "taller" : x.area === "venta" ? "venta" : "otro", concepto, ref: x.factura });
    if (e) return json({ error: e }, 409);
    x.corregido = { t: ahora(), por: q.nombre }; await f().setJSON(k, x);
    await libro(q, accion, { id, antes, despues: { fecha: x.fecha, base: x.base, impuestoPct: x.impuestoPct, total: x.total, metodo: x.metodo, categoria: x.categoria, proveedor: x.proveedor, concepto: x.concepto } });
    return json({ ok: true });
  }
  if (accion === "cobro-editar" && req.method === "POST" && (id === "taller" || id === "venta")) {
    const k = id === "taller" ? "cobro-taller/" + id2 : "venta/" + id2;
    const reg = (await f().get(k, { type: "json" }).catch(() => null)) as any; if (!reg) return json({ error: "No existe." }, 404);
    const c = (reg.cobros || []).find((z: Cobro) => z.id === String(body.cobro || "")); if (!c) return json({ error: "Cobro no encontrado." }, 404);
    if (c.anulado) return json({ error: "Está anulado: no se puede corregir." }, 409);
    const importe = cent(body.importe); if (!Number.isFinite(importe) || importe <= 0) return json({ error: "Escribe el importe." }, 400);
    const metodo = COBROS.includes(body.metodo) ? body.metodo : c.metodo, d = fecha(body.fecha) || c.fecha; if (d > hoyCanarias()) return json({ error: "La fecha no puede ser futura." }, 400);
    const antes = { importe: c.importe, metodo: c.metodo, fecha: c.fecha };
    c.importe = importe; c.metodo = metodo; c.fecha = d;
    const e = await cajaSegunMetodo(c, metodo, { tipo: "ingreso", categoria: id === "taller" ? "taller" : "venta", concepto: str(c.nota, 150) || (id === "taller" ? "Cobro de taller" : "Venta de coche"), ref: "", coche: id === "venta" ? id2 : "" });
    if (e) return json({ error: e }, 409);
    await f().setJSON(k, reg); await libro(q, "cobro-editar", { tipo: id, ref: id2, cobro: c.id, antes, despues: { importe, metodo, fecha: d } });
    return json({ ok: true });
  }

  // ---------- ingreso manual (otros ingresos con factura) ----------
  if (accion === "ingreso" && req.method === "POST") {
    const d = fecha(body.fecha); if (!d || d > hoyCanarias()) return json({ error: "Pon la fecha." }, 400);
    const concepto = str(body.concepto, 300); if (concepto.length < 3) return json({ error: "Escribe el concepto." }, 400);
    const imp = importes(body); if (!imp) return json({ error: "Escribe la base imponible." }, 400); if ("error" in imp) return json({ error: imp.error }, 400);
    const metodo = COBROS.includes(body.metodo) ? body.metodo : ""; if (!metodo) return json({ error: "Elige cómo se cobró." }, 400);
    { const dup = (await lista<Ingreso>("ingreso/")).find((x) => !x.anulado && hace(x.t) < RECIENTE && x.total === imp.total && x.metodo === metodo && x.concepto.toLowerCase() === concepto.toLowerCase());
      if (dup) return json({ error: "Este mismo ingreso (mismo concepto, importe y forma de cobro) ya se guardó hace un momento. No se ha duplicado.", duplicado: true }, 409); }
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

  // ---------- Actualización 74 · empezar de cero (solo gerente; pide escribir la frase y guarda copia antes) ----------
  if (accion === "reiniciar" && req.method === "POST") {
    if (String(body.confirmar || "").trim().toUpperCase() !== "EMPEZAR DE CERO") return json({ error: "Para empezar de cero escribe exactamente: EMPEZAR DE CERO" }, 400);
    try { return json({ ok: true, ...(await reiniciarFinanzas(q)) }); }
    catch (e: any) { return json({ error: "No se ha podido empezar de cero: " + String(e?.message || e).slice(0, 200) + " Vuelve a intentarlo; si ya se había guardado la copia, no se pierde nada." }, 500); }
  }

  // ---------- ajustes del resultado de taller (interruptor de mano de obra y gastos fijos) ----------
  if (accion === "ajustes" && req.method === "POST") {
    const prev = await leerAjustes(), n: Ajustes = { ...prev };
    if (body.descontarMO !== undefined) n.descontarMO = body.descontarMO === true || body.descontarMO === "true";
    if (body.fijosMes !== undefined) { const c = cent(String(body.fijosMes ?? "").replace(/\.(?=\d{3}(\D|$))/g, "")); if (!Number.isFinite(c) || c < 0 || c > 10000000) return json({ error: "Los gastos fijos del mes no son válidos (de 0 a 100.000 €)." }, 400); n.fijosMes = c; }
    if (body.diasLab !== undefined) { const d = Math.round(Number(body.diasLab)); if (!Number.isFinite(d) || d < 1 || d > 31) return json({ error: "Los días laborables del mes tienen que estar entre 1 y 31." }, 400); n.diasLab = d; }
    await f().setJSON("ajustes", n); await libro(q, "ajustes", { antes: prev, despues: n });
    return json({ ok: true, ajustes: n });
  }

  // ---------- cobro de una orden de taller o de una venta ----------
  if (accion === "cobro" && req.method === "POST" && (id === "taller" || id === "venta")) {
    const metodo = COBROS.includes(body.metodo) ? body.metodo : ""; if (!metodo) return json({ error: "Elige cómo ha pagado." }, 400);
    const importe = cent(body.importe); if (!Number.isFinite(importe) || importe <= 0) return json({ error: "Escribe el importe cobrado." }, 400);
    if (importe > 100000000) return json({ error: "Ese importe es demasiado grande (máximo 1.000.000 €). Revísalo." }, 400);
    if (body.fecha && !fecha(body.fecha)) return json({ error: "La fecha no es válida." }, 400);
    const d = fecha(body.fecha) || hoyCanarias(); if (d > hoyCanarias()) return json({ error: "La fecha no puede ser futura." }, 400);
    const c: Cobro = { id: rid(), fecha: d, metodo, importe, cajaMov: "", nota: str(body.nota, 200), t: ahora(), por: q.nombre };
    let concepto = "", ref = "";
    if (id === "taller") {
      if (!/^[A-Za-z0-9]{16}$/.test(id2)) return json({ error: "Orden no válida." }, 400);
      const o = (await store("ordenes").get("o/" + id2, { type: "json" })) as any; if (!o) return json({ error: "Orden no encontrada." }, 404);
      { const p = o.presupuesto; const reg0 = ((await f().get("cobro-taller/" + id2, { type: "json" }).catch(() => null)) as any) || { cobros: [] };
        const ya = (reg0.cobros || []).filter((x: any) => !x.anulado).reduce((n: number, x: any) => n + (x.importe || 0), 0);
        if ((reg0.cobros || []).some((x: any) => !x.anulado && x.importe === importe && x.metodo === metodo && hace(x.t) < RECIENTE)) return json({ error: DUP_COBRO, duplicado: true }, 409);
        const totalC = p && p.lineas ? Math.round(p.lineas.reduce((n: number, l: any) => n + (l.n || 1) * (l.p || 0), 0) * (1 + (p.igic ?? 7) / 100) * 100) : 0;
        if (totalC > 0 && ya + importe > totalC + 1 && !body.confirmarExceso) return json({ error: `Con este cobro se pasa de lo que vale el trabajo (${eur(totalC)}; ya cobrado ${eur(ya)}). Revisa el importe.`, exceso: true }, 409); }
      concepto = `Cobro taller ${o.num || ""} · ${o.vehiculo?.coche || ""} ${(o.vehiculo?.matricula || "").toUpperCase()}`.trim(); ref = o.num || "";
      if (metodo === "efectivo") { if (d !== hoyCanarias()) return json({ error: "Un cobro en efectivo entra en la caja de hoy: pon la fecha de hoy." }, 400); const r = await porCaja(q, { tipo: "ingreso", importe: String(importe / 100), categoria: "taller", concepto, ref, orden: id2 }, origin); if (r.error) return json({ error: r.error }, 409); c.cajaMov = r.id!; }
      const reg = ((await f().get("cobro-taller/" + id2, { type: "json" }).catch(() => null)) as any) || { token: id2, cobros: [] };
      reg.cobros.push(c); await f().setJSON("cobro-taller/" + id2, reg);
    } else {
      const cars = ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null) || [], car = cars.find((x) => x.id === id2);
      const v = (await f().get("venta/" + id2, { type: "json" }).catch(() => null)) as Venta | null;
      if (!v) return json({ error: "Primero registra los datos de la venta de este coche." }, 409);
      const fp = esIdPropio(id2) ? await leerFicha(id2.slice(3)) : null;
      concepto = `Cobro venta · ${car ? car.marca + " " + car.modelo : fp ? fp.marca + " " + fp.modelo : id2}`; ref = v.factura;
      { const ya = (v.cobros || []).filter((x: any) => !x.anulado).reduce((n: number, x: any) => n + (x.importe || 0), 0);
        if ((v.cobros || []).some((x: any) => !x.anulado && x.importe === importe && x.metodo === metodo && hace(x.t) < RECIENTE)) return json({ error: DUP_COBRO, duplicado: true }, 409);
        if (v.importe > 0 && ya + importe > v.importe + 1 && !body.confirmarExceso) return json({ error: `Con este cobro se pasa del precio de venta (${eur(v.importe)}; ya cobrado ${eur(ya)}). Revisa el importe.`, exceso: true }, 409); }
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
    const cars = ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null) || [];
    // Coche propio sin enlazar a la web (vp-…): la venta se anota aquí igual que la de un coche de la web, y su compra la fija la ficha
    const ficha = esIdPropio(id) ? await leerFicha(id.slice(3)) : null;
    if (esIdPropio(id) && (!ficha || ficha.coche)) return json({ error: "Coche propio no encontrado (o ya está enlazado a un coche de la web: registra su venta desde ese coche)." }, 404);
    const car = ficha ? ({ marca: ficha.marca, modelo: ficha.modelo } as Car) : cars.find((x) => x.id === id);
    if (!car) return json({ error: "Coche no encontrado." }, 404);
    const importe = cent(body.importe); if (!Number.isFinite(importe) || importe <= 0) return json({ error: "Escribe el precio final de venta." }, 400);
    const costeCompra = ficha ? ficha.compra : cent(body.costeCompra);
    if (!Number.isFinite(costeCompra) || costeCompra < 0) return json({ error: "Escribe lo que costó comprar el coche (0 si no lo sabes aún)." }, 400);
    if (ficha && ficha.fase !== "listo" && ficha.fase !== "vendido") return json({ error: "Este coche aún no está «Listo para venta». Pasa antes por la reparación y el control de calidad." }, 409);
    const d = fecha(body.fecha) || hoyCanarias(); if (d > hoyCanarias()) return json({ error: "La fecha no puede ser futura." }, 400);
    const prev = (await f().get("venta/" + id, { type: "json" }).catch(() => null)) as Venta | null;
    const v: Venta = { coche: id, fecha: d, importe, igicPct: Math.min(30, Math.max(0, Number(String(body.igicPct ?? 0).replace(",", ".")) || 0)), comprador: str(body.comprador, 120), factura: str(body.factura, 40), costeCompra, nota: str(body.nota, 300), cobros: prev?.cobros || [], t: ahora() };
    await f().setJSON("venta/" + id, v);
    // Si la ficha ya estaba «Vendido», su base de venta sigue al precio de Finanzas (una sola cifra)
    if (ficha && ficha.vendido) { ficha.vendido.base = Math.round(importe / (1 + v.igicPct / 100)); await guardarFicha(ficha); }
    await f().setJSON("coste/" + id, { coche: id, compra: costeCompra, t: ahora() });
    await libro(q, prev ? "venta-editada" : "venta", { coche: `${car.marca} ${car.modelo}`, importe, costeCompra });
    return json({ ok: true, venta: v });
  }
  if (accion === "coste" && req.method === "POST") {
    if (esIdPropio(id)) return json({ error: "La compra de un coche propio se cambia en su ficha (Taller → Coches propios → Editar datos): así hay una sola cifra y Finanzas y la ficha siempre coinciden." }, 409);
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
