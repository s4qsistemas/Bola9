const { PrismaClient } = require('@prisma/client');
const dayjs = require('dayjs');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// 1. Obtener todas las reservas de un turno operativo
const getDailyShiftBookings = async (req, res) => {
    try {
        const { date } = req.query; // Ejemplo: "2026-03-01"

        if (!date) {
            return res.status(400).json({ error: 'Se requiere la fecha del turno (date) en formato YYYY-MM-DD.' });
        }

        // Definimos el turno: desde las 12:00 del día solicitado hasta las 11:59 del día siguiente
        const shiftStart = dayjs(`${date} 12:00`).toDate();
        const shiftEnd = dayjs(`${date} 12:00`).add(1, 'day').toDate();

        const bookings = await prisma.booking.findMany({
            where: {
                startTime: {
                    gte: shiftStart,
                    lt: shiftEnd
                }
            },
            include: {
                // Traemos datos vitales del usuario y la mesa en la misma consulta
                user: { select: { name: true, alias: true, email: true, isActive: true } },
                table: { select: { number: true } }
            },
            orderBy: [
                { startTime: 'asc' },
                { table: { number: 'asc' } }
            ]
        });

        res.status(200).json({ data: bookings });
    } catch (error) {
        console.error('Error consultando el turno:', error);
        res.status(500).json({ error: 'Error interno al obtener las reservas del turno.' });
    }
};

// 2. Actualizar estado: Tarjeta Roja (No-Show) y Redención (Completed)
const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const booking = await prisma.booking.findUnique({ where: { id }, include: { user: true } });
        if (!booking) return res.status(404).json({ error: 'Reserva no encontrada.' });

        const result = await prisma.$transaction(async (tx) => {
            let reason = null;
            if (status === 'CANCELLED') reason = 'Cancelada por el Administrador (Perdonazo)';
            if (status === 'NO_SHOW') reason = 'Tarjeta Roja (No se presentó)';

            await tx.booking.update({
                where: { id },
                data: {
                    status,
                    ...(reason && { cancellationReason: reason })
                }
            });

            // REGLA: TARJETA ROJA DIRECTA (NO_SHOW)
            if (status === 'NO_SHOW') {
                await tx.user.update({
                    where: { id: booking.userId },
                    data: { noShowCount: booking.user.noShowCount + 1, isActive: false, totalNoShows: { increment: 1 } }
                });
                await tx.booking.updateMany({
                    where: { userId: booking.userId, status: 'CONFIRMED', startTime: { gt: new Date() } },
                    data: { status: 'CANCELLED' }
                });
                return { banned: true, message: '¡Tarjeta Roja! El usuario no se presentó y fue suspendido del sistema.' };
            }

            // REGLA DE REDENCIÓN: Si llegó (COMPLETED), le perdonamos 1 Strike de cancelación tardía
            else if (status === 'COMPLETED') {
                if (booking.user.cancelCount > 0) {
                    await tx.user.update({
                        where: { id: booking.userId },
                        data: { cancelCount: { decrement: 1 } }
                    });
                    return { banned: false, message: 'Cliente llegó. Se le perdonó 1 Strike por su asistencia.' };
                }
                return { banned: false, message: 'Reserva completada con éxito.' };
            }

            return { banned: false, message: 'Estado actualizado correctamente.' };
        });

        res.status(200).json(result);
    } catch (error) {
        res.status(500).json({ error: 'Error interno.' });
    }
};

// 3. Obtener usuarios (Ahora expone los Strikes al frontend)
const getUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true, name: true, alias: true, email: true, role: true, isActive: true,
                cancelCount: true, // LOS STRIKES
                noShowCount: true, // LAS TARJETAS ROJAS
                totalBans: true, // PRONTUARIO: Baneos acumulados
                totalNoShows: true, // PRONTUARIO: No-Shows acumulados
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ data: users });
    } catch (error) {
        console.error('Error interno al obtener usuarios:', error);
        res.status(500).json({ error: 'Error interno al obtener usuarios.' });
    }
};

