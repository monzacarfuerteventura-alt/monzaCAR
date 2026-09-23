import type { Config, Context } from "@netlify/functions";
import { createHash } from "node:crypto";
import { store, json, isAdmin, canalDe, enviarAviso, waNum } from "../lib/shared.mts";

/*
  SOLICITUDES DE CLIENTES (mini CRM)
  - POST   /api/solicitudes        → la web guarda una solicitud (coche, taller, tasación o contacto)
  - GET    /api/solicitudes        → el panel lista todas (requiere contraseña)
  - PATCH  /api/solicitudes/:id    → el panel cambia el estado o añade notas
  - DELETE /api/solicitudes/:id    → el panel borra una solicitud (derecho de supresión RGPD)
  - POST   /api/solicitudes con contraseña y "manual": true → el panel apunta un cliente que llamó o vino en persona
  CRM: cada solicitud guarda importe (€), próximo seguimiento, motivo si se pierde, primera respuesta
  (para medir el tiempo de contestación) y un registro de actividad (notas, llamadas, WhatsApp…).
  Si existe la variable RESEND_API_KEY, cada solicitud nueva llega también por email.
  Cada solicitud se guarda como una entrada independiente: dos clientes a la vez nunca se pisan.
  Las solicitudes con más de 2 años se borran solas (así lo dice la política de privacidad).

  CITAS EN TIEMPO REAL
  - GET  /api/citas?agenda=taller|visita  → huecos libres de los próximos 30 días (público)
  - POST /api/solicitudes con "cita": {fecha, hora} → reserva el hueco y confirma al momento
  - GET/PUT /api/citas/bloqueos            → días cerrados (vacaciones, festivos), solo el panel
  Un coche por hora en cada agenda, de lunes a viernes, de 8:00 a 15:00 (el taller cierra a las 16:00).
*/

const TIPOS = ["coche", "taller", "tasacion", "contacto"] as const;
const ESTADOS = ["nueva", "contactado", "cita", "ganada", "perdida"] as const;
const FRANJAS = ["8:00-10:00", "10:00-12:00", "12:00-14:00", "14:00-16:00", ""];
const CONSENTIMIENTO_VERSION = "2026-09-22";
const RETENCION = 730 * 864e5; // 2 años
const LIMITE_HORA = 6; // solicitudes por persona y hora (anti-spam)
const HORAS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00"];
const AGENDAS = ["taller", "visita"] as const;
const HORIZONTE = 30; // días que se pueden reservar por adelantado
const ANTELACION = 120; // minutos mínimos entre ahora y la cita

type Solicitud = {
  id: string;
  creado: string;
  tipo: (typeof TIPOS)[number];
  estado: (typeof ESTADOS)[number];
  nombre: string;
  telefono: string;
  email: string;
  mensaje: string;
  coche: { id: string; titulo: string; precio: number | null } | null;
  servicios: string[];
  dia: string;
  franja: string;
  vehiculo: Record<string, string>;
  origen: { canal: string; gclid: string; utm_source: string; utm_medium: string; utm_campaign: string; utm_term: string; referrer: string; landing: string };
  idioma: string;
  consentimiento: { version: string; fecha: string };
  cita?: { agenda: string; fecha: string; hora: string } | null;
  notas: string;
  historial: { t: string; estado: string }[];
  importe?: number | null;
  seguimiento?: string;
  motivo?: string;
  primerContacto?: string;
  actividad?: { t: string; tipo: string; txt: string }[];
  orden?: string;
  manual?: boolean;
};
const ACTIVIDAD = ["nota", "llamada", "whatsapp", "email", "visita", "presupuesto", "orden", "sistema"];
const MOTIVOS = ["", "Precio", "No contesta", "Compró en otro sitio", "Ya no lo necesita", "Sin financiación", "Coche vendido", "Otro"];

const str = (v: unknown, max = 200) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const soloDigitos = (v: string) => v.replace(/[^\d+]/g, "");
const fechaISO = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");

// ---------- calendario (hora de Canarias) ----------
function ahoraCanarias() {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Atlantic/Canary", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, minutos: +p.hour * 60 + +p.minute };
}
const sumarDias = (f: string, n: number) => new Date(Date.parse(f + "T12:00:00Z") + n * 864e5).toISOString().slice(0, 10);
const diaSemana = (f: string) => new Date(f + "T12:00:00Z").getUTCDay();
const minutos = (h: string) => +h.slice(0, 2) * 60 + +h.slice(3, 5);

