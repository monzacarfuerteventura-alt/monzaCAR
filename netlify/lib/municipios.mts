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
};

export const MUNICIPIOS: Municipio[] = [
  {
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
    slug: "puerto-del-rosario", nombre: "Puerto del Rosario", en: "en Puerto del Rosario", de: "de Puerto del Rosario", municipio: "Puerto del Rosario", zona: "centro", km: 20, min: 20,
    cerca: ["El Matorral", "Tetir", "Puerto Lajas", "Casillas del Ángel"],
    venta: "En la capital hay mucha oferta de coches usados, pero pocos se venden revisados en taller propio y con un año de garantía. Nosotros te lo llevamos a tu casa o a tu trabajo en Puerto del Rosario, sin coste.",
    taller: "Estamos a unos veinte minutos de Puerto del Rosario. Reserva hora online, tráenos el coche y te decimos por WhatsApp qué tiene y cuánto cuesta antes de reparar nada.",
  },
  {
    slug: "antigua", nombre: "Antigua", en: "en Antigua", de: "de Antigua", municipio: "Antigua", zona: "centro", km: 3, min: 5,
    cerca: ["Valles de Ortega", "Triquivijate", "Agua de Bueyes", "Caleta de Fuste", "Pozo Negro"],
    venta: "Somos vecinos: nuestra nave está en el Polígono Industrial de Antigua. Puedes venir a ver y probar cualquier coche cuando quieras y, si lo prefieres, te lo dejamos en la puerta de casa sin coste.",
    taller: "Nuestro taller está en el propio municipio de Antigua. Pide cita online, te damos el presupuesto antes de empezar y la fecha de entrega por escrito.",
  },
  {
    slug: "caleta-de-fuste", nombre: "Caleta de Fuste", en: "en Caleta de Fuste", de: "de Caleta de Fuste", municipio: "Antigua", zona: "centro", km: 12, min: 15,
    cerca: ["El Castillo", "Las Salinas", "Nuevo Horizonte", "Costa de Antigua"],
    venta: "Caleta de Fuste (El Castillo) pertenece a nuestro municipio. Elige el coche en la web, pruébalo a un cuarto de hora de casa y te lo entregamos gratis donde nos digas.",
    taller: "Desde Caleta de Fuste llegas a nuestro taller en unos quince minutos. Ideal para dejar el coche y seguir con tu día: te avisamos por WhatsApp en cuanto esté listo.",
  },
  {
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
