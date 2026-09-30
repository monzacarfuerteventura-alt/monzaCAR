// Motor de ventas (Módulo 4): filtro de frases prohibidas, horario/08:30 y canales Messenger / Instagram / WhatsApp.
// Uso: bun tools/pruebas/e2e-ventas.mjs   (mismo almacén en memoria que el resto de pruebas)
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac } from "node:crypto";
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENV = { ADMIN_PASSWORD: "clave-de-pruebas-larga-2026", SESSION_SECRET: "secreto-de-pruebas", WA_MODO: "siempre", WA_TOKEN: "wa-tok", WA_PHONE_ID: "123", WA_APP_SECRET: "sec-wa", META_APP_SECRET: "sec-meta", FB_PAGE_TOKEN: "EAAfb", IG_TOKEN: "IGQig", GROQ_API_KEY: "gk", URL: "https://volcanocars.com" };
globalThis.Netlify = { env: { get: (k) => ENV[k] || "" }, context: { deploy: { context: "production" } } };
let ok = 0; const mal = [];
const check = (n, c, x = "") => { if (c) { ok++; console.log("  ✔", n); } else { mal.push(n + " " + x); console.log("  ✘", n, x); } };
const V = await import(join(RAIZ, "netlify/lib/ventas.mts"));
const M = await import(join(RAIZ, "netlify/lib/meta.mts"));

console.log("\n== A. Filtro de frases prohibidas");
const frases = ["Es el último coche", "es el ultimo coche que queda", "CONFÍA EN MÍ", "Confia en mi, de verdad", "¿Por qué no te decides?", "por que no te decides", "Precio negociable", "precio   negociable.", "Oferta solo por hoy", "OFERTA SOLO POR HOY", "oferta sólo por hoy"];
for (const f of frases) { const r = V.sanear(`Hola. ${f} y ya está.`); check("reescribe: " + f, r.cambios.length === 1 && !V.tieneProhibidas(r.texto), r.texto); }
const limpio = V.sanear("Te lo apunto para las 8:30. ¿Sería una mala idea reservarte el martes?");
check("un texto limpio no se toca", limpio.cambios.length === 0 && limpio.texto.startsWith("Te lo apunto"));
const varias = V.sanear("Confía en mí: es el último coche, precio negociable. Oferta solo por hoy. ¿Por qué no te decides?");
check("cinco frases en un mensaje: todas fuera", varias.cambios.length === 5 && !V.tieneProhibidas(varias.texto), varias.texto);
check("se puede llamar dos veces seguidas (sin estado escondido)", V.sanear("Confía en mí").cambios.length === 1 && V.sanear("Confía en mí").cambios.length === 1);

console.log("\n== B. Horario de Canarias y primera gestión a las 08:30");
const D = (iso) => new Date(iso); // Canarias en septiembre/octubre = UTC+1 (WEST); en invierno UTC+0
check("miércoles 10:00 → dentro de horario", V.enHorario(D("2026-09-30T09:00:00Z")) === true);
check("miércoles 16:00 → fuera", V.enHorario(D("2026-09-30T15:00:00Z")) === false);
check("miércoles 07:59 → fuera", V.enHorario(D("2026-09-30T06:59:00Z")) === false);
check("sábado 11:00 → fuera", V.enHorario(D("2026-10-03T10:00:00Z")) === false);
check("día cerrado (festivo) → fuera", V.enHorario(D("2026-09-30T09:00:00Z"), ["2026-09-30"]) === false);
let g = V.primeraGestion(D("2026-09-30T19:00:00Z")); check("miércoles 20:00 → jueves 08:30", g.fecha === "2026-10-01" && g.hora === "08:30" && !g.hoy, JSON.stringify(g));
g = V.primeraGestion(D("2026-10-02T19:00:00Z")); check("viernes 20:00 → lunes 08:30", g.fecha === "2026-10-05" && g.hora === "08:30", JSON.stringify(g));
g = V.primeraGestion(D("2026-10-03T10:00:00Z")); check("sábado → lunes 08:30", g.fecha === "2026-10-05", JSON.stringify(g));
g = V.primeraGestion(D("2026-10-04T22:00:00Z")); check("domingo noche → lunes 08:30", g.fecha === "2026-10-05", JSON.stringify(g));
g = V.primeraGestion(D("2026-09-30T05:30:00Z")); check("miércoles 06:30 (antes de abrir) → hoy 08:30", g.fecha === "2026-09-30" && g.hoy === true, JSON.stringify(g));
g = V.primeraGestion(D("2026-10-01T19:00:00Z"), ["2026-10-02", "2026-10-05"]); check("viernes y lunes cerrados → martes 08:30", g.fecha === "2026-10-06", JSON.stringify(g));
g = V.primeraGestion(D("2026-12-31T22:00:00Z")); check("cambio de año: jueves 31-dic noche → viernes 1-ene 08:30", g.fecha === "2027-01-01", JSON.stringify(g));

