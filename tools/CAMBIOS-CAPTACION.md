# Mejoras de captación · 25-09-2026

Todo lo anterior de la web sigue igual (mismos colores, textos, formularios, reserva de 50 €, panel y CRM).
Lo nuevo va en archivos propios y en añadidos pequeños y marcados. Si se quitara `mejoras.js`/`mejoras.css`, la web volvería a ser exactamente la de antes.

## Qué se ha añadido

| # | Mejora | Dónde se ve | Archivos |
|---|---|---|---|
| 1A | **Alertas de coches por pueblo** («¿No encuentras el coche exacto que buscas?») | /comprar, debajo del catálogo · enlace directo `/comprar#alertas` | `public/mejoras.js`, `public/mejoras.css`, `netlify/lib/solicitud.mts` (tipo «alerta») |
| 1A | **Alertas que encajan** al dar de alta un coche, con su WhatsApp ya escrito | Panel → Coches → Editar/Añadir | `public/panel-mejoras.js`, `public/admin.html` |
| 1B | **Móvil**: nada tapado por la barra de abajo ni por el botón del chat | Toda la web en el móvil | `public/mejoras.css` |
| 1C | **Etiqueta «Powered by Netlify»** fuera | Toda la web | Ajuste en Netlify (ver abajo) + respaldo en `public/mejoras.css` |
| 2 | **⚡ Prioridad Taller (+10 %)** en el Presupuesto Exprés por foto | /taller → «Servicio Express por foto» · enlace directo `/taller#prioridad` | `public/conversion.js`, `public/conversion.css`, `netlify/lib/solicitud.mts`, `netlify/lib/notificar.mts` |
| 3 | **Historial Sin Sorpresas (PDF)** en la ficha de cada coche | Ficha del coche (web y /coche/…) | `netlify/functions/informes.mts`, `public/mejoras.js`, `netlify/functions/ficha.mts`, panel |
| 4 | **Agente nocturno de WhatsApp con IA** (guion Chris Voss) | Vuestro WhatsApp, fuera de horario | `netlify/functions/whatsapp.mts`, `tools/whatsapp/SYSTEM-PROMPT.md` |
| — | **Dirección de la web = volcanocars.com** (canonical, hreflang, robots, datos para Google) | Invisible; Google | `tools/*.py`, páginas generadas |
| — | **Privacidad** actualizada: avisos por WhatsApp, WhatsApp con IA e historial | /privacidad | `tools/legal.py` → `public/privacidad.html` |

## Cómo se usa cada cosa

**Alertas por pueblo.** El cliente elige pueblo (Morro Jable, Tuineje, Antigua, Puerto del Rosario, La Oliva, Pájara u otro), presupuesto y tipo de coche (opcional; se rellena solo con lo que tenía en el buscador), nombre y WhatsApp, y marca la casilla de avisos (nunca va marcada de serie). Llega al CRM como **Alerta** (filtro «Alertas de coches»), por email y por Telegram, con dos plantillas de WhatsApp: «🔔 Confirmar alta en avisos» y «🚗 Aviso: coche nuevo».
Al terminar, la web le ofrece **Guardar contacto** (.vcf): WhatsApp solo entrega las listas de difusión a quien tiene vuestro número guardado.
Cuando entra un coche: Panel → Coches → Añadir → rellena marca, modelo, año, km y precio → abajo, **Alertas que encajan** te enseña quién encaja (presupuesto hasta un 10 % por encima y mismo cambio) con el botón **WhatsApp** ya escrito. Mándalo **antes de pulsar «Publicar coche»**: es lo que promete la web. Cada aviso queda anotado en el CRM.
Si alguien responde **BAJA**, dale de baja (si tenéis el agente de WhatsApp lo hace solo: queda «Perdida · Baja de avisos»).

