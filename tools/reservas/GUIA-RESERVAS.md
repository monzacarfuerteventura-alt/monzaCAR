# Reserva flash de 50 €, lista de espera, comprobante PDF y presupuesto por foto

Todo va integrado en la web y en el panel, con el mismo diseño oscuro y naranja volcánico. No cambia nada de lo que ya funcionaba: citas, CRM, taller, caja, finanzas, asistente con IA…

## 1. Qué ve el cliente

**En un coche disponible**, dentro de la ficha, sale el botón **«RESERVAR POR 50 € (REEMBOLSABLES)»**. Debajo lleva el texto «🔒 Bloquéalo ahora para que no se lo lleven mientras vienes a probarlo…».

La reserva tiene 3 pasos:

1. **Sus datos:** nombre, WhatsApp, email (opcional) y el día y la hora para venir a probarlo (en el calendario real de visitas). También elige cómo pagar.
2. **El pago:**
   - **Tarjeta, Google Pay o Apple Pay:** va a la página de pago segura de Stripe y vuelve sola a la web.
   - **Transferencia o Bizum:** ve tu IBAN, el titular, el importe y el concepto automático (por ejemplo, `Reserva VC-7K3M9Q Opel Astra`). Cada dato lleva su botón «Copiar». Luego sube el justificante (una captura vale) o te lo manda por WhatsApp.
3. **Confirmación:**
   - Ve el mensaje «¡Enhorabuena, Juan! Tu Opel Astra ha sido bloqueado con éxito… Tienes 48 horas de reserva exclusiva. Nos vemos el viernes 25 a las 10:00 en nuestra exposición de Antigua para probarlo.»
   - Tiene los botones **📄 Descargar comprobante PDF** y **Reenviar por WhatsApp**, y puede añadir la visita a su calendario.
   - Recibe un enlace privado (`/r/…`) donde puede ver su reserva cuando quiera.

**Al momento**, el coche pasa de «Disponible» a **RESERVADO** en toda la web (tarjetas, ficha y página del coche). El botón de reservar desaparece para que nadie más pague.

**En un coche reservado** sale **«🔔 AVISARME SI SE CANCELA LA RESERVA»**. El cliente deja su nombre y su WhatsApp y queda en la lista de espera del coche, con su número de puesto.

**En el taller**, antes de la cita, aparece una barra compacta y **plegada**: **«📸 Servicio Express por foto: recibe tu presupuesto en menos de 1h»**. Al tocarla se despliega:

- El cliente arrastra la foto o la hace con el móvil (hasta 4 fotos), pone su nombre, WhatsApp y el coche, y la envía.
- Te llega como «Presupuesto por foto» al CRM (y a Telegram, con las fotos). Si quiere cita, la reserva abajo en «Reserva tu cita».
- Las fotos se reducen en el móvil antes de subirlas, así suben rápido.
- Enlace directo que la abre desplegada: `https://lestter7th.netlify.app/taller#foto` (útil para Instagram o Google).

## 2. Qué haces tú (panel → pestaña «Coches»)

Encima de la lista de coches tienes la zona **Reservas online**:

| Situación | Qué hacer |
|---|---|
| **Falta comprobar el dinero** (transferencia o Bizum con justificante) | Pulsa «Ver el justificante». Mira en tu banco que han llegado los 50 € y pulsa **«He visto el dinero: confirmar»**. Si no lo confirmas en **12 h**, el coche vuelve a estar disponible solo. |
| **Confirmada** | Tiene 48 h de reserva exclusiva. Botón «WhatsApp: confirmación» con el mensaje ya escrito. |
| **48 h cumplidas** | **No se libera sola.** Decide tú: «Alargar 48 h» (por ejemplo, si espera la financiación), «Lo ha comprado» o «Liberar». |
| **Liberar** | El coche vuelve a «Disponible» y la lista de espera se pone en verde: **«Avisar por WhatsApp»** abre WhatsApp con «¡Buenas noticias, Marta! El Opel Astra vuelve a estar disponible…». Si había pagado, sale «devolución pendiente» hasta que pulses «Ya le he devuelto los 50 €». |
| **Pago con tarjeta** | Se confirma solo. Las devoluciones se hacen en stripe.com → Pagos → Reembolsar. |

Otras cosas que hace sola la web:

- La pestaña «Coches» muestra un **número** cuando hay reservas que necesitan que hagas algo.
- Si cambias el coche a mano en la lista, la reserva se cierra: a «Disponible» se libera y a «Vendido» queda como vendida.
- Cada reserva, persona en lista de espera y presupuesto por foto entra también en el **CRM**, con su historial. Las fotos del daño se ven dentro del cliente.
- Te llegan los mismos **avisos** que con el resto de clientes: email y, si tienes Telegram, el justificante y las fotos del daño al móvil.

## 3. Ponerlo en marcha (paso a paso)

### Paso 1 · (Opcional) Tarjeta, Google Pay y Apple Pay con Stripe

Hazlo **antes de publicar**: si luego añades la clave, hace falta otra publicación (otros 15 créditos).

