import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { CreateVehicleDocumentDto } from './dto/create-vehicle-document.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Vehicles')
@ApiBearerAuth()
@Controller('vehicles')
@Roles('GERENCIA', 'SUPERVISOR_FLOTA')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear vehículo' })
  create(@Body() createVehicleDto: CreateVehicleDto, @CurrentUser() user: any) {
    return this.vehiclesService.create(createVehicleDto, user.companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar vehículos' })
  findAll(@Query('page') page: string, @Query('limit') limit: string, @CurrentUser() user: any) {
    return this.vehiclesService.findAll(user.companyId, parseInt(page) || 1, parseInt(limit) || 10);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener vehículo por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.vehiclesService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar vehículo' })
  update(@Param('id') id: string, @Body() updateVehicleDto: UpdateVehicleDto, @CurrentUser() user: any) {
    return this.vehiclesService.update(id, updateVehicleDto, user.companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar vehículo (soft delete)' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.vehiclesService.remove(id, user.companyId);
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Obtener documentos del vehículo' })
  getDocuments(@Param('id') id: string, @CurrentUser() user: any) {
    return this.vehiclesService.getDocuments(id, user.companyId);
  }

  @Post(':id/documents')
  @ApiOperation({ summary: 'Agregar documento al vehículo' })
  addDocument(
    @Param('id') id: string,
    @Body() createDocumentDto: CreateVehicleDocumentDto,
    @CurrentUser() user: any,
  ) {
    return this.vehiclesService.addDocument(id, createDocumentDto, user.companyId);
  }

  @Get(':id/maintenance-history')
  @ApiOperation({ summary: 'Obtener historial de mantenimientos del vehículo' })
  getMaintenanceHistory(@Param('id') id: string, @CurrentUser() user: any) {
    return this.vehiclesService.getMaintenanceHistory(id, user.companyId);
  }
}
