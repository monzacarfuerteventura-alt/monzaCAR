/* =====================================================================
   VOLCANO CARS · ESCENAS 3D (2/2): frenos, neumáticos, diagnosis,
   pre-ITV, aire, batería, carrocería (golpes, pintura, arañazos),
   aceite y despiece.
   ===================================================================== */
"use strict";
// partículas periódicas: devuelve fase 0..1 que da `vueltas` vueltas enteras por bucle
const fase = (R, t, vueltas) => (R() + t * vueltas) % 1;
const add3 = (a, b, s = 1) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];

/* ================================================================ FRENOS */
const FRENO = (() => {
  const g = new Geo();
  g.add(torno([[0.6, 0.035], [1.0, 0.035], [1.0, 0.035], [1.0, 0.11], [1.0, 0.11], [0.6, 0.11], [0.6, 0.11], [0.6, 0.035]], 160));
  g.add(torno([[0.6, -0.11], [1.0, -0.11], [1.0, -0.11], [1.0, -0.035], [1.0, -0.035], [0.6, -0.035], [0.6, -0.035], [0.6, -0.11]], 160));
  for (let k = 0; k < 40; k++) { const a = (k / 40) * TAU; g.add(caja(0.19, 0.036, 0.012, 0.004, 2), cad(M4.RY(-a - 0.25), M4.T(0.8, 0, 0))); }
  g.add(torno([[0.6, 0.11], [0.52, 0.11], [0.52, 0.11], [0.52, 0.36], [0.5, 0.38], [0.5, 0.38], [0.2, 0.38], [0.2, 0.38], [0.2, 0.33], [0.2, 0.33], [0.47, 0.33], [0.47, 0.33], [0.47, 0.11]], 96));
  const disco = new Malla(g);
  const hub = new Geo(); hub.add(torno([[0.0, 0.38], [0.18, 0.38], [0.18, 0.38], [0.16, 0.55], [0.1, 0.6], [0.0, 0.6]], 48));
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; hub.add(cilindro(0.028, 0.38, 0.62, 16, 0.006), M4.T(Math.cos(a) * 0.3, 0, Math.sin(a) * 0.3)); hub.add(tuercaHex(0.045, 0.02), M4.T(Math.cos(a) * 0.3, 0.4, Math.sin(a) * 0.3)); }
  const cubo = new Malla(hub);
  // pinza: dos mitades + puente, en coordenadas de la pinza (x tangente, y radial, z eje del disco)
  const mitad = new Geo(); mitad.add(caja(0.46, 0.2, 0.085, 0.06)); mitad.add(caja(0.3, 0.12, 0.03, 0.02), M4.T(0, 0.02, 0.09));
  for (const x of [-0.33, 0.33]) mitad.add(cilindro(0.035, 0.08, 0.14, 16, 0.006), cad(M4.T(x, -0.08, 0), M4.RX(Math.PI / 2)));
  const puente = new Geo(); puente.add(caja(0.46, 0.06, 0.26, 0.05));
  const pist = new Geo(); for (const x of [-0.18, 0.18]) pist.add(cilindro(0.09, -0.05, 0.05, 32, 0.008), cad(M4.T(x, 0, 0), M4.RX(Math.PI / 2)));
  return { disco, cubo, mitad: new Malla(mitad), puente: new Malla(puente), pastilla: new Malla(caja(0.38, 0.13, 0.022, 0.02)), soporte: new Malla(caja(0.38, 0.14, 0.008, 0.005)), pist: new Malla(pist) };
})();
ESC.frenos = (t) => {
  const giro = -TAU * 4 * t, apr = 0.5 - 0.5 * Math.cos(TAU * 2 * t), calor = 0.42 + 0.3 * (0.5 - 0.5 * Math.cos(TAU * t));
  const zoom = 1 - 0.14 * (0.5 - 0.5 * Math.cos(TAU * t));
  const cam = orbita(t, 4.3 * zoom, 0.55, 0.55, 0.18, [0.12, 0.08, 0], 30, 0.95);
  const MD = cad(M4.RX(Math.PI / 2), M4.RY(giro)); // eje del disco = Z
  const sol = [D(FRENO.disco, MD, MAT({ base: [0.52, 0.53, 0.55], metal: 1, rough: 0.34, pat: 2, pa: [calor, 0.55, 0, 0] })), D(FRENO.cubo, MD, MAT({ base: [0.75, 0.76, 0.78], metal: 1, rough: 0.2 }))];
  const ang = 0.95, Mc = cad(M4.RZ(ang - Math.PI / 2), M4.T(0, 0.83, 0));
  const hueco = 0.03 * (1 - apr);
  const rojo = MATS.rojoPinza(), s = (0.5 + 0.5 * Math.sin(TAU * t - 1.2));
  const sx = -0.9 + 2.2 * suave(tramo(t, 0.25, 0.55)) - 2.2 * suave(tramo(t, 0.7, 0.95)); // rayos X que barren la pinza
  const nrm = [Math.cos(ang), Math.sin(ang), 0];
  const clipO = [...V.mul([1, 0, 0], 1), sx], clipX = [-1, 0, 0, -sx];
  const piezas = [[FRENO.mitad, cad(Mc, M4.T(0, 0, 0.21 + hueco * 0.5)), rojo], [FRENO.mitad, cad(Mc, M4.T(0, 0, -0.21 - hueco * 0.5), M4.RY(Math.PI)), rojo], [FRENO.puente, cad(Mc, M4.T(0, 0.23, 0)), rojo]];
  piezas.forEach(([m, M, mt]) => { sol.push(D(m, M, mt, { clip: clipO })); });
  const xr = [];
  piezas.forEach(([m, M]) => xr.push(D(m, M, MAT({ xray: 1, xcol: [0.35, 0.9, 1.5] }), { clip: clipX })));
  for (const zz of [1, -1]) {
    sol.push(D(FRENO.pastilla, cad(Mc, M4.T(0, -0.02, zz * (0.135 + hueco))), MAT({ base: [0.09, 0.085, 0.08], metal: 0.2, rough: 0.8 })));
    sol.push(D(FRENO.soporte, cad(Mc, M4.T(0, -0.02, zz * (0.165 + hueco))), MATS.acero()));
    sol.push(D(FRENO.pist, cad(Mc, M4.T(0, -0.02, zz * (0.21 + hueco))), MATS.cromo()));
  }
  // chispas en el borde de salida de la pastilla
  const pts = [], R = rng(21), a0 = ang - 0.22, borde = [Math.cos(a0) * 0.98, Math.sin(a0) * 0.98, 0];
  const tang = [Math.sin(a0), -Math.cos(a0), 0];
  for (let k = 0; k < 260; k++) {
    const ph = fase(R, t, 3 + Math.floor(R() * 3)), v = 1.2 + R() * 2.4, sp = (R() - 0.5) * 0.9, zz = (R() - 0.5) * 0.28;
    const d = V.norm(add3(tang, nrm, 0.35 + sp)), vida = 0.35 + R() * 0.35, tt = ph * vida;
    const p = [borde[0] + d[0] * v * tt, borde[1] + d[1] * v * tt - 2.4 * tt * tt, zz + d[2] * tt], q = [p[0] - d[0] * 0.07, p[1] - d[1] * 0.07 + 0.09 * tt, p[2]];
    const k2 = 1 - ph, i = apr * (0.4 + 0.6 * calor);
    part(pts, q, p, [4 * k2 + 1, 1.6 * k2 + 0.3, 0.35 * k2, i * k2], 0.006);
  }
  for (let k = 0; k < 40; k++) { const ph = fase(R, t, 1), a = R() * TAU, r = 0.65 + R() * 0.33; const p = [Math.cos(a) * r, Math.sin(a) * r + ph * 0.6, 0.15 + R() * 0.3]; part(pts, p, p, [2.5, 0.7, 0.15, 0.5 * calor * Math.sin(Math.PI * ph)], 0.008); }
  return { cam, solidos: sol, rayosx: xr, particulas: pts, radio: 1.6, tinte: [1, 0.25, 0.1], bloom: 0.75, exposicion: 1.0, luz: { dir: [-0.4, 0.8, 0.8], col: [2.2, 2.15, 2.1] },
    scan: { eje: [1, 0, 0], pos: sx, ancho: 0.02, col: [0.3, 0.9, 1.6] } };
};

