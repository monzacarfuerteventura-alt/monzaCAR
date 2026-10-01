/* =====================================================================
   VOLCANO CARS · ESCENAS 3D DEL TALLER
   Cada escena devuelve, para un instante t∈[0,1), lo que hay que dibujar.
   Todo el movimiento es periódico → el vídeo hace bucle perfecto.
   ===================================================================== */
"use strict";
const ESC = {};
const D = (malla, M, mat, extra) => Object.assign({ malla, M, mat }, extra || {});
// orienta el eje Y local de a hacia b, con el eje X local = ejeX (sin escalar)
function orientar(a, b, ejeX = [1, 0, 0]) {
  const y = V.norm(V.sub(b, a)); let x = V.norm(V.sub(ejeX, V.mul(y, V.dot(ejeX, y)))); const z = V.cross(x, y);
  return new Float32Array([x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, a[0], a[1], a[2], 1]);
}
const EJE_X = M4.RZ(-Math.PI / 2); // lleva el eje Y de las piezas de torno/extrusión al eje X
function orbita(t, dist, alt, ang0, amp, obj, fov = 30, vert) {
  const a = ang0 + amp * Math.sin(TAU * t);
  return { eye: [obj[0] + Math.sin(a) * dist, obj[1] + alt + 0.12 * Math.sin(TAU * t + 1), obj[2] + Math.cos(a) * dist], target: obj, fov, vert };
}
function envolvente(circulos, n = 96) { // correa: casco convexo de las poleas (z,y)
  const m = []; circulos.forEach(([z, y, r]) => { for (let k = 0; k < n; k++) { const a = (k / n) * TAU; m.push([z + Math.cos(a) * r, y + Math.sin(a) * r]); } });
  m.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of m) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = m.length - 1; i >= 0; i--) { const p = m[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  const h = lo.slice(0, -1).concat(up.slice(0, -1));
  // remuestreo uniforme
  let per = 0; const L = h.map((p, i) => { const q = h[(i + 1) % h.length]; const d = Math.hypot(q[0] - p[0], q[1] - p[1]); per += d; return d; });
  const out = []; const N = 400; let i = 0, acc = 0;
  for (let k = 0; k < N; k++) { const s = (k / N) * per; while (acc + L[i] < s) { acc += L[i]; i++; } const f = (s - acc) / L[i], p = h[i], q = h[(i + 1) % h.length]; out.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]); }
  return { pts: out, per };
}
const polea = (R, dientes, alto) => extruir((a) => R - 0.016 * Math.pow(0.5 + 0.5 * Math.cos(a * dientes), 5), alto, dientes * 10);
const engr = (R, dientes, alto, prof = 0.03, hueco = 0) => extruir((a) => { const f = (a * dientes / TAU) % 1; const k = f < 0.18 ? f / 0.18 : f < 0.5 ? 1 : f < 0.68 ? 1 - (f - 0.5) / 0.18 : 0; return R - prof + prof * k; }, alto, dientes * 16, hueco);
const tuercaHex = (r, alto) => torno([[0, -alto], [r, -alto], [r, -alto], [r, alto], [r, alto], [0, alto]], 6);

/* ================================================================
   MOTOR EN LÍNEA DE 4 CILINDROS (distribución, aceite, despiece)
   ================================================================ */
