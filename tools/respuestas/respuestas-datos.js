/* =====================================================================
   RESPUESTAS · textos para contestar reseñas de Google (y, más adelante,
   WhatsApp, Instagram y Facebook). Solo datos y el generador: la pantalla
   está en respuestas.js. Para cambiar un texto, edítalo aquí y ejecuta
   python3 tools/respuestas/inyectar.py  (y python3 tools/respuestas/pdf.py para el PDF).
   Reglas de estilo: tú, frases cortas, nada de datos del cliente (matrícula,
   importes, averías), las quejas se llevan al teléfono y se firma como equipo.
   ===================================================================== */
const RS_TEL = "643 56 60 98";
const RS_SERV = [
  ["taller","Taller mecánico","Mechanical repair"],
  ["chapa","Chapa y pintura","Bodywork & paint"],
  ["coche","Compra de coche","Car purchase"],
  ["itv","Pre-ITV","Pre-MOT check"],
  ["general","General / no lo sé","General"]
];
const RS_CASOS = {
  5: [["texto","Con comentario"],["solo","Solo estrellas, sin texto"]],
  4: [["texto","Con comentario"],["solo","Solo estrellas, sin texto"]],
  3: [["neutra","Neutra / regular"]],
  2: [["queja","Cliente con una queja"],["precio","Queja por el precio"],["plazo","Queja por el retraso"],["noconsta","No nos consta como cliente"]],
  1: [["queja","Cliente con una queja"],["precio","Queja por el precio"],["plazo","Queja por el retraso"],["noconsta","No nos consta como cliente"]]
};
const RS_DESTACA = [
  ["atencion","El trato / la atención"],["rapidez","La rapidez"],["precio","El precio"],["calidad","La calidad del trabajo"],
  ["digital","La web / seguir todo desde el móvil"],["cita","La cita online"],["ingles","Atención en inglés"],["entrega","La entrega del coche a domicilio"]
];

