/* =====================================================================
   VOLCANO CARS · ESCENAS DE CINE (v3): cámara lenta hiperrealista
   ---------------------------------------------------------------------
   Sustituyen a las de escenas.js / escenas2.js (reutilizan sus piezas 3D).
   Todas: suelo de taller mojado con reflejos, haz de luz con polvo,
   luces reales que salen de las chispas/arcos, desenfoque de movimiento
   y profundidad de campo (los pone el motor al acumular subfotogramas).
   Encuadre CUADRADO: el mismo render sirve para la versión horizontal
   (recorte 16:9) y la vertical (recorte 9:16) → lo importante, en el centro.
   ===================================================================== */
"use strict";
// cámara de cine: empuje lento (dolly) + balanceo leve, periódica
function camCine(t, o) {
  const a = o.ang + (o.amp ?? 0.12) * Math.sin(TAU * t), d = o.dist * (1 - (o.empuje ?? 0.06) * (0.5 - 0.5 * Math.cos(TAU * t)));
  const tg = o.obj, al = o.alt + (o.bal ?? 0.05) * Math.sin(TAU * t + 1.3);
  return { eye: [tg[0] + Math.sin(a) * d, tg[1] + al, tg[2] + Math.cos(a) * d], target: tg, fov: o.fov || 34, ap: o.ap };
}
const onda = (t, n = 1, f = 0) => 0.5 - 0.5 * Math.cos(TAU * (n * t + f));

/* ================================================================ FRENOS: disco al rojo + lluvia de chispas */
ESC.frenos = (t) => {
  const giro = -TAU * 2 * t;                                // 2 vueltas por bucle: cámara lenta
  const cam = camCine(t, { obj: [0.72, -0.3, 0.1], dist: 4.3, alt: -0.22, ang: 0.52, amp: 0.07, fov: 38, empuje: 0.07 });
  const pres = 0.55 + 0.45 * onda(t, 2);                    // la pinza aprieta a pulsos
  const ang = 0.38;                                          // posición de la pinza (arriba a la derecha)
  const MD = cad(M4.RX(Math.PI / 2), M4.RY(giro));
  const sol = [
    D(FRENO.disco, MD, MAT({ base: [0.13, 0.13, 0.135], metal: 1, rough: 0.4, pat: 2, pa: [0.5 + 0.22 * pres, 0.55, ang, 1] })),
    D(FRENO.cubo, MD, MAT({ base: [0.62, 0.63, 0.65], metal: 1, rough: 0.28, pat: 1, pa: [900, 0, 0, 0] })),
  ];
  const Mc = cad(M4.RZ(ang - Math.PI / 2), M4.T(0, 0.83, 0)), hueco = 0.012 * (1 - pres);
  const rojo = MAT({ base: [0.36, 0.012, 0.008], metal: 0, rough: 0.32, clear: 1, flake: 0.2 });
  sol.push(D(FRENO.mitad, cad(Mc, M4.T(0, 0, 0.21 + hueco)), rojo), D(FRENO.mitad, cad(Mc, M4.T(0, 0, -0.21 - hueco), M4.RY(Math.PI)), rojo), D(FRENO.puente, cad(Mc, M4.T(0, 0.23, 0)), rojo));
  for (const zz of [1, -1]) {
    sol.push(D(FRENO.pastilla, cad(Mc, M4.T(0, -0.02, zz * (0.135 + hueco))), MAT({ base: [0.07, 0.065, 0.06], metal: 0.2, rough: 0.85, emis: [0.5 * pres, 0.1 * pres, 0.01] })));
    sol.push(D(FRENO.soporte, cad(Mc, M4.T(0, -0.02, zz * (0.165 + hueco))), MATS.acero()));
  }
  // chispas: nacen en el borde de salida de la pastilla, salen tangentes al giro y caen al suelo
  const pts = [], a0 = ang - 0.26;
  const tg = [Math.sin(a0), -Math.cos(a0), 0], rad = [Math.cos(a0), Math.sin(a0), 0];
  const suelo = -1.12;
  const fuente = chispas(pts, {
    n: 900, vueltas: 3, semilla: 11, suelo, rebote: 0.42, g: 26, arrastre: 1.6, v: [7, 19], vida: [0.07, 0.3], abre: 0.2, grosor: 0.0065, estela: 0.0028,
    pos: (R) => { const r = 0.72 + R() * 0.27, aa = a0 + (R() - 0.5) * 0.08; return [Math.cos(aa) * r, Math.sin(aa) * r, (R() - 0.5) * 0.3]; },
    dir: (R) => V.add(V.add(V.mul(tg, 1), V.mul(rad, 0.1 + R() * 0.3)), [0, 0, 0.15 + R() * 0.25]), intensidad: (tb) => 0.35 + 0.65 * (0.55 + 0.45 * onda(tb, 2)), brillo: 1.2,
  }, t);
  // chispas gruesas y lentas (trozos de pastilla incandescente)
  chispas(pts, { n: 60, vueltas: 2, semilla: 29, suelo, rebote: 0.3, g: 22, arrastre: 0.8, v: [4, 9], vida: [0.2, 0.45], abre: 0.35, grosor: 0.012, estela: 0.002, enfria: 0.8,
    pos: () => [Math.cos(a0) * 0.9, Math.sin(a0) * 0.9, 0], dir: () => V.add(tg, V.mul(rad, 0.4)), brillo: 1.1 }, t);
  // humo de ferodo que sube del disco caliente
  humo(pts, { n: 26, vueltas: 1, semilla: 3, pos: (R) => { const aa = a0 - R() * 1.6; return [Math.cos(aa) * 0.9, Math.sin(aa) * 0.9, 0.12 + R() * 0.2]; }, sube: 1.8, deriva: 0.9, tam: [0.18, 0.9], alfa: 0.05, col: [0.9, 0.7, 0.55] }, t);
  polvo(pts, { n: 140, centro: [0.6, 0.4, 0.6], caja: [5, 3, 3], semilla: 5, alfa: 0.3 }, t);
  const pc = [Math.cos(a0) * 0.95, Math.sin(a0) * 0.95, 0.25], fl = 0.85 + 0.15 * Math.sin(TAU * 37 * t) * Math.sin(TAU * 23 * t);
  const luces = [{ p: pc, c: V.mul([4, 1.7, 0.5], pres * fl), r: 4 }, { p: [1.25, suelo + 0.3, 0.5], c: V.mul([3.2, 1.1, 0.25], pres), r: 3.5 }, { p: [0.4, 0.1, 0.5], c: V.mul([1.2, 0.3, 0.05], 0.4 + 0.3 * pres), r: 1.6 }];
  if (fuente) luces.push({ p: fuente, c: V.mul([3, 1.2, 0.3], pres * fl), r: 3 });
  return { cam, solidos: sol, particulas: pts, luces, suelo: { y: suelo, cx: 0.8, cz: 0.2, r: 5, humedad: 0.55 }, radio: 2.6,
    tinte: [1, 0.3, 0.1], bloom: 0.55, destello: 0.3, exposicion: 1.05, hazX: 0.62, entorno: 0.32, luz: { dir: [-0.55, 0.85, 0.65], col: [1.9, 1.95, 2.1] } };
};

/* ================================================================ NEUMÁTICOS: derrape sobre suelo mojado (agua + humo) */
const RUEDA2 = (() => {
  const ext = RUEDA.ext, int = ext.map(([r, y]) => [r - (r > 0.9 ? 0.07 : 0.045), y * 0.86]).reverse();
  const goma = new Geo(); goma.add(torno([...ext, ...int, ext[0]], 180));
  // banda de rodadura: tacos direccionales en V + surcos
  for (let k = 0; k < 64; k++) { const a = (k / 64) * TAU; for (const s of [-1, 1]) goma.add(caja(0.028, 0.1, 0.05, 0.012, 3), cad(M4.RY(-a), M4.T(0.992, s * 0.13, 0), M4.RX(s * 0.55))); goma.add(caja(0.026, 0.035, 0.04, 0.01, 2), cad(M4.RY(-(a + 0.049)), M4.T(0.992, 0, 0))); }
  // letras en relieve del flanco (bandas finas, sin marca)
  for (let k = 0; k < 90; k++) { const a = (k / 90) * TAU; if ((k % 15) > 10) continue; goma.add(caja(0.012, 0.004, 0.018, 0.003, 1), cad(M4.RY(-a), M4.T(0.8, 0.325, 0))); }
  return { goma: new Malla(goma) };
})();
ESC.neumaticos = (t) => {
  const giro = TAU * 7 * t, suelo = -0.975;
  const cam = camCine(t, { obj: [-0.35, -0.3, 0.25], dist: 3.9, alt: -0.38, ang: -0.42, amp: 0.06, fov: 40, empuje: 0.06, ap: 0.075 });
  const M = cad(M4.RY(0.5), M4.RX(Math.PI / 2), M4.RY(-giro));
  const sol = [
    D(RUEDA2.goma, M, MAT({ base: [0.028, 0.028, 0.03], metal: 0, rough: 0.6, pat: 6 })),
    D(RUEDA.llanta, M, MAT({ base: [0.55, 0.56, 0.58], metal: 1, rough: 0.22, pat: 1, pa: [1300, 0, 0, 0] })),
    D(FRENO.disco, cad(M, M4.T(0, -0.08, 0), M4.S(0.52)), MAT({ base: [0.25, 0.25, 0.26], metal: 1, rough: 0.4, pat: 2, pa: [0, 0, 0, 0] })),
  ];
  const pts = [], Mw = M4.RY(0.5), atras = M4.ap(Mw, [-1, 0, 0]), lado = M4.ap(Mw, [0, 0, 1]);
  const cp = M4.ap(Mw, [0.05, suelo + 0.02, 0]);
  const agua = (T) => [1.5 + 0.8 * T, 1.65 + 0.8 * T, 1.95 + 0.6 * T];
  // cola de gallo: agua que sale despedida del contacto hacia atrás y arriba
  chispas(pts, { n: 1100, vueltas: 3, semilla: 41, suelo, rebote: 0.25, g: 24, arrastre: 1.8, v: [8, 20], vida: [0.08, 0.26], abre: 0.28, grosor: 0.0045, estela: 0.003, color: agua, brillo: 0.55,
    pos: (R) => V.add(cp, V.mul(lado, (R() - 0.5) * 0.5)), dir: (R) => V.norm(V.add(V.add(atras, [0, 0.35 + R() * 0.7, 0]), V.mul(lado, (R() - 0.5) * 0.5))) }, t);
  // gotas que la banda arranca por detrás (salen tangentes al giro, hacia arriba)
  let aG = Math.PI;
  chispas(pts, { n: 420, vueltas: 3, semilla: 43, suelo, rebote: 0.2, g: 24, arrastre: 1.2, v: [7, 14], vida: [0.1, 0.3], abre: 0.1, grosor: 0.005, estela: 0.003, color: agua, brillo: 0.45,
    pos: (R) => { aG = Math.PI * (0.8 + R() * 0.45); return M4.ap(Mw, [Math.cos(aG) * 1.0, Math.sin(aG) * 1.0, (R() - 0.5) * 0.5]); },
    dir: () => M4.ap(Mw, [Math.sin(aG), -Math.cos(aG), 0]) }, t);
  // humo de goma caliente que se enrosca detrás de la rueda
  humo(pts, { n: 55, vueltas: 1, semilla: 7, pos: (R) => V.add(cp, V.add(V.mul(atras, 0.2 + R() * 0.4), V.mul(lado, (R() - 0.5) * 0.7))), dir: V.norm(V.add(atras, [0, 0.55, 0])), sube: 2.4, deriva: 1.4, tam: [0.3, 1.7], alfa: 0.03, col: [0.78, 0.8, 0.84] }, t);
  polvo(pts, { n: 110, centro: [0, 0.3, 0.6], caja: [5, 3, 3], semilla: 8, alfa: 0.25, col: [0.8, 0.88, 1] }, t);
  const luces = [{ p: M4.ap(Mw, [-1.6, 0.9, -1.0]), c: [1.6, 2.2, 3.4], r: 5 }, { p: M4.ap(Mw, [1.5, 0.6, -0.8]), c: [2.4, 1.1, 0.4], r: 4 }];
  return { cam, solidos: sol, particulas: pts, luces, suelo: { y: suelo, cx: -0.4, cz: 0.2, r: 5, humedad: 0.9 }, radio: 2.2,
    tinte: [0.3, 0.6, 1], bloom: 0.5, destello: 0.2, exposicion: 1.1, hazX: 0.45, entorno: 0.55, luz: { dir: [-0.6, 0.8, 0.5], col: [2.2, 2.25, 2.4] } };
};

/* ================================================================ BATERÍA: arco eléctrico de alta tensión a cámara lenta */
ESC.bateria = (t) => {
  const suelo = -0.43;
  const cam = camCine(t, { obj: [0.3, 0.3, 0], dist: 5.3, alt: 0.2, ang: 0.32, amp: 0.07, fov: 38, empuje: 0.07, ap: 0.06 });
  const MB = M4.T(-0.8, 0, 0), rot = TAU * 3 * t;
  const Mm = cad(M4.T(1.0, suelo + 0.29, 0.1), M4.RZ(-Math.PI / 2));
  const sol = [
    D(BAT.caj, MB, MAT({ base: [0.035, 0.036, 0.04], metal: 0, rough: 0.35, clear: 0.4 })), D(BAT.tapa, MB, MAT({ base: [0.06, 0.06, 0.065], metal: 0, rough: 0.3 })),
    D(BAT.borne, cad(MB, M4.T(0.45, 0, 0)), MAT({ base: [0.62, 0.55, 0.45], metal: 1, rough: 0.35 })), D(BAT.borne, cad(MB, M4.T(-0.45, 0, 0)), MAT({ base: [0.62, 0.55, 0.45], metal: 1, rough: 0.35 })),
    D(BAT.mot, Mm, MAT({ base: [0.2, 0.21, 0.22], metal: 1, rough: 0.4 })),
    D(BAT.sol, cad(M4.T(1.05, suelo + 0.72, 0.1), M4.RZ(-Math.PI / 2)), MAT({ base: [0.72, 0.73, 0.75], metal: 1, rough: 0.25, pat: 1, pa: [900, 0, 0, 0] })),
    D(BAT.pinon, cad(M4.T(1.52, suelo + 0.29, 0.1), M4.RZ(-Math.PI / 2), M4.RY(rot)), MATS.acero()),
    D(BAT.cableN, M4.I(), MAT({ base: [0.02, 0.02, 0.022], metal: 0, rough: 0.35, clear: 0.5 })),
  ];
  // arcos: del borne + al espárrago del solenoide; cambian de forma cada 2 fotogramas (cámara lenta)
  const pts = [], A = [-0.35, 0.64, 0], B = [1.05, suelo + 0.87, 0.1];
  const fr = Math.floor(t * 96), pul = 0.55 + 0.45 * Math.abs(Math.sin(fr * 1.7)) * (0.6 + 0.4 * onda(t, 3));
  const principal = rayo(pts, A, B, fr * 13 + 1, { niveles: 8, desv: 0.6, arco: [0, 0.45, 0.1], col: [3.2, 4.2, 8], brillo: 1.3 * pul, grosor: 0.007, ramas: 5 });
  rayo(pts, A, B, fr * 29 + 7, { niveles: 7, desv: 0.8, arco: [0, 0.6, -0.15], col: [2, 3, 7], brillo: 0.45 * pul, grosor: 0.004, ramas: 2 });
  // plasma en los puntos de contacto
  for (const P0 of [A, B]) { part(pts, P0, P0, [3, 4, 8, 1.2 * pul], 0.05); part(pts, P0, P0, [1, 1.5, 4, 0.5 * pul], 0.16); }
  // chispas de metal fundido que saltan de los contactos y rebotan en el suelo
  for (const [P0, sem] of [[A, 61], [B, 67]]) chispas(pts, { n: 380, vueltas: 4, semilla: sem, suelo, rebote: 0.45, g: 26, arrastre: 1.5, v: [3.5, 11], vida: [0.06, 0.24], abre: 0.9, grosor: 0.005, estela: 0.003, pos: () => P0, dir: () => [0, 0.7, 0], brillo: 1.1, intensidad: () => pul }, t);
  humo(pts, { n: 22, vueltas: 1, semilla: 13, pos: (R) => V.lerp(A, B, R()), sube: 1.2, deriva: 0.8, tam: [0.2, 0.9], alfa: 0.035, col: [0.55, 0.65, 0.95] }, t);
  polvo(pts, { n: 110, centro: [0.2, 0.6, 0.6], caja: [5, 3, 3], semilla: 12, alfa: 0.25, col: [0.8, 0.9, 1.1] }, t);
  const mid = principal[Math.floor(principal.length / 2)];
  const luces = [{ p: mid, c: V.mul([3.5, 4.5, 9], pul), r: 5 }, { p: A, c: V.mul([3, 3.5, 6], pul), r: 3 }, { p: B, c: V.mul([3, 3.5, 6], pul), r: 3 }, { p: [0.4, suelo + 0.2, 0.6], c: V.mul([2.2, 0.9, 0.25], pul), r: 3 }];
  return { cam, solidos: sol, particulas: pts, luces, suelo: { y: suelo, cx: 0.2, cz: 0.2, r: 5, humedad: 0.7 }, radio: 2.4,
    tinte: [0.4, 0.6, 1.2], bloom: 0.6, destello: 0.18, exposicion: 1.0, hazX: 0.5, entorno: 0.45, luz: { dir: [-0.5, 0.85, 0.5], col: [1.6, 1.7, 1.9] } };
};

