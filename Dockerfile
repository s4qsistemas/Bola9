# Usamos una imagen ligera de Node.js
FROM node:20-alpine

# Establecemos el directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de dependencias primero (para optimizar la caché de Docker)
COPY package.json package-lock.json* ./

# Instalamos las dependencias
RUN npm ci

# Copiamos la carpeta de Prisma y generamos el cliente
COPY prisma ./prisma/
RUN npx prisma generate

# Copiamos el resto del código fuente (la carpeta src, etc.)
COPY . .

# Exponemos el puerto que usa tu backend (ajusta el 3000 si usas otro)
EXPOSE 3000

# Comando para iniciar la aplicación (ajusta según los scripts de tu package.json)
CMD ["npm", "start"]