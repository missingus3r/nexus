(() => {
  const config = window.surlinkConfig || {};
  const API_BASE = '/api/surlink';
  const PAGE_SIZE = 9;

  const DEFAULT_FILTERS = {
    casas: () => ({
      search: '',
      propertyType: '',
      operation: '',
      city: '',
      minPrice: '',
      maxPrice: ''
    }),
    academy: () => ({
      search: '',
      modality: '',
      city: ''
    }),
    autos: () => ({
      search: '',
      brand: '',
      model: '',
      minPrice: '',
      maxPrice: ''
    }),
    financial: () => ({
      search: '',
      serviceType: '',
      institution: ''
    })
  };

  const DEFAULT_OPTIONS = {
    operations: ['Venta', 'Alquiler', 'Temporario'],
    modalities: ['Presencial', 'Online', 'Híbrida']
  };

  const elements = {
    tabs: document.querySelectorAll('[data-surlink-tab]'),
    sections: document.querySelectorAll('[data-surlink-section]'),
    quickLinks: document.querySelectorAll('[data-surlink-quick]'),
    results: {
      casas: document.getElementById('surlinkCasasResults'),
      academy: document.getElementById('surlinkAcademyResults'),
      autos: document.getElementById('surlinkAutosResults'),
      financial: document.getElementById('surlinkFinancialResults'),
      construccion: document.getElementById('surlinkConstruccionResults')
    },
    feedback: {
      casas: document.querySelector('[data-feedback="casas"]'),
      academy: document.querySelector('[data-feedback="academy"]'),
      autos: document.querySelector('[data-feedback="autos"]'),
      financial: document.querySelector('[data-feedback="financial"]'),
      construccion: document.querySelector('[data-feedback="construccion"]')
    },
    pagination: {
      casas: document.querySelector('[data-pagination="casas"]'),
      academy: document.querySelector('[data-pagination="academy"]'),
      autos: document.querySelector('[data-pagination="autos"]'),
      financial: document.querySelector('[data-pagination="financial"]')
    },
    forms: {
      casas: document.getElementById('surlinkCasasForm'),
      academy: document.getElementById('surlinkAcademyForm'),
      autos: document.getElementById('surlinkAutosForm'),
      financial: document.getElementById('surlinkFinancialForm')
    },
    selects: {
      propertyType: document.getElementById('surlinkCasasTipo'),
      operation: document.getElementById('surlinkCasasOperacion'),
      academyModalidad: document.getElementById('surlinkAcademyModalidad'),
      autosMarca: document.getElementById('surlinkAutosMarca'),
      financialTipo: document.getElementById('surlinkFinancialTipo')
    },
    resetButtons: document.querySelectorAll('[data-surlink-reset]'),
    modal: document.getElementById('surlinkDetailModal'),
    modalBody: document.getElementById('surlinkModalBody'),
    siteModal: document.getElementById('surlinkSiteModal'),
    siteModalBody: document.getElementById('surlinkSiteModalBody'),
    construccionTabs: document.querySelectorAll('[data-construccion-tab]'),
    academyTabs: document.querySelectorAll('[data-academy-tab]'),
    financialTabs: document.querySelectorAll('[data-financial-tab]')
  };

  const state = {
    activeCategory: 'casas',
    activeConstruccionTab: 'proyectos',
    activeAcademyTab: 'universidades',
    activeFinancialTab: 'bancos',
    filters: {
      casas: DEFAULT_FILTERS.casas(),
      academy: DEFAULT_FILTERS.academy(),
      autos: DEFAULT_FILTERS.autos(),
      financial: DEFAULT_FILTERS.financial()
    },
    pagination: {
      casas: { page: 1, totalPages: 1 },
      academy: { page: 1, totalPages: 1 },
      autos: { page: 1, totalPages: 1 },
      financial: { page: 1, totalPages: 1 }
    },
    loaded: {
      casas: false,
      academy: false,
      autos: false,
      financial: false,
      construccion: false
    },
    facets: {
      casas: {},
      academy: {},
      autos: {},
      financial: {}
    },
    construccionSites: {
      proyectos: [],
      contenedores: [],
      remates: []
    },
    academySites: {
      universidades: [],
      institutos: [],
      idiomas: [],
      tecnologia: []
    },
    financialSites: {
      bancos: [],
      cooperativas: [],
      seguros: [],
      financieras: [],
      inversion: []
    }
  };

  const escapeHtml = (value = '') =>
    String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const formatFrequency = frequency => {
    switch (frequency) {
      case 'monthly':
        return 'mes';
      case 'annual':
        return 'año';
      case 'weekly':
        return 'semana';
      case 'seasonal':
        return 'temporada';
      case 'negotiable':
        return 'negociable';
      default:
        return null;
    }
  };

  const formatPrice = listing => {
    const price = listing.price || {};
    if (typeof price.amount === 'number' && price.amount > 0) {
      const formatter = new Intl.NumberFormat('es-UY', {
        style: 'currency',
        currency: price.currency || 'USD',
        maximumFractionDigits: price.amount % 1 === 0 ? 0 : 2
      });
      const label = formatter.format(price.amount);
      const frequency = formatFrequency(price.frequency);
      return frequency ? `${label} / ${frequency}` : label;
    }
    if (price.frequency === 'negotiable') {
      return 'Precio negociable';
    }
    return 'Consultar';
  };

  const formatLocation = listing => {
    const loc = listing.location || {};
    const points = [loc.neighborhood, loc.city, loc.country].filter(Boolean);
    return points.length ? points.join(' • ') : 'Ubicación a confirmar';
  };

  const formatPillText = value => {
    if (value === undefined || value === null) return '';
    const trimmed = value.toString().trim();
    return trimmed.length > 10 ? `${trimmed.slice(0, 10)}…` : trimmed;
  };

  const formatDate = value => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('es-UY', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const mergeAttributes = listing => {
    const attrs = listing.attributes || {};
    if (attrs instanceof Map) {
      return Object.fromEntries(attrs);
    }
    return { ...attrs };
  };

  const collectTags = listing => {
    const attrs = mergeAttributes(listing);
    const tags = new Set();

    if (listing.category === 'casas') {
      if (attrs.operacion) tags.add(attrs.operacion);
      if (attrs.tipo) tags.add(attrs.tipo);
      if (attrs.dormitorios) tags.add(`${attrs.dormitorios} dormitorios`);
      if (attrs.banos || attrs.baños) tags.add(`${attrs.banos || attrs.baños} baños`);
      if (attrs.m2 || attrs.superficie) tags.add(`${attrs.m2 || attrs.superficie} m²`);
    } else if (listing.category === 'autos') {
      if (attrs.marca) tags.add(attrs.marca);
      if (attrs.modelo) tags.add(attrs.modelo);
      if (attrs.anio || attrs.año) tags.add(`Año ${attrs.anio || attrs.año}`);
      if (attrs.km) tags.add(`${attrs.km} km`);
      if (attrs.motor) tags.add(attrs.motor);
    } else if (listing.category === 'academy') {
      if (attrs.modalidad) tags.add(attrs.modalidad);
      if (listing.programs?.length) tags.add(`${listing.programs.length} programas`);
      if (attrs.duracion) tags.add(`Duración ${attrs.duracion}`);
    } else if (listing.category === 'financial') {
      if (attrs.tipoServicio) tags.add(attrs.tipoServicio);
      if (attrs.institucion) tags.add(attrs.institucion);
      if (attrs.plazo) tags.add(`Plazo ${attrs.plazo}`);
      if (attrs.tasa) tags.add(`Tasa ${attrs.tasa}`);
    }

    (listing.tags || []).forEach(tag => tag && tags.add(tag));

    return Array.from(tags)
      .map(formatPillText)
      .filter(Boolean)
      .slice(0, 4);
  };

  const hydrateFiltersFromForm = (category, form) => {
    const data = new FormData(form);
    const defaults = DEFAULT_FILTERS[category]();

    data.forEach((value, key) => {
      defaults[key] = value.trim();
    });

    state.filters[category] = defaults;
  };

  const populateSelect = (select, items = [], placeholder) => {
    if (!select) return;
    const current = select.value;
    const finalItems = Array.from(new Set(items.filter(Boolean)));

    select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>${
      finalItems
        .map(item => `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`)
        .join('')
    }`;

    if (current && finalItems.includes(current)) {
      select.value = current;
    }
  };

  const updateFacets = (category, facets) => {
    state.facets[category] = facets;

    if (category === 'casas') {
      const propertyTypes = facets.propertyTypes?.length ? facets.propertyTypes : facets.defaultHouseTypes || [];
      const operations = facets.operations?.length ? facets.operations : DEFAULT_OPTIONS.operations;

      populateSelect(elements.selects.propertyType, propertyTypes, 'Todos');
      populateSelect(elements.selects.operation, operations, 'Todas');
    }

    if (category === 'academy') {
      const modalities = facets.modalities?.length ? facets.modalities : DEFAULT_OPTIONS.modalities;
      populateSelect(elements.selects.academyModalidad, modalities, 'Todas');
    }

    if (category === 'autos') {
      populateSelect(elements.selects.autosMarca, facets.vehicleBrands || [], 'Todas');
    }

    if (category === 'financial') {
      const serviceTypes = facets.serviceTypes?.length ? facets.serviceTypes : facets.defaultFinancialTypes || [];
      populateSelect(elements.selects.financialTipo, serviceTypes, 'Todos');
    }
  };

  const setActiveCategory = category => {
    state.activeCategory = category;

    // Save to localStorage
    try {
      localStorage.setItem('surlinkActiveCategory', category);
    } catch (e) {
      console.error('Error saving category to localStorage:', e);
    }

    elements.tabs.forEach(tab => {
      const match = tab.dataset.surlinkTab === category;
      tab.classList.toggle('active', match);
      tab.setAttribute('aria-selected', match ? 'true' : 'false');
    });

    elements.sections.forEach(section => {
      const match = section.dataset.surlinkSection === category;
      section.classList.toggle('active', match);
      section.setAttribute('aria-hidden', match ? 'false' : 'true');
    });
  };

  const showFeedback = (category, message, type = 'info') => {
    const feedback = elements.feedback[category];
    if (!feedback) return;
    feedback.textContent = message;
    feedback.className = `surlink-feedback surlink-feedback-${type}`;
    feedback.hidden = false;
  };

  const hideFeedback = category => {
    const feedback = elements.feedback[category];
    if (!feedback) return;
    feedback.hidden = true;
  };

  const setLoading = (category, isLoading) => {
    const container = elements.results[category];
    if (!container) return;
    if (isLoading) {
      container.innerHTML = '<div class="surlink-loading">Buscando resultados...</div>';
    }
  };

  const renderPagination = (category, pagination) => {
    const container = elements.pagination[category];
    if (!container) return;

    const { page = 1, totalPages = 1 } = pagination || {};

    if (totalPages <= 1) {
      container.innerHTML = '';
      return;
    }

    const prevDisabled = page <= 1 ? 'disabled' : '';
    const nextDisabled = page >= totalPages ? 'disabled' : '';

    container.innerHTML = `
      <button type="button" data-page="${page - 1}" ${prevDisabled}>Anterior</button>
      <span class="surlink-pill">Página ${page} de ${totalPages}</span>
      <button type="button" data-page="${page + 1}" ${nextDisabled}>Siguiente</button>
    `;
  };

  const updateLikeButtons = (id, liked, likes) => {
    document.querySelectorAll(`[data-action="like"][data-id="${id}"]`).forEach(btn => {
      btn.dataset.liked = liked ? 'true' : 'false';
      const counter = btn.querySelector('[data-like-count]');
      if (counter) counter.textContent = likes;
    });
  };

  const buildCard = listing => {
    const tags = collectTags(listing);
    const summary = listing.summary || listing.description || '';
    const truncated = summary.length > 140 ? `${summary.slice(0, 140)}…` : summary;
    const likeLabel = listing.isLiked ? 'Quitar de favoritos' : 'Guardar';

    return `
      <article class="surlink-card" data-listing="${listing.id}" data-category="${listing.category}">
        <div class="surlink-card-header">
          <div>
            <h3 class="surlink-card-title">${escapeHtml(listing.title)}</h3>
            <div class="surlink-card-price">${escapeHtml(formatPrice(listing))}</div>
          </div>
          <div class="surlink-card-actions">
            <button type="button" class="surlink-like-btn" data-action="like" data-id="${listing.id}" data-category="${listing.category}" data-liked="${listing.isLiked ? 'true' : 'false'}" title="${escapeHtml(likeLabel)}">
              <span class="surlink-like-icon">♥</span>
              <span data-like-count>${listing.likeCount || 0}</span>
            </button>
          </div>
        </div>
        <p class="surlink-card-summary">${escapeHtml(truncated)}</p>
        <div class="surlink-card-tags">
          ${tags.map(tag => `<span class="surlink-pill">${escapeHtml(formatPillText(tag))}</span>`).join('')}
        </div>
        <div class="surlink-card-footer">
          <span class="surlink-pill">${escapeHtml(formatPillText(formatLocation(listing)))}</span>
          <button type="button" class="btn btn-primary" data-action="detail" data-id="${listing.id}">Ver detalles</button>
        </div>
      </article>
    `;
  };

  const renderListings = (category, results) => {
    const container = elements.results[category];
    if (!container) return;

    if (!results || results.length === 0) {
      container.innerHTML = `
        <div class="surlink-empty">
          No encontramos resultados para los filtros seleccionados.
          Probá con otra búsqueda o ajustá la categoría.
        </div>
      `;
      return;
    }

    container.innerHTML = results.map(buildCard).join('');
  };

  const buildDetailRows = (listing) => {
    const attrs = mergeAttributes(listing);
    const rows = [];

    if (listing.category === 'casas') {
      rows.push(
        attrs.tipo && ['Tipo', attrs.tipo],
        attrs.operacion && ['Operación', attrs.operacion],
        (attrs.dormitorios || attrs.dorms) && ['Dormitorios', attrs.dormitorios || attrs.dorms],
        (attrs.banos || attrs.baños) && ['Baños', attrs.banos || attrs.baños],
        (attrs.m2 || attrs.superficie) && ['Superficie', `${attrs.m2 || attrs.superficie} m²`],
        attrs.entrega && ['Entrega', attrs.entrega],
        attrs.garage && ['Garage', attrs.garage]
      );
    } else if (listing.category === 'autos') {
      rows.push(
        attrs.marca && ['Marca', attrs.marca],
        attrs.modelo && ['Modelo', attrs.modelo],
        (attrs.anio || attrs.año) && ['Año', attrs.anio || attrs.año],
        attrs.km && ['Kilometraje', `${attrs.km} km`],
        attrs.motor && ['Motor', attrs.motor],
        attrs.combustible && ['Combustible', attrs.combustible],
        attrs.transmision && ['Transmisión', attrs.transmision]
      );
    } else if (listing.category === 'academy') {
      rows.push(
        attrs.modalidad && ['Modalidad', attrs.modalidad],
        attrs.duracion && ['Duración', attrs.duracion],
        attrs.inicio && ['Próximo inicio', attrs.inicio],
        attrs.costo && ['Costo', attrs.costo],
        attrs.certificacion && ['Certificación', attrs.certificacion]
      );
    } else if (listing.category === 'financial') {
      rows.push(
        attrs.tipoServicio && ['Tipo de servicio', attrs.tipoServicio],
        attrs.institucion && ['Institución', attrs.institucion],
        attrs.plazo && ['Plazo', attrs.plazo],
        attrs.tasa && ['Tasa de interés', attrs.tasa],
        attrs.montoMinimo && ['Monto mínimo', `USD ${attrs.montoMinimo}`],
        attrs.montoMaximo && ['Monto máximo', `USD ${attrs.montoMaximo}`],
        attrs.requisitos && ['Requisitos', attrs.requisitos]
      );
    }

    return rows
      .filter(Boolean)
      .map(([label, value]) => `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`)
      .join('');
  };

  const buildContactBlock = listing => {
    const contact = listing.contact || {};
    const parts = [];

    if (contact.phone) {
      parts.push(`<span><strong>Teléfono:</strong> <a href="tel:${escapeHtml(contact.phone)}">${escapeHtml(contact.phone)}</a></span>`);
    }

    if (contact.whatsapp) {
      const phone = encodeURIComponent(contact.whatsapp);
      parts.push(`<span><strong>WhatsApp:</strong> <a href="https://wa.me/${phone}" target="_blank" rel="noopener">Contactar</a></span>`);
    }

    if (contact.email) {
      parts.push(`<span><strong>Email:</strong> <a href="mailto:${escapeHtml(contact.email)}">${escapeHtml(contact.email)}</a></span>`);
    }

    if (contact.website) {
      parts.push(`<span><strong>Sitio:</strong> <a href="${escapeHtml(contact.website)}" target="_blank" rel="noopener">Visitar</a></span>`);
    }

    if (listing.source) {
      parts.push(`<span><strong>Fuente:</strong> ${escapeHtml(listing.source)}</span>`);
    }

    return parts.length
      ? parts.join('')
      : '<span>Contactá al equipo Vortex para más información.</span>';
  };

  const buildProgramsList = listing => {
    if (!listing.programs || !listing.programs.length) return '';
    return `
      <div class="surlink-detail-card">
        <h4>Programas destacados</h4>
        <div class="surlink-detail-list">
          ${listing.programs.map(program => `<span>• ${escapeHtml(program)}</span>`).join('')}
        </div>
      </div>
    `;
  };

  const buildCommentsSection = listing => {
    const canComment = listing.category !== 'academy' && listing.category !== 'financial';
    const isAuthenticated = config.isAuthenticated === true || config.isAuthenticated === 'true';

    const comments = (listing.comments || []).map(comment => {
      const canRemove = config.role === 'admin' || config.uid === comment.uid;
      return `
        <div class="surlink-comment" data-comment="${comment.id}">
          <div class="surlink-comment-header">
            <span>${escapeHtml(comment.username || 'Usuario')}</span>
            <small>${escapeHtml(formatDate(comment.createdAt))}</small>
          </div>
          <div class="surlink-comment-body">${escapeHtml(comment.body)}</div>
          ${canRemove ? `<button type="button" class="btn btn-secondary" data-action="delete-comment" data-comment-id="${comment.id}">Eliminar</button>` : ''}
        </div>
      `;
    }).join('');

    let footerMessage = '';

    if (!canComment) {
      footerMessage = '<div class="surlink-empty">Esta categoría solo admite favoritos.</div>';
    } else if (!isAuthenticated) {
      footerMessage = '<div class="surlink-empty">Iniciá sesión para dejar tu comentario y guardar favoritos.</div>';
    }

    return `
      <section class="surlink-comments">
        <header class="surlink-section-header">
          <h3>Comunidad</h3>
          <p>Leé experiencias y comentarios de otros usuarios Vortex.</p>
        </header>
        <div id="surlinkCommentList">
          ${comments || '<div class="surlink-empty">Todavía no hay comentarios. Sé el primero en participar.</div>'}
        </div>
        ${canComment && isAuthenticated ? `
          <form id="surlinkCommentForm" class="surlink-comment-form" data-listing="${listing.id}">
            <div class="surlink-input-group">
              <label for="surlinkCommentInput">Tu comentario</label>
              <textarea id="surlinkCommentInput" name="body" rows="3" placeholder="Compartí tu experiencia o dejá una pregunta" required maxlength="1000"></textarea>
            </div>
            <br>
            <button type="submit" class="btn btn-primary">Publicar comentario</button>
          </form>
        ` : footerMessage}
      </section>
    `;
  };

  const renderModal = listing => {
    if (!elements.modalBody) return;

    const tags = collectTags(listing);

    elements.modal.dataset.listingId = listing.id;
    elements.modal.dataset.category = listing.category;

    elements.modalBody.innerHTML = `
      <div class="surlink-modal-hero">
        <div class="surlink-card-header">
          <div>
            <h3>${escapeHtml(listing.title)}</h3>
            <div class="surlink-card-price">${escapeHtml(formatPrice(listing))}</div>
          </div>
          <div class="surlink-card-actions">
            <button type="button" class="surlink-like-btn" data-action="like" data-id="${listing.id}" data-category="${listing.category}" data-liked="${listing.isLiked ? 'true' : 'false'}">
              <span class="surlink-like-icon">♥</span>
              <span data-like-count>${listing.likeCount || 0}</span>
            </button>
          </div>
        </div>
        <p>${escapeHtml(listing.description || listing.summary || '')}</p>
        <div class="surlink-card-tags">
          ${tags.map(tag => `<span class="surlink-pill">${escapeHtml(formatPillText(tag))}</span>`).join('')}
        </div>
      </div>

      <div class="surlink-modal-subgrid">
        <div class="surlink-detail-card">
          <h4>Ubicación</h4>
          <div class="surlink-detail-list">
            <span>${escapeHtml(formatLocation(listing))}</span>
            ${listing.metrics?.views ? `<span><strong>Visitas:</strong> ${listing.metrics.views}</span>` : ''}
            <span><strong>Actualizado:</strong> ${escapeHtml(formatDate(listing.updatedAt || listing.createdAt))}</span>
          </div>
        </div>

        <div class="surlink-detail-card">
          <h4>Características</h4>
          <div class="surlink-detail-list">
            ${buildDetailRows(listing) || '<span>Información curada, pronto más detalles.</span>'}
          </div>
        </div>

        <div class="surlink-detail-card">
          <h4>Contacto</h4>
          <div class="surlink-detail-list">
            ${buildContactBlock(listing)}
          </div>
        </div>

        ${buildProgramsList(listing)}
      </div>

      ${buildCommentsSection(listing)}
    `;
  };

  const openModal = async id => {
    if (!elements.modal) return;
    elements.modal.classList.add('is-open');
    elements.modal.setAttribute('aria-hidden', 'false');
    elements.modalBody.innerHTML = '<div class="surlink-modal-loading">Cargando información...</div>';

    try {
      const listing = await request(`${API_BASE}/listings/${id}`);
      renderModal(listing);
    } catch (error) {
      elements.modalBody.innerHTML = `<div class="surlink-empty">Error al obtener el detalle: ${escapeHtml(error.message)}</div>`;
    }
  };

  const closeModal = () => {
    if (!elements.modal) return;
    elements.modal.classList.remove('is-open');
    elements.modal.setAttribute('aria-hidden', 'true');
    elements.modalBody.innerHTML = '';
    delete elements.modal.dataset.listingId;
    delete elements.modal.dataset.category;
  };

  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      },
      ...options
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data.error || 'Ocurrió un error inesperado';
      throw new Error(message);
    }

    return data;
  };

  const buildQuery = category => {
    const params = new URLSearchParams({
      category,
      limit: PAGE_SIZE,
      page: state.pagination[category].page
    });

    Object.entries(state.filters[category]).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });

    return params;
  };

  const loadCategory = async (category, { force = false } = {}) => {
    setActiveCategory(category);
    hideFeedback(category);

    if (state.loaded[category] && !force) return;

    setLoading(category, true);

    try {
      const params = buildQuery(category);
      const data = await request(`${API_BASE}/listings?${params.toString()}`);

      renderListings(category, data.results);
      renderPagination(category, data.pagination);
      updateFacets(category, data.facets || {});

      state.pagination[category] = data.pagination || { page: 1, totalPages: 1 };
      state.loaded[category] = true;
    } catch (error) {
      showFeedback(category, error.message, 'error');
    }
  };

  const toggleLike = async (id) => {
    const isAuthenticated = config.isAuthenticated === true || config.isAuthenticated === 'true';

    if (!isAuthenticated) {
      toastWarning('Iniciá sesión para guardar favoritos y comentar.');
      return;
    }

    try {
      const data = await request(`${API_BASE}/listings/${id}/like`, {
        method: 'POST'
      });
      updateLikeButtons(id, data.liked, data.likes);
    } catch (error) {
      toastError(error.message);
    }
  };

  const handleCommentSubmit = async (form) => {
    const body = form.body.value.trim();
    if (body.length < 2) return;

    const id = form.dataset.listing;

    try {
      const data = await request(`${API_BASE}/listings/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body })
      });

      const list = document.getElementById('surlinkCommentList');
      if (!list) return;

      const comment = data.comment;

      const template = document.createElement('div');
      template.className = 'surlink-comment';
      template.dataset.comment = comment.id;
      template.innerHTML = `
        <div class="surlink-comment-header">
          <span>${escapeHtml(comment.username || 'Usuario')}</span>
          <small>${escapeHtml(formatDate(comment.createdAt))}</small>
        </div>
        <div class="surlink-comment-body">${escapeHtml(comment.body)}</div>
        <button type="button" class="btn btn-secondary" data-action="delete-comment" data-comment-id="${comment.id}">Eliminar</button>
      `;

      if (list.firstElementChild && list.firstElementChild.classList.contains('surlink-empty')) {
        list.innerHTML = '';
      }

      list.prepend(template);

      form.reset();
    } catch (error) {
      toastError(error.message);
    }
  };

  const handleCommentDelete = async (commentId) => {
    const listingId = elements.modal.dataset.listingId;
    if (!listingId) return;

    try {
      await request(`${API_BASE}/listings/${listingId}/comments/${commentId}`, {
        method: 'DELETE'
      });

      const node = document.querySelector(`.surlink-comment[data-comment="${commentId}"]`);
      if (node) node.remove();

      const list = document.getElementById('surlinkCommentList');
      if (list && !list.children.length) {
        list.innerHTML = '<div class="surlink-empty">El comentario fue eliminado.</div>';
      }
    } catch (error) {
      toastError(error.message);
    }
  };

  // Construccion - LocalStorage helpers for favorites
  const getConstruccionFavorites = () => {
    try {
      const favorites = localStorage.getItem('construccionFavorites');
      return favorites ? JSON.parse(favorites) : [];
    } catch {
      return [];
    }
  };

  const saveConstruccionFavorite = (siteId) => {
    const favorites = getConstruccionFavorites();
    if (!favorites.includes(siteId)) {
      favorites.push(siteId);
      localStorage.setItem('construccionFavorites', JSON.stringify(favorites));
    }
    return favorites;
  };

  const removeConstruccionFavorite = (siteId) => {
    let favorites = getConstruccionFavorites();
    favorites = favorites.filter(id => id !== siteId);
    localStorage.setItem('construccionFavorites', JSON.stringify(favorites));
    return favorites;
  };

  const isConstruccionFavorite = (siteId) => {
    const favorites = getConstruccionFavorites();
    return favorites.includes(siteId);
  };

  // Build card for construccion site
  const buildConstruccionCard = site => {
    const isLiked = isConstruccionFavorite(site.id);
    const likeLabel = isLiked ? 'Quitar de favoritos' : 'Guardar en favoritos';

    return `
      <article class="construccion-site-card" data-site-id="${site.id}">
        <div class="construccion-card-header">
          <div class="construccion-card-logo">
            <img src="${escapeHtml(site.logo)}" alt="${escapeHtml(site.name)}" loading="lazy" onerror="this.style.display='none'">
          </div>
          <button type="button" class="surlink-like-btn construccion-like-btn" data-action="like-construccion" data-site-id="${site.id}" data-liked="${isLiked ? 'true' : 'false'}" title="${escapeHtml(likeLabel)}">
            <span class="surlink-like-icon">♥</span>
          </button>
        </div>
        <div class="construccion-card-content">
          <h3 class="construccion-card-title">${escapeHtml(site.name)}</h3>
          <p class="construccion-card-description">${escapeHtml(site.description)}</p>
        </div>
        <div class="construccion-card-footer">
          <a href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary construccion-visit-btn">
            Visitar sitio
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 0.25rem;">
              <line x1="7" y1="17" x2="17" y2="7"></line>
              <polyline points="7 7 17 7 17 17"></polyline>
            </svg>
          </a>
        </div>
      </article>
    `;
  };

  // Load construccion sites
  const loadConstruccionSites = async (subcategory) => {
    const container = elements.results.construccion;
    if (!container) return;

    container.innerHTML = '<div class="surlink-loading">Cargando sitios...</div>';
    hideFeedback('construccion');

    try {
      const params = new URLSearchParams({ subcategory });
      const data = await request(`${API_BASE}/construccion/sites?${params.toString()}`);

      state.construccionSites[subcategory] = data.sites || [];
      renderConstruccionSites(data.sites || []);
    } catch (error) {
      showFeedback('construccion', error.message, 'error');
      container.innerHTML = '';
    }
  };

  // Render construccion sites
  const renderConstruccionSites = (sites) => {
    const container = elements.results.construccion;
    if (!container) return;

    if (!sites || sites.length === 0) {
      container.innerHTML = `
        <div class="surlink-empty">
          No hay sitios disponibles en esta categoría.
        </div>
      `;
      return;
    }

    container.innerHTML = sites.map(buildConstruccionCard).join('');
  };

  // Set active construccion tab
  const setActiveConstruccionTab = (subcategory) => {
    state.activeConstruccionTab = subcategory;

    // Save to localStorage
    try {
      localStorage.setItem('surlinkActiveConstruccionTab', subcategory);
    } catch (e) {
      console.error('Error saving construccion tab to localStorage:', e);
    }

    elements.construccionTabs.forEach(tab => {
      const match = tab.dataset.construccionTab === subcategory;
      tab.classList.toggle('active', match);
    });

    loadConstruccionSites(subcategory);
  };

  // Toggle construccion like
  const toggleConstruccionLike = (siteId) => {
    const isLiked = isConstruccionFavorite(siteId);

    if (isLiked) {
      removeConstruccionFavorite(siteId);
    } else {
      saveConstruccionFavorite(siteId);
    }

    // Update UI
    document.querySelectorAll(`[data-action="like-construccion"][data-site-id="${siteId}"]`).forEach(btn => {
      const nowLiked = !isLiked;
      btn.dataset.liked = nowLiked ? 'true' : 'false';
      btn.title = nowLiked ? 'Quitar de favoritos' : 'Guardar en favoritos';
    });
  };

  // Academy - LocalStorage helpers for favorites
  const getAcademyFavorites = () => {
    try {
      const favorites = localStorage.getItem('academyFavorites');
      return favorites ? JSON.parse(favorites) : [];
    } catch {
      return [];
    }
  };

  const saveAcademyFavorite = (siteId) => {
    const favorites = getAcademyFavorites();
    if (!favorites.includes(siteId)) {
      favorites.push(siteId);
      localStorage.setItem('academyFavorites', JSON.stringify(favorites));
    }
    return favorites;
  };

  const removeAcademyFavorite = (siteId) => {
    let favorites = getAcademyFavorites();
    favorites = favorites.filter(id => id !== siteId);
    localStorage.setItem('academyFavorites', JSON.stringify(favorites));
    return favorites;
  };

  const isAcademyFavorite = (siteId) => {
    const favorites = getAcademyFavorites();
    return favorites.includes(siteId);
  };

  // Build card for academy site
  const buildAcademyCard = site => {
    const isLiked = isAcademyFavorite(site.id);
    const likeLabel = isLiked ? 'Quitar de favoritos' : 'Guardar en favoritos';

    return `
      <article class="construccion-site-card" data-site-id="${site.id}">
        <div class="construccion-card-header">
          <div class="construccion-card-logo">
            <img src="${escapeHtml(site.logo)}" alt="${escapeHtml(site.name)}" loading="lazy" onerror="this.style.display='none'">
          </div>
          <button type="button" class="surlink-like-btn construccion-like-btn" data-action="like-academy" data-site-id="${site.id}" data-liked="${isLiked ? 'true' : 'false'}" title="${escapeHtml(likeLabel)}">
            <span class="surlink-like-icon">♥</span>
          </button>
        </div>
        <div class="construccion-card-content">
          <h3 class="construccion-card-title">${escapeHtml(site.name)}</h3>
          <p class="construccion-card-description">${escapeHtml(site.description)}</p>
        </div>
        <div class="construccion-card-footer">
          <button type="button" class="btn btn-primary construccion-visit-btn" data-action="view-academy" data-site-id="${site.id}">
            Ver detalles
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 0.25rem;">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </button>
        </div>
      </article>
    `;
  };

  // Load academy sites
  const loadAcademySites = async (subcategory) => {
    const container = elements.results.academy;
    if (!container) return;

    container.innerHTML = '<div class="surlink-loading">Cargando sitios...</div>';
    hideFeedback('academy');

    try {
      const params = new URLSearchParams({ subcategory });
      const data = await request(`${API_BASE}/academy/sites?${params.toString()}`);

      state.academySites[subcategory] = data.sites || [];
      renderAcademySites(data.sites || []);
    } catch (error) {
      showFeedback('academy', error.message, 'error');
      container.innerHTML = '';
    }
  };

  // Render academy sites
  const renderAcademySites = (sites) => {
    const container = elements.results.academy;
    if (!container) return;

    if (!sites || sites.length === 0) {
      container.innerHTML = `
        <div class="surlink-empty">
          No hay sitios disponibles en esta categoría.
        </div>
      `;
      return;
    }

    container.innerHTML = sites.map(buildAcademyCard).join('');
  };

  // Set active academy tab
  const setActiveAcademyTab = (subcategory) => {
    state.activeAcademyTab = subcategory;

    // Save to localStorage
    try {
      localStorage.setItem('surlinkActiveAcademyTab', subcategory);
    } catch (e) {
      console.error('Error saving academy tab to localStorage:', e);
    }

    elements.academyTabs.forEach(tab => {
      const match = tab.dataset.academyTab === subcategory;
      tab.classList.toggle('active', match);
    });

    loadAcademySites(subcategory);
  };

  // Toggle academy like
  const toggleAcademyLike = (siteId) => {
    const isLiked = isAcademyFavorite(siteId);

    if (isLiked) {
      removeAcademyFavorite(siteId);
    } else {
      saveAcademyFavorite(siteId);
    }

    // Update UI
    document.querySelectorAll(`[data-action="like-academy"][data-site-id="${siteId}"]`).forEach(btn => {
      const nowLiked = !isLiked;
      btn.dataset.liked = nowLiked ? 'true' : 'false';
      btn.title = nowLiked ? 'Quitar de favoritos' : 'Guardar en favoritos';
    });
  };

  // Financial - LocalStorage helpers for favorites
  const getFinancialFavorites = () => {
    try {
      const favorites = localStorage.getItem('financialFavorites');
      return favorites ? JSON.parse(favorites) : [];
    } catch {
      return [];
    }
  };

  const saveFinancialFavorite = (siteId) => {
    const favorites = getFinancialFavorites();
    if (!favorites.includes(siteId)) {
      favorites.push(siteId);
      localStorage.setItem('financialFavorites', JSON.stringify(favorites));
    }
    return favorites;
  };

  const removeFinancialFavorite = (siteId) => {
    let favorites = getFinancialFavorites();
    favorites = favorites.filter(id => id !== siteId);
    localStorage.setItem('financialFavorites', JSON.stringify(favorites));
    return favorites;
  };

  const isFinancialFavorite = (siteId) => {
    const favorites = getFinancialFavorites();
    return favorites.includes(siteId);
  };

  // Build card for financial site
  const buildFinancialCard = site => {
    const isLiked = isFinancialFavorite(site.id);
    const likeLabel = isLiked ? 'Quitar de favoritos' : 'Guardar en favoritos';

    return `
      <article class="construccion-site-card" data-site-id="${site.id}">
        <div class="construccion-card-header">
          <div class="construccion-card-logo">
            <img src="${escapeHtml(site.logo)}" alt="${escapeHtml(site.name)}" loading="lazy" onerror="this.style.display='none'">
          </div>
          <button type="button" class="surlink-like-btn construccion-like-btn" data-action="like-financial" data-site-id="${site.id}" data-liked="${isLiked ? 'true' : 'false'}" title="${escapeHtml(likeLabel)}">
            <span class="surlink-like-icon">♥</span>
          </button>
        </div>
        <div class="construccion-card-content">
          <h3 class="construccion-card-title">${escapeHtml(site.name)}</h3>
          <p class="construccion-card-description">${escapeHtml(site.description)}</p>
        </div>
        <div class="construccion-card-footer">
          <button type="button" class="btn btn-primary construccion-visit-btn" data-action="view-financial" data-site-id="${site.id}">
            Ver detalles
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 0.25rem;">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </button>
        </div>
      </article>
    `;
  };

  // Load financial sites
  const loadFinancialSites = async (subcategory) => {
    const container = elements.results.financial;
    if (!container) return;

    container.innerHTML = '<div class="surlink-loading">Cargando sitios...</div>';
    hideFeedback('financial');

    try {
      const params = new URLSearchParams({ subcategory });
      const data = await request(`${API_BASE}/financial/sites?${params.toString()}`);

      state.financialSites[subcategory] = data.sites || [];
      renderFinancialSites(data.sites || []);
    } catch (error) {
      showFeedback('financial', error.message, 'error');
      container.innerHTML = '';
    }
  };

  // Render financial sites
  const renderFinancialSites = (sites) => {
    const container = elements.results.financial;
    if (!container) return;

    if (!sites || sites.length === 0) {
      container.innerHTML = `
        <div class="surlink-empty">
          No hay sitios disponibles en esta categoría.
        </div>
      `;
      return;
    }

    container.innerHTML = sites.map(buildFinancialCard).join('');
  };

  // Set active financial tab
  const setActiveFinancialTab = (subcategory) => {
    state.activeFinancialTab = subcategory;

    // Save to localStorage
    try {
      localStorage.setItem('surlinkActiveFinancialTab', subcategory);
    } catch (e) {
      console.error('Error saving financial tab to localStorage:', e);
    }

    elements.financialTabs.forEach(tab => {
      const match = tab.dataset.financialTab === subcategory;
      tab.classList.toggle('active', match);
    });

    loadFinancialSites(subcategory);
  };

  // Toggle financial like
  const toggleFinancialLike = (siteId) => {
    const isLiked = isFinancialFavorite(siteId);

    if (isLiked) {
      removeFinancialFavorite(siteId);
    } else {
      saveFinancialFavorite(siteId);
    }

    // Update UI
    document.querySelectorAll(`[data-action="like-financial"][data-site-id="${siteId}"]`).forEach(btn => {
      const nowLiked = !isLiked;
      btn.dataset.liked = nowLiked ? 'true' : 'false';
      btn.title = nowLiked ? 'Quitar de favoritos' : 'Guardar en favoritos';
    });
  };

  // Open modal for static site details
  const openSiteModal = async (type, siteId) => {
    if (!elements.siteModal) return;
    elements.siteModal.classList.add('is-open');
    elements.siteModal.setAttribute('aria-hidden', 'false');
    elements.siteModalBody.innerHTML = '<div class="surlink-modal-loading">Cargando información...</div>';

    try {
      const site = await request(`${API_BASE}/${type}/sites/${siteId}`);
      renderSiteModal(site);
    } catch (error) {
      elements.siteModalBody.innerHTML = `<div class="surlink-empty">Error al obtener el detalle: ${escapeHtml(error.message)}</div>`;
    }
  };

  // Initialize minimap for site location
  const initializeSiteMap = async (address, siteName) => {
    const mapContainer = document.getElementById('siteMap');
    if (!mapContainer || typeof L === 'undefined') return;

    try {
      // Geocode the address using Nominatim (OpenStreetMap)
      const query = `${address}, Montevideo, Uruguay`;
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

      const response = await fetch(geocodeUrl);
      const results = await response.json();

      if (results && results.length > 0) {
        const lat = parseFloat(results[0].lat);
        const lon = parseFloat(results[0].lon);

        // Initialize map
        const map = L.map('siteMap', {
          center: [lat, lon],
          zoom: 15,
          scrollWheelZoom: false,
          dragging: true,
          zoomControl: true
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19
        }).addTo(map);

        // Add marker
        const marker = L.marker([lat, lon]).addTo(map);
        marker.bindPopup(`<strong>${escapeHtml(siteName)}</strong><br>${escapeHtml(address)}`).openPopup();

        // Store map instance to clean up later
        if (!window.surlinkMaps) window.surlinkMaps = [];
        window.surlinkMaps.push(map);
      } else {
        // If geocoding fails, hide the map container
        mapContainer.parentElement.style.display = 'none';
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      // Hide map on error
      if (mapContainer && mapContainer.parentElement) {
        mapContainer.parentElement.style.display = 'none';
      }
    }
  };

  // Load site comments
  const loadSiteComments = async (siteId) => {
    const container = document.getElementById('siteCommentsContainer');
    if (!container) return;

    try {
      const comments = await request(`${API_BASE}/sites/${siteId}/comments`);
      renderComments(comments);
    } catch (error) {
      container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #999;">No hay comentarios todavía. ¡Sé el primero en comentar!</div>`;
    }
  };

  // Render comments list
  const renderComments = (comments) => {
    const container = document.getElementById('siteCommentsContainer');
    if (!container) return;

    if (!comments || comments.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #999;">No hay comentarios todavía. ¡Sé el primero en comentar!</div>`;
      return;
    }

    container.innerHTML = comments.map(comment => `
      <div class="surlink-comment" data-comment-id="${comment.id}" style="margin-bottom: 1.5rem; padding: 1rem; background: #f8f9fa; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem;">
          <div style="width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.9rem;">
            ${escapeHtml(comment.username.charAt(0).toUpperCase())}
          </div>
          <div style="flex: 1;">
            <div style="font-weight: 600; color: #333; font-size: 0.95rem;">${escapeHtml(comment.username)}</div>
            <div style="font-size: 0.75rem; color: #999;">${formatCommentDate(comment.createdAt)}</div>
          </div>
        </div>
        <p style="margin: 0 0 0.75rem 0; color: #555; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(comment.content)}</p>
        ${config.isAuthenticated ? `
          <button type="button" class="surlink-reply-btn" data-comment-id="${comment.id}" style="background: none; border: none; color: #667eea; font-size: 0.85rem; cursor: pointer; padding: 0.25rem 0; font-weight: 500;">
            💬 Responder
          </button>
        ` : ''}

        ${comment.replies && comment.replies.length > 0 ? `
          <div class="surlink-replies" style="margin-top: 1rem; margin-left: 2rem; border-left: 2px solid #e0e0e0; padding-left: 1rem;">
            ${comment.replies.map(reply => `
              <div class="surlink-reply" style="margin-bottom: 1rem; padding: 0.75rem; background: white; border-radius: 6px;">
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                  <div style="width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, #764ba2 0%, #667eea 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.75rem;">
                    ${escapeHtml(reply.username.charAt(0).toUpperCase())}
                  </div>
                  <div style="flex: 1;">
                    <div style="font-weight: 600; color: #333; font-size: 0.85rem;">${escapeHtml(reply.username)}</div>
                    <div style="font-size: 0.7rem; color: #999;">${formatCommentDate(reply.createdAt)}</div>
                  </div>
                </div>
                <p style="margin: 0; color: #555; line-height: 1.5; font-size: 0.9rem; white-space: pre-wrap;">${escapeHtml(reply.content)}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div id="replyForm-${comment.id}" style="display: none; margin-top: 1rem; margin-left: 2rem;">
          <textarea id="replyInput-${comment.id}" placeholder="Escribe tu respuesta..." style="width: 100%; min-height: 60px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; font-family: inherit; font-size: 0.9rem; resize: vertical;"></textarea>
          <div style="margin-top: 0.5rem; display: flex; gap: 0.5rem; justify-content: flex-end;">
            <button type="button" class="btn btn-secondary" onclick="this.closest('[id^=replyForm-]').style.display='none'" style="padding: 0.35rem 0.75rem; font-size: 0.85rem;">Cancelar</button>
            <button type="button" class="surlink-submit-reply-btn" data-comment-id="${comment.id}" style="padding: 0.35rem 0.75rem; font-size: 0.85rem;">Responder</button>
          </div>
        </div>
      </div>
    `).join('');

    // Attach reply button handlers
    container.querySelectorAll('.surlink-reply-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const commentId = btn.dataset.commentId;
        const replyForm = document.getElementById(`replyForm-${commentId}`);
        if (replyForm) {
          replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
        }
      });
    });

    // Attach submit reply handlers
    container.querySelectorAll('.surlink-submit-reply-btn').forEach(btn => {
      btn.addEventListener('click', () => handleSubmitReply(btn.dataset.commentId));
    });
  };

  // Format comment date
  const formatCommentDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`;
    if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
    if (diffDays < 7) return `Hace ${diffDays} ${diffDays === 1 ? 'día' : 'días'}`;

    return date.toLocaleDateString('es-UY', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Handle submit comment
  const handleSubmitComment = async () => {
    const input = document.getElementById('siteCommentInput');
    const submitBtn = document.getElementById('submitSiteComment');

    if (!input || !submitBtn || !state.currentSite) return;

    const content = input.value.trim();
    if (!content) {
      alert('Por favor escribe un comentario');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Publicando...';

    try {
      await request(`${API_BASE}/sites/${state.currentSite.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      input.value = '';
      loadSiteComments(state.currentSite.id);
    } catch (error) {
      alert(`Error al publicar comentario: ${error.message}`);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publicar comentario';
    }
  };

  // Handle submit reply
  const handleSubmitReply = async (commentId) => {
    const input = document.getElementById(`replyInput-${commentId}`);
    if (!input || !state.currentSite) return;

    const content = input.value.trim();
    if (!content) {
      alert('Por favor escribe una respuesta');
      return;
    }

    try {
      await request(`${API_BASE}/sites/${state.currentSite.id}/comments/${commentId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });

      input.value = '';
      loadSiteComments(state.currentSite.id);
    } catch (error) {
      alert(`Error al publicar respuesta: ${error.message}`);
    }
  };

  // Render site modal
  const renderSiteModal = (site) => {
    if (!elements.siteModalBody) return;

    // Store current site info for comments
    state.currentSite = site;

    elements.siteModalBody.innerHTML = `
      <div class="surlink-modal-hero">
        <div class="surlink-card-header">
          <div class="construccion-card-logo" style="margin-bottom: 1rem;">
            <img src="${escapeHtml(site.logo)}" alt="${escapeHtml(site.name)}" style="width: 64px; height: 64px;" onerror="this.style.display='none'">
          </div>
          <div>
            <h3>${escapeHtml(site.name)}</h3>
          </div>
        </div>
        <p>${escapeHtml(site.description)}</p>
      </div>

      <div class="surlink-modal-subgrid">
        <div class="surlink-detail-card">
          <h4>Información de contacto</h4>
          <div class="surlink-detail-list">
            ${site.phone ? `<span><strong>Teléfono:</strong> <a href="tel:${escapeHtml(site.phone)}">${escapeHtml(site.phone)}</a></span>` : ''}
            ${site.address ? `<span><strong>Dirección:</strong> ${escapeHtml(site.address)}</span>` : ''}
            ${site.url ? `<span><strong>Sitio web:</strong> <a href="${escapeHtml(site.url)}" target="_blank" rel="noopener">Visitar sitio</a></span>` : ''}
          </div>
        </div>

        ${site.serviceType ? `
          <div class="surlink-detail-card">
            <h4>Servicios</h4>
            <div class="surlink-detail-list">
              <span>${escapeHtml(site.serviceType)}</span>
            </div>
          </div>
        ` : ''}

        ${site.category ? `
          <div class="surlink-detail-card">
            <h4>Categoría</h4>
            <div class="surlink-detail-list">
              <span>${escapeHtml(site.category)}</span>
            </div>
          </div>
        ` : ''}

        ${['universidades', 'institutos', 'idiomas', 'tecnologia'].includes(site.category) ? `
          <div class="surlink-detail-card">
            <h4>Carreras y Planes de Estudio</h4>
            <div class="surlink-detail-list">
              <span style="color: #999; font-style: italic;">Próximamente</span>
            </div>
          </div>
        ` : ''}

        ${['universidades', 'institutos', 'idiomas', 'tecnologia'].includes(site.category) ? `
          <div class="surlink-detail-card">
            <h4>Costo Promedio por Curso</h4>
            <div class="surlink-detail-list">
              <span style="color: #999; font-style: italic;">Próximamente</span>
            </div>
          </div>
        ` : ''}
      </div>

      ${site.address && site.address !== 'Ver sitio web' ? `
        <div class="surlink-detail-card" style="margin-top: 1.5rem;">
          <h4>Ubicación</h4>
          <div id="siteMap" class="site-minimap" style="height: 300px; width: 100%; border-radius: 8px; overflow: hidden;"></div>
        </div>
      ` : ''}

      <div style="margin-top: 2rem; text-align: center;">
        <a href="${escapeHtml(site.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
          Visitar sitio web
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-left: 0.25rem;">
            <line x1="7" y1="17" x2="17" y2="7"></line>
            <polyline points="7 7 17 7 17 17"></polyline>
          </svg>
        </a>
      </div>

      <!-- Comments Section -->
      <div class="surlink-comments-section" style="margin-top: 3rem; border-top: 1px solid #e0e0e0; padding-top: 2rem;">
        <h4 style="margin-bottom: 1.5rem; font-size: 1.2rem; color: #333;">Comentarios</h4>

        ${config.isAuthenticated ? `
          <div class="surlink-comment-form" style="margin-bottom: 2rem;">
            <textarea id="siteCommentInput" placeholder="Comparte tu experiencia con esta institución..." style="width: 100%; min-height: 100px; padding: 0.75rem; border: 1px solid #ddd; border-radius: 8px; font-family: inherit; font-size: 0.95rem; resize: vertical;"></textarea>
            <div style="margin-top: 0.75rem; display: flex; justify-content: flex-end;">
              <button type="button" class="btn btn-primary" id="submitSiteComment" style="padding: 0.5rem 1.5rem;">
                Publicar comentario
              </button>
            </div>
          </div>
        ` : `
          <div style="padding: 1rem; background: #f8f9fa; border-radius: 8px; text-align: center; margin-bottom: 2rem;">
            <p style="margin: 0; color: #666;">Debes <a href="/login" style="color: #667eea; text-decoration: none; font-weight: 500;">iniciar sesión</a> para dejar un comentario.</p>
          </div>
        `}

        <div id="siteCommentsContainer" class="surlink-comments-list">
          <div style="text-align: center; padding: 2rem; color: #999;">Cargando comentarios...</div>
        </div>
      </div>
    `;

    // Initialize map if address is available
    if (site.address && site.address !== 'Ver sitio web') {
      setTimeout(() => initializeSiteMap(site.address, site.name), 100);
    }

    // Load comments
    loadSiteComments(site.id);

    // Attach comment submit handler
    if (config.isAuthenticated) {
      const submitBtn = document.getElementById('submitSiteComment');
      if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmitComment);
      }
    }
  };

  // Close site modal
  const closeSiteModal = () => {
    if (!elements.siteModal) return;

    // Clean up map instances
    if (window.surlinkMaps && window.surlinkMaps.length > 0) {
      window.surlinkMaps.forEach(map => {
        try {
          map.remove();
        } catch (e) {
          console.error('Error removing map:', e);
        }
      });
      window.surlinkMaps = [];
    }

    elements.siteModal.classList.remove('is-open');
    elements.siteModal.setAttribute('aria-hidden', 'true');
    elements.siteModalBody.innerHTML = '';
  };

  const attachEvents = () => {
    elements.quickLinks.forEach(link => {
      link.addEventListener('click', () => {
        const category = link.dataset.surlinkQuick;

        if (category === 'construccion') {
          // Handle construccion separately
          setActiveCategory(category);
          if (!state.loaded[category]) {
            state.loaded[category] = true;
            setActiveConstruccionTab('proyectos');
          }
        } else if (category === 'academy') {
          // Handle academy separately
          setActiveCategory(category);
          if (!state.loaded[category]) {
            state.loaded[category] = true;
            setActiveAcademyTab('universidades');
          }
        } else if (category === 'financial') {
          // Handle financial separately
          setActiveCategory(category);
          if (!state.loaded[category]) {
            state.loaded[category] = true;
            setActiveFinancialTab('bancos');
          }
        } else {
          const form = elements.forms[category];
          if (form) form.reset();
          state.filters[category] = DEFAULT_FILTERS[category]();
          state.pagination[category].page = 1;
          state.loaded[category] = false;
          loadCategory(category, { force: true });
        }

        elements.quickLinks.forEach(btn => {
          btn.classList.toggle('active', btn === link);
        });

        // Find the correct section for the selected category
        const targetSection = document.querySelector(`[data-surlink-section="${category}"]`);
        if (targetSection) {
          window.scrollTo({ top: targetSection.offsetTop - 80, behavior: 'smooth' });
        }
      });
    });

    Object.entries(elements.forms).forEach(([category, form]) => {
      if (!form) return;

      form.addEventListener('submit', event => {
        event.preventDefault();
        hydrateFiltersFromForm(category, form);
        state.pagination[category].page = 1;
        state.loaded[category] = false;
        loadCategory(category, { force: true });
      });
    });

    elements.resetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.dataset.surlinkReset;
        const form = elements.forms[category];
        if (form) form.reset();
        state.filters[category] = DEFAULT_FILTERS[category]();
        state.pagination[category].page = 1;
        state.loaded[category] = false;
        loadCategory(category, { force: true });
      });
    });

    Object.entries(elements.pagination).forEach(([category, container]) => {
      if (!container) return;
      container.addEventListener('click', event => {
        const button = event.target.closest('button[data-page]');
        if (!button) return;
        const page = Number(button.dataset.page);
        if (Number.isNaN(page)) return;
        state.pagination[category].page = page;
        state.loaded[category] = false;
        loadCategory(category, { force: true });
      });
    });

    document.addEventListener('click', event => {
      const likeBtn = event.target.closest('[data-action="like"]');
      if (likeBtn) {
        event.preventDefault();
        toggleLike(likeBtn.dataset.id);
        return;
      }

      const detailBtn = event.target.closest('[data-action="detail"]');
      if (detailBtn) {
        event.preventDefault();
        openModal(detailBtn.dataset.id);
        return;
      }

      const deleteBtn = event.target.closest('[data-action="delete-comment"]');
      if (deleteBtn) {
        event.preventDefault();
        handleCommentDelete(deleteBtn.dataset.commentId);
        return;
      }

      if (event.target.matches('[data-surlink-close]')) {
        closeModal();
      }
    });

    if (elements.modal) {
      elements.modal.addEventListener('click', event => {
        if (event.target === elements.modal) {
          closeModal();
        }
      });
    }

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeModal();
      }
    });

    document.addEventListener('submit', event => {
      const form = event.target;
      if (form && form.id === 'surlinkCommentForm') {
        event.preventDefault();
        handleCommentSubmit(form);
      }
    });

    // Construccion tabs
    elements.construccionTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const subcategory = tab.dataset.construccionTab;
        setActiveConstruccionTab(subcategory);
      });
    });

    // Construccion likes
    document.addEventListener('click', event => {
      const likeBtn = event.target.closest('[data-action="like-construccion"]');
      if (likeBtn) {
        event.preventDefault();
        const siteId = likeBtn.dataset.siteId;
        toggleConstruccionLike(siteId);
      }
    });

    // Academy tabs
    elements.academyTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const subcategory = tab.dataset.academyTab;
        setActiveAcademyTab(subcategory);
      });
    });

    // Academy likes and view details
    document.addEventListener('click', event => {
      const likeBtn = event.target.closest('[data-action="like-academy"]');
      if (likeBtn) {
        event.preventDefault();
        const siteId = likeBtn.dataset.siteId;
        toggleAcademyLike(siteId);
        return;
      }

      const viewBtn = event.target.closest('[data-action="view-academy"]');
      if (viewBtn) {
        event.preventDefault();
        const siteId = viewBtn.dataset.siteId;
        openSiteModal('academy', siteId);
      }
    });

    // Financial tabs
    elements.financialTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const subcategory = tab.dataset.financialTab;
        setActiveFinancialTab(subcategory);
      });
    });

    // Financial likes and view details
    document.addEventListener('click', event => {
      const likeBtn = event.target.closest('[data-action="like-financial"]');
      if (likeBtn) {
        event.preventDefault();
        const siteId = likeBtn.dataset.siteId;
        toggleFinancialLike(siteId);
        return;
      }

      const viewBtn = event.target.closest('[data-action="view-financial"]');
      if (viewBtn) {
        event.preventDefault();
        const siteId = viewBtn.dataset.siteId;
        openSiteModal('financial', siteId);
      }
    });

    // Site modal close handlers
    document.querySelectorAll('[data-surlink-site-close]').forEach(btn => {
      btn.addEventListener('click', closeSiteModal);
    });

    if (elements.siteModal) {
      elements.siteModal.addEventListener('click', event => {
        if (event.target === elements.siteModal) {
          closeSiteModal();
        }
      });
    }

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeSiteModal();
      }
    });
  };

  const boot = () => {
    if (!elements.modal) return;

    // Restore saved state from localStorage
    let savedCategory = 'casas';
    let savedConstruccionTab = 'proyectos';
    let savedAcademyTab = 'universidades';
    let savedFinancialTab = 'bancos';

    try {
      const storedCategory = localStorage.getItem('surlinkActiveCategory');
      const storedConstruccionTab = localStorage.getItem('surlinkActiveConstruccionTab');
      const storedAcademyTab = localStorage.getItem('surlinkActiveAcademyTab');
      const storedFinancialTab = localStorage.getItem('surlinkActiveFinancialTab');

      if (storedCategory) savedCategory = storedCategory;
      if (storedConstruccionTab) savedConstruccionTab = storedConstruccionTab;
      if (storedAcademyTab) savedAcademyTab = storedAcademyTab;
      if (storedFinancialTab) savedFinancialTab = storedFinancialTab;
    } catch (e) {
      console.error('Error reading from localStorage:', e);
    }

    // Set active quick link
    const activeQuick = document.querySelector(`[data-surlink-quick="${savedCategory}"]`);
    elements.quickLinks.forEach(btn => {
      btn.classList.toggle('active', btn === activeQuick);
    });

    attachEvents();

    // Load the saved category
    if (savedCategory === 'construccion') {
      setActiveCategory(savedCategory);
      if (!state.loaded[savedCategory]) {
        state.loaded[savedCategory] = true;
      }
      setActiveConstruccionTab(savedConstruccionTab);
    } else if (savedCategory === 'academy') {
      setActiveCategory(savedCategory);
      if (!state.loaded[savedCategory]) {
        state.loaded[savedCategory] = true;
      }
      setActiveAcademyTab(savedAcademyTab);
    } else if (savedCategory === 'financial') {
      setActiveCategory(savedCategory);
      if (!state.loaded[savedCategory]) {
        state.loaded[savedCategory] = true;
      }
      setActiveFinancialTab(savedFinancialTab);
    } else {
      loadCategory(savedCategory, { force: true });
    }
  };

  document.addEventListener('DOMContentLoaded', boot);
})();
