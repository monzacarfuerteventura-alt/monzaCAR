/*
  PATRÓN ADAPTADOR · un adaptador por canal. Todos cumplen la misma interfaz, así el motor no sabe nada de portales.
  IMPORTANTE (honestidad técnica): los formatos de AutoScout24 y de Meta de este archivo son un BORRADOR razonable.
  Los portales publican su especificación solo a socios/clientes con acceso. Antes de activar un canal hay que
  contrastar cada campo con su documentación oficial y ajustar SOLO el adaptador (nada más cambia).
*/
import type { VehiculoUnificado } from "./esquema.mts";
import { validarBase } from "./esquema.mts";

export type ModoCanal = "feed" | "api";
export interface Canal<Payload = unknown> {
  id: string;
  modo: ModoCanal;
  nombre: string;
  validar(v: VehiculoUnificado): string[];          // problemas específicos del canal (además de validarBase)
  transformar(v: VehiculoUnificado): Payload;        // coche unificado → lo que pide el portal
}

const esc = (s: unknown) => String(s ?? "").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" }[c]!)).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

// ---------- 1) AutoScout24 (API de creación de anuncios · solo vía socio de datos aprobado) ----------
export type PayloadAutoScout24 = {
  externalReference: string;
  make: string; model: string; version: string;
  firstRegistration: { year: number; month: number | null };
  mileageKm: number;
  fuel: string; gearbox: "MANUAL" | "AUTOMATIC";
  power: { hp: number | null; kw: number | null };
  doors: number | null; colour: string;
  price: { amount: number; currency: "EUR"; vatDeductible: false };
  description: string; equipment: string[]; images: string[];
  seller: { name: string; phone: string; email: string; city: string; zip: string; country: string };
};
const FUEL_AS24: Record<string, string> = { gasolina: "PETROL", diesel: "DIESEL", hibrido: "HYBRID", hibrido_enchufable: "PLUGIN_HYBRID", electrico: "ELECTRIC", glp: "LPG", gnc: "CNG", otro: "OTHER" };
export const autoscout24: Canal<PayloadAutoScout24> = {
  id: "autoscout24", modo: "api", nombre: "AutoScout24",
  validar: (v) => [...validarBase(v), ...(v.fotos.length > 50 ? ["máximo 50 fotos"] : []), ...(v.descripcion.length > 4000 ? ["descripción de más de 4.000 caracteres"] : [])],
  transformar: (v) => ({
    externalReference: v.id, make: v.marca, model: v.modelo, version: v.version,
    firstRegistration: { year: v.matriculacion.anio, month: v.matriculacion.mes },
    mileageKm: v.km, fuel: FUEL_AS24[v.combustible], gearbox: v.cambio === "automatico" ? "AUTOMATIC" : "MANUAL",
    power: { hp: v.potencia.cv, kw: v.potencia.kw }, doors: v.puertas, colour: v.color,
    price: { amount: v.precio.contado, currency: "EUR", vatDeductible: false },
    description: v.descripcion, equipment: v.equipamiento, images: v.fotos.map((f) => f.url),
    seller: { name: v.vendedor.nombre, phone: v.vendedor.telefono, email: v.vendedor.email, city: v.vendedor.localidad, zip: v.vendedor.cp, country: v.vendedor.pais },
  }),
};

