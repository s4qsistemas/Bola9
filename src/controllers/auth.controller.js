const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const register = async (req, res) => {
    try {
        // Usamos 'let' para poder transformar el email
        let { email, password, name, alias } = req.body;

        // 1. Validar datos mínimos
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, contraseña y nombre son obligatorios.' });
        }

        // --- NORMALIZACIÓN VITAL ---
        // Convertimos a minúsculas estrictas y quitamos espacios al inicio/final
        email = email.toLowerCase().trim();

        // 2. Verificar que el correo no exista ya en la base de datos
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return res.status(400).json({ error: 'El correo ya está en uso.' });
        }

        // 3. Hashear la contraseña (CRÍTICO)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. Crear el usuario en la base de datos
        const newUser = await prisma.user.create({
            data: {
                email, // <- Ahora viaja 100% limpio y en minúsculas
                password: hashedPassword,
                name,
                alias: alias || null,
            },
        });

        // 5. Devolver respuesta limpia
        res.status(201).json({
            message: 'Usuario registrado exitosamente',
            user: {
                id: newUser.id,
                name: newUser.name,
                alias: newUser.alias,
                email: newUser.email,
                role: newUser.role,
            },
        });
    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

const login = async (req, res) => {
    try {
        // Usamos 'let' para poder transformar el email
        let { email, password } = req.body;

        // 1. Validación de entrada
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
        }

        // --- NORMALIZACIÓN VITAL ---
        // Protege contra logins fallidos por culpa del autocorrector del celular
        email = email.toLowerCase().trim();

        // 2. Buscar al usuario
        const user = await prisma.user.findUnique({
            where: { email }, // <- Prisma buscará siempre la versión en minúsculas
        });

        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // 3. Regla de negocio: ¿Está activo?
        if (!user.isActive) {
            return res.status(403).json({ error: 'Esta cuenta ha sido desactivada. Contacte al administrador.' });
        }

        // 4. Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // 5. Generar JWT
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role,
                alias: user.alias || user.name
            },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // 6. Respuesta limpia al frontend
        res.status(200).json({
            message: 'Login exitoso',
            token,
            user: {
                id: user.id,
                name: user.name,
                alias: user.alias,
                email: user.email,
                role: user.role,
                mustChangePassword: user.mustChangePassword,
            }
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
};

// 3. Forzar cambio de contraseña (se mantiene intacto)
const updatePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { newPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
                mustChangePassword: false
            }
        });

        res.status(200).json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
        console.error('Error actualizando contraseña:', error);
        res.status(500).json({ error: 'Error al actualizar la contraseña.' });
    }
};

module.exports = {
    register,
    login,
    updatePassword
};