/* ================================================================ NEUMÁTICOS */
const RUEDA = (() => {
  const A0 = 0.35, A1 = 0.35 + TAU - 1.15; // corte en cuña para ver las capas
  const ext = [[0.62, -0.25], [0.66, -0.31], [0.77, -0.34], [0.88, -0.325], [0.95, -0.29], [0.985, -0.245], [0.99, -0.12], [0.99, 0.12], [0.985, 0.245], [0.95, 0.29], [0.88, 0.325], [0.77, 0.34], [0.66, 0.31], [0.62, 0.25]];
  const int = ext.map(([r, y]) => [r - (r > 0.9 ? 0.07 : 0.045), y * 0.86]).reverse();
  const lazo = [...ext, ...int, ext[0]];
  const goma = new Geo(); goma.add(torno(lazo, 160, A0, A1));
  const R = rng(4);
  for (let k = 0; k < 72; k++) { const a = (k / 72) * TAU; if (a > A1 - 0.04 || a < A0 + 0.04) continue; for (const [y, dx] of [[-0.17, 0], [0, 0.5], [0.17, 0]]) goma.add(caja(0.03, 0.068, 0.045, 0.012, 3), cad(M4.RY(-(a + dx * 0.087)), M4.T(1.0, y, 0), M4.RX(0.25))); }
  const acero = torno([[0.915, -0.23], [0.93, -0.23], [0.93, 0.23], [0.915, 0.23], [0.915, -0.23]], 160, A0 - 0.02, A1 + 0.02);
  const carcasa = torno(ext.map(([r, y]) => [r - 0.03, y * 0.93]).concat(ext.map(([r, y]) => [r - 0.037, y * 0.92]).reverse()).concat([[ext[0][0] - 0.03, ext[0][1] * 0.93]]), 160, A0 - 0.01, A1 + 0.01);
  const llanta = new Geo();
  llanta.add(torno([[0.55, -0.27], [0.63, -0.28], [0.63, -0.28], [0.63, -0.24], [0.58, -0.22], [0.57, 0.22], [0.62, 0.24], [0.62, 0.28], [0.62, 0.28], [0.54, 0.27], [0.54, 0.27], [0.53, -0.26]], 120));
  for (let k = 0; k < 5; k++) for (const s of [-1, 1]) { const a = (k / 5) * TAU + s * 0.13; llanta.add(caja(0.21, 0.03, 0.035, 0.02, 3), cad(M4.RY(-a), M4.T(0.34, 0.2, 0), M4.RZ(-0.08), M4.RY(s * 0.12))); }
  llanta.add(torno([[0, 0.28], [0.16, 0.28], [0.18, 0.2], [0.18, 0.14], [0.13, 0.12], [0, 0.12]], 64));
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + TAU / 10; llanta.add(tuercaHex(0.032, 0.03), M4.T(Math.cos(a) * 0.1, 0.3, Math.sin(a) * 0.1)); }
  return { goma: new Malla(goma), acero: new Malla(acero), carcasa: new Malla(carcasa), llanta: new Malla(llanta), A0, A1, ext };
})();
ESC.neumaticos = (t) => {
  const giro = -TAU * 2 * t;
  const cam = orbita(t, 4.4, 0.35, 0.72, 0.2, [0, 0, 0], 32, 0.95);
  const M = cad(M4.RY(0.25), M4.RX(Math.PI / 2), M4.RY(giro));
  const sx = -1.3 + 2.6 * ((t * 2) % 1);
  const sol = [
    D(RUEDA.goma, M, MAT({ base: [0.03, 0.03, 0.032], metal: 0, rough: 0.8, pat: 6 })),
    D(RUEDA.carcasa, M, MAT({ base: [0.65, 0.5, 0.2], metal: 0, rough: 0.55 })),
    D(RUEDA.acero, M, MAT({ base: [0.8, 0.8, 0.82], metal: 1, rough: 0.28 })),
    D(RUEDA.llanta, M, MAT({ base: [0.78, 0.79, 0.8], metal: 1, rough: 0.18, pat: 1, pa: [1300, 0, 0, 0] })),
    D(FRENO.disco, cad(M, M4.T(0, -0.08, 0), M4.S(0.52)), MAT({ base: [0.5, 0.5, 0.52], metal: 1, rough: 0.35, pat: 2, pa: [0, 0, 0, 0] })),
  ];
  const pts = [], R = rng(8);
  // borde del corte resaltado (rayos X)
  for (const a of [RUEDA.A0, RUEDA.A1]) RUEDA.ext.forEach(([r, y], i) => { if (!i) return; const p0 = RUEDA.ext[i - 1]; const A = M4.ap(M, [Math.cos(a) * p0[0], p0[1], Math.sin(a) * p0[0]]), B = M4.ap(M, [Math.cos(a) * r, y, Math.sin(a) * r]); part(pts, A, B, [0.4, 1.6, 2.6, 0.9], 0.004); });
  // polvo de goma y chispas en la huella
  const contacto = M4.ap(cad(M4.RY(0.25)), [0, -1.0, 0]);
  for (let k = 0; k < 170; k++) { const ph = fase(R, t, 3 + Math.floor(R() * 3)); const zz = (R() - 0.5) * 0.55; const v = [-(1.4 + R() * 2.2), 0.15 + R() * 0.7, (R() - 0.5) * 0.4]; const p = add3(add3(contacto, [0, 0, zz]), v, ph * 0.55); p[1] -= 0.6 * ph * ph * 0.3; const q = add3(p, v, -0.03); const hot = R() > 0.82; part(pts, q, p, hot ? [3, 1.2, 0.3, 1 - ph] : [0.55, 0.6, 0.65, 0.5 * (1 - ph)], hot ? 0.005 : 0.009); }
  for (let k = 0; k < 26; k++) { const ph = fase(R, t, 4), y = -1.02, zz = (R() - 0.5) * 0.9; const x = 2.4 - ph * 4.8; part(pts, [x, y, zz], [x - 0.35, y, zz], [0.4, 1.2, 2, 0.35], 0.004); }
  return { cam, solidos: sol, particulas: pts, radio: 1.5, tinte: [0.3, 0.7, 1], bloom: 0.6, exposicion: 1.05, luz: { dir: [-0.6, 0.7, 0.7], col: [2.3, 2.3, 2.3] },
    scan: { eje: [1, 0, 0], pos: sx, ancho: 0.025, col: [0.3, 1.0, 1.8] } };
};

