import type { Config } from "@netlify/functions";
import { createHash } from "node:crypto";
import { store, json, mismoOrigen } from "../lib/shared.mts";
import { quien, leerEquipo, hoyCanarias, horaCanarias } from "../lib/taller.mts";
import { herramientasPendientes } from "../lib/almacen.mts";
import { s, str, cent, eur, esFoto, rid, ahora, leerDesglose, libro, alerta, listar, movsDe, teorico, turnoAbierto, leerMov, crearMovimiento, TXT_CAT, type Conteo, type Turno, type Mov } from "../lib/caja.mts";
import { exigirJornada } from "../lib/jornada.mts";

/*
  CONTROL DE CAJA Y PREVENCIÓN DE PÉRDIDAS
  GET  /api/caja/estado                 → la caja de ahora (el equipo NO ve la cifra teórica: cierre ciego)
  POST /api/caja/abrir                  → apertura con el conteo del fondo (se compara con el último cierre)
  POST /api/caja/movimiento             → cobro en efectivo o salida de dinero (la salida exige foto del ticket)
  POST /api/caja/foto/:mov              → añadir el ticket a una salida que se registró sin él
  POST /api/caja/cerrar                 → cierre ciego con el desglose de billetes y monedas
  --- solo el gerente ---
  GET  /api/caja/resumen?desde&hasta    → turnos, descuadres por empleado, alertas y efectivo teórico
  GET  /api/caja/libro?desde&hasta      → libro de registro con la cadena de huellas comprobada
  POST /api/caja/anular/:mov            → anula un movimiento (nunca se borra) con motivo
  POST /api/caja/ajuste/:turno          → ajuste en un turno cerrado, con motivo
  POST /api/caja/revisar/:turno         → el gerente da por revisado un descuadre
  POST /api/caja/alertas-vistas
  Nada se borra ni se edita: todo queda en el libro, encadenado con huellas SHA-256.
  Los importes se guardan en céntimos (enteros) para no perder ni un céntimo por redondeos.
*/


