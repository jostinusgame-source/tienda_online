const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtener token del header
            token = req.headers.authorization.split(' ')[1];

            // Decodificar
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

            // Buscar usuario (sin password)
            const [rows] = await pool.query('SELECT id, name, email, role, is_verified FROM users WHERE id = ?', [decoded.id]);
            
            if (rows.length === 0) {
                return res.status(401).json({ message: 'Usuario no encontrado.' });
            }

            // Adjuntar usuario a la request
            req.user = rows[0];
            next();
        } catch (error) {
            console.error(error);
            return res.status(401).json({ message: 'Token no válido, sesión expirada.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'No hay autorización, falta token.' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de Admin.' });
    }
};

module.exports = { protect, adminOnly };