import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { CreateTripExpenseDto } from './dto/create-trip-expense.dto';
import { UpdateTripExpenseDto } from './dto/update-trip-expense.dto';

@Injectable()
export class TripsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Obtiene vehículos disponibles para una fecha y categoría específica
   * Verifica que el vehículo esté ACTIVE y no esté asignado a otro viaje en la misma fecha
   */
  async getAvailableVehicles(companyId: string, date: string, category: 'CARRO' | 'CUERPO_ARRASTRE', excludeTripId?: string) {
    // Convertir fecha a formato Date si es necesario
    let tripDate: Date;
    if (typeof date === 'string' && !date.includes('T')) {
      tripDate = new Date(date + 'T00:00:00.000Z');
    } else {
      tripDate = new Date(date);
    }

    // Obtener vehículos con status ACTIVE y categoría correcta
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        companyId,
        status: 'ACTIVE',
        category,
        deletedAt: null,
      },
      select: {
        id: true,
        plate: true,
        brand: true,
        model: true,
        type: true,
        category: true,
        odometer: true,
      },
    });

    // Obtener IDs de vehículos ya asignados en esa fecha
    const whereClause: any = {
      companyId,
      date: tripDate,
    };

    if (excludeTripId) {
      whereClause.id = { not: excludeTripId };
    }

    const tripsOnDate = await this.prisma.trip.findMany({
      where: whereClause,
      select: {
        vehicleId: true,
        trailerBodyId: true,
      },
    });

    // Crear set de IDs ocupados
    const occupiedIds = new Set<string>();
    tripsOnDate.forEach((trip) => {
      if (trip.vehicleId) occupiedIds.add(trip.vehicleId);
      if (trip.trailerBodyId) occupiedIds.add(trip.trailerBodyId);
    });

    // Filtrar vehículos disponibles
    return vehicles.filter((v) => !occupiedIds.has(v.id));
  }

  async create(createTripDto: CreateTripDto, companyId: string, createdById: string) {
    // Validar disponibilidad del vehículo principal
    const availableVehicles = await this.getAvailableVehicles(companyId, createTripDto.date, 'CARRO');
    const vehicleAvailable = availableVehicles.some((v) => v.id === createTripDto.vehicleId);
    if (!vehicleAvailable) {
      throw new BadRequestException('El vehículo seleccionado no está disponible para la fecha especificada');
    }

    // Validar que el vehículo sea de categoría CARRO
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: createTripDto.vehicleId, companyId },
    });
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    if (vehicle.category !== 'CARRO') {
      throw new BadRequestException('El vehículo principal debe ser de categoría CARRO');
    }

    // Validar disponibilidad del cuerpo de arrastre si se proporciona
    if (createTripDto.trailerBodyId) {
      const availableTrailerBodies = await this.getAvailableVehicles(companyId, createTripDto.date, 'CUERPO_ARRASTRE');
      const trailerAvailable = availableTrailerBodies.some((v) => v.id === createTripDto.trailerBodyId);
      if (!trailerAvailable) {
        throw new BadRequestException('El cuerpo de arrastre seleccionado no está disponible para la fecha especificada');
      }

      // Validar que el cuerpo de arrastre sea de categoría CUERPO_ARRASTRE
      const trailerBody = await this.prisma.vehicle.findFirst({
        where: { id: createTripDto.trailerBodyId, companyId },
      });
      if (!trailerBody) {
        throw new NotFoundException('Cuerpo de arrastre no encontrado');
      }
      if (trailerBody.category !== 'CUERPO_ARRASTRE') {
        throw new BadRequestException('El cuerpo de arrastre debe ser de categoría CUERPO_ARRASTRE');
      }
    }

    // Validar driver1Id si se proporciona
    if (createTripDto.driver1Id) {
      // Verificar que el usuario existe, pertenece a la compañía, está activo y tiene rol CONDUCTOR
      const user = await this.prisma.user.findFirst({
        where: {
          id: createTripDto.driver1Id,
          companyId,
          deletedAt: null,
          isActive: true,
          userRoles: {
            some: {
              role: {
                code: 'CONDUCTOR',
              },
            },
          },
        },
      });
      if (!user) {
        throw new NotFoundException('El conductor especificado no existe, está inactivo o no tiene el rol CONDUCTOR');
      }
    } else if (createTripDto.driver1Id === '') {
      // Convertir string vacío a undefined
      createTripDto.driver1Id = undefined;
    }

    // Validar driver2Id si se proporciona
    if (createTripDto.driver2Id) {
      // Verificar que el usuario existe, pertenece a la compañía, está activo y tiene rol CONDUCTOR
      const user = await this.prisma.user.findFirst({
        where: {
          id: createTripDto.driver2Id,
          companyId,
          deletedAt: null,
          isActive: true,
          userRoles: {
            some: {
              role: {
                code: 'CONDUCTOR',
              },
            },
          },
        },
      });
      if (!user) {
        throw new NotFoundException('El conductor secundario especificado no existe, está inactivo o no tiene el rol CONDUCTOR');
      }
    } else if (createTripDto.driver2Id === '') {
      // Convertir string vacío a undefined
      createTripDto.driver2Id = undefined;
    }

    // Obtener ruta si existe para calcular kmEnd automáticamente
    let route = null;
    if (createTripDto.routeId) {
      route = await this.prisma.route.findFirst({
        where: { id: createTripDto.routeId, companyId },
        select: { id: true, distanceKm: true },
      });
    }

    // Obtener odómetros de vehículos si no se proporciona kmStart
    let kmStart = createTripDto.kmStart;
    if (!kmStart && vehicle) {
      kmStart = Number(vehicle.odometer);
    }

    // Calcular kmEnd automáticamente si hay ruta, kmStart y distanceKm
    let kmEnd = createTripDto.kmEnd;
    if (!kmEnd && route && route.distanceKm && kmStart) {
      kmEnd = Number(kmStart) + Number(route.distanceKm);
    }

    // Validaciones
    if (kmEnd && kmStart && kmEnd < kmStart) {
      throw new BadRequestException('kmEnd debe ser mayor o igual a kmStart');
    }

    // Normalizar fechas de horas: si arrivalTime < departureTime, asumir que arrivalTime es del día siguiente
    let normalizedDepartureTime = createTripDto.departureTime;
    let normalizedArrivalTime = createTripDto.arrivalTime;
    
    if (normalizedDepartureTime && normalizedArrivalTime) {
      const departure = new Date(normalizedDepartureTime);
      const arrival = new Date(normalizedArrivalTime);
      
      // Si la hora de llegada es menor que la de salida, asumir que es del día siguiente
      if (arrival < departure) {
        // Calcular diferencia en milisegundos
        const diffMs = arrival.getTime() - departure.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        // Si la diferencia es negativa y razonable (menos de 24 horas), agregar 1 día
        if (diffHours < 0 && Math.abs(diffHours) < 24) {
          const nextDayArrival = new Date(arrival);
          nextDayArrival.setDate(nextDayArrival.getDate() + 1);
          normalizedArrivalTime = nextDayArrival.toISOString();
        }
      }
    }

    // Calcular kmTotal si no se proporciona
    let kmTotal = createTripDto.kmTotal;
    if (!kmTotal && kmStart && kmEnd) {
      kmTotal = Number(kmEnd) - Number(kmStart);
    }

    // Convertir fecha a formato ISO-8601 DateTime si es necesario
    let date = createTripDto.date;
    if (typeof date === 'string' && !date.includes('T')) {
      // Si la fecha es solo YYYY-MM-DD, convertirla a ISO-8601
      date = new Date(date + 'T00:00:00.000Z').toISOString();
    }

    return this.prisma.$transaction(async (tx) => {
      // Crear el viaje
      const trip = await tx.trip.create({
        data: {
          ...createTripDto,
          date,
          departureTime: normalizedDepartureTime,
          arrivalTime: normalizedArrivalTime,
          kmStart: kmStart ? Number(kmStart) : null,
          kmEnd: kmEnd ? Number(kmEnd) : null,
          kmTotal,
          companyId,
          createdById,
        },
      });

      // Si hay una ruta asociada, buscar y crear los gastos fijos automáticamente
      if (createTripDto.routeId) {
        const routeFixedExpenses = await tx.routeFixedExpense.findMany({
          where: {
            routeId: createTripDto.routeId,
          },
        });

        if (routeFixedExpenses.length > 0) {
          await tx.tripExpense.createMany({
            data: routeFixedExpenses.map((rfe) => ({
              tripId: trip.id,
              expenseTypeId: rfe.expenseTypeId,
              amount: rfe.amount,
            })),
          });
        }
      }

      // Devolver el viaje con todas sus relaciones
      return tx.trip.findUnique({
        where: { id: trip.id },
        include: {
          vehicle: true,
          trailerBody: true,
          driver1: true,
          driver2: true,
          route: true,
          expenses: {
            include: {
              expenseType: true,
            },
          },
        },
      });
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
          trailerBody: true,
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
        trailerBody: true,
        driver1: true,
        driver2: true,
        route: true,
        expenses: {
          include: {
            expenseType: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
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
    const existingTrip = await this.findOne(id, companyId);
    // Convertir Date a string si es necesario
    let tripDate: string;
    if (updateTripDto.date) {
      tripDate = updateTripDto.date;
    } else {
      const existingDate = existingTrip.date as any;
      if (existingDate instanceof Date) {
        tripDate = existingDate.toISOString().split('T')[0];
      } else if (typeof existingDate === 'string') {
        tripDate = existingDate.includes('T') ? existingDate.split('T')[0] : existingDate;
      } else {
        tripDate = String(existingDate).split('T')[0];
      }
    }
    // Asegurar formato YYYY-MM-DD
    if (tripDate.includes('T')) {
      tripDate = tripDate.split('T')[0];
    }

    // Validar disponibilidad del vehículo principal si se actualiza
    if (updateTripDto.vehicleId && updateTripDto.vehicleId !== existingTrip.vehicleId) {
      const availableVehicles = await this.getAvailableVehicles(companyId, tripDate, 'CARRO', id);
      const vehicleAvailable = availableVehicles.some((v) => v.id === updateTripDto.vehicleId);
      if (!vehicleAvailable) {
        throw new BadRequestException('El vehículo seleccionado no está disponible para la fecha especificada');
      }

      const vehicle = await this.prisma.vehicle.findFirst({
        where: { id: updateTripDto.vehicleId, companyId },
      });
      if (!vehicle) {
        throw new NotFoundException('Vehículo no encontrado');
      }
      if (vehicle.category !== 'CARRO') {
        throw new BadRequestException('El vehículo principal debe ser de categoría CARRO');
      }
    }

    // Validar disponibilidad del cuerpo de arrastre si se actualiza
    if (updateTripDto.trailerBodyId !== undefined) {
      if (updateTripDto.trailerBodyId && updateTripDto.trailerBodyId !== existingTrip.trailerBodyId) {
        const availableTrailerBodies = await this.getAvailableVehicles(companyId, tripDate, 'CUERPO_ARRASTRE', id);
        const trailerAvailable = availableTrailerBodies.some((v) => v.id === updateTripDto.trailerBodyId);
        if (!trailerAvailable) {
          throw new BadRequestException('El cuerpo de arrastre seleccionado no está disponible para la fecha especificada');
        }

        const trailerBody = await this.prisma.vehicle.findFirst({
          where: { id: updateTripDto.trailerBodyId, companyId },
        });
        if (!trailerBody) {
          throw new NotFoundException('Cuerpo de arrastre no encontrado');
        }
        if (trailerBody.category !== 'CUERPO_ARRASTRE') {
          throw new BadRequestException('El cuerpo de arrastre debe ser de categoría CUERPO_ARRASTRE');
        }
      }
    }

    // Validar driver1Id si se actualiza
    if (updateTripDto.driver1Id !== undefined) {
      if (updateTripDto.driver1Id && updateTripDto.driver1Id !== existingTrip.driver1Id) {
        // Verificar que el usuario existe, está activo y tiene rol CONDUCTOR
        const user = await this.prisma.user.findFirst({
          where: {
            id: updateTripDto.driver1Id,
            companyId,
            deletedAt: null,
            isActive: true,
            userRoles: {
              some: {
                role: {
                  code: 'CONDUCTOR',
                },
              },
            },
          },
        });
        if (!user) {
          throw new NotFoundException('El conductor especificado no existe, está inactivo o no tiene el rol CONDUCTOR');
        }
      } else if (updateTripDto.driver1Id === '' || updateTripDto.driver1Id === null) {
        // Permitir establecer null o string vacío
        updateTripDto.driver1Id = null;
      }
    }

    // Validar driver2Id si se actualiza
    if (updateTripDto.driver2Id !== undefined) {
      if (updateTripDto.driver2Id && updateTripDto.driver2Id !== existingTrip.driver2Id) {
        // Verificar que el usuario existe, está activo y tiene rol CONDUCTOR
        const user = await this.prisma.user.findFirst({
          where: {
            id: updateTripDto.driver2Id,
            companyId,
            deletedAt: null,
            isActive: true,
            userRoles: {
              some: {
                role: {
                  code: 'CONDUCTOR',
                },
              },
            },
          },
        });
        if (!user) {
          throw new NotFoundException('El conductor secundario especificado no existe, está inactivo o no tiene el rol CONDUCTOR');
        }
      } else if (updateTripDto.driver2Id === '' || updateTripDto.driver2Id === null) {
        // Permitir establecer null o string vacío
        updateTripDto.driver2Id = null;
      }
    }

    // Obtener vehículo actual si no se está actualizando
    const currentVehicleId = updateTripDto.vehicleId || existingTrip.vehicleId;
    const currentVehicle = await this.prisma.vehicle.findFirst({
      where: { id: currentVehicleId, companyId },
      select: { id: true, odometer: true },
    });

    // Obtener cuerpo de arrastre actual si no se está actualizando
    const currentTrailerBodyId = updateTripDto.trailerBodyId !== undefined ? updateTripDto.trailerBodyId : existingTrip.trailerBodyId;
    let currentTrailerBody = null;
    if (currentTrailerBodyId) {
      currentTrailerBody = await this.prisma.vehicle.findFirst({
        where: { id: currentTrailerBodyId, companyId },
        select: { id: true, odometer: true },
      });
    }

    // Obtener ruta si existe para calcular kmEnd automáticamente
    const currentRouteId = updateTripDto.routeId !== undefined ? updateTripDto.routeId : existingTrip.routeId;
    let route = null;
    if (currentRouteId) {
      route = await this.prisma.route.findFirst({
        where: { id: currentRouteId, companyId },
        select: { id: true, distanceKm: true },
      });
    }

    // Obtener kmStart: del DTO, del vehículo actual, o del viaje existente
    let kmStart = updateTripDto.kmStart;
    if (!kmStart) {
      if (currentVehicle && !existingTrip.kmStart) {
        // Si no hay kmStart y hay vehículo, usar su odómetro
        kmStart = Number(currentVehicle.odometer);
      } else {
        kmStart = existingTrip.kmStart ? Number(existingTrip.kmStart) : null;
      }
    }

    // Calcular kmEnd automáticamente si hay ruta, kmStart y distanceKm
    let kmEnd = updateTripDto.kmEnd;
    if (!kmEnd && route && route.distanceKm && kmStart) {
      kmEnd = Number(kmStart) + Number(route.distanceKm);
    } else if (!kmEnd && existingTrip.kmEnd) {
      kmEnd = Number(existingTrip.kmEnd);
    }

    // Validaciones
    if (kmEnd && kmStart && kmEnd < kmStart) {
      throw new BadRequestException('kmEnd debe ser mayor o igual a kmStart');
    }

    // Calcular kmTotal si se actualizan kmStart o kmEnd
    let kmTotal = updateTripDto.kmTotal;
    if (!kmTotal && kmStart && kmEnd) {
      kmTotal = Number(kmEnd) - Number(kmStart);
    } else if (!kmTotal && existingTrip.kmTotal) {
      kmTotal = Number(existingTrip.kmTotal);
    }

    // Normalizar fechas de horas: si arrivalTime < departureTime, asumir que arrivalTime es del día siguiente
    let normalizedDepartureTime = updateTripDto.departureTime !== undefined 
      ? updateTripDto.departureTime 
      : existingTrip.departureTime ? (existingTrip.departureTime as Date).toISOString() : null;
    let normalizedArrivalTime = updateTripDto.arrivalTime !== undefined 
      ? updateTripDto.arrivalTime 
      : existingTrip.arrivalTime ? (existingTrip.arrivalTime as Date).toISOString() : null;
    
    if (normalizedDepartureTime && normalizedArrivalTime) {
      const departure = new Date(normalizedDepartureTime);
      const arrival = new Date(normalizedArrivalTime);
      
      // Si la hora de llegada es menor que la de salida, asumir que es del día siguiente
      if (arrival < departure) {
        // Calcular diferencia en milisegundos
        const diffMs = arrival.getTime() - departure.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        
        // Si la diferencia es negativa y razonable (menos de 24 horas), agregar 1 día
        if (diffHours < 0 && Math.abs(diffHours) < 24) {
          const nextDayArrival = new Date(arrival);
          nextDayArrival.setDate(nextDayArrival.getDate() + 1);
          normalizedArrivalTime = nextDayArrival.toISOString();
        }
      }
    }

    // Detectar cambio de estado a COMPLETED
    const wasCompleted = existingTrip.status === 'COMPLETED';
    const willBeCompleted = updateTripDto.status === 'COMPLETED';
    const isBeingCompleted = !wasCompleted && willBeCompleted;

    // Convertir fecha a formato ISO-8601 DateTime si es necesario
    let date = updateTripDto.date;
    if (date && typeof date === 'string' && !date.includes('T')) {
      // Si la fecha es solo YYYY-MM-DD, convertirla a ISO-8601
      date = new Date(date + 'T00:00:00.000Z').toISOString();
    }

    // Preparar datos de actualización
    const updateData: any = {
      ...updateTripDto,
      date,
      kmStart: kmStart ? Number(kmStart) : null,
      kmEnd: kmEnd ? Number(kmEnd) : null,
      kmTotal,
    };

    // Solo incluir las horas normalizadas si se están actualizando
    if (updateTripDto.departureTime !== undefined) {
      updateData.departureTime = normalizedDepartureTime;
    }
    if (updateTripDto.arrivalTime !== undefined) {
      updateData.arrivalTime = normalizedArrivalTime;
    }

    // Actualizar el viaje
    const updatedTrip = await this.prisma.trip.update({
      where: { id },
      data: updateData,
      include: {
        vehicle: true,
        trailerBody: true,
        driver1: true,
        driver2: true,
        route: true,
      },
    });

    // Si el viaje se está completando y hay kmEnd, actualizar odómetros
    if (isBeingCompleted && kmEnd) {
      // Actualizar odómetro del vehículo
      if (currentVehicle) {
        await this.prisma.vehicle.update({
          where: { id: currentVehicle.id },
          data: { odometer: Number(kmEnd) },
        });
      }

      // Actualizar odómetro del cuerpo de arrastre si existe
      if (currentTrailerBody) {
        await this.prisma.vehicle.update({
          where: { id: currentTrailerBody.id },
          data: { odometer: Number(kmEnd) },
        });
      }
    }

    return updatedTrip;
  }

  async remove(id: string, companyId: string) {
    await this.findOne(id, companyId);
    return this.prisma.trip.delete({
      where: { id },
    });
  }

  async addExpense(tripId: string, createExpenseDto: CreateTripExpenseDto, companyId: string) {
    // Verificar que el viaje existe y pertenece a la compañía
    const trip = await this.prisma.trip.findFirst({
      where: {
        id: tripId,
        companyId,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Verificar que el tipo de gasto existe y pertenece a la compañía
    const expenseType = await this.prisma.expenseType.findFirst({
      where: {
        id: createExpenseDto.expenseTypeId,
        companyId,
        active: true,
      },
    });

    if (!expenseType) {
      throw new NotFoundException('Expense type not found or inactive');
    }

    return this.prisma.tripExpense.create({
      data: {
        tripId,
        expenseTypeId: createExpenseDto.expenseTypeId,
        observation: createExpenseDto.observation,
        amount: createExpenseDto.amount,
      },
      include: {
        expenseType: true,
      },
    });
  }

  async updateExpense(
    tripId: string,
    expenseId: string,
    updateExpenseDto: UpdateTripExpenseDto,
    companyId: string,
  ) {
    // Verificar que el viaje existe y pertenece a la compañía
    const trip = await this.prisma.trip.findFirst({
      where: {
        id: tripId,
        companyId,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Verificar que el gasto existe y pertenece al viaje
    const expense = await this.prisma.tripExpense.findFirst({
      where: {
        id: expenseId,
        tripId,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.tripExpense.update({
      where: { id: expenseId },
      data: updateExpenseDto,
      include: {
        expenseType: true,
      },
    });
  }

  async deleteExpense(tripId: string, expenseId: string, companyId: string) {
    // Verificar que el viaje existe y pertenece a la compañía
    const trip = await this.prisma.trip.findFirst({
      where: {
        id: tripId,
        companyId,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Verificar que el gasto existe y pertenece al viaje
    const expense = await this.prisma.tripExpense.findFirst({
      where: {
        id: expenseId,
        tripId,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.tripExpense.delete({
      where: { id: expenseId },
    });
  }
}
