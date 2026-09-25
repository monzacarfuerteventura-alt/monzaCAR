# Genera las páginas legales (aviso legal, privacidad, cookies).
# Rellena TITULAR y NIF abajo y vuelve a ejecutar:  python3 tools/legal.py
TITULAR = "[NOMBRE Y APELLIDOS O RAZÓN SOCIAL]"
NIF = "[NIF/CIF]"
REGISTRO = "[Solo si es sociedad: Registro Mercantil de Las Palmas, tomo, folio, hoja]"
REG_TALLER = "[Nº de inscripción del taller en el Registro Industrial de Canarias]"
DIRECCION = "Calle Valle Largo, Nave 8, Polígono Industrial, 35610 Antigua, Las Palmas"
EMAIL = "volcanocars2026@gmail.com"
TEL = "677 96 03 48"
ACTUALIZADO = "25 de septiembre de 2026"

import pathlib
OUT = pathlib.Path(__file__).resolve().parent.parent / "public"

HEAD = """<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · Volcano Cars</title>
<meta name="robots" content="noindex, follow">
<style>
:root{{--ground:#F2EFEA;--surface:#FFFFFF;--line:#DCD8D1;--ink:#1B1B1A;--muted:#6B655E;--rosso:#D9481C;color-scheme:light}}
@media all{{:root:not([data-theme="light"]){{--ground:#0D0E10;--surface:#16181B;--line:#2A2E33;--ink:#F3EFE9;--muted:#A49E97;--rosso:#E0413F;color-scheme:dark}}}}
:root[data-theme="dark"]{{--ground:#0D0E10;--surface:#16181B;--line:#2A2E33;--ink:#F3EFE9;--muted:#A49E97;--rosso:#E0413F;color-scheme:dark}}
*{{box-sizing:border-box}}
body{{margin:0;background:var(--ground);color:var(--ink);font:16.5px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif}}
.wrap{{max-width:760px;margin:0 auto;padding:32px 16px 80px}}
a{{color:var(--rosso)}}
.back{{display:inline-block;margin-bottom:28px;font-weight:600;text-decoration:none}}
h1{{font-size:clamp(28px,6vw,40px);line-height:1.1;margin:0 0 6px}}
.upd{{color:var(--muted);margin:0 0 32px;font-size:14px}}
h2{{font-size:20px;margin:36px 0 10px}}
.box{{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 20px}}
table{{width:100%;border-collapse:collapse;font-size:15px}}
th,td{{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);vertical-align:top}}
.tw{{overflow-x:auto}}
.en{{border-left:4px solid var(--rosso);padding:12px 16px;background:var(--surface);border-radius:0 12px 12px 0;color:var(--muted);font-size:15px}}
</style>
<link rel="stylesheet" href="/tema.css">
</head>
<body>
<main class="wrap">
<a class="back" href="/">← Volver a Volcano Cars</a>
<h1>{title}</h1>
<p class="upd">Última actualización: {upd}</p>
"""
FOOT = """
</main>
</body>
</html>
"""

TITULAR_BOX = f"""<div class="box">
<b>Titular:</b> {TITULAR}<br>
<b>NIF/CIF:</b> {NIF}<br>
<b>Nombre comercial:</b> Volcano Cars<br>
<b>Domicilio:</b> {DIRECCION}<br>
<b>Email:</b> <a href="mailto:{EMAIL}">{EMAIL}</a> · <b>Teléfono:</b> {TEL}<br>
<b>Taller:</b> {REG_TALLER}<br>
<small>{REGISTRO}</small>
</div>"""

