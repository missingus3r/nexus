// Severity defaults and explanations for each incident type
const incidentSeverity = {
    'homicidio': {
        value: 5,
        reason: 'Máxima severidad - pérdida de vida humana. Delito más grave contra la persona.'
    },
    'rapiña': {
        value: 4,
        reason: 'Alta severidad - uso de violencia o intimidación directa. Riesgo inmediato para las víctimas.'
    },
    'copamiento': {
        value: 5,
        reason: 'Máxima severidad - violencia extrema organizada. Múltiples víctimas y alto riesgo.'
    },
    'violencia_domestica': {
        value: 4,
        reason: 'Alta severidad - riesgo de vida en entorno familiar. Requiere intervención urgente.'
    },
    'narcotrafico': {
        value: 3,
        reason: 'Severidad media-alta - problema social y de salud pública. Impacto comunitario.'
    },
    'hurto': {
        value: 2,
        reason: 'Severidad media-baja - delito contra la propiedad sin violencia directa.'
    },
    'otro': {
        value: 3,
        reason: 'Severidad media - evalúa según el contexto específico del incidente.'
    }
};

// Severity colors
const severityColors = {
    1: '#4caf50', // green
    2: '#8bc34a', // light green
    3: '#ffc107', // yellow
    4: '#ff9800', // orange
    5: '#f44336'  // red
};

// Update severity when incident type changes
document.getElementById('type')?.addEventListener('change', (e) => {
    const type = e.target.value;
    const severityInput = document.getElementById('severity');
    const severityValue = document.getElementById('severityValue');
    const severityExplanation = document.getElementById('severityExplanation');
    const severityReason = document.getElementById('severityReason');

    if (type && incidentSeverity[type]) {
        const config = incidentSeverity[type];
        severityInput.value = config.value;
        severityValue.textContent = config.value;
        severityReason.textContent = config.reason;
        severityExplanation.style.display = 'block';

        // Update color
        const color = severityColors[config.value];
        severityExplanation.style.borderLeft = `4px solid ${color}`;
    } else {
        severityExplanation.style.display = 'none';
    }
});

// Update severity value display and color on manual change
document.getElementById('severity')?.addEventListener('input', (e) => {
    const value = e.target.value;
    const severityValueDisplay = document.getElementById('severityValue');
    severityValueDisplay.textContent = value;

    // Add color indicator
    const color = severityColors[value];
    if (color) {
        severityValueDisplay.style.color = color;
        severityValueDisplay.style.fontWeight = 'bold';
    }
});

document.getElementById('description')?.addEventListener('input', (e) => {
    document.getElementById('charCount').textContent = e.target.value.length;
});

// Function to close report modal and clean up
function closeReportModal() {
    document.getElementById('reportModal').classList.remove('active');
    document.getElementById('reportForm').reset();
    document.getElementById('photoPreview').innerHTML = '';
    document.getElementById('photos').value = '';

    // Reset severity to default
    const severityInput = document.getElementById('severity');
    const severityValue = document.getElementById('severityValue');
    const severityExplanation = document.getElementById('severityExplanation');
    severityInput.value = 3;
    severityValue.textContent = '3';
    severityValue.style.color = '';
    severityValue.style.fontWeight = '';
    severityExplanation.style.display = 'none';

    if (window.cancelLocationSelection) {
        window.cancelLocationSelection();
    }
}
window.closeReportModal = closeReportModal;

// Also close when clicking the X button
document.getElementById('modalClose')?.addEventListener('click', closeReportModal);

// Photo preview functionality
document.getElementById('photos')?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    const preview = document.getElementById('photoPreview');

    // Validate max 3 photos
    if (files.length > 3) {
        toastWarning('Máximo 3 fotos permitidas');
        e.target.value = '';
        preview.innerHTML = '';
        return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const invalidFiles = files.filter(f => f.size > maxSize);
    if (invalidFiles.length > 0) {
        toastWarning('Cada foto debe ser menor a 5MB');
        e.target.value = '';
        preview.innerHTML = '';
        return;
    }

    // Show preview
    preview.innerHTML = '';
    files.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.style.width = '80px';
            img.style.height = '80px';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '4px';
            img.style.border = '1px solid var(--border-color)';
            img.title = file.name;
            preview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
});

