import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { CreateInspectionItemDto } from './dto/create-inspection-item.dto';
import { UpdateInspectionItemDto } from './dto/update-inspection-item.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Inspections')
@ApiBearerAuth()
@Controller('inspections')
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Get('templates')
  @ApiOperation({ summary: 'Listar templates de inspección' })
  getTemplates(@CurrentUser() user: any) {
    return this.inspectionsService.getTemplates(user.companyId);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Crear template de inspección' })
  @Roles('GERENCIA', 'JEFE_TALLER')
  createTemplate(
    @Body() body: { name: string; description?: string; sections: any },
    @CurrentUser() user: any,
  ) {
    return this.inspectionsService.createTemplate(
      body.name,
      body.description,
      body.sections,
      user.companyId,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar inspecciones' })
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('vehicleId') vehicleId: string,
    @Query('status') status: string,
    @CurrentUser() user: any,
  ) {
    return this.inspectionsService.findAll(
      user.companyId,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      { vehicleId, status },
    );
  }

  @Post()
  @ApiOperation({ summary: 'Crear inspección' })
  @Roles('GERENCIA', 'SUPERVISOR_FLOTA', 'JEFE_TALLER')
  create(@Body() createInspectionDto: CreateInspectionDto, @CurrentUser() user: any) {
    return this.inspectionsService.create(
      createInspectionDto,
      user.id,
      user.companyId,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener inspección por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.inspectionsService.findOne(id, user.companyId);
  }

  @Post(':id/items')
  @ApiOperation({ summary: 'Agregar item a inspección' })
  addItem(
    @Param('id') id: string,
    @Body() createItemDto: CreateInspectionItemDto,
    @CurrentUser() user: any,
  ) {
    return this.inspectionsService.addItem(id, createItemDto, user.companyId);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({ summary: 'Actualizar item de inspección' })
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateInspectionItemDto,
    @CurrentUser() user: any,
  ) {
    return this.inspectionsService.updateItem(id, itemId, updateDto, user.companyId);
  }

  @Post(':id/complete')
  @ApiOperation({ summary: 'Completar inspección' })
  complete(@Param('id') id: string, @CurrentUser() user: any) {
    return this.inspectionsService.completeInspection(id, user.companyId);
  }
}
