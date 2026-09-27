// PRUEBA DE CARGA DE volcanocars.com con k6 (https://k6.io) — solo lecturas, no crea clientes ni citas.
//
// Cómo usarla (Windows, sin permisos de administrador):
//   1. Descarga k6 portable: https://github.com/grafana/k6/releases → k6-vX.Y.Z-windows-amd64.zip → descomprímelo.
//   2. En PowerShell, dentro de esa carpeta:
//        .\k6.exe run ..\ruta\a\prueba-carga.js                      (día normal x10 + pico, ~6 min)
//        .\k6.exe run -e ESCENARIO=humo ..\ruta\a\prueba-carga.js     (1 minuto suave, para empezar)
//   3. Al final mira: http_req_duration p(95) (debe ser < 800 ms) y http_req_failed (debe ser < 1 %).
//
// Qué simula: un día normal de 1.000 visitas concentrado 10 veces (hora punta) y después un pico como el de
// un anuncio o un vídeo viral: hasta 20 peticiones por segundo (unas 50-60 personas navegando a la vez).
// Coste: unas 5.000 peticiones, casi todas servidas desde la caché del CDN: céntimos, no euros.
// Aviso: algunas rutas tienen freno anti-abuso por IP (p. ej. 120 fichas/minuto). Si ves respuestas 429
// en el pico es que el freno funciona: no es un fallo de la web (desde una sola IP parecemos un robot).
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

http.setResponseCallback(http.expectedStatuses(200, 429)); // el 429 es el freno anti-abuso, no un error
const BASE = __ENV.BASE || "https://volcanocars.com";
const frenadas = new Rate("respuestas_429_freno_antiabuso");

const ESC = {
  humo: { humo: { executor: "constant-vus", vus: 2, duration: "1m" } },
  completo: {
    hora_punta: { executor: "constant-arrival-rate", rate: 3, timeUnit: "1s", duration: "3m", preAllocatedVUs: 10, maxVUs: 40 },
    pico: { executor: "ramping-arrival-rate", startRate: 3, timeUnit: "1s", preAllocatedVUs: 30, maxVUs: 120, startTime: "3m",
      stages: [{ target: 20, duration: "1m" }, { target: 20, duration: "2m" }, { target: 0, duration: "30s" }] },
  },
};

export const options = {
  scenarios: ESC[__ENV.ESCENARIO || "completo"],
  thresholds: {
    "http_req_duration{tipo:pagina}": ["p(95)<800"],
    "http_req_duration{tipo:api}": ["p(95)<600"],
    "http_req_failed": ["rate<0.01"],
  },
};

export function setup() {
  // Coge fichas de coches reales del sitemap
  const xml = http.get(`${BASE}/sitemap.xml`).body || "";
  const fichas = [...xml.matchAll(/<loc>(https?:\/\/[^<]+\/coche\/[^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, ""));
  return { fichas: fichas.length ? fichas : [] };
}

const PAGINAS = ["/", "/taller-mecanico-fuerteventura/", "/chapa-y-pintura-fuerteventura/", "/coches-segunda-mano-fuerteventura/",
  "/coches-segunda-mano-corralejo", "/taller-mecanico-puerto-del-rosario", "/contacto", "/en/"];

export default function (d) {
  const r = Math.random();
  let ruta, tipo = "pagina";
  if (r < 0.35) ruta = PAGINAS[Math.floor(Math.random() * PAGINAS.length)];
  else if (r < 0.65) { ruta = "/api/coches"; tipo = "api"; }
  else if (r < 0.95 && d.fichas.length) ruta = d.fichas[Math.floor(Math.random() * d.fichas.length)];
  else { ruta = "/api/salud"; tipo = "api"; }
  const res = http.get(BASE + ruta, { tags: { tipo, name: ruta.startsWith("/coche/") ? "/coche/:slug" : ruta }, headers: { "user-agent": "VolcanoCars-prueba-carga" } });
  frenadas.add(res.status === 429);
  check(res, { "responde 200 (o 429 = freno)": (x) => x.status === 200 || x.status === 429 });
  sleep(Math.random() * 2);
}
