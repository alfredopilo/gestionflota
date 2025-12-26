import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateTripExpenseDto {
  @ApiProperty()
  @IsString()
  expenseTypeId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observation?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;
}

