import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  async create(createRouteDto: CreateRouteDto, companyId: string) {
    const { fixedExpenses, ...routeData } = createRouteDto;

    // Validar que todos los expenseTypeId pertenezcan a la misma compañía
    if (fixedExpenses && fixedExpenses.length > 0) {
      const expenseTypeIds = fixedExpenses.map((fe) => fe.expenseTypeId);
      const expenseTypes = await this.prisma.expenseType.findMany({
        where: {
          id: { in: expenseTypeIds },
          companyId,
        },
      });

      if (expenseTypes.length !== expenseTypeIds.length) {
        throw new BadRequestException('Uno o más tipos de gasto no pertenecen a la compañía');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const route = await tx.route.create({
        data: {
          ...routeData,
          companyId,
        },
      });

      if (fixedExpenses && fixedExpenses.length > 0) {
        await tx.routeFixedExpense.createMany({
          data: fixedExpenses.map((fe) => ({
            routeId: route.id,
            expenseTypeId: fe.expenseTypeId,
            amount: fe.amount,
          })),
        });
      }

      return tx.route.findUnique({
        where: { id: route.id },
        include: {
          fixedExpenses: {
            include: {
              expenseType: true,
            },
          },
        },
      });
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
        fixedExpenses: {
          include: {
            expenseType: true,
          },
          orderBy: {
            createdAt: 'asc',
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

    const { fixedExpenses, ...routeData } = updateRouteDto;

    // Validar que todos los expenseTypeId pertenezcan a la misma compañía si se proporcionan
    if (fixedExpenses && fixedExpenses.length > 0) {
      const expenseTypeIds = fixedExpenses.map((fe) => fe.expenseTypeId);
      const expenseTypes = await this.prisma.expenseType.findMany({
        where: {
          id: { in: expenseTypeIds },
          companyId,
        },
      });

      if (expenseTypes.length !== expenseTypeIds.length) {
        throw new BadRequestException('Uno o más tipos de gasto no pertenecen a la compañía');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Actualizar los datos de la ruta
      const route = await tx.route.update({
        where: { id },
        data: routeData,
      });

      // Manejar gastos fijos si se proporcionan
      if (fixedExpenses !== undefined) {
        // Eliminar todos los gastos fijos existentes
        await tx.routeFixedExpense.deleteMany({
          where: { routeId: id },
        });

        // Crear los nuevos gastos fijos
        if (fixedExpenses.length > 0) {
          await tx.routeFixedExpense.createMany({
            data: fixedExpenses.map((fe) => ({
              routeId: id,
              expenseTypeId: fe.expenseTypeId,
              amount: fe.amount,
            })),
          });
        }
      }

      return tx.route.findUnique({
        where: { id },
        include: {
          fixedExpenses: {
            include: {
              expenseType: true,
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.route.delete({
      where: { id },
    });
  }
}
