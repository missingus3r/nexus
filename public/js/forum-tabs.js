// Forum Tabs - Handles tab switching and content loading

let currentTab = 'all';
let myPostsPage = 1;
let myPostsSort = 'recent';
let myReportsPage = 1;
let myReportsStatus = '';

// Switch between tabs
function switchForumTab(tab) {
  currentTab = tab;

  // Update tab styles
  document.querySelectorAll('.forum-tab').forEach(btn => {
    btn.classList.remove('active');
    btn.style.borderBottomColor = 'transparent';
    btn.style.color = 'var(--text-secondary)';
    btn.style.fontWeight = '500';
  });

  const activeTab = document.querySelector(`[data-tab="${tab}"]`);
  if (activeTab) {
    activeTab.classList.add('active');
    activeTab.style.borderBottomColor = 'var(--primary-color)';
    activeTab.style.color = 'var(--primary-color)';
    activeTab.style.fontWeight = '600';
  }

  // Hide all tab contents
  document.querySelectorAll('.forum-tab-content').forEach(content => {
    content.style.display = 'none';
  });

  // Show selected tab content
  switch (tab) {
    case 'all':
      document.getElementById('allPostsTab').style.display = 'block';
      break;
    case 'my-posts':
      document.getElementById('myPostsTab').style.display = 'block';
      loadMyPosts();
      break;
    case 'my-reports':
      document.getElementById('myReportsTab').style.display = 'block';
      loadMyReports();
      break;
    case 'notifications':
      document.getElementById('notificationsTab').style.display = 'block';
      loadNotifications();
      break;
  }
}

