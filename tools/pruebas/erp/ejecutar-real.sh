#!/usr/bin/env bash
# Prueba el ERP con el código REAL del repositorio (finanzas, almacén, fotos, órdenes, solicitudes, sesiones y libro encadenado).
# Solo se simula el almacén de datos de Netlify (en memoria). Uso:  bash tools/pruebas/erp/ejecutar-real.sh   (desde la raíz del repositorio; Node 22+)
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../../.." && pwd)"; T="$(mktemp -d)"
cp -r "$RAIZ/netlify" "$T/netlify"; cp "$RAIZ/package.json" "$T/package.json"
mkdir -p "$T/node_modules/@netlify"; cp -r "$RAIZ/tools/pruebas/erp/real/blobs-simulado" "$T/node_modules/@netlify/blobs"; cp -r "$RAIZ/tools/pruebas/erp/real/functions-simulado" "$T/node_modules/@netlify/functions"
cp "$RAIZ/tools/pruebas/erp/real/real.test.mts" "$T/real.test.mts"; cp "$RAIZ/public/erp-logic.js" "$T/public-erp-logic.js"
cd "$T" && node --experimental-strip-types --no-warnings real.test.mts
