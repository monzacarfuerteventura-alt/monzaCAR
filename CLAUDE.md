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
3. Numeración: la siguiente actualización es la **37** (la 36 = rendimiento en móviles flojos; parte de la 35). Si un ZIP nuevo incluye al anterior, decirlo y
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
- Última actualización entregada: **36** (rendimiento en móviles flojos). Base: la 35 (incluye 31, 32, 33 y CLAUDE.md; commit 48ed4cb = actualización 30).
- Rendimiento (36): modo ligero automático (móvil con ≤2 GB o ≤4 núcleos, ahorro de datos, 2G, o <26 fps medidos al cargar; `?lite=1` fuerza, `?lite=0` quita),
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
