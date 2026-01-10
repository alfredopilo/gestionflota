import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { TripsService } from './trips.service';
import { TripsImporterService } from './importers/trips-importer.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { CreateTripExpenseDto } from './dto/create-trip-expense.dto';
import { UpdateTripExpenseDto } from './dto/update-trip-expense.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import * as multer from 'multer';
import * as path from 'path';
import { existsSync, mkdirSync, unlinkSync } from 'fs';

@ApiTags('Trips')
@ApiBearerAuth()
@Controller('trips')
@Roles('GERENCIA', 'SUPERVISOR_FLOTA', 'CONDUCTOR')
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly tripsImporterService: TripsImporterService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Crear viaje diario' })
  create(@Body() createTripDto: CreateTripDto, @CurrentUser() user: any) {
    return this.tripsService.create(createTripDto, user.companyId, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Listar viajes diarios' })
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('vehicleId') vehicleId: string,
    @Query('driver1Id') driver1Id: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @CurrentUser() user: any,
  ) {
    return this.tripsService.findAll(
      user.companyId,
      parseInt(page) || 1,
      parseInt(limit) || 10,
      { vehicleId, driver1Id, dateFrom, dateTo },
    );
  }

  @Get('available-vehicles')
  @ApiOperation({ summary: 'Obtener vehículos disponibles para una fecha y categoría' })
  getAvailableVehicles(
    @Query('date') date: string,
    @Query('category') category: 'CARROCERIA' | 'ELEMENTO_ARRASTRE',
    @Query('excludeTripId') excludeTripId: string,
    @CurrentUser() user: any,
  ) {
    return this.tripsService.getAvailableVehicles(user.companyId, date, category, excludeTripId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener viaje por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tripsService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar viaje' })
  update(@Param('id') id: string, @Body() updateTripDto: UpdateTripDto, @CurrentUser() user: any) {
    return this.tripsService.update(id, updateTripDto, user.companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar viaje' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.tripsService.remove(id, user.companyId);
  }

  @Post(':id/expenses')
  @ApiOperation({ summary: 'Agregar gasto a un viaje' })
  addExpense(
    @Param('id') id: string,
    @Body() createExpenseDto: CreateTripExpenseDto,
    @CurrentUser() user: any,
  ) {
    return this.tripsService.addExpense(id, createExpenseDto, user.companyId);
  }

  @Patch(':id/expenses/:expenseId')
  @ApiOperation({ summary: 'Actualizar gasto de un viaje' })
  updateExpense(
    @Param('id') id: string,
    @Param('expenseId') expenseId: string,
    @Body() updateExpenseDto: UpdateTripExpenseDto,
    @CurrentUser() user: any,
  ) {
    return this.tripsService.updateExpense(id, expenseId, updateExpenseDto, user.companyId);
  }

  @Delete(':id/expenses/:expenseId')
  @ApiOperation({ summary: 'Eliminar gasto de un viaje' })
  deleteExpense(
    @Param('id') id: string,
    @Param('expenseId') expenseId: string,
    @CurrentUser() user: any,
  ) {
    return this.tripsService.deleteExpense(id, expenseId, user.companyId);
  }

  @Post('import/preview')
  @ApiOperation({ summary: 'Previsualizar importación de viajes desde Excel' })
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
          cb(null, `trips-${uniqueSuffix}${path.extname(file.originalname)}`);
        },
      }),
    }),
  )
  @Roles('GERENCIA', 'SUPERVISOR_FLOTA')
  async previewImport(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new Error('Archivo no proporcionado');
    }

    const result = await this.tripsImporterService.parseExcelFile(file.path, user.companyId);

    // Eliminar archivo temporal
    if (existsSync(file.path)) {
      unlinkSync(file.path);
    }

    return result;
  }

  @Post('import')
  @ApiOperation({ summary: 'Importar viajes desde Excel' })
  @Roles('GERENCIA', 'SUPERVISOR_FLOTA')
  async importTrips(
    @Body() body: { trips: any[] },
    @CurrentUser() user: any,
  ) {
    return this.tripsImporterService.importTrips(body.trips, user.companyId, user.id);
  }
}
