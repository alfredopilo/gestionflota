import { Controller, Get, Put, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GpsService } from './gps.service';
import { GpsSchedulerService } from './gps-scheduler.service';
import { UpdateGpsConfigDto } from './dto/update-gps-config.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('GPS')
@ApiBearerAuth()
@Controller('gps')
@Roles('GERENCIA')
export class GpsController {
  constructor(
    private readonly gpsService: GpsService,
    private readonly gpsSchedulerService: GpsSchedulerService,
  ) {}

  @Get('config')
  @ApiOperation({ summary: 'Obtener configuración GPS' })
  getConfig(@CurrentUser() user: any) {
    return this.gpsService.getConfig(user.companyId);
  }

  @Put('config')
  @ApiOperation({ summary: 'Actualizar configuración GPS' })
  async updateConfig(@Body() updateDto: UpdateGpsConfigDto, @CurrentUser() user: any) {
    const config = await this.gpsService.updateConfig(user.companyId, updateDto);
    
    // Reprogramar scheduler si se actualizó el intervalo
    if (updateDto.syncIntervalMinutes !== undefined) {
      await this.gpsSchedulerService.rescheduleSync(user.companyId, updateDto.syncIntervalMinutes);
    }
    
    return config;
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sincronizar datos GPS manualmente' })
  async sync(@CurrentUser() user: any) {
    const result = await this.gpsService.syncGPSData(user.companyId);
    return {
      message: 'Sincronización completada',
      ...result,
    };
  }

  @Get('locations/:vehicleId/current')
  @ApiOperation({ summary: 'Obtener ubicación actual GPS de un vehículo' })
  getCurrentLocation(@Param('vehicleId') vehicleId: string, @CurrentUser() user: any) {
    return this.gpsService.getCurrentLocation(vehicleId, user.companyId);
  }

  @Get('locations/:vehicleId')
  @ApiOperation({ summary: 'Obtener historial de ubicaciones GPS de un vehículo' })
  getLocations(
    @Param('vehicleId') vehicleId: string,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @CurrentUser() user: any,
  ) {
    const dateFromDate = dateFrom ? new Date(dateFrom) : undefined;
    const dateToDate = dateTo ? new Date(dateTo) : undefined;
    
    return this.gpsService.getLocations(
      vehicleId,
      user.companyId,
      parseInt(page) || 1,
      parseInt(limit) || 1000, // Aumentar límite para mapas
      dateFromDate,
      dateToDate,
    );
  }
}
