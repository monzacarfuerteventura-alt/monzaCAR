// Municipios y pueblos de Fuerteventura con página propia (venta y taller).
// Distancias y tiempos: por carretera desde nuestra nave de Costa de Antigua, APROXIMADOS (dependen del punto exacto y del tráfico).
// Para añadir una zona: copia un bloque, cambia los datos y añade su dirección a netlify/functions/local.mts (config.path).

export type Municipio = {
  slug: string;          // va en la dirección: /coches-segunda-mano-<slug>
  nombre: string;        // como se escribe
  en: string;            // «en Corralejo», «en La Oliva»…
  de: string;            // «de Corralejo», «de La Oliva»…
  municipio: string;     // municipio al que pertenece (para Google y para el texto)
  zona: "norte" | "centro" | "sur";
  km: number;            // distancia aproximada por carretera desde Costa de Antigua
  min: number;           // minutos aproximados en coche
  cerca: string[];       // pueblos de alrededor
  venta: string;         // párrafo propio para la página de coches
  taller: string;        // párrafo propio para la página del taller
  // Solo las zonas con contenido propio de verdad se ofrecen a Google. El resto existe (para anuncios y para quien
  // llegue por un enlace) pero con «noindex»: 16 páginas casi iguales son lo que Google llama «páginas puerta». Desde la actualización 39 todas llevan párrafos y preguntas propios y se indexan; una zona nueva sin esos textos debe quedar sin indexarTaller/indexarVenta.
  indexarTaller?: boolean;
  indexarVenta?: boolean;
  extraTaller?: string[]; // párrafos propios de esa zona (solo en las indexadas)
  extraVenta?: string[];
  faqTaller?: [string, string][];
};

