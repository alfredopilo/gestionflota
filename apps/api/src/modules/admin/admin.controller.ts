import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, HttpException, BadRequestException, Res, UseInterceptors, UploadedFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AdminService } from './admin.service';
import { UserImporterService } from './importers/user-importer.service';
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
  constructor(
    private readonly adminService: AdminService,
    private readonly userImporterService: UserImporterService,
  ) {}

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

  @Get('users/template')
  @ApiOperation({ summary: 'Descargar plantilla Excel para importar usuarios' })
  async downloadTemplate(@Res() res: Response) {
    const workbook = await this.userImporterService.generateTemplate();
    
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=usuarios_plantilla.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  @Post('users/import')
  @ApiOperation({ summary: 'Importar usuarios desde archivo Excel' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/temp',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `users-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(xlsx|xls)$/)) {
          return cb(new Error('Solo se permiten archivos Excel (.xlsx, .xls)'), false);
        }
        cb(null, true);
      },
    }),
  )
  async importUsers(@UploadedFile() file: Express.Multer.File, @CurrentUser() user: any) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }
    
    const result = await this.userImporterService.importFromExcel(file.path, user.companyId);
    
    // Eliminar archivo temporal
    const fs = require('fs');
    try {
      fs.unlinkSync(file.path);
    } catch (e) {
      console.error('Error al eliminar archivo temporal:', e);
    }
    
    return result;
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
