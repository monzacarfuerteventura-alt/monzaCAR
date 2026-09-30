# Matriz de pruebas · módulos 3, 4 y 5

Método antes de cada cambio: **1) auditar lo que existe → 2) añadir sin tocar lo demás → 3) probar → 4) publicar solo si todo pasa**
(el instalador comprueba que solo cambian los archivos permitidos y no publica si algo falla).

| # | Módulo | Qué se prueba | Escritorio 1920×1080 / 1440×900 | Móvil ≥ 390 px | Prueba automática |
|---|---|---|---|---|---|
| 1 | Fichaje de tareas | La tarjeta aparece bajo el fichaje de jornada; sin entrada está desactivada | ✔ | ✔ | `e2e-tareas-panel.py` |
| 2 | | Botones ≥ 60 px (Iniciar, Pausar, Finalizar, motivos de pausa) | ✔ | ✔ | idem |
| 3 | | Iniciar → pausar con motivo → reanudar → finalizar con PIN | ✔ | ✔ | idem + `e2e-vehiculos.mjs` |
| 4 | | Desviación > 15 % o > 30 min: no cierra sin causas A–I y texto | — | — | `e2e-vehiculos.mjs` |
| 5 | | PIN incorrecto no cierra; 5 fallos bloquean 10 min | ✔ | ✔ | idem |
| 6 | | Sin red: el toque se guarda en el móvil y se envía solo al volver | ✔ | ✔ | `e2e-tareas-panel.py` |
| 7 | | Jornada en pausa ⇒ tarea en pausa; al volver ⇒ se reanuda | ✔ | ✔ | idem |
| 8 | | Sin scroll horizontal nuevo · sin errores de consola | ✔ | ✔ | idem |
| 9 | Ventas | Cada frase prohibida (y sus variantes de tildes, mayúsculas, espacios) se reescribe | — | — | `e2e-ventas.mjs` |
| 10 | | Horario L–V 08:00–16:00 Canarias, festivos, fin de semana, cambio de año | — | — | idem |
| 11 | | Llamada / prueba de conducción fuera de horario ⇒ 08:30 del siguiente día laborable | — | — | idem |
| 12 | | Messenger e Instagram: firma de Meta, duplicados, eco (una persona contestó), sin token = se ignora | — | — | idem |
| 13 | | El lead llega al CRM con canal, teléfono y cita a las 08:30; sin teléfono no se guarda | — | — | idem |
| 14 | | WhatsApp de siempre sigue igual (leído + escribiendo + respuesta) | — | — | idem |
| 15 | Ayuda con voz | Los 9 guiones: duración, un paso = una frase, ≤ 2,9 palabras/s, siglas con pronunciación | — | — | `e2e-voz.mjs` |
| 16 | | ElevenLabs: modelo `eleven_multilingual_v2`, estabilidad 0,50, similitud 0,80, MP3; voz DAN por nombre o `ELEVENLABS_VOICE_ID` | — | — | idem |
| 17 | | Errores claros (sin clave, clave mala, sin caracteres, voz inexistente); solo el gerente genera | — | — | idem |
| 18 | | Reproductor: cada frase suena en su momento, no se repite, al saltar suena solo la del paso, apagar la voz, descargar MP3 | ✔ | ✔ | `e2e-voz-panel.py` |
| 19 | Regresión | Todo lo anterior sigue igual (permisos por puesto, Coches propios, Inventario, Finanzas, Jornada) | ✔ | ✔ | `e2e-permisos.mjs`, `e2e-vehiculos*.{mjs,py}` |

Límite honesto de las pruebas: el navegador de pruebas no reproduce el H.264 de los .mp4, así que el reloj del vídeo se simula; el sonido real de ElevenLabs
y los avisos reales de Meta (Messenger/Instagram) solo pueden comprobarse con tus claves ya puestas en Netlify.
