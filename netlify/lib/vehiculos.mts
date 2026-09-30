// =====================================================================
// COCHES PROPIOS · control interno de cada coche que entra al taller para venderlo
// Todo es PRIVADO: vive en su propia tienda «vehiculos» (Netlify Blobs) y NUNCA se mezcla con la lista pública de
// coches (`monzacar/coches`). Nada de aquí sale en la web ni en /inventario.json.
// Importes en céntimos (igual que Finanzas e Inventario).
// Las piezas salen del Inventario (descuento de stock con su movimiento); las horas y otros costes se anotan aquí;
// Finanzas suma todo al «reacondicionamiento» del coche cuando la ficha está enlazada a un coche de la web.
// =====================================================================
import { store } from "./shared.mts";

export const v = () => store("vehiculos");
export const FASES = ["entrada", "reparacion", "calidad", "listo", "vendido"] as const;
export type Fase = (typeof FASES)[number];
export const FASE_TXT: Record<Fase, string> = {
  entrada: "Entrada / dañado", reparacion: "En reparación", calidad: "Control de calidad", listo: "Listo para venta (interno)", vendido: "Vendido",
};

export type Actualizacion = { id: string; t: string; uid: string; nombre: string; rol: string; tipo: "nota" | "tecnica" | "foto" | "fase" | "sistema"; txt: string; fotos: string[] };
export type Hora = { id: string; t: string; fecha: string; uid: string; nombre: string; min: number; nota: string; costeHora: number; anulada: null | { t: string; por: string; motivo: string } };
export type Coste = { id: string; t: string; fecha: string; uid: string; nombre: string; concepto: string; importe: number; estado: "pendiente" | "aprobado" | "rechazado"; decidido: null | { t: string; por: string; motivo: string }; anulado: null | { t: string; por: string; motivo: string } };
export type PiezaV = { mov: string; t: string; pieza: string; sku: string; nombre: string; cantidad: number; coste: number; devuelto: number; uid: string; nombre_por: string };
export type Ficha = {
  id: string; ref: string; matricula: string; vin: string; marca: string; modelo: string; version: string; anio: number; km: number; color: string;
  fase: Fase; creado: string; actualizado: string; entrada: string; // entrada = día en que llegó (AAAA-MM-DD)
  compra: number; precioPrevisto: number;   // céntimos; los ve solo el gerente. Precio previsto SIN IGIC
  coche: string;                            // id del coche de la web al que está enlazado (opcional, solo para Finanzas)
  danos: string; ultimaCalidad: null | { t: string; uid: string; nombre: string };
  actualizaciones: Actualizacion[]; horas: Hora[]; costes: Coste[]; piezas: PiezaV[];
  vendido: null | { fecha: string; base: number };
};
export type Cfg = { costeHora: number }; // coste interno por hora de mano de obra (céntimos), lo pone el gerente

export const rid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
export const ahora = () => new Date().toISOString();
export async function leerCfg(): Promise<Cfg> { return { costeHora: 0, ...(((await v().get("cfg", { type: "json" }).catch(() => null)) as Partial<Cfg> | null) || {}) }; }
export async function leerFicha(id: string): Promise<Ficha | null> {
  return /^[a-z0-9]{12}$/.test(id) ? (((await v().get("f/" + id, { type: "json" }).catch(() => null)) as Ficha | null) || null) : null;
}
export async function guardarFicha(f: Ficha) { f.actualizado = ahora(); await v().setJSON("f/" + f.id, f); }
export async function listarFichas(): Promise<Ficha[]> {
  const { blobs } = await v().list({ prefix: "f/" });
  return ((await Promise.all(blobs.map((b) => v().get(b.key, { type: "json" }).catch(() => null)))).filter(Boolean) as Ficha[]);
}
export async function siguienteRef(): Promise<string> {
  const k = "contador", n = (Number(await v().get(k).catch(() => 0)) || 0) + 1;
  await v().set(k, String(n));
  return `VP-${new Date().getFullYear()}-${String(n).padStart(3, "0")}`;
}

// ---------- costes ----------
export const minTotal = (f: Ficha) => f.horas.filter((h) => !h.anulada).reduce((a, h) => a + h.min, 0);
export const costeHoras = (f: Ficha) => f.horas.filter((h) => !h.anulada).reduce((a, h) => a + Math.round((h.min / 60) * h.costeHora), 0);
export const costePiezas = (f: Ficha) => f.piezas.reduce((a, p) => a + Math.round(Math.max(0, p.cantidad - p.devuelto) * p.coste), 0);
export const costeOtros = (f: Ficha) => f.costes.filter((c) => c.estado === "aprobado" && !c.anulado).reduce((a, c) => a + c.importe, 0);
export const costePendiente = (f: Ficha) => f.costes.filter((c) => c.estado === "pendiente" && !c.anulado).reduce((a, c) => a + c.importe, 0);
export const costeReacond = (f: Ficha) => costeHoras(f) + costePiezas(f) + costeOtros(f);
export const desglose = (f: Ficha) => {
  const horas = costeHoras(f), piezas = costePiezas(f), otros = costeOtros(f), reac = horas + piezas + otros;
  const previsto = f.vendido ? f.vendido.base : f.precioPrevisto;
  return { horas, piezas, otros, pendiente: costePendiente(f), reacondicionamiento: reac, compra: f.compra, total: f.compra + reac, previsto, beneficio: previsto ? previsto - f.compra - reac : null };
};

