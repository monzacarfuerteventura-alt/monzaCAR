# Copia el módulo de Jornada (tools/jornada/jornada.js y jornada.css) dentro de public/admin.html,
# y añade (una sola vez) la pantalla de fichaje, la pestaña «Jornada» del gerente y tres enganches
# pequeños en el código de entrada (2FA del equipo, «confiar en este dispositivo» y el candado 423).
# Ejecuta después de cambiar cualquier cosa:  python3 tools/jornada/inyectar.py
import pathlib
R = pathlib.Path(__file__).resolve().parent
ADMIN = R.parent.parent / "public" / "admin.html"
s = ADMIN.read_text(encoding="utf-8")
css = (R / "jornada.css").read_text(encoding="utf-8")
js = (R / "jornada.js").read_text(encoding="utf-8")

def bloque(s, ini, fin, contenido, ancla_antes):
    if ini in s:
        a = s.index(ini); b = s.index(fin, a) + len(fin)
        return s[:a] + ini + contenido + fin + s[b:]
    i = s.index(ancla_antes)
    return s[:i] + ini + contenido + fin + "\n" + s[i:]

s = bloque(s, "/*JORNADA-CSS-INICIO*/", "/*JORNADA-CSS-FIN*/", css, "/*GUIA-CSS-INICIO*/")
s = bloque(s, "/*JORNADA-JS-INICIO*/", "/*JORNADA-JS-FIN*/", js, "/*GUIA-JS-INICIO*/")

def una_vez(marca, antes, despues):
    global s
    if marca in s: return
    assert s.count(antes) == 1, "No encuentro: " + antes[:70]
    s = s.replace(antes, despues)

# Pestaña «Jornada» (solo la ve el gerente: el equipo tiene ocultas las pestañas que no son suyas)
una_vez('data-tab="jornada"', '<button type="button" role="tab" data-tab="fin"',
        '<button type="button" role="tab" data-tab="jornada" aria-selected="false">Jornada</button>\n    <button type="button" role="tab" data-tab="fin"')
# Pantallas
una_vez('id="s-fichar"', '  <section id="s-guia"', '''  <!-- JORNADA: pantalla de fichaje del equipo y registro del gerente (tools/jornada) -->
  <section id="s-fichar" hidden><div id="j-fichar"></div></section>
  <section id="s-jornada" hidden>
    <div class="head"><div><h1 style="font-size:28px">Jornada</h1><p>Quién está trabajando ahora, horas del mes, correcciones y el registro legal (Excel y PDF para firmar).</p></div></div>
    <div id="jg"></div>
  </section>

  <section id="s-guia"''')
# api(): el «candado» (423) abre la pantalla de fichaje
una_vez("jBloquear(data)", '  const data = await r.json().catch(()=>({}));\n  if(!r.ok) throw new Error(data.error',
        '  const data = await r.json().catch(()=>({}));\n  if(r.status===423&&typeof jBloquear==="function") jBloquear(data); // sin fichar: pantalla de fichaje\n  if(!r.ok) throw new Error(data.error')
# Entrada del equipo: 2FA (alta con QR o código) + confiar en el dispositivo + códigos de recuperación
una_vez("jAlta2fa(d.configurar2fa)",
 '''      const r=await fetch("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({usuario:$("#eq-u").value,pin:$("#eq-p").value})});
      const d=await r.json().catch(()=>({}));
      if(r.status===429 && !d.error) throw new Error("Demasiados intentos. Espera un minuto.");
      if(!r.ok||!d.token) throw new Error(d.error||"No se ha podido entrar.");
      guardarToken(d.token); $("#eq-p").value=""; await entrarEquipo(d);''',
 '''      const r=await fetch("/api/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({usuario:$("#eq-u").value,pin:$("#eq-p").value,codigo:$("#pw2").value||undefined,confiar:!!($("#j-confiar")||{}).checked})});
      const d=await r.json().catch(()=>({}));
      if(d.configurar2fa&&typeof jAlta2fa==="function"){ const tenia=$("#pw2").value; jAlta2fa(d.configurar2fa); if(tenia) throw new Error(d.error||"Código incorrecto."); btn.disabled=false; return; }
      if(d.necesita2fa){ $("#f-2fa").hidden=false; setTimeout(()=>$("#pw2").focus(),30); if($("#pw2").value) throw new Error(d.error||"Código incorrecto."); btn.disabled=false; return; }
      if(r.status===429 && !d.error) throw new Error("Demasiados intentos. Espera un minuto.");
      if(!r.ok||!d.token) throw new Error(d.error||"No se ha podido entrar.");
      guardarToken(d.token); $("#eq-p").value=""; $("#pw2").value=""; $("#f-2fa").hidden=true; if(typeof jAltaFin==="function") jAltaFin();
      await entrarEquipo(d); if(d.recuperacion&&typeof jRecuperacion==="function") jRecuperacion(d.recuperacion);''')
# Entrada del gerente: «confiar en este dispositivo 30 días»
una_vez("confiar:!!($(\"#j-confiar\")||{}).checked})});\n    const d=await r.json().catch(()=>({}));\n    if(d.necesita2fa)",
 '''body:JSON.stringify({clave:$("#pw").value,codigo:$("#pw2").value})});''',
 '''body:JSON.stringify({clave:$("#pw").value,codigo:$("#pw2").value,confiar:!!($("#j-confiar")||{}).checked})});''')

ADMIN.write_text(s, encoding="utf-8")
print("jornada copiada en admin.html")
