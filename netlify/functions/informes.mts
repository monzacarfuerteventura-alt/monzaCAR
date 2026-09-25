import type { Config } from "@netlify/functions";
import { store, json, isAdmin } from "../lib/shared.mts";

/*
  HISTORIAL SIN SORPRESAS  ·  el informe de revisión de cada coche en PDF
  ---------------------------------------------------------------------------------------------
  Es el escaneo del FORM-02 (Inspección de entrada 360°, 80 puntos con semáforo OK / Ámbar / Rojo)
  y del FORM-04 (Control de calidad pre-entrega, firmado) de ESE coche. Se sube desde el panel,
  en la ficha del coche → «Historial Sin Sorpresas».

  - GET    /api/informes          → público: qué coches tienen informe  { "<idCoche>": { fecha, kb } }
  - GET    /api/informes/:id      → público: descarga el PDF   (…?ver=1 lo abre en el navegador)
  - PUT    /api/informes/:id      → panel: sube o sustituye el PDF (cuerpo = el PDF, máx. 5,5 MB)
  - DELETE /api/informes/:id      → panel: lo quita

  La web solo enseña el botón en los coches que tienen su PDF subido: nunca promete un informe que no existe.
  Antes de subirlo, tapa los datos del anterior dueño (nombre, DNI, dirección): el informe es del coche, no de la persona.
*/

const MAX = 5.5 * 1024 * 1024; // las funciones de Netlify aceptan hasta 6 MB por petición
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const INDICE = "indice";
type Indice = Record<string, { fecha: string; kb: number }>;

export default async (req: Request) => {
  const s = store("monzacar-informes");
  const url = new URL(req.url);
  let id = "";
  try { id = decodeURIComponent(url.pathname.split("/").filter(Boolean)[2] || ""); } catch { return json({ error: "Coche no válido." }, 400); }
  const indice = async () => ((await s.get(INDICE, { type: "json" }).catch(() => null)) as Indice | null) || {};

  if (req.method === "GET" && !id) {
    return new Response(JSON.stringify(await indice()), {
      headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate" },
    });
  }
  if (!ID.test(id)) return json({ error: "Coche no válido." }, 400);

  if (req.method === "GET") {
    const pdf = await s.get("pdf/" + id, { type: "arrayBuffer" }).catch(() => null);
    if (!pdf) return json({ error: "Este coche todavía no tiene el informe subido." }, 404);
    const ver = url.searchParams.get("ver") === "1";
    return new Response(pdf, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `${ver ? "inline" : "attachment"}; filename="Volcano-Cars-Historial-Sin-Sorpresas-${id}.pdf"`,
        "cache-control": "public, max-age=300",
        "x-robots-tag": "noindex",
        "x-content-type-options": "nosniff",
      },
    });
  }

  if (!(await isAdmin(req))) {
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: "No autorizado" }, 401);
  }

  if (req.method === "PUT") {
    if (Number(req.headers.get("content-length") || 0) > MAX) return json({ error: "El PDF pesa más de 5,5 MB. Escanéalo a 150 ppp o en blanco y negro y vuelve a subirlo." }, 413);
    const buf = new Uint8Array(await req.arrayBuffer());
    if (buf.byteLength > MAX) return json({ error: "El PDF pesa más de 5,5 MB. Escanéalo a 150 ppp o en blanco y negro y vuelve a subirlo." }, 413);
    // tiene que ser un PDF de verdad (empieza por «%PDF-»)
    if (buf.byteLength < 400 || String.fromCharCode(...buf.slice(0, 5)) !== "%PDF-") return json({ error: "Eso no es un PDF. Sube el escaneo del FORM-02 y FORM-04 en PDF." }, 400);
    await s.set("pdf/" + id, buf);
    const i = await indice();
    i[id] = { fecha: new Date().toISOString(), kb: Math.round(buf.byteLength / 1024) };
    await s.setJSON(INDICE, i);
    return json({ ok: true, ...i[id] });
  }

  if (req.method === "DELETE") {
    await s.delete("pdf/" + id).catch(() => {});
    const i = await indice();
    delete i[id];
    await s.setJSON(INDICE, i);
    return json({ ok: true });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/informes", "/api/informes/:id"],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
