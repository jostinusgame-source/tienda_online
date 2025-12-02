const jwt = require('jsonwebtoken');
const pool = require('../config/database');

const protect = async (req, res, next) => {
    let token;

    // 1. Verificar si hay token en los headers (Bearer Token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtener el token del header
            token = req.headers.authorization.split(' ')[1];

            // Verificar token
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

            // Obtener el usuario del token (sin password)
            const [rows] = await pool.query('SELECT id, name, email, role FROM users WHERE id = ?', [decoded.id]);

            if (rows.length === 0) {
                return res.status(401).json({ message: 'El usuario de este token ya no existe.' });
            }

            // Guardar usuario en la request para usarlo en los controladores
            req.user = rows[0];
            next();
        } catch (error) {
            console.error('Error de token:', error);
            return res.status(401).json({ message: 'No autorizado, token fallido.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'No autorizado, no hay token.' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
};

module.exports = { protect, adminOnly };