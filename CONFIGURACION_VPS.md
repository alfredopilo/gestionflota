# Configuración para VPS

## Variables de Entorno Necesarias

Para que la aplicación funcione correctamente en un VPS, necesitas configurar las siguientes variables de entorno:

### 1. Crear archivo `.env` en la raíz del proyecto:

```bash
# URL del frontend (puede ser múltiples URLs separadas por comas)
FRONTEND_URL=http://tu-dominio.com,https://tu-dominio.com

# URL de la API para el frontend
NEXT_PUBLIC_API_URL=http://tu-dominio.com:3001
# O si usas un dominio diferente para la API:
# NEXT_PUBLIC_API_URL=https://api.tu-dominio.com

# Base de datos
POSTGRES_USER=postgres
POSTGRES_PASSWORD=tu-password-seguro
POSTGRES_DB=gestiondeflota

# JWT Secrets (¡CAMBIA ESTOS VALORES!)
JWT_SECRET=tu-jwt-secret-super-seguro-aqui
JWT_REFRESH_SECRET=tu-refresh-secret-super-seguro-aqui

# Redis (si usas Redis externo)
REDIS_URL=redis://tu-redis:6379
```

### 2. Ejecutar con Docker Compose:

```bash
docker-compose up -d
```

### 3. Si usas Nginx como reverse proxy:

#### Configuración de Nginx para el Frontend:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Configuración de Nginx para la API:

```nginx
server {
    listen 80;
    server_name api.tu-dominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Si usas un solo dominio:

Si el frontend y la API están en el mismo dominio pero diferentes rutas:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Y actualiza las variables de entorno:

```bash
FRONTEND_URL=http://tu-dominio.com,https://tu-dominio.com
NEXT_PUBLIC_API_URL=http://tu-dominio.com
```

### 5. Verificar que CORS funciona:

Después de configurar, verifica que el servidor API está respondiendo con los headers CORS correctos:

```bash
curl -H "Origin: http://tu-dominio.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     http://localhost:3001/api/v1/auth/login \
     -v
```

Deberías ver en la respuesta:
```
Access-Control-Allow-Origin: http://tu-dominio.com
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Credentials: true
```

## Solución de Problemas

### Error: "CORS header 'Access-Control-Allow-Origin' does not match"

1. Verifica que `FRONTEND_URL` en el backend incluya exactamente la URL desde donde se hace la petición
2. Verifica que no haya espacios extra en las URLs
3. Si usas HTTPS, asegúrate de incluir `https://` en `FRONTEND_URL`

### Error: "Network Error"

1. Verifica que el servidor API esté corriendo: `docker-compose ps`
2. Verifica que los puertos estén abiertos en el firewall
3. Verifica que `NEXT_PUBLIC_API_URL` apunte a la URL correcta del servidor

### Error: "Connection refused"

1. Verifica que el contenedor de la API esté corriendo
2. Verifica que el puerto 3001 esté expuesto correctamente
3. Si usas Nginx, verifica la configuración del proxy
