# Vídeos de la ayuda del panel

Cada vídeo se graba sobre el panel real (admin.html + las funciones de Netlify con datos de prueba en memoria), con Playwright.

- `director.mjs`: graba, pone el cursor, los subtítulos «paso n/total», las tarjetas de inicio y fin, y exporta el MP4 (H.264), el póster JPG y un JSON con los pasos y sus segundos.
- `v-<modulo>.mjs`: el guion de cada vídeo. Para cambiar un texto o un paso, edita el guion y vuelve a grabar.
- `harness.mjs` / `seed.mjs`: montan el panel en local y siembran datos de ejemplo (citas, empleado de prueba).

Después de grabar:
1. Copia `<modulo>.mp4`, `.jpg` y `.json` a `public/ayuda/videos/`.
2. `python3 tools/ayuda/videos.py` (mete la lista de vídeos en ayuda.js)
3. `python3 tools/ayuda/inyectar.py` (copia la ayuda dentro de admin.html)

Los datos que salen en los vídeos son inventados. No se pulsa nunca «enviar» por WhatsApp ni se publica nada real.
