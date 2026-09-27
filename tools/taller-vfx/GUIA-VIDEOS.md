# Fondo VFX del taller · Guía de vídeos

Al marcar un servicio en **/taller**, el fondo de la sección pasa a un vídeo en bucle de ese servicio
(estilo render CAD / X-Ray), con fundido cruzado y una capa oscura para que todo se lea.

- Código: `public/taller-vfx.js` y `public/taller-vfx.css` (los carga solo `public/taller-ui.js`).
- Vídeos: `public/vfx/taller/<servicio>-<v|h>.mp4` + póster `<servicio>-<v|h>.jpg`.
  - `v` = vertical 720×1280 (móvil) · `h` = horizontal 1280×720 (ordenador).
- Los clips que vienen ahora son **provisionales** (animación técnica generada por código,
  `tools/taller-vfx/escenas.html` + `renderizar.py`). Cuando tengas los renders 3D definitivos,
  sustitúyelos con **el mismo nombre** y sube `ver` en `taller-vfx.js` (1 → 2) para que los móviles no usen los viejos.

## Nombres de archivo (12 servicios × 2 formatos)

| Servicio | Clave |
|---|---|
| Golpes y abolladuras | `golpes` |
| Pintura | `pintura` |
| Arañazos y rozaduras | `aranazos` |
| Cambio de aceite y filtros | `aceite` |
| Frenos | `frenos` |
| Neumáticos | `neumaticos` |
| Diagnosis electrónica | `diagnosis` |
| Pre-ITV | `itv` |
| Aire acondicionado | `aire` |
| Correa de distribución | `distribucion` |
| Batería y arranque | `bateria` |
| Otro servicio | `otro` |

Ejemplo: `frenos-v.mp4`, `frenos-v.jpg`, `frenos-h.mp4`, `frenos-h.jpg`.

## Cómo tienen que ser los vídeos definitivos

- **Duración** 6–8 s, **bucle perfecto** (el último fotograma enlaza con el primero). 24 o 30 fps. Sin audio.
- **Fondo casi negro** (#06080B), el objeto en el **centro-alto** y los bordes oscuros: encima va texto.
- **Poco contraste en la zona central-baja** del móvil (ahí están las tarjetas).
- **Peso**: 400 KB – 1,2 MB cada uno. Más de 2 MB = el móvil tarda en arrancarlo.
- **H.264 (MP4)**, `yuv420p`, `+faststart`. (WebM VP9 opcional: pon `webm: true` en `taller-vfx.js`.)
- **Póster**: un fotograma representativo en JPG de 30–70 KB (sale al instante mientras llega el vídeo).

### Convertir tus vídeos con ffmpeg (PowerShell, sin instalar nada)
1. Descarga ffmpeg portable (zip «essentials» de gyan.dev), descomprímelo en `Documentos\ffmpeg`.
2. Pon tus vídeos originales en `Documentos\vfx-originales` con el nombre del servicio (`frenos-v.mov`, `frenos-h.mov`…).
3. Ejecuta:

```powershell
$ff = "$HOME\Documents\ffmpeg\bin\ffmpeg.exe"; $sal = "$HOME\Documents\vfx-listos"; New-Item -ItemType Directory -Force $sal | Out-Null
Get-ChildItem "$HOME\Documents\vfx-originales\*" -Include *.mov,*.mp4,*.webm,*.mkv | ForEach-Object {
  $n = $_.BaseName; $esc = if ($n -like "*-v") { "720:1280" } else { "1280:720" }
  & $ff -y -i $_.FullName -t 8 -an -vf "scale=${esc}:force_original_aspect_ratio=increase,crop=${esc},fps=24" -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart "$sal\$n.mp4"
  & $ff -y -ss 2 -i $_.FullName -frames:v 1 -vf "scale=${esc}:force_original_aspect_ratio=increase,crop=${esc}" -q:v 6 "$sal\$n.jpg"
}
```
4. Copia lo de `vfx-listos` a `public\vfx\taller\` del proyecto, sube `ver` en `taller-vfx.js` y publica.

## Indicaciones (prompts) para generar cada vídeo con IA o encargarlo en 3D

Añade siempre al final: *«fondo negro, render técnico CAD/X-ray, líneas de alambre cian y naranja
volcánico (#D94A26), iluminación de estudio, cámara lenta y suave, bucle perfecto de 8 segundos, sin texto, sin logotipos»*.

- **golpes** — Panel de puerta de coche en 3D que se hunde por un golpe y vuelve a su forma original mientras un láser térmico lo recorre; mapa de calor en la abolladura.
- **pintura** — Partículas de pintura pulverizada y después barniz transparente aplicándose sobre un panel metálico curvo; reflejo que recorre la superficie.
- **aranazos** — Escáner láser infrarrojo que recorre una superficie de pintura roja: los arañazos desaparecen y queda un barniz brillante.
- **aceite** — Motor transparente en rayos X por el que fluye un aceite dorado sintético por los conductos hasta el filtro, que gira.
- **frenos** — Zoom X-ray a una pinza de freno apretando un disco ventilado al rojo vivo, con chispas de fricción.
- **neumaticos** — Neumático girando en 3D con vista de rayos X de sus capas internas (banda, cinturón de acero, carcasa) y partículas de fricción en la huella.
- **diagnosis** — Onda de pulso cibernético que escanea una centralita (ECU) y su esquema eléctrico con líneas de neón, estilo HUD técnico.
- **itv** — Escáner holográfico verde que recorre el chasis de un coche en alambre de delante hacia atrás, con puntos de verificación que se vuelven verdes.
- **aire** — Aire helado y gas refrigerante con partículas de hielo circulando por conductos transparentes de climatizador.
- **distribucion** — Vista explosiva 3D de engranajes, árboles de levas y correa dentada girando en perfecta sincronía.
- **bateria** — Arco eléctrico de alta tensión que sale de los bornes de una batería hacia el motor de arranque, que gira.
- **otro** — Despiece 3D (exploded view) de pistón, biela, engranaje, muelle y tornillo flotando y encajando entre sí.

## Cómo va de rápido

1. **Póster al instante** al tocar (ya precargado cuando la sección aparece).
2. **Vídeo en memoria** (blob): empieza a bajar en cuanto el dedo toca la tarjeta; los 3 más pedidos
   (`favoritos`) se bajan en ratos libres si hay 4G/wifi. Con «ahorro de datos» o 2G no se precarga nada.
3. **Fundido cruzado** de 650 ms entre dos `<video>`; el que se va se descarga de la memoria.
4. **Batería**: se para fuera de la sección y con la pestaña en segundo plano. «Reducir movimiento» = solo póster.