export default async (req: Request) => {
  const url = new URL(req.url), p = url.pathname.split("/").filter(Boolean), accion = p[2] || "", id = p[3] || "";
  if (req.method !== "GET" && !mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
  const q = await quien(req);
  if (!q) return json({ error: "No autorizado" }, 401);
  const bloqueo = await exigirJornada(q); if (bloqueo) return bloqueo; // el equipo no trabaja sin haber fichado
  if (!q.caja) return json({ error: "No tienes permiso para usar la caja. Pídeselo al gerente." }, 403);
  const body = req.method === "POST" ? ((await req.json().catch(() => ({}))) as any) : {};
  const origin = url.origin;

  // ---------- estado de la caja (ciego para el equipo) ----------
  if (accion === "estado" && req.method === "GET") {
    const t = await turnoAbierto();
    const ultimo = (await s().get("ultimo-cierre", { type: "json" }).catch(() => null)) as any;
    if (!t) return json({ abierta: false, ultimoCierre: ultimo ? { t: ultimo.t, nombre: ultimo.nombre, ...(q.admin ? { contado: ultimo.contado } : {}) } : null, admin: q.admin });
    const movs = await movsDe(t.id), calc = teorico(t, movs);
    return json({
      abierta: true, admin: q.admin,
      turno: { id: t.id, fecha: t.fecha, apertura: { t: t.apertura.t, nombre: t.apertura.nombre, uid: t.apertura.uid, ...(q.admin || t.apertura.uid === q.uid ? { contado: t.apertura.contado } : {}) }, intentosCierre: t.intentosCierre.length },
      // Cada persona ve el importe de lo que registra ella; los totales y el teórico, solo el gerente.
      movimientos: movs.map((m) => ({ id: m.id, t: m.t, tipo: m.tipo, categoria: m.categoria, concepto: m.concepto, ref: m.ref, responsableNombre: m.responsableNombre, porNombre: m.porNombre, foto: m.foto, sinTicket: m.sinTicket && !m.foto, anulado: !!m.anulado, ajuste: m.ajuste, ...(q.admin || m.por === q.uid ? { importe: m.importe, mio: m.por === q.uid } : {}) })),
      ...(q.admin ? { calculo: calc } : {}),
    });
  }

  // ---------- apertura: se cuenta el fondo y se compara con lo que quedó en el último cierre ----------
  if (accion === "abrir" && req.method === "POST") {
    if (await turnoAbierto()) return json({ error: "La caja ya está abierta." }, 409);
    const { desglose, contado } = leerDesglose(body.desglose);
    const ultimo = (await s().get("ultimo-cierre", { type: "json" }).catch(() => null)) as any;
    const esperado = ultimo ? ultimo.contado as number : null, dif = esperado === null ? 0 : contado - esperado;
    const pend = ((await s().get("intentos-apertura", { type: "json" }).catch(() => null)) as Conteo[] | null) || [];
    const intento = { desglose, contado, t: ahora() };
    const just = str(body.justificacion, 800);
    if (dif !== 0 && just.length < 15) {
      await s().setJSON("intentos-apertura", [...pend, intento].slice(-20));
      await libro(q, "apertura-no-cuadra", { contado: intento.contado, intento: pend.length + 1 });
      return json({ error: "El fondo contado no coincide con lo que quedó en el último cierre. Vuelve a contar billete a billete. Si está bien contado, escribe qué ha pasado (mínimo 15 letras).", descuadre: true, intentos: pend.length + 1 }, 409);
    }
    const t: Turno = { id: `${hoyCanarias()}-${rid().slice(0, 6)}`, fecha: hoyCanarias(), apertura: { t: ahora(), uid: q.uid, nombre: q.nombre, desglose, contado, esperado, diferencia: dif, justificacion: dif ? just : "", intentos: [...pend, intento] }, cierre: null, intentosCierre: [], revision: null, ajustes: [] };
    await s().setJSON("t/" + t.id, t); await s().set("abierto", t.id); await s().delete("intentos-apertura").catch(() => {});
    await libro(q, "apertura", { contado, esperado, diferencia: dif, justificacion: t.apertura.justificacion, intentos: t.apertura.intentos.length }, t.id);
    if (dif) await alerta("rojo", "apertura", `el fondo de apertura no cuadra (${eur(dif)})`, [["Quién abre", q.nombre], ["Contado", eur(contado)], ["Quedó al cerrar", eur(esperado || 0)], ["Diferencia", eur(dif)], ["Explicación", just]], t.id, "", origin);
    return json({ ok: true, id: t.id, descuadre: dif !== 0 });
  }

  // ---------- cobros y salidas ----------
  if (accion === "movimiento" && req.method === "POST") {
    const r = await crearMovimiento(q, body, origin);
    if (r.error) return json({ error: r.error }, r.status || 400);
    return json({ ok: true, id: r.mov!.id, importe: r.mov!.importe });
  }

  if (accion === "foto" && req.method === "POST") {
    const r = await leerMov(id); if (!r) return json({ error: "Movimiento no encontrado." }, 404);
    if (r.m.foto) return json({ error: "Ese movimiento ya tiene su comprobante." }, 409);
    if (!q.admin && r.m.por !== q.uid) return json({ error: "Solo quien la registró o el gerente pueden añadir el ticket." }, 403);
    if (!esFoto(body.foto) || !(await store("monzacar-fotos").get(body.foto, { type: "arrayBuffer" }).catch(() => null))) return json({ error: "La foto no se ha subido bien." }, 400);
    r.m.foto = body.foto; r.m.fotoT = ahora(); await s().setJSON(r.key, r.m);
    await libro(q, "ticket-añadido", { importe: r.m.importe, concepto: r.m.concepto, tarde: r.m.sinTicket }, r.m.turno, r.m.id);
    return json({ ok: true });
  }

  // ---------- cierre ciego ----------
  if (accion === "cerrar" && req.method === "POST") {
    const t = await turnoAbierto(); if (!t) return json({ error: "La caja no está abierta." }, 409);
    // Auditoría de herramientas: ninguna herramienta puede quedar fuera sin que alguien diga dónde está
    const fuera = await herramientasPendientes();
    if (fuera.length) return json({ error: `Antes de cerrar: ${fuera.length} herramienta${fuera.length > 1 ? "s" : ""} sin devolver. Devuélvelas o indica dónde están.`, herramientas: fuera.map((h) => ({ id: h.id, codigo: h.codigo, nombre: h.nombre, quien: h.uso?.nombre, num: h.uso?.num, desde: h.uso?.desde })) }, 409);
    const { desglose, contado } = leerDesglose(body.desglose);
    const movs = await movsDe(t.id), calc = teorico(t, movs), dif = contado - calc.teorico;
    const intento = { desglose, contado, t: ahora() }, just = str(body.justificacion, 800);
    t.intentosCierre.push(intento);
    if (dif !== 0 && just.length < 15) {
      await s().setJSON("t/" + t.id, t);
      await libro(q, "cierre-no-cuadra", { contado, intento: t.intentosCierre.length }, t.id);
      if (t.intentosCierre.length === 3) await alerta("ambar", "recuentos", `3 recuentos seguidos sin cuadrar la caja (${q.nombre})`, [["Quién cierra", q.nombre], ["Conteos", t.intentosCierre.map((x) => eur(x.contado)).join(" · ")]], t.id, "", origin);
      // Cierre ciego: no se dice cuánto falta o sobra, ni cuánto debería haber.
      return json({ error: "La caja NO cuadra. Vuelve a contar billete a billete y moneda a moneda. Si está bien contado, escribe qué ha pasado: sin explicación no se puede cerrar.", descuadre: true, intentos: t.intentosCierre.length }, 409);
    }
    t.cierre = { t: ahora(), uid: q.uid, nombre: q.nombre, desglose, contado, teorico: calc.teorico, diferencia: dif, justificacion: dif ? just : "", intentos: t.intentosCierre };
    await s().setJSON("t/" + t.id, t); await s().delete("abierto");
    await s().setJSON("ultimo-cierre", { turno: t.id, contado, desglose, t: t.cierre.t, nombre: q.nombre });
    await libro(q, "cierre", { contado, teorico: calc.teorico, diferencia: dif, justificacion: t.cierre.justificacion, recuentos: t.intentosCierre.length }, t.id);
    const sinTk = movs.filter((m) => m.sinTicket && !m.foto && !m.anulado).length;
    if (dif) await alerta("rojo", "descuadre", `${dif < 0 ? "FALTAN" : "SOBRAN"} ${eur(Math.abs(dif))} en el cierre de ${q.nombre}`, [["Turno", t.fecha], ["Abrió", t.apertura.nombre + " · " + horaCanarias(new Date(t.apertura.t))], ["Cerró", q.nombre + " · " + horaCanarias()], ["Debería haber", eur(calc.teorico)], ["Contado", eur(contado)], ["Diferencia", eur(dif)], ["Explicación", just], ["Recuentos", String(t.intentosCierre.length)]], t.id, "", origin);
    return json({ ok: true, descuadre: dif !== 0, sinTicket: sinTk });
  }

  // ======================= solo el gerente =======================
  if (!q.admin) return json({ error: "Solo el gerente." }, 403);

  if (accion === "resumen" && req.method === "GET") {
    const hoy = hoyCanarias(), desde = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("desde") || "") ? url.searchParams.get("desde")! : hoy.slice(0, 8) + "01", hasta = /^\d{4}-\d{2}-\d{2}$/.test(url.searchParams.get("hasta") || "") ? url.searchParams.get("hasta")! : hoy;
    const todos = await listar<Turno>("t/"), turnos = todos.filter((t) => t.fecha >= desde && t.fecha <= hasta).sort((a, b) => b.apertura.t.localeCompare(a.apertura.t));
    const abierto = await turnoAbierto();
    const filas = await Promise.all(turnos.map(async (t) => { const movs = await movsDe(t.id), c = teorico(t, movs);
      return { ...t, calculo: c, movimientos: movs, sinTicket: movs.filter((m) => m.sinTicket && !m.foto && !m.anulado).length, abierto: !t.cierre }; }));
    // Descuadres por empleado (quien cierra responde del cierre; quien abre, de la apertura)
    const porEmp: Record<string, { nombre: string; turnos: number; faltante: number; sobrante: number; neto: number; descuadres: number; recuentos: number; sinTicket: number }> = {};
    const emp = (uid: string, nombre: string) => (porEmp[uid] ||= { nombre, turnos: 0, faltante: 0, sobrante: 0, neto: 0, descuadres: 0, recuentos: 0, sinTicket: 0 });
    for (const f of filas) {
      if (f.cierre) { const e = emp(f.cierre.uid, f.cierre.nombre); e.turnos++; e.neto += f.cierre.diferencia; if (f.cierre.diferencia < 0) e.faltante += -f.cierre.diferencia; if (f.cierre.diferencia > 0) e.sobrante += f.cierre.diferencia; if (f.cierre.diferencia) e.descuadres++; e.recuentos += Math.max(0, f.cierre.intentos.length - 1); }
      if (f.apertura.diferencia) { const e = emp(f.apertura.uid, f.apertura.nombre); e.descuadres++; e.neto += f.apertura.diferencia; if (f.apertura.diferencia < 0) e.faltante += -f.apertura.diferencia; else e.sobrante += f.apertura.diferencia; }
      for (const m of f.movimientos) if (m.sinTicket && !m.foto && !m.anulado) emp(m.por, m.porNombre).sinTicket++;
    }
    const alertas = (await listar<any>("alerta/")).sort((a, b) => b.t.localeCompare(a.t)).slice(0, 60);
    const ultimo = (await s().get("ultimo-cierre", { type: "json" }).catch(() => null)) as any;
    let ahoraCaja: any;
    if (abierto) { const c = teorico(abierto, await movsDe(abierto.id)); ahoraCaja = { abierta: true, ...c, desde: abierto.apertura.t, nombre: abierto.apertura.nombre, turno: abierto.id }; }
    else ahoraCaja = { abierta: false, teorico: ultimo ? ultimo.contado : 0, desde: ultimo?.t || "", nombre: ultimo?.nombre || "" };
    const horasAbierta = abierto ? (Date.now() - Date.parse(abierto.apertura.t)) / 36e5 : 0;
    const equipo = (await leerEquipo()).map((x) => ({ id: x.id, nombre: x.nombre, activo: x.activo, caja: !!x.caja, rol: x.rol }));
    return json({ desde, hasta, ahora: ahoraCaja, horasAbierta, turnos: filas, porEmpleado: Object.entries(porEmp).map(([uid, v]) => ({ uid, ...v })), alertas, equipo, categorias: TXT_CAT });
  }

  if (accion === "libro" && req.method === "GET") {
    const todas = (await listar<any>("log/")).filter((e) => e.hash && e.t).sort((a, b) => a.n - b.n || a.t.localeCompare(b.t));
    // Comprobación de la cadena: si alguien tocara un registro guardado, su huella dejaría de coincidir
    const rotas: number[] = []; let prev = "0".repeat(64);
    for (const e of todas) { const h = createHash("sha256").update(JSON.stringify({ ...e, hash: undefined })).digest("hex"); if (h !== e.hash || e.prev !== prev) rotas.push(e.n); prev = e.hash; }
    const desde = url.searchParams.get("desde") || "", hasta = url.searchParams.get("hasta") || "9999";
    return json({ total: todas.length, integro: rotas.length === 0, rotas, entradas: todas.filter((e) => e.t.slice(0, 10) >= desde && e.t.slice(0, 10) <= hasta).reverse().slice(0, 500) });
  }

  if (accion === "anular" && req.method === "POST") {
    const r = await leerMov(id); if (!r) return json({ error: "Movimiento no encontrado." }, 404);
    if (r.m.anulado) return json({ error: "Ya está anulado." }, 409);
    const motivo = str(body.motivo, 300); if (motivo.length < 5) return json({ error: "Escribe el motivo de la anulación." }, 400);
    r.m.anulado = { t: ahora(), motivo }; await s().setJSON(r.key, r.m);
    const t = (await s().get("t/" + r.m.turno, { type: "json" })) as Turno;
    if (t?.cierre) { const c = teorico(t, await movsDe(t.id)); t.ajustes.push({ t: ahora(), importe: r.m.tipo === "egreso" ? -r.m.importe : r.m.importe, tipo: "anulacion", concepto: r.m.concepto, motivo, mov: r.m.id }); t.cierre.teorico = c.teorico; t.cierre.diferencia = t.cierre.contado - c.teorico; await s().setJSON("t/" + t.id, t); }
    await libro(q, "anulacion", { importe: r.m.importe, tipo: r.m.tipo, concepto: r.m.concepto, motivo }, r.m.turno, r.m.id);
    return json({ ok: true });
  }

  if (accion === "ajuste" && req.method === "POST") {
    const t = (await s().get("t/" + id, { type: "json" }).catch(() => null)) as Turno | null; if (!t) return json({ error: "Turno no encontrado." }, 404);
    if (!t.cierre) return json({ error: "El turno sigue abierto: registra el movimiento normalmente." }, 409);
    const tipo = body.tipo === "ingreso" ? "ingreso" : "egreso", importe = cent(body.importe), concepto = str(body.concepto, 200), motivo = str(body.motivo, 300);
    if (!Number.isFinite(importe) || importe <= 0) return json({ error: "Importe no válido." }, 400);
    if (concepto.length < 3 || motivo.length < 5) return json({ error: "Escribe concepto y motivo del ajuste." }, 400);
    const m: Mov = { id: rid(), turno: t.id, t: ahora(), tipo, importe, categoria: "otro", concepto, ref: str(body.ref, 40), orden: "", responsable: q.uid, responsableNombre: q.nombre, por: q.uid, porNombre: q.nombre, foto: esFoto(body.foto) ? body.foto : "", fotoT: "", sinTicket: false, ajuste: true, anulado: null };
    await s().setJSON(`m/${t.id}/${m.t}-${m.id}`, m);
    const c = teorico(t, await movsDe(t.id)), antes = t.cierre.diferencia;
    t.cierre.teorico = c.teorico; t.cierre.diferencia = t.cierre.contado - c.teorico;
    t.ajustes.push({ t: ahora(), importe: tipo === "egreso" ? -importe : importe, tipo, concepto, motivo, mov: m.id });
    await s().setJSON("t/" + t.id, t);
    await libro(q, "ajuste", { tipo, importe, concepto, motivo, diferenciaAntes: antes, diferenciaDespues: t.cierre.diferencia }, t.id, m.id);
    return json({ ok: true, diferencia: t.cierre.diferencia });
  }

  if (accion === "revisar" && req.method === "POST") {
    const t = (await s().get("t/" + id, { type: "json" }).catch(() => null)) as Turno | null; if (!t) return json({ error: "Turno no encontrado." }, 404);
    const nota = str(body.nota, 400); if (nota.length < 3) return json({ error: "Escribe una nota de la revisión." }, 400);
    t.revision = { t: ahora(), nota }; await s().setJSON("t/" + t.id, t);
    await libro(q, "revision", { nota, diferencia: t.cierre?.diferencia ?? null }, t.id);
    return json({ ok: true });
  }

  if (accion === "alertas-vistas" && req.method === "POST") {
    const { blobs } = await s().list({ prefix: "alerta/" });
    for (const b of blobs) { const a = (await s().get(b.key, { type: "json" })) as any; if (a && !a.vista) { a.vista = true; await s().setJSON(b.key, a); } }
    return json({ ok: true });
  }

  return json({ error: "No encontrado" }, 404);
};

export const config: Config = {
  path: ["/api/caja/:accion", "/api/caja/:accion/:id"],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
