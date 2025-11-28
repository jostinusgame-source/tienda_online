const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// ==========================================
// FUNCIONES DE ADMINISTRADOR
// ==========================================

const getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, name, email, role, phone FROM users');
        res.json(users);
    } catch (error) {
        console.error("Error obteniendo usuarios:", error);
        res.status(500).json({ message: 'Error al obtener la lista de usuarios.' });
    }
};

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

// 3. REGISTRO DIRECTO (Sin códigos, solo validación)
const register = async (req, res) => {
    const { name, email, password, phone } = req.body;

    // A. Validación de campos vacíos
    if (!name || !email || !password || !phone) {
        return res.status(400).json({ message: 'Todos los campos son obligatorios.' });
    }

    // B. Validación estricta de formato de Email (Regex)
    // Esto asegura que tenga texto + @ + texto + . + texto
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'El formato del correo electrónico no es válido.' });
    }

    try {
        // C. Verificar si el correo YA existe
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Este correo ya está registrado.' });
        }

        // D. Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // E. Asignar Rol (Si es el primer usuario en la BD, es admin)
        const [countResult] = await pool.query('SELECT COUNT(*) as total FROM users');
        const role = countResult[0].total === 0 ? 'admin' : 'client';

        // F. Insertar Usuario Directamente
        await pool.query(
            'INSERT INTO users (name, email, password, phone, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, phone, role]
        );

        // G. Generar Token inmediatamente para que quede logueado
        // Obtenemos el ID del usuario recién creado
        const [newUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        const user = newUser[0];

        const token = jwt.sign(
            { id: user.id, role: user.role, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ 
            message: '¡Registro exitoso!', 
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Error en Registro:", error);
        res.status(500).json({ message: 'Error interno del servidor al registrar.' });
    }
};

// 4. LOGIN
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) return res.status(400).json({ message: 'Credenciales inválidas.' });
        
        const user = users[0];
        
        const validPass = await bcrypt.compare(password, user.password);
        if (!validPass) return res.status(400).json({ message: 'Credenciales inválidas.' });

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

module.exports = { 
    register, // Nueva función unificada
    login, 
    getAllUsers, 
    deleteUser 
};