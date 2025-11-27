const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Para generar códigos random
const db = require('../config/database'); // Necesitamos acceso directo para updates complejos
const User = require('../models/User');
const emailService = require('../services/emailService');

// Helper: Generar código numérico de 6 dígitos
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// 1. REGISTRO
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        const userExists = await User.findByEmail(email);
        if (userExists) return res.status(400).json({ message: 'El correo ya está registrado.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generar código de verificación
        const verificationCode = generateCode();
        const verificationExpiration = new Date(Date.now() + 5 * 60000); // 5 min

        // Insertar usuario (Adaptamos User.js o hacemos query directo aquí por simplicidad de los campos nuevos)
        // Nota: Para mantener orden, idealmente actualiza User.js, pero haremos query aquí para asegurar los campos nuevos
        const query = `INSERT INTO users (name, email, password, role, email_verification_code, email_verification_expiration, is_verified) VALUES (?, ?, ?, 'customer', ?, ?, false)`;
        
        await db.execute(query, [name, email, hashedPassword, verificationCode, verificationExpiration]);

        // Enviar correo
        await emailService.sendVerificationCode(email, verificationCode);

        res.status(201).json({ message: 'Usuario registrado. Hemos enviado un código de verificación a tu correo.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

// 2. VERIFICAR EMAIL
exports.verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findByEmail(email);

        if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });
        if (user.is_verified) return res.status(400).json({ message: 'El usuario ya está verificado.' });

        // Verificar código y expiración
        if (user.email_verification_code !== code) {
            return res.status(400).json({ message: 'Código incorrecto.' });
        }
        if (new Date() > new Date(user.email_verification_expiration)) {
            return res.status(400).json({ message: 'El código ha expirado. Solicita uno nuevo.' });
        }

        // Activar usuario
        await db.execute('UPDATE users SET is_verified = true, email_verification_code = NULL WHERE email = ?', [email]);

        res.json({ message: 'Cuenta verificada exitosamente. Ya puedes iniciar sesión.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error verificando cuenta.' });
    }
};

// 3. LOGIN
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);

        if (!user) return res.status(401).json({ message: 'Credenciales inválidas.' });
        
        // CHECK: ¿Está verificado?
        if (!user.is_verified) {
            return res.status(403).json({ message: 'Tu correo aún no está verificado. Revisa tu bandeja de entrada.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas.' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });

        res.json({ message: 'Login exitoso', token, user: { name: user.name, role: user.role } });

    } catch (error) {
        res.status(500).json({ message: 'Error en login.' });
    }
};

// 4. SOLICITAR RECUPERACIÓN
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findByEmail(email);
        if (!user) return res.status(404).json({ message: 'Correo no registrado.' });

        const code = generateCode();
        const expiration = new Date(Date.now() + 5 * 60000); // 5 min

        await db.execute('UPDATE users SET recovery_code = ?, recovery_code_expiration = ? WHERE email = ?', [code, expiration, email]);
        
        await emailService.sendRecoveryCode(email, code);

        res.json({ message: 'Hemos enviado un código para restablecer tu contraseña. Revisa tu correo.' });
    } catch (error) {
        res.status(500).json({ message: 'Error solicitando recuperación.' });
    }
};

// 5. RESTABLECER CONTRASEÑA
exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        
        // Como este método usa validateStrictPassword en la ruta, ya sabemos que el pass es seguro
        const user = await User.findByEmail(email);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });

        if (user.recovery_code !== code) {
            return res.status(400).json({ message: 'Código de recuperación incorrecto.' });
        }
        if (new Date() > new Date(user.recovery_code_expiration)) {
            return res.status(400).json({ message: 'El código ha expirado.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        await db.execute('UPDATE users SET password = ?, recovery_code = NULL, recovery_code_expiration = NULL WHERE email = ?', [hashedPassword, email]);

        res.json({ message: 'Contraseña actualizada exitosamente. Inicia sesión.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error restableciendo contraseña.' });
    }
};