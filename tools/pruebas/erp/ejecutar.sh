#!/usr/bin/env bash
# Pruebas del ERP (actualización 64). Uso:  bash tools/pruebas/erp/ejecutar.sh   (desde la raíz del repositorio)
# Necesita Node 22+ y una vez:  npm i --no-save jsdom@24
# Copia el servidor REAL (netlify/functions/erp.mts) a una carpeta temporal con un almacén de mentira en memoria y lo prueba.
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../../.." && pwd)"; T="$(mktemp -d)"
mkdir -p "$T/netlify/functions" "$T/netlify/lib" "$T/tools/pruebas/erp"
cp "$RAIZ/netlify/functions/erp.mts" "$T/netlify/functions/"; cp "$RAIZ"/tools/pruebas/erp/arnes/netlify/lib/*.mts "$T/netlify/lib/"; cp "$RAIZ/netlify/lib/plan-contable.mts" "$T/netlify/lib/"
cp -r "$RAIZ/tools/pruebas/erp/"*.mts "$RAIZ/tools/pruebas/erp/arnes" "$T/tools/pruebas/erp/"; cp "$T/tools/pruebas/erp/arnes/arrancar.mts" "$T/tools/pruebas/erp/arrancar.mts"
cp -r "$RAIZ/public" "$T/public"; mkdir -p "$T/tools/pruebas"; cp "$RAIZ/tools/pruebas/erp-logica.test.cjs" "$T/tools/pruebas/"
ln -s "$RAIZ/node_modules" "$T/node_modules" 2>/dev/null || true
cd "$T/tools/pruebas/erp"
sed -i 's#"./netlify/functions/erp.mts"#"../../../netlify/functions/erp.mts"#; s#"./netlify/lib/shared.mts"#"../../../netlify/lib/shared.mts"#' arrancar.mts
sed -i 's#./arnes/arrancar.mts#./arrancar.mts#' servidor.test.mts auditoria.test.mts
node "$T/tools/pruebas/erp-logica.test.cjs"
node --experimental-strip-types --no-warnings servidor.test.mts
VUELTAS="${VUELTAS:-100}" node --experimental-strip-types --no-warnings auditoria.test.mts