1. Entra en **stripe.com**, crea una cuenta gratis y **actívala**: te pide el NIF, los datos del negocio y la cuenta bancaria donde recibes el dinero. Stripe cobra una comisión por cada pago; mírala en stripe.com/es/pricing.
2. En Stripe, ve a **Desarrolladores → Claves de API** y copia la **clave secreta** (empieza por `sk_live_`).
3. En Netlify, abre **Project configuration → Environment variables → Add a variable**:
   - **Key:** `STRIPE_SECRET_KEY`
   - **Value:** pega la clave.
   - Guarda.
4. No pegues la clave en el chat ni se la mandes a nadie.
5. Pon solo la clave `sk_live_…` cuando la cuenta ya esté activada. Con una clave de pruebas (`sk_test_…`), los clientes verían un pago de prueba.
6. Google Pay y Apple Pay vienen activados en Stripe. Puedes revisarlo en **Configuración → Métodos de pago**.

Sin Stripe, la reserva funciona igual con transferencia y Bizum.

**Opcional, más seguro:** configura el aviso de Stripe (webhook). Así una reserva pagada se confirma aunque el cliente cierre el móvil nada más pagar.

1. En Stripe, ve a **Desarrolladores → Webhooks → Añadir destino**.
   - **URL:** `https://lestter7th.netlify.app/api/stripe-webhook`
   - **Eventos:** `checkout.session.completed`, `checkout.session.async_payment_succeeded` y `checkout.session.expired`.
2. Copia el «Secreto de firma» (`whsec_…`) y añádelo en Netlify como `STRIPE_WEBHOOK_SECRET`.

### Paso 2 · Publicar

Extrae el ZIP y ejecuta el comando de PowerShell de siempre (`PUBLICAR-EN-LA-WEB.ps1`). Gasta 15 créditos.

### Paso 3 · Poner tus datos de cobro (panel → Coches → «Cómo te pagan la reserva»)

1. Escribe el **IBAN**, el **titular** tal como sale en el banco, el banco (opcional) y el **móvil de Bizum** (opcional).
2. Pulsa **Guardar**.

El botón de reserva aparece en la web **en cuanto hay al menos una forma de pago**: Stripe, IBAN o Bizum. Desde ahí también puedes desactivarlo cuando quieras. No hace falta volver a publicar.

### Paso 4 · Revisar las condiciones

La reserva tiene su apartado en **/condiciones#reserva**. Dice que es 100 % reembolsable, que la devolución se hace en un máximo de 14 días, que va a cuenta del precio y que no es una señal de arras. En **/privacidad** también se explica el uso de Stripe, los justificantes, la lista de espera y las fotos. Léelo y, si puedes, que lo revise tu gestor o abogado. Siguen faltando tus datos legales (nombre o razón social, NIF y registro del taller) en los textos legales. Cuando los tengas, se añaden también al comprobante PDF.

## 4. Archivos (para un programador)

| Archivo | Qué hace |
|---|---|
| `public/conversion.js` | Toda la parte del cliente, sin librerías externas: el botón y los 3 pasos de la reserva, el cambio de estado al momento, la copia rápida del IBAN, el acordeón de transferencia y Bizum, la subida del justificante, la lista de espera, el formateador de los mensajes de WhatsApp, el **generador del PDF** (propio, con el logo en vectores; no hace falta jsPDF ni cargar código de otras webs) y el presupuesto por foto (arrastrar y soltar, cámara, vista previa y reducción de la foto). |
| `public/conversion.css` | Estilos de todo lo anterior, con variables en `:root` (`--vc-acc: #D94A26`, `--vc-bg: #121212`…). Adaptado a móvil desde 360 px y respeta «reducir movimiento». |
| `public/reserva.html` | El enlace privado de cada reserva (`/r/…`): estado, terminar el pago y descargar el comprobante. |
| `netlify/functions/reservas.mts` | El servidor: empezar la reserva, apartar el coche sin que dos personas paguen a la vez, recibir justificantes, Stripe (pago y webhook con firma), lista de espera y acciones del panel. |
| `netlify/lib/reservas.mts` | Los estados y los plazos (35/60 min para pagar, 12 h para comprobar, 48 h de reserva), los avisos por email y Telegram, y los textos de los mensajes. **El importe (50 €) está en `IMPORTE`.** |
| `netlify/functions/reservas-tareas.mts` | Cada hora: libera lo caducado, avisa de las reservas de 48 h y borra las fotos que nadie llegó a enviar. |
| `netlify/functions/fotos-cliente.mts` | Recibe las fotos del daño (privadas: solo las ve el panel). |
| `netlify/lib/solicitud.mts` | La lógica común del CRM y de las citas (antes estaba dentro de `solicitudes.mts`). |
| `tools/reservas/` | La parte del panel (`reservas.js` y `reservas.css`). Después de cambiarla: `python3 tools/reservas/inyectar.py`. |

Si cambias `public/index.html`, ejecuta `python3 tools/build-en.py`. Así se copia a la versión inglesa y a /comprar, /taller y /contacto.

### Por qué Stripe Checkout y no la «Payment Request API» directamente

La Payment Request API del navegador solo recoge los datos de la tarjeta: **no cobra**. Siempre hace falta una pasarela (Stripe, Redsys…) que mueva el dinero. Con Stripe Checkout, el cliente ya tiene Google Pay y Apple Pay en un toque. Además, la web nunca toca los datos de la tarjeta (no necesitas certificación PCI) y la seguridad de la web (CSP) no tiene que abrirse a scripts de otras webs.
