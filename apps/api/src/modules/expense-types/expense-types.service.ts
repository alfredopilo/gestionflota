import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateExpenseTypeDto } from './dto/create-expense-type.dto';
import { UpdateExpenseTypeDto } from './dto/update-expense-type.dto';

@Injectable()
export class ExpenseTypesService {
  constructor(private prisma: PrismaService) {}

  async create(createExpenseTypeDto: CreateExpenseTypeDto, companyId: string) {
    return this.prisma.expenseType.create({
      data: {
        ...createExpenseTypeDto,
        companyId,
      },
    });
  }

  async findAll(companyId: string, page = 1, limit = 100, activeOnly = false) {
    const skip = (page - 1) * limit;
    const where: any = {
      companyId,
    };
    if (activeOnly) {
      where.active = true;
    }

    const [data, total] = await Promise.all([
      this.prisma.expenseType.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.expenseType.count({ where }),
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
    const expenseType = await this.prisma.expenseType.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!expenseType) {
      throw new NotFoundException('Expense type not found');
    }

    return expenseType;
  }

  async update(id: string, updateExpenseTypeDto: UpdateExpenseTypeDto, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.expenseType.update({
      where: { id },
      data: updateExpenseTypeDto,
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.expenseType.delete({
      where: { id },
    });
  }
}

