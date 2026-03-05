const express = require('express');
const router = express.Router();
const { getAvailability, createBooking, getMyBookings, cancelMyBooking } = require('../controllers/booking.controller.js');
const { verifyToken } = require('../middlewares/auth.middleware.js');

// Ruta: GET /api/bookings/availability?date=YYYY-MM-DD&tableId=UUID
router.get('/availability', verifyToken, getAvailability);

// Ruta: POST /api/bookings
router.post('/', verifyToken, createBooking);

// --- NUEVAS RUTAS PARA EL CLIENTE ---
router.get('/me', verifyToken, getMyBookings);
router.patch('/:id/cancel', verifyToken, cancelMyBooking);

module.exports = router;