/*
  MOTOR DE VENTAS (método Chris Voss) · reglas comunes a WhatsApp, Messenger e Instagram
  ---------------------------------------------------------------------------------------
  Funciones puras (sin red ni base de datos) para poder probarlas y usarlas desde cualquier canal:
   · sanear(texto)          filtro de salida: ninguna respuesta del agente sale con una frase prohibida
   · enHorario(ahora, ...)  ¿está una persona atendiendo? L–V 08:00–16:00 hora de Canarias, sin días cerrados
   · primeraGestion(...)    fuera de horario: cuándo se agenda la llamada / prueba de conducción (08:30 del
                            siguiente día laborable; las 08:30 de hoy si aún no han dado las 08:00 de un día laborable)
*/

export const HORA_GESTION = "08:30";

// ---------- 1) Frases prohibidas ----------
// Cada regla tolera mayúsculas, tildes, signos y espacios de más, y trae su sustituto honesto (sin presión falsa).
type Regla = { id: string; re: RegExp; por: string };
export const PROHIBIDAS: Regla[] = [
  { id: "ultimo-coche", re: /es\s+el\s+[uú]ltimo\s+coche/gi, por: "Ahora mismo este coche sigue disponible en la web" },
  { id: "confia", re: /conf[ií]a\s+en\s+m[ií]/gi, por: "Te lo dejo por escrito para que lo compruebes con calma" },
  { id: "decides", re: /¿?\s*por\s*qu[eé]\s+no\s+te\s+decides\s*\??/gi, por: "¿Qué te falta por saber para sentirte tranquilo con la decisión?" },
  { id: "negociable", re: /precio\s+negociable/gi, por: "El precio es el de la ficha; si quieres, una persona repasa contigo las condiciones" },
  { id: "solo-hoy", re: /oferta\s+(?:v[aá]lida\s+)?s[oó]lo?\s+por\s+hoy/gi, por: "Estas son las condiciones actuales de la web" },
];
export function sanear(texto: string): { texto: string; cambios: string[] } {
  let t = String(texto || ""); const cambios: string[] = [];
  for (const r of PROHIBIDAS) {
    r.re.lastIndex = 0;
    if (r.re.test(t)) { cambios.push(r.id); r.re.lastIndex = 0; t = t.replace(r.re, r.por); }
    r.re.lastIndex = 0;
  }
  return { texto: t, cambios };
}
export const tieneProhibidas = (texto: string) => PROHIBIDAS.some((r) => { r.re.lastIndex = 0; const v = r.re.test(texto); r.re.lastIndex = 0; return v; });

// ---------- 2) Horario y primera gestión ----------
const dia = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Atlantic/Canary", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const partes = (d: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Atlantic/Canary", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d).map((x) => [x.type, x.value]));
  return { sem: String(p.weekday), min: +p.hour * 60 + +p.minute };
};
const mas = (f: string, n: number) => new Date(Date.parse(f + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const finde = (f: string) => { const w = new Date(f + "T12:00:00Z").getUTCDay(); return w === 0 || w === 6; };
export const esLaborable = (f: string, cerrados: string[]) => !finde(f) && !cerrados.includes(f);

export function enHorario(ahora: Date, cerrados: string[] = []): boolean {
  const { min } = partes(ahora);
  return esLaborable(dia(ahora), cerrados) && min >= 8 * 60 && min < 16 * 60;
}
export function primeraGestion(ahora: Date, cerrados: string[] = []): { fecha: string; hora: string; hoy: boolean } {
  const hoy = dia(ahora), { min } = partes(ahora);
  if (esLaborable(hoy, cerrados) && min < 8 * 60) return { fecha: hoy, hora: HORA_GESTION, hoy: true }; // madrugada de un día laborable
  let f = mas(hoy, 1);
  for (let i = 0; i < 90 && !esLaborable(f, cerrados); i++) f = mas(f, 1);
  return { fecha: f, hora: HORA_GESTION, hoy: false };
}
