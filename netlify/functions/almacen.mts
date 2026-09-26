import type { Config } from "@netlify/functions";
import { store, json, mismoOrigen, enviarAviso } from "../lib/shared.mts";
import { quien, hoyCanarias, type Quien } from "../lib/taller.mts";
import { anotar, leerLibro } from "../lib/libro.mts";
import { a, listarA, herramientasPendientes, redondeo, CAT_PIEZA, CAT_HERR, UNIDADES, type Pieza, type MovPieza, type Herramienta } from "../lib/almacen.mts";
import { exigirJornada } from "../lib/jornada.mts";

/*
  INVENTARIO DE REPUESTOS Y CONTROL DE HERRAMIENTAS
  GET  /api/almacen/estado                     → piezas, herramientas y avisos (el coste solo lo ve el gerente)
  GET  /api/almacen/orden/:token               → recambios y herramientas de una orden (FORM-03)
  GET  /api/almacen/mias                       → herramientas que tengo yo (para salir)
  GET  /api/almacen/pendientes-cierre          → herramientas fuera sin localizar hoy (cierre de caja)
  POST /api/almacen/pieza[/:id]                → alta / edición de la ficha (gerente o recepción)
  POST /api/almacen/entrada                    → llegada de material con albarán o factura
  POST /api/almacen/imputar                    → recambio usado en una orden: descuenta stock al momento
  POST /api/almacen/devolver-pieza/:mov        → devolución al almacén de lo imputado (con motivo)
  POST /api/almacen/ajuste/:id                 → recuento: stock real con motivo (queda como merma o sobrante)
  POST /api/almacen/herramienta[/:id]          → alta / edición
  POST /api/almacen/herr/:id/:accion           → coger · devolver · mantenimiento · reparada · localizar · extraviada · encontrada
  GET  /api/almacen/movimientos?desde&hasta    → historial (gerente)
  GET  /api/almacen/libro                      → libro encadenado (gerente)
  El stock solo cambia con movimientos: nada se edita a mano sin dejar rastro.
*/

