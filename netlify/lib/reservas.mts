/*
  RESERVA ONLINE DE 50 € (REEMBOLSABLES) · lógica común
  ---------------------------------------------------------------------------------
  Estados de una reserva:
    iniciada   → el cliente ha rellenado sus datos y está pagando. El coche queda apartado en silencio
                 (sigue «Disponible» en la web) para que nadie pague a la vez: 35 min con tarjeta, 60 min
                 con transferencia o Bizum. Si no termina, se libera sola.
    pendiente  → transferencia o Bizum con justificante subido. El coche pasa a RESERVADO al momento.
                 Tienes 12 h para comprobar el dinero y pulsar «Confirmar» en el panel; si no, se libera solo.
    confirmada → pago comprobado (tarjeta: Stripe lo confirma solo). 48 h de reserva exclusiva.
                 Pasadas las 48 h NO se libera sola: el panel la marca como vencida y decides tú.
    cancelada  → liberada (por ti, por caducar o porque el cliente no terminó). El coche vuelve a «Disponible»
                 y la lista de espera queda lista para avisar.
    vendida    → el cliente compró el coche: los 50 € van a cuenta del precio.

  Almacén «reservas»:
    r/<token>        la reserva (el token es secreto: es el enlace privado /r/<token> del cliente)
    coche/<id>       qué reserva tiene apartado ese coche ahora mismo
    espera/<id>      lista de espera del coche
    stripe/<sesión>  de qué reserva es cada pago con tarjeta
    config           datos de pago (IBAN, titular, Bizum) y si la reserva está activa
  Almacén «reservas-docs»: justificantes de transferencia (privados, solo el panel).
*/
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { store, enviarAviso, waNum } from "./shared.mts";
import type { Car } from "./shared.mts";

export const IMPORTE = 50;
export const MIN_PAGO_TARJETA = 35;        // minutos que el coche queda apartado mientras paga con tarjeta
export const MIN_PAGO_TRANSFER = 60;       // … y mientras hace la transferencia o el Bizum
export const HORAS_VERIFICAR = 12;         // para comprobar una transferencia antes de que se libere sola
export const HORAS_RESERVA = 48;           // reserva exclusiva

export type Metodo = "tarjeta" | "transferencia" | "bizum";
export type EstadoReserva = "iniciada" | "pendiente" | "confirmada" | "cancelada" | "vendida";
export type Reserva = {
  token: string; codigo: string; estado: EstadoReserva; metodo: Metodo; importe: number;
  coche: { id: string; titulo: string; version: string; anio: number; precio: number; foto: string; matricula?: string };
  nombre: string; telefono: string; email: string; idioma: "es" | "en";
  cita: { fecha: string; hora: string } | null;
  creado: string; hastaPago: string; justificante?: string; justificanteEn?: string; hastaVerificar?: string;
  pagado?: string; hasta?: string; cerrado?: string; motivo?: string; reembolso?: "pendiente" | "hecho" | "";
  stripe?: { sesion: string; pago?: string; url?: string };
  solicitud?: string; avisoVencida?: boolean;
  historial: { t: string; txt: string }[];
};
export type Espera = { id: string; nombre: string; telefono: string; idioma: "es" | "en"; t: string; avisado?: string };
export type Config = { activa: boolean; iban: string; titular: string; banco: string; bizum: string };

const env = (k: string) => String((globalThis as any).Netlify?.env?.get(k) || "").trim();
export const R = () => store("reservas");
export const DOCS = () => store("reservas-docs");
const ahora = () => new Date().toISOString();
const masMin = (min: number, desde = Date.now()) => new Date(desde + min * 60e3).toISOString();
export const esToken = (t: string) => /^[A-Za-z0-9_-]{24}$/.test(t);
export const nuevoToken = () => randomBytes(18).toString("base64url");
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const nuevoCodigo = () => "VC-" + [...randomBytes(6)].map((b) => LETRAS[b % LETRAS.length]).join("");
export const nota = (r: Reserva, txt: string) => { r.historial = [...(r.historial || []), { t: ahora(), txt }].slice(-40); };

