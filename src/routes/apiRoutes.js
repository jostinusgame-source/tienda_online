const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const storeController = require('../controllers/storeController');

// Auth
router.post('/auth/register', authController.initiateRegister);
router.post('/auth/verify', authController.verifyAndRegister);
router.post('/auth/login', authController.login);
router.get('/auth/users', authController.getAllUsers);     // Admin
router.delete('/auth/users/:id', authController.deleteUser); // Admin

// Tienda
router.get('/products', storeController.getProducts);
router.post('/orders', storeController.createOrder); // Pagar y bajar stock
router.post('/reviews', storeController.addReview);  // Comentar

// Chat IA (Si tienes el controlador)
// router.post('/ai/chat', aiController.chat);

module.exports = router;