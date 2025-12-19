# 🚀 Ejecutar Servicios - Sistema de Control de Flotas

## ✅ Estado Actual

- ✅ **PostgreSQL**: Corriendo en Docker (puerto 5432)
- ✅ **Redis**: Corriendo en Docker (puerto 6379)
- ⚠️ **API y Web**: Problema al construir imágenes Docker (problema de red con Prisma)

## 📋 Solución: Ejecutar Backend y Frontend Localmente

### Paso 1: Verificar que PostgreSQL y Redis estén corriendo

```bash
docker ps
```

Debes ver:
- `gestiondeflota-postgres` (healthy)
- `gestiondeflota-redis` (healthy)

### Paso 2: Iniciar Backend (Terminal 1)

```bash
cd c:\Cursorcode\Gestiondeflota\apps\api

# Verificar que las dependencias estén instaladas
npm install

# Generar cliente de Prisma (ya debería estar generado)
npx prisma generate

# Ejecutar migraciones (si no se han ejecutado)
npx prisma migrate dev

# Ejecutar seed (si no se ha ejecutado)
npm run prisma:seed

# Iniciar servidor en modo desarrollo
npm run start:dev
```

Espera hasta ver:
```
🚀 Application is running on: http://localhost:3001
📚 Swagger documentation: http://localhost:3001/api/docs
```

### Paso 3: Iniciar Frontend (Terminal 2 - Nueva terminal)

```bash
cd c:\Cursorcode\Gestiondeflota\apps\web

# Verificar que las dependencias estén instaladas
npm install

# Iniciar servidor de desarrollo
npm run dev
```

Espera hasta ver:
```
- Local:        http://localhost:3000
```

### Paso 4: Acceder a la Aplicación

1. Abre tu navegador
2. Ve a: **http://localhost:3000**
3. Ingresa las credenciales:
   - **Email**: `admin@example.com`
   - **Contraseña**: `admin123`

## 🔍 Verificar que Todo Funciona

### Backend Health Check
```bash
curl http://localhost:3001/api/v1/health
```

O en PowerShell:
```powershell
Invoke-WebRequest -Uri http://localhost:3001/api/v1/health
```

Debe devolver: `{"status":"ok","timestamp":"..."}`

### Swagger Documentation
Abre en navegador: **http://localhost:3001/api/docs**

Aquí puedes probar todos los endpoints directamente.

## 📊 URLs Importantes

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api/v1
- **Swagger Docs**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/api/v1/health

## ⚠️ Nota sobre Docker

El problema al construir las imágenes Docker es temporal (relacionado con la descarga de engines de Prisma). Para desarrollo, **es mejor ejecutar los servicios localmente** y usar Docker solo para PostgreSQL y Redis, que ya están corriendo.

Para producción, cuando necesites construir las imágenes Docker, asegúrate de tener una conexión estable a internet y reintenta.

## 🛠️ Si Hay Problemas

### Backend no inicia

1. Verifica que PostgreSQL esté corriendo:
   ```bash
   docker ps --filter "name=postgres"
   ```

2. Verifica el archivo `.env` en `apps/api/`:
   - Debe tener `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gestiondeflota`

3. Verifica que las migraciones se hayan ejecutado:
   ```bash
   cd apps/api
   npx prisma migrate status
   ```

### Frontend no se conecta al backend

1. Verifica que el backend esté corriendo en puerto 3001
2. Abre la consola del navegador (F12) y revisa errores
3. Verifica que `NEXT_PUBLIC_API_URL` esté configurado en `apps/web/.env.local` (opcional, por defecto usa http://localhost:3001)
