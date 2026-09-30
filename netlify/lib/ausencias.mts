import { store } from "./shared.mts";

/* AUSENCIAS · RRHH. Todo se guarda en la tienda «ausencias» (Netlify Blobs):
   sol/<id>          la solicitud (datos, documentos, historial y decisión)
   doc/<clave>       el archivo (foto o PDF)   ·   docmeta/<clave>  quién lo subió y qué es
   cont/<año>        contador de referencias AUS-2026-001 */
export const astore = () => store("ausencias");

export const TIPOS: Record<string, { txt: string; ayuda: string; doc: "recomendado" | "opcional"; icono: string }> = {
  "baja-medica": { txt: "Baja médica", ayuda: "Incapacidad temporal por enfermedad o accidente. Adjunta el parte de baja.", doc: "recomendado", icono: "🩺" },
  "cita-medica": { txt: "Cita médica o revisión", ayuda: "Consulta, pruebas o acompañar a un familiar. Adjunta el justificante.", doc: "recomendado", icono: "🏥" },
  "permiso-retribuido": { txt: "Permiso retribuido", ayuda: "Boda, nacimiento, fallecimiento o enfermedad grave de un familiar, mudanza…", doc: "recomendado", icono: "📄" },
  "vacaciones": { txt: "Vacaciones", ayuda: "Días de vacaciones pedidos con antelación.", doc: "opcional", icono: "🏖️" },
  "asuntos-propios": { txt: "Asuntos propios", ayuda: "Gestiones personales que no admiten otra fecha.", doc: "opcional", icono: "🗂️" },
  "deber-publico": { txt: "Deber público o juzgado", ayuda: "Citación, mesa electoral, jurado… Adjunta la citación.", doc: "recomendado", icono: "⚖️" },
  "retraso": { txt: "Retraso o falta puntual", ayuda: "Llegas tarde o no puedes venir hoy y quieres justificarlo.", doc: "opcional", icono: "⏰" },
  "otro": { txt: "Otro motivo", ayuda: "Cualquier otra situación. Cuéntala en el motivo.", doc: "opcional", icono: "✉️" },
};
export const ESTADOS: Record<string, string> = { pendiente: "Pendiente", aprobada: "Aprobada", rechazada: "Rechazada", "pide-info": "Falta información", cancelada: "Cancelada" };

export type Doc = { key: string; nombre: string; mime: string; size: number; t: string; por: string };
export type Paso = { t: string; por: string; rol: string; acc: string; txt: string };
export type Sol = {
  id: string; ref: string; uid: string; nombre: string; tipo: string; desde: string; hasta: string; horaDesde: string; horaHasta: string;
  dias: number; laborables: number; motivo: string; docs: Doc[]; estado: keyof typeof ESTADOS; creada: string; creadaPor: string;
  decision: { t: string; por: string; motivo: string; retribuida: "" | "si" | "no" } | null; historial: Paso[]; leidaGerente: boolean; vistaTrabajador: boolean;
};

export const rid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
export const ahora = () => new Date().toISOString();
export const str = (x: unknown, max = 200) => String(x ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
export const esFecha = (x: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(String(x ?? "")) && !Number.isNaN(Date.parse(String(x) + "T12:00:00Z"));
export const sumarDias = (f: string, n: number) => new Date(Date.parse(f + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
export function contarDias(desde: string, hasta: string) {
  let nat = 0, lab = 0; for (let f = desde; f <= hasta && nat < 400; f = sumarDias(f, 1)) { nat++; const d = new Date(f + "T12:00:00Z").getUTCDay(); if (d !== 0 && d !== 6) lab++; }
  return { nat, lab };
}
export async function leerSol(id: string): Promise<Sol | null> { return /^[a-f0-9]{12}$/.test(id) ? (((await astore().get("sol/" + id, { type: "json" }).catch(() => null)) as Sol | null)) : null; }
export async function guardarSol(s: Sol) { await astore().setJSON("sol/" + s.id, s); }
export async function listarSol(): Promise<Sol[]> {
  const st = astore(), { blobs } = await st.list({ prefix: "sol/" });
  return ((await Promise.all(blobs.map((b) => st.get(b.key, { type: "json" }).catch(() => null)))).filter((x: any) => x && x.id) as Sol[]).sort((a, b) => b.creada.localeCompare(a.creada));
}
export async function siguienteRef(anio: string) {
  const st = astore(), k = "cont/" + anio, n = (((await st.get(k, { type: "json" }).catch(() => null)) as number | null) || 0) + 1;
  await st.setJSON(k, n); return `AUS-${anio}-${String(n).padStart(3, "0")}`;
}
// Activa = cuenta para saber si alguien falta (no está rechazada ni cancelada)
export const activa = (s: Sol) => s.estado === "pendiente" || s.estado === "aprobada" || s.estado === "pide-info";
export const cubre = (s: Sol, f: string) => s.desde <= f && s.hasta >= f;
