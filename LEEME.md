# Web de Volcano Cars

- `public/index.html` es la web pública en español (Inicio, Comprar, Vender, Taller y Contacto).
- `public/en/index.html` es la versión en inglés. Se genera sola con `python3 tools/build-en.py`: no la edites a mano.
- `public/admin.html` es el panel (tudominio/admin): **Dashboard**, **CRM**, **Taller**, **Agenda** y **Coches**.
- `public/seguimiento.html` es la página que ve el cliente con su enlace `/s/XXXX`: estado de su coche, fotos y presupuesto para aceptar.
- `public/aviso-legal.html`, `privacidad.html` y `cookies.html` son las páginas legales. Cambia `[NOMBRE…]` y `[NIF/CIF]` por tus datos.
- `netlify/functions/` es el servidor: coches, fotos, solicitudes (CRM), órdenes de taller (`ordenes.mts`), analítica sin cookies (`ev.mts`) y su resumen nocturno (`stats-compactar.mts`). Todo se guarda en Netlify Blobs.

## Contraseña del panel
Está guardada en Netlify, en la variable de entorno `ADMIN_PASSWORD` del proyecto monzacar-web
(Project configuration → Environment variables). Si la cambias, vuelve a publicar la web para que se aplique.

## Google Ads
Cuando tengas la cuenta, abre `public/index.html`, busca `const ADS = {` y pega el ID (AW-…) y las etiquetas
de conversión. Después ejecuta `python3 tools/build-en.py` para que la versión inglesa también las tenga, y publica.
Mientras el ID esté vacío no se carga nada de Google ni sale el aviso de cookies.

## Publicar la web
La web está en https://lestter7th.netlify.app y se publica sola desde GitHub
(repositorio **monzaCAR**, rama **master**). Ojo: el repositorio *monzacar-web / Monzacar-Web* NO está
conectado a la web; lo que subas ahí no se ve.

Forma fácil: abre PowerShell en esta carpeta y ejecuta
    .\PUBLICAR-EN-LA-WEB.ps1
El script descarga la rama master de monzaCAR, copia encima esta carpeta, guarda el cambio y lo sube.
Netlify tarda 1-2 minutos en publicarlo.

## Marca Volcano Cars
- Colores: Grafito #1B1B1A · Magma #D9481C · Hueso #F2EFEA · Hormigón #DCD8D1 (variables al principio del <style>).
- Letra de títulos: Archivo condensada (Google Fonts), en mayúsculas. Texto: Figtree.
- El logo va dibujado dentro de la página (símbolos `vc-logo` y `vc-iso`), no depende de ninguna imagen.
- Los almacenes de datos de Netlify se siguen llamando `monzacar…` a propósito: si se renombran se pierden los coches y las citas guardadas.

## Vídeo 360° de los coches
En el panel, al añadir o editar un coche, sección **Vídeo 360°**. Admite MP4, MOV o WEBM de hasta 300 MB.
- Vídeo normal dando la vuelta al coche, o vídeo de cámara 360° (se detecta solo si es 2:1; el cliente lo mueve arrastrando).
- En iPhone, graba en «Más compatible» (Ajustes → Cámara → Formatos): el panel rechaza los vídeos HEVC porque en Android y Windows no se ven.
- Se sube en trozos de 4 MB y se sirve por partes (`netlify/functions/videos.mts`).

## «X personas están viendo este coche»
Contador real (`netlify/functions/viendo.mts`): cuenta las pestañas con la ficha abierta en el último minuto,
una por persona. Si no hay nadie más, no se muestra nada. No lo cambies por un número inventado: es publicidad engañosa.

## Avisos por email de cada cliente nuevo (Resend)
1. Crea una cuenta gratis en https://resend.com **con el correo volcanocars2026@gmail.com** (sin dominio propio, Resend solo deja enviar al correo de la cuenta).
2. En Resend: API Keys → Create API Key → copia la clave (empieza por `re_`).
3. En Netlify, proyecto de la web → Project configuration → Environment variables → Add a variable:
   `RESEND_API_KEY` = la clave. (Opcional: `AVISOS_EMAIL` para mandar los avisos a otro correo.)
4. Vuelve a publicar la web. Desde ese momento cada cita, solicitud o presupuesto aceptado llega también por email.
Cuando tengas dominio propio (p. ej. volcanocars.es), verifícalo en Resend y pon `AVISOS_REMITENTE` = `Volcano Cars <avisos@volcanocars.es>`.

## Analítica
Sin cookies y sin guardar IPs: cada visitante cuenta una vez al día con un código que cambia a diario.
Tus propias visitas no cuentan en el ordenador o móvil donde hayas entrado al panel.
El Dashboard compara siempre con los mismos días del mes anterior y tiene «Informe PDF» y «Excel».

## Seguridad (muro)
- **Entrada al panel**: la contraseña (`ADMIN_PASSWORD` en Netlify) solo viaja al entrar; después se usa una sesión firmada
  que caduca a las 12 h y se cierra sola tras 60 min sin uso. Usa una contraseña de 14 caracteres o más.
- **Bloqueo automático**: 5 fallos → esa conexión queda bloqueada 15 min (24 h si reincide).
- **Verificación en dos pasos**: Panel → Seguridad → «Activar verificación en dos pasos» (Google Authenticator).
  Si pierdes el móvil: usa un código de recuperación, o pon en Netlify la variable `DESACTIVAR_2FA` = `1`, entra y quítala.
