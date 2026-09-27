import { grabar } from "./director.mjs";
await grabar("crm", { preparar: async (p) => { const { loginGerente } = await import("./harness.mjs"); await loginGerente(p); await p.evaluate(() => abrirTab("leads")); await p.waitForTimeout(800); } }, async (a) => {
  await a.intro("CRM · Clientes", "Apuntar un cliente y hacerle seguimiento", 7);
  await a.paso("¿Te llama o viene alguien? Pulsa «+ Nuevo cliente»", 300); await a.click('#nuevo-cliente', 900);
  await a.paso("Escribe nombre y teléfono", 200); await a.escribir('#nc-nombre', 'Laura Gómez'); await a.escribir('#nc-tel', '612 345 678');
  await a.paso("Elige qué busca y cómo te ha llegado", 200); await a.elegir('#nc-tipo', 'taller'); await a.elegir('#nc-canal', 'Teléfono');
  await a.escribir('#nc-msg', 'Revisión de frenos, ruido al frenar', 300);
  await a.paso("Pulsa «Guardar cliente»: se abre su ficha", 200); await a.click('#nc-ok', 1300);
  await a.paso("Elige un mensaje y ábrelo en WhatsApp ya escrito", 300); await a.elegir('[data-tpl]', '0'); await a.resaltar('[data-tpltxt]', 1500); await a.resaltar('[data-enviar-tpl]', 1200);
  await a.paso("Apunta lo que has hecho: le has escrito", 200); await a.click('[data-act="whatsapp"]', 900);
  await a.paso("Pon cuándo volver a llamarle y cambia el estado", 200); await a.click('[data-seg="3"]', 800); await a.elegir('[data-est]', 'cita'); await a.sleep(900);
  await a.fin("Cliente apuntado");
});
