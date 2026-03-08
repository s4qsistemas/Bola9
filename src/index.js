const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares globales
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


// --- IMPORTAR RUTAS ---
const authRoutes = require('./routes/auth.routes.js');
const tableRoutes = require('./routes/table.routes.js');
const bookingRoutes = require('./routes/booking.routes.js');
const adminRoutes = require('./routes/admin.routes.js');
const settingsRoutes = require('./routes/settings.routes.js');
const jumbotronRoutes = require('./routes/jumbotron.routes');

// --- MONTAR RUTAS ---
app.use('/api/auth', authRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/jumbotron', jumbotronRoutes);

// Ruta de prueba (Healthcheck)
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'API de Bola9 funcionando correctamente' });
});

// Levantar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor Bola9 corriendo en el puerto ${PORT} - Entorno: ${process.env.NODE_ENV || 'desarrollo'}`);
});