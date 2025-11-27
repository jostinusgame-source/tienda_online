const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { sendVerificationCode } = require('../services/emailService');

// Almacenamiento temporal de códigos (En producción usar Redis, aquí usaremos Memoria)
const pendingRegistrations = new Map();

// 1. INICIAR REGISTRO (Validar y Enviar Código)
const initiateRegister = async (req, res) => {
    const { name, email, password, phone } = req.body;

    try {
        // A. Validar si ya existe el usuario
        const [existing] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Este correo ya está registrado.' });
        }

        // B. Generar Código (6 dígitos)
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // C. Enviar Correo (Si falla por dominio falso, salta al catch)
        await sendVerificationCode(email, code);

        // D. Guardar datos temporalmente (Expira en 5 min)
        // Encriptamos la contraseña ANTES de guardarla temporalmente para seguridad
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        pendingRegistrations.set(email, {
            name,
            email,
            password: hashedPassword,
            phone,
            code,
            expires: Date.now() + 5 * 60 * 1000 // 5 minutos
        });

        res.status(200).json({ message: 'Código enviado. Revisa tu correo.', email });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message || 'Error en el servidor' });
    }
};

// 2. COMPLETAR REGISTRO (Verificar Código)
const verifyAndRegister = async (req, res) => {
    const { email, code } = req.body;

    const data = pendingRegistrations.get(email);

    if (!data) return res.status(400).json({ message: 'Solicitud expirada o correo inválido.' });
    if (Date.now() > data.expires) {
        pendingRegistrations.delete(email);
        return res.status(400).json({ message: 'El código ha expirado. Intenta registrarte de nuevo.' });
    }
    if (data.code !== code) {
        return res.status(400).json({ message: 'Código incorrecto.' });
    }

    try {
        // Insertar en Base de Datos FINALMENTE
        const [result] = await pool.query(
            'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            [data.name, data.email, data.password, data.phone, 'client']
        );

        pendingRegistrations.delete(email); // Limpiar memoria
        res.status(201).json({ message: '¡Cuenta verificada y creada con éxito!' });

    } catch (error) {
        res.status(500).json({ message: 'Error guardando usuario.' });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) return res.status(400).json({ message: 'Credenciales inválidas' });
        
        const user = users[0];
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ message: 'Credenciales inválidas' });

        const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.json({ 
            message: 'Bienvenido',
            token, 
            user: { id: user.id, name: user.name, email: user.email, role: user.role } 
        });
    } catch (error) {
        res.status(500).json({ message: 'Error en login' });
    }
};

module.exports = { initiateRegister, verifyAndRegister, login };