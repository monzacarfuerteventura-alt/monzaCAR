// Voz de los vídeos de ayuda (Módulo 5): guiones y servicio ElevenLabs «DAN» (simulado).
// Uso: bun tools/pruebas/e2e-voz.mjs
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHmac } from "node:crypto";
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENV = { ADMIN_PASSWORD: "clave-de-pruebas-larga-2026", SESSION_SECRET: "secreto-de-pruebas", ELEVENLABS_API_KEY: "xi-test" };
globalThis.Netlify = { env: { get: (k) => ENV[k] || "" }, context: { deploy: { context: "production" } } };
let ok = 0; const mal = [];
const check = (n, c, x = "") => { if (c) { ok++; console.log("  ✔", n); } else { mal.push(n + " " + x); console.log("  ✘", n, x); } };
const G = await import(join(RAIZ, "netlify/lib/guiones.mts"));

console.log("\n== A. Guiones");
const PEDIDO = { inicio: 21, dash: 28, crm: 34, agenda: 18, coches: 34, taller: 38, alm: 29, caja: 35, jornada: 25 };
check("hay 9 guiones, uno por vídeo pedido", G.GUIONES.length === 9 && Object.keys(PEDIDO).every((k) => G.guion(k)));
for (const g of G.GUIONES) {
  const v = JSON.parse(readFileSync(join(RAIZ, "public/ayuda/videos", g.id + ".json"), "utf8"));
  const ts = g.lineas.map((l) => l.t);
  check(`${g.id}: duración = la del vídeo (${g.dur} s)`, Math.abs(g.dur - v.dur) < 0.11, `${g.dur} vs ${v.dur}`);
  check(`${g.id}: duración pedida ${PEDIDO[g.id]} s (± 1 s; la voz de Fichaje termina en 0:25)`, g.id === "jornada" ? true : Math.abs(g.dur - PEDIDO[g.id]) <= 1, String(g.dur));
  check(`${g.id}: una frase empieza justo con cada paso que se ve`, v.pasos.every((p) => ts.some((t) => Math.abs(t - p.t) < 0.06)), JSON.stringify(v.pasos.map((p) => p.t)));
  check(`${g.id}: tiempos crecientes y dentro del vídeo`, ts.every((t, i) => i === 0 || t > ts[i - 1]) && ts.at(-1) < g.dur);
  const h = G.huecos(g);
  const peor = g.lineas.map((l, i) => ({ w: G.palabras(l.txt) / h[i], t: l.t, txt: l.txt })).sort((a, b) => b.w - a.w)[0];
  check(`${g.id}: ninguna frase pasa de 2,9 palabras por segundo (peor ${peor.w.toFixed(2)})`, peor.w <= 2.9, JSON.stringify(peor));
  const largas = g.lineas.filter((l) => G.palabras(l.txt) > 17);
  check(`${g.id}: frases cortas (≤ 17 palabras)`, largas.length === 0, JSON.stringify(largas));
}
const fin = G.GUIONES.find((g) => g.id === "jornada"); const hj = G.huecos(fin);
check("Fichaje: la última frase acaba hacia el 0:25 (empieza en 22,1 y dura ≈ 3 s)", fin.lineas.at(-1).t + G.palabras(fin.lineas.at(-1).txt) / 2.5 <= 26, "");
check("ajustes de voz: eleven_multilingual_v2 · 0,50 · 0,80 · mp3", G.VOZ_AJUSTES.modelo === "eleven_multilingual_v2" && G.VOZ_AJUSTES.stability === 0.5 && G.VOZ_AJUSTES.similarity_boost === 0.8 && /^mp3_/.test(G.VOZ_AJUSTES.formato));
check("las siglas llevan pronunciación (CRM, PDF, QR, PIN)", G.GUIONES.flatMap((g) => g.lineas).filter((l) => /\b(CRM|PDF|QR|PIN)\b/.test(l.txt)).every((l) => l.voz && !/\b(CRM|PDF|QR|PIN)\b/.test(l.voz)));

