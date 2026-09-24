// =====================================================================
// ALMACÉN · repuestos y herramientas (lógica compartida con la caja y el taller)
// =====================================================================
import { store } from "./shared.mts";
import { hoyCanarias } from "./taller.mts";

export const a = () => store("almacen");
export type Pieza = {
  id: string; sku: string; ean: string; ref: string; nombre: string; categoria: string; ubicacion: string; unidad: string;
  stock: number; minimo: number; coste: number; pvp: number; proveedor: string; activo: boolean; creado: string; actualizado: string;
};
export type MovPieza = {
  id: string; t: string; pieza: string; sku: string; nombre: string; tipo: "inicial" | "entrada" | "salida" | "devolucion" | "ajuste";
  cantidad: number; antes: number; despues: number; coste: number; orden: string; num: string; albaran: string; proveedor: string; motivo: string;
  origen: string; por: string; porNombre: string; devuelto?: number;
};
export type Herramienta = {
  id: string; codigo: string; nombre: string; categoria: string; serie: string; foto: string; valor: number; especial: boolean; ubicacion: string; notas: string;
  estado: "disponible" | "uso" | "mantenimiento" | "extraviada"; uso: null | { uid: string; nombre: string; orden: string; num: string; desde: string; confirmado: string; nota: string };
  activo: boolean; creado: string; actualizado: string;
};
export const CAT_PIEZA = ["Aceites y líquidos", "Filtros", "Frenos", "Suspensión y dirección", "Distribución y correas", "Encendido", "Eléctrico y baterías", "Neumáticos", "Carrocería y pintura", "Climatización", "Escape", "Consumibles", "Otros"];
export const CAT_HERR = ["Herramienta manual", "Maquinaria", "Diagnosis / OBD", "Elevación y gatos", "Eléctrica / batería", "Medición", "Neumáticos", "Chapa y pintura", "Otra"];
export const UNIDADES = ["ud", "L", "kg", "m", "juego"];
export const redondeo = (n: number) => Math.round(n * 100) / 100;

export async function listarA<T>(prefix: string): Promise<T[]> {
  const { blobs } = await a().list({ prefix });
  return (await Promise.all(blobs.map((b) => a().get(b.key, { type: "json" }).catch(() => null)))).filter(Boolean) as T[];
}
// Herramientas que siguen fuera y nadie ha localizado hoy: bloquean el cierre de caja (auditoría al cierre)
export async function herramientasPendientes() {
  const hoy = hoyCanarias();
  return (await listarA<Herramienta>("h/")).filter((h) => h.activo && h.estado === "uso" && h.uso && h.uso.confirmado !== hoy);
}
