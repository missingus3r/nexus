# Instrucciones para crear el archivo .env

El servidor no puede iniciar porque falta el archivo `.env`.

## Crear el archivo .env

Crea un archivo llamado `.env` en la raíz del proyecto con el siguiente contenido:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# MongoDB
MONGO_URI=mongodb://localhost:27017/nexus

# Session
SESSION_SECRET=tu-session-secret-aqui

# CORS
CORS_ORIGIN=http://localhost:3000

# Auth0 Configuration
AUTH0_SECRET=TU_SECRET_ALEATORIO_AQUI
AUTH0_BASE_URL=http://localhost:3000
AUTH0_CLIENT_ID=HetyeLu60pGh5IHRO3CgKattM0i52MvP
AUTH0_ISSUER_BASE_URL=https://dev-prhjewaq2xjvur6a.us.auth0.com

# Admin Configuration
ADMIN_EMAIL=tu-email-admin@ejemplo.com
```

## Generar AUTH0_SECRET

Para generar un secret aleatorio y seguro, ejecuta:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado y reemplaza `TU_SECRET_ALEATORIO_AQUI` en el archivo `.env`.

## Después de crear el archivo

1. Guarda el archivo `.env`
2. Reinicia el servidor: `npm start`
3. Ahora podrás acceder a `/dashboard` después de autenticarte
