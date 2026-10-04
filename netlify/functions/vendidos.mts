import type { Config } from "@netlify/functions";
import { store, SEMILLA, type Car } from "../lib/shared.mts";
import { EMPRESA, escH, foto, imgAttrs, wa, slugDe, cabecera, pie } from "../lib/paginas.mts";
import { leerEntregas, type Entrega } from "../lib/entregas.mts";

/*
  COCHES VENDIDOS Y ENTREGADOS  ·  /coches-vendidos
  Prueba social real y local: cada coche que ha encontrado dueño, cuánto tardó en venderse y, cuando el
  cliente lo autoriza, la foto de la entrega y su opinión tal como la dijo.
  - Las opiniones NO se marcan con datos estructurados de «Review»: Google no permite reseñas de un negocio
    sobre sí mismo en su propia web (serían «autopromoción»). Las reseñas públicas están en la ficha de Google.
  - Nada se publica sin «autoriza» + «publicar» en el panel (netlify/functions/entregas.mts).
*/
const CACHE = { "cache-control": "public, max-age=0, must-revalidate", "netlify-cdn-cache-control": "public, s-maxage=300, stale-while-revalidate=3600", "netlify-cache-tag": "coches,vendidos,paginas" };
const SEG = { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "DENY" };
const RESENAS = "https://g.page/r/Caeh6Wr6CwtNECE/review";
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesAnio = (iso: string) => { const d = new Date(iso.length === 10 ? iso + "T12:00:00Z" : iso); return isNaN(+d) ? "" : `${MESES[d.getUTCMonth()]} de ${d.getUTCFullYear()}`; };
const ld = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
const dias = (c: Car) => (c.vendidoEn ? Math.max(1, Math.round((Date.parse(c.vendidoEn) - Date.parse(c.creado)) / 864e5)) : 0);
const estrellas = (n: number) => `<span class="vd-est" role="img" aria-label="${n} de 5">${"★".repeat(n)}<span>${"★".repeat(5 - n)}</span></span>`;

const CSS = `<style>
.vd-hero h1{margin-bottom:10px}
.vd-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:26px 0 0;padding:0;list-style:none}
.vd-stats li{background:var(--surface);border:1px solid var(--line);border-radius:18px;padding:16px 18px}
.vd-stats b{display:block;font-family:var(--display,inherit);font-size:30px;line-height:1.05;color:var(--ink)}
.vd-stats span{font-size:13.5px;color:var(--muted);line-height:1.35;display:block;margin-top:4px}
.vd-ops{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px;margin-top:22px}
.vd-op{background:var(--surface);border:1px solid var(--line);border-radius:22px;overflow:hidden;display:flex;flex-direction:column}
.vd-op figure{margin:0;aspect-ratio:4/3;background:var(--surface-2);position:relative}
.vd-op figure img{width:100%;height:100%;object-fit:cover;display:block}
.vd-op figcaption{position:absolute;left:12px;bottom:12px;background:rgba(18,18,16,.78);color:#F2EFEA;font-size:12.5px;font-weight:700;padding:6px 11px;border-radius:999px;backdrop-filter:blur(6px)}
.vd-op .in{padding:18px 20px 20px;display:flex;flex-direction:column;gap:10px;flex:1}
.vd-est{color:#F2A33A;letter-spacing:2px;font-size:17px}.vd-est span{color:var(--line)}
.vd-op blockquote{margin:0;font-size:16px;line-height:1.55;color:var(--ink)}
.vd-op blockquote::before{content:"«"}.vd-op blockquote::after{content:"»"}
.vd-quien{margin-top:auto;font-size:14px;color:var(--muted)}.vd-quien b{color:var(--ink)}
.vd-cars{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;margin-top:22px}
.vd-car{background:var(--surface);border:1px solid var(--line);border-radius:18px;overflow:hidden}
.vd-car .ph{aspect-ratio:4/3;background:var(--surface-2);position:relative}
.vd-car .ph img{width:100%;height:100%;object-fit:cover;display:block;filter:saturate(.85)}
.vd-car .sello{position:absolute;top:10px;left:10px;background:var(--rosso);color:#fff;font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:5px 10px;border-radius:999px}
.vd-car .tx{padding:12px 14px 14px}.vd-car b{display:block;font-size:15.5px}.vd-car small{display:block;color:var(--muted);font-size:13px;margin-top:3px}
.vd-nota{margin-top:26px;font-size:13.5px;color:var(--muted);max-width:760px}
.vd-cta{margin-top:10px;background:var(--surface);border:1px solid var(--line);border-radius:24px;padding:26px;display:flex;flex-wrap:wrap;gap:18px;align-items:center;justify-content:space-between}
.vd-cta h2{margin:0 0 4px}.vd-cta p{margin:0;color:var(--muted)}
.vd-vacio{background:var(--surface);border:1px dashed var(--line);border-radius:20px;padding:26px;margin-top:22px}
@media (max-width:760px){.vd-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.vd-ops{grid-template-columns:1fr}.vd-stats b{font-size:25px}}
</style>`;

