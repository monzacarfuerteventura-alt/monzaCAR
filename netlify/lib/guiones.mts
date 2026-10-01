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
 {
  "id": "inicio",
  "titulo": "Primeros pasos",
  "dur": 254,
  "lineas": [
   {
    "t": 2.6,
    "txt": "Esta es la puerta del panel",
    "voz": "Vamos a aprender a usar el panel de Volcano Cars, paso a paso, como si fuera tu primer día. Esta pantalla es la puerta de entrada. Para pasar necesitas una llave: o una contraseña, o un usuario con su pin."
   },
   {
    "t": 21.9,
    "txt": "Dos formas de entrar",
    "voz": "El gerente entra con su contraseña. El equipo del taller, es decir, recepción, mecánico y calidad, entra con su usuario y su pin, que son unos números secretos que da el gerente. Debajo del botón Entrar puedes cambiar de una forma a otra."
   },
   {
    "t": 42.6,
    "txt": "Escribe tu contraseña",
    "voz": "Como gerente, pulsa en la casilla y escribe tu contraseña. Los puntitos esconden las letras para que nadie te las vea. Si te equivocas varias veces seguidas, el panel te deja descansar un rato antes de volver a intentarlo."
   },
   {
    "t": 61.5,
    "txt": "Pulsa Entrar",
    "voz": "Ahora pulsa el botón Entrar. Si tienes activada la verificación en dos pasos, te pedirá un código de seis cifras que sale en el móvil. Es como una segunda llave extra para que nadie entre por ti."
   },
   {
    "t": 79.4,
    "txt": "La barra de arriba",
    "voz": "¡Ya estás dentro! Arriba del todo ves tu nombre y tu puesto. Con el botón Ver web abres la página pública que ven los clientes, y con Salir cierras tu sesión cuando terminas. Es importante salir en ordenadores compartidos."
   },
   {
    "t": 98.2,
    "txt": "Las pestañas del negocio",
    "voz": "Debajo hay las pestañas. Cada una es una parte del negocio, como las habitaciones de una casa. Dashboard enseña los números. ce erre eme guarda a los clientes. Taller lleva los coches que se reparan. Inventario cuenta recambios y herramientas."
   },
   {
    "t": 116.6,
    "txt": "Más pestañas",
    "voz": "Control de Caja guarda el dinero en efectivo. Jornada es el fichaje de entrada y salida del equipo. Finanzas junta gastos e ingresos para la gestoría. Agenda enseña las citas. Coches es donde se publican los coches en venta. Respuestas ayuda a contestar reseñas y mensajes. Y Ayuda eres tú ahora mismo."
   },
   {
    "t": 141.5,
    "txt": "Los números rojos",
    "voz": "Fíjate en los numeritos al lado de algunas pestañas. Si hay un número, significa que hay cosas pendientes: clientes sin contestar, citas de hoy o alertas. Cuando lo ves, sabes dónde tienes que ir primero."
   },
   {
    "t": 158.5,
    "txt": "Abre una pestaña",
    "voz": "Para abrir una pestaña, solo tienes que tocarla. Vamos a probar con el ce erre eme, que es la agenda de clientes del negocio."
   },
   {
    "t": 169.4,
    "txt": "El botón ¿Cómo funciona?",
    "voz": "En cada pestaña, arriba, hay un enlace pequeño que dice Cómo funciona. Si tienes una duda en cualquier pantalla, púlsalo y te lleva directo a su ayuda, con vídeo y pasos escritos."
   },
   {
    "t": 185,
    "txt": "Los paneles que se abren al lado",
    "voz": "Cuando tocas un cliente o una orden, se abre un panel a la derecha con toda su información. Se cierra con la equis de arriba. Así nunca pierdes el sitio donde estabas."
   },
   {
    "t": 200.6,
    "txt": "Esta pestaña de Ayuda",
    "voz": "Y aquí, en Ayuda, tienes un vídeo largo por cada pestaña, explicado paso a paso. A la izquierda eliges la sección. Debajo del vídeo hay un interruptor para oír la voz. Tú decides: mirar, escuchar o leer los pasos por escrito."
   }
  ]
 },
 {
  "id": "dash",
  "titulo": "Dashboard",
  "dur": 381.8,
  "lineas": [
   {
    "t": 2.6,
    "txt": "Para qué sirve",
    "voz": "El Dashboard es como el tablero de un coche, pero del negocio. En una sola pantalla ves cuántas personas visitan la web, cuántos clientes piden cosas, cuánto dinero entra y cómo va el taller. Sirve para saber si vamos bien o si hay que arreglar algo."
   },
   {
    "t": 24.7,
    "txt": "El mes y las flechas",
    "voz": "Arriba eliges el mes que quieres mirar. Con la flecha izquierda vas al mes anterior y con la derecha al siguiente. Todo lo que ves en la pantalla cambia para contarte ese mes."
   },
   {
    "t": 40.8,
    "txt": "Informe PDF y Excel",
    "voz": "Aquí mismo están dos botones muy útiles. Informe pe de efe guarda un resumen bonito del mes, para enseñarlo o guardarlo. Écsel guarda los números en una hoja de cálculo. Además, cada lunes la web te prepara un informe sola, sin que lo pidas."
   },
   {
    "t": 61,
    "txt": "El pulso del negocio",
    "voz": "Estas tarjetas de arriba son el pulso. Cada una cuenta algo: la facturación, las solicitudes que llegan desde la web, las visitas, la conversión, las citas, los clientes cerrados, el tiempo que tardas en responder y los presupuestos. Y debajo de cada número hay una flechita: si sube o baja frente al mes pasado."
   },
   {
    "t": 86.8,
    "txt": "Toca una tarjeta",
    "voz": "Si tocas una tarjeta, se abre su detalle con un gráfico día a día. Prueba con la segunda: verás exactamente en qué días hubo más movimiento. Para volver, pulsa Volver a mis datos o toca otra tarjeta."
   },
   {
    "t": 104.8,
    "txt": "Visitas, solicitudes y facturación",
    "voz": "Con estos botones cambias lo que enseña el gráfico: visitas a la web, solicitudes de clientes o facturación. También puedes elegir si miras este mes o los últimos veintiocho días, y si cuentas clientes o euros."
   },
   {
    "t": 122.2,
    "txt": "Cómo cerrará el mes",
    "voz": "La previsión mira cómo van los últimos catorce días y te dice cómo terminarás el mes, con un margen por si acaso. Es como adivinar la nota final antes del examen para poder estudiar más si hace falta."
   },
   {
    "t": 140.6,
    "txt": "El simulador ¿Y si…?",
    "voz": "Aquí puedes jugar. Mueve los deslizadores: ¿y si tuviera más visitas? ¿y si gastara más en anuncios? Al momento ves cuánto facturarías y cuánto te costaría cada cliente. No cambia nada de verdad: es solo para probar ideas. Con Volver a mis datos, todo queda como estaba."
   },
   {
    "t": 163.1,
    "txt": "Cuándo te buscan",
    "voz": "Este mapa de colores enseña a qué hora y qué día entra más gente a la web. Los cuadros más fuertes son los mejores momentos. Así sabes cuándo publicar en redes o cuándo tener el teléfono a mano."
   },
   {
    "t": 181.5,
    "txt": "Qué coches se miran",
    "voz": "Aquí ves qué coches del catálogo despiertan más interés, día a día. Los que alguien está mirando ahora mismo aparecen marcados. Si un coche casi no se mira, quizá haya que mejorar sus fotos o bajar el precio."
   },
   {
    "t": 199.9,
    "txt": "De dónde viene el dinero",
    "voz": "Este dibujo cuenta una historia: de qué sitio llega cada cliente, qué viene a pedir y cómo termina: cerrado, en curso o perdido. Con los botones Clientes y Euros decides si lo miras en personas o en dinero."
   },
   {
    "t": 218.3,
    "txt": "El detalle, en cajitas",
    "voz": "Más abajo está todo el detalle, guardado en cajitas que se abren cuando las necesitas: tráfico y solicitudes, canales y embudo, coches y taller, público y horarios, y promedios del mes. Se abren tocándolas, y así la pantalla no se llena de cosas."
   },
   {
    "t": 239,
    "txt": "Público, horarios y promedios",
    "voz": "En Público, horarios y pérdidas ves quién visita, a qué hora y por qué se pierden clientes. En Promedios del mes tienes una tabla con las medias de cada cosa, ideal para comparar mes con mes."
   },
   {
    "t": 256.4,
    "txt": "Informes automáticos",
    "voz": "Esta cajita guarda los informes que se hacen solos: uno cada semana y otro cada mes. Si quieres uno ya, pulsa Generar el de la semana pasada, o Generar el del mes pasado. Se quedan guardados para descargarlos cuando quieras."
   },
   {
    "t": 275.7,
    "txt": "Taller, inventario y equipo",
    "voz": "Y en las últimas cajitas está la operación del taller y del inventario: cuánto trabaja cada mecánico, qué piezas se acaban. En Equipo y ajustes están los datos de las personas. Si algo sale en rojo, toca la alerta y te lleva a la orden exacta."
   },
   {
    "t": 297.8,
    "txt": "Marketing en vivo",
    "voz": "Y por último, abajo a la derecha, el botón Marketing en vivo. Te da ideas para vender hoy mismo, por ejemplo coches que mucha gente está mirando. Ábrelo y cierra cuando termines. Así de fácil: el Dashboard te dice cómo va el negocio."
   }
  ]
 },
 {
  "id": "crm",
  "titulo": "CRM · Clientes",
  "dur": 358.8,
  "lineas": [
   {
    "t": 2.7,
    "txt": "Para qué sirve",
    "voz": "El ce erre eme es la libreta de los clientes. Aquí llega cualquier persona que pide algo: por la web, por WhatsApp, por teléfono o en persona. Se apunta aquí, se le contesta y se le sigue hasta que compra o se descarta. Así no se te olvida nadie."
   },
   {
    "t": 25.2,
    "txt": "Los botones de arriba",
    "voz": "Arriba tienes cuatro cosas. El botón más Nuevo cliente sirve para apuntar a alguien que llama o viene sin cita. Exportar a Écsel guarda a todos los clientes en una hoja. Y Actualizar vuelve a mirar si ha llegado alguien nuevo."
   },
   {
    "t": 45,
    "txt": "Las cuatro tareas del día",
    "voz": "Estas cuatro cajas son tu lista de tareas. Sin contestar: los que escribieron y nadie les ha respondido; se pone roja si el más antiguo espera más de quince minutos. Seguimientos para hoy: a quién prometiste llamar. Citas de hoy. Y Presupuestos enviados, que esperan respuesta."
   },
   {
    "t": 67.1,
    "txt": "Buscar y cambiar de vista",
    "voz": "Con el buscador encuentras a alguien por nombre, teléfono, matrícula o coche. Y con los botones Lista, Embudo y Clientes cambias la forma de mirar. Lista enseña todas las solicitudes, una debajo de otra."
   },
   {
    "t": 83.6,
    "txt": "La vista Embudo",
    "voz": "En Embudo, los clientes son tarjetas puestas en columnas, una por cada estado: Nueva, Contactado, Cita, Ganada y Perdida. Es como un tablero con post-its. Puedes arrastrar una tarjeta de una columna a otra para cambiar su estado."
   },
   {
    "t": 102,
    "txt": "La vista Clientes",
    "voz": "En Clientes hay una sola fila por persona, con todo lo que ha hecho: cuántas veces nos ha pedido algo y cuánto ha gastado. Es perfecta para reconocer a un cliente que vuelve."
   },
   {
    "t": 118.1,
    "txt": "Los filtros por estado",
    "voz": "Debajo hay filtros para ver solo una parte: Pendientes, Nuevas, Seguimiento, Contactado, Cita, Ganadas, Perdidas o Todas. Cada cliente pasa por estos estados, de izquierda a derecha, hasta que termina en Ganada o Perdida."
   },
   {
    "t": 134.6,
    "txt": "Cómo leer una fila",
    "voz": "Cada fila cuenta mucho en poco espacio. Dice el tipo de cliente, su nombre, qué quiere, cuándo llegó y de dónde viene. A la derecha tiene el botón verde de WhatsApp, el botón de Llamar y el estado. Las etiquetas pequeñas avisan: rayo es VIP, calendario es cita y bandera es seguimiento, que se pone roja si ya se pasó."
   },
   {
    "t": 163.2,
    "txt": "Apuntar a un cliente nuevo",
    "voz": "Vamos a apuntar a una persona que acaba de llamar. Pulsa Nuevo cliente. Se abre una ventana para rellenar sus datos."
   },
   {
    "t": 173.6,
    "txt": "Nombre, teléfono y qué busca",
    "voz": "Escribe el nombre y el teléfono, que son lo único obligatorio. Elige qué busca, por ejemplo taller, y cómo llegó hasta ti, por ejemplo por teléfono. Si quieres, anota en una frase qué le pasa al coche."
   },
   {
    "t": 191.6,
    "txt": "Guardar el cliente",
    "voz": "Pulsa Guardar cliente. Al momento se abre su ficha, que es la hoja con todo lo que sabemos de él."
   },
   {
    "t": 201.6,
    "txt": "Mandar un WhatsApp ya escrito",
    "voz": "En la ficha hay mensajes preparados: primer contacto, presupuesto, recordar la cita y más. Eliges uno, lo lees y pulsas Abrir en WhatsApp. No tienes que escribir nada. Cuando lo envías, el panel lo anota solo en el historial."
   },
   {
    "t": 220.4,
    "txt": "Anotar lo que has hecho",
    "voz": "Si llamas o hablas con él, anótalo con los botones de Registrar: Le he llamado, Le he escrito o Ha venido. También puedes escribir una nota suelta con el precio que le ofreciste. Todo queda guardado en el historial."
   },
   {
    "t": 239.3,
    "txt": "No olvidarte de volver a llamar",
    "voz": "En Seguimiento comercial elige Mañana, En tres días o En una semana. El día que toque, ese cliente aparece en la tarea Seguimientos para hoy con una bandera roja. También puedes escribir el importe que estáis hablando."
   },
   {
    "t": 257.2,
    "txt": "Cambiar el estado",
    "voz": "Cuando algo cambia, cambia el estado en el desplegable de arriba de la ficha. Contactado si ya le hablaste, Cita si quedaste con él, Ganada si compró o reparó, y Perdida si no sigue. Si es Perdida, elige siempre el motivo: el Dashboard te dirá por qué se pierden ventas."
   },
   {
    "t": 281.1,
    "txt": "Pasarlo al taller o borrarlo",
    "voz": "Si es un cliente de taller, el botón Crear orden de trabajo lo manda directo al Taller. Y si un cliente pide por escrito que borremos sus datos, abajo del todo hay un botón para hacerlo. Ojo: eso no se puede deshacer. Y así termina el ce erre eme."
   }
  ]
 },
 {
  "id": "agenda",
  "titulo": "Agenda",
  "dur": 212.3,
  "lineas": [
   {
    "t": 2.7,
    "txt": "Para qué sirve",
    "voz": "La Agenda es el calendario de citas. Cuando un cliente reserva hora desde la web, la cita aparece aquí sola, sin que tengas que apuntar nada. También sirve para cerrar los días en que no se puede reservar, como vacaciones o festivos."
   },
   {
    "t": 22.9,
    "txt": "La lista de citas",
    "voz": "Las citas están agrupadas por día, empezando por hoy. Cada una dice la hora, el nombre del cliente, su teléfono, qué coche trae y qué necesita. La siguiente cita lleva una etiqueta que dice Próxima, para que sepas a quién esperas ahora. Solo salen citas futuras y que no se han cancelado."
   },
   {
    "t": 47.8,
    "txt": "Visita o taller",
    "voz": "Cada cita tiene una etiqueta. Visita quiere decir que viene a ver o probar un coche. Taller quiere decir que trae su coche para repararlo. Así sabes si tienes que preparar un coche o un hueco en el taller."
   },
   {
    "t": 66.7,
    "txt": "Recordar la cita por WhatsApp",
    "voz": "La tarde antes de la cita, pulsa Recordar por WhatsApp. Se abre WhatsApp con un mensaje ya escrito, con el día, la hora y la dirección del taller. Solo tienes que enviarlo. Esto hace que muchos menos clientes se olviden de venir."
   },
   {
    "t": 86.9,
    "txt": "Llamar al cliente",
    "voz": "Si prefieres hablar, el botón Llamar marca su número directamente desde el móvil. Úsalo si hay que cambiar la hora o si el cliente no contesta al mensaje."
   },
   {
    "t": 100.6,
    "txt": "Cuando el cliente viene",
    "voz": "Cuando el cliente llega, pulsa Hecha. La cita desaparece de la lista y el cliente pasa a Ganada en el ce erre eme. Así la lista de hoy solo enseña lo que falta por pasar."
   },
   {
    "t": 116.7,
    "txt": "Cancelar una cita",
    "voz": "Si el cliente no puede venir, pulsa Cancelar cita y confirma. La hora vuelve a estar libre en la web al momento, y otra persona puede reservarla. Ojo: el panel no avisa al cliente, así que escríbele tú para despedirte con cariño."
   },
   {
    "t": 136.9,
    "txt": "Cerrar un día",
    "voz": "Más abajo está Días cerrados. Si vas a estar de vacaciones o es festivo, elige la fecha y pulsa Cerrar ese día. A partir de ahí, la web no ofrece ese día a nadie. Las citas que ya existían no se borran, ojo."
   },
   {
    "t": 157.6,
    "txt": "Volver a abrir un día",
    "voz": "Para volver a abrir un día cerrado, tócalo en la lista de días cerrados y vuelve a estar disponible. Estos días también cuentan en el Dashboard para calcular las horas pagadas de los mecánicos. Y así de sencilla es la Agenda."
   }
  ]
 },
 {
  "id": "coches",
  "titulo": "Coches y reservas",
  "dur": 366.4,
  "lineas": [
   {
    "t": 2.7,
    "txt": "Para qué sirve",
    "voz": "Esta pestaña es el escaparate de los coches en venta. Lo que publicas aquí aparece en la web al momento. También gestionas las reservas de cincuenta euros que hacen los clientes y la financiación que enseña la web."
   },
   {
    "t": 21,
    "txt": "Las cifras rápidas",
    "voz": "Arriba hay números sencillos: cuántos coches tienes en venta, cuántos están reservados, cuántos vendidos y cuánto interés hubo esta semana. Son los primeros números que conviene mirar cada mañana."
   },
   {
    "t": 35.2,
    "txt": "Financiación en la web",
    "voz": "Esta caja dice si la financiación está activa. Con ella la web calcula la cuota mensual de cada coche. Al pulsar Cambiar, pones las condiciones reales de la financiera: el interés, la comisión, los plazos, la entrada, el importe mínimo y la antigüedad máxima del coche. Solo pongas datos reales, porque la ley obliga a enseñar un ejemplo correcto."
   },
   {
    "t": 63.4,
    "txt": "Reservas online",
    "voz": "Aquí aparecen las reservas. Un cliente puede reservar un coche pagando cincuenta euros por transferencia o Bisum y subiendo el justificante. Al subirlo, el coche pasa solo a Reservado. Tú compruebas que el dinero está en tu cuenta y pulsas He visto el dinero: confirmar. Si no confirmas en doce horas, la reserva se libera sola."
   },
   {
    "t": 90.1,
    "txt": "Cómo te pagan la reserva",
    "voz": "Este bloque dice a los clientes dónde pagar la reserva: tu número de Bisum o tu cuenta bancaria. Rellénalo una vez y pulsa Guardar. Si está vacío, la web no puede cobrar reservas."
   },
   {
    "t": 106.2,
    "txt": "Cerrar una reserva",
    "voz": "Cuando una reserva termina, hay tres caminos. Si el cliente compra, pulsa Lo ha comprado y el coche pasa a Vendido. Si necesita más tiempo, Alargar cuarenta y ocho horas. Y si no compra, pulsa Liberar y, cuando le devuelvas los cincuenta euros, marca que ya los has devuelto."
   },
   {
    "t": 129.7,
    "txt": "Lista de espera",
    "voz": "Si un coche está reservado, otros clientes pueden apuntarse en una lista de espera. Cuando el coche vuelve a estar libre, abre la lista y pulsa Avisar por WhatsApp a cada persona. Es como avisar a los que esperaban turno."
   },
   {
    "t": 149,
    "txt": "Tus coches",
    "voz": "Abajo está la lista de coches, cada uno con su foto, su precio y su estado. Toca uno y se abre para editarlo. Los estados son tres: Disponible se ve en la web y se puede reservar; Reservado sale con etiqueta de reservado; Vendido sale sesenta días en vendidos recientemente."
   },
   {
    "t": 172.9,
    "txt": "Cambiar el estado",
    "voz": "Con los botones Disponible, Reservado y Vendido de cada fila cambias el estado. Si alguien deja una señal en persona, lo pasas a Reservado a mano. Y cuando firmas la venta, a Vendido."
   },
   {
    "t": 189,
    "txt": "Añadir un coche",
    "voz": "Vamos a publicar un coche. Pulsa más Añadir coche. Y si no sabes cómo vender bien, hay un botón arriba, ¿No sabes cómo publicar y vender?, que abre la Guía de venta paso a paso."
   },
   {
    "t": 206,
    "txt": "Las fotos primero",
    "voz": "Primero las fotos. Súbelas en el orden de la guía: las tres primeras son la portada de la ficha, así que hazlas con el coche limpio y con buena luz. Puedes arrastrar las fotos a esta zona o tocar para elegirlas. La primera es la foto principal."
   },
   {
    "t": 228.5,
    "txt": "Los datos del coche",
    "voz": "Después los datos. Marca, modelo, año, kilómetros y precio final con igic son obligatorios. Si puedes, añade también combustible, cambio, etiqueta de la DGT, caballos, puertas y color. Cuantos más datos, más confianza da el anuncio."
   },
   {
    "t": 247,
    "txt": "Comparar con el mercado",
    "voz": "Aquí apuntas los precios de coches parecidos que has visto en otras webs. Si tu precio es más bajo, la web lo enseña a los clientes como un precio justo. Pon el precio medio y cuántos coches comparaste."
   },
   {
    "t": 265.4,
    "txt": "Descripción y equipamiento",
    "voz": "Cuenta en tres líneas para quién es el coche y por qué merece la pena. Y en equipamiento, escribe una cosa por línea: aire acondicionado, bluetooth, cámara trasera. Frases cortas y claras."
   },
   {
    "t": 280.9,
    "txt": "Publicar",
    "voz": "Por último, elige el estado Disponible y, si quieres, marca Destacar en la portada. Pulsa Publicar coche y aparece en la web al instante. Si hay fotos subiéndose, espera a que terminen antes de salir. ¡Y ya está!"
   }
  ]
 },
 {
  "id": "taller",
  "titulo": "Taller",
  "dur": 630.3,
  "lineas": [
   {
    "t": 2.6,
    "txt": "Para qué sirve",
    "voz": "El Taller es el corazón del negocio. Cada coche que entra a reparar recibe una orden de trabajo con un número propio, por ejemplo uve ce, el año y un número. Esa orden lo acompaña de principio a fin: recepción, inspección, presupuesto, factura, tiempos de trabajo y control de calidad."
   },
   {
    "t": 26.1,
    "txt": "Las vistas del taller",
    "voz": "Arriba hay cinco botones para mirar el taller de formas distintas. En marcha enseña lo que está pasando ahora. Órdenes es una tabla con todas. Tablero las pone en columnas. Avisos de i te uve recuerda a los clientes. Y Coches propios es para los coches del negocio. En otros vídeos de la Ayuda verás las últimas."
   },
   {
    "t": 52.4,
    "txt": "Buscar una orden",
    "voz": "El buscador encuentra una orden por la matrícula, por el nombre del cliente o por el número de orden. Escribe unas letras y la lista se acorta sola."
   },
   {
    "t": 66.1,
    "txt": "Los avisos",
    "voz": "Si hay algo que no puede esperar, aparece una franja de avisos: rojo es urgente, ámbar es que vigiles. Por ejemplo, puntos en rojo sin presupuesto, o un coche esperando el control de calidad. Si tocas un aviso, te lleva directo a la ficha del coche."
   },
   {
    "t": 88.2,
    "txt": "La tabla de órdenes",
    "voz": "En la vista Órdenes ves todas las órdenes. Con los filtros eliges una fase: En el taller, Recepcionado, En inspección, En trabajo, Control calidad o Entregado. Cada fase tiene un número que cuenta cuántos coches hay. El botón Écsel descarga la tabla."
   },
   {
    "t": 108.5,
    "txt": "Recibir un coche",
    "voz": "Ahora vamos a recibir un coche. Pulsa más Nueva recepción. Se abre una ventanita."
   },
   {
    "t": 115.7,
    "txt": "Los datos para empezar",
    "voz": "Si el cliente pidió cita por la web, puedes elegirlo en el desplegable y los datos se rellenan solos. Si no, escribe su nombre, su teléfono, la matrícula y el modelo del coche. Aquí solo se reciben reparaciones de clientes: los coches del negocio entran por Coches propios."
   },
   {
    "t": 138.7,
    "txt": "Crear la orden",
    "voz": "Pulsa Crear y abrir formulario uno. La orden ya existe y tiene su número. formulario uno es la ficha de recepción, el papel que se rellena con el cliente delante."
   },
   {
    "t": 152.4,
    "txt": "FORM-01: kilómetros y combustible",
    "voz": "Primero anota los kilómetros que marca el coche y el nivel de combustible, por ejemplo la mitad. Haz una foto al cuadro. Así, al entregarlo, todo será igual que al recibirlo y no habrá discusiones."
   },
   {
    "t": 169.4,
    "txt": "Testigos y motivo",
    "voz": "Toca los testigos, que son las lucecitas del cuadro que están encendidas, y escribe con las palabras del cliente qué le pasa al coche. Por ejemplo: ruido metálico al frenar desde hace una semana."
   },
   {
    "t": 185.9,
    "txt": "Inventario, llaves y daños",
    "voz": "Marca qué objetos trae el coche con Sí o No, y cuántas llaves deja. Después toca el dibujo del coche en el sitio donde hay un daño, elige el tipo, rayón, abolladura o picado, y haz una foto. Si no tiene ningún daño, marca Sin daños previos."
   },
   {
    "t": 208.5,
    "txt": "Autorización y firma",
    "voz": "Escribe hasta cuántos euros autoriza el cliente para el diagnóstico, marca las casillas de avisos y que firme con el dedo en la pantalla. Cuando todo esté listo, pulsa Firmar y cerrar la recepción. Si falta algo, el panel te dice exactamente qué."
   },
   {
    "t": 229.2,
    "txt": "Las pestañas de la orden",
    "voz": "Arriba de la orden hay pestañas, una por cada ficha. Cada una muestra si está sin empezar, en curso o firmada. Las fases del coche avanzan solas según vas firmando cada ficha."
   },
   {
    "t": 244.8,
    "txt": "FORM-02: la inspección 360",
    "voz": "formulario dos es la inspección completa del coche. Tiene siete secciones: exterior, interior, mecánica, neumáticos frenos y suspensión, diagnosis, prueba en carretera y documentación. En cada línea marcas OK, Á de ámbar si hay que vigilar, R de rojo si hay que reparar ya, o NA si no aplica."
   },
   {
    "t": 267.8,
    "txt": "Notas y fotos",
    "voz": "Todo lo que sea ámbar o rojo necesita una nota y, mejor aún, una foto. Al terminar escribes las horas estimadas y la recomendación y pulsas Firmar la inspección. Si hay puntos en ámbar o rojo, la orden pasa sola a la fase de Presupuesto."
   },
   {
    "t": 289.5,
    "txt": "Presupuesto y cliente",
    "voz": "Arriba hay un botón que se llama Presupuesto y cliente, solo para el gerente. Ahí añades una línea por cada cosa: concepto, cantidad y precio sin igic. Pulsas Enviar al cliente y Avisar por WhatsApp. El cliente acepta o rechaza desde su enlace y tú ves quién y cuándo."
   },
   {
    "t": 313,
    "txt": "FORM-14: la factura",
    "voz": "Entre la inspección y los tiempos está formulario catorce, la factura de reparación. Ya viene rellena con los datos del cliente y las líneas del presupuesto. Revisa el nombre, el DNI o CIF y los kilómetros de salida. Puedes ajustar líneas, descuento y el tipo de igic. El total se calcula solo."
   },
   {
    "t": 337.4,
    "txt": "Emitir y rectificar",
    "voz": "Cuando está correcta, pulsa Emitir la factura. Queda bloqueada y recibe su número, y no se puede cambiar. Si hay un error, solo el gerente la reabre, con un motivo escrito: la factura vieja no se borra y la nueva sale como rectificativa. El mecánico no ve ningún importe."
   },
   {
    "t": 360.9,
    "txt": "Libro de facturas",
    "voz": "Más abajo está el libro de facturas. Eliges unas fechas y descargas el listado en Écsel para la gestoría. Y con Comprobar integridad el panel verifica que ninguna factura se ha tocado."
   },
   {
    "t": 376.5,
    "txt": "FORM-03: los tiempos",
    "voz": "formulario tres mide cuánto tarda el trabajo. El mecánico pulsa Iniciar trabajo, y si para, elige el motivo: falta un recambio, otro coche urgente, comida u otro. Al acabar pulsa Terminar y el coche pasa a Control de calidad. La hora la pone el servidor: nadie puede inventarla."
   },
   {
    "t": 399,
    "txt": "Recambios y herramientas",
    "voz": "Dentro de la orden hay un bloque para cargar recambios y herramientas. Buscas la pieza, pones la cantidad y se descuenta del almacén al momento. Si coges una herramienta de valor, la apuntas a esta orden. Así sabemos cuánto cuesta cada reparación de verdad."
   },
   {
    "t": 420.2,
    "txt": "FORM-04: control de calidad",
    "voz": "formulario cuatro es el control final. Lo firma siempre otra persona distinta del mecánico que hizo el trabajo. Eliges el destino: entrega al cliente o inventario de venta, y marcas cada punto con Sí, No o NA. Si hay algún No, el coche vuelve al taller y hay que escribir la causa."
   },
   {
    "t": 444.6,
    "txt": "Auditoría de la orden",
    "voz": "La pestaña Auditoría guarda la historia de la orden: quién hizo cada cosa y a qué hora. Es como una cámara de seguridad de papel. Nadie puede esconder nada, y eso protege al taller y al cliente."
   },
   {
    "t": 462.5,
    "txt": "Imprimir y mandar el enlace",
    "voz": "Arriba puedes imprimir cada ficha o sacar el pe de efe. Y con Presupuesto y cliente puedes mandar al cliente un enlace por WhatsApp para que vea su coche en vivo, con fotos de antes, durante y después. Las notas internas nunca salen al cliente."
   },
   {
    "t": 489.1,
    "txt": "Cerrar y entregar",
    "voz": "Con la calidad aprobada el coche queda Listo para recoger. Avisas al cliente y pulsas Cerrar la orden. Al entregarlo, Marcar como entregado. Y por último se cobra: el efectivo en Control de Caja, y la tarjeta o transferencia en Finanzas. Con esto termina el recorrido de un coche en el taller."
   }
  ]
 },
 {
  "id": "tablero",
  "titulo": "Tablero y Avisos de ITV",
  "dur": 174.4,
  "lineas": [
   {
    "t": 2.6,
    "txt": "Para qué sirve",
    "voz": "Aquí tienes dos herramientas más del Taller. El Tablero enseña todos los coches en columnas, como un mural de post-its. Y los Avisos de i te uve te ayudan a recordar a los clientes cuándo tienen que pasar la inspección."
   },
   {
    "t": 21,
    "txt": "En marcha",
    "voz": "Pulsa En marcha. Es la vista del día a día: lo que hay que hacer ahora. Si eres mecánico, se llama Mis trabajos y solo enseña lo que tienes asignado."
   },
   {
    "t": 35.7,
    "txt": "El tablero",
    "voz": "Pulsa Tablero. Cada columna es una fase: recepcionado, en inspección, en trabajo, control de calidad y entregado. Cada coche es una tarjeta con su matrícula y su cliente."
   },
   {
    "t": 49.4,
    "txt": "Leer una tarjeta",
    "voz": "En cada tarjeta ves el coche, el cliente y cuántos días lleva en el taller. Si alguien lleva demasiado tiempo parado, la tarjeta te lo marca. Toca una tarjeta y se abre la orden."
   },
   {
    "t": 65.9,
    "txt": "Avisos de ITV",
    "voz": "Pulsa Avisos de i te uve. Aquí salen los clientes que, al recibir el coche, dieron permiso para que les avises de la i te uve. Es un permiso aparte, que se marca en la recepción."
   },
   {
    "t": 81.5,
    "txt": "Los plazos",
    "voz": "Los avisos se ordenan por plazo. Caduca en siete días o menos es lo más urgente. Después, caduca en treinta días. Y por último, la i te uve ya caducada. Así sabes a quién avisar primero."
   },
   {
    "t": 98.1,
    "txt": "Avisar por WhatsApp",
    "voz": "Junto a cada cliente, pulsa el botón de WhatsApp. Se abre con un mensaje ya escrito. Solo tienes que enviarlo. El panel apunta que ya le has avisado, y aparece una marca verde con la fecha."
   },
   {
    "t": 115.5,
    "txt": "Deshacer y dar de baja",
    "voz": "Si pulsaste por error, pulsa Deshacer. Y si el cliente no quiere más avisos, pulsa dar de baja. Sirve también para abrir la ficha del cliente."
   },
   {
    "t": 128.4,
    "txt": "Por qué es útil",
    "voz": "Un cliente al que recuerdas la i te uve vuelve a tu taller. Es la forma más fácil de conseguir trabajo sin gastar nada. Y así terminan el Tablero y los avisos."
   }
  ]
 },
 {
  "id": "propios",
  "titulo": "Coches propios (stock)",
  "dur": 216.5,
  "lineas": [
   {
    "t": 2.6,
    "txt": "Para qué sirve",
    "voz": "Aquí van los coches del negocio, los coches de stock. El negocio no compra coches a los clientes: esta lista es solo para controlar cada coche nuestro mientras se arregla y se prepara para venderlo. Es interna: nada de esto sale en la web."
   },
   {
    "t": 23.8,
    "txt": "Las fases",
    "voz": "Arriba hay filtros por fase. En el taller, Entrada o dañado, En reparación, Control de calidad, Listo para venta y Vendidos. Cada número dice cuántos coches hay en esa fase. Así ves de un vistazo en qué punto está cada coche."
   },
   {
    "t": 43.6,
    "txt": "Añadir un coche nuevo",
    "voz": "Para meter un coche en la lista, pulsa más Coche que entra. Es lo que haces cuando un coche del negocio llega al taller para prepararlo."
   },
   {
    "t": 56.4,
    "txt": "Los datos del coche",
    "voz": "Escribe la marca y el modelo, que son obligatorios. Si puedes, añade la matrícula, el año, los kilómetros, el color y el bastidor. En Daños o trabajo a hacer, cuenta qué hay que arreglar."
   },
   {
    "t": 75.8,
    "txt": "Coste y precio",
    "voz": "El gerente escribe el coste del coche y el precio de venta previsto, sin impuesto. Así el panel calcula cuánto ganarás cuando se venda. El mecánico no ve estos números."
   },
   {
    "t": 90.5,
    "txt": "Guardar",
    "voz": "Pulsa Guardar. El coche aparece en la lista, con su ficha. Si es de la web, puedes enlazarlo con el coche que está publicado."
   },
   {
    "t": 102.4,
    "txt": "La ficha del coche",
    "voz": "Si tocas un coche, se abre su ficha. Aquí ves el resumen de costes: lo que costó el coche, las piezas que se cogieron del inventario, las horas de mano de obra y otros gastos aprobados. Y debajo, el total y el beneficio previsto."
   },
   {
    "t": 123.5,
    "txt": "Mover de fase",
    "voz": "Cuando el coche avanza, cambias su fase: de entrada a reparación, de reparación a control de calidad, y por último, listo para venta. Cada cambio queda guardado con quién lo hizo y cuándo."
   },
   {
    "t": 139.6,
    "txt": "Piezas, horas y costes",
    "voz": "Las piezas que cargas desde aquí se descuentan del Inventario. Las horas salen de los tiempos del taller. Y otros gastos, como pintura o grúa, se anotan con Anotar un coste. Si lo propone el mecánico, el gerente lo revisa antes de que cuente."
   },
   {
    "t": 160.7,
    "txt": "Coste por hora y registro",
    "voz": "Arriba, Coste por hora fija lo que cuesta una hora de mano de obra. Y Registro guarda la historia de todos los coches, con cada cambio. Con esto, sabes siempre cuánto cuesta preparar cada coche de stock."
   }
  ]
 },
 {
  "id": "equipo",
  "titulo": "Equipo y ajustes",
  "dur": 154.2,
  "lineas": [
   {
    "t": 2.7,
    "txt": "Para qué sirve",
    "voz": "Aquí das de alta a las personas que trabajan en el taller y eliges sus permisos. También fijas el precio de la hora de trabajo. Solo lo ve el gerente."
   },
   {
    "t": 17.4,
    "txt": "Abrir Equipo y ajustes",
    "voz": "Arriba a la derecha está el botón Equipo y ajustes. Púlsalo y se abre un panel por el lateral."
   },
   {
    "t": 26.9,
    "txt": "Cómo entra el equipo",
    "voz": "Primero te cuenta cómo entra cada persona. Abre la dirección del panel en su móvil, pulsa Entrar como equipo del taller y escribe su usuario y su pin. Solo ve el taller, nunca el dinero."
   },
   {
    "t": 43.9,
    "txt": "El equipo",
    "voz": "Aquí está la lista de personas. Cada una tiene su puesto: mecánico, recepción, control de calidad u otros. Puedes cambiar su nombre, su usuario, su pin o sus horas al día."
   },
   {
    "t": 59,
    "txt": "Añadir una persona",
    "voz": "Para añadir a alguien, abre Añadir persona. Escribe su nombre y un usuario fácil de recordar. Elige su puesto, cuántas horas se le pagan al día y su fecha de alta."
   },
   {
    "t": 74.2,
    "txt": "El PIN y la caja",
    "voz": "Ponle un pin de seis números. Y marca, si quieres, que puede usar la caja. Solo dáselo a quien de verdad lo necesite, porque es dinero."
   },
   {
    "t": 87,
    "txt": "Dar de baja",
    "voz": "Si alguien deja de trabajar con vosotros, pulsa Dar de baja. Ya no podrá entrar. No se borra nada: sus fichajes siguen contando en los informes."
   },
   {
    "t": 99.8,
    "txt": "Ajustes del taller",
    "voz": "Abajo están los ajustes. La tarifa de mano de obra es el precio de una hora de trabajo, sin impuesto. El porcentaje de aviso sirve para que, si un trabajo tarda mucho más de lo previsto, el mecánico tenga que explicar por qué. Y aquí fijas el igic."
   },
   {
    "t": 122.8,
    "txt": "Guardar",
    "voz": "Cuando termines, pulsa Guardar ajustes. Y listo: los cambios se aplican al momento en todo el panel. Y así termina Equipo y ajustes."
   }
  ]
 },
 {
  "id": "alm",
  "titulo": "Inventario",
  "dur": 309.7,
  "lineas": [
   {
    "t": 2.7,
    "txt": "Para qué sirve",
    "voz": "El Inventario es el almacén del taller dentro del panel. Te dice cuántos recambios quedan, qué hay que pedir al proveedor y quién tiene cada herramienta. Así nunca falta una pieza ni se pierde una herramienta."
   },
   {
    "t": 20.1,
    "txt": "Las cuatro pestañas",
    "voz": "Arriba hay cuatro pestañas. Repuestos enseña las piezas y su stock. Herramientas, dónde está cada una y quién la tiene. Pedido, lo que hay que comprar. Y Movimientos, todo lo que entra y sale, solo para el gerente."
   },
   {
    "t": 38.5,
    "txt": "Repuestos",
    "voz": "En Repuestos cada pieza es una ficha con su stock, su mínimo y el sitio donde está guardada. Si el número de una pieza se pone en rojo, es que queda por debajo del mínimo y toca pedirla."
   },
   {
    "t": 56.9,
    "txt": "Buscar y escanear",
    "voz": "El buscador encuentra una pieza por nombre, referencia o código. El botón Escanear usa la cámara del móvil para leer el código de barras o la etiqueta cu erre. En iPhone y iPad no hay lector, así que escribes el código a mano."
   },
   {
    "t": 77.1,
    "txt": "Nueva pieza",
    "voz": "Vamos a dar de alta una pieza. Pulsa Nueva pieza."
   },
   {
    "t": 82.5,
    "txt": "Rellenar la ficha",
    "voz": "Escribe el nombre del repuesto, por ejemplo aceite cinco W treinta, y dónde lo guardas, por ejemplo estantería A dos. El stock mínimo es el número que avisa antes de quedarte sin nada. El stock inicial es lo que hay hoy. Y el coste, lo que pagas por unidad."
   },
   {
    "t": 106,
    "txt": "Guardar",
    "voz": "Pulsa Guardar. La pieza recibe su código propio, empieza por P y un número, y su etiqueta cu erre para pegarla en la estantería. Con Etiquetas cu erre puedes imprimir todas de una vez."
   },
   {
    "t": 121.6,
    "txt": "Entrada de material",
    "voz": "Cuando llega un pedido, pulsa Entrada de material. Escribes el número del albarán, el proveedor, y añades cada pieza con su cantidad y su coste. Si marcas Registrar también el gasto en Finanzas, la compra se apunta sola en las cuentas."
   },
   {
    "t": 141.4,
    "txt": "Hacer un recuento",
    "voz": "Una vez al mes, cuenta las piezas de verdad. En la ficha de la pieza pulsa Recuento, escribe cuántas hay y por qué ajustas. Si falta material, el gerente lo ve como merma, y si pasa de cincuenta euros le llega un correo."
   },
   {
    "t": 162.1,
    "txt": "Herramientas",
    "voz": "En Herramientas ves cada herramienta con su estado. Disponible está en su sitio. En uso la tiene alguien, y sale su nombre. Mantenimiento está rota. Y Extraviada no aparece, y el gerente recibe un aviso."
   },
   {
    "t": 179,
    "txt": "Coger y devolver",
    "voz": "Para coger una herramienta, escanea su cu erre o búscala y pulsa Coger herramienta. Elige la orden de trabajo en la que la usas. Al terminar, pulsa Devolver. Por la noche, antes de cerrar la caja, todas las herramientas tienen que estar devueltas o localizadas."
   },
   {
    "t": 200.2,
    "txt": "Pedido al proveedor",
    "voz": "En Pedido salen solas las piezas por debajo del mínimo, con la cantidad que sugiere el panel. Puedes copiar el pedido, mandarlo por WhatsApp, bajarlo en Écsel o imprimirlo. Ojo: el pedido no se envía solo, tienes que mandarlo tú."
   },
   {
    "t": 219.5,
    "txt": "Movimientos",
    "voz": "Movimientos es el libro de todo lo que entra y sale, mes a mes. Solo lo ve el gerente. Sirve para descubrir por qué falta algo y para saber qué recambios se gastan más."
   },
   {
    "t": 236,
    "txt": "Recuerda",
    "voz": "Usa siempre el panel para sacar piezas y herramientas. Si todo se anota, el inventario siempre dice la verdad. Y así termina el vídeo del Inventario."
   }
  ]
 },
 {
  "id": "caja",
  "titulo": "Control de Caja",
  "dur": 299.3,
  "lineas": [
   {
    "t": 2.6,
    "txt": "Para qué sirve",
    "voz": "La caja es el cajón donde se guarda el dinero en efectivo. Esta pestaña sirve para contarlo al abrir, apuntar cada cobro y cada salida, y contarlo otra vez al cerrar. Nada se puede borrar, y eso protege a todos."
   },
   {
    "t": 21.9,
    "txt": "El estado de la caja",
    "voz": "Arriba se ve si la caja está abierta o cerrada. Luz verde es abierta, y dice quién la abrió, a qué hora y con cuánto dinero. Gris es cerrada, y enseña el último cierre. También dice cuánto dinero debería haber ahora en el cajón."
   },
   {
    "t": 43.1,
    "txt": "Los tres botones grandes",
    "voz": "Con la caja abierta hay tres botones grandes. Cobro en efectivo, para cuando entra dinero. Salida de dinero, para cuando sale. Y Cerrar la caja, para terminar el día. Vamos a verlos uno por uno."
   },
   {
    "t": 60.1,
    "txt": "Un cobro en efectivo",
    "voz": "Cuando un cliente paga en efectivo, pulsa Cobro en efectivo en el momento, no al final del día. Elige el tipo, taller, venta de coche o señal. Escribe el importe y el concepto, y si es de una reparación, elige la orden."
   },
   {
    "t": 80.3,
    "txt": "Registrar el cobro",
    "voz": "Pulsa Registrar el cobro. Aparece en la lista de movimientos del turno, con la hora y quién lo hizo. Una señal de un coche cuenta como parte del pago, no como un ingreso aparte."
   },
   {
    "t": 96.8,
    "txt": "Una salida de dinero",
    "voz": "Si sale dinero del cajón, pulsa Salida de dinero. Puede ser pago a un proveedor, una compra rápida, un retiro del propietario o un ingreso en el banco. Escribe el importe, el concepto y quién se lleva el dinero."
   },
   {
    "t": 115.7,
    "txt": "La foto del ticket",
    "voz": "Toda salida lleva foto del ticket o la factura. Si ahora no lo tienes, marca No tengo el ticket ahora. El gerente recibe un aviso y la salida queda marcada hasta que subas la foto con Añadir ticket."
   },
   {
    "t": 134,
    "txt": "Movimientos del turno",
    "voz": "Aquí abajo salen todos los movimientos de hoy. Si te equivocas, no se borra: el gerente lo anula con un motivo, y se queda escrito. Así nadie puede esconder nada."
   },
   {
    "t": 148.7,
    "txt": "Cerrar la caja",
    "voz": "Al terminar el día pulsa Cerrar la caja. Saca todo el dinero del cajón y cuéntalo. La pantalla no te dice cuánto debería haber: tú solo escribes lo que cuentas. Eso se llama arqueo ciego, y sirve para que nadie pueda adivinar."
   },
   {
    "t": 168.9,
    "txt": "Contar con más y menos",
    "voz": "Pulsa más por cada billete o moneda que tengas, y menos si te pasas. En cada fila hay un valor, de quinientos euros hasta un céntimo. El total se calcula solo, abajo."
   },
   {
    "t": 184.5,
    "txt": "Comprobar y cerrar",
    "voz": "Pulsa Comprobar y cerrar la caja. Si el dinero cuadra, la caja se cierra. Si no cuadra, cuenta otra vez. Y si sigue sin cuadrar, escribe qué ha pasado y pulsa Cerrar con esta explicación. El gerente lo verá."
   },
   {
    "t": 203.4,
    "txt": "Abrir la caja al día siguiente",
    "voz": "Por la mañana, pulsa Abrir la caja y cuenta el fondo con el que empiezas, igual que antes. Si no coincide con lo que quedó al cerrar, el panel te pide una explicación y avisa al gerente. Pulsa Abrir la caja, y ya puedes cobrar."
   },
   {
    "t": 225,
    "txt": "Solo para el gerente",
    "voz": "Más abajo el gerente tiene el cuadro de mando: alertas, turnos del mes, descuadres para revisar y el libro de registro. Si el libro dice que ha sido manipulado, es que alguien tocó los datos por fuera del panel. Con esto la caja queda controlada."
   }
  ]
 },
 {
  "id": "jornada",
  "titulo": "Fichaje y jornada",
  "dur": 156.1,
  "lineas": [
   {
    "t": 2.6,
    "txt": "Para qué sirve",
    "voz": "Aquí fichas cuando llegas, cuando paras y cuando te vas. Con un solo toque. Las horas quedan guardadas para que el gerente no tenga que apuntar nada en papel."
   },
   {
    "t": 16.8,
    "txt": "Entrar con tu usuario",
    "voz": "Para entrar, escribe tu usuario y tu pin, que son tus seis números secretos. No se los des a nadie. Pulsa Entrar."
   },
   {
    "t": 27.7,
    "txt": "El botón grande",
    "voz": "Al entrar sale un botón grande y verde, Registrar entrada. Es lo único que tienes que pulsar para empezar tu día. El panel te lleva solo al taller."
   },
   {
    "t": 41.5,
    "txt": "Fichar la entrada",
    "voz": "Pulsa el botón. Verás la hora exacta. La hora la pone el servidor, no el móvil, así que nadie puede cambiarla."
   },
   {
    "t": 51.9,
    "txt": "El reloj de arriba",
    "voz": "Arriba hay un chip con un punto verde y tus horas. Es tu reloj. Muestra cuánto has trabajado hoy. Tócalo cuando quieras parar o irte."
   },
   {
    "t": 64.3,
    "txt": "Hacer una pausa",
    "voz": "Para tomar un café o comer, toca el reloj y pulsa Iniciar pausa o comida. Si tenías un trabajo en marcha en el taller, se pone en pausa solo. Mientras estés en pausa no puedes usar el panel, así las horas cuadran."
   },
   {
    "t": 84.5,
    "txt": "Volver de la pausa",
    "voz": "Cuando vuelvas, pulsa el botón grande, Reanudar jornada. Tu trabajo continúa justo donde lo dejaste."
   },
   {
    "t": 92.2,
    "txt": "Fichar la salida",
    "voz": "Al irte a casa, toca el reloj y pulsa Registrar salida. Antes, devuelve las herramientas que tengas a tu nombre o di dónde se han quedado."
   },
   {
    "t": 105,
    "txt": "Si te equivocas",
    "voz": "Si pulsas salida por error, no pasa nada. En el aviso que aparece abajo pulsa Deshacer. Tienes dos minutos. Y el aviso se esconde solo en unos segundos."
   },
   {
    "t": 118.7,
    "txt": "Tus horas del mes",
    "voz": "Más abajo ves tus fichajes de hoy y tus horas del mes. Puedes descargar tu hoja en pe de efe cuando quieras. Así sabes siempre cuánto has trabajado."
   },
   {
    "t": 131.5,
    "txt": "Si te olvidas",
    "voz": "Si te olvidaste de fichar, no lo arregles tú: avisa al gerente. Él lo corrige con un motivo escrito y queda registrado. Y así de fácil es fichar."
   }
  ]
 },
 {
  "id": "fin",
  "titulo": "Finanzas",
  "dur": 261.3,
  "lineas": [
   {
    "t": 3,
    "txt": "Para qué sirve",
    "voz": "Finanzas junta los ingresos y los gastos del taller, de la venta de coches y de la caja. No hace falta apuntar nada dos veces. También prepara los documentos para la gestoría."
   },
   {
    "t": 18.5,
    "txt": "Elegir el periodo",
    "voz": "Arriba eliges si quieres mirar un día, una semana, un mes o un año. Las flechas te mueven al periodo anterior o al siguiente. Todos los números cambian con tu elección."
   },
   {
    "t": 33.7,
    "txt": "Los números principales",
    "voz": "Estas tarjetas cuentan cómo va el dinero: cuánto entra, cuánto sale, el beneficio y el efectivo que hay. El efectivo se compara con los cierres de caja. Si sale un descuadre, aquí lo verás."
   },
   {
    "t": 50.3,
    "txt": "Los gráficos",
    "voz": "Los gráficos dicen dónde se gana y dónde se gasta. Uno compara la rentabilidad del taller con la de los coches. Otro enseña a dónde se va el dinero, y otro cómo te pagan los clientes: efectivo, tarjeta o transferencia."
   },
   {
    "t": 69.6,
    "txt": "Pendientes",
    "voz": "En Pendientes está lo que falta por hacer: lo que hay por cobrar, las ventas de coches por completar y las salidas de caja sin clasificar. Si todo está al día, esta zona está vacía."
   },
   {
    "t": 86.6,
    "txt": "Apuntar un gasto",
    "voz": "Vamos a apuntar una factura. Pulsa menos Nuevo gasto."
   },
   {
    "t": 91.5,
    "txt": "Rellenar el gasto",
    "voz": "Escribe el proveedor, el concepto y la categoría, por ejemplo recambios. Elige si es del taller, de la venta o de otros. Escribe la base, que es el importe sin impuesto, y elige cómo se pagó."
   },
   {
    "t": 113,
    "txt": "Guardar el gasto",
    "voz": "Adjunta una foto o el pe de efe de la factura y pulsa Guardar gasto. El impuesto y los totales se calculan solos. Si pagas en efectivo, el dinero sale de la caja abierta de hoy."
   },
   {
    "t": 129.5,
    "txt": "Cobrar con tarjeta o transferencia",
    "voz": "En Por cobrar, junto a cada orden, pulsa Registrar cobro. Escribes cuánto ha pagado el cliente y cómo. Los presupuestos aceptados entran solos como ingreso, así que no los apuntes otra vez."
   },
   {
    "t": 145.1,
    "txt": "Completar la venta de un coche",
    "voz": "Cuando vendes un coche, pulsa Completar venta. Escribe el precio final, el comprador, la fecha y lo que costó el coche. Así el panel calcula cuánto has ganado con ese coche. Ojo: los pagos en efectivo de mil euros o más no están permitidos, pregunta a tu gestoría."
   },
   {
    "t": 168.1,
    "txt": "Clasificar las salidas de caja",
    "voz": "Las salidas de caja que no tienen categoría salen aquí. Ábrelas y elige a qué pertenecen: recambios, suministros, mantenimiento. Los retiros del propietario no son gastos, solo cambian el dinero de sitio."
   },
   {
    "t": 183.8,
    "txt": "Facturas emitidas y recibidas",
    "voz": "Abajo están las facturas emitidas, que son ingresos, y las recibidas, que son gastos, cada una con su archivo. No se borran: se anulan con un motivo."
   },
   {
    "t": 197.1,
    "txt": "Para la gestoría",
    "voz": "A final de trimestre, elige el periodo y pulsa Écsel emitidas, Écsel recibidas y pe de efe asesoría. Envía esos tres archivos a tu gestoría y ya está. Así termina Finanzas."
   }
  ]
 },
 {
  "id": "resp",
  "titulo": "Respuestas",
  "dur": 187.7,
  "lineas": [
   {
    "t": 2.6,
    "txt": "Para qué sirve",
    "voz": "Esta pestaña te escribe las respuestas. Si un cliente deja una reseña en Gúgel, o te escribe por WhatsApp o por Instagram, eliges el caso y el panel te da un texto listo para copiar. Así contestas rápido, con educación y sin faltas."
   },
   {
    "t": 23.3,
    "txt": "Los tres canales",
    "voz": "Arriba eliges dónde vas a contestar: reseñas de Gúgel, WhatsApp, o Instagram y Facebook. Cada canal tiene sus propios textos."
   },
   {
    "t": 33.3,
    "txt": "Reseñas de Google: el nombre",
    "voz": "En Gúgel, primero escribe el nombre del cliente tal cual aparece en su reseña. La respuesta empezará saludándole por su nombre."
   },
   {
    "t": 43.8,
    "txt": "Las estrellas",
    "voz": "Después toca las estrellas que puso: de cinco a una. Con cinco estrellas, la respuesta da las gracias. Con una o dos, pide perdón y ofrece una solución."
   },
   {
    "t": 57.5,
    "txt": "El tipo de reseña y el servicio",
    "voz": "Elige qué tipo de reseña es y qué servicio usó, por ejemplo taller o compra de un coche. Y si quieres, marca hasta dos cosas que destaca, como el trato o la rapidez. Así la respuesta suena a una persona real."
   },
   {
    "t": 77.3,
    "txt": "Idioma, español o inglés",
    "voz": "Si el cliente escribió en inglés, pulsa English y la respuesta sale en inglés. En la isla vienen muchos turistas, así que esto ayuda mucho."
   },
   {
    "t": 89.6,
    "txt": "Tu respuesta",
    "voz": "Abajo aparece tu respuesta. Puedes leerla y cambiarla si quieres. Si no te gusta, pulsa Otra versión y sale un texto distinto."
   },
   {
    "t": 100.6,
    "txt": "Copiar y pegar",
    "voz": "Pulsa Copiar respuesta, y después Abrir mis reseñas. Se abre Gúgel. Pega la respuesta, y ya está. Una respuesta rápida a cada reseña mejora la imagen del negocio."
   },
   {
    "t": 114.3,
    "txt": "WhatsApp: mensajes ya escritos",
    "voz": "En WhatsApp hay mensajes preparados: para confirmar una cita, mandar un presupuesto, avisar de que el coche está listo y más. Escribe el nombre, el coche, el día y la hora, y todos los mensajes se rellenan solos. Pulsas el botón de WhatsApp y se abre con el texto escrito."
   },
   {
    "t": 138.2,
    "txt": "Instagram y Facebook",
    "voz": "En Instagram y Facebook pasa igual: mensajes listos para copiar. Abajo, hay una guía para activar respuestas automáticas, que se configura una sola vez. Y así termina Respuestas."
   }
  ]
 }
];

// Ajustes de la voz (ElevenLabs): los pide el gerente
export const VOZ_AJUSTES = { modelo: "eleven_multilingual_v2", stability: 0.5, similarity_boost: 0.8, formato: "mp3_44100_128", nombre: "DAN" };
export const palabras = (t: string) => (t.match(/[\p{L}\p{N}]+/gu) || []).length;
export const guion = (id: string) => GUIONES.find((g) => g.id === id);
// Cuánto tiempo (s) tiene cada línea hasta que empieza la siguiente (o acaba el vídeo)
export const huecos = (g: Guion) => g.lineas.map((l, i) => (i + 1 < g.lineas.length ? g.lineas[i + 1].t : g.dur) - l.t);
