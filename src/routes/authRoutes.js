const express = require('express');
const router = express.Router();
const { initiateRegister, verifyAndRegister, login, getAllUsers, deleteUser } = require('../controllers/authController');

// Simulación de middleware para este ejemplo (En producción usa uno real)
const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization'];
    if(!token) return res.status(403).json({message: 'No token'});
    next();
};

router.post('/register', initiateRegister);
router.post('/verify', verifyAndRegister);
router.post('/login', login);
router.get('/users', authMiddleware, getAllUsers);
router.delete('/users/:id', authMiddleware, deleteUser);

module.exports = router;