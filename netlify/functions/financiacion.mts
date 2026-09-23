import type { Config } from "@netlify/functions";
import { store, json, isAdmin, mismoOrigen } from "../lib/shared.mts";

/*
  FINANCIACIÓN (calculadora de cuotas de la web)
  - GET /api/financiacion  → condiciones que usa la calculadora (público)
  - PUT /api/financiacion  → el panel cambia las condiciones (requiere sesión)

  Las condiciones son las que te dé la entidad financiera con la que trabajes (TIN, comisión,
  plazos, importe mínimo y antigüedad máxima del coche). La web calcula con ellas la cuota,
  la TAE y el ejemplo representativo que exige la Ley 16/2011 de crédito al consumo.
*/

export type Financiacion = {
  activa: boolean;
  entidad: string;
  tin: number;          // % anual
  comision: number;     // % de apertura sobre el importe financiado
  plazos: number[];     // meses que puede elegir el cliente
  plazoDef: number;
  entradaDef: number;   // % de entrada que sale marcado al abrir
  min: number;          // importe mínimo a financiar (€)
  antiguedadMax: number; // años del coche; 0 = sin límite
  enTarjeta: boolean;   // enseñar «desde X €/mes» en las tarjetas del catálogo
};

export const FIN_DEFECTO: Financiacion = {
  activa: true,
  entidad: "",
  tin: 9.99,
  comision: 0,
  plazos: [24, 36, 48, 60, 72, 84, 96],
  plazoDef: 60,
  entradaDef: 0,
  min: 2000,
  antiguedadMax: 15,
  enTarjeta: true,
};
const PLAZOS_OK = [12, 18, 24, 36, 48, 60, 72, 84, 96, 108, 120];

const num = (v: unknown, min: number, max: number, def: number) => {
  const n = Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n * 100) / 100)) : def;
};

export function limpiarFin(x: any): Financiacion {
  const d = FIN_DEFECTO;
  const plazos = [...new Set((Array.isArray(x?.plazos) ? x.plazos : d.plazos).map((p: unknown) => Math.round(Number(p))).filter((p: number) => PLAZOS_OK.includes(p)))].sort((a: any, b: any) => a - b) as number[];
  const pl = plazos.length ? plazos : d.plazos;
  const plazoDef = pl.includes(Math.round(Number(x?.plazoDef))) ? Math.round(Number(x.plazoDef)) : pl[Math.floor(pl.length / 2)];
  return {
    activa: x?.activa === undefined ? d.activa : !!x.activa,
    entidad: String(x?.entidad ?? "").replace(/[<>]/g, "").trim().slice(0, 80),
    tin: num(x?.tin, 0, 30, d.tin),
    comision: num(x?.comision, 0, 5, d.comision),
    plazos: pl,
    plazoDef,
    entradaDef: num(x?.entradaDef, 0, 80, d.entradaDef),
    min: num(x?.min, 0, 100000, d.min),
    antiguedadMax: Math.round(num(x?.antiguedadMax, 0, 40, d.antiguedadMax)),
    enTarjeta: x?.enTarjeta === undefined ? d.enTarjeta : !!x.enTarjeta,
  };
}

export async function leerFin(): Promise<Financiacion> {
  const g = await store("monzacar").get("financiacion", { type: "json" }).catch(() => null);
  return limpiarFin(g || FIN_DEFECTO);
}

export default async (req: Request) => {
  if (req.method === "GET") {
    return new Response(JSON.stringify(await leerFin()), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" },
    });
  }
  if (req.method !== "PUT") return json({ error: "Método no permitido" }, 405);
  if (!mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
  if (!(await isAdmin(req))) return json({ error: "No autorizado" }, 401);
  const input = await req.json().catch(() => null);
  if (!input || typeof input !== "object") return json({ error: "Datos no válidos." }, 400);
  const f = limpiarFin(input);
  await store("monzacar").setJSON("financiacion", f);
  return json(f);
};

export const config: Config = {
  path: "/api/financiacion",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
