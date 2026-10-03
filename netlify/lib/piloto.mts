import { store, canarias, sumarDias } from "./shared.mts";
import { diaResumido } from "./analitica.mts";
import { leerCoches } from "./marketing.mts";

/*
  PILOTO DE CONVERSIÓN EN LA WEB  ·  lógica común de /api/piloto-web (público + panel)
  --------------------------------------------------------------------------------------
  El panel guarda unas REGLAS (interruptores y números). Este archivo las cruza con los datos REALES de la web
  (personas que abren cada ficha, solicitudes, tráfico por hora) y publica un «estado» pequeño que lee la web
  (public/piloto-web.js) para actuar sola en la ficha del coche:
    · Prueba social: «N personas han pedido información de este coche hoy» (solo si es verdad).
    · Regla A (baja conversión): coche con ≥ X personas distintas en la ficha y 0 solicitudes → destacado de
      financiación / vídeo 360° / informe por WhatsApp.
    · Regla B (hora punta): en la hora de más tráfico, botón flotante de consulta rápida por WhatsApp.
    · Lectura 25 s y gesto de salida: ventana amable con wa.me (enlace gratuito, sin API de pago).
  Nada se inventa: sin datos, no se enseña nada. No se guarda nada personal.
*/

export type Reglas = {
  prueba: boolean;                                                  // chips de prueba social real
  lectura: { on: boolean; seg: number };                            // ventana tras X segundos leyendo la ficha
  salida: { on: boolean };                                          // ventana al intentar salir
  A: { on: boolean; visitas: number; dias: number; accion: "auto" | "fin" | "video" | "informe" };
  B: { on: boolean; modo: "auto" | "manual"; desde: number; hasta: number };
  maxSesion: number;                                                // ventanas flotantes como mucho por visita
};
export const REGLAS_BASE: Reglas = {
  prueba: true,
  lectura: { on: true, seg: 25 },
  salida: { on: true },
  A: { on: true, visitas: 10, dias: 7, accion: "auto" },
  B: { on: true, modo: "auto", desde: 22, hasta: 23 },
  maxSesion: 2,
};
const num = (v: unknown, min: number, max: number, def: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : def; };
const bool = (v: unknown, def: boolean) => (typeof v === "boolean" ? v : def);

export function limpiarReglas(i: any): Reglas {
  const b = REGLAS_BASE;
  const acc = ["auto", "fin", "video", "informe"].includes(i?.A?.accion) ? i.A.accion : b.A.accion;
  return {
    prueba: bool(i?.prueba, b.prueba),
    lectura: { on: bool(i?.lectura?.on, b.lectura.on), seg: num(i?.lectura?.seg, 10, 120, b.lectura.seg) },
    salida: { on: bool(i?.salida?.on, b.salida.on) },
    A: { on: bool(i?.A?.on, b.A.on), visitas: num(i?.A?.visitas, 2, 200, b.A.visitas), dias: num(i?.A?.dias, 1, 14, b.A.dias), accion: acc },
    B: { on: bool(i?.B?.on, b.B.on), modo: i?.B?.modo === "manual" ? "manual" : "auto", desde: num(i?.B?.desde, 0, 23, b.B.desde), hasta: num(i?.B?.hasta, 1, 24, b.B.hasta) },
    maxSesion: num(i?.maxSesion, 1, 5, b.maxSesion),
  };
}

export const pw = () => store("pilotoweb");
export async function leerReglas(): Promise<Reglas> {
  const c = (await pw().get("reglas", { type: "json" }).catch(() => null)) as any;
  return limpiarReglas(c || {});
}

export type EstadoWeb = {
  t: string;
  reglas: Reglas;
  hora: { punta: boolean; h: number | null; desde: number; hasta: number };
  coches: Record<string, { p: number; s: number; sHoy: number; banner: boolean }>;
};

