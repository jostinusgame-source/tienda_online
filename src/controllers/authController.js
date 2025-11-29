const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database'); // Asegúrate que exporte pool.promise() o use mysql2/promise
const { PhoneNumberUtil } = require('google-libphonenumber');
const phoneUtil = PhoneNumberUtil.getInstance();

// REGEX ESTRICTO PARA NOMBRE
// 2-3 palabras, sin repetir palabras, sin caracteres repetidos consecutivos (ej: 'aa')
const NAME_REGEX = /^(?!.*\b([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)\b.*\b\1\b)(?!.*(.)\2)([A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,30})(\s+[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,30}){1,2}$/;

// REGEX EMAIL
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ==========================================
// REGISTRO (CON VALIDACIONES ESTRICTAS)
// ==========================================
const register = async (req, res) => {
    const { name, email, password, phone } = req.body;

    // 1. Validación de Nombre (Ultra Estricta)
    if (!NAME_REGEX.test(name)) {
        return res.status(400).json({ 
            message: 'Nombre inválido: Debe tener 2 o 3 palabras, sin repetir palabras ni usar letras dobles seguidas (ej: "aa").' 
        });
    }

    // 2. Validación de Email
    if (!EMAIL_REGEX.test(email)) {
        return res.status(400).json({ message: 'Email inválido.' });
    }
    // (Opcional: Aquí iría la validación DNS real si instalas la librería 'dns')

    // 3. Validación de Teléfono (Google Lib)
    try {
        const number = phoneUtil.parseAndKeepRawInput(phone);
        if (!phoneUtil.isValidNumber(number)) throw new Error('Inválido');
    } catch (e) {
        return res.status(400).json({ message: 'Número de teléfono inválido para el país (formato internacional).' });
    }

    // 4. Validación Contraseña
    // Mínimo 10 caracteres, 1 mayúscula, 1 número, 1 símbolo (como pediste)
    const passRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{10,}$/;
    if (!passRegex.test(password)) {
        return res.status(400).json({ message: 'Contraseña insegura: Mín. 10 chars, mayúscula, número y símbolo.' });
    }

    try {
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ message: 'Correo ya registrado.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Crear usuario (role client por defecto)
        await pool.query(
            'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, phone, 'client']
        );

        res.status(201).json({ message: 'Registro exitoso. Inicia sesión.' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error interno.' });
    }
};

// ==========================================
// LOGIN (CON BLOQUEO Y SEGUIMIENTO)
// ==========================================
const login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        // A. Usuario no existe -> Mensaje claro para registro
        if (users.length === 0) {
            return res.status(404).json({ 
                error: 'not_found', 
                message: 'No encontramos una cuenta con este correo. ¿Quieres registrarte?' 
            });
        }

        const user = users[0];

        // B. Verificar Bloqueo
        if (user.lock_until && new Date() < new Date(user.lock_until)) {
            const minutesLeft = Math.ceil((new Date(user.lock_until) - new Date()) / 60000);
            return res.status(403).json({ message: `Cuenta bloqueada por seguridad. Intenta en ${minutesLeft} minutos.` });
        }

        // C. Validar Password
        const validPass = await bcrypt.compare(password, user.password);
        
        if (!validPass) {
            // Lógica de intentos fallidos
            const attempts = (user.failed_attempts || 0) + 1;
            let lockTime = null;
            let msg = `Contraseña incorrecta. Intentos restantes: ${5 - attempts}`;

            if (attempts >= 5) {
                lockTime = new Date(Date.now() + 15 * 60000); // 15 minutos
                msg = 'Has excedido los intentos. Cuenta bloqueada por 15 minutos.';
            }

            await pool.query('UPDATE users SET failed_attempts = ?, lock_until = ? WHERE id = ?', [attempts, lockTime, user.id]);
            return res.status(401).json({ message: msg });
        }

        // D. Éxito: Resetear contadores
        await pool.query('UPDATE users SET failed_attempts = 0, lock_until = NULL WHERE id = ?', [user.id]);

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET || 'secret',
            { expiresIn: '7d' }
        );

        res.json({ 
            message: 'Bienvenido',
            token, 
            user: { id: user.id, name: user.name, email: user.email, role: user.role } 
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const getAllUsers = async (req, res) => { /* ... código admin ... */ };
const deleteUser = async (req, res) => { /* ... código admin ... */ };

module.exports = { register, login, getAllUsers, deleteUser };