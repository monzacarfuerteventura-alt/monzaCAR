# Genera las páginas de servicios para Google (una carpeta por página dentro de public/).
# Cada página tiene su título, descripción, preguntas frecuentes y datos estructurados propios.
# Si cambias de dominio, cambia BASE y vuelve a ejecutar:  python3 tools/seo.py
# Si añades una página aquí, añádela también a PAGINAS en netlify/functions/sitemap.mts
import json, pathlib, html, datetime
from urllib.parse import quote

BASE = "https://volcanocars.com"
OUT = pathlib.Path(__file__).resolve().parent.parent / "public"
TEL, TEL_LINK, WA = "643 56 60 98", "+34643566098", "34643566098"
CALLE, CP, LOC = "Calle Valle Largo, Nave 8, Polígono Industrial", "35610", "Antigua"
DIRECCION = f"{CALLE}, {CP} {LOC}, Las Palmas"
HORARIO = "Lunes a viernes, de 8:00 a 16:00"
MAPA = "https://maps.app.goo.gl/dz8icDhkUkB4oznd8"  # ficha de Volcano Cars en Google Maps
ZONAS = ["Antigua", "Caleta de Fuste", "Puerto del Rosario", "Corralejo", "La Oliva", "El Cotillo", "Lajares", "Villaverde",
         "Tuineje", "Gran Tarajal", "Tarajalejo", "Las Playitas", "Pájara", "Costa Calma", "Morro Jable", "Betancuria", "Tefía", "Tetir"]
e = html.escape
wa = lambda t: f"https://wa.me/{WA}?text={quote(t)}"

