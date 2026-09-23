import type { Config } from "@netlify/functions";
import { store, json, isAdmin, cleanCar, esFotoSubida, borrarVideo, SEMILLA, type Car } from "../lib/shared.mts";

const KEY = "coches";

async function load(): Promise<Car[]> {
  const s = store("monzacar");
  const list = ((await s.get(KEY, { type: "json" })) as Car[] | null) || [];
  // Primera vez: mete en el panel los coches que ya estaban publicados en la web.
  // Solo una vez: si luego los borras desde el panel, no vuelven a aparecer.
  if (!(await s.get("semilla-v1"))) {
    for (const c of SEMILLA) if (!list.some((x) => x.id === c.id)) list.push({ ...c, equipamiento: [...c.equipamiento], fotos: [...c.fotos] });
    await s.setJSON(KEY, list);
    await s.set("semilla-v1", new Date().toISOString());
  }
  return list;
}
// El vídeo tiene que haber terminado de subirse antes de publicarlo.
async function videoListo(car: Car): Promise<string | null> {
  if (!car.video) return null;
  const meta = (await store("monzacar-videos").get(car.video.key + "/meta", { type: "json" }).catch(() => null)) as { done?: boolean } | null;
  return meta?.done ? null : "El vídeo 360° no ha terminado de subirse. Espera un momento o vuelve a subirlo.";
}
async function save(list: Car[]) {
  await store("monzacar").setJSON(KEY, list);
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const id = url.pathname.split("/").filter(Boolean)[2]; // /api/coches/:id

  if (req.method === "GET") {
    const all = url.searchParams.get("todos") === "1";
    if (all && !(await isAdmin(req))) return json({ error: "No autorizado" }, 401);
    const list = await load();
    // Público: coches a la venta + vendidos en los últimos 60 días (para «Vendidos recientemente»).
    const limite = Date.now() - 60 * 864e5;
    const out = all ? list : list.filter((c) => c.estado !== "vendido" || (c.vendidoEn && Date.parse(c.vendidoEn) > limite));
    out.sort((a, b) => (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || b.creado.localeCompare(a.creado));
    return new Response(JSON.stringify(out), {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": all ? "no-store" : "public, max-age=0, must-revalidate",
      },
    });
  }

  if (!(await isAdmin(req))) {
    await new Promise((r) => setTimeout(r, 600));
    return json({ error: "No autorizado" }, 401);
  }

  let body: any = {};
  if (req.method === "POST" || req.method === "PUT") {
    try { body = await req.json(); } catch { return json({ error: "Datos no válidos." }, 400); }
  }
  const list = await load();

  if (req.method === "POST") {
    const { car, error } = cleanCar(body);
    if (error) return json({ error }, 400);
    const ve = await videoListo(car!);
    if (ve) return json({ error: ve }, 400);
    list.push(car!);
    await save(list);
    return json(car, 201);
  }

  const i = list.findIndex((c) => c.id === id);
  if (i < 0) return json({ error: "Ese coche ya no existe." }, 404);

  if (req.method === "PUT") {
    // Los botones Disponible/Reservado/Vendido de la lista mandan el coche entero, vídeo incluido.
    const { car, error } = cleanCar(body, list[i]);
    if (error) return json({ error }, 400);
    const antes = list[i].video;
    if (car!.video && car!.video.key !== antes?.key) {
      const ve = await videoListo(car!);
      if (ve) return json({ error: ve }, 400);
    }
    const removed = list[i].fotos.filter((f) => !car!.fotos.includes(f));
    list[i] = car!;
    await save(list);
    const fotos = store("monzacar-fotos");
    await Promise.all(removed.filter(esFotoSubida).map((f) => fotos.delete(f)));
    // Vídeo quitado o cambiado por otro: se borra el antiguo (y su portada si ya no se usa).
    if (antes && antes.key !== car!.video?.key) await borrarVideo({ key: antes.key, poster: antes.poster !== car!.video?.poster ? antes.poster : "" });
    else if (antes?.poster && antes.poster !== car!.video?.poster && esFotoSubida(antes.poster)) await fotos.delete(antes.poster).catch(() => {});
    return json(car);
  }

  if (req.method === "DELETE") {
    const [gone] = list.splice(i, 1);
    await save(list);
    const fotos = store("monzacar-fotos");
    await Promise.all(gone.fotos.filter(esFotoSubida).map((f) => fotos.delete(f)));
    await borrarVideo(gone.video);
    return json({ ok: true });
  }

  return json({ error: "Método no permitido" }, 405);
};

export const config: Config = {
  path: ["/api/coches", "/api/coches/:id"],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
