# CLAUDE.md · Memoria del proyecto VOLCANO CARS (volcanocars.com)

Claude lee este archivo al empezar cada sesión. Mantenlo al día: al final de CADA actualización, añade aquí lo que cambie
(estructura, reglas, estado) y en `LEEME.md` el detalle de la actualización.

## 0. Cómo usar la memoria (LEER PRIMERO)
- Este archivo = reglas, estructura, estado y trampas. **`CLAUDE-INDICE.md` = inventario completo del código** (cada función de servidor con sus
  rutas, cron, almacenes y variables; cada archivo de lógica con sus exportaciones; cada página, JS, CSS y herramienta con su descripción).
  Se genera con `python3 tools/indice.py`. Para el código exacto de algo, abrir ese archivo del repositorio.
- Al final de CADA actualización Claude: (a) ejecuta `python3 tools/indice.py`, (b) actualiza la sección 7 «Estado actual» de este archivo,
  (c) añade el detalle a `LEEME.md`, y (d) mete `CLAUDE.md` y `CLAUDE-INDICE.md` en el ZIP.
- Si el repositorio no está disponible en la sesión, pedir al usuario el enlace de GitHub o los archivos antes de tocar nada.

## 1. Quién y qué
- Negocio: **VOLCANO CARS** (sociedad Mailin y Yeray SL): taller mecánico, chapa y pintura y venta de coches de ocasión en
  Costa de Antigua, Antigua (Fuerteventura, Las Palmas). Teléfonos 643 56 60 98 y 676 96 03 48. Correo volcanocars2026@gmail.com.
- Dueño: Yeray (habla español; escribe en mayúsculas y con prisa: respuestas claras, en español, sin jerga).
- Web: https://volcanocars.com (Netlify, proyecto `monzacar-web`), publicada sola desde GitHub
  `monzacarfuerteventura-alt/monzaCAR`, rama **master**. El repositorio *monzacar-web / Monzacar-Web* NO está conectado.
- Los créditos de Netlify son limitados: **un solo commit/push por actualización** (cada push = un deploy).

## 2. Forma de trabajar (OBLIGATORIA)
1. Claude lo hace todo. El usuario solo recibe un **ZIP** `VolcanoCars-actualizacion-NN.zip` con carpeta `archivos/` (solo los
   archivos que cambian, con su ruta del repo) y `LEEME.txt` (comandos de PowerShell + qué incluye + qué comprobar).
2. **No tocar nada existente que no se haya pedido.** Si se pide algo nuevo, se conserva todo lo anterior.
3. Numeración: la siguiente actualización es la **42** (la 41 = auditoría con Search Console y rastreo completo; INCLUYE la 37, 38, 39 y 40, que no se habían subido). Si un ZIP nuevo incluye al anterior, decirlo y
   que NO suba el anterior aparte.
4. Antes de entregar: aplicar el ZIP sobre un clon limpio de `master`, comprobar `git status --short` (solo `M`, y `A` solo para
   archivos nuevos esperados) y probar en navegador (Playwright, móvil Pixel 7/5 y PC). Indicar en LEEME.txt cuántos archivos deben salir.
5. Comandos del usuario (PowerShell): `git clone -b master URL $work` → `Expand-Archive` → `robocopy archivos $work /E` →
   `git add -A; git status --short` → commit → `git push origin master`. Plantilla en el LEEME.txt de cualquier ZIP anterior.
6. Si falta código para hacer algo bien (p. ej. el repo no está al día), AVISAR al usuario en vez de adivinar.
7. Nunca escribir claves ni contraseñas en el código ni en este archivo. Solo se nombran las variables de entorno.

