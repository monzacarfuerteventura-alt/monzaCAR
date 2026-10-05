// =====================================================================
// PRESENCIA EN LA NAVE · antitrampa del fichaje (actualización 44)
// El servidor comprueba, en el momento de fichar, que la persona está DENTRO de la nave. Nunca se fía del móvil:
//  · El móvil solo manda sus coordenadas (y la precisión); la distancia a la nave la calcula SIEMPRE el servidor.
//  · Si la geovalla está activa y no hay ubicación, o está fuera del radio, o es muy imprecisa → NO se ficha
//    (y queda anotado el intento en el libro encadenado y en «Accesos raros»).
//  · Cada fichaje bueno guarda su prueba: distancia a la nave, precisión, coordenadas (redondeadas a ~1 m)
//    y si venía de la WiFi de la nave. Solo en el instante de fichar: no se sigue a nadie.
//  · Señales para el gerente (no bloquean, avisan): coordenadas idénticas a otro fichaje (típico de las apps de
//    «ubicación falsa») y el mismo móvil fichando por dos personas el mismo día (fichar por un compañero).
// Datos (Netlify Blobs, tienda «jornada»):
//   config/nave           → { lat, lng, radio, activa, precision, fijada, por, redes[] }
//   config/pos-recientes  → últimas posiciones para detectar coordenadas repetidas
//   config/rechazos       → últimos intentos rechazados (los ve el gerente en la pestaña Jornada)
//   dev/AAAA-MM-DD/<huella> → quién ha fichado hoy desde cada móvil
// =====================================================================
import { store } from "./shared.mts";
import { huella } from "./seguridad.mts";

const jstore = () => store("jornada");

export type Nave = { lat: number; lng: number; radio: number; activa: boolean; precision: number; fijada: string; por: string; redes: string[] };
export type Prueba = { r: "nave"; d: number; a: number; lat: number; lng: number; red: boolean; alerta?: string[]; dv?: string };
export type Pos = { lat: number; lng: number; acc: number; edad?: number };

export const RADIO_MIN = 40, RADIO_MAX = 200, RADIO_DEF = 80;   // actualización 45: radio máximo 200 m (antes 500) y por defecto 80 m
export const ACC_MAX = 50;      // más impreciso que esto no vale para fichar (antes 100)
export const ACC_FIJAR = 50;    // para FIJAR la nave se exige la misma precisión
export const EDAD_MAX = 30000;  // una ubicación de hace más de 30 s no vale (el móvil manda la edad de la lectura)
export const radioEfectivo = (n: { radio: number }) => Math.min(RADIO_MAX, Math.max(RADIO_MIN, Math.round(Number(n.radio) || RADIO_DEF)));

