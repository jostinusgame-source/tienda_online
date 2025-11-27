const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

// Inicializar el cliente de Gemini
const genAI = process.env.GEMINI_API_KEY 
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) 
    : null;

exports.chatWithConcierge = async (req, res) => {
    try {
        const { message } = req.body;

        // 1. Verificación de Seguridad
        if (!genAI) {
            console.error("❌ ERROR CRÍTICO: No se encontró GEMINI_API_KEY en las variables de entorno.");
            return res.status(500).json({ 
                reply: "Lo siento, mi sistema de comunicación con Maranello no responde. (Error: Falta API Key)" 
            });
        }

        // 2. Configuración del Modelo
        // Usamos 'gemini-1.5-flash' porque es el estándar actual de la API.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 3. Personalidad del Agente
        const prompt = `
            Actúa como "Enzo", el consultor experto y concierge de la tienda exclusiva "SpeedCollect Official Dealer".
            
            Tus instrucciones de comportamiento:
            1. Eres sofisticado, elegante y un experto absoluto en ingeniería automotriz (especialmente Ferrari, Porsche, Bugatti y clásicos).
            2. Tu objetivo es vender modelos a escala 1:18 destacando su exclusividad, acabados a mano y detalles técnicos.
            3. Tus respuestas deben ser breves, persuasivas y elegantes (máximo 3 oraciones).
            4. Si te preguntan precios específicos, responde: "Es una pieza exclusiva, por favor revisa nuestro catálogo en vivo para la cotización actual".
            5. Nunca inventes modelos que no existen.
            6. Usa emojis con clase y moderación: 🏎️, 🏁, ✨, 🇮🇹.

            Cliente dice: "${message}"
            Respuesta de Enzo:
        `;

        // 4. Generar la respuesta
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 5. Enviar respuesta
        res.json({ reply: text });

    } catch (error) {
        console.error("❌ Error de comunicación con Gemini:", error);
        res.status(500).json({ 
            reply: "Mis disculpas, estoy supervisando una entrega especial. Por favor, intenta preguntarme de nuevo en un momento." 
        });
    }
};