## 3. Estructura del repositorio
- `public/` (se publica tal cual; `netlify.toml`: publish=public, functions=netlify/functions, build=`node tools/fuentes-locales.mjs`)
  - `index.html` (ES, ~350 KB), `en/index.html` (EN, **se genera** con `python3 tools/build-en.py`: no editar a mano),
    `comprar/index.html`, `taller/index.html`, `contacto/index.html`. Son una SPA con vistas `#v-inicio/#v-comprar/#v-taller/#v-contacto`
    y función `go(v)`. Los cambios de la SPA hay que hacerlos **en las 4 páginas** (index, en, comprar, taller).
  - `rendimiento.css` / `rendimiento.js`: **modo ligero** (`html.lite`), animaciones baratas, pausa de lo que no se ve y reserva de huecos (CLS).
    Van copiados **en línea** en las 4 páginas SPA con `python3 tools/pagespeed/inline-rendimiento.py` (necesita bun; repetible), que además mete en
    línea `taller-vfx.css` (`#vfx-css`) y `precios-taller.css` (`#pt-css`). Un cambio en cualquiera de esos 4 CSS/JS → volver a ejecutar ese script.
  - `mejoras.css` / `mejoras.js`: mejoras de interfaz. **El CSS de `mejoras.css` va copiado (inline) dentro de las 4 páginas SPA**
    (`tools/pagespeed/inline-css.py`): un arreglo de CSS se edita en `mejoras.css` Y en los 4 HTML.
  - `admin.html` (~1,1 MB): panel de gestión (Dashboard, CRM, Taller, Agenda, Coches, Finanzas, Caja, Ausencias, Marketing...).
    Scripts del panel: `panel-mejoras.js`, `panel-plus.js`, `panel-precios.js`, `panel-sistemas.js`, `piloto-web.js`, `taller-ui.js`.
  - `seguimiento.html` (el cliente ve su coche en `/s/XXXX`), `reserva.html`, `aviso-legal.html`, `privacidad.html`, `cookies.html`,
    `condiciones.html` (legales: se generan con `python3 tools/legal.py`; si se toca una, tocar también el script).
  - Páginas SEO de servicio: `taller-mecanico-fuerteventura/`, `chapa-y-pintura-fuerteventura/`, `itv-fuerteventura/`,
    `pre-itv-fuerteventura/`, `financiacion-coches-fuerteventura/`, `coches-segunda-mano-fuerteventura/`.
    Páginas SEO por pueblo (`/taller-mecanico-<pueblo>`, `/coches-segunda-mano-<pueblo>`): las genera `netlify/functions/local.mts`
    con `paginas.css`, `tema.css`, `medicion.js`. Datos de pueblos en `netlify/lib/municipios.mts`.
  - Otros: `conversion.js/css`, `taller.css`, `taller-vfx.js/css` + `vfx/` (vídeo de fondo por servicio), `precios-taller.js/css`,
    `script-ia.js` (asistente), `cartel-fichaje.js`, `origen.js`, `ig/` (carruseles Instagram + `calendario.json`), `marca/` (logos),
    `ayuda/videos`, `coches/` (fotos), `fonts/` (se generan en el build), `robots.txt`, `site.webmanifest`, `404.html`.
- `netlify/functions/*.mts`: servidor. Rutas principales: `/api/coches`, `/api/fotos`, `/api/videos`, `/api/solicitudes` (CRM),
  `/api/ordenes` (taller), `/api/reservas`, `/api/vehiculos`, `/api/caja`, `/api/finanzas`, `/api/ausencias`, `/api/jornada`,
  `/api/almacen`, `/api/entregas`, `/api/informes`, `/api/marketing`, `/api/whatsapp`, `/api/asistente`, `/api/voz`, `/api/financiacion`,
  `/api/seguridad`, `/api/login`, `/api/ev` (analítica sin cookies), `/api/viendo`, `/api/interes`, `/api/sindica`,
  `/coche/:slug`, `/inventario.json`, `/sitemap.xml`, `/feeds/xml.xml|json.json|meta.csv`, `/coches-vendidos`, `/q/:cod`.
  Programadas (cron): `copia-programada` (diaria 03:05), `informe-programado` (07:30), `marketing-piloto` (08:15),
  `reservas-tareas` (cada hora), `sindicar-programada` (cada 15 min), `stats-compactar` (02:20), `vigilante` (cada 10 min), `whatsapp-limpiar` (03:35).
