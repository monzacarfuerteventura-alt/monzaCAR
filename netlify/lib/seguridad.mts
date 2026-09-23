import { createHash, createHmac } from "node:crypto";
import { store, enviarAviso, igualSeguro } from "./shared.mts";

/*
  MURO DE SEGURIDAD
  - Bloqueo por intentos: 5 contraseñas mal en 15 min → esa conexión queda bloqueada 15 min;
    si reincide en 24 h, 24 h. Las «trampas» (rutas que solo prueban los robots: /wp-login.php, /.env…)
    bloquean la conexión 24 h directamente.
  - Segundo factor (2FA) opcional con Google Authenticator: variable ADMIN_TOTP_SECRET.
  - Registro de seguridad (30 días) visible en el panel y avisos por email de bloqueos y accesos nuevos.
  Las IPs se guardan recortadas (83.45.x.x) y con una huella para poder agrupar; nunca completas.
*/

const env = (k: string) => (globalThis as any).Netlify?.env?.get(k) || "";
const s = () => store("seguridad");
export const huella = (ip: string) => createHash("sha256").update("vc-ip|" + ip).digest("hex").slice(0, 16);
export const ipCorta = (ip: string) => !ip ? "desconocida" : ip.includes(":") ? ip.split(":").slice(0, 3).join(":") + ":…" : ip.split(".").slice(0, 2).join(".") + ".x.x";
export function dispositivo(ua: string) {
  const so = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "Otro";
  const nav = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Navegador";
  return `${nav} en ${so}`;
}
export function pais(req: Request, context: any) {
  return String(context?.geo?.country?.name || context?.geo?.country?.code || req.headers.get("x-country") || "").slice(0, 40);
}

// ---------- registro de seguridad ----------
export type Evento = { t: string; tipo: string; ip: string; h: string; disp: string; pais: string; txt: string };
export async function registrar(tipo: string, ip: string, ua: string, paisTxt: string, txt = "") {
  const t = new Date().toISOString();
  const ev: Evento = { t, tipo, ip: ipCorta(ip), h: huella(ip), disp: dispositivo(ua), pais: paisTxt, txt: String(txt).slice(0, 200) };
  await s().setJSON(`log/${t}~${crypto.randomUUID().slice(0, 6)}`, ev).catch(() => {});
}
export async function leerRegistro(max = 80): Promise<Evento[]> {
  const { blobs } = await s().list({ prefix: "log/" });
  const claves = blobs.map((b) => b.key).sort().reverse();
  const limite = new Date(Date.now() - 30 * 864e5).toISOString();
  const viejas = claves.filter((k) => k.slice(4) < limite).slice(0, 60);
  await Promise.all(viejas.map((k) => s().delete(k).catch(() => {})));
  const recientes = claves.filter((k) => k.slice(4) >= limite).slice(0, max);
  return ((await Promise.all(recientes.map((k) => s().get(k, { type: "json" }).catch(() => null)))) as (Evento | null)[]).filter(Boolean) as Evento[];
}

