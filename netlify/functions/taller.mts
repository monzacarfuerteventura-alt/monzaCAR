import type { Config as NConfig, Context } from "@netlify/functions";
import { store, json, mismoOrigen } from "../lib/shared.mts";
import {
  quien, tstore, leerConfig, leerEquipo, hashPin, CONFIG_DEFECTO, ROLES, F2_IDS, F4_A, F4_B, F4_C, F4_D, MOTIVOS_PAUSA,
  calculo, resumenF2, estadoTiempo, tramos, hoyCanarias, horaCanarias,
  type Quien, type Persona, type Fichas, type F1, type F2, type F3, type F4, type Evento,
} from "../lib/taller.mts";

/*
  TALLER · SOP-01 (FORM-01 recepción, FORM-02 inspección 360°, FORM-03 tiempos, FORM-04 calidad)
  GET  /api/taller/yo                       → quién soy (gerente o persona del equipo)
  GET/PUT /api/taller/config                → tarifa, jornada y umbrales (PUT solo gerente)
  GET/POST /api/taller/equipo · PUT/DELETE /api/taller/equipo/:id   (solo gerente; el equipo ve nombres)
  POST /api/taller/recepcion                → nueva orden con su FORM-01
  GET  /api/taller/fichas/:token            → las 4 fichas de una orden
  PUT  /api/taller/fichas/:token/f1|f2|f4   → guardar (con "cerrar": true se firma y se bloquea)
  POST /api/taller/fichas/:token/f3         → datos, fichaje (hora del servidor), justificación, visto bueno, corrección
  POST /api/taller/fichas/:token/reabrir    → solo gerente, queda en la auditoría
  GET  /api/taller/resumen?desde&hasta      → rendimiento, pausas, alertas y auditoría (solo gerente)
  Los fichajes se guardan con la hora del servidor: nadie puede escribir una hora a mano.
  Solo el gerente puede corregir una hora, con motivo, y la hora original queda guardada.
*/

const str = (v: unknown, max = 200) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const fechaISO = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");
const num = (v: unknown, max = 1e7) => { const n = Number(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? Math.min(max, Math.max(0, Math.round(n * 100) / 100)) : 0; };
const uno = (v: unknown, l: string[]) => (l.includes(String(v)) ? String(v) : "");
const esFoto = (k: unknown) => typeof k === "string" && /^[a-z0-9-]+\.(jpg|webp|png)$/.test(k);
const firmaPng = (v: unknown) => (typeof v === "string" && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(v) && v.length < 90000 ? v : "");
const TOKEN = /^[A-Za-z0-9]{16}$/;
const ordenes = () => store("ordenes");

async function leerFichas(token: string): Promise<Fichas> {
  return ((await tstore().get("f/" + token, { type: "json" })) as Fichas | null) || { token, num: "", f1: null, f2: null, f3: null, f4: null, audit: [] };
}
function auditar(f: Fichas, q: Quien, accion: string, detalle = "") {
  f.audit.push({ t: new Date().toISOString(), por: q.uid, nombre: q.nombre, rol: q.rol, accion, detalle: detalle.slice(0, 400) });
  if (f.audit.length > 400) f.audit = f.audit.slice(-400);
}
async function nuevoNumero() {
  const y = hoyCanarias().slice(0, 4), s = tstore();
  const n = (Number(await s.get("contador/" + y).catch(() => 0)) || 0) + 1;
  await s.set("contador/" + y, String(n));
  return `VC-${y}-${String(n).padStart(4, "0")}`;
}
function nuevoToken() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return [...crypto.getRandomValues(new Uint8Array(16))].map((x) => abc[x % abc.length]).join("");
}
const firma = (q: Quien) => ({ uid: q.uid, nombre: q.nombre, t: new Date().toISOString() });

// Guarda las fichas y deja en la orden un resumen (para la tabla, el tablero y las alertas)
async function guardar(f: Fichas, o: any, cambioEstado?: { estado: string; nota: string }) {
  const cfg = await leerConfig();
  const c = calculo(f.f3, cfg), r2 = resumenF2(f.f2);
  const t = new Date().toISOString();
  o.num = f.num;
  o.fichas = {
    f1: f.f1 ? { cerrada: f.f1.cerrada, danos: f.f1.danos.length, tipo: f.f1.tipoEntrada } : null,
    f2: r2 ? { ...r2, rechazoFirmado: !!f.f2?.rechazoFirmado, mecanico: f.f2?.mecanico || "" } : null,
    f3: f.f3 && c ? { mecanico: f.f3.mecanico, estado: c.estado, netoMin: c.netoMin, estMin: f.f3.estMin, desvPct: c.desvPct, desvMin: c.desvMin, exige: c.exigeJustificacion, justificada: c.justificada, aprobada: c.aprobada, desde: [...f.f3.eventos].sort((a, b) => a.t.localeCompare(b.t)).pop()?.t || "" } : null,
    f4: f.f4 ? { resultado: f.f4.resultado, destino: f.f4.destino, firmada: !!f.f4.firma, cierre: !!f.f4.cierreGerente, intentos: f.f4.intentos } : null,
  };
  if (cambioEstado && cambioEstado.estado !== o.estado) { o.estado = cambioEstado.estado; o.pasos.push({ estado: cambioEstado.estado, t, nota: cambioEstado.nota }); }
  o.actualizado = t;
  await tstore().setJSON("f/" + f.token, f);
  await ordenes().setJSON("o/" + o.token, o);
}