- `netlify/lib/*.mts`: lógica compartida (`shared.mts` = acceso a almacenes con `store(nombre)`, `taller.mts` con `EMISOR` de facturas,
  `copia.mts`, `seguridad.mts`, `sindica/` = multipublicación, etc.). `netlify/privado/sistemas`: manuales internos solo con sesión.
- `tools/`: scripts de generación y pruebas (`build-en.py`, `legal.py`, `seo.py`, `tema.py`, `build-rutas.py`, `pagespeed/inline-css.py`,
  `sindica/inyectar.py`, `respuestas/`, `whatsapp/SYSTEM-PROMPT.md`, `pruebas/` con tests e2e y `sindica.test.mjs`) y notas `CAMBIOS-*.md`, `GUIA-TEMA.md`.
- `CLAUDE-INDICE.md` (inventario generado por `tools/indice.py`), `LEEME.md`: historial detallado por actualización (léelo para saber el porqué de cada cosa). Dependencias: `@netlify/blobs`, `@netlify/functions`.

## 4. Datos (Netlify Blobs)
Almacenes: `monzacar` (coches), `monzacar-fotos`, `monzacar-informes`, `monzacar-videos`, `solicitudes`, `ordenes`, `reservas`,
`reservas-docs`, `taller`, `vehiculos`, `facturas`, `caja`, `finanzas`, `jornada`, `ausencias`, `almacen`, `entregas`, `enlaces`,
`marketing`, `pilotoweb`, `analitica`, `seguridad`, `vigilancia`, `whatsapp`, `copias`, `sindica`, `sistemas`, `clientes-fotos`, `ayuda-voz`.
**Los nombres `monzacar…` NO se renombran** (se perderían coches y citas).

