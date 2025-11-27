const { body, validationResult } = require('express-validator');

const handleErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }
    next();
};

// Validador de Email
const validateEmail = (value) => {
    // Regex simple pero efectivo
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        throw new Error('Formato de correo inválido');
    }
    return true;
};

exports.validateRegister = [
    body('name').trim().notEmpty().withMessage('Nombre obligatorio'),
    body('email').custom(validateEmail),
    body('password').isLength({ min: 6 }).withMessage('Contraseña débil'),
    handleErrors
];

exports.validateLogin = [
    body('email').isEmail(),
    body('password').notEmpty(),
    handleErrors
];

exports.validateResetPassword = [
    body('newPassword').isLength({ min: 6 }),
    handleErrors
];

// CRUCIAL: Esto debe exportarse para que el catálogo funcione
exports.validateProduct = [
    body('name').notEmpty(),
    body('price').isNumeric(),
    handleErrors
];