# Web de Monza Car

- `public/index.html` es la web pública en español (Inicio, Comprar, Vender, Taller y Contacto).
- `public/en/index.html` es la versión en inglés. Se genera sola con `python3 tools/build-en.py`: no la edites a mano.
- `public/admin.html` es el panel de administración (tudominio/admin), con dos pestañas: **Coches** y **Solicitudes**.
- `public/aviso-legal.html`, `privacidad.html` y `cookies.html` son las páginas legales. Cambia `[NOMBRE…]` y `[NIF/CIF]` por tus datos.
- `netlify/functions/` es el servidor: guarda los coches, las fotos, los interesados y las solicitudes de clientes en Netlify Blobs.

## Contraseña del panel
Está guardada en Netlify, en la variable de entorno `ADMIN_PASSWORD` del proyecto monzacar-web
(Project configuration → Environment variables). Si la cambias, vuelve a publicar la web para que se aplique.

## Google Ads
Cuando tengas la cuenta, abre `public/index.html`, busca `const ADS = {` y pega el ID (AW-…) y las etiquetas
de conversión. Después ejecuta `python3 tools/build-en.py` para que la versión inglesa también las tenga, y publica.
Mientras el ID esté vacío no se carga nada de Google ni sale el aviso de cookies.

## Publicar la web (desde un ordenador con Node.js instalado)
    npm install
    npx -p netlify-cli netlify deploy --prod   (la carpeta ya está conectada a lestter4th con «netlify link»)