/* ================================================================ GOLPES: impacto a cámara lenta + reparación con soldadora de espárragos */
const SOLDADORA = (() => {
  const g = new Geo();
  g.add(cilindro(0.075, 0, 0.5, 40, 0.015), M4.RX(Math.PI / 2));                 // cuerpo (eje Z)
  g.add(torno([[0, 0.5], [0.075, 0.5], [0.05, 0.56], [0.02, 0.6], [0, 0.6]], 32), M4.RX(Math.PI / 2));
  g.add(torno([[0.078, 0.12], [0.085, 0.13], [0.085, 0.2], [0.078, 0.21]], 40), M4.RX(Math.PI / 2)); // anillo de agarre
  const punta = new Geo(); punta.add(cilindro(0.012, -0.06, 0.0, 16), M4.RX(Math.PI / 2));
  return { cuerpo: new Malla(g), punta: new Malla(punta), bola: new Malla(esfera(0.12, 40)) };
})();
const COLOR_VOLCAN = [0.69, 0.063, 0.012];
const ESP = 1.5, MP = M4.S(ESP);
const camPanel2 = (t) => camCine(t, { obj: [0.05, -0.05, 0.0], dist: 3.9, alt: 0.1, ang: -0.55, amp: 0.07, fov: 38, empuje: 0.08, ap: 0.05 });
ESC.golpes = (t) => {
  const suelo = -0.8 * ESP, U0 = 0.5, V0 = 0.52;
  // profundidad de la abolladura a lo largo del bucle (con onda amortiguada al saltar y al golpear)
  const dentBase = 0.13;
  let amp, onda0 = 0, tOnda = -1;
  if (t < 0.34) amp = dentBase;
  else if (t < 0.84) { const k = (t - 0.34) / 0.05; amp = dentBase * Math.exp(-k * 1.4) * Math.cos(k * 2.6); tOnda = t - 0.34; }
  else if (t < 0.875) amp = 0;
  else { const k = (t - 0.875) / 0.03; amp = dentBase * (1 - Math.exp(-k * 2.2) * Math.cos(k * 2.8)); tOnda = t - 0.875; }
  const prof = (u, v) => {
    const du = (u - U0) * 2.9, dv = (v - V0) * 1.5, r = Math.hypot(du, dv);
    let d = amp * Math.exp(-(r * r) / 0.09);
    if (tOnda >= 0 && tOnda < 0.12) { const fr = 34 * tOnda; d += 0.012 * Math.exp(-tOnda * 30) * Math.cos((r - fr) * 22) * Math.exp(-Math.pow((r - fr) / 0.25, 2)); }
    return d;
  };
  PANEL.m.actualizar(PANEL.hacer(prof));
  const sol = [D(PANEL.m, MP, MAT({ base: [0.42, 0.032, 0.008], metal: 0.45, rough: 0.3, clear: 1, flake: 0, pat: 4, pa: [3, 0, -1, 0] }), { sinSombra: true })];
  const pts = [], luces = [];
  const C0 = V.mul(PANEL.forma(U0, V0, prof), ESP);
  // soldadora de espárragos: se acerca, suelda (3 destellos) y tira de la chapa
  const llega = suave(tramo(t, 0.02, 0.1)), sale = suave(tramo(t, 0.32, 0.44));
  const zG = C0[2] + 0.02 + 0.9 * (1 - llega) + 0.9 * sale + (t > 0.3 && t < 0.345 ? -0.0 : 0);
  if (t < 0.46) {
    const Mg = cad(M4.T(C0[0], C0[1], zG), M4.RY(0));
    sol.push(D(SOLDADORA.cuerpo, Mg, MAT({ base: [0.03, 0.03, 0.035], metal: 0.2, rough: 0.4, clear: 0.6 })), D(SOLDADORA.punta, Mg, MATS.cobre()));
    for (const [a, b, sem] of [[0.11, 0.16, 71], [0.18, 0.23, 73], [0.25, 0.3, 79]]) {
      if (t > a - 0.02 && t < b + 0.12) {
        const ki = (tb) => (tb > a && tb < b ? Math.sin(Math.PI * (tb - a) / (b - a)) : 0);
        chispas(pts, { n: 700, vueltas: 1, semilla: sem, suelo, rebote: 0.4, g: 20, arrastre: 1.5, v: [6, 17], vida: [0.05, 0.18], abre: 0.15, grosor: 0.005, estela: 0.003,
          pos: (R) => [C0[0] + (R() - 0.5) * 0.02, C0[1] + (R() - 0.5) * 0.02, C0[2] + 0.01], dir: (R) => { const a = R() * TAU; return [Math.cos(a), Math.sin(a) * 0.8 + 0.25, 0.35 + R() * 0.5]; }, intensidad: ki, brillo: 1.3 }, t);
        const k = ki(t); if (k > 0) { luces.push({ p: [C0[0], C0[1], C0[2] + 0.12], c: V.mul([7, 4.5, 2.2], k), r: 3.5 }); part(pts, C0, C0, [6, 5, 4, k], 0.04); }
      }
    }
  }
  // bola de acero que golpea a cámara lenta y rebota; saltan escamas de pintura
  if (t > 0.8) {
    const k = (t - 0.875) / 0.1; const imp = [C0[0] + 0.02, C0[1], C0[2] + 0.12];
    const p = k < 0 ? V.add(imp, V.mul([1.2, 0.35, 2.6], -k * 1.0)) : V.add(imp, V.mul([0.5, 0.25, 1.4], k * 0.8));
    sol.push(D(SOLDADORA.bola, M4.T(p[0], p[1], p[2]), MATS.cromo()));
    chispas(pts, { n: 160, vueltas: 1, semilla: 83, suelo, rebote: 0.3, g: 20, arrastre: 1.4, v: [3, 8], vida: [0.05, 0.12], abre: 0.9, grosor: 0.007, estela: 0.002,
      pos: () => C0, dir: () => [0, 0.3, 1], intensidad: (tb) => (tb > 0.873 && tb < 0.9 ? 1 : 0), color: (T) => [COLOR_VOLCAN[0] * 3, COLOR_VOLCAN[1] * 3, COLOR_VOLCAN[2] * 3], brillo: 0.7 }, t);
  }
  // barra de luz de inspección que recorre la chapa cuando ya está perfecta
  const bl = tramo(t, 0.46, 0.82);
  if (bl > 0 && bl < 1) luces.push({ p: [-2.4 + 4.8 * suave(bl), 0.6, 1.1], c: [3.2, 3.3, 3.6], r: 3 });
  polvo(pts, { n: 120, centro: [0, 0.3, 0.7], caja: [4.5, 3, 2.5], semilla: 21, alfa: 0.28 }, t);
  return { cam: camPanel2(t), solidos: sol, particulas: pts, luces, suelo: { y: suelo, cx: 0, cz: 0.4, r: 4.5, humedad: 0.6 }, radio: 2.2,
    tinte: [1, 0.3, 0.1], bloom: 0.55, destello: 0.22, exposicion: 1.05, hazX: 0.4, entorno: 0.8, rayas: [0.6, 0.1, 0.8, 5], luz: { dir: [-0.6, 0.7, 0.8], col: [1.7, 1.7, 1.75] } };
};

