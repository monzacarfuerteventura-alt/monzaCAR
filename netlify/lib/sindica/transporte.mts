/*
  TRANSPORTE HTTP para canales de tipo API. Solo AutoScout24 de momento, y SIN dirección real: hay que poner en
  Netlify AS24_URL (base de la API que te dé AutoScout24 o tu socio de datos) y AS24_TOKEN. Los verbos y rutas de aquí
  (POST /listings, PUT /listings/{id}, DELETE /listings/{id}) son los habituales en una API REST: contrástalos con la
  documentación que te entreguen y ajusta SOLO este archivo.
*/
import { ErrorCanal, leerRetryAfter, type Operacion } from "./estado.mts";
import { CANALES } from "./adaptadores.mts";

const env = (k: string) => String((globalThis as any).Netlify?.env?.get(k) || "").trim();

async function llamar(metodo: string, ruta: string, cuerpo?: unknown, claveIdempotencia?: string) {
  const base = env("AS24_URL").replace(/\/+$/, ""), token = env("AS24_TOKEN");
  if (!base || !token) throw new ErrorCanal("AutoScout24 sin configurar (faltan AS24_URL y AS24_TOKEN en Netlify)", 400);
  let r: Response;
  try {
    r = await fetch(base + ruta, {
      method: metodo, signal: AbortSignal.timeout(20_000),
      headers: { "content-type": "application/json", authorization: `Bearer ${token}`, ...(claveIdempotencia ? { "idempotency-key": claveIdempotencia } : {}) },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch (e: any) { throw new ErrorCanal("fallo de red: " + String(e?.message || e), null); }
  const txt = await r.text().catch(() => "");
  if (!r.ok) throw new ErrorCanal(`AutoScout24 respondió ${r.status}`, r.status, txt.slice(0, 500), leerRetryAfter(r.headers.get("retry-after")));
  try { return txt ? JSON.parse(txt) : {}; } catch { return {}; }
}

/** Envía UNA operación y devuelve el id del anuncio en el portal (si lo hay). */
export async function enviarAutoScout24(op: Operacion, externalListingId: string | null): Promise<{ externalListingId: string | null }> {
  if (op.tipo === "retirar") {
    if (externalListingId) await llamar("DELETE", `/listings/${encodeURIComponent(externalListingId)}`);
    return { externalListingId };
  }
  const payload = CANALES.autoscout24.transformar(op.vehiculo);
  if (op.tipo === "actualizar" && externalListingId) { await llamar("PUT", `/listings/${encodeURIComponent(externalListingId)}`, payload); return { externalListingId }; }
  const r: any = await llamar("POST", "/listings", payload, op.vehiculo.id + ":" + op.huella);   // la clave evita anuncios duplicados si se reintenta
  return { externalListingId: String(r?.id ?? r?.listingId ?? "") || null };
}