/* ================================================================ DIAGNOSIS (centralita) */
const ECU = (() => {
  const car = new Geo(); car.add(caja(1.3, 0.09, 0.92, 0.05));
  for (let k = 0; k < 14; k++) car.add(caja(1.24, 0.05, 0.012, 0.006, 2), M4.T(0, -0.13, -0.8 + k * 0.123));
  const pcb = caja(1.2, 0.018, 0.82, 0.01, 2);
  const comp = new Geo();
  comp.add(caja(0.3, 0.035, 0.3, 0.01, 2), M4.T(0.15, 0.05, 0));
  for (let k = 0; k < 20; k++) for (const s of [-1, 1]) { comp.add(caja(0.007, 0.006, 0.03, 0.002, 1), M4.T(0.15 - 0.27 + k * 0.0284, 0.03, s * 0.32)); comp.add(caja(0.03, 0.006, 0.007, 0.002, 1), M4.T(0.15 + s * 0.32, 0.03, -0.27 + k * 0.0284)); }
  [[0.75, 0.4, 0.14, 0.1], [0.75, -0.35, 0.16, 0.12], [-0.45, 0.45, 0.12, 0.08], [-0.45, -0.1, 0.2, 0.14], [0.6, 0.05, 0.08, 0.2]].forEach(([x, z, a, b]) => comp.add(caja(a, 0.025, b, 0.008, 2), M4.T(x, 0.04, z)));
  const cond = new Geo(); [[-0.1, 0.55], [0.05, 0.55], [0.2, 0.55], [0.4, -0.6], [0.55, -0.6], [-0.7, -0.5]].forEach(([x, z]) => cond.add(cilindro(0.045, 0.02, 0.16, 24, 0.01), M4.T(x, 0, z)));
  const con = new Geo(); con.add(caja(0.13, 0.11, 0.62, 0.02), M4.T(-1.08, 0.08, 0));
  const pines = new Geo(); for (let k = 0; k < 18; k++) for (const y of [0.04, 0.12]) pines.add(caja(0.06, 0.008, 0.008, 0.003, 1), M4.T(-1.23, y, -0.5 + k * 0.059));
  const tapa = caja(1.32, 0.045, 0.93, 0.04);
  const cables = [];
  for (let k = 0; k < 7; k++) { const z = -0.45 + k * 0.15; cables.push(new Malla(tubo(Array.from({ length: 40 }, (_, i) => { const s = i / 39; return [-1.2 - s * 2.6, 0.08 + Math.sin(s * 3) * 0.25 * (k % 2 ? 1 : -1) - s * 0.4, z + (s * s) * (k - 3) * 0.35]; }), 0.028, 12))); }
  return { car: new Malla(car), pcb: new Malla(pcb), comp: new Malla(comp), cond: new Malla(cond), con: new Malla(con), pines: new Malla(pines), tapa: new Malla(tapa), cables };
})();
ESC.diagnosis = (t) => {
  const cam = orbita(t, 4.6, 2.4, 0.5, 0.25, [-0.25, 0.1, 0], 30, 0.95);
  const sube = 0.5 - 0.5 * Math.cos(TAU * t), R0 = ((t * 2) % 1) * 1.9;
  const sol = [
    D(ECU.car, M4.T(0, -0.1, 0), MAT({ base: [0.78, 0.79, 0.8], metal: 1, rough: 0.35 })),
    D(ECU.pcb, M4.I(), MAT({ base: [0.015, 0.06, 0.035], metal: 0, rough: 0.35, pat: 3, pa: [11, R0, 0, 0] })),
    D(ECU.comp, M4.I(), MAT({ base: [0.02, 0.02, 0.022], metal: 0, rough: 0.35 })),
    D(ECU.cond, M4.I(), MAT({ base: [0.8, 0.8, 0.82], metal: 1, rough: 0.2, pat: 1, pa: [2000, 0, 0, 0] })),
    D(ECU.con, M4.I(), MATS.plastico()), D(ECU.pines, M4.I(), MATS.oro()),
    D(ECU.tapa, cad(M4.T(0, 0.35 + 0.55 * sube, 0), M4.RZ(0.12 * sube)), MAT({ base: [0.8, 0.81, 0.82], metal: 1, rough: 0.28, pat: 1, pa: [600, 0, 0, 0] })),
  ];
  const cols = [[0.6, 0.05, 0.03], [0.7, 0.55, 0.05], [0.04, 0.2, 0.6], [0.05, 0.4, 0.12], [0.05, 0.05, 0.05], [0.6, 0.3, 0.05], [0.5, 0.5, 0.52]];
  ECU.cables.forEach((m, k) => sol.push(D(m, M4.I(), MAT({ base: cols[k], metal: 0, rough: 0.4, pat: 10, pa: [1.2, 2, 18, 0], pb: [0.3, 1.8, 3, 1.3] }))));
  const pts = [], R = rng(3);
  for (let r = 0; r < 2; r++) { const rad = ((t * 2 + r * 0.5) % 1) * 2.2; for (let k = 0; k < 90; k++) { const a = (k / 90) * TAU; const p = [Math.cos(a) * rad, 0.06, Math.sin(a) * rad * 0.8]; part(pts, p, p, [0.3, 1.6, 2.6, 0.8 * (1 - rad / 2.2)], 0.01); } }
  for (let k = 0; k < 60; k++) { const ph = fase(R, t, 2); const x = (R() - 0.5) * 2.2, z = (R() - 0.5) * 1.5; const p = [x, 0.05 + ph * 1.2, z]; part(pts, p, add3(p, [0, 0.05, 0]), [0.3, 1.5, 2.5, 0.6 * Math.sin(Math.PI * ph)], 0.004); }
  return { cam, solidos: sol, particulas: pts, radio: 2, tinte: [0.3, 0.8, 1], bloom: 0.7, exposicion: 1.0, luz: { dir: [-0.3, 0.9, 0.4], col: [2.2, 2.2, 2.25] } };
};

