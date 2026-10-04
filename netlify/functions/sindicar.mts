import type { Config } from "@netlify/functions";
import { json } from "../lib/shared.mts";
import { permiso, esRespuesta } from "../lib/acceso.mts";
import { pasada, informe } from "../lib/sindica/motor.mts";

/*
  MULTIPUBLICACIÓN · solo gerente
   GET  /api/sindica   → todo lo que enseña la tarjeta «Multipublicación» del panel (Coches).
   POST /api/sindica   → lanza una pasada ahora (con ?simulacro=1 solo calcula el plan, sin enviar nada).
  Variables de Netlify: SINDICA_ACTIVO=1 (envío real; sin ella siempre simulacro) · SINDICA_CANALES=autoscout24 · SINDICA_MAX=10
  · FEED_TOKEN (clave de los feeds) · AS24_URL y AS24_TOKEN (acceso a la API de AutoScout24).
*/
export default async (req: Request) => {
  if (req.method !== "GET" && req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  const q = await permiso(req, "gerente"); if (esRespuesta(q)) return q;
  try {
    if (req.method === "POST") return json(await pasada({ simulacro: new URL(req.url).searchParams.get("simulacro") === "1" }));
    return json(await informe());
  } catch (e: any) { return json({ error: "No se ha podido leer la multipublicación: " + String(e?.message || e).slice(0, 160) }, 500); }
};
export const config: Config = { path: "/api/sindica" };
