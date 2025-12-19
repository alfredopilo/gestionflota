# Configuración de Docker - Sistema de Control de Flotas

## ⚠️ Problema Actual

Hay un problema temporal al construir las imágenes Docker debido a la descarga de los engines de Prisma. Esto puede ser un problema de red o temporal.

## 🚀 Solución Recomendada para Desarrollo

Para desarrollo, **no necesitas construir las imágenes Docker**. Puedes ejecutar los servicios directamente:

### Opción 1: Ejecutar servicios directamente (Recomendado para desarrollo)

1. **Base de datos y Redis (Docker)**:
   ```bash
   cd c:\Cursorcode\Gestiondeflota
   docker-compose up -d postgres redis
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

## 🔧 Para Producción (cuando la red esté estable)

Si necesitas construir las imágenes para producción, intenta:

1. **Verificar conexión a internet**
2. **Usar un mirror de npm** (si es necesario):
   ```bash
   npm config set registry https://registry.npmjs.org/
   ```

3. **Construir con más tiempo de espera**:
   ```bash
   docker-compose build --progress=plain --no-cache api
   ```

4. **O construir manualmente cada servicio**:
   ```bash
   docker build -t gestiondeflota-api ./apps/api -f Dockerfile.dev
   ```

## 📝 Estado Actual

- ✅ PostgreSQL: Corriendo en puerto 5432
- ✅ Redis: Corriendo en puerto 6379
- ⚠️ API: Problema al construir imagen (pero puedes ejecutarlo localmente)
- ⚠️ Web: Problema al construir imagen (pero puedes ejecutarlo localmente)

## 🎯 Recomendación

**Para desarrollo**, usa la **Opción 1** (servicios locales + Docker solo para DB/Redis). Es más rápido y evita problemas de build.

**Para producción**, resuelve el problema de red y construye las imágenes cuando sea necesario.
