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
        <div style="background: var(--surface); padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px var(--shadow-elevation); border: 1px solid var(--border-color);">
          <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">Total Solicitudes</div>
          <div style="font-size: 2rem; font-weight: 700; color: var(--text-primary);">${state.stats.total || 0}</div>
        </div>
        <div style="background: var(--surface); padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px var(--shadow-elevation); border: 1px solid var(--border-color);">
          <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">Pendientes</div>
          <div style="font-size: 2rem; font-weight: 700; color: var(--warning-color);">${state.stats.pending || 0}</div>
        </div>
        <div style="background: var(--surface); padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px var(--shadow-elevation); border: 1px solid var(--border-color);">
          <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">Procesando</div>
          <div style="font-size: 2rem; font-weight: 700; color: var(--primary-color);">${state.stats.processing || 0}</div>
        </div>
        <div style="background: var(--surface); padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px var(--shadow-elevation); border: 1px solid var(--border-color);">
          <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">Generadas</div>
          <div style="font-size: 2rem; font-weight: 700; color: var(--success-color);">${state.stats.generated || 0}</div>
        </div>
        <div style="background: var(--surface); padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px var(--shadow-elevation); border: 1px solid var(--border-color);">
          <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">Hoy</div>
          <div style="font-size: 2rem; font-weight: 700; color: #9c27b0;">${state.stats.today || 0}</div>
        </div>
        <div style="background: var(--surface); padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px var(--shadow-elevation); border: 1px solid var(--border-color); border-left: 4px solid #ff5722;">
          <div style="color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 0.5rem;">Requieren Actualización</div>
          <div style="font-size: 2rem; font-weight: 700; color: #ff5722;">${state.stats.needsUpdate || 0}</div>
          <div style="color: var(--text-secondary); font-size: 0.75rem; margin-top: 0.25rem;">Más de 1 mes</div>
        </div>
      </div>
    `;
  }

  // Render requests table
  function renderRequests(requests, pagination) {
    const container = document.getElementById('creditProfileRequests');
    if (!container) return;

    // Always render the filter controls
    let html = `
      <div style="margin-bottom: 1rem; display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
        <label style="display: flex; align-items: center; gap: 0.5rem; color: var(--text-primary);">
          <span style="color: var(--text-primary);">Filtrar por estado:</span>
          <select id="statusFilter" style="padding: 0.5rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--background); color: var(--text-primary);">
            <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>Todos</option>
            <option value="pendiente" ${state.statusFilter === 'pendiente' ? 'selected' : ''}>Pendientes</option>
            <option value="procesando" ${state.statusFilter === 'procesando' ? 'selected' : ''}>Procesando</option>
            <option value="generada" ${state.statusFilter === 'generada' ? 'selected' : ''}>Generadas</option>
            <option value="error" ${state.statusFilter === 'error' ? 'selected' : ''}>Error</option>
            <option value="eliminada" ${state.statusFilter === 'eliminada' ? 'selected' : ''}>Eliminadas</option>
          </select>
        </label>
        <button onclick="AdminCreditProfile.refreshRequests()" style="padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
          Actualizar
        </button>
      </div>
    `;

    // Check if there are no requests
    if (!requests || requests.length === 0) {
      html += '<p style="text-align: center; color: var(--text-secondary); padding: 2rem; background: var(--surface); border-radius: 8px;">No hay solicitudes para mostrar con el filtro seleccionado</p>';
      container.innerHTML = html;

      // Attach event listener to status filter even when no results
      const filterSelect = document.getElementById('statusFilter');
      if (filterSelect) {
        filterSelect.addEventListener('change', (e) => {
          loadRequests(1, e.target.value);
        });
      }
      return;
    }

    // Render table
    html += `
      <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <table style="width: 100%; border-collapse: collapse; background: var(--surface); border-radius: 8px; min-width: 800px; color: var(--text-primary);">
          <thead>
            <tr style="background: var(--background);">
              <th style="padding: 1rem; text-align: left; font-weight: 600; color: var(--text-primary);">Usuario</th>
              <th style="padding: 1rem; text-align: left; font-weight: 600; color: var(--text-primary);">Cédula</th>
              <th style="padding: 1rem; text-align: left; font-weight: 600; color: var(--text-primary);">Estado</th>
              <th style="padding: 1rem; text-align: left; font-weight: 600; color: var(--text-primary);">Fecha Solicitud</th>
              <th style="padding: 1rem; text-align: left; font-weight: 600; color: var(--text-primary);">Puntaje</th>
              <th style="padding: 1rem; text-align: center; font-weight: 600; color: var(--text-primary);">Acciones</th>
            </tr>
          </thead>
          <tbody>
    `;

    requests.forEach(req => {
      const date = new Date(req.requestedAt).toLocaleDateString('es-UY');
      const needsUpdateFlag = needsUpdate(req.generatedAt);
      const statusBadge = getStatusBadge(req.status, needsUpdateFlag);

      html += `
        <tr style="border-top: 1px solid var(--border-color);">
          <td style="padding: 1rem; color: var(--text-primary);">
            <div style="font-weight: 600; color: var(--text-primary);">${req.userName || 'Desconocido'}</div>
            <div style="font-size: 0.85rem; color: var(--text-secondary);">${req.userEmail || ''}</div>
          </td>
          <td style="padding: 1rem; color: var(--text-primary);">${req.cedula}</td>
          <td style="padding: 1rem; color: var(--text-primary);">${statusBadge}</td>
          <td style="padding: 1rem; color: var(--text-primary);">${date}</td>
          <td style="padding: 1rem; color: var(--text-primary);">${req.creditScore ? req.creditScore : '-'}</td>
          <td style="padding: 1rem; text-align: center; color: var(--text-primary);">
            <button onclick="AdminCreditProfile.viewRequest('${req._id}')" style="padding: 0.5rem 1rem; background: var(--success-color); color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 0.5rem;">
              Ver
            </button>
            ${req.status === 'pendiente' || req.status === 'procesando' ? `
            <button onclick="AdminCreditProfile.uploadData('${req._id}')" style="padding: 0.5rem 1rem; background: var(--primary-color); color: white; border: none; border-radius: 4px; cursor: pointer;">
              Cargar JSON
            </button>
            ` : ''}
            ${needsUpdateFlag && req.status === 'generada' ? `
            <button onclick="AdminCreditProfile.uploadData('${req._id}')" style="padding: 0.5rem 1rem; background: #ff5722; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 0.25rem;">
              🔄 Actualizar
            </button>
            ` : ''}
          </td>
        </tr>
      `;
    });

    html += '</tbody></table></div>';

    // Add pagination
    if (pagination && pagination.pages > 1) {
      html += '<div style="margin-top: 1rem; display: flex; justify-content: center; gap: 0.5rem; flex-wrap: wrap;">';
      for (let i = 1; i <= pagination.pages; i++) {
        const active = i === state.currentPage;
        html += `
          <button onclick="AdminCreditProfile.loadPage(${i})"
            style="padding: 0.5rem 1rem; background: ${active ? 'var(--primary-color)' : 'var(--surface)'}; color: ${active ? 'white' : 'var(--text-primary)'}; border: 1px solid ${active ? 'var(--primary-color)' : 'var(--border-color)'}; border-radius: 4px; cursor: pointer;">
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

  // Check if profile needs update (1 month old)
  function needsUpdate(generatedAt) {
    if (!generatedAt) return false;
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    return new Date(generatedAt) < oneMonthAgo;
  }

  // Get status badge HTML
  function getStatusBadge(status, needsUpdateFlag) {
    const badges = {
      'pendiente': '<span style="padding: 0.25rem 0.75rem; background: #ff9800; color: white; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Pendiente</span>',
      'procesando': '<span style="padding: 0.25rem 0.75rem; background: #2196f3; color: white; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Procesando</span>',
      'generada': '<span style="padding: 0.25rem 0.75rem; background: #4caf50; color: white; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Generada</span>',
      'error': '<span style="padding: 0.25rem 0.75rem; background: #f44336; color: white; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Error</span>',
      'eliminada': '<span style="padding: 0.25rem 0.75rem; background: #9e9e9e; color: white; border-radius: 12px; font-size: 0.85rem; font-weight: 600;">Eliminada</span>'
    };
    let badge = badges[status] || status;

    // Add update warning badge if needed
    if (needsUpdateFlag && status === 'generada') {
      badge += ' <span style="padding: 0.25rem 0.75rem; background: #ff5722; color: white; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin-left: 0.25rem;">⚠️ Actualizar</span>';
    }

    return badge;
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
        <div style="background: var(--surface); border-radius: 8px; max-width: 800px; max-height: 90vh; overflow-y: auto; padding: 2rem; position: relative; color: var(--text-primary);">
          <button onclick="AdminCreditProfile.closeModal()" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 2rem; cursor: pointer; color: var(--text-secondary);">&times;</button>

          <h2 style="margin-bottom: 1.5rem; color: var(--text-primary);">Detalles de Solicitud de Perfil Crediticio</h2>

          ${request.cedulaChanged ? `
          <div style="background-color: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
            <p style="color: #856404; margin: 0; font-weight: bold;">⚠️ Este usuario solicitó un perfil con una cédula diferente</p>
            <p style="color: #856404; margin: 0.5rem 0 0 0; font-size: 0.9rem;">Cédula anterior: ${request.previousCedula}</p>
            <p style="color: #856404; margin: 0.25rem 0 0 0; font-size: 0.9rem;">Cédula actual: ${request.cedula}</p>
          </div>
          ` : ''}

          ${request.deletedByUser ? `
          <div style="background-color: #f8d7da; border: 1px solid #dc3545; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem;">
            <p style="color: #721c24; margin: 0; font-weight: bold;">🗑️ Perfil eliminado por el usuario</p>
            <p style="color: #721c24; margin: 0.5rem 0 0 0; font-size: 0.9rem;">Fecha de eliminación: ${request.deletedAt ? new Date(request.deletedAt).toLocaleString('es-UY') : 'N/A'}</p>
          </div>
          ` : ''}

          <div style="margin-bottom: 1.5rem;">
            <h3 style="color: var(--text-primary);">Información del Usuario</h3>
            <p style="color: var(--text-primary);"><strong>Nombre:</strong> ${request.userName || 'Desconocido'}</p>
            <p style="color: var(--text-primary);"><strong>Email:</strong> ${request.userEmail || 'Desconocido'}</p>
            <p style="color: var(--text-primary);"><strong>Cédula:</strong> ${request.cedula}</p>
            ${request.previousCedula ? `<p style="color: var(--text-secondary); font-size: 0.9rem;"><em>(Cédula anterior: ${request.previousCedula})</em></p>` : ''}
          </div>

          <div style="margin-bottom: 1.5rem;">
            <h3 style="color: var(--text-primary);">Estado de la Solicitud</h3>
            <p style="color: var(--text-primary);"><strong>Estado:</strong> ${getStatusBadge(request.status)}</p>
            <p style="color: var(--text-primary);"><strong>Fecha de solicitud:</strong> ${new Date(request.requestedAt).toLocaleString('es-UY')}</p>
            ${request.processedAt ? `<p style="color: var(--text-primary);"><strong>Fecha de procesamiento:</strong> ${new Date(request.processedAt).toLocaleString('es-UY')}</p>` : ''}
            ${request.generatedAt ? `<p style="color: var(--text-primary);"><strong>Fecha de generación:</strong> ${new Date(request.generatedAt).toLocaleString('es-UY')}</p>` : ''}
          </div>

          ${request.profileData ? `
          <div style="margin-bottom: 1.5rem;">
            <h3 style="color: var(--text-primary);">Datos del Perfil</h3>
            <p style="color: var(--text-primary);"><strong>Puntaje:</strong> ${request.creditScore || '-'}</p>
            <p style="color: var(--text-primary);"><strong>Calificación BCU:</strong> ${request.bcuRating || '-'}</p>
            <p style="color: var(--text-primary);"><strong>Deuda Total:</strong> $ ${request.totalDebt?.toLocaleString('es-UY') || '0'}</p>
            <p style="color: var(--text-primary);"><strong>Nombre en BCU:</strong> ${request.profileData.nombre || '-'}</p>
            <p style="color: var(--text-primary);"><strong>Documento:</strong> ${request.profileData.documento || '-'}</p>
          </div>

          <div style="margin-bottom: 1.5rem;">
            <h3 style="color: var(--text-primary);">Instituciones (${request.profileData.instituciones?.length || 0})</h3>
            ${request.profileData.instituciones?.map(inst => `
              <div style="border: 1px solid var(--border-color); padding: 1rem; margin-bottom: 0.5rem; border-radius: 4px; background: var(--background);">
                <p style="color: var(--text-primary);"><strong>${inst.nombre}</strong> - Calificación: ${inst.calificacion}</p>
                <p style="font-size: 0.9rem; color: var(--text-secondary);">
                  Deuda: $ ${((inst.rubros?.vigente?.mn || 0) + (inst.rubros?.vigente?.me_equivalente_mn || 0)).toLocaleString('es-UY')}
                </p>
              </div>
            `).join('') || '<p style="color: var(--text-primary);">Sin instituciones registradas</p>'}
          </div>
          ` : ''}

          ${request.adminNotes ? `
          <div style="margin-bottom: 1.5rem;">
            <h3 style="color: var(--text-primary);">Notas del Administrador</h3>
            <p style="color: var(--text-primary);">${request.adminNotes}</p>
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
