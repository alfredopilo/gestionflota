import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    // Log del error completo (solo en desarrollo o para debugging)
    if (status >= 500) {
      this.logger.error(
        `Error ${status}: ${JSON.stringify(message)}`,
        exception instanceof Error ? exception.stack : '',
        `${request.method} ${request.url}`,
      );
    } else {
      // Para errores 4xx, solo log de warning
      this.logger.warn(
        `Client error ${status}: ${JSON.stringify(message)} - ${request.method} ${request.url}`,
      );
    }

    const errorResponse =
      typeof message === 'string'
        ? { message }
        : message;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...errorResponse,
    });
  }
}

