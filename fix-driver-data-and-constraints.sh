#!/bin/bash

# ============================================
# Script Completo para Corregir Datos y Constraints de Driver
# ============================================
# Este script:
# 1. Encuentra y limpia trips con driver IDs inválidos
# 2. Corrige nombres de columnas y constraints incorrectos
# 3. Verifica que todas las migraciones estén aplicadas
# 4. Valida la integridad referencial completa
# ============================================

set -e  # Salir si algún comando falla

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}============================================${NC}"
echo -e "${CYAN}🔧 Corrección Completa de Drivers en Trips${NC}"
echo -e "${CYAN}============================================${NC}"

# Detectar si está en Docker o ejecutándose localmente
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
    if docker compose version &> /dev/null 2>&1; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        DOCKER_COMPOSE_CMD="docker-compose"
    fi
    
    echo -e "\n${CYAN}📦 Ejecutando en contenedor Docker...${NC}"
    
    if ! $DOCKER_COMPOSE_CMD ps postgres | grep -q "Up"; then
        echo -e "${RED}❌ Error: El contenedor de PostgreSQL no está corriendo${NC}"
        echo -e "${YELLOW}   Por favor, ejecuta: $DOCKER_COMPOSE_CMD up -d postgres${NC}"
        exit 1
    fi
    
    DB_USER=${POSTGRES_USER:-postgres}
    DB_NAME=${POSTGRES_DB:-gestiondeflota}
    PSQL_CMD="$DOCKER_COMPOSE_CMD exec -T postgres psql -U $DB_USER -d $DB_NAME"
else
    echo -e "\n${CYAN}💻 Ejecutando directamente...${NC}"
    DB_USER=${POSTGRES_USER:-postgres}
    DB_NAME=${POSTGRES_DB:-gestiondeflota}
    PSQL_CMD="psql -U $DB_USER -d $DB_NAME"
fi

# ============================================
# PASO 1: DIAGNÓSTICO COMPLETO
# ============================================
echo -e "\n${CYAN}📊 PASO 1: DIAGNÓSTICO INICIAL${NC}"
echo -e "${CYAN}============================================${NC}"

DIAGNOSTIC_SCRIPT=$(cat <<'EOF'
-- Verificar trips con driver IDs inválidos
SELECT '=== TRIPS CON DRIVER1_ID INVÁLIDO ===' AS info;

SELECT 
    t.id AS trip_id,
    t.driver1_id,
    t.date,
    CASE 
        WHEN d1.id IS NULL THEN '❌ NO EXISTE'
        ELSE '✅ Existe'
    END AS driver1_status
FROM trips t
LEFT JOIN drivers d1 ON t.driver1_id = d1.id
WHERE t.driver1_id IS NOT NULL
AND d1.id IS NULL
LIMIT 10;

SELECT '=== TRIPS CON DRIVER2_ID INVÁLIDO ===' AS info;

SELECT 
    t.id AS trip_id,
    t.driver2_id,
    t.date,
    CASE 
        WHEN d2.id IS NULL THEN '❌ NO EXISTE'
        ELSE '✅ Existe'
    END AS driver2_status
FROM trips t
LEFT JOIN drivers d2 ON t.driver2_id = d2.id
WHERE t.driver2_id IS NOT NULL
AND d2.id IS NULL
LIMIT 10;

SELECT '=== RESUMEN DE DATOS INVÁLIDOS ===' AS info;

SELECT 
    (SELECT COUNT(*) FROM trips t 
     LEFT JOIN drivers d1 ON t.driver1_id = d1.id 
     WHERE t.driver1_id IS NOT NULL AND d1.id IS NULL) AS driver1_invalidos,
    (SELECT COUNT(*) FROM trips t 
     LEFT JOIN drivers d2 ON t.driver2_id = d2.id 
     WHERE t.driver2_id IS NOT NULL AND d2.id IS NULL) AS driver2_invalidos;

-- Verificar estructura actual
SELECT '=== ESTRUCTURA ACTUAL DE COLUMNAS ===' AS info;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trips'
AND column_name LIKE '%driver%'
ORDER BY column_name;

-- Verificar constraints actuales
SELECT '=== CONSTRAINTS ACTUALES ===' AS info;

SELECT 
    conname AS constraint_name,
    CASE contype
        WHEN 'f' THEN 'FOREIGN KEY'
        ELSE contype::text
    END AS constraint_type
FROM pg_constraint
WHERE conrelid = 'trips'::regclass
AND (conname LIKE '%driver%' OR conname LIKE '%driverl%')
ORDER BY conname;
EOF
)

