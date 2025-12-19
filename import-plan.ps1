# Script para importar el plan de mantenimiento desde Excel
# Uso: .\import-plan.ps1

$ErrorActionPreference = "Stop"

# Configuración
$API_URL = "http://localhost:3001/api/v1"
$EXCEL_FILE = "C:\Cursorcode\Gestiondeflota\docs\AnexoActividadesVS$VHT.xlsx"
$VEHICLE_TYPE = "TRUCK"  # Cambiar según el tipo de vehículo

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Importador de Plan de Mantenimiento" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar que el archivo existe
if (!(Test-Path $EXCEL_FILE)) {
    Write-Host "ERROR: No se encontró el archivo Excel en: $EXCEL_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Archivo Excel encontrado" -ForegroundColor Green
Write-Host "  Ruta: $EXCEL_FILE" -ForegroundColor Gray
Write-Host ""

# Solicitar credenciales
Write-Host "Ingrese sus credenciales:" -ForegroundColor Yellow
$email = Read-Host "Email"
$password = Read-Host "Password" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))

Write-Host ""
Write-Host "Autenticando..." -ForegroundColor Yellow

# Autenticar
try {
    $loginBody = @{
        email = $email
        password = $passwordPlain
    } | ConvertTo-Json

    $loginResponse = Invoke-RestMethod -Uri "$API_URL/auth/login" -Method Post -Body $loginBody -ContentType "application/json"
    $accessToken = $loginResponse.accessToken
    
    Write-Host "✓ Autenticación exitosa" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "ERROR: Fallo en la autenticación" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Importar plan
Write-Host "Importando plan de mantenimiento..." -ForegroundColor Yellow
Write-Host "  Tipo de vehículo: $VEHICLE_TYPE" -ForegroundColor Gray
Write-Host ""

try {
    # Crear boundary para multipart/form-data
    $boundary = [System.Guid]::NewGuid().ToString()
    
    # Leer el archivo
    $fileBytes = [System.IO.File]::ReadAllBytes($EXCEL_FILE)
    $fileName = [System.IO.Path]::GetFileName($EXCEL_FILE)
    
    # Construir el body multipart
    $LF = "`r`n"
    $bodyLines = @(
        "--$boundary",
        "Content-Disposition: form-data; name=`"file`"; filename=`"$fileName`"",
        "Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "",
        [System.Text.Encoding]::GetEncoding("iso-8859-1").GetString($fileBytes),
        "--$boundary",
        "Content-Disposition: form-data; name=`"vehicleType`"",
        "",
        $VEHICLE_TYPE,
        "--$boundary--"
    )
    
    $body = $bodyLines -join $LF
    
    # Headers
    $headers = @{
        "Authorization" = "Bearer $accessToken"
        "Content-Type" = "multipart/form-data; boundary=$boundary"
    }
    
    # Hacer la petición
    $importResponse = Invoke-RestMethod -Uri "$API_URL/maintenance/plan/import" -Method Post -Body $body -Headers $headers
    
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ Plan importado exitosamente" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Resumen:" -ForegroundColor Cyan
    Write-Host "  Plan: $($importResponse.plan.name)" -ForegroundColor White
    Write-Host "  Intervalos importados: $($importResponse.summary.intervalsCount)" -ForegroundColor White
    Write-Host "  Actividades importadas: $($importResponse.summary.activitiesCount)" -ForegroundColor White
    
    if ($importResponse.summary.warnings) {
        Write-Host ""
        Write-Host "Advertencias:" -ForegroundColor Yellow
        foreach ($warning in $importResponse.summary.warnings) {
            Write-Host "  - $warning" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    Write-Host "El plan ha sido importado y está activo." -ForegroundColor Green
    Write-Host "Puedes verlo en: http://localhost:3000/maintenance/plans" -ForegroundColor Cyan
    
} catch {
    Write-Host "ERROR: Fallo al importar el plan" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "Detalles: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    exit 1
}

Write-Host ""
Write-Host "Presiona Enter para salir..."
Read-Host