export default async (req: Request) => {
  const url = new URL(req.url);
  const origin = url.origin;
  if (url.pathname !== "/coches-vendidos") return Response.redirect(origin + "/coches-vendidos", 301);

  const lista = ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null) || SEMILLA;
  const hace2 = Date.now() - 730 * 864e5, hace1 = Date.now() - 365 * 864e5;
  const vendidos = lista.filter((c) => c.estado === "vendido" && c.vendidoEn && Date.parse(c.vendidoEn) > hace2)
    .sort((a, b) => String(b.vendidoEn).localeCompare(String(a.vendidoEn)));
  const todas = await leerEntregas().catch(() => ({} as Record<string, Entrega>));
  const pub = (id: string) => { const e = todas[id]; return e && e.publicar && e.autoriza ? e : null; };
  const conEntrega = vendidos.map((c) => ({ c, e: pub(c.id) })).filter((x) => x.e) as { c: Car; e: Entrega }[];

  const ultimo12 = vendidos.filter((c) => Date.parse(c.vendidoEn!) > hace1);
  const ds = ultimo12.map(dias).filter(Boolean).sort((a, b) => a - b);
  const mediana = ds.length ? ds[Math.floor(ds.length / 2)] : 0;
  const pueblos = new Set(conEntrega.map((x) => x.e.pueblo.trim().toLowerCase()).filter(Boolean));
  const notas = conEntrega.map((x) => x.e.estrellas).filter((n) => n > 0);
  const media = notas.length >= 3 ? Math.round((notas.reduce((a, b) => a + b, 0) / notas.length) * 10) / 10 : 0;

  const canonical = origin + "/coches-vendidos";
  const titulo = "Coches vendidos y entregados en Fuerteventura | Volcano Cars";
  const desc = `Los coches que ya tienen dueño: ${ultimo12.length ? `${ultimo12.length} vendidos en el último año, ` : ""}fotos de las entregas y opiniones de clientes de Fuerteventura, publicadas con su permiso.`;
  const og = conEntrega[0]?.e.foto ? foto(conEntrega[0].e.foto) : vendidos[0]?.fotos[0] ? foto(vendidos[0].fotos[0]) : "/og-volcano-cars.jpg";
  const head = `<meta property="og:type" content="website"><meta property="og:title" content="${escH(titulo)}"><meta property="og:description" content="${escH(desc)}"><meta property="og:url" content="${escH(canonical)}"><meta property="og:image" content="${escH(origin + og)}">
${ld({ "@context": "https://schema.org", "@graph": [
    { "@type": "CollectionPage", "@id": canonical, url: canonical, name: titulo, description: desc, inLanguage: "es", about: { "@id": origin + "/#negocio" } },
    { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Inicio", item: origin + "/" }, { "@type": "ListItem", position: 2, name: "Coches de segunda mano", item: origin + "/coches-segunda-mano-fuerteventura/" }, { "@type": "ListItem", position: 3, name: "Coches vendidos", item: canonical }] },
  ] })}
${CSS}`;

  const stats = `<ul class="vd-stats">
    <li><b class="num">${ultimo12.length}</b><span>coche${ultimo12.length === 1 ? "" : "s"} vendido${ultimo12.length === 1 ? "" : "s"} en los últimos 12 meses</span></li>
    <li><b class="num">${mediana ? mediana + (mediana === 1 ? " día" : " días") : "—"}</b><span>es lo que suele tardar un coche en venderse (mediana)</span></li>
    <li><b class="num">${pueblos.size || "—"}</b><span>pueblo${pueblos.size === 1 ? "" : "s"} de la isla con entregas publicadas</span></li>
    <li><b class="num">${media ? String(media).replace(".", ",") + " ★" : "12 meses"}</b><span>${media ? `media de ${notas.length} opiniones recogidas en la entrega` : "de garantía legal en cada coche vendido"}</span></li>
  </ul>`;

  const opiniones = conEntrega.length ? `<div class="vd-ops">${conEntrega.map(({ c, e }) => `
    <article class="vd-op">
      ${e.foto ? `<figure><img ${imgAttrs(e.foto, 720, "(max-width:760px) 100vw, 400px")} alt="Entrega del ${escH(c.marca + " " + c.modelo)}${e.nombre ? " a " + escH(e.nombre) : ""}${e.pueblo ? " en " + escH(e.pueblo) : ""}" loading="lazy" decoding="async"><figcaption>Entregado${e.pueblo ? " en " + escH(e.pueblo) : ""}</figcaption></figure>` : ""}
      <div class="in">
        ${e.estrellas ? estrellas(e.estrellas) : ""}
        ${e.opinion ? `<blockquote>${escH(e.opinion)}</blockquote>` : ""}
        <p class="vd-quien">${e.nombre ? `<b>${escH(e.nombre)}</b> · ` : ""}${escH(c.marca + " " + c.modelo + " " + c.anio)}<br>${escH(mesAnio(e.fecha))}</p>
      </div>
    </article>`).join("")}</div>` : `<div class="vd-vacio"><b>Aquí saldrán las fotos de las entregas y lo que nos dicen los clientes.</b><p style="margin:6px 0 0">Solo publicamos las que el cliente nos autoriza. Mientras tanto, puedes leer todas las opiniones públicas en <a href="${EMPRESA.mapaCid}" target="_blank" rel="noopener">nuestra ficha de Google</a>.</p></div>`;

  const cars = vendidos.length ? `<div class="vd-cars">${vendidos.slice(0, 48).map((c) => {
    const d = dias(c), e = pub(c.id);
    return `<div class="vd-car"><div class="ph">${c.fotos[0] ? `<img ${imgAttrs(c.fotos[0], 440, "(max-width:520px) 50vw, 260px")} alt="${escH(c.marca + " " + c.modelo + " " + c.anio)}, vendido" loading="lazy" decoding="async">` : ""}<span class="sello">Vendido</span></div>
      <div class="tx"><b>${escH(c.marca + " " + c.modelo)}</b><small>${c.anio} · ${escH(mesAnio(c.vendidoEn!))}</small><small>${d ? `Vendido en ${d} día${d === 1 ? "" : "s"}` : ""}${e && e.pueblo ? `${d ? " · " : ""}entregado en ${escH(e.pueblo)}` : ""}</small></div></div>`;
  }).join("")}</div>` : `<div class="vd-vacio"><b>Todavía no hay ventas publicadas.</b></div>`;

  const html = cabecera(origin, titulo, desc, canonical, head, "index, follow, max-image-preview:large") + `
<div class="wrap">
  <nav class="migas" aria-label="Estás en"><ol><li><a href="/">Inicio</a></li><li><a href="/coches-segunda-mano-fuerteventura/">Coches de segunda mano</a></li><li aria-current="page">Coches vendidos</li></ol></nav>
  <header class="pg-hero vd-hero">
    <span class="eyebrow">Ya tienen dueño</span>
    <h1>Coches vendidos y <span class="r">entregados</span></h1>
    <p>Cada coche de esta página pasó por nuestro taller de Costa de Antigua antes de venderse y salió con 12 meses de garantía legal. Cuando el cliente nos da permiso, publicamos la foto de la entrega y lo que nos dijo ese día, tal cual.</p>
    ${stats}
  </header>

  <section class="sec" aria-labelledby="h-op">
    <h2 id="h-op">Entregas y opiniones</h2>
    ${opiniones}
  </section>

  <section class="sec" aria-labelledby="h-v">
    <h2 id="h-v">Últimos coches vendidos</h2>
    ${cars}
    <p class="vd-nota">Publicamos el nombre, la foto y la opinión de un cliente solo con su autorización expresa, y puede pedirnos que la quitemos cuando quiera escribiendo a ${escH(EMPRESA.email)}. Las opiniones son las que nos dieron el día de la entrega, sin retocar. Las reseñas públicas y verificadas están en <a href="${EMPRESA.mapaCid}" target="_blank" rel="noopener">nuestra ficha de Google</a>.</p>
  </section>

  <section class="sec">
    <div class="vd-cta">
      <div><h2>¿Quieres ser el siguiente?</h2><p>Coches revisados en taller propio, con entrega gratis en toda Fuerteventura.</p></div>
      <div class="ctas" style="margin:0"><a class="btn b-rosso" href="/comprar">Ver coches disponibles</a><a class="btn b-wa" href="${escH(wa("Hola Volcano Cars, he visto los coches vendidos y busco uno parecido: "))}" target="_blank" rel="noopener">WhatsApp</a><a class="btn b-ghost" href="${RESENAS}" target="_blank" rel="noopener">¿Ya nos compraste? Déjanos tu reseña</a></div>
    </div>
  </section>
</div>
` + pie("Hola Volcano Cars, he visto los coches vendidos y busco uno parecido: ");
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", ...SEG, ...CACHE } });
};

export const config: Config = {
  path: ["/coches-vendidos", "/coches-vendidos/"],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
