import type { Config } from "@netlify/functions";
import { store, SEMILLA, type Car } from "../lib/shared.mts";
import { EMPRESA, escH, eur, kmTxt, foto, wa, slugDe, cabecera, pie } from "../lib/paginas.mts";
import { MUNICIPIOS, porSlug, type Municipio } from "../lib/municipios.mts";

/*
  PÁGINAS LOCALES PARA GOOGLE (SEO local), una por pueblo y servicio:
    /coches-segunda-mano-<pueblo>   → catálogo en vivo + entrega gratis a domicilio en ese pueblo
    /taller-mecanico-<pueblo>       → taller en Antigua para clientes de ese pueblo + reserva de cita al momento
  Los pueblos, distancias y textos están en netlify/lib/municipios.mts.
  Si añades un pueblo allí, añade también sus dos direcciones en config.path (abajo) y en el sitemap.
*/

const CACHE = { "cache-control": "public, max-age=0, must-revalidate", "netlify-cdn-cache-control": "public, s-maxage=300, stale-while-revalidate=3600" };
const SEG = { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "DENY" };

async function coches(): Promise<Car[]> {
  const l = (await store("monzacar").get("coches", { type: "json" }).catch(() => null)) as Car[] | null;
  return l && l.length ? l : SEMILLA;
}

const tiempo = (m: Municipio) => (m.min <= 6 ? "a 5 minutos" : `a unos ${m.min} minutos`);
const distancia = (m: Municipio) => (m.km <= 5 ? "en el mismo municipio" : `unos ${m.km} km`);
const ld = (o: unknown) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;

function negocio(origin: string, tipo: "AutoDealer" | "AutoRepair", m: Municipio) {
  return {
    "@type": tipo,
    "@id": origin + "/#negocio",
    name: EMPRESA.nombre,
    url: origin + "/",
    telephone: EMPRESA.telLink,
    email: EMPRESA.email,
    image: origin + "/coches/opel-astra-2010/anuncio.jpg",
    logo: origin + "/marca/logo-oscuro.svg",
    priceRange: "€€",
    hasMap: EMPRESA.mapaCid,
    address: { "@type": "PostalAddress", streetAddress: EMPRESA.calle, postalCode: EMPRESA.cp, addressLocality: EMPRESA.localidad, addressRegion: "Las Palmas", addressCountry: "ES" },
    geo: { "@type": "GeoCoordinates", latitude: EMPRESA.lat, longitude: EMPRESA.lng },
    openingHoursSpecification: [{ "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "16:00" }],
    areaServed: [
      { "@type": "City", name: m.nombre, containedInPlace: { "@type": "AdministrativeArea", name: m.municipio } },
      { "@type": "Island", name: "Fuerteventura" },
      ...MUNICIPIOS.filter((x) => x.slug !== m.slug).map((x) => ({ "@type": "City", name: x.nombre })),
    ],
  };
}

function migas(origin: string, pasos: [string, string][]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: pasos.map(([n, u], i) => ({ "@type": "ListItem", position: i + 1, name: n, item: origin + u })),
  };
}

function faqLD(faq: [string, string][]) {
  return { "@type": "FAQPage", mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a.replace(/<[^>]+>/g, "") } })) };
}
const faqHTML = (faq: [string, string][]) => `<div class="faq">${faq.map(([q, a]) => `<details><summary>${escH(q)}</summary><p>${a}</p></details>`).join("")}</div>`;

// ---------- recorrido Antigua → pueblo ----------
function ruta(m: Municipio, destino: string) {
  if (m.km <= 5) {
    return `<div class="lc-ruta cerca"><div class="lc-pt"><span class="lc-dot"></span><b>Volcano Cars</b><small>Polígono Industrial de Antigua</small></div>
      <div class="lc-linea"><span>Estamos ${escH(m.en)}</span></div>
      <div class="lc-pt b"><span class="lc-dot"></span><b>${escH(destino)}</b><small>a 5 minutos o menos</small></div></div>`;
  }
  return `<div class="lc-ruta"><div class="lc-pt"><span class="lc-dot"></span><b>Antigua</b><small>Nuestra nave</small></div>
    <div class="lc-linea"><span class="num">≈ ${m.km} km · ${m.min} min</span></div>
    <div class="lc-pt b"><span class="lc-dot"></span><b>${escH(m.nombre)}</b><small>${escH(destino)}</small></div></div>`;
}

