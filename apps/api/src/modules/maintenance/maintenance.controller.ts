import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Req,
  Delete,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import * as multer from 'multer';
import * as path from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';
import { MaintenanceService } from './maintenance.service';
import { MaintenancePlanImporterService } from './importers/maintenance-plan-importer.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderItemDto } from './dto/update-work-order-item.dto';
import { CloseWorkOrderDto } from './dto/close-work-order.dto';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Maintenance')
@ApiBearerAuth()
@Controller('maintenance')
export class MaintenanceController {
  constructor(
    private readonly maintenanceService: MaintenanceService,
    private readonly maintenancePlanImporterService: MaintenancePlanImporterService,
  ) {}

  @Get('plan')
  @ApiOperation({ summary: 'Obtener plan de mantenimiento activo' })
  getPlan(@CurrentUser() user: any) {
    return this.maintenanceService.getPlan(user.companyId);
  }

  @Get('plan/next-maintenance/:vehicleId')
  @ApiOperation({ summary: 'Calcular próximo mantenimiento para un vehículo' })
  calculateNextMaintenance(@Param('vehicleId') vehicleId: string, @CurrentUser() user: any) {
    return this.maintenanceService.calculateNextMaintenance(vehicleId, user.companyId);
  }

  @Get('work-orders')
  @ApiOperation({ summary: 'Listar órdenes de trabajo' })
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('vehicleId') vehicleId: string,
    @Query('status') status: string,
    @Query('type') type: string,
    @CurrentUser() user: any,
  ) {
    return this.maintenanceService.findAll(
      user.companyId,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      { vehicleId, status, type },
    );
  }

  @Post('work-orders')
  @ApiOperation({ summary: 'Crear orden de trabajo' })
  @Roles('GERENCIA', 'JEFE_TALLER')
  create(@Body() createWorkOrderDto: CreateWorkOrderDto, @CurrentUser() user: any) {
    return this.maintenanceService.createWorkOrder(createWorkOrderDto, user.companyId);
  }

  @Get('work-orders/:id')
  @ApiOperation({ summary: 'Obtener orden de trabajo por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.maintenanceService.findOne(id, user.companyId);
  }

  @Post('work-orders/:id/start')
  @ApiOperation({ summary: 'Iniciar orden de trabajo' })
  @Roles('GERENCIA', 'JEFE_TALLER', 'OPERADOR_TALLER')
  start(@Param('id') id: string, @CurrentUser() user: any) {
    return this.maintenanceService.startWorkOrder(id, user.companyId, user.id);
  }

  @Patch('work-orders/:id/items/:itemId')
  @ApiOperation({ summary: 'Actualizar item de orden de trabajo' })
  @Roles('GERENCIA', 'JEFE_TALLER', 'OPERADOR_TALLER')
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateDto: UpdateWorkOrderItemDto,
    @CurrentUser() user: any,
  ) {
    return this.maintenanceService.updateWorkOrderItem(id, itemId, updateDto, user.companyId);
  }

  @Post('work-orders/:id/close')
  @ApiOperation({ summary: 'Cerrar orden de trabajo con firma' })
  @Roles('GERENCIA', 'JEFE_TALLER', 'OPERADOR_TALLER')
  close(
    @Param('id') id: string,
    @Body() closeDto: CloseWorkOrderDto,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    return this.maintenanceService.closeWorkOrder(
      id,
      user.companyId,
      user.id,
      user.roles,
      req.ip || req.connection.remoteAddress,
      req.headers['user-agent'] || '',
      closeDto.notes,
    );
  }

  @Post('work-orders/:id/cancel')
  @ApiOperation({ summary: 'Cancelar orden de trabajo' })
  @Roles('GERENCIA', 'JEFE_TALLER')
  cancelWorkOrder(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: any,
  ) {
    return this.maintenanceService.cancelWorkOrder(id, user.companyId, reason);
  }

  @Delete('work-orders/:id')
  @ApiOperation({ summary: 'Eliminar orden de trabajo' })
  @Roles('GERENCIA')
  deleteWorkOrder(@Param('id') id: string, @CurrentUser() user: any) {
    return this.maintenanceService.deleteWorkOrder(id, user.companyId);
  }

  @Post('plan/import')
  @ApiOperation({ summary: 'Importar plan de mantenimiento desde Excel' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = './uploads';
          if (!existsSync(uploadDir)) {
            mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `plan-${uniqueSuffix}${path.extname(file.originalname)}`);
        },
      }),
    }),
  )
  @Roles('GERENCIA', 'JEFE_TALLER')
  async importPlan(
    @UploadedFile() file: Express.Multer.File,
    @Body('vehicleType') vehicleType: string,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new Error('Archivo no proporcionado');
    }

    const result = await this.maintenancePlanImporterService.importPlanFromExcel(
      file.path,
      user.companyId,
      vehicleType,
    );

    // Eliminar archivo temporal
    if (existsSync(file.path)) {
      unlinkSync(file.path);
    }

    return result;
  }

  // ============================================
  // PLANES DE MANTENIMIENTO - CRUD
  // ============================================

  @Get('plans')
  @ApiOperation({ summary: 'Listar todos los planes de mantenimiento' })
  findAllPlans(
    @Query('vehicleType') vehicleType: string,
    @Query('isActive') isActive: string,
    @CurrentUser() user: any,
  ) {
    const filters: any = {};
    if (vehicleType) filters.vehicleType = vehicleType;
    if (isActive !== undefined) filters.isActive = isActive === 'true';
    return this.maintenanceService.findAllPlans(user.companyId, filters);
  }

  @Post('plans')
  @ApiOperation({ summary: 'Crear nuevo plan de mantenimiento' })
  @Roles('GERENCIA', 'JEFE_TALLER')
  createPlan(@Body() createPlanDto: CreateMaintenancePlanDto, @CurrentUser() user: any) {
    return this.maintenanceService.createPlan(createPlanDto, user.companyId);
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Obtener plan de mantenimiento por ID' })
  findPlanById(@Param('id') id: string, @CurrentUser() user: any) {
    return this.maintenanceService.findPlanById(id, user.companyId);
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Actualizar plan de mantenimiento' })
  @Roles('GERENCIA', 'JEFE_TALLER')
  updatePlan(
    @Param('id') id: string,
    @Body() updatePlanDto: UpdateMaintenancePlanDto,
    @CurrentUser() user: any,
  ) {
    return this.maintenanceService.updatePlan(id, updatePlanDto, user.companyId);
  }

  @Delete('plans/:id')
  @ApiOperation({ summary: 'Eliminar plan de mantenimiento' })
  @Roles('GERENCIA', 'JEFE_TALLER')
  deletePlan(@Param('id') id: string, @CurrentUser() user: any) {
    return this.maintenanceService.deletePlan(id, user.companyId);
  }

  @Post('plans/:id/activate')
  @ApiOperation({ summary: 'Activar plan de mantenimiento' })
  @Roles('GERENCIA', 'JEFE_TALLER')
  activatePlan(@Param('id') id: string, @CurrentUser() user: any) {
    return this.maintenanceService.activatePlan(id, user.companyId);
  }

  @Post('plans/:id/deactivate')
  @ApiOperation({ summary: 'Desactivar plan de mantenimiento' })
  @Roles('GERENCIA', 'JEFE_TALLER')
  deactivatePlan(@Param('id') id: string, @CurrentUser() user: any) {
    return this.maintenanceService.deactivatePlan(id, user.companyId);
  }

  @Post('plans/:id/duplicate')
  @ApiOperation({ summary: 'Duplicar plan de mantenimiento' })
  @Roles('GERENCIA', 'JEFE_TALLER')
  duplicatePlan(
    @Param('id') id: string,
    @Body('name') newName: string,
    @CurrentUser() user: any,
  ) {
    return this.maintenanceService.duplicatePlan(id, user.companyId, newName);
  }
}
