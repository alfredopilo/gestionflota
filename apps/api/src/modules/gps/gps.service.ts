import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import axios from 'axios';

interface RadialTrackingLoginResponse {
  status: number;
  user_api_hash: string;
}

interface RadialTrackingEquipoItem {
  id: number;
  alarm: number;
  name: string;
  online: string;
  time: string;
  timestamp: number;
  acktimestamp: number;
  lat: number;
  lng: number;
  course: number;
  speed: number;
  altitude: number;
  sensors: Array<{
    id: number;
    type: string;
    name: string;
    show_in_popup: number;
    value: string;
    val: string | boolean;
    scale_value: number | null;
    tag_name: string;
  }>;
  services: any[];
}

interface RadialTrackingGroup {
  id: number;
  title: string;
  items: RadialTrackingEquipoItem[];
}

@Injectable()
export class GpsService {
  private readonly logger = new Logger(GpsService.name);
  private readonly API_BASE_URL = 'https://radialtracking.com/apis';

  constructor(private prisma: PrismaService) {}

  async getConfig(companyId: string) {
    const config = await this.prisma.gpsConfiguration.findUnique({
      where: { companyId },
    });

    if (!config) {
      return null;
    }

    // No devolver la contraseña
    return {
      id: config.id,
      email: config.email,
      syncIntervalMinutes: config.syncIntervalMinutes,
      lastSyncAt: config.lastSyncAt,
      lastSyncStatus: config.lastSyncStatus,
      lastSyncError: config.lastSyncError,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  async updateConfig(companyId: string, updateDto: { email?: string; password?: string; syncIntervalMinutes?: number }) {
    const existing = await this.prisma.gpsConfiguration.findUnique({
      where: { companyId },
    });

    const data: any = {};
    if (updateDto.email !== undefined) {
      data.email = updateDto.email;
    }
    if (updateDto.password !== undefined) {
      // Almacenar la contraseña en texto plano (necesaria para la API externa)
      // En producción, considerar usar cifrado simétrico
      data.password = updateDto.password;
    }
    if (updateDto.syncIntervalMinutes !== undefined) {
      data.syncIntervalMinutes = updateDto.syncIntervalMinutes;
    }

    if (existing) {
      return this.prisma.gpsConfiguration.update({
        where: { companyId },
        data,
      });
    } else {
      return this.prisma.gpsConfiguration.create({
        data: {
          ...data,
          companyId,
          syncIntervalMinutes: data.syncIntervalMinutes || 5,
        },
      });
    }
  }

  async login(email: string, password: string): Promise<string> {
    try {
      const response = await axios.get<RadialTrackingLoginResponse>(
        `${this.API_BASE_URL}/login`,
        {
          params: { email, password },
        },
      );

      if (response.data.status !== 1 || !response.data.user_api_hash) {
        throw new BadRequestException('Invalid credentials or API error');
      }

      return response.data.user_api_hash;
    } catch (error: any) {
      this.logger.error(`Error en login GPS: ${error.message}`, error.stack);
      if (error.response?.status === 401 || error.response?.status === 403) {
        throw new BadRequestException('Credenciales inválidas');
      }
      throw new BadRequestException(`Error al conectar con la API GPS: ${error.message}`);
    }
  }

  async getEquipos(token: string): Promise<RadialTrackingGroup[]> {
    try {
      const response = await axios.get<RadialTrackingGroup[]>(
        `${this.API_BASE_URL}/equipos`,
        {
          params: { user_api_hash: token },
        },
      );

      return response.data;
    } catch (error: any) {
      this.logger.error(`Error al obtener equipos GPS: ${error.message}`, error.stack);
      throw new BadRequestException(`Error al obtener datos de equipos: ${error.message}`);
    }
  }

  async syncGPSData(companyId: string): Promise<{ synced: number; errors: number }> {
    const config = await this.prisma.gpsConfiguration.findUnique({
      where: { companyId },
    });

    if (!config) {
      throw new NotFoundException('Configuración GPS no encontrada');
    }

    if (!config.email || !config.password) {
      throw new BadRequestException('Email y contraseña son requeridos');
    }

    let synced = 0;
    let errors = 0;

    try {
      // 1. Login para obtener token
      const token = await this.login(config.email, config.password);

      // 2. Obtener equipos
      const groups = await this.getEquipos(token);

      // 3. Procesar cada grupo y sus items
      for (const group of groups) {
        for (const item of group.items) {
          try {
            // Buscar vehículo por deviceCode (name del equipo)
            const vehicle = await this.prisma.vehicle.findFirst({
              where: {
                companyId,
                deviceCode: item.name,
                deletedAt: null,
              },
            });

            if (!vehicle) {
              this.logger.warn(`Vehículo no encontrado para dispositivo: ${item.name}`);
              errors++;
              continue;
            }

            // Convertir timestamp a DateTime
            const timestamp = new Date(item.timestamp * 1000);

            // Guardar ubicación GPS
            await this.prisma.vehicleGPSLocation.create({
              data: {
                vehicleId: vehicle.id,
                lat: item.lat,
                lng: item.lng,
                speed: item.speed || null,
                course: item.course || null,
                altitude: item.altitude || null,
                timestamp,
                online: item.online,
                sensors: item.sensors || null,
                rawData: item as any,
              },
            });

            synced++;
          } catch (error: any) {
            this.logger.error(`Error al procesar dispositivo ${item.name}: ${error.message}`);
            errors++;
          }
        }
      }

      // Actualizar estado de última sincronización
      await this.prisma.gpsConfiguration.update({
        where: { companyId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: errors === 0 ? 'SUCCESS' : 'PARTIAL',
          lastSyncError: errors > 0 ? `${errors} errores durante la sincronización` : null,
        },
      });

      return { synced, errors };
    } catch (error: any) {
      this.logger.error(`Error en sincronización GPS: ${error.message}`, error.stack);

      // Actualizar estado de error
      await this.prisma.gpsConfiguration.update({
        where: { companyId },
        data: {
          lastSyncAt: new Date(),
          lastSyncStatus: 'ERROR',
          lastSyncError: error.message,
        },
      });

      throw error;
    }
  }

  async getLocations(
    vehicleId: string,
    companyId: string,
    page = 1,
    limit = 50,
    dateFrom?: Date,
    dateTo?: Date,
  ) {
    // Verificar que el vehículo pertenece a la compañía
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        companyId,
        deletedAt: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    // Construir filtro de fechas
    const whereClause: any = { vehicleId };
    if (dateFrom || dateTo) {
      whereClause.timestamp = {};
      if (dateFrom) {
        whereClause.timestamp.gte = dateFrom;
      }
      if (dateTo) {
        // Agregar un día completo para incluir el final del rango
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        whereClause.timestamp.lte = endDate;
      }
    }

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.vehicleGPSLocation.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { timestamp: 'asc' }, // Cambiar a 'asc' para orden cronológico en el mapa
      }),
      this.prisma.vehicleGPSLocation.count({
        where: whereClause,
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

  async getCurrentLocation(vehicleId: string, companyId: string) {
    // Verificar que el vehículo pertenece a la compañía
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        companyId,
        deletedAt: null,
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }

    // Obtener la ubicación más reciente
    const currentLocation = await this.prisma.vehicleGPSLocation.findFirst({
      where: { vehicleId },
      orderBy: { timestamp: 'desc' },
    });

    if (!currentLocation) {
      throw new NotFoundException('No se encontró ubicación GPS para este vehículo');
    }

    return currentLocation;
  }
}
