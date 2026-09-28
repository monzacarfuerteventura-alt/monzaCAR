/* =====================================================================
   VOLCANO CARS · MOTOR DE RENDER 3D (WebGL2) PARA LOS CLIPS DEL TALLER
   ---------------------------------------------------------------------
   Render fotograma a fotograma (no en tiempo real): materiales físicos
   (PBR: metal, aluminio mecanizado, pintura con barniz, goma, plástico),
   luz de estudio con reflejos, sombras suaves, piezas en rayos X,
   partículas (chispas, fluidos, hielo, arcos eléctricos) y bloom.
   Lo usan escenas.js y renderizar3d.py.
   ===================================================================== */
"use strict";
const TAU = Math.PI * 2;
const C = document.getElementById("c");
const gl = C.getContext("webgl2", { antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
gl.getExtension("EXT_color_buffer_float");
gl.getExtension("OES_texture_float_linear");

/* ---------------------------------------------------------------- matemáticas */
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, s) => [a[0] * s, a[1] * s, a[2] * s], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]), norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
};
const M4 = {
  I: () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]),
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  T: (x, y, z) => { const m = M4.I(); m[12] = x; m[13] = y; m[14] = z; return m; },
  S: (x, y = x, z = x) => { const m = M4.I(); m[0] = x; m[5] = y; m[10] = z; return m; },
  RX: (a) => { const c = Math.cos(a), s = Math.sin(a), m = M4.I(); m[5] = c; m[6] = s; m[9] = -s; m[10] = c; return m; },
  RY: (a) => { const c = Math.cos(a), s = Math.sin(a), m = M4.I(); m[0] = c; m[2] = -s; m[8] = s; m[10] = c; return m; },
  RZ: (a) => { const c = Math.cos(a), s = Math.sin(a), m = M4.I(); m[0] = c; m[1] = s; m[4] = -s; m[5] = c; return m; },
  persp(fy, asp, n, f) { const t = 1 / Math.tan(fy / 2), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = (2 * f * n) / (n - f); return m; },
  ortho(l, r, b, t, n, f) { const m = M4.I(); m[0] = 2 / (r - l); m[5] = 2 / (t - b); m[10] = -2 / (f - n); m[12] = -(r + l) / (r - l); m[13] = -(t + b) / (t - b); m[14] = -(f + n) / (f - n); return m; },
  look(e, c, up = [0, 1, 0]) {
    const z = V.norm(V.sub(e, c)), x = V.norm(V.cross(up, z)), y = V.cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -V.dot(x, e), -V.dot(y, e), -V.dot(z, e), 1]);
  },
  // matriz que lleva el eje Y local de a → b (para bielas, cables, vástagos…)
  entre(a, b, grosor = 1) {
    const d = V.sub(b, a), L = V.len(d), y = V.norm(d);
    const ref = Math.abs(y[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0];
    const x = V.norm(V.cross(ref, y)), z = V.cross(x, y);
    return new Float32Array([x[0] * grosor, x[1] * grosor, x[2] * grosor, 0, y[0] * L, y[1] * L, y[2] * L, 0, z[0] * grosor, z[1] * grosor, z[2] * grosor, 0, a[0], a[1], a[2], 1]);
  },
  ap: (m, p) => [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]],
};
const cad = (...ms) => ms.reduce((a, b) => M4.mul(a, b)); // cad(T, R, S) = T·R·S
function rng(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let r = Math.imul(s ^ (s >>> 15), 1 | s); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; }; }
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const suave = (x) => x * x * (3 - 2 * x);
const tramo = (t, a, b) => clamp((t - a) / (b - a));