const RS_T = {
es: {
  hola: n => n ? [`¡Hola, ${n}!`, `Hola, ${n}:`] : ["¡Hola!", "Hola:"],
  graciasTexto: ["Muchísimas gracias por tu reseña.", "Gracias de corazón por tomarte el tiempo de escribirnos.", "Qué alegría leer tu comentario."],
  serv: {
    taller: ["Nos alegra saber que tu coche salió del taller como esperabas.", "Que confíes en nuestro taller de Costa de Antigua para cuidar tu coche es lo que más valoramos.", "Nos encanta saber que quedaste contento con el trabajo en tu coche."],
    chapa: ["Nos alegra mucho que el acabado de chapa y pintura te haya convencido.", "Ver cómo queda un coche después de pasar por chapa y pintura es lo que más nos gusta de este trabajo, y nos alegra que el resultado te haya gustado.", "Que tu coche haya vuelto a quedar como el primer día es justo lo que buscamos."],
    coche: ["Nos alegra muchísimo que estés contento con tu coche. ¡Que lo disfrutes muchos kilómetros por Fuerteventura!", "Que hayas elegido tu coche con nosotros es un orgullo. ¡A disfrutarlo!", "Nos alegra que la compra de tu coche haya ido tan bien. ¡Que lo disfrutes por toda la isla!"],
    itv: ["Nos alegra que tu coche esté listo para pasar la ITV sin sorpresas.", "Que llegues a la ITV con todo revisado y tranquilo es justo lo que buscamos.", "Nos alegra haberte ayudado a dejar el coche listo para la ITV."],
    general: ["Nos alegra que hayas quedado contento con Volcano Cars.", "Nos alegra mucho que tu experiencia con nosotros haya sido buena.", "Nos alegra saber que todo fue como esperabas."]
  },
  dest: {
    atencion: ["Nos quedamos con lo que dices del trato: es lo que cuidamos cada día.", "Que destaques la atención nos llena de orgullo, porque es en lo que más nos esforzamos."],
    rapidez: ["Cumplir los plazos es un compromiso para nosotros, así que nos alegra que lo hayas notado.", "Sabemos lo que es estar sin coche, por eso intentamos ser rápidos sin descuidar nada."],
    precio: ["Intentamos que el precio sea siempre claro y justo, sin sorpresas, y nos alegra que lo valores.", "Nos alegra que el precio te haya parecido justo: siempre damos el presupuesto por escrito antes de empezar."],
    calidad: ["Cuidamos cada trabajo como si fuera nuestro propio coche, así que tu comentario nos anima mucho.", "Que valores la calidad del trabajo es el mejor reconocimiento para el equipo."],
    digital: ["Hemos trabajado mucho para que pedir cita, seguir el proceso y hablar con nosotros sea fácil desde el móvil, así que nos hace mucha ilusión que lo hayas notado.", "Que valores lo sencillo que es todo desde la web y el móvil nos anima a seguir mejorando."],
    cita: ["Nos alegra que pedir cita desde la web te haya resultado tan fácil.", "Para eso pusimos la cita online con confirmación al momento: para que no tengas que esperar ni llamar."],
    ingles: ["Nos alegra haber podido atenderte en inglés sin problema.", "Atender a cada cliente en su idioma es importante para nosotros."],
    entrega: ["Nos alegra que la entrega a domicilio te haya facilitado las cosas.", "Llevarte el coche a casa es parte del servicio, y nos alegra que lo hayas valorado."]
  },
  cierrePos: ["Aquí nos tienes en Costa de Antigua para lo que necesites.", "Gracias por confiar en nosotros y por recomendarnos.", "Te esperamos para la próxima."],
  solo5: [n => `Muchas gracias por las 5 estrellas${n ? ", " + n : ""}. Nos alegra mucho que hayas quedado contento. Aquí nos tienes para lo que necesites.`,
          n => `¡Gracias por tu valoración${n ? ", " + n : ""}! Que quedes contento es lo que buscamos cada día. Te esperamos para la próxima.`,
          n => `Mil gracias por confiar en Volcano Cars${n ? ", " + n : ""}. Nos alegra que todo haya ido bien. ¡Hasta pronto!`],
  solo4: [n => `Muchas gracias por tu valoración${n ? ", " + n : ""}. Nos alegra que hayas quedado contento. Si hay algo que podamos hacer mejor para ganarnos la quinta estrella, nos encantaría saberlo: escríbenos o llámanos al ${RS_TEL}.`,
          n => `¡Gracias por las 4 estrellas${n ? ", " + n : ""}! Nos alegra que la experiencia haya sido buena. Si algo se puede mejorar, cuéntanoslo en el ${RS_TEL}: nos ayuda mucho.`],
  mejora4: [`Nos quedamos con ganas de ganarnos la quinta estrella: si hay algo que podamos mejorar, cuéntanoslo en el ${RS_TEL}, nos ayuda mucho.`, `Si algo no estuvo a la altura, nos encantaría saberlo para mejorarlo: estamos en el ${RS_TEL}.`],
  neutra: [`Gracias por tu opinión. Nos alegra que el trabajo saliera adelante, pero vemos que la experiencia no fue todo lo buena que queremos que sea.`, `Gracias por tomarte el tiempo de valorarnos. Queremos que cada cliente se vaya contento del todo, y parece que esta vez no lo conseguimos.`],
  neutraCierre: [`Nos gustaría saber qué podemos mejorar: llámanos o escríbenos al ${RS_TEL} y lo hablamos.`, `Si nos cuentas qué echaste en falta en el ${RS_TEL}, lo tendremos muy en cuenta.`],
  queja: [`Sentimos mucho que tu experiencia no haya sido buena. No es lo que queremos para ningún cliente.`, `Lamentamos que no hayas quedado contento. Nos tomamos muy en serio cada opinión.`],
  precio: [`Entendemos tu comentario sobre el precio. Antes de empezar damos siempre el presupuesto por escrito y no hacemos ningún trabajo sin la aprobación del cliente. Si algo de la factura no te quedó claro, queremos revisarlo contigo línea por línea.`, `Sentimos que el precio no te haya convencido. Siempre trabajamos con presupuesto por escrito aprobado antes de empezar, y nos gustaría repasar contigo la factura para aclarar cualquier duda.`],
  plazo: [`Sentimos mucho el retraso: sabemos lo que supone quedarse sin coche. Por eso tenemos un compromiso de plazo: si no cumplimos la fecha acordada, descontamos el 10 % de la mano de obra por cada día laborable de retraso, hasta el 50 %. Si no se te aplicó, queremos revisarlo.`, `Te pedimos disculpas por no cumplir el plazo. Si nos retrasamos respecto a la fecha acordada, aplicamos el descuento de nuestro compromiso de plazo; si en tu caso no se aplicó, queremos corregirlo.`],
  quejaCierre: [`Nos gustaría hablar contigo y buscar una solución: llámanos o escríbenos al ${RS_TEL} y pregunta por el responsable del taller.`, `Por favor, contacta con nosotros en el ${RS_TEL} para que podamos verlo contigo y darte una solución.`],
  noconsta: [`Gracias por tu comentario. Hemos revisado nuestros registros y no encontramos ninguna visita, reparación o compra con este nombre. Puede que se trate de otro taller o de un error.`, `Gracias por escribirnos. No encontramos ningún servicio a este nombre en nuestros registros, así que es posible que la reseña sea para otro negocio.`],
  noconstaCierre: [`Si fuiste cliente nuestro, llámanos al ${RS_TEL} y lo vemos juntos: queremos solucionarlo.`, `Si nos equivocamos y fuiste cliente, escríbenos al ${RS_TEL} con tus datos y lo revisamos enseguida.`],
  firma: ["Un saludo,\nEl equipo de Volcano Cars", "— Equipo Volcano Cars", "Un abrazo,\nEl equipo de Volcano Cars"]
},
en: {
  hola: n => n ? [`Hi ${n}!`, `Hi ${n},`] : ["Hi!", "Hello,"],
  graciasTexto: ["Thank you so much for your review.", "Thanks a lot for taking the time to write to us.", "What a joy to read your comment."],
  serv: {
    taller: ["We're glad your car left the workshop just as you expected.", "Your trust in our workshop in Costa de Antigua means a lot to us.", "We're really happy you were pleased with the work on your car."],
    chapa: ["We're so glad you liked the bodywork and paint finish.", "Seeing a car looking like new after bodywork is the best part of our job, and we're glad you loved the result.", "Getting your car back looking like day one is exactly what we aim for."],
    coche: ["We're delighted you're happy with your car. Enjoy many miles around Fuerteventura!", "We're proud you chose your car with us. Enjoy it!", "We're glad buying your car went so smoothly. Enjoy it all over the island!"],
    itv: ["We're glad your car is ready to pass the ITV with no surprises.", "Getting to the ITV with everything checked and peace of mind is exactly what we aim for.", "We're happy we could help get your car ready for the ITV."],
    general: ["We're glad you were happy with Volcano Cars.", "We're really pleased your experience with us was a good one.", "We're glad everything went as you expected."]
  },
  dest: {
    atencion: ["We love what you say about the service: it's what we care about every day.", "Hearing you valued how we looked after you makes us very proud."],
    rapidez: ["Meeting deadlines is a commitment for us, so we're glad you noticed.", "We know what it's like to be without a car, so we try to be quick without cutting corners."],
    precio: ["We always aim for clear, fair prices with no surprises, and we're glad you appreciated it.", "We're glad the price felt fair: we always give a written quote before starting."],
    calidad: ["We treat every job as if it were our own car, so your words mean a lot.", "Your comment about the quality of the work is the best recognition for the team."],
    digital: ["We've worked hard to make booking, following the process and talking to us easy from your phone, so we're glad you noticed.", "Hearing how easy everything was from the website and your phone encourages us to keep improving."],
    cita: ["We're glad booking online was so easy for you.", "That's why we set up online booking with instant confirmation: no waiting, no calls."],
    ingles: ["We're glad we could look after you in English.", "Helping every customer in their own language matters to us."],
    entrega: ["We're glad home delivery made things easier for you.", "Bringing the car to your door is part of the service, and we're happy you valued it."]
  },
  cierrePos: ["We're here in Costa de Antigua whenever you need us.", "Thanks for trusting us and recommending us.", "See you next time!"],
  solo5: [n => `Thank you so much for the 5 stars${n ? ", " + n : ""}. We're really glad you were happy. We're here whenever you need us.`,
          n => `Thanks for your rating${n ? ", " + n : ""}! Happy customers are what we work for every day. See you next time.`,
          n => `Many thanks for trusting Volcano Cars${n ? ", " + n : ""}. We're glad everything went well. See you soon!`],
  solo4: [n => `Thanks a lot for your rating${n ? ", " + n : ""}. We're glad you were happy. If there's anything we could do better to earn that fifth star, we'd love to hear it: message or call us on +34 ${RS_TEL}.`,
          n => `Thanks for the 4 stars${n ? ", " + n : ""}! We're glad it was a good experience. If anything could be better, let us know on +34 ${RS_TEL}: it really helps.`],
  mejora4: [`We'd love to earn that fifth star: if there's anything we could improve, tell us on +34 ${RS_TEL}, it really helps.`, `If anything wasn't up to standard, we'd like to know so we can fix it: we're on +34 ${RS_TEL}.`],
  neutra: [`Thanks for your feedback. We're glad the job got done, but we can see the experience wasn't as good as we want it to be.`, `Thanks for taking the time to rate us. We want every customer to leave completely happy, and it seems we didn't manage it this time.`],
  neutraCierre: [`We'd like to know what we can improve: call or message us on +34 ${RS_TEL} and let's talk.`, `If you tell us what was missing on +34 ${RS_TEL}, we'll take it on board.`],
  queja: [`We're very sorry your experience wasn't a good one. It's not what we want for any customer.`, `We're sorry you weren't happy. We take every review very seriously.`],
  precio: [`We understand your comment about the price. We always give a written quote before starting and never do any work without the customer's approval. If anything on the invoice wasn't clear, we'd like to go through it with you line by line.`, `We're sorry the price didn't convince you. We always work with a written quote approved before we start, and we'd like to go over the invoice with you to clear up any doubts.`],
  plazo: [`We're very sorry about the delay: we know what it means to be without a car. That's why we have a finish-date commitment: if we miss the agreed date, we take 10% off the labour for each working day late, up to 50%. If it wasn't applied, we want to check it.`, `We apologise for missing the deadline. If we're late on the agreed date, our finish-date discount applies; if it wasn't applied in your case, we want to put it right.`],
  quejaCierre: [`We'd like to talk to you and find a solution: please call or message us on +34 ${RS_TEL} and ask for the workshop manager.`, `Please get in touch on +34 ${RS_TEL} so we can go through it with you and find a solution.`],
  noconsta: [`Thanks for your comment. We've checked our records and can't find any visit, repair or purchase under this name. It may be a different garage or a mistake.`, `Thanks for writing. We can't find any service under this name in our records, so the review may be meant for another business.`],
  noconstaCierre: [`If you were our customer, please call us on +34 ${RS_TEL} and we'll look into it together: we want to fix it.`, `If we're wrong and you were a customer, message us on +34 ${RS_TEL} with your details and we'll check straight away.`],
  firma: ["Best regards,\nThe Volcano Cars team", "— The Volcano Cars team", "Kind regards,\nThe Volcano Cars team"]
}};

