/*
  AVISOS EXTERNOS GRATUITOS DE CADA CLIENTE NUEVO (además del email de Resend que ya existía)
  Se envían solo si están puestas las variables en Netlify (Project configuration → Environment variables):

   · Telegram (gratis, llega al móvil al instante):
       TELEGRAM_BOT_TOKEN  = el token que te da @BotFather  (123456:ABC-DEF…)
       TELEGRAM_CHAT_ID    = tu chat o grupo (lo ves escribiendo a @userinfobot, o el del grupo)
   · Google Sheets (gratis, una fila por cliente en tu hoja):
       SHEETS_WEBHOOK_URL  = la dirección «/exec» de tu Apps Script (ver tools/asistente/google-script.js)
       SHEETS_SECRET       = la misma clave que pusiste en el script (evita que otros te llenen la hoja)

  Nunca bloquean al cliente: si Telegram o Google fallan, la solicitud se guarda igual en el panel.
*/
import { store } from "./shared.mts";
type Lead = {
  id: string; creado: string; tipo: string; estado?: string; nombre: string; telefono: string; email?: string; mensaje?: string;
  coche?: { titulo: string; precio: number | null } | null; servicios?: string[]; vehiculo?: Record<string, string>;
  cita?: { fecha: string; hora: string } | null; idioma?: string; fotos?: string[]; origen?: { canal?: string; utm_campaign?: string; landing?: string };
};

const env = (k: string) => String((globalThis as any).Netlify?.env?.get(k) || "").trim();
const TIPO: Record<string, string> = { coche: "Interesado en un coche", taller: "Cita de taller", tasacion: "Tasación", contacto: "Consulta", financiacion: "Financiación" };
const escT = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
const telNum = (t: string) => { let d = String(t || "").replace(/[^\d]/g, ""); if (d.startsWith("00")) d = d.slice(2); if (d.length === 9) d = "34" + d; return d; };
const fecha = (f: string) => (f ? new Date(f + "T12:00:00Z").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }) : "");
const precio = (n: number | null | undefined) => (n ? n.toLocaleString("es-ES", { maximumFractionDigits: 2 }) + " €" : "");

export function resumenLead(x: Lead) {
  const v = x.vehiculo || {};
  return {
    tipo: TIPO[x.tipo] || x.tipo,
    cita: x.cita ? `${fecha(x.cita.fecha)} a las ${x.cita.hora}` : "",
    coche: x.coche ? `${x.coche.titulo}${x.coche.precio ? " · " + precio(x.coche.precio) : ""}` : [v.coche, v.matricula && `(${v.matricula})`].filter(Boolean).join(" "),
    servicios: (x.servicios || []).join(", "),
    canal: x.origen?.canal || "Directo",
  };
}

async function telegram(x: Lead, origin: string) {
  const token = env("TELEGRAM_BOT_TOKEN"), chat = env("TELEGRAM_CHAT_ID");
  if (!token || !chat) return;
  const r = resumenLead(x);
  const lineas = [
    `🔥 <b>${escT(x.cita ? "Nueva cita" : "Nuevo cliente")}</b> · ${escT(r.tipo)}`,
    `👤 <b>${escT(x.nombre)}</b> · ${escT(x.telefono)}`,
    r.cita && `📅 ${escT(r.cita)}`,
    r.coche && `🚗 ${escT(r.coche)}`,
    r.servicios && `🔧 ${escT(r.servicios)}`,
    x.mensaje && `💬 ${escT(x.mensaje.slice(0, 700))}`,
    x.fotos?.length && `📷 ${x.fotos.length} foto${x.fotos.length > 1 ? "s" : ""} del daño (van debajo)`,
    `📍 Viene de: ${escT(r.canal)}${x.idioma === "en" ? " · 🇬🇧 inglés" : ""}`,
  ].filter(Boolean).join("\n");
  const saludo = x.idioma === "en" ? `Hi ${x.nombre.split(" ")[0]}, this is Volcano Cars. ` : `Hola ${x.nombre.split(" ")[0]}, te escribimos de Volcano Cars. `;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chat, text: lineas, parse_mode: "HTML", disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[
        { text: "💬 WhatsApp al cliente", url: `https://wa.me/${telNum(x.telefono)}?text=${encodeURIComponent(saludo)}` },
        { text: "📋 Abrir el CRM", url: `${origin}/admin#crm` },
      ]] },
    }),
    signal: AbortSignal.timeout(6000),
  });
  // Presupuesto por foto: las fotos del daño llegan al móvil para poder contestar enseguida
  if (x.fotos?.length) {
    const s = store("clientes-fotos");
    const fotos = (await Promise.all(x.fotos.slice(0, 4).map((k) => s.get(k, { type: "arrayBuffer" }).catch(() => null)))).filter(Boolean) as ArrayBuffer[];
    if (!fotos.length) return;
    const fd = new FormData();
    fd.set("chat_id", chat);
    fd.set("media", JSON.stringify(fotos.map((_, i) => ({ type: "photo", media: `attach://f${i}`, ...(i === 0 ? { caption: `📷 ${x.nombre} · ${x.telefono}` } : {}) }))));
    fotos.forEach((b, i) => fd.set(`f${i}`, new Blob([b], { type: "image/jpeg" }), `foto-${i + 1}.jpg`));
    await fetch(`https://api.telegram.org/bot${token}/sendMediaGroup`, { method: "POST", body: fd, signal: AbortSignal.timeout(10000) });
  }
}

async function sheets(x: Lead) {
  const url = env("SHEETS_WEBHOOK_URL");
  if (!url || !/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) return;
  const r = resumenLead(x);
  // Apps Script responde con una redirección (302) después de guardar: no hace falta seguirla.
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      clave: env("SHEETS_SECRET"), id: x.id, fecha: x.creado, tipo: r.tipo, nombre: x.nombre, telefono: x.telefono, email: x.email || "",
      cita: r.cita, coche: r.coche, servicios: r.servicios, mensaje: (x.mensaje || "").slice(0, 1500), canal: r.canal,
      campana: x.origen?.utm_campaign || "", pagina: x.origen?.landing || "", idioma: x.idioma || "es",
      whatsapp: `https://wa.me/${telNum(x.telefono)}`,
    }),
    redirect: "manual",
    signal: AbortSignal.timeout(6000),
  });
}

export async function notificarExternos(x: Lead, origin: string) {
  await Promise.allSettled([telegram(x, origin), sheets(x)]);
}