- **Cerrar sesión en todos los dispositivos**: Panel → Seguridad. Cambiar `ADMIN_PASSWORD` también las cierra todas.
- **Límites por conexión** en todas las funciones (Netlify rate limiting) y **trampas** para robots (/wp-login.php, /.env…)
  que bloquean 24 h a quien las pisa.
- **Cabeceras**: CSP (solo se carga código de la web y de Google), HSTS, anti-iframe, sin fugas de enlaces privados.
- **Registro de seguridad** de 30 días en el panel y avisos por email (con Resend) de bloqueos y accesos nuevos.
- Variable opcional `SESSION_SECRET` (texto largo al azar): refuerza la firma de las sesiones.

## Buscador de coches
En «Comprar coche» hay buscador por marca o modelo, filtros rápidos (hasta 5.000 €, automático, diésel, ECO…),
un panel con todos los filtros (precio, año, kilómetros, combustible, cambio y etiqueta DGT) y orden (precio más bajo, más alto,
año, kilómetros, recién llegados). Los filtros quedan en la dirección de la página, así que se pueden compartir:
por ejemplo `/?cambio=Automático&orden=barato#comprar`. Si no hay resultados, el cliente puede pedir por WhatsApp que le aviséis.

## Financiación
Panel → Coches → «Financiación en la web»: entidad, TIN, comisión de apertura, plazos, entrada por defecto, importe mínimo,
antigüedad máxima del coche y si se enseña «desde X €/mes» en las tarjetas. La web calcula cuota, TAE y el ejemplo
representativo obligatorio (Ley 16/2011). Los pre-estudios llegan al CRM como «Financiación», con plantillas de WhatsApp
para pedir documentos y avisar de la aprobación. IMPORTANTE: pon las condiciones reales de tu financiera antes de anunciarlo.

## Asistente 24/7
Botón naranja abajo a la derecha. Responde horario, cómo llegar, garantía, coches disponibles, financiación, estado de la
reparación, pre-ITV, entrega… y pasa a un asesor por WhatsApp con el mensaje ya escrito. No usa IA ni cuesta nada.
Las respuestas están en `public/index.html` (busca «ASISTENTE 24/7»).

## SEO (Google)
- Cada coche tiene su propia página: `/coche/marca-modelo-año-xxxx` con fotos, precio y datos estructurados (schema.org Car).
- Páginas de servicios: `/coches-segunda-mano-fuerteventura/`, `/taller-mecanico-fuerteventura/`,
  `/chapa-y-pintura-fuerteventura/`, `/pre-itv-fuerteventura/`, `/financiacion-coches-fuerteventura/`.
  Se generan con `python3 tools/seo.py` (textos, preguntas frecuentes y datos estructurados dentro).
- `/sitemap.xml` se genera solo con todas las páginas y coches a la venta.
- Cuando tengas dominio propio: cambia BASE en `tools/seo.py`, la dirección en `robots.txt` y en `public/index.html`
  (canonical, hreflang, og y JSON-LD), ejecuta `python3 tools/seo.py` y `python3 tools/build-en.py`, y da de alta el
  dominio en Google Search Console enviando `https://tudominio/sitemap.xml`.

## Oferta de mercado («¡Oferta imbatible de mercado!»)
Panel → editar coche → «Comparativa de mercado»: pega los precios de anuncios reales del mismo coche (mismo año y motor,
km parecidos) en coches.net, Wallapop, Milanuncios… La web calcula la media, el ahorro en euros y el porcentaje, y lo
enseña en la ficha, en la página del coche para Google y como sello «−X % vs mercado» en la tarjeta. Se puede ordenar
el catálogo por «Mayor ahorro vs mercado».
Reglas para que siempre sea verdad: mínimo 3 coches comparados, precio por debajo de la media (desde un 3 %) y
comparativa de menos de 4 meses (si caduca, el bloque se oculta solo: actualízala). A partir del 10 % sale como
«¡Oferta imbatible de mercado!»; entre el 3 y el 9 %, como «Precio por debajo del mercado».
La frase de urgencia usa datos reales (cuánto tardaron en venderse vuestros últimos coches).