/* ================================================================ PRE-ITV (coche con escáner holográfico) */
const COCHE = (() => {
  const S = (x, a, b) => suave(clamp((x - a) / (b - a)));
  const bot = (x) => 0.24 + 0.2 * Math.exp(-Math.pow((Math.abs(x) - 1.38) / 0.3, 2));
  const belt = (x) => 0.5 + 0.22 * S(x, 2.25, 1.55) + 0.1 * S(x, 1.4, -1.0) - 0.14 * S(x, -2.0, -2.28);
  const top = (x) => belt(x) + 0.52 * S(x, 0.85, 0.05) * (1 - S(x, -0.95, -1.8));
  const ancho = (x) => 0.9 * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x) / 2.28, 6)), 0.22);
  const chaikin = (p, n) => { for (let k = 0; k < n; k++) { const q = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } q.push(p[p.length - 1]); p = q; } return p; };
  const remuestra = (p, n) => { const L = [0]; for (let i = 1; i < p.length; i++) L.push(L[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1])); const out = []; let j = 0; for (let k = 0; k < n; k++) { const s = (k / (n - 1)) * L[L.length - 1]; while (j < L.length - 2 && L[j + 1] < s) j++; const f = (s - L[j]) / (L[j + 1] - L[j] || 1); out.push([p[j][0] + (p[j + 1][0] - p[j][0]) * f, p[j][1] + (p[j + 1][1] - p[j][1]) * f]); } return out; };
  const g = new Geo(), NX = 120, NH = 30;
  for (let i = 0; i <= NX; i++) {
    const x = 2.25 - (4.5 * i) / NX, w = Math.max(ancho(x), 0.004), b0 = bot(x), be = belt(x), tp = top(x), wc = w * 0.74, cab = tp - be > 0.06;
    let pl = [[0, b0], [w * 0.9, b0], [w, b0 + 0.07], [w, be - 0.07], [w * 0.97, be], [wc + (w - wc) * (cab ? 0 : 0.6), be + 0.02]];
    pl = pl.concat(cab ? [[wc * 0.93, tp - 0.06], [wc * 0.78, tp], [0, tp + 0.01]] : [[0, be + 0.03]]);
    const half = remuestra(chaikin(pl, 3), NH + 1);
    const ring = half.map(([z, y]) => [z, y]).concat(half.slice(0, -1).reverse().slice(0).map(([z, y]) => [-z, y]).slice(0));
    // ring: de abajo-centro por la derecha hasta el techo y de vuelta por la izquierda
    ring.forEach(([z, y], j) => g.v([x, y, z], [0, 0, 1], [i / NX, j / (ring.length - 1)]));
  }
  const NA = 2 * NH + 1;
  for (let i = 0; i < NX; i++) for (let j = 0; j < NA - 1; j++) { const a = i * NA + j, c = a + NA; g.quad(a, a + 1, c + 1, c); }
  normales(g);
  const rueda = new Geo(); rueda.add(torno([[0.2, -0.13], [0.3, -0.13], [0.34, -0.1], [0.345, 0], [0.34, 0.1], [0.3, 0.13], [0.2, 0.13], [0.2, -0.13]], 64));
  const llanta = new Geo(); llanta.add(torno([[0, 0.12], [0.21, 0.12], [0.21, 0.12], [0.21, -0.1], [0, -0.1]], 48)); for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU; llanta.add(caja(0.1, 0.012, 0.022, 0.008, 2), cad(M4.RY(-a), M4.T(0.1, 0.13, 0))); }
  const chasis = new Geo();
  for (const z of [-0.42, 0.42]) chasis.add(caja(1.9, 0.05, 0.06, 0.02), M4.T(0, 0.34, z));
  for (const x of [-1.5, -0.7, 0.2, 1.1, 1.7]) chasis.add(caja(0.05, 0.04, 0.44, 0.015), M4.T(x, 0.34, 0));
  chasis.add(caja(0.34, 0.2, 0.28, 0.05), M4.T(1.5, 0.56, 0)); chasis.add(caja(0.3, 0.15, 0.18, 0.04), M4.T(0.85, 0.52, 0));
  chasis.add(tubo([[0.8, 0.4, 0.15], [0.2, 0.36, 0.2], [-1.2, 0.36, 0.2], [-1.8, 0.4, 0.3], [-2.3, 0.42, 0.3]], 0.035, 12));
  chasis.add(caja(0.35, 0.1, 0.35, 0.04), M4.T(-1.35, 0.42, -0.1));
  for (const x of [-1.38, 1.38]) { chasis.add(cilindro(0.03, -0.72, 0.72, 16), cad(M4.T(x, 0.33, 0), M4.RX(Math.PI / 2))); for (const z of [-0.6, 0.6]) { chasis.add(muelle(0.07, 0.013, 5, 8), cad(M4.T(x, 0.36, z), M4.S(1, 0.36, 1))); chasis.add(cilindro(0.025, 0.36, 0.72, 12), M4.T(x, 0, z)); } }
  for (const [x, z] of [[-0.2, 0.3], [-0.2, -0.3], [0.45, 0.3], [0.45, -0.3]]) chasis.add(caja(0.2, 0.22, 0.2, 0.06), M4.T(x, 0.62, z));
  return { cuerpo: new Malla(g), rueda: new Malla(rueda), llanta: new Malla(llanta), chasis: new Malla(chasis), plano: new Malla(caja(0.006, 0.72, 1.1, 0.004, 1)) };
})();
ESC.itv = (t) => {
  const cam = orbita(t, 6.2, 1.05, 0.55, 0.22, [0, 0.6, 0], 32, 0.9);
  const s = 2.6 - 5.2 * suave(tramo(t, 0.05, 0.8)), vis = t > 0.04 && t < 0.86 ? 1 : 0;
  const sc = vis ? s : 99;
  const pintura = MAT({ base: [0.06, 0.065, 0.075], metal: 0.6, rough: 0.3, clear: 1, flake: 0.8, pat: 5, pa: [sc, vis, 0, 0] });
  const sol = [D(COCHE.cuerpo, M4.I(), pintura, { clip: [1, 0, 0, sc] })];
  const xr = [D(COCHE.cuerpo, M4.I(), MAT({ xray: 1, xcol: [0.25, 1.4, 0.7] }), { clip: [-1, 0, 0, -sc] })];
  sol.push(D(COCHE.chasis, M4.I(), MAT({ base: [0.55, 0.56, 0.58], metal: 1, rough: 0.35, pat: 5, pa: [sc, 0, 0, 0] })));
  const giro = -TAU * 3 * t;
  for (const x of [-1.38, 1.38]) for (const z of [-0.76, 0.76]) {
    const Mw = cad(M4.T(x, 0.34, z), M4.RX(Math.PI / 2 * (z > 0 ? 1 : -1)), M4.RY(giro * (z > 0 ? 1 : -1)));
    sol.push(D(COCHE.rueda, Mw, MAT({ base: [0.03, 0.03, 0.032], metal: 0, rough: 0.75, pat: 5, pa: [sc, 0, 0, 0] })));
    sol.push(D(COCHE.llanta, Mw, MAT({ base: [0.75, 0.76, 0.78], metal: 1, rough: 0.2, pat: 5, pa: [sc, 0, 0, 0] })));
  }
  if (vis) xr.push(D(COCHE.plano, M4.T(s, 0.75, 0), MAT({ xray: 0.55, xcol: [0.2, 1.5, 0.8] })));
  const pts = [], CK = [[2.2, 0.55, 0.55], [2.2, 0.55, -0.55], [1.9, 0.3, 0], [1.38, 0.34, 0.76], [1.38, 0.34, -0.76], [1.0, 0.9, 0], [0.4, 1.28, 0], [0.4, 0.34, 0.45], [-0.5, 0.36, 0], [-1.38, 0.34, 0.76], [-1.38, 0.34, -0.76], [-2.2, 0.6, 0.55], [-2.2, 0.6, -0.55], [-1.7, 0.36, 0.3]];
  CK.forEach((p, i) => { const ok = vis && p[0] > s; const pul = 0.6 + 0.4 * Math.sin(TAU * t * 4 + i); part(pts, p, p, ok ? [0.3, 3.0, 1.1, 1] : [0.3, 1.2, 2.2, 0.55 * pul], ok ? 0.035 : 0.022); if (ok) part(pts, p, add3(p, [0, 0.35, 0]), [0.3, 2.2, 0.9, 0.35], 0.004); });
  if (vis) for (let k = 0; k < 60; k++) { const y = 0.02 + (k / 60) * 1.55; part(pts, [s, y, -1.25], [s, y, 1.25], [0.15, 1.2, 0.5, 0.06], 0.002); }
  for (let k = -12; k <= 12; k++) { part(pts, [k * 0.25, 0.0, -1.6], [k * 0.25, 0.0, 1.6], [0.2, 0.9, 0.6, 0.12], 0.0018); }
  for (let k = -6; k <= 6; k++) { part(pts, [-3, 0.0, k * 0.25], [3, 0.0, k * 0.25], [0.2, 0.9, 0.6, 0.12], 0.0018); }
  return { cam, solidos: sol, rayosx: xr, particulas: pts, radio: 2.8, tinte: [0.2, 0.9, 0.5], bloom: 0.65, exposicion: 1.0, luz: { dir: [-0.3, 0.9, 0.5], col: [2.2, 2.2, 2.2] } };
};

