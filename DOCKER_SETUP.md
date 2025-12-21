# Configuración de Docker - Sistema de Control de Flotas

## ✅ Producción / VPS (Docker completo) — Recomendado

### 1) Variables de entorno

En la raíz del proyecto:

```bash
cp env.example .env
```

Edita `.env` y define al menos:

```bash
FRONTEND_URL=http://TU_IP_O_DOMINIO:4000
NEXT_PUBLIC_API_URL=http://TU_IP_O_DOMINIO:4001
POSTGRES_USER=postgres
POSTGRES_PASSWORD=TU_PASSWORD_REAL
POSTGRES_DB=gestiondeflota
JWT_SECRET=CAMBIA_ESTE_SECRET
JWT_REFRESH_SECRET=CAMBIA_ESTE_SECRET
```

### 2) Build + Up

**Importante**: Next.js “hornea” `NEXT_PUBLIC_API_URL` en build, por eso debes reconstruir `web` cuando cambies `.env`.

```bash
docker compose down
docker compose build --no-cache web api
docker compose up -d
docker compose ps
```

### 3) Migraciones + Seed

```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run prisma:seed
```

### 4) URLs

- Frontend: `http://TU_IP_O_DOMINIO:4000`
- API: `http://TU_IP_O_DOMINIO:4001`
- Swagger: `http://TU_IP_O_DOMINIO:4001/api/docs`

### 5) Problemas típicos

- **Login da 500**: normalmente faltan migraciones/seed → corre el paso 3.
- **Auth DB (P1000)**: cambiaste password luego de crear el volumen → para “reset”:

```bash
docker compose down -v
docker compose up -d
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run prisma:seed
```

## 🧪 Desarrollo (mixto) — DB/Redis en Docker + Apps local

### Opción 1: Ejecutar servicios directamente (Recomendado para desarrollo)

1. **Base de datos y Redis (Docker)**:
   ```bash
   docker compose up -d postgres redis
   ```

2. **Backend (localmente)**:
   ```bash
   cd apps/api
   npm install
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   npm run start:dev
   ```

3. **Frontend (localmente)**:
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```

### Opción 2: Usar Docker Compose para desarrollo (con volúmenes)

El `docker-compose.yml` está configurado para desarrollo con volúmenes. Sin embargo, necesita que las dependencias estén instaladas localmente primero.

1. **Instalar dependencias localmente primero**:
   ```bash
   # Backend
   cd apps/api
   npm install
   npx prisma generate

   # Frontend
   cd ../web
   npm install
   ```

2. **Luego iniciar con Docker Compose**:
   ```bash
   cd ../..
   docker-compose up -d
   ```

## 🎯 Recomendación

- **VPS/Producción**: usar el flujo “Docker completo” de arriba.
- **Desarrollo**: usar el flujo “mixto” (DB/Redis en Docker + apps local).
