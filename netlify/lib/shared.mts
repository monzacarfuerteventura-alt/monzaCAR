import { getStore, getDeployStore } from "@netlify/blobs";
import { timingSafeEqual, createHash, createHmac, randomBytes } from "node:crypto";

// Datos reales solo en producción; las vistas previas usan un almacén aparte.
export function store(name: string) {
  const ctx = (globalThis as any).Netlify?.context?.deploy?.context;
  if (ctx === "production") return getStore({ name, consistency: "strong" });
  return getDeployStore(name);
}

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "cross-origin-resource-policy": "same-origin", "x-content-type-options": "nosniff" },
  });

// ---------------------------------------------------------------------------
// ACCESO AL PANEL
// La contraseña (variable ADMIN_PASSWORD) solo viaja una vez, al entrar. A cambio el servidor entrega
// una «sesión» firmada (HMAC-SHA256) que caduca a las 12 horas. La firma usa una clave derivada de la
// contraseña y de SESSION_SECRET: si cambias cualquiera de las dos, todas las sesiones abiertas mueren.
// «Cerrar sesión en todos los dispositivos» invalida además todo lo emitido antes de ese momento.
// ---------------------------------------------------------------------------
const envGet = (k: string) => (globalThis as any).Netlify?.env?.get(k) || "";
const claveSesion = () => createHash("sha256").update("vc-sesion|" + envGet("ADMIN_PASSWORD") + "|" + envGet("SESSION_SECRET")).digest();
export const SESION_HORAS = 12;
export function crearSesion(horas = SESION_HORAS) {
  const iat = Date.now(), exp = iat + horas * 3600e3, n = randomBytes(12).toString("base64url");
  const cuerpo = `v1.${iat}.${exp}.${n}`;
  return { token: cuerpo + "." + createHmac("sha256", claveSesion()).update(cuerpo).digest("base64url"), exp };
}
export function leerSesion(token: string): { iat: number; exp: number } | null {
  const p = String(token || "").split(".");
  if (p.length !== 5 || p[0] !== "v1" || !envGet("ADMIN_PASSWORD")) return null;
  const esperada = createHmac("sha256", claveSesion()).update(p.slice(0, 4).join(".")).digest();
  let dada: Buffer;
  try { dada = Buffer.from(p[4], "base64url"); } catch { return null; }
  if (dada.length !== esperada.length || !timingSafeEqual(dada, esperada)) return null;
  const iat = Number(p[1]), exp = Number(p[2]);
  if (!Number.isFinite(exp) || exp < Date.now() || iat > Date.now() + 60e3) return null;
  return { iat, exp };
}
let cacheMinIat = { v: 0, t: 0 };
export async function minIat(forzar = false) {
  if (!forzar && Date.now() - cacheMinIat.t < 15000) return cacheMinIat.v;
  const v = Number(await store("seguridad").get("config/min-iat").catch(() => 0)) || 0;
  cacheMinIat = { v, t: Date.now() };
  return v;
}
export async function cerrarTodasLasSesiones() {
  const v = Date.now();
  await store("seguridad").set("config/min-iat", String(v));
  cacheMinIat = { v, t: Date.now() };
}
// ¿La petición viene del panel con una sesión válida?
export async function isAdmin(req: Request): Promise<boolean> {
  const s = leerSesion((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""));
  if (!s) return false;
  return s.iat >= (await minIat());
}
// Compara dos textos sin que el tiempo de respuesta dé pistas
export function igualSeguro(a: string, b: string) {
  const x = createHash("sha256").update(String(a)).digest(), y = createHash("sha256").update(String(b)).digest();
  return timingSafeEqual(x, y);
}
// Rechaza envíos que vienen de otra web (el navegador siempre manda Origin en un POST desde JS)
export function mismoOrigen(req: Request) {
  const o = req.headers.get("origin");
  if (!o) return true;
  try { return new URL(o).host === new URL(req.url).host; } catch { return false; }
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
  video?: Video | null;
  creado: string;
  actualizado: string;
  vendidoEn?: string;
};

// Vídeo 360° del coche. «vuelta»: vídeo normal dando la vuelta al coche.
// «esferico»: grabado con cámara 360°, el cliente mueve la vista arrastrando.
export type Video = { key: string; tipo: "vuelta" | "esferico"; poster: string; dur: number; w: number; h: number };
export const esVideo = (k: string) => /^[0-9a-f-]{36}\.(mp4|webm|mov)$/.test(k);
export const VIDEO_TROZO = 4 * 1024 * 1024; // 4 MB por trozo: las funciones no aceptan cuerpos de más de 6 MB

// Borra todos los trozos de un vídeo (y su portada).
export async function borrarVideo(v?: { key?: string; poster?: string } | null) {
  if (!v?.key || !esVideo(v.key)) return;
  const s = store("monzacar-videos");
  const meta = (await s.get(v.key + "/meta", { type: "json" }).catch(() => null)) as { n?: number } | null;
  const n = Math.min(meta?.n ?? 0, 200);
  await Promise.all([...Array(n).keys()].map((i) => s.delete(`${v.key}/${i}`).catch(() => {})));
  await s.delete(v.key + "/meta").catch(() => {});
  if (v.poster && esFotoSubida(v.poster)) await store("monzacar-fotos").delete(v.poster).catch(() => {});
}

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

