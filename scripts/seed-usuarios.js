const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando el sembrado de la base de datos...');

    // 1. Crear el usuario Administrador
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
        where: { email: 'admin@bola9.cl' },
        update: {},
        create: {
            email: 'admin@bola9.cl',
            password: hashedAdminPassword,
            name: 'Administrador Principal',
            alias: 'Admin',
            role: 'ADMIN',
            isActive: true,
        },
    });
    console.log(`✅ Administrador asegurado: ${admin.email}`);

    // 2. Crear el Cliente de Prueba
    const hashedClientPassword = await bcrypt.hash('123456', 10);
    const cliente = await prisma.user.upsert({
        where: { email: 'cliente@bola9.cl' },
        update: {},
        create: {
            email: 'cliente@bola9.cl',
            password: hashedClientPassword,
            name: 'Cliente Prueba',
            alias: 'test',
            role: 'USER',
            isActive: true,
            // cancelCount y noShowCount se inician en 0 automáticamente por defecto
        },
    });
    console.log(`✅ Cliente de prueba asegurado: ${cliente.email}`);

    // 3. Crear las 6 mesas de pool
    for (let i = 1; i <= 6; i++) {
        await prisma.poolTable.upsert({
            where: { number: i },
            update: {},
            create: {
                number: i,
                isActive: true
            },
        });
    }
    console.log('✅ 6 Mesas de pool configuradas');

    // 4. Establecer Horario de Apertura Base (Lunes a Domingo, 18:00 a 02:00)
    for (let i = 0; i <= 6; i++) {
        await prisma.businessHour.upsert({
            where: { dayOfWeek: i },
            update: {},
            create: {
                dayOfWeek: i,
                isOpen: true,
                openTime: '18:00',
                closeTime: '02:00'
            }
        });
    }
    console.log('✅ Horarios de negocio base (18:00 a 02:00) establecidos');
}

main()
    .catch((e) => {
        console.error('❌ Error fatal durante el sembrado:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });