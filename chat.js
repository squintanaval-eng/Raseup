/* ReuseUp's own chat. EcoBot is a design reference, not a shared backend. */
(() => {
  'use strict';
  if(document.getElementById('chat'))return;
  const main=document.getElementById('contenido');if(!main)return;
  const icons={chat:'<path d="M21 11a9 9 0 0 1-9 9H4l-3 3V11a10 10 0 0 1 20 0Z"/><path d="M6 10h9m-9 4h6"/>',spark:'<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',send:'<path d="m3 3 19 9-19 9 4-9Zm4 9h15"/>',copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',plus:'<path d="M12 5v14M5 12h14"/>',stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>',leaf:'<path d="M20 4C8 3 3 9 5 17c8 3 15-2 15-13Z"/><path d="M4 21 15 10"/>',water:'<path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/>',book:'<path d="M12 5C8 2 4 3 2 4v16c4-2 7-1 10 1 3-2 6-3 10-1V4c-3-2-7-1-10 1Zm0 0v16"/>',arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>'};
  const icon=name=>'<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">'+icons[name]+'</svg>';
  const section=document.createElement('section');section.id='chat';section.className='seccion';
  section.innerHTML=`<div class="section-heading chat-heading"><div><span class="overline">PREGUNTA. APRENDE. HAZ EL CAMBIO.</span><h1>Tu espacio de ideas.</h1><p>Una conversaci&oacute;n puede ser el principio de un buen h&aacute;bito.</p></div><span class="badge chat-badge">Asistente ReuseUp ${icon('spark')}</span></div>
  <div class="chat-layout"><article class="chat-panel" aria-label="Chat con el asistente ReuseUp">
    <header class="chat-toolbar"><div class="chat-identity"><span class="chat-orb">${icon('spark')}</span><div><strong>Asistente ReuseUp</strong><small>Ideas para un planeta mejor</small></div></div><div class="chat-tools"><button type="button" id="chatCopy" title="Copiar conversaci&oacute;n" aria-label="Copiar conversaci&oacute;n">${icon('copy')}</button><button type="button" id="chatNew" title="Nuevo chat" aria-label="Nuevo chat">${icon('plus')}<span>Nuevo</span></button></div></header>
    <div class="chat-scroll" id="chatScroll"><div class="chat-welcome" id="chatWelcome"><span class="chat-welcome-art">${icon('leaf')}</span><span class="overline">UN POCO DE CURIOSIDAD, MUCHO POR CAMBIAR</span><h2>&iquest;Qu&eacute; hacemos<br><em>mejor hoy?</em></h2><p>Pregunta sobre reciclaje, tus misiones o cualquier idea para cuidar el planeta.</p><div class="chat-prompts">
    <button type="button" data-chat-prompt="Expl&iacute;came c&oacute;mo empezar a separar los residuos en casa, paso a paso.">${icon('leaf')}<strong>Reciclar sin dudas</strong><span>Empieza con lo que tienes en casa.</span></button>
    <button type="button" data-chat-prompt="Dame tres h&aacute;bitos sencillos para ahorrar agua todos los d&iacute;as.">${icon('water')}<strong>Cada gota cuenta</strong><span>Peque&ntilde;os h&aacute;bitos que suman.</span></button>
    <button type="button" data-chat-prompt="Dame ideas de reutilizaci&oacute;n creativa para mi colegio, sin materiales peligrosos.">${icon('spark')}<strong>Algo viejo, algo nuevo</strong><span>Ideas creativas para tu colegio.</span></button>
    <button type="button" data-chat-prompt="Ay&uacute;dame a entender la diferencia entre reducir, reutilizar y reciclar.">${icon('book')}<strong>Aprende algo nuevo</strong><span>Las tres R, con ejemplos sencillos.</span></button></div></div><div id="chatMessages" role="log" aria-label="Mensajes de la conversaci&oacute;n" aria-live="polite" aria-relevant="additions text"></div></div>
    <div class="chat-notice" id="chatNotice" role="status" hidden></div>
    <form id="chatForm" class="chat-composer"><label class="chat-sr" for="chatInput">Escribe tu mensaje al asistente</label><textarea id="chatInput" rows="1" maxlength="4000" placeholder="Escribe tu pregunta..." autocomplete="off" spellcheck="true"></textarea><button type="button" id="chatStop" class="chat-stop" aria-label="Detener respuesta" hidden>${icon('stop')}</button><button type="submit" id="chatSend" class="chat-send" aria-label="Enviar mensaje" disabled>${icon('send')}</button></form>
    <div class="chat-meta"><span>La IA puede equivocarse. Verifica lo importante.</span><span id="chatCount">0 / 4000</span></div>
  </article><aside class="chat-guide"><div class="chat-guide-card"><span class="overline">DEL CHAT A LA ACCI&Oacute;N</span><h2>Aprender est&aacute; bien.<br><em>Actuar, mejor.</em></h2><p>&iquest;Ya tienes una idea? Ponla en pr&aacute;ctica en ReuseUp.</p><button type="button" class="primary full" id="chatToMissions">Ir a misiones ${icon('arrow')}</button><button type="button" class="secondary full" id="chatToScanner">Escanear un residuo</button></div><details class="chat-privacy" open><summary>Tu privacidad importa</summary><p>Los mensajes se env&iacute;an a Google Gemini para responderte. No compartas contrase&ntilde;as ni datos personales.</p><p>El historial es temporal: se borra al recargar, cambiar de cuenta o iniciar un chat nuevo. El asistente no cambia tus puntos ni aprueba misiones.</p></details></aside></div>`;
  main.append(section);
  const nav=document.querySelector('.menu');
  const navButton=document.createElement('button');navButton.type='button';navButton.dataset.page='chat';navButton.className='chat-nav';navButton.title='Asistente ReuseUp';navButton.innerHTML='<span>'+icon('chat')+'</span><span>Chat IA</span>';navButton.addEventListener('click',()=>window.mostrar('chat'));nav?.append(navButton);
  document.documentElement.style.setProperty('--nav-items',String(nav?.querySelectorAll('[data-page]').length||7));
  const hero=document.querySelector('#inicio .hero');
  if(hero){const cta=document.createElement('button');cta.type='button';cta.className='chat-home-cta';cta.innerHTML='<span class="chat-orb">'+icon('spark')+'</span><span><strong>Una duda. Una idea. Un nuevo comienzo.</strong><small>Habla con el asistente de ReuseUp</small></span>'+icon('arrow');cta.addEventListener('click',()=>window.mostrar('chat'));hero.insertAdjacentElement('afterend',cta);}
  const $=id=>document.getElementById(id);
  const input=$('chatInput'),send=$('chatSend'),stop=$('chatStop'),list=$('chatMessages'),notice=$('chatNotice');
  let history=[],busy=false,active=null,sequence=0,failed=null,retryAfter=0,cooldownTimer=null,owner=window.ReuseProgress?.owner||'guest';
  function resize(){input.style.height='auto';input.style.height=Math.min(input.scrollHeight,140)+'px';$('chatCount').textContent=input.value.length+' / 4000';buttons();}
  function buttons(){send.disabled=busy||Date.now()<retryAfter||!input.value.trim();stop.hidden=!busy;send.hidden=busy;input.disabled=busy;$('chatCopy').disabled=!history.length;section.querySelectorAll('[data-chat-prompt]').forEach(b=>b.disabled=busy);if(failed?.button)failed.button.disabled=busy||Date.now()<retryAfter;}
  function say(text){notice.textContent=text;notice.hidden=!text;}
  function scroll(){const box=$('chatScroll');box.scrollTop=box.scrollHeight;}
  function message(role,text){$('chatWelcome').hidden=true;const article=document.createElement('article');article.className='chat-message '+role;const label=document.createElement('span');label.className='chat-speaker';label.textContent=role==='user'?'T\u00fa':'ReuseUp';const body=document.createElement('div');body.className='chat-bubble';body.textContent=text;article.append(label,body);list.append(article);while(list.children.length>42)list.firstElementChild.remove();scroll();return {article,body};}
  function stopRequest(){sequence++;active?.abort();active=null;busy=false;buttons();}
  function clear(){stopRequest();history=[];failed=null;list.replaceChildren();$('chatWelcome').hidden=false;input.value='';say('');resize();}
  const originalShow=window.mostrar;
  window.mostrar=function(id){
    if(id!=='chat')return originalShow(id);
    document.querySelectorAll('.seccion').forEach(s=>s.classList.toggle('activa',s===section));
    document.querySelectorAll('[data-page]').forEach(b=>{if(b.dataset.page==='chat')b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    $('pageTitle').textContent='Asistente ReuseUp';const title=section.querySelector('h1');title.tabIndex=-1;title.focus({preventScroll:true});window.scrollTo({top:0,behavior:'auto'});scroll();
  };
  function payload(text){const records=[...history,{role:'user',text}];while(records.length>21||records.reduce((n,m)=>n+m.text.length,0)>24000)records.splice(0,2);return records;}
  function retryCooldown(seconds){retryAfter=Date.now()+seconds*1000;clearInterval(cooldownTimer);cooldownTimer=setInterval(()=>{buttons();if(Date.now()>=retryAfter){clearInterval(cooldownTimer);cooldownTimer=null;}},1000);}
  async function submit(text,retry=false){
    if(busy||Date.now()<retryAfter||!text.trim())return;
    if(text.length>4000){say('Tu mensaje puede tener hasta 4000 caracteres.');return;}
    if(retry&&failed)failed.article.remove();
    if(!retry)message('user',text);
    if(failed?.button)failed.button.remove();failed=null;input.value='';resize();say('');
    const pending=message('assistant','');pending.article.classList.add('is-thinking');pending.body.innerHTML='<span class="chat-thinking"><i></i><i></i><i></i><span>Preparando una idea para ti...</span></span>';
    busy=true;const token=++sequence;const controller=new AbortController();active=controller;buttons();let timeout=false;
    const timer=setTimeout(()=>{timeout=true;controller.abort();},50000);
    try{
      const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({messages:payload(text)}),signal:controller.signal});
      let data;try{data=await response.json();}catch{throw new Error('El servidor no devolvi\u00f3 una respuesta v\u00e1lida. Intenta otra vez.');}
      if(token!==sequence)return;
      if(!response.ok){if(response.status===429)retryCooldown(60);throw new Error(typeof data?.error==='string'?data.error.slice(0,300):'No pude responder ahora. Intenta otra vez.');}
      if(typeof data?.reply!=='string'||!data.reply.trim())throw new Error('No recib\u00ed una respuesta. Intenta nuevamente.');
      const reply=data.reply.slice(0,4000);pending.body.textContent=reply;pending.article.classList.remove('is-thinking');
      history=payload(text);history.push({role:'assistant',text:reply});while(history.length>20)history.splice(0,2);
      if(data.truncated)say('La respuesta se acort\u00f3. Puedes pedirle al asistente que contin\u00fae.');
    }catch(error){
      if(token!==sequence)return;
      const textError=timeout?'La respuesta tard\u00f3 demasiado. Puedes reintentar.':(error.name==='AbortError'?'Respuesta detenida.':error.message||'No se pudo conectar. Revisa tu conexi\u00f3n.');
      pending.body.textContent=textError;pending.article.classList.remove('is-thinking');pending.article.classList.add('chat-error');
      const retryButton=document.createElement('button');retryButton.type='button';retryButton.className='chat-retry';retryButton.textContent='Reintentar';retryButton.addEventListener('click',()=>submit(text,true));pending.article.append(retryButton);failed={article:pending.article,button:retryButton,text};
    }finally{clearTimeout(timer);if(token===sequence){busy=false;active=null;buttons();scroll();}}
  }
  $('chatForm').addEventListener('submit',event=>{event.preventDefault();void submit(input.value.trim());});
  input.addEventListener('input',resize);input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();if(!send.disabled&&!busy)$('chatForm').requestSubmit();}});
  stop.addEventListener('click',()=>{active?.abort();});
  $('chatNew').addEventListener('click',()=>{if(list.children.length&&!window.confirm('Se borrar\u00e1 esta conversaci\u00f3n temporal. \u00bfEmpezar un chat nuevo?'))return;clear();input.focus();});
  $('chatCopy').addEventListener('click',async()=>{try{if(!history.length)return;await navigator.clipboard.writeText(history.map(m=>(m.role==='user'?'T\u00fa: ':'ReuseUp: ')+m.text).join('\n\n'));say('Conversaci\u00f3n copiada.');}catch{say('El navegador no permiti\u00f3 copiar. Puedes seleccionar el texto manualmente.');}});
  section.querySelectorAll('[data-chat-prompt]').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.chatPrompt;resize();input.focus();}));
  $('chatToMissions').addEventListener('click',()=>window.mostrar('retos'));$('chatToScanner').addEventListener('click',()=>window.mostrar('escaner'));
  addEventListener('reuseup:render',()=>{const next=window.ReuseProgress?.owner||'guest';if(next!==owner){owner=next;clear();say('Chat nuevo: cambiaste de cuenta.');}});
  addEventListener('pagehide',()=>{stopRequest();clearInterval(cooldownTimer);});
  buttons();
})();
