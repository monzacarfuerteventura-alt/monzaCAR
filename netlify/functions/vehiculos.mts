import type { Config } from "@netlify/functions";
import { store, json, mismoOrigen, type Car } from "../lib/shared.mts";
import { quien, hoyCanarias } from "../lib/taller.mts";
import { exigirJornada } from "../lib/jornada.mts";
import { anotar, leerLibro } from "../lib/libro.mts";
import {
  FASES, FASE_TXT, rid, ahora, leerCfg, leerFicha, guardarFicha, listarFichas, siguienteRef, desglose, minTotal, v,
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