/* ================================================================ AIRE ACONDICIONADO */
const AIRE = (() => {
  const comp = new Geo(); comp.add(torno([[0, -0.45], [0.28, -0.45], [0.3, -0.42], [0.3, 0.3], [0.3, 0.3], [0.26, 0.34], [0.26, 0.34], [0, 0.34]], 64));
  for (let k = 0; k < 5; k++) comp.add(torno([[0.3, -0.3 + k * 0.13], [0.315, -0.28 + k * 0.13], [0.315, -0.26 + k * 0.13], [0.3, -0.24 + k * 0.13]], 64));
  const pol = new Geo(); pol.add(torno([[0.08, 0.36], [0.27, 0.36], ...Array.from({ length: 12 }, (_, i) => [0.27 + (i % 2) * 0.018, 0.37 + i * 0.012]), [0.27, 0.52], [0.08, 0.52]], 72)); pol.add(tuercaHex(0.05, 0.02), M4.T(0, 0.54, 0));
  const cond = new Geo(); cond.add(caja(1.1, 0.7, 0.05, 0.015, 3));
  const serp = []; for (let i = 0; i < 9; i++) { const y = 0.6 - i * 0.15; serp.push([i % 2 ? 1.05 : -1.05, y, 0.07], [i % 2 ? -1.05 : 1.05, y, 0.07]); }
  cond.add(tubo(serp, 0.022, 10));
  const evap = new Geo(); evap.add(caja(0.45, 0.32, 0.12, 0.02, 3));
  const rutas = [
    [[1.0, 0.25, 0.6], [1.2, 0.8, 0.4], [1.0, 1.2, -0.2], [0.6, 1.0, -0.62], [0.2, 0.62, -0.72]],
    [[-1.05, 0.6, -0.65], [-1.5, 0.4, -0.3], [-1.6, 0.1, 0.4], [-1.45, -0.15, 0.95]],
    [[-1.1, -0.2, 1.15], [-0.4, -0.55, 1.0], [0.4, -0.4, 0.7], [0.85, -0.1, 0.55]],
  ];
  const cr = (pts, s) => { const n = pts.length - 1, f = s * n, i = Math.min(n - 1, Math.floor(f)), k = f - i; const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n, i + 2)]; return [0, 1, 2].map((c) => 0.5 * (2 * p1[c] + (-p0[c] + p2[c]) * k + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * k * k + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * k * k * k)); };
  const tubos = rutas.map((r) => { const c = Array.from({ length: 60 }, (_, i) => cr(r, i / 59)); return { c, m: new Malla(tubo(c, 0.07, 18)), alma: new Malla(tubo(c, 0.03, 10)) }; });
  return { comp: new Malla(comp), pol: new Malla(pol), cond: new Malla(cond), evap: new Malla(evap), tubos, cr, rutas };
})();
ESC.aire = (t) => {
  const cam = orbita(t, 5.6, 1.1, 0.5, 0.22, [-0.2, 0.25, 0.2], 32, 0.9);
  const Mcomp = cad(M4.T(0.95, 0.1, 0.45), M4.RZ(-Math.PI / 2));
  const sol = [
    D(AIRE.comp, Mcomp, MAT({ base: [0.7, 0.71, 0.72], metal: 1, rough: 0.38 })),
    D(AIRE.pol, cad(Mcomp, M4.RY(TAU * 6 * t)), MAT({ base: [0.8, 0.8, 0.82], metal: 1, rough: 0.22, pat: 1, pa: [800, 0, 0, 0] })),
    D(AIRE.cond, M4.T(-0.1, 0.05, -0.75), MAT({ base: [0.72, 0.74, 0.76], metal: 1, rough: 0.35, pat: 7, pa: [420, 0, 0, 0], pb: [0.3, 0.9, 1.6, 0.25 + 0.2 * Math.sin(TAU * t)] })),
    D(AIRE.evap, cad(M4.T(-1.35, -0.05, 1.05), M4.RY(0.5)), MAT({ base: [0.85, 0.92, 1.0], metal: 0.2, rough: 0.55, emis: [0.05, 0.18, 0.32], pat: 7, pa: [300, 0, 0, 0], pb: [0.5, 1.2, 2.0, 0.6] })),
  ];
  const xr = [], pts = [], R = rng(12);
  AIRE.tubos.forEach((tb, i) => {
    xr.push(D(tb.m, M4.I(), MAT({ xray: 1, xcol: [0.45, 1.0, 1.6] })));
    for (let k = 0; k < 120; k++) { const s = (k / 120 + t * (2 + i)) % 1; const p = AIRE.cr(AIRE.rutas[i], s); const q = AIRE.cr(AIRE.rutas[i], Math.max(0, s - 0.012)); const j = [(R() - 0.5) * 0.06, (R() - 0.5) * 0.06, (R() - 0.5) * 0.06]; part(pts, add3(q, j), add3(p, j), R() > 0.7 ? [2.2, 2.6, 3, 0.9] : [0.5, 1.4, 2.6, 0.8], 0.007); }
  });
  // vaho helado y cristales de hielo alrededor del evaporador
  const ev = [-1.35, -0.05, 1.05];
  for (let k = 0; k < 70; k++) { const ph = fase(R, t, 1 + Math.floor(R() * 2)); const d = V.norm([R() - 0.3, R() * 0.6 - 0.1, R() - 0.2]); const p = add3(ev, d, 0.3 + ph * 1.6); part(pts, p, p, [0.35, 0.6, 0.9, 0.05 * Math.sin(Math.PI * ph)], 0.12 + ph * 0.1); }
  for (let k = 0; k < 110; k++) { const ph = fase(R, t, 1); const p = [(R() - 0.5) * 4.5, 1.5 - ph * 3.0 + (R() - 0.5) * 0.3, (R() - 0.5) * 3]; const tw = Math.pow(Math.max(0, Math.sin(TAU * (ph * 3 + R()))), 8); part(pts, p, p, [1.6, 2.2, 3, 0.25 + tw], 0.006 + tw * 0.006); }
  return { cam, solidos: sol, rayosx: xr, particulas: pts, radio: 2.2, tinte: [0.4, 0.8, 1.2], bloom: 0.7, exposicion: 1.0, luz: { dir: [-0.5, 0.8, 0.6], col: [2.1, 2.2, 2.35] } };
};

/* ================================================================ BATERÍA Y ARRANQUE */
const BAT = (() => {
  const caj = new Geo(); caj.add(caja(0.62, 0.42, 0.36, 0.035)); for (let k = 0; k < 5; k++) caj.add(caja(0.004, 0.36, 0.37, 0.002, 1), M4.T(-0.5 + k * 0.25, -0.02, 0));
  const tapa = new Geo(); tapa.add(caja(0.64, 0.045, 0.38, 0.03), M4.T(0, 0.44, 0)); for (let k = 0; k < 6; k++) tapa.add(cilindro(0.045, 0.48, 0.505, 20, 0.008), M4.T(-0.42 + k * 0.17, 0, 0.2));
  const borne = torno([[0, 0.48], [0.065, 0.48], [0.055, 0.6], [0.05, 0.62], [0, 0.62]], 32);
  const mot = new Geo(); mot.add(torno([[0, -0.46], [0.26, -0.46], [0.28, -0.44], [0.28, 0.4], [0.28, 0.4], [0.22, 0.46], [0.22, 0.46], [0, 0.46]], 64)); for (let k = 0; k < 3; k++) mot.add(torno([[0.28, -0.3 + k * 0.3], [0.29, -0.29 + k * 0.3], [0.29, -0.27 + k * 0.3], [0.28, -0.26 + k * 0.3]], 64));
  const sol = new Geo(); sol.add(torno([[0, -0.3], [0.13, -0.3], [0.14, -0.28], [0.14, 0.28], [0.13, 0.3], [0, 0.3]], 48)); sol.add(cilindro(0.03, 0.3, 0.42, 16), M4.I()); sol.add(tuercaHex(0.04, 0.02), M4.T(0, 0.4, 0));
  const pinon = engr(0.1, 11, 0.07, 0.025), corona = engr(1.2, 120, 0.05, 0.03, 1.02);
  const cableP = tubo(Array.from({ length: 50 }, (_, i) => { const s = i / 49; return [-0.35 + s * 1.65, 0.62 + Math.sin(s * Math.PI) * 0.55, 0.05 + Math.sin(s * 3) * 0.1]; }), 0.045, 14);
  const cableN = tubo(Array.from({ length: 40 }, (_, i) => { const s = i / 39; return [-1.2 - s * 0.9, 0.62 + Math.sin(s * 2.5) * 0.3 - s * 1.2, -0.05 - s * 0.6]; }), 0.045, 14);
  return { caj: new Malla(caj), tapa: new Malla(tapa), borne: new Malla(borne), mot: new Malla(mot), sol: new Malla(sol), pinon: new Malla(pinon), corona: new Malla(corona), cableP: new Malla(cableP), cableN: new Malla(cableN) };
})();
ESC.bateria = (t) => {
  const cam = orbita(t, 5.8, 1.2, 0.45, 0.2, [0.1, 0.25, 0], 32, 0.95);
  const MB = M4.T(-0.8, 0, 0), rot = TAU * 6 * t;
  const Mm = cad(M4.T(1.1, -0.1, 0), M4.RZ(-Math.PI / 2));
  const sol = [
    D(BAT.caj, MB, MAT({ base: [0.05, 0.052, 0.058], metal: 0, rough: 0.4 })), D(BAT.tapa, MB, MAT({ base: [0.1, 0.1, 0.11], metal: 0, rough: 0.35 })),
    D(BAT.borne, cad(MB, M4.T(0.45, 0, 0)), MAT({ base: [0.62, 0.62, 0.63], metal: 1, rough: 0.45 })), D(BAT.borne, cad(MB, M4.T(-0.45, 0, 0)), MAT({ base: [0.62, 0.62, 0.63], metal: 1, rough: 0.45 })),
    D(BAT.mot, Mm, MAT({ base: [0.25, 0.26, 0.28], metal: 1, rough: 0.35 })),
    D(BAT.sol, cad(M4.T(1.15, 0.33, 0), M4.RZ(-Math.PI / 2)), MAT({ base: [0.75, 0.76, 0.78], metal: 1, rough: 0.25, pat: 1, pa: [900, 0, 0, 0] })),
    D(BAT.pinon, cad(M4.T(1.62, -0.1, 0), M4.RZ(-Math.PI / 2), M4.RY(rot)), MATS.acero()),
    D(BAT.corona, cad(M4.T(1.62, -0.1 - 1.3, 0), M4.RZ(-Math.PI / 2), M4.RY(-rot * 11 / 120 + 0.013)), MAT({ base: [0.4, 0.41, 0.43], metal: 1, rough: 0.45 })),
    D(BAT.cableP, M4.I(), MAT({ base: [0.55, 0.03, 0.02], metal: 0, rough: 0.35, clear: 0.6, pat: 10, pa: [3, 3, 14, 0], pb: [3, 0.8, 0.2, 1.6] })),
    D(BAT.cableN, M4.I(), MAT({ base: [0.03, 0.03, 0.03], metal: 0, rough: 0.4 })),
  ];
  // arcos de alta tensión: borne + → espárrago del solenoide
  const pts = [], A = [-0.35, 0.66, 0], B = [1.15, 0.78, 0], pulso = 0.6 + 0.4 * Math.sin(TAU * 8 * t);
  const semilla = Math.floor(t * 96);
  for (let r = 0; r < 4; r++) {
    const R = rng(semilla * 13 + r * 7); let cam2 = [A, B];
    for (let n = 0; n < 7; n++) { const nn = []; const desv = 0.55 * Math.pow(0.55, n); for (let i = 0; i < cam2.length - 1; i++) { const p = cam2[i], q = cam2[i + 1]; nn.push(p, [(p[0] + q[0]) / 2 + (R() - 0.5) * desv * 0.5, (p[1] + q[1]) / 2 + (R() - 0.5) * desv + (n === 0 ? 0.35 : 0), (p[2] + q[2]) / 2 + (R() - 0.5) * desv]); } nn.push(cam2[cam2.length - 1]); cam2 = nn; }
    for (let i = 0; i < cam2.length - 1; i++) part(pts, cam2[i], cam2[i + 1], r ? [0.6, 1.4, 3.2, 0.7 * pulso] : [2.6, 3, 4, 1], r ? 0.004 : 0.007);
  }
  const R = rng(5);
  for (const P0 of [A, B]) { part(pts, P0, P0, [1.5, 2.5, 4, 0.9 * pulso], 0.08); for (let k = 0; k < 40; k++) { const ph = fase(R, t, 4); const d = V.norm([R() - 0.5, R() * 0.8, R() - 0.5]); const p = add3(P0, d, ph * 0.5); p[1] -= ph * ph * 0.3; part(pts, add3(p, d, -0.04), p, [3, 2.4, 1.2, 1 - ph], 0.005); } }
  for (let k = 0; k < 50; k++) { const ph = fase(R, t, 3); const s = (k / 50 + ph) % 1; const p = [-0.35 + s * 1.65, 0.62 + Math.sin(s * Math.PI) * 0.55, 0.05 + Math.sin(s * 3) * 0.1]; part(pts, p, p, [3, 1.2, 0.3, 0.8], 0.012); }
  return { cam, solidos: sol, particulas: pts, radio: 2.2, tinte: [0.4, 0.7, 1.2], bloom: 0.85, exposicion: 1.0, luz: { dir: [-0.5, 0.85, 0.5], col: [2.2, 2.2, 2.3] } };
};

