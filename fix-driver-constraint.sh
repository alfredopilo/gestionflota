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

# Primero, mostrar un diagnóstico completo
echo -e "\n${CYAN}📊 DIAGNÓSTICO INICIAL${NC}"
echo -e "${CYAN}============================================${NC}"

DIAGNOSTIC_SCRIPT=$(cat <<'EOF'
-- Diagnóstico completo de la estructura de trips
SELECT '=== COLUMNAS DE DRIVER EN TRIPS ===' AS info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'trips'
AND column_name LIKE '%driver%'
ORDER BY column_name;

SELECT '=== CONSTRAINTS DE DRIVER EN TRIPS ===' AS info;

SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    CASE contype
        WHEN 'f' THEN 'FOREIGN KEY'
        WHEN 'p' THEN 'PRIMARY KEY'
        WHEN 'u' THEN 'UNIQUE'
        WHEN 'c' THEN 'CHECK'
        ELSE contype::text
    END AS type_description,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'trips'::regclass
AND conname LIKE '%driver%'
ORDER BY conname;

SELECT '=== TABLA DRIVERS ===' AS info;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'drivers'
ORDER BY ordinal_position
LIMIT 5;

SELECT '=== MIGRACIONES APLICADAS ===' AS info;

SELECT 
    id,
    migration_name,
    finished_at,
    applied_steps_count
FROM _prisma_migrations
ORDER BY finished_at DESC
LIMIT 10;
EOF
)

echo "$DIAGNOSTIC_SCRIPT" | $PSQL_CMD

echo -e "\n${CYAN}🔄 Analizando problemas encontrados...${NC}"

# Script SQL para corregir el problema
SQL_SCRIPT=$(cat <<'EOF'
-- ============================================
-- Script de corrección de constraints de driver
-- ============================================

BEGIN;

-- Verificación previa: Mostrar estado actual
DO $$
BEGIN
    RAISE NOTICE '=== INICIANDO CORRECCIÓN DE CONSTRAINTS ===';
    RAISE NOTICE 'Verificando estructura de la tabla trips...';
END $$;

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

-- 7. Corregir trips_driver2_id_fkey si tiene el mismo problema
DO $$
DECLARE
    constraint_exists boolean;
    column_exists boolean;
BEGIN
    -- Verificar si existe el constraint trips_driver2l_id_fkey o trips_driver2_id_fkey incorrecto
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname IN ('trips_driver2l_id_fkey', 'trips_driver_id_fkey')
    ) INTO constraint_exists;
    
    -- Verificar si existe la columna driver2l_id o driver_id
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' 
        AND column_name IN ('driver2l_id', 'driver_id')
    ) INTO column_exists;
    
    -- Si existe el constraint incorrecto, eliminarlo
    IF constraint_exists THEN
        RAISE NOTICE 'Eliminando constraints incorrectos de driver2...';
        ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driver2l_id_fkey;
        ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driver_id_fkey;
    END IF;
    
    -- Si existe la columna con nombre incorrecto, renombrarla
    IF column_exists THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trips' AND column_name = 'driver2l_id'
        ) THEN
            RAISE NOTICE 'Renombrando columna driver2l_id a driver2_id...';
            ALTER TABLE trips RENAME COLUMN driver2l_id TO driver2_id;
        END IF;
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trips' AND column_name = 'driver_id'
        ) THEN
            RAISE NOTICE 'Renombrando columna driver_id a driver1_id...';
            ALTER TABLE trips RENAME COLUMN driver_id TO driver1_id;
        END IF;
    END IF;
END $$;

-- 8. Eliminar el constraint correcto de driver2 si existe (para recrearlo limpio)
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driver2_id_fkey;

