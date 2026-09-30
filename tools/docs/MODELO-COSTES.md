# Coste de personal (Jornada) · modelo y reglas

- Tarifa por hora de cada persona en `jornada/config/costes` = `{ <uid>: [{ desde: "AAAA-MM-DD", cent }] }`. Cada cambio vale desde su fecha; los días anteriores conservan la tarifa de entonces (`netlify/lib/costes.mts`).
- Coste de un día = minutos trabajados (sin pausas; las horas extra a la misma tarifa) × tarifa de ese día. Es una **estadística teórica**: no crea movimientos en Caja ni en Finanzas.
- API (solo gerente): `GET /api/jornada/costes`, `POST /api/jornada/coste {uid, euroHora, desde?}` (0–500 €/h, sin fechas futuras; queda en el libro de Jornada). `GET /api/jornada/plantilla` añade `tarifaCent`, `costeHoyCent`, `costeMesCent`; `GET /api/jornada/registro` añade `costeCent` por día y persona **solo si quien pregunta es gerente**.
- El trabajador nunca recibe importes (`/yo`, su `/registro`).
- Pantalla: Jornada → «Coste de personal en directo» (se actualiza cada segundo mientras alguien tiene la jornada abierta) y «Tarifas por hora». Pruebas: `e2e-costes.mjs` y `e2e-costes-panel.py`.
