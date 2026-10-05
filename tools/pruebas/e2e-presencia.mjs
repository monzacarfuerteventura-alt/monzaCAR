// =====================================================================
// PRUEBA DEL ANTITRAMPA DEL FICHAJE (actualización 44)
// Ejecuta las funciones reales de netlify/functions con un almacén en memoria.
// Uso:  bun tools/pruebas/e2e-presencia.mjs   (necesita el @netlify/blobs de pruebas, ver LEEME.md)
// =====================================================================
import { readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const ENV = { ADMIN_PASSWORD: "clave-de-pruebas-larga-2026", SESSION_SECRET: "secreto-de-pruebas" };
globalThis.Netlify = { env: { get: (k) => ENV[k] || "" }, context: { deploy: { context: "production" } } };
const ORIGEN = "https://volcanocars.com";

const rutas = [];
for (const f of readdirSync(join(RAIZ, "netlify/functions")).filter((x) => x.endsWith(".mts"))) {
  const m = await import(join(RAIZ, "netlify/functions", f));
  for (const p of m.config?.path ? [].concat(m.config.path) : []) rutas.push({ re: new RegExp("^" + p.replace(/\*/g, ".*").replace(/:[a-zA-Z]+/g, "[^/]+") + "$"), fn: m.default, n: p.split("/").length });
}
rutas.sort((a, b) => b.n - a.n);
let IP = "10.0.0.1";
async function llamar(method, path, token, body, ip = IP) {
  const url = new URL(path, ORIGEN), r = rutas.find((x) => x.re.test(url.pathname));
  const headers = { "content-type": "application/json", origin: ORIGEN, "user-agent": "prueba-e2e" };
  if (token) headers.authorization = "Bearer " + token;
  const res = await r.fn(new Request(url, { method, headers, body: body === undefined || method === "GET" ? undefined : JSON.stringify(body) }), { ip, geo: { country: { code: "ES" } }, params: {} });
  let data = null; try { data = await res.clone().json(); } catch { data = await res.text().catch(() => ""); }
  return { status: res.status, data };
}
let ok = 0, mal = 0; const fallos = [];
function esperar(n, c, d = "") { if (c) { ok++; console.log("  ✔ " + n); } else { mal++; fallos.push(n + " " + d); console.log("  ✘ " + n + " " + d); } }
const est = (r) => `(HTTP ${r.status}${r.data && r.data.error ? ": " + r.data.error : ""})`;
const { store } = await import(join(RAIZ, "netlify/lib/shared.mts"));
await store("seguridad").set("config/2fa-equipo", "0");
const { distM } = await import(join(RAIZ, "netlify/lib/presencia.mts"));

// La nave de la prueba y puntos a distancias conocidas (0,0001° de latitud ≈ 11,1 m)
const LAT = 28.4, LNG = -13.87;
const aqui = (dLat = 0, acc = 12) => ({ lat: LAT + dLat, lng: LNG + dLat / 2, acc });
const DID_A = "abcdefghijkmnpqrstuv", DID_B = "zyxwvutsrqpnmkjihgfe";

console.log("\n0) Distancia (haversine)");
esperar("500 m al norte ≈ 500 m", Math.abs(distM(LAT, LNG, LAT + 0.0045, LNG) - 500) < 2, String(distM(LAT, LNG, LAT + 0.0045, LNG)));
esperar("mismo punto = 0 m", distM(LAT, LNG, LAT, LNG) === 0);

console.log("\n1) Altas");
const lg = await llamar("POST", "/api/login", "", { clave: ENV.ADMIN_PASSWORD }); const G = lg.data.token;
esperar("el gerente entra", lg.status === 200 && !!G, est(lg));
const equipo = [["Pedro", "pedro", "445566"], ["Ana", "ana", "112233"], ["Luis", "luis", "778899"]];
const T = {}, U = {};
for (const [nombre, usuario, pin] of equipo) {
  await llamar("POST", "/api/taller/equipo", G, { nombre, usuario, pin, rol: "mecanico" });
  const l = await llamar("POST", "/api/login", "", { usuario, pin }); T[usuario] = l.data.token; U[usuario] = l.data.uid;
  esperar("entra " + nombre, !!T[usuario] && !!U[usuario], est(l));
}

console.log("\n2) Sin la nave fijada todo sigue como antes (no se bloquea a nadie al publicar)");
let r = await llamar("POST", "/api/jornada/fichar", T.luis, { accion: "entrada" });
esperar("Luis ficha sin ubicación (aún no hay nave)", r.status === 200, est(r));
r = await llamar("POST", "/api/jornada/fichar", T.luis, { accion: "salida" });
esperar("Luis ficha la salida", r.status === 200, est(r));
r = await llamar("GET", "/api/jornada/nave", G);
esperar("el panel ve «nave: null» (antitrampa NO activa)", r.status === 200 && r.data.nave === null, est(r));

console.log("\n3) El gerente fija la nave");
r = await llamar("POST", "/api/jornada/nave", T.pedro, { accion: "fijar", pos: aqui() });
esperar("un mecánico NO puede fijar la nave (403)", r.status === 403, est(r));
r = await llamar("POST", "/api/jornada/nave", G, { accion: "fijar" });
esperar("sin ubicación no se puede fijar (400)", r.status === 400, est(r));
r = await llamar("POST", "/api/jornada/nave", G, { accion: "fijar", pos: { lat: LAT, lng: LNG, acc: 300 } });
esperar("con GPS impreciso (±300 m) no se puede fijar (400)", r.status === 400, est(r));
r = await llamar("POST", "/api/jornada/nave", G, { accion: "activar", si: true });
esperar("no se puede activar sin fijar antes (400)", r.status === 400, est(r));
r = await llamar("POST", "/api/jornada/nave", G, { accion: "fijar", pos: { lat: LAT, lng: LNG, acc: 8 }, radio: 150 });
esperar("fija la nave con ±8 m y radio 150 m", r.status === 200 && r.data.nave && r.data.nave.activa && r.data.nave.radio === 150, est(r));
r = await llamar("POST", "/api/jornada/nave", G, { accion: "radio", radio: 10 });
esperar("el radio no baja de 40 m", r.status === 200 && r.data.nave.radio === 40, est(r));
r = await llamar("POST", "/api/jornada/nave", G, { accion: "radio", radio: 99999 });
esperar("el radio no pasa de 200 m (actualización 45)", r.status === 200 && r.data.nave.radio === 200, est(r));
r = await llamar("POST", "/api/jornada/nave", G, { accion: "radio", radio: 150 });
esperar("radio 150 m", r.status === 200 && r.data.nave.radio === 150, est(r));

r = await llamar("POST", "/api/jornada/nave", G, { accion: "radio", radio: 150 });
console.log("\n4) Intentos de trampa (todos deben ser rechazados)");
const intento = async (nombre, body, codigo, usuario = "pedro") => {
  const x = await llamar("POST", "/api/jornada/fichar", T[usuario], body);
  esperar(nombre, x.status === 403 && x.data.rechazado === true && x.data.codigo === codigo, est(x) + " " + (x.data && x.data.codigo));
  return x;
};
await intento("desde casa: sin ubicación (botón)", { accion: "entrada" }, "sin-ubicacion");
await intento("saltarse con «via: nfc» inventado y sin ubicación", { via: "nfc" }, "sin-ubicacion");
await intento("saltarse con «via: nfc» y acción, sin ubicación", { via: "nfc", accion: "entrada" }, "sin-ubicacion");
await intento("coordenadas 0,0", { accion: "entrada", pos: { lat: 0, lng: 0, acc: 5 } }, "sin-ubicacion");
await intento("coordenadas con texto", { accion: "entrada", pos: { lat: "x", lng: "y", acc: "z" } }, "sin-ubicacion");
await intento("coordenadas fuera de rango", { accion: "entrada", pos: { lat: 999, lng: 999, acc: 5 } }, "sin-ubicacion");
let x = await intento("a 500 m de la nave", { accion: "entrada", pos: aqui(0.0045) }, "fuera");
esperar("   …y el mensaje dice la distancia real que ha calculado el servidor", /Estás a 5[0-9]{2} m del taller/.test(x.data.error), x.data.error);
await intento("a 5 km (en casa)", { accion: "entrada", pos: aqui(0.045) }, "fuera");
await intento("GPS muy impreciso (±250 m) aunque «esté» en la nave", { accion: "entrada", pos: aqui(0, 250) }, "imprecisa");
await intento("GPS de ±60 m (más de 50 m de error) aunque esté en la nave", { accion: "entrada", pos: aqui(0, 60) }, "imprecisa");
x = await intento("cerca (119 m) pero con ±40 m de error: el círculo de error se sale del radio (119+40 > 150)", { accion: "entrada", pos: aqui(0.00098, 40) }, "imprecisa");
esperar("   …y el mensaje explica que no puede confirmar que esté DENTRO", /DENTRO de la nave/.test(x.data.error), x.data.error);
await intento("ubicación de hace 60 s (lectura antigua)", { accion: "entrada", pos: { ...aqui(0.0001, 10), edad: 60000 } }, "antigua");
x = await llamar("POST", "/api/jornada/fichar", T.pedro, { qr: "ABCDEFGHIJKLMN", pos: aqui() });
esperar("QR falso aunque esté en la nave (400)", x.status === 400, est(x));
x = await llamar("GET", "/api/jornada/yo", T.pedro);
esperar("tras todos esos intentos, Pedro sigue FUERA (no se ha registrado nada)", x.data.estado === "fuera", est(x));

x = await llamar("POST", "/api/jornada/fichar", T.luis, { accion: "entrada", pos: { lat: LAT + 0.00098, lng: LNG + 0.00049, acc: 25, edad: 3000 } });
esperar("justo dentro: 119 m + ±25 m = 144 m ≤ 150 m y lectura de hace 3 s → SÍ ficha", x.status === 200, est(x));
x = await llamar("POST", "/api/jornada/deshacer", T.luis, {});
esperar("   (se deshace ese fichaje para seguir con la prueba)", x.status === 200, est(x));
console.log("\n5) Fichar de verdad en la nave");
x = await llamar("POST", "/api/jornada/fichar", T.pedro, { accion: "entrada", pos: aqui(0.0001, 12), did: DID_A });
esperar("Pedro ficha la entrada a ~14 m", x.status === 200 && x.data.ok, est(x));
const hoy = new Date().toISOString().slice(0, 10);
let dia = await llamar("GET", `/api/jornada/dia?uid=${U.pedro}&fecha=${hoy}`, G);
let ev = dia.data.dia && dia.data.dia.eventos[0];
esperar("el gerente ve la prueba: en la nave, distancia y precisión", ev && ev.pos && ev.pos.r === "nave" && ev.pos.d > 5 && ev.pos.d < 25 && ev.pos.a === 12, JSON.stringify(ev && ev.pos));
esperar("   …sin alertas y sin WiFi del taller", ev && !ev.pos.alerta && ev.pos.red === false);
esperar("   …y la prueba no incluye el identificador del móvil en claro", ev && ev.dv && ev.dv !== DID_A && !JSON.stringify(ev).includes(DID_A));
x = await llamar("POST", "/api/jornada/fichar", T.pedro, { accion: "pausa", pos: aqui(0.0002, 20) });
esperar("ficha la pausa en la nave", x.status === 200, est(x));
x = await llamar("POST", "/api/jornada/fichar", T.pedro, { accion: "reanudar", pos: aqui(0.00005, 20), via: "nfc" });
esperar("ficha con NFC desde la nave (vale: hay ubicación)", x.status === 200 && x.data.ok, est(x));
x = await llamar("POST", "/api/jornada/deshacer", T.pedro, {});
esperar("«Deshacer» (2 min) sigue funcionando sin ubicación", x.status === 200, est(x));

console.log("\n6) Señales de trampa que avisan al gerente (no bloquean)");
x = await llamar("POST", "/api/jornada/fichar", T.ana, { accion: "entrada", pos: aqui(0.0001, 12), did: DID_B });
esperar("Ana ficha con las MISMAS coordenadas exactas que Pedro", x.status === 200, est(x));
dia = await llamar("GET", `/api/jornada/dia?uid=${U.ana}&fecha=${hoy}`, G); ev = dia.data.dia.eventos[0];
esperar("   …queda marcado «posición repetida»", ev.pos.alerta && ev.pos.alerta.includes("posicion-repetida"), JSON.stringify(ev.pos));
x = await llamar("POST", "/api/jornada/fichar", T.luis, { accion: "entrada", pos: aqui(0.0003, 15), did: DID_A });
esperar("Luis ficha desde el MISMO móvil que Pedro", x.status === 200, est(x));
dia = await llamar("GET", `/api/jornada/dia?uid=${U.luis}&fecha=${hoy}`, G); ev = dia.data.dia.eventos.at(-1);
esperar("   …queda marcado «mismo móvil»", ev.pos.alerta && ev.pos.alerta.includes("mismo-movil"), JSON.stringify(ev.pos));
const pl = await llamar("GET", "/api/jornada/plantilla", G);
const fl = pl.data.personas.find((p) => p.uid === U.luis);
esperar("la plantilla en vivo trae la prueba del último fichaje", fl && fl.ultimo && fl.ultimo.pos && fl.ultimo.pos.alerta, JSON.stringify(fl && fl.ultimo));

console.log("\n7) WiFi del taller (prueba extra)");
x = await llamar("POST", "/api/jornada/nave", G, { accion: "red" }, "10.9.9.9");
esperar("el gerente guarda la WiFi del taller (su conexión actual)", x.status === 200 && x.data.nave.redes === 1, est(x));
x = await llamar("POST", "/api/jornada/fichar", T.ana, { accion: "pausa", pos: aqui(0.0004, 18) }, "10.9.9.9");
dia = await llamar("GET", `/api/jornada/dia?uid=${U.ana}&fecha=${hoy}`, G); ev = dia.data.dia.eventos.at(-1);
esperar("fichar desde esa WiFi → «WiFi del taller»", x.status === 200 && ev.pos.red === true, est(x));
x = await llamar("POST", "/api/jornada/fichar", T.ana, { accion: "reanudar", pos: aqui(0.0005, 18) }, "10.7.7.7");
dia = await llamar("GET", `/api/jornada/dia?uid=${U.ana}&fecha=${hoy}`, G); ev = dia.data.dia.eventos.at(-1);
esperar("con datos móviles también vale (GPS en la nave), sin la marca de WiFi", x.status === 200 && ev.pos.red === false, est(x));

console.log("\n8) Lo que ve el gerente");
r = await llamar("GET", "/api/jornada/nave", G);
esperar("lista los intentos rechazados", r.data.rechazos.length >= 9 && r.data.rechazos.some((z) => z.codigo === "fuera" && z.d >= 500) && r.data.rechazos.some((z) => z.codigo === "imprecisa"), JSON.stringify(r.data.rechazos.slice(0, 2)));
esperar("   …con nombre de quién lo intentó", r.data.rechazos.every((z) => z.nombre === "Pedro"));
esperar("no enseña las huellas de las WiFi (solo cuántas hay)", r.data.nave.redes === 1 && !JSON.stringify(r.data).includes('"h"'));
const ac = await llamar("GET", "/api/jornada/acceso", G);
esperar("«Accesos raros» incluye los fichajes fuera de la nave", ac.data.raros.some((z) => z.tipo === "fichaje-fuera"), JSON.stringify(ac.data.raros.slice(0, 1)));
let lb = await llamar("GET", "/api/jornada/libro", G);
esperar("el libro encadenado sigue íntegro", lb.data.integro === true, JSON.stringify(lb.data.rotas));
esperar("   …y anota los rechazos, los fichajes con prueba y los cambios de la nave", ["fichaje-rechazado", "fichaje", "nave-fijada", "nave-red-anadida"].every((a) => lb.data.entradas.some((e) => e.accion === a)));
r = await llamar("GET", "/api/jornada/nave", T.pedro);
esperar("un mecánico no puede ver la configuración de la nave (403)", r.status === 403, est(r));

console.log("\n8b) «Comprobar dónde estoy» (diagnóstico del gerente, sin fichar)");
r = await llamar("POST", "/api/jornada/nave", G, { accion: "probar", pos: aqui(0.0001, 10) });
esperar("dentro: dice DENTRO y la distancia", r.status === 200 && r.data.dentro === true && /DENTRO/.test(r.data.texto), est(r) + " " + (r.data && r.data.texto));
r = await llamar("POST", "/api/jornada/nave", G, { accion: "probar", pos: aqui(0.0045, 10) });
esperar("a ~547 m: dice FUERA", r.status === 200 && r.data.dentro === false && /FUERA/.test(r.data.texto), r.data && r.data.texto);
r = await llamar("POST", "/api/jornada/nave", G, { accion: "probar", pos: aqui(0, 70) });
esperar("±70 m de error: dice GPS impreciso", r.status === 200 && r.data.dentro === false && /impreciso/.test(r.data.texto), r.data && r.data.texto);
r = await llamar("POST", "/api/jornada/nave", G, { accion: "probar" });
esperar("sin ubicación: lo explica", r.status === 200 && r.data.dentro === false && /No he recibido/.test(r.data.texto), r.data && r.data.texto);
r = await llamar("POST", "/api/jornada/nave", T.pedro, { accion: "probar", pos: aqui() });
esperar("un mecánico NO puede usar el diagnóstico (403)", r.status === 403, est(r));
lb = await llamar("GET", "/api/jornada/libro", G);
esperar("el diagnóstico no anota nada en el libro", !lb.data.entradas.some((e) => e.accion === "nave-probar"), "");
console.log("\n9) Desactivar y volver a activar");
r = await llamar("POST", "/api/jornada/nave", G, { accion: "activar", si: false });
esperar("el gerente desactiva", r.status === 200 && r.data.nave.activa === false, est(r));
x = await llamar("POST", "/api/jornada/fichar", T.pedro, { accion: "reanudar" });
esperar("desactivada: se puede fichar sin ubicación (como antes)", x.status === 200, est(x));
r = await llamar("POST", "/api/jornada/nave", G, { accion: "activar", si: true });
x = await llamar("POST", "/api/jornada/fichar", T.pedro, { accion: "pausa" });
esperar("activada otra vez: vuelve a exigir ubicación (403)", x.status === 403 && x.data.codigo === "sin-ubicacion", est(x));
lb = await llamar("GET", "/api/jornada/libro", G);
esperar("quedó anotado quién la desactivó y cuándo", lb.data.entradas.some((e) => e.accion === "nave-desactivada" && e.nombre === "Gerente"), "");
x = await llamar("POST", "/api/jornada/corregir", G, { uid: U.ana, fecha: new Date(Date.now() - 864e5).toISOString().slice(0, 10), tipo: "entrada", hora: "08:00", motivo: "Olvidó fichar la entrada (prueba)" });
esperar("el gerente puede seguir corrigiendo a mano (con motivo)", x.status === 200, est(x));

console.log(`\nRESULTADO: ${ok} correctas · ${mal} fallidas`);
if (mal) { console.log(fallos.join("\n")); process.exit(1); }
