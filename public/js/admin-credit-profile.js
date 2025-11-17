/**
 * Admin Credit Profile Management
 * Manages credit profile requests in the admin panel
 */

(function() {
  'use strict';

  // State
  const state = {
    requests: [],
    stats: {},
    currentPage: 1,
    statusFilter: 'all'
  };

  // Load credit profile stats
  async function loadStats() {
    try {
      const response = await fetch('/admin/credit-profile/stats', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error loading stats');
      }

      const data = await response.json();
      state.stats = data.stats;

      renderStats();
    } catch (error) {
      console.error('Error loading credit profile stats:', error);
    }
  }

  // Load credit profile requests
  async function loadRequests(page = 1, status = 'all') {
    try {
      const response = await fetch(`/admin/credit-profile/requests?status=${status}&page=${page}&limit=20`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error loading requests');
      }

      const data = await response.json();
      state.requests = data.requests;
      state.currentPage = page;
      state.statusFilter = status;

      renderRequests(data.requests, data.pagination);
    } catch (error) {
      console.error('Error loading credit profile requests:', error);
      alert('Error al cargar las solicitudes');
    }
  }

  // Render stats
  function renderStats() {
    const container = document.getElementById('creditProfileStats');
    if (!container) return;

    container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
        <div style="background: #fff; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Total Solicitudes</div>
          <div style="font-size: 2rem; font-weight: 700; color: #333;">${state.stats.total || 0}</div>
        </div>
        <div style="background: #fff; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Pendientes</div>
          <div style="font-size: 2rem; font-weight: 700; color: #ff9800;">${state.stats.pending || 0}</div>
        </div>
        <div style="background: #fff; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Procesando</div>
          <div style="font-size: 2rem; font-weight: 700; color: #2196f3;">${state.stats.processing || 0}</div>
        </div>
        <div style="background: #fff; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Generadas</div>
          <div style="font-size: 2rem; font-weight: 700; color: #4caf50;">${state.stats.generated || 0}</div>
        </div>
        <div style="background: #fff; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <div style="color: #666; font-size: 0.9rem; margin-bottom: 0.5rem;">Hoy</div>
          <div style="font-size: 2rem; font-weight: 700; color: #9c27b0;">${state.stats.today || 0}</div>
        </div>
      </div>
    `;
  }

  // Render requests table
  function renderRequests(requests, pagination) {
    const container = document.getElementById('creditProfileRequests');
    if (!container) return;

    if (!requests || requests.length === 0) {
      container.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">No hay solicitudes para mostrar</p>';
      return;
    }

    let html = `
      <div style="margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center;">
        <label style="display: flex; align-items: center; gap: 0.5rem;">
          <span>Filtrar por estado:</span>
          <select id="statusFilter" style="padding: 0.5rem; border-radius: 4px; border: 1px solid #ddd;">
            <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>Todos</option>
            <option value="pendiente" ${state.statusFilter === 'pendiente' ? 'selected' : ''}>Pendientes</option>
            <option value="procesando" ${state.statusFilter === 'procesando' ? 'selected' : ''}>Procesando</option>
            <option value="generada" ${state.statusFilter === 'generada' ? 'selected' : ''}>Generadas</option>
            <option value="error" ${state.statusFilter === 'error' ? 'selected' : ''}>Error</option>
          </select>
        </label>
        <button onclick="AdminCreditProfile.refreshRequests()" style="padding: 0.5rem 1rem; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
          Actualizar
        </button>
      </div>
      <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background: #f5f5f5;">
            <th style="padding: 1rem; text-align: left; font-weight: 600;">Usuario</th>
            <th style="padding: 1rem; text-align: left; font-weight: 600;">Cédula</th>
            <th style="padding: 1rem; text-align: left; font-weight: 600;">Estado</th>
            <th style="padding: 1rem; text-align: left; font-weight: 600;">Fecha Solicitud</th>
            <th style="padding: 1rem; text-align: left; font-weight: 600;">Puntaje</th>
            <th style="padding: 1rem; text-align: center; font-weight: 600;">Acciones</th>
          </tr>
        </thead>
        <tbody>
    `;

    requests.forEach(req => {
      const date = new Date(req.requestedAt).toLocaleDateString('es-UY');
      const statusBadge = getStatusBadge(req.status);

      html += `
        <tr style="border-top: 1px solid #e0e0e0;">
          <td style="padding: 1rem;">
            <div style="font-weight: 600;">${req.userName || 'Desconocido'}</div>
            <div style="font-size: 0.85rem; color: #666;">${req.userEmail || ''}</div>
          </td>
          <td style="padding: 1rem;">${req.cedula}</td>
          <td style="padding: 1rem;">${statusBadge}</td>
          <td style="padding: 1rem;">${date}</td>
          <td style="padding: 1rem;">${req.creditScore ? req.creditScore : '-'}</td>
          <td style="padding: 1rem; text-align: center;">
            <button onclick="AdminCreditProfile.viewRequest('${req._id}')" style="padding: 0.5rem 1rem; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">
              Ver
            </button>
            ${req.status === 'pendiente' || req.status === 'procesando' ? `
            <button onclick="AdminCreditProfile.uploadData('${req._id}')" style="padding: 0.5rem 1rem; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer;">
              Cargar JSON
            </button>
            ` : ''}
          </td>
        </tr>
      `;
    });

    html += '</tbody></table>';

    // Add pagination
    if (pagination && pagination.pages > 1) {
      html += '<div style="margin-top: 1rem; display: flex; justify-content: center; gap: 0.5rem;">';
      for (let i = 1; i <= pagination.pages; i++) {
        const active = i === state.currentPage;
        html += `
          <button onclick="AdminCreditProfile.loadPage(${i})"
            style="padding: 0.5rem 1rem; background: ${active ? '#2196f3' : '#f5f5f5'}; color: ${active ? 'white' : '#333'}; border: none; border-radius: 4px; cursor: pointer;">
            ${i}
          </button>
        `;
      }
      html += '</div>';
    }

    container.innerHTML = html;

    // Attach event listener to status filter
    const filterSelect = document.getElementById('statusFilter');
    if (filterSelect) {
      filterSelect.addEventListener('change', (e) => {
        loadRequests(1, e.target.value);
      });
    }
  }

  // Get status badge HTML
  function getStatusBadge(status) {
    const badges = {
      'pendiente': '<span style="padding: 0.25rem 0.75rem; background: #ff9800; color: white; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Pendiente</span>',
      'procesando': '<span style="padding: 0.25rem 0.75rem; background: #2196f3; color: white; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Procesando</span>',
      'generada': '<span style="padding: 0.25rem 0.75rem; background: #4caf50; color: white; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Generada</span>',
      'error': '<span style="padding: 0.25rem 0.75rem; background: #f44336; color: white; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Error</span>'
    };
    return badges[status] || status;
  }

  // View request details
  async function viewRequest(requestId) {
    try {
      const response = await fetch(`/admin/credit-profile/requests/${requestId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error loading request details');
      }

      const data = await response.json();
      showRequestModal(data.request);
    } catch (error) {
      console.error('Error loading request:', error);
      alert('Error al cargar los detalles de la solicitud');
    }
  }

  // Show request modal
  function showRequestModal(request) {
    const modalHtml = `
      <div id="creditProfileModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
        <div style="background: white; border-radius: 8px; max-width: 800px; max-height: 90vh; overflow-y: auto; padding: 2rem; position: relative;">
          <button onclick="AdminCreditProfile.closeModal()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 2rem; cursor: pointer; color: #666;">&times;</button>

          <h2 style="margin-bottom: 1.5rem;">Detalles de Solicitud de Perfil Crediticio</h2>

          <div style="margin-bottom: 1.5rem;">
            <h3>Información del Usuario</h3>
            <p><strong>Nombre:</strong> ${request.userName || 'Desconocido'}</p>
            <p><strong>Email:</strong> ${request.userEmail || 'Desconocido'}</p>
            <p><strong>Cédula:</strong> ${request.cedula}</p>
          </div>

          <div style="margin-bottom: 1.5rem;">
            <h3>Estado de la Solicitud</h3>
            <p><strong>Estado:</strong> ${getStatusBadge(request.status)}</p>
            <p><strong>Fecha de solicitud:</strong> ${new Date(request.requestedAt).toLocaleString('es-UY')}</p>
            ${request.processedAt ? `<p><strong>Fecha de procesamiento:</strong> ${new Date(request.processedAt).toLocaleString('es-UY')}</p>` : ''}
            ${request.generatedAt ? `<p><strong>Fecha de generación:</strong> ${new Date(request.generatedAt).toLocaleString('es-UY')}</p>` : ''}
          </div>

          ${request.profileData ? `
          <div style="margin-bottom: 1.5rem;">
            <h3>Datos del Perfil</h3>
            <p><strong>Puntaje:</strong> ${request.creditScore || '-'}</p>
            <p><strong>Calificación BCU:</strong> ${request.bcuRating || '-'}</p>
            <p><strong>Deuda Total:</strong> $ ${request.totalDebt?.toLocaleString('es-UY') || '0'}</p>
            <p><strong>Nombre en BCU:</strong> ${request.profileData.nombre || '-'}</p>
            <p><strong>Documento:</strong> ${request.profileData.documento || '-'}</p>
          </div>

          <div style="margin-bottom: 1.5rem;">
            <h3>Instituciones (${request.profileData.instituciones?.length || 0})</h3>
            ${request.profileData.instituciones?.map(inst => `
              <div style="border: 1px solid #e0e0e0; padding: 1rem; margin-bottom: 0.5rem; border-radius: 4px;">
                <p><strong>${inst.nombre}</strong> - Calificación: ${inst.calificacion}</p>
                <p style="font-size: 0.9rem; color: #666;">
                  Deuda: $ ${((inst.rubros?.vigente?.mn || 0) + (inst.rubros?.vigente?.me_equivalente_mn || 0)).toLocaleString('es-UY')}
                </p>
              </div>
            `).join('') || '<p>Sin instituciones registradas</p>'}
          </div>
          ` : ''}

          ${request.adminNotes ? `
          <div style="margin-bottom: 1.5rem;">
            <h3>Notas del Administrador</h3>
            <p>${request.adminNotes}</p>
          </div>
          ` : ''}
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }

  // Close modal
  function closeModal() {
    const modal = document.getElementById('creditProfileModal');
    if (modal) {
      modal.remove();
    }
  }

  // Upload data (JSON from BCU)
  async function uploadData(requestId) {
    const jsonInput = prompt('Pegá el JSON completo del perfil crediticio del BCU:');
    if (!jsonInput) return;

    try {
      const profileData = JSON.parse(jsonInput);

      const response = await fetch(`/admin/credit-profile/requests/${requestId}/data`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ profileData })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al cargar datos');
      }

      alert('Datos cargados exitosamente');
      loadRequests(state.currentPage, state.statusFilter);
      loadStats();
    } catch (error) {
      console.error('Error uploading data:', error);
      alert('Error: ' + error.message);
    }
  }

  // Load page
  function loadPage(page) {
    loadRequests(page, state.statusFilter);
  }

  // Refresh requests
  function refreshRequests() {
    loadRequests(state.currentPage, state.statusFilter);
    loadStats();
  }

  // Initialize
  function init() {
    // Check if we're on the admin page
    if (!window.location.pathname.includes('/admin')) return;

    // Wait a bit for the page to load
    setTimeout(() => {
      loadStats();
      loadRequests();
    }, 1000);
  }

  // Expose functions globally
  window.AdminCreditProfile = {
    init,
    loadRequests,
    loadPage,
    viewRequest,
    uploadData,
    closeModal,
    refreshRequests
  };

  // Auto-initialize if DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
