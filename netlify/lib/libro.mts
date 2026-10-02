// Libro de registro encadenado genérico: cada anotación lleva la huella SHA-256 de la anterior.
// Si alguien cambia o borra una anotación por fuera del panel, la cadena se rompe y se ve.
import { createHash } from "node:crypto";
import { store } from "./shared.mts";
import type { Quien } from "./taller.mts";

const rid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
/*
  Añade una anotación al libro SIN que dos personas a la vez se pisen el número: antes de escribir se «reserva» el
  número n con una escritura «solo si no existe» (onlyIfNew). Si otra persona lo tenía ya, se espera un momento y se
  vuelve a leer la cabeza (que ella actualiza al terminar). Si tras varios intentos sigue sin liberarse (alguien se
  quedó a medias), se escribe como antes para no bloquear nunca el libro.
  `hacer(head)` devuelve la anotación (sin hash) a partir de la cabeza actual.
*/
export async function anotarSeguro(s: ReturnType<typeof store>, hacer: (head: { hash: string; n: number }) => Record<string, any>) {
  const pad = (n: number) => String(n).padStart(9, "0");
  for (let i = 0; i < 10; i++) {
    const head = ((await s.get("libro-cabeza", { type: "json" }).catch(() => null)) as { hash: string; n: number } | null) || { hash: "0".repeat(64), n: 0 };
    const n = head.n + 1, nonce = crypto.randomUUID(), clave = "slot/" + pad(n);
    const r: any = await s.set(clave, nonce, { onlyIfNew: true }).catch(() => null);
    const mio = !(r && r.modified === false) && (await s.get(clave).catch(() => null)) === nonce;
    if (!mio && i < 9) { await new Promise((ok) => setTimeout(ok, 120 + i * 80)); continue; }
    const e: any = hacer(head);
    e.hash = createHash("sha256").update(JSON.stringify({ ...e, hash: undefined })).digest("hex");
    await s.setJSON(`log/${e.t}-${rid()}`, e);
    await s.setJSON("libro-cabeza", { hash: e.hash, n: e.n });
    return e;
  }
  throw new Error("No se pudo anotar en el libro.");
}
export async function anotar(tienda: string, q: Quien, accion: string, datos: Record<string, unknown>) {
  return anotarSeguro(store(tienda), (head) => ({ n: head.n + 1, t: new Date().toISOString(), uid: q.uid, nombre: q.nombre, rol: q.rol, accion, datos, prev: head.hash }));
}
export async function leerLibro(tienda: string, limite = 400) {
  const s = store(tienda), { blobs } = await s.list({ prefix: "log/" });
  const todas = ((await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" }).catch(() => null)))).filter((e: any) => e && e.hash && e.t) as any[]).sort((a, b) => a.n - b.n);
  let prev = "0".repeat(64); const rotas: number[] = [];
  for (const e of todas) { const h = createHash("sha256").update(JSON.stringify({ ...e, hash: undefined })).digest("hex"); if (h !== e.hash || e.prev !== prev) rotas.push(e.n); prev = e.hash; }
  return { total: todas.length, integro: !rotas.length, rotas, entradas: todas.reverse().slice(0, limite) };
}
