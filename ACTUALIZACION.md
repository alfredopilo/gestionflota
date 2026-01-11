# 🔄 Guía de Actualización del Sistema

Este documento explica cómo usar el script de actualización automatizada del sistema.

## 📋 Requisitos Previos

- Docker y Docker Compose instalados
- Acceso a la raíz del proyecto
- **Windows**: PowerShell 5.1 o superior
- **Linux/VPS**: Bash shell

## 🚀 Uso Básico

### Para Windows (PowerShell)

```powershell
.\update.ps1
```

### Para Linux/VPS (Bash)

```bash
chmod +x update.sh
./update.sh
```

Este comando:
1. Solicitará la IP o dominio del servidor
2. Actualizará el archivo `.env` con las URLs correctas
3. Detendrá los contenedores actuales
4. Regenerará Prisma Client
5. Reconstruirá las imágenes Docker
6. Iniciará todos los contenedores
7. Aplicará las migraciones de base de datos
8. Mostrará el estado final y las URLs

### Especificar IP Directamente

**Windows:**
```powershell
.\update.ps1 -IPAddress 192.168.1.100
.\update.ps1 -IPAddress mi-servidor.com
```

**Linux/VPS:**
```bash
./update.sh -i 192.168.1.100
./update.sh --ip mi-servidor.com
```

### Actualización Rápida (Sin cambiar IP)

**Windows:**
```powershell
.\update.ps1 -SkipIPPrompt
```

**Linux/VPS:**
```bash
./update.sh --skip-ip
```

### Actualización Sin Reconstruir Imágenes

**Windows:**
```powershell
.\update.ps1 -SkipBuild
```

**Linux/VPS:**
```bash
./update.sh --skip-build
```

### Solo Aplicar Migraciones

**Windows:**
```powershell
.\update.ps1 -SkipIPPrompt -SkipBuild -SkipPrisma
```

**Linux/VPS:**
```bash
./update.sh --skip-ip --skip-build --skip-prisma
```

## ⚙️ Opciones Disponibles

### Windows (PowerShell)
| Opción | Descripción |
|--------|-------------|
| `-IPAddress <ip>` | Especifica la IP o dominio directamente |
| `-SkipIPPrompt` | No solicita IP, usa valores del .env |
| `-SkipPrisma` | No regenera Prisma Client |
| `-SkipBuild` | No reconstruye imágenes Docker |
| `-Help` | Muestra la ayuda del script |

### Linux/VPS (Bash)
| Opción | Descripción |
|--------|-------------|
| `-i, --ip <ip>` | Especifica la IP o dominio directamente |
| `-s, --skip-ip` | No solicita IP, usa valores del .env |
| `--skip-prisma` | No regenera Prisma Client |
| `--skip-build` | No reconstruye imágenes Docker |
| `-h, --help` | Muestra la ayuda del script |

## 📝 Ejemplos de Uso

### Ejemplo 1: Primera Instalación en Servidor Nuevo

**Windows:**
```powershell
.\update.ps1
```

**Linux/VPS:**
```bash
chmod +x update.sh
./update.sh
```

### Ejemplo 2: Actualización Después de Cambios de Código

**Windows:**
```powershell
.\update.ps1 -SkipIPPrompt
```

**Linux/VPS:**
```bash
./update.sh --skip-ip
```

### Ejemplo 3: Cambio de IP del Servidor

**Windows:**
```powershell
.\update.ps1 -IPAddress 192.168.1.50
```

**Linux/VPS:**
```bash
./update.sh -i 192.168.1.50
```

### Ejemplo 4: Solo Aplicar Migraciones Nuevas

**Windows:**
```powershell
.\update.ps1 -SkipIPPrompt -SkipBuild -SkipPrisma
```

**Linux/VPS:**
```bash
./update.sh --skip-ip --skip-build --skip-prisma
```

## 🔍 Verificación Post-Actualización

Después de ejecutar el script, verifica:

1. **Estado de contenedores:**
   ```bash
   docker-compose ps
   # O si usas Docker Compose v2:
   docker compose ps
   ```

2. **Logs de la API:**
   ```bash
   docker-compose logs -f api
   # O:
   docker compose logs -f api
   ```

3. **Logs del Frontend:**
   ```bash
   docker-compose logs -f web
   # O:
   docker compose logs -f web
   ```

4. **Acceder al sistema:**
   - Frontend: `http://TU_IP:4000`
   - API: `http://TU_IP:4001`
   - Swagger: `http://TU_IP:4001/api/docs`

## ⚠️ Solución de Problemas

### Error: "No se encontró docker-compose.yml"

Asegúrate de estar en la raíz del proyecto:
```powershell
cd C:\Cursorcode\Gestiondeflota
.\update.ps1
```

### Error al Regenerar Prisma

Si Prisma falla, puedes ejecutarlo manualmente después:
```powershell
cd apps\api
npx prisma generate
cd ..\..
```

### Error en Migraciones

Aplica las migraciones manualmente:
```powershell
docker-compose exec api npx prisma migrate deploy
```

