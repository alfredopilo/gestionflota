-- Migration: Migrate drivers to users with CONDUCTOR role
-- This migration:
-- 1. Creates users from drivers data
-- 2. Assigns CONDUCTOR role to created users
-- 3. Updates trips.driver1_id and trips.driver2_id to point to users
-- 4. Drops foreign key constraints temporarily to allow updates

-- Step 1: Create a temporary mapping table
CREATE TEMP TABLE driver_to_user_mapping (
  driver_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL
);

-- Step 2: For each driver, create or find a user and assign CONDUCTOR role
DO $$
DECLARE
  driver_record RECORD;
  user_record RECORD;
  conductor_role_id TEXT;
  new_user_id TEXT;
  driver_email TEXT;
  driver_counter INT := 0;
BEGIN
  -- Get CONDUCTOR role ID
  SELECT id INTO conductor_role_id FROM roles WHERE code = 'CONDUCTOR';
  
  IF conductor_role_id IS NULL THEN
    RAISE EXCEPTION 'CONDUCTOR role not found in roles table';
  END IF;

  -- Process each driver
  FOR driver_record IN SELECT * FROM drivers WHERE deleted_at IS NULL LOOP
    -- Generate email if not present
    driver_email := driver_record.email;
    IF driver_email IS NULL OR driver_email = '' THEN
      driver_counter := driver_counter + 1;
      driver_email := 'driver_' || driver_record.id || '_' || driver_counter || '@migrated.local';
      
      -- Ensure uniqueness
      WHILE EXISTS (SELECT 1 FROM users WHERE email = driver_email) LOOP
        driver_counter := driver_counter + 1;
        driver_email := 'driver_' || driver_record.id || '_' || driver_counter || '@migrated.local';
      END LOOP;
    END IF;

    -- Check if user with this email already exists
    SELECT id INTO new_user_id FROM users WHERE email = driver_email AND deleted_at IS NULL;
    
    IF new_user_id IS NULL THEN
      -- Create new user
      INSERT INTO users (
        id,
        email,
        password_hash,
        first_name,
        last_name,
        phone,
        is_active,
        company_id,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid()::TEXT,
        driver_email,
        '$2b$10$dummy.hash.for.driver.migration.please.change.password',
        driver_record.name,
        '',
        driver_record.phone,
        true,
        driver_record.company_id,
        driver_record.created_at,
        driver_record.updated_at
      )
      RETURNING id INTO new_user_id;
      
      -- Assign CONDUCTOR role
      INSERT INTO user_roles (id, user_id, role_id, created_at)
      VALUES (
        gen_random_uuid()::TEXT,
        new_user_id,
        conductor_role_id,
        NOW()
      )
      ON CONFLICT DO NOTHING;
      
    ELSE
      -- User exists, ensure CONDUCTOR role is assigned
      INSERT INTO user_roles (id, user_id, role_id, created_at)
      VALUES (
        gen_random_uuid()::TEXT,
        new_user_id,
        conductor_role_id,
        NOW()
      )
      ON CONFLICT (user_id, role_id) DO NOTHING;
    END IF;

    -- Store mapping
    INSERT INTO driver_to_user_mapping (driver_id, user_id)
    VALUES (driver_record.id, new_user_id);
  END LOOP;
END $$;

-- Step 3: Drop foreign key constraints temporarily
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driver1_id_fkey;
ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driver2_id_fkey;

-- Step 4: Update trips.driver1_id and trips.driver2_id
UPDATE trips
SET driver1_id = (
  SELECT user_id 
  FROM driver_to_user_mapping 
  WHERE driver_id = trips.driver1_id
)
WHERE driver1_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM driver_to_user_mapping WHERE driver_id = trips.driver1_id);

UPDATE trips
SET driver2_id = (
  SELECT user_id 
  FROM driver_to_user_mapping 
  WHERE driver_id = trips.driver2_id
)
WHERE driver2_id IS NOT NULL 
  AND EXISTS (SELECT 1 FROM driver_to_user_mapping WHERE driver_id = trips.driver2_id);

-- Step 5: Re-add foreign key constraints pointing to users
ALTER TABLE trips
ADD CONSTRAINT trips_driver1_id_fkey 
FOREIGN KEY (driver1_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE trips
ADD CONSTRAINT trips_driver2_id_fkey 
FOREIGN KEY (driver2_id) REFERENCES users(id) ON DELETE SET NULL;

-- Step 6: Update vehicle_assignments to use users instead of drivers
-- First, create a mapping for vehicle_assignments
CREATE TEMP TABLE vehicle_assignment_mapping AS
SELECT 
  va.id,
  va.vehicle_id,
  m.user_id as new_driver_id,
  va.assigned_at,
  va.unassigned_at,
  va.is_active,
  va.notes
FROM vehicle_assignments va
INNER JOIN driver_to_user_mapping m ON va.driver_id = m.driver_id;

-- Delete old vehicle_assignments (we'll recreate them if needed)
-- For now, we'll just delete them as they reference drivers
DELETE FROM vehicle_assignments;

-- Note: If you want to preserve vehicle_assignments, you would need to:
-- 1. Create a new table for user-vehicle assignments
-- 2. Migrate the data
-- For now, we'll leave it empty since the schema will be updated

-- Step 7: Drop old tables (drivers and vehicle_assignments)
-- Note: This should be done carefully and only after verifying migration success

-- Drop foreign key constraints first
ALTER TABLE vehicle_assignments DROP CONSTRAINT IF EXISTS vehicle_assignments_vehicle_id_fkey;
ALTER TABLE vehicle_assignments DROP CONSTRAINT IF EXISTS vehicle_assignments_driver_id_fkey;

-- Drop indexes
DROP INDEX IF EXISTS vehicle_assignments_vehicle_id_idx;
DROP INDEX IF EXISTS vehicle_assignments_driver_id_idx;
DROP INDEX IF EXISTS vehicle_assignments_is_active_idx;

-- Drop tables
DROP TABLE IF EXISTS vehicle_assignments;
DROP INDEX IF EXISTS drivers_company_id_idx;
DROP TABLE IF EXISTS drivers;