// 4. Activar o Desactivar (Banear) a un usuario
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const targetUser = await prisma.user.findUnique({ where: { id } });

        if (!targetUser) return res.status(404).json({ error: 'Usuario no encontrado.' });
        if (targetUser.role === 'ADMIN') return res.status(403).json({ error: 'No puedes desactivar a un Administrador.' });

        const newStatus = !targetUser.isActive;

        // Usamos una transacción para banear al usuario Y cancelar sus reservas futuras al mismo tiempo
        const [updatedUser, cancelledBookings] = await prisma.$transaction([
            // Acción 1: Cambiar estado del usuario
            prisma.user.update({
                where: { id },
                data: {
                    isActive: newStatus,
                    // Al REACTIVAR: borrón y cuenta nueva + acumular en prontuario
                    ...(newStatus === true && {
                        cancelCount: 0,
                        noShowCount: 0,
                        totalBans: { increment: 1 }
                    })
                }
            }),
            // Acción 2: Si lo estamos baneando (newStatus === false), cancelamos sus reservas futuras
            ...(newStatus === false ? [
                prisma.booking.updateMany({
                    where: {
                        userId: id,
                        status: 'CONFIRMED',
                        startTime: { gt: new Date() } // Solo las que aún no ocurren
                    },
                    data: { status: 'CANCELLED' }
                })
            ] : [])
        ]);

        res.status(200).json({
            message: `Usuario ${newStatus ? 'reactivado' : 'desactivado'}. ${!newStatus ? 'Sus reservas futuras fueron canceladas.' : ''}`,
            user: { id: updatedUser.id, isActive: updatedUser.isActive }
        });

    } catch (error) {
        console.error('Error actualizando estado del usuario:', error);
        res.status(500).json({ error: 'Error interno al modificar el estado del usuario.' });
    }
};

// 5. Activar o Desactivar (Mantención) una Mesa de Pool
const toggleTableStatus = async (req, res) => {
    try {
        const { id } = req.params;

        // Buscamos la mesa actual
        const table = await prisma.poolTable.findUnique({ where: { id } });
        if (!table) return res.status(404).json({ error: 'Mesa no encontrada.' });

        // Invertimos su estado
        const updatedTable = await prisma.poolTable.update({
            where: { id },
            data: { isActive: !table.isActive }
        });

        res.status(200).json({
            message: `Mesa ${updatedTable.number} ${updatedTable.isActive ? 'operativa' : 'en mantención'}.`,
            data: updatedTable
        });
    } catch (error) {
        console.error('Error actualizando mesa:', error);
        res.status(500).json({ error: 'Error interno al modificar el estado de la mesa.' });
    }
};

// 6. Reseteo manual de contraseña (Emergencia)
const resetUserPassword = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificamos que el usuario exista y no sea otro Admin
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
        if (user.role === 'ADMIN') return res.status(403).json({ error: 'No puedes resetear la clave de otro administrador.' });

        // La clave temporal definida por el negocio
        const newPassword = 'Bola9Temporal!';
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id },
            data: { password: hashedPassword, mustChangePassword: true }
        });

        res.status(200).json({
            message: `¡Clave reseteada exitosamente! Dile al cliente que ingrese con la contraseña temporal: ${newPassword}`
        });
    } catch (error) {
        console.error('Error reseteando clave:', error);
        res.status(500).json({ error: 'Error interno al resetear la contraseña.' });
    }
};

// 7. Historial de reservas de un usuario específico
const getUserBookings = async (req, res) => {
    try {
        const { id } = req.params;

        const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

        const bookings = await prisma.booking.findMany({
            where: { userId: id },
            include: {
                table: { select: { number: true } }
            },
            orderBy: { startTime: 'desc' }
        });

        res.status(200).json({ data: bookings });
    } catch (error) {
        console.error('Error obteniendo historial de reservas:', error);
        res.status(500).json({ error: 'Error interno al obtener el historial de reservas.' });
    }
};

// 8. Obtener fechas que tienen reservas (para el calendario del admin)
const getBookingDates = async (req, res) => {
    try {
        const since = dayjs().subtract(90, 'day').toDate();
        const bookings = await prisma.booking.findMany({
            where: { startTime: { gte: since } },
            select: { startTime: true },
            distinct: ['startTime']
        });

        // Extraer fechas únicas en formato YYYY-MM-DD
        const dateSet = new Set(bookings.map(b => dayjs(b.startTime).format('YYYY-MM-DD')));
        res.status(200).json({ data: [...dateSet].sort() });
    } catch (error) {
        console.error('Error obteniendo fechas con reservas:', error);
        res.status(500).json({ error: 'Error interno.' });
    }
};

module.exports = {
    getDailyShiftBookings,
    updateBookingStatus,
    getUsers,
    getUserBookings,
    getBookingDates,
    toggleUserStatus,
    toggleTableStatus,
    resetUserPassword
};