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
La web está en https://lestter5th.netlify.app y se publica sola desde GitHub
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
