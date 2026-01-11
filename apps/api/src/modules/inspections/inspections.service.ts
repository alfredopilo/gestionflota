import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { CreateInspectionItemDto } from './dto/create-inspection-item.dto';
import { UpdateInspectionItemDto } from './dto/update-inspection-item.dto';

@Injectable()
export class InspectionsService {
  constructor(private prisma: PrismaService) {}

  // Secciones estándar del checklist tipo PDF
  private readonly defaultSections = [
    'Sistema de Luces',
    'Motor/Caja/Transmisión',
    'Frenos',
    'Suspensión',
    'Neumático',
    'Eléctrico',
    'Refrigeración',
    'Carrocería',
    'Remolque',
    'Seguridad',
    'Accesorios',
    'Documentos',
    'Otros',
  ];

  async getTemplates(companyId: string) {
    return this.prisma.inspectionTemplate.findMany({
      where: {
        companyId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTemplate(name: string, description: string, sections: any, companyId: string) {
    return this.prisma.inspectionTemplate.create({
      data: {
        name,
        description,
        sections,
        companyId,
      },
    });
  }

  async create(createInspectionDto: CreateInspectionDto, inspectorId: string, companyId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: createInspectionDto.vehicleId, companyId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    let template = null;
    if (createInspectionDto.templateId) {
      template = await this.prisma.inspectionTemplate.findFirst({
        where: {
          id: createInspectionDto.templateId,
          companyId,
        },
      });
    }

    // Generar número de inspección
    const count = await this.prisma.inspection.count({
      where: { companyId },
    });
    const number = `INS-${String(count + 1).padStart(6, '0')}`;

    const inspection = await this.prisma.inspection.create({
      data: {
        number,
        vehicleId: createInspectionDto.vehicleId,
        templateId: createInspectionDto.templateId || null,
        inspectorId,
        inspectionDate: createInspectionDto.inspectionDate
          ? new Date(createInspectionDto.inspectionDate)
          : new Date(),
        notes: createInspectionDto.notes,
        companyId,
        status: 'PENDING',
      },
    });

    // Si hay template, crear items desde el template
    if (template && template.sections) {
      const sections = template.sections as any;
      const items: any[] = [];

      for (const [sectionName, sectionItems] of Object.entries(sections)) {
        if (Array.isArray(sectionItems)) {
          for (const itemName of sectionItems) {
            items.push({
              inspectionId: inspection.id,
              section: sectionName,
              itemName: itemName as string,
              status: null,
            });
          }
        }
      }

      if (items.length > 0) {
        await this.prisma.inspectionItem.createMany({
          data: items,
        });
      }
    } else {
      // Crear items básicos desde secciones estándar
      const defaultItems = [
        { section: 'Sistema de Luces', items: ['Luces delanteras', 'Luces traseras', 'Intermitentes', 'Luces de freno'] },
        { section: 'Motor/Caja/Transmisión', items: ['Nivel de aceite', 'Filtros', 'Correas', 'Fugas'] },
        { section: 'Frenos', items: ['Frenos delanteros', 'Frenos traseros', 'Freno de mano', 'Líquido de frenos'] },
        { section: 'Suspensión', items: ['Amortiguadores', 'Muelles', 'Bujes', 'Brazos'] },
        { section: 'Neumático', items: ['Presión', 'Desgaste', 'Válvulas', 'Estado general'] },
        { section: 'Eléctrico', items: ['Batería', 'Alternador', 'Cables', 'Fusibles'] },
        { section: 'Refrigeración', items: ['Radiador', 'Líquido refrigerante', 'Mangueras', 'Termostato'] },
        { section: 'Carrocería', items: ['Pintura', 'Chapa', 'Cristales', 'Espejos'] },
        { section: 'Remolque', items: ['Acople', 'Luces', 'Frenos', 'Neumáticos'] },
        { section: 'Seguridad', items: ['Extintor', 'Botiquín', 'Triángulos', 'Chaleco'] },
        { section: 'Accesorios', items: ['Radio', 'Aire acondicionado', 'GPS', 'Otros'] },
        { section: 'Documentos', items: ['Matrícula', 'Revisión', 'Permisos', 'Seguro'] },
      ];

      const items: any[] = [];
      for (const sectionData of defaultItems) {
        for (const itemName of sectionData.items) {
          items.push({
            inspectionId: inspection.id,
            section: sectionData.section,
            itemName,
            status: null,
          });
        }
      }

      await this.prisma.inspectionItem.createMany({
        data: items,
      });
    }

    return this.findOne(inspection.id, companyId);
  }

  async findAll(companyId: string, page = 1, limit = 10, filters?: any) {
    const skip = (page - 1) * limit;
    const where: any = { companyId };

    if (filters?.vehicleId) {
      where.vehicleId = filters.vehicleId;
    }
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.inspectorId) {
      where.inspectorId = filters.inspectorId;
    }

    const [data, total] = await Promise.all([
      this.prisma.inspection.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicle: {
            select: {
              id: true,
              plate: true,
              brand: true,
              model: true,
            },
          },
          inspector: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          template: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: { inspectionDate: 'desc' },
      }),
      this.prisma.inspection.count({ where }),
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
    const inspection = await this.prisma.inspection.findFirst({
      where: { id, companyId },
      include: {
        vehicle: true,
        inspector: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        template: true,
        items: {
          orderBy: [
            { section: 'asc' },
            { itemName: 'asc' },
          ],
        },
      },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    // Agrupar items por sección
    const itemsBySection: Record<string, any[]> = {};
    for (const item of inspection.items) {
      if (!itemsBySection[item.section]) {
        itemsBySection[item.section] = [];
      }
      itemsBySection[item.section].push(item);
    }

    return {
      ...inspection,
      itemsBySection,
    };
  }

  async addItem(inspectionId: string, createItemDto: CreateInspectionItemDto, companyId: string) {
    const inspection = await this.prisma.inspection.findFirst({
      where: { id: inspectionId, companyId },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    return this.prisma.inspectionItem.create({
      data: {
        inspectionId,
        ...createItemDto,
      },
    });
  }

  async updateItem(
    inspectionId: string,
    itemId: string,
    updateDto: UpdateInspectionItemDto,
    companyId: string,
  ) {
    const inspection = await this.prisma.inspection.findFirst({
      where: { id: inspectionId, companyId },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    const item = await this.prisma.inspectionItem.findFirst({
      where: {
        id: itemId,
        inspectionId,
      },
    });

    if (!item) {
      throw new NotFoundException('Inspection item not found');
    }

    return this.prisma.inspectionItem.update({
      where: { id: itemId },
      data: updateDto,
    });
  }

  async completeInspection(id: string, companyId: string) {
    const inspection = await this.prisma.inspection.findFirst({
      where: { id, companyId },
    });

    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }

    return this.prisma.inspection.update({
      where: { id },
      data: {
        status: 'COMPLETED',
      },
    });
  }
}
