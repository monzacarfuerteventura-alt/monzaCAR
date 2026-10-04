/*
  ESTADO, DIFERENCIAS Y REINTENTOS (puro, sin red). El motor compara lo que hay AHORA en la web con lo que se envió
  la última vez a cada canal, y decide: crear, actualizar, retirar o no hacer nada.
*/
import type { VehiculoUnificado } from "./esquema.mts";
import { huella } from "./esquema.mts";

export type RegistroCanal = {
  idInterno: string;
  externalListingId: string | null;   // id que devuelve el portal al crear (clave para actualizar/borrar después)
  huella: string;                      // de lo último ENVIADO con éxito
  intentada: string;                   // huella de lo último que se INTENTÓ enviar (para no insistir con lo mismo si falló)
  estado: "publicado" | "pendiente" | "error" | "retirado" | "rechazado";
  intentos: number;                    // consecutivos sin éxito
  proximoIntento: string | null;       // ISO; hasta entonces no se reintenta
  ultimoError: string | null;
  actualizado: string;
};
export type Operacion =
  | { tipo: "crear" | "actualizar"; vehiculo: VehiculoUnificado; huella: string }
  | { tipo: "retirar"; idInterno: string; externalListingId: string | null };

export const MAX_INTENTOS = 6;

/** Diferencias entre el catálogo actual (solo coches PUBLICABLES) y lo ya publicado en un canal. */
export function calcularOperaciones(actuales: VehiculoUnificado[], previos: Record<string, RegistroCanal>, ahora = new Date(), mantener: Set<string> = new Set()): Operacion[] {
  // `mantener`: coches que se siguen vendiendo pero hoy no pasan la validación del canal; su anuncio actual NO se retira.
  const ops: Operacion[] = [];
  const vivos = new Set<string>(mantener);
  for (const v of actuales) {
    vivos.add(v.id);
    const r = previos[v.id]; const h = huella(v);
    if (r && r.estado === "rechazado" && r.intentada === h) continue;                    // rechazado por el portal: no insistir hasta que cambie el coche
    if (r && r.proximoIntento && Date.parse(r.proximoIntento) > ahora.getTime()) continue; // en espera de reintento
    if (r && r.intentos >= MAX_INTENTOS && r.intentada !== h) { ops.push({ tipo: r.externalListingId ? "actualizar" : "crear", vehiculo: v, huella: h }); continue; } // el coche cambió: otra oportunidad
    if (r && r.intentos >= MAX_INTENTOS) continue;                                         // agotado con lo mismo (ya se avisó)
    if (!r || r.estado === "retirado") ops.push({ tipo: "crear", vehiculo: v, huella: h });
    else if (r.huella !== h || r.estado === "error" || r.estado === "pendiente") ops.push({ tipo: r.externalListingId ? "actualizar" : "crear", vehiculo: v, huella: h });
  }
  for (const [id, r] of Object.entries(previos)) {
    if (vivos.has(id) || r.estado === "retirado") continue;                                // ya no se vende (vendido o borrado) → retirar
    if (!r.externalListingId) continue;                                                     // nunca llegó a publicarse: no hay nada que retirar
    if (r.estado === "rechazado" || r.intentos >= MAX_INTENTOS) continue;                  // la retirada ya falló del todo (ya se avisó)
    if (r.proximoIntento && Date.parse(r.proximoIntento) > ahora.getTime()) continue;      // en espera de reintento
    ops.push({ tipo: "retirar", idInterno: id, externalListingId: r.externalListingId });
  }
  return ops;
}

/** Espera exponencial con «jitter» completo: base·2^n, tope 6 h. `azar` se inyecta para poder probarlo. */
export function esperaMs(intento: number, azar: () => number = Math.random, baseMs = 60_000, topeMs = 6 * 3600_000) {
  return Math.floor(azar() * Math.min(topeMs, baseMs * 2 ** Math.max(0, intento - 1)));
}

/** ¿Merece la pena reintentar? 408/425/429/5xx y fallos de red sí; 4xx (datos mal) no: hay que corregir el coche. */
export function esReintentable(status: number | null) { return status === null || status === 408 || status === 425 || status === 429 || status >= 500; }

export class ErrorCanal extends Error {
  status: number | null; detalle: string; esperaMs: number | null;
  constructor(msg: string, status: number | null, detalle = "", esperaMs: number | null = null) { super(msg); this.status = status; this.detalle = detalle; this.esperaMs = esperaMs; }
}

