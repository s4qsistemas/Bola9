const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 1. Obtener toda la configuración (Horarios y Feriados)
const getSettings = async (req, res) => {
    try {
        const businessHours = await prisma.businessHour.findMany({
            orderBy: { dayOfWeek: 'asc' }
        });

        const closedDates = await prisma.closedDate.findMany({
            orderBy: { date: 'asc' },
            where: { date: { gte: new Date(new Date().toISOString().split('T')[0] + 'T00:00:00Z') } } // Solo trae los feriados futuros o de hoy
        });

        res.status(200).json({ data: { businessHours, closedDates } });
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        res.status(500).json({ error: 'Error interno al cargar la configuración.' });
    }
};

// 2. Modificar el horario de un día específico
const updateBusinessHour = async (req, res) => {
    try {
        const { dayOfWeek } = req.params;
        const { isOpen, openTime, closeTime } = req.body;

        const updatedHour = await prisma.businessHour.update({
            where: { dayOfWeek: parseInt(dayOfWeek) },
            data: { isOpen, openTime, closeTime }
        });

        res.status(200).json({ message: 'Horario actualizado exitosamente.', data: updatedHour });
    } catch (error) {
        console.error('Error actualizando horario:', error);
        res.status(500).json({ error: 'Error al actualizar el horario comercial.' });
    }
};

// 3. Agregar una fecha de cierre (Ej: Feriado Irrenunciable)
const addClosedDate = async (req, res) => {
    try {
        const { date, reason } = req.body; // date en formato YYYY-MM-DD

        // Verificamos si ya existe ese feriado
        const existingDate = await prisma.closedDate.findUnique({
            where: { date: new Date(date + 'T12:00:00Z') }
        });

        if (existingDate) {
            return res.status(400).json({ error: 'Esa fecha ya está marcada como cerrada.' });
        }

        const newClosedDate = await prisma.closedDate.create({
            data: {
                date: new Date(date + 'T12:00:00Z'),
                reason: reason || 'Cerrado por administración'
            }
        });

        res.status(201).json({ message: 'Fecha de cierre agregada.', data: newClosedDate });
    } catch (error) {
        console.error('Error agregando fecha cerrada:', error);
        res.status(500).json({ error: 'Error al registrar la fecha de cierre.' });
    }
};

// 4. Eliminar una fecha de cierre (Se arrepintieron y sí van a abrir)
const removeClosedDate = async (req, res) => {
    try {
        const { id } = req.params;

        await prisma.closedDate.delete({
            where: { id }
        });

        res.status(200).json({ message: 'Fecha de cierre eliminada, el local abrirá ese día.' });
    } catch (error) {
        console.error('Error eliminando fecha cerrada:', error);
        res.status(500).json({ error: 'Error al eliminar la fecha de cierre.' });
    }
};

module.exports = {
    getSettings,
    updateBusinessHour,
    addClosedDate,
    removeClosedDate
};