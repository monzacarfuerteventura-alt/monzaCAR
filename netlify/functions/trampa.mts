import type { Config, Context } from "@netlify/functions";
import { bloquear, registrar, pais } from "../lib/seguridad.mts";

// TRAMPAS: rutas que ninguna persona visita, solo los robots que buscan fallos (WordPress, .env,
// phpMyAdmin…). Quien las pide queda bloqueado 24 h para intentar entrar al panel.
export default async (req: Request, context: Context) => {
  const ip = context.ip || "";
  const ruta = new URL(req.url).pathname.slice(0, 80);
  await bloquear(ip, 24 * 60, "Robot buscando fallos (" + ruta + ")");
  await registrar("trampa", ip, req.headers.get("user-agent") || "", pais(req, context), ruta);
  return new Response("<!doctype html><title>404</title><h1>404</h1>", { status: 404, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
};

export const config: Config = {
  path: [
    "/wp-login.php", "/wp-admin", "/wp-admin/*", "/xmlrpc.php", "/wp-content/*", "/wp-includes/*", "/wp-json/*",
    "/.env", "/.env.*", "/.git/*", "/config.php", "/phpmyadmin", "/phpmyadmin/*", "/pma/*", "/administrator/*",
    "/admin.php", "/login.php", "/server-status", "/.aws/*", "/cgi-bin/*", "/vendor/phpunit/*", "/owa/*", "/boaform/*",
  ],
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
