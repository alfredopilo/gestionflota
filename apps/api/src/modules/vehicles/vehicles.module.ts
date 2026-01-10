import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { VehicleImporterService } from './importers/vehicle-importer.service';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads/temp',
    }),
  ],
  controllers: [VehiclesController],
  providers: [VehiclesService, VehicleImporterService],
  exports: [VehiclesService],
})
export class VehiclesModule {}
