# Instrucciones para Importar el Plan de Mantenimiento

## Opción 1: Usando PowerShell Script (Recomendado)

### Pasos:

1. **Abrir PowerShell** en la carpeta del proyecto:
   ```powershell
   cd C:\Cursorcode\Gestiondeflota
   ```

2. **Asegurarse de que el servidor API esté corriendo**:
   ```powershell
   cd apps\api
   npm run start:dev
   ```
   (En otra terminal)

3. **Ejecutar el script de importación**:
   ```powershell
   .\import-plan.ps1
   ```

4. **Ingresar credenciales** cuando se soliciten:
   - Email: tu email de usuario (debe tener rol GERENCIA o JEFE_TALLER)
   - Password: tu contraseña

5. **Esperar la confirmación** del resultado.

### Configuración del Script:

Puedes editar el archivo `import-plan.ps1` para cambiar:
- `$VEHICLE_TYPE`: Tipo de vehículo (TRUCK, TRAILER, PICKUP, VAN)
- `$EXCEL_FILE`: Ruta al archivo Excel
- `$API_URL`: URL de la API (por defecto: http://localhost:3001/api/v1)

---

## Opción 2: Usando la Interfaz Web

### Pasos:

1. **Iniciar la aplicación**:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

2. **Iniciar sesión** con un usuario que tenga rol GERENCIA o JEFE_TALLER

3. **Ir a Mantenimientos** > **Planes** > **Importar Plan**

4. **Seleccionar el archivo Excel**:
   - Arrastrar y soltar el archivo `AnexoActividadesVS$VHT.xlsx`
   - O hacer clic para seleccionarlo

5. **Seleccionar el tipo de vehículo** (TRUCK, TRAILER, etc.)

6. **Hacer clic en "Importar Plan"**

7. **Esperar la confirmación** con el resumen de la importación

---

## Formato del Archivo Excel

El importador espera el siguiente formato en el archivo Excel:

### Estructura:

- **Fila 1**: Horas de cada intervalo (columnas C-N, hasta 12 intervalos)
  - Ejemplo: "500 Horas", "1000 Horas", "1500 Horas", ..., "6000 Horas"

- **Fila 2**: Kilómetros de cada intervalo (columnas C-N, hasta 12 intervalos)
  - Ejemplo: "20,000 Kilómetros", "40,000 Kilómetros", ..., "240,000 Kilómetros"

- **Fila 3 en adelante**: Actividades de mantenimiento
  - **Columna A**: Código
    - Solo letra (A, B, C, etc.) = **CATEGORÍA** (se usa para agrupar)
    - Letra.Número (A.1, A.2, B.1, etc.) = **TAREA** (actividad real)
  - **Columna B**: Descripción de la actividad
  - **Columnas C-N**: Marcas para cada intervalo (hasta 12 intervalos)
    - `√`, `V`, `v`, `X`, `x`, `1`, `SI`, `YES` = La actividad aplica en ese intervalo
    - Vacío = La actividad NO aplica en ese intervalo

### Ejemplo:

| Código | Descripción                    | I1 | I2 | I3 | I4 | I5 |
|--------|--------------------------------|----|----|----|----|----|
| A      | MOTOR                          |    |    |    |    |    |
| A.1    | Revisar nivel de aceite        | √  | √  | √  | √  | √  |
| A.2    | Cambiar filtro de aceite       |    | √  |    | √  |    |
| A.3    | Cambiar aceite motor           |    | √  |    | √  |    |
| B      | FRENOS                         |    |    |    |    |    |
| B.1    | Revisar pastillas de freno     | √  | √  | √  | √  | √  |
| B.2    | Cambiar pastillas de freno     |    |    | √  |    | √  |

En este ejemplo:
- **A** y **B** son categorías (solo agrupan)
- **A.1**, **A.2**, **A.3**, **B.1**, **B.2** son las tareas reales
- **A.1** aplica en todos los intervalos (tiene √ en todos)
- **A.2** solo aplica en los intervalos 2 y 4
- **B.2** solo aplica en los intervalos 3 y 5

---

## Notas Importantes

1. **Solo las tareas marcadas se importan**: Si una actividad no tiene marca (√, V, X, etc.) en un intervalo, NO se aplicará en ese intervalo.

2. **Las categorías no se importan como actividades**: Solo se usan para agrupar y organizar visualmente.

3. **Un plan activo por tipo de vehículo**: Al importar un nuevo plan, si ya existe un plan activo del mismo tipo de vehículo, se desactivará automáticamente.

4. **Permisos requeridos**: Solo usuarios con rol GERENCIA o JEFE_TALLER pueden importar planes.

5. **Validaciones**:
   - El archivo debe tener al menos 10 filas
   - Debe haber al menos un intervalo válido
   - Debe haber al menos una actividad válida
   - Los códigos de actividades deben tener formato X.Y (letra.número)

---

## Solución de Problemas

### Error: "No se pudieron leer los intervalos"
- Verifica que las filas 8 y 9 contengan horas y kilómetros en las columnas C-L
- Asegúrate de que los valores sean números

### Error: "No se encontraron actividades"
- Verifica que las actividades estén en las columnas A y B desde la fila 10
- Asegúrate de que los códigos tengan formato correcto (A.1, B.2, etc.)

### Error: "Not Found"
- Reinicia el servidor de la API: `npm run start:dev`
- Verifica que el servidor esté corriendo en http://localhost:3001

### Error: "Unauthorized"
- Verifica tus credenciales
- Asegúrate de tener rol GERENCIA o JEFE_TALLER

---

## Verificar el Plan Importado

Después de importar, puedes verificar el plan en:

1. **Interfaz Web**: http://localhost:3000/maintenance/plans
2. **API Swagger**: http://localhost:3001/api/docs
   - Endpoint: `GET /api/v1/maintenance/plans`

El plan importado estará activo y listo para usar en la generación de órdenes de trabajo preventivas.
