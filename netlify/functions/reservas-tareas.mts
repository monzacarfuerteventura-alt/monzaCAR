import type { Config } from "@netlify/functions";
import { store } from "../lib/shared.mts";
import { caducar } from "../lib/reservas.mts";
import { FOTOS_CLIENTE, RETENCION, borrarFotos } from "../lib/solicitud.mts";

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
  // Una vez al día (hacia las 03:00 UTC): retención de datos personales aunque nadie abra el CRM (RGPD)
  if (new Date().getUTCHours() === 3) await retencion().catch(() => {});
};

async function retencion() {
  const limite = Date.now() - RETENCION;
  const sol = store("solicitudes"), { blobs: bs } = await sol.list({ prefix: "s/" });
  for (const b of bs) {
    const x = (await sol.get(b.key, { type: "json" }).catch(() => null)) as any;
    if (x && Date.parse(x.creado) < limite) { await sol.delete(b.key).catch(() => {}); await borrarFotos(x).catch(() => {}); }
  }
  // reservas terminadas hace más de 2 años: se borran con su justificante bancario
  const rs = store("reservas"), docs = store("reservas-docs"), { blobs: br } = await rs.list({ prefix: "r/" });
  for (const b of br) {
    const r = (await rs.get(b.key, { type: "json" }).catch(() => null)) as any;
    if (r && r.estado !== "iniciada" && Date.parse(r.creado) < limite) { if (r.justificante) await docs.delete(r.justificante).catch(() => {}); await rs.delete(b.key).catch(() => {}); }
  }
}

export const config: Config = { schedule: "7 * * * *" };
