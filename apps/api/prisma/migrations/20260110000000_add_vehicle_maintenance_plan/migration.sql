-- Agregar columna maintenance_plan_id a la tabla vehicles
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "maintenance_plan_id" TEXT;

-- Crear índice para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS "vehicles_maintenance_plan_id_idx" ON "vehicles"("maintenance_plan_id");

-- Agregar foreign key constraint (solo si no existe)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'vehicles_maintenance_plan_id_fkey'
    ) THEN
        ALTER TABLE "vehicles" 
        ADD CONSTRAINT "vehicles_maintenance_plan_id_fkey" 
        FOREIGN KEY ("maintenance_plan_id") 
        REFERENCES "maintenance_plans"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
    END IF;
END $$;
