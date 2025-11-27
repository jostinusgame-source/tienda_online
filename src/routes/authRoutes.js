const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { validateRegister, validateLogin, validateResetPassword } = require('../middleware/validations');

router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/verify', authController.verifyEmail);

// Nuevas rutas de recuperación
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', validateResetPassword, authController.resetPassword);

module.exports = router;