/* ================================================================ PINTURA: nube de pintura pulverizada a cámara lenta */
ESC.pintura = (t) => {
  PANEL.m.actualizar(PANEL.hacer(() => 0));
  const suelo = -0.8 * ESP;
  const cub = suave(tramo(t, 0.05, 0.47)), bar = suave(tramo(t, 0.5, 0.84)), vuelve = suave(tramo(t, 0.88, 0.99));
  const color = t < 0.88 ? cub : 1 - vuelve, barniz = t < 0.88 ? bar : 1 - vuelve;
  const sol = [D(PANEL.m, MP, MAT({ base: COLOR_VOLCAN, metal: 0.45, rough: 0.35, clear: 0, flake: 0, pat: 4, pa: [1, color, barniz, 0] }), { sinSombra: true })];
  const pts = [], luces = [];
  // la pistola barre de izquierda a derecha subiendo y bajando (como un pintor de verdad)
  let fase, uu, tinte;
  if (t >= 0.04 && t < 0.48) { fase = tramo(t, 0.04, 0.48); uu = cub; tinte = [2.8, 0.42, 0.09]; }
  else if (t >= 0.49 && t < 0.85) { fase = tramo(t, 0.49, 0.85); uu = bar; tinte = [1.5, 1.6, 1.8]; }
  else if (t >= 0.87) { fase = tramo(t, 0.87, 1); uu = 1 - vuelve; tinte = [0.9, 0.92, 0.95]; }
  else if (t < 0.04) { fase = 0; uu = 0; tinte = [0.9, 0.92, 0.95]; } // la pistola espera en el borde (bucle sin saltos)
  if (fase !== undefined) {
    const x = (uu - 0.5) * 2.9 * ESP, y = 0.32 * ESP * Math.sin(TAU * 5 * t), zS = PANEL.forma(clamp(uu), 0.5 + y / (1.5 * ESP), () => 0)[2] * ESP;
    const dS = V.norm([-0.72, -0.08, -0.69]), N0 = V.sub([x, y, zS], V.mul(dS, 1.0));
    const G0 = V.sub(N0, V.mul(dS, 0.44));
    sol.push(D(PANEL.pistola, cad(M4.T(G0[0], G0[1], G0[2]), M4.RY(Math.atan2(dS[0], dS[2])), M4.S(1.3)), MAT({ base: [0.62, 0.63, 0.66], metal: 1, rough: 0.2 })));
    const on = t < 0.04 ? 0 : smoothstepJS2(0, 0.04, fase) * (t >= 0.87 ? smoothstepJS2(1, 0.7, fase) : smoothstepJS2(1, 0.96, fase));
    // gotitas: salen en abanico de la boquilla y se frenan con el aire
    chispas(pts, { n: 2600, vueltas: 12, semilla: 91, g: 1.5, arrastre: 3.2, v: [6, 11], vida: [0.035, 0.08], abre: 0.26, grosor: 0.0038, estela: 0.0022, color: () => tinte, brillo: 0.7 * on,
      pos: (R) => [N0[0] + (R() - 0.5) * 0.02, N0[1] + (R() - 0.5) * 0.02, N0[2]], dir: () => dS }, t);
    // rebote: gotas que salen de la chapa hacia la cámara, a cámara lenta
    chispas(pts, { n: 500, vueltas: 6, semilla: 93, suelo, g: 4, arrastre: 2, v: [1, 3], vida: [0.08, 0.16], abre: 0.8, grosor: 0.004, estela: 0.002, color: () => tinte, brillo: 0.45 * on,
      pos: (R) => [x + (R() - 0.5) * 0.4, y + (R() - 0.5) * 0.4, zS + 0.05], dir: () => [0.2, 0.2, 1] }, t);
    // niebla (overspray) que queda flotando delante de la chapa
    humo(pts, { n: 46, vueltas: 2, semilla: 17, pos: (R) => { const k = 0.3 + R() * 0.7; return V.add(V.lerp(N0, [x, y, zS + 0.1], k), [(R() - 0.5) * 0.4 * k, (R() - 0.5) * 0.4 * k, 0]); }, dir: [0.3, 0.25, 0.6], sube: 0.7, deriva: 0.7, tam: [0.3, 1.1], alfa: 0.15 * on, col: V.mul(tinte, 0.6) }, t);
    luces.push({ p: [N0[0], N0[1] + 0.3, N0[2] + 0.2], c: [1.4, 1.4, 1.5], r: 2.5 });
  }
  polvo(pts, { n: 90, centro: [0, 0.3, 0.7], caja: [4.5, 3, 2.5], semilla: 23, alfa: 0.25 }, t);
  const segui = (t < 0.48 ? cub : t < 0.87 ? bar : 1 - vuelve) - 0.5;
  const cam = camCine(t, { obj: [segui * 2.9 * ESP * 0.85 + 0.35, -0.05, 0.1], dist: 4.9, alt: 0.15, ang: -0.62, amp: 0.05, fov: 38, empuje: 0.05, ap: 0.045 });
  return { cam, solidos: sol, particulas: pts, luces, suelo: { y: suelo, cx: 0, cz: 0.4, r: 4.5, humedad: 0.5 }, radio: 2.4,
    tinte: [1, 0.35, 0.1], bloom: 0.5, destello: 0.15, exposicion: 1.05, hazX: 0.45, entorno: 0.8, rayas: [0.6, 0.1, 0.8, 5], luz: { dir: [-0.6, 0.7, 0.8], col: [1.7, 1.7, 1.75] } };
};