// ---------------- configuración (panel → Coches → Reserva online) ----------------
export const CONFIG_DEF: Config = { activa: true, iban: "", titular: "", banco: "", bizum: "" };
export async function leerConfig(): Promise<Config> {
  const c = (await R().get("config", { type: "json" }).catch(() => null)) as Partial<Config> | null;
  return { ...CONFIG_DEF, ...(c || {}) };
}
export const ibanBonito = (v: string) => String(v || "").replace(/\s+/g, "").toUpperCase().replace(/(.{4})/g, "$1 ").trim();
export function ibanValido(v: string) {
  const i = String(v || "").replace(/\s+/g, "").toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(i)) return false;
  const n = (i.slice(4) + i.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  let r = 0; for (const d of n) r = (r * 10 + +d) % 97;
  return r === 1;
}
export const stripeActivo = () => /^(sk|rk)_(live|test)_/.test(env("STRIPE_SECRET_KEY"));
// Qué formas de pago enseña la web
export async function configPublica() {
  const c = await leerConfig();
  const transferencia = c.iban && c.titular ? { iban: ibanBonito(c.iban), titular: c.titular, banco: c.banco } : null;
  const bizum = /^\d{9}$/.test(c.bizum.replace(/\s/g, "")) ? c.bizum.replace(/\s/g, "").replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4") : "";
  const tarjeta = stripeActivo();
  const activa = c.activa && (tarjeta || !!transferencia || !!bizum);
  return { activa, importe: IMPORTE, tarjeta: activa && tarjeta, transferencia: activa ? transferencia : null, bizum: activa ? bizum : "", horas: HORAS_RESERVA };
}
export const concepto = (r: Reserva) => `Reserva ${r.codigo} ${r.coche.titulo}`.slice(0, 35);

// ---------------- coches ----------------
export async function leerCoches(): Promise<Car[]> {
  return (((await store("monzacar").get("coches", { type: "json" })) as Car[] | null) || []);
}
// Cambia el estado de un coche en la web. «si» = solo si ahora está en ese estado.
export async function estadoCoche(id: string, estado: Car["estado"], si?: Car["estado"]) {
  const s = store("monzacar");
  const lista = await leerCoches();
  const c = lista.find((x) => x.id === id);
  if (!c || (si && c.estado !== si) || c.estado === estado) return c || null;
  c.estado = estado; c.actualizado = ahora();
  if (estado === "vendido") c.vendidoEn = c.vendidoEn || ahora();
  await s.setJSON("coches", lista);
  return c;
}

// ---------------- reservas ----------------
export const leer = async (token: string) => (esToken(token) ? ((await R().get("r/" + token, { type: "json" }).catch(() => null)) as Reserva | null) : null);
export const guardar = (r: Reserva) => R().setJSON("r/" + r.token, r);
export async function apartadoDe(cocheId: string): Promise<Reserva | null> {
  const p = (await R().get("coche/" + cocheId, { type: "json" }).catch(() => null)) as { token: string } | null;
  if (!p) return null;
  const r = await leer(p.token);
  if (!r || !activa(r)) { await R().delete("coche/" + cocheId).catch(() => {}); return null; }
  return r;
}
export function activa(r: Reserva) {
  if (r.estado === "iniciada") return Date.parse(r.hastaPago) > Date.now();
  return r.estado === "pendiente" || r.estado === "confirmada";
}
// Aparta el coche para esta reserva (si dos personas pulsan a la vez, gana la última escritura y la otra recibe «ocupado»)
export async function apartar(r: Reserva): Promise<boolean> {
  if (await apartadoDe(r.coche.id)) return false;
  await R().setJSON("coche/" + r.coche.id, { token: r.token });
  const v = (await R().get("coche/" + r.coche.id, { type: "json" }).catch(() => null)) as { token: string } | null;
  return !!v && v.token === r.token;
}
async function soltar(r: Reserva) {
  const p = (await R().get("coche/" + r.coche.id, { type: "json" }).catch(() => null)) as { token: string } | null;
  if (p && p.token === r.token) await R().delete("coche/" + r.coche.id);
}

