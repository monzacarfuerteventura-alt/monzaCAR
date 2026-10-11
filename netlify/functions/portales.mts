import type { Config } from "@netlify/functions";
import { json, store } from "../lib/shared.mts";
import { permiso, esRespuesta } from "../lib/acceso.mts";
import { desdeCoche, type CocheWeb } from "../lib/sindica/esquema.mts";

/*
  PORTALES · PUBLICACIÓN ASISTIDA (actualización 66) · gerente y recepción
   GET /api/portales → coches (disponibles, reservados y vendidos recientes) con sus datos limpios, el estado de cada anuncio en cada
        portal (publicado, enlace, fecha) y los anuncios que HAY QUE RETIRAR porque el coche ya se vendió.
   PUT /api/portales {id, portal, publicado?, retirado?, enlace?, nota?} → apunta que un coche está (o ya no está) en un portal.
  Esto NO publica nada en ningún portal por sí solo: es la libreta de control de lo que se publica a mano (o con el feed/API
  de la multipublicación) para no dejar anuncios fantasma de coches vendidos. Datos en el almacén «portales».
*/
export const PORTALES = ["cochesnet", "autoscout24", "wallapop", "milanuncios", "marketplace"] as const;
const ORIGEN = "https://volcanocars.com";
type Reg = { publicado?: boolean; retirado?: boolean; enlace?: string; nota?: string; fecha?: string; retiradoFecha?: string; por?: string };
const clave = "estado.json";
const leer = async () => ((await store("portales").get(clave, { type: "json" }).catch(() => null)) as Record<string, Record<string, Reg>> | null) || {};

export default async (req: Request) => {
  if (req.method !== "GET" && req.method !== "PUT") return json({ error: "Método no permitido" }, 405);
  const q = await permiso(req, "ventas"); if (esRespuesta(q)) return q;
  try {
    if (req.method === "PUT") {
      const b: any = await req.json().catch(() => ({}));
      const id = String(b.id || "").slice(0, 80), portal = String(b.portal || "");
      if (!id || !(PORTALES as readonly string[]).includes(portal)) return json({ error: "Coche o portal no válido." }, 400);
      const coches = ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as CocheWeb[] | null) || [];
      if (!coches.some((c) => c.id === id)) return json({ error: "Ese coche no existe." }, 404);
      let enlace = String(b.enlace ?? "").trim().slice(0, 300);
      if (enlace && !/^https:\/\//i.test(enlace)) return json({ error: "El enlace debe empezar por https://" }, 400);
      const todo = await leer(), por = String((q as any).nombre || (q as any).usuario || "gerente").slice(0, 40), ahora = new Date().toISOString();
      const r: Reg = { ...(todo[id]?.[portal] || {}) };
      if (typeof b.publicado === "boolean") { r.publicado = b.publicado; if (b.publicado) { r.fecha = ahora; r.retirado = false; delete r.retiradoFecha; } r.por = por; }
      if (typeof b.retirado === "boolean") { r.retirado = b.retirado; if (b.retirado) r.retiradoFecha = ahora; r.por = por; }
      if (b.enlace !== undefined) r.enlace = enlace;
      if (b.nota !== undefined) r.nota = String(b.nota).slice(0, 200);
      todo[id] = { ...(todo[id] || {}), [portal]: r };
      await store("portales").setJSON(clave, todo);
      return json({ ok: true, registro: r });
    }
    const coches = ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as CocheWeb[] | null) || [];
    const estado = await leer();
    const lista = coches.filter((c) => c.estado !== "vendido" || Object.values(estado[c.id] || {}).some((x) => x.publicado && !x.retirado))
      .map((c) => ({ id: c.id, estado: c.estado, v: desdeCoche(c, ORIGEN) }));
    const retirar: { id: string; titulo: string; portales: string[] }[] = [];
    for (const c of coches) if (c.estado === "vendido") {
      const ps = Object.entries(estado[c.id] || {}).filter(([, x]) => x.publicado && !x.retirado).map(([p]) => p);
      if (ps.length) retirar.push({ id: c.id, titulo: `${c.marca} ${c.modelo} ${c.anio}`.trim(), portales: ps });
    }
    return json({ portales: PORTALES, coches: lista, estado, retirar, feed: Boolean(String((globalThis as any).Netlify?.env?.get("FEED_TOKEN") || "").trim().length >= 24) });
  } catch (e: any) { return json({ error: "No se ha podido leer los portales: " + String(e?.message || e).slice(0, 160) }, 500); }
};
export const config: Config = { path: "/api/portales" };
