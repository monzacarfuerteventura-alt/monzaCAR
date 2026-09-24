import type { Config } from "@netlify/functions";
import { store, SEMILLA, type Car } from "../lib/shared.mts";
import { EMPRESA, escH, eur, kmTxt, foto, wa, slugDe, cabecera, pie } from "../lib/paginas.mts";

/*
  FICHA DE CADA COCHE PARA GOOGLE:  /coche/toyota-c-hr-2020-1a2b3c4d
  Página completa con fotos, datos, precio y datos estructurados (schema.org Car + Offer),
  para que cada coche aparezca en Google por sí solo («Toyota C-HR segunda mano Fuerteventura»).
  Los botones llevan a la web (/comprar?coche=ID), donde se abre la ficha con calculadora y cita.
*/

async function coches(): Promise<Car[]> {
  const l = (await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null;
  return l && l.length ? l : SEMILLA;
}

const CACHE = { "cache-control": "public, max-age=0, must-revalidate", "netlify-cdn-cache-control": "public, s-maxage=120, stale-while-revalidate=600" };

function noEncontrado(origin: string, otros: Car[]) {
  const html = cabecera(origin, "Coche no disponible · Volcano Cars", "Este coche ya no está publicado. Mira los coches de ocasión disponibles en Volcano Cars, Fuerteventura.", origin + "/comprar", "", "noindex, follow") +
    `<section class="sec"><div class="wrap"><span class="eyebrow">Coches de ocasión</span><h1>Este coche ya <span class="r">no está</span> publicado</h1>
    <p class="lead">Puede que se haya vendido. Estos son los coches que tenemos ahora, todos revisados en nuestro taller y con 1 año de garantía.</p>
    <div class="ctas"><a class="btn b-rosso" href="/comprar">Ver coches disponibles</a><a class="btn b-wa" href="${escH(wa("Hola Volcano Cars, busco un coche: "))}" target="_blank" rel="noopener">Dinos qué buscas</a></div>
    ${tarjetas(otros)}</div></section>` + pie();
  return new Response(html, { status: 404, headers: { "content-type": "text/html; charset=utf-8", ...CACHE } });
}

function tarjetas(l: Car[]) {
  if (!l.length) return "";
  return `<div class="otros">${l.map((c) => { const f = c.fotos[0] || c.video?.poster || "";
    return `<a class="otro" href="/coche/${escH(slugDe(c))}"><div class="im">${f ? `<img src="${escH(foto(f))}" alt="${escH(c.marca + " " + c.modelo)}" loading="lazy">` : ""}</div><div class="t"><b>${escH(c.marca)} ${escH(c.modelo)}</b><span>${c.anio} · ${kmTxt(c.km)} · ${escH(c.combustible)}</span><strong class="num">${eur(c.precio)}</strong></div></a>`; }).join("")}</div>`;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const origin = url.origin;
  const param = decodeURIComponent(url.pathname.split("/").filter(Boolean)[1] || "").toLowerCase().slice(0, 120);
  const lista = await coches();
  const limite = Date.now() - 60 * 864e5;
  const visibles = lista.filter((c) => c.estado !== "vendido" || (c.vendidoEn && Date.parse(c.vendidoEn) > limite));
  const disponibles = lista.filter((c) => c.estado === "disponible");
  const c = visibles.find((x) => slugDe(x) === param) || visibles.find((x) => x.id.toLowerCase() === param);
  if (!c) return noEncontrado(origin, disponibles.slice(0, 3));
  const slug = slugDe(c);
  if (param !== slug) return Response.redirect(`${origin}/coche/${encodeURIComponent(slug)}`, 301);

  const nombre = `${c.marca} ${c.modelo}`;
  const completo = `${nombre}${c.version ? " " + c.version : ""}`;
  const canonical = `${origin}/coche/${slug}`;
  const fotos = (c.fotos.length ? c.fotos : c.video?.poster ? [c.video.poster] : []).map(foto);
  const vendido = c.estado === "vendido", reservado = c.estado === "reservado";
  const titulo = `${completo} ${c.anio} de segunda mano · ${eur(c.precio)} · Fuerteventura`;
  const desc = `${completo} del ${c.anio} con ${kmTxt(c.km)}${c.combustible ? ", " + c.combustible.toLowerCase() : ""}${c.cambio ? ", cambio " + c.cambio.toLowerCase() : ""}, por ${eur(c.precio)}. Revisado en nuestro taller, 1 año de garantía y entrega gratis en Fuerteventura.`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Car",
        "@id": canonical + "#coche",
        name: `${completo} (${c.anio})`,
        url: canonical,
        brand: { "@type": "Brand", name: c.marca },
        model: c.modelo,
        vehicleConfiguration: c.version || undefined,
        vehicleModelDate: String(c.anio),
        itemCondition: "https://schema.org/UsedCondition",
        mileageFromOdometer: { "@type": "QuantitativeValue", value: c.km, unitCode: "KMT" },
        fuelType: c.combustible || undefined,
        vehicleTransmission: c.cambio || undefined,
        color: c.color || undefined,
        numberOfDoors: c.puertas || undefined,
        vehicleEngine: c.cv ? { "@type": "EngineSpecification", enginePower: { "@type": "QuantitativeValue", value: c.cv, unitText: "CV" } } : undefined,
        description: (c.descripcion || desc).slice(0, 1000),
        image: fotos.map((f) => origin + f),
        offers: {
          "@type": "Offer",
          price: c.precio.toFixed(2),
          priceCurrency: "EUR",
          availability: vendido ? "https://schema.org/SoldOut" : reservado ? "https://schema.org/LimitedAvailability" : "https://schema.org/InStock",
          itemCondition: "https://schema.org/UsedCondition",
          url: canonical,
          areaServed: { "@type": "Place", name: "Fuerteventura" },
          seller: { "@type": "AutoDealer", "@id": origin + "/#negocio", name: "Volcano Cars", telephone: "+34643668813", address: { "@type": "PostalAddress", streetAddress: EMPRESA.calle, postalCode: EMPRESA.cp, addressLocality: EMPRESA.localidad, addressRegion: "Las Palmas", addressCountry: "ES" } },
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: origin + "/" },
          { "@type": "ListItem", position: 2, name: "Coches de segunda mano", item: origin + "/coches-segunda-mano-fuerteventura/" },
          { "@type": "ListItem", position: 3, name: `${nombre} ${c.anio}`, item: canonical },
        ],
      },
    ],
  };
  const head = `<meta property="og:type" content="product">
<meta property="og:title" content="${escH(`${completo} (${c.anio}) · ${eur(c.precio)}`)}">
<meta property="og:description" content="${escH(desc)}">
<meta property="og:url" content="${escH(canonical)}">
${fotos[0] ? `<meta property="og:image" content="${escH(origin + fotos[0])}">` : `<meta property="og:image" content="${origin}/coches/opel-astra-2010/anuncio.jpg">`}
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`;

  const enWeb = `/comprar?coche=${encodeURIComponent(c.id)}`;
  const specs: [string, string | number | null][] = [["Año", c.anio], ["Kilómetros", kmTxt(c.km)], ["Combustible", c.combustible], ["Cambio", c.cambio], ["Potencia", c.cv ? c.cv + " CV" : ""], ["Puertas", c.puertas], ["Color", c.color], ["Etiqueta DGT", c.etiqueta]];
  const waTxt = `Hola, me interesa el ${completo} (${c.anio}, ${kmTxt(c.km)}) de ${eur(c.precio)}. ¿Sigue disponible?`;
  const otros = disponibles.filter((x) => x.id !== c.id).slice(0, 3);
  const ofe = bloqueOferta(c, lista, enWeb, waTxt);

  const html = cabecera(origin, titulo, desc, canonical, head, vendido ? "noindex, follow" : "index, follow, max-image-preview:large") + `
<div class="wrap">
  <nav class="migas" aria-label="Estás en"><ol><li><a href="/">Inicio</a></li><li><a href="/coches-segunda-mano-fuerteventura/">Coches de segunda mano</a></li><li aria-current="page">${escH(nombre)} ${c.anio}</li></ol></nav>
  <div class="ficha">
    <div class="gal">
      <div class="gal-main">${fotos[0] ? `<img src="${escH(fotos[0])}" alt="${escH(`${completo} ${c.anio}, foto principal`)}" fetchpriority="high">` : `<div class="sin"><svg viewBox="0 0 320 120" aria-hidden="true"><path d="M22 86c-4 0-7-3-7-7v-9c0-5 3-9 8-10l40-9 34-22c6-4 13-6 20-6h78c8 0 15 3 21 8l27 24 44 7c9 1 15 9 15 18v6c0 4-3 7-7 7h-12M102 86h112M104 52l30-20h45v20zM192 32h24c5 0 9 2 12 5l16 15h-52z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><circle cx="72" cy="86" r="20" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="246" cy="86" r="20" fill="none" stroke="currentColor" stroke-width="5"/></svg></div>`}</div>
      ${fotos.length > 1 ? `<div class="gal-thumbs">${fotos.slice(1).map((f, i) => `<a href="${escH(f)}" target="_blank" rel="noopener"><img src="${escH(f)}" alt="${escH(`${nombre} ${c.anio}, foto ${i + 2}`)}" loading="lazy"></a>`).join("")}</div>` : ""}
    </div>
    <aside class="info">
      <span class="estado ${vendido ? "ven" : reservado ? "res" : ""}">${vendido ? "Vendido" : reservado ? "Reservado" : "Disponible · revisado"}</span>
      <h1>${escH(nombre)}</h1>
      ${c.version ? `<div class="ver">${escH(c.version)}</div>` : ""}
      <div class="precio num">${eur(c.precio)}<small>Precio final, impuestos incluidos</small></div>
      ${ofe}
      <dl class="specs num">${specs.filter(([, v]) => v !== null && v !== "" && v !== undefined).map(([k, v]) => `<div><dt>${k}</dt><dd>${escH(v)}</dd></div>`).join("")}</dl>
      ${vendido ? `<div class="ctas"><a class="btn b-rosso" href="/comprar">Ver coches disponibles</a></div>` : `<div class="ctas">
        <a class="btn b-rosso" href="${enWeb}">${reservado ? "Ver en la web" : "Reservar visita y prueba"}</a>
        <a class="btn b-ink" href="${enWeb}">Calcular cuota de financiación</a>
        <a class="btn b-wa" href="${escH(wa(waTxt))}" target="_blank" rel="noopener">Preguntar por WhatsApp</a>
        <a class="btn b-ghost" href="tel:${EMPRESA.telLink}">Llamar ${EMPRESA.tel}</a></div>`}
      <ul class="perks"><li>12 meses de garantía desde la entrega</li><li>Revisado en nuestro taller de Antigua</li><li>Entrega a domicilio gratis en toda Fuerteventura</li><li>Nos encargamos del cambio de nombre</li></ul>
    </aside>
  </div>
  ${vendido ? `<p class="aviso">Este coche ya está vendido. Te enseñamos otros parecidos más abajo.</p>` : ""}
  ${c.descripcion ? `<section class="sec"><h2>Sobre este ${escH(nombre)}</h2><p style="white-space:pre-line">${escH(c.descripcion)}</p></section>` : ""}
  ${c.equipamiento.length ? `<section class="sec"><h2>Equipamiento</h2><ul class="eq">${c.equipamiento.map((e) => `<li>${escH(e)}</li>`).join("")}</ul></section>` : ""}
  <section class="sec"><div class="banda"><div><h2>Ven a verlo a Antigua</h2><p>${escH(EMPRESA.direccion)}. ${escH(EMPRESA.horario)}. Elige día y hora en la web y te lo tenemos preparado para probarlo.</p></div>
    <div class="ctas"><a class="btn b-rosso" href="${vendido ? "/comprar" : enWeb}">${vendido ? "Ver coches" : "Elegir día y hora"}</a><a class="btn b-wa" href="${escH(wa(waTxt))}" target="_blank" rel="noopener">WhatsApp</a></div></div></section>
  ${otros.length ? `<section class="sec"><h2>Otros coches disponibles</h2>${tarjetas(otros)}</section>` : ""}
