import type { Config } from "@netlify/functions";
import { store, json, isAdmin, enviarAviso, waNum, mismoOrigen } from "../lib/shared.mts";

/*
  ÓRDENES DE TRABAJO: SEGUIMIENTO EN VIVO + PRESUPUESTO ONLINE
  Panel (con contraseña):
  - GET    /api/ordenes            → todas las órdenes
  - POST   /api/ordenes            → crea una orden (desde una solicitud del CRM o a mano)
  - PATCH  /api/ordenes/:token     → cambia estado, fecha de entrega, fotos, mensaje o presupuesto
  - DELETE /api/ordenes/:token
  Cliente (sin contraseña, solo con el enlace secreto /s/:token):
  - GET  /api/seguimiento/:token            → estado del coche, fotos y presupuesto
  - POST /api/seguimiento/:token/respuesta  → acepta o rechaza el presupuesto
  El enlace lleva 16 caracteres aleatorios: no se puede adivinar. Las notas internas nunca salen al cliente.
*/

export const PASOS = ["recibido", "diagnostico", "presupuesto", "reparacion", "calidad", "listo", "entregado"] as const;
type Paso = (typeof PASOS)[number];
type Linea = { c: string; n: number; p: number };
type Presupuesto = {
  lineas: Linea[]; igic: number; nota: string; validez: string;
  estado: "borrador" | "enviado" | "aceptado" | "rechazado"; enviado: string;
  respuesta: { t: string; nombre: string; comentario: string } | null;
};
type Orden = {
  token: string; creado: string; actualizado: string; lead: string;
  cliente: { nombre: string; telefono: string; email: string; idioma: string };
  vehiculo: { coche: string; matricula: string; km: string };
  estado: Paso; pasos: { estado: string; t: string; nota: string }[];
  entrega: string; fotos: { k: string; txt: string; t: string }[];
  mensaje: string; interno: string; presupuesto: Presupuesto | null;
};

