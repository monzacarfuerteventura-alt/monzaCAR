import type { Config } from "@netlify/functions";
import { store, SEMILLA, type Car } from "../lib/shared.mts";
import { slugDe } from "../lib/paginas.mts";

/*
  INVENTARIO EN VIVO  ·  GET /inventario.json
  El stock público en un formato estable y documentado (el mismo que usa el asistente con IA).
  Sale siempre de los coches del panel: no hay que mantener ningún archivo a mano.
  Ejemplo del formato: tools/asistente/inventario.ejemplo.json
*/
export default async (req: Request) => {
  const origin = new URL(req.url).origin;
  const l = ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null) || SEMILLA;
  const coches = (l.length ? l : SEMILLA).filter((c) => c.estado === "disponible" || c.estado === "reservado").map((c) => {
    const m = c.mercado, ok = m && m.media && m.n >= 3 && (Date.now() - Date.parse(m.fecha + "T12:00:00Z")) / 864e5 <= 120 && m.media > c.precio;
    return {
      id: c.id, estado: c.estado, marca: c.marca, modelo: c.modelo, version: c.version || "", anio: c.anio, km: c.km,
      combustible: c.combustible, cambio: c.cambio, potencia_cv: c.cv || null, puertas: c.puertas || null, color: c.color || "",
      etiqueta_dgt: c.etiqueta || "", precio_eur: c.precio, garantia_meses: 12, entrega_gratis_fuerteventura: true,
      equipamiento: c.equipamiento || [], descripcion: c.descripcion || "",
      fotos: (c.fotos || []).map((f) => origin + (f.startsWith("/") ? f : "/api/fotos/" + encodeURIComponent(f))),
      url: `${origin}/coche/${slugDe(c)}`,
      mercado: ok ? { precio_medio_eur: m!.media, anuncios_comparados: m!.n, fuente: m!.fuente || "", consultado: m!.fecha } : null,
      publicado: c.creado, actualizado: c.actualizado,
    };
  });
  return new Response(JSON.stringify({ negocio: "Volcano Cars", actualizado: new Date().toISOString(), total: coches.length, coches }, null, 1), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate", "netlify-cdn-cache-control": "public, s-maxage=120, stale-while-revalidate=600", "access-control-allow-origin": "*" },
  });
};

export const config: Config = { path: "/inventario.json" };
