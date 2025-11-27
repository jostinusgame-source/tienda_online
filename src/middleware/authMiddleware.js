const jwt = require('jsonwebtoken');

// 1. Verificar si el usuario tiene un token válido
exports.protect = async (req, res, next) => {
    let token;

    // Verificar si hay header Authorization y empieza con Bearer
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Obtener el token (quitando la palabra 'Bearer ')
            token = req.headers.authorization.split(' ')[1];

            // Decodificar
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Agregar el usuario a la request para usarlo en el controlador
            req.user = decoded; 
            
            next();
        } catch (error) {
            return res.status(401).json({ message: 'Token no válido o expirado' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'No estás autorizado, falta el token' });
    }
};

// 2. Verificar si es Administrador
exports.adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Acceso denegado. Se requiere rol de Admin' });
    }
};