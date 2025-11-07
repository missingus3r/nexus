        document.addEventListener('DOMContentLoaded', () => {
            loadStats();
            loadUserStats();
            loadForumStats();
            loadForumSettings();
            loadPricingSettings();
            loadVisitStats();
            loadTopPages();
            loadRecentVisits();
            loadMaintenanceSettings();
            setupUserManagementHandlers();
            loadCronSettings();
        });

        async function loadStats() {
            try {
                const response = await fetch('/api/admin/stats');
                const stats = await response.json();

                if (!response.ok) {
                    throw new Error(stats.error || 'Error al cargar estadísticas');
                }

                displayStats(stats);
            } catch (error) {
                console.error('Error loading stats:', error);
                document.getElementById('statsContainer').innerHTML = `
                    <div class="text-center" style="padding: 3rem;">
                        <p style="color: var(--danger-color);">Error al cargar estadísticas: ${error.message}</p>
                    </div>
                `;
            }
        }

        function displayStats(stats) {
            const container = document.getElementById('statsContainer');

            container.innerHTML = `
                <div class="dashboard-grid">
                    <div class="stat-card">
                        <h3>Total Incidentes</h3>
                        <div class="value">${stats.totalIncidents || 0}</div>
                        <div class="subtitle">Reportes totales</div>
                    </div>

                    <div class="stat-card success">
                        <h3>Incidentes Hoy</h3>
                        <div class="value">${stats.incidentsToday || 0}</div>
                        <div class="subtitle">Últimas 24 horas</div>
                    </div>

                    <div class="stat-card">
                        <h3>Usuarios Registrados</h3>
                        <div class="value">${stats.totalUsers || 0}</div>
                        <div class="subtitle">Cuentas totales</div>
                    </div>

                    <div class="stat-card success">
                        <h3>Usuarios Hoy</h3>
                        <div class="value">${stats.usersToday || 0}</div>
                        <div class="subtitle">Últimas 24 horas</div>
                    </div>

                    <div class="stat-card">
                        <h3>Total Noticias</h3>
                        <div class="value">${stats.totalNews || 0}</div>
                        <div class="subtitle">Noticias indexadas</div>
                    </div>
                </div>

                <div class="dashboard-grid" style="margin-top: 2rem;">
                    <div class="stat-card">
                        <h3>Incidentes por Tipo</h3>
                        <div style="font-size: 0.875rem; margin-top: 1rem;">
                            ${stats.incidentsByType ? Object.entries(stats.incidentsByType).map(([type, count]) => `
                                <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--background);">
                                    <span>${type}</span>
                                    <strong>${count}</strong>
                                </div>
                            `).join('') : '<p>Sin datos</p>'}
                        </div>
                    </div>

                    <div class="stat-card">
                        <h3>Estado del Sistema</h3>
                        <div style="margin-top: 1rem;">
                            <div style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0;">
                                <span style="width: 12px; height: 12px; border-radius: 50%; background: ${stats.mongoConnected ? 'var(--success-color)' : 'var(--danger-color)'}"></span>
                                <span>MongoDB: ${stats.mongoConnected ? 'Conectado' : 'Desconectado'}</span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 1rem; padding: 0.5rem 0;">
                                <span style="width: 12px; height: 12px; border-radius: 50%; background: var(--success-color)"></span>
                                <span>Servidor: Activo</span>
                            </div>
                        </div>
                    </div>
                </div>

                ${stats.recentIncidents && stats.recentIncidents.length > 0 ? `
                    <div class="recent-activity">
                        <h2>Incidentes Recientes</h2>
                        ${stats.recentIncidents.map(incident => `
                            <div class="activity-item">
                                <strong>${incident.type || 'Desconocido'}</strong>
                                <div>${incident.description || 'Sin descripción'}</div>
                                <div class="time">${new Date(incident.timestamp).toLocaleString('es-UY')}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            `;
        }

        // News management functions
        function showStatus(message, type = 'info') {
            const statusEl = document.getElementById('newsStatus');
            statusEl.textContent = message;
            statusEl.className = `status-message ${type}`;
            statusEl.style.display = 'block';

            // Auto-hide after 10 seconds for success messages
            if (type === 'success' || type === 'info') {
                setTimeout(() => {
                    statusEl.style.display = 'none';
                }, 10000);
            }
        }

        function disableButtons(disabled) {
            document.getElementById('loadNewsBtn').disabled = disabled;
            document.getElementById('clearNewsBtn').disabled = disabled;
        }

        async function loadNews() {
            const confirmMsg = '¿Cargar noticias de seguridad de los feeds RSS?\n\nSolo se indexarán noticias relacionadas con seguridad (homicidio, rapiña, hurto, etc.).\n\nEsto puede tomar varios minutos.';

            if (!confirm(confirmMsg)) return;

            disableButtons(true);
            showStatus('Iniciando carga de noticias de seguridad... Este proceso puede tomar varios minutos.', 'info');

            try {
                const response = await fetch('/api/admin/news/ingest', { method: 'POST' });
                const data = await response.json();

                if (response.ok) {
                    showStatus(data.message + ' Revisa los logs del servidor para ver el progreso.', 'success');
                    // Reload stats after a delay
                    setTimeout(loadStats, 5000);
                } else {
                    showStatus('Error: ' + (data.error || 'No se pudo iniciar la carga'), 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showStatus('Error al cargar noticias: ' + error.message, 'error');
            } finally {
                disableButtons(false);
            }
        }

        async function clearNews() {
            if (!confirm('⚠️ ¿Estás seguro de eliminar TODAS las noticias?\n\nEsta acción no se puede deshacer.')) {
                return;
            }

            if (!confirm('⚠️⚠️ CONFIRMACIÓN FINAL ⚠️⚠️\n\nSe eliminarán permanentemente todas las noticias de la base de datos.\n\n¿Continuar?')) {
                return;
            }

            disableButtons(true);
            showStatus('Eliminando todas las noticias...', 'info');

            try {
                const response = await fetch('/api/admin/news/clear', { method: 'DELETE' });
                const data = await response.json();

                if (response.ok) {
                    showStatus(`✓ ${data.deletedCount} noticias eliminadas exitosamente`, 'success');
                    loadStats(); // Reload stats
                } else {
                    showStatus('Error: ' + (data.error || 'No se pudieron eliminar las noticias'), 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                showStatus('Error al eliminar noticias: ' + error.message, 'error');
            } finally {
                disableButtons(false);
            }
        }

        // User Management Functions
        const userManagementState = {
            loaded: false,
            loading: false,
            search: '',
            page: 1,
            limit: 20,
            totalPages: 1,
            totalCount: 0
        };

        function setupUserManagementHandlers() {
            const refreshBtn = document.getElementById('refreshUserListBtn');
            const searchBtn = document.getElementById('userSearchBtn');
            const searchInput = document.getElementById('userSearchInput');
            const tableBody = document.getElementById('userManagementTableBody');
            const prevPageBtn = document.getElementById('userPrevPageBtn');
            const nextPageBtn = document.getElementById('userNextPageBtn');

            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    loadUserList();
                });
            }

            if (searchBtn && searchInput) {
                searchBtn.addEventListener('click', () => {
                    userManagementState.search = searchInput.value.trim();
                    userManagementState.page = 1; // Reset to first page on new search
                    loadUserList();
                });

                searchInput.addEventListener('keypress', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        userManagementState.search = searchInput.value.trim();
                        userManagementState.page = 1; // Reset to first page on new search
                        loadUserList();
                    }
                });
            }

            if (prevPageBtn) {
                prevPageBtn.addEventListener('click', () => {
                    if (userManagementState.page > 1) {
                        userManagementState.page--;
                        loadUserList();
                    }
                });
            }

            if (nextPageBtn) {
                nextPageBtn.addEventListener('click', () => {
                    if (userManagementState.page < userManagementState.totalPages) {
                        userManagementState.page++;
                        loadUserList();
                    }
                });
            }

            if (tableBody) {
                tableBody.addEventListener('click', handleUserManagementAction);
            }

            // Load users on page load
            loadUserList();
        }


        function showUserManagementStatus(message, type = 'info', autoHide = false) {
            const statusEl = document.getElementById('userManagementStatus');

            if (!statusEl) {
                return;
            }

            statusEl.textContent = message;
            statusEl.className = `status-message ${type}`;
            statusEl.style.display = 'block';

            if (autoHide) {
                setTimeout(() => {
                    statusEl.style.display = 'none';
                }, 4000);
            }
        }

        async function loadUserList() {
            const tableBody = document.getElementById('userManagementTableBody');

            if (!tableBody) {
                return;
            }

            userManagementState.loading = true;
            showUserManagementStatus('Cargando usuarios...', 'info');

            try {
                const params = new URLSearchParams({
                    page: userManagementState.page,
                    limit: userManagementState.limit
                });

                if (userManagementState.search) {
                    params.append('search', userManagementState.search);
                }

                const response = await fetch(`/api/admin/users/list?${params.toString()}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al obtener usuarios');
                }

                userManagementState.loaded = true;
                userManagementState.totalPages = data.totalPages || 1;
                userManagementState.totalCount = data.totalCount || 0;

                renderUserList(data.users || []);
                updatePaginationControls(data);
                showUserManagementStatus(`Usuarios cargados (${data.count || 0} de ${data.totalCount || 0})`, 'success', true);
            } catch (error) {
                console.error('Error loading user list:', error);
                renderUserList([]);
                showUserManagementStatus(`Error al cargar usuarios: ${error.message}`, 'error');
            } finally {
                userManagementState.loading = false;
            }
        }

        function renderUserList(users) {
            const tableBody = document.getElementById('userManagementTableBody');

            if (!tableBody) {
                return;
            }

            if (!Array.isArray(users) || users.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="padding: 2rem; text-align: center; color: var(--text-secondary);">
                            No se encontraron usuarios con los filtros aplicados
                        </td>
                    </tr>
                `;
                return;
            }

            const rows = users.map((user) => {
                const roleBadge = user.role === 'admin'
                    ? '<span style="background: var(--warning-color); color: #fff; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">ADMIN</span>'
                    : '<span style="background: var(--primary-color); color: #fff; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">USER</span>';

                const statusBadge = user.banned
                    ? '<span style="background: var(--danger-color); color: #fff; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">Bloqueado</span>'
                    : '<span style="background: var(--success-color); color: #fff; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">Activo</span>';

                const createdAt = user.createdAt ? new Date(user.createdAt).toLocaleString('es-UY') : '-';
                const lastLogin = user.lastLogin ? new Date(user.lastLogin).toLocaleString('es-UY') : 'Nunca';

                const banActionLabel = user.banned ? 'Desbloquear' : 'Bloquear';
                const banBtnClass = user.banned ? 'btn btn-success' : 'btn btn-secondary';

                const deleteDisabled = user.role === 'admin' ? 'disabled' : '';

                return `
                    <tr style="border-bottom: 1px solid var(--border-color);">
                        <td style="padding: 1rem; min-width: 220px;">${user.email || '-'}</td>
                        <td style="padding: 1rem; min-width: 160px;">${user.name || '-'}</td>
                        <td style="padding: 1rem;">${roleBadge}</td>
                        <td style="padding: 1rem;">${statusBadge}</td>
                        <td style="padding: 1rem;">${createdAt}</td>
                        <td style="padding: 1rem;">${lastLogin}</td>
                        <td style="padding: 1rem;">
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                <button
                                    class="${banBtnClass}"
                                    data-action="toggle-ban"
                                    data-user-id="${user.id}"
                                    data-banned="${user.banned ? 'true' : 'false'}"
                                    style="padding: 0.25rem 0.75rem; font-size: 0.85rem;"
                                >
                                    ${banActionLabel}
                                </button>
                                <button
                                    class="btn btn-danger"
                                    data-action="delete"
                                    data-user-id="${user.id}"
                                    ${deleteDisabled}
                                    style="padding: 0.25rem 0.75rem; font-size: 0.85rem;"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            tableBody.innerHTML = rows;
        }

        function updatePaginationControls(data) {
            const paginationInfo = document.getElementById('userPaginationInfo');
            const currentPageSpan = document.getElementById('userCurrentPage');
            const prevPageBtn = document.getElementById('userPrevPageBtn');
            const nextPageBtn = document.getElementById('userNextPageBtn');

            if (paginationInfo) {
                const start = (data.page - 1) * data.limit + 1;
                const end = Math.min(start + data.count - 1, data.totalCount);
                paginationInfo.textContent = `Mostrando ${start}-${end} de ${data.totalCount} usuarios`;
            }

            if (currentPageSpan) {
                currentPageSpan.textContent = `Página ${data.page} de ${data.totalPages}`;
            }

            if (prevPageBtn) {
                prevPageBtn.disabled = data.page <= 1;
            }

            if (nextPageBtn) {
                nextPageBtn.disabled = data.page >= data.totalPages;
            }
        }

        async function updateUserStatus(userId, banned) {
            const response = await fetch(`/api/admin/users/${userId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ banned })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'No se pudo actualizar el estado del usuario');
            }

            return data;
        }

        async function deleteUser(userId) {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'No se pudo eliminar el usuario');
            }

            return data;
        }

        async function handleUserManagementAction(event) {
            const button = event.target.closest('button[data-action]');

            if (!button) {
                return;
            }

            const userId = button.getAttribute('data-user-id');
            const action = button.getAttribute('data-action');

            if (!userId || !action) {
                return;
            }

            try {
                if (action === 'toggle-ban') {
                    const currentlyBanned = button.getAttribute('data-banned') === 'true';
                    const nextStatus = !currentlyBanned;
                    const confirmationMessage = nextStatus
                        ? '¿Seguro que querés bloquear este usuario? No podrá iniciar sesión.'
                        : '¿Seguro que querés desbloquear este usuario?';

                    if (!confirm(confirmationMessage)) {
                        return;
                    }

                    button.disabled = true;
                    showUserManagementStatus(`${nextStatus ? 'Bloqueando' : 'Desbloqueando'} usuario...`, 'info');

                    const result = await updateUserStatus(userId, nextStatus);

                    showUserManagementStatus(result.message || 'Estado actualizado correctamente', 'success', true);
                    await loadUserList();
                    await loadUserStats();
                } else if (action === 'delete') {
                    if (!confirm('⚠️ ¿Seguro que querés eliminar este usuario? Esta acción es permanente.')) {
                        return;
                    }

                    button.disabled = true;
                    showUserManagementStatus('Eliminando usuario...', 'info');

                    const result = await deleteUser(userId);

                    showUserManagementStatus(result.message || 'Usuario eliminado correctamente', 'success', true);
                    await loadUserList();
                    await loadUserStats();
                }
            } catch (error) {
                console.error('Error handling user action:', error);
                showUserManagementStatus(error.message, 'error');
            } finally {
                button.disabled = false;
            }
        }

        async function loadUserStats() {
            try {
                const response = await fetch('/api/admin/users');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al cargar estadísticas de usuarios');
                }

                displayUserStats(data);
            } catch (error) {
                console.error('Error loading user stats:', error);
                document.getElementById('userStatsContainer').innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--danger-color);">
                        Error al cargar estadísticas de usuarios: ${error.message}
                    </div>
                `;
            }
        }

        function displayUserStats(data) {
            const statsContainer = document.getElementById('userStatsContainer');
            const stats = data.stats;

            statsContainer.innerHTML = `
                <div class="dashboard-grid" style="margin-bottom: 2rem;">
                    <div class="stat-card">
                        <h3>Total Usuarios</h3>
                        <div class="value">${stats.total}</div>
                        <div class="subtitle">Registrados</div>
                    </div>
                    <div class="stat-card success">
                        <h3>Hoy</h3>
                        <div class="value">${stats.today}</div>
                        <div class="subtitle">Nuevos usuarios</div>
                    </div>
                    <div class="stat-card">
                        <h3>Esta Semana</h3>
                        <div class="value">${stats.thisWeek}</div>
                        <div class="subtitle">Últimos 7 días</div>
                    </div>
                    <div class="stat-card">
                        <h3>Este Mes</h3>
                        <div class="value">${stats.thisMonth}</div>
                        <div class="subtitle">Últimos 30 días</div>
                    </div>
                    <div class="stat-card warning">
                        <h3>Administradores</h3>
                        <div class="value">${stats.byRole.admin}</div>
                        <div class="subtitle">Rol admin</div>
                    </div>
                    <div class="stat-card">
                        <h3>Usuarios Regulares</h3>
                        <div class="value">${stats.byRole.regular}</div>
                        <div class="subtitle">Sin privilegios</div>
                    </div>
                </div>
            `;

            // Display recent users table
            const tbody = document.getElementById('usersTableBody');
            let tableHTML = '';

            if (data.recentUsers && data.recentUsers.length > 0) {
                data.recentUsers.forEach(user => {
                    const roleBadge = user.role === 'admin'
                        ? '<span style="background: var(--warning-color); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">ADMIN</span>'
                        : '<span style="background: var(--primary-color); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">USER</span>';

                    const createdDate = new Date(user.createdAt).toLocaleString('es-UY');
                    const lastLogin = user.lastLogin
                        ? new Date(user.lastLogin).toLocaleString('es-UY')
                        : 'Nunca';

                    tableHTML += `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 1rem;">${user.email}</td>
                            <td style="padding: 1rem;">${user.name || '-'}</td>
                            <td style="padding: 1rem;">${roleBadge}</td>
                            <td style="padding: 1rem;">${createdDate}</td>
                            <td style="padding: 1rem;">${lastLogin}</td>
                        </tr>
                    `;
                });
            } else {
                tableHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--text-secondary);">No hay usuarios registrados</td></tr>';
            }

            tbody.innerHTML = tableHTML;
            document.getElementById('recentUsersContainer').style.display = 'block';
        }

        // Forum Management Functions
        async function loadForumStats() {
            try {
                const response = await fetch('/api/admin/forum/stats');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al cargar estadísticas del foro');
                }

                displayForumStats(data.stats);
            } catch (error) {
                console.error('Error loading forum stats:', error);
                document.getElementById('forumStatsContainer').innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--danger-color);">
                        Error al cargar estadísticas del foro: ${error.message}
                    </div>
                `;
            }
        }

        function displayForumStats(stats) {
            const container = document.getElementById('forumStatsContainer');

            container.innerHTML = `
                <div class="dashboard-grid" style="margin-bottom: 2rem;">
                    <div class="stat-card">
                        <h3>Total Threads</h3>
                        <div class="value">${stats.overview.totalThreads}</div>
                        <div class="subtitle">${stats.overview.activeThreads} activos</div>
                    </div>
                    <div class="stat-card">
                        <h3>Total Comentarios</h3>
                        <div class="value">${stats.overview.totalComments}</div>
                        <div class="subtitle">En todos los threads</div>
                    </div>
                    <div class="stat-card success">
                        <h3>Hoy</h3>
                        <div class="value">${stats.today.total}</div>
                        <div class="subtitle">${stats.today.threads} threads, ${stats.today.comments} comentarios</div>
                    </div>
                    <div class="stat-card">
                        <h3>Esta Semana</h3>
                        <div class="value">${stats.thisWeek.total}</div>
                        <div class="subtitle">${stats.thisWeek.threads} threads, ${stats.thisWeek.comments} comentarios</div>
                    </div>
                    <div class="stat-card">
                        <h3>Este Mes</h3>
                        <div class="value">${stats.thisMonth.total}</div>
                        <div class="subtitle">${stats.thisMonth.threads} threads, ${stats.thisMonth.comments} comentarios</div>
                    </div>
                    <div class="stat-card">
                        <h3>Total Likes</h3>
                        <div class="value">${stats.overview.totalLikes}</div>
                        <div class="subtitle">En todos los threads</div>
                    </div>
                </div>
            `;

            // Display popular threads
            let popularHTML = '';
            if (stats.popularThreads.length > 0) {
                popularHTML = stats.popularThreads.map(thread => {
                    const authorName = thread.author?.name || thread.author?.email || 'Usuario';
                    const createdDate = thread.createdAt
                        ? new Date(thread.createdAt).toLocaleDateString('es-UY')
                        : 'Fecha desconocida';
                    return `
                        <div class="forum-top-item">
                            <strong>${thread.title}</strong>
                            <small>Por ${authorName} · ${createdDate}</small>
                            <div class="forum-top-meta">
                                <span>👍 ${thread.likesCount || 0}</span>
                                <span>💬 ${thread.commentsCount || 0}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                popularHTML = '<div class="forum-top-empty">No hay threads aún</div>';
            }
            document.getElementById('popularThreadsContainer').innerHTML = popularHTML;

            // Display top thread authors
            let threadAuthorsHTML = '';
            if (stats.topThreadAuthors.length > 0) {
                threadAuthorsHTML = stats.topThreadAuthors.map((author, idx) => `
                    <div class="forum-top-item forum-top-item--row">
                        <span><strong>${idx + 1}.</strong> ${author.name || author.email || 'Usuario'}</span>
                        <span class="forum-top-pill">${author.threadCount || 0} threads</span>
                    </div>
                `).join('');
            } else {
                threadAuthorsHTML = '<div class="forum-top-empty">Sin datos</div>';
            }
            document.getElementById('topThreadAuthorsContainer').innerHTML = threadAuthorsHTML;

            // Display top comment authors
            let commentAuthorsHTML = '';
            if (stats.topCommentAuthors.length > 0) {
                commentAuthorsHTML = stats.topCommentAuthors.map((author, idx) => `
                    <div class="forum-top-item forum-top-item--row">
                        <span><strong>${idx + 1}.</strong> ${author.name || author.email || 'Usuario'}</span>
                        <span class="forum-top-pill">${author.commentCount || 0} comentarios</span>
                    </div>
                `).join('');
            } else {
                commentAuthorsHTML = '<div class="forum-top-empty">Sin datos</div>';
            }
            document.getElementById('topCommentAuthorsContainer').innerHTML = commentAuthorsHTML;

            // Show containers
            document.getElementById('forumSettingsContainer').style.display = 'block';
            document.getElementById('forumTopContent').style.display = 'block';
        }

        async function loadForumSettings() {
            try {
                const response = await fetch('/api/admin/forum/settings');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al cargar configuración');
                }

                const settings = data.settings;
                document.getElementById('postCooldownMinutes').value = settings.postCooldownMinutes;
                document.getElementById('maxCommentsPerDay').value = settings.maxCommentsPerDay;
                document.getElementById('allowImages').checked = settings.allowImages;
                document.getElementById('allowLinks').checked = settings.allowLinks;
                document.getElementById('maxImagesPerPost').value = settings.maxImagesPerPost;
            } catch (error) {
                console.error('Error loading forum settings:', error);
                const statusDiv = document.getElementById('forumSettingsStatus');
                statusDiv.className = 'status-message error';
                statusDiv.textContent = `Error: ${error.message}`;
            }
        }

        async function saveForumSettings() {
            try {
                const settings = {
                    postCooldownMinutes: parseInt(document.getElementById('postCooldownMinutes').value),
                    maxCommentsPerDay: parseInt(document.getElementById('maxCommentsPerDay').value),
                    allowImages: document.getElementById('allowImages').checked,
                    allowLinks: document.getElementById('allowLinks').checked,
                    maxImagesPerPost: parseInt(document.getElementById('maxImagesPerPost').value)
                };

                const response = await fetch('/api/admin/forum/settings', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(settings)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al guardar configuración');
                }

                const statusDiv = document.getElementById('forumSettingsStatus');
                statusDiv.className = 'status-message success';
                statusDiv.textContent = '✅ Configuración guardada correctamente';

                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 3000);
            } catch (error) {
                console.error('Error saving forum settings:', error);
                const statusDiv = document.getElementById('forumSettingsStatus');
                statusDiv.className = 'status-message error';
                statusDiv.textContent = `❌ Error: ${error.message}`;
            }
        }

        // Page Visits Functions
        async function loadVisitStats() {
            try {
                const response = await fetch('/api/admin/visits/stats');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al cargar estadísticas de visitas');
                }

                displayVisitStats(data);
            } catch (error) {
                console.error('Error loading visit stats:', error);
                document.getElementById('visitStatsContainer').innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--danger-color);">
                        Error al cargar estadísticas de visitas: ${error.message}
                    </div>
                `;
            }
        }

        function displayVisitStats(data) {
            const container = document.getElementById('visitStatsContainer');

            container.innerHTML = `
                <div class="dashboard-grid" style="margin-bottom: 2rem;">
                    <div class="stat-card">
                        <h3>Total Visitas</h3>
                        <div class="value">${data.overall.total || 0}</div>
                        <div class="subtitle">Todas las páginas</div>
                    </div>
                    <div class="stat-card success">
                        <h3>Visitas Hoy</h3>
                        <div class="value">${data.today.total || 0}</div>
                        <div class="subtitle">Últimas 24 horas</div>
                    </div>
                    <div class="stat-card">
                        <h3>Usuarios Autenticados</h3>
                        <div class="value">${data.overall.authenticated || 0}</div>
                        <div class="subtitle">${data.overall.uniqueAuthenticatedUsers || 0} únicos</div>
                    </div>
                    <div class="stat-card">
                        <h3>Visitas Anónimas</h3>
                        <div class="value">${data.overall.anonymous || 0}</div>
                        <div class="subtitle">${data.overall.uniqueAnonymousIPs || 0} IPs únicas</div>
                    </div>
                </div>
            `;
        }

        async function loadTopPages() {
            try {
                const response = await fetch('/api/admin/visits/pages?limit=10');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al cargar páginas');
                }

                displayTopPages(data.pages);
            } catch (error) {
                console.error('Error loading top pages:', error);
            }
        }

        function displayTopPages(pages) {
            const tbody = document.getElementById('topPagesTableBody');
            let tableHTML = '';

            if (pages && pages.length > 0) {
                pages.forEach(page => {
                    tableHTML += `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 1rem; font-family: monospace;">${page.page}</td>
                            <td style="padding: 1rem; text-align: center; font-weight: 500;">${page.total}</td>
                            <td style="padding: 1rem; text-align: center;">
                                <span style="color: var(--success-color);">${page.authenticated}</span>
                            </td>
                            <td style="padding: 1rem; text-align: center;">
                                <span style="color: var(--text-secondary);">${page.anonymous}</span>
                            </td>
                            <td style="padding: 1rem; text-align: center; font-weight: 500;">${page.uniqueUsers}</td>
                        </tr>
                    `;
                });
            } else {
                tableHTML = '<tr><td colspan="5" style="padding: 2rem; text-align: center; color: var(--text-secondary);">No hay datos de visitas aún</td></tr>';
            }

            tbody.innerHTML = tableHTML;
            document.getElementById('topPagesContainer').style.display = 'block';
        }

        async function loadRecentVisits() {
            try {
                const response = await fetch('/api/admin/visits/recent?limit=5');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al cargar visitas recientes');
                }

                displayRecentVisits(data.visits);
            } catch (error) {
                console.error('Error loading recent visits:', error);
            }
        }

        function displayRecentVisits(visits) {
            const tbody = document.getElementById('recentVisitsTableBody');
            let tableHTML = '';

            if (visits && visits.length > 0) {
                visits.forEach(visit => {
                    const userInfo = visit.user
                        ? `<span style="color: var(--success-color);">👤 ${visit.user.email || visit.user.name}</span>`
                        : `<span style="color: var(--text-secondary);">🌐 ${visit.ipAddress}</span>`;

                    const timestamp = new Date(visit.timestamp).toLocaleString('es-UY');

                    tableHTML += `
                        <tr style="border-bottom: 1px solid var(--border-color);">
                            <td style="padding: 1rem; font-family: monospace; font-size: 0.875rem;">${visit.page}</td>
                            <td style="padding: 1rem;">${userInfo}</td>
                            <td style="padding: 1rem; color: var(--text-secondary); font-size: 0.875rem;">${timestamp}</td>
                        </tr>
                    `;
                });
            } else {
                tableHTML = '<tr><td colspan="3" style="padding: 2rem; text-align: center; color: var(--text-secondary);">No hay visitas registradas</td></tr>';
            }

            tbody.innerHTML = tableHTML;
            document.getElementById('recentVisitsContainer').style.display = 'block';
        }

        async function loadAllVisits(limit = 500) {
            const status = document.getElementById('allVisitsStatus');
            if (status) {
                status.className = 'status-message';
                status.textContent = 'Cargando historial de visitas...';
            }

            try {
                const response = await fetch(`/api/admin/visits/recent?limit=${limit}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al cargar historial de visitas');
                }

                const tbody = document.getElementById('allVisitsTableBody');
                if (!tbody) return;

                if (!data.visits || data.visits.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="3" style="padding: 1.5rem; text-align: center; color: var(--text-secondary);">Sin visitas registradas</td></tr>';
                } else {
                    tbody.innerHTML = data.visits.map(visit => {
                        const userInfo = visit.user
                            ? `<span style="color: var(--success-color);">👤 ${visit.user.email || visit.user.name}</span>`
                            : `<span style="color: var(--text-secondary);">🌐 ${visit.ipAddress}</span>`;

                        const timestamp = new Date(visit.timestamp).toLocaleString('es-UY');

                        return `
                            <tr style="border-bottom: 1px solid var(--border-color);">
                                <td style="padding: 0.8rem 1rem; font-family: monospace; font-size: 0.85rem;">${visit.page}</td>
                                <td style="padding: 0.8rem 1rem;">${userInfo}</td>
                                <td style="padding: 0.8rem 1rem; color: var(--text-secondary); font-size: 0.85rem;">${timestamp}</td>
                            </tr>
                        `;
                    }).join('');
                }

                if (status) {
                    status.className = 'status-message success';
                    status.textContent = `Historial actualizado. Total: ${data.visits?.length || 0} visitas.`;
                }
            } catch (error) {
                console.error('Error loading all visits:', error);
                if (status) {
                    status.className = 'status-message error';
                    status.textContent = `Error al cargar visitas: ${error.message}`;
                }
            }
        }

        function openAllVisitsModal() {
            const modal = document.getElementById('allVisitsModal');
            if (!modal) return;
            modal.classList.add('active');
            loadAllVisits();
        }

        function closeAllVisitsModal() {
            const modal = document.getElementById('allVisitsModal');
            if (!modal) return;
            modal.classList.remove('active');
        }

        async function deleteVisits(scope) {
            const status = document.getElementById('allVisitsStatus');
            const confirmMessage = scope === 'all'
                ? '⚠️ Esto eliminará TODAS las visitas registradas. ¿Continuar?'
                : '¿Eliminar las últimas 50 visitas registradas?';

            if (!confirm(confirmMessage)) return;

            if (status) {
                status.className = 'status-message';
                status.textContent = 'Eliminando visitas...';
            }

            try {
                const response = await fetch('/api/admin/visits/purge', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ scope })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'No se pudieron eliminar las visitas');
                }

                if (status) {
                    status.className = 'status-message success';
                    status.textContent = data.message || 'Visitas eliminadas correctamente.';
                }

                await loadAllVisits();
                await loadRecentVisits();
                await loadVisitStats();
                await loadTopPages();
            } catch (error) {
                console.error('Error deleting visits:', error);
                if (status) {
                    status.className = 'status-message error';
                    status.textContent = `Error al eliminar visitas: ${error.message}`;
                }
            }
        }

        window.openAllVisitsModal = openAllVisitsModal;
        window.closeAllVisitsModal = closeAllVisitsModal;
        window.loadAllVisits = loadAllVisits;
        window.deleteVisits = deleteVisits;

        // Maintenance Mode Functions
        async function loadMaintenanceSettings() {
            try {
                const response = await fetch('/api/admin/system/settings');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al cargar configuración de mantenimiento');
                }

                displayMaintenanceSettings(data.settings);
            } catch (error) {
                console.error('Error loading maintenance settings:', error);
                document.getElementById('maintenanceSettingsContainer').innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--danger-color);">
                        Error al cargar configuración de mantenimiento: ${error.message}
                    </div>
                `;
            }
        }

        function displayMaintenanceSettings(settings) {
            // Update toggle states
            document.getElementById('toggle-centinel').checked = settings.maintenanceMode.centinel || false;
            document.getElementById('toggle-surlink').checked = settings.maintenanceMode.surlink || false;
            document.getElementById('toggle-forum').checked = settings.maintenanceMode.forum || false;
            document.getElementById('toggle-auth').checked = settings.maintenanceMode.auth || false;

            // Hide loading, show toggles
            document.getElementById('maintenanceSettingsContainer').style.display = 'none';
            document.getElementById('maintenanceToggles').style.display = 'block';
        }

        async function toggleMaintenance(platform) {
            const statusDiv = document.getElementById('maintenanceStatus');
            const checkbox = document.getElementById(`toggle-${platform}`);
            const isEnabled = checkbox.checked;

            try {
                statusDiv.textContent = `Actualizando modo mantenimiento para ${platform}...`;
                statusDiv.className = 'status-message';

                const response = await fetch('/api/admin/system/settings', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        maintenanceMode: {
                            [platform]: isEnabled
                        }
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al actualizar');
                }

                statusDiv.textContent = `✅ Modo mantenimiento ${isEnabled ? 'activado' : 'desactivado'} para ${platform}`;
                statusDiv.className = 'status-message success';

                // Show warning for auth
                if (platform === 'auth' && isEnabled) {
                    setTimeout(() => {
                        statusDiv.textContent = '⚠️ ADVERTENCIA: Login/registro desactivado. Solo admins pueden acceder vía Auth0 en /admin';
                        statusDiv.className = 'status-message';
                        statusDiv.style.background = 'rgba(245, 124, 0, 0.1)';
                        statusDiv.style.borderLeftColor = 'var(--warning-color)';
                        statusDiv.style.color = 'var(--warning-color)';
                    }, 2000);
                }

                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 5000);
            } catch (error) {
                console.error('Error toggling maintenance:', error);
                checkbox.checked = !isEnabled; // Revert checkbox
                statusDiv.textContent = `❌ Error: ${error.message}`;
                statusDiv.className = 'status-message error';
            }
        }

        async function triggerScheduledCleanup() {
            const statusDiv = document.getElementById('scheduledCleanupStatus');
            const button = document.getElementById('runScheduledCleanupBtn');

            if (!statusDiv || !button) return;

            if (!confirm('¿Ejecutar ahora la limpieza programada del sistema? Este proceso eliminará incidentes pendientes antiguos y archivos huérfanos.')) {
                return;
            }

            button.disabled = true;
            statusDiv.textContent = 'Ejecutando limpieza programada...';
            statusDiv.className = 'status-message';

            try {
                const response = await fetch('/api/admin/maintenance/run-cleanup', {
                    method: 'POST'
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al ejecutar limpieza programada');
                }

                const summary = data.summary || {};
                statusDiv.className = 'status-message success';
                statusDiv.textContent = `✅ Limpieza completada. Incidentes pendientes eliminados: ${summary.removedPendingIncidents || 0}. Validaciones archivadas: ${summary.validationsArchived || 0}. Archivos huérfanos eliminados: ${summary.orphanedFilesDeleted || 0}.`;

                // Refresh dashboard stats after cleanup
                loadStats();
            } catch (error) {
                console.error('Error running scheduled cleanup:', error);
                statusDiv.className = 'status-message error';
                statusDiv.textContent = `❌ Error al ejecutar limpieza: ${error.message}`;
            } finally {
                button.disabled = false;
                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 8000);
            }
        }

        async function purgeSurlinkListings() {
            const categorySelect = document.getElementById('surlinkCleanupCategory');
            const button = document.getElementById('surlinkCleanupBtn');
            const statusDiv = document.getElementById('surlinkCleanupStatus');

            if (!categorySelect || !button || !statusDiv) return;

            const category = categorySelect.value;
            const labels = {
                casas: 'Casas',
                autos: 'Autos',
                academy: 'Academy',
                financial: 'Financial',
                all: 'todas las categorías'
            };

            const confirmationLabel = labels[category] || category;
            const confirmMessage = category === 'all'
                ? '⚠️ ¿Eliminar TODOS los listados de Surlink? Esta acción no se puede deshacer.'
                : `¿Eliminar todos los listados de la categoría ${confirmationLabel}? Esta acción no se puede deshacer.`;

            if (!confirm(confirmMessage)) {
                return;
            }

            button.disabled = true;
            categorySelect.disabled = true;
            statusDiv.textContent = 'Eliminando listados de Surlink...';
            statusDiv.className = 'status-message';

            try {
                const response = await fetch('/api/admin/surlink/purge', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ category })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al limpiar Surlink');
                }

                statusDiv.className = 'status-message success';
                statusDiv.textContent = `✅ Eliminados ${data.deleted || 0} listados de ${labels[data.category] || data.category}`;

                // Refresh stats to reflect new totals
                loadStats();
            } catch (error) {
                console.error('Error purging Surlink listings:', error);
                statusDiv.className = 'status-message error';
                statusDiv.textContent = `❌ Error al limpiar Surlink: ${error.message}`;
            } finally {
                button.disabled = false;
                categorySelect.disabled = false;
                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 8000);
            }
        }

        // Cron Jobs Management Functions
        async function loadCronSettings() {
            try {
                const response = await fetch('/api/admin/cron/settings');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al cargar configuración de cron jobs');
                }

                // Set enabled checkbox
                document.getElementById('cronEnabled').checked = data.cronEnabled || false;

                // Set cron schedules
                const schedules = data.cronSchedules || {};
                document.getElementById('cronNewsIngestion').value = schedules.newsIngestion || '0 */6 * * *';
                document.getElementById('cronCleanup').value = schedules.cleanup || '0 2 * * *';
                document.getElementById('cronHeatmapUpdate').value = schedules.heatmapUpdate || '0 * * * *';

                // Show panel
                document.getElementById('cronSettingsContainer').style.display = 'none';
                document.getElementById('cronSettingsPanel').style.display = 'block';
            } catch (error) {
                console.error('Error loading cron settings:', error);
                document.getElementById('cronSettingsContainer').innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--danger-color);">
                        Error al cargar configuración de cron jobs: ${error.message}
                    </div>
                `;
            }
        }

        async function saveCronSettings() {
            const statusDiv = document.getElementById('cronSettingsStatus');

            try {
                const settings = {
                    cronEnabled: document.getElementById('cronEnabled').checked,
                    cronSchedules: {
                        newsIngestion: document.getElementById('cronNewsIngestion').value.trim(),
                        cleanup: document.getElementById('cronCleanup').value.trim(),
                        heatmapUpdate: document.getElementById('cronHeatmapUpdate').value.trim()
                    }
                };

                // Validate that cron expressions are not empty
                if (!settings.cronSchedules.newsIngestion ||
                    !settings.cronSchedules.cleanup ||
                    !settings.cronSchedules.heatmapUpdate) {
                    throw new Error('Todas las expresiones cron son obligatorias');
                }

                statusDiv.textContent = 'Guardando configuración...';
                statusDiv.className = 'status-message';

                const response = await fetch('/api/admin/cron/settings', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(settings)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al guardar configuración');
                }

                statusDiv.className = 'status-message success';
                statusDiv.textContent = '✅ Configuración de cron jobs guardada correctamente. Los trabajos se recargarán automáticamente.';

                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 5000);
            } catch (error) {
                console.error('Error saving cron settings:', error);
                statusDiv.className = 'status-message error';
                statusDiv.textContent = `❌ Error: ${error.message}`;
            }
        }

        async function runCronJobManually(jobName) {
            const statusDiv = document.getElementById('cronSettingsStatus');

            const jobLabels = {
                newsIngestion: 'Ingesta de Noticias',
                cleanup: 'Limpieza del Sistema',
                heatmapUpdate: 'Actualización de Heatmap'
            };

            const label = jobLabels[jobName] || jobName;

            if (!confirm(`¿Ejecutar ahora el trabajo "${label}"?`)) {
                return;
            }

            try {
                statusDiv.textContent = `Ejecutando ${label}...`;
                statusDiv.className = 'status-message';

                const response = await fetch(`/api/admin/cron/${jobName}/run`, {
                    method: 'POST'
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || `Error al ejecutar ${label}`);
                }

                statusDiv.className = 'status-message success';

                // Custom messages based on job type
                if (jobName === 'cleanup' && data.result) {
                    const summary = data.result;
                    statusDiv.textContent = `✅ ${label} completado. Incidentes eliminados: ${summary.removedPendingIncidents || 0}, Validaciones archivadas: ${summary.validationsArchived || 0}, Archivos huérfanos: ${summary.orphanedFilesDeleted || 0}.`;
                } else if (jobName === 'newsIngestion') {
                    statusDiv.textContent = `✅ ${label} iniciado en segundo plano. Revisa los logs del servidor para ver el progreso.`;
                } else {
                    statusDiv.textContent = `✅ ${label} ejecutado correctamente.`;
                }

                // Reload stats after job execution
                setTimeout(() => {
                    loadStats();
                }, 2000);

                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 8000);
            } catch (error) {
                console.error(`Error running cron job ${jobName}:`, error);
                statusDiv.className = 'status-message error';
                statusDiv.textContent = `❌ Error al ejecutar ${label}: ${error.message}`;
            }
        }

        // Pricing Settings Functions
        async function loadPricingSettings() {
            try {
                const response = await fetch('/api/admin/pricing/settings');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al cargar configuración');
                }

                const settings = data.settings;
                document.getElementById('usdToUyu').value = settings.usdToUyu;
                document.getElementById('premiumMonthly').value = settings.premiumMonthly;
                document.getElementById('premiumYearly').value = settings.premiumYearly;
                document.getElementById('proMonthly').value = settings.proMonthly;
                document.getElementById('proYearly').value = settings.proYearly;
            } catch (error) {
                console.error('Error loading pricing settings:', error);
                const statusDiv = document.getElementById('pricingSettingsStatus');
                statusDiv.className = 'status-message error';
                statusDiv.textContent = `Error: ${error.message}`;
            }
        }

        async function savePricingSettings() {
            try {
                const settings = {
                    usdToUyu: parseFloat(document.getElementById('usdToUyu').value),
                    premiumMonthly: parseFloat(document.getElementById('premiumMonthly').value),
                    premiumYearly: parseFloat(document.getElementById('premiumYearly').value),
                    proMonthly: parseFloat(document.getElementById('proMonthly').value),
                    proYearly: parseFloat(document.getElementById('proYearly').value)
                };

                const response = await fetch('/api/admin/pricing/settings', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(settings)
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al guardar configuración');
                }

                const statusDiv = document.getElementById('pricingSettingsStatus');
                statusDiv.className = 'status-message success';
                statusDiv.textContent = '✅ Precios guardados correctamente';

                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 3000);
            } catch (error) {
                console.error('Error saving pricing settings:', error);
                const statusDiv = document.getElementById('pricingSettingsStatus');
                statusDiv.className = 'status-message error';
                statusDiv.textContent = `❌ Error: ${error.message}`;
            }
        }
