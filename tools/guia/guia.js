
/* =====================================================================
   GUÍA DE VENTA · «El Método de Venta Volcano Cars» (SOP-02 v2.0)
   Fuente: tools/guia/guia.js → se copia dentro de admin.html con
   python3 tools/guia/inyectar.py. Para cambiar textos, edita aquí.
   ===================================================================== */
const GUIA_VER="SOP-02 · v2.0";
const GUIA_PAGS=["inicio","01","02","03","04","05","06","chuleta","anexo"];
const GUIA_NOMBRE={inicio:"Inicio","01":"Preparar y fotografiar","02":"Publicar el anuncio","03":"Primer contacto","04":"Prueba en carretera","05":"Negociar","06":"Cerrar y seguir",chuleta:"Chuleta rápida",anexo:"Anexo A"};
const GUIA_CORTO={inicio:"Inicio","01":"Preparar","02":"Publicar","03":"Contacto","04":"Prueba","05":"Negociar","06":"Cerrar",chuleta:"Chuleta",anexo:"Anexo"};
const G_ICO_PANEL='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="14" rx="2.5"/><path d="M3 9h18M8 21h8"/></svg>';
const G_ICO_LIBRO='<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A2.5 2.5 0 016.5 3H20v15H6.5A2.5 2.5 0 004 20.5z"/><path d="M4 20.5A2.5 2.5 0 006.5 23H20M8 7h8M8 11h6"/></svg>';

let GST={chk:{},fotos:{}};
try{ GST=Object.assign(GST,JSON.parse(localStorage.getItem("vc_guia")||"{}")); }catch(_){}
const gGuardar=()=>{ try{ localStorage.setItem("vc_guia",JSON.stringify(GST)); }catch(_){} };

/* ---------- piezas ---------- */
const gH=t=>`<h3 class="g-h">${t}</h3>`;
const gCall=(tipo,t,txt)=>`<div class="g-call ${tipo}"><b class="t">${t}</b>${txt}</div>`;
const gHazlo=l=>`<div class="g-sec">${gH("Hazlo así")}<ol class="g-hazlo">${l.map(x=>`<li><span>${x}</span></li>`).join("")}</ol></div>`;
const gCheck=(id,l)=>`<ul class="g-check">${l.map((x,i)=>`<li><label><input type="checkbox" data-gchk="${id}-${i}" ${GST.chk[id+"-"+i]?"checked":""}><span>${x}</span></label></li>`).join("")}</ul>`;
const gPanel=(txt,bt=[])=>`<div class="g-panel"><span class="ic">${G_ICO_PANEL}</span><div><b class="t">En el panel</b><p>${txt}</p>${bt.length?`<div class="bt">${bt.map(([k,t])=>`<button type="button" class="btn b-ghost b-sm" data-gir="${k}">${t}</button>`).join("")}</div>`:""}</div></div>`;
function gListo(id,l,sig){
  return `<div class="g-listo"><b class="t">Listo para el siguiente paso cuando…</b>${gCheck("L"+id,l)}
    <div class="fin"><span>Si falta algo, no pases al siguiente paso.</span>${sig?`<button type="button" class="btn b-brand b-sm" data-gpag="${sig}">Siguiente: ${GUIA_NOMBRE[sig]} →</button>`:""}</div></div>`;
}
const gListoOk=id=>{ const n=(GUIA_LISTO[id]||[]).length; return n>0 && [...Array(n).keys()].every(i=>GST.chk["L"+id+"-"+i]); };
function gPNav(pag){ return `<nav class="g-pnav">${GUIA_PAGS.map(p=>`<a href="#gp-${p}" class="${p===pag?"on":""}">${GUIA_CORTO[p]}</a>`).join("")}</nav>`; }
function gHero(pag,{num,eyebrow,titulo,intro,chips=[],cls=""}){
  return `<header class="g-hero ${cls}" ${num?"":'style="grid-template-columns:1fr"'}>${num?`<div class="num"><small>PASO</small>${num}</div>`:""}
    <div>${eyebrow?`<small style="display:block;font-size:11.5px;font-weight:800;letter-spacing:.16em;color:#FF8A5C;margin-bottom:6px">${eyebrow}</small>`:""}<h2>${titulo}</h2></div>
    <p>${intro}</p>${chips.length?`<div class="chips">${chips.map(([k,v])=>`<span><b>${k}</b>${v}</span>`).join("")}</div>`:""}${gPNav(pag)}</header>`;
}
const TEC={
  etiquetar:["Etiquetar","c-magma","Pon nombre a su miedo"],
  calibrada:["Pregunta calibrada","c-gris","Devuelve el problema"],
  espejo:["Espejo","c-piedra","Repite 1–3 palabras"],
  no:["Buscar el NO","c-ambar amb","El «no» da control"],
  esoes:["Resumen «eso es»","c-verde","La señal de cierre"]
};
const gTec=(k,frases,regla)=>{ const [t,c,s]=TEC[k]; return `<div class="g-tec ${c.includes("amb")?"amb":""}"><div class="cab ${c}"><b>${t}</b><span>${s}</span></div><ul>${frases.map(f=>`<li>${f}</li>`).join("")}</ul>${regla?`<div class="regla"><b>Regla:</b> ${regla}</div>`:""}</div>`; };
const gTag=(t,c)=>`<span class="g-tag ${c}">${t}</span>`;

/* ---------- criterios de «listo» de cada paso ---------- */
const GUIA_LISTO={
  "01":["Las 24 fotos hechas en orden (y la 24 si hay algún defecto)","Matrícula difuminada en todas","Vídeo 360° grabado (vuelta completa y termina dentro)"],
  "02":["Los 3 precios fijados con el gerente (el mínimo no se publica)","Ficha completa y visible en la web","Comparativa de mercado hecha (al menos 3 anuncios reales)","Publicado el mismo día en web, portales, redes y estado de WhatsApp"],
  "03":["Respondido en menos de 15 minutos","Sé para quién es el coche y qué le preocupa","Tiene día y hora de prueba (o seguimiento apuntado en el CRM)"],
  "04":["Anexo A firmado, km y hora de vuelta anotados","He oído «eso es» o sé exactamente qué le frena","Nota de la prueba y fecha de seguimiento en el CRM"],
  "05":["Precio acordado igual o mayor que el mínimo, con algo a cambio de cada rebaja","Señal cobrada y justificante entregado","Coche marcado «Reservado» en el panel"],
  "06":["Coche «Vendido» y cliente «Ganada» con su importe","Seguimiento de 7 días apuntado en el CRM","Reseña de Google pedida"]
};

