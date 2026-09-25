# Genera la versión en inglés (public/en/index.html) a partir de public/index.html.
# Cada vez que cambies la web en español, ejecuta:  python3 tools/build-en.py
# Si falla, es que un texto español ha cambiado: actualiza su traducción aquí abajo.
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / "public"
# tema «high-tech» siempre activo en la portada (y por tanto en inglés y en /comprar, /taller, /contacto)
import runpy as _rp
_rp.run_path(str(pathlib.Path(__file__).with_name("tema.py")))
src = (ROOT / "index.html").read_text(encoding="utf-8")

# ---------- 1. Textos visibles del HTML (entre etiquetas) ----------
TEXT = {
    # taller «high-tech»
    "Taller Volcano Cars · Antigua": "Volcano Cars workshop · Antigua",
    "Cita online": "Online booking",
    "Confirmada al momento": "Confirmed instantly",
    "Presupuesto por escrito": "Written quote",
    "Antes de tocar nada": "Before any work",
    "Todas las marcas": "All makes",
    "Mecánica, chapa y pintura": "Mechanics, bodywork and paint",
    "Certificado": "Certified",
    "Reparación garantizada 3 meses o 2.000 km": "Repairs guaranteed for 3 months or 2,000 km",
    "Elige los servicios": "Choose your services",
    "Ninguno marcado": "None selected",
    "Horas en tiempo real": "Live availability",
    "1 año de garantía": "1-year warranty",
    "Revisados en nuestro taller": "Checked in our own workshop",
    "Cita online al momento": "Instant online booking",
    "Tu coche": "Your car",
    "Marca y modelo": "Make and model",
    "Te llamamos con una oferta sin compromiso. Tasación gratis.": "We'll call you with a no-obligation offer. Free valuation.",
    "La forma más rápida": "The fastest way",
    "Te contestamos en horario de apertura": "We reply during opening hours",
    "GARANTÍA DE PLAZO · VOLCANO CARS · GARANTÍA DE PLAZO · VOLCANO CARS ·": "ON-TIME PROMISE · VOLCANO CARS · ON-TIME PROMISE · VOLCANO CARS ·",
    "por día": "per day",
    "Compromiso Volcano Cars": "The Volcano Cars promise",
    "Fecha de entrega por escrito": "Delivery date in writing",
    "Presupuesto antes de tocar nada": "A quote before we touch anything",
    "3 meses o 2.000 km de garantía": "3-month or 2,000 km warranty",
    "Servicios": "Services",
    "Tus datos": "Your details",
    "Día y hora": "Day & time",
    "Reservar": "Book",
    "Los mejores coches de ocasión en": "The best used cars in",
    "Coches de ocasión y taller en": "Used cars and a workshop in",
    "Coches de segunda mano en": "Used cars in",
    "Taller mecánico para": "Car repairs for",
    "Elige qué necesitas: te atendemos en nuestra nave de Antigua, en el centro de la isla.": "Tell us what you need: you'll find us at our workshop in Antigua, in the middle of the island.",
    "Venta de coches": "Cars for sale",
    "Comprar Coche de Ocasión": "Buy a Used Car",
    "Vehículos revisados con 1 año de garantía y entrega gratis en toda la isla.": "Cars checked in our own workshop, with a 1-year warranty and free delivery anywhere on the island.",
    "Ver catálogo disponible": "See available cars",
    "Taller en Antigua": "Workshop in Antigua",
    "Taller Mecánico, Chapa y Pintura": "Mechanics, Bodywork & Paint",
    "Presupuesto sin compromiso, garantía de reparación y compromiso de plazo.": "No-obligation quote, repair warranty and a promised finish date.",
    "Pedir cita o presupuesto": "Book or get a quote",
    "con": "with",
    "1 año de garantía.": "a 1-year warranty.",
    "Tu coche listo a tiempo o te devolvemos parte del dinero.": "Your car ready on time, or we refund part of the cost.",
    "Si no está listo el día acordado, te descontamos el 10 % de la mano de obra por cada día de retraso, hasta el 50 %.": "If it isn't ready on the agreed day, we take 10 % off the labour for every working day of delay, up to 50 %.",
    "Ver condiciones": "See terms",
    "Marca uno o varios servicios, elige día y hora y tu cita queda confirmada al momento. Trabajamos con todas las marcas.": "Tick one or more services, pick a day and time and your appointment is confirmed instantly. We work on all makes.",
    "Reserva tu cita": "Book your appointment",
    "Reservar día y hora": "Book a day and time",
    "Solo pedir presupuesto": "Just request a quote",
    "Confirmar cita": "Confirm appointment",
    "La cita queda confirmada al momento. Si luego no puedes venir, avísanos por WhatsApp.": "Your appointment is confirmed instantly. If you can't make it, let us know on WhatsApp.",
    "Solicitud recibida. Te enviamos el presupuesto por WhatsApp o por teléfono en horario de apertura.": "Request received. We'll send your quote by WhatsApp or phone during opening hours.",
    "Elige día y hora y te lo tenemos preparado. Sin compromiso.": "Pick a day and time and we'll have it ready for you. No obligation.",
    "Elegir día y hora": "Pick a day and time",
    "Que me llaméis": "Call me back",
    "Confirmar visita": "Confirm viewing",
    "¡Hecho! Te llamamos en horario de apertura para quedar.": "Done! We'll call you during opening hours to arrange it.",
    "01 · Carrocería": "01 · Bodywork",
    "02 · Mecánica": "02 · Mechanics",
    "12 meses de garantía · revisado en nuestro taller · cambio de nombre incluido ·": "12-month warranty · checked in our own workshop · ownership transfer included ·",
    "condiciones": "terms",
    "Condiciones y garantía": "Terms and warranty",
    "Ver el mapa aquí": "Show the map here",
    "Al cargarlo, Google Maps recibe tu dirección IP y puede usar cookies.": "When it loads, Google Maps receives your IP address and may use cookies.",
    "Una selección de opiniones publicadas por clientes en nuestra ficha de Google Maps.": "A selection of reviews posted by customers on our Google Maps listing (translated from Spanish).",
    "Opiniones publicadas en nuestra ficha de Google Maps, copiadas sin cambios (algunas recortadas). Las publica Google y nosotros no las filtramos: puedes leerlas todas, también las negativas.": "Reviews published on our Google Maps listing, copied unchanged (some shortened) and translated. Google publishes them and we don't filter them: you can read them all, including negative ones.",
    "Abrir WhatsApp": "Open WhatsApp",
    "Abrir en Google Maps": "Open in Google Maps",
    "Aceite y filtros": "Oil and filters",
    "Aceptamos tu coche como parte del pago de otro": "We take your car in part exchange for another",
    "Aceptar": "Accept",
    "Acepto que Volcano Cars use estos datos solo para responder a mi solicitud. Puedo pedir que los borren cuando quiera.": "I agree that Volcano Cars may use these details only to answer my request. I can ask for them to be deleted at any time.",
    "Ahora mismo": "Right now",
    "Algo más que debamos saber (opcional)": "Anything else we should know? (optional)",
    "Arañazos": "Scratches",
    "Así de fácil": "It's that easy",
    "Aviso legal": "Legal notice",
    "Año": "Year",
    "Bueno": "Good",
    "Chapa y pintura": "Body repair and paint",
    "Taller mecánico": "Mechanical workshop",
    "Financiación": "Finance",
    "Coches de segunda mano": "Used cars",
    "Compartir": "Share",
    "Chapa y pintura · Mecánica rápida": "Body & paint · Quick servicing",
    "Chapa y pintura · Mecánica rápida · Coches de ocasión": "Body & paint · Quick servicing · Used cars",
    "Coche": "Car",
    "Coches": "Cars",
    "Coches disponibles": "Cars for sale",
    "Coches que hemos vendido en los últimos dos meses. Si ves uno que te encaja, no esperes demasiado.": "Cars we have sold in the last two months. If you see one you like, don't wait too long.",
    "Coches revisados": "Checked cars",
    "Combustible": "Fuel",
    "Comprar": "Buy",
    "Comprar coche": "Buy a car",
    "Comprar en": "Buying at",
    "Con algún detalle": "A few small marks",
    "Configurar cookies": "Cookie settings",
    "Contacto": "Contact",
    "Pedir información": "Ask us anything",
    "Cuéntanos qué coche tienes y te damos una oferta sin compromiso. Si te encaja, pagamos por transferencia el mismo día.": "Tell us about your car and we'll make you an offer with no obligation. If you're happy with it, we pay by bank transfer the same day.",
    "Cómo llegar": "Directions",
    "Darle las gracias de verdad: muy amables, serviciales, eficaces y con buen precio. Salir de la ITV con fallo y estar ustedes a dos pasos ha sido genial. ¡Gracias de nuevo, nos veremos! 😉": "A big thank you: very kind, helpful, efficient and fairly priced. Failing the MOT (ITV) and having you just around the corner was great. Thanks again, see you soon! 😉",
    "Datos de tu coche": "Your car",
    "Diagnosis": "Diagnostics",
    "Dinos cuándo te viene bien y te lo tenemos preparado. Sin compromiso.": "Tell us when suits you and we'll have it ready. No obligation.",
    "Dirección": "Address",
    "Diésel": "Diesel",
    "Dos oficios,": "Two trades,",
    "Día": "Day",
    "Día para traerlo (opcional)": "Day to bring it in (optional)",
    "El alma de": "The soul of",
    "El mantenimiento de siempre, sin esperas largas: aceite y filtros, frenos, neumáticos, batería, diagnosis y pre-ITV.": "Everyday servicing without long waits: oil and filters, brakes, tyres, battery, diagnostics and pre-ITV (MOT) checks.",
    "Elige tu coche": "Choose your car",
    "Eléctrico": "Electric",
    "Enviar un email": "Send an email",
    "Equipamiento": "Equipment",
    "Escríbenos": "Message us",
    "Estado": "Condition",
    "Estamos para ayudarte con la compra de tu próximo coche, la carrocería o el mantenimiento.": "We can help you find your next car, repair bodywork or service your car.",
    "Extras, averías, ITV, número de propietarios…": "Extras, faults, ITV (MOT), number of owners…",
    "Fantástico trabajo de pintura de nuestra camper… Grandes profesionales, muy atentos y amables. Muy recomendable.": "Fantastic paint job on our camper… True professionals, very attentive and friendly. Highly recommended.",
    "Frenos": "Brakes",
    "Gasolina": "Petrol",
    "Golpes y abolladuras": "Dents and knocks",
    "Golpes, arañazos, rozaduras y abolladuras. Reparamos la chapa y trabajamos el color para que la reparación no se note.": "Knocks, scratches, scuffs and dents. We repair the panel and match the colour so the repair doesn't show.",
    "Gracias, siempre a su disposición, es un placer trabajar con clientes como usted.": "Thank you, always at your service. It's a pleasure to work with customers like you.",
    "Hecho en Fuerteventura, tierra de volcanes": "Made in Fuerteventura, land of volcanoes",
    "Hora aproximada": "Approximate time",
    "Horario": "Opening hours",
    "Híbrido": "Hybrid",
    "Inicio": "Home",
    "Kilómetros": "Mileage (km)",
    "La forma más rápida es WhatsApp. Te contestamos en horario de apertura.": "WhatsApp is the fastest way. We reply during opening hours.",
    "Llamar": "Call",
    "Llamar ahora": "Call now",
    "Llámanos": "Call us",
    "Te lo llevamos": "We deliver it",
    "Local Guide · Chapa y pintura": "Local Guide · Body & paint",
    "Local Guide · Mecánica": "Local Guide · Mechanics",
    "Lunes a viernes, de 8:00 a 16:00": "Monday to Friday, 8:00 to 16:00",
    "Marca": "Make",
    "Marca uno o varios servicios, cuéntanos qué le pasa y te enviamos presupuesto sin compromiso. Trabajamos con todas las marcas.": "Tick one or more services, tell us what's wrong and we'll send you a free quote. We work on all makes.",
    "Matrícula (opcional)": "Number plate (optional)",
    "Me da igual": "Any time",
    "Mecánica rápida": "Quick servicing",
    "Mira fotos, kilómetros y equipamiento. Todos los precios son finales, con impuestos incluidos.": "Check the photos, mileage and equipment. All prices are final, taxes included.",
    "Modelo": "Model",
    "Volcano Cars respondió:": "Volcano Cars replied:",
    "Muy bueno": "Very good",
    "Más información": "More information",
    "Necesita reparación": "Needs repair",
    "Neumáticos": "Tyres",
    "Ningún servicio marcado todavía.": "No service selected yet.",
    "Nos ocupamos de todos los trámites de Tráfico": "We handle all the DGT (traffic office) paperwork",
    "Nuestro taller": "Our workshop",
    "Opiniones reales que nuestros clientes han dejado en Google Maps.": "Real reviews our customers have left on Google Maps (translated from Spanish).",
    "Pagas al contado, hacemos el cambio de nombre y te lo llevamos gratis a casa, en cualquier punto de Fuerteventura.": "Pay in full, we handle the ownership transfer and deliver it to your door for free, anywhere on Fuerteventura.",
    # entrega a domicilio gratis
    "Entrega gratis en toda la isla": "Free delivery across the island",
    "Solo en Volcano Cars": "Only at Volcano Cars",
    "Te lo llevamos a casa.": "We bring it to your door.",
    "Gratis.": "Free.",
    "Gratis": "Free",
    "Compres el coche que compres, te lo entregamos en la puerta de tu casa sin coste, en cualquier punto de Fuerteventura. Con el cambio de nombre hecho y listo para conducir.": "Whichever car you buy, we deliver it to your door at no cost, anywhere on Fuerteventura. Ownership transfer done and ready to drive.",
    "de entrega, de norte a sur de la isla": "delivery, from the north to the south of the island",
    "Tú eliges el día y la hora": "You choose the day and time",
    "Con sus 12 meses de garantía desde el primer kilómetro": "With its 12-month warranty from the very first kilometre",
    "Entrega a domicilio gratis en toda Fuerteventura": "Free home delivery anywhere on Fuerteventura",
    "De Corralejo a Morro Jable, sin coste y el día que tú elijas.": "From Corralejo to Morro Jable, free of charge, on the day you choose.",
    "Entrega a domicilio gratis en cualquier punto de Fuerteventura, o recógelo en Antigua": "Free home delivery anywhere on Fuerteventura, or collect it in Antigua",
    "Ver vídeo 360°": "Watch 360° video",
    "Pago inmediato por transferencia": "Immediate payment by bank transfer",
    "Palabra de": "Straight from our",
    "Paragolpes": "Bumpers",
    "Pedir cita": "Book a visit",
    "Pedir cita en el taller": "Book the workshop",
    "Pedir cita o presupuesto": "Request a booking or quote",
    "Pedir presupuesto": "Get a quote",
    "Pedir tasación gratis": "Get a free valuation",
    "Pide presupuesto o cita": "Get a quote or book in",
    "Pintura parcial o completa": "Partial or full respray",
    "Polígono Industrial de Antigua": "Antigua Industrial Estate",
    "Política de privacidad": "Privacy policy",
    "Pre-ITV": "Pre-ITV (MOT) check",
    "Preguntar por WhatsApp": "Ask on WhatsApp",
    "Privacidad": "Privacy",
    "Pruébalo": "Test drive it",
    "Rechazar": "Reject",
    "Recibimos tu solicitud al momento. También se abrirá WhatsApp con tus datos escritos, por si quieres mandarnos fotos del coche.": "We receive your request straight away. WhatsApp will also open with your details filled in, in case you want to send us photos of the car.",
    "Recién": "Just",
    "Reparamos, pintamos y cuidamos tu coche como si fuera nuestro, aquí mismo, en el corazón de Fuerteventura. Y si buscas coche, te ofrecemos vehículos de ocasión revisados en nuestro propio taller, listos para rodar.": "We repair, paint and look after your car as if it were our own, right here in the heart of Fuerteventura. And if you're looking for a car, our used cars are checked in our own workshop and ready to drive.",
    "Reservar visita": "Book a viewing",
    "Reseñas en Google Maps": "Google Maps reviews",
    "Reseñas publicadas por clientes en Google Maps.": "Reviews posted by customers on Google Maps.",
    "Sin líos.": "No hassle.",
    "Solicitud recibida. Te confirmamos la cita por WhatsApp o por teléfono en horario de apertura.": "Request received. We'll confirm your booking by WhatsApp or phone during opening hours.",
    "Solicitud recibida. Te llamamos con la oferta en horario de apertura (lunes a viernes, de 8:00 a 16:00).": "Request received. We'll call you with our offer during opening hours (Monday to Friday, 8:00 to 16:00).",
    "Súper recomendable, serios y precio justo. Y en un tiempo inmejorable, desde luego los mejores.": "Highly recommended, reliable and fairly priced. And unbeatably quick, definitely the best.",
    "Taller": "Workshop",
    "Taller Volcano Cars": "Volcano Cars workshop",
    "Taller de chapa y pintura, mecánica rápida y venta de coches de ocasión revisados en Antigua, Fuerteventura.": "Body repair and paint shop, quick servicing and used car sales in Antigua, Fuerteventura.",
    "Tasación gratuita en nuestras instalaciones": "Free valuation at our premises",
    "Te compramos el coche.": "We'll buy your car.",
    "Te confirmamos la cita por WhatsApp o por teléfono. Atendemos de lunes a viernes, de 8:00 a 16:00.": "We'll confirm your booking by WhatsApp or phone. Open Monday to Friday, 8:00 to 16:00.",
    "Te esperamos en": "Come and see us in",
    "Teléfono": "Phone",
    "Todas las marcas y modelos. Te damos presupuesto sin compromiso y te explicamos cada reparación antes de hacerla.": "All makes and models. Free quotes, and we explain every repair before we do it.",
    "Todos revisados en nuestro taller y con 12 meses de garantía.": "All checked in our workshop and with a 12-month warranty.",
    "Tu nombre": "Your name",
    "Usamos cookies de Google Ads solo para saber qué anuncios traen clientes. Sin ellas la web funciona igual.": "We only use Google Ads cookies to see which ads bring us customers. The website works just the same without them.",
    "Ven a": "Come and",
    "Ven a verlo y pruébalo": "Come and see it, test drive it",
    "Ven a vernos": "Visit us",
    "Ven a vernos a Antigua y pruébalo con calma, cuando te venga bien.": "Visit us in Antigua and take it for a relaxed test drive whenever suits you.",
    "Vender": "Sell",
    "Vender tu coche": "Sell your car",
    "Vendidos": "Recently",
    "Ver coches disponibles": "See cars for sale",
    "Ver todas en Google Maps": "See all on Google Maps",
    "Ver todos": "See all",
    "Visítanos": "Visit us",
    "Ya tienen dueño": "Already sold",
    "a tu coche?": "car need?",
    "cliente.": "customers.",
    "de garantía en los coches que vendemos": "warranty on the cars we sell",
    "de lunes a viernes, en horario continuado": "Monday to Friday, open all day",
    "de revisión en nuestro taller antes de cada venta": "-point check in our workshop before every sale",
    "disponibles": "for sale",
    "en el corazón de": "in the heart of",
    "llegados": "arrived",
    "meses": "months",
    "por llevarte el coche a casa o pedirnos presupuesto": "to deliver your car or quote a repair",
    "puntos": "points",
    "recientemente": "sold",
    "una pasión.": "one passion.",
    "vernos": "see us",
    "¡Hecho! Te confirmamos la visita por WhatsApp o por teléfono.": "Done! We'll confirm your viewing by WhatsApp or phone.",
    "¿Nos dejas medir los anuncios?": "Can we measure our ads?",
    "¿Qué le hacemos": "What does your",
    "¿Qué necesitas o qué le notas?": "What do you need, or what have you noticed?",
    "Mapa: Volcano Cars en Antigua": "Map: Volcano Cars in Antigua",
}

