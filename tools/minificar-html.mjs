// MINIFICADO AL PUBLICAR (Netlify ejecuta esto después de tools/fuentes-locales.mjs).
// En el repositorio el código sigue legible; aquí se minifica SOLO la copia que se publica:
//   · los JavaScript y CSS sueltos de public/ (conversion.js, mejoras.js, taller-vfx.js…)
//   · los <script> y <style> en línea de las páginas públicas (portada, /en, /comprar, /taller, SEO, legales)
// Si esbuild no está o algo falla, NO se toca ese archivo y la publicación sigue (siempre sale con código 0).
import fs from "node:fs"; import path from "node:path";
const PUB = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "public");
let esbuild; try { esbuild = await import("esbuild"); } catch (e) { console.log("minificar: sin esbuild, se publica sin minificar"); process.exit(0); }
const SALTAR = new Set(["admin.html", "reserva.html", "seguimiento.html", "404.html"]);       // panel y páginas privadas: no se tocan
const JS_SUELTOS = ["conversion.js", "mejoras.js", "taller-vfx.js", "script-ia.js", "taller-ui.js", "piloto-web.js", "precios-taller.js", "medicion.js", "origen.js", "rendimiento.js"];
const CSS_SUELTOS = ["conversion.css", "mejoras.css", "taller-vfx.css", "precios-taller.css", "rendimiento.css", "paginas.css", "tema.css", "taller.css"];
let antes = 0, despues = 0, ok = 0, mal = 0;
const min = async (code, loader) => { const r = await esbuild.transform(code, { loader, minify: true, legalComments: "none", target: "es2020" }); return r.code.trim(); };
async function suelto(f, loader) {
  const p = path.join(PUB, f); if (!fs.existsSync(p)) return;
  try { const t = fs.readFileSync(p, "utf8"); const m = await min(t, loader); antes += t.length; despues += m.length; fs.writeFileSync(p, m + "\n"); ok++; }
  catch (e) { mal++; console.log("minificar: se deja sin tocar", f, String(e.message).split("\n")[0]); }
}
for (const f of JS_SUELTOS) await suelto(f, "js");
for (const f of CSS_SUELTOS) await suelto(f, "css");
function* htmls(dir) { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name);
  if (e.isDirectory()) { if (!["fonts", "coches", "marca", "ig", "ayuda", "vfx", "node_modules"].includes(e.name)) yield* htmls(p); }
  else if (e.name.endsWith(".html") && !SALTAR.has(e.name)) yield p; } }
for (const p of htmls(PUB)) {
  try {
    let t = fs.readFileSync(p, "utf8"); const o = t.length; const trozos = [];
    t.replace(/<(script|style)([^>]*)>([\s\S]*?)<\/\1>/gi, (m, tag, attrs, cuerpo, pos) => { trozos.push({ m, tag: tag.toLowerCase(), attrs, cuerpo }); return m; });
    for (const z of trozos) {
      if (!z.cuerpo.trim()) continue;
      if (z.tag === "script" && /type\s*=\s*["']?(application\/ld\+json|application\/json|text\/template|importmap)/i.test(z.attrs)) continue;
      if (z.tag === "script" && /src\s*=/.test(z.attrs)) continue;
      const nuevo = `<${z.tag}${z.attrs}>${await min(z.cuerpo, z.tag === "script" ? "js" : "css")}</${z.tag}>`;
      t = t.replace(z.m, () => nuevo);
    }
    antes += o; despues += t.length; fs.writeFileSync(p, t); ok++;
  } catch (e) { mal++; console.log("minificar: se deja sin tocar", path.relative(PUB, p), String(e.message).split("\n")[0]); }
}
console.log(`minificar: ${ok} archivos minificados, ${mal} sin tocar, ${(antes / 1024).toFixed(0)} KB -> ${(despues / 1024).toFixed(0)} KB`);
process.exit(0);
