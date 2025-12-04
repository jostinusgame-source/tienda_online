const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { PhoneNumberUtil } = require('google-libphonenumber');
const phoneUtil = PhoneNumberUtil.getInstance();

// REGEX NOMBRE: 2-3 palabras, sin repetir
const NAME_REGEX = /^(?!.*\b([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)\b.*\b\1\b)(?!.*(.)\2)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,30})(\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,30}){1,2}$/;

// DOMINIOS PERMITIDOS
const ALLOWED_DOMAINS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'icloud.com', 'itc.edu.co'];

const register = async (req, res) => {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) return res.status(400).json({ message: 'Todos los campos son obligatorios.' });

    // 1. NOMBRE
    if (!NAME_REGEX.test(name)) return res.status(400).json({ message: 'Nombre inválido: Usa 2 o 3 palabras reales.' });

    // 2. EMAIL (Mínimo 3 letras antes del @ + Dominio Válido)
    const emailParts = email.split('@');
    if (emailParts.length !== 2) return res.status(400).json({ message: 'Email inválido.' });
    
    const localPart = emailParts[0];
    const domain = emailParts[1].toLowerCase();

    if (localPart.length < 3) {
        return res.status(400).json({ message: 'El correo debe tener al menos 3 letras antes del @.' });
    }

    const isInstitutional = domain.endsWith('.edu.co') || domain.endsWith('.gov.co');
    if (!ALLOWED_DOMAINS.includes(domain) && !isInstitutional) {
        return res.status(400).json({ message: `Dominio @${domain} no permitido. Usa Gmail, Outlook o Institucional.` });
    }

    // 3. TELÉFONO
    try {
        const number = phoneUtil.parseAndKeepRawInput(phone);
        if (!phoneUtil.isValidNumber(number)) throw new Error();
    } catch (e) { return res.status(400).json({ message: 'Número inválido para el país.' }); }

    // 4. PASSWORD
    if (password.length < 8) return res.status(400).json({ message: 'Contraseña insegura (min 8 chars).' });

    try {
        const [exists] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (exists.length > 0) return res.status(400).json({ message: 'Este correo ya está registrado.' });

        const hash = await bcrypt.hash(password, 10);
        const [total] = await pool.query('SELECT COUNT(*) as c FROM users');
        const role = total[0].c === 0 ? 'admin' : 'client';

        await pool.query('INSERT INTO users (name, email, password, phone, role, is_verified) VALUES (?,?,?,?,?,?)', 
            [name, email, hash, phone, role, true]);

        res.status(201).json({ message: 'Registro exitoso. Inicia sesión.' });
    } catch (e) { res.status(500).json({ message: 'Error servidor' }); }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        // AQUÍ ESTÁ LA CORRECCIÓN DEL LOGIN
        if (users.length === 0) {
            return res.status(404).json({ message: 'Este correo no está registrado. Crea una cuenta.' });
        }

        const user = users[0];
        const valid = await bcrypt.compare(password, user.password);
        
        if (!valid) return res.status(401).json({ message: 'Contraseña incorrecta.' });

        const token = jwt.sign({ id: user.id, role: user.role, email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, role: user.role, email } });

    } catch (e) { res.status(500).json({ message: 'Error en login.' }); }
};

// Admin
const getAllUsers = async (req, res) => {
    const [u] = await pool.query('SELECT id, name, email, role FROM users');
    res.json(u);
};
const deleteUser = async (req, res) => {
    await pool.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({message:'Borrado'});
};

module.exports = { register, login, getAllUsers, deleteUser };