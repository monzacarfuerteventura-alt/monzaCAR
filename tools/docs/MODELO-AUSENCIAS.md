# Ausencias (RRHH) · modelo de datos y permisos

Tienda de Netlify Blobs `ausencias` (solo se accede desde `netlify/functions/ausencias.mts`).

| Clave | Contenido |
|---|---|
| `sol/<id>` | Una solicitud: `ref` (AUS-AAAA-NNN), `uid`, `nombre`, `tipo`, `desde`, `hasta`, `horaDesde/horaHasta` (solo si es un día), `dias`, `laborables` (L-V), `motivo`, `docs[]`, `estado`, `decision`, `historial[]`, `leidaGerente`, `vistaTrabajador` |
| `doc/<clave>` | El archivo (foto o PDF, máx. 4 MB) |
| `docmeta/<clave>` | Quién lo subió, nombre, tipo y tamaño |
| `cont/<año>` | Contador de referencias |
| `log/…` · `libro-cabeza` | Libro encadenado (SHA-256) de `anotar("ausencias", …)` |

**Tipos:** baja médica, cita médica, permiso retribuido, vacaciones, asuntos propios, deber público, retraso/falta puntual, otro.
**Estados:** pendiente → aprobada · rechazada · falta información (el trabajador responde y vuelve a pendiente) · cancelada (solo el trabajador, mientras no esté decidida).

**Permisos**
- Trabajador (usuario+PIN): comunica, sube documentos, responde, cancela y ve SOLO lo suyo. No exige haber fichado (quien está de baja no puede fichar).
- Gerente: ve todo, decide (aprobar con/sin sueldo · rechazar con motivo · pedir información), registra ausencias a nombre de otra persona.
- Los documentos se sirven solo a su dueño y al gerente (`Authorization`), con `cache-control: private, no-store`. No hay enlaces públicos.

**Privacidad:** el libro encadenado NO guarda el motivo ni el contenido de los documentos (pueden ser datos de salud): solo quién, qué, cuándo, tipo y fechas.

**API:** ver la cabecera de `netlify/functions/ausencias.mts`. Pruebas: `tools/pruebas/e2e-ausencias.mjs` (servidor) y `e2e-ausencias-panel.py` (navegador).
