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
// La clave de ElevenLabs puede venir del panel (se guarda aquí, solo la lee el servidor) o de la variable ELEVENLABS_API_KEY de Netlify. Gana la del panel.
const clave = async (): Promise<string> => String(((await S().get("clave", { type: "json" }).catch(() => null)) as { k?: string } | null)?.k || "").trim() || env("ELEVENLABS_API_KEY");
const base = () => env("ELEVENLABS_API_BASE") || "https://api.elevenlabs.io";
// ElevenLabs usa el mismo 401 para varias cosas distintas (clave mala, sin créditos, sin permisos, cuenta gratuita bloqueada).
// Se lee el motivo real de su respuesta y se enseña tal cual, para no decir «clave no válida» cuando la clave es buena.
async function errEleven(r: Response): Promise<{ msg: string; codigo: string; fatal: boolean }> {
  let d: any = {}; try { d = await r.clone().json(); } catch { /* sin cuerpo */ }
  const det = d?.detail ?? d, st = String(det?.status || det?.code || "").toLowerCase();
  const raw = String(det?.message || (typeof det === "string" ? det : "")).replace(/\s+/g, " ").slice(0, 220);
  const pie = raw ? ` (ElevenLabs dice: «${raw}»)` : "";
  if (st === "quota_exceeded" || /quota|not enough credits|credits? remaining/i.test(raw)) return { codigo: "sin_creditos", fatal: true, msg: "Te has quedado sin créditos en ElevenLabs. Espera a que se renueven (la fecha sale en elevenlabs.io → tu perfil → Suscripción) o sube de plan. Lo ya generado se conserva." + pie };
  if (st === "detected_unusual_activity" || /unusual activity|free tier usage disabled/i.test(raw)) return { codigo: "bloqueo_free", fatal: true, msg: "ElevenLabs ha bloqueado el plan gratuito por «actividad inusual»: el plan Free no deja generar voz desde un servidor. Hace falta un plan de pago de ElevenLabs (Starter); la misma clave sigue valiendo." + pie };
  if (st === "missing_permissions" || /missing the permission|missing_permissions/i.test(raw)) return { codigo: "permisos", fatal: true, msg: "La clave es buena pero le faltan permisos (para generar voz necesita «Text to Speech»; para ver voces, «Voices: Read»). En ElevenLabs crea otra clave con todos los permisos." + pie };
  if (st === "invalid_api_key" || st === "invalid_api_key_format") return { codigo: "clave", fatal: true, msg: "ElevenLabs dice que esa clave no es válida. Revisa que la has copiado entera y que no la has borrado." + pie };
  if (r.status === 401) return { codigo: "rechazada", fatal: true, msg: "ElevenLabs ha rechazado la petición (401), pero no dice que la clave sea mala." + pie };
  if (r.status === 402) return { codigo: "plan", fatal: true, msg: "Esa voz o función necesita un plan de pago de ElevenLabs. Elige una de las voces de la lista." + pie };
  if (r.status === 429) return { codigo: "rapido", fatal: false, msg: "ElevenLabs dice que va demasiado rápido. Espera un minuto y vuelve a pulsar: sigue donde lo dejó." + pie };
  if (r.status === 404) return { codigo: "voz", fatal: true, msg: "Esa voz no existe en tu cuenta. Elige una de la lista de abajo." + pie };
  return { codigo: "otro", fatal: false, msg: `ElevenLabs ha respondido con un error (${r.status}). Prueba más tarde.` + pie };
}
const huella = (txt: string) => createHash("sha256").update([txt, VOZ_AJUSTES.modelo, VOZ_AJUSTES.stability, VOZ_AJUSTES.similarity_boost].join("|")).digest("hex").slice(0, 16);
type Meta = { h: (string | null)[]; voz?: string; generado?: string };
const leerMeta = async (id: string): Promise<Meta> => ((await S().get(`meta/${id}`, { type: "json" }).catch(() => null)) as Meta | null) || { h: [] };