# ---------- 2. Atributos (placeholder, aria-label, alt, title) ----------
ATTR = {
    "Así trabajamos": "How we work",
    "Llamar a Volcano Cars": "Call Volcano Cars",
    "Entrega gratis en toda Fuerteventura, de Corralejo a Morro Jable": "Free delivery anywhere on Fuerteventura, from Corralejo to Morro Jable",
    "Por qué Volcano Cars": "Why Volcano Cars",
    "Progreso de tu tasación": "Valuation progress",
    "Estado del coche": "Car condition",
    "Progreso de tu reserva": "Booking progress",
    "Tipo de solicitud": "Request type",
    "Cómo quieres venir": "How you'd like to come",
    "Ej. Golf 2016": "e.g. Golf 2016",
    "Ej. León": "e.g. León",
    "Ej. Seat": "e.g. Seat",
    "Ej. Tiene un golpe en el paragolpes y toca cambiar el aceite.": "e.g. There's a dent in the bumper and it's due an oil change.",
    "Extras, averías, ITV, número de propietarios…": "Extras, faults, ITV (MOT), number of owners…",
    "5 de 5 estrellas": "5 out of 5 stars",
    "Cerrar": "Close",
    "Foto anterior": "Previous photo",
    "Foto siguiente": "Next photo",
    "Secciones": "Sections",
    "Volcano Cars, inicio": "Volcano Cars, home",
    "Mapa: Volcano Cars en Antigua": "Map: Volcano Cars in Antigua",
}

