# Tema «high-tech» en toda la web y el panel

Toda la web tiene ahora el mismo estilo que el taller nuevo: fondo carbón `#121212`, tarjetas `#1E1E1E`, naranja volcánico `#D94A26` / `#C83E1A`, letra técnica Titillium Web y brillos suaves. Esto incluye la portada, /comprar, /taller, /contacto, la versión inglesa, las páginas de servicios y pueblos, las fichas de coche, las páginas legales, el seguimiento de reparación y el **panel de administración** entero.

Es un cambio **solo de aspecto**. No se ha tocado ninguna ID, ningún formulario ni ninguna función. La reserva, el CRM, la caja, las finanzas, el almacén, el asistente con IA y las copias siguen funcionando igual.

## Archivos

| Archivo | Para qué |
|---|---|
| `public/tema.css` | Estilo de la web pública, las páginas de servicios y pueblos, las fichas, las legales y el seguimiento. |
| `public/tema-admin.css` | Estilo del panel. Al imprimir (informes, órdenes, etiquetas, finanzas) todo vuelve a salir en claro. |
| `tools/tema.py` | Deja el modo oscuro siempre activo y enlaza las hojas del tema. Lo ejecuta solo `tools/build-en.py`. |

## Cambiar colores

Los colores están al principio de `public/tema.css` y de `public/tema-admin.css`:

```css
--tx-bg: #121212;     /* fondo */
--tx-card: #1E1E1E;   /* tarjetas */
--tx-acc: #D94A26;    /* naranja principal */
--tx-acc-2: #C83E1A;  /* naranja oscuro */
```

Cámbialos en los dos archivos y publica.

## Volver al diseño anterior

Borra las líneas `<link rel="stylesheet" href="/tema.css">` (y `/tema-admin.css` en `admin.html`). La web seguirá en oscuro con el diseño anterior, y todo funciona igual.

## Publicar

Un solo ZIP y un solo comando de PowerShell (`PUBLICAR-EN-LA-WEB.ps1`). Gasta 15 créditos de Netlify. Después abre la web y pulsa **Ctrl + F5**.
