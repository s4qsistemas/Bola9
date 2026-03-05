const express = require('express');
const router = express.Router();
const { login, register, updatePassword } = require('../controllers/auth.controller.js');

// 1. IMPORTAMOS EL MIDDLEWARE
const { verifyToken } = require('../middlewares/auth.middleware.js');

// 2. Rutas Públicas (Cualquiera puede intentar entrar o registrarse)
router.post('/register', register);
router.post('/login', login);

// 3. Ruta Privada (El candado: Solo pasa si trae un token válido)
router.patch('/update-password', verifyToken, updatePassword);

module.exports = router;