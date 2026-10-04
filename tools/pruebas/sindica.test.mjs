// Pruebas de la multipublicación (no necesitan red ni Netlify):  node --test tools/pruebas/sindica.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { desdeCoche, huella, validarBase, normCombustible, normCambio, slugDe, consejos } from "../../netlify/lib/sindica/esquema.mts";
import { autoscout24, feedXmlGenerico, metaVehiculos, feedJson, envolverJson, envolverXml, metaCsv, META_COLUMNAS } from "../../netlify/lib/sindica/adaptadores.mts";
import { calcularOperaciones, anotar, esperaMs, esReintentable, conReintentos, ErrorCanal, MAX_INTENTOS, leerRetryAfter, circuitoNuevo, circuitoAbierto, pasarPorCircuito, CIRCUITO_FALLOS } from "../../netlify/lib/sindica/estado.mts";

const coche = (o = {}) => ({ id: "1a2b3c4d-0000-4000-8000-000000000001", marca: "Toyota", modelo: "C-HR", version: "1.8 Hybrid <Active>", anio: 2020, km: 54000,
  combustible: "Híbrido (gasolina)", cambio: "Automático", cv: 122, puertas: 5, color: "Gris", etiqueta: "ECO", precio: 17990,
  descripcion: "Coche revisado & garantizado. 12 meses de garantía.", equipamiento: ["Aire acondicionado", "Cámara trasera"], fotos: ["a.jpg", "b c.jpg"],
  estado: "disponible", creado: "2026-09-01T10:00:00Z", actualizado: "2026-09-02T10:00:00Z", ...o });
const V = (o) => desdeCoche(coche(o), "https://volcanocars.com");

