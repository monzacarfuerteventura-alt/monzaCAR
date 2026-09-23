import type { Config, Context } from "@netlify/functions";
import { createHash } from "node:crypto";
import { store, json, isAdmin, canarias, canalDe, sumarDias, mismoOrigen } from "../lib/shared.mts";
import { TIPOS, BOT, FUENTE, limpio, salDelDia, diaResumido, type Dia } from "../lib/analitica.mts";

/*
  ANALÍTICA PROPIA, SIN COOKIES
  - POST /api/ev     → la web avisa de lo que pasa (página vista, coche abierto, clic en WhatsApp…)
  - GET  /api/stats  → el panel pide los totales por día (requiere contraseña)

  Privacidad: no se guarda la IP ni nada que identifique a la persona. Para contar visitantes únicos
  se usa una huella que cambia cada día (sal aleatoria diaria que se borra al día siguiente),
  así que es imposible seguir a alguien de un día a otro. Por eso no hace falta aviso de cookies.

  Cada evento se guarda como una clave independiente (todo el dato va en el nombre de la clave):
  dos visitas a la vez nunca se pisan y para sumar un día basta con listar, sin descargar nada.
  Cada noche la función «stats-compactar» resume el día en «agg/AAAA-MM-DD» y borra lo detallado.
*/

// Freno anti-spam: como mucho 150 eventos cada 10 minutos por visitante (en memoria de cada servidor).
const cuenta = new Map<string, { n: number; t: number }>();
function demasiados(vh: string) {
  const ahora = Date.now(), c = cuenta.get(vh);
  if (!c || ahora - c.t > 10 * 60e3) { if (cuenta.size > 5000) cuenta.clear(); cuenta.set(vh, { n: 1, t: ahora }); return false; }
  c.n++;
  return c.n > 150;
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);

  if (url.pathname === "/api/stats") {
    if (!(await isAdmin(req))) return json({ error: "No autorizado" }, 401);
    const { fecha: hoy } = canarias();
    const ok = (f: string | null) => (f && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : "");
    let desde = ok(url.searchParams.get("desde")) || sumarDias(hoy, -29);
    let hasta = ok(url.searchParams.get("hasta")) || hoy;
    if (hasta > hoy) hasta = hoy;
    if (desde > hasta) desde = hasta;
    if (Date.parse(hasta) - Date.parse(desde) > 400 * 864e5) desde = sumarDias(hasta, -400);
    const dias: string[] = [];
    for (let f = desde; f <= hasta; f = sumarDias(f, 1)) dias.push(f);
    const out: Record<string, Dia> = {};
    for (let i = 0; i < dias.length; i += 8) {
      const trozo = dias.slice(i, i + 8);
      const r = await Promise.all(trozo.map((f) => diaResumido(f, hoy)));
      trozo.forEach((f, j) => (out[f] = r[j]));
    }
    return json({ hoy, desde, hasta, dias: out });
  }

  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!mismoOrigen(req)) return new Response(null, { status: 403 });
  const ua = req.headers.get("user-agent") || "";
  if (!ua || BOT.test(ua) || req.headers.get("sec-purpose")?.includes("prefetch")) return new Response(null, { status: 204 });
  const raw = await req.text();
  if (raw.length > 2000) return new Response(null, { status: 413 });
  let e: any;
  try { e = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }
  const t = TIPOS.includes(e?.t) ? e.t : "";
  if (!t) return new Response(null, { status: 400 });

  const ahora = new Date();
  const { fecha: dia } = canarias(ahora);
  const hhmmss = new Intl.DateTimeFormat("en-GB", { timeZone: "Atlantic/Canary", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(ahora).replace(/:/g, "");
  const sal = await salDelDia(dia);
  const vh = createHash("sha256").update(sal + "|" + (context.ip || "") + "|" + ua).digest("hex").slice(0, 12);
  if (demasiados(vh)) return new Response(null, { status: 204 });
  const entrada = e.e ? "e" : "";
  let fuente = "";
  if (entrada) {
    const canal = canalDe({ gclid: e.g ? "1" : "", utm_source: String(e.us || "").slice(0, 60), utm_medium: String(e.um || "").slice(0, 60), referrer: String(e.r || "").slice(0, 300) }, url.host);
    fuente = FUENTE[canal] || limpio(canal, 30);
  }
  const movil = Number(e.w) > 0 ? Number(e.w) < 760 : /Mobi|Android|iPhone/i.test(ua);
  const b = t === "pv" ? entrada : limpio(e.b, 20);
  const key = `ev/${dia}/${hhmmss}~${crypto.randomUUID().slice(0, 6)}~${t}~${limpio(e.a, 64)}~${b}~${fuente}~${movil ? "m" : "d"}~${e.l === "en" ? "en" : "es"}~${vh}`;
  await store("analitica").set(key, "1");
  return new Response(null, { status: 204 });
};

export const config: Config = {
  path: ["/api/ev", "/api/stats"],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
