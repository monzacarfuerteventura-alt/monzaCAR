import type { Config } from "@netlify/functions";
import { store, json, mismoOrigen, type Car } from "../lib/shared.mts";
import { quien, hoyCanarias, tstore, estadoTiempo, leerEquipo, pinOk, MOTIVOS_PAUSA } from "../lib/taller.mts";
import { exigirJornada } from "../lib/jornada.mts";
import { anotar, leerLibro } from "../lib/libro.mts";
import {
  FASES, FASE_TXT, rid, ahora, leerCfg, leerFicha, guardarFicha, listarFichas, siguienteRef, desglose, minTotal, v,
  TIPOS_TAREA, leerTarea, guardarTarea, listarTareas, calculoTarea, etiquetaTarea, type Tarea, type TipoTarea,
  type Ficha, type Fase,
} from "../lib/vehiculos.mts";

/*
  COCHES PROPIOS · control interno (solo panel; nada de esto es público)
  GET  /api/vehiculos/estado            → fichas (los importes solo los ve el gerente) y ajustes
  GET  /api/vehiculos/ficha/:id         → una ficha completa
  POST /api/vehiculos/crear             → alta de un coche que entra (gerente o recepción)
  POST /api/vehiculos/editar/:id        → datos del coche (compra, precio previsto y enlace: solo gerente)
  POST /api/vehiculos/fase/:id          → cambio de fase con las reglas del flujo
  POST /api/vehiculos/nota/:id          → nota, nota técnica o fotos de avance (todo el equipo)
  POST /api/vehiculos/horas/:id         → horas trabajadas en este coche (todo el equipo)
  POST /api/vehiculos/coste/:id         → otro coste (el equipo lo propone; el gerente lo aprueba)
  POST /api/vehiculos/decidir/:id/:c    → aprobar o rechazar un coste (gerente)
  POST /api/vehiculos/anular/:id/:tipo/:x → anular horas o coste con motivo (gerente). Nada se borra.
  POST /api/vehiculos/config            → coste interno por hora (gerente)
  GET  /api/vehiculos/tareas            → mi tarea en marcha y las últimas (el gerente ve además las que esperan su visto bueno)
  POST /api/vehiculos/tarea-iniciar     → empieza una tarea (reparación, mantenimiento, limpieza/preparación) en un coche propio
  POST /api/vehiculos/tarea-evento/:id  → pausar (con motivo) · reanudar · terminar (con causas A-I si se pasa del umbral y PIN)
  POST /api/vehiculos/tarea-visto/:id   → visto bueno del gerente
  POST /api/vehiculos/verificar-pin     → comprueba el PIN del operario (firma al cerrar un trabajo)
  GET  /api/vehiculos/libro             → libro encadenado (gerente)
  Las piezas se cargan desde el Inventario (POST /api/almacen/imputar con «vehiculo»): descuenta stock al momento.
*/

