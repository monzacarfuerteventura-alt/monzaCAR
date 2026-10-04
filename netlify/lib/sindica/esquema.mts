/*
  SINDICACIÓN DE COCHES · ESQUEMA UNIFICADO
  Una sola forma de describir un coche para TODOS los canales (feeds y APIs). Cada canal tiene su adaptador
  (adaptadores.mts) que lo traduce a lo que pide ese portal. Este archivo es puro: no toca la base de datos ni la red.
*/
import { createHash } from "node:crypto";

// Lo mínimo que necesitamos del coche de la web (netlify/lib/shared.mts → Car). Tipado a propósito estructural.
export type CocheWeb = {
  id: string; marca: string; modelo: string; version: string; anio: number; km: number;
  combustible: string; cambio: string; cv: number | null; puertas: number | null; color: string; etiqueta: string;
  precio: number; descripcion: string; equipamiento: string[]; fotos: string[];
  estado: "disponible" | "reservado" | "vendido"; actualizado?: string; creado?: string;
};

export type Combustible = "gasolina" | "diesel" | "hibrido" | "hibrido_enchufable" | "electrico" | "glp" | "gnc" | "otro";
export type Cambio = "manual" | "automatico";

export type VehiculoUnificado = {
  schema: "volcanocars.vehiculo.v1";
  id: string;                    // id interno estable (nunca cambia aunque cambie el precio)
  slug: string;                  // /coche/<slug> en volcanocars.com
  url: string;                   // enlace público de la ficha
  marca: string; modelo: string; version: string;
  matriculacion: { anio: number; mes: number | null };   // el panel solo guarda el año
  km: number;
  combustible: Combustible; cambio: Cambio;
  potencia: { cv: number | null; kw: number | null };
  puertas: number | null; color: string;
  etiquetaDGT: string;           // 0, ECO, C, B, SIN (como la guarda el panel)
  precio: { contado: number; financiado: number | null; moneda: "EUR"; incluyeImpuestos: true };
  descripcion: string;
  equipamiento: string[];
  fotos: { url: string; orden: number }[];
  estado: "disponible" | "reservado" | "vendido";
  vendedor: { nombre: string; cif: string; telefono: string; email: string; direccion: string; cp: string; localidad: string; provincia: string; pais: "ES" };
  actualizado: string;           // ISO
};

export const VENDEDOR = {
  nombre: "Volcano Cars (MAYLIN Y YERAY S.L.)", cif: "B93975647", telefono: "+34643566098", email: "volcanocars2026@gmail.com",
  direccion: "Calle Valle Largo, Nave 8, Polígono Industrial", cp: "35610", localidad: "Costa de Antigua", provincia: "Las Palmas", pais: "ES" as const,
};

const sinTildes = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function normCombustible(s: string): Combustible {
  const t = sinTildes(s || "");
  if (/enchufable|phev/.test(t)) return "hibrido_enchufable";
  if (/hibrid|hybrid|mhev|hev/.test(t)) return "hibrido";
  if (/electric|ev\b/.test(t)) return "electrico";
  if (/diesel|diésel|gasoleo|tdi|hdi|cdti|dci|tdci/.test(t)) return "diesel";
  if (/glp|autogas/.test(t)) return "glp";
  if (/gnc|gas natural/.test(t)) return "gnc";
  if (/gasolina|petrol|nafta/.test(t)) return "gasolina";
  return "otro";
}
export function normCambio(s: string): Cambio { return /auto|dsg|cvt|tiptronic|secuencial/.test(sinTildes(s || "")) ? "automatico" : "manual"; }

export function slugDe(c: Pick<CocheWeb, "id" | "marca" | "modelo" | "anio">): string {
  // MISMA regla que netlify/lib/paginas.mts → slugDe (si cambia allí, cambia aquí)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(c.id)) return c.id;
  const base = sinTildes(`${c.marca} ${c.modelo} ${c.anio}`).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return (base ? base + "-" : "") + c.id.slice(0, 8).toLowerCase();
}
export const urlFoto = (origin: string, k: string) => origin + (k.startsWith("/") ? k : "/api/fotos/" + encodeURIComponent(k));

