const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders } = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

// Crear orden (Requiere estar logueado)
router.post('/', protect, createOrder);

// Ver mis órdenes
router.get('/my-orders', protect, getMyOrders);

// --- ¡ESTA LÍNEA ES LA QUE FALTABA! ---
module.exports = router;