/* o = {nombre, estrellas, caso, serv, destaca:[...], idioma, v} → texto */
function rsGenerar(o){
  const T = RS_T[o.idioma] || RS_T.es, v = o.v || 0, e = Number(o.estrellas) || 5;
  const n = String(o.nombre || "").trim().split(/\s+/)[0] || "";
  const pick = (a, k = 0) => a[(v + k) % a.length];
  const partes = []; let saludo = "";
  const serv = T.serv[o.serv] || T.serv.general;
  if (e >= 4 && o.caso === "solo") {
    partes.push(pick(e === 5 ? T.solo5 : T.solo4)(n));
  } else if (e >= 4) {
    saludo = pick(T.hola(n)); partes.push(pick(T.graciasTexto, 1));
    partes.push(pick(serv, 2));
    (o.destaca || []).slice(0, 2).forEach((d, i) => { if (T.dest[d]) partes.push(pick(T.dest[d], i)); });
    if (e === 4) partes.push(pick(T.mejora4));
    partes.push(pick(T.cierrePos, 1));
  } else if (e === 3) {
    saludo = T.hola(n)[1]; partes.push(pick(T.neutra));
    partes.push(pick(T.neutraCierre, 1));
  } else {
    const c = o.caso || "queja";
    saludo = T.hola(n)[1]; partes.push(pick(T[c === "noconsta" ? "noconsta" : c === "precio" ? "precio" : c === "plazo" ? "plazo" : "queja"]));
    partes.push(pick(T[c === "noconsta" ? "noconstaCierre" : "quejaCierre"], 1));
  }
  return (saludo ? saludo + "\n\n" : "") + partes.join(" ") + "\n\n" + pick(T.firma);
}

