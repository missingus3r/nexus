# VORTEX - DOCUMENTACIÓN COMPLETA DE FUNCIONALIDADES

## Índice
1. [Autenticación y Gestión de Usuarios](#1-autenticación-y-gestión-de-usuarios)
2. [Centinel - Sistema de Mapeo de Incidentes](#2-centinel---sistema-de-mapeo-de-incidentes)
3. [Sistema de Agregación de Noticias](#3-sistema-de-agregación-de-noticias)
4. [Sistema de Foros (Vortex Forum)](#4-sistema-de-foros-vortex-forum)
5. [Surlink - Sistema de Marketplace](#5-surlink---sistema-de-marketplace)
6. [Panel de Administración](#6-panel-de-administración)
7. [Sistema de Notificaciones](#7-sistema-de-notificaciones)
8. [Precios y Planes](#8-precios-y-planes)
9. [Dashboard de Usuario](#9-dashboard-de-usuario)
10. [Características en Tiempo Real (Socket.IO)](#10-características-en-tiempo-real-socketio)
11. [Middleware y Seguridad](#11-middleware-y-seguridad)
12. [Características Geoespaciales](#12-características-geoespaciales)
13. [Trabajos Programados (Cron)](#13-trabajos-programados-cron)
14. [Modelos de Datos](#14-modelos-de-datos)
15. [Páginas Públicas](#15-páginas-públicas)
16. [Características del Frontend](#16-características-del-frontend)
17. [Rutas API](#17-rutas-api)
18. [Stack Tecnológico](#18-stack-tecnológico)
19. [Funcionalidades Planificadas (Próximamente)](#19-funcionalidades-planificadas-próximamente)
20. [Funcionalidades Eliminadas Recientemente](#20-funcionalidades-eliminadas-recientemente)

---

## 1. AUTENTICACIÓN Y GESTIÓN DE USUARIOS

### Sistema de Autenticación (Integración Auth0)
- **Login/Logout OAuth con Auth0**: Autenticación segura mediante Auth0
- **Generación y verificación de JWT**: Tokens JWT para acceso a la API
- **Tokens de invitado**: Generación de tokens con validez de 24 horas y acceso de solo lectura
- **Gestión de sesiones**: Manejo de sesiones con Express sessions
- **Autenticación dual**: Soporte para OIDC + sesión Express
- **Configuración de cookies personalizada**: Para despliegue en producción
- **Funcionalidad de eliminación de cuenta**: Los usuarios pueden eliminar sus propias cuentas

### Gestión de Perfiles de Usuario
- **Creación de usuario con UID de Auth0**
- **Datos de perfil**: email, nombre, foto, puntaje de reputación
- **Sistema de roles**: user, moderator, admin
- **Seguimiento de última actividad**
- **Contadores de reportes y validaciones**
- **Sistema de baneo**: Baneo temporal con fechas de expiración
- **Sistema de strikes**: Para moderación
- **Gestión de preferencias**: Almacenadas en base de datos

### Sistema de Preferencias de Usuario
- **Gestión de favoritos**: construccion, academy, financial, listings
- **Persistencia del estado de navegación**: categorías activas, pestañas
- **Seguimiento de modales de bienvenida**: Onboarding por funcionalidad
- **Preferencias de tema**: light/dark/auto
- **Migración desde localStorage**: A base de datos

---

## 2. CENTINEL - SISTEMA DE MAPEO DE INCIDENTES

### Reporte de Incidentes
- **Crear reportes de incidentes**: Con tipo, severidad, ubicación, descripción
- **Soporte de subida de fotos**: Hasta 3 fotos por incidente
- **Agregar fotos a incidentes existentes**
- **Tipos de ubicación**: Exacta o aproximada (con radio)
- **Asignación automática de barrio**: Mediante geohashing
- **Seguimiento de reputación del reportero**
- **Prevención de duplicados**: Un reporte pendiente por usuario

### Tipos de Incidentes
- Homicidio
- Rapiña
- Hurto
- Copamiento
- Violencia Doméstica
- Narcotráfico

### Sistema de Validación de Incidentes
- **Validación basada en comunidad**: Voto: +1 válido, -1 inválido
- **Puntaje de confianza por validación**
- **Puntaje de validación ponderado por reputación**
- **Prevención de auto-validación**
- **Prevención de validación duplicada**
- **Transiciones de estado**: pending → verified/rejected
- **Sistema de notificaciones**: Para resultados de validación
- **Recompensas de reputación**: +2 puntos para validadores

### Características de Incidentes
- **Obtener incidentes por bounding box**
- **Filtrar por rango de fechas, tipo, estado**
- **Control de acceso basado en estado**: Los invitados solo ven verificados
- **Formato de salida GeoJSON**
- **Verificación de hash de fotos**: SHA-256
- **Vistas de detalle de incidente**: Con historial de validación

### Sistema de Mapa de Calor
- **Celdas de calor basadas en geohash**: Precisión 7
- **Cálculo dinámico de puntuación**: Basado en incidentes
- **Codificación de color por percentil**
- **Puntuación de intensidad de celda**
- **Consultas por bounding box**
- **Actualizaciones en tiempo real**: Vía Socket.IO
- **Recálculo automático de percentiles**: Trabajo cron

### Integración de Barrios
- **Límites geoespaciales de barrios**: MongoDB
- **Asignación automática de incidente a barrio**
- **Estadísticas de mapa de calor por barrio**
- **Consultas de incidentes específicas por barrio**

---

## 3. SISTEMA DE AGREGACIÓN DE NOTICIAS

### Ingesta de Feeds RSS
- **Múltiples fuentes de noticias**: El Observador, Portal Montevideo, Subrayado
- **Parseo automatizado de RSS**
- **Filtrado por palabras clave de seguridad**: Desde configuración .env
- **Scraping de contenido de artículos**: Con Cheerio
- **Ingesta manual y programada**

### Procesamiento de Lenguaje Natural
- **Extracción de nombres de lugares**: Usando Compromise NLP
- **Clasificación por categorías**: Basada en palabras clave
- **Detección de país**: Soporte multi-idioma
- **Extracción de entidades**: Entidades PLACE
- **Reconocimiento de nombres de lugares uruguayos**

### Geocodificación y Ubicación
- **Integración con API Nominatim**
- **Geocodificación con múltiples intentos**: Lugares del título priorizados
- **Detección de código de país**
- **Almacenamiento de nombre de visualización**
- **Búsqueda de noticias por proximidad**
- **Filtrado por bounding box**

### Características de Noticias
- **Formato de salida GeoJSON**
- **Deduplicación vía hash SHA-256**
- **Puntuación de confianza**
- **Seguimiento de tiempo de procesamiento**
- **Almacenamiento de metadatos**: Tiempo de fetch, método de geocodificación
- **Filtro de país**: Lógica específica para Uruguay
- **Filtrado por categoría**
- **Controles de administrador**: Ingesta manual, eliminación masiva

---

## 4. SISTEMA DE FOROS (VORTEX FORUM)

### Gestión de Hilos
- **Crear hilos**: Con título, contenido, hashtags
- **Tipos de hilos**: Discusión normal o Encuesta/Votación
- **Sistema de hashtags obligatorio**: Lista predefinida
- **Hasta 5 hashtags por hilo**
- **Contenido de texto enriquecido**: Con sanitización HTML
- **Subida de imágenes**: Múltiples imágenes por hilo
- **Soporte de enlaces externos**
- **Fijado de hilos**: Funcionalidad de administrador
- **Edición de hilos**: Ventana de 5 minutos para autores, ilimitado para admin
- **Eliminación de hilos**: Hard/soft delete según respuestas
- **Ordenamiento por popularidad**
- **Soporte de paginación**

### Sistema de Menciones (@)
- **Mencionar usuarios**: Con sintaxis @nombre
- **Autocompletado inteligente**: Búsqueda de usuarios mientras escribes
- **Notificaciones de menciones**: Los usuarios reciben notificación cuando son mencionados
- **Soporte en hilos y comentarios**: Funciona en cualquier contenido del foro
- **Búsqueda en tiempo real**: API de búsqueda de usuarios para autocomplete
- **Navegación por teclado**: Flechas arriba/abajo, Enter para seleccionar, Escape para cancelar
- **Highlighting visual**: Menciones resaltadas en azul
- **Prevención de auto-menciones**: No se notifica a uno mismo
- **Almacenamiento de menciones**: Tracking de usuarios mencionados en BD

### Sistema de Votaciones/Encuestas
- **Crear encuestas**: Tipo especial de hilo con opciones de votación
- **Opciones configurables**: De 2 a 10 opciones por encuesta
- **Votos anónimos**: Los votos individuales son privados, solo se muestran totales
- **Selección simple o múltiple**: Configuración de permitir múltiples votos
- **Fecha de expiración**: Opcional, las encuestas pueden tener vencimiento
- **Resultados en tiempo real**: Porcentajes y contadores actualizados
- **Barras de progreso visuales**: Gráficos de resultados
- **Indicador de voto realizado**: Muestra qué opciones votó el usuario
- **Prevención de voto duplicado**: Un usuario solo puede votar una vez (o cambiar voto)
- **Bloqueo post-expiración**: No se puede votar en encuestas expiradas
- **Badge de expiración**: Indicador visual en encuestas vencidas
- **Estadísticas de votación**: Total de votos y porcentaje por opción

### Sistema de Comentarios
- **Comentarios anidados**: Relaciones padre-hijo
- **Profundidad máxima**: 5 niveles
- **Edición de comentarios**: Ventana de 5 minutos
- **Eliminación de comentarios**: Hard/soft delete según respuestas
- **Soporte de texto enriquecido**
- **Subida de imágenes en comentarios**
- **Encadenamiento de respuestas**
- **Menciones en comentarios**: Soporte completo para @menciones

### Sistema de Hashtags
**Hashtags permitidos**: centinel, surlink, seguridad, inmuebles, autos, educacion, finanzas, transporte, tecnologia, comunidad, ayuda, sugerencia, bug, pregunta, discusion

### Características Sociales
- **Like/unlike de hilos y comentarios**
- **Contadores de likes**: Con actualizaciones en tiempo real
- **Contadores de respuestas**
- **Contadores de vistas**
- **Contadores de votos**: En encuestas
- **Visualización de información del autor**
- **Estado de like específico del usuario**
- **Estado de voto en encuestas**: Muestra selecciones del usuario

### Limitación de Tasa
- **Cooldown de hilos**: Minutos configurables entre publicaciones
- **Límite diario de comentarios**: Por usuario
- **Límites configurables por admin**: Vía ForumSettings
- **Cooldown de votaciones**: Solo se puede votar/cambiar voto según configuración

### Moderación
- **Eliminación permanente por admin**: Con todas las respuestas y votos
- **Eliminación suave por usuario**: Contenido reemplazado con [ELIMINADO]
- **Seguimiento de estado**: active/deleted
- **Gestión de configuración del foro**
- **Moderación de encuestas**: Eliminación de encuestas con todos sus votos

---

## 5. SURLINK - SISTEMA DE MARKETPLACE

### Categorías
- **Casas**: Bienes raíces
- **Autos**: Vehículos
- **Academy**: Educación
- **Financial**: Servicios financieros
- **Construcción**: Construcción

### Gestión de Listados (Casas y Autos)
- **Crear/editar/eliminar listados**: Solo administrador
- **Título, subtítulo, resumen, descripción**
- **Precio con moneda**: USD/UYU
- **Ubicación**: Ciudad, barrio, dirección
- **Atributos personalizados por categoría**
- **Adjuntos multimedia**: Imágenes/videos
- **Sistema de etiquetas**
- **Listados destacados**
- **Fechas de expiración**
- **Gestión de estado**: active/inactive

### Tipos de Casas
Casa, Apartamento, Terreno, Proyecto en Pozo, Container, Steel Framing

### Tipos de Vehículos
Auto, Camioneta, Moto, SUV, Utilitario, Otro

### Sistema de Sitios Estáticos (Academy, Financial, Construcción)
- **Directorio curado de servicios externos**
- **Organización por subcategorías**
- **Información de sitio**: Nombre, URL, dominio, logo, descripción
- **Información de contacto**: Teléfono, email, dirección
- **Listado de programas/servicios**
- **Integración con API Google Favicons**: Para logos
- **Filtrado basado en categorías**

### Subcategorías de Academy
- Universidades
- Institutos
- Idiomas
- Tecnología

### Subcategorías de Financial
- Bancos
- Cooperativas
- Seguros
- Financieras
- Inversión

### Subcategorías de Construcción
- Proyectos
- Contenedores
- Remates

### Características Sociales
- **Like/unlike de listados**
- **Contador de likes por listado**
- **Comentarios en listados**: Solo casas y autos
- **Respuestas a comentarios**: Un nivel de profundidad
- **Gestión de favoritos de usuario**
- **Eliminación de comentarios**: Autor o administrador
- **Likes de sitios**: Academy, financial, construcción
- **Comentarios de sitios**: Con respuestas

### Búsqueda y Filtrado
- **Búsqueda de texto completo**
- **Filtros de rango de precio**
- **Filtros de tipo de propiedad**
- **Filtros de tipo de operación**: Venta/alquiler
- **Filtros de marca/modelo**: Vehículos
- **Filtros de modalidad**: Academy
- **Filtros de tipo de servicio**: Financial
- **Filtros de institución**
- **Filtros de ciudad/ubicación**
- **Paginación**
- **Búsqueda facetada**: Con filtros dinámicos

### Métricas
- **Contadores de vistas**: Con auto-incremento
- **Contadores de likes**
- **Contadores de comentarios**

---

## 6. PANEL DE ADMINISTRACIÓN

### Estadísticas del Dashboard
- **Total de incidentes, usuarios, noticias**
- **Métricas del día**
- **Incidentes por tipo**
- **Incidentes recientes**
- **Estado de conexión MongoDB**
- **Uptime del servidor**

### Gestión de Usuarios
- **Lista de usuarios con paginación**
- **Búsqueda de usuarios**: Por email/nombre
- **Estadísticas de usuarios**: Hoy, semana, mes
- **Distribución de roles de usuario**
- **Seguimiento de usuarios recientes**
- **Bloquear/desbloquear usuarios**
- **Baneos temporales**: Con expiración
- **Eliminar cuentas de usuario**
- **Gráficos de actividad de usuario por día**
- **Protección de admin**: No puede auto-banearse o eliminarse

### Gestión de Noticias
- **Disparador de ingesta manual de noticias**
- **Eliminación masiva de todas las noticias**
- **Estadísticas de noticias**: Por fuente, categoría, ubicación
- **Análisis de tiempo de procesamiento**
- **Gráficos de línea de tiempo**: 30 días
- **Visualización de noticias recientes**
- **Análisis de ubicaciones principales**

### Gestión del Foro
- **Configuración del foro**: Cooldown, límites, restricciones de contenido
- **Estadísticas del foro**: Hilos, comentarios, likes
- **Seguimiento de hilos populares**
- **Top contribuidores**: Por hilos y comentarios
- **Gráficos de actividad por día**
- **Eliminación de hilos**: Permanente
- **Eliminación de comentarios**: Permanente con respuestas anidadas

### Gestión de Surlink
- **Eliminación masiva**: Por categoría o todo
- **Limpieza de listados expirados/obsoletos**
- **Archivar listados inactivos**

### Publicaciones de Admin (Anuncios)
- **Crear anuncios**: Con niveles de prioridad
- **Editar/eliminar anuncios**
- **Publicar/despublicar publicaciones**
- **Notificaciones masivas**: A usuarios
- **Notificaciones en tiempo real**: Vía Socket.IO
- **Contadores de vistas y likes**

### Análisis de Visitas a Páginas
- **Estadísticas generales de visitas**
- **Línea de tiempo de visitas**: 30 días
- **Patrones de visitas por hora**
- **Estadísticas página por página**
- **Seguimiento**: Autenticados vs anónimos
- **Seguimiento de usuario/IP único**
- **Visualización de visitas recientes**
- **Eliminación masiva de visitas**: Todas o últimas 50
- **Privacidad de dirección IP**: Solo mostrada para anónimos

### Gestión de Precios
- **Configuración de tipo de cambio**: USD a UYU
- **Actualizaciones de precios de planes**: Premium, Pro
- **Precios mensuales y anuales**

### Configuración del Sistema
- **Modo mantenimiento**: Por plataforma (Centinel, Forum, Surlink)
- **Mensajes de mantenimiento personalizados**: Por plataforma
- **Endpoint público de estado de mantenimiento**
- **Registro de cambios de configuración**

### Gestión de Trabajos Cron
- **Ver horarios cron actuales**
- **Editar expresiones cron**
- **Habilitar/deshabilitar trabajos cron**
- **Disparador manual**: Para trabajos individuales
- **Validación de expresión cron**
- **Recarga dinámica**: Sin reinicio

### Limpieza Programada
- **Archivado de listados Surlink expirados**: 180 días
- **Disparador de limpieza manual**
- **Reporte de resumen de limpieza**

### Características de Exportación
- **Exportación CSV**: Vía json2csv
- **Exportación Excel**: Vía ExcelJS

---

## 7. SISTEMA DE NOTIFICACIONES

### Tipos de Notificación
- **incident_validated**: Incidente validado
- **admin_post**: Publicación de administrador
- **forum_reply**: Respuesta en foro
- **surlink_comment**: Comentario en Surlink
- **system_alert**: Alerta del sistema

### Características de Notificaciones
- **Notificaciones específicas del usuario**: Por UID
- **Contador de notificaciones no leídas**
- **Marcar como leída**: Individual/todas
- **Soporte de paginación**
- **Filtrar por estado**: Leído/no leído
- **Entrega en tiempo real**: Vía Socket.IO
- **Creación automática**: Para eventos

### Interacciones con Publicaciones de Admin
- **Seguimiento de vistas**
- **Seguimiento de likes**
- **Ordenamiento basado en prioridad**

---

## 8. PRECIOS Y PLANES

### Planes Disponibles
- **Plan Gratuito**: Funcionalidades limitadas
- **Plan Premium**: Precio en USD con conversión a UYU

### Características de Precios
- **Precios mensuales y anuales**
- **Conversión dinámica**: USD a UYU
- **API pública de precios**
- **Comparación de planes**
- **Email de contacto**: Para consultas

### Seguimiento de Características del Plan
- **Límites de reportes**
- **Límites de publicación en Surlink**
- **Control de acceso a API**
- **Capacidades de exportación**
- **Indicador de soporte prioritario**
- **Aparición en muro de donantes**

---

## 9. DASHBOARD DE USUARIO

### Dashboard Unificado
- **Alertas recientes de Centinel**: Últimas 10 verificadas/pendientes
- **Últimas publicaciones de Surlink**: Últimas 10
- **Hilos recientes del foro**: Últimos 10
- **Notificaciones no leídas**: Últimas 20
- **Resumen de perfil de usuario**: Reputación, rol

### Características del Dashboard
- **Carga de datos en tiempo real**
- **Marcar notificaciones como leídas**
- **Navegación rápida al contenido**
- **Resumen de actividad**

---

## 10. CARACTERÍSTICAS EN TIEMPO REAL (SOCKET.IO)

### Eventos Emitidos
- **new-incident**: Incidente creado
- **incident-validated**: Validación completada
- **heatmap-updated**: Celda de calor actualizada
- **news-added**: Noticia ingerida
- **admin-post**: Anuncio creado

### Características de Socket
- **Autenticación JWT**: Para sockets
- **Soporte de conexión de invitados**
- **Salas específicas del usuario**
- **Suscripciones basadas en región**
- **Ping/pong keepalive**
- **Registro de conexión**
- **Manejo de errores**

---

## 11. MIDDLEWARE Y SEGURIDAD

### Middleware de Autenticación
- **checkJwt**: Verificación JWT, permite invitados
- **attachUser**: Carga usuario desde base de datos
- **requireScope**: Verificación de permisos
- **requireAdmin**: Rutas solo para administrador
- **requireModerator**: Rutas solo para moderador
- **requireAuth**: Verificación OIDC Auth0

### Características de Seguridad
- **Helmet.js**: Headers de seguridad
- **Configuración CORS**
- **Limitación de tasa**: Express-rate-limit
- **Limitación de operaciones de escritura**
- **Sanitización HTML**: Sanitize-html
- **Validación de subida de archivos**
- **Verificación de hash de fotos**: SHA-256
- **Configuración de seguridad de sesión**
- **Verificación de usuarios baneados**

### Subida de Archivos
- **Fotos de incidentes**: Hasta 3, 5MB cada una, PNG/JPG/JPEG
- **Imágenes del foro**: Hasta 5, 5MB cada una
- **Optimización de imágenes**: Con Sharp
- **Redimensionamiento automático**: 1920x1920 máximo
- **Optimización de calidad**: 80%
- **Generación segura de nombres de archivo**

### Manejo de Errores
- **Middleware de manejo global de errores**
- **Registro estructurado de errores**: Con Winston
- **Detalles de error**: Desarrollo vs producción
- **Manejo de cierre gracioso**

### Modo Mantenimiento
- **Banderas de mantenimiento por plataforma**
- **Mensajes de mantenimiento personalizados**
- **Middleware de verificación de mantenimiento**
- **Endpoint público de estado de mantenimiento**

### Seguimiento de Páginas
- **Registro automático de visitas**
- **Identificación de usuario**: Autenticado/anónimo
- **Seguimiento de dirección IP**: Solo anónimos
- **Seguimiento de URL de página**
- **Registro de user agent**
- **Registro de timestamp**

---

## 12. CARACTERÍSTICAS GEOESPACIALES

### Servicio de Geocodificación
- **Integración con API Nominatim**
- **Caché de ubicación**: Modelo GeoCache
- **Limitación de tasa**: 1 req/seg
- **Extracción de nombre de visualización**
- **Detección de código de país**

### Consultas Geoespaciales
- **Búsquedas por bounding box**
- **Búsquedas por proximidad**: Consultas $near
- **Formato de salida GeoJSON**
- **Codificación geohash**: Para celdas de calor
- **Índices 2dsphere**: En campos de ubicación

### Sistema de Barrios
- **Límites de polígonos GeoJSON**
- **Asignación basada en geohash**
- **Contador de incidentes por barrio**
- **Estadísticas de mapa de calor**: Por barrio
- **Servicio de actualización**: Para datos de barrio

---

## 13. TRABAJOS PROGRAMADOS (CRON)

### Trabajo de Ingesta de Noticias
- **Por defecto**: Cada 4 horas ("0 */4 * * *")
- **Horario configurable**: Vía SystemSettings
- **Filtrado por palabras clave de seguridad**
- **Procesamiento de feeds RSS**
- **Geocodificación y categorización**

### Trabajo de Actualización de Mapa de Calor
- **Por defecto**: Diario a las 3 AM ("0 3 * * *")
- **Recálculo de percentiles**
- **Actualizaciones de puntuación de celdas de calor**

### Trabajo de Limpieza
- **Por defecto**: Diario a las 2 AM ("0 2 * * *")
- **Archivado de listados expirados**
- **Limpieza de datos antiguos**

### Características de Cron
- **Configuración dinámica**: Desde base de datos
- **Habilitar/deshabilitar**: Por trabajo
- **Disparador manual**: Vía panel de administrador
- **Validación de expresión cron**
- **Recarga graceful**: Sin reinicio
- **Registro de ejecución de trabajos**

---

## 14. MODELOS DE DATOS

### Modelos Implementados
1. **User** - Cuentas de usuario y autenticación
2. **Incident** - Reportes de incidentes de seguridad
3. **Validation** - Votos de validación de incidentes
4. **NewsEvent** - Artículos de noticias agregadas
5. **ForumThread** - Hilos de discusión del foro
6. **ForumComment** - Comentarios y respuestas del foro
7. **ForumSettings** - Configuración del foro
8. **SurlinkListing** - Listados del marketplace
9. **SiteLike** - Likes para sitios estáticos
10. **SiteComment** - Comentarios en sitios estáticos
11. **AdminPost** - Anuncios de administrador
12. **Notification** - Notificaciones de usuario
13. **HeatCell** - Celdas de datos del mapa de calor
14. **GeoCache** - Caché de geocodificación
15. **Neighborhood** - Barrios geográficos
16. **PageVisit** - Análisis de páginas
17. **PricingSettings** - Configuración de precios
18. **UserPreferences** - Almacenamiento de preferencias de usuario
19. **SystemSettings** - Configuración del sistema

---

## 15. PÁGINAS PÚBLICAS

### Páginas de Información y Landing
- **Página de inicio** (/)
- **Resumen de plataforma** (/plataforma)
- **Social/crowdfunding** (/social)
- **Página de precios** (/pricing)
- **Muro de donantes** (/donadores)
- **Política de privacidad** (/privacy)
- **Términos de servicio** (/terms)

### Páginas de Aplicación
- **Mapa Centinel** (/centinel)
- **Página de noticias** (/news)
- **Lista del foro** (/forum, /forum-vortex)
- **Vista de hilo del foro** (/forum-thread/:id)
- **Marketplace Surlink** (/surlink)
- **Enlaces Ministerio del Interior** (/enlacesminterior)
- **Perfil de usuario** (/perfil)
- **Dashboard** (/dashboard)
- **Panel de administrador** (/admin)

---

## 16. CARACTERÍSTICAS DEL FRONTEND

### Archivos JavaScript
- **admin.js** - Funcionalidad completa del panel de administrador
- **centinel.js** - Mapeo y reporte de incidentes
- **dashboard.js** - Dashboard de usuario
- **forum.js** - Funcionalidad del foro
- **surlink.js** - Funcionalidad del marketplace
- **map.js** - Mapa interactivo (MapLibre GL)
- **news.js** - Visualización de noticias
- **perfil.js** - Gestión de perfil de usuario
- **notifications.js** - Manejo de notificaciones
- **enlacesminterior.js** - Página de enlaces oficiales del Ministerio del Interior
- **preferences-service.js** - Gestión de preferencias de usuario
- **theme-toggle.js** - Cambio de tema oscuro/claro
- **header-common.js** - Funcionalidad de navegación
- **modal-helper.js** - Utilidades de modales

### Características de UI
- **Cambio de tema oscuro/claro**
- **Diseño responsive**
- **Sistema de modales**
- **Notificaciones toast**
- **Estados de carga**
- **Paginación**
- **Búsqueda y filtros**
- **Galerías de imágenes**
- **Renderizado de Markdown/texto enriquecido**
- **Validación de formularios**
- **Actualizaciones en tiempo real**

---

## 17. RUTAS API

### Rutas de Autenticación (`/api/auth`)
- `POST /guest-token` - Generar JWT de invitado
- `GET /profile` - Obtener perfil de usuario
- `PUT /settings` - Actualizar configuración de usuario
- `DELETE /delete-account` - Eliminar cuenta

### Rutas de Incidentes (`/api/map/incidents`)
- `GET /` - Listar incidentes (con filtros)
- `POST /` - Crear incidente (con fotos)
- `GET /:id` - Obtener detalles de incidente
- `POST /:id/validate` - Validar incidente
- `POST /:id/photos` - Agregar fotos a incidente

### Rutas de Mapa de Calor (`/api/heatmap`)
- `GET /` - Obtener celdas de calor por bounding box

### Rutas de Barrios (`/api/neighborhoods`)
- `GET /` - Listar barrios
- `GET /:id` - Obtener detalles de barrio

### Rutas de Noticias (`/api/news`)
- `GET /` - Listar noticias (con filtros)
- `GET /:id` - Obtener detalles de noticia

### Rutas de Enlaces Ministerio del Interior (`/api/enlacesminterior`)
- `GET /mi` - Obtener enlaces oficiales del Ministerio del Interior

### Rutas de Administrador (`/api/admin`)
- `GET /stats` - Estadísticas del sistema
- `GET /users` - Estadísticas de usuarios
- `GET /users/list` - Lista de usuarios con paginación
- `PATCH /users/:id/status` - Bloquear/desbloquear usuario
- `DELETE /users/:id` - Eliminar usuario
- `POST /posts` - Crear publicación de administrador
- `GET /posts` - Listar publicaciones de administrador
- `PATCH /posts/:id` - Actualizar publicación de administrador
- `DELETE /posts/:id` - Eliminar publicación de administrador
- `POST /news/ingest` - Ingesta manual de noticias
- `DELETE /news/clear` - Eliminar todas las noticias
- `GET /news/stats` - Estadísticas de noticias
- `POST /surlink/purge` - Eliminación masiva de listados
- `POST /surlink/cleanup` - Archivar listados expirados
- `GET /forum/settings` - Obtener configuración del foro
- `PUT /forum/settings` - Actualizar configuración del foro
- `GET /forum/stats` - Estadísticas del foro
- `GET /pricing/settings` - Obtener configuración de precios
- `PUT /pricing/settings` - Actualizar configuración de precios
- `GET /visits/stats` - Estadísticas de visitas
- `GET /visits/recent` - Visitas recientes
- `GET /visits/pages` - Visitas por página
- `DELETE /visits/purge` - Eliminar visitas
- `GET /system/maintenance-status` - Estado de mantenimiento (público)
- `GET /system/settings` - Configuración del sistema
- `PUT /system/settings` - Actualizar configuración del sistema
- `POST /maintenance/run-cleanup` - Ejecutar limpieza
- `GET /cron/settings` - Configuración de trabajos cron
- `PUT /cron/settings` - Actualizar configuración cron
- `POST /cron/:job/run` - Ejecutar trabajo cron manualmente

### Rutas de Notificaciones (`/api/notifications`)
- `GET /` - Obtener notificaciones de usuario
- `POST /:id/read` - Marcar como leída
- `POST /read-all` - Marcar todas como leídas
- `GET /admin-posts` - Obtener publicaciones de administrador
- `POST /admin-posts/:id/like` - Dar like a publicación de administrador
- `POST /admin-posts/:id/view` - Marcar publicación como vista

### Rutas de Surlink (`/api/surlink`)
- `GET /listings` - Listar listados (con filtros)
- `GET /listings/:id` - Obtener detalles de listado
- `POST /listings` - Crear listado (admin)
- `PATCH /listings/:id` - Actualizar listado (admin)
- `DELETE /listings/:id` - Eliminar listado (admin)
- `POST /listings/:id/like` - Dar/quitar like a listado
- `GET /favorites` - Obtener favoritos de usuario
- `DELETE /favorites/:id` - Eliminar favorito
- `POST /listings/:id/comments` - Agregar comentario
- `GET /listings/:id/comments` - Obtener comentarios
- `DELETE /listings/:listingId/comments/:commentId` - Eliminar comentario
- `GET /comments` - Obtener comentarios del usuario
- `POST /listings/:listingId/comments/:commentId/replies` - Agregar respuesta
- `GET /responses` - Obtener respuestas de comentarios del usuario
- `GET /construccion/sites` - Obtener sitios de construcción
- `GET /construccion/sites/:id` - Obtener sitio de construcción
- `GET /academy/sites` - Obtener sitios de academy
- `GET /academy/sites/:id` - Obtener sitio de academy
- `GET /financial/sites` - Obtener sitios financieros
- `GET /financial/sites/:id` - Obtener sitio financiero
- `POST /:siteType/sites/:siteId/like` - Dar/quitar like a sitio
- `GET /sites/:siteId/comments` - Obtener comentarios de sitio
- `POST /sites/:siteId/comments` - Agregar comentario a sitio
- `POST /sites/:siteId/comments/:commentId/replies` - Responder a comentario

### Rutas del Foro (`/api/forum`)
- `GET /hashtags` - Obtener hashtags permitidos
- `GET /threads` - Listar hilos
- `POST /threads` - Crear hilo
- `GET /threads/:id` - Obtener hilo con comentarios
- `POST /threads/:id/like` - Dar/quitar like a hilo
- `POST /threads/:id/comments` - Agregar comentario
- `PUT /threads/:id` - Editar hilo
- `DELETE /threads/:id` - Eliminar hilo
- `POST /comments/:id/like` - Dar/quitar like a comentario
- `PUT /comments/:id` - Editar comentario
- `DELETE /comments/:id` - Eliminar comentario

### Rutas de Precios (`/api/pricing`)
- `GET /plans` - Obtener planes disponibles
- `GET /settings` - Obtener configuración de precios

### Rutas de Preferencias (`/api/preferences`)
- `GET /` - Obtener todas las preferencias
- `PUT /favorites/:category` - Actualizar favoritos
- `PUT /navigation` - Actualizar navegación
- `PUT /welcome-modals` - Actualizar banderas de modales
- `PUT /theme` - Actualizar tema
- `POST /migrate` - Migrar localStorage a BD

### Rutas del Dashboard (`/`)
- `GET /dashboard` - Página del dashboard (vista)
- `GET /api/dashboard/data` - Datos del dashboard (API)
- `PATCH /api/dashboard/notifications/:id/read` - Marcar notificación como leída
- `POST /api/dashboard/notifications/read-all` - Marcar todas como leídas

---

## 18. STACK TECNOLÓGICO

### Backend
- **Node.js** (v22+)
- **Express.js** - Framework web
- **MongoDB** - Base de datos (Mongoose ODM)
- **Socket.IO** - Comunicación en tiempo real
- **Auth0** - Autenticación y autorización

### Frontend
- **EJS** - Motor de plantillas
- **JavaScript Vanilla** - Sin framework
- **MapLibre GL** - Mapas interactivos
- **Chart.js** - Gráficos y análisis

### Librerías Principales
- **axios** - Peticiones HTTP
- **cheerio** - Web scraping
- **compromise** - Procesamiento de lenguaje natural
- **xml2js** - Parseo de RSS
- **ngeohash** - Codificación geohash
- **sharp** - Procesamiento de imágenes
- **sanitize-html** - Prevención XSS
- **winston** - Registro de logs
- **node-cron** - Programación de trabajos
- **helmet** - Headers de seguridad
- **express-rate-limit** - Limitación de tasa
- **json2csv & exceljs** - Exportación de datos
- **multer** - Subida de archivos
- **nodemailer** - Email (configurado)

### Servicios Externos
- **Auth0** - Autenticación OAuth
- **Nominatim API** - Geocodificación
- **Google Favicons API** - Logos de sitios

---

## 19. FUNCIONALIDADES PLANIFICADAS (PRÓXIMAMENTE)

Las siguientes funcionalidades están en fase de planificación y serán implementadas próximamente en la plataforma Vortex:

### 1. Transporte Urbano
**Descripción**: Integración completa de servicios de movilidad urbana
- **Paradas de ómnibus**: Ubicación en tiempo real de paradas
- **Apps de movilidad**: Integración con Uber, STM, Como ir
- **Taxis**: Directorio de servicios de taxi
- **Tiempos de llegada**: Información en tiempo real
- **Planificación de viajes**: Rutas optimizadas
- **Geolocalización**: Paradas cercanas a tu ubicación

**Impacto**: Facilitar la movilidad urbana con información centralizada y en tiempo real

### 2. Buses en Tiempo Real
**Descripción**: Sistema de seguimiento GPS de transporte público urbano
- **Seguimiento GPS**: Ubicación exacta de buses en circulación
- **Tiempos de espera**: Predicción de llegada a paradas
- **Planificación eficiente**: Optimizar tiempos de viaje
- **Rutas en vivo**: Visualización de recorridos activos
- **Notificaciones**: Alertas de llegada de buses
- **Integración con mapa**: Visualización geoespacial de la flota

**Impacto**: Reducir tiempos de espera y mejorar la experiencia del transporte público

### 3. Perfil Crediticio
**Descripción**: Gestión y consulta de historial crediticio personal
- **Consulta de historial**: Acceso a información crediticia verificada
- **Gestión de perfil**: Administración de datos crediticios
- **Información verificada**: Datos de fuentes oficiales
- **Mejora de oportunidades**: Análisis para mejores condiciones financieras
- **Alertas de cambios**: Notificaciones sobre modificaciones en el perfil
- **Recomendaciones**: Sugerencias para mejorar el score crediticio

**Impacto**: Mejorar el acceso a servicios financieros con transparencia en el historial crediticio

### 4. Ofertas Laborales y CVs
**Descripción**: Plataforma de empleo con gestión profesional de CVs
- **Búsqueda de empleo**: Ofertas laborales verificadas
- **Creación de CV**: Generador profesional de currículums
- **Gestión automática**: Templates y formato profesional
- **Postulaciones directas**: Aplicar a ofertas desde la plataforma
- **Seguimiento de aplicaciones**: Panel de postulaciones
- **Perfil profesional**: Portfolio y experiencia laboral
- **Alertas de empleo**: Notificaciones de nuevas ofertas según perfil
- **Verificación de empresas**: Solo empresas validadas

**Impacto**: Conectar talento con oportunidades laborales de forma transparente y eficiente

### 5. Facturación Electrónica
**Descripción**: Sistema completo de facturación integrado con DGI Uruguay
- **Tipos de contribuyente**: Feriantes, startups, unipersonales, SAS, Pymes
- **Generación de facturas**: Factura electrónica conforme a DGI
- **Integración DGI**: Envío automático a la Dirección General Impositiva
- **Gestión de clientes**: Directorio de clientes y proveedores
- **Reportes fiscales**: Informes para contabilidad
- **Factura electrónica**: E-factura y E-ticket
- **Gestión de pagos**: Seguimiento de cobros y pagos
- **Múltiples monedas**: Soporte USD y UYU
- **Exportación contable**: Compatible con sistemas contables

**Impacto**: Simplificar la facturación para pequeños negocios y emprendedores con cumplimiento fiscal automático

### 6. Social y Crowdfunding
**Descripción**: Canal comunitario para causas solidarias y campañas sociales
- **Adopciones**: Plataforma para adopción de mascotas
- **Rescates**: Coordinación de rescates animales
- **Campañas solidarias**: Crowdfunding para causas sociales
- **Seguimiento de campañas**: Transparencia en uso de fondos
- **Apoyo colectivo**: Comunidad activa en causas sociales
- **Verificación de campañas**: Validación de legitimidad
- **Donaciones seguras**: Procesamiento de pagos confiable
- **Reportes de impacto**: Resultados de campañas completadas
- **Sistema de voluntariado**: Coordinación de voluntarios

**Impacto**: Fortalecer el tejido social mediante colaboración comunitaria en causas solidarias

---

### Características Adicionales Mencionadas en Plan Premium (Próximamente)

Estas características están mencionadas en el plan Premium pero aún no implementadas:

#### Chatbot IA con GPT-5
**Descripción**: Asistente inteligente para búsqueda y navegación
- **Búsqueda inteligente**: Procesamiento de lenguaje natural
- **Recomendaciones personalizadas**: Basadas en preferencias
- **Consultas complejas**: Respuestas contextuales
- **Integración con todas las plataformas**: Centinel, Surlink, Forum

**Impacto**: Mejorar la experiencia de usuario con asistencia inteligente

#### Alertas Personalizadas
**Descripción**: Sistema de notificaciones basado en áreas de interés
- **Áreas de interés**: Definir zonas personalizadas
- **Alertas de incidentes**: Notificaciones inmediatas
- **Configuración personalizada**: Tipos de eventos a monitorear
- **Canales múltiples**: Email, push, SMS

**Impacto**: Mantener a los usuarios informados sobre eventos relevantes en sus zonas de interés

---

### Resumen de Funcionalidades Planificadas

**Total de funcionalidades próximamente**: 6 módulos principales + 2 características adicionales

**Áreas de expansión**:
1. **Movilidad**: Transporte urbano y buses en tiempo real
2. **Servicios Financieros**: Perfil crediticio y facturación electrónica
3. **Empleo**: Ofertas laborales y gestión de CVs
4. **Social**: Crowdfunding y causas solidarias
5. **IA y Personalización**: Chatbot GPT-5 y alertas personalizadas

**Prioridad de implementación**: Según demanda de usuarios y viabilidad técnica


## RESUMEN EJECUTIVO

**Vortex** es una plataforma comunitaria integral que combina:

1. **Centinel**: Sistema de mapeo colaborativo de incidentes de seguridad con validación comunitaria y visualización de mapa de calor
2. **Agregación de Noticias**: Ingesta automática y geocodificación de noticias de seguridad de múltiples fuentes
3. **Foro Vortex**: Sistema de discusión comunitaria con hilos, comentarios anidados y sistema de hashtags
4. **Surlink**: Marketplace con múltiples categorías (casas, autos, educación, servicios financieros, construcción)
5. **Panel de Administración**: Completo sistema de gestión con estadísticas, análisis y controles
6. **Sistema de Notificaciones**: Notificaciones en tiempo real para eventos de la plataforma
7. **Características en Tiempo Real**: Actualizaciones vía Socket.IO
8. **Seguridad Robusta**: Autenticación Auth0, JWT, limitación de tasa, sanitización HTML

La plataforma está construida con tecnologías modernas, incluye características geoespaciales avanzadas, trabajos programados, análisis completo y está lista para producción con seguridad robusta y manejo de errores.

**Estado actual**: Producción estable con funcionalidades de suscripción recientemente eliminadas.
**Arquitectura**: Monolítica con MongoDB, Express, Socket.IO y Auth0
**Despliegue**: Configurado para producción con variables de entorno y modo mantenimiento por plataforma

**Roadmap futuro**: 6 módulos principales en planificación (Transporte Urbano, Buses en Tiempo Real, Perfil Crediticio, Ofertas Laborales y CVs, Facturación Electrónica, Social y Crowdfunding) más características adicionales de IA y personalización.
