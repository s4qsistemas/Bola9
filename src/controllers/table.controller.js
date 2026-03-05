const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getTables = async (req, res) => {
    try {
        // Obtenemos todas las mesas ordenadas por su número (1 al 6)
        const tables = await prisma.poolTable.findMany({
            orderBy: { number: 'asc' }
        });

        res.status(200).json({ data: tables });
    } catch (error) {
        console.error('Error obteniendo mesas:', error);
        res.status(500).json({ error: 'Error interno del servidor al consultar las mesas.' });
    }
};

module.exports = {
    getTables
};