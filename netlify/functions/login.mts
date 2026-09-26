import type { Config, Context } from "@netlify/functions";
import { json, isAdmin, crearSesion, leerSesion, igualSeguro, mismoOrigen } from "../lib/shared.mts";
import { estaBloqueado, fallo, limpiarFallos, registrar, avisar, dispositivoNuevo, dosFactoresActivo, verificarTotp, dispositivo, ipCorta, pais, nombreEnApp,
  exige2FAEquipo, totpEquipo, iniciar2FAEquipo, confirmar2FAEquipo, verificarTotpEquipo, dispositivoDeConfianza, confiarDispositivo, horaInusual } from "../lib/seguridad.mts";
import { resumenYo } from "../lib/jornada.mts";
import { leerEquipo, pinOk, crearSesionEquipo, quien } from "../lib/taller.mts";

/*
  ENTRADA AL PANEL
  POST /api/login {clave, codigo?} → sesión firmada de 12 h (la contraseña no se guarda en el navegador)
  GET  /api/login (con la sesión)   → comprueba que la sesión sigue viva
  Defensas: bloqueo tras 5 fallos (15 min, 24 h si reincide), espera fija en cada fallo,
  verificación en dos pasos opcional, límite de peticiones por IP en Netlify y aviso por email
  de bloqueos y de accesos desde dispositivos nuevos.
*/
const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Respuesta JSON con la cookie de «dispositivo de confianza» (si la hay)
const conCookie = (res: Response, cookie: string) => { if (cookie) res.headers.append("set-cookie", cookie); return res; };
const hora = (t: number) => new Date(t).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone: "Atlantic/Canary" });

