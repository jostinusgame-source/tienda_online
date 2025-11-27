const { body, validationResult } = require('express-validator');

// --- LÓGICA DE VALIDACIÓN ---

// 1. Validar Nombre Completo (Reglas ACTUALIZADAS)
const validateStrictName = (value) => {
    const words = value.trim().split(/\s+/);

    // Mínimo 2 palabras, máximo 4 (para nombres largos)
    if (words.length < 2 || words.length > 4) {
        throw new Error('El nombre debe tener entre 2 y 4 palabras.');
    }

    // Máximo de escritura (Longitud total)
    if (value.length > 50) {
        throw new Error('El nombre es demasiado largo (máximo 50 caracteres).');
    }

    // Validar cada palabra por separado
    for (const word of words) {
        // Longitud de palabra
        if (word.length < 3 || word.length > 15) {
            throw new Error(`La palabra "${word}" debe tener entre 3 y 15 letras.`);
        }

        // Solo letras (sin números ni símbolos)
        if (!/^[A-Za-zÁÉÍÓÚáéíóúñÑ]+$/.test(word)) {
            throw new Error(`La palabra "${word}" contiene caracteres inválidos.`);
        }

        // REGLA: No letras consecutivas iguales (ej: "AA", "ll" es excepción en español pero "nn" no)
        // Ajustamos para permitir "ll" y "rr" si quisieras, pero tu regla dice "no seguidas".
        // Regex para detectar cualquier letra repetida seguida: (a)a
        if (/(.)\1/.test(word.toLowerCase())) {
             // Excepción opcional: Permitir 'l' o 'r' doble si quisieras, pero seremos estrictos según tu petición
             throw new Error(`La palabra "${word}" tiene letras repetidas seguidas.`);
        }

        // REGLA: Máximo 3 veces la misma letra en una palabra (no seguidas)
        const charCount = {};
        for (const char of word.toLowerCase()) {
            charCount[char] = (charCount[char] || 0) + 1;
            if (charCount[char] > 3) {
                throw new Error(`La palabra "${word}" repite la letra "${char}" más de 3 veces.`);
            }
        }
    }
    return true;
};

// 2. Validar Teléfono (Formato Internacional)
const validatePhone = (value) => {
    // Regex para formato internacional: + (Código País) (Número)
    // Ejemplo: +573001234567
    // Acepta de 7 a 15 dígitos después del +
    const phoneRegex = /^\+(\d{1,4})(\d{7,15})$/;

    if (!phoneRegex.test(value)) {
        throw new Error('El teléfono debe incluir código de país y solo números (Ej: +573001234567).');
    }
    return true;
};

// 3. Validar Password (La misma estricta de antes)
const validateStrictPassword = (value) => {
    if (value.length < 8 || value.length > 20) throw new Error('Longitud entre 8 y 20 caracteres.');
    if (/\s/.test(value)) throw new Error('Sin espacios.');
    if (!/[A-Z]/.test(value)) throw new Error('Falta mayúscula.');
    if (!/[a-z]/.test(value)) throw new Error('Falta minúscula.');
    if (!/\d/.test(value)) throw new Error('Falta número.');
    if (!/[@$!%*?&._-]/.test(value)) throw new Error('Falta símbolo (@$!%*?&._-).');
    if (/(.)\1/.test(value)) throw new Error('No repitas caracteres seguidos.');
    
    // Secuencias numéricas
    for (let i = 0; i < value.length - 2; i++) {
        const c1 = value.charCodeAt(i), c2 = value.charCodeAt(i+1), c3 = value.charCodeAt(i+2);
        if (c1+1 === c2 && c2+1 === c3) throw new Error('No secuencias numéricas (123).');
    }
    return true;
};

const handleErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }
    next();
};

exports.validateRegister = [
    body('name').custom(validateStrictName),
    body('email').isEmail().withMessage('Email inválido'),
    body('phone').custom(validatePhone), // <--- NUEVA VALIDACIÓN
    body('password').custom(validateStrictPassword),
    handleErrors
];

exports.validateLogin = [
    body('email').isEmail(),
    body('password').notEmpty(),
    handleErrors
];

exports.validateResetPassword = [
    body('newPassword').custom(validateStrictPassword),
    handleErrors
];

// Exportar validadores de producto si los necesitas
exports.validateProduct = [
    body('name').notEmpty(),
    body('price').isNumeric(),
    handleErrors
];