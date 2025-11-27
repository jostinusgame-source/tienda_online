const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { sendVerificationCode } = require('../services/emailService');

// Almacenamiento temporal (Memoria RAM)
const pendingRegistrations = new Map();

// 1. INICIAR REGISTRO
const initiateRegister = async (req, res) => {
    const { name, email, password, phone } = req.body;

    // Validación básica de campos obligatorios en Backend
    if (!name || !email || !password || !phone) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    try {
        // A. Verificar si el correo YA existe en la BD
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Este correo ya está registrado en el sistema.' });
        }

        // B. Verificar si el teléfono YA existe (Opcional, pero recomendado)
        const [existingPhone] = await pool.query('SELECT id FROM users WHERE phone = ?', [phone]);
        if (existingPhone.length > 0) {
            return res.status(400).json({ message: 'Este número de teléfono ya está registrado.' });
        }

        // C. Generar Código
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // D. Enviar Correo
        try {
            await sendVerificationCode(email, code);
        } catch (emailError) {
            console.error("Error SMTP:", emailError);
            return res.status(500).json({ message: 'Error enviando el correo. Verifica que la dirección sea real.' });
        }

        // E. Guardar temporalmente (Hash password antes)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        pendingRegistrations.set(email, {
            name,
            email,
            password: hashedPassword,
            phone,
            code,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutos
        });

        console.log(`✅ Registro iniciado para: ${email}`);
        res.status(200).json({ message: 'Código enviado correctamente.', email });

    } catch (error) {
        console.error("❌ Error en initiateRegister:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// 2. VERIFICAR CÓDIGO Y CREAR USUARIO
const verifyAndRegister = async (req, res) => {
    const { email, code } = req.body;

    const data = pendingRegistrations.get(email);

    if (!data) return res.status(400).json({ message: 'Solicitud no encontrada o expirada.' });
    if (Date.now() > data.expires) {
        pendingRegistrations.delete(email);
        return res.status(400).json({ message: 'El código ha expirado.' });
    }
    if (String(data.code) !== String(code)) {
        return res.status(400).json({ message: 'Código incorrecto.' });
    }

    try {
        await pool.query(
            'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            [data.name, data.email, data.password, data.phone, 'client']
        );

        pendingRegistrations.delete(email);
        res.status(201).json({ message: 'Usuario registrado exitosamente.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error guardando en base de datos.' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) return res.status(400).json({ message: 'Usuario no encontrado.' });
        
        const user = users[0];
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ message: 'Contraseña incorrecta.' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ 
            message: 'Login exitoso',
            token, 
            user: { id: user.id, name: user.name, email: user.email, role: user.role } 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

module.exports = { initiateRegister, verifyAndRegister, login };