// Libro de registro encadenado genérico: cada anotación lleva la huella SHA-256 de la anterior.
// Si alguien cambia o borra una anotación por fuera del panel, la cadena se rompe y se ve.
import { createHash } from "node:crypto";
import { store } from "./shared.mts";
import type { Quien } from "./taller.mts";

const rid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
export async function anotar(tienda: string, q: Quien, accion: string, datos: Record<string, unknown>) {
  const s = store(tienda);
  const head = ((await s.get("libro-cabeza", { type: "json" }).catch(() => null)) as { hash: string; n: number } | null) || { hash: "0".repeat(64), n: 0 };
  const e: any = { n: head.n + 1, t: new Date().toISOString(), uid: q.uid, nombre: q.nombre, rol: q.rol, accion, datos, prev: head.hash };
  e.hash = createHash("sha256").update(JSON.stringify({ ...e, hash: undefined })).digest("hex");
  await s.setJSON(`log/${e.t}-${rid()}`, e);
  await s.setJSON("libro-cabeza", { hash: e.hash, n: e.n });
  return e;
}
export async function leerLibro(tienda: string, limite = 400) {
  const s = store(tienda), { blobs } = await s.list({ prefix: "log/" });
  const todas = ((await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" }).catch(() => null)))).filter((e: any) => e && e.hash && e.t) as any[]).sort((a, b) => a.n - b.n);
  let prev = "0".repeat(64); const rotas: number[] = [];
  for (const e of todas) { const h = createHash("sha256").update(JSON.stringify({ ...e, hash: undefined })).digest("hex"); if (h !== e.hash || e.prev !== prev) rotas.push(e.n); prev = e.hash; }
  return { total: todas.length, integro: !rotas.length, rotas, entradas: todas.reverse().slice(0, limite) };
}
