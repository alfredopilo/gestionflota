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
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.vehicle.update({
      where: { id },
      data: updateVehicleDto,
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
