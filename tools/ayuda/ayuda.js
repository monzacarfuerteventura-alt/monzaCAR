/* =====================================================================
   AYUDA · manual de uso del panel, por pestaña y por puesto
   Fuente: tools/ayuda/ayuda.js (+ ayuda.css) → se copia dentro de admin.html con
   python3 tools/ayuda/inyectar.py. Para cambiar un texto, edítalo aquí y vuelve a inyectar.
   Estructura de cada módulo: objetivo · cuándo usarlo · mapa de la pantalla ·
   guías paso a paso («¿Cómo hago para…?») · glosario de estados.
   ===================================================================== */
const AY_ROLES=[["ger","Gerente"],["rec","Recepción"],["mec","Mecánico"],["cal","Calidad"],["caj","Caja"]];
const AY_TODOS=["ger","rec","mec","cal","caj"];
const AY_MODS=[
/* ------------------------------------------------------------------ */
{id:"inicio",ico:"🚀",titulo:"Primeros pasos",tab:"",roles:AY_TODOS,
 objetivo:"Entrar al panel, saber qué pestañas ves según tu puesto y moverte por él sin perderte.",
 cuando:["Tu primer día en Volcano Cars.","Entras desde un móvil o tablet nuevos.","Echas en falta una pestaña y no sabes por qué."],
 mapa:{filas:[[[1,"Barra superior: tu nombre y puesto · Ver web · Seguridad · Salir",1]],[[2,"Pestañas: Dashboard · CRM · Taller · Inventario · Caja · Finanzas · Agenda · Coches · Ayuda",1]],[[3,"Zona central: lo que haces en la pestaña abierta",2],[4,"Panel lateral: se abre a la derecha al tocar un cliente u orden",1]]],
  zonas:[[1,"Barra superior","Arriba del todo. «Ver web» abre la página pública; «Seguridad» (solo gerente) gestiona contraseñas y sesiones; «Salir» cierra tu sesión."],
   [2,"Pestañas","Cada una es una parte del negocio. Un <b>número rojo</b> encima significa que hay cosas pendientes (clientes sin contestar, citas de hoy, alertas de caja…)."],
   [3,"Zona central","Aquí trabajas: listas, formularios y fichas."],
   [4,"Panel lateral","Se desliza desde la derecha con la ficha completa de un cliente, una orden o un ajuste. Ciérralo con la ✕."]]},
 pasos:[
  {t:"Entrar como gerente (con contraseña)",r:["ger"],p:[
   "Abre <b>volcanocars.com/admin</b> en el ordenador o el móvil.",
   "Escribe tu <b>contraseña</b> y pulsa <b>Entrar</b>.",
   "Si tienes la verificación en dos pasos activada, escribe el <b>código de 6 cifras</b> de la app del móvil. ¿Sin móvil? Usa uno de tus <b>códigos de recuperación</b> (formato XXXX-XXXX)."],
   tip:"Los intentos fallidos bloquean la conexión un rato. Si te equivocas dos veces, para y revisa las mayúsculas."},
  {t:"Entrar como equipo del taller (usuario y PIN)",r:["rec","mec","cal","caj"],p:[
   "Abre <b>volcanocars.com/admin</b> en la tablet del taller o en tu móvil.",
   "Pulsa el enlace <b>«Entrar como equipo del taller (usuario y PIN)»</b> que hay debajo del botón Entrar.",
   "Escribe tu <b>usuario</b> y tu <b>PIN</b> (6 a 8 números) que te ha dado el gerente y pulsa <b>Entrar</b>.",
   "<b>La primera vez en cada móvil o tablet</b> te sale un QR: ábrelo con <b>Google Authenticator</b> (+ → Escanear código QR), escribe el código de 6 cifras y guarda tus <b>8 códigos de recuperación</b>. Deja marcado <b>«Confiar en este dispositivo 30 días»</b> y no te lo volverá a pedir ahí.",
   "Arriba verás tu nombre y tu puesto. Si no has fichado, te sale el botón grande de <b>Registrar entrada</b>: un toque y entras."],
   tip:"Al pulsar <b>Salir</b>, el panel te pide devolver o localizar las herramientas que tengas a tu nombre. Es normal: así no se pierde nada."},
  {t:"Dar de alta a una persona del equipo",r:["ger"],p:[
   "Ve a <b>Taller</b> y pulsa <b>«Equipo y ajustes»</b> (arriba a la derecha).",
   "Abre <b>«+ Añadir persona»</b> y rellena: <b>Nombre</b>*, <b>Usuario</b>* (sin espacios, ej. «pedro»), <b>Puesto</b>, <b>Horas pagadas al día</b>, <b>Fecha de alta</b> y un <b>PIN</b>* de 6 a 8 números.",
   "Marca <b>«Puede usar la caja»</b> solo si esa persona va a cobrar o pagar en efectivo.",
   "Pulsa <b>Añadir</b> y pásale su usuario y PIN en persona."],
   tip:"«Dar de baja» no borra a nadie: sus fichajes siguen contando en los informes. Para cambiar un PIN olvidado, abre a la persona y escribe uno nuevo."}],
 estados:{t:"Qué ve cada puesto",c:["Puesto","Qué puede hacer"],f:[
  ["Gerente","Todo el panel: clientes, ventas, finanzas, ajustes, correcciones y seguridad."],
  ["Recepción","Taller (recepciones, coches listos, avisos de ITV) e Inventario (dar de alta piezas y registrar entradas de material)."],
  ["Mecánico","Taller (sus trabajos, inspecciones y fichajes) e Inventario (cargar recambios a una orden y coger herramientas)."],
  ["Calidad","Taller (control de calidad e inspecciones) e Inventario."],
  ["Permiso de caja","Se suma a cualquier puesto: abrir y cerrar la caja, cobrar y registrar salidas de efectivo."]]}},

/* ------------------------------------------------------------------ */
{id:"dash",ico:"📊",titulo:"Dashboard",tab:"dash",roles:["ger"],
 objetivo:"Ver de un vistazo cómo va el negocio en el mes: visitas, clientes, ventas, taller y almacén.",
 cuando:["Cada lunes, para revisar la semana anterior.","A fin de mes, para descargar el informe PDF.","Cuando quieres saber qué anuncios o canales traen clientes."],
 mapa:{filas:[[[1,"Título · ‹ Mes › · Informe PDF · Excel",1]],[[2,"Indicadores (visitas, solicitudes, facturación…)",1]],[[3,"Gráficos: visitas, embudo, de dónde vienen",2],[4,"Coches: interés real",1]],[[5,"Taller: rendimiento y alertas",1],[6,"Almacén",1]]],
  zonas:[[1,"Cabecera","Cambia de mes con las flechas ‹ ›. «Informe PDF» abre la impresión (elige «Guardar como PDF») y «Excel» descarga los datos."],
   [2,"Indicadores","Visitas, solicitudes, conversión web, tiempo de respuesta, citas, presupuestos, facturación, clics en WhatsApp… Cada uno compara con el mes anterior."],
   [3,"Gráficos","Visitas y solicitudes por día, embudo de clientes, de dónde vienen, cuándo te visitan, público y servicios de taller más pedidos."],
   [4,"Coches: interés real","Qué coches miran y piden más: te dice cuáles mover de precio o destacar."],
   [5,"Taller","Productividad de cada mecánico, desviación de tiempos, calidad a la primera, motivos de pausa, alertas y auditoría."],
   [6,"Almacén","Resumen de stock bajo, consumos y mermas."]]},
 pasos:[
  {t:"Sacar el informe del mes en PDF",r:["ger"],p:["Abre <b>Dashboard</b>.","Elige el mes con las flechas <b>‹ ›</b>.","Pulsa <b>«Informe PDF»</b>; en la ventana de imprimir, elige <b>«Guardar como PDF»</b>."],tip:"Para la gestoría usa mejor el <b>PDF asesoría</b> de Finanzas: lleva las facturas emitidas y recibidas."},
  {t:"Revisar el rendimiento del taller",r:["ger"],p:["Baja hasta el bloque <b>«Taller · mes»</b>.","Mira la <b>productividad</b> de cada mecánico (verde ≥ 85 %, ámbar ≥ 65 %, rojo por debajo).","Toca cualquier alerta para abrir directamente la ficha de esa orden."],tip:"Si un mecánico sale siempre en rojo, mira primero los <b>motivos de las pausas</b>: casi siempre es falta de recambio o espera de autorización, no el mecánico."}],
 estados:{t:"Colores de los indicadores",c:["Color","Qué significa"],f:[["Verde","Va bien o mejor que el mes anterior."],["Ámbar","Vigílalo: se está alejando del objetivo."],["Rojo","Hay que actuar (por ejemplo, productividad por debajo del 65 %)."]]}},

/* ------------------------------------------------------------------ */
{id:"crm",ico:"👥",titulo:"CRM · Clientes",tab:"leads",roles:["ger"],
 objetivo:"Contestar a todo el que pide algo (web, WhatsApp, teléfono o en persona) y hacer el seguimiento hasta que compra o se descarta.",
 cuando:["Entra una solicitud nueva desde la web (taller, coche, financiación, consulta, alerta de coches).","Un cliente llama o viene sin cita y quieres apuntarlo.","Tienes que llamar a alguien «mañana» y no quieres que se olvide."],
 flujo:["Nueva","Contactado","Cita","Ganada / Perdida"],
 mapa:{filas:[[[1,"CRM · + Nuevo cliente · Exportar a Excel · Actualizar",1]],[[2,"Tareas: Sin contestar · Seguimientos · Citas de hoy · Presupuestos",1]],[[3,"Buscar · Tipo · Lista / Embudo / Clientes",1]],[[4,"Filtros por estado",1]],[[5,"Lista de clientes (WhatsApp · Llamar · Estado)",2],[6,"Ficha del cliente (panel lateral)",1]]],
  zonas:[[1,"Cabecera","«+ Nuevo cliente» para apuntar llamadas o visitas; «Exportar a Excel» descarga todos los clientes."],
   [2,"Tareas del día","Cuatro contadores que se pulsan: <b>Sin contestar</b> (se pone rojo si el más antiguo lleva más de 15 min), <b>Seguimientos para hoy</b>, <b>Citas de hoy</b> y <b>Presupuestos enviados</b> esperando respuesta."],
   [3,"Buscador y vistas","Busca por nombre, teléfono, matrícula o coche. <b>Lista</b> = todas las solicitudes; <b>Embudo</b> = columnas por estado (arrastra tarjetas); <b>Clientes</b> = una fila por persona con todo su historial."],
   [4,"Filtros","Pendientes, Nuevas, Seguimiento, Contactado, Cita, Ganadas, Perdidas y Todas."],
   [5,"Cada fila","Tipo, nombre, qué quiere, cuándo llegó y de dónde. A la derecha: botón de <b>WhatsApp</b>, <b>Llamar</b> y el <b>estado</b>. Chips: ⚡ VIP, 📅 cita, 🚩 seguimiento (rojo si está vencido), importe y estado en el taller."],
   [6,"Ficha del cliente","Todo lo que sabes de él: datos, fotos del daño, seguimiento comercial, plantillas de WhatsApp, notas e historial."]]},
 pasos:[
  {t:"Contestar a una solicitud nueva",r:["ger"],p:[
   "Pulsa la tarea <b>«Sin contestar»</b> o busca las filas con la etiqueta <b>Nueva</b>.",
   "Toca la fila para abrir la <b>ficha del cliente</b>.",
   "En <b>«Enviar un WhatsApp»</b> elige la plantilla (primer contacto, presupuesto VIP, recordar la cita, documentos para financiar…), repasa el texto y pulsa <b>«Abrir en WhatsApp»</b>.",
   "Envía el mensaje en WhatsApp: el panel lo anota solo en el historial.","Cambia el <b>estado</b> a <b>Contactado</b> (desplegable de arriba de la ficha)."],
   tip:"La web promete respuesta en <b>menos de 1 hora</b> en horario de apertura. El «Tiempo de respuesta» del Dashboard mide justo esto."},
  {t:"Apuntar a un cliente que llama o viene en persona",r:["ger"],p:[
   "Pulsa <b>«+ Nuevo cliente»</b>.",
   "Elige el <b>tipo</b> (taller, coche, consulta…), escribe <b>nombre</b>* y <b>teléfono</b>*, y el canal (Teléfono, En persona, WhatsApp, Recomendación…).",
   "Si es de taller, añade coche y matrícula; si es por un coche, elígelo de la lista.",
   "Pulsa <b>Guardar</b>: se abre su ficha para seguir trabajando."]},
  {t:"Programar un seguimiento (para no olvidarte de llamar)",r:["ger"],p:[
   "Abre la ficha del cliente.",
   "En <b>«Seguimiento comercial»</b> pulsa <b>Mañana</b>, <b>En 3 días</b> o <b>En 1 semana</b> (o elige fecha).",
   "Escribe en <b>Importe</b> lo que se está negociando (IGIC incluido)."],
   tip:"El día que toque, el cliente aparece en la tarea <b>«Seguimientos para hoy»</b> con la bandera en rojo."},
  {t:"Anotar una llamada, visita o nota",r:["ger"],p:[
   "En la ficha, bloque <b>«Registrar»</b>, pulsa lo que ha pasado: <b>Le he llamado</b>, <b>Le he escrito</b>, <b>Email enviado</b> o <b>Ha venido</b>.",
   "Si quieres, escribe antes una nota (precio ofrecido, qué le dijiste, cuándo volver a llamar).",
   "Para una nota suelta, escríbela y pulsa <b>«Guardar nota»</b>."]},
  {t:"Cerrar un cliente como ganado o perdido",r:["ger"],p:[
   "Cambia el <b>estado</b> arriba de la ficha (o en la fila) a <b>Ganada</b> o <b>Perdida</b>.",
   "Si es <b>Perdida</b>, elige el motivo: Precio, No contesta, Compró en otro sitio, Ya no lo necesita, Sin financiación, Coche vendido u Otro."],
   tip:"Pon siempre el motivo: el Dashboard te dirá por qué pierdes ventas."},
  {t:"Pasar un cliente de taller al taller",r:["ger"],p:[
   "Abre la ficha del cliente de tipo <b>Taller</b>.",
   "Pulsa <b>«+ Crear orden de trabajo»</b>.",
   "Mándale el <b>enlace de seguimiento</b> por WhatsApp desde la orden: desde él verá el coche en vivo y aprobará el presupuesto."],
   tip:"Si el coche ya está delante, es más rápido hacerlo desde <b>Taller → «+ Nueva recepción»</b> y elegir su solicitud en el desplegable."},
  {t:"Borrar a un cliente que lo pide (derecho de supresión)",r:["ger"],p:["Abre su ficha y baja del todo.","Pulsa <b>«Borrar cliente (derecho de supresión)»</b> y confirma."],tip:"No se puede deshacer. Hazlo solo si el cliente lo pide por escrito."}],
 estados:{t:"Estados de un cliente",c:["Estado","Qué significa","Cuándo ponerlo"],f:[
  ["Nueva","Ha llegado y nadie le ha contestado.","Lo pone el sistema."],
  ["Contactado","Ya le has escrito o llamado.","Cámbialo tú después de contestarle. Los clientes apuntados a mano ya entran así."],
  ["Cita","Tiene día y hora para venir.","Solo al reservar en la web o cuando quedas con él."],
  ["Ganada","Ha comprado o reparado.","Al cerrar la venta o entregar el coche."],
  ["Perdida","No sigue adelante.","Cuando se descarta. Elige siempre el motivo."],
  ["⚡ VIP +10 %","Pidió la Prioridad Taller.","Lo marca la web: atiéndelo primero."],
  ["🔔 Alerta","Quiere que le avises cuando entre un coche que encaje.","Lo marca la web."]]}},

/* ------------------------------------------------------------------ */
{id:"agenda",ico:"📅",titulo:"Agenda",tab:"agenda",roles:["ger"],
 objetivo:"Ver las citas que los clientes han reservado en la web y cerrar los días en que no se puede reservar.",
 cuando:["Cada mañana, para preparar las citas del día.","Antes de vacaciones o festivos.","Cuando un cliente cancela."],
 mapa:{filas:[[[1,"Citas por día: hora · cliente · qué quiere",2],[2,"Botones de cada cita",1]],[[3,"Días cerrados: fecha · Cerrar ese día",1]]],
  zonas:[[1,"Lista de citas","Agrupadas por día, empezando por hoy. La siguiente cita lleva la etiqueta <b>Próxima</b>. Solo salen citas futuras y no canceladas."],
   [2,"Acciones","<b>Recordar por WhatsApp</b> (mensaje con día, hora y dirección), <b>Llamar</b>, <b>Hecha</b> y <b>Cancelar cita</b>."],
   [3,"Días cerrados","Bloquea días completos: la web deja de ofrecerlos. Las citas que ya existían no se borran."]]},
 pasos:[
  {t:"Recordar la cita a un cliente",r:["ger"],p:["Abre <b>Agenda</b>.","En la cita, pulsa <b>«Recordar por WhatsApp»</b>.","Envía el mensaje, que ya lleva el día, la hora y la dirección."],tip:"Mándalo la tarde anterior: reduce mucho los clientes que no aparecen."},
  {t:"Cancelar una cita",r:["ger"],p:["Pulsa <b>«Cancelar cita»</b> y confirma.","La hora queda libre en la web al momento.","<b>Avisa tú al cliente</b>: el panel no le manda nada."]},
  {t:"Cerrar un día (vacaciones o festivo)",r:["ger"],p:["En <b>«Días cerrados»</b>, elige la fecha.","Pulsa <b>«Cerrar ese día»</b>.","Para volver a abrirlo, toca el día en la lista de cerrados."],tip:"Los días cerrados también cuentan para calcular las horas pagadas de los mecánicos en el Dashboard."}],
 estados:{t:"Etiquetas de una cita",c:["Etiqueta","Qué significa"],f:[["Visita","Viene a ver o probar un coche."],["Taller","Trae su coche al taller."],["Próxima","Es la siguiente cita del día."],["Hecha","Ya ha venido (el cliente pasa a Ganada)."]]}},

/* ------------------------------------------------------------------ */
{id:"coches",ico:"🚗",titulo:"Coches y reservas",tab:"coches",roles:["ger"],
 objetivo:"Publicar los coches en venta, gestionar las reservas online de 50 € y configurar la financiación que ve la web.",
 cuando:["Entra un coche nuevo para vender.","Un cliente reserva un coche online.","Cambia el precio o se vende un coche."],
 flujo:["Disponible","Reservado","Vendido"],
 mapa:{filas:[[[1,"Tus coches · ¿No sabes cómo publicar? · + Añadir coche",1]],[[2,"Cifras rápidas",1]],[[3,"Financiación en la web (desplegable)",1]],[[4,"Reservas online · listas de espera · cómo te pagan",1]],[[5,"Lista de coches con foto, precio y estado",1]]],
  zonas:[[1,"Cabecera","«+ Añadir coche» abre el formulario. «¿No sabes cómo publicar y vender?» abre la Guía de Venta (SOP-02)."],
   [2,"Cifras","Coches en venta, reservados, vendidos e interés de la semana."],
   [3,"Financiación","Entidad, TIN, comisión, plazos, entrada, importe mínimo y antigüedad máxima: con esto la web calcula la cuota y la TAE."],
   [4,"Reservas online","Reservas activas con su justificante, botones para confirmar, alargar, liberar o vender, y listas de espera de coches reservados."],
   [5,"Lista","Toca un coche para editarlo. Cambia el estado desde la propia fila."]]},
 pasos:[
  {t:"Publicar un coche",r:["ger"],p:[
   "Pulsa <b>«+ Añadir coche»</b>.",
   "<b>Fotos</b>: súbelas en el orden de la guía (las 3 primeras son la portada). La primera es la principal.",
   "<b>Vídeo 360°</b> (opcional): vuelta al coche con el móvil, de 30 a 60 s, en horizontal.",
   "<b>El coche</b>: Marca*, Modelo*, Año*, Kilómetros*, <b>Precio final con IGIC</b>*, y si puedes combustible, cambio, etiqueta DGT, CV, puertas y color.",
   "<b>Comparativa de mercado</b>: apunta los precios que has visto y dónde; la web enseña que tu precio es justo.",
   "<b>Descripción</b> y <b>equipamiento</b> (uno por línea).",
   "<b>Publicación</b>: estado <b>Disponible</b> y, si quieres, <b>Destacar en la portada</b>. Pulsa <b>«Publicar coche»</b>."],
   tip:"Si hay fotos o vídeo subiéndose, espera a que terminen antes de salir. El coche aparece en la web al momento."},
  {t:"Confirmar una reserva de 50 € por transferencia o Bizum",r:["ger"],p:[
   "Te llega el aviso y el coche sale como <b>RESERVADO</b> en cuanto el cliente sube el justificante.",
   "En <b>Reservas online</b>, pulsa <b>«Ver el justificante»</b> y comprueba que el dinero está en tu cuenta.",
   "Pulsa <b>«✓ He visto el dinero: confirmar»</b> y mándale <b>«WhatsApp: confirmación»</b>."],
   ojo:"Si no confirmas en <b>12 horas</b>, la reserva se libera sola y el coche vuelve a estar disponible."},
  {t:"Cerrar una reserva (venta, más tiempo o devolución)",r:["ger"],p:[
   "Si compra: <b>«Lo ha comprado»</b> (el coche pasa a Vendido y la venta aparece en Finanzas para completarla).",
   "Si necesita más tiempo: <b>«Alargar 48 h»</b>.",
   "Si no compra: pulsa <b>«Liberar»</b> (el coche vuelve a estar disponible) y, cuando le devuelvas el dinero, <b>«Ya le he devuelto los 50 €»</b>."],
   tip:"Las reservas liberadas con la devolución pendiente siguen en la lista para que no se olvide."},
  {t:"Avisar a la lista de espera de un coche",r:["ger"],p:["Cuando un coche reservado vuelve a estar libre, abre <b>Listas de espera</b>.","Pulsa <b>«Avisar por WhatsApp»</b> en cada persona.","Quítala de la lista cuando ya esté avisada."]},
  {t:"Cambiar las condiciones de financiación",r:["ger"],p:["Abre <b>«Financiación en la web»</b> → <b>Cambiar</b>.","Copia las condiciones exactas de la financiera: TIN, comisión, plazos, entrada, importe mínimo y antigüedad máxima.","Marca si quieres enseñar la calculadora y el «desde X €/mes» en las tarjetas, y guarda."],ojo:"Pon solo condiciones reales de la financiera: la web calcula con ellas la TAE y el ejemplo que exige la ley."}],
 estados:{t:"Estados de un coche",c:["Estado","Qué ve el cliente","Cuándo ponerlo"],f:[
  ["Disponible","Se ve en la web y se puede reservar.","Al publicarlo."],
  ["Reservado","Sale con la etiqueta «Reservado».","Se pone solo con una reserva online, o a mano si alguien deja señal."],
  ["Vendido","Sale 60 días en «Vendidos recientemente».","Al firmar la venta."]]}},

/* ------------------------------------------------------------------ */
{id:"taller",ico:"🛠️",titulo:"Taller (manual SOP-01)",tab:"ordenes",roles:AY_TODOS,
 objetivo:"Llevar cada coche que entra al taller de principio a fin con su orden VC-año-número y sus 4 fichas: recepción, inspección 360°, tiempos y calidad.",
 cuando:["Entra un coche de un cliente, uno comprado para vender o una retoma.","Vas a empezar, pausar o terminar un trabajo.","Hay que revisar un coche antes de entregarlo."],
 flujo:["Recepcionado · FORM-01","En inspección · FORM-02","Presupuesto aceptado","En trabajo · FORM-03","Control de calidad · FORM-04","Listo → Entregado"],
 mapa:{filas:[[[1,"Vistas: En marcha / Mis trabajos · Órdenes · Tablero · Avisos de ITV",2],[2,"Buscar · Equipo y ajustes · + Nueva recepción",1]],[[3,"Avisos del taller (rojo / ámbar)",1]],[[4,"Coches y trabajos según la vista elegida",1]]],
  zonas:[[1,"Vistas","<b>En marcha / Mis trabajos</b>: lo que te toca hacer a ti. <b>Órdenes</b>: tabla con filtros por fase y Excel. <b>Tablero</b>: columnas por estado. <b>Avisos de ITV</b>: clientes a los que caduca la ITV (gerente y recepción)."],
   [2,"Acciones","Busca por matrícula, cliente o Nº de orden. «+ Nueva recepción» crea la orden y abre FORM-01."],
   [3,"Avisos","Lo que no puede esperar: puntos en ROJO sin presupuesto, desviaciones sin justificar, coches esperando calidad. Toca uno para ir a la ficha."],
   [4,"Tarjetas","Cada coche con su matrícula, el Nº de orden, el cliente y el estado de sus 4 fichas."]]},
 extra:{t:"Dentro de una orden",filas:[[[1,"← Taller · Nº orden · coche y cliente · Imprimir · PDF · Presupuesto y cliente",1]],[[2,"Fases: Recepcionado → Inspección → Trabajo → Calidad → Entregado",1]],[[3,"Pestañas: FORM-01 · FORM-02 · FORM-03 · FORM-04 · Auditoría",1]],[[4,"La ficha abierta",1]],[[5,"Barra de guardado: Guardar · Firmar",1]]],
  zonas:[[1,"Cabecera","«Presupuesto y cliente» (solo gerente) abre el presupuesto, el enlace del cliente, las fotos y los mensajes."],[2,"Fases","Dónde está el coche. Avanza sola al firmar cada ficha."],[3,"Pestañas","Cada una muestra si está sin empezar, en curso o firmada."],[5,"Barra de guardado","Todo se guarda solo mientras escribes. <b>Firmar</b> cierra la ficha: después solo el gerente puede reabrirla."]]},
 pasos:[
  {t:"Recibir un coche (FORM-01 Recepción)",r:["rec","ger","mec"],p:[
   "Pulsa <b>«+ Nueva recepción»</b>. Si el cliente pidió cita en la web, elígelo en el desplegable; si no, escribe <b>nombre</b>*, teléfono, <b>matrícula</b>* y modelo.",
   "Elige el tipo de entrada: <b>Reparación</b>, <b>Compra</b> o <b>Retoma</b>, y pulsa <b>«Crear y abrir FORM-01»</b>.",
   "Con el cliente delante, rellena: datos del cliente (¿es el titular?, cómo quiere que le avisemos), <b>kilómetros</b>*, <b>nivel de combustible</b>*, fecha de <b>ITV</b>, testigos encendidos y foto del cuadro.",
   "Escribe el <b>motivo</b> con sus propias palabras.",
   "Marca el <b>inventario</b> (Sí/No en cada línea) y el número de llaves.",
   "Toca el <b>dibujo del coche</b> donde haya daños (elige antes el tipo: rayón, abolladura, picado, golpe, salitre, otro) y haz al menos una foto. Si no hay, marca «Sin daños previos».",
   "Escribe hasta cuánto <b>autoriza el diagnóstico</b>, marca las casillas de avisos (reparación y, si quiere, <b>ITV</b>) y que <b>firme con el dedo</b>.",
   "Pulsa <b>«Firmar y cerrar la recepción»</b>."],
   tip:"Si falta algo obligatorio, el panel te dice exactamente qué antes de dejarte firmar. Si el cliente no es el titular, anota en el motivo que trae su autorización."},
  {t:"Hacer la inspección 360° (FORM-02)",r:["mec","cal","ger"],p:[
   "Abre la orden desde <b>«Por inspeccionar»</b> y ve a la pestaña <b>FORM-02</b>.",
   "Recorre las 7 secciones: exterior, interior, mecánica, neumáticos/frenos/suspensión, diagnosis OBD, prueba en carretera y documentación.",
   "En cada línea marca <b>OK</b>, <b>Á</b> (ámbar: vigilar), <b>R</b> (rojo: reparar ya) o <b>NA</b>. Todo Ámbar o Rojo necesita <b>nota</b> y, mejor, foto.",
   "Escribe las <b>horas estimadas</b> y la <b>recomendación</b>, y pulsa <b>«Firmar la inspección»</b>."],
   tip:"Al firmar con puntos en Ámbar o Rojo, la orden pasa sola a <b>Presupuesto</b>."},
  {t:"Enviar el presupuesto al cliente",r:["ger"],p:[
   "En la orden, pulsa <b>«Presupuesto y cliente»</b>.",
   "Añade una línea por concepto: <b>concepto</b>, <b>cantidad</b> y <b>precio sin IGIC</b>. Revisa el IGIC (7 % por defecto) y la fecha de validez.",
   "Pulsa <b>«Enviar al cliente»</b> y luego <b>«Avisar por WhatsApp»</b>.",
   "El cliente lo acepta o rechaza desde su enlace; verás quién y cuándo."],
   tip:"Si el cliente no acepta los puntos en rojo, que firme el rechazo en FORM-02: así la alerta desaparece y quedas cubierto."},
  {t:"Fichar un trabajo (FORM-03 Tiempos)",r:["mec","ger"],p:[
   "Abre tu trabajo desde <b>«Asignados a mí»</b> → pestaña <b>FORM-03</b>.",
   "Revisa los datos (tipo de trabajo y tiempo estimado) y pulsa <b>«▶ Iniciar trabajo»</b>.",
   "Si paras, pulsa el <b>motivo de la pausa</b> (recambio pendiente, otro coche urgente, comida, espera de autorización, falta de herramienta…). Para seguir: <b>«▶ Reanudar»</b>.",
   "Al acabar, pulsa <b>«■ Terminar»</b>: el coche pasa a Control de calidad."],
   ojo:"La hora la pone el servidor: nadie puede escribirla a mano. Si te olvidas de fichar, avisa al gerente: solo él puede corregirla y queda registrado.",
   tip:"Si el tiempo real se pasa del límite, te pedirá <b>justificar la desviación</b> (causas A–H y una explicación). Después el gerente da el visto bueno."},
  {t:"Cargar recambios y herramientas a una orden",r:["mec","ger","rec"],p:[
   "Dentro de la orden, busca el bloque <b>«Recambios y herramientas de esta orden»</b>.",
   "Busca o <b>escanea</b> el recambio y pon la cantidad: se descuenta del almacén al momento.",
   "Para una herramienta de valor, pulsa <b>«+ Coger herramienta para esta orden»</b>."],tip:"Si sobra una pieza, devuélvela desde ahí mismo indicando el motivo."},
  {t:"Hacer el control de calidad (FORM-04)",r:["cal","mec","ger"],p:[
   "Abre la orden desde <b>«Control de calidad»</b> → pestaña <b>FORM-04</b>.",
   "Elige el destino: <b>Entrega a cliente</b> (secciones A + B + C) o <b>Inventario de venta</b> (A + B + D).",
   "Marca cada punto <b>SÍ</b>, <b>NO</b> o <b>NA</b>.",
   "Elige el resultado y pulsa <b>«Firmar el control de calidad»</b>."],
   ojo:"Lo firma siempre <b>otra persona</b> distinta del mecánico que hizo el trabajo. Si hay algún NO, el resultado es «Rechazado»: el coche vuelve a taller y hay que escribir la causa."},
  {t:"Cerrar la orden y entregar el coche",r:["ger"],p:[
   "Con calidad aprobada, el coche pasa a <b>Listo para recoger</b>. Avisa al cliente con <b>«Avisar: coche listo»</b> en «Presupuesto y cliente».",
   "El gerente pulsa <b>«Cerrar la orden (visto bueno final)»</b> en FORM-04.",
   "Al entregarlo: <b>«Marcar como entregado al cliente»</b> (o «Pasar a exposición» si es para vender).",
   "Cobra en <b>Control de Caja</b> (efectivo) o en <b>Finanzas → Registrar cobro</b> (tarjeta, transferencia)."]},
  {t:"Mandar los avisos de ITV",r:["ger","rec"],p:[
   "Pulsa la vista <b>«Avisos de ITV»</b> (el número indica cuántos faltan por enviar).",
   "Empieza por <b>«Caduca en 7 días o menos»</b> y luego <b>«Caduca en 30 días»</b>.",
   "Pulsa <b>WhatsApp</b>: se abre con el mensaje escrito y el aviso queda marcado como enviado.",
   "Si alguien contesta «BAJA», pulsa <b>«No quiere avisos»</b>."],
   tip:"Solo salen los clientes que marcaron la casilla de ITV al firmar la recepción y dejaron la fecha. Si ya avisaste por teléfono, usa <b>«Ya avisado»</b>."},
  {t:"Mandar al cliente el enlace de seguimiento",r:["ger"],p:["En la orden, pulsa <b>«Presupuesto y cliente»</b>.","En <b>«Enlace para el cliente»</b>, pulsa <b>«Mandar enlace por WhatsApp»</b>.","Sube <b>fotos</b> (antes, durante, después) y escribe un <b>mensaje para el cliente</b>: los verá en su enlace."],tip:"Las <b>notas internas</b> solo las ves tú: nunca salen al cliente."}],
 estados:{t:"Estados de una orden y de las fichas",c:["Estado","Qué significa","Quién lo cambia"],f:[
  ["Recibido","El coche ha entrado; FORM-01 abierta.","Se pone al crear la recepción."],
  ["Diagnóstico","Se está inspeccionando (FORM-02).","Automático."],
  ["Presupuesto","Inspección firmada con puntos a reparar: toca presupuestar.","Automático al firmar FORM-02."],
  ["En reparación","El mecánico ha fichado el inicio.","Automático al pulsar «Iniciar trabajo»."],
  ["Control de calidad","Trabajo terminado, falta FORM-04.","Automático al pulsar «Terminar»."],
  ["Listo para recoger","Calidad aprobada.","Automático al firmar FORM-04 aprobado."],
  ["Entregado","El cliente se lo ha llevado (o pasa a exposición).","El gerente, en FORM-04."],
  ["OK · Á · R · NA","En FORM-02: bien · vigilar · reparar ya · no aplica.","El mecánico que inspecciona."],
  ["Rechazado (calidad)","FORM-04 con algún NO: vuelve a taller para el retrabajo.","Calidad."]]}},

/* ------------------------------------------------------------------ */
{id:"alm",ico:"📦",titulo:"Inventario",tab:"alm",roles:AY_TODOS,
 objetivo:"Saber en todo momento cuántos recambios hay, qué hay que pedir y quién tiene cada herramienta del taller.",
 cuando:["Llega un pedido del proveedor.","Usas una pieza en una reparación.","Coges o devuelves una herramienta de valor.","Haces el recuento de fin de mes."],
 mapa:{filas:[[[1,"Pestañas: Repuestos · Herramientas · Pedido · Movimientos",1]],[[2,"Buscar · Escanear · + Entrada de material · Nueva pieza · Nueva herramienta · Etiquetas QR",1]],[[3,"Fichas de piezas o herramientas",1]]],
  zonas:[[1,"Pestañas","<b>Repuestos</b>: stock de cada pieza. <b>Herramientas</b>: dónde está cada una y quién la tiene. <b>Pedido</b>: piezas por debajo del mínimo. <b>Movimientos</b>: todo lo que entra y sale, mes a mes (gerente)."],
   [2,"Acciones","El botón de escanear usa la cámara (o escribe el código a mano: en iPhone y iPad no hay lector). Alta de piezas y entradas: gerente y recepción."],
   [3,"Fichas","Cada pieza muestra stock, mínimo y ubicación, con botones de <b>Entrada</b> y <b>Recuento</b>. Cada herramienta, su estado y su historial."]]},
 pasos:[
  {t:"Dar de alta una pieza nueva",r:["ger","rec"],p:["Pulsa <b>«Nueva pieza»</b>.","Rellena <b>Nombre del repuesto</b>*, referencia del fabricante, código de barras (puedes escanearlo), categoría, unidad, <b>ubicación</b> (estantería/caja), proveedor y precio de coste.","Escribe el <b>stock inicial</b> (lo que hay en la estantería) y el <b>stock mínimo de seguridad</b>*.","Guarda. El código P-0001 se pone solo si lo dejas vacío."]},
  {t:"Registrar un pedido que llega (entrada de material)",r:["ger","rec"],p:["Pulsa <b>«+ Entrada de material»</b>.","Escribe el <b>Nº de albarán o factura</b>* y el proveedor.","Añade cada pieza (búscala o <b>escanéala</b>) con su cantidad y coste.","Marca <b>«Registrar también el gasto en Finanzas»</b> si quieres que cuente como compra de recambios.","Pulsa <b>«Registrar entrada»</b>."],tip:"Si marcas el gasto, hace falta el coste de cada pieza."},
  {t:"Preparar un pedido al proveedor",r:["ger","rec"],p:["Abre la pestaña <b>Pedido</b>: salen las piezas por debajo de su mínimo.","La cantidad sugerida es lo que falta para llegar al doble del mínimo; cámbiala si quieres.","Pulsa <b>Copiar pedido</b>, <b>WhatsApp</b>, <b>Excel</b> o <b>Imprimir</b>."],ojo:"El pedido no se envía solo: tienes que mandarlo tú al proveedor."},
  {t:"Coger y devolver una herramienta",r:["mec","cal","rec","ger"],p:["Escanea la <b>etiqueta QR</b> de la herramienta (o búscala) y pulsa <b>«Coger herramienta»</b>.","Elige la <b>orden de trabajo</b> (obligatoria en herramientas de valor) y añade una nota si quieres.","Al terminar, pulsa <b>Devolver</b>. Si se ha quedado en otro sitio, di dónde."],tip:"Si está rota, márcala en mantenimiento; cuando vuelva, «Ya está reparada». Si no aparece, márcala como extraviada: el gerente recibe un aviso."},
  {t:"Hacer un recuento de stock",r:["ger","rec"],p:["En la pieza, pulsa <b>Recuento</b>.","Cuenta lo que hay de verdad y escríbelo en <b>«Unidades que hay de verdad»</b>*.","Escribe el <b>motivo del ajuste</b>* (recuento mensual, pieza rota, error en una entrada…) y guarda."],tip:"Si falta material, el gerente lo ve como <b>merma</b> en Movimientos y, si pasa de 50 €, le llega un email."}],
 estados:{t:"Estados de una herramienta",c:["Estado","Qué significa"],f:[["Disponible","Está en su sitio."],["En uso","La tiene alguien (sale su nombre y la orden)."],["Mantenimiento","Rota o en reparación."],["Extraviada","No aparece: el gerente ha recibido el aviso."],["Pieza en rojo","Por debajo del stock mínimo: sale en Pedido."]]}},

/* ------------------------------------------------------------------ */
{id:"caja",ico:"💶",titulo:"Control de Caja",tab:"caja",roles:["ger","caj"],
 objetivo:"Controlar el dinero en efectivo: abrir y cerrar con recuento ciego y registrar cada cobro y cada salida con su ticket. Nada se puede borrar.",
 cuando:["Al empezar el día (abrir) y al terminar (cerrar).","Un cliente paga en efectivo.","Sale dinero del cajón: proveedor, compra rápida, retiro o ingreso en el banco."],
 flujo:["Abrir: contar el fondo","Cobros y salidas con ticket","Cerrar: recuento ciego","El sistema compara"],
 mapa:{filas:[[[1,"Estado: Caja abierta / cerrada · quién y cuándo",1]],[[2,"+ Cobro en efectivo",1],[3,"− Salida de dinero",1],[4,"✓ Cerrar la caja",1]],[[5,"Movimientos del turno",1]],[[6,"Cuadro de mando · Libro de registro (solo gerente)",1]]],
  zonas:[[1,"Estado","Luz verde = abierta (quién la abrió, a qué hora y con qué fondo). Gris = cerrada (último cierre)."],
   [2,"Cobro en efectivo","Un cliente paga en dinero: taller, venta de coche o señal."],
   [3,"Salida de dinero","Todo lo que sale del cajón, con foto del ticket o la factura."],
   [4,"Cerrar la caja","Recuento ciego del final del turno."],
   [5,"Movimientos","Lo registrado en el turno. Las salidas sin ticket salen marcadas hasta que subas la foto."],
   [6,"Solo propietario","Alertas, turnos del mes, descuadres, ajustes y el libro de registro encadenado."]]},
 pasos:[
  {t:"Abrir la caja por la mañana",r:["caj","ger"],p:["Pulsa <b>«Abrir la caja»</b>.","Cuenta billete a billete y moneda a moneda el fondo con el que empiezas y escribe <b>cuántos hay de cada uno</b> (usa − y +).","Pulsa <b>«Abrir la caja»</b>."],tip:"Si no coincide con lo que quedó en el último cierre, te pedirá una <b>explicación</b> (mínimo 15 letras). Queda guardada con tu nombre y el gerente recibe un aviso."},
  {t:"Registrar un cobro en efectivo",r:["caj","ger"],p:["Pulsa <b>«+ Cobro en efectivo»</b>.","Elige el <b>tipo de cobro</b>* (taller, venta de coche, señal/reserva u otro) y escribe el <b>importe</b>* y el <b>concepto</b>*.","Si es de una reparación, elige la <b>orden de taller</b>; si es de un coche, elige <b>¿de qué coche?</b>.","Pulsa <b>«Registrar el cobro»</b>."],tip:"Regístralo en el momento de cobrar, no al final del día. Una señal ligada a un coche cuenta como parte del pago, no como ingreso aparte."},
  {t:"Registrar una salida de dinero",r:["caj","ger"],p:["Pulsa <b>«− Salida de dinero»</b>.","Elige el <b>tipo de salida</b>* (pago a proveedor, compra rápida, retiro del propietario, ingreso en el banco u otro), <b>importe</b>*, <b>concepto</b>* y <b>¿quién se lleva el dinero?</b>*.","Escribe el <b>Nº de factura, ticket u orden</b>* y pulsa <b>Hacer foto</b> del ticket.","Pulsa <b>«Registrar la salida»</b>."],ojo:"Si no tienes el ticket, marca <b>«No tengo el ticket ahora»</b>: el gerente recibe un aviso y la salida queda marcada hasta que pulses <b>«📷 Añadir ticket»</b>."},
  {t:"Cerrar la caja al final del día (arqueo ciego)",r:["caj","ger"],p:["Pulsa <b>«Cerrar la caja»</b>.","Saca todo el dinero del cajón y cuéntalo. <b>La pantalla no te dice cuánto debería haber</b>: escribe solo lo que cuentas.","Pulsa <b>«Comprobar y cerrar la caja»</b>.","Si no cuadra, vuelve a contar. Si sigue sin cuadrar, escribe qué ha pasado y pulsa <b>«Cerrar con esta explicación»</b>."],ojo:"Para cerrar, todas las herramientas tienen que estar devueltas o localizadas (quién la tiene y dónde)."},
  {t:"Revisar un descuadre o corregir un turno",r:["ger"],p:["En el <b>Cuadro de mando</b>, abre la alerta o el turno.","Compara lo que <b>debería haber</b> con lo <b>contado al cerrar</b>.","Escribe qué has comprobado o decidido y pulsa <b>«Dar por revisado»</b>.","Si faltó registrar algo, usa <b>«Añadir ajuste»</b>: no borra nada, añade un movimiento marcado como ajuste y recalcula."],tip:"Para quitar un movimiento erróneo usa <b>Anular</b> con motivo: queda en el libro de registro. Si el libro muestra «⚠ El libro ha sido manipulado», alguien ha tocado los datos por fuera del panel."}],
 estados:{t:"Qué significa cada aviso de caja",c:["Aviso","Qué significa"],f:[["Caja abierta","Hay un turno en marcha."],["Sin ticket","Salida registrada sin foto: súbela cuanto antes."],["Recuento que no cuadra","Apertura o cierre con diferencia: hay explicación y el gerente debe revisarla."],["Por revisar","Descuadre pendiente del visto bueno del gerente."],["Ajuste del gerente","Corrección añadida después, con motivo."],["Anulado","Movimiento anulado con motivo (sigue visible)."],["Lleva X h abierta","Nadie ha cerrado la caja: más de 14 horas abierta."]]}},

/* ------------------------------------------------------------------ */
{id:"jornada",ico:"⏱️",titulo:"Fichaje y jornada",tab:"jornada",roles:AY_TODOS,
 objetivo:"Fichar la entrada, las pausas y la salida con un solo toque, y que el gerente tenga el registro legal de jornada sin papeles.",
 cuando:["Al llegar, al parar para el café o la comida, al volver y al irte.","Si te olvidaste de fichar (avisa al gerente para que lo corrija).","A fin de mes, para firmar el registro (gerente)."],
 flujo:["🟢 Entrada","☕ Pausa","▶️ Reanudar","🔴 Salida"],
 mapa:{filas:[[[1,"Hola, nombre · reloj · estado",1]],[[2,"BOTÓN GRANDE (cambia solo)",1]],[[3,"Botón secundario",1]],[[4,"Trabajado hoy · pausas · tu jornada",1]],[[5,"Tus fichajes de hoy · Mis horas del mes",1]]],
  zonas:[[1,"Cabecera","La hora es la del servidor: la que queda registrada."],[2,"Botón grande","Lo que toca ahora: Entrada si no has fichado, Pausa si estás trabajando (Salida al final del día), Reanudar si estás en pausa."],[3,"Secundario","La otra opción (Salida o Pausa)."],[4,"Tu día","Tiempo trabajado en vivo, pausas y tu jornada."],[5,"Historial","Tus fichajes de hoy y tus horas del mes (con PDF)."]]},
 pasos:[
  {t:"Fichar la entrada",r:["rec","mec","cal","caj"],p:["Entra con tu usuario y PIN.","Pulsa el botón verde <b>«Registrar entrada»</b>: te lleva directo al taller.","Si tenías un trabajo pausado por la salida de ayer, se reanuda solo."],tip:"Más rápido todavía: escanea con la cámara del móvil el <b>cartel QR</b> de la entrada del taller (o acerca el móvil a la pegatina NFC)."},
  {t:"Hacer una pausa y volver",r:["rec","mec","cal","caj"],p:["Toca el chip de arriba (punto verde con tus horas).","Pulsa <b>«Iniciar pausa / comida»</b>. El trabajo del FORM-03 que tengas en marcha se pausa solo.","Al volver, pulsa <b>«Reanudar jornada»</b> (o escanea el QR): el trabajo se reanuda solo."],tip:"Mientras estás en pausa no puedes usar Taller, Inventario ni Caja: así las horas cuadran."},
  {t:"Fichar la salida",r:["rec","mec","cal","caj"],p:["Toca el chip de arriba y pulsa <b>«Registrar salida»</b> (a partir de las 15:30 o cumplida tu jornada sale como botón grande).","Si tienes herramientas a tu nombre, devuélvelas o di dónde se quedan.","Verás un aviso con la hora y tus horas del día."],ojo:"¿Te has equivocado? Pulsa <b>«Deshacer»</b> en el aviso (hasta 2 minutos). Queda anotado como pulsación por error; no se borra nada."},
  {t:"Ver quién está trabajando y las horas del mes",r:["ger"],p:["Abre la pestaña <b>Jornada</b>.","Arriba: 🟢 trabajando, 🟡 en pausa, 🔴 fuera (se actualiza cada 30 s).","En <b>Registro de jornada</b> elige mes y trabajador: días, horas trabajadas, ordinarias, extra, pausas e incidencias."]},
  {t:"Corregir un fichaje olvidado o erróneo",r:["ger"],p:["En el registro, pulsa <b>«Ver / corregir»</b> en el día (o en la incidencia).","Elige <b>Añadir un fichaje olvidado</b> (tipo y hora) o <b>Anular</b> uno erróneo.","Escribe el <b>motivo</b>* y pulsa <b>«Guardar corrección»</b>."],tip:"El fichaje original nunca se borra: la corrección queda con tu nombre, la hora en que la hiciste y el motivo."},
  {t:"Sacar el registro para firmar o para Inspección",r:["ger"],p:["Elige el mes (y el trabajador, o todo el equipo).","<b>«PDF para firmar»</b>: una hoja por trabajador con casillas de firma.","<b>«Excel (.xlsx)»</b>: resumen, días y todos los fichajes con vía, dispositivo y correcciones."],tip:"Guarda el registro 4 años. Cada trabajador puede ver y descargar el suyo en «Mis horas del mes»."},
  {t:"Poner el cartel QR y la pegatina NFC",r:["ger"],p:["En <b>Jornada</b>, pulsa <b>«Ver e imprimir el cartel»</b> y pégalo en la entrada del taller.","Para NFC: con una app como NFC Tools, escribe en una pegatina NTAG el enlace del cartel (se copia solo al abrirlo).","Si el cartel se pierde o sale del taller, pulsa <b>«Cambiar el código»</b>: el anterior deja de valer."]},
  {t:"Gestionar Google Authenticator y dispositivos",r:["ger"],p:["En <b>Jornada → Acceso y seguridad → Abrir</b>.","Activa o desactiva la verificación obligatoria del equipo.","Si alguien pierde el móvil: <b>«Restablecer»</b> (volverá a vincular al entrar). Olvida dispositivos de confianza que ya no se usen.","Revisa los <b>accesos raros</b>: fallos de PIN o código, horas poco habituales y QR falsos."]}],
 estados:{t:"Estados de la jornada",c:["Estado","Qué significa","Qué puedes hacer"],f:[["🔴 Fuera de jornada","No has fichado o ya saliste.","Solo fichar la entrada."],["🟢 Trabajando","Jornada en marcha.","Todo el panel de tu puesto."],["🟡 En pausa","Café o comida.","Reanudar o fichar la salida."],["Sin salida registrada","Olvidaste fichar la salida.","El gerente la corrige con motivo."],["Horas extra","Lo que pasa de tu jornada diaria.","Se suman en el mes."]]}},

/* ------------------------------------------------------------------ */
{id:"fin",ico:"📈",titulo:"Finanzas",tab:"fin",roles:["ger"],
 objetivo:"Ver todos los ingresos y gastos del negocio (taller, venta de coches y caja) conectados, sin apuntar nada dos veces, y preparar los datos para la gestoría.",
 cuando:["Pagas una factura (alquiler, luz, proveedor…).","Cobras con tarjeta, transferencia o financiación.","Vendes un coche y quieres saber cuánto has ganado.","A fin de trimestre, para la gestoría."],
 mapa:{filas:[[[1,"Día · Semana · Mes · Año · ‹ periodo › · − Nuevo gasto · + Otro ingreso · Excel · PDF asesoría",1]],[[2,"Indicadores: flujo, beneficio, efectivo…",1]],[[3,"Entradas y salidas · Rentabilidad taller vs coches",2],[4,"Pendientes",1]],[[5,"Coches: beneficio por unidad · En stock",1],[6,"Facturas emitidas y recibidas",1]]],
  zonas:[[1,"Cabecera","Elige el periodo y muévete con ‹ ›. Desde aquí registras gastos y otros ingresos y descargas los Excel y el PDF para la asesoría."],
   [2,"Indicadores","Flujo neto, beneficio, cuenta de efectivo (conciliada con los cierres de caja), descuadres y retiros del propietario."],
   [3,"Gráficos","Entradas y salidas de dinero, rentabilidad de taller frente a venta de coches, ¿a dónde se va el dinero? y cobrado por canal."],
   [4,"Pendientes","Lo que falta: <b>Por cobrar</b>, <b>Ventas de coches por completar</b> y <b>Salidas de caja sin clasificar</b>."],
   [5,"Coches","Beneficio de cada coche vendido y lo invertido en los que siguen en stock."],
   [6,"Facturas","Emitidas (ingresos) y recibidas (gastos) con su adjunto. Se anulan con motivo, nunca se borran."]]},
 pasos:[
  {t:"Apuntar un gasto (factura de proveedor, alquiler, luz…)",r:["ger"],p:["Pulsa <b>«− Nuevo gasto»</b>.","Rellena <b>Proveedor/acreedor</b>*, <b>Concepto detallado</b>*, <b>Categoría</b>* y la parte del negocio (taller, venta u otros).","Escribe la <b>base imponible</b>* y elige el impuesto (IGIC 3 / 7 / 9,5 / 15 % o IVA 21 %).","Elige <b>¿cómo se pagó?</b>* (efectivo, tarjeta, transferencia, domiciliación), la fecha y adjunta la <b>foto o PDF de la factura</b>.","Si el gasto es de un coche concreto, elígelo. Pulsa <b>«Guardar gasto»</b>."],ojo:"Si lo pagas en <b>efectivo</b>, sale de la caja abierta de hoy y la fecha tiene que ser hoy."},
  {t:"Registrar un cobro de taller con tarjeta o transferencia",r:["ger"],p:["En <b>Pendientes → Por cobrar</b>, pulsa <b>«Registrar cobro»</b> en la orden.","Escribe el <b>importe cobrado</b>* y <b>¿cómo ha pagado?</b>*.","Pulsa <b>«Guardar cobro»</b>."],tip:"Los presupuestos aceptados entran solos como ingreso: no los apuntes otra vez."},
  {t:"Completar la venta de un coche",r:["ger"],p:["En <b>Pendientes → Ventas de coches por completar</b>, pulsa <b>«Completar venta»</b>.","Escribe el <b>precio final de venta</b>*, el comprador, la fecha, el impuesto y <b>lo que costó comprarlo</b>* (0 si aún no lo sabes).","Indica cómo se ha cobrado y pulsa <b>«Guardar la venta»</b>."],ojo:"Los pagos en efectivo de <b>1.000 € o más</b> entre empresa y particular no están permitidos en España (Ley 11/2021). Confírmalo con tu gestoría."},
  {t:"Clasificar las salidas de caja",r:["ger"],p:["En <b>Pendientes → Salidas de caja sin clasificar</b>, abre cada una.","Dile a qué <b>categoría</b> pertenece (recambios, suministros, mantenimiento…).","Guarda: ya cuenta bien en los gastos."],tip:"Los retiros del propietario y los ingresos al banco no son gastos: solo cambian el dinero de sitio."},
  {t:"Preparar los datos para la gestoría",r:["ger"],p:["Elige el periodo (por ejemplo, <b>Año</b> o el trimestre mes a mes).","Pulsa <b>«Excel emitidas»</b> y <b>«Excel recibidas»</b>.","Pulsa <b>«PDF asesoría»</b> y guárdalo como PDF.","Envía los tres archivos a tu gestoría."],tip:"Las ventas de coches usados marcadas «sin desglosar» pueden ir en régimen especial (REBU): lo calcula tu gestoría."}],
 estados:{t:"Etiquetas de Finanzas",c:["Etiqueta","Qué significa"],f:[["Aún sin cobrar","Trabajo o venta sin cobro registrado."],["Precio estimado","Venta sin precio final: complétala."],["Falta coste de compra","No se puede calcular el beneficio del coche."],["Cobrado sin presupuesto aceptado","Hay un cobro de una orden sin presupuesto aprobado: revísalo."],["Sin clasificar","Salida de caja sin categoría."],["Anulado","Movimiento anulado con motivo; sigue en el libro."]]}}
];

