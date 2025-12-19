import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsArray } from 'class-validator';

export class UpdateWorkOrderItemDto {
  @ApiProperty({ required: false, enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'] })
  @IsOptional()
  @IsEnum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  partsUsed?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  laborHours?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  cost?: number;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  evidenceUrls?: string[];
}
