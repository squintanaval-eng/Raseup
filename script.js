
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


// ==========================================
// REUSEUP - PLANETA + ECOQUIZ
// ==========================================

// ---------- CONSEJOS ----------

const consejosPlaneta = [
  ["💧", "Cierra el grifo mientras te cepillas los dientes."],
  ["🌱", "Cuida las plantas y árboles de tu comunidad."],
  ["♻️", "Separa los residuos según las normas locales."],
  ["🔌", "Desconecta los aparatos que no necesites."],
  ["🛍️", "Lleva bolsas reutilizables a las tiendas."],
  ["🚲", "Camina o usa bicicleta cuando sea seguro."],
  ["🌳", "Protege las áreas verdes de tu ciudad."],
  ["🍎", "Evita desperdiciar alimentos."],
  ["📚", "Reutiliza el papel que todavía esté limpio."],
  ["🚿", "Toma duchas más cortas."],
  ["💡", "Apaga las luces que no estés usando."],
  ["🐝", "Protege a las abejas y otros polinizadores."],
  ["🌊", "Nunca arrojes basura al mar o los ríos."],
  ["🥤", "Utiliza botellas de agua reutilizables."],
  ["📦", "Reutiliza cajas de cartón."],
  ["🌻", "Aprende a cuidar una planta en casa."],
  ["🔋", "Lleva las pilas usadas a puntos autorizados."],
  ["🧹", "Participa en limpiezas con supervisión adulta."],
  ["🌎", "Comparte consejos ecológicos con tus amigos."],
  ["👕", "Dona la ropa que esté en buen estado."],
  ["🧴", "Prefiere productos con envases reutilizables."],
  ["🦋", "Respeta los hábitats de los animales."],
  ["🧊", "No dejes la refrigeradora abierta innecesariamente."],
  ["📱", "Repara tus dispositivos cuando sea posible."],
  ["🌿", "No arranques plantas de los parques."],
  ["🍌", "Aprovecha restos vegetales para hacer compost."],
  ["🚌", "Usa transporte público cuando sea posible."],
  ["🧽", "Limpia y cuida los objetos reutilizables."],
  ["🧃", "Reduce los productos de un solo uso."],
  ["💚", "¡Cada pequeña acción ayuda al planeta!"]
];

function mezclarEco(array) {
  const copia = [...array];

  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }

  return copia;
}

let bolsaConsejos = [];
let ultimoConsejo = -1;

function nuevaBolsaConsejos() {
  bolsaConsejos = mezclarEco(
    consejosPlaneta.map((_, i) => i)
  );

  if (
    bolsaConsejos.length > 1 &&
    bolsaConsejos[bolsaConsejos.length - 1] === ultimoConsejo
  ) {
    [bolsaConsejos[0], bolsaConsejos[bolsaConsejos.length - 1]] =
      [bolsaConsejos[bolsaConsejos.length - 1], bolsaConsejos[0]];
  }
}

function nuevoConsejo() {
  if (bolsaConsejos.length === 0) {
    nuevaBolsaConsejos();
  }

  const indice = bolsaConsejos.pop();
  ultimoConsejo = indice;

  const [emoji, texto] = consejosPlaneta[indice];

  document.getElementById("consejoEmoji").textContent = emoji;
  document.getElementById("consejoTexto").textContent = texto;

  const tarjeta = document.getElementById("tarjetaConsejo");
  tarjeta.classList.remove("eco-aparecer");
  void tarjeta.offsetWidth;
  tarjeta.classList.add("eco-aparecer");
}

// ---------- BANCO DE 50 PREGUNTAS ----------
// Formato: [emoji, pregunta, opciones, respuestaCorrecta]

