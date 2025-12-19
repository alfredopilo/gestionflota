import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import { PDFDocument } from 'pdf-lib';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async generateExcelReport(type: string, filters: any, companyId: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    switch (type) {
      case 'trips':
        return this.generateTripsExcel(workbook, filters, companyId);
      case 'maintenance':
        return this.generateMaintenanceExcel(workbook, filters, companyId);
      case 'vehicles':
        return this.generateVehiclesExcel(workbook, filters, companyId);
      default:
        throw new Error(`Tipo de reporte no soportado: ${type}`);
    }
  }

  private async generateTripsExcel(workbook: ExcelJS.Workbook, filters: any, companyId: string): Promise<Buffer> {
    const worksheet = workbook.getWorksheet(1);
    
    worksheet.columns = [
      { header: 'Fecha', key: 'date', width: 15 },
      { header: 'Vehículo', key: 'vehicle', width: 15 },
      { header: 'Conductor', key: 'driver', width: 20 },
      { header: 'Origen', key: 'origin', width: 20 },
      { header: 'Destino', key: 'destination', width: 20 },
      { header: 'Km Total', key: 'kmTotal', width: 12 },
      { header: 'Tipo', key: 'loadType', width: 15 },
    ];

    const trips = await this.prisma.trip.findMany({
      where: {
        companyId,
        ...(filters.dateFrom ? { date: { gte: filters.dateFrom } } : {}),
        ...(filters.dateTo ? { date: { lte: filters.dateTo } } : {}),
      },
      include: {
        vehicle: true,
        driver1: true,
      },
      take: 1000,
    });

    trips.forEach((trip) => {
      worksheet.addRow({
        date: trip.date.toLocaleDateString('es-ES'),
        vehicle: trip.vehicle.plate,
        driver: trip.driver1?.name || '-',
        origin: trip.origin || '-',
        destination: trip.destination || '-',
        kmTotal: Number(trip.kmTotal || 0),
        loadType: trip.loadType || '-',
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async generateMaintenanceExcel(workbook: ExcelJS.Workbook, filters: any, companyId: string): Promise<Buffer> {
    const worksheet = workbook.getWorksheet(1);
    
    worksheet.columns = [
      { header: 'Número', key: 'number', width: 15 },
      { header: 'Vehículo', key: 'vehicle', width: 15 },
      { header: 'Tipo', key: 'type', width: 12 },
      { header: 'Estado', key: 'status', width: 12 },
      { header: 'Fecha Programada', key: 'scheduledDate', width: 18 },
      { header: 'Fecha Completada', key: 'completedAt', width: 18 },
      { header: 'Costo Total', key: 'totalCost', width: 15 },
    ];

    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        companyId,
        ...(filters.vehicleId ? { vehicleId: filters.vehicleId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        vehicle: true,
      },
      take: 1000,
    });

    workOrders.forEach((wo) => {
      worksheet.addRow({
        number: wo.number,
        vehicle: wo.vehicle.plate,
        type: wo.type,
        status: wo.status,
        scheduledDate: wo.scheduledDate?.toLocaleDateString('es-ES') || '-',
        completedAt: wo.completedAt?.toLocaleDateString('es-ES') || '-',
        totalCost: Number(wo.totalCost || 0),
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async generateVehiclesExcel(workbook: ExcelJS.Workbook, filters: any, companyId: string): Promise<Buffer> {
    const worksheet = workbook.getWorksheet(1);
    
    worksheet.columns = [
      { header: 'Placa', key: 'plate', width: 15 },
      { header: 'Marca', key: 'brand', width: 15 },
      { header: 'Modelo', key: 'model', width: 15 },
      { header: 'Año', key: 'year', width: 10 },
      { header: 'Estado', key: 'status', width: 12 },
      { header: 'Odómetro', key: 'odometer', width: 15 },
      { header: 'Horómetro', key: 'hourmeter', width: 15 },
    ];

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
      },
      take: 1000,
    });

    vehicles.forEach((vehicle) => {
      worksheet.addRow({
        plate: vehicle.plate,
        brand: vehicle.brand,
        model: vehicle.model,
        year: vehicle.year || '-',
        status: vehicle.status,
        odometer: Number(vehicle.odometer),
        hourmeter: Number(vehicle.hourmeter),
      });
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  async generatePDFReport(type: string, filters: any, companyId: string): Promise<Buffer> {
    // Implementación básica de PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    page.drawText(`Reporte: ${type}`, {
      x: 50,
      y: height - 50,
      size: 20,
    });

    page.drawText(`Generado: ${new Date().toLocaleDateString('es-ES')}`, {
      x: 50,
      y: height - 80,
      size: 12,
    });

    return Buffer.from(await pdfDoc.save());
  }
}