/* ---------------------------------------------------------------- geometría */
class Geo {
  constructor() { this.p = []; this.n = []; this.u = []; this.i = []; }
  v(p, n, u = [0, 0]) { this.p.push(p[0], p[1], p[2]); this.n.push(n[0], n[1], n[2]); this.u.push(u[0], u[1]); return this.p.length / 3 - 1; }
  tri(a, b, c) { this.i.push(a, b, c); }
  quad(a, b, c, d) { this.i.push(a, b, c, a, c, d); }
  add(g, m) { // funde otra geometría con una transformación
    const base = this.p.length / 3, nm = m ? m : null;
    for (let k = 0; k < g.p.length; k += 3) {
      const p = [g.p[k], g.p[k + 1], g.p[k + 2]], n = [g.n[k], g.n[k + 1], g.n[k + 2]];
      const pp = nm ? M4.ap(nm, p) : p;
      const nn = nm ? V.norm([nm[0] * n[0] + nm[4] * n[1] + nm[8] * n[2], nm[1] * n[0] + nm[5] * n[1] + nm[9] * n[2], nm[2] * n[0] + nm[6] * n[1] + nm[10] * n[2]]) : n;
      this.p.push(...pp); this.n.push(...nn);
    }
    this.u.push(...g.u); for (const x of g.i) this.i.push(x + base); return this;
  }
}
// torno: perfil [[r,y],...] alrededor del eje Y. Puntos repetidos = arista viva.
function torno(perfil, seg = 64, a0 = 0, a1 = TAU) {
  const g = new Geo(), n = perfil.length, cerr = Math.abs(a1 - a0 - TAU) < 1e-6;
  const nor = perfil.map((p, i) => {
    const pr = perfil[Math.max(0, i - 1)], nx = perfil[Math.min(n - 1, i + 1)];
    let d;
    if (i < n - 1 && nx[0] === p[0] && nx[1] === p[1]) d = [p[0] - pr[0], p[1] - pr[1]];
    else if (i > 0 && pr[0] === p[0] && pr[1] === p[1]) d = [nx[0] - p[0], nx[1] - p[1]];
    else d = [nx[0] - pr[0], nx[1] - pr[1]];
    const l = Math.hypot(d[0], d[1]) || 1; return [d[1] / l, -d[0] / l];
  });
  let acc = 0; const s = perfil.map((p, i) => (i ? (acc += Math.hypot(p[0] - perfil[i - 1][0], p[1] - perfil[i - 1][1])) : 0));
  const cols = seg + (cerr ? 1 : 1);
  for (let j = 0; j < cols; j++) {
    const a = a0 + ((a1 - a0) * j) / seg, c = Math.cos(a), sn = Math.sin(a);
    for (let i = 0; i < n; i++) g.v([perfil[i][0] * c, perfil[i][1], perfil[i][0] * sn], [nor[i][0] * c, nor[i][1], nor[i][0] * sn], [j / seg, s[i]]);
  }
  for (let j = 0; j < seg; j++) for (let i = 0; i < n - 1; i++) { const a = j * n + i, b = (j + 1) * n + i; g.quad(a, b, b + 1, a + 1); }
  if (!cerr) { // tapas del corte (se ve el interior)
    for (const [a, sg] of [[a0, -1], [a1, 1]]) {
      const c = Math.cos(a), sn = Math.sin(a), nn = [-sn * sg, 0, c * sg], base = g.p.length / 3;
      for (let i = 0; i < n; i++) g.v([perfil[i][0] * c, perfil[i][1], perfil[i][0] * sn], nn, [0, s[i]]);
      const cen = [];
      for (let i = 0; i < n; i++) cen.push(g.v([0, perfil[i][1], 0], nn, [0, s[i]]));
      for (let i = 0; i < n - 1; i++) { if (sg > 0) g.quad(base + i, cen[i], cen[i + 1], base + i + 1); else g.quad(base + i, base + i + 1, cen[i + 1], cen[i]); }
    }
  }
  return g;
}
// cilindro con tapas (eje Y, de y0 a y1)
const cilindro = (r, y0, y1, seg = 48, bisel = 0) => torno(bisel ? [[0, y0], [r - bisel, y0], [r - bisel, y0], [r, y0 + bisel], [r, y0 + bisel], [r, y1 - bisel], [r, y1 - bisel], [r - bisel, y1], [r - bisel, y1], [0, y1]] : [[0, y0], [r, y0], [r, y0], [r, y1], [r, y1], [0, y1]], seg);
const esfera = (r, seg = 32) => { const p = []; for (let i = 0; i <= 16; i++) { const a = -Math.PI / 2 + (Math.PI * i) / 16; p.push([Math.cos(a) * r + 1e-5, Math.sin(a) * r]); } return torno(p, seg); };
// caja redondeada (medias medidas hx,hy,hz, radio r)
function caja(hx, hy, hz, r = 0.02, sub = 6) {
  const g = new Geo(), caras = [[0, 1, 2, 1], [0, 1, 2, -1], [1, 2, 0, 1], [1, 2, 0, -1], [2, 0, 1, 1], [2, 0, 1, -1]], H = [hx, hy, hz];
  r = Math.min(r, hx, hy, hz) * 0.999;
  for (const [a, b, c, sg] of caras) {
    const base = g.p.length / 3;
    for (let i = 0; i <= sub; i++) for (let j = 0; j <= sub; j++) {
      const q = [0, 0, 0]; q[a] = -1 + (2 * i) / sub; q[b] = -1 + (2 * j) / sub; q[c] = sg;
      // distribuye más vértices cerca de las aristas para que el redondeo sea suave
      const e = (x) => Math.sign(x) * Math.pow(Math.abs(x), 0.6);
      const v = [e(q[0]) * H[0], e(q[1]) * H[1], e(q[2]) * H[2]];
      const inn = v.map((x, k) => clamp(x, -(H[k] - r), H[k] - r)); let d = V.sub(v, inn); const L = V.len(d);
      const nn = L > 1e-6 ? V.mul(d, 1 / L) : (() => { const z = [0, 0, 0]; z[c] = sg; return z; })();
      g.v(V.add(inn, V.mul(nn, r)), nn, [(q[a] + 1) / 2, (q[b] + 1) / 2]);
    }
    for (let i = 0; i < sub; i++) for (let j = 0; j < sub; j++) {
      const k = base + i * (sub + 1) + j;
      if (sg > 0) g.quad(k, k + sub + 1, k + sub + 2, k + 1); else g.quad(k, k + 1, k + sub + 2, k + sub + 1);
    }
  }
  // orienta todas las caras hacia fuera (por si algún eje quedó al revés)
  for (let k = 0; k < g.i.length; k += 3) {
    const [A, B, Cc] = [g.i[k], g.i[k + 1], g.i[k + 2]].map((x) => [g.p[x * 3], g.p[x * 3 + 1], g.p[x * 3 + 2]]);
    const nf = V.cross(V.sub(B, A), V.sub(Cc, A)), nv = [g.n[g.i[k] * 3], g.n[g.i[k] * 3 + 1], g.n[g.i[k] * 3 + 2]];
    if (V.dot(nf, nv) < 0) { const t = g.i[k + 1]; g.i[k + 1] = g.i[k + 2]; g.i[k + 2] = t; }
  }
  return g;
}
// extrusión de un contorno estrellado (engranajes, levas, llantas, brazos del cigüeñal). rf(a) = radio. Eje de extrusión: Y
function extruir(rf, hy, seg = 256, agujero = 0, cx = 0, cz = 0) {
  const g = new Geo(), pts = [];
  for (let k = 0; k <= seg; k++) { const a = (k / seg) * TAU, r = rf(a); pts.push([cx + Math.cos(a) * r, cz + Math.sin(a) * r, a]); }
  const nrm = pts.map((p, k) => { const a = pts[(k - 1 + seg) % seg], b = pts[(k + 1) % seg]; const d = [b[0] - a[0], b[1] - a[1]]; const l = Math.hypot(d[0], d[1]) || 1; return [d[1] / l, -d[0] / l]; });
  // pared
  for (let k = 0; k <= seg; k++) { const p = pts[k], n = nrm[k % seg]; g.v([p[0], -hy, p[1]], [n[0], 0, n[1]], [k / seg, 0]); g.v([p[0], hy, p[1]], [n[0], 0, n[1]], [k / seg, 1]); }
  for (let k = 0; k < seg; k++) g.quad(k * 2, k * 2 + 1, k * 2 + 3, k * 2 + 2);
  // tapas
  for (const sg of [1, -1]) {
    const base = g.p.length / 3;
    for (let k = 0; k <= seg; k++) { const p = pts[k]; g.v([p[0], sg * hy, p[1]], [0, sg, 0], [0, 0]); }
    if (agujero > 0) {
      const b2 = g.p.length / 3;
      for (let k = 0; k <= seg; k++) { const a = (k / seg) * TAU; g.v([Math.cos(a) * agujero, sg * hy, Math.sin(a) * agujero], [0, sg, 0], [0, 0]); }
      for (let k = 0; k < seg; k++) { if (sg > 0) g.quad(base + k, b2 + k, b2 + k + 1, base + k + 1); else g.quad(base + k, base + k + 1, b2 + k + 1, b2 + k); }
    } else {
      const c = g.v([cx, sg * hy, cz], [0, sg, 0]);
      for (let k = 0; k < seg; k++) { if (sg > 0) g.tri(base + k, c, base + k + 1); else g.tri(base + k, base + k + 1, c); }
    }
  }
  return g;
}
// tubo a lo largo de un camino (transporte paralelo). radio número o función(s)
function tubo(camino, radio, lados = 16, cerrado = false, perfil = null) {
  const g = new Geo(), n = camino.length, T = [];
  for (let i = 0; i < n; i++) { const a = camino[cerrado ? (i - 1 + n) % n : Math.max(0, i - 1)], b = camino[cerrado ? (i + 1) % n : Math.min(n - 1, i + 1)]; T.push(V.norm(V.sub(b, a))); }
  let N0 = V.norm(V.cross(T[0], Math.abs(T[0][1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])); const F = [];
  for (let i = 0; i < n; i++) { if (i) { const b = V.cross(T[i - 1], T[i]); if (V.len(b) > 1e-6) { const ax = V.norm(b), ang = Math.acos(clamp(V.dot(T[i - 1], T[i]), -1, 1)); N0 = rotEje(N0, ax, ang); } } F.push([N0, V.cross(T[i], N0)]); }
  let s = 0; const L = [0]; for (let i = 1; i < n; i++) { s += V.len(V.sub(camino[i], camino[i - 1])); L.push(s); }
  const pf = perfil || ((a) => [Math.cos(a), Math.sin(a)]);
  const rows = cerrado ? n + 1 : n;
  for (let i = 0; i < rows; i++) {
    const ii = i % n, r = typeof radio === "function" ? radio(i / (n - 1)) : radio, [N, B] = F[ii];
    for (let k = 0; k <= lados; k++) {
      const a = (k / lados) * TAU, [cx, cy] = pf(a), nn = V.norm(V.add(V.mul(N, cx), V.mul(B, cy)));
      g.v(V.add(camino[ii], V.add(V.mul(N, cx * r), V.mul(B, cy * r))), nn, [cerrado && i === n ? s + V.len(V.sub(camino[0], camino[n - 1])) : L[ii], k / lados]);
    }
  }
  for (let i = 0; i < rows - 1; i++) for (let k = 0; k < lados; k++) { const a = i * (lados + 1) + k, b = a + lados + 1; g.quad(a, b, b + 1, a + 1); }
  return g;
}
function rotEje(v, ax, a) { const c = Math.cos(a), s = Math.sin(a); return V.add(V.add(V.mul(v, c), V.mul(V.cross(ax, v), s)), V.mul(ax, V.dot(ax, v) * (1 - c))); }
// muelle (hélice) de radio R, alambre r, n espiras, altura 1 (se escala en Y)
function muelle(R, r, vueltas, lados = 10) { const c = []; const N = vueltas * 40; for (let i = 0; i <= N; i++) { const a = (i / N) * vueltas * TAU; c.push([Math.cos(a) * R, i / N, Math.sin(a) * R]); } return tubo(c, r, lados); }
// chapa rectangular (u a lo largo de X, v a lo largo de Y), deformable
function chapa(nx, ny, f) { const g = new Geo(); for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) g.v(f(i / nx, j / ny), [0, 0, 1], [i / nx, j / ny]); for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const a = i * (ny + 1) + j, b = a + ny + 1; g.quad(a, b, b + 1, a + 1); } normales(g); return g; }
function normales(g) {
  const n = new Float32Array(g.p.length);
  for (let k = 0; k < g.i.length; k += 3) { const [a, b, c] = [g.i[k], g.i[k + 1], g.i[k + 2]]; const A = [g.p[a * 3], g.p[a * 3 + 1], g.p[a * 3 + 2]], B = [g.p[b * 3], g.p[b * 3 + 1], g.p[b * 3 + 2]], Cc = [g.p[c * 3], g.p[c * 3 + 1], g.p[c * 3 + 2]]; const f = V.cross(V.sub(B, A), V.sub(Cc, A)); for (const x of [a, b, c]) { n[x * 3] += f[0]; n[x * 3 + 1] += f[1]; n[x * 3 + 2] += f[2]; } }
  for (let k = 0; k < n.length; k += 3) { const l = Math.hypot(n[k], n[k + 1], n[k + 2]) || 1; g.n[k] = n[k] / l; g.n[k + 1] = n[k + 1] / l; g.n[k + 2] = n[k + 2] / l; }
}

