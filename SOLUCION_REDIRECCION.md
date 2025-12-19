# Solución al Problema de Redirección después del Login

## Problema
El login es exitoso (se obtienen los tokens), pero no se redirige a `/dashboard`.

## Causa
El middleware de Next.js está verificando el token en las **cookies**, pero el código de login estaba guardando el token solo en **localStorage**. El middleware no puede leer `localStorage` (solo funciona en el cliente), por lo que no encuentra el token y bloquea el acceso.

## Solución Implementada

### 1. Guardar Token en Cookies
Ahora el código guarda el token tanto en `localStorage` (para uso del cliente) como en cookies (para que el middleware lo pueda verificar):

```typescript
// Guardar en localStorage (para el cliente)
localStorage.setItem('accessToken', response.data.accessToken);

// Guardar en cookies (para el middleware)
document.cookie = `accessToken=${response.data.accessToken}; path=/; max-age=86400`;
```

### 2. Actualizado el Logout
El botón de cerrar sesión ahora también elimina las cookies:

```typescript
document.cookie = 'accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
```

### 3. Actualizado el Interceptor de Axios
Cuando se refresca el token, también se actualiza la cookie.

## Cambios Realizados

1. ✅ **apps/web/app/login/page.tsx**: Guarda token en cookies además de localStorage
2. ✅ **apps/web/app/dashboard/page.tsx**: Elimina cookies al cerrar sesión
3. ✅ **apps/web/lib/api.ts**: Actualiza cookies al refrescar token

## Prueba

1. **Reinicia el frontend** si es necesario (el cambio es en el cliente, debería aplicarse automáticamente con hot reload)
2. **Intenta iniciar sesión** nuevamente
3. **Deberías ser redirigido** a `/dashboard` después del login exitoso

## Verificación

Después del login, puedes verificar en las herramientas de desarrollador:

1. **Aplicación > Cookies**: Deberías ver `accessToken` y `refreshToken`
2. **Consola**: Deberías ver "Tokens guardados, redirigiendo a dashboard..."
3. **Red**: Deberías ver la redirección a `/dashboard`
