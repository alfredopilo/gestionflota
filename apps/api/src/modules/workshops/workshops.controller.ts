import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WorkshopsService } from './workshops.service';
import { CreateWorkshopDto } from './dto/create-workshop.dto';
import { UpdateWorkshopDto } from './dto/update-workshop.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Workshops')
@ApiBearerAuth()
@Controller('workshops')
export class WorkshopsController {
  constructor(private readonly workshopsService: WorkshopsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear un nuevo taller' })
  @Roles('GERENCIA', 'JEFE_TALLER')
  create(@Body() createWorkshopDto: CreateWorkshopDto, @CurrentUser() user: any) {
    return this.workshopsService.create(createWorkshopDto, user.companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos los talleres activos' })
  findAll(@CurrentUser() user: any) {
    return this.workshopsService.findAll(user.companyId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un taller por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workshopsService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar un taller' })
  @Roles('GERENCIA', 'JEFE_TALLER')
  update(
    @Param('id') id: string,
    @Body() updateWorkshopDto: UpdateWorkshopDto,
    @CurrentUser() user: any,
  ) {
    return this.workshopsService.update(id, updateWorkshopDto, user.companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar un taller' })
  @Roles('GERENCIA', 'JEFE_TALLER')
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.workshopsService.remove(id, user.companyId);
  }
}