/* ================================================================ ARAÑAZOS: pulidora rotativa que borra los arañazos */
const PULIDORA = (() => {
  const plato = new Geo(); plato.add(cilindro(0.3, 0, 0.07, 64, 0.03)); // espuma
  for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; plato.add(caja(0.045, 0.012, 0.012, 0.004, 1), cad(M4.RY(-a), M4.T(0.22, -0.004, 0))); }
  const base = new Geo(); base.add(cilindro(0.24, 0.07, 0.11, 64, 0.01));
  const cuerpo = new Geo(); cuerpo.add(cilindro(0.11, 0.11, 0.55, 48, 0.03)); cuerpo.add(torno([[0, 0.55], [0.11, 0.55], [0.13, 0.62], [0.13, 0.78], [0.1, 0.84], [0, 0.85]], 48));
  cuerpo.add(caja(0.05, 0.05, 0.32, 0.03), cad(M4.T(0, 0.45, 0.28)));
  return { plato: new Malla(plato), base: new Malla(base), cuerpo: new Malla(cuerpo) };
})();
ESC.aranazos = (t) => {
  PANEL.m.actualizar(PANEL.hacer(() => 0));
  const suelo = -0.8 * ESP;
  const us = t < 0.08 ? 0 : t < 0.78 ? suave(tramo(t, 0.08, 0.78)) * 1.02 : 1.02, vuelve = tramo(t, 0.86, 0.99), on = t > 0.04 && t < 0.84;
  const sol = [D(PANEL.m, MP, MAT({ base: [0.02, 0.021, 0.025], metal: 0.5, rough: 0.2, clear: 1, flake: 0, pat: 4, pa: [2, us, 0, vuelve], tex: PANEL.tx }), { sinSombra: true })];
  const pts = [], luces = [];
  if (on) {
    const ent = suave(tramo(t, 0.04, 0.09)) * (1 - suave(tramo(t, 0.79, 0.84)));
    const uu = clamp(us), y = 0.18 * Math.sin(TAU * 3 * t), zS = PANEL.forma(uu, 0.5 + y / 1.5, () => 0)[2] * ESP;
    const P0 = [(uu - 0.5) * 2.9 * ESP, y * ESP, zS + 0.01 + (1 - ent) * 0.8];
    const Mp = cad(M4.T(P0[0], P0[1], P0[2]), M4.RX(Math.PI / 2), M4.RZ(0.08));
    const giro = TAU * 5 * t;
    sol.push(D(PULIDORA.plato, cad(Mp, M4.RY(giro)), MAT({ base: [0.75, 0.3, 0.05], metal: 0, rough: 0.85 })), D(PULIDORA.base, cad(Mp, M4.RY(giro)), MATS.negroMate()),
      D(PULIDORA.cuerpo, Mp, MAT({ base: [0.9, 0.35, 0.05], metal: 0, rough: 0.35, clear: 0.8 })));
    // gotitas de pulimento que salen despedidas del borde del plato
    let aP = 0;
    chispas(pts, { n: 500, vueltas: 6, semilla: 97, suelo, rebote: 0.2, g: 12, arrastre: 2.2, v: [3, 7], vida: [0.04, 0.12], abre: 0.25, grosor: 0.004, estela: 0.003, color: () => [1.5, 1.4, 1.25], brillo: 0.45 * ent,
      pos: (R) => { aP = R() * TAU; return [P0[0] + Math.cos(aP) * 0.31, P0[1] + Math.sin(aP) * 0.31, P0[2] + 0.04]; }, dir: () => [-Math.sin(aP), Math.cos(aP), 0.35] }, t);
    luces.push({ p: [P0[0] - 0.4, P0[1] + 0.5, P0[2] + 0.5], c: [1.2, 1.2, 1.3], r: 2 });
  }
  const bl = tramo(t, 0.2, 0.8);
  polvo(pts, { n: 90, centro: [0, 0.3, 0.7], caja: [4.5, 3, 2.5], semilla: 29, alfa: 0.25 }, t);
  return { cam: camPanel2(t), solidos: sol, particulas: pts, luces, suelo: { y: suelo, cx: 0, cz: 0.4, r: 4.5, humedad: 0.5 }, radio: 2.4,
    tinte: [0.6, 0.4, 1], bloom: 0.5, destello: 0.15, exposicion: 1.1, hazX: 0.45, entorno: 0.9, rayas: [0.6, 0.1, 0.8, 5], luz: { dir: [-0.6, 0.7, 0.8], col: [1.8, 1.8, 1.85] } };
};

/* ================================================================ utilidades para adaptar escenas antiguas al estilo cine */
function cine(e, o) {
  e.suelo = o.suelo; e.entorno = o.entorno ?? 0.7; e.haz = o.haz ?? 1; e.hazX = o.hazX ?? 0.55; e.destello = o.destello ?? 0.2;
  if (o.sinScan) e.scan = null;
  if (o.cam) e.cam = o.cam;
  e.luces = (e.luces || []).concat(o.luces || []);
  e.particulas = e.particulas || [];
  polvo(e.particulas, { n: 110, centro: o.polvoC || [0, 0.5, 0.6], caja: [5, 3, 3], semilla: o.semilla || 31, alfa: 0.25, col: o.polvoCol }, o.t);
  return e;
}

/* ================================================================ ACEITE: aceite dorado cayendo sobre engranajes a cámara lenta */
const ACE2 = (() => {
  const gA = engr(0.62, 30, 0.12, 0.05, 0.12), gB = engr(0.42, 20, 0.12, 0.05, 0.1);
  const eje = cilindro(0.1, -0.35, 0.35, 32, 0.01);
  const boca = new Geo(); boca.add(torno([[0.09, -0.1], [0.12, -0.1], [0.12, 0.35], [0.16, 0.5], [0.16, 0.9], [0.13, 0.9], [0.13, 0.5], [0.09, 0.35]], 48));
  const NS = 60, LS = 14;
  const chorro = (t) => { const c = []; for (let i = 0; i <= NS; i++) { const s = i / NS; c.push([0.02 * Math.sin(s * 9 + t * TAU * 3) * s, 1.95 - s * 1.35, 0.03 * Math.sin(s * 7 - t * TAU * 2) * s]); }
    return tubo(c, (s) => 0.07 * (1 - 0.55 * s) * (1 + 0.18 * Math.sin(s * 23 - t * TAU * 9) * s), LS); };
  return { gA: new Malla(gA), gB: new Malla(gB), eje: new Malla(eje), boca: new Malla(boca), chorro, mChorro: new Malla(chorro(0), true), gotas: mallaGotas(700) };
})();
ESC.aceite = (t) => {
  const suelo = -0.9;
  const cam = camCine(t, { obj: [0.3, 0.25, 0.1], dist: 4.3, alt: 0.35, ang: 0.8, amp: 0.08, fov: 38, empuje: 0.07, ap: 0.06 });
  const rot = TAU * 0.5 * t; // media vuelta por bucle: cámara lenta
  const MA = cad(M4.T(0, 0, 0), M4.RX(Math.PI / 2), M4.RY(rot)), MB = cad(M4.T(1.0, 0.12, 0), M4.RX(Math.PI / 2), M4.RY(-rot * 30 / 20 + 0.08));
  const acero = MAT({ base: [0.8, 0.8, 0.82], metal: 1, rough: 0.2, clear: 0.9, pat: 1, pa: [700, 0, 0, 0] });
  ACE2.mChorro.actualizar(ACE2.chorro(t));
  const oro = MAT({ base: [0.7, 0.32, 0.02], metal: 0.1, rough: 0.1, clear: 0.35, emis: [0.5, 0.2, 0.01] });
  const sol = [D(ACE2.gA, MA, acero), D(ACE2.gB, MB, acero), D(ACE2.eje, M4.T(0, 0, 0), MATS.oscuro()), D(ACE2.eje, M4.T(1.0, 0.12, 0), MATS.oscuro()),
    D(ACE2.mChorro, M4.T(0.05, 0, 0), oro), D(ACE2.boca, cad(M4.T(0.05, 1.95, 0)), MAT({ base: [0.04, 0.04, 0.045], metal: 0, rough: 0.3, clear: 0.6 }))];
  const pts = [];
  const gota = (T) => [2.6, 1.35, 0.3], G = [];
  // salpicadura donde el chorro choca con el engranaje
  const imp = [0.05, 0.6, 0];
  chispas(pts, { n: 300, vueltas: 6, semilla: 101, suelo, rebote: 0.15, g: 14, arrastre: 1.4, v: [2, 6], vida: [0.08, 0.2], abre: 0.3, grosor: 0.013, estela: 0.004, color: gota, brillo: 0.5, solidos: G,
    pos: (R) => V.add(imp, [(R() - 0.5) * 0.1, 0, (R() - 0.5) * 0.1]), dir: (R) => { const a = R() * TAU; return [Math.cos(a) * 0.9, 0.55, Math.sin(a) * 0.9]; } }, t);
  // gotas que los dientes lanzan al girar
  let aG = 0;
  chispas(pts, { n: 160, vueltas: 4, semilla: 103, suelo, rebote: 0.1, g: 14, arrastre: 1.0, v: [2, 5], vida: [0.1, 0.28], abre: 0.15, grosor: 0.016, estela: 0.004, color: gota, brillo: 0.45, solidos: G,
    pos: (R) => { aG = Math.PI * (0.05 + R() * 0.4); return [Math.cos(aG) * 0.64, Math.sin(aG) * 0.64, (R() - 0.5) * 0.2]; }, dir: () => [-Math.sin(aG) * -1, Math.cos(aG) * -1 + 0.3, 0.1] }, t);
  // hilos de aceite que gotean de los dientes de abajo
  chispas(pts, { n: 50, vueltas: 3, semilla: 107, suelo, rebote: 0.05, g: 10, arrastre: 0.5, v: [0.2, 0.6], vida: [0.15, 0.33], abre: 0.1, grosor: 0.018, estela: 0.012, color: gota, brillo: 0.5, solidos: G,
    pos: (R) => [(R() - 0.5) * 1.6 + 0.4, -0.55 - R() * 0.1, (R() - 0.5) * 0.15], dir: () => [0, -1, 0] }, t);
  sol.push(D(actualizarGotas(ACE2.gotas, G), M4.I(), oro, { sinSombra: true }));
  polvo(pts, { n: 110, centro: [0.3, 0.6, 0.6], caja: [5, 3, 3], semilla: 33, alfa: 0.25 }, t);
  const luces = [{ p: [-0.6, 1.4, -1.3], c: [5, 3, 1.2], r: 5 }, { p: [1.8, 0.2, -1.2], c: [1.6, 2.0, 2.6], r: 4 }, { p: [0.3, 0.9, 1.2], c: [1.2, 0.8, 0.4], r: 3 }];
  return { cam, solidos: sol, particulas: pts, luces, suelo: { y: suelo, cx: 0.3, cz: 0.2, r: 5, humedad: 0.7 }, radio: 2.6,
    tinte: [1, 0.6, 0.2], bloom: 0.5, destello: 0.15, exposicion: 1.1, hazX: 0.5, entorno: 0.85, luz: { dir: [-0.5, 0.85, 0.55], col: [2, 1.95, 1.85] } };
};

