// =====================================================================
// ENTREGAS · foto de la entrega y opinión del cliente de cada coche vendido
// Se guardan APARTE de los coches (almacén «entregas»): así el nombre del cliente, su foto y su opinión
// nunca salen en /api/coches ni en /inventario.json. Solo se publican en /coches-vendidos cuando
// hay autorización expresa del cliente y el gerente marca «Publicar».
// =====================================================================
import { store } from "./shared.mts";

export type Entrega = {
  cocheId: string;
  foto: string;            // clave de /api/fotos (foto de la entrega, con o sin el cliente)
  conCliente: boolean;     // la foto sale con la cara del cliente
  nombre: string;          // cómo se publica: «Marta G.» (nombre e inicial)
  pueblo: string;          // dónde se entregó
  fecha: string;           // AAAA-MM-DD
  estrellas: number;       // 0 = sin valoración, 1..5
  opinion: string;         // sus palabras, sin retocar
  autoriza: boolean;       // el cliente ha autorizado publicar foto, nombre y opinión
  autorizaT: string;       // cuándo se marcó la autorización
  publicar: boolean;
  actualizado: string;
};

export const estore = () => store("entregas");
const str = (v: unknown, max = 200) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
export const esFotoEntrega = (k: string) => /^[a-z0-9-]+\.(jpg|webp|png)$/.test(k);

export function limpiarEntrega(cocheId: string, input: any, prev: Entrega | null): { e?: Entrega; error?: string } {
  const t = new Date().toISOString();
  const est = Math.round(Number(input?.estrellas) || 0);
  const autoriza = input?.autoriza === true;
  const e: Entrega = {
    cocheId,
    foto: esFotoEntrega(str(input?.foto, 80)) ? str(input.foto, 80) : "",
    conCliente: input?.conCliente === true,
    nombre: str(input?.nombre, 40),
    pueblo: str(input?.pueblo, 60),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(String(input?.fecha || "")) ? String(input.fecha) : t.slice(0, 10),
    estrellas: est >= 1 && est <= 5 ? est : 0,
    opinion: str(input?.opinion, 700),
    autoriza,
    autorizaT: autoriza ? (prev?.autoriza && prev.autorizaT ? prev.autorizaT : t) : "",
    publicar: input?.publicar === true,
    actualizado: t,
  };
  if (e.publicar) {
    if (!e.autoriza) return { error: "Para publicarlo hace falta la autorización del cliente (marca la casilla)." };
    if (!e.foto && !e.opinion) return { error: "Añade al menos la foto de la entrega o la opinión del cliente." };
    if (e.opinion && !e.nombre) return { error: "Pon cómo quiere el cliente que aparezca su nombre (p. ej. «Marta G.»)." };
  }
  return { e };
}

export async function leerEntregas(): Promise<Record<string, Entrega>> {
  const s = estore();
  const { blobs } = await s.list({ prefix: "e/" });
  const out: Record<string, Entrega> = {};
  await Promise.all(blobs.map(async (b) => { const e = (await s.get(b.key, { type: "json" }).catch(() => null)) as Entrega | null; if (e) out[e.cocheId] = e; }));
  return out;
}
