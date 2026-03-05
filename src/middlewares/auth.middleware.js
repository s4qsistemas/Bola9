const jwt = require('jsonwebtoken');

// 1. Middleware para validar que el usuario está logueado
const verifyToken = (req, res, next) => {
    // El token debe venir en la cabecera "Authorization: Bearer <token>"
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado o formato inválido.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        // Intentamos descifrar el token usando tu firma secreta
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Inyectamos los datos del usuario en la petición para que el controlador los pueda usar
        req.user = decoded;

        // Todo está en orden, pasamos al siguiente controlador
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'El token ha expirado. Inicia sesión nuevamente.' });
        }
        return res.status(401).json({ error: 'Token inválido o corrupto.' });
    }
};

// 2. Middleware para rutas exclusivas del Administrador
const isAdmin = (req, res, next) => {
    // Este middleware asume que verifyToken ya se ejecutó y req.user existe
    if (!req.user || req.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de Administrador.' });
    }
    next();
};

module.exports = {
    verifyToken,
    isAdmin
};