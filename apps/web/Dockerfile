FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Asegurar que public existe antes del build
RUN mkdir -p /app/public

# Next.js: las variables NEXT_PUBLIC_* se inyectan en build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Copiar archivos de Next.js
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copiar public (ya existe porque lo creamos en builder)
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
