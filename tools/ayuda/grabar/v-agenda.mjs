import { grabar } from "./director.mjs"; import { sembrarCitas } from "./seed.mjs";
await grabar("agenda", { preparar: async (p) => { const { loginGerente } = await import("./harness.mjs"); await loginGerente(p); await sembrarCitas(p); await p.reload(); await p.waitForTimeout(1500); await p.evaluate(() => abrirTab("agenda")); await p.waitForTimeout(900); } }, async (a) => {
  await a.intro("Agenda", "Las citas que reservan los clientes en la web", 4);
  await a.paso("Aquí salen las citas de la web, ya confirmadas y por día", 300); await a.resaltar('article.cita-item', 1800);
  await a.paso("El día antes: «Recordar por WhatsApp» (mensaje ya escrito)", 200); await a.resaltar('text=Recordar por WhatsApp', 1800);
  await a.paso("Cuando el cliente viene, pulsa «Hecha»", 200); await a.click('article.cita-item >> text=Hecha', 1500);
  await a.paso("¿Vacaciones o festivo? Cierra ese día y nadie podrá reservar", 200);
  await a.p.locator('#cierre-f').scrollIntoViewIfNeeded(); await a.sleep(500); await a.resaltar('#cierre-f', 900); await a.resaltar('#cierre-add', 1500);
  await a.fin("Agenda al día");
});
