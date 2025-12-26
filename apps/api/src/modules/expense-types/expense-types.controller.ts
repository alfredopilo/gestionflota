import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ExpenseTypesService } from './expense-types.service';
import { CreateExpenseTypeDto } from './dto/create-expense-type.dto';
import { UpdateExpenseTypeDto } from './dto/update-expense-type.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Expense Types')
@ApiBearerAuth()
@Controller('expense-types')
@Roles('GERENCIA', 'SUPERVISOR_FLOTA')
export class ExpenseTypesController {
  constructor(private readonly expenseTypesService: ExpenseTypesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear tipo de gasto' })
  create(@Body() createExpenseTypeDto: CreateExpenseTypeDto, @CurrentUser() user: any) {
    return this.expenseTypesService.create(createExpenseTypeDto, user.companyId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar tipos de gastos' })
  findAll(
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('activeOnly') activeOnly: string,
    @CurrentUser() user: any,
  ) {
    return this.expenseTypesService.findAll(
      user.companyId,
      parseInt(page) || 1,
      parseInt(limit) || 100,
      activeOnly === 'true',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener tipo de gasto por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.expenseTypesService.findOne(id, user.companyId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar tipo de gasto' })
  update(
    @Param('id') id: string,
    @Body() updateExpenseTypeDto: UpdateExpenseTypeDto,
    @CurrentUser() user: any,
  ) {
    return this.expenseTypesService.update(id, updateExpenseTypeDto, user.companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar tipo de gasto' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.expenseTypesService.remove(id, user.companyId);
  }
}