/* ================================================================ AMOLADORA ("otro servicio"): corte de acero con lluvia de chispas */
const AMOL = (() => {
  const disco = new Geo(); disco.add(cilindro(0.5, -0.012, 0.012, 96, 0.004)); disco.add(cilindro(0.16, 0.012, 0.03, 48, 0.006)); disco.add(tuercaHex(0.07, 0.02), M4.T(0, 0.045, 0));
  const prot = torno([[0.52, -0.04], [0.56, -0.04], [0.56, 0.1], [0.2, 0.12], [0.2, 0.1], [0.53, 0.08], [0.53, -0.04]], 64, Math.PI * 0.95, Math.PI * 2.05);
  const cuerpo = new Geo(); cuerpo.add(cilindro(0.13, 0.05, 0.3, 40, 0.03)); cuerpo.add(cilindro(0.12, -0.2, 0.2, 40, 0.04), cad(M4.T(0.55, 0.2, 0), M4.RZ(-Math.PI / 2)));
  cuerpo.add(cilindro(0.1, 0.2, 1.1, 40, 0.05), cad(M4.T(0, 0.2, 0), M4.RZ(-Math.PI / 2))); cuerpo.add(cilindro(0.045, 0, 0.35, 20, 0.02), cad(M4.T(0.3, 0.2, 0), M4.RX(Math.PI / 2)));
  const barra = new Geo(); barra.add(caja(1.5, 0.09, 0.09, 0.01));
  const tornillo = new Geo(); tornillo.add(caja(0.35, 0.3, 0.32, 0.03)); tornillo.add(caja(0.08, 0.36, 0.3, 0.02), M4.T(-0.3, 0.1, 0)); tornillo.add(caja(0.08, 0.36, 0.3, 0.02), M4.T(0.3, 0.1, 0));
  return { disco: new Malla(disco), prot: new Malla(prot), cuerpo: new Malla(cuerpo), barra: new Malla(barra), tornillo: new Malla(tornillo) };
})();
ESC.otro = (t) => {
  const suelo = -0.62;
  const cam = camCine(t, { obj: [0.1, 0.05, 0.1], dist: 4.2, alt: 0.25, ang: 0.35, amp: 0.07, fov: 38, empuje: 0.07, ap: 0.06 });
  const giro = TAU * 3 * t, baja = 0.04 * Math.sin(TAU * t);
  const corte = [0.0, 0.09 + baja * 0.2, 0];
  // disco vertical (eje Z), tocando la barra por abajo
  const cD = [corte[0], corte[1] + 0.5, 0];
  const MD = cad(M4.T(cD[0], cD[1], cD[2]), M4.RX(Math.PI / 2), M4.RY(giro));
  const sol = [
    D(AMOL.barra, M4.T(0, 0, 0), MAT({ base: [0.42, 0.42, 0.44], metal: 1, rough: 0.35, pat: 1, pa: [300, 0, 0, 0] })),
    D(AMOL.tornillo, M4.T(-0.9, -0.36, 0), MAT({ base: [0.05, 0.12, 0.3], metal: 0.3, rough: 0.35, clear: 0.7 })),
    D(AMOL.disco, MD, MAT({ base: [0.18, 0.17, 0.16], metal: 0.4, rough: 0.6 })),
    D(AMOL.prot, cad(M4.T(cD[0], cD[1], cD[2] - 0.04), M4.RX(-Math.PI / 2)), MAT({ base: [0.5, 0.51, 0.53], metal: 1, rough: 0.3 })),
    D(AMOL.cuerpo, cad(M4.T(cD[0], cD[1], cD[2] - 0.05), M4.RX(-Math.PI / 2)), MAT({ base: [0.75, 0.3, 0.04], metal: 0, rough: 0.35, clear: 0.8 })),
  ];
  const pts = [];
  // lluvia de chispas: sale tangente al disco (gira hacia la cámara-derecha) y rebota en el suelo
  const fuente = chispas(pts, { n: 1300, vueltas: 3, semilla: 113, suelo, rebote: 0.45, g: 24, arrastre: 1.4, v: [9, 22], vida: [0.06, 0.28], abre: 0.16, grosor: 0.0055, estela: 0.003, brillo: 1.2,
    pos: (R) => [corte[0] + 0.02 + (R() - 0.5) * 0.04, corte[1] + (R() - 0.5) * 0.02, (R() - 0.5) * 0.03], dir: (R) => [1, -0.25 + R() * 0.3, 0.35 + (R() - 0.5) * 0.5] }, t);
  chispas(pts, { n: 80, vueltas: 2, semilla: 127, suelo, rebote: 0.3, g: 22, arrastre: 0.8, v: [5, 10], vida: [0.2, 0.4], abre: 0.3, grosor: 0.011, estela: 0.002, enfria: 0.8, brillo: 1.1,
    pos: () => corte, dir: () => [1, 0.1, 0.4] }, t);
  // el corte al rojo
  part(pts, corte, corte, [7, 4, 1.6, 1], 0.03);
  humo(pts, { n: 24, vueltas: 1, semilla: 19, pos: (R) => V.add(corte, [(R() - 0.5) * 0.1, 0.05, (R() - 0.5) * 0.1]), sube: 1.6, deriva: 0.9, tam: [0.15, 0.8], alfa: 0.05, col: [0.8, 0.75, 0.7] }, t);
  polvo(pts, { n: 120, centro: [0.4, 0.5, 0.6], caja: [5, 3, 3], semilla: 35, alfa: 0.28 }, t);
  const fl = 0.85 + 0.15 * Math.sin(TAU * 41 * t) * Math.sin(TAU * 17 * t);
  const luces = [{ p: [corte[0] + 0.15, corte[1] + 0.05, 0.25], c: V.mul([6, 3, 0.9], fl), r: 4.5 }, { p: [1.3, suelo + 0.3, 0.8], c: V.mul([3, 1.2, 0.3], fl), r: 3.5 }];
  if (fuente) luces.push({ p: fuente, c: V.mul([2.5, 1, 0.25], fl), r: 3 });
  return { cam, solidos: sol, particulas: pts, luces, suelo: { y: suelo, cx: 0.8, cz: 0.3, r: 5, humedad: 0.7 }, radio: 2.2,
    tinte: [1, 0.4, 0.12], bloom: 0.55, destello: 0.25, exposicion: 1.0, hazX: 0.55, entorno: 0.45, luz: { dir: [-0.55, 0.85, 0.6], col: [1.7, 1.75, 1.9] } };
};