// ---------- 2) Feed XML genérico (lo que aceptan muchos portales/multipublicadores/importadores) ----------
export const feedXmlGenerico: Canal<string> = {
  id: "xml", modo: "feed", nombre: "Feed XML genérico",
  validar: (v) => validarBase(v),
  transformar: (v) => `<vehiculo id="${esc(v.id)}">
    <marca>${esc(v.marca)}</marca><modelo>${esc(v.modelo)}</modelo><version>${esc(v.version)}</version>
    <anio>${v.matriculacion.anio}</anio><km>${v.km}</km>
    <combustible>${esc(v.combustible)}</combustible><cambio>${esc(v.cambio)}</cambio>
    <cv>${v.potencia.cv ?? ""}</cv><kw>${v.potencia.kw ?? ""}</kw><puertas>${v.puertas ?? ""}</puertas><color>${esc(v.color)}</color>
    <etiqueta_dgt>${esc(v.etiquetaDGT)}</etiqueta_dgt>
    <precio moneda="EUR" impuestos_incluidos="true">${v.precio.contado}</precio>
    <descripcion>${esc(v.descripcion)}</descripcion>
    <equipamiento>${v.equipamiento.map((e) => `<item>${esc(e)}</item>`).join("")}</equipamiento>
    <fotos>${v.fotos.map((f) => `<foto orden="${f.orden}">${esc(f.url)}</foto>`).join("")}</fotos>
    <url>${esc(v.url)}</url><estado>${esc(v.estado)}</estado>
    <vendedor><nombre>${esc(v.vendedor.nombre)}</nombre><telefono>${esc(v.vendedor.telefono)}</telefono><email>${esc(v.vendedor.email)}</email><localidad>${esc(v.vendedor.localidad)}</localidad><cp>${esc(v.vendedor.cp)}</cp></vendedor>
  </vehiculo>`,
};
export const envolverXml = (items: string[], generado: string) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<inventario generado="${esc(generado)}" empresa="Volcano Cars" total="${items.length}">\n${items.join("\n")}\n</inventario>\n`;

// ---------- 3) Catálogo de vehículos de Meta (Anuncios de inventario automotriz de Facebook/Instagram) ----------
const csv = (s: unknown) => { const t = String(s ?? "").replace(/\r?\n/g, " "); return /[",]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
export const META_COLUMNAS = ["vehicle_id", "title", "description", "url", "make", "model", "year", "mileage.value", "mileage.unit", "price", "state_of_vehicle", "fuel_type", "transmission", "exterior_color", "image[0].url", "image[1].url", "image[2].url", "address", "availability"];
export const metaVehiculos: Canal<string[]> = {
  id: "meta", modo: "feed", nombre: "Meta · catálogo de vehículos",
  validar: (v) => [...validarBase(v), ...(v.descripcion.length < 10 ? ["Meta pide una descripción"] : [])],
  transformar: (v) => [v.id, `${v.marca} ${v.modelo} ${v.version}`.trim(), v.descripcion.slice(0, 5000), v.url, v.marca, v.modelo, String(v.matriculacion.anio), String(v.km), "KM",
    `${v.precio.contado} EUR`, "USED", v.combustible.toUpperCase(), v.cambio === "automatico" ? "AUTOMATIC" : "MANUAL", v.color,
    v.fotos[0]?.url ?? "", v.fotos[1]?.url ?? "", v.fotos[2]?.url ?? "",
    JSON.stringify({ addr1: v.vendedor.direccion, city: v.vendedor.localidad, region: v.vendedor.provincia, postal_code: v.vendedor.cp, country: "ES" }),
    v.estado === "disponible" ? "AVAILABLE" : "PENDING"].map(csv),
};
export const metaCsv = (filas: string[][]) => [META_COLUMNAS.join(","), ...filas.map((f) => f.join(","))].join("\n") + "\n";

// ---------- 4) Feed JSON con el esquema unificado completo (para multipublicadores y DMS que lo aceptan) ----------
export const feedJson: Canal<VehiculoUnificado> = {
  id: "json", modo: "feed", nombre: "Feed JSON",
  validar: (v) => validarBase(v),
  transformar: (v) => v,
};
export const envolverJson = (vs: VehiculoUnificado[], generado: string) => JSON.stringify({ schema: "volcanocars.inventario.v1", generado, empresa: "Volcano Cars", total: vs.length, vehiculos: vs }, null, 1);

export const CANALES: Record<string, Canal<any>> = { autoscout24, xml: feedXmlGenerico, meta: metaVehiculos, json: feedJson };