const str = (v: unknown, max = 200) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const cent = (v: unknown) => { const t = String(v ?? "").trim(); if (!t) return NaN; const n = Math.round(Number(t.replace(/\s|€/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")) * 100); return Number.isFinite(n) ? n : NaN; };
const cant = (v: unknown) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? redondeo(n) : NaN; };
const rid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 12);
const ahora = () => new Date().toISOString();
const eur = (c: number) => (c / 100).toFixed(2).replace(".", ",") + " €";
const esFoto = (k: unknown) => typeof k === "string" && /^[a-z0-9-]+\.(jpg|webp|png)$/.test(k);
const MERMA_AVISO = 5000; // 50 €: una merma así manda email al gerente

async function alerta(nivel: "rojo" | "ambar" | "info", tipo: string, txt: string, filas: [string, string][], origin: string, email = nivel === "rojo") {
  const x = { id: rid(), t: ahora(), nivel, tipo, txt, vista: false };
  await a().setJSON(`alerta/${x.t}-${x.id}`, x);
  if (email) await enviarAviso(`Almacén: ${txt}`, filas, [{ txt: "Abrir Inventario", url: origin + "/admin#inventario" }]).catch(() => false);
}
const leerPieza = async (id: string) => (/^[a-z0-9]{12}$/.test(id) ? ((await a().get("p/" + id, { type: "json" }).catch(() => null)) as Pieza | null) : null);
const leerHerr = async (id: string) => (/^[a-z0-9]{12}$/.test(id) ? ((await a().get("h/" + id, { type: "json" }).catch(() => null)) as Herramienta | null) : null);
async function leerOrden(token: string) { if (!/^[A-Za-z0-9]{16}$/.test(token)) return null; return (await store("ordenes").get("o/" + token, { type: "json" }).catch(() => null)) as any; }
async function mover(q: Quien, p: Pieza, tipo: MovPieza["tipo"], cantidad: number, extra: Partial<MovPieza> = {}) {
  const m: MovPieza = { id: rid(), t: ahora(), pieza: p.id, sku: p.sku, nombre: p.nombre, tipo, cantidad, antes: p.stock, despues: redondeo(p.stock + cantidad), coste: p.coste, orden: "", num: "", albaran: "", proveedor: "", motivo: "", origen: "", por: q.uid, porNombre: q.nombre, ...extra };
  p.stock = m.despues; p.actualizado = m.t;
  await a().setJSON("p/" + p.id, p);
  await a().setJSON(`m/${m.t}-${m.id}`, m);
  await anotar("almacen", q, "stock-" + tipo, { pieza: p.sku + " · " + p.nombre, cantidad, antes: m.antes, despues: m.despues, orden: m.num, albaran: m.albaran, motivo: m.motivo });
  return m;
}
async function siguienteCodigo(pref: "P" | "H") {
  const k = "contador/" + pref, n = (Number(await a().get(k).catch(() => 0)) || 0) + 1;
  await a().set(k, String(n)); return `${pref}-${String(n).padStart(pref === "P" ? 4 : 3, "0")}`;
}
const publicaPieza = (p: Pieza, admin: boolean) => (admin ? p : { ...p, coste: undefined });

export default async (req: Request) => {
  const url = new URL(req.url), parts = url.pathname.split("/").filter(Boolean), accion = parts[2] || "", id = parts[3] || "", sub = parts[4] || "";
  if (req.method !== "GET" && !mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
  const q = await quien(req);
  if (!q) return json({ error: "No autorizado" }, 401);
  const bloqueo = await exigirJornada(q); if (bloqueo) return bloqueo; // el equipo no trabaja sin haber fichado
  const catalogo = q.admin || q.rol === "recepcion";
  const body = req.method === "POST" ? ((await req.json().catch(() => ({}))) as any) : {};
  const origin = url.origin;

  // ================= LECTURA =================
  if (accion === "estado" && req.method === "GET") {
    const [piezas, herr] = await Promise.all([listarA<Pieza>("p/"), listarA<Herramienta>("h/")]);
    const activas = piezas.filter((p) => p.activo).sort((x, y) => x.nombre.localeCompare(y.nombre, "es"));
    const out: any = { piezas: activas.map((p) => publicaPieza(p, q.admin)), herramientas: herr.filter((h) => h.activo).sort((x, y) => x.nombre.localeCompare(y.nombre, "es")), categorias: { piezas: CAT_PIEZA, herramientas: CAT_HERR, unidades: UNIDADES }, puedeCatalogo: catalogo, admin: q.admin };
    if (q.admin) {
      const alertas = (await listarA<any>("alerta/")).sort((x, y) => y.t.localeCompare(x.t)).slice(0, 40);
      const desde = new Date(Date.now() - 90 * 864e5).toISOString();
      const movs = (await listarA<MovPieza>("m/")).filter((m) => m.t >= desde);
      const cons: Record<string, { pieza: string; nombre: string; sku: string; cantidad: number; coste: number; unidad: string }> = {};
      for (const m of movs.filter((m) => m.tipo === "salida" || m.tipo === "devolucion")) { const p = piezas.find((x) => x.id === m.pieza); const c = (cons[m.pieza] ||= { pieza: m.pieza, nombre: m.nombre, sku: m.sku, cantidad: 0, coste: 0, unidad: p?.unidad || "ud" }); c.cantidad = redondeo(c.cantidad - m.cantidad); c.coste += Math.round(-m.cantidad * m.coste); }
      out.kpis = { valor: activas.reduce((s, p) => s + Math.max(0, p.stock) * p.coste, 0), valorVenta: activas.reduce((s, p) => s + Math.max(0, p.stock) * p.pvp, 0), referencias: activas.length, bajoMinimo: activas.filter((p) => p.stock <= p.minimo).length, agotadas: activas.filter((p) => p.stock <= 0).length };
      out.consumo = Object.values(cons).filter((c) => c.cantidad > 0).sort((x, y) => y.coste - x.coste || y.cantidad - x.cantidad).slice(0, 12);
      out.alertas = alertas;
    }
    return json(out);
  }
  if (accion === "orden" && req.method === "GET") {
    if (!/^[A-Za-z0-9]{16}$/.test(id)) return json({ error: "Orden no válida" }, 400);
    const movs = (await listarA<MovPieza>("m/")).filter((m) => m.orden === id).sort((x, y) => x.t.localeCompare(y.t));
    const herr = (await listarA<Herramienta>("h/")).filter((h) => h.uso?.orden === id);
    const hist = (await listarA<any>("hm/")).filter((x) => x.orden === id).sort((x, y) => x.t.localeCompare(y.t));
    const piezas = new Map((await listarA<Pieza>("p/")).map((p) => [p.id, p]));
    return json({ recambios: movs.map((m) => ({ ...m, coste: q.admin ? m.coste : undefined, pvp: piezas.get(m.pieza)?.pvp || 0, unidad: piezas.get(m.pieza)?.unidad || "ud", ubicacion: piezas.get(m.pieza)?.ubicacion || "" })), herramientas: herr, historial: hist });
  }
  if (accion === "mias" && req.method === "GET") return json((await listarA<Herramienta>("h/")).filter((h) => h.activo && h.estado === "uso" && h.uso?.uid === q.uid));
  if (accion === "pendientes-cierre" && req.method === "GET") return json(await herramientasPendientes());
  if (accion === "movimientos" && req.method === "GET") {
    if (!q.admin) return json({ error: "Solo el gerente." }, 403);
    const desde = url.searchParams.get("desde") || "0000", hasta = url.searchParams.get("hasta") || "9999";
    const movs = (await listarA<MovPieza>("m/")).filter((m) => { const d = hoyCanarias(new Date(m.t)); return d >= desde && d <= hasta; }).sort((x, y) => y.t.localeCompare(x.t));
    const hm = (await listarA<any>("hm/")).filter((m) => { const d = hoyCanarias(new Date(m.t)); return d >= desde && d <= hasta; }).sort((x, y) => y.t.localeCompare(x.t));
    return json({ movimientos: movs.slice(0, 800), herramientas: hm.slice(0, 400) });
  }
  if (accion === "libro" && req.method === "GET") { if (!q.admin) return json({ error: "Solo el gerente." }, 403); return json(await leerLibro("almacen")); }
  if (accion === "alertas-vistas" && req.method === "POST" && q.admin) {
    const { blobs } = await a().list({ prefix: "alerta/" });
    for (const b of blobs) { const x = (await a().get(b.key, { type: "json" })) as any; if (x && !x.vista) { x.vista = true; await a().setJSON(b.key, x); } }
    return json({ ok: true });
  }

  // ================= FICHA DE PIEZA =================
  if (accion === "pieza" && req.method === "POST") {
    if (!catalogo) return json({ error: "Solo el gerente o recepción dan de alta o editan piezas." }, 403);
    const prev = id ? await leerPieza(id) : null; if (id && !prev) return json({ error: "Pieza no encontrada." }, 404);
    const nombre = str(body.nombre, 120); if (nombre.length < 2) return json({ error: "Escribe el nombre del repuesto." }, 400);
    const todas = await listarA<Pieza>("p/");
    let sku = str(body.sku, 30).toUpperCase().replace(/\s+/g, "-");
    if (sku && todas.some((p) => p.activo && p.sku === sku && p.id !== prev?.id)) return json({ error: `El código ${sku} ya lo tiene otra pieza.` }, 409);
    const ean = str(body.ean, 30).replace(/\s/g, "");
    if (ean && todas.some((p) => p.activo && p.ean === ean && p.id !== prev?.id)) return json({ error: "Ese código de barras ya lo tiene otra pieza." }, 409);
    const minimo = cant(body.minimo); if (!Number.isFinite(minimo) || minimo < 0) return json({ error: "Pon el stock mínimo (0 si no hace falta avisar)." }, 400);
    const pvp = cent(body.pvp);
    let coste = prev?.coste ?? 0;
    if (q.admin && String(body.coste ?? "").trim()) { const c = cent(body.coste); if (!Number.isFinite(c) || c < 0) return json({ error: "Precio de coste no válido." }, 400); coste = c; }
    const p: Pieza = { id: prev?.id || rid(), sku: sku || prev?.sku || await siguienteCodigo("P"), ean, ref: str(body.ref, 60), nombre, categoria: CAT_PIEZA.includes(body.categoria) ? body.categoria : "Otros", ubicacion: str(body.ubicacion, 60), unidad: UNIDADES.includes(body.unidad) ? body.unidad : "ud",
      stock: prev?.stock ?? 0, minimo, coste, pvp: Number.isFinite(pvp) && pvp >= 0 ? pvp : prev?.pvp ?? 0, proveedor: str(body.proveedor, 80), activo: true, creado: prev?.creado || ahora(), actualizado: ahora() };
    await a().setJSON("p/" + p.id, p);
    await anotar("almacen", q, prev ? "pieza-editada" : "pieza-alta", { pieza: p.sku + " · " + p.nombre, ...(prev && prev.coste !== p.coste ? { costeAntes: prev.coste, coste: p.coste } : {}) });
    if (!prev) { const ini = cant(body.stockInicial); if (Number.isFinite(ini) && ini > 0) await mover(q, p, "inicial", ini, { motivo: "Stock inicial al dar de alta" }); }
    return json({ ok: true, pieza: publicaPieza(p, q.admin) }, prev ? 200 : 201);
  }
  if (accion === "pieza-baja" && req.method === "POST") {
    if (!q.admin) return json({ error: "Solo el gerente." }, 403);
    const p = await leerPieza(id); if (!p) return json({ error: "No existe." }, 404);
    if (p.stock > 0) return json({ error: "Aún quedan unidades: haz antes un ajuste a 0 con el motivo." }, 409);
    p.activo = false; await a().setJSON("p/" + p.id, p); await anotar("almacen", q, "pieza-baja", { pieza: p.sku + " · " + p.nombre });
    return json({ ok: true });
  }

  // ================= ENTRADA DE MATERIAL =================
  if (accion === "entrada" && req.method === "POST") {
    const albaran = str(body.albaran, 40), proveedor = str(body.proveedor, 80);
    if (!albaran) return json({ error: "Escribe el nº de albarán o factura del proveedor." }, 400);
    const lineas = (Array.isArray(body.lineas) ? body.lineas : []).slice(0, 60);
    if (!lineas.length) return json({ error: "Añade al menos una pieza." }, 400);
    const hechas: any[] = [];
    for (const l of lineas) {
      const p = await leerPieza(String(l.pieza || "")); if (!p || !p.activo) return json({ error: "Una de las piezas no existe." }, 400);
      const n = cant(l.cantidad); if (!Number.isFinite(n) || n <= 0 || n > 100000) return json({ error: `Cantidad no válida para ${p.nombre}.` }, 400);
      const c = q.admin ? cent(l.coste) : NaN;
      if (Number.isFinite(c) && c >= 0) p.coste = p.stock > 0 ? Math.round((p.stock * p.coste + n * c) / (p.stock + n)) : c; // coste medio ponderado
      if (proveedor && !p.proveedor) p.proveedor = proveedor;
      const m = await mover(q, p, "entrada", n, { albaran, proveedor, coste: Number.isFinite(c) ? c : p.coste, motivo: str(body.nota, 200) });
      hechas.push({ pieza: p.nombre, cantidad: n, stock: m.despues });
    }
    return json({ ok: true, lineas: hechas });
  }

  // ================= RECAMBIO USADO EN UNA ORDEN (descuento automático) =================
  if (accion === "imputar" && req.method === "POST") {
    const o = await leerOrden(String(body.orden || "")); if (!o) return json({ error: "Orden no encontrada." }, 404);
    if (o.estado === "entregado") return json({ error: "La orden ya está entregada: no se le pueden cargar más recambios." }, 409);
    const p = await leerPieza(String(body.pieza || "")); if (!p || !p.activo) return json({ error: "Pieza no encontrada." }, 404);
    const n = cant(body.cantidad); if (!Number.isFinite(n) || n <= 0 || n > 10000) return json({ error: "Pon cuántas unidades has usado." }, 400);
    if (n > p.stock) return json({ error: `No hay stock suficiente: el sistema dice que quedan ${String(p.stock).replace(".", ",")} ${p.unidad}. Si hay más en la estantería, avisa para registrar la entrada o hacer un recuento.` }, 409);
    const m = await mover(q, p, "salida", -n, { orden: o.token, num: o.num || "", motivo: str(body.nota, 200), origen: "FORM-03" });
    if (m.antes > p.minimo && m.despues <= p.minimo) await alerta(m.despues <= 0 ? "rojo" : "ambar", "minimo", `${p.nombre} ${m.despues <= 0 ? "AGOTADO" : "por debajo del mínimo"} (quedan ${String(m.despues).replace(".", ",")} ${p.unidad})`, [["Pieza", `${p.sku} · ${p.nombre}`], ["Quedan", `${m.despues} ${p.unidad}`], ["Mínimo", `${p.minimo} ${p.unidad}`], ["Proveedor", p.proveedor]], origin, m.despues <= 0);
    return json({ ok: true, movimiento: { ...m, coste: q.admin ? m.coste : undefined }, stock: m.despues, bajoMinimo: m.despues <= p.minimo });
  }
  if (accion === "devolver-pieza" && req.method === "POST") {
    const { blobs } = await a().list({ prefix: "m/" }); const k = blobs.find((b) => b.key.endsWith("-" + id)); if (!k) return json({ error: "Movimiento no encontrado." }, 404);
    const orig = (await a().get(k.key, { type: "json" })) as MovPieza; if (orig.tipo !== "salida") return json({ error: "Solo se devuelve lo que salió para una orden." }, 400);
    const yaDev = orig.devuelto || 0, max = redondeo(-orig.cantidad - yaDev);
    const n = String(body.cantidad ?? "").trim() ? cant(body.cantidad) : max; if (!Number.isFinite(n) || n <= 0 || n > max) return json({ error: `Puedes devolver como mucho ${String(max).replace(".", ",")}.` }, 400);
    const motivo = str(body.motivo, 200); if (motivo.length < 4) return json({ error: "Escribe por qué vuelve al almacén (p. ej. «sobró», «era la medida equivocada»)." }, 400);
    const p = await leerPieza(orig.pieza); if (!p) return json({ error: "La pieza ya no existe." }, 404);
    await mover(q, p, "devolucion", n, { orden: orig.orden, num: orig.num, motivo, origen: orig.id });
    orig.devuelto = redondeo(yaDev + n); await a().setJSON(k.key, orig);
    return json({ ok: true, stock: p.stock });
  }

  // ================= RECUENTO / AJUSTE =================
  if (accion === "ajuste" && req.method === "POST") {
    if (!catalogo) return json({ error: "El recuento lo hace el gerente o recepción." }, 403);
    const p = await leerPieza(id); if (!p) return json({ error: "Pieza no encontrada." }, 404);
    const real = cant(body.stockReal); if (!Number.isFinite(real) || real < 0) return json({ error: "Escribe cuántas unidades hay de verdad." }, 400);
    const motivo = str(body.motivo, 300); if (motivo.length < 10) return json({ error: "Explica el motivo del ajuste (mínimo 10 letras): rotura, error de conteo, pieza perdida…" }, 400);
    const dif = redondeo(real - p.stock); if (!dif) return json({ error: "El stock ya es ese: no hay nada que ajustar." }, 409);
    const m = await mover(q, p, "ajuste", dif, { motivo });
    const valor = Math.round(dif * p.coste);
    if (dif < 0) await alerta(-valor >= MERMA_AVISO ? "rojo" : "ambar", "merma", `merma de ${String(-dif).replace(".", ",")} ${p.unidad} de ${p.nombre}${p.coste ? ` (${eur(-valor)})` : ""}`, [["Pieza", `${p.sku} · ${p.nombre}`], ["Antes", String(m.antes)], ["Ahora", String(m.despues)], ["Valor", eur(-valor)], ["Motivo", motivo], ["Quién", q.nombre]], origin, -valor >= MERMA_AVISO);
    return json({ ok: true, stock: p.stock, diferencia: dif });
  }

  // ================= HERRAMIENTAS =================
  if (accion === "herramienta" && req.method === "POST") {
    if (!catalogo) return json({ error: "Solo el gerente o recepción dan de alta herramientas." }, 403);
    const prev = id ? await leerHerr(id) : null; if (id && !prev) return json({ error: "Herramienta no encontrada." }, 404);
    const nombre = str(body.nombre, 120); if (nombre.length < 2) return json({ error: "Escribe el nombre de la herramienta." }, 400);
    const todas = await listarA<Herramienta>("h/");
    let codigo = str(body.codigo, 30).toUpperCase().replace(/\s+/g, "-");
    if (codigo && todas.some((h) => h.activo && h.codigo === codigo && h.id !== prev?.id)) return json({ error: `La etiqueta ${codigo} ya la tiene otra herramienta.` }, 409);
    const valor = q.admin ? cent(body.valor) : NaN;
    const h: Herramienta = { id: prev?.id || rid(), codigo: codigo || prev?.codigo || await siguienteCodigo("H"), nombre, categoria: CAT_HERR.includes(body.categoria) ? body.categoria : "Otra", serie: str(body.serie, 60), foto: esFoto(body.foto) ? body.foto : prev?.foto || "", valor: Number.isFinite(valor) && valor >= 0 ? valor : prev?.valor || 0,
      especial: body.especial === undefined ? prev?.especial ?? true : !!body.especial, ubicacion: str(body.ubicacion, 60), notas: str(body.notas, 300), estado: prev?.estado || "disponible", uso: prev?.uso || null, activo: true, creado: prev?.creado || ahora(), actualizado: ahora() };
    await a().setJSON("h/" + h.id, h);
    await anotar("almacen", q, prev ? "herramienta-editada" : "herramienta-alta", { herramienta: h.codigo + " · " + h.nombre });
    return json({ ok: true, herramienta: h }, prev ? 200 : 201);
  }
  if (accion === "herramienta-baja" && req.method === "POST") {
    if (!q.admin) return json({ error: "Solo el gerente." }, 403);
    const h = await leerHerr(id); if (!h) return json({ error: "No existe." }, 404);
    const motivo = str(body.motivo, 200); if (motivo.length < 5) return json({ error: "Escribe el motivo de la baja." }, 400);
    h.activo = false; await a().setJSON("h/" + h.id, h); await anotar("almacen", q, "herramienta-baja", { herramienta: h.codigo + " · " + h.nombre, motivo });
    return json({ ok: true });
  }
  if (accion === "herr" && req.method === "POST") {
    const h = await leerHerr(id); if (!h || !h.activo) return json({ error: "Herramienta no encontrada." }, 404);
    const nota = str(body.nota, 300), t = ahora(), hoy = hoyCanarias();
    const hist = async (tipo: string, extra: any = {}) => { const e = { id: rid(), t, herr: h.id, codigo: h.codigo, nombre: h.nombre, tipo, uid: q.uid, quien: q.nombre, orden: h.uso?.orden || "", num: h.uso?.num || "", nota, ...extra }; await a().setJSON(`hm/${t}-${e.id}`, e); await anotar("almacen", q, "herramienta-" + tipo, { herramienta: h.codigo + " · " + h.nombre, orden: e.num, nota, ...(extra.de ? { de: extra.de } : {}) }); };
    const guardar = async () => { h.actualizado = t; await a().setJSON("h/" + h.id, h); };
    if (sub === "coger") {
      if (h.estado !== "disponible") return json({ error: h.estado === "uso" ? `La tiene ${h.uso?.nombre}${h.uso?.num ? " (orden " + h.uso.num + ")" : ""}. Tiene que devolverla antes.` : h.estado === "mantenimiento" ? "Está en mantenimiento o averiada." : "Está marcada como extraviada." }, 409);
      let orden = "", num = "";
      if (body.orden) { const o = await leerOrden(String(body.orden)); if (!o) return json({ error: "Orden no encontrada." }, 404); orden = o.token; num = o.num || ""; }
      else if (h.especial) return json({ error: "Es una herramienta especial: indica la orden de trabajo en la que la vas a usar." }, 400);
      h.estado = "uso"; h.uso = { uid: q.uid, nombre: q.nombre, orden, num, desde: t, confirmado: "", nota }; // al cerrar la caja hay que localizarla o devolverla
      await guardar(); await hist("coger"); return json({ ok: true, herramienta: h });
    }
    if (sub === "devolver") {
      if (h.estado !== "uso") return json({ error: "No está en uso." }, 409);
      if (!q.admin && h.uso?.uid !== q.uid) return json({ error: `La tiene ${h.uso?.nombre}: la devuelve él o el gerente.` }, 403);
      const de = h.uso?.nombre || ""; await hist("devolver", { de }); h.estado = "disponible"; h.uso = null; await guardar();
      return json({ ok: true, herramienta: h });
    }
    if (sub === "localizar") { // auditoría al cierre: ¿dónde está?
      if (h.estado !== "uso") return json({ error: "No está fuera." }, 409);
      if (!q.admin && !q.caja && h.uso?.uid !== q.uid) return json({ error: "No autorizado." }, 403);
      if (nota.length < 5) return json({ error: "Escribe dónde está exactamente (p. ej. «dentro del Seat Ibiza de la orden VC-2026-0003, elevador 2»)." }, 400);
      h.uso!.confirmado = hoy; h.uso!.nota = nota; await guardar(); await hist("localizada"); return json({ ok: true, herramienta: h });
    }
    if (sub === "mantenimiento") {
      if (h.estado === "uso" && !q.admin && h.uso?.uid !== q.uid) return json({ error: "La tiene otra persona." }, 403);
      if (nota.length < 4) return json({ error: "Explica qué le pasa." }, 400);
      const de = h.uso?.nombre || ""; h.estado = "mantenimiento"; h.uso = null; await guardar(); await hist("mantenimiento", { de });
      await alerta("info", "mantenimiento", `${h.nombre} a mantenimiento: ${nota}`, [], origin, false);
      return json({ ok: true, herramienta: h });
    }
    if (sub === "reparada") { if (h.estado !== "mantenimiento") return json({ error: "No está en mantenimiento." }, 409); h.estado = "disponible"; await guardar(); await hist("reparada"); return json({ ok: true, herramienta: h }); }
    if (sub === "extraviada") {
      if (nota.length < 5) return json({ error: "Cuenta dónde se vio por última vez." }, 400);
      const de = h.uso?.nombre || ""; h.estado = "extraviada"; h.uso = null; await guardar(); await hist("extraviada", { de });
      await alerta("rojo", "extraviada", `herramienta EXTRAVIADA: ${h.nombre} (${h.codigo})`, [["Herramienta", `${h.codigo} · ${h.nombre}`], ["Nº de serie", h.serie], ["Valor", h.valor ? eur(h.valor) : ""], ["La tenía", de], ["Nota", nota], ["Lo avisa", q.nombre]], origin);
      return json({ ok: true, herramienta: h });
    }
    if (sub === "encontrada") { if (h.estado !== "extraviada") return json({ error: "No está extraviada." }, 409); h.estado = "disponible"; await guardar(); await hist("encontrada"); return json({ ok: true, herramienta: h }); }
    return json({ error: "Acción no válida." }, 400);
  }

  return json({ error: "No encontrado" }, 404);
};

export const config: Config = {
  path: ["/api/almacen/:accion", "/api/almacen/:accion/:id", "/api/almacen/:accion/:id/:sub"],
  rateLimit: { windowLimit: 180, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
