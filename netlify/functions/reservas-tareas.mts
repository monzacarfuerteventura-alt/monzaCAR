import type { Config } from "@netlify/functions";
import { store } from "../lib/shared.mts";
import { caducar } from "../lib/reservas.mts";
import { FOTOS_CLIENTE } from "../lib/solicitud.mts";

// Cada hora: libera las reservas que han caducado (y avisa), recuerda las que llevan 48 h
// y borra las fotos de «presupuesto por foto» que se subieron pero nunca se enviaron.
export default async () => {
  const origin = String((globalThis as any).Netlify?.env?.get("URL") || "https://volcanocars.com");
  await caducar(origin, true).catch(() => {});
  const s = store(FOTOS_CLIENTE);
  const { blobs } = await s.list({ prefix: "pf-" });
  const limite = Date.now() - 24 * 3600e3;
  for (const b of blobs.filter((x) => x.key.endsWith(".meta"))) {
    const m = (await s.get(b.key, { type: "json" }).catch(() => null)) as { t?: string; usada?: string } | null;
    if (m && !m.usada && Date.parse(m.t || "") < limite) {
      await s.delete(b.key.slice(0, -5)).catch(() => {});
      await s.delete(b.key).catch(() => {});
    }
  }
};

export const config: Config = { schedule: "7 * * * *" };
