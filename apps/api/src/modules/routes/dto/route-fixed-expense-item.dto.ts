import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber } from 'class-validator';

export class RouteFixedExpenseItemDto {
  @ApiProperty()
  @IsString()
  expenseTypeId: string;

  @ApiProperty()
  @IsNumber()
  amount: number;
}