# ---------- 3. Cambios exactos en cabecera y código ----------
RAW = [
    ('<title>Volcano Cars · Coches de ocasión con 1 año de garantía, chapa y pintura y mecánica en Fuerteventura</title>',
     '<title>Volcano Cars · Used cars with a 1-year warranty, body repair and servicing in Fuerteventura</title>'),
    ('content="Volcano Cars: los mejores coches de ocasión en Fuerteventura, revisados en nuestro taller y con 1 año de garantía. Entrega a domicilio gratis en toda la isla. Chapa y pintura y mecánica rápida en Antigua con cita online al momento."',
     'content="Volcano Cars: the best used cars in Fuerteventura, checked in our own workshop with a 1-year warranty and free home delivery anywhere on the island. Body repair, paint and quick servicing in Antigua, near Caleta de Fuste, with instant online booking. We speak English."'),
    ('<html lang="es">', '<html lang="en">'),
    ('content="Volcano Cars · Chapa y pintura, mecánica rápida y coches de ocasión"', 'content="Volcano Cars · Body repair, paint, servicing and used cars in Fuerteventura"'),
    ('content="Coches de ocasión revisados con 1 año de garantía y entrega gratis en toda Fuerteventura. Taller mecánico y chapa y pintura en Antigua con cita online."',
     'content="Used cars checked in our own workshop with a 1-year warranty and free delivery anywhere on Fuerteventura. Mechanical workshop, body repair and paint in Antigua with instant online booking."'),
    ('<meta property="og:url" content="https://lestter7th.netlify.app/">', '<meta property="og:url" content="https://lestter7th.netlify.app/en/">\n<meta property="og:locale" content="en_GB">'),
    ('<link rel="canonical" href="https://lestter7th.netlify.app/">', '<link rel="canonical" href="https://lestter7th.netlify.app/en/">'),
    ('"url":"https://lestter7th.netlify.app/","image"', '"url":"https://lestter7th.netlify.app/en/","image"'),
    ('"description":"Chapa y pintura, mecánica rápida y venta de coches de ocasión revisados con 12 meses de garantía y entrega a domicilio gratis en toda Fuerteventura."',
     '"description":"Body repair and paint, quick servicing and checked used cars with a 12-month warranty and free home delivery anywhere on Fuerteventura, from Antigua."'),
    ('<a class="lang" href="/en/" hreflang="en" lang="en" aria-label="English version">EN</a>',
     '<a class="lang" href="/" hreflang="es" lang="es" aria-label="Versión en español">ES</a>'),
    # datos de la empresa
    ('horario: "Lunes a viernes, de 8:00 a 16:00, en horario continuado. Sábados y domingos, cerrado."',
     'horario: "Monday to Friday, 8:00 to 16:00, open all day. Closed Saturday and Sunday."'),
    ('horarioCorto: "L–V · 8:00 a 16:00 continuado"', 'horarioCorto: "Mon–Fri · 8:00 to 16:00"'),
    ('const T = x => x;', 'const T = x => ({"Gasolina":"Petrol","Diésel":"Diesel","Híbrido":"Hybrid","Híbrido enchufable":"Plug-in hybrid","Eléctrico":"Electric","GLP":"LPG","Manual":"Manual","Automático":"Automatic","Muy bueno":"Very good","Bueno":"Good"}[x]||x);'),
    ('const km = n => Number(n||0).toLocaleString("es-ES")+" km";', 'const km = n => Number(n||0).toLocaleString("en-GB")+" km";'),
    # coche fijo
    ('descripcion: "Opel Astra 1.6 de 115 CV, gasolina y cambio manual, con todo el mantenimiento importante recién hecho: kit de distribución nuevo con bomba de agua, y aceite y todos los filtros sustituidos. Neumáticos al 90 % de vida útil.\\n\\nCoche muy cuidado, mecánicamente en muy buen estado y listo para rodar sin invertir un euro más. Ideal si buscas un coche fiable y cómodo para el día a día.\\n\\nVen a verlo y pruébalo sin compromiso. Nosotros nos encargamos del cambio de nombre."',
     'descripcion: "Opel Astra 1.6, 115 hp, petrol with manual gearbox, with all the major servicing just done: new timing belt kit with water pump, plus oil and all filters replaced. Tyres at 90 % of their life.\\n\\nA well looked-after car, mechanically in very good condition and ready to drive without spending another euro. Ideal if you want a reliable, comfortable everyday car.\\n\\nCome and see it and test drive it with no obligation. We take care of the ownership transfer."'),
    ('equipamiento: ["Aire acondicionado","Cierre centralizado","Elevalunas eléctricos","Llantas de aleación","5 plazas","Kit de distribución nuevo con bomba de agua","Aceite y filtros recién cambiados","Neumáticos al 90 %"]',
     'equipamiento: ["Air conditioning","Central locking","Electric windows","Alloy wheels","5 seats","New timing belt kit with water pump","Oil and filters just changed","Tyres at 90 %"]'),
    # servicios del taller
    ('n:"Golpes y abolladuras", d:"Reparación de chapa"', 'n:"Dents and knocks", d:"Panel repair"'),
    ('n:"Pintura", d:"Parcial o completa"', 'n:"Paint", d:"Partial or full respray"'),
    ('n:"Arañazos y rozaduras", d:"Pulido y retoque"', 'n:"Scratches and scuffs", d:"Polish and touch-up"'),
    ('n:"Cambio de aceite y filtros", d:"Mantenimiento"', 'n:"Oil and filter change", d:"Servicing"'),
    ('n:"Frenos", d:"Pastillas y discos"', 'n:"Brakes", d:"Pads and discs"'),
    ('n:"Neumáticos", d:"Cambio y alineado"', 'n:"Tyres", d:"Fitting and alignment"'),
    ('n:"Diagnosis electrónica", d:"Testigos y averías"', 'n:"Electronic diagnostics", d:"Warning lights and faults"'),
    ('n:"Pre-ITV", d:"Lo dejamos listo para pasarla"', 'n:"Pre-ITV (MOT) check", d:"We get it ready to pass"'),
    ('n:"Aire acondicionado", d:"Carga y revisión"', 'n:"Air conditioning", d:"Re-gas and check"'),
    ('n:"Correa de distribución", d:"Kit completo"', 'n:"Timing belt", d:"Full kit"'),
    ('n:"Batería y arranque", d:"Prueba y sustitución"', 'n:"Battery and starting", d:"Test and replace"'),
    ('n:"Otro servicio", d:"Cuéntanoslo abajo"', 'n:"Other service", d:"Tell us below"'),
    # tarjetas y ficha
    ("'<span class=\"badge warn\">Reservado</span>' : '<span class=\"badge ok\">Revisado</span>'", "'<span class=\"badge warn\">Reserved</span>' : '<span class=\"badge ok\">Checked</span>'"),
    ('`<span class="badge r">Etiqueta ${esc(c.etiqueta)}</span>`', '`<span class="badge r">DGT label ${esc(c.etiqueta)}</span>`'),
    ('<span><b>${n} personas</b> han preguntado por este coche esta semana</span>', '<span><b>${n} people</b> have asked about this car this week</span>'),
    ('return d < 1 ? "en menos de 24 h" : "en " + Math.ceil(d) + (Math.ceil(d)===1?" día":" días");', 'return d < 1 ? "in under 24 h" : "in " + Math.ceil(d) + (Math.ceil(d)===1?" day":" days");'),
    ('alt="${esc(c.marca+" "+c.modelo)}, vendido"', 'alt="${esc(c.marca+" "+c.modelo)}, sold"'),
    ('<span><b>VENDIDO</b>', '<span><b>SOLD</b>'),
    ('<div class="month">Vendido${en?" "+en:""}</div>', '<div class="month">Sold${en?" "+en:""}</div>'),
    ('<span class="badge cnt">${c.fotos.length} fotos</span>', '<span class="badge cnt">${c.fotos.length} photos</span>'),
    ('aria-label="Ver ${esc(c.marca+" "+c.modelo)}${c.video', 'aria-label="View ${esc(c.marca+" "+c.modelo)}${c.video'),
    ('<div class="month">Precio final · impuestos incl.</div>', '<div class="month">Final price · taxes incl.</div>'),
    ('<b style="color:var(--ink)">Estamos preparando nuevos coches.</b><br>Escríbenos por <a href="${wa("Hola Volcano Cars, busco un coche: ")}" target="_blank" rel="noopener">WhatsApp</a> y te avisamos en cuanto entre uno que encaje contigo.',
     '<b style="color:var(--ink)">New cars are on their way.</b><br>Message us on <a href="${wa("Hi Volcano Cars, I\'m looking for a car: ")}" target="_blank" rel="noopener">WhatsApp</a> and we\'ll let you know as soon as one comes in that suits you.'),
    ("'<div class=\"empty\" style=\"grid-column:1/-1\">Cargando coches…</div>'", "'<div class=\"empty\" style=\"grid-column:1/-1\">Loading cars…</div>'"),
    ('(n===1 ? "1 coche disponible" : n+" coches disponibles")', '(n===1 ? "1 car for sale" : n+" cars for sale")'),
    ('<b style="color:var(--ink)">No hemos podido cargar los coches.</b><br>Recarga la página o llámanos al ${EMPRESA.telefono}.', '<b style="color:var(--ink)">We couldn\'t load the cars.</b><br>Reload the page or call us on ${EMPRESA.telefono}.'),
    ('alt="${esc(gal.c.marca+" "+gal.c.modelo)}, foto ${nfo} de ${nf}"', 'alt="${esc(gal.c.marca+" "+gal.c.modelo)}, photo ${nfo} of ${nf}"'),
    ('aria-label="Foto ${j+(c.video?0:1)}"', 'aria-label="Photo ${j+(c.video?0:1)}"'),
    ('c.estado==="reservado"?"Reservado":"Precio final, impuestos incluidos"', 'c.estado==="reservado"?"Reserved":"Final price, taxes included"'),
    ('[["Año",c.anio],["Kilómetros",km(c.km)],["Combustible",T(c.combustible)],["Cambio",T(c.cambio)],["Potencia",c.cv?c.cv+" CV":""],["Puertas",c.puertas],["Color",c.color],["Etiqueta DGT",c.etiqueta]]',
     '[["Year",c.anio],["Mileage",km(c.km)],["Fuel",T(c.combustible)],["Gearbox",T(c.cambio)],["Power",c.cv?c.cv+" hp":""],["Doors",c.puertas],["Colour",c.color],["DGT label",c.etiqueta]]'),
    # validación y errores
    ('"Marca la casilla de privacidad para poder enviarlo."', '"Please tick the privacy box so we can send it."'),
    ('"No hemos podido guardar la solicitud, pero el mensaje de WhatsApp lleva todos tus datos: envíalo y te atendemos igual."', '"We couldn\'t save your request, but the WhatsApp message has all your details: send it and we\'ll help you just the same."'),
    ('"Dinos qué coche es."', '"Tell us which car it is."'),
    ('"Escribe tu nombre."', '"Please enter your name."'),
    ('"Escribe tu teléfono."', '"Please enter your phone number."'),
    ('"Revisa el teléfono."', '"Please check the phone number."'),
    # mensajes de WhatsApp
    ('\\nServicios: ${p.length?p.join(", "):"sin especificar"}\\n${$("#t-msg").value?"Detalles: "+', '\\nServices: ${p.length?p.join(", "):"not specified"}\\n${$("#t-msg").value?"Details: "+'),
    ('wa("Hola Volcano Cars, tengo una consulta: ")', 'wa("Hi Volcano Cars, I have a question: ")', 2),
    ('e.textContent="Calle Valle Largo, Nave 8 · Antigua"', 'e.textContent="Calle Valle Largo, Unit 8 · Antigua"'),
    # abierto / cerrado
    ('"Abierto ahora · cerramos a las 16:00"', '"Open now · we close at 16:00"'),
    ('"Cerrado · abrimos hoy a las 8:00"', '"Closed · we open today at 8:00"'),
    ('"Cerrado · abrimos mañana a las 8:00"', '"Closed · we open tomorrow at 8:00"'),
    ('"Cerrado · abrimos el lunes a las 8:00"', '"Closed · we open on Monday at 8:00"'),
]

