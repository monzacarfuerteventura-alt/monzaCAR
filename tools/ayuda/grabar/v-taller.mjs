import { grabar } from "./director.mjs";
await grabar("taller", { preparar: async (p) => { const { loginGerente } = await import("./harness.mjs"); await loginGerente(p); await p.evaluate(() => abrirTab("ordenes")); await p.waitForTimeout(800); } }, async (a) => {
  await a.intro("Taller", "Recibir un coche y abrir su orden", 7);
  await a.paso("Entra un coche: pulsa «+ Nueva recepción»", 300); await a.click('text=+ Nueva recepción', 900);
  await a.paso("Cliente, teléfono, matrícula y modelo", 200);
  await a.escribir('#rc-nom', 'Carlos Ruiz'); await a.escribir('#rc-tel', '622 111 222'); await a.escribir('#rc-mat', '1234KLM'); await a.escribir('#rc-coche', 'Seat León');
  await a.paso("Pulsa «Crear y abrir FORM-01»: la orden tiene ya su número", 200); await a.click('#rc-ok', 1500);
  await a.paso("Apunta kilómetros y nivel de combustible", 200); await a.escribir('[data-f="vehiculo.km"]', '98500'); await a.click('[data-fset="vehiculo.nivel"][data-v="1/2"]', 500);
  await a.paso("Toca los testigos encendidos y escribe qué le pasa", 200); await a.click('[data-ttestigo="Frenos"]', 400);
  await a.escribir('[data-f="motivo"]', 'Ruido metálico al frenar desde hace una semana', 500);
  await a.paso("Al terminar, firma y cierra la recepción", 200); await a.resaltar('text=Firmar y cerrar la recepción', 1800);
  await a.paso("Sigue con las fichas 2, 3 y 4: inspección, tiempos y calidad", 200); await a.p.evaluate(()=>scrollTo({top:0,behavior:"smooth"})); await a.sleep(600); await a.resaltar('[data-ttabb="f2"]', 1000); await a.resaltar('[data-ttabb="f4"]', 1000); await a.resaltar('[data-tdrawer]', 1600);
  await a.fin("Coche recibido");
});
