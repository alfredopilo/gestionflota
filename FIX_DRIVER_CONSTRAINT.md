# 🔧 Corrección de Constraint de Driver en Trips

## Problema

Error de clave foránea: `Foreign key constraint violated: 'trips_driver1_id_fkey'` o `'trips_driver_id_fkey'`

Este error ocurre cuando:
- La base de datos tiene un constraint con nombre incorrecto (`driverl_id` en lugar de `driver1_id`)
- O la columna tiene un nombre incorrecto
- El constraint no está correctamente configurado
- **Hay trips con driver IDs que no existen en la tabla drivers** (causa más común)
- Se están enviando strings vacíos en lugar de NULL

## Solución Recomendada (Script Completo)

Para resolver el problema completo, usa el script `fix-driver-data-and-constraints.sh`:

```bash
chmod +x fix-driver-data-and-constraints.sh
./fix-driver-data-and-constraints.sh
```

Este script:
1. ✅ Encuentra trips con driver IDs inválidos
2. ✅ Limpia los datos inválidos (pone NULL)
3. ✅ Corrige nombres de columnas incorrectos
4. ✅ Elimina y recrea todos los constraints
5. ✅ Verifica migraciones
6. ✅ Muestra reporte completo

## Solución Alternativa (Solo Constraints)

Si solo necesitas corregir los constraints (sin limpiar datos), usa:

```bash
chmod +x fix-driver-constraint.sh
./fix-driver-constraint.sh
```

### Uso Rápido - Script Completo (RECOMENDADO)

```bash
# 1. Dar permisos de ejecución
chmod +x fix-driver-data-and-constraints.sh

# 2. Ejecutar el script
./fix-driver-data-and-constraints.sh
```

Este script es el más completo y resuelve tanto el problema de datos inválidos como el de constraints.

### Uso Rápido - Solo Constraints

```bash
# 1. Dar permisos de ejecución
chmod +x fix-driver-constraint.sh

# 2. Ejecutar el script
./fix-driver-constraint.sh
```

Usa este script solo si ya limpiaste los datos inválidos manualmente.

### Variables de Entorno

Si tu base de datos tiene credenciales diferentes, puedes exportarlas antes de ejecutar:

```bash
export POSTGRES_USER=tu_usuario
export POSTGRES_PASSWORD=tu_password
export POSTGRES_DB=gestiondeflota

./fix-driver-constraint.sh
```

### Qué Hace el Script

1. ✅ Detecta si está en Docker o ejecución local
2. ✅ Verifica que PostgreSQL esté corriendo
3. ✅ Elimina el constraint incorrecto `trips_driverl_id_fkey`
4. ✅ Renombra la columna `driverl_id` a `driver1_id` si existe
5. ✅ Crea el constraint correcto `trips_driver1_id_fkey`
6. ✅ Verifica que todo esté correcto

### Después de Ejecutar

```bash
# Reiniciar el contenedor de la API
docker-compose restart api

# O si no usas Docker:
# Reinicia tu aplicación NestJS
```

### Verificación Manual

Si quieres verificar manualmente en PostgreSQL:

```sql
-- Ver constraints relacionados con driver
SELECT 
    conname AS constraint_name,
    contype AS constraint_type
FROM pg_constraint
WHERE conrelid = 'trips'::regclass
AND conname LIKE '%driver%';

-- Ver columnas relacionadas con driver
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'trips'
AND column_name LIKE '%driver%';
```

### Si el Problema Persiste

1. Verifica que el chofer existe:
   ```sql
   SELECT id, name FROM drivers WHERE id = 'EL_ID_DEL_CHOFER';
   ```

2. Verifica que el campo driver1Id no sea NULL cuando debería tener un valor válido

3. Revisa los logs del API:
   ```bash
   docker-compose logs -f api
   ```

---

**Nota:** Este script es seguro de ejecutar múltiples veces. Solo realiza cambios si detecta problemas.

