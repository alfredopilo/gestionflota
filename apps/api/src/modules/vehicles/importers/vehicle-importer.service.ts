import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { existsSync } from 'fs';

interface VehicleImportRow {
  placa: string;
  marca: string;
  modelo: string;
  año?: number;
  vin?: string;
  tipo: string;
  categoria: string;
  capacidad?: string;
  estado?: string;
  odometro?: number;
  horometro?: number;
  codigoGps?: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: Array<{ row: number; message: string }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

@Injectable()
export class VehicleImporterService {
  constructor(private prisma: PrismaService) {}

  async generateTemplate(): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gestión de Flota';
    workbook.created = new Date();

    // Hoja principal con datos
    const dataSheet = workbook.addWorksheet('Vehículos');

    // Definir columnas
    dataSheet.columns = [
      { header: 'Placa *', key: 'placa', width: 15 },
      { header: 'Marca *', key: 'marca', width: 15 },
      { header: 'Modelo *', key: 'modelo', width: 15 },
      { header: 'Año', key: 'año', width: 10 },
      { header: 'VIN', key: 'vin', width: 20 },
      { header: 'Tipo *', key: 'tipo', width: 15 },
      { header: 'Categoría *', key: 'categoria', width: 20 },
      { header: 'Capacidad (kg)', key: 'capacidad', width: 15 },
      { header: 'Estado', key: 'estado', width: 15 },
      { header: 'Odómetro (km)', key: 'odometro', width: 15 },
      { header: 'Horómetro (h)', key: 'horometro', width: 15 },
      { header: 'Código GPS', key: 'codigoGps', width: 20 },
    ];

    // Estilo del encabezado
    dataSheet.getRow(1).font = { bold: true };
    dataSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    dataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Agregar fila de ejemplo
    dataSheet.addRow({
      placa: 'ABC-1234',
      marca: 'Toyota',
      modelo: 'Hilux',
      año: 2022,
      vin: '1HGCM82633A123456',
      tipo: 'TRUCK',
      categoria: 'CARROCERIA',
      capacidad: '1000',
      estado: 'ACTIVE',
      odometro: 50000,
      horometro: 2000,
      codigoGps: 'GPS-001',
    });

    // Agregar otra fila de ejemplo
    dataSheet.addRow({
      placa: 'XYZ-5678',
      marca: 'Hino',
      modelo: '500 Series',
      año: 2021,
      vin: '',
      tipo: 'BAÑERAS',
      categoria: 'ELEMENTO_ARRASTRE',
      capacidad: '25000',
      estado: 'ACTIVE',
      odometro: 80000,
      horometro: 3500,
      codigoGps: '',
    });

    // Hoja de instrucciones
    const instructionsSheet = workbook.addWorksheet('Instrucciones');
    instructionsSheet.columns = [
      { header: 'Campo', key: 'campo', width: 20 },
      { header: 'Descripción', key: 'descripcion', width: 50 },
      { header: 'Valores Válidos', key: 'valores', width: 60 },
    ];

    instructionsSheet.getRow(1).font = { bold: true };
    instructionsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    instructionsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    const instructions = [
      { campo: 'Placa *', descripcion: 'Placa del vehículo (obligatorio, único)', valores: 'Texto, ej: ABC-1234' },
      { campo: 'Marca *', descripcion: 'Marca del vehículo (obligatorio)', valores: 'Texto, ej: Toyota, Hino, Volvo' },
      { campo: 'Modelo *', descripcion: 'Modelo del vehículo (obligatorio)', valores: 'Texto, ej: Hilux, 500 Series' },
      { campo: 'Año', descripcion: 'Año de fabricación (opcional)', valores: 'Número, ej: 2022' },
      { campo: 'VIN', descripcion: 'Número de identificación vehicular (opcional)', valores: 'Texto, 17 caracteres' },
      { campo: 'Tipo *', descripcion: 'Tipo de vehículo (obligatorio)', valores: 'TRUCK, TRAILER, VAN, CAR, OTHER, BAÑERAS, CONTENEDORES, TANQUEROS' },
      { campo: 'Categoría *', descripcion: 'Categoría del vehículo (obligatorio)', valores: 'CARROCERIA, ELEMENTO_ARRASTRE' },
      { campo: 'Capacidad', descripcion: 'Capacidad de carga en kg (opcional)', valores: 'Número, ej: 1000, 25000' },
      { campo: 'Estado', descripcion: 'Estado del vehículo (opcional, default: ACTIVE)', valores: 'ACTIVE, MAINTENANCE, INACTIVE, RETIRED' },
      { campo: 'Odómetro', descripcion: 'Kilometraje actual (opcional, default: 0)', valores: 'Número, ej: 50000' },
      { campo: 'Horómetro', descripcion: 'Horas de uso (opcional, default: 0)', valores: 'Número, ej: 2000' },
      { campo: 'Código GPS', descripcion: 'Código del dispositivo GPS (opcional)', valores: 'Texto, ej: GPS-001' },
    ];

    instructions.forEach((inst) => instructionsSheet.addRow(inst));

    return workbook;
  }

  async importFromExcel(filePath: string, companyId: string): Promise<ImportResult> {
    if (!existsSync(filePath)) {
      throw new BadRequestException('Archivo no encontrado');
    }

    let workbook: ExcelJS.Workbook;
    try {
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
    } catch (error) {
      throw new BadRequestException('Error al leer el archivo Excel. Verifica que el archivo no esté corrupto.');
    }

    const worksheet = workbook.getWorksheet('Vehículos') || workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('No se encontró la hoja de vehículos en el archivo');
    }

