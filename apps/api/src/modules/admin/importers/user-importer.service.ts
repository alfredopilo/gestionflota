import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as bcrypt from 'bcrypt';
import { existsSync } from 'fs';

interface UserImportRow {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
}

export interface ImportResult {
  success: boolean;
  imported: number;
  errors: Array<{ row: number; message: string }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

@Injectable()
export class UserImporterService {
  constructor(private prisma: PrismaService) {}

  async generateTemplate(): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Gestión de Flota';
    workbook.created = new Date();

    // Obtener roles disponibles
    const roles = await this.prisma.role.findMany({
      orderBy: { name: 'asc' },
    });

    // Hoja principal con datos
    const dataSheet = workbook.addWorksheet('Usuarios');

    // Definir columnas
    dataSheet.columns = [
      { header: 'Email *', key: 'email', width: 30 },
      { header: 'Contraseña *', key: 'password', width: 20 },
      { header: 'Nombre *', key: 'firstName', width: 20 },
      { header: 'Apellido *', key: 'lastName', width: 20 },
      { header: 'Teléfono', key: 'phone', width: 20 },
      { header: 'Rol *', key: 'role', width: 20 },
    ];

    // Estilo del encabezado
    dataSheet.getRow(1).font = { bold: true };
    dataSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    dataSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Agregar fila de ejemplo
    dataSheet.addRow({
      email: 'usuario@ejemplo.com',
      password: 'MiContraseña123!',
      firstName: 'Juan',
      lastName: 'Pérez',
      phone: '+593999999999',
      role: roles.length > 0 ? roles[0].code : 'CONDUCTOR',
    });

    // Agregar otra fila de ejemplo
    dataSheet.addRow({
      email: 'operador@ejemplo.com',
      password: 'Operador2024!',
      firstName: 'María',
      lastName: 'García',
      phone: '',
      role: roles.length > 1 ? roles[1].code : 'OPERADOR',
    });

    // Hoja de instrucciones
    const instructionsSheet = workbook.addWorksheet('Instrucciones');
    instructionsSheet.columns = [
      { header: 'Campo', key: 'campo', width: 20 },
      { header: 'Descripción', key: 'descripcion', width: 50 },
      { header: 'Requerido', key: 'requerido', width: 15 },
    ];

    instructionsSheet.getRow(1).font = { bold: true };
    instructionsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    instructionsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    const instructions = [
      { campo: 'Email', descripcion: 'Correo electrónico del usuario (debe ser único)', requerido: 'Sí' },
      { campo: 'Contraseña', descripcion: 'Contraseña del usuario (mínimo 6 caracteres)', requerido: 'Sí' },
      { campo: 'Nombre', descripcion: 'Nombre del usuario', requerido: 'Sí' },
      { campo: 'Apellido', descripcion: 'Apellido del usuario', requerido: 'Sí' },
      { campo: 'Teléfono', descripcion: 'Número de teléfono (opcional)', requerido: 'No' },
      { campo: 'Rol', descripcion: 'Código del rol a asignar', requerido: 'Sí' },
    ];

    instructions.forEach((inst) => instructionsSheet.addRow(inst));

    // Agregar sección de roles disponibles
    instructionsSheet.addRow({});
    instructionsSheet.addRow({ campo: '--- ROLES DISPONIBLES ---', descripcion: '', requerido: '' });
    
    for (const role of roles) {
      instructionsSheet.addRow({
        campo: role.code,
        descripcion: role.name + (role.description ? ` - ${role.description}` : ''),
        requerido: '',
      });
    }

    return workbook;
  }

  async importFromExcel(filePath: string, companyId: string): Promise<ImportResult> {
    if (!existsSync(filePath)) {
      throw new BadRequestException('Archivo no encontrado');
    }

    let workbook: ExcelJS.Workbook;
    try {
      workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
    } catch (error) {
      throw new BadRequestException('Error al leer el archivo Excel. Verifica que el archivo no esté corrupto.');
    }

    const worksheet = workbook.getWorksheet('Usuarios') || workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('No se encontró la hoja de usuarios en el archivo');
    }

