import { grabar } from "./director.mjs";
await grabar("alm", { preparar: async (p) => { const { loginGerente } = await import("./harness.mjs"); await loginGerente(p); await p.evaluate(() => abrirTab("alm")); await p.waitForTimeout(800); } }, async (a) => {
  await a.intro("Inventario", "Dar de alta una pieza y controlar el stock", 5);
  await a.paso("Pulsa «Nueva pieza»", 300); await a.click('[data-alpieza]', 900);
  await a.paso("Nombre, ubicación y stock mínimo", 200);
  await a.escribir('#al-nom', 'Aceite 5W30 (litro)'); await a.escribir('#al-ubi', 'Estantería A-2'); await a.escribir('#al-min', '10'); await a.escribir('#al-ini', '24'); await a.escribir('#al-cos', '6,50', 500);
  await a.paso("Guarda: ya tiene su código y su etiqueta QR", 200); await a.click('#al-ok', 1500);
  await a.paso("Cuando llega material: «+ Entrada de material» con el albarán", 200); await a.resaltar('[data-alentrada]', 1500);
  await a.paso("Si algo baja del mínimo, sale solo en «Pedido»", 200); await a.resaltar('[data-alvista=ped]', 1000); await a.click('[data-alvista=ped]', 1500);
  await a.fin("Stock controlado");
});