const MOTOR = (() => {
  const X = [-1.2, -0.4, 0.4, 1.2], R = 0.24, LB = 0.78, ALF = [0, Math.PI, Math.PI, 0];
  const g = {};
  // cigüeñal (eje X)
  const cig = new Geo();
  [-1.6, -0.8, 0, 0.8, 1.6].forEach((x) => cig.add(cilindro(0.13, -0.1, 0.1, 40, 0.012), cad(M4.T(x, 0, 0), EJE_X)));
  X.forEach((x, i) => {
    const a = ALF[i];
    cig.add(cilindro(0.115, -0.09, 0.09, 40, 0.01), cad(M4.T(x, R * Math.cos(a), R * Math.sin(a)), EJE_X));
    for (const s of [-1, 1]) {
      const brazo = extruir((b) => { const c = Math.cos(b); return 0.18 + 0.2 * Math.pow(Math.max(-c, 0), 2.2) + 0.2 * Math.pow(Math.max(c, 0), 0.7); }, 0.035, 160); // b=π apunta a la muñequilla
      // el ángulo 0 del contorno mira a +Y tras EJE_X: se gira para apuntar a la muñequilla
      cig.add(brazo, cad(M4.T(x + s * 0.125, 0, 0), M4.RX(a), EJE_X, M4.RY(0)));
    }
  });
  cig.add(cilindro(0.11, 1.62, 2.02, 40, 0.01), M4.RZ(-Math.PI / 2)); // punta delantera
  cig.add(cilindro(0.3, -0.04, 0.04, 64, 0.01), cad(M4.T(-1.92, 0, 0), EJE_X)); // brida del volante
  g.cig = new Malla(cig);
  // pistón (bulón en y=0)
  g.piston = new Malla(torno([[0, 0.23], [0.2, 0.235], [0.27, 0.225], [0.285, 0.21], [0.285, 0.21], [0.285, -0.2], [0.285, -0.2], [0.265, -0.2], [0.265, -0.2], [0.265, 0.1], [0, 0.1]], 72));
  g.bulon = new Malla(cilindro(0.07, -0.25, 0.25, 32, 0.01));
  // biela (y de 0 a LB)
  const bi = new Geo();
  bi.add(caja(0.055, LB / 2 - 0.1, 0.035, 0.02), M4.T(0, LB / 2, 0));
  bi.add(torno([[0.13, -0.05], [0.19, -0.05], [0.19, -0.05], [0.19, 0.05], [0.19, 0.05], [0.13, 0.05], [0.13, 0.05], [0.13, -0.05]], 48), EJE_X);
  bi.add(torno([[0.075, -0.045], [0.11, -0.045], [0.11, -0.045], [0.11, 0.045], [0.11, 0.045], [0.075, 0.045], [0.075, 0.045], [0.075, -0.045]], 40), cad(M4.T(0, LB, 0), EJE_X));
  [-0.16, 0.16].forEach((z) => bi.add(cilindro(0.028, -0.08, 0.08, 16), cad(M4.T(0, -0.1, z), EJE_X)));
  g.biela = new Malla(bi);
  // árboles de levas + válvulas (culata «pent-roof»)
  const VD = V.norm([0, 0.56, 0.2]);
  const valv = [];
  X.forEach((x, i) => [-1, 1].forEach((lado) => [-0.12, 0.12].forEach((dx) => {
    const H = [x + dx, 1.34, 0.12 * lado], D = [0, VD[1], VD[2] * lado];
    valv.push({ H, D, lado, cil: i });
  })));
  const CAMZ = 0.12 + 0.745 * VD[2], CAMY = 1.34 + 0.745 * VD[1];
  const leva = (b) => 0.075 + 0.07 * Math.pow(Math.max(Math.cos(b), 0), 3);
  const levas = { 1: new Geo(), [-1]: new Geo() };
  const FASE = [0, Math.PI, 1.5 * Math.PI, 0.5 * Math.PI]; // orden de encendido 1-3-4-2
  for (const lado of [-1, 1]) {
    const gg = levas[lado];
    gg.add(cilindro(0.055, -2.0, 2.05, 32), M4.RZ(-Math.PI / 2));
    X.forEach((x, i) => {
      [-0.12, 0.12].forEach((dx) => { const off = FASE[i] + (lado > 0 ? 0 : -1.9); gg.add(extruir((b) => leva(b - off), 0.045, 120), cad(M4.T(x + dx, 0, 0), EJE_X)); });
      gg.add(cilindro(0.075, -0.05, 0.05, 32, 0.008), cad(M4.T(x + 0.4 - 0.4 * (i === 3 ? 0 : 0), 0, 0), EJE_X));
    });
  }
  g.levaA = new Malla(levas[1]); g.levaE = new Malla(levas[-1]);
  g.valvula = new Malla(torno([[0, 0], [0.1, 0.0], [0.1, 0.0], [0.1, 0.018], [0.1, 0.018], [0.035, 0.07], [0.022, 0.09], [0.022, 0.09], [0.022, 0.6], [0.022, 0.6], [0, 0.6]], 40));
  g.muelle = new Malla(muelle(0.052, 0.009, 7, 8));
  g.taque = new Malla(cilindro(0.062, -0.035, 0.035, 36, 0.008));
  g.reten = new Malla(torno([[0.02, 0], [0.065, 0.0], [0.065, 0.0], [0.05, 0.02], [0.02, 0.02]], 28));
  // poleas de distribución (plano x = 2.0)
  const PX = 2.0, RC = 0.3;
  g.poleaLeva = new Malla((() => { const q = new Geo(); q.add(polea(RC, 36, 0.06)); q.add(torno([[0.08, -0.1], [0.2, -0.1], [0.2, -0.1], [0.22, -0.08], [0.22, 0.02], [0.08, 0.02]], 48), M4.T(0, 0.11, 0)); for (let k = 0; k < 4; k++) { const a = (k / 4) * TAU; q.add(caja(0.035, 0.03, 0.035, 0.01), M4.T(Math.cos(a) * 0.16, 0.13, Math.sin(a) * 0.16)); } q.add(tuercaHex(0.07, 0.035), M4.T(0, 0.15, 0)); return q; })());
  g.poleaCig = new Malla((() => { const q = new Geo(); q.add(polea(RC / 2, 18, 0.06)); q.add(tuercaHex(0.06, 0.03), M4.T(0, 0.09, 0)); return q; })());
  g.damper = new Malla(torno([[0.1, -0.06], [0.33, -0.06], [0.33, -0.06], [0.34, -0.05], [0.34, 0.05], [0.33, 0.06], [0.33, 0.06], [0.1, 0.06]], 72));
  g.rodillo = new Malla(torno([[0.02, -0.05], [0.1, -0.05], [0.1, -0.05], [0.105, -0.04], [0.105, 0.04], [0.1, 0.05], [0.1, 0.05], [0.02, 0.05]], 48));
  const circ = [[CAMZ, CAMY, RC + 0.012], [-CAMZ, CAMY, RC + 0.012], [0, 0, RC / 2 + 0.012], [0.52, 0.95, 0.105], [-0.45, 0.8, 0.13]];
  const env = envolvente(circ);
  const camino = env.pts.map(([z, y]) => [PX, y, z]);
  g.correa = new Malla(tubo(camino, 1, 12, true, (a) => { const c = Math.cos(a), s = Math.sin(a); return [Math.sign(c) * Math.pow(Math.abs(c), 0.25) * 0.075, Math.sign(s) * Math.pow(Math.abs(s), 0.25) * 0.02]; }));
  // rampa de inyección
  const rampa = new Geo();
  rampa.add(cilindro(0.05, -1.7, 1.7, 28, 0.01), cad(M4.T(0, 2.28, 0), M4.RZ(-Math.PI / 2)));
  X.forEach((x) => { rampa.add(cilindro(0.035, 1.78, 2.26, 20), M4.T(x, 0, 0)); rampa.add(cilindro(0.05, 1.78, 1.9, 20, 0.008), M4.T(x, 0, 0)); });
  rampa.add(tubo([[-1.7, 2.28, 0], [-2.0, 2.3, 0], [-2.2, 2.1, 0.3], [-2.4, 1.6, 0.5]], 0.025, 12), null);
  g.rampa = new Malla(rampa);
  return { X, R, LB, ALF, g, valv, CAMY, CAMZ, leva, FASE, PX, RC, circ, per: env.per };
})();