    // Obtener roles disponibles
    const roles = await this.prisma.role.findMany();
    const roleMap = new Map(roles.map((r) => [r.code.toUpperCase(), r.id]));

    // Obtener emails existentes
    const existingUsers = await this.prisma.user.findMany({
      where: { companyId, deletedAt: null },
      select: { email: true },
    });
    const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
    const newEmails = new Set<string>();

    const errors: Array<{ row: number; message: string }> = [];
    const usersToCreate: UserImportRow[] = [];

    // Leer filas
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Saltar encabezado

      const email = this.getCellValue(row.getCell(1))?.toLowerCase();
      const password = this.getCellValue(row.getCell(2));
      const firstName = this.getCellValue(row.getCell(3));
      const lastName = this.getCellValue(row.getCell(4));
      const phone = this.getCellValue(row.getCell(5));
      const role = this.getCellValue(row.getCell(6))?.toUpperCase();

      // Validaciones
      if (!email || !password || !firstName || !lastName || !role) {
        if (email || firstName || lastName) {
          errors.push({
            row: rowNumber,
            message: `Campos obligatorios faltantes: ${!email ? 'Email, ' : ''}${!password ? 'Contraseña, ' : ''}${!firstName ? 'Nombre, ' : ''}${!lastName ? 'Apellido, ' : ''}${!role ? 'Rol' : ''}`.replace(/, $/, ''),
          });
        }
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.push({ row: rowNumber, message: `Email inválido: ${email}` });
        return;
      }

      // Validar email duplicado en BD
      if (existingEmails.has(email)) {
        errors.push({ row: rowNumber, message: `El email ya existe en el sistema: ${email}` });
        return;
      }

      // Validar email duplicado en el archivo
      if (newEmails.has(email)) {
        errors.push({ row: rowNumber, message: `El email está duplicado en el archivo: ${email}` });
        return;
      }

      // Validar contraseña
      if (password.length < 6) {
        errors.push({ row: rowNumber, message: `La contraseña debe tener al menos 6 caracteres (fila ${rowNumber})` });
        return;
      }

      // Validar rol
      if (!roleMap.has(role)) {
        errors.push({ row: rowNumber, message: `Rol inválido: ${role}. Roles válidos: ${Array.from(roleMap.keys()).join(', ')}` });
        return;
      }

      newEmails.add(email);
      usersToCreate.push({
        email,
        password,
        firstName,
        lastName,
        phone,
        role,
      });
    });

    // Crear usuarios en la base de datos
    let imported = 0;
    for (const userData of usersToCreate) {
      try {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const roleId = roleMap.get(userData.role.toUpperCase());

        const user = await this.prisma.user.create({
          data: {
            email: userData.email,
            passwordHash: hashedPassword,
            firstName: userData.firstName,
            lastName: userData.lastName,
            phone: userData.phone || null,
            companyId,
          },
        });

        // Asignar rol
        if (roleId) {
          await this.prisma.userRole.create({
            data: {
              userId: user.id,
              roleId,
            },
          });
        }

        imported++;
      } catch (error: any) {
        errors.push({
          row: usersToCreate.indexOf(userData) + 2,
          message: `Error al crear usuario ${userData.email}: ${error.message}`,
        });
      }
    }

    return {
      success: errors.length === 0,
      imported,
      errors,
      summary: {
        total: usersToCreate.length + errors.filter((e) => 
          e.message.includes('Campos obligatorios') || 
          e.message.includes('inválid') || 
          e.message.includes('duplicado') || 
          e.message.includes('ya existe')
        ).length,
        successful: imported,
        failed: errors.length,
      },
    };
  }

  private getCellValue(cell: ExcelJS.Cell): string | undefined {
    if (cell.value === null || cell.value === undefined) return undefined;
    if (typeof cell.value === 'object' && 'text' in cell.value) {
      return (cell.value as any).text?.toString().trim();
    }
    return cell.value.toString().trim();
  }
}
