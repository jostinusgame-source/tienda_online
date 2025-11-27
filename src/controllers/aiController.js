const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Inicializar Gemini
// Si no hay key, no crasheamos la app, solo el chat fallará elegantemente
const genAI = process.env.GEMINI_API_KEY 
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) 
    : null;

exports.chatWithConcierge = async (req, res) => {
    try {
        const { message } = req.body;

        if (!genAI) {
            console.error("❌ Falta GEMINI_API_KEY en el .env o Render");
            return res.status(500).json({ reply: "Lo siento, mi sistema de comunicación está en mantenimiento. (Falta API Key)" });
        }

        // Usamos el modelo Flash 1.5 que es rápido y estable
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
            Eres Enzo, el consultor experto de SpeedCollect, una tienda de autos a escala 1:18 de lujo.
            
            Tus reglas:
            1. Eres elegante, sofisticado y experto en Ferrari, Porsche y Bugatti.
            2. Tu objetivo es vender. Destaca detalles técnicos (motor, pintura, interior).
            3. Respuestas cortas (máximo 3 oraciones).
            4. Si preguntan precio, di: "Es una pieza exclusiva, revisa el catálogo para la cotización actual".
            5. Nunca inventes autos que no sean deportivos o de lujo.
            6. Usa emojis con clase: 🏎️, ✨, 🏁.

            Cliente: "${message}"
            Enzo:
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        res.json({ reply: text });

    } catch (error) {
        console.error("❌ Error con Gemini:", error);
        res.status(500).json({ reply: "Mis disculpas, estoy atendiendo a otro cliente VIP. Intenta de nuevo en unos segundos." });
    }
};