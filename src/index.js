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
    crossOriginResourcePolicy: { policy: "cross-origin" } // VITAL: Permite que React cargue las imágenes de la carpeta uploads
}));
app.use(cors()); // Permite peticiones desde tu futuro frontend en React
app.use(express.json()); // Permite a Express entender JSON en el body de las peticiones
app.use(morgan('dev')); // Loguea las peticiones en la consola para depurar fácilmente
app.use('/uploads', express.static(path.join(__dirname, '../uploads'))); // Permite que la carpeta uploads sea accesible desde el navegador


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
    console.log(`🚀 Servidor Bola9 corriendo en http://localhost:${PORT}`);
});