/* ---------------------------------------------------------------- mallas en la GPU */
class Malla {
  constructor(g, dinamica = false) {
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao); this.bufs = [];
    const U = dinamica ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW;
    [[g.p, 3], [g.n, 3], [g.u, 2]].forEach(([d, s], loc) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(d), U); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, s, gl.FLOAT, false, 0, 0); this.bufs.push(b); });
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(g.i), gl.STATIC_DRAW);
    this.n = g.i.length; gl.bindVertexArray(null);
  }
  actualizar(g) { gl.bindBuffer(gl.ARRAY_BUFFER, this.bufs[0]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(g.p)); gl.bindBuffer(gl.ARRAY_BUFFER, this.bufs[1]); gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(g.n)); }
}

/* ---------------------------------------------------------------- shaders */
function prog(vs, fs) {
  const mk = (t, s) => { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(x) + "\n" + s.split("\n").map((l, i) => i + 1 + ": " + l).join("\n")); return x; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (let i = 0; i < n; i++) { const inf = gl.getActiveUniform(p, i); u[inf.name.replace("[0]", "")] = gl.getUniformLocation(p, inf.name); }
  return { p, u };
}
const COMUN = `
float h12(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }
float h13(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float ruido(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
  return mix(mix(mix(h13(i),h13(i+vec3(1,0,0)),f.x),mix(h13(i+vec3(0,1,0)),h13(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h13(i+vec3(0,0,1)),h13(i+vec3(1,0,1)),f.x),mix(h13(i+vec3(0,1,1)),h13(i+vec3(1,1,1)),f.x),f.y),f.z); }
// estudio: fondo grafito, caja de luz arriba, tira de luz principal, contraluz cálido y frío
vec3 env(vec3 d, float r){
  float w = r*r;
  // paredes del estudio (solo se ven reflejadas: el fondo visible es otro). Gris medio → el metal se ve plata
  vec3 c = mix(vec3(0.05,0.052,0.056), vec3(0.20,0.205,0.215), smoothstep(-0.8,0.6,d.y));
  c += vec3(0.10)*smoothstep(0.5,1.0,1.-abs(d.y))*smoothstep(-0.2,0.8,d.z);
  float e = 1.0 - 0.75*r;
  c += vec3(1.25)*e * smoothstep(0.80-0.55*w, 0.97, d.y);                                             // caja de luz superior
  c += vec3(2.3)*e  * smoothstep(0.935-0.6*w, 0.995, dot(d, normalize(vec3(-0.75,0.35,0.55))));       // tira principal
  c += vec3(2.6,1.15,0.50)*1.15*e * smoothstep(0.95-0.6*w, 0.997, dot(d, normalize(vec3(0.9,0.25,-0.55)))); // contraluz naranja
  c += vec3(0.55,1.15,2.3)*0.85*e * smoothstep(0.95-0.6*w, 0.997, dot(d, normalize(vec3(-0.8,0.15,-0.7)))); // contraluz azul
  c += vec3(0.9)*e * smoothstep(0.96-0.6*w, 0.998, dot(d, normalize(vec3(0.55,0.05,0.85))));          // relleno frontal
  c += vec3(0.035) * smoothstep(0.1,-0.9,d.y);
  return c;
}
vec3 envBRDF(vec3 F0, float r, float NoV){ const vec4 c0=vec4(-1.,-0.0275,-0.572,0.022); const vec4 c1=vec4(1.,0.0425,1.04,-0.04);
  vec4 rr=r*c0+c1; float a004=min(rr.x*rr.x, exp2(-9.28*NoV))*rr.x+rr.y; vec2 AB=vec2(-1.04,1.04)*a004+rr.zw; return F0*AB.x+AB.y; }
`;
const VS_MAIN = `#version 300 es
layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec2 aU;
uniform mat4 uM, uVP, uLVP; out vec3 vW, vN, vO, vON; out vec2 vU; out vec4 vL;
void main(){ vec4 w=uM*vec4(aP,1.); vW=w.xyz; vO=aP; vON=aN; vU=aU; vN=normalize(transpose(inverse(mat3(uM)))*aN); vL=uLVP*w; gl_Position=uVP*w; }`;
const FS_MAIN = `#version 300 es
precision highp float;
in vec3 vW, vN, vO, vON; in vec2 vU; in vec4 vL;
uniform vec3 uCam, uBase, uEmis, uLdir, uLcol, uSA, uSC, uXcol;
uniform float uMetal, uRough, uClear, uFlake, uT, uXray, uAlpha;
uniform vec2 uSP; uniform int uPat; uniform vec4 uPA, uPB;
uniform sampler2D uShadow, uTex; uniform int uHasTex; uniform vec4 uClip; uniform float uClipOn;
out vec4 o;
${COMUN}
float sombra(){ vec3 p=vL.xyz/vL.w*0.5+0.5; if(p.x<0.||p.x>1.||p.y<0.||p.y>1.||p.z>1.) return 1.;
  float s=0., b=0.0018; vec2 tx=1./vec2(textureSize(uShadow,0));
  for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++){ s += (p.z-b <= texture(uShadow, p.xy+vec2(i,j)*tx*1.6).r) ? 1. : 0.; }
  return s/9.; }
vec3 cuerpoNegro(float k){ k=clamp(k,0.,1.); return mix(mix(vec3(0.0),vec3(1.2,0.08,0.01),smoothstep(0.,0.35,k)), mix(vec3(3.2,0.9,0.12),vec3(5.,3.6,1.6),smoothstep(0.75,1.,k)), smoothstep(0.3,0.8,k)); }
void main(){
  if(uClipOn>0. && dot(vW,uClip.xyz)>uClip.w) discard;
  vec3 N=normalize(vN); if(!gl_FrontFacing) N=-N;
  vec3 Vd=normalize(uCam-vW);
  vec3 base=uBase; float met=uMetal, rou=uRough, clr=uClear; vec3 emi=uEmis; float fl=uFlake;
  if(uHasTex==1){ base*=texture(uTex, vU).rgb; }
  /* ---------- patrones de detalle ---------- */
  if(uPat==1){ // metal mecanizado: anillos finos de torno
    float r=length(vO.xz); float an=sin(r*uPA.x)*0.5+0.5; rou=clamp(rou*(0.75+0.5*an),0.03,1.); base*=0.93+0.07*an;
  } else if(uPat==2){ // disco de freno: taladros, ranuras y calor
    float r=length(vO.xz), a=atan(vO.z,vO.x);
    float cara = step(0.6, abs(vON.y));
    float fila = floor((r-0.64)/0.11); vec2 cel = vec2(a*(18.0/3.14159) + fila*0.5, (r-0.64)/0.11);
    vec2 f = fract(cel)-0.5; float hoyo = cara*step(0.,fila)*step(fila,2.)*(1.-smoothstep(0.17,0.21,length(f*vec2(1.,1.1))));
    float ranura = cara*smoothstep(0.02,0.0,abs(fract((a*6./3.14159)+r*1.8)-0.5)-0.012)*step(0.62,r)*step(r,0.98)*(1.-hoyo);
    base = mix(base, vec3(0.02), max(hoyo, ranura*0.8)); rou = mix(rou, 0.9, max(hoyo,ranura));
    float anillo = smoothstep(0.52,0.62,r)*smoothstep(1.03,0.95,r);
    float k = uPA.x*anillo*(0.82+0.18*ruido(vec3(r*9., a*3., uT*2.)));
    emi += cuerpoNegro(k)*(1.-hoyo*0.6)*uPA.y;
    rou = mix(rou, 0.45, k);
  } else if(uPat==3){ // placa electrónica: pistas y pulso
    vec2 g=vO.xz*uPA.x; vec2 id=floor(g), f=fract(g); float h=h12(id);
    float pis = (h<0.42? smoothstep(0.09,0.05,abs(f.y-0.5)) : 0.) + (h>0.58? smoothstep(0.09,0.05,abs(f.x-0.5)) : 0.);
    pis += smoothstep(0.2,0.15,length(f-0.5))*step(0.85,h);
    pis = clamp(pis,0.,1.)*step(0.5,vON.y);
    base = mix(base, vec3(0.75,0.55,0.25), pis); met = mix(met, 1., pis); rou = mix(rou, 0.3, pis);
    float d = length(vO.xz); float R = uPA.y;
    float pulso = exp(-pow((d-R)/0.07,2.)) + 0.45*exp(-pow((d-R+0.5)/0.07,2.));
    float corre = pow(fract(dot(id,vec2(0.13,0.21)) - uT*3.0),6.);
    emi += vec3(0.25,1.6,2.6)*pis*(pulso*3.0 + corre*0.8 + 0.15);
  } else if(uPat==4){ // chapa pintada: cobertura de pintura / barniz / arañazos / golpe
    float u=vU.x, v=vU.y;
    if(uPA.x>0.5 && uPA.x<1.5){ // pintura
      float pint = step(u, uPA.y), barn = step(u, uPA.z)*pint;
      base = mix(vec3(0.34,0.35,0.36), base, pint); met = mix(0.0, met, pint); fl = fl*pint;
      rou = mix(0.72, mix(0.38, 0.05, barn), pint); clr = barn;
      float borde = exp(-pow((u-uPA.y)/0.012,2.))*step(0.001,uPA.y)*step(uPA.y,0.999); rou = mix(rou, 0.12, borde);
    } else if(uPA.x>1.5 && uPA.x<2.5){ // arañazos que desaparecen tras el escáner
      float ar = uHasTex==1 ? 0. : 0.;
      ar = texture(uTex, vU).a * (u>uPA.y ? 1. : uPA.w);
      base = mix(base, vec3(0.55,0.5,0.5), ar); rou = mix(rou, 0.55, ar); clr = mix(clr, 0.0, ar);
      emi += vec3(1.6,0.35,2.8)*exp(-pow((u-uPA.y)/0.018,2.))*uPA.z + vec3(0.5,0.08,0.9)*exp(-abs(u-uPA.y)*18.)*uPA.z*0.35;
    } else if(uPA.x>2.5){ // golpe: calor del láser en la abolladura
      float dent = exp(-(pow((u-0.52)/0.16,2.)+pow((v-0.5)/0.22,2.)));
      dent *= uPA.z>0. ? smoothstep(uPA.z*1.0-0.03, uPA.z+0.06, u) : 1.;
      emi += cuerpoNegro(dent*uPA.y)*0.9 + vec3(3.,1.6,0.6)*exp(-pow((u-uPA.z)/0.006,2.))*step(0.001,uPA.z)*step(uPA.z,0.999)*2.5;
    }
  } else if(uPat==5){ // escáner holográfico sobre la carrocería
    float s = uPA.x; float det = step(s, vW.x);
    vec3 gl3 = abs(fract(vW*vec3(6.,6.,6.))-0.5); float red = smoothstep(0.47,0.5,max(gl3.x,max(gl3.y,gl3.z)));
    float fr = pow(1.-max(dot(N,Vd),0.),2.5);
    emi += det*(vec3(0.2,1.8,0.8)*red*0.9 + vec3(0.15,1.2,0.6)*fr*0.8);
    base = mix(base, base*0.35, det*0.6);
    emi += vec3(0.8,4.,2.)*exp(-pow((vW.x-s)/0.025,2.))*uPA.y;
  } else if(uPat==6){ // goma de neumático
    rou = clamp(rou + (ruido(vO*40.)-0.5)*0.15, 0.5, 1.);
  } else if(uPat==7){ // aletas de radiador
    float l = sin(vO.x*uPA.x)*0.5+0.5; rou = mix(0.2,0.6,l); base*=0.8+0.2*l;
    emi += uPB.rgb * pow(l,8.) * uPB.a;
  } else if(uPat==8){ // correa dentada que avanza
    float st = smoothstep(0.35,0.5,fract((vU.x - uPA.x)/uPA.y))*smoothstep(0.85,0.7,fract((vU.x - uPA.x)/uPA.y)); base = mix(base, base*0.6, st); rou = mix(rou, 0.85, st*0.4);
  } else if(uPat==9){ // pistón: segmentos oscuros
    float y=vO.y; float seg = 0.; for(int i=0;i<3;i++){ seg += smoothstep(0.012,0.0,abs(y-uPA.x+float(i)*uPA.y)); }
    base = mix(base, vec3(0.05), clamp(seg,0.,1.)); rou = mix(rou, 0.6, clamp(seg,0.,1.));
  } else if(uPat==10){ // cable / tubo con pulsos de energía
    emi += uPB.rgb * pow(fract(vU.x*uPA.x - uT*uPA.y),uPA.z) * uPB.a;
  }
  /* ---------- rayos X (transparente, se suma) ---------- */
  if(uXray>0.){
    float fr = pow(1.-abs(dot(N,Vd)), 2.2);
    vec3 col = uXcol*(0.06 + fr*1.4) * uXray;
    vec3 sl = abs(fract(vW*8.)-0.5); col += uXcol*smoothstep(0.485,0.5,max(sl.x,max(sl.y,sl.z)))*0.25*uXray;
    o = vec4(col, 1.); return;
  }
  /* ---------- luz ---------- */
  vec3 Nb = N;
  if(fl>0.){ vec3 hsh = vec3(h13(floor(vW*700.)), h13(floor(vW*700.)+7.1), h13(floor(vW*700.)+3.3))-0.5; Nb = normalize(N + hsh*0.35*fl); }
  float NoV = max(dot(Nb,Vd), 1e-3);
  vec3 F0 = mix(vec3(0.04), base, met);
  vec3 R = reflect(-Vd, Nb);
  vec3 spec = env(R, rou) * envBRDF(F0, rou, NoV);
  vec3 dif = base*(1.-met) * (env(Nb, 1.0)*0.6 + vec3(0.015));
  float sh = sombra();
  vec3 L = normalize(uLdir), H = normalize(L+Vd); float NoL = max(dot(Nb,L),0.), NoH = max(dot(Nb,H),0.);
  float a = max(rou*rou, 0.002); float a2=a*a; float dd = NoH*NoH*(a2-1.)+1.; float D = a2/(3.14159*dd*dd);
  vec3 F = F0 + (1.-F0)*pow(1.-max(dot(H,Vd),0.),5.);
  float Vis = 0.5/max(NoL*sqrt(NoV*NoV*(1.-a2)+a2) + NoV*sqrt(NoL*NoL*(1.-a2)+a2), 1e-4);
  vec3 direct = (base*(1.-met)/3.14159 + D*Vis*F) * uLcol * NoL * sh;
  vec3 col = dif*mix(0.55,1.,sh) + spec*mix(0.6,1.,sh) + direct;
  if(clr>0.){ float Fc = 0.04 + 0.96*pow(1.-max(dot(N,Vd),0.),5.); vec3 Rc = reflect(-Vd,N); col = col*(1.-Fc*clr) + env(Rc, 0.03)*Fc*clr*1.1; }
  // banda de escaneo X-Ray que recorre toda la escena
  if(uSP.y>0.){ float s = dot(vW,uSA) - uSP.x; float band = exp(-pow(s/uSP.y,2.)); vec3 gg = abs(fract(vW*10.)-0.5); float wire = smoothstep(0.46,0.5,max(gg.x,max(gg.y,gg.z)))*smoothstep(uSP.y*6.,0.,abs(s))*step(s,0.);
    emi += uSC*(band*2.2 + wire*0.9); }
  col += emi;
  o = vec4(col, uAlpha);
}`;
const VS_SOMBRA = `#version 300 es
layout(location=0) in vec3 aP; uniform mat4 uM, uLVP; void main(){ gl_Position=uLVP*uM*vec4(aP,1.); }`;
const FS_SOMBRA = `#version 300 es
precision highp float; out vec4 o; void main(){ o=vec4(1.); }`;
const VS_FULL = `#version 300 es
out vec2 vUv; void main(){ vec2 p=vec2((gl_VertexID<<1)&2, gl_VertexID&2); vUv=p; gl_Position=vec4(p*2.-1.,0.,1.); }`;
const FS_FONDO = `#version 300 es
precision highp float; in vec2 vUv; uniform vec2 uRes; uniform vec3 uTint; uniform float uT; out vec4 o;
${COMUN}
void main(){ vec2 p=(vUv-vec2(0.5,0.58))*vec2(uRes.x/uRes.y,1.);
  float r=length(p); vec3 c = mix(vec3(0.052,0.055,0.062), vec3(0.006,0.007,0.009), smoothstep(0.0,1.1,r));
  c += uTint*0.035*exp(-r*r*3.);
  c += vec3(0.02)*smoothstep(0.9,0.2,abs(vUv.y-0.18))*0.5*smoothstep(1.2,0.,abs(p.x));
  c += (h12(vUv*uRes+uT)-0.5)*0.004;
  o=vec4(c,1.); }`;
