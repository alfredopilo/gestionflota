import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getKPIs(companyId: string, filters?: { dateFrom?: Date; dateTo?: Date; vehicleId?: string }) {
    const where: any = { companyId, deletedAt: null };
    const tripWhere: any = { companyId };

    if (filters?.dateFrom) {
      tripWhere.date = { ...tripWhere.date, gte: filters.dateFrom };
    }
    if (filters?.dateTo) {
      tripWhere.date = { ...tripWhere.date, lte: filters.dateTo };
    }
    if (filters?.vehicleId) {
      tripWhere.vehicleId = filters.vehicleId;
      where.id = filters.vehicleId;
    }

    // Total vehículos
    const totalVehicles = await this.prisma.vehicle.count({ where });

    // Vehículos operativos
    const operationalVehicles = await this.prisma.vehicle.count({
      where: { ...where, status: 'ACTIVE' },
    });

    // Órdenes de trabajo activas (PENDING o IN_PROGRESS)
    const activeWorkOrders = await this.prisma.workOrder.count({
      where: {
        companyId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        ...(filters?.vehicleId ? { vehicleId: filters.vehicleId } : {}),
      },
    });

    // Mantener compatibilidad: también contar vehículos con status MAINTENANCE
    const maintenanceVehiclesStatus = await this.prisma.vehicle.count({
      where: { ...where, status: 'MAINTENANCE' },
    });

    // Usar el mayor entre órdenes activas y vehículos con status MAINTENANCE
    const maintenanceVehicles = Math.max(activeWorkOrders, maintenanceVehiclesStatus);

    // Disponibilidad de flota
    const fleetAvailability = totalVehicles > 0
      ? (operationalVehicles / totalVehicles) * 100
      : 0;

    // Mantenimientos programados vs completados
    const maintenanceWhere: any = { companyId };
    if (filters?.dateFrom) {
      maintenanceWhere.scheduledDate = { ...maintenanceWhere.scheduledDate, gte: filters.dateFrom };
    }
    if (filters?.dateTo) {
      maintenanceWhere.scheduledDate = { ...maintenanceWhere.scheduledDate, lte: filters.dateTo };
    }
    if (filters?.vehicleId) {
      maintenanceWhere.vehicleId = filters.vehicleId;
    }

    const scheduledMaintenances = await this.prisma.workOrder.count({
      where: { ...maintenanceWhere, type: 'PREVENTIVE' },
    });

    const completedMaintenances = await this.prisma.workOrder.count({
      where: { ...maintenanceWhere, type: 'PREVENTIVE', status: 'COMPLETED' },
    });

    const overdueMaintenances = await this.prisma.workOrder.count({
      where: {
        ...maintenanceWhere,
        type: 'PREVENTIVE',
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        scheduledDate: { lt: new Date() },
      },
    });

    const maintenanceCompliance = scheduledMaintenances > 0
      ? (completedMaintenances / scheduledMaintenances) * 100
      : 0;

    // Viajes realizados
    const tripsCompleted = await this.prisma.trip.count({
      where: { ...tripWhere, status: 'COMPLETED' },
    });

    // Kilómetros recorridos
    const trips = await this.prisma.trip.findMany({
      where: tripWhere,
      select: { kmTotal: true },
    });

    const totalKm = trips.reduce((sum, trip) => sum + Number(trip.kmTotal || 0), 0);

    // Costos de mantenimiento
    const workOrders = await this.prisma.workOrder.findMany({
      where: {
        ...maintenanceWhere,
        status: 'COMPLETED',
      },
      select: { totalCost: true },
    });

    const totalMaintenanceCost = workOrders.reduce(
      (sum, wo) => sum + Number(wo.totalCost || 0),
      0,
    );

    return {
      fleetAvailability: Math.round(fleetAvailability * 100) / 100,
      maintenanceCompliance: Math.round(maintenanceCompliance * 100) / 100,
      tripsCompleted,
      totalKm: Math.round(totalKm * 100) / 100,
      totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
      operationalVehicles,
      maintenanceVehicles,
      totalVehicles,
      scheduledMaintenances,
      completedMaintenances,
      overdueMaintenances,
    };
  }

  async getChartData(
    type: string,
    companyId: string,
    filters?: { dateFrom?: Date; dateTo?: Date; vehicleId?: string },
  ) {
    switch (type) {
      case 'disponibility':
        return this.getDisponibilityChart(companyId, filters);
      case 'maintenance-compliance':
        return this.getMaintenanceComplianceChart(companyId, filters);
      case 'trips':
        return this.getTripsChart(companyId, filters);
      case 'km':
        return this.getKmChart(companyId, filters);
      case 'costs':
        return this.getCostsChart(companyId, filters);
      default:
        return [];
    }
  }

  private async getDisponibilityChart(companyId: string, filters?: any) {
    // Últimos 12 meses
    const months = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(date);
    }

    const data = [];
    for (const month of months) {
      const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
      const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

      const total = await this.prisma.vehicle.count({
        where: {
          companyId,
          deletedAt: null,
          createdAt: { lte: monthEnd },
        },
      });

      const operational = await this.prisma.vehicle.count({
        where: {
          companyId,
          deletedAt: null,
          status: 'ACTIVE',
          createdAt: { lte: monthEnd },
        },
      });

      data.push({
        month: month.toISOString().substring(0, 7),
        total,
        operational,
        availability: total > 0 ? (operational / total) * 100 : 0,
      });
    }

    return data;
  }

  private async getMaintenanceComplianceChart(companyId: string, filters?: any) {
    const where: any = { companyId, type: 'PREVENTIVE' };
    if (filters?.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    const scheduled = await this.prisma.workOrder.count({
      where: { ...where, scheduledDate: { not: null } },
    });

    const completed = await this.prisma.workOrder.count({
      where: { ...where, status: 'COMPLETED' },
    });

    const overdue = await this.prisma.workOrder.count({
      where: {
        ...where,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        scheduledDate: { lt: new Date() },
      },
    });

    return [
      { label: 'Programados', value: scheduled },
      { label: 'Completados', value: completed },
      { label: 'Vencidos', value: overdue },
    ];
  }

  private async getTripsChart(companyId: string, filters?: any) {
    const tripWhere: any = { companyId };
    if (filters?.dateFrom) {
      tripWhere.date = { ...tripWhere.date, gte: filters.dateFrom };
    }
    if (filters?.dateTo) {
      tripWhere.date = { ...tripWhere.date, lte: filters.dateTo };
    }
    if (filters?.vehicleId) {
      tripWhere.vehicleId = filters.vehicleId;
    }

    // Últimos 30 días
    const days = [];
    const now = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      days.push(date);
    }

    const data = [];
    for (const day of days) {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const count = await this.prisma.trip.count({
        where: {
          ...tripWhere,
          date: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      data.push({
        date: day.toISOString().substring(0, 10),
        count,
      });
    }

    return data;
  }

  private async getKmChart(companyId: string, filters?: any) {
    const tripWhere: any = { companyId };
    if (filters?.dateFrom) {
      tripWhere.date = { ...tripWhere.date, gte: filters.dateFrom };
    }
    if (filters?.dateTo) {
      tripWhere.date = { ...tripWhere.date, lte: filters.dateTo };
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        companyId,
        deletedAt: null,
        ...(filters?.vehicleId ? { id: filters.vehicleId } : {}),
      },
      select: {
        id: true,
        plate: true,
      },
      take: 10, // Top 10 vehículos
    });

    const data = [];
    for (const vehicle of vehicles) {
      const trips = await this.prisma.trip.findMany({
        where: {
          ...tripWhere,
          vehicleId: vehicle.id,
        },
        select: { kmTotal: true },
      });

      const totalKm = trips.reduce((sum, trip) => sum + Number(trip.kmTotal || 0), 0);

      data.push({
        vehicleId: vehicle.id,
        plate: vehicle.plate,
        km: totalKm,
      });
    }

    return data.sort((a, b) => b.km - a.km);
  }

  private async getCostsChart(companyId: string, filters?: any) {
    const where: any = { companyId, status: 'COMPLETED' };
    if (filters?.dateFrom) {
      where.completedAt = { ...where.completedAt, gte: filters.dateFrom };
    }
    if (filters?.dateTo) {
      where.completedAt = { ...where.completedAt, lte: filters.dateTo };
    }
    if (filters?.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }

    const workOrders = await this.prisma.workOrder.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            plate: true,
          },
        },
      },
      take: 10, // Top 10 vehículos
    });

    const vehicleCosts: Record<string, { plate: string; cost: number }> = {};

    for (const wo of workOrders) {
      const vehicleId = wo.vehicleId;
      if (!vehicleCosts[vehicleId]) {
        vehicleCosts[vehicleId] = {
          plate: wo.vehicle.plate,
          cost: 0,
        };
      }
      vehicleCosts[vehicleId].cost += Number(wo.totalCost || 0);
    }

    return Object.values(vehicleCosts)
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10);
  }

  async getAlerts(companyId: string) {
    const alerts = [];

    // Mantenimientos próximos a vencer (próximos 7 días)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);

    const upcomingMaintenances = await this.prisma.workOrder.findMany({
      where: {
        companyId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        scheduledDate: {
          lte: nextWeek,
          gte: new Date(),
        },
      },
      include: {
        vehicle: {
          select: {
            id: true,
            plate: true,
          },
        },
      },
      take: 10,
    });

    for (const maintenance of upcomingMaintenances) {
      alerts.push({
        type: 'MAINTENANCE_DUE',
        severity: 'WARNING',
        vehicleId: maintenance.vehicleId,
        message: `Mantenimiento programado para ${maintenance.vehicle.plate} el ${maintenance.scheduledDate?.toLocaleDateString()}`,
        dueDate: maintenance.scheduledDate,
      });
    }

    // Documentos próximos a vencer (próximos 30 días)
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const expiringDocuments = await this.prisma.vehicleDocument.findMany({
      where: {
        vehicle: {
          companyId,
          deletedAt: null,
        },
        expiryDate: {
          lte: nextMonth,
          gte: new Date(),
        },
      },
      include: {
        vehicle: {
          select: {
            id: true,
            plate: true,
          },
        },
      },
      take: 10,
    });

    for (const doc of expiringDocuments) {
      alerts.push({
        type: 'DOCUMENT_EXPIRY',
        severity: doc.expiryDate && doc.expiryDate < new Date() ? 'CRITICAL' : 'WARNING',
        vehicleId: doc.vehicleId,
        message: `Documento ${doc.documentType} de ${doc.vehicle.plate} vence el ${doc.expiryDate?.toLocaleDateString()}`,
        dueDate: doc.expiryDate,
      });
    }

    // Vehículos inactivos (sin viajes en últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const inactiveVehicles = await this.prisma.vehicle.findMany({
      where: {
        companyId,
        deletedAt: null,
        status: 'ACTIVE',
      },
      include: {
        tripsAsVehicle: {
          where: {
            date: { gte: thirtyDaysAgo },
          },
          take: 1,
        },
      },
    });

    for (const vehicle of inactiveVehicles) {
      const totalTrips = (vehicle.tripsAsVehicle || []).length;
      if (totalTrips === 0) {
        alerts.push({
          type: 'VEHICLE_INACTIVE',
          severity: 'INFO',
          vehicleId: vehicle.id,
          message: `Vehículo ${vehicle.plate} sin actividad en los últimos 30 días`,
        });
      }
    }

    return alerts.slice(0, 20); // Máximo 20 alertas
  }
}
