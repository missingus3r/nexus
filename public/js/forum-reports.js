// Forum Reports - Handles report functionality

// Open report modal
function openReportModal(type, id) {
  const modal = document.getElementById('reportModal');
  const form = document.getElementById('reportForm');

  // Set report type and ID
  document.getElementById('reportType').value = type;
  document.getElementById('reportId').value = id;

  // Reset form
  form.reset();
  document.getElementById('reportDescCharCount').textContent = '0';

  modal.classList.add('active');
}

// Close report modal
function closeReportModal() {
  const modal = document.getElementById('reportModal');
  modal.classList.remove('active');
}

// Handle report form submission
document.addEventListener('DOMContentLoaded', () => {
  const reportForm = document.getElementById('reportForm');
  if (reportForm) {
    reportForm.addEventListener('submit', handleReportSubmit);

    // Character counter for description
    const descTextarea = document.getElementById('reportDescription');
    if (descTextarea) {
      descTextarea.addEventListener('input', (e) => {
        document.getElementById('reportDescCharCount').textContent = e.target.value.length;
      });
    }
  }
});

// Submit report
async function handleReportSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);
  const reportData = {
    reportedType: formData.get('reportedType'),
    reportedId: formData.get('reportedId'),
    reason: formData.get('reason'),
    description: formData.get('description')
  };

  // Validation
  if (!reportData.reason) {
    toastWarning('Por favor selecciona una razón para el reporte');
    return;
  }

  try {
    const response = await fetch('/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(reportData)
    });

    const result = await response.json();

    if (response.ok) {
      toastSuccess('Reporte enviado exitosamente. Gracias por ayudar a mantener la comunidad segura.');
      closeReportModal();
    } else {
      if (result.error === 'Ya has reportado este contenido') {
        toastWarning('Ya has reportado este contenido anteriormente.');
      } else {
        toastError(result.error || 'Error al enviar el reporte');
      }
    }
  } catch (error) {
    console.error('Error submitting report:', error);
    toastError('Error al enviar el reporte. Por favor intenta de nuevo.');
  }
}

// Helper function to create report button HTML
function createReportButton(type, id, isAuthenticated) {
  if (!isAuthenticated) {
    return '';
  }

  return `
    <button
      onclick="openReportModal('${type}', '${id}')"
      class="btn btn-secondary"
      style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background: transparent; border: 1px solid var(--border-color); color: var(--text-secondary);"
      title="Reportar contenido">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
        <line x1="12" y1="9" x2="12" y2="13"></line>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
      Reportar
    </button>
  `;
}
