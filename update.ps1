# ============================================
# Script de Actualización - Sistema de Gestión de Flotas
# ============================================
# Este script automatiza todos los pasos necesarios para actualizar
# y desplegar el sistema, incluyendo configuración de variables de entorno
# ============================================

param(
    [switch]$SkipIPPrompt,
    [string]$IPAddress = "",
    [switch]$SkipPrisma,
    [switch]$SkipBuild,
    [switch]$Help
)

# Función para mostrar ayuda
function Show-Help {
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "Script de Actualización - Gestión de Flotas" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Uso:" -ForegroundColor Yellow
    Write-Host "  .\update.ps1 [opciones]"
    Write-Host ""
    Write-Host "Opciones:" -ForegroundColor Yellow
    Write-Host "  -IPAddress <ip>     Especifica la IP del servidor directamente"
    Write-Host "  -SkipIPPrompt       Salta la solicitud de IP (usa valores existentes)"
    Write-Host "  -SkipPrisma         No regenera Prisma Client"
    Write-Host "  -SkipBuild          No reconstruye las imágenes Docker"
    Write-Host "  -Help               Muestra esta ayuda"
    Write-Host ""
    Write-Host "Ejemplos:" -ForegroundColor Yellow
    Write-Host "  .\update.ps1                           # Solicita IP y ejecuta todo"
    Write-Host "  .\update.ps1 -IPAddress 192.168.1.100  # Usa IP específica"
    Write-Host "  .\update.ps1 -SkipIPPrompt             # Solo actualiza sin cambiar IP"
    Write-Host ""
}

# Mostrar ayuda si se solicita
if ($Help) {
    Show-Help
    exit 0
}

# Función para validar IP
function Test-IPAddress {
    param([string]$IP)
    $IPRegex = "^([1-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\.([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])){3}$"
    return $IP -match $IPRegex
}

# Función para validar URL
function Test-URL {
    param([string]$URL)
    $URLRegex = "^(http://|https://)([a-zA-Z0-9.-]+|([0-9]{1,3}\.){3}[0-9]{1,3})(:[0-9]+)?$"
    return $URL -match $URLRegex
}

# Función para actualizar archivo .env
function Update-EnvFile {
    param(
        [string]$IP,
        [string]$EnvPath = ".\.env"
    )

    Write-Host "`n📝 Actualizando archivo .env..." -ForegroundColor Cyan

    # Determinar si usar IP o dominio
    $UseDomain = $false
    if ($IP -match "^[a-zA-Z]") {
        $UseDomain = $true
    }

    if ($UseDomain) {
        $FrontendURL = "http://${IP}:4000,https://${IP}:4000"
        $APIURL = "http://${IP}:4001"
    } else {
        $FrontendURL = "http://${IP}:4000"
        $APIURL = "http://${IP}:4001"
    }

    # Leer archivo .env si existe, o crear uno nuevo
    $EnvContent = @()
    $EnvExists = Test-Path $EnvPath

    if ($EnvExists) {
        $EnvContent = Get-Content $EnvPath
    } else {
        # Crear .env desde env.example si existe
        if (Test-Path ".\.env.example") {
            Write-Host "  ⚠️  Archivo .env no encontrado. Creando desde env.example..." -ForegroundColor Yellow
            Copy-Item ".\.env.example" $EnvPath
            $EnvContent = Get-Content $EnvPath
        } else {
            Write-Host "  ⚠️  No se encontró .env ni .env.example. Creando archivo básico..." -ForegroundColor Yellow
            $EnvContent = @()
        }
    }

    # Actualizar o agregar variables
    $UpdatedContent = @()
    $FrontendUpdated = $false
    $APIUpdated = $false

    foreach ($line in $EnvContent) {
        if ($line -match "^\s*FRONTEND_URL\s*=") {
            $UpdatedContent += "FRONTEND_URL=${FrontendURL}"
            $FrontendUpdated = $true
        }
        elseif ($line -match "^\s*NEXT_PUBLIC_API_URL\s*=") {
            $UpdatedContent += "NEXT_PUBLIC_API_URL=${APIURL}"
            $APIUpdated = $true
        }
        elseif ($line -match "^\s*#.*FRONTEND_URL" -or $line -match "^\s*#.*NEXT_PUBLIC_API_URL") {
            $UpdatedContent += $line
        }
        else {
            $UpdatedContent += $line
        }
    }

    # Agregar variables si no existían
    if (-not $FrontendUpdated) {
        if ($UpdatedContent.Count -gt 0) {
            $UpdatedContent += ""
        }
        $UpdatedContent += "FRONTEND_URL=${FrontendURL}"
    }
    if (-not $APIUpdated) {
        $UpdatedContent += "NEXT_PUBLIC_API_URL=${APIURL}"
    }

    # Guardar archivo
    $UpdatedContent | Set-Content $EnvPath -Encoding UTF8
    Write-Host "  ✅ Archivo .env actualizado correctamente" -ForegroundColor Green
    Write-Host "     FRONTEND_URL=${FrontendURL}" -ForegroundColor Gray
    Write-Host "     NEXT_PUBLIC_API_URL=${APIURL}" -ForegroundColor Gray
}

