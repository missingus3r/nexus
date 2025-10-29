# Sistema de Heatmap de Barrios

## Descripción

Este sistema segmenta los barrios de Montevideo con un overlay (heatmap) usando el **color promedio** de los incidentes verificados en cada barrio. Los barrios sin incidentes reportados no se marcan en el mapa.

## Características

- **Segmentación por barrios**: Cada incidente se asigna automáticamente al barrio donde ocurrió
- **Color promedio**: El color del overlay se calcula promediando los colores de todos los incidentes verificados en el barrio
- **Actualización en tiempo real**: Cuando se valida un incidente, el heatmap del barrio se actualiza automáticamente
- **Solo barrios con incidentes**: Solo se muestran overlays en barrios que tienen al menos un incidente verificado

## Colores por tipo de incidente

| Tipo de Incidente | Color | Código Hex |
|-------------------|-------|------------|
| Homicidio | Rojo | #d32f2f |
| Rapiña | Naranja | #f57c00 |
| Hurto | Amarillo | #fbc02d |
| Copamiento | Rojo oscuro | #c62828 |
| Violencia doméstica | Rosa | #e91e63 |
| Narcotráfico | Púrpura | #9c27b0 |
| Otro | Gris | #757575 |

## Arquitectura

### Backend

#### Modelos

- **Neighborhood** (`api/src/models/Neighborhood.js`):
  - Almacena los datos de barrios con geometría (polígonos)
  - Campos calculados: `incidentCount`, `averageColor`, `lastIncidentAt`

- **Incident** (`api/src/models/Incident.js`):
  - Campos agregados: `neighborhoodId`, `neighborhoodName`

#### Servicios

- **neighborhoodService.js** (`api/src/services/neighborhoodService.js`):
  - `findNeighborhoodByLocation(lon, lat)`: Encuentra el barrio que contiene un punto
  - `assignNeighborhoodToIncident(incidentId)`: Asigna un barrio a un incidente
  - `calculateAverageColor(colors)`: Calcula el color promedio de múltiples colores hex
  - `updateNeighborhoodHeatmap(neighborhoodId)`: Actualiza el heatmap de un barrio
  - `updateAllNeighborhoodsHeatmap()`: Actualiza todos los barrios

#### Rutas

- **GET /api/neighborhoods**: Obtiene todos los barrios
  - Query param `withIncidents=true`: Solo barrios con incidentes
- **GET /api/neighborhoods/:id**: Obtiene un barrio específico
- **POST /api/neighborhoods/:id/update-heatmap**: Actualiza heatmap de un barrio (admin)
- **POST /api/neighborhoods/update-all-heatmaps**: Actualiza todos los heatmaps (admin)

### Frontend

#### Capas del mapa (`api/public/js/map.js`)

1. **neighborhoods-fill**: Capa de relleno con el color promedio de incidentes
2. **neighborhoods-border**: Borde de los barrios
3. Tooltips al pasar el mouse mostrando nombre y cantidad de incidentes

## Flujo de trabajo

### 1. Cuando se crea un incidente

```
Usuario marca incidente → Se guarda en DB → Se asigna barrio (async)
```

### 2. Cuando se valida un incidente

```
Usuario valida incidente → Estado cambia a 'verified' →
  Se actualiza heatmap de celdas geohash →
  Se actualiza heatmap del barrio
```

### 3. Cálculo del color promedio

```javascript
// Ejemplo: barrio con 3 incidentes
Incidentes: [homicidio, rapiña, hurto]
Colores: [#d32f2f, #f57c00, #fbc02d]

// Se promedian los valores RGB
R: (211 + 245 + 251) / 3 = 235.67 → 236
G: (47 + 124 + 192) / 3 = 121
B: (47 + 0 + 45) / 3 = 30.67 → 31

Color promedio: #ec791f (naranja intermedio)
```

## Scripts de mantenimiento

### Cargar barrios desde GeoJSON

```bash
cd api
node src/scripts/seedNeighborhoods.js
```

Lee el archivo `api/data/montevideo_barrios.geojson` y carga los barrios en MongoDB.

### Asignar barrios a incidentes existentes

```bash
cd api
node src/scripts/assignNeighborhoodsToIncidents.js
```

Procesa todos los incidentes existentes, les asigna barrio y actualiza los heatmaps.

## Datos de barrios

Los datos de barrios están en formato GeoJSON en `api/data/montevideo_barrios.geojson`.

### Estructura del GeoJSON

```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id_barrio": 1,
        "nombre": "Centro",
        "codigo": "CENTRO"
      },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[...]]
      }
    }
  ]
}
```

### Actualizar datos de barrios

Para actualizar con datos más precisos:

1. Obtener GeoJSON de barrios de Montevideo desde fuentes oficiales:
   - [Catálogo de Datos Abiertos de Uruguay](https://catalogodatos.gub.uy/)
   - [GitHub: vierja/geojson_montevideo](https://github.com/vierja/geojson_montevideo)

2. Reemplazar el archivo `api/data/montevideo_barrios.geojson`

3. Ejecutar el script de seed:
   ```bash
   node src/scripts/seedNeighborhoods.js
   ```

4. Actualizar incidentes existentes:
   ```bash
   node src/scripts/assignNeighborhoodsToIncidents.js
   ```

## Visualización en el mapa

El overlay de barrios:
- Se muestra **debajo** de las capas de incidentes
- Tiene una opacidad de 35% (`fill-opacity: 0.35`)
- Solo muestra barrios con `incidentCount > 0`
- Muestra tooltip al pasar el mouse con:
  - Nombre del barrio
  - Cantidad de incidentes verificados

## Índices de MongoDB

Los siguientes índices están configurados para optimizar las consultas:

```javascript
// Neighborhood
{ geometry: '2dsphere' }  // Para consultas geoespaciales
{ id_barrio: 1 }          // Búsqueda por ID
{ codigo: 1 }             // Búsqueda por código

// Incident
{ neighborhoodId: 1 }     // Búsqueda de incidentes por barrio
```

## Consideraciones de rendimiento

- La asignación de barrio se hace de forma **asíncrona** al crear el incidente
- El cálculo del heatmap se hace **después** de validar un incidente
- Los datos de barrios se cachean en el frontend
- Solo se cargan barrios con incidentes para reducir el tamaño de la respuesta

## Extensiones futuras

Posibles mejoras al sistema:

1. **Ponderación por severidad**: Dar más peso a incidentes más severos en el cálculo del color
2. **Decay temporal**: Aplicar decay a incidentes antiguos
3. **Diferentes vistas**: Permitir filtrar por tipo de incidente
4. **Estadísticas por barrio**: Dashboard con métricas detalladas por barrio
5. **Alertas por barrio**: Notificar cuando un barrio supera cierto umbral de incidentes