**⚡ Prioridad Taller.** Interruptor apagado por defecto dentro del formulario de fotos, con el ejemplo del precio (300 € → 330 €) y la letra pequeña a la vista. Si lo activa:
el aviso llega con **`[SOLICITUD VIP - PRIORIDAD ALTA +10%]`** en el asunto del email, arriba en Telegram, en Google Sheets (columna `prioridad`) y en el CRM (chip ⚡ VIP +10 % y plantilla «⚡ Presupuesto VIP»); el cliente ve «¡Prioridad Taller activada!» y un botón que os escribe por WhatsApp con la etiqueta delante.
Contestad a estos los primeros: es lo que han pagado.

**Historial Sin Sorpresas.** Panel → Coches → Editar el coche → **Historial Sin Sorpresas (PDF)** → sube un solo PDF con el **FORM-02** (inspección 360°, 80 puntos) y el **FORM-04** firmados de ese coche (máx. 5,5 MB: escanea a 150 ppp). Se publica al momento, sin volver a publicar la web. En la web sale el botón verde «📄 Descargar Historial Sin Sorpresas (PDF)» debajo del precio, y «Verlo sin descargar». Coches sin PDF: no sale nada (no se promete lo que no hay).
Antes de subirlo, tapa nombre, DNI y dirección del anterior dueño y apunta los detalles de pintura (FORM-02, fila «Pintura»).

**Agente de WhatsApp.** Ver `tools/whatsapp/SYSTEM-PROMPT.md` (guion completo, conversaciones de ejemplo y pasos en Meta). Sin las variables `WA_…` no hace nada.

## Etiqueta «Powered by Netlify» (1C)

La web ya se aparta de ella, pero la solución buena es apagarla, y no gasta créditos ni hace falta publicar:
**Netlify → tu proyecto → Project configuration → General → Powered by Netlify badge → Off → Save.**
Netlify la pone encendida de serie en los proyectos del plan gratuito creados desde el 19-08-2026. Por si vuelve a salir, `mejoras.css` la oculta (`#nl-badge-frame{display:none!important}`) y la barra de secciones del móvil baja a su sitio sola. Ojo: un `.netlify-badge { display:none }` no hace nada, porque la etiqueta real es un `<iframe id="nl-badge-frame">`.

## Móvil (1B)

La web ya dejaba 96 px (+ el alto de la etiqueta) bajo el contenido para la barra de secciones. Se añade:
`scroll-padding-bottom` en toda la página (al saltar a un ancla o escribir en un campo, el navegador deja libre la zona de la barra),
margen para la zona del gesto de inicio del iPhone (`env(safe-area-inset-bottom)`) al final de la ficha del coche,
y los nuevos bloques usan los mismos huecos. Probado a 390 × 844 (iPhone 14) y 1366 × 900.

## Publicar

Una sola publicación con todo (cada publicación gasta créditos de Netlify): sube la carpeta `monzacar-web` como siempre.
Después: apaga la etiqueta de Netlify (arriba) y comprueba en el móvil /comprar (tarjeta de alertas) y /taller (Prioridad Taller).

## Por qué así (lo investigado)

- Casi el 50 % de las tiendas online no ofrece salida cuando la búsqueda no da resultados (Baymard). La tarjeta de alertas es esa salida, y además funciona con resultados.
- Pedir el pueblo personaliza la promesa («te lo llevamos gratis a Morro Jable») y os dice qué zonas mueven; se piden 4 datos, el resto es opcional.
- Los avisos por WhatsApp son comunicación comercial: consentimiento expreso con casilla sin marcar y baja sencilla (art. 21 LSSI, RGPD).
- Los informes de estado del coche ya se usan en cerca del 62 % de las ventas organizadas de coches usados; enseñar los defectos (pintura) da más confianza que ocultarlos.
- «Prioridad» estilo aerolínea: interruptor opcional, precio explicado con un ejemplo, sin letra pequeña escondida. No se promete «hoy mismo»: si hace falta una pieza no depende del taller, y un plazo incumplido es publicidad engañosa.
- WhatsApp: desde el 15-01-2026 Meta prohíbe los chatbots de IA generalistas, pero permite los de atención y reservas de un negocio con relevo a una persona (es este caso). Las respuestas dentro de las 24 h son gratis. El Reglamento europeo de IA obliga desde el 2-8-2026 a decir que es una IA.