-- 9. Verificar que la columna driver2_id existe y crear el constraint
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' 
        AND column_name = 'driver2_id'
    ) THEN
        RAISE NOTICE 'Creando constraint trips_driver2_id_fkey...';
        
        -- Crear el constraint correcto para driver2
        ALTER TABLE trips 
        ADD CONSTRAINT trips_driver2_id_fkey 
        FOREIGN KEY (driver2_id) 
        REFERENCES drivers(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
        
        RAISE NOTICE '✅ Constraint trips_driver2_id_fkey creado correctamente';
    ELSE
        RAISE NOTICE 'ℹ️  La columna driver2_id no existe, omitiendo constraint de driver2';
    END IF;
END $$;

-- 11. Verificación final y reporte
DO $$
DECLARE
    driver1_constraint_exists boolean;
    driver2_constraint_exists boolean;
    driver1_column_exists boolean;
    driver2_column_exists boolean;
    total_constraints int;
BEGIN
    RAISE NOTICE '=== VERIFICACIÓN FINAL ===';
    
    -- Verificar columnas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' AND column_name = 'driver1_id'
    ) INTO driver1_column_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'trips' AND column_name = 'driver2_id'
    ) INTO driver2_column_exists;
    
    -- Verificar constraints
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_driver1_id_fkey' 
        AND conrelid = 'trips'::regclass
    ) INTO driver1_constraint_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'trips_driver2_id_fkey' 
        AND conrelid = 'trips'::regclass
    ) INTO driver2_constraint_exists;
    
    -- Contar constraints incorrectos
    SELECT COUNT(*) INTO total_constraints
    FROM pg_constraint
    WHERE conrelid = 'trips'::regclass
    AND conname IN ('trips_driverl_id_fkey', 'trips_driver2l_id_fkey', 'trips_driver_id_fkey');
    
    RAISE NOTICE 'RESUMEN:';
    RAISE NOTICE '  - Columna driver1_id existe: %', driver1_column_exists;
    RAISE NOTICE '  - Columna driver2_id existe: %', driver2_column_exists;
    RAISE NOTICE '  - Constraint trips_driver1_id_fkey existe: %', driver1_constraint_exists;
    RAISE NOTICE '  - Constraint trips_driver2_id_fkey existe: %', driver2_constraint_exists;
    RAISE NOTICE '  - Constraints incorrectos restantes: %', total_constraints;
    
    IF driver1_column_exists AND NOT driver1_constraint_exists THEN
        RAISE WARNING '⚠️  La columna driver1_id existe pero no tiene constraint. Esto será corregido.';
    END IF;
    
    IF driver2_column_exists AND NOT driver2_constraint_exists THEN
        RAISE WARNING '⚠️  La columna driver2_id existe pero no tiene constraint. Esto será corregido.';
    END IF;
    
    IF total_constraints > 0 THEN
        RAISE WARNING '⚠️  Aún existen % constraints incorrectos', total_constraints;
    END IF;
END $$;

-- 12. Mostrar estado final de constraints
SELECT '=== CONSTRAINTS FINALES DE DRIVER ===' AS info;

SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    a.attname AS column_name,
    pg_get_constraintdef(con.oid) AS definition
FROM pg_constraint con
JOIN pg_attribute a ON a.attnum = ANY(con.conkey) AND a.attrelid = con.conrelid
WHERE conrelid = 'trips'::regclass
AND (a.attname LIKE '%driver%')
AND con.contype = 'f'
ORDER BY conname;

-- 13. Verificar índices relacionados
SELECT '=== ÍNDICES DE DRIVER EN TRIPS ===' AS info;

SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'trips'
AND indexdef LIKE '%driver%'
ORDER BY indexname;
EOF
)

# Verificar estructura esperada vs actual
echo -e "\n${CYAN}📋 Verificando estructura esperada vs actual...${NC}"

VERIFICATION_SCRIPT=$(cat <<'EOF'
-- Verificar que las columnas esperadas existen
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trips' AND column_name = 'driver1_id'
        ) THEN '✅ driver1_id existe'
        ELSE '❌ driver1_id NO existe'
    END AS driver1_column_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trips' AND column_name = 'driver2_id'
        ) THEN '✅ driver2_id existe'
        ELSE '⚠️  driver2_id NO existe (opcional)'
    END AS driver2_column_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'trips_driver1_id_fkey' 
            AND conrelid = 'trips'::regclass
        ) THEN '✅ trips_driver1_id_fkey existe'
        ELSE '❌ trips_driver1_id_fkey NO existe'
    END AS driver1_constraint_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'trips_driver2_id_fkey' 
            AND conrelid = 'trips'::regclass
        ) THEN '✅ trips_driver2_id_fkey existe'
        ELSE '⚠️  trips_driver2_id_fkey NO existe (si driver2_id existe, esto debería crearse)'
    END AS driver2_constraint_status;

