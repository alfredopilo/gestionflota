import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, HttpException, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@Roles('GERENCIA')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Listar usuarios' })
  getUsers(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @CurrentUser() user: any,
  ) {
    return this.adminService.getUsers(
      user.companyId,
      parseInt(page) || 1,
      parseInt(limit) || 10,
    );
  }

  @Post('users')
  @ApiOperation({ summary: 'Crear usuario' })
  async createUser(@Body() createUserDto: CreateUserDto, @CurrentUser() user: any) {
    try {
      return await this.adminService.createUser({
        ...createUserDto,
        companyId: user.companyId,
      });
    } catch (error: any) {
      // El servicio ya debería lanzar HttpException apropiado, pero por si acaso:
      if (error instanceof HttpException) {
        throw error;
      }
      // Si no es HttpException, convertir a BadRequestException
      throw new BadRequestException(error.message || 'Error al crear el usuario');
    }
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  getUser(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.getUser(id, user.companyId);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateUser(id, updateUserDto, user.companyId);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Eliminar usuario (soft delete)' })
  deleteUser(@Param('id') id: string, @CurrentUser() user: any) {
    return this.adminService.deleteUser(id, user.companyId);
  }

  @Put('users/:id/roles')
  @ApiOperation({ summary: 'Asignar roles a usuario' })
  updateUserRoles(
    @Param('id') id: string,
    @Body() updateUserRolesDto: UpdateUserRolesDto,
    @CurrentUser() user: any,
  ) {
    return this.adminService.updateUserRoles(id, updateUserRolesDto.roleIds, user.companyId);
  }

  @Get('roles')
  @ApiOperation({ summary: 'Obtener roles disponibles' })
  getRoles() {
    return this.adminService.getRoles();
  }

  @Get('catalogs/:type')
  @ApiOperation({ summary: 'Obtener catálogo' })
  getCatalog(@Param('type') type: string, @CurrentUser() user: any) {
    return this.adminService.getCatalogs(type, user.companyId);
  }
}