export default async (req: Request, context: Context) => {
  const ip = context.ip || "", ua = req.headers.get("user-agent") || "", origin = new URL(req.url).origin, p = pais(req, context);

  if (req.method === "GET") {
    const t = leerSesion((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, ""));
    if (t && (await isAdmin(req))) return json({ ok: true, exp: t.exp, rol: "gerente", nombre: "Gerente", uid: "gerente" });
    const q = await quien(req);
    if (q) { const pers = (await leerEquipo()).find((x) => x.id === q.uid); return json({ ok: true, rol: q.rol, nombre: q.nombre, uid: q.uid, caja: q.caja, equipo: true, jornada: pers ? await resumenYo(pers) : null }); }
    return json({ error: "Sesión caducada" }, 401);
  }
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
  const clave = String(((globalThis as any).Netlify?.env?.get("ADMIN_PASSWORD")) || "");
  if (!clave) return json({ error: "El panel no tiene contraseña configurada en Netlify (ADMIN_PASSWORD)." }, 503);

  const bloqueo = await estaBloqueado(ip);
  if (bloqueo) {
    await espera(800);
    return json({ error: `Demasiados intentos desde esta conexión. Vuelve a probar a las ${hora(bloqueo)}.`, bloqueado: true }, 429);
  }
  const body = (await req.json().catch(() => ({}))) as any;
  const dada = String(body.clave ?? "").slice(0, 200);

  // Entrada del equipo del taller: usuario + PIN (mismas defensas: espera, bloqueo y registro)
  if (body.usuario !== undefined) {
    const usuario = String(body.usuario || "").toLowerCase().trim().slice(0, 20), pin = String(body.pin || "").slice(0, 8);
    const pers = (await leerEquipo()).find((x) => x.usuario === usuario && x.activo);
    if (!pers || !pinOk(pin, pers.pin)) {
      await espera(900);
      const hasta = await fallo(ip);
      await registrar("login-fallo", ip, ua, p, "PIN incorrecto" + (usuario ? " (" + usuario + ")" : ""));
      if (hasta) { await registrar("bloqueo", ip, ua, p, "Bloqueada hasta las " + hora(hasta)); return json({ error: `Usuario o PIN incorrecto. Esta conexión queda bloqueada hasta las ${hora(hasta)}.`, bloqueado: true }, 429); }
      return json({ error: "Usuario o PIN incorrecto." }, 401);
    }
    // Verificación en dos pasos del equipo: solo la primera vez en cada dispositivo (luego, 30 días de confianza)
    let recuperacion: string[] | undefined, usado2fa = false;
    if ((await exige2FAEquipo()) && !(await dispositivoDeConfianza(req, pers.id))) {
      const host = new URL(req.url).host;
      if (!(await totpEquipo(pers.id))) {
        if (!body.codigo) return json({ configurar2fa: await iniciar2FAEquipo(pers.id, host, pers.nombre), error: "Primera vez en este sistema: vincula tu móvil con Google Authenticator." }, 401);
        const c = await confirmar2FAEquipo(pers.id, String(body.codigo));
        if (c.error) return json({ configurar2fa: await iniciar2FAEquipo(pers.id, host, pers.nombre), error: c.error }, 401);
        recuperacion = c.codigos; usado2fa = true;
        await registrar("2fa-activada", ip, ua, p, "Verificación en dos pasos activada: " + pers.nombre);
      } else {
        if (!body.codigo) return json({ necesita2fa: true, error: "Escribe el código de 6 cifras de Google Authenticator (solo en dispositivos nuevos)." }, 401);
        const v = await verificarTotpEquipo(pers.id, String(body.codigo));
        if (!v) {
          await espera(900);
          const hasta = await fallo(ip);
          await registrar("2fa-fallo", ip, ua, p, "Código de verificación incorrecto (" + pers.nombre + ")");
          return json({ necesita2fa: true, error: hasta ? `Código incorrecto. Conexión bloqueada hasta las ${hora(hasta)}.` : "Código incorrecto. Comprueba que la hora del móvil está en automático." }, hasta ? 429 : 401);
        }
        if (v === "recuperacion") await registrar("recuperacion", ip, ua, p, "Entrada con código de recuperación: " + pers.nombre);
        usado2fa = true;
      }
    }
    await limpiarFallos(ip);
    const s = crearSesionEquipo(pers.id, 12);
    await registrar("login-ok", ip, ua, p, "Entrada del equipo: " + pers.nombre);
    if (horaInusual()) { await registrar("inusual", ip, ua, p, "Entrada a una hora poco habitual: " + pers.nombre); await avisar("inusual-" + pers.id, `Seguridad: ${pers.nombre} ha entrado al panel a una hora poco habitual`, [["Quién", pers.nombre], ["Dispositivo", dispositivo(ua)], ["Conexión", ipCorta(ip)], ["País", p]], origin); }
    const cookie = body.confiar && (usado2fa || !(await exige2FAEquipo())) ? await confiarDispositivo(req, pers.id, pers.nombre, ip) : "";
    return conCookie(json({ ok: true, token: s.token, exp: s.exp, rol: pers.rol, nombre: pers.nombre, uid: pers.id, caja: pers.rol === "gerente" || !!pers.caja, equipo: true, recuperacion, jornada: await resumenYo(pers) }), cookie);
  }

  if (!dada || !igualSeguro(dada, clave)) {
    await espera(900);
    const hasta = await fallo(ip);
    await registrar("login-fallo", ip, ua, p, "Contraseña incorrecta");
    if (hasta) {
      await registrar("bloqueo", ip, ua, p, "Bloqueada hasta las " + hora(hasta));
      await avisar("bloqueo", "Seguridad: bloqueada una conexión que probaba contraseñas", [["Conexión", ipCorta(ip)], ["Dispositivo", dispositivo(ua)], ["País", p], ["Bloqueada hasta", hora(hasta)]], origin);
      return json({ error: `Contraseña incorrecta. Por seguridad, esta conexión queda bloqueada hasta las ${hora(hasta)}.`, bloqueado: true }, 429);
    }
    return json({ error: "Contraseña incorrecta." }, 401);
  }

  let usado2fa = false;
  if ((await dosFactoresActivo()) && !(await dispositivoDeConfianza(req, "gerente"))) {
    usado2fa = true;
    const entrada = `«Volcano Cars · ${nombreEnApp(new URL(req.url).host)}»`;
    if (!body.codigo) return json({ necesita2fa: true, error: `Escribe el código de 6 dígitos de ${entrada} en tu app de verificación.` }, 401);
    const r = await verificarTotp(String(body.codigo));
    if (!r) {
      await espera(900);
      const hasta = await fallo(ip);
      await registrar("2fa-fallo", ip, ua, p, "Código de verificación incorrecto");
      if (hasta) {
        await registrar("bloqueo", ip, ua, p, "Bloqueada hasta las " + hora(hasta));
        await avisar("bloqueo2fa", "Seguridad: alguien con tu contraseña ha fallado el código de verificación", [["Conexión", ipCorta(ip)], ["Dispositivo", dispositivo(ua)], ["País", p], ["Qué hacer", "Si no has sido tú, cambia ya ADMIN_PASSWORD en Netlify."]], origin);
      }
      return json({ necesita2fa: true, error: hasta ? `Código incorrecto. Conexión bloqueada hasta las ${hora(hasta)}.` : `Código incorrecto. Usa el de ${entrada} (no el de otra web) y comprueba que la hora del móvil está en automático.` }, hasta ? 429 : 401);
    }
    if (r === "recuperacion") await registrar("recuperacion", ip, ua, p, "Entrada con un código de recuperación");
  }

  await limpiarFallos(ip);
  const s = crearSesion();
  await registrar("login-ok", ip, ua, p, "Entrada al panel");
  if (await dispositivoNuevo(ua, p)) {
    await avisar("nuevo-" + dispositivo(ua), `Seguridad: nuevo acceso al panel (${dispositivo(ua)})`, [["Dispositivo", dispositivo(ua)], ["País", p], ["Conexión", ipCorta(ip)], ["Si no has sido tú", "Entra al panel → Seguridad → «Cerrar sesión en todos los dispositivos» y cambia ADMIN_PASSWORD en Netlify."]], origin);
  }
  if (horaInusual()) await registrar("inusual", ip, ua, p, "Entrada del gerente a una hora poco habitual");
  const cookie = body.confiar && usado2fa ? await confiarDispositivo(req, "gerente", "Gerente", ip) : "";
  return conCookie(json({ ok: true, token: s.token, exp: s.exp }), cookie);
};

export const config: Config = {
  path: "/api/login",
  rateLimit: { windowLimit: 10, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