    const errors: Array<{ row: number; message: string }> = [];
    const vehiclesToCreate: VehicleImportRow[] = [];
    const validTypes = ['TRUCK', 'TRAILER', 'VAN', 'CAR', 'OTHER', 'BAÑERAS', 'CONTENEDORES', 'TANQUEROS'];
    const validCategories = ['CARROCERIA', 'ELEMENTO_ARRASTRE'];
    const validStatuses = ['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'RETIRED'];

    // Obtener placas existentes para validación
    const existingVehicles = await this.prisma.vehicle.findMany({
      where: { companyId },
      select: { plate: true },
    });
    const existingPlates = new Set(existingVehicles.map((v) => v.plate.toUpperCase()));
    const newPlates = new Set<string>();

    // Leer filas (empezando desde la fila 2, la 1 es encabezado)
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar encabezado

      const placa = this.getCellValue(row.getCell(1));
      const marca = this.getCellValue(row.getCell(2));
      const modelo = this.getCellValue(row.getCell(3));
      const año = this.getNumericValue(row.getCell(4));
      const vin = this.getCellValue(row.getCell(5));
      const tipo = this.getCellValue(row.getCell(6))?.toUpperCase();
      const categoria = this.getCellValue(row.getCell(7))?.toUpperCase();
      const capacidad = this.getCellValue(row.getCell(8));
      const estado = this.getCellValue(row.getCell(9))?.toUpperCase() || 'ACTIVE';
      const odometro = this.getNumericValue(row.getCell(10)) || 0;
      const horometro = this.getNumericValue(row.getCell(11)) || 0;
      const codigoGps = this.getCellValue(row.getCell(12));

      // Validaciones
      if (!placa || !marca || !modelo || !tipo || !categoria) {
        if (placa || marca || modelo) {
          // Solo reportar error si hay algún dato en la fila
          errors.push({
            row: rowNumber,
            message: `Campos obligatorios faltantes: ${!placa ? 'Placa, ' : ''}${!marca ? 'Marca, ' : ''}${!modelo ? 'Modelo, ' : ''}${!tipo ? 'Tipo, ' : ''}${!categoria ? 'Categoría' : ''}`.replace(/, $/, ''),
          });
        }
        return;
      }

      const upperPlaca = placa.toUpperCase();

      // Validar placa duplicada en BD
      if (existingPlates.has(upperPlaca)) {
        errors.push({ row: rowNumber, message: `La placa ${placa} ya existe en el sistema` });
        return;
      }

      // Validar placa duplicada en el archivo
      if (newPlates.has(upperPlaca)) {
        errors.push({ row: rowNumber, message: `La placa ${placa} está duplicada en el archivo` });
        return;
      }

      // Validar tipo
      if (!validTypes.includes(tipo)) {
        errors.push({ row: rowNumber, message: `Tipo inválido: ${tipo}. Valores válidos: ${validTypes.join(', ')}` });
        return;
      }

      // Validar categoría
      if (!validCategories.includes(categoria)) {
        errors.push({ row: rowNumber, message: `Categoría inválida: ${categoria}. Valores válidos: ${validCategories.join(', ')}` });
        return;
      }

      // Validar estado
      if (estado && !validStatuses.includes(estado)) {
        errors.push({ row: rowNumber, message: `Estado inválido: ${estado}. Valores válidos: ${validStatuses.join(', ')}` });
        return;
      }

      newPlates.add(upperPlaca);
      vehiclesToCreate.push({
        placa: upperPlaca,
        marca,
        modelo,
        año,
        vin,
        tipo,
        categoria,
        capacidad,
        estado,
        odometro,
        horometro,
        codigoGps,
      });
    });

    // Crear vehículos en la base de datos
    let imported = 0;
    for (const vehicle of vehiclesToCreate) {
      try {
        await this.prisma.vehicle.create({
          data: {
            plate: vehicle.placa,
            brand: vehicle.marca,
            model: vehicle.modelo,
            year: vehicle.año,
            vin: vehicle.vin || undefined,
            type: vehicle.tipo,
            category: vehicle.categoria,
            capacity: vehicle.capacidad,
            status: vehicle.estado || 'ACTIVE',
            odometer: vehicle.odometro || 0,
            hourmeter: vehicle.horometro || 0,
            deviceCode: vehicle.codigoGps || undefined,
            companyId,
          },
        });
        imported++;
      } catch (error: any) {
        errors.push({
          row: vehiclesToCreate.indexOf(vehicle) + 2,
          message: `Error al crear vehículo ${vehicle.placa}: ${error.message}`,
        });
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors,
      summary: {
        total: vehiclesToCreate.length + errors.filter((e) => e.message.includes('Campos obligatorios') || e.message.includes('inválid') || e.message.includes('duplicada') || e.message.includes('ya existe')).length,
        successful: imported,
        failed: errors.length,
      },
    };
  }

  private getCellValue(cell: ExcelJS.Cell): string | undefined {
    if (cell.value === null || cell.value === undefined) return undefined;
    if (typeof cell.value === 'object' && 'text' in cell.value) {
      return (cell.value as any).text?.toString().trim();
    }
    return cell.value.toString().trim();
  }

  private getNumericValue(cell: ExcelJS.Cell): number | undefined {
    const value = this.getCellValue(cell);
    if (!value) return undefined;
    const num = parseFloat(value.replace(/,/g, ''));
    return isNaN(num) ? undefined : num;
  }
}
