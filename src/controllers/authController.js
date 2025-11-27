// ... imports (bcrypt, jwt, db, User, emailService, etc.) MANTENER LOS MISMOS
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('../services/emailService');

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

exports.register = async (req, res) => {
    try {
        // 1. Recibimos 'phone' del body
        const { name, email, password, phone } = req.body;

        const userExists = await User.findByEmail(email);
        if (userExists) return res.status(400).json({ message: 'El correo ya está registrado.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const verificationCode = generateCode();
        const verificationExpiration = new Date(Date.now() + 5 * 60000); 

        // 2. Pasamos 'phone' al modelo
        const userId = await User.create({
            name,
            email,
            phone, // <--- AQUÍ
            password: hashedPassword,
            email_verification_code: verificationCode,
            email_verification_expiration: verificationExpiration
        });

        await emailService.sendVerificationCode(email, verificationCode);

        res.status(201).json({ message: 'Registro exitoso. Revisa tu correo para el código.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

// ... MANTENER EL RESTO DE FUNCIONES (login, verifyEmail, etc.) IGUALES
exports.login = async (req, res) => { /* ... tu código anterior ... */ 
    // Para abreviar, asegúrate de mantener el código de login, verify, etc que ya tenías
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);
        if (!user) return res.status(401).json({ message: 'Credenciales inválidas.' });
        if (!user.is_verified) return res.status(403).json({ message: 'Verifica tu correo primero.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas.' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });
        
        // Devolvemos también el teléfono si quieres
        res.json({ message: 'Login exitoso', token, user: { name: user.name, role: user.role, phone: user.phone } });

    } catch (error) {
        res.status(500).json({ message: 'Error en login.' });
    }
};

exports.verifyEmail = async (req, res) => {
    // ... Copia tu función verifyEmail anterior o usa la lógica que ya tenías
     try {
        const { email, code } = req.body;
        const user = await User.findByEmail(email);
        if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });
        if (user.is_verified) return res.status(400).json({ message: 'Ya verificado.' });
        if (user.email_verification_code !== code) return res.status(400).json({ message: 'Código incorrecto.' });
        
        // Importante: User.js no tiene método update directo para esto en la versión simple, 
        // así que usamos la conexión DB directa o agregamos el método al modelo.
        // Asumo que usas el código previo que tenía db.execute directo.
        const db = require('../config/database'); 
        await db.execute('UPDATE users SET is_verified = true, email_verification_code = NULL WHERE email = ?', [email]);
        
        res.json({ message: 'Cuenta verificada.' });
    } catch (error) {
        res.status(500).json({ message: 'Error verificando.' });
    }
};

// ... Mantener forgotPassword y resetPassword
exports.forgotPassword = async (req, res) => { /* Tu código anterior */ };
exports.resetPassword = async (req, res) => { /* Tu código anterior */ };