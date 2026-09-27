import type { Config } from "@netlify/functions";
import { store, SEMILLA, type Car } from "../lib/shared.mts";
import { escH, eur, kmTxt, imgAttrs, slugDe } from "../lib/paginas.mts";
import { PLANTILLA } from "../lib/plantilla-coches-fv.mts";

/*
  /coches-segunda-mano-fuerteventura/ CON EL STOCK DENTRO (para Google, sin JavaScript)
  El texto de la página lo genera tools/seo.py (public/coches-segunda-mano-fuerteventura/index.html y
  netlify/lib/plantilla-coches-fv.mts). Esta función pinta los coches en venta donde pone <!--STOCK-->
  y añade la lista de coches en datos estructurados (ItemList). Se actualiza sola al cambiar el stock
  (etiqueta de caché «coches»). Si algo falla, se sirve la página sin la lista, nunca un error.
*/

const CANON = "/coches-segunda-mano-fuerteventura/";
const CACHE = { "cache-control": "public, max-age=0, must-revalidate", "netlify-cdn-cache-control": "public, s-maxage=300, stale-while-revalidate=3600", "netlify-cache-tag": "coches,paginas" };
const SEG = { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "DENY" };

function tarjeta(c: Car) {
  const f = c.fotos?.[0] || c.video?.poster || "";
  const res = c.estado === "reservado";
  const datos = [c.anio, kmTxt(c.km), c.combustible, c.cambio].filter(Boolean).map((x) => escH(x)).join(" · ");
  return `<a class="lc-car${res ? " res" : ""}" href="/coche/${escH(slugDe(c))}">
    <div class="im">${f ? `<img ${imgAttrs(f, 480, "(max-width: 700px) 100vw, 360px")} alt="${escH(`${c.marca} ${c.modelo} ${c.anio} de segunda mano en Fuerteventura`)}" loading="lazy" decoding="async">` : ""}
      <span class="lc-tag">${res ? "Reservado" : "Entrega gratis en la isla"}</span></div>
    <div class="t"><b>${escH(c.marca)} ${escH(c.modelo)}</b>${c.version ? `<small>${escH(c.version)}</small>` : ""}
      <span class="d num">${datos}</span>
      <div class="pr"><strong class="num">${eur(c.precio)}</strong><em>Precio final · 12 meses de garantía legal</em></div></div></a>`;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  if (url.pathname !== CANON) return Response.redirect(url.origin + CANON, 301); // una sola dirección
  let html = PLANTILLA;
  try {
    const todos = ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null) || SEMILLA;
    const lista = (todos.length ? todos : SEMILLA)
      .filter((c) => c.estado === "disponible" || c.estado === "reservado")
      .sort((a, b) => (a.estado === "reservado" ? 1 : 0) - (b.estado === "reservado" ? 1 : 0) || (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || a.precio - b.precio);
    if (lista.length) {
      const n = lista.filter((c) => c.estado === "disponible").length;
      const bloque = `<section class="sec" id="coches"><h2>Coches disponibles ahora</h2>
    <p>${n === 1 ? "1 coche disponible" : `${n} coches disponibles`}, revisados en nuestro taller de Antigua. Toca uno para ver fotos, vídeo, financiación y reservar la prueba.</p>
    <div class="lc-cars">${lista.map(tarjeta).join("")}</div>
    <p style="margin-top:18px"><a class="btn b-rosso" href="/comprar">Buscar con filtros</a></p>
  </section>`;
      const ld = { "@context": "https://schema.org", "@type": "ItemList", name: "Coches de segunda mano en venta en Fuerteventura", numberOfItems: lista.length,
        itemListElement: lista.map((c, i) => ({ "@type": "ListItem", position: i + 1, url: `${url.origin}/coche/${slugDe(c)}`, name: `${c.marca} ${c.modelo} ${c.anio}` })) };
      html = html.replace("<!--STOCK-->", bloque).replace("</head>", `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>\n</head>`);
    }
  } catch (e) {
    console.error("[coches-fv]", e);
  }
  return new Response(html.replace("<!--STOCK-->", ""), { headers: { "content-type": "text/html; charset=utf-8", ...SEG, ...CACHE } });
};

export const config: Config = {
  path: ["/coches-segunda-mano-fuerteventura", "/coches-segunda-mano-fuerteventura/"],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
