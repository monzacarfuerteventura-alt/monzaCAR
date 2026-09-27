# COMPROBACIÓN RÁPIDA DE volcanocars.com (2 minutos). Solo lee páginas: no crea nada.
# Uso:  powershell -ExecutionPolicy Bypass -File .\COMPROBAR-WEB.ps1
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$base = "https://volcanocars.com"
$rutas = @("/", "/en/", "/comprar", "/taller", "/contacto", "/taller-mecanico-fuerteventura/", "/chapa-y-pintura-fuerteventura/",
  "/pre-itv-fuerteventura/", "/itv-fuerteventura/", "/coches-segunda-mano-fuerteventura/", "/financiacion-coches-fuerteventura/",
  "/coches-segunda-mano-corralejo", "/taller-mecanico-puerto-del-rosario", "/aviso-legal", "/privacidad", "/cookies", "/condiciones",
  "/sitemap.xml", "/robots.txt", "/fonts/fuentes.css", "/api/coches", "/api/salud", "/admin")
try {
  $mapa = (Invoke-WebRequest -Uri "$base/sitemap.xml" -UseBasicParsing -TimeoutSec 20).Content
  $fichas = [regex]::Matches($mapa, "<loc>https?://[^/]+(/coche/[^<]+)</loc>") | Select-Object -First 3 | ForEach-Object { $_.Groups[1].Value }
  $rutas += $fichas
} catch { Write-Host "No se pudo leer el sitemap" -ForegroundColor Yellow }
$fallos = 0
foreach ($r in $rutas) {
  $t = [System.Diagnostics.Stopwatch]::StartNew()
  try {
    $res = Invoke-WebRequest -Uri ($base + $r) -UseBasicParsing -TimeoutSec 20 -MaximumRedirection 3
    $ms = $t.ElapsedMilliseconds; $cod = [int]$res.StatusCode
  } catch { $ms = $t.ElapsedMilliseconds; $cod = 0; if ($_.Exception.Response) { $cod = [int]$_.Exception.Response.StatusCode } }
  $ok = ($cod -eq 200) -and ($ms -lt 3000)
  if (-not $ok) { $fallos++ }
  $color = if ($ok) { "Green" } elseif ($cod -eq 200) { "Yellow" } else { "Red" }
  Write-Host ("{0,-4} {1,6} ms  {2}" -f $cod, $ms, $r) -ForegroundColor $color
}
Write-Host ""
if ($fallos -eq 0) { Write-Host "TODO OK: todas las páginas responden en menos de 3 segundos." -ForegroundColor Green }
else { Write-Host "$fallos página(s) con problemas: rojo = error, amarillo = lenta. Mándale una captura a Claude." -ForegroundColor Red }