const FS_BRILLO = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform float uUmbral; out vec4 o;
void main(){ vec2 tx=1./vec2(textureSize(uTex,0)); vec3 c=vec3(0.);
  for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++) c+=texture(uTex, vUv+vec2(i,j)*tx).rgb; c/=9.;
  float l=max(c.r,max(c.g,c.b)); o=vec4(c*max(l-uUmbral,0.)/max(l,1e-4),1.); }`;
const FS_BLUR = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform vec2 uDir; out vec4 o;
void main(){ vec2 tx=uDir/vec2(textureSize(uTex,0)); vec3 c=texture(uTex,vUv).rgb*0.227;
  c+= (texture(uTex,vUv+tx*1.38).rgb+texture(uTex,vUv-tx*1.38).rgb)*0.316; c+=(texture(uTex,vUv+tx*3.23).rgb+texture(uTex,vUv-tx*3.23).rgb)*0.07; o=vec4(c,1.); }`;
const FS_FINAL = `#version 300 es
precision highp float; in vec2 vUv; uniform sampler2D uTex, uB1, uB2, uB3; uniform float uExp, uBloom, uT; uniform vec2 uRes; out vec4 o;
${COMUN}
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.,1.); }
void main(){ vec2 d=(vUv-0.5); float ca=0.0012;
  vec3 c = vec3(texture(uTex, vUv-d*ca).r, texture(uTex, vUv).g, texture(uTex, vUv+d*ca).b);
  vec3 b = texture(uB1,vUv).rgb*0.55 + texture(uB2,vUv).rgb*0.75 + texture(uB3,vUv).rgb*0.9;
  c += b*uBloom;
  c = aces(c*uExp);
  c *= 1. - 0.55*pow(length(d*vec2(1.,0.9))*1.35, 2.2);
  c = pow(max(c,0.), vec3(1./2.2));
  o = vec4(c,1.); }`;