test("esquema: mapeo y normalización", () => {
  const v = V();
  assert.equal(v.schema, "volcanocars.vehiculo.v1");
  assert.equal(v.combustible, "hibrido"); assert.equal(v.cambio, "automatico");
  assert.equal(v.potencia.kw, 90); assert.equal(v.precio.contado, 17990);
  assert.equal(v.url, "https://volcanocars.com/coche/toyota-c-hr-2020-1a2b3c4d");
  assert.equal(v.fotos[1].url, "https://volcanocars.com/api/fotos/b%20c.jpg");
  assert.equal(normCombustible("Diésel"), "diesel"); assert.equal(normCombustible("Híbrido enchufable"), "hibrido_enchufable");
  assert.equal(normCombustible("Eléctrico"), "electrico"); assert.equal(normCambio("Manual"), "manual");
  assert.equal(slugDe({ id: "abc", marca: "x", modelo: "y", anio: 1 }), "abc");
});
test("validación", () => {
  assert.deepEqual(validarBase(V()), []);
  assert.ok(validarBase(V({ fotos: [] })).includes("sin fotos"));
  assert.ok(validarBase(V({ precio: 5 })).some((x) => x.includes("precio")));
  assert.ok(validarBase(V({ anio: 1900 })).some((x) => x.includes("año")));
});
test("huella: estable ante la fecha, cambia con el precio o las fotos", () => {
  const h = huella(V());
  assert.equal(huella(V({ actualizado: "2030-01-01T00:00:00Z" })), h);
  assert.notEqual(huella(V({ precio: 17500 })), h);
  assert.notEqual(huella(V({ fotos: ["a.jpg"] })), h);
});
test("adaptador AutoScout24", () => {
  const p = autoscout24.transformar(V());
  assert.equal(p.externalReference, "1a2b3c4d-0000-4000-8000-000000000001");
  assert.equal(p.fuel, "HYBRID"); assert.equal(p.gearbox, "AUTOMATIC"); assert.equal(p.price.amount, 17990);
  assert.equal(p.images.length, 2); assert.equal(p.firstRegistration.year, 2020);
  assert.ok(autoscout24.validar(V({ descripcion: "x".repeat(4001) })).length > 0);
});
test("adaptador XML: escapa caracteres y es XML bien formado", () => {
  const x = envolverXml([feedXmlGenerico.transformar(V())], "2026-10-03T00:00:00Z");
  assert.ok(x.includes("1.8 Hybrid &lt;Active&gt;")); assert.ok(x.includes("garantizado") && x.includes("&amp;"));
  assert.ok(!/<Active>/.test(x));
});
test("adaptador Meta: columnas y comillas CSV", () => {
  const fila = metaVehiculos.transformar(V());
  assert.equal(fila.length, META_COLUMNAS.length);
  const c = metaCsv([fila]).split("\n");
  assert.equal(c[0].split(",").length, META_COLUMNAS.length);
  assert.ok(c[1].includes('"{""addr1""'));   // el JSON de dirección va entrecomillado y con comillas dobladas
});
test("diferencias: crear / sin cambios / actualizar / retirar", () => {
  const a = V(), b = V({ id: "1a2b3c4d-0000-4000-8000-000000000002", modelo: "Yaris" });
  let ops = calcularOperaciones([a, b], {});
  assert.deepEqual(ops.map((o) => o.tipo), ["crear", "crear"]);
  const reg = {}; for (const o of ops) reg[o.vehiculo.id] = anotar(undefined, o, { ok: true, externalListingId: "EXT-" + o.vehiculo.id.slice(-1) });
  assert.equal(calcularOperaciones([a, b], reg).length, 0);                                       // idempotente
  const a2 = V({ precio: 16990 });
  ops = calcularOperaciones([a2, b], reg); assert.deepEqual(ops.map((o) => o.tipo), ["actualizar"]);
  ops = calcularOperaciones([b], reg); assert.deepEqual(ops, [{ tipo: "retirar", idInterno: a.id, externalListingId: "EXT-1" }]); // vendido/borrado
  const sinA = anotar(reg[a.id], ops[0], { ok: true }); reg[a.id] = sinA;
  assert.equal(calcularOperaciones([b], reg).length, 0);                                           // ya retirado: nada más
  assert.deepEqual(calcularOperaciones([a, b], reg).map((o) => o.tipo), ["crear"]);                 // vuelve a la venta → se publica otra vez
});
test("coche que deja de ser válido NO se retira del portal", () => {
  const a = V(); const reg = { [a.id]: anotar(undefined, { tipo: "crear", vehiculo: a, huella: huella(a) }, { ok: true, externalListingId: "E1" }) };
  assert.equal(calcularOperaciones([], reg, new Date(), new Set([a.id])).length, 0);
  assert.equal(calcularOperaciones([], reg, new Date()).length, 1);
});
test("errores: 4xx se rechaza sin insistir; 5xx se reintenta con espera creciente; agotado → avisa una vez", () => {
  const a = V(), op = { tipo: "crear", vehiculo: a, huella: huella(a) }, t0 = new Date("2026-10-03T10:00:00Z");
  const rej = anotar(undefined, op, { ok: false, error: "422 precio", status: 422 }, t0);
  assert.equal(rej.estado, "rechazado"); assert.equal(calcularOperaciones([a], { [a.id]: rej }, t0).length, 0);
  assert.equal(calcularOperaciones([V({ precio: 17000 })], { [a.id]: rej }, t0).length, 1);       // al corregir el coche, se reintenta
  let r; const azar = () => 1; let prev = 0;
  for (let i = 1; i <= MAX_INTENTOS; i++) {
    r = anotar(r, op, { ok: false, error: "503", status: 503 }, t0, azar);
    if (i < MAX_INTENTOS) { const esp = Date.parse(r.proximoIntento) - t0.getTime(); assert.ok(esp >= prev); prev = esp; }
  }
  assert.equal(r.intentos, MAX_INTENTOS); assert.equal(r.proximoIntento, null);
  assert.equal(calcularOperaciones([a], { [a.id]: r }, new Date(t0.getTime() + 864e5)).length, 0);   // agotado: no insiste
  const ok = anotar(r, op, { ok: true, externalListingId: "X" }, t0); assert.equal(ok.intentos, 0); assert.equal(ok.estado, "publicado");
  const espera = anotar(undefined, op, { ok: false, error: "503", status: 503 }, t0, azar);
  assert.equal(calcularOperaciones([a], { [a.id]: espera }, t0).length, 0);                           // en espera de reintento
  assert.equal(calcularOperaciones([a], { [a.id]: espera }, new Date(t0.getTime() + 7200_000)).length, 1);
});
test("espera exponencial con tope y reintentabilidad", () => {
  assert.equal(esperaMs(1, () => 1), 60_000); assert.equal(esperaMs(3, () => 1), 240_000); assert.equal(esperaMs(20, () => 1), 6 * 3600_000);
  assert.equal(esperaMs(5, () => 0), 0);
  assert.ok(esReintentable(null) && esReintentable(429) && esReintentable(503)); assert.ok(!esReintentable(400) && !esReintentable(422) && !esReintentable(404));
});
test("conReintentos: reintenta fallos momentáneos y no los de datos", async () => {
  let n = 0; const sin = async () => {};
  assert.equal(await conReintentos(async () => { if (++n < 3) throw new ErrorCanal("x", 503); return "ok"; }, 3, sin), "ok"); assert.equal(n, 3);
  n = 0; await assert.rejects(conReintentos(async () => { n++; throw new ErrorCanal("mal", 422); }, 3, sin)); assert.equal(n, 1);
  n = 0; await assert.rejects(conReintentos(async () => { n++; throw new ErrorCanal("red", null); }, 3, sin)); assert.equal(n, 3);
});

