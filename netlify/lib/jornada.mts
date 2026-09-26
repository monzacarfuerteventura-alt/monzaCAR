// =====================================================================
// REGISTRO DE JORNADA (art. 34.9 del Estatuto de los Trabajadores)
// Fichaje de ultra-baja fricción: un botón que cambia según el momento (entrada → pausa → reanudar →
// salida), QR/NFC fijo en el taller y fichajes que se enganchan solos con el FORM-03.
//  · La hora la pone SIEMPRE el servidor. Nadie puede escribirla desde el móvil.
//  · Nada se borra: una pulsación por error se «deshace» con un apunte nuevo, y el gerente corrige con
//    motivo (queda la hora original, quién, cuándo y por qué).
//  · Cada fichaje va además al libro encadenado (SHA-256) de la tienda «jornada».
//  · Se conserva 4 años (no hay borrado automático).
// Datos (Netlify Blobs, tienda «jornada»):
//   dia/AAAA-MM/<uid>/DD   → un día de una persona: eventos en orden + incidencias
//   estado/<uid>           → dónde está ahora (fuera · trabajando · pausa) y qué día tiene abierto
//   auto/<uid>             → orden de taller que el fichaje pausó sola (para reanudarla sola)
//   config/qr              → código del cartel QR / pegatina NFC del taller
// =====================================================================
import { store, json } from "./shared.mts";
import { tstore, estadoTiempo, guardarOrden, hoyCanarias, leerEquipo, type Quien, type Fichas, type Persona } from "./taller.mts";
import { anotar } from "./libro.mts";
import { ipCorta, huella, dispositivo } from "./seguridad.mts";

export const jstore = () => store("jornada");
export type Accion = "entrada" | "pausa" | "reanudar" | "salida";
export type EventoJ = {
  n: number; tipo: Accion | "anulacion"; t: string; reg: string; via: string; por: string; nombre: string;
  ip?: string; h?: string; disp?: string; motivo?: string; anula?: number;
};
export type Dia = { uid: string; fecha: string; eventos: EventoJ[]; incidencias: { t: string; txt: string }[] };
export type EstadoJ = { estado: "fuera" | "trabajando" | "pausa"; fecha: string; desde: string; entrada: string; n: number };

const FUERA: EstadoJ = { estado: "fuera", fecha: "", desde: "", entrada: "", n: 0 };
const kDia = (uid: string, fecha: string) => `dia/${fecha.slice(0, 7)}/${uid}/${fecha.slice(8, 10)}`;
export async function leerEstado(uid: string): Promise<EstadoJ> { return ((await jstore().get("estado/" + uid, { type: "json" }).catch(() => null)) as EstadoJ | null) || { ...FUERA }; }
export async function leerDia(uid: string, fecha: string): Promise<Dia> {
  return ((await jstore().get(kDia(uid, fecha), { type: "json" }).catch(() => null)) as Dia | null) || { uid, fecha, eventos: [], incidencias: [] };
}
const guardarDia = (d: Dia) => jstore().setJSON(kDia(d.uid, d.fecha), d);

// Una jornada abierta de un día anterior que lleva más de 16 h sin salida = «se olvidó de fichar la salida».
// (Así un turno que pasa de medianoche no se corta, pero un olvido no deja a nadie «trabajando» para siempre.)
export function olvidada(e: EstadoJ, ahora = Date.now()) {
  return e.estado !== "fuera" && !!e.fecha && e.fecha < hoyCanarias() && ahora - Date.parse(e.entrada || e.desde) > 16 * 3600e3;
}
export function efectivo(e: EstadoJ): EstadoJ { return olvidada(e) ? { ...FUERA } : e; }

// Eventos que cuentan: se quitan los anulados, y se ordenan por la hora efectiva.
export function validos(ev: EventoJ[]) {
  const anulados = new Set(ev.filter((e) => e.tipo === "anulacion").map((e) => e.anula));
  return ev.filter((e) => e.tipo !== "anulacion" && !anulados.has(e.n)).sort((a, b) => a.t.localeCompare(b.t) || a.n - b.n);
}
function estadoTras(ev: EventoJ[]): "fuera" | "trabajando" | "pausa" {
  const u = validos(ev).pop(); if (!u) return "fuera";
  return u.tipo === "pausa" ? "pausa" : u.tipo === "salida" ? "fuera" : "trabajando";
}

