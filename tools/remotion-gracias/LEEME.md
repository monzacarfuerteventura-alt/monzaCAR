# Animación de /gracias (Remotion)
Fuente de los vídeos `public/gracias/volcan.mp4` (móvil, 720x1280) y `volcan-wide.mp4` (escritorio, 1280x720).
Solo hace falta si quieres cambiar la animación: `npm install` y `node render.mjs` (ajusta `browserExecutable` a tu Chrome).
Después convierte con ffmpeg: `ffmpeg -i out/gracias.mp4 -c:v libx264 -crf 31 -pix_fmt yuv420p -movflags +faststart -an volcan.mp4`.
No forma parte de la web publicada ni del build (la carpeta tools/ no se publica).
