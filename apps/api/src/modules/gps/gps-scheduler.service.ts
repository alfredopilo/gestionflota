import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../../common/prisma/prisma.service';
import { GpsService } from './gps.service';

@Injectable()
export class GpsSchedulerService implements OnModuleInit {
  private readonly logger = new Logger(GpsSchedulerService.name);
  private readonly JOB_NAME = 'gps-sync-job';
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private prisma: PrismaService,
    private gpsService: GpsService,
  ) {}

  async onModuleInit() {
    // Iniciar sincronización para todas las compañías configuradas
    await this.initializeSchedulers();
  }

  async initializeSchedulers() {
    try {
      // Obtener todas las configuraciones GPS activas
      // Filtrar después de obtener para evitar problemas con tipos null en Prisma
      const allConfigs = await this.prisma.gpsConfiguration.findMany({
        include: {
          company: true,
        },
      });

      // Filtrar configuraciones que tienen email y password
      const configs = allConfigs.filter(
        (config) => config.email !== null && config.password !== null,
      );

      this.logger.log(`Inicializando ${configs.length} schedulers GPS`);

      for (const config of configs) {
        await this.scheduleSync(config.companyId, config.syncIntervalMinutes);
      }
    } catch (error: any) {
      this.logger.error(`Error al inicializar schedulers GPS: ${error.message}`, error.stack);
    }
  }

  async scheduleSync(companyId: string, intervalMinutes: number) {
    try {
      // Eliminar intervalo existente si existe
      const existingInterval = this.syncIntervals.get(companyId);
      if (existingInterval) {
        clearInterval(existingInterval);
        this.syncIntervals.delete(companyId);
      }

      // Crear función de sincronización
      const syncFunction = async () => {
        try {
          this.logger.log(`Ejecutando sincronización GPS para compañía ${companyId}`);
          await this.gpsService.syncGPSData(companyId);
        } catch (error: any) {
          this.logger.error(`Error en sincronización GPS para compañía ${companyId}: ${error.message}`);
        }
      };

      // Ejecutar inmediatamente la primera vez
      await syncFunction();

      // Crear intervalo en milisegundos
      const intervalMs = intervalMinutes * 60 * 1000;
      const interval = setInterval(syncFunction, intervalMs);
      
      this.syncIntervals.set(companyId, interval);

      this.logger.log(`Scheduler GPS configurado para compañía ${companyId} con intervalo de ${intervalMinutes} minutos`);
    } catch (error: any) {
      this.logger.error(`Error al programar sincronización GPS: ${error.message}`, error.stack);
    }
  }

  async rescheduleSync(companyId: string, intervalMinutes: number) {
    await this.scheduleSync(companyId, intervalMinutes);
  }
}
