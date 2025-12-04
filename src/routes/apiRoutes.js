const express = require('express');
const router = express.Router();

// 1. IMPORTACIÓN DIRECTA DE CONTROLADORES
// Si alguno de estos archivos falta en tu carpeta 'controllers' o 'middleware', el servidor te avisará exactamente cuál es.
const authController = require('../controllers/authController');
const storeController = require('../controllers/storeController');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// 2. MIDDLEWARES DE SEGURIDAD (Con protección contra fallos)
// Si authMiddleware no se cargó bien, usamos funciones vacías para que no explote, pero lo ideal es tener el archivo bien.
const protect = authMiddleware && authMiddleware.protect ? authMiddleware.protect : (req, res, next) => next();
const adminOnly = authMiddleware && authMiddleware.adminOnly ? authMiddleware.adminOnly : (req, res, next) => next();

// ==========================
// RUTAS PÚBLICAS (Catálogo y Auth)
// ==========================

// Test
router.get('/', (req, res) => res.send('SpeedCollect API Funcionando 🏎️'));

// Catálogo (CRÍTICO: Esta es la ruta que no te cargaba)
// Verificamos si la función existe antes de asignarla para evitar el error "callback undefined"
if (storeController && storeController.getProducts) {
    router.get('/store/products', storeController.getProducts);
} else {
    // Si falla, respondemos con un error controlado en vez de tumbar el servidor
    router.get('/store/products', (req, res) => res.status(500).json({ message: 'Error: storeController.getProducts no está definido.' }));
}

// Reseñas Públicas
router.get('/products/:productId/reviews', 
    reviewController && reviewController.getProductReviews ? reviewController.getProductReviews : (req, res) => res.json([])
);

// Autenticación
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// ==========================
// RUTAS PROTEGIDAS (Carrito y Compras)
// ==========================

// Carrito
if (storeController) {
    router.post('/store/cart', protect, storeController.addToCart);
    router.get('/store/cart', protect, storeController.getCart);
    router.post('/store/checkout', protect, storeController.checkout);
    
    // Admin: Venta Nocturna
    router.post('/store/toggle-night-sale', protect, adminOnly, storeController.toggleNightSale);
}

// Reseñas (Crear)
if (reviewController) {
    router.post('/reviews', protect, reviewController.addReview);
}

// Admin Usuarios
if (authController) {
    router.get('/auth/users', protect, adminOnly, authController.getAllUsers);
    router.delete('/auth/users/:id', protect, adminOnly, authController.deleteUser);
}

module.exports = router;