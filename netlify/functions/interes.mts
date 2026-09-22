import type { Config, Context } from "@netlify/functions";
import { createHash } from "node:crypto";
import { store, json } from "../lib/shared.mts";

// Contador REAL de interesados: cada vez que alguien pulsa «Me interesa este coche»
// se apunta una visita (una por persona y coche cada 7 días). La web solo enseña lo que hay aquí.
const KEY = "interes";
const SEMANA = 7 * 864e5;
type Registro = Record<string, { t: number; h: string }[]>;

const limpiar = (r: Registro) => {
  const desde = Date.now() - SEMANA;
  for (const id of Object.keys(r)) {
    r[id] = (r[id] || []).filter((x) => x.t > desde).slice(-500);
    if (!r[id].length) delete r[id];
  }
  return r;
};

export default async (req: Request, context: Context) => {
  const s = store("monzacar");
  const r = limpiar(((await s.get(KEY, { type: "json" })) as Registro | null) || {});

  if (req.method === "GET") {
    const out: Record<string, number> = {};
    for (const [id, l] of Object.entries(r)) out[id] = l.length;
    return new Response(JSON.stringify(out), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=60" },
    });
  }

  if (req.method === "POST") {
    const id = new URL(req.url).pathname.split("/").filter(Boolean)[2] || "";
    if (!/^[a-z0-9-]{1,64}$/i.test(id)) return json({ error: "Coche no válido" }, 400);
    const quien = createHash("sha256").update((context.ip || "") + "|" + (req.headers.get("user-agent") || "") + "|mz").digest("hex").slice(0, 20);
    const l = (r[id] ||= []);
    if (!l.some((x) => x.h === quien)) {
      l.push({ t: Date.now(), h: quien });
      await s.setJSON(KEY, r);
    }
    return json({ ok: true, total: l.length });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = { path: ["/api/interes", "/api/interes/:id"] };
