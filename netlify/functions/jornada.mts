import type { Config, Context } from "@netlify/functions";
import { json, mismoOrigen } from "../lib/shared.mts";
import { quien, leerEquipo, hoyCanarias } from "../lib/taller.mts";
import { leerLibro } from "../lib/libro.mts";
import { registrar, pais, listaConfianza, olvidarConfianza, quitar2FAEquipo, totpEquipo, exige2FAEquipo, fijarExige2FAEquipo, leerRegistro } from "../lib/seguridad.mts";
import { jstore, fichar, deshacer, corregir, resumenYo, leerEstado, efectivo, olvidada, leerDia, calcDia, type Dia, type Accion } from "../lib/jornada.mts";

/*
  REGISTRO DE JORNADA
  GET  /api/jornada/yo                     → mi estado, mi día y (con ?mes=AAAA-MM) mi mes
  POST /api/jornada/fichar {accion?, qr?}  → fichar (sin acción: la siguiente lógica; con qr: desde el cartel/NFC)
  POST /api/jornada/deshacer               → anula mi último fichaje si han pasado menos de 2 min
  GET  /api/jornada/plantilla              → estado en vivo de todo el equipo (gerente)
  GET  /api/jornada/registro?mes&uid       → días con horas ordinarias, extra, pausas e incidencias (gerente; cada uno el suyo)
  GET  /api/jornada/dia?uid&fecha          → fichajes de un día, con correcciones (gerente)
  POST /api/jornada/corregir               → añadir o anular un fichaje, con motivo (gerente)
  GET  /api/jornada/libro                  → libro encadenado: ¿alguien ha tocado los datos? (gerente)
  GET/POST /api/jornada/qr                 → código del cartel QR/NFC del taller; POST lo cambia (gerente)
  GET/POST /api/jornada/acceso             → 2FA del equipo, dispositivos de confianza y accesos raros (gerente)
*/
const QR_RE = /^[A-Za-z0-9]{10,40}$/;
const nuevoCodigo = () => { const abc = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; return [...crypto.getRandomValues(new Uint8Array(20))].map((x) => abc[x % abc.length]).join(""); };
async function codigoQR(crear = false) {
  let c = (await jstore().get("config/qr", { type: "json" }).catch(() => null)) as { codigo: string; desde: string } | null;
  if (!c || crear) { c = { codigo: nuevoCodigo(), desde: new Date().toISOString() }; await jstore().setJSON("config/qr", c); }
  return c;
}

