import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { existsSync } from 'fs';

export interface TripRow {
  rowNumber: number;
  data: any;
  errors: string[];
  isValid: boolean;
}

@Injectable()
export class TripsImporterService {
  constructor(private prisma: PrismaService) {}

  async parseExcelFile(filePath: string, companyId: string): Promise<{
    validRows: TripRow[];
    invalidRows: TripRow[];
    summary: { total: number; valid: number; invalid: number };
  }> {
    if (!existsSync(filePath)) {
      throw new BadRequestException('Archivo no encontrado');
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(filePath);

    // Buscar hoja "VIAJES" o la primera hoja
    let worksheet = workbook.getWorksheet('VIAJES');
    if (!worksheet) {
      worksheet = workbook.worksheets[0];
    }

    if (!worksheet) {
      throw new BadRequestException('No se encontró ninguna hoja en el archivo Excel');
    }

    // Leer encabezados (fila 1)
    const headers: Record<string, number> = {};
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      const headerName = cell.text?.trim().toUpperCase();
      if (headerName) {
        headers[headerName] = colNumber;
      }
    });

    // Mapear columnas esperadas
    const columnMap: Record<string, string> = {
      'FECHA': 'date',
      'PLACAS': 'plate',
      'CHOFER 1': 'driver1',
      'CHOFER 2': 'driver2',
      'RUTAS': 'route',
      'ORIGEN': 'origin',
      'RETORNOS': 'returnTrip',
      'BAÑERAS': 'bañeras',
      'CONTENEDOR': 'contenedor',
      'TANQUEROS': 'tanqueros',
      'D': 'd',
      'A': 'a',
      'M': 'm',
      'C': 'c',
      'BASE': 'base',
      'EXTRA': 'extra',
    };

    const validRows: TripRow[] = [];
    const invalidRows: TripRow[] = [];

    // Leer datos (desde fila 2)
    for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex);
      const rowData: any = {};
      const errors: string[] = [];

      // Extraer datos según mapeo
      for (const [excelHeader, dataKey] of Object.entries(columnMap)) {
        const colNumber = headers[excelHeader];
        if (colNumber) {
          const cell = row.getCell(colNumber);
          const value = cell.text?.trim() || cell.value;

          if (value !== null && value !== undefined && value !== '') {
            rowData[dataKey] = value;
          }
        }
      }

      // Validar y transformar datos
      const tripData: any = {
        rowNumber: rowIndex,
      };

      // Fecha
      if (rowData.date) {
        try {
          const dateValue = rowData.date instanceof Date
            ? rowData.date
            : new Date(rowData.date);
          if (isNaN(dateValue.getTime())) {
            errors.push('Fecha inválida');
          } else {
            tripData.date = dateValue;
          }
        } catch {
          errors.push('Fecha inválida');
        }
      } else {
        errors.push('Fecha requerida');
      }

      // Placa/Vehículo
      if (rowData.plate) {
        const vehicle = await this.prisma.vehicle.findFirst({
          where: {
            plate: rowData.plate,
            companyId,
            deletedAt: null,
          },
        });
        if (!vehicle) {
          errors.push(`Vehículo con placa ${rowData.plate} no encontrado`);
        } else {
          tripData.vehicleId = vehicle.id;
        }
      } else {
        errors.push('Placa requerida');
      }

      // Conductor 1
      if (rowData.driver1) {
        const driver = await this.prisma.driver.findFirst({
          where: {
            name: { contains: rowData.driver1, mode: 'insensitive' },
            companyId,
            deletedAt: null,
          },
        });
        if (driver) {
          tripData.driver1Id = driver.id;
        } else {
          // Crear conductor si no existe
          const newDriver = await this.prisma.driver.create({
            data: {
              name: rowData.driver1,
              companyId,
            },
          });
          tripData.driver1Id = newDriver.id;
        }
      }

      // Conductor 2
      if (rowData.driver2) {
        const driver = await this.prisma.driver.findFirst({
          where: {
            name: { contains: rowData.driver2, mode: 'insensitive' },
            companyId,
            deletedAt: null,
          },
        });
        if (driver) {
          tripData.driver2Id = driver.id;
        } else {
          const newDriver = await this.prisma.driver.create({
            data: {
              name: rowData.driver2,
              companyId,
            },
          });
          tripData.driver2Id = newDriver.id;
        }
      }

      // Ruta
      if (rowData.route) {
        let route = await this.prisma.route.findFirst({
          where: {
            code: rowData.route,
            companyId,
          },
        });
        if (!route) {
          route = await this.prisma.route.create({
            data: {
              code: rowData.route,
              name: rowData.route,
              origin: rowData.origin || '',
              destination: '',
              companyId,
            },
          });
        }
        tripData.routeId = route.id;
      }

      // Origen y destino
      tripData.origin = rowData.origin || null;
      tripData.destination = null; // No viene en el Excel

      // Retorno
      tripData.returnTrip = rowData.returnTrip === 'SI' || rowData.returnTrip === 'S';

      // Tipo de carga
      if (rowData.bañeras) {
        tripData.loadType = 'BAÑERAS';
      } else if (rowData.contenedor) {
        tripData.loadType = 'CONTENEDORES';
      } else if (rowData.tanqueros) {
        tripData.loadType = 'TANQUEROS';
      }

      // Tipo de viaje (d/a/m/c)
      if (rowData.d || rowData.a || rowData.m || rowData.c) {
        const types = [];
        if (rowData.d) types.push('d');
        if (rowData.a) types.push('a');
        if (rowData.m) types.push('m');
        if (rowData.c) types.push('c');
        tripData.tripType = types.join('/');
      }

      // Montos
      tripData.baseAmount = rowData.base ? parseFloat(rowData.base) : null;
      tripData.extraAmount = rowData.extra ? parseFloat(rowData.extra) : null;

      const tripRow: TripRow = {
        rowNumber: rowIndex,
        data: tripData,
        errors,
        isValid: errors.length === 0,
      };

      if (tripRow.isValid) {
        validRows.push(tripRow);
      } else {
        invalidRows.push(tripRow);
      }
    }

    return {
      validRows,
      invalidRows,
      summary: {
        total: validRows.length + invalidRows.length,
        valid: validRows.length,
        invalid: invalidRows.length,
      },
    };
  }

  async importTrips(trips: any[], companyId: string, createdById: string) {
    const results = {
      created: 0,
      errors: [] as string[],
    };

    for (const tripData of trips) {
      try {
        await this.prisma.trip.create({
          data: {
            ...tripData,
            companyId,
            createdById,
            status: 'COMPLETED',
          },
        });
        results.created++;
      } catch (error: any) {
        results.errors.push(`Fila ${tripData.rowNumber}: ${error.message}`);
      }
    }

    return results;
  }
}
