import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';

export class CreateInspectionItemDto {
  @ApiProperty()
  @IsString()
  section: string;

  @ApiProperty()
  @IsString()
  itemName: string;

  @ApiProperty({ required: false, enum: ['REVISION', 'MANTENIMIENTO', 'CAMBIO'] })
  @IsOptional()
  @IsEnum(['REVISION', 'MANTENIMIENTO', 'CAMBIO'])
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  observations?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photosUrls?: string[];
}
