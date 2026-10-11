# Pruebas con navegador real del ERP (actualización 70)
Arrancan la web REAL (todas las funciones de `netlify/functions`, con el almacén de datos simulado en memoria) y la recorren con Chrome:
1. `bash tools/pruebas/erp/navegador/arrancar.sh` (deja el servidor en http://localhost:8097; con `PORT=...` se cambia).
2. `node sembrar.mjs && node sembrar-clientes.mjs` (datos de ejemplo: proveedores, pedidos, facturas, banco, asientos, permisos, clientes).
3. `node e2e-panel.mjs` (gerente: las 8 pestañas, contabilidad, asiento manual, permisos, Clientes 360, documentos y móvil) y `node e2e-recepcion.mjs` (una persona de Recepción real con 2FA y jornada fichada: solo ve lo que el gerente le abre).
Necesitan una vez: `npm i puppeteer-core @sparticuz/chromium` (en esta carpeta). Las capturas salen en `capturas/`. Los datos son de ejemplo, NO los reales.