/* ================================================================ CARROCERÍA (golpes, pintura, arañazos) */
const PANEL = (() => {
  const NX = 150, NY = 80;
  const forma = (u, v, dent) => { const x = (u - 0.5) * 2.9, y = (v - 0.5) * 1.5; let z = -0.34 * Math.pow(x / 1.45, 2) - 0.05 * Math.pow(y / 0.75, 2); z += 0.03 * Math.exp(-Math.pow((v - 0.66) / 0.018, 2)) - 0.012 * Math.exp(-Math.pow((v - 0.62) / 0.03, 2)); z -= dent(u, v); return [x, y, z]; };
  const hacer = (dent) => chapa(NX, NY, (u, v) => forma(u, v, dent));
  const base = hacer(() => 0);
  const m = new Malla(base, true);
  // textura de arañazos (canal alfa)
  const cv = document.createElement("canvas"); cv.width = 1024; cv.height = 512; const x = cv.getContext("2d");
  x.fillStyle = "rgba(255,255,255,0)"; x.clearRect(0, 0, 1024, 512); const R = rng(77);
  for (let k = 0; k < 70; k++) { let px = 80 + R() * 860, py = 60 + R() * 390; const a = (R() - 0.5) * 0.9 + (R() > 0.5 ? 0 : Math.PI); x.strokeStyle = `rgba(255,255,255,${0.35 + R() * 0.6})`; x.lineWidth = 0.6 + R() * 1.8; x.beginPath(); x.moveTo(px, py); const n = 3 + Math.floor(R() * 6); for (let s = 0; s < n; s++) { px += Math.cos(a) * (15 + R() * 40); py += Math.sin(a) * (15 + R() * 40) + (R() - 0.5) * 8; x.lineTo(px, py); } x.stroke(); }
  for (let k = 0; k < 6; k++) { x.strokeStyle = "rgba(255,255,255,0.9)"; x.lineWidth = 3; x.beginPath(); const px = 200 + R() * 600, py = 150 + R() * 200; x.moveTo(px, py); x.bezierCurveTo(px + 60, py + 20, px + 140, py - 30, px + 260, py + 10); x.stroke(); }
  const tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  // pistola de pintura
  const pis = new Geo(); pis.add(cilindro(0.05, 0, 0.25, 32, 0.01), M4.RX(Math.PI / 2)); pis.add(torno([[0, 0.25], [0.05, 0.25], [0.025, 0.32], [0.012, 0.34], [0, 0.34]], 32), M4.RX(Math.PI / 2));
  pis.add(caja(0.035, 0.18, 0.05, 0.02), cad(M4.T(0, -0.18, -0.04), M4.RX(-0.25))); pis.add(torno([[0, 0], [0.09, 0], [0.1, 0.05], [0.1, 0.22], [0.08, 0.25], [0, 0.25]], 40), M4.T(0, 0.05, -0.02));
  // escáner/pulidor de arañazos y emisor láser del golpe
  const barra = new Geo(); barra.add(caja(0.06, 0.62, 0.07, 0.03)); barra.add(caja(0.02, 0.58, 0.015, 0.01), M4.T(0, 0, -0.07));
  const laser = new Geo(); laser.add(torno([[0, -0.2], [0.07, -0.2], [0.08, -0.18], [0.08, 0.12], [0.05, 0.16], [0.02, 0.2], [0, 0.2]], 40), M4.RX(Math.PI / 2)); laser.add(caja(0.03, 0.02, 0.2, 0.01), M4.T(0, 0.1, -0.1));
  return { NX, NY, forma, hacer, m, tx, pistola: new Malla(pis), barra: new Malla(barra), laser: new Malla(laser) };
})();
const camPanel = (t) => orbita(t, 3.9, 0.55, -0.42, 0.18, [0, -0.02, -0.08], 34, 0.95);

