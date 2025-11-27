const { body, validationResult } = require('express-validator');

// --- HELPER PARA MANEJAR ERRORES ---
// Si hay errores, detiene la petición y responde al frontend
const handleErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Devolvemos solo el primer error para mantener la interfaz limpia
        return res.status(400).json({ 
            message: errors.array()[0].msg, 
            errors: errors.array() 
        });
    }
    next();
};

// --- LÓGICA DE VALIDACIÓN PERSONALIZADA ---

// Reglas para Nombres Reales
const validateStrictName = (value) => {
    if (!value) throw new Error('El nombre es obligatorio.');
    
    // Eliminar espacios extra
    const cleanValue = value.trim();
    const words = cleanValue.split(/\s+/);

    // 1. Debe tener al menos nombre y apellido (2 palabras)
    if (words.length < 2) {
        throw new Error('Por favor ingresa tu nombre y apellido.');
    }

    // 2. Verificar longitud de cada palabra
    for (const word of words) {
        if (word.length < 2) {
            throw new Error(`La parte "${word}" es muy corta.`);
        }
        // Solo letras (incluye tildes y ñ)
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+$/.test(word)) {
            throw new Error(`"${word}" contiene caracteres inválidos (solo letras).`);
        }
    }
    
    // 3. Evitar repetición excesiva de caracteres (ej: "Juaaan")
    // Detecta si un carácter se repite 3 veces seguidas
    const regexRepetidas = /(.)\1\1/; 
    if (regexRepetidas.test(cleanValue)) {
        throw new Error('El nombre tiene demasiadas letras repetidas consecutivas.');
    }
    
    return true;
};

// --- EXPORTACIÓN DE VALIDADORES ---

// 1. Registro de Usuario
exports.validateRegister = [
    body('name').custom(validateStrictName),
    body('email').isEmail().withMessage('El correo electrónico no es válido'),
    body('password').isStrongPassword({
        minLength: 8,
        minLowercase: 1,
        minUppercase: 1,
        minNumbers: 1,
        minSymbols: 1
    }).withMessage('La contraseña debe tener: 8 caracteres, 1 mayúscula, 1 número y 1 símbolo.'),
    // El teléfono se valida opcionalmente o se confía en el frontend (intl-tel-input)
    handleErrors
];

// 2. Inicio de Sesión
exports.validateLogin = [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Ingresa tu contraseña'),
    handleErrors
];

// 3. Recuperación de Contraseña
exports.validateResetPassword = [
    body('newPassword').isLength({ min: 8 }).withMessage('La nueva contraseña es muy corta'),
    handleErrors
];

// 4. Gestión de Productos (¡CRUCIAL PARA EL CATÁLOGO!)
// Si esta exportación falta, las rutas de productos fallan y la página no carga.
exports.validateProduct = [
    body('name').notEmpty().withMessage('El nombre del producto es obligatorio'),
    body('price').isFloat({ min: 0.01 }).withMessage('El precio debe ser mayor a 0'),
    body('stock').isInt({ min: 0 }).withMessage('El stock debe ser un número entero positivo'),
    body('description').optional().isString(),
    // Validación opcional de URL de imagen
    body('image_url').optional().isString(), 
    handleErrors
];