function otrasZonas(m: Municipio, tipo: "venta" | "taller") {
  const base = tipo === "venta" ? "/coches-segunda-mano-" : "/taller-mecanico-";
  return `<ul class="lc-zonas">${MUNICIPIOS.filter((x) => x.slug !== m.slug).map((x) => `<li><a href="${base}${x.slug}">${escH(x.nombre)}</a></li>`).join("")}</ul>`;
}

// ---------- tarjeta de coche ----------
function tarjeta(c: Car, m: Municipio) {
  const f = c.fotos[0] || c.video?.poster || "";
  const res = c.estado === "reservado";
  const datos = [c.anio, kmTxt(c.km), c.combustible, c.cambio].filter(Boolean).map((x) => escH(x)).join(" · ");
  return `<a class="lc-car${res ? " res" : ""}" href="/coche/${escH(slugDe(c))}">
    <div class="im">${f ? `<img src="${escH(foto(f))}" alt="${escH(`${c.marca} ${c.modelo} ${c.anio} de segunda mano`)}" loading="lazy" decoding="async">` : ""}
      <span class="lc-tag">${res ? "Reservado" : `Entrega gratis ${escH(m.en)}`}</span></div>
    <div class="t"><b>${escH(c.marca)} ${escH(c.modelo)}</b>${c.version ? `<small>${escH(c.version)}</small>` : ""}
      <span class="d num">${datos}</span>
      <div class="pr"><strong class="num">${eur(c.precio)}</strong><em>Precio final · 12 meses de garantía</em></div></div></a>`;
}