ESC.golpes = (t) => {
  const imp = suave(tramo(t, 0.04, 0.12)), ul = tramo(t, 0.42, 0.84), rep = t > 0.42;
  const prof = (u, v) => { let d = 0.2 * imp * Math.exp(-(Math.pow((u - 0.52) / 0.16, 2) + Math.pow((v - 0.5) / 0.22, 2))); if (rep) d *= smoothstepJS(ul * 1.1 - 0.05, ul * 1.1 + 0.05, u); if (t > 0.84) d = 0; return d; };
  PANEL.m.actualizar(PANEL.hacer(prof));
  const uLas = rep && t < 0.84 ? ul * 1.1 : -1;
  const calor = t < 0.42 ? 0.25 * imp : t < 0.84 ? 0.9 : 0;
  const sol = [D(PANEL.m, M4.I(), MAT({ base: [0.5, 0.04, 0.02], metal: 0.55, rough: 0.32, clear: 1, flake: 1, pat: 4, pa: [3, calor, uLas, 0] }), { sinSombra: true })];
  const pts = [], R = rng(31);
  if (uLas > 0 && uLas < 1) {
    const x = (uLas - 0.5) * 2.9, zS = PANEL.forma(uLas, 0.5, () => 0)[2];
    const E0 = [x + 0.05, 0.05, zS + 0.9];
    sol.push(D(PANEL.laser, cad(M4.T(E0[0], E0[1], E0[2] + 0.2), M4.RX(0.05)), MAT({ base: [0.12, 0.12, 0.13], metal: 1, rough: 0.3, emis: [0.6, 0.25, 0.05] })));
    for (let k = 0; k < 30; k++) { const v = 0.2 + (k / 29) * 0.6, p = PANEL.forma(uLas, v, prof); part(pts, E0, p, [4, 1.6, 0.4, 0.25], 0.003); }
    for (let k = 0; k < 90; k++) { const v = 0.2 + R() * 0.6, p = PANEL.forma(uLas, v, prof); const ph = fase(R, t, 5); const d = V.norm([R() - 0.3, R() - 0.5, 0.6 + R()]); const q = add3(p, d, ph * 0.35); q[1] -= ph * ph * 0.25; part(pts, add3(q, d, -0.03), q, [4, 1.8, 0.5, 1 - ph], 0.004); }
  }
  if (t > 0.04 && t < 0.2) { const k = tramo(t, 0.04, 0.2); const c = PANEL.forma(0.52, 0.5, prof); for (let i = 0; i < 80; i++) { const a = (i / 80) * TAU; const p = add3(c, [Math.cos(a) * k * 1.4, Math.sin(a) * k * 0.9, 0.05]); part(pts, p, p, [3, 1.2, 0.3, 0.8 * (1 - k)], 0.01); } }
  return { cam: camPanel(t), solidos: sol, particulas: pts, radio: 1.8, tinte: [1, 0.3, 0.1], bloom: 0.7, exposicion: 1.0, luz: { dir: [-0.6, 0.7, 0.8], col: [1.8, 1.8, 1.8] } };
};
function smoothstepJS(a, b, x) { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); }

ESC.pintura = (t) => {
  PANEL.m.actualizar(PANEL.hacer(() => 0));
  const cub = tramo(t, 0.04, 0.5), bar = tramo(t, 0.5, 0.86), borra = tramo(t, 0.9, 1.0);
  // (u < cobertura) pinta; al final una banda de escaneo devuelve el panel a imprimación
  const fin = t > 0.9;
  const mat = MAT({ base: [0.6, 0.12, 0.02], metal: 0.5, rough: 0.35, clear: 0, flake: 1, pat: 4, pa: [1, fin ? 1 : cub, fin ? 1 : bar, 0] });
  const sol = [D(PANEL.m, M4.I(), mat, { sinSombra: true, clip: fin ? [-1, 0, 0, -((borra - 0.5) * 2.9)] : null })];
  if (fin) sol.push(D(PANEL.m, M4.I(), MAT({ base: [0.6, 0.12, 0.02], metal: 0.5, rough: 0.35, pat: 4, pa: [1, 0, 0, 0] }), { sinSombra: true, clip: [1, 0, 0, (borra - 0.5) * 2.9] }));
  const pts = [], R = rng(9);
  const pintando = t > 0.04 && t < 0.9, uu = t < 0.5 ? cub : bar;
  if (pintando) {
    const x = (uu - 0.5) * 2.9, y = 0.42 * Math.sin(TAU * 6 * t), zS = PANEL.forma(uu, 0.5 + y / 1.5, () => 0)[2];
    const N0 = [x + 0.05, y + 0.05, zS + 0.55];
    sol.push(D(PANEL.pistola, cad(M4.T(N0[0], N0[1], N0[2] + 0.34), M4.RY(Math.PI)), MAT({ base: [0.7, 0.71, 0.73], metal: 1, rough: 0.2 })));
    const col = t < 0.5 ? [2.2, 0.45, 0.08, 0.35] : [1.8, 1.9, 2.1, 0.22];
    for (let k = 0; k < 700; k++) { const ph = fase(R, t, 8 + Math.floor(R() * 4)); const a = R() * TAU, r = Math.sqrt(R()) * 0.3; const tgt = [x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r, zS]; const p = V.lerp(N0, tgt, ph); const q = V.lerp(N0, tgt, Math.max(0, ph - 0.05)); part(pts, q, p, [col[0], col[1], col[2], col[3] * (1 - ph * 0.5)], 0.0025 + ph * 0.004); }
  }
  if (fin) { const x = (borra - 0.5) * 2.9; for (let k = 0; k < 40; k++) { const v = k / 39, p = PANEL.forma(clamp(borra), v, () => 0); part(pts, add3(p, [0, 0, 0.02]), add3(p, [0, 0, 0.02]), [0.4, 1.4, 2.4, 0.7], 0.012); } }
  return { cam: camPanel(t), solidos: sol, particulas: pts, radio: 1.8, tinte: [1, 0.35, 0.1], bloom: 0.55, exposicion: 1.0, luz: { dir: [-0.6, 0.7, 0.8], col: [1.8, 1.8, 1.8] } };
};

ESC.aranazos = (t) => {
  PANEL.m.actualizar(PANEL.hacer(() => 0));
  const us = t < 0.08 ? 0 : t < 0.78 ? suave(tramo(t, 0.08, 0.78)) * 1.02 : 1.02, vuelve = tramo(t, 0.84, 0.98), on = t > 0.07 && t < 0.8 ? 1 : 0;
  const sol = [D(PANEL.m, M4.I(), MAT({ base: [0.035, 0.036, 0.042], metal: 0.6, rough: 0.2, clear: 1, flake: 1.2, pat: 4, pa: [2, us, on, vuelve], tex: PANEL.tx }), { sinSombra: true })];
  const pts = [], R = rng(17);
  if (on) {
    const x = (us - 0.5) * 2.9, zS = PANEL.forma(clamp(us), 0.5, () => 0)[2];
    sol.push(D(PANEL.barra, M4.T(x, 0, zS + 0.28), MAT({ base: [0.1, 0.1, 0.11], metal: 1, rough: 0.3, emis: [0.9, 0.2, 1.6] })));
    for (let k = 0; k < 48; k++) { const v = 0.1 + (k / 47) * 0.8; const p = PANEL.forma(clamp(us), v, () => 0), q = [x, (v - 0.5) * 1.3, zS + 0.21]; part(pts, q, p, [1.6, 0.35, 2.8, 0.22], 0.004); }
    for (let k = 0; k < 60; k++) { const ph = fase(R, t, 3); const v = R(); const p = PANEL.forma(clamp(us - 0.01), v, () => 0); part(pts, p, add3(p, [-0.1 * ph, 0, 0.12 * ph]), [1.2, 0.5, 2.4, 0.5 * (1 - ph)], 0.003); }
  }
  return { cam: camPanel(t), solidos: sol, particulas: pts, radio: 1.8, tinte: [0.6, 0.3, 1], bloom: 0.6, exposicion: 1.05, luz: { dir: [-0.6, 0.7, 0.8], col: [1.8, 1.8, 1.8] } };
};

