const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const emailService = require('../services/emailService');
const db = require('../config/database'); // Acceso directo a BD

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// REGISTRO
exports.register = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        
        const userExists = await User.findByEmail(email);
        if (userExists) return res.status(400).json({ message: 'El correo ya está registrado.' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(password, salt);
        const code = generateCode();
        const exp = new Date(Date.now() + 10 * 60000); // 10 min

        await User.create({
            name, email, phone, password: hash,
            email_verification_code: code,
            email_verification_expiration: exp
        });

        // Enviar código real
        try {
            await emailService.sendVerificationCode(email, code);
        } catch (mailError) {
            console.error("Error enviando correo registro:", mailError);
        }

        res.status(201).json({ message: 'Usuario creado. Revisa tu correo.', email });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// LOGIN
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findByEmail(email);

        if (!user) return res.status(401).json({ message: 'Credenciales inválidas.' });
        if (!user.is_verified) return res.status(403).json({ message: 'Cuenta no verificada.', needsVerification: true, email: user.email });

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
        
        if (user.email_verification_code !== code) return res.status(400).json({ message: 'Código incorrecto.' });
        
        await db.execute('UPDATE users SET is_verified = 1, email_verification_code = NULL WHERE id = ?', [user.id]);
        res.json({ message: 'Verificado exitosamente.' });
    } catch (error) { res.status(500).json({ message: 'Error verificando.' }); }
};

// RECUPERAR CONTRASEÑA (Lógica Real)
exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findByEmail(email);
        
        if (!user) return res.status(404).json({ message: 'No existe cuenta con este correo.' });

        const recoveryCode = generateCode();
        // Guardar código en BD
        await db.execute('UPDATE users SET recovery_code = ? WHERE email = ?', [recoveryCode, email]);

        // Enviar correo real
        const html = `
            <div style="background:#000; color:#fff; padding:20px; text-align:center;">
                <h1 style="color:#D40000;">SPEEDCOLLECT</h1>
                <h2>Recuperación de Acceso</h2>
                <p>Usa este código para restablecer tu contraseña:</p>
                <h1 style="background:#222; display:inline-block; padding:10px 20px; letter-spacing:5px;">${recoveryCode}</h1>
                <p style="color:#888;">Si no fuiste tú, ignora este mensaje.</p>
            </div>
        `;
        
        try {
            // Reusamos la función de envío genérica o creamos una específica si prefieres
            // Para simplicidad, usamos sendEmail del servicio (que es privado) a través de un wrapper público si existe,
            // o usamos sendVerificationCode adaptado.
            // Asumiré que modificaste emailService para exportar sendEmail o creamos una nueva función pública allí.
            // Si no, usaremos sendVerificationCode temporalmente:
            await emailService.sendVerificationCode(email, recoveryCode); 
        } catch (e) {
            console.error("Error enviando recuperación:", e);
        }

        res.json({ message: 'Código de recuperación enviado a tu correo.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error procesando solicitud.' });
    }
};

// RESETEAR CONTRASEÑA
exports.resetPassword = async (req, res) => {
    try {
        const { email, code, newPassword } = req.body;
        const user = await User.findByEmail(email);
        
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado.' });
        if (user.recovery_code !== code) return res.status(400).json({ message: 'Código inválido.' });

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);

        await db.execute('UPDATE users SET password = ?, recovery_code = NULL WHERE id = ?', [hash, user.id]);
        
        res.json({ message: 'Contraseña actualizada. Inicia sesión.' });
    } catch (error) {
        res.status(500).json({ message: 'Error actualizando contraseña.' });
    }
};