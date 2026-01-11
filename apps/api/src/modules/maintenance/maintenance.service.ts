import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { UpdateWorkOrderItemDto } from './dto/update-work-order-item.dto';
import { CreateMaintenancePlanDto } from './dto/create-maintenance-plan.dto';
import { UpdateMaintenancePlanDto } from './dto/update-maintenance-plan.dto';

@Injectable()
export class MaintenanceService {
  constructor(private prisma: PrismaService) {}

  async getPlan(companyId: string) {
    return this.prisma.maintenancePlan.findFirst({
      where: {
        companyId,
        isActive: true,
      },
      include: {
        intervals: {
          orderBy: { sequenceOrder: 'asc' },
        },
        activities: {
          where: { isActive: true },
          include: {
            activityMatrix: {
              include: {
                interval: true,
              },
            },
          },
        },
      },
    });
  }

  async getPlanByVehicleType(vehicleType: string, companyId: string) {
    return this.prisma.maintenancePlan.findFirst({
      where: {
        companyId,
        isActive: true,
        vehicleType: vehicleType,
      },
      include: {
        intervals: {
          orderBy: { sequenceOrder: 'asc' },
        },
        activities: {
          where: { isActive: true },
          include: {
            activityMatrix: {
              include: {
                interval: true,
              },
            },
          },
        },
      },
    });
  }

