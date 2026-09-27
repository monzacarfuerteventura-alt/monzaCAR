export async function sembrarCitas(p){
  return await p.evaluate(async()=>{
    const d=await (await fetch("/api/citas?agenda=taller")).json();
    const dias=(d.dias||d).filter(x=>!x.cerrado&&x.horas.some(h=>h.libre));
    const gente=[["Marta Díaz","611223344","Seat Ibiza","Revisión pre-ITV"],["Jonay Cabrera","622334455","Toyota Corolla","Cambio de aceite y filtros"],["Ana Pérez","633445566","Renault Clio","Ruido al frenar"]];
    const out=[];
    for(let i=0;i<gente.length;i++){ const dia=dias[i]||dias[0]; const h=dia.horas.filter(x=>x.libre)[i%2];
      const [nombre,telefono,coche,mensaje]=gente[i];
      const r=await fetch("/api/solicitudes",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({tipo:"taller",nombre,telefono,mensaje,acepta:true,servicios:[mensaje],vehiculo:{coche},cita:{fecha:dia.fecha,hora:h.hora}})});
      out.push(r.status+" "+(await r.text()).slice(0,80)); }
    return out;
  });
}
