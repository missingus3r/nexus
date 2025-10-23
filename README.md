# Nexus - Plataforma de Seguridad Ciudadana

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-18+-green.svg)

**Nexus** es una plataforma web responsive (mobile-first) para el mapeo en tiempo real de incidentes de seguridad ciudadana en Uruguay.

## 🎯 Características Principales (MVP)

- **Mapa en tiempo real** con incidentes geolocalizados
- **Heatmap dinámico** con scoring por severidad, tiempo y reputación
- **Sistema de validación peer-to-peer** de reportes
- **Ingesta automática** de noticias geolocalizadas (RSS/HTML)
- **Foro comunitario** integrado con Reddit
- **Enlaces oficiales** a datos del Ministerio del Interior
- **NEXUS Surlink** como hub minimalista para propiedades, centros de estudio y autos
- **Autenticación Auth0** con roles (anónimo, usuario, moderador, admin)

## 🏗️ Arquitectura

### Stack Completo (Node.js + EJS)
- **Backend**: Express + Socket.IO
- **Frontend**: EJS (templates embebidos)
- **Base de datos**: MongoDB Atlas
- **Autenticación**: Auth0 JWT + express-session
- **Cache**: MongoDB (caché de geocodificación)
- **Storage**: S3-compatible (Backblaze B2)
- **Mapas**: MapLibre GL (OpenStreetMap)

### Stack Tecnológico
```
├── api/                          # Aplicación Node.js completa
│   ├── views/                    # Templates EJS
│   │   ├── map.ejs              # Página principal
│   │   ├── news.ejs             # Noticias
│   │   ├── forum.ejs            # Foro
│   │   ├── surlink.ejs          # Agregador Surlink (casas, academy, autos)
│   │   └── partials/            # Header/Footer
│   ├── public/                   # Estáticos (CSS/JS)
│   │   ├── css/style.css        # Estilos mobile-first
│   │   ├── css/surlink.css      # UI específica de Surlink
│   │   ├── js/map.js            # Lógica del mapa
│   │   └── js/surlink.js        # Lógica del agregador Surlink
│   ├── src/
│   │   ├── routes/              # API + Views
│   │   ├── models/              # Mongoose
│   │   ├── services/            # Lógica de negocio
│   │   ├── middleware/          # Auth, rate limit
│   │   └── jobs/                # Cron (noticias)
│   └── server.js                # Entry point
│
└── Servicios Externos
    ├── MongoDB Atlas (M0/M10)
    ├── Auth0 (autenticación)
    ├── S3 / Backblaze B2 (media)
    └── Nominatim (geocoding)
```

## 📦 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- MongoDB Atlas cuenta
- Auth0 cuenta

### Instalación y Ejecución

```bash
cd api
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Crear directorio de logs
mkdir -p logs

# Desarrollo (con recarga automática)
npm run dev

# Producción
npm start

# La aplicación estará en http://localhost:3000
# - Frontend: http://localhost:3000
# - API: http://localhost:3000/api/*
```

## 🧭 Nexus Surlink

- Disponible en `/surlink` desde el header principal (branding actualizado a **NEXUS Surlink**).
- Tres verticales unificadas con un motor de búsqueda mobile-first:
  - **Surlink Casas**: viviendas, terrenos, proyectos en pozo, containers y steel framing.
  - **Surlink Academy**: universidades y centros de estudio cargados por admin, con planes/costos.
  - **Surlink Autos**: autos, camionetas, SUVs y movilidad ligera.
- Navegación anónima habilitada. El registro se requiere únicamente para:
  - Marcar favoritos (`likes`) y construir una lista personal.
  - Comentar en publicaciones de **Casas** y **Autos** (Academy solo admite favoritos).
- Resultados ordenados por destacados, vistas y fecha; filtros dinámicos generados desde la API.

### Cargar publicaciones

- Los administradores pueden crear listados utilizando `POST /api/surlink/listings` (ver endpoints abajo).
- Se incluye un bloque en el panel de administración (`/admin`) para:
  1. Programar el scrapping futuro de **Casas** y **Autos** (`/api/admin/surlink/schedule`).
  2. Depurar listados caducados (`/api/admin/surlink/cleanup`), que archiva publicaciones con `expiresAt` vencido.

Ejemplo rápido para crear un listado de Surlink Casas:

```bash
curl -X POST http://localhost:3000/api/surlink/listings \
  -H "Content-Type: application/json" \
  -b "connect.sid=<cookie_admin>" \
  -d '{
    "category": "casas",
    "title": "Casa moderna en Pocitos",
    "description": "Proyecto en pozo con amenities, financiación en 36 cuotas.",
    "summary": "Monoambientes y 1 dormitorio a pasos de la rambla.",
    "price": { "amount": 165000, "currency": "USD" },
    "location": { "city": "Montevideo", "neighborhood": "Pocitos" },
    "attributes": {
      "tipo": "Apartamento",
      "operacion": "Venta",
      "dormitorios": 1,
      "m2": 42
    },
    "tags": ["amenities", "estreno"]
  }'
```