## Guía de venta (El Método de Venta Volcano Cars · SOP-02 v2.0)
Panel → Coches → «¿No sabes cómo publicar y vender?» (o /admin#guia). Seis pasos + Chuleta + Anexo A, cada uno con
«Hazlo así», «En el panel» (botones que llevan a la pantalla correcta) y «Listo cuando» (las casillas se guardan en el móvil).
También hay enlaces a la guía dentro del formulario del coche (fotos, descripción, comparativa) y en el CRM.
«Descargar PDF completo» abre «Imprimir» con el manual en A4 (portada + 9 páginas enlazadas): elige «Guardar como PDF».
Textos: tools/guia/guia.js · estilos: tools/guia/guia.css · después ejecuta  python3 tools/guia/inyectar.py

## Mejoras de captación (25-09-2026)
Detalle completo en `tools/CAMBIOS-CAPTACION.md`. Resumen:
- **Alertas de coches por pueblo** bajo el catálogo (`/comprar#alertas`) → CRM tipo «Alerta». En el panel, al añadir un coche, «Alertas que encajan» da el WhatsApp de cada cliente para avisarle antes de publicarlo.
- **⚡ Prioridad Taller (+10 %)** en el Presupuesto Exprés por foto (`/taller#prioridad`) → etiqueta `[SOLICITUD VIP - PRIORIDAD ALTA +10%]` en email, Telegram, Sheets y CRM.
- **Historial Sin Sorpresas**: PDF (FORM-02 + FORM-04) por coche, se sube en el panel (ficha del coche) y sale en la web solo si existe. `/api/informes`.
- **Agente de WhatsApp con IA** fuera de horario: `/api/whatsapp`, guion y puesta en marcha en `tools/whatsapp/SYSTEM-PROMPT.md`. Variables `WA_TOKEN`, `WA_PHONE_ID`, `WA_APP_SECRET`, `WA_VERIFY_TOKEN` (y `WA_MODO`).
- **Etiqueta «Powered by Netlify»**: apágala en Project configuration → General → Powered by Netlify badge.
- La dirección de la web para Google (canonical, robots, hreflang) es ahora **https://volcanocars.com**.

## Reserva online: «🚚 Te lo llevamos a domicilio» (25-09-2026)
En el modal de reserva de 50 €, la opción «Aún no lo sé» se ha cambiado por «🚚 Te lo llevamos a domicilio (Gratis en Fuerteventura)».
Al elegirla se piden municipio, dirección exacta, día (lunes a viernes, próximos 10 días laborables) y mañana o tarde; son obligatorios (web y servidor).
La dirección llega con la etiqueta `[ENTREGA A DOMICILIO SOLICITADA - DIRECCIÓN: …]` en el CRM, en el email y en Telegram, en el WhatsApp del justificante de Bizum/transferencia,
en el mensaje de confirmación, en el comprobante PDF y en Panel → Coches → Reservas (con enlace al mapa).

## Intervención 27-09-2026 (permisos, Costa de Antigua, cartel, sonido y voz)
- **Permisos por puesto** (`netlify/lib/acceso.mts`): todas las funciones del panel usan `permiso(req, "equipo" | "gerente")`.
  - Contraseña del panel o persona con puesto **Gerente** (usuario + PIN) → todo el panel.
  - **Calidad, Recepción y Mecánico** → Taller (incluida «Nueva recepción», que antes daba «No autorizado» a Calidad), CRM, Agenda,
    Coches, Reservas, Entregas, Inventario, Respuestas, Ayuda y la Caja si el gerente se la da. Dashboard, Finanzas, Seguridad,
    Marketing, equipo y copia completa: solo Gerente. Borrar coches, clientes, órdenes o informes: solo Gerente.
  - Todo el equipo tiene que fichar la entrada antes de trabajar (registro de jornada): sin fichar, el panel enseña la pantalla de fichaje.
  - Cerrar todas las sesiones y la verificación en dos pasos de la contraseña: solo entrando con la contraseña.
- **Pruebas** (`tools/pruebas/`): `bun tools/pruebas/e2e-permisos.mjs` (97 comprobaciones de las funciones reales con cada puesto)
  y `python3 tools/pruebas/e2e-panel.py` con `bun tools/pruebas/servidor-local.mjs` (el panel en Chromium, 27 comprobaciones).
- **Costa de Antigua** en toda la web, el panel, las plantillas y los datos de Google (addressLocality). Se mantiene «Antigua»
  donde es el nombre del municipio (páginas por pueblo, listas de municipios de entrega y enlaces /…-antigua).
- **Tarjetas de la portada**: 30 puntos (el control de calidad FORM-04 tiene exactamente 30 puntos por coche), 8:00–16:00 y GRATIS 0€.
- **Cartel de fichaje QR/NFC** A4 de marca: `public/cartel-fichaje.js` (lo usa Jornada → «Ver e imprimir el cartel»).
- **Sonidos y guía por voz** del panel: `public/panel-plus.js` (botones 🔊 y 🗣️ arriba; se recuerdan en cada dispositivo).
- **Respuestas → Instagram y Facebook**: plantillas de comentarios y mensajes privados, perfiles oficiales y bandeja de Meta.
- **Botón Marketing Live** y asistente de la web suben si aparece la etiqueta «Powered by Netlify». Lo mejor es apagarla:
  Netlify → Project configuration → General → «Powered by Netlify» badge → Disable.
- **Copia de seguridad automática diaria** (`copia-programada.mts`, 03:05 UTC, guarda 30 días) → Panel → Seguridad → «Ver copias automáticas».
- **Lanzamiento**: redirecciones 301 de www/http a https://volcanocars.com, caché de fuentes/fotos y página de gracias virtual
  (`/gracias` en Google Analytics) al enviar un formulario.

## Precios «desde» del taller
En el panel: **Taller → «Precios en la web»**. Pon el precio más bajo con IGIC de cada servicio (Pre-ITV, frenos,
pintura, aceite…), su unidad (/ pieza, / rueda, / eje, / hora) y, si quieres, una etiqueta (Oferta, Más pedido,
Nuevo, En el día). Al pulsar **Guardar y publicar** sale al momento en la web con una etiqueta de precio animada:
- en las tarjetas del taller (/taller) y en el bloque «Tu presupuesto» de la cita;
- en las tarjetas «Chapa y pintura» y «Mecánica rápida» de la portada;
- en las páginas de servicio (Pre-ITV, taller mecánico, chapa y pintura, guía de la ITV y taller de cada pueblo),
  con botón «Reservar cita» que abre /taller con ese servicio ya marcado;
- y en los datos para Google (precio mínimo con IGIC).
Vacío = «a presupuestar» (no sale precio). Solo el gerente puede cambiarlos; el equipo no ve la tarjeta.
Archivos: `netlify/functions/precios-taller.mts` (guarda en Netlify Blobs), `public/precios-taller.js` y `.css`
(las etiquetas), `public/panel-precios.js` (el editor del panel) y `public/taller-ui.js` (el presupuesto de la cita).

## Fondo VFX del taller (vídeo por servicio)
Al marcar un servicio en /taller, el fondo pasa a un vídeo en bucle de ese servicio (render CAD / X-Ray) con fundido
cruzado y capa oscura para que se lea todo. Código: `public/taller-vfx.js` y `.css` (los carga `public/taller-ui.js`).
Vídeos: `public/vfx/taller/<servicio>-<v|h>.mp4` + póster `.jpg` (v = móvil vertical, h = ordenador).
Los que hay ahora son provisionales (generados con `tools/taller-vfx/renderizar.py`). Para poner los definitivos,
sustituye los archivos con el mismo nombre y sube `ver` en `taller-vfx.js`. Todo en `tools/taller-vfx/GUIA-VIDEOS.md`.

## Sistemas Volcano Cars (MO-00 v3.0, 30-09-2026)
Panel → **Taller → «Sistemas Volcano Cars»**: los 11 sistemas en su orden estricto (S01 → S11) con su PDF para el equipo,
el índice MO-00 con el orden de implantación y los formularios digitales que no existían:
FORM-05 Cascos y abonos (S02) · FORM-06 Ronda 5S (S03) · FORM-07 Hoja de preparación (S04) · FORM-08 Prueba a domicilio con
fianza de 50 € (S06) · FORM-09 Postventa con reloj de 48 h (S07) · FORM-10 Plan de marketing y FORM-11 Auditoría del viernes
15:00 (S08 y S09, solo gerente). FORM-01 a 04 siguen en cada orden (S01) y la Guía de venta es el S05.
Nombres nuevos: «Manual SOP-01» = Sistema 01 · «SOP-02» = Sistema 05 · Guía de WhatsApp = parte del Sistema 06.
Archivos: `public/panel-sistemas.js` (tarjeta y formularios), `netlify/functions/sistemas.mts` (guarda en el almacén
«sistemas» de Netlify Blobs, incluido en las copias de seguridad) y `public/sistemas/*.pdf` (no salen en Google).
Para cambiar un PDF: sustitúyelo con el mismo nombre y sube `V = "?v=1"` en `panel-sistemas.js`.


## Coches propios (Taller)
Panel -> Taller -> **Coches propios**: control interno de cada coche que compras para arreglar y vender. Fases: Entrada/danado -> En reparacion -> Control de calidad -> Listo para venta (solo interno) -> Vendido. Horas, notas, fotos, costes (el equipo propone, el gerente aprueba) y piezas del Inventario (descuentan stock). Finanzas suma piezas, horas y costes al beneficio del coche cuando la ficha se enlaza con un coche de la web. Todo es privado: datos en el almacen `vehiculos` (entra en la copia diaria). Codigo: `tools/vehiculos` + `python3 tools/vehiculos/inyectar.py`; servidor: `netlify/functions/vehiculos.mts`. Pruebas: `tools/pruebas/e2e-vehiculos.mjs`.


## Fichaje de tareas, agente de ventas y voz de la Ayuda
- **Fichaje de tareas**: bajo el fichaje de jornada (`tools/tareas`): reparacion, mantenimiento o limpieza de un coche propio o una orden, con pausas con motivo, desviacion, causas A-I y PIN.
- **Ventas** (`netlify/lib/ventas.mts`, `meta.mts`, `netlify/functions/whatsapp.mts`): filtro de frases prohibidas, llamadas y pruebas de conduccion a las 8:30 del siguiente dia laborable, y los mismos avisos por Facebook Messenger e Instagram Direct (variables FB_PAGE_TOKEN / IG_TOKEN / META_APP_SECRET; webhook /api/whatsapp o /api/meta).
- **Voz DAN** (`netlify/lib/guiones.mts`, `netlify/functions/voz.mts`, `tools/voz`): guiones de los 9 videos y voz de ElevenLabs (variable ELEVENLABS_API_KEY, y ELEVENLABS_VOICE_ID si no encuentra la voz por nombre). Se genera desde Ayuda con el boton del gerente.
- Documentos: `tools/docs/MODELO-DE-DATOS.md`, `tools/docs/QA-MATRIZ.md`, `tools/ayuda/GUIONES-VIDEOS.md`. Pruebas: `tools/pruebas/e2e-*`.


## Ausencias y permisos (RRHH) y pulido del panel
- **Facturas con registro inalterable** (`netlify/lib/facturas.mts`): serie F-AAAA-NNNN y R-AAAA-NNNN correlativas, huella SHA-256 encadenada, listado CSV para la gestoria y comprobacion de integridad. Falta para Verifactu completo: certificado electronico, envio a la AEAT y declaracion responsable (consultar con la gestoria; plazo sociedades 1-1-2027).
- **Copias**: diarias por almacen; 30 dias + dia 1 de cada mes (24 meses) + 1 de enero para siempre (`netlify/functions/copia-programada.mts`).
- **Manuales de procedimientos privados**: `netlify/privado/sistemas` + `/api/manual/<nombre>` (piden sesion). **PIN**: 5 fallos bloquean al usuario 15 min.
- **Factura de reparacion (FORM-14)** (`tools/factura`, ficha `f5` en `netlify/functions/taller.mts`): pestana entre FORM-02 y FORM-03; se rellena desde el presupuesto; IGIC 7/0/otro; al emitir queda bloqueada; el gerente la reabre con motivo y sale como rectificativa (-R1). El mecanico no ve importes. Pruebas: `e2e-factura.mjs` y `e2e-factura-panel.py`.
- **Ausencias** (`tools/ausencias`, `netlify/functions/ausencias.mts`): el trabajador las comunica desde su pantalla de fichaje (con foto o PDF); el gerente las ve arriba en Jornada y decide. Modelo y permisos: `tools/docs/MODELO-AUSENCIAS.md`.
- **Pulido** (`tools/pulido`): menu superior con todas las secciones y ventanas con formato.


## Actualizacion 8 (datos de factura y orden de S01)
- **Factura**: telefono 643 56 60 98 y correo volcanocars2026@gmail.com en la ficha impresa (`tools/factura/factura.js`).
- **Panel > Sistemas**: S01 en el orden del manual v3.0 y con FORM-14.
- Herramienta nueva: EXPORTAR-WEB-COMPLETA.ps1.

## Actualizacion 7 (seguridad y estabilidad)
- **Facturas**: si un fallo deja un registro reservado sin escribir, el siguiente Emitir lo sella con un registro «H» encadenado (`sellarHuecos` en `netlify/lib/facturas.mts`); Comprobar integridad lo muestra en «avisos». Lecturas por lotes de 25.
- **Ausencias**: la referencia AUS-AAAA-NNN se reserva con «solo si no existe»; cada solicitud lleva `rev` y un cambio simultaneo ya no pisa al otro (409 «recarga y reintenta»).
- **Salud**: `/api/salud-web` (netlify/functions/salud-web.mts) devuelve ok, version y estado de la copia; sirve para el vigilante de caidas.
- Herramientas fuera del repo: VOLVER-ATRAS.ps1 y ARCHIVAR-COPIA-EXTERNA.ps1 (carpeta Documentos\VolcanoCars-herramientas).


## Actualizacion 10 (ayuda en video y voz)
- **Ayuda**: 14 videos largos paso a paso en `public/ayuda/videos` (se graban con el panel real: `tools/ayuda/grabar`). Textos de cada paso en `netlify/lib/guiones.mts`.
- **Voz**: sin configurar nada se oye la voz del navegador; con ElevenLabs (`ELEVENLABS_API_KEY` en Netlify) hay selector de voz en Ayuda (`/api/voz/voces`).
- Taller: `Compra` pasa a `Coche de stock (nuestro)`. Jornada: el aviso de salida se esconde solo.


## Actualizacion 9 (manuales v3.1)
- **Manuales**: los 11 PDF de `netlify/privado/sistemas` llevan la hoja *Actualizacion v3.1* (+ hoja suelta del Sistema 05). Portada con la razon social MAYLIN Y YERAY S.L.
- **FORM-11**: bloque G *Datos y facturas* en `public/panel-sistemas.js`.
- **Factura impresa**: etiqueta FORM-14 y numero correlativo F-AAAA-NNNN (`tools/factura/factura.js`).
- Aviso conocido: Finanzas cuenta presupuestos aceptados, el libro cuenta facturas emitidas; se comparan cada viernes (G4).

## Actualizacion 11 (reglas de la fianza, razon social, Finanzas y PageSpeed)
- **Condiciones**: nuevo apartado 6 «Prueba a domicilio con fianza de 50 €» con las 4 reglas (cancela ≥24 h → se devuelve; no se presenta → se retiene; prueba y no compra → 50 € − combustible; compra → a cuenta del precio). Liquidación en 48 h.
- **Razon social**: MAYLIN Y YERAY S.L. en toda la web (antes «MAILIN Y YERAY SL» en las páginas públicas, JSON-LD, funciones y herramientas).
- **Finanzas ↔ facturas** (`netlify/functions/finanzas.mts`): cada orden toma número e importe de su factura emitida (FORM-14, `netlify/lib/facturas.mts`); si hay presupuesto aceptado sin factura, se avisa «falta emitir la factura».
- **PageSpeed móvil**: CSS de la portada en línea y minificado (`<!--CSS-INICIO-->…<!--CSS-FIN-->` en index, en/, comprar/ y taller/; si cambias `tema.css`, `taller.css`, `conversion.css` o `mejoras.css` hay que volver a generarlo con `tools/pagespeed/inline-css.py`), contraste del naranja (#C23E14), estrellas con `role="img"`, encabezados del pie `h3`, enlaces «Más información sobre cookies», sin reflow forzado al arrancar.

## Actualizacion 12 (videos de la Ayuda sin versiones viejas)
- Los videos de `/ayuda/` se guardaban una semana en el navegador con el mismo nombre, asi que tras actualizar se veian los videos antiguos (p. ej. 0:21) con la lista nueva (4:14). Ahora cada video se pide con `?v=<huella>` (generada por `tools/ayuda/videos.py`), la cache es larga e inmutable y, al reproducir, el panel compara la duracion real con la esperada: si no cuadra, pide el video otra vez y, si aun asi no cuadra, avisa de pulsar Ctrl+F5.
- Tras regrabar videos: `python3 tools/ayuda/videos.py && python3 tools/ayuda/inyectar.py`.

## Actualizacion 13 (voz de la Ayuda: clave de ElevenLabs desde el panel y voz del navegador)
- Ayuda → Voz → «Voz más natural (ElevenLabs)» → **Clave de ElevenLabs**: se pega la clave en el propio panel (también desde el móvil), se comprueba contra ElevenLabs y se guarda en el servidor (almacén `ayuda-voz`, clave `clave`; solo la lee `netlify/functions/voz.mts`). Gana sobre la variable `ELEVENLABS_API_KEY` de Netlify. Rutas: `POST /api/voz/clave`, `POST /api/voz/claveborrar` (solo gerente).
- Voz del navegador (`public/panel-plus.js`, `decir()`): si el aparato no tiene voz en español ya NO lee con la voz por defecto (en algunos móviles suena a chino); avisa y propone instalarla o usar ElevenLabs. Tono más natural (antes bajaba el tono a 0,72).

## Actualización 14 (incluye la 11, 12 y 13)
- **Voz de la Ayuda · errores claros de ElevenLabs.** ElevenLabs responde «401» tanto si la clave es mala como si te has quedado sin créditos, no tiene permisos o el plan gratuito está bloqueado. Antes el panel decía siempre «clave no válida». Ahora lee el motivo real (`errEleven` en `netlify/functions/voz.mts`) y lo enseña con la frase original de ElevenLabs.
- **No gasta créditos de más.** `/api/voz/generar` salta las frases que ya tienen voz (salvo «Volver a generar», que manda `forzar`). El panel solo pide las que faltan, no repite tras un error que ya explica el motivo, y si falla a medias dice cuántas frases se guardaron.
- **Saldo.** `GET /api/voz/saldo` (gerente) lee los créditos de la cuenta; el panel los enseña y avisa si no bastan. Si la clave no tiene permiso «Usuario», se sigue sin ese dato.
- Con la voz ya hecha también aparece «Generar los N vídeos que faltan», y los avisos y errores de «Descargar MP3» ya se ven.
- Se instala una sola vez: la 14 contiene la 13, así que solo hay un despliegue en Netlify.

## Actualización 15 (incluye la 11, 12, 13 y 14)

- **Facturas rectificativas.** Al reabrir una factura de taller ya emitida, esa factura NO se toca: queda en el registro y la siguiente emisión sale como rectificativa (R-AAAA-NNNN) citando la original.
- **Mecánico.** Ya no puede cambiar precios ni datos de coches ni entregas: eso es de Recepción y Gerente (nivel `ventas` en `acceso.mts`).
- **Anti-spam.** Los límites por persona usan solo la IP (antes también el navegador y se saltaban), hay un tope global por hora, y los formularios públicos exigen cabecera Origin.
- **Textos.** Se quita la promesa de «presupuesto en menos de 1 hora» y «te contestamos en minutos»; la cláusula del +10 % de Prioridad Taller figura en las condiciones (apartado 3).
- Se instala una sola vez: la 15 contiene de la 11 a la 14, un único despliegue.

## Actualización 16 (incluye la 11 a la 15)

Arreglos de la auditoría de la web pública (puntos 2 a 14 de la tabla; el 1 ya estaba en la 15):
- **Privacidad en inglés** ahora dice lo mismo que el texto en español (chat con Groq, analítica solo si aceptas cookies).
- **Banner de cookies** de las páginas estáticas: «Aceptar» y «Rechazar» con el mismo aspecto y 44 px; al rechazar se borran `_ga`/`_gcl`; texto «Google Analytics» (no «Ads»).
- **Menú en móvil** en las páginas estáticas (fila deslizable bajo el logo).
- **Inglés**: «Atrás» funciona entre secciones (`/en/#taller`), cada sección tiene su título, el selector EN/ES conserva la sección y los precios salen como €13,990.
- **«Abierto ahora»** tiene en cuenta los festivos (lista en `medicion.js`, `vcHorario`) y usa 16:00 en todas partes.
- **Títulos y descripciones** ≤60 y ≤155 caracteres (también los de fichas y pueblos, recortados automáticamente en `paginas.mts`); se quita «Precios desde 2.500 €».
- **Botón «Pagar mi reparación»** del pie quitado (se paga desde el enlace de seguimiento).
- **Táctil**: enlaces de pie, migas y legales de 44 px; contraste de «Disponible · revisado».
- **Condiciones**: apartado del control de calidad de 30 puntos.
- **robots.txt** permite `/api/coches` para que Google vea el catálogo.
- `tools/seo.py` y `tools/build-rutas.py` con los títulos nuevos. OJO: no ejecutes `tools/seo.py` sin revisar: sus plantillas van por detrás de las páginas ya publicadas.

## Actualización 17 (incluye la 11 a la 16) · resto de la auditoría

Servidor y datos
- **Precios y kilómetros de coches**: precio entre 100 y 500.000 €, km ≥ 0 (antes aceptaba −500 € o 1 billón).
- **Presupuestos del taller**: líneas con cantidad > 0, sin precios negativos, tope 100.000 €/línea y 1.000.000 € en total. Al aceptar el cliente se guarda una copia de lo aceptado (y si se reabre, queda en `historial`).
- **Facturas**: no se recorta nada en silencio (error si el precio pasa de 1.000.000 €); con IGIC 0 % hay que escribir el motivo de la exención; sin NIF solo se emite una **factura simplificada** de hasta 400 €; la clave de reintento se guarda antes que el registro (si algo falla a medias, el reintento reutiliza el mismo número, sin facturas dobles); cada registro lleva además un sello SHA-256 de todo su contenido que «Comprobar integridad» verifica.
- **Cobros**: el importe no puede pasar de lo que vale el trabajo/coche (pide confirmación explícita), tope 1.000.000 €, y la fecha tiene que existir (no 31-02).
- **Libros encadenados** (caja, finanzas, jornada…): el número de anotación se reserva con «solo si no existe», así dos fichajes a la vez ya no dan «cadena rota».
- **Reservas de coche y huecos de cita**: también atómicas (`onlyIfNew`), sin doble reserva.
- **Mecánico**: no ve los datos de financiación de los clientes, ni el IBAN/Bizum, ni los justificantes bancarios.
- **Seguridad**: `/api/asistente?probar=1` y `/api/whatsapp?probar=1` ahora piden sesión de gerente; los PIN no van en las copias de seguridad y no se admiten PIN tipo 123456 o 111111; CSV del CRM y de la gestoría neutralizan fórmulas (`=…`); contadores «viendo/interesados» sin User-Agent; tamaño real de lo recibido en solicitudes y reservas; rate limit de WhatsApp por IP.
- **RGPD**: borrar una orden borra su ficha (DNI, firma); tarea diaria borra solicitudes y reservas (con justificante) de más de 2 años aunque nadie abra el CRM.
- **Teléfonos**: móvil/fijo español (6, 7, 8 o 9 + 8 cifras, con o sin +34) o internacional con + / 00.
- Matrícula: se guarda en mayúsculas y sin espacios ni guiones.

Panel
- **Agenda → «+ Apuntar cita»**: para el cliente que llama o viene en persona (día y hora libres de la web, taller o visita de coche). Ocupa el hueco y crea la ficha en el CRM.
- **Clientes duplicados**: al crear un cliente con un teléfono que ya existe avisa y ofrece abrir su ficha.
- Móvil: las subpestañas de Taller e Inventario se desplazan (ya no ensanchan la página), textos largos no rompen el diseño, objetivos táctiles de 44 px, degradado que avisa de que hay más pestañas, botón «Marketing en vivo» discreto.
- Sin conexión sale «Sin conexión. Lo que escribiste NO se ha guardado…» en vez de «Failed to fetch».
- El Dashboard ya no dice «Facturación» (son importes de trabajos cerrados del CRM; la facturación real está en Finanzas).
- Accesibilidad: «Saltar al contenido», flechas ← → entre pestañas, nombres para botones sin texto, topes de longitud en campos. Glosario de siglas al final de cada pantalla.

Web pública
- Página 404 propia, `site.webmanifest` con nombre y colores, `twitter:card`, «Costa de Antigua» unificado, `lastmod` del sitemap, «Pagas (al contado o financiado)», `h1` en Comprar/Taller/Contacto, validación propia en el formulario del taller y tope de texto (1.500), «Aire acondicionado» ya no se parte por la mitad.

Pendiente a propósito: Verifactu y garantía de 12 meses (gestoría/abogado); copias de seguridad de fotos/PDF y restauración; `SESSION_SECRET` obligatorio (hay que ponerlo antes en Netlify); límite de tiempo de la copia cuando crezcan los datos.

## Actualización 26 (3-10-2026) · auditoría del código completo
Revisado: 19 páginas HTML (enlaces internos, rutas de funciones, SEO, JSON-LD, IDs, alt), sintaxis de todo el JavaScript
(12 bloques en línea + todos los .js), sintaxis TypeScript de `netlify/`, carga de 17 páginas en móvil y PC (sin errores ni
desbordes), datos de empresa en 224 archivos (teléfono, correo, CIF, razón social) y búsqueda de claves escritas en el código (ninguna).
Cambios:
- **Enlace de reseñas de Google** unificado en el enlace oficial `https://g.page/r/Caeh6Wr6CwtNECE/review`. Antes la web, el panel,
  el asistente, el agente de WhatsApp y las plantillas apuntaban a `…NEBM…`. Archivos: `index.html`, `en/index.html`, `comprar/`, `taller/`,
  `seguimiento.html`, `admin.html`, `script-ia.js`, `asistente.mts`, `whatsapp.mts`, `vendidos.mts`, `tools/respuestas/respuestas-datos.js`
  y `tools/whatsapp/SYSTEM-PROMPT.md`. PRUEBA el enlace desde un móvil tras publicar.
- **Datos del emisor de facturas en el servidor** (`netlify/lib/taller.mts`, `EMISOR`): teléfono 643 56 60 98 y correo
  volcanocars2026@gmail.com (antes teléfono vacío y `volcanocars@gmail.com`). No altera facturas ya emitidas ni sus huellas.
No se ha cambiado nada más. Las páginas legales llevan `noindex` a propósito (no necesitan canonical ni description).

## Actualización 28 (3-10-2026) · incluye la 26 y la 27 · multipublicación en otros portales
Todo viene APAGADO: subirla no envía nada a ningún portal.
- **Tarjeta «Multipublicación en otros portales»** en Panel → Coches (debajo de «Financiación en la web», solo gerente): 4 pasos
  (tus coches · enlaces para portales · conexión directa · probar sin riesgo), estado de cada coche con consejos para completar el
  anuncio y botones «Copiar enlace», «Simular ahora» y «Enviar ahora». Código: `tools/sindica` + `python3 tools/sindica/inyectar.py`.
- **Motor** (`netlify/lib/sindica/`): esquema unificado `volcanocars.vehiculo.v1`, adaptadores (AutoScout24, XML, JSON, Meta),
  diferencias contra lo ya publicado, reintentos con espera exponencial, respeto de `Retry-After`, interruptor de circuito por canal,
  cerrojo anti-pasadas simultáneas y coches RESERVADOS que se mantienen. `netlify/functions/sindicar.mts` (API del panel),
  `sindicar-programada.mts` (cada 15 min) y `feed-inventario.mts` (`/feeds/xml.xml`, `/feeds/json.json`, `/feeds/meta.csv`, con ETag).
- **Copia diaria**: el almacén `sindica` entra en las copias (`netlify/lib/copia.mts`).
- **Pruebas**: `node --test tools/pruebas/sindica.test.mjs` (18) y `node tools/pruebas/sindica-integracion.mjs` (simulación completa con un portal falso).
- **Variables de Netlify** (todas opcionales): `FEED_TOKEN` (texto largo al azar, 24+ caracteres; sin ella los feeds dan 404),
  `SINDICA_CANALES=autoscout24`, `AS24_URL`, `AS24_TOKEN`, `SINDICA_ACTIVO=1` (sin ella SIEMPRE es simulacro), `SINDICA_MAX` (10).
- Los formatos de AutoScout24 y Meta son un BORRADOR: hay que contrastarlos con la documentación oficial antes de activar el envío real.
  Wallapop PRO, Coches.net y Milanuncios no tienen adaptador directo: se alimentan con un multipublicador (usa el feed XML/JSON) o con contrato propio.

## Actualización 31 (4-10-2026) · barras flotantes a mitad de pantalla, etiqueta de Netlify y solapes en móvil
- **Causa de la barra flotante en medio** (`public/mejoras.js` y `public/panel-plus.js`): el script que sube el chat y la barra de
  secciones cuando aparece la etiqueta «Powered by Netlify» daba por «etiqueta» cualquier elemento cuya dirección contuviera la palabra
  «netlify». Las fotos de los coches se piden a `/.netlify/images?…`, así que una foto en la esquina inferior derecha se tomaba por la
  etiqueta, `--badge` valía hasta ~230 px y chat, globo y barra de secciones se quedaban a mitad de pantalla (más al redimensionar la
  ventana al aparecer/ocultarse la barra del navegador). Ahora solo cuenta la etiqueta real (`#nl-badge-frame` o un elemento fijo y
  pequeño), nunca fotos ni enlaces, y la subida está limitada a 90 px.
- **Páginas SEO de zona y de servicio** (`public/paginas.css`): en móvil se QUITA la barra fija de WhatsApp/Llamar de abajo (`.pg-barra`):
  duplicaba el «Llamar» de la cabecera, ocupaba sitio y chocaba con la etiqueta de Netlify y con el aviso de cookies. Es solo CSS (el HTML
  no cambia); cada página sigue teniendo «Llamar» arriba y sus botones de teléfono y WhatsApp en el contenido. Además se apaga la etiqueta
  de Netlify (misma regla que ya llevaban portada, /comprar y /taller). Las 4 páginas legales (`aviso-legal`, `privacidad`, `cookies`,
  `condiciones` y `tools/legal.py`) llevan la misma regla: la etiqueta tapaba su aviso de cookies.
- **Portada, /en, /comprar y /taller** (CSS inlined, y `public/mejoras.css` como fuente): mientras el aviso de cookies está abierto en el
  móvil, el botón del chat y su globo se esconden para no taparlo; vuelven al elegir «Aceptar» o «Rechazar».
- La solución de fondo para la etiqueta sigue siendo apagarla en Netlify: Project configuration → General → «Powered by Netlify badge» → Off.
- Comprobado en Chrome móvil simulado (360, 412), tablet y escritorio sobre 35 páginas: antes, con una foto en la esquina, las barras se
  desplazaban en 4 de 4 posiciones (hasta 227 px); ahora 0. Sin desbordes laterales, sin errores de JavaScript, sin imágenes rotas.

## Actualización 33 (4-10-2026) · incluye la 31 y la 32 · filtros de coches y barra «servicio elegido»
- **Bug: la barra «1 servicio elegido · Reservar» (del Taller) salía en «Coches disponibles».** Al cambiar de vista con la transición de vistas del
  navegador, el cambio real ocurre un instante después y `barra()` se calculaba antes, viendo todavía el Taller abierto. Ahora `barra()` se vuelve a
  calcular dentro del propio cambio de vista (`go()` → `swap`). Solo se ve en Taller, y vuelve al regresar a él. Archivos: `index.html`, `en/`, `comprar/`, `taller/`.
- **Filtros de precio:** de 1.500 € a 5.500 € en saltos de 500 € (9 valores), tanto en los botones rápidos «Hasta …» como en las listas Desde/Hasta del panel de filtros.
- **Filtro de kilómetros:** de «Hasta 100.000 km» a «Hasta 400.000 km» en saltos de 50.000 km (100, 150, 200, 250, 300, 350 y 400 mil). Se quita «Hasta 50.000 km».
- **Combustible:** solo Gasolina, Diésel y GLP (se quitan Híbrido, Híbrido enchufable y Eléctrico del panel). Los botones rápidos «Diésel» y «Gasolina» siguen igual.
- Enlaces antiguos con `?pmax=6500` o `?kmax=50000` siguen funcionando (se filtra por ese valor aunque ya no haya botón para él).
- Los valores están en `PRECIOS`, `QUICK` (precios), `kms` y `combs` dentro de cada página; hay que cambiarlos en las 4 (`index.html`, `en/`, `comprar/`, `taller/`).
