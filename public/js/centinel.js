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
        alert('Máximo 3 fotos permitidas');
        e.target.value = '';
        preview.innerHTML = '';
        return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const invalidFiles = files.filter(f => f.size > maxSize);
    if (invalidFiles.length > 0) {
        alert('Cada foto debe ser menor a 5MB');
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
        const token = localStorage.getItem('jwt') || await getGuestToken();
        const response = await fetch('/api/map/incidents?limit=20', {
            headers: { 'Authorization': `Bearer ${token}` }
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
        'rejected': '#ef5350'
    };
    const statusLabels = {
        'pending': 'Pendiente',
        'verified': 'Verificado',
        'rejected': 'Rechazado'
    };

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
    // Save to localStorage so it doesn't show again
    localStorage.setItem('centinelWelcomeShown', 'true');
}

function checkAndShowWelcomeModal() {
    const hasSeenWelcome = localStorage.getItem('centinelWelcomeShown');
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
