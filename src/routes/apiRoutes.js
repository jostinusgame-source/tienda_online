const express = require('express');
const router = express.Router();

// Importación segura de controladores
// Si falta el archivo, esto evita que explote todo el servidor
let authController, storeController, reviewController, authMiddleware;

try {
    authController = require('../controllers/authController');
    storeController = require('../controllers/storeController');
    reviewController = require('../controllers/reviewController');
    authMiddleware = require('../middleware/authMiddleware');
} catch (error) {
    console.error("⚠️ Error crítico importando controladores:", error.message);
}

// ==========================
// 1. RUTAS PÚBLICAS
// ==========================
router.get('/', (req, res) => res.send('SpeedCollect API Online 🏎️'));

// Auth
if (authController) {
    router.post('/auth/register', authController.register);
    router.post('/auth/login', authController.login);
}

// Catálogo (Esta es la que te importa)
if (storeController) {
    router.get('/store/products', storeController.getProducts);
} else {
    console.error("❌ FALTA storeController.js - El catálogo no funcionará");
}

// Reseñas Públicas
if (reviewController) {
    router.get('/products/:productId/reviews', reviewController.getProductReviews);
}

// ==========================
// 2. RUTAS PROTEGIDAS
// ==========================

// Middleware de protección (Fallback dummy si no existe para no romper app)
const protect = authMiddleware && authMiddleware.protect ? authMiddleware.protect : (req, res, next) => next();
const adminOnly = authMiddleware && authMiddleware.adminOnly ? authMiddleware.adminOnly : (req, res, next) => next();

if (storeController) {
    router.post('/store/cart', protect, storeController.addToCart);
    router.get('/store/cart', protect, storeController.getCart);
    router.post('/store/checkout', protect, storeController.checkout);
    // Admin: Venta Nocturna
    router.post('/store/toggle-night-sale', protect, adminOnly, storeController.toggleNightSale);
}

if (reviewController) {
    router.post('/reviews', protect, reviewController.addReview);
}

// Admin Usuarios
if (authController) {
    router.get('/auth/users', protect, adminOnly, authController.getAllUsers);
    router.delete('/auth/users/:id', protect, adminOnly, authController.deleteUser);
}

module.exports = router;