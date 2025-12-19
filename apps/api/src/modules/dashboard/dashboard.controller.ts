import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@Roles('GERENCIA', 'SUPERVISOR_FLOTA', 'JEFE_TALLER')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @ApiOperation({ summary: 'Obtener KPIs del dashboard' })
  getKPIs(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('vehicleId') vehicleId: string,
    @CurrentUser() user: any,
  ) {
    return this.dashboardService.getKPIs(user.companyId, {
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      vehicleId,
    });
  }

  @Get('charts/:type')
  @ApiOperation({ summary: 'Obtener datos para gráficos' })
  getChartData(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('vehicleId') vehicleId: string,
    @Query('type') type: string,
    @CurrentUser() user: any,
  ) {
    return this.dashboardService.getChartData(
      type,
      user.companyId,
      {
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        vehicleId,
      },
    );
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Obtener alertas activas' })
  getAlerts(@CurrentUser() user: any) {
    return this.dashboardService.getAlerts(user.companyId);
  }
}
