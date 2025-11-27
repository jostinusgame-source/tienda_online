const express = require('express');
const router = express.Router();

// Importamos TODAS las funciones del controlador
const { 
    register, 
    login, 
    verifyEmail, 
    forgotPassword, 
    resetPassword 
} = require('../controllers/authController');

// Importamos las validaciones
const { 
    validateRegister, 
    validateLogin,
    validateResetPassword
} = require('../middleware/validations');

// --- Definir Rutas ---

// 1. Registro
router.post('/register', validateRegister, register);

// 2. Login
router.post('/login', validateLogin, login);

// 3. Verificación
router.post('/verify', verifyEmail);

// 4. Recuperación
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', validateResetPassword, resetPassword);

module.exports = router;