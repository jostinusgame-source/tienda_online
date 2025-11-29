const express = require('express');
const router = express.Router();

// Controladores
const authController = require('../controllers/authController');
const storeController = require('../controllers/storeController');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// ==========================
// RUTAS PÚBLICAS
// ==========================
router.get('/store/products', storeController.getProducts); 
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/products/:productId/reviews', reviewController.getProductReviews);

// ==========================
// RUTAS PROTEGIDAS (Requieren Token)
// ==========================

// 1. Carrito y Compras (NUEVO)
router.post('/store/cart', authMiddleware.protect, storeController.addToCart); // Agregar/Reservar
router.get('/store/cart', authMiddleware.protect, storeController.getCart);    // Ver Carrito
router.post('/store/checkout', authMiddleware.protect, storeController.checkout); // Pagar

// 2. Reseñas
router.post('/reviews', authMiddleware.protect, reviewController.addReview);

// 3. Admin
router.get('/auth/users', authMiddleware.protect, authMiddleware.adminOnly, authController.getAllUsers);
router.delete('/auth/users/:id', authMiddleware.protect, authMiddleware.adminOnly, authController.deleteUser);

module.exports = router;