import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) {}

  async create(createTripDto: CreateTripDto, companyId: string, createdById: string) {
    // Validaciones
    if (createTripDto.kmEnd && createTripDto.kmStart && createTripDto.kmEnd < createTripDto.kmStart) {
      throw new BadRequestException('kmEnd debe ser mayor o igual a kmStart');
    }

    if (createTripDto.arrivalTime && createTripDto.departureTime) {
      const arrival = new Date(createTripDto.arrivalTime);
      const departure = new Date(createTripDto.departureTime);
      if (arrival < departure) {
        throw new BadRequestException('arrivalTime debe ser mayor o igual a departureTime');
      }
    }

    // Calcular kmTotal si no se proporciona
    let kmTotal = createTripDto.kmTotal;
    if (!kmTotal && createTripDto.kmStart && createTripDto.kmEnd) {
      kmTotal = createTripDto.kmEnd - createTripDto.kmStart;
    }

    // Convertir fecha a formato ISO-8601 DateTime si es necesario
    let date = createTripDto.date;
    if (typeof date === 'string' && !date.includes('T')) {
      // Si la fecha es solo YYYY-MM-DD, convertirla a ISO-8601
      date = new Date(date + 'T00:00:00.000Z').toISOString();
    }

    return this.prisma.trip.create({
      data: {
        ...createTripDto,
        date,
        kmTotal,
        companyId,
        createdById,
      },
      include: {
        vehicle: true,
        driver1: true,
        driver2: true,
        route: true,
      },
    });
  }

  async findAll(companyId: string, page = 1, limit = 10, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = {
      companyId,
    };

    if (filters?.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }
    if (filters?.driver1Id) {
      where.driver1Id = filters.driver1Id;
    }
    if (filters?.dateFrom) {
      where.date = { gte: new Date(filters.dateFrom) };
    }
    if (filters?.dateTo) {
      where.date = { ...where.date, lte: new Date(filters.dateTo) };
    }

    const [data, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicle: true,
          driver1: true,
          driver2: true,
          route: true,
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.trip.count({ where }),
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
    const trip = await this.prisma.trip.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        vehicle: true,
        driver1: true,
        driver2: true,
        route: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  async update(id: string, updateTripDto: UpdateTripDto, companyId: string) {
    await this.findOne(id, companyId);

    // Validaciones
    if (updateTripDto.kmEnd && updateTripDto.kmStart && updateTripDto.kmEnd < updateTripDto.kmStart) {
      throw new BadRequestException('kmEnd debe ser mayor o igual a kmStart');
    }

    // Calcular kmTotal si se actualizan kmStart o kmEnd
    let kmTotal = updateTripDto.kmTotal;
    if (!kmTotal && updateTripDto.kmStart && updateTripDto.kmEnd) {
      kmTotal = updateTripDto.kmEnd - updateTripDto.kmStart;
    }

    // Convertir fecha a formato ISO-8601 DateTime si es necesario
    let date = updateTripDto.date;
    if (date && typeof date === 'string' && !date.includes('T')) {
      // Si la fecha es solo YYYY-MM-DD, convertirla a ISO-8601
      date = new Date(date + 'T00:00:00.000Z').toISOString();
    }

    return this.prisma.trip.update({
      where: { id },
      data: {
        ...updateTripDto,
        date,
        kmTotal,
      },
      include: {
        vehicle: true,
        driver1: true,
        driver2: true,
        route: true,
      },
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.trip.delete({
      where: { id },
    });
  }
}
