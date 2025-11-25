// Admin Reports Management

let currentReportsPage = 1;
let currentReportStatusFilter = 'pending';
let currentReportTypeFilter = '';
let currentReportId = null;

document.addEventListener('DOMContentLoaded', async () => {

  // Initialize reports management
  loadReportsStats();
  loadReports();

  // Filter change listeners
  document.getElementById('reportStatusFilter')?.addEventListener('change', (e) => {
    currentReportStatusFilter = e.target.value;
    currentReportsPage = 1;
    loadReports();
  });

  document.getElementById('reportTypeFilter')?.addEventListener('change', (e) => {
    currentReportTypeFilter = e.target.value;
    currentReportsPage = 1;
    loadReports();
  });

  // Refresh button
  document.getElementById('refreshReportsBtn')?.addEventListener('click', () => {
    loadReportsStats();
    loadReports();
  });

  // Pagination buttons
  document.getElementById('reportsPrevPageBtn')?.addEventListener('click', () => {
    if (currentReportsPage > 1) {
      currentReportsPage--;
      loadReports();
    }
  });

  document.getElementById('reportsNextPageBtn')?.addEventListener('click', () => {
    currentReportsPage++;
    loadReports();
  });
});

// Load reports statistics
async function loadReportsStats() {
  try {
    const response = await fetch('/reports?limit=1', {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();

      document.getElementById('pendingReportsCount').textContent = data.counts?.pending || 0;
      document.getElementById('totalReportsCount').textContent =
        (data.counts?.pending || 0) +
        (data.counts?.reviewed || 0) +
        (data.counts?.resolved || 0) +
        (data.counts?.rejected || 0);
      document.getElementById('resolvedReportsCount').textContent = data.counts?.resolved || 0;
    }
  } catch (error) {
    console.error('Error loading reports stats:', error);
  }
}

// Load reports list
async function loadReports() {
  const tbody = document.getElementById('reportsTableBody');
  tbody.innerHTML = '<tr><td colspan="7" style="padding: 2rem; text-align: center; color: var(--text-secondary);">Cargando reportes...</td></tr>';

  try {
    const params = new URLSearchParams({
      page: currentReportsPage,
      limit: 20
    });

    if (currentReportStatusFilter) {
      params.append('status', currentReportStatusFilter);
    }
    if (currentReportTypeFilter) {
      params.append('type', currentReportTypeFilter);
    }

    const response = await fetch(`/reports?${params}`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      displayReports(data.reports, data.pagination);
    } else {
      tbody.innerHTML = '<tr><td colspan="7" style="padding: 2rem; text-align: center; color: var(--danger-color);">Error al cargar reportes</td></tr>';
    }
  } catch (error) {
    console.error('Error loading reports:', error);
    tbody.innerHTML = '<tr><td colspan="7" style="padding: 2rem; text-align: center; color: var(--danger-color);">Error al cargar reportes</td></tr>';
  }
}

// Display reports in table
function displayReports(reports, pagination) {
  const tbody = document.getElementById('reportsTableBody');

  if (!reports || reports.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="padding: 2rem; text-align: center; color: var(--text-secondary);">No hay reportes</td></tr>';
    return;
  }

  tbody.innerHTML = reports.map(report => `
    <tr style="border-bottom: 1px solid var(--border-color);">
      <td style="padding: 1rem;">
        <span style="display: inline-block; padding: 0.25rem 0.5rem; background: var(--surface-elevated); border-radius: 4px; font-size: 0.875rem;">
          ${getReportTypeLabel(report.reportedType)}
        </span>
      </td>
      <td style="padding: 1rem;">
        <span style="font-size: 0.875rem;">${getReasonLabel(report.reason)}</span>
      </td>
      <td style="padding: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <img src="${report.reporter?.picture || '/images/default-avatar.svg'}" alt="Avatar" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
          <span style="font-size: 0.875rem;">${report.reporter?.name || report.reporter?.email || 'Usuario'}</span>
        </div>
      </td>
      <td style="padding: 1rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <img src="${report.reportedUserId?.picture || '/images/default-avatar.svg'}" alt="Avatar" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
          <span style="font-size: 0.875rem;">${report.reportedUserId?.name || report.reportedUserId?.email || 'Usuario'}</span>
        </div>
      </td>
      <td style="padding: 1rem;">
        <span style="display: inline-block; padding: 0.25rem 0.5rem; background: ${getStatusColor(report.status)}; color: white; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
          ${getStatusLabel(report.status)}
        </span>
      </td>
      <td style="padding: 1rem;">
        <span style="font-size: 0.875rem; color: var(--text-secondary);">
          ${new Date(report.createdAt).toLocaleDateString('es-UY', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </td>
      <td style="padding: 1rem;">
        <button onclick="viewReportDetails('${report._id}')" class="btn btn-secondary" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;">
          Ver Detalles
        </button>
      </td>
    </tr>
  `).join('');

  // Update pagination info
  updateReportsPagination(pagination);
}

// Update pagination controls
function updateReportsPagination(pagination) {
  const { page, pages, total } = pagination;

  document.getElementById('reportsPaginationInfo').textContent =
    `Mostrando ${(page - 1) * 20 + 1}-${Math.min(page * 20, total)} de ${total} reportes`;

  document.getElementById('reportsCurrentPage').textContent = `Página ${page} de ${pages}`;

  document.getElementById('reportsPrevPageBtn').disabled = page <= 1;
  document.getElementById('reportsNextPageBtn').disabled = page >= pages;
}

// View report details
async function viewReportDetails(reportId) {
  currentReportId = reportId;
  const modal = document.getElementById('reportDetailsModal');
  const content = document.getElementById('reportDetailsContent');

  modal.style.display = 'block';
  content.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">Cargando...</p>';

  try {
    const response = await fetch(`/reports/${reportId}`, {
      credentials: 'include'
    });

    if (response.ok) {
      const data = await response.json();
      displayReportDetails(data.report, data.reportedContent);
    } else {
      content.innerHTML = '<p style="text-align: center; color: var(--danger-color);">Error al cargar detalles del reporte</p>';
    }
  } catch (error) {
    console.error('Error loading report details:', error);
    content.innerHTML = '<p style="text-align: center; color: var(--danger-color);">Error al cargar detalles del reporte</p>';
  }
}

// Display report details
function displayReportDetails(report, content) {
  const container = document.getElementById('reportDetailsContent');

  let contentPreview = '';
  if (content) {
    if (report.reportedType === 'thread') {
      contentPreview = `
        <div style="background: var(--background); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
          <h4 style="margin: 0 0 0.5rem 0;">${content.title || '[Sin título]'}</h4>
          <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">
            ${content.content?.substring(0, 300) || '[Sin contenido]'}${content.content?.length > 300 ? '...' : ''}
          </p>
          <a href="/forum-thread/${content._id}" target="_blank" style="display: inline-block; margin-top: 0.5rem; color: var(--primary-color); text-decoration: none;">
            Ver thread completo →
          </a>
        </div>
      `;
    } else if (report.reportedType === 'comment') {
      contentPreview = `
        <div style="background: var(--background); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
          <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">
            ${content.content?.substring(0, 300) || '[Sin contenido]'}${content.content?.length > 300 ? '...' : ''}
          </p>
          <a href="/forum-thread/${content.threadId}" target="_blank" style="display: inline-block; margin-top: 0.5rem; color: var(--primary-color); text-decoration: none;">
            Ver en thread →
          </a>
        </div>
      `;
    } else if (report.reportedType === 'user') {
      contentPreview = `
        <div style="background: var(--background); padding: 1rem; border-radius: 8px; margin-top: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <img src="${content.picture || '/images/default-avatar.svg'}" alt="Avatar" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
            <div>
              <p style="margin: 0; font-weight: 600;">${content.name || content.email}</p>
              <p style="margin: 0.25rem 0 0 0; color: var(--text-secondary); font-size: 0.875rem;">
                Registrado: ${new Date(content.createdAt).toLocaleDateString('es-UY')}
              </p>
            </div>
          </div>
        </div>
      `;
    }
  }

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
      <div>
        <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Tipo de reporte</label>
        <p style="margin: 0; font-weight: 600;">${getReportTypeLabel(report.reportedType)}</p>
      </div>
      <div>
        <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Razón</label>
        <p style="margin: 0; font-weight: 600;">${getReasonLabel(report.reason)}</p>
      </div>
      <div>
        <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Reportado por</label>
        <p style="margin: 0; font-weight: 600;">${report.reporter?.name || report.reporter?.email}</p>
      </div>
      <div>
        <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Estado</label>
        <span style="display: inline-block; padding: 0.25rem 0.5rem; background: ${getStatusColor(report.status)}; color: white; border-radius: 4px; font-size: 0.875rem;">
          ${getStatusLabel(report.status)}
        </span>
      </div>
      <div>
        <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Fecha del reporte</label>
        <p style="margin: 0;">${new Date(report.createdAt).toLocaleString('es-UY')}</p>
      </div>
      ${report.reviewedBy ? `
        <div>
          <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.25rem;">Revisado por</label>
          <p style="margin: 0;">${report.reviewedBy?.name || report.reviewedBy?.email}</p>
        </div>
      ` : ''}
    </div>

    ${report.description ? `
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Descripción adicional</label>
        <p style="margin: 0; padding: 1rem; background: var(--background); border-radius: 4px;">${report.description}</p>
      </div>
    ` : ''}

    ${report.resolution ? `
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Resolución</label>
        <p style="margin: 0; padding: 1rem; background: var(--background); border-radius: 4px;">${report.resolution}</p>
      </div>
    ` : ''}

    <div style="margin-bottom: 1rem;">
      <label style="display: block; font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.5rem;">Contenido reportado</label>
      ${contentPreview || '<p style="margin: 0; color: var(--text-secondary);">No disponible</p>'}
    </div>
  `;
}

// Close report details modal
function closeReportDetailsModal() {
  document.getElementById('reportDetailsModal').style.display = 'none';
  currentReportId = null;
  document.getElementById('resolutionText').value = '';
}

// Update report status
async function updateReportStatus(status) {
  if (!currentReportId) return;

  const resolution = document.getElementById('resolutionText').value.trim();

  if (!resolution && status !== 'reviewed') {
    toastWarning('Por favor ingresa notas de resolución');
    return;
  }

  try {
    const response = await fetch(`/reports/${currentReportId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ status, resolution })
    });

    if (response.ok) {
      toastSuccess(`Reporte ${getStatusLabel(status).toLowerCase()} exitosamente`);
      closeReportDetailsModal();
      loadReportsStats();
      loadReports();
    } else {
      const data = await response.json();
      toastError(data.error || 'Error al actualizar reporte');
    }
  } catch (error) {
    console.error('Error updating report:', error);
    toastError('Error al actualizar reporte');
  }
}

