import type { Config } from "@netlify/functions";
import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { store, json, mismoOrigen } from "../lib/shared.mts";
import { quien } from "../lib/taller.mts";
import { GUIONES, VOZ_AJUSTES, guion } from "../lib/guiones.mts";

/*
  VOZ DE LOS VÍDEOS DE AYUDA · ElevenLabs, voz «DAN»   (solo pestaña Ayuda del panel)
  GET  /api/voz                        → guiones, si hay clave de ElevenLabs y cuántas frases tiene ya cada vídeo (todo el equipo)
  POST /api/voz/generar {modulo, n}    → genera la frase n del vídeo (gerente). De una en una: cada una tarda 1-3 s
  GET  /api/voz/clip/:modulo/:n        → el MP3 de una frase (todo el equipo; el panel lo pide con su sesión)
  GET  /api/voz/mp3/:modulo            → el MP3 entero del vídeo, para descargar (frases seguidas)
  Los MP3 se guardan en el almacén de archivos del panel (Netlify Blobs, «ayuda-voz»): no hace falta subir nada a mano.

  Variables en Netlify:  ELEVENLABS_API_KEY  (obligatoria)  ·  ELEVENLABS_VOICE_ID  (el «Voice ID» de la voz DAN; si no
  lo pones, se busca en tu cuenta una voz que se llame «DAN»)  ·  ELEVENLABS_API_BASE (solo para pruebas)
  Ajustes fijos: modelo eleven_multilingual_v2 · estabilidad 0,50 · similitud 0,80 · MP3 44,1 kHz 128 kbps.
*/
const env = (k: string) => String((globalThis as any).Netlify?.env?.get(k) || "").trim();
const S = () => store("ayuda-voz");
const base = () => env("ELEVENLABS_API_BASE") || "https://api.elevenlabs.io";
const huella = (txt: string) => createHash("sha256").update([txt, VOZ_AJUSTES.modelo, VOZ_AJUSTES.stability, VOZ_AJUSTES.similarity_boost].join("|")).digest("hex").slice(0, 16);
type Meta = { h: (string | null)[]; voz?: string; generado?: string };
const leerMeta = async (id: string): Promise<Meta> => ((await S().get(`meta/${id}`, { type: "json" }).catch(() => null)) as Meta | null) || { h: [] };

