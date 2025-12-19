# ✅ Servicios Activos - Sistema de Control de Flotas

## 🚀 Estado Actual

**Todos los servicios están corriendo correctamente:**

- ✅ **PostgreSQL**: Corriendo en Docker (puerto 5432)
- ✅ **Redis**: Corriendo en Docker (puerto 6379)
- ✅ **Backend API**: Corriendo en puerto 3001
- ✅ **Frontend Web**: Corriendo en puerto 3000

## 🌐 Acceso a la Aplicación

### Frontend
**URL**: http://localhost:3000

### Credenciales de Acceso
- **Email**: `admin@example.com`
- **Contraseña**: `admin123`

## 📚 Recursos Adicionales

### Swagger API Documentation
**URL**: http://localhost:3001/api/docs

Aquí puedes explorar y probar todos los endpoints de la API.

### Health Check
**URL**: http://localhost:3001/api/v1/health

Verifica el estado del backend.

## 🎯 Próximos Pasos

1. Abre tu navegador y ve a: **http://localhost:3000**
2. Inicia sesión con las credenciales proporcionadas
3. Explora el dashboard y las diferentes funcionalidades:
   - Dashboard con KPIs
   - Gestión de Vehículos
   - Control de Viajes
   - Mantenimientos
   - Inspecciones
   - Reportes

## 📝 Notas

- Los servicios están corriendo en segundo plano
- Para detener los servicios, usa `Ctrl+C` en las terminales correspondientes
- Para reiniciar, ejecuta nuevamente los comandos de inicio

## 🔧 Comandos Útiles

### Verificar servicios corriendo
```powershell
netstat -ano | findstr ":3000 :3001" | findstr "LISTENING"
```

### Probar login desde terminal
```powershell
$body = @{ email = 'admin@example.com'; password = 'admin123' } | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:3001/api/v1/auth/login -Method POST -Body $body -ContentType 'application/json'
```

### Ver logs del backend
Los logs están en la terminal donde se ejecutó `npm run start:dev`

### Ver logs del frontend
Los logs están en la terminal donde se ejecutó `npm run dev`
