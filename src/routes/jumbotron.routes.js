const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');

// 1. Configuración estricta de Multer (El Atrapador)
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/') // La foto cae físicamente aquí
    },
    filename: function (req, file, cb) {
        // Renombramos: banner.png -> 1678901234-banner.png
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '-'))
    }
});
const upload = multer({ storage: storage });

// 2. GET: Para que el Frontend (Home y Admin) lea los datos actuales
router.get('/', async (req, res) => {
    try {
        let settings = await prisma.jumbotronSettings.findUnique({ where: { id: 1 } });

        // Si no existe, devolvemos un objeto por defecto para que no explote el frontend
        if (!settings) {
            settings = { title: '', subtitle: '', imageUrl: null };
        }
        res.json(settings);
    } catch (error) {
        console.error("Error obteniendo Jumbotron:", error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// 3. POST: Para que el Admin guarde los nuevos cambios
// El middleware 'upload.single("image")' intercepta la foto antes de llegar a tu código
router.post('/', upload.single('image'), async (req, res) => {
    try {
        // Extraemos los textos del formulario (pueden venir vacíos, eso está bien)
        const { title, subtitle } = req.body;

        // Preparamos los datos a actualizar
        const updateData = {
            title: title || '',
            subtitle: subtitle || '',
        };

        // Si el admin subió una foto nueva, guardamos la nueva ruta
        if (req.file) {
            // Guardamos la ruta relativa para que el frontend la consuma
            updateData.imageUrl = `/uploads/${req.file.filename}`;
        }

        // Usamos upsert: Si el ID 1 existe, lo actualiza. Si no existe, lo crea.
        const updatedSettings = await prisma.jumbotronSettings.upsert({
            where: { id: 1 },
            update: updateData,
            create: {
                id: 1,
                ...updateData
            }
        });

        res.json(updatedSettings);
    } catch (error) {
        console.error("Error guardando Jumbotron:", error);
        res.status(500).json({ error: 'Error al guardar los ajustes' });
    }
});

module.exports = router;