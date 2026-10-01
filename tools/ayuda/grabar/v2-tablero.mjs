import { grabar } from "./director2.mjs"; import { gerente, tb, arriba, bajar, res, clic } from "./v2lib.mjs";
await grabar("tablero", { preparar: async (p) => { const { loginGerente } = await import("./harness2.mjs"); await loginGerente(p); await p.evaluate(() => abrirTab("ordenes")); await p.waitForTimeout(1500); } }, async (a) => {
  const { p } = a;
  await a.intro("Tablero y Avisos de ITV", "Ver el taller de un vistazo y avisar a los clientes", 9);
  await a.paso2("Para qué sirve", "Aquí tienes dos herramientas más del Taller. El Tablero enseña todos los coches en columnas, como un mural de post-its. Y los Avisos de ITV te ayudan a recordar a los clientes cuándo tienen que pasar la inspección.", async () => { await res(a, ".segv", 2000); });
  await a.paso2("En marcha", "Pulsa En marcha. Es la vista del día a día: lo que hay que hacer ahora. Si eres mecánico, se llama Mis trabajos y solo enseña lo que tienes asignado.", async () => { await clic(a, '[data-tvista="mios"]', 2200); });
  await a.paso2("El tablero", "Pulsa Tablero. Cada columna es una fase: recepcionado, en inspección, en trabajo, control de calidad y entregado. Cada coche es una tarjeta con su matrícula y su cliente.", async () => { await clic(a, '[data-tvista="tablero"]', 2800); });
  await a.paso2("Leer una tarjeta", "En cada tarjeta ves el coche, el cliente y cuántos días lleva en el taller. Si alguien lleva demasiado tiempo parado, la tarjeta te lo marca. Toca una tarjeta y se abre la orden.", async () => { await res(a, ".t-card, .t-col article, #ordenes .card", 2800); });
  await a.paso2("Avisos de ITV", "Pulsa Avisos de ITV. Aquí salen los clientes que, al recibir el coche, dieron permiso para que les avises de la ITV. Es un permiso aparte, que se marca en la recepción.", async () => { await clic(a, '[data-tvista="itv"]', 2600); });
  await a.paso2("Los plazos", "Los avisos se ordenan por plazo. Caduca en siete días o menos es lo más urgente. Después, caduca en treinta días. Y por último, la ITV ya caducada. Así sabes a quién avisar primero.", async () => { await res(a, "#ordenes h3, #ordenes .t-itv", 3000); });
  await a.paso2("Avisar por WhatsApp", "Junto a cada cliente, pulsa el botón de WhatsApp. Se abre con un mensaje ya escrito. Solo tienes que enviarlo. El panel apunta que ya le has avisado, y aparece una marca verde con la fecha.", async () => { await a.sleep(1500); });
  await a.paso2("Deshacer y dar de baja", "Si pulsaste por error, pulsa Deshacer. Y si el cliente no quiere más avisos, pulsa dar de baja. Sirve también para abrir la ficha del cliente.", async () => { await a.sleep(1500); });
  await a.paso2("Por qué es útil", "Un cliente al que recuerdas la ITV vuelve a tu taller. Es la forma más fácil de conseguir trabajo sin gastar nada. Y así terminan el Tablero y los avisos.", async () => { await clic(a, '[data-tvista="mios"]', 1000); });
  await a.fin("Taller bajo control");
});
