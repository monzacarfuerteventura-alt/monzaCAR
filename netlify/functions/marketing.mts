import type { Config as NConfig } from "@netlify/functions";
import { json, isAdmin } from "../lib/shared.mts";
import { mk, leerConfig, limpiarConfig, leerLog, interes, candidatos, leerCoches, aplicarPrecio, type Gasto } from "../lib/marketing.mts";

/*
  MOTOR DE MARKETING (panel, solo gerente)
  - GET  /api/marketing                → config, gastos por campaña, registro de acciones y coches candidatos a micro-rebaja
  - PUT  /api/marketing/config         → límites y piloto automático
  - PUT  /api/marketing/gastos         → lista de gastos por campaña (para CPA y ROI)
  - POST /api/marketing/rebaja         → { id, precio } aplica una micro-rebaja sugerida (a mano)
  - POST /api/marketing/deshacer       → { accion } vuelve al precio anterior
*/
const txt = (v: unknown, n: number) => String(v ?? "").replace(/[\u0000-\u001F<>]/g, "").trim().slice(0, n);
const fecha = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? "")) ? String(v) : "");

export default async (req: Request) => {
  if (!(await isAdmin(req))) { await new Promise((r) => setTimeout(r, 600)); return json({ error: "No autorizado" }, 401); }
  const accion = new URL(req.url).pathname.split("/").filter(Boolean)[2] || "";

  if (req.method === "GET" && !accion) {
    const [cfg, log, gastos, cars, it] = await Promise.all([
      leerConfig(), leerLog(),
      mk().get("gastos", { type: "json" }).catch(() => null) as Promise<Gasto[] | null>,
      leerCoches(), interes(14).catch(() => ({ dias: 14, personas: {}, leads: {} })),
    ]);
    const ultimoPiloto = await mk().get("piloto/ultimo", { type: "json" }).catch(() => null);
    return json({ config: cfg, log: log.slice(0, 60), gastos: gastos || [], candidatos: candidatos(cars, cfg, it), interes: it, ultimoPiloto });
  }

  const body = await req.json().catch(() => ({}));
  if (req.method === "PUT" && accion === "config") {
    const cfg = limpiarConfig(body);
    await mk().setJSON("config", cfg);
    return json(cfg);
  }
  if (req.method === "PUT" && accion === "gastos") {
    const l: Gasto[] = (Array.isArray(body) ? body : []).slice(0, 100).map((g: any) => ({
      id: txt(g.id, 12) || crypto.randomUUID().slice(0, 8), campana: txt(g.campana, 40).toLowerCase().replace(/[^a-z0-9._-]/g, "-"), canal: txt(g.canal, 30),
      gasto: Math.max(0, Math.round((Number(g.gasto) || 0) * 100) / 100), desde: fecha(g.desde), hasta: fecha(g.hasta), nota: txt(g.nota, 120),
    })).filter((g) => g.campana);
    await mk().setJSON("gastos", l);
    return json(l);
  }
  if (req.method === "POST" && accion === "rebaja") {
    const cars = await leerCoches(); const c = cars.find((x) => x.id === String(body.id || ""));
    const nuevo = Math.round(Number(body.precio));
    if (!c) return json({ error: "Ese coche ya no existe." }, 404);
    if (!(nuevo > 0) || nuevo >= c.precio) return json({ error: "El precio nuevo tiene que ser más bajo que el actual." }, 400);
    const cfg = await leerConfig(); const base = c.rebaja?.anterior || c.precio;
    if (nuevo < Math.ceil(base * (1 - cfg.maxTotalPct / 100))) return json({ error: `Pasa de la rebaja máxima (${cfg.maxTotalPct} %). Súbela en los límites si de verdad quieres bajar más.` }, 400);
    try { return json(await aplicarPrecio(c.id, nuevo, { auto: false, motivo: txt(body.motivo, 200) || "Micro-rebaja aprobada en el panel" })); }
    catch (e: any) { return json({ error: e.message }, 409); }
  }
  if (req.method === "POST" && accion === "deshacer") {
    const log = await mk().get("log", { type: "json" }).catch(() => null) as any[] | null;
    const a = (log || []).find((x) => x.id === String(body.accion || ""));
    if (!a || a.tipo !== "rebaja") return json({ error: "No encuentro esa acción." }, 404);
    if (a.deshecha) return json({ error: "Ya estaba deshecha." }, 409);
    const cars = await leerCoches(); const c = cars.find((x) => x.id === a.coche);
    if (!c) return json({ error: "Ese coche ya no existe." }, 404);
    if (c.precio !== a.a) return json({ error: "El precio ha cambiado después; cámbialo a mano en la ficha del coche." }, 409);
    const r = await aplicarPrecio(c.id, a.de, { auto: false, motivo: "Deshacer rebaja", tipo: "deshacer" });
    const l2 = ((await mk().get("log", { type: "json" })) as any[]).map((x) => (x.id === a.id ? { ...x, deshecha: new Date().toISOString() } : x));
    await mk().setJSON("log", l2);
    return json(r);
  }
  return json({ error: "Método no permitido" }, 405);
};

export const config: NConfig = {
  path: ["/api/marketing", "/api/marketing/:accion"],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
