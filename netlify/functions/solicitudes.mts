import type { Config, Context } from "@netlify/functions";
import { store, json, isAdmin, mismoOrigen } from "../lib/shared.mts";
import { notificarExternos } from "../lib/notificar.mts";
import { RETENCION, AGENDAS, ESTADOS, MOTIVOS, ACTIVIDAD, str, fechaISO, ahoraCanarias, sumarDias, diaSemana, HORAS, HORIZONTE, bloqueos, huecoValido, ocupados, liberar, limpiar, dentroDelLimite, avisar, ocuparHueco, fotosExisten, borrarFotos, marcarFotosUsadas, type Solicitud } from "../lib/solicitud.mts";

// Solicitudes de clientes, citas en tiempo real y mini CRM. La lógica común está en netlify/lib/solicitud.mts.
export default async (req: Request, context: Context) => {
  const s = store("solicitudes");
  const url = new URL(req.url);
  const partes = url.pathname.split("/").filter(Boolean);

  // ---------- calendario ----------
  if (partes[1] === "citas") {
    if (partes[2] === "bloqueos") {
      if (!(await isAdmin(req))) return json({ error: "No autorizado" }, 401);
      if (req.method === "GET") return json(await bloqueos());
      if (req.method === "PUT") {
        const input = (await req.json().catch(() => ({}))) as any;
        const fechas = [...new Set((Array.isArray(input.fechas) ? input.fechas : []).map(fechaISO).filter(Boolean))].sort().slice(-200);
        await s.setJSON("config/bloqueos", fechas);
        return json(fechas);
      }
      return json({ error: "Método no permitido" }, 405);
    }
    if (req.method !== "GET") return json({ error: "Método no permitido" }, 405);
    const agenda = AGENDAS.includes(url.searchParams.get("agenda") as any) ? url.searchParams.get("agenda")! : "taller";
    const [cerrados, ocup] = await Promise.all([bloqueos(), ocupados(agenda)]);
    const { fecha: hoy } = ahoraCanarias();
    const dias = [];
    for (let i = 0; i <= HORIZONTE; i++) {
      const f = sumarDias(hoy, i);
      const w = diaSemana(f);
      if (w === 0 || w === 6) continue;
      const horas = HORAS.map((h) => ({ hora: h, libre: huecoValido(f, h, cerrados) && !ocup.has(`${f}/${h}`) }));
      dias.push({ fecha: f, cerrado: cerrados.includes(f), horas });
    }
    return new Response(JSON.stringify({ agenda, dias }), { headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  }

  const id = partes[2] || "";

  // ---------- el panel apunta un cliente a mano ----------
  if (req.method === "POST" && !id && (await isAdmin(req))) {
    const input = await req.json().catch(() => null);
    if (input && input.manual === true) {
      const { s: sol, error } = limpiar(input, true);
      if (error || !sol) return json({ error }, 400);
      await s.setJSON("s/" + sol.id, sol);
      return json(sol, 201);
    }
    return json({ error: "Datos no válidos." }, 400);
  }

  // ---------- la web guarda una solicitud ----------
  if (req.method === "POST" && !id) {
    if (!mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
    const len = Number(req.headers.get("content-length") || 0);
    if (len > 20000) return json({ error: "Solicitud demasiado grande." }, 413);
    const input = await req.json().catch(() => null);
    if (!input || typeof input !== "object") return json({ error: "Datos no válidos." }, 400);
    // Campo trampa: las personas no lo ven; los robots lo rellenan.
    if (str(input.web, 50)) return json({ ok: true });
    const { s: sol, error } = limpiar(input);
    if (error || !sol) return json({ error }, 400);
    if (sol.cita && !huecoValido(sol.cita.fecha, sol.cita.hora, await bloqueos())) {
      return json({ error: "Esa hora ya no está disponible. Elige otra.", ocupada: true }, 409);
    }
    if (!(await dentroDelLimite(context.ip || "", req.headers.get("user-agent") || ""))) {
      return json({ error: "Has enviado varias solicitudes seguidas. Escríbenos por WhatsApp o llámanos." }, 429);
    }
    // Fotos del daño (presupuesto por foto): tienen que haberse subido antes a /api/fotos-cliente
    if (sol.fotos?.length && !(await fotosExisten(sol.fotos))) return json({ error: "No hemos recibido bien las fotos. Vuelve a subirlas, por favor." }, 400);
    if (sol.cita && !(await ocuparHueco(sol.cita.agenda, sol.cita.fecha, sol.cita.hora, sol.id))) {
      return json({ error: "Esa hora se acaba de ocupar. Elige otra.", ocupada: true }, 409);
    }
    await s.setJSON("s/" + sol.id, sol);
    if (sol.fotos?.length) await marcarFotosUsadas(sol.fotos, sol.id);
    const envio = Promise.allSettled([avisar(sol, url.origin), notificarExternos(sol as any, url.origin)]);
    if (typeof (context as any).waitUntil === "function") (context as any).waitUntil(envio); else await envio;
    return json({ ok: true, id: sol.id, cita: sol.cita });
  }

  // ---------- a partir de aquí, solo el panel ----------
  if (!(await isAdmin(req))) return json({ error: "No autorizado" }, 401);

  if (req.method === "GET" && !id) {
    const { blobs } = await s.list({ prefix: "s/" });
    const limite = Date.now() - RETENCION;
    const todas = (await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" }) as Promise<Solicitud | null>))).filter(Boolean) as Solicitud[];
    const viejas = todas.filter((x) => Date.parse(x.creado) < limite);
    await Promise.all(viejas.map((x) => s.delete("s/" + x.id).then(() => borrarFotos(x))));
    const vivas = todas.filter((x) => Date.parse(x.creado) >= limite).sort((a, b) => b.creado.localeCompare(a.creado));
    return json(vivas);
  }

  if (!/^[0-9]{14,20}-[a-f0-9]{8}$/.test(id)) return json({ error: "Solicitud no encontrada" }, 404);
  const actual = (await s.get("s/" + id, { type: "json" })) as Solicitud | null;
  if (!actual) return json({ error: "Solicitud no encontrada" }, 404);

  if (req.method === "PATCH") {
    const input = (await req.json().catch(() => ({}))) as any;
    if (input.estado !== undefined) {
      if (!ESTADOS.includes(input.estado)) return json({ error: "Estado no válido" }, 400);
      if (input.estado !== actual.estado) {
        if (input.estado === "perdida") await liberar(actual);
        actual.estado = input.estado;
        actual.historial = [...(actual.historial || []), { t: new Date().toISOString(), estado: input.estado }].slice(-30);
      }
    }
    if (input.notas !== undefined) actual.notas = str(input.notas, 2000);
    const t = new Date().toISOString();
    if (input.importe !== undefined) {
      const n = input.importe === "" || input.importe === null ? null : Number(String(input.importe).replace(/\./g, "").replace(",", "."));
      actual.importe = n === null || !Number.isFinite(n) ? null : Math.round(n * 100) / 100;
    }
    if (input.seguimiento !== undefined) actual.seguimiento = fechaISO(input.seguimiento);
    if (input.motivo !== undefined) actual.motivo = MOTIVOS.includes(input.motivo) ? input.motivo : str(input.motivo, 60);
    for (const k of ["nombre", "telefono", "email"] as const) if (input[k] !== undefined && str(input[k], 120)) actual[k] = str(input[k], 120);
    if (input.orden !== undefined) actual.orden = str(input.orden, 40);
    if (input.actividad && typeof input.actividad === "object") {
      const tipo = ACTIVIDAD.includes(input.actividad.tipo) ? input.actividad.tipo : "nota";
      const txt = str(input.actividad.txt, 1500);
      if (txt || tipo !== "nota") actual.actividad = [...(actual.actividad || []), { t, tipo, txt }].slice(-200);
      if (["llamada", "whatsapp", "email", "visita"].includes(tipo) && !actual.primerContacto) actual.primerContacto = t;
    }
    if (actual.estado !== "nueva" && !actual.primerContacto) actual.primerContacto = t;
    await s.setJSON("s/" + id, actual);
    return json(actual);
  }

  if (req.method === "DELETE") {
    await liberar(actual);
    await s.delete("s/" + id);
    await borrarFotos(actual);
    return json({ ok: true });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/solicitudes", "/api/solicitudes/:id", "/api/citas", "/api/citas/bloqueos"],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