// Mobile bottom sheets functionality
function openBottomSheet(sheetId) {
    const sheet = document.getElementById(sheetId);
    if (sheet) {
        sheet.classList.add('active');
    }
}

function closeBottomSheet(sheet) {
    sheet.classList.remove('active');
}

// Filtros button
document.getElementById('filtersBtn')?.addEventListener('click', () => {
    openBottomSheet('filtersModal');
});

// Layers button
document.getElementById('layersBtn')?.addEventListener('click', () => {
    openBottomSheet('layersModal');
});

// Report button mobile
document.getElementById('reportBtnMobile')?.addEventListener('click', () => {
    document.getElementById('reportModal').classList.add('active');
});

// Close buttons for bottom sheets
document.querySelectorAll('.close-sheet').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const sheet = e.target.closest('.bottom-sheet');
        closeBottomSheet(sheet);
    });
});

// Click outside to close
document.querySelectorAll('.bottom-sheet').forEach(sheet => {
    sheet.addEventListener('click', (e) => {
        if (e.target === sheet) {
            closeBottomSheet(sheet);
        }
    });
});

// Sync filters between mobile and desktop
const typeFilter = document.getElementById('typeFilter');
const typeFilterMobile = document.getElementById('typeFilterMobile');

typeFilter?.addEventListener('change', (e) => {
    if (typeFilterMobile) typeFilterMobile.value = e.target.value;
});

typeFilterMobile?.addEventListener('change', (e) => {
    if (typeFilter) typeFilter.value = e.target.value;
    closeBottomSheet(document.getElementById('filtersModal'));
});

// Sync layers checkboxes
const showIncidents = document.getElementById('showIncidents');
const showIncidentsMobile = document.getElementById('showIncidentsMobile');
const showHeatmap = document.getElementById('showHeatmap');
const showHeatmapMobile = document.getElementById('showHeatmapMobile');

showIncidents?.addEventListener('change', (e) => {
    if (showIncidentsMobile) showIncidentsMobile.checked = e.target.checked;
});

showIncidentsMobile?.addEventListener('change', (e) => {
    if (showIncidents) showIncidents.checked = e.target.checked;
});

showHeatmap?.addEventListener('change', (e) => {
    if (showHeatmapMobile) showHeatmapMobile.checked = e.target.checked;
});

showHeatmapMobile?.addEventListener('change', (e) => {
    if (showHeatmap) showHeatmap.checked = e.target.checked;
});

/**
 * ============================================
 * BUS LAYER CONTROLS SYNCHRONIZATION
 * ============================================
 */

// Master toggle for buses
const showBuses = document.getElementById('showBuses');
const showBusesMobile = document.getElementById('showBusesMobile');
const busSubControls = document.getElementById('busSubControls');
const busSubControlsMobile = document.getElementById('busSubControlsMobile');

// Sync master toggle desktop -> mobile
showBuses?.addEventListener('change', (e) => {
    if (showBusesMobile) showBusesMobile.checked = e.target.checked;

    // Show/hide sub-controls
    if (busSubControls) {
        busSubControls.classList.toggle('hidden', !e.target.checked);
    }
    if (busSubControlsMobile) {
        busSubControlsMobile.classList.toggle('hidden', !e.target.checked);
    }

    // Toggle all bus layers
    if (window.toggleBusLayers) {
        window.toggleBusLayers(e.target.checked);
    }
});

// Sync master toggle mobile -> desktop
showBusesMobile?.addEventListener('change', (e) => {
    if (showBuses) showBuses.checked = e.target.checked;

    // Show/hide sub-controls
    if (busSubControls) {
        busSubControls.classList.toggle('hidden', !e.target.checked);
    }
    if (busSubControlsMobile) {
        busSubControlsMobile.classList.toggle('hidden', !e.target.checked);
    }

    // Toggle all bus layers
    if (window.toggleBusLayers) {
        window.toggleBusLayers(e.target.checked);
    }
});

// Bus stops toggle
const showBusStops = document.getElementById('showBusStops');
const showBusStopsMobile = document.getElementById('showBusStopsMobile');

showBusStops?.addEventListener('change', (e) => {
    if (showBusStopsMobile) showBusStopsMobile.checked = e.target.checked;
    if (window.toggleBusStops) {
        window.toggleBusStops(e.target.checked);
    }
});

