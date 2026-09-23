import type { Config, Context } from "@netlify/functions";
import { createHash } from "node:crypto";
import { store, json, mismoOrigen } from "../lib/shared.mts";
// Solo se aceptan coches que existen (evita que alguien llene el registro con coches inventados).
let cacheIds = { ids: new Set<string>(), t: 0 };
async function cocheExiste(id: string) {
  if (Date.now() - cacheIds.t > 60e3) {
    const l = ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as { id: string }[] | null) || [];
    cacheIds = { ids: new Set(l.map((c) => c.id)), t: Date.now() };
  }
  return cacheIds.ids.has(id);
}


// «X personas están viendo este coche ahora mismo» — contador REAL.
// Mientras alguien tiene abierta la ficha de un coche, su pestaña avisa cada 20 s.
// Si deja de avisar durante 50 s (cerró la ficha, la pestaña o se quedó sin cobertura), deja de contar.
// No se guarda nada personal: un número aleatorio de la pestaña y un resumen (hash) de la conexión,
// que solo sirve para que nadie pueda inflar el contador abriendo cientos de pestañas.
const KEY = "viendo";
const VIVO = 50 * 1000;
const MAX_POR_CONEXION = 3;
type Registro = Record<string, { s: string; h: string; t: number }[]>;

const limpiar = (r: Registro) => {
  const desde = Date.now() - VIVO;
  for (const id of Object.keys(r)) {
    r[id] = (r[id] || []).filter((x) => x.t > desde).slice(-200);
    if (!r[id].length) delete r[id];
  }
  return r;
};
// Personas distintas (varias pestañas de la misma persona cuentan como una).
const contar = (r: Registro, id: string, sinConexion = "") => new Set((r[id] || []).map((x) => x.h).filter((h) => h !== sinConexion)).size;

export default async (req: Request, context: Context) => {
  const s = store("monzacar");
  const leer = async () => limpiar(((await s.get(KEY, { type: "json" }).catch(() => null)) as Registro | null) || {});

  // Todos los coches: la CDN lo guarda 10 s para no gastar una llamada por visitante.
  if (req.method === "GET") {
    const r = await leer();
    const out: Record<string, number> = {};
    for (const id of Object.keys(r)) out[id] = contar(r, id);
    return new Response(JSON.stringify(out), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=0, must-revalidate",
        "netlify-cdn-cache-control": "public, s-maxage=10, stale-while-revalidate=20",
      },
    });
  }

  if (req.method === "POST") {
    const id = new URL(req.url).pathname.split("/").filter(Boolean)[2] || "";
    if (!/^[a-z0-9-]{1,64}$/i.test(id)) return json({ error: "Coche no válido" }, 400);
    if (!mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
    if (!(await cocheExiste(id))) return json({ error: "Coche no válido" }, 404);
    let body: any = {};
    try { body = JSON.parse((await req.text()) || "{}"); } catch { /* sendBeacon puede llegar vacío */ }
    const ses = String(body.s || "");
    if (!/^[a-z0-9-]{8,40}$/i.test(ses)) return json({ error: "Sesión no válida" }, 400);
    const h = createHash("sha256").update((context.ip || "") + "|vi|" + (req.headers.get("user-agent") || "")).digest("hex").slice(0, 16);

    const r = await leer();
    const l = (r[id] ||= []);
    const yo = l.find((x) => x.s === ses);
    if (body.fuera) {
      // Cerró la ficha: deja de contar al momento.
      if (yo) { r[id] = l.filter((x) => x !== yo); if (!r[id].length) delete r[id]; await s.setJSON(KEY, r); }
      return json({ ok: true });
    }
    if (yo) yo.t = Date.now();
    else if (l.filter((x) => x.h === h).length < MAX_POR_CONEXION) l.push({ s: ses, h, t: Date.now() });
    await s.setJSON(KEY, r);
    // Devuelve cuántas personas MÁS lo están viendo (sin contarte a ti).
    return json({ otros: contar(r, id, h) });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/viendo", "/api/viendo/:id"],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