async function vozId(): Promise<{ id?: string; error?: string }> {
  const fija = env("ELEVENLABS_VOICE_ID"); if (fija) return { id: fija };
  const guardada = (await S().get("config", { type: "json" }).catch(() => null)) as { id?: string } | null;
  if (guardada?.id) return { id: guardada.id };
  const r = await fetch(`${base()}/v1/voices`, { headers: { "xi-api-key": env("ELEVENLABS_API_KEY") }, signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!r || !r.ok) return { error: r?.status === 401 ? "La clave de ElevenLabs no es válida." : "No he podido consultar las voces de ElevenLabs." };
  const d = (await r.json().catch(() => ({}))) as { voices?: { voice_id: string; name: string }[] };
  const v = (d.voices || []).find((x) => new RegExp("^" + VOZ_AJUSTES.nombre + "\\b", "i").test(String(x.name || "").trim()));
  if (!v) return { error: `No encuentro en tu ElevenLabs una voz llamada «${VOZ_AJUSTES.nombre}». Copia su Voice ID en la variable ELEVENLABS_VOICE_ID de Netlify.` };
  await S().setJSON("config", { id: v.voice_id });
  return { id: v.voice_id };
}

export default async (req: Request) => {
  const url = new URL(req.url), parts = url.pathname.split("/").filter(Boolean), accion = parts[2] || "", modulo = parts[3] || "", n = parts[4] || "";
  if (req.method !== "GET" && !mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
  const q = await quien(req);
  if (!q) return json({ error: "Tu sesión ha caducado. Vuelve a entrar." }, 401);

  if (!accion && req.method === "GET") {
    const modulos: Record<string, unknown> = {};
    for (const g of GUIONES) {
      const m = await leerMeta(g.id);
      const listas = g.lineas.filter((l, i) => m.h[i] === huella(l.voz || l.txt)).length;
      modulos[g.id] = { titulo: g.titulo, dur: g.dur, lineas: g.lineas.map((l) => ({ t: l.t, txt: l.txt })), listas, total: g.lineas.length, generado: listas === g.lineas.length ? m.generado || "" : "" };
    }
    return json({ configurado: !!env("ELEVENLABS_API_KEY"), voz: VOZ_AJUSTES.nombre, modelo: VOZ_AJUSTES.modelo, admin: !!q.admin, modulos });
  }

  if (accion === "generar" && req.method === "POST") {
    if (!q.admin) return json({ error: "Solo el gerente genera la voz." }, 403);
    const body = (await req.json().catch(() => ({}))) as { modulo?: string; n?: number };
    const g = guion(String(body.modulo || "")), i = Number(body.n);
    if (!g || !Number.isInteger(i) || i < 0 || i >= g.lineas.length) return json({ error: "Vídeo o frase no válidos." }, 400);
    if (!env("ELEVENLABS_API_KEY")) return json({ error: "Falta la clave ELEVENLABS_API_KEY en Netlify (Project configuration → Environment variables).", sinClave: true }, 400);
    const v = await vozId(); if (!v.id) return json({ error: v.error }, 502);
    const linea = g.lineas[i], texto = linea.voz || linea.txt;
    const r = await fetch(`${base()}/v1/text-to-speech/${encodeURIComponent(v.id)}?output_format=${VOZ_AJUSTES.formato}`, {
      method: "POST", headers: { "xi-api-key": env("ELEVENLABS_API_KEY"), "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text: texto, model_id: VOZ_AJUSTES.modelo, voice_settings: { stability: VOZ_AJUSTES.stability, similarity_boost: VOZ_AJUSTES.similarity_boost } }),
      signal: AbortSignal.timeout(20000),
    }).catch(() => null);
    if (!r) return json({ error: "ElevenLabs no ha respondido. Prueba otra vez en un minuto." }, 504);
    if (!r.ok) {
      const msg = r.status === 401 ? "La clave de ElevenLabs no es válida." : r.status === 402 || r.status === 429 ? "Tu cuenta de ElevenLabs se ha quedado sin caracteres o va demasiado rápido. Espera un poco o revisa tu plan." : r.status === 404 ? "Esa voz no existe en tu cuenta: revisa ELEVENLABS_VOICE_ID." : `ElevenLabs respondió ${r.status}.`;
      return json({ error: msg }, 502);
    }
    const mp3 = new Uint8Array(await r.arrayBuffer());
    if (mp3.length < 200) return json({ error: "ElevenLabs devolvió un audio vacío." }, 502);
    await S().set(`${g.id}/${i}.mp3`, mp3.buffer.slice(mp3.byteOffset, mp3.byteOffset + mp3.byteLength) as ArrayBuffer);
    const m = await leerMeta(g.id);
    m.h = g.lineas.map((_, k) => (k === i ? huella(texto) : m.h[k] || null)); m.voz = v.id; m.generado = new Date().toISOString();
    await S().setJSON(`meta/${g.id}`, m);
    return json({ ok: true, n: i, listas: g.lineas.filter((l, k) => m.h[k] === huella(l.voz || l.txt)).length, total: g.lineas.length, bytes: mp3.length });
  }

  const g = guion(modulo);
  if (accion === "clip" && req.method === "GET") {
    const i = Number(n); if (!g || !Number.isInteger(i) || i < 0 || i >= g.lineas.length) return json({ error: "No existe." }, 404);
    const m = await leerMeta(g.id), l = g.lineas[i];
    if (m.h[i] !== huella(l.voz || l.txt)) return json({ error: "Esa frase aún no tiene voz." }, 404);
    const b = await S().get(`${g.id}/${i}.mp3`, { type: "arrayBuffer" }).catch(() => null);
    if (!b) return json({ error: "Esa frase aún no tiene voz." }, 404);
    return new Response(b as ArrayBuffer, { headers: { "content-type": "audio/mpeg", "cache-control": "private, max-age=3600" } });
  }
  if (accion === "mp3" && req.method === "GET") {
    if (!g) return json({ error: "No existe." }, 404);
    const m = await leerMeta(g.id), trozos: Uint8Array[] = [];
    for (let i = 0; i < g.lineas.length; i++) {
      if (m.h[i] !== huella(g.lineas[i].voz || g.lineas[i].txt)) return json({ error: "Faltan frases por generar." }, 409);
      const b = await S().get(`${g.id}/${i}.mp3`, { type: "arrayBuffer" }).catch(() => null);
      if (!b) return json({ error: "Faltan frases por generar." }, 409);
      trozos.push(new Uint8Array(b as ArrayBuffer));
    }
    return new Response(Buffer.concat(trozos), { headers: { "content-type": "audio/mpeg", "content-disposition": `attachment; filename="volcano-cars-${g.id}-voz-dan.mp3"` } });
  }
  return json({ error: "No existe." }, 404);
};

export const config: Config = { path: ["/api/voz", "/api/voz/:accion", "/api/voz/:accion/:modulo", "/api/voz/:accion/:modulo/:n"] };
