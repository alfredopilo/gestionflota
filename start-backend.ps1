# Script para iniciar el backend en el puerto 4001
cd apps/api
$env:PORT = "4001"
Write-Host "🚀 Iniciando backend en http://localhost:4001" -ForegroundColor Green
npm run start:dev

