import type { Config as NConfig } from "@netlify/functions";
import { canarias } from "../lib/shared.mts";
import { mk, leerConfig, leerLog, interes, candidatos, leerCoches, aplicarPrecio, telegram } from "../lib/marketing.mts";

/*
  PILOTO AUTOMÁTICO DE MARKETING  ·  cada día a las 09:15 (hora de Canarias, aprox.)
  Si el gerente lo ha activado en el panel (Marketing en vivo → Piloto automático), aplica micro-rebajas
  a los coches con poco interés, respetando SUS límites. Si no está activado, solo deja las sugerencias.
  Cada acción se apunta en el registro, se avisa por Telegram y se puede deshacer desde el panel.
*/
export default async () => {
  const cfg = await leerConfig();
  const [cars, it, log] = await Promise.all([leerCoches(), interes(14), leerLog()]);
  const lista = candidatos(cars, cfg, it);
  const hechas: string[] = [];
  if (cfg.piloto && cfg.maxSemana > 0) {
    const semana = log.filter((a) => a.auto && a.tipo === "rebaja" && Date.now() - Date.parse(a.t) < 7 * 864e5).length;
    for (const c of lista.slice(0, Math.max(0, cfg.maxSemana - semana))) {
      try { await aplicarPrecio(c.id, c.nuevo, { auto: true, motivo: "Piloto automático · " + c.motivo }); hechas.push(`• ${c.titulo}: ${c.precio} € → <b>${c.nuevo} €</b> (−${String(c.pct).replace(".", ",")} %)`); } catch { /* ya no está disponible */ }
    }
  }
  await mk().setJSON("piloto/ultimo", { t: new Date().toISOString(), dia: canarias().fecha, activo: cfg.piloto, candidatos: lista.length, aplicadas: hechas.length });
  if (hechas.length) await telegram(`⚡ <b>Piloto automático de marketing</b>\nHe aplicado ${hechas.length} micro-rebaja${hechas.length > 1 ? "s" : ""} a coches que casi nadie miraba:\n${hechas.join("\n")}\n\nPuedes deshacerlo en el panel → Marketing en vivo → Registro.`);
  return new Response("ok");
};

export const config: NConfig = { schedule: "15 8 * * *" };
