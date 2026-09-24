# Asistente con IA de Volcano Cars · Guía de integración

El asistente de siempre (el botón rojo del chat) ahora responde con inteligencia artificial a lo que el cliente **escribe**, consultando el **stock real**, las **horas libres reales** del taller y la **financiación**. Los atajos de siempre (Horario, Financiación, Garantía, Ver un coche…) siguen igual y responden al momento sin gastar IA.

La IA no reserva ni guarda nada por su cuenta. Prepara la cita en el formulario que ya existe y el cliente la revisa, marca la casilla de privacidad y confirma él. Los datos de contacto solo se guardan si el cliente los escribe y da su consentimiento en la tarjeta del chat.

Si la IA no está configurada o falla, contesta el asistente de siempre. **Nada deja de funcionar.**

---

## 1. Qué archivos hay y qué hace cada uno

| Archivo | Qué es | Qué hace |
|---|---|---|
| `netlify/functions/asistente.mts` | Backend (el «app.js») | Recibe la conversación, llama a Groq y ejecuta las herramientas (buscar coches, horas libres, preparar cita, cuota orientativa, pedir contacto). La clave de Groq **solo vive aquí**, nunca en el navegador. |
| `public/script-ia.js` | JavaScript del chat | Se engancha al asistente existente (`window.VC_BOT`). Pinta respuestas, tarjetas de coches, rellena el formulario del taller o la ficha del coche y muestra la tarjeta «te llamamos». |
| `netlify/functions/inventario.mts` | `/inventario.json` en vivo | El stock público en un formato estable, siempre al día con el panel. No hay que mantener ningún archivo a mano. |
| `tools/asistente/inventario.ejemplo.json` | Ejemplo del formato | Para ver la estructura del inventario (el real sale de `/inventario.json`). |
| `netlify/lib/notificar.mts` | Avisos gratis | Cada cliente nuevo (de cualquier formulario **y** del chat) llega a Telegram y se apunta en Google Sheets, además del email de siempre. |
| `tools/asistente/google-script.js` | Apps Script | Script para pegar en tu hoja de Google: guarda una fila por cliente. |
| `public/index.html` | Web (2 cambios pequeños) | Expone `window.VC_BOT` para el script de IA y carga `<script src="/script-ia.js" defer>`. El inglés y /comprar, /taller, /contacto se regeneran solos con `python3 tools/build-en.py`. |
| `public/privacidad.html` | Política de privacidad | Nuevo apartado «Asistente con inteligencia artificial» (Groq, Telegram, Google Sheets). |

### Cómo va una conversación

```
Cliente escribe ─► script-ia.js ─► /api/asistente (Netlify) ─► Groq (Llama 3.3 70B)
                                        │  ▲
                        herramientas ◄──┘  └── datos reales: coches del panel,
                        (en tu servidor)       /api/citas, financiación
                                        │
Respuesta + tarjetas de coches + «acciones» ◄──┘
   · cita_taller → rellena el formulario del taller (el cliente confirma)
   · visita      → abre la ficha del coche con la hora marcada
   · contacto    → tarjeta nombre + teléfono + casilla → /api/solicitudes (CRM)
                   → email + Telegram + Google Sheets + botón WhatsApp con resumen
```

---

## 2. Ponerlo en marcha (unos 20 minutos, una sola vez)

Todo se configura en **Netlify → tu proyecto → Project configuration → Environment variables → Add a variable**. En cada una: marca **Contains secret values**, elige **Same value for all deploy contexts** (o pon el valor en **Production**) y pulsa **Create variable**.

### 2.1 La IA (obligatorio para que haya IA)

1. Entra en **https://console.groq.com** con tu cuenta de Google o tu email. No pide tarjeta.
2. Menú **API Keys** → **Create API Key** → ponle de nombre «Volcano Cars» → copia la clave (empieza por `gsk_`). Solo se ve una vez.
3. En Netlify crea la variable **`GROQ_API_KEY`** con esa clave.

Opcionales:
- `GROQ_MODEL`: el modelo principal. Por defecto es `llama-3.3-70b-versatile`.
- `IA_LIMITE_DIA`: llamadas a Groq al día antes de pasar al modelo pequeño (`llama-3.1-8b-instant`). Por defecto son 800.

### 2.2 Avisos por Telegram (opcional, gratis)

1. En Telegram abre **@BotFather** → `/newbot` → dale un nombre, por ejemplo «Avisos Volcano Cars» → copia el **token**.
2. Abre tu bot nuevo y mándale cualquier mensaje, por ejemplo «hola».
3. En el navegador abre `https://api.telegram.org/bot<TOKEN>/getUpdates`, poniendo tu token. Busca `"chat":{"id":` y copia ese número. Si es un grupo, empieza por `-100…`.
4. En Netlify crea **`TELEGRAM_BOT_TOKEN`** (el token) y **`TELEGRAM_CHAT_ID`** (el número).

Cada cliente te llegará con sus datos y dos botones: **WhatsApp al cliente** y **Abrir el CRM**.

### 2.3 Google Sheets (opcional, gratis)