// =====================================================================
// PÁGINA DE VENTA
// =====================================================================
async function venta(origin: string, m: Municipio) {
  const todos = await coches();
  const lista = todos
    .filter((c) => c.estado === "disponible" || c.estado === "reservado")
    .sort((a, b) => (a.estado === "reservado" ? 1 : 0) - (b.estado === "reservado" ? 1 : 0) || (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0) || a.precio - b.precio);
  const disp = lista.filter((c) => c.estado === "disponible");
  const desde = disp.length ? Math.floor(Math.min(...disp.map((c) => c.precio))) : 0;
  const url = `/coches-segunda-mano-${m.slug}`;
  const canonical = origin + url;
  const titulo = `Coches de Segunda Mano en ${m.nombre} | Garantía y Entrega Gratis - Volcano Cars`;
  const desc = `Coches de segunda mano revisados para ${m.nombre}: 12 meses de garantía, entrega gratis a domicilio y financiación.${desde ? ` Desde ${eur(desde)}.` : ""} Taller propio en Antigua.`;
  const waTxt = `Hola Volcano Cars, vivo ${m.en} y busco un coche de segunda mano: `;
  const faq: [string, string][] = [
    [`¿Cuánto cuesta que me llevéis el coche a ${m.nombre}?`, `Nada. Una vez firmada la compra te llevamos el coche gratis a tu casa ${m.en} (o donde nos digas dentro de Fuerteventura), el día y a la hora que acordemos.`],
    [`¿Puedo probar el coche antes de comprarlo?`, `Sí. Reserva día y hora en la ficha del coche y te lo tenemos preparado en nuestra nave de Antigua, ${m.km <= 5 ? "a pocos minutos de ti" : `a ${m.km} km aproximadamente ${m.de}`}. La visita no te obliga a nada.`],
    [`¿Qué garantía tienen los coches?`, `Los coches que vendemos a particulares tienen 12 meses de garantía desde la entrega, según nuestras <a href="/condiciones">condiciones</a>. Todos pasan antes por nuestro taller.`],
    [`¿Se puede financiar?`, `Sí. En cada coche tienes una calculadora con la cuota y puedes pedir un pre-estudio sin compromiso. La financiación está sujeta a la aprobación de la entidad financiera.`],
  ];
  const head = `<meta property="og:type" content="website"><meta property="og:title" content="${escH(titulo)}"><meta property="og:description" content="${escH(desc)}"><meta property="og:url" content="${escH(canonical)}">
<meta property="og:image" content="${escH(origin + (disp[0]?.fotos[0] ? foto(disp[0].fotos[0]) : "/coches/opel-astra-2010/anuncio.jpg"))}">
${ld({
    "@context": "https://schema.org",
    "@graph": [
      negocio(origin, "AutoDealer", m),
      { "@type": "WebPage", "@id": canonical, url: canonical, name: titulo, description: desc, inLanguage: "es", about: { "@id": origin + "/#negocio" } },
      migas(origin, [["Inicio", "/"], ["Coches de segunda mano", "/coches-segunda-mano-fuerteventura/"], [m.nombre, url]]),
      ...(lista.length ? [{ "@type": "ItemList", name: `Coches de segunda mano disponibles para ${m.nombre}`, numberOfItems: lista.length, itemListElement: lista.slice(0, 20).map((c, i) => ({ "@type": "ListItem", position: i + 1, url: origin + "/coche/" + slugDe(c), name: `${c.marca} ${c.modelo} ${c.anio}` })) }] : []),
      faqLD(faq),
    ],
  })}`;

  const catalogo = lista.length
    ? `<div class="lc-cars">${lista.slice(0, 12).map((c) => tarjeta(c, m)).join("")}</div>
       ${lista.length > 12 ? `<p class="lc-mas"><a class="btn b-ink" href="/comprar">Ver los ${lista.length} coches</a></p>` : ""}`
    : `<div class="lc-vacio"><b>Ahora mismo estamos preparando los próximos coches.</b><p>Dinos qué buscas y te avisamos en cuanto entre uno que encaje, con entrega gratis ${escH(m.en)}.</p>
       <a class="btn b-wa" href="${escH(wa(waTxt))}" target="_blank" rel="noopener">Dinos qué buscas</a></div>`;

  const html = cabecera(origin, titulo, desc, canonical, head, "index, follow, max-image-preview:large") + `
<div class="wrap">
  <nav class="migas" aria-label="Estás en"><ol><li><a href="/">Inicio</a></li><li><a href="/coches-segunda-mano-fuerteventura/">Coches de segunda mano</a></li><li aria-current="page">${escH(m.nombre)}</li></ol></nav>
  <header class="pg-hero lc-hero">
    <span class="eyebrow">Coches de ocasión · ${escH(m.nombre)}</span>
    <h1>Coches de segunda mano y ocasión en <span class="r">${escH(m.nombre)}</span></h1>
    <p class="lc-prop"><span class="lc-prop-ic" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1zM16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg></span>
      <span>Te llevamos tu coche <b>gratis hasta la puerta de tu casa ${escH(m.en)}</b> con <b>12 meses de garantía</b>.</span></p>
    <div class="ctas">
      <a class="btn b-rosso" href="#catalogo">Ver coches disponibles${disp.length ? ` (${disp.length})` : ""}</a>
      <a class="btn b-wa" href="${escH(wa(waTxt))}" target="_blank" rel="noopener">WhatsApp</a>
      <a class="btn b-ghost" href="tel:${EMPRESA.telLink}">Llamar ${EMPRESA.tel}</a>
    </div>
    <ul class="sello"><li>12 meses de garantía</li><li>Entrega gratis ${escH(m.en)}</li><li>Revisados en nuestro taller</li><li>Financiación</li></ul>
  </header>

  <section class="sec" id="catalogo" aria-labelledby="h-cat">
    <div class="lc-sec-h"><h2 id="h-cat">Coches disponibles para entregar ${escH(m.en)}</h2>${desde ? `<span class="lc-desde num">Desde ${eur(desde)}</span>` : ""}</div>
    <div class="chips lc-filtros" aria-label="Filtrar por precio">
      ${[2500, 3500, 5000, 6500, 8000].map((v) => `<a href="/comprar?pmax=${v}">Hasta ${eur(v)}</a>`).join("")}<a href="/comprar?orden=barato">Del más barato al más caro</a>
    </div>
    ${catalogo}
  </section>

  <section class="sec" aria-labelledby="h-ent">
    <div class="lc-dos">
      <div>
        <h2 id="h-ent">Así llega tu coche a ${escH(m.nombre)}</h2>
        <p>${escH(m.venta)}</p>
        ${ruta(m, "tu casa, sin coste")}
        <p class="lc-nota">Distancia y tiempo aproximados por carretera desde nuestra nave (${escH(EMPRESA.calle)}, ${EMPRESA.cp} ${EMPRESA.localidad}). ${m.municipio !== m.nombre ? `${escH(m.nombre)} pertenece al municipio de ${escH(m.municipio)}.` : ""}</p>
      </div>
      <ol class="pasos">
        <li><div><b>Eliges en la web</b><span>Fotos reales, precio final y, si quieres, la cuota de financiación.</span></div></li>
        <li><div><b>Lo pruebas si quieres</b><span>Reservas día y hora y te lo tenemos preparado en Antigua. Sin compromiso.</span></div></li>
        <li><div><b>Firmamos en Antigua</b><span>Contrato por escrito, y nos encargamos del cambio de nombre en Tráfico.</span></div></li>
        <li><div><b>Te lo llevamos ${escH(m.en)}</b><span>Gratis, el día y a la hora que acordemos contigo.</span></div></li>
      </ol>
    </div>
  </section>

  <section class="sec" aria-labelledby="h-conf">
    <h2 id="h-conf">Por qué comprar en Volcano Cars</h2>
    <div class="grid3">
      <div class="card"><div class="ic">12</div><h3>Meses de garantía</h3><p>Desde la entrega, para particulares. Sin letra pequeña escondida: <a href="/condiciones">lee las condiciones</a>.</p></div>
      <div class="card"><div class="ic">✓</div><h3>Revisado en taller propio</h3><p>Cada coche pasa por nuestro taller de Antigua antes de publicarse. Si algo no está bien, se arregla antes.</p></div>
      <div class="card"><div class="ic">0 €</div><h3>Entrega ${escH(m.en)}</h3><p>${m.km <= 5 ? "Estamos al lado, pero si lo prefieres te lo dejamos en tu puerta." : `Son ${distancia(m)} y ${m.min} minutos aproximados: los hacemos nosotros, sin coste para ti.`}</p></div>
    </div>
    <p style="margin-top:22px">También entregamos gratis en ${m.cerca.map(escH).join(", ")} y en el resto de Fuerteventura.</p>
  </section>

  <section class="sec" aria-labelledby="h-faq"><h2 id="h-faq">Preguntas frecuentes ${escH(m.de)}</h2>${faqHTML(faq)}</section>

  <section class="sec"><div class="banda"><div><h2>¿Buscas coche ${escH(m.en)}?</h2><p>Dinos qué necesitas (presupuesto, tamaño, cambio automático…) y te enseñamos lo que tenemos o te avisamos cuando entre.</p></div>
    <div class="ctas"><a class="btn b-rosso" href="/comprar">Ver todo el catálogo</a><a class="btn b-wa" href="${escH(wa(waTxt))}" target="_blank" rel="noopener">WhatsApp</a></div></div></section>

  <section class="sec lc-links" aria-labelledby="h-z">
    <h2 id="h-z" class="lc-h3">Coches de segunda mano en otras zonas</h2>${otrasZonas(m, "venta")}
    <p class="lc-cruz">¿Necesitas taller? <a href="/taller-mecanico-${m.slug}">Taller mecánico, chapa y pintura para clientes ${escH(m.de)}</a></p>
  </section>
</div>` + pie(waTxt);
  return html;
}

