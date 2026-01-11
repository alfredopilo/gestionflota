import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum, IsNumber, IsBoolean } from 'class-validator';

export class CreateWorkOrderDto {
  @ApiProperty()
  @IsString()
  vehicleId: string;

  @ApiProperty({ enum: ['PREVENTIVE', 'CORRECTIVE'] })
  @IsEnum(['PREVENTIVE', 'CORRECTIVE'])
  type: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  scheduledDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  odometerAtStart?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  hourmeterAtStart?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  operatorId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  supervisorId?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  workshopId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
