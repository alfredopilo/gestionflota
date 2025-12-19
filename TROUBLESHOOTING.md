# Solución de Problemas - Sistema de Control de Flotas

## Problema: No puedo iniciar sesión

### Diagnóstico

El backend no está corriendo. Para iniciar sesión, necesitas que ambos servicios (frontend y backend) estén activos.

### Solución

#### 1. Verificar estado de servicios

```bash
# Verificar Docker (PostgreSQL y Redis)
docker ps --filter "name=gestiondeflota"

# Verificar puertos
netstat -ano | findstr ":3000"  # Frontend
netstat -ano | findstr ":3001"  # Backend
```

#### 2. Iniciar Backend

```bash
cd c:\Cursorcode\Gestiondeflota\apps\api
npm run start:dev
```

Espera a que veas el mensaje:
```
🚀 Application is running on: http://localhost:3001
📚 Swagger documentation: http://localhost:3001/api/docs
```

#### 3. Iniciar Frontend (si no está corriendo)

En otra terminal:
```bash
cd c:\Cursorcode\Gestiondeflota\apps\web
npm run dev
```

#### 4. Credenciales de acceso

- **URL**: http://localhost:3000
- **Email**: admin@example.com
- **Contraseña**: admin123

### Problemas Comunes

#### Error: "No es posible conectar con el servidor remoto"

**Causa**: El backend no está corriendo.

**Solución**: Inicia el backend con `npm run start:dev` en `apps/api`

#### Error: "Invalid credentials"

**Causa**: Usuario o contraseña incorrectos, o la base de datos no tiene el seed.

**Solución**: 
1. Verifica que PostgreSQL esté corriendo
2. Ejecuta el seed:
   ```bash
   cd apps/api
   npm run prisma:seed
   ```

#### Error: "ECONNREFUSED" o "Network Error"

**Causa**: El frontend no puede conectarse al backend.

**Solución**:
1. Verifica que el backend esté corriendo en puerto 3001
2. Verifica la variable de entorno `NEXT_PUBLIC_API_URL` en `.env.local` del frontend
3. Debe ser: `NEXT_PUBLIC_API_URL=http://localhost:3001`

#### El backend tarda mucho en iniciar

**Causa**: Primera vez compilando TypeScript.

**Solución**: Es normal, espera 1-2 minutos. En las siguientes veces será más rápido.

### Verificar que todo funciona

1. Backend Health Check:
   ```bash
   curl http://localhost:3001/api/v1/health
   ```
   Debe responder: `{"status":"ok","timestamp":"..."}`

2. Swagger Docs:
   Abre en navegador: http://localhost:3001/api/docs

3. Frontend:
   Abre en navegador: http://localhost:3000

### Comandos Útiles

```bash
# Reiniciar backend
cd apps/api
npm run start:dev

# Reiniciar frontend
cd apps/web
npm run dev

# Ver logs de Docker
docker logs gestiondeflota-postgres
docker logs gestiondeflota-redis

# Reiniciar servicios Docker
docker-compose restart postgres redis

# Verificar conexión a base de datos
cd apps/api
npx prisma studio
```

### Estado Actual del Sistema

- ✅ PostgreSQL: Corriendo (puerto 5432)
- ✅ Redis: Corriendo (puerto 6379)
- ⚠️ Backend API: Debe iniciarse manualmente
- ✅ Frontend: Corriendo (puerto 3000)

### Nota Importante

Los servicios deben iniciarse en terminales separadas o como procesos en segundo plano. El backend debe estar corriendo antes de intentar iniciar sesión en el frontend.
