console.log("🔵 [DEBUG] Cargando archivo aiRoutes.js...");

const express = require('express');
const router = express.Router();

// Importar controlador
const { chatWithConcierge } = require('../controllers/aiController');

// Verificar si el controlador cargó bien
if (!chatWithConcierge) {
    console.error("🔴 [DEBUG] ¡CUIDADO! chatWithConcierge es undefined. Revisa aiController.js");
} else {
    console.log("🔵 [DEBUG] Controlador cargado correctamente.");
}

// Definir ruta
router.post('/chat', chatWithConcierge);

console.log("🔵 [DEBUG] Exportando router...");

// Exportación
module.exports = router;