# Guía Rápida para Iniciar los Servicios

## 🚀 Iniciar Todo el Sistema

### Paso 1: Verificar Docker (PostgreSQL y Redis)

```bash
docker ps --filter "name=gestiondeflota"
```

Si no están corriendo:
```bash
cd c:\Cursorcode\Gestiondeflota
docker-compose up -d postgres redis
```

### Paso 2: Iniciar Backend

Abre una terminal y ejecuta:
```bash
cd c:\Cursorcode\Gestiondeflota\apps\api
npm run start:dev
```

**Espera** hasta que veas:
```
🚀 Application is running on: http://localhost:3001
📚 Swagger documentation: http://localhost:3001/api/docs
```

### Paso 3: Iniciar Frontend

Abre **otra terminal** y ejecuta:
```bash
cd c:\Cursorcode\Gestiondeflota\apps\web
npm run dev
```

Verás:
```
- Local:        http://localhost:3000
```

### Paso 4: Acceder a la Aplicación

1. Abre tu navegador
2. Ve a: http://localhost:3000
3. Ingresa las credenciales:
   - **Email**: admin@example.com
   - **Contraseña**: admin123

## ⚠️ Importante

- El backend debe estar corriendo **antes** de intentar iniciar sesión
- La primera vez que inicias el backend puede tardar 1-2 minutos (compilación)
- Deja ambas terminales abiertas mientras uses la aplicación

## 🔧 Si hay Problemas

### Backend no inicia

1. Verifica que PostgreSQL esté corriendo:
   ```bash
   docker ps --filter "name=postgres"
   ```

2. Verifica el archivo `.env` en `apps/api/`:
   ```bash
   cd apps/api
   cat .env
   ```
   Debe tener `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gestiondeflota`

3. Verifica la conexión a la base de datos:
   ```bash
   cd apps/api
   npx prisma db push
   ```

### Frontend no se conecta al backend

1. Verifica que el backend esté corriendo en puerto 3001
2. Abre la consola del navegador (F12) y revisa errores
3. Verifica que `NEXT_PUBLIC_API_URL` esté configurado

## 📊 Estado de los Servicios

Para verificar rápidamente:
```bash
# Ver todos los servicios
docker ps
netstat -ano | findstr ":3000"
netstat -ano | findstr ":3001"

# Probar backend
curl http://localhost:3001/api/v1/health
```