out = src
# 3 primero: cambios exactos (comprueba que cada texto existe)
for item in RAW:
    old, new = item[0], item[1]
    n = item[2] if len(item) > 2 else None
    c = out.count(old)
    if c == 0 or (n is not None and c != n):
        sys.exit(f"ERROR: no encuentro (o cambió) este texto: {old[:90]}")
    out = out.replace(old, new)

# 1 y 2: solo en el HTML (antes del <script> principal)
cut = out.index("<script>\n/* ====")
html, js = out[:cut], out[cut:]
head_end = html.index("<body")
head, body = html[:head_end], html[head_end:]
usados = set()
def tnode(m):
    pre, t, post = m.group(1), m.group(2), m.group(3)
    if t in TEXT:
        usados.add(t)
        return pre + TEXT[t] + post
    return m.group(0)
body = re.sub(r"(>\s*)([^<>]*?[^\s<>])(\s*<)", tnode, body)
def attr(m):
    k, v = m.group(1), m.group(2)
    if v in ATTR:
        usados.add("attr:" + v)
        return f'{k}="{ATTR[v]}"'
    return m.group(0)
body = re.sub(r'(placeholder|aria-label|alt|title)="([^"]+)"', attr, body)
out = head + body + js

# Enlaces de la versión inglesa
# (la web española usa /comprar, /taller… ; la inglesa sigue con #comprar dentro de /en/)
out = re.sub(r'href="/(comprar|taller|contacto)" data-go="', r'href="#\1" data-go="', out)
out = out.replace('href="/" data-go="inicio"', 'href="#inicio" data-go="inicio"')
out = out.replace('href="/privacidad"', 'href="/privacidad#en"').replace('href="/cookies"', 'href="/cookies#en"')

# Aviso de textos sin traducir (heurística)
restos = []
cut = out.index("<script>\n/* ====")
for m in re.finditer(r">([^<>]*[¿¡ñáéíóú][^<>]*)<", out[:cut]):
    t = m.group(1).strip()
    if t and not re.search(r"Valle Largo|Polígono|Suárez|León|Tráfico|DGT", t):
        restos.append(t)
if restos:
    print("AVISO: posibles textos sin traducir:", *restos[:30], sep="\n  ")

(ROOT / "en").mkdir(exist_ok=True)
(ROOT / "en" / "index.html").write_text(out, encoding="utf-8")
print("OK: public/en/index.html generado")

# Direcciones /comprar, /taller y /contacto (copias de la web española con su propio título)
import runpy
runpy.run_path(str(pathlib.Path(__file__).with_name("build-rutas.py")))