/* ================================================================ DIAGNOSIS: centralita con pulsos y micro-arcos */
const _diag = ESC.diagnosis;
ESC.diagnosis = (t) => {
  const e = _diag(t);
  const pts = e.particulas;
  // micro-arcos entre los condensadores y el conector cuando pasa el pulso
  const fr = Math.floor(t * 96), pul = Math.pow(0.5 + 0.5 * Math.sin(TAU * 4 * t), 3);
  const puntos = [[-0.1, 0.18, 0.55], [0.2, 0.18, 0.55], [0.4, 0.18, -0.6], [-0.7, 0.18, -0.5], [-1.08, 0.2, 0.2], [0.15, 0.1, 0]];
  for (let k = 0; k < 3; k++) { const a = puntos[(fr + k * 2) % puntos.length], b = puntos[(fr * 3 + k + 1) % puntos.length]; if (a === b) continue; rayo(pts, a, b, fr * 7 + k, { niveles: 6, desv: 0.25, arco: [0, 0.15, 0], col: [1.2, 3, 6], brillo: 0.9 * pul, grosor: 0.003 }); }
  chispas(pts, { n: 160, vueltas: 4, semilla: 131, suelo: -0.3, rebote: 0.4, g: 16, arrastre: 1.5, v: [2, 6], vida: [0.05, 0.14], abre: 0.9, grosor: 0.0035, estela: 0.003, pos: (R) => puntos[Math.floor(R() * puntos.length)], dir: () => [0, 1, 0], intensidad: () => pul, color: (T) => [1.5 + 2 * T, 2.5 + 2 * T, 4], brillo: 0.9 }, t);
  cine(e, { t, suelo: { y: -0.3, cx: -0.4, cz: 0.2, r: 5, humedad: 0.6 }, entorno: 0.42, hazX: 0.45, destello: 0.25, semilla: 37, polvoCol: [0.8, 0.9, 1.1],
    cam: camCine(t, { obj: [-0.35, 0.1, 0], dist: 4.9, alt: 1.6, ang: 0.45, amp: 0.1, fov: 38, empuje: 0.08, ap: 0.05 }),
    luces: [{ p: [0, 0.6, 0], c: V.mul([0.8, 2.2, 3.6], 0.5 + 0.5 * pul), r: 3.5 }] });
  return e;
};

/* ================================================================ PRE-ITV: escáner láser que recorre el coche en un túnel con niebla */
const _itv = ESC.itv;
ESC.itv = (t) => {
  const e = _itv(t);
  // la carrocería queda sólida (sin corte en rayos X): el láser solo dibuja la malla verde donde ya ha pasado
  e.solidos.forEach((d) => { if (d.clip) d.clip = null; });
  e.rayosx = (e.rayosx || []).filter((d) => d.malla !== COCHE.cuerpo);
  const s = 2.6 - 5.2 * suave(tramo(t, 0.05, 0.8)), vis = t > 0.04 && t < 0.86;
  if (vis) for (let k = 0; k < 90; k++) { const y = 0.02 + (k / 90) * 1.7; e.particulas.push(s, y, -1.3, s, y, 1.3, 0.2, 2.4, 0.9, 0.08, 0.0022); }
  cine(e, { t, suelo: { y: 0.0, cx: 0, cz: 0.3, r: 5.5, humedad: 0.7 }, entorno: 0.75, hazX: 0.5, destello: 0.2, semilla: 39, polvoC: [0, 1, 0.8], polvoCol: [0.8, 1.1, 0.9],
    cam: camCine(t, { obj: [0, 0.6, 0], dist: 6.4, alt: 0.55, ang: 0.62, amp: 0.1, fov: 36, empuje: 0.07, ap: 0.07 }),
    luces: vis ? [{ p: [s, 0.9, 0.9], c: [0.6, 3.2, 1.3], r: 3.5 }, { p: [s, 0.9, -0.9], c: [0.6, 3.2, 1.3], r: 3.5 }] : [] });
  return e;
};

/* ================================================================ AIRE ACONDICIONADO: vaho helado y cristales de hielo */
const _aire = ESC.aire;
ESC.aire = (t) => {
  const e = _aire(t);
  // tubos sólidos de aluminio escarchado en vez de rayos X
  e.solidos.forEach((d) => { if (d.malla === AIRE.evap) { d.mat.base = [0.55, 0.6, 0.66]; d.mat.emis = [0.0, 0.01, 0.02]; d.mat.pb = [0.4, 0.9, 1.5, 0.06]; } if (d.malla === AIRE.cond) d.mat.pb = [0.3, 0.9, 1.6, 0.08]; });
  e.rayosx = []; AIRE.tubos.forEach((tb) => e.solidos.push(D(tb.m, M4.I(), MAT({ base: [0.8, 0.86, 0.92], metal: 0.7, rough: 0.45, emis: [0.02, 0.05, 0.08] }))));
  { const q = e.particulas, f = []; for (let i = 0; i < q.length; i += 11) if (!(q[i + 10] > 0.1)) for (let j = 0; j < 11; j++) f.push(q[i + j]); e.particulas = f; }
  const pts = e.particulas, ev = [-1.35, -0.05, 1.05];
  // chorro de vaho frío que sale del evaporador hacia la cámara (se enrosca a cámara lenta)
  humo(pts, { n: 60, vueltas: 1, semilla: 23, pos: (R) => V.add(ev, [(R() - 0.5) * 0.5, (R() - 0.5) * 0.4, 0.15]), dir: V.norm([0.5, 0.15, 0.85]), sube: 2.2, deriva: 0.9, tam: [0.2, 1.4], alfa: 0.12, col: [0.55, 0.75, 1.0] }, t);
  // cristales de hielo que destellan
  chispas(pts, { n: 260, vueltas: 2, semilla: 137, suelo: -0.9, rebote: 0.2, g: 2, arrastre: 1.2, v: [1, 3], vida: [0.2, 0.48], abre: 0.6, grosor: 0.004, estela: 0.001, color: (T) => [1.8, 2.3, 3], brillo: 0.6,
    pos: (R) => V.add(ev, [(R() - 0.5) * 0.4, (R() - 0.5) * 0.3, 0.12]), dir: () => [0.5, 0.25, 0.8] }, t);
  cine(e, { t, suelo: { y: -0.9, cx: -0.2, cz: 0.4, r: 5, humedad: 0.8 }, entorno: 0.75, hazX: 0.4, destello: 0.2, semilla: 41, polvoCol: [0.8, 0.95, 1.2],
    cam: camCine(t, { obj: [-0.25, 0.2, 0.3], dist: 5.3, alt: 0.8, ang: 0.55, amp: 0.1, fov: 38, empuje: 0.08, ap: 0.06 }),
    luces: [{ p: [-2.2, 1.4, -0.6], c: [0.8, 1.6, 3], r: 4 }] });
  return e;
};