async function bloqueos(): Promise<string[]> {
  return (((await store("solicitudes").get("config/bloqueos", { type: "json" })) as string[] | null) || []);
}
function huecoValido(fecha: string, hora: string, cerrados: string[]): boolean {
  const { fecha: hoy, minutos: ahora } = ahoraCanarias();
  if (!fechaISO(fecha) || !HORAS.includes(hora)) return false;
  const w = diaSemana(fecha);
  if (w === 0 || w === 6 || cerrados.includes(fecha)) return false;
  if (fecha < hoy || fecha > sumarDias(hoy, HORIZONTE)) return false;
  if (fecha === hoy && minutos(hora) < ahora + ANTELACION) return false;
  return true;
}
async function ocupados(agenda: string): Promise<Set<string>> {
  const { blobs } = await store("solicitudes").list({ prefix: `slot/${agenda}/` });
  return new Set(blobs.map((b) => b.key.slice(`slot/${agenda}/`.length)));
}
async function liberar(sol: Solicitud) {
  if (!sol.cita) return;
  const s = store("solicitudes");
  const key = `slot/${sol.cita.agenda}/${sol.cita.fecha}/${sol.cita.hora}`;
  const v = (await s.get(key, { type: "json" })) as { id: string } | null;
  if (v && v.id === sol.id) await s.delete(key);
}

const canal = (o: Record<string, string>) => canalDe(o);