## 5. Variables de entorno (Netlify; solo nombres)
`ADMIN_PASSWORD`, `ADMIN_TOTP_SECRET`, `SESSION_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`,
`GROQ_API_KEY`, `GROQ_URL`, `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `WA_TOKEN`,
`WA_PHONE_ID`, `WA_VERIFY_TOKEN`, `WA_APP_SECRET`, `FB_PAGE_TOKEN`, `IG_TOKEN`, `META_APP_SECRET`, `SHEETS_WEBHOOK_URL`,
`SHEETS_SECRET`, `FEED_TOKEN`, `SINDICA_ACTIVO` (sin ella la multipublicación es siempre simulacro), `SINDICA_CANALES`, `SINDICA_MAX`,
`AS24_URL`, `AS24_TOKEN`. Al cambiar una variable hay que volver a publicar.

## 6. Marca
Grafito #1B1B1A · Magma #D9481C · Hueso #F2EFEA · Hormigón #DCD8D1. Títulos Archivo condensada en mayúsculas, texto Figtree.
Logo dibujado en la propia página (símbolos `vc-logo`, `vc-iso`). Instagram: carruseles **cuadrados 1080x1080**.

## 7. Estado actual (4-10-2026)
- Última actualización entregada: **41** (auditoría completa con Search Console; incluye 37–40). Base: la 36 (commit 83b1ec2).
- PageSpeed (38): `/comprar` y `/taller` YA NO llevan `noindex` (daba SEO 66–69); su canónica apunta a `/coches-segunda-mano-fuerteventura/` y `/taller-mecanico-fuerteventura/` (también en el script que cambia la canónica al cambiar de vista). `origen.js` y `medicion.js` van EN LÍNEA (minificados) en las 4 páginas SPA (dos peticiones que bloqueaban el pintado). La petición de `/api/coches` se lanza desde la cabecera (`window.__cochesP`); `/api/interes` y `/api/viendo` esperan 1,5 s. La 1.ª foto del catálogo en `/comprar` va con `loading=eager` y `fetchpriority=high`. El h3 de «Alertas de coches» ahora es h2 (orden de encabezados). `/coches-vendidos` lleva `noindex, follow` y ya no está en el sitemap (volver a ponerlo cuando haya entregas publicadas). Aviso de cookies compacto (CSS `.ck` en las 4 páginas + `medicion.js` para las páginas SEO).
- (Superado por la 39) El JavaScript ya NO se minifica en el repositorio: se minifica al publicar (ver más abajo).
- (ver también la 39) `tools/build-en.py` ya NO está sincronizado con `index.html` (falla en «Cargando coches…»): `en/index.html` se editó a mano en la 38; arreglar el generador antes de volver a usarlo.
- **Actualización 39 (auditoría de todas las páginas).** (1) Los 8 pueblos × 2 servicios (16 páginas) pasan a `indexar…: true` en `netlify/lib/municipios.mts`, con párrafos y preguntas propios en cada uno (antes 7 llevaban `noindex`: La Oliva, Costa Calma y Morro Jable en taller y coches, y Antigua en coches); entran solos al sitemap. Una zona nueva SIN esos textos propios debe quedar sin indexar (riesgo de «páginas puerta»). (2) Páginas legales (`aviso-legal`, `privacidad`, `cookies`, `condiciones`): ahora `index, follow` con descripción y canónica, y en el sitemap. (3) `/comprar` y `/taller` ya sin `noindex` (38), con canónica a la página SEO equivalente. (4) El pie de las páginas del servidor (`pie()` de `lib/paginas.mts`) usa h3 (orden de encabezados); contraste de `.ofe-pct` (`#B83A12`); enlace «Qué incluye la pre-ITV» (antes «Más información»); tarjetas de coche sin `aria-label` (el nombre sale del texto visible); botones de día del calendario con el texto visible dentro de su nombre accesible; `Reserva tu cita` con `aria-level="2"`.
- **Minificado AL PUBLICAR (39).** `netlify.toml` ejecuta `node tools/fuentes-locales.mjs; node tools/minificar-html.mjs`. El script (esbuild, devDependency) minifica solo la copia publicada: JS/CSS sueltos de `public/` y los `<script>`/`<style>` en línea de las páginas públicas (salta admin, reserva, seguimiento y 404). Si falla o no hay esbuild, no toca nada y la publicación sigue. **En el repositorio el código sigue legible** (la 38 minificaba en el repositorio y guardaba fuentes en `tools/src-js/`: eso ya no se usa). Excepción: las copias EN LÍNEA de `origen.js` y `medicion.js` dentro de las 4 páginas SPA van minificadas a mano; si se cambia `medicion.js`/`origen.js`, hay que volver a pegarlas.
- **Generadores DESFASADOS (no ejecutar):** `tools/seo.py` y `tools/legal.py` ya no reproducen las páginas publicadas (borrarían la cláusula de la fianza de 50 €, el control de calidad FORM-04, la dirección «Costa de Antigua», etc.). Las páginas SEO estáticas y las legales se editan A MANO en `public/`. `tools/build-en.py` también falla (texto «Cargando coches…»): `en/index.html` se edita a mano.
- **Medir:** `/home/claude/lh`-style: Lighthouse móvil sobre un servidor local con `/api`, `/fonts` y `/.netlify` reenviados a la web real; las páginas de las funciones (pueblos, ficha, vendidos, sitemap) se prueban empaquetando el `.mts` con esbuild y un `@netlify/blobs` simulado. Google Fonts no responde desde el contenedor: el «errors-in-console / Prácticas 96» local es de ese entorno, no de la web.
- Páginas que quedan SIN indexar a propósito: `/coches-vendidos` (hasta que haya entregas publicadas; volver a `index, follow` en `vendidos.mts` y al sitemap), `admin`, `reserva`, `seguimiento`, `/s/…`, `/r/…`, `404` y fichas de coches vendidos.