aviso = HEAD.format(title="Aviso legal", upd=ACTUALIZADO) + f"""
<p>En cumplimiento del artículo 10 de la Ley 34/2002, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), estos son los datos del titular de esta web:</p>
{TITULAR_BOX}

<h2>Objeto</h2>
<p>Esta web informa sobre los servicios de taller (chapa y pintura, mecánica rápida) y sobre los vehículos de ocasión que vende Volcano Cars en Antigua, Fuerteventura, y permite pedir presupuesto, cita o tasación.</p>

<h2>Precios y vehículos</h2>
<p>La información de cada vehículo (fotos, kilómetros, equipamiento y precio) se publica con la mayor exactitud posible. Los precios mostrados son precios finales para el comprador, con todos los impuestos incluidos. Si hubiera un error tipográfico evidente, se avisará antes de firmar y prevalecerá lo firmado en el contrato de compraventa. La publicación de un vehículo no supone una reserva: la disponibilidad se confirma en el momento del contacto. Esta web no vende a distancia: las compraventas y reparaciones se contratan en nuestras instalaciones.</p>

<h2>Garantía</h2>
<p>Los vehículos de ocasión vendidos a consumidores tienen una garantía de 12 meses desde la entrega y las reparaciones del taller, de 3 meses o 2.000 km. Todos los detalles están en <a href="/condiciones">Condiciones de venta, taller y garantía</a>. Hay hojas de reclamaciones a disposición de los clientes en el taller.</p>

<h2>Propiedad intelectual</h2>
<p>Los textos, fotografías, logotipos y el diseño de esta web pertenecen a Volcano Cars o se usan con permiso. No se pueden copiar ni reutilizar sin autorización.</p>

<h2>Reseñas</h2>
<p>Las reseñas de la web son una selección copiada literalmente de nuestra ficha pública de Google Maps (algunas recortadas; en la versión inglesa, traducidas). No hemos cambiado su contenido. No podemos verificar que cada autor haya sido cliente; Google publica las opiniones de cualquier usuario con cuenta. Todas las reseñas, también las negativas, pueden consultarse en Google Maps.</p>

<h2>Responsabilidad</h2>
<p>Volcano Cars no se hace responsable de los contenidos de webs de terceros a las que se enlaza (Google Maps, WhatsApp) ni de interrupciones técnicas ajenas a su control.</p>

<h2>Legislación</h2>
<p>Esta web se rige por la legislación española. Para cualquier controversia con consumidores serán competentes los juzgados del domicilio del consumidor.</p>
""" + FOOT

