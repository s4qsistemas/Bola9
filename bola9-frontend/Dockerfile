# Etapa 1: Build de la aplicación React con Vite
FROM node:20-bookworm-slim AS build

WORKDIR /app

# Copiar archivos de dependencias
COPY package.json package-lock.json* ./

# Instalar dependencias
RUN npm ci

# Copiar el código fuente y compilar
COPY . .
RUN npm run build

# Etapa 2: Servidor Nginx
FROM nginx:alpine

# Copiar la build generada a la carpeta de nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar el archivo de configuración personalizado
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Exponer el puerto 80 (dentro del contenedor)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
