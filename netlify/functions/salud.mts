import type { Config } from "@netlify/functions";
import { store } from "../lib/shared.mts";

/*
  SALUD DE LA WEB · GET /api/salud
  Para los monitores externos (UptimeRobot, Better Stack…) y para el vigilante interno.
  Comprueba que la función arranca y que la base de datos (Netlify Blobs) responde, y cuánto tarda.
  Devuelve 200 con {"ok":true} si todo va bien y 503 si algo falla o va muy lento. No enseña datos privados.
*/
const LENTO_MS = 3000;

export default async () => {
  const t0 = Date.now();
  let ok = true, coches = 0, error = "";
  try {
    const lista = (await store("monzacar").get("coches", { type: "json" })) as unknown[] | null;
    coches = Array.isArray(lista) ? lista.length : 0;
  } catch (e) { ok = false; error = "base de datos no responde"; }
  const ms = Date.now() - t0;
  if (ms > LENTO_MS) { ok = false; error = error || "base de datos lenta"; }
  return new Response(JSON.stringify({ ok, ms, coches, error: error || undefined, hora: new Date().toISOString() }), {
    status: ok ? 200 : 503,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
};

export const config: Config = {
  path: "/api/salud",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
