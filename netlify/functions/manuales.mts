import type { Config } from "@netlify/functions";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { json } from "../lib/shared.mts";
import { permiso, esRespuesta } from "../lib/acceso.mts";

/*
  MANUALES DE SISTEMAS (MO-00): los 11 PDF de procedimientos son documentos INTERNOS. Ya no están en la carpeta pública:
  viven en netlify/privado/sistemas y solo los entrega esta función a quien haya entrado en el panel (contraseña del
  gerente o usuario + PIN del equipo).   GET /api/manual/VolcanoCars-S01-Taller-recepcion-a-entrega
*/
const NOMBRE = /^VolcanoCars-S(0[0-9]|1[01])-[A-Za-z0-9.-]+$/;
export default async (req: Request) => {
  if (req.method !== "GET") return json({ error: "Método no permitido" }, 405);
  const q = await permiso(req, "equipo"); if (esRespuesta(q)) return q;
  const f = decodeURIComponent(new URL(req.url).pathname.split("/").pop() || "").replace(/\.pdf$/i, "");
  if (!NOMBRE.test(f)) return json({ error: "Manual no encontrado" }, 404);
  const raices = [process.env.LAMBDA_TASK_ROOT, process.cwd(), join(process.cwd(), "..")].filter(Boolean) as string[];
  for (const r of raices) {
    try {
      const b = await readFile(join(r, "netlify", "privado", "sistemas", f + ".pdf"));
      return new Response(b, { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="${f}.pdf"`, "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow", "x-content-type-options": "nosniff" } });
    } catch { /* prueba la siguiente ubicación */ }
  }
  return json({ error: "Manual no encontrado" }, 404);
};
export const config: Config = { path: "/api/manual/:archivo", rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] } };
