import { store, purgar, cambiarPrecio, canarias, sumarDias, type Car } from "./shared.mts";
import { diaResumido, type Dia } from "./analitica.mts";

/*
  MOTOR DE MARKETING  ·  lógica común del panel (/api/marketing) y del piloto automático (marketing-piloto)
  ---------------------------------------------------------------------------------------------------------
  Qué hace solo (si el gerente activa el piloto automático):
    · Micro-rebaja de coches que llevan tiempo publicados y casi nadie mira, SIEMPRE dentro de los límites
      que pone el gerente (máx. % por rebaja, máx. € por rebaja, rebaja total máxima, coches por semana).
      Cada acción queda apuntada y se puede deshacer con un toque.
  Qué NO hace solo (lo prepara y el gerente lo lanza con un toque):
    · Mensajes de WhatsApp (recontactos, avisos de rebaja a interesados): la ley de comunicaciones comerciales
      y la política de WhatsApp exigen que no sean masivos ni automáticos sin consentimiento.
    · Anuncios de pago (Google/Meta): no hay conexión con sus cuentas; el motor da los enlaces medibles (UTM).
*/

export type Config = {
  piloto: boolean;          // el motor puede aplicar rebajas él solo
  maxPct: number;           // % máximo de cada micro-rebaja
  maxEur: number;           // € máximos de cada micro-rebaja
  maxTotalPct: number;      // rebaja acumulada máxima sobre el precio original
  diasMin: number;          // días publicado antes de poder rebajarlo
  diasEntre: number;        // días mínimos entre dos rebajas del mismo coche
  umbral: number;           // personas distintas al día (media 14 días) por debajo de la cual se considera «poco interés»
  maxSemana: number;        // rebajas automáticas como mucho por semana
};
export const CONFIG_BASE: Config = { piloto: false, maxPct: 3, maxEur: 400, maxTotalPct: 8, diasMin: 30, diasEntre: 14, umbral: 1, maxSemana: 2 };
export type Accion = { id: string; t: string; tipo: "rebaja" | "deshacer"; coche: string; titulo: string; de: number; a: number; auto: boolean; motivo: string; deshecha?: string };
export type Gasto = { id: string; campana: string; canal: string; gasto: number; desde: string; hasta: string; nota?: string };

export const mk = () => store("marketing");
const num = (v: unknown, min: number, max: number, def: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };

export async function leerConfig(): Promise<Config> {
  const c = ((await mk().get("config", { type: "json" }).catch(() => null)) as Partial<Config> | null) || {};
  return { ...CONFIG_BASE, ...c };
}
export function limpiarConfig(i: any): Config {
  return {
    piloto: i?.piloto === true,
    maxPct: num(i?.maxPct, 1, 10, CONFIG_BASE.maxPct),
    maxEur: num(i?.maxEur, 50, 2000, CONFIG_BASE.maxEur),
    maxTotalPct: num(i?.maxTotalPct, 1, 20, CONFIG_BASE.maxTotalPct),
    diasMin: Math.round(num(i?.diasMin, 7, 180, CONFIG_BASE.diasMin)),
    diasEntre: Math.round(num(i?.diasEntre, 7, 60, CONFIG_BASE.diasEntre)),
    umbral: num(i?.umbral, 0.2, 20, CONFIG_BASE.umbral),
    maxSemana: Math.round(num(i?.maxSemana, 0, 10, CONFIG_BASE.maxSemana)),
  };
}
export async function leerLog(): Promise<Accion[]> { return ((await mk().get("log", { type: "json" }).catch(() => null)) as Accion[] | null) || []; }
export async function apuntar(a: Accion) { const l = await leerLog(); l.unshift(a); await mk().setJSON("log", l.slice(0, 300)); }

// Interés de los últimos 14 días por coche: personas distintas (suma diaria) y solicitudes
export async function interes(dias = 14) {
  const { fecha: hoy } = canarias();
  const fechas = Array.from({ length: dias }, (_, i) => sumarDias(hoy, -i - 1));
  const res: Dia[] = [];
  for (let i = 0; i < fechas.length; i += 7) res.push(...(await Promise.all(fechas.slice(i, i + 7).map((f) => diaResumido(f, hoy)))));
  const personas: Record<string, number> = {};
  for (const d of res) for (const [k, v] of Object.entries(d.cochesV || {})) personas[k] = (personas[k] || 0) + v;
  const leads: Record<string, number> = {};
  const s = store("solicitudes");
  const { blobs } = await s.list({ prefix: "s/" });
  const desde = Date.now() - dias * 864e5;
  const recientes = blobs.filter((b) => Date.parse(b.key.slice(2, 6) + "-" + b.key.slice(6, 8) + "-" + b.key.slice(8, 10)) >= desde - 864e5);
  for (let i = 0; i < recientes.length; i += 25) {
    const r = await Promise.all(recientes.slice(i, i + 25).map((b) => s.get(b.key, { type: "json" }).catch(() => null)));
    for (const x of r as any[]) if (x?.coche?.id && Date.parse(x.creado) >= desde) leads[x.coche.id] = (leads[x.coche.id] || 0) + 1;
  }
  return { dias, personas, leads };
}

