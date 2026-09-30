// Servidor de pruebas: sirve public/ y ejecuta las funciones reales de netlify/functions con un almacén en memoria.
// Uso: bun tools/pruebas/servidor-local.mjs   → http://localhost:8888/admin
import { readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PUB = join(RAIZ, "public");
const ENV = { ADMIN_PASSWORD: process.env.CLAVE || "clave-de-pruebas-larga-2026", SESSION_SECRET: "secreto-de-pruebas",
  // opcional: voz de la Ayuda contra un ElevenLabs de mentira (tools/pruebas/e2e-voz-panel.py)
  ...(process.env.ELEVENLABS_API_BASE ? { ELEVENLABS_API_KEY: "xi-prueba", ELEVENLABS_API_BASE: process.env.ELEVENLABS_API_BASE } : {}) };
globalThis.Netlify = { env: { get: (k) => ENV[k] || "" }, context: { deploy: { context: "production" } } };
const PUERTO = Number(process.env.PUERTO || 8888);

const rutas = [];
for (const f of readdirSync(join(RAIZ, "netlify/functions")).filter((x) => x.endsWith(".mts"))) {
  const m = await import(join(RAIZ, "netlify/functions", f));
  for (const p of m.config?.path ? [].concat(m.config.path) : []) rutas.push({ re: new RegExp("^" + p.replace(/\*/g, ".*").replace(/:[a-zA-Z]+/g, "[^/]+") + "$"), fn: m.default, n: p.split("/").length });
}
rutas.sort((a, b) => b.n - a.n);
const { store } = await import(join(RAIZ, "netlify/lib/shared.mts"));
await store("seguridad").set("config/2fa-equipo", "0");

const TIPOS = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".mp4": "video/mp4", ".ico": "image/x-icon", ".webmanifest": "application/manifest+json", ".xml": "application/xml", ".txt": "text/plain" };
const REESCRIBE = { "/admin": "/admin.html", "/comprar": "/comprar/index.html", "/taller": "/taller/index.html", "/contacto": "/contacto/index.html" };

Bun.serve({
  port: PUERTO,
  async fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      const r = rutas.find((x) => x.re.test(url.pathname));
      if (!r) return new Response(JSON.stringify({ error: "sin función" }), { status: 404 });
      try { return await r.fn(req, { ip: server.requestIP(req)?.address || "127.0.0.1", geo: { country: { code: "ES" } }, params: {} }); }
      catch (e) { console.error(url.pathname, e); return new Response(JSON.stringify({ error: String(e) }), { status: 500 }); }
    }
    let p = REESCRIBE[url.pathname] || url.pathname;
    let f = join(PUB, decodeURIComponent(p));
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
    if (!existsSync(f)) return new Response("No encontrado", { status: 404 });
    return new Response(Bun.file(f), { headers: { "content-type": TIPOS[extname(f)] || "application/octet-stream" } });
  },
});
console.log("Servidor de pruebas en http://localhost:" + PUERTO);
