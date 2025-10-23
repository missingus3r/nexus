// Forum JavaScript - Handles threads, comments, likes, and interactions

let currentPage = 1;
let currentSort = 'recent';
let currentThreadId = null;
let threadQuillEditor = null;

document.addEventListener('DOMContentLoaded', () => {
  // Check which page we're on
  const path = window.location.pathname;

  if (path === '/forum-nexus') {
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
        }, 100);
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
    placeholder: 'Escribe el contenido de tu thread...',
    modules: {
      toolbar: toolbarOptions
    }
  });

  // Update character count
  threadQuillEditor.on('text-change', () => {
    const length = threadQuillEditor.getLength() - 1; // -1 for the trailing newline
    document.getElementById('contentCharCount').textContent = length;
  });
}

async function loadThreads() {
  try {
    const token = localStorage.getItem('jwt');
    const response = await fetch(`/api/forum/threads?page=${currentPage}&limit=20&sort=${currentSort}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    const data = await response.json();
    displayThreads(data.threads);
    displayPagination(data.pagination);
  } catch (error) {
    console.error('Error loading threads:', error);
    document.getElementById('threadsList').innerHTML = '<p style="text-align: center; color: var(--danger-color);">Error al cargar threads</p>';
  }
}

function displayThreads(threads) {
  const container = document.getElementById('threadsList');
  const token = localStorage.getItem('jwt');

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

        ${thread.images && thread.images.length > 0 ? `
          <div class="thread-images-preview">
            ${thread.images.slice(0, 3).map(img => `
              <img src="${img.url}" alt="Thread image" class="thread-preview-img">
            `).join('')}
            ${thread.images.length > 3 ? `<span>+${thread.images.length - 3}</span>` : ''}
          </div>
        ` : ''}

        <div class="thread-meta">
          <span class="thread-author">Por ${escapeHtml(thread.author.name || thread.author.email || 'Usuario')}</span>
          <span class="thread-date">${formatDate(thread.createdAt)}</span>
          <span class="thread-stats">
            <span>💬 ${thread.commentsCount || 0}</span>
            <span>❤️ ${thread.likesCount || 0}</span>
          </span>
        </div>
      </div>

      <div class="thread-actions">
        ${token ? `
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

  if (pagination.pages <= 1) {
    container.innerHTML = '';
    return;
  }

  let pages = [];
  for (let i = 1; i <= pagination.pages; i++) {
    pages.push(`
      <button class="pagination-btn ${i === pagination.page ? 'active' : ''}" onclick="goToPage(${i})">
        ${i}
      </button>
    `);
  }

  container.innerHTML = pages.join('');
}

function goToPage(page) {
  currentPage = page;
  loadThreads();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function handleNewThreadSubmit(e) {
  e.preventDefault();

  const token = localStorage.getItem('jwt');
  if (!token) {
    alert('Debes iniciar sesión');
    window.location.href = '/login';
    return;
  }

  // Get HTML content from Quill
  const htmlContent = threadQuillEditor.root.innerHTML;

  // Validate content
  const textContent = threadQuillEditor.getText().trim();
  if (textContent.length < 10) {
    alert('El contenido debe tener al menos 10 caracteres');
    return;
  }

  if (textContent.length > 10000) {
    alert('El contenido no puede exceder 10000 caracteres');
    return;
  }

  const formData = new FormData(e.target);

  // Replace the content with HTML from Quill
  formData.set('content', htmlContent);

  try {
    const response = await fetch('/api/forum/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      closeNewThreadModal();
      window.location.href = `/forum-thread/${data.thread._id}`;
    } else {
      if (response.status === 429) {
        // Rate limit error
        alert('⏱️ ' + data.error);
      } else {
        alert('Error: ' + (data.error || 'No se pudo crear el thread'));
      }
    }
  } catch (error) {
    console.error('Error creating thread:', error);
    alert('Error al crear el thread');
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
    const token = localStorage.getItem('jwt');
    const response = await fetch(`/api/forum/threads/${currentThreadId}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    });

    const data = await response.json();
    displayThread(data.thread);
    displayComments(data.comments);
  } catch (error) {
    console.error('Error loading thread:', error);
    document.getElementById('threadContent').innerHTML = '<p style="text-align: center; color: var(--danger-color);">Error al cargar el thread</p>';
  }
}

function displayThread(thread) {
  const container = document.getElementById('threadContent');

  // Check if user can edit/delete
  const token = localStorage.getItem('jwt');
  const isAuthor = token && thread.author._id === getUserIdFromToken(token);
  const isAdmin = token && isUserAdmin(token);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const canEdit = isAuthor && new Date(thread.createdAt) > fiveMinutesAgo;
  const canDelete = isAdmin || (isAuthor && new Date(thread.createdAt) > fiveMinutesAgo);

  container.innerHTML = `
    <div class="thread-detail">
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
        <h1 style="margin: 0;">${escapeHtml(thread.title)}</h1>
        ${canEdit || canDelete ? `
          <div style="display: flex; gap: 0.5rem;">
            ${canEdit ? `
              <button onclick="openEditThreadModal('${thread._id}')" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.875rem;">
                Editar
              </button>
            ` : ''}
            ${canDelete ? `
              <button onclick="deleteThread('${thread._id}')" class="btn" style="padding: 0.5rem 1rem; font-size: 0.875rem; background: var(--danger-color); color: white;">
                ${isAdmin ? 'Eliminar (Admin)' : 'Eliminar'}
              </button>
            ` : ''}
          </div>
        ` : ''}
      </div>

      <div class="thread-meta" style="margin-bottom: 2rem; color: var(--text-secondary); display: flex; gap: 1rem; flex-wrap: wrap;">
        <span>Por <strong>${escapeHtml(thread.author.name || thread.author.email || 'Usuario')}</strong></span>
        <span>${formatDate(thread.createdAt)}</span>
        ${thread.updatedAt && thread.updatedAt !== thread.createdAt ? '<span style="font-style: italic;">(editado)</span>' : ''}
      </div>

      <div class="thread-content" style="line-height: 1.7; white-space: pre-wrap; margin-bottom: 2rem;">
        ${formatContent(thread.content)}
      </div>

      ${thread.images && thread.images.length > 0 ? `
        <div class="thread-images" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          ${thread.images.map(img => `
            <img src="${img.url}" alt="Thread image" class="thread-image" onclick="openImageModal('${img.url}')" style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 1px solid var(--border-color);">
          `).join('')}
        </div>
      ` : ''}

      <div class="thread-actions" style="display: flex; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
        ${token ? `
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

function displayComments(comments) {
  const container = document.getElementById('commentsList');
  const count = document.getElementById('commentsCount');

  const totalComments = countAllComments(comments);
  count.textContent = `(${totalComments})`;

  if (!comments || comments.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No hay comentarios aún. ¡Sé el primero en comentar!</p>';
    return;
  }

  container.innerHTML = comments.map(comment => renderComment(comment)).join('');
}

function renderComment(comment, depth = 0) {
  const marginLeft = Math.min(depth * 2, 10); // Max 10rem indentation

  // Check if user can edit/delete
  const token = localStorage.getItem('jwt');
  const isAuthor = token && comment.author._id === getUserIdFromToken(token);
  const isAdmin = token && isUserAdmin(token);
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  const canEdit = isAuthor && new Date(comment.createdAt) > fiveMinutesAgo;
  const canDelete = isAdmin || (isAuthor && new Date(comment.createdAt) > fiveMinutesAgo);

  return `
    <div class="comment" data-comment-id="${comment._id}" style="margin-left: ${marginLeft}rem; margin-bottom: 1rem; padding: 1rem; background: var(--surface); border-radius: 8px; border-left: 3px solid var(--primary-color);">
      <div class="comment-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.75rem;">
        <div>
          <strong style="color: var(--text-primary);">${escapeHtml(comment.author.name || comment.author.email || 'Usuario')}</strong>
          <span style="color: var(--text-secondary); font-size: 0.875rem; margin-left: 0.5rem;">${formatDate(comment.createdAt)}</span>
          ${comment.updatedAt && comment.updatedAt !== comment.createdAt ? '<span style="color: var(--text-secondary); font-size: 0.875rem; font-style: italic; margin-left: 0.5rem;">(editado)</span>' : ''}
        </div>
        ${canEdit || canDelete ? `
          <div style="display: flex; gap: 0.5rem;">
            ${canEdit ? `
              <button onclick="openEditCommentModal('${comment._id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background: var(--surface-elevated); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; color: var(--text-primary);">
                Editar
              </button>
            ` : ''}
            ${canDelete ? `
              <button onclick="deleteComment('${comment._id}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem; background: var(--danger-color); border: none; border-radius: 4px; cursor: pointer; color: white;">
                ${isAdmin ? 'Eliminar (Admin)' : 'Eliminar'}
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
        ${token ? `
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

  const token = localStorage.getItem('jwt');
  if (!token) {
    alert('Debes iniciar sesión');
    return;
  }

  const formData = new FormData(e.target);

  try {
    const response = await fetch(`/api/forum/threads/${currentThreadId}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      e.target.reset();
      document.getElementById('commentCharCount').textContent = '0';
      document.getElementById('commentImagePreview').innerHTML = '';
      loadThread(); // Reload to show new comment
    } else {
      if (response.status === 429) {
        // Rate limit error
        alert('⏱️ ' + data.error);
      } else {
        alert('Error: ' + (data.error || 'No se pudo publicar el comentario'));
      }
    }
  } catch (error) {
    console.error('Error posting comment:', error);
    alert('Error al publicar el comentario');
  }
}

function openReplyModal(commentId) {
  const token = localStorage.getItem('jwt');
  if (!token) {
    alert('Debes iniciar sesión');
    window.location.href = '/login';
    return;
  }

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

  const token = localStorage.getItem('jwt');
  if (!token) {
    alert('Debes iniciar sesión');
    return;
  }

  const formData = new FormData(e.target);

  try {
    const response = await fetch(`/api/forum/threads/${currentThreadId}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      closeReplyModal();
      loadThread(); // Reload to show new reply
    } else {
      if (response.status === 429) {
        // Rate limit error
        alert('⏱️ ' + data.error);
      } else {
        alert('Error: ' + (data.error || 'No se pudo publicar la respuesta'));
      }
    }
  } catch (error) {
    console.error('Error posting reply:', error);
    alert('Error al publicar la respuesta');
  }
}

// ===== LIKES =====

async function toggleThreadLike(threadId, event) {
  event.preventDefault();
  event.stopPropagation();

  const token = localStorage.getItem('jwt');
  if (!token) {
    alert('Debes iniciar sesión para dar like');
    window.location.href = '/login';
    return;
  }

  const button = event.currentTarget;
  button.disabled = true;

  try {
    const response = await fetch(`/api/forum/threads/${threadId}/like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
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

  const token = localStorage.getItem('jwt');
  if (!token) {
    alert('Debes iniciar sesión para dar like');
    return;
  }

  const button = event.currentTarget;
  button.disabled = true;

  try {
    const response = await fetch(`/api/forum/comments/${commentId}/like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
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
    alert('Máximo 5 imágenes permitidas');
    e.target.value = '';
    preview.innerHTML = '';
    return;
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  const invalidFiles = files.filter(f => f.size > maxSize);
  if (invalidFiles.length > 0) {
    alert('Cada imagen debe ser menor a 5MB');
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

  return sanitized;
}

// ===== EDIT/DELETE FUNCTIONS =====

let editThreadQuillEditor = null;
let currentThreadData = null;
let currentCommentData = null;

// Get user ID from JWT token
function getUserIdFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub;
  } catch (error) {
    return null;
  }
}

function getUserRoleFromToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || 'user';
  } catch (error) {
    return 'user';
  }
}

function isUserAdmin(token) {
  return getUserRoleFromToken(token) === 'admin';
}

// Open edit thread modal
async function openEditThreadModal(threadId) {
  const token = localStorage.getItem('jwt');
  if (!token) {
    alert('Debes iniciar sesión');
    return;
  }

  try {
    // Fetch thread data
    const response = await fetch(`/api/forum/threads/${threadId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
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
    alert('Error al cargar el thread');
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

  const token = localStorage.getItem('jwt');
  if (!token) {
    alert('Debes iniciar sesión');
    return;
  }

  const threadId = document.getElementById('editThreadId').value;
  const title = document.getElementById('editThreadTitle').value;
  const content = editThreadQuillEditor.root.innerHTML;

  const formData = new FormData();
  formData.set('title', title);
  formData.set('content', content);

  try {
    const response = await fetch(`/api/forum/threads/${threadId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      closeEditThreadModal();
      loadThread(); // Reload thread
      alert('Thread actualizado exitosamente');
    } else {
      alert('Error: ' + (data.error || 'No se pudo actualizar el thread'));
    }
  } catch (error) {
    console.error('Error updating thread:', error);
    alert('Error al actualizar el thread');
  }
}

// Delete thread
async function deleteThread(threadId) {
  const token = localStorage.getItem('jwt');
  if (!token) {
    alert('Debes iniciar sesión');
    return;
  }

  const isAdmin = isUserAdmin(token);

  // Different confirmation message for admins
  const confirmMessage = isAdmin
    ? '⚠️ ADMIN: ¿Estás seguro de que quieres eliminar permanentemente este thread?\n\nEsto eliminará el thread y TODOS sus comentarios de forma PERMANENTE.\n\nEsta acción NO se puede deshacer.'
    : '¿Estás seguro de que quieres eliminar este thread?';

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    const response = await fetch(`/api/forum/threads/${threadId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      if (data.type === 'hard') {
        // Completely deleted - redirect to forum
        alert(isAdmin ? 'Thread y todos sus comentarios eliminados permanentemente por admin' : 'Thread eliminado completamente');
        window.location.href = '/forum-nexus';
      } else {
        // Soft deleted - reload to show [ELIMINADO]
        alert('Contenido del thread eliminado');
        loadThread();
      }
    } else {
      alert('Error: ' + (data.error || 'No se pudo eliminar el thread'));
    }
  } catch (error) {
    console.error('Error deleting thread:', error);
    alert('Error al eliminar el thread');
  }
}

window.deleteThread = deleteThread;

// Open edit comment modal
async function openEditCommentModal(commentId) {
  const token = localStorage.getItem('jwt');
  if (!token) {
    alert('Debes iniciar sesión');
    return;
  }

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
    const response = await fetch(`/api/forum/threads/${currentThreadId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    const comment = findComment(data.comments);

    if (!comment) {
      alert('Comentario no encontrado');
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
    alert('Error al cargar el comentario');
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

  const token = localStorage.getItem('jwt');
  if (!token) {
    alert('Debes iniciar sesión');
    return;
  }

  const commentId = document.getElementById('editCommentId').value;
  const content = document.getElementById('editCommentContent').value;

  const formData = new FormData();
  formData.set('content', `<p>${escapeHtml(content)}</p>`);

  try {
    const response = await fetch(`/api/forum/comments/${commentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();

    if (response.ok) {
      closeEditCommentModal();
      loadThread(); // Reload thread
      alert('Comentario actualizado exitosamente');
    } else {
      alert('Error: ' + (data.error || 'No se pudo actualizar el comentario'));
    }
  } catch (error) {
    console.error('Error updating comment:', error);
    alert('Error al actualizar el comentario');
  }
}

// Delete comment
async function deleteComment(commentId) {
  const token = localStorage.getItem('jwt');
  if (!token) {
    alert('Debes iniciar sesión');
    return;
  }

  const isAdmin = isUserAdmin(token);

  // Different confirmation message for admins
  const confirmMessage = isAdmin
    ? '⚠️ ADMIN: ¿Estás seguro de que quieres eliminar permanentemente este comentario?\n\nEsto eliminará el comentario y TODAS sus respuestas anidadas de forma PERMANENTE.\n\nEsta acción NO se puede deshacer.'
    : '¿Estás seguro de que quieres eliminar este comentario?';

  if (!confirm(confirmMessage)) {
    return;
  }

  try {
    const response = await fetch(`/api/forum/comments/${commentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      const message = isAdmin
        ? (data.type === 'hard' ? 'Comentario y todas sus respuestas eliminados permanentemente por admin' : 'Contenido del comentario eliminado')
        : (data.type === 'hard' ? 'Comentario eliminado completamente' : 'Contenido del comentario eliminado');

      alert(message);
      loadThread(); // Reload to show changes
    } else {
      alert('Error: ' + (data.error || 'No se pudo eliminar el comentario'));
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    alert('Error al eliminar el comentario');
  }
}

window.deleteComment = deleteComment;

// ===== WELCOME MODAL =====

function checkForumWelcomeModal() {
  // Check if user has already seen the welcome modal
  const hasSeenWelcome = localStorage.getItem('forumWelcomeSeen');

  if (!hasSeenWelcome) {
    // Show welcome modal after a short delay
    setTimeout(() => {
      document.getElementById('welcomeForumModal').classList.add('active');
    }, 500);
  }
}

function closeWelcomeForumModal() {
  document.getElementById('welcomeForumModal').classList.remove('active');
  // Mark as seen in localStorage
  localStorage.setItem('forumWelcomeSeen', 'true');
}

window.closeWelcomeForumModal = closeWelcomeForumModal;