// ---------- bloqueos ----------
type Bloqueo = { fallos: number[]; hasta: number; veces: number[]; ip: string; motivo: string };
async function leerBloqueo(h: string): Promise<Bloqueo> {
  return ((await s().get("bloqueo/" + h, { type: "json" }).catch(() => null)) as Bloqueo | null) || { fallos: [], hasta: 0, veces: [], ip: "", motivo: "" };
}
export async function estaBloqueado(ip: string): Promise<number> {
  const b = await leerBloqueo(huella(ip));
  return b.hasta > Date.now() ? b.hasta : 0;
}
export async function bloquear(ip: string, minutos: number, motivo: string) {
  const h = huella(ip), b = await leerBloqueo(h);
  b.hasta = Math.max(b.hasta, Date.now() + minutos * 60e3); b.ip = ipCorta(ip); b.motivo = motivo;
  b.veces = [...b.veces.filter((x) => x > Date.now() - 864e5), Date.now()];
  await s().setJSON("bloqueo/" + h, b);
  return b.hasta;
}
// Apunta un fallo de contraseña. Devuelve hasta cuándo queda bloqueado (0 si no).
export async function fallo(ip: string) {
  const h = huella(ip), b = await leerBloqueo(h);
  const ahora = Date.now();
  b.fallos = [...b.fallos.filter((x) => x > ahora - 15 * 60e3), ahora];
  b.ip = ipCorta(ip);
  if (b.fallos.length >= 5) {
    const reincide = b.veces.filter((x) => x > ahora - 864e5).length >= 1;
    b.hasta = ahora + (reincide ? 24 * 60 : 15) * 60e3;
    b.veces = [...b.veces.filter((x) => x > ahora - 864e5), ahora];
    b.fallos = [];
    b.motivo = reincide ? "Reincidente: 24 h" : "5 contraseñas incorrectas";
  }
  await s().setJSON("bloqueo/" + h, b);
  return b.hasta > ahora ? b.hasta : 0;
}
export async function limpiarFallos(ip: string) {
  const h = huella(ip), b = await leerBloqueo(h);
  if (b.fallos.length || b.hasta) { b.fallos = []; b.hasta = 0; await s().setJSON("bloqueo/" + h, b); }
}
export async function listaBloqueos() {
  const { blobs } = await s().list({ prefix: "bloqueo/" });
  const todos = await Promise.all(blobs.map(async (x) => ({ id: x.key.slice(8), ...((await s().get(x.key, { type: "json" }).catch(() => null)) as Bloqueo) })));
  return todos.filter((b) => b && b.hasta > Date.now()).map((b) => ({ id: b.id, ip: b.ip, hasta: new Date(b.hasta).toISOString(), motivo: b.motivo }));
}
export async function desbloquear(id: string) {
  if (/^[a-f0-9]{16}$/.test(id)) await s().delete("bloqueo/" + id);
}

// ---------- avisos (como mucho uno cada 30 min del mismo tipo) ----------
export async function avisar(tipo: string, asunto: string, filas: [string, string][], origin: string) {
  const k = "aviso/" + tipo;
  const ultimo = Number(await s().get(k).catch(() => 0)) || 0;
  if (Date.now() - ultimo < 30 * 60e3) return;
  await s().set(k, String(Date.now()));
  await enviarAviso(asunto, filas, [{ txt: "Abrir el panel", url: origin + "/admin" }]).catch(() => false);
}
// Dispositivos que ya han entrado al panel: si aparece uno nuevo, email de aviso.
export async function dispositivoNuevo(ua: string, paisTxt: string) {
  const id = createHash("sha256").update(dispositivo(ua) + "|" + paisTxt).digest("hex").slice(0, 16);
  const lista = ((await s().get("config/dispositivos", { type: "json" }).catch(() => null)) as string[] | null) || [];
  if (lista.includes(id)) return false;
  await s().setJSON("config/dispositivos", [...lista, id].slice(-50));
  return lista.length > 0; // el primero de todos no se avisa
}

