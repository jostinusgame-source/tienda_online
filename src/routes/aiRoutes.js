const express = require('express');
const router = express.Router();
// Importamos el controlador desde la carpeta superior
const { chatWithConcierge } = require('../controllers/aiController');

// Definir la ruta POST para el chat
router.post('/chat', chatWithConcierge);

// ¡ESTA LÍNEA ES VITAL! Sin esto, sale el error "got a Object"
module.exports = router;