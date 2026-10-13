import type { Config } from "@netlify/functions";
import { createHash } from "node:crypto";
import { store, json, mismoOrigen } from "../lib/shared.mts";
import { hoyCanarias, tstore, type Quien } from "../lib/taller.mts";
import { permiso, esRespuesta } from "../lib/acceso.mts";
import { PLAN } from "../lib/plan-contable.mts";
import { anotarSeguro } from "../lib/libro.mts";

/*
  ERP · COMPRAS, BANCO, INCENTIVOS, CLIENTES Y DOCUMENTOS DE COCHE (Actualización 64) · SOLO EL GERENTE
  Los datos viven en el almacén «finanzas» bajo el prefijo «erp/» (así entran solos en la copia de seguridad diaria
  y NO chocan con nada de Finanzas, que solo lee gasto/, ingreso/, venta/, coste/, clasif/, cobro-taller/, log/…).
  Acceso: el gerente lo ve todo; el resto del equipo solo los módulos que el gerente les abre por ROL (compras, cli, mcar) y siempre con la jornada fichada, como el resto del panel.
  Importes siempre en céntimos enteros. Nada se borra: se da de baja o se anula con motivo, y todo queda en el libro encadenado de Finanzas.

  GET  /api/erp/compras                      proveedores, pedidos, albaranes y facturas de proveedor
  POST /api/erp/proveedor[/:id]              alta / edición · /proveedor-baja/:id
  POST /api/erp/pedido[/:id]                 pedido de compra (borrador) · /pedido-estado/:id {estado: enviado|cancelado}  («enviado» = ya pedido al proveedor)
  POST /api/erp/albaran                      recepción de mercancía (parcial o total) · /albaran-stock/:id (inventario ya actualizado)
  POST /api/erp/factura[/:id]                factura de proveedor (pendiente de pago) · /factura-pagar/:id {gastoId, metodo, fecha} · /factura-anular/:id
  GET  /api/erp/banco?desde&hasta            movimientos del banco · POST /banco-importar · /banco-conciliar/:id · /banco-desconciliar/:id
  GET  /api/erp/incentivos                   ajustes y periodos liquidados · POST /incentivo-cfg · /incentivo-liquidar · /incentivo-pagado/:periodo
  GET  /api/erp/consentimientos              permiso de avisos de ITV por matrícula y bajas (lo firmado en la recepción del taller)
  GET  /api/erp/clientes                     datos de vehículos y avisos hechos · POST /vehiculo-datos/:matricula · /aviso
  GET  /api/erp/coche-doc/:id                contrato, garantía y checklist de un coche · POST /coche-doc/:id
  GET  /api/erp/mis-permisos                 qué módulos puede usar quien pregunta (cualquier persona con sesión)
  GET/POST /api/erp/permisos                 qué roles usan cada módulo y umbral de aprobación de pedidos (solo gerente)
  POST /api/erp/pedido-aprobar/:id · /pedido-rechazar/:id   el gerente aprueba o rechaza un pedido grande de otra persona
  GET  /api/erp/conta-asientos · POST /conta-asiento · /conta-anular/:id   asientos manuales y de apertura (solo gerente)
*/

