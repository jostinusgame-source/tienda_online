const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { PhoneNumberUtil } = require('google-libphonenumber');
const phoneUtil = PhoneNumberUtil.getInstance();

// 1. VALIDACIONES ESTRICTAS
const NAME_REGEX = /^(?!.*\b([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)\b.*\b\1\b)(?!.*(.)\2)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,30})(\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,30}){1,2}$/;

// Regex estándar robusto (RFC 5322)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

// Lista negra de dominios temporales comunes (opcional, expandible)
const BLACKLIST_DOMAINS = ['tempmail.com', '10minutemail.com', 'yopmail.com'];

const register = async (req, res) => {
    const { name, email, password, phone } = req.body;

    // A. Validar Nombre
    if (!NAME_REGEX.test(name)) {
        return res.status(400).json({ message: 'Nombre inválido: Debe tener 2-3 palabras reales, sin repetir (Ej: Juan Perez).' });
    }

    // B. Validar Email Estricto
    if (!EMAIL_REGEX.test(email)) return res.status(400).json({ message: 'Formato de correo inválido.' });
    
    const domain = email.split('@')[1];
    if (BLACKLIST_DOMAINS.includes(domain) || !domain.includes('.')) {
        return res.status(400).json({ message: 'Dominio de correo no permitido o inexistente.' });
    }

    // C. Validar Teléfono Real
    try {
        const number = phoneUtil.parseAndKeepRawInput(phone);
        if (!phoneUtil.isValidNumber(number)) throw new Error();
    } catch (e) {
        return res.status(400).json({ message: 'El número no es válido para el país seleccionado.' });
    }

    // D. Validar Contraseña
    if (password.length < 8) return res.status(400).json({ message: 'Contraseña muy corta.' });

    try {
        // Verificar duplicados
        const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (exists.length > 0) return res.status(400).json({ message: 'Este correo ya está registrado.' });

        // Crear usuario
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        
        // Asignar rol (primer usuario es admin)
        const [total] = await pool.query('SELECT COUNT(*) as c FROM users');
        const role = total[0].c === 0 ? 'admin' : 'client';

        await pool.query(
            'INSERT INTO users (name, email, password, phone, role, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, hash, phone, role, true] // true para pruebas inmediatas
        );

        res.status(201).json({ message: 'Registro exitoso. Inicia sesión.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });

        const user = users[0];
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return res.status(401).json({ message: 'Contraseña incorrecta.' });

        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

        res.json({ 
            token, 
            user: { id: user.id, name: user.name, email: user.email, role: user.role } 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en login.' });
    }
};

module.exports = { register, login };