import type { Config } from "@netlify/functions";
import { json, mismoOrigen, enviarAviso } from "../lib/shared.mts";
import { quien, hoyCanarias, leerEquipo } from "../lib/taller.mts";
import { anotar, leerLibro } from "../lib/libro.mts";
import { CONFLICTO, astore, TIPOS, ESTADOS, rid, ahora, str, esFecha, sumarDias, contarDias, leerSol, guardarSol, listarSol, siguienteRef, activa, cubre, type Sol, type Doc } from "../lib/ausencias.mts";

/*
  AUSENCIAS · RRHH (solo panel; nada de esto es público). No exige haber fichado: quien está de baja no puede fichar.
  GET  /api/ausencias/mias              → mis solicitudes, tipos y avisos (decisiones que aún no he visto)
  POST /api/ausencias/subir             → sube un documento (foto o PDF, hasta 4 MB); devuelve su clave
  POST /api/ausencias/crear             → comunica una ausencia (el gerente puede registrarla a nombre de otra persona)
  POST /api/ausencias/adjuntar/:id      → añade documentos a una solicitud abierta (o los que faltaban de una baja)
  POST /api/ausencias/responder/:id     → responde cuando el gerente pide más información
  POST /api/ausencias/cancelar/:id      → retira una solicitud que aún no está decidida
  POST /api/ausencias/visto/:id         → «ya he visto la decisión»
  GET  /api/ausencias/doc/:clave        → descarga un documento (solo su dueño y el gerente; nunca en cachés)
  GET  /api/ausencias/gestion           → gerente: quién falta hoy, pendientes, historial filtrable y contadores
  GET  /api/ausencias/ficha/:id         → gerente: una solicitud completa (la marca como leída)
  POST /api/ausencias/decidir/:id       → gerente: aprobar · rechazar · pedir más información (queda con su nombre y motivo)
  GET  /api/ausencias/libro             → gerente: libro encadenado
  En el libro NO se guarda el motivo ni el contenido de los documentos (pueden ser datos de salud): solo quién, qué, cuándo y las fechas.
*/

const MIME: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
const MAX_DOC = 4 * 1024 * 1024, MAX_DOCS = 6;
const hhmm = (x: unknown) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(String(x ?? "")) ? String(x) : "");

function vistaTrabajador(s: Sol) {
  return { id: s.id, ref: s.ref, tipo: s.tipo, tipoTxt: TIPOS[s.tipo]?.txt || s.tipo, desde: s.desde, hasta: s.hasta, horaDesde: s.horaDesde, horaHasta: s.horaHasta, dias: s.dias, laborables: s.laborables, motivo: s.motivo,
    docs: s.docs.map((d) => ({ key: d.key, nombre: d.nombre, mime: d.mime, size: d.size, t: d.t })), estado: s.estado, estadoTxt: ESTADOS[s.estado], creada: s.creada, decision: s.decision, nuevo: !!s.decision && !s.vistaTrabajador,
    historial: s.historial.map((h) => ({ t: h.t, por: h.por, acc: h.acc, txt: h.txt })) };
}
const vistaGerente = (s: Sol) => ({ ...vistaTrabajador(s), uid: s.uid, nombre: s.nombre, creadaPor: s.creadaPor, leida: s.leidaGerente });
const paso = (q: { nombre: string; rol: string }, acc: string, txt = ""): { t: string; por: string; rol: string; acc: string; txt: string } => ({ t: ahora(), por: q.nombre, rol: q.rol, acc, txt });

async function claveValida(q: { uid: string; admin: boolean }, key: string) {
  if (!/^[a-f0-9]{16,32}\.(jpg|png|webp|pdf)$/.test(key)) return null;
  const m = (await astore().get("docmeta/" + key, { type: "json" }).catch(() => null)) as { uid: string; nombre: string; mime: string } | null;
  return m && (q.admin || m.uid === q.uid) ? m : null;
}
async function docsDe(q: { uid: string; nombre: string; admin: boolean }, keys: unknown, dueno: string, ya: Doc[]): Promise<Doc[] | string> {
  const l = Array.isArray(keys) ? keys.map((k) => String(k)).slice(0, MAX_DOCS) : [], out: Doc[] = [];
  for (const k of l) {
    if (ya.some((d) => d.key === k) || out.some((d) => d.key === k)) continue;
    const m = (await astore().get("docmeta/" + k, { type: "json" }).catch(() => null)) as { uid: string; nombre: string; mime: string; size: number; t: string } | null;
    if (!m || (m.uid !== q.uid && !q.admin) || (q.admin && m.uid !== q.uid && m.uid !== dueno)) return "Uno de los documentos no es válido. Súbelo otra vez.";
    out.push({ key: k, nombre: m.nombre, mime: m.mime, size: m.size, t: m.t, por: q.nombre });
  }
  if (ya.length + out.length > MAX_DOCS) return `Máximo ${MAX_DOCS} documentos por solicitud.`;
  return out;
}