- **Actualización 40 (diseño de las páginas SEO).** Las páginas SEO estáticas (`taller-mecanico-fuerteventura`, `chapa-y-pintura`, `pre-itv`, `itv`, `financiacion-coches`, `coches-segunda-mano-fuerteventura`, `contacto`), las del servidor (pueblos, fichas, vendidos; plantilla `lib/paginas.mts` y `lib/plantilla-coches-fv.mts`) y las 4 legales usan el mismo diseño que la portada: cabecera compacta con botón «Llamar» (contorno + icono), botones de 44–48 px en filas (el principal ocupa la fila, los secundarios van de dos en dos), tarjetas de cristal oscuro, **barra de pestañas inferior igual que la portada** (`nav.mtabs`: Inicio, Comprar, Taller, Contacto; la pestaña activa se marca con un script de 1 línea según la ruta) y **botón redondo de WhatsApp** (`.pg-fab`, dentro de un `<aside>`). Sustituye a la barra `pg-barra` (WhatsApp+Llamar), que queda oculta. Todo el estilo está en el BLOQUE «VERSIÓN 2» al final de `public/paginas.css` (gana a lo anterior); los textos y el HTML de cada página no cambiaron salvo la barra de abajo. Las legales (que antes tenían un CSS propio) ahora cargan `paginas.css`, llevan cabecera, migas, pie y barra, y su clase de contenido es `.legal`.
- **Fuentes precargadas (40).** `tools/fuentes-locales.mjs` precarga ahora Archivo (títulos) Y Figtree (texto) en todas las páginas, también en las que genera el servidor (`lib/paginas.mts`). Sin eso, al cambiar la letra de respaldo por Figtree el texto se recoloca y las páginas SEO daban CLS 0,04–0,25; con las dos precargadas medí 0. Ese cambio solo existe al publicar (el script modifica los archivos en Netlify, no en el repositorio).

- **Actualización 41 (auditoría con Search Console).** Search Console (propiedad `sc-domain:volcanocars.com`, propietario) está conectado a Claude vía Composio. Hallazgos del 4-10-2026: la web empezó a verse el 24–25 sept (~320 impresiones, 22 clics hasta el 1 oct); las páginas de pueblo SÍ estaban indexadas el 25 sept (se perderían con el `noindex` posterior: se corrige en la 39); `/pre-itv`, `/coches-segunda-mano-fuerteventura/` y `/taller-mecanico-fuerteventura/` declaraban como canónica `lestter7th.netlify.app` cuando Google las leyó el 25 sept (hoy ya apuntan a volcanocars.com: falta que Google las relea); `/itv-fuerteventura/` y la ficha del Tourneo aún sin descubrir. Cambios del código: el sitemap lista `/contacto/` (la URL final; antes `/contacto` daba un 301), las descripciones de la portada ES/EN bajan de 160 caracteres y la portada lleva datos estructurados `WebSite` (nombre «Volcano Cars» + alternativos) y `Organization` (logo, teléfono, dirección) para la búsqueda de marca. El rastreo propio (75 URLs) no encontró enlaces rotos, títulos ni descripciones duplicados, imágenes sin alt, JSON-LD roto ni páginas huérfanas. Los «404» que salen al rastrear con un script son falsos: son plantillas de JavaScript dentro de la portada (`${wa(...)}`), no enlaces.