const VS_PART = `#version 300 es
layout(location=0) in vec2 aC; layout(location=1) in vec3 iA; layout(location=2) in vec3 iB; layout(location=3) in vec4 iCol; layout(location=4) in float iS;
uniform mat4 uVP; uniform vec2 uRes; out vec2 vC; out vec4 vCol; out float vPt;
void main(){ vec4 a=uVP*vec4(iA,1.), b=uVP*vec4(iB,1.);
  vec2 sa=a.xy/a.w*uRes*0.5, sb=b.xy/b.w*uRes*0.5; vec2 d=sb-sa; float L=length(d);
  vec2 dir = L>0.01 ? d/L : vec2(1.,0.); vec2 nr=vec2(-dir.y,dir.x);
  float w = max(iS*uRes.y*1.2/a.w, 0.7);
  float k = aC.x*0.5+0.5; vec4 cl = mix(a,b,k);
  vec2 sp = mix(sa,sb,k) + dir*aC.x*w + nr*aC.y*w;
  gl_Position = vec4(sp/(uRes*0.5)*cl.w, cl.z, cl.w);
  vC=aC; vCol=iCol; vPt = L < w*0.5 ? 1. : 0.; if(w<1.5) vCol.a *= w/1.5; }`;
const FS_PART = `#version 300 es
precision highp float; in vec2 vC; in vec4 vCol; in float vPt; out vec4 o;
void main(){ float f = vPt>0.5 ? exp(-4.*dot(vC,vC))*smoothstep(1.,0.7,length(vC)) : exp(-3.2*vC.y*vC.y) * smoothstep(1.,0.45,abs(vC.x)); o = vec4(vCol.rgb*vCol.a*f, 1.); }`;