console.log("\n== B. Servicio de voz (ElevenLabs simulado)");
const rutas = [];
for (const f of ["voz", "login", "taller", "jornada"]) { const mm = await import(join(RAIZ, "netlify/functions", f + ".mts")); for (const p of [].concat(mm.config.path)) rutas.push({ re: new RegExp("^" + p.replace(/\*/g, ".*").replace(/:[a-zA-Z]+/g, "[^/]+") + "$"), fn: mm.default, n: p.split("/").length, f }); }
rutas.sort((x, y) => y.n - x.n);
const m = await import(join(RAIZ, "netlify/functions/voz.mts"));
check("la ruta cubre /api/voz, /generar, /clip y /mp3", ["/api/voz", "/api/voz/generar", "/api/voz/clip/crm/0", "/api/voz/mp3/crm"].every((u) => rutas.some((r) => r.f === "voz" && r.re.test(u))));
const ORIGEN = "https://volcanocars.com";
const llamar = async (method, path, tok, body, cab = {}) => {
  const rt = rutas.find((x) => x.re.test(path.split("?")[0])); if (!rt) throw new Error("sin ruta " + path);
  const req = new Request(ORIGEN + path, { method, headers: { origin: ORIGEN, "user-agent": "prueba-e2e", "content-type": "application/json", ...(tok ? { authorization: "Bearer " + tok } : {}), ...cab }, body: body === undefined ? undefined : JSON.stringify(body) });
  const r = await rt.fn(req, { ip: "9.9.9." + (1 + Math.floor(Math.random() * 200)), geo: {} }); const ct = r.headers.get("content-type") || "";
  return { status: r.status, ct, cab: r.headers, data: ct.includes("json") ? await r.json() : new Uint8Array(await r.arrayBuffer()) };
};
const { store } = await import(join(RAIZ, "netlify/lib/shared.mts"));
await store("seguridad").set("config/2fa-equipo", "0"); // sin verificación en dos pasos para la prueba
const lg = await llamar("POST", "/api/login", "", { clave: ENV.ADMIN_PASSWORD });
check("el gerente entra", lg.status === 200 && !!lg.data.token); const tok = lg.data.token;
await llamar("POST", "/api/taller/equipo", tok, { nombre: "Pedro", usuario: "pedro", pin: "445566", rol: "mecanico" });
const ap = await llamar("POST", "/api/taller/equipo", tok, { nombre: "Pedro", usuario: "pedro", pin: "445566", rol: "mecanico" }); const lp = await llamar("POST", "/api/login", "", { usuario: "pedro", pin: "445566" }); const tokM = lp.data.token;
await llamar("POST", "/api/jornada/fichar", tokM, { accion: "entrada" });
let r = await llamar("GET", "/api/voz", null); check("sin sesión: 401", r.status === 401);
r = await llamar("GET", "/api/voz", tok); check("con sesión: guiones, configurado y 0 frases listas", r.status === 200 && r.data.configurado === true && r.data.admin === true && r.data.voz === "DAN" && r.data.modulos.crm.listas === 0 && r.data.modulos.crm.lineas.length === 8, JSON.stringify(r.data).slice(0, 200));

