import type { Config as NConfig } from "@netlify/functions";
import { json, mismoOrigen, canarias } from "../lib/shared.mts";
import { permiso, esRespuesta } from "../lib/acceso.mts";
import { pw, estadoWeb, limpiarReglas, leerReglas, resumenEventos, TIPOS_EV, ACC_EV } from "../lib/piloto.mts";

/*
  PILOTO DE CONVERSIÓN EN LA WEB
  - GET  /api/piloto-web            → (público) qué reglas están activas y qué coches las disparan. Lo lee /piloto-web.js
  - POST /api/piloto-web/evento     → (público) la ventana avisa de que se mostró / se pulsó / se cerró (sin datos personales)
  - GET  /api/piloto-web/admin      → (gerente) reglas, estado completo y resultados de la semana
  - PUT  /api/piloto-web/config     → (gerente) guarda las reglas desde el panel (Marketing en vivo → Piloto)
*/
export default async (req: Request) => {
  const accion = new URL(req.url).pathname.split("/").filter(Boolean)[2] || "";

  // ---- público: estado para la web ----
  if (req.method === "GET" && !accion) {
    const e = await estadoWeb();
    const r = e.reglas;
    const cuerpo = {
      reglas: { prueba: r.prueba, lectura: r.lectura, salida: r.salida, A: { on: r.A.on, accion: r.A.accion, dias: r.A.dias }, B: { on: r.B.on }, maxSesion: r.maxSesion },
      hora: { punta: e.hora.punta && r.B.on },
      coches: e.coches,
    };
    return new Response(JSON.stringify(cuerpo), { headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
      "netlify-cdn-cache-control": "public, s-maxage=60, stale-while-revalidate=120",
    } });
  }

  // ---- público: eventos de las ventanas ----
  if (req.method === "POST" && accion === "evento") {
    if (!mismoOrigen(req)) return new Response(null, { status: 403 });
    let b: any = {};
    try { b = JSON.parse((await req.text()).slice(0, 400) || "{}"); } catch { /* sendBeacon vacío */ }
    const tipo = String(b.tipo || ""), acc = String(b.acc || "");
    if (!TIPOS_EV.includes(tipo) || !ACC_EV.includes(acc)) return new Response(null, { status: 204 });
    const { fecha, minutos } = canarias();
    const hm = String(Math.floor(minutos / 60)).padStart(2, "0") + String(minutos % 60).padStart(2, "0");
    await pw().set(`ev/${fecha}/${hm}~${tipo}~${acc}~${crypto.randomUUID().slice(0, 8)}`, "1").catch(() => {});
    return new Response(null, { status: 204 });
  }

  // ---- panel (solo gerente) ----
  { const q = await permiso(req, "gerente"); if (esRespuesta(q)) return q; }

  if (req.method === "GET" && accion === "admin") {
    const [estado, resumen] = await Promise.all([estadoWeb(), resumenEventos(7).catch(() => ({}))]);
    return json({ reglas: await leerReglas(), estado, resumen });
  }
  if (req.method === "PUT" && accion === "config") {
    const reglas = limpiarReglas(await req.json().catch(() => ({})));
    await pw().setJSON("reglas", reglas);
    const estado = await estadoWeb(true);
    return json({ reglas, estado });
  }
  return json({ error: "Método no permitido" }, 405);
};

export const config: NConfig = {
  path: ["/api/piloto-web", "/api/piloto-web/:accion"],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