// estado del motor para un ángulo de cigüeñal th (rad)
function motorDibujo(th, o = {}) {
  const { X, R, LB, ALF, g, valv, CAMY, CAMZ, leva, FASE, PX, RC } = MOTOR;
  const sol = [];
  const base = o.M || M4.I();
  const W = (m) => M4.mul(base, m);
  const acero = MATS.acero(), alu = MATS.alu(), cromo = MATS.cromo(), oscuro = MATS.oscuro();
  const ex = o.explota || 0; // 0..1 separación de piezas (despiece)
  sol.push(D(g.cig, W(M4.RX(th)), MAT({ base: [0.62, 0.63, 0.65], metal: 1, rough: 0.2, pat: 1, pa: [1100, 0, 0, 0] })));
  X.forEach((x, i) => {
    const a = th + ALF[i], pin = [x, R * Math.cos(a), R * Math.sin(a)];
    const yP = pin[1] + Math.sqrt(LB * LB - pin[2] * pin[2]);
    const pp = [x, yP + ex * 0.9, 0];
    sol.push(D(g.biela, W(orientar(pin, [x, yP, 0])), MAT({ base: [0.55, 0.56, 0.58], metal: 1, rough: 0.32 })));
    sol.push(D(g.piston, W(M4.T(pp[0], pp[1], pp[2])), MAT({ base: [0.86, 0.87, 0.88], metal: 1, rough: 0.3, pat: 9, pa: [0.18, 0.045, 0, 0] })));
    sol.push(D(g.bulon, W(cad(M4.T(pp[0], yP + ex * 0.45, 0), EJE_X)), cromo));
  });
  const psi = th / 2; // 2:1
  for (const lado of [1, -1]) {
    const M = W(cad(M4.T(0, CAMY + ex * 0.8, lado * CAMZ), M4.RX(psi)));
    sol.push(D(lado > 0 ? g.levaA : g.levaE, M, MAT({ base: [0.7, 0.71, 0.73], metal: 1, rough: 0.16, pat: 1, pa: [1600, 0, 0, 0] })));
    sol.push(D(g.poleaLeva, W(cad(M4.T(PX + ex * 1.2, CAMY, lado * CAMZ), M4.RX(psi), M4.RZ(-Math.PI / 2))), MAT({ base: [0.8, 0.8, 0.82], metal: 1, rough: 0.22, pat: 1, pa: [700, 0, 0, 0] })));
  }
  valv.forEach((v) => {
    const off = FASE[v.cil] + (v.lado > 0 ? 0 : -1.9);
    const dirCam = Math.atan2(-v.D[2], -v.D[1]);
    const lift = leva(Math.PI - dirCam + psi - off) - 0.075;
    const H = V.add(v.H, V.mul(v.D, -lift + ex * 0.5));
    const top = V.add(H, V.mul(v.D, 0.6));
    const Mv = W(orientar(H, top));
    sol.push(D(g.valvula, Mv, MAT({ base: [0.75, 0.74, 0.72], metal: 1, rough: 0.25 })));
    const sB = V.add(v.H, V.mul(v.D, 0.3)), sT = V.add(top, V.mul(v.D, -0.06));
    const Ms = W(M4.mul(orientar(sB, sT), M4.S(1, V.len(V.sub(sT, sB)), 1)));
    sol.push(D(g.muelle, Ms, MAT({ base: [0.25, 0.26, 0.28], metal: 1, rough: 0.3 })));
    sol.push(D(g.reten, W(orientar(V.add(top, V.mul(v.D, -0.07)), top)), cromo));
    sol.push(D(g.taque, W(orientar(V.add(top, V.mul(v.D, 0.035)), V.add(top, V.mul(v.D, 0.1)))), MAT({ base: [0.85, 0.85, 0.86], metal: 1, rough: 0.12 })));
  });
  if (!o.sinDistribucion) {
    sol.push(D(g.poleaCig, W(cad(M4.T(PX + ex * 1.2, 0, 0), M4.RX(th), M4.RZ(-Math.PI / 2))), MAT({ base: [0.8, 0.8, 0.82], metal: 1, rough: 0.22 })));
    sol.push(D(g.damper, W(cad(M4.T(PX + 0.2 + ex * 1.4, 0, 0), M4.RX(th), M4.RZ(-Math.PI / 2))), MAT({ base: [0.06, 0.06, 0.065], metal: 0.3, rough: 0.45, pat: 1, pa: [500, 0, 0, 0] })));
    MOTOR.circ.slice(3).forEach(([z, y, r]) => sol.push(D(g.rodillo, W(cad(M4.T(PX + ex * 1.2, y, z), M4.RX(-th * 1.5), M4.RZ(-Math.PI / 2))), MAT({ base: [0.85, 0.86, 0.88], metal: 1, rough: 0.12 }))));
    // la correa avanza a la velocidad de las poleas: dientes = 36 por vuelta de leva
    sol.push(D(g.correa, W(M4.T(ex * 1.2, 0, 0)), MAT({ base: [0.05, 0.05, 0.055], metal: 0, rough: 0.6, pat: 8, pa: [-psi * RC, (TAU * RC) / 36, 1, 0] })));
  }
  if (!o.sinRampa) sol.push(D(g.rampa, W(M4.T(0, ex * 1.2, 0)), MAT({ base: [0.8, 0.81, 0.83], metal: 1, rough: 0.18 })));
  return sol;
}

