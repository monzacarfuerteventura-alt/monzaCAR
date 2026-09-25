import type { Config } from "@netlify/functions";
import { store } from "../lib/shared.mts";

// Cada noche: borra de las conversaciones del agente de WhatsApp los mensajes de hace más de 48 h
// (así lo dice la política de privacidad). Deja solo lo mínimo para funcionar: si ya se presentó
// como IA, el «silencio» cuando contesta una persona y los ids de mensajes ya atendidos.
const OLVIDO_MS = 48 * 3600e3;
export default async () => {
  const s = store("whatsapp");
  const { blobs } = await s.list({ prefix: "c/" });
  for (let i = 0; i < blobs.length; i += 25) {
    await Promise.all(blobs.slice(i, i + 25).map(async (b: { key: string }) => {
      const c = (await s.get(b.key, { type: "json" }).catch(() => null)) as { msgs?: { t: number }[]; presentado?: number; humanoHasta?: number; ultimaCita?: string } | null;
      if (!c) return;
      const msgs = (c.msgs || []).filter((m) => Date.now() - m.t < OLVIDO_MS);
      const activo = msgs.length || (c.presentado && Date.now() - c.presentado < OLVIDO_MS) || (c.humanoHasta && c.humanoHasta > Date.now());
      if (!activo) return s.delete(b.key);
      if (msgs.length !== (c.msgs || []).length) await s.setJSON(b.key, { ...c, msgs, nombre: msgs.length ? (c as any).nombre : undefined });
    }));
  }
};

export const config: Config = { schedule: "35 3 * * *" };
