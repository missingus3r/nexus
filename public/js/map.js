let map;
let socket;
let incidentsSource;
let heatmapSource;
let neighborhoodsSource;

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
    const defaultCenterLat = -34.9011; // Montevideo (default)
    const defaultCenterLon = -56.1645;
    const defaultZoom = 12;

    // Initialize MapLibre GL map with default center
    map = new maplibregl.Map({
        container: 'map',
        style: 'https://tiles.openfreemap.org/styles/liberty', // OSM-based style
        center: [defaultCenterLon, defaultCenterLat],
        zoom: defaultZoom
    });

    // Expose map globally for external access
    window.map = map;

    map.on('load', () => {
        addNeighborhoodsLayer();
        addIncidentsLayer();
        addHeatmapLayer();

        // Load map data immediately
        loadMapData();

        // Try to center on user's location
        centerOnUserLocation();

        // Reload data after user location is set (in case the bbox changed)
        setTimeout(() => {
            loadMapData();
        }, 3000);
    });

    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    // Add geolocate control
    const geolocateControl = new maplibregl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
    });

    map.addControl(geolocateControl, 'top-right');

    // Automatically trigger geolocation on load
    map.on('load', () => {
        geolocateControl.trigger();
    });
}

/**
 * Center map on user's location
 */
function centerOnUserLocation() {
    if (!navigator.geolocation) {
        console.log('Geolocation not supported');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            console.log('Centering map on user location:', latitude, longitude);

            // Animate to user's location
            map.flyTo({
                center: [longitude, latitude],
                zoom: 13,
                essential: true, // This animation is considered essential
                duration: 2000
            });
        },
        (error) => {
            console.log('Error getting user location:', error.message);
            // Keep default center (Montevideo)
        },
        {
            timeout: 10000,
            maximumAge: 300000, // 5 minutes
            enableHighAccuracy: false
        }
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

    // Add outer glow layer for approximate locations (renders first, bottom layer)
    map.addLayer({
        id: 'incidents-approximate-glow',
        type: 'circle',
        source: 'incidents',
        filter: ['==', ['get', 'locationType'], 'approximate'],
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                10, ['*', ['/', ['coalesce', ['get', 'approximateRadius'], 100], 20], 1],
                16, ['*', ['/', ['coalesce', ['get', 'approximateRadius'], 100], 3], 1],
                20, ['*', ['coalesce', ['get', 'approximateRadius'], 100], 0.8]
            ],
            'circle-color': [
                'match', ['get', 'type'],
                'homicidio', '#d32f2f',
                'rapiña', '#f57c00',
                'hurto', '#fbc02d',
                'copamiento', '#c62828',
                '#757575' // default
            ],
            'circle-opacity': [
                'interpolate', ['linear'], ['zoom'],
                10, 0.1,
                16, 0.15,
                20, 0.2
            ],
            'circle-blur': 1
        }
    });

    // Add middle layer for approximate locations
    map.addLayer({
        id: 'incidents-approximate-middle',
        type: 'circle',
        source: 'incidents',
        filter: ['==', ['get', 'locationType'], 'approximate'],
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['zoom'],
                10, ['*', ['/', ['coalesce', ['get', 'approximateRadius'], 100], 30], 1],
                16, ['*', ['/', ['coalesce', ['get', 'approximateRadius'], 100], 5], 1],
                20, ['*', ['coalesce', ['get', 'approximateRadius'], 100], 0.5]
            ],
            'circle-color': [
                'match', ['get', 'type'],
                'homicidio', '#d32f2f',
                'rapiña', '#f57c00',
                'hurto', '#fbc02d',
                'copamiento', '#c62828',
                '#757575' // default
            ],
            'circle-opacity': [
                'interpolate', ['linear'], ['zoom'],
                10, 0.25,
                16, 0.3,
                20, 0.35
            ],
            'circle-blur': 0.8
        }
    });

    // Add center marker for approximate locations
    map.addLayer({
        id: 'incidents-approximate-center',
        type: 'circle',
        source: 'incidents',
        filter: ['==', ['get', 'locationType'], 'approximate'],
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['coalesce', ['get', 'severity'], 3],
                1, 8,
                5, 18
            ],
            'circle-color': [
                'match', ['get', 'type'],
                'homicidio', '#d32f2f',
                'rapiña', '#f57c00',
                'hurto', '#fbc02d',
                'copamiento', '#c62828',
                '#757575' // default
            ],
            'circle-opacity': 0.85,
            'circle-stroke-width': 3,
            'circle-stroke-color': '#fff',
            'circle-stroke-opacity': 0.9
        }
    });

    // Add circle layer for exact location incidents
    map.addLayer({
        id: 'incidents-circle',
        type: 'circle',
        source: 'incidents',
        filter: ['!=', ['get', 'locationType'], 'approximate'],
        paint: {
            'circle-radius': [
                'interpolate', ['linear'], ['coalesce', ['get', 'severity'], 3],
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

    // Add popup on click for exact locations
    map.on('click', 'incidents-circle', async (e) => {
        const props = e.features[0].properties;
        const incidentId = props.id;

        // Fetch full incident details
        const incidentDetails = await fetchIncidentDetails(incidentId);

        const popup = new maplibregl.Popup({
            maxWidth: '350px',
            className: 'incident-popup'
        })
            .setLngLat(e.lngLat)
            .setHTML(createIncidentPopupHTML(incidentDetails))
            .addTo(map);

        // Setup validation button listeners after popup is added
        setTimeout(() => {
            setupValidationButtons(incidentId);
        }, 100);
    });

    // Add popup on click for approximate locations
    map.on('click', 'incidents-approximate-center', async (e) => {
        const props = e.features[0].properties;
        const incidentId = props.id;

        // Fetch full incident details
        const incidentDetails = await fetchIncidentDetails(incidentId);

        const popup = new maplibregl.Popup({
            maxWidth: '350px',
            className: 'incident-popup'
        })
            .setLngLat(e.lngLat)
            .setHTML(createIncidentPopupHTML(incidentDetails))
            .addTo(map);

        // Setup validation button listeners after popup is added
        setTimeout(() => {
            setupValidationButtons(incidentId);
        }, 100);
    });

    // Change cursor on hover - exact locations
    map.on('mouseenter', 'incidents-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'incidents-circle', () => {
        map.getCanvas().style.cursor = '';
    });

    // Change cursor on hover - approximate locations
    map.on('mouseenter', 'incidents-approximate-center', () => {
        map.getCanvas().style.cursor = 'pointer';
    });

    map.on('mouseleave', 'incidents-approximate-center', () => {
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

function addNeighborhoodsLayer() {
    map.addSource('neighborhoods', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });

    // Add neighborhood fill layer (overlay with average color)
    map.addLayer({
        id: 'neighborhoods-fill',
        type: 'fill',
        source: 'neighborhoods',
        paint: {
            'fill-color': ['coalesce', ['get', 'averageColor'], '#cccccc'],
            'fill-opacity': 0.35
        }
    }, 'incidents-approximate-glow'); // Add below incidents layers

    // Add neighborhood border layer
    map.addLayer({
        id: 'neighborhoods-border',
        type: 'line',
        source: 'neighborhoods',
        paint: {
            'line-color': '#666666',
            'line-width': 1.5,
            'line-opacity': 0.6
        }
    }, 'incidents-approximate-glow'); // Add below incidents layers

    // Add popup on hover to show neighborhood name and stats
    map.on('mouseenter', 'neighborhoods-fill', (e) => {
        map.getCanvas().style.cursor = 'pointer';

        const props = e.features[0].properties;

        // Create a simple tooltip
        const tooltip = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: 'neighborhood-tooltip'
        })
            .setLngLat(e.lngLat)
            .setHTML(`
                <div style="padding: 8px;">
                    <strong>${props.nombre}</strong><br>
                    <small>${props.incidentCount} incidentes verificados</small>
                </div>
            `)
            .addTo(map);

        // Store tooltip reference
        map._neighborhoodTooltip = tooltip;
    });

    map.on('mouseleave', 'neighborhoods-fill', () => {
        map.getCanvas().style.cursor = '';

        // Remove tooltip
        if (map._neighborhoodTooltip) {
            map._neighborhoodTooltip.remove();
            map._neighborhoodTooltip = null;
        }
    });

    neighborhoodsSource = map.getSource('neighborhoods');
}

async function loadMapData() {
    try {
        const token = await window.authUtils.getAuthToken();

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

        console.log('Loaded incidents:', incidentsData.features?.length || 0);

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

        // Load neighborhoods (only those with incidents)
        const neighborhoodsResponse = await fetch(`/api/neighborhoods?withIncidents=true`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const neighborhoodsData = await neighborhoodsResponse.json();

        console.log('Loaded neighborhoods:', neighborhoodsData.features?.length || 0);

        if (neighborhoodsSource) {
            neighborhoodsSource.setData(neighborhoodsData);
        }
    } catch (error) {
        console.error('Error loading map data:', error);
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
    const layers = [
        'incidents-circle',
        'incidents-approximate-glow',
        'incidents-approximate-middle',
        'incidents-approximate-center'
    ];

    layers.forEach(layer => {
        if (map.getLayer(layer)) {
            map.setLayoutProperty(layer, 'visibility', show ? 'visible' : 'none');
        }
    });
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

    const token = await window.authUtils.getAuthToken();
    if (!token || !window.authUtils.isAuthenticated()) {
        toastWarning('Debes iniciar sesión para reportar incidentes');
        window.location.href = '/login';
        return;
    }

    // Check if location was selected
    if (!selectedLocation) {
        toastWarning('Por favor selecciona una ubicación en el mapa');
        return;
    }

    const form = e.target;
    const formData = new FormData(form);
    const locationType = formData.get('locationType');

    // Prepare location as JSON string (required for multipart/form-data)
    const location = {
        type: 'Point',
        coordinates: [selectedLocation.lng, selectedLocation.lat]
    };

    // Create new FormData with all fields including photos
    const submitData = new FormData();
    submitData.append('type', formData.get('type'));
    submitData.append('severity', formData.get('severity'));
    submitData.append('description', formData.get('description') || '');
    submitData.append('location', JSON.stringify(location));
    submitData.append('locationType', locationType);

    // Add radius for approximate locations
    if (locationType === 'approximate') {
        submitData.append('approximateRadius', formData.get('approximateRadius'));
    }

    // Add photos if any
    const photosInput = document.getElementById('photos');
    if (photosInput && photosInput.files) {
        for (let i = 0; i < photosInput.files.length; i++) {
            submitData.append('photos', photosInput.files[i]);
        }
    }

    try {
        const response = await fetch('/api/map/incidents', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
                // Don't set Content-Type - let browser set it with boundary
            },
            body: submitData
        });

        if (response.ok) {
            toastSuccess('Incidente reportado exitosamente. Aguardando validación.');
            document.getElementById('reportModal').classList.remove('active');
            document.getElementById('photoPreview').innerHTML = ''; // Clear photo preview
            form.reset();
            cancelLocationSelection();
            loadMapData();
        } else {
            const error = await response.json();
            toastError('Error: ' + (error.error || 'No se pudo reportar el incidente'));
        }
    } catch (error) {
        console.error('Error reporting incident:', error);
        toastError('Error al reportar el incidente');
    }
}

// Make cancelLocationSelection global so it can be called from inline onclick
window.cancelLocationSelection = cancelLocationSelection;

/**
 * Fetch full incident details including validations
 */
async function fetchIncidentDetails(incidentId) {
    try {
        const token = await window.authUtils.getAuthToken();
        const response = await fetch(`/api/map/incidents/${incidentId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            return await response.json();
        } else {
            console.error('Error fetching incident details');
            return null;
        }
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

/**
 * Create HTML for incident popup with validation buttons
 */
function createIncidentPopupHTML(incident) {
    if (!incident) {
        return '<p>Error al cargar detalles del incidente</p>';
    }

    const props = incident.properties || incident;
    const validations = incident.validations || [];

    // Status badge
    const statusColors = {
        'pending': '#ffa726',
        'verified': '#66bb6a',
        'rejected': '#ef5350'
    };
    const statusLabels = {
        'pending': 'Pendiente',
        'verified': 'Verificado',
        'rejected': 'Rechazado'
    };
    const status = props.status || 'pending';
    const statusColor = statusColors[status];
    const statusLabel = statusLabels[status];

    // Media section
    let mediaHTML = '';
    if (props.media && props.media.length > 0) {
        mediaHTML = '<div style="margin: 10px 0;">';
        props.media.forEach(m => {
            if (m.type === 'image') {
                mediaHTML += `<img src="${m.url}" style="width: 100%; max-height: 200px; object-fit: cover; border-radius: 4px; margin: 5px 0;">`;
            }
        });
        mediaHTML += '</div>';
    }

    // Validation section
    const validationScore = props.validationScore || 0;
    const validationCount = validations.length;

    let validationHTML = `
        <div style="margin: 10px 0; padding: 10px; background: #f5f5f5; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <strong>Validaciones:</strong> ${validationCount}
                    <br>
                    <small>Score: ${validationScore.toFixed(2)}</small>
                </div>
                <div style="padding: 4px 12px; background: ${statusColor}; color: white; border-radius: 12px; font-size: 0.85em;">
                    ${statusLabel}
                </div>
            </div>
        </div>
    `;

    // Check if user is authenticated (not guest)
    const isAuthenticated = window.authUtils.isAuthenticated();
    let actionsHTML = '';

    if (isAuthenticated && status === 'pending') {
        actionsHTML = `
            <div style="margin-top: 10px; display: flex; gap: 8px;">
                <button id="validate-valid-btn" style="flex: 1; padding: 8px; background: #66bb6a; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                    ✓ Válido
                </button>
                <button id="validate-invalid-btn" style="flex: 1; padding: 8px; background: #ef5350; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 500;">
                    ✗ No Válido
                </button>
            </div>
            <div id="validation-message" style="margin-top: 8px; padding: 8px; border-radius: 4px; display: none;"></div>
        `;
    } else if (!isAuthenticated) {
        actionsHTML = `
            <div style="margin-top: 10px; padding: 8px; background: #fff3cd; border-radius: 4px; font-size: 0.9em; text-align: center;">
                Inicia sesión para validar incidentes
            </div>
        `;
    } else if (status !== 'pending') {
        actionsHTML = `
            <div style="margin-top: 10px; padding: 8px; background: #e8f5e9; border-radius: 4px; font-size: 0.9em; text-align: center;">
                Este incidente ya fue ${statusLabel.toLowerCase()}
            </div>
        `;
    }

    // Location type info
    let locationHTML = '';
    if (props.locationType === 'approximate' && props.approximateRadius) {
        locationHTML = `
            <p style="margin: 4px 0; color: #666; font-size: 0.9em;">
                <strong>📍 Ubicación:</strong> Zona aproximada (~${props.approximateRadius}m de radio)
            </p>
        `;
    }

    return `
        <div style="font-family: system-ui, -apple-system, sans-serif;">
            <h3 style="margin: 0 0 8px 0; color: #333;">${props.type}</h3>
            <p style="margin: 4px 0; color: #666;">
                <strong>Severidad:</strong> ${props.severity}/5
            </p>
            ${locationHTML}
            ${props.description ? `<p style="margin: 8px 0; color: #555;">${props.description}</p>` : ''}
            ${mediaHTML}
            <p style="margin: 4px 0; font-size: 0.9em; color: #999;">
                ${new Date(props.createdAt).toLocaleString('es-UY')}
            </p>
            ${validationHTML}
            ${actionsHTML}
        </div>
    `;
}

/**
 * Setup validation button event listeners
 */
function setupValidationButtons(incidentId) {
    const validBtn = document.getElementById('validate-valid-btn');
    const invalidBtn = document.getElementById('validate-invalid-btn');

    if (validBtn) {
        validBtn.onclick = () => validateIncident(incidentId, 1);
    }

    if (invalidBtn) {
        invalidBtn.onclick = () => validateIncident(incidentId, -1);
    }
}

/**
 * Show incident popup (exposed globally)
 */
window.showIncidentPopup = async function(lon, lat, incidentId) {
    if (!map) return;

    try {
        // Fetch full incident details
        const incidentDetails = await fetchIncidentDetails(incidentId);

        const popup = new maplibregl.Popup({
            maxWidth: '350px',
            className: 'incident-popup'
        })
            .setLngLat([lon, lat])
            .setHTML(createIncidentPopupHTML(incidentDetails))
            .addTo(map);

        // Setup validation button listeners after popup is added
        setTimeout(() => {
            setupValidationButtons(incidentId);
        }, 100);
    } catch (error) {
        console.error('Error showing incident popup:', error);
    }
};

/**
 * Validate an incident
 */
async function validateIncident(incidentId, vote) {
    const messageDiv = document.getElementById('validation-message');

    // Disable buttons during validation
    const validBtn = document.getElementById('validate-valid-btn');
    const invalidBtn = document.getElementById('validate-invalid-btn');

    if (validBtn) validBtn.disabled = true;
    if (invalidBtn) invalidBtn.disabled = true;

    try {
        const token = await window.authUtils.getAuthToken();

        if (!token || !window.authUtils.isAuthenticated()) {
            showValidationMessage('Debes iniciar sesión para validar', 'error');
            return;
        }

        const response = await fetch(`/api/map/incidents/${incidentId}/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                vote: vote, // 1 = valid, -1 = invalid
                confidence: 0.8
            })
        });

        const data = await response.json();

        if (response.ok) {
            showValidationMessage(
                `✓ Validación registrada. ${vote === 1 ? 'Marcaste como válido' : 'Marcaste como no válido'}`,
                'success'
            );

            // Reload map data after a short delay
            setTimeout(() => {
                loadMapData();
            }, 2000);
        } else {
            let errorMessage = data.error || 'Error al validar';

            if (response.status === 403) {
                errorMessage = '⚠️ No puedes validar tu propio reporte';
            } else if (response.status === 409) {
                errorMessage = '⚠️ Ya validaste este incidente';
            }

            showValidationMessage(errorMessage, 'error');
        }
    } catch (error) {
        console.error('Error validating incident:', error);
        showValidationMessage('Error de conexión', 'error');
    } finally {
        // Re-enable buttons
        if (validBtn) validBtn.disabled = false;
        if (invalidBtn) invalidBtn.disabled = false;
    }
}

/**
 * Show validation message in popup
 */
function showValidationMessage(message, type) {
    const messageDiv = document.getElementById('validation-message');
    if (!messageDiv) return;

    const colors = {
        success: { bg: '#e8f5e9', text: '#2e7d32', border: '#66bb6a' },
        error: { bg: '#ffebee', text: '#c62828', border: '#ef5350' },
        info: { bg: '#e3f2fd', text: '#1565c0', border: '#42a5f5' }
    };

    const color = colors[type] || colors.info;

    messageDiv.style.display = 'block';
    messageDiv.style.background = color.bg;
    messageDiv.style.color = color.text;
    messageDiv.style.borderLeft = `4px solid ${color.border}`;
    messageDiv.textContent = message;
}

/**
 * Check if token is a guest token
 */
function isGuestToken(token) {
    try {
        // Decode JWT payload (without verification)
        const payload = JSON.parse(atob(token.split('.')[1]));

        // Check if it's a guest token
        return payload.sub === 'guest' || payload.type === 'guest';
    } catch (error) {
        console.error('Error decoding token:', error);
        return true; // Assume guest if error
    }
}
