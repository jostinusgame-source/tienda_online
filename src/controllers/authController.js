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
        const hashedPassword = await bcrypt.hash(password, salt);

        const verificationCode = generateCode();
        const verificationExpiration = new Date(Date.now() + 5 * 60000); // 5 min

        // Crear usuario
        const userId = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            email_verification_code: verificationCode,
            email_verification_expiration: verificationExpiration
        });

        // Enviar correo (Intentamos enviar, pero no bloqueamos si falla para no perder el registro)
        console.log(`📤 Intentando enviar código ${verificationCode} a ${email}...`);
        await emailService.sendVerificationCode(email, verificationCode);

        res.status(201).json({ 
            message: 'Registro exitoso. Revisa tu correo para obtener el código de verificación.',
            email: email // Devolvemos el email para usarlo en la pantalla de verificación
        });

    } catch (error) {
        console.error("Error en registro:", error);
        res.status(500).json({ message: 'Error en el servidor al registrar usuario.' });
    }
};

// ... (MANTÉN LAS DEMÁS FUNCIONES LOGIN, VERIFYEMAIL IGUALES QUE ANTES)
// Solo asegúrate de que verifyEmail esté exportado
exports.login = async (req, res) => { /* Tu código de login */ 
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);
        if (!user) return res.status(401).json({ message: 'Credenciales inválidas.' });
        
        // CHECK IMPORTANTE:
        if (!user.is_verified) {
            return res.status(403).json({ 
                message: 'Cuenta no verificada. Revisa tu correo o solicita un nuevo código.',
                needsVerification: true,
                email: email
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas.' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES });
        res.json({ message: 'Login exitoso', token, user: { name: user.name, role: user.role } });

    } catch (error) {
        res.status(500).json({ message: 'Error en login.' });
    }
};

exports.verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findByEmail(email);

        if (!user) return res.status(400).json({ message: 'Usuario no encontrado.' });
        if (user.is_verified) return res.status(200).json({ message: 'Ya estabas verificado. Inicia sesión.' });

        if (user.email_verification_code !== code) {
            return res.status(400).json({ message: 'Código incorrecto.' });
        }
        
        // Aquí usamos una consulta directa porque User.js básico no tenía updateField
        const db = require('../config/database');
        await db.execute('UPDATE users SET is_verified = 1, email_verification_code = NULL WHERE id = ?', [user.id]);

        res.json({ message: '¡Cuenta verificada! Bienvenido a SpeedCollect.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error verificando cuenta.' });
    }
};