showBusStopsMobile?.addEventListener('change', (e) => {
    if (showBusStops) showBusStops.checked = e.target.checked;
    if (window.toggleBusStops) {
        window.toggleBusStops(e.target.checked);
    }
});

// Bus vehicles toggle
const showBusVehicles = document.getElementById('showBusVehicles');
const showBusVehiclesMobile = document.getElementById('showBusVehiclesMobile');

showBusVehicles?.addEventListener('change', (e) => {
    if (showBusVehiclesMobile) showBusVehiclesMobile.checked = e.target.checked;
    if (window.toggleBusVehicles) {
        window.toggleBusVehicles(e.target.checked);
    }
});

showBusVehiclesMobile?.addEventListener('change', (e) => {
    if (showBusVehicles) showBusVehicles.checked = e.target.checked;
    if (window.toggleBusVehicles) {
        window.toggleBusVehicles(e.target.checked);
    }
});

// Bus line filter
const busLineFilter = document.getElementById('busLineFilter');
const busLineFilterMobile = document.getElementById('busLineFilterMobile');

busLineFilter?.addEventListener('change', (e) => {
    if (busLineFilterMobile) busLineFilterMobile.value = e.target.value;
    if (window.filterBusByLine) {
        window.filterBusByLine(e.target.value);
    }
});

busLineFilterMobile?.addEventListener('change', (e) => {
    if (busLineFilter) busLineFilter.value = e.target.value;
    if (window.filterBusByLine) {
        window.filterBusByLine(e.target.value);
    }
});

// Auto-refresh toggle
const autoBusRefresh = document.getElementById('autoBusRefresh');
const autoBusRefreshMobile = document.getElementById('autoBusRefreshMobile');

autoBusRefresh?.addEventListener('change', (e) => {
    if (autoBusRefreshMobile) autoBusRefreshMobile.checked = e.target.checked;
    if (window.toggleBusAutoRefresh) {
        window.toggleBusAutoRefresh(e.target.checked);
    }
});

autoBusRefreshMobile?.addEventListener('change', (e) => {
    if (autoBusRefresh) autoBusRefresh.checked = e.target.checked;
    if (window.toggleBusAutoRefresh) {
        window.toggleBusAutoRefresh(e.target.checked);
    }
});

// Initialize bus controls state on load
document.addEventListener('DOMContentLoaded', () => {
    // Set initial state of sub-controls
    const busesEnabled = showBuses?.checked || false;
    if (busSubControls) {
        busSubControls.classList.toggle('hidden', !busesEnabled);
    }
    if (busSubControlsMobile) {
        busSubControlsMobile.classList.toggle('hidden', !busesEnabled);
    }
});

/**
 * Sync count badges between desktop and mobile
 */
function updateBusCountBadges(stopCount, vehicleCount) {
    const stopBadges = document.querySelectorAll('#busStopCount, #busStopCountMobile');
    const vehicleBadges = document.querySelectorAll('#busVehicleCount, #busVehicleCountMobile');

    stopBadges.forEach(badge => {
        if (badge) badge.textContent = stopCount;
    });

    vehicleBadges.forEach(badge => {
        if (badge) badge.textContent = vehicleCount;
    });
}

// Expose globally
window.updateBusCountBadges = updateBusCountBadges;

// Incidents List Modal
function openIncidentsListModal() {
    const modal = document.getElementById('incidentsListModal');
    modal.classList.add('active');
    loadIncidentsList();
}

function closeIncidentsListModal() {
    const modal = document.getElementById('incidentsListModal');
    modal.classList.remove('active');
}

async function loadIncidentsList() {
    const content = document.getElementById('incidentsListContent');
    content.innerHTML = '<p class="text-center">Cargando incidentes...</p>';

    try {
        const response = await fetch('/map/incidents?limit=20', {
            credentials: 'include'
        });

        const data = await response.json();
        displayIncidentsList(data.features);
    } catch (error) {
        console.error('Error loading incidents list:', error);
        content.innerHTML = '<p class="text-center" style="color: var(--danger-color);">Error al cargar incidentes</p>';
    }
}