// ---------- segundo factor (TOTP, compatible con Google Authenticator / Microsoft Authenticator) ----------
// Se activa desde el panel (Seguridad → Verificación en dos pasos) escaneando un QR.
// Si pierdes el móvil: usa uno de los 8 códigos de recuperación, o borra la verificación desde Netlify
// poniendo la variable DESACTIVAR_2FA = 1 (y quítala después).
type Totp = { secreto: string; recuperacion: string[]; desde: string };
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32(txt: string) {
  let bits = "";
  for (const c of txt.toUpperCase().replace(/[\s=-]/g, "")) { const v = B32.indexOf(c); if (v >= 0) bits += v.toString(2).padStart(5, "0"); }
  const out: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(out);
}
function secretoNuevo() {
  const b = crypto.getRandomValues(new Uint8Array(20));
  let bits = ""; for (const x of b) bits += x.toString(2).padStart(8, "0");
  let out = ""; for (let i = 0; i + 5 <= bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5), 2)];
  return out;
}
export function codigoTotp(secreto: string, paso: number) {
  const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(paso));
  const h = createHmac("sha1", base32(secreto)).update(b).digest();
  const o = h[h.length - 1] & 15;
  const n = (((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6;
  return String(n).padStart(6, "0");
}
const hashRec = (c: string) => createHash("sha256").update("vc-rec|" + c.toUpperCase().replace(/[^A-Z0-9]/g, "")).digest("hex");
async function totpActual(): Promise<Totp | null> {
  if (env("DESACTIVAR_2FA") === "1") return null;
  if (env("ADMIN_TOTP_SECRET")) return { secreto: env("ADMIN_TOTP_SECRET"), recuperacion: [], desde: "" };
  return ((await s().get("config/totp", { type: "json" }).catch(() => null)) as Totp | null);
}
export async function dosFactoresActivo() { return !!(await totpActual()); }
function comprobar(secreto: string, c: string, ultimo: number) {
  const paso = Math.floor(Date.now() / 30000);
  for (const d of [-1, 0, 1]) { const p = paso + d; if (p > ultimo && igualSeguro(codigoTotp(secreto, p), c)) return p; }
  return 0;
}
// Devuelve "ok", "recuperacion" (se ha gastado un código de recuperación) o "" si no vale.
export async function verificarTotp(codigo: string): Promise<"" | "ok" | "recuperacion"> {
  const t = await totpActual();
  if (!t) return "ok";
  const txt = String(codigo || "").trim();
  const c = txt.replace(/\D/g, "");
  if (c.length === 6 && /^[\d\s]+$/.test(txt)) {
    const ultimo = Number(await s().get("config/totp-ultimo").catch(() => 0)) || 0;
    const p = comprobar(t.secreto, c, ultimo);
    if (p) { await s().set("config/totp-ultimo", String(p)); return "ok"; }
    return "";
  }
  const h = hashRec(txt);
  if (t.recuperacion.includes(h)) {
    t.recuperacion = t.recuperacion.filter((x) => x !== h);
    await s().setJSON("config/totp", t);
    return "recuperacion";
  }
  return "";
}
export async function iniciar2FA() {
  const secreto = secretoNuevo();
  await s().setJSON("config/totp-pendiente", { secreto, t: Date.now() });
  const uri = `otpauth://totp/${encodeURIComponent("Volcano Cars:Panel")}?secret=${secreto}&issuer=${encodeURIComponent("Volcano Cars")}&digits=6&period=30`;
  return { secreto: secreto.replace(/(.{4})/g, "$1 ").trim(), uri };
}
export async function confirmar2FA(codigo: string) {
  const pend = (await s().get("config/totp-pendiente", { type: "json" }).catch(() => null)) as { secreto: string; t: number } | null;
  if (!pend || Date.now() - pend.t > 20 * 60e3) return { error: "Ha caducado. Vuelve a empezar." };
  if (!comprobar(pend.secreto, String(codigo || "").replace(/\D/g, ""), 0)) return { error: "El código no coincide. Comprueba que la hora del móvil es automática y prueba con el siguiente." };
  const codigos = Array.from({ length: 8 }, () => { const r = secretoNuevo().slice(0, 8); return r.slice(0, 4) + "-" + r.slice(4); });
  await s().setJSON("config/totp", { secreto: pend.secreto, recuperacion: codigos.map(hashRec), desde: new Date().toISOString() });
  await s().delete("config/totp-pendiente");
  return { ok: true, codigos };
}
export async function desactivar2FA(codigo: string) {
  if (env("ADMIN_TOTP_SECRET")) return { error: "La verificación está fijada en Netlify (ADMIN_TOTP_SECRET). Quítala allí." };
  if (!(await verificarTotp(codigo))) return { error: "Código incorrecto." };
  await s().delete("config/totp");
  return { ok: true };
}