NEGOCIO = {"@type": ["AutoDealer", "AutoRepair", "AutoBodyShop"], "@id": BASE + "/#negocio", "name": "Volcano Cars", "legalName": "MAILIN Y YERAY SL", "taxID": "B93975647", "url": BASE + "/",
           "sameAs": ["https://www.google.com/maps?cid=5551544135827693991", "https://www.instagram.com/volcanocars_antigua/", "https://www.facebook.com/share/1KYczmU7be/"],  # añade aquí Facebook, Instagram… cuando existan
           "telephone": "+34643566098", "email": "volcanocars2026@gmail.com", "image": BASE + "/og-volcano-cars.jpg",
           "logo": BASE + "/marca/logo-oscuro.svg", "priceRange": "€€",
           "address": {"@type": "PostalAddress", "streetAddress": CALLE, "postalCode": CP, "addressLocality": LOC, "addressRegion": "Las Palmas", "addressCountry": "ES"},
           "hasMap": "https://www.google.com/maps?cid=5551544135827693991", "geo": {"@type": "GeoCoordinates", "latitude": 28.420871, "longitude": -13.8621004},
           "areaServed": {"@type": "Island", "name": "Fuerteventura"}, "availableLanguage": ["es", "en"],
           "openingHoursSpecification": [{"@type": "OpeningHoursSpecification", "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "opens": "08:00", "closes": "16:00"}]}

def cabecera(p):
    ldj = json.dumps(ld(p), ensure_ascii=False).replace("</", "<\\/")
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{e(p['title'])}</title>
<meta name="description" content="{e(p['desc'])}">
<meta name="robots" content="{p.get('robots', 'index, follow, max-image-preview:large')}">
<meta name="theme-color" content="#121212">
<link rel="canonical" href="{BASE}{p['url']}">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="manifest" href="/site.webmanifest">
<link rel="preload" as="style" href="/fonts/fuentes.css">
<link rel="stylesheet" href="/fonts/fuentes.css" media="print" onload="this.media='all'">
<link rel="stylesheet" href="/paginas.css">
<link rel="stylesheet" href="/tema.css">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Volcano Cars">
<meta property="og:locale" content="es_ES">
<meta property="og:title" content="{e(p['og'])}">
<meta property="og:description" content="{e(p['desc'])}">
<meta property="og:url" content="{BASE}{p['url']}">
<meta property="og:image" content="{BASE}/og-volcano-cars.jpg">
<script type="application/ld+json">{ldj}</script>
<script src="/medicion.js" defer></script>
</head>
<body>
<header class="pg-top"><div class="wrap">
  <a class="pg-logo" href="/" aria-label="Volcano Cars, inicio"><img src="/marca/logo-claro.svg" alt="Volcano Cars" width="163" height="40"></a>
  <nav class="pg-nav" aria-label="Secciones">
    <a href="/coches-segunda-mano-fuerteventura/">Coches</a>
    <a href="/taller-mecanico-fuerteventura/">Taller</a>
    <a href="/chapa-y-pintura-fuerteventura/">Chapa y pintura</a>
    <a href="/financiacion-coches-fuerteventura/">Financiación</a>
    <a class="pg-call" href="tel:{TEL_LINK}">Llamar<span class="n"> {TEL}</span></a>
  </nav>
</div></header>
<main>
<div class="wrap">
  <nav class="migas" aria-label="Estás en"><ol><li><a href="/">Inicio</a></li><li aria-current="page">{e(p['miga'])}</li></ol></nav>
  <section class="pg-hero">
    <span class="eyebrow">{e(p['eyebrow'])}</span>
    <h1>{p['h1']}</h1>
    <p class="lead">{p['lead']}</p>
    <div class="ctas">{p['ctas']}</div>
    <ul class="sello">{''.join(f'<li>{e(x)}</li>' for x in p['sellos'])}</ul>
  </section>
"""

# Páginas locales por pueblo (las genera netlify/functions/local.mts; datos en netlify/lib/municipios.mts)
LOCALES = [("corralejo", "Corralejo"), ("la-oliva", "La Oliva"), ("puerto-del-rosario", "Puerto del Rosario"), ("antigua", "Antigua"),
           ("caleta-de-fuste", "Caleta de Fuste"), ("gran-tarajal", "Gran Tarajal"), ("costa-calma", "Costa Calma"), ("morro-jable", "Morro Jable")]
LOCAL_SLUG = {n: k for k, n in LOCALES}
IDX_TALLER = ["antigua", "puerto-del-rosario", "caleta-de-fuste", "corralejo", "gran-tarajal"]  # = indexar en netlify/lib/municipios.mts
IDX_VENTA = ["puerto-del-rosario", "caleta-de-fuste", "corralejo", "gran-tarajal"]
VENTA_URL = lambda p: p['url'].startswith(("/coches", "/financiacion"))

def pie(p):
    return f"""
  <section class="sec"><h2>Preguntas frecuentes</h2><div class="faq">{''.join(f'<details><summary>{e(q)}</summary><p>{a}</p></details>' for q, a in p['faq'])}</div></section>
  <section class="sec"><div class="banda"><div><h2>{p['banda'][0]}</h2><p>{e(DIRECCION)}. {HORARIO}, en horario continuado.</p></div>
    <div class="ctas">{p['banda'][1]}</div></div></section>
  {'' if p.get('sin_zonas') else f'''<section class="sec"><h2>{'Coches de segunda mano por zonas' if VENTA_URL(p) else 'Taller para clientes de toda la isla'}</h2><div class="chips">{''.join(f'<a href="/{"coches-segunda-mano" if VENTA_URL(p) else "taller-mecanico"}-{k}">{e(n)}</a>' for k, n in LOCALES if k in (IDX_VENTA if VENTA_URL(p) else IDX_TALLER))}</div></section>'''}
  <section class="sec"><h2>También te puede interesar</h2><div class="chips">{''.join(f'<a href="{u}">{e(t)}</a>' for u, t in RELACION if u != p['url'])}</div></section>
</div>
</main>
<footer class="pg-foot"><div class="wrap">
  <div><img src="/marca/logo-claro.svg" alt="Volcano Cars" width="180" height="44" loading="lazy"><p>Coches de ocasión revisados con 12 meses de garantía legal, taller mecánico y chapa y pintura en Antigua, Fuerteventura.</p></div>
  <div><h4>Coches</h4><a href="/comprar">Coches disponibles</a><a href="/coches-segunda-mano-fuerteventura/">Segunda mano en Fuerteventura</a><a href="/financiacion-coches-fuerteventura/">Financiación</a><a href="/coches-vendidos">Coches vendidos y entregas</a></div>
  <div><h4>Taller</h4><a href="/taller-mecanico-fuerteventura/">Taller mecánico</a><a href="/chapa-y-pintura-fuerteventura/">Chapa y pintura</a><a href="/pre-itv-fuerteventura/">Pre-ITV</a><a href="/taller">Pedir cita</a></div>
  <div><h4>Visítanos</h4><a href="{MAPA}" target="_blank" rel="noopener">{e(CALLE)}<br>{CP} {LOC}</a><a href="tel:{TEL_LINK}">{TEL}</a><a href="/contacto">{HORARIO}</a></div>
  <div class="pg-legal"><span>© {datetime.date.today().year} Volcano Cars</span><a href="/aviso-legal">Aviso legal</a><a href="/condiciones">Condiciones y garantía</a><a href="/privacidad">Privacidad</a><a href="/cookies">Cookies</a><a href="/cookies" data-ck-open>Configurar cookies</a><a href="https://www.instagram.com/volcanocars_antigua/" target="_blank" rel="noopener me">Instagram</a><a href="https://www.facebook.com/share/1KYczmU7be/" target="_blank" rel="noopener me">Facebook</a><a href="/en/">English</a></div>
</div></footer>
<nav class="pg-barra" aria-label="Contacto rápido"><a class="btn b-wa" href="{e(wa(p['wa']))}" target="_blank" rel="noopener">WhatsApp</a><a class="btn b-ink" href="tel:{TEL_LINK}">Llamar</a></nav>
{p.get('script', '')}
</body>
</html>
"""

def txt(s):  # quita etiquetas para los datos estructurados
    import re
    return re.sub(r"<[^>]+>", "", s)

def ld(p):
    g = [dict(NEGOCIO),
         {"@type": "WebPage", "@id": BASE + p['url'], "url": BASE + p['url'], "name": p['title'], "description": p['desc'], "inLanguage": "es", "about": {"@id": BASE + "/#negocio"}},
         {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Inicio", "item": BASE + "/"}, {"@type": "ListItem", "position": 2, "name": p['miga'], "item": BASE + p['url']}]},
         {"@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": txt(a)}} for q, a in p['faq']]}]
    if p.get('servicio'):
        g.append({"@type": "Service", "name": p['servicio'], "serviceType": p['servicio'], "provider": {"@id": BASE + "/#negocio"}, "areaServed": {"@type": "Island", "name": "Fuerteventura"},
                  "hasOfferCatalog": {"@type": "OfferCatalog", "name": p['servicio'], "itemListElement": [{"@type": "Offer", "itemOffered": {"@type": "Service", "name": n}} for n in p.get('lista', [])]}})
    return {"@context": "https://schema.org", "@graph": g}

def tarjetas(items):
    return '<div class="grid3">' + ''.join(f'<div class="card"><div class="ic">{e(i)}</div><h3>{e(t)}</h3><p>{d}</p></div>' for i, t, d in items) + '</div>'

def pasos(items):
    return '<ol class="pasos">' + ''.join(f'<li><div><b>{e(t)}</b><span>{d}</span></div></li>' for t, d in items) + '</ol>'

B_CITA = '<a class="btn b-rosso" href="/taller">Reservar cita online</a>'
B_TEL = f'<a class="btn b-ghost" href="tel:{TEL_LINK}">Llamar {TEL}</a>'
def B_WA(t, label="WhatsApp"): return f'<a class="btn b-wa" href="{e(wa(t))}" target="_blank" rel="noopener">{label}</a>'
B_COCHES = '<a class="btn b-rosso" href="/comprar">Ver coches disponibles</a>'

RELACION = [("/coches-segunda-mano-fuerteventura/", "Coches de segunda mano"), ("/financiacion-coches-fuerteventura/", "Financiación"),
            ("/taller-mecanico-fuerteventura/", "Taller mecánico"), ("/chapa-y-pintura-fuerteventura/", "Chapa y pintura"),
            ("/pre-itv-fuerteventura/", "Pre-ITV"), ("/itv-fuerteventura/", "Guía de la ITV"), ("/contacto", "Cómo llegar")]

COMPROMISO = [
    ("€", "Presupuesto por escrito", "Antes de tocar nada te damos el presupuesto por escrito, válido 12 días hábiles. Sin tu autorización no hacemos ningún trabajo."),
    ("VER", "Sigue tu reparación en el móvil", "Te mandamos un enlace privado para ver en qué punto está tu coche y las fotos del trabajo, sin tener que llamar."),
    ("10 %", "Tu coche a tiempo", "Te damos la fecha de entrega por escrito. Si no está listo ese día, te descontamos el 10 % de la mano de obra por cada día laborable de retraso, hasta el 50 %."),
]

PAGINAS = []

# ---------------------------------------------------------------- coches de segunda mano
PAGINAS.append(dict(
    url="/coches-segunda-mano-fuerteventura/", miga="Coches de segunda mano",
    title="Coches de segunda mano en Fuerteventura con 12 meses de garantía legal · Volcano Cars",
    og="Coches de segunda mano en Fuerteventura · Volcano Cars",
    desc="Coches de segunda mano en Fuerteventura revisados en nuestro taller de Antigua, con 12 meses de garantía legal, financiación y entrega a domicilio gratis en toda la isla.",
    eyebrow="Coches de ocasión en Fuerteventura",
    h1='Coches de segunda mano en Fuerteventura <span class="r">con 12 meses de garantía legal</span>',
    lead="Cada coche que vendemos pasa antes por nuestro taller de Antigua. Precio final con impuestos, garantía de 12 meses, cambio de nombre incluido y te lo llevamos gratis a casa, de Corralejo a Morro Jable.",
    ctas=B_COCHES + B_WA("Hola Volcano Cars, busco un coche: ", "Dinos qué buscas") + B_TEL,
    sellos=["12 meses de garantía legal", "Revisados en nuestro taller", "Entrega gratis en la isla", "Financiación a tu medida"],
    wa="Hola Volcano Cars, busco un coche: ",
    body=lambda: f"""
  <!--STOCK-->
  <section class="sec"><h2>Por qué comprar tu coche aquí</h2>
    {tarjetas([("1", "Revisado por mecánicos", "No somos un escaparate: tenemos taller propio. Revisamos cada coche y te contamos qué se le ha hecho."),
               ("12", "12 meses de garantía legal", "Garantía legal de 12 meses desde la entrega, con el taller a tu disposición en Antigua si notas cualquier fallo."),
               ("0 €", "Entrega a domicilio gratis", "Una vez firmada la compra, te lo llevamos sin coste a cualquier punto de Fuerteventura, el día que elijas."),
               ("€", "Precio final, sin sorpresas", "El precio publicado incluye impuestos. El cambio de nombre en Tráfico corre de nuestra cuenta."),
               ("%", "Financiación", "Calcula tu cuota en la ficha de cada coche y pide un pre-estudio gratis, sin compromiso."),
               ("360", "Míralo antes de venir", "Fotos reales y, en muchos coches, vídeo 360°. Reserva día y hora para verlo y probarlo.")])}
  </section>
  <section class="sec"><h2>Busca tu coche</h2>
    <p>Entra directamente en los coches que buscas. Los filtros se pueden combinar en la web (precio, año, kilómetros, combustible, cambio y etiqueta DGT).</p>
    <div class="chips">
      <a href="/comprar?orden=barato">Del más barato al más caro</a>
      <a href="/comprar?pmax=2500">Hasta 2.500 €</a>
      <a href="/comprar?pmax=3500">Hasta 3.500 €</a>
      <a href="/comprar?pmax=4500">Hasta 4.500 €</a>
      <a href="/comprar?pmax=5500">Hasta 5.500 €</a>
      <a href="/comprar?pmax=6500">Hasta 6.500 €</a>
      <a href="/comprar?pmax=8000">Hasta 8.000 €</a>
      <a href="/comprar?cambio=Autom%C3%A1tico">Automáticos</a>
      <a href="/comprar?comb=Di%C3%A9sel">Diésel</a>
      <a href="/comprar?comb=Gasolina">Gasolina</a>
      <a href="/comprar?etq=ECO,0">Híbridos y eléctricos (ECO y 0)</a>
      <a href="/comprar?kmax=100000">Menos de 100.000 km</a>
      <a href="/comprar?orden=nuevo">Los más nuevos</a>
    </div>
  </section>
  <section class="sec"><h2>Cómo es la compra</h2>
    {pasos([("Elige en la web", "Mira fotos, datos y precio final. Si quieres, calcula la cuota de financiación."),
            ("Reserva día y hora", "Elige cuándo venir a verlo y probarlo. Te lo tenemos preparado, sin compromiso."),
            ("Firma en Antigua", "La compraventa se firma en nuestras instalaciones, con contrato por escrito y toda la documentación."),
            ("Te lo llevamos gratis", "Lo recoges en el taller o te lo llevamos a casa en cualquier punto de la isla.")])}
  </section>
  <section class="sec"><h2>Entrega gratis en toda la isla</h2><p>Llevamos tu coche sin coste a cualquier municipio de Fuerteventura, por ejemplo:</p>
    <ul class="zonas">{''.join(f'<li><a href="/coches-segunda-mano-{LOCAL_SLUG[z]}">{z}</a></li>' if LOCAL_SLUG.get(z) in IDX_VENTA else f'<li>{z}</li>' for z in ZONAS)}</ul></section>""",
    faq=[("¿Los coches tienen garantía?", "Sí. Los coches que vendemos a particulares tienen 12 meses de garantía legal desde la entrega. Cubre los defectos que el coche ya tuviera al entregártelo; no cubre el desgaste normal por uso (pastillas, neumáticos, embrague, batería…). <a href='/condiciones'>Ver condiciones</a>."),
         ("¿Puedo probar el coche antes de comprarlo?", "Claro. En la ficha de cada coche puedes elegir día y hora para venir a verlo y probarlo en Antigua. La visita no te obliga a nada."),
         ("¿Me lo lleváis a casa?", "Sí, una vez firmada la compra te lo llevamos gratis a cualquier punto de Fuerteventura, el día y a la hora que acordemos. También puedes recogerlo en el taller."),
         ("¿Se puede financiar?", "Sí. En cada coche tienes una calculadora con la cuota, la TAE y el ejemplo completo, y puedes pedir un pre-estudio sin compromiso. La financiación está sujeta a la aprobación de la entidad financiera. <a href='/financiacion-coches-fuerteventura/'>Cómo funciona</a>."),
         ("¿Qué documentación me dais?", "Permiso de circulación, ficha técnica con la ITV en vigor, las llaves y el historial que tengamos. Nos encargamos del cambio de titularidad en Tráfico."),
         ("¿Compráis coches usados?", "Ahora mismo no compramos coches: solo vendemos coches revisados en nuestro taller."),
         ("¿Atendéis en inglés?", "Sí, atendemos en español y en inglés. Toda la web está también en inglés: <a href='/en/'>English version</a>.")],
    banda=("Ven a verlos a Antigua", B_COCHES + B_WA("Hola Volcano Cars, quiero ver un coche: ")),
))

# ---------------------------------------------------------------- taller mecánico
LISTA_MEC = ["Cambio de aceite y filtros", "Frenos: pastillas y discos", "Neumáticos: cambio y alineado", "Diagnosis electrónica", "Pre-ITV", "Aire acondicionado", "Correa de distribución", "Batería y arranque"]
PAGINAS.append(dict(
    url="/taller-mecanico-fuerteventura/", miga="Taller mecánico", servicio="Taller mecánico", lista=LISTA_MEC,
    title="Taller mecánico en Antigua, Fuerteventura · Cita online · Volcano Cars",
    og="Taller mecánico en Antigua, Fuerteventura · Volcano Cars",
    desc="Taller mecánico en Antigua (Fuerteventura) para todas las marcas: aceite, frenos, diagnosis, distribución, aire acondicionado y pre-ITV. Presupuesto por escrito y cita online al momento.",
    eyebrow="Taller mecánico en Antigua",
    h1='Taller mecánico en Fuerteventura, <span class="r">con cita al momento</span>',
    lead="Mecánica rápida para todas las marcas en el polígono de Antigua, en el centro de la isla. Eliges el servicio, el día y la hora en la web y tu cita queda confirmada al momento. Presupuesto por escrito antes de empezar.",
    ctas=B_CITA + B_WA("Hola Volcano Cars, quiero pedir cita en el taller: ") + B_TEL,
    sellos=["Todas las marcas", "Presupuesto por escrito", "Seguimiento desde el móvil", "Atendemos en inglés"],
    wa="Hola Volcano Cars, quiero pedir cita en el taller: ",
    body=lambda: f"""
  <section class="sec"><h2>Qué hacemos</h2>
    {tarjetas([("01", "Aceite y filtros", "Mantenimiento con el aceite que pide tu coche y cambio de filtros."),
               ("02", "Frenos", "Pastillas, discos y revisión del sistema de frenado."),
               ("03", "Neumáticos", "Cambio de neumáticos y alineado."),
               ("04", "Diagnosis electrónica", "Leemos las averías y los testigos del cuadro para saber qué le pasa al coche."),
               ("05", "Correa de distribución", "Cambio del kit completo de distribución."),
               ("06", "Aire acondicionado", "Carga y revisión, imprescindible con el calor de la isla."),
               ("07", "Batería y arranque", "Prueba de la batería y del sistema de arranque, y sustitución si hace falta."),
               ("08", "Pre-ITV", "Revisamos el coche y lo dejamos listo para pasar la ITV. <a href='/pre-itv-fuerteventura/'>Más información</a>."),
               ("09", "Chapa y pintura", "Golpes, abolladuras, arañazos y pintura. <a href='/chapa-y-pintura-fuerteventura/'>Ver chapa y pintura</a>.")])}
  </section>
  <section class="sec"><h2>Nuestro compromiso contigo</h2>{tarjetas(COMPROMISO)}</section>
  <section class="sec"><h2>Así funciona</h2>
    {pasos([("Reserva online", "Marca uno o varios servicios, elige día y hora y la cita queda confirmada al momento."),
            ("Presupuesto por escrito", "Revisamos el coche y te damos el presupuesto y la fecha de entrega antes de empezar."),
            ("Síguelo desde el móvil", "Te mandamos por WhatsApp un enlace privado para ver el estado del coche, las fotos y aprobar el presupuesto."),
            ("Recógelo a tiempo", "Si no está listo el día acordado, te descontamos parte de la mano de obra.")])}
  </section>""",
    faq=[("¿Trabajáis con todas las marcas?", "Sí, trabajamos con coches de todas las marcas y modelos."),
         ("¿Cuánto cuesta una reparación?", "Depende del coche y de lo que necesite, por eso te damos siempre un presupuesto por escrito antes de hacer nada. Es gratis y es válido 12 días hábiles."),
         ("¿Y si el coche no está listo el día acordado?", "Te descontamos en la factura el 10 % de la mano de obra por cada día laborable de retraso, hasta el 50 %. Las excepciones (por ejemplo, una pieza que no llega a tiempo y te avisamos) están en las <a href='/condiciones'>condiciones</a>."),
         ("¿Puedo ver cómo va mi coche?", "Sí. Cuando dejas el coche te enviamos por WhatsApp un enlace privado donde ves el estado, las fotos y el presupuesto en tiempo real, y puedes aprobarlo desde el móvil."),
         ("¿Cuál es el horario del taller?", f"{HORARIO}, en horario continuado. Sábados y domingos, cerrado."),
         ("¿Habláis inglés?", "Sí, atendemos en español y en inglés.")],
    banda=("Reserva tu cita en un minuto", B_CITA + B_WA("Hola Volcano Cars, quiero pedir cita en el taller: ")),
))

# ---------------------------------------------------------------- chapa y pintura
LISTA_CHAPA = ["Golpes y abolladuras", "Pintura parcial o completa", "Arañazos y rozaduras", "Pulido y retoque"]
PAGINAS.append(dict(
    url="/chapa-y-pintura-fuerteventura/", miga="Chapa y pintura", servicio="Chapa y pintura", lista=LISTA_CHAPA,
    title="Chapa y pintura en Fuerteventura (Antigua) · Presupuesto por escrito · Volcano Cars",
    og="Chapa y pintura en Fuerteventura · Volcano Cars",
    desc="Taller de chapa y pintura en Antigua, Fuerteventura: golpes, abolladuras, arañazos y pintura parcial o completa. Presupuesto por escrito, fecha de entrega por escrito y cita online.",
    eyebrow="Carrocería en Antigua",
    h1='Chapa y pintura en Fuerteventura, <span class="r">como el primer día</span>',
    lead="Reparamos golpes, abolladuras y arañazos y pintamos piezas sueltas o el coche entero. Mándanos fotos por WhatsApp para una primera orientación y te damos el presupuesto por escrito al ver el coche.",
    ctas=B_WA("Hola Volcano Cars, os mando fotos de un golpe para presupuesto: ", "Mandar fotos por WhatsApp") + B_CITA + B_TEL,
    sellos=["Presupuesto por escrito", "Fecha de entrega por escrito", "Seguimiento desde el móvil", "Todas las marcas"],
    wa="Hola Volcano Cars, os mando fotos de un golpe para presupuesto: ",
    body=lambda: f"""
  <section class="sec"><h2>Qué reparamos</h2>
    {tarjetas([("01", "Golpes y abolladuras", "Reparación de chapa de puertas, aletas, capó, paragolpes y portón."),
               ("02", "Pintura", "Pintura parcial de una pieza o completa del coche."),
               ("03", "Arañazos y rozaduras", "Pulido y retoque de arañazos, rozaduras de parking y marcas.")])}
  </section>
  <section class="sec"><h2>Nuestro compromiso contigo</h2>{tarjetas(COMPROMISO)}</section>
  <section class="sec"><h2>Cómo pedir presupuesto</h2>
    {pasos([("Mándanos fotos", "Por WhatsApp, del daño de cerca y del coche entero. Te damos una primera orientación."),
            ("Trae el coche", "Reserva día y hora en la web. Lo vemos y te damos el presupuesto por escrito y la fecha de entrega."),
            ("Sigue la reparación", "Te enviamos un enlace privado para ver el estado y las fotos del trabajo desde el móvil."),
            ("Recógelo", "Con la factura desglosada y todo lo que hemos hecho explicado.")])}
  </section>""",
    faq=[("¿Me podéis dar presupuesto por fotos?", "Con fotos te damos una primera orientación por WhatsApp. El presupuesto por escrito, que es el que vale, lo hacemos viendo el coche en el taller."),
         ("¿Cuánto tardáis?", "Depende del daño. Te damos la fecha de entrega por escrito antes de empezar y, si no cumplimos, te descontamos el 10 % de la mano de obra por cada día laborable de retraso, hasta el 50 %."),
         ("¿Trabajáis con todas las marcas?", "Sí, con coches de todas las marcas y modelos."),
         ("¿Dónde estáis?", f"En {e(DIRECCION)}, en el centro de la isla. {HORARIO}.")],
    banda=("Mándanos fotos del golpe", B_WA("Hola Volcano Cars, os mando fotos de un golpe para presupuesto: ", "Enviar fotos") + B_CITA),
))

# ---------------------------------------------------------------- pre-ITV
PAGINAS.append(dict(
    url="/pre-itv-fuerteventura/", miga="Pre-ITV", servicio="Pre-ITV", lista=["Revisión pre-ITV", "Reparación de defectos antes de la ITV"],
    title="Pre-ITV en Fuerteventura: deja tu coche listo para la ITV · Volcano Cars",
    og="Pre-ITV en Fuerteventura · Volcano Cars",
    desc="Revisión pre-ITV en Antigua, Fuerteventura: revisamos tu coche antes de la inspección y reparamos lo necesario con presupuesto por escrito. Cita online al momento.",
    eyebrow="Pre-ITV en Antigua",
    h1='Pre-ITV: llega a la ITV <span class="r">con todo revisado</span>',
    lead="Antes de ir a la estación de ITV, revisamos tu coche en nuestro taller de Antigua. Si algo no está bien, te damos presupuesto por escrito para dejarlo listo y te evitas la segunda visita.",
    ctas=B_CITA + B_WA("Hola Volcano Cars, quiero hacer la pre-ITV: ") + B_TEL,
    sellos=["Cita online al momento", "Presupuesto por escrito", "Todas las marcas"],
    wa="Hola Volcano Cars, quiero hacer la pre-ITV: ",
    body=lambda: f"""
  <section class="sec"><h2>Qué revisamos</h2>
    {tarjetas([("01", "Luces y señalización", "Faros, intermitentes, luces de freno y de matrícula."),
               ("02", "Frenos", "Estado de pastillas y discos y funcionamiento del freno de mano."),
               ("03", "Neumáticos", "Dibujo, desgaste y estado general."),
               ("04", "Dirección y suspensión", "Holguras, rótulas, amortiguadores y silentblocks."),
               ("05", "Testigos y averías", "Diagnosis electrónica de los testigos encendidos en el cuadro."),
               ("06", "Todo lo visible", "Limpiaparabrisas, cinturones, retrovisores, fugas y matrícula.")])}
  </section>
  <section class="sec"><h2>Cómo funciona</h2>
    {pasos([("Reserva la pre-ITV", "Elige día y hora en la web. La cita queda confirmada al momento."),
            ("Revisión", "Revisamos el coche y te decimos qué está bien y qué fallaría en la ITV."),
            ("Presupuesto", "Si hay que arreglar algo, te damos presupuesto por escrito y no tocamos nada sin tu permiso."),
            ("A la ITV", "Con el coche listo, pides cita en la estación de ITV y la pasas tranquilo.")])}
  </section>""",
    faq=[("¿Pasáis vosotros la ITV?", "No: la ITV la hace la estación oficial. Nosotros revisamos el coche antes y reparamos lo necesario para que la pase."),
         ("¿Cuánto cuesta la pre-ITV?", "Pídenos precio por WhatsApp o por teléfono. Si luego hay que reparar algo, te damos presupuesto por escrito antes de hacerlo."),
         ("¿Y si me han dado la ITV desfavorable?", "Tráenos el informe de la inspección: reparamos los defectos con presupuesto por escrito para que puedas volver a pasarla.")],
    banda=("Reserva tu pre-ITV", B_CITA + B_WA("Hola Volcano Cars, quiero hacer la pre-ITV: ")),
))

# ---------------------------------------------------------------- financiación
PAGINAS.append(dict(
    url="/financiacion-coches-fuerteventura/", miga="Financiación",
    title="Financiación de coches de segunda mano en Fuerteventura · Volcano Cars",
    og="Financia tu coche en Fuerteventura · Volcano Cars",
    desc="Financia tu coche de segunda mano en Volcano Cars (Antigua, Fuerteventura): calcula la cuota de cada coche, pide un pre-estudio gratis y sin compromiso y te llamamos con la respuesta.",
    eyebrow="Financiación",
    h1='Financia tu coche <span class="r">a tu medida</span>',
    lead='Elige entrada y plazo en la ficha de cada coche y verás al momento la cuota, la TAE y el precio total. Si te encaja, pide un pre-estudio gratis: lo tramitamos con la entidad financiera y te llamamos con la respuesta.',
    ctas=B_COCHES + B_WA("Hola Volcano Cars, quiero información sobre financiación: ") + B_TEL,
    sellos=["Pre-estudio gratis", "Con o sin entrada", "Plazos de hasta <span data-fin-max>varios años</span>", "Sin firmar nada hasta que decidas"],
    wa="Hola Volcano Cars, quiero información sobre financiación: ",
    body=lambda: f"""
  <section class="sec"><h2>Cómo funciona</h2>
    {pasos([("Calcula tu cuota", "En la ficha de cada coche, mueve la entrada y elige el plazo. Verás la cuota, el TIN, la TAE y el importe total."),
            ("Pide el pre-estudio", "Con tu situación laboral y tus ingresos aproximados. No pedimos DNI ni nóminas por la web."),
            ("Te llamamos", "Estudiamos la operación con la entidad financiera y te llamamos con la respuesta y los documentos que hacen falta."),
            ("Firmas y te lo llevas", "Firmas en Antigua y te llevamos el coche gratis a cualquier punto de Fuerteventura.")])}
  </section>
  <section class="sec"><h2>Documentos que suelen pedir</h2>
    {tarjetas([("ID", "DNI o NIE", "Por las dos caras y en vigor."),
               ("€", "Ingresos", "Las dos últimas nóminas o, si eres autónomo, la última declaración de la renta."),
               ("IBAN", "Cuenta bancaria", "Un certificado de titularidad de la cuenta donde se cargarán las cuotas.")])}
    <p style="margin-top:16px;color:var(--muted)">La entidad financiera puede pedir otros documentos según tu caso. Te lo diremos antes de empezar.</p>
  </section>""",
    faq=[("¿El pre-estudio me compromete a algo?", "No. Es gratis y no firmas nada. Solo si la financiación te encaja seguimos adelante."),
         ("¿Puedo financiar sin entrada?", "Puedes calcular la cuota sin entrada o con la que quieras. La aprobación final y las condiciones dependen de la entidad financiera."),
         ("¿Se pueden financiar todos los coches?", "Las financieras limitan la antigüedad del coche y el importe mínimo. En la ficha de cada coche te decimos si se puede financiar y, si no, te contamos otras formas de pago."),
         ("¿Puedo financiar si soy autónomo o pensionista?", "Sí, lo estudiamos. En el pre-estudio indicas tu situación y te decimos qué documentos hacen falta."),
         ("¿Quién concede el préstamo?", "La entidad financiera con la que trabajamos. Volcano Cars no concede préstamos: te ayudamos a tramitar la solicitud y a elegir la mejor opción.")],
    banda=("Elige coche y calcula tu cuota", B_COCHES + B_WA("Hola Volcano Cars, quiero información sobre financiación: ")),
    script="""<script>fetch("/api/financiacion").then(r=>r.ok?r.json():null).then(f=>{ if(!f||!f.activa||!f.plazos||!f.plazos.length) return; const m=Math.max(...f.plazos); document.querySelectorAll("[data-fin-max]").forEach(e=>e.textContent=m+" meses"); }).catch(()=>{});</script>""",
))

# ---------------------------------------------------------------- contacto y cómo llegar (página propia, antes era una copia de la portada)
RUTAS_LLEGAR = [  # distancias y tiempos APROXIMADOS por carretera hasta la nave (los mismos que netlify/lib/municipios.mts)
    ("Antigua (pueblo)", 3, 5), ("Caleta de Fuste", 12, 15), ("Puerto del Rosario", 20, 20), ("Gran Tarajal", 30, 30),
    ("La Oliva", 42, 35), ("Corralejo", 55, 45), ("Costa Calma", 60, 45), ("Morro Jable", 80, 65)]
PAGINAS.append(dict(
    url="/contacto", miga="Contacto y cómo llegar", sin_zonas=True,
    title="Contacto y cómo llegar · Volcano Cars, Polígono Industrial de Antigua (Fuerteventura)",
    og="Volcano Cars · Contacto y cómo llegar",
    desc="Teléfono, WhatsApp, email, horario y cómo llegar a Volcano Cars: Calle Valle Largo, Nave 8, Polígono Industrial de Antigua, Fuerteventura. Lunes a viernes de 8:00 a 16:00.",
    eyebrow="Contacto",
    h1='Volcano Cars, <span class="r">en el Polígono de Antigua</span>',
    lead=f"Taller mecánico, chapa y pintura y venta de coches de ocasión en {e(DIRECCION)}. {HORARIO}, en horario continuado. Te atendemos en español y en inglés.",
    ctas=B_TEL + B_WA("Hola Volcano Cars, ") + f'<a class="btn b-ghost" href="{MAPA}" target="_blank" rel="noopener">Abrir en Google Maps</a>',
    sellos=["Cita online al momento", "WhatsApp", "Atendemos en inglés"],
    wa="Hola Volcano Cars, ",
    body=lambda: f"""
  <section class="sec"><h2>Datos de contacto</h2>
    {tarjetas([("☎", "Teléfono", f'<a href="tel:{TEL_LINK}">{TEL}</a><br>{HORARIO}'),
               ("WA", "WhatsApp", f'<a href="{e(wa("Hola Volcano Cars, "))}" target="_blank" rel="noopener">Escríbenos por WhatsApp</a><br>Te respondemos en horario de taller.'),
               ("@", "Email", '<a href="mailto:volcanocars2026@gmail.com">volcanocars2026@gmail.com</a>'),
               ("⌖", "Dirección", f'<a href="{MAPA}" target="_blank" rel="noopener">{e(CALLE)}<br>{CP} {LOC}, Fuerteventura (Las Palmas)</a>'),
               ("⏱", "Horario", f"{HORARIO}, sin cerrar a mediodía. Sábados, domingos y festivos, cerrado."),
               ("ES·EN", "Idiomas", "Atendemos en español y en inglés.")])}
  </section>
  <section class="sec"><h2>Cómo llegar desde cada zona</h2>
    <p>Estamos en la <b>Calle Valle Largo, Nave 8</b>, dentro del Polígono Industrial de Antigua. Tiempos aproximados en coche hasta la nave:</p>
    <div class="tabla-wrap"><table class="tabla"><thead><tr><th>Desde</th><th>Distancia</th><th>Tiempo</th></tr></thead><tbody>
    {''.join(f'<tr><td>{e(n)}</td><td>≈ {km} km</td><td>≈ {mi} min</td></tr>' for n, km, mi in RUTAS_LLEGAR)}
    </tbody></table></div>
    <p style="margin-top:12px"><a class="btn b-rosso" href="{MAPA}" target="_blank" rel="noopener">Cómo llegar con Google Maps</a></p>
    <p style="color:var(--muted)">¿Te pilla lejos? Si compras un coche, te lo llevamos gratis a cualquier punto de la isla. Para el taller, te damos cita a una hora fija y el presupuesto antes de empezar, para que no hagas el viaje en balde.</p>
  </section>
  <section class="sec"><h2>¿Qué necesitas?</h2>
    {tarjetas([("01", "Taller mecánico", 'Aceite, frenos, diagnosis, distribución, aire acondicionado. <a href="/taller-mecanico-fuerteventura/">Ver taller</a>'),
               ("02", "Chapa y pintura", 'Golpes, arañazos y pintura con presupuesto por escrito. <a href="/chapa-y-pintura-fuerteventura/">Ver chapa y pintura</a>'),
               ("03", "Coches de ocasión", 'Revisados en nuestro taller, con 12 meses de garantía legal. <a href="/coches-segunda-mano-fuerteventura/">Ver coches</a>')])}
  </section>""",
    faq=[("¿Hace falta cita para el taller?", "Es lo mejor: reservas la hora en la web y la cita queda confirmada al momento. Si vienes sin cita te atendemos en cuanto podamos."),
         ("¿Abrís los sábados?", f"No. Abrimos {HORARIO.lower()}, en horario continuado."),
         ("¿Se puede aparcar?", "Estamos en una nave del polígono industrial: al llegar, llámanos o escríbenos por WhatsApp y te indicamos dónde dejar el coche."),
         ("¿Habláis inglés?", "Sí, te atendemos en español y en inglés. <a href='/en/'>English version</a>.")],
    banda=("Te esperamos en Antigua", B_CITA + B_WA("Hola Volcano Cars, ")),
))

# ---------------------------------------------------------------- guía de la ITV en Fuerteventura (contenido útil que busca mucha gente de la isla)
PAGINAS.append(dict(
    url="/itv-fuerteventura/", miga="Guía de la ITV", servicio="Pre-ITV", lista=["Revisión pre-ITV", "Reparación de defectos de la ITV"],
    title="ITV en Fuerteventura: cada cuánto se pasa, qué revisan y cómo aprobar a la primera · Volcano Cars",
    og="Guía de la ITV en Fuerteventura · Volcano Cars",
    desc="Todo sobre la ITV en Fuerteventura: cada cuánto hay que pasarla, qué miran, los fallos más habituales, qué pasa si sale desfavorable y cómo prepararla para aprobar a la primera.",
    eyebrow="Guía práctica",
    h1='La ITV en Fuerteventura, <span class="r">sin sorpresas</span>',
    lead="Cada cuánto toca, qué revisan en la estación, los defectos que más suspenden en la isla y qué hacer si te la dan desfavorable. Explicado por mecánicos, sin letra pequeña.",
    ctas='<a class="btn b-rosso" href="/pre-itv-fuerteventura/">Reservar pre-ITV</a>' + B_WA("Hola Volcano Cars, tengo que pasar la ITV: ") + B_TEL,
    sellos=["Actualizada en 2026", "Escrita por nuestro taller", "Pre-ITV en Antigua"],
    wa="Hola Volcano Cars, tengo que pasar la ITV: ",
    body=lambda: f"""
  <section class="sec"><h2>¿Cada cuánto hay que pasar la ITV?</h2>
    <p>Para un turismo de uso particular (coche normal, hasta 9 plazas):</p>
    <div class="tabla-wrap"><table class="tabla"><thead><tr><th>Antigüedad del coche</th><th>Cada cuánto</th></tr></thead><tbody>
      <tr><td>Hasta 4 años</td><td>No tiene que pasarla</td></tr>
      <tr><td>De 4 a 10 años</td><td>Cada 2 años</td></tr>
      <tr><td>Más de 10 años</td><td>Cada año</td></tr>
    </tbody></table></div>
    <p>La fecha exacta está en la pegatina del parabrisas y en la tarjeta ITV. Puedes pasarla hasta 30 días antes de que caduque sin perder días: la siguiente fecha se cuenta desde la de caducidad, no desde el día que vas. Taxis, autocaravanas, furgonetas y vehículos de alquiler tienen otros plazos.</p>
  </section>
  <section class="sec"><h2>Dónde pasarla en Fuerteventura</h2>
    <p>En la isla hay estaciones de ITV en la zona de Puerto del Rosario y El Matorral. Casi todas trabajan <b>con cita previa</b>: pídela en la web de la estación y comprueba allí la dirección, el horario y la documentación antes de ir.</p>
    <p>Lleva el <b>permiso de circulación</b>, la <b>tarjeta ITV</b> (ficha técnica) y, si te la piden, el recibo del seguro en vigor.</p>
  </section>
  <section class="sec"><h2>Los fallos que más suspenden</h2>
    {tarjetas([("01", "Luces", "Una bombilla fundida (freno, matrícula, intermitente) o faros mal alineados. Es el fallo más tonto y de los más habituales."),
               ("02", "Neumáticos", "Dibujo por debajo de 1,6 mm, cortes, bultos o medidas distintas a las de la ficha técnica."),
               ("03", "Frenos", "Pastillas gastadas, discos con escalón o un freno que tira más de un lado que del otro."),
               ("04", "Emisiones", "Humo o gases por encima del límite. Un filtro sucio, una sonda averiada o un testigo de motor encendido lo delatan."),
               ("05", "Suspensión y dirección", "Holguras en rótulas y bieletas, amortiguadores que pierden aceite, silentblocks rotos."),
               ("06", "Óxido por el salitre", "En Fuerteventura el salitre se come bajos, anclajes y tubos de freno. La ITV mira los bajos con el coche levantado.")])}
  </section>
  <section class="sec"><h2>¿Y si sale desfavorable o negativa?</h2>
    {pasos([("Desfavorable", "Tienes 2 meses para reparar los defectos y volver a la misma estación. Mientras tanto, puedes circular con el coche."),
            ("Negativa", "El defecto es peligroso: el coche solo puede ir al taller o volver a la ITV (en grúa, si hace falta)."),
            ("Tráenos el informe", "Con la hoja de la inspección te damos presupuesto por escrito para arreglar exactamente lo que marca, sin tocar nada más sin tu permiso."),
            ("Segunda inspección", "Con el coche reparado, vuelves a la estación y solo revisan lo que falló.")])}
  </section>
  <section class="sec"><h2>Cómo aprobar a la primera</h2>
    <p>Lo más barato es no suspender: una segunda visita cuesta tiempo, otro viaje y a veces otra tasa. En nuestra <a href="/pre-itv-fuerteventura/">pre-ITV</a> revisamos luces, frenos, neumáticos, dirección, suspensión, bajos y testigos con equipo de diagnosis, y te decimos qué fallaría antes de que lo diga la estación. Si hay que arreglar algo, presupuesto por escrito primero.</p>
    <p>¿Tu coche vive cerca del mar? Pide que miremos los bajos: en la costa de la isla el salitre es la causa número uno de óxido en tubos de freno y anclajes.</p>
  </section>""",
    faq=[("¿Puedo pasar la ITV antes de que caduque?", "Sí, hasta 30 días antes, y la próxima fecha se cuenta desde la de caducidad, así que no pierdes nada."),
         ("¿Qué pasa si circulo con la ITV caducada?", "Es una infracción grave y te pueden multar; además, si tienes un accidente, el seguro puede darte problemas. Mejor no arriesgar."),
         ("¿Hacéis vosotros la ITV?", "No: la ITV la hace la estación oficial. Nosotros revisamos y reparamos el coche antes (pre-ITV) o después, si te la han dado desfavorable."),
         ("¿Cuánto tardáis en arreglar los defectos de la ITV?", "Depende del defecto. Con el informe de la inspección te damos presupuesto y fecha de entrega por escrito."),
         ("¿Me avisáis cuando me toque la ITV?", "Sí, si nos dejas el coche en el taller puedes pedir que te avisemos por WhatsApp 30 y 7 días antes de que caduque.")],
    banda=("Deja la ITV en manos de mecánicos", '<a class="btn b-rosso" href="/pre-itv-fuerteventura/">Reservar pre-ITV</a>' + B_WA("Hola Volcano Cars, tengo que pasar la ITV: ")),
))

for p in PAGINAS:
    d = OUT / p['url'].strip("/")
    d.mkdir(parents=True, exist_ok=True)
    # las etiquetas de los sellos pueden llevar HTML (span del plazo), el resto se escapa
    pag = cabecera(p).replace(e('<span data-fin-max>varios años</span>'), '<span data-fin-max>varios años</span>') + p['body']() + pie(p)
    (d / "index.html").write_text(pag, encoding="utf-8")
    print("escrito", p['url'])
    if p['url'] == "/coches-segunda-mano-fuerteventura/":
        # Plantilla para netlify/functions/coches-fv.mts: esa función sirve esta misma página con los coches
        # en venta ya pintados donde está <!--STOCK--> (para que Google vea el stock sin JavaScript)
        import json
        (OUT.parent / "netlify" / "lib" / "plantilla-coches-fv.mts").write_text(
            "// GENERADO por tools/seo.py: no editar a mano\nexport const PLANTILLA: string = " + json.dumps(pag, ensure_ascii=False) + ";\n", encoding="utf-8")
