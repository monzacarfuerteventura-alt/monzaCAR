import { grabar } from "./director.mjs";
const TL=await import("./netlify/lib/taller.mts"), SG=await import("./netlify/lib/seguridad.mts");
await TL.tstore().setJSON("equipo",[{id:"u1",nombre:"Pedro Pérez",usuario:"pedro",rol:"mecanico",jornada:8,activo:true,alta:"2026-01-01",pin:TL.hashPin("123456")}]);
await SG.fijarExige2FAEquipo(false);
await grabar("jornada", { width: 390, height: 844, movil: true, preparar: async (p) => { await p.goto('https://volcanocars.test/admin.html'); await p.waitForTimeout(600);
  if(await p.isVisible('#login-modo')){ const t=await p.textContent('#login-modo'); if(t.includes("equipo")) await p.click('#login-modo'); } await p.waitForTimeout(400); } }, async (a) => {
  await a.intro("Jornada", "Fichar desde el móvil", 6);
  await a.paso("Entra con tu usuario y tu PIN", 300); await a.escribir('#eq-u', 'pedro'); await a.escribir('#eq-p', '123456'); await a.click('#login-btn', 1500);
  await a.paso("Un botón grande: pulsa para empezar la jornada", 200); await a.resaltar('.j-big', 1000); await a.click('.j-big', 1800);
  await a.paso("Ya estás trabajando: te lleva directo al taller", 200); await a.resaltar('#j-chip', 1500);
  await a.paso("¿Descanso o comida? Toca el reloj y «Iniciar pausa»", 200); await a.click('#j-chip', 900); await a.click('.j-sec', 1500);
  await a.paso("Al volver, pulsa «Reanudar»", 200); await a.click('.j-big', 1600);
  await a.paso("Al irte: reloj → «Registrar salida»", 200); await a.click('#j-chip', 900); await a.resaltar('.j-big', 1800);
  await a.fin("Jornada fichada");
});
