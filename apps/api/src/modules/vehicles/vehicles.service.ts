import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async create(createVehicleDto: CreateVehicleDto, companyId: string) {
    return this.prisma.vehicle.create({
      data: {
        ...createVehicleDto,
        companyId,
      },
      include: {
        maintenancePlan: {
          select: {
            id: true,
            name: true,
            vehicleType: true,
          },
        },
      },
    });
  }

  async findAll(companyId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where: {
          companyId,
          deletedAt: null,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          maintenancePlan: {
            select: {
              id: true,
              name: true,
              vehicleType: true,
            },
          },
        },
      }),
      this.prisma.vehicle.count({
        where: {
          companyId,
          deletedAt: null,
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string, companyId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        companyId,
        deletedAt: null,
      },
      include: {
        documents: true,
        maintenancePlan: {
          select: {
            id: true,
            name: true,
            vehicleType: true,
            isActive: true,
          },
        },
        tripsAsVehicle: {
          select: {
            id: true,
            origin: true,
            destination: true,
            departureTime: true,
            arrivalTime: true,
            status: true,
            kmTotal: true,
            date: true,
          },
          orderBy: { date: 'desc' },
        },
        workOrders: {
          select: {
            id: true,
            number: true,
            type: true,
            status: true,
            scheduledDate: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Formatear trips para el frontend
    const formattedTrips = vehicle.tripsAsVehicle?.map((trip) => ({
      id: trip.id,
      origin: trip.origin || '',
      destination: trip.destination || '',
      departureDate: trip.departureTime ? trip.departureTime.toISOString() : trip.date.toISOString(),
      arrivalDate: trip.arrivalTime ? trip.arrivalTime.toISOString() : null,
      status: trip.status,
      distance: Number(trip.kmTotal || 0),
    })) || [];

    // Eliminar tripsAsVehicle y retornar solo trips formateados
    const { tripsAsVehicle, ...vehicleWithoutTrips } = vehicle;

    return {
      ...vehicleWithoutTrips,
      trips: formattedTrips,
    };
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.vehicle.update({
      where: { id },
      data: updateVehicleDto,
      include: {
        maintenancePlan: {
          select: {
            id: true,
            name: true,
            vehicleType: true,
          },
        },
      },
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.vehicle.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async getDocuments(vehicleId: string, companyId: string) {
    const vehicle = await this.findOne(vehicleId, companyId);
    return this.prisma.vehicleDocument.findMany({
      where: { vehicleId },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async addDocument(vehicleId: string, createDocumentDto: any, companyId: string) {
    await this.findOne(vehicleId, companyId);
    return this.prisma.vehicleDocument.create({
      data: {
        ...createDocumentDto,
        vehicleId,
      },
    });
  }

  async getMaintenanceHistory(vehicleId: string, companyId: string) {
    await this.findOne(vehicleId, companyId);
    return this.prisma.workOrder.findMany({
      where: {
        vehicleId,
        companyId,
        status: 'COMPLETED',
      },
      include: {
        items: {
          include: {
            activity: true,
          },
        },
        operator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }
}
