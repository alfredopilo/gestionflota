# Solución a Errores al Guardar Vehículos

## Problemas Corregidos

### 1. Tipo de Dato de `capacity`

**Problema**: El backend espera `capacity` como `string`, pero el frontend lo enviaba como `number`.

**Solución**: Se agregó conversión explícita a string:
```typescript
if (vehicle.capacity && vehicle.capacity > 0) {
  payload.capacity = String(vehicle.capacity);
}
```

### 2. Manejo de Errores Mejorado

**Mejoras**:
- Logs más detallados en consola para debugging
- Manejo de arrays de mensajes de error (validación de NestJS)
- Mensajes de error más descriptivos para el usuario

### 3. Validación de Campos

**Mejoras**:
- Trim de espacios en campos de texto
- Validación de números (usando `Number()`)
- Validación de campos opcionales antes de incluirlos

## Cómo Verificar

Si aún tienes errores al guardar un vehículo:

1. **Abre la consola del navegador** (F12)
2. **Intenta guardar un vehículo**
3. **Revisa los logs**:
   - Deberías ver "Enviando payload: {...}"
   - Si hay error, verás "Error guardando vehículo: ..."
   - Y "Response data: ..." con los detalles del error

## Errores Comunes y Soluciones

### Error: "plate must be a string"
- **Causa**: Campo placa vacío o inválido
- **Solución**: Asegúrate de llenar todos los campos requeridos (marcados con *)

### Error: "odometer must be a number"
- **Causa**: Odómetro no es un número válido
- **Solución**: Ingresa un número válido (puede ser 0)

### Error: "capacity must be a string"
- **Solución**: Ya corregido en el código - si persiste, verifica que el valor sea mayor a 0

### Error: Campos duplicados (placa o VIN)
- **Causa**: Ya existe un vehículo con esa placa o VIN
- **Solución**: Usa una placa o VIN diferente

## Campos Requeridos

Los siguientes campos son **obligatorios**:
- ✅ Placa
- ✅ Marca
- ✅ Modelo
- ✅ Tipo
- ✅ Estado
- ✅ Odómetro (puede ser 0)
- ✅ Horómetro (puede ser 0)

Los siguientes campos son **opcionales**:
- Año
- VIN/Chasis
- Capacidad

## Próximos Pasos

Si el error persiste después de estas correcciones:

1. Revisa la consola del navegador para ver el error exacto
2. Verifica que todos los campos requeridos estén llenos
3. Comprueba que los valores numéricos sean válidos
4. Revisa los logs del backend para más detalles
