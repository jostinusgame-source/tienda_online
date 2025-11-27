const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Inicializar Gemini
const genAI = process.env.GEMINI_API_KEY 
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) 
    : null;

exports.chatWithConcierge = async (req, res) => {
    try {
        const { message } = req.body;

        // Verificación de seguridad
        if (!genAI) {
            console.error("❌ ERROR: Falta GEMINI_API_KEY.");
            return res.status(500).json({ 
                reply: "Error de configuración: Falta la clave de API de Gemini." 
            });
        }

        // Configuración del modelo
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Prompt del sistema (Personalidad de Enzo)
        const prompt = `
            Eres Enzo, el concierge experto de SpeedCollect.
            Vendes autos a escala 1:18 de lujo (Ferrari, Porsche).
            Responde de forma breve, elegante y persuasiva.
            
            Cliente: "${message}"
            Respuesta:
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (error) {
        console.error("❌ Error Gemini:", error);
        res.status(500).json({ reply: "Lo siento, tuve un problema técnico." });
    }
};