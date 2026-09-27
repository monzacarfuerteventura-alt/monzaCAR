import { grabar } from "./director.mjs";
await grabar("fin", { preparar: async (p) => { const { loginGerente } = await import("./harness.mjs"); await loginGerente(p); await p.evaluate(() => abrirTab("fin")); await p.waitForTimeout(900); } }, async (a) => {
  await a.intro("Finanzas", "Apuntar un gasto y preparar lo de la asesoría", 5);
  await a.paso("Elige el periodo: día, semana, mes o año", 300); await a.click('[data-fnper=mes]', 900);
  await a.paso("¿Pagaste una factura? «− Nuevo gasto»", 200); await a.click('[data-fngasto]', 900);
  await a.paso("Proveedor, concepto e importe sin IGIC", 200);
  await a.elegir('#fn-cat', 'recambios');
  await a.click('dialog[open] [data-v=taller]', 300);
  await a.escribir('#fn-prov', 'Recambios Sur'); await a.escribir('#fn-fact', 'F-2026-0142'); await a.escribir('#fn-con', 'Pastillas de freno y discos'); await a.escribir('#fn-base', '185,40');
  await a.click('dialog[open] [data-v=tarjeta]', 400); await a.resaltar('text=PDF o archivo', 700); await a.p.locator('dialog[open] input[data-fnfile]').nth(1).setInputFiles('/tmp/ticket.png'); await a.sleep(900);
  await a.paso("Guarda: el IGIC y los totales se calculan solos", 200); await a.click('#fn-ok', 1500);
  await a.paso("Fin de trimestre: «PDF asesoría» y los Excel de facturas", 200); await a.resaltar('[data-fnexp=pdf]', 1500); await a.resaltar('[data-fnexp=emitidas]', 900);
  await a.fin("Cuentas al día");
});
