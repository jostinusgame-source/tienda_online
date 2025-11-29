const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { PhoneNumberUtil } = require('google-libphonenumber');
const phoneUtil = PhoneNumberUtil.getInstance();

// REGEX
const NAME_REGEX = /^(?!.*\b([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)\b.*\b\1\b)(?!.*(.)\2)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,30})(\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,30}){1,2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// --- FUNCIONES ADMIN (ESTAS FALTABAN Y CAUSABAN EL ERROR) ---
const getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, name, email, role, phone, is_verified, created_at FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener usuarios' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ message: 'Error eliminando usuario' });
    }
};

// --- AUTH ---
const register = async (req, res) => {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) return res.status(400).json({ message: 'Campos incompletos.' });
    if (!NAME_REGEX.test(name)) return res.status(400).json({ message: 'Nombre inválido (reglas estrictas).' });
    if (!EMAIL_REGEX.test(email)) return res.status(400).json({ message: 'Email inválido.' });

    try {
        const number = phoneUtil.parseAndKeepRawInput(phone);
        if (!phoneUtil.isValidNumber(number)) throw new Error();
    } catch (e) { return res.status(400).json({ message: 'Número inválido.' }); }

    const passRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
    if (!passRegex.test(password)) return res.status(400).json({ message: 'Contraseña insegura.' });

    try {
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'Correo registrado.' });

        const hash = await bcrypt.hash(password, 10);
        const [total] = await pool.query('SELECT COUNT(*) as c FROM users');
        const role = total[0].c === 0 ? 'admin' : 'client';

        await pool.query(
            'INSERT INTO users (name, email, password, phone, role, is_verified) VALUES (?, ?, ?, ?, ?, ?)',
            [name, email, hash, phone, role, true]
        );

        res.status(201).json({ message: 'Registro exitoso.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error servidor.' });
    }
};

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) return res.status(404).json({ message: 'Usuario no encontrado.' });

        const user = users[0];
        if (user.lock_until && new Date() < new Date(user.lock_until)) {
            return res.status(403).json({ message: 'Cuenta bloqueada temporalmente.' });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            const attempts = (user.failed_attempts || 0) + 1;
            let lock = null;
            if (attempts >= 5) lock = new Date(Date.now() + 15 * 60000);
            await pool.query('UPDATE users SET failed_attempts = ?, lock_until = ? WHERE id = ?', [attempts, lock, user.id]);
            return res.status(401).json({ message: 'Contraseña incorrecta.' });
        }

        await pool.query('UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ?', [user.id]);
        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });

        res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: 'Error login.' });
    }
};

// EXPORTAR TODO (ESTO FALTABA PARA QUE NO DE UNDEFINED)
module.exports = { register, login, getAllUsers, deleteUser };