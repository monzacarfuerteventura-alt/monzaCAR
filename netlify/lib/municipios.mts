// Municipios y pueblos de Fuerteventura con página propia (venta y taller).
// Distancias y tiempos: por carretera desde nuestra nave de Antigua, APROXIMADOS (dependen del punto exacto y del tráfico).
// Para añadir una zona: copia un bloque, cambia los datos y añade su dirección a netlify/functions/local.mts (config.path).

export type Municipio = {
  slug: string;          // va en la dirección: /coches-segunda-mano-<slug>
  nombre: string;        // como se escribe
  en: string;            // «en Corralejo», «en La Oliva»…
  de: string;            // «de Corralejo», «de La Oliva»…
  municipio: string;     // municipio al que pertenece (para Google y para el texto)
  zona: "norte" | "centro" | "sur";
  km: number;            // distancia aproximada por carretera desde Antigua
  min: number;           // minutos aproximados en coche
  cerca: string[];       // pueblos de alrededor
  venta: string;         // párrafo propio para la página de coches
  taller: string;        // párrafo propio para la página del taller
  // Solo las zonas con contenido propio de verdad se ofrecen a Google. El resto existe (para anuncios y para quien
  // llegue por un enlace) pero con «noindex»: 16 páginas casi iguales son lo que Google llama «páginas puerta».
  indexarTaller?: boolean;
  indexarVenta?: boolean;
  extraTaller?: string[]; // párrafos propios de esa zona (solo en las indexadas)
  extraVenta?: string[];
  faqTaller?: [string, string][];
};

