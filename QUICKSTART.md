# 🚀 Guía de Inicio Rápido - Nexus

## Paso 1: Configurar MongoDB Atlas

1. Crear cuenta en [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crear cluster gratuito (M0)
3. Crear usuario de base de datos
4. Whitelist IP: `0.0.0.0/0` (o IPs específicas)
5. Copiar string de conexión

## Paso 2: Configurar Auth0

1. Crear cuenta en [Auth0](https://auth0.com)
2. Crear aplicación "Regular Web Application"
3. Configurar:
   - **Allowed Callback URLs**: `http://localhost:3000/callback`
   - **Allowed Logout URLs**: `http://localhost:3000`
   - **Allowed Web Origins**: `http://localhost:3000`
4. En "APIs" → Create API:
   - Name: Nexus API
   - Identifier: `https://api.nexus.uy`
5. En "Permissions" agregar:
   - `create:incident`
   - `validate:incident`
6. Copiar Domain, Client ID, Client Secret

## Paso 3: Configurar e Iniciar la Aplicación

```bash
# Navegar a directorio API
cd api

# Copiar y configurar .env
cp .env.example .env

# Editar .env con tus credenciales:
# - MONGO_URI (de Atlas)
# - AUTH0_DOMAIN, AUTH0_CLIENT_ID, AUTH0_CLIENT_SECRET
# - SESSION_SECRET (generar con: openssl rand -base64 32)
# - JWT_SIGNING_KEY (generar con: openssl rand -base64 32)

# Instalar dependencias
npm install

# Crear directorio logs
mkdir logs

# Iniciar en modo desarrollo
npm run dev

# Deberías ver:
# ✓ MongoDB connected successfully
# ✓ Server running on port 3000
```

**Probar Aplicación**:
```bash
# Health check
curl http://localhost:3000/health

# Abrir en navegador
open http://localhost:3000
```

## Paso 4: Verificar Funcionamiento

### Backend
- [ ] `/health` retorna `{"status":"ok"}`
- [ ] MongoDB conectado
- [ ] No errores en `logs/combined.log`

### Frontend
- [ ] Página principal carga (`http://localhost:3000`)
- [ ] Mapa se visualiza (MapLibre GL)
- [ ] No errores en consola del navegador

### Integración
- [ ] WebSocket conecta (revisar console: "WebSocket connected")
- [ ] Filtros de incidentes funcionan
- [ ] Login muestra modal de Auth0

## Paso 5: Crear Primer Incidente (Testing)

### Con Postman/cURL:

```bash
# 1. Obtener token de usuario (Auth0)
# Ir a Auth0 Dashboard → Applications → Your App → Quick Start
# Usar "Test" tab para obtener un token

# 2. Crear incidente
curl -X POST http://localhost:3000/api/map/incidents \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "hurto",
    "severity": 3,
    "location": {
      "type": "Point",
      "coordinates": [-56.1645, -34.9011]
    },
    "description": "Incidente de prueba en Montevideo"
  }'

# 3. Verificar en mapa
# Recargar http://localhost:3000
# Deberías ver un punto en el mapa
```

## Paso 6: Configurar Ingesta de Noticias (Opcional)

Para que el job de noticias funcione:

```javascript
// En api/src/jobs/newsIngestion.js
// Asegurarse que NEWS_SOURCES tenga URLs válidas de RSS

// Ejecutar manualmente desde api/:
node --loader ./node_modules/dotenv/config.js \
  -e "import('./src/jobs/newsIngestion.js').then(m => m.runNewsIngestion(null).then(console.log))"
```

## Troubleshooting

### Error: "MongoDB connection failed"
- Verificar `MONGO_URI` en `.env`
- Verificar IP whitelisted en MongoDB Atlas
- Probar conexión con MongoDB Compass

### Error: "UnauthorizedError: jwt malformed"
- Verificar `AUTH0_DOMAIN` en `.env` (sin `https://`)
- Verificar token está bien formado
- Revisar logs en Auth0 Dashboard

### Error: "Cannot find module"
- Ejecutar: `npm install`
- Verificar que estás en el directorio `api/`

### Mapa no carga
- Abrir DevTools → Console
- Verificar que MapLibre GL JS se carga
- Verificar red (Network tab) para ver llamadas a API

### Error: "Session not found" o sesión no persiste
- Verificar `SESSION_SECRET` en `.env`
- Si en producción, asegurar `cookie.secure: true` solo con HTTPS

## Estructura del Proyecto

```
api/
├── views/              # Templates EJS
│   ├── centinel.ejs   # Mapa principal
│   ├── news.ejs       # Noticias
│   ├── forum.ejs      # Foro
│   ├── links.ejs      # Enlaces MI
│   └── partials/      # Header/Footer compartidos
├── public/            # Archivos estáticos
│   ├── css/
│   │   └── style.css  # Estilos responsive
│   └── js/
│       └── map.js     # Lógica de MapLibre + Socket.IO
├── src/
│   ├── routes/        # API + Views
│   ├── models/        # Mongoose schemas
│   ├── services/      # Lógica de negocio
│   ├── middleware/    # Auth, rate limit
│   ├── jobs/          # Cron jobs
│   └── utils/         # Logger, helpers
└── server.js          # Entry point
```

## Siguientes Pasos

1. **Configurar S3**: Para subida de fotos (usar Backblaze B2 o AWS S3)
2. **Deploy**: Subir a Fly.io / Render (ver README)
3. **Customizar**: Cambiar colores, logo, textos en `public/css/style.css`
4. **Agregar fuentes de noticias**: Editar `NEWS_SOURCES` en `api/src/jobs/newsIngestion.js`
5. **Testing**: Agregar tests con Mocha/Jest

## Recursos

- [Docs MongoDB](https://www.mongodb.com/docs/)
- [Docs Auth0](https://auth0.com/docs)
- [MapLibre GL Docs](https://maplibre.org/maplibre-gl-js/docs/)
- [EJS Docs](https://ejs.co/)
- [Express Docs](https://expressjs.com/)
- [Socket.IO Docs](https://socket.io/docs/)

---

**¿Problemas?** Abrir issue en GitHub o contactar: soporte@nexus.uy