// Orden: la voz que el gerente elige en el panel → la variable ELEVENLABS_VOICE_ID → una voz llamada «DAN» en la cuenta
async function vozId(): Promise<{ id?: string; error?: string }> {
  const guardada = (await S().get("config", { type: "json" }).catch(() => null)) as { id?: string } | null;
  if (guardada?.id) return { id: guardada.id };
  const fija = env("ELEVENLABS_VOICE_ID"); if (fija) return { id: fija };
  const r = await fetch(`${base()}/v1/voices`, { headers: { "xi-api-key": await clave() }, signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!r) return { error: "No he podido hablar con ElevenLabs. Prueba otra vez en un minuto." };
  if (!r.ok) return { error: (await errEleven(r)).msg };
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
      modulos[g.id] = { titulo: g.titulo, dur: g.dur, lineas: g.lineas.map((l) => ({ t: l.t, txt: l.txt, voz: l.voz || "" })), hechas: g.lineas.map((l, i) => m.h[i] === huella(l.voz || l.txt)), listas, total: g.lineas.length, generado: listas === g.lineas.length ? m.generado || "" : "" };
    }
    return json({ configurado: !!(await clave()), claveOrigen: (await S().get("clave", { type: "json" }).catch(() => null)) ? "panel" : env("ELEVENLABS_API_KEY") ? "netlify" : "", claveFin: q.admin ? (await clave()).slice(-4) : "", voz: VOZ_AJUSTES.nombre, modelo: VOZ_AJUSTES.modelo, admin: !!q.admin, modulos });
  }

  // Voces de la cuenta de ElevenLabs (para elegir una en el panel, sin tocar Netlify)
  if (accion === "voces" && req.method === "GET") {
    if (!q.admin) return json({ error: "Solo el gerente." }, 403);
    const k = await clave(); if (!k) return json({ error: "Falta la clave de ElevenLabs: pégala en «Clave de ElevenLabs».", sinClave: true }, 400);
    const r = await fetch(`${base()}/v1/voices`, { headers: { "xi-api-key": k }, signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (!r) return json({ error: "No he podido hablar con ElevenLabs. Prueba otra vez en un minuto." }, 504);
    if (!r.ok) return json({ error: (await errEleven(r)).msg }, 502);
    const d = (await r.json().catch(() => ({}))) as { voices?: { voice_id: string; name: string; labels?: Record<string, string> }[] };
    const actual = ((await S().get("config", { type: "json" }).catch(() => null)) as { id?: string } | null)?.id || env("ELEVENLABS_VOICE_ID");
    return json({ actual, voces: (d.voices || []).map((v) => ({ id: v.voice_id, name: String(v.name || "").slice(0, 60), idioma: v.labels?.language || "" })) });
  }
  // Créditos que le quedan a la cuenta de ElevenLabs (necesita el permiso «Usuario»; si no lo hay, el panel sigue funcionando sin este dato)
  if (accion === "saldo" && req.method === "GET") {
    if (!q.admin) return json({ error: "Solo el gerente." }, 403);
    const k = await clave(); if (!k) return json({ sinDatos: true });
    const r = await fetch(`${base()}/v1/user/subscription`, { headers: { "xi-api-key": k }, signal: AbortSignal.timeout(8000) }).catch(() => null);
    if (!r) return json({ sinDatos: true, error: "ElevenLabs no ha respondido." });
    if (!r.ok) return json({ sinDatos: true, error: (await errEleven(r)).msg });
    const d = (await r.json().catch(() => ({}))) as { character_count?: number; character_limit?: number; next_character_count_reset_unix?: number; tier?: string };
    const usados = Number(d.character_count) || 0, limite = Number(d.character_limit) || 0;
    return json({ usados, limite, restantes: Math.max(0, limite - usados), renueva: d.next_character_count_reset_unix ? new Date(d.next_character_count_reset_unix * 1000).toISOString().slice(0, 10) : "", plan: String(d.tier || "") });
  }
  // Clave de ElevenLabs desde el panel (sirve desde el móvil, sin entrar en Netlify). Se comprueba antes de guardarla.
  if (accion === "clave" && req.method === "POST") {
    if (!q.admin) return json({ error: "Solo el gerente." }, 403);
    const b = (await req.json().catch(() => ({}))) as { clave?: string };
    const k = String(b.clave || "").replace(/\s+/g, "");
    if (!/^[A-Za-z0-9_\-]{20,200}$/.test(k)) return json({ error: "Esa clave no parece buena. Cópiala entera desde ElevenLabs (Developers → API Keys); no debe llevar espacios." }, 400);
    const r = await fetch(`${base()}/v1/voices`, { headers: { "xi-api-key": k }, signal: AbortSignal.timeout(9000) }).catch(() => null);
    if (!r) return json({ error: "No he podido hablar con ElevenLabs. Prueba otra vez en un minuto." }, 504);
    if (!r.ok) return json({ error: (await errEleven(r)).msg }, r.status >= 500 ? 502 : 400);
    await S().setJSON("clave", { k, t: new Date().toISOString() });
    await S().setJSON("config", {}); // otra cuenta: se vuelve a elegir la voz
    for (const g of GUIONES) await S().setJSON(`meta/${g.id}`, { h: [] });
    return json({ ok: true, fin: k.slice(-4) });
  }
  if (accion === "claveborrar" && req.method === "POST") {
    if (!q.admin) return json({ error: "Solo el gerente." }, 403);
    await S().delete("clave").catch(() => {});
    return json({ ok: true });
  }

  if (accion === "elegir" && req.method === "POST") {
    if (!q.admin) return json({ error: "Solo el gerente." }, 403);
    const b = (await req.json().catch(() => ({}))) as { id?: string };
    const id = String(b.id || "").trim();
    if (!/^[A-Za-z0-9]{10,40}$/.test(id)) return json({ error: "Voz no válida." }, 400);
    await S().setJSON("config", { id });
    for (const g of GUIONES) await S().setJSON(`meta/${g.id}`, { h: [] }); // otra voz: hay que generar de nuevo
    return json({ ok: true, id });
  }

  if (accion === "generar" && req.method === "POST") {
    if (!q.admin) return json({ error: "Solo el gerente genera la voz." }, 403);
    const body = (await req.json().catch(() => ({}))) as { modulo?: string; n?: number; forzar?: boolean };
    const g = guion(String(body.modulo || "")), i = Number(body.n);
    if (!g || !Number.isInteger(i) || i < 0 || i >= g.lineas.length) return json({ error: "Vídeo o frase no válidos." }, 400);
    const kGen = await clave(); if (!kGen) return json({ error: "Falta la clave de ElevenLabs: pégala en «Clave de ElevenLabs».", sinClave: true }, 400);
    const v = await vozId(); if (!v.id) return json({ error: v.error }, 502);
    const linea = g.lineas[i], texto = linea.voz || linea.txt;
    // Una frase que ya tiene voz no se vuelve a pedir (cada petición gasta créditos), salvo que se fuerce («Volver a generar»)
    const m0 = await leerMeta(g.id);
    if (!body.forzar && m0.h[i] === huella(texto) && m0.voz === v.id) return json({ ok: true, saltada: true, n: i, listas: g.lineas.filter((l, k) => m0.h[k] === huella(l.voz || l.txt)).length, total: g.lineas.length });
    const r = await fetch(`${base()}/v1/text-to-speech/${encodeURIComponent(v.id)}?output_format=${VOZ_AJUSTES.formato}`, {
      method: "POST", headers: { "xi-api-key": kGen, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({ text: texto, model_id: VOZ_AJUSTES.modelo, voice_settings: { stability: VOZ_AJUSTES.stability, similarity_boost: VOZ_AJUSTES.similarity_boost } }),
      signal: AbortSignal.timeout(20000),
    }).catch(() => null);
    if (!r) return json({ error: "ElevenLabs no ha respondido. Prueba otra vez en un minuto." }, 504);
    if (!r.ok) {
      const e = await errEleven(r);
      return json({ error: e.msg, codigo: e.codigo, fatal: e.fatal, eligeVoz: e.codigo === "voz" }, 502);
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
