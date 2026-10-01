import type { Config } from "@netlify/functions";
import { store } from "../lib/shared.mts";

/*
  SALUD DE LA WEB (actualización 7) · GET /api/salud-web
  Responde en menos de un segundo si el servidor y la base de datos funcionan, y si la copia automática de anoche se hizo.
  No muestra datos del negocio. Sirve para dos cosas:
   1) el instalador la usa para comprobar que la versión nueva se ha publicado bien;
   2) un vigilante gratuito (UptimeRobot) puede avisarte al móvil/email si la web se cae o si dejan de hacerse las copias.
  Respuesta: {"ok":true,"v":"8","copia":"ok"}   (copia: ok · antigua (más de 36 h) · con-fallos · sin-datos)
  Si la base de datos no responde devuelve 503 y "ok":false.
  La versión (v) se sube a mano en cada actualización; el instalador comprueba que coincide.
*/
const VERSION = "12";
export default async (req: Request) => {
  if (req.method !== "GET" && req.method !== "HEAD") return new Response("Método no permitido", { status: 405 });
  let bd = false, copia = "sin-datos";
  try {
    const e = (await store("copias").get("estado.json", { type: "json" })) as { t?: string; ok?: boolean } | null;
    bd = true;
    if (e && e.t) { const h = (Date.now() - Date.parse(e.t)) / 36e5; copia = e.ok === false ? "con-fallos" : h <= 36 ? "ok" : "antigua"; }
  } catch { bd = false; }
  return new Response(JSON.stringify({ ok: bd, v: VERSION, copia }), { status: bd ? 200 : 503, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" } });
};
export const config: Config = { path: "/api/salud-web", rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] } };
