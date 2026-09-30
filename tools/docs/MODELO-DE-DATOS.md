# Modelo de datos de los módulos 3, 4 y 5

Tu web **no usa PostgreSQL**: guarda todo en **Netlify Blobs** (almacenes de documentos clave → JSON), con copia diaria automática
(`netlify/lib/copia.mts`). Por eso no hay `CREATE TABLE`, `ALTER TABLE` ni migraciones: cada «tabla» de abajo es un almacén y una
familia de claves. Es el equivalente exacto de lo que se pidió, sin instalar ninguna base de datos ni tocar nada de lo que ya funciona.

| Se pedía (SQL) | Existe como | Almacén · clave |
|---|---|---|
| `fichajes_jornada` | Jornada (ya existía, no se ha cambiado) | `jornada` · `estado/<uid>` y `dia/<AAAA-MM>/<uid>/<DD>` (eventos entrada · pausa · reanudar · salida, hora del servidor, cadena de control) |
| `form14_factura_reparacion` | Factura de reparación de cada orden: emisor, cliente, vehículo, líneas (mano de obra / recambio / otro), descuento, IGIC, emisión y rectificativas (-R1…) | `taller` · `f/<token>` → `f5` (solo gerente y recepción la ven completa; el equipo del taller solo ve «emitida») |
| `libro_facturas` | Registro INALTERABLE de facturas emitidas: serie F-AAAA-NNNN y R-AAAA-NNNN (rectificativas), datos del cliente y líneas, importes, IGIC, huella SHA-256 encadenada con la anterior; listado CSV para la gestoría y comprobación de integridad | almacén `facturas` · `reg/<seq>` · `num/<número>` · `orden/<token>~<n>` · contadores `contador/…` y `reserva/…` (números sin duplicados) |
| `copias_seguridad` | Copias automáticas diarias, una por almacén; se conservan 30 días, el día 1 de cada mes 24 meses y el 1 de enero para siempre | almacén `copias` · `diaria/AAAA-MM-DD.json` (índice) y `diaria/AAAA-MM-DD/<almacén>.json` · `estado.json` |
| `form04_tiempos_taller` | Fichaje de tareas de coches propios + FORM-03 de órdenes | `vehiculos` · `t/<id>` (coches propios) · `taller` · `f/<token>` → `f3` (órdenes de clientes) |
| `form04_pausas_tarea` | Eventos `pausa`/`reanudar` con motivo dentro de cada tarea | dentro de `t/<id>.eventos[]` y `f3.eventos[]` (motivos: `MOTIVOS_PAUSA`) |
| `crm_conversaciones` | Conversaciones del agente de ventas por canal | `whatsapp` · `c/<teléfono>` · `c/fb:<PSID>` · `c/ig:<IGSID>` |
| (medios de la Ayuda) | MP3 de la voz DAN | `ayuda-voz` · `<vídeo>/<n>.mp3` y `meta/<vídeo>` |

## Tarea de un coche propio — `vehiculos` · `t/<id>`
```
id, vehiculo (id de la ficha), ref, matricula, coche
tipo            reparacion | mantenimiento | limpieza
uid, nombre     quién trabaja (un solo trabajo abierto por persona)
estMin          tiempo estimado (5–1440 min)
eventos[]       { tipo: inicio|pausa|reanudar|fin, t (hora del servidor), por, motivo, nota, auto? }
justificacion   { codigos[A–I], explicacion (≥ 5 letras), t, por }  — obligatoria si la desviación pasa del umbral
cierre          { t, por, pin: true, netoMin, desvPct, desvMin }     — firma con PIN
vistoBueno      { t, por, nota }                                      — solo el gerente
```
Fórmulas (las mismas del FORM-03 de siempre, en `calculo()` de `netlify/lib/taller.mts`):
`tiempo neto = fin − inicio − suma de pausas` · `desviación min = neto − estimado` · `desviación % = (neto − estimado) / estimado × 100`.
Umbral por defecto: **15 %** o **30 min** (ajustable en Taller → Equipo y ajustes). Si se supera, **no se puede cerrar** sin causas A–I y
explicación. Al cerrar, el neto pasa solo a las horas de la ficha del coche (y de ahí a Finanzas).
Reglas duras (en el servidor, no en la pantalla): hora del servidor · pausa con motivo · PIN al cerrar (5 fallos → bloqueo 10 min) ·
no se trabaja sin jornada fichada (423) · una jornada en pausa pausa la tarea y al volver la reanuda · nada se borra, solo se anula con motivo.

## Conversación — `whatsapp` · `c/…`
```
msgs[]{role,content,t}  últimas 16 (se olvidan a las 48 h)   telefono (Messenger/Instagram: el que da el cliente)
nombre, presentado, ultimaCita, vistos[] (avisos repetidos de Meta), humanoHasta (una persona contestó: el agente calla 3 h)
```
Los casos que cierra el agente entran en el CRM normal (`solicitudes` · `s/<id>`) con canal «WhatsApp / Facebook Messenger / Instagram Direct (IA nocturna)»
y, si pidió llamada o prueba de conducción, «pedida para el AAAA-MM-DD a las 08:30».

## Reglas del motor de ventas (`netlify/lib/ventas.mts`)
* Horario humano: **L–V 08:00–16:00, hora de Canarias**, sin los días cerrados de Agenda. Fuera de eso contesta el agente.
* Llamadas y pruebas de conducción fuera de horario: **08:30 del siguiente día laborable** (o de hoy si aún no han dado las 08:00 de un día laborable).
* Filtro de salida: cinco frases nunca salen («Es el último coche», «Confía en mí», «¿Por qué no te decides?», «Precio negociable», «Oferta solo por hoy»);
  se reescriben por una versión honesta antes de enviar, en los tres canales.

## Cómo se comprueba
`bun tools/pruebas/e2e-vehiculos.mjs` (98) · `e2e-permisos.mjs` (97) · `e2e-ventas.mjs` (55) · `e2e-voz.mjs` (86) ·
`python3 tools/pruebas/e2e-tareas-panel.py` (38) · `e2e-voz-panel.py` (33) · `e2e-vehiculos-panel.py` (26).
