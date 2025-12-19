FROM node:18-slim

# Instalar dependencias necesarias (incluyendo herramientas de compilación para bcrypt)
RUN apt-get update && apt-get install -y \
    openssl \
    ca-certificates \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Configurar npm para mejor manejo de red y timeouts
ENV npm_config_fetch_timeout=300000
ENV npm_config_fetch_retries=5
ENV npm_config_fetch_retry_factor=10
ENV npm_config_fetch_retry_mintimeout=10000
ENV npm_config_fetch_retry_maxtimeout=60000

COPY package*.json ./

# Instalar todas las dependencias (incluyendo dev) para poder generar Prisma
# Con reintentos explícitos y configuración de red mejorada
RUN npm ci --prefer-offline --no-audit || npm ci --prefer-offline --no-audit || npm ci --prefer-offline --no-audit

COPY . .

# Eliminar bcrypt precompilado y reconstruirlo para la arquitectura del contenedor
RUN rm -rf node_modules/bcrypt/lib/binding
RUN npm rebuild bcrypt --build-from-source

# Generar cliente de Prisma
RUN npx prisma generate

# Construir la aplicación
RUN npm run build

EXPOSE 4001

# Comando por defecto (puede ser sobrescrito por docker-compose)
CMD ["npm", "run", "start:prod"]
