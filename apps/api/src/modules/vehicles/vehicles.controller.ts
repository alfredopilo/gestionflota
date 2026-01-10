import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { VehiclesService } from './vehicles.service';
import { VehicleImporterService } from './importers/vehicle-importer.service';
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
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly vehicleImporterService: VehicleImporterService,
  ) {}

  @Get('template')
  @ApiOperation({ summary: 'Descargar plantilla Excel para importar vehículos' })
  async downloadTemplate(@Res() res: Response) {
    const workbook = await this.vehicleImporterService.generateTemplate();
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=vehiculos_plantilla.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  @Post('import')
  @ApiOperation({ summary: 'Importar vehículos desde archivo Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `vehicles-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(xlsx|xls)$/)) {
          return cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'), false);
        }
        cb(null, true);
      },
    }),
  )
  async importVehicles(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    if (!file) {
      throw new Error('No se proporcionó ningún archivo');
    }
    
    const result = await this.vehicleImporterService.importFromExcel(file.path, user.companyId);
    
    // Eliminar archivo temporal
    const fs = require('fs');
    try {
      fs.unlinkSync(file.path);
    } catch (e) {
      console.error('Error al eliminar archivo temporal:', e);
    }
    
    return result;
  }

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
