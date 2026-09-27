import { grabar } from "./director.mjs"; import { sembrarDemo } from "./seed-demo.mjs";
await sembrarDemo();
await grabar("dash", { preparar: async (p) => { const { loginGerente } = await import("./harness.mjs"); await loginGerente(p); await p.evaluate(() => abrirTab("dash")); await p.waitForTimeout(2500); } }, async (a) => {
  await a.intro("Dashboard", "El centro de mando del negocio", 6);
  await a.paso("Arriba, los números clave del mes y si suben o bajan", 300); await a.resaltar('.d2-kpis', 2200);
  await a.paso("Toca una tarjeta y se abre su detalle", 200); await a.click('.d2-kpi >> nth=1', 1600);
  await a.p.evaluate(()=>scrollTo({top:0,behavior:"smooth"})); await a.sleep(500);
  await a.paso("La previsión te dice cómo cerrarás el mes", 200); await a.resaltar('.d2-fc', 1800);
  await a.paso("Mueve los deslizadores: ¿y si tuvieras más visitas o anuncios?", 200); await a.p.locator('.d2-sim').scrollIntoViewIfNeeded(); await a.resaltar('[data-d2sl="inv"]', 600);
  await a.p.locator('[data-d2sl="inv"]').fill("600"); await a.p.locator('[data-d2sl="inv"]').dispatchEvent("input"); await a.sleep(400); await a.resaltar('#d2-simout', 1600);
  await a.paso("Marketing en vivo: oportunidades para vender hoy", 200); await a.click('#mk-fab', 2600);
  await a.click('[data-mkcerrar]', 500);
  await a.paso("«Informe PDF» para guardarlo; los lunes te llega uno solo", 200); await a.p.evaluate(()=>scrollTo({top:0,behavior:"smooth"})); await a.sleep(500); await a.resaltar('#dash-pdf', 1800);
  await a.fin("Ya sabes cómo va el negocio");
});
