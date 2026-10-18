
const clave = "reuseup-progreso-v1";

function cargar() {
  try {
    return JSON.parse(localStorage.getItem(clave)) || {};
  } catch {
    return {};
  }
}

const progreso = cargar();
let puntos = Number(progreso.puntos) || 0;
let completados = progreso.completados || {};
let personaje = progreso.personaje || "🍃";
let nombre = progreso.nombre || "Hojita";

function guardar() {
  localStorage.setItem(clave, JSON.stringify({
    puntos, completados, personaje, nombre
  }));
}

function actualizar() {
  document.getElementById("puntos").textContent = puntos;
  document.getElementById("puntosPerfil").textContent = puntos;
  document.getElementById("nivel").textContent =
    Math.floor(puntos / 100) + 1;
  document.getElementById("avatar").textContent = personaje;
  document.getElementById("nombreMostrado").textContent = nombre;
}

function mostrar(id) {
  document.querySelectorAll(".seccion").forEach(s => {
    s.classList.remove("activa");
  });
  document.getElementById(id).classList.add("activa");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function sumar(cantidad) {
  puntos += cantidad;
  guardar();
  actualizar();
}

function reto(id, recompensa) {
  const hoy = new Date().toLocaleDateString("en-CA");
  if (completados[id] === hoy) {
    alert("¡Ya completaste este reto hoy! 🌱");
    return;
  }
  if (!confirm("¿Completaste realmente esta misión?")) return;
  completados[id] = hoy;
  sumar(recompensa);
  alert("¡Misión completada! +" + recompensa + " puntos ⭐");
}

function cambiarAvatar(emoji) {
  personaje = emoji;
  guardar();
  actualizar();
}

function guardarNombre() {
  const valor = document.getElementById("nombre").value.trim();
  if (!valor) return alert("Escribe un nombre.");
  nombre = valor.slice(0, 20);
  guardar();
  actualizar();
}

const foto = document.getElementById("foto");
const vista = document.getElementById("vista");

foto.addEventListener("change", () => {
  const archivo = foto.files[0];
  if (!archivo) {
    vista.hidden = true;
    return;
  }
  if (!archivo.type.startsWith("image/")) {
    alert("Selecciona una imagen.");
    foto.value = "";
    return;
  }
  if (archivo.size > 4 * 1024 * 1024) {
    alert("La imagen debe pesar menos de 4 MB.");
    foto.value = "";
    return;
  }
  vista.src = URL.createObjectURL(archivo);
  vista.hidden = false;
  vista.onload = () => URL.revokeObjectURL(vista.src);
});

async function analizar() {
  const archivo = foto.files[0];
  const resultado = document.getElementById("resultado");
  const boton = document.getElementById("analizar");

  if (!archivo) {
    alert("Primero selecciona una foto 📸");
    return;
  }

  boton.disabled = true;
  resultado.textContent = "🌱 Analizando tu residuo...";

  try {
    const imagen = await new Promise((resolve, reject) => {
      const lector = new FileReader();
      lector.onload = () => resolve(lector.result.split(",")[1]);
      lector.onerror = reject;
      lector.readAsDataURL(archivo);
    });

    const respuesta = await fetch("/api/analizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imagen,
        tipo: archivo.type
      })
    });

    const datos = await respuesta.json();
    if (!respuesta.ok) {
      throw new Error(datos.error || "Error al analizar.");
    }

    resultado.textContent = datos.resultado;

  } catch (error) {
    resultado.textContent = "⚠️ " + error.message;
  } finally {
    boton.disabled = false;
  }
}

actualizar();