const preguntasEco = [
  ["💧","¿Cómo puedes ahorrar agua?",["Dejando el grifo abierto","Cerrando el grifo","Lavando la calle"],1],
  ["♻️","¿Qué significa reciclar?",["Quemar basura","Transformar residuos en nuevos materiales","Tirar todo junto"],1],
  ["🌳","¿Qué absorben los árboles durante la fotosíntesis?",["Dióxido de carbono","Plástico","Humo sólido"],0],
  ["🌎","¿Cuál es nuestro planeta?",["Marte","Venus","Tierra"],2],
  ["🐝","¿Qué animal ayuda a polinizar flores?",["Abeja","Tiburón","Pingüino"],0],
  ["🔋","¿Dónde llevar pilas usadas?",["Al río","A un punto autorizado","Al jardín"],1],
  ["🌊","¿Qué contamina los océanos?",["Recoger basura","Residuos plásticos","Proteger playas"],1],
  ["💡","¿Qué ahorra electricidad?",["Apagar luces","Encender todas las luces","Dejar la TV prendida"],0],
  ["🚲","¿Qué transporte no produce emisiones directas al usarlo?",["Automóvil de gasolina","Motocicleta de gasolina","Bicicleta"],2],
  ["🌱","¿Qué necesitan las plantas para crecer?",["Solo plástico","Agua y luz adecuada","Basura"],1],
  ["🐢","¿Qué puede perjudicar a las tortugas marinas?",["Bolsas plásticas en el mar","Playas limpias","Agua limpia"],0],
  ["🍎","¿Qué reduce el desperdicio de comida?",["Comprar demasiado","Planificar porciones","Tirar sobras"],1],
  ["🛍️","¿Qué bolsa puedes reutilizar?",["Bolsa resistente reutilizable","Bolsa rota","Bolsa de un solo uso"],0],
  ["🌧️","¿De dónde viene la lluvia?",["De las estrellas","De las nubes","De las rocas"],1],
  ["☀️","¿Cuál es una energía renovable?",["Solar","Carbón","Petróleo"],0],
  ["🌬️","¿Qué aprovechan los aerogeneradores?",["Petróleo","Viento","Plástico"],1],
  ["🌲","¿Qué causa la deforestación?",["Plantar árboles","Proteger bosques","Eliminar bosques"],2],
  ["🐟","¿Qué necesitan los peces para vivir?",["Agua adecuada y oxígeno","Papel","Humo"],0],
  ["🧃","¿Cómo reducir envases desechables?",["Usando recipientes reutilizables","Comprando más envases","Tirándolos al suelo"],0],
  ["📄","¿Qué material puede reciclarse si está limpio y es aceptado localmente?",["Papel","Comida podrida","Pañuelo sucio"],0],
  ["🦋","¿Qué es biodiversidad?",["Solo árboles","Variedad de seres vivos","Solo animales domésticos"],1],
  ["🌡️","¿Qué gas contribuye al calentamiento global?",["Dióxido de carbono","Helio de globos","Neón"],0],
  ["🚿","¿Qué ducha suele ahorrar más agua?",["Una más corta","Una de dos horas","Una con el grifo abierto sin usar"],0],
  ["🍌","¿Qué se puede aprovechar en compost?",["Restos vegetales adecuados","Pilas","Vidrio roto"],0],
  ["🌻","¿Qué necesita una semilla para germinar?",["Condiciones adecuadas de agua y temperatura","Gasolina","Pintura"],0],
  ["🏞️","¿Qué debes hacer al visitar un parque?",["Dejar basura","Respetar plantas y animales","Romper ramas"],1],
  ["🧴","¿Qué es reutilizar?",["Usar un objeto nuevamente","Quemarlo","Enterrarlo siempre"],0],
  ["🌍","¿Qué capa nos protege de gran parte de la radiación UV?",["Capa de ozono","Capa de plástico","Capa de arena"],0],
  ["🦜","¿Por qué proteger hábitats?",["Para conservar especies","Para quitarles alimento","Para contaminarlos"],0],
  ["🚌","¿Qué puede reducir emisiones por pasajero?",["Compartir transporte público","Viajar siempre solo en auto","Mantener motores encendidos"],0],
  ["🔌","¿Qué debes hacer con un cargador que no usas?",["Desconectarlo cuando sea seguro","Mojarlo","Romperlo"],0],
  ["💚","¿Qué acción ayuda al ambiente?",["Recoger residuos con seguridad","Tirar basura","Desperdiciar agua"],0],
  ["🌾","¿Qué protege el suelo?",["Vegetación","Derrames de aceite","Basura"],0],
  ["🐬","¿Dónde viven los delfines marinos?",["En océanos","En desiertos","En volcanes"],0],
  ["📦","¿Qué puedes hacer con una caja en buen estado?",["Reutilizarla","Quemarla","Tirarla al río"],0],
  ["🪴","¿Qué es importante al regar plantas?",["Conocer sus necesidades","Regarlas sin parar","Usar detergente"],0],
  ["🌫️","¿Qué puede causar contaminación del aire?",["Humo de combustión","Plantar árboles","Caminar"],0],
  ["🧊","¿Qué ayuda a ahorrar energía en casa?",["Cerrar bien la refrigeradora","Dejarla abierta","Abrirla sin necesidad"],0],
  ["♻️","¿Todos los plásticos se reciclan igual?",["Sí, siempre","No, depende del tipo y sistema local","Todos se queman"],1],
  ["🐜","¿Qué hacen muchos insectos en los ecosistemas?",["Cumplen funciones importantes","No sirven para nada","Son todos iguales"],0],
  ["🌵","¿Qué plantas están adaptadas a ambientes secos?",["Cactus","Nenúfares","Algas marinas"],0],
  ["🌊","¿Qué puede afectar la vida marina?",["Contaminación del agua","Limpieza responsable","Protección de costas"],0],
  ["📱","¿Qué hacer con un celular viejo que no sirve?",["Llevarlo a reciclaje electrónico autorizado","Tirarlo al mar","Quemarlo"],0],
  ["🍃","¿Qué liberan muchas plantas durante la fotosíntesis?",["Oxígeno","Plástico","Gasolina"],0],
  ["🧹","¿Qué hacer si encuentras vidrio roto en un parque?",["Avisar a un adulto responsable","Recogerlo con las manos","Jugar con él"],0],
  ["🌎","¿Qué son los recursos naturales?",["Elementos que obtenemos de la naturaleza","Solo aparatos electrónicos","Solo edificios"],0],
  ["🥤","¿Qué opción reduce botellas desechables?",["Botella reutilizable","Comprar botellas nuevas siempre","Tirarlas en la calle"],0],
  ["🌤️","¿Qué fuente de energía aprovechan los paneles solares?",["Luz solar","Basura","Gasolina"],0],
  ["🐝","¿Por qué son importantes los polinizadores?",["Ayudan a reproducirse a muchas plantas","Fabrican plástico","Eliminan el agua"],0],
  ["🏆","¿Cuál es una buena manera de cuidar el planeta?",["Practicar hábitos sostenibles","Desperdiciar recursos","Contaminar ríos"],0]
];

