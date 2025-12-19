import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class CreateVehicleDocumentDto {
  @ApiProperty({ enum: ['MATRICULA', 'REVISION', 'PERMISO', 'SEGURO'] })
  @IsEnum(['MATRICULA', 'REVISION', 'PERMISO', 'SEGURO'])
  documentType: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  number?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  issueDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
