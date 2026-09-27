import type { Config } from "@netlify/functions";
import { store, json, isAdmin, mismoOrigen, purgar } from "../lib/shared.mts";

/*
  PRECIOS «DESDE» DEL TALLER
  - GET /api/precios-taller  → precios que enseña la web (público, en caché del CDN)
  - PUT /api/precios-taller  → el panel (Taller → Precios en la web) los cambia (solo el gerente)

  Cada servicio del taller de la web (las mismas claves que SERVICIOS en public/index.html) puede
  tener un precio «desde» con IGIC incluido, un sufijo («/ pieza», «/ rueda»…) y una etiqueta
  llamativa («Oferta», «Más pedido»…). Sin precio, la web sigue diciendo «a presupuestar».
  Se guarda en Netlify Blobs (almacén monzacar, clave «precios-taller»).
*/

export const SERVICIOS_TALLER = ["golpes", "pintura", "aranazos", "aceite", "frenos", "neumaticos", "diagnosis", "itv", "aire", "distribucion", "bateria"] as const;
export const ETIQUETAS = ["", "oferta", "popular", "nuevo", "rapido"] as const;
export const SUFIJOS = ["", "pieza", "rueda", "eje", "hora"] as const;

export type PrecioServicio = { precio: number | null; visible: boolean; etiqueta: string; sufijo: string };
export type PreciosTaller = {
  activa: boolean;              // interruptor general: sin él, la web no enseña ningún precio
  nota: string;                 // letra pequeña en español (vacío = texto por defecto)
  notaEn: string;               // letra pequeña en inglés (vacío = texto por defecto)
  servicios: Record<string, PrecioServicio>;
  actualizado: string;
};

const VACIO: PrecioServicio = { precio: null, visible: true, etiqueta: "", sufijo: "" };

const texto = (v: unknown, max: number) => String(v ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
const precio = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(String(v).replace(/\s|€/g, "").replace(",", "."));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.min(20000, Math.round(n * 100) / 100);
};

export function limpiarPrecios(x: any): PreciosTaller {
  const servicios: Record<string, PrecioServicio> = {};
  for (const k of SERVICIOS_TALLER) {
    const s = x?.servicios?.[k] || {};
    servicios[k] = {
      precio: precio(s.precio),
      visible: s.visible === undefined ? true : !!s.visible,
      etiqueta: (ETIQUETAS as readonly string[]).includes(s.etiqueta) ? s.etiqueta : "",
      sufijo: (SUFIJOS as readonly string[]).includes(s.sufijo) ? s.sufijo : "",
    };
  }
  return {
    activa: x?.activa === undefined ? true : !!x.activa,
    nota: texto(x?.nota, 200),
    notaEn: texto(x?.notaEn, 200),
    servicios,
    actualizado: typeof x?.actualizado === "string" ? x.actualizado.slice(0, 30) : "",
  };
}

export async function leerPrecios(): Promise<PreciosTaller> {
  const g = await store("monzacar").get("precios-taller", { type: "json" }).catch(() => null);
  return limpiarPrecios(g || { servicios: Object.fromEntries(SERVICIOS_TALLER.map((k) => [k, VACIO])) });
}

export default async (req: Request) => {
  if (req.method === "GET") {
    return new Response(JSON.stringify(await leerPrecios()), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=0, must-revalidate",
        "netlify-cdn-cache-control": "public, s-maxage=120, stale-while-revalidate=600",
        "netlify-cache-tag": "precios-taller",
        "x-content-type-options": "nosniff",
      },
    });
  }
  if (req.method !== "PUT") return json({ error: "Método no permitido" }, 405);
  if (!mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
  if (!(await isAdmin(req))) return json({ error: "Solo el gerente puede cambiar los precios de la web." }, 401);
  const input = await req.json().catch(() => null);
  if (!input || typeof input !== "object") return json({ error: "Datos no válidos." }, 400);
  const p = limpiarPrecios({ ...input, actualizado: new Date().toISOString() });
  await store("monzacar").setJSON("precios-taller", p);
  await purgar(["precios-taller"]); // la web enseña el precio nuevo al momento
  return json(p);
};

export const config: Config = {
  path: "/api/precios-taller",
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
