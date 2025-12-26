#!/bin/bash

# ============================================
# Script para Corregir Constraint de Driver en Trips
# ============================================
# Este script corrige el problema de la clave foránea
# trips_driverl_id_fkey que debería ser trips_driver1_id_fkey
# ============================================

set -e  # Salir si algún comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}🔧 Corrigiendo Constraint de Driver en Trips${NC}"
echo -e "${CYAN}============================================${NC}"

# Detectar si está en Docker o ejecutándose localmente
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
    # Usar docker-compose
    if docker compose version &> /dev/null 2>&1; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        DOCKER_COMPOSE_CMD="docker-compose"
    fi
    
    echo -e "\n${CYAN}📦 Ejecutando en contenedor Docker...${NC}"
    
    # Verificar que el contenedor de postgres esté corriendo
    if ! $DOCKER_COMPOSE_CMD ps postgres | grep -q "Up"; then
        echo -e "${RED}❌ Error: El contenedor de PostgreSQL no está corriendo${NC}"
        echo -e "${YELLOW}   Por favor, ejecuta: $DOCKER_COMPOSE_CMD up -d postgres${NC}"
        exit 1
    fi
    
    # Obtener variables de entorno del docker-compose
    DB_USER=${POSTGRES_USER:-postgres}
    DB_PASSWORD=${POSTGRES_PASSWORD:-postgres}
    DB_NAME=${POSTGRES_DB:-gestiondeflota}
    
    # Usar docker-compose exec para ejecutar psql
    PSQL_CMD="$DOCKER_COMPOSE_CMD exec -T postgres psql -U $DB_USER -d $DB_NAME"
else
    # Ejecutar directamente
    echo -e "\n${CYAN}💻 Ejecutando directamente...${NC}"
    
    DB_USER=${POSTGRES_USER:-postgres}
    DB_NAME=${POSTGRES_DB:-gestiondeflota}
    
    PSQL_CMD="psql -U $DB_USER -d $DB_NAME"
fi

echo -e "\n${CYAN}🔍 Verificando estructura actual de la tabla trips...${NC}"

# Script SQL para corregir el problema
SQL_SCRIPT=$(cat <<'EOF'
-- ============================================
-- Script de corrección de constraints de driver
-- ============================================

BEGIN;

-- 1. Verificar si existe el constraint incorrecto
DO $$
DECLARE
    constraint_exists boolean;
    column_exists boolean;
BEGIN
    -- Verificar si existe el constraint trips_driverl_id_fkey
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_driverl_id_fkey'
    ) INTO constraint_exists;
    
    -- Verificar si existe la columna driverl_id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' 
        AND column_name = 'driverl_id'
    ) INTO column_exists;
    
    -- Si existe el constraint incorrecto, eliminarlo
    IF constraint_exists THEN
        RAISE NOTICE 'Eliminando constraint incorrecto trips_driverl_id_fkey...';
        ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driverl_id_fkey;
    END IF;
    
    -- Si existe la columna con nombre incorrecto, renombrarla
    IF column_exists THEN
        RAISE NOTICE 'Renombrando columna driverl_id a driver1_id...';
        ALTER TABLE trips RENAME COLUMN driverl_id TO driver1_id;
    END IF;
END $$;

-- 2. Eliminar el constraint correcto si existe (para recrearlo limpio)
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driver1_id_fkey;

-- 3. Verificar que la columna driver1_id existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' 
        AND column_name = 'driver1_id'
    ) THEN
        RAISE EXCEPTION 'La columna driver1_id no existe en la tabla trips';
    END IF;
END $$;

-- 4. Crear el constraint correcto
ALTER TABLE trips 
ADD CONSTRAINT trips_driver1_id_fkey 
FOREIGN KEY (driver1_id) 
REFERENCES drivers(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- 5. Verificar que el constraint se creó correctamente
DO $$
DECLARE
    constraint_created boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_driver1_id_fkey'
        AND conrelid = 'trips'::regclass
    ) INTO constraint_created;
    
    IF constraint_created THEN
        RAISE NOTICE '✅ Constraint trips_driver1_id_fkey creado correctamente';
    ELSE
        RAISE EXCEPTION '❌ Error: No se pudo crear el constraint';
    END IF;
END $$;

COMMIT;

-- 6. Mostrar información de la tabla trips
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trips'
AND column_name LIKE '%driver%'
ORDER BY column_name;

-- 7. Mostrar constraints relacionados con driver
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    a.attname AS column_name
FROM pg_constraint con
JOIN pg_attribute a ON a.attnum = ANY(con.conkey)
WHERE conrelid = 'trips'::regclass
AND (a.attname LIKE '%driver%')
AND con.contype = 'f'
ORDER BY conname;
EOF
)

# Ejecutar el script SQL
echo -e "${CYAN}🔄 Ejecutando correcciones...${NC}"

if echo "$SQL_SCRIPT" | $PSQL_CMD; then
    echo -e "\n${GREEN}✅ Correcciones aplicadas exitosamente${NC}"
    echo -e "\n${CYAN}📋 Verificando resultados...${NC}"
    
    # Verificar que el constraint correcto existe
    VERIFY_QUERY="SELECT conname FROM pg_constraint WHERE conname = 'trips_driver1_id_fkey' AND conrelid = 'trips'::regclass;"
    
    if echo "$VERIFY_QUERY" | $PSQL_CMD -t | grep -q "trips_driver1_id_fkey"; then
        echo -e "${GREEN}✅ El constraint correcto existe${NC}"
    else
        echo -e "${YELLOW}⚠️  No se pudo verificar el constraint. Por favor, revisa manualmente.${NC}"
    fi
    
    # Verificar que no existe el constraint incorrecto
    VERIFY_INCORRECT="SELECT conname FROM pg_constraint WHERE conname = 'trips_driverl_id_fkey';"
    
    if ! echo "$VERIFY_INCORRECT" | $PSQL_CMD -t | grep -q "trips_driverl_id_fkey"; then
        echo -e "${GREEN}✅ El constraint incorrecto no existe${NC}"
    else
        echo -e "${YELLOW}⚠️  El constraint incorrecto todavía existe. Puede ser necesario ejecutar el script nuevamente.${NC}"
    fi
    
    echo -e "\n${GREEN}============================================${NC}"
    echo -e "${GREEN}✨ Corrección completada${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo -e "\n${CYAN}💡 Próximos pasos:${NC}"
    echo -e "${NC}   1. Reinicia el contenedor de la API:"
    echo -e "${NC}      docker-compose restart api"
    echo -e "\n${NC}   2. Verifica los logs:"
    echo -e "${NC}      docker-compose logs -f api"
    
else
    echo -e "\n${RED}❌ Error al ejecutar las correcciones${NC}"
    echo -e "${YELLOW}   Por favor, revisa los mensajes de error arriba${NC}"
    exit 1
fi

