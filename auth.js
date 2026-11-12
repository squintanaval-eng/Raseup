// ReuseUp cloud accounts. Supabase handles passwords and session tokens.
(async function () {
  const el = id => document.getElementById(id);
  const config = window.REUSEUP_SUPABASE || {};
  const say = text => { el("cuentaMensaje").textContent = text; };
  if (!config.url || !config.anonKey || !window.supabase) {
    say("La conexión con Supabase aún no está disponible."); return;
  }
  const client = window.supabase.createClient(config.url, config.anonKey);
  let current = null;
  let busy = false;
  let syncing = Promise.resolve();
  const initialLocal = window.reuseupLeerProgreso();
  function queueSync() {
    if (!current) return;
    const userId = current.id;
    const value = window.reuseupLeerProgreso();
    syncing = syncing.then(async () => {
      if (current?.id !== userId) return;
      const { error } = await client.from("user_progress").update({
        puntos: value.puntos,
        completados: value.completados,
        personaje: value.personaje,
        nombre: value.nombre,
        updated_at: new Date().toISOString()
      }).eq("user_id", userId);
      if (error) say("No se pudo sincronizar: " + error.message);
    }).catch(error => say("Error de sincronización: " + error.message));
  }
  async function loadCloud(user) {
    const { data, error } = await client.from("user_progress")
      .select("puntos,completados,personaje,nombre")
      .eq("user_id", user.id).maybeSingle();
    if (error) { say("No se pudo cargar el progreso: " + error.message); return; }
    if (!data) {
      const initial = {
        user_id: user.id, puntos: 0, completados: {}, personaje: "🍃",
        nombre: String(user.user_metadata?.display_name || "Hojita").slice(0,20)
      };
      const { data: created, error: createError } = await client.from("user_progress")
        .upsert(initial, { onConflict: "user_id", ignoreDuplicates: true })
        .select("puntos,completados,personaje,nombre").single();
      if (createError) { say("No se pudo crear el perfil: " + createError.message); return; }
      window.reuseupAplicarProgreso(created);
    } else window.reuseupAplicarProgreso(data);
    if (typeof window.actualizarRankingReuseup === "function") window.actualizarRankingReuseup();
    say("Tu progreso se guardará en tu cuenta.");
  }
  async function setUser(user) {
    current = user;
    el("cuentaInvitado").hidden = !!user;
    el("cuentaConectada").hidden = !user;
    el("cuentaEstado").textContent = user ? "Conectado: " + user.email : "Modo invitado · progreso local";
    if (user) {
      el("cuentaSaludo").textContent = "Conectado como " + user.email;
      await loadCloud(user);
    }
  }
  const { data: { session }, error: sessionError } = await client.auth.getSession();
  if (sessionError) say(sessionError.message);
  await setUser(session?.user || null);
  client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_IN" && session?.user && session.user.id !== current?.id) {
      void setUser(session.user);
    }
    if (event === "SIGNED_OUT") {
      current = null;
      localStorage.removeItem("reuseup-progreso-v1");
      location.reload();
    }
  });
  let action = "entrar";
  el("cuentaFormulario").querySelectorAll("button[data-accion]").forEach(button => {
    button.addEventListener("click", () => { action = button.dataset.accion; });
  });
  el("cuentaFormulario").addEventListener("submit", async event => {
    event.preventDefault();
    if (busy) return;
    busy = true;
    const email = el("cuentaCorreo").value.trim();
    const password = el("cuentaClave").value;
    try {
      if (action === "registro") {
        const displayName = el("cuentaNombre").value.trim();
        if (displayName.length < 2) { say("Elige un nombre de al menos dos caracteres."); return; }
        const { data, error } = await client.auth.signUp({
          email, password, options: { data: { display_name: displayName.slice(0, 20) } }
        });
        if (error) throw error;
        say(data.session ? "Cuenta creada correctamente." : "Revisa tu correo para confirmar tu cuenta.");
      } else {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        say("Sesión iniciada correctamente.");
      }
    } catch (error) { say(error.message || "No se pudo completar la solicitud."); }
    finally { busy = false; el("cuentaClave").value = ""; }
  });
  el("recuperarClave").addEventListener("click", async () => {
    const email = el("cuentaCorreo").value.trim();
    if (!email) { say("Primero escribe tu correo."); return; }
    const { error } = await client.auth.resetPasswordForEmail(email);
    say(error ? error.message : "Si ese correo tiene una cuenta, recibirás instrucciones.");
  });
  el("cuentaSalir").addEventListener("click", async () => {
    await syncing;
    const { error } = await client.auth.signOut();
    if (error) say(error.message);
  });
  const originalSumar = window.sumar;
  if (typeof originalSumar === "function") window.sumar = function (...args) {
    const output = originalSumar(...args); queueSync(); return output;
  };
  const originalGuardarNombre = window.guardarNombre;
  if (typeof originalGuardarNombre === "function") window.guardarNombre = function (...args) {
    const output = originalGuardarNombre(...args); queueSync(); return output;
  };
  const originalAvatar = window.cambiarAvatar;
  if (typeof originalAvatar === "function") window.cambiarAvatar = function (...args) {
    const output = originalAvatar(...args); queueSync(); return output;
  };
})();
