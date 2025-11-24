// Forum JavaScript - Handles threads, comments, likes, and interactions

let currentPage = 1;
let currentSort = 'recent';
let currentHashtag = null;
let currentThreadId = null;
let threadQuillEditor = null;
let availableHashtags = [];
let selectedHashtags = [];

document.addEventListener('DOMContentLoaded', () => {
  // Check which page we're on
  const path = window.location.pathname;

  if (path === '/forum-austra') {
    initForumList();
  } else if (path.startsWith('/forum-thread/')) {
    currentThreadId = path.split('/').pop();
    initThreadView();
  }
});

// ===== FORUM LIST PAGE =====

function initForumList() {
  // Check if this is the first time visiting the forum
  checkForumWelcomeModal();

  // Load hashtags first
  loadHashtags();

  loadThreads();

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentSort = e.target.dataset.sort;
      currentPage = 1;
      loadThreads();
    });
  });

  // New thread button
  const newThreadBtn = document.getElementById('newThreadBtn');
  if (newThreadBtn) {
    newThreadBtn.addEventListener('click', () => {
      document.getElementById('newThreadModal').classList.add('active');

      // Initialize Quill editor when modal opens (if not already initialized)
      if (!threadQuillEditor) {
        // Delay to ensure modal is visible
        setTimeout(() => {
          initThreadQuillEditor();
          loadHashtagsSelector();
        }, 100);
      } else {
        loadHashtagsSelector();
      }
    });
  }

  // New thread form
  const newThreadForm = document.getElementById('newThreadForm');
  if (newThreadForm) {
    newThreadForm.addEventListener('submit', handleNewThreadSubmit);

    // Character counters
    document.getElementById('threadTitle')?.addEventListener('input', (e) => {
      document.getElementById('titleCharCount').textContent = e.target.value.length;
    });

    // Image preview
    document.getElementById('threadImages')?.addEventListener('change', handleImagePreview);
  }
}

// Initialize Quill editor for new thread
function initThreadQuillEditor() {
  if (!document.getElementById('threadContentEditor')) return;

  const toolbarOptions = [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'blockquote', 'code-block'],
    ['clean']
  ];

  threadQuillEditor = new Quill('#threadContentEditor', {
    theme: 'snow',
    placeholder: 'Escribe el contenido de tu thread (puedes mencionar usuarios con @nombre)...',
    modules: {
      toolbar: toolbarOptions
    }
  });

  // Update character count
  threadQuillEditor.on('text-change', () => {
    const length = threadQuillEditor.getLength() - 1; // -1 for the trailing newline
    document.getElementById('contentCharCount').textContent = length;
  });

  // Initialize mentions for Quill editor
  if (typeof initMentions === 'function') {
    initMentions(threadQuillEditor);
  }

  // Initialize poll creation
  if (typeof initPollCreation === 'function') {
    initPollCreation();
  }
}

// Load available hashtags from API
async function loadHashtags() {
  try {
    const response = await fetch('/forum/hashtags', {
      credentials: 'include'
    });
    const data = await response.json();
    availableHashtags = data.hashtags || [];
  } catch (error) {
    console.error('Error loading hashtags:', error);
    availableHashtags = [];
  }
}

// Load hashtags selector in modal
function loadHashtagsSelector() {
  const container = document.getElementById('hashtagsContainer');
  if (!container || availableHashtags.length === 0) return;

  selectedHashtags = []; // Reset selection

  container.innerHTML = availableHashtags.map(tag => `
    <button type="button" class="hashtag-btn" data-hashtag="${tag}" onclick="toggleHashtag('${tag}')">
      #${tag}
    </button>
  `).join('');
}

// Toggle hashtag selection
function toggleHashtag(tag) {
  const index = selectedHashtags.indexOf(tag);

  if (index > -1) {
    // Deselect
    selectedHashtags.splice(index, 1);
  } else {
    // Select (max 5)
    if (selectedHashtags.length >= 5) {
      toastWarning('Máximo 5 hashtags permitidos');
      return;
    }
    selectedHashtags.push(tag);
  }

  // Update UI
  const btn = document.querySelector(`.hashtag-btn[data-hashtag="${tag}"]`);
  if (btn) {
    btn.classList.toggle('selected');
  }

  // Update hidden input
  document.getElementById('threadHashtags').value = JSON.stringify(selectedHashtags);
}

window.toggleHashtag = toggleHashtag;

