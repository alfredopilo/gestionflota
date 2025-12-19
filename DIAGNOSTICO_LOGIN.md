# Diagnóstico de Problemas de Login

## Problema Reportado
"No puedo iniciar sesión y no da ningún error"

## Soluciones Implementadas

### 1. Mejorado el logging en el componente de login
Se agregaron logs en la consola del navegador para facilitar el diagnóstico.

### 2. Mejorado el manejo de errores
Ahora el componente muestra mensajes de error más específicos.

### 3. Mejorada la configuración de CORS
Se actualizó la configuración de CORS en el backend para permitir todas las peticiones necesarias.

## Pasos para Diagnosticar

### 1. Abre la Consola del Navegador
1. Presiona `F12` o `Ctrl+Shift+I`
2. Ve a la pestaña **"Consola"** (Console)
3. Ve a la pestaña **"Red"** (Network) también

### 2. Intenta Iniciar Sesión
1. Ingresa las credenciales:
   - Email: `admin@example.com`
   - Password: `admin123`
2. Haz clic en "Iniciar sesión"

### 3. Revisa los Logs en la Consola
Deberías ver mensajes como:
- `Intentando login con: { email: "admin@example.com" }`
- Si hay error: `Error en login: ...`

### 4. Revisa la Pestaña "Red" (Network)
1. Filtra por "login" o busca la petición a `/api/v1/auth/login`
2. Haz clic en la petición
3. Revisa:
   - **Status**: Debe ser 200 (éxito) o un código de error
   - **Headers**: Verifica que la URL sea correcta
   - **Response**: Debe contener `accessToken` y `refreshToken`

### 5. Verifica la URL del API
En la consola del navegador, ejecuta:
```javascript
console.log('API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001');
```

Debería mostrar: `http://localhost:3001`

## Posibles Problemas y Soluciones

### Problema 1: Error de CORS
**Síntoma**: En la pestaña "Red", ves un error de CORS o "Preflight request failed"

**Solución**: 
- Verifica que el backend esté corriendo en `http://localhost:3001`
- Verifica que el frontend esté corriendo en `http://localhost:3000`

### Problema 2: Error de Conexión
**Síntoma**: En la consola ves "ERR_NETWORK" o "ECONNREFUSED"

**Solución**:
- Verifica que el backend esté corriendo:
  ```powershell
  Invoke-WebRequest -Uri http://localhost:3001/api/v1/health
  ```
- Reinicia el backend si es necesario:
  ```bash
  cd apps/api
  npm run start:dev
  ```

### Problema 3: Error 401 (No autorizado)
**Síntoma**: La petición devuelve status 401

**Solución**:
- Verifica las credenciales:
  - Email: `admin@example.com`
  - Password: `admin123`
- Verifica que el seed se haya ejecutado:
  ```bash
  cd apps/api
  npm run prisma:seed
  ```

### Problema 4: Error 404 (No encontrado)
**Síntoma**: La petición devuelve status 404

**Solución**:
- Verifica que la URL sea correcta: `http://localhost:3001/api/v1/auth/login`
- Verifica que el backend tenga el prefijo correcto

### Problema 5: El botón no hace nada
**Síntoma**: Al hacer clic, no pasa nada

**Solución**:
- Verifica la consola por errores de JavaScript
- Asegúrate de que el formulario tenga el evento `onSubmit` correcto
- Verifica que los campos `email` y `password` tengan valores

## Comandos Útiles

### Verificar que el backend responda
```powershell
Invoke-WebRequest -Uri http://localhost:3001/api/v1/health
```

### Probar login desde PowerShell
```powershell
$body = @{ email = 'admin@example.com'; password = 'admin123' } | ConvertTo-Json
Invoke-WebRequest -Uri http://localhost:3001/api/v1/auth/login -Method POST -Body $body -ContentType 'application/json'
```

### Ver logs del backend
Los logs del backend están en la terminal donde ejecutaste `npm run start:dev` en `apps/api`

### Ver logs del frontend
Los logs del frontend están en la terminal donde ejecutaste `npm run dev` en `apps/web`

## Información de Contacto

Si el problema persiste después de seguir estos pasos, proporciona:
1. Captura de pantalla de la consola del navegador (pestaña Consola y Red)
2. Los mensajes de error que aparecen
3. El status code de la petición en la pestaña Red
