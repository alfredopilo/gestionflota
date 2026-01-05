#!/bin/bash

# ============================================
# Script de Instalación - Sistema de Gestión de Flotas
# ============================================
# Este script automatiza todos los pasos necesarios para instalar
# y desplegar el sistema en un servidor VPS Linux por primera vez
# ============================================

set -e  # Salir si algún comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Variables
IP_ADDRESS=""
ENV_FILE=".env"

# Función para mostrar ayuda
show_help() {
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}Script de Instalación - Gestión de Flotas${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
    echo "Uso:"
    echo "  ./install.sh [opciones]"
    echo ""
    echo "Opciones:"
    echo "  -i, --ip <ip>          Especifica la IP o dominio del servidor"
    echo "  -h, --help             Muestra esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./install.sh                      # Solicita IP y ejecuta instalación completa"
    echo "  ./install.sh -i 192.168.1.100    # Usa IP específica"
    echo "  ./install.sh --ip mi-servidor.com # Usa dominio"
    echo ""
}

# Función para validar IP
validate_ip() {
    local ip=$1
    if [[ $ip =~ ^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$ ]]; then
        return 0
    fi
    return 1
}

# Función para validar dominio
validate_domain() {
    local domain=$1
    if [[ $domain =~ ^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        return 0
    fi
    return 1
}

# Función para crear/actualizar archivo .env
setup_env_file() {
    local ip=$1
    
    echo -e "\n${CYAN}📝 Configurando archivo .env...${NC}"
    
    # Determinar si usar IP o dominio
    local use_domain=false
    if ! validate_ip "$ip" && validate_domain "$ip"; then
        use_domain=true
    fi
    
    local frontend_url
    local api_url
    
    if [ "$use_domain" = true ]; then
        frontend_url="http://${ip}:4000,https://${ip}:4000"
        api_url="http://${ip}:4001"
    else
        frontend_url="http://${ip}:4000"
        api_url="http://${ip}:4001"
    fi
    
    # Crear archivo .env desde .env.example si existe
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f ".env.example" ]; then
            echo -e "${CYAN}  📋 Creando .env desde .env.example...${NC}"
            cp ".env.example" "$ENV_FILE"
        else
            echo -e "${YELLOW}  ⚠️  No se encontró .env.example. Creando archivo básico...${NC}"
            touch "$ENV_FILE"
        fi
    fi
    
    # Actualizar o agregar variables esenciales
    if grep -q "^FRONTEND_URL=" "$ENV_FILE"; then
        sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=${frontend_url}|" "$ENV_FILE"
    else
        echo "FRONTEND_URL=${frontend_url}" >> "$ENV_FILE"
    fi
    
    if grep -q "^NEXT_PUBLIC_API_URL=" "$ENV_FILE"; then
        sed -i "s|^NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=${api_url}|" "$ENV_FILE"
    else
        echo "NEXT_PUBLIC_API_URL=${api_url}" >> "$ENV_FILE"
    fi
    
    # Asegurar que DATABASE_URL esté configurado si no existe
    if ! grep -q "^DATABASE_URL=" "$ENV_FILE"; then
        echo "DATABASE_URL=postgresql://postgres:postgres@postgres:5432/gestiondeflota" >> "$ENV_FILE"
        echo -e "${YELLOW}  ⚠️  DATABASE_URL agregado con valores por defecto. Revísalo si es necesario.${NC}"
    fi
    
    echo -e "${GREEN}  ✅ Archivo .env configurado correctamente${NC}"
    echo -e "${NC}     FRONTEND_URL=${frontend_url}"
    echo -e "${NC}     NEXT_PUBLIC_API_URL=${api_url}"
}

# Función para ejecutar comandos con manejo de errores
safe_command() {
    local command=$1
    local description=$2
    local stop_on_error=${3:-true}
    
    echo -e "\n${CYAN}🔄 ${description}...${NC}"
    
    if eval "$command"; then
        echo -e "${GREEN}  ✅ ${description} completado${NC}"
        return 0
    else
        echo -e "${RED}  ❌ Error en: ${description}${NC}"
        if [ "$stop_on_error" = true ]; then
            echo -e "\n${YELLOW}⚠️  El proceso se ha detenido debido a un error.${NC}"
            exit 1
        fi
        return 1
    fi
}

# Función principal
main() {
    echo -e "\n${CYAN}============================================${NC}"
    echo -e "${CYAN}🚀 Iniciando Instalación del Sistema${NC}"
    echo -e "${CYAN}============================================${NC}"
    
    # Verificar que estamos en el directorio correcto
    if [ ! -f "docker-compose.yml" ]; then
        echo -e "\n${RED}❌ Error: No se encontró docker-compose.yml${NC}"
        echo -e "${YELLOW}   Por favor, ejecuta este script desde la raíz del proyecto.${NC}"
        exit 1
    fi
    
    # Verificar que Docker está instalado y corriendo
    if ! command -v docker &> /dev/null; then
        echo -e "\n${RED}❌ Error: Docker no está instalado${NC}"
        echo -e "${YELLOW}   Por favor, instala Docker primero:${NC}"
        echo -e "${NC}     curl -fsSL https://get.docker.com -o get-docker.sh"
        echo -e "${NC}     sudo sh get-docker.sh"
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "\n${RED}❌ Error: Docker no está corriendo${NC}"
        echo -e "${YELLOW}   Por favor, inicia el servicio de Docker:${NC}"
        echo -e "${NC}     sudo systemctl start docker"
        exit 1
    fi
    
    # Verificar que docker-compose está disponible
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "\n${RED}❌ Error: docker-compose no está instalado${NC}"
        echo -e "${YELLOW}   Por favor, instala docker-compose o Docker Compose V2${NC}"
        exit 1
    fi
    
    # Usar 'docker compose' (v2) si está disponible, sino 'docker-compose' (v1)
    if docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        DOCKER_COMPOSE_CMD="docker-compose"
    fi
    
    # Paso 1: Solicitar IP o usar la proporcionada
    local server_ip=""
    if [ -n "$IP_ADDRESS" ]; then
        server_ip="$IP_ADDRESS"
        echo -e "\n${CYAN}📌 Usando IP/Dominio proporcionada: $server_ip${NC}"
    else
        echo -e "\n${CYAN}📌 Configuración de IP/Dominio del Servidor${NC}"
        echo -e "${NC}   Puedes ingresar una IP (ej: 192.168.1.100) o un dominio (ej: mi-servidor.com)"
        read -p "   Ingresa la IP o dominio del servidor: " server_ip
    fi
    
    if [ -z "$server_ip" ]; then
        echo -e "\n${RED}❌ Error: Se requiere una IP o dominio para continuar${NC}"
        exit 1
    fi
    
    # Validar formato básico
    if ! validate_ip "$server_ip" && ! validate_domain "$server_ip"; then
        echo -e "\n${YELLOW}⚠️  El formato no es válido. Continuando de todos modos...${NC}"
    fi
    
    # Configurar .env
    setup_env_file "$server_ip"
    
    # Paso 2: Detener contenedores existentes (por si acaso)
    echo -e "\n${CYAN}🛑 Deteniendo contenedores existentes (si hay)...${NC}"
    $DOCKER_COMPOSE_CMD down 2>/dev/null || true
    
    # Paso 3: Limpiar builds e imágenes antiguas si existen
    echo -e "\n${CYAN}🧹 Limpiando builds e imágenes antiguas...${NC}"
    
    if [ -d "apps/web/.next" ]; then
        rm -rf apps/web/.next
        echo -e "${GREEN}  ✅ Build anterior del frontend eliminado${NC}"
    fi
    
    if [ -d "apps/api/dist" ]; then
        rm -rf apps/api/dist
        echo -e "${GREEN}  ✅ Build anterior del backend eliminado${NC}"
    fi
    
    if [ -d "apps/web/node_modules/.cache" ]; then
        rm -rf apps/web/node_modules/.cache
        echo -e "${GREEN}  ✅ Cache de node_modules eliminado${NC}"
    fi
    
    # Paso 4: Construir imágenes Docker (esto instala todas las dependencias incluyendo leaflet)
    echo -e "\n${CYAN}🔨 Construyendo imágenes Docker (esto puede tardar varios minutos)...${NC}"
    echo -e "${YELLOW}  💡 Esto instalará todas las dependencias incluyendo:${NC}"
    echo -e "${NC}     - Backend: NestJS, Prisma, y todas las dependencias"
    echo -e "${NC}     - Frontend: Next.js, Leaflet, React-Leaflet, y todas las dependencias"
    
    if safe_command "$DOCKER_COMPOSE_CMD build --no-cache api web" "Construyendo imágenes Docker" false; then
        echo -e "${GREEN}  ✅ Imágenes construidas correctamente${NC}"
    else
        echo -e "\n${YELLOW}⚠️  Hubo errores en el build. Intentando con cache...${NC}"
        if safe_command "$DOCKER_COMPOSE_CMD build api web" "Construyendo imágenes Docker (con cache)" false; then
            echo -e "${GREEN}  ✅ Imágenes construidas correctamente (con cache)${NC}"
        else
            echo -e "\n${RED}❌ Error al construir imágenes. Por favor, revisa los logs.${NC}"
            exit 1
        fi
    fi
    
    # Paso 5: Iniciar contenedores
    safe_command "$DOCKER_COMPOSE_CMD up -d" "Iniciando contenedores"
    
    # Esperar a que los servicios estén listos
    echo -e "\n${CYAN}⏳ Esperando a que los servicios estén listos...${NC}"
    sleep 15
    
    # Paso 6: Regenerar Prisma Client dentro del contenedor
    echo -e "\n${CYAN}🔄 Regenerando Prisma Client...${NC}"
    if $DOCKER_COMPOSE_CMD exec -T api npx prisma generate 2>&1; then
        echo -e "${GREEN}  ✅ Prisma Client regenerado${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Error al regenerar Prisma. Continuando...${NC}"
    fi
    
    # Paso 7: Aplicar migraciones de base de datos
    echo -e "\n${CYAN}📦 Aplicando migraciones de base de datos...${NC}"
    echo -e "${CYAN}  📋 Esto incluirá las migraciones de GPS (gps_configurations, vehicle_gps_locations)${NC}"
    if $DOCKER_COMPOSE_CMD exec -T api npx prisma migrate deploy 2>&1; then
        echo -e "${GREEN}  ✅ Migraciones aplicadas correctamente${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Hubo problemas con migrate deploy. Intentando con db push...${NC}"
        echo -e "${CYAN}  🔄 Sincronizando schema directamente...${NC}"
        if $DOCKER_COMPOSE_CMD exec -T api npx prisma db push --accept-data-loss 2>&1; then
            echo -e "${GREEN}  ✅ Schema sincronizado correctamente${NC}"
        else
            echo -e "${YELLOW}  ⚠️  Hubo problemas con las migraciones. Puedes intentar manualmente:${NC}"
            echo -e "${NC}     $DOCKER_COMPOSE_CMD exec api npx prisma migrate deploy"
        fi
    fi
    
    # Paso 8: Ejecutar seed (crear datos iniciales)
    echo -e "\n${CYAN}🌱 Ejecutando seed (creando datos iniciales)...${NC}"
    if $DOCKER_COMPOSE_CMD exec -T api npm run prisma:seed 2>&1; then
        echo -e "${GREEN}  ✅ Seed ejecutado correctamente${NC}"
    else
        echo -e "${YELLOW}  ⚠️  No se pudo ejecutar el seed. Puedes ejecutarlo manualmente:${NC}"
        echo -e "${NC}     $DOCKER_COMPOSE_CMD exec api npm run prisma:seed"
    fi
    
    # Paso 9: Verificar estado de los contenedores
    echo -e "\n${CYAN}📊 Verificando estado de los contenedores...${NC}"
    $DOCKER_COMPOSE_CMD ps
    
    # Paso 10: Mostrar información final
    echo -e "\n${GREEN}============================================${NC}"
    echo -e "${GREEN}✅ Instalación Completada${NC}"
    echo -e "${GREEN}============================================${NC}"
    
    echo -e "\n${CYAN}📍 URLs del Sistema:${NC}"
    echo -e "${NC}   Frontend: http://${server_ip}:4000"
    echo -e "${NC}   API:      http://${server_ip}:4001"
    echo -e "${NC}   Swagger:  http://${server_ip}:4001/api/docs"
    
    echo -e "\n${CYAN}🔐 Credenciales por Defecto:${NC}"
    echo -e "${NC}   Email:    admin@example.com"
    echo -e "${NC}   Password: admin123"
    
    echo -e "\n${CYAN}📋 Comandos útiles:${NC}"
    echo -e "${NC}   Ver logs:         $DOCKER_COMPOSE_CMD logs -f"
    echo -e "${NC}   Ver logs API:     $DOCKER_COMPOSE_CMD logs -f api"
    echo -e "${NC}   Ver logs Web:     $DOCKER_COMPOSE_CMD logs -f web"
    echo -e "${NC}   Detener todo:     $DOCKER_COMPOSE_CMD down"
    echo -e "${NC}   Reiniciar:        $DOCKER_COMPOSE_CMD restart"
    echo -e "${NC}   Actualizar:       ./update.sh"
    
    echo -e "\n${CYAN}✨ Nuevas Funcionalidades Incluidas:${NC}"
    echo -e "${NC}   ✅ Visualización GPS Global (Mapa GPS)"
    echo -e "${NC}   ✅ Historial de ubicaciones GPS por vehículo"
    echo -e "${NC}   ✅ Sincronización automática con Radial Tracking API"
    echo -e "${NC}   ✅ Configuración GPS desde Administración"
    
    echo -e "\n${GREEN}✨ ¡Sistema instalado y listo para usar!${NC}"
}

# Procesar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--ip)
            IP_ADDRESS="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Opción desconocida: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Ejecutar función principal
main