const P = {
  main: prog(VS_MAIN, FS_MAIN), sombra: prog(VS_SOMBRA, FS_SOMBRA), fondo: prog(VS_FULL, FS_FONDO),
  brillo: prog(VS_FULL, FS_BRILLO), blur: prog(VS_FULL, FS_BLUR), final: prog(VS_FULL, FS_FINAL), part: prog(VS_PART, FS_PART),
};

/* ---------------------------------------------------------------- framebuffers */
let FB = null;
function tex(w, h, fmt = gl.RGBA16F, filt = gl.LINEAR) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texStorage2D(gl.TEXTURE_2D, 1, fmt, w, h); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); return t; }
function fbo(t, depth) { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); if (t) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); if (depth) gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0); return f; }
function prepararFB(w, h) {
  C.width = w; C.height = h;
  const ms = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, ms);
  const rc = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rc); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.RGBA16F, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rc);
  const rd = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rd); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, 4, gl.DEPTH_COMPONENT24, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rd);
  const res = tex(w, h), fres = fbo(res);
  const SH = 2048, sd = tex(SH, SH, gl.DEPTH_COMPONENT24, gl.NEAREST), fsh = fbo(null, sd);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fsh); gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
  const lv = [2, 4, 8].map((d) => { const a = tex(Math.ceil(w / d), Math.ceil(h / d)), b = tex(Math.ceil(w / d), Math.ceil(h / d)); return { w: Math.ceil(w / d), h: Math.ceil(h / d), a, b, fa: fbo(a), fb: fbo(b) }; });
  FB = { w, h, ms, res, fres, sd, fsh, SH, lv };
}
const QUAD = (() => { const vao = gl.createVertexArray(); gl.bindVertexArray(vao); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); const ib = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, ib); for (const [loc, s, off] of [[1, 3, 0], [2, 3, 12], [3, 4, 24], [4, 1, 40]]) { gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, s, gl.FLOAT, false, 44, off); gl.vertexAttribDivisor(loc, 1); } gl.bindVertexArray(null); return { vao, ib }; })();
const VACIO = gl.createVertexArray();
function pantalla(pr, dst, w, h, fn) { gl.bindFramebuffer(gl.FRAMEBUFFER, dst); gl.viewport(0, 0, w, h); gl.useProgram(pr.p); fn && fn(pr.u); gl.bindVertexArray(VACIO); gl.drawArrays(gl.TRIANGLES, 0, 3); }
function usarTex(u, unidad, t) { gl.activeTexture(gl.TEXTURE0 + unidad); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(u, unidad); }