function displayIncidentsList(incidents) {
    const content = document.getElementById('incidentsListContent');

    if (!incidents || incidents.length === 0) {
        content.innerHTML = `
            <div class="incidents-empty-state">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">No hay incidentes disponibles</p>
                <p style="font-size: 0.9rem;">Aún no se han reportado incidentes en esta área</p>
            </div>
        `;
        return;
    }

    const statusColors = {
        'pending': '#ffa726',
        'verified': '#66bb6a',
        'rejected': '#ef5350',
        'auto_verified': '#2196f3'
    };
    const statusLabels = {
        'pending': 'Pendiente',
        'verified': 'Verificado',
        'rejected': 'Rechazado',
        'auto_verified': 'Auto-verificado'
    };

    // Check if user is admin
    const isAdmin = window.authConfig?.user?.role === 'admin';

    content.innerHTML = incidents.map(incident => {
        const props = incident.properties;
        const coords = incident.geometry.coordinates;
        const statusColor = statusColors[props.status] || '#999';
        const statusLabel = statusLabels[props.status] || props.status;
        const date = new Date(props.createdAt).toLocaleDateString('es-UY', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Edit button for admins
        const editButton = isAdmin ? `
            <button
                onclick="openEditIncidentModal('${incident.properties.id}')"
                class="incident-card-btn"
                style="background: var(--warning-color); margin-top: 0.5rem;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Editar Incidente
            </button>
        ` : '';

        return `
            <div class="incident-card">
                <div class="incident-card-header">
                    <div>
                        <h4 class="incident-card-title">${props.type}</h4>
                        <div class="incident-card-date">${date}</div>
                    </div>
                    <span class="incident-card-status" style="background: ${statusColor}; color: white;">
                        ${statusLabel}
                    </span>
                </div>
                <div class="incident-card-reporter">
                    <strong>Reportado por:</strong>
                    <span>${props.reporterUid || 'Anónimo'}</span>
                </div>
                ${props.description ? `<div class="incident-card-description">${props.description}</div>` : ''}
                <button
                    onclick="centerMapOnIncident(${coords[0]}, ${coords[1]}, '${incident.properties.id}')"
                    class="incident-card-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                        <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    Ver en el Mapa
                </button>
                ${editButton}
            </div>
        `;
    }).join('');
}

// Center map on incident
window.centerMapOnIncident = function(lon, lat, incidentId) {
    closeIncidentsListModal();

    if (window.map) {
        window.map.flyTo({
            center: [lon, lat],
            zoom: 16,
            essential: true,
            duration: 2000
        });

        // Wait for animation to complete, then show popup
        setTimeout(() => {
            if (window.showIncidentPopup) {
                window.showIncidentPopup(lon, lat, incidentId);
            }
        }, 2100);
    }
};


// Event listeners for incidents list buttons
document.getElementById('incidentsListBtn')?.addEventListener('click', openIncidentsListModal);
document.getElementById('incidentsListBtnDesktop')?.addEventListener('click', openIncidentsListModal);
document.getElementById('incidentsListModalClose')?.addEventListener('click', closeIncidentsListModal);

// Close modal when clicking outside
document.getElementById('incidentsListModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'incidentsListModal') {
        closeIncidentsListModal();
    }
});

// Welcome Modal Logic
function closeWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    modal.classList.remove('active');

    // Save to preferences
    if (window.PreferencesService) {
        window.PreferencesService.setWelcomeModal('centinelWelcomeShown', true);
    }
}

async function checkAndShowWelcomeModal() {
    // Wait for PreferencesService to be available
    while (!window.PreferencesService) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Initialize service and get modal status
    const hasSeenWelcome = await window.PreferencesService.getWelcomeModal('centinelWelcomeShown');

    if (!hasSeenWelcome) {
        const modal = document.getElementById('welcomeModal');
        // Show modal after a short delay to ensure page is loaded
        setTimeout(() => {
            modal.classList.add('active');
        }, 500);
    }
}

// Event listeners for welcome modal
document.getElementById('welcomeModalClose')?.addEventListener('click', closeWelcomeModal);

// Close welcome modal when clicking outside
document.getElementById('welcomeModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'welcomeModal') {
        closeWelcomeModal();
    }
});

// Show welcome modal on page load if not shown before
document.addEventListener('DOMContentLoaded', checkAndShowWelcomeModal);

// ============================================
// MOBILITY APPS MODAL
// ============================================

function openMobilityAppsModal() {
    const modal = document.getElementById('mobilityAppsModal');
    modal.classList.add('active');
}

