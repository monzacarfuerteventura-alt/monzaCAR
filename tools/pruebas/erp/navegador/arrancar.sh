#!/usr/bin/env bash
# Arranca la web real con el almacén simulado, para las pruebas con navegador. Desde la raíz del repositorio:  bash tools/pruebas/erp/navegador/arrancar.sh
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../../../.." && pwd)"; T="$(mktemp -d)"
cp -r "$RAIZ/netlify" "$T/netlify"; cp "$RAIZ/package.json" "$T/package.json"
mkdir -p "$T/node_modules/@netlify"; cp -r "$RAIZ/tools/pruebas/erp/real/blobs-simulado" "$T/node_modules/@netlify/blobs"; cp -r "$RAIZ/tools/pruebas/erp/real/functions-simulado" "$T/node_modules/@netlify/functions"
cp "$RAIZ/tools/pruebas/erp/navegador/router.mts" "$T/router.mts"
cd "$T" && PUB="$RAIZ/public" PORT="${PORT:-8097}" node --experimental-strip-types --no-warnings router.mts
