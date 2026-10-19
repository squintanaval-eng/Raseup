
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

const misiones = {
  reciclaje: {
    titulo: "♻️ Primer reciclaje",
    descripcion: "Fotografía un residuo correctamente separado en un recipiente de reciclaje.",
    puntos: 20
  },
  agua: {
    titulo: "💧 Aqua Reto",
    descripcion: "Muestra una acción visible para ahorrar agua, como un grifo cerrado mientras te cepillas los dientes.",
    puntos: 30
  },
  planta: {
    titulo: "🌱 Planta Futura",
    descripcion: "Fotografía una planta que estés cuidando, por ejemplo mientras la riegas.",
    puntos: 40
  }
};

let misionActual = null;
let verificandoMision = false;

const fotoMision = document.getElementById("fotoMision");
const vistaMision = document.getElementById("vistaMision");
const resultadoMision = document.getElementById("resultadoMision");

function fechaMision() {
  const fecha = new Date();
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, "0"),
    String(fecha.getDate()).padStart(2, "0")
  ].join("-");
}

function abrirMision(id) {
  if (!misiones[id] || verificandoMision) return;

  misionActual = id;
  const mision = misiones[id];

  document.getElementById("panelMision").hidden = false;
  document.getElementById("tituloMision").textContent = mision.titulo;
  document.getElementById("descripcionMision").textContent =
    mision.descripcion;

  fotoMision.value = "";
  vistaMision.hidden = true;
  resultadoMision.textContent = "";

  if (completados[id] === fechaMision()) {
    resultadoMision.textContent =
      "✅ Ya completaste esta misión hoy. ¡Vuelve mañana!";
  }

  document.getElementById("panelMision").scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

fotoMision.addEventListener("change", () => {
  const archivo = fotoMision.files[0];
  vistaMision.hidden = true;
  if (!archivo) return;

  if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)) {
    alert("Selecciona una imagen JPG, PNG o WebP.");
    fotoMision.value = "";
    return;
  }

  if (archivo.size > 4 * 1024 * 1024) {
    alert("La imagen debe pesar menos de 4 MB.");
    fotoMision.value = "";
    return;
  }

  const url = URL.createObjectURL(archivo);
  vistaMision.onload = () => URL.revokeObjectURL(url);
  vistaMision.src = url;
  vistaMision.hidden = false;
});

async function verificarMision() {
  if (verificandoMision || !misionActual) return;

  const id = misionActual;
  const mision = misiones[id];
  const archivo = fotoMision.files[0];

  if (completados[id] === fechaMision()) {
    resultadoMision.textContent =
      "Ya recibiste los puntos de esta misión hoy. 🌱";
    return;
  }

  if (!archivo) {
    resultadoMision.textContent = "📸 Primero sube una fotografía.";
    return;
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(archivo.type)
      || archivo.size > 4 * 1024 * 1024) {
    resultadoMision.textContent = "Imagen no válida o demasiado grande.";
    return;
  }

  verificandoMision = true;
  document.getElementById("botonVerificar").disabled = true;
  resultadoMision.textContent = "🤖 Gemini está revisando tu misión...";

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
        accion: "verificar_mision",
        mision: id,
        imagen,
        tipo: archivo.type
      })
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.error || "Error de verificación.");
    }

    resultadoMision.textContent = datos.mensaje ||
      "No se pudo determinar el resultado.";

    if (datos.aprobado === true) {
      if (completados[id] !== fechaMision()) {
        completados[id] = fechaMision();
        sumar(mision.puntos);
        resultadoMision.textContent +=
          "\n\n🎉 ¡Ganaste " + mision.puntos + " puntos!";
      }
    }

  } catch (error) {
    resultadoMision.textContent = "⚠️ " + error.message;
  } finally {
    verificandoMision = false;
    document.getElementById("botonVerificar").disabled = false;
  }
}