## 🚀 Despliegue

### Fly.io / Render (Recomendado)

**Dockerfile**:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY api/package*.json ./
RUN npm ci --production
COPY api/ ./
EXPOSE 3000
CMD ["node", "server.js"]
```

Deploy en Fly.io:
```bash
cd api
fly launch
fly secrets set $(cat ../.env | xargs)
fly deploy
```

Deploy en Render:
1. Conectar repo de GitHub
2. Build Command: `cd api && npm install`
3. Start Command: `cd api && node server.js`
4. Agregar variables de entorno desde .env

## 🔐 Configuración de Auth0

1. Crear aplicación "Regular Web Application" en Auth0
2. Configurar Callback URLs: `http://localhost:8080/callback`, `https://yourdomain.com/callback`
3. Habilitar scopes personalizados:
   - `create:incident`
   - `validate:incident`
4. Configurar roles: `user`, `moderator`, `admin`
5. Copiar Domain, Client ID, Client Secret a `.env`

## 📊 Algoritmo de Heatmap

El scoring se calcula con:

```javascript
score = decay × severity × (0.5 + 0.5 × reputation)

donde:
- decay = exp(-ln(2) × age_days / 7)  // half-life 7 días
- severity = 1-5
- reputation = 0-100 (normalizado a 0-1)
```

**Umbrales de color** (basados en percentiles):
- 🟢 Verde: p0-p50
- 🟡 Amarillo: p50-p75
- 🔴 Rojo: p75-p100

## 🛠️ API Endpoints

### Autenticación
- `POST /api/auth/guest-token` - Generar JWT de invitado

### Incidentes
- `GET /api/map/incidents?bbox=lon1,lat1,lon2,lat2` - Listar incidentes
- `POST /api/map/incidents` - Crear incidente (requiere auth)
- `POST /api/map/incidents/:id/validate` - Validar incidente

### Heatmap
- `GET /api/heatmap?bbox=lon1,lat1,lon2,lat2` - Obtener celdas de heatmap

### Noticias
- `GET /api/news?bbox=...&from=...&to=...` - Listar noticias geolocalizadas

### Enlaces
- `GET /api/links/mi` - URLs oficiales del Ministerio del Interior

### Surlink
- `GET /api/surlink/listings?category=casas|autos|academy&search=...` - Búsqueda y paginado de publicaciones.
- `GET /api/surlink/listings/:id` - Detalle completo (comentarios, métricas, contacto).
- `POST /api/surlink/listings` - Crear publicación (solo admin).
- `PATCH /api/surlink/listings/:id` - Editar publicación (solo admin).
- `DELETE /api/surlink/listings/:id` - Archivar publicación (solo admin).
- `POST /api/surlink/listings/:id/like` - Guardar/Quitar de favoritos (usuario autenticado).
- `GET /api/surlink/favorites` - Favoritos del usuario autenticado.
- `POST /api/surlink/listings/:id/comments` - Crear comentario (casas/autos, usuario autenticado).
- `DELETE /api/surlink/listings/:id/comments/:commentId` - Borrar comentario (autor o admin).
- `POST /api/admin/surlink/schedule` - Programar scrapping para Casas/Autos (admin).
- `POST /api/admin/surlink/cleanup` - Archivar listados expirados (admin).

## 🔄 WebSocket Events

**Cliente → Servidor**:
- `subscribe:region` - Suscribirse a región del mapa
- `unsubscribe:region` - Cancelar suscripción

**Servidor → Cliente**:
- `new-incident` - Nuevo incidente reportado
- `incident-validated` - Incidente validado
- `heatmap-updated` - Heatmap actualizado
- `news-added` - Nueva noticia agregada

## 📝 Jobs Programados

- **News Ingestion**: cada 15 min
- **Heatmap Update**: cada 5 min
- **Cleanup**: diario a las 3 AM

## 🧪 Testing

```bash
# Backend
cd api
npm test

# Frontend (unit tests)
cd web-frontend-jsf
mvn test
```

## 📖 Documentación Adicional

- [API OpenAPI Spec](docs/api-spec.yaml)
- [Algoritmo de Heatmap](docs/heatmap-algorithm.md)
- [Política de Privacidad](docs/privacy-policy.md)
- [Términos de Servicio](docs/terms-of-service.md)

## 🤝 Contribuir

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/amazing-feature`)
3. Commit cambios (`git commit -m 'Add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Abrir Pull Request

## 📜 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## ⚖️ Legal & Privacidad

- Cumple con **Ley 18.331** de protección de datos personales (Uruguay)
- No almacena datos sensibles del MI
- Coordenadas con jitter (~100m) para privacidad
- EXIF stripped de fotos
- Política de moderación activa

## 📧 Contacto

- **Email**: contacto@nexus.uy
- **Twitter**: @nexus_uy
- **Reddit**: r/nexus_uy

---

**Hecho con ❤️ para mejorar la seguridad ciudadana en Uruguay**

# nexus
