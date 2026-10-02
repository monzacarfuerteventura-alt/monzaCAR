import type { Config, Context } from "@netlify/functions";
import { createHash, randomBytes } from "node:crypto";
import { store, json, mismoOrigen, canarias, sumarDias } from "../lib/shared.mts";
import { permiso, esRespuesta } from "../lib/acceso.mts";

/*
  ENLACES CORTOS Y QR MEDIBLES (actualización 19) · solo el gerente los crea
  - GET    /q/:cod              → PÚBLICO. Cuenta el escaneo y redirige (302) a la web con sus UTM puestos.
  - GET    /api/enlaces         → lista de enlaces con sus escaneos (hoy, 7 y 30 días, total y personas distintas)
  - POST   /api/enlaces         → crea un enlace  { destino, canal "flyer|qr", camp, term?, nota? }
  - PUT    /api/enlaces/:cod    → cambia el destino, la nota o lo activa/desactiva (el QR impreso NO cambia)
  - DELETE /api/enlaces/:cod    → lo desactiva (nunca se borra: un QR ya impreso no debe dar nunca error)

  POR QUÉ UN ENLACE CORTO: el QR impreso lleva solo https://volcanocars.com/q/XXXXXX (muy corto = QR grande y fácil de leer
  aunque el flyer sea pequeño). Los UTM los pone el servidor al redirigir, así que puedes cambiar a dónde lleva sin reimprimir.
  El escaneo se cuenta aquí, en tu servidor: no depende de que el cliente acepte cookies (Google Analytics solo cuenta a quien acepta).
  Los bots de vista previa (WhatsApp, Facebook, Google…) se redirigen pero NO se cuentan.
*/
const ALFABETO = "abcdefghjkmnpqrstuvwxyz23456789"; // sin i, l, o, 0, 1: no se confunden al teclearlos
const COD = /^[a-z0-9]{4,12}$/;
const DESTINO = /^\/[A-Za-z0-9\-_/.]{0,150}$/; // solo rutas de esta web, sin dominio ni parámetros (evita redirecciones a otras webs)
const SLUG = /^[a-z0-9._-]{1,60}$/;
const CANALES = ["flyer", "tarjeta", "cartel", "vehiculo", "pegatina", "instagram", "facebook", "tiktok", "whatsapp", "google", "wallapop", "otro"];
const MEDIOS = ["qr", "social", "mensaje", "cpc", "portal"];
const BOTS = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|curl|wget|headless|python|go-http|java\/|monitor|uptime/i;

type Enlace = { cod: string; destino: string; src: string; med: string; camp: string; term: string; nota: string; activo: boolean; creado: string; cambiado?: string };
type Conteo = { total: number; unicos: number; ultimo: string; dias: Record<string, { n: number; u: number }> };