/* =====================================================================
   WHATSAPP · mensajes listos (respuestas rápidas de WhatsApp Business)
   Marcadores: {n} = «, Nombre» o nada · {nombre} · {coche} · {cuando} · {link} · {mapa} · {resena} · {web}
   ===================================================================== */
const RS_WA_DATOS = {web:"volcanocars.com", mapa:"https://maps.app.goo.gl/dz8icDhkUkB4oznd8", resena:"https://g.page/r/Caeh6Wr6CwtNEBM/review"};
const RS_WA = [
 {g:"Automáticos (se configuran una vez)", k:"bienvenida", a:"(automático)", t:"Mensaje de bienvenida",
  es:"¡Hola! 👋 Gracias por escribir a Volcano Cars: taller mecánico, chapa y pintura y coches de ocasión en Costa de Antigua. Cuéntanos qué coche es y qué necesitas, y te respondemos enseguida. Si lo prefieres, pide cita aquí: {web}/taller",
  en:"Hi! 👋 Thanks for messaging Volcano Cars: mechanics, bodywork & paint and used cars in Costa de Antigua. Tell us about your car and what you need, and we'll get back to you right away. You can also book here: {web}/taller"},
 {g:"Automáticos (se configuran una vez)", k:"ausencia", a:"(automático)", t:"Mensaje de ausencia (fuera de horario)",
  es:"¡Hola! Ahora estamos fuera del horario del taller (lunes a viernes, de 8:00 a 16:00). Déjanos el coche y lo que necesitas y te respondemos a primera hora. Si quieres adelantar, pide cita aquí: {web}/taller",
  en:"Hi! We're outside workshop hours right now (Monday to Friday, 8:00 to 16:00). Leave us your car details and what you need, and we'll reply first thing. To get ahead, book here: {web}/taller"},
 {g:"Primer contacto", k:"hola", a:"/hola", t:"Saludo y 2 preguntas clave",
  es:"¡Hola{n}! Gracias por escribirnos. Para ayudarte rápido: ¿qué coche es (marca, modelo y año) y qué le pasa o qué necesitas?",
  en:"Hi{n}! Thanks for your message. To help you quickly: what car is it (make, model and year) and what's the problem or what do you need?"},
 {g:"Primer contacto", k:"ubicacion", a:"/ubicacion", t:"Dónde estamos",
  es:"Estamos en Calle Valle Largo, Nave 8, Polígono Industrial de Costa de Antigua. Aquí tienes el mapa: {mapa} · Lunes a viernes, de 8:00 a 16:00.",
  en:"We're at Calle Valle Largo, Nave 8, Costa de Antigua industrial estate. Here's the map: {mapa} · Monday to Friday, 8:00 to 16:00."},
 {g:"Primer contacto", k:"horario", a:"/horario", t:"Horario",
  es:"Abrimos de lunes a viernes, de 8:00 a 16:00, sin cerrar a mediodía. Sábados y domingos, cerrado.",
  en:"We're open Monday to Friday, 8:00 to 16:00, straight through lunch. Closed on weekends."},
 {g:"Taller", k:"cita", a:"/cita", t:"Proponer cita",
  es:"Perfecto{n}. ¿Te viene bien {cuando}? Si prefieres otro momento, dime qué día te encaja y te lo reservo.",
  en:"Perfect{n}. Does {cuando} work for you? If not, tell me which day suits you and I'll book it."},
 {g:"Taller", k:"citaok", a:"/citaok", t:"Cita confirmada",
  es:"¡Hecho{n}! Te esperamos {cuando} en Calle Valle Largo, Nave 8 (Pol. Ind. de Costa de Antigua). Ubicación: {mapa} · Si te surge algo, avísanos por aquí.",
  en:"Done{n}! See you {cuando} at Calle Valle Largo, Nave 8 (Costa de Antigua industrial estate). Location: {mapa} · If anything comes up, just let us know here."},
 {g:"Taller", k:"recordatorio", a:"/recordatorio", t:"Recordatorio el día antes",
  es:"Hola{n}, te recordamos tu cita en Volcano Cars {cuando}. ¿Nos confirmas que vienes? 👍",
  en:"Hi{n}, just a reminder of your appointment at Volcano Cars {cuando}. Can you confirm you're coming? 👍"},
 {g:"Taller", k:"foto", a:"/foto", t:"Pedir fotos del golpe (chapa)",
  es:"Para darte una idea de precio sin que tengas que venir, mándanos 2 fotos del golpe: una de cerca y otra desde 2-3 metros con el coche entero. O súbelas aquí: {web}/taller#foto",
  en:"To give you a price idea without coming in, send us 2 photos of the damage: one close up and one from 2-3 metres showing the whole car. Or upload them here: {web}/taller#foto"},
 {g:"Taller", k:"presupuesto", a:"/presupuesto", t:"Presupuesto enviado",
  es:"Hola{n}, ya tienes el presupuesto de tu {coche}. Puedes verlo y aprobarlo aquí: {link} · Sin tu aprobación no tocamos nada. ¿Te parecería mal que lo empecemos {cuando}?",
  en:"Hi{n}, your quote for the {coche} is ready. You can see and approve it here: {link} · We don't touch anything without your OK. Would it be a problem if we started {cuando}?"},
 {g:"Taller", k:"listo", a:"/listo", t:"Coche listo para recoger",
  es:"¡Hola{n}! Tu {coche} ya está listo 🚗 Puedes recogerlo de lunes a viernes, de 8:00 a 16:00. ¿A qué hora te viene bien pasar?",
  en:"Hi{n}! Your {coche} is ready 🚗 You can pick it up Monday to Friday, 8:00 to 16:00. What time suits you?"},
 {g:"Taller", k:"resena", a:"/resena", t:"Pedir reseña (2 días después)",
  es:"Hola{n}, ¿qué tal va el {coche}? Si quedaste contento, nos ayudarías mucho con una reseña en Google, es menos de un minuto: {resena} · ¡Gracias!",
  en:"Hi{n}, how's the {coche} going? If you were happy, a quick Google review would help us a lot, it takes less than a minute: {resena} · Thank you!"},
 {g:"Venta de coches", k:"coche", a:"/coche", t:"Interesado en un coche",
  es:"¡Hola{n}! El {coche} sigue disponible. Está revisado en nuestro taller, con 12 meses de garantía legal, y te lo llevamos gratis a cualquier punto de la isla. ¿Sería una mala idea venir a verlo y probarlo {cuando}, sin compromiso?",
  en:"Hi{n}! The {coche} is still available. It's been checked in our workshop, comes with a 12-month legal warranty and we deliver it free anywhere on the island. Would it be a bad idea to come and test drive it {cuando}, no strings attached?"},
 {g:"Venta de coches", k:"prueba", a:"/prueba", t:"Prueba confirmada",
  es:"¡Perfecto{n}! Te esperamos {cuando} para ver y probar el {coche}. Trae el carnet de conducir. Ubicación: {mapa}",
  en:"Great{n}! See you {cuando} to see and test drive the {coche}. Please bring your driving licence. Location: {mapa}"},
 {g:"Venta de coches", k:"reserva", a:"/reserva", t:"Reservar el coche (50 €)",
  es:"Si quieres asegurarte de que no se lo lleva otro, puedes reservar el {coche} con 50 € reembolsables desde su ficha en la web: {link} · Mientras esté reservado, no se lo enseñamos a nadie más.",
  en:"If you want to make sure nobody else takes it, you can reserve the {coche} with a refundable €50 from its page on our website: {link} · While it's reserved, we won't show it to anyone else."},
 {g:"Venta de coches", k:"financiacion", a:"/financiacion", t:"Financiación",
  es:"Sí, puedes consultar la financiación. Dime cuánto quieres dar de entrada y en cuántos meses te gustaría pagarlo, y te pasamos una cuota orientativa. La aprobación final la da la entidad financiera.",
  en:"Yes, financing is available to check. Tell me how much you'd like to put down and over how many months, and we'll send you an estimated monthly payment. Final approval is up to the finance company."},
 {g:"Venta de coches", k:"alertas", a:"/alertas", t:"No hay coche que encaje",
  es:"Ahora mismo no tenemos uno que encaje, pero entran coches cada semana. Apúntate aquí y te avisamos por WhatsApp antes de publicarlo: {web}/comprar#alertas",
  en:"We don't have a matching car right now, but new ones come in every week. Sign up here and we'll message you before it goes online: {web}/comprar#alertas"},
 {g:"Seguimiento (si no contesta)", k:"seg1", a:"/seg1", t:"Al día siguiente",
  es:"Hola{n}, ¿pudiste pensarlo? Si quieres, te guardo un hueco {cuando}.",
  en:"Hi{n}, have you had a chance to think about it? If you like, I can keep a slot for you {cuando}."},
 {g:"Seguimiento (si no contesta)", k:"seg3", a:"/seg3", t:"A los 3 días",
  es:"Hola{n}, no quiero molestarte 🙂 ¿Has decidido no seguir adelante con el {coche}?",
  en:"Hi{n}, I don't want to bother you 🙂 Have you decided not to go ahead with the {coche}?"},
 {g:"Seguimiento (si no contesta)", k:"seg7", a:"/seg7", t:"A los 7 días (cierre)",
  es:"Hola{n}, entiendo que ahora no es el momento, así que cierro tu consulta. Si más adelante lo necesitas, aquí nos tienes. ¡Un saludo!",
  en:"Hi{n}, I understand now isn't the right time, so I'll close your enquiry. If you need us later on, we're here. All the best!"},
 {g:"Seguimiento (si no contesta)", k:"gracias", a:"/gracias", t:"Despedida",
  es:"¡Gracias a ti{n}! Cualquier cosa, aquí nos tienes. 🙌",
  en:"Thank you{n}! Anything you need, we're here. 🙌"}
];
function rsWa(m, o){
  const n = String(o.nombre||"").trim().split(/\s+/)[0] || "";
  const t = (m[o.idioma] || m.es);
  const def = o.idioma === "en" ? {coche:"car", cuando:"tomorrow at 9:00"} : {coche:"coche", cuando:"mañana a las 9:00"};
  return t.replace(/\{n\}/g, n ? ", " + n : "").replace(/\{nombre\}/g, n).replace(/\{coche\}/g, o.coche || def.coche)
    .replace(/\{cuando\}/g, o.cuando || def.cuando).replace(/\{link\}/g, o.link || "https://" + RS_WA_DATOS.web)
    .replace(/\{mapa\}/g, RS_WA_DATOS.mapa).replace(/\{resena\}/g, RS_WA_DATOS.resena).replace(/\{web\}/g, RS_WA_DATOS.web);
}

