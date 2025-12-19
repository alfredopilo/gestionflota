import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RoutesService } from './routes.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Routes')
@ApiBearerAuth()
@Controller('routes')
@Roles('GERENCIA', 'SUPERVISOR_FLOTA')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear ruta' })
  create(@Body() createRouteDto: CreateRouteDto, @CurrentUser() user: any) {
    return this.routesService.create(createRouteDto, user.companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar rutas' })
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: any,
  ) {
    return this.routesService.findAll(
      user.companyId,
      parseInt(page) || 1,
      parseInt(limit) || 10,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener ruta por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.routesService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar ruta' })
  update(@Param('id') id: string, @Body() updateRouteDto: UpdateRouteDto, @CurrentUser() user: any) {
    return this.routesService.update(id, updateRouteDto, user.companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar ruta' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.routesService.remove(id, user.companyId);
  }
}
