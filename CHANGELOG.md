# Changelog

## [1.0.0] - 2025-12-17

### Implementado

#### Backend (NestJS)
- ✅ Arquitectura modular con DDD-lite
- ✅ Autenticación JWT con refresh tokens
- ✅ RBAC con 5 roles y guards
- ✅ Prisma ORM con PostgreSQL
- ✅ Módulo de vehículos (CRUD + documentos)
- ✅ Módulo de viajes diarios (CRUD + validaciones)
- ✅ Módulo de mantenimientos (plan + órdenes de trabajo)
- ✅ Motor de cálculo de próximos mantenimientos por intervalos
- ✅ Checklist dinámico basado en actividades aplicables
- ✅ Módulo de inspecciones (checklist tipo PDF)
- ✅ Dashboard con KPIs y gráficos
- ✅ Importadores Excel (plan mantenimiento + viajes)
- ✅ Generación de reportes PDF/Excel
- ✅ Módulo de administración (usuarios, roles, catálogos)
- ✅ Swagger/OpenAPI documentation
- ✅ Soft delete y auditoría preparada
- ✅ Multi-tenancy preparado

#### Frontend (Next.js)
- ✅ Next.js 14 con App Router
- ✅ TypeScript + Tailwind CSS
- ✅ Configuración básica de shadcn/ui
- ✅ Página de login
- ✅ Dashboard con KPIs
- ✅ Página de vehículos
- ✅ Cliente API con interceptors

#### DevOps
- ✅ Docker Compose con todos los servicios
- ✅ Dockerfiles para backend y frontend
- ✅ Seeds de base de datos (roles, usuario admin)
- ✅ README y documentación de instalación

### Próximas Mejoras (v1.1)

- [ ] Notificaciones en tiempo real (WebSockets)
- [ ] Optimizaciones de performance
- [ ] Tests E2E completos
- [ ] Más componentes de UI (tablas, formularios, wizards)
- [ ] Gráficos interactivos con Recharts
- [ ] Exportación avanzada de reportes
- [ ] Integración con Keycloak (opcional)
