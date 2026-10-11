# Pruebas del ERP (actualización 64)
`bash tools/pruebas/erp/ejecutar.sh` (Node 22+, una vez `npm i --no-save jsdom@24`).
- `tools/pruebas/erp-logica.test.cjs`: núcleo de cálculo (`public/erp-logic.js`): dinero, IGIC, banco, incentivos, avisos.
- `servidor.test.mts`: el servidor REAL `netlify/functions/erp.mts` con un almacén en memoria (`arnes/`): permisos, duplicados, bloqueos.
- `auditoria.test.mts`: 100 vueltas aleatorias (semilla distinta cada una) con invariantes (IGIC, deuda, banco 1 a 1, incentivos ≤ 15 % del excedente…).
LÍMITE: el almacén y las librerías (`shared`, `taller`, `libro`) son de mentira; no prueban Netlify Blobs real ni `/api/finanzas|ordenes|almacen` reales. Tras subir, comprobar a mano la lista del LEEME.txt.

- `navegador/`: Chrome real contra la web real (ver su LEEME.md): ocho pestañas, contabilidad, permisos, móvil y Recepción.

- `real/renum.test.mts`: numeración de formularios 01-17 (act. 72), con el código real; lo ejecuta `ejecutar-real.sh`.
