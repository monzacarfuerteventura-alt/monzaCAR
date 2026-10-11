import chromium from "@sparticuz/chromium"; import puppeteer from "puppeteer-core"; import { createHmac } from "node:crypto";
const B = "http://localhost:8097", O = { origin: B, "content-type": "application/json" };
const USR = "marta" + String(Date.now() % 100000); const adm = (await (await fetch(B + "/api/login", { method: "POST", headers: O, body: JSON.stringify({ clave: "demo" }) })).json()).token, HA = { ...O, authorization: "Bearer " + adm };
const post = async (p, b, h) => { const r = await fetch(B + p, { method: "POST", headers: h, body: JSON.stringify(b) }); return [r.status, await r.json().catch(() => ({}))]; };
let [s1, j1] = await post("/api/taller/equipo", { nombre: "Marta", usuario: USR, rol: "recepcion", pin: "482915", jornada: 8 }, HA); console.log("alta de Marta:", s1, JSON.stringify(j1).slice(0, 90));
const b32 = (s) => { const A = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"; let bits = ""; for (const c of s.replace(/[\s=]/g, "").toUpperCase()) bits += A.indexOf(c).toString(2).padStart(5, "0"); const by = []; for (let i = 0; i + 8 <= bits.length; i += 8) by.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(by); };
const totp = (sec) => { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000))); const h = createHmac("sha1", b32(sec)).update(c).digest(), o = h[h.length - 1] & 15, n = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]; return String(n % 1e6).padStart(6, "0"); };
let [s2, j2] = await post("/api/login", { usuario: USR, pin: "482915" }, O);
if (j2.configurar2fa) { [s2, j2] = await post("/api/login", { usuario: USR, pin: "482915", codigo: totp(j2.configurar2fa.secreto) }, O); }
console.log("login de Marta:", s2, j2.token ? "token" : JSON.stringify(j2).slice(0, 160)); const tok = j2.token;
let [s3, j3] = await post("/api/jornada/fichar", { accion: "entrada" }, { ...O, authorization: "Bearer " + tok }); console.log("fichar:", s3, JSON.stringify(j3).slice(0, 100));
let fallos = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fallos++; console.log("  ✗ " + m); } };
const b = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: "shell" }); const p = await b.newPage(); await p.setViewport({ width: 1280, height: 900 });
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("dialog", (d) => d.accept("ok"));
await p.evaluateOnNewDocument((t) => { try { sessionStorage.setItem("vc_tok", t); sessionStorage.setItem("mz_tok", t); } catch (_) { } }, tok);
await p.goto(B + "/admin.html", { waitUntil: "networkidle2" }); await new Promise((r) => setTimeout(r, 6000));
const info = await p.evaluate(() => ({ ME: typeof ME !== "undefined" ? ME : null, tabs: [...document.querySelectorAll("#tabs [data-tab]")].filter((b) => !b.hidden && b.offsetParent !== null || getComputedStyle(b).display !== "none" && !b.hidden).map((b) => b.dataset.tab), tokKey: typeof TOK_KEY !== "undefined" ? TOK_KEY : "" }));
console.log("ME:", JSON.stringify(info.ME).slice(0, 120), "| pestañas visibles:", info.tabs.join(","));
const vis = (t) => p.evaluate((t) => { const b = document.querySelector(`#tabs [data-tab="${t}"]`); return !!b && !b.hidden && getComputedStyle(b).display !== "none"; }, t);
if (info.ME && info.ME.equipo) {
  for (const t of ["compras", "cli", "mcar"]) ok(await vis(t), "Recepción ve «" + t + "» (abierto por el gerente)");
  for (const t of ["banco", "gest", "conta", "inc", "perm"]) ok(!(await vis(t)), "Recepción NO ve «" + t + "»");
  await p.evaluate(() => document.querySelector('#tabs [data-tab="compras"]').click()); await new Promise((r) => setTimeout(r, 3500));
  const t = await p.evaluate(() => document.getElementById("s-compras").innerText); ok(/Pedidos/.test(t) && !/Pagar y apuntar/.test(t), "Compras abre para Recepción"); ok(!/Cuenta de pérdidas/.test(t), "sin datos de contabilidad");
  await p.screenshot({ path: "capturas/staff-compras.png" });
  await p.evaluate(() => document.querySelector('#tabs [data-tab="cli"]').click()); await new Promise((r) => setTimeout(r, 3500)); const c = await p.evaluate(() => document.getElementById("s-cli").innerText); ok(/Clientes 360/.test(c) && !/Gastado/.test(c), "Clientes 360 sin importes para Recepción"); await p.screenshot({ path: "capturas/staff-clientes.png" });
  // abrir a la fuerza una pestaña de gerente: no debe salir
  await p.evaluate(() => abrirTab("conta")); await new Promise((r) => setTimeout(r, 1500)); ok(await p.evaluate(() => document.getElementById("s-conta").hidden), "abrir Contabilidad a la fuerza no la muestra a Recepción");
} else console.log("no se pudo entrar como equipo en la prueba (sin ME.equipo)");
await b.close(); console.log(`RECEPCIÓN: ${n} comprobaciones · ${fallos} fallos · errores de página: ${errs.length}`, errs.join(" | ").slice(0, 300));
