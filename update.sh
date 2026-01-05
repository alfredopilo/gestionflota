#!/bin/bash

# ============================================
# Script de Actualización - Sistema de Gestión de Flotas
# ============================================
# Este script automatiza todos los pasos necesarios para actualizar
# y desplegar el sistema en un servidor VPS Linux
# ============================================

set -e  # Salir si algún comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Variables
SKIP_IP_PROMPT=false
SKIP_PRISMA=false
SKIP_BUILD=false
SKIP_CLEANUP=false
FULL_CLEANUP=false
IP_ADDRESS=""
ENV_FILE=".env"

# Función para mostrar ayuda
show_help() {
    echo -e "${CYAN}============================================${NC}"
    echo -e "${CYAN}Script de Actualización - Gestión de Flotas${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo ""
    echo "Uso:"
    echo "  ./update.sh [opciones]"
    echo ""
    echo "Opciones:"
    echo "  -i, --ip <ip>          Especifica la IP o dominio del servidor"
    echo "  -s, --skip-ip          Salta la solicitud de IP (usa valores existentes)"
    echo "  --skip-prisma          No regenera Prisma Client"
    echo "  --skip-build           No reconstruye las imágenes Docker"
    echo "  --skip-cleanup         No limpia builds anteriores e imágenes antiguas"
    echo "  --full-cleanup         Limpieza más agresiva (incluye cache de Docker)"
    echo "  -h, --help             Muestra esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./update.sh                           # Solicita IP y ejecuta todo"
    echo "  ./update.sh -i 192.168.1.100         # Usa IP específica"
    echo "  ./update.sh --ip mi-servidor.com     # Usa dominio"
    echo "  ./update.sh --skip-ip                # Solo actualiza sin cambiar IP"
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

# Función para actualizar archivo .env
update_env_file() {
    local ip=$1
    
    echo -e "\n${CYAN}📝 Actualizando archivo .env...${NC}"
    
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
    
    # Leer archivo .env si existe, o crear uno nuevo
    if [ ! -f "$ENV_FILE" ]; then
        if [ -f ".env.example" ]; then
            echo -e "${YELLOW}  ⚠️  Archivo .env no encontrado. Creando desde .env.example...${NC}"
            cp ".env.example" "$ENV_FILE"
        else
            echo -e "${YELLOW}  ⚠️  No se encontró .env ni .env.example. Creando archivo básico...${NC}"
            touch "$ENV_FILE"
        fi
    fi
    
    # Actualizar o agregar variables FRONTEND_URL y NEXT_PUBLIC_API_URL
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
    
    echo -e "${GREEN}  ✅ Archivo .env actualizado correctamente${NC}"
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
    echo -e "${CYAN}🚀 Iniciando Actualización del Sistema${NC}"
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
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        echo -e "\n${RED}❌ Error: Docker no está corriendo${NC}"
        echo -e "${YELLOW}   Por favor, inicia el servicio de Docker.${NC}"
        exit 1
    fi
    
    # Verificar que docker-compose está disponible
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo -e "\n${RED}❌ Error: docker-compose no está instalado${NC}"
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
    if [ "$SKIP_IP_PROMPT" = false ]; then
        if [ -n "$IP_ADDRESS" ]; then
            server_ip="$IP_ADDRESS"
            echo -e "\n${CYAN}📌 Usando IP/Dominio proporcionada: $server_ip${NC}"
        else
            echo -e "\n${CYAN}📌 Configuración de IP/Dominio del Servidor${NC}"
            echo -e "${NC}   Puedes ingresar una IP (ej: 192.168.1.100) o un dominio (ej: mi-servidor.com)"
            read -p "   Ingresa la IP o dominio del servidor: " server_ip
        fi
        
        if [ -z "$server_ip" ]; then
            echo -e "\n${YELLOW}⚠️  No se proporcionó IP. Usando valores existentes del .env${NC}"
        else
            # Validar formato básico
            if ! validate_ip "$server_ip" && ! validate_domain "$server_ip"; then
                echo -e "\n${YELLOW}⚠️  El formato no es válido. Continuando de todos modos...${NC}"
            fi
            
            # Actualizar .env
            update_env_file "$server_ip"
        fi
    else
        echo -e "\n${YELLOW}⏭️  Saltando actualización de IP (usando valores existentes)${NC}"
    fi
    
    # Paso 2: Detener contenedores
    safe_command "$DOCKER_COMPOSE_CMD down" "Deteniendo contenedores"
    
    # Paso 2.5: Limpiar builds anteriores e imágenes Docker antiguas
    if [ "$SKIP_CLEANUP" = false ]; then
        echo -e "\n${CYAN}🧹 Limpiando builds anteriores e imágenes Docker antiguas...${NC}"
        
        # Limpiar builds anteriores en frontend
        if [ -d "apps/web/.next" ]; then
            echo -e "${CYAN}  🗑️  Eliminando .next del frontend...${NC}"
            rm -rf apps/web/.next
            echo -e "${GREEN}  ✅ Build anterior del frontend eliminado${NC}"
        fi
        
        # Limpiar builds anteriores en backend
        if [ -d "apps/api/dist" ]; then
            echo -e "${CYAN}  🗑️  Eliminando dist del backend...${NC}"
            rm -rf apps/api/dist
            echo -e "${GREEN}  ✅ Build anterior del backend eliminado${NC}"
        fi
        
        # Limpiar node_modules/.cache si existe
        if [ -d "apps/web/node_modules/.cache" ]; then
            echo -e "${CYAN}  🗑️  Eliminando cache de node_modules...${NC}"
            rm -rf apps/web/node_modules/.cache
            echo -e "${GREEN}  ✅ Cache de node_modules eliminado${NC}"
        fi
        
        # Limpiar imágenes Docker antiguas del mismo servicio
        echo -e "${CYAN}  🗑️  Limpiando imágenes Docker antiguas...${NC}"
        
        # Eliminar imágenes huérfanas (dangling)
        local dangling_images=$(docker images -f "dangling=true" -q 2>/dev/null)
        if [ -n "$dangling_images" ]; then
            echo -e "${CYAN}    Eliminando imágenes huérfanas (dangling)...${NC}"
            docker rmi $dangling_images 2>/dev/null || true
        fi
        
        # Eliminar todas las imágenes antiguas de gestiondeflota-api excepto la más reciente
        local api_images_count=$(docker images --format "{{.ID}}" --filter "reference=gestiondeflota-api" 2>/dev/null | wc -l)
        if [ "$api_images_count" -gt 1 ]; then
            echo -e "${CYAN}    Eliminando imágenes antiguas de gestiondeflota-api (manteniendo la más reciente)...${NC}"
            docker images --format "{{.ID}}" --filter "reference=gestiondeflota-api" 2>/dev/null | tail -n +2 | xargs docker rmi -f 2>/dev/null || true
        fi
        
        # Eliminar todas las imágenes antiguas de gestiondeflota-web excepto la más reciente
        local web_images_count=$(docker images --format "{{.ID}}" --filter "reference=gestiondeflota-web" 2>/dev/null | wc -l)
        if [ "$web_images_count" -gt 1 ]; then
            echo -e "${CYAN}    Eliminando imágenes antiguas de gestiondeflota-web (manteniendo la más reciente)...${NC}"
            docker images --format "{{.ID}}" --filter "reference=gestiondeflota-web" 2>/dev/null | tail -n +2 | xargs docker rmi -f 2>/dev/null || true
        fi
        
        # Limpieza adicional si se solicita
        if [ "$FULL_CLEANUP" = true ]; then
            echo -e "${CYAN}  🗑️  Limpieza completa de cache de Docker...${NC}"
            docker builder prune -af --filter "until=24h" 2>/dev/null || true
            docker system prune -af --volumes 2>/dev/null || true
            echo -e "${GREEN}  ✅ Limpieza completa completada${NC}"
        fi
        
        echo -e "${GREEN}  ✅ Limpieza completada${NC}"
    else
        echo -e "\n${YELLOW}⏭️  Saltando limpieza de builds e imágenes (--skip-cleanup)${NC}"
    fi
    
    # Paso 3: Regenerar Prisma (si no se saltea)
    if [ "$SKIP_PRISMA" = false ]; then
        if [ -f "apps/api/prisma/schema.prisma" ]; then
            echo -e "\n${CYAN}🔄 Regenerando Prisma Client...${NC}"
            cd apps/api
            if npx prisma generate; then
                echo -e "${GREEN}  ✅ Prisma Client regenerado${NC}"
            else
                echo -e "${YELLOW}  ⚠️  Error al regenerar Prisma. Continuando...${NC}"
            fi
            cd ../..
        else
            echo -e "\n${YELLOW}⚠️  No se encontró schema.prisma. Saltando regeneración de Prisma.${NC}"
        fi
    fi
    
    # Paso 4: Reconstruir imágenes Docker (si no se saltea)
    if [ "$SKIP_BUILD" = false ]; then
        echo -e "\n${CYAN}🔨 Reconstruyendo imágenes Docker (esto puede tardar varios minutos)...${NC}"
        echo -e "${YELLOW}  💡 Tip: Si tienes problemas de espacio, puedes limpiar más agresivamente con:${NC}"
        echo -e "${NC}     docker system prune -a --volumes -f"
        echo -e "${CYAN}  📦 Instalando dependencias incluyendo:${NC}"
        echo -e "${NC}     - Frontend: Next.js, Leaflet, React-Leaflet, @types/leaflet"
        echo -e "${NC}     - Backend: NestJS, Prisma, @nestjs/schedule, y todas las dependencias GPS"
        
        # Construir con cache inteligente: usar cache para dependencias, rebuild solo código
        if safe_command "$DOCKER_COMPOSE_CMD build api web" "Reconstruyendo imágenes" false; then
            echo -e "${GREEN}  ✅ Imágenes reconstruidas correctamente${NC}"
        else
            echo -e "\n${YELLOW}⚠️  Hubo errores en el build con cache. Intentando sin cache...${NC}"
            if safe_command "$DOCKER_COMPOSE_CMD build --no-cache api web" "Reconstruyendo imágenes sin cache" false; then
                echo -e "${GREEN}  ✅ Imágenes reconstruidas correctamente (sin cache)${NC}"
            else
                echo -e "\n${YELLOW}⚠️  Hubo errores en el build. Intentando continuar...${NC}"
            fi
        fi
    else
        echo -e "\n${YELLOW}⏭️  Saltando reconstrucción de imágenes (usando imágenes existentes)${NC}"
    fi
    
    # Paso 5: Iniciar contenedores
    safe_command "$DOCKER_COMPOSE_CMD up -d" "Iniciando contenedores"
    
    # Esperar a que los servicios estén listos
    echo -e "\n${CYAN}⏳ Esperando a que los servicios estén listos...${NC}"
    sleep 10
    
    # Paso 6: Aplicar migraciones de base de datos
    echo -e "\n${CYAN}📦 Aplicando migraciones de base de datos...${NC}"
    echo -e "${YELLOW}  ⚠️  Importante: Si es la primera vez que ejecutas después de la actualización,${NC}"
    echo -e "${YELLOW}      esta migración convertirá los drivers a usuarios con rol CONDUCTOR.${NC}"
    if $DOCKER_COMPOSE_CMD exec -T api npx prisma migrate deploy 2>&1; then
        echo -e "${GREEN}  ✅ Migraciones aplicadas correctamente${NC}"
        echo -e "${CYAN}  ℹ️  Nota: Los choferes ahora se gestionan como usuarios en Configuración > Usuarios${NC}"
    else
        echo -e "${YELLOW}  ⚠️  Hubo problemas con las migraciones. Verifica manualmente:${NC}"
        echo -e "${NC}     $DOCKER_COMPOSE_CMD exec api npx prisma migrate deploy"
    fi
    
    # Paso 7: Verificar estado de los contenedores
    echo -e "\n${CYAN}📊 Verificando estado de los contenedores...${NC}"
    $DOCKER_COMPOSE_CMD ps
    
    # Paso 8: Mostrar información final
    echo -e "\n${GREEN}============================================${NC}"
    echo -e "${GREEN}✅ Actualización Completada${NC}"
    echo -e "${GREEN}============================================${NC}"
    
    if [ -n "$server_ip" ]; then
        echo -e "\n${CYAN}📍 URLs del Sistema:${NC}"
        echo -e "${NC}   Frontend: http://${server_ip}:4000"
        echo -e "${NC}   API:      http://${server_ip}:4001"
        echo -e "${NC}   Swagger:  http://${server_ip}:4001/api/docs"
    else
        echo -e "\n${CYAN}📍 URLs del Sistema (desde .env):${NC}"
        if [ -f "$ENV_FILE" ]; then
            local frontend_url=$(grep "^FRONTEND_URL=" "$ENV_FILE" | cut -d '=' -f2 | head -n1)
            local api_url=$(grep "^NEXT_PUBLIC_API_URL=" "$ENV_FILE" | cut -d '=' -f2 | head -n1)
            if [ -n "$frontend_url" ]; then
                echo -e "${NC}   Frontend: $frontend_url"
            fi
            if [ -n "$api_url" ]; then
                echo -e "${NC}   API:      $api_url"
                echo -e "${NC}   Swagger:  $api_url/api/docs"
            fi
        fi
    fi
    
    echo -e "\n${CYAN}📋 Comandos útiles:${NC}"
    echo -e "${NC}   Ver logs:         $DOCKER_COMPOSE_CMD logs -f"
    echo -e "${NC}   Ver logs API:     $DOCKER_COMPOSE_CMD logs -f api"
    echo -e "${NC}   Ver logs Web:     $DOCKER_COMPOSE_CMD logs -f web"
    echo -e "${NC}   Detener todo:     $DOCKER_COMPOSE_CMD down"
    echo -e "${NC}   Reiniciar:        $DOCKER_COMPOSE_CMD restart"
    
    echo -e "\n${CYAN}✨ Funcionalidades Actualizadas:${NC}"
    echo -e "${NC}   ✅ Visualización GPS Global (Mapa GPS) - Nueva página en el menú"
    echo -e "${NC}   ✅ Historial de ubicaciones GPS con mapas interactivos"
    echo -e "${NC}   ✅ Colores dinámicos para múltiples vehículos"
    echo -e "${NC}   ✅ Rutas automáticas para rangos ≤ 2 días"
    
    echo -e "\n${GREEN}✨ ¡Sistema actualizado y listo para usar!${NC}"
}

# Procesar argumentos
while [[ $# -gt 0 ]]; do
    case $1 in
        -i|--ip)
            IP_ADDRESS="$2"
            shift 2
            ;;
        -s|--skip-ip)
            SKIP_IP_PROMPT=true
            shift
            ;;
        --skip-prisma)
            SKIP_PRISMA=true
            shift
            ;;
        --skip-build)
            SKIP_BUILD=true
            shift
            ;;
        --skip-cleanup)
            SKIP_CLEANUP=true
            shift
            ;;
        --full-cleanup)
            FULL_CLEANUP=true
            shift
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