/* ---------- estado ---------- */
let AY_ROL="", AY_BUSQ="", AY_MOD="inicio";
const ayMods=()=>AY_MODS.filter(m=>!AY_ROL||m.roles.includes(AY_ROL));
const ayPasos=m=>m.pasos.filter(p=>(!AY_ROL||p.r.includes(AY_ROL))&&(!AY_BUSQ||ayTxt(p).includes(AY_BUSQ)));
const ayTxt=p=>(p.t+" "+p.p.join(" ")+" "+(p.tip||"")+" "+(p.ojo||"")).replace(/<[^>]+>/g,"").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"");
const ayNorm=s=>s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").trim();

/* ---------- piezas visuales ---------- */
function ayMapa(m,mapa){ // maqueta de la pantalla con zonas numeradas
  return `<div class="ay-mock" aria-hidden="true"><div class="ay-mock-bar"><i></i><i></i><i></i><span>${esc(m.titulo)}</span></div>${mapa.filas.map(f=>`<div class="ay-mrow">${f.map(([n,t,w])=>`<div class="ay-mz" style="flex:${w}"><b>${n}</b><span>${esc(t)}</span></div>`).join("")}</div>`).join("")}</div>
    <ol class="ay-zonas">${mapa.zonas.map(([n,t,d])=>`<li><b class="ay-n">${n}</b><div><b>${esc(t)}</b><p>${d}</p></div></li>`).join("")}</ol>`;
}
const ayFlujo=f=>`<div class="ay-flujo">${f.map((x,i)=>`<span class="ay-fp"><i>${i+1}</i>${esc(x)}</span>`).join('<span class="ay-fa" aria-hidden="true">→</span>')}</div>`;
function ayPaso(p,i){
  return `<details class="ay-how" ${AY_BUSQ?"open":""}><summary><span class="ay-q">¿Cómo hago para…?</span><b>${esc(p.t)}</b><span class="ay-rs">${p.r.map(r=>`<em class="ay-r ${r}">${esc(Object.fromEntries(AY_ROLES)[r])}</em>`).join("")}</span></summary>
    <ol class="ay-steps">${p.p.map((s,k)=>`<li><span class="ay-sn">Paso ${k+1}</span><p>${s}</p></li>`).join("")}</ol>
    ${p.ojo?`<blockquote class="ay-note ojo"><b>⚠️ Ojo</b> ${p.ojo}</blockquote>`:""}${p.tip?`<blockquote class="ay-note"><b>💡 Buenas prácticas</b> ${p.tip}</blockquote>`:""}</details>`;
}
function ayTabla(e){ return `<div class="ay-tw"><table class="ay-t"><thead><tr>${e.c.map(c=>`<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${e.f.map(r=>`<tr>${r.map((c,i)=>i?`<td>${esc(c)}</td>`:`<td><b>${esc(c)}</b></td>`).join("")}</tr>`).join("")}</tbody></table></div>`; }
function ayModulo(m,todo){
  const ps=ayPasos(m); if(AY_BUSQ&&!ps.length) return "";
  const puede=m.tab&&(!ME||!ME.equipo||["ordenes","alm"].includes(m.tab)||(m.tab==="caja"&&ME.caja))&&!(ME&&ME.equipo&&m.tab==="jornada");
  return `<article class="ay-mod" id="ay-${m.id}">
    <header class="ay-mh"><span class="ay-ico" aria-hidden="true">${m.ico}</span><div><small>Módulo</small><h2>${esc(m.titulo)}</h2></div>${puede&&!todo?`<button type="button" class="btn b-ghost b-sm" data-ayir="${m.tab}">Abrir ${esc(m.titulo.split(" ")[0])} →</button>`:""}</header>
    ${AY_BUSQ?"":`<section class="ay-s"><h3><i>1</i>Para qué sirve</h3><p class="ay-obj"><b>Objetivo principal:</b> ${esc(m.objetivo)}</p>
      <p class="ay-sub">Cuándo usar esta sección</p><ul class="ay-cuando">${m.cuando.map(c=>`<li>${esc(c)}</li>`).join("")}</ul>${m.flujo?`<p class="ay-sub">El recorrido</p>${ayFlujo(m.flujo)}`:""}</section>
    <section class="ay-s"><h3><i>2</i>Mapa de la pantalla</h3>${ayMapa(m,m.mapa)}${m.extra?`<p class="ay-sub">${esc(m.extra.t)}</p>${ayMapa({titulo:m.extra.t},m.extra)}`:""}</section>`}
    <section class="ay-s"><h3><i>3</i>Guías paso a paso</h3>${ps.length?ps.map(ayPaso).join(""):'<p class="hint">No hay guías para este puesto en esta sección.</p>'}</section>
    ${AY_BUSQ?"":`<section class="ay-s"><h3><i>4</i>${esc(m.estados.t)}</h3>${ayTabla(m.estados)}</section>`}
  </article>`;
}
function ayPintar(){
  const box=$("#ay"); if(!box) return;
  if(ME&&ME.equipo&&!ayPintar.ya){ ayPintar.ya=1; AY_ROL={recepcion:"rec",mecanico:"mec",calidad:"cal"}[ME.rol]||""; }
  const ms=ayMods(); if(!ms.some(m=>m.id===AY_MOD)) AY_MOD=ms[0]?ms[0].id:"inicio";
  const cuerpo=AY_BUSQ?ms.map(m=>ayModulo(m)).join("")||'<div class="empty">Ninguna guía contiene esas palabras. Prueba con otra (por ejemplo «ticket», «firma», «reserva»).</div>':ayModulo(ms.find(m=>m.id===AY_MOD)||ms[0]);
  box.innerHTML=`<div class="ay-top">
      <div class="ay-rol" role="group" aria-label="Tu puesto"><span>¿Quién eres?</span><button type="button" class="chipb" data-ayrol="" aria-pressed="${!AY_ROL}">Todos</button>${AY_ROLES.map(([k,t])=>`<button type="button" class="chipb" data-ayrol="${k}" aria-pressed="${AY_ROL===k}">${t}</button>`).join("")}</div>
      <input class="in ay-busq" id="ay-busq" type="search" placeholder="Buscar: «cerrar caja», «presupuesto», «ITV»…" value="${esc(AY_BUSQ)}" aria-label="Buscar en la ayuda">
    </div>
    <div class="ay-grid"><nav class="ay-nav" aria-label="Secciones de la ayuda">${ms.map(m=>`<button type="button" data-aymod="${m.id}" aria-current="${!AY_BUSQ&&m.id===AY_MOD}"><span aria-hidden="true">${m.ico}</span>${esc(m.titulo)}<small>${ayPasos(m).length} guía${ayPasos(m).length===1?"":"s"}</small></button>`).join("")}</nav>
      <div class="ay-body">${cuerpo}</div></div>`;
}

/* ---------- pestaña ---------- */
TABS.ayuda="s-ayuda";
const _ayShow=show;
show=function(id){ const s=$("#s-ayuda"); if(s) s.hidden=id!=="s-ayuda"; _ayShow(id); };
const _ayTab=abrirTab;
abrirTab=function(t,push=true){ if(t==="ayuda"){ ayAbrir(); return; } return _ayTab(t,push); };
function ayAbrir(mod){ show("s-ayuda"); history.replaceState(null,"","#ayuda"); if(mod) AY_MOD=mod; ayPintar(); }
document.addEventListener("click",e=>{ const t=e.target;
  const r=t.closest("[data-ayrol]"); if(r){ AY_ROL=r.dataset.ayrol; ayPintar(); return; }
  const m=t.closest("[data-aymod]"); if(m){ AY_MOD=m.dataset.aymod; AY_BUSQ=""; ayPintar(); const b=$("#s-ayuda .ay-body"); if(b&&innerWidth<860) b.scrollIntoView({behavior:"smooth",block:"start"}); return; }
  const ir=t.closest("[data-ayir]"); if(ir){ abrirTab(ir.dataset.ayir); return; }
  const h=t.closest("[data-ayuda]"); if(h){ e.preventDefault(); ayAbrir(h.dataset.ayuda); return; }
  if(t.closest("#ay-pdf")) ayPdf();
});
document.addEventListener("input",e=>{ if(e.target.id==="ay-busq"){ AY_BUSQ=ayNorm(e.target.value); clearTimeout(ayPintar.t); ayPintar.t=setTimeout(()=>{ const pos=e.target.selectionStart; ayPintar(); const b=$("#ay-busq"); if(b){ b.focus(); try{ b.setSelectionRange(pos,pos); }catch(_){} } },200); } });
// Enlace «Cómo funciona» en la cabecera de cada pestaña
(function(){ const sec={leads:"crm",ordenes:"taller",alm:"alm",caja:"caja",fin:"fin",agenda:"agenda",dash:"dash",list:"coches",jornada:"jornada"};
  for(const [s,m] of Object.entries(sec)){ const p=document.querySelector(`#s-${s} .head p`)||document.querySelector(`#s-${s} .head h1`); if(!p||p.querySelector("[data-ayuda]")) continue;
    const b=document.createElement("button"); b.type="button"; b.className="g-link ay-link"; b.dataset.ayuda=m; b.textContent="¿Cómo funciona?"; p.append(" ",b); } })();