-- Verificar si existen columnas o constraints incorrectos
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trips' AND column_name IN ('driverl_id', 'driver2l_id', 'driver_id')
        ) THEN '⚠️  Existen columnas con nombres incorrectos'
        ELSE '✅ No hay columnas con nombres incorrectos'
    END AS incorrect_columns_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'trips'::regclass
            AND conname IN ('trips_driverl_id_fkey', 'trips_driver2l_id_fkey', 'trips_driver_id_fkey')
        ) THEN '⚠️  Existen constraints con nombres incorrectos'
        ELSE '✅ No hay constraints con nombres incorrectos'
    END AS incorrect_constraints_status;
EOF
)

echo "$VERIFICATION_SCRIPT" | $PSQL_CMD

echo -e "\n${CYAN}🔄 Ejecutando correcciones...${NC}"

# Ejecutar el script SQL
if echo "$SQL_SCRIPT" | $PSQL_CMD; then

# Ejecutar el script SQL
echo -e "${CYAN}🔄 Ejecutando correcciones...${NC}"

if echo "$SQL_SCRIPT" | $PSQL_CMD; then
    echo -e "\n${GREEN}✅ Correcciones aplicadas exitosamente${NC}"
    
    # Verificación final detallada
    echo -e "\n${CYAN}📋 VERIFICACIÓN FINAL DETALLADA${NC}"
    echo -e "${CYAN}============================================${NC}"
    
    FINAL_VERIFICATION=$(cat <<'EOF'
-- Verificación completa final
SELECT '=== ESTADO FINAL DE COLUMNAS ===' AS info;

SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'trips'
AND column_name LIKE '%driver%'
ORDER BY column_name;

SELECT '=== ESTADO FINAL DE CONSTRAINTS ===' AS info;

SELECT 
    conname AS constraint_name,
    CASE contype
        WHEN 'f' THEN 'FOREIGN KEY'
        ELSE contype::text
    END AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'trips'::regclass
AND (
    conname LIKE '%driver%' 
    OR oid IN (
        SELECT conid FROM pg_constraint 
        WHERE conrelid = 'trips'::regclass 
        AND conname IN (
            SELECT conname FROM pg_constraint con
            JOIN pg_attribute a ON a.attnum = ANY(con.conkey)
            WHERE con.conrelid = 'trips'::regclass
            AND a.attname LIKE '%driver%'
        )
    )
)
ORDER BY conname;

SELECT '=== VERIFICACIÓN DE INTEGRIDAD ===' AS info;

SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'trips_driver1_id_fkey' 
            AND conrelid = 'trips'::regclass
        ) THEN '✅ trips_driver1_id_fkey correcto'
        ELSE '❌ trips_driver1_id_fkey FALTA'
    END AS driver1_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'trips' AND column_name = 'driver2_id'
        ) THEN
            CASE 
                WHEN EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'trips_driver2_id_fkey' 
                    AND conrelid = 'trips'::regclass
                ) THEN '✅ trips_driver2_id_fkey correcto'
                ELSE '⚠️  trips_driver2_id_fkey FALTA (columna existe)'
            END
        ELSE '⏭️  driver2_id no existe (normal)'
    END AS driver2_status;
