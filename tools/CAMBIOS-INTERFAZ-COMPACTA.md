# Interfaz compacta · Presupuesto Express plegado · Cita directa

Estos cambios ya están aplicados en el paquete: solo hay que publicarlo. Aquí tienes el código de cada cambio, por si un programador quiere revisarlo o aplicarlo a mano. El detalle completo, línea a línea, está en `cambios-interfaz-compacta.patch`.

## Resultado (medido en el navegador, antes → después)

| Página | Móvil (390 px) | Ordenador (1280 px) |
|---|---|---|
| Taller | 6.251 px → 3.951 px (**−37 %**) | 3.105 px → 2.294 px (**−26 %**) |
| Taller: dónde empiezan los servicios | a 2.551 px → a **908 px** | a 1.463 px → a **758 px** |
| Taller: botón «Confirmar cita» | a 4.848 px → a **2.594 px** | a 2.426 px → a **1.655 px** |
| Inicio | 9.195 px → 7.943 px (−14 %) | 5.956 px → 5.553 px (−7 %) |
| Comprar / Contacto | −3 % / −4 % | −4 % / −5 % |

## 1. Presupuesto Express por foto: acordeón plegado

`public/conversion.js`, función `presupuestoFoto()`. La barra es un único botón accesible (`aria-expanded`). El panel queda `inert` mientras está plegado, así no se puede llegar a él con el tabulador ni con un lector de pantalla:

```html
<section class="pf" id="t-foto" aria-labelledby="pf-h">
  <button type="button" class="pf-bar" aria-expanded="false" aria-controls="pf-panel">
    <span class="pf-bar-ic" aria-hidden="true">📸</span>
    <span class="pf-bar-txt">
      <span class="pf-bar-h" id="pf-h"><b>Servicio Express por foto:</b> recibe tu presupuesto en menos de 1h</span>
      <small>Gratis y sin compromiso · te contestamos por WhatsApp</small>
    </span>
    <span class="pf-bar-go"><span class="pf-bar-go-t">Enviar foto</span><svg>…flecha…</svg></span>
  </button>
  <div class="pf-panel" id="pf-panel" role="region" aria-labelledby="pf-h" inert>
    <div class="pf-panel-in"><form class="pf-box">… foto · nombre · WhatsApp · coche · qué pasó · privacidad · enviar …</form></div>
  </div>
</section>
```

```js
const abrir = (si) => {
  box.classList.toggle("open", si);
  bar.setAttribute("aria-expanded", String(si));
  if (si) panel.removeAttribute("inert"); else panel.setAttribute("inert", "");
};
bar.addEventListener("click", () => abrir(!box.classList.contains("open")));
if (/^#(foto|presupuesto-foto)$/.test(location.hash)) abrir(true); // /taller#foto lo abre desplegado
```

`public/conversion.css`: la animación de despliegue usa `grid-template-rows: 0fr → 1fr` y no depende de alturas fijas.

```css
.pf-panel { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .32s cubic-bezier(.2,.8,.2,1); }
.pf.open .pf-panel { grid-template-rows: 1fr; }
.pf-panel-in { min-height: 0; overflow: hidden; }
.pf-box { display: grid; gap: 10px; padding: 2px 14px 14px; }
.pf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }  /* 4 campos en 2 filas */
.pf .input { padding: 10px 12px; border-radius: 11px; font-size: 16px; } /* 16px: el iPhone no hace zoom */
@media (max-width: 520px) {
  .pf-bar-h b { display: block; }              /* el mensaje cabe en 2 líneas */
  .pf-bar-txt small { display: none; }
  .pf-bar-go { width: 34px; height: 34px; }    /* en el móvil, solo la flecha */
}
```

**Eliminado:** la opción «Traerlo al taller» y su calendario. Quien quiera cita la reserva en «Reserva tu cita», justo debajo.

## 2. «Reserva tu cita»: solo «Reservar día y hora»

En `public/index.html` se ha **borrado** este bloque:

```html
<div class="modo" role="radiogroup" aria-label="Tipo de solicitud">
  <label><input type="radio" name="t-modo" value="cita" checked><span>Reservar día y hora</span></label>
  <label><input type="radio" name="t-modo" value="presu"><span>Solo pedir presupuesto</span></label>
</div>
```

El formulario funciona siempre como cita. Así ningún cliente se queda bloqueado cuando no hay horas libres o el calendario no carga:

```js
// Sin calendario (error o sin horas libres) la solicitud se envía igual y te llamamos para darte hora
const conCita = modoDe("t-modo") === "cita" && !AG_T.st.error && !AG_T.st.lleno;
```

El aviso «Elige «Solo pedir presupuesto»» se ha cambiado por «No quedan horas libres en los próximos días. Envía la solicitud y te llamamos para darte hora».

## 3. Taller más compacto (`public/taller.css`)

- La cabecera, el sello de garantía y los espacios entre bloques son más bajos.
- En el móvil, la garantía es una sola fila: sello pequeño y texto. Sus 3 puntos ya estaban en la fila de datos de arriba.
- En el móvil, los 12 servicios salen en **2 columnas** tipo app y sin la línea de descripción. Así se ven casi todos sin hacer scroll:

```css
@media (max-width: 560px) {
  #v-taller .services { grid-template-columns: 1fr 1fr; gap: 7px; }
  #v-taller .svc label { min-height: 54px; padding: 8px 28px 8px 8px; gap: 8px; }
  #v-taller .svc small { display: none; }
  #v-taller .svc .tick { top: 7px; right: 7px; width: 17px; height: 17px; }
}
```

## 4. Toda la web: menos espacios muertos (`public/index.html`)

```css
section.block { padding-block: 64px; }                                   /* antes 88px */
@media (max-width: 700px) { section.block { padding-block: 40px; } }      /* antes 60px */
.sec-head { margin-bottom: 26px; }                                        /* antes 34px (18px en el móvil) */
.panel { padding: 28px; gap: 16px; }                                      /* antes 32px / 18px */
.foot { padding-block: 52px 36px; }                                       /* antes 64px 44px */
```

Además hay un bloque «INTERFAZ COMPACTA» al final de los estilos. Ajusta la portada, las tarjetas de chapa y mecánica, las cifras, los pasos 01–02–03 (en el móvil, número y texto en la misma fila), las reseñas y el bloque «Ven a vernos». Solo cambia márgenes y rellenos: no toca ningún contenido ni ninguna función.

Si cambias algo en `public/index.html`, ejecuta `python3 tools/build-en.py` para copiarlo a la versión inglesa y a /comprar, /taller y /contacto.