export default async (req: Request, context: Context) => {
  const url = new URL(req.url), p = url.pathname.split("/").filter(Boolean), r = p[2] || "";
  if (req.method !== "GET" && !mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
  const q = await quien(req);
  if (!q) return json({ error: "No autorizado" }, 401);
  const body = req.method === "GET" ? {} : ((await req.json().catch(() => ({}))) as any);
  const ctx = { ip: context.ip || "", ua: req.headers.get("user-agent") || "", via: "boton" };
  const equipo = await leerEquipo();
  const yo = equipo.find((x) => x.id === q.uid) || { id: q.uid, jornada: 8 };
  const soloGerente = () => (q.admin ? null : json({ error: "Solo el gerente." }, 403));

  if (r === "yo" && req.method === "GET") {
    const res: any = await resumenYo(yo);
    const mes = /^\d{4}-\d{2}$/.test(url.searchParams.get("mes") || "") ? url.searchParams.get("mes")! : "";
    if (mes) res.mes = await registroMes(mes, [yo as any]);
    return json(res);
  }

  if (r === "fichar" && req.method === "POST") {
    if (q.uid === "gerente") return json({ error: "El gerente con contraseña no ficha. Entra con tu usuario y PIN si tienes que fichar." }, 400);
    if (body.qr !== undefined) {
      const c = await codigoQR();
      if (!QR_RE.test(String(body.qr)) || String(body.qr) !== c.codigo) {
        await registrar("qr-invalido", ctx.ip, ctx.ua, pais(req, context), "Fichaje con un QR que no vale (" + q.nombre + ")");
        return json({ error: "Este código QR ya no vale. Pide al gerente el cartel nuevo." }, 400);
      }
      ctx.via = "qr";
    } else if (body.via === "nfc") ctx.via = "nfc";
    const acc = ["entrada", "pausa", "reanudar", "salida"].includes(body.accion) ? (body.accion as Accion) : "";
    if (!acc && ctx.via === "boton") return json({ error: "Elige qué quieres fichar." }, 400);
    const res: any = await fichar(q, acc, ctx);
    if (res.error) return json({ ...res, jornada: await resumenYo(yo) }, res.conflicto ? 409 : 400);
    return json({ ...res, jornada: await resumenYo(yo) });
  }

  if (r === "deshacer" && req.method === "POST") {
    const res: any = await deshacer(q, ctx);
    if (res.error) return json(res, 409);
    return json({ ...res, jornada: await resumenYo(yo) });
  }

  // ----- de aquí en adelante, lo del gerente (salvo el registro propio) -----
  if (r === "registro" && req.method === "GET") {
    const mes = /^\d{4}-\d{2}$/.test(url.searchParams.get("mes") || "") ? url.searchParams.get("mes")! : hoyCanarias().slice(0, 7);
    const uid = url.searchParams.get("uid") || "";
    if (!q.admin && uid !== q.uid) return json({ error: "Solo puedes ver tu propio registro." }, 403);
    const gente = equipo.filter((x) => (uid ? x.id === uid : true) && (x.activo || true));
    return json({ mes, personas: await registroMes(mes, gente) });
  }

  const no = soloGerente(); if (no) return no;

  if (r === "plantilla" && req.method === "GET") {
    const hoy = hoyCanarias();
    const filas = await Promise.all(equipo.filter((x) => x.activo).map(async (x) => {
      const bruto = await leerEstado(x.id), e = efectivo(bruto);
      const d = await leerDia(x.id, e.estado !== "fuera" ? e.fecha : hoy);
      const c = calcDia(d, x.jornada);
      const auto = (await jstore().get("auto/" + x.id).catch(() => null)) as string | null;
      return { uid: x.id, nombre: x.nombre, rol: x.rol, jornadaH: x.jornada, estado: e.estado, desde: e.desde, olvido: olvidada(bruto) ? bruto.fecha : "", hoy: c, ultimo: d.eventos.filter((v) => v.tipo !== "anulacion").pop() || null, ordenAuto: !!auto };
    }));
    return json({ ahora: new Date().toISOString(), personas: filas });
  }

  if (r === "dia" && req.method === "GET") {
    const uid = url.searchParams.get("uid") || "", fecha = url.searchParams.get("fecha") || "";
    const pers = equipo.find((x) => x.id === uid);
    if (!pers || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return json({ error: "Día no válido." }, 400);
    const d = await leerDia(uid, fecha);
    return json({ dia: d, calc: calcDia(d, pers.jornada) });
  }

  if (r === "corregir" && req.method === "POST") {
    const res: any = await corregir(q, body);
    return json(res, res.error ? 400 : 200);
  }

  if (r === "libro" && req.method === "GET") return json(await leerLibro("jornada", 300));

  if (r === "qr") {
    const c = await codigoQR(req.method === "POST");
    if (req.method === "POST") await registrar("qr-nuevo", ctx.ip, ctx.ua, pais(req, context), "Nuevo código QR de fichaje (el anterior deja de valer)");
    return json({ ...c, url: `${url.origin}/admin#fichar=${c.codigo}` });
  }

  if (r === "acceso") {
    if (req.method === "GET") {
      const [disp, reg, exige, conTotp] = await Promise.all([
        listaConfianza(), leerRegistro(200), exige2FAEquipo(),
        Promise.all(equipo.map(async (x) => [x.id, !!(await totpEquipo(x.id))] as const)),
      ]);
      const raros = reg.filter((e) => ["login-fallo", "2fa-fallo", "bloqueo", "inusual", "recuperacion", "qr-invalido", "trampa"].includes(e.tipo)).slice(0, 60);
      return json({ exige2fa: exige, totp: Object.fromEntries(conTotp), dispositivos: disp, raros });
    }
    if (body.accion === "exigir") { await fijarExige2FAEquipo(!!body.si); await registrar("2fa-equipo", ctx.ip, ctx.ua, pais(req, context), body.si ? "2FA obligatoria para el equipo" : "2FA del equipo desactivada"); return json({ ok: true }); }
    if (body.accion === "olvidar") { const n = await olvidarConfianza({ id: body.id ? String(body.id) : undefined, uid: body.uid ? String(body.uid) : undefined, todos: !!body.todos }); return json({ ok: true, n }); }
    if (body.accion === "reset2fa") {
      const pers = equipo.find((x) => x.id === body.uid); if (!pers) return json({ error: "No existe." }, 404);
      await quitar2FAEquipo(pers.id); await olvidarConfianza({ uid: pers.id });
      await registrar("2fa-reset", ctx.ip, ctx.ua, pais(req, context), "2FA restablecida: " + pers.nombre);
      return json({ ok: true });
    }
    return json({ error: "Acción no válida" }, 400);
  }
  return json({ error: "No encontrado" }, 404);
};

// Un mes de varias personas: un día por fila con sus horas.
async function registroMes(mes: string, gente: { id: string; nombre?: string; rol?: string; jornada: number }[]) {
  const { blobs } = await jstore().list({ prefix: `dia/${mes}/` });
  const porUid: Record<string, string[]> = {};
  for (const b of blobs) { const [, , uid] = b.key.split("/"); (porUid[uid] ||= []).push(b.key); }
  return Promise.all(gente.map(async (g) => {
    const dias = ((await Promise.all((porUid[g.id] || []).map((k) => jstore().get(k, { type: "json" }).catch(() => null)))) as (Dia | null)[]).filter(Boolean) as Dia[];
    const calc = dias.map((d) => ({ ...calcDia(d, g.jornada), eventos: d.eventos })).sort((a, b) => a.fecha.localeCompare(b.fecha));
    const sum = (k: "trabajoMin" | "pausaMin" | "ordinariasMin" | "extraMin") => calc.reduce((a, x) => a + x[k], 0);
    return { uid: g.id, nombre: g.nombre || "", rol: g.rol || "", jornadaH: g.jornada, dias: calc, total: { trabajoMin: sum("trabajoMin"), pausaMin: sum("pausaMin"), ordinariasMin: sum("ordinariasMin"), extraMin: sum("extraMin"), diasTrabajados: calc.filter((x) => x.trabajoMin > 0).length, incidencias: calc.reduce((a, x) => a + x.incidencias.length, 0) } };
  }));
}

export const config: Config = {
  path: ["/api/jornada/:r", "/api/jornada/:r/:id"],
  rateLimit: { windowLimit: 90, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
