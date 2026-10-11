import { store } from "./shared.mts";
export const tstore = () => store("taller");
export type Quien = { uid: string; nombre: string; rol: string; admin: boolean; caja: boolean };
export async function quien(req: Request): Promise<Quien | null> {
  const t = req.headers.get("authorization") || "";
  if (t === "Bearer admin") return { uid: "gerente", nombre: "Gerente", rol: "gerente", admin: true, caja: true };
  if (t === "Bearer equipo" || t === "Bearer mecanico") return { uid: "u1", nombre: "Ana", rol: "mecanico", admin: false, caja: false };
  if (t === "Bearer recepcion") return { uid: "u2", nombre: "Marta", rol: "recepcion", admin: false, caja: false };
  return null;
}
export const hoyCanarias = (d?: Date) => (d ? d : new Date(process.env.HOY_PRUEBA ? process.env.HOY_PRUEBA + "T12:00:00Z" : Date.now())).toISOString().slice(0, 10);
