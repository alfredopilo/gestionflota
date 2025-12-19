# Guía de Instalación - Sistema de Control de Flotas

## Requisitos Previos

- Node.js 18+ y npm
- PostgreSQL 15+ (o usar Docker)
- Redis (opcional, para colas de trabajo)
- Docker y Docker Compose (recomendado)

## Instalación Paso a Paso

### Opción 1: Con Docker Compose (Recomendado)

1. **Clonar o navegar al directorio del proyecto**:
   ```bash
   cd Gestiondeflota
   ```

2. **Configurar variables de entorno**:
   ```bash
   cp .env.example .env
   # Editar .env con tus valores
   ```

3. **Iniciar todos los servicios**:
   ```bash
   docker-compose up -d
   ```

4. **Ejecutar migraciones y seed**:
   ```bash
   docker-compose exec api npm run prisma:migrate
   docker-compose exec api npm run prisma:seed
   ```

5. **Acceder a la aplicación**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Swagger: http://localhost:3001/api/docs

### Opción 2: Instalación Manual

#### Backend

1. **Navegar al directorio del backend**:
   ```bash
   cd apps/api
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar base de datos**:
   - Crear base de datos PostgreSQL: `gestiondeflota`
   - Configurar `DATABASE_URL` en `.env`

4. **Ejecutar migraciones**:
   ```bash
   npx prisma generate
   npx prisma migrate dev
   npx prisma db seed
   ```

5. **Iniciar servidor de desarrollo**:
   ```bash
   npm run start:dev
   ```

#### Frontend

1. **Navegar al directorio del frontend**:
   ```bash
   cd apps/web
   ```

2. **Instalar dependencias**:
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:
   - Crear `.env.local` con `NEXT_PUBLIC_API_URL=http://localhost:3001`

4. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```

## Credenciales por Defecto

Después de ejecutar el seed, puedes iniciar sesión con:

- **Email**: admin@example.com
- **Contraseña**: admin123

## Estructura del Proyecto

```
Gestiondeflota/
├── apps/
│   ├── api/          # Backend NestJS
│   └── web/          # Frontend Next.js
├── docs/             # Documentación fuente (Excel, PDF)
├── docker-compose.yml
└── README.md
```

## Comandos Útiles

### Backend
- `npm run start:dev` - Desarrollo con hot reload
- `npm run build` - Compilar para producción
- `npm run prisma:studio` - Abrir Prisma Studio (GUI para DB)
- `npm run test` - Ejecutar tests

### Frontend
- `npm run dev` - Desarrollo
- `npm run build` - Compilar para producción
- `npm run start` - Iniciar en producción

## Solución de Problemas

### Error de conexión a la base de datos
- Verificar que PostgreSQL esté corriendo
- Verificar `DATABASE_URL` en `.env`
- Verificar que la base de datos exista

### Error de migraciones
- Ejecutar `npx prisma migrate reset` (¡CUIDADO: elimina datos!)
- O `npx prisma migrate dev` para crear nuevas migraciones

### Puerto ya en uso
- Cambiar puertos en `.env` o `docker-compose.yml`
- O detener procesos que usen los puertos 3000, 3001, 5432, 6379

## Próximos Pasos

1. Importar plan de mantenimiento desde Excel (`/maintenance/plan/import`)
2. Importar viajes diarios desde Excel (`/trips/import/preview`)
3. Crear vehículos y conductores
4. Configurar usuarios y roles según necesidad