// =====================================================================
// PÁGINA DE TALLER
// =====================================================================
const SERVICIOS = ["Mecánica general", "Chapa y pintura", "Cambio de aceite y filtros", "Frenos", "Diagnosis electrónica", "Pre-ITV", "Aire acondicionado", "Neumáticos", "Otro"];

function taller(origin: string, m: Municipio) {
  const url = `/taller-mecanico-${m.slug}`;
  const canonical = origin + url;
  const titulo = `Taller Mecánico cerca de ${m.nombre} | Chapa, Pintura y Mantenimiento - Volcano Cars`;
  const desc = `Taller mecánico, chapa y pintura para clientes ${m.de} (${m.km <= 5 ? "a 5 min" : `≈${m.min} min`}). Presupuesto sin compromiso, garantía y plazo por escrito. Cita online.`;
  const waTxt = `Hola Volcano Cars, soy ${m.de} y quiero pedir presupuesto en el taller: `;
  const cerca = m.min <= 25 ? `a pocos minutos ${m.de}` : `${tiempo(m)} ${m.de}`;
  const faq: [string, string][] = [
    [`¿Tengo que ir hasta Antigua desde ${m.nombre}?`, `Sí, el taller está en el Polígono Industrial de Antigua, ${m.km <= 5 ? "en tu mismo municipio" : `a unos ${m.km} km (≈${m.min} min) ${m.de}`}. Para que el viaje merezca la pena te damos cita a una hora concreta y el presupuesto antes de empezar.`],
    [`¿Me dais presupuesto antes de reparar?`, `Siempre. No tocamos nada sin que hayas aceptado el presupuesto. Si durante la reparación aparece algo más, te llamamos antes.`],
    [`¿Qué garantía tienen las reparaciones?`, `Las reparaciones tienen garantía de 3 meses o 2.000 km, según nuestras <a href="/condiciones">condiciones</a>.`],
    [`¿Trabajáis con todas las marcas?`, `Sí, somos un taller multimarca: mecánica, diagnosis, chapa y pintura para cualquier marca y modelo de turismo.`],
  ];
  const head = `<meta property="og:type" content="website"><meta property="og:title" content="${escH(titulo)}"><meta property="og:description" content="${escH(desc)}"><meta property="og:url" content="${escH(canonical)}">
<meta property="og:image" content="${origin}/coches/opel-astra-2010/anuncio.jpg">
${ld({
    "@context": "https://schema.org",
    "@graph": [
      negocio(origin, "AutoRepair", m),
      { "@type": "WebPage", "@id": canonical, url: canonical, name: titulo, description: desc, inLanguage: "es", about: { "@id": origin + "/#negocio" } },
      migas(origin, [["Inicio", "/"], ["Taller mecánico", "/taller-mecanico-fuerteventura/"], [m.nombre, url]]),
      faqLD(faq),
    ],
  })}`;

  const html = cabecera(origin, titulo, desc, canonical, head, "index, follow") + `
<div class="wrap">
  <nav class="migas" aria-label="Estás en"><ol><li><a href="/">Inicio</a></li><li><a href="/taller-mecanico-fuerteventura/">Taller mecánico</a></li><li aria-current="page">${escH(m.nombre)}</li></ol></nav>
  <div class="lc-top">
    <header class="pg-hero lc-hero">
      <span class="eyebrow">Taller · clientes ${escH(m.de)}</span>
      <h1>Taller mecánico, chapa y pintura para clientes de <span class="r">${escH(m.nombre)}</span></h1>
      <p class="lc-prop"><span class="lc-prop-ic" aria-hidden="true"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg></span>
        <span>Servicio técnico multimarca en Antigua, <b>${escH(cerca)}</b>. <b>Transparencia total</b> y <b>compromiso de plazo</b>.</span></p>
      <div class="ctas lc-movil"><a class="btn b-rosso" href="#reserva">Reservar hora o pedir presupuesto</a></div>
      <ul class="sello"><li>Presupuesto antes de tocar nada</li><li>Fecha de entrega por escrito</li><li>3 meses o 2.000 km de garantía</li></ul>
      ${ruta(m, `clientes ${m.de}`)}
    </header>
    ${widget(m)}
  </div>

  <section class="sec" aria-labelledby="h-srv">
    <h2 id="h-srv">Qué hacemos por tu coche</h2>
    <div class="grid3">
      <div class="card"><div class="ic">01</div><h3>Mecánica rápida</h3><p>Aceite y filtros, frenos, distribución, batería, aire acondicionado y neumáticos. <a href="/taller-mecanico-fuerteventura/">Ver taller mecánico</a>.</p></div>
      <div class="card"><div class="ic">02</div><h3>Chapa y pintura</h3><p>Golpes, abolladuras, arañazos y pintura parcial o completa, con acabado de fábrica. <a href="/chapa-y-pintura-fuerteventura/">Ver chapa y pintura</a>.</p></div>
      <div class="card"><div class="ic">03</div><h3>Diagnosis y pre-ITV</h3><p>Leemos las averías con equipo de diagnosis y dejamos el coche listo para pasar la ITV. <a href="/pre-itv-fuerteventura/">Ver pre-ITV</a>.</p></div>
    </div>
  </section>

  <section class="sec" aria-labelledby="h-como">
    <div class="lc-dos">
      <div><h2 id="h-como">Cómo trabajamos con clientes ${escH(m.de)}</h2><p>${escH(m.taller)}</p>
        <p class="lc-nota">Distancia y tiempo aproximados por carretera desde ${escH(m.nombre)} hasta nuestra nave (${escH(EMPRESA.calle)}, ${EMPRESA.cp} ${EMPRESA.localidad}).${m.municipio !== m.nombre ? ` ${escH(m.nombre)} pertenece al municipio de ${escH(m.municipio)}.` : ""}</p></div>
      <ol class="pasos">
        <li><div><b>Reservas tu hora</b><span>Aquí mismo o por WhatsApp. Sin esperas al llegar.</span></div></li>
        <li><div><b>Presupuesto cerrado</b><span>Te decimos qué tiene y cuánto cuesta antes de empezar.</span></div></li>
        <li><div><b>Fecha de entrega por escrito</b><span>Y te avisamos por WhatsApp en cuanto esté listo.</span></div></li>
        <li><div><b>Garantía de la reparación</b><span>3 meses o 2.000 km.</span></div></li>
      </ol>
    </div>
  </section>

  <section class="sec" aria-labelledby="h-faq"><h2 id="h-faq">Preguntas frecuentes</h2>${faqHTML(faq)}</section>

  <section class="sec"><div class="banda"><div><h2>¿Prefieres hablarlo antes?</h2><p>Mándanos una foto del golpe o cuéntanos qué le notas al coche y te orientamos sin compromiso.</p></div>
    <div class="ctas"><a class="btn b-wa" href="${escH(wa(waTxt))}" target="_blank" rel="noopener">WhatsApp</a><a class="btn b-rosso" href="tel:${EMPRESA.telLink}">Llamar ${EMPRESA.tel}</a></div></div></section>

  <section class="sec lc-links" aria-labelledby="h-z">
    <h2 id="h-z" class="lc-h3">Taller para clientes de otras zonas</h2>${otrasZonas(m, "taller")}
    <p class="lc-cruz">¿Buscas coche? <a href="/coches-segunda-mano-${m.slug}">Coches de segunda mano con entrega gratis ${escH(m.en)}</a></p>
  </section>
</div>
${scriptReserva(m)}` + pie(waTxt);
  return html;
}