console.log("\n== C. Mensajes de Messenger e Instagram");
const pag = { object: "page", entry: [{ id: "P1", messaging: [
  { sender: { id: "U1" }, recipient: { id: "P1" }, timestamp: 1, message: { mid: "m1", text: "Hola, ¿tenéis un Seat León?" } },
  { sender: { id: "U2" }, recipient: { id: "P1" }, message: { mid: "m2", attachments: [{ type: "image" }] } },
  { sender: { id: "P1" }, recipient: { id: "U3" }, message: { mid: "m3", is_echo: true, text: "Hola, soy Yeicob" } },
  { sender: { id: "U1" }, recipient: { id: "P1" }, read: { watermark: 1 } },
] }] };
let ev = M.eventosSociales(pag);
check("Messenger: 3 eventos (texto, foto, eco); lecturas ignoradas", ev.length === 3, JSON.stringify(ev.map((e) => e.tipo)));
check("Messenger: texto normalizado", ev[0].canal === "messenger" && ev[0].id === "U1" && ev[0].texto.includes("Seat") && ev[0].tipo === "text");
check("Messenger: foto sin texto → tipo image", ev[1].tipo === "image" && ev[1].texto === "");
check("Messenger: eco apunta al cliente (no a la página)", ev[2].eco === true && ev[2].id === "U3");
ev = M.eventosSociales({ object: "instagram", entry: [{ messaging: [{ sender: { id: "IG9" }, message: { mid: "i1", text: "precio del Golf?" } }] }] });
check("Instagram: evento normalizado", ev.length === 1 && ev[0].canal === "instagram" && ev[0].id === "IG9");
check("WhatsApp u otro objeto: no lo toca", M.eventosSociales({ object: "whatsapp_business_account", entry: [] }).length === 0 && M.eventosSociales(null).length === 0);
check("claves de conversación separadas por canal", M.clave("whatsapp", "34600") === "c/34600" && M.clave("messenger", "U1") === "c/fb:U1" && M.clave("instagram", "U1") === "c/ig:U1");
const cuerpo = JSON.stringify(pag), firma = (s) => "sha256=" + createHmac("sha256", s).update(cuerpo).digest("hex");
check("firma válida con cualquiera de los secretos", M.firmaMeta(cuerpo, firma("a"), ["a", "b"]) && M.firmaMeta(cuerpo, firma("b"), ["a", "b"]));
check("firma falsa o sin secreto: rechazada", !M.firmaMeta(cuerpo, firma("x"), ["a", "b"]) && !M.firmaMeta(cuerpo, firma("a"), ["", ""]) && !M.firmaMeta(cuerpo, "", ["a"]));
check("Messenger no lleva *negritas* de WhatsApp", M.sinFormato("Hola *Juan*, mira") === "Hola Juan, mira");

