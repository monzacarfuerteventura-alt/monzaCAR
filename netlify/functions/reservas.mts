import type { Config, Context } from "@netlify/functions";
import { createHash } from "node:crypto";
import { store, json, isAdmin, mismoOrigen, waNum } from "../lib/shared.mts";
import { notificarExternos } from "../lib/notificar.mts";
import { limpiar, huecoValido, bloqueos, ocuparHueco, avisar, str } from "../lib/solicitud.mts";
import {
  R, DOCS, IMPORTE, MIN_PAGO_TARJETA, MIN_PAGO_TRANSFER, HORAS_RESERVA, type Reserva, type Metodo, type Espera,
  type Entrega, MUNICIPIOS_ENTREGA, FRANJAS_ENTREGA, etiquetaEntrega,
  leer, guardar, nota, apartar, apartadoDe, activa, leerCoches, configPublica, leerConfig, ibanValido, stripeActivo,
  nuevoToken, nuevoCodigo, vistaPublica, pasarAPendiente, confirmar, cancelar, vender, leerEspera, guardarEspera,
  avisarGerente, caducar, crearPagoTarjeta, comprobarPago, alPagarConTarjeta, firmaStripeValida, msgVuelveDisponible, msgConfirmacion,
} from "../lib/reservas.mts";

/*
  RESERVA ONLINE DE 50 € · LISTA DE ESPERA
  Web (público):
    GET  /api/reservas/config              → formas de pago activas (tarjeta, transferencia, Bizum)
    POST /api/reservas                     → empezar una reserva (datos + visita) → enlace de pago o datos de transferencia
    GET  /api/reservas/:token              → estado de la reserva (enlace privado del cliente, /r/:token)
    POST /api/reservas/:token/justificante → subir el justificante de la transferencia o del Bizum → coche RESERVADO
    POST /api/reservas/:token/metodo       → cambiar la forma de pago antes de pagar
    POST /api/reservas/espera              → apuntarse a la lista de espera de un coche reservado
    POST /api/stripe-webhook               → Stripe avisa de un pago (opcional: STRIPE_WEBHOOK_SECRET)
  Panel (con sesión):
    GET  /api/reservas                     → reservas, listas de espera y datos de pago
    PUT  /api/reservas/config              → guardar IBAN, titular, Bizum y activar/desactivar
    PATCH /api/reservas/:token             → confirmar, alargar, liberar, vendida, reembolso, nota
    GET  /api/reservas/:token/justificante → ver el justificante
    PATCH /api/reservas/espera/:cocheId    → marcar como avisado o quitar de la lista
*/

const METODOS: Metodo[] = ["tarjeta", "transferencia", "bizum"];
const DOC_TIPOS: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "application/pdf": "pdf" };
const MAX_DOC = 5 * 1024 * 1024;
const esEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
const digitos = (v: string) => v.replace(/[^\d]/g, "");
const titulo = (c: { marca: string; modelo: string }) => `${c.marca} ${c.modelo}`;
const enlaceCoche = (origin: string, id: string) => `${origin}/comprar?coche=${encodeURIComponent(id)}`;

async function limite(ip: string, ua: string, que: string, max: number) {
  const key = "rl/" + createHash("sha256").update(ip + "|" + ua + "|" + que).digest("hex").slice(0, 24);
  const hace1h = Date.now() - 3600e3;
  const l = (((await R().get(key, { type: "json" }).catch(() => null)) as number[] | null) || []).filter((t) => t > hace1h);
  if (l.length >= max) return false;
  l.push(Date.now());
  await R().setJSON(key, l);
  return true;
}
const enSegundoPlano = (context: Context, p: Promise<unknown>) => {
  const w = (context as any).waitUntil;
  if (typeof w === "function") w.call(context, p.catch(() => {})); else return p.catch(() => {});
};