# Función para ejecutar comandos con manejo de errores
function Invoke-SafeCommand {
    param(
        [string]$Command,
        [string]$Description,
        [bool]$StopOnError = $true
    )

    Write-Host "`n🔄 $Description..." -ForegroundColor Cyan
    try {
        $result = Invoke-Expression $Command
        if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
            throw "Comando falló con código de salida: $LASTEXITCODE"
        }
        Write-Host "  ✅ $Description completado" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "  ❌ Error: $_" -ForegroundColor Red
        if ($StopOnError) {
            Write-Host "`n⚠️  El proceso se ha detenido debido a un error." -ForegroundColor Yellow
            exit 1
        }
        return $false
    }
}

# Función principal
function Start-Update {
    Write-Host "`n============================================" -ForegroundColor Cyan
    Write-Host "🚀 Iniciando Actualización del Sistema" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan

    # Verificar que estamos en el directorio correcto
    if (-not (Test-Path "docker-compose.yml")) {
        Write-Host "`n❌ Error: No se encontró docker-compose.yml" -ForegroundColor Red
        Write-Host "   Por favor, ejecuta este script desde la raíz del proyecto." -ForegroundColor Yellow
        exit 1
    }

    # Paso 1: Solicitar IP o usar la proporcionada
    $ServerIP = ""
    if (-not $SkipIPPrompt) {
        if ($IPAddress -ne "") {
            $ServerIP = $IPAddress
            Write-Host "`n📌 Usando IP/Dominio proporcionada: $ServerIP" -ForegroundColor Cyan
        }
        else {
            Write-Host "`n📌 Configuración de IP/Dominio del Servidor" -ForegroundColor Cyan
            Write-Host "   Puedes ingresar una IP (ej: 192.168.1.100) o un dominio (ej: mi-servidor.com)" -ForegroundColor Gray
            $ServerIP = Read-Host "   Ingresa la IP o dominio del servidor"
        }

        if ([string]::IsNullOrWhiteSpace($ServerIP)) {
            Write-Host "`n⚠️  No se proporcionó IP. Usando valores existentes del .env" -ForegroundColor Yellow
        }
        else {
            # Validar formato básico (IP o dominio)
            if (-not (Test-IPAddress $ServerIP) -and -not ($ServerIP -match "^[a-zA-Z0-9.-]+$")) {
                Write-Host "`n⚠️  El formato no es válido. Continuando de todos modos..." -ForegroundColor Yellow
            }
            
            # Actualizar .env
            Update-EnvFile -IP $ServerIP
        }
    }
    else {
        Write-Host "`n⏭️  Saltando actualización de IP (usando valores existentes)" -ForegroundColor Yellow
    }

    # Paso 2: Detener contenedores
    Invoke-SafeCommand -Command "docker-compose down" -Description "Deteniendo contenedores"

    # Paso 3: Regenerar Prisma (si no se saltea)
    if (-not $SkipPrisma) {
        if (Test-Path "apps\api\prisma\schema.prisma") {
            Write-Host "`n🔄 Regenerando Prisma Client..." -ForegroundColor Cyan
            Set-Location "apps\api"
            try {
                $env:PORT = "4001"
                Invoke-Expression "npx prisma generate"
                if ($LASTEXITCODE -ne 0) {
                    Write-Host "  ⚠️  Error al regenerar Prisma. Continuando..." -ForegroundColor Yellow
                } else {
                    Write-Host "  ✅ Prisma Client regenerado" -ForegroundColor Green
                }
            }
            catch {
                Write-Host "  ⚠️  Error al regenerar Prisma: $_. Continuando..." -ForegroundColor Yellow
            }
            Set-Location "..\.."
        }
        else {
            Write-Host "`n⚠️  No se encontró schema.prisma. Saltando regeneración de Prisma." -ForegroundColor Yellow
        }
    }

    # Paso 4: Reconstruir imágenes Docker (si no se saltea)
    if (-not $SkipBuild) {
        Write-Host "`n🔨 Reconstruyendo imágenes Docker (esto puede tardar varios minutos)..." -ForegroundColor Cyan
        Invoke-SafeCommand -Command "docker-compose build --no-cache api web" -Description "Reconstruyendo imágenes" -StopOnError $false
        
        if ($LASTEXITCODE -ne 0) {
            Write-Host "`n⚠️  Hubo errores en el build. Intentando continuar..." -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "`n⏭️  Saltando reconstrucción de imágenes (usando imágenes existentes)" -ForegroundColor Yellow
    }

    # Paso 5: Iniciar contenedores
    Invoke-SafeCommand -Command "docker-compose up -d" -Description "Iniciando contenedores"

    # Esperar a que los servicios estén listos
    Write-Host "`n⏳ Esperando a que los servicios estén listos..." -ForegroundColor Cyan
    Start-Sleep -Seconds 10

    # Paso 6: Aplicar migraciones de base de datos
    Write-Host "`n📦 Aplicando migraciones de base de datos..." -ForegroundColor Cyan
    try {
        $migrationResult = docker-compose exec -T api npx prisma migrate deploy 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Migraciones aplicadas correctamente" -ForegroundColor Green
        }
        else {
            Write-Host "  ⚠️  Hubo problemas con las migraciones. Verifica manualmente:" -ForegroundColor Yellow
            Write-Host "     docker-compose exec api npx prisma migrate deploy" -ForegroundColor Gray
        }
    }
    catch {
        Write-Host "  ⚠️  Error al aplicar migraciones: $_" -ForegroundColor Yellow
        Write-Host "     Puedes ejecutar manualmente: docker-compose exec api npx prisma migrate deploy" -ForegroundColor Gray
    }

    # Paso 7: Verificar estado de los contenedores
    Write-Host "`n📊 Verificando estado de los contenedores..." -ForegroundColor Cyan
    Invoke-Expression "docker-compose ps"

    # Paso 8: Mostrar información final
    Write-Host "`n============================================" -ForegroundColor Green
    Write-Host "✅ Actualización Completada" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green

    if ($ServerIP -ne "") {
        Write-Host "`n📍 URLs del Sistema:" -ForegroundColor Cyan
        if ($ServerIP -match "^[a-zA-Z]") {
            Write-Host "   Frontend: http://${ServerIP}:4000" -ForegroundColor White
            Write-Host "   API:      http://${ServerIP}:4001" -ForegroundColor White
            Write-Host "   Swagger:  http://${ServerIP}:4001/api/docs" -ForegroundColor White
        } else {
            Write-Host "   Frontend: http://${ServerIP}:4000" -ForegroundColor White
            Write-Host "   API:      http://${ServerIP}:4001" -ForegroundColor White
            Write-Host "   Swagger:  http://${ServerIP}:4001/api/docs" -ForegroundColor White
        }
    }
    else {
        Write-Host "`n📍 URLs del Sistema (desde .env):" -ForegroundColor Cyan
        $EnvFile = Get-Content ".\.env" -ErrorAction SilentlyContinue
        if ($EnvFile) {
            $FrontendURL = ($EnvFile | Select-String "^FRONTEND_URL=(.+)$").Matches.Groups[1].Value
            $APIURL = ($EnvFile | Select-String "^NEXT_PUBLIC_API_URL=(.+)$").Matches.Groups[1].Value
            if ($FrontendURL) {
                Write-Host "   Frontend: $FrontendURL" -ForegroundColor White
            }
            if ($APIURL) {
                Write-Host "   API:      $APIURL" -ForegroundColor White
                Write-Host "   Swagger:  $APIURL/api/docs" -ForegroundColor White
            }
        }
    }

    Write-Host "`n📋 Comandos útiles:" -ForegroundColor Cyan
    Write-Host "   Ver logs:         docker-compose logs -f" -ForegroundColor Gray
    Write-Host "   Ver logs API:     docker-compose logs -f api" -ForegroundColor Gray
    Write-Host "   Ver logs Web:     docker-compose logs -f web" -ForegroundColor Gray
    Write-Host "   Detener todo:     docker-compose down" -ForegroundColor Gray
    Write-Host "   Reiniciar:        docker-compose restart" -ForegroundColor Gray

    Write-Host "`n✨ ¡Sistema actualizado y listo para usar!" -ForegroundColor Green
}

# Ejecutar actualización
try {
    Start-Update
}
catch {
    Write-Host "`n❌ Error fatal: $_" -ForegroundColor Red
    Write-Host "`nStack trace:" -ForegroundColor Yellow
    Write-Host $_.ScriptStackTrace -ForegroundColor Gray
    exit 1
}

