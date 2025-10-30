# Auth0 Integration

Esta aplicación integra Auth0 para autenticación de usuarios usando el paquete `express-openid-connect`.

## Configuración

### 1. Variables de Entorno

Crea un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Auth0 Configuration
AUTH0_SECRET=a-long-randomly-generated-string-stored-in-env
AUTH0_BASE_URL=http://localhost:3000
AUTH0_CLIENT_ID=HetyeLu60pGh5IHRO3CgKattM0i52MvP
AUTH0_ISSUER_BASE_URL=https://dev-prhjewaq2xjvur6a.us.auth0.com

# Admin Configuration
ADMIN_EMAIL=tu-email-admin@ejemplo.com
```

**Importante:** El `AUTH0_SECRET` debe ser una cadena larga y aleatoria. Puedes generarla usando:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Configuración en Auth0 Dashboard

En tu aplicación de Auth0, configura:

- **Allowed Callback URLs:** `http://localhost:3000/callback`
- **Allowed Logout URLs:** `http://localhost:3000`
- **Allowed Web Origins:** `http://localhost:3000`

## Rutas Automáticas

El middleware de Auth0 crea automáticamente las siguientes rutas:

- `/login` - Redirige al usuario a Auth0 para iniciar sesión
- `/logout` - Cierra la sesión y redirige al usuario
- `/callback` - Maneja el callback de Auth0 (no acceder directamente)

## Flujo de Autenticación Post-Login

Después del login exitoso con Auth0:

1. **Usuario Admin** (email coincide con `ADMIN_EMAIL` en .env):
   - Se crea o actualiza en la base de datos con rol `admin`
   - Redirección automática a `/admin`

2. **Usuario Regular**:
   - Se crea o actualiza en la base de datos con rol `user`
   - Redirección automática a `/dashboard` (página de bienvenida)
   - El dashboard muestra:
     - Últimas alertas de Centinel
     - Nuevas publicaciones en Surlink
     - Últimas discusiones del foro
     - Notificaciones del usuario (modal)

## Dashboard de Usuario

La página de dashboard (`/dashboard`) es accesible solo para usuarios autenticados y muestra:

### Características:
- **Información del usuario**: Avatar, nombre, email
- **Notificaciones**: Botón con badge que abre modal de notificaciones
- **Resumen de Centinel**: Últimas 10 alertas de seguridad
- **Resumen de Surlink**: Últimas 10 publicaciones
- **Resumen del Foro**: Últimas 10 discusiones

### API Endpoints del Dashboard:
- `GET /dashboard` - Vista del dashboard
- `GET /api/dashboard/data` - Obtiene todos los datos del dashboard
- `PATCH /api/dashboard/notifications/:id/read` - Marca una notificación como leída
- `POST /api/dashboard/notifications/read-all` - Marca todas las notificaciones como leídas

## Ruta de Prueba

Hemos creado una ruta de prueba para verificar la integración:

```
http://localhost:3000/auth-status
```

Esta ruta muestra:
- Estado de autenticación actual
- Información del usuario (si está autenticado)
- Botones para login/logout
- Lista de rutas disponibles

## Uso en el Código

### Verificar Autenticación

En cualquier ruta o middleware:

```javascript
app.get('/protected', (req, res) => {
  if (req.oidc.isAuthenticated()) {
    res.send('Usuario autenticado');
  } else {
    res.redirect('/login');
  }
});
```

### Proteger Rutas

Usa el middleware `requireAuth` del archivo de configuración:

```javascript
import { requireAuth } from './src/config/auth0.js';

app.get('/profile', requireAuth, (req, res) => {
  res.send(`Hola ${req.oidc.user.name}`);
});
```

### Acceder a Información del Usuario

```javascript
app.get('/user-info', (req, res) => {
  if (req.oidc.isAuthenticated()) {
    const user = req.oidc.user;
    res.json({
      name: user.name,
      email: user.email,
      picture: user.picture
    });
  } else {
    res.status(401).json({ error: 'No autenticado' });
  }
});
```

### En Vistas EJS

Las vistas tienen acceso a:

```ejs
<% if (isAuthenticated) { %>
  <p>Bienvenido <%= user.name %></p>
  <a href="/logout">Logout</a>
<% } else { %>
  <a href="/login">Login</a>
<% } %>
```

## Arquitectura

### Archivos Modificados

1. **server.js** - Integración del middleware de Auth0
2. **src/config/auth0.js** - Configuración y middleware de Auth0
3. **.env.example** - Plantilla de variables de entorno

### Middleware

El sistema integra Auth0 con el sistema de autenticación existente basado en sesiones:

```javascript
// Middleware en server.js
app.use((req, res, next) => {
  const oidcUser = req.oidc?.user || null;
  const isOidcAuthenticated = req.oidc?.isAuthenticated() || false;

  // Preferir Auth0 si está autenticado, sino usar sesión
  res.locals.user = isOidcAuthenticated ? oidcUser : (req.session.user || null);
  res.locals.isAuthenticated = isOidcAuthenticated || !!req.session.user;
  res.locals.oidc = req.oidc;
  next();
});
```

## Pruebas

1. Inicia el servidor:
```bash
npm start
```

2. Visita `http://localhost:3000/auth-status`

3. Haz clic en "Login with Auth0"

4. Deberías ser redirigido a Auth0 para autenticarte

5. Después de autenticarte, serás redirigido de vuelta a `/callback` y luego a la página inicial

6. Visita nuevamente `/auth-status` para ver tu información de usuario

## Troubleshooting

### Error: "secret required"
- Asegúrate de tener `AUTH0_SECRET` en tu archivo `.env`

### Error: "issuerBaseURL required"
- Verifica que `AUTH0_ISSUER_BASE_URL` esté configurado correctamente

### Redirección infinita
- Verifica que las URLs de callback estén configuradas correctamente en Auth0 Dashboard

### Usuario no se muestra en vistas
- Verifica que el middleware esté configurado después de `express-session` pero antes de las rutas

## Recursos

- [Auth0 Documentation](https://auth0.com/docs)
- [express-openid-connect GitHub](https://github.com/auth0/express-openid-connect)
- [Auth0 Node.js Quickstart](https://auth0.com/docs/quickstart/webapp/nodejs)