// Delete report
async function deleteReport() {
  if (!currentReportId) return;

  if (!confirm('¿Estás seguro de que quieres eliminar este reporte? Esta acción no se puede deshacer.')) {
    return;
  }

  try {
    const response = await fetch(`/reports/${currentReportId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    if (response.ok) {
      toastSuccess('Reporte eliminado exitosamente');
      closeReportDetailsModal();
      loadReportsStats();
      loadReports();
    } else {
      const data = await response.json();
      toastError(data.error || 'Error al eliminar reporte');
    }
  } catch (error) {
    console.error('Error deleting report:', error);
    toastError('Error al eliminar reporte');
  }
}

// Helper functions
function getReportTypeLabel(type) {
  const labels = {
    thread: 'Thread',
    comment: 'Comentario',
    user: 'Usuario'
  };
  return labels[type] || type;
}

function getReasonLabel(reason) {
  const labels = {
    spam: 'Spam',
    harassment: 'Acoso',
    inappropriate_content: 'Contenido inapropiado',
    hate_speech: 'Discurso de odio',
    misinformation: 'Desinformación',
    violence: 'Violencia',
    other: 'Otro'
  };
  return labels[reason] || reason;
}

function getStatusLabel(status) {
  const labels = {
    pending: 'Pendiente',
    reviewed: 'Revisado',
    resolved: 'Resuelto',
    rejected: 'Rechazado'
  };
  return labels[status] || status;
}

function getStatusColor(status) {
  const colors = {
    pending: '#f59e0b',
    reviewed: '#3b82f6',
    resolved: '#10b981',
    rejected: '#ef4444'
  };
  return colors[status] || '#6b7280';
}
