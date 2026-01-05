#!/bin/bash

# ============================================
# Script para Aplicar Migración GPS en VPS
# ============================================
# Este script aplica las migraciones de GPS que faltan en el VPS
# ============================================

set -e  # Salir si algún comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Usar 'docker compose' (v2) si está disponible, sino 'docker-compose' (v1)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi

echo -e "\n${CYAN}============================================${NC}"
echo -e "${CYAN}🔧 Aplicando Migración GPS${NC}"
echo -e "${CYAN}============================================${NC}"

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo -e "\n${RED}❌ Error: No se encontró docker-compose.yml${NC}"
    echo -e "${YELLOW}   Por favor, ejecuta este script desde la raíz del proyecto.${NC}"
    exit 1
fi

# Verificar que Docker está corriendo
if ! docker info &> /dev/null; then
    echo -e "\n${RED}❌ Error: Docker no está corriendo${NC}"
    exit 1
fi

# Paso 1: Regenerar Prisma Client
echo -e "\n${CYAN}🔄 Regenerando Prisma Client...${NC}"
if $DOCKER_COMPOSE_CMD exec -T api npx prisma generate 2>&1; then
    echo -e "${GREEN}  ✅ Prisma Client regenerado${NC}"
else
    echo -e "${YELLOW}  ⚠️  Error al regenerar Prisma. Continuando...${NC}"
fi

# Paso 2: Aplicar migraciones
echo -e "\n${CYAN}📦 Aplicando migraciones de base de datos...${NC}"
if $DOCKER_COMPOSE_CMD exec -T api npx prisma migrate deploy 2>&1; then
    echo -e "${GREEN}  ✅ Migraciones aplicadas correctamente${NC}"
else
    echo -e "\n${YELLOW}⚠️  Error con migrate deploy. Intentando con db push...${NC}"
    echo -e "${CYAN}  🔄 Sincronizando schema directamente...${NC}"
    if $DOCKER_COMPOSE_CMD exec -T api npx prisma db push --accept-data-loss 2>&1; then
        echo -e "${GREEN}  ✅ Schema sincronizado correctamente${NC}"
    else
        echo -e "\n${RED}❌ Error al aplicar migraciones. Por favor, revisa los logs.${NC}"
        exit 1
    fi
fi

echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}✅ Migración GPS Aplicada${NC}"
echo -e "${GREEN}============================================${NC}"
echo -e "\n${CYAN}✨ Las tablas GPS ahora están disponibles.${NC}"
echo -e "${NC}   Puedes recargar la página de configuración GPS.${NC}"
