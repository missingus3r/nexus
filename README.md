# Austra - Plataforma Comunitaria

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-22+-green.svg)

**Austra** es una plataforma web comunitaria para Uruguay que integra:
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
- **Icons/Logos**: Google Favicons API

## 📦 Instalación

### Prerrequisitos

- Node.js 22+
- Cuenta MongoDB Atlas
- Cuenta Auth0

### Configuración

```bash
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

### Despliegue en Producción

Para desplegar en producción, sigue la guía completa:

```bash
# Verificar configuración de producción
node scripts/check-production-config.js

# Ver checklist completo
cat PRODUCTION_DEPLOYMENT_CHECKLIST.md
```

**IMPORTANTE**: La configuración de Auth0 es crítica para el correcto funcionamiento en producción. Asegúrate de:
- Configurar `AUTH0_BASE_URL` con tu dominio de producción (no localhost)
- Actualizar las Allowed Callback URLs en Auth0 Dashboard
- Ver [docs/AUTH0_PRODUCTION_REDIRECT_FIX.md](docs/AUTH0_PRODUCTION_REDIRECT_FIX.md) para detalles

## 🏗️ Estructura del Proyecto

```
├── views/          # Templates EJS
├── public/         # Assets estáticos
├── src/
│   ├── routes/     # Rutas API y vistas
│   ├── models/     # Modelos MongoDB
│   ├── services/   # Lógica de negocio
│   ├── middleware/ # Auth y validación
│   ├── data/       # Datos estáticos (Surlink)
│   └── jobs/       # Tareas programadas
└── server.js       # Punto de entrada
```

## 🌐 Surlink - Servicios Externos

### Google Favicons API

Surlink utiliza el servicio de Google Favicons para obtener los iconos de sitios web automáticamente. Este servicio es público y gratuito.

**Formato de URL:**
```
https://www.google.com/s2/favicons?domain=DOMINIO&sz=TAMAÑO
```

**Parámetros:**
- `domain`: El dominio del sitio web (ej: `google.com`, `facebook.com`)
- `sz`: Tamaño del ícono en píxeles (soporta: 16, 32, 64, 128, 256)

**Ejemplos de uso:**
```javascript
// Logo de 128x128 píxeles
https://www.google.com/s2/favicons?domain=ort.edu.uy&sz=128

// Logo de 64x64 píxeles
https://www.google.com/s2/favicons?domain=brou.com.uy&sz=64
```

**Ventajas:**
- Servicio gratuito y confiable de Google
- No requiere API key ni autenticación
- Cache automático del lado del servidor
- Fallback automático si no hay favicon disponible
- Alta disponibilidad y velocidad

**Uso en Austra:**
Los sitios estáticos de Surlink (Construcción, Academy, Financial) utilizan este servicio para mostrar los logos de las instituciones de forma automática, sin necesidad de almacenar imágenes localmente.

**Implementación:**
```javascript
// En los archivos de datos (src/data/*.js)
{
  id: 'sitio-ejemplo',
  name: 'Sitio Ejemplo',
  domain: 'ejemplo.com',
  logo: 'https://www.google.com/s2/favicons?domain=ejemplo.com&sz=128',
  // ... otros campos
}
```

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

- Email: info.austra@protonmail.com
- Twitter: @austra_uy

---

**Hecho con ❤️ para la comunidad de LATAM**
