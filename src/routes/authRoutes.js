const express = require('express');
const router = express.Router();
const { initiateRegister, verifyAndRegister, login } = require('../controllers/authController');

router.post('/register', initiateRegister); // Paso 1
router.post('/verify', verifyAndRegister);  // Paso 2
router.post('/login', login);

module.exports = router;