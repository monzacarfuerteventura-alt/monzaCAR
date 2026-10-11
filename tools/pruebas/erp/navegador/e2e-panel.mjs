import chromium from "@sparticuz/chromium"; import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ args: [...chromium.args, "--font-render-hinting=none"], executablePath: await chromium.executablePath(), headless: "shell" });
const esp = (ms) => new Promise((r) => setTimeout(r, ms)); const errores = [], fallos = []; let n = 0;
const ok = (c, m) => { n++; if (!c) { fallos.push(m); console.log("  ✗ " + m); } };
async function sesion(w, h, movil) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: h, deviceScaleFactor: movil ? 2 : 1, isMobile: !!movil, hasTouch: !!movil });
  p.on("error", (e) => errores.push("CRASH: " + e.message)); p.on("pageerror", (e) => errores.push("pageerror: " + e.message.slice(0, 200))); p.on("console", (m) => { if (m.type() === "error" && !/ERR_NAME_NOT_RESOLVED/.test(m.text())) errores.push("consola: " + m.text().slice(0, 200)); });
  p.on("dialog", (d) => d.accept("Motivo de prueba para la anulación"));
  await p.goto("http://localhost:8097/admin.html", { waitUntil: "networkidle2", timeout: 60000 }); await p.waitForSelector("#pw"); await p.type("#pw", "demo"); await p.click("#login-btn"); await p.waitForSelector("#tabsrow:not([hidden])", { timeout: 20000 }); await esp(3500); return p;
}
const texto = (p, sel) => p.evaluate((s) => (document.querySelector(s) || {}).innerText || "", sel);
async function ir(p, t, esperado) { await p.evaluate((t) => document.querySelector(`#tabs [data-tab="${t}"]`).click(), t); await p.waitForFunction((t, x) => { const s = document.getElementById("s-" + t); return s && !s.hidden && s.innerText.includes(x); }, { timeout: 15000 }, t, esperado); await esp(700); }
const foto = (p, n) => p.screenshot({ path: `capturas/${n}.png` });
const clic = (p, sel) => p.evaluate((s) => document.querySelector(s).click(), sel);
const set = (p, sel, v) => p.evaluate((s, v) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); e.dispatchEvent(new Event("change", { bubbles: true })); }, sel, v);