/* ---------- PDF: todo el manual (o solo tu puesto) ---------- */
function ayPdf(){
  let box=$("#ay-print"); if(!box){ box=document.createElement("div"); box.id="ay-print"; document.body.appendChild(box); }
  const prevB=AY_BUSQ; AY_BUSQ="";
  const rol=AY_ROL?Object.fromEntries(AY_ROLES)[AY_ROL]:"todos los puestos";
  box.innerHTML=`<div class="ay-portada"><small>Volcano Cars · Manual del panel</small><h1>Cómo se usa el panel</h1><p>Guía paso a paso para ${esc(rol)}. Generada el ${esc(new Date().toLocaleDateString("es-ES",{day:"numeric",month:"long",year:"numeric"}))}.</p>
    <ol>${ayMods().map(m=>`<li>${m.ico} ${esc(m.titulo)}</li>`).join("")}</ol></div>`+ayMods().map(m=>ayModulo(m,true)).join("");
  box.querySelectorAll("details").forEach(d=>d.open=true);
  AY_BUSQ=prevB;
  const t=document.title; document.title="Volcano Cars · Manual del panel";
  document.body.classList.add("print-ayuda");
  const fin=()=>{ document.body.classList.remove("print-ayuda"); document.title=t; box.innerHTML=""; removeEventListener("afterprint",fin); };
  addEventListener("afterprint",fin); window.print();
  setTimeout(()=>{ if(!matchMedia("print").matches&&document.body.classList.contains("print-ayuda")) fin(); },60000);
}