const str = (v: unknown, max = 200) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const fechaISO = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");
const num = (v: unknown) => { const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/\s/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".")); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };
const esFoto = (k: string) => /^[a-z0-9-]+\.(jpg|webp|png)$/.test(k);
const TOKEN = /^[A-Za-z0-9]{16}$/;
function nuevoToken() {
  const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const r = crypto.getRandomValues(new Uint8Array(16));
  return [...r].map((x) => abc[x % abc.length]).join("");
}
export function totales(p: Presupuesto | null) {
  if (!p) return { base: 0, igic: 0, total: 0 };
  const base = Math.round(p.lineas.reduce((a, l) => a + l.n * l.p, 0) * 100) / 100;
  const igic = Math.round(base * (p.igic / 100) * 100) / 100;
  return { base, igic, total: Math.round((base + igic) * 100) / 100 };
}
function limpiarPresupuesto(input: any, prev: Presupuesto | null): Presupuesto {
  const lineas = (Array.isArray(input?.lineas) ? input.lineas : prev?.lineas || [])
    .map((l: any) => ({ c: str(l?.c, 160), n: num(l?.n) || 1, p: num(l?.p) }))
    .filter((l: Linea) => l.c).slice(0, 40);
  const igic = input?.igic !== undefined ? Math.min(Math.max(num(input.igic), 0), 30) : prev?.igic ?? 7;
  return {
    lineas, igic,
    nota: input?.nota !== undefined ? str(input.nota, 1500) : prev?.nota || "",
    validez: input?.validez !== undefined ? fechaISO(input.validez) : prev?.validez || "",
    estado: prev?.estado || "borrador", enviado: prev?.enviado || "", respuesta: prev?.respuesta || null,
  };
}
function publica(o: Orden) {
  const p = o.presupuesto && o.presupuesto.estado !== "borrador" ? o.presupuesto : null;
  return {
    token: o.token, nombre: o.cliente.nombre.split(" ")[0], idioma: o.cliente.idioma,
    vehiculo: o.vehiculo, estado: o.estado, pasos: o.pasos.map(({ estado, t, nota }) => ({ estado, t, nota })),
    entrega: o.entrega, fotos: o.fotos, mensaje: o.mensaje, actualizado: o.actualizado,
    presupuesto: p ? { lineas: p.lineas, igic: p.igic, nota: p.nota, validez: p.validez, estado: p.estado, respuesta: p.respuesta ? { t: p.respuesta.t, nombre: p.respuesta.nombre } : null, base: totales(p).base, igicImporte: totales(p).igic, total: totales(p).total } : null,
  };
}
async function anotarEnLead(leadId: string, cambios: Record<string, unknown>, actividad?: { tipo: string; txt: string }) {
  if (!leadId) return;
  const s = store("solicitudes");
  const l = (await s.get("s/" + leadId, { type: "json" })) as any;
  if (!l) return;
  const t = new Date().toISOString();
  Object.assign(l, cambios);
  if (cambios.estado && cambios.estado !== (l.historial?.slice(-1)[0]?.estado)) l.historial = [...(l.historial || []), { t, estado: cambios.estado }].slice(-30);
  if (actividad) l.actividad = [...(l.actividad || []), { t, ...actividad }].slice(-200);
  await s.setJSON("s/" + leadId, l);
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const partes = url.pathname.split("/").filter(Boolean); // api, ordenes|seguimiento, token, respuesta
  const s = store("ordenes");
  const token = partes[2] || "";

  // ---------- lado del cliente ----------
  if (partes[1] === "seguimiento") {
    if (!TOKEN.test(token)) return json({ error: "Enlace no válido" }, 404);
    const o = (await s.get("o/" + token, { type: "json" })) as Orden | null;
    if (!o) return json({ error: "Enlace no válido o caducado" }, 404);
    if (req.method === "GET" && !partes[3]) return json(publica(o));
    if (req.method === "POST" && partes[3] === "respuesta") {
      if (!mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
      const input = (await req.json().catch(() => ({}))) as any;
      const p = o.presupuesto;
      if (!p || p.estado !== "enviado") return json({ error: "Este presupuesto ya no admite respuesta." }, 409);
      const accion = input.accion === "aceptar" ? "aceptado" : input.accion === "rechazar" ? "rechazado" : "";
      if (!accion) return json({ error: "Respuesta no válida." }, 400);
      const nombre = str(input.nombre, 80);
      if (accion === "aceptado" && (nombre.length < 2 || input.acepta !== true)) return json({ error: "Escribe tu nombre y marca la casilla para aceptar." }, 400);
      const t = new Date().toISOString();
      p.estado = accion; p.respuesta = { t, nombre, comentario: str(input.comentario, 800) };
      o.pasos.push({ estado: "presupuesto-" + accion, t, nota: "" });
      o.actualizado = t;
      await s.setJSON("o/" + token, o);
      const tot = totales(p);
      const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
      await anotarEnLead(o.lead, accion === "aceptado" ? { estado: "ganada", importe: tot.total } : {},
        { tipo: "presupuesto", txt: `Presupuesto ${accion} por el cliente (${eur(tot.total)})${p.respuesta.comentario ? ": " + p.respuesta.comentario : ""}` });
      await enviarAviso(`Presupuesto ${accion.toUpperCase()}: ${o.cliente.nombre} · ${eur(tot.total)}`, [
        ["Cliente", o.cliente.nombre], ["Teléfono", o.cliente.telefono], ["Coche", [o.vehiculo.coche, o.vehiculo.matricula].filter(Boolean).join(" · ")],
        ["Total", eur(tot.total)], ["Firmado como", nombre], ["Comentario", p.respuesta.comentario],
      ], [
        { txt: "WhatsApp al cliente", url: `https://wa.me/${waNum(o.cliente.telefono)}`, color: "#1F8B4C" },
        { txt: "Abrir la orden", url: `${url.origin}/admin#ordenes` },
      ]).catch(() => false);
      return json(publica(o));
    }
    return json({ error: "Método no permitido" }, 405);
  }

  // ---------- panel ----------
  if (!(await isAdmin(req))) return json({ error: "No autorizado" }, 401);

  if (req.method === "GET" && !token) {
    const { blobs } = await s.list({ prefix: "o/" });
    const todas = (await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" }) as Promise<Orden | null>))).filter(Boolean) as Orden[];
    return json(todas.sort((a, b) => b.actualizado.localeCompare(a.actualizado)).map((o) => ({ ...o, totales: totales(o.presupuesto) })));
  }

  if (req.method === "POST" && !token) {
    const input = (await req.json().catch(() => ({}))) as any;
    let lead: any = null;
    if (input.lead && /^[0-9]{14,20}-[a-f0-9]{8}$/.test(input.lead)) lead = await store("solicitudes").get("s/" + input.lead, { type: "json" });
    const t = new Date().toISOString();
    const v = lead?.vehiculo || {};
    const o: Orden = {
      token: nuevoToken(), creado: t, actualizado: t, lead: lead?.id || "",
      cliente: {
        nombre: str(input.nombre ?? lead?.nombre, 80), telefono: str(input.telefono ?? lead?.telefono, 30),
        email: str(input.email ?? lead?.email, 120), idioma: (input.idioma ?? lead?.idioma) === "en" ? "en" : "es",
      },
      vehiculo: { coche: str(input.coche ?? (v.coche || [v.marca, v.modelo].filter(Boolean).join(" ")), 120), matricula: str(input.matricula ?? v.matricula, 20), km: str(input.km, 20) },
      estado: "recibido", pasos: [{ estado: "recibido", t, nota: "" }], entrega: fechaISO(input.entrega),
      fotos: [], mensaje: "", interno: "", presupuesto: null,
    };
    if (o.cliente.nombre.length < 2) return json({ error: "Falta el nombre del cliente." }, 400);
    await s.setJSON("o/" + o.token, o);
    if (o.lead) await anotarEnLead(o.lead, { orden: o.token }, { tipo: "orden", txt: "Orden de trabajo creada (coche recibido en el taller)" });
    return json({ ...o, totales: totales(null) }, 201);
  }

  if (!TOKEN.test(token)) return json({ error: "Orden no encontrada" }, 404);
  const o = (await s.get("o/" + token, { type: "json" })) as Orden | null;
  if (!o) return json({ error: "Orden no encontrada" }, 404);

  if (req.method === "PATCH") {
    const input = (await req.json().catch(() => ({}))) as any;
    const t = new Date().toISOString();
    if (input.estado !== undefined && PASOS.includes(input.estado) && input.estado !== o.estado) {
      o.estado = input.estado;
      o.pasos.push({ estado: input.estado, t, nota: str(input.nota, 400) });
      if (o.lead && input.estado === "listo") await anotarEnLead(o.lead, {}, { tipo: "orden", txt: "Coche listo para recoger" });
      if (o.lead && input.estado === "entregado") await anotarEnLead(o.lead, { estado: "ganada" }, { tipo: "orden", txt: "Coche entregado al cliente" });
    }
    if (input.entrega !== undefined) o.entrega = fechaISO(input.entrega);
    if (input.mensaje !== undefined) o.mensaje = str(input.mensaje, 1500);
    if (input.interno !== undefined) o.interno = str(input.interno, 3000);
    if (input.cliente && typeof input.cliente === "object") for (const k of ["nombre", "telefono", "email"] as const) if (input.cliente[k] !== undefined) o.cliente[k] = str(input.cliente[k], 120);
    if (input.vehiculo && typeof input.vehiculo === "object") for (const k of ["coche", "matricula", "km"] as const) if (input.vehiculo[k] !== undefined) o.vehiculo[k] = str(input.vehiculo[k], 120);
    if (Array.isArray(input.fotos)) o.fotos = input.fotos.map((f: any) => ({ k: str(f?.k, 60), txt: str(f?.txt, 160), t: str(f?.t, 30) || t })).filter((f: any) => esFoto(f.k)).slice(0, 40);
    if (input.presupuesto && typeof input.presupuesto === "object") {
      if (o.presupuesto && ["aceptado"].includes(o.presupuesto.estado) && !input.presupuesto.reabrir) return json({ error: "El cliente ya aceptó este presupuesto. Para cambiarlo, reábrelo." }, 409);
      o.presupuesto = limpiarPresupuesto(input.presupuesto, o.presupuesto);
      if (input.presupuesto.reabrir) { o.presupuesto.estado = "borrador"; o.presupuesto.respuesta = null; }
      if (input.presupuesto.enviar) {
        if (!o.presupuesto.lineas.length) return json({ error: "Añade al menos una línea al presupuesto." }, 400);
        o.presupuesto.estado = "enviado"; o.presupuesto.enviado = t; o.presupuesto.respuesta = null;
        if (o.estado === "recibido" || o.estado === "diagnostico") { o.estado = "presupuesto"; o.pasos.push({ estado: "presupuesto", t, nota: "" }); }
        await anotarEnLead(o.lead, {}, { tipo: "presupuesto", txt: `Presupuesto enviado (${totales(o.presupuesto).total.toLocaleString("es-ES")} €)` });
      }
    }
    o.actualizado = t;
    await s.setJSON("o/" + token, o);
    return json({ ...o, totales: totales(o.presupuesto) });
  }

  if (req.method === "DELETE") {
    await s.delete("o/" + token);
    return json({ ok: true });
  }
  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/ordenes", "/api/ordenes/:token", "/api/seguimiento/:token", "/api/seguimiento/:token/respuesta"],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
