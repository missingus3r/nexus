/**
 * Bus Layer Manager for MapLibre GL
 * Manages bus stops and real-time bus positions on Centinel map
 */
class BusLayerManager {
  constructor(map) {
    this.map = map;
    this.busStops = [];
    this.buses = [];
    this.busLines = new Set();
    this.busPositions = new Map(); // Track positions over time
    this.refreshInterval = null;
    this.refreshRate = 3000; // 3 seconds
    this.isInitialized = false;
    this.autoRefreshEnabled = true;
    this.currentLineFilter = null;

    // Layer IDs
    this.STOPS_SOURCE = 'bus-stops-source';
    this.STOPS_LAYER = 'bus-stops-layer';
    this.BUSES_SOURCE = 'bus-buses-source';
    this.BUSES_MOVING_LAYER = 'bus-buses-moving-layer';
    this.BUSES_STOPPED_LAYER = 'bus-buses-stopped-layer';
  }

  /**
   * Initialize bus layers on the map
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('[BusLayer] Already initialized');
      return;
    }

    try {
      // Wait for map to be fully loaded
      if (!this.map.isStyleLoaded()) {
        await new Promise(resolve => this.map.once('load', resolve));
      }

      // Add sources
      this.addSources();

      // Add layers
      this.addLayers();

      // Load initial data
      await this.loadBusStops();
      await this.loadBuses();

      // Start auto-refresh if enabled
      if (this.autoRefreshEnabled) {
        this.startAutoRefresh();
      }

      this.isInitialized = true;
      console.log('[BusLayer] Initialized successfully');
    } catch (error) {
      console.error('[BusLayer] Initialization error:', error);
      throw error;
    }
  }

  /**
   * Add GeoJSON sources for buses and stops
   */
  addSources() {
    // Bus stops source
    if (!this.map.getSource(this.STOPS_SOURCE)) {
      this.map.addSource(this.STOPS_SOURCE, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        },
        cluster: true,
        clusterMaxZoom: 15,
        clusterRadius: 50
      });
    }

    // Buses source
    if (!this.map.getSource(this.BUSES_SOURCE)) {
      this.map.addSource(this.BUSES_SOURCE, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      });
    }
  }

  /**
   * Add map layers for visualization
   */
  addLayers() {
    // Bus stops cluster layer
    if (!this.map.getLayer(this.STOPS_LAYER + '-cluster')) {
      this.map.addLayer({
        id: this.STOPS_LAYER + '-cluster',
        type: 'circle',
        source: this.STOPS_SOURCE,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#3b82f6',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            15,  // radius for count < 10
            10, 20,  // radius for 10 <= count < 50
            50, 25   // radius for count >= 50
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        }
      });

      this.map.addLayer({
        id: this.STOPS_LAYER + '-cluster-count',
        type: 'symbol',
        source: this.STOPS_SOURCE,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12
        },
        paint: {
          'text-color': '#ffffff'
        }
      });
    }

    // Individual bus stops
    if (!this.map.getLayer(this.STOPS_LAYER)) {
      this.map.addLayer({
        id: this.STOPS_LAYER,
        type: 'circle',
        source: this.STOPS_SOURCE,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': '#3b82f6',
          'circle-radius': 6,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      });
    }

    // Buses - moving (green) - Show line number
    if (!this.map.getLayer(this.BUSES_MOVING_LAYER)) {
      this.map.addLayer({
        id: this.BUSES_MOVING_LAYER,
        type: 'symbol',
        source: this.BUSES_SOURCE,
        filter: ['==', ['get', 'isMoving'], true],
        layout: {
          'text-field': ['get', 'line'],
          'text-size': 14,
          'text-allow-overlap': true,
          'text-ignore-placement': false
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#22c55e',
          'text-halo-width': 3,
          'text-halo-blur': 1
        }
      });
    }

    // Buses - stopped (red) - Show line number
    if (!this.map.getLayer(this.BUSES_STOPPED_LAYER)) {
      this.map.addLayer({
        id: this.BUSES_STOPPED_LAYER,
        type: 'symbol',
        source: this.BUSES_SOURCE,
        filter: ['==', ['get', 'isMoving'], false],
        layout: {
          'text-field': ['get', 'line'],
          'text-size': 14,
          'text-allow-overlap': true,
          'text-ignore-placement': false
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#ef4444',
          'text-halo-width': 3,
          'text-halo-blur': 1
        }
      });
    }

    // Add click handlers for popups
    this.setupPopupHandlers();
  }

  /**
   * Setup popup handlers for stops and buses
   */
  setupPopupHandlers() {
    // Stop popups
    this.map.on('click', this.STOPS_LAYER, (e) => {
      const feature = e.features[0];
      const props = feature.properties;

      const popupHtml = `
        <div class="bus-popup">
          <div class="popup-header">
            <strong>🚏 Parada #${props.busstopId}</strong>
          </div>
          <div class="popup-content">
            <p><strong>Calles:</strong> ${props.street1} y ${props.street2}</p>
          </div>
        </div>
      `;

      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(popupHtml)
        .addTo(this.map);
    });

    // Bus popups (moving)
    this.map.on('click', this.BUSES_MOVING_LAYER, (e) => {
      this.showBusPopup(e);
    });

    // Bus popups (stopped)
    this.map.on('click', this.BUSES_STOPPED_LAYER, (e) => {
      this.showBusPopup(e);
    });

    // Change cursor on hover
    [this.STOPS_LAYER, this.BUSES_MOVING_LAYER, this.BUSES_STOPPED_LAYER].forEach(layer => {
      this.map.on('mouseenter', layer, () => {
        this.map.getCanvas().style.cursor = 'pointer';
      });
      this.map.on('mouseleave', layer, () => {
        this.map.getCanvas().style.cursor = '';
      });
    });

    // Cluster click to zoom
    this.map.on('click', this.STOPS_LAYER + '-cluster', (e) => {
      const features = this.map.queryRenderedFeatures(e.point, {
        layers: [this.STOPS_LAYER + '-cluster']
      });
      const clusterId = features[0].properties.cluster_id;
      this.map.getSource(this.STOPS_SOURCE).getClusterExpansionZoom(
        clusterId,
        (err, zoom) => {
          if (err) return;
          this.map.easeTo({
            center: features[0].geometry.coordinates,
            zoom: zoom
          });
        }
      );
    });
  }

  /**
   * Show bus popup
   */
  showBusPopup(e) {
    const feature = e.features[0];
    const props = feature.properties;
    const isMoving = props.isMoving === 'true' || props.isMoving === true;

    const popupHtml = `
      <div class="bus-popup">
        <div class="popup-header">
          <strong>🚌 Línea ${props.line || 'N/A'}</strong>
        </div>
        <div class="popup-content">
          <p><strong>Empresa:</strong> ${props.companyName || 'N/A'}</p>
          <p><strong>Origen:</strong> ${props.origin || 'N/A'}</p>
          <p><strong>Destino:</strong> ${props.destination || 'N/A'}</p>
          ${props.subline ? `<p><strong>Sublínea:</strong> ${props.subline}</p>` : ''}
          ${props.access ? `<p><strong>Accesibilidad:</strong> ${props.access}</p>` : ''}
          ${props.thermalConfort ? `<p><strong>Confort:</strong> ${props.thermalConfort}</p>` : ''}
          <p><strong>Estado:</strong> <span style="color: ${isMoving ? '#22c55e' : '#ef4444'}; font-weight: bold;">
            ${isMoving ? 'En movimiento ●' : 'Detenido ●'}
          </span></p>
        </div>
      </div>
    `;

    new maplibregl.Popup()
      .setLngLat(e.lngLat)
      .setHTML(popupHtml)
      .addTo(this.map);
  }

  /**
   * Load bus stops from API
   */
  async loadBusStops() {
    try {
      const response = await fetch('/api/buses/stops');
      if (!response.ok) throw new Error('Failed to fetch bus stops');

      const stops = await response.json();
      this.busStops = stops;

      // Convert to GeoJSON
      const features = stops.map(stop => ({
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: stop.location.coordinates
        },
        properties: {
          busstopId: stop.busstopId,
          street1: stop.street1,
          street2: stop.street2
        }
      }));

      // Update source
      const source = this.map.getSource(this.STOPS_SOURCE);
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: features
        });
      }

      console.log(`[BusLayer] Loaded ${stops.length} bus stops`);
      this.updateStopCount(stops.length);
    } catch (error) {
      console.error('[BusLayer] Error loading bus stops:', error);
    }
  }

  /**
   * Load buses from API
   */
  async loadBuses() {
    try {
      const response = await fetch('/api/buses/positions');
      if (!response.ok) throw new Error('Failed to fetch bus positions');

      const buses = await response.json();
      this.buses = buses;

      // Extract unique lines
      this.busLines.clear();
      buses.forEach(bus => {
        if (bus.line) this.busLines.add(bus.line);
      });

      // Convert to GeoJSON with movement detection
      const features = buses.map(bus => {
        const isMoving = this.detectMovement(bus);

        return {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: bus.location.coordinates
          },
          properties: {
            id: bus.id,
            line: bus.line,
            companyName: bus.companyName,
            origin: bus.origin,
            destination: bus.destination,
            subline: bus.subline,
            access: bus.access,
            thermalConfort: bus.thermalConfort,
            isMoving: isMoving
          }
        };
      }).filter(feature => {
        // Apply line filter if set
        if (this.currentLineFilter) {
          return feature.properties.line === this.currentLineFilter;
        }
        return true;
      });

      // Update source
      const source = this.map.getSource(this.BUSES_SOURCE);
      if (source) {
        source.setData({
          type: 'FeatureCollection',
          features: features
        });
      }

      console.log(`[BusLayer] Loaded ${buses.length} buses, displaying ${features.length}`);
      this.updateBusCount(buses.length);
      this.updateLineFilter();
    } catch (error) {
      console.error('[BusLayer] Error loading buses:', error);
    }
  }

  /**
   * Detect if bus is moving based on position history
   */
  detectMovement(bus) {
    const busId = bus.id;
    const [lng, lat] = bus.location.coordinates;
    const currentPos = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    const now = Date.now();

    let isMoving = true;

    if (this.busPositions.has(busId)) {
      const prevData = this.busPositions.get(busId);
      const timeDiff = (now - prevData.timestamp) / 1000 / 60; // minutes

      // If position hasn't changed in 2+ minutes, consider stopped
      if (prevData.position === currentPos && timeDiff >= 2) {
        isMoving = false;
      } else if (prevData.position !== currentPos) {
        // Position changed, update timestamp
        this.busPositions.set(busId, { position: currentPos, timestamp: now });
      }
    } else {
      // First time seeing this bus
      this.busPositions.set(busId, { position: currentPos, timestamp: now });
    }

    return isMoving;
  }

  /**
   * Toggle bus stops visibility
   */
  toggleStops(visible) {
    const visibility = visible ? 'visible' : 'none';
    [this.STOPS_LAYER, this.STOPS_LAYER + '-cluster', this.STOPS_LAYER + '-cluster-count'].forEach(layer => {
      if (this.map.getLayer(layer)) {
        this.map.setLayoutProperty(layer, 'visibility', visibility);
      }
    });
  }

  /**
   * Toggle buses visibility
   */
  toggleBuses(visible) {
    const visibility = visible ? 'visible' : 'none';
    [this.BUSES_MOVING_LAYER, this.BUSES_STOPPED_LAYER].forEach(layer => {
      if (this.map.getLayer(layer)) {
        this.map.setLayoutProperty(layer, 'visibility', visibility);
      }
    });
  }

  /**
   * Toggle all bus layers
   */
  toggleAll(visible) {
    this.toggleStops(visible);
    this.toggleBuses(visible);
  }

  /**
   * Filter buses by line
   */
  filterByLine(lineId) {
    this.currentLineFilter = lineId === 'all' ? null : lineId;
    this.loadBuses(); // Reload to apply filter
  }

  /**
   * Start auto-refresh
   */
  startAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.autoRefreshEnabled = true;
    this.refreshInterval = setInterval(() => {
      this.loadBuses(); // Only refresh buses, stops don't change
    }, this.refreshRate);

    console.log('[BusLayer] Auto-refresh started');
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    this.autoRefreshEnabled = false;
    console.log('[BusLayer] Auto-refresh stopped');
  }

  /**
   * Update line filter dropdown (desktop and mobile)
   */
  updateLineFilter() {
    const selectDesktop = document.getElementById('busLineFilter');
    const selectMobile = document.getElementById('busLineFilterMobile');

    const selects = [selectDesktop, selectMobile].filter(s => s);
    if (selects.length === 0) return;

    // Get current value from first select
    const currentValue = selects[0].value;

    // Add sorted lines
    const sortedLines = Array.from(this.busLines).sort((a, b) => {
      const numA = parseInt(a) || 999;
      const numB = parseInt(b) || 999;
      return numA - numB;
    });

    // Update both selects
    selects.forEach(select => {
      // Clear options except first
      while (select.options.length > 1) {
        select.remove(1);
      }

      sortedLines.forEach(line => {
        const option = document.createElement('option');
        option.value = line;
        option.textContent = `Línea ${line}`;
        select.appendChild(option);
      });

      // Restore selection if exists
      if (currentValue && sortedLines.includes(currentValue)) {
        select.value = currentValue;
      }
    });
  }

  /**
   * Update counters in UI (desktop and mobile)
   */
  updateStopCount(count) {
    const elDesktop = document.getElementById('busStopCount');
    const elMobile = document.getElementById('busStopCountMobile');
    if (elDesktop) elDesktop.textContent = count;
    if (elMobile) elMobile.textContent = count;
  }

  updateBusCount(count) {
    const elDesktop = document.getElementById('busVehicleCount');
    const elMobile = document.getElementById('busVehicleCountMobile');
    if (elDesktop) elDesktop.textContent = count;
    if (elMobile) elMobile.textContent = count;
  }

  /**
   * Cleanup
   */
  destroy() {
    this.stopAutoRefresh();

    // Remove layers
    [
      this.STOPS_LAYER,
      this.STOPS_LAYER + '-cluster',
      this.STOPS_LAYER + '-cluster-count',
      this.BUSES_MOVING_LAYER,
      this.BUSES_STOPPED_LAYER
    ].forEach(layer => {
      if (this.map.getLayer(layer)) {
        this.map.removeLayer(layer);
      }
    });

    // Remove sources
    [this.STOPS_SOURCE, this.BUSES_SOURCE].forEach(source => {
      if (this.map.getSource(source)) {
        this.map.removeSource(source);
      }
    });

    this.isInitialized = false;
    console.log('[BusLayer] Destroyed');
  }
}

// Make available globally
window.BusLayerManager = BusLayerManager;