export const MUNICIPIOS: Municipio[] = [
  {
    indexarTaller: true, indexarVenta: true,
    extraTaller: ["El norte de la isla castiga el coche de una forma muy concreta: <b>salitre y arena</b>. La arena fina de la zona de las dunas se mete en el filtro de aire, en el del habitáculo y entre las pastillas y los discos, y el salitre oxida bajos, tubos de freno y anclajes mucho antes que en el interior.", "Por eso, cuando nos traes el coche desde Corralejo, en la revisión miramos con el coche levantado los bajos, los tubos de freno y los anclajes de la suspensión, y te decimos qué conviene vigilar antes de que se convierta en una avería (o en un defecto en la ITV).", "Para llegar, lo más cómodo es bajar por la FV-1 hasta Puerto del Rosario y seguir hacia Costa de Antigua: unos 45 minutos sin tráfico. Si lo dejas por la mañana, te avisamos por WhatsApp cuando esté listo."],
    extraVenta: ["En Corralejo, entre El Cotillo, Lajares y Villaverde, mucha gente necesita un coche fiable para moverse por pistas y carreteras con arena. Antes de venderlo, revisamos en nuestro taller los bajos, los frenos y los filtros, que es donde más sufre un coche en el norte."],
    faqTaller: [["¿Me podéis revisar los bajos por el salitre?", "Sí. Levantamos el coche y revisamos bajos, tubos de freno y anclajes. Si hay óxido que conviene tratar, te damos presupuesto por escrito antes de tocar nada."], ["¿Merece la pena el viaje desde Corralejo?", "Te damos el presupuesto por WhatsApp antes de empezar y la fecha de entrega por escrito, así sabes a qué vas. Muchos clientes del norte lo dejan por la mañana y lo recogen por la tarde."]],
    slug: "corralejo", nombre: "Corralejo", en: "en Corralejo", de: "de Corralejo", municipio: "La Oliva", zona: "norte", km: 55, min: 45,
    cerca: ["Lajares", "El Cotillo", "Villaverde", "La Oliva"],
    venta: "Vivas todo el año en Corralejo o acabes de mudarte al norte de la isla, no hace falta que vengas a buscar el coche: una vez firmada la compra te lo llevamos hasta la puerta, con la documentación y el cambio de nombre hechos.",
    taller: "Muchos clientes del norte aprovechan para dejar el coche por la mañana y recogerlo a última hora. Te damos el presupuesto por WhatsApp antes de tocar nada y la fecha de entrega por escrito, para que no hagas el viaje en balde.",
  },
  {
    indexarTaller: true, indexarVenta: true,
    extraTaller: ["Desde el casco de La Oliva, Villaverde o Tindaya llegas a nuestro taller en unos 35 minutos por carretera (unos 42 km). Muchos clientes del interior del norte nos traen el coche a primera hora y lo recogen por la tarde: te mandamos el presupuesto por WhatsApp antes de empezar y la fecha de entrega por escrito.", "En el interior del norte se circula a menudo por pistas de tierra y carreteras con polvo fino. Ese polvo atasca antes el filtro de aire y el del habitáculo y castiga amortiguadores, gomas de la suspensión y frenos. En la revisión te enseñamos el estado de cada uno antes de cambiar nada."],
    extraVenta: ["Si vives en La Oliva, Villaverde, Lajares o Tindaya no hace falta que vengas a buscar el coche: una vez firmada la compra te lo llevamos hasta la puerta de casa, con el cambio de nombre hecho. Antes de venderlo lo pasamos por nuestro taller de Costa de Antigua y revisamos frenos, neumáticos, filtros y bajos.", "Para verlo y probarlo puedes venir a nuestra nave (a unos 35 minutos de La Oliva) o pedirnos más fotos y vídeo por WhatsApp. Todos los coches llevan 12 meses de garantía legal."],
    faqTaller: [["¿Cada cuánto conviene mirar el filtro de aire si circulo por pistas?", "Mejor en cada mantenimiento y antes si ves mucho polvo. En la revisión te enseñamos el filtro y cambiamos solo si hace falta."], ["¿Puedo dejar el coche todo el día?", "Sí. Abrimos de lunes a viernes, de 8:00 a 16:00. Reserva cita online y te decimos cuánto tardamos antes de empezar."]],
    slug: "la-oliva", nombre: "La Oliva", en: "en La Oliva", de: "de La Oliva", municipio: "La Oliva", zona: "norte", km: 42, min: 35,
    cerca: ["Villaverde", "Lajares", "Tindaya", "El Cotillo", "Corralejo"],
    venta: "Desde el pueblo de La Oliva hasta Villaverde, Lajares o Tindaya: elige el coche en la web, pruébalo cuando te venga bien y nosotros te lo entregamos en casa sin coste.",
    taller: "Si vives en el municipio de La Oliva y buscas un taller de confianza, en Costa de Antigua te atendemos con cita: sabes el precio antes de empezar y el día en que tendrás el coche listo.",
  },
  {
    indexarTaller: true, indexarVenta: true,
    extraTaller: ["Desde la capital estamos a unos 20 minutos por la FV-20, la carretera del centro hacia Costa de Antigua. Es un buen trayecto para dejar el coche por la mañana y organizarte el día: te mandamos el presupuesto por WhatsApp y no tocamos nada sin tu permiso.", "Los coches que se mueven sobre todo por ciudad, con muchos arranques en frío y trayectos cortos, gastan antes frenos, batería y embrague. En la revisión lo medimos y te lo explicamos con fotos, para que decidas tú qué se hace y cuándo."],
    extraVenta: ["En Puerto del Rosario se venden muchos coches usados entre particulares, sin garantía y sin revisar. Nosotros vendemos cada coche después de pasarlo por nuestro taller, con 12 meses de garantía legal, y te lo llevamos gratis a casa o al trabajo."],
    faqTaller: [["¿Cuánto se tarda desde Puerto del Rosario?", "Unos 20 minutos en coche por la FV-20 hacia Costa de Antigua, según el punto de salida y el tráfico."], ["¿Tenéis cita a primera hora?", "Abrimos a las 8:00. Reserva la hora en la web y la cita queda confirmada al momento."]],
    slug: "puerto-del-rosario", nombre: "Puerto del Rosario", en: "en Puerto del Rosario", de: "de Puerto del Rosario", municipio: "Puerto del Rosario", zona: "centro", km: 20, min: 20,
    cerca: ["El Matorral", "Tetir", "Puerto Lajas", "Casillas del Ángel"],
    venta: "En la capital hay mucha oferta de coches usados, pero pocos se venden revisados en taller propio y con 12 meses de garantía legal. Nosotros te lo llevamos a tu casa o a tu trabajo en Puerto del Rosario, sin coste.",
    taller: "Estamos a unos veinte minutos de Puerto del Rosario. Reserva hora online, tráenos el coche y te decimos por WhatsApp qué tiene y cuánto cuesta antes de reparar nada.",
  },
  {
    indexarTaller: true, indexarVenta: true,
    extraVenta: ["Nuestra nave está en el Polígono Industrial de Costa de Antigua, dentro del municipio de Antigua. Puedes venir a ver y probar cualquier coche en horario de taller (lunes a viernes, de 8:00 a 16:00) y comprobar en el mismo sitio dónde y cómo se revisan antes de venderse.", "Si prefieres no moverte, te lo llevamos a casa sin coste una vez firmada la compra, en Antigua, Valles de Ortega, Triquivijate o Agua de Bueyes, con 12 meses de garantía legal."],
    extraTaller: ["Somos el taller del Polígono Industrial de Costa de Antigua: si vives en el pueblo, en Valles de Ortega, Triquivijate o Agua de Bueyes, estás a pocos minutos. Puedes traer el coche andando de vuelta a casa y te avisamos por WhatsApp cuando esté listo.", "Hacemos mecánica de todas las marcas, chapa y pintura y la pre-ITV, con presupuesto por escrito antes de empezar y fecha de entrega por escrito."],
    faqTaller: [["¿Dónde estáis exactamente?", "En la Calle Valle Largo, Nave 8, dentro del Polígono Industrial de Costa de Antigua. En Google Maps nos encuentras como Volcano Cars."]],
    slug: "antigua", nombre: "Antigua", en: "en Antigua", de: "de Antigua", municipio: "Antigua", zona: "centro", km: 3, min: 5,
    cerca: ["Valles de Ortega", "Triquivijate", "Agua de Bueyes", "Caleta de Fuste", "Pozo Negro"],
    venta: "Somos vecinos: nuestra nave está en el Polígono Industrial de Costa de Antigua. Puedes venir a ver y probar cualquier coche cuando quieras y, si lo prefieres, te lo dejamos en la puerta de casa sin coste.",
    taller: "Nuestro taller está en el propio municipio de Antigua. Pide cita online, te damos el presupuesto antes de empezar y la fecha de entrega por escrito.",
  },
  {
    indexarTaller: true, indexarVenta: true,
    extraTaller: ["Caleta de Fuste está en nuestro mismo municipio, a unos 15 minutos. Al estar en primera línea de mar, los coches de la zona sufren mucho el salitre: pintura, bajos y conexiones eléctricas. Si ves ampollas en la pintura o manchas de óxido, cuanto antes se trate, más barato sale.", "En chapa y pintura te damos presupuesto por escrito con fotos, y en mecánica te decimos qué es urgente y qué puede esperar."],
    extraVenta: ["Si vives en Caleta de Fuste (El Castillo), puedes venir a ver y probar el coche a un cuarto de hora de casa, y después te lo llevamos gratis donde nos digas."],
    faqTaller: [["¿Arregláis el óxido y la pintura dañada por el salitre?", "Sí. Lo valoramos, te damos presupuesto por escrito y, si hace falta, tratamos el óxido antes de pintar para que no vuelva a salir."]],
    slug: "caleta-de-fuste", nombre: "Caleta de Fuste", en: "en Caleta de Fuste", de: "de Caleta de Fuste", municipio: "Antigua", zona: "centro", km: 12, min: 15,
    cerca: ["El Castillo", "Las Salinas", "Nuevo Horizonte", "Costa de Antigua"],
    venta: "Caleta de Fuste (El Castillo) pertenece a nuestro municipio. Elige el coche en la web, pruébalo a un cuarto de hora de casa y te lo entregamos gratis donde nos digas.",
    taller: "Desde Caleta de Fuste llegas a nuestro taller en unos quince minutos. Ideal para dejar el coche y seguir con tu día: te avisamos por WhatsApp en cuanto esté listo.",
  },
  {
    indexarTaller: true, indexarVenta: true,
    extraTaller: ["Desde Gran Tarajal llegas en una media hora por la FV-20, pasando por Tuineje. Para que el viaje merezca la pena, te damos cita a una hora concreta y el presupuesto antes de empezar.", "Si te han dado la ITV desfavorable, tráenos el informe de la inspección: reparamos exactamente lo que marca, con presupuesto por escrito, para que vuelvas a pasarla con todo en orden."],
    extraVenta: ["En el sur de la isla hay menos oferta de coches revisados con garantía. Elige en la web, ven un día a verlo y probarlo a Costa de Antigua y, una vez firmada la compra, te lo llevamos gratis a Gran Tarajal, Las Playitas o Tarajalejo."],
    faqTaller: [["¿Podéis arreglar lo que me ha salido en la ITV?", "Sí. Con el informe de la inspección te damos presupuesto y fecha de entrega por escrito. <a href='/itv-fuerteventura/'>Guía de la ITV en Fuerteventura</a>."]],
    slug: "gran-tarajal", nombre: "Gran Tarajal", en: "en Gran Tarajal", de: "de Gran Tarajal", municipio: "Tuineje", zona: "sur", km: 30, min: 30,
    cerca: ["Tuineje", "Las Playitas", "Tarajalejo", "Giniginámar", "Tiscamanita"],
    venta: "Para el municipio de Tuineje, de Gran Tarajal a Las Playitas o Tarajalejo, la entrega también es gratis: firmas, y nosotros te llevamos el coche el día y a la hora que acordemos.",
    taller: "Gran Tarajal queda a una media hora de nuestro taller. Te damos cita a una hora concreta para que no esperes, y presupuesto cerrado antes de empezar.",
  },
  {
    indexarTaller: true, indexarVenta: true,
    extraTaller: ["Costa Calma está a unos 45 minutos de nuestro taller (unos 60 km). Para que el viaje compense, concertamos hora fija, te damos el presupuesto cerrado por WhatsApp antes de tocar nada y la fecha de entrega por escrito. Si el trabajo es corto (revisión, frenos, neumáticos) puedes esperar; si es mayor, lo dejas y lo recoges el día acordado.", "La zona de Costa Calma y Cañada del Río recibe mucho viento, que arrastra arena y salitre. En la revisión miramos el filtro de aire, la pintura en las zonas de roce, los bajos y los conectores eléctricos, que son lo primero que se resiente."],
    extraVenta: ["Vienes una vez a Costa de Antigua a ver y probar el coche y, una vez firmada la compra, te lo entregamos gratis en Costa Calma, Cañada del Río o La Lajita con el cambio de nombre hecho. Antes de la visita puedes pedirnos fotos y vídeo por WhatsApp para decidir si merece el viaje (unos 45 minutos).", "Los coches del sur pasan mucho tiempo al sol y al salitre. Por eso, antes de venderlos, revisamos pintura, gomas, aire acondicionado y bajos."],
    faqTaller: [["¿Merece la pena ir desde Costa Calma?", "Si el trabajo es largo o quieres precio cerrado, sí: concertamos hora fija y te damos precio y fecha de entrega por escrito. Para una consulta rápida, escríbenos antes por WhatsApp y te orientamos."]],
    slug: "costa-calma", nombre: "Costa Calma", en: "en Costa Calma", de: "de Costa Calma", municipio: "Pájara", zona: "sur", km: 60, min: 45,
    cerca: ["Cañada del Río", "La Lajita", "Tarajalejo", "Pájara"],
    venta: "Vivas en Costa Calma, Cañada del Río o La Lajita, te llevamos el coche a casa sin coste. Vienes una vez a Costa de Antigua a verlo y firmar, y el coche te lo llevamos nosotros el día que acordemos.",
    taller: "Si vives en el sur, te interesa saber antes de salir cuánto va a costar y cuándo estará listo: te lo damos por escrito. Reserva hora online y evita esperas.",
  },
  {
    indexarTaller: true, indexarVenta: true,
    extraTaller: ["Morro Jable queda a más de una hora de nuestro taller (unos 80 km), así que preparamos el viaje para que no tengas que volver dos veces: antes de salir te confirmamos por WhatsApp la hora de la cita, lo que necesitas llevar y el presupuesto.", "Si lo que necesitas es una revisión sencilla, la pre-ITV, neumáticos o frenos, intentamos dejarlo hecho en el día. Para trabajos mayores te damos la fecha de entrega por escrito."],
    extraVenta: ["Aunque Morro Jable y Jandía queden a más de una hora, comprar con nosotros no te obliga a viajar varias veces: puedes ver el coche por fotos y vídeo, venir una sola vez a probarlo y firmar, y nosotros te lo llevamos a Morro Jable, Jandía, Esquinzo o Butihondo el día que acordemos, con el cambio de nombre hecho."],
    faqTaller: [["¿Cuánto se tarda desde Morro Jable?", "Unos 65 minutos en coche (unos 80 km), según el punto de salida y el tráfico."], ["¿Puedo hacer la pre-ITV y una reparación en el mismo viaje?", "Sí, si lo avisas al pedir la cita: lo organizamos para que quede todo en la misma visita siempre que el trabajo lo permita."]],
    slug: "morro-jable", nombre: "Morro Jable", en: "en Morro Jable", de: "de Morro Jable", municipio: "Pájara", zona: "sur", km: 80, min: 65,
    cerca: ["Jandía", "Esquinzo", "Butihondo", "Costa Calma"],
    venta: "Aunque Morro Jable esté en la otra punta de la isla, la entrega es gratis igualmente. Te enviamos más fotos o un vídeo del coche por WhatsApp y te lo llevamos a Jandía el día que acordemos.",
    taller: "Desde la península de Jandía el viaje es largo, así que lo organizamos bien: presupuesto antes de tocar nada, cita a una hora fija y fecha de entrega por escrito para que no tengas que volver dos veces.",
  },
];

export const porSlug = (s: string) => MUNICIPIOS.find((m) => m.slug === s);
export const RUTAS_VENTA = MUNICIPIOS.map((m) => `/coches-segunda-mano-${m.slug}`);
export const RUTAS_TALLER = MUNICIPIOS.map((m) => `/taller-mecanico-${m.slug}`);
// Solo estas van al mapa del sitio (las demás llevan «noindex»)
export const RUTAS_VENTA_IDX = MUNICIPIOS.filter((m) => m.indexarVenta).map((m) => `/coches-segunda-mano-${m.slug}`);
export const RUTAS_TALLER_IDX = MUNICIPIOS.filter((m) => m.indexarTaller).map((m) => `/taller-mecanico-${m.slug}`);
