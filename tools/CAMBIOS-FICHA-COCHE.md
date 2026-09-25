# Catálogo y ficha del coche: menos distracciones, oferta → reserva

Los cambios ya están aplicados en el paquete. Aquí tienes el código por si un programador quiere revisarlo; el detalle línea a línea está en `cambios-ficha-coche.patch`.

## 1. Catálogo «Coches disponibles»

He eliminado de `public/index.html`, sección `#v-comprar`, el banner de entrega a domicilio y sus estilos `.entrega-mini`:

```html
<div class="entrega-mini">… Entrega a domicilio gratis en toda Fuerteventura …</div>
```

## 2. Ficha del coche: bloques eliminados

He quitado del `<dialog id="car-modal">` estos tres bloques:

```html
<div class="guarantee">12 meses de garantía · revisado en nuestro taller · cambio de nombre incluido</div>
<div class="m-perk">Entrega a domicilio gratis en cualquier punto de Fuerteventura, o recógelo en Antigua</div>
<div class="m-actions">
  <a id="m-wa">Preguntar por WhatsApp</a> <a id="m-call">Llamar</a> <a id="m-share">Compartir</a>
</div>
```

También he borrado lo que dependía de ellos:

- el JavaScript de `#m-wa`, `#m-call` y `#m-share`;
- sus estilos (`.guarantee`, `.m-perk`, `.m-actions`);
- una traducción obsoleta en `tools/build-en.py`.

Justo después de la financiación queda **«Ven a verlo y pruébalo»**, con «Elegir día y hora» y «Que me llaméis».

El recuento de «personas interesadas» contaba antes los clics en «Preguntar por WhatsApp». Ahora cuenta al pulsar «Reservar por 50 €».

## 3. Nuevo orden: oferta de mercado ARRIBA → reserva 50 € DEBAJO

```html
<!-- 1º la oferta frente al precio de mercado, 2º justo debajo la reserva de 50 € -->
<section class="ofe" id="m-ofe" hidden aria-label="Comparativa con el precio de mercado"></section>
<section class="rsv" id="m-rsv" hidden aria-label="Reserva online"></section>
```

Para que la transición sea fluida:

- la separación entre los dos bloques baja de 22 px a 12 px;
- el botón de la oferta («Reservar o pedir información ahora» y WhatsApp) se oculta cuando la reserva de 50 € está justo debajo, para no repetir dos llamadas a la acción seguidas;
- la frase «⚡ Por debajo del precio medio: resérvalo antes de que se lo lleve otro» enlaza directamente con el botón «RESERVAR POR 50 € (REEMBOLSABLES)».

Si la reserva online está desactivada, el botón de la oferta vuelve a aparecer solo.

```css
#m-ofe:not([hidden]) + #m-rsv:not([hidden]) { margin-top: -10px; }
#m-ofe:has(+ #m-rsv:not([hidden])) .ofe-cta { display: none; }
#m-ofe:has(+ #m-rsv:not([hidden])) .ofe-urg { margin-bottom: 0; }
```

Orden final de la ficha:

1. fotos
2. modelo y precio
3. «Añadido hace X días»
4. **oferta de mercado**
5. **reservar por 50 €**
6. datos técnicos
7. descripción
8. equipamiento
9. financiación
10. **ven a verlo y pruébalo**

Nota: la página de cada coche para Google (`/coche/…`) no cambia. La garantía y la entrega a domicilio siguen en la portada y en las condiciones.
