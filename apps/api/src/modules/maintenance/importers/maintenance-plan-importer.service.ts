import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { existsSync } from 'fs';

@Injectable()
export class MaintenancePlanImporterService {
  constructor(private prisma: PrismaService) {}

  async importPlanFromExcel(filePath: string, companyId: string, vehicleType?: string) {
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

    if (workbook.worksheets.length === 0) {
      throw new BadRequestException('El archivo Excel no contiene hojas de trabajo');
    }

    // Buscar hoja por nombre (prioridad: AnexoActividadesVS$VHT, Completo (Caja FULLER), primera hoja)
    let worksheet = workbook.getWorksheet('AnexoActividadesVS$VHT');
    if (!worksheet) {
      worksheet = workbook.getWorksheet('Completo (Caja FULLER)');
    }
    if (!worksheet) {
      // Buscar por nombre parcial
      worksheet = workbook.worksheets.find((ws) =>
        ws.name.toLowerCase().includes('anexo') || ws.name.toLowerCase().includes('actividades'),
      );
    }
    if (!worksheet) {
      worksheet = workbook.worksheets[0];
    }

    if (!worksheet) {
      throw new BadRequestException('No se encontró ninguna hoja válida en el archivo Excel');
    }

    // Leer intervalos (filas 1-2)
    const intervals: Array<{ hours: number; kilometers: number; sequenceOrder: number }> = [];
    
    // Validar que existan las filas necesarias
    if (worksheet.rowCount < 3) {
      throw new BadRequestException(
        'El archivo Excel no tiene el formato esperado. Debe tener al menos 3 filas.',
      );
    }

    const row1 = worksheet.getRow(1); // Fila 1: Horas
    const row2 = worksheet.getRow(2); // Fila 2: Kilómetros

    // Leer desde columna C (index 3) hasta columna N (index 14) o hasta encontrar columna vacía
    for (let col = 3; col <= 14; col++) {
      const hoursCell = row1.getCell(col);
      const kmCell = row2.getCell(col);

      const hoursText = hoursCell.text?.trim() || hoursCell.value?.toString().trim() || '';
      const kmText = kmCell.text?.trim() || kmCell.value?.toString().trim() || '';

      // Si ambas celdas están vacías, dejar de leer
      if (!hoursText && !kmText) {
        break;
      }

      if (hoursText && kmText) {
        // Extraer números de texto como "500 Horas" o "20.000 Kilómetros"
        const hoursMatch = hoursText.match(/([\d.,]+)/);
        const kmMatch = kmText.match(/([\d.,]+)/);

        if (hoursMatch && kmMatch) {
          // Manejar tanto punto como coma como separador decimal
          const hoursStr = hoursMatch[1].replace(/\./g, '').replace(',', '.');
          const kmStr = kmMatch[1].replace(/\./g, '').replace(',', '.');

          const hours = parseFloat(hoursStr);
          const kilometers = parseFloat(kmStr);

          if (!isNaN(hours) && !isNaN(kilometers) && hours > 0 && kilometers > 0) {
            intervals.push({
              hours,
              kilometers,
              sequenceOrder: intervals.length + 1,
            });
          }
        }
      }
    }

    if (intervals.length === 0) {
      throw new BadRequestException(
        'No se pudieron leer los intervalos del archivo Excel. Verifica que las filas 1-2 contengan horas y kilómetros en las columnas C-N.',
      );
    }

    // Crear o actualizar plan de mantenimiento
    const planName = `Plan ${vehicleType || 'General'} - ${new Date().toLocaleDateString()}`;
    let plan = await this.prisma.maintenancePlan.findFirst({
      where: {
        companyId,
        isActive: true,
        vehicleType: vehicleType || null,
      },
    });

    if (plan) {
      // Desactivar plan anterior
      await this.prisma.maintenancePlan.update({
        where: { id: plan.id },
        data: { isActive: false },
      });
    }

    plan = await this.prisma.maintenancePlan.create({
      data: {
        name: planName,
        description: `Plan importado desde Excel`,
        vehicleType: vehicleType || null,
        isActive: true,
        companyId,
      },
    });

    // Crear intervalos
    const createdIntervals = [];
    for (const intervalData of intervals) {
      const interval = await this.prisma.maintenanceInterval.create({
        data: {
          planId: plan.id,
          hours: intervalData.hours,
          kilometers: intervalData.kilometers,
          sequenceOrder: intervalData.sequenceOrder,
        },
      });
      createdIntervals.push(interval);
    }

    // Leer actividades (desde fila 3 en adelante)
    const activities = [];
    let currentCategory = '';

    for (let row = 3; row <= worksheet.rowCount; row++) {
      const rowData = worksheet.getRow(row);
      const codeCell = rowData.getCell(1);
      const descriptionCell = rowData.getCell(2);

      const code = codeCell.text?.trim();
      const description = descriptionCell.text?.trim();

      if (!code && !description) {
        continue; // Fila vacía
      }

      // Si es una categoría (A, B, C, etc.)
      if (code && !code.includes('.') && description) {
        currentCategory = code;
        continue;
      }

      // Si es una actividad (A.1, A.2, B.1, etc.)
      if (code && code.includes('.') && description) {
        // Validar formato de código (debe tener formato X.Y donde X es letra e Y es número)
        const codePattern = /^[A-Z]\.\d+$/i;
        if (!codePattern.test(code)) {
          console.warn(`Código de actividad con formato inválido: ${code}. Se omitirá.`);
          continue;
        }

        // Leer marcas de intervalos (columnas C-N, pero solo hasta el número de intervalos creados)
        const intervalMarks: number[] = [];
        const maxCol = Math.min(14, 3 + createdIntervals.length - 1);
        
        for (let col = 3; col <= maxCol; col++) {
          const cell = rowData.getCell(col);
          const value = cell.text?.trim() || cell.value?.toString().trim() || '';
          
          // Aceptar múltiples variantes de marca
          if (
            value === '√' ||
            value === 'V' ||
            value === 'v' ||
            value === 'X' ||
            value === 'x' ||
            value === '1' ||
            value.toLowerCase() === 'si' ||
            value.toLowerCase() === 'yes'
          ) {
            const intervalIndex = col - 3;
            if (intervalIndex < createdIntervals.length) {
              intervalMarks.push(intervalIndex);
            }
          }
        }

        activities.push({
          code: code.toUpperCase(), // Normalizar a mayúsculas
          description: description.trim(),
          category: currentCategory || undefined,
          intervalMarks,
        });
      }
    }

    if (activities.length === 0) {
      throw new BadRequestException(
        'No se encontraron actividades en el archivo Excel. Verifica que las actividades estén en las columnas A y B desde la fila 3 en adelante.',
      );
    }

    // Crear actividades y matriz
    const createdActivities = [];
    const errors: string[] = [];

    for (const activityData of activities) {
      try {
        // Verificar si ya existe una actividad con el mismo código en este plan
        const existingActivity = await this.prisma.maintenanceActivity.findFirst({
          where: {
            planId: plan.id,
            code: activityData.code,
          },
        });

        if (existingActivity) {
          errors.push(`Actividad ${activityData.code} ya existe, se omitirá`);
          continue;
        }

      const activity = await this.prisma.maintenanceActivity.create({
        data: {
          planId: plan.id,
          code: activityData.code,
          description: activityData.description,
          category: activityData.category,
          isActive: true,
        },
      });
      createdActivities.push(activity);

      // Crear matriz de aplicación
        if (activityData.intervalMarks.length > 0) {
          const matrixData = activityData.intervalMarks
            .filter((intervalIndex) => intervalIndex < createdIntervals.length)
            .map((intervalIndex) => ({
              activityId: activity.id,
              intervalId: createdIntervals[intervalIndex].id,
              applies: true,
            }));

          if (matrixData.length > 0) {
            await this.prisma.activityIntervalMatrix.createMany({
              data: matrixData,
          });
        }
      }
      } catch (error: any) {
        errors.push(`Error al crear actividad ${activityData.code}: ${error.message}`);
      }
    }

    if (createdActivities.length === 0) {
      throw new BadRequestException(
        `No se pudieron crear actividades. Errores: ${errors.join('; ')}`,
      );
    }

    return {
      plan,
      intervals: createdIntervals,
      activities: createdActivities,
      summary: {
        intervalsCount: createdIntervals.length,
        activitiesCount: createdActivities.length,
        warnings: errors.length > 0 ? errors : undefined,
      },
    };
  }
}
