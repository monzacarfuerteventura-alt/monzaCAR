// Datos de PRUEBA para ver el dashboard con vida (solo en el banco de pruebas local).
export async function sembrarDemo(){
  const { store } = await import("./netlify/lib/shared.mts");
  const hoy=new Intl.DateTimeFormat("en-CA",{timeZone:"Atlantic/Canary"}).format(new Date());
  const dia=n=>new Date(Date.parse(hoy+"T12:00:00Z")-n*864e5).toISOString().slice(0,10);
  let seed=7; const r=()=>{ seed=(seed*16807)%2147483647; return seed/2147483647; };
  const cars=[["seat-ibiza-2018","Seat","Ibiza",2018,9990,75],["toyota-corolla-2019","Toyota","Corolla",2019,15490,40],["renault-clio-2016","Renault","Clio",2016,7490,62],["vw-golf-2017","Volkswagen","Golf",2017,13990,20],["opel-astra-2010","Opel","Astra",2010,2999.99,5]];
  const lista=cars.map(([id,marca,modelo,anio,precio,edad])=>({id,marca,modelo,version:"",anio,km:90000,combustible:"Gasolina",cambio:"Manual",cv:90,puertas:5,color:"Blanco",etiqueta:"C",precio,descripcion:"",equipamiento:[],fotos:[],estado:"disponible",destacado:false,video:null,mercado:null,creado:new Date(Date.now()-edad*864e5).toISOString(),actualizado:new Date().toISOString(),precios:[{p:precio,t:new Date(Date.now()-edad*864e5).toISOString()}]}));
  await store("monzacar").setJSON("coches",lista); await store("monzacar").set("semilla-v1","x");
  const an=store("analitica");
  for(let n=1;n<=45;n++){ const f=dia(n), w=new Date(f+"T12:00:00Z").getUTCDay(); const base=(w===0?14:w===6?22:30)+Math.round(r()*14)+Math.round((45-n)/4);
    const horas=Array(24).fill(0).map((_,h)=>Math.round(base*0.12*(h>=8&&h<=22?1:.15)*(h===13||h===20||h===21?2.4:1)*(0.6+r())));
    const cochesV={"seat-ibiza-2018":Math.round(r()*2),"toyota-corolla-2019":Math.round(3+r()*6),"renault-clio-2016":Math.round(r()*1.2),"vw-golf-2017":Math.round(1+r()*4)};
    const camp={}; if(n<20) camp["flyer-septiembre"]=Math.round(r()*6); if(n<12) camp["ig-pre-itv"]=Math.round(2+r()*8);
    await an.setJSON("agg/"+f,{v:base,pv:Math.round(base*2.6),ent:base,vistas:{inicio:base,comprar:Math.round(base*.5),taller:Math.round(base*.4)},fuentes:{"Buscadores":Math.round(base*.45),"Ficha de Google":Math.round(base*.25),"Redes sociales":Math.round(base*.18),"Directo":Math.round(base*.12)},dev:{"Móvil":Math.round(base*.74),"Ordenador":Math.round(base*.26)},lang:{"Español":Math.round(base*.85),"Inglés":Math.round(base*.15)},coches:cochesV,cochesV,clk:{wa:Math.round(base*.08),tel:Math.round(base*.03)},clkV:Math.round(base*.1),frm:{taller:Math.round(base*.05),coche:Math.round(base*.03)},horas,vid:0,camp});
  }
  const s=store("solicitudes"); const canales=["Buscadores","Ficha de Google","Redes sociales","Directo","Google Ads"], tipos=["taller","taller","taller","coche","financiacion","contacto"];
  const nombres=["Marta Díaz","Jonay Cabrera","Ana Pérez","Carlos Ruiz","Laura Gómez","Yeray Hernández","Nira Santana","Pedro León","Aitana Suárez","Kevin Rodríguez","Sara Martín","Iván Morales"];
  for(let i=0;i<46;i++){ const n=Math.floor(r()*40)+1, t=new Date(Date.now()-n*864e5-r()*8*36e5); const tipo=tipos[Math.floor(r()*tipos.length)], canal=canales[Math.floor(r()*canales.length)];
    const est=r()<.38?"ganada":r()<.35?"perdida":r()<.5?"contactado":"cita"; const id=t.toISOString().replace(/[-:.TZ]/g,"")+"-"+String(1000+i);
    const camp=canal==="Redes sociales"&&r()<.6?"ig-pre-itv":canal==="Directo"&&r()<.5?"flyer-septiembre":"";
    await s.setJSON("s/"+id,{id,creado:t.toISOString(),tipo,estado:est,nombre:nombres[i%nombres.length],telefono:"6"+String(10000000+i*7919).slice(0,8),email:"",mensaje:"",coche:tipo==="coche"||tipo==="financiacion"?{id:"toyota-corolla-2019",titulo:"Toyota Corolla",precio:15490}:null,servicios:tipo==="taller"?[["Pre-ITV","Cambio de aceite","Frenos","Diagnosis"][i%4]]:[],dia:"",franja:"",vehiculo:{coche:"Seat León"},origen:{canal,gclid:"",utm_source:"",utm_medium:"",utm_campaign:camp,utm_term:"",referrer:"",landing:""},idioma:"es",consentimiento:{version:"x",fecha:t.toISOString()},cita:est==="cita"?{agenda:"taller",fecha:dia(-2),hora:"09:00"}:null,notas:"",historial:[{t:t.toISOString(),estado:"nueva"},...(est!=="nueva"?[{t:new Date(t.getTime()+r()*3*864e5).toISOString(),estado:est}]:[])],importe:est==="ganada"?Math.round(tipo==="coche"||tipo==="financiacion"?9000+r()*6000:120+r()*700):null,motivo:est==="perdida"?["Precio","No contesta","Compró en otro sitio"][i%3]:"",primerContacto:new Date(t.getTime()+(5+r()*60)*6e4).toISOString(),actividad:[]});
  }
  // 2 sin contestar hoy + 1 alerta de coches
  for(const [i,extra] of [[90,{tipo:"taller",estado:"nueva"}],[91,{tipo:"coche",estado:"nueva",coche:{id:"vw-golf-2017",titulo:"Volkswagen Golf",precio:13990}}],[92,{tipo:"alerta",estado:"contactado",alerta:{zona:"Antigua",presupuesto:"Hasta 12.000 €",carroceria:"",cambio:"",busqueda:""}}]]){
    const t=new Date(Date.now()-(i-89)*40*6e4), id=t.toISOString().replace(/[-:.TZ]/g,"")+"-"+i;
    await s.setJSON("s/"+id,{id,creado:t.toISOString(),nombre:["Rayco Díaz","Elena Cabrera","Tomás Vera"][i-90],telefono:"61122334"+(i-90),email:"",mensaje:"",coche:null,servicios:[],dia:"",franja:"",vehiculo:{},origen:{canal:"Buscadores",gclid:"",utm_source:"",utm_medium:"",utm_campaign:"",utm_term:"",referrer:"",landing:""},idioma:"es",consentimiento:{version:"x",fecha:t.toISOString()},cita:null,notas:"",historial:[{t:t.toISOString(),estado:"nueva"}],importe:null,actividad:[],...extra});
  }
  // un cliente de taller de hace ~1 año (revisión anual)
  const t0=new Date(Date.now()-350*864e5), id0=t0.toISOString().replace(/[-:.TZ]/g,"")+"-777";
  await s.setJSON("s/"+id0,{id:id0,creado:t0.toISOString(),tipo:"taller",estado:"ganada",nombre:"Dácil Perdomo",telefono:"622000111",email:"",mensaje:"",coche:null,servicios:["Revisión"],vehiculo:{coche:"Kia Rio"},origen:{canal:"Ficha de Google",utm_campaign:""},idioma:"es",consentimiento:{version:"x",fecha:t0.toISOString()},historial:[{t:t0.toISOString(),estado:"ganada"}],importe:260,actividad:[]});
  await store("marketing").setJSON("gastos",[{id:"g1",campana:"ig-pre-itv",canal:"Instagram",gasto:120,desde:dia(20),hasta:hoy},{id:"g2",campana:"flyer-septiembre",canal:"Flyers / imprenta",gasto:85,desde:dia(25),hasta:hoy}]);
  await store("monzacar").setJSON("viendo",{"toyota-corolla-2019":[{s:"aaaaaaaa1",h:"h1",t:Date.now()},{s:"aaaaaaaa2",h:"h2",t:Date.now()}],"vw-golf-2017":[{s:"bbbbbbbb1",h:"h3",t:Date.now()}]});
}