const pedidos = []; const fetchReal = globalThis.fetch; let voces = [{ voice_id: "vDAN123", name: "Dan" }, { voice_id: "otra", name: "Rachel" }]; let fallo = 0;
const MP3 = (n) => { const b = new Uint8Array(400 + n); b.set([0xff, 0xfb, 0x90, 0x64]); return b; };
globalThis.fetch = async (u, o = {}) => {
  const url = String(u);
  if (url.includes("api.elevenlabs.io") && url.endsWith("/v1/voices")) { pedidos.push({ url, key: o.headers["xi-api-key"] }); return new Response(JSON.stringify({ voices: voces }), { status: 200 }); }
  if (url.includes("api.elevenlabs.io/v1/text-to-speech/")) { const b = JSON.parse(o.body); pedidos.push({ url, key: o.headers["xi-api-key"], b }); if (fallo) return new Response("{}", { status: fallo }); return new Response(MP3(b.text.length), { status: 200, headers: { "content-type": "audio/mpeg" } }); }
  return fetchReal(u, o);
};
r = await llamar("POST", "/api/voz/generar", tok, { modulo: "agenda", n: 0 });
check("genera la frase 0 de Agenda", r.status === 200 && r.data.ok && r.data.listas === 1 && r.data.total === 5, JSON.stringify(r.data));
const tts = pedidos.find((p) => p.b);
check("busca la voz llamada «Dan» en la cuenta y la usa", pedidos[0].url.endsWith("/v1/voices") && tts.url.includes("/text-to-speech/vDAN123") && tts.key === "xi-test", tts?.url);
check("pide eleven_multilingual_v2, estabilidad 0,50, similitud 0,80 y MP3", tts.b.model_id === "eleven_multilingual_v2" && tts.b.voice_settings.stability === 0.5 && tts.b.voice_settings.similarity_boost === 0.8 && tts.url.includes("output_format=mp3_44100_128"), JSON.stringify(tts.b));
check("la frase enviada es la del guion", tts.b.text === "Esta es la agenda.");
pedidos.length = 0;
for (let i = 1; i < 5; i++) r = await llamar("POST", "/api/voz/generar", tok, { modulo: "agenda", n: i });
check("la voz se busca una sola vez (queda guardada)", pedidos.every((p) => !p.url.endsWith("/v1/voices")) && r.data.listas === 5);
r = await llamar("GET", "/api/voz", tok); check("Agenda queda completa con fecha", r.data.modulos.agenda.listas === 5 && !!r.data.modulos.agenda.generado && r.data.modulos.crm.listas === 0);
r = await llamar("GET", "/api/voz/clip/agenda/2", tok); check("el clip se sirve como audio/mpeg", r.status === 200 && r.ct === "audio/mpeg" && r.data.length > 300 && r.data[0] === 0xff);
r = await llamar("GET", "/api/voz/clip/agenda/2", null); check("el clip sin sesión: 401", r.status === 401);
r = await llamar("GET", "/api/voz/clip/crm/0", tok); check("frase sin generar: 404", r.status === 404);
r = await llamar("GET", "/api/voz/mp3/agenda", tok); check("descarga el MP3 entero (frases seguidas) con nombre de archivo", r.status === 200 && r.ct === "audio/mpeg" && /attachment; filename="volcano-cars-agenda-voz-dan\.mp3"/.test(r.cab.get("content-disposition")) && r.data.length > 5 * 300, String(r.data.length));
r = await llamar("GET", "/api/voz/mp3/crm", tok); check("MP3 de un vídeo incompleto: 409", r.status === 409);
r = await llamar("POST", "/api/voz/generar", tok, { modulo: "nada", n: 0 }); check("vídeo inexistente: 400", r.status === 400);
r = await llamar("POST", "/api/voz/generar", tok, { modulo: "crm", n: 99 }); check("frase inexistente: 400", r.status === 400);
r = await llamar("POST", "/api/voz/generar", tok, { modulo: "crm", n: 0 }, { origin: "https://malo.example" }); check("otro origen: 403", r.status === 403);
fallo = 401; r = await llamar("POST", "/api/voz/generar", tok, { modulo: "crm", n: 0 }); check("clave mala de ElevenLabs: mensaje claro (502)", r.status === 502 && /clave/i.test(r.data.error), r.data.error);
fallo = 429; r = await llamar("POST", "/api/voz/generar", tok, { modulo: "crm", n: 0 }); check("sin caracteres / demasiado rápido: mensaje claro", r.status === 502 && /caracteres|rápido/.test(r.data.error), r.data.error); fallo = 0;
r = await llamar("GET", "/api/voz", tok); check("un fallo no deja frases a medias", r.data.modulos.crm.listas === 0);
ENV.ELEVENLABS_API_KEY = ""; r = await llamar("POST", "/api/voz/generar", tok, { modulo: "crm", n: 0 }); check("sin ELEVENLABS_API_KEY: explica dónde ponerla", r.status === 400 && r.data.sinClave && /ELEVENLABS_API_KEY/.test(r.data.error)); 
r = await llamar("GET", "/api/voz", tok); check("… y el panel lo sabe (configurado: false)", r.data.configurado === false);
ENV.ELEVENLABS_API_KEY = "xi-test";
ENV.ELEVENLABS_VOICE_ID = "vFIJA"; pedidos.length = 0; r = await llamar("POST", "/api/voz/generar", tok, { modulo: "crm", n: 0 });
check("con ELEVENLABS_VOICE_ID usa esa voz sin buscar", r.status === 200 && pedidos.length === 1 && pedidos[0].url.includes("/text-to-speech/vFIJA"), pedidos[0]?.url);
r = await llamar("GET", "/api/voz/clip/crm/0", tok); check("y la sirve", r.status === 200);
// Un equipo (mecánico) puede escuchar pero no generar
r = await llamar("POST", "/api/voz/generar", tokM, { modulo: "crm", n: 1 }); check("el mecánico no puede generar (403)", r.status === 403, JSON.stringify(r.data));
r = await llamar("GET", "/api/voz", tokM); check("pero sí ve los guiones (admin: false)", r.status === 200 && r.data.admin === false && r.data.modulos.crm.listas >= 1);
r = await llamar("GET", "/api/voz/clip/crm/0", tokM); check("y oye los clips", r.status === 200 && r.ct === "audio/mpeg");
globalThis.fetch = fetchReal;
console.log(`\nRESULTADO: ${ok} correctas · ${mal.length} fallidas`);
if (mal.length) { console.log(mal.join("\n")); process.exit(1); }
process.exit(0);
