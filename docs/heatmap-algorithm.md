# Algoritmo de Heatmap - Vortex

## Descripción General

El heatmap de Vortex utiliza un sistema de scoring dinámico que combina múltiples factores para representar el nivel de riesgo en diferentes zonas geográficas.

## Componentes del Score

### 1. Decay Exponencial (Decaimiento Temporal)

Los incidentes pierden relevancia con el tiempo usando una función exponencial:

```
decay = exp(-ln(2) × age_days / half_life)

donde:
- age_days = días desde la creación del incidente
- half_life = 7 días (configurable)
```

**Ejemplos**:
- Incidente de hoy: decay = 1.0 (100%)
- Incidente de 7 días: decay = 0.5 (50%)
- Incidente de 14 días: decay = 0.25 (25%)
- Incidente de 30 días: decay = 0.088 (8.8%)

### 2. Peso por Severidad

Escala de 1 a 5:
- **1**: Menor (hurto simple)
- **2**: Bajo (hurto agravado)
- **3**: Medio (rapiña)
- **4**: Alto (copamiento)
- **5**: Crítico (homicidio)

### 3. Peso por Reputación del Reportante

La reputación del usuario que reporta el incidente afecta el peso:

```
reputation_weight = reputation / 100  // normalizado 0-1
final_weight = 0.5 + 0.5 × reputation_weight
```

Esto garantiza:
- Usuarios con reputación 0: peso mínimo 0.5 (50%)
- Usuarios con reputación 50: peso 0.75 (75%)
- Usuarios con reputación 100: peso 1.0 (100%)

**Nunca se descarta completamente un reporte**, incluso de usuarios con baja reputación.

## Fórmula Final

```javascript
incident_score = decay × severity × (0.5 + 0.5 × reputation)

// Agregación por celda
cell_score = Σ incident_score (para todos los incidentes verificados en la celda)
```

## Geohash y Granularidad

- **Precisión**: 7 caracteres (~153m × 153m)
- **Ejemplo**: `6g4w282` (zona de Pocitos, Montevideo)

Cada celda geohash acumula el score de todos sus incidentes.

## Umbrales de Color Dinámicos

Los colores se asignan basándose en **percentiles** del score global:

```javascript
// Calcular percentiles
allScores = [cell1.score, cell2.score, ...]
p50 = percentile(allScores, 50)
p75 = percentile(allScores, 75)

// Asignar color
if (score >= p75) → 🔴 ROJO (alto riesgo)
else if (score >= p50) → 🟡 AMARILLO (riesgo medio)
else → 🟢 VERDE (riesgo bajo)
```

**Ventajas**:
- Auto-ajuste según distribución de datos
- Evita que todas las celdas sean verdes o rojas
- Relativiza el riesgo en contexto geográfico

## Actualización del Heatmap

### Triggers
1. **Nuevo incidente verificado** → actualiza celda inmediatamente
2. **Cron job (cada 5 min)** → recalcula percentiles globales
3. **Cambio de estado de incidente** (pending → verified) → actualiza celda

### Proceso

```javascript
async function updateHeatmapForIncident(incidentId) {
  // 1. Obtener incidente y su geohash
  const incident = await Incident.findById(incidentId)
  const geohash = incident.geohash

  // 2. Obtener todos los incidentes verificados en esa celda
  const incidents = await Incident.find({
    geohash,
    status: 'verified',
    hidden: false
  })

  // 3. Calcular score total
  let totalScore = 0
  for (const inc of incidents) {
    totalScore += calculateIncidentScore(inc)
  }

  // 4. Actualizar o crear celda
  await HeatCell.findOneAndUpdate(
    { geohash },
    {
      score: totalScore,
      incidentCount: incidents.length,
      lastIncidentAt: incident.createdAt
    },
    { upsert: true }
  )

  // 5. Recalcular percentiles (async)
  await updatePercentiles()
}
```

## Optimizaciones

### 1. Cache de Geohash
- Los geohashes se calculan y almacenan en el modelo `Incident`
- Evita recálculos en cada query

### 2. Índices MongoDB
```javascript
incidents.createIndex({ geohash: 1, createdAt: -1 })
heatCells.createIndex({ score: -1 })
```

### 3. Batch Updates
- Percentiles se recalculan en batch (no por cada incidente)
- BulkWrite para actualizar colores

## Casos Extremos

### Celda sin incidentes
```javascript
score = 0
color = verde
```

### Múltiples incidentes críticos
```javascript
// Ej: 5 homicidios en última semana
score = 5 × (1.0 × 5 × 0.9) = 22.5 (muy alto)
percentile = 99%
color = rojo
```

### Incidente antiguo (30+ días)
```javascript
decay < 0.1 → impacto mínimo en score actual
```

## Testing

```javascript
// Test: decay correcto
const incident = { createdAt: new Date(Date.now() - 7 * 86400000) }
const decay = calculateDecay(incident.createdAt, 7)
assert(Math.abs(decay - 0.5) < 0.01)  // ~0.5 para 7 días

// Test: scoring mínimo con reputación 0
const score = calculateIncidentScore({
  createdAt: new Date(),
  severity: 3,
  reporterReputation: 0
})
assert(score === 1.0 * 3 * 0.5)  // = 1.5

// Test: percentiles
const scores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
assert(percentile(scores, 50) === 5.5)
assert(percentile(scores, 75) === 7.75)
```

## Consideraciones Futuras

### Machine Learning
- Clasificación automática de severidad basada en descripción
- Detección de patrones espacio-temporales
- Predicción de incidentes futuros

### Ajustes Dinámicos
- Half-life variable por tipo de incidente
- Peso por hora del día (horarios pico de delincuencia)
- Factores ambientales (eventos, clima)

### Visualización Avanzada
- Gradientes suaves entre celdas
- Animación temporal (playback histórico)
- Comparación con periodos anteriores

---

**Nota**: Este algoritmo prioriza transparencia y explicabilidad sobre complejidad. Los usuarios pueden entender por qué una zona es "roja" o "verde".