</div>` + pie(waTxt);

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", ...CACHE } });
};

export const config: Config = {
  path: "/coche/:slug",
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};

// ---------- «¡Oferta imbatible de mercado!»: mismas reglas que en la web ----------
function bloqueOferta(c: Car, lista: Car[], enWeb: string, waTxt: string): string {
  const m = c.mercado;
  if (!m || !m.media || !m.n || m.n < 3 || c.estado === "vendido") return "";
  if (!((Date.now() - Date.parse(m.fecha + "T12:00:00Z")) / 864e5 <= 120)) return "";
  const ahorro = Math.round(m.media - c.precio); if (ahorro <= 0) return "";
  const pct = Math.round((ahorro / m.media) * 100); if (pct < 3) return "";
  const top = pct >= 10, ancho = Math.max(8, Math.round((c.precio / m.media) * 100));
  const lim = Date.now() - 60 * 864e5;
  const d = lista.filter((v) => v.estado === "vendido" && v.vendidoEn && Date.parse(v.vendidoEn) > lim).map((v) => (Date.parse(v.vendidoEn!) - Date.parse(v.creado)) / 864e5).filter((x) => isFinite(x) && x >= 0);
  const med = d.length >= 2 ? d.reduce((a, b) => a + b, 0) / d.length : -1;
  const urg = med < 0 ? "Precio por debajo del mercado: resérvalo antes de que se lo lleve otro." : med < 2 ? "Precio bajo mercado: nuestros últimos coches vendidos se fueron en menos de 48 horas." : `Precio bajo mercado: nuestros últimos coches vendidos duraron una media de ${Math.ceil(med)} días.`;
  const fecha = new Date(m.fecha + "T12:00:00Z").toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return `<section class="ofe${top ? "" : " verde"}" aria-label="Comparativa con el precio de mercado">
    <div class="ofe-head"><b><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.6 2.2c.3 2.6-.6 4.3-2 5.9-1.5 1.7-3.6 3.4-3.6 6.9A5 5 0 0012 20a5 5 0 005-5c0-1.8-.8-3.1-1.6-4.1-.2 1-.8 1.9-1.7 2.3.4-2.8-.2-6.2-1.1-11z"/></svg>${top ? "¡Oferta imbatible de mercado!" : "Precio por debajo del mercado"}</b><span class="ofe-pct">−${pct} %</span></div>
    <div class="ofe-b">
      <div class="ofe-save"><b>Te ahorras ${eur(ahorro)}</b><span>Un ${pct} % más barato que la media</span></div>
      <div class="ofe-bars">
        <div class="ofe-row mkt"><span>Precio medio del mercado</span><s>${eur(m.media)}</s><i style="--w:100%"></i></div>
        <div class="ofe-row our"><span>Nuestro precio en Fuerteventura</span><b>${eur(c.precio)}</b><i style="--w:${ancho}%"></i></div>
      </div>
      <p class="ofe-trans">Comparativa realizada sobre ${m.n} vehículos idénticos (mismo año, motor y rango de km) en portales automotrices${m.fuente ? " (" + escH(m.fuente) + ")" : ""}. Actualizada el ${fecha}.</p>
      ${c.estado === "disponible" ? `<p class="ofe-urg">⚡ ${urg}</p>
      <div class="ofe-cta"><a class="btn b-rosso" href="${enWeb}">Reservar o pedir información ahora</a><a class="btn b-wa" href="${escH(wa(waTxt))}" target="_blank" rel="noopener">WhatsApp</a></div>` : ""}
    </div></section>`;
}
