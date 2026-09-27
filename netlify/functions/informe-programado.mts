import type { Config } from "@netlify/functions";
import { canarias } from "../lib/shared.mts";
import { generar } from "../lib/informe.mts";

// Informes automáticos: cada lunes el de la semana anterior y cada día 1 el del mes anterior (email + Telegram + panel).
export default async () => {
  const origin = String((globalThis as any).Netlify?.env?.get("URL") || "https://volcanocars.com");
  const { fecha: hoy } = canarias();
  if (new Date(hoy + "T12:00:00Z").getUTCDay() === 1) await generar("semanal", origin, true);
  if (hoy.slice(8) === "01") await generar("mensual", origin, true);
  return new Response("ok");
};

export const config: Config = { schedule: "30 7 * * *" };
