const express = require('express');
const router = express.Router();
// Importamos el controlador (Asegúrate de que este archivo también exista, ver paso 2)
const { chatWithConcierge } = require('../controllers/aiController');

// Ruta POST para recibir mensajes del chat
router.post('/chat', chatWithConcierge);

module.exports = router;