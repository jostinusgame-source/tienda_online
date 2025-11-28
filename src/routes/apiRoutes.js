const express = require('express');
const router = express.Router();

// Importar Controladores
const authController = require('../controllers/authController');
const storeController = require('../controllers/storeController');
const reviewController = require('../controllers/reviewController');
const { chatWithConcierge } = require('../controllers/aiController');
const authMiddleware = require('../middleware/authMiddleware');

// ==========================
// 1. RUTAS DE TIENDA (Públicas) - ESTAS ERAN LAS QUE FALLABAN
// ==========================
router.get('/store/products', storeController.getProducts); // Esta carga el catálogo
router.get('/products/:productId/reviews', reviewController.getProductReviews); // Esta carga reseñas

// ==========================
// 2. RUTAS DE AUTH (Públicas)
// ==========================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// ==========================
// 3. RUTAS PROTEGIDAS (Requieren Login)
// ==========================
// Comprar
router.post('/store/order', authMiddleware.protect, storeController.createOrder);
// Publicar Reseña
router.post('/reviews', authMiddleware.protect, reviewController.addReview);
// Chat IA
router.post('/ai/chat', chatWithConcierge);

// Admin (Opcional)
router.get('/auth/users', authMiddleware.protect, authMiddleware.adminOnly, authController.getAllUsers);
router.delete('/auth/users/:id', authMiddleware.protect, authMiddleware.adminOnly, authController.deleteUser);

module.exports = router;