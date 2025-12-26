-- AlterTable
ALTER TABLE "trips" ADD COLUMN "trailer_body_id" TEXT;

-- CreateIndex
CREATE INDEX "trips_trailer_body_id_idx" ON "trips"("trailer_body_id");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_trailer_body_id_fkey" FOREIGN KEY ("trailer_body_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

