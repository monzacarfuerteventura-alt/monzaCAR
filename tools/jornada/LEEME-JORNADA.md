# Fichaje y jornada · cómo está hecho

Módulo de **acceso seguro (2FA)** y **registro de jornada** de ultra-baja fricción para el panel de Volcano Cars.
Sigue la misma arquitectura que el resto de la web: HTML/JS sin librerías, Netlify Functions y Netlify Blobs.

## Archivos

| Archivo | Qué hace |
|---|---|
| `netlify/lib/jornada.mts` | Lógica de fichaje: estados, cálculo de horas, deshacer, correcciones, candado (423) y enganche con el FORM-03 |
| `netlify/functions/jornada.mts` | API `/api/jornada/*` (fichar, plantilla, registro, corregir, QR, acceso) |
| `netlify/lib/seguridad.mts` | + 2FA por persona del equipo, dispositivos de confianza (cookie firmada) y horas raras |
| `netlify/functions/login.mts` | + alta de Google Authenticator del equipo, «confiar 30 días», estado de jornada en la misma respuesta |
| `netlify/lib/taller.mts` | `guardarOrden` pasa aquí (lo usan el taller y el fichaje) |
| `taller`, `almacen`, `caja`, `ordenes`, `fotos` | Una línea: `exigirJornada(q)` → 423 si el equipo no está trabajando |
| `tools/jornada/jornada.js` + `.css` | Pantalla de fichaje, chip de la barra, login 2FA, pestaña «Jornada» del gerente, Excel .xlsx y PDF |
| `tools/jornada/inyectar.py` | Copia el módulo en `public/admin.html` (ejecútalo tras cambiar algo) |

## Modelo de datos (Netlify Blobs)

No hay base de datos SQL: cada «tabla» es un prefijo de claves JSON.

**Users** — `taller/equipo` (ya existía): `{ id, nombre, usuario, rol, jornada (h/día), activo, alta, caja, pin: { s, h } }`.
El PIN se guarda con PBKDF2-SHA256, 120.000 iteraciones y sal por persona (mismo nivel de coste que bcrypt).

**TwoFactorAuth** — tienda `seguridad`:
- `totp-eq/<uid>` → `{ secreto (base32), recuperacion: [sha256 de los 8 códigos], desde }`
- `totp-eq/<uid>-pend` → secreto del QR que se está vinculando (caduca a los 20 min)
- `totp-eq/<uid>-ult` → último paso TOTP usado (un código no vale dos veces)
- `config/totp` → la del gerente (ya existía)
- `confianza/<id>` → dispositivo de confianza `{ uid, nombre, disp, ip recortada, t, exp }`. La cookie `vc_dev` (HttpOnly, Secure, SameSite=Strict, Path=/api/login, 30 días) lleva `d1.uid.exp.id.firmaHMAC` y solo vale si el registro sigue existiendo, así que el gerente puede revocarla.
- `config/2fa-equipo` → «1» obligatoria (por defecto) / «0» desactivada

**TimeLogs** — tienda `jornada`:
- `dia/AAAA-MM/<uid>/DD` → `{ uid, fecha, eventos: [{ n, tipo: entrada|pausa|reanudar|salida|anulacion, t (hora efectiva), reg (hora de registro en el servidor), via: boton|qr|nfc|correccion, por, nombre, ip recortada, h (huella de IP), disp, motivo?, anula? }], incidencias }`
- `estado/<uid>` → `{ estado: fuera|trabajando|pausa, fecha (día abierto), desde, entrada, n }`: una lectura para el candado
- `auto/<uid>` → orden de taller que el fichaje pausó sola
- `config/qr` → código del cartel QR/NFC

**AuditLogs**:
- `jornada/log/*` → libro encadenado SHA-256 (cada apunte lleva la huella del anterior): fichajes, deshacer y correcciones. `GET /api/jornada/libro` comprueba la cadena.
- `seguridad/log/*` (ya existía, 30 días): entradas, fallos de PIN/contraseña/2FA, bloqueos, **horas poco habituales** (antes de las 6:00 o después de las 22:00), códigos de recuperación usados y QR falsos.

Nada se borra: un error del trabajador se **deshace** (anulación con motivo, 2 minutos) y el gerente **corrige** añadiendo o anulando fichajes con motivo. El original sigue ahí.

## Reglas

- **Hora**: siempre `new Date()` del servidor. El móvil solo manda «qué» (entrada, pausa…), nunca «cuándo».
- **Transiciones válidas**: fuera → entrada; trabajando → pausa o salida; pausa → reanudar o salida. Una doble pulsación devuelve 409 sin duplicar.
- **Salida olvidada**: si una jornada de un día anterior lleva más de 16 h abierta, al volver a fichar queda como incidencia «Sin salida registrada» (no se inventa ninguna hora) y el gerente la corrige. Un turno que pasa de la medianoche no se corta.
- **Horas extra**: lo trabajado por encima de la jornada diaria de cada persona (Taller → Equipo y ajustes). Pausas no cuentan como trabajo.
- **Candado**: con estado distinto de «trabajando», las API del equipo (taller, órdenes, inventario, caja y fotos) contestan 423 y el panel abre la pantalla de fichaje. El gerente con contraseña no ficha.
- **FORM-03**: pausa de jornada → el trabajo en marcha se pausa con «Comida / descanso»; salida → «Fin de jornada». Al reanudar o fichar la entrada, se reanuda solo ese trabajo (si nadie lo ha tocado a mano).

## Por qué el fichaje tarda menos de 2 segundos

1. **Cero pantallas intermedias.** El login del equipo ya devuelve el estado de jornada: si no ha fichado, sale directamente el botón; si ya estaba trabajando (cerró el navegador y volvió), entra directo al taller.
2. **Un solo botón que decide por el trabajador.** Entrada, pausa, reanudar o salida según el estado. Después de las 15:30, o con la jornada cumplida, «Salida» pasa a ser el botón grande.
3. **Botón gigante** (media pantalla en el móvil, `touch-action: manipulation`: sin espera de doble toque), pensado para usarlo con guantes o con las manos sucias.
4. **Una petición = un fichaje.** El servidor contesta en cuanto guarda el día y el estado; el libro y el FORM-03 se escriben en paralelo.
5. **Sin «Aceptar».** Aviso de 2 segundos con la hora y «Deshacer» en lugar de un «¿Seguro?».
6. **Precarga.** Al abrir la pantalla estando trabajando, se piden en segundo plano las herramientas a su nombre, así la salida no espera.
7. **QR / NFC del taller.** Escanear = fichar entrada o vuelta de la pausa sin tocar nada más. En el móvil de confianza solo pide el PIN si la sesión se cerró.
8. **2FA sin castigo diario.** Google Authenticator solo la primera vez en cada dispositivo y después 30 días de confianza (cookie HttpOnly firmada). Una tablet compartida recuerda hasta 8 personas.
9. **Un toque desde cualquier pantalla.** El chip de la barra superior (punto verde con las horas del día) abre el botón de pausa o salida.

## Ley

Registro diario con inicio y fin de cada jornada (art. 34.9 ET), conservado 4 años y a disposición del trabajador, de sus representantes y de la Inspección de Trabajo. El Real Decreto de registro digital todavía está en proyecto (septiembre de 2026). El módulo ya cumple los requisitos que se esperan de él: registro digital, inalterable, con trazabilidad de cada cambio, identificación del trabajador y exportación. Sin biometría y sin geolocalización: el QR del taller demuestra presencia sin seguir al trabajador.
