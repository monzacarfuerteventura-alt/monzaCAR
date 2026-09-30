/*
  GUIONES DE LOS VÍDEOS DE AYUDA (voz «DAN»)
  ------------------------------------------
  Un guion por vídeo de la pestaña Ayuda (public/ayuda/videos/<id>.mp4). Cada línea empieza en el segundo `t`
  del vídeo (los mismos momentos que los pasos que se ven en pantalla) y está escrita para que se entienda
  a la primera: frases cortas, palabras de todos los días, una sola idea por frase.
  `txt` es lo que se lee en pantalla; `voz` (opcional) es cómo se pronuncia cuando hay siglas o números.
  Regla de duración: como mucho ~2,5 palabras por segundo hasta la línea siguiente (lo comprueba la prueba
  tools/pruebas/e2e-voz.mjs), para que la voz nunca se pise ni se salga del vídeo.
*/
export type LineaGuion = { t: number; txt: string; voz?: string };
export type Guion = { id: string; titulo: string; dur: number; lineas: LineaGuion[] };

export const GUIONES: Guion[] = [
  { id: "inicio", titulo: "Primeros pasos", dur: 21.2, lineas: [
    { t: 0.2, txt: "Vamos a entrar al panel." },
    { t: 2.6, txt: "Escribe tu contraseña de gerente." },
    { t: 5.8, txt: "Después, pulsa el botón Entrar." },
    { t: 8.7, txt: "Arriba tienes las pestañas del negocio." },
    { t: 11.4, txt: "Toca una, por ejemplo el CRM.", voz: "Toca una, por ejemplo el ce erre eme." },
    { t: 14.3, txt: "¿Tienes dudas? En cualquier pantalla, pulsa Cómo funciona, y te lo explico." },
  ] },
  { id: "dash", titulo: "Dashboard", dur: 28.7, lineas: [
    { t: 0.2, txt: "Este es el dashboard." },
    { t: 2.5, txt: "Arriba, los números clave del mes." },
    { t: 5.1, txt: "Toca una tarjeta y se abre su detalle." },
    { t: 8.5, txt: "Aquí, la previsión del mes." },
    { t: 10.7, txt: "Mueve los deslizadores y prueba cambios." },
    { t: 13.8, txt: "Aquí, oportunidades para vender hoy mismo, en vivo." },
    { t: 19.5, txt: "Pulsa Informe PDF para guardarlo. Y los lunes te llega uno solo, sin pedirlo.", voz: "Pulsa Informe pe de efe para guardarlo. Y los lunes te llega uno solo, sin pedirlo." },
  ] },
  { id: "crm", titulo: "CRM", dur: 34.2, lineas: [
    { t: 0.2, txt: "Apuntamos un cliente nuevo." },
    { t: 2.5, txt: "Si alguien llama, pulsa Nuevo cliente." },
    { t: 4.9, txt: "Escribe su nombre y su teléfono. Nada más." },
    { t: 9.4, txt: "Elige qué busca y cómo llegó hasta ti." },
    { t: 15.6, txt: "Pulsa Guardar: se abre su ficha." },
    { t: 18.2, txt: "Elige un mensaje y ábrelo en WhatsApp. Ya viene escrito." },
    { t: 22.8, txt: "Apunta lo que has hecho." },
    { t: 25.0, txt: "Pon cuándo volver a llamarle y cambia su estado. Así no se te olvida nadie." },
  ] },
  { id: "agenda", titulo: "Agenda", dur: 18.4, lineas: [
    { t: 0.2, txt: "Esta es la agenda." },
    { t: 2.5, txt: "Aquí están las citas de hoy." },
    { t: 4.8, txt: "Avisa al cliente por WhatsApp." },
    { t: 6.9, txt: "Cuando venga, pulsa Hecha." },
    { t: 9.8, txt: "¿Vacaciones o festivo? Cierra ese día y nadie podrá reservar cita." },
  ] },
  { id: "coches", titulo: "Coches y reservas", dur: 34.3, lineas: [
    { t: 0.2, txt: "Publicamos un coche nuevo." },
    { t: 2.5, txt: "Pulsa Añadir coche." },
    { t: 5.0, txt: "Pon la marca, el modelo, el año, los kilómetros y el precio final. Rellena todo con calma." },
    { t: 14.2, txt: "Sube las fotos: arrástralas aquí." },
    { t: 16.4, txt: "Pon los precios de la competencia: la web enseña si estás por debajo." },
    { t: 21.4, txt: "Cuéntalo en tres líneas: para quién es y por qué este coche." },
    { t: 26.9, txt: "Pulsa Publicar coche, y aparece al momento en la web." },
  ] },
  { id: "taller", titulo: "Taller · Sistema 01", dur: 38.1, lineas: [
    { t: 0.2, txt: "Entra un coche al taller." },
    { t: 2.5, txt: "Pulsa Nueva recepción." },
    { t: 4.9, txt: "Escribe el cliente, su teléfono, la matrícula y el modelo del coche." },
    { t: 13.4, txt: "Pulsa Crear y abrir. Ya tiene número." },
    { t: 16.2, txt: "Apunta los kilómetros y la gasolina que tiene." },
    { t: 19.7, txt: "Toca los testigos encendidos y escribe qué le pasa." },
    { t: 25.4, txt: "Firma y cierra la recepción." },
    { t: 27.4, txt: "Después vienen las fichas dos, tres y cuatro: inspección, tiempos y calidad." },
  ] },
  { id: "alm", titulo: "Inventario", dur: 29.8, lineas: [
    { t: 0.2, txt: "Vamos a guardar una pieza." },
    { t: 2.5, txt: "Pulsa Nueva pieza." },
    { t: 4.8, txt: "Escribe el nombre, dónde está guardada y cuántas quieres tener como mínimo." },
    { t: 15.0, txt: "Guarda: ya tiene código y etiqueta QR.", voz: "Guarda: ya tiene código y etiqueta cu erre." },
    { t: 17.8, txt: "Al llegar material, anótalo." },
    { t: 19.6, txt: "Si algo baja del mínimo, aparece solo en Pedido. Así nunca te quedas sin piezas." },
  ] },
  { id: "caja", titulo: "Control de Caja", dur: 35.5, lineas: [
    { t: 0.2, txt: "Vamos a abrir la caja." },
    { t: 2.5, txt: "Pulsa Abrir la caja." },
    { t: 4.9, txt: "Cuenta el dinero con más y menos: billetes y monedas." },
    { t: 12.1, txt: "Confirma. Si no cuadra, explica por qué." },
    { t: 14.8, txt: "Cada cobro en efectivo, apúntalo en el momento. Así la caja siempre cuadra." },
    { t: 25.4, txt: "Las salidas, con foto del ticket. Y al final del turno, pulsa Cerrar la caja." },
  ] },
  { id: "jornada", titulo: "Fichaje y jornada", dur: 31.6, lineas: [
    { t: 0.2, txt: "Vamos a fichar." },
    { t: 2.5, txt: "Entra con tu usuario y tu PIN, tus números secretos.", voz: "Entra con tu usuario y tu pin, tus números secretos." },
    { t: 8.9, txt: "Pulsa el botón grande para empezar la jornada." },
    { t: 12.9, txt: "Ya estás trabajando." },
    { t: 14.7, txt: "¿Descanso o comida? Toca el reloj y Iniciar pausa." },
    { t: 19.3, txt: "Al volver, pulsa Reanudar." },
    { t: 22.1, txt: "Al irte, toca el reloj y Registrar salida." },
  ] },
];

// Ajustes de la voz (ElevenLabs): los pide el gerente
export const VOZ_AJUSTES = { modelo: "eleven_multilingual_v2", stability: 0.5, similarity_boost: 0.8, formato: "mp3_44100_128", nombre: "DAN" };
export const palabras = (t: string) => (t.match(/[\p{L}\p{N}]+/gu) || []).length;
export const guion = (id: string) => GUIONES.find((g) => g.id === id);
// Cuánto tiempo (s) tiene cada línea hasta que empieza la siguiente (o acaba el vídeo)
export const huecos = (g: Guion) => g.lineas.map((l, i) => (i + 1 < g.lineas.length ? g.lineas[i + 1].t : g.dur) - l.t);
