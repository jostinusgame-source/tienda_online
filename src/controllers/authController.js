const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('../services/emailService');

// Helper para generar código numérico
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// 1. REGISTRO
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        const userExists = await User.findByEmail(email);
        if (userExists) return res.status(400).json({ message: 'El correo ya está registrado.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const verificationCode = generateCode();
        const verificationExpiration = new Date(Date.now() + 5 * 60000); // 5 min

        // Crear usuario
        await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            email_verification_code: verificationCode,
            email_verification_expiration: verificationExpiration
        });

        // Intentar enviar correo (no bloqueante)
        try {
            await emailService.sendVerificationCode(email, verificationCode);
        } catch (err) {
            console.error("Error enviando correo:", err);
        }

        res.status(201).json({ message: 'Registro exitoso. Revisa tu correo.', email });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

// 2. LOGIN
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);

        if (!user) return res.status(401).json({ message: 'Credenciales inválidas.' });

        // Verificación de correo obligatoria
        if (!user.is_verified) {
            return res.status(403).json({ 
                message: 'Cuenta no verificada.', 
                needsVerification: true,
                email: user.email 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas.' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });

        res.json({ 
            message: 'Login exitoso', 
            token, 
            user: { id: user.id, name: user.name, email: user.email, role: user.role } 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en login.' });
    }
};

// 3. VERIFICAR EMAIL (¡Esta es la que faltaba!)
exports.verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findByEmail(email);

        if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });
        if (user.is_verified) return res.status(200).json({ message: 'Ya verificado.' });

        if (user.email_verification_code !== code) {
            return res.status(400).json({ message: 'Código incorrecto.' });
        }

        // Actualizar estado en BD
        const db = require('../config/database');
        await db.execute('UPDATE users SET is_verified = 1, email_verification_code = NULL WHERE id = ?', [user.id]);

        res.json({ message: 'Cuenta verificada exitosamente.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error verificando.' });
    }
};

// 4. RECUPERACIÓN (Placeholders para evitar errores de importación)
exports.forgotPassword = async (req, res) => {
    res.status(501).json({ message: "Funcionalidad pendiente" });
};

exports.resetPassword = async (req, res) => {
    res.status(501).json({ message: "Funcionalidad pendiente" });
};