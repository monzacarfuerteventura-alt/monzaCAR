import type { Config } from "@netlify/functions";
import { store, json, isAdmin } from "../lib/shared.mts";
import { permiso, esRespuesta } from "../lib/acceso.mts";
import { ALMACENES, SOLO_NOMBRES, volcar } from "../lib/copia.mts";

/*
  COPIA DE SEGURIDAD COMPLETA (solo el gerente, con su contraseña):  GET /api/copia
  Descarga en un solo archivo todos los datos del negocio: coches, clientes y citas, órdenes del taller,
  equipo, caja, finanzas, almacén y ajustes. Sirve también para pasar los datos a otra web o a otro servidor.
  No incluye: las fotos y vídeos (van aparte, se listan sus nombres), las estadísticas de visitas, el
  registro de seguridad ni la clave de la verificación en dos pasos (por seguridad).
*/
export default async (req: Request) => {
  { const _q = await permiso(req, "gerente"); if (esRespuesta(_q)) return _q; }
  // Copias automáticas diarias (copia-programada.mts): ?auto=lista o ?auto=AAAA-MM-DD
  const auto = new URL(req.url).searchParams.get("auto");
  if (auto === "lista") { const { blobs } = await store("copias").list({ prefix: "diaria/" }); return json([...new Set(blobs.map((b) => b.key.slice(7, 17)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort().reverse()); }
  if (auto === "estado") return json((await store("copias").get("estado.json", { type: "json" }).catch(() => null)) || { ok: false, fecha: "", fallos: [["copia", "Todavía no se ha hecho ninguna copia automática."]] });
  if (auto && /^\d{4}-\d{2}-\d{2}$/.test(auto)) {
    let t = await store("copias").get("diaria/" + auto + ".json", { type: "text" });
    if (!t) return json({ error: "No hay copia de ese día." }, 404);
    const idx = JSON.parse(t);
    if (idx.partes) { // copia en varios archivos (uno por almacén): se juntan aquí
      const datos: Record<string, unknown> = {};
      for (const n of Object.keys(idx.partes)) datos[n] = await store("copias").get(`diaria/${auto}/${n}.json`, { type: "json" }).catch(() => ({ error: "parte no disponible" }));
      t = JSON.stringify({ tipo: idx.tipo, version: 2, automatica: true, generado: idx.generado, datos, archivos: idx.archivos });
    }
    return new Response(t, { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="volcano-cars-copia-${auto}.json"`, "cache-control": "no-store" } });
  }
  const datos: Record<string, unknown> = {};
  for (const n of ALMACENES) datos[n] = await volcar(n).catch((e) => ({ error: String(e?.message || e) }));
  const archivos: Record<string, string[]> = {};
  for (const n of SOLO_NOMBRES) archivos[n] = await store(n).list().then((r) => r.blobs.map((b) => b.key)).catch(() => []);
  const cuerpo = JSON.stringify({ tipo: "volcano-cars-copia", version: 1, generado: new Date().toISOString(), web: new URL(req.url).host, datos, archivos }, null, 1);
  const dia = new Date().toISOString().slice(0, 10);
  return new Response(cuerpo, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="volcano-cars-copia-completa-${dia}.json"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
};

export const config: Config = { path: "/api/copia", rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] } };
