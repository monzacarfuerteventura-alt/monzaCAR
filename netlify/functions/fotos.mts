import type { Config } from "@netlify/functions";
import { store, json, isAdmin } from "../lib/shared.mts";
import { quien } from "../lib/taller.mts";
import { exigirJornada } from "../lib/jornada.mts";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/webp": "webp", "image/png": "png", "application/pdf": "pdf" };
const MIME: Record<string, string> = { jpg: "image/jpeg", webp: "image/webp", png: "image/png", pdf: "application/pdf" };
const MAX = 5 * 1024 * 1024;

export default async (req: Request) => {
  const key = new URL(req.url).pathname.split("/").filter(Boolean)[2]; // /api/fotos/:key
  const fotos = store("monzacar-fotos");

  if (req.method === "GET" && key) {
    if (!/^[a-z0-9-]+\.(jpg|webp|png|pdf)$/.test(key)) return new Response("No encontrada", { status: 404 });
    const data = await fotos.get(key, { type: "arrayBuffer" });
    if (!data) return new Response("No encontrada", { status: 404 });
    return new Response(data, {
      headers: { "content-type": MIME[key.split(".").pop()!], "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff", ...(key.endsWith(".pdf") ? { "content-disposition": `inline; filename="factura-${key.slice(0, 8)}.pdf"` } : {}) },
    });
  }

  if (req.method === "POST" && !key) {
    const qf = await quien(req); if (!qf) return json({ error: "No autorizado" }, 401);
    const bloqueo = await exigirJornada(qf); if (bloqueo) return bloqueo; // el equipo no trabaja sin haber fichado // gerente o equipo del taller (fotos de daños y de la inspección)
    const type = (req.headers.get("content-type") || "").split(";")[0];
    const ext = TYPES[type];
    if (!ext) return json({ error: "Formato no admitido. Usa una foto (JPG, PNG, WEBP) o un PDF." }, 415);
    if (ext === "pdf" && !(await isAdmin(req))) return json({ error: "Solo el gerente puede subir PDF." }, 403);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return json({ error: "La foto está vacía." }, 400);
    if (ext === "pdf" && new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(5, buf.byteLength))) !== "%PDF-") return json({ error: "Ese archivo no es un PDF válido." }, 415);
    if (buf.byteLength > MAX) return json({ error: "La foto pesa más de 5 MB." }, 413);
    const name = `${crypto.randomUUID()}.${ext}`;
    await fotos.set(name, buf);
    return json({ key: name }, 201);
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/fotos", "/api/fotos/:key"],
  rateLimit: { windowLimit: 300, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
