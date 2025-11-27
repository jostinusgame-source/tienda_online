const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { sendVerificationCode } = require('../services/emailService');

// Almacenamiento temporal en memoria para los códigos de verificación
// (En producción idealmente usarías Redis, pero esto funciona bien para tu proyecto)
const pendingRegistrations = new Map();

// ==========================================
// FUNCIONES DE ADMINISTRADOR
// ==========================================

// 1. Obtener todos los usuarios (Para el Panel Admin)
const getAllUsers = async (req, res) => {
    try {
        // Seleccionamos id, nombre, email, rol y teléfono. NO la contraseña.
        const [users] = await pool.query('SELECT id, name, email, role, phone FROM users');
        res.json(users);
    } catch (error) {
        console.error("Error obteniendo usuarios:", error);
        res.status(500).json({ message: 'Error al obtener la lista de usuarios.' });
    }
};

// 2. Eliminar usuario (Para el Panel Admin)
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query('DELETE FROM users WHERE id = ?', [id]);
        res.json({ message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        console.error("Error eliminando usuario:", error);
        res.status(500).json({ message: 'Error al eliminar el usuario.' });
    }
};

// ==========================================
// FUNCIONES DE AUTENTICACIÓN
// ==========================================

// 3. INICIAR REGISTRO (Validar y Enviar Código)
const initiateRegister = async (req, res) => {
    const { name, email, password, phone } = req.body;

    // Validación básica
    if (!name || !email || !password || !phone) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    try {
        // A. Verificar si el correo YA existe
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Este correo ya está registrado.' });
        }

        // B. Generar Código de 6 dígitos
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // C. Enviar Correo (Punto Crítico)
        try {
            await sendVerificationCode(email, code);
        } catch (emailError) {
            console.error("Error SMTP al enviar código:", emailError);
            // Devolvemos 500 para que el frontend sepa que falló el envío, no el registro en sí
            return res.status(500).json({ 
                message: 'No se pudo enviar el correo. Verifica que la dirección sea real y válida.' 
            });
        }

        // D. Guardar datos temporalmente (Hash password antes por seguridad)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Guardamos en memoria por 10 minutos
        pendingRegistrations.set(email, {
            name,
            email,
            password: hashedPassword,
            phone,
            code,
            expires: Date.now() + 10 * 60 * 1000 
        });

        console.log(`✅ Código ${code} generado para: ${email}`);
        res.status(200).json({ message: 'Código enviado correctamente.', email });

    } catch (error) {
        console.error("❌ Error CRÍTICO en initiateRegister:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
};

// 4. VERIFICAR CÓDIGO Y CREAR USUARIO EN BD
const verifyAndRegister = async (req, res) => {
    const { email, code } = req.body;

    const data = pendingRegistrations.get(email);

    if (!data) return res.status(400).json({ message: 'Solicitud expirada o correo incorrecto.' });
    
    if (Date.now() > data.expires) {
        pendingRegistrations.delete(email);
        return res.status(400).json({ message: 'El código ha expirado. Regístrate de nuevo.' });
    }
    
    // Comparar códigos (convertir a string para evitar errores de tipo)
    if (String(data.code) !== String(code)) {
        return res.status(400).json({ message: 'Código incorrecto.' });
    }

    try {
        // Lógica para asignar Rol: Si es el PRIMER usuario de la base de datos, será ADMIN.
        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM users');
        const role = countResult[0].total === 0 ? 'admin' : 'client';

        // Insertar en Base de Datos FINALMENTE
        await pool.query(
            'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            [data.name, data.email, data.password, data.phone, role]
        );

        // Limpiar memoria
        pendingRegistrations.delete(email);
        
        res.status(201).json({ message: '¡Cuenta creada exitosamente! Ya puedes iniciar sesión.' });

    } catch (error) {
        console.error("Error guardando usuario:", error);
        res.status(500).json({ message: 'Error guardando usuario en la base de datos.' });
    }
};

// 5. LOGIN
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Buscar usuario
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) return res.status(400).json({ message: 'Credenciales inválidas.' });
        
        const user = users[0];
        
        // Verificar contraseña
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ message: 'Credenciales inválidas.' });

        // Generar Token JWT (Incluimos el rol para permisos de admin)
        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email }, 
            process.env.JWT_SECRET, 
            { expiresIn: '7d' }
        );

        res.json({ 
            message: 'Bienvenido a SpeedCollect',
            token, 
            user: { 
                id: user.id, 
                name: user.name, 
                email: user.email, 
                role: user.role 
            } 
        });
    } catch (error) {
        console.error("Error en Login:", error);
        res.status(500).json({ message: 'Error en el servidor durante el login.' });
    }
};

// Exportamos TODAS las funciones para usarlas en las rutas
module.exports = { 
    initiateRegister, 
    verifyAndRegister, 
    login, 
    getAllUsers, 
    deleteUser 
};