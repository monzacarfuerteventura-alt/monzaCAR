import type { Config } from "@netlify/functions";
import { store, json, mismoOrigen } from "../lib/shared.mts";
import { permiso, esRespuesta } from "../lib/acceso.mts";

/*
  SISTEMAS VOLCANO CARS · formularios digitales (MO-00 v3.0)
  ---------------------------------------------------------------------------------
  Solo los formularios que no tenían equivalente en el panel:
    FORM-07 Cascos y abonos (S02) · FORM-08 Ronda 5S y seguridad (S03) · FORM-09 Hoja de preparación (S04)
    FORM-12 Prueba a domicilio · fianza 50 € (S06) · FORM-13 Registro de postventa (S07)
    FORM-14 Plan semanal de marketing (S08, solo gerente) · FORM-15 Auditoría del viernes (S09, solo gerente)
  FORM-01 a FORM-06 (las fichas del taller, con la Factura de reparación) siguen en las órdenes del taller; FORM-10 (Parte de reserva) y FORM-11 (Factura de venta) están en Coches; FORM-16 y FORM-17 son de papel (el Dashboard ya da los números).
  NUMERACIÓN (act. 72): los formularios van de FORM-01 a FORM-17 en el orden de los manuales S01 a S11. Antes eran otros números (cascos 05, 5S 06, preparación 07, prueba a domicilio 08, postventa 09, marketing 10, auditoría 11);
  los registros ya guardados siguen en su clave antigua y se leen con el número nuevo (tabla FIS), así no se pierde nada.

  GET    /api/sistemas?form=FORM-07          → registros (los 300 más recientes)
  POST   /api/sistemas  {form, datos}        → nuevo registro
  PUT    /api/sistemas  {form, id, datos, cerrar?, reabrir?}
  DELETE /api/sistemas?form=FORM-07&id=…     → solo gerente
  Almacén de Netlify Blobs «sistemas», clave <FIS[FORM]>/<id> (la clave física no cambia). El id empieza por la fecha: se ordena solo.
*/

const FORMS: Record<string, "equipo" | "gerente"> = {
  "FORM-07": "equipo", "FORM-08": "equipo", "FORM-09": "equipo", "FORM-12": "equipo", "FORM-13": "equipo",
  "FORM-14": "gerente", "FORM-15": "gerente",
};
// Número NUEVO → clave física (la de antes de la 72) con la que están guardados los registros. NO cambiar: perdería los datos.
const FIS: Record<string, string> = { "FORM-07": "FORM-05", "FORM-08": "FORM-06", "FORM-09": "FORM-07", "FORM-12": "FORM-08", "FORM-13": "FORM-09", "FORM-14": "FORM-10", "FORM-15": "FORM-11" };
export type Registro = {
  id: string; form: string; creado: string; autor: string; actualizado: string; porUltimo: string;
  cerrado: boolean; firma: { nombre: string; t: string } | null; datos: Record<string, unknown>;
};

const s = () => store("sistemas");
const MAX_TXT = 2000, MAX_CLAVES = 250, MAX_FILAS = 60, MAX_BYTES = 60_000;

// Solo texto, números, sí/no y tablas sencillas (lista de filas con texto/números/sí-no). Nada de HTML.
function limpiarValor(v: unknown, prof = 0): unknown {
  if (v === null || v === undefined) return "";
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v * 1000) / 1000 : "";
  if (typeof v === "string") return v.replace(/[<>]/g, "").slice(0, MAX_TXT);
  if (Array.isArray(v) && prof === 0) return v.slice(0, MAX_FILAS).map((f) => limpiarValor(f, 1));
  if (typeof v === "object" && prof <= 1) {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>).slice(0, 40)) {
      if (!/^[a-z0-9_]{1,30}$/i.test(k)) continue;
      const lv = limpiarValor(x, 2);
      if (typeof lv !== "object") o[k] = lv;
    }
    return o;
  }
  return "";
}
function limpiarDatos(d: unknown): Record<string, unknown> | null {
  if (!d || typeof d !== "object" || Array.isArray(d)) return null;
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(d as Record<string, unknown>).slice(0, MAX_CLAVES)) {
    if (!/^[a-z0-9_]{1,40}$/i.test(k)) continue;
    o[k] = limpiarValor(v, 0);
  }
  return JSON.stringify(o).length > MAX_BYTES ? null : o;
}
const nuevoId = () => new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14) + "-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
const idValido = (id: string) => /^\d{14}-[0-9a-f]{8}$/.test(id);

export default async (req: Request) => {
  const url = new URL(req.url);
  if (req.method !== "GET" && !mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
  const body: any = req.method === "POST" || req.method === "PUT" ? await req.json().catch(() => null) : null;
  const form = String((body && body.form) || url.searchParams.get("form") || "");
  if (!FORMS[form]) return json({ error: "Formulario desconocido." }, 400);
  const q = await permiso(req, FORMS[form]);
  if (esRespuesta(q)) return q;

  if (req.method === "GET") {
    const { blobs } = await s().list({ prefix: FIS[form] + "/" });
    const claves = blobs.map((b) => b.key).sort().reverse().slice(0, 300);
    const regs: Registro[] = [];
    for (let i = 0; i < claves.length; i += 25) {
      const parte = await Promise.all(claves.slice(i, i + 25).map((k) => s().get(k, { type: "json" }).catch(() => null)));
      for (const r of parte) if (r) regs.push({ ...(r as Registro), form }); // los antiguos traen el número viejo dentro: se muestra el nuevo
    }
    return json({ form, registros: regs, yo: { nombre: q.nombre, gerente: q.admin } });
  }

  if (req.method === "POST") {
    const datos = limpiarDatos(body?.datos);
    if (!datos) return json({ error: "Datos no válidos o demasiado largos." }, 400);
    const t = new Date().toISOString();
    const r: Registro = { id: nuevoId(), form, creado: t, autor: q.nombre, actualizado: t, porUltimo: q.nombre, cerrado: false, firma: null, datos };
    await s().setJSON(`${FIS[form]}/${r.id}`, r);
    return json(r, 201);
  }

  if (req.method === "PUT") {
    const id = String(body?.id || "");
    if (!idValido(id)) return json({ error: "Registro no válido." }, 400);
    const r = (await s().get(`${FIS[form]}/${id}`, { type: "json" }).catch(() => null)) as Registro | null;
    if (!r) return json({ error: "Ese registro ya no existe." }, 404);
    if (body?.reabrir) {
      if (!q.admin) return json({ error: "Solo el gerente puede reabrir un formulario firmado." }, 403);
      r.cerrado = false; r.firma = null;
    } else {
      if (r.cerrado) return json({ error: "Este formulario ya está firmado. Pide al gerente que lo reabra." }, 409);
      const datos = limpiarDatos(body?.datos);
      if (!datos) return json({ error: "Datos no válidos o demasiado largos." }, 400);
      r.datos = datos;
      if (body?.cerrar) { r.cerrado = true; r.firma = { nombre: q.nombre, t: new Date().toISOString() }; }
    }
    r.actualizado = new Date().toISOString(); r.porUltimo = q.nombre;
    r.form = form; await s().setJSON(`${FIS[form]}/${id}`, r);
    return json(r);
  }

  if (req.method === "DELETE") {
    if (!q.admin) return json({ error: "Solo el gerente puede borrar formularios." }, 403);
    const id = String(url.searchParams.get("id") || "");
    if (!idValido(id)) return json({ error: "Registro no válido." }, 400);
    await s().delete(`${FIS[form]}/${id}`);
    return json({ ok: true });
  }
  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: "/api/sistemas",
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
