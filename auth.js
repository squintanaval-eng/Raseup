// Supabase Auth + private per-user progress. Requires public project URL and anon key.
(async function(){
 const $=id=>document.getElementById(id), config=window.REUSEUP_SUPABASE||{};
 const msg=t=>{$("cuentaMensaje").textContent=t;};
 if(!config.url||!config.anonKey||!window.supabase){msg("El inicio de sesión estará disponible cuando se configure Supabase.");return;}
 const client=window.supabase.createClient(config.url,config.anonKey);
 let current=null,loading=false;
 const snapshot=()=>({puntos:Math.max(0,Number($("puntos").textContent)||0),completados:window.completados||{},personaje:window.personaje||"🍃",nombre:$("nombreMostrado").textContent});
 async function subir(){if(!current)return;const state=snapshot();const {error}=await client.from("user_progress").upsert({user_id:current.id,...state,updated_at:new Date().toISOString()},{onConflict:"user_id"});if(error)msg("No se pudo sincronizar: "+error.message);}
 async function cargar(user){
   const {data,error}=await client.from("user_progress").select("puntos,completados,personaje,nombre").eq("user_id",user.id).maybeSingle();
   if(error){msg("No se pudo cargar tu progreso: "+error.message);return;}
   if(!data){await subir();return;}
   // Existing script uses top-level lexical bindings, so update through the existing persistence key.
   const progreso={puntos:Number(data.puntos)||0,completados:data.completados||{},personaje:data.personaje||"🍃",nombre:data.nombre||"Hojita"};
   localStorage.setItem("reuseup-progreso-v1",JSON.stringify(progreso));
   msg("Tu progreso está sincronizado. Recarga la página para cargarlo en los juegos.");
 }
 async function refresh(user){
   current=user;
   $("cuentaInvitado").hidden=!!user;$("cuentaConectada").hidden=!user;
   $("cuentaEstado").textContent=user?"Sesión iniciada: "+user.email:"Modo invitado · progreso local";
   if(user){$("cuentaSaludo").textContent="Sesión iniciada como "+user.email;await cargar(user);}
 }
 const {data:{session}}=await client.auth.getSession();await refresh(session?.user||null);
 client.auth.onAuthStateChange((_event,session)=>{if(session?.user?.id!==current?.id)void refresh(session?.user||null);});
 let accion="entrar";
 $("cuentaFormulario").querySelectorAll("button[data-accion]").forEach(b=>b.addEventListener("click",()=>accion=b.dataset.accion));
 $("cuentaFormulario").addEventListener("submit",async e=>{
  e.preventDefault();if(loading)return;loading=true;
  const email=$("cuentaCorreo").value.trim(),password=$("cuentaClave").value;
  try{
   if(accion==="registro"){
    const nombre=$("cuentaNombre").value.trim();
    if(nombre.length<2){msg("Escribe un nombre de al menos 2 caracteres.");return;}
    const {data,error}=await client.auth.signUp({email,password,options:{data:{display_name:nombre.slice(0,20)}}});
    if(error)throw error;
    msg(data.session?"Cuenta creada.":"Revisa tu correo para confirmar tu cuenta.");
   }else{
    const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;
    msg("Sesión iniciada.");
   }
  }catch(err){msg(err.message||"No se pudo iniciar sesión.");}finally{loading=false;}
 });
 $("recuperarClave").addEventListener("click",async()=>{const email=$("cuentaCorreo").value.trim();if(!email){msg("Escribe tu correo primero.");return;}const {error}=await client.auth.resetPasswordForEmail(email);msg(error?error.message:"Si el correo existe, recibirás instrucciones para recuperar tu contraseña.");});
 $("cuentaSalir").addEventListener("click",async()=>{await client.auth.signOut();location.reload();});
 // Sync on earned points and saved name, without storing passwords.
 const originalSumar=window.sumar;if(typeof originalSumar==="function")window.sumar=function(...args){const v=originalSumar(...args);void subir();return v;};
 const originalNombre=window.guardarNombre;if(typeof originalNombre==="function")window.guardarNombre=function(...args){const v=originalNombre(...args);void subir();return v;};
})();
