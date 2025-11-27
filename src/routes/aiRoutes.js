const express = require('express');
const router = express.Router();

// 1. Importar el controlador
// (Verifica que la ruta '../controllers/aiController' sea correcta)
const { chatWithConcierge } = require('../controllers/aiController');

// 2. Definir la ruta
router.post('/chat', chatWithConcierge);

// 3. ¡IMPORTANTE! Exportar el router
// Si falta esta línea, el servidor falla con el error "got a Object"
module.exports = router;