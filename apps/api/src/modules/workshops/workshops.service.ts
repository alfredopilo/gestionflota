import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';

@Injectable()
export class WorkshopsService {
  constructor(private prisma: PrismaService) {}

  async create(createWorkshopDto: CreateWorkshopDto, companyId: string) {
    return this.prisma.workshop.create({
      data: {
        ...createWorkshopDto,
        companyId,
      },
    });
  }

  async findAll(companyId: string) {
    return this.prisma.workshop.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  async findOne(id: string, companyId: string) {
    const workshop = await this.prisma.workshop.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!workshop) {
      throw new NotFoundException('Workshop not found');
    }

    return workshop;
  }

  async update(id: string, updateWorkshopDto: UpdateWorkshopDto, companyId: string) {
    await this.findOne(id, companyId);

    return this.prisma.workshop.update({
      where: { id },
      data: updateWorkshopDto,
    });
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);

    return this.prisma.workshop.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
