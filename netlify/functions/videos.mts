import type { Config } from "@netlify/functions";
import { store, json, isAdmin, esVideo, borrarVideo, VIDEO_TROZO } from "../lib/shared.mts";

// Vídeos 360° de los coches.
// Las funciones de Netlify no aceptan subidas ni respuestas de más de 6 MB, así que el vídeo
// se sube en trozos de 4 MB y se sirve por rangos (el navegador pide el vídeo a trozos al reproducirlo).
//
//   POST   /api/videos              {size, mime}  → {key, trozo}   (panel)
//   PUT    /api/videos/:key/:n      trozo n                          (panel)
//   POST   /api/videos/:key/fin                   → marca el vídeo como completo (panel)
//   DELETE /api/videos/:key                        → borra un vídeo que no se llegó a publicar (panel)
//   GET    /api/videos/:key         con cabecera Range → trozo del vídeo (público)

const MAX = 300 * 1024 * 1024; // 300 MB
const TIPOS: Record<string, string> = { "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };
type Meta = { size: number; mime: string; n: number; trozo: number; done: boolean; creado: string };

const s = () => store("monzacar-videos");
const leerMeta = async (key: string) => (await s().get(key + "/meta", { type: "json" }).catch(() => null)) as Meta | null;

export default async (req: Request) => {
  const [, , , key = "", parte = ""] = new URL(req.url).pathname.split("/"); // "", api, videos, key, parte

  // ---------- público: reproducir ----------
  if ((req.method === "GET" || req.method === "HEAD") && key && !parte) {
    if (!esVideo(key)) return new Response("No encontrado", { status: 404 });
    const meta = await leerMeta(key);
    if (!meta?.done) return new Response("No encontrado", { status: 404 });
    const base = {
      "accept-ranges": "bytes",
      // .mov de iPhone (H.264) es el mismo formato que .mp4: así lo reproducen también Chrome y Android.
      "content-type": meta.mime === "video/webm" ? "video/webm" : "video/mp4",
      // «private»: cada rango lo guarda el navegador, no la CDN (la CDN no distingue rangos).
      "cache-control": "private, max-age=604800, immutable",
    };
    if (req.method === "HEAD") return new Response(null, { headers: { ...base, "content-length": String(meta.size) } });

    const m = /^bytes=(\d*)-(\d*)$/.exec((req.headers.get("range") || "bytes=0-").trim());
    if (!m || (!m[1] && !m[2])) return new Response(null, { status: 416, headers: { "content-range": `bytes */${meta.size}` } });
    let ini: number, fin: number;
    if (!m[1]) { ini = Math.max(0, meta.size - Number(m[2])); fin = meta.size - 1; } // «los últimos N bytes»
    else { ini = Number(m[1]); fin = m[2] ? Math.min(Number(m[2]), meta.size - 1) : meta.size - 1; }
    if (ini >= meta.size || fin < ini) return new Response(null, { status: 416, headers: { "content-range": `bytes */${meta.size}` } });

    // Como mucho un trozo por respuesta: el navegador pide el siguiente él solo.
    const n = Math.floor(ini / meta.trozo);
    const desde = n * meta.trozo;
    fin = Math.min(fin, desde + meta.trozo - 1);
    const buf = (await s().get(`${key}/${n}`, { type: "arrayBuffer" })) as ArrayBuffer | null;
    if (!buf) return new Response("No encontrado", { status: 404 });
    const cuerpo = buf.slice(ini - desde, fin - desde + 1);
    return new Response(cuerpo, {
      status: 206,
      headers: { ...base, "content-range": `bytes ${ini}-${ini + cuerpo.byteLength - 1}/${meta.size}`, "content-length": String(cuerpo.byteLength) },
    });
  }

  // ---------- panel ----------
  if (!(await isAdmin(req))) {
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: "No autorizado" }, 401);
  }

  // Empezar una subida
  if (req.method === "POST" && !key) {
    let body: any = {};
    try { body = await req.json(); } catch { return json({ error: "Datos no válidos." }, 400); }
    const ext = TIPOS[String(body.mime || "")];
    const size = Number(body.size);
    if (!ext) return json({ error: "Formato no admitido. Sube un vídeo MP4, MOV o WEBM." }, 415);
    if (!Number.isFinite(size) || size <= 0) return json({ error: "El vídeo está vacío." }, 400);
    if (size > MAX) return json({ error: "El vídeo pesa más de 300 MB. Grábalo en 1080p o recórtalo un poco." }, 413);
    const k = `${crypto.randomUUID()}.${ext}`;
    const meta: Meta = { size, mime: String(body.mime), n: Math.ceil(size / VIDEO_TROZO), trozo: VIDEO_TROZO, done: false, creado: new Date().toISOString() };
    await s().setJSON(k + "/meta", meta);
    return json({ key: k, trozo: VIDEO_TROZO, n: meta.n }, 201);
  }

  if (!esVideo(key)) return json({ error: "Vídeo no válido." }, 400);
  const meta = await leerMeta(key);
  if (!meta) return json({ error: "Ese vídeo ya no existe. Vuelve a subirlo." }, 404);

  // Subir un trozo
  if (req.method === "PUT" && /^\d{1,3}$/.test(parte)) {
    const n = Number(parte);
    if (n >= meta.n) return json({ error: "Trozo fuera de rango." }, 400);
    const buf = await req.arrayBuffer();
    const esperado = n === meta.n - 1 ? meta.size - n * meta.trozo : meta.trozo;
    if (buf.byteLength !== esperado) return json({ error: "El trozo ha llegado incompleto. Reintentando…" }, 400);
    await s().set(`${key}/${n}`, buf);
    return json({ ok: true });
  }

  // Terminar: comprueba que están todos los trozos
  if (req.method === "POST" && parte === "fin") {
    const faltan: number[] = [];
    await Promise.all([...Array(meta.n).keys()].map(async (i) => {
      const md = await s().getMetadata(`${key}/${i}`).catch(() => null);
      if (!md) faltan.push(i);
    }));
    if (faltan.length) return json({ error: "Faltan partes del vídeo. Vuelve a subirlo.", faltan }, 400);
    meta.done = true;
    await s().setJSON(key + "/meta", meta);
    return json({ ok: true, key });
  }

  // Borrar un vídeo que se subió pero no se llegó a publicar
  if (req.method === "DELETE" && !parte) {
    await borrarVideo({ key });
    return json({ ok: true });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/videos", "/api/videos/:key", "/api/videos/:key/:parte"],
  rateLimit: { windowLimit: 300, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
