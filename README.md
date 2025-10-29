# Vortex - Plataforma Comunitaria

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-22+-green.svg)

**Vortex** es una plataforma web comunitaria para Uruguay que integra:
- **Centinel**: Mapeo de incidentes de seguridad ciudadana
- **Surlink**: Marketplace multi-categoría
- **Foro**: Espacio de discusión comunitaria

## ✨ Características

- 🗺️ Mapeo interactivo de incidentes con validación comunitaria
- 🔥 Heatmap dinámico de zonas de interés
- 📰 Ingesta automática de noticias de fuentes locales
- 💬 Foro con sistema de hashtags y moderación
- 🏘️ Marketplace integrado (inmuebles, vehículos, educación, finanzas)
- 🔔 Notificaciones en tiempo real
- 💳 Sistema de suscripciones con múltiples planes

## 🚀 Stack Tecnológico

- **Backend**: Node.js + Express
- **Frontend**: EJS Templates
- **Base de datos**: MongoDB Atlas
- **Autenticación**: Auth0
- **Real-time**: Socket.IO
- **Mapas**: MapLibre GL

## 📦 Instalación

### Prerrequisitos

- Node.js 22+
- Cuenta MongoDB Atlas
- Cuenta Auth0

### Configuración

```bash
cd api
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# Desarrollo
npm run dev

# Producción
npm start
```

La aplicación estará disponible en `http://localhost:3000`

## 🏗️ Estructura del Proyecto

```
api/
├── views/          # Templates EJS
├── public/         # Assets estáticos
├── src/
│   ├── routes/     # Rutas API y vistas
│   ├── models/     # Modelos MongoDB
│   ├── services/   # Lógica de negocio
│   ├── middleware/ # Auth y validación
│   └── jobs/       # Tareas programadas
└── server.js       # Punto de entrada
```

## 🎯 Planes de Suscripción

| Plan | Precio | Características |
|------|--------|----------------|
| Free | Gratis | Funcionalidad básica |
| Premium | $9.99/mes | Reportes ilimitados, alertas personalizadas |
| Pro | $19.99/mes | Analytics avanzado, API access |
| Business | $49.99/mes | Listados destacados, soporte prioritario |
| Enterprise | $149.99/mes | API completa, datos históricos ilimitados |

## 🛡️ Seguridad

- Autenticación JWT vía Auth0
- Sanitización de contenido HTML
- Rate limiting en endpoints críticos
- Validación de integridad de archivos
- CORS y headers de seguridad

## 📜 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## ⚖️ Legal & Privacidad

- Cumple con Ley 18.331 de protección de datos (Uruguay)
- Política de privacidad activa
- Moderación de contenido

## 📧 Contacto

- Email: info.vortexlabs@protonmail.com
- Twitter: @vortex_uy

---

**Hecho con ❤️ para la comunidad de LATAM**
