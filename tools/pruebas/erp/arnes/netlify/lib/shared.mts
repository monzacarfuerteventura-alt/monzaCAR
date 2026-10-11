// ALMACÉN DE MENTIRA EN MEMORIA (solo para pruebas): misma interfaz que usa erp.mts
const bd = new Map<string, Map<string, string>>();
export const __reset = () => bd.clear();
export const __dump = (n: string) => bd.get(n) ?? new Map();
export function store(nombre: string) {
  const m = bd.get(nombre) ?? (bd.set(nombre, new Map()), bd.get(nombre)!);
  return {
    async get(k: string, o?: any) { const v = m.get(k); if (v === undefined) return null; return o?.type === "json" ? JSON.parse(v) : v; },
    async setJSON(k: string, v: unknown) { m.set(k, JSON.stringify(v)); },
    async list(o?: { prefix?: string }) { return { blobs: [...m.keys()].filter((k) => k.startsWith(o?.prefix || "")).map((key) => ({ key })) }; },
  };
}
export const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { "content-type": "application/json" } });
export const mismoOrigen = (_r: Request) => true;
export type Car = any;
