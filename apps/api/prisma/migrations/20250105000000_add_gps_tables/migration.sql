-- AlterTable
ALTER TABLE "vehicles" ADD COLUMN IF NOT EXISTS "device_code" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vehicles_device_code_idx" ON "vehicles"("device_code");

-- CreateTable
CREATE TABLE IF NOT EXISTS "gps_configurations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "sync_interval_minutes" INTEGER NOT NULL DEFAULT 5,
    "last_sync_at" TIMESTAMP(3),
    "last_sync_status" TEXT,
    "last_sync_error" TEXT,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gps_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "vehicle_gps_locations" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "lat" DECIMAL(10,8) NOT NULL,
    "lng" DECIMAL(11,8) NOT NULL,
    "speed" DECIMAL(8,2),
    "course" DECIMAL(5,2),
    "altitude" DECIMAL(8,2),
    "timestamp" TIMESTAMP(3) NOT NULL,
    "online" TEXT,
    "sensors" JSONB,
    "raw_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_gps_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "gps_configurations_company_id_idx" ON "gps_configurations"("company_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vehicle_gps_locations_vehicle_id_idx" ON "vehicle_gps_locations"("vehicle_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vehicle_gps_locations_timestamp_idx" ON "vehicle_gps_locations"("timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "vehicle_gps_locations_vehicle_id_timestamp_idx" ON "vehicle_gps_locations"("vehicle_id", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "gps_configurations_company_id_key" ON "gps_configurations"("company_id");

-- AddForeignKey
ALTER TABLE "gps_configurations" ADD CONSTRAINT "gps_configurations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_gps_locations" ADD CONSTRAINT "vehicle_gps_locations_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
