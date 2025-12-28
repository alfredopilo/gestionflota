import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { RouteFixedExpenseItemDto } from './route-fixed-expense-item.dto';

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

  @ApiProperty({ required: false, type: [RouteFixedExpenseItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RouteFixedExpenseItemDto)
  fixedExpenses?: RouteFixedExpenseItemDto[];
}
