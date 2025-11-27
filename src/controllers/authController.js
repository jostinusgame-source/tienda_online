const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('../services/emailService');

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        const userExists = await User.findByEmail(email);
        if (userExists) return res.status(400).json({ message: 'El correo ya está registrado.' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const code = generateCode();
        const exp = new Date(Date.now() + 5 * 60000); // 5 min

        await User.create({
            name, email, phone, password: hash,
            email_verification_code: code,
            email_verification_expiration: exp
        });

        // Intentar enviar correo
        try {
            await emailService.sendVerificationCode(email, code);
        } catch (err) {
            console.error("Error enviando correo:", err);
        }

        res.status(201).json({ message: 'Código enviado.', email });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: 'Error interno.' });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);
        if (!user) return res.status(401).json({ message: 'Datos incorrectos.' });

        if (!user.is_verified) {
            return res.status(403).json({ 
                message: 'Cuenta no verificada.', 
                needsVerification: true, 
                email: user.email 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Datos incorrectos.' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'Bienvenido', token, user });
    } catch (e) {
        res.status(500).json({ message: 'Error servidor.' });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findByEmail(email);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        
        if (user.email_verification_code !== code) return res.status(400).json({ message: 'Código inválido.' });
        
        const db = require('../config/database');
        await db.execute('UPDATE users SET is_verified = 1, email_verification_code = NULL WHERE id = ?', [user.id]);
        
        res.json({ message: 'Verificado.' });
    } catch (e) { res.status(500).json({ message: 'Error.' }); }
};

exports.forgotPassword = async (req, res) => {
    // Implementación base para evitar errores de ruta
    res.json({ message: 'Sistema de recuperación en mantenimiento.' });
};

exports.resetPassword = async (req, res) => {
    res.json({ message: 'Sistema de recuperación en mantenimiento.' });
};