// Distancia en metros entre dos puntos (fórmula de haversine)
export function distM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371008.8, rad = (x: number) => (x * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Valida lo que manda el móvil: números finitos, dentro de rango. Si algo no cuadra → null (= «sin ubicación»).
export function leerPos(x: any): Pos | null {
  if (!x || typeof x !== "object") return null;
  const lat = Number(x.lat), lng = Number(x.lng), acc = Number(x.acc);
  if (![lat, lng, acc].every(Number.isFinite) || Math.abs(lat) > 90 || Math.abs(lng) > 180 || acc < 0) return null;
  if (lat === 0 && lng === 0) return null;
  const edad = x.edad === undefined || x.edad === null ? undefined : Number(x.edad);
  return { lat, lng, acc, ...(edad !== undefined && Number.isFinite(edad) ? { edad } : {}) };
}

export async function leerNave(): Promise<Nave | null> {
  const n = (await jstore().get("config/nave", { type: "json" }).catch(() => null)) as Nave | null;
  return n && Number.isFinite(n.lat) && Number.isFinite(n.lng) ? { ...n, redes: n.redes || [] } : null;
}
export const guardarNave = (n: Nave) => jstore().setJSON("config/nave", n);
export const clampRadio = (r: unknown) => Math.min(RADIO_MAX, Math.max(RADIO_MIN, Math.round(Number(r) || RADIO_DEF)));

const dvDe = (did: unknown) => (/^[A-Za-z0-9_-]{16,40}$/.test(String(did || "")) ? huella("dev|" + did).slice(0, 12) : "");
const hoyUTC = () => new Date().toISOString().slice(0, 10);

export type Veredicto = { ok: true; prueba: Prueba } | { ok: false; codigo: "sin-ubicacion" | "imprecisa" | "fuera" | "antigua"; mensaje: string; d?: number; a?: number };

// ¿Está en la nave? (no escribe nada: solo mira)
export async function evaluar(q: { uid: string; nombre: string }, body: any, ip: string, nave: Nave): Promise<Veredicto> {
  const pos = leerPos(body && body.pos);
  if (!pos) return { ok: false, codigo: "sin-ubicacion", mensaje: "No hemos podido saber dónde estás. Activa la ubicación (GPS) del móvil, permite «Ubicación» para este sitio y vuelve a pulsar. Si no te deja, avisa al gerente." };
  const a = Math.round(pos.acc);
  if (pos.edad !== undefined && pos.edad > EDAD_MAX) return { ok: false, codigo: "antigua", a, mensaje: "La ubicación que ha mandado tu móvil es antigua. Vuelve a pulsar y espera unos segundos a que el GPS la actualice." };
  if (pos.acc > ACC_MAX) return { ok: false, codigo: "imprecisa", a, mensaje: `Tu ubicación es muy imprecisa (±${a} m). Activa el GPS en alta precisión, acércate a la puerta de la nave y vuelve a pulsar.` };
  const d = Math.round(distM(pos.lat, pos.lng, nave.lat, nave.lng)), radio = radioEfectivo(nave);
  if (d > radio) return { ok: false, codigo: "fuera", d, a, mensaje: `Estás a ${d >= 1000 ? (d / 1000).toFixed(1).replace(".", ",") + " km" : d + " m"} del taller. Solo se puede fichar en la nave.` };
  // REGLA ESTRICTA (45): el círculo de error del GPS tiene que caber ENTERO dentro de la nave (distancia + error ≤ radio).
  if (d + a > radio) return { ok: false, codigo: "imprecisa", d, a, mensaje: `Parece que estás cerca, pero tu GPS tiene ±${a} m de error y no puedo confirmar que estés DENTRO de la nave (estás a ${d} m). Acércate a la puerta, espera unos segundos a que el GPS se afine y vuelve a pulsar.` };
  const alerta: string[] = [];
  const k = pos.lat.toFixed(6) + "," + pos.lng.toFixed(6);
  // Un GPS real nunca repite 6 decimales: si coincide con un fichaje anterior (de cualquiera), huele a ubicación simulada.
  if (pos.acc <= 30) {
    const rec = ((await jstore().get("config/pos-recientes", { type: "json" }).catch(() => null)) as { k: string; uid: string; t: string }[] | null) || [];
    if (rec.some((x) => x.k === k)) alerta.push("posicion-repetida");
  }
  const dv = dvDe(body && body.did);
  if (dv) {
    const hoy = ((await jstore().get(`dev/${hoyUTC()}/${dv}`, { type: "json" }).catch(() => null)) as { uids: string[] } | null) || { uids: [] };
    if (hoy.uids.some((u) => u !== q.uid)) alerta.push("mismo-movil");
  }
  return { ok: true, prueba: { r: "nave", d, a, lat: +pos.lat.toFixed(5), lng: +pos.lng.toFixed(5), red: nave.redes.includes(huella(ip)), ...(alerta.length ? { alerta } : {}), ...(dv ? { dv } : {}) } };
}

// «Comprobar dónde estoy» (solo gerente): mismas reglas que al fichar, pero sin fichar ni anotar nada
export function diagnostico(x: any, nave: Nave) {
  const pos = leerPos(x), radio = radioEfectivo(nave);
  if (!pos) return { ok: false, dentro: false, radio, texto: "No he recibido tu ubicación (GPS apagado o sin permiso)." };
  const a = Math.round(pos.acc), d = Math.round(distM(pos.lat, pos.lng, nave.lat, nave.lng));
  const dentro = d <= radio && d + a <= radio && a <= ACC_MAX && !(pos.edad !== undefined && pos.edad > EDAD_MAX);
  const texto = `Estás a ${d} m del centro de la nave (GPS ±${a} m). Radio permitido: ${radio} m. ` + (dentro ? "→ DENTRO: aquí se podría fichar ✓" : a > ACC_MAX ? "→ GPS demasiado impreciso: NO se podría fichar." : d > radio ? "→ FUERA: NO se podría fichar." : "→ No se puede confirmar que estés dentro (el error del GPS se sale del radio): NO se podría fichar.");
  return { ok: true, dentro, d, a, radio, texto };
}

// Tras un fichaje bueno: recuerda posición y móvil para detectar repeticiones en los siguientes
export async function memorizar(uid: string, pos: Pos | null, dv: string | undefined) {
  const tareas: Promise<unknown>[] = [];
  if (pos && pos.acc <= 30) {
    tareas.push((async () => {
      const rec = ((await jstore().get("config/pos-recientes", { type: "json" }).catch(() => null)) as any[] | null) || [];
      rec.push({ k: pos.lat.toFixed(6) + "," + pos.lng.toFixed(6), uid, t: new Date().toISOString() });
      await jstore().setJSON("config/pos-recientes", rec.slice(-80));
    })());
  }
  if (dv) {
    tareas.push((async () => {
      const clave = `dev/${hoyUTC()}/${dv}`;
      const hoy = ((await jstore().get(clave, { type: "json" }).catch(() => null)) as { uids: string[] } | null) || { uids: [] };
      if (!hoy.uids.includes(uid)) { hoy.uids.push(uid); await jstore().setJSON(clave, hoy); }
    })());
  }
  await Promise.all(tareas.map((t) => t.catch(() => null)));
}

export type Rechazo = { t: string; uid: string; nombre: string; codigo: string; accion: string; via: string; d?: number; a?: number };
export async function anotarRechazo(r: Rechazo) {
  const l = ((await jstore().get("config/rechazos", { type: "json" }).catch(() => null)) as Rechazo[] | null) || [];
  l.unshift(r);
  await jstore().setJSON("config/rechazos", l.slice(0, 60));
}
export async function leerRechazos(dias = 14): Promise<Rechazo[]> {
  const l = ((await jstore().get("config/rechazos", { type: "json" }).catch(() => null)) as Rechazo[] | null) || [];
  const desde = Date.now() - dias * 864e5;
  return l.filter((x) => Date.parse(x.t) > desde);
}

// Lo que ve el gerente de la nave (sin las huellas de las redes)
export const naveVista = (n: Nave | null) => (n ? { lat: +n.lat.toFixed(5), lng: +n.lng.toFixed(5), radio: radioEfectivo(n), activa: n.activa, precision: Math.round(n.precision), fijada: n.fijada, por: n.por, redes: n.redes.length } : null);
