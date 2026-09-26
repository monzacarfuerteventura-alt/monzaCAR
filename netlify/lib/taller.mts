// =====================================================================
// TALLER · Manual SOP-01 (Recepción, inspección y control de tiempos)
// Equipo con PIN, fichas FORM-01..04, fichajes que no se pueden tocar sin el gerente y auditoría.
// =====================================================================
import { createHash, createHmac, randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";
import { store, isAdmin, minIat } from "./shared.mts";

const envGet = (k: string) => (globalThis as any).Netlify?.env?.get(k) || "";
const clave = () => createHash("sha256").update("vc-equipo|" + envGet("ADMIN_PASSWORD") + "|" + envGet("SESSION_SECRET")).digest();

export type Rol = "gerente" | "mecanico" | "calidad" | "recepcion";
export const ROLES: Rol[] = ["mecanico", "calidad", "recepcion", "gerente"];
export type Persona = { id: string; nombre: string; usuario: string; rol: Rol; jornada: number; activo: boolean; alta: string; caja?: boolean; pin?: { s: string; h: string } };
export type Config = { tarifa: number; jornada: number; umbralPct: number; umbralMin: number; igic: number };
export const CONFIG_DEFECTO: Config = { tarifa: 45, jornada: 8, umbralPct: 15, umbralMin: 30, igic: 7 };

export const tstore = () => store("taller");
export async function leerConfig(): Promise<Config> { return { ...CONFIG_DEFECTO, ...((await tstore().get("config", { type: "json" }).catch(() => null)) as Partial<Config> | null || {}) }; }
export async function leerEquipo(): Promise<Persona[]> { return ((await tstore().get("equipo", { type: "json" }).catch(() => null)) as Persona[] | null) || []; }
export const hashPin = (pin: string, s = randomBytes(12).toString("base64url")) => ({ s, h: pbkdf2Sync(pin, s + "|vc-pin", 120000, 32, "sha256").toString("base64url") });
export function pinOk(pin: string, p?: { s: string; h: string }) {
  if (!p) return false;
  const a = Buffer.from(hashPin(pin, p.s).h), b = Buffer.from(p.h);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Sesión del equipo: v2.iat.exp.n.uid.firma (la del gerente sigue siendo la v1 de siempre)
export function crearSesionEquipo(uid: string, horas = 12) {
  const iat = Date.now(), exp = iat + horas * 3600e3, n = randomBytes(9).toString("base64url");
  const cuerpo = `v2.${iat}.${exp}.${n}.${uid}`;
  return { token: cuerpo + "." + createHmac("sha256", clave()).update(cuerpo).digest("base64url"), exp };
}
function leerSesionEquipo(token: string) {
  const p = String(token || "").split(".");
  if (p.length !== 6 || p[0] !== "v2" || !envGet("ADMIN_PASSWORD")) return null;
  const esperada = createHmac("sha256", clave()).update(p.slice(0, 5).join(".")).digest();
  let dada: Buffer; try { dada = Buffer.from(p[5], "base64url"); } catch { return null; }
  if (dada.length !== esperada.length || !timingSafeEqual(dada, esperada)) return null;
  const iat = Number(p[1]), exp = Number(p[2]);
  if (!Number.isFinite(exp) || exp < Date.now() || iat > Date.now() + 60e3) return null;
  return { iat, exp, uid: p[4] };
}
export type Quien = { uid: string; nombre: string; rol: Rol; admin: boolean; caja: boolean };
// Quién hace la petición: el gerente (contraseña del panel) o una persona del equipo (usuario + PIN)
export async function quien(req: Request): Promise<Quien | null> {
  if (await isAdmin(req)) return { uid: "gerente", nombre: "Gerente", rol: "gerente", admin: true, caja: true };
  const s = leerSesionEquipo((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""));
  if (!s || s.iat < (await minIat())) return null;
  const p = (await leerEquipo()).find((x) => x.id === s.uid && x.activo);
  if (!p) return null;
  return { uid: p.id, nombre: p.nombre, rol: p.rol, admin: p.rol === "gerente", caja: p.rol === "gerente" || !!p.caja };
}

// ---------- fichas ----------
export type Estado4 = "ok" | "a" | "r" | "na" | "";
export type Marca = { v: string; x: number; y: number; t: string };
export type F1 = {
  fecha: string; hora: string; cliente: { nombre: string; doc: string; telefono: string; email: string; titular: string; contacto: string };
  recibidoPor: string; entregaPrometida: string; tipoEntrada: string;
  vehiculo: { matricula: string; marcaModelo: string; vin: string; anioColor: string; km: string; kmFoto: string; itv: string; combustible: string; nivel: string; testigos: string };
  motivo: string; inventario: Record<string, { v: string; nota: string }>; llaves: string;
  danos: Marca[]; fotosDanos: string[]; sinDanos: boolean;
  autorizoHasta: string; avisosWhatsApp: boolean;
  avisosITV?: boolean; avisosITVFecha?: string; // consentimiento APARTE para avisos de caducidad de ITV (comercial)
  firmaCliente: string; firmadoCliente: string; firmaTaller: { uid: string; nombre: string; t: string } | null; cerrada: boolean;
};
export type F2 = {
  mecanico: string; items: Record<string, { e: Estado4; nota: string; extra: string; fotos: string[] }>;
  horasEst: number; recomendacion: string; rechazoFirmado: boolean; firma: { uid: string; nombre: string; t: string } | null; cerrada: boolean; inicio: string;
};
export type Evento = { tipo: "inicio" | "pausa" | "reanudar" | "fin"; t: string; por: string; motivo: string; nota: string; corr?: { t0: string; por: string; motivo: string; en: string }[] };
export type F3 = {
  mecanico: string; tarifa: number; estMin: number; tipo: string; hoja: string; eventos: Evento[];
  justificacion: { codigos: string[]; explicacion: string; avisado: string; mejora: string; t: string; por: string } | null;
  vistoBueno: { t: string; por: string; nota: string } | null; retrabajos: { t: string; causa: string; por: string }[];
};
export type F4 = {
  destino: string; items: Record<string, "si" | "no" | "na" | "">; notas: Record<string, string>;
  resultado: string; motivo: string; firma: { uid: string; nombre: string; t: string } | null; cierreGerente: { t: string; por: string } | null; intentos: number;
};
export type Fichas = { token: string; num: string; f1: F1 | null; f2: F2 | null; f3: F3 | null; f4: F4 | null; audit: { t: string; por: string; nombre: string; rol: string; accion: string; detalle: string }[] };

// ---------- tiempos (FORM-03) ----------
export const MOTIVOS_PAUSA = ["Recambio pendiente", "Otro coche urgente", "Comida / descanso", "Espera de autorización del cliente", "Falta de herramienta", "Otro"];
export type Tramo = { ini: number; fin: number; trabajo: boolean; motivo: string; por: string };
export function tramos(ev: Evento[], ahora = Date.now()): Tramo[] {
  const out: Tramo[] = []; let abierto: { t: number; trabajo: boolean; motivo: string; por: string } | null = null;
  for (const e of [...ev].sort((a, b) => a.t.localeCompare(b.t))) {
    const t = Date.parse(e.t);
    if (abierto) out.push({ ini: abierto.t, fin: t, trabajo: abierto.trabajo, motivo: abierto.motivo, por: abierto.por });
    abierto = e.tipo === "inicio" || e.tipo === "reanudar" ? { t, trabajo: true, motivo: "", por: e.por } : e.tipo === "pausa" ? { t, trabajo: false, motivo: e.motivo || "Otro", por: e.por } : null;
  }
  if (abierto) out.push({ ini: abierto.t, fin: ahora, trabajo: abierto.trabajo, motivo: abierto.motivo, por: abierto.por });
  return out.filter((x) => x.fin > x.ini);
}
export function estadoTiempo(ev: Evento[]): "sin" | "trabajando" | "pausa" | "fin" {
  const u = [...ev].sort((a, b) => a.t.localeCompare(b.t)).pop();
  if (!u) return "sin";
  return u.tipo === "pausa" ? "pausa" : u.tipo === "fin" ? "fin" : "trabajando";
}
export function calculo(f3: F3 | null, cfg: Config, ahora = Date.now()) {
  if (!f3) return null;
  const tr = tramos(f3.eventos, ahora);
  const netoMin = Math.round(tr.filter((x) => x.trabajo).reduce((a, x) => a + (x.fin - x.ini), 0) / 6e4);
  const pausasMin = Math.round(tr.filter((x) => !x.trabajo).reduce((a, x) => a + (x.fin - x.ini), 0) / 6e4);
  const totalMin = netoMin + pausasMin;
  const est = f3.estMin || 0;
  const desvMin = est ? netoMin - est : 0;
  const desvPct = est ? Math.round(((netoMin - est) / est) * 1000) / 10 : 0;
  const estado = estadoTiempo(f3.eventos);
  const exige = estado === "fin" && est > 0 && (desvPct > cfg.umbralPct || desvMin > cfg.umbralMin);
  const tarifa = f3.tarifa || cfg.tarifa;
  const manoObra = Math.round((netoMin / 60) * tarifa * 100) / 100;
  return { netoMin, pausasMin, totalMin, desvMin, desvPct, estado, exigeJustificacion: exige, justificada: !!f3.justificacion, aprobada: !!f3.vistoBueno, tarifa, manoObra };
}

// ---------- FORM-02: puntos del semáforo ----------
export const F2_SECCIONES: [string, string, string, [string, string, string?][]][] = [
  ["A", "Exterior y carrocería", "", [["a1", "Paragolpes delantero y trasero"], ["a2", "Capó, aletas y puertas: alineación y holguras"], ["a3", "Portón / maletero y cierres"], ["a4", "Pintura: rayones, picados, diferencias de tono"], ["a5", "Abolladuras o golpes"], ["a6", "Óxido por salitre (bajos de puertas, pasos de rueda)"], ["a7", "Parabrisas y cristales: grietas, impactos"], ["a8", "Retrovisores"], ["a9", "Limpiaparabrisas y escobillas"], ["a10", "Faros, pilotos, intermitentes, freno, marcha atrás"], ["a11", "Matrícula y soportes"], ["a12", "Bajos y protector de cárter (golpes de pistas)"], ["a13", "Escape: estado, fugas, soportes"]]],
  ["B", "Habitáculo e interior", "", [["b1", "Tapicería y asientos: roturas, manchas, mecanismos"], ["b2", "Cinturones: anclaje, retracción, hebillas"], ["b3", "Volante, palanca y pedales: desgaste"], ["b4", "Cuadro: testigos con contacto y con motor en marcha"], ["b5", "Aire acondicionado: enfría y no huele"], ["b6", "Calefacción y desempañado"], ["b7", "Elevalunas, cierre centralizado y mandos"], ["b8", "Radio, pantalla y conectividad"], ["b9", "Airbags: testigo apagado, tapas sin manipular"], ["b10", "Olores, humedad, arena o filtraciones"], ["b11", "Luces interiores y claxon"], ["b12", "Maletero: rueda, gato, herramientas"]]],
  ["C", "Mecánica básica", "capó abierto", [["c1", "Aceite motor: nivel y aspecto"], ["c2", "Refrigerante: nivel, color y circuito"], ["c3", "Líquido de frenos: nivel y color"], ["c4", "Líquido dirección asistida (si aplica)"], ["c5", "Líquido lavaparabrisas"], ["c6", "Batería: fecha, bornes, test de carga", "Voltios"], ["c7", "Correa de accesorios: grietas, tensión, ruido"], ["c8", "Distribución: fecha / km del último cambio", "Fecha · km"], ["c9", "Mangueras y abrazaderas"], ["c10", "Fugas de aceite, refrigerante o combustible"], ["c11", "Filtro de aire: polvo y arena (calima)"], ["c12", "Radiador y condensador A/C: obstruido o corroído"], ["c13", "Ruido y ralentí en frío"], ["c14", "Último mantenimiento (libro o factura)", "Fecha"]]],
  ["D", "Neumáticos, frenos y suspensión", "", [["d1", "Dibujo neumáticos (mín. legal 1,6 mm)", "DI · DD · TI · TD mm"], ["d2", "Presión, fecha DOT, grietas, hernias", "DOT más antiguo"], ["d3", "Desgaste irregular (alineación)"], ["d4", "Rueda de repuesto o kit"], ["d5", "Llantas: golpes o deformaciones"], ["d6", "Pastillas delanteras: espesor", "mm"], ["d7", "Pastillas traseras / zapatas: espesor", "mm"], ["d8", "Discos y tambores: rayado, bordes, alabeo"], ["d9", "Latiguillos y tuberías de freno"], ["d10", "Freno de mano: recorrido y eficacia"], ["d11", "Amortiguadores: fugas y rebote"], ["d12", "Rótulas, silentblocks, fuelles, bieletas"], ["d13", "Holguras en dirección y cojinetes"], ["d14", "Palieres y juntas: grasa o ruidos"]]],
  ["E", "Diagnosis OBD", "", [["e1", "Equipo OBD utilizado", "Equipo"], ["e2", "Códigos de avería activos (DTC)", "Códigos"], ["e3", "Códigos pendientes y almacenados"], ["e4", "Monitores de emisiones (listos / no listos)"], ["e5", "Datos en vivo: temperatura, sondas, ralentí, mezcla"], ["e6", "Módulos: ABS, airbag, transmisión, carrocería"], ["e7", "Kilometraje coherente entre módulos"], ["e8", "Informe OBD guardado en la carpeta"]]],
  ["F", "Prueba en carretera", "10–15 km, ciudad y tramo rápido", [["f1", "Arranque en frío y ralentí estable"], ["f2", "Aceleración: respuesta, tirones, humo"], ["f3", "Cambio / caja automática: suavidad, ruidos"], ["f4", "Embrague: punto de agarre, patina"], ["f5", "Frenada recta, sin vibración ni ruidos"], ["f6", "Dirección centrada, sin holguras ni vibración"], ["f7", "Suspensión: ruidos en baches y curvas"], ["f8", "Ruidos anómalos (rodamientos, transmisión)"], ["f9", "Temperatura de motor estable"], ["f10", "A/C funcionando en marcha"], ["f11", "Testigos encendidos durante la prueba"], ["f12", "Km recorridos en la prueba", "km"]]],
  ["G", "Documentación", "obligatorio en compra o retoma", [["g1", "Permiso de circulación y ficha técnica"], ["g2", "ITV en vigor", "Caduca"], ["g3", "Informe DGT: titularidad, cargas, embargos"], ["g4", "Impuesto de circulación al corriente"], ["g5", "Libro de mantenimiento y facturas"], ["g6", "Número de llaves y mando", "Llaves"], ["g7", "Kilometraje coherente (ITV, facturas, OBD)"]]],
];
export const F2_IDS = F2_SECCIONES.flatMap((s) => s[3].map((i) => i[0]));
export function resumenF2(f2: F2 | null) {
  if (!f2) return null;
  let rojos = 0, ambar = 0, hechos = 0;
  for (const id of F2_IDS) { const e = f2.items[id]?.e; if (e) hechos++; if (e === "r") rojos++; if (e === "a") ambar++; }
  return { rojos, ambar, hechos, total: F2_IDS.length, horasEst: f2.horasEst, recomendacion: f2.recomendacion, cerrada: f2.cerrada };
}

// ---------- FORM-04 ----------
export const F4_A: [string, string][] = [["a1", "Todos los trabajos autorizados en el presupuesto están hechos"], ["a2", "Puntos en ROJO de FORM-02 corregidos o rechazados por escrito"], ["a3", "No hay trabajos hechos sin autorización"], ["a4", "Recambios instalados = presupuesto = factura"], ["a5", "Piezas sustituidas guardadas para el cliente (si las pide)"], ["a6", "Pares de apriete revisados (ruedas, tren delantero, frenos)"], ["a7", "Sin fugas tras la reparación (revisado con motor caliente)"], ["a8", "Niveles de aceite, refrigerante y frenos correctos"], ["a9", "Presión de neumáticos según fabricante"], ["a10", "Testigos apagados y OBD sin averías nuevas"], ["a11", "Testigo de mantenimiento reiniciado (si procede)"], ["a12", "Prueba en carretera final sin ruidos ni vibraciones"], ["a13", "Luces, intermitentes, limpias, claxon y A/C funcionan"]];
export const F4_B: [string, string][] = [["b1", "Exterior lavado: sin grasa, huellas, arena ni salitre"], ["b2", "Cristales limpios por dentro y por fuera"], ["b3", "Interior aspirado, salpicadero y plásticos limpios"], ["b4", "Sin grasa en volante, palanca, tapicería y moquetas"], ["b5", "Protectores de asiento, alfombrilla y volante retirados"], ["b6", "Sin olores extraños (aceite, humedad, humo)"], ["b7", "Ningún daño nuevo respecto al croquis de FORM-01"], ["b8", "Herramientas y accesorios del coche en su sitio"]];
export const F4_C: [string, string][] = [["c1", "Objetos personales devueltos a su sitio"], ["c2", "Km y combustible de salida anotados"], ["c3", "Factura desglosada preparada"], ["c4", "Garantía explicada y entregada por escrito"], ["c5", "Puntos en ÁMBAR pendientes explicados"], ["c6", "Cliente avisado de la hora de recogida"], ["c7", "Repaso del coche y factura con el cliente"], ["c8", "Firma de conformidad del cliente"], ["c9", "QR de reseñas mostrado y tarjeta entregada"]];
export const F4_D: [string, string][] = [["d1", "Documentación completa y verificada"], ["d2", "Sin cargas ni embargos (o cancelados)"], ["d3", "Coste total anotado (compra + taller)"], ["d4", "Precio de venta y margen calculados"], ["d5", "Fotos del anuncio con el coche limpio"], ["d6", "Ficha con historial para el comprador"], ["d7", "2 llaves y libro en la carpeta del coche"], ["d8", "En exposición con llave etiquetada"], ["d9", "Anuncio publicado (web y portales)"]];

export const hoyCanarias = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Atlantic/Canary", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
export const horaCanarias = (d = new Date()) => new Intl.DateTimeFormat("es-ES", { timeZone: "Atlantic/Canary", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
