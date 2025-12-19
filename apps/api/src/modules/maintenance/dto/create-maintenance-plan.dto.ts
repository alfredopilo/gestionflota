import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, ValidateNested, IsNumber, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateIntervalDto {
  @ApiProperty()
  @IsNumber()
  @Min(0)
  hours: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  kilometers: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  sequenceOrder?: number;
}

export class CreateActivityDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  intervalIds?: string[];
}

export class CreateMaintenancePlanDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: [CreateIntervalDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateIntervalDto)
  intervals: CreateIntervalDto[];

  @ApiProperty({ type: [CreateActivityDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActivityDto)
  activities: CreateActivityDto[];
}
