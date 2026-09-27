# Pruebas de principio a fin

Necesitan **bun** y un `node_modules/@netlify/blobs` de pruebas (almacén en memoria). No tocan los datos reales.

1. `bun tools/pruebas/e2e-permisos.mjs` → recorre las funciones reales con Gerente (contraseña), Lestter (Gerente con PIN),
   Calidad, Recepción y Mecánico: fichar, nueva recepción FORM-01/02, órdenes, CRM, Agenda, Coches, Inventario, Finanzas, Seguridad.
2. `bun tools/pruebas/servidor-local.mjs` y, en otra ventana, `python3 tools/pruebas/e2e-panel.py` → lo mismo pero pulsando
   los botones del panel en Chromium (escritorio y móvil).
