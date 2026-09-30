import { store } from "./shared.mts";

// Qué se guarda en las copias de seguridad (manual /api/copia y automática copia-programada.mts)
export const ALMACENES = ["monzacar", "solicitudes", "ordenes", "taller", "caja", "finanzas", "almacen", "seguridad", "jornada", "entregas", "reservas", "marketing", "sistemas", "vehiculos"];
export const SOLO_NOMBRES = ["monzacar-fotos", "monzacar-videos", "monzacar-informes", "reservas-docs"];
const FUERA = (st: string, k: string) =>
  st === "seguridad" && (k.startsWith("log/") || k.startsWith("bloqueo/") || k.startsWith("fallo") || k.startsWith("aviso/") || /^config\/(totp|min-iat)/.test(k));

// Qué copias diarias se conservan: 30 días, el día 1 de cada mes durante 24 meses y el 1 de enero para siempre.
export function conservar(fechas: string[], hoy: string) {
  const dias = (d: string) => Math.round((Date.parse(hoy + "T12:00:00Z") - Date.parse(d + "T12:00:00Z")) / 864e5);
  const guardar: string[] = [], borrar: string[] = [];
  for (const d of fechas) {
    const n = dias(d), primero = d.slice(8) === "01", anual = d.slice(5) === "01-01";
    (anual || (primero && n <= 24 * 31) || n < 30 ? guardar : borrar).push(d);
  }
  return { guardar, borrar };
}

export async function volcar(nombre: string) {
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

