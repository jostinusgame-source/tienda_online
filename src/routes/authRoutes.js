const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Rutas Públicas
router.post('/register', authController.register); // Registro directo
router.post('/login', authController.login);

// Rutas Privadas (Admin)
router.get('/users', protect, adminOnly, authController.getAllUsers);
router.delete('/users/:id', protect, adminOnly, authController.deleteUser);

module.exports = router;