/* ================================================================ ACEITE (motor en rayos X con aceite dorado) */
const ACEITE = (() => {
  const bloque = caja(2.1, 0.95, 0.74, 0.12, 8);
  const carter = caja(1.95, 0.2, 0.66, 0.1, 6);
  const filtro = new Geo(); filtro.add(torno([[0, -0.3], [0.2, -0.3], [0.22, -0.28], [0.22, 0.26], [0.2, 0.3], [0.2, 0.3], [0, 0.3]], 64, 0.6, 0.6 + TAU - 1.6));
  const papel = extruir((a) => 0.17 - 0.03 * Math.pow(0.5 + 0.5 * Math.cos(a * 40), 2), 0.26, 640, 0.07);
  const rutas = [
    [[0, -0.72, 0], [0.3, -0.5, 0.1], [1.4, -0.2, 0.2], [1.55, 0.05, 0.6], [1.05, 0.15, 0.95]],
    [[0.75, 0.2, 0.95], [0.3, 0.22, 0.6], [-1.7, 0.22, 0.55]],
    [[1.6, 0.22, 0.55], [1.8, 1.0, 0.62], [1.7, 1.95, 0.55], [-1.7, 1.95, 0.55]],
    ...[-1.6, -0.8, 0, 0.8, 1.6].map((x) => [[x, 0.22, 0.55], [x, 0.1, 0.25], [x, 0.0, 0.0]]),
  ].map((r) => r.map(([x, y, z]) => [x, y, z]));
  const cr = AIRE.cr;
  const tubos = rutas.map((r) => { const c = Array.from({ length: 50 }, (_, i) => cr(r, i / 49)); return new Malla(tubo(c, 0.045, 14)); });
  return { bloque: new Malla(bloque), carter: new Malla(carter), filtro: new Malla(filtro), papel: new Malla(papel), rutas, tubos, cr };
})();
ESC.aceite = (t) => {
  const th = TAU * 2 * t;
  const cam = orbita(t, 7.4, 1.4, 0.62, 0.22, [0.2, 0.7, 0.1], 31, 0.9);
  const sol = motorDibujo(th, { sinRampa: true });
  sol.push(D(ACEITE.filtro, cad(M4.T(0.9, 0.2, 1.05), M4.RX(Math.PI / 2)), MAT({ base: [0.55, 0.12, 0.03], metal: 0.4, rough: 0.3, clear: 1 })));
  sol.push(D(ACEITE.papel, cad(M4.T(0.9, 0.2, 1.05), M4.RX(Math.PI / 2)), MAT({ base: [0.8, 0.62, 0.3], metal: 0, rough: 0.7, emis: [0.25, 0.14, 0.02] })));
  const xr = [D(ACEITE.bloque, M4.T(0, 0.95, 0), MAT({ xray: 0.22, xcol: [0.5, 0.7, 1.0] })), D(ACEITE.carter, M4.T(0, -0.62, 0), MAT({ xray: 0.35, xcol: [1.2, 0.8, 0.3] }))];
  ACEITE.tubos.forEach((m) => xr.push(D(m, M4.I(), MAT({ xray: 0.9, xcol: [1.4, 0.9, 0.3] }))));
  const pts = [], R = rng(44);
  ACEITE.rutas.forEach((r, i) => { const n = i < 3 ? 110 : 26; for (let k = 0; k < n; k++) { const s = (k / n + t * (i < 3 ? 2 : 3)) % 1; const p = ACEITE.cr(r, s), q = ACEITE.cr(r, Math.max(0, s - 0.018)); part(pts, q, p, [3.2, 1.9, 0.45, 0.85], 0.011); } });
  // aceite en el cárter (superficie dorada) y salpicaduras del cigüeñal
  for (let k = 0; k < 140; k++) { const x = (R() - 0.5) * 3.6, z = (R() - 0.5) * 1.1, y = -0.62 + 0.03 * Math.sin(TAU * (2 * t + x * 0.8 + z)); part(pts, [x, y, z], [x + 0.06, y, z], [2.4, 1.4, 0.35, 0.35], 0.012); }
  for (let k = 0; k < 80; k++) { const ph = fase(R, t, 4); const x = [-1.2, -0.4, 0.4, 1.2][k % 4] + (R() - 0.5) * 0.3; const a = R() * Math.PI; const v = [0, Math.sin(a) * 1.6 + 0.4, Math.cos(a) * 1.6]; const p = add3([x, -0.1, 0], v, ph * 0.35); p[1] -= ph * ph * 0.5; part(pts, add3(p, v, -0.02), p, [3, 1.8, 0.4, 0.8 * (1 - ph)], 0.007); }
  return { cam, solidos: sol, rayosx: xr, particulas: pts, radio: 3.2, tinte: [1, 0.6, 0.2], bloom: 0.7, exposicion: 1.0 };
};

/* ================================================================ OTRO: despiece (exploded view) */
const DESP = (() => ({ tornillo: new Malla((() => { const g = new Geo(); g.add(tuercaHex(0.12, 0.06), M4.T(0, 0.5, 0)); g.add(cilindro(0.06, -0.4, 0.44, 32)); for (let k = 0; k < 22; k++) g.add(torno([[0.06, -0.38 + k * 0.036], [0.072, -0.37 + k * 0.036], [0.06, -0.36 + k * 0.036]], 32)); return g; })()), engrane: new Malla(engr(0.34, 28, 0.07, 0.04)), arandela: new Malla(torno([[0.07, -0.015], [0.16, -0.015], [0.16, -0.015], [0.16, 0.015], [0.16, 0.015], [0.07, 0.015], [0.07, 0.015], [0.07, -0.015]], 48)) }))();
ESC.otro = (t) => {
  const e = 0.5 - 0.5 * Math.cos(TAU * t), gir = TAU * t;
  const cam = orbita(t, 4.9, 0.9, 0.5, 0.2, [0, 0, 0], 32, 0.95);
  const eje = V.norm([1, 0.45, -0.2]), o0 = [-2.2, -0.6, 0.4];
  const pos = (k) => V.mul(eje, (k - 4) * (0.36 + 0.24 * e));
  const { g } = MOTOR; const sol = [];
  const col = (b, r) => MAT({ base: b, metal: 1, rough: r, pat: 1, pa: [1000, 0, 0, 0] });
  const piezas = [
    [g.piston, [0.86, 0.87, 0.88], 0.28, M4.I()], [g.bulon, [0.95, 0.95, 0.96], 0.08, EJE_X], [g.biela, [0.55, 0.56, 0.58], 0.3, M4.T(0, -0.4, 0)],
    [MOTOR.g.poleaLeva, [0.8, 0.8, 0.82], 0.22, M4.RZ(-Math.PI / 2)], [DESP.engrane, [0.62, 0.63, 0.65], 0.38, M4.RZ(-Math.PI / 2)],
    [g.valvula, [0.75, 0.74, 0.72], 0.25, M4.T(0, -0.3, 0)], [g.muelle, [0.25, 0.26, 0.28], 0.3, cad(M4.T(0, -0.2, 0), M4.S(1, 0.35, 1))],
    [DESP.arandela, [0.9, 0.9, 0.92], 0.1, M4.RZ(-Math.PI / 2)], [DESP.tornillo, [0.7, 0.71, 0.73], 0.2, M4.RZ(-Math.PI / 2)],
  ];
  piezas.forEach(([m, b, r, Ml], k) => { const p = pos(k); sol.push(D(m, cad(M4.T(p[0], p[1], p[2]), M4.RY(gir * (k % 2 ? 1 : -1) + k), M4.RX(0.25 * Math.sin(gir + k)), Ml), col(b, r))); });
  const pts = []; const a = pos(-0.6), b = pos(9); for (let k = 0; k < 90; k++) { const s0 = k / 90, s1 = s0 + 0.006; if (k % 2) continue; part(pts, V.lerp(a, b, s0), V.lerp(a, b, s1), [1.8, 0.7, 0.2, 0.6], 0.003); }
  for (let k = 0; k < 9; k++) { const p = pos(k); const r = 0.5 + 0.08 * Math.sin(TAU * t * 2 + k); for (let i = 0; i < 40; i++) { const an = (i / 40) * TAU; const q = add3(p, [0, Math.cos(an) * r, Math.sin(an) * r]); part(pts, q, q, [0.4, 1.3, 2.3, 0.18 * e], 0.006); } }
  return { cam, solidos: sol, particulas: pts, radio: 3.4, tinte: [0.9, 0.45, 0.2], bloom: 0.5, exposicion: 1.05,
    scan: { eje: eje, pos: -3 + 7 * ((t * 1) % 1), ancho: 0.04, col: [1.4, 0.5, 0.15] } };
};
