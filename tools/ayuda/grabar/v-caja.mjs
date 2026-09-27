import { grabar } from "./director.mjs";
await grabar("caja", { preparar: async (p) => { const { loginGerente } = await import("./harness.mjs"); await loginGerente(p); await p.evaluate(() => abrirTab("caja")); await p.waitForTimeout(800); } }, async (a) => {
  await a.intro("Control de caja", "Abrir, cobrar y cerrar sin descuadres", 5);
  await a.paso("Al empezar el día pulsa «Abrir la caja»", 300); await a.click('[data-cjmodo=abrir]', 900);
  await a.paso("Cuenta el dinero con + y −: billetes y monedas", 200);
  await a.click('[data-cjmas="5000"]', 250); await a.click('[data-cjmas="5000"]', 250); await a.click('[data-cjmas="1000"]', 250); await a.click('[data-cjmas="1000"]', 250); await a.click('[data-cjmas="1000"]', 600);
  await a.paso("Confirma: si no cuadra, te pedirá una explicación", 200); await a.click('[data-cjconfirmar]', 1400);
  await a.paso("Cada cobro en efectivo, en el momento", 200); await a.click('[data-cjform=ingreso]', 900);
  await a.escribir('#cj-imp', '120'); await a.click('#cj-cat button', 300); await a.escribir('#cj-con', 'Cambio de aceite, Seat Ibiza', 300);
  await a.click('#cj-ok', 1400);
  await a.paso("Salidas con foto del ticket y, al final del turno, «Cerrar la caja»", 200); await a.resaltar('[data-cjform=egreso]', 1300); await a.resaltar('[data-cjmodo=cerrar]', 1600);
  await a.fin("Caja al día");
});