const d = await sesion(1280, 900, false);
// ¿están las pestañas del ERP visibles para el gerente en el menú lateral?
const menu = await d.evaluate(() => [...document.querySelectorAll("#vc-side .vs-it[data-vs]:not([hidden])")].map((x) => x.dataset.vs));
for (const t of ["compras", "banco", "gest", "conta", "inc", "mcar", "cli", "perm"]) ok(menu.includes(t), "el menú lateral muestra «" + t + "» al gerente");
for (const [t, x] of [["compras", "Pedidos"], ["banco", "Banco"], ["gest", "Gestoría"], ["conta", "Diario"], ["inc", "Incentivos del equipo"], ["mcar", "Margen real"], ["cli", "Clientes 360"], ["perm", "Qué puesto usa cada módulo"]]) {
  await ir(d, t, x); const bad = await d.evaluate((t) => !!document.querySelector("#s-" + t + " .msg.bad:not([hidden])"), t); ok(!bad, "«" + t + "» carga sin mensaje de error: " + (await texto(d, "#s-" + t + " .msg.bad:not([hidden])")).slice(0, 120));
  await foto(d, "d-" + t);
}
// Compras: rótulos nuevos
await ir(d, "compras", "Pedidos"); let t0 = await texto(d, "#s-compras");
ok(/Pedido al proveedor/.test(t0), "rótulo «Pedido al proveedor»"); ok(!/Marcar como enviado/.test(t0) && !/Enviado/.test(t0.replace(/Pedido al proveedor/g, "")), "ya no sale «Enviado»");
// Contabilidad: cada subpestaña
await ir(d, "conta", "Diario");
for (const [k, x] of [["mayor", "Saldo"], ["sumas", "Cuadra"], ["pyg", "RESULTADO DEL EJERCICIO"], ["balance", "Pasivo"], ["manual", "Nóminas"], ["reglas", "Cómo se apunta"], ["diario", "A-2026"]]) {
  await clic(d, `[data-peseg=cosub] [data-k=${k}]`); await d.waitForFunction((x) => document.getElementById("s-conta").innerText.includes(x), { timeout: 12000 }, x).catch(() => ok(false, "contabilidad/" + k + " muestra «" + x + "»")); await esp(500); await foto(d, "d-conta-" + k);
}
const dif = await texto(d, "#s-conta"); ok(!/No cuadra/.test(dif) && !/Atención/.test(dif), "la contabilidad cuadra en pantalla");
// asiento manual desde la pantalla
await clic(d, "[data-co=nuevo]"); await d.waitForSelector("dialog[open] #as-f"); await set(d, "#as-c", "Pago de la cuota del préstamo"); await d.evaluate(() => { const s = document.querySelectorAll("dialog[open] select[data-k=cuenta]"); s[0].value = "170"; s[0].dispatchEvent(new Event("change", { bubbles: true })); s[1].value = "572"; s[1].dispatchEvent(new Event("change", { bubbles: true })); });
await set(d, 'dialog[open] [data-i="0"][data-k=debe]', "250,00"); await set(d, 'dialog[open] [data-i="1"][data-k=haber]', "250,00"); ok(/Cuadra/.test(await texto(d, "dialog[open] #as-ok")), "el asiento manual cuadra en pantalla");
await foto(d, "d-asiento-manual"); await d.evaluate(() => document.querySelector("dialog[open] form").requestSubmit()); await d.waitForFunction(() => document.getElementById("s-conta").innerText.includes("cuota del préstamo"), { timeout: 12000 }).catch(() => ok(false, "el asiento nuevo aparece en la lista"));
// Permisos: marcar Compras para Recepción, guardar y comprobar
await ir(d, "perm", "Qué puesto"); await d.evaluate(() => { const c = document.querySelector('[data-perm-m="compras"][data-perm-r="mecanico"]'); c.checked = true; }); await set(d, "#pm-max", "150"); await clic(d, "[data-perm=guardar]"); await esp(1200); await ir(d, "perm", "Qué puesto");
ok(await d.evaluate(() => document.querySelector('[data-perm-m="compras"][data-perm-r="mecanico"]').checked), "los permisos se guardan"); ok((await d.evaluate(() => document.querySelector("#pm-max").value)) === "150", "el importe de aprobación se guarda");
await set(d, "#pm-max", "300"); await d.evaluate(() => { document.querySelector('[data-perm-m="compras"][data-perm-r="mecanico"]').checked = false; }); await clic(d, "[data-perm=guardar]"); await esp(900);
// Clientes 360: ficha y avisos
await ir(d, "cli", "Clientes 360"); const filas = await d.evaluate(() => document.querySelectorAll("#s-cli tr[data-pick]").length); ok(filas >= 3, "Clientes 360 lista clientes (" + filas + ")");
await d.evaluate(() => [...document.querySelectorAll("#s-cli tr[data-pick]")].find((r) => /Juan/.test(r.textContent)).click()); await d.waitForSelector("dialog[open]"); await esp(500); ok(/Historial del taller/.test(await texto(d, "dialog[open]")), "ficha del cliente con historial"); await foto(d, "d-cli-ficha"); await d.evaluate(() => document.querySelector("dialog[open] [data-pecerrar]").click());
// Documentos de coche
await ir(d, "mcar", "Margen real"); const hay = await d.evaluate(() => document.querySelectorAll("#s-mcar tr[data-pick]").length); if (hay) { await d.evaluate(() => document.querySelector("#s-mcar tr[data-pick]").click()); await d.waitForSelector("dialog[open] #d-cn"); await set(d, "#d-cn", "Pepe Rodríguez"); await set(d, "#d-pr", "7490,00"); await foto(d, "d-doc-coche"); await d.evaluate(() => document.querySelector("dialog[open] [data-pecerrar]").click()); }
// la pantalla de otras pestañas sigue funcionando (Finanzas, Taller)
await d.evaluate(() => document.querySelector('#tabs [data-tab="fin"]').click()); await d.waitForFunction(() => /Finanzas/.test(document.getElementById("s-fin").innerText) && !document.getElementById("s-fin").hidden, { timeout: 15000 }).catch(() => ok(false, "Finanzas sigue abriendo")); ok(await d.evaluate(() => document.getElementById("s-compras").hidden), "al abrir Finanzas se oculta Compras");
// móvil: pestañas nuevas y menú «Más»
const m = await sesion(390, 844, true);
await m.evaluate(() => document.querySelector("[data-appmas]").click()); await esp(800); const tiles = await m.evaluate(() => [...document.querySelectorAll(".app-tile")].map((x) => x.dataset.apptab));
for (const t of ["compras", "banco", "gest", "conta", "inc", "mcar", "cli", "perm"]) ok(tiles.includes(t), "el menú «Más» del móvil muestra «" + t + "»"); await foto(m, "m-mas");
await m.evaluate(() => document.querySelector('[data-apptab="conta"]').click()); await esp(2500); await foto(m, "m-conta");
await m.evaluate(() => document.querySelector("[data-appmas]").click()); await esp(600); await m.evaluate(() => document.querySelector('[data-apptab="cli"]').click()); await esp(2500); await foto(m, "m-cli");
await b.close();
console.log(`COMPROBACIONES: ${n} · FALLOS: ${fallos.length} · ERRORES DE PÁGINA: ${errores.length}`); if (errores.length) console.log(errores.join("\n")); process.exit(fallos.length || errores.length ? 1 : 0);
