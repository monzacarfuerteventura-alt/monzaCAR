// Grabación contra el servidor local de pruebas (bun tools/ayuda/grabar/servidor-grabacion.mjs). Datos inventados.
import { createRequire } from "module"; const require = createRequire(import.meta.url);
export const { chromium } = require(require("child_process").execSync("npm root -g").toString().trim() + "/playwright");
export const BASE = process.env.BASE || "http://localhost:8888";
export const CLAVE = process.env.CLAVE || "clave-de-pruebas-larga-2026";
export async function montar(ctx) { await ctx.route((u) => !/^(localhost|127\.0\.0\.1)$/.test(u.hostname), (r) => r.fulfill({ status: 204, body: "" })); }
export async function loginGerente(p) {
  await p.goto(BASE + "/admin.html"); await p.waitForTimeout(600);
  if ((await p.textContent("#login-modo")).includes("gerente")) await p.click("#login-modo");
  await p.fill("#pw", CLAVE); await p.click("#login-btn"); await p.waitForTimeout(1500);
}
export async function loginEquipo(p, usuario, pin) {
  await p.goto(BASE + "/admin.html"); await p.waitForTimeout(600);
  if (await p.isVisible("#login-modo")) { const t = await p.textContent("#login-modo"); if (t.includes("equipo")) await p.click("#login-modo"); }
  await p.waitForTimeout(300); await p.fill("#eq-u", usuario); await p.fill("#eq-p", pin); await p.click("#login-btn"); await p.waitForTimeout(1500);
}
