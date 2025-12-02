const express = require('express');
const router = express.Router();

// Importar Controladores
const authController = require('../controllers/authController');
const storeController = require('../controllers/storeController');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// ==========================
// 1. RUTAS PÚBLICAS (Cualquiera puede verlas)
// ==========================
// Verificar estado de API
router.get('/', (req, res) => res.send('API funcionando correctamente 🚀'));

// Autenticación
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Tienda - Catálogo y Reseñas Públicas
router.get('/store/products', storeController.getProducts);
router.get('/products/:productId/reviews', reviewController.getProductReviews);

// ==========================
// 2. RUTAS PROTEGIDAS (Requieren Token/Login)
// ==========================
// Middleware de seguridad se aplica aquí: authMiddleware.protect

// Gestión del Carrito
router.post('/store/cart', authMiddleware.protect, storeController.addToCart); // Agregar item
router.get('/store/cart', authMiddleware.protect, storeController.getCart);    // Ver carrito
router.post('/store/checkout', authMiddleware.protect, storeController.checkout); // Pagar

// Publicar Reseña
router.post('/reviews', authMiddleware.protect, reviewController.addReview);

// ==========================
// 3. RUTAS DE ADMIN (Requieren Rol 'admin')
// ==========================
router.get('/auth/users', authMiddleware.protect, authMiddleware.adminOnly, authController.getAllUsers);
router.delete('/auth/users/:id', authMiddleware.protect, authMiddleware.adminOnly, authController.deleteUser);
router.post('/store/toggle-night-sale', authMiddleware.protect, authMiddleware.adminOnly, storeController.toggleNightSale);

module.exports = router;