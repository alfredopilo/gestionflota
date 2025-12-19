# Instrucciones para Subir el Proyecto a GitHub

## ⚠️ Problema de Autenticación Detectado

El push falló debido a permisos. Necesitas autenticarte con GitHub.

## Opciones para Autenticarte

### Opción 1: Usar Personal Access Token (Recomendado)

1. **Crear un Personal Access Token en GitHub**:
   - Ve a: https://github.com/settings/tokens
   - Click en "Generate new token (classic)"
   - Selecciona los scopes: `repo` (acceso completo a repositorios)
   - Copia el token generado

2. **Hacer push con el token**:
   ```bash
   cd c:\Cursorcode\Gestiondeflota
   git push -u origin main
   ```
   Cuando te pida usuario/contraseña:
   - Usuario: `alfredopilo`
   - Contraseña: [pega el token aquí]

### Opción 2: Usar SSH (Más Seguro)

1. **Configurar SSH key** (si no tienes una):
   ```bash
   ssh-keygen -t ed25519 -C "tu_email@example.com"
   ```

2. **Agregar la clave SSH a GitHub**:
   - Copia el contenido de `~/.ssh/id_ed25519.pub`
   - Ve a: https://github.com/settings/keys
   - Click "New SSH key" y pega la clave

3. **Cambiar el remote a SSH**:
   ```bash
   cd c:\Cursorcode\Gestiondeflota
   git remote set-url origin git@github.com:alfredopilo/gestionflota.git
   git push -u origin main
   ```

### Opción 3: Usar GitHub CLI

1. **Instalar GitHub CLI** (si no lo tienes):
   ```bash
   winget install GitHub.cli
   ```

2. **Autenticarte**:
   ```bash
   gh auth login
   ```

3. **Hacer push**:
   ```bash
   cd c:\Cursorcode\Gestiondeflota
   git push -u origin main
   ```

## Estado Actual

- ✅ Repositorio Git inicializado
- ✅ Commit inicial creado (64,848 archivos)
- ✅ Branch `main` configurado
- ✅ Remote `origin` configurado
- ⚠️ Falta autenticación para hacer push

## Comandos Ejecutados

```bash
git init
git add .
git commit -m "Initial commit: Sistema de Control de Flotas completo con backend NestJS y frontend Next.js"
git remote add origin https://github.com/alfredopilo/gestionflota.git
git branch -M main
```

## Nota Importante

El commit incluyó `node_modules` y archivos `.env`. Para limpiar esto en el futuro:

1. Actualizar `.gitignore` (ya está actualizado)
2. Remover archivos del índice:
   ```bash
   git rm -r --cached apps/api/node_modules apps/web/node_modules
   git rm --cached .env apps/api/.env
   git commit -m "Remove node_modules and .env files"
   git push
   ```

## Verificar Estado

```bash
git status
git log --oneline
git remote -v
```
