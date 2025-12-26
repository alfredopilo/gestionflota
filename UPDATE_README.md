# 🚀 Script de Actualización Rápida

## Para Windows (PowerShell)

```powershell
# Opción 1: Actualización completa (recomendado para primera vez)
.\update.ps1

# Opción 2: Especificar IP directamente
.\update.ps1 -IPAddress 192.168.1.100

# Opción 3: Actualización rápida (sin cambiar configuración)
.\update.ps1 -SkipIPPrompt
```

## Para Linux/VPS (Bash)

```bash
# Primero, dar permisos de ejecución
chmod +x update.sh

# Opción 1: Actualización completa (recomendado para primera vez)
./update.sh

# Opción 2: Especificar IP directamente
./update.sh -i 192.168.1.100

# Opción 3: Actualización rápida (sin cambiar configuración)
./update.sh --skip-ip
```

## ¿Qué Hace?

El script automatiza:
- ✅ Solicita/configura la IP del servidor
- ✅ Actualiza variables de entorno (.env)
- ✅ Regenera Prisma Client
- ✅ Reconstruye imágenes Docker
- ✅ Aplica migraciones de base de datos
- ✅ Reinicia todos los servicios

## Ayuda Completa

```powershell
.\update.ps1 -Help
```

O consulta `ACTUALIZACION.md` para documentación detallada.

---

**¿Problemas?** Verifica que Docker esté corriendo y que estés en la raíz del proyecto.

