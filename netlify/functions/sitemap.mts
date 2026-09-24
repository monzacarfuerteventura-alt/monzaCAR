import type { Config } from "@netlify/functions";
import { store, SEMILLA, type Car } from "../lib/shared.mts";
import { slugDe, foto, escH } from "../lib/paginas.mts";
import { RUTAS_VENTA, RUTAS_TALLER } from "../lib/municipios.mts";

/*
  MAPA DEL SITIO PARA GOOGLE (/sitemap.xml), siempre al día:
  portada en español e inglés, secciones (/comprar, /taller, /contacto), páginas de servicios, páginas por pueblo y una entrada por cada coche a la venta (con sus fotos).
  Si añades una página de servicio nueva en tools/seo.py, añádela también a PAGINAS.
*/
export const PAGINAS = [
  "/coches-segunda-mano-fuerteventura/",
  "/taller-mecanico-fuerteventura/",
  "/chapa-y-pintura-fuerteventura/",
  "/pre-itv-fuerteventura/",
  "/financiacion-coches-fuerteventura/",
];
const HOY_WEB = "2026-09-24"; // última vez que cambió el contenido fijo de la web (SEO mejorado: sitemap, schema.org, local pages)

export default async (req: Request) => {
  const o = new URL(req.url).origin;
  const l = ((await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null) || SEMILLA;
  const coches = l.filter((c) => c.estado !== "vendido");
  const ultimo = coches.map((c) => String(c.actualizado || c.creado).slice(0, 10)).sort().pop() || HOY_WEB;
  const home = ultimo > HOY_WEB ? ultimo : HOY_WEB;
  const alt = `<xhtml:link rel="alternate" hreflang="es" href="${o}/"/><xhtml:link rel="alternate" hreflang="en" href="${o}/en/"/><xhtml:link rel="alternate" hreflang="x-default" href="${o}/"/>`;
  const urls = [
    `<url><loc>${o}/</loc>${alt}<lastmod>${home}</lastmod></url>`,
    `<url><loc>${o}/en/</loc>${alt}<lastmod>${home}</lastmod></url>`,
    ...PAGINAS.map((p) => `<url><loc>${o}${p}</loc><lastmod>${p.startsWith("/coches") ? home : HOY_WEB}</lastmod></url>`),
    ...["/comprar", "/taller", "/contacto"].map((p) => `<url><loc>${o}${p}</loc><lastmod>${p === "/comprar" ? home : HOY_WEB}</lastmod></url>`),
    ...RUTAS_VENTA.map((p) => `<url><loc>${o}${p}</loc><lastmod>${home}</lastmod></url>`),
    ...RUTAS_TALLER.map((p) => `<url><loc>${o}${p}</loc><lastmod>${HOY_WEB}</lastmod></url>`),
    ...coches.map((c) => `<url><loc>${o}/coche/${escH(slugDe(c))}</loc><lastmod>${String(c.actualizado || c.creado).slice(0, 10)}</lastmod>${c.fotos.slice(0, 10).map((f) => `<image:image><image:loc>${escH(o + foto(f))}</image:loc></image:image>`).join("")}</url>`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join("\n")}
</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=0, must-revalidate", "netlify-cdn-cache-control": "public, s-maxage=600, stale-while-revalidate=3600" } });
};

export const config: Config = { path: "/sitemap.xml" };