console.log("\n== D. Agente de punta a punta (Groq y Meta simulados)");
const enviados = [], groqCola = []; let groqPeticiones = [];
const fetchReal = globalThis.fetch;
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.includes("api.groq.com")) { const b = JSON.parse(o.body); groqPeticiones.push(b); const r = groqCola.shift() || { content: "vale" }; return new Response(JSON.stringify({ choices: [{ message: r }] }), { status: 200 }); }
  if (url.includes("graph.facebook.com") || url.includes("graph.instagram.com")) { enviados.push({ url, auth: o.headers?.authorization, body: JSON.parse(o.body) }); return new Response("{}", { status: 200 }); }
  return fetchReal(u, o);
};
const wa = await import(join(RAIZ, "netlify/functions/whatsapp.mts"));
check("el webhook responde también en /api/meta", [].concat(wa.config.path).includes("/api/meta") && [].concat(wa.config.path).includes("/api/whatsapp"));
async function webhook(cuerpoObj, secreto = "sec-meta") {
  const c = JSON.stringify(cuerpoObj);
  const req = new Request("https://volcanocars.com/api/meta", { method: "POST", headers: { "x-hub-signature-256": "sha256=" + createHmac("sha256", secreto).update(c).digest("hex"), "content-type": "application/json" }, body: c });
  return wa.default(req, { ip: "1.1.1.1", geo: {} });
}
const msgFb = (id, mid, text) => ({ object: "page", entry: [{ messaging: [{ sender: { id }, recipient: { id: "P1" }, message: { mid, text } }] }] });
let r = await webhook(msgFb("U1", "a1", "hola"), "mala");
check("firma falsa → 401 y nada enviado", r.status === 401 && enviados.length === 0);
groqCola.push({ content: "Confía en mí, es el último coche que queda. Precio negociable. ¿Por qué no te decides?" });
r = await webhook(msgFb("U1", "a2", "¿Tenéis algún coche?"));
check("Messenger: 200", r.status === 200);
check("Messenger: se envió 1 respuesta por Graph con el token de la página", enviados.length === 1 && enviados[0].auth === "Bearer EAAfb" && enviados[0].url.startsWith("https://graph.facebook.com/") && enviados[0].body.recipient.id === "U1", JSON.stringify(enviados[0]));
const salida = enviados[0]?.body.message.text || "";
check("la respuesta NO contiene ninguna frase prohibida", !V.tieneProhibidas(salida) && salida.length > 20, salida);
check("Messenger: se presenta como IA una vez", /asistente virtual \(IA\)/.test(salida) && salida.includes("08:30"), salida);
const sistema = groqPeticiones[0].messages[0].content;
check("el prompt prohíbe las 5 frases y fija las 08:30", /FRASES PROHIBIDAS/.test(sistema) && sistema.includes("08:30") && /Messenger/.test(sistema) && /no tienes su teléfono/.test(sistema));
check("el prompt ya no promete las 8:00", !/8:00(?!–)/.test(sistema.replace(/8:00–16:00/g, "")) || /L-V 8:00–16:00|8:00-16:00|de 8:00/.test(sistema), (sistema.match(/.{30}8:00.{30}/g) || []).join(" | "));
enviados.length = 0;
r = await webhook(msgFb("U1", "a2", "¿Tenéis algún coche?")); // mismo mid: duplicado
check("aviso repetido de Meta: no se contesta dos veces", enviados.length === 0);
groqCola.push({ content: "Un momento" });
r = await webhook(msgFb("U9", "b1", "hola"));
check("otra persona sí se atiende", enviados.length === 1 && enviados[0].body.recipient.id === "U9");
enviados.length = 0;
// Instagram: apunta el caso con llamada; sin teléfono no lo guarda, con teléfono sí y da día y hora 08:30
groqCola.push({ content: null, tool_calls: [{ id: "t1", type: "function", function: { name: "apuntar_para_asesor", arguments: JSON.stringify({ motivo: "coche", resumen: "Quiere ver un Golf", nombre: "Ana", preferencia: "llamada" }) } }] }, { content: "Necesito tu teléfono" });
groqPeticiones = [];
r = await webhook({ object: "instagram", entry: [{ messaging: [{ sender: { id: "IG1" }, message: { mid: "g1", text: "Quiero un Golf, llamadme" } }] }] });
const herr1 = groqPeticiones[1]?.messages.filter((m) => m.role === "tool").map((m) => m.content).join(" ") || "";
check("Instagram sin teléfono: no se guarda y se le pide", /Falta su teléfono/.test(herr1), herr1);
check("Instagram usa su propio token (graph.instagram.com)", enviados.length === 1 && enviados[0].url.startsWith("https://graph.instagram.com/") && enviados[0].auth === "Bearer IGQig", JSON.stringify(enviados[0]));
enviados.length = 0; groqPeticiones = [];
groqCola.push({ content: null, tool_calls: [{ id: "t2", type: "function", function: { name: "apuntar_para_asesor", arguments: JSON.stringify({ motivo: "coche", resumen: "Quiere ver un Golf", nombre: "Ana", telefono: "+34 600 123 456", preferencia: "prueba_conduccion" }) } }] }, { content: "Hecho" });
r = await webhook({ object: "instagram", entry: [{ messaging: [{ sender: { id: "IG1" }, message: { mid: "g2", text: "600 123 456" } }] }] });
const herr2 = groqPeticiones[1]?.messages.filter((m) => m.role === "tool").map((m) => m.content).join(" ") || "";
let j = {}; try { j = JSON.parse(groqPeticiones[1].messages.filter((m) => m.role === "tool")[0].content); } catch {}
check("Instagram con teléfono: caso guardado y agendado a las 08:30", j.ok === true && j.contacto?.hora === "08:30" && /^\d{4}-\d{2}-\d{2}$/.test(j.contacto?.fecha), herr2.slice(0, 300));
const { store } = await import(join(RAIZ, "netlify/lib/shared.mts"));
const s = store("solicitudes"); const { blobs } = await s.list({ prefix: "s/" });
const todas = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" })));
const lead = todas.find((x) => x && /Instagram Direct/.test(x.mensaje || ""));
check("el lead llega al CRM con canal, teléfono y cita de prueba de conducción", !!lead && lead.telefono.includes("600") && /Prueba de conducción pedida para el \d{4}-\d{2}-\d{2} a las 08:30/.test(lead.mensaje) && /Instagram Direct/.test(lead.origen?.canal || ""), JSON.stringify(lead || {}).slice(0, 300));
// eco: una persona contesta desde la bandeja → el agente se aparta
enviados.length = 0;
await webhook({ object: "page", entry: [{ messaging: [{ sender: { id: "P1" }, recipient: { id: "U1" }, message: { mid: "e1", is_echo: true, text: "Hola, soy Yeicob" } }] }] });
groqCola.push({ content: "no debería hablar" });
await webhook(msgFb("U1", "a9", "gracias, ¿y el precio?"));
check("tras contestar una persona, el agente se calla", enviados.length === 0);
// canal sin token → se ignora sin romper
ENV.IG_TOKEN = ""; ENV.FB_PAGE_TOKEN = "";
r = await webhook({ object: "instagram", entry: [{ messaging: [{ sender: { id: "IG5" }, message: { mid: "z1", text: "hola" } }] }] });
check("canal sin configurar: 200 y no envía nada", r.status === 200 && enviados.length === 0);
ENV.IG_TOKEN = "IGQig"; ENV.FB_PAGE_TOKEN = "EAAfb";
// WhatsApp de siempre
const waMsg = (id, text) => ({ object: "whatsapp_business_account", entry: [{ changes: [{ field: "messages", value: { messages: [{ id, from: "34600111222", type: "text", text: { body: text } }], contacts: [{ wa_id: "34600111222", profile: { name: "Luis" } }] } }] }] });
groqCola.length = 0; groqCola.push({ content: "Oferta solo por hoy. Te espero mañana." });
r = await webhook(waMsg("w1", "hola"), "sec-wa");
const texto = enviados.filter((e) => e.body.type === "text");
check("WhatsApp sigue funcionando (marca «escribiendo» y responde)", r.status === 200 && enviados.some((e) => e.body.status === "read") && texto.length === 1 && texto[0].url.includes("/123/messages") && texto[0].body.to === "34600111222", JSON.stringify(enviados).slice(0, 300));
check("WhatsApp también pasa por el filtro", texto.length === 1 && !V.tieneProhibidas(texto[0].body.text.body) && /Te espero mañana/.test(texto[0].body.text.body), texto[0]?.body.text.body);
enviados.length = 0;
r = await wa.default(new Request("https://volcanocars.com/api/whatsapp?probar=1"), { ip: "1.1.1.1", geo: {} });
j = await r.json();
check("probar=1 informa de los tres canales", j.canales && j.canales.whatsapp === true && j.canales.messenger === true && j.canales.instagram === true, JSON.stringify(j));

globalThis.fetch = fetchReal;
console.log(`\nRESULTADO: ${ok} correctas · ${mal.length} fallidas`);
if (mal.length) { console.log(mal.join("\n")); process.exit(1); }
process.exit(0);