/* ---------- INSTAGRAM Y FACEBOOK (27-09-2026) ----------
   Perfiles oficiales y respuestas para comentarios públicos y mensajes privados (DM).
   Mismas variables que WhatsApp: {n} {nombre} {coche} {cuando} {link} {mapa} {resena} {web} */
const RS_REDES = {
  ig: {txt:"Instagram @volcanocars_antigua", url:"https://www.instagram.com/volcanocars_antigua/"},
  igDm: {txt:"Mensajes de Instagram", url:"https://www.instagram.com/direct/inbox/"},
  fb: {txt:"Facebook · Volcanocars", url:"https://www.facebook.com/share/1KYczmU7be/"},
  meta: {txt:"Bandeja de Meta Business Suite (IG + FB)", url:"https://business.facebook.com/latest/inbox/all"},
  wa: "https://wa.me/34643566098"
};
const RS_RS = [
 {g:"Comentarios públicos (se contestan en la publicación)", k:"rs-precio", a:"💬 comentario", t:"«¿Precio?» / «Info»",
  es:"¡Hola{n}! 👋 Te acabamos de escribir por privado con el precio y todos los detalles del {coche}. Revisa tus mensajes 📩",
  en:"Hi{n}! 👋 We've just sent you a private message with the price and all the details of the {coche}. Check your inbox 📩"},
 {g:"Comentarios públicos (se contestan en la publicación)", k:"rs-elogio", a:"💬 comentario", t:"Comentario bonito",
  es:"¡Muchas gracias{n}! 🧡 Nos alegra un montón que te guste. ¡Te esperamos en Costa de Antigua!",
  en:"Thanks so much{n}! 🧡 We're really glad you like it. See you in Costa de Antigua!"},
 {g:"Comentarios públicos (se contestan en la publicación)", k:"rs-donde", a:"💬 comentario", t:"«¿Dónde estáis?»",
  es:"¡Hola{n}! 📍 Estamos en Calle Valle Largo, Nave 8, Costa de Antigua (Fuerteventura). Aquí tienes el mapa: {mapa} · Lunes a viernes, de 8:00 a 16:00.",
  en:"Hi{n}! 📍 We're at Calle Valle Largo, Unit 8, Costa de Antigua (Fuerteventura). Here's the map: {mapa} · Monday to Friday, 8:00 to 16:00."},
 {g:"Comentarios públicos (se contestan en la publicación)", k:"rs-vendido", a:"💬 comentario", t:"Coche ya vendido o reservado",
  es:"¡Hola{n}! Este {coche} ya está reservado 🙏 Tenemos más coches revisados en {web} y, si nos escribes por privado, te avisamos en cuanto entre uno parecido.",
  en:"Hi{n}! This {coche} is already reserved 🙏 We have more checked cars at {web}, and if you message us privately we'll let you know as soon as a similar one comes in."},
 {g:"Comentarios públicos (se contestan en la publicación)", k:"rs-queja", a:"💬 comentario", t:"Queja en público",
  es:"Sentimos mucho lo ocurrido{n}. Queremos solucionarlo contigo: escríbenos por privado o al WhatsApp 643 56 60 98 y lo vemos personalmente.",
  en:"We're really sorry about this{n}. We want to sort it out with you: please send us a private message or WhatsApp +34 643 56 60 98 and we'll look into it personally."},
 {g:"Mensajes privados (DM)", k:"rs-coche", a:"✉️ privado", t:"Información de un coche",
  es:"¡Hola{n}! 👋 Gracias por escribirnos. El {coche} está disponible y revisado en nuestro taller. Aquí tienes la ficha con fotos, precio y financiación: {link}\n¿Te viene bien venir a verlo y probarlo? Abrimos de lunes a viernes, de 8:00 a 16:00.",
  en:"Hi{n}! 👋 Thanks for your message. The {coche} is available and checked in our own workshop. Here's the listing with photos, price and finance: {link}\nWould you like to come and test drive it? We're open Monday to Friday, 8:00 to 16:00."},
 {g:"Mensajes privados (DM)", k:"rs-cita", a:"✉️ privado", t:"Cita en el taller",
  es:"¡Hola{n}! 🔧 Para tu {coche} tenemos hueco {cuando}. Puedes reservar al momento aquí: {web}/taller o, si lo prefieres, dinos y te la apuntamos nosotros.",
  en:"Hi{n}! 🔧 We have a slot for your {coche} {cuando}. You can book instantly here: {web}/taller or just tell us and we'll book it for you."},
 {g:"Mensajes privados (DM)", k:"rs-fotos", a:"✉️ privado", t:"Presupuesto de chapa por fotos",
  es:"¡Claro{n}! 📸 Mándanos 2 o 3 fotos del golpe (una de cerca y otra de lejos) y la matrícula, y te damos presupuesto sin compromiso. También puedes subirlas aquí: {web}/taller#prioridad",
  en:"Sure{n}! 📸 Send us 2 or 3 photos of the damage (one close-up, one from further away) and the number plate, and we'll give you a no-obligation quote. You can also upload them here: {web}/taller#prioridad"},
 {g:"Mensajes privados (DM)", k:"rs-fin", a:"✉️ privado", t:"Financiación",
  es:"¡Sí{n}, se puede financiar! En la ficha tienes la calculadora de cuotas: {link}\nSi nos dices la entrada y el plazo que prefieres, te preparamos el pre-estudio sin compromiso.",
  en:"Yes{n}, finance is available! The listing has a monthly payment calculator: {link}\nTell us your deposit and preferred term and we'll prepare a no-obligation pre-assessment."},
 {g:"Mensajes privados (DM)", k:"rs-entrega", a:"✉️ privado", t:"Entrega a domicilio",
  es:"Una vez firmada la compra, te llevamos el {coche} gratis a cualquier punto de Fuerteventura 🚚 ¿En qué zona vives?",
  en:"Once the purchase is signed, we deliver the {coche} free anywhere on Fuerteventura 🚚 Which area do you live in?"},
 {g:"Mensajes privados (DM)", k:"rs-wa", a:"✉️ privado", t:"Pasar la conversación a WhatsApp",
  es:"Para ir más rápido, ¿seguimos por WhatsApp{n}? Escríbenos al 643 56 60 98 o pulsa aquí: https://wa.me/34643566098",
  en:"To make it quicker, shall we continue on WhatsApp{n}? Message us on +34 643 56 60 98 or tap here: https://wa.me/34643566098"},
 {g:"Mensajes privados (DM)", k:"rs-story", a:"✉️ privado", t:"Gracias por la mención o la story",
  es:"¡Gracias por compartirlo{n}! 🧡 Nos hace muchísima ilusión. Si te apetece dejarnos una reseña en Google, nos ayudas un montón: {resena}",
  en:"Thanks for sharing{n}! 🧡 It means a lot to us. If you'd like to leave us a Google review, it helps us loads: {resena}"}
];