priv = HEAD.format(title="Política de privacidad", upd=ACTUALIZADO) + f"""
<p class="en" id="en" lang="en"><b>In English:</b> Volcano Cars only uses the details you send us (name, phone, car details, preferred day) to answer your request and, if your car is in our workshop, to show you its progress and quote on a private link. We count visits anonymously, without cookies or IP addresses. If you request a finance pre-approval, we only share your details with the lender that assesses it if you tick the box that authorises it. The chat assistant runs in your browser and does not store what you type. If you sign up for new-car alerts, we message you on WhatsApp only about cars that match your request, until you reply STOP. Outside opening hours our WhatsApp may be answered by an AI assistant, which always says so. We keep your details for up to 2 years and never sell them. You can ask us to delete them at any time by writing to <a href="mailto:{EMAIL}">{EMAIL}</a>.</p>

<h2>Quién trata tus datos</h2>
{TITULAR_BOX}

<h2>Qué datos recogemos</h2>
<p>Los que escribes en los formularios de la web: nombre, teléfono, y según el caso los datos de tu coche (marca, modelo, año, kilómetros, matrícula), los servicios que necesitas, el día y la hora que prefieres y tu mensaje. También guardamos, junto a tu solicitud, de dónde llegaste a la web (por ejemplo, un anuncio de Google o un portal de coches) para saber qué publicidad funciona. No pedimos datos especialmente protegidos.</p>

<h2>Para qué los usamos</h2>
<p>Solo para responder a tu solicitud y gestionar tu servicio: darte presupuesto, confirmar tu cita o tu visita para ver un coche, y, si dejas tu coche en el taller, enseñarte cómo va la reparación y el presupuesto en un enlace privado que solo tienes tú. Guardamos un registro de las gestiones que hacemos contigo (llamadas, mensajes, presupuestos) para atenderte bien. No te enviaremos publicidad salvo que te apuntes a los avisos de coches nuevos (ver más abajo), y no tomamos decisiones automatizadas sobre ti.</p>

<h2>Base legal</h2>
<p>Tu consentimiento, que das al marcar la casilla del formulario (art. 6.1.a del RGPD), y la aplicación de medidas precontractuales que tú solicitas (art. 6.1.b del RGPD). Puedes retirar el consentimiento cuando quieras, sin que afecte a lo tratado antes.</p>

<h2>Cuánto tiempo los guardamos</h2>
<p>Hasta 2 años desde tu solicitud; después se borran automáticamente. Si llegas a ser cliente (compra o reparación), los datos de la factura y del contrato se conservan el tiempo que exigen las leyes fiscales y mercantiles.</p>

<h2>Quién más puede verlos</h2>
<p>No cedemos tus datos a nadie, salvo a la entidad financiera en el caso descrito más abajo y solo si nos lo autorizas. Para que la web funcione usamos proveedores que actúan por cuenta nuestra: <b>Netlify, Inc.</b> (alojamiento de la web y almacenamiento de las solicitudes, con garantías del Marco de Privacidad de Datos UE-EE. UU. y cláusulas contractuales tipo) y <b>Resend</b> (Plus Five Five, Inc.), que nos reenvía cada solicitud a nuestro correo interno para poder contestarte enseguida, con cláusulas contractuales tipo. Si decides enviarnos el mensaje por <b>WhatsApp</b>, ese envío lo gestiona WhatsApp Ireland Ltd. según sus propias condiciones. Si aceptas las cookies de medición, <b>Google Ireland Ltd.</b> recibe los datos descritos en la <a href="/cookies">política de cookies</a>. Para mostrar los tipos de letra, tu navegador los descarga de <b>Google Fonts</b>, que recibe tu dirección IP (no instala cookies). El mapa de Google Maps solo se carga si pulsas «Ver el mapa aquí».</p>
<h2>Reserva online, lista de espera y presupuesto por foto</h2>
<p><b>Reserva de 50 €:</b> guardamos tu nombre, teléfono, email (si lo das), el coche, la fecha de tu visita y el justificante de pago que subas, para gestionar la reserva, la devolución o la compra. Los pagos con tarjeta los procesa <b>Stripe Payments Europe, Ltd.</b> (Irlanda); nosotros no vemos ni guardamos los datos de la tarjeta. Los justificantes y los datos del pago se conservan el tiempo que exigen las leyes fiscales. <b>Lista de espera:</b> si nos dejas tu nombre y WhatsApp en un coche reservado, solo los usamos para avisarte si vuelve a estar disponible. <b>Presupuesto por foto:</b> las fotos del daño solo las ve nuestro equipo para darte el presupuesto; se borran junto con tu solicitud. En los tres casos la base legal es tu solicitud (medidas precontractuales) y puedes pedir que borremos tus datos cuando quieras.</p>

<h2>Asistente con inteligencia artificial</h2>
<p>Si escribes una pregunta en el asistente de la web, el texto de la conversación se envía a <b>Groq, Inc.</b> (Estados Unidos), que lo procesa con un modelo de inteligencia artificial para generar la respuesta; nosotros no guardamos esas conversaciones (solo quedan en tu navegador mientras tengas la pestaña abierta). El asistente es automático, puede equivocarse y no toma decisiones sobre ti: los precios, las citas y las condiciones se confirman siempre en la web o con una persona. Por favor, no escribas en el chat datos como el DNI, datos bancarios o de salud. Si quieres que te llamemos, la tarjeta del chat te pide nombre, teléfono y tu consentimiento, y esos datos se tratan como cualquier otra solicitud de la web. Si los tenemos activados, los avisos internos de cada solicitud nos llegan también por <b>Telegram</b> (Telegram FZ-LLC) y se anotan en una hoja de <b>Google Sheets</b> (Google Ireland Ltd.) de uso interno.</p>

<h2>Avisos de coches nuevos por WhatsApp</h2>
<p>Si te apuntas en «¿No encuentras el coche exacto que buscas?», guardamos tu nombre, tu WhatsApp, tu pueblo y lo que buscas (presupuesto, tipo de coche, cambio y lo que tenías en el buscador) para escribirte por WhatsApp cuando entre un coche que encaje, antes de anunciarlo. Es una comunicación comercial y solo la enviamos porque la pides al marcar su casilla (art. 6.1.a del RGPD y art. 21 de la Ley 34/2002, LSSI). Te das de baja cuando quieras respondiendo <b>BAJA</b> a cualquier mensaje o escribiendo a {EMAIL}; a partir de ese momento no te escribimos más. Los mensajes los entrega WhatsApp Ireland Ltd. según sus propias condiciones. Guardamos la alta hasta que te des de baja y, como máximo, 2 años.</p>
<h2>WhatsApp fuera de horario (asistente con IA)</h2>
<p>Cuando el taller está cerrado, los mensajes que nos mandas al WhatsApp {TEL} puede contestarlos un asistente automático con inteligencia artificial, que siempre se presenta como tal. Para contestarte, el texto de la conversación se envía a <b>Groq, Inc.</b> (Estados Unidos), y guardamos los últimos mensajes de la conversación hasta 48 horas para que el asistente tenga contexto. Si con el asistente pides una cita o un presupuesto, tu nombre, tu teléfono y lo que nos cuentas se guardan como cualquier otra solicitud (mismas bases legales y plazos). El asistente no fija precios de reparaciones ni toma decisiones sobre ti: eso lo hace siempre una persona. Puedes pedir hablar con una persona en cualquier momento. Los mensajes los gestiona WhatsApp Ireland Ltd. y su proveedor Meta Platforms, según sus propias condiciones.</p>
<h2>Historial Sin Sorpresas de los coches</h2>
<p>El informe de revisión en PDF que publicamos en la ficha de algunos coches contiene solo datos del vehículo (inspección y control de calidad). Antes de publicarlo tapamos cualquier dato del anterior propietario.</p>
<h2>Estadísticas de visitas (sin cookies)</h2>
<p>Para saber cuántas personas visitan la web, desde dónde llegan (por ejemplo, Google o redes sociales), qué páginas y coches miran y si usan el móvil, contamos las visitas de forma anónima: no usamos cookies ni guardamos tu dirección IP. Para no contar dos veces a la misma persona en un día se calcula un código que cambia cada día y se borra al día siguiente, así que es imposible saber quién eres ni seguirte de un día a otro. Base legal: nuestro interés legítimo en mejorar la web (art. 6.1.f del RGPD).</p>

<h2>Pre-estudio de financiación</h2>
<p>Si pides un pre-estudio de financiación en la ficha de un coche, además de tu nombre y teléfono nos dices tu situación laboral y una franja aproximada de ingresos, y guardamos el cálculo que hiciste (precio, entrada, plazo y cuota). Los usamos para estudiar contigo si la financiación es viable y, solo si lo autorizas al marcar la casilla de ese formulario, los enviamos a la entidad financiera que estudie la operación, que será responsable de tus datos desde ese momento según su propia política de privacidad y te informará de ello. No pedimos tu DNI, nóminas ni datos bancarios por la web: si decides seguir adelante, te diremos qué documentos hacen falta. Volcano Cars no concede préstamos y no toma decisiones automatizadas sobre ti; la decisión la toma la entidad financiera.</p>

<h2>Asistente de la web</h2>
<p>El asistente que aparece abajo a la derecha funciona dentro de tu navegador: lo que escribes en él no se guarda ni se envía a ningún sitio. Solo si pulsas uno de sus botones de WhatsApp se abre WhatsApp con tu mensaje ya escrito, y eres tú quien decide enviarlo.</p>

<h2>Solicitudes por WhatsApp y teléfono</h2>
<p>Si nos escribes por WhatsApp o nos llamas, usamos tu número y lo que nos cuentes solo para atenderte. Borramos las conversaciones que ya no necesitamos. En el taller, los datos de la ficha de recepción (nombre, DNI y vehículo) se usan para gestionar la reparación, emitir la factura y cumplir la normativa de talleres.</p>

<h2>Tus derechos</h2>
<p>Puedes pedir acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad de tus datos escribiendo a <a href="mailto:{EMAIL}">{EMAIL}</a> o en nuestro taller, indicando tu nombre y teléfono. Si crees que no hemos atendido bien tu petición, puedes reclamar ante la Agencia Española de Protección de Datos (<a href="https://www.aepd.es" rel="noopener">www.aepd.es</a>).</p>
""" + FOOT

