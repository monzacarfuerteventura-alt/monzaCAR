// Descarga las fuentes de Google (Archivo, Figtree, Titillium Web) a public/fonts y escribe public/fonts/fuentes.css
// para que la web las sirva desde volcanocars.com: así el navegador del visitante no envía su IP a Google.
// Se ejecuta en cada publicación de Netlify (netlify.toml → [build] command). Si algo falla, deja el respaldo y no rompe nada.
import fs from "node:fs"; import path from "node:path"; import crypto from "node:crypto";
const CSS_URL = "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=Figtree:wght@400;500;600;700&family=Titillium+Web:wght@600;700&display=swap";
const DIR = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "public", "fonts");
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
try {
  const css = await (await fetch(CSS_URL, { headers: { "user-agent": UA } })).text();
  const urls = [...new Set([...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/g)].map((m) => m[1]))];
  if (!urls.length) throw new Error("sin fuentes en la respuesta");
  let out = css;
  for (const u of urls) {
    const buf = Buffer.from(await (await fetch(u)).arrayBuffer());
    if (buf.length < 1000) throw new Error("fuente vacía " + u);
    const nombre = crypto.createHash("sha1").update(u).digest("hex").slice(0, 16) + ".woff2";
    fs.writeFileSync(path.join(DIR, nombre), buf);
    out = out.split(u).join("/fonts/" + nombre);
  }
  fs.writeFileSync(path.join(DIR, "fuentes.css"), "/* Generado al publicar por tools/fuentes-locales.mjs */\n" + out);
  console.log(`fuentes-locales: ${urls.length} archivos guardados en /fonts`);
} catch (e) {
  console.log("fuentes-locales: no se pudieron descargar (" + e.message + "); se mantiene el respaldo de Google Fonts");
}
