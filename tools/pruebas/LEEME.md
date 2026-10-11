# Pruebas de principio a fin

Necesitan **bun** y un `node_modules/@netlify/blobs` de pruebas (almacén en memoria). No tocan los datos reales.

1. `bun tools/pruebas/e2e-permisos.mjs` → recorre las funciones reales con Gerente (contraseña), Lestter (Gerente con PIN),
   Calidad, Recepción y Mecánico: fichar, nueva recepción FORM-01/02, órdenes, CRM, Agenda, Coches, Inventario, Finanzas, Seguridad.
2. `bun tools/pruebas/servidor-local.mjs` y, en otra ventana, `python3 tools/pruebas/e2e-panel.py` → lo mismo pero pulsando
   los botones del panel en Chromium (escritorio y móvil).
3. `bun tools/pruebas/e2e-presencia.mjs` → antitrampa del fichaje (actualización 44): fichar desde casa, sin GPS, con «NFC» inventado, GPS impreciso,
   coordenadas repetidas, mismo móvil, WiFi del taller, desactivar/activar y lo que ve el gerente.
4. Con `bun tools/pruebas/servidor-local.mjs` **recién arrancado** (datos limpios), `python3 tools/pruebas/e2e-presencia-panel.py` → lo mismo pulsando
   en el panel (Chromium móvil con GPS simulado: en casa, sin permiso y en la nave).
5. Con `bun tools/pruebas/servidor-local.mjs` recién arrancado, `python3 tools/pruebas/e2e-presupuesto-ficha.py` → actualización 61: la hoja de presupuesto FORM-15 se rellena en la ficha (traer de la inspección, totales, borrador oculto al cliente, envío, bloqueo al aceptar), escritorio y móvil.
7. Actualización 63: `python3 tools/pruebas/e2e-panel-63.py`, `auditoria-publica.py` (404/errores de la web pública) y `ITER=100 python3 tools/pruebas/auditoria-rellenar-panel.py` (100 vueltas rellenando fichas).
6. `bun tools/pruebas/e2e-resultado-taller.mjs` y (con servidor local) `python3 tools/pruebas/e2e-resultado-panel.py` → actualización 62: resultado por coche (sin IGIC, piezas, mano de obra por trabajador, beneficio), interruptor, gastos fijos, pérdidas de hoy, permisos y diálogo «cómo pagó» al emitir la factura.
8. Actualización 65: con `bun tools/pruebas/servidor-local.mjs` recién arrancado, `python3 tools/pruebas/e2e-manuales-65.py` → botones «Manual Sxx» en las pantallas, Hoja v3.2 solo con sesión, validez de presupuesto 12 días hábiles.
9. Actualización 66: con `bun tools/pruebas/servidor-local.mjs` recién arrancado, `python3 tools/pruebas/e2e-portales-66.py` → kit «Publicar en portales» (32 comprobaciones).


## ERP (actualización 70)
`bash tools/pruebas/erp/ejecutar.sh` (núcleo, servidor y 100 auditorías), `bash tools/pruebas/erp/ejecutar-real.sh` (con el código real del repositorio) y `tools/pruebas/erp/navegador/` (Chrome real). Detalle en `tools/pruebas/erp/LEEME.md`.
