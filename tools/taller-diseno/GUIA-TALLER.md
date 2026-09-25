# Taller «high-tech» de Volcano Cars · Guía de integración

El rediseño de la sección **Taller** es solo visual. Mantiene todas las ID y clases que usa la reserva, así que el calendario en tiempo real, los pasos, el resumen, el envío al CRM, la confirmación con calendario y WhatsApp, la barra «Reservar» del móvil y el asistente con IA siguen funcionando igual.

## Qué cambia

- **Sección oscura de alta tecnología:** fondo carbón `#121212`, retícula técnica muy suave y halos en naranja volcánico `#D94A26` / `#C83E1A`.
- **Cabecera tipo panel de control:** estado en directo (abierto o cerrado), cita online, presupuesto por escrito y todas las marcas.
- **Sello de garantía holográfico:** el «10 % por día de retraso» ahora es un sello con lámina irisada que gira, borde holográfico y la etiqueta «Certificado».
- **Tarjetas de servicio tipo app:**
  - 12 iconos técnicos nuevos (SVG vectorial).
  - Al pasar el ratón, una luz naranja sigue al cursor.
  - Al elegir un servicio, el borde se ilumina en naranja y la casilla se marca con animación.
  - Arriba, un contador de servicios marcados.
- **Panel de la cita tipo «checkout»:**
  - Pasos con barra de progreso iluminada.
  - Control segmentado «Reservar / Solo presupuesto».
  - Campos oscuros con foco naranja.
  - Días y horas en píldoras, al estilo de Tesla; la hora elegida sale en blanco con halo naranja.
- **Bloque «Tu presupuesto»:** aparece al marcar servicios. Ver el apartado «Precios» más abajo.
- Funciona en móvil (360–430 px) y en ordenador, en español y en inglés. Respeta «reducir movimiento» del sistema.
- **Tipografía técnica:** Titillium Web para etiquetas, horas y cifras. Los títulos siguen con la letra de la marca.

## Archivos

| Archivo | Para qué |
|---|---|
| `public/taller.css` | Todos los estilos nuevos, con variables en `#v-taller` (paleta, radios de 12–16 px, sombras y brillos). Solo afecta a la sección del taller y a su barra móvil. |
| `public/taller-ui.js` | El contador de servicios y el bloque «Tu presupuesto». No toca la reserva. |
| `tools/taller-diseno/taller.html` | La sección del taller, para consulta. Ya está puesta dentro de `public/index.html`. |
| `public/index.html` | Lleva la sección nueva, los 15 iconos `#tx-*`, el enlace a `/taller.css` y a `/taller-ui.js`, y la fuente Titillium Web. |
| `tools/build-en.py` | Traducciones de los textos nuevos. Genera la versión inglesa y las rutas /comprar, /taller y /contacto. |

## Cómo publicarlo

1. Extrae el ZIP y ejecuta el comando de PowerShell de siempre (`PUBLICAR-EN-LA-WEB.ps1`). Gasta 15 créditos de Netlify.
2. Abre `https://lestter7th.netlify.app/taller` y pulsa **Ctrl + F5**.

Si cambias algo tú mismo:
- El **aspecto** se cambia en `public/taller.css`.
- Los **textos** se cambian en `public/index.html`.
- Después ejecuta `python3 tools/build-en.py`, para que se copien a la versión inglesa y a /taller.

## Precios del bloque «Tu presupuesto»

Viene **sin precios**: dice que el presupuesto es gratis, por escrito y antes de reparar. Así la web nunca enseña un precio que no hayas decidido tú.

Si quieres que muestre un total orientativo, abre `public/taller-ui.js` y rellena `PRECIOS_DESDE` con tus precios «desde», con IGIC incluido. Por ejemplo:

```js
const PRECIOS_DESDE = {
  golpes: null, pintura: null, aranazos: null, aceite: 59, frenos: 89, neumaticos: null,
  diagnosis: 35, itv: 30, aire: 49, distribucion: null, bateria: null, otro: null,
};
```

Los servicios con `null` salen como «a presupuestar». Con precio, se suman en «Presupuesto orientativo · desde X €». Pon solo precios que de verdad respetes: un precio anunciado obliga.

## Si algo no se ve bien

- **Sigues viendo el diseño antiguo:** pulsa Ctrl + F5. Si continúa, comprueba en Netlify que la última publicación dice «Published».
- **Salen iconos vacíos en las tarjetas:** faltan los símbolos `#tx-…` en `index.html`. Vuelve a publicar el paquete completo.
- **Quieres volver al diseño anterior:** borra la línea `<link rel="stylesheet" href="/taller.css">` de `index.html`, ejecuta `build-en.py` y publica. La reserva funciona igual con los dos diseños.
