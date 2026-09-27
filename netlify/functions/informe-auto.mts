import type { Config } from "@netlify/functions";
import { json, isAdmin } from "../lib/shared.mts";
import { generar, type Informe } from "../lib/informe.mts";
import { mk } from "../lib/marketing.mts";
import { permiso, esRespuesta } from "../lib/acceso.mts";

/*
  INFORMES AUTOMÁTICOS (panel, solo gerente). Los genera solos «informe-programado» (lunes y día 1).
  - GET  /api/informes-auto        → lista de informes guardados
  - GET  /api/informes-auto/:id    → un informe
  - POST /api/informes-auto        → { tipo, enviar } genera ahora el último periodo cerrado
*/
export default async (req: Request) => {
  { const _q = await permiso(req, "gerente"); if (esRespuesta(_q)) return _q; }
  const url = new URL(req.url);
  const id = decodeURIComponent(url.pathname.split("/").filter(Boolean)[2] || "");
  if (req.method === "GET" && !id) {
    const { blobs } = await mk().list({ prefix: "informes/" });
    return json(blobs.map((b) => b.key.slice(9)).sort((a, b) => b.split("-").slice(1).join("-").localeCompare(a.split("-").slice(1).join("-")) || a.localeCompare(b)).slice(0, 60));
  }
  if (req.method === "GET") {
    const inf = (await mk().get("informes/" + id, { type: "json" }).catch(() => null)) as Informe | null;
    return inf ? json(inf) : json({ error: "No existe ese informe." }, 404);
  }
  if (req.method === "POST") {
    const b = await req.json().catch(() => ({}));
    return json(await generar(b.tipo === "mensual" ? "mensual" : "semanal", url.origin, b.enviar === true));
  }
  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = { path: ["/api/informes-auto", "/api/informes-auto/:id"], rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] } };
