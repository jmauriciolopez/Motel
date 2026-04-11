# Establece la imagen base
FROM node:24-alpine

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos necesarios
COPY package*.json ./
COPY build/ ./build/
COPY public/ ./public/

# Instala las dependencias
RUN npm install --production

# add app
COPY . ./
# Expone el puerto de la aplicación
EXPOSE 3000

# Establece el comando de inicio de la aplicación
CMD ["npm", "start"]