/* 1 · CORREA DE DISTRIBUCIÓN: el motor por dentro, como en un render de fábrica */
ESC.distribucion = (t) => {
  const th = TAU * 2 * t;
  const cam = orbita(t, 6.3, 1.5, 0.85, 0.25, [0.45, 1.0, 0], 30, 0.9);
  return { cam, solidos: motorDibujo(th), radio: 3.2, tinte: [0.9, 0.4, 0.15], bloom: 0.45, exposicion: 1.05,
    scan: { eje: [1, 0, 0], pos: -3 + 6 * ((t * 1) % 1), ancho: 0.05, col: [1.4, 0.45, 0.12] } };
};

/* ---------------- pruebas ---------------- */
window.ESCENAS = () => Object.keys(ESC);
window.preparar = (w, h) => prepararFB(w, h);
// N subfotogramas por fotograma (desenfoque de movimiento + profundidad de campo); nf = fotogramas por bucle
window.fotograma = (k, t, q = 0.92, N = 1, nf = 192) => { renderAcum((ts) => (window.ESTILO ? estiloCine(ESC[k](ts), k, ts) : ESC[k](ts)), t, N, 1 / nf, 0.5); return C.toDataURL("image/jpeg", q); };
window.fotogramaPNG = (k, t, N = 1, nf = 192) => { renderAcum((ts) => ESC[k](ts), t, N, 1 / nf, 0.5); return C.toDataURL("image/png"); };