cook = HEAD.format(title="Política de cookies", upd=ACTUALIZADO) + f"""
<p class="en" id="en" lang="en"><b>In English:</b> the website works without cookies. We only use Google Ads measurement cookies if you click “Accept”. You can change your choice at any time with “Cookie settings” at the bottom of the page.</p>

<p>Una cookie es un pequeño archivo que la web guarda en tu navegador. Esta web funciona perfectamente sin cookies de publicidad: solo se usan si pulsas «Aceptar» en el aviso.</p>

<h2>Lo que guarda la web siempre (técnico, sin publicidad)</h2>
<div class="tw"><table>
<tr><th>Nombre</th><th>Para qué</th><th>Duración</th></tr>
<tr><td>mz_cookies</td><td>Recordar si aceptaste o rechazaste las cookies de medición.</td><td>Hasta que la borres</td></tr>
<tr><td>mz_int_…</td><td>Evitar contarte dos veces en «personas interesadas» de un mismo coche. No se envía ningún dato personal.</td><td>7 días de efecto</td></tr>
<tr><td>mz_vis</td><td>Número aleatorio de la pestaña para contar cuántas personas están viendo un coche a la vez. Mientras la ficha está abierta, el servidor lo guarda junto a un resumen cifrado (hash) de la conexión durante menos de un minuto; no permite saber quién eres.</td><td>Se borra al cerrar la pestaña</td></tr>
</table></div>

<h2>Solo si pulsas «Aceptar»: medición de Google Ads</h2>
<p>Las usamos para saber si una solicitud, una llamada o un WhatsApp vino de un anuncio nuestro en Google, y así no gastar en anuncios que no funcionan. No se usan para mostrarte publicidad personalizada.</p>
<div class="tw"><table>
<tr><th>Nombre</th><th>Titular</th><th>Para qué</th><th>Duración</th></tr>
<tr><td>_gcl_au, _gcl_aw</td><td>Google Ireland Ltd.</td><td>Relacionar la visita con el anuncio en el que hiciste clic.</td><td>90 días</td></tr>
</table></div>
<p>Más información en la <a href="https://policies.google.com/technologies/ads?hl=es" rel="noopener">política de Google</a>.</p>

<h2>Solo si pulsas «Ver el mapa aquí»: Google Maps</h2>
<p>El mapa de la página de contacto no se carga hasta que lo pides. Al cargarlo, Google puede instalar sus propias cookies (por ejemplo NID) según su <a href="https://policies.google.com/technologies/cookies?hl=es" rel="noopener">política de cookies</a>. Si no quieres, usa el botón «Cómo llegar», que abre Google Maps aparte.</p>

<h2>Cómo cambiar tu decisión</h2>
<p>Pulsa «Configurar cookies» al final de cualquier página de la web. También puedes borrar las cookies desde los ajustes de tu navegador.</p>
""" + FOOT

