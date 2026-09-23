import { store } from "./shared.mts";

// Analítica propia: helpers comunes a /api/ev, /api/stats y a la compactación nocturna.
export const TIPOS = ["pv", "car", "clk", "frm", "vid"];
export const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|whatsapp|curl|wget|python|axios|node-fetch/i;
export const FUENTE: Record<string, string> = {
  "Directo": "d", "Buscadores": "b", "Google Ads": "a", "Ficha de Google": "m", "Redes sociales": "s",
  "Portal de coches": "p", "Otra web": "w", "Email": "e", "Código QR": "q",
};
export const FUENTE_NOMBRE: Record<string, string> = Object.fromEntries(Object.entries(FUENTE).map(([k, v]) => [v, k]));
export const limpio = (v: unknown, max = 40) => String(v ?? "").replace(/[^a-zA-Z0-9._-]/g, "").slice(0, max);

let salCache: { dia: string; sal: string } | null = null;
export async function salDelDia(dia: string) {
  if (salCache?.dia === dia) return salCache.sal;
  const s = store("analitica");
  let sal = (await s.get("salt/" + dia)) as string | null;
  if (!sal) { sal = crypto.randomUUID() + crypto.randomUUID(); await s.set("salt/" + dia, sal); }
  salCache = { dia, sal };
  return sal;
}

export type Dia = {
  v: number; pv: number; ent: number;
  vistas: Record<string, number>; fuentes: Record<string, number>; dev: Record<string, number>; lang: Record<string, number>;
  coches: Record<string, number>; cochesV: Record<string, number>; clk: Record<string, number>; clkV: number;
  frm: Record<string, number>; horas: number[]; vid: number;
};
const vacio = (): Dia => ({ v: 0, pv: 0, ent: 0, vistas: {}, fuentes: {}, dev: {}, lang: {}, coches: {}, cochesV: {}, clk: {}, clkV: 0, frm: {}, horas: Array(24).fill(0), vid: 0 });

// Suma un día a partir de los nombres de las claves
export function resumir(keys: string[]): Dia {
  const d = vacio();
  const vis = new Set<string>(), visClk = new Set<string>(), frm = new Map<string, Set<string>>(), cv = new Map<string, Set<string>>();
  const primera = new Map<string, { f: string; dev: string; l: string }>();
  const inc = (o: Record<string, number>, k: string, n = 1) => { if (k) o[k] = (o[k] || 0) + n; };
  for (const key of keys) {
    const p = key.split("/").pop()!.split("~");
    if (p.length < 9) continue;
    const [ts, , t, a, b, f, dev, l, vh] = p;
    vis.add(vh);
    if (!primera.has(vh)) primera.set(vh, { f: "", dev, l });
    if (f && !primera.get(vh)!.f) primera.get(vh)!.f = f;
    if (t === "pv") {
      d.pv++; inc(d.vistas, a);
      if (b === "e") d.ent++;
      const h = +ts.slice(0, 2); if (h >= 0 && h < 24) d.horas[h]++;
    } else if (t === "car") {
      inc(d.coches, a); if (!cv.has(a)) cv.set(a, new Set()); cv.get(a)!.add(vh);
    } else if (t === "clk") {
      inc(d.clk, a); if (["wa", "tel", "mail", "mapa"].includes(a)) visClk.add(vh); // compartir no cuenta como contacto
    } else if (t === "frm") {
      if (!frm.has(a)) frm.set(a, new Set()); frm.get(a)!.add(vh);
    } else if (t === "vid") d.vid++;
  }
  d.v = vis.size; d.clkV = visClk.size;
  for (const [k, s] of frm) d.frm[k] = s.size;
  for (const [k, s] of cv) d.cochesV[k] = s.size;
  for (const x of primera.values()) { inc(d.fuentes, FUENTE_NOMBRE[x.f] || x.f || "Directo"); inc(d.dev, x.dev === "m" ? "Móvil" : "Ordenador"); inc(d.lang, x.l === "en" ? "Inglés" : "Español"); }
  return d;
}

export async function clavesDelDia(dia: string) {
  const { blobs } = await store("analitica").list({ prefix: `ev/${dia}/` });
  return blobs.map((b) => b.key);
}

export async function diaResumido(dia: string, hoy: string): Promise<Dia> {
  const s = store("analitica");
  if (dia < hoy) {
    const hecho = (await s.get("agg/" + dia, { type: "json" })) as Dia | null;
    if (hecho) return hecho;
  }
  const d = resumir(await clavesDelDia(dia));
  if (dia < hoy) await s.setJSON("agg/" + dia, d);
  return d;
}

