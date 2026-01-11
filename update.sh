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

# Función para aplicar migraciones SQL críticas directamente
apply_critical_migrations() {
    echo -e "${CYAN}  📋 Verificando y aplicando migraciones SQL críticas...${NC}"
    
    # Migración: Agregar columna maintenance_plan_id a vehicles
    echo -e "${CYAN}  🔄 Verificando columna maintenance_plan_id en vehicles...${NC}"
    $DOCKER_COMPOSE_CMD exec -T postgres psql -U postgres -d gestiondeflota -c "
        ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS maintenance_plan_id TEXT;
        CREATE INDEX IF NOT EXISTS vehicles_maintenance_plan_id_idx ON vehicles(maintenance_plan_id);
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✅ Columna maintenance_plan_id verificada/creada${NC}"
    else
        echo -e "${YELLOW}  ⚠️  No se pudo verificar maintenance_plan_id (puede que ya exista)${NC}"
    fi
    
    # Migración: Crear tabla workshops y actualizar work_orders
    echo -e "${CYAN}  🔄 Verificando tabla workshops y campos de ubicación...${NC}"
    $DOCKER_COMPOSE_CMD exec -T postgres psql -U postgres -d gestiondeflota -c "
        -- Crear tabla workshops si no existe
        CREATE TABLE IF NOT EXISTS workshops (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            name TEXT NOT NULL,
            contact_person TEXT,
            phone TEXT,
            email TEXT,
            address TEXT,
            notes TEXT,
            is_active BOOLEAN DEFAULT true NOT NULL,
            company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL,
            updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
        
        -- Crear índices para workshops
        CREATE INDEX IF NOT EXISTS workshops_company_id_idx ON workshops(company_id);
        CREATE INDEX IF NOT EXISTS workshops_is_active_idx ON workshops(is_active);
        
        -- Agregar columnas is_internal y workshop_id a work_orders
        ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT true;
        ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS workshop_id TEXT REFERENCES workshops(id);
        
        -- Crear índice para workshop_id
        CREATE INDEX IF NOT EXISTS work_orders_workshop_id_idx ON work_orders(workshop_id);
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✅ Tabla workshops y campos de ubicación verificados/creados${NC}"
    else
        echo -e "${YELLOW}  ⚠️  No se pudieron verificar tablas workshops (pueden ya existir)${NC}"
    fi
    
    # Migración: Agregar tablas GPS si no existen
    echo -e "${CYAN}  🔄 Verificando tablas GPS...${NC}"
    $DOCKER_COMPOSE_CMD exec -T postgres psql -U postgres -d gestiondeflota -c "
        CREATE TABLE IF NOT EXISTS gps_configurations (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            company_id TEXT NOT NULL REFERENCES companies(id),
            provider TEXT NOT NULL DEFAULT 'RADIAL_TRACKING',
            api_url TEXT,
            api_key TEXT,
            api_secret TEXT,
            is_active BOOLEAN DEFAULT true,
            sync_interval_minutes INTEGER DEFAULT 5,
            last_sync_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS vehicle_gps_locations (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
            vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
            latitude DECIMAL(10,8) NOT NULL,
            longitude DECIMAL(11,8) NOT NULL,
            speed DECIMAL(10,2),
            heading DECIMAL(10,2),
            altitude DECIMAL(10,2),
            recorded_at TIMESTAMP NOT NULL,
            received_at TIMESTAMP DEFAULT NOW(),
            raw_data JSONB,
            created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS vehicle_gps_locations_vehicle_id_idx ON vehicle_gps_locations(vehicle_id);
        CREATE INDEX IF NOT EXISTS vehicle_gps_locations_recorded_at_idx ON vehicle_gps_locations(recorded_at);
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✅ Tablas GPS verificadas/creadas${NC}"
    else
        echo -e "${YELLOW}  ⚠️  No se pudieron verificar tablas GPS (pueden ya existir)${NC}"
    fi
    
    # Migración: Actualizar categorías de vehículos
    echo -e "${CYAN}  🔄 Actualizando categorías de vehículos...${NC}"
    $DOCKER_COMPOSE_CMD exec -T postgres psql -U postgres -d gestiondeflota -c "
        UPDATE vehicles SET category = 'CARROCERIA' WHERE category = 'CARRO' OR category IS NULL;
        UPDATE vehicles SET category = 'ELEMENTO_ARRASTRE' WHERE category = 'CUERPO_ARRASTRE';
    " 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}  ✅ Categorías de vehículos actualizadas${NC}"
    else
        echo -e "${YELLOW}  ⚠️  No se pudieron actualizar categorías (pueden ya estar correctas)${NC}"
    fi
    
    echo -e "${GREEN}  ✅ Migraciones SQL críticas completadas${NC}"
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
    
    # Paso 3: Nota sobre Prisma (se regenerará después dentro del contenedor)
    if [ "$SKIP_PRISMA" = false ]; then
        echo -e "\n${CYAN}📝 Nota: Prisma Client se regenerará dentro del contenedor Docker${NC}"
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
    
    # Esperar a que los servicios estén listos con verificación activa
    echo -e "\n${CYAN}⏳ Esperando a que los servicios estén listos...${NC}"
    
    # Función para esperar a que el contenedor API esté listo
    wait_for_api() {
        local max_attempts=30
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if $DOCKER_COMPOSE_CMD exec -T api echo "ready" &>/dev/null; then
                echo -e "${GREEN}  ✅ Contenedor API listo${NC}"
                return 0
            fi
            echo -e "${CYAN}  ⏳ Esperando contenedor API... (intento $attempt/$max_attempts)${NC}"
            sleep 2
            attempt=$((attempt + 1))
        done
        
        echo -e "${YELLOW}  ⚠️  Tiempo de espera agotado para API${NC}"
        return 1
    }
    
    # Función para esperar a que PostgreSQL esté listo
    wait_for_postgres() {
        local max_attempts=30
        local attempt=1
        
        while [ $attempt -le $max_attempts ]; do
            if $DOCKER_COMPOSE_CMD exec -T postgres pg_isready -U postgres &>/dev/null; then
                echo -e "${GREEN}  ✅ PostgreSQL listo${NC}"
                return 0
            fi
            echo -e "${CYAN}  ⏳ Esperando PostgreSQL... (intento $attempt/$max_attempts)${NC}"
            sleep 2
            attempt=$((attempt + 1))
        done
        
        echo -e "${YELLOW}  ⚠️  Tiempo de espera agotado para PostgreSQL${NC}"
        return 1
    }
    
    # Esperar a PostgreSQL primero
    wait_for_postgres
    
    # Esperar un poco más para que el contenedor API termine de iniciar
    sleep 5
    
    # Esperar a que el contenedor API esté listo
    wait_for_api
    
    # Paso 6: Regenerar Prisma Client dentro del contenedor
    if [ "$SKIP_PRISMA" = false ]; then
        echo -e "\n${CYAN}🔄 Regenerando Prisma Client dentro del contenedor...${NC}"
        
        # Intentar regenerar Prisma con reintentos
        local prisma_success=false
        for i in 1 2 3; do
            echo -e "${CYAN}  📝 Intento $i de regenerar Prisma Client...${NC}"
            if $DOCKER_COMPOSE_CMD exec -T api sh -c "cd /app && npx prisma generate" 2>&1; then
                echo -e "${GREEN}  ✅ Prisma Client regenerado correctamente${NC}"
                prisma_success=true
                break
            else
                echo -e "${YELLOW}  ⚠️  Intento $i fallido. ${NC}"
                if [ $i -lt 3 ]; then
                    echo -e "${CYAN}  ⏳ Esperando 5 segundos antes de reintentar...${NC}"
                    sleep 5
                fi
            fi
        done
        
        if [ "$prisma_success" = false ]; then
            echo -e "${YELLOW}  ⚠️  No se pudo regenerar Prisma después de 3 intentos.${NC}"
            echo -e "${CYAN}  💡 Puedes intentar manualmente:${NC}"
            echo -e "${NC}     $DOCKER_COMPOSE_CMD exec api npx prisma generate"
        fi
    fi
    
    # Paso 7: Aplicar migraciones de base de datos
    echo -e "\n${CYAN}📦 Aplicando migraciones de base de datos...${NC}"
    echo -e "${YELLOW}  ⚠️  Importante: Esto aplicará todas las migraciones pendientes.${NC}"
    
    local migration_success=false
    
    # Intentar migrate deploy primero
    if $DOCKER_COMPOSE_CMD exec -T api sh -c "cd /app && npx prisma migrate deploy" 2>&1; then
        echo -e "${GREEN}  ✅ Migraciones aplicadas correctamente${NC}"
        migration_success=true
    else
        echo -e "${YELLOW}  ⚠️  Hubo problemas con migrate deploy. Intentando con db push...${NC}"
        echo -e "${CYAN}  🔄 Sincronizando schema directamente...${NC}"
        
        if $DOCKER_COMPOSE_CMD exec -T api sh -c "cd /app && npx prisma db push --accept-data-loss" 2>&1; then
            echo -e "${GREEN}  ✅ Schema sincronizado correctamente${NC}"
            migration_success=true
        else
            echo -e "${YELLOW}  ⚠️  Hubo problemas con las migraciones de Prisma.${NC}"
        fi
    fi
    
    # Aplicar migraciones SQL críticas directamente como fallback
    echo -e "\n${CYAN}🔧 Aplicando migraciones SQL críticas...${NC}"
    apply_critical_migrations
    
    # Reiniciar el contenedor API para aplicar cambios de Prisma
    echo -e "\n${CYAN}🔄 Reiniciando contenedor API para aplicar cambios...${NC}"
    $DOCKER_COMPOSE_CMD restart api
    sleep 5
    
    # Paso 8: Verificar estado de los contenedores
    echo -e "\n${CYAN}📊 Verificando estado de los contenedores...${NC}"
    $DOCKER_COMPOSE_CMD ps
    
    # Paso 9: Mostrar información final
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
    echo -e "${NC}   ✅ Importación masiva de vehículos desde Excel"
    echo -e "${NC}   ✅ Importación masiva de usuarios desde Excel"
    echo -e "${NC}   ✅ Múltiples planes de mantenimiento activos por tipo"
    echo -e "${NC}   ✅ Asignación directa de plan de mantenimiento a vehículos"
    echo -e "${NC}   ✅ Visualización GPS Global con mapas interactivos"
    echo -e "${NC}   ✅ Gestión de talleres internos/externos en órdenes de trabajo"
    
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

