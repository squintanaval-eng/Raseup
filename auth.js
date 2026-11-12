/* Supabase accounts: isolated state, complete recovery, safe async lifecycle. */
(() => {
  'use strict';
  const P=window.ReuseProgress,$=id=>document.getElementById(id),cfg=window.REUSEUP_SUPABASE||{};
  let client=null,user=null,loaded=false,loadPromise=null,loadingId=null,generation=0;
  let mode='login',busy=false,recovery=false,revision=0,dirty=false,pending=null,change=0,saving=null,conflict=false;
  let cooldown=Number(P.storage.read('reuseup-mail-cooldown-v2',0))||0;
  const initialURL=new URL(location.href),initialHash=new URLSearchParams(location.hash.slice(1));
  const recoveryLink=initialURL.searchParams.get('auth')==='recovery'||initialHash.get('type')==='recovery';
  const linkError=initialHash.get('error_code')||initialURL.searchParams.get('error_code')||initialHash.get('error');
  const cacheKey=id=>'reuseup-account-v2:'+id;
  const say=(t,tone='')=>P.message('cuentaMensaje',t,tone);
  const status=(t,retry=false)=>{$('cuentaEstado').textContent=t;$('retrySync').hidden=!retry;};
  function redirect(type){const u=new URL(location.pathname,location.origin);u.searchParams.set('auth',type);return u.href;}
  function errorText(e){
    const c=e?.code||'',m=String(e?.message||'');
    if(c==='email_not_confirmed'||/email not confirmed/i.test(m))return 'Confirma tu correo antes de entrar. Abre el mensaje m\u00e1s reciente o solicita uno nuevo.';
    if(c==='invalid_credentials'||/invalid login credentials/i.test(m))return 'El correo o la contrase\u00f1a no son correctos. Rev\u00edsalos e int\u00e9ntalo otra vez.';
    if(c==='email_address_not_authorized'||/not authorized/i.test(m))return 'El servicio de correo a\u00fan no permite enviar a esta direcci\u00f3n. El administrador debe configurar el correo de Supabase.';
    if(c==='over_email_send_rate_limit'||/email rate limit/i.test(m))return 'Supabase ha limitado el env\u00edo de correos. No solicites m\u00e1s por ahora; usa el \u00faltimo correo o espera a que se restablezca el l\u00edmite.';
    if(e?.status===429||/rate limit|after \d+ seconds/i.test(m))return 'Demasiados intentos seguidos. Espera antes de volver a intentarlo.';
    if(c==='otp_expired'||/expired|invalid.*link|token.*not found/i.test(m))return 'Este enlace ya no es v\u00e1lido. Abre el correo m\u00e1s reciente o solicita uno nuevo.';
    if(c==='weak_password')return 'Elige una contrase\u00f1a m\u00e1s segura, de al menos 8 caracteres.';
    if(c==='same_password')return 'Elige una contrase\u00f1a diferente de la anterior.';
    if(c==='23505')return 'El perfil ya existe. Pulsa Reintentar para cargarlo.';
    if(/fetch|network|timeout|abort/i.test(m)||e?.name==='AbortError')return 'No se pudo conectar. Comprueba tu conexi\u00f3n y vuelve a intentarlo.';
    return 'No se pudo completar la solicitud. Int\u00e9ntalo otra vez. Si persiste, contacta al administrador.';
  }
  function controls(){
    const wait=Date.now()<cooldown;
    $('authSubmit').disabled=busy||!client||(mode==='register'&&wait);
    $('resendConfirmation').disabled=busy||!client||wait;
    $('recuperarClave').disabled=busy||!client||wait;
    $('resetSubmit').disabled=busy||!client;
    $('cuentaSalir').disabled=busy;
    document.querySelectorAll('[data-auth-mode]').forEach(b=>b.disabled=busy);
    $('emailCooldown').textContent=wait?'Puedes solicitar otro correo en '+Math.ceil((cooldown-Date.now())/1000)+' s. Este control no elimina los l\u00edmites del servicio.':'';
  }
  function waitMail(seconds=60){cooldown=Date.now()+seconds*1000;P.storage.write('reuseup-mail-cooldown-v2',cooldown);controls();}
  function setMode(next){
    mode=next;$('nameField').hidden=next!=='register';$('confirmField').hidden=next!=='register';
    $('cuentaNombre').required=next==='register';$('confirmClave').required=next==='register';
    $('cuentaClave').minLength=next==='register'?8:1;$('cuentaClave').autocomplete=next==='register'?'new-password':'current-password';
    $('authTitle').textContent=next==='register'?'Empieza tu aventura.':'Qu\u00e9 bueno verte.';
    $('authDescription').textContent=next==='register'?'Elige tu apodo y crea una cuenta.':'Entra con tu correo y contrase\u00f1a.';
    $('authSubmit').textContent=next==='register'?'Crear cuenta':'Iniciar sesi\u00f3n';
    document.querySelectorAll('[data-auth-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.authMode===next)));controls();
  }
  function paint(){
    $('cuentaInvitado').hidden=!!user||recovery;$('cuentaConectada').hidden=!user||recovery;$('resetForm').hidden=!recovery;
    $('accountLabel').textContent=user?'Mi cuenta':'Iniciar sesi\u00f3n';$('statusDot').classList.toggle('online',!!user&&loaded);
    $('cuentaSaludo').textContent=user?'Sesi\u00f3n iniciada como '+user.email:'';
    $('cloudConflict').hidden=!conflict;
  }
  function stash(){if(user)P.storage.write(cacheKey(user.id),{user_id:user.id,data:pending||P.get(),baseRevision:revision,dirty});}
  async function loadProfile(next,force=false){
    if(!next){generation++;user=null;loaded=false;pending=null;dirty=false;revision=0;conflict=false;recovery=false;P.apply(P.guest(),'guest');P.lock(false);paint();status('Modo invitado. Tu progreso se guarda en este dispositivo.');return true;}
    if(!force&&loaded&&user?.id===next.id)return true;
    if(loadingId===next.id&&loadPromise)return loadPromise;
    const ticket=++generation;user=next;loaded=false;conflict=false;P.lock(true);paint();status('Cargando tu progreso...');loadingId=next.id;
    loadPromise=(async()=>{
      try {
        let {data,error}=await client.from('user_progress').select('*').eq('user_id',next.id).maybeSingle();if(error)throw error;
        if(!data){
          const initial={...P.clean({nombre:next.user_metadata?.display_name||'Hojita'}),user_id:next.id};
          const response=await client.from('user_progress').upsert(initial,{onConflict:'user_id',ignoreDuplicates:true});if(response.error)throw response.error;
          // A concurrent tab may have inserted it: re-read instead of requiring an inserted row.
          const fetched=await client.from('user_progress').select('*').eq('user_id',next.id).single();if(fetched.error)throw fetched.error;data=fetched.data;
        }
        if(ticket!==generation||user?.id!==next.id)return false;
        const cached=P.storage.read(cacheKey(next.id));revision=Number(data.revision)||0;
        if(cached?.dirty&&cached.user_id===next.id){
          pending=P.clean(cached.data);dirty=true;P.apply(pending,next.id);
          if(Number(cached.baseRevision)!==revision){conflict=true;P.lock(true);paint();status('Hay cambios de otro dispositivo. Revisa Mi cuenta.',true);say('No se ha sobrescrito tu progreso. Guarda una copia local antes de cargar la nube.','error');return false;}
        }else{dirty=false;pending=null;P.apply(data,next.id);}
        loaded=true;P.lock(false);paint();status('Tu progreso est\u00e1 sincronizado.');stash();
        if(dirty)void flush();return true;
      }catch(e){if(ticket===generation){P.lock(true);loaded=false;status('No se pudo cargar tu progreso. No se sobrescribir\u00e1.',true);say(errorText(e),'error');}return false;}
      finally{if(loadingId===next.id){loadingId=null;loadPromise=null;}}
    })();
    return loadPromise;
  }
  function flush(){
    if(saving)return saving;
    if(!user||!loaded||conflict)return Promise.resolve(!dirty);
    const id=user.id;
    saving=(async()=>{
      try{
        while(dirty&&user?.id===id&&loaded&&!conflict){
          const payload=P.clean(pending),serial=change,base=revision;status('Guardando tu progreso...');
          const response=await client.from('user_progress').update({...payload,revision:base+1,updated_at:new Date().toISOString()}).eq('user_id',id).eq('revision',base).select('revision').maybeSingle();
          if(response.error)throw response.error;
          if(user?.id!==id)return false;
          if(!response.data){conflict=true;P.lock(true);paint();status('Hay cambios en otro dispositivo. Revisa Mi cuenta.',true);say('Tu copia local est\u00e1 guardada. No hemos sobrescrito los cambios de la nube.','error');return false;}
          revision=Number(response.data.revision);if(serial===change){dirty=false;pending=null;}stash();
        }
        if(user?.id===id&&!dirty)status('Tu progreso est\u00e1 sincronizado.');return !dirty;
      }catch(e){if(user?.id===id){stash();status('Cambios pendientes. Reintenta la sincronizaci\u00f3n.',true);say(errorText(e),'error');}return false;}
      finally{saving=null;}
    })();return saving;
  }
  addEventListener('reuseup:change',event=>{if(!user||!loaded||P.owner!==user.id)return;pending=P.clean(event.detail);dirty=true;change++;stash();void flush();});
  async function sessionEvent(event,session){
    if(event==='PASSWORD_RECOVERY'&&session?.user){recovery=true;mostrar('cuenta');}
    if(event==='SIGNED_OUT'){await loadProfile(null);say('Sesi\u00f3n cerrada. Tu progreso de invitado sigue separado.');return;}
    if(session?.user){await loadProfile(session.user);paint();}
  }
  function sdk(){
    if(window.supabase?.createClient)return Promise.resolve(window.supabase);
    return new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.102.0/dist/umd/supabase.js';tag.crossOrigin='anonymous';tag.referrerPolicy='no-referrer';let settled=false;const timeout=setTimeout(()=>finish(new Error('SDK timeout')),12000);function finish(error){if(settled)return;settled=true;clearTimeout(timeout);if(error)reject(error);else if(window.supabase?.createClient)resolve(window.supabase);else reject(new Error('SDK unavailable'));}tag.onload=()=>finish();tag.onerror=()=>finish(new Error('SDK network error'));document.head.append(tag);});
  }
  async function start(){
    try {
      if(!cfg.url||!(cfg.publishableKey||cfg.anonKey))throw new Error('Configuration unavailable');
      const lib=await sdk();client=lib.createClient(cfg.url,cfg.publishableKey||cfg.anonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'implicit'}});
      // Never make awaited Supabase calls inside its auth lock callback.
      client.auth.onAuthStateChange((event,session)=>{setTimeout(()=>{void sessionEvent(event,session).catch(()=>{status('No se pudo actualizar la sesi\u00f3n.',true);});},0);});
      const response=await client.auth.getSession();if(response.error)throw response.error;
      recovery=!!response.data.session?.user&&recoveryLink;
      await loadProfile(response.data.session?.user||null);paint();controls();
      if(recovery||initialURL.searchParams.has('auth')||linkError)mostrar('cuenta');
      if(linkError)say('El enlace de correo no es v\u00e1lido o ya venci\u00f3. Abre el m\u00e1s reciente o solicita uno nuevo.','error');
      else if(recoveryLink&&!user)say('Este enlace no tiene una sesi\u00f3n v\u00e1lida. Solicita nuevamente la recuperaci\u00f3n.','error');
      // Remove callback credentials/error parameters from browser history after processing.
      if(location.hash.includes('access_token=')||linkError||initialURL.searchParams.has('auth'))history.replaceState(null,'',location.pathname+'#cuenta');
    }catch(e){client=null;await loadProfile(null);controls();status('Puedes explorar como invitado. El servicio de cuentas no est\u00e1 disponible.',true);say(errorText(e),'error');}
  }
  function email(){const field=$('cuentaCorreo');if(!field.reportValidity()||!field.value.trim())return null;return field.value.trim();}
  async function run(button,task){if(busy)return;busy=true;button.setAttribute('aria-busy','true');controls();try{await task();}catch(e){if(e?.status===429||/rate limit/i.test(String(e?.message)))waitMail();say(errorText(e),'error');}finally{busy=false;button.removeAttribute('aria-busy');controls();}}
  document.querySelectorAll('[data-auth-mode]').forEach(b=>b.addEventListener('click',()=>{setMode(b.dataset.authMode);say('');}));
  $('togglePassword').addEventListener('click',()=>{const visible=$('cuentaClave').type==='password';$('cuentaClave').type=visible?'text':'password';$('togglePassword').textContent=visible?'Ocultar':'Ver';$('togglePassword').setAttribute('aria-pressed',String(visible));$('togglePassword').setAttribute('aria-label',visible?'Ocultar contrase\u00f1a':'Mostrar contrase\u00f1a');});
  $('cuentaFormulario').addEventListener('submit',event=>{
    event.preventDefault();if(!client||busy)return;if(P.busy)return say('Termina la verificaci\u00f3n de la misi\u00f3n antes de cambiar de cuenta.');
    const address=email(),password=$('cuentaClave').value;if(!address)return;
    if(mode==='register'&&(password.length<8||password!==$('confirmClave').value))return say('Usa al menos 8 caracteres y repite la misma contrase\u00f1a.','error');
    if(mode==='register'&&Date.now()<cooldown)return;
    void run($('authSubmit'),async()=>{
      try{
        if(mode==='register'){
          const name=$('cuentaNombre').value.trim();if(name.length<2)return say('Elige un apodo de al menos dos caracteres.','error');
          const {data,error}=await client.auth.signUp({email:address,password,options:{data:{display_name:name.slice(0,20)},emailRedirectTo:redirect('confirm')}});if(error)throw error;
          waitMail();if(data.session){const ok=await loadProfile(data.session.user);if(ok)say('Cuenta lista. Tu progreso se guardar\u00e1 aqu\u00ed.','success');}
          else say('Revisa tu correo y confirma la cuenta con el enlace m\u00e1s reciente. No necesitas registrarte otra vez.','success');
        }else{
          const {data,error}=await client.auth.signInWithPassword({email:address,password});if(error)throw error;
          const ok=await loadProfile(data.user||data.session?.user);if(ok)say('Sesi\u00f3n iniciada. Tu progreso est\u00e1 listo.','success');
        }
      }finally{$('cuentaClave').value='';$('confirmClave').value='';}
    });
  });
  $('resendConfirmation').addEventListener('click',()=>{const address=email();if(!address||!client||Date.now()<cooldown)return;void run($('resendConfirmation'),async()=>{const {error}=await client.auth.resend({type:'signup',email:address,options:{emailRedirectTo:redirect('confirm')}});if(error)throw error;waitMail();say('Si la cuenta necesita confirmaci\u00f3n, recibir\u00e1s un correo. Abre solo el m\u00e1s reciente.','success');});});
  $('recuperarClave').addEventListener('click',()=>{const address=email();if(!address||!client||Date.now()<cooldown)return;void run($('recuperarClave'),async()=>{const {error}=await client.auth.resetPasswordForEmail(address,{redirectTo:redirect('recovery')});if(error)throw error;waitMail();say('Si ese correo tiene una cuenta, recibir\u00e1s un enlace para elegir una nueva contrase\u00f1a.','success');});});
  $('resetForm').addEventListener('submit',event=>{event.preventDefault();if(!client||!user||!recovery)return;const password=$('newPassword').value;if(password.length<8||password!==$('repeatPassword').value)return say('Usa al menos 8 caracteres y repite la misma contrase\u00f1a.','error');void run($('resetSubmit'),async()=>{const {error}=await client.auth.updateUser({password});if(error)throw error;recovery=false;$('newPassword').value='';$('repeatPassword').value='';history.replaceState(null,'',location.pathname+'#cuenta');paint();say('Contrase\u00f1a actualizada correctamente.','success');});});
  $('cuentaSalir').addEventListener('click',()=>{if(!client||!user)return;if(P.busy)return say('Espera a que termine la verificaci\u00f3n antes de cerrar sesi\u00f3n.');void run($('cuentaSalir'),async()=>{if(dirty&&!(await flush())){say('Hay cambios pendientes. Reintenta el guardado o guarda una copia antes de cerrar sesi\u00f3n.','error');return;}const oldId=user.id;const {error}=await client.auth.signOut({scope:'local'});if(error)throw error;P.storage.remove(cacheKey(oldId));await loadProfile(null);say('Sesi\u00f3n cerrada.','success');});});
  $('retrySync').addEventListener('click',async()=>{if(busy)return;if(!client){await start();return;}if(conflict){mostrar('cuenta');return;}if(user){if(loaded&&dirty)await flush();else await loadProfile(user,true);}});
  $('exportPending').addEventListener('click',()=>{const blob=new Blob([JSON.stringify(P.get(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='reuseup-progreso-pendiente.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);});
  $('reloadCloud').addEventListener('click',async()=>{if(!user||saving)return;P.storage.write('reuseup-conflict-backup:'+user.id,{data:P.get(),at:new Date().toISOString()});P.storage.remove(cacheKey(user.id));dirty=false;pending=null;conflict=false;loaded=false;await loadProfile(user,true);});
  addEventListener('online',()=>{if(user&&dirty&&!conflict)void flush();});
  addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  setMode('login');controls();setInterval(controls,1000);void start();
})();