/* ---------------------------------------------------------------- materiales */
const MAT = (o) => Object.assign({ base: [0.8, 0.8, 0.8], metal: 1, rough: 0.3, clear: 0, flake: 0, emis: [0, 0, 0], pat: 0, pa: [0, 0, 0, 0], pb: [0, 0, 0, 0], tex: null, xray: 0, xcol: [0.3, 0.9, 1.4], alpha: 1, dos: false }, o);
const MATS = {
  acero: () => MAT({ base: [0.78, 0.79, 0.8], metal: 1, rough: 0.22, pat: 1, pa: [900, 0, 0, 0] }),
  cromo: () => MAT({ base: [0.92, 0.93, 0.95], metal: 1, rough: 0.07 }),
  alu: () => MAT({ base: [0.9, 0.91, 0.92], metal: 1, rough: 0.28, pat: 1, pa: [1400, 0, 0, 0] }),
  aluFundido: () => MAT({ base: [0.72, 0.73, 0.74], metal: 1, rough: 0.5 }),
  hierro: () => MAT({ base: [0.46, 0.46, 0.47], metal: 1, rough: 0.42 }),
  oscuro: () => MAT({ base: [0.16, 0.16, 0.17], metal: 1, rough: 0.35 }),
  negroMate: () => MAT({ base: [0.035, 0.035, 0.038], metal: 0, rough: 0.55 }),
  goma: () => MAT({ base: [0.028, 0.028, 0.03], metal: 0, rough: 0.78, pat: 6 }),
  plastico: () => MAT({ base: [0.05, 0.05, 0.055], metal: 0, rough: 0.42 }),
  cobre: () => MAT({ base: [0.95, 0.64, 0.54], metal: 1, rough: 0.25 }),
  oro: () => MAT({ base: [1.0, 0.78, 0.34], metal: 1, rough: 0.2 }),
  rojoPinza: () => MAT({ base: [0.62, 0.035, 0.02], metal: 0, rough: 0.22, clear: 1 }),
  pintura: (c) => MAT({ base: c, metal: 0.55, rough: 0.34, clear: 1, flake: 1 }),
};

