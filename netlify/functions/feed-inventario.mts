import type { Config } from "@netlify/functions";
import { desdeCoche } from "../lib/sindica/esquema.mts";
import { CANALES, envolverXml, metaCsv, envolverJson } from "../lib/sindica/adaptadores.mts";
import { cargarCoches, ORIGEN } from "../lib/sindica/motor.mts";
import { createHash, timingSafeEqual } from "node:crypto";

/*
  FEEDS PARA PORTALES Y MULTIPUBLICADORES (solo lectura, protegidos con la clave FEED_TOKEN de Netlify):
    /feeds/xml.xml?token=…    XML general            /feeds/json.json?token=…   JSON con el esquema completo
    /feeds/meta.csv?token=…   catálogo de vehículos de Meta (Facebook/Instagram)
  Sin FEED_TOKEN (24+ caracteres) los feeds están APAGADOS (404). Solo salen coches «disponible» que pasan la validación del formato.
  Lleva ETag y responde 304 si no ha cambiado nada: los portales que lo consultan a menudo no gastan datos.
*/
const hash = (s: string) => createHash("sha256").update(s).digest();
export default async (req: Request) => {
  const tokenOk = String((globalThis as any).Netlify?.env?.get("FEED_TOKEN") || "").trim();
  if (!tokenOk || tokenOk.length < 24) return new Response("No encontrado", { status: 404 });
  const u = new URL(req.url), dado = u.searchParams.get("token") || "";
  if (!timingSafeEqual(hash(dado), hash(tokenOk))) return new Response("No autorizado", { status: 401, headers: { "cache-control": "no-store" } });
  const canal = u.pathname.endsWith("meta.csv") ? "meta" : u.pathname.endsWith("xml.xml") ? "xml" : u.pathname.endsWith("json.json") ? "json" : "";
  if (!canal) return new Response("No encontrado", { status: 404 });
  const c = CANALES[canal];
  const vs = (await cargarCoches()).filter((x) => x.estado === "disponible").map((x) => desdeCoche(x, ORIGEN)).filter((v) => c.validar(v).length === 0);
  const tipo = canal === "meta" ? "text/csv; charset=utf-8" : canal === "json" ? "application/json; charset=utf-8" : "application/xml; charset=utf-8";
  const crear = (generado: string) => canal === "meta" ? metaCsv(vs.map((v) => c.transformar(v))) : canal === "json" ? envolverJson(vs, generado) : envolverXml(vs.map((v) => c.transformar(v)), generado);
  const etag = '"' + createHash("sha256").update(crear("-")).digest("hex").slice(0, 24) + '"';   // sin la hora: solo cambia si cambia algún coche
  const cab = { "cache-control": "private, max-age=300", etag, "x-robots-tag": "noindex, nofollow", "x-content-type-options": "nosniff" };
  if (req.headers.get("if-none-match") === etag) return new Response(null, { status: 304, headers: cab });
  return new Response(crear(new Date().toISOString()), { headers: { ...cab, "content-type": tipo } });
};
export const config: Config = { path: ["/feeds/xml.xml", "/feeds/meta.csv", "/feeds/json.json"] };
