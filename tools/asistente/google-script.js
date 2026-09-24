/**
 * VOLCANO CARS · Registro automático de clientes en Google Sheets (gratis)
 * ------------------------------------------------------------------------
 * Cada solicitud de la web (formularios de taller, coches, financiación y
 * la tarjeta «que me llamen» del asistente con IA) añade una fila a tu hoja.
 *
 * INSTALACIÓN (5 minutos, una sola vez):
 *  1. Crea una hoja nueva en https://sheets.new  (ponle nombre, p. ej. «Clientes Volcano Cars»).
 *  2. Menú Extensiones → Apps Script. Borra lo que haya y pega TODO este archivo.
 *  3. Cambia CLAVE (abajo) por una frase larga inventada, p. ej. «volcano-7Kq2-lava-9xT».
 *  4. Guarda (icono del disquete). Pulsa Implementar → Nueva implementación →
 *     tipo «Aplicación web» · Ejecutar como: «Yo» · Quién tiene acceso: «Cualquier usuario».
 *     Pulsa Implementar y autoriza con tu cuenta de Google.
 *  5. Copia la «URL de la aplicación web» (termina en /exec).
 *  6. En Netlify → Project configuration → Environment variables añade:
 *       SHEETS_WEBHOOK_URL = la URL /exec
 *       SHEETS_SECRET      = la misma CLAVE del paso 3
 *     y vuelve a publicar la web (Deploys → Trigger deploy).
 *  7. Prueba: en Apps Script elige la función «prueba» y pulsa Ejecutar → sale una fila de ejemplo.
 *
 * Si cambias este código, vuelve a Implementar → Gestionar implementaciones → editar → Versión nueva
 * (así la URL /exec no cambia).
 */

const CLAVE = "CAMBIA-ESTA-CLAVE";        // ← la misma que SHEETS_SECRET en Netlify
const HOJA = "Clientes";                   // pestaña donde se apuntan (se crea sola)
const COLUMNAS = [
  ["fecha", "Fecha"], ["tipo", "Tipo"], ["nombre", "Nombre"], ["telefono", "Teléfono"], ["email", "Email"],
  ["cita", "Cita"], ["coche", "Coche"], ["servicios", "Servicios"], ["mensaje", "Mensaje"],
  ["canal", "Viene de"], ["campana", "Campaña"], ["pagina", "Página de entrada"], ["idioma", "Idioma"],
  ["whatsapp", "WhatsApp"], ["id", "ID en el panel"],
];

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (!CLAVE || CLAVE === "CAMBIA-ESTA-CLAVE" || d.clave !== CLAVE) return salida_({ ok: false, error: "clave" });
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);                    // dos clientes a la vez no se pisan la fila
    try {
      const hoja = hoja_();
      if (d.id && yaExiste_(hoja, d.id)) return salida_({ ok: true, repetido: true });
      const fila = COLUMNAS.map(([k]) => {
        let v = d[k] == null ? "" : String(d[k]).slice(0, 2000);
        if (k === "fecha" && v) v = new Date(v);
        if (/^[=+\-@]/.test(v)) v = "'" + v;  // evita que un texto se ejecute como fórmula
        return v;
      });
      hoja.appendRow(fila);
      const n = hoja.getLastRow();
      hoja.getRange(n, 1).setNumberFormat("dd/mm/yyyy hh:mm");
      const wa = COLUMNAS.findIndex(([k]) => k === "whatsapp") + 1;
      if (d.whatsapp) hoja.getRange(n, wa).setFormula('=HYPERLINK("' + String(d.whatsapp).replace(/"/g, "") + '";"Abrir WhatsApp")');
    } finally {
      lock.releaseLock();
    }
    return salida_({ ok: true });
  } catch (err) {
    return salida_({ ok: false, error: String(err) });
  }
}

// Abrir la URL /exec en el navegador solo dice si está activo (no enseña datos).
function doGet() { return salida_({ ok: true, servicio: "Volcano Cars · registro de clientes" }); }

function hoja_() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let h = libro.getSheetByName(HOJA);
  if (!h) {
    h = libro.insertSheet(HOJA);
    h.appendRow(COLUMNAS.map(([, t]) => t));
    h.getRange(1, 1, 1, COLUMNAS.length).setFontWeight("bold").setBackground("#1B1B1A").setFontColor("#F2EFEA");
    h.setFrozenRows(1);
    h.setColumnWidths(1, COLUMNAS.length, 150);
    h.setColumnWidth(COLUMNAS.findIndex(([k]) => k === "mensaje") + 1, 360);
  }
  return h;
}

function yaExiste_(hoja, id) {
  const col = COLUMNAS.findIndex(([k]) => k === "id") + 1;
  const n = hoja.getLastRow();
  if (n < 2) return false;
  const desde = Math.max(2, n - 200);        // mira las últimas 200 filas (reintentos)
  return hoja.getRange(desde, col, n - desde + 1, 1).getValues().some((r) => r[0] === id);
}

function salida_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Ejecútala desde el editor para ver una fila de ejemplo.
function prueba() {
  const r = doPost({ postData: { contents: JSON.stringify({
    clave: CLAVE, id: "prueba-" + Date.now(), fecha: new Date().toISOString(), tipo: "Consulta", nombre: "Cliente de prueba",
    telefono: "600 000 000", mensaje: "[Asistente IA] Busca un coche de menos de 3.000 € con etiqueta C", canal: "Directo",
    idioma: "es", whatsapp: "https://wa.me/34600000000",
  }) } });
  Logger.log(r.getContent());
}
