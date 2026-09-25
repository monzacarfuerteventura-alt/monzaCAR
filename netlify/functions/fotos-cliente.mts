import type { Config, Context } from "@netlify/functions";
import { createHash } from "node:crypto";
import { store, json, isAdmin, mismoOrigen } from "../lib/shared.mts";
import { FOTOS_CLIENTE, esFotoCliente } from "../lib/solicitud.mts";

/*
  FOTOS DEL CLIENTE · «Presupuesto por foto» del taller
  - POST /api/fotos-cliente          → la web sube una foto del daño (JPEG ya reducido en el móvil, máx. 3 MB)
  - GET  /api/fotos-cliente/:clave   → solo el panel la puede ver (son fotos privadas del cliente)
  La foto queda «suelta» hasta que se envía la solicitud; las que nadie usa se borran solas a las 24 h
  (lo hace la tarea programada de las reservas).
*/
const MAX = 3 * 1024 * 1024;
const LIMITE_HORA = 16;

async function dentroDelLimite(ip: string, ua: string) {
  const s = store(FOTOS_CLIENTE);
  const key = "rl/" + createHash("sha256").update(ip + "|" + ua + "|vc-fotos").digest("hex").slice(0, 24);
  const hace1h = Date.now() - 3600e3;
  const lista = (((await s.get(key, { type: "json" }).catch(() => null)) as number[] | null) || []).filter((t) => t > hace1h);
  if (lista.length >= LIMITE_HORA) return false;
  lista.push(Date.now());
  await s.setJSON(key, lista);
  return true;
}

export default async (req: Request, context: Context) => {
  const key = new URL(req.url).pathname.split("/").filter(Boolean)[2] || "";
  const s = store(FOTOS_CLIENTE);

  if (req.method === "GET" && key) {
    if (!(await isAdmin(req))) return json({ error: "No autorizado" }, 401);
    if (!esFotoCliente(key)) return new Response("No encontrada", { status: 404 });
    const data = await s.get(key, { type: "arrayBuffer" });
    if (!data) return new Response("No encontrada", { status: 404 });
    return new Response(data, { headers: { "content-type": "image/jpeg", "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
  }

  if (req.method === "POST" && !key) {
    if (!mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
    if ((req.headers.get("content-type") || "").split(";")[0] !== "image/jpeg") return json({ error: "Sube una foto (JPG)." }, 415);
    if (Number(req.headers.get("content-length") || 0) > MAX) return json({ error: "La foto pesa demasiado." }, 413);
    const buf = await req.arrayBuffer();
    const b = new Uint8Array(buf);
    if (!buf.byteLength || b[0] !== 0xff || b[1] !== 0xd8 || b[2] !== 0xff) return json({ error: "Ese archivo no es una foto válida." }, 415);
    if (buf.byteLength > MAX) return json({ error: "La foto pesa demasiado." }, 413);
    if (!(await dentroDelLimite(context.ip || "", req.headers.get("user-agent") || ""))) return json({ error: "Has subido muchas fotos seguidas. Mándanoslas por WhatsApp, por favor." }, 429);
    const name = `pf-${crypto.randomUUID()}.jpg`;
    await s.set(name, buf);
    await s.setJSON(name + ".meta", { t: new Date().toISOString(), bytes: buf.byteLength, usada: "" });
    return json({ key: name }, 201);
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/fotos-cliente", "/api/fotos-cliente/:key"],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
