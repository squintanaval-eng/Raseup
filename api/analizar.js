
module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido"
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: "Falta configurar Gemini en Vercel."
    });
  }

  const { imagen, tipo } = req.body || {};
  const permitidos = ["image/jpeg", "image/png", "image/webp"];

  if (!imagen || !permitidos.includes(tipo)) {
    return res.status(400).json({
      error: "Usa una imagen JPG, PNG o WebP."
    });
  }

  if (imagen.length > 6 * 1024 * 1024) {
    return res.status(413).json({
      error: "La imagen es demasiado grande."
    });
  }

  try {
    const respuesta = await fetch(
   
"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent",

      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                text: `Eres ReuseUp, un asistente ecológico
                para estudiantes de primaria en Perú.
                Analiza esta fotografía.

                Indica:
                1. Qué residuo aparece.
                2. De qué material está hecho.
                3. Cómo separarlo correctamente.
                4. Cómo reutilizarlo o reciclarlo.
                5. Un consejo ambiental.

                Si no puedes identificarlo, dilo.
                No inventes información.
                No asegures que un material es aceptado
                por un reciclador local sin comprobarlo.
                Responde en español, de forma breve
                y amigable, usando algunos emojis.`
              },
              {
                inline_data: {
                  mime_type: tipo,
                  data: imagen
                }
              }
            ]
          }]
        })
      }
    );

    const datos = await respuesta.json();


if (!respuesta.ok) {
  console.error("Error de Gemini:", {
    codigo: respuesta.status,
    tipo: datos.error?.status,
    mensaje: datos.error?.message
  });

  return res.status(502).json({
    error: "Error de Gemini (HTTP " +
      respuesta.status + "): " +
      (datos.error?.status || "DESCONOCIDO")
  });
}

    const texto = datos.candidates?.[0]?.content?.parts
      ?.map(p => p.text || "").join("\n");

    if (!texto) {
      return res.status(502).json({
        error: "No se obtuvo una respuesta de Gemini."
      });
    }

    return res.status(200).json({
      resultado: texto
    });

  } catch (error) {
    return res.status(500).json({
      error: "No se pudo conectar con Gemini."
    });
  }
};