### Problemas con Permisos

**Windows (PowerShell):**
Si el script no se ejecuta, verifica la política de ejecución:
```powershell
Get-ExecutionPolicy
```

Si es `Restricted`, cámbiala temporalmente:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\update.ps1
```

**Linux/VPS (Bash):**
Si el script no se ejecuta, dale permisos de ejecución:
```bash
chmod +x update.sh
./update.sh
```

### Contenedores No Inician

Verifica los logs para encontrar el problema:
```powershell
docker-compose logs api
docker-compose logs web
docker-compose logs postgres
```

### Puerto en Uso

**Windows (PowerShell):**
```powershell
# Para el puerto 4001 (API)
Get-NetTCPConnection -LocalPort 4001 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force

# Para el puerto 4000 (Web)
Get-NetTCPConnection -LocalPort 4000 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
```

**Linux/VPS:**
```bash
# Para el puerto 4001 (API)
sudo lsof -ti:4001 | xargs kill -9

# Para el puerto 4000 (Web)
sudo lsof -ti:4000 | xargs kill -9

# O usar fuser:
sudo fuser -k 4001/tcp
sudo fuser -k 4000/tcp
```

## 📦 Qué Hace el Script

El script ejecuta los siguientes pasos en orden:

1. ✅ **Validación**: Verifica que estés en el directorio correcto
2. ✅ **Configuración**: Actualiza el archivo `.env` con la IP/dominio
3. ✅ **Detención**: Detiene todos los contenedores
4. ✅ **Prisma**: Regenera el cliente de Prisma (si no se saltea)
5. ✅ **Build**: Reconstruye las imágenes Docker (si no se saltea)
6. ✅ **Inicio**: Inicia todos los contenedores
7. ✅ **Migraciones**: Aplica las migraciones de base de datos (incluyendo nuevas tablas y campos)
8. ✅ **Verificación**: Muestra el estado de los contenedores

## 🆕 Últimas Actualizaciones (Enero 2026)

### Gestión de Talleres Internos/Externos

Se ha agregado funcionalidad para distinguir entre mantenimiento interno y externo:

**Base de Datos:**
- Nueva tabla `workshops` para gestionar talleres externos
- Campos agregados a `work_orders`:
  - `is_internal` (boolean): Indica si el mantenimiento es interno o externo
  - `workshop_id` (uuid): Referencia opcional al taller externo

**Módulo Backend:**
- Nuevo endpoint `/api/v1/workshops` con CRUD completo
- Validación automática: mantenimiento externo requiere taller asignado
- Filtrado por compañía para multi-tenancy

**Formulario Frontend:**
- Radio buttons para seleccionar ubicación (Interno/Externo)
- Dropdown de talleres con opción de agregar nuevos
- Modal moderno para crear talleres rápidamente

**Para aplicar estos cambios:**
```powershell
# Windows
.\update.ps1 -SkipIPPrompt

# Linux/VPS
./update.sh --skip-ip
```

Las migraciones se aplicarán automáticamente y crearán:
- La tabla `workshops`
- Los campos `is_internal` y `workshop_id` en `work_orders`
- Los índices necesarios para optimizar consultas

## 🎯 Casos de Uso Comunes

### Después de Agregar Nuevas Funcionalidades

**Windows:**
```powershell
.\update.ps1 -SkipIPPrompt
```

**Linux/VPS:**
```bash
./update.sh --skip-ip
```

### Después de Modificar el Schema de Prisma

**Windows:**
```powershell
.\update.ps1 -SkipIPPrompt
```

**Linux/VPS:**
```bash
./update.sh --skip-ip
```

### Cambio de Servidor o IP

**Windows:**
```powershell
.\update.ps1 -IPAddress 192.168.1.200
```

**Linux/VPS:**
```bash
./update.sh -i 192.168.1.200
```

### Actualización Rápida (Solo Código)

**Windows:**
```powershell
.\update.ps1 -SkipIPPrompt -SkipBuild -SkipPrisma
```

**Linux/VPS:**
```bash
./update.sh --skip-ip --skip-build --skip-prisma
```

## 💡 Tips

- **Primera vez**: Ejecuta sin opciones para configurar todo desde cero
- **Desarrollo activo**: Usa `-SkipIPPrompt` para actualizaciones rápidas
- **Solo migraciones**: Usa todas las opciones `-Skip*` excepto las migraciones
- **Revisa logs**: Si algo falla, siempre revisa los logs de los contenedores

## 🔐 Notas de Seguridad

- El archivo `.env` contiene información sensible
- Nunca subas el archivo `.env` a repositorios públicos
- Cambia las contraseñas por defecto en producción
- Usa JWT secrets fuertes y únicos

## 📞 Soporte

Si encuentras problemas:
1. Revisa la sección de solución de problemas
2. Verifica los logs de los contenedores
3. Consulta la documentación de Docker Compose
4. Revisa los archivos de configuración

---

**Última actualización**: Enero 2026

**Versión**: 1.5.0 - Gestión de Talleres Internos/Externos