/* ================================================================ DISTRIBUCIÓN: el motor por dentro, a cámara lenta */
ESC.distribucion = (t) => {
  const th = TAU * 1 * t; // una vuelta de cigüeñal por bucle
  const e = { solidos: motorDibujo(th), radio: 3.2, tinte: [0.9, 0.4, 0.15], bloom: 0.45, exposicion: 1.1, particulas: [], luz: { dir: [-0.5, 0.85, 0.5], col: [1.9, 1.9, 1.95] } };
  // neblina de aceite y chispa en la bujía de cada cilindro cuando le toca
  const orden = [0, 2, 3, 1];
  orden.forEach((c, i) => { const f = (t * 2 + i / 4) % 1; if (f < 0.06) { const x = MOTOR.X[c]; const k = 1 - f / 0.06; part(e.particulas, [x, 1.45, 0], [x, 1.45, 0], [3, 3.5, 6, k], 0.04); } });
  humo(e.particulas, { n: 30, vueltas: 1, semilla: 29, pos: (R) => [(R() - 0.5) * 3, 0.2 + R() * 0.6, (R() - 0.5) * 0.8], sube: 0.8, deriva: 0.6, tam: [0.3, 1.0], alfa: 0.035, col: [0.9, 0.75, 0.5] }, t);
  return cine(e, { t, suelo: { y: -0.72, cx: 0.4, cz: 0.2, r: 5.5, humedad: 0.6 }, entorno: 0.8, hazX: 0.55, destello: 0.15, semilla: 43, sinScan: true,
    cam: camCine(t, { obj: [0.55, 0.9, 0], dist: 6.4, alt: 1.0, ang: 0.95, amp: 0.1, fov: 36, empuje: 0.08, ap: 0.07 }),
    luces: [{ p: [2.6, 1.4, 0.8], c: [2.6, 1.2, 0.4], r: 4 }, { p: [-2.2, 2.2, -1], c: [0.8, 1.2, 2], r: 5 }] });
};

/* =====================================================================
   ESTILO v6 · "anuncio de gran marca": se aplica a TODAS las escenas
   luz clave azul acero delante · contraluz dorado potente detrás ·
   ángulo bajo con la pieza en los 2/3 superiores · tercio inferior limpio ·
   orbes de bokeh grandes y definidos (lámparas lejanas del taller) ·
   haz volumétrico dorado detrás de la pieza.
   ===================================================================== */
const ESTILO_CFG = {}; // por escena: { cam: (t) => {...}, lente, rim, clave, lamparas, ... }
function estiloCine(e, k, t) {
  const c = ESTILO_CFG[k] || {};
  if (c.cam) e.cam = c.cam(t);
  const cam = e.cam, up = [0, 1, 0];
  // ángulo bajo: la cámara baja (y se aleja un poco) sin mover el punto de mira → la pieza gana presencia
  if (c.bajar || c.alejar) {
    let ey = V.add(cam.target, V.mul(V.sub(cam.eye, cam.target), c.alejar || 1));
    ey[1] -= c.bajar || 0; if (e.suelo) ey[1] = Math.max(ey[1], e.suelo.y + 0.12); cam.eye = ey;
  }
  const F = V.norm(V.sub(cam.target, cam.eye)), R = V.norm(V.cross(F, up)), foco = V.len(V.sub(cam.target, cam.eye));
  cam.lente = c.lente ?? 0.2; cam.ap = c.ap ?? cam.ap ?? 0.011 * foco; cam.apBokeh = c.apB ?? 0.085 * foco;
  e.estilo = true; e.entorno = c.entorno ?? 1; e.limpio = c.limpio ?? 0.24;
  e.luz = { dir: V.norm(V.add(V.add(V.mul(F, -0.7), V.mul(up, 0.85)), V.mul(R, 0.3))), col: V.mul([1.3, 1.65, 2.25], c.clave ?? 1) };
  const T0 = cam.target, rim = c.rim ?? 1, rd = c.rimD ?? 2.2;
  const rims = [
    { p: V.add(V.add(V.add(T0, V.mul(F, rd)), V.mul(up, 1.3)), V.mul(R, 1.4)), c: V.mul([6.5, 3.6, 1.2], rim), r: 8 },
    { p: V.add(V.add(V.add(T0, V.mul(F, rd)), V.mul(up, 0.6)), V.mul(R, -1.5)), c: V.mul([5.5, 3.0, 1.0], rim), r: 8 },
  ];
  e.luces = rims.concat(e.luces || []);
  e.tinte = [1, 0.62, 0.28]; e.hazCol = [0.95, 0.66, 0.32]; e.haz = c.haz ?? 1.2; e.hazX = c.hazX ?? 0.5;
  e.exposicion = (e.exposicion || 1) * (c.exp ?? 1.05);
  // lámparas lejanas del taller → orbes de bokeh definidos (dorados y azul acero), deriva lenta y periódica
  const pts = e.particulas || (e.particulas = []), Rn = rng(c.semillaB || [...k].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7) >>> 0), nL = c.lamparas ?? 24;
  for (let i = 0; i < nL; i++) {
    const dz = 3.2 + Rn() * 5, dx = (Rn() - 0.5) * (4 + dz * 1.6), dy = -0.6 + Rn() * (1.0 + dz * 0.5), ph = Rn() * TAU, dor = Rn() < 0.62, br = 0.6 + Rn() * 0.9;
    const p = V.add(V.add(V.add(T0, V.mul(F, dz)), V.mul(R, dx + 0.12 * Math.sin(TAU * t + ph))), V.mul(up, dy + 0.06 * Math.cos(TAU * t + ph)));
    const col = dor ? [5.5, 3.3, 1.2] : [1.8, 2.6, 4.2];
    part(pts, p, p, [col[0] * br, col[1] * br, col[2] * br, 10], 0.016);
  }
  // motas cerca de la cámara (orbes grandes delante), solo en la mitad de arriba
  for (let i = 0; i < (c.motas ?? 7); i++) {
    const f = 0.18 + Rn() * 0.25, lat = (Rn() - 0.5) * foco * 0.9, alt = 0.1 + Rn() * foco * 0.35, ph = Rn() * TAU;
    const p = V.add(V.add(V.add(cam.eye, V.mul(F, foco * f)), V.mul(R, lat + 0.05 * Math.sin(TAU * t + ph))), V.mul(up, alt));
    part(pts, p, p, [3.2, 2.2, 1.2, 8], 0.004);
  }
  return e;
}
Object.assign(ESTILO_CFG, {
  frenos: { bajar: 0.35, alejar: 1.08, lente: 0.13 },
  neumaticos: { bajar: 0.1, lente: 0.15 },
  bateria: { bajar: 0.6, lente: 0.14 },
  golpes: { bajar: 0.6, alejar: 1.1, lente: 0.1 },
  pintura: { bajar: 0.6, lente: 0.1 },
  aranazos: { bajar: 0.6, alejar: 1.25, lente: 0.1 },
  aceite: { bajar: 0.9, lente: 0.15, clave: 1.7, rim: 1.3, entorno: 1.7 },
  diagnosis: { bajar: 0.8, lente: 0.12 },
  itv: { bajar: 0.85, lente: 0.14 },
  aire: { bajar: 0.7, lente: 0.12 },
  distribucion: { bajar: 1.4, lente: 0.14 },
  otro: { bajar: 0.5, lente: 0.13 },
});
