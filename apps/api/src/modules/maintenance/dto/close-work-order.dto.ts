import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CloseWorkOrderDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