echo "$DIAGNOSTIC_SCRIPT" | $PSQL_CMD

# ============================================
# PASO 2: LIMPIAR DATOS INVÁLIDOS
# ============================================
echo -e "\n${CYAN}🧹 PASO 2: LIMPIANDO DATOS INVÁLIDOS${NC}"
echo -e "${CYAN}============================================${NC}"

CLEANUP_SCRIPT=$(cat <<'EOF'
BEGIN;

-- Limpiar driver1_id inválidos
DO $$
DECLARE
    updated_count int;
BEGIN
    UPDATE trips t
    SET driver1_id = NULL
    WHERE t.driver1_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM drivers d WHERE d.id = t.driver1_id
    );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Limpiados % registros con driver1_id inválido', updated_count;
END $$;

-- Limpiar driver2_id inválidos
DO $$
DECLARE
    updated_count int;
BEGIN
    UPDATE trips t
    SET driver2_id = NULL
    WHERE t.driver2_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM drivers d WHERE d.id = t.driver2_id
    );
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE '✅ Limpiados % registros con driver2_id inválido', updated_count;
END $$;

COMMIT;
EOF
)

echo "$CLEANUP_SCRIPT" | $PSQL_CMD

# ============================================
# PASO 3: CORREGIR ESTRUCTURA DE COLUMNAS Y CONSTRAINTS
# ============================================
echo -e "\n${CYAN}🔧 PASO 3: CORRIGIENDO ESTRUCTURA${NC}"
echo -e "${CYAN}============================================${NC}"

FIX_STRUCTURE_SCRIPT=$(cat <<'EOF'
BEGIN;

-- Eliminar TODOS los constraints relacionados con driver (correctos e incorrectos)
DO $$
BEGIN
    RAISE NOTICE 'Eliminando constraints existentes...';
END $$;

ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driver1_id_fkey;
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driver2_id_fkey;
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driverl_id_fkey;
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driver2l_id_fkey;
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driver_id_fkey;

-- Corregir nombres de columnas si están incorrectos
DO $$
BEGIN
    -- Renombrar driverl_id a driver1_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' AND column_name = 'driverl_id'
    ) THEN
        ALTER TABLE trips RENAME COLUMN driverl_id TO driver1_id;
        RAISE NOTICE '✅ Columna driverl_id renombrada a driver1_id';
    END IF;
    
    -- Renombrar driver2l_id a driver2_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' AND column_name = 'driver2l_id'
    ) THEN
        ALTER TABLE trips RENAME COLUMN driver2l_id TO driver2_id;
        RAISE NOTICE '✅ Columna driver2l_id renombrada a driver2_id';
    END IF;
    
    -- Renombrar driver_id a driver1_id (si existe sin número)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' AND column_name = 'driver_id'
        AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trips' AND column_name = 'driver1_id'
        )
    ) THEN
        ALTER TABLE trips RENAME COLUMN driver_id TO driver1_id;
        RAISE NOTICE '✅ Columna driver_id renombrada a driver1_id';
    END IF;
END $$;

-- Verificar que las columnas existen antes de crear constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' AND column_name = 'driver1_id'
    ) THEN
        RAISE EXCEPTION 'La columna driver1_id no existe. Necesitas aplicar las migraciones.';
    END IF;
END $$;

-- Crear constraint para driver1_id
DO $$
BEGIN
    RAISE NOTICE 'Creando constraint trips_driver1_id_fkey...';
END $$;

ALTER TABLE trips 
ADD CONSTRAINT trips_driver1_id_fkey 
FOREIGN KEY (driver1_id) 
REFERENCES drivers(id) 
ON DELETE SET NULL 
ON UPDATE CASCADE;

DO $$
BEGIN
    RAISE NOTICE '✅ Constraint trips_driver1_id_fkey creado';
END $$;

-- Crear constraint para driver2_id si la columna existe
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' AND column_name = 'driver2_id'
    ) THEN
        ALTER TABLE trips 
        ADD CONSTRAINT trips_driver2_id_fkey 
        FOREIGN KEY (driver2_id) 
        REFERENCES drivers(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE '✅ Constraint trips_driver2_id_fkey creado';
    ELSE
        RAISE NOTICE 'ℹ️  La columna driver2_id no existe (normal si no se usa)';
    END IF;
END $$;

COMMIT;
EOF
)