- No arreglable desde el código: `/.netlify/scripts/hud` (script de Netlify, caché de 1 min) lo inyecta Netlify.
- Rendimiento (36): modo ligero automático SOLO en móviles flojos de verdad (37): memoria ≤2 GB, «ahorro de datos», o fotogramas >45 ms medidos DOS veces seguidas con la página quieta (núcleos y 2G ya no cuentan); `?lite=1` fuerza (solo esa pestaña), `?lite=0` quita (se recuerda), `?diag=1` enseña el motivo,
  animaciones sin repintados (holograma del taller por transform/filter, lava y carretera fijas, camión por transform, LED/brasas solo opacidad), pausa
  de animaciones fuera de pantalla (`.vc-off`), fondo del taller sin vídeo en modo ligero, CLS del taller 0,80→0,01 y de /comprar 0,43→0.
  Medido (Chrome móvil simulado, CPU 6x): coste de las animaciones en reposo 2,3–2,9 s → <0,1 s cada 3 s.
- Filtros de coches: precios 1.500–5.500 € de 500 en 500; km hasta 100.000…400.000 (de 50.000 en 50.000); combustible solo Gasolina, Diésel y GLP.
- La barra «N servicio(s) elegido(s) · Reservar» solo se ve en Taller (se recalcula tras el cambio de vista).
- Páginas SEO: sin barra fija WhatsApp/Llamar abajo ni etiqueta de Netlify.
- Multipublicación en portales: construida pero APAGADA (formatos AutoScout24/Meta son borrador).
- Pendiente de decidir con el usuario: lista de contactos de empresas locales (fontanería, reformas, mensajería) para plan de
  mantenimiento de furgonetas; Vibe Prospecting dio muy pocos resultados útiles. Cuidado con el art. 21 LSSI en correos comerciales.

## 8. Trampas ya resueltas (no repetir)
- La etiqueta «Powered by Netlify» es un iframe fijo `#nl-badge-frame`; la variable CSS `--badge` sube las barras flotantes. El detector
  NO debe buscar «netlify» en cualquier elemento: las fotos usan `/.netlify/images` y subían las barras a mitad de pantalla.
  Detector estricto en `mejoras.js` y `panel-plus.js`; `--badge` limitado a 90 px. En páginas SEO y legales el iframe se oculta por CSS.
- `document.startViewTransition` hace asíncrono el cambio de vista: lo que dependa de la vista visible se recalcula dentro de `swap()`.
- El chat (`.bot-fab`) se oculta en móvil mientras el aviso de cookies (`#ck`) está abierto.
- `tools/legal.py` regenera las legales: tras cambiarlas a mano, cambiar también el script, o se pierde el arreglo.
- Playwright: servir los archivos locales sobre el HTML en vivo con `route`; las pruebas largas se lanzan con `nohup … &` (límite de 120 s por comando).
- Vibe Prospecting: `company_country_code` y `company_region_country_code` son excluyentes; ES-CN funciona, ES-GC da 0; `show-sample` gasta créditos.
- Cada comando de PowerShell encadenado con `&&` puede saltarse pasos: dar pasos separados y comprobables.

- **Rendimiento en móvil (actualización 36).** Lo que cuesta no es el JavaScript sino repintar: animar `box-shadow`, `background-position`, `top`,
  un `@property` de ángulo con máscara, o `filter` sobre texto con `background-clip:text` obliga a recalcular y repintar en cada fotograma. Usar solo
  `transform`, `opacity` y (con cuidado) `filter`. Lo animado debe poder pausarse fuera de pantalla (`.vc-off`) y apagarse en `html.lite`.
- Los CSS que antes se cargaban por JS (`taller-vfx.css`, `precios-taller.css`) provocaban saltos de contenido (CLS 0,80): la capa del vídeo salía sin
  estilo y empujaba la página 300 px. Ahora van en línea; sus JS comprueban `#vfx-css` / `#pt-css` antes de pedirlos.
- `go()` no usa `startViewTransition` en modo ligero. `taller-vfx.js` en modo ligero solo pide el póster (nada de vídeo) y los 3 vídeos favoritos solo
  se precargan en aparatos con ≥4 GB y ≥6 núcleos.