/* ---------- las páginas ---------- */
const FOTOS=["3/4 delantero izq.","3/4 trasero dcho.","Interior conductor","Frontal recto","Trasera recta","Lateral izquierdo","Lateral derecho","3/4 trasero izq.","Salpicadero","Cuadro encendido","Pantalla / radio","Climatización","Palanca de cambios","Asiento conductor","Asientos traseros","Maletero vacío","Motor","Neumático","Llanta","Techo / techo solar","Llaves y mando","Libro y facturas","Extra diferenciador","Defecto honesto"];

const GUIA_PAG={
inicio:()=>`
  <section class="g-portada no-pdf"><img src="/marca/logo-claro.svg" alt="Volcano Cars" width="163" height="40">
    <span class="eb">GUÍA INTERNA · ${GUIA_VER}</span><h2>El Método de Venta <span>Volcano Cars</span></h2>
    <p>Seis pasos para vender cada coche siempre igual: fotos que atraen, conversaciones que dan confianza y una negociación en la que el cliente se siente en control. Cada paso te dice qué hacer, dónde hacerlo en el panel y cuándo pasar al siguiente.</p>
    <p><b style="color:#fff">Cómo se usa:</b> en cada paso verás el objetivo, el tiempo máximo y quién lo hace; después <b style="color:#fff">Hazlo así</b> (lo esencial en 5 líneas), el detalle, <b style="color:#fff">En el panel</b> y la lista <b style="color:#fff">Listo cuando</b>. Si un paso no se cumple, no se pasa al siguiente.</p></section>
  ${gHero("inicio",{cls:"solo-pdf",eyebrow:"CÓMO USAR ESTA GUÍA",titulo:"El recorrido de cada venta",intro:"Cada coche y cada cliente recorren los mismos seis pasos. En cada paso verás el <b>objetivo</b>, el <b>tiempo máximo</b> y <b>quién</b> lo hace; después, <b>Hazlo así</b> (lo esencial en 5 líneas), el detalle, <b>En el panel</b> y la lista <b>Listo cuando</b>. Si un paso no se cumple, no se pasa al siguiente."})}
  <div class="g-card"><div class="g-reco">${[["01","Preparar y fotografiar","48 h","24 fotos"],["02","Publicar el anuncio","48 h","Plantilla"],["03","Primer contacto","15 min","Espejo"],["04","Prueba en carretera","30 min","Escucha"],["05","Negociar","24–72 h","4 técnicas"],["06","Cerrar y seguir","7 días","CRM"]].map(([n,t,m,s])=>`<a href="#gp-${n}" data-gpag="${n}"><i>${n}</i><b>${t}</b><em>${m}</em><small>${s}</small></a>`).join("")}</div></div>
  <div class="g-sec">${gH("Las 5 reglas de oro")}<div class="g-3">
    ${[["Escuchar antes de vender","La primera conversación sirve para entender qué necesita y qué teme el cliente."],["Sin presión","El cliente decide. Un «no» a tiempo vale más que un «sí» forzado."],["Verdad sobre el coche","Contamos lo bueno y lo que no es perfecto. Vendemos confianza: nunca inventamos prisas ni interesados."],["Nada gratis","Nunca bajamos el precio sin recibir algo a cambio."],["Todo registrado","Cada cliente entra en el CRM del panel el mismo día, con fecha de próximo contacto."]].map(([t,d],i)=>`<div class="g-regla"><b><i>${i+1}</i>${t}</b><p>${d}</p></div>`).join("")}
    <div class="g-regla oscura"><b>3 precios por coche</b><p><b style="color:#fff">Anuncio · Objetivo · Mínimo.</b> Los fija el gerente antes de publicar. Solo el de anuncio se publica; el mínimo nunca se revela.</p></div></div></div>
  <div class="g-sec">${gH("Cómo sabemos que funciona")}<div class="g-6">
    ${[["< 15 min","primera respuesta","CRM · «Primera respuesta»"],["30 %","de clientes prueban","Dashboard"],["35 %","de pruebas compran","CRM · Embudo"],["< 4 %","descuento medio","Precio anuncio vs importe"],["< 45 días","en stock","Coches · «Vendido en X días»"],["50 %","dejan reseña","Plantilla «Pedir reseña»"]].map(([b,s,d])=>`<div class="g-kpi"><b>${b}</b><span>${s}</span><small>${d}</small></div>`).join("")}</div></div>
  <div class="g-sec">${gH("Las 4 herramientas de negociación")}<div class="g-4">
    <div class="g-mini c-magma"><b>Etiquetar</b><span>«Parece que…»</span></div><div class="g-mini c-gris"><b>Pregunta calibrada</b><span>«¿Cómo…?» «¿Qué…?»</span></div>
    <div class="g-mini c-piedra"><b>Espejo</b><span>Repetir 1–3 palabras</span></div><div class="g-mini c-ambar amb"><b>Buscar el NO</b><span>«¿Sería mala idea…?»</span></div></div></div>
  ${gCall("piedra","Glosario","<b>FORM-02</b>: Inspección 360° del coche en nuestro taller (semáforo OK / Ámbar / Rojo) · <b>FORM-04</b>: Control de calidad con destino «Inventario de venta» (bloque D, alta para venta), firmado por alguien distinto del mecánico y cerrado por el gerente. Las dos están en Taller → Fichas de la orden · <b>CRM</b>: la pestaña CRM del panel (sustituye a la antigua Hoja de Seguimiento).")}
  ${gCall("verde","Consejo","Pulsa <b>Descargar PDF completo</b> y guárdalo en el móvil. En el PDF, la barra de cada página te lleva a cualquier paso. La <b>Chuleta</b> resume todos los guiones en una hoja.")}`,

"01":()=>`
  ${gHero("01",{num:"01",titulo:"Preparar y fotografiar",intro:"El comprador decide en las tres primeras fotos si abre el anuncio. Cada coche se fotografía igual: mismo orden, mismo fondo, misma luz.",chips:[["Objetivo","24 fotos + vídeo 360°"],["Tiempo","< 48 h desde FORM-04"],["Quién","Vendedor"]]})}
  ${gHazlo(["Comprueba que el coche está aprobado para la venta (<b>FORM-04</b>) y lávalo por dentro y por fuera: sin arena ni salitre.","Llévalo al <b>fondo de siempre</b>, limpio, sin otros coches ni herramientas.","Dispara <b>antes de las 10:00 o después de las 18:00</b>, con el móvil en horizontal a la altura de los faros.","Haz las <b>24 fotos en el orden</b> de la tabla. Repite la 1 hasta que sea perfecta.","Graba el <b>vídeo 360°</b>: una vuelta completa despacio y termina dentro (salpicadero, asientos, cuentakilómetros)."])}
  <div class="g-2"><div class="g-sec">${gH("Antes de disparar")}<div class="g-card">${gCheck("p1a",["Coche aprobado en <b>FORM-04</b>, lavado por dentro y por fuera.","Fondo limpio y <b>siempre el mismo</b>.","Luz de <b>primera o última hora</b>. Al mediodía, sombra completa.","Móvil en <b>horizontal</b>, lente limpia, a la altura de los faros, sin zoom.","Ruedas delanteras giradas hacia la cámara en la foto 1.","Motor en marcha para la foto del cuadro (sin testigos encendidos).","La matrícula se difumina al editar."])}</div></div>
    <div class="g-sec" style="align-content:start">${gCall("magma","La regla de las 3 primeras","Las fotos 1, 2 y 3 son la portada del anuncio y de la tarjeta de la web. Si no enamoran, nadie ve las otras 21.")}${gCall("ambar","Fuerteventura","El sol del mediodía quema los brillos y marca sombras duras. Dispara antes de las 10:00 o después de las 18:00.")}${gCall("piedra","Vídeo 360°","Es lo que más confianza da a quien compra sin venir: en la web el coche se mueve en su tarjeta. Mejor con luz de día y el coche limpio; 1080p es suficiente.")}</div></div>
  <div class="g-sec">${gH("Las 24 fotos, en este orden")}<p style="margin:0;color:var(--muted);font-size:14px" class="no-pdf">Toca cada foto cuando la tengas: se marca con ✓ (se guarda en este móvil).</p>
    <div class="g-6">${FOTOS.map((f,i)=>`<button type="button" class="g-foto ${i<3?"portada":i===23?"defecto":""} ${GST.fotos[i]?"hecha":""}" data-gfoto="${i}"><b>${String(i+1).padStart(2,"0")}</b><span>${f}</span></button>`).join("")}</div>
    <div class="g-leyenda"><span><i style="background:#1B1B1A"></i>Portada del anuncio</span><span><i style="background:#FDF0DC;border:1px solid #F2C27A"></i>Obligatoria si hay algún defecto estético: enseñarlo antes genera confianza</span><button type="button" class="g-link no-pdf" data-greset>Desmarcar todas</button></div></div>
  ${gCall("verde","Después de disparar","Revisa que estén las 24 · recorta y endereza · difumina la matrícula · guarda la carpeta con la matrícula del coche.")}
  <div class="g-cierre">${gPanel("<b>Coches → + Añadir coche → Fotos.</b> Súbelas en este mismo orden: la primera es la portada (con ★ puedes cambiarla). En <b>Vídeo 360°</b> sube la vuelta al coche; la web lo enseña en movimiento en su tarjeta.",[["form","+ Añadir coche"],["coches","Ver mis coches"]])}${gListo("01",GUIA_LISTO["01"],"02")}</div>`,

"02":()=>`
  ${gHero("02",{num:"02",titulo:"Publicar el anuncio",intro:"El título dice qué es. La primera línea, para quién es. El resto quita miedos. Todos los datos coinciden con FORM-02 y FORM-04.",chips:[["Objetivo","Mensajes y llamadas"],["Tiempo","< 48 h"],["Quién","Vendedor"]]})}
  ${gHazlo(["Fija con el gerente los <b>3 precios</b>: anuncio, objetivo y mínimo. Solo el de anuncio se publica.","Rellena la ficha en el panel: marca, modelo, versión, año, km, <b>precio final con IGIC</b>, combustible, cambio y etiqueta.","Escribe la descripción con la plantilla: <b>para quién · por qué este · lo que debes saber</b>. Equipamiento, una línea por cosa.","Haz la <b>comparativa de mercado</b> con al menos 3 anuncios reales del mismo coche y pégala en el panel.","Publica y copia el mismo texto en portales, redes y estado de WhatsApp. Usa <b>Compartir</b> para mandar el enlace del coche."])}
  <div class="g-sec">${gH("Anatomía de un anuncio de alto impacto")}<dl class="g-anat">
    ${[["Título","Qué es","c-magma","Seat Ibiza 1.0 TSI Style · 2019 · 68.000 km · Gasolina · Manual","En el panel: marca + modelo + versión (la web lo monta sola)"],["Para quién","Conecta","c-magma","Ideal para moverte a diario por la isla: consume poco y cabe en cualquier aparcamiento.","Primera línea de la descripción"],["Por qué este","Da confianza","c-gris","Revisado en nuestro taller (FORM-02): aceite, filtros y pastillas nuevos · ITV hasta 06/2027 · 2 llaves y libro.","Descripción"],["Equipamiento","Lo que se usa","c-gris","Aire acondicionado · pantalla con CarPlay y Android Auto · sensores traseros · control de crucero.","Equipamiento: una línea por elemento"],["Transparencia","Quita miedos","c-ambar","Lo que debes saber: pequeño rayón en el paragolpes trasero (foto 24).","Descripción + foto 24"],["Garantía","Seguridad","c-gris","12 meses de garantía · cambio de nombre incluido · entrega gratis en toda Fuerteventura · financiación disponible.","La web lo añade sola en cada ficha"],["Precio","Claro","c-gris","10.990 € · precio final, IGIC incluido.","Precio (con céntimos si hace falta)"],["Llamada","Acción","c-verde","Ven a probarlo sin compromiso a Antigua. Escríbenos por WhatsApp al 643 66 88 13.","Portales y redes (en la web ya hay botones)"]].map(([t,s,c,v,p])=>`<div><dt class="${c}">${t}<small>${s}</small></dt><dd>${v}<em>${p}</em></dd></div>`).join("")}</dl></div>
  <div class="g-2"><div class="g-sino si"><b class="t c-verde">SÍ</b><ul><li>Frases cortas y datos concretos (km, año, fecha de ITV).</li><li>Decir para quién es el coche.</li><li>Contar el defecto con foto.</li><li>El mismo texto en todos los canales.</li><li>Renovar la foto de portada a los 15 días sin contactos.</li></ul></div>
    <div class="g-sino no"><b class="t c-magma">NO</b><ul><li>«Precio negociable»: invita al regateo.</li><li>«Urge vender»: suena a problema.</li><li>Mayúsculas continuas y exclamaciones.</li><li>«Impecable» sin un dato que lo pruebe.</li><li>Datos que no coinciden con FORM-02 y FORM-04.</li></ul></div></div>
  <div class="g-2">${gCall("oscuro","3 precios por coche","<b>Anuncio</b> (el que se publica) · <b>Objetivo</b> (al que queremos cerrar) · <b>Mínimo</b> (nunca por debajo y nunca se revela). Los fija el gerente antes de publicar.")}${gCall("piedra","Publicación","Mismo anuncio en la web, portales (coches.net, Wallapop, Milanuncios), redes y estado de WhatsApp, el mismo día. Coche con 45 días sin pruebas → revisión de fotos, precio y texto con el gerente.")}</div>
  <div class="g-cierre">${gPanel("<b>Coches → editar coche.</b> Rellena la ficha y la descripción; en <b>Comparativa de mercado</b> pega los precios de anuncios reales: si el tuyo está por debajo, la web enseña «¡Oferta imbatible de mercado!». En la ficha pública, <b>Compartir</b> te da el enlace del coche para portales y WhatsApp.",[["form","+ Añadir coche"],["coches","Ver mis coches"]])}${gListo("02",GUIA_LISTO["02"],"03")}</div>`,

"03":()=>`
  ${gHero("03",{num:"03",titulo:"Primer contacto",intro:"Quien responde primero, gana la conversación. El objetivo no es vender el coche por WhatsApp: es entender qué busca el cliente y conseguir que venga a probarlo.",chips:[["Objetivo","Cita de prueba"],["Tiempo","Responder en < 15 min"],["Quién","Vendedor"]]})}
  ${gHazlo(["Responde en <b>menos de 15 minutos</b>: te llega un email con cada cliente nuevo y el CRM lo marca en «Sin contestar».","Preséntate con tu nombre y confirma que el coche sigue disponible.","Haz <b>espejo</b>: repite sus 1–3 últimas palabras importantes y calla.","<b>Etiqueta</b> su miedo («Parece que lo que más te importa es…») hasta que diga «eso es».","Propón la prueba <b>buscando el NO</b>: «¿Sería mala idea venir a probarlo mañana, sin compromiso?» y cierra día y hora."])}
  <div class="g-sec">${gH("La técnica del espejo en 3 pasos")}<div class="g-3">${[["Escucha","Deja que el cliente termine la frase sin interrumpir."],["Repite","Las 1–3 últimas palabras importantes, en tono de pregunta suave."],["Calla","4 segundos de silencio. El cliente se explica solo."]].map(([t,d],i)=>`<div class="g-regla"><b><i style="background:#5A564F">${i+1}</i>${t}</b><p>${d}</p></div>`).join("")}</div></div>
  <div class="g-sec">${gH("Así suena una respuesta por WhatsApp")}<div class="g-2 g-chatw">
    <div class="g-chat"><div class="cab"><i></i>Cliente · Seat Ibiza 2019</div><div class="cuerpo">
      <p class="c">Hola, ¿sigue disponible el Ibiza? Lo quiero para mi hija.</p>
      <p class="v">¡Hola! Soy Dani, de Volcano Cars. Sí, sigue disponible. <b>¿Para tu hija?</b></p>
      <p class="c">Sí, acaba de sacarse el carnet y me da miedo que le deje tirada.</p>
      <p class="v"><b>Parece que lo que más te importa es que sea un coche fiable y seguro para ella.</b></p>
      <p class="c">Exacto, eso es. Ya tuvimos una mala experiencia con otro.</p>
      <p class="v">Te entiendo. Lo hemos revisado en nuestro taller y te enseño las facturas; además tiene 12 meses de garantía. <b>¿Sería mala idea que vinierais los dos a probarlo mañana, sin compromiso?</b></p>
      <p class="c">No, para nada. ¿Por la tarde os viene bien?</p></div></div>
    <div class="g-notas"><div class="g-nota" style="border-color:#5A564F"><b style="color:#5A564F">Espejo</b>«¿Para tu hija?» repite sus palabras y le invita a contar más.</div>
      <div class="g-nota" style="border-color:#D9481C"><b style="color:#D9481C">Etiqueta</b>Nombra el miedo real: fiabilidad y seguridad.</div>
      <div class="g-nota" style="border-color:#1F8B4C"><b style="color:#1F8B4C">«Eso es»</b>El cliente se siente entendido. Ahora sí confía.</div>
      <div class="g-nota" style="border-color:#E08A2E"><b style="color:#A55F12">Buscar el NO</b>«¿Sería mala idea…?» El «no» le da control y dice sí a la cita.</div>
      ${gCall("magma","Ojo con el horario","Abrimos de lunes a viernes de 8:00 a 16:00. Si quiere venir fuera de horario, ofrécele la primera hora del día siguiente.")}</div></div></div>
  <div class="g-sec">${gH("Espejos rápidos para llamadas y mensajes")}<div class="g-2">${[["«Busco algo que gaste poco, que me muevo mucho.»","«¿Te mueves mucho?»"],["«Me han dicho que los automáticos dan problemas.»","«¿Dan problemas?»"],["«El precio me parece alto.»","«¿Alto?»"],["«Ya vi otro parecido en Puerto del Rosario.»","«¿Uno parecido?»"]].map(([a,b])=>`<div class="g-esp"><span>${a}</span><b>${b}</b></div>`).join("")}</div></div>
  <div class="g-cierre">${gPanel("<b>CRM</b>: abre el cliente → botón <b>WhatsApp</b> (plantilla «Primer contacto») y el estado pasa a «Contactado». El CRM mide tu tiempo de <b>primera respuesta</b>. Para la prueba, mándale el enlace del coche (<b>Compartir</b>): allí elige día y hora y la cita entra sola en la <b>Agenda</b>. Si te llama o viene en persona: <b>+ Nuevo cliente</b>.",[["crm","Abrir CRM"],["agenda","Abrir Agenda"]])}${gListo("03",GUIA_LISTO["03"],"04")}</div>`,

"04":()=>`
  ${gHero("04",{num:"04",titulo:"Prueba en carretera",intro:"La prueba es donde el cliente decide. El vendedor va de copiloto, habla poco y escucha mucho: descubre qué le gusta y qué le preocupa.",chips:[["Objetivo","Un «eso es»"],["Tiempo","20–30 min"],["Quién","Vendedor"]]})}
  ${gHazlo(["Antes de salir: carnet en vigor, DNI/NIE y el <b>Anexo A firmado</b>.","Sigue la <b>ruta de 7 tramos</b> (unos 30 minutos).","En cada tramo, una sola pregunta o espejo; después, <b>silencio</b>.","<b>Nada de precio</b> mientras conduce, y nunca critiques a la competencia.","Al volver, resume con sus palabras hasta oír <b>«eso es»</b> y propón sentaros a ver números."])}
  <div class="g-sec">${gH("Antes de salir")}<div class="g-card">${gCheck("p4a",["Carnet en vigor + DNI/NIE (copia).","Seguro que cubre conductores en prueba.","Condiciones de la prueba firmadas (Anexo A).","Km y combustible de salida anotados.","Asiento, volante y espejos ajustados.","Mandos básicos explicados."])}</div></div>
  <div class="g-sec">${gH("La ruta y qué decir en cada tramo")}<ol class="g-ruta">
    ${[["Salida y ciudad","5 min","Arranque en frío, dirección, cámara y sensores","«¿Qué te parece cómo suena en frío?»"],["Rotondas","3 min","Suspensión y ruidos en giro","Espejo de lo que comente"],["Vía rápida (FV-1 / FV-2)","10 min","Estabilidad, cambio, ruido, consumo","«¿Qué diferencia notas con tu coche?»"],["Subida","3 min","Potencia con el A/C encendido","«Parece que el calor de aquí te importa.»"],["Frenada segura","1 min","Frena recto y sin vibración","Silencio: que lo note él"],["Multimedia","2 min","Conecta su móvil y pone su música","«¿Qué tal si pones tu música?»"],["Vuelta y aparcar","5 min","Maniobra y sensación general","«¿Algo te hace pensar que no es para ti?»"]].map(([t,m,q,d])=>`<li><div><b>${t}</b><small>${m}</small></div><span class="q">${q}</span><span class="qd">${d}</span></li>`).join("")}</ol></div>
  <div class="g-2">${gCall("magma","Reglas durante la prueba","No hablar de precio mientras conduce · no criticar a la competencia · si el cliente calla, callar también · si señala un defecto, etiquetarlo y dar el dato real de FORM-02.")}${gCall("verde","Al volver","Resume con sus palabras lo que busca hasta oír «eso es». Después: <b>«¿Sería mala idea sentarnos cinco minutos a ver números?»</b>")}</div>
  <div class="g-cierre">${gPanel("<b>Agenda</b>: tus visitas del día, con el coche y el teléfono. Después de la prueba, en el <b>CRM</b>: estado «Cita», una nota en <b>Actividad</b> con lo que dijo (sus palabras) y <b>Próximo seguimiento</b> para mañana. El Anexo A está en esta guía: puedes imprimirlo desde su página.",[["agenda","Abrir Agenda"],["crm","Abrir CRM"]])}${gListo("04",GUIA_LISTO["04"],"05")}</div>`,

"05":()=>`
  ${gHero("05",{num:"05",titulo:"Negociar",intro:"Negociar no es discutir el precio: es entender lo que siente el cliente. Tono tranquilo, voz grave y silencio después de cada técnica.",chips:[["Objetivo","Reserva con señal"],["Tiempo","24–72 h"],["Quién","Vendedor + gerente"]]})}
  ${gHazlo(["Antes de hablar de precio o de un defecto, haz la <b>auditoría de acusaciones</b>.","Deja que diga su cifra y responde con una <b>pregunta calibrada</b>: «¿Cómo has llegado a esa cifra?».","Si pide rebaja, sube la <b>escalera del precio</b> escalón a escalón. Nunca por debajo del mínimo.","Si el problema es la cuota, abre la <b>calculadora de financiación</b> del coche y ofrécele el pre-estudio.","Cierra con <b>señal</b> y fecha de entrega por escrito, y marca el coche «Reservado»."])}
  <div class="g-2">
    ${gTec("etiquetar",["«Parece que te preocupa el historial de mantenimiento.»","«Parece que sientes que el precio está fuera de tu presupuesto.»","«Suena a que has tenido una mala experiencia antes.»"],"Empieza por «Parece que…». Nunca «pero» después.")}
    ${gTec("calibrada",["«¿Cómo se supone que haga ese descuento sin tocar la garantía del coche?»","«¿Cómo has llegado a esa cifra?»","«¿Qué tendría que pasar para que este coche fuera el tuyo?»"],"Solo «¿Cómo…?» o «¿Qué…?». Nunca «¿Por qué…?».")}
    ${gTec("no",["«¿Sería una mala idea probar el coche hoy sin compromiso?»","«¿Te molestaría si hablamos de números con calma?»","«¿Es una locura dejarlo reservado hoy con una señal?»"],"Un «sí» forzado pone a la defensiva; un «no» relaja.")}
    ${gTec("esoes",["«Entonces buscas un coche para el día a día, que gaste poco, con maletero para los niños y sin sustos con el calor.»"],"Si dice «eso es», está listo. Si dice «tienes razón», todavía no.")}</div>
  <div class="g-sec">${gH("La escalera del precio: nunca saltarse un escalón")}<div class="g-esc">
    <div class="c-gris"><b><i>1</i>Pregunta calibrada</b>«¿Cómo has llegado a esa cifra?»</div>
    <div class="c-piedra"><b><i>2</i>Algo que no sea dinero</b>Cambio de aceite a los 6 meses en nuestro taller, depósito lleno, alfombrillas.</div>
    <div class="c-ambar" style="color:#1B1B1A"><b><i>3</i>Bajada pequeña y no redonda</b>Con permiso del gerente: 11.740 €, no 11.700 €.</div>
    <div class="c-magma"><b><i>4</i>Límite</b>Nunca por debajo del precio mínimo. Nada gratis: a cambio, señal hoy o pago al contado.</div></div></div>
  <div class="g-2">${gCall("magma","Auditoría de acusaciones · antes del precio o de un defecto","<i>«Seguro que piensas que todos los vendedores dicen que su coche está perfecto y que te voy a presionar para firmar hoy. Por eso prefiero enseñarte también lo que no está perfecto.»</i>")}${gCall("oscuro","Si el problema es la cuota","«¿Te ayudaría verlo en cuotas?» → abre el coche en la web, mueve entrada y plazo en <b>Calcula tu cuota</b> y pídele el <b>pre-estudio</b> sin compromiso: te llega al CRM como «Financiación».")}</div>
  ${gCall("ambar","Solo lo que es verdad","Nunca digas que hay más interesados si no los hay. Si los hay de verdad, la web ya lo enseña («X personas han preguntado por este coche esta semana»).")}
  <div class="g-cierre">${gPanel("<b>CRM</b>: pon el <b>Importe</b> acordado y el estado. La señal se acuerda en el taller con justificante. En <b>Coches</b>, pulsa <b>Reservado</b>: la web lo muestra con la etiqueta y ya no se puede pedir visita.",[["crm","Abrir CRM"],["coches","Marcar reservado"]])}${gListo("05",GUIA_LISTO["05"],"06")}</div>`,

"06":()=>`
  ${gHero("06",{num:"06",titulo:"Cerrar y seguir",intro:"Ningún cliente se queda sin fecha de próximo contacto. El seguimiento con técnica convierte los «me lo pienso» en ventas y las ventas en reseñas.",chips:[["Objetivo","Venta + reseña"],["Tiempo","Mismo día"],["Quién","Vendedor · gerente revisa"]]})}
  ${gHazlo(["Firma en Antigua y acuerda la entrega: <b>gratis en toda la isla</b> o recogida en el taller.","Marca el coche <b>«Vendido»</b> y el cliente <b>«Ganada»</b> con el importe.","A los 7 días: «¿Qué tal los primeros días?» + plantilla <b>«Pedir reseña en Google»</b>.","A los 6 meses: recordatorio de revisión en nuestro taller.","Si se pierde: estado <b>«Perdida»</b> con el motivo, en sus palabras."])}
  <div class="g-sec">${gH("Los 5 estados de cada cliente")}<div class="g-est">
    <div class="c-gris"><b>Lead entrante</b>Conseguir la prueba<em>CRM: Nueva / Contactado</em></div>
    <div class="c-piedra"><b>Prueba realizada</b>Resolver dudas<em>CRM: Cita</em></div>
    <div class="c-magma"><b>Negociación activa</b>Reserva con señal<em>CRM: Cita + seguimiento</em></div>
    <div class="c-verde"><b>Cerrado</b>Entrega y reseña<em>CRM: Ganada</em></div>
    <div style="background:#8C867D"><b>Perdido</b>Anotar el motivo<em>CRM: Perdida</em></div></div></div>
  <div class="g-sec">${gH("Calendario de seguimiento táctico")}<div class="g-tw"><table class="g-tabla"><thead><tr><th>Estado</th><th>Cuándo</th><th>Mensaje</th><th>Técnica</th></tr></thead><tbody>
    ${[["Lead entrante","Mismo día","«¿Qué es lo que más te ha llamado la atención del [modelo]?»",gTag("Calibrada","c-gris")],["Lead entrante","48 h sin respuesta","«¿Sería mala idea venir a probarlo esta semana, sin compromiso?»",gTag("NO","c-ambar")],["Lead entrante","7 días sin respuesta","«¿Has dejado de estar interesado en el [modelo]?»",gTag("NO","c-ambar")],["Prueba realizada","24 h","«Parece que el coche te gustó, y algo te hace dudar. ¿Qué es?»",gTag("Etiqueta","c-magma")],["Prueba realizada","3 días","Enviar el dato que resuelve su duda: factura, informe OBD, foto.",gTag("Prueba","c-piedra")],["Negociación","24 h","«¿Cómo lo habéis visto en casa?»",gTag("Calibrada","c-gris")],["Negociación","3 días","«Parece que algo no encaja. ¿Estás en contra de buscarlo juntos?»",gTag("Etiqueta + NO","c-magma")],["Cerrado","7 días","«¿Qué tal los primeros días con el coche?» + pedir reseña",gTag("Relación","c-verde")],["Cerrado","6 meses","Recordatorio de revisión en el taller de Volcano Cars",gTag("Taller","c-verde")],["Perdido","30 días","«¿Sería mala idea escribirte si entra un coche como el que buscabas?»",gTag("NO","c-ambar")]].map(r=>`<tr><td><b>${r[0]}</b></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("")}</tbody></table></div></div>
  <div class="g-2">${gCall("magma","Reglas del CRM","Todo cliente con fecha de <b>Próximo seguimiento</b> · máximo 3 intentos sin respuesta por estado · el motivo de cada «Perdida» se anota con sus palabras.")}${gCall("verde","Revisión del lunes","El gerente revisa el CRM 20 minutos cada lunes (filtro «Seguimiento») y a fin de mes el <b>Dashboard → Informe PDF</b>. Una vez al mes, el equipo elige la etiqueta o pregunta que mejor funcionó y la añade a la Chuleta.")}</div>
  <div class="g-cierre">${gPanel("<b>CRM</b>: botones <b>Mañana · En 3 días · En 1 semana</b> para el próximo seguimiento; <b>Motivo</b> cuando se pierde; plantillas de WhatsApp «Seguimiento del coche» y «Pedir reseña en Google». En <b>Coches</b>, «Vendido»: la web lo enseña 60 días en «Vendidos recientemente» con los días que tardó.",[["crm","Abrir CRM"],["dash","Abrir Dashboard"]])}${gListo("06",GUIA_LISTO["06"],"")}</div>`,

chuleta:()=>`
  ${gHero("chuleta",{eyebrow:"CHULETA RÁPIDA",titulo:"Todos los guiones en una hoja",intro:"Tenla a mano en el móvil o impresa. Voz tranquila y grave · silencio después de cada técnica · nunca «pero» después de una etiqueta."})}
  <div class="g-2">
    ${gTec("etiquetar",["Parece que te preocupa el historial del coche.","Parece que el precio se sale de tu presupuesto.","Suena a que ya tuviste una mala experiencia.","Parece que los dos coches te gustan y no quieres equivocarte.","Suena a que todavía hay algo que no te convence."])}
    ${gTec("calibrada",["¿Cómo has llegado a esa cifra?","¿Cómo hago ese descuento sin tocar la garantía?","¿Qué diferencia ves entre aquel coche y este?","¿Qué te frena ahora mismo?","¿Qué necesitas para dejarlo reservado hoy?"])}
    ${gTec("espejo",["«…que me muevo mucho.» → ¿Te mueves mucho?","«…me parece alto.» → ¿Alto?","«…lo quiero para mi hija.» → ¿Para tu hija?","«…dan problemas.» → ¿Dan problemas?","Después: 4 segundos de silencio."])}
    ${gTec("no",["¿Sería mala idea probarlo hoy sin compromiso?","¿Has dejado de estar interesado?","¿Te molestaría si vemos números con calma?","¿Te vendría mal pasar mañana?","¿Es una locura reservarlo hoy con una señal?"])}</div>
  <div class="g-sec">${gH("No decir → decir")}<div class="g-sec" style="gap:8px">
    ${[["«Es el último, se lo llevan hoy.»","«Si te encaja, ¿sería mala idea dejarlo reservado?» (y si de verdad hay más interesados, dilo tal cual)."],["«Este es mi precio final.» (al principio)","«¿Cómo has llegado a esa cifra?»"],["«Confía en mí.»","Enseñar FORM-02, facturas e informe OBD."],["«¿Por qué no te decides?»","«¿Qué te frena ahora mismo?»"],["«Entiendo, pero…»","«Parece que…» y silencio."]].map(([n,s])=>`<div class="g-nd"><div class="n">${n}</div><i>→</i><div class="s">${s}</div></div>`).join("")}</div></div>
  ${gCall("oscuro","Tono","Voz tranquila y grave · silencio después de cada técnica · nunca «pero» después de una etiqueta · nada gratis: cada rebaja, a cambio de algo.")}`,

anexo:()=>`
  ${gHero("anexo",{eyebrow:"ANEXO A · UNA HOJA POR PRUEBA",titulo:"Condiciones de la prueba en carretera",intro:`Volcano Cars · ${typeof EMPRESA_DIR!=="undefined"?EMPRESA_DIR:"Calle Valle Largo, Nave 8, Polígono Industrial, 35610 Antigua"} · 643 66 88 13. Rellenar y firmar antes de salir.`})}
  <div class="no-pdf" style="display:flex;justify-content:flex-end"><button type="button" class="btn b-brand b-sm" data-gimprimir="anexo">Imprimir solo el Anexo A</button></div>
  <div class="g-form">${["Vehículo","Matrícula","Km salida","Combustible salida","Conductor","DNI / NIE","Nº de carnet","Caducidad del carnet","Hora de salida","Hora de vuelta","Km vuelta","Acompañante Volcano Cars"].map(t=>`<div><b>${t}</b><span></span></div>`).join("")}</div>
  <div class="g-sec">${gH("El conductor declara que:")}<ol class="g-decl">
    <li>Tiene el permiso de conducir en vigor y válido para este vehículo, y no está bajo los efectos del alcohol, drogas ni medicamentos que afecten a la conducción.</li>
    <li>Conducirá respetando las normas de tráfico, por la ruta indicada por Volcano Cars y acompañado en todo momento por su personal.</li>
    <li>Será responsable de las multas y sanciones de tráfico que se produzcan durante la prueba por su conducción.</li>
    <li>Será responsable de los daños causados al vehículo o a terceros por conducción temeraria, negligencia grave o incumplimiento de estas condiciones, en la parte no cubierta por el seguro, incluida la franquicia si la hubiera.</li>
    <li>Devolverá el vehículo en el mismo estado en que lo recibe y avisará de inmediato de cualquier incidente.</li>
    <li>La prueba no supone ningún compromiso de compra.</li></ol>
    <p style="margin:0;font-size:13px;color:var(--muted)">Autoriza a Volcano Cars a conservar copia de su carnet mientras dure la prueba. Sus datos se tratan según la política de privacidad de Volcano Cars (web → Privacidad) y la copia se destruye al terminar la prueba si no hay compra.</p></div>
  <div class="g-firmas"><div><b>Firma del conductor</b></div><div><b>Firma de Volcano Cars</b></div><div><b>Fecha</b></div></div>`
};

/* ---------- pantalla ---------- */
let GUIA_ACT="inicio", GUIA_VOLVER="s-list";
function guiaPintar(pag){
  if(!GUIA_PAG[pag]) pag="inicio";
  GUIA_ACT=pag; try{ sessionStorage.setItem("vc_guia_pag",pag); }catch(_){}
  const i=GUIA_PAGS.indexOf(pag), ant=GUIA_PAGS[i-1], sig=GUIA_PAGS[i+1];
  const pasos=["01","02","03","04","05","06"];
  $("#guia-nav").innerHTML=GUIA_PAGS.map(p=>`<a href="#" data-gpag="${p}" ${p===pag?'aria-current="page"':""} class="${pasos.includes(p)&&gListoOk(p)?"hecho":""}">${pasos.includes(p)?`<b>${p}</b>`:""}${GUIA_CORTO[p]}</a>`).join("");
  $("#guia-prog").innerHTML=pasos.map(p=>`<i class="${gListoOk(p)?"ok":p===pag?"on":""}"></i>`).join("");
  $("#guia-body").innerHTML=`<div class="g-pag">${GUIA_PAG[pag]()}</div>
    <nav class="g-pie"><a href="#" data-gpag="${ant||""}" ${ant?"":"hidden"}><small>← Anterior</small><b>${ant?GUIA_NOMBRE[ant]:""}</b></a><a href="#" class="sig" data-gpag="${sig||""}" ${sig?"":"hidden"}><small>Siguiente →</small><b>${sig?GUIA_NOMBRE[sig]:""}</b></a></nav>`;
  const cur=$("#guia-nav [aria-current]"); if(cur) cur.scrollIntoView({inline:"center",block:"nearest"});
}
function abrirGuia(pag){
  const vis=["s-list","s-form","s-leads","s-agenda","s-dash","s-ordenes"].find(x=>!$("#"+x).hidden);
  if(vis) GUIA_VOLVER=vis;
  let p=pag; if(!p){ try{ p=sessionStorage.getItem("vc_guia_pag")||"inicio"; }catch(_){ p="inicio"; } }
  show("s-guia"); guiaPintar(p);
}
function guiaVolver(){ if(GUIA_VOLVER==="s-form") show("s-form"); else if(GUIA_VOLVER==="s-list") loadList(); else show(GUIA_VOLVER); }
document.addEventListener("click",e=>{
  const g=e.target.closest("[data-guia]"); if(g){ e.preventDefault(); abrirGuia(g.dataset.guia||undefined); return; }
  if(!e.target.closest("#s-guia")) return;
  const p=e.target.closest("[data-gpag]"); if(p){ e.preventDefault(); if(p.dataset.gpag){ guiaPintar(p.dataset.gpag); window.scrollTo(0,0); } return; }
  const f=e.target.closest("[data-gfoto]"); if(f){ const i=f.dataset.gfoto; GST.fotos[i]=!GST.fotos[i]; f.classList.toggle("hecha",!!GST.fotos[i]); gGuardar(); return; }
  if(e.target.closest("[data-greset]")){ GST.fotos={}; gGuardar(); guiaPintar(GUIA_ACT); return; }
  const ir=e.target.closest("[data-gir]"); if(ir){ const k=ir.dataset.gir;
    if(k==="form") openForm(null); else if(k==="coches") loadList(); else abrirTab({crm:"leads",agenda:"agenda",dash:"dash"}[k]||"coches"); return; }
  const im=e.target.closest("[data-gimprimir]"); if(im){ guiaPDF([im.dataset.gimprimir]); return; }
  if(e.target.closest("#guia-pdf")){ guiaPDF(); return; }
  if(e.target.closest("#guia-volver")){ guiaVolver(); return; }
});
document.addEventListener("change",e=>{
  const c=e.target.closest("[data-gchk]"); if(!c) return;
  GST.chk[c.dataset.gchk]=c.checked; gGuardar();
  if(c.dataset.gchk.startsWith("L")) guiaPintarNav();
});
function guiaPintarNav(){ const pasos=["01","02","03","04","05","06"];
  document.querySelectorAll("#guia-nav [data-gpag]").forEach(a=>a.classList.toggle("hecho",pasos.includes(a.dataset.gpag)&&gListoOk(a.dataset.gpag)));
  $("#guia-prog").innerHTML=pasos.map(p=>`<i class="${gListoOk(p)?"ok":p===GUIA_ACT?"on":""}"></i>`).join(""); }

/* ---------- PDF: página de impresión con todas las hojas (Guardar como PDF) ---------- */
async function guiaPDF(solo){
  const pags=solo||GUIA_PAGS;
  let box=$("#guia-print"); if(!box){ box=document.createElement("div"); box.id="guia-print"; document.body.appendChild(box); }
  const portada=solo?"":`<div class="g-pag" id="gp-portada"><section class="g-portada"><img src="/marca/logo-claro.svg" alt="Volcano Cars" width="163" height="40">
    <span class="eb">GUÍA INTERNA · ${GUIA_VER}</span><h2>El Método de Venta <span>Volcano Cars</span></h2>
    <p>Seis pasos para vender cada coche siempre igual: fotos que atraen, conversaciones que dan confianza y una negociación en la que el cliente se siente en control.</p>
    <div class="lista">${["01","02","03","04","05","06"].map(p=>`<a href="#gp-${p}"><i>${p}</i>${GUIA_NOMBRE[p]}</a>`).join("")}<a href="#gp-chuleta"><i style="background:#F2994A;color:#1B1B1A">✓</i>Chuleta rápida</a><a href="#gp-anexo"><i style="background:#5A564F">A</i>Anexo A · Condiciones de la prueba</a></div>
    <div class="pie">Metodología: sistemas de E-Myth (Michael E. Gerber) + negociación táctica (Chris Voss) · Documento interno de Volcano Cars · Pulsa cualquier paso para ir directamente a él.</div></section></div>`;
  box.innerHTML=`<div class="guia">${portada}${pags.map(p=>`<div class="g-pag" id="gp-${p}">${GUIA_PAG[p]()}</div>`).join("")}</div>`;
  box.querySelectorAll("input[type=checkbox]").forEach(i=>i.checked=false);
  box.querySelectorAll(".g-foto").forEach(f=>f.classList.remove("hecha"));
  document.body.classList.add("print-guia");
  const t=document.title; document.title=solo?"Volcano Cars - Anexo A - Condiciones de la prueba":"Volcano Cars - El Metodo de Venta (SOP-02)";
  try{ await document.fonts.ready; await Promise.all([...box.querySelectorAll("img")].map(im=>im.complete?0:new Promise(r=>{im.onload=im.onerror=r;}))); }catch(_){}
  const fin=()=>{ document.body.classList.remove("print-guia"); document.title=t; box.innerHTML=""; window.removeEventListener("afterprint",fin); };
  window.addEventListener("afterprint",fin);
  window.print();
  setTimeout(()=>{ if(!matchMedia("print").matches && document.body.classList.contains("print-guia")) fin(); },60000);
}
