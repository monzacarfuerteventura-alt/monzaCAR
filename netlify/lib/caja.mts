// =====================================================================
// CAJA · lógica compartida (la usan /api/caja y /api/finanzas)
// Todo movimiento de efectivo pasa por aquí: mismas reglas, mismo libro, mismas alertas.
// =====================================================================
import { createHash } from "node:crypto";
import { store, enviarAviso } from "./shared.mts";
import { leerEquipo, type Quien } from "./taller.mts";

export const s = () => store("caja");
export const DEN = [50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50, 20, 10, 5, 2, 1];
export const CAT_E = ["proveedor", "compra", "propietario", "banco", "otro"];
export const CAT_I = ["taller", "venta", "senal", "otro"];
export const TXT_CAT: Record<string, string> = { proveedor: "Pago a proveedor", compra: "Compra rápida", propietario: "Retiro del propietario", banco: "Ingreso en el banco", otro: "Otro", taller: "Cobro de taller", venta: "Venta de coche", senal: "Señal / reserva" };
export const SALIDA_GRANDE = 20000; // 200 €: aviso aunque tenga ticket

export const str = (v: unknown, max = 200) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
export const cent = (v: unknown) => { const n = Math.round(Number(String(v ?? "").replace(/\s/g, "").replace(",", ".")) * 100); return Number.isFinite(n) ? n : NaN; };
export const eur = (c: number) => { const [e, d] = (Math.abs(c) / 100).toFixed(2).split("."); return (c < 0 ? "−" : "") + e.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + d + " €"; };
export const esFoto = (k: unknown) => typeof k === "string" && /^[a-z0-9-]+\.(jpg|webp|png|pdf)$/.test(k); // foto del ticket o PDF de la factura
export const rid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
export const ahora = () => new Date().toISOString();

export type Conteo = { desglose: Record<string, number>; contado: number; t: string };
export type Turno = {
  id: string; fecha: string;
  apertura: { t: string; uid: string; nombre: string; desglose: Record<string, number>; contado: number; esperado: number | null; diferencia: number; justificacion: string; intentos: Conteo[] };
  cierre: null | { t: string; uid: string; nombre: string; desglose: Record<string, number>; contado: number; teorico: number; diferencia: number; justificacion: string; intentos: Conteo[] };
  intentosCierre: Conteo[]; revision: null | { t: string; nota: string }; ajustes: { t: string; importe: number; tipo: string; concepto: string; motivo: string; mov: string }[];
};
export type Mov = {
  id: string; turno: string; t: string; tipo: "ingreso" | "egreso"; importe: number; categoria: string; concepto: string; ref: string; orden: string; coche?: string; origen?: string;
  responsable: string; responsableNombre: string; por: string; porNombre: string; foto: string; fotoT: string; sinTicket: boolean; ajuste: boolean;
  anulado: null | { t: string; motivo: string };
};

export function leerDesglose(x: any) {
  const d: Record<string, number> = {}; let total = 0;
  for (const v of DEN) { const n = Math.floor(Number(x?.[v] ?? x?.[String(v)] ?? 0)); if (Number.isFinite(n) && n > 0 && n < 100000) { d[v] = n; total += n * v; } }
  return { desglose: d, contado: total };
}

// ---------- libro de registro encadenado (cada entrada lleva la huella de la anterior) ----------
export async function libro(q: Quien, accion: string, datos: Record<string, unknown>, turno = "", mov = "") {
  const head = ((await s().get("libro-cabeza", { type: "json" }).catch(() => null)) as { hash: string; n: number } | null) || { hash: "0".repeat(64), n: 0 };
  const e: any = { n: head.n + 1, t: ahora(), uid: q.uid, nombre: q.nombre, rol: q.rol, accion, turno, mov, datos, prev: head.hash };
  e.hash = createHash("sha256").update(JSON.stringify({ ...e, hash: undefined })).digest("hex");
  await s().setJSON(`log/${e.t}-${rid()}`, e);
  await s().setJSON("libro-cabeza", { hash: e.hash, n: e.n });
  return e;
}
export async function alerta(nivel: "rojo" | "ambar" | "info", tipo: string, txt: string, filas: [string, string][], turno = "", mov = "", origin = "") {
  const a = { id: rid(), t: ahora(), nivel, tipo, txt, turno, mov, vista: false };
  await s().setJSON(`alerta/${a.t}-${a.id}`, a);
  if (nivel !== "info") await enviarAviso(`Caja: ${txt}`, filas, origin ? [{ txt: "Abrir Control de Caja", url: origin + "/admin#caja" }] : []).catch(() => false);
}
export async function listar<T>(prefix: string): Promise<T[]> {
  const { blobs } = await s().list({ prefix });
  return (await Promise.all(blobs.map((b) => s().get(b.key, { type: "json" }).catch(() => null)))).filter(Boolean) as T[];
}
export const movsDe = async (turno: string) => (await listar<Mov>(`m/${turno}/`)).sort((a, b) => a.t.localeCompare(b.t));
export function teorico(t: Turno, movs: Mov[]) {
  const vivos = movs.filter((m) => !m.anulado);
  const ing = vivos.filter((m) => m.tipo === "ingreso").reduce((a, m) => a + m.importe, 0);
  const egr = vivos.filter((m) => m.tipo === "egreso").reduce((a, m) => a + m.importe, 0);
  return { base: t.apertura.contado, ingresos: ing, egresos: egr, teorico: t.apertura.contado + ing - egr };
}
export const turnoAbierto = async () => { const id = await s().get("abierto").catch(() => null); return id ? ((await s().get("t/" + id, { type: "json" }).catch(() => null)) as Turno | null) : null; };
export async function leerMov(id: string) { if (!/^[a-z0-9]{12}$/.test(id)) return null; const l = await s().list({ prefix: "m/" }); const k = l.blobs.find((b) => b.key.endsWith("-" + id)); return k ? { key: k.key, m: (await s().get(k.key, { type: "json" })) as Mov } : null; }