/** Cabecera Retry-After (RFC 9110): segundos o fecha HTTP. Devuelve milisegundos de espera (tope 24 h) o null. */
export function leerRetryAfter(valor: string | null | undefined, ahora = Date.now()): number | null {
  if (!valor) return null;
  const v = String(valor).trim();
  const ms = /^\d+$/.test(v) ? Number(v) * 1000 : Date.parse(v) - ahora;
  return Number.isFinite(ms) && ms > 0 ? Math.min(ms, 24 * 3600_000) : null;
}

/*
  INTERRUPTOR DE CIRCUITO por canal: si el portal falla varias veces SEGUIDAS (red, 5xx, 429), se deja de llamarle un rato
  en vez de insistir con cada coche (y de mandarte un email por coche). Un solo aviso por caída.
*/
export type Circuito = { seguidos: number; abiertoHasta: string | null; avisado: boolean };
export const CIRCUITO_FALLOS = 5, CIRCUITO_PAUSA_MS = 30 * 60_000;
export const circuitoNuevo = (): Circuito => ({ seguidos: 0, abiertoHasta: null, avisado: false });
export const circuitoAbierto = (c: Circuito, ahora = new Date()) => !!c.abiertoHasta && Date.parse(c.abiertoHasta) > ahora.getTime();
/** Anota un resultado. `fallo` = fallo del portal (red/5xx/429); un 4xx de datos NO cuenta (el portal responde bien). */
export function pasarPorCircuito(c: Circuito, resultado: "ok" | "fallo" | "datos", ahora = new Date()): { c: Circuito; avisar: boolean } {
  const n = { ...c };
  if (resultado === "ok" || resultado === "datos") { n.seguidos = 0; n.abiertoHasta = null; n.avisado = false; return { c: n, avisar: false }; }
  n.seguidos += 1;
  if (n.seguidos >= CIRCUITO_FALLOS) {
    n.abiertoHasta = new Date(ahora.getTime() + CIRCUITO_PAUSA_MS).toISOString();
    const avisar = !n.avisado; n.avisado = true; n.seguidos = 0; return { c: n, avisar };
  }
  return { c: n, avisar: false };
}

/** Ejecuta `fn` con reintentos cortos en línea (para fallos momentáneos). Los largos los gestiona el registro (proximoIntento). */
export async function conReintentos<T>(fn: () => Promise<T>, veces = 3, dormir: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms))): Promise<T> {
  let ult: unknown;
  for (let i = 1; i <= veces; i++) {
    try { return await fn(); } catch (e: any) {
      ult = e; const st = e instanceof ErrorCanal ? e.status : null;
      if (!esReintentable(st) || i === veces) break;
      await dormir(esperaMs(i, Math.random, 500, 8000));
    }
  }
  throw ult;
}

/** Anota el resultado de una operación en el registro del canal. */
export function anotar(r: RegistroCanal | undefined, op: Operacion, res: { ok: true; externalListingId?: string | null } | { ok: false; error: string; status: number | null; esperaMs?: number | null }, ahora = new Date(), azar = Math.random): RegistroCanal {
  const id = op.tipo === "retirar" ? op.idInterno : op.vehiculo.id;
  const base: RegistroCanal = r ? { ...r } : { idInterno: id, externalListingId: null, huella: "", intentada: "", estado: "pendiente", intentos: 0, proximoIntento: null, ultimoError: null, actualizado: ahora.toISOString() };
  base.actualizado = ahora.toISOString();
  if (res.ok) {
    base.intentos = 0; base.proximoIntento = null; base.ultimoError = null;
    if (op.tipo === "retirar") { base.estado = "retirado"; }
    else { base.estado = "publicado"; base.huella = op.huella; base.externalListingId = res.externalListingId ?? base.externalListingId; }
    return base;
  }
  base.ultimoError = res.error.slice(0, 300);
  if (op.tipo !== "retirar") { if (base.intentada !== op.huella) base.intentos = 0; base.intentada = op.huella; }   // un coche distinto = cuenta nueva
  if (!esReintentable(res.status)) { base.estado = "rechazado"; base.intentos = MAX_INTENTOS; base.proximoIntento = null; return base; }
  base.estado = "error"; base.intentos += 1;
  base.proximoIntento = base.intentos >= MAX_INTENTOS ? null : new Date(ahora.getTime() + Math.max(esperaMs(base.intentos, azar), res.esperaMs || 0)).toISOString();   // si el portal dice «vuelve en X», se respeta
  return base;
}
