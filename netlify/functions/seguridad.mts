import type { Config, Context } from "@netlify/functions";
import { json, isAdmin, cerrarTodasLasSesiones, crearSesion, minIat, mismoOrigen } from "../lib/shared.mts";
import { leerRegistro, listaBloqueos, desbloquear, registrar, dosFactoresActivo, iniciar2FA, confirmar2FA, desactivar2FA, verificarTotp, pais } from "../lib/seguridad.mts";

// Centro de seguridad del panel (solo con sesión): estado del muro, registro, bloqueos y 2FA.
export default async (req: Request, context: Context) => {
  if (!(await isAdmin(req))) return json({ error: "No autorizado" }, 401);
  const env = (k: string) => (globalThis as any).Netlify?.env?.get(k) || "";
  const ip = context.ip || "", ua = req.headers.get("user-agent") || "", p = pais(req, context);

  if (req.method === "GET") {
    const [registro, bloqueos, dosPasos, desde] = await Promise.all([leerRegistro(), listaBloqueos(), dosFactoresActivo(), minIat(true)]);
    return json({
      registro, bloqueos,
      estado: {
        dosPasos,
        claveLarga: env("ADMIN_PASSWORD").length >= 14,
        secretoSesion: !!env("SESSION_SECRET"),
        avisosEmail: !!env("RESEND_API_KEY"),
        sesionesDesde: desde ? new Date(desde).toISOString() : "",
      },
    });
  }
  if (req.method !== "POST" || !mismoOrigen(req)) return json({ error: "Método no permitido" }, 405);
  const b = (await req.json().catch(() => ({}))) as any;

  if (b.accion === "cerrar-sesiones") {
    await cerrarTodasLasSesiones();
    await registrar("sesiones-cerradas", ip, ua, p, "Cerradas todas las sesiones");
    const s = crearSesion();
    return json({ ok: true, token: s.token, exp: s.exp });
  }
  if (b.accion === "desbloquear") { await desbloquear(String(b.id || "")); await registrar("desbloqueo", ip, ua, p, "Conexión desbloqueada a mano"); return json({ ok: true }); }
  if (b.accion === "2fa-iniciar") {
    if ((await dosFactoresActivo()) && !(await verificarTotp(String(b.codigo || "")))) return json({ error: "Para cambiarla, escribe primero el código actual de tu app." }, 400);
    return json(await iniciar2FA());
  }
  if (b.accion === "2fa-confirmar") {
    const r = await confirmar2FA(String(b.codigo || ""));
    if (r.ok) await registrar("2fa-activada", ip, ua, p, "Verificación en dos pasos activada");
    return json(r, r.ok ? 200 : 400);
  }
  if (b.accion === "2fa-desactivar") {
    const r = await desactivar2FA(String(b.codigo || ""));
    if (r.ok) await registrar("2fa-desactivada", ip, ua, p, "Verificación en dos pasos desactivada");
    return json(r, r.ok ? 200 : 400);
  }
  return json({ error: "Acción no válida" }, 400);
};

export const config: Config = { path: "/api/seguridad", rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] } };
