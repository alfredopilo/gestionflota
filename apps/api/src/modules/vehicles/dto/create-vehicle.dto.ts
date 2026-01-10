import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, IsDateString } from 'class-validator';

export class CreateVehicleDto {
  @ApiProperty()
  @IsString()
  plate: string;

  @ApiProperty()
  @IsString()
  brand: string;

  @ApiProperty()
  @IsString()
  model: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  year?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  vin?: string;

  @ApiProperty()
  @IsString()
  type: string;

  @ApiProperty({ enum: ['CARROCERIA', 'ELEMENTO_ARRASTRE'], default: 'CARROCERIA' })
  @IsEnum(['CARROCERIA', 'ELEMENTO_ARRASTRE'])
  category: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  capacity?: string;

  @ApiProperty({ required: false, enum: ['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'RETIRED'] })
  @IsOptional()
  @IsEnum(['ACTIVE', 'MAINTENANCE', 'INACTIVE', 'RETIRED'])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  odometer?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  hourmeter?: number;

  @ApiProperty({ required: false, description: 'Código del dispositivo GPS' })
  @IsOptional()
  @IsString()
  deviceCode?: string;

  @ApiProperty({ required: false, description: 'ID del plan de mantenimiento asignado' })
  @IsOptional()
  @IsString()
  maintenancePlanId?: string;
}
