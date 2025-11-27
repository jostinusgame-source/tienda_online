const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('../services/emailService');
const db = require('../config/database'); // Acceso directo para updates

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// REGISTRO OPTIMIZADO
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        const userExists = await User.findByEmail(email);
        if (userExists) return res.status(400).json({ message: 'El correo ya está registrado.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const code = generateCode();
        const exp = new Date(Date.now() + 15 * 60000); // 15 min

        await User.create({
            name, email, phone, password: hashedPassword,
            email_verification_code: code,
            email_verification_expiration: exp
        });

        // ⚡ ENVIAR CORREO EN SEGUNDO PLANO (NO AWAIT)
        emailService.sendVerificationCode(email, code)
            .catch(err => console.error("Error enviando correo (Background):", err));

        res.status(201).json({ message: 'Usuario creado. Revisa tu correo.', email });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno.' });
    }
};

// LOGIN
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);

        if (!user) return res.status(401).json({ message: 'Credenciales inválidas.' });
        
        if (!user.is_verified) {
            return res.status(403).json({ 
                message: 'Cuenta no verificada.', 
                needsVerification: true, 
                email: user.email 
            });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Credenciales inválidas.' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ message: 'Login exitoso', token, user });
    } catch (error) {
        res.status(500).json({ message: 'Error en login.' });
    }
};

// VERIFICAR EMAIL
exports.verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        const user = await User.findByEmail(email);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        
        if (String(user.email_verification_code) !== String(code)) {
            return res.status(400).json({ message: 'Código incorrecto.' });
        }
        
        await db.execute('UPDATE users SET is_verified = 1, email_verification_code = NULL WHERE id = ?', [user.id]);
        res.json({ message: 'Verificado.' });
    } catch (error) { res.status(500).json({ message: 'Error verificando.' }); }
};

// RECUPERACIÓN DE CONTRASEÑA (AHORA SÍ FUNCIONA)
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findByEmail(email);
        
        if (!user) return res.status(404).json({ message: 'Si el correo existe, recibirás un código.' });

        const recoveryCode = generateCode();
        
        // Guardamos el código en la base de datos
        await db.execute('UPDATE users SET recovery_code = ? WHERE email = ?', [recoveryCode, email]);

        // Enviar correo de recuperación
        // Reutilizamos la función de envío de código para simplificar
        emailService.sendVerificationCode(email, recoveryCode)
            .catch(e => console.error("Error correo recuperación:", e));

        res.json({ message: 'Código enviado a tu correo.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error procesando solicitud.' });
    }
};

// CAMBIAR CONTRASEÑA
exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        const user = await User.findByEmail(email);
        
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        if (String(user.recovery_code) !== String(code)) return res.status(400).json({ message: 'Código inválido.' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await db.execute('UPDATE users SET password = ?, recovery_code = NULL WHERE id = ?', [hash, user.id]);
        
        res.json({ message: 'Contraseña actualizada.' });
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando contraseña.' });
    }
};