/** Para Finanzas: por cada coche de la web enlazado a una ficha, su reacondicionamiento interno y su compra. */
export async function costesPorCoche(): Promise<Map<string, { reac: number; compra: number }>> {
  const m = new Map<string, { reac: number; compra: number }>();
  for (const f of await listarFichas().catch(() => [] as Ficha[])) {
    if (!f.coche) continue;
    const x = m.get(f.coche) || { reac: 0, compra: 0 };
    x.reac += costeReacond(f); x.compra += f.compra; m.set(f.coche, x);
  }
  return m;
}

/** Lo llama el Inventario cuando una pieza sale para un coche propio (o vuelve). El movimiento del almacén sigue siendo la fuente de verdad. */
export async function anotarPieza(f: Ficha, e: Omit<PiezaV, "devuelto">, quien: { uid: string; nombre: string; rol: string }) {
  f.piezas.push({ ...e, devuelto: 0 });
  f.actualizaciones.push({ id: rid(), t: ahora(), uid: quien.uid, nombre: quien.nombre, rol: quien.rol, tipo: "sistema", txt: `Pieza del inventario: ${e.cantidad} × ${e.nombre} (${e.sku})`, fotos: [] });
  await guardarFicha(f);
}
export async function devolverPieza(f: Ficha, mov: string, n: number, quien: { uid: string; nombre: string; rol: string }, motivo: string) {
  const p = f.piezas.find((x) => x.mov === mov); if (!p) return;
  p.devuelto = Math.round((p.devuelto + n) * 100) / 100;
  f.actualizaciones.push({ id: rid(), t: ahora(), uid: quien.uid, nombre: quien.nombre, rol: quien.rol, tipo: "sistema", txt: `Devuelto al inventario: ${n} × ${p.nombre}. ${motivo}`, fotos: [] });
  await guardarFicha(f);
}

// =====================================================================
// FICHAJE DE TAREAS POR COCHE (FORM-03 para coches propios: reparación, mantenimiento, limpieza/preparación)
// Mismas reglas que el FORM-03 de las órdenes de clientes: hora del servidor, pausas con motivo, un solo trabajo
// a la vez por persona, desviación (% y minutos), causas A a I y visto bueno del gerente. Al terminar, el tiempo
// neto pasa solo a las horas de la ficha del coche (y de ahí a Finanzas).
// =====================================================================
import { tstore, estadoTiempo, calculo, leerConfig, type Evento } from "./taller.mts";

export const TIPOS_TAREA = { reparacion: "Reparación", mantenimiento: "Mantenimiento", limpieza: "Limpieza / preparación" } as const;
export type TipoTarea = keyof typeof TIPOS_TAREA;
export type Tarea = {
  id: string; vehiculo: string; ref: string; matricula: string; coche: string; tipo: TipoTarea; uid: string; nombre: string; estMin: number;
  eventos: Evento[]; creada: string;
  justificacion: null | { codigos: string[]; explicacion: string; t: string; por: string };
  cierre: null | { t: string; por: string; pin: boolean; netoMin: number; desvPct: number; desvMin: number };
  vistoBueno: null | { t: string; por: string; nota: string };
};
export const leerTarea = async (id: string) => (/^[a-z0-9]{12}$/.test(id) ? (((await v().get("t/" + id, { type: "json" }).catch(() => null)) as Tarea | null) || null) : null);
export const guardarTarea = (t: Tarea) => v().setJSON("t/" + t.id, t);
export async function listarTareas(): Promise<Tarea[]> {
  const { blobs } = await v().list({ prefix: "t/" });
  return ((await Promise.all(blobs.map((b) => v().get(b.key, { type: "json" }).catch(() => null)))).filter(Boolean) as Tarea[]);
}
export const calculoTarea = async (t: Tarea, ahora = Date.now()) => calculo({ mecanico: t.uid, tarifa: 0, estMin: t.estMin, tipo: t.tipo, hoja: "", eventos: t.eventos } as any, await leerConfig(), ahora)!;
export const etiquetaTarea = (t: Tarea) => `${TIPOS_TAREA[t.tipo]} · ${t.matricula || t.ref}`;

/** ¿Tiene esa persona una tarea de coche propio trabajando ahora? Devuelve su etiqueta (lo usa el FORM-03 de las órdenes para no fichar dos a la vez). */
export async function tareaEnMarcha(id: string): Promise<string> {
  const t = await leerTarea(id);
  return t && estadoTiempo(t.eventos) === "trabajando" ? etiquetaTarea(t) : "";
}
/** Fichaje de jornada (pausa o salida): pone en pausa sola la tarea que estaba en marcha. Devuelve su etiqueta. */
export async function tareaAutoPausar(q: { uid: string; nombre: string; rol: string }, id: string, salida: boolean): Promise<string> {
  const t = await leerTarea(id); if (!t || estadoTiempo(t.eventos) !== "trabajando") return "";
  t.eventos.push({ tipo: "pausa", t: ahora(), por: q.uid, motivo: salida ? "Otro" : "Comida / descanso", nota: `Automática al fichar la ${salida ? "salida" : "pausa"} de jornada`, auto: "jornada" });
  await guardarTarea(t); return etiquetaTarea(t);
}
export async function tareaAutoReanudar(q: { uid: string }, id: string): Promise<string> {
  const t = await leerTarea(id); if (!t || estadoTiempo(t.eventos) !== "pausa") return "";
  const ult = t.eventos[t.eventos.length - 1]; if (!ult || ult.auto !== "jornada") return "";
  t.eventos.push({ tipo: "reanudar", t: ahora(), por: q.uid, motivo: "", nota: "Automática al volver a fichar", auto: "jornada" });
  await guardarTarea(t); return etiquetaTarea(t);
}