// Load user's own threads
async function loadMyPosts() {
  const container = document.getElementById('myThreadsList');
  container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-secondary);">Cargando...</div>';

  try {
    const token = await window.authUtils.getAuthToken();
    if (!token) {
      container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-secondary);">Inicia sesión para ver tus posts</div>';
      return;
    }

    const response = await fetch(`/forum/my-threads?page=${myPostsPage}&sort=${myPostsSort}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      displayMyPosts(data.threads, data.pagination);
    } else {
      container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--danger-color);">Error al cargar tus posts</div>';
    }
  } catch (error) {
    console.error('Error loading my posts:', error);
    container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--danger-color);">Error al cargar tus posts</div>';
  }
}

// Display user's posts
function displayMyPosts(threads, pagination) {
  const container = document.getElementById('myThreadsList');

  if (!threads || threads.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-secondary);">No has creado ningún post aún</div>';
    return;
  }

  container.innerHTML = threads.map(thread => `
    <div class="thread-card" style="background: var(--surface); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1rem; transition: transform 0.2s;">
      <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
        <div style="flex: 1; min-width: 0;">
          <h3 style="margin: 0 0 0.5rem 0; font-size: 1.125rem;">
            <a href="/forum-thread/${thread._id}" style="color: var(--text-primary); text-decoration: none; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(thread.title)}</a>
          </h3>
          <div style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.75rem;">
            ${formatDate(thread.createdAt)} ${thread.updatedAt && thread.updatedAt !== thread.createdAt ? '(editado)' : ''}
          </div>
          ${thread.hashtags && thread.hashtags.length > 0 ? `
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem;">
              ${thread.hashtags.map(tag => `<span class="hashtag-tag">#${tag}</span>`).join('')}
            </div>
          ` : ''}
          <div style="display: flex; gap: 1.5rem; color: var(--text-secondary); font-size: 0.875rem;">
            <span>❤️ ${thread.likesCount || 0}</span>
            <span>💬 ${thread.commentsCount || 0}</span>
          </div>
        </div>
        ${thread.status === 'deleted' ? `
          <span style="padding: 0.25rem 0.75rem; background: var(--danger-color); color: white; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">Eliminado</span>
        ` : ''}
      </div>
    </div>
  `).join('');

  // Update pagination
  updateMyPostsPagination(pagination);

  // Add sort buttons listeners
  document.getElementById('myPostsSortRecent')?.addEventListener('click', () => {
    myPostsSort = 'recent';
    myPostsPage = 1;
    document.querySelectorAll('#myPostsTab .sort-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('myPostsSortRecent').classList.add('active');
    loadMyPosts();
  });

  document.getElementById('myPostsSortPopular')?.addEventListener('click', () => {
    myPostsSort = 'popular';
    myPostsPage = 1;
    document.querySelectorAll('#myPostsTab .sort-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById('myPostsSortPopular').classList.add('active');
    loadMyPosts();
  });
}

// Update My Posts pagination
function updateMyPostsPagination(pagination) {
  const container = document.getElementById('myThreadsPagination');
  const { page, pages } = pagination;

  if (pages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  if (page > 1) {
    html += `<button class="btn btn-secondary" onclick="changeMyPostsPage(${page - 1})">Anterior</button>`;
  }

  html += `<span style="padding: 0.5rem 1rem; color: var(--text-secondary);">Página ${page} de ${pages}</span>`;

  if (page < pages) {
    html += `<button class="btn btn-secondary" onclick="changeMyPostsPage(${page + 1})">Siguiente</button>`;
  }

  container.innerHTML = html;
}

function changeMyPostsPage(page) {
  myPostsPage = page;
  loadMyPosts();
}

// Load user's reports
async function loadMyReports() {
  const container = document.getElementById('myReportsList');
  container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-secondary);">Cargando...</div>';

  try {
    const token = await window.authUtils.getAuthToken();
    if (!token) {
      container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-secondary);">Inicia sesión para ver tus reportes</div>';
      return;
    }

    const params = new URLSearchParams({
      page: myReportsPage,
      limit: 20
    });

    if (myReportsStatus) {
      params.append('status', myReportsStatus);
    }

    const response = await fetch(`/reports/my-reports?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      displayMyReports(data.reports, data.pagination, data.counts);
    } else {
      container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--danger-color);">Error al cargar tus reportes</div>';
    }
  } catch (error) {
    console.error('Error loading my reports:', error);
    container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--danger-color);">Error al cargar tus reportes</div>';
  }
}

// Display user's reports
function displayMyReports(reports, pagination, counts) {
  const container = document.getElementById('myReportsList');

  if (!reports || reports.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-secondary);">No has creado ningún reporte</div>';
    return;
  }

  container.innerHTML = reports.map(report => `
    <div style="background: var(--surface); padding: 1.5rem; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 1rem;">
      <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem; margin-bottom: 1rem;">
        <div style="flex: 1;">
          <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
            <span style="padding: 0.25rem 0.5rem; background: var(--surface-elevated); border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
              ${getReportTypeLabel(report.reportedType)}
            </span>
            <span style="padding: 0.25rem 0.5rem; background: ${getStatusColor(report.status)}; color: white; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
              ${getStatusLabel(report.status)}
            </span>
          </div>
          <div style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">
            Razón: <strong>${getReasonLabel(report.reason)}</strong>
          </div>
          ${report.description ? `
            <p style="margin: 0.5rem 0; color: var(--text-secondary); font-size: 0.875rem;">${escapeHtml(report.description)}</p>
          ` : ''}
          <div style="color: var(--text-secondary); font-size: 0.75rem; margin-top: 0.5rem;">
            Reportado el ${new Date(report.createdAt).toLocaleDateString('es-UY', { year: 'numeric', month: 'short', day: 'numeric' })}
          </div>
        </div>
      </div>
      ${report.resolution ? `
        <div style="background: var(--background); padding: 1rem; border-radius: 4px; margin-top: 1rem;">
          <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">Resolución:</div>
          <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">${escapeHtml(report.resolution)}</p>
        </div>
      ` : ''}
    </div>
  `).join('');

  // Update pagination
  updateMyReportsPagination(pagination);
}

// Update My Reports pagination
function updateMyReportsPagination(pagination) {
  const container = document.getElementById('myReportsPagination');
  const { page, pages } = pagination;

  if (pages <= 1) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  if (page > 1) {
    html += `<button class="btn btn-secondary" onclick="changeMyReportsPage(${page - 1})">Anterior</button>`;
  }

  html += `<span style="padding: 0.5rem 1rem; color: var(--text-secondary);">Página ${page} de ${pages}</span>`;

  if (page < pages) {
    html += `<button class="btn btn-secondary" onclick="changeMyReportsPage(${page + 1})">Siguiente</button>`;
  }

  container.innerHTML = html;
}

function changeMyReportsPage(page) {
  myReportsPage = page;
  loadMyReports();
}

function filterMyReports(status) {
  myReportsStatus = status;
  myReportsPage = 1;
  loadMyReports();
}

// Load notifications
async function loadNotifications() {
  const container = document.getElementById('notificationsList');
  container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-secondary);">Cargando...</div>';

  try {
    const token = await window.authUtils.getAuthToken();
    if (!token) {
      container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-secondary);">Inicia sesión para ver tus notificaciones</div>';
      return;
    }

    const response = await fetch('/notifications', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      displayNotifications(data.notifications);
      updateNotificationBadge(data.unreadCount);
    } else {
      container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--danger-color);">Error al cargar notificaciones</div>';
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
    container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--danger-color);">Error al cargar notificaciones</div>';
  }
}

// Display notifications
function displayNotifications(notifications) {
  const container = document.getElementById('notificationsList');

  if (!notifications || notifications.length === 0) {
    container.innerHTML = '<div style="text-align: center; padding: 3rem; color: var(--text-secondary);">No tienes notificaciones</div>';
    return;
  }

  container.innerHTML = notifications.map(notif => `
    <div style="background: ${notif.read ? 'var(--surface)' : 'var(--surface-elevated)'}; padding: 1rem; border-radius: 8px; border-left: 4px solid ${notif.read ? 'var(--border-color)' : 'var(--primary-color)'}; margin-bottom: 0.75rem; cursor: pointer;" onclick="handleNotificationClick('${notif._id}', '${notif.data?.threadId || ''}', '${notif.data?.commentId || ''}')">
      <div style="display: flex; justify-content: space-between; align-items: start; gap: 1rem;">
        <div style="flex: 1;">
          <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${escapeHtml(notif.title)}</div>
          <div style="color: var(--text-secondary); font-size: 0.875rem; margin-bottom: 0.5rem;">${escapeHtml(notif.message)}</div>
          <div style="color: var(--text-secondary); font-size: 0.75rem;">
            ${new Date(notif.createdAt).toLocaleString('es-UY')}
          </div>
        </div>
        ${!notif.read ? '<div style="width: 10px; height: 10px; background: var(--primary-color); border-radius: 50%; flex-shrink: 0;"></div>' : ''}
      </div>
    </div>
  `).join('');
}

// Handle notification click
async function handleNotificationClick(notifId, threadId, commentId) {
  // Mark as read
  try {
    const token = await window.authUtils.getAuthToken();
    await fetch(`/notifications/${notifId}/read`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }

  // Navigate to thread
  if (threadId) {
    window.location.href = `/forum-thread/${threadId}${commentId ? `#comment-${commentId}` : ''}`;
  }
}

// Mark all notifications as read
async function markAllNotificationsAsRead() {
  try {
    const token = await window.authUtils.getAuthToken();
    const response = await fetch('/notifications/read-all', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.ok) {
      loadNotifications();
    }
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
}

// Update notification badge
function updateNotificationBadge(count) {
  const badge = document.getElementById('notificationsBadge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = 'block';
    } else {
      badge.style.display = 'none';
    }
  }
}

// Check for new notifications periodically
async function checkNotifications() {
  const token = await window.authUtils.getAuthToken();
  if (!token) return;

  fetch('/notifications?unread=true&limit=1', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(res => res.json())
    .then(data => {
      updateNotificationBadge(data.unreadCount);
    })
    .catch(err => console.error('Error checking notifications:', err));
}

// Helper functions (use global ones if available)
function escapeHtml(text) {
  if (typeof window.escapeHtml === 'function') {
    return window.escapeHtml(text);
  }
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(date) {
  if (typeof window.formatDate === 'function') {
    return window.formatDate(date);
  }
  return new Date(date).toLocaleDateString('es-UY');
}

function getReportTypeLabel(type) {
  const labels = { thread: 'Thread', comment: 'Comentario', user: 'Usuario' };
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

// Initialize - check notifications every 30 seconds
window.authUtils.getAuthToken().then(() => {
  if (window.authUtils.isAuthenticated()) {
    checkNotifications();
    setInterval(checkNotifications, 30000);
  }
});

// Export functions
window.switchForumTab = switchForumTab;
window.changeMyPostsPage = changeMyPostsPage;
window.changeMyReportsPage = changeMyReportsPage;
window.filterMyReports = filterMyReports;
window.handleNotificationClick = handleNotificationClick;
window.markAllNotificationsAsRead = markAllNotificationsAsRead;
