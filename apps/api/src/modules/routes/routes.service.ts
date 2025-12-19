import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  async create(createRouteDto: CreateRouteDto, companyId: string) {
    return this.prisma.route.create({
      data: {
        ...createRouteDto,
        companyId,
      },
    });
  }

  async findAll(companyId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.route.findMany({
        where: {
          companyId,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.route.count({
        where: {
          companyId,
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
    const route = await this.prisma.route.findFirst({
      where: {
        id,
        companyId,
      },
      include: {
        trips: {
          take: 10,
          orderBy: { date: 'desc' },
          include: {
            vehicle: true,
            driver1: true,
          },
        },
      },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    return route;
  }

  async update(id: string, updateRouteDto: UpdateRouteDto, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.route.update({
      where: { id },
      data: updateRouteDto,
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.route.delete({
      where: { id },
    });
  }
}