// Apunta en la ficha del cliente del CRM lo que va pasando con su reserva
export async function alCRM(r: Reserva, txt: string, estado?: string) {
  if (!r.solicitud) return;
  const s = store("solicitudes");
  const x = (await s.get("s/" + r.solicitud, { type: "json" }).catch(() => null)) as any;
  if (!x) return;
  const t = ahora();
  x.actividad = [...(x.actividad || []), { t, tipo: "sistema", txt }].slice(-200);
  if (estado && x.estado !== estado) { x.estado = estado; x.historial = [...(x.historial || []), { t, estado }].slice(-30); }
  if (r.estado === "confirmada" || r.estado === "vendida") x.importe = x.importe ?? r.coche.precio;
  await s.setJSON("s/" + r.solicitud, x);
}

// Vista para el cliente (enlace privado /r/<token>)
export async function vistaPublica(r: Reserva) {
  const cfg = await configPublica();
  const esperandoPago = r.estado === "iniciada" && r.metodo !== "tarjeta";
  return {
    codigo: r.codigo, estado: r.estado, metodo: r.metodo, importe: r.importe, idioma: r.idioma,
    coche: r.coche, nombre: r.nombre, telefono: r.telefono, cita: r.cita,
    creado: r.creado, hastaPago: r.hastaPago, hastaVerificar: r.hastaVerificar || "", pagado: r.pagado || "", hasta: r.hasta || "",
    justificante: !!r.justificante, motivo: r.estado === "cancelada" ? r.motivo || "" : "",
    pago: esperandoPago ? { concepto: concepto(r), transferencia: cfg.transferencia, bizum: cfg.bizum } : null,
    tarjetaUrl: r.estado === "iniciada" && r.metodo === "tarjeta" && Date.parse(r.hastaPago) > Date.now() ? r.stripe?.url || "" : "",
  };
}

// ---------------- cambios de estado ----------------
export async function pasarAPendiente(r: Reserva, doc: string) {
  r.estado = "pendiente"; r.justificante = doc; r.justificanteEn = ahora();
  r.hastaVerificar = masMin(HORAS_VERIFICAR * 60);
  nota(r, "El cliente ha subido el justificante: coche RESERVADO a la espera de comprobar el dinero");
  await guardar(r);
  await R().setJSON("coche/" + r.coche.id, { token: r.token });
  await estadoCoche(r.coche.id, "reservado", "disponible");
  await alCRM(r, `Reserva ${r.codigo}: justificante de ${r.metodo} subido. Comprueba el dinero y confírmala en Coches → Reservas.`);
}
export async function confirmar(r: Reserva, como: string, pago = "") {
  const antes = r.estado;
  r.estado = "confirmada"; r.pagado = r.pagado || ahora();
  r.hasta = masMin(HORAS_RESERVA * 60);
  if (pago && r.stripe) r.stripe.pago = pago;
  nota(r, como);
  await guardar(r);
  await R().setJSON("coche/" + r.coche.id, { token: r.token });
  await estadoCoche(r.coche.id, "reservado");
  await alCRM(r, `Reserva ${r.codigo} confirmada (${IMPORTE} € ${r.metodo === "tarjeta" ? "con tarjeta" : "por " + r.metodo}). Reserva hasta ${fechaHora(r.hasta)}.`, "cita");
  return antes;
}
// Liberar: vuelve a «Disponible» y devuelve la lista de espera para avisar
export async function cancelar(r: Reserva, motivo: string, tocarCoche = true) {
  const eraPublica = r.estado === "pendiente" || r.estado === "confirmada";
  r.estado = "cancelada"; r.cerrado = ahora(); r.motivo = motivo;
  if (r.pagado || r.justificante) r.reembolso = r.reembolso || "pendiente";
  nota(r, "Reserva liberada: " + motivo);
  await guardar(r);
  await soltar(r);
  if (tocarCoche && eraPublica) await estadoCoche(r.coche.id, "disponible", "reservado");
  await alCRM(r, `Reserva ${r.codigo} liberada: ${motivo}${r.reembolso === "pendiente" ? ". Recuerda devolver los 50 €." : ""}`);
  return eraPublica ? await leerEspera(r.coche.id) : [];
}
export async function vender(r: Reserva, tocarCoche = true) {
  r.estado = "vendida"; r.cerrado = ahora();
  nota(r, `Coche vendido a este cliente: los ${IMPORTE} € van a cuenta del precio`);
  await guardar(r);
  await soltar(r);
  if (tocarCoche) await estadoCoche(r.coche.id, "vendido");
  await alCRM(r, `Reserva ${r.codigo}: coche vendido. Los ${IMPORTE} € de la reserva van a cuenta.`, "ganada");
}