// Filter threads by hashtag
function filterByHashtag(tag) {
  currentHashtag = tag;
  currentPage = 1;

  // Update UI to show active filter
  const hashtagFilters = document.querySelectorAll('.hashtag-filter-btn');
  hashtagFilters.forEach(btn => {
    if (btn.dataset.hashtag === tag) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  loadThreads();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Clear hashtag filter
function clearHashtagFilter() {
  currentHashtag = null;
  currentPage = 1;

  // Update UI
  const hashtagFilters = document.querySelectorAll('.hashtag-filter-btn');
  hashtagFilters.forEach(btn => btn.classList.remove('active'));

  loadThreads();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.filterByHashtag = filterByHashtag;
window.clearHashtagFilter = clearHashtagFilter;

async function loadThreads() {
  try {
    let url = `/forum/threads?page=${currentPage}&limit=20&sort=${currentSort}`;
    if (currentHashtag) {
      url += `&hashtag=${currentHashtag}`;
    }
    const response = await fetch(url, {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Validate response structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response format');
    }

    displayThreads(data.threads || []);
    displayPagination(data.pagination || { page: 1, pages: 1, total: 0, limit: 20 });
  } catch (error) {
    console.error('Error loading threads:', error);
    document.getElementById('threadsList').innerHTML = '<p style="text-align: center; color: var(--danger-color);">Error al cargar threads</p>';
    // Clear pagination on error
    const paginationContainer = document.getElementById('pagination');
    if (paginationContainer) {
      paginationContainer.innerHTML = '';
    }
  }
}

async function displayThreads(threads) {
  const container = document.getElementById('threadsList');

  if (!threads || threads.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="opacity: 0.3; margin-bottom: 1rem;">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <p>No hay threads disponibles</p>
      </div>
    `;
    return;
  }

  container.innerHTML = threads.map(thread => {
    // Strip HTML tags for preview and get plain text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = thread.content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';
    const excerpt = plainText.substring(0, 200) + (plainText.length > 200 ? '...' : '');

    return `
    <div class="thread-card" data-thread-id="${thread._id}">
      <div class="thread-card-content">
        <h3 class="thread-title">
          <a href="/forum-thread/${thread._id}" style="color: var(--text-primary); text-decoration: none;">${escapeHtml(thread.title)}</a>
        </h3>
        <p class="thread-excerpt">${escapeHtml(excerpt)}</p>

        ${thread.hashtags && thread.hashtags.length > 0 ? `
          <div class="thread-hashtags" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-top: 0.75rem;">
            ${thread.hashtags.map(tag => `
              <span class="hashtag-tag" onclick="filterByHashtag('${tag}')">#${tag}</span>
            `).join('')}
          </div>
        ` : ''}

        ${thread.images && thread.images.length > 0 ? `
          <div class="thread-images-preview">
            ${thread.images.slice(0, 3).map(img => `
              <img src="${img.url}" alt="Thread image" class="thread-preview-img">
            `).join('')}
            ${thread.images.length > 3 ? `<span>+${thread.images.length - 3}</span>` : ''}
          </div>
        ` : ''}

        <div class="thread-meta">
          <span class="thread-author" style="display: flex; align-items: center; gap: 0.5rem;">
            <img src="${thread.author.picture || '/images/default-avatar.svg'}" alt="Avatar" class="user-avatar" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover;">
            Por ${escapeHtml(thread.author.name || thread.author.email || 'Usuario')}
          </span>
          <span class="thread-date">${formatDate(thread.createdAt)}</span>
          <span class="thread-stats">
            <span>💬 ${thread.commentsCount || 0}</span>
            <span>❤️ ${thread.likesCount || 0}</span>
          </span>
        </div>
      </div>

      <div class="thread-actions">
        ${thread.isAuthenticated ? `
          <button class="like-btn ${thread.isLiked ? 'liked' : ''}" onclick="toggleThreadLike('${thread._id}', event)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${thread.isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>${thread.likesCount || 0}</span>
          </button>
        ` : `
          <button class="like-btn" disabled style="opacity: 0.5; cursor: not-allowed;" title="Inicia sesión para dar like">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>${thread.likesCount || 0}</span>
          </button>
        `}
      </div>
    </div>
    `;
  }).join('');
}

function displayPagination(pagination) {
  const container = document.getElementById('pagination');

  // Validate pagination object and its properties
  if (!pagination || typeof pagination !== 'object') {
    if (container) {
      container.innerHTML = '';
    }
    return;
  }

  // Ensure pages property exists and is a valid number
  const totalPages = parseInt(pagination.pages) || 0;
  const currentPageNum = parseInt(pagination.page) || 1;

  if (totalPages <= 1) {
    if (container) {
      container.innerHTML = '';
    }
    return;
  }

  let pages = [];
  for (let i = 1; i <= totalPages; i++) {
    pages.push(`
      <button class="pagination-btn ${i === currentPageNum ? 'active' : ''}" onclick="goToPage(${i})">
        ${i}
      </button>
    `);
  }

  if (container) {
    container.innerHTML = pages.join('');
  }
}

function goToPage(page) {
  currentPage = page;
  loadThreads();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleNewThreadSubmit(e) {
  e.preventDefault();

  // Get HTML content from Quill
  const htmlContent = threadQuillEditor.root.innerHTML;

  // Validate content
  const textContent = threadQuillEditor.getText().trim();
  if (textContent.length < 10) {
    toastWarning('El contenido debe tener al menos 10 caracteres');
    return;
  }

  if (textContent.length > 10000) {
    toastWarning('El contenido no puede exceder 10000 caracteres');
    return;
  }

  // Validate hashtags
  if (selectedHashtags.length === 0) {
    toastWarning('Debes seleccionar al menos un hashtag');
    return;
  }

  const formData = new FormData(e.target);

  // Replace the content with HTML from Quill
  formData.set('content', htmlContent);

  // Add hashtags
  formData.set('hashtags', JSON.stringify(selectedHashtags));

  // Add poll data if this is a poll
  if (typeof getPollData === 'function') {
    const pollData = getPollData();
    if (pollData) {
      formData.set('type', 'poll');
      formData.set('poll', JSON.stringify(pollData));
    } else if (document.querySelector('input[name="threadType"]:checked')?.value === 'poll') {
      toastWarning('La encuesta debe tener al menos 2 opciones válidas');
      return;
    }
  }

  try {
    const response = await fetch('/forum/threads', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      closeNewThreadModal();
      toastSuccess('Thread creado exitosamente');
      setTimeout(() => {
        window.location.href = `/forum-thread/${data.thread._id}`;
      }, 600);
    } else {
      if (response.status === 429) {
        // Rate limit error
        toastWarning('⏱️ ' + data.error);
      } else {
        toastError('Error: ' + (data.error || 'No se pudo crear el thread'));
      }
    }
  } catch (error) {
    console.error('Error creating thread:', error);
    toastError('Error al crear el thread');
  }
}

function closeNewThreadModal() {
  document.getElementById('newThreadModal').classList.remove('active');
  document.getElementById('newThreadForm').reset();
  document.getElementById('imagePreview').innerHTML = '';
  document.getElementById('titleCharCount').textContent = '0';
  document.getElementById('contentCharCount').textContent = '0';

  // Clear Quill editor
  if (threadQuillEditor) {
    threadQuillEditor.setText('');
  }

  // Clear hashtags selection
  selectedHashtags = [];
  const hashtagBtns = document.querySelectorAll('.hashtag-btn');
  hashtagBtns.forEach(btn => btn.classList.remove('selected'));

  // Reset poll creation
  if (typeof resetPollCreation === 'function') {
    resetPollCreation();
  }

  // Close mention suggestions if open
  if (typeof closeMentionSuggestions === 'function') {
    closeMentionSuggestions();
  }
}

// Make function global
window.closeNewThreadModal = closeNewThreadModal;

// ===== THREAD VIEW PAGE =====

function initThreadView() {
  loadThread();

  // Comment form
  const commentForm = document.getElementById('newCommentForm');
  if (commentForm) {
    commentForm.addEventListener('submit', handleNewCommentSubmit);

    document.getElementById('commentContent')?.addEventListener('input', (e) => {
      document.getElementById('commentCharCount').textContent = e.target.value.length;
    });

    document.getElementById('commentImages')?.addEventListener('change', (e) => {
      handleImagePreview(e, 'commentImagePreview');
    });
  }

  // Reply form
  const replyForm = document.getElementById('replyForm');
  if (replyForm) {
    replyForm.addEventListener('submit', handleReplySubmit);

    document.getElementById('replyContent')?.addEventListener('input', (e) => {
      document.getElementById('replyCharCount').textContent = e.target.value.length;
    });

    document.getElementById('replyImages')?.addEventListener('change', (e) => {
      handleImagePreview(e, 'replyImagePreview');
    });
  }
}

async function loadThread() {
  try {
    const response = await fetch(`/forum/threads/${currentThreadId}`, {
      credentials: 'include'
    });

    const data = await response.json();
    displayThread(data.thread);
    displayComments(data.comments);
  } catch (error) {
    console.error('Error loading thread:', error);
    document.getElementById('threadContent').innerHTML = '<p style="text-align: center; color: var(--danger-color);">Error al cargar el thread</p>';
  }
}

async function displayThread(thread) {
  const container = document.getElementById('threadContent');

  // Check if user can edit/delete (now passed from server)
  const isAuthenticated = thread.isAuthenticated || false;
  const canEdit = thread.canEdit || false;
  const canDelete = thread.canDelete || false;
  const isAuthor = thread.isAuthor || false;

  container.innerHTML = `
    <div class="thread-detail">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
        <h1 style="margin: 0;">${escapeHtml(thread.title)}</h1>
        ${canEdit || canDelete || isAuthenticated ? `
          <div style="display: flex; gap: 0.5rem;">
            ${canEdit ? `
              <button onclick="openEditThreadModal('${thread._id}')" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                Editar
              </button>
            ` : ''}
            ${canDelete ? `
              <button onclick="deleteThread('${thread._id}')" class="btn" style="padding: 0.5rem 1rem; font-size: 0.875rem; background: var(--danger-color); color: white;">
                ${thread.isAdmin ? 'Eliminar (Admin)' : 'Eliminar'}
              </button>
            ` : ''}
            ${isAuthenticated && !isAuthor ? `
              <button onclick="openReportModal('thread', '${thread._id}')" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.875rem; background: transparent; border: 1px solid var(--border-color);" title="Reportar thread">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                Reportar
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <div class="thread-meta" style="margin-bottom: 2rem; color: var(--text-secondary); display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
        <span style="display: flex; align-items: center; gap: 0.5rem;">
          <img src="${thread.author.picture || '/images/default-avatar.svg'}" alt="Avatar" class="user-avatar" onclick="openUserProfileModal('${thread.author._id}')" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; cursor: pointer;">
          Por ${makeUserNameClickable ? makeUserNameClickable(thread.author.name || thread.author.email || 'Usuario', thread.author._id) : `<strong>${escapeHtml(thread.author.name || thread.author.email || 'Usuario')}</strong>`}
        </span>
        <span>${formatDate(thread.createdAt)}</span>
        ${thread.updatedAt && thread.updatedAt !== thread.createdAt ? '<span style="font-style: italic;">(editado)</span>' : ''}
      </div>

      <div class="thread-content" style="line-height: 1.7; white-space: pre-wrap; margin-bottom: 1.5rem;">
        ${formatContent(thread.content)}
      </div>

      ${thread.type === 'poll' && thread.poll ? (typeof renderPoll === 'function' ? renderPoll(thread.poll, thread.userVotes || [], thread._id) : '') : ''}

      ${thread.hashtags && thread.hashtags.length > 0 ? `
        <div class="thread-hashtags" style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 2rem;">
          ${thread.hashtags.map(tag => `
            <a href="/forum-austra?hashtag=${tag}" class="hashtag-tag">#${tag}</a>
          `).join('')}
        </div>
      ` : ''}

      ${thread.images && thread.images.length > 0 ? `
        <div class="thread-images" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          ${thread.images.map(img => `
            <img src="${img.url}" alt="Thread image" class="thread-image" onclick="openImageModal('${img.url}')" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 1px solid var(--border-color);">
          `).join('')}
        </div>
      ` : ''}

      <div class="thread-actions" style="display: flex; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
        ${isAuthenticated ? `
          <button class="like-btn ${thread.isLiked ? 'liked' : ''}" onclick="toggleThreadLike('${thread._id}', event)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="${thread.isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>${thread.likesCount || 0}</span>
          </button>
        ` : `
          <button class="like-btn" disabled style="opacity: 0.5; cursor: not-allowed;" title="Inicia sesión para dar like">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>${thread.likesCount || 0}</span>
          </button>
        `}
        <span style="color: var(--text-secondary);">💬 ${thread.commentsCount || 0} comentarios</span>
      </div>
    </div>
  `;
}

async function displayComments(comments) {
  const container = document.getElementById('commentsList');
  const count = document.getElementById('commentsCount');

  const totalComments = countAllComments(comments);
  count.textContent = `(${totalComments})`;

  if (!comments || comments.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No hay comentarios aún. ¡Sé el primero en comentar!</p>';
    return;
  }

  container.innerHTML = comments.map(comment => renderComment(comment, 0)).join('');
}

function renderComment(comment, depth = 0) {
  const marginLeft = Math.min(depth * 2, 10); // Max 10rem indentation

  // Check if user can edit/delete (now passed from server)
  const isAuthenticated = comment.isAuthenticated || false;
  const canEdit = comment.canEdit || false;
  const canDelete = comment.canDelete || false;
  const isAuthor = comment.isAuthor || false;

  return `
    <div class="comment" data-comment-id="${comment._id}" style="margin-left: ${marginLeft}rem; margin-bottom: 1rem; padding: 1rem; background: var(--surface); border-radius: 8px; border-left: 3px solid var(--primary-color);">
      <div class="comment-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <img src="${comment.author.picture || '/images/default-avatar.svg'}" alt="Avatar" class="user-avatar" onclick="openUserProfileModal('${comment.author._id}')" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; cursor: pointer;">
          <div>
            ${makeUserNameClickable ? makeUserNameClickable(comment.author.name || comment.author.email || 'Usuario', comment.author._id) : `<strong style="color: var(--text-primary);">${escapeHtml(comment.author.name || comment.author.email || 'Usuario')}</strong>`}
            <span style="color: var(--text-secondary); font-size: 0.875rem; margin-left: 0.5rem;">${formatDate(comment.createdAt)}</span>
            ${comment.updatedAt && comment.updatedAt !== comment.createdAt ? '<span style="color: var(--text-secondary); font-size: 0.875rem; font-style: italic; margin-left: 0.5rem;">(editado)</span>' : ''}
          </div>
        </div>
        ${canEdit || canDelete || (isAuthenticated && !isAuthor) ? `
          <div style="display: flex; gap: 0.5rem;">
            ${canEdit ? `
              <button onclick="openEditCommentModal('${comment._id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background: var(--surface-elevated); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; color: var(--text-primary);">
                Editar
              </button>
            ` : ''}
            ${canDelete ? `
              <button onclick="deleteComment('${comment._id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background: var(--danger-color); border: none; border-radius: 4px; cursor: pointer; color: white;">
                ${comment.isAdmin ? 'Eliminar (Admin)' : 'Eliminar'}
              </button>
            ` : ''}
            ${isAuthenticated && !isAuthor ? `
              <button onclick="openReportModal('comment', '${comment._id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background: transparent; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; color: var(--text-secondary);" title="Reportar comentario">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align: middle;">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <div class="comment-content" style="line-height: 1.6; white-space: pre-wrap; margin-bottom: 0.75rem;">
        ${formatContent(comment.content)}
      </div>

      ${comment.images && comment.images.length > 0 ? `
        <div class="comment-images" style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
          ${comment.images.map(img => `
            <img src="${img.url}" alt="Comment image" onclick="openImageModal('${img.url}')" style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px; cursor: pointer; border: 1px solid var(--border-color);">
          `).join('')}
        </div>
      ` : ''}

      <div class="comment-actions" style="display: flex; gap: 1rem; align-items: center;">
        ${isAuthenticated ? `
          <button class="like-btn small ${comment.isLiked ? 'liked' : ''}" onclick="toggleCommentLike('${comment._id}', event)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="${comment.isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>${comment.likesCount || 0}</span>
          </button>
        ` : `
          <button class="like-btn small" disabled style="opacity: 0.5; cursor: not-allowed;" title="Inicia sesión para dar like">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            <span>${comment.likesCount || 0}</span>
          </button>
        `}
        ${comment.depth < 5 ? `<button class="reply-btn" onclick="openReplyModal('${comment._id}')">Responder</button>` : ''}
      </div>

      ${comment.replies && comment.replies.length > 0 ? `
        <div class="comment-replies" style="margin-top: 1rem;">
          ${comment.replies.map(reply => renderComment(reply, depth + 1)).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function countAllComments(comments) {
  let count = comments.length;
  comments.forEach(comment => {
    if (comment.replies && comment.replies.length > 0) {
      count += countAllComments(comment.replies);
    }
  });
  return count;
}

async function handleNewCommentSubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);

  try {
    const response = await fetch(`/forum/threads/${currentThreadId}/comments`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      e.target.reset();
      document.getElementById('commentCharCount').textContent = '0';
      document.getElementById('commentImagePreview').innerHTML = '';
      toastSuccess('Comentario publicado');
      loadThread(); // Reload to show new comment
    } else {
      if (response.status === 429) {
        // Rate limit error
        toastWarning('⏱️ ' + data.error);
      } else {
        toastError('Error: ' + (data.error || 'No se pudo publicar el comentario'));
      }
    }
  } catch (error) {
    console.error('Error posting comment:', error);
    toastError('Error al publicar el comentario');
  }
}

async function openReplyModal(commentId) {
  document.getElementById('parentCommentId').value = commentId;
  document.getElementById('replyModal').classList.add('active');
}

function closeReplyModal() {
  document.getElementById('replyModal').classList.remove('active');
  document.getElementById('replyForm').reset();
  document.getElementById('parentCommentId').value = '';
  document.getElementById('replyCharCount').textContent = '0';
  document.getElementById('replyImagePreview').innerHTML = '';
}

window.openReplyModal = openReplyModal;
window.closeReplyModal = closeReplyModal;

async function handleReplySubmit(e) {
  e.preventDefault();

  const formData = new FormData(e.target);

  try {
    const response = await fetch(`/forum/threads/${currentThreadId}/comments`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      closeReplyModal();
      toastSuccess('Respuesta publicada');
      loadThread(); // Reload to show new reply
    } else {
      if (response.status === 429) {
        // Rate limit error
        toastWarning('⏱️ ' + data.error);
      } else {
        toastError('Error: ' + (data.error || 'No se pudo publicar la respuesta'));
      }
    }
  } catch (error) {
    console.error('Error posting reply:', error);
    toastError('Error al publicar la respuesta');
  }
}

// ===== LIKES =====

async function toggleThreadLike(threadId, event) {
  event.preventDefault();
  event.stopPropagation();

  const button = event.currentTarget;
  button.disabled = true;

  try {
    const response = await fetch(`/forum/threads/${threadId}/like`, {
      method: 'POST',
      credentials: 'include'
    });

    const data = await response.json();

    if (response.ok) {
      // Update UI
      const svg = button.querySelector('svg');
      const span = button.querySelector('span');

      if (data.isLiked) {
        button.classList.add('liked');
        svg.setAttribute('fill', 'currentColor');
      } else {
        button.classList.remove('liked');
        svg.setAttribute('fill', 'none');
      }

      span.textContent = data.likesCount;
    }
  } catch (error) {
    console.error('Error toggling like:', error);
  } finally {
    button.disabled = false;
  }
}

async function toggleCommentLike(commentId, event) {
  event.preventDefault();
  event.stopPropagation();

  const button = event.currentTarget;
  button.disabled = true;

  try {
    const response = await fetch(`/forum/comments/${commentId}/like`, {
      method: 'POST',
      credentials: 'include'
    });

    const data = await response.json();

    if (response.ok) {
      // Update UI
      const svg = button.querySelector('svg');
      const span = button.querySelector('span');

      if (data.isLiked) {
        button.classList.add('liked');
        svg.setAttribute('fill', 'currentColor');
      } else {
        button.classList.remove('liked');
        svg.setAttribute('fill', 'none');
      }

      span.textContent = data.likesCount;
    }
  } catch (error) {
    console.error('Error toggling like:', error);
  } finally {
    button.disabled = false;
  }
}

window.toggleThreadLike = toggleThreadLike;
window.toggleCommentLike = toggleCommentLike;

// ===== IMAGE HANDLING =====

function handleImagePreview(e, previewId = 'imagePreview') {
  const files = Array.from(e.target.files);
  const preview = document.getElementById(previewId);

  if (files.length > 5) {
    toastWarning('Máximo 5 imágenes permitidas');
    e.target.value = '';
    preview.innerHTML = '';
    return;
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  const invalidFiles = files.filter(f => f.size > maxSize);
  if (invalidFiles.length > 0) {
    toastWarning('Cada imagen debe ser menor a 5MB');
    e.target.value = '';
    preview.innerHTML = '';
    return;
  }

  preview.innerHTML = '';
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.style.cssText = 'width: 80px; height: 80px; object-fit: cover; border-radius: 4px; border: 1px solid var(--border-color);';
      preview.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

function openImageModal(url) {
  document.getElementById('modalImage').src = url;
  document.getElementById('imageModal').classList.add('active');
}

function closeImageModal() {
  document.getElementById('imageModal').classList.remove('active');
}

window.openImageModal = openImageModal;
window.closeImageModal = closeImageModal;

// ===== UTILITY FUNCTIONS =====

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  if (days < 7) return `Hace ${days}d`;

  return date.toLocaleDateString('es-UY', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatContent(content) {
  // Content is already HTML from Quill, so just sanitize and return
  // Basic XSS prevention: remove script tags and event handlers
  let sanitized = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/g, '')
    .replace(/on\w+='[^']*'/g, '');

  // Process mentions - look for text within <a> tags that have mentions
  // Quill already formats mentions as links, so we just need to style them
  sanitized = sanitized.replace(
    /<a[^>]*href="[^"]*perfil[^"]*"[^>]*>(.*?)<\/a>/gi,
    (match, innerText) => {
      // Extract the user ID from the href if possible
      const userIdMatch = match.match(/uid=([^"&]+)/);
      const userId = userIdMatch ? userIdMatch[1] : '';

      // Return styled mention that's clickable
      return `<span class="mention-link" onclick="openUserProfileModal('${userId}')" style="color: #10c6ff; font-weight: bold; cursor: pointer; text-decoration: none;">${innerText}</span>`;
    }
  );

  // Also handle plain @mentions that might not be formatted yet
  sanitized = sanitized.replace(
    /@(\w+)/g,
    (match, username) => {
      // Check if it's already inside an HTML tag (avoid double-processing)
      return `<span class="mention-text" style="color: #10c6ff; font-weight: bold;">@${username}</span>`;
    }
  );

  return sanitized;
}

// ===== EDIT/DELETE FUNCTIONS =====

let editThreadQuillEditor = null;
let currentThreadData = null;
let currentCommentData = null;

// Open edit thread modal
async function openEditThreadModal(threadId) {
  try {
    // Fetch thread data
    const response = await fetch(`/forum/threads/${threadId}`, {
      credentials: 'include'
    });
    const data = await response.json();
    currentThreadData = data.thread;

    // Populate form
    document.getElementById('editThreadId').value = threadId;
    document.getElementById('editThreadTitle').value = currentThreadData.title;

    // Initialize Quill editor for editing
    if (!editThreadQuillEditor) {
      const toolbarOptions = [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        [{ 'align': [] }],
        ['link', 'blockquote', 'code-block'],
        ['clean']
      ];

      editThreadQuillEditor = new Quill('#editThreadContentEditor', {
        theme: 'snow',
        modules: { toolbar: toolbarOptions }
      });
    }

    // Set content
    editThreadQuillEditor.root.innerHTML = currentThreadData.content;

    // Show modal
    document.getElementById('editThreadModal').classList.add('active');

    // Setup form submit
    document.getElementById('editThreadForm').onsubmit = handleEditThreadSubmit;
  } catch (error) {
    console.error('Error loading thread:', error);
    toastError('Error al cargar el thread');
  }
}

window.openEditThreadModal = openEditThreadModal;

function closeEditThreadModal() {
  document.getElementById('editThreadModal').classList.remove('active');
  if (editThreadQuillEditor) {
    editThreadQuillEditor.setText('');
  }
}

window.closeEditThreadModal = closeEditThreadModal;

async function handleEditThreadSubmit(e) {
  e.preventDefault();

  const threadId = document.getElementById('editThreadId').value;
  const title = document.getElementById('editThreadTitle').value;
  const content = editThreadQuillEditor.root.innerHTML;

  const formData = new FormData();
  formData.set('title', title);
  formData.set('content', content);

  try {
    const response = await fetch(`/forum/threads/${threadId}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      closeEditThreadModal();
      toastSuccess('Thread actualizado exitosamente');
      loadThread(); // Reload thread
    } else {
      toastError('Error: ' + (data.error || 'No se pudo actualizar el thread'));
    }
  } catch (error) {
    console.error('Error updating thread:', error);
    toastError('Error al actualizar el thread');
  }
}

// Delete thread
async function deleteThread(threadId) {
  if (!confirm('¿Estás seguro de que quieres eliminar este thread?')) {
    return;
  }

  try {
    const response = await fetch(`/forum/threads/${threadId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await response.json();

    if (response.ok) {
      if (data.type === 'hard') {
        // Completely deleted - redirect to forum
        toastSuccess(data.isAdmin ? 'Thread y todos sus comentarios eliminados permanentemente por admin' : 'Thread eliminado completamente');
        setTimeout(() => {
          window.location.href = '/forum-austra';
        }, 600);
      } else {
        // Soft deleted - reload to show [ELIMINADO]
        toastSuccess('Contenido del thread eliminado');
        loadThread();
      }
    } else {
      toastError('Error: ' + (data.error || 'No se pudo eliminar el thread'));
    }
  } catch (error) {
    console.error('Error deleting thread:', error);
    toastError('Error al eliminar el thread');
  }
}

window.deleteThread = deleteThread;

// Open edit comment modal
async function openEditCommentModal(commentId) {
  try {
    // Find comment in current thread data
    const findComment = (comments) => {
      for (const comment of comments) {
        if (comment._id === commentId) return comment;
        if (comment.replies && comment.replies.length > 0) {
          const found = findComment(comment.replies);
          if (found) return found;
        }
      }
      return null;
    };

    // Get thread data to find comment
    const response = await fetch(`/forum/threads/${currentThreadId}`, {
      credentials: 'include'
    });
    const data = await response.json();
    const comment = findComment(data.comments);

    if (!comment) {
      toastWarning('Comentario no encontrado');
      return;
    }

    currentCommentData = comment;

    // Strip HTML to get plain text for editing
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = comment.content;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    // Populate form
    document.getElementById('editCommentId').value = commentId;
    document.getElementById('editCommentContent').value = plainText;

    // Show modal
    document.getElementById('editCommentModal').classList.add('active');

    // Setup form submit
    document.getElementById('editCommentForm').onsubmit = handleEditCommentSubmit;
  } catch (error) {
    console.error('Error loading comment:', error);
    toastError('Error al cargar el comentario');
  }
}

window.openEditCommentModal = openEditCommentModal;

function closeEditCommentModal() {
  document.getElementById('editCommentModal').classList.remove('active');
  document.getElementById('editCommentForm').reset();
}

window.closeEditCommentModal = closeEditCommentModal;

async function handleEditCommentSubmit(e) {
  e.preventDefault();

  const commentId = document.getElementById('editCommentId').value;
  const content = document.getElementById('editCommentContent').value;

  const formData = new FormData();
  formData.set('content', `<p>${escapeHtml(content)}</p>`);

  try {
    const response = await fetch(`/forum/comments/${commentId}`, {
      method: 'PUT',
      credentials: 'include',
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      closeEditCommentModal();
      toastSuccess('Comentario actualizado exitosamente');
      loadThread(); // Reload thread
    } else {
      toastError('Error: ' + (data.error || 'No se pudo actualizar el comentario'));
    }
  } catch (error) {
    console.error('Error updating comment:', error);
    toastError('Error al actualizar el comentario');
  }
}

// Delete comment
async function deleteComment(commentId) {
  if (!confirm('¿Estás seguro de que quieres eliminar este comentario?')) {
    return;
  }

  try {
    const response = await fetch(`/forum/comments/${commentId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await response.json();

    if (response.ok) {
      const message = data.isAdmin
        ? (data.type === 'hard' ? 'Comentario y todas sus respuestas eliminados permanentemente por admin' : 'Contenido del comentario eliminado')
        : (data.type === 'hard' ? 'Comentario eliminado completamente' : 'Contenido del comentario eliminado');

      toastSuccess(message);
      loadThread(); // Reload to show changes
    } else {
      toastError('Error: ' + (data.error || 'No se pudo eliminar el comentario'));
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    toastError('Error al eliminar el comentario');
  }
}

window.deleteComment = deleteComment;

// ===== WELCOME MODAL =====

async function checkForumWelcomeModal() {
  // Wait for PreferencesService to be available
  while (!window.PreferencesService) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Initialize service and get modal status
  const hasSeenWelcome = await window.PreferencesService.getWelcomeModal('forumWelcomeShown');

  if (!hasSeenWelcome) {
    // Show welcome modal after a short delay
    setTimeout(() => {
      document.getElementById('welcomeForumModal').classList.add('active');
    }, 500);
  }
}

function closeWelcomeForumModal() {
  document.getElementById('welcomeForumModal').classList.remove('active');

  // Save to preferences
  if (window.PreferencesService) {
    window.PreferencesService.setWelcomeModal('forumWelcomeShown', true);
  }
}

window.closeWelcomeForumModal = closeWelcomeForumModal;