// ---------- widget de reserva (cita al momento o presupuesto) ----------
function widget(m: Municipio) {
  return `<aside class="lc-res" id="reserva" aria-labelledby="r-h">
  <h2 id="r-h" class="lc-h3">Pide cita o presupuesto</h2>
  <form id="r-form" novalidate>
    <div class="lc-seg" role="radiogroup" aria-label="Qué quieres">
      <label><input type="radio" name="r-modo" value="cita" checked><span>Reservar hora</span></label>
      <label><input type="radio" name="r-modo" value="presu"><span>Solo presupuesto</span></label>
    </div>
    <fieldset class="lc-srv"><legend>¿Qué necesita tu coche?</legend>
      ${SERVICIOS.map((s) => `<label><input type="checkbox" name="r-srv" value="${escH(s)}"><span>${escH(s)}</span></label>`).join("")}
    </fieldset>
    <div class="lc-f2">
      <label><span>Coche</span><input id="r-car" required placeholder="Ej. Seat Ibiza 2016" autocomplete="off"></label>
      <label><span>Matrícula <small>(opcional)</small></span><input id="r-plate" placeholder="1234 ABC" autocomplete="off"></label>
    </div>
    <label><span>¿Qué le pasa? <small>(opcional)</small></span><textarea id="r-msg" rows="2" placeholder="Ej. Hace ruido al frenar"></textarea></label>
    <div class="lc-f2">
      <label><span>Tu nombre</span><input id="r-name" required autocomplete="name"></label>
      <label><span>Teléfono</span><input id="r-phone" type="tel" required autocomplete="tel" inputmode="tel"></label>
    </div>
    <div id="r-agenda" class="lc-ag" aria-live="polite"><p class="lc-ag-msg">Cargando horas libres…</p></div>
    <input class="lc-hp" type="text" name="web" id="r-web" tabindex="-1" autocomplete="off" aria-hidden="true">
    <label class="lc-ok"><input type="checkbox" id="r-ok" required><span>Acepto que Volcano Cars use estos datos solo para responder a mi solicitud. Puedo pedir que los borren cuando quiera. <a href="/privacidad" target="_blank" rel="noopener">Política de privacidad</a>.</span></label>
    <p class="lc-err" id="r-err" role="alert" hidden></p>
    <button class="btn b-rosso" type="submit" id="r-btn">Confirmar cita</button>
    <p class="lc-nota" id="r-nota">La cita queda confirmada al momento. Te esperamos en Antigua.</p>
  </form>
  <div class="lc-conf" id="r-conf" role="status" hidden></div>
</aside>`;
}

