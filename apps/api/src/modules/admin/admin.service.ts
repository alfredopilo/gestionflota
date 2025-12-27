import { Injectable, NotFoundException, BadRequestException, InternalServerErrorException, ConflictException } from '@nestjs/common';
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
        throw new ConflictException('El email ya está registrado en el sistema');
      }

      // Si es un error de Prisma por constraint único violado en otro campo
      if (error.code === 'P2002') {
        const field = error.meta?.target?.[0] || 'campo';
        throw new ConflictException(`Ya existe un usuario con ese ${field}`);
      }

      // Si es un error de validación (email inválido, roles no existen, etc.)
      if (error.message && (
        error.message.includes('Debe asignar') ||
        error.message.includes('no existen') ||
        error.message.includes('inválido')
      )) {
        throw new BadRequestException(error.message);
      }

      // Si ya es una excepción HTTP, relanzarla
      if (error instanceof BadRequestException || 
          error instanceof ConflictException || 
          error instanceof InternalServerErrorException) {
        throw error;
      }

      // Si es un error conocido de Prisma
      if (error.code && error.code.startsWith('P')) {
        throw new BadRequestException(`Error de base de datos: ${error.message}`);
      }

      // Para otros errores, lanzar como error interno pero con mensaje descriptivo
      throw new InternalServerErrorException(
        error.message || 'Error al crear el usuario. Por favor, verifica los datos e intenta nuevamente.'
      );
    }
  }

  async getUser(userId: string, companyId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
        deletedAt: null,
      },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      roles: user.userRoles.map((ur) => ur.role.code),
    };
  }

  async updateUser(
    userId: string,
    updateData: {
      firstName?: string;
      lastName?: string;
      phone?: string;
      password?: string;
      isActive?: boolean;
    },
    companyId: string,
  ) {
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

    const updatePayload: any = {};

    if (updateData.firstName !== undefined) {
      updatePayload.firstName = updateData.firstName;
    }
    if (updateData.lastName !== undefined) {
      updatePayload.lastName = updateData.lastName;
    }
    if (updateData.phone !== undefined) {
      updatePayload.phone = updateData.phone || null;
    }
    if (updateData.isActive !== undefined) {
      updatePayload.isActive = updateData.isActive;
    }
    if (updateData.password) {
      updatePayload.passwordHash = await bcrypt.hash(updateData.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updatePayload,
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    return {
      ...updatedUser,
      roles: updatedUser.userRoles.map((ur) => ur.role.code),
    };
  }

  async deleteUser(userId: string, companyId: string) {
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

    // Soft delete
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
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