const f = () => store("finanzas");
const P = { perm: "erp/perm/", conta: "erp/conta/", prov: "erp/prov/", ped: "erp/ped/", alb: "erp/alb/", fprov: "erp/fprov/", banco: "erp/banco/", inc: "erp/inc/", veh: "erp/veh/", aviso: "erp/aviso/", coche: "erp/coche/", num: "erp/num/" };
const rid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const ahora = () => new Date().toISOString();
const str = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, n);
const int = (v: unknown, min: number, max: number, def = 0) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };
const fecha = (v: unknown) => { const t = String(v ?? ""); if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return ""; const d = new Date(t + "T12:00:00Z"); return Number.isFinite(d.getTime()) && d.toISOString().slice(0, 10) === t ? t : ""; };
const addDias = (d: string, n: number) => new Date(Date.parse(d + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const pct = (v: unknown) => { const n = Number(String(v ?? "0").replace(",", ".")); return Number.isFinite(n) ? Math.min(30, Math.max(0, Math.round(n * 100) / 100)) : 0; };
const esId = (v: unknown) => /^[a-z0-9]{12}$/.test(String(v || ""));
const lineasTotal = (ls: { n: number; precio: number }[]) => ls.reduce((a, l) => a + Math.round((Number(l.n) || 0) * (Number(l.precio) || 0)), 0);
const INC_MAX_PCT = 15; // tope duro del incentivo sobre el excedente (igual que en erp-logic.js)

async function lista<T>(prefix: string): Promise<T[]> {
  const { blobs } = await f().list({ prefix });
  return (await Promise.all(blobs.map((b) => f().get(b.key, { type: "json" }).catch(() => null)))).filter(Boolean) as T[];
}
const leer = <T,>(k: string) => f().get(k, { type: "json" }).catch(() => null) as Promise<T | null>;
async function libro(q: Quien, accion: string, datos: Record<string, unknown>) {
  await anotarSeguro(f(), (head: any) => ({ n: head.n + 1, t: ahora(), uid: q.uid, nombre: q.nombre, rol: q.rol, accion: "erp-" + accion, datos, prev: head.hash }));
}
// Numeración correlativa por tipo y año (PC-2026-0001). Se comprueba que no exista ya para no repetir nunca un número.
async function siguienteNum(tipo: string, prefijo: string, existentes: string[]): Promise<string> {
  const y = hoyCanarias().slice(0, 4), k = P.num + tipo + "-" + y;
  let n = ((await leer<{ n: number }>(k))?.n || 0) + 1;
  const usados = new Set(existentes);
  while (usados.has(`${prefijo}-${y}-${String(n).padStart(4, "0")}`)) n++;
  await f().setJSON(k, { n });
  return `${prefijo}-${y}-${String(n).padStart(4, "0")}`;
}

type Prov = { id: string; nombre: string; nif: string; telefono: string; email: string; direccion: string; plazoDias: number; notas: string; activo: boolean; t: string };
type Lin = { ref: string; desc: string; pieza: string; n: number; precio: number; recibido: number };
type Ped = { id: string; num: string; proveedor: string; fecha: string; estado: "borrador" | "enviado" | "parcial" | "recibido" | "cancelado"; lineas: Lin[]; notas: string; t: string; actualizado: string; aprobacion?: null | { estado: "pendiente" | "aprobado" | "rechazado" | "no-requiere"; por: string; t: string; decididoPor?: string; decididoT?: string; motivo?: string } };
type Alb = { id: string; pedido: string; proveedor: string; numProv: string; fecha: string; lineas: { ref: string; desc: string; pieza: string; n: number; precio: number }[]; importe: number; stock: { estado: "pendiente" | "ok" | "sin-pieza"; t: string }; facturaId: string; t: string; por: string; huella: string };
type Fac = { id: string; proveedor: string; num: string; fecha: string; vence: string; base: number; igicPct: number; igic: number; total: number; concepto: string; area: string; categoria: string; pedido: string; albaranes: string[]; adjunto: string; estado: "pendiente" | "pagada" | "anulada"; pagos: { fecha: string; metodo: string; importe: number; gastoId: string; t: string }[]; anulada: null | { t: string; motivo: string }; t: string; por: string };
type Mov = { id: string; fecha: string; concepto: string; importe: number; saldo: number | null; cuenta: string; archivo: string; t: string; conciliado: null | { tipo: string; ref: string; nota: string; t: string; por: string } };

const AREAS = ["taller", "venta", "general"], METODOS = ["efectivo", "tarjeta", "transferencia", "domiciliacion"], CATS = ["recambios", "herramientas", "reacondicionamiento", "mantenimiento", "itv", "combustible", "software", "publicidad", "luz", "agua", "telefono", "alquiler", "seguros", "asesoria"]; // las mismas de Finanzas

export default async (req: Request) => {
  const url = new URL(req.url), p = url.pathname.split("/").filter(Boolean), accion = p[2] || "", id = p[3] || "";
  if (req.method !== "GET" && !mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
  const acc = await permiso(req, "equipo"); if (esRespuesta(acc)) return acc;
  const q: Quien = acc;
  // Quién puede usar cada parte. El gerente, todo. El resto, solo lo que el gerente abra a su ROL; lo demás es solo del gerente.
  const MOD: Record<string, string> = { compras: "compras", proveedor: "compras", pedido: "compras", "pedido-estado": "compras", albaran: "compras", "albaran-stock": "compras", factura: "compras", clientes: "cli", consentimientos: "cli", "vehiculo-datos": "cli", aviso: "cli", "coche-doc": "mcar" };
  const cfgPerm = async () => { const c: any = (await leer(P.perm + "cfg")) || {}; const roles = c.roles || {}; return { roles: { compras: roles.compras || [], cli: roles.cli || ["recepcion"], mcar: roles.mcar || ["recepcion"] } as Record<string, string[]>, pedidoMax: Number(c.pedidoMax) || 0 }; };
  if (accion !== "mis-permisos" && !q.admin) {
    const m = MOD[accion], cp = await cfgPerm();
    if (!m || !(cp.roles[m] || []).includes(q.rol)) return json({ error: "Esta opción la tiene limitada el gerente. Pídesela a él." }, 403);
  }
  const body: any = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  const hoy = hoyCanarias();

  /* ============================ PERMISOS ============================ */
  if (accion === "mis-permisos" && req.method === "GET") {
    const cp = await cfgPerm(), modulos = q.admin ? ["compras", "cli", "mcar", "banco", "gest", "conta", "inc", "perm"] : Object.keys(cp.roles).filter((m) => cp.roles[m].includes(q.rol));
    return json({ admin: q.admin, rol: q.rol, modulos, pedidoMax: cp.pedidoMax });
  }
  if (accion === "permisos") {
    if (!q.admin) return json({ error: "Los permisos solo los cambia el gerente." }, 403);
    if (req.method === "GET") return json({ ...(await cfgPerm()), roles_posibles: ["mecanico", "calidad", "recepcion"], modulos: ["compras", "cli", "mcar"] });
    if (req.method === "POST") {
      const ROLES = ["mecanico", "calidad", "recepcion"], MODS = ["compras", "cli", "mcar"], roles: Record<string, string[]> = {};
      for (const m of MODS) roles[m] = (Array.isArray(body.roles?.[m]) ? body.roles[m] : []).filter((r: string) => ROLES.includes(r)).filter((r: string, i: number, a: string[]) => a.indexOf(r) === i);
      const pedidoMax = int(body.pedidoMax, 0, 1_000_000_000, 0), c = { roles, pedidoMax };
      await f().setJSON(P.perm + "cfg", c); await libro(q, "permisos", c); return json({ ok: true, ...(await cfgPerm()) });
    }
  }

  /* ============================ COMPRAS ============================ */
  if (accion === "compras" && req.method === "GET") {
    const [proveedores, pedidos, albaranes, facturas] = await Promise.all([lista<Prov>(P.prov), lista<Ped>(P.ped), lista<Alb>(P.alb), lista<Fac>(P.fprov)]);
    return json({
      hoy, proveedores: proveedores.sort((a, b) => a.nombre.localeCompare(b.nombre)), pedidos: pedidos.sort((a, b) => b.num.localeCompare(a.num)),
      albaranes: albaranes.sort((a, b) => b.t.localeCompare(a.t)), facturas: facturas.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.t.localeCompare(a.t)),
    });
  }

  if (accion === "proveedor" && req.method === "POST") {
    const nombre = str(body.nombre, 120); if (nombre.length < 2) return json({ error: "Escribe el nombre del proveedor." }, 400);
    const email = str(body.email, 120); if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "El correo no parece válido." }, 400);
    const todos = await lista<Prov>(P.prov);
    if (todos.some((x) => x.activo && x.id !== id && x.nombre.toLowerCase() === nombre.toLowerCase())) return json({ error: "Ya tienes un proveedor con ese nombre." }, 409);
    const prev = id ? (esId(id) ? await leer<Prov>(P.prov + id) : null) : null; if (id && !prev) return json({ error: "No existe ese proveedor." }, 404);
    const x: Prov = { id: prev?.id || rid(), nombre, nif: str(body.nif, 20).toUpperCase(), telefono: str(body.telefono, 30), email, direccion: str(body.direccion, 200), plazoDias: int(body.plazoDias, 0, 180, 30), notas: str(body.notas, 500), activo: prev ? prev.activo : true, t: prev?.t || ahora() };
    await f().setJSON(P.prov + x.id, x); await libro(q, prev ? "proveedor-edita" : "proveedor-alta", { id: x.id, nombre });
    return json({ ok: true, proveedor: x }, prev ? 200 : 201);
  }
  if (accion === "proveedor-baja" && req.method === "POST") {
    const x = esId(id) ? await leer<Prov>(P.prov + id) : null; if (!x) return json({ error: "No existe ese proveedor." }, 404);
    const pend = (await lista<Fac>(P.fprov)).filter((z) => z.proveedor === x.id && z.estado === "pendiente").length;
    if (pend) return json({ error: `Tiene ${pend} factura(s) pendiente(s) de pago. Págalas o anúlalas antes de darlo de baja.` }, 409);
    x.activo = body.activo === true; await f().setJSON(P.prov + x.id, x); await libro(q, x.activo ? "proveedor-alta-de-nuevo" : "proveedor-baja", { id: x.id, nombre: x.nombre });
    return json({ ok: true, proveedor: x });
  }

  const lineasValidas = (raw: any): Lin[] | string => {
    if (!Array.isArray(raw) || !raw.length) return "Añade al menos una línea al pedido.";
    if (raw.length > 80) return "Demasiadas líneas (máximo 80).";
    const out: Lin[] = [];
    for (const l of raw) {
      const desc = str(l.desc, 160), n = Math.round(Number(String(l.n ?? "").replace(",", ".")) * 1000) / 1000, precio = Math.round(Number(l.precio));
      if (desc.length < 2) return "Cada línea necesita descripción.";
      if (!(n > 0) || n > 100000) return `La cantidad de «${desc}» no es válida.`;
      if (!Number.isFinite(precio) || precio < 0 || precio > 100_000_000) return `El precio de «${desc}» no es válido.`;
      out.push({ ref: str(l.ref, 40), desc, pieza: esId(l.pieza) || /^[A-Za-z0-9_-]{4,40}$/.test(String(l.pieza || "")) ? String(l.pieza) : "", n, precio, recibido: Math.min(n, Math.max(0, Number(l.recibido) || 0)) });
    }
    return out;
  };
  const estadoPed = (ls: Lin[], actual: Ped["estado"]): Ped["estado"] => {
    const tot = ls.reduce((a, l) => a + l.n, 0), rec = ls.reduce((a, l) => a + Math.min(l.recibido, l.n), 0);
    if (actual === "borrador" || actual === "cancelado") return actual;
    return rec <= 0 ? "enviado" : rec >= tot - 1e-9 ? "recibido" : "parcial";
  };

  if (accion === "pedido" && req.method === "POST") {
    const prov = esId(body.proveedor) ? await leer<Prov>(P.prov + body.proveedor) : null; if (!prov || !prov.activo) return json({ error: "Elige un proveedor." }, 400);
    const d = fecha(body.fecha) || hoy; if (d > addDias(hoy, 1)) return json({ error: "La fecha del pedido no puede ser futura." }, 400);
    const ls = lineasValidas(body.lineas); if (typeof ls === "string") return json({ error: ls }, 400);
    let prev: Ped | null = null;
    if (id) { prev = esId(id) ? await leer<Ped>(P.ped + id) : null; if (!prev) return json({ error: "No existe ese pedido." }, 404); if (prev.estado !== "borrador") return json({ error: "Solo se puede editar un pedido en borrador." }, 409); }
    ls.forEach((l) => { l.recibido = 0; });
    const num = prev?.num || (await siguienteNum("pedido", "PC", (await lista<Ped>(P.ped)).map((x) => x.num)));
    const x: Ped = { id: prev?.id || rid(), num, proveedor: prov.id, fecha: d, estado: "borrador", lineas: ls, notas: str(body.notas, 500), t: prev?.t || ahora(), actualizado: ahora(), aprobacion: null };
    await f().setJSON(P.ped + x.id, x); await libro(q, prev ? "pedido-edita" : "pedido-alta", { num, proveedor: prov.nombre, lineas: ls.length });
    return json({ ok: true, pedido: x }, prev ? 200 : 201);
  }
  if (accion === "pedido-estado" && req.method === "POST") {
    const x = esId(id) ? await leer<Ped>(P.ped + id) : null; if (!x) return json({ error: "No existe ese pedido." }, 404);
    const a = String(body.estado || "");
    if (a === "enviado") {
      if (x.estado !== "borrador") return json({ error: "Solo se marca como pedido al proveedor un pedido en borrador." }, 409);
      const max = (await cfgPerm()).pedidoMax, total = lineasTotal(x.lineas);
      if (!q.admin && max > 0 && total > max) {
        // pedido grande de otra persona: espera el visto bueno del gerente (no se pierde ni se pide solo)
        x.aprobacion = { estado: "pendiente", por: q.nombre, t: ahora() }; x.actualizado = ahora(); await f().setJSON(P.ped + x.id, x);
        await libro(q, "pedido-pide-aprobacion", { num: x.num, total }); return json({ ok: true, pedido: x, pendienteAprobacion: true });
      }
      x.estado = "enviado"; x.aprobacion = { estado: "no-requiere", por: q.nombre, t: ahora() };
    }
    else if (a === "cancelado") {
      if (x.estado === "recibido" || x.estado === "cancelado") return json({ error: "Este pedido ya no se puede cancelar." }, 409);
      if ((await lista<Alb>(P.alb)).some((z) => z.pedido === x.id)) return json({ error: "Ya se ha recibido mercancía de este pedido: no se puede cancelar entero." }, 409);
      x.estado = "cancelado";
    } else return json({ error: "Estado no válido." }, 400);
    x.actualizado = ahora(); await f().setJSON(P.ped + x.id, x); await libro(q, "pedido-" + a, { num: x.num });
    return json({ ok: true, pedido: x });
  }
  if ((accion === "pedido-aprobar" || accion === "pedido-rechazar") && req.method === "POST") {
    if (!q.admin) return json({ error: "Solo el gerente aprueba pedidos." }, 403);
    const x = esId(id) ? await leer<Ped>(P.ped + id) : null; if (!x) return json({ error: "No existe ese pedido." }, 404);
    if (x.estado !== "borrador" || x.aprobacion?.estado !== "pendiente") return json({ error: "Este pedido no está esperando aprobación." }, 409);
    if (accion === "pedido-aprobar") { x.estado = "enviado"; x.aprobacion = { ...x.aprobacion, estado: "aprobado", decididoPor: q.nombre, decididoT: ahora() }; }
    else { const motivo = str(body.motivo, 300); if (motivo.length < 5) return json({ error: "Escribe el motivo del rechazo (mínimo 5 letras)." }, 400); x.aprobacion = { ...x.aprobacion, estado: "rechazado", decididoPor: q.nombre, decididoT: ahora(), motivo }; }
    x.actualizado = ahora(); await f().setJSON(P.ped + x.id, x); await libro(q, accion, { num: x.num }); return json({ ok: true, pedido: x });
  }
  if (accion === "albaran" && req.method === "POST") {
    const ped = esId(body.pedido) ? await leer<Ped>(P.ped + body.pedido) : null; if (!ped) return json({ error: "No existe ese pedido." }, 404);
    if (ped.estado === "borrador") return json({ error: "Marca primero el pedido como «pedido al proveedor»." }, 409);
    if (ped.estado === "cancelado" || ped.estado === "recibido") return json({ error: "Este pedido ya está cerrado." }, 409);
    const d = fecha(body.fecha) || hoy; if (d > hoy) return json({ error: "La fecha de recepción no puede ser futura." }, 400);
    const numProv = str(body.numProv, 40); if (numProv.length < 1) return json({ error: "Escribe el nº del albarán que trae el proveedor." }, 400);
    if (!Array.isArray(body.lineas) || !body.lineas.length) return json({ error: "Indica qué llega." }, 400);
    const sel = new Map<number, number>();
    for (const l of body.lineas) {
      const i = Math.round(Number(l.i)), n = Math.round(Number(String(l.n ?? "").replace(",", ".")) * 1000) / 1000;
      if (!Number.isInteger(i) || i < 0 || i >= ped.lineas.length) return json({ error: "Línea de pedido no válida." }, 400);
      if (!(n > 0)) continue;
      if (sel.has(i)) return json({ error: "Una misma línea está repetida." }, 400);
      const pend = Math.round((ped.lineas[i].n - ped.lineas[i].recibido) * 1000) / 1000;
      if (n > pend + 1e-9) return json({ error: `De «${ped.lineas[i].desc}» solo faltan ${pend} por recibir.` }, 400);
      sel.set(i, n);
    }
    if (!sel.size) return json({ error: "Pon la cantidad que llega de al menos una línea." }, 400);
    const lineas = [...sel.entries()].map(([i, n]) => ({ ref: ped.lineas[i].ref, desc: ped.lineas[i].desc, pieza: ped.lineas[i].pieza, n, precio: ped.lineas[i].precio }));
    const huella = createHash("sha256").update(JSON.stringify([ped.id, numProv, d, lineas.map((l) => [l.desc, l.n])])).digest("hex").slice(0, 24);
    const existentes = await lista<Alb>(P.alb);
    if (existentes.some((a) => a.huella === huella && Date.now() - Date.parse(a.t) < 120_000)) return json({ error: "Este mismo albarán se registró hace un momento. No se ha duplicado.", duplicado: true }, 409);
    for (const [i, n] of sel) ped.lineas[i].recibido = Math.round((ped.lineas[i].recibido + n) * 1000) / 1000;
    ped.estado = estadoPed(ped.lineas, ped.estado); ped.actualizado = ahora();
    const importe = lineas.reduce((a, l) => a + Math.round(l.n * l.precio), 0), conPieza = lineas.some((l) => l.pieza);
    const a: Alb = { id: rid(), pedido: ped.id, proveedor: ped.proveedor, numProv, fecha: d, lineas, importe, stock: { estado: conPieza ? "pendiente" : "sin-pieza", t: ahora() }, facturaId: "", t: ahora(), por: q.nombre, huella };
    await f().setJSON(P.alb + a.id, a); await f().setJSON(P.ped + ped.id, ped);
    await libro(q, "albaran", { pedido: ped.num, numProv, importe, lineas: lineas.length });
    return json({ ok: true, albaran: a, pedido: ped }, 201);
  }
  if (accion === "albaran-stock" && req.method === "POST") {
    const a = esId(id) ? await leer<Alb>(P.alb + id) : null; if (!a) return json({ error: "No existe ese albarán." }, 404);
    if (a.stock.estado === "sin-pieza") return json({ error: "Este albarán no tiene piezas del inventario." }, 409);
    a.stock = { estado: body.ok === false ? "pendiente" : "ok", t: ahora() }; await f().setJSON(P.alb + a.id, a); await libro(q, "albaran-stock", { numProv: a.numProv, estado: a.stock.estado });
    return json({ ok: true, albaran: a });
  }

  if (accion === "factura" && req.method === "POST") {
    const prov = esId(body.proveedor) ? await leer<Prov>(P.prov + body.proveedor) : null; if (!prov) return json({ error: "Elige un proveedor." }, 400);
    const num = str(body.num, 40); if (!num) return json({ error: "Escribe el nº de factura del proveedor." }, 400);
    const d = fecha(body.fecha); if (!d || d > hoy) return json({ error: "Pon la fecha de la factura (no puede ser futura)." }, 400);
    const base = Math.round(Number(body.base)); if (!Number.isFinite(base) || base <= 0 || base > 1_000_000_000) return json({ error: "Escribe la base imponible." }, 400);
    const ip = pct(body.igicPct), igic = Math.round(base * ip / 100), concepto = str(body.concepto, 300); if (concepto.length < 5) return json({ error: "Escribe el concepto con detalle." }, 400);
    const vence = fecha(body.vence) || addDias(d, prov.plazoDias); if (vence < d) return json({ error: "El vencimiento no puede ser anterior a la factura." }, 400);
    const todas = await lista<Fac>(P.fprov);
    let prev: Fac | null = null;
    if (id) { prev = esId(id) ? await leer<Fac>(P.fprov + id) : null; if (!prev) return json({ error: "No existe esa factura." }, 404); if (prev.estado !== "pendiente") return json({ error: "Solo se edita una factura pendiente de pago." }, 409); }
    if (todas.some((x) => x.estado !== "anulada" && x.id !== id && x.proveedor === prov.id && x.num.toLowerCase() === num.toLowerCase())) return json({ error: "Esa factura de ese proveedor ya está registrada.", duplicado: true }, 409);
    const albs = Array.isArray(body.albaranes) ? body.albaranes.filter(esId).slice(0, 20) : [];
    for (const aid of albs) { const a = await leer<Alb>(P.alb + aid); if (!a || a.proveedor !== prov.id) return json({ error: "Un albarán no es de este proveedor." }, 400); if (a.facturaId && a.facturaId !== (prev?.id || "")) return json({ error: `El albarán ${a.numProv} ya está en otra factura.` }, 409); }
    const x: Fac = { id: prev?.id || rid(), proveedor: prov.id, num, fecha: d, vence, base, igicPct: ip, igic, total: base + igic, concepto, area: AREAS.includes(body.area) ? body.area : "taller", categoria: CATS.includes(body.categoria) ? body.categoria : "recambios", pedido: esId(body.pedido) ? body.pedido : "", albaranes: albs, adjunto: /^[A-Za-z0-9._-]{4,120}$/.test(String(body.adjunto || "")) ? String(body.adjunto) : "", estado: "pendiente", pagos: [], anulada: null, t: prev?.t || ahora(), por: prev?.por || q.nombre };
    await f().setJSON(P.fprov + x.id, x);
    for (const aid of albs) { const a = await leer<Alb>(P.alb + aid); if (a) { a.facturaId = x.id; await f().setJSON(P.alb + a.id, a); } }
    await libro(q, prev ? "factura-edita" : "factura-alta", { proveedor: prov.nombre, num, total: x.total, vence });
    return json({ ok: true, factura: x }, prev ? 200 : 201);
  }
  if (accion === "factura-pagar" && req.method === "POST") {
    const x = esId(id) ? await leer<Fac>(P.fprov + id) : null; if (!x) return json({ error: "No existe esa factura." }, 404);
    if (x.estado !== "pendiente") return json({ error: "Esta factura ya no está pendiente." }, 409);
    const gid = String(body.gastoId || ""); if (!/^[A-Za-z0-9_-]{4,60}$/.test(gid)) return json({ error: "Falta el gasto de Finanzas." }, 400);
    const g: any = await leer("gasto/" + gid); if (!g || g.anulado) return json({ error: "Ese gasto no existe en Finanzas o está anulado." }, 404);
    if (Math.abs((g.total || 0) - x.total) > 2) return json({ error: "El importe del gasto de Finanzas no coincide con el de la factura." }, 409);
    if ((await lista<Fac>(P.fprov)).some((z) => z.estado === "pagada" && z.pagos.some((pg) => pg.gastoId === gid))) return json({ error: "Ese gasto ya está ligado a otra factura." }, 409);
    const d = fecha(body.fecha) || g.fecha || hoy, metodo = METODOS.includes(body.metodo) ? body.metodo : g.metodo;
    x.estado = "pagada"; x.pagos = [{ fecha: d, metodo, importe: x.total, gastoId: gid, t: ahora() }]; await f().setJSON(P.fprov + x.id, x);
    await libro(q, "factura-pagada", { num: x.num, total: x.total, metodo, gasto: gid });
    return json({ ok: true, factura: x });
  }
  if (accion === "factura-anular" && req.method === "POST") {
    const x = esId(id) ? await leer<Fac>(P.fprov + id) : null; if (!x) return json({ error: "No existe esa factura." }, 404);
    if (x.estado === "anulada") return json({ error: "Ya está anulada." }, 409);
    if (x.estado === "pagada") return json({ error: "Está pagada: primero anula el gasto en Finanzas y luego esta factura." }, 409);
    const motivo = str(body.motivo, 300); if (motivo.length < 5) return json({ error: "Escribe el motivo de la anulación." }, 400);
    x.estado = "anulada"; x.anulada = { t: ahora(), motivo }; await f().setJSON(P.fprov + x.id, x);
    for (const aid of x.albaranes) { const a = await leer<Alb>(P.alb + aid); if (a && a.facturaId === x.id) { a.facturaId = ""; await f().setJSON(P.alb + a.id, a); } }
    await libro(q, "factura-anulada", { num: x.num, total: x.total, motivo });
    return json({ ok: true });
  }

  /* ============================ BANCO ============================ */
  if (accion === "banco" && req.method === "GET") {
    const desde = fecha(url.searchParams.get("desde")) || "0000-01-01", hasta = fecha(url.searchParams.get("hasta")) || "9999-12-31";
    const todos = (await lista<Mov>(P.banco)).filter((m) => m.fecha >= desde && m.fecha <= hasta).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.t.localeCompare(a.t));
    return json({ movimientos: todos.slice(0, 3000), total: todos.length });
  }
  if (accion === "banco-importar" && req.method === "POST") {
    const movs = Array.isArray(body.movs) ? body.movs : []; if (!movs.length) return json({ error: "El archivo no trae movimientos." }, 400);
    if (movs.length > 2000) return json({ error: "Máximo 2.000 movimientos por importación. Divide el extracto por meses." }, 400);
    const cuenta = str(body.cuenta, 40) || "principal", archivo = str(body.archivo, 120), vistas = new Map<string, number>(), nuevos: Mov[] = [];
    let duplicados = 0;
    for (const m of movs) {
      const fe = fecha(m.fecha), im = Math.round(Number(m.importe)), co = str(m.concepto, 240), sa = m.saldo == null || m.saldo === "" ? null : Math.round(Number(m.saldo));
      if (!fe || !Number.isFinite(im) || im === 0 || Math.abs(im) > 10_000_000_000) return json({ error: `Movimiento no válido (${str(m.fecha, 12)} · ${str(m.importe, 20)}). No se ha importado nada.` }, 400);
      const k = [cuenta, fe, im, co, sa ?? ""].join("|"), o = (vistas.get(k) || 0) + 1; vistas.set(k, o);
      const hash = createHash("sha256").update(k + "|" + o).digest("hex").slice(0, 20);
      if (await leer(P.banco + hash)) { duplicados++; continue; }
      nuevos.push({ id: hash, fecha: fe, concepto: co, importe: im, saldo: sa !== null && Number.isFinite(sa) ? sa : null, cuenta, archivo, t: ahora(), conciliado: null });
    }
    for (const m of nuevos) await f().setJSON(P.banco + m.id, m);
    await libro(q, "banco-importar", { archivo, nuevos: nuevos.length, duplicados });
    return json({ ok: true, nuevos: nuevos.length, duplicados }, 201);
  }
  if (accion === "banco-conciliar" && req.method === "POST") {
    const m = /^[a-f0-9]{20}$/.test(id) ? await leer<Mov>(P.banco + id) : null; if (!m) return json({ error: "No existe ese movimiento." }, 404);
    if (m.conciliado) return json({ error: "Ese movimiento ya está conciliado." }, 409);
    const tipo = String(body.tipo || ""), ref = str(body.ref, 80), nota = str(body.nota, 200);
    if (!["cobro", "gasto", "fprov", "otro"].includes(tipo)) return json({ error: "Tipo no válido." }, 400);
    if (tipo === "otro") { if (nota.length < 3) return json({ error: "Explica qué es (comisión, nómina, impuestos…)." }, 400); }
    else {
      if (!ref) return json({ error: "Falta el apunte con el que cuadra." }, 400);
      if (tipo === "cobro" && m.importe < 0) return json({ error: "Un cobro tiene que ser una entrada de dinero." }, 400);
      if (tipo !== "cobro" && m.importe > 0) return json({ error: "Un pago tiene que ser una salida de dinero." }, 400);
      if (tipo === "fprov") { const fa = esId(ref) ? await leer<Fac>(P.fprov + ref) : null; if (!fa || fa.estado === "anulada") return json({ error: "Esa factura de proveedor no existe." }, 404); if (fa.total !== -m.importe) return json({ error: "El importe del banco no coincide con el de la factura." }, 409); }
      if ((await lista<Mov>(P.banco)).some((z) => z.conciliado && z.conciliado.tipo === tipo && z.conciliado.ref === ref)) return json({ error: "Ese apunte ya está conciliado con otro movimiento del banco." }, 409);
    }
    m.conciliado = { tipo, ref: tipo === "otro" ? "" : ref, nota, t: ahora(), por: q.nombre }; await f().setJSON(P.banco + m.id, m);
    await libro(q, "banco-concilia", { fecha: m.fecha, importe: m.importe, tipo, ref });
    return json({ ok: true, movimiento: m });
  }
  if (accion === "banco-desconciliar" && req.method === "POST") {
    const m = /^[a-f0-9]{20}$/.test(id) ? await leer<Mov>(P.banco + id) : null; if (!m || !m.conciliado) return json({ error: "Ese movimiento no está conciliado." }, 404);
    const antes = m.conciliado; m.conciliado = null; await f().setJSON(P.banco + m.id, m); await libro(q, "banco-desconcilia", { fecha: m.fecha, importe: m.importe, antes: antes.tipo });
    return json({ ok: true, movimiento: m });
  }

  /* ============================ INCENTIVOS ============================ */
  const cfgInc = async () => ({ activo: false, pct: 10, topePersona: 15000, penalRetrabajo: 15, soloCobradas: true, ...(((await leer<any>(P.inc + "cfg")) || {}) as object) });
  if (accion === "incentivos" && req.method === "GET") {
    const periodos = (await lista<any>(P.inc + "p/")).sort((a, b) => b.periodo.localeCompare(a.periodo));
    return json({ cfg: await cfgInc(), periodos, maxPct: INC_MAX_PCT });
  }
  if (accion === "incentivo-cfg" && req.method === "POST") {
    const c = { activo: body.activo === true, pct: Math.min(INC_MAX_PCT, Math.max(0, Math.round((Number(body.pct) || 0) * 10) / 10)), topePersona: int(body.topePersona, 0, 1_000_000, 15000), penalRetrabajo: int(body.penalRetrabajo, 0, 100, 15), soloCobradas: body.soloCobradas !== false };
    await f().setJSON(P.inc + "cfg", c); await libro(q, "incentivo-cfg", c); return json({ ok: true, cfg: c });
  }
  if (accion === "incentivo-liquidar" && req.method === "POST") {
    const periodo = String(body.periodo || ""); if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(periodo)) return json({ error: "Periodo no válido (AAAA-MM)." }, 400);
    if (await leer(P.inc + "p/" + periodo)) return json({ error: "Ese mes ya está liquidado. No se puede repetir." }, 409);
    const cfg = await cfgInc(); if (!cfg.activo) return json({ error: "Los incentivos están desactivados en los ajustes." }, 409);
    const beneficio = int(body.beneficio, -1e12, 1e12), fijos = int(body.fijos, 0, 1e12), pp = Math.min(INC_MAX_PCT, Number(body.pct) || 0);
    if (pp > cfg.pct + 1e-9) return json({ error: `El % pedido (${pp}) supera el de los ajustes (${cfg.pct}).` }, 409);
    const excedente = Math.max(0, beneficio - fijos), techo = Math.floor(excedente * pp / 100);
    const filas = (Array.isArray(body.filas) ? body.filas : []).slice(0, 60).map((r: any) => ({ nombre: str(r.nombre, 60), minutos: int(r.minutos, 0, 1e7), retrabajos: int(r.retrabajos, 0, 100), importe: int(r.importe, 0, 1e9) }));
    if (filas.some((r: any) => !r.nombre || /^gerente$/i.test(r.nombre))) return json({ error: "Hay una persona no válida en el reparto." }, 400);
    const suma = filas.reduce((a: number, r: any) => a + r.importe, 0);
    if (excedente <= 0 && suma > 0) return json({ error: "Los gastos fijos del mes no están cubiertos: no se puede repartir nada." }, 409);
    if (suma > techo) return json({ error: `El reparto (${suma / 100} €) supera el ${pp} % del excedente (${techo / 100} €). Se bloquea para no pagar más de lo que gana la empresa.` }, 409);
    if (filas.some((r: any) => r.importe > cfg.topePersona)) return json({ error: "Alguien supera el tope por persona de los ajustes." }, 409);
    const x = { periodo, desde: fecha(body.desde), hasta: fecha(body.hasta), beneficio, fijos, excedente, pct: pp, pool: techo, filas, pagado: suma, estado: "pendiente", t: ahora(), por: q.nombre, pagadoEl: "" };
    await f().setJSON(P.inc + "p/" + periodo, x); await libro(q, "incentivo-liquida", { periodo, beneficio, fijos, pool: techo, pagado: suma });
    return json({ ok: true, periodo: x }, 201);
  }
  if (accion === "incentivo-pagado" && req.method === "POST") {
    const x: any = /^\d{4}-\d{2}$/.test(id) ? await leer(P.inc + "p/" + id) : null; if (!x) return json({ error: "No existe ese periodo." }, 404);
    if (x.estado === "pagado") return json({ error: "Ya está marcado como pagado." }, 409);
    x.estado = "pagado"; x.pagadoEl = fecha(body.fecha) || hoy; await f().setJSON(P.inc + "p/" + id, x); await libro(q, "incentivo-pagado", { periodo: id, pagado: x.pagado });
    return json({ ok: true, periodo: x });
  }

  /* ============================ CONTABILIDAD · asientos manuales ============================ */
  if (accion === "conta-asientos" && req.method === "GET") { if (!q.admin) return json({ error: "La contabilidad es solo del gerente." }, 403); return json({ asientos: (await lista<any>(P.conta)).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.num.localeCompare(a.num)) }); }
  if (accion === "conta-asiento" && req.method === "POST") {
    if (!q.admin) return json({ error: "La contabilidad es solo del gerente." }, 403);
    const fe = fecha(body.fecha); if (!fe || fe > hoy) return json({ error: "Pon la fecha del asiento (no puede ser futura)." }, 400);
    const concepto = str(body.concepto, 200); if (concepto.length < 5) return json({ error: "Escribe el concepto del asiento (mínimo 5 letras)." }, 400);
    const tipo = ["manual", "apertura", "regularizacion"].includes(body.tipo) ? body.tipo : "manual";
    const ls = Array.isArray(body.lineas) ? body.lineas : []; if (ls.length < 2 || ls.length > 20) return json({ error: "Un asiento lleva entre 2 y 20 apuntes." }, 400);
    const lineas: { cuenta: string; debe: number; haber: number; nota: string }[] = []; let D = 0, Hh = 0;
    for (const l of ls) {
      const cuenta = String(l?.cuenta || ""), debe = Math.round(Number(l?.debe) || 0), haber = Math.round(Number(l?.haber) || 0);
      if (!PLAN[cuenta]) return json({ error: `La cuenta «${str(cuenta, 6)}» no está en el plan de cuentas.` }, 400);
      if (debe < 0 || haber < 0 || debe > 1e11 || haber > 1e11 || (debe > 0) === (haber > 0)) return json({ error: "Cada apunte lleva importe en el Debe o en el Haber (uno solo, mayor que cero)." }, 400);
      D += debe; Hh += haber; lineas.push({ cuenta, debe, haber, nota: str(l?.nota, 100) });
    }
    if (D !== Hh) return json({ error: `El asiento no cuadra: Debe ${(D / 100).toFixed(2)} € y Haber ${(Hh / 100).toFixed(2)} €.` }, 400);
    const num = await siguienteNum("asiento", "M", (await lista<any>(P.conta)).map((x) => x.num));
    const x = { id: rid(), num, fecha: fe, concepto, tipo, lineas, total: D, anulado: null as null | { t: string; motivo: string }, t: ahora(), por: q.nombre };
    await f().setJSON(P.conta + x.id, x); await libro(q, "asiento", { num, concepto, total: D, tipo }); return json({ ok: true, asiento: x }, 201);
  }
  if (accion === "conta-anular" && req.method === "POST") {
    if (!q.admin) return json({ error: "La contabilidad es solo del gerente." }, 403);
    const x = esId(id) ? await leer<any>(P.conta + id) : null; if (!x) return json({ error: "No existe ese asiento." }, 404); if (x.anulado) return json({ error: "Ya está anulado." }, 409);
    const motivo = str(body.motivo, 300); if (motivo.length < 5) return json({ error: "Escribe el motivo de la anulación (mínimo 5 letras)." }, 400);
    x.anulado = { t: ahora(), motivo }; await f().setJSON(P.conta + x.id, x); await libro(q, "asiento-anulado", { num: x.num, motivo }); return json({ ok: true });
  }

  /* ============================ CLIENTES · avisos ============================ */
  // Permisos de avisos que el cliente firmó en la recepción (FORM-01) y bajas pedidas. Misma regla que «Avisos de ITV» del taller:
  // vale la recepción cerrada MÁS RECIENTE de cada matrícula; si pidió la baja después de dar el permiso, ya no se le avisa.
  if (accion === "consentimientos" && req.method === "GET") {
    const ts = tstore(), reg: any = (await ts.get("itv-avisos", { type: "json" }).catch(() => null)) || { avisos: {}, bajas: {} };
    const lf = await ts.list({ prefix: "f/" }), todas: any[] = (await Promise.all(lf.blobs.map((b: any) => ts.get(b.key, { type: "json" }).catch(() => null)))).filter(Boolean);
    const ultima = new Map<string, any>();
    for (const fi of todas) {
      const x = fi.f1; if (!x || !x.cerrada || !x.vehiculo) continue;
      const mat = String(x.vehiculo.matricula || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); if (!mat) continue;
      const prev = ultima.get(mat)?.f1; if (!prev || (x.firmadoCliente || x.fecha) > (prev.firmadoCliente || prev.fecha)) ultima.set(mat, fi);
    }
    const porMatricula: Record<string, any> = {};
    for (const [mat, fi] of ultima) { const x = fi.f1; porMatricula[mat] = { itv: /^\d{4}-\d{2}-\d{2}$/.test(String(x.vehiculo.itv || "")) ? x.vehiculo.itv : "", avisosITV: !!x.avisosITV, avisosWhatsApp: !!x.avisosWhatsApp, permiso: x.avisosITVFecha || x.firmadoCliente || "", tel: String(x.cliente?.telefono || "").replace(/\D/g, "").slice(-9) }; }
    const bajas: Record<string, string> = {}; for (const [tel, t] of Object.entries(reg.bajas || {})) bajas[String(tel).replace(/\D/g, "").slice(-9)] = String(t);
    return json({ porMatricula, bajas });
  }
  if (accion === "clientes" && req.method === "GET") {
    const [veh, avisos] = await Promise.all([lista<any>(P.veh), lista<any>(P.aviso)]);
    return json({ vehiculos: Object.fromEntries(veh.map((v) => [v.matricula, v])), avisos: avisos.sort((a, b) => b.t.localeCompare(a.t)).slice(0, 2000) });
  }
  if (accion === "vehiculo-datos" && req.method === "POST") {
    const mat = String(id || "").toUpperCase().replace(/[^A-Z0-9]/g, ""); if (mat.length < 4 || mat.length > 10) return json({ error: "Matrícula no válida." }, 400);
    const campoF = (k: string) => { const v = String(body[k] ?? ""); if (!v) return ""; const ok = fecha(v); return ok; };
    for (const k of ["itvVence", "itvUltima", "matriculacion", "aceiteFecha", "revisionFecha"]) if (String(body[k] ?? "") && !campoF(k)) return json({ error: `La fecha de «${k}» no es válida.` }, 400);
    const otrosRaw = Array.isArray(body.otros) ? body.otros.slice(0, 6) : [], otros: { txt: string; vence: string }[] = [];
    for (const o of otrosRaw) { const txt = str(o?.txt, 60), ve = fecha(o?.vence); if (!txt && !String(o?.vence ?? "")) continue; if (!txt || !ve) return json({ error: "Cada aviso personalizado necesita texto y una fecha válida." }, 400); otros.push({ txt, vence: ve }); }
    const x = { matricula: mat, otros, itvVence: campoF("itvVence"), itvUltima: campoF("itvUltima"), matriculacion: campoF("matriculacion"), aceiteFecha: campoF("aceiteFecha"), revisionFecha: campoF("revisionFecha"), aceiteKm: int(body.aceiteKm, 0, 2_000_000), kmActual: int(body.kmActual, 0, 2_000_000), nota: str(body.nota, 300), t: ahora() };
    await f().setJSON(P.veh + mat, x); await libro(q, "vehiculo-datos", { matricula: mat });
    return json({ ok: true, vehiculo: x });
  }
  if (accion === "aviso" && req.method === "POST") {
    const clave = str(body.clave, 80).replace(/[^A-Za-z0-9:_-]/g, ""), tipo = String(body.tipo || ""); if (!clave || !["aceite", "revision", "itv", "otro"].includes(tipo)) return json({ error: "Aviso no válido." }, 400);
    const x = { id: rid(), clave, tipo, cliente: str(body.cliente, 120), matricula: str(body.matricula, 12), canal: str(body.canal, 20) || "whatsapp", nota: str(body.nota, 200), t: ahora(), dia: hoy, por: q.nombre };
    await f().setJSON(P.aviso + clave.slice(0, 50) + "/" + tipo + "/" + x.id, x); return json({ ok: true, aviso: x }, 201);
  }

  /* ============================ COCHE · contrato, garantía, checklist ============================ */
  if (accion === "coche-doc") {
    if (!/^[a-z0-9-]{3,80}$/.test(id)) return json({ error: "Coche no válido." }, 400);
    if (req.method === "GET") return json({ doc: (await leer<any>(P.coche + id)) || null });
    if (req.method === "POST") {
      const c = body.comprador || {}, ch: Record<string, boolean> = {};
      for (const [k, v] of Object.entries(body.checklist || {})) if (/^[a-z0-9_]{2,30}$/.test(k)) ch[k] = v === true;
      const x = {
        id, comprador: { nombre: str(c.nombre, 120), nif: str(c.nif, 20).toUpperCase(), direccion: str(c.direccion, 200), telefono: str(c.telefono, 30), email: str(c.email, 120) },
        vehiculo: { descripcion: str((body.vehiculo || {}).descripcion, 160), matricula: str((body.vehiculo || {}).matricula, 12).toUpperCase(), bastidor: str((body.vehiculo || {}).bastidor, 24).toUpperCase() },
        precio: int(body.precio, 0, 1_000_000_000), forma: str(body.forma, 60), fechaEntrega: fecha(body.fechaEntrega), kmEntrega: int(body.kmEntrega, 0, 2_000_000), garantiaMeses: int(body.garantiaMeses, 12, 36, 12),
        // Act. 74 · «solo motor» solo es posible si el comprador es una empresa o un autónomo que compra para su negocio; un particular siempre tiene la garantía legal completa
        compradorTipo: body.compradorTipo === "empresa" ? "empresa" : "particular", garantiaSoloMotor: body.compradorTipo === "empresa" && body.garantiaSoloMotor === true,
        notas: str(body.notas, 500), checklist: ch, actualizado: ahora(), por: q.nombre,
      };
      await f().setJSON(P.coche + id, x); await libro(q, "coche-doc", { coche: id });
      return json({ ok: true, doc: x });
    }
  }

  return json({ error: "No encontrado" }, 404);
};

export const config: Config = {
  path: ["/api/erp/:accion", "/api/erp/:accion/:id"],
};
