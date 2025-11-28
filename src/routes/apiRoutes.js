const express = require('express');
const router = express.Router();

// Importar Sub-Rutas
const authRoutes = require('./authRoutes');
const productRoutes = require('./productRoutes'); // Rutas Admin de productos
const orderRoutes = require('./orderRoutes');
const aiRoutes = require('./aiRoutes');

// Importar Controladores Sueltos (Para rutas simples)
const storeController = require('../controllers/storeController');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware');

// 1. RUTAS DE AUTENTICACIÓN (/api/auth/...)
router.use('/auth', authRoutes);

// 2. RUTAS DE TIENDA PÚBLICA (/api/store/...)
router.get('/store/products', storeController.getProducts);
router.post('/store/order', authMiddleware.protect, storeController.createOrder);

// 3. RUTAS DE GESTIÓN DE PRODUCTOS (ADMIN) (/api/products/...)
router.use('/products', productRoutes);

// 4. RUTAS DE PEDIDOS USUARIO (/api/orders/...)
router.use('/orders', orderRoutes);

// 5. RUTAS DE IA (/api/ai/...)
router.use('/ai', aiRoutes);

// 6. RUTAS DE RESEÑAS (/api/...)
router.get('/products/:productId/reviews', reviewController.getProductReviews);
router.post('/reviews', authMiddleware.protect, reviewController.addReview);

module.exports = router;