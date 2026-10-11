import { createHash } from "node:crypto";
// Misma lógica que el libro encadenado real: cada apunte lleva el hash del anterior
export async function anotarSeguro(s: any, hacer: (head: { n: number; hash: string }) => any) {
  const head = (await s.get("log-head", { type: "json" })) || { n: 0, hash: "0".repeat(64) };
  const e = hacer(head);
  e.hash = createHash("sha256").update(JSON.stringify({ ...e, hash: undefined })).digest("hex");
  await s.setJSON("log/" + String(e.n).padStart(8, "0"), e); await s.setJSON("log-head", { n: e.n, hash: e.hash });
}
