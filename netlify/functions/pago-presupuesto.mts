import type { Config } from "@netlify/functions";
import { createHmac, timingSafeEqual } from "node:crypto";
import { store, json, enviarAviso, waNum, mismoOrigen } from "../lib/shared.mts";

/*
  PAGO DEL PRESUPUESTO CON STRIPE (tarjeta, Apple Pay, Google Pay)
  Cliente (enlace secreto /s/:token):
  - POST /api/seguimiento/:token/pagar  → crea el pago en Stripe y devuelve la URL de la pasarela
  - GET  /api/seguimiento/:token/pago   → al volver de Stripe, comprueba el pago y pasa la orden a «En reparación»
  Stripe (opcional, refuerzo):
  - POST /api/stripe/webhook            → mismo efecto si el cliente cierra el navegador antes de volver
  Variables en Netlify: STRIPE_SECRET_KEY (obligatoria) y STRIPE_WEBHOOK_SECRET (solo para el webhook).
  Clave configurada en Netlify el 27/09/2026.
  Sin STRIPE_SECRET_KEY la web sigue funcionando: el cliente acepta el presupuesto como antes, sin pagar.
*/

const env = (k: string) => String((globalThis as any).Netlify?.env?.get(k) || "").trim();
const TOKEN = /^[A-Za-z0-9]{16}$/;
const str = (v: unknown, max = 200) => String(v ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const eur = (n: number) => n.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
const PREVIOS = ["recibido", "diagnostico", "presupuesto"];

function totales(p: any) {
  if (!p) return { base: 0, igic: 0, total: 0 };
  const base = Math.round((p.lineas || []).reduce((a: number, l: any) => a + l.n * l.p, 0) * 100) / 100;
  const igic = Math.round(base * ((p.igic || 0) / 100) * 100) / 100;
  return { base, igic, total: Math.round((base + igic) * 100) / 100 };
}

// Codifica objetos anidados al formato que pide la API de Stripe (a[b][c]=valor)
function form(obj: any, prefijo = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === "") continue;
    const clave = prefijo ? `${prefijo}[${k}]` : k;
    if (typeof v === "object") form(v, clave, out); else out.append(clave, String(v));
  }
  return out;
}
async function stripe(ruta: string, metodo = "GET", datos?: any) {
  const r = await fetch("https://api.stripe.com/v1/" + ruta, {
    method: metodo,
    headers: { authorization: "Bearer " + env("STRIPE_SECRET_KEY"), ...(datos ? { "content-type": "application/x-www-form-urlencoded" } : {}) },
    body: datos ? form(datos).toString() : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const j = (await r.json().catch(() => ({}))) as any;
  if (!r.ok) throw new Error(j?.error?.message || "Stripe no responde");
  return j;
}

async function anotarEnLead(leadId: string, cambios: Record<string, unknown>, actividad: { tipo: string; txt: string }) {
  if (!leadId) return;
  const s = store("solicitudes");
  const l = (await s.get("s/" + leadId, { type: "json" })) as any;
  if (!l) return;
  const t = new Date().toISOString();
  Object.assign(l, cambios);
  if (cambios.estado && cambios.estado !== l.historial?.slice(-1)[0]?.estado) l.historial = [...(l.historial || []), { t, estado: cambios.estado }].slice(-30);
  l.actividad = [...(l.actividad || []), { t, ...actividad }].slice(-200);
  await s.setJSON("s/" + leadId, l);
}

// Marca el presupuesto como aprobado y pagado y pasa el coche a «En reparación». Se puede llamar varias veces sin duplicar nada.
async function confirmar(token: string, sesion: any, origen: string) {
  const s = store("ordenes");
  const o = (await s.get("o/" + token, { type: "json" })) as any;
  if (!o || !o.presupuesto) return { ok: false, motivo: "sin-orden" };
  const p = o.presupuesto;
  if (p.pago?.estado === "pagado") return { ok: true, o };
  if (sesion.payment_status !== "paid") return { ok: false, motivo: "no-pagado" };
  if (sesion.metadata?.token !== token) return { ok: false, motivo: "otra-orden" };
  const t = new Date().toISOString();
  const importe = Math.round(Number(sesion.amount_total || 0)) / 100;
  const nombre = str(p.pago?.nombre || sesion.customer_details?.name || o.cliente?.nombre, 80);
  // Si el presupuesto se cambió en el panel después de que el cliente abriera el pago, el importe cobrado
  // ya no coincide: se acepta el pago (el dinero ya está cobrado) pero se avisa para cobrar o devolver la diferencia.
  const esperado = totales(p).total, diferencia = Math.round((importe - esperado) * 100) / 100;
  const avisoDif = Math.abs(diferencia) >= 0.01 ? `OJO: el presupuesto actual es de ${eur(esperado)} y se han cobrado ${eur(importe)} (diferencia ${eur(diferencia)}). Revisa y cobra o devuelve la diferencia.` : "";
  p.estado = "aceptado";
  p.respuesta = { t, nombre, comentario: str(p.pago?.comentario, 800) };
  p.pago = { estado: "pagado", importe, sesion: sesion.id, pi: String(sesion.payment_intent || ""), t, nombre, comentario: p.pago?.comentario || "" };
  o.pasos.push({ estado: "presupuesto-aceptado", t, nota: `Pagado con tarjeta: ${eur(importe)}` + (avisoDif ? " · " + avisoDif : "") });
  if (PREVIOS.includes(o.estado)) { o.estado = "reparacion"; o.pasos.push({ estado: "reparacion", t, nota: "" }); }
  o.actualizado = t;
  await s.setJSON("o/" + token, o);
  await anotarEnLead(o.lead, { estado: "ganada", importe }, { tipo: "presupuesto", txt: `Presupuesto aprobado y PAGADO por el cliente (${eur(importe)})` }).catch(() => {});
  await enviarAviso(`Presupuesto PAGADO: ${o.cliente.nombre} · ${eur(importe)}`, [
    ["Cliente", o.cliente.nombre], ["Teléfono", o.cliente.telefono], ["Coche", [o.vehiculo.coche, o.vehiculo.matricula].filter(Boolean).join(" · ")],
    ["Pagado", eur(importe)], ["Firmado como", nombre], ["Comentario", p.respuesta.comentario], ["Estado", "Pasa a «En reparación»"], ...(avisoDif ? [["Importe distinto", avisoDif] as [string, string]] : []),
  ], [
    { txt: "WhatsApp al cliente", url: `https://wa.me/${waNum(o.cliente.telefono)}`, color: "#1F8B4C" },
    { txt: "Abrir la orden", url: `${origen}/admin#ordenes` },
  ]).catch(() => false);
  return { ok: true, o };
}

function firmaValida(cuerpo: string, cabecera: string, secreto: string) {
  const partes = Object.fromEntries(cabecera.split(",").map((x) => x.split("=") as [string, string]));
  const t = partes.t, v1 = cabecera.split(",").filter((x) => x.startsWith("v1=")).map((x) => x.slice(3));
  if (!t || !v1.length || Math.abs(Date.now() / 1000 - Number(t)) > 600) return false;
  const esperada = createHmac("sha256", secreto).update(`${t}.${cuerpo}`).digest();
  return v1.some((f) => { const b = Buffer.from(f, "hex"); return b.length === esperada.length && timingSafeEqual(b, esperada); });
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const partes = url.pathname.split("/").filter(Boolean);

  // ---------- webhook de Stripe ----------
  if (partes[1] === "stripe") {
    const secreto = env("STRIPE_WEBHOOK_SECRET");
    const cuerpo = await req.text();
    if (!secreto || !env("STRIPE_SECRET_KEY")) return json({ ignorado: true });
    if (!firmaValida(cuerpo, req.headers.get("stripe-signature") || "", secreto)) return json({ error: "Firma no válida" }, 400);
    const ev = JSON.parse(cuerpo);
    if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(ev.type) && ev.data?.object?.metadata?.tipo === "presupuesto") {
      const sesion = ev.data.object, token = String(sesion.metadata.token || "");
      if (TOKEN.test(token)) await confirmar(token, sesion, url.origin);
    }
    return json({ recibido: true });
  }

  // ---------- cliente ----------
  const token = partes[2] || "";
  if (!TOKEN.test(token)) return json({ error: "Enlace no válido" }, 404);
  const s = store("ordenes");
  const o = (await s.get("o/" + token, { type: "json" })) as any;
  if (!o) return json({ error: "Enlace no válido o caducado" }, 404);
  const p = o.presupuesto;

  if (req.method === "POST" && partes[3] === "pagar") {
    if (!mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
    const input = (await req.json().catch(() => ({}))) as any;
    if (!p || p.estado !== "enviado") return json({ error: "Este presupuesto ya no admite respuesta." }, 409);
    const nombre = str(input.nombre, 80);
    if (nombre.length < 2 || input.acepta !== true) return json({ error: "Escribe tu nombre y marca la casilla para aceptar." }, 400);
    const total = totales(p).total, centimos = Math.round(total * 100);
    // Sin Stripe configurado (o importe demasiado pequeño): la página acepta el presupuesto como siempre
    if (!env("STRIPE_SECRET_KEY") || centimos < 50) return json({ sinPago: true });
    const en = o.cliente?.idioma === "en";
    const coche = [o.vehiculo?.coche, o.vehiculo?.matricula ? String(o.vehiculo.matricula).toUpperCase() : ""].filter(Boolean).join(" · ");
    const datos = { tipo: "presupuesto", token, nombre, orden: String(o.num || "") };
    try {
      const sesion = await stripe("checkout/sessions", "POST", {
        mode: "payment",
        locale: en ? "en" : "es",
        client_reference_id: token,
        customer_email: /@/.test(o.cliente?.email || "") ? o.cliente.email : undefined,
        line_items: { 0: { quantity: 1, price_data: { currency: "eur", unit_amount: centimos, product_data: { name: (en ? "Repair quote" : "Presupuesto de reparación") + (coche ? " · " + coche : ""), description: (p.lineas || []).map((l: any) => l.c).join(", ").slice(0, 490) || undefined } } } },
        metadata: datos,
        payment_intent_data: { description: `Presupuesto ${coche || token} · ${o.cliente?.nombre || ""}`.slice(0, 200), metadata: datos },
        success_url: `${url.origin}/s/${token}?pago=ok&sid={CHECKOUT_SESSION_ID}`,
        cancel_url: `${url.origin}/s/${token}?pago=cancelado`,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      });
      p.pago = { estado: "pendiente", sesion: sesion.id, nombre, comentario: str(input.comentario, 800), t: new Date().toISOString() };
      o.actualizado = p.pago.t;
      await s.setJSON("o/" + token, o);
      return json({ url: sesion.url });
    } catch (e: any) {
      return json({ error: "No se ha podido abrir el pago con tarjeta. Inténtalo en un momento o escríbenos por WhatsApp." }, 502);
    }
  }

  if (req.method === "GET" && partes[3] === "pago") {
    if (p?.pago?.estado === "pagado") return json({ pagado: true });
    const sid = str(url.searchParams.get("sid") || p?.pago?.sesion, 120);
    if (!sid || !/^cs_[A-Za-z0-9_]+$/.test(sid) || !env("STRIPE_SECRET_KEY")) return json({ pagado: false });
    try {
      const sesion = await stripe("checkout/sessions/" + sid);
      const r = await confirmar(token, sesion, url.origin);
      return json({ pagado: r.ok });
    } catch { return json({ pagado: false }); }
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/seguimiento/:token/pagar", "/api/seguimiento/:token/pago", "/api/stripe/webhook"],
  // Sin límite, alguien podía crear cientos de pagos en Stripe seguidos con un enlace de seguimiento
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
