import { getStore, getDeployStore } from "@netlify/blobs";
import { timingSafeEqual, createHash } from "node:crypto";

// Datos reales solo en producción; las vistas previas usan un almacén aparte.
export function store(name: string) {
  const ctx = (globalThis as any).Netlify?.context?.deploy?.context;
  if (ctx === "production") return getStore({ name, consistency: "strong" });
  return getDeployStore(name);
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

// Comprueba la contraseña del panel (variable de entorno ADMIN_PASSWORD).
export function isAdmin(req: Request): boolean {
  const expected = (globalThis as any).Netlify?.env?.get("ADMIN_PASSWORD") || "";
  if (!expected) return false;
  const given = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

export type Car = {
  id: string;
  marca: string;
  modelo: string;
  version: string;
  anio: number;
  km: number;
  combustible: string;
  cambio: string;
  cv: number | null;
  puertas: number | null;
  color: string;
  etiqueta: string;
  precio: number;
  descripcion: string;
  equipamiento: string[];
  fotos: string[];
  estado: "disponible" | "reservado" | "vendido";
  destacado: boolean;
  creado: string;
  actualizado: string;
  vendidoEn?: string;
};

const ESTADOS = ["disponible", "reservado", "vendido"];

// Fotos subidas desde el panel (se guardan en Blobs) o fotos fijas de la web (carpeta /coches/).
export const esFotoSubida = (k: string) => /^[a-z0-9-]+\.(jpg|webp|png)$/.test(k);
export const esFotoFija = (k: string) => /^\/coches\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|webp|png)$/.test(k);

// Coche que ya estaba publicado en la web: se mete una sola vez en la base de datos del panel
// para que aparezca en «Tus coches» y se pueda editar, reservar, marcar como vendido o borrar.
export const SEMILLA: Car[] = [
  {
    id: "opel-astra-2010",
    marca: "Opel", modelo: "Astra", version: "1.6 115 CV",
    anio: 2010, km: 262679, combustible: "Gasolina", cambio: "Manual",
    cv: 115, puertas: 5, color: "Negro", etiqueta: "C",
    precio: 2999.99,
    descripcion: "Opel Astra 1.6 de 115 CV, gasolina y cambio manual, con todo el mantenimiento importante recién hecho: kit de distribución nuevo con bomba de agua, y aceite y todos los filtros sustituidos. Neumáticos al 90 % de vida útil.\n\nCoche muy cuidado, mecánicamente en muy buen estado y listo para rodar sin invertir un euro más. Ideal si buscas un coche fiable y cómodo para el día a día.\n\nVen a verlo y pruébalo sin compromiso. Nosotros nos encargamos del cambio de nombre.",
    equipamiento: ["Aire acondicionado", "Cierre centralizado", "Elevalunas eléctricos", "Llantas de aleación", "5 plazas", "Kit de distribución nuevo con bomba de agua", "Aceite y filtros recién cambiados", "Neumáticos al 90 %"],
    fotos: [1, 2, 3, 4, 5, 6].map((i) => `/coches/opel-astra-2010/${i}.jpg`),
    estado: "disponible", destacado: true,
    creado: "2026-09-22T12:00:00.000Z", actualizado: "2026-09-22T12:00:00.000Z",
  },
];
const str = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);
const int = (v: unknown) => {
  const n = parseInt(String(v ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};

// Precio con céntimos: acepta "2999,99", "2.999,99" o 2999.99
const money = (v: unknown) => {
  if (typeof v === "number") return Number.isFinite(v) ? Math.round(v * 100) / 100 : null;
  let t = String(v ?? "").replace(/[^\d.,]/g, "");
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  else if (/\.\d{3}$/.test(t)) t = t.replace(/\./g, "");
  const n = parseFloat(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
};

// Limpia y valida lo que llega del panel.
export function cleanCar(input: any, prev?: Car): { car?: Car; error?: string } {
  const now = new Date().toISOString();
  const car: Car = {
    id: prev?.id || crypto.randomUUID(),
    marca: str(input.marca, 60),
    modelo: str(input.modelo, 60),
    version: str(input.version, 120),
    anio: int(input.anio) ?? 0,
    km: int(input.km) ?? 0,
    combustible: str(input.combustible, 30),
    cambio: str(input.cambio, 30),
    cv: int(input.cv),
    puertas: int(input.puertas),
    color: str(input.color, 40),
    etiqueta: str(input.etiqueta, 10),
    precio: money(input.precio) ?? 0,
    descripcion: str(input.descripcion, 4000),
    equipamiento: (Array.isArray(input.equipamiento) ? input.equipamiento : String(input.equipamiento || "").split("\n"))
      .map((x: unknown) => str(x, 120)).filter(Boolean).slice(0, 60),
    fotos: (Array.isArray(input.fotos) ? input.fotos : []).map((x: unknown) => str(x, 100)).filter((k: string) => esFotoSubida(k) || esFotoFija(k)).slice(0, 30),
    estado: ESTADOS.includes(input.estado) ? input.estado : "disponible",
    destacado: !!input.destacado,
    creado: prev?.creado || now,
    actualizado: now,
  };
  // Fecha de venta: se guarda al marcarlo como vendido (para «Vendido en X días»).
  if (car.estado === "vendido") car.vendidoEn = prev?.estado === "vendido" && prev.vendidoEn ? prev.vendidoEn : now;
  if (!car.marca || !car.modelo) return { error: "Falta la marca o el modelo." };
  if (car.anio < 1950 || car.anio > new Date().getFullYear() + 1) return { error: "El año no es válido." };
  if (!car.precio) return { error: "Falta el precio." };
  return { car };
}
