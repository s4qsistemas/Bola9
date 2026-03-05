const express = require('express');
const router = express.Router();
const {
    getSettings,
    updateBusinessHour,
    addClosedDate,
    removeClosedDate
} = require('../controllers/settings.controller.js');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware.js');

// TODAS las rutas de configuración exigen ser Administrador
router.use(verifyToken, isAdmin);

// Consultar todo
router.get('/', getSettings);

// Modificar los horarios base
router.patch('/hours/:dayOfWeek', updateBusinessHour);

// Gestión de Feriados/Días Cerrados
router.post('/closed-dates', addClosedDate);
router.delete('/closed-dates/:id', removeClosedDate);

module.exports = router;