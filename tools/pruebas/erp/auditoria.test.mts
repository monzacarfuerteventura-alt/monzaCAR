// 100 AUDITORÍAS ALEATORIAS del ERP (lógica + servidor real). Cada vuelta usa una semilla distinta y comprueba invariantes.
import assert from "node:assert/strict";
import { erp, store, __reset } from "./arnes/arrancar.mts";
import { readFileSync } from "node:fs";
const E = (() => { const m: any = { exports: {} }; new Function("module", "exports", readFileSync(new URL("../../../public/erp-logic.js", import.meta.url), "utf8")).call(m.exports, m, m.exports); return m.exports; })();
process.env.HOY_PRUEBA = "2026-10-10";
const VUELTAS = Number(process.env.VUELTAS || 100); let n = 0, fallos = 0;
const mulberry = (a: number) => () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const call = async (m: string, path: string, body?: any) => { const r = await erp(new Request("https://x.test" + path, { method: m, headers: { authorization: "Bearer admin", "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined })); return { s: r.status, j: (await r.json()) as any }; };
const ok = (c: any, m: string) => { n++; if (!c) throw new Error(m); };
const eq = (a: any, b: any, m: string) => { n++; try { assert.deepEqual(a, b); } catch { throw new Error(m + " → " + JSON.stringify(a) + " ≠ " + JSON.stringify(b)); } };

async function vuelta(seed: number) {
  const R = mulberry(seed), ri = (a: number, b: number) => a + Math.floor(R() * (b - a + 1)), pick = <T,>(l: T[]) => l[ri(0, l.length - 1)];
  __reset();
  /* --- dinero: ida y vuelta --- */
  for (let i = 0; i < 40; i++) { const c = ri(-5_000_000, 5_000_000); eq(E.cent(E.numES(c)), c, "numES→cent " + c); eq(E.cent(E.eur(c)), c, "eur→cent " + c); }
  /* --- compras: proveedores, pedidos, recepciones parciales, facturas, pagos --- */
  const provs: any[] = [];
  for (let i = 0; i < ri(1, 3); i++) { const r = await call("POST", "/api/erp/proveedor", { nombre: "Prov " + seed + "-" + i, plazoDias: ri(0, 90) }); eq(r.s, 201, "alta proveedor"); provs.push(r.j.proveedor); }
  const facturas: any[] = [];
  for (const prov of provs) for (let k = 0; k < ri(1, 3); k++) {
    const lineas = Array.from({ length: ri(1, 5) }, (_, j) => ({ desc: "Pieza " + j + "x", n: ri(1, 20), precio: ri(1, 90000) }));
    const r = await call("POST", "/api/erp/pedido", { proveedor: prov.id, lineas }); eq(r.s, 201, "pedido"); const ped = r.j.pedido;
    eq((await call("POST", "/api/erp/pedido-estado/" + ped.id, { estado: "enviado" })).s, 200, "enviar");
    let rec = lineas.map(() => 0), cerrado = false, albs: string[] = [];
    for (let v = 0; v < 6 && !cerrado; v++) {
      const sel = lineas.map((l, i) => ({ i, n: Math.min(l.n - rec[i], ri(0, l.n)) })).filter((x) => x.n > 0);
      if (!sel.length) continue;
      const r2 = await call("POST", "/api/erp/albaran", { pedido: ped.id, numProv: `A${seed}-${k}-${v}`, lineas: sel }); eq(r2.s, 201, "albarán"); albs.push(r2.j.albaran.id);
      sel.forEach((x) => (rec[x.i] += x.n));
      const exp = rec.every((q, i) => q >= lineas[i].n) ? "recibido" : "parcial"; eq(r2.j.pedido.estado, exp, "estado del pedido tras recibir"); cerrado = exp === "recibido";
      eq(r2.j.albaran.importe, sel.reduce((a, x) => a + Math.round(x.n * lineas[x.i].precio), 0), "importe del albarán");
      // pedir de más tiene que fallar
      if (!cerrado) { const i = ri(0, lineas.length - 1), pend = lineas[i].n - rec[i]; if (pend >= 0) eq((await call("POST", "/api/erp/albaran", { pedido: ped.id, numProv: "Z" + v, lineas: [{ i, n: pend + 1 }] })).s, 400, "más de lo pendiente"); }
    }
    if (!albs.length) continue;
    const base = ri(100, 900000), pct = pick([0, 3, 7, 9.5, 15, 21]), f = await call("POST", "/api/erp/factura", { proveedor: prov.id, num: `F${seed}-${k}`, fecha: "2026-10-0" + ri(1, 9), base, igicPct: pct, concepto: "Compra de recambios", albaranes: albs, pedido: ped.id });
    eq(f.s, 201, "factura"); eq(f.j.factura.igic, Math.round(base * pct / 100), "IGIC de la factura"); eq(f.j.factura.total, base + f.j.factura.igic, "total de la factura");
    eq((await call("POST", "/api/erp/factura", { proveedor: prov.id, num: `F${seed}-${k}`, fecha: "2026-10-05", base, igicPct: pct, concepto: "Compra de recambios repetida" })).s, 409, "factura repetida");
    facturas.push(f.j.factura);
  }
  // pagar la mitad
  const fin = store("finanzas"); let pagadas = 0;
  for (const [i, f] of facturas.entries()) if (i % 2 === 0) { await fin.setJSON("gasto/gg" + seed + i, { id: "gg" + seed + i, total: f.total, fecha: "2026-10-10", metodo: "transferencia", anulado: null }); eq((await call("POST", "/api/erp/factura-pagar/" + f.id, { gastoId: "gg" + seed + i, metodo: "transferencia" })).s, 200, "pagar"); pagadas++; eq((await call("POST", "/api/erp/factura-pagar/" + f.id, { gastoId: "gg" + seed + i })).s, 409, "no se paga dos veces"); }
  const C = (await call("GET", "/api/erp/compras")).j;
  eq(C.facturas.filter((x: any) => x.estado === "pagada").length, pagadas, "facturas pagadas");
  const deuda = E.deudaProveedores(C.facturas.map((x: any) => ({ ...x, proveedor: x.proveedor })), "2026-10-10");
  eq(deuda.reduce((a: number, x: any) => a + x.total, 0), C.facturas.filter((x: any) => x.estado === "pendiente").reduce((a: number, x: any) => a + x.total, 0), "deuda = suma de pendientes");
  for (const x of deuda) eq(x.vencida + x.proxima + x.alDia, x.total, "tramos de deuda");
  /* --- banco: CSV aleatorio → parse → importar → reimportar → conciliar 1 a 1 --- */
  const movs = Array.from({ length: ri(5, 60) }, () => ({ fecha: "2026-10-" + String(ri(1, 9)).padStart(2, "0"), concepto: pick(["TRANSFERENCIA", "PAGO RECIBO", "BIZUM", "COMISION; MANT", 'NOMINA "X"']) + " " + ri(1, 9), importe: (R() < 0.5 ? -1 : 1) * ri(1, 90000000) }));
  const fmt = (c: number) => E.numES(c).replace(/\B(?=(\d{3})+(?!\d),)/g, ".");
  const csv = "Fecha;Concepto;Importe\n" + movs.map((m) => `${m.fecha.slice(8)}/${m.fecha.slice(5, 7)}/${m.fecha.slice(0, 4)};${/[;"]/.test(m.concepto) ? '"' + m.concepto.replace(/"/g, '""') + '"' : m.concepto};${fmt(m.importe)}`).join("\n");
  const p = E.parseBancoCSV(csv); eq(p.errores.length, 0, "CSV sin errores"); eq(p.filas.map((x: any) => [x.fecha, x.concepto, x.importe]), movs.map((m) => [m.fecha, m.concepto, m.importe]), "CSV ida y vuelta");
  const im = await call("POST", "/api/erp/banco-importar", { movs: p.filas }); eq(im.s, 201, "importar"); eq(im.j.nuevos, movs.length, "todos nuevos");
  const im2 = await call("POST", "/api/erp/banco-importar", { movs: p.filas }); eq(im2.j.nuevos, 0, "reimportar no duplica"); eq(im2.j.duplicados, movs.length, "todos duplicados");
  const B = (await call("GET", "/api/erp/banco")).j.movimientos; eq(B.length, movs.length, "movimientos guardados");
  const cobros = B.filter((m: any) => m.importe > 0).map((m: any, i: number) => ({ id: "cb" + i, fecha: m.fecha, importe: m.importe, nombre: "", num: "" })).filter(() => R() < 0.7);
  const pagos = B.filter((m: any) => m.importe < 0).map((m: any, i: number) => ({ tipo: "gasto", id: "gs" + i, fecha: m.fecha, importe: -m.importe, nombre: "", num: "" })).filter(() => R() < 0.7);
  const sug = E.conciliar(B, cobros, pagos), usados = sug.filter((s: any) => s.candidato).map((s: any) => s.candidato.tipo + ":" + s.candidato.id);
  eq(usados.length, new Set(usados).size, "un apunte nunca cuadra con dos movimientos"); ok(sug.every((s: any) => !s.candidato || Math.abs(s.candidato.importe) === Math.abs(s.mov.importe)), "solo importes exactos");
  let conc = 0; for (const s of sug) if (s.candidato) { const r = await call("POST", "/api/erp/banco-conciliar/" + s.mov.id, { tipo: s.candidato.tipo, ref: s.candidato.id }); eq(r.s, 200, "conciliar"); conc++; }
  const B2 = (await call("GET", "/api/erp/banco")).j.movimientos; eq(B2.filter((m: any) => m.conciliado).length, conc, "conciliados");
  /* --- IGIC: invariantes --- */
  const em = Array.from({ length: ri(0, 25) }, (_, i) => { const base = ri(1, 800000), pct = pick([0, 3, 7, 9.5, 15]), cu = Math.round(base * pct / 100); return { fecha: "2026-10-" + String(ri(1, 28)).padStart(2, "0"), num: "E" + i, base, impuestoPct: pct, impuesto: cu, total: base + cu, tipo: "taller" }; });
  const re = Array.from({ length: ri(0, 25) }, (_, i) => { const base = ri(1, 800000), pct = pick([0, 3, 7, 9.5, 15]), cu = Math.round(base * pct / 100); return { fecha: "2026-10-" + String(ri(1, 28)).padStart(2, "0"), factura: "R" + i, base, impuestoPct: pct, impuesto: cu, total: base + cu }; });
  const pe = C.facturas.filter((x: any) => x.estado === "pendiente").map((x: any) => ({ ...x, proveedor: "p" }));
  const ig = E.igicResumen(em, re, pe, "2026-10-01", "2026-12-31");
  eq(ig.resultado, ig.repercutido - ig.soportado, "resultado IGIC"); eq(ig.emitidas.reduce((a: number, g: any) => a + g.cuota, 0), ig.repercutido, "Σ por tipo emitido"); eq(ig.recibidas.reduce((a: number, g: any) => a + g.cuota, 0), ig.soportado, "Σ por tipo recibido");
  eq(ig.repercutido, em.reduce((a, x) => a + x.impuesto, 0), "repercutido = Σ cuotas");
  eq(ig.soportado, re.reduce((a, x) => a + x.impuesto, 0) + pe.reduce((a: number, x: any) => a + x.igic, 0), "soportado incluye pendientes de pago");
  const csvE = E.aCSV(E.COLS_EMITIDAS, E.libroEmitidas(em, "2026-10-01", "2026-12-31")); eq(csvE.split("\r\n").length, em.length + 1, "filas del libro CSV");
  /* --- incentivos: la empresa nunca paga más de lo que sobra --- */
  await call("POST", "/api/erp/incentivo-cfg", { activo: true, pct: ri(0, 40), topePersona: ri(0, 50000), penalRetrabajo: ri(0, 50) });
  const cfg = (await call("GET", "/api/erp/incentivos")).j.cfg; ok(cfg.pct <= 15, "tope duro del %");
  const filas = Array.from({ length: ri(0, 12) }, (_, i) => ({ token: "t" + i, num: "N" + i, coche: "c", fecha: "2026-09-" + String(ri(1, 28)).padStart(2, "0"), facturada: R() < 0.9, pendiente: R() < 0.2 ? ri(1, 5000) : 0, avisos: R() < 0.1 ? ["No se fichó ningún tiempo (FORM-04)"] : [], beneficio: ri(-50000, 300000), trabajadores: ["Ana", "Luis", "Marta", "Gerente"].filter(() => R() < 0.7).map((nombre) => ({ nombre, minutos: ri(0, 600) })) }));
  const fijos = ri(0, 1500000), calc = E.calcularIncentivo({ filas, desde: "2026-09-01", hasta: "2026-09-30", fijos, cfg, retrabajos: { Ana: ri(0, 8) } });
  ok(calc.pagado <= calc.pool, "pagado ≤ bolsa"); ok(calc.pool <= Math.floor(Math.max(0, calc.beneficio - fijos) * 0.15) + 0, "bolsa ≤ 15 % del excedente"); ok(calc.filas.every((x: any) => x.importe >= 0 && x.importe <= cfg.topePersona), "tope por persona y nunca negativo"); ok(!calc.filas.some((x: any) => /^gerente$/i.test(x.nombre)), "el gerente no cobra");
  if (calc.beneficio <= fijos) eq(calc.pagado, 0, "sin excedente no hay incentivo"); ok(calc.empresaSeQueda >= calc.beneficio - calc.pagado - 1, "contabilidad del reparto");
  const lq = await call("POST", "/api/erp/incentivo-liquidar", { periodo: "2026-09", desde: "2026-09-01", hasta: "2026-09-30", beneficio: calc.beneficio, fijos, pct: calc.cfg.pct, filas: calc.filas.map((x: any) => ({ nombre: x.nombre, minutos: x.minutos, retrabajos: x.retrabajos, importe: x.importe })) });
  ok(lq.s === 201 || lq.s === 400 /* sin nadie que repartir */, "liquidar (" + lq.s + " " + JSON.stringify(lq.j) + ")");
  // el servidor frena cualquier intento de cobrar de más aunque el cliente lo pida
  const abuso = await call("POST", "/api/erp/incentivo-liquidar", { periodo: "2026-08", beneficio: 100000, fijos: 0, pct: 15, filas: [{ nombre: "Ana", importe: 15001 }] }); ok(abuso.s === 409 || abuso.s === 400, "el servidor bloquea el abuso (" + abuso.s + ")");
  // aunque alguien pida un 100 %, la lógica del cliente se queda en el 15 % del excedente
  const c2 = E.calcularIncentivo({ filas, desde: "2026-09-01", hasta: "2026-09-30", fijos, cfg: { activo: true, pct: ri(16, 100), topePersona: 1e12 } });
  ok(c2.cfg.pct === 15 && c2.pool <= Math.floor(Math.max(0, c2.beneficio - fijos) * 0.15) && c2.pagado <= c2.pool, "la lógica nunca supera el 15 % del excedente (pidió " + c2.cfg.pct + ")");
  /* --- contabilidad: con datos aleatorios, todo cuadra y cuadra con Gestoría --- */
  {
    const cats = Object.keys(E.CAT_CUENTA), ms = ["efectivo", "tarjeta", "transferencia", "domiciliacion"], f2 = () => "2026-" + String(ri(1, 12)).padStart(2, "0") + "-" + String(ri(1, 28)).padStart(2, "0");
    const emi = Array.from({ length: ri(0, 25) }, (_, i) => { const base = ri(-90000, 900000), pct = pick([0, 3, 7, 9.5, 15]), imp = Math.round(base * pct / 100); return { id: "e" + i, tipo: pick(["taller", "venta", "caja"]), fecha: f2(), num: "F" + i, cliente: "c", total: base + imp, impuesto: imp, base }; });
    const cob = Array.from({ length: ri(0, 25) }, (_, i) => ({ id: "c" + i, doc: "e0", fecha: f2(), metodo: pick(["efectivo", "tarjeta", "transferencia", "financiacion"]), importe: ri(-20000, 900000) }));
    const rec = Array.from({ length: ri(0, 25) }, (_, i) => { const base = ri(1, 500000), pct = pick([0, 7]), imp = Math.round(base * pct / 100), sc = R() < 0.15; return { id: "g" + i, origen: pick(["gasto", "caja"]), fecha: f2(), proveedor: "p", concepto: "x", categoria: sc ? "" : pick(cats), total: base + imp, impuesto: sc ? 0 : imp, metodo: pick(ms), sinClasificar: sc }; });
    const pen = Array.from({ length: ri(0, 6) }, (_, i) => { const base = ri(1, 300000), igic = Math.round(base * 0.07); return { id: "p" + i, fecha: f2(), num: "P" + i, proveedor: "p", categoria: pick(cats), total: base + igic, igic }; });
    const cch = Array.from({ length: ri(0, 5) }, (_, i) => ({ coche: "car" + i, nombre: "c", fecha: f2(), compra: ri(0, 1500000) }));
    const man = Array.from({ length: ri(0, 4) }, (_, i) => { const v = ri(1, 900000); return { id: "m" + i, num: "M" + i, fecha: f2(), concepto: "m", tipo: pick(["manual", "apertura"]), lineas: [{ cuenta: pick(["572", "570", "213"]), debe: v, haber: 0 }, { cuenta: pick(["100", "170", "520"]), debe: 0, haber: v }], total: v, anulado: R() < 0.3 ? { t: "x", motivo: "y" } : null }; });
    const auto = E.asientosAuto({ emitidas: emi, cobros: cob, recibidas: rec, pendProv: pen, coches: cch, hasta: "2026-12-31" }), L = E.libroDiario(auto, man);
    ok(L.every((a: any) => a.lineas.reduce((x: number, l: any) => x + l.debe, 0) === a.lineas.reduce((x: number, l: any) => x + l.haber, 0)), "contabilidad: todos los asientos cuadran");
    const ss = E.sumasSaldos(L); ok(ss.cuadra, "contabilidad: sumas y saldos cuadra");
    const b = E.balance(L); eq(b.descuadre, 0, "contabilidad: activo = pasivo + patrimonio + resultado"); eq(b.sinClasificar, [], "ninguna cuenta queda sin clasificar en el balance");
    const py = E.pyg(L); eq(py.resultado, py.ingresos - py.gastos, "contabilidad: resultado = ingresos − gastos"); eq(b.resultado, py.resultado, "contabilidad: el resultado del balance es el de la cuenta de PyG");
    const ventas = L.filter((a: any) => a.origen === "venta").reduce((s: number, a: any) => s + a.lineas.filter((l: any) => l.cuenta === "700" || l.cuenta === "705").reduce((x: number, l: any) => x + l.haber - l.debe, 0), 0);
    eq(ventas, emi.reduce((s: number, x: any) => s + x.total - x.impuesto, 0), "contabilidad: lo vendido = Σ (total − IGIC) de las facturas");
    eq(0 - E.mayor(L, "477").saldo, emi.reduce((s: number, x: any) => s + x.impuesto, 0), "contabilidad: el IGIC repercutido del mayor = el de las facturas (mismo número que en Gestoría)");
    eq(E.mayor(L, "472").saldo, rec.filter((g: any) => !g.sinClasificar).reduce((s: number, g: any) => s + g.impuesto, 0) + pen.reduce((s: number, p: any) => s + p.igic, 0), "contabilidad: el IGIC soportado del mayor = el de los gastos y facturas pendientes");
    eq(E.mayor(L, "430").saldo, emi.reduce((s: number, x: any) => s + x.total, 0) - cob.reduce((s: number, c: any) => s + c.importe, 0), "contabilidad: clientes = facturado − cobrado");
    const t1 = E.entre(L, "2026-01-01", "2026-06-30"), t2 = E.entre(L, "2026-07-01", "2026-12-31"); eq(t1.length + t2.length, L.length, "contabilidad: los dos semestres suman el año");
    // el número de asiento automático no depende de cuándo se mire
    const parcial = E.libroDiario(E.asientosAuto({ emitidas: emi, cobros: cob, recibidas: rec, pendProv: pen, coches: cch, hasta: "2026-06-30" }), []); const mismos = L.filter((a: any) => !a.manual && a.fecha <= "2026-06-30" && parcial.some((p: any) => p.ref === a.ref && p.origen === a.origen)); ok(mismos.every((a: any) => parcial.find((p: any) => p.ref === a.ref && p.origen === a.origen).num === a.num) || man.length > 0, "contabilidad: numeración estable");
  }
  /* --- avisos de clientes: coherencia --- */
  const dias = ri(-400, 400), venc = E.addDias("2026-10-10", dias), sv = E.serviciosVehiculo([], { itvVence: venc }, "2026-10-10", {}).find((s: any) => s.tipo === "itv");
  eq(sv.estado, dias < 0 ? "vencido" : dias <= 30 ? "proximo" : "ok", "estado de la ITV a " + dias + " días");
  /* --- libro encadenado íntegro --- */
  const { createHash } = await import("node:crypto"); const log = (await fin.list({ prefix: "log/" })).blobs.map((b: any) => b.key).sort(); let prev = "0".repeat(64);
  for (const k of log) { const e: any = await fin.get(k, { type: "json" }); eq(createHash("sha256").update(JSON.stringify({ ...e, hash: undefined })).digest("hex"), e.hash, "hash del libro"); eq(e.prev, prev, "encadenado"); prev = e.hash; }
}
const t0 = Date.now();
for (let i = 1; i <= VUELTAS; i++) { try { await vuelta(1000 + i); } catch (e: any) { fallos++; console.log(`✗ vuelta ${i}: ${e.message.slice(0, 300)}`); if (fallos >= 5) break; } }
console.log(fallos ? `FALLOS: ${fallos}` : `OK ${VUELTAS} auditorías · ${n} comprobaciones · ${Math.round((Date.now() - t0) / 1000)} s`);
process.exit(fallos ? 1 : 0);
