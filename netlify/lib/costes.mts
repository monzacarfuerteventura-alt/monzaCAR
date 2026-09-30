import { jstore } from "./jornada.mts";

/* COSTE POR HORA DE CADA TRABAJADOR (solo estadística del gerente: NO sale dinero de la caja).
   Se guarda en jornada/config/costes = { <uid>: [{ desde: "AAAA-MM-DD", cent: 1450 }, …] }.
   Cada cambio de tarifa vale desde su fecha; los días anteriores conservan la tarifa de entonces. */
export type Tarifa = { desde: string; cent: number };
export type Costes = Record<string, Tarifa[]>;
export async function leerCostes(): Promise<Costes> { return ((await jstore().get("config/costes", { type: "json" }).catch(() => null)) as Costes | null) || {}; }
export async function guardarCostes(c: Costes) { await jstore().setJSON("config/costes", c); }
export function tarifaEn(h: Tarifa[] | undefined, fecha: string): number {
  let v = 0; for (const t of [...(h || [])].sort((a, b) => a.desde.localeCompare(b.desde))) if (t.desde <= fecha) v = t.cent; return v;
}
export const costeMin = (min: number, cent: number) => Math.round((min * cent) / 60);
// Añade el coste a los días y al total de un registro mensual (solo se llama para el gerente)
export function conCoste(personas: any[], costes: Costes) {
  for (const p of personas) {
    let tot = 0;
    for (const d of p.dias || []) { d.costeCent = costeMin(d.trabajoMin, tarifaEn(costes[p.uid], d.fecha)); tot += d.costeCent; }
    p.costeCent = tot; p.tarifaCent = tarifaEn(costes[p.uid], "9999-12-31");
  }
  return personas;
}
