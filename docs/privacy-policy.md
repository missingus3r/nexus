# Política de Privacidad - Vortex

**Última actualización**: Octubre 2025

## 1. Introducción

Vortex ("nosotros", "nuestro") respeta su privacidad y se compromete a proteger sus datos personales. Esta política explica cómo recopilamos, usamos y protegemos su información en conformidad con la **Ley N° 18.331 de Protección de Datos Personales** de Uruguay.

## 2. Responsable del Tratamiento

**Vortex UY**
Email: info.vortexlabs@protonmail.com
Sitio web: https://vortexlabs.cc

## 3. Datos que Recopilamos

### 3.1 Usuarios Registrados
- Email (vía Auth0)
- ID de usuario único (Auth0 sub)
- Reputación (calculada por el sistema)
- Historial de reportes y validaciones

### 3.2 Usuarios Anónimos (Guest)
- Dirección IP (solo para rate limiting)
- Token JWT temporal (no personal)

### 3.3 Reportes de Incidentes
- **Ubicación GPS** (con jitter de ~100m)
- Tipo de incidente
- Severidad
- Descripción (opcional, máx 1000 caracteres)
- Foto/video (opcional, con EXIF removido)
- Timestamp del servidor (UTC)

**NO almacenamos**:
- Dirección exacta
- Nombres de personas involucradas
- Datos EXIF de imágenes (GPS, cámara, etc.)

### 3.4 Noticias Indexadas
- Título, URL, fuente pública
- Coordenadas geocodificadas
- **NO almacenamos** contenido completo de artículos

## 4. Base Legal del Tratamiento

Procesamos sus datos bajo las siguientes bases legales (Art. 11, Ley 18.331):

- **Consentimiento**: Al registrarse y aceptar estos términos
- **Interés legítimo**: Para proveer y mejorar el servicio
- **Cumplimiento legal**: Responder a solicitudes de autoridades competentes

## 5. Uso de los Datos

### 5.1 Finalidades
- Mostrar incidentes en el mapa
- Calcular heatmap de riesgo
- Sistema de validación y reputación
- Moderar contenido
- Comunicaciones importantes (actualizaciones del servicio)

### 5.2 NO Vendemos Datos
**Nunca vendemos, alquilamos o comercializamos datos personales** a terceros.

## 6. Compartir Datos

### 6.1 Terceros Autorizados
- **Auth0** (autenticación)
- **MongoDB Atlas** (almacenamiento y caché)
- **Backblaze B2** (almacenamiento de media)

Todos los proveedores cumplen con GDPR/equivalentes.

### 6.2 Autoridades
Podemos compartir datos si requerido por ley (orden judicial, investigación penal).

## 7. Medidas de Seguridad

### 7.1 Técnicas
- ✅ Encriptación HTTPS (TLS 1.3)
- ✅ JWT firmados
- ✅ Hash SHA-256 de evidencias
- ✅ EXIF stripping
- ✅ Coordinate jittering
- ✅ Rate limiting
- ✅ CORS estricto

### 7.2 Organizativas
- Acceso restringido a datos (admin/moderadores)
- Logs de auditoría
- Backups encriptados
- Política de retención de datos

## 8. Retención de Datos

| Tipo de Dato | Retención |
|--------------|-----------|
| Incidentes verificados | Indefinido (interés público) |
| Incidentes no verificados | 30 días |
| Validaciones | 1 año |
| Noticias | 2 años |
| Logs de servidor | 90 días |
| Media (fotos/videos) | Indefinido (si incidente verificado) |

## 9. Derechos del Usuario (Art. 13-14, Ley 18.331)

Usted tiene derecho a:

- **Acceso**: Solicitar qué datos tenemos sobre usted
- **Rectificación**: Corregir datos incorrectos
- **Cancelación**: Eliminar su cuenta y datos
- **Oposición**: Objetar ciertos procesamientos
- **Portabilidad**: Recibir sus datos en formato estructurado

**Ejercer derechos**: Enviar email a info.vortexlabs@protonmail.com con asunto "Derechos ARCO"

## 10. Cookies y Tracking

### 10.1 Cookies Esenciales
- Session cookie (JWT)
- Preferencias de usuario (local storage)

**NO usamos**:
- ❌ Google Analytics
- ❌ Facebook Pixel
- ❌ Tracking de terceros

## 11. Menores de Edad

Vortex no está dirigido a menores de 13 años. Si descubrimos que un menor ha proporcionado datos, los eliminaremos inmediatamente.

## 12. Transferencias Internacionales

Algunos proveedores (MongoDB Atlas, Auth0) pueden almacenar datos fuera de Uruguay. Aseguramos que cumplan con estándares equivalentes a GDPR.

## 13. Modificaciones a esta Política

Notificaremos cambios materiales vía:
- Banner en el sitio web
- Email a usuarios registrados (si aplicable)

## 14. Contacto

**Preguntas sobre privacidad**:
Email: info.vortexlabs@protonmail.com

**Unidad Reguladora (URCDP)**:
Sitio: https://www.gub.uy/unidad-reguladora-control-datos-personales
Email: urcdp@agesic.gub.uy

---

**Consentimiento**:
Al usar Vortex, usted acepta esta Política de Privacidad y el procesamiento de sus datos según lo descrito.
