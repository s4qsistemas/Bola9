const express = require('express');
const router = express.Router();
const {
    getDailyShiftBookings,
    updateBookingStatus,
    getUsers,
    getUserBookings,
    getBookingDates,
    toggleUserStatus,
    toggleTableStatus,
    resetUserPassword
} = require('../controllers/admin.controller.js');
const { verifyToken, isAdmin } = require('../middlewares/auth.middleware.js');

// TODAS las rutas de este archivo requieren estar logueado Y ser administrador
router.use(verifyToken, isAdmin);

// --- Rutas de Reservas ---
router.get('/bookings/shift', getDailyShiftBookings);
router.get('/bookings/dates', getBookingDates);
router.patch('/bookings/:id/status', updateBookingStatus);

// --- Rutas de Usuarios (NUEVAS) ---
router.get('/users', getUsers);
router.get('/users/:id/bookings', getUserBookings);
router.patch('/users/:id/status', toggleUserStatus);
router.patch('/users/:id/reset-password', resetUserPassword);

// --- Rutas de Configuración Fuerte ---
router.patch('/tables/:id/status', toggleTableStatus);

module.exports = router;