// Cálculo de un día: trabajo efectivo, pausas, horas ordinarias y extraordinarias (sobre la jornada de la persona).
export function calcDia(d: Dia, jornadaH: number, ahora = Date.now()) {
  const ev = validos(d.eventos), hoy = d.fecha === hoyCanarias();
  let trab = 0, pausa = 0, pausas = 0, estado: string = "fuera", desde = 0;
  let entrada = "", salida = "";
  for (const e of ev) {
    const t = Date.parse(e.t);
    if (estado === "trabajando") trab += t - desde; else if (estado === "pausa") pausa += t - desde;
    if (e.tipo === "entrada") { estado = "trabajando"; if (!entrada) entrada = e.t; }
    else if (e.tipo === "pausa") { estado = "pausa"; pausas++; }
    else if (e.tipo === "reanudar") estado = "trabajando";
    else if (e.tipo === "salida") { estado = "fuera"; salida = e.t; }
    desde = t;
  }
  const abierta = estado !== "fuera";
  if (abierta && hoy) { if (estado === "trabajando") trab += ahora - desde; else pausa += ahora - desde; }
  const trabajoMin = Math.max(0, Math.round(trab / 6e4)), pausaMin = Math.max(0, Math.round(pausa / 6e4)), jorMin = Math.round((jornadaH || 8) * 60);
  const incidencias = [...d.incidencias.map((x) => x.txt)];
  if (abierta && !hoy) incidencias.push("Sin salida registrada");
  const correcciones = d.eventos.filter((e) => e.via === "correccion").length, anulaciones = d.eventos.filter((e) => e.tipo === "anulacion").length;
  return {
    fecha: d.fecha, entrada, salida: abierta ? "" : salida, trabajoMin, pausaMin, pausas,
    ordinariasMin: Math.min(trabajoMin, jorMin), extraMin: Math.max(0, trabajoMin - jorMin),
    estado, abierta, incidencias: [...new Set(incidencias)], correcciones, anulaciones,
  };
}

// ---------- el FORM-03 se engancha solo al fichaje ----------
// Pausa o salida de jornada → el trabajo que tenga en marcha se pausa solo (motivo «Comida / descanso» o
// «Fin de jornada»). Al volver (reanudar o entrada del día siguiente) se reanuda solo ese mismo trabajo.
async function cargarOrden(token: string) {
  const [f, o] = await Promise.all([tstore().get("f/" + token, { type: "json" }).catch(() => null), store("ordenes").get("o/" + token, { type: "json" }).catch(() => null)]);
  return { f: f as Fichas | null, o: o as any };
}
export async function autoPausar(q: Quien, salida: boolean) {
  const token = (await tstore().get("activo/" + q.uid).catch(() => null)) as string | null; if (!token) return "";
  const { f, o } = await cargarOrden(token);
  if (!f?.f3 || !o || estadoTiempo(f.f3.eventos) !== "trabajando") return "";
  const t = new Date().toISOString(), motivo = salida ? "Fin de jornada" : "Comida / descanso";
  f.f3.eventos.push({ tipo: "pausa", t, por: q.uid, motivo, nota: `Automática al fichar la ${salida ? "salida" : "pausa"} de jornada`, auto: "jornada" });
  f.audit.push({ t, por: q.uid, nombre: q.nombre, rol: q.rol, accion: "fichaje", detalle: `pausa (${motivo}, automática)` });
  await tstore().delete("activo/" + q.uid).catch(() => {});
  await jstore().set("auto/" + q.uid, token);
  await guardarOrden(f, o);
  return f.num;
}
export async function autoReanudar(q: Quien) {
  const token = (await jstore().get("auto/" + q.uid).catch(() => null)) as string | null; if (!token) return "";
  await jstore().delete("auto/" + q.uid).catch(() => {});
  const { f, o } = await cargarOrden(token);
  if (!f?.f3 || !o || estadoTiempo(f.f3.eventos) !== "pausa") return "";
  const ult = [...f.f3.eventos].sort((a, b) => a.t.localeCompare(b.t)).pop();
  if (!ult || ult.auto !== "jornada") return ""; // alguien la tocó a mano después: no se reanuda sola
  const activo = (await tstore().get("activo/" + q.uid).catch(() => null)) as string | null;
  if (activo && activo !== token) return "";
  const t = new Date().toISOString();
  f.f3.eventos.push({ tipo: "reanudar", t, por: q.uid, motivo: "", nota: "Automática al volver a fichar", auto: "jornada" });
  f.audit.push({ t, por: q.uid, nombre: q.nombre, rol: q.rol, accion: "fichaje", detalle: "reanudar (automática)" });
  await tstore().set("activo/" + q.uid, token);
  await guardarOrden(f, o);
  return f.num;
}

