/**
 * Credit Profile Functionality
 * Manages credit profile requests and display in Surlink Financial
 */

(function() {
  'use strict';

  // State
  const state = {
    currentRequest: null,
    isLoading: false
  };

  // Elements
  const elements = {
    container: null,
    loadingEl: null,
    noDataEl: null,
    pendingEl: null,
    dataEl: null,
    btnRequest: null,
    modal: null,
    checkbox: null,
    btnAccept: null,
    btnCancel: null,
    modalClose: null
  };

  // Initialize elements
  function initElements() {
    elements.container = document.getElementById('creditProfileContainer');
    elements.loadingEl = document.querySelector('.credit-profile-loading');
    elements.noDataEl = document.querySelector('.credit-profile-no-data');
    elements.pendingEl = document.querySelector('.credit-profile-pending');
    elements.dataEl = document.querySelector('.credit-profile-data');
    elements.btnRequest = document.getElementById('btnRequestCreditProfile');
    elements.modal = document.getElementById('creditProfileTermsModal');
    elements.checkbox = document.getElementById('acceptTermsCheckbox');
    elements.btnAccept = document.getElementById('btnAcceptTerms');
    elements.btnCancel = document.getElementById('btnCancelTerms');
    elements.modalClose = document.getElementById('creditProfileTermsModalClose');
  }

  // Show loading state
  function showLoading() {
    elements.loadingEl.style.display = 'block';
    elements.noDataEl.style.display = 'none';
    elements.pendingEl.style.display = 'none';
    elements.dataEl.style.display = 'none';
  }

  // Show no data state
  function showNoData() {
    elements.loadingEl.style.display = 'none';
    elements.noDataEl.style.display = 'block';
    elements.pendingEl.style.display = 'none';
    elements.dataEl.style.display = 'none';
  }

  // Show pending state
  function showPending(request) {
    elements.loadingEl.style.display = 'none';
    elements.noDataEl.style.display = 'none';
    elements.pendingEl.style.display = 'block';
    elements.dataEl.style.display = 'none';

    // Update pending info
    const statusBadge = document.getElementById('requestStatusBadge');
    const requestDate = document.getElementById('requestDate');
    const requestCedula = document.getElementById('requestCedula');

    if (statusBadge) {
      statusBadge.className = 'badge';
      if (request.status === 'pendiente') {
        statusBadge.classList.add('bg-warning');
        statusBadge.textContent = 'Pendiente';
      } else if (request.status === 'procesando') {
        statusBadge.classList.add('bg-info');
        statusBadge.textContent = 'Procesando';
      } else if (request.status === 'error') {
        statusBadge.classList.add('bg-danger');
        statusBadge.textContent = 'Error';
      }
    }

    if (requestDate) {
      const date = new Date(request.requestedAt);
      requestDate.textContent = date.toLocaleString('es-UY');
    }

    if (requestCedula) {
      requestCedula.textContent = request.cedula;
    }
  }

  // Show generated profile
  function showProfileData(request) {
    elements.loadingEl.style.display = 'none';
    elements.noDataEl.style.display = 'none';
    elements.pendingEl.style.display = 'none';
    elements.dataEl.style.display = 'block';

    // Update header
    const profileUpdateDate = document.getElementById('profileUpdateDate');
    if (profileUpdateDate && request.generatedAt) {
      const date = new Date(request.generatedAt);
      profileUpdateDate.textContent = date.toLocaleDateString('es-UY');
    }

    // Update credit score circle
    updateCreditScore(request.creditScore);

    // Update summary cards
    document.getElementById('totalDebtValue').textContent = formatCurrency(request.totalDebt || 0);
    document.getElementById('bcuRatingValue').textContent = request.bcuRating || 'Sin calificación';
    document.getElementById('institutionsCount').textContent = request.profileData?.instituciones?.length || 0;

    // Update institutions list
    renderInstitutions(request.profileData?.instituciones || []);
  }

  // Update credit score circle
  function updateCreditScore(score) {
    const scoreValue = document.getElementById('scoreValue');
    const scoreLabel = document.getElementById('scoreLabel');
    const scoreCircle = document.getElementById('scoreCircle');

    if (!scoreValue || !scoreLabel || !scoreCircle) return;

    const safeScore = Math.max(0, Math.min(1000, score || 500));
    scoreValue.textContent = safeScore;

    // Determine label and color
    let label, color;
    if (safeScore >= 900) {
      label = 'Excelente';
      color = '#28a745'; // green
    } else if (safeScore >= 750) {
      label = 'Muy Bueno';
      color = '#5cb85c'; // light green
    } else if (safeScore >= 600) {
      label = 'Bueno';
      color = '#ffc107'; // yellow
    } else if (safeScore >= 450) {
      label = 'Regular';
      color = '#ff9800'; // orange
    } else if (safeScore >= 300) {
      label = 'Malo';
      color = '#dc3545'; // red
    } else {
      label = 'Muy Malo';
      color = '#a71d2a'; // dark red
    }

    scoreLabel.textContent = label;
    scoreCircle.setAttribute('stroke', color);

    // Animate circle
    const circumference = 2 * Math.PI * 85; // radius = 85
    const progress = safeScore / 1000;
    const offset = circumference * (1 - progress);

    scoreCircle.style.strokeDashoffset = offset;
  }

  // Render institutions list
  function renderInstitutions(institutions) {
    const list = document.getElementById('institutionsList');
    if (!list) return;

    if (!institutions || institutions.length === 0) {
      list.innerHTML = '<p class="text-muted">No hay instituciones registradas</p>';
      return;
    }

    list.innerHTML = institutions.map(inst => `
      <div class="institution-item">
        <div class="institution-header">
          <h5>${inst.nombre}</h5>
          <span class="badge ${getRatingBadgeClass(inst.calificacion)}">${inst.calificacion || 'Sin calificación'}</span>
        </div>
        <div class="institution-details">
          <div class="institution-detail-item">
            <span class="detail-label">Deuda Vigente MN:</span>
            <span class="detail-value">${formatCurrency(inst.rubros?.vigente?.mn || 0)}</span>
          </div>
          <div class="institution-detail-item">
            <span class="detail-label">Deuda Vigente ME:</span>
            <span class="detail-value">${formatCurrency(inst.rubros?.vigente?.me_equivalente_mn || 0)}</span>
          </div>
          ${inst.rubros?.contingencias?.mn || inst.rubros?.contingencias?.me_equivalente_mn ? `
          <div class="institution-detail-item">
            <span class="detail-label">Contingencias:</span>
            <span class="detail-value">${formatCurrency((inst.rubros.contingencias.mn || 0) + (inst.rubros.contingencias.me_equivalente_mn || 0))}</span>
          </div>
          ` : ''}
          <div class="institution-detail-item">
            <span class="detail-label">Total:</span>
            <span class="detail-value font-weight-bold">${formatCurrency(
              (inst.rubros?.vigente?.mn || 0) +
              (inst.rubros?.vigente?.me_equivalente_mn || 0) +
              (inst.rubros?.contingencias?.mn || 0) +
              (inst.rubros?.contingencias?.me_equivalente_mn || 0)
            )}</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  // Get badge class for rating
  function getRatingBadgeClass(rating) {
    if (!rating) return 'bg-secondary';
    if (rating === '1A' || rating === '1B') return 'bg-success';
    if (rating === '1C') return 'bg-info';
    if (rating === '2' || rating === '3') return 'bg-warning';
    return 'bg-danger';
  }

  // Format currency
  function formatCurrency(amount) {
    return new Intl.NumberFormat('es-UY', {
      style: 'currency',
      currency: 'UYU',
      minimumFractionDigits: 2
    }).format(amount);
  }

  // Load credit profile status
  async function loadCreditProfile() {
    if (!window.surlinkConfig?.isAuthenticated) {
      showNoData();
      return;
    }

    try {
      showLoading();

      const response = await fetch('/surlink/credit-profile', {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Error al cargar perfil crediticio');
      }

      const data = await response.json();

      if (!data.requests || data.requests.length === 0) {
        showNoData();
        return;
      }

      // Get the most recent request
      const request = data.requests[0];
      state.currentRequest = request;

      if (request.status === 'generada' && request.hasData) {
        // Load full request details
        const detailResponse = await fetch(`/surlink/credit-profile/${request.id}`, {
          credentials: 'include'
        });

        if (detailResponse.ok) {
          const detailData = await detailResponse.json();
          showProfileData(detailData.request);
        } else {
          showPending(request);
        }
      } else if (request.status === 'pendiente' || request.status === 'procesando') {
        showPending(request);
      } else {
        showNoData();
      }
    } catch (error) {
      console.error('Error loading credit profile:', error);
      showNoData();
    }
  }

  // Open terms modal
  function openTermsModal() {
    if (!window.surlinkConfig?.isAuthenticated) {
      alert('Debes iniciar sesión para solicitar tu perfil crediticio');
      return;
    }

    elements.modal.style.display = 'flex';
    setTimeout(() => {
      elements.modal.classList.add('active');
    }, 10);
  }

  // Close terms modal
  function closeTermsModal() {
    elements.modal.classList.remove('active');
    setTimeout(() => {
      elements.modal.style.display = 'none';
      elements.checkbox.checked = false;
      elements.btnAccept.disabled = true;
    }, 300);
  }

  // Submit credit profile request
  async function submitRequest() {
    const cedula = await promptCedula();
    if (!cedula) return;

    try {
      elements.btnAccept.disabled = true;
      elements.btnAccept.textContent = 'Procesando...';

      const response = await fetch('/surlink/credit-profile/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ cedula })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear solicitud');
      }

      closeTermsModal();

      // Show success message
      if (window.Notification && window.Notification.showSuccess) {
        window.Notification.showSuccess('Solicitud creada exitosamente. El proceso puede demorar hasta 24 horas.');
      } else {
        alert('Solicitud creada exitosamente. El proceso puede demorar hasta 24 horas.');
      }

      // Reload profile
      setTimeout(() => {
        loadCreditProfile();
      }, 500);
    } catch (error) {
      console.error('Error submitting request:', error);
      if (window.Notification && window.Notification.showError) {
        window.Notification.showError(error.message);
      } else {
        alert('Error: ' + error.message);
      }
    } finally {
      elements.btnAccept.disabled = false;
      elements.btnAccept.textContent = 'Aceptar y Solicitar';
    }
  }

  // Prompt for cedula
  async function promptCedula() {
    return new Promise((resolve) => {
      const cedula = prompt('Ingresá tu número de cédula de identidad (sin puntos ni guiones):');

      if (!cedula) {
        resolve(null);
        return;
      }

      const clean = cedula.replace(/\D/g, '');

      if (clean.length < 7 || clean.length > 8) {
        alert('Formato de cédula inválido. Debe tener entre 7 y 8 dígitos.');
        resolve(null);
        return;
      }

      resolve(clean);
    });
  }

  // Attach events
  function attachEvents() {
    // Request button
    if (elements.btnRequest) {
      elements.btnRequest.addEventListener('click', openTermsModal);
    }

    // Modal close
    if (elements.modalClose) {
      elements.modalClose.addEventListener('click', closeTermsModal);
    }

    if (elements.btnCancel) {
      elements.btnCancel.addEventListener('click', closeTermsModal);
    }

    // Checkbox to enable accept button
    if (elements.checkbox) {
      elements.checkbox.addEventListener('change', (e) => {
        elements.btnAccept.disabled = !e.target.checked;
      });
    }

    // Accept button
    if (elements.btnAccept) {
      elements.btnAccept.addEventListener('click', submitRequest);
    }

    // Close modal when clicking backdrop
    if (elements.modal) {
      elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) {
          closeTermsModal();
        }
      });
    }

    // Listen for Financial tab changes
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('[data-financial-tab="perfil-crediticio"]');
      if (tab) {
        // Show credit profile container
        const resultsContainer = document.getElementById('surlinkFinancialResults');
        const creditContainer = document.getElementById('creditProfileContainer');
        const feedback = document.querySelector('[data-feedback="financial"]');

        if (resultsContainer) resultsContainer.style.display = 'none';
        if (creditContainer) creditContainer.style.display = 'block';
        if (feedback) feedback.hidden = true;

        // Load profile if not loaded
        if (!state.currentRequest) {
          loadCreditProfile();
        }
      } else if (e.target.closest('[data-financial-tab]')) {
        // Hide credit profile container for other tabs
        const resultsContainer = document.getElementById('surlinkFinancialResults');
        const creditContainer = document.getElementById('creditProfileContainer');

        if (resultsContainer) resultsContainer.style.display = '';
        if (creditContainer) creditContainer.style.display = 'none';
      }
    });
  }

  // Initialize
  function init() {
    initElements();

    if (!elements.container) {
      console.warn('Credit profile container not found');
      return;
    }

    attachEvents();
  }

  // Boot when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose reload function globally
  window.CreditProfile = {
    reload: loadCreditProfile
  };
})();
