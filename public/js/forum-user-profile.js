// Forum User Profile - Handles user profile modal

let currentProfileUserId = null;

// Open user profile modal
async function openUserProfileModal(userId) {
  if (!userId) return;

  currentProfileUserId = userId;
  const modal = document.getElementById('userProfileModal');
  const content = document.getElementById('userProfileContent');

  // Show modal
  modal.classList.add('active');
  content.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-secondary);">Cargando perfil...</div>';

  try {
    const token = await window.authUtils.getAuthToken();
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    const response = await fetch(`/api/forum/users/${userId}/profile`, { headers });

    if (response.ok) {
      const data = await response.json();
      await displayUserProfile(data.user);
    } else {
      content.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--danger-color);">Error al cargar el perfil</div>';
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
    content.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--danger-color);">Error al cargar el perfil</div>';
  }
}

// Display user profile in modal
async function displayUserProfile(user) {
  const content = document.getElementById('userProfileContent');
  const token = await window.authUtils.getAuthToken();
  const currentUserId = token ? getUserIdFromToken(token) : null;
  const isOwnProfile = currentUserId === user._id;

  const memberSince = new Date(user.createdAt).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  content.innerHTML = `
    <div style="text-align: center; padding: 1.5rem;">
      <img src="${user.picture || '/images/default-avatar.svg'}" alt="${user.name}" style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid var(--primary-color); margin-bottom: 1rem;">

      <h2 style="margin: 0 0 0.5rem 0; color: var(--text-primary);">${escapeHtml(user.name || user.email)}</h2>
      <p style="margin: 0 0 0.25rem 0; color: var(--text-secondary); font-size: 0.875rem;">${escapeHtml(user.email)}</p>
      <p style="margin: 0; color: var(--text-secondary); font-size: 0.875rem;">Miembro desde ${memberSince}</p>
    </div>

    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; padding: 1.5rem; background: var(--background); border-radius: 8px; margin-bottom: 1.5rem;">
      <div style="text-align: center;">
        <div style="font-size: 2rem; font-weight: bold; color: var(--primary-color);">${user.stats?.threads || 0}</div>
        <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">Threads</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 2rem; font-weight: bold; color: var(--primary-color);">${user.stats?.comments || 0}</div>
        <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">Comentarios</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 2rem; font-weight: bold; color: var(--primary-color);">${user.stats?.likesReceived || 0}</div>
        <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">Likes recibidos</div>
      </div>
    </div>

    ${user.recentThreads && user.recentThreads.length > 0 ? `
      <div style="margin-bottom: 1.5rem;">
        <h3 style="margin: 0 0 1rem 0; font-size: 1rem; color: var(--text-primary);">Threads recientes</h3>
        <div style="display: flex; flex-direction: column; gap: 0.75rem;">
          ${user.recentThreads.map(thread => `
            <a href="/forum-thread/${thread._id}" style="text-decoration: none; padding: 0.75rem; background: var(--surface); border-radius: 6px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; transition: background 0.2s;" onmouseover="this.style.background='var(--surface-elevated)'" onmouseout="this.style.background='var(--surface)'">
              <div style="flex: 1; min-width: 0;">
                <div style="color: var(--text-primary); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(thread.title)}</div>
                <div style="color: var(--text-secondary); font-size: 0.75rem; margin-top: 0.25rem;">
                  ${new Date(thread.createdAt).toLocaleDateString('es-UY')} · ${thread.likesCount} likes · ${thread.commentsCount} comentarios
                </div>
              </div>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink: 0; margin-left: 0.5rem; color: var(--text-secondary);">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            </a>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <div style="display: flex; gap: 0.5rem; justify-content: center;">
      ${!isOwnProfile && token ? `
        <button onclick="openReportModal('user', '${user._id}')" class="btn btn-secondary" style="display: inline-flex; align-items: center; gap: 0.5rem;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          Reportar usuario
        </button>
      ` : ''}
      <button onclick="closeUserProfileModal()" class="btn btn-primary">Cerrar</button>
    </div>
  `;
}

// Close user profile modal
function closeUserProfileModal() {
  const modal = document.getElementById('userProfileModal');
  modal.classList.remove('active');
  currentProfileUserId = null;
}

// Make user names clickable
function makeUserNameClickable(name, userId) {
  return `<span class="user-name-link" onclick="openUserProfileModal('${userId}')" style="cursor: pointer; color: var(--text-primary); font-weight: 600; text-decoration: none;" onmouseover="this.style.color='var(--primary-color)'" onmouseout="this.style.color='var(--text-primary)'">${escapeHtml(name)}</span>`;
}

// Export functions
window.openUserProfileModal = openUserProfileModal;
window.closeUserProfileModal = closeUserProfileModal;
window.makeUserNameClickable = makeUserNameClickable;