// ---------- fichar (1 petición = 1 fichaje; la hora es la del servidor) ----------
export type Ctx = { ip: string; ua: string; via: string };
export async function fichar(q: Quien, accion: Accion | "", ctx: Ctx) {
  const ahora = new Date().toISOString(), hoy = hoyCanarias();
  let est = await leerEstado(q.uid), olvido = "";
  if (olvidada(est)) { // jornada anterior sin salida: se deja marcada como incidencia (no se inventa ninguna hora)
    const d = await leerDia(q.uid, est.fecha);
    d.incidencias.push({ t: ahora, txt: "Sin salida registrada" }); await guardarDia(d);
    olvido = est.fecha; est = { ...FUERA };
    await jstore().delete("auto/" + q.uid).catch(() => {});
  }
  // Sin acción (QR/NFC): entrada si está fuera, reanudar si está en pausa; si está trabajando hay que elegir.
  const acc: Accion | "" = accion || (est.estado === "fuera" ? "entrada" : est.estado === "pausa" ? "reanudar" : "");
  if (!acc) return { elegir: true, estado: est };
  const ok = (acc === "entrada" && est.estado === "fuera") || (acc === "pausa" && est.estado === "trabajando") || (acc === "reanudar" && est.estado === "pausa") || (acc === "salida" && est.estado !== "fuera");
  if (!ok) return { error: { fuera: "Todavía no has fichado la entrada.", trabajando: "Ya estás trabajando.", pausa: "Estás en pausa: reanuda o ficha la salida." }[est.estado], estado: est, conflicto: true };
  const fecha = est.estado === "fuera" ? hoy : est.fecha;
  const d = await leerDia(q.uid, fecha);
  const ev: EventoJ = { n: d.eventos.length + 1, tipo: acc, t: ahora, reg: ahora, via: ctx.via, por: q.uid, nombre: q.nombre, ip: ipCorta(ctx.ip), h: huella(ctx.ip), disp: dispositivo(ctx.ua) };
  d.eventos.push(ev);
  const nuevo: EstadoJ = acc === "salida" ? { ...FUERA, fecha, n: ev.n, desde: ahora } : { estado: acc === "pausa" ? "pausa" : "trabajando", fecha, desde: ahora, entrada: acc === "entrada" ? ahora : est.entrada, n: ev.n };
  await Promise.all([guardarDia(d), jstore().setJSON("estado/" + q.uid, nuevo)]);
  // Lo que no hace falta para contestar va en paralelo y no retrasa el «fichado»
  const [orden] = await Promise.all([
    (acc === "pausa" || acc === "salida" ? autoPausar(q, acc === "salida") : autoReanudar(q)).catch(() => ""),
    anotar("jornada", q, "fichaje", { uid: q.uid, fecha, n: ev.n, tipo: acc, t: ahora, via: ctx.via }).catch(() => null),
  ]);
  return { ok: true, accion: acc, t: ahora, estado: nuevo, olvido, orden };
}

// «Deshacer» durante 2 minutos (pulsó sin querer): no borra, añade una anulación y vuelve al estado anterior.
export async function deshacer(q: Quien, ctx: Ctx) {
  const est = await leerEstado(q.uid);
  if (!est.fecha || !est.n) return { error: "No hay nada que deshacer." };
  const d = await leerDia(q.uid, est.fecha);
  const ev = d.eventos.find((e) => e.n === est.n);
  if (!ev || ev.tipo === "anulacion" || ev.por !== q.uid || Date.now() - Date.parse(ev.reg) > 120e3) return { error: "Ya no se puede deshacer (solo durante 2 minutos). Pídeselo al gerente." };
  const ahora = new Date().toISOString();
  d.eventos.push({ n: d.eventos.length + 1, tipo: "anulacion", anula: ev.n, t: ahora, reg: ahora, via: ctx.via, por: q.uid, nombre: q.nombre, ip: ipCorta(ctx.ip), h: huella(ctx.ip), disp: dispositivo(ctx.ua), motivo: "Deshecho por el trabajador (pulsación por error)" });
  const v = validos(d.eventos), u = v[v.length - 1], e2 = estadoTras(d.eventos);
  const nuevo: EstadoJ = e2 === "fuera" ? (u ? { ...FUERA, fecha: d.fecha, n: 0, desde: u.t } : { ...FUERA }) : { estado: e2, fecha: d.fecha, desde: u.t, entrada: v.find((x) => x.tipo === "entrada")?.t || u.t, n: 0 };
  await Promise.all([guardarDia(d), jstore().setJSON("estado/" + q.uid, nuevo)]);
  await Promise.all([
    (e2 === "trabajando" ? autoReanudar(q) : autoPausar(q, e2 === "fuera")).catch(() => ""),
    anotar("jornada", q, "deshacer", { uid: q.uid, fecha: d.fecha, anula: ev.n, tipo: ev.tipo }).catch(() => null),
  ]);
  return { ok: true, estado: nuevo, deshecho: ev.tipo };
}