export const MUNICIPIOS: Municipio[] = [
  {
    indexarTaller: true, indexarVenta: true,
    extraTaller: ["El norte de la isla castiga el coche de una forma muy concreta: <b>salitre y arena</b>. La arena fina de la zona de las dunas se mete en el filtro de aire, en el del habitáculo y entre las pastillas y los discos, y el salitre oxida bajos, tubos de freno y anclajes mucho antes que en el interior.", "Por eso, cuando nos traes el coche desde Corralejo, en la revisión miramos con el coche levantado los bajos, los tubos de freno y los anclajes de la suspensión, y te decimos qué conviene vigilar antes de que se convierta en una avería (o en un defecto en la ITV).", "Para llegar, lo más cómodo es bajar por la FV-1 hasta Puerto del Rosario y seguir hacia Antigua: unos 45 minutos sin tráfico. Si lo dejas por la mañana, te avisamos por WhatsApp cuando esté listo."],
    extraVenta: ["En Corralejo, entre El Cotillo, Lajares y Villaverde, mucha gente necesita un coche fiable para moverse por pistas y carreteras con arena. Antes de venderlo, revisamos en nuestro taller los bajos, los frenos y los filtros, que es donde más sufre un coche en el norte."],
    faqTaller: [["¿Me podéis revisar los bajos por el salitre?", "Sí. Levantamos el coche y revisamos bajos, tubos de freno y anclajes. Si hay óxido que conviene tratar, te damos presupuesto por escrito antes de tocar nada."], ["¿Merece la pena el viaje desde Corralejo?", "Te damos el presupuesto por WhatsApp antes de empezar y la fecha de entrega por escrito, así sabes a qué vas. Muchos clientes del norte lo dejan por la mañana y lo recogen por la tarde."]],
    slug: "corralejo", nombre: "Corralejo", en: "en Corralejo", de: "de Corralejo", municipio: "La Oliva", zona: "norte", km: 55, min: 45,
    cerca: ["Lajares", "El Cotillo", "Villaverde", "La Oliva"],
    venta: "Vivas todo el año en Corralejo o acabes de mudarte al norte de la isla, no hace falta que vengas a buscar el coche: una vez firmada la compra te lo llevamos hasta la puerta, con la documentación y el cambio de nombre hechos.",
    taller: "Muchos clientes del norte aprovechan para dejar el coche por la mañana y recogerlo a última hora. Te damos el presupuesto por WhatsApp antes de tocar nada y la fecha de entrega por escrito, para que no hagas el viaje en balde.",
  },
  {
    slug: "la-oliva", nombre: "La Oliva", en: "en La Oliva", de: "de La Oliva", municipio: "La Oliva", zona: "norte", km: 42, min: 35,
    cerca: ["Villaverde", "Lajares", "Tindaya", "El Cotillo", "Corralejo"],
    venta: "Desde el pueblo de La Oliva hasta Villaverde, Lajares o Tindaya: elige el coche en la web, pruébalo cuando te venga bien y nosotros te lo entregamos en casa sin coste.",
    taller: "Si vives en el municipio de La Oliva y buscas un taller de confianza, en Antigua te atendemos con cita: sabes el precio antes de empezar y el día en que tendrás el coche listo.",
  },
  {
    indexarTaller: true, indexarVenta: true,
    extraTaller: ["Desde la capital estamos a unos 20 minutos por la FV-20, la carretera del centro hacia Antigua. Es un buen trayecto para dejar el coche por la mañana y organizarte el día: te mandamos el presupuesto por WhatsApp y no tocamos nada sin tu permiso.", "Los coches que se mueven sobre todo por ciudad, con muchos arranques en frío y trayectos cortos, gastan antes frenos, batería y embrague. En la revisión lo medimos y te lo explicamos con fotos, para que decidas tú qué se hace y cuándo."],
    extraVenta: ["En Puerto del Rosario se venden muchos coches usados entre particulares, sin garantía y sin revisar. Nosotros vendemos cada coche después de pasarlo por nuestro taller, con 12 meses de garantía legal, y te lo llevamos gratis a casa o al trabajo."],
    faqTaller: [["¿Cuánto se tarda desde Puerto del Rosario?", "Unos 20 minutos en coche por la FV-20 hacia Antigua, según el punto de salida y el tráfico."], ["¿Tenéis cita a primera hora?", "Abrimos a las 8:00. Reserva la hora en la web y la cita queda confirmada al momento."]],
    slug: "puerto-del-rosario", nombre: "Puerto del Rosario", en: "en Puerto del Rosario", de: "de Puerto del Rosario", municipio: "Puerto del Rosario", zona: "centro", km: 20, min: 20,
    cerca: ["El Matorral", "Tetir", "Puerto Lajas", "Casillas del Ángel"],
    venta: "En la capital hay mucha oferta de coches usados, pero pocos se venden revisados en taller propio y con 12 meses de garantía legal. Nosotros te lo llevamos a tu casa o a tu trabajo en Puerto del Rosario, sin coste.",
    taller: "Estamos a unos veinte minutos de Puerto del Rosario. Reserva hora online, tráenos el coche y te decimos por WhatsApp qué tiene y cuánto cuesta antes de reparar nada.",
  },
  {
    indexarTaller: true, indexarVenta: false,
    extraTaller: ["Somos el taller del Polígono Industrial de Antigua: si vives en el pueblo, en Valles de Ortega, Triquivijate o Agua de Bueyes, estás a pocos minutos. Puedes traer el coche andando de vuelta a casa y te avisamos por WhatsApp cuando esté listo.", "Hacemos mecánica de todas las marcas, chapa y pintura y la pre-ITV, con presupuesto por escrito antes de empezar y fecha de entrega por escrito."],
    faqTaller: [["¿Dónde estáis exactamente?", "En la Calle Valle Largo, Nave 8, dentro del Polígono Industrial de Antigua. En Google Maps nos encuentras como Volcano Cars."]],
    slug: "antigua", nombre: "Antigua", en: "en Antigua", de: "de Antigua", municipio: "Antigua", zona: "centro", km: 3, min: 5,
    cerca: ["Valles de Ortega", "Triquivijate", "Agua de Bueyes", "Caleta de Fuste", "Pozo Negro"],
    venta: "Somos vecinos: nuestra nave está en el Polígono Industrial de Antigua. Puedes venir a ver y probar cualquier coche cuando quieras y, si lo prefieres, te lo dejamos en la puerta de casa sin coste.",
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
    extraVenta: ["En el sur de la isla hay menos oferta de coches revisados con garantía. Elige en la web, ven un día a verlo y probarlo a Antigua y, una vez firmada la compra, te lo llevamos gratis a Gran Tarajal, Las Playitas o Tarajalejo."],
    faqTaller: [["¿Podéis arreglar lo que me ha salido en la ITV?", "Sí. Con el informe de la inspección te damos presupuesto y fecha de entrega por escrito. <a href='/itv-fuerteventura/'>Guía de la ITV en Fuerteventura</a>."]],
    slug: "gran-tarajal", nombre: "Gran Tarajal", en: "en Gran Tarajal", de: "de Gran Tarajal", municipio: "Tuineje", zona: "sur", km: 30, min: 30,
    cerca: ["Tuineje", "Las Playitas", "Tarajalejo", "Giniginámar", "Tiscamanita"],
    venta: "Para el municipio de Tuineje, de Gran Tarajal a Las Playitas o Tarajalejo, la entrega también es gratis: firmas, y nosotros te llevamos el coche el día y a la hora que acordemos.",
    taller: "Gran Tarajal queda a una media hora de nuestro taller. Te damos cita a una hora concreta para que no esperes, y presupuesto cerrado antes de empezar.",
  },
  {
    slug: "costa-calma", nombre: "Costa Calma", en: "en Costa Calma", de: "de Costa Calma", municipio: "Pájara", zona: "sur", km: 60, min: 45,
    cerca: ["Cañada del Río", "La Lajita", "Tarajalejo", "Pájara"],
    venta: "Vivas en Costa Calma, Cañada del Río o La Lajita, te llevamos el coche a casa sin coste. Vienes una vez a Antigua a verlo y firmar, y el coche te lo llevamos nosotros el día que acordemos.",
    taller: "Si vives en el sur, te interesa saber antes de salir cuánto va a costar y cuándo estará listo: te lo damos por escrito. Reserva hora online y evita esperas.",
  },
  {
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