function cleanVideo(v: any): Video | null {
  if (!v || typeof v !== "object") return null;
  const key = str(v.key, 60);
  if (!esVideo(key)) return null;
  const num = (x: unknown, max: number) => { const n = Number(x); return Number.isFinite(n) && n > 0 ? Math.min(Math.round(n * 10) / 10, max) : 0; };
  return {
    key,
    tipo: v.tipo === "esferico" ? "esferico" : "vuelta",
    poster: esFotoSubida(str(v.poster, 100)) ? str(v.poster, 100) : "",
    dur: num(v.dur, 3600), w: num(v.w, 16384), h: num(v.h, 16384),
  };
}

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
    video: cleanVideo(input.video),
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

// ---------------------------------------------------------------------------
// Utilidades comunes: fecha de Canarias, canal de entrada y avisos por email
// ---------------------------------------------------------------------------
export function canarias(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Atlantic/Canary", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(d).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: +p.hour, minutos: +p.hour * 60 + +p.minute };
}
export const sumarDias = (f: string, n: number) => new Date(Date.parse(f + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);

// De dónde viene un visitante o un cliente. host = dominio propio (para no contarse a sí mismo).
export function canalDe(o: { gclid?: string; utm_source?: string; utm_medium?: string; referrer?: string }, host = ""): string {
  const src = (o.utm_source || "").toLowerCase();
  const med = (o.utm_medium || "").toLowerCase();
  let ref = (o.referrer || "").toLowerCase();
  if (host && ref.includes(host.toLowerCase())) ref = "";
  if (o.gclid || (src.includes("google") && /cpc|ppc|paid|ads/.test(med))) return "Google Ads";
  if (/portal|wallapop|coches\.net|milanuncios|autocasion|autoscout/.test(src + " " + ref)) return "Portal de coches";
  if (/facebook|instagram|fb\.|meta|tiktok|t\.co|twitter|x\.com|youtube/.test(src + " " + ref)) return "Redes sociales";
  if (src.includes("gbp") || src.includes("maps") || med.includes("organic_local") || /maps\.google|google\.[a-z.]+\/maps/.test(ref)) return "Ficha de Google";
  if (src === "qr" || med === "qr") return "Código QR";
  if (/mail|gmail|outlook/.test(src + " " + med)) return "Email";
  if (/google\.|bing\.|duckduckgo|yahoo|ecosia/.test(ref)) return "Buscadores";
  if (src) return src.slice(0, 40);
  if (ref && !/lestter|netlify\.app|volcanocars|monzacar/.test(ref)) return "Otra web";
  return "Directo";
}

const escH = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

// Aviso por email con Resend (https://resend.com). Solo se envía si existe la variable RESEND_API_KEY.
// Sin dominio propio verificado, Resend solo deja enviar a la dirección con la que se creó la cuenta.
export async function enviarAviso(asunto: string, filas: [string, string][], botones: { txt: string; url: string; color?: string }[] = [], replyTo = "") {
  const env = (globalThis as any).Netlify?.env;
  const key = env?.get("RESEND_API_KEY") || "";
  if (!key) return false;
  const to = (env?.get("AVISOS_EMAIL") || "volcanocars2026@gmail.com").split(",").map((x: string) => x.trim()).filter(Boolean);
  const from = env?.get("AVISOS_REMITENTE") || "Volcano Cars <onboarding@resend.dev>";
  const html = `<!doctype html><html><body style="margin:0;background:#F2EFEA;font-family:Arial,Helvetica,sans-serif;color:#1B1B1A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2EFEA;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:14px;overflow:hidden">
<tr><td style="background:#1B1B1A;padding:18px 22px;border-bottom:5px solid #D9481C"><span style="font-weight:900;font-size:20px;letter-spacing:2px;color:#F2EFEA">VOLCANO</span> <span style="background:#D9481C;color:#1B1B1A;font-weight:900;font-size:12px;letter-spacing:3px;padding:3px 7px">CARS</span></td></tr>
<tr><td style="padding:22px 22px 6px"><h1 style="margin:0 0 14px;font-size:21px;line-height:1.25">${escH(asunto)}</h1>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;line-height:1.45">
${filas.filter(([, v]) => v).map(([k, v]) => `<tr><td style="padding:6px 10px 6px 0;color:#67635D;white-space:nowrap;vertical-align:top;width:120px">${escH(k)}</td><td style="padding:6px 0;font-weight:bold">${escH(v).replace(/\n/g, "<br>")}</td></tr>`).join("")}
</table></td></tr>
<tr><td style="padding:14px 22px 24px">${botones.map((b) => `<a href="${escH(b.url)}" style="display:inline-block;margin:6px 8px 0 0;background:${b.color || "#D9481C"};color:#fff;text-decoration:none;font-weight:bold;padding:12px 18px;border-radius:999px;font-size:15px">${escH(b.txt)}</a>`).join("")}</td></tr>
</table><p style="color:#8C867D;font-size:12px">Aviso automático de la web de Volcano Cars.</p></td></tr></table></body></html>`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from, to, subject: asunto, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
      signal: AbortSignal.timeout(8000),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export const waNum = (t: string) => { let d = String(t || "").replace(/[^\d]/g, ""); if (d.startsWith("00")) d = d.slice(2); if (d.length === 9) d = "34" + d; return d; };
