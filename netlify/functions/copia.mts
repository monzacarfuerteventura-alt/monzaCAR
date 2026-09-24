import type { Config } from "@netlify/functions";
import { store, json, isAdmin } from "../lib/shared.mts";

/*
  COPIA DE SEGURIDAD COMPLETA (solo el gerente, con su contraseña):  GET /api/copia
  Descarga en un solo archivo todos los datos del negocio: coches, clientes y citas, órdenes del taller,
  equipo, caja, finanzas, almacén y ajustes. Sirve también para pasar los datos a otra web o a otro servidor.
  No incluye: las fotos y vídeos (van aparte, se listan sus nombres), las estadísticas de visitas, el
  registro de seguridad ni la clave de la verificación en dos pasos (por seguridad).
*/
const ALMACENES = ["monzacar", "solicitudes", "ordenes", "taller", "caja", "finanzas", "almacen", "seguridad"];
const SOLO_NOMBRES = ["monzacar-fotos", "monzacar-videos"];
const FUERA = (st: string, k: string) =>
  st === "seguridad" && (k.startsWith("log/") || k.startsWith("bloqueo/") || k.startsWith("fallo") || k.startsWith("aviso/") || /^config\/(totp|min-iat)/.test(k));

async function volcar(nombre: string) {
  const s = store(nombre);
  const { blobs } = await s.list();
  const claves = blobs.map((b) => b.key).filter((k) => !FUERA(nombre, k)).sort();
  const out: Record<string, unknown> = {};
  for (let i = 0; i < claves.length; i += 25) {
    await Promise.all(claves.slice(i, i + 25).map(async (k) => {
      const t = await s.get(k, { type: "text" }).catch(() => null);
      if (t == null) return;
      try { out[k] = JSON.parse(t); } catch { out[k] = t; }
    }));
  }
  return out;
}

export default async (req: Request) => {
  if (!(await isAdmin(req))) return json({ error: "No autorizado" }, 401);
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
