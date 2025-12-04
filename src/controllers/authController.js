const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { PhoneNumberUtil } = require('google-libphonenumber');
const phoneUtil = PhoneNumberUtil.getInstance();

// REGEX NOMBRES (2-3 palabras, sin repetir)
const NAME_REGEX = /^(?!.*\b([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)\b.*\b\1\b)(?!.*(.)\2)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,30})(\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,30}){1,2}$/;

// LISTA BLANCA DE DOMINIOS PERMITIDOS
const ALLOWED_DOMAINS = [
    'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'live.com', 'msn.com',
    'itc.edu.co', 'unal.edu.co', 'uniandes.edu.co' // Institucionales específicos
];

// Validar si es institucional genérico (.edu.co, .gov.co)
const isInstitutional = (domain) => domain.endsWith('.edu.co') || domain.endsWith('.gov.co') || domain.endsWith('.org');

const register = async (req, res) => {
    const { name, email, password, phone } = req.body;

    // 1. Validar Campos
    if (!name || !email || !password || !phone) return res.status(400).json({ message: 'Todos los campos son obligatorios.' });

    // 2. Validar Nombre
    if (!NAME_REGEX.test(name)) {
        return res.status(400).json({ message: 'Nombre inválido: Usa 2 o 3 palabras reales (Nombre y Apellido).' });
    }

    // 3. Validar Dominio de Correo
    const emailParts = email.split('@');
    if (emailParts.length !== 2) return res.status(400).json({ message: 'Formato de correo inválido.' });
    
    const domain = emailParts[1].toLowerCase();
    if (!ALLOWED_DOMAINS.includes(domain) && !isInstitutional(domain)) {
        return res.status(400).json({ message: `El dominio @${domain} no es válido. Usa un correo real (Gmail, Outlook, Institucional).` });
    }

    // 4. Validar Teléfono
    try {
        const number = phoneUtil.parseAndKeepRawInput(phone);
        if (!phoneUtil.isValidNumber(number)) throw new Error();
    } catch (e) {
        return res.status(400).json({ message: 'Número de celular inválido para el país.' });
    }

    try {
        // 5. Verificar Duplicados
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'Este correo ya está registrado.' });

        // 6. Crear Usuario
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        
        // Primer usuario es Admin
        const [total] = await pool.query('SELECT COUNT(*) as c FROM users');
        const role = total[0].c === 0 ? 'admin' : 'client';

        await pool.query(
            'INSERT INTO users (name, email, password, phone, role, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, hash, phone, role, true]
        );

        res.status(201).json({ message: 'Registro exitoso. Ya puedes iniciar sesión.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado. Regístrate primero.' });

        const user = users[0];

        // Bloqueo temporal
        if (user.lock_until && new Date() < new Date(user.lock_until)) {
            return res.status(403).json({ message: 'Cuenta bloqueada por seguridad. Intenta en 15 min.' });
        }

        const valid = await bcrypt.compare(password, user.password);
        
        if (!valid) {
            const attempts = (user.failed_attempts || 0) + 1;
            let lock = null;
            if (attempts >= 5) lock = new Date(Date.now() + 15 * 60000); // 15 min
            
            await pool.query('UPDATE users SET failed_attempts = ?, lock_until = ? WHERE id = ?', [attempts, lock, user.id]);
            return res.status(401).json({ message: `Contraseña incorrecta. Intentos: ${attempts}/5` });
        }

        // Éxito
        await pool.query('UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ?', [user.id]);
        
        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

        res.json({ 
            token, 
            user: { id: user.id, name: user.name, email: user.email, role: user.role } 
        });

    } catch (error) {
        res.status(500).json({ message: 'Error en login.' });
    }
};

// Funciones Admin
const getAllUsers = async (req, res) => {
    const [users] = await pool.query('SELECT id, name, email, role, created_at FROM users');
    res.json(users);
};
const deleteUser = async (req, res) => {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({message: 'Usuario eliminado'});
};

module.exports = { register, login, getAllUsers, deleteUser };