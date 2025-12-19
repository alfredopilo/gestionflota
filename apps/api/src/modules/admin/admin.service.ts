import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getUsers(companyId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          companyId,
          deletedAt: null,
        },
        skip,
        take: limit,
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({
        where: {
          companyId,
          deletedAt: null,
        },
      }),
    ]);

    return {
      data: data.map((user) => ({
        ...user,
        roles: user.userRoles.map((ur) => ur.role.code),
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createUser(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    companyId: string;
    roleIds: string[];
  }) {
    try {
      console.log('Creating user with data:', {
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        companyId: data.companyId,
        roleIds: data.roleIds,
        roleIdsLength: data.roleIds?.length,
      });

      // Validar que hay roles
      if (!data.roleIds || data.roleIds.length === 0) {
        console.error('Error: No roles provided');
        throw new Error('Debe asignar al menos un rol al usuario');
      }

      // Verificar que los roles existen
      console.log('Checking roles existence for IDs:', data.roleIds);
      const existingRoles = await this.prisma.role.findMany({
        where: {
          id: { in: data.roleIds },
        },
      });

      console.log('Found roles:', existingRoles.map(r => ({ id: r.id, code: r.code })));

      if (existingRoles.length !== data.roleIds.length) {
        console.error('Error: Some roles do not exist. Expected:', data.roleIds.length, 'Found:', existingRoles.length);
        throw new Error('Uno o más roles no existen en el sistema');
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      const userData: any = {
        email: data.email,
        passwordHash: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        companyId: data.companyId,
      };

      // Solo agregar phone si tiene valor
      if (data.phone && data.phone.trim() !== '') {
        userData.phone = data.phone.trim();
      }

      const user = await this.prisma.user.create({
        data: userData,
      });

      // Asignar roles
      for (const roleId of data.roleIds) {
        if (roleId) {
          await this.prisma.userRole.create({
            data: {
              userId: user.id,
              roleId,
            },
          });
        }
      }

      return this.prisma.user.findUnique({
        where: { id: user.id },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    } catch (error: any) {
      console.error('Error creating user:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack,
      });

      // Si es un error de Prisma por email duplicado
      if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
        throw new Error('El email ya está registrado en el sistema');
      }
      // Re-lanzar otros errores
      throw error;
    }
  }

  async updateUserRoles(userId: string, roleIds: string[], companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Eliminar roles actuales
    await this.prisma.userRole.deleteMany({
      where: { userId },
    });

    // Asignar nuevos roles
    for (const roleId of roleIds) {
      await this.prisma.userRole.create({
        data: {
          userId,
          roleId,
        },
      });
    }

    return this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async getRoles() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getCatalogs(type: string, companyId: string) {
    switch (type) {
      case 'vehicle-types':
        return ['Camión', 'Remolque', 'Tractocamión', 'Furgón', 'Otro'];
      case 'document-types':
        return ['MATRICULA', 'REVISION', 'PERMISO', 'SEGURO'];
      case 'vehicle-status':
        return ['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'RETIRED'];
      case 'trip-status':
        return ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      case 'work-order-status':
        return ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
      case 'work-order-type':
        return ['PREVENTIVE', 'CORRECTIVE'];
      case 'inspection-status':
        return ['PENDING', 'COMPLETED', 'CANCELLED'];
      case 'inspection-item-status':
        return ['REVISION', 'MANTENIMIENTO', 'CAMBIO'];
      default:
        return [];
    }
  }
}