test("precio con céntimos se respeta (2.999,99 € no pasa a 3.000)", () => {
  assert.equal(V({ precio: 2999.99 }).precio.contado, 2999.99);
  assert.equal(autoscout24.transformar(V({ precio: 2999.99 })).price.amount, 2999.99);
  assert.ok(Math.abs(V({ precio: 2999.99 }).precio.contado - 2999.99) < 1e-9);
});
test("coches con id no UUID (como opel-astra-2010) mantienen su id como slug", () => {
  const v = V({ id: "opel-astra-2010", marca: "Opel", modelo: "Astra" });
  assert.equal(v.slug, "opel-astra-2010"); assert.equal(v.url, "https://volcanocars.com/coche/opel-astra-2010");
});
test("Retry-After: segundos, fecha y basura", () => {
  assert.equal(leerRetryAfter("120"), 120_000);
  assert.equal(leerRetryAfter(new Date(Date.now() + 90_000).toUTCString()) > 80_000, true);
  assert.equal(leerRetryAfter("mañana"), null); assert.equal(leerRetryAfter(""), null); assert.equal(leerRetryAfter("0"), null);
  assert.equal(leerRetryAfter("999999999"), 24 * 3600_000);
});
test("anotar respeta Retry-After si es mayor que la espera calculada", () => {
  const a = V(), op = { tipo: "crear", vehiculo: a, huella: huella(a) }, t0 = new Date("2026-10-03T10:00:00Z");
  const r = anotar(undefined, op, { ok: false, error: "429", status: 429, esperaMs: 3600_000 }, t0, () => 0);
  assert.ok(Date.parse(r.proximoIntento) - t0.getTime() >= 3600_000);
});
test("circuito: se abre tras N fallos seguidos, avisa una vez, y se cierra con un éxito", () => {
  let c = circuitoNuevo(), avisos = 0; const t0 = new Date("2026-10-03T10:00:00Z");
  for (let i = 0; i < CIRCUITO_FALLOS; i++) { const r = pasarPorCircuito(c, "fallo", t0); c = r.c; if (r.avisar) avisos++; }
  assert.equal(avisos, 1); assert.ok(circuitoAbierto(c, t0)); assert.ok(!circuitoAbierto(c, new Date(t0.getTime() + 31 * 60_000)));
  for (let i = 0; i < CIRCUITO_FALLOS; i++) { const r = pasarPorCircuito(c, "fallo", new Date(t0.getTime() + 40 * 60_000)); c = r.c; if (r.avisar) avisos++; }
  assert.equal(avisos, 1, "sigue la misma caída: no vuelve a avisar");
  c = pasarPorCircuito(c, "ok", t0).c; assert.equal(c.avisado, false);
  c = pasarPorCircuito(circuitoNuevo(), "datos", t0).c; assert.equal(c.seguidos, 0);   // un 4xx no cuenta como caída del portal
});
test("consejos para completar el anuncio", () => {
  const completo = V({ version: "1.8", equipamiento: ["a"], descripcion: "x".repeat(200), fotos: Array.from({ length: 9 }, (_, i) => i + ".jpg") });
  assert.deepEqual(consejos(completo), []);
  const pobre = consejos(V({ version: "", cv: null, etiqueta: "", equipamiento: [], descripcion: "corta", fotos: ["a.jpg"] }));
  assert.ok(pobre.some((x) => x.texto.includes("versión")) && pobre.some((x) => x.texto.includes("CV")) && pobre.some((x) => x.texto.includes("DGT")));
  assert.ok(pobre.some((x) => x.texto.includes("Solo 1 foto:")));
});
test("feed JSON usa el esquema completo", () => {
  const j = JSON.parse(envolverJson([feedJson.transformar(V())], "2026-10-03T00:00:00Z"));
  assert.equal(j.schema, "volcanocars.inventario.v1"); assert.equal(j.total, 1); assert.equal(j.vehiculos[0].schema, "volcanocars.vehiculo.v1");
});