// ---------------- lista de espera ----------------
export const leerEspera = async (cocheId: string) => (((await R().get("espera/" + cocheId, { type: "json" }).catch(() => null)) as Espera[] | null) || []);
export const guardarEspera = (cocheId: string, l: Espera[]) => R().setJSON("espera/" + cocheId, l.slice(-100));

// ---------------- mensajes (los mismos textos que usa la web y el panel) ----------------
const fechaLarga = (f: string, en = false) => new Date(f + "T12:00:00Z").toLocaleDateString(en ? "en-GB" : "es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
export const fechaHora = (iso?: string) => (iso ? new Date(iso).toLocaleString("es-ES", { timeZone: "Atlantic/Canary", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "");
export function msgVuelveDisponible(e: { nombre: string; idioma?: string }, titulo: string, enlace: string) {
  const n = e.nombre.split(" ")[0];
  return e.idioma === "en"
    ? `Good news, ${n}! The ${titulo} is available again at Volcano Cars. Be the first to reserve it: ${enlace}`
    : `¡Buenas noticias, ${n}! El ${titulo} vuelve a estar disponible en Volcano Cars. Sé el primero en reservarlo: ${enlace}`;
}
export function msgConfirmacion(r: Reserva, enlace: string) {
  const n = r.nombre.split(" ")[0], en = r.idioma === "en";
  const cuando = r.cita ? (en ? ` See you on ${fechaLarga(r.cita.fecha, true)} at ${r.cita.hora} at our showroom in Antigua to test drive it.` : ` Nos vemos el ${fechaLarga(r.cita.fecha)} a las ${r.cita.hora} en nuestra exposición de Antigua para probarlo.`)
    : (en ? " Come and test drive it at our showroom in Antigua whenever suits you." : " Ven a probarlo a nuestra exposición de Antigua cuando te venga bien.");
  return en
    ? `Congratulations, ${n}! Your ${r.coche.titulo} has been successfully reserved at Volcano Cars. You have ${HORAS_RESERVA} hours of exclusive reservation.${cuando} Your receipt: ${enlace}`
    : `¡Enhorabuena, ${n}! Tu ${r.coche.titulo} ha sido bloqueado con éxito en Volcano Cars. Tienes ${HORAS_RESERVA} horas de reserva exclusiva.${cuando} Tu comprobante: ${enlace}`;
}

// ---------------- avisos al gerente (email + Telegram) ----------------
const escT = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
async function telegram(texto: string, botones: { text: string; url: string }[][] = [], doc?: { buf: ArrayBuffer; mime: string; nombre: string }) {
  const token = env("TELEGRAM_BOT_TOKEN"), chat = env("TELEGRAM_CHAT_ID");
  if (!token || !chat) return;
  const reply_markup = botones.length ? { inline_keyboard: botones } : undefined;
  if (doc) {
    const fd = new FormData();
    fd.set("chat_id", chat); fd.set("caption", texto.slice(0, 1000)); fd.set("parse_mode", "HTML");
    if (reply_markup) fd.set("reply_markup", JSON.stringify(reply_markup));
    const foto = doc.mime.startsWith("image/");
    fd.set(foto ? "photo" : "document", new Blob([doc.buf], { type: doc.mime }), doc.nombre);
    await fetch(`https://api.telegram.org/bot${token}/${foto ? "sendPhoto" : "sendDocument"}`, { method: "POST", body: fd, signal: AbortSignal.timeout(8000) });
    return;
  }
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chat, text: texto, parse_mode: "HTML", disable_web_page_preview: true, reply_markup }),
    signal: AbortSignal.timeout(6000),
  });
}
export async function avisarGerente(tipo: "pendiente" | "pagada" | "liberada" | "vencida" | "conflicto" | "espera", r: Reserva | null, origin: string, extra: { espera?: Espera[]; coche?: { id: string; titulo: string }; persona?: Espera; enlaceCoche?: string } = {}) {
  const panel = `${origin}/admin#coches`;
  const saludo = r ? (r.idioma === "en" ? `Hi ${r.nombre.split(" ")[0]}, this is Volcano Cars about your reservation ${r.codigo}. ` : `Hola ${r.nombre.split(" ")[0]}, te escribimos de Volcano Cars por tu reserva ${r.codigo}. `) : "";
  const waCliente = r ? `https://wa.me/${waNum(r.telefono)}?text=${encodeURIComponent(saludo)}` : "";
  const titulo = r?.coche.titulo || extra.coche?.titulo || "";
  const T: Record<string, [string, string]> = {
    pendiente: [`🔒 Coche RESERVADO (falta comprobar el dinero): ${titulo}`, `Comprueba que han llegado los ${IMPORTE} € y pulsa «Confirmar» en Coches → Reservas. Si no lo confirmas en ${HORAS_VERIFICAR} h, el coche vuelve a estar disponible solo.`],
    pagada: [`✅ Reserva pagada con tarjeta: ${titulo}`, `Stripe ha cobrado los ${IMPORTE} €. El coche ya sale como RESERVADO en la web durante ${HORAS_RESERVA} h.`],
    liberada: [`🔓 ${titulo} vuelve a estar disponible`, extra.espera?.length ? `Hay ${extra.espera.length} persona${extra.espera.length > 1 ? "s" : ""} en la lista de espera: avísalas con un toque (cada botón abre WhatsApp con el mensaje ya escrito).` : "Nadie estaba en la lista de espera."],
    vencida: [`⏰ Han pasado las ${HORAS_RESERVA} h de la reserva: ${titulo}`, "La reserva NO se ha liberado. Decide en Coches → Reservas: alargarla (por ejemplo, si espera la financiación), marcar el coche como vendido o liberarlo y avisar a la lista de espera."],
    conflicto: [`⚠️ Pago con tarjeta recibido tarde: ${titulo}`, `El cliente pagó cuando el coche ya no estaba apartado para él. Devuélvele los ${IMPORTE} € desde Stripe o llámale.`],
    espera: [`🔔 Nueva persona en la lista de espera: ${titulo}`, `${extra.persona?.nombre || ""} · ${extra.persona?.telefono || ""} quiere que le avises si se cancela la reserva.`],
  };
  const [asunto, texto] = T[tipo];
  const filas: [string, string][] = r ? [
    ["Coche", `${r.coche.titulo} ${r.coche.anio} · ${r.coche.precio.toLocaleString("es-ES")} €`],
    ["Cliente", `${r.nombre} · ${r.telefono}`], ["Email", r.email],
    ["Código", r.codigo], ["Pago", `${IMPORTE} € · ${r.metodo === "tarjeta" ? "tarjeta / Google Pay / Apple Pay (Stripe)" : r.metodo}`],
    ["Visita", r.cita ? `${fechaLarga(r.cita.fecha)} a las ${r.cita.hora}` : ""],
    ["Reserva hasta", r.hasta ? fechaHora(r.hasta) : r.hastaVerificar ? `se libera sola el ${fechaHora(r.hastaVerificar)} si no la confirmas` : ""],
  ] : [];
  const lista = (extra.espera || []).slice(0, 8);
  const botonesEspera = lista.map((e) => ({ text: `💬 ${e.nombre.slice(0, 24)}`, url: `https://wa.me/${waNum(e.telefono)}?text=${encodeURIComponent(msgVuelveDisponible(e, titulo, extra.enlaceCoche || origin))}` }));
  const botones = [
    ...(r && tipo !== "liberada" ? [{ txt: "WhatsApp al cliente", url: waCliente, color: "#1F8B4C" }] : []),
    ...botonesEspera.map((b) => ({ txt: b.text.replace("💬 ", "Avisar a "), url: b.url, color: "#1F8B4C" })),
    { txt: "Abrir Reservas en el panel", url: panel },
  ];
  let doc: { buf: ArrayBuffer; mime: string; nombre: string } | undefined;
  if (tipo === "pendiente" && r?.justificante) {
    const buf = (await DOCS().get(r.justificante, { type: "arrayBuffer" }).catch(() => null)) as ArrayBuffer | null;
    if (buf) doc = { buf, mime: r.justificante.endsWith(".pdf") ? "application/pdf" : "image/jpeg", nombre: `justificante-${r.codigo}.${r.justificante.split(".").pop()}` };
  }
  const tg = [`<b>${escT(asunto)}</b>`, escT(texto), ...filas.filter(([, v]) => v).map(([k, v]) => `${escT(k)}: <b>${escT(v)}</b>`)].join("\n");
  const tgBotones = [
    ...(r && tipo !== "liberada" ? [[{ text: "💬 WhatsApp al cliente", url: waCliente }]] : []),
    ...botonesEspera.map((b) => [b]),
    [{ text: "📋 Abrir Reservas", url: panel }],
  ];
  await Promise.allSettled([enviarAviso(asunto, [["Qué pasa", texto], ...filas], botones, r?.email || ""), telegram(tg, tgBotones, doc)]);
}

