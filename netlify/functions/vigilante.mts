import type { Config } from "@netlify/functions";
import { store } from "../lib/shared.mts";

/*
  VIGILANTE · se ejecuta solo cada 10 minutos (función programada de Netlify)
  Abre las páginas clave como lo haría un cliente y mide cuánto tardan. Si algo falla o va lento,
  avisa por Telegram (TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID, las mismas de los avisos de clientes).
  Solo avisa cuando cambia el estado (cae / se recupera), así no llena el móvil de mensajes.
  Guarda las últimas 144 mediciones (24 h) en el almacén «vigilancia» para verlas si hace falta.
  Complementa (no sustituye) a un monitor externo como UptimeRobot, que funciona aunque Netlify caiga.
*/
const env = (k: string) => String((globalThis as any).Netlify?.env?.get(k) || "").trim();
const RUTAS = ["/", "/api/coches", "/api/salud", "/taller-mecanico-fuerteventura/", "/sitemap.xml"];
const LENTO_MS = 4000;

async function medir(origin: string, ruta: string) {
  const t0 = Date.now();
  try {
    const r = await fetch(origin + ruta, { headers: { "user-agent": "VolcanoCars-Vigilante/1.0" }, signal: AbortSignal.timeout(10000) });
    await r.arrayBuffer();
    const ms = Date.now() - t0;
    return { ruta, ok: r.ok && ms < LENTO_MS, estado: r.status, ms };
  } catch {
    return { ruta, ok: false, estado: 0, ms: Date.now() - t0 };
  }
}

async function telegram(texto: string) {
  const token = env("TELEGRAM_BOT_TOKEN"), chat = env("TELEGRAM_CHAT_ID");
  if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: texto, parse_mode: "HTML", disable_web_page_preview: true }),
  }).catch(() => {});
}

export default async () => {
  const origin = env("URL") || "https://volcanocars.com";
  const res = await Promise.all(RUTAS.map((r) => medir(origin, r)));
  const malos = res.filter((r) => !r.ok);
  const s = store("vigilancia");
  const antes = ((await s.get("estado", { type: "json" }).catch(() => null)) as { ok: boolean } | null) || { ok: true };
  const ahora = { ok: malos.length === 0, t: new Date().toISOString() };
  if (antes.ok && !ahora.ok) {
    await telegram(`🚨 <b>volcanocars.com da problemas</b>\n${malos.map((m) => `• ${m.ruta}: ${m.estado ? "error " + m.estado : "no responde"} (${m.ms} ms)`).join("\n")}\nRevisa Netlify → Logs & metrics.`);
  } else if (!antes.ok && ahora.ok) {
    await telegram(`✅ <b>volcanocars.com vuelve a ir bien</b>\n${res.map((m) => `• ${m.ruta}: ${m.ms} ms`).join("\n")}`);
  }
  await s.setJSON("estado", ahora);
  const hist = ((await s.get("historial", { type: "json" }).catch(() => null)) as unknown[] | null) || [];
  hist.push({ t: ahora.t, r: res.map((m) => [m.ruta, m.estado, m.ms]) });
  await s.setJSON("historial", hist.slice(-144));
};

export const config: Config = { schedule: "*/10 * * * *" };