// Solicitudes por coche: en la ventana y hoy. Solo se miran las claves recientes (el nombre empieza por la fecha).
async function solicitudesPorCoche(dias: number, hoy: string) {
  const s = store("solicitudes");
  const { blobs } = await s.list({ prefix: "s/" });
  const desde = sumarDias(hoy, -dias);
  const f = (k: string) => k.slice(2, 6) + "-" + k.slice(6, 8) + "-" + k.slice(8, 10);
  const rec = blobs.filter((b) => f(b.key) >= sumarDias(desde, -1));
  const out: Record<string, { n: number; hoy: number }> = {};
  for (let i = 0; i < rec.length; i += 25) {
    const r = await Promise.all(rec.slice(i, i + 25).map((b) => s.get(b.key, { type: "json" }).catch(() => null)));
    for (const x of r as any[]) {
      const id = x?.coche?.id; if (!id || x.manual) continue;
      const t = String(x.creado || "");
      const d = t ? new Date(t) : null; if (!d || isNaN(+d)) continue;
      const dia = canarias(d).fecha;
      if (dia < desde) continue;
      const o = (out[id] ||= { n: 0, hoy: 0 }); o.n++; if (dia === hoy) o.hoy++;
    }
  }
  return out;
}

export async function calcularEstado(): Promise<EstadoWeb> {
  const reglas = await leerReglas();
  const { fecha: hoy, hora } = canarias();
  const fechas = Array.from({ length: 14 }, (_, i) => sumarDias(hoy, -i)); // hoy + 13 días
  const res: Awaited<ReturnType<typeof diaResumido>>[] = [];
  for (let i = 0; i < fechas.length; i += 7) res.push(...(await Promise.all(fechas.slice(i, i + 7).map((f) => diaResumido(f, hoy)))));
  // personas distintas por coche en la ventana (suma diaria; una persona que vuelve otro día cuenta otra vez)
  const personas: Record<string, number> = {};
  res.slice(0, reglas.A.dias).forEach((d) => { for (const [k, v] of Object.entries(d.cochesV || {})) personas[k] = (personas[k] || 0) + v; });
  // hora con más tráfico (14 días)
  const h = Array(24).fill(0); res.forEach((d) => (d.horas || []).forEach((v, i) => (h[i] += v)));
  const tot = h.reduce((a, b) => a + b, 0);
  const pico = tot >= 30 ? h.indexOf(Math.max(...h)) : null;
  const desde = reglas.B.modo === "manual" ? reglas.B.desde : pico ?? -1;
  const hasta = reglas.B.modo === "manual" ? reglas.B.hasta : pico !== null ? pico + 1 : -1;
  const punta = desde >= 0 && (desde < hasta ? hora >= desde && hora < hasta : hora >= desde || hora < hasta);

  const [cars, sol] = await Promise.all([leerCoches(), solicitudesPorCoche(reglas.A.dias, hoy).catch(() => ({} as Record<string, { n: number; hoy: number }>))]);
  const coches: EstadoWeb["coches"] = {};
  for (const c of cars) {
    if (c.estado !== "disponible") continue;
    const p = personas[c.id] || 0, s = sol[c.id]?.n || 0, sHoy = sol[c.id]?.hoy || 0;
    const banner = reglas.A.on && p >= reglas.A.visitas && s === 0;
    if (p || s || banner) coches[c.id] = { p, s, sHoy, banner };
  }
  return { t: new Date().toISOString(), reglas, hora: { punta, h: pico, desde, hasta }, coches };
}

// El estado se guarda 10 minutos: la web no hace cálculos pesados por cada visitante.
export async function estadoWeb(forzar = false): Promise<EstadoWeb> {
  if (!forzar) {
    const g = (await pw().get("estado", { type: "json" }).catch(() => null)) as EstadoWeb | null;
    if (g && Date.now() - Date.parse(g.t) < 10 * 60e3) {
      // los interruptores se leen siempre al día; los números pueden tener hasta 10 min
      const reglas = await leerReglas();
      return { ...g, reglas };
    }
  }
  const e = await calcularEstado();
  await pw().setJSON("estado", e).catch(() => {});
  return e;
}

/* ---------- eventos de las ventanas (para saber qué funciona) ---------- */
export const TIPOS_EV = ["prueba", "banner", "lectura", "salida", "punta"];
export const ACC_EV = ["mostrado", "clic", "cerrado"];
export async function resumenEventos(dias = 7) {
  const { fecha: hoy } = canarias();
  const out: Record<string, Record<string, number>> = {};
  for (let i = 0; i < dias; i++) {
    const f = sumarDias(hoy, -i);
    const { blobs } = await pw().list({ prefix: `ev/${f}/` });
    for (const b of blobs) {
      const p = b.key.split("/").pop()!.split("~"); // hora~tipo~acc~rand
      if (p.length < 3) continue;
      const o = (out[p[1]] ||= {}); o[p[2]] = (o[p[2]] || 0) + 1;
    }
  }
  return out;
}
