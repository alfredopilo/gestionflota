import { Module } from '@nestjs/common';
import { GpsService } from './gps.service';
import { GpsController } from './gps.controller';
import { GpsSchedulerService } from './gps-scheduler.service';

@Module({
  controllers: [GpsController],
  providers: [GpsService, GpsSchedulerService],
  exports: [GpsService, GpsSchedulerService],
})
export class GpsModule {}
