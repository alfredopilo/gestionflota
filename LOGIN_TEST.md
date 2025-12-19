# Test de Login - Sistema de Control de Flotas

## ✅ Estado Actual

El backend se ha compilado exitosamente y está iniciando.

## 🔐 Credenciales de Acceso

- **URL Frontend**: http://localhost:3000
- **Email**: admin@example.com
- **Contraseña**: admin123

## 📝 Pasos para Iniciar Sesión

1. **Asegúrate de que el backend esté corriendo**:
   - Verifica: http://localhost:3001/api/v1/health
   - Debe mostrar: `{"status":"ok","timestamp":"..."}`

2. **Abre tu navegador**:
   - Ve a: http://localhost:3000
   - Serás redirigido a `/login` si no estás autenticado

3. **Ingresa las credenciales**:
   - Email: `admin@example.com`
   - Contraseña: `admin123`

4. **Después del login exitoso**:
   - Serás redirigido a `/dashboard`
   - Verás los KPIs del sistema

## 🔍 Verificar que Todo Funciona

### Backend Health Check
```bash
curl http://localhost:3001/api/v1/health
```

### Test de Login (PowerShell)
```powershell
$body = @{
    email = 'admin@example.com'
    password = 'admin123'
} | ConvertTo-Json

Invoke-WebRequest -Uri http://localhost:3001/api/v1/auth/login `
    -Method POST `
    -Body $body `
    -ContentType 'application/json'
```

### Swagger Documentation
Abre en navegador: http://localhost:3001/api/docs

Aquí puedes probar todos los endpoints directamente.

## ⚠️ Si No Puedes Iniciar Sesión

1. **Verifica que el backend esté corriendo**:
   - Debe estar escuchando en puerto 3001
   - Revisa la consola donde ejecutaste `npm run start:dev`

2. **Verifica la consola del navegador** (F12):
   - Busca errores de red o CORS
   - Verifica que las peticiones vayan a `http://localhost:3001/api/v1/auth/login`

3. **Verifica que el seed se ejecutó**:
   ```bash
   cd apps/api
   npm run prisma:seed
   ```

4. **Revisa los logs del backend**:
   - Debe mostrar errores si los hay
   - Busca mensajes de conexión a la base de datos

## 🎯 URLs Importantes

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api/v1
- Swagger Docs: http://localhost:3001/api/docs
- Health Check: http://localhost:3001/api/v1/health