Sigue las instrucciones de la cabecera de `tools/asistente/google-script.js`. En resumen:
1. Crea una hoja y abre **Extensiones → Apps Script**.
2. Pega el script y cambia la `CLAVE`.
3. Pulsa **Implementar → Aplicación web** (Ejecutar como: Yo · Acceso: Cualquier usuario).
4. En Netlify crea **`SHEETS_WEBHOOK_URL`** (la URL `/exec`) y **`SHEETS_SECRET`** (la misma clave).

### 2.4 Publicar

- Si ya tenías las variables antes de publicar el paquete, publica como siempre con el comando de PowerShell.
- Si añades o cambias variables **después**, ve a **Deploys → Trigger deploy → Deploy project**. Las variables solo se aplican al publicar.

### 2.5 Comprobar que funciona (2 minutos)

1. Abre la web, pulsa el botón del chat y escribe: **«busco un coche de menos de 3.000 € con etiqueta C»** → debe salir la tarjeta del coche con su precio exacto.
2. Escribe **«cita para cambiar el aceite»** → pulsa **Revisar y confirmar la cita** → se abre el taller con el servicio y la hora marcados. **No confirmes** si es una prueba.
3. Escribe **«que me llamen»** → rellena la tarjeta con tus datos → debe llegarte el email (y el Telegram y la fila de Sheets si los configuraste). Luego borra esa solicitud en el CRM.
4. Abre `https://TU-WEB/inventario.json` → debe salir tu stock.

---

## 3. Coste y límites (0 € al mes)

- **Groq, plan gratis:** el modelo grande permite unas 1.000 peticiones al día y 30 por minuto; el pequeño, unas 14.400 al día. Cada pregunta del cliente usa entre 1 y 3 peticiones. Al llegar a `IA_LIMITE_DIA` el asistente pasa solo al modelo pequeño; si Groq no responde, contesta el asistente de siempre. Los límites los fija Groq y pueden cambiar: consúltalos en console.groq.com → Settings → Limits.
- **Telegram y Google Apps Script:** gratis.
- **Netlify:** cada pregunta es una llamada a una función, que gasta una pequeña parte de los créditos del plan (igual que cualquier formulario). Publicar sigue costando 15 créditos cada vez.
- **Protecciones incluidas:** máximo 20 preguntas por minuto y conexión, mensajes de hasta 600 caracteres, historial de 14 mensajes y un tiempo máximo de 9 segundos por respuesta.

---

## 4. Seguridad y privacidad

- La clave de Groq está solo en Netlify. El navegador nunca la ve.
- La IA solo puede **leer** datos públicos (el stock, las horas libres y las condiciones de financiación). No puede ver clientes, el CRM, la caja ni nada del panel.
- La conversación se guarda solo en la pestaña del cliente (`sessionStorage`). En tu servidor no queda.
- Los datos de contacto solo se guardan con la casilla de privacidad marcada, igual que en los formularios, y van al mismo CRM.
- El saludo avisa de que es una IA y de que puede equivocarse. Es la transparencia que exige el Reglamento europeo de IA para los chatbots.
- La política de privacidad ya menciona a Groq (EE. UU.), Telegram y Google Sheets. **Recomendado:** acepta el acuerdo de tratamiento de datos (DPA) de Groq desde tu cuenta, si lo ofrece, y revisa ese apartado con tu asesoría junto con los datos del titular que faltan en los textos legales.

---

## 5. Personalizar

- **Lo que sabe y cómo habla:** función `instrucciones()` en `netlify/functions/asistente.mts`. Los datos del negocio salen de `netlify/lib/paginas.mts` (EMPRESA) y de la financiación del panel.
- **Nuevas herramientas:** añádelas a `TOOLS` (definición) y a `ejecutar()` (lo que hacen), en el mismo archivo.
- **Textos y botones del chat:** `public/script-ia.js`. Los atajos de siempre están en `public/index.html` (`const R = {…}` dentro de `BOT`).
- **Apagar la IA:** borra la variable `GROQ_API_KEY` en Netlify y pulsa Trigger deploy. Vuelve el asistente de siempre.

---

## 6. Si algo no va

| Síntoma | Causa probable | Solución |
|---|---|---|
| El chat responde como antes, con las respuestas fijas | Falta `GROQ_API_KEY` o no se ha vuelto a publicar | Añade la variable y pulsa Trigger deploy. En una pestaña nueva, prueba otra vez. |
| La IA contesta «Perdona, ahora no he podido responder» | Se ha superado el límite de Groq o Groq está lento | Espera unos minutos. Mira el uso en console.groq.com. |
| No llegan los Telegram | Token o chat mal copiados, o no le has escrito al bot | Repite el paso 2.2. El chat_id de un grupo empieza por `-100`. |
| No se apuntan filas en Sheets | La URL no es la `/exec`, la clave no coincide o la implementación no es «Cualquier usuario» | Revisa el paso 2.3. En Apps Script → Ejecuciones verás si llegan las llamadas. |
| «Revisar y confirmar la cita» no rellena el formulario | La web principal cambió los identificadores del formulario (`#t-car`, `#sv-…`, `AG_T`…) | Mantén esos identificadores o actualiza `aplicarCitaTaller()` en `script-ia.js`. |