// Corrección del gerente: añadir un fichaje olvidado o anular uno erróneo. Siempre con motivo.
export function isoCanarias(fecha: string, hora: string) {
  const [y, m, dd] = fecha.split("-").map(Number), [h, mi] = hora.split(":").map(Number);
  let t = Date.UTC(y, m - 1, dd, h, mi);
  for (let i = 0; i < 2; i++) { // ajusta el desfase de Canarias (0 h en invierno, +1 h en verano)
    const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Atlantic/Canary", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(t)).split(":").map(Number);
    t -= ((p[0] * 60 + p[1]) - (h * 60 + mi)) * 6e4;
  }
  return new Date(t).toISOString();
}
export async function corregir(q: Quien, b: any) {
  const uid = String(b.uid || ""), fecha = /^\d{4}-\d{2}-\d{2}$/.test(b.fecha) ? b.fecha : "", motivo = String(b.motivo || "").trim().slice(0, 300);
  const pers = (await leerEquipo()).find((x) => x.id === uid);
  if (!pers || !fecha) return { error: "Elige la persona y el día." };
  if (motivo.length < 5) return { error: "Escribe el motivo de la corrección (queda en el registro)." };
  if (fecha > hoyCanarias()) return { error: "No se puede fichar un día futuro." };
  const d = await leerDia(uid, fecha), ahora = new Date().toISOString();
  if (b.anular) {
    const n = Number(b.anular), ev = d.eventos.find((e) => e.n === n && e.tipo !== "anulacion");
    if (!ev || d.eventos.some((e) => e.tipo === "anulacion" && e.anula === n)) return { error: "Ese fichaje no existe o ya está anulado." };
    d.eventos.push({ n: d.eventos.length + 1, tipo: "anulacion", anula: n, t: ahora, reg: ahora, via: "correccion", por: q.uid, nombre: q.nombre, motivo });
  } else {
    const tipo = ["entrada", "pausa", "reanudar", "salida"].includes(b.tipo) ? b.tipo as Accion : null, hora = /^\d{2}:\d{2}$/.test(b.hora) ? b.hora : "";
    if (!tipo || !hora) return { error: "Elige el tipo de fichaje y la hora." };
    const t = isoCanarias(fecha, hora);
    if (Date.parse(t) > Date.now()) return { error: "Esa hora todavía no ha llegado." };
    d.eventos.push({ n: d.eventos.length + 1, tipo, t, reg: ahora, via: "correccion", por: q.uid, nombre: q.nombre, motivo });
  }
  await guardarDia(d);
  // Si es el día que la persona tiene abierto, su estado se recalcula
  const est = await leerEstado(uid);
  if (est.fecha === fecha || (!est.fecha && fecha === hoyCanarias())) {
    const v = validos(d.eventos), u = v[v.length - 1], e2 = estadoTras(d.eventos);
    await jstore().setJSON("estado/" + uid, e2 === "fuera" ? { ...FUERA, fecha, desde: u?.t || "" } : { estado: e2, fecha, desde: u.t, entrada: v.find((x) => x.tipo === "entrada")?.t || u.t, n: 0 });
  }
  await anotar("jornada", q, "correccion", { uid, fecha, ...(b.anular ? { anula: Number(b.anular) } : { tipo: b.tipo, hora: b.hora }), motivo });
  return { ok: true, dia: d, calc: calcDia(d, pers.jornada) };
}

// ---------- el «candado»: el equipo no usa Taller, Inventario ni Caja sin haber fichado ----------
// El gerente con contraseña (uid «gerente») entra sin fichar.
export async function exigirJornada(q: Quien): Promise<Response | null> {
  if (q.uid === "gerente") return null;
  const e = efectivo(await leerEstado(q.uid));
  if (e.estado === "trabajando") return null;
  return json({ error: e.estado === "pausa" ? "Estás en pausa: pulsa «Reanudar jornada» para seguir trabajando." : "Ficha tu entrada para empezar a trabajar.", jornada: e.estado }, 423);
}

// Resumen para la pantalla de fichaje y para la entrada al panel (evita una petición más).
export async function resumenYo(p: Persona | { id: string; jornada: number }) {
  const bruto = await leerEstado(p.id), e = efectivo(bruto);
  const fecha = e.estado !== "fuera" ? e.fecha : hoyCanarias();
  const d = await leerDia(p.id, fecha);
  return { estado: e.estado, desde: e.desde, entrada: e.entrada, hoy: calcDia(d, p.jornada), eventos: d.eventos, jornadaH: p.jornada, olvido: olvidada(bruto) ? bruto.fecha : "", ahora: new Date().toISOString() };
}
