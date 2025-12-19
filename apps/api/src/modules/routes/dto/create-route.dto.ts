import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateRouteDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  origin: string;

  @ApiProperty()
  @IsString()
  destination: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  distanceKm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;
}