EOF
)

    echo "$FINAL_VERIFICATION" | $PSQL_CMD
    
    echo -e "\n${CYAN}📋 Verificando resultados...${NC}"
    
    # Verificar que los constraints correctos existen
    VERIFY_QUERY_1="SELECT conname FROM pg_constraint WHERE conname = 'trips_driver1_id_fkey' AND conrelid = 'trips'::regclass;"
    VERIFY_QUERY_2="SELECT conname FROM pg_constraint WHERE conname = 'trips_driver2_id_fkey' AND conrelid = 'trips'::regclass;"
    
    if echo "$VERIFY_QUERY_1" | $PSQL_CMD -t | grep -q "trips_driver1_id_fkey"; then
        echo -e "${GREEN}✅ El constraint trips_driver1_id_fkey existe${NC}"
    else
        echo -e "${YELLOW}⚠️  No se pudo verificar el constraint driver1. Por favor, revisa manualmente.${NC}"
    fi
    
    if echo "$VERIFY_QUERY_2" | $PSQL_CMD -t | grep -q "trips_driver2_id_fkey"; then
        echo -e "${GREEN}✅ El constraint trips_driver2_id_fkey existe${NC}"
    else
        echo -e "${YELLOW}ℹ️  El constraint driver2 no existe (puede ser normal si no se usa driver2)${NC}"
    fi
    
    # Verificar que no existen los constraints incorrectos
    VERIFY_INCORRECT_1="SELECT conname FROM pg_constraint WHERE conname = 'trips_driverl_id_fkey';"
    VERIFY_INCORRECT_2="SELECT conname FROM pg_constraint WHERE conname = 'trips_driver2l_id_fkey';"
    VERIFY_INCORRECT_3="SELECT conname FROM pg_constraint WHERE conname = 'trips_driver_id_fkey';"
    
    if ! echo "$VERIFY_INCORRECT_1" | $PSQL_CMD -t | grep -q "trips_driverl_id_fkey"; then
        echo -e "${GREEN}✅ El constraint incorrecto trips_driverl_id_fkey no existe${NC}"
    else
        echo -e "${YELLOW}⚠️  El constraint incorrecto todavía existe. Puede ser necesario ejecutar el script nuevamente.${NC}"
    fi
    
    if ! echo "$VERIFY_INCORRECT_2" | $PSQL_CMD -t | grep -q "trips_driver2l_id_fkey"; then
        echo -e "${GREEN}✅ El constraint incorrecto trips_driver2l_id_fkey no existe${NC}"
    else
        echo -e "${YELLOW}⚠️  El constraint incorrecto todavía existe.${NC}"
    fi
    
    if ! echo "$VERIFY_INCORRECT_3" | $PSQL_CMD -t | grep -q "trips_driver_id_fkey"; then
        echo -e "${GREEN}✅ El constraint incorrecto trips_driver_id_fkey no existe${NC}"
    else
        echo -e "${YELLOW}⚠️  El constraint incorrecto todavía existe.${NC}"
    fi
    
    # Verificar migraciones
    echo -e "\n${CYAN}📦 Verificando migraciones aplicadas...${NC}"
    MIGRATION_CHECK=$(cat <<'EOF'
SELECT 
    migration_name,
    finished_at,
    CASE 
        WHEN finished_at IS NULL THEN '⚠️  No aplicada'
        ELSE '✅ Aplicada'
    END AS status
FROM _prisma_migrations
WHERE migration_name LIKE '%driver%' 
   OR migration_name LIKE '%trip%'
   OR migration_name LIKE '%init%'
ORDER BY finished_at DESC NULLS LAST
LIMIT 5;
EOF
)
    echo "$MIGRATION_CHECK" | $PSQL_CMD
    
    # Verificar que la tabla drivers existe y tiene datos
    echo -e "\n${CYAN}👥 Verificando tabla drivers...${NC}"
    DRIVERS_CHECK=$(cat <<'EOF'
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'drivers') 
        THEN '✅ Tabla drivers existe'
        ELSE '❌ Tabla drivers NO existe'
    END AS drivers_table_status,
    (SELECT COUNT(*)::text || ' registros' FROM drivers) AS drivers_count;
EOF
)
    echo "$DRIVERS_CHECK" | $PSQL_CMD
    
    echo -e "\n${GREEN}============================================${NC}"
    echo -e "${GREEN}✨ Corrección completada${NC}"
    echo -e "${GREEN}============================================${NC}"
    echo -e "\n${CYAN}💡 Próximos pasos:${NC}"
    echo -e "${NC}   1. Reinicia el contenedor de la API:"
    echo -e "${NC}      $DOCKER_COMPOSE_CMD restart api"
    echo -e "\n${NC}   2. Verifica los logs:"
    echo -e "${NC}      $DOCKER_COMPOSE_CMD logs -f api"
    echo -e "\n${NC}   3. Si el problema persiste, ejecuta:"
    echo -e "${NC}      $DOCKER_COMPOSE_CMD exec api npx prisma migrate deploy"
    echo -e "\n${NC}   4. Regenera Prisma Client:"
    echo -e "${NC}      $DOCKER_COMPOSE_CMD exec api npx prisma generate"
    
else
    echo -e "\n${RED}❌ Error al ejecutar las correcciones${NC}"
    echo -e "${YELLOW}   Por favor, revisa los mensajes de error arriba${NC}"
    exit 1
fi