// ---------- ESTADO ECOQUIZ ----------

const ECO_LIMITE_DIARIO = 50;
const ECO_PUNTOS_POR_ACIERTO = 10;

function fechaEco() {
  const hoy = new Date();

  return [
    hoy.getFullYear(),
    String(hoy.getMonth() + 1).padStart(2, "0"),
    String(hoy.getDate()).padStart(2, "0")
  ].join("-");
}

function cargarEstadoEco() {
  try {
    const guardado = JSON.parse(
      localStorage.getItem("reuseup_ec​​oquiz_v1") || "null"
    );

    if (guardado && guardado.fecha === fechaEco()) {
      return {
        fecha: fechaEco(),
        puntosHoy: Math.max(0, Math.min(50, Number(guardado.puntosHoy) || 0)),
        respondidas: Array.isArray(guardado.respondidas)
          ? guardado.respondidas.filter(i =>
              Number.isInteger(i) && i >= 0 && i < preguntasEco.length
            )
          : []
      };
    }
  } catch (error) {
    console.warn("No se pudo leer EcoQuiz:", error);
  }

  return {
    fecha: fechaEco(),
    puntosHoy: 0,
    respondidas: []
  };
}

let estadoEco = cargarEstadoEco();
let preguntaEcoActual = -1;
let respuestaEcoDada = false;

function guardarEstadoEco() {
  localStorage.setItem(
    "reuseup_ecoquiz_v1",
    JSON.stringify(estadoEco)
  );
}