export default async (req: Request, context: Context) => {
  const url = new URL(req.url);
  const partes = url.pathname.split("/").filter(Boolean); // api, reservas, a, b
  const origin = url.origin;

  // ---------------- Stripe avisa de un pago ----------------
  if (partes[1] === "stripe-webhook") {
    if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
    const cuerpo = await req.text();
    if (!firmaStripeValida(cuerpo, req.headers.get("stripe-signature") || "")) return json({ error: "Firma no válida" }, 400);
    const ev = JSON.parse(cuerpo || "{}");
    const ses = ev?.data?.object || {};
    const p = (await R().get("stripe/" + String(ses.id || ""), { type: "json" }).catch(() => null)) as { token: string } | null;
    const r = p ? await leer(p.token) : null;
    if (!r) return json({ ok: true, ignorado: true });
    if ((ev.type === "checkout.session.completed" || ev.type === "checkout.session.async_payment_succeeded") && ses.payment_status === "paid") {
      await alPagarConTarjeta(r, String(ses.payment_intent || ""), origin);
    } else if (ev.type === "checkout.session.expired" && r.estado === "iniciada" && r.metodo === "tarjeta") {
      await cancelar(r, "no terminó el pago con tarjeta", false);
    }
    return json({ ok: true });
  }

  const a = partes[2] || "", b = partes[3] || "";

  // ---------------- formas de pago (público) ----------------
  if (a === "config" && req.method === "GET") return json(await configPublica());

  // ---------------- panel: datos de pago ----------------
  if (a === "config" && req.method === "PUT") {
    if (!(await isAdmin(req))) return json({ error: "No autorizado" }, 401);
    const i = (await req.json().catch(() => ({}))) as any;
    const iban = str(i.iban, 42).replace(/\s+/g, "").toUpperCase();
    if (iban && !ibanValido(iban)) return json({ error: "Ese IBAN no es correcto. Revísalo (ES + 22 números)." }, 400);
    const bizum = digitos(str(i.bizum, 20));
    if (bizum && !/^[67]\d{8}$/.test(bizum)) return json({ error: "El número de Bizum tiene que ser un móvil español de 9 cifras." }, 400);
    const cfg = { activa: i.activa !== false, iban, titular: str(i.titular, 70), banco: str(i.banco, 40), bizum };
    if (iban && !cfg.titular) return json({ error: "Pon el titular de la cuenta (tal como sale en el banco)." }, 400);
    await R().setJSON("config", cfg);
    return json({ config: cfg, publica: await configPublica() });
  }

  // ---------------- lista de espera (público) ----------------
  if (a === "espera" && !b && req.method === "POST") {
    if (!mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
    const i = (await req.json().catch(() => null)) as any;
    if (!i || typeof i !== "object") return json({ error: "Datos no válidos." }, 400);
    if (str(i.web, 50)) return json({ ok: true });
    const en = i.idioma === "en";
    const nombre = str(i.nombre, 80), telefono = str(i.telefono, 30);
    if (nombre.length < 2) return json({ error: en ? "Please write your name." : "Escribe tu nombre." }, 400);
    if (digitos(telefono).length < 9) return json({ error: en ? "Please check your phone number." : "Revisa el número de WhatsApp." }, 400);
    if (i.acepta !== true) return json({ error: en ? "Please tick the privacy box." : "Marca la casilla de privacidad." }, 400);
    const coche = (await leerCoches()).find((c) => c.id === str(i.cocheId, 64));
    if (!coche || coche.estado === "vendido") return json({ error: en ? "This car is no longer for sale." : "Este coche ya no está a la venta." }, 404);
    if (coche.estado === "disponible" && !(await apartadoDe(coche.id))) return json({ disponible: true, error: en ? "Good news: it's available again! You can reserve it now." : "¡Buenas noticias: vuelve a estar disponible! Ya puedes reservarlo." }, 409);
    if (!(await limite(context.ip || "", req.headers.get("user-agent") || "", "espera", 6))) return json({ error: en ? "Too many requests. Please message us on WhatsApp." : "Demasiados intentos seguidos. Escríbenos por WhatsApp." }, 429);
    const lista = await leerEspera(coche.id);
    const tel = waNum(telefono);
    const ya = lista.find((e) => waNum(e.telefono) === tel);
    const persona: Espera = ya || { id: crypto.randomUUID().slice(0, 8), nombre, telefono, idioma: en ? "en" : "es", t: new Date().toISOString() };
    if (!ya) { lista.push(persona); await guardarEspera(coche.id, lista); }
    const puesto = lista.findIndex((e) => e.id === persona.id) + 1;
    if (!ya) {
      // también al CRM, como cliente interesado en ese coche
      const { s: sol } = limpiar({ tipo: "coche", nombre, telefono, acepta: true, idioma: en ? "en" : "es", origen: i.origen || {},
        mensaje: `🔔 Lista de espera: quiere que le avisemos si se cancela la reserva del ${titulo(coche)} (puesto ${puesto}).`,
        coche: { id: coche.id, titulo: `${titulo(coche)} ${coche.version || ""} ${coche.anio}`.replace(/\s+/g, " ").trim(), precio: coche.precio } });
      if (sol) await store("solicitudes").setJSON("s/" + sol.id, sol);
      await enSegundoPlano(context, avisarGerente("espera", null, origin, { coche: { id: coche.id, titulo: titulo(coche) }, persona }));
    }
    return json({ ok: true, puesto, yaEstabas: !!ya });
  }

  // ---------------- panel: marcar avisado / quitar de la lista de espera ----------------
  if (a === "espera" && b && req.method === "PATCH") {
    if (!(await isAdmin(req))) return json({ error: "No autorizado" }, 401);
    const i = (await req.json().catch(() => ({}))) as any;
    const lista = await leerEspera(b);
    const e = lista.find((x) => x.id === str(i.id, 20));
    if (!e) return json({ error: "Esa persona ya no está en la lista." }, 404);
    if (i.accion === "borrar") lista.splice(lista.indexOf(e), 1);
    else e.avisado = new Date().toISOString();
    await guardarEspera(b, lista);
    return json({ ok: true, espera: lista });
  }

  // ---------------- empezar una reserva (público) ----------------
  if (!a && req.method === "POST") {
    if (!mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
    if (Number(req.headers.get("content-length") || 0) > 20000) return json({ error: "Solicitud demasiado grande." }, 413);
    const i = (await req.json().catch(() => null)) as any;
    if (!i || typeof i !== "object") return json({ error: "Datos no válidos." }, 400);
    if (str(i.web, 50)) return json({ ok: true });
    const en = i.idioma === "en";
    const T = (es: string, eng: string) => (en ? eng : es);
    const cfg = await configPublica();
    if (!cfg.activa) return json({ error: T("La reserva online no está disponible ahora mismo. Escríbenos por WhatsApp y te lo apartamos.", "Online reservations aren't available right now. Message us on WhatsApp and we'll hold it for you.") }, 409);
    const metodo = METODOS.includes(i.metodo) ? (i.metodo as Metodo) : null;
    if (!metodo || (metodo === "tarjeta" && !cfg.tarjeta) || (metodo === "transferencia" && !cfg.transferencia) || (metodo === "bizum" && !cfg.bizum)) return json({ error: T("Elige una forma de pago.", "Choose a payment method.") }, 400);
    const nombre = str(i.nombre, 80), telefono = str(i.telefono, 30), email = str(i.email, 120);
    if (nombre.length < 2) return json({ error: T("Escribe tu nombre.", "Please write your name.") }, 400);
    if (digitos(telefono).length < 9) return json({ error: T("Revisa el número de WhatsApp.", "Please check your phone number.") }, 400);
    if (email && !esEmail(email)) return json({ error: T("Revisa el email.", "Please check your email.") }, 400);
    if (i.acepta !== true) return json({ error: T("Tienes que aceptar las condiciones de la reserva y la política de privacidad.", "Please accept the reservation terms and privacy policy.") }, 400);
    const coche = (await leerCoches()).find((c) => c.id === str(i.cocheId, 64));
    if (!coche || coche.estado === "vendido") return json({ error: T("Este coche ya no está a la venta.", "This car is no longer for sale.") }, 404);
    if (coche.estado !== "disponible") return json({ reservado: true, error: T("Este coche acaba de ser reservado por otra persona.", "This car has just been reserved by someone else.") }, 409);
    // «🚚 Te lo llevamos a domicilio»: municipio, dirección, día laborable (mañana a +30 días) y tramo obligatorios
    let entrega: Entrega | null = null;
    if (i.entrega && typeof i.entrega === "object") {
      const e = i.entrega, fecha = str(e.fecha, 10), hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "Atlantic/Canary" }).format(new Date());
      const dias = /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? Math.round((Date.parse(fecha + "T12:00:00Z") - Date.parse(hoy + "T12:00:00Z")) / 864e5) : -1;
      const semana = dias >= 0 ? new Date(fecha + "T12:00:00Z").getUTCDay() : -1;
      entrega = { municipio: str(e.municipio, 40), direccion: str(e.direccion, 200).replace(/\s+/g, " "), fecha, franja: str(e.franja, 10) };
      if (!MUNICIPIOS_ENTREGA.includes(entrega.municipio)) return json({ error: T("Elige el municipio de la entrega.", "Choose the delivery area.") }, 400);
      if (entrega.direccion.length < 8) return json({ error: T("Escribe la dirección exacta de la entrega.", "Please write the full delivery address.") }, 400);
      if (dias < 1 || dias > 30 || semana === 0 || semana === 6) return json({ error: T("Elige un día de entrega de lunes a viernes.", "Choose a delivery day, Monday to Friday.") }, 400);
      if (!FRANJAS_ENTREGA.includes(entrega.franja)) return json({ error: T("Elige mañana o tarde para la entrega.", "Choose morning or afternoon for the delivery.") }, 400);
    }
    const ci = !entrega && i.cita && typeof i.cita === "object" ? { fecha: str(i.cita.fecha, 10), hora: str(i.cita.hora, 5) } : null;
    if (ci && !huecoValido(ci.fecha, ci.hora, await bloqueos())) return json({ ocupada: true, error: T("Esa hora ya no está disponible. Elige otra.", "That time is no longer available. Please choose another.") }, 409);
    if (!(await limite(context.ip || "", req.headers.get("user-agent") || "", "reserva", 5))) return json({ error: T("Demasiados intentos seguidos. Escríbenos por WhatsApp y te lo apartamos.", "Too many attempts. Message us on WhatsApp and we'll hold it for you.") }, 429);

    const t = new Date().toISOString();
    const r: Reserva = {
      token: nuevoToken(), codigo: nuevoCodigo(), estado: "iniciada", metodo, importe: IMPORTE,
      coche: { id: coche.id, titulo: titulo(coche), version: coche.version || "", anio: coche.anio, precio: coche.precio, foto: coche.fotos[0] || coche.video?.poster || "" },
      nombre, telefono, email, idioma: en ? "en" : "es", cita: ci, entrega,
      creado: t, hastaPago: new Date(Date.now() + (metodo === "tarjeta" ? MIN_PAGO_TARJETA : MIN_PAGO_TRANSFER) * 60e3).toISOString(),
      historial: [{ t, txt: `Reserva empezada en la web (${metodo})` }],
    };
    if (!(await apartar(r))) return json({ enProceso: true, error: T("Otra persona está terminando de reservar este coche ahora mismo. Si no lo completa, vuelve a quedar libre en unos minutos: apúntate y te avisamos.", "Someone else is finishing a reservation for this car right now. If they don't complete it, it'll be free again in a few minutes: join the list and we'll let you know.") }, 409);

    // cliente en el CRM (con su visita, si la ha elegido)
    const { s: sol } = limpiar({
      tipo: "coche", nombre, telefono, email, acepta: true, idioma: r.idioma, origen: i.origen || {}, cita: ci,
      mensaje: `${entrega ? "🚚 " + etiquetaEntrega(entrega) + " " : ""}🔒 Reserva online de ${IMPORTE} € (${r.codigo}) · ${metodo === "tarjeta" ? "tarjeta / Google Pay" : metodo}. ${entrega ? "Quiere que se lo llevemos a domicilio." : ci ? "Viene a verlo y probarlo en la cita." : "Sin cita todavía."}`,
      coche: { id: coche.id, titulo: `${titulo(coche)} ${coche.version || ""} ${coche.anio}`.replace(/\s+/g, " ").trim(), precio: coche.precio },
    });
    if (sol) {
      sol.reserva = r.codigo;
      if (sol.cita && !(await ocuparHueco(sol.cita.agenda, sol.cita.fecha, sol.cita.hora, sol.id))) {
        await R().delete("coche/" + coche.id);
        return json({ ocupada: true, error: T("Esa hora se acaba de ocupar. Elige otra.", "That time has just been taken. Please choose another.") }, 409);
      }
      await store("solicitudes").setJSON("s/" + sol.id, sol);
      r.solicitud = sol.id;
      // la visita llega como cualquier cita (email, Telegram, Google Sheets)
      if (sol.cita) await enSegundoPlano(context, Promise.allSettled([avisar(sol, origin), notificarExternos(sol as any, origin)]));
    }
    let pagoUrl = "";
    if (metodo === "tarjeta") {
      try { pagoUrl = await crearPagoTarjeta(r, origin); }
      catch (e: any) {
        await cancelar(r, "no se pudo abrir el pago con tarjeta", false);
        return json({ error: T("El pago con tarjeta no está disponible ahora mismo. Prueba con transferencia o Bizum, o escríbenos por WhatsApp.", "Card payment isn't available right now. Try bank transfer or Bizum, or message us on WhatsApp."), tarjetaCaida: true }, 502);
      }
    }
    await guardar(r);
    return json({ ok: true, token: r.token, codigo: r.codigo, pagoUrl, reserva: await vistaPublica(r) }, 201);
  }

  // ---------------- panel: lista de reservas ----------------
  if (!a && req.method === "GET") {
    if (!(await isAdmin(req))) return json({ error: "No autorizado" }, 401);
    await caducar(origin, true).catch(() => {});
    const s = R();
    const { blobs } = await s.list({ prefix: "r/" });
    const limiteT = Date.now() - 180 * 864e5;
    const todas = ((await Promise.all(blobs.map((x) => s.get(x.key, { type: "json" }).catch(() => null)))) as (Reserva | null)[])
      .filter((r): r is Reserva => !!r && (activa(r) || Date.parse(r.creado) > limiteT))
      .sort((x, y) => y.creado.localeCompare(x.creado));
    const { blobs: esp } = await s.list({ prefix: "espera/" });
    const espera: Record<string, Espera[]> = {};
    for (const x of esp) { const l = (await s.get(x.key, { type: "json" }).catch(() => null)) as Espera[] | null; if (l?.length) espera[x.key.slice(7)] = l; }
    const coches = (await leerCoches()).map((c) => ({ id: c.id, titulo: titulo(c), anio: c.anio, estado: c.estado, precio: c.precio }));
    return json({ reservas: todas, espera, coches, config: await leerConfig(), publica: await configPublica(), stripe: stripeActivo(), horas: HORAS_RESERVA });
  }

  // ---------------- a partir de aquí: una reserva concreta ----------------
  const r = await leer(a);
  if (!r) return json({ error: "Reserva no encontrada" }, 404);

  // justificante: el cliente lo sube · el panel lo ve
  if (b === "justificante") {
    if (req.method === "GET") {
      if (!(await isAdmin(req))) return json({ error: "No autorizado" }, 401);
      if (!r.justificante) return new Response("No hay justificante", { status: 404 });
      const data = await DOCS().get(r.justificante, { type: "arrayBuffer" });
      if (!data) return new Response("No encontrado", { status: 404 });
      const ext = r.justificante.split(".").pop()!;
      return new Response(data, { headers: { "content-type": Object.entries(DOC_TIPOS).find(([, e]) => e === ext)?.[0] || "application/octet-stream", "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-disposition": `inline; filename="justificante-${r.codigo}.${ext}"` } });
    }
    if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
    if (!mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
    const en = r.idioma === "en";
    const T = (es: string, eng: string) => (en ? eng : es);
    if (r.metodo === "tarjeta") return json({ error: T("Esta reserva se paga con tarjeta.", "This reservation is paid by card.") }, 400);
    if (!["iniciada", "pendiente"].includes(r.estado)) return json({ error: T("Esta reserva ya no admite justificantes.", "This reservation no longer accepts receipts."), reserva: await vistaPublica(r) }, 409);
    const tipo = (req.headers.get("content-type") || "").split(";")[0];
    const ext = DOC_TIPOS[tipo];
    if (!ext) return json({ error: T("Sube una foto o captura (JPG, PNG) o un PDF.", "Upload a photo/screenshot (JPG, PNG) or a PDF.") }, 415);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > MAX_DOC) return json({ error: T("El archivo está vacío o pesa más de 5 MB.", "The file is empty or larger than 5 MB.") }, 413);
    const cab = new Uint8Array(buf, 0, Math.min(8, buf.byteLength));
    const firma = ext === "pdf" ? String.fromCharCode(...cab.slice(0, 5)) === "%PDF-" : ext === "jpg" ? cab[0] === 0xff && cab[1] === 0xd8 : ext === "png" ? cab[0] === 0x89 && cab[1] === 0x50 : String.fromCharCode(...cab.slice(0, 4)) === "RIFF";
    if (!firma) return json({ error: T("Ese archivo no parece una imagen o un PDF válido.", "That file doesn't look like a valid image or PDF.") }, 415);
    if (!(await limite(context.ip || "", req.headers.get("user-agent") || "", "justificante", 8))) return json({ error: T("Demasiados intentos. Mándanos el justificante por WhatsApp.", "Too many attempts. Send us the receipt on WhatsApp.") }, 429);
    // ¿sigue apartado para él? (si se le pasó la hora y nadie lo ha cogido, se le vuelve a apartar)
    const actual = await apartadoDe(r.coche.id);
    const coche = (await leerCoches()).find((c) => c.id === r.coche.id);
    if (!coche || coche.estado === "vendido" || (actual && actual.token !== r.token) || (!actual && coche.estado !== "disponible")) {
      nota(r, "Subió el justificante cuando el coche ya no estaba apartado para él: hay que devolverle el dinero");
      r.reembolso = "pendiente"; await guardar(r);
      await enSegundoPlano(context, avisarGerente("conflicto", r, origin));
      return json({ conflicto: true, error: T("Lo sentimos: mientras tanto otra persona ha reservado este coche. Te devolvemos los 50 € y te llamamos para ofrecerte alternativas.", "Sorry: someone else reserved this car in the meantime. We'll refund your €50 and call you with alternatives.") }, 409);
    }
    if (!actual) await R().setJSON("coche/" + r.coche.id, { token: r.token });
    const doc = `${r.token}.${ext}`;
    await DOCS().set(doc, buf);
    if (r.estado === "pendiente") { r.justificante = doc; nota(r, "El cliente ha cambiado el justificante"); await guardar(r); return json({ ok: true, reserva: await vistaPublica(r) }); }
    await pasarAPendiente(r, doc);
    await enSegundoPlano(context, avisarGerente("pendiente", r, origin));
    return json({ ok: true, reserva: await vistaPublica(r), mensaje: msgConfirmacion(r, `${origin}/r/${r.token}`) });
  }

  // cambiar la forma de pago antes de pagar
  if (b === "metodo" && req.method === "POST") {
    if (!mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
    const i = (await req.json().catch(() => ({}))) as any;
    const cfg = await configPublica();
    const m = METODOS.includes(i.metodo) ? (i.metodo as Metodo) : null;
    if (!m || (m === "tarjeta" && !cfg.tarjeta) || (m === "transferencia" && !cfg.transferencia) || (m === "bizum" && !cfg.bizum)) return json({ error: "Forma de pago no disponible." }, 400);
    if (r.estado !== "iniciada" || !activa(r)) return json({ error: r.idioma === "en" ? "This reservation has expired. Please start again." : "Esta reserva ha caducado. Empieza de nuevo, por favor.", reserva: await vistaPublica(r) }, 409);
    r.metodo = m; nota(r, "Cambia la forma de pago a " + m);
    r.hastaPago = new Date(Date.now() + (m === "tarjeta" ? MIN_PAGO_TARJETA : MIN_PAGO_TRANSFER) * 60e3).toISOString();
    let pagoUrl = "";
    if (m === "tarjeta") {
      try { pagoUrl = await crearPagoTarjeta(r, origin); }
      catch { return json({ error: r.idioma === "en" ? "Card payment isn't available right now." : "El pago con tarjeta no está disponible ahora mismo." }, 502); }
    }
    await guardar(r);
    return json({ ok: true, pagoUrl, reserva: await vistaPublica(r) });
  }

  // estado de la reserva (cliente) · al volver de Stripe se comprueba el pago
  if (!b && req.method === "GET") {
    if (r.metodo === "tarjeta" && r.stripe?.sesion && (r.estado === "iniciada" || (url.searchParams.get("sid") === r.stripe.sesion && r.estado === "cancelada" && !r.stripe.pago))) {
      try { const p = await comprobarPago(r); if (p.pagado) await alPagarConTarjeta(r, p.pago, origin); } catch { /* Stripe no responde: se vuelve a mirar en la próxima carga */ }
    }
    await caducar(origin).catch(() => {});
    const fresca = (await leer(a)) || r;
    return json({ reserva: await vistaPublica(fresca), mensaje: ["pendiente", "confirmada"].includes(fresca.estado) ? msgConfirmacion(fresca, `${origin}/r/${fresca.token}`) : "" });
  }

  // ---------------- panel: acciones sobre una reserva ----------------
  if (!b && req.method === "PATCH") {
    if (!(await isAdmin(req))) return json({ error: "No autorizado" }, 401);
    const i = (await req.json().catch(() => ({}))) as any;
    let espera: Espera[] = [];
    switch (i.accion) {
      case "confirmar": {
        if (!["iniciada", "pendiente", "confirmada"].includes(r.estado) && !(r.estado === "cancelada" && !(await apartadoDe(r.coche.id)))) return json({ error: "Esta reserva ya está cerrada." }, 409);
        const act = await apartadoDe(r.coche.id);
        if (act && act.token !== r.token) return json({ error: `El coche está apartado para otra reserva (${act.codigo}). Libérala primero.` }, 409);
        await confirmar(r, "Pago comprobado por el gerente");
        break;
      }
      case "alargar": {
        if (r.estado !== "confirmada") return json({ error: "Solo se puede alargar una reserva confirmada." }, 409);
        const horas = Math.min(24 * 14, Math.max(12, Number(i.horas) || HORAS_RESERVA));
        r.hasta = new Date(Math.max(Date.now(), Date.parse(r.hasta || "") || 0) + horas * 3600e3).toISOString(); r.avisoVencida = false;
        nota(r, `Reserva alargada ${horas} h`); await guardar(r);
        break;
      }
      case "liberar": {
        if (!["iniciada", "pendiente", "confirmada"].includes(r.estado)) return json({ error: "Esta reserva ya está cerrada." }, 409);
        espera = await cancelar(r, str(i.motivo, 120) || "liberada por el gerente");
        break;
      }
      case "vendida": {
        if (!["pendiente", "confirmada"].includes(r.estado)) return json({ error: "Primero confirma la reserva." }, 409);
        await vender(r);
        break;
      }
      case "reembolso": { r.reembolso = i.hecho ? "hecho" : "pendiente"; nota(r, i.hecho ? "Reserva devuelta al cliente" : "Devolución pendiente"); await guardar(r); break; }
      case "nota": { const t = str(i.txt, 500); if (t) { nota(r, "Nota: " + t); await guardar(r); } break; }
      default: return json({ error: "Acción no válida" }, 400);
    }
    const fresca = (await leer(a)) || r;
    return json({
      reserva: fresca,
      espera: espera.map((e) => ({ ...e, mensaje: msgVuelveDisponible(e, fresca.coche.titulo, enlaceCoche(origin, fresca.coche.id)), wa: `https://wa.me/${waNum(e.telefono)}?text=${encodeURIComponent(msgVuelveDisponible(e, fresca.coche.titulo, enlaceCoche(origin, fresca.coche.id)))}` })),
    });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/reservas", "/api/reservas/:a", "/api/reservas/:a/:b", "/api/stripe-webhook"],
  rateLimit: { windowLimit: 90, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
