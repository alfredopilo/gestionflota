import { Controller, Post, Get, Query, Res, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Response } from 'express';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@Roles('GERENCIA', 'SUPERVISOR_FLOTA')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('generate')
  @ApiOperation({ summary: 'Generar reporte (Excel o PDF)' })
  async generateReport(
    @Body() body: GenerateReportDto,
    @CurrentUser() user: any,
    @Res() res: Response,
  ) {
    const { type, format, filters } = body;

    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    if (format === 'excel') {
      buffer = await this.reportsService.generateExcelReport(type, filters || {}, user.companyId);
      filename = `reporte-${type}-${Date.now()}.xlsx`;
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else {
      buffer = await this.reportsService.generatePDFReport(type, filters || {}, user.companyId);
      filename = `reporte-${type}-${Date.now()}.pdf`;
      contentType = 'application/pdf';
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }
}
