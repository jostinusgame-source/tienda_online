const { body, validationResult } = require('express-validator');

const handleErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }
    next();
};

// --- VALIDACIÓN DE NOMBRE (MODO EXPERTO) ---
const validateStrictName = (value) => {
    const clean = value.trim();
    // 1. Palabras: Mínimo 1, Máximo 3
    const words = clean.split(/\s+/);
    if (words.length < 1 || words.length > 3) throw new Error('El nombre debe tener entre 1 y 3 palabras.');

    // 2. Palabras repetidas (Ej: "Juan Juan")
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    if (uniqueWords.size !== words.length) throw new Error('No repitas palabras en el nombre.');

    const forbidden = ['jeje', 'jojo', 'jaja', 'admin', 'test', 'usuario', 'null'];
    
    for (const word of words) {
        // 3. Caracteres permitidos (Solo letras y tildes)
        if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ]+$/.test(word)) throw new Error(`"${word}" contiene caracteres inválidos.`);
        
        // 4. Letras seguidas iguales (Ej: "Aanna", "Carllos" - permitimos ll/rr en español si se requiere, pero aquí estricto)
        // Regex: Detecta cualquier letra que se repita inmediatamente (ej: aa, ee)
        // Nota: Si quieres permitir "ll", ajusta el regex, pero pediste estricto.
        if (/(.)\1/.test(word.toLowerCase()) && !['l','r','c'].includes(word.toLowerCase().match(/(.)\1/)[1])) {
             throw new Error(`"${word}" tiene letras repetidas inválidas.`);
        }
        
        // 5. Palabras prohibidas
        if (forbidden.includes(word.toLowerCase())) throw new Error(`"${word}" no parece un nombre real.`);
    }
    return true;
};

// --- VALIDACIÓN DE PASSWORD (NIVEL BANCARIO) ---
const validateStrictPass = (value) => {
    if (value.length < 10) throw new Error('Mínimo 10 caracteres.');
    if (/\s/.test(value)) throw new Error('Sin espacios en blanco.');
    if (!/[A-Z]/.test(value)) throw new Error('Falta una mayúscula.');
    if (!/[a-z]/.test(value)) throw new Error('Falta una minúscula.');
    if (!/\d/.test(value)) throw new Error('Falta un número.');
    if (!/[!@#$%^&*()\-_=+?]/.test(value)) throw new Error('Falta un símbolo especial.');
    
    // No repetir 3 veces seguidas (ej: aaa)
    if (/(.)\1\1/.test(value)) throw new Error('Patrón inseguro (caracteres repetidos).');
    
    return true;
};

exports.validateRegister = [
    body('name').custom(validateStrictName),
    body('email').isEmail().withMessage('Email inválido'),
    body('password').custom(validateStrictPass),
    handleErrors
];

exports.validateLogin = [
    body('email').isEmail(),
    body('password').notEmpty(),
    handleErrors
];

exports.validateResetPassword = [
    body('newPassword').custom(validateStrictPass),
    handleErrors
];

// MANTENER ESTO PARA QUE EL CATÁLOGO NO FALLE
exports.validateProduct = [
    body('name').notEmpty(),
    body('price').isNumeric(),
    handleErrors
];