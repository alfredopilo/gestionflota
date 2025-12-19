import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Crear roles
  const roles = [
    { code: 'GERENCIA', name: 'Gerencia', description: 'Acceso completo al sistema' },
    { code: 'JEFE_TALLER', name: 'Jefe de Taller', description: 'Gestión de órdenes de trabajo y mantenimientos' },
    { code: 'OPERADOR_TALLER', name: 'Operador de Taller', description: 'Ejecución de checklists y registro de actividades' },
    { code: 'SUPERVISOR_FLOTA', name: 'Supervisor de Flota', description: 'Gestión de vehículos, viajes y rutas' },
    { code: 'CONDUCTOR', name: 'Conductor', description: 'Registro básico de viajes e incidentes' },
  ];

  for (const roleData of roles) {
    await prisma.role.upsert({
      where: { code: roleData.code },
      update: {},
      create: roleData,
    });
    console.log(`✅ Role ${roleData.code} creado`);
  }

  // Crear empresa de ejemplo
  const company = await prisma.company.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'TRANSMONSERRATE (LA FABRIL)',
    },
  });
  console.log(`✅ Empresa ${company.name} creada`);

  // Crear usuario admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      companyId: company.id,
      isActive: true,
    },
  });
  console.log(`✅ Usuario admin creado: admin@example.com / admin123`);

  // Asignar rol GERENCIA al admin
  const gerenciaRole = await prisma.role.findUnique({ where: { code: 'GERENCIA' } });
  if (gerenciaRole) {
    await prisma.userRole.upsert({
      where: {
        userId_roleId: {
          userId: adminUser.id,
          roleId: gerenciaRole.id,
        },
      },
      update: {},
      create: {
        userId: adminUser.id,
        roleId: gerenciaRole.id,
      },
    });
    console.log(`✅ Rol GERENCIA asignado al usuario admin`);
  }

  console.log('✨ Seeding completado!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
