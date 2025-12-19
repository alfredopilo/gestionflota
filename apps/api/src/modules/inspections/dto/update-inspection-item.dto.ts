import { PartialType } from '@nestjs/swagger';
import { CreateInspectionItemDto } from './create-inspection-item.dto';

export class UpdateInspectionItemDto extends PartialType(CreateInspectionItemDto) {}