// Registra un cobro o una salida en la caja abierta. Devuelve { mov } o { error, status }.
export async function crearMovimiento(q: Quien, body: any, origin: string): Promise<{ mov?: Mov; error?: string; status?: number }> {
  const err = (error: string, status: number) => ({ error, status });
    const t = await turnoAbierto(); if (!t) return err("Primero hay que abrir la caja.", 409);
    const tipo = body.tipo === "ingreso" ? "ingreso" : body.tipo === "egreso" ? "egreso" : "";
    if (!tipo) return err("Tipo no válido.", 400);
    const importe = cent(body.importe);
    if (!Number.isFinite(importe) || importe <= 0 || importe > 5_000_000) return err("Escribe el importe (mayor que 0).", 400);
    const categoria = (tipo === "egreso" ? CAT_E : CAT_I).includes(body.categoria) ? body.categoria : "";
    if (!categoria) return err("Elige el tipo de " + (tipo === "egreso" ? "salida." : "cobro."), 400);
    const concepto = str(body.concepto, 200), ref = str(body.ref, 40);
    if (concepto.length < 3) return err("Escribe el concepto.", 400);
    if (tipo === "egreso" && !ref) return err("Escribe el nº de factura, ticket u orden asociada (o del vale firmado).", 400);
    const foto = esFoto(body.foto) ? body.foto : "", sinTicket = tipo === "egreso" && !foto && body.sinTicket === true;
    if (tipo === "egreso" && !foto && !sinTicket) return err("Haz una foto del ticket o la factura. Sin comprobante no se puede sacar dinero.", 400);
    if (foto && !(await store("monzacar-fotos").get(foto, { type: "arrayBuffer" }).catch(() => null))) return err("La foto no se ha subido bien. Hazla otra vez.", 400);
    let responsable = q.uid, responsableNombre = q.nombre;
    if (tipo === "egreso" && body.responsable) {
      if (body.responsable === "gerente") { responsable = "gerente"; responsableNombre = "Gerente / propietario"; }
      else { const p = (await leerEquipo()).find((x) => x.id === body.responsable && x.activo); if (!p) return err("Elige quién se lleva el dinero.", 400); responsable = p.id; responsableNombre = p.nombre; }
    }
    const m: Mov = { id: rid(), turno: t.id, t: ahora(), tipo, importe, categoria, concepto, ref, orden: /^[A-Za-z0-9]{16}$/.test(String(body.orden || "")) ? body.orden : "", coche: /^[a-z0-9-]{3,80}$/.test(String(body.coche || "")) ? body.coche : "", origen: str(body.origen, 20), responsable, responsableNombre, por: q.uid, porNombre: q.nombre, foto, fotoT: foto ? ahora() : "", sinTicket, ajuste: false, anulado: null };
    if (tipo === "egreso") { const { teorico: teo } = teorico(t, await movsDe(t.id)); if (importe > teo) return err("No puede salir más dinero del que hay en caja. Revisa el importe.", 409); }
    await s().setJSON(`m/${t.id}/${m.t}-${m.id}`, m);
    await libro(q, tipo === "egreso" ? "salida" : "cobro", { importe, categoria, concepto, ref, responsable: responsableNombre, foto: !!foto, sinTicket, ...(m.origen ? { origen: m.origen } : {}) }, t.id, m.id);
    const filas: [string, string][] = [["Importe", eur(importe)], ["Tipo", TXT_CAT[categoria]], ["Concepto", concepto], ["Factura / orden", ref], ["Se lo lleva", responsableNombre], ["Lo registra", q.nombre]];
    if (sinTicket) await alerta("rojo", "sin-ticket", `salida de ${eur(importe)} SIN ticket (${concepto})`, filas, t.id, m.id, origin);
    else if (tipo === "egreso" && (importe >= SALIDA_GRANDE || categoria === "propietario")) await alerta("ambar", "salida", `salida de ${eur(importe)}: ${TXT_CAT[categoria].toLowerCase()}`, filas, t.id, m.id, origin);
    return { mov: m };
}
