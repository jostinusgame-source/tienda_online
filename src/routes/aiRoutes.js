const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const storeController = require('../controllers/storeController');
const reviewController = require('../controllers/reviewController'); // Asegúrate que este archivo exista
const authMiddleware = require('../middleware/authMiddleware');

// --- PÚBLICAS ---
router.get('/', (req, res) => res.send('API Online'));
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/store/products', storeController.getProducts);
router.get('/products/:productId/reviews', reviewController.getProductReviews);

// --- PROTEGIDAS (Cliente) ---
router.post('/store/cart', authMiddleware.protect, storeController.addToCart);
router.get('/store/cart', authMiddleware.protect, storeController.getCart);
router.post('/store/checkout', authMiddleware.protect, storeController.checkout);
router.post('/reviews', authMiddleware.protect, reviewController.addReview);

// --- ADMIN (Ahora authController tiene estas funciones, así que no dará error) ---
router.get('/auth/users', authMiddleware.protect, authMiddleware.adminOnly, authController.getAllUsers);
router.delete('/auth/users/:id', authMiddleware.protect, authMiddleware.adminOnly, authController.deleteUser);
// router.post('/store/toggle-night-sale', authMiddleware.protect, authMiddleware.adminOnly, storeController.toggleNightSale);

module.exports = router;