const str = (x: unknown, max = 200) => String(x ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const cent = (x: unknown) => { const t = String(x ?? "").trim(); if (!t) return NaN; const n = Math.round(Number(t.replace(/\s|€/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")) * 100); return Number.isFinite(n) ? n : NaN; };
const esFoto = (k: unknown) => typeof k === "string" && /^[a-z0-9-]+\.(jpg|webp|png)$/.test(k);
const fecha = (x: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(x ?? "")) ? String(x) : "");
const MAX_ACT = 400; // el historial de un coche no crece sin límite (la cadena del libro guarda todo igualmente)

// Lo que ve cada persona: el equipo no ve ningún importe (compra, costes, beneficio)
function vista(f: Ficha, admin: boolean, nombreCoche: string) {
  const base: any = {
    id: f.id, ref: f.ref, matricula: f.matricula, vin: f.vin, marca: f.marca, modelo: f.modelo, version: f.version, anio: f.anio, km: f.km, color: f.color,
    fase: f.fase, faseTxt: FASE_TXT[f.fase], entrada: f.entrada, creado: f.creado, actualizado: f.actualizado, danos: f.danos, coche: f.coche, cocheTxt: nombreCoche,
    ultimaCalidad: f.ultimaCalidad, horasMin: minTotal(f), actualizaciones: f.actualizaciones.slice(-MAX_ACT),
    horas: f.horas.map((h) => ({ id: h.id, t: h.t, fecha: h.fecha, nombre: h.nombre, min: h.min, nota: h.nota, anulada: h.anulada, ...(admin ? { costeHora: h.costeHora } : {}) })),
    piezas: f.piezas.map((p) => ({ mov: p.mov, t: p.t, sku: p.sku, nombre: p.nombre, cantidad: p.cantidad, devuelto: p.devuelto, por: p.nombre_por, ...(admin ? { coste: p.coste } : {}) })),
    costes: f.costes.map((c) => ({ id: c.id, t: c.t, fecha: c.fecha, nombre: c.nombre, concepto: c.concepto, estado: c.estado, decidido: c.decidido, anulado: c.anulado, ...(admin ? { importe: c.importe } : {}) })),
    vendido: f.vendido && admin ? f.vendido : f.vendido ? { fecha: f.vendido.fecha } : null,
  };
  if (admin) { base.compra = f.compra; base.precioPrevisto = f.precioPrevisto; base.eco = desglose(f); }
  return base;
}

async function nombresCoches(): Promise<Map<string, Car>> {
  const l = ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null) || [];
  return new Map(l.map((c) => [c.id, c]));
}
const txtCoche = (c?: Car) => (c ? `${c.marca} ${c.modelo} ${c.version || ""}`.trim() + (c.anio ? ` (${c.anio})` : "") : "");
const act = (q: { uid: string; nombre: string; rol: string }, tipo: "nota" | "tecnica" | "foto" | "fase" | "sistema", txt: string, fotos: string[] = []) =>
  ({ id: rid(), t: ahora(), uid: q.uid, nombre: q.nombre, rol: q.rol, tipo, txt, fotos });


const CAUSAS_OK = /^[A-I]$/;
async function vistaTarea(t: Tarea) {
  const c = await calculoTarea(t);
  return { id: t.id, vehiculo: t.vehiculo, ref: t.ref, matricula: t.matricula, coche: t.coche, tipo: t.tipo, tipoTxt: TIPOS_TAREA[t.tipo], nombre: t.nombre, uid: t.uid, estMin: t.estMin, creada: t.creada,
    estado: c.estado, eventos: t.eventos.map((e) => ({ tipo: e.tipo, t: e.t, motivo: e.motivo, auto: e.auto || "" })), calc: { netoMin: c.netoMin, pausasMin: c.pausasMin, desvPct: c.desvPct, desvMin: c.desvMin, exige: c.exigeJustificacion },
    justificacion: t.justificacion, cierre: t.cierre, vistoBueno: t.vistoBueno };
}
// PIN del operario al cerrar: 5 fallos en 10 minutos bloquean 10 minutos (el PIN es de 6 cifras)
async function pinFallos(uid: string, sumar = false) {
  const k = "pinfallos/" + uid, x = ((await v().get(k, { type: "json" }).catch(() => null)) as { n: number; t: number } | null) || { n: 0, t: 0 };
  const vivo = Date.now() - x.t < 10 * 60e3 ? x : { n: 0, t: 0 };
  if (sumar) { vivo.n++; vivo.t = Date.now(); await v().setJSON(k, vivo); }
  return vivo.n;
}

export default async (req: Request) => {
  const url = new URL(req.url), parts = url.pathname.split("/").filter(Boolean), accion = parts[2] || "", id = parts[3] || "", sub = parts[4] || "", sub2 = parts[5] || "";
  if (req.method !== "GET" && !mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
  const q = await quien(req);
  if (!q) return json({ error: "Tu sesión ha caducado. Vuelve a entrar." }, 401);
  const bloqueo = await exigirJornada(q); if (bloqueo) return bloqueo; // el equipo no trabaja sin haber fichado
  const alta = q.admin || q.rol === "recepcion";
  const body = req.method === "POST" ? ((await req.json().catch(() => ({}))) as any) : {};

  // ================= LECTURA =================
  if (accion === "estado" && req.method === "GET") {
    const [fichas, coches, cfg] = await Promise.all([listarFichas(), nombresCoches(), leerCfg()]);
    fichas.sort((a, b) => b.creado.localeCompare(a.creado));
    return json({ fichas: fichas.map((f) => vista(f, q.admin, txtCoche(coches.get(f.coche)))), fases: FASES.map((k) => [k, FASE_TXT[k]]), admin: q.admin, rol: q.rol, cfg: q.admin ? cfg : undefined, coches: q.admin ? [...coches.values()].filter((c) => c.estado !== "vendido").map((c) => ({ id: c.id, txt: txtCoche(c) })) : [] });
  }
  if (accion === "ficha" && req.method === "GET") {
    const f = await leerFicha(id); if (!f) return json({ error: "Ficha no encontrada." }, 404);
    return json(vista(f, q.admin, txtCoche((await nombresCoches()).get(f.coche))));
  }
  if (accion === "tareas" && req.method === "GET") {
    const todas = (await listarTareas()).sort((a, b) => b.creada.localeCompare(a.creada));
    const mias = todas.filter((t) => t.uid === q.uid);
    const abierta = mias.find((t) => !t.cierre) || null;
    const out: any = { ahora: new Date().toISOString(), mia: abierta ? await vistaTarea(abierta) : null, recientes: await Promise.all(mias.filter((t) => t.cierre).slice(0, 6).map(vistaTarea)), tipos: Object.entries(TIPOS_TAREA), motivos: MOTIVOS_PAUSA,
      coches: (await listarFichas()).filter((f) => f.fase !== "vendido").sort((a, b) => a.ref.localeCompare(b.ref)).map((f) => ({ id: f.id, ref: f.ref, matricula: f.matricula, txt: [f.marca, f.modelo].filter(Boolean).join(" "), fase: f.faseTxt })) };
    if (q.admin) out.pendientes = await Promise.all(todas.filter((t) => t.cierre && !t.vistoBueno && t.cierre.desvPct !== undefined && t.justificacion).slice(0, 30).map(vistaTarea));
    return json(out);
  }
  if (accion === "libro" && req.method === "GET") {
    if (!q.admin) return json({ error: "El libro es solo para el gerente." }, 403);
    return json(await leerLibro("vehiculos"));
  }
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  // ================= ALTA Y EDICIÓN =================
  if (accion === "crear") {
    if (!alta) return json({ error: "El alta de coches la hace el gerente o recepción." }, 403);
    const matricula = str(body.matricula, 12).toUpperCase(), marca = str(body.marca, 40), modelo = str(body.modelo, 60);
    if (marca.length < 2 || modelo.length < 1) return json({ error: "Escribe la marca y el modelo." }, 400);
    if (matricula && (await listarFichas()).some((x) => x.matricula === matricula && x.fase !== "vendido")) return json({ error: "Ya hay un coche propio activo con esa matrícula." }, 409);
    const f: Ficha = {
      id: rid(), ref: await siguienteRef(), matricula, vin: str(body.vin, 24).toUpperCase(), marca, modelo, version: str(body.version, 60),
      anio: Math.min(2100, Math.max(0, Math.trunc(Number(body.anio)) || 0)), km: Math.min(2e6, Math.max(0, Math.trunc(Number(body.km)) || 0)), color: str(body.color, 30),
      fase: "entrada", creado: ahora(), actualizado: ahora(), entrada: fecha(body.entrada) || hoyCanarias(), compra: 0, precioPrevisto: 0, coche: "",
      danos: str(body.danos, 1000), ultimaCalidad: null, actualizaciones: [], horas: [], costes: [], piezas: [], vendido: null,
    };
    if (q.admin) { const c = cent(body.compra), pp = cent(body.precioPrevisto); if (Number.isFinite(c) && c >= 0) f.compra = c; if (Number.isFinite(pp) && pp >= 0) f.precioPrevisto = pp; }
    f.actualizaciones.push(act(q, "fase", `Entrada del coche${f.danos ? ": " + f.danos : ""}`));
    await guardarFicha(f);
    await anotar("vehiculos", q, "alta", { ref: f.ref, matricula, coche: `${marca} ${modelo}` });
    return json({ ok: true, ficha: vista(f, q.admin, "") }, 201);
  }

  if (accion === "config") {
    if (!q.admin) return json({ error: "Solo el gerente." }, 403);
    const c = cent(body.costeHora); if (!Number.isFinite(c) || c < 0 || c > 50_000) return json({ error: "Pon el coste por hora en euros (por ejemplo 18,50)." }, 400);
    await v().setJSON("cfg", { costeHora: c });
    await anotar("vehiculos", q, "config", { costeHora: c });
    return json({ ok: true, cfg: { costeHora: c } });
  }
  if (accion === "verificar-pin") { // firma con PIN al cerrar cualquier trabajo (también órdenes de clientes)
    if (q.uid === "gerente") return json({ ok: true, pin: false });
    if ((await pinFallos(q.uid)) >= 5) return json({ error: "Demasiados PIN erróneos. Espera 10 minutos o pídeselo al gerente." }, 429);
    const persona = (await leerEquipo()).find((x) => x.id === q.uid);
    if (!body.pin || !pinOk(String(body.pin), persona?.pin)) { await pinFallos(q.uid, true); return json({ error: "PIN incorrecto. Es el mismo con el que entras al panel.", pin: true }, 403); }
    return json({ ok: true, pin: true });
  }
  // ================= FICHAJE DE TAREAS (FORM-03 de coches propios) =================
  if (accion === "tarea-iniciar") {
    const fv = await leerFicha(String(body.vehiculo || "")); if (!fv) return json({ error: "Elige el coche." }, 404);
    if (fv.fase === "vendido") return json({ error: "Ese coche ya está vendido." }, 409);
    const tipo = String(body.tipo || "") as TipoTarea; if (!(tipo in TIPOS_TAREA)) return json({ error: "Elige qué vas a hacer: reparación, mantenimiento o limpieza." }, 400);
    const estMin = Math.round(Number(body.estMin)); if (!Number.isFinite(estMin) || estMin < 5 || estMin > 1440) return json({ error: "Pon cuánto tiempo calculas que tardarás (entre 5 minutos y 24 horas)." }, 400);
    if ((await listarTareas()).some((t) => t.uid === q.uid && !t.cierre)) return json({ error: "Ya tienes una tarea abierta. Termínala antes de empezar otra." }, 409);
    const activo = (await tstore().get("activo/" + q.uid).catch(() => null)) as string | null;
    if (activo && !activo.startsWith("T:")) { const otro = (await tstore().get("f/" + activo, { type: "json" }).catch(() => null)) as any; if (otro?.f3 && estadoTiempo(otro.f3.eventos) === "trabajando") return json({ error: `Tienes en marcha la orden ${otro.num}. Ponla en pausa o termínala antes de empezar otra.` }, 409); }
    const t: Tarea = { id: rid(), vehiculo: fv.id, ref: fv.ref, matricula: fv.matricula, coche: [fv.marca, fv.modelo].filter(Boolean).join(" "), tipo, uid: q.uid, nombre: q.nombre, estMin, eventos: [{ tipo: "inicio", t: ahora(), por: q.uid, motivo: "", nota: "" }], creada: ahora(), justificacion: null, cierre: null, vistoBueno: null };
    await guardarTarea(t); await tstore().set("activo/" + q.uid, "T:" + t.id);
    if (fv.fase === "entrada" && tipo === "reparacion") { fv.fase = "reparacion"; fv.actualizaciones.push(act({ uid: q.uid, nombre: q.nombre, rol: q.rol }, "fase", `${FASE_TXT.entrada} → ${FASE_TXT.reparacion} (tarea iniciada)`)); await guardarFicha(fv); }
    await anotar("vehiculos", q, "tarea-inicio", { ref: fv.ref, tipo, estMin });
    return json({ ok: true, ahora: ahora(), tarea: await vistaTarea(t) }, 201);
  }
  if (accion === "tarea-evento" || accion === "tarea-visto") {
    const t = await leerTarea(id); if (!t) return json({ error: "Tarea no encontrada." }, 404);
    if (accion === "tarea-visto") {
      if (!q.admin) return json({ error: "El visto bueno es solo del gerente." }, 403);
      if (!t.cierre) return json({ error: "La tarea aún no está terminada." }, 409);
      if (t.vistoBueno) return json({ error: "Ya tenía el visto bueno." }, 409);
      t.vistoBueno = { t: ahora(), por: q.nombre, nota: str(body.nota, 200) }; await guardarTarea(t);
      await anotar("vehiculos", q, "tarea-visto-bueno", { ref: t.ref, tipo: t.tipo, desvPct: t.cierre.desvPct });
      return json({ ok: true, tarea: await vistaTarea(t) });
    }
    if (!q.admin && q.uid !== t.uid) return json({ error: "Esta tarea es de otra persona. Solo ella o el gerente pueden tocarla." }, 403);
    if (t.cierre) return json({ error: "La tarea ya está terminada." }, 409);
    const tipo = String(body.tipo || ""), est = estadoTiempo(t.eventos);
    if (!["pausa", "reanudar", "fin"].includes(tipo)) return json({ error: "Acción no válida." }, 400);
    if (!((tipo === "pausa" && est === "trabajando") || (tipo === "reanudar" && est === "pausa") || (tipo === "fin" && (est === "trabajando" || est === "pausa")))) return json({ error: { sin: "Aún no ha empezado.", trabajando: "Ya está en marcha.", pausa: "Está en pausa: reanúdala o termínala.", fin: "Ya está terminada." }[est] }, 409);
    const motivo = tipo === "pausa" ? (MOTIVOS_PAUSA.includes(body.motivo) ? String(body.motivo) : "") : "";
    if (tipo === "pausa" && !motivo) return json({ error: "Elige el motivo de la pausa." }, 400);
    if (tipo === "reanudar") {
      const activo = (await tstore().get("activo/" + t.uid).catch(() => null)) as string | null;
      if (activo && activo !== "T:" + t.id) { const otro = activo.startsWith("T:") ? null : ((await tstore().get("f/" + activo, { type: "json" }).catch(() => null)) as any); if (otro?.f3 && estadoTiempo(otro.f3.eventos) === "trabajando") return json({ error: `Tienes en marcha la orden ${otro.num}. Ponla en pausa antes de reanudar esta.` }, 409); }
    }
    const evento = { tipo: tipo as "pausa" | "reanudar" | "fin", t: ahora(), por: q.uid, motivo, nota: str(body.nota, 200) };
    if (tipo !== "fin") {
      t.eventos.push(evento); await guardarTarea(t);
      if (tipo === "reanudar") await tstore().set("activo/" + t.uid, "T:" + t.id); else { const a = await tstore().get("activo/" + t.uid).catch(() => null); if (a === "T:" + t.id) await tstore().delete("activo/" + t.uid); }
      return json({ ok: true, ahora: ahora(), tarea: await vistaTarea(t) });
    }
    // ----- terminar: desviación, causas A-I y firma con PIN -----
    const simulada: Tarea = { ...t, eventos: [...t.eventos, evento] };
    const c = await calculoTarea(simulada);
    let just: Tarea["justificacion"] = null;
    if (c.exigeJustificacion) {
      const codigos = (Array.isArray(body.codigos) ? body.codigos : []).map(String).filter((x: string) => CAUSAS_OK.test(x)).slice(0, 9), explicacion = str(body.explicacion, 600);
      if (!codigos.length || explicacion.length < 5 || (codigos.includes("I") && explicacion.length < 5)) return json({ error: `Te has pasado ${c.desvPct > 0 ? "+" : ""}${c.desvPct} % (${c.desvMin > 0 ? "+" : ""}${c.desvMin} min) del tiempo calculado: marca la causa (A a I) y escribe una explicación para poder cerrar.`, exige: true, calc: { netoMin: c.netoMin, desvPct: c.desvPct, desvMin: c.desvMin } }, 409);
      just = { codigos, explicacion, t: ahora(), por: q.uid };
    }
    let pin = false;
    if (q.uid !== "gerente") { // el gerente que entra con la contraseña del panel ya se ha identificado; el equipo firma con su PIN
      if ((await pinFallos(q.uid)) >= 5) return json({ error: "Demasiados PIN erróneos. Espera 10 minutos o pídeselo al gerente." }, 429);
      const persona = (await leerEquipo()).find((x) => x.id === q.uid);
      if (!body.pin || !pinOk(String(body.pin), persona?.pin)) { await pinFallos(q.uid, true); return json({ error: "PIN incorrecto. Es el mismo con el que entras al panel.", pin: true }, 403); }
      pin = true;
    }
    t.eventos.push(evento); t.justificacion = just;
    t.cierre = { t: evento.t, por: q.nombre, pin, netoMin: c.netoMin, desvPct: c.desvPct, desvMin: c.desvMin };
    await guardarTarea(t);
    const a = await tstore().get("activo/" + t.uid).catch(() => null); if (a === "T:" + t.id) await tstore().delete("activo/" + t.uid);
    // El tiempo neto pasa solo a las horas de la ficha del coche
    const fv = await leerFicha(t.vehiculo);
    if (fv && c.netoMin >= 1) {
      const cfg = await leerCfg();
      fv.horas.push({ id: rid(), t: ahora(), fecha: hoyCanarias(), uid: t.uid, nombre: t.nombre, min: c.netoMin, nota: `${TIPOS_TAREA[t.tipo]} (fichaje de tarea)`, costeHora: cfg.costeHora, anulada: null });
      fv.actualizaciones.push(act({ uid: q.uid, nombre: q.nombre, rol: q.rol }, "sistema", `Tarea terminada: ${TIPOS_TAREA[t.tipo]}, ${c.netoMin} min netos (${c.desvPct > 0 ? "+" : ""}${c.desvPct} % sobre lo calculado)`));
      await guardarFicha(fv);
    }
    await anotar("vehiculos", q, "tarea-fin", { ref: t.ref, tipo: t.tipo, netoMin: c.netoMin, desvPct: c.desvPct, causas: just?.codigos || [], pin });
    return json({ ok: true, ahora: ahora(), tarea: await vistaTarea(t), pendienteVisto: !!just });
  }

  const f = await leerFicha(id); if (!f) return json({ error: "Ficha no encontrada." }, 404);
  const yo = { uid: q.uid, nombre: q.nombre, rol: q.rol };

  if (accion === "editar") {
    if (!alta) return json({ error: "Solo el gerente o recepción editan los datos del coche." }, 403);
    if (f.fase === "vendido" && !q.admin) return json({ error: "El coche ya está vendido." }, 409);
    const antes = JSON.stringify([f.matricula, f.marca, f.modelo, f.compra, f.precioPrevisto, f.coche]);
    if ("matricula" in body) f.matricula = str(body.matricula, 12).toUpperCase();
    if ("vin" in body) f.vin = str(body.vin, 24).toUpperCase();
    if ("marca" in body && str(body.marca, 40).length >= 2) f.marca = str(body.marca, 40);
    if ("modelo" in body && str(body.modelo, 60)) f.modelo = str(body.modelo, 60);
    if ("version" in body) f.version = str(body.version, 60);
    if ("color" in body) f.color = str(body.color, 30);
    if ("danos" in body) f.danos = str(body.danos, 1000);
    if ("anio" in body) f.anio = Math.min(2100, Math.max(0, Math.trunc(Number(body.anio)) || 0));
    if ("km" in body) f.km = Math.min(2e6, Math.max(0, Math.trunc(Number(body.km)) || 0));
    if (q.admin) {
      if ("compra" in body) { const c = cent(body.compra); if (!Number.isFinite(c) || c < 0) return json({ error: "El precio de compra no es válido." }, 400); f.compra = c; }
      if ("precioPrevisto" in body) { const c = cent(body.precioPrevisto); if (!Number.isFinite(c) || c < 0) return json({ error: "El precio previsto no es válido." }, 400); f.precioPrevisto = c; }
      if ("coche" in body) {
        const cid = str(body.coche, 80);
        if (cid) {
          const car = (await nombresCoches()).get(cid); if (!car) return json({ error: "Ese coche de la web ya no existe." }, 404);
          if ((await listarFichas()).some((x) => x.id !== f.id && x.coche === cid)) return json({ error: "Ese coche de la web ya está enlazado a otra ficha." }, 409);
        }
        f.coche = cid;
      }
    }
    await guardarFicha(f);
    await anotar("vehiculos", q, "editar", { ref: f.ref, cambios: antes !== JSON.stringify([f.matricula, f.marca, f.modelo, f.compra, f.precioPrevisto, f.coche]) });
    return json({ ok: true, ficha: vista(f, q.admin, txtCoche((await nombresCoches()).get(f.coche))) });
  }

  // ================= FASES =================
  if (accion === "fase") {
    const a = f.fase, b = String(body.fase || "") as Fase, nota = str(body.nota, 400);
    if (!FASES.includes(b) || a === b) return json({ error: "Elige otra fase." }, 400);
    if (a === "vendido") return json({ error: "Un coche vendido no cambia de fase." }, 409);
    const ok: Record<string, Fase[]> = { entrada: ["reparacion"], reparacion: ["calidad"], calidad: ["listo", "reparacion"], listo: ["reparacion", "vendido"] };
    if (!(ok[a] || []).includes(b)) return json({ error: `Desde «${FASE_TXT[a]}» no se puede pasar a «${FASE_TXT[b]}». Sigue el orden del flujo.` }, 409);
    if (b === "listo") {
      // Mismo criterio que el FORM-04: quien ha reparado no firma su propio control de calidad (el gerente sí puede)
      if (!(q.admin || q.rol === "calidad")) return json({ error: "Solo Calidad o el gerente pasan un coche a «Listo para venta»." }, 403);
      if (!q.admin && f.horas.some((h) => !h.anulada && h.uid === q.uid)) return json({ error: "Has trabajado en este coche: el control de calidad lo firma otra persona." }, 403);
      if (f.costes.some((c) => c.estado === "pendiente" && !c.anulado)) return json({ error: "Hay costes pendientes de aprobar. El gerente debe aprobarlos o rechazarlos antes." }, 409);
    }
    if (b === "vendido") {
      if (!q.admin) return json({ error: "Marcar un coche como vendido lo hace el gerente." }, 403);
      const base = cent(body.base);
      const car = f.coche ? (await nombresCoches()).get(f.coche) : undefined;
      if (car && car.estado !== "vendido") return json({ error: "Este coche está enlazado a la web y aún no figura como vendido. Márcalo «Vendido» en Coches y registra la venta en Finanzas primero." }, 409);
      if (!car && (!Number.isFinite(base) || base <= 0)) return json({ error: "Escribe el precio de venta (sin IGIC) para calcular el beneficio." }, 400);
      f.vendido = { fecha: fecha(body.fecha) || hoyCanarias(), base: car ? f.precioPrevisto : base };
    }
    if ((a === "calidad" && b === "reparacion") && nota.length < 8) return json({ error: "Explica qué hay que repetir (mínimo 8 letras)." }, 400);
    if (a === "listo" && b === "reparacion" && !q.admin) return json({ error: "Reabrir un coche «Listo» lo hace el gerente." }, 403);
    if (a === "listo" && b === "reparacion" && nota.length < 8) return json({ error: "Explica por qué se reabre (mínimo 8 letras)." }, 400);
    f.fase = b;
    if (b === "listo") f.ultimaCalidad = { t: ahora(), uid: q.uid, nombre: q.nombre };
    f.actualizaciones.push(act(yo, "fase", `${FASE_TXT[a]} → ${FASE_TXT[b]}${nota ? ". " + nota : ""}`));
    await guardarFicha(f);
    await anotar("vehiculos", q, "fase", { ref: f.ref, de: a, a: b, nota });
    return json({ ok: true, ficha: vista(f, q.admin, txtCoche((await nombresCoches()).get(f.coche))) });
  }

  if (f.fase === "vendido") return json({ error: "El coche ya está vendido: la ficha queda cerrada." }, 409);

  // ================= NOTAS Y FOTOS =================
  if (accion === "nota") {
    const txt = str(body.txt, 1500), fotos: string[] = (Array.isArray(body.fotos) ? body.fotos : []).filter(esFoto).slice(0, 8);
    if (!txt && !fotos.length) return json({ error: "Escribe una nota o añade una foto." }, 400);
    const tipo = body.tipo === "tecnica" ? "tecnica" : fotos.length && !txt ? "foto" : "nota";
    f.actualizaciones.push(act(yo, tipo, txt, fotos));
    await guardarFicha(f);
    await anotar("vehiculos", q, "nota", { ref: f.ref, tipo, fotos: fotos.length });
    return json({ ok: true, ficha: vista(f, q.admin, txtCoche((await nombresCoches()).get(f.coche))) });
  }

  // ================= HORAS =================
  if (accion === "horas") {
    const min = Math.round(Number(String(body.horas ?? "").replace(",", ".")) * 60 + (Number(body.min) || 0));
    if (!Number.isFinite(min) || min < 5 || min > 16 * 60) return json({ error: "Pon las horas trabajadas (entre 5 minutos y 16 horas)." }, 400);
    const dia = fecha(body.fecha) || hoyCanarias();
    if (dia > hoyCanarias()) return json({ error: "No se pueden anotar horas de un día futuro." }, 400);
    if (!q.admin && dia < new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10)) return json({ error: "Solo puedes anotar horas de los últimos 7 días. Pídeselo al gerente." }, 400);
    const cfg = await leerCfg();
    f.horas.push({ id: rid(), t: ahora(), fecha: dia, uid: q.uid, nombre: q.nombre, min, nota: str(body.nota, 200), costeHora: cfg.costeHora, anulada: null });
    if (f.fase === "entrada") { f.fase = "reparacion"; f.actualizaciones.push(act(yo, "fase", `${FASE_TXT.entrada} → ${FASE_TXT.reparacion} (primeras horas anotadas)`)); }
    await guardarFicha(f);
    await anotar("vehiculos", q, "horas", { ref: f.ref, min, dia });
    return json({ ok: true, ficha: vista(f, q.admin, txtCoche((await nombresCoches()).get(f.coche))) });
  }

  // ================= OTROS COSTES (con aprobación del gerente) =================
  if (accion === "coste") {
    const concepto = str(body.concepto, 160), importe = cent(body.importe);
    if (concepto.length < 4) return json({ error: "Explica el gasto (mínimo 4 letras): pintura, grúa, tasas…" }, 400);
    if (!Number.isFinite(importe) || importe <= 0 || importe > 5_000_000) return json({ error: "Pon un importe válido, sin IGIC." }, 400);
    const aprobado = q.admin;
    f.costes.push({ id: rid(), t: ahora(), fecha: fecha(body.fecha) || hoyCanarias(), uid: q.uid, nombre: q.nombre, concepto, importe, estado: aprobado ? "aprobado" : "pendiente", decidido: aprobado ? { t: ahora(), por: q.nombre, motivo: "Anotado por el gerente" } : null, anulado: null });
    f.actualizaciones.push(act(yo, "sistema", aprobado ? `Coste anotado: ${concepto}` : `Coste propuesto, pendiente del gerente: ${concepto}`));
    await guardarFicha(f);
    await anotar("vehiculos", q, "coste", { ref: f.ref, concepto, importe, estado: aprobado ? "aprobado" : "pendiente" });
    return json({ ok: true, ficha: vista(f, q.admin, txtCoche((await nombresCoches()).get(f.coche))) });
  }
  if (accion === "decidir") {
    if (!q.admin) return json({ error: "Aprobar costes es solo del gerente." }, 403);
    const c = f.costes.find((x) => x.id === sub); if (!c || c.anulado) return json({ error: "Coste no encontrado." }, 404);
    if (c.estado !== "pendiente") return json({ error: "Ese coste ya estaba decidido." }, 409);
    const ap = body.decision === "aprobar", motivo = str(body.motivo, 200);
    if (!ap && motivo.length < 4) return json({ error: "Explica por qué se rechaza." }, 400);
    c.estado = ap ? "aprobado" : "rechazado"; c.decidido = { t: ahora(), por: q.nombre, motivo };
    f.actualizaciones.push(act(yo, "sistema", `Coste ${ap ? "aprobado" : "rechazado"}: ${c.concepto}${motivo ? ". " + motivo : ""}`));
    await guardarFicha(f);
    await anotar("vehiculos", q, ap ? "coste-aprobado" : "coste-rechazado", { ref: f.ref, concepto: c.concepto, importe: c.importe, motivo });
    return json({ ok: true, ficha: vista(f, true, txtCoche((await nombresCoches()).get(f.coche))) });
  }
  if (accion === "anular") {
    if (!q.admin) return json({ error: "Anular es solo del gerente. Queda todo registrado." }, 403);
    const motivo = str(body.motivo, 200); if (motivo.length < 8) return json({ error: "Explica el motivo (mínimo 8 letras)." }, 400);
    const x = sub === "horas" ? f.horas.find((h) => h.id === sub2) : sub === "coste" ? f.costes.find((c) => c.id === sub2) : undefined;
    if (!x) return json({ error: "No encontrado." }, 404);
    if (x.anulada || (x as any).anulado) return json({ error: "Ya estaba anulado." }, 409);
    if (sub === "horas") (x as any).anulada = { t: ahora(), por: q.nombre, motivo }; else (x as any).anulado = { t: ahora(), por: q.nombre, motivo };
    f.actualizaciones.push(act(yo, "sistema", `Anulado (${sub === "horas" ? "horas" : "coste"}): ${motivo}`));
    await guardarFicha(f);
    await anotar("vehiculos", q, "anular-" + sub, { ref: f.ref, id: sub2, motivo });
    return json({ ok: true, ficha: vista(f, true, txtCoche((await nombresCoches()).get(f.coche))) });
  }
  return json({ error: "No existe esa acción." }, 404);
};

export const config: Config = {
  path: ["/api/vehiculos/:accion", "/api/vehiculos/:accion/:id", "/api/vehiculos/:accion/:id/:sub", "/api/vehiculos/:accion/:id/:sub/:dato"],
  rateLimit: { windowLimit: 180, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
