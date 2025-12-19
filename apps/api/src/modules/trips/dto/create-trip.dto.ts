import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsBoolean, IsNumber, IsEnum } from 'class-validator';

export class CreateTripDto {
  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  routeId?: string;

  @ApiProperty()
  @IsString()
  vehicleId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  driver1Id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  driver2Id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  origin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  destination?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  departureTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  arrivalTime?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  kmStart?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  kmEnd?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  kmTotal?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  tripType?: string; // d/a/m/c del Excel

  @ApiProperty({ required: false, enum: ['BAÑERAS', 'CONTENEDORES', 'TANQUEROS'] })
  @IsOptional()
  @IsEnum(['BAÑERAS', 'CONTENEDORES', 'TANQUEROS'])
  loadType?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  returnTrip?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  baseAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  extraAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
