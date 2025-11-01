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
      financial: document.getElementById('surlinkFinancialResults')
    },
    feedback: {
      casas: document.querySelector('[data-feedback="casas"]'),
      academy: document.querySelector('[data-feedback="academy"]'),
      autos: document.querySelector('[data-feedback="autos"]'),
      financial: document.querySelector('[data-feedback="financial"]')
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
    modalBody: document.getElementById('surlinkModalBody')
  };

  const state = {
    activeCategory: 'casas',
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
      financial: false
    },
    facets: {
      casas: {},
      academy: {},
      autos: {},
      financial: {}
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

  const attachEvents = () => {
    elements.quickLinks.forEach(link => {
      link.addEventListener('click', () => {
        const category = link.dataset.surlinkQuick;
        const form = elements.forms[category];
        if (form) form.reset();
        state.filters[category] = DEFAULT_FILTERS[category]();
        state.pagination[category].page = 1;
        state.loaded[category] = false;
        loadCategory(category, { force: true });
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
  };

  const boot = () => {
    if (!elements.modal) return;
    const defaultQuick = document.querySelector('[data-surlink-quick="casas"]');
    if (defaultQuick) {
      defaultQuick.classList.add('active');
    }
    attachEvents();
    loadCategory('casas', { force: true });
  };

  document.addEventListener('DOMContentLoaded', boot);
})();