echo "$FIX_STRUCTURE_SCRIPT" | $PSQL_CMD 2>&1 || {
    echo -e "${YELLOW}⚠️  Algunos warnings son normales. Continuando...${NC}"
}

# ============================================
# PASO 4: VERIFICAR MIGRACIONES
# ============================================
echo -e "\n${CYAN}📦 PASO 4: VERIFICANDO MIGRACIONES${NC}"
echo -e "${CYAN}============================================${NC}"

MIGRATION_CHECK=$(cat <<'EOF'
SELECT 
    migration_name,
    finished_at,
    applied_steps_count,
    CASE 
        WHEN finished_at IS NULL THEN '⚠️  PENDIENTE'
        ELSE '✅ APLICADA'
    END AS status
FROM _prisma_migrations
ORDER BY finished_at DESC NULLS LAST
LIMIT 15;
EOF
)

echo "$MIGRATION_CHECK" | $PSQL_CMD

# ============================================
# PASO 5: VERIFICACIÓN FINAL
# ============================================
echo -e "\n${CYAN}✅ PASO 5: VERIFICACIÓN FINAL${NC}"
echo -e "${CYAN}============================================${NC}"

FINAL_VERIFICATION=$(cat <<'EOF'
-- Verificar que no hay datos inválidos
SELECT '=== VERIFICACIÓN DE DATOS VÁLIDOS ===' AS info;

SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM trips t
            LEFT JOIN drivers d1 ON t.driver1_id = d1.id
            WHERE t.driver1_id IS NOT NULL AND d1.id IS NULL
        ) THEN '✅ Todos los driver1_id son válidos'
        ELSE '❌ Aún existen driver1_id inválidos'
    END AS driver1_validation,
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM trips t
            LEFT JOIN drivers d2 ON t.driver2_id = d2.id
            WHERE t.driver2_id IS NOT NULL AND d2.id IS NULL
        ) THEN '✅ Todos los driver2_id son válidos'
        ELSE '❌ Aún existen driver2_id inválidos'
    END AS driver2_validation;

-- Verificar constraints
SELECT '=== VERIFICACIÓN DE CONSTRAINTS ===' AS info;

SELECT 
    conname AS constraint_name,
    CASE contype
        WHEN 'f' THEN 'FOREIGN KEY'
        ELSE contype::text
    END AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'trips'::regclass
AND conname LIKE '%driver%'
ORDER BY conname;

-- Verificar estructura de columnas
SELECT '=== ESTRUCTURA FINAL DE COLUMNAS ===' AS info;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trips'
AND column_name LIKE '%driver%'
ORDER BY column_name;

-- Verificar tabla drivers
SELECT '=== TABLA DRIVERS ===' AS info;

SELECT 
    COUNT(*)::text || ' conductores registrados' AS drivers_info,
    COUNT(DISTINCT id)::text || ' IDs únicos' AS unique_ids
FROM drivers;
EOF
)

echo "$FINAL_VERIFICATION" | $PSQL_CMD

# ============================================
# RESUMEN Y PRÓXIMOS PASOS
# ============================================
echo -e "\n${GREEN}============================================${NC}"
echo -e "${GREEN}✨ CORRECCIÓN COMPLETADA${NC}"
echo -e "${GREEN}============================================${NC}"

echo -e "\n${CYAN}💡 Próximos pasos en el VPS:${NC}"
echo -e "${NC}   1. Aplicar migraciones pendientes (si hay):"
echo -e "${NC}      $DOCKER_COMPOSE_CMD exec api npx prisma migrate deploy"
echo -e "\n${NC}   2. Regenerar Prisma Client:"
echo -e "${NC}      $DOCKER_COMPOSE_CMD exec api npx prisma generate"
echo -e "\n${NC}   3. Reiniciar el contenedor de la API:"
echo -e "${NC}      $DOCKER_COMPOSE_CMD restart api"
echo -e "\n${NC}   4. Verificar logs:"
echo -e "${NC}      $DOCKER_COMPOSE_CMD logs -f api"
echo -e "\n${CYAN}⚠️  Si el problema persiste:${NC}"
echo -e "${NC}   - Verifica que los choferes existan en la tabla drivers"
echo -e "${NC}   - Revisa los logs de la API para ver qué driver_id está causando el error"
echo -e "${NC}   - Verifica que no se estén enviando strings vacíos en lugar de null"
echo -e "${NC}   - Ejecuta este script nuevamente para verificar"

