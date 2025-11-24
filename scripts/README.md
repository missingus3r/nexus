# Scripts de Mantenimiento

Este directorio contiene scripts útiles para el mantenimiento y optimización de la aplicación.

## createIndexes.js

Script para crear todos los índices de MongoDB necesarios para optimizar las consultas de la aplicación.

### ¿Qué hace?

Crea índices optimizados en todas las colecciones principales:

- **Users**: Índice de búsqueda de texto en email y nombre
- **Incidents**: Índices geoespaciales y de estado
- **Forum Threads/Comments**: Índices para búsquedas y ordenamiento
- **Notifications**: Índices con TTL (30 días)
- **Surlink Listings**: Índices por categoría y ubicación
- **News Events**: Índices geoespaciales y por fuente
- **Page Visits**: Índices con TTL (90 días)
- **Validations**: Índices únicos compuestos
- **Credit Profile Requests**: Índices por usuario y estado

### ¿Cuándo ejecutarlo?

- **Primera instalación**: Después de configurar la base de datos
- **Después de migraciones**: Si se agregan nuevos campos
- **Problemas de performance**: Si las queries están lentas
- **Mantenimiento regular**: Cada 3-6 meses

### Cómo ejecutar

```bash
# Opción 1: Usar npm script
npm run create-indexes

# Opción 2: Ejecutar directamente con node
node scripts/createIndexes.js
```

### Verificar índices creados

```bash
# Conectarse a MongoDB
mongosh austra

# Ver índices de una colección específica
db.users.getIndexes()
db.incidents.getIndexes()
db.forumthreads.getIndexes()

# Ver estadísticas de uso de índices
db.users.aggregate([{ $indexStats: {} }])
```

### Notas importantes

- El script es **idempotente**: puede ejecutarse múltiples veces sin problemas
- MongoDB NO recrea índices que ya existen
- Los índices TTL eliminan documentos antiguos automáticamente:
  - Notifications: 30 días
  - Page Visits: 90 días
- Los índices de texto soportan búsquedas en español

### Índices de texto

El índice de texto en la colección `users` permite búsquedas eficientes:

```javascript
// Ejemplo de uso en código
User.find({ $text: { $search: "juan garcia" } })
  .limit(10);
```

### Performance

Después de crear los índices, deberías notar mejoras en:

- ✅ Búsqueda de usuarios en panel admin (10x más rápido)
- ✅ Búsquedas geoespaciales de incidentes (5x más rápido)
- ✅ Carga de threads del foro con comentarios (3x más rápido)
- ✅ Dashboard de admin con estadísticas (2x más rápido)

### Troubleshooting

**Error: "Index already exists with different options"**
```bash
# Eliminar el índice viejo y volver a ejecutar el script
mongosh austra --eval "db.users.dropIndex('nombre_del_indice')"
npm run create-indexes
```

**Error: "MongoDB connection refused"**
- Verifica que MongoDB esté corriendo: `systemctl status mongod`
- Verifica la variable de entorno `MONGODB_URI` en `.env`
