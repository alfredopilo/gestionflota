import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Sistema de Control de Flotas API v1.0';
  }
}
