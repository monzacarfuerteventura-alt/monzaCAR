# Portada reestructurada + cinta de lava

Estos cambios ya están aplicados en el paquete. El código completo, línea a línea, está en `cambios-portada.patch`.

## Nuevo orden de la portada (`public/index.html`, `#v-inicio`)

1. Portada (hero) con «Ver catálogo disponible» y «Pedir cita o presupuesto».
2. **Cinta de lava** (ticker) rediseñada.
3. **Comprar en Volcano Cars**: 01 Elige tu coche · 02 Pruébalo · 03 Te lo llevamos (`id="como-comprar"`).
4. **Te lo llevamos a casa. Gratis.** (`id="entrega"`).
5. Vendidos recientemente. Solo aparece si hay coches vendidos en los últimos 2 meses; es prueba social y se ha quedado donde estaba.
6. Nuestro taller: chapa y pintura y mecánica rápida.
7. Cifras: 12 meses, +40 puntos, 8–16 h, 0 €.
8. Ven a vernos a Antigua.
9. **Reseñas de Google Maps**, justo antes del pie, como cierre de prueba social.

**Eliminado:** el bloque «Coches disponibles · Recién llegados» (`#home-sec` / `#home-grid`) y su código:

- Las líneas de `render()` y `cargar()` que lo rellenaban.
- La regla CSS `#home-grid`.

Los enlaces directos a un coche (`/?coche=ID`, `/comprar?coche=ID`) y las tarjetas del asistente con IA siguen abriendo la ficha: usan el catálogo.

**Altura de la portada:** en el móvil, 9.195 px → 7.122 px (−23 % desde el principio); en el ordenador, 5.956 px → 4.747 px (−20 %).

## Cinta de lava (ticker)

HTML. Cada texto lleva su icono y el grupo se repite dos veces para que el bucle no se note:

```html
<div class="marquee lava" aria-hidden="true"><div class="mq-track">
  <span><svg aria-hidden="true"><use href="#tx-dent"/></svg>Chapa y pintura</span>
  <span><svg aria-hidden="true"><use href="#tx-oil"/></svg>Mecánica rápida</span>
  <span><svg aria-hidden="true"><use href="#tx-car"/></svg>Coches revisados</span>
  <span><svg aria-hidden="true"><use href="#tx-scan"/></svg>Diagnosis</span>
  <span><svg aria-hidden="true"><use href="#tx-itv"/></svg>Pre-ITV</span>
  <span><svg aria-hidden="true"><use href="#tx-tyre"/></svg>Neumáticos</span>
  <!-- … el mismo grupo otra vez … -->
</div></div>
```

CSS:

```css
/* roca volcánica con un resplandor de lava desde abajo; bordes que se funden */
.marquee{position:relative;overflow:hidden;isolation:isolate;padding-block:15px;
  background:radial-gradient(90% 160% at 50% 130%,rgba(217,74,38,.30),transparent 62%),
             radial-gradient(40% 120% at 12% -30%,rgba(255,122,61,.12),transparent 70%),
             linear-gradient(180deg,#0B0706,#150906 55%,#0B0706);
  mask-image:linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)}
/* dos grietas de lava incandescente (arriba y abajo) que fluyen en sentidos contrarios */
.marquee::before,.marquee::after{content:"";position:absolute;left:0;right:0;height:2px;z-index:1;
  background:linear-gradient(90deg,#3A0E04,#C83E1A 18%,#FFB36B 30%,#D94A26 44%,#5A1606 58%,#FF7A3D 76%,#FFD08A 84%,#3A0E04);
  background-size:200% 100%;box-shadow:0 0 12px 1px rgba(255,106,43,.55),0 0 30px 4px rgba(217,74,38,.22);
  animation:lavaFluye 7s linear infinite}
.marquee::before{top:0} .marquee::after{bottom:0;animation-direction:reverse}
.mq-track{display:flex;width:max-content;animation:mq 42s linear infinite}
/* textos alternos: blanco cálido con halo · degradado de lava en movimiento */
.mq-track span{display:flex;align-items:center;gap:12px;padding-inline:20px;white-space:nowrap;text-transform:uppercase;
  color:#FFF1E6;text-shadow:0 0 16px rgba(255,106,43,.38)}
.mq-track span:nth-child(even){color:transparent;background:linear-gradient(90deg,#FFC98A,#FF6A2B 35%,#D94A26 55%,#FF9A52 80%,#FFC98A);
  background-size:200% 100%;background-clip:text;animation:lavaFluye 5s linear infinite;filter:drop-shadow(0 0 9px rgba(255,90,31,.35))}
.mq-track svg{width:.9em;height:.9em;color:#FF7A3D;filter:drop-shadow(0 0 6px rgba(255,106,43,.75))}
/* «brasa» incandescente entre texto y texto, latiendo */
.mq-track span::after{content:"";width:9px;height:9px;margin-left:28px;border-radius:2px;transform:rotate(45deg);
  background:radial-gradient(circle at 35% 35%,#FFE6B8,#FF7A3D 45%,#C83E1A);
  box-shadow:0 0 10px 2px rgba(255,106,43,.7),0 0 22px 6px rgba(217,74,38,.22);animation:brasa 2.4s ease-in-out infinite}
@keyframes mq{to{transform:translateX(-50%)}}
@keyframes lavaFluye{to{background-position:-200% 0}}
@keyframes brasa{50%{opacity:.55}}
.marquee:hover .mq-track{animation-play-state:paused}
@media (prefers-reduced-motion:reduce){.mq-track,.marquee::before,.marquee::after,.mq-track span,.mq-track span::after{animation:none}}
```

**Rendimiento y accesibilidad:**

- Todas las animaciones son de GPU: `transform` y `background-position`.
- Se paran si el sistema tiene activado «reducir movimiento».
- La cinta se pausa al pasar el ratón por encima.
- Lleva `aria-hidden`, así que los lectores de pantalla no leen el texto repetido.

Si cambias algo en `public/index.html`, ejecuta `python3 tools/build-en.py`: así se copia a la versión inglesa y a /comprar, /taller y /contacto.