function closeMobilityAppsModal() {
    const modal = document.getElementById('mobilityAppsModal');
    modal.classList.remove('active');
}

// Event listeners for mobility apps modal
document.getElementById('mobilityAppsBtn')?.addEventListener('click', openMobilityAppsModal);
document.getElementById('mobilityAppsModalClose')?.addEventListener('click', closeMobilityAppsModal);

// Close modal when clicking outside
document.getElementById('mobilityAppsModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'mobilityAppsModal') {
        closeMobilityAppsModal();
    }
});

// ============================================
// EDIT INCIDENT MODAL (ADMIN ONLY)
// ============================================

// Global variable to store current sources
let currentIncidentSources = [];

window.openEditIncidentModal = async function(incidentId) {
    const modal = document.getElementById('editIncidentModal');
    modal.classList.add('active');

    // Reset sources
    currentIncidentSources = [];

    // Load incident data
    try {
        const response = await fetch(`/map/incidents/${incidentId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Error al cargar el incidente');
        }

        const incident = await response.json();
        const props = incident.properties || incident;

        // Populate form
        document.getElementById('editIncidentId').value = props.id;
        document.getElementById('editType').value = props.type;
        document.getElementById('editSeverity').value = props.severity;
        document.getElementById('editDescription').value = props.description || '';
        document.getElementById('editStatus').value = props.status;
        document.getElementById('editHidden').checked = props.hidden || false;
        document.getElementById('editHiddenReason').value = props.hiddenReason || '';

        // Load source news
        if (props.sourceNews && props.sourceNews.length > 0) {
            currentIncidentSources = props.sourceNews.map(news => ({
                newsId: news.newsId || news._id,
                title: news.title,
                url: news.url,
                source: news.source,
                addedAt: news.addedAt
            }));
        }

        // Display current sources
        displayCurrentSources();

        // Toggle hidden reason field
        document.getElementById('editHiddenReasonGroup').style.display =
            props.hidden ? 'block' : 'none';
    } catch (error) {
        console.error('Error loading incident:', error);
        toastError('Error al cargar los datos del incidente');
    }
}

window.closeEditIncidentModal = function() {
    const modal = document.getElementById('editIncidentModal');
    modal.classList.remove('active');
    document.getElementById('editIncidentForm').reset();
    document.getElementById('newsSearch').value = '';
    document.getElementById('newsSearchResults').style.display = 'none';
    currentIncidentSources = [];
}

// Display current sources
function displayCurrentSources() {
    const container = document.getElementById('currentSourcesContainer');

    if (!currentIncidentSources || currentIncidentSources.length === 0) {
        container.innerHTML = `
            <div style="color: var(--text-secondary); font-size: 0.9rem; padding: 0.5rem;">
                No hay fuentes asociadas
            </div>
        `;
        return;
    }

    container.innerHTML = currentIncidentSources.map(news => `
        <div style="display: flex; justify-content: space-between; align-items: start; padding: 0.75rem; background: var(--background); border: 1px solid var(--border-color); border-radius: 6px;">
            <div style="flex: 1;">
                <div style="font-weight: 500; margin-bottom: 0.25rem;">${news.title}</div>
                <div style="font-size: 0.85rem; color: var(--text-secondary);">
                    ${news.source} • <a href="${news.url}" target="_blank" style="color: var(--primary-color);">Ver noticia</a>
                </div>
            </div>
            <button
                type="button"
                class="remove-source-btn"
                data-news-id="${news.newsId}"
                style="background: var(--danger-color); color: white; border: none; padding: 0.25rem 0.75rem; border-radius: 4px; cursor: pointer; font-size: 0.85rem; margin-left: 1rem;">
                Quitar
            </button>
        </div>
    `).join('');
}

// Handle remove source button clicks using event delegation
document.addEventListener('click', function(e) {
    const removeBtn = e.target.closest('.remove-source-btn');
    if (removeBtn) {
        const newsId = removeBtn.getAttribute('data-news-id');
        if (newsId) {
            currentIncidentSources = currentIncidentSources.filter(news => news.newsId !== newsId);
            displayCurrentSources();
            toastSuccess('Fuente eliminada. Guarda los cambios para confirmar.');
        }
    }
});

// Search news with debounce
let searchTimeout;
document.getElementById('newsSearch')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length < 2) {
        document.getElementById('newsSearchResults').style.display = 'none';
        return;
    }

    searchTimeout = setTimeout(async () => {
        await searchNews(query);
    }, 300);
});

// Search news function
async function searchNews(query) {
    const resultsContainer = document.getElementById('newsSearchResults');

    try {
        resultsContainer.style.display = 'block';
        resultsContainer.innerHTML = `
            <div style="padding: 1rem; text-align: center; color: var(--text-secondary);">
                Buscando...
            </div>
        `;

        const response = await fetch(`/admin/news/search?q=${encodeURIComponent(query)}`, {
            credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.error || 'Error al buscar noticias');
        }

        if (!data.news || data.news.length === 0) {
            resultsContainer.innerHTML = `
                <div style="padding: 1rem; text-align: center; color: var(--text-secondary);">
                    No se encontraron noticias
                </div>
            `;
            return;
        }

        resultsContainer.innerHTML = data.news.map(news => {
            const alreadyAdded = currentIncidentSources.some(s => s.newsId === news._id);
            const date = new Date(news.publishedAt).toLocaleDateString('es-UY');

            return `
                <div style="padding: 0.75rem; border-bottom: 1px solid var(--border-color); cursor: pointer; transition: background 0.2s;"
                     onmouseover="this.style.background='var(--background)'"
                     onmouseout="this.style.background='transparent'"
                     onclick="${alreadyAdded ? '' : `addSource('${news._id}', '${news.title.replace(/'/g, "\\'")}', '${news.url}', '${news.source}')`}">
                    <div style="font-weight: 500; margin-bottom: 0.25rem;">${news.title}</div>
                    <div style="font-size: 0.85rem; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center;">
                        <span>${news.source} • ${date}</span>
                        ${alreadyAdded ? '<span style="color: var(--success-color);">✓ Agregada</span>' : '<span style="color: var(--primary-color);">+ Agregar</span>'}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error searching news:', error);
        resultsContainer.innerHTML = `
            <div style="padding: 1rem; text-align: center; color: var(--danger-color);">
                Error al buscar noticias
            </div>
        `;
    }
}

// Add source to list
window.addSource = function(newsId, title, url, source) {
    // Check if already added
    if (currentIncidentSources.some(s => s.newsId === newsId)) {
        return;
    }

    currentIncidentSources.push({
        newsId: newsId,
        title: title,
        url: url,
        source: source,
        addedAt: new Date().toISOString()
    });

    displayCurrentSources();

    // Refresh search results to show "Agregada" badge
    const query = document.getElementById('newsSearch').value.trim();
    if (query.length >= 2) {
        searchNews(query);
    }
}

// Toggle hidden reason field based on checkbox
document.getElementById('editHidden')?.addEventListener('change', (e) => {
    const reasonGroup = document.getElementById('editHiddenReasonGroup');
    reasonGroup.style.display = e.target.checked ? 'block' : 'none';
});

// Handle edit form submission
document.getElementById('editIncidentForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const incidentId = document.getElementById('editIncidentId').value;
    const formData = {
        type: document.getElementById('editType').value,
        severity: parseInt(document.getElementById('editSeverity').value),
        description: document.getElementById('editDescription').value,
        status: document.getElementById('editStatus').value,
        hidden: document.getElementById('editHidden').checked,
        hiddenReason: document.getElementById('editHiddenReason').value,
        sourceNews: currentIncidentSources
    };

    try {
        const response = await fetch(`/admin/incidents/${incidentId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (response.ok && data.success) {
            toastSuccess('Incidente actualizado exitosamente');
            closeEditIncidentModal();

            // Reload incidents list
            loadIncidentsList();

            // Reload map data
            if (window.map) {
                window.loadMapData?.();
            }
        } else {
            toastError(data.error || 'Error al actualizar el incidente');
        }
    } catch (error) {
        console.error('Error updating incident:', error);
        toastError('Error al actualizar el incidente');
    }
});

// Close edit modal events
document.getElementById('editIncidentModalClose')?.addEventListener('click', closeEditIncidentModal);

document.getElementById('editIncidentModal')?.addEventListener('click', (e) => {
    if (e.target.id === 'editIncidentModal') {
        closeEditIncidentModal();
    }
});