// ---------------- caducidad (se revisa al cargar la web y cada hora) ----------------
let ultimaRevision = 0;
export async function caducar(origin: string, forzar = false) {
  if (!forzar && Date.now() - ultimaRevision < 60e3) return;
  ultimaRevision = Date.now();
  const { blobs } = await R().list({ prefix: "coche/" });
  for (const b of blobs) {
    const p = (await R().get(b.key, { type: "json" }).catch(() => null)) as { token: string } | null;
    const r = p ? await leer(p.token) : null;
    if (!r) { await R().delete(b.key).catch(() => {}); continue; }
    const t = Date.now();
    if (r.estado === "iniciada" && Date.parse(r.hastaPago) <= t) {
      // la visita que eligió se mantiene: sigue siendo un cliente interesado (está en el CRM)
      await cancelar(r, r.metodo === "tarjeta" ? "no terminó el pago con tarjeta" : "no subió el justificante a tiempo", false);
    } else if (r.estado === "pendiente" && r.hastaVerificar && Date.parse(r.hastaVerificar) <= t) {
      const espera = await cancelar(r, `no se confirmó la transferencia en ${HORAS_VERIFICAR} h`);
      await avisarGerente("liberada", r, origin, { espera, enlaceCoche: `${origin}/comprar?coche=${encodeURIComponent(r.coche.id)}` });
    } else if (r.estado === "confirmada" && r.hasta && Date.parse(r.hasta) <= t && !r.avisoVencida) {
      r.avisoVencida = true; nota(r, `Han pasado las ${HORAS_RESERVA} h: aviso al gerente`); await guardar(r);
      await avisarGerente("vencida", r, origin);
    } else if (!["iniciada", "pendiente", "confirmada"].includes(r.estado)) {
      await R().delete(b.key).catch(() => {});
    }
  }
}