/* ---------------------------------------------------------------- render de un fotograma */
function render(esc, t) {
  const { w, h } = FB, asp = w / h;
  const cam = esc.cam; const fovH = cam.fov * Math.PI / 180;
  // mismo encuadre horizontal en vertical: el objeto ocupa el ancho de la pantalla
  const fy = asp >= 1 ? fovH : 2 * Math.atan(Math.tan(fovH / 2) / asp * (cam.vert || 0.82) * 1.3);
  const Vm = M4.look(cam.eye, cam.target), Pm = M4.persp(fy, asp, 0.05, 80), VP = M4.mul(Pm, Vm);
  const L = esc.luz || { dir: [-0.5, 0.9, 0.55], col: [2.4, 2.35, 2.3] };
  const ld = V.norm(L.dir), cen = cam.target, rr = esc.radio || 3;
  const LV = M4.look(V.add(cen, V.mul(ld, rr * 3)), cen, Math.abs(ld[1]) > 0.95 ? [1, 0, 0] : [0, 1, 0]), LP = M4.ortho(-rr, rr, -rr, rr, 0.1, rr * 6), LVP = M4.mul(LP, LV);

  // 1. sombras
  gl.bindFramebuffer(gl.FRAMEBUFFER, FB.fsh); gl.viewport(0, 0, FB.SH, FB.SH); gl.clear(gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(2, 4);
  gl.useProgram(P.sombra.p); gl.uniformMatrix4fv(P.sombra.u.uLVP, false, LVP);
  for (const d of esc.solidos) { if (d.sinSombra) continue; gl.uniformMatrix4fv(P.sombra.u.uM, false, d.M); gl.bindVertexArray(d.malla.vao); gl.drawElements(gl.TRIANGLES, d.malla.n, gl.UNSIGNED_INT, 0); }
  gl.disable(gl.POLYGON_OFFSET_FILL);

  // 2. fondo + sólidos (MSAA, HDR)
  gl.bindFramebuffer(gl.FRAMEBUFFER, FB.ms); gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
  gl.useProgram(P.fondo.p); gl.uniform2f(P.fondo.u.uRes, w, h); gl.uniform3fv(P.fondo.u.uTint, esc.tinte || [0.9, 0.35, 0.15]); gl.uniform1f(P.fondo.u.uT, t * 10); gl.bindVertexArray(VACIO); gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
  const U = P.main.u; gl.useProgram(P.main.p);
  gl.uniformMatrix4fv(U.uVP, false, VP); gl.uniformMatrix4fv(U.uLVP, false, LVP); gl.uniform3fv(U.uCam, cam.eye); gl.uniform3fv(U.uLdir, ld); gl.uniform3fv(U.uLcol, L.col); gl.uniform1f(U.uT, t);
  const sc = esc.scan || { eje: [1, 0, 0], pos: 0, ancho: 0, col: [0, 0, 0] };
  gl.uniform3fv(U.uSA, V.norm(sc.eje)); gl.uniform2f(U.uSP, sc.pos, sc.ancho); gl.uniform3fv(U.uSC, sc.col);
  usarTex(U.uShadow, 0, FB.sd);
  const dibuja = (d) => {
    const m = d.mat; gl.uniformMatrix4fv(U.uM, false, d.M);
    gl.uniform3fv(U.uBase, m.base); gl.uniform1f(U.uMetal, m.metal); gl.uniform1f(U.uRough, m.rough); gl.uniform1f(U.uClear, m.clear); gl.uniform1f(U.uFlake, m.flake);
    gl.uniform3fv(U.uEmis, m.emis); gl.uniform1i(U.uPat, m.pat); gl.uniform4fv(U.uPA, m.pa); gl.uniform4fv(U.uPB, m.pb); gl.uniform1f(U.uXray, m.xray); gl.uniform3fv(U.uXcol, m.xcol); gl.uniform1f(U.uAlpha, m.alpha); gl.uniform4fv(U.uClip, d.clip || [0, 0, 0, 0]); gl.uniform1f(U.uClipOn, d.clip ? 1 : 0);
    if (m.tex) { usarTex(U.uTex, 1, m.tex); gl.uniform1i(U.uHasTex, 1); } else gl.uniform1i(U.uHasTex, 0);
    gl.bindVertexArray(d.malla.vao); gl.drawElements(gl.TRIANGLES, d.malla.n, gl.UNSIGNED_INT, 0);
  };
  for (const d of esc.solidos) dibuja(d);
  // 3. piezas en rayos X (se suman, sin escribir profundidad)
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
  for (const d of esc.rayosx || []) dibuja(d);
  // 4. partículas
  const pts = esc.particulas || [];
  if (pts.length) {
    const n = pts.length / 11; gl.useProgram(P.part.p); gl.uniformMatrix4fv(P.part.u.uVP, false, VP); gl.uniform2f(P.part.u.uRes, w, h);
    gl.bindBuffer(gl.ARRAY_BUFFER, QUAD.ib); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.DYNAMIC_DRAW);
    gl.bindVertexArray(QUAD.vao); gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
  }
  gl.depthMask(true); gl.disable(gl.BLEND);
  // 5. resolver MSAA
  gl.bindFramebuffer(gl.READ_FRAMEBUFFER, FB.ms); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, FB.fres); gl.blitFramebuffer(0, 0, w, h, 0, 0, w, h, gl.COLOR_BUFFER_BIT, gl.NEAREST);
  // 6. bloom
  gl.disable(gl.DEPTH_TEST);
  let src = FB.res;
  FB.lv.forEach((l, i) => {
    pantalla(P.brillo, l.fa, l.w, l.h, (u) => { usarTex(u.uTex, 0, src); gl.uniform1f(u.uUmbral, i === 0 ? (esc.umbral || 1.0) : 0.0); });
    for (let k = 0; k < 2; k++) {
      pantalla(P.blur, l.fb, l.w, l.h, (u) => { usarTex(u.uTex, 0, l.a); gl.uniform2f(u.uDir, 1, 0); });
      pantalla(P.blur, l.fa, l.w, l.h, (u) => { usarTex(u.uTex, 0, l.b); gl.uniform2f(u.uDir, 0, 1); });
    }
    src = l.a;
  });
  // 7. composición final
  pantalla(P.final, null, w, h, (u) => { usarTex(u.uTex, 0, FB.res); usarTex(u.uB1, 1, FB.lv[0].a); usarTex(u.uB2, 2, FB.lv[1].a); usarTex(u.uB3, 3, FB.lv[2].a); gl.uniform1f(u.uExp, esc.exposicion || 1.0); gl.uniform1f(u.uBloom, esc.bloom ?? 0.6); gl.uniform1f(u.uT, t); gl.uniform2f(u.uRes, w, h); });
}

/* partículas: [xa,ya,za, xb,yb,zb, r,g,b,a, tamaño] */
function part(arr, a, b, col, s) { arr.push(a[0], a[1], a[2], b[0], b[1], b[2], col[0], col[1], col[2], col[3] ?? 1, s); }
