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
  // Precarga de la letra de los títulos (Archivo, alfabeto latino): el H1 es lo más grande que se ve al abrir
  // la web (LCP). Sin precarga, el navegador no la pide hasta leer fuentes.css, que se carga en diferido.
  try {
    const bloque = out.split("/* ").find((b) => b.startsWith("latin */") && /font-family:\s*'Archivo'/.test(b));
    const woff = bloque && (bloque.match(/url\((\/fonts\/[a-f0-9]+\.woff2)\)/) || [])[1];
    if (woff) {
      const PUB = path.resolve(DIR, "..");
      // Actualización 40: se precargan también el cuerpo de texto (Figtree, latín); si no, al cambiar la letra de respaldo por Figtree
      // el texto se recoloca y la página «salta» (CLS). Con las dos precargadas, el salto medido pasa de 0,25 a 0.
      const bloqueF = out.split("/* ").find((b) => b.startsWith("latin */") && /font-family:\s*'Figtree'/.test(b));
      const woffF = bloqueF && (bloqueF.match(/url\((\/fonts\/[a-f0-9]+\.woff2)\)/) || [])[1];
      const pre = (u) => `<link rel="preload" as="font" type="font/woff2" href="${u}" crossorigin>`;
      const tag = pre(woff) + (woffF && woffF !== woff ? pre(woffF) : "");
      const html = [];
      const recorrer = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, f.name);
        if (f.isDirectory()) { if (!["ayuda", "coches", "fonts", "marca"].includes(f.name)) recorrer(p); }
        else if (f.name.endsWith(".html") && f.name !== "admin.html") html.push(p);
      } };
      recorrer(PUB);
      let n = 0;
      for (const f of html) {
        const t = fs.readFileSync(f, "utf8");
        if (t.includes('rel="preload" as="font"') || !t.includes('href="/fonts/fuentes.css"')) continue;
        const i = t.search(/<link rel="(preload|stylesheet)"[^>]*href="\/fonts\/fuentes\.css"/);
        if (i < 0) continue;
        fs.writeFileSync(f, t.slice(0, i) + tag + "\n" + t.slice(i)); n++;
      }
      // La página de coches (función coches-fv) usa una copia de su HTML: también lleva la precarga
      const plant = path.resolve(PUB, "..", "netlify", "lib", "plantilla-coches-fv.mts");
      if (fs.existsSync(plant)) {
        const t = fs.readFileSync(plant, "utf8");
        const marca = '<link rel=\\"stylesheet\\" href=\\"/fonts/fuentes.css\\"';
        if (!t.includes("as=\\\"font\\\"") && t.includes(marca)) { fs.writeFileSync(plant, t.replace(marca, JSON.stringify(tag).slice(1, -1) + "\\n" + marca)); n++; }
      }
      // Las páginas que genera el servidor (pueblos, fichas, vendidos) salen de la plantilla de lib/paginas.mts
      const pag = path.resolve(PUB, "..", "netlify", "lib", "paginas.mts");
      if (fs.existsSync(pag)) {
        const t2 = fs.readFileSync(pag, "utf8");
        const marca2 = '<link rel="preload" as="style" href="/fonts/fuentes.css">';
        if (!t2.includes('as="font"') && t2.includes(marca2)) { fs.writeFileSync(pag, t2.replace(marca2, tag + "\n" + marca2)); n++; }
      }
      console.log(`fuentes-locales: precarga de ${woff} en ${n} páginas`);
    }
  } catch (e2) { console.log("fuentes-locales: sin precarga (" + e2.message + ")"); }
} catch (e) {
  console.log("fuentes-locales: no se pudieron descargar (" + e.message + "); se mantiene el respaldo de Google Fonts");
}