function actualizarPuntosEco() {
  document.getElementById("ecoPuntosHoy").textContent =
    `⭐ ${estadoEco.puntosHoy} / ${ECO_LIMITE_DIARIO} puntos hoy`;

  document.getElementById("ecoBarra").style.width =
    `${estadoEco.puntosHoy / ECO_LIMITE_DIARIO * 100}%`;
}

function siguienteEcoPregunta() {
  if (estadoEco.fecha !== fechaEco()) {
    estadoEco = cargarEstadoEco();
  }

  const disponibles = preguntasEco
    .map((_, i) => i)
    .filter(i => !estadoEco.respondidas.includes(i));

  if (disponibles.length === 0) {
    document.getElementById("ecoPreguntaEmoji").textContent = "🏆";
    document.getElementById("ecoPreguntaTexto").textContent =
      "¡Completaste las 50 preguntas! Vuelve mañana.";
    document.getElementById("ecoContador").textContent =
      "¡Ronda completada!";
    document.getElementById("ecoOpciones").replaceChildren();
    document.getElementById("ecoSiguiente").disabled = true;
    return;
  }

  preguntaEcoActual =
    disponibles[Math.floor(Math.random() * disponibles.length)];

  respuestaEcoDada = false;

  const [emoji, pregunta, opciones] =
    preguntasEco[preguntaEcoActual];

  document.getElementById("ecoPreguntaEmoji").textContent = emoji;
  document.getElementById("ecoPreguntaTexto").textContent = pregunta;
  document.getElementById("ecoContador").textContent =
    `Pregunta ${estadoEco.respondidas.length + 1} de ${preguntasEco.length}`;

  document.getElementById("ecoResultado").textContent = "";
  document.getElementById("ecoSiguiente").disabled = true;

  const contenedor = document.getElementById("ecoOpciones");
  contenedor.replaceChildren();

  // Mezclar respuestas sin cambiar la correcta
  const indices = mezclarEco([0, 1, 2]);

  indices.forEach(indice => {
    const boton = document.createElement("button");
    boton.className = "eco-opcion";
    boton.textContent = opciones[indice];
    boton.onclick = () => responderEco(indice);
    contenedor.appendChild(boton);
  });

  const caja = document.getElementById("ecoPreguntaCaja");
  caja.classList.remove("eco-aparecer");
  void caja.offsetWidth;
  caja.classList.add("eco-aparecer");

  actualizarPuntosEco();
}

function responderEco(indice) {
  if (respuestaEcoDada || preguntaEcoActual < 0) return;

  respuestaEcoDada = true;

  const correcta = preguntasEco[preguntaEcoActual][3];
  const acierto = indice === correcta;

  estadoEco.respondidas.push(preguntaEcoActual);

  const botones = document.querySelectorAll("#ecoOpciones button");
  const opciones = preguntasEco[preguntaEcoActual][2];

  botones.forEach(boton => {
    boton.disabled = true;

    if (boton.textContent === opciones[correcta]) {
      boton.classList.add("eco-correcta");
    } else if (boton.textContent === opciones[indice] && !acierto) {
      boton.classList.add("eco-incorrecta");
    }
  });

  const resultado = document.getElementById("ecoResultado");

  if (acierto) {
    if (estadoEco.puntosHoy < ECO_LIMITE_DIARIO) {
      estadoEco.puntosHoy += ECO_PUNTOS_POR_ACIERTO;

      // Usa la función de puntos existente en ReuseUp.
      if (typeof sumar === "function") {
        sumar(ECO_PUNTOS_POR_ACIERTO);
      }

      resultado.textContent = "🎉 ¡Correcto! +10 puntos";
    } else {
      resultado.textContent =
        "🎉 ¡Correcto! Ya alcanzaste tus 50 puntos de hoy.";
    }
  } else {
    resultado.textContent =
      "💚 ¡Sigue aprendiendo! La respuesta correcta está en verde.";
  }

  guardarEstadoEco();
  actualizarPuntosEco();

  document.getElementById("ecoSiguiente").disabled = false;
}

// ---------- INICIAR ----------

if (document.getElementById("ecoPreguntaCaja")) {
  nuevoConsejo();
  siguienteEcoPregunta();
}
