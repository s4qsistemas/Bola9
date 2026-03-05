const express = require('express');
const router = express.Router();
const { getTables } = require('../controllers/table.controller.js');
const { verifyToken } = require('../middlewares/auth.middleware.js');

// Ruta: GET /api/tables 
// Inyectamos verifyToken antes de getTables. Si el token es inválido, getTables nunca se ejecuta.
router.get('/', verifyToken, getTables);

module.exports = router;