function limpiar(input: any, manual = false): { s?: Solicitud; error?: string } {
  const tipo = TIPOS.includes(input?.tipo) ? input.tipo : null;
  if (!tipo) return { error: "Tipo de solicitud no válido." };
  const nombre = str(input.nombre, 80);
  const telefono = str(input.telefono, 30);
  const email = str(input.email, 120);
  if (nombre.length < 2) return { error: "Escribe tu nombre." };
  if (soloDigitos(telefono).replace(/^\+/, "").length < 9) return { error: "Revisa el teléfono." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Revisa el email." };
  if (!manual && input.acepta !== true) return { error: "Tienes que aceptar la política de privacidad." };

  const o = input.origen && typeof input.origen === "object" ? input.origen : {};
  const origen = {
    gclid: str(o.gclid, 200),
    utm_source: str(o.utm_source, 60),
    utm_medium: str(o.utm_medium, 60),
    utm_campaign: str(o.utm_campaign, 100),
    utm_term: str(o.utm_term, 100),
    referrer: str(o.referrer, 300),
    landing: str(o.landing, 300),
    canal: "",
  };
  origen.canal = manual ? str(input.canal, 40) || "En persona" : canal(origen);

  const c = input.coche && typeof input.coche === "object" ? input.coche : null;
  const precio = c ? Number(c.precio) : NaN;
  const v = input.vehiculo && typeof input.vehiculo === "object" ? input.vehiculo : {};
  const vehiculo: Record<string, string> = {};
  for (const k of ["marca", "modelo", "anio", "km", "combustible", "estado", "matricula", "coche"]) {
    const val = str(v[k], 80);
    if (val) vehiculo[k] = val;
  }

  const ahora = new Date().toISOString();
  const s: Solicitud = {
    id: ahora.replace(/[-:.TZ]/g, "") + "-" + crypto.randomUUID().slice(0, 8),
    creado: ahora,
    tipo,
    estado: "nueva",
    nombre,
    telefono,
    email,
    mensaje: str(input.mensaje, 1500),
    coche: c ? { id: str(c.id, 64), titulo: str(c.titulo, 140), precio: Number.isFinite(precio) ? precio : null } : null,
    servicios: (Array.isArray(input.servicios) ? input.servicios : []).map((x: unknown) => str(x, 60)).filter(Boolean).slice(0, 15),
    dia: fechaISO(input.dia),
    franja: FRANJAS.includes(input.franja) ? input.franja : "",
    vehiculo,
    origen,
    idioma: input.idioma === "en" ? "en" : "es",
    consentimiento: { version: manual ? "presencial" : CONSENTIMIENTO_VERSION, fecha: ahora },
    notas: manual ? str(input.notas, 2000) : "",
    historial: [{ t: ahora, estado: "nueva" }],
    cita: null,
    importe: null,
    seguimiento: "",
    motivo: "",
    actividad: [],
  };
  if (manual) {
    s.manual = true;
    s.estado = "contactado";
    s.primerContacto = ahora;
    s.historial = [{ t: ahora, estado: "contactado" }];
    s.actividad = [{ t: ahora, tipo: "sistema", txt: "Cliente apuntado a mano (" + s.origen.canal + ")" }];
    return { s };
  }
  const ci = input.cita && typeof input.cita === "object" ? input.cita : null;
  if (ci) {
    const agenda = tipo === "taller" ? "taller" : tipo === "coche" ? "visita" : "";
    if (!agenda) return { error: "Este tipo de solicitud no admite cita." };
    s.cita = { agenda, fecha: fechaISO(ci.fecha), hora: str(ci.hora, 5) };
    s.dia = s.cita.fecha;
    s.franja = s.cita.hora;
    s.estado = "cita";
    s.historial = [{ t: ahora, estado: "cita" }];
  }
  return { s };
}

async function dentroDelLimite(ip: string, ua: string): Promise<boolean> {
  const s = store("solicitudes");
  const quien = createHash("sha256").update(ip + "|" + ua + "|mz-sol").digest("hex").slice(0, 24);
  const key = "rl/" + quien;
  const hace1h = Date.now() - 3600e3;
  const lista = (((await s.get(key, { type: "json" })) as number[] | null) || []).filter((t) => t > hace1h);
  if (lista.length >= LIMITE_HORA) return false;
  lista.push(Date.now());
  await s.setJSON(key, lista);
  return true;
}

export default async (req: Request, context: Context) => {
  const s = store("solicitudes");
  const url = new URL(req.url);
  const partes = url.pathname.split("/").filter(Boolean);

  // ---------- calendario ----------
  if (partes[1] === "citas") {
    if (partes[2] === "bloqueos") {
      if (!isAdmin(req)) return json({ error: "No autorizado" }, 401);
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
  if (req.method === "POST" && !id && isAdmin(req)) {
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
    if (sol.cita) {
      const key = `slot/${sol.cita.agenda}/${sol.cita.fecha}/${sol.cita.hora}`;
      if (await s.get(key)) return json({ error: "Esa hora se acaba de ocupar. Elige otra.", ocupada: true }, 409);
      await s.setJSON(key, { id: sol.id });
      // Si dos personas reservan a la vez, gana la última escritura: la otra recibe «ocupada».
      const v = (await s.get(key, { type: "json" })) as { id: string } | null;
      if (!v || v.id !== sol.id) return json({ error: "Esa hora se acaba de ocupar. Elige otra.", ocupada: true }, 409);
    }
    await s.setJSON("s/" + sol.id, sol);
    const envio = avisar(sol, url.origin).catch(() => {});
    if (typeof (context as any).waitUntil === "function") (context as any).waitUntil(envio); else await envio;
    return json({ ok: true, id: sol.id, cita: sol.cita });
  }

  // ---------- a partir de aquí, solo el panel ----------
  if (!isAdmin(req)) return json({ error: "No autorizado" }, 401);

  if (req.method === "GET" && !id) {
    const { blobs } = await s.list({ prefix: "s/" });
    const limite = Date.now() - RETENCION;
    const todas = (await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" }) as Promise<Solicitud | null>))).filter(Boolean) as Solicitud[];
    const viejas = todas.filter((x) => Date.parse(x.creado) < limite);
    await Promise.all(viejas.map((x) => s.delete("s/" + x.id)));
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
    return json({ ok: true });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = { path: ["/api/solicitudes", "/api/solicitudes/:id", "/api/citas", "/api/citas/bloqueos"] };

// ---------- aviso por email de cada solicitud nueva ----------
const TIPO_TXT: Record<string, string> = { coche: "Interesado en un coche", taller: "Cita de taller", tasacion: "Tasación", contacto: "Consulta" };
function fechaBonita(f: string) {
  return f ? new Date(f + "T12:00:00Z").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "";
}
async function avisar(x: Solicitud, origin: string) {
  const cuando = x.cita ? `${fechaBonita(x.cita.fecha)} a las ${x.cita.hora}` : x.dia ? `${fechaBonita(x.dia)} ${x.franja}` : "";
  const asunto = x.cita
    ? `Nueva cita${x.tipo === "taller" ? " de taller" : " para ver coche"}: ${x.nombre} · ${cuando}`
    : `Nueva solicitud (${TIPO_TXT[x.tipo] || x.tipo}): ${x.nombre}`;
  const saludo = x.idioma === "en" ? `Hi ${x.nombre.split(" ")[0]}, this is Volcano Cars. ` : `Hola ${x.nombre.split(" ")[0]}, te escribimos de Volcano Cars. `;
  const v = x.vehiculo || {};
  await enviarAviso(asunto, [
    ["Tipo", TIPO_TXT[x.tipo] || x.tipo],
    ["Nombre", x.nombre],
    ["Teléfono", x.telefono],
    ["Email", x.email],
    ["Cita", cuando],
    ["Coche", x.coche ? `${x.coche.titulo}${x.coche.precio ? " · " + x.coche.precio.toLocaleString("es-ES") + " €" : ""}` : (v.coche || [v.marca, v.modelo, v.anio].filter(Boolean).join(" ")) + (v.matricula ? ` (${v.matricula})` : "")],
    ["Servicios", (x.servicios || []).join(", ")],
    ["Mensaje", x.mensaje],
    ["Idioma", x.idioma === "en" ? "Inglés" : ""],
    ["Viene de", x.origen?.canal || "Directo"],
  ], [
    { txt: "WhatsApp al cliente", url: `https://wa.me/${waNum(x.telefono)}?text=${encodeURIComponent(saludo)}`, color: "#1F8B4C" },
    { txt: "Llamar", url: `tel:${x.telefono.replace(/[^\d+]/g, "")}`, color: "#1B1B1A" },
    { txt: "Abrir el CRM", url: `${origin}/admin#crm` },
  ], x.email);
}
