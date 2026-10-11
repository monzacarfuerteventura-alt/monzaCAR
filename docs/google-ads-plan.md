# Plan de Google Ads · Volcano Cars (5 €/día, lunes a viernes)

Medición ya montada en la web (no hay que tocar nada): 3 conversiones (solicitud, WhatsApp, llamada) + GA4 + página virtual /gracias.
Además existe la página real `/gracias/` (no indexable) para usarla como destino si algún día un formulario externo redirige allí.

## Campaña 1 · Taller (empezar solo con esta)
- Tipo: Red de búsqueda, sin Red de Display ni «ampliación de búsqueda».
- Ubicación: radio 25 km alrededor de Costa de Antigua + Caleta de Fuste, Puerto del Rosario, Antigua, Tuineje (opción «Presencia», no «Interés»).
- Horario de anuncios: lunes a viernes, 7:30 a 16:00 (el taller atiende de 8:00 a 16:00).
- Puja: «Maximizar clics» con CPC máximo 0,60 € las 2 primeras semanas; luego pasar a «Maximizar conversiones».
- Página de destino: `https://volcanocars.com/taller-mecanico-fuerteventura/` (mecánica) y `/chapa-y-pintura-fuerteventura/` (chapa).

### Palabras clave (concordancia de frase y exacta)
taller mecánico fuerteventura · taller mecanico antigua · taller coches caleta de fuste · mecánico fuerteventura · cambio de aceite fuerteventura · cambio de frenos fuerteventura · pre itv fuerteventura · chapa y pintura fuerteventura · reparar abolladura coche fuerteventura · taller con cita online fuerteventura

### Palabras negativas (añadirlas el primer día)
gratis · curso · cursos · estudiar · empleo · trabajo · oferta de empleo · prácticas · manual · pdf · tutorial · diy · cómo reparar · repuestos · recambios · desguace · segunda mano (en la campaña del taller) · alquiler · rent a car · moto · bicicleta · camión · barco · concesionario oficial · tenerife · gran canaria · lanzarote · madrid · barcelona · sevilla · valencia

### Anuncios (3 titulares y 2 descripciones por anuncio, máx. 30 y 90 caracteres)
Titulares: «Taller en Costa de Antigua» · «Cita online en 1 minuto» · «Abierto de 8:00 a 16:00 seguido» · «Mecánica, chapa y pintura» · «Presupuesto por foto gratis»
Descripciones: «Taller mecánico, chapa y pintura. Pide cita online o llama al 643 56 60 98.» · «Presupuesto por foto sin compromiso. Plazo acordado: 10 % de descuento por día de retraso.»
Extensiones: llamada 643 56 60 98 · ubicación (ficha de Google Business) · enlaces de sitio: Pedir cita (/taller), Pre-ITV, Chapa y pintura, Contacto.

## Campaña 2 · Coches (cuando haya stock publicado)
- Destino: `/coches-segunda-mano-fuerteventura/` o la ficha del coche.
- Palabras: coches segunda mano fuerteventura · coche ocasión fuerteventura · comprar coche fuerteventura · coches con garantía fuerteventura · coches de ocasión caleta de fuste.
- Mensaje: 12 meses de garantía, revisado en 30 puntos, entrega gratis en toda la isla.

## Rutina diaria (5 minutos)
1. Informe de «Términos de búsqueda»: añadir como negativas todas las búsquedas que no sean de coches/taller en Fuerteventura.
2. Pausar palabras con más de 15 clics y 0 conversiones.
3. Mirar en el panel (Marketing en vivo) cuántas solicitudes llegaron con `gclid`.
4. Presupuesto: no subir de 5 €/día hasta tener al menos 3 conversiones en una semana.

## Comprobaciones
- Estado de las 3 conversiones en Ads debe ser «Registrando conversiones» (si pone «Sin actividad reciente», hacer una solicitud de prueba).
- En GA4 > Tiempo real, enviar una solicitud y comprobar el evento `generate_lead` y la página `/gracias`.