// ---------- limpieza de cada ficha ----------
const INVENTARIO = ["llaves", "repuesto", "gato", "baliza", "documentacion", "radio", "valor", "personales"];
function limpiarF1(x: any, prev: F1 | null): F1 {
  const c = x?.cliente || {}, v = x?.vehiculo || {};
  const inv: F1["inventario"] = {};
  for (const k of INVENTARIO) inv[k] = { v: uno(x?.inventario?.[k]?.v, ["si", "no"]), nota: str(x?.inventario?.[k]?.nota, 120) };
  return {
    fecha: prev?.fecha || hoyCanarias(), hora: prev?.hora || horaCanarias(),
    cliente: { nombre: str(c.nombre, 80), doc: str(c.doc, 20).toUpperCase(), telefono: str(c.telefono, 30), email: str(c.email, 120), titular: uno(c.titular, ["si", "no"]), contacto: uno(c.contacto, ["whatsapp", "llamada", "correo"]) },
    recibidoPor: str(x?.recibidoPor, 60), entregaPrometida: fechaISO(x?.entregaPrometida), tipoEntrada: uno(x?.tipoEntrada, ["reparacion", "compra", "retoma"]),
    vehiculo: { matricula: str(v.matricula, 12).toUpperCase(), marcaModelo: str(v.marcaModelo, 80), vin: str(v.vin, 17).toUpperCase(), anioColor: str(v.anioColor, 40), km: str(v.km, 10).replace(/[^\d]/g, ""), kmFoto: esFoto(v.kmFoto) ? v.kmFoto : "", itv: fechaISO(v.itv), combustible: uno(v.combustible, ["Gasolina", "Diésel", "Híbrido", "Eléctrico", "GLP"]), nivel: uno(v.nivel, ["reserva", "1/4", "1/2", "3/4", "lleno"]), testigos: str(v.testigos, 200) },
    motivo: str(x?.motivo, 1500), inventario: inv, llaves: str(x?.llaves, 3).replace(/[^\d]/g, ""),
    danos: (Array.isArray(x?.danos) ? x.danos : []).map((d: any) => ({ v: uno(d?.v, ["frontal", "izq", "techo", "dcho", "trasera"]), x: Math.min(100, Math.max(0, Math.round(Number(d?.x) || 0))), y: Math.min(100, Math.max(0, Math.round(Number(d?.y) || 0))), t: uno(d?.t, ["R", "A", "P", "G", "S", "O"]) })).filter((d: any) => d.v && d.t).slice(0, 60),
    fotosDanos: (Array.isArray(x?.fotosDanos) ? x.fotosDanos : []).filter(esFoto).slice(0, 30), sinDanos: !!x?.sinDanos,
    autorizoHasta: str(x?.autorizoHasta, 10).replace(/[^\d.,]/g, ""), avisosWhatsApp: !!x?.avisosWhatsApp,
    firmaCliente: firmaPng(x?.firmaCliente) || prev?.firmaCliente || "", firmadoCliente: prev?.firmadoCliente || "",
    firmaTaller: prev?.firmaTaller || null, cerrada: prev?.cerrada || false,
  };
}
function faltaF1(f: F1): string {
  if (f.cliente.nombre.length < 2) return "Falta el nombre del cliente.";
  if (f.cliente.telefono.replace(/[^\d]/g, "").length < 9) return "Falta el teléfono del cliente.";
  if (!f.vehiculo.matricula) return "Falta la matrícula.";
  if (!f.vehiculo.marcaModelo) return "Falta la marca y el modelo.";
  if (!f.vehiculo.km) return "Falta el kilometraje de entrada.";
  if (!f.vehiculo.nivel) return "Marca el nivel de combustible.";
  if (!f.motivo) return "Escribe el motivo de entrada con las palabras del cliente.";
  if (f.cliente.titular === "no" && !f.motivo.toLowerCase().includes("autoriz")) return "El cliente no es el titular: anota en el motivo que trae la autorización.";
  if (INVENTARIO.some((k) => !f.inventario[k].v)) return "Completa el inventario de objetos (Sí / No en cada línea).";
  if (!f.danos.length && !f.sinDanos) return "Marca los daños previos en el dibujo o la casilla «Sin daños previos».";
  if (f.danos.length && !f.fotosDanos.length) return "Hay daños marcados: haz al menos una foto de los daños.";
  if (!f.firmaCliente) return "Falta la firma del cliente.";
  return "";
}
function limpiarF2(x: any, prev: F2 | null, q: Quien): F2 {
  const items: F2["items"] = {};
  for (const id of F2_IDS) { const i = x?.items?.[id] || {}; items[id] = { e: uno(i.e, ["ok", "a", "r", "na"]) as any, nota: str(i.nota, 300), extra: str(i.extra, 80), fotos: (Array.isArray(i.fotos) ? i.fotos : []).filter(esFoto).slice(0, 6) }; }
  return { mecanico: prev?.mecanico || q.uid, items, horasEst: num(x?.horasEst, 200), recomendacion: uno(x?.recomendacion, ["reparar", "reservas", "no-recomendable"]), rechazoFirmado: !!x?.rechazoFirmado, firma: prev?.firma || null, cerrada: prev?.cerrada || false, inicio: prev?.inicio || new Date().toISOString() };
}
function faltaF2(f: F2): string {
  const sin = F2_IDS.filter((id) => !f.items[id].e);
  if (sin.length) return `Faltan ${sin.length} puntos por revisar: una casilla por línea (usa NA si no aplica).`;
  const sinNota = F2_IDS.filter((id) => ["a", "r"].includes(f.items[id].e) && !f.items[id].nota);
  if (sinNota.length) return "Todo Ámbar o Rojo lleva nota: faltan " + sinNota.length + ".";
  if (!f.horasEst) return "Escribe las horas estimadas de trabajo.";
  if (!f.recomendacion) return "Elige la recomendación.";
  return "";
}
function limpiarF4(x: any, prev: F4 | null): F4 {
  const items: F4["items"] = {}, notas: Record<string, string> = {};
  for (const [id] of [...F4_A, ...F4_B, ...F4_C, ...F4_D]) { items[id] = uno(x?.items?.[id], ["si", "no", "na"]) as any; const n = str(x?.notas?.[id], 160); if (n) notas[id] = n; }
  return { destino: uno(x?.destino, ["cliente", "venta"]), items, notas, resultado: uno(x?.resultado, ["aprobado", "observaciones", "rechazado"]), motivo: str(x?.motivo, 800), firma: null, cierreGerente: prev?.cierreGerente || null, intentos: prev?.intentos || 0 };
}
function faltaF4(f: F4): string {
  if (!f.destino) return "Elige el destino del coche: entrega a cliente o inventario de venta.";
  const lista = [...F4_A, ...F4_B, ...(f.destino === "cliente" ? F4_C : F4_D)];
  const sin = lista.filter(([id]) => !f.items[id]);
  if (sin.length) return `Faltan ${sin.length} puntos por comprobar.`;
  const hayNo = lista.some(([id]) => f.items[id] === "no");
  if (hayNo && f.resultado !== "rechazado") return "Hay algún NO: el coche vuelve a taller (resultado «Rechazado») y hay que anotar la causa.";
  if (!f.resultado) return "Elige el resultado.";
  if (f.resultado !== "aprobado" && !f.motivo) return "Escribe el motivo u observaciones.";
  return "";
}