// ---------------- Stripe (tarjeta, Google Pay y Apple Pay) ----------------
// Se usa Stripe Checkout: la página de pago es de Stripe (segura y con Google Pay / Apple Pay en un toque),
// la web nunca ve los datos de la tarjeta. Solo hace falta la variable STRIPE_SECRET_KEY en Netlify.
async function stripe(path: string, init: { method?: string; form?: Record<string, string>; idem?: string } = {}) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method: init.method || (init.form ? "POST" : "GET"),
    headers: { authorization: `Bearer ${env("STRIPE_SECRET_KEY")}`, ...(init.form ? { "content-type": "application/x-www-form-urlencoded" } : {}), ...(init.idem ? { "idempotency-key": init.idem } : {}), "stripe-version": "2024-06-20" },
    body: init.form ? new URLSearchParams(init.form).toString() : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const d = (await r.json().catch(() => ({}))) as any;
  if (!r.ok) throw new Error(d?.error?.message || "Stripe no responde (" + r.status + ")");
  return d;
}
export async function crearPagoTarjeta(r: Reserva, origin: string) {
  const en = r.idioma === "en";
  const d = await stripe("checkout/sessions", {
    idem: "vc-" + r.token + "-" + (r.historial?.length || 0),
    form: {
      mode: "payment",
      success_url: `${origin}/r/${r.token}?sid={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/r/${r.token}?pago=cancelado`,
      "line_items[0][quantity]": "1",
      "line_items[0][price_data][currency]": "eur",
      "line_items[0][price_data][unit_amount]": String(IMPORTE * 100),
      "line_items[0][price_data][product_data][name]": en ? `Reservation · ${r.coche.titulo} (refundable)` : `Reserva · ${r.coche.titulo} (reembolsable)`,
      "line_items[0][price_data][product_data][description]": en ? `Code ${r.codigo}. 100% refundable or deducted from the price when you buy.` : `Código ${r.codigo}. 100 % reembolsable o a cuenta del precio al comprarlo.`,
      client_reference_id: r.codigo,
      "metadata[codigo]": r.codigo,
      "payment_intent_data[description]": `Reserva ${r.codigo} · ${r.coche.titulo}`,
      "payment_intent_data[metadata][codigo]": r.codigo,
      locale: en ? "en" : "es",
      expires_at: String(Math.floor(Date.now() / 1000) + 31 * 60),
      ...(r.email ? { customer_email: r.email } : {}),
    },
  });
  r.stripe = { sesion: d.id, url: d.url };
  await R().setJSON("stripe/" + d.id, { token: r.token });
  return d.url as string;
}
// ¿Está pagada? (se pregunta a Stripe al volver del pago; el webhook es opcional)
export async function comprobarPago(r: Reserva): Promise<{ pagado: boolean; pago: string }> {
  if (!r.stripe?.sesion || !stripeActivo()) return { pagado: false, pago: "" };
  const d = await stripe("checkout/sessions/" + encodeURIComponent(r.stripe.sesion));
  return { pagado: d.payment_status === "paid" && d.client_reference_id === r.codigo, pago: String(d.payment_intent || "") };
}
export async function alPagarConTarjeta(r: Reserva, pago: string, origin: string) {
  if (r.estado === "confirmada" || r.estado === "vendida") return r;
  const actual = await apartadoDe(r.coche.id);
  const coche = (await leerCoches()).find((c) => c.id === r.coche.id);
  const ok = !!coche && coche.estado !== "vendido" && (actual ? actual.token === r.token : coche.estado === "disponible");
  if (!ok) {
    if (r.stripe) r.stripe.pago = pago;
    r.reembolso = "pendiente"; nota(r, "Pago recibido cuando el coche ya no estaba apartado: hay que devolverlo");
    await guardar(r); await avisarGerente("conflicto", r, origin);
    return r;
  }
  await confirmar(r, `Pago de ${IMPORTE} € con tarjeta confirmado por Stripe`, pago);
  await avisarGerente("pagada", r, origin);
  return r;
}
// Firma del webhook de Stripe (cabecera Stripe-Signature: t=…,v1=…)
export function firmaStripeValida(cuerpo: string, cabecera: string) {
  const secreto = env("STRIPE_WEBHOOK_SECRET");
  if (!secreto) return false;
  const partes = Object.fromEntries(cabecera.split(",").map((x) => x.split("=", 2)).filter((x) => x.length === 2).map(([k, v]) => [k.trim(), v]));
  const t = Number(partes.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 600) return false;
  const esperada = createHmac("sha256", secreto).update(`${t}.${cuerpo}`).digest();
  return cabecera.split(",").filter((x) => x.trim().startsWith("v1=")).some((x) => {
    const dada = Buffer.from(x.trim().slice(3), "hex");
    return dada.length === esperada.length && timingSafeEqual(dada, esperada);
  });
}
