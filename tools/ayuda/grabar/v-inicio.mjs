import { grabar } from "./director.mjs";
await grabar("inicio", { gerente: false, preparar: async (p) => { await p.goto('https://volcanocars.test/admin.html'); await p.waitForTimeout(600); } }, async (a) => {
  const { p } = a;
  await a.intro("Primeros pasos", "Entrar al panel y moverte por él", 5);
  if ((await p.textContent('#login-modo')).includes("gerente")) await p.click('#login-modo');
  await a.paso("Escribe tu contraseña de gerente", 400);
  await a.escribir('#pw', 'clave-larga-de-prueba-123');
  await a.paso("Pulsa «Entrar»", 400); await a.click('#login-btn', 1400);
  await a.paso("Arriba tienes las pestañas: cada una es una parte del negocio", 400); await a.resaltar('#tabs', 2200);
  await a.paso("Toca una pestaña para abrirla, por ejemplo el CRM", 300); await a.click('[data-tab="leads"]', 1500);
  await a.paso("¿Dudas en cualquier pantalla? Pulsa «¿Cómo funciona?»", 300); await a.resaltar('#s-leads [data-ayuda]', 2200);
  await a.fin("Ya sabes moverte");
});
