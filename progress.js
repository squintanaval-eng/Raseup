/* Bridge the original game to isolated guest/account state. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),copy=x=>JSON.parse(JSON.stringify(x));
  const integer=(v,max=2147483647)=>Math.min(max,Math.max(0,Math.floor(Number(v)||0)));
  const storage={read(k,f=null){try{return JSON.parse(localStorage.getItem(k))??f;}catch{return f;}},write(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch{return false;}},remove(k){try{localStorage.removeItem(k);}catch{}}};
  const avatars=['leaf','sprout','flower','cactus'];
  const oldAvatars={'\ud83c\udf43':'leaf','\ud83c\udf31':'sprout','\ud83c\udf3b':'flower','\ud83c\udf35':'cactus'};
  let owner='guest',enabled=false,epoch=0,history=[],timer;
  const GUEST='reuseup-guest-v2';
  function clean(d={}) {
    d=d&&typeof d==='object'?d:{};
    const q=d.ecoquiz?.fecha===fechaEco()?d.ecoquiz:{};
    const done={};for(const id of Object.keys(misiones))if(/^\d{4}-\d{2}-\d{2}$/.test(d.completados?.[id]||''))done[id]=d.completados[id];
    return {puntos:integer(d.puntos),nombre:String(d.nombre||'Hojita').trim().slice(0,20)||'Hojita',personaje:avatars.includes(d.personaje)?d.personaje:oldAvatars[d.personaje]||'leaf',completados:done,ecoquiz:{fecha:fechaEco(),puntosHoy:integer(q.puntosHoy,50),respondidas:[...new Set(Array.isArray(q.respondidas)?q.respondidas.filter(i=>Number.isInteger(i)&&i>=0&&i<preguntasEco.length):[])]},historial:(Array.isArray(d.historial)?d.historial:[]).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x?.fecha)&&Number(x.puntos)>0).slice(-4000).map(x=>({fecha:x.fecha,puntos:integer(x.puntos)}))};
  }
  function get(){return clean({puntos,nombre,personaje,completados,ecoquiz:estadoEco,historial:history});}
  function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(timer);timer=setTimeout(()=>$('toast').hidden=true,4200);}
  function emit(){dispatchEvent(new CustomEvent('reuseup:render'));}
  const oldUpdate=window.actualizar;
  window.actualizar=function(){oldUpdate();$('homePoints').textContent=puntos.toLocaleString('es-PE');$('saludoNombre').textContent=nombre;$('profileLevel').textContent='Nivel '+(Math.floor(puntos/100)+1);$('levelProgress').value=puntos%100;$('levelHint').textContent=(100-puntos%100)+' puntos para tu siguiente nivel.';$('homeMissions').textContent=Object.values(completados).filter(x=>x===fechaMision()).length+' / 3';if(document.activeElement!==$('nombre'))$('nombre').value=nombre;document.querySelectorAll('[data-avatar]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.avatar===personaje)));refreshLocks();emit();};
  function refreshLocks(){document.querySelectorAll('[data-mission],[data-avatar],#saveName').forEach(b=>b.disabled=!enabled||verificandoMision);document.querySelectorAll('#ecoOpciones button').forEach(b=>b.disabled=!enabled||respuestaEcoDada);$('botonVerificar').disabled=!enabled||verificandoMision;}
  function lock(v){enabled=!v;refreshLocks();}
  function save(){const d=get();if(owner==='guest'&&!storage.write(GUEST,d))toast('No se pudo guardar el progreso en este navegador.');dispatchEvent(new CustomEvent('reuseup:change',{detail:d}));emit();}
  window.guardar=save;
  window.guardarEstadoEco=save;
  window.cargarEstadoEco=function(){return clean(get()).ecoquiz;};
  window.sumar=function(c){if(!enabled||!Number.isFinite(c)||c<=0)return;puntos=integer(puntos+c);const date=fechaEco(),entry=history.find(x=>x.fecha===date);if(entry)entry.puntos+=c;else history.push({fecha:date,puntos:c});save();actualizar();};
  window.guardarNombre=function(){if(!enabled)return;const n=$('nombre').value.trim();if(n.length<2)return toast('Elige un apodo de al menos dos caracteres.');nombre=n.slice(0,20);save();actualizar();toast(owner==='guest'?'Nombre guardado en este dispositivo.':'Nombre actualizado. Sincronizando...');};
  window.cambiarAvatar=function(a){if(!enabled||!avatars.includes(a))return;personaje=a;save();actualizar();};
  const answerOriginal=window.responderEco;
  window.responderEco=function(i){if(!enabled)return;if(estadoEco.fecha!==fechaEco()){estadoEco=clean({}).ecoquiz;siguienteEcoPregunta();return toast('Comenz\u00f3 un nuevo d\u00eda. Responde la nueva pregunta.');}return answerOriginal(i);};
  const nextOriginal=window.siguienteEcoPregunta;
  window.siguienteEcoPregunta=function(){nextOriginal();refreshLocks();};
  const openOriginal=window.abrirMision;
  window.abrirMision=function(id){if(enabled&&!verificandoMision)openOriginal(id);};
  window.reto=function(id){mostrar('retos');abrirMision(id);};
  const titles={inicio:'Vista general',escaner:'Esc\u00e1ner inteligente',retos:'Misiones ecol\u00f3gicas',planeta:'Explora el planeta',ranking:'Top recicladores',personaje:'Mi perfil',cuenta:'Mi cuenta'};
  window.mostrar=function(id){if(!titles[id])return;document.querySelectorAll('.seccion').forEach(s=>s.classList.toggle('activa',s.id===id));document.querySelectorAll('[data-page]').forEach(b=>{if(b.dataset.page===id)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});$('pageTitle').textContent=titles[id];const h=$(id).querySelector('h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}window.scrollTo({top:0,behavior:'auto'});emit();};
  function apply(d,nextOwner){owner=nextOwner;epoch++;const s=clean(d);puntos=s.puntos;nombre=s.nombre;personaje=s.personaje;completados=s.completados;estadoEco=s.ecoquiz;history=s.historial;misionActual=null;$('panelMision').hidden=true;actualizar();siguienteEcoPregunta();}
  if(!storage.read(GUEST)){
    const old=storage.read('reuseup-progreso-v1',{}),oldSession=storage.read('sb-kwpgyiqwyccpxeldpugu-auth-token');
    storage.write(GUEST,clean(oldSession?.user?{}:{...old,ecoquiz:storage.read('reuseup_ecoquiz_v1',{}),historial:storage.read('reuseup-ranking-history-v1',[])}));
  }
  function message(id,text,tone=''){$(id).textContent=text;$(id).dataset.tone=tone;}
  function valid(file){return file&&['image/jpeg','image/png','image/webp'].includes(file.type)&&file.size>0&&file.size<=3*1024*1024;}
  async function request(file,extra={}){
    if(!valid(file))throw new Error('Elige una foto JPG, PNG o WebP de hasta 3 MB.');
    const image=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(new Error('No se pudo leer la foto.'));r.readAsDataURL(file);});
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),45000);
    try{const response=await fetch('/api/analizar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imagen:image,tipo:file.type,...extra}),signal:controller.signal});let data;try{data=await response.json();}catch{throw new Error('El servidor no respondi\u00f3 correctamente. Prueba otra vez.');}if(!response.ok)throw new Error(typeof data.error==='string'?data.error.slice(0,250):'No se pudo analizar la imagen.');return data;}catch(e){if(e.name==='AbortError')throw new Error('El an\u00e1lisis tard\u00f3 demasiado. Int\u00e9ntalo nuevamente.');throw e;}finally{clearTimeout(timeout);}
  }
  window.analizar=async function(){const b=$('analizar');b.disabled=true;b.setAttribute('aria-busy','true');message('resultado','Analizando tu residuo...','loading');try{const d=await request($('foto').files[0]);message('resultado',String(d.resultado||'No se pudo identificar el residuo.'));}catch(e){message('resultado',e.message,'error');}finally{b.disabled=false;b.removeAttribute('aria-busy');}};
  window.verificarMision=async function(){if(!enabled||verificandoMision||!misionActual)return;const id=misionActual,startEpoch=epoch,date=fechaMision();if(completados[id]===date)return message('resultadoMision','Ya completaste esta misi\u00f3n hoy.');verificandoMision=true;refreshLocks();$('botonVerificar').setAttribute('aria-busy','true');message('resultadoMision','Revisando tu acci\u00f3n...','loading');try{const d=await request($('fotoMision').files[0],{accion:'verificar_mision',mision:id});if(startEpoch!==epoch||!enabled)return;if(date!==fechaMision())return message('resultadoMision','Comenz\u00f3 otro d\u00eda. Verifica tu foto otra vez.');if(d.aprobado===true&&completados[id]!==date){completados[id]=date;sumar(misiones[id].puntos);message('resultadoMision',String(d.mensaje||'Misi\u00f3n completada.')+'\nGanaste '+misiones[id].puntos+' puntos.','success');}else message('resultadoMision',String(d.mensaje||'No se pudo confirmar la acci\u00f3n.'));}catch(e){if(startEpoch===epoch)message('resultadoMision',e.message,'error');}finally{verificandoMision=false;refreshLocks();$('botonVerificar').removeAttribute('aria-busy');}};
  window.ReuseProgress={get,clean,apply,lock,storage,toast,message,get owner(){return owner;},get busy(){return verificandoMision;},guest:()=>clean(storage.read(GUEST,{}))};
  apply(storage.read(GUEST,{}),'guest');mostrar('inicio');
})();
