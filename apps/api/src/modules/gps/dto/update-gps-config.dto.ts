import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsInt, Min } from 'class-validator';

export class UpdateGpsConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiProperty({ required: false, default: 5, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  syncIntervalMinutes?: number;
}