const norm = (t: unknown) => String(t ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
const ts = () => new Date().toISOString();

function limpiar(input: any, prev?: Enlace): { e?: Enlace; error?: string } {
  const destino = input.destino !== undefined ? String(input.destino).trim() : prev?.destino || "";
  if (!DESTINO.test(destino) || destino.includes("//") || destino.includes("..")) return { error: "El destino tiene que ser una página de esta web (por ejemplo /taller-mecanico-fuerteventura/)." };
  let src = prev?.src || "", med = prev?.med || "";
  if (input.canal !== undefined) {
    const [a, b] = String(input.canal).split("|");
    src = norm(a); med = norm(b);
    if (!CANALES.includes(src) || !MEDIOS.includes(med)) return { error: "Canal no válido." };
  }
  const camp = input.camp !== undefined ? norm(input.camp) : prev?.camp || "";
  const term = input.term !== undefined ? norm(input.term) : prev?.term || "";
  if (!SLUG.test(camp)) return { error: "Ponle un nombre a la campaña (por ejemplo flyer-octubre)." };
  if (term && !SLUG.test(term)) return { error: "La ubicación solo admite letras, números y guiones." };
  if (!src || !med) return { error: "Elige dónde lo vas a poner." };
  const nota = input.nota !== undefined ? String(input.nota).slice(0, 200) : prev?.nota || "";
  const activo = input.activo !== undefined ? !!input.activo : prev ? prev.activo : true;
  return { e: { cod: prev?.cod || "", destino, src, med, camp, term, nota, activo, creado: prev?.creado || ts(), ...(prev ? { cambiado: ts() } : {}) } };
}

function urlFinal(e: Enlace) {
  const q = new URLSearchParams({ utm_source: e.src, utm_medium: e.med, utm_campaign: e.camp });
  if (e.term) q.set("utm_term", e.term); // la web ya guarda utm_term en cada solicitud: aquí va la ubicación / lote
  return e.destino + "?" + q.toString();
}

function resumen(c: Conteo | null, hoy: string) {
  const d = c?.dias || {};
  const suma = (desde: string, campo: "n" | "u") => Object.entries(d).filter(([f]) => f >= desde).reduce((a, [, x]) => a + (x[campo] || 0), 0);
  return { total: c?.total || 0, unicos: c?.unicos || 0, hoy: d[hoy]?.n || 0, d7: suma(sumarDias(hoy, -6), "n"), d30: suma(sumarDias(hoy, -29), "n"), u30: suma(sumarDias(hoy, -29), "u"), ultimo: c?.ultimo || "" };
}

async function contar(cod: string, req: Request, ctx: Context) {
  const s = store("enlaces"), hoy = canarias().fecha;
  const c = ((await s.get("c/" + cod, { type: "json" }).catch(() => null)) as Conteo | null) || { total: 0, unicos: 0, ultimo: "", dias: {} };
  // persona distinta ≈ misma conexión + mismo móvil el mismo día (solo se guarda un resumen, nunca la IP)
  const h = createHash("sha256").update([(ctx as any).ip || "", req.headers.get("user-agent") || "", hoy, cod].join("|")).digest("hex").slice(0, 16);
  const hk = "h/" + cod + "/" + hoy;
  const vistos = ((await s.get(hk, { type: "json" }).catch(() => null)) as string[] | null) || [];
  const nuevo = !vistos.includes(h);
  if (nuevo && vistos.length < 500) await s.setJSON(hk, [...vistos, h]);
  const dia = c.dias[hoy] || { n: 0, u: 0 };
  dia.n++; if (nuevo) { dia.u++; c.unicos++; }
  c.dias[hoy] = dia; c.total++; c.ultimo = ts();
  const corte = sumarDias(hoy, -400); for (const f of Object.keys(c.dias)) if (f < corte) delete c.dias[f]; // 13 meses de detalle
  await s.setJSON("c/" + cod, c);
}

export default async (req: Request, ctx: Context) => {
  const url = new URL(req.url), partes = url.pathname.split("/").filter(Boolean);

  // ---------- PÚBLICO: /q/:cod ----------
  if (partes[0] === "q") {
    const cod = (partes[1] || "").toLowerCase();
    const aviso = { "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" };
    if (req.method !== "GET" && req.method !== "HEAD") return new Response("Método no permitido", { status: 405 });
    let e: Enlace | null = null;
    if (COD.test(cod)) e = (await store("enlaces").get("e/" + cod, { type: "json" }).catch(() => null)) as Enlace | null;
    // Un QR ya impreso NUNCA da error: si no existe o está desactivado, lleva a la portada (sin contar)
    if (!e || !e.activo) return new Response(null, { status: 302, headers: { ...aviso, location: "/?utm_source=qr&utm_medium=qr&utm_campaign=enlace-no-valido" } });
    const bot = req.method === "HEAD" || BOTS.test(req.headers.get("user-agent") || "") || !req.headers.get("user-agent");
    if (!bot) { try { await contar(cod, req, ctx); } catch { /* contar nunca debe impedir que el cliente llegue a la web */ } }
    return new Response(null, { status: 302, headers: { ...aviso, location: urlFinal(e) } });
  }

  // ---------- PANEL: /api/enlaces (solo gerente) ----------
  { const _q = await permiso(req, "gerente"); if (esRespuesta(_q)) return _q; }
  const s = store("enlaces"), cod = partes[2] || "", hoy = canarias().fecha;

  if (req.method === "GET" && !cod) {
    const { blobs } = await s.list({ prefix: "e/" });
    const lista: any[] = [];
    for (const b of blobs) {
      const e = (await s.get(b.key, { type: "json" }).catch(() => null)) as Enlace | null; if (!e) continue;
      const c = (await s.get("c/" + e.cod, { type: "json" }).catch(() => null)) as Conteo | null;
      lista.push({ ...e, escaneos: resumen(c, hoy), url: "https://volcanocars.com/q/" + e.cod });
    }
    lista.sort((a, b) => b.creado.localeCompare(a.creado));
    return json({ enlaces: lista, hoy });
  }

  if (!mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);

  if (req.method === "POST" && !cod) {
    const r = limpiar((await req.json().catch(() => ({}))) as any);
    if (r.error || !r.e) return json({ error: r.error || "Datos no válidos" }, 400);
    const { blobs } = await s.list({ prefix: "e/" });
    if (blobs.length >= 500) return json({ error: "Ya tienes 500 enlaces. Desactiva los que no uses." }, 409);
    let nuevo = "";
    for (let i = 0; i < 8 && !nuevo; i++) {
      const b = randomBytes(6); const c = Array.from(b, (x) => ALFABETO[x % ALFABETO.length]).join("");
      if (!(await s.get("e/" + c).catch(() => null))) nuevo = c;
    }
    if (!nuevo) return json({ error: "No se pudo generar el código. Inténtalo otra vez." }, 500);
    const e = { ...r.e, cod: nuevo };
    await s.setJSON("e/" + nuevo, e);
    return json({ ...e, escaneos: resumen(null, hoy), url: "https://volcanocars.com/q/" + nuevo }, 201);
  }

  if (!COD.test(cod)) return json({ error: "Enlace no válido" }, 400);
  const prev = (await s.get("e/" + cod, { type: "json" }).catch(() => null)) as Enlace | null;
  if (!prev) return json({ error: "Ese enlace no existe." }, 404);

  if (req.method === "PUT") {
    const r = limpiar((await req.json().catch(() => ({}))) as any, prev);
    if (r.error || !r.e) return json({ error: r.error || "Datos no válidos" }, 400);
    // En un QR ya impreso solo se cambia a dónde lleva, su nota o si está activo: canal y campaña se quedan (si no, se mezclarían los datos)
    const e = { ...prev, destino: r.e.destino, nota: r.e.nota, activo: r.e.activo, cambiado: ts() };
    await s.setJSON("e/" + cod, e);
    return json(e);
  }
  if (req.method === "DELETE") { await s.setJSON("e/" + cod, { ...prev, activo: false, cambiado: ts() }); return json({ ok: true }); }
  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/q/:cod", "/api/enlaces", "/api/enlaces/:cod"],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
