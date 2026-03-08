const { PrismaClient } = require('@prisma/client');
const dayjs = require('dayjs');
const isSameOrAfter = require('dayjs/plugin/isSameOrAfter');
dayjs.extend(isSameOrAfter);

const prisma = new PrismaClient();

const getAvailability = async (req, res) => {
    try {
        const { date, tableId } = req.query;

        if (!date || !tableId) {
            return res.status(400).json({ error: 'Se requiere la fecha (YYYY-MM-DD) y el ID de la mesa.' });
        }

        const targetDate = dayjs(date);
        const dayOfWeek = targetDate.day(); // 0 = Domingo, 1 = Lunes, etc.

        // 1. Verificar si hay un bloqueo duro (ClosedDate)
        const isClosed = await prisma.closedDate.findFirst({
            where: { date: new Date(date + 'T12:00:00Z') }
        });

        if (isClosed) {
            return res.status(200).json({ availableSlots: [], message: `Local cerrado: ${isClosed.reason}` });
        }

        // 2. Obtener el horario base del día de la semana
        const businessHour = await prisma.businessHour.findUnique({
            where: { dayOfWeek }
        });

        if (!businessHour || !businessHour.isOpen) {
            return res.status(200).json({ availableSlots: [], message: 'El local no abre este día de la semana.' });
        }

        // 3. Generar todos los bloques posibles (ej. de 18:00 a 02:00)
        let currentTime = dayjs(`${date} ${businessHour.openTime}`);
        let closeTime = dayjs(`${date} ${businessHour.closeTime}`);

        // Si la hora de cierre es menor a la de apertura (ej. 02:00 vs 18:00), cruzamos la medianoche
        if (closeTime.isBefore(currentTime)) {
            closeTime = closeTime.add(1, 'day');
        }

        const allSlots = [];
        while (currentTime.isBefore(closeTime)) {
            allSlots.push(currentTime.format('YYYY-MM-DD HH:mm'));
            currentTime = currentTime.add(1, 'hour'); // La granularidad será de 1 hora
        }

        // 4. Buscar las reservas existentes para esa mesa en ese rango de tiempo
        const existingBookings = await prisma.booking.findMany({
            where: {
                tableId,
                status: 'CONFIRMED',
                startTime: { gte: dayjs(`${date} ${businessHour.openTime}`).toDate() },
                endTime: { lte: closeTime.toDate() }
            }
        });

        // Extraer solo las horas de inicio de las reservas ocupadas
        const bookedSlots = existingBookings.map(b => dayjs(b.startTime).format('YYYY-MM-DD HH:mm'));

        // 5. Filtrar: Dejar solo los bloques que NO están en bookedSlots
        // y que sean mayores a la hora actual (para no reservar en el pasado si buscan "hoy")
        const now = dayjs();
        const availableSlots = allSlots.filter(slot => {
            const isFuture = dayjs(slot).isSameOrAfter(now);
            const isFree = !bookedSlots.includes(slot);
            return isFuture && isFree;
        });

        res.status(200).json({
            date,
            tableId,
            availableSlots,
            pricePerHour: businessHour.pricePerHour || 0
        });

    } catch (error) {
        console.error('Error calculando disponibilidad:', error);
        res.status(500).json({ error: 'Error interno al calcular horarios.' });
    }
};

const createBooking = async (req, res) => {
    try {
        const { tableId, startTime } = req.body;
        const userId = req.user.id; // Viene inyectado por el middleware verifyToken

        if (!tableId || !startTime) {
            return res.status(400).json({ error: 'Faltan datos: tableId y startTime son obligatorios.' });
        }

        const start = dayjs(startTime);
        // Regla de negocio dura: Todas las reservas duran exactamente 1 hora.
        // Si quieres que duren más, el usuario debe hacer dos reservas consecutivas.
        const end = start.add(1, 'hour');

        // Verificación básica: No reservar en el pasado
        if (start.isBefore(dayjs())) {
            return res.status(400).json({ error: 'No puedes realizar una reserva en el pasado.' });
        }

        // INICIO DE LA TRANSACCIÓN CRÍTICA
        const result = await prisma.$transaction(async (tx) => {

            // 1. Bloquear y verificar solapamientos (Overlaps)
            const conflictingBooking = await tx.booking.findFirst({
                where: {
                    tableId,
                    status: 'CONFIRMED',
                    // Lógica de solapamiento de tiempo
                    AND: [
                        { startTime: { lt: end.toDate() } },
                        { endTime: { gt: start.toDate() } }
                    ]
                }
            });

            // Si existe un conflicto, abortamos la transacción lanzando un error
            if (conflictingBooking) {
                throw new Error('SLOT_TAKEN');
            }

            // 2. Si no hay conflicto, creamos la reserva
            const newBooking = await tx.booking.create({
                data: {
                    userId,
                    tableId,
                    startTime: start.toDate(),
                    endTime: end.toDate(),
                    status: 'CONFIRMED'
                }
            });

            return newBooking;
        });

        res.status(201).json({
            message: 'Reserva confirmada con éxito.',
            booking: result
        });

    } catch (error) {
        if (error.message === 'SLOT_TAKEN') {
            // 409 Conflict es el código HTTP correcto para este escenario
            return res.status(409).json({ error: 'Ese horario ya fue reservado por otra persona. Actualiza la disponibilidad.' });
        }

        console.error('Error creando la reserva:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar la reserva.' });
    }
};