function scriptReserva(m: Municipio) {
  const cfg = JSON.stringify({ pueblo: m.nombre, de: m.de, wa: EMPRESA.wa, tel: EMPRESA.tel }).replace(/</g, "\\u003c");
  return `<script>
(()=>{const C=${cfg};const $=s=>document.querySelector(s);const f=$("#r-form");if(!f)return;
const st={dias:[],fecha:"",hora:"",error:false};
const modo=()=>f.querySelector("input[name=r-modo]:checked").value;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const bonita=d=>new Date(d+"T12:00:00Z").toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long",timeZone:"UTC"});
const corta=d=>new Date(d+"T12:00:00Z").toLocaleDateString("es-ES",{weekday:"short",day:"numeric",timeZone:"UTC"});
const wa=t=>"https://wa.me/"+C.wa+"?text="+encodeURIComponent(t);
function pintar(){const box=$("#r-agenda");if(modo()!=="cita"){box.hidden=true;return;}box.hidden=false;
 if(st.error){box.innerHTML='<p class="lc-ag-msg">No hemos podido cargar las horas. Envía la solicitud y te llamamos para darte cita.</p>';return;}
 const libres=st.dias.filter(d=>!d.cerrado&&d.horas.some(h=>h.libre)).slice(0,6);
 if(!st.dias.length){box.innerHTML='<p class="lc-ag-msg">Cargando horas libres…</p>';return;}
 if(!libres.length){box.innerHTML='<p class="lc-ag-msg">No quedan horas libres estos días. Pide presupuesto y te llamamos.</p>';return;}
 if(!libres.some(d=>d.fecha===st.fecha)){st.fecha=libres[0].fecha;st.hora="";}
 const dia=libres.find(d=>d.fecha===st.fecha);
 box.innerHTML='<p class="lc-ag-t">Elige día y hora <span>· horas libres en tiempo real</span></p><div class="lc-dias" role="group" aria-label="Día">'+libres.map(d=>'<button type="button" data-f="'+d.fecha+'" aria-pressed="'+(d.fecha===st.fecha)+'">'+esc(corta(d.fecha))+'</button>').join("")+'</div><div class="lc-horas" role="group" aria-label="Hora">'+dia.horas.map(h=>'<button type="button" data-h="'+h.hora+'" '+(h.libre?"":"disabled")+' aria-pressed="'+(h.hora===st.hora)+'">'+h.hora+'</button>').join("")+'</div>';}
async function cargar(){try{const r=await fetch("/api/citas?agenda=taller",{cache:"no-store"});if(!r.ok)throw 0;const j=await r.json();st.dias=j.dias||[];st.error=false;}catch(_){st.error=true;}pintar();}
$("#r-agenda").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.dataset.f){st.fecha=b.dataset.f;st.hora="";}if(b.dataset.h)st.hora=b.dataset.h;pintar();});
f.querySelectorAll("input[name=r-modo]").forEach(r=>r.addEventListener("change",()=>{const c=modo()==="cita";$("#r-btn").textContent=c?"Confirmar cita":"Pedir presupuesto";$("#r-nota").textContent=c?"La cita queda confirmada al momento. Te esperamos en Antigua.":"Te enviamos el presupuesto por WhatsApp o te llamamos en horario de apertura.";pintar();}));
const err=t=>{const e=$("#r-err");e.textContent=t;e.hidden=!t;if(t)e.scrollIntoView({block:"nearest",behavior:"smooth"});};
f.addEventListener("submit",async e=>{e.preventDefault();err("");
 const srv=[...f.querySelectorAll("input[name=r-srv]:checked")].map(x=>x.value);
 const car=$("#r-car").value.trim(),nom=$("#r-name").value.trim(),tel=$("#r-phone").value.trim(),cita=modo()==="cita"&&!st.error;
 if(!car){err("Dinos qué coche es.");$("#r-car").focus();return;}
 if(nom.length<2){err("Escribe tu nombre.");$("#r-name").focus();return;}
 if(tel.replace(/[^\\d]/g,"").length<9){err("Revisa el teléfono.");$("#r-phone").focus();return;}
 if(cita&&!st.hora){err("Elige el día y la hora de tu cita.");return;}
 if(!$("#r-ok").checked){err("Marca la casilla de privacidad para poder enviarlo.");return;}
 const q=new URLSearchParams(location.search),o={referrer:(document.referrer||"").slice(0,300),landing:(location.pathname+location.search).slice(0,300)};
 ["gclid","utm_source","utm_medium","utm_campaign","utm_term"].forEach(k=>{const v=q.get(k);if(v)o[k]=v.slice(0,200);});
 const coche=car+($("#r-plate").value.trim()?" ("+$("#r-plate").value.trim()+")":"");
 const datos={tipo:"taller",nombre:nom,telefono:tel,mensaje:($("#r-msg").value.trim()+"\\n(Cliente "+C.de+")").trim(),servicios:srv,vehiculo:{coche:car,matricula:$("#r-plate").value.trim()},origen:o,idioma:"es",acepta:true,web:$("#r-web").value};
 if(cita)datos.cita={fecha:st.fecha,hora:st.hora};
 const b=$("#r-btn");b.disabled=true;
 try{const r=await fetch("/api/solicitudes",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(datos)});const j=await r.json().catch(()=>({}));
  if(!r.ok){if(j.ocupada){err("Esa hora se acaba de ocupar. Elige otra, por favor.");st.hora="";cargar();return;}throw new Error(j.error||"");}
  const resumen=(cita?"Cita en el taller el "+bonita(st.fecha)+" a las "+st.hora:"Solicitud de presupuesto")+" · "+coche;
  const c=$("#r-conf");c.innerHTML='<b>'+(cita?"¡Cita confirmada!":"¡Solicitud recibida!")+'</b><p>'+esc(resumen)+'</p><p>'+(cita?"Te esperamos en el Polígono Industrial de Antigua. Si no puedes venir, avísanos por WhatsApp.":"Te enviamos el presupuesto por WhatsApp o te llamamos en horario de apertura.")+'</p><a class="btn b-wa" target="_blank" rel="noopener" href="'+wa("Hola Volcano Cars, "+(cita?"tengo cita en el taller el "+bonita(st.fecha)+" a las "+st.hora:"acabo de pedir presupuesto")+" ("+coche+"). ")+'">Escribir por WhatsApp</a>';
  f.hidden=true;c.hidden=false;c.scrollIntoView({block:"center",behavior:"smooth"});
 }catch(x){err((x&&x.message)||"No hemos podido enviarlo. Escríbenos por WhatsApp o llámanos al "+C.tel+".");}
 finally{b.disabled=false;}
});
cargar();})();
</script>`;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const origin = url.origin;
  const path = url.pathname.replace(/\/+$/, "");
  const m1 = path.match(/^\/(coches-segunda-mano|taller-mecanico)-([a-z-]+)$/);
  const m = m1 ? porSlug(m1[2]) : undefined;
  if (!m1 || !m) return new Response("No encontrado", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  if (url.pathname !== path) return Response.redirect(origin + path, 301); // sin barra final
  const html = m1[1] === "taller-mecanico" ? taller(origin, m) : await venta(origin, m);
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", ...SEG, ...CACHE } });
};

export const config: Config = {
  path: [
    "/coches-segunda-mano-corralejo", "/coches-segunda-mano-corralejo/",
    "/coches-segunda-mano-la-oliva", "/coches-segunda-mano-la-oliva/",
    "/coches-segunda-mano-puerto-del-rosario", "/coches-segunda-mano-puerto-del-rosario/",
    "/coches-segunda-mano-antigua", "/coches-segunda-mano-antigua/",
    "/coches-segunda-mano-caleta-de-fuste", "/coches-segunda-mano-caleta-de-fuste/",
    "/coches-segunda-mano-gran-tarajal", "/coches-segunda-mano-gran-tarajal/",
    "/coches-segunda-mano-costa-calma", "/coches-segunda-mano-costa-calma/",
    "/coches-segunda-mano-morro-jable", "/coches-segunda-mano-morro-jable/",
    "/taller-mecanico-corralejo", "/taller-mecanico-corralejo/",
    "/taller-mecanico-la-oliva", "/taller-mecanico-la-oliva/",
    "/taller-mecanico-puerto-del-rosario", "/taller-mecanico-puerto-del-rosario/",
    "/taller-mecanico-antigua", "/taller-mecanico-antigua/",
    "/taller-mecanico-caleta-de-fuste", "/taller-mecanico-caleta-de-fuste/",
    "/taller-mecanico-gran-tarajal", "/taller-mecanico-gran-tarajal/",
    "/taller-mecanico-costa-calma", "/taller-mecanico-costa-calma/",
    "/taller-mecanico-morro-jable", "/taller-mecanico-morro-jable/",
  ],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