cond = HEAD.format(title="Condiciones de venta, taller y garantía", upd=ACTUALIZADO) + f"""
<p class="en" id="en" lang="en"><b>In English:</b> the used cars we sell to consumers come with a 12-month legal warranty from delivery. Workshop repairs are guaranteed for 3 months or 2,000 km. You are entitled to a written quote before any repair. If your car is not ready on the agreed date, we discount 10 % of the labour cost per working day of delay, up to 50 % (see section 4 for exceptions). Online appointments are confirmed instantly; please tell us on WhatsApp if you cannot come. Prices shown are final, taxes included. Once the sale is signed, we deliver the car free of charge to any address on Fuerteventura. Nothing is sold online: contracts are signed at our premises in Antigua.</p>

<p>Estas condiciones resumen tus derechos al comprar un coche o reparar el tuyo en Volcano Cars. No sustituyen al contrato ni a la factura, que son los documentos que se firman.</p>
{TITULAR_BOX}

<h2>1. Compra de coches de ocasión</h2>
<ul>
<li><b>Precio:</b> el precio publicado es el precio final, con todos los impuestos incluidos. Si hay gastos adicionales (por ejemplo, una financiación que tú elijas), te los diremos por escrito antes de firmar.</li>
<li><b>Reservas:</b> reservar una visita en la web no te obliga a nada ni aparta el coche. Para apartarlo puedes hacer la <a href="#reserva">reserva online de 50 €</a> (reembolsable) o acordarlo con nosotros en el taller.</li>
<li><b>Dónde se compra:</b> la compraventa se firma en nuestras instalaciones, con contrato por escrito. Por eso no hay derecho de desistimiento de 14 días, que solo existe en compras a distancia o fuera del establecimiento.</li>
<li><b>Documentación:</b> te entregamos el permiso de circulación, la ficha técnica con la ITV en vigor, las llaves y el historial que tengamos. Nos encargamos del cambio de titularidad en Tráfico.</li>
<li><b>Entrega a domicilio gratis:</b> una vez firmada la compraventa, te llevamos el coche sin coste a la dirección que nos digas dentro de la isla de Fuerteventura, el día y a la hora que acordemos contigo. Si lo prefieres, puedes recogerlo en nuestro taller de Antigua. La entrega a domicilio no cambia dónde se firma el contrato, y la garantía empieza a contar el día que recibes el coche.</li>
</ul>

<h2>2. Garantía de los coches</h2>
<ul>
<li><b>Particulares (consumidores): 12 meses</b> desde la entrega. Cubre cualquier defecto que el coche ya tuviera al entregártelo (falta de conformidad), sea del motor o de otra parte. Es la garantía mínima que marca la ley para bienes de segunda mano (Real Decreto Legislativo 1/2007).</li>
<li><b>Qué no cubre:</b> el desgaste normal por el uso y la edad del coche (pastillas, neumáticos, embrague, batería, escobillas…), las averías por mal uso, accidente o falta de mantenimiento, ni los defectos que te informamos por escrito antes de la venta.</li>
<li><b>Cómo reclamarla:</b> avísanos en cuanto notes el fallo, por teléfono, WhatsApp o en el taller, con el contrato. Revisamos el coche y, si procede, lo reparamos sin coste. Si la reparación no es posible o no resuelve el problema, puedes pedir una rebaja del precio o, si el defecto es relevante, la devolución.</li>
<li><b>Empresas y autónomos</b> que compran para su actividad: se aplica la garantía pactada en el contrato.</li>
</ul>

<h2>3. Reparaciones en el taller</h2>
<ul>
<li><b>Presupuesto por escrito:</b> tienes derecho a él antes de cualquier reparación. Es válido durante 12 días hábiles. Solo puedes renunciar a él por escrito. No hacemos ningún trabajo sin tu autorización (Real Decreto 1457/1986).</li>
<li><b>Resguardo de depósito:</b> al dejar el coche te damos un resguardo con los trabajos, el importe previsto y la fecha de entrega. Lo necesitas para recogerlo.</li>
<li><b>Piezas sustituidas:</b> te las enseñamos y te las entregamos, salvo que nos digas que no las quieres.</li>
<li><b>Factura:</b> detallada, con cada operación, las piezas y las horas de mano de obra con su precio.</li>
<li><b>Garantía de las reparaciones: 3 meses o 2.000 km</b>, lo que llegue antes, desde la entrega. En vehículos industriales, 15 días o 2.000 km. Cubre piezas y mano de obra de lo reparado.</li>
<li><b>Tarifas:</b> el precio de la hora de mano de obra está expuesto en el taller.</li>
</ul>

<h2 id="plazo">4. Tu coche listo a tiempo o te devolvemos parte del dinero</h2>
<p>Es un compromiso comercial nuestro, además de tus derechos legales:</p>
<ul>
<li><b>Qué fecha cuenta:</b> la fecha de entrega que te damos por escrito en el resguardo de depósito o en el presupuesto que aceptas.</li>
<li><b>Qué te devolvemos:</b> si ese día, dentro de nuestro horario, el coche no está listo, te descontamos en la factura el <b>10 % del importe de la mano de obra</b> de esa reparación por cada día laborable (de lunes a viernes) de retraso, <b>hasta un máximo del 50 %</b> de la mano de obra.</li>
<li><b>Cuándo no se aplica:</b> si el retraso se debe a una pieza que no llega a tiempo y te lo hemos avisado antes de la fecha de entrega; a trabajos nuevos que autorizas después de dejar el coche; a que no podamos contactar contigo para que autorices el presupuesto; o a causas ajenas a nosotros (fuerza mayor). En esos casos te damos por escrito, también por WhatsApp, la nueva fecha, y el compromiso pasa a contar desde ella.</li>
<li>El descuento se aplica directamente en la factura. No se aplica a las piezas ni a la pintura como material, solo a la mano de obra.</li>
</ul>

<h2 id="reserva">5. Reserva online de 50 € (reembolsable)</h2>
<ul>
<li><b>Qué es:</b> pagas 50 € y el coche queda apartado para ti durante <b>48 horas</b> desde que confirmamos el pago. Mientras dure la reserva, nadie más puede comprarlo ni reservarlo.</li>
<li><b>100 % reembolsable:</b> si decides no comprarlo, por el motivo que sea, te devolvemos los 50 € íntegros por el mismo medio de pago en un plazo máximo de 14 días naturales desde que nos lo pidas. No es una señal de arras: no te obliga a comprar ni tiene penalización.</li>
<li><b>A cuenta del precio:</b> si compras el coche, los 50 € se descuentan del precio final.</li>
<li><b>Cómo se paga:</b> con tarjeta, Google Pay o Apple Pay a través de Stripe (la web nunca ve los datos de tu tarjeta), o por transferencia o Bizum subiendo el justificante. Con transferencia o Bizum el coche aparece como reservado al subir el justificante; si en 12 horas no hemos recibido el dinero, la reserva se anula y te avisamos.</li>
<li><b>Cuando pasan las 48 horas:</b> te llamamos. Si lo necesitas (por ejemplo, porque esperas la respuesta de la financiera), podemos ampliar la reserva; si no, la liberamos y te devolvemos los 50 €.</li>
<li><b>Si dos personas pagan a la vez:</b> el coche es para quien completó antes el pago; a la otra persona le devolvemos el importe íntegro.</li>
<li><b>Comprobante:</b> al reservar recibes un comprobante en PDF y un enlace privado para consultar tu reserva. No es una factura: la factura se emite al formalizar la compra.</li>
</ul>

<h2>6. Citas online</h2>
<ul>
<li>Al reservar día y hora en la web, la cita queda confirmada al momento y la hora deja de estar disponible para otros clientes.</li>
<li>Si no puedes venir, avísanos por WhatsApp o por teléfono para liberar la hora. Si llegas más de 20 minutos tarde y hay otro cliente, puede que tengamos que darte otra hora.</li>
<li>Si por un imprevisto tenemos que cambiar tu cita, te avisaremos lo antes posible por WhatsApp o por teléfono.</li>
<li>La cita de taller no es un presupuesto: el presupuesto por escrito te lo damos al revisar el coche.</li>
</ul>

<h2>7. Reclamaciones</h2>
<p>Si algo no ha ido bien, cuéntanoslo primero: casi todo se arregla hablando. También puedes pedir en el taller una <b>hoja de reclamaciones oficial</b> del Gobierno de Canarias, o acudir a los servicios de consumo de tu ayuntamiento o del Gobierno de Canarias y al sistema arbitral de consumo.</p>
""" + FOOT

for name, html in (("aviso-legal.html", aviso), ("privacidad.html", priv), ("cookies.html", cook), ("condiciones.html", cond)):
    (OUT / name).write_text(html, encoding="utf-8")
    print("escrito", name)