// Obtener las reservas del usuario logueado (Para su panel "Mis Reservas")
const getMyBookings = async (req, res) => {
    try {
        const userId = req.user.id;

        // 1. Buscamos sus reservas
        const myBookings = await prisma.booking.findMany({
            where: { userId },
            include: { table: { select: { number: true } } },
            orderBy: { startTime: 'desc' }
        });

        // 2. Buscamos su reputación (Strikes y Tarjetas Rojas)
        const userStats = await prisma.user.findUnique({
            where: { id: userId },
            select: { cancelCount: true, noShowCount: true }
        });

        res.status(200).json({ data: myBookings, stats: userStats });
    } catch (error) {
        console.error('Error obteniendo mis reservas:', error);
        res.status(500).json({ error: 'Error interno al obtener tus reservas.' });
    }
};

// Cancelación por parte del CLIENTE (Con reglas de 120 y 30 minutos)
const cancelMyBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const booking = await prisma.booking.findUnique({ where: { id } });
        if (!booking) return res.status(404).json({ error: 'Reserva no encontrada.' });
        if (booking.userId !== userId) return res.status(403).json({ error: 'No tienes permiso.' });
        if (booking.status !== 'CONFIRMED') return res.status(400).json({ error: 'Solo puedes cancelar reservas confirmadas.' });

        // Evaluación de tiempos
        const now = dayjs();
        const startTime = dayjs(booking.startTime);
        const minutesDiff = startTime.diff(now, 'minute');

        // REGLA 1: Bloqueo absoluto (Menos de 30 min)
        if (minutesDiff < 30) {
            return res.status(400).json({ error: 'Ya pasó el tiempo límite. No puedes cancelar faltando menos de 30 minutos.' });
        }

        // REGLA 2: Determinar si es "Cancelación Tardía" (Menos de 2 horas / 120 minutos)
        const isLateCancel = minutesDiff < 120;

        const result = await prisma.$transaction(async (tx) => {
            await tx.booking.update({
                where: { id },
                data: {
                    status: 'CANCELLED',
                    cancellationReason: isLateCancel ? 'Cancelada fuera de plazo (Strike)' : 'Cancelada con anticipación por el usuario'
                }
            });

            if (isLateCancel) {
                // Sumamos un Strike por cancelar tarde
                const updatedUser = await tx.user.update({
                    where: { id: userId },
                    data: { cancelCount: { increment: 1 } }
                });

                // Si llegó a 3 Strikes, lo baneamos
                if (updatedUser.cancelCount >= 3) {
                    await tx.user.update({ where: { id: userId }, data: { isActive: false } });
                    await tx.booking.updateMany({
                        where: { userId, status: 'CONFIRMED', startTime: { gt: new Date() } },
                        data: { status: 'CANCELLED' }
                    });
                    return { autoBanned: true, isLateCancel: true };
                }
                return { autoBanned: false, isLateCancel: true, newCancelCount: updatedUser.cancelCount };
            }

            // Cancelación Temprana (> 2 hrs), no sumamos Strikes
            return { autoBanned: false, isLateCancel: false };
        });

        if (result.autoBanned) {
            res.status(200).json({ autoBanned: true, strikeCount: 3, message: '¡Strike 3! Reserva cancelada. Acumulaste 3 Strikes por cancelaciones tardías. Tu cuenta ha sido suspendida según las políticas de uso.' });
        } else if (result.isLateCancel) {
            res.status(200).json({ autoBanned: false, strikeCount: result.newCancelCount, message: `Strike ${result.newCancelCount} de 3. Reserva cancelada. Se te aplicó 1 Strike por cancelar con menos de 2 horas de anticipación.` });
        } else {
            res.status(200).json({ autoBanned: false, strikeCount: null, message: 'Reserva cancelada con éxito a tiempo. ¡Gracias por avisar!' });
        }

    } catch (error) {
        console.error('Error en autocancelación:', error);
        res.status(500).json({ error: 'Error interno al procesar la cancelación.' });
    }
};

module.exports = {
    getAvailability,
    createBooking,
    getMyBookings,
    cancelMyBooking
};