  async calculateNextMaintenance(vehicleId: string, companyId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId },
      include: {
        maintenancePlan: {
          include: {
            intervals: {
              orderBy: { sequenceOrder: 'asc' },
            },
            activities: {
              where: { isActive: true },
              include: {
                activityMatrix: {
                  include: {
                    interval: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Usar el plan asignado al vehículo, si no tiene, buscar por tipo de vehículo
    let plan = vehicle.maintenancePlan;
    if (!plan) {
      plan = await this.getPlanByVehicleType(vehicle.type, companyId);
    }
    if (!plan) {
      // Fallback: buscar cualquier plan activo de la compañía
      plan = await this.getPlan(companyId);
    }
    if (!plan) {
      throw new NotFoundException('No active maintenance plan found for this vehicle');
    }

    const lastMaintenance = await this.prisma.workOrder.findFirst({
      where: {
        vehicleId,
        status: 'COMPLETED',
      },
      orderBy: { completedAt: 'desc' },
      include: {
        items: {
          include: {
            activity: true,
          },
        },
      },
    });

    const currentOdometer = Number(vehicle.odometer);
    const currentHourmeter = Number(vehicle.hourmeter);

    const nextIntervals = [];
    const applicableActivities = [];

    // Calcular próximos intervalos basados en odómetro y horómetro
    for (const interval of plan.intervals) {
      const intervalKm = Number(interval.kilometers);
      const intervalHours = Number(interval.hours);

      let lastKm = 0;
      let lastHours = 0;

      if (lastMaintenance) {
        lastKm = Number(lastMaintenance.odometerAtStart || 0);
        lastHours = Number(lastMaintenance.hourmeterAtStart || 0);
      }

      const kmUntilNext = intervalKm - (currentOdometer - lastKm);
      const hoursUntilNext = intervalHours - (currentHourmeter - lastHours);

      if (kmUntilNext <= 0 || hoursUntilNext <= 0) {
        // Este intervalo ya debería haberse cumplido
        nextIntervals.push({
          interval,
          kmUntilNext: 0,
          hoursUntilNext: 0,
          isDue: true,
        });

        // Obtener actividades aplicables para este intervalo
        for (const activity of plan.activities) {
          const matrix = activity.activityMatrix.find(
            (m) => m.intervalId === interval.id && m.applies,
          );
          if (matrix) {
            applicableActivities.push(activity);
          }
        }
      } else if (kmUntilNext <= intervalKm * 0.1 || hoursUntilNext <= intervalHours * 0.1) {
        // Próximo intervalo (dentro del 10%)
        nextIntervals.push({
          interval,
          kmUntilNext,
          hoursUntilNext,
          isDue: false,
          isUpcoming: true,
        });
      }
    }

    return {
      vehicle,
      plan,
      lastMaintenance,
      nextIntervals: nextIntervals.slice(0, 3), // Próximos 3 intervalos
      applicableActivities: [...new Map(applicableActivities.map(a => [a.id, a])).values()], // Únicas
    };
  }

  async createWorkOrder(createWorkOrderDto: CreateWorkOrderDto, companyId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: createWorkOrderDto.vehicleId, companyId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Validar que si no es interno, debe tener un taller asignado
    if (createWorkOrderDto.isInternal === false && !createWorkOrderDto.workshopId) {
      throw new BadRequestException('Workshop ID is required for external maintenance');
    }

    // Si tiene workshopId, validar que el taller existe y pertenece a la compañía
    if (createWorkOrderDto.workshopId) {
      const workshop = await this.prisma.workshop.findFirst({
        where: {
          id: createWorkOrderDto.workshopId,
          companyId,
          isActive: true,
        },
      });

      if (!workshop) {
        throw new NotFoundException('Workshop not found or inactive');
      }
    }

    // Generar número de orden
    const count = await this.prisma.workOrder.count({
      where: { companyId },
    });
    const number = `WO-${String(count + 1).padStart(6, '0')}`;

    const workOrder = await this.prisma.workOrder.create({
      data: {
        number,
        ...createWorkOrderDto,
        companyId,
        status: 'PENDING',
      },
    });

    // Si es preventivo, generar items basados en el plan (si existe)
    if (createWorkOrderDto.type === 'PREVENTIVE') {
      try {
      const nextMaintenance = await this.calculateNextMaintenance(
        createWorkOrderDto.vehicleId,
        companyId,
      );

      const items = [];
        if (nextMaintenance.applicableActivities && nextMaintenance.applicableActivities.length > 0) {
      for (const activity of nextMaintenance.applicableActivities) {
        items.push({
          workOrderId: workOrder.id,
          activityId: activity.id,
          status: 'PENDING',
        });
      }

      if (items.length > 0) {
        await this.prisma.workOrderItem.createMany({
          data: items,
        });
          }
        }
      } catch (error) {
        // Si no hay plan activo, simplemente crear la orden sin items
        // El usuario puede agregar items manualmente después
        console.log('No active maintenance plan found. Creating work order without automatic items.');
      }
    }

    return this.findOne(workOrder.id, companyId);
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
    if (filters?.type) {
      where.type = filters.type;
    }

    const [data, total] = await Promise.all([
      this.prisma.workOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          vehicle: true,
          operator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          supervisor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          workshop: true,
          _count: {
            select: {
              items: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.workOrder.count({ where }),
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
    const workOrder = await this.prisma.workOrder.findFirst({
      where: { id, companyId },
      include: {
        vehicle: true,
        operator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        supervisor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        workshop: true,
        items: {
          include: {
            activity: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        signatures: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { signedAt: 'desc' },
        },
      },
    });

    if (!workOrder) {
      throw new NotFoundException('Work order not found');
    }

    return workOrder;
  }

  async updateWorkOrderItem(
    workOrderId: string,
    itemId: string,
    updateDto: UpdateWorkOrderItemDto,
    companyId: string,
  ) {
    const workOrder = await this.findOne(workOrderId, companyId);

    const item = await this.prisma.workOrderItem.findFirst({
      where: {
        id: itemId,
        workOrderId,
      },
    });

    if (!item) {
      throw new NotFoundException('Work order item not found');
    }

    const updateData: any = { ...updateDto };
    if (updateDto.status === 'COMPLETED' && !item.completedAt) {
      updateData.completedAt = new Date();
    }

    return this.prisma.workOrderItem.update({
      where: { id: itemId },
      data: updateData,
      include: {
        activity: true,
      },
    });
  }

  async startWorkOrder(id: string, companyId: string, operatorId: string) {
    const workOrder = await this.findOne(id, companyId);

    if (workOrder.status !== 'PENDING') {
      throw new BadRequestException('Work order is not in PENDING status');
    }

    return this.prisma.workOrder.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        operatorId,
      },
    });
  }

  async closeWorkOrder(
    id: string,
    companyId: string,
    userId: string,
    userRoles: string[],
    ipAddress: string,
    userAgent: string,
    notes?: string,
  ) {
    const workOrder = await this.findOne(id, companyId);

    if (workOrder.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Work order must be IN_PROGRESS to close');
    }

    // Verificar que todos los items estén completados o saltados
    const pendingItems = await this.prisma.workOrderItem.count({
      where: {
        workOrderId: id,
        status: 'PENDING',
      },
    });

    if (pendingItems > 0) {
      throw new BadRequestException('All work order items must be completed or skipped');
    }

    // Calcular costo total
    const items = await this.prisma.workOrderItem.findMany({
      where: { workOrderId: id },
    });

    const totalCost = items.reduce((sum, item) => sum + Number(item.cost || 0), 0);

    // Cerrar orden
    const closedOrder = await this.prisma.workOrder.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        totalCost,
        notes,
      },
    });

    // Crear firma
    const signatureType = userRoles.includes('JEFE_TALLER') ? 'SUPERVISOR' : 'OPERATOR';
    await this.prisma.workOrderSignature.create({
      data: {
        workOrderId: id,
        userId,
        role: userRoles[0] || 'OPERATOR',
        signatureType,
        ipAddress,
        userAgent,
      },
    });

    // Actualizar vehículo con último mantenimiento
    await this.prisma.vehicle.update({
      where: { id: workOrder.vehicleId },
      data: {
        lastMaintenanceDate: new Date(),
        // Actualizar odómetro/horómetro si se proporcionaron en la orden
        ...(workOrder.odometerAtStart && { odometer: workOrder.odometerAtStart }),
        ...(workOrder.hourmeterAtStart && { hourmeter: workOrder.hourmeterAtStart }),
      },
    });

    return this.findOne(id, companyId);
  }

  // ============================================
  // ÓRDENES DE TRABAJO - CANCELAR Y ELIMINAR
  // ============================================

  async cancelWorkOrder(id: string, companyId: string, reason?: string) {
    const workOrder = await this.findOne(id, companyId);

    // Solo se puede cancelar si no está completada
    if (workOrder.status === 'COMPLETED') {
      throw new BadRequestException('Cannot cancel a completed work order');
    }

    // Si ya está cancelada, no hacer nada
    if (workOrder.status === 'CANCELLED') {
      return workOrder;
    }

    return this.prisma.workOrder.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `${workOrder.notes || ''}\n\nCANCELADO: ${reason}`.trim() : workOrder.notes,
        completedAt: new Date(), // Marcar como completada (cancelada)
      },
    });
  }

  async deleteWorkOrder(id: string, companyId: string) {
    const workOrder = await this.findOne(id, companyId);

    // Solo se puede eliminar si está en PENDING o CANCELLED
    if (workOrder.status !== 'PENDING' && workOrder.status !== 'CANCELLED') {
      throw new BadRequestException(
        'Only work orders in PENDING or CANCELLED status can be deleted. Cancel the work order first.',
      );
    }

    // Eliminar items de la orden primero
    await this.prisma.workOrderItem.deleteMany({
      where: { workOrderId: id },
    });

    // Eliminar firmas si las hay
    await this.prisma.workOrderSignature.deleteMany({
      where: { workOrderId: id },
    });

    // Eliminar la orden
    await this.prisma.workOrder.delete({
      where: { id },
    });

    return { message: 'Work order deleted successfully' };
  }

  // ============================================
  // PLANES DE MANTENIMIENTO - CRUD
  // ============================================

  async findAllPlans(companyId: string, filters?: { vehicleType?: string; isActive?: boolean }) {
    const where: any = { companyId };

    if (filters?.vehicleType) {
      where.vehicleType = filters.vehicleType;
    }
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const plans = await this.prisma.maintenancePlan.findMany({
      where,
      include: {
        intervals: {
          orderBy: { sequenceOrder: 'asc' },
        },
        activities: {
          where: { isActive: true },
        },
        _count: {
          select: {
            intervals: true,
            activities: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return plans;
  }

  async findPlanById(id: string, companyId: string) {
    const plan = await this.prisma.maintenancePlan.findFirst({
      where: { id, companyId },
      include: {
        intervals: {
          orderBy: { sequenceOrder: 'asc' },
        },
        activities: {
          where: { isActive: true },
          include: {
            activityMatrix: {
              include: {
                interval: true,
              },
            },
          },
          orderBy: [{ category: 'asc' }, { code: 'asc' }],
        },
        _count: {
          select: {
            intervals: true,
            activities: true,
          },
        },
      },
    });

    if (!plan) {
      throw new NotFoundException('Maintenance plan not found');
    }

    return plan;
  }

  async createPlan(createPlanDto: CreateMaintenancePlanDto, companyId: string) {
    // Validaciones
    if (!createPlanDto.intervals || createPlanDto.intervals.length === 0) {
      throw new BadRequestException('At least one interval is required');
    }

    if (!createPlanDto.activities || createPlanDto.activities.length === 0) {
      throw new BadRequestException('At least one activity is required');
    }

    // NOTA: Ya no se desactivan otros planes automáticamente.
    // Se permite tener múltiples planes activos por tipo de vehículo.
    // Los vehículos se asignan a planes específicos individualmente.

    // Crear plan
    const plan = await this.prisma.maintenancePlan.create({
      data: {
        name: createPlanDto.name,
        description: createPlanDto.description,
        vehicleType: createPlanDto.vehicleType,
        isActive: createPlanDto.isActive !== false,
        companyId,
      },
    });

    // Crear intervalos
    const createdIntervals = [];
    for (let i = 0; i < createPlanDto.intervals.length; i++) {
      const intervalData = createPlanDto.intervals[i];
      const interval = await this.prisma.maintenanceInterval.create({
        data: {
          planId: plan.id,
          hours: intervalData.hours,
          kilometers: intervalData.kilometers,
          sequenceOrder: intervalData.sequenceOrder || i + 1,
        },
      });
      createdIntervals.push(interval);
    }

    // Crear actividades y matriz
    const createdActivities = [];
    for (const activityData of createPlanDto.activities) {
      const activity = await this.prisma.maintenanceActivity.create({
        data: {
          planId: plan.id,
          code: activityData.code,
          description: activityData.description,
          category: activityData.category,
          isActive: true,
        },
      });
      createdActivities.push(activity);

      // Crear matriz de aplicación si se proporcionaron intervalIds
      if (activityData.intervalIds && activityData.intervalIds.length > 0) {
        const matrixData = activityData.intervalIds
          .map((intervalId) => {
            // Buscar intervalo por ID (puede ser ID temporal del frontend o ID real)
            const interval = createdIntervals.find((i) => i.id === intervalId);
            if (!interval) {
              // Si no se encuentra por ID, intentar por índice (para IDs temporales como "temp-xxx")
              const tempIndexMatch = intervalId.toString().match(/temp-\d+-(\d+)/);
              if (tempIndexMatch) {
                const index = parseInt(tempIndexMatch[1]);
                if (index >= 0 && index < createdIntervals.length) {
                  return {
                    activityId: activity.id,
                    intervalId: createdIntervals[index].id,
                    applies: true,
                  };
                }
              }
              // Si es un número, tratarlo como índice
              const numericIndex = parseInt(intervalId.toString());
              if (!isNaN(numericIndex) && numericIndex >= 0 && numericIndex < createdIntervals.length) {
                return {
                  activityId: activity.id,
                  intervalId: createdIntervals[numericIndex].id,
                  applies: true,
                };
              }
              return null;
            }
            return {
              activityId: activity.id,
              intervalId: interval.id,
              applies: true,
            };
          })
          .filter((m) => m !== null);

        if (matrixData.length > 0) {
          await this.prisma.activityIntervalMatrix.createMany({
            data: matrixData,
          });
        }
      }
    }

    return this.findPlanById(plan.id, companyId);
  }

  async updatePlan(id: string, updatePlanDto: UpdateMaintenancePlanDto, companyId: string) {
    const plan = await this.findPlanById(id, companyId);

    // NOTA: Ya no se desactivan otros planes automáticamente.
    // Se permite tener múltiples planes activos por tipo de vehículo.

    // Actualizar datos básicos del plan
    const updateData: any = {};
    if (updatePlanDto.name !== undefined) updateData.name = updatePlanDto.name;
    if (updatePlanDto.description !== undefined) updateData.description = updatePlanDto.description;
    if (updatePlanDto.vehicleType !== undefined) updateData.vehicleType = updatePlanDto.vehicleType;
    if (updatePlanDto.isActive !== undefined) updateData.isActive = updatePlanDto.isActive;

    if (Object.keys(updateData).length > 0) {
      await this.prisma.maintenancePlan.update({
        where: { id },
        data: updateData,
      });
    }

    // Actualizar intervalos si se proporcionan
    if (updatePlanDto.intervals) {
      // Eliminar intervalos existentes y sus matrices
      await this.prisma.activityIntervalMatrix.deleteMany({
        where: {
          interval: {
            planId: id,
          },
        },
      });
      await this.prisma.maintenanceInterval.deleteMany({
        where: { planId: id },
      });

      // Crear nuevos intervalos
      for (let i = 0; i < updatePlanDto.intervals.length; i++) {
        const intervalData = updatePlanDto.intervals[i];
        await this.prisma.maintenanceInterval.create({
          data: {
            planId: id,
            hours: intervalData.hours,
            kilometers: intervalData.kilometers,
            sequenceOrder: intervalData.sequenceOrder || i + 1,
          },
        });
      }
    }

    // Actualizar actividades si se proporcionan
    if (updatePlanDto.activities) {
      // Eliminar matrices existentes
      await this.prisma.activityIntervalMatrix.deleteMany({
        where: {
          activity: {
            planId: id,
          },
        },
      });

      // Desactivar actividades existentes
      await this.prisma.maintenanceActivity.updateMany({
        where: { planId: id },
        data: { isActive: false },
      });

      // Obtener intervalos actualizados
      const currentIntervals = await this.prisma.maintenanceInterval.findMany({
        where: { planId: id },
        orderBy: { sequenceOrder: 'asc' },
      });

      // Crear/actualizar actividades
      for (const activityData of updatePlanDto.activities) {
        // Buscar actividad existente por código
        let activity = await this.prisma.maintenanceActivity.findFirst({
          where: {
            planId: id,
            code: activityData.code,
          },
        });

        if (activity) {
          // Actualizar actividad existente
          activity = await this.prisma.maintenanceActivity.update({
            where: { id: activity.id },
            data: {
              description: activityData.description,
              category: activityData.category,
              isActive: true,
            },
          });
        } else {
          // Crear nueva actividad
          activity = await this.prisma.maintenanceActivity.create({
            data: {
              planId: id,
              code: activityData.code,
              description: activityData.description,
              category: activityData.category,
              isActive: true,
            },
          });
        }

        // Crear matriz de aplicación
        if (activityData.intervalIds && activityData.intervalIds.length > 0) {
          const matrixData = activityData.intervalIds
            .map((intervalId) => {
              const interval = currentIntervals.find((i) => i.id === intervalId);
              if (!interval) return null;
              return {
                activityId: activity.id,
                intervalId: interval.id,
                applies: true,
              };
            })
            .filter((m) => m !== null);

          if (matrixData.length > 0) {
            await this.prisma.activityIntervalMatrix.createMany({
              data: matrixData as any,
            });
          }
        }
      }
    }

    return this.findPlanById(id, companyId);
  }

  async deletePlan(id: string, companyId: string) {
    const plan = await this.findPlanById(id, companyId);

    if (plan.isActive) {
      throw new BadRequestException('Cannot delete active plan. Deactivate it first.');
    }

    // Eliminar en cascada (las relaciones están configuradas con onDelete: Cascade)
    await this.prisma.maintenancePlan.delete({
      where: { id },
    });

    return { message: 'Plan deleted successfully' };
  }

  async activatePlan(id: string, companyId: string) {
    await this.findPlanById(id, companyId);

    // NOTA: Ya no se desactivan otros planes automáticamente.
    // Se permite tener múltiples planes activos por tipo de vehículo.

    // Activar este plan
    return this.prisma.maintenancePlan.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async deactivatePlan(id: string, companyId: string) {
    await this.findPlanById(id, companyId);

    return this.prisma.maintenancePlan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async duplicatePlan(id: string, companyId: string, newName?: string) {
    const originalPlan = await this.findPlanById(id, companyId);

    // Ordenar intervalos por sequenceOrder
    const oldIntervals = [...originalPlan.intervals].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    // Crear plan sin actividades primero (para obtener los nuevos IDs de intervalos)
    const duplicatedPlan = await this.createPlan(
      {
        name: newName || `${originalPlan.name} (Copia)`,
        description: originalPlan.description || undefined,
        vehicleType: originalPlan.vehicleType || undefined,
        isActive: false, // La copia se crea inactiva
        intervals: oldIntervals.map((i) => ({
          hours: Number(i.hours),
          kilometers: Number(i.kilometers),
          sequenceOrder: i.sequenceOrder,
        })),
        activities: [], // Crear actividades después para poder mapear correctamente
      },
      companyId,
    );

    // Obtener los nuevos intervalos creados
    const newIntervals = await this.prisma.maintenanceInterval.findMany({
      where: { planId: duplicatedPlan.id },
      orderBy: { sequenceOrder: 'asc' },
    });

    // Crear un mapa de sequenceOrder a nuevo ID de intervalo
    const intervalMap = new Map<number, string>();
    oldIntervals.forEach((oldInterval, index) => {
      if (index < newIntervals.length) {
        intervalMap.set(oldInterval.sequenceOrder, newIntervals[index].id);
      }
    });

    // Crear actividades y matriz
    for (const originalActivity of originalPlan.activities) {
      // Crear actividad
      const newActivity = await this.prisma.maintenanceActivity.create({
        data: {
          planId: duplicatedPlan.id,
          code: originalActivity.code,
          description: originalActivity.description,
          category: originalActivity.category || undefined,
          isActive: true,
        },
      });

      // Crear matriz de aplicación mapeando por sequenceOrder
      const matrixEntries = originalActivity.activityMatrix
        ?.filter((m) => m.applies)
        .map((m) => {
          const oldInterval = oldIntervals.find((i) => i.id === m.intervalId);
          if (oldInterval) {
            const newIntervalId = intervalMap.get(oldInterval.sequenceOrder);
            if (newIntervalId) {
              return {
                activityId: newActivity.id,
                intervalId: newIntervalId,
                applies: true,
              };
            }
          }
          return null;
        })
        .filter((m) => m !== null) || [];

      if (matrixEntries.length > 0) {
        await this.prisma.activityIntervalMatrix.createMany({
          data: matrixEntries as any,
        });
      }
    }

    return this.findPlanById(duplicatedPlan.id, companyId);
  }
}
