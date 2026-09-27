import { grabar } from "./director.mjs";
await grabar("coches", { preparar: async (p) => { const { loginGerente } = await import("./harness.mjs"); await loginGerente(p); await p.evaluate(() => abrirTab("coches")); await p.waitForTimeout(800); } }, async (a) => {
  await a.intro("Coches", "Publicar un coche en la web", 6);
  await a.paso("Pulsa «+ Añadir coche»", 300); await a.click('#add', 1000);
  await a.paso("Marca, modelo, año, kilómetros y precio final", 200);
  await a.escribir('#marca', 'Seat'); await a.escribir('#modelo', 'Ibiza'); await a.escribir('#anio', '2019'); await a.escribir('#km', '68000'); await a.escribir('#precio', '10990', 400);
  await a.paso("Sube las fotos: arrástralas o toca la zona de fotos", 200); await a.resaltar('.drop', 2000);
  await a.paso("Pon los precios de la competencia: la web enseña si está por debajo", 200); await a.resaltar('#mk-media', 1200); await a.escribir('#mk-media', '11900'); await a.escribir('#mk-n', '6', 400);
  await a.paso("Cuéntalo en 3 líneas: para quién es y por qué este", 200); await a.escribir('#descripcion', 'Ideal para moverte por la isla: consume poco. Revisado en nuestro taller.', 400);
  await a.paso("Pulsa «Publicar coche»: aparece al momento en la web", 200); await a.resaltar('#save', 2000);
  await a.fin("Coche publicado");
});
