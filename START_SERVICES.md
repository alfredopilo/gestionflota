# Guía Rápida para Iniciar los Servicios

## 🚀 Iniciar Todo el Sistema

### Opción A (Recomendado): Todo con Docker (VPS/Producción)

```bash
cp env.example .env
# Edita .env (FRONTEND_URL, NEXT_PUBLIC_API_URL, POSTGRES_PASSWORD, JWT_SECRET, etc.)

docker compose down
docker compose build --no-cache web api
docker compose up -d
docker compose ps
```

Migraciones y seed:
```bash
docker compose exec api npx prisma migrate deploy
docker compose exec api npm run prisma:seed
```

Acceso:
- Frontend: http://localhost:4000
- API: http://localhost:4001
- Swagger: http://localhost:4001/api/docs

### Opción B: Desarrollo local (DB/Redis en Docker + apps local)

1) DB y Redis:
```bash
docker compose up -d postgres redis
```

2) Backend:
```bash
cd apps/api
npm install
npx prisma generate
npx prisma migrate dev
npx prisma db seed
npm run start:dev
```

3) Frontend:
```bash
cd apps/web
npm install
npm run dev
```

## ⚠️ Importante

- Si cambias `NEXT_PUBLIC_API_URL`, debes reconstruir `web` (`docker compose build --no-cache web`) porque Next.js la usa en build.

## 🔧 Si hay Problemas

### Backend no inicia

1. Verifica que PostgreSQL esté corriendo:
   ```bash
   docker ps --filter "name=postgres"
   ```

2. Verifica el archivo `.env` en `apps/api/`:
   ```bash
   cd apps/api
   cat .env
   ```
   Debe tener `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/gestiondeflota`

3. Verifica la conexión a la base de datos:
   ```bash
   cd apps/api
   npx prisma db push
   ```

### Frontend no se conecta al backend

1. Verifica que el backend esté corriendo en puerto 4001
2. Abre la consola del navegador (F12) y revisa errores
3. Verifica que `NEXT_PUBLIC_API_URL` esté configurado

## 📊 Estado de los Servicios

Para verificar rápidamente:
```bash
# Ver todos los servicios
docker ps

# Probar backend
curl http://localhost:4001/api/v1/health
```