const manejar = async (req: Request): Promise<Response> => {
  const url = new URL(req.url), parts = url.pathname.split("/").filter(Boolean), accion = parts[2] || "", id = parts[3] || "";
  if (req.method !== "GET" && !mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
  const q = await quien(req);
  if (!q) return json({ error: "Tu sesión ha caducado. Vuelve a entrar." }, 401);
  const hoy = hoyCanarias();

  // ---------- documentos (binarios) ----------
  if (accion === "doc" && req.method === "GET") {
    const m = await claveValida(q, id); if (!m) return new Response("No encontrado", { status: 404 });
    const b = await astore().get("doc/" + id, { type: "arrayBuffer" }); if (!b) return new Response("No encontrado", { status: 404 });
    return new Response(b, { headers: { "content-type": m.mime, "cache-control": "private, no-store", "x-robots-tag": "noindex, nofollow, noarchive", "referrer-policy": "no-referrer", "x-content-type-options": "nosniff", "content-disposition": `inline; filename="documento.${id.split(".").pop()}"` } });
  }
  if (accion === "subir" && req.method === "POST") {
    const mime = (req.headers.get("content-type") || "").split(";")[0], ext = MIME[mime];
    if (!ext) return json({ error: "Formato no admitido. Usa una foto (JPG, PNG, WEBP) o un PDF." }, 415);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength) return json({ error: "El archivo está vacío." }, 400);
    if (buf.byteLength > MAX_DOC) return json({ error: "El archivo pesa más de 4 MB. Haz la foto más pequeña o comprime el PDF." }, 413);
    if (ext === "pdf" && new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(5, buf.byteLength))) !== "%PDF-") return json({ error: "Ese archivo no es un PDF válido." }, 415);
    const dueno = q.admin ? str(url.searchParams.get("uid"), 40) || q.uid : q.uid;
    const key = `${rid()}${rid()}.${ext}`, nombre = str(decodeURIComponent(req.headers.get("x-nombre") || "documento"), 80) || "documento";
    await astore().set("doc/" + key, buf);
    await astore().setJSON("docmeta/" + key, { uid: dueno, nombre, mime, size: buf.byteLength, t: ahora() });
    return json({ key, nombre, mime, size: buf.byteLength }, 201);
  }

  const body = req.method === "POST" ? ((await req.json().catch(() => ({}))) as any) : {};

  // ---------- trabajador ----------
  if (accion === "mias" && req.method === "GET") {
    const l = (await listarSol()).filter((s) => s.uid === q.uid);
    return json({ tipos: Object.entries(TIPOS).map(([k, t]) => [k, t.txt, t.ayuda, t.doc, t.icono]), solicitudes: l.map(vistaTrabajador), sinVer: l.filter((s) => s.decision && !s.vistaTrabajador).length, hoy });
  }
  if (accion === "crear" && req.method === "POST") {
    const equipo = await leerEquipo();
    let uid = q.uid, nombre = q.nombre;
    if (q.admin && body.uid && body.uid !== q.uid) { const p = equipo.find((x) => x.id === String(body.uid) && x.activo); if (!p) return json({ error: "Esa persona no está en el equipo." }, 404); uid = p.id; nombre = p.nombre; }
    const tipo = str(body.tipo, 40); if (!TIPOS[tipo]) return json({ error: "Elige el tipo de ausencia." }, 400);
    const desde = str(body.desde, 10), hasta = str(body.hasta || body.desde, 10);
    if (!esFecha(desde) || !esFecha(hasta)) return json({ error: "Pon las fechas de la ausencia." }, 400);
    if (hasta < desde) return json({ error: "La fecha de fin no puede ser anterior a la de inicio." }, 400);
    if (desde < sumarDias(hoy, -60)) return json({ error: "No se pueden comunicar ausencias de hace más de 60 días. Habla con el gerente." }, 400);
    if (hasta > sumarDias(hoy, 400)) return json({ error: "Esa fecha queda demasiado lejos." }, 400);
    const { nat, lab } = contarDias(desde, hasta); if (nat > 366) return json({ error: "Como máximo un año por solicitud." }, 400);
    const motivo = str(body.motivo, 800); if ((tipo === "otro" || tipo === "retraso") && motivo.length < 5) return json({ error: "Cuéntanos brevemente el motivo." }, 400);
    let horaDesde = "", horaHasta = ""; if (desde === hasta) { horaDesde = hhmm(body.horaDesde); horaHasta = hhmm(body.horaHasta); if (horaDesde && horaHasta && horaHasta <= horaDesde) return json({ error: "La hora de fin debe ser posterior a la de inicio." }, 400); }
    const otras = (await listarSol()).filter((s) => s.uid === uid && activa(s) && s.desde <= hasta && s.hasta >= desde && !(horaDesde && s.horaDesde && s.hasta === s.desde && (s.horaHasta <= horaDesde || s.horaDesde >= horaHasta)));
    if (otras.length) return json({ error: `Ya hay una solicitud en esas fechas (${otras[0].ref}). Si quieres cambiarla, cancélala primero o añade un documento a esa.` }, 409);
    const docs = await docsDe(q, body.docs, uid, []); if (typeof docs === "string") return json({ error: docs }, 400);
    const s: Sol = { id: rid(), ref: await siguienteRef(hoy.slice(0, 4)), uid, nombre, tipo, desde, hasta, horaDesde, horaHasta, dias: nat, laborables: lab, motivo, docs, estado: "pendiente", creada: ahora(),
      creadaPor: q.nombre, decision: null, historial: [paso(q, uid === q.uid ? "comunicada" : "registrada por el gerente", docs.length ? `${docs.length} documento(s) adjunto(s)` : "")], leidaGerente: q.admin, vistaTrabajador: true };
    if (q.admin && body.aprobar === true) { s.estado = "aprobada"; s.decision = { t: ahora(), por: q.nombre, motivo: "", retribuida: body.retribuida === "si" ? "si" : body.retribuida === "no" ? "no" : "" }; s.historial.push(paso(q, "aprobada", "Al registrarla")); s.vistaTrabajador = false; }
    await guardarSol(s);
    await anotar("ausencias", q, "crear", { ref: s.ref, persona: nombre, tipo, desde, hasta, docs: docs.length });
    if (!q.admin) enviarAviso(`Ausencia comunicada: ${nombre}`, [["Trabajador", nombre], ["Tipo", TIPOS[tipo].txt], ["Fechas", desde === hasta ? desde : `${desde} → ${hasta}`], ["Documentos", String(docs.length)]], [{ txt: "Abrir Jornada", url: url.origin + "/admin#jornada" }]).catch(() => false);
    return json({ ok: true, solicitud: q.admin ? vistaGerente(s) : vistaTrabajador(s) }, 201);
  }
  if (["adjuntar", "responder", "cancelar", "visto"].includes(accion) && req.method === "POST") {
    const s = await leerSol(id); if (!s || (s.uid !== q.uid && !q.admin)) return json({ error: "Solicitud no encontrada." }, 404);
    if (accion === "visto") { s.vistaTrabajador = true; await guardarSol(s); return json({ ok: true }); }
    if (accion === "cancelar") {
      if (s.estado !== "pendiente" && s.estado !== "pide-info") return json({ error: "Esta solicitud ya está decidida: pídele al gerente que la revise." }, 409);
      s.estado = "cancelada"; s.historial.push(paso(q, "cancelada", str(body.motivo, 200))); await guardarSol(s);
      await anotar("ausencias", q, "cancelar", { ref: s.ref, persona: s.nombre }); return json({ ok: true, solicitud: vistaTrabajador(s) });
    }
    if (s.estado === "cancelada" || s.estado === "rechazada") return json({ error: "Esta solicitud está cerrada. Comunica una nueva." }, 409);
    const docs = await docsDe(q, body.docs, s.uid, s.docs); if (typeof docs === "string") return json({ error: docs }, 400);
    const txt = str(body.texto, 600);
    if (accion === "responder" && s.estado !== "pide-info") return json({ error: "No hay ninguna pregunta pendiente." }, 409);
    if (!docs.length && !txt) return json({ error: accion === "responder" ? "Escribe tu respuesta o adjunta un documento." : "Adjunta al menos un documento." }, 400);
    s.docs.push(...docs);
    s.historial.push(paso(q, accion === "responder" ? "respondida" : "documentos añadidos", [txt, docs.length ? `${docs.length} documento(s)` : ""].filter(Boolean).join(" · ")));
    if (s.estado === "pide-info") s.estado = "pendiente"; s.leidaGerente = false; if (s.decision && s.estado === "pendiente") { s.decision = null; }
    await guardarSol(s); await anotar("ausencias", q, accion, { ref: s.ref, persona: s.nombre, docs: docs.length });
    return json({ ok: true, solicitud: vistaTrabajador(s) });
  }

  // ---------- gerente ----------
  if (!q.admin) return json({ error: "Esto es solo para el gerente." }, 403);
  if (accion === "gestion" && req.method === "GET") {
    const todas = await listarSol(), mes = /^\d{4}-\d{2}$/.test(url.searchParams.get("mes") || "") ? url.searchParams.get("mes")! : "";
    const estado = url.searchParams.get("estado") || "", uidF = url.searchParams.get("uid") || "";
    const equipo = (await leerEquipo()).filter((p) => p.activo).map((p) => ({ uid: p.id, nombre: p.nombre, rol: p.rol }));
    const ausentesHoy = todas.filter((s) => activa(s) && cubre(s, hoy));
    const filtradas = todas.filter((s) => (!estado || s.estado === estado) && (!uidF || s.uid === uidF) && (!mes || (s.desde.slice(0, 7) <= mes && s.hasta.slice(0, 7) >= mes)));
    return json({ hoy, tipos: Object.entries(TIPOS).map(([k, t]) => [k, t.txt, t.icono]), equipo,
      contadores: { pendientes: todas.filter((s) => s.estado === "pendiente").length, pideInfo: todas.filter((s) => s.estado === "pide-info").length, sinLeer: todas.filter((s) => !s.leidaGerente && activa(s)).length, ausentesHoy: ausentesHoy.length },
      hoyLista: ausentesHoy.map(vistaGerente), pendientes: todas.filter((s) => s.estado === "pendiente").sort((a, b) => a.desde.localeCompare(b.desde)).map(vistaGerente), lista: filtradas.slice(0, 200).map(vistaGerente) });
  }
  if (accion === "ficha" && req.method === "GET") {
    const s = await leerSol(id); if (!s) return json({ error: "Solicitud no encontrada." }, 404);
    if (!s.leidaGerente) { s.leidaGerente = true; s.historial.push(paso(q, "vista", "")); await guardarSol(s); }
    return json(vistaGerente(s));
  }
  if (accion === "decidir" && req.method === "POST") {
    const s = await leerSol(id); if (!s) return json({ error: "Solicitud no encontrada." }, 404);
    if (s.estado === "cancelada") return json({ error: "El trabajador la canceló." }, 409);
    const d = str(body.decision, 20), motivo = str(body.motivo, 500);
    if (!["aprobar", "rechazar", "pedir-info"].includes(d)) return json({ error: "Elige aprobar, rechazar o pedir más información." }, 400);
    if (d !== "aprobar" && motivo.length < 4) return json({ error: d === "rechazar" ? "Explica por qué se rechaza (lo verá el trabajador)." : "Di qué te falta (lo verá el trabajador)." }, 400);
    const retribuida = body.retribuida === "si" ? "si" : body.retribuida === "no" ? "no" : "";
    s.estado = d === "aprobar" ? "aprobada" : d === "rechazar" ? "rechazada" : "pide-info";
    s.decision = { t: ahora(), por: q.nombre, motivo, retribuida: d === "aprobar" ? retribuida : "" }; s.vistaTrabajador = false; s.leidaGerente = true;
    s.historial.push(paso(q, s.estado === "aprobada" ? "aprobada" : s.estado === "rechazada" ? "rechazada" : "pide información", [motivo, d === "aprobar" && retribuida ? (retribuida === "si" ? "Con sueldo" : "Sin sueldo") : ""].filter(Boolean).join(" · ")));
    await guardarSol(s); await anotar("ausencias", q, "decidir-" + d, { ref: s.ref, persona: s.nombre, tipo: s.tipo, desde: s.desde, hasta: s.hasta });
    return json({ ok: true, solicitud: vistaGerente(s) });
  }
  if (accion === "libro" && req.method === "GET") return json(await leerLibro("ausencias"));
  return json({ error: "No existe esa acción." }, 404);
};

// Si dos personas tocan la misma solicitud a la vez, la segunda recibe este aviso en vez de pisar el cambio de la primera
export default async (req: Request) => {
  try { return await manejar(req); }
  catch (e: any) {
    if (String(e?.message) === CONFLICTO) return json({ error: "Otra persona acaba de modificar esta solicitud. Recarga la pantalla y vuelve a intentarlo." }, 409);
    throw e;
  }
};

export const config: Config = {
  path: ["/api/ausencias/:accion", "/api/ausencias/:accion/:id"],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
