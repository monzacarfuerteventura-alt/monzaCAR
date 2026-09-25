// Piezas comunes de las páginas que genera el servidor (fichas de coches) — mismo diseño que tools/seo.py
import type { Car } from "./shared.mts";

export const EMPRESA = {
  nombre: "Volcano Cars",
  tel: "643 66 88 13",
  telLink: "+34643668813",
  wa: "34643668813",
  email: "volcanocars2026@gmail.com",
  calle: "Calle Valle Largo, Nave 8, Polígono Industrial",
  cp: "35610",
  localidad: "Antigua",
  direccion: "Calle Valle Largo, Nave 8, Polígono Industrial, 35610 Antigua, Las Palmas",
  horario: "Lunes a viernes, de 8:00 a 16:00",
  mapa: "https://maps.app.goo.gl/dz8icDhkUkB4oznd8", // ficha de Volcano Cars en Google Maps
  mapaCid: "https://www.google.com/maps?cid=5551544135827693991",
  lat: 28.420871,
  lng: -13.8621004,
};

export const escH = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
export const eur = (n: number) => {
  const v = Math.round(Number(n || 0) * 100) / 100, e = Math.trunc(v), c = Math.round((v - e) * 100);
  return String(e).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (c ? "," + String(c).padStart(2, "0") : "") + " €";
};
export const kmTxt = (n: number) => String(Math.round(n || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " km";
export const foto = (k: string) => (k.startsWith("/") ? k : "/api/fotos/" + encodeURIComponent(k));
export const wa = (t: string) => `https://wa.me/${EMPRESA.wa}?text=${encodeURIComponent(t)}`;

// Dirección bonita de cada coche: /coche/toyota-c-hr-2020-1a2b3c4d  (la web usa la misma regla)
export function slugDe(c: Pick<Car, "id" | "marca" | "modelo" | "anio">): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(c.id)) return c.id;
  const base = `${c.marca} ${c.modelo} ${c.anio}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return (base ? base + "-" : "") + c.id.slice(0, 8).toLowerCase();
}

export function cabecera(origin: string, titulo: string, descripcion: string, canonical: string, extraHead = "", robots = "index, follow") {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escH(titulo)}</title>
<meta name="description" content="${escH(descripcion)}">
<meta name="robots" content="${robots}">
<meta name="theme-color" content="#121212">
<link rel="canonical" href="${escH(canonical)}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%231B1B1A'/%3E%3Cpath d='M8 54 L22 10 L29 10 L32 16 L35 10 L42 10 L56 54 Z' fill='%23F2EFEA'/%3E%3Cpath d='M26.5 26 L37.5 26 L42.6 45 L21.4 45 Z' fill='%23D9481C'/%3E%3C/svg%3E">
<link rel="apple-touch-icon" href="/icon-192.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=Figtree:wght@400;500;600;700&family=Titillium+Web:wght@600;700&display=swap">
<link rel="stylesheet" href="/paginas.css">
<link rel="stylesheet" href="/tema.css">
<meta property="og:site_name" content="Volcano Cars">
<meta property="og:locale" content="es_ES">
${extraHead}
</head>
<body>
<header class="pg-top"><div class="wrap">
  <a class="pg-logo" href="/" aria-label="Volcano Cars, inicio"><img src="/marca/logo-claro.svg" alt="Volcano Cars" width="163" height="40"></a>
  <nav class="pg-nav" aria-label="Secciones">
    <a href="/coches-segunda-mano-fuerteventura/">Coches</a>
    <a href="/taller-mecanico-fuerteventura/">Taller</a>
    <a href="/chapa-y-pintura-fuerteventura/">Chapa y pintura</a>
    <a href="/financiacion-coches-fuerteventura/">Financiación</a>
    <a class="pg-call" href="tel:${EMPRESA.telLink}">Llamar<span class="n"> ${EMPRESA.tel}</span></a>
  </nav>
</div></header>
<main>`;
}

export function pie(waTxt = "Hola Volcano Cars, tengo una consulta: ") {
  return `</main>
<footer class="pg-foot"><div class="wrap">
  <div><img src="/marca/logo-claro.svg" alt="Volcano Cars" width="180" height="44" loading="lazy"><p>Coches de ocasión revisados con 1 año de garantía, taller mecánico y chapa y pintura en Antigua, Fuerteventura.</p></div>
  <div><h4>Coches</h4><a href="/comprar">Coches disponibles</a><a href="/coches-segunda-mano-fuerteventura/">Segunda mano en Fuerteventura</a><a href="/financiacion-coches-fuerteventura/">Financiación</a></div>
  <div><h4>Taller</h4><a href="/taller-mecanico-fuerteventura/">Taller mecánico</a><a href="/chapa-y-pintura-fuerteventura/">Chapa y pintura</a><a href="/pre-itv-fuerteventura/">Pre-ITV</a><a href="/taller">Pedir cita</a></div>
  <div><h4>Visítanos</h4><a href="${EMPRESA.mapa}" target="_blank" rel="noopener">${escH(EMPRESA.calle)}<br>${EMPRESA.cp} ${EMPRESA.localidad}</a><a href="tel:${EMPRESA.telLink}">${EMPRESA.tel}</a><a href="/contacto">${escH(EMPRESA.horario)}</a></div>
  <div class="pg-legal"><span>© ${new Date().getFullYear()} Volcano Cars</span><a href="/aviso-legal">Aviso legal</a><a href="/condiciones">Condiciones y garantía</a><a href="/privacidad">Privacidad</a><a href="/cookies">Cookies</a><a href="/en/">English</a></div>
</div></footer>
<nav class="pg-barra" aria-label="Contacto rápido"><a class="btn b-wa" href="${escH(wa(waTxt))}" target="_blank" rel="noopener">WhatsApp</a><a class="btn b-ink" href="tel:${EMPRESA.telLink}">Llamar</a></nav>
</body>
</html>`;
}
