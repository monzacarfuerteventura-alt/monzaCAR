import type { Config } from "@netlify/functions";
import { store } from "../lib/shared.mts";
import { ALMACENES, SOLO_NOMBRES, volcar } from "../lib/copia.mts";

/*
  COPIA DE SEGURIDAD AUTOMÁTICA (27-09-2026) · todos los días a las 03:05 (hora UTC)
  Guarda una foto completa de los datos del negocio en el almacén «copias» (diaria/AAAA-MM-DD.json)
  y conserva las últimas 30. Se descargan desde el panel con /api/copia?auto=lista y ?auto=AAAA-MM-DD
  (solo el gerente). El código de la web ya tiene su copia en GitHub en cada publicación.
*/
const GUARDAR = 30;

export default async () => {
  const datos: Record<string, unknown> = {};
  for (const n of ALMACENES) datos[n] = await volcar(n).catch((e) => ({ error: String(e?.message || e) }));
  const archivos: Record<string, string[]> = {};
  for (const n of SOLO_NOMBRES) archivos[n] = await store(n).list().then((r) => r.blobs.map((b) => b.key)).catch(() => []);
  const dia = new Date().toISOString().slice(0, 10);
  const s = store("copias");
  await s.set("diaria/" + dia + ".json", JSON.stringify({ tipo: "volcano-cars-copia", version: 1, automatica: true, generado: new Date().toISOString(), datos, archivos }));
  const { blobs } = await s.list({ prefix: "diaria/" });
  const viejas = blobs.map((b) => b.key).sort().reverse().slice(GUARDAR);
  await Promise.all(viejas.map((k) => s.delete(k)));
  return new Response("ok");
};

export const config: Config = { schedule: "5 3 * * *" };
