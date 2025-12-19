import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class GenerateReportDto {
  @ApiProperty({ enum: ['trips', 'maintenance', 'vehicles'] })
  @IsEnum(['trips', 'maintenance', 'vehicles'])
  type: string;

  @ApiProperty({ enum: ['excel', 'pdf'] })
  @IsEnum(['excel', 'pdf'])
  format: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsObject()
  filters?: any;
}