export type Candidato = { id: string; titulo: string; precio: number; nuevo: number; pct: number; diasPublicado: number; personasDia: number; leads: number; motivo: string };
export function candidatos(cars: Car[], cfg: Config, it: { dias: number; personas: Record<string, number>; leads: Record<string, number> }, ahora = Date.now()): Candidato[] {
  const out: Candidato[] = [];
  for (const c of cars) {
    if (c.estado !== "disponible" || !c.precio) continue;
    const diasPub = Math.floor((ahora - Date.parse(c.creado)) / 864e5);
    if (diasPub < cfg.diasMin) continue;
    const ult = (c.precios || []).slice(-1)[0];
    if (ult && ahora - Date.parse(ult.t) < cfg.diasEntre * 864e5 && (c.precios || []).length > 1) continue;
    const pd = (it.personas[c.id] || 0) / it.dias, ld = it.leads[c.id] || 0;
    if (pd >= cfg.umbral || ld > 0) continue;
    const base = c.rebaja?.anterior || c.precio;
    const suelo = Math.ceil(base * (1 - cfg.maxTotalPct / 100));
    const bajada = Math.min(c.precio * cfg.maxPct / 100, cfg.maxEur);
    let nuevo = Math.ceil((c.precio - bajada + 10) / 50) * 50 - 10; // redondeado (termina en …40 o …90) y nunca pasa del límite
    if (nuevo < suelo) nuevo = suelo;
    if (nuevo >= c.precio) continue;
    out.push({ id: c.id, titulo: `${c.marca} ${c.modelo}${c.version ? " " + c.version : ""}`, precio: c.precio, nuevo, pct: Math.round((1 - nuevo / c.precio) * 1000) / 10, diasPublicado: diasPub, personasDia: Math.round(pd * 10) / 10, leads: ld,
      motivo: `${diasPub} días publicado · ${String(Math.round(pd * 10) / 10).replace(".", ",")} personas/día · sin solicitudes en ${it.dias} días` });
  }
  return out.sort((a, b) => a.personasDia - b.personasDia || b.diasPublicado - a.diasPublicado);
}

export async function leerCoches(): Promise<Car[]> { return ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null) || []; }

// Aplica (o deshace) un precio de forma segura: vuelve a leer la lista justo antes de guardar.
export async function aplicarPrecio(id: string, nuevo: number, opts: { auto: boolean; motivo: string; tipo?: "rebaja" | "deshacer" }) {
  const list = await leerCoches();
  const i = list.findIndex((c) => c.id === id);
  if (i < 0) throw new Error("Ese coche ya no existe.");
  const c = list[i];
  if (c.estado !== "disponible" && opts.tipo !== "deshacer") throw new Error("Ese coche ya no está disponible.");
  const de = c.precio;
  list[i] = cambiarPrecio(c, nuevo, { auto: opts.auto, regla: opts.motivo });
  await store("monzacar").setJSON("coches", list);
  await purgar(["coches"]);
  const a: Accion = { id: crypto.randomUUID().slice(0, 8), t: new Date().toISOString(), tipo: opts.tipo || "rebaja", coche: id, titulo: `${c.marca} ${c.modelo}`, de, a: nuevo, auto: opts.auto, motivo: opts.motivo };
  await apuntar(a);
  return { accion: a, coche: list[i] };
}

export async function telegram(texto: string) {
  const env = (k: string) => String((globalThis as any).Netlify?.env?.get(k) || "").trim();
  const token = env("TELEGRAM_BOT_TOKEN"), chat = env("TELEGRAM_CHAT_ID");
  if (!token || !chat) return false;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: texto, parse_mode: "HTML", disable_web_page_preview: true }), signal: AbortSignal.timeout(8000),
  }).catch(() => {});
  return true;
}
