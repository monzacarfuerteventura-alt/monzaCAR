// Servidor LOCAL: sirve public/ y ejecuta las funciones REALES de la web (con el almacén en memoria). Solo para sacar capturas.
(globalThis as any).Netlify = { env: { get: (k: string) => ({ ADMIN_PASSWORD: "demo", SESSION_SECRET: "x" } as any)[k] || "" }, context: { deploy: { context: "production" } } };
import http from "node:http"; import { readdirSync, readFileSync, existsSync, statSync } from "node:fs"; import { extname, join } from "node:path";
const PUB = process.env.PUB!, FN = new URL("./netlify/functions/", import.meta.url).pathname, PORT = Number(process.env.PORT || 8098);
const rutas: { re: RegExp; fn: any; n: string }[] = [];
for (const f of readdirSync(FN).filter((x) => x.endsWith(".mts"))) {
  try { const m = await import(FN + f); const p = m.config?.path; if (!p) continue; for (const pt of ([] as any[]).concat(p)) rutas.push({ re: new RegExp("^" + String(pt).replace(/:[a-z]+/gi, "[^/]+").replace(/\*/g, ".*") + "/?$"), fn: m.default, n: f }); } catch (e: any) { console.log("no carga", f, e.message.slice(0, 80)); }
}
console.log("funciones con ruta:", rutas.length);
const T: any = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".ico": "image/x-icon", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".svg": "image/svg+xml", ".json": "application/json", ".webmanifest": "application/manifest+json", ".mp4": "video/mp4", ".woff2": "font/woff2" };
http.createServer(async (req, res) => {
  const u = new URL(req.url!, "http://localhost:" + PORT); const p = u.pathname; const ch: Buffer[] = []; for await (const c of req) ch.push(c as Buffer);
  const r = rutas.find((x) => x.re.test(p));
  if (r) { try { const h: any = {}; for (const [k, v] of Object.entries(req.headers)) h[k] = String(v); h.origin = "http://localhost:" + PORT; h.host = "localhost:" + PORT; const resp: Response = await r.fn(new Request("http://localhost:" + PORT + p + u.search, { method: req.method, headers: h, body: ["GET", "HEAD"].includes(req.method!) ? undefined : Buffer.concat(ch) }), { ip: "1.2.3.4", geo: {}, waitUntil() { } }); const hs: any = {}; resp.headers.forEach((v, k) => (hs[k] = v)); res.writeHead(resp.status, hs); return res.end(Buffer.from(await resp.arrayBuffer())); } catch (e: any) { res.writeHead(500, { "content-type": "application/json" }); return res.end(JSON.stringify({ error: "fallo " + r.n + ": " + e.message })); } }
  let f = join(PUB, p === "/" ? "index.html" : p); if (existsSync(f) && statSync(f).isDirectory()) f = join(f, "index.html");
  if (existsSync(f)) { res.writeHead(200, { "content-type": T[extname(f)] || "application/octet-stream" }); return res.end(readFileSync(f)); }
  res.writeHead(404); res.end("no");
}).listen(PORT, () => console.log("LISTO http://localhost:" + PORT));
