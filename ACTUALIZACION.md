# 🔄 Guía de Actualización del Sistema

Este documento explica cómo usar el script de actualización automatizada del sistema.

## 📋 Requisitos Previos

- Docker y Docker Compose instalados
- PowerShell 5.1 o superior (incluido en Windows 10/11)
- Acceso a la raíz del proyecto

## 🚀 Uso Básico

### Actualización Completa (Recomendado)

```powershell
.\update.ps1
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

```powershell
.\update.ps1 -IPAddress 192.168.1.100
```

O con un dominio:

```powershell
.\update.ps1 -IPAddress mi-servidor.com
```

### Actualización Rápida (Sin cambiar IP)

```powershell
.\update.ps1 -SkipIPPrompt
```

### Actualización Sin Reconstruir Imágenes

Si solo cambiaste código y no dependencias:

```powershell
.\update.ps1 -SkipBuild
```

### Solo Aplicar Migraciones

Si solo necesitas aplicar migraciones sin reconstruir:

```powershell
.\update.ps1 -SkipIPPrompt -SkipBuild -SkipPrisma
```

## ⚙️ Opciones Disponibles

| Opción | Descripción |
|--------|-------------|
| `-IPAddress <ip>` | Especifica la IP o dominio directamente |
| `-SkipIPPrompt` | No solicita IP, usa valores del .env |
| `-SkipPrisma` | No regenera Prisma Client |
| `-SkipBuild` | No reconstruye imágenes Docker |
| `-Help` | Muestra la ayuda del script |

## 📝 Ejemplos de Uso

### Ejemplo 1: Primera Instalación en Servidor Nuevo

```powershell
# El script pedirá la IP del servidor
.\update.ps1
```

### Ejemplo 2: Actualización Después de Cambios de Código

```powershell
# Reconstruye todo sin cambiar la configuración
.\update.ps1 -SkipIPPrompt
```

### Ejemplo 3: Cambio de IP del Servidor

```powershell
.\update.ps1 -IPAddress 192.168.1.50
```

### Ejemplo 4: Solo Aplicar Migraciones Nuevas

```powershell
.\update.ps1 -SkipIPPrompt -SkipBuild -SkipPrisma
```

## 🔍 Verificación Post-Actualización

Después de ejecutar el script, verifica:

1. **Estado de contenedores:**
   ```powershell
   docker-compose ps
   ```

2. **Logs de la API:**
   ```powershell
   docker-compose logs -f api
   ```

3. **Logs del Frontend:**
   ```powershell
   docker-compose logs -f web
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

### Problemas con Permisos de PowerShell

Si el script no se ejecuta, verifica la política de ejecución:
```powershell
Get-ExecutionPolicy
```

Si es `Restricted`, cámbiala temporalmente:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process
.\update.ps1
```

### Contenedores No Inician

Verifica los logs para encontrar el problema:
```powershell
docker-compose logs api
docker-compose logs web
docker-compose logs postgres
```

### Puerto en Uso

Si un puerto está en uso, detén el proceso:
```powershell
# Para el puerto 4001 (API)
Get-NetTCPConnection -LocalPort 4001 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force

# Para el puerto 4000 (Web)
Get-NetTCPConnection -LocalPort 4000 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
```

## 📦 Qué Hace el Script

El script ejecuta los siguientes pasos en orden:

1. ✅ **Validación**: Verifica que estés en el directorio correcto
2. ✅ **Configuración**: Actualiza el archivo `.env` con la IP/dominio
3. ✅ **Detención**: Detiene todos los contenedores
4. ✅ **Prisma**: Regenera el cliente de Prisma (si no se saltea)
5. ✅ **Build**: Reconstruye las imágenes Docker (si no se saltea)
6. ✅ **Inicio**: Inicia todos los contenedores
7. ✅ **Migraciones**: Aplica las migraciones de base de datos
8. ✅ **Verificación**: Muestra el estado de los contenedores

## 🎯 Casos de Uso Comunes

### Después de Agregar Nuevas Funcionalidades

```powershell
# Reconstruye todo para incluir los cambios
.\update.ps1 -SkipIPPrompt
```

### Después de Modificar el Schema de Prisma

```powershell
# Reconstruye y aplica migraciones
.\update.ps1 -SkipIPPrompt
```

### Cambio de Servidor o IP

```powershell
# Especifica la nueva IP
.\update.ps1 -IPAddress 192.168.1.200
```

### Actualización Rápida (Solo Código)

```powershell
# Si solo cambiaste archivos del frontend/backend sin tocar dependencias
.\update.ps1 -SkipIPPrompt -SkipBuild -SkipPrisma
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

**Última actualización**: Diciembre 2025

