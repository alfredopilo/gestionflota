import { Module } from '@nestjs/common';
import { MaintenanceController } from './maintenance.controller';
import { MaintenanceService } from './maintenance.service';
import { MaintenancePlanImporterService } from './importers/maintenance-plan-importer.service';

@Module({
  controllers: [MaintenanceController],
  providers: [MaintenanceService, MaintenancePlanImporterService],
  exports: [MaintenanceService, MaintenancePlanImporterService],
})
export class MaintenanceModule {}
