const { body, validationResult } = require('express-validator');

// --- LÓGICA DE VALIDACIÓN ---

// 1. Validar Nombre Completo (Reglas complejas)
const validateStrictName = (value) => {
    const words = value.trim().split(/\s+/);

    // Mínimo 2 palabras, máximo 3
    if (words.length < 2 || words.length > 3) {
        throw new Error('El nombre debe tener entre 2 y 3 palabras.');
    }

    // Verificar palabras repetidas (ej: "Dario Dario")
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    if (uniqueWords.size !== words.length) {
        throw new Error('No puedes repetir palabras en el nombre.');
    }

    // Regex para CADA PALABRA:
    // ^(?!.*(.).*\1) -> Asegura que ninguna letra se repita dentro de la palabra
    // [A-Za-z]{3,12} -> Solo letras (sin acentos), entre 3 y 12 caracteres
    const wordRegex = /^(?!.*(.).*\1)[A-Za-z]{3,12}$/;

    for (const word of words) {
        if (!wordRegex.test(word)) {
            // Analizar por qué falló para dar mejor mensaje
            if (word.length < 3 || word.length > 12) throw new Error(`La palabra "${word}" debe tener entre 3 y 12 letras.`);
            if (/[^A-Za-z]/.test(word)) throw new Error(`La palabra "${word}" tiene caracteres inválidos (números, acentos o símbolos).`);
            if (/(.).*\1/.test(word)) throw new Error(`La palabra "${word}" tiene letras repetidas.`);
            throw new Error(`La palabra "${word}" no es válida.`);
        }
    }
    return true;
};

// 2. Validar Password (Reglas complejas y secuencias)
const validateStrictPassword = (value) => {
    // Reglas básicas
    if (value.length < 8) throw new Error('La contraseña debe tener mínimo 8 caracteres.');
    if (value.length > 20) throw new Error('La contraseña no puede exceder 20 caracteres.');
    if (/\s/.test(value)) throw new Error('La contraseña no debe contener espacios.');
    if (!/[A-Z]/.test(value)) throw new Error('La contraseña necesita al menos una letra mayúscula.');
    if (!/[a-z]/.test(value)) throw new Error('La contraseña necesita al menos una letra minúscula.');
    if (!/\d/.test(value)) throw new Error('La contraseña debe contener al menos un número.');
    if (!/[@$!%*?&._-]/.test(value)) throw new Error('Debe incluir uno de los símbolos: @$!%*?&.-_#');

    // Validación: No letras repetidas consecutivas (ej: "LL", "aa")
    if (/(.)\1/.test(value)) {
        throw new Error('No se permiten caracteres repetidos de forma consecutiva (ej: "aa", "11").');
    }

    // Validación: No 3 números seguidos (ej: "123", "987")
    for (let i = 0; i < value.length - 2; i++) {
        const char1 = value.charCodeAt(i);
        const char2 = value.charCodeAt(i + 1);
        const char3 = value.charCodeAt(i + 2);

        // Si son números
        if (value[i] >= '0' && value[i] <= '9' &&
            value[i+1] >= '0' && value[i+1] <= '9' &&
            value[i+2] >= '0' && value[i+2] <= '9') {
                
            // Ascendente (123) o Descendente (321)
            if ((char1 + 1 === char2 && char2 + 1 === char3) || 
                (char1 - 1 === char2 && char2 - 1 === char3)) {
                throw new Error('No se permiten secuencias numéricas (ej: "123", "987").');
            }
        }
    }

    return true;
};

// --- MIDDLEWARES ---

const handleErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Devolvemos el primer error para mostrarlo limpio en el frontend
        return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }
    next();
};

exports.validateRegister = [
    body('name').custom(validateStrictName),
    body('email').custom((value) => {
        // Regex estricto de dominios
        const emailRegex = /^[A-Za-z0-9._%+-]{3,}@(gmail|outlook|hotmail|yahoo|proton|icloud|live)\.(com|co|net|org|me|edu|edu\.co)$/;
        if (!emailRegex.test(value)) {
            throw new Error('Email inválido o dominio no permitido (Solo gmail, outlook, etc).');
        }
        return true;
    }),
    body('password').custom(validateStrictPassword),
    handleErrors
];

exports.validateLogin = [
    body('email').isEmail().withMessage('Email inválido'),
    body('password').notEmpty().withMessage('Contraseña requerida'),
    handleErrors
];

// Validación para cambiar contraseña (recuperación)
exports.validateResetPassword = [
    body('newPassword').custom(validateStrictPassword),
    handleErrors
];