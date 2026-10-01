import { grabar } from "./director2.mjs"; import { equipo, res, clic, arriba, bajar } from "./v2lib.mjs";
await grabar("jornada", { width: 390, height: 844, movil: true, preparar: async (p) => { const { loginEquipo } = await import("./harness2.mjs"); await p.goto("https://volcanocars.test/admin.html").catch(() => {}); await loginEquipo(p, "pedro", "123456"); } }, async (a) => {
  const { p } = a;
  await a.intro("Fichaje y jornada", "Fichar desde el móvil: entrada, pausa y salida", 11);
  await a.paso2("Para qué sirve", "Aquí fichas cuando llegas, cuando paras y cuando te vas. Con un solo toque. Las horas quedan guardadas para que el gerente no tenga que apuntar nada en papel.", async () => { await a.sleep(500); });
  await a.paso2("Entrar con tu usuario", "Para entrar, escribe tu usuario y tu PIN, que son tus seis números secretos. No se los des a nadie. Pulsa Entrar.", async () => { await a.sleep(400); });
  await a.paso2("El botón grande", "Al entrar sale un botón grande y verde, Registrar entrada. Es lo único que tienes que pulsar para empezar tu día. El panel te lleva solo al taller.", async () => { await res(a, ".j-big", 2200); });
  await a.paso2("Fichar la entrada", "Pulsa el botón. Verás la hora exacta. La hora la pone el servidor, no el móvil, así que nadie puede cambiarla.", async () => { await clic(a, ".j-big", 2200); });
  await a.paso2("El reloj de arriba", "Arriba hay un chip con un punto verde y tus horas. Es tu reloj. Muestra cuánto has trabajado hoy. Tócalo cuando quieras parar o irte.", async () => { await res(a, "#j-chip", 2400); });
  await a.paso2("Hacer una pausa", "Para tomar un café o comer, toca el reloj y pulsa Iniciar pausa o comida. Si tenías un trabajo en marcha en el taller, se pone en pausa solo. Mientras estés en pausa no puedes usar el panel, así las horas cuadran.", async () => { await clic(a, "#j-chip", 1000); await clic(a, ".j-sec", 2000); });
  await a.paso2("Volver de la pausa", "Cuando vuelvas, pulsa el botón grande, Reanudar jornada. Tu trabajo continúa justo donde lo dejaste.", async () => { await clic(a, ".j-big", 2200); });
  await a.paso2("Fichar la salida", "Al irte a casa, toca el reloj y pulsa Registrar salida. Antes, devuelve las herramientas que tengas a tu nombre o di dónde se han quedado.", async () => { await clic(a, "#j-chip", 1000); await res(a, ".j-big", 2200); });
  await a.paso2("Si te equivocas", "Si pulsas salida por error, no pasa nada. En el aviso que aparece abajo pulsa Deshacer. Tienes dos minutos. Y el aviso se esconde solo en unos segundos.", async () => { await clic(a, ".j-big", 800); await a.sleep(1500); });
  await a.paso2("Tus horas del mes", "Más abajo ves tus fichajes de hoy y tus horas del mes. Puedes descargar tu hoja en PDF cuando quieras. Así sabes siempre cuánto has trabajado.", async () => { await bajar(a, 500); await a.sleep(800); });
  await a.paso2("Si te olvidas", "Si te olvidaste de fichar, no lo arregles tú: avisa al gerente. Él lo corrige con un motivo escrito y queda registrado. Y así de fácil es fichar.", async () => { await arriba(a); });
  await a.fin("Jornada fichada");
});
