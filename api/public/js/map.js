let map;
let socket;
let incidentsSource;
let heatmapSource;

// Location selection state
let isSelectingLocation = false;
let selectedLocation = null;
let locationMarker = null;
let approximateCircle = null;

// Initialize map on page load
document.addEventListener('DOMContentLoaded', () => {
    initializeMap();
    connectWebSocket();
    setupEventListeners();
});

function initializeMap() {
    const centerLat = -34.9011; // Montevideo
    const centerLon = -56.1645;
    const zoom = 12;

    // Initialize MapLibre GL map
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.openfreemap.org/styles/liberty', // OSM-based style
        center: [centerLon, centerLat],
        zoom: zoom
    });

    map.on('load', () => {
        addIncidentsLayer();
        addHeatmapLayer();
        loadMapData();
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add geolocate control
    map.addControl(
        new maplibregl.GeolocateControl({
            positionOptions: {
                enableHighAccuracy: true
            },
            trackUserLocation: true
        }),
        'top-right'
    );
}

function addIncidentsLayer() {
    map.addSource('incidents', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    // Add circle layer for incidents
    map.addLayer({
        id: 'incidents-circle',
        type: 'circle',
        source: 'incidents',
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['get', 'severity'],
                1, 6,
                5, 15
            ],
            'circle-color': [
                'match', ['get', 'type'],
                'homicidio', '#d32f2f',
                'rapiña', '#f57c00',
                'hurto', '#fbc02d',
                'copamiento', '#c62828',
                '#757575' // default
            ],
            'circle-opacity': 0.7,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#fff'
        }
    });

    // Add popup on click
    map.on('click', 'incidents-circle', (e) => {
        const props = e.features[0].properties;
        new maplibregl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
                <h3>${props.type}</h3>
                <p>Severidad: ${props.severity}/5</p>
                <p>${props.description || 'Sin descripción'}</p>
                <p><small>${new Date(props.createdAt).toLocaleString()}</small></p>
            `)
            .addTo(map);
    });

    // Change cursor on hover
    map.on('mouseenter', 'incidents-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'incidents-circle', () => {
        map.getCanvas().style.cursor = '';
    });

    incidentsSource = map.getSource('incidents');
}

function addHeatmapLayer() {
    map.addSource('heatmap', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    // Add heatmap layer
    map.addLayer({
        id: 'heatmap-layer',
        type: 'heatmap',
        source: 'heatmap',
        paint: {
            // Increase weight as score increases
            'heatmap-weight': [
                'interpolate', ['linear'], ['get', 'score'],
                0, 0,
                10, 1
            ],
            // Increase intensity as zoom level increases
            'heatmap-intensity': [
                'interpolate', ['linear'], ['zoom'],
                0, 1,
                15, 3
            ],
            // Color ramp for heatmap
            'heatmap-color': [
                'interpolate', ['linear'], ['heatmap-density'],
                0, 'rgba(0, 0, 255, 0)',
                0.1, 'royalblue',
                0.3, 'cyan',
                0.5, 'lime',
                0.7, 'yellow',
                1, 'red'
            ],
            // Adjust the heatmap radius by zoom level
            'heatmap-radius': [
                'interpolate', ['linear'], ['zoom'],
                0, 2,
                15, 30
            ],
            // Transition from heatmap to circle layer by zoom level
            'heatmap-opacity': [
                'interpolate', ['linear'], ['zoom'],
                7, 1,
                15, 0
            ]
        }
    });

    heatmapSource = map.getSource('heatmap');
}

async function loadMapData() {
    try {
        const token = localStorage.getItem('jwt') || await getGuestToken();

        // Get current map bounds
        const bounds = map.getBounds();
        const bbox = `${bounds.getWest()},${bounds.getSouth()},${bounds.getEast()},${bounds.getNorth()}`;

        // Load incidents
        const typeFilter = document.getElementById('typeFilter')?.value || '';
        let incidentsUrl = `/api/map/incidents?bbox=${bbox}`;
        if (typeFilter && typeFilter !== 'todos') {
            incidentsUrl += `&type=${typeFilter}`;
        }

        const incidentsResponse = await fetch(incidentsUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const incidentsData = await incidentsResponse.json();
        if (incidentsSource) {
            incidentsSource.setData(incidentsData);
        }

        // Load heatmap
        const heatmapResponse = await fetch(`/api/heatmap?bbox=${bbox}&precision=7`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const heatmapData = await heatmapResponse.json();
        if (heatmapSource) {
            heatmapSource.setData(heatmapData);
        }
    } catch (error) {
        console.error('Error loading map data:', error);
    }
}

async function getGuestToken() {
    try {
        const response = await fetch('/api/auth/guest-token', { method: 'POST' });
        const data = await response.json();
        localStorage.setItem('jwt', data.token);
        return data.token;
    } catch (error) {
        console.error('Error getting guest token:', error);
        return null;
    }
}

function setupEventListeners() {
    // Type filter change
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', loadMapData);
    }

    // Layer toggles
    const showIncidents = document.getElementById('showIncidents');
    if (showIncidents) {
        showIncidents.addEventListener('change', (e) => {
            toggleIncidentsLayer(e.target.checked);
        });
    }

    const showHeatmap = document.getElementById('showHeatmap');
    if (showHeatmap) {
        showHeatmap.addEventListener('change', (e) => {
            toggleHeatmapLayer(e.target.checked);
        });
    }

    // Report button
    const reportBtn = document.getElementById('reportBtn');
    if (reportBtn) {
        reportBtn.addEventListener('click', () => {
            document.getElementById('reportModal').classList.add('active');
        });
    }

    // Modal close
    const modalClose = document.getElementById('modalClose');
    if (modalClose) {
        modalClose.addEventListener('click', () => {
            document.getElementById('reportModal').classList.remove('active');
            cancelLocationSelection();
        });
    }

    // Report form submit
    const reportForm = document.getElementById('reportForm');
    if (reportForm) {
        reportForm.addEventListener('submit', handleReportSubmit);
    }

    // Location type change
    const locationType = document.getElementById('locationType');
    if (locationType) {
        locationType.addEventListener('change', handleLocationTypeChange);
    }

    // Select location button
    const selectLocationBtn = document.getElementById('selectLocationBtn');
    if (selectLocationBtn) {
        selectLocationBtn.addEventListener('click', startLocationSelection);
    }

    // Approximate radius change
    const approximateRadius = document.getElementById('approximateRadius');
    if (approximateRadius) {
        approximateRadius.addEventListener('input', (e) => {
            document.getElementById('radiusValue').textContent = e.target.value + 'm';
            updateApproximateCircle(parseInt(e.target.value));
        });
    }

    // Map click for location selection
    map.on('click', handleMapClick);

    // Reload data when map moves
    map.on('moveend', () => {
        loadMapData();
    });
}

function toggleIncidentsLayer(show) {
    if (map.getLayer('incidents-circle')) {
        map.setLayoutProperty('incidents-circle', 'visibility', show ? 'visible' : 'none');
    }
}

function toggleHeatmapLayer(show) {
    if (map.getLayer('heatmap-layer')) {
        map.setLayoutProperty('heatmap-layer', 'visibility', show ? 'visible' : 'none');
    }
}

function connectWebSocket() {
    const apiUrl = window.location.origin;
    socket = io(apiUrl, {
        transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
        console.log('WebSocket connected');
    });

    socket.on('new-incident', (data) => {
        console.log('New incident:', data);
        // Reload map data
        loadMapData();
    });

    socket.on('heatmap-updated', (data) => {
        console.log('Heatmap updated:', data);
        loadMapData();
    });

    socket.on('incident-validated', (data) => {
        console.log('Incident validated:', data);
        loadMapData();
    });
}

function handleLocationTypeChange(e) {
    const radiusGroup = document.getElementById('radiusGroup');
    const helpText = document.getElementById('locationTypeHelp');

    if (e.target.value === 'approximate') {
        radiusGroup.style.display = 'block';
        helpText.textContent = 'Haz click en el mapa para marcar el centro de la zona aproximada';
    } else {
        radiusGroup.style.display = 'none';
        helpText.textContent = 'Haz click en el mapa para marcar la ubicación exacta';
    }

    // Clear existing selection
    if (selectedLocation) {
        cancelLocationSelection();
    }
}

function startLocationSelection() {
    isSelectingLocation = true;
    const btn = document.getElementById('selectLocationBtn');
    btn.textContent = '🎯 Click en el mapa...';
    btn.style.background = 'var(--warning-color)';

    // Change cursor
    map.getCanvas().style.cursor = 'crosshair';

    // Minimize modal to allow map clicks
    const modal = document.getElementById('reportModal');
    modal.classList.add('minimized');

    // Disable pointer events on modal to allow clicks through
    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.pointerEvents = 'none';
    }
}

function handleMapClick(e) {
    if (!isSelectingLocation) return;

    // Prevent click on incidents
    const features = map.queryRenderedFeatures(e.point, { layers: ['incidents-circle'] });
    if (features.length > 0) return;

    selectedLocation = {
        lng: e.lngLat.lng,
        lat: e.lngLat.lat
    };

    // Update UI
    const btn = document.getElementById('selectLocationBtn');
    btn.textContent = '✓ Ubicación Seleccionada';
    btn.style.background = 'var(--success-color)';

    document.getElementById('selectedLat').textContent = selectedLocation.lat.toFixed(6);
    document.getElementById('selectedLon').textContent = selectedLocation.lng.toFixed(6);
    document.getElementById('locationInfo').style.display = 'block';

    // Restore cursor
    map.getCanvas().style.cursor = '';

    // Restore modal
    const modal = document.getElementById('reportModal');
    modal.classList.remove('minimized');

    const modalContent = modal.querySelector('.modal-content');
    if (modalContent) {
        modalContent.style.pointerEvents = '';
    }

    isSelectingLocation = false;

    // Add marker
    updateLocationMarker();

    // Add approximate circle if needed
    const locationType = document.getElementById('locationType').value;
    if (locationType === 'approximate') {
        const radius = parseInt(document.getElementById('approximateRadius').value);
        updateApproximateCircle(radius);
    }
}

function updateLocationMarker() {
    // Remove existing marker
    if (locationMarker) {
        locationMarker.remove();
    }

    if (!selectedLocation) return;

    // Create new marker
    const el = document.createElement('div');
    el.className = 'location-marker';
    el.style.cssText = `
        width: 30px;
        height: 30px;
        background: var(--danger-color);
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
    `;

    locationMarker = new maplibregl.Marker({ element: el })
        .setLngLat([selectedLocation.lng, selectedLocation.lat])
        .addTo(map);
}

function updateApproximateCircle(radius) {
    if (!selectedLocation) return;

    // Remove existing circle
    if (map.getSource('approximate-circle')) {
        map.removeLayer('approximate-circle-fill');
        map.removeLayer('approximate-circle-outline');
        map.removeSource('approximate-circle');
    }

    // Create circle GeoJSON
    const center = [selectedLocation.lng, selectedLocation.lat];
    const points = 64;
    const km = radius / 1000;
    const ret = [];
    const distanceX = km / (111.32 * Math.cos(selectedLocation.lat * Math.PI / 180));
    const distanceY = km / 110.574;

    for (let i = 0; i < points; i++) {
        const theta = (i / points) * (2 * Math.PI);
        const x = distanceX * Math.cos(theta);
        const y = distanceY * Math.sin(theta);
        ret.push([center[0] + x, center[1] + y]);
    }
    ret.push(ret[0]);

    const circleGeoJSON = {
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: [ret]
        }
    };

    // Add source and layers
    map.addSource('approximate-circle', {
        type: 'geojson',
        data: circleGeoJSON
    });

    map.addLayer({
        id: 'approximate-circle-fill',
        type: 'fill',
        source: 'approximate-circle',
        paint: {
            'fill-color': 'var(--primary-color)',
            'fill-opacity': 0.2
        }
    });

    map.addLayer({
        id: 'approximate-circle-outline',
        type: 'line',
        source: 'approximate-circle',
        paint: {
            'line-color': 'var(--primary-color)',
            'line-width': 2,
            'line-dasharray': [2, 2]
        }
    });
}

function cancelLocationSelection() {
    isSelectingLocation = false;
    selectedLocation = null;

    // Remove marker
    if (locationMarker) {
        locationMarker.remove();
        locationMarker = null;
    }

    // Remove circle
    if (map.getSource('approximate-circle')) {
        map.removeLayer('approximate-circle-fill');
        map.removeLayer('approximate-circle-outline');
        map.removeSource('approximate-circle');
    }

    // Reset UI
    const btn = document.getElementById('selectLocationBtn');
    if (btn) {
        btn.textContent = '📍 Seleccionar en el Mapa';
        btn.style.background = '';
    }

    const locationInfo = document.getElementById('locationInfo');
    if (locationInfo) {
        locationInfo.style.display = 'none';
    }

    // Restore cursor
    map.getCanvas().style.cursor = '';

    // Restore modal if minimized
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.classList.remove('minimized');
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.pointerEvents = '';
        }
    }
}

async function handleReportSubmit(e) {
    e.preventDefault();

    const token = localStorage.getItem('jwt');
    if (!token) {
        alert('Debes iniciar sesión para reportar incidentes');
        window.location.href = '/login';
        return;
    }

    // Check if location was selected
    if (!selectedLocation) {
        alert('Por favor selecciona una ubicación en el mapa');
        return;
    }

    const formData = new FormData(e.target);
    const locationType = formData.get('locationType');

    const data = {
        type: formData.get('type'),
        severity: parseInt(formData.get('severity')),
        description: formData.get('description'),
        location: {
            type: 'Point',
            coordinates: [selectedLocation.lng, selectedLocation.lat]
        },
        locationType: locationType
    };

    // Add radius for approximate locations
    if (locationType === 'approximate') {
        data.approximateRadius = parseInt(formData.get('approximateRadius'));
    }

    try {
        const response = await fetch('/api/map/incidents', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert('Incidente reportado exitosamente. Aguardando validación.');
            document.getElementById('reportModal').classList.remove('active');
            e.target.reset();
            cancelLocationSelection();
            loadMapData();
        } else {
            const error = await response.json();
            alert('Error: ' + (error.error || 'No se pudo reportar el incidente'));
        }
    } catch (error) {
        console.error('Error reporting incident:', error);
        alert('Error al reportar el incidente');
    }
}

// Make cancelLocationSelection global so it can be called from inline onclick
window.cancelLocationSelection = cancelLocationSelection;
