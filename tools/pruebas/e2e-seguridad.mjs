// Prueba de seguridad: bloqueo del PIN por usuario y manuales privados.  Uso: bun tools/pruebas/e2e-seguridad.mjs
import { readdirSync } from "node:fs"; import { join, dirname } from "node:path"; import { fileURLToPath } from "node:url";
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENV = { ADMIN_PASSWORD: "clave-de-pruebas-larga-2026", SESSION_SECRET: "secreto-de-pruebas" };
globalThis.Netlify = { env: { get: (k) => ENV[k] || "" }, context: { deploy: { context: "production" } } };
const ORIGEN = "https://volcanocars.com", rutas = [];
for (const f of readdirSync(join(RAIZ, "netlify/functions")).filter((x) => x.endsWith(".mts"))) { const m = await import(join(RAIZ, "netlify/functions", f)); for (const p of m.config?.path ? [].concat(m.config.path) : []) rutas.push({ re: new RegExp("^" + p.replace(/\*/g, ".*").replace(/:[a-zA-Z]+/g, "[^/]+") + "$"), fn: m.default, n: p.split("/").length }); }
rutas.sort((a, b) => b.n - a.n);
let n = 0; async function llamar(method, path, token, body) { const url = new URL(path, ORIGEN), r = rutas.find((x) => x.re.test(url.pathname)); const h = { "content-type": "application/json", origin: ORIGEN, "user-agent": "prueba" }; if (token) h.authorization = "Bearer " + token;
  const res = await r.fn(new Request(url, { method, headers: h, body: body === undefined || method === "GET" ? undefined : JSON.stringify(body) }), { ip: "10.1." + Math.floor(++n / 250) + "." + (n % 250), geo: { country: { code: "ES" } }, params: {} });
  const ct = res.headers.get("content-type") || ""; return { status: res.status, ct, data: ct.includes("json") ? await res.json() : await res.arrayBuffer() }; }
let ok = 0, mal = 0; const esperar = (t, c, d = "") => { if (c) { ok++; console.log("  ✔ " + t); } else { mal++; console.log("  ✘ " + t + " " + d); } };
const { store } = await import(join(RAIZ, "netlify/lib/shared.mts")); await store("seguridad").set("config/2fa-equipo", "0");
const G = (await llamar("POST", "/api/login", "", { clave: ENV.ADMIN_PASSWORD })).data.token;
await llamar("POST", "/api/taller/equipo", G, { nombre: "Pedro", usuario: "pedro", pin: "445566", rol: "mecanico" });
console.log("\n1) PIN: bloqueo por usuario (aunque el atacante cambie de conexión)");
for (let i = 0; i < 4; i++) { const r = await llamar("POST", "/api/login", "", { usuario: "pedro", pin: "00000" + i }); esperar(`fallo ${i + 1}: 401`, r.status === 401, String(r.status)); }
let r = await llamar("POST", "/api/login", "", { usuario: "pedro", pin: "000009" }); esperar("5º fallo: el usuario queda bloqueado (429)", r.status === 429 && r.data.bloqueado, JSON.stringify(r.data));
r = await llamar("POST", "/api/login", "", { usuario: "pedro", pin: "445566" }); esperar("con el PIN correcto también está bloqueado desde otra conexión", r.status === 429, String(r.status));
r = await llamar("POST", "/api/login", "", { usuario: "otro", pin: "1234" }); esperar("otro usuario no se ve afectado (401)", r.status === 401);
await store("seguridad").delete("bloqueo/" + (await import(join(RAIZ, "netlify/lib/seguridad.mts"))).huella("usuario:pedro"));
r = await llamar("POST", "/api/login", "", { usuario: "pedro", pin: "445566" }); esperar("pasado el bloqueo, entra con su PIN", r.status === 200 && r.data.token, String(r.status));
console.log("\n2) Manuales privados");
const T = r.data.token; await llamar("POST", "/api/jornada/fichar", T, { accion: "entrada" });
r = await llamar("GET", "/api/manual/VolcanoCars-S01-Taller-recepcion-a-entrega", ""); esperar("sin sesión: 401", r.status === 401);
r = await llamar("GET", "/api/manual/VolcanoCars-S01-Taller-recepcion-a-entrega", T); esperar("con sesión del equipo: PDF", r.status === 200 && r.ct.includes("pdf") && new TextDecoder().decode(r.data.slice(0, 4)) === "%PDF", String(r.status));
r = await llamar("GET", "/api/manual/VolcanoCars-S00-Indice-MO-00-v3.0", G); esperar("con la contraseña del gerente: PDF (índice)", r.status === 200 && r.ct.includes("pdf"));
r = await llamar("GET", "/api/manual/..%2F..%2Fpackage.json", T); esperar("intento de salir de la carpeta: 404", r.status === 404);
r = await llamar("GET", "/api/manual/VolcanoCars-S99-Inventado", T); esperar("manual inexistente: 404", r.status === 404);
const { existsSync } = await import("node:fs"); esperar("ya no hay PDF en la carpeta pública", !existsSync(join(RAIZ, "public/sistemas")));
console.log(`\n${ok} bien, ${mal} mal`); if (mal) process.exit(1);
