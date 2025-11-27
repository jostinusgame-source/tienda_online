const express = require('express');
const router = express.Router();
const { chatWithConcierge } = require('../controllers/aiController');

// Ruta POST para enviar mensajes
router.post('/chat', chatWithConcierge);

module.exports = router;