// ---------- rendimiento (dashboard) ----------
function laborables(desde: string, hasta: string, cerrados: Set<string>) {
  const out: string[] = []; const fin = Math.min(Date.parse(hasta + "T12:00:00Z"), Date.parse(hoyCanarias() + "T12:00:00Z"));
  for (let t = Date.parse(desde + "T12:00:00Z"); t <= fin; t += 864e5) { const d = new Date(t), w = d.getUTCDay(), f = d.toISOString().slice(0, 10); if (w > 0 && w < 6 && !cerrados.has(f)) out.push(f); }
  return out;
}
async function resumen(desde: string, hasta: string) {
  const [cfg, equipo] = await Promise.all([leerConfig(), leerEquipo()]);
  const cerrados = new Set(((await store("solicitudes").get("config/bloqueos", { type: "json" }).catch(() => null)) as string[] | null) || []);
  const [lf, lo] = await Promise.all([tstore().list({ prefix: "f/" }), ordenes().list({ prefix: "o/" })]);
  const fichas = (await Promise.all(lf.blobs.map((b) => tstore().get(b.key, { type: "json" }) as Promise<Fichas | null>))).filter(Boolean) as Fichas[];
  const ords = new Map(((await Promise.all(lo.blobs.map((b) => ordenes().get(b.key, { type: "json" })))) as any[]).filter(Boolean).map((o) => [o.token, o]));
  const nombre = (uid: string) => uid === "gerente" ? "Gerente" : equipo.find((p) => p.id === uid)?.nombre || "—";
  const dentro = (t: number) => { const d = hoyCanarias(new Date(t)); return d >= desde && d <= hasta; };
  const porMec: Record<string, { uid: string; nombre: string; prodMin: number; pagadoMin: number; ordenes: number; desv: number[]; facturable: number; retrabajos: number }> = {};
  const mec = (uid: string) => (porMec[uid] ||= { uid, nombre: nombre(uid), prodMin: 0, pagadoMin: 0, ordenes: 0, desv: [], facturable: 0, retrabajos: 0 });
  const pausas: Record<string, { min: number; n: number }> = {};
  const alertas: { tipo: string; nivel: string; token: string; num: string; txt: string }[] = [];
  const enMarcha: { uid: string; nombre: string; token: string; num: string; coche: string; estado: string; desde: string; netoMin: number; estMin: number }[] = [];
  const auditoria: any[] = [];
  let calidadPrimera = 0, calidadTotal = 0;
  for (const f of fichas) {
    const o = ords.get(f.token); if (!o) continue;
    const coche = [o.vehiculo?.coche, o.vehiculo?.matricula].filter(Boolean).join(" · ");
    const c = calculo(f.f3, cfg);
    if (f.f3) {
      for (const tr of tramos(f.f3.eventos)) {
        if (!dentro(tr.ini)) continue;
        const min = (tr.fin - tr.ini) / 6e4;
        if (tr.trabajo) mec(f.f3.mecanico || tr.por).prodMin += min;
        else { const m = tr.motivo || "Otro"; (pausas[m] ||= { min: 0, n: 0 }).min += min; pausas[m].n++; }
      }
      const fin = [...f.f3.eventos].filter((e) => e.tipo === "fin").pop();
      if (fin && dentro(Date.parse(fin.t)) && c && f.f3.mecanico) {
        const m = mec(f.f3.mecanico); m.ordenes++; m.facturable += c.manoObra; if (f.f3.estMin) m.desv.push(c.desvPct); m.retrabajos += f.f3.retrabajos.length;
      }
      if (c && (c.estado === "trabajando" || c.estado === "pausa")) enMarcha.push({ uid: f.f3.mecanico, nombre: nombre(f.f3.mecanico), token: f.token, num: f.num, coche, estado: c.estado, desde: [...f.f3.eventos].sort((a, b) => a.t.localeCompare(b.t)).pop()!.t, netoMin: c.netoMin, estMin: f.f3.estMin });
      if (c?.exigeJustificacion && !c.justificada) alertas.push({ tipo: "desviacion", nivel: "rojo", token: f.token, num: f.num, txt: `${coche}: ${c.desvPct > 0 ? "+" : ""}${c.desvPct} % sobre lo estimado sin justificar` });
      else if (c?.exigeJustificacion && !c.aprobada) alertas.push({ tipo: "visto-bueno", nivel: "ambar", token: f.token, num: f.num, txt: `${coche}: desviación justificada, falta el visto bueno del gerente` });
    }
    const r2 = resumenF2(f.f2), p = o.presupuesto;
    if (r2 && r2.rojos > 0 && o.estado !== "entregado" && !(p && p.estado === "aceptado") && !f.f2?.rechazoFirmado)
      alertas.push({ tipo: "rojo", nivel: "rojo", token: f.token, num: f.num, txt: `${coche}: ${r2.rojos} punto${r2.rojos > 1 ? "s" : ""} en ROJO sin presupuesto aceptado ni rechazo firmado` });
    if (o.estado === "calidad" && !(f.f4 && f.f4.firma)) alertas.push({ tipo: "calidad", nivel: "ambar", token: f.token, num: f.num, txt: `${coche}: terminado, pendiente de control de calidad (FORM-04)` });
    if (f.f4?.resultado === "rechazado" && o.estado !== "entregado" && c?.estado === "fin") alertas.push({ tipo: "rechazo", nivel: "rojo", token: f.token, num: f.num, txt: `${coche}: calidad rechazada, vuelve a taller` });
    if (f.f1 && !f.f1.cerrada && o.estado !== "entregado") alertas.push({ tipo: "f1", nivel: "ambar", token: f.token, num: f.num, txt: `${coche}: recepción sin firma del cliente` });
    if (f.f4?.firma && dentro(Date.parse(f.f4.firma.t))) { calidadTotal++; if ((f.f4.intentos || 0) <= 1 && f.f4.resultado !== "rechazado") calidadPrimera++; }
    for (const a of f.audit) if (["corregir-hora", "reabrir", "visto-bueno", "editar-cerrada", "tiempo-estimado"].includes(a.accion)) auditoria.push({ ...a, num: f.num, token: f.token, coche });
  }
  const dias = laborables(desde, hasta, cerrados);
  for (const p of equipo.filter((x) => x.activo && x.rol === "mecanico")) {
    const m = mec(p.id); m.pagadoMin = dias.filter((d) => d >= (p.alta || "2000-01-01")).length * (p.jornada || cfg.jornada) * 60;
  }
  const mecanicos = Object.values(porMec).map((m) => ({ ...m, prodMin: Math.round(m.prodMin), pct: m.pagadoMin ? Math.round((m.prodMin / m.pagadoMin) * 1000) / 10 : null, desvMedia: m.desv.length ? Math.round((m.desv.reduce((a, b) => a + b, 0) / m.desv.length) * 10) / 10 : null, facturable: Math.round(m.facturable * 100) / 100 }));
  return {
    desde, hasta, config: cfg, diasLaborables: dias.length, mecanicos,
    pausas: Object.entries(pausas).map(([motivo, v]) => ({ motivo, min: Math.round(v.min), n: v.n })).sort((a, b) => b.min - a.min),
    alertas, enMarcha, auditoria: auditoria.sort((a, b) => b.t.localeCompare(a.t)).slice(0, 40),
    calidad: { total: calidadTotal, primera: calidadPrimera },
  };
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const p = url.pathname.split("/").filter(Boolean); // api, taller, recurso, id, sub
  if (req.method !== "GET" && !mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
  const q = await quien(req);
  if (!q) return json({ error: "No autorizado" }, 401);
  const body = req.method === "GET" || req.method === "DELETE" ? {} : ((await req.json().catch(() => ({}))) as any);
  const recurso = p[2] || "";

  if (recurso === "yo") return json(q);

  if (recurso === "config") {
    if (req.method === "GET") return json(await leerConfig());
    if (!q.admin) return json({ error: "Solo el gerente puede cambiar esto." }, 403);
    const c = { tarifa: num(body.tarifa, 500) || CONFIG_DEFECTO.tarifa, jornada: num(body.jornada, 12) || CONFIG_DEFECTO.jornada, umbralPct: num(body.umbralPct, 100) || CONFIG_DEFECTO.umbralPct, umbralMin: num(body.umbralMin, 600) || CONFIG_DEFECTO.umbralMin, igic: num(body.igic, 30) };
    await tstore().setJSON("config", c);
    return json(c);
  }

  if (recurso === "equipo") {
    const eq = await leerEquipo();
    const publico = (x: Persona) => ({ id: x.id, nombre: x.nombre, usuario: q.admin ? x.usuario : undefined, rol: x.rol, jornada: x.jornada, activo: x.activo, alta: x.alta, caja: !!x.caja, conPin: !!x.pin });
    if (req.method === "GET") return json(eq.filter((x) => q.admin || x.activo).map(publico));
    if (!q.admin) return json({ error: "Solo el gerente gestiona el equipo." }, 403);
    const id = p[3] || "";
    const datos = (prev?: Persona): Persona | string => {
      const nombre = str(body.nombre ?? prev?.nombre, 40), usuario = str(body.usuario ?? prev?.usuario, 20).toLowerCase().replace(/[^a-z0-9._-]/g, "");
      if (nombre.length < 2) return "Escribe el nombre.";
      if (usuario.length < 3) return "El usuario necesita 3 letras o más (sin espacios).";
      if (eq.some((x) => x.usuario === usuario && x.id !== prev?.id)) return "Ese usuario ya existe.";
      const pin = String(body.pin ?? "");
      if (pin && !/^\d{6,8}$/.test(pin)) return "El PIN tiene que tener 6 a 8 números.";
      if (!prev && !pin) return "Pon un PIN de 6 números para que pueda entrar.";
      return { id: prev?.id || "u" + crypto.randomUUID().slice(0, 8), nombre, usuario, rol: (ROLES.includes(body.rol) ? body.rol : prev?.rol || "mecanico"), jornada: num(body.jornada ?? prev?.jornada, 12) || 8, activo: body.activo === undefined ? prev?.activo ?? true : !!body.activo, alta: fechaISO(body.alta) || prev?.alta || hoyCanarias(), caja: body.caja === undefined ? !!prev?.caja : body.caja === true || body.caja === "on" || body.caja === "1", pin: pin ? hashPin(pin) : prev?.pin };
    };
    if (req.method === "POST" && !id) { const r = datos(); if (typeof r === "string") return json({ error: r }, 400); eq.push(r); await tstore().setJSON("equipo", eq); return json(publico(r), 201); }
    const i = eq.findIndex((x) => x.id === id); if (i < 0) return json({ error: "No existe." }, 404);
    if (req.method === "PUT") { const r = datos(eq[i]); if (typeof r === "string") return json({ error: r }, 400); eq[i] = r; await tstore().setJSON("equipo", eq); return json(publico(r)); }
    if (req.method === "DELETE") { eq[i].activo = false; await tstore().setJSON("equipo", eq); return json({ ok: true }); } // se desactiva: sus fichajes siguen contando
    return json({ error: "Método no permitido" }, 405);
  }

  if (recurso === "resumen") {
    if (!q.admin) return json({ error: "Solo el gerente." }, 403);
    const hoy = hoyCanarias();
    const desde = fechaISO(url.searchParams.get("desde")) || hoy.slice(0, 8) + "01", hasta = fechaISO(url.searchParams.get("hasta")) || hoy;
    return json(await resumen(desde, hasta));
  }

  // ---------- nueva recepción (crea la orden) ----------
  if (recurso === "recepcion" && req.method === "POST") {
    if (!(q.admin || q.rol === "recepcion" || q.rol === "mecanico")) return json({ error: "No autorizado" }, 403);
    const t = new Date().toISOString(), token = nuevoToken();
    const f1 = limpiarF1(body, null);
    if (f1.cliente.nombre.length < 2) return json({ error: "Falta el nombre del cliente." }, 400);
    if (!f1.vehiculo.matricula) return json({ error: "Falta la matrícula." }, 400);
    if (!f1.recibidoPor) f1.recibidoPor = q.nombre;
    const o: any = {
      token, creado: t, actualizado: t, lead: str(body.lead, 40),
      cliente: { nombre: f1.cliente.nombre, telefono: f1.cliente.telefono, email: f1.cliente.email, idioma: body.idioma === "en" ? "en" : "es" },
      vehiculo: { coche: f1.vehiculo.marcaModelo, matricula: f1.vehiculo.matricula, km: f1.vehiculo.km },
      estado: "recibido", pasos: [{ estado: "recibido", t, nota: "" }], entrega: f1.entregaPrometida, fotos: [], mensaje: "", interno: "", presupuesto: null,
    };
    const f: Fichas = { token, num: await nuevoNumero(), f1, f2: null, f3: null, f4: null, audit: [] };
    auditar(f, q, "crear", "Recepción del coche " + f1.vehiculo.matricula);
    await guardar(f, o);
    return json({ orden: o, fichas: f }, 201);
  }

  // ---------- fichas de una orden ----------
  if (recurso !== "fichas") return json({ error: "No encontrado" }, 404);
  const token = p[3] || "", sub = p[4] || "";
  if (!TOKEN.test(token)) return json({ error: "Orden no encontrada" }, 404);
  const o = (await ordenes().get("o/" + token, { type: "json" })) as any;
  if (!o) return json({ error: "Orden no encontrada" }, 404);
  const f = await leerFichas(token);
  if (!f.num) f.num = await nuevoNumero();
  const cfg = await leerConfig();
  const salida = () => json({ orden: o, fichas: f, calculo: calculo(f.f3, cfg), config: cfg, ahora: new Date().toISOString() });

  if (req.method === "GET" && !sub) return salida();

  if (sub === "reabrir" && req.method === "POST") {
    if (!q.admin) return json({ error: "Solo el gerente puede reabrir una ficha firmada." }, 403);
    const cual = uno(body.ficha, ["f1", "f2", "f4"]), motivo = str(body.motivo, 300);
    if (!cual || motivo.length < 4) return json({ error: "Indica la ficha y el motivo." }, 400);
    const x: any = (f as any)[cual]; if (!x) return json({ error: "Esa ficha no existe todavía." }, 404);
    x.cerrada = false; if (cual === "f4") { x.firma = null; x.cierreGerente = null; }
    auditar(f, q, "reabrir", `${cual.toUpperCase()} reabierta: ${motivo}`);
    await guardar(f, o); return salida();
  }

  if (sub === "f1" && req.method === "PUT") {
    if (f.f1?.cerrada && !q.admin) return json({ error: "La recepción ya está firmada por el cliente. Solo el gerente puede cambiarla." }, 409);
    const nf = limpiarF1(body, f.f1);
    if (!nf.recibidoPor) nf.recibidoPor = q.nombre;
    if (f.f1?.cerrada) auditar(f, q, "editar-cerrada", "FORM-01 modificada después de firmada");
    if (body.cerrar && !nf.cerrada) {
      const falta = faltaF1(nf); if (falta) return json({ error: falta }, 400);
      nf.cerrada = true; nf.firmadoCliente = new Date().toISOString(); nf.firmaTaller = firma(q);
      auditar(f, q, "firmar", "FORM-01 firmada por el cliente");
    } else auditar(f, q, "guardar", "FORM-01 guardada");
    f.f1 = nf;
    o.cliente = { ...o.cliente, nombre: nf.cliente.nombre || o.cliente.nombre, telefono: nf.cliente.telefono || o.cliente.telefono, email: nf.cliente.email || o.cliente.email };
    o.vehiculo = { coche: nf.vehiculo.marcaModelo || o.vehiculo.coche, matricula: nf.vehiculo.matricula || o.vehiculo.matricula, km: nf.vehiculo.km || o.vehiculo.km };
    if (nf.entregaPrometida) o.entrega = nf.entregaPrometida;
    await guardar(f, o); return salida();
  }

  if (sub === "f2" && req.method === "PUT") {
    if (f.f2?.cerrada && !q.admin) return json({ error: "La inspección ya está firmada. Solo el gerente puede reabrirla." }, 409);
    if (q.rol === "recepcion" && !q.admin) return json({ error: "La inspección la hace un mecánico." }, 403);
    const nf = limpiarF2(body, f.f2, q);
    let cambio: { estado: string; nota: string } | undefined = !f.f2 && ["recibido"].includes(o.estado) ? { estado: "diagnostico", nota: "" } : undefined;
    if (body.cerrar && !nf.cerrada) {
      const falta = faltaF2(nf); if (falta) return json({ error: falta }, 400);
      nf.cerrada = true; nf.firma = firma(q);
      const r = resumenF2(nf)!;
      auditar(f, q, "firmar", `FORM-02 firmada: ${r.rojos} rojos, ${r.ambar} ámbar, ${nf.horasEst} h estimadas`);
      if (!f.f3) f.f3 = { mecanico: "", tarifa: cfg.tarifa, estMin: Math.round(nf.horasEst * 60), tipo: "reparacion", hoja: "1 de 1", eventos: [], justificacion: null, vistoBueno: null, retrabajos: [] };
      else if (!f.f3.eventos.length) f.f3.estMin = Math.round(nf.horasEst * 60);
      if (r.rojos + r.ambar > 0 && !(o.presupuesto && o.presupuesto.estado === "aceptado") && ["recibido", "diagnostico"].includes(o.estado)) cambio = { estado: "presupuesto", nota: "Inspección terminada: preparando presupuesto" };
    } else auditar(f, q, "guardar", "FORM-02 guardada");
    f.f2 = nf;
    await guardar(f, o, cambio); return salida();
  }

  if (sub === "f3" && req.method === "POST") {
    const acc = str(body.accion, 20);
    f.f3 ||= { mecanico: "", tarifa: cfg.tarifa, estMin: 0, tipo: "reparacion", hoja: "1 de 1", eventos: [], justificacion: null, vistoBueno: null, retrabajos: [] };
    const f3 = f.f3 as F3, estado = estadoTiempo(f3.eventos), empezado = f3.eventos.length > 0;
    if (acc === "datos") {
      if (!q.admin && empezado && (body.estMin !== undefined && Math.round(num(body.estMin, 6000)) !== f3.estMin)) return json({ error: "El tiempo estimado ya no se puede cambiar: el trabajo ha empezado. Pídeselo al gerente." }, 403);
      if (!q.admin && body.mecanico !== undefined && f3.mecanico && body.mecanico !== f3.mecanico) return json({ error: "Solo el gerente puede cambiar el mecánico asignado." }, 403);
      if (!q.admin && body.tarifa !== undefined && num(body.tarifa, 500) !== f3.tarifa) return json({ error: "Solo el gerente puede cambiar la tarifa." }, 403);
      const antesEst = f3.estMin;
      if (body.mecanico !== undefined) { const eq = await leerEquipo(); f3.mecanico = body.mecanico === "gerente" || eq.some((x) => x.id === body.mecanico) ? String(body.mecanico) : ""; }
      if (body.tarifa !== undefined) f3.tarifa = num(body.tarifa, 500);
      if (body.estMin !== undefined) f3.estMin = Math.round(num(body.estMin, 6000));
      if (body.tipo !== undefined) f3.tipo = uno(body.tipo, ["inspeccion", "mantenimiento", "reparacion", "preparacion"]) || f3.tipo;
      if (body.hoja !== undefined) f3.hoja = str(body.hoja, 12);
      auditar(f, q, antesEst !== f3.estMin && empezado ? "tiempo-estimado" : "guardar", antesEst !== f3.estMin ? `Tiempo estimado ${antesEst} → ${f3.estMin} min` : "FORM-03: datos del trabajo");
      await guardar(f, o); return salida();
    }
    if (acc === "evento") {
      const tipo = uno(body.tipo, ["inicio", "pausa", "reanudar", "fin"]) as Evento["tipo"];
      if (!tipo) return json({ error: "Acción no válida." }, 400);
      if (!f3.mecanico) { if (q.rol === "mecanico" || q.admin) f3.mecanico = q.uid; else return json({ error: "Asigna antes un mecánico." }, 400); }
      if (!q.admin && q.uid !== f3.mecanico) return json({ error: "Este trabajo está asignado a otro mecánico. Solo él o el gerente pueden fichar." }, 403);
      const ultimoF4Rechazo = f.f4?.resultado === "rechazado";
      const valido = (tipo === "inicio" && (estado === "sin" || (estado === "fin" && ultimoF4Rechazo))) || (tipo === "pausa" && estado === "trabajando") || (tipo === "reanudar" && estado === "pausa") || (tipo === "fin" && (estado === "trabajando" || estado === "pausa"));
      if (!valido) return json({ error: { sin: "Primero hay que iniciar el trabajo.", trabajando: "El trabajo ya está en marcha.", pausa: "El trabajo está en pausa: reanúdalo o termínalo.", fin: "El trabajo ya está terminado." }[estado] }, 409);
      const motivo = tipo === "pausa" ? (MOTIVOS_PAUSA.includes(body.motivo) ? body.motivo : "") : "";
      if (tipo === "pausa" && !motivo) return json({ error: "Elige el motivo de la pausa." }, 400);
      // Un mecánico no puede estar trabajando en dos coches a la vez
      if (tipo === "inicio" || tipo === "reanudar") {
        const activo = (await tstore().get("activo/" + f3.mecanico).catch(() => null)) as string | null;
        if (activo && activo !== token) {
          const otro = (await tstore().get("f/" + activo, { type: "json" }).catch(() => null)) as Fichas | null;
          if (otro?.f3 && estadoTiempo(otro.f3.eventos) === "trabajando") return json({ error: `Tienes en marcha la orden ${otro.num}. Ponla en pausa o termínala antes de empezar otra.` }, 409);
        }
      }
      const ev: Evento = { tipo, t: new Date().toISOString(), por: q.uid, motivo, nota: str(body.nota, 200) };
      f3.eventos.push(ev);
      if (tipo === "inicio" || tipo === "reanudar") await tstore().set("activo/" + f3.mecanico, token);
      else { const a = await tstore().get("activo/" + f3.mecanico).catch(() => null); if (a === token) await tstore().delete("activo/" + f3.mecanico); }
      auditar(f, q, "fichaje", `${tipo}${motivo ? " (" + motivo + ")" : ""}`);
      const cambio = tipo === "inicio" ? { estado: "reparacion", nota: "" } : tipo === "fin" ? { estado: "calidad", nota: "" } : undefined;
      await guardar(f, o, cambio); return salida();
    }
    if (acc === "justificar") {
      if (!q.admin && q.uid !== f3.mecanico) return json({ error: "La justifica el mecánico del trabajo o el gerente." }, 403);
      const codigos = (Array.isArray(body.codigos) ? body.codigos : []).map((x: unknown) => String(x)).filter((x: string) => /^[A-I]$/.test(x)).slice(0, 9);
      const explicacion = str(body.explicacion, 600);
      if (!codigos.length) return json({ error: "Marca al menos una causa." }, 400);
      if (codigos.includes("I") && explicacion.length < 5) return json({ error: "Explica la causa «Otra»." }, 400);
      if (explicacion.length < 5) return json({ error: "Escribe una explicación breve." }, 400);
      f3.justificacion = { codigos, explicacion, avisado: uno(body.avisado, ["si", "no", "na"]), mejora: str(body.mejora, 400), t: new Date().toISOString(), por: q.uid };
      f3.vistoBueno = null;
      auditar(f, q, "justificar", `Desviación justificada: ${codigos.join(", ")}`);
      await guardar(f, o); return salida();
    }
    if (acc === "visto-bueno") {
      if (!q.admin) return json({ error: "El visto bueno lo da el gerente." }, 403);
      const c = calculo(f3, cfg)!;
      if (c.exigeJustificacion && !f3.justificacion) return json({ error: "Primero el mecánico tiene que justificar la desviación." }, 400);
      f3.vistoBueno = { t: new Date().toISOString(), por: q.uid, nota: str(body.nota, 300) };
      auditar(f, q, "visto-bueno", `Visto bueno de tiempos (${c.netoMin} min netos, ${c.desvPct} %)`);
      await guardar(f, o); return salida();
    }
    if (acc === "corregir") {
      if (!q.admin) return json({ error: "Solo el gerente puede corregir un fichaje." }, 403);
      const i = Math.floor(Number(body.i)), nuevo = String(body.t || ""), motivo = str(body.motivo, 300);
      const ev = f3.eventos[i]; if (!ev) return json({ error: "Ese fichaje no existe." }, 404);
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(nuevo) || !Number.isFinite(Date.parse(nuevo))) return json({ error: "Hora no válida." }, 400);
      if (Date.parse(nuevo) > Date.now() + 60e3) return json({ error: "No se puede poner una hora futura." }, 400);
      if (motivo.length < 5) return json({ error: "La corrección necesita un motivo." }, 400);
      const t0 = ev.t; ev.t = new Date(nuevo).toISOString();
      ev.corr = [...(ev.corr || []), { t0, por: q.uid, motivo, en: new Date().toISOString() }];
      const orden = [...f3.eventos].sort((a, b) => a.t.localeCompare(b.t));
      if (orden.map((e) => e.tipo).join() !== f3.eventos.map((e) => e.tipo).join()) { ev.t = t0; ev.corr.pop(); return json({ error: "Esa hora cambia el orden de los fichajes. Revisa la hora." }, 400); }
      auditar(f, q, "corregir-hora", `${ev.tipo}: ${horaCanarias(new Date(t0))} → ${horaCanarias(new Date(ev.t))} · ${motivo}`);
      f3.vistoBueno = null;
      await guardar(f, o); return salida();
    }
    return json({ error: "Acción no válida." }, 400);
  }

  if (sub === "f4" && req.method === "PUT") {
    if (f.f4?.firma && f.f4.resultado !== "rechazado" && !q.admin) return json({ error: "El control de calidad ya está firmado." }, 409);
    const trabajaron = new Set([f.f3?.mecanico, ...(f.f3?.eventos || []).map((e) => e.por)].filter(Boolean));
    if (trabajaron.has(q.uid)) return json({ error: "El control de calidad lo firma una persona distinta a quien hizo el trabajo." }, 403);
    if (q.rol === "recepcion" && !q.admin) return json({ error: "El control de calidad lo hace el responsable de calidad, otro mecánico o el gerente." }, 403);
    if (estadoTiempo(f.f3?.eventos || []) !== "fin") return json({ error: "El trabajo aún no está terminado (FORM-03)." }, 409);
    const nf = limpiarF4(body, f.f4);
    let cambio: { estado: string; nota: string } | undefined;
    if (body.cerrar) {
      const falta = faltaF4(nf); if (falta) return json({ error: falta }, 400);
      // Tras un rechazo, no se vuelve a firmar hasta que el mecánico repite el trabajo (un nuevo «fin» en FORM-03)
      const ultimoFin = [...(f.f3?.eventos || [])].filter((e) => e.tipo === "fin").map((e) => e.t).sort().pop() || "";
      if (f.f4?.resultado === "rechazado" && f.f4.firma && ultimoFin < f.f4.firma.t) return json({ error: "El coche volvió a taller: primero el mecánico tiene que repetir el trabajo y terminarlo en FORM-03." }, 409);
      nf.firma = firma(q); nf.intentos = (f.f4?.intentos || 0) + 1;
      if (nf.resultado === "rechazado") {
        f.f3!.retrabajos.push({ t: new Date().toISOString(), causa: nf.motivo, por: q.uid });
        cambio = { estado: "reparacion", nota: "" };
        auditar(f, q, "calidad-rechazo", "FORM-04 rechazado: " + nf.motivo);
      } else { cambio = { estado: "listo", nota: "" }; auditar(f, q, "firmar", "FORM-04 " + (nf.resultado === "aprobado" ? "aprobado" : "aprobado con observaciones")); }
    } else auditar(f, q, "guardar", "FORM-04 guardada");
    f.f4 = nf;
    await guardar(f, o, cambio);
    return salida();
  }
  if (sub === "f4-cierre" && req.method === "POST") {
    if (!q.admin) return json({ error: "El cierre lo firma el gerente." }, 403);
    if (!f.f4?.firma || f.f4.resultado === "rechazado") return json({ error: "Falta un control de calidad aprobado." }, 409);
    f.f4.cierreGerente = { t: new Date().toISOString(), por: q.uid };
    auditar(f, q, "cierre", "Orden cerrada por el gerente");
    await guardar(f, o); return salida();
  }
  return json({ error: "No encontrado" }, 404);
};

export const config: NConfig = {
  path: ["/api/taller/:recurso", "/api/taller/:recurso/:id", "/api/taller/:recurso/:id/:sub"],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
