# Sistema de Control de Flotas, Rutas, Viajes y Mantenimientos

Aplicación web full-stack moderna para gestión integral de flotas vehiculares con módulos de dashboard gerencial, control de viajes diarios, gestión de mantenimientos preventivos basados en intervalos (horas/km), checklist de inspección, y sistema de alertas.

## 🏗️ Arquitectura

- **Frontend**: Next.js 14+ (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: NestJS + TypeScript + Prisma ORM + PostgreSQL
- **Cache/Colas**: Redis + BullMQ
- **Autenticación**: JWT con refresh tokens
- **Validación**: Zod (frontend) + class-validator (backend)

## 📁 Estructura del Proyecto

```
Gestiondeflota/
├── apps/
│   ├── web/                 # Next.js Frontend
│   └── api/                 # NestJS Backend
│       ├── src/
│       │   ├── modules/     # Módulos DDD-lite
│       │   ├── common/      # Guards, decorators, filters
│       │   └── config/      # Configuraciones
│       └── prisma/          # Schema y migrations
├── docs/                    # Documentación fuente (Excel, PDF)
├── docker-compose.yml       # Servicios (postgres, redis, api, web)
└── README.md
```

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+ y npm
- Docker y Docker Compose (recomendado)
- PostgreSQL 15+ (si no usas Docker)
- Redis (opcional, para colas de trabajo)

### Instalación Rápida con Docker

1. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Editar .env con tus valores si es necesario
   ```

2. **Iniciar todos los servicios**:
   ```bash
   docker-compose up -d
   ```

3. **Ejecutar migraciones y seed**:
   ```bash
   docker-compose exec api npm run prisma:migrate
   docker-compose exec api npm run prisma:seed
   ```

4. **Acceder a la aplicación**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Swagger Docs: http://localhost:3001/api/docs
   - **Credenciales**: admin@example.com / admin123

### Instalación Manual

Ver [INSTALLATION.md](INSTALLATION.md) para instrucciones detalladas.

## 📚 Documentación

### API Endpoints

La documentación completa de la API está disponible en `/api/docs` (Swagger) cuando el servidor está corriendo.

### Módulos Principales

- **Dashboard**: KPIs y gráficos gerenciales (disponibilidad, cumplimiento, viajes, km, costos)
- **Vehículos**: CRUD completo, gestión de documentos, historial de mantenimientos
- **Viajes**: Control de viajes diarios con importación Excel y validaciones
- **Mantenimientos**: Plan de mantenimiento basado en intervalos (horas/km), órdenes de trabajo, checklist dinámico
- **Inspecciones**: Checklist tipo PDF estructurado por sistemas (luces, motor, frenos, etc.)
- **Reportes**: Generación de reportes PDF/Excel (viajes, mantenimientos, vehículos)
- **Administración**: Gestión de usuarios, roles y catálogos

### Características Principales

- ✅ Autenticación JWT con refresh tokens
- ✅ RBAC con 5 roles (GERENCIA, JEFE_TALLER, OPERADOR_TALLER, SUPERVISOR_FLOTA, CONDUCTOR)
- ✅ Multi-tenancy preparado (company_id)
- ✅ Importación de plan de mantenimiento desde Excel
- ✅ Importación de viajes diarios desde Excel con preview y validación
- ✅ Motor de cálculo de próximos mantenimientos basado en intervalos
- ✅ Checklist dinámico generado automáticamente según intervalos aplicables
- ✅ Dashboard con KPIs en tiempo real y gráficos
- ✅ Sistema de alertas (mantenimientos próximos, documentos vencidos, vehículos inactivos)
- ✅ Soft delete en entidades críticas
- ✅ Auditoría preparada (audit_logs)

## 🔐 Autenticación

El sistema utiliza JWT con refresh tokens:
- Access token: 15 minutos
- Refresh token: 7 días

### Roles Disponibles

- **GERENCIA**: Acceso completo
- **JEFE_TALLER**: Órdenes de trabajo y mantenimientos
- **OPERADOR_TALLER**: Ejecución de checklists
- **SUPERVISOR_FLOTA**: Vehículos, viajes y rutas
- **CONDUCTOR**: Registro básico de viajes

## 🧪 Testing

```bash
# Backend
cd apps/api
npm run test
npm run test:e2e

# Frontend
cd apps/web
npm run test
```

## 📦 Scripts Disponibles

### Backend
- `npm run start:dev` - Desarrollo con hot reload
- `npm run build` - Compilar para producción
- `npm run start:prod` - Iniciar en producción
- `npm run prisma:migrate` - Ejecutar migraciones
- `npm run prisma:seed` - Poblar datos iniciales

### Frontend
- `npm run dev` - Desarrollo
- `npm run build` - Compilar para producción
- `npm run start` - Iniciar en producción

## 🔧 Configuración

### Variables de Entorno Importantes

- `DATABASE_URL`: URL de conexión a PostgreSQL
- `REDIS_URL`: URL de conexión a Redis
- `JWT_SECRET`: Secreto para firmar tokens JWT
- `JWT_REFRESH_SECRET`: Secreto para refresh tokens
- `NEXT_PUBLIC_API_URL`: URL del backend API

## 📝 Licencia

Este proyecto es privado y de uso interno.

## 👥 Contribuidores

- Equipo de Desarrollo
