import type { Config } from "@netlify/functions";
import { store, json, isAdmin, mismoOrigen, purgar, type Car } from "../lib/shared.mts";
import { estore, leerEntregas, limpiarEntrega, type Entrega } from "../lib/entregas.mts";

/*
  ENTREGAS Y OPINIONES (panel, solo gerente)
  - GET    /api/entregas            → todas las entregas (foto, opinión, autorización, publicada o no)
  - PUT    /api/entregas/:cocheId   → guarda la entrega de un coche VENDIDO
  - DELETE /api/entregas/:cocheId   → la borra (y deja de salir en /coches-vendidos)
  Lo público está en /coches-vendidos (netlify/functions/vendidos.mts).
*/
const ID = /^[A-Za-z0-9-]{3,60}$/;

export default async (req: Request) => {
  if (!(await isAdmin(req))) { await new Promise((r) => setTimeout(r, 500)); return json({ error: "No autorizado" }, 401); }
  const id = new URL(req.url).pathname.split("/").filter(Boolean)[2] || "";
  const s = estore();

  if (req.method === "GET" && !id) return json(await leerEntregas());
  if (!ID.test(id)) return json({ error: "Coche no válido" }, 400);

  if (req.method === "PUT") {
    if (!mismoOrigen(req)) return json({ error: "Origen no permitido" }, 403);
    const coches = ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null) || [];
    const c = coches.find((x) => x.id === id);
    if (!c) return json({ error: "Ese coche ya no existe." }, 404);
    if (c.estado !== "vendido") return json({ error: "Primero márcalo como «Vendido»." }, 409);
    const prev = (await s.get("e/" + id, { type: "json" }).catch(() => null)) as Entrega | null;
    const r = limpiarEntrega(id, (await req.json().catch(() => ({}))) as any, prev);
    if (r.error) return json({ error: r.error }, 400);
    await s.setJSON("e/" + id, r.e);
    await purgar(["vendidos"]);
    return json(r.e);
  }

  if (req.method === "DELETE") {
    await s.delete("e/" + id);
    await purgar(["vendidos"]);
    return json({ ok: true });
  }
  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/entregas", "/api/entregas/:id"],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
