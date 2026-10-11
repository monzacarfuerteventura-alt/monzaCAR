import assert from "node:assert/strict";
import { erp, store, __reset } from "./arnes/arrancar.mts";
process.env.HOY_PRUEBA = "2026-10-10";
let n = 0;
const call = async (m: string, path: string, body?: any, who = "admin") => {
  const r = await erp(new Request("https://x.test" + path, { method: m, headers: { authorization: "Bearer " + who, "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined }));
  return { s: r.status, j: await r.json() as any };
};
const ok = (c: any, m = "") => { n++; assert.ok(c, m); }; const eq = (a: any, b: any, m = "") => { n++; assert.deepEqual(a, b, m); };

__reset();
// permisos
eq((await call("GET", "/api/erp/compras", undefined, "nadie")).s, 401);
eq((await call("GET", "/api/erp/compras", undefined, "equipo")).s, 403);
eq((await call("GET", "/api/erp/nada")).s, 404);

// proveedores
let r = await call("POST", "/api/erp/proveedor", { nombre: "A" }); eq(r.s, 400);
r = await call("POST", "/api/erp/proveedor", { nombre: "Recambios Sur", plazoDias: 30, email: "mal" }); eq(r.s, 400);
r = await call("POST", "/api/erp/proveedor", { nombre: "Recambios Sur", plazoDias: 30, nif: "b123" }); eq(r.s, 201); const prov = r.j.proveedor; eq(prov.nif, "B123");
eq((await call("POST", "/api/erp/proveedor", { nombre: "recambios sur" })).s, 409);
r = await call("POST", "/api/erp/proveedor/" + prov.id, { nombre: "Recambios Sur SL", plazoDias: 45 }); eq(r.s, 200); eq(r.j.proveedor.plazoDias, 45);
eq((await call("POST", "/api/erp/proveedor/zzzzzzzzzzzz", { nombre: "X Y" })).s, 404);

// pedido
const lin = [{ ref: "P1", desc: "Pastillas delanteras", pieza: "abcdef123456", n: 4, precio: 1500 }, { desc: "Aceite 5W30 (5 L)", n: 10, precio: 2500 }];
eq((await call("POST", "/api/erp/pedido", { proveedor: "x", lineas: lin })).s, 400);
eq((await call("POST", "/api/erp/pedido", { proveedor: prov.id, lineas: [] })).s, 400);
eq((await call("POST", "/api/erp/pedido", { proveedor: prov.id, lineas: [{ desc: "a", n: 1, precio: 1 }] })).s, 400, "descripción corta");
eq((await call("POST", "/api/erp/pedido", { proveedor: prov.id, lineas: [{ desc: "Aceite", n: 0, precio: 1 }] })).s, 400);
eq((await call("POST", "/api/erp/pedido", { proveedor: prov.id, lineas: [{ desc: "Aceite", n: 1, precio: -5 }] })).s, 400);
r = await call("POST", "/api/erp/pedido", { proveedor: prov.id, lineas: lin, fecha: "2026-10-09" }); eq(r.s, 201); const ped = r.j.pedido; eq(ped.num, "PC-2026-0001"); eq(ped.estado, "borrador");
r = await call("POST", "/api/erp/pedido", { proveedor: prov.id, lineas: lin }); eq(r.j.pedido.num, "PC-2026-0002");
// recibir un borrador no se puede
eq((await call("POST", "/api/erp/albaran", { pedido: ped.id, numProv: "A1", lineas: [{ i: 0, n: 1 }] })).s, 409);
eq((await call("POST", "/api/erp/pedido-estado/" + ped.id, { estado: "enviado" })).s, 200);
eq((await call("POST", "/api/erp/pedido-estado/" + ped.id, { estado: "enviado" })).s, 409);
eq((await call("POST", "/api/erp/pedido/" + ped.id, { proveedor: prov.id, lineas: lin })).s, 409, "ya enviado no se edita");
// recepción parcial
r = await call("POST", "/api/erp/albaran", { pedido: ped.id, numProv: "ALB-77", fecha: "2026-10-10", lineas: [{ i: 0, n: 3 }, { i: 1, n: 0 }] }); eq(r.s, 201); eq(r.j.pedido.estado, "parcial"); eq(r.j.albaran.importe, 4500); eq(r.j.albaran.stock.estado, "pendiente");
const alb1 = r.j.albaran;
eq((await call("POST", "/api/erp/albaran", { pedido: ped.id, numProv: "ALB-77", fecha: "2026-10-10", lineas: [{ i: 0, n: 3 }] })).s, 400, "más de lo pendiente (1)");
r = await call("POST", "/api/erp/albaran", { pedido: ped.id, numProv: "ALB-78", fecha: "2026-10-10", lineas: [{ i: 0, n: 1 }, { i: 1, n: 10 }] }); eq(r.s, 201); eq(r.j.pedido.estado, "recibido"); const alb2 = r.j.albaran; eq(alb2.stock.estado, "pendiente");
eq((await call("POST", "/api/erp/albaran", { pedido: ped.id, numProv: "ALB-79", lineas: [{ i: 0, n: 1 }] })).s, 409, "cerrado");
eq((await call("POST", "/api/erp/albaran-stock/" + alb1.id, { ok: true })).j.albaran.stock.estado, "ok");
eq((await call("POST", "/api/erp/pedido-estado/" + ped.id, { estado: "cancelado" })).s, 409);

// factura de proveedor
const fac = { proveedor: prov.id, num: "FR-001", fecha: "2026-10-10", base: 29500, igicPct: 7, concepto: "Pastillas y aceite", albaranes: [alb1.id, alb2.id], pedido: ped.id };
eq((await call("POST", "/api/erp/factura", { ...fac, base: 0 })).s, 400);
eq((await call("POST", "/api/erp/factura", { ...fac, fecha: "2027-01-01" })).s, 400);
eq((await call("POST", "/api/erp/factura", { ...fac, concepto: "x" })).s, 400);
r = await call("POST", "/api/erp/factura", fac); eq(r.s, 201); const fa = r.j.factura; eq(fa.igic, 2065); eq(fa.total, 31565); eq(fa.vence, "2026-11-24"); eq(fa.estado, "pendiente");
eq((await call("POST", "/api/erp/factura", fac)).s, 409, "duplicada");
eq((await call("POST", "/api/erp/factura", { ...fac, num: "FR-002" })).s, 409, "albaranes ya facturados");
eq((await call("POST", "/api/erp/proveedor-baja/" + prov.id, { activo: false })).s, 409, "con factura pendiente");
// pago: el gasto debe existir en Finanzas
eq((await call("POST", "/api/erp/factura-pagar/" + fa.id, { gastoId: "inexistente1", metodo: "transferencia" })).s, 404);
await store("finanzas").setJSON("gasto/g100", { id: "g100", total: 31565, fecha: "2026-10-10", metodo: "transferencia", anulado: null });
await store("finanzas").setJSON("gasto/g101", { id: "g101", total: 100, fecha: "2026-10-10", metodo: "tarjeta", anulado: null });
await store("finanzas").setJSON("gasto/g102", { id: "g102", total: 31565, fecha: "2026-10-10", metodo: "tarjeta", anulado: { t: "x", motivo: "y" } });
eq((await call("POST", "/api/erp/factura-pagar/" + fa.id, { gastoId: "g101" })).s, 409, "importe distinto");
eq((await call("POST", "/api/erp/factura-pagar/" + fa.id, { gastoId: "g102" })).s, 404, "gasto anulado");
r = await call("POST", "/api/erp/factura-pagar/" + fa.id, { gastoId: "g100", metodo: "transferencia", fecha: "2026-10-10" }); eq(r.s, 200); eq(r.j.factura.estado, "pagada");
eq((await call("POST", "/api/erp/factura-pagar/" + fa.id, { gastoId: "g100" })).s, 409);
eq((await call("POST", "/api/erp/factura-anular/" + fa.id, { motivo: "me equivoqué" })).s, 409, "pagada");
// otra factura: anular
r = await call("POST", "/api/erp/factura", { proveedor: prov.id, num: "FR-050", fecha: "2026-10-01", base: 1000, igicPct: 7, concepto: "Prueba anulación" }); const fb = r.j.factura;
eq((await call("POST", "/api/erp/factura-anular/" + fb.id, { motivo: "x" })).s, 400);
eq((await call("POST", "/api/erp/factura-anular/" + fb.id, { motivo: "Factura duplicada del proveedor" })).s, 200);
eq((await call("POST", "/api/erp/factura", { proveedor: prov.id, num: "FR-050", fecha: "2026-10-01", base: 1000, igicPct: 7, concepto: "Se puede repetir tras anular" })).s, 201);
let c = (await call("GET", "/api/erp/compras")).j; eq(c.facturas.length, 3); eq(c.albaranes.find((a: any) => a.id === alb1.id).facturaId, fa.id);

// banco
const movs = [{ fecha: "2026-10-01", concepto: "COBRO F-2026-0001", importe: 10700, saldo: 150000 }, { fecha: "2026-10-02", concepto: "PAGO RECAMBIOS", importe: -31565 }, { fecha: "2026-10-02", concepto: "PAGO RECAMBIOS", importe: -31565 }];
eq((await call("POST", "/api/erp/banco-importar", { movs: [] })).s, 400);
eq((await call("POST", "/api/erp/banco-importar", { movs: [{ fecha: "2026-13-01", importe: 5, concepto: "x" }] })).s, 400);
eq((await call("POST", "/api/erp/banco-importar", { movs: [{ fecha: "2026-10-01", importe: 0, concepto: "x" }] })).s, 400);
r = await call("POST", "/api/erp/banco-importar", { movs, archivo: "oct.csv" }); eq(r.s, 201); eq(r.j.nuevos, 3, "dos líneas idénticas en el mismo extracto son dos movimientos"); eq(r.j.duplicados, 0);
r = await call("POST", "/api/erp/banco-importar", { movs, archivo: "oct.csv" }); eq(r.j.nuevos, 0); eq(r.j.duplicados, 3, "reimportar no duplica");
r = await call("POST", "/api/erp/banco-importar", { movs: [...movs, { fecha: "2026-10-03", concepto: "NUEVO", importe: -500 }] }); eq(r.j.nuevos, 1); eq(r.j.duplicados, 3);
let bm = (await call("GET", "/api/erp/banco?desde=2026-10-01&hasta=2026-10-31")).j; eq(bm.total, 4);
const mCobro = bm.movimientos.find((m: any) => m.importe === 10700), mPago = bm.movimientos.filter((m: any) => m.importe === -31565);
eq((await call("POST", "/api/erp/banco-conciliar/" + mCobro.id, { tipo: "gasto", ref: "g100" })).s, 400, "entrada no puede ser pago");
eq((await call("POST", "/api/erp/banco-conciliar/" + mPago[0].id, { tipo: "cobro", ref: "c1" })).s, 400);
eq((await call("POST", "/api/erp/banco-conciliar/" + mCobro.id, { tipo: "cobro", ref: "" })).s, 400);
eq((await call("POST", "/api/erp/banco-conciliar/" + mCobro.id, { tipo: "cobro", ref: "c1" })).s, 200);
eq((await call("POST", "/api/erp/banco-conciliar/" + mCobro.id, { tipo: "cobro", ref: "c2" })).s, 409, "ya conciliado");
eq((await call("POST", "/api/erp/banco-conciliar/" + mPago[0].id, { tipo: "gasto", ref: "g100" })).s, 200);
eq((await call("POST", "/api/erp/banco-conciliar/" + mPago[1].id, { tipo: "gasto", ref: "g100" })).s, 409, "un apunte no cuadra con dos movimientos");
eq((await call("POST", "/api/erp/banco-conciliar/" + mPago[1].id, { tipo: "otro", nota: "" })).s, 400);
eq((await call("POST", "/api/erp/banco-conciliar/" + mPago[1].id, { tipo: "otro", nota: "Duplicado del banco" })).s, 200);
eq((await call("POST", "/api/erp/banco-desconciliar/" + mPago[1].id)).s, 200);
eq((await call("POST", "/api/erp/banco-desconciliar/" + mPago[1].id)).s, 404);
eq((await call("POST", "/api/erp/banco-conciliar/zzzz", { tipo: "otro", nota: "abc" })).s, 404);

// incentivos
r = await call("GET", "/api/erp/incentivos"); eq(r.j.cfg.activo, false); eq(r.j.maxPct, 15);
eq((await call("POST", "/api/erp/incentivo-liquidar", { periodo: "2026-10", beneficio: 200000, fijos: 150000, pct: 10, filas: [{ nombre: "Ana", importe: 1000 }] })).s, 409, "desactivado");
r = await call("POST", "/api/erp/incentivo-cfg", { activo: true, pct: 99, topePersona: 12000, penalRetrabajo: 15 }); eq(r.j.cfg.pct, 15, "tope duro");
await call("POST", "/api/erp/incentivo-cfg", { activo: true, pct: 10, topePersona: 12000, penalRetrabajo: 15 });
const liq = (o: any) => call("POST", "/api/erp/incentivo-liquidar", { periodo: "2026-10", desde: "2026-10-01", hasta: "2026-10-31", beneficio: 200000, fijos: 150000, pct: 10, filas: [{ nombre: "Ana", minutos: 120, retrabajos: 0, importe: 3000 }, { nombre: "Luis", minutos: 60, retrabajos: 0, importe: 2000 }], ...o });
eq((await liq({ periodo: "2026-1" })).s, 400);
eq((await liq({ pct: 12 })).s, 409, "% por encima del ajuste");
eq((await liq({ filas: [{ nombre: "Ana", importe: 3000 }, { nombre: "Luis", importe: 2001 }] })).s, 409, "suma > 10 % del excedente (5000)");
eq((await liq({ filas: [{ nombre: "Gerente", importe: 100 }] })).s, 400);
eq((await liq({ fijos: 200000, filas: [{ nombre: "Ana", importe: 1 }] })).s, 409, "fijos sin cubrir");
eq((await liq({ filas: [{ nombre: "Ana", importe: 13000 }], beneficio: 9e8, fijos: 0 })).s, 409, "tope por persona");
eq((await liq({})).s, 201);
eq((await liq({})).s, 409, "mes ya liquidado");
eq((await call("POST", "/api/erp/incentivo-pagado/2026-10", { fecha: "2026-10-31" })).j.periodo.estado, "pagado");
eq((await call("POST", "/api/erp/incentivo-pagado/2026-10", {})).s, 409);

// clientes y coche
eq((await call("POST", "/api/erp/vehiculo-datos/12", { itvVence: "2027-01-01" })).s, 400);
eq((await call("POST", "/api/erp/vehiculo-datos/1234-abc", { itvVence: "2027-02-30" })).s, 400);
r = await call("POST", "/api/erp/vehiculo-datos/1234-abc", { itvVence: "2027-01-31", aceiteKm: 98000, kmActual: "99.000x" }); eq(r.s, 200); eq(r.j.vehiculo.matricula, "1234ABC"); eq(r.j.vehiculo.kmActual, 0, "km no numérico → 0 (se ignora)");
eq((await call("POST", "/api/erp/vehiculo-datos/1234ABC", { otros: [{ txt: "Correa", vence: "" }] })).s, 400, "aviso personalizado sin fecha");
r = await call("POST", "/api/erp/vehiculo-datos/1234ABC", { otros: [{ txt: "Cambio de correa", vence: "2026-11-01" }, { txt: "", vence: "" }] }); eq(r.s, 200); eq(r.j.vehiculo.otros, [{ txt: "Cambio de correa", vence: "2026-11-01" }]);
eq((await call("POST", "/api/erp/aviso", { clave: "m1234ABC", tipo: "itv", cliente: "Juan" })).s, 201);
eq((await call("POST", "/api/erp/aviso", { clave: "", tipo: "itv" })).s, 400);
c = (await call("GET", "/api/erp/clientes")).j; ok(c.vehiculos["1234ABC"]); eq(c.avisos.length, 1);
eq((await call("GET", "/api/erp/coche-doc/NO")).s, 400);
r = await call("POST", "/api/erp/coche-doc/abc123", { comprador: { nombre: "Pepe", nif: "12345678z" }, precio: 650000, garantiaMeses: 3, checklist: { dgt: true, "mal clave": true } });
eq(r.j.doc.garantiaMeses, 12, "garantía mínima legal 12 meses"); eq(r.j.doc.comprador.nif, "12345678Z"); eq(Object.keys(r.j.doc.checklist), ["dgt"]);
eq((await call("GET", "/api/erp/coche-doc/abc123")).j.doc.precio, 650000);

// consentimientos: la recepción cerrada MÁS RECIENTE de cada matrícula manda; las bajas se leen del registro del taller
const tall = store("taller");
await tall.setJSON("f/a1", { token: "a1", f1: { cerrada: true, firmadoCliente: "2026-01-01T10:00:00Z", fecha: "2026-01-01", avisosITV: true, avisosITVFecha: "2026-01-01T10:00:00Z", vehiculo: { matricula: "1234 abc", itv: "2026-06-01" }, cliente: { telefono: "+34 643 56 60 98" } } });
await tall.setJSON("f/a2", { token: "a2", f1: { cerrada: true, firmadoCliente: "2026-08-01T10:00:00Z", fecha: "2026-08-01", avisosITV: false, vehiculo: { matricula: "1234ABC", itv: "2027-06-01" }, cliente: { telefono: "643566098" } } });
await tall.setJSON("f/a3", { token: "a3", f1: { cerrada: false, firmadoCliente: "2026-10-01T10:00:00Z", fecha: "2026-10-01", avisosITV: true, vehiculo: { matricula: "9999ZZZ", itv: "2027-01-01" }, cliente: { telefono: "600111222" } } });
await tall.setJSON("itv-avisos", { avisos: {}, bajas: { "34600111222": "2026-09-01T00:00:00Z" } });
r = await call("GET", "/api/erp/consentimientos"); eq(r.s, 200);
eq(r.j.porMatricula["1234ABC"].avisosITV, false, "manda la recepción más reciente (sin permiso)"); eq(r.j.porMatricula["1234ABC"].itv, "2027-06-01"); eq(r.j.porMatricula["1234ABC"].tel, "643566098");
ok(!r.j.porMatricula["9999ZZZ"], "una recepción sin cerrar no cuenta"); eq(r.j.bajas["600111222"], "2026-09-01T00:00:00Z", "baja por las 9 últimas cifras");
eq((await call("GET", "/api/erp/consentimientos", undefined, "equipo")).s, 403);
// ---------- permisos por rol y aprobaciones ----------
const rc = (m: string, p: string, b?: any) => call(m, p, b, "recepcion");
eq((await rc("GET", "/api/erp/clientes")).s, 200, "recepción ve Clientes por defecto");
eq((await rc("GET", "/api/erp/compras")).s, 403, "Compras cerrado al equipo por defecto");
eq((await rc("GET", "/api/erp/banco")).s, 403); eq((await rc("POST", "/api/erp/permisos", {})).s, 403); eq((await rc("GET", "/api/erp/conta-asientos")).s, 403);
r = await rc("GET", "/api/erp/mis-permisos"); eq(r.j.admin, false); eq(r.j.modulos.sort(), ["cli", "mcar"]);
eq((await call("GET", "/api/erp/mis-permisos")).j.modulos.includes("conta"), true);
eq((await call("GET", "/api/erp/mis-permisos", undefined, "mecanico")).j.modulos, []);
eq((await call("GET", "/api/erp/mis-permisos", undefined, "nadie")).s, 401);
r = await call("POST", "/api/erp/permisos", { roles: { compras: ["recepcion", "gerente", "invento"], cli: ["recepcion", "recepcion"], mcar: [], banco: ["recepcion"] }, pedidoMax: 20000 }); eq(r.s, 200);
eq(r.j.roles, { compras: ["recepcion"], cli: ["recepcion"], mcar: [] }, "solo roles y módulos válidos, sin repetidos"); eq(r.j.pedidoMax, 20000);
eq((await rc("GET", "/api/erp/coche-doc/abc123")).s, 403, "recepción ya no tiene documentos de coche");
eq((await rc("GET", "/api/erp/compras")).s, 200, "ahora recepción usa Compras");
eq((await rc("POST", "/api/erp/proveedor-baja/" + prov.id, { activo: false })).s, 403, "dar de baja es del gerente");
eq((await rc("POST", "/api/erp/factura-pagar/" + fa.id, { gastoId: "g100" })).s, 403, "pagar es del gerente");
eq((await rc("POST", "/api/erp/factura-anular/" + fa.id, { motivo: "no debería" })).s, 403);
eq((await rc("POST", "/api/erp/pedido-aprobar/" + ped.id)).s, 403, "aprobar es del gerente");
// un pedido pequeño de recepción se marca directamente; uno grande espera al gerente
const mk = async (n: number, precio: number) => (await rc("POST", "/api/erp/pedido", { proveedor: prov.id, lineas: [{ desc: "Pieza grande de prueba", n, precio }] })).j.pedido;
const peq = await mk(1, 5000); r = await rc("POST", "/api/erp/pedido-estado/" + peq.id, { estado: "enviado" }); eq(r.j.pedido.estado, "enviado"); ok(!r.j.pendienteAprobacion);
const gra = await mk(2, 15000); r = await rc("POST", "/api/erp/pedido-estado/" + gra.id, { estado: "enviado" }); eq(r.j.pedido.estado, "borrador"); eq(r.j.pendienteAprobacion, true); eq(r.j.pedido.aprobacion.estado, "pendiente"); eq(r.j.pedido.aprobacion.por, "Marta");
eq((await rc("POST", "/api/erp/albaran", { pedido: gra.id, numProv: "Z1", lineas: [{ i: 0, n: 1 }] })).s, 409, "no se recibe lo que aún no se ha aprobado");
eq((await call("POST", "/api/erp/pedido-rechazar/" + gra.id, { motivo: "no" })).s, 400);
r = await call("POST", "/api/erp/pedido-rechazar/" + gra.id, { motivo: "Pide primero otro presupuesto" }); eq(r.s, 200); eq(r.j.pedido.aprobacion.estado, "rechazado"); eq(r.j.pedido.estado, "borrador");
eq((await call("POST", "/api/erp/pedido-aprobar/" + gra.id)).s, 409, "ya no está esperando");
r = await rc("POST", "/api/erp/pedido-estado/" + gra.id, { estado: "enviado" }); eq(r.j.pendienteAprobacion, true, "vuelve a pedirla");
r = await call("POST", "/api/erp/pedido-aprobar/" + gra.id); eq(r.j.pedido.estado, "enviado"); eq(r.j.pedido.aprobacion.estado, "aprobado"); eq(r.j.pedido.aprobacion.decididoPor, "Gerente");
r = await call("POST", "/api/erp/pedido-estado/" + (await mk(2, 15000)).id, { estado: "enviado" }); eq(r.j.pedido.estado, "enviado", "el gerente no necesita aprobación");
await call("POST", "/api/erp/permisos", { roles: { compras: ["recepcion"], cli: ["recepcion"], mcar: ["recepcion"] }, pedidoMax: 0 });
r = await rc("POST", "/api/erp/pedido-estado/" + (await mk(5, 90000)).id, { estado: "enviado" }); eq(r.j.pedido.estado, "enviado", "umbral 0 = sin aprobaciones");
// ---------- contabilidad: asientos manuales ----------
const as = (b: any) => call("POST", "/api/erp/conta-asiento", { fecha: "2026-10-01", concepto: "Apertura del ejercicio", tipo: "apertura", lineas: [{ cuenta: "572", debe: 500000 }, { cuenta: "100", haber: 500000 }], ...b });
eq((await rc("POST", "/api/erp/conta-asiento", {})).s, 403);
eq((await as({ fecha: "2027-01-01" })).s, 400, "fecha futura"); eq((await as({ concepto: "abc" })).s, 400); eq((await as({ lineas: [{ cuenta: "572", debe: 100 }] })).s, 400, "menos de 2 apuntes");
eq((await as({ lineas: [{ cuenta: "999", debe: 100 }, { cuenta: "100", haber: 100 }] })).s, 400, "cuenta inexistente");
eq((await as({ lineas: [{ cuenta: "572", debe: 100, haber: 100 }, { cuenta: "100", haber: 0, debe: 0 }] })).s, 400, "debe y haber a la vez");
eq((await as({ lineas: [{ cuenta: "572", debe: 100 }, { cuenta: "100", haber: 99 }] })).s, 400, "no cuadra");
eq((await as({ lineas: [{ cuenta: "572", debe: -5 }, { cuenta: "100", haber: -5 }] })).s, 400, "negativos");
r = await as({}); eq(r.s, 201); eq(r.j.asiento.num, "M-2026-0001"); eq(r.j.asiento.total, 500000); const a1 = r.j.asiento;
r = await as({ tipo: "inventado", concepto: "Segundo asiento manual" }); eq(r.j.asiento.tipo, "manual"); eq(r.j.asiento.num, "M-2026-0002");
eq((await call("POST", "/api/erp/conta-anular/" + a1.id, { motivo: "x" })).s, 400); eq((await call("POST", "/api/erp/conta-anular/" + a1.id, { motivo: "Importe de apertura equivocado" })).s, 200); eq((await call("POST", "/api/erp/conta-anular/" + a1.id, { motivo: "Importe de apertura equivocado" })).s, 409);
r = await call("GET", "/api/erp/conta-asientos"); eq(r.j.asientos.length, 2); ok(r.j.asientos.find((x: any) => x.id === a1.id).anulado, "el anulado se conserva");
// el libro encadenado sigue íntegro y no se mezcla con Finanzas
const s = store("finanzas"); const log = (await s.list({ prefix: "log/" })).blobs.map((b: any) => b.key).sort();
ok(log.length >= 20, "libro con " + log.length + " apuntes");
let prev = "0".repeat(64); const { createHash } = await import("node:crypto");
for (const k of log) { const e: any = await s.get(k, { type: "json" }); const h = createHash("sha256").update(JSON.stringify({ ...e, hash: undefined })).digest("hex"); assert.equal(h, e.hash); assert.equal(e.prev, prev); prev = e.hash; }
n++;
console.log("OK servidor: " + n + " comprobaciones");
