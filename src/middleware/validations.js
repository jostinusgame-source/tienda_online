const { body, validationResult } = require('express-validator');

// Helper para manejar errores de validación
const handleErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Devolvemos el primer mensaje de error para mostrarlo limpio en el frontend
        return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }
    next();
};

// Validaciones de Registro de Usuario
exports.validateRegister = [
    body('name').trim().notEmpty().withMessage('El nombre es obligatorio'),
    body('email').isEmail().withMessage('El email no es válido'),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
    // body('phone') es opcional, pero si viene, podríamos validarlo aquí si quisiéramos
    handleErrors
];

// Validaciones de Login
exports.validateLogin = [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('La contraseña es obligatoria'),
    handleErrors
];

// Validaciones para Resetear Password (opcional)
exports.validateResetPassword = [
    body('newPassword').isLength({ min: 6 }).withMessage('La nueva contraseña es muy corta'),
    handleErrors
];

// Validaciones de Producto (¡ESTA ERA LA QUE FALTABA!)
// Sin esto, productRoutes.js falla porque intenta importar validateProduct y recibe undefined
exports.validateProduct = [
    body('name').notEmpty().withMessage('El nombre del producto es obligatorio'),
    body('price').isNumeric().withMessage('El precio debe ser un número válido'),
    body('stock').isInt({ min: 0 }).withMessage('El stock debe ser un número entero positivo'),
    body('description').optional().isString(),
    body('image_url').optional().isURL().withMessage('La URL de la imagen no es válida'),
    handleErrors
];