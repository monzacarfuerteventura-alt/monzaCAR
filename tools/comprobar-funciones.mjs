// =====================================================================
// COMPROBACIÓN ANTES DE PUBLICAR (actualización 73)
// Netlify lee cada función con un analizador estricto (@babel/parser, con «typescript» y «module») para saber en qué
// dirección publicarla (export const config = { path }). Si ese analizador no puede leer el archivo, NO AVISA: la función
// se sube igual, pero SIN dirección, y la web contesta 404.
// Así se cayó /api/finanzas en la actualización 70: el nombre «Config» se importaba dos veces (de @netlify/functions y,
// como «type», de lib/taller.mts) y con ella Finanzas, Contabilidad, Banco, Gestoría, Incentivos y Margen.
// Las pruebas locales no lo ven, porque al ejecutar se quitan los tipos.
//
// Este script lee cada función CON EL MISMO ANALIZADOR Y LAS MISMAS OPCIONES que Netlify y, si alguna no se puede leer,
// PARA la publicación (Netlify deja en línea la versión anterior, que funciona). Si el analizador no estuviera instalado,
// hace una comprobación más sencilla: que ningún archivo importe dos veces el mismo nombre.
// Uso: node tools/comprobar-funciones.mjs     (lo ejecuta netlify.toml antes de publicar)
// =====================================================================
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIR = join(RAIZ, "netlify", "functions");

let parse = null;
try { parse = createRequire(join(RAIZ, "package.json"))("@babel/parser").parse; } catch { /* sin analizador: se usa la comprobación sencilla */ }

// Comprobación sencilla (reserva): nombres importados dos veces. Solo mira los «import» que empiezan en la columna 0.
function importadosDosVeces(src) {
  const vistos = new Map(), repes = [];
  const anotar = (nombre, de) => { if (!nombre) return; if (vistos.has(nombre)) repes.push(`el nombre «${nombre}» se importa dos veces (de "${vistos.get(nombre)}" y de "${de}"). Renombra uno con «as».`); else vistos.set(nombre, de); };
  for (const m of src.matchAll(/^import\s+(?:type\s+)?([^;"']+?)\s+from\s+["']([^"']+)["']/gm)) {
    const clausula = m[1], de = m[2], llaves = /\{([\s\S]*)\}/.exec(clausula);
    for (const parte of clausula.replace(/\{[\s\S]*\}/, "").split(",").map((x) => x.trim()).filter(Boolean)) anotar(parte.replace(/^\*\s+as\s+/, "").trim(), de);
    if (llaves) for (const parte of llaves[1].split(",").map((x) => x.trim()).filter(Boolean)) { const sinType = parte.replace(/^type\s+/, ""); anotar((sinType.split(/\s+as\s+/)[1] || sinType).trim(), de); }
  }
  return repes;
}

const errores = [], avisos = [];
let n = 0;
for (const f of readdirSync(DIR).filter((x) => /\.(mts|cts|ts|mjs|cjs|js)$/.test(x)).sort()) {
  n++;
  const src = readFileSync(join(DIR, f), "utf8");
  if (parse) {
    try { parse(src, { plugins: ["typescript"], sourceType: "module", tokens: false, ranges: false, attachComment: false }); }
    catch (e) {
      const donde = e && e.loc ? ` (línea ${e.loc.line})` : "", msg = String((e && e.message) || e).replace(/\s*\(\d+:\d+\)\s*$/, "");
      const pista = /has already been declared/.test(msg) ? " → ese nombre está dos veces en el archivo (por ejemplo importado de dos sitios): renombra uno con «as»." : "";
      errores.push(`${f}${donde}: ${msg}${pista}`);
    }
  } else for (const r of importadosDosVeces(src)) errores.push(`${f}: ${r}`);
  if (!/^export\s+default\b/m.test(src)) avisos.push(`${f}: no tiene «export default» (¿es una función?).`);
  if (!/^export\s+const\s+config\b/m.test(src)) avisos.push(`${f}: no tiene «export const config» (sin dirección ni horario).`);
}
for (const a of avisos) console.warn("AVISO · " + a);
if (errores.length) {
  console.error("\n✘ NO SE PUBLICA: Netlify publicaría estas funciones SIN dirección (darían 404):\n  - " + errores.join("\n  - ") + "\n");
  process.exit(1);
}
console.log(`✓ ${n} funciones comprobadas${parse ? " con el analizador de Netlify" : " (comprobación sencilla: falta @babel/parser)"}: todas se pueden publicar con su dirección.`);