export function desdeCoche(c: CocheWeb, origin: string): VehiculoUnificado {
  const slug = slugDe(c);
  const cv = c.cv && c.cv > 0 ? Math.round(c.cv) : null;
  return {
    schema: "volcanocars.vehiculo.v1", id: c.id, slug, url: `${origin}/coche/${slug}`,
    marca: (c.marca || "").trim(), modelo: (c.modelo || "").trim(), version: (c.version || "").trim(),
    matriculacion: { anio: Math.round(c.anio), mes: null },
    km: Math.max(0, Math.round(c.km || 0)),
    combustible: normCombustible(c.combustible), cambio: normCambio(c.cambio),
    potencia: { cv, kw: cv ? Math.round(cv * 0.7355) : null },
    puertas: c.puertas ?? null, color: (c.color || "").trim(), etiquetaDGT: (c.etiqueta || "").trim(),
    precio: { contado: Math.round((Number(c.precio) || 0) * 100) / 100, financiado: null, moneda: "EUR", incluyeImpuestos: true },
    descripcion: (c.descripcion || "").trim(), equipamiento: (c.equipamiento || []).map((e) => e.trim()).filter(Boolean),
    fotos: (c.fotos || []).map((f, i) => ({ url: urlFoto(origin, f), orden: i })),
    estado: c.estado, vendedor: { ...VENDEDOR }, actualizado: c.actualizado || c.creado || new Date(0).toISOString(),
  };
}

// Validación común (cada adaptador añade la suya). Devuelve la lista de problemas; vacía = publicable.
export function validarBase(v: VehiculoUnificado): string[] {
  const e: string[] = [];
  if (!v.marca) e.push("falta la marca");
  if (!v.modelo) e.push("falta el modelo");
  if (!(v.matriculacion.anio >= 1950 && v.matriculacion.anio <= new Date().getFullYear() + 1)) e.push("año de matriculación no válido");
  if (!(v.precio.contado >= 100 && v.precio.contado <= 500000)) e.push("precio fuera de rango (100–500.000 €)");
  if (!(v.km >= 0 && v.km < 2_000_000)) e.push("kilómetros no válidos");
  if (v.fotos.length < 1) e.push("sin fotos");
  return e;
}

// Huella estable: cambia SOLO si cambia algo que los portales muestran (no la fecha de «actualizado»).
export function huella(v: VehiculoUnificado): string {
  const { actualizado: _omit, ...resto } = v;
  const canon = (o: any): any => Array.isArray(o) ? o.map(canon) : o && typeof o === "object" ? Object.fromEntries(Object.keys(o).sort().map((k) => [k, canon(o[k])])) : o;
  return createHash("sha256").update(JSON.stringify(canon(resto))).digest("hex").slice(0, 32);
}

/*
  Consejos para completar el anuncio (los enseña el panel; NO bloquean la publicación). Los portales piden más o menos datos,
  pero un anuncio completo se defiende mejor en todos: versión exacta, equipamiento detallado, historial/mantenimiento y buenas fotos.
*/
export type Consejo = { nivel: "falta" | "mejora"; texto: string };
export function consejos(v: VehiculoUnificado): Consejo[] {
  const c: Consejo[] = [];
  if (!v.version) c.push({ nivel: "falta", texto: "Pon la versión exacta (motor y acabado): el comprador de portales la busca." });
  if (!v.potencia.cv) c.push({ nivel: "falta", texto: "Añade la potencia (CV)." });
  if (!v.etiquetaDGT) c.push({ nivel: "falta", texto: "Añade la etiqueta DGT." });
  if (v.equipamiento.length === 0) c.push({ nivel: "mejora", texto: "Añade el equipamiento: aire, elevalunas, cámara, llantas…" });
  if (v.descripcion.length < 150) c.push({ nivel: "mejora", texto: "Descripción corta: cuenta el mantenimiento hecho y el estado real." });
  if (v.fotos.length > 0 && v.fotos.length < 8) c.push({ nivel: "mejora", texto: `Solo ${v.fotos.length} foto${v.fotos.length === 1 ? "" : "s"}: sube más ángulos (exterior, interior, cuadro, motor, maletero).` });
  return c;
}