- Medir: Playwright + `Emulation.setCPUThrottlingRate` 6 + `Performance.getMetrics` (LayoutDuration/RecalcStyleDuration/TaskDuration) en reposo 3 s;
  CLS con `PerformanceObserver('layout-shift')` y las rutas `/api/coches` y `/api/precios-taller` con datos reales. Probar con `?lite=0` (si no, el
  contenedor de pruebas, con pocos núcleos, activa el modo ligero solo).

- **Modo ligero mal activado (actualización 37).** La 36 lo activaba con `hardwareConcurrency ≤4` o 2G y con un único sondeo de fotogramas a los 1,2 s de cargar:
  Brave/Firefox esconden o falsean los núcleos, la cobertura mala marca «2G» en un móvil rápido y la carga inicial hacía fallar el sondeo, así que móviles de
  gama alta salían en modo ligero. Además `?lite=1` se guardaba para siempre (clave `vc-lite`). Ahora: clave nueva `vc-lite2` (la antigua se borra), `?lite=1`
  solo dura la pestaña, y el sondeo espera 2,5 s, no mide mientras se hace scroll y exige fallar dos veces. No volver a decidir por núcleos ni por tipo de red.
  Si un móvil rápido sale en ligero: abrir `volcanocars.com/?diag=1` (el cuadro dice el motivo; ojo con «reducir movimiento» de Android, que también apaga animaciones).

## 9. Auditoría y valoración (4-10-2026) · datos para responder al instante
Tamaño medido en el repositorio: 793 archivos; 53 funciones de servidor (~6.900 líneas) + 32 archivos de lógica compartida (~5.000);
19 páginas HTML (~23.400 líneas; el panel `admin.html` pesa 1,1 MB); 14 JS (~3.600) y ~1.800 líneas de CSS; ~11.400 líneas de herramientas
y 20 archivos de pruebas. Total ≈ 52.000 líneas. Sin base de datos externa ni framework: HTML/JS puro + Netlify Functions (TypeScript) + Netlify Blobs.
Qué implementa: web pública ES/EN (Inicio, Comprar con filtros, Taller con reserva y precios «desde», Contacto) · ficha de coche con vídeo 360°,
«personas viendo este coche», financiación y oferta de mercado · reserva online con recogida a domicilio · panel privado (Dashboard, CRM de leads,
Órdenes de taller, Agenda, Coches, Finanzas, Caja, Jornada/fichaje, Almacén, Ausencias/RRHH, Ayuda con vídeo y voz, Respuestas, Marketing)
· facturas y presupuestos que el cliente acepta y paga (Stripe) desde su enlace `/s/XXXX` · asistente 24/7 con IA, voz (ElevenLabs) y agente de
WhatsApp · avisos por email (Resend) y Telegram · analítica propia sin cookies · SEO técnico (JSON-LD, sitemap, páginas por servicio y por pueblo) ·
seguridad (login con 2FA TOTP, muro, vigilante cada 10 min) · copias diarias · multipublicación en portales (apagada) · piloto automático de
Instagram/Facebook · Google Ads preparado · legales RGPD/LSSI · fondo VFX por servicio · 20 pruebas automáticas.
Nivel: aplicación de negocio a medida (no una web de plantilla): web + CRM + gestión de taller + facturación + automatización con IA.
Valoración si se encargara en España (estimación de Claude, no presupuesto real): 1.700–2.500 horas de trabajo. Con tarifas de mercado
(fullstack freelance 35–55 €/h medio y 55–90 €/h senior; agencias más) saldría en **60.000–150.000 €**, más mantenimiento anual
(orientativo 10–20 % del coste). Referencias de mercado 2026: web corporativa 1.500–8.000 €; panel interno 8.000–25.000 €;
plataforma multi-rol (portal clientes + admin) 25.000–60.000 €+. Una web de plantilla equivalente a la parte pública costaría 1.500–8.000 €.
Limitaciones: esto es una estimación por tamaño y alcance; no se ha probado en vivo cada función; el valor real de mercado depende de quién lo haga.
