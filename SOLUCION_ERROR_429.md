# Solución al Error 429 "Too Many Requests"

## Problema

Estás recibiendo el error `429 Too Many Requests` al intentar iniciar sesión. Este error indica que el rate limiting del backend está bloqueando las peticiones porque se han excedido los límites permitidos.

## Causa

El rate limiting estaba configurado con un límite muy restrictivo:
- **100 peticiones** por IP cada **15 minutos**

Esto puede ser fácil de exceder durante el desarrollo cuando:
- Haces múltiples intentos de login
- Recargas páginas frecuentemente
- El frontend hace múltiples peticiones automáticas

## Solución Aplicada

He ajustado la configuración del rate limiting en `apps/api/src/main.ts`:

```typescript
rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Aumentado de 100 a 1000 peticiones por 15 minutos
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Saltar rate limiting en rutas de health check
    return req.path === '/api/v1/health';
  },
})
```

## Pasos para Aplicar la Solución

### Opción 1: Reiniciar el Backend (Recomendado)

1. **Ve a la terminal donde está corriendo el backend**
2. **Presiona `Ctrl+C`** para detenerlo
3. **Ejecuta nuevamente**:
   ```bash
   cd apps/api
   npm run start:dev
   ```

### Opción 2: Esperar el Reset (Temporal)

Si no quieres reiniciar, puedes esperar **15 minutos** para que el contador de rate limiting se resetee automáticamente.

## Verificación

Después de reiniciar el backend, intenta iniciar sesión nuevamente. El error 429 no debería aparecer a menos que realmente hagas más de 1000 peticiones en 15 minutos (lo cual es muy improbable en desarrollo normal).

## Nota para Producción

⚠️ **Importante**: En producción, deberías ajustar estos valores según tus necesidades:

- **Desarrollo**: 1000-5000 peticiones/15min (como ahora)
- **Producción**: 100-200 peticiones/15min (más restrictivo para seguridad)

También podrías considerar:
- Diferentes límites por ruta (más restrictivo en `/auth/login`)
- Rate limiting por usuario autenticado además de por IP
- Whitelist de IPs confiables

## Si el Problema Persiste

Si después de reiniciar el backend aún recibes el error 429:

1. Verifica que el backend se haya reiniciado correctamente
2. Espera unos minutos antes de intentar de nuevo
3. Limpia las cookies del navegador (puede ayudar en algunos casos)
4. Revisa los logs del backend para confirmar que está usando la nueva configuración
