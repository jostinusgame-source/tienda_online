const express = require('express');
const router = express.Router();
const { register, login, verifyEmail, forgotPassword, resetPassword } = require('../controllers/authController');
const { validateRegister, validateLogin, validateResetPassword } = require('../middleware/validations');

router.post('/register', validateRegister, register);
router.post('/verify', verifyEmail); // Endpoint para verificar el código
router.post('/login', validateLogin, login);
router.post('/forgot-password', forgotPassword); // Solicitar código
router.post('/reset-password', validateResetPassword, resetPassword); // Enviar código y pass nueva

module.exports = router;