const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const storeController = require('../controllers/storeController');
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middleware/authMiddleware'); 

// PÚBLICAS
router.get('/', (req, res) => res.send('API Online'));
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/store/products', storeController.getProducts); // CATÁLOGO ARREGLADO
router.get('/products/:productId/reviews', reviewController.getProductReviews);

// PROTEGIDAS
const protect = authMiddleware.protect; 
const admin = authMiddleware.adminOnly;

router.post('/store/cart', protect, storeController.addToCart);
router.get('/store/cart', protect, storeController.getCart);
router.post('/store/checkout', protect, storeController.checkout);
router.post('/reviews', protect, reviewController.addReview);

// Admin
router.get('/auth/users', protect, admin, authController.getAllUsers);
router.delete('/auth/users/:id', protect, admin, authController.deleteUser);
router.post('/store/toggle-night-sale', protect, admin, storeController.toggleNightSale);

module.exports = router;