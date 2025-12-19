import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';
import { TripsImporterService } from './importers/trips-importer.service';

@Module({
  controllers: [TripsController],
  providers: [TripsService, TripsImporterService],
  exports: [TripsService, TripsImporterService],
})
export class TripsModule {}
