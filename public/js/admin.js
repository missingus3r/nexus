        document.addEventListener('DOMContentLoaded', () => {
            loadStats();
            loadUserStats();
            loadSubscriptionStats();
            loadForumStats();
            loadForumSettings();
            loadPricingSettings();
            loadVisitStats();
            loadTopPages();
            loadRecentVisits();
            loadMaintenanceSettings();
            setupUserManagementHandlers();
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

        function toggleSurlinkButtons(disabled) {
            ['surlinkCasasBtn', 'surlinkAutosBtn', 'surlinkCleanupBtn'].forEach(id => {
                const btn = document.getElementById(id);
                if (btn) {
                    btn.disabled = disabled;
                }
            });
        }

        function showSurlinkStatus(message, type = 'info') {
            const statusEl = document.getElementById('surlinkStatus');
            if (!statusEl) return;

            statusEl.textContent = message;
            statusEl.className = `status-message ${type}`;
            statusEl.style.display = 'block';

            if (type === 'success' || type === 'info') {
                setTimeout(() => {
                    statusEl.style.display = 'none';
                }, 8000);
            }
        }

        async function scheduleSurlinkIngest(category) {
            const labels = {
                casas: 'Surlink Casas',
                autos: 'Surlink Autos'
            };

            const label = labels[category] || 'Surlink';
            const confirmMsg = `¿Programar el scrapping automático para ${label}? Esta acción solicitará al backend preparar el proceso.`;

            if (!confirm(confirmMsg)) return;

            toggleSurlinkButtons(true);
            showSurlinkStatus(`Programando scrapping para ${label}...`, 'info');

            try {
                const response = await fetch('/api/admin/surlink/schedule', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ category })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al programar el scrapping');
                }

                let statusMessage = data.message || `Scrapping programado para ${label}.`;
                const extra = [];

                if (typeof data.processedSources === 'number') {
                    extra.push(`Fuentes procesadas: ${data.processedSources}`);
                }
                if (typeof data.scrapedOffers === 'number') {
                    extra.push(`Ofertas analizadas: ${data.scrapedOffers}`);
                }
                if (typeof data.inserted === 'number' || typeof data.updated === 'number') {
                    extra.push(`Ingresadas: ${data.inserted ?? 0}, Actualizadas: ${data.updated ?? 0}`);
                }
                if (data.implemented === false) {
                    extra.push('Funcionalidad en preparación');
                }

                if (extra.length) {
                    statusMessage = `${statusMessage}\n${extra.join(' • ')}`;
                }

                showSurlinkStatus(statusMessage, 'success');
            } catch (error) {
                console.error('Error scheduling Surlink ingest:', error);
                showSurlinkStatus(error.message, 'error');
            } finally {
                toggleSurlinkButtons(false);
            }
        }

        async function cleanupSurlinkListings() {
            const confirmMsg = '¿Depurar listados caducados o inactivos de Surlink?\n\nEsta acción archivará publicaciones vencidas.';

            if (!confirm(confirmMsg)) return;

            toggleSurlinkButtons(true);
            showSurlinkStatus('Iniciando limpieza de listados caducados...', 'info');

            try {
                const response = await fetch('/api/admin/surlink/cleanup', {
                    method: 'POST'
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al depurar listados');
                }

                const archived = typeof data.archived === 'number'
                    ? ` Listados archivados: ${data.archived}.`
                    : '';

                showSurlinkStatus((data.message || 'Limpieza completada.') + archived, 'success');
            } catch (error) {
                console.error('Error cleaning up Surlink listings:', error);
                showSurlinkStatus(error.message, 'error');
            } finally {
                toggleSurlinkButtons(false);
            }
        }

        // User Management Functions
        const userManagementState = {
            loaded: false,
            loading: false,
            search: ''
        };

        function setupUserManagementHandlers() {
            const manageBtn = document.getElementById('manageUsersBtn');
            const refreshBtn = document.getElementById('refreshUserListBtn');
            const searchBtn = document.getElementById('userSearchBtn');
            const searchInput = document.getElementById('userSearchInput');
            const tableBody = document.getElementById('userManagementTableBody');

            if (manageBtn) {
                manageBtn.addEventListener('click', () => {
                    toggleUserManagement();
                });
            }

            if (refreshBtn) {
                refreshBtn.addEventListener('click', () => {
                    loadUserList(userManagementState.search);
                });
            }

            if (searchBtn && searchInput) {
                searchBtn.addEventListener('click', () => {
                    userManagementState.search = searchInput.value.trim();
                    loadUserList(userManagementState.search);
                });

                searchInput.addEventListener('keypress', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        userManagementState.search = searchInput.value.trim();
                        loadUserList(userManagementState.search);
                    }
                });
            }

            if (tableBody) {
                tableBody.addEventListener('click', handleUserManagementAction);
            }
        }

        function toggleUserManagement() {
            const container = document.getElementById('userManagementContainer');
            const manageBtn = document.getElementById('manageUsersBtn');

            if (!container || !manageBtn) {
                return;
            }

            const isHidden = container.dataset.visible !== 'true';

            if (isHidden) {
                container.style.display = 'block';
                container.dataset.visible = 'true';
                manageBtn.textContent = 'Ocultar gestión de usuarios';

                if (!userManagementState.loaded && !userManagementState.loading) {
                    loadUserList(userManagementState.search);
                }
            } else {
                container.style.display = 'none';
                container.dataset.visible = 'false';
                manageBtn.textContent = 'Gestionar usuarios';
            }
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

        async function loadUserList(searchTerm = '') {
            const tableBody = document.getElementById('userManagementTableBody');

            if (!tableBody) {
                return;
            }

            userManagementState.loading = true;
            showUserManagementStatus('Cargando usuarios...', 'info');

            try {
                const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
                const response = await fetch(`/api/admin/users/list${query}`);
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Error al obtener usuarios');
                }

                userManagementState.loaded = true;

                renderUserList(data.users || []);
                showUserManagementStatus(`Usuarios cargados (${data.count || 0})`, 'success', true);
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
                    await loadUserList(userManagementState.search);
                    await loadUserStats();
                } else if (action === 'delete') {
                    if (!confirm('⚠️ ¿Seguro que querés eliminar este usuario? Esta acción es permanente.')) {
                        return;
                    }

                    button.disabled = true;
                    showUserManagementStatus('Eliminando usuario...', 'info');

                    const result = await deleteUser(userId);

                    showUserManagementStatus(result.message || 'Usuario eliminado correctamente', 'success', true);
                    await loadUserList(userManagementState.search);
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

        // Subscription Management Functions
        async function loadSubscriptionStats() {
            try {
                const response = await fetch('/api/admin/subscriptions/stats');
                const stats = await response.json();

                if (!response.ok) {
                    throw new Error(stats.error || 'Error al cargar estadísticas de suscripciones');
                }

                displaySubscriptionStats(stats);
            } catch (error) {
                console.error('Error loading subscription stats:', error);
                document.getElementById('subscriptionStatsContainer').innerHTML = `
                    <div style="padding: 1rem; color: var(--danger-color);">
                        <p>Error al cargar estadísticas: ${error.message}</p>
                    </div>
                `;
            }
        }

        function displaySubscriptionStats(stats) {
            const container = document.getElementById('subscriptionStatsContainer');

            const planLabels = {
                'free': 'Free',
                'premium': 'Premium',
                'pro': 'Pro'
            };

            container.innerHTML = `
                <div class="dashboard-grid">
                    <div class="stat-card success">
                        <h3>Suscripciones Activas</h3>
                        <div class="value">${stats.summary.totalActive || 0}</div>
                        <div class="subtitle">Usuarios con plan activo</div>
                    </div>

                    <div class="stat-card">
                        <h3>MRR (Monthly Recurring Revenue)</h3>
                        <div class="value">$${(stats.revenue.mrr || 0).toFixed(0)}</div>
                        <div class="subtitle">Ingresos mensuales recurrentes (USD)</div>
                    </div>

                    <div class="stat-card">
                        <h3>ARR (Annual Recurring Revenue)</h3>
                        <div class="value">$${(stats.revenue.arr || 0).toFixed(0)}</div>
                        <div class="subtitle">Ingresos anuales proyectados (USD)</div>
                    </div>

                    <div class="stat-card success">
                        <h3>Nuevas (30 días)</h3>
                        <div class="value">${stats.summary.newLast30Days || 0}</div>
                        <div class="subtitle">Suscripciones nuevas</div>
                    </div>

                    <div class="stat-card warning">
                        <h3>Por Vencer (7 días)</h3>
                        <div class="value">${stats.summary.expiringSoon || 0}</div>
                        <div class="subtitle">Requieren renovación</div>
                    </div>

                    <div class="stat-card danger">
                        <h3>Canceladas (30 días)</h3>
                        <div class="value">${stats.summary.cancelledLast30Days || 0}</div>
                        <div class="subtitle">Churn Rate: ${stats.summary.churnRate || 0}%</div>
                    </div>
                </div>

                <div style="margin-top: 2rem;">
                    <h3 style="margin-bottom: 1rem;">Distribución por Plan</h3>
                    <div class="dashboard-grid">
                        ${stats.byPlan.map(plan => `
                            <div class="stat-card">
                                <h3>${planLabels[plan.plan] || plan.plan}</h3>
                                <div class="value" style="font-size: 2rem;">${plan.count}</div>
                                <div class="subtitle">$${(plan.revenue || 0).toFixed(0)} USD/mes</div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <div style="margin-top: 2rem;">
                    <h3 style="margin-bottom: 1rem;">Por Tipo</h3>
                    <div style="display: grid; grid-template-columns: 1fr; gap: 1rem;">
                        <div class="stat-card">
                            <h3>Personales</h3>
                            <div class="value" style="font-size: 2rem;">${stats.byType.personal || 0}</div>
                        </div>
                    </div>
                </div>
            `;

            // Display recent subscriptions
            displayRecentSubscriptions(stats.recentSubscriptions || []);

            // Initialize charts
            initializeCharts(stats);
        }

        function displayRecentSubscriptions(subscriptions) {
            const container = document.getElementById('recentSubscriptionsContainer');

            if (!subscriptions || subscriptions.length === 0) {
                container.innerHTML = '<p style="color: var(--text-secondary);">No hay suscripciones recientes</p>';
                return;
            }

            const planLabels = {
                'free': 'Free',
                'premium': 'Premium',
                'pro': 'Pro'
            };

            const statusLabels = {
                'active': { text: 'Activa', color: 'var(--success-color)' },
                'expired': { text: 'Expirada', color: 'var(--danger-color)' },
                'cancelled': { text: 'Cancelada', color: 'var(--text-secondary)' },
                'trial': { text: 'Prueba', color: 'var(--warning-color)' }
            };

            container.innerHTML = `
                <div style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: var(--background);">
                            <tr>
                                <th style="padding: 1rem; text-align: left;">Usuario</th>
                                <th style="padding: 1rem; text-align: left;">Plan</th>
                                <th style="padding: 1rem; text-align: left;">Estado</th>
                                <th style="padding: 1rem; text-align: right;">Precio</th>
                                <th style="padding: 1rem; text-align: left;">Vencimiento</th>
                                <th style="padding: 1rem; text-align: center;">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${subscriptions.map(sub => {
                                const status = statusLabels[sub.status] || { text: sub.status, color: 'var(--text-secondary)' };
                                const endDate = new Date(sub.endDate);
                                const isExpiringSoon = endDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

                                return `
                                    <tr style="border-bottom: 1px solid var(--background);">
                                        <td style="padding: 1rem;">
                                            <div style="font-weight: 500;">${sub.user.name || 'N/A'}</div>
                                            <div style="font-size: 0.75rem; color: var(--text-secondary);">${sub.user.email}</div>
                                        </td>
                                        <td style="padding: 1rem;">
                                            <span style="background: var(--primary-color); color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem;">
                                                ${planLabels[sub.plan] || sub.plan}
                                            </span>
                                        </td>
                                        <td style="padding: 1rem;">
                                            <span style="color: ${status.color}; font-weight: 500;">
                                                ${status.text}
                                            </span>
                                        </td>
                                        <td style="padding: 1rem; text-align: right; font-weight: 500;">
                                            ${sub.price.amount} ${sub.price.currency}
                                        </td>
                                        <td style="padding: 1rem;">
                                            <div style="color: ${isExpiringSoon && sub.status === 'active' ? 'var(--warning-color)' : 'var(--text-secondary)'};">
                                                ${endDate.toLocaleDateString('es-UY')}
                                            </div>
                                            ${isExpiringSoon && sub.status === 'active' ?
                                                '<div style="font-size: 0.75rem; color: var(--warning-color);">⚠️ Por vencer</div>'
                                                : ''}
                                        </td>
                                        <td style="padding: 1rem; text-align: center;">
                                            <button class="action-btn view" onclick="viewPaymentHistory('${sub.user.id}')" title="Ver historial de pagos">
                                                📜
                                            </button>
                                            ${sub.status === 'active' ? `
                                                <button class="action-btn renew" onclick="renewSubscription('${sub.id}')" title="Renovar">
                                                    🔄
                                                </button>
                                                <button class="action-btn cancel" onclick="cancelSubscription('${sub.id}')" title="Cancelar">
                                                    ✖
                                                </button>
                                            ` : ''}
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }

        // Initialize Chart.js charts
        let revenueChart = null;
        let planDistributionChart = null;

        function initializeCharts(stats) {
            // Destroy existing charts if they exist
            if (revenueChart) revenueChart.destroy();
            if (planDistributionChart) planDistributionChart.destroy();

            // Revenue Trend Chart
            const revenueCtx = document.getElementById('revenueChart');
            if (revenueCtx) {
                const last12Months = [];
                const now = new Date();
                for (let i = 11; i >= 0; i--) {
                    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
                    last12Months.push(date.toLocaleDateString('es-UY', { month: 'short', year: '2-digit' }));
                }

                revenueChart = new Chart(revenueCtx, {
                    type: 'line',
                    data: {
                        labels: last12Months,
                        datasets: [{
                            label: 'MRR (USD)',
                            data: stats.revenue.trend || Array(12).fill(0),
                            borderColor: 'rgb(99, 102, 241)',
                            backgroundColor: 'rgba(99, 102, 241, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top'
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    callback: function(value) {
                                        return '$' + value;
                                    }
                                }
                            }
                        }
                    }
                });
            }

            // Plan Distribution Chart
            const planCtx = document.getElementById('planDistributionChart');
            if (planCtx && stats.byPlan && stats.byPlan.length > 0) {
                const planLabels = {
                    'free': 'Free',
                    'premium': 'Premium',
                    'pro': 'Pro'
                };

                planDistributionChart = new Chart(planCtx, {
                    type: 'doughnut',
                    data: {
                        labels: stats.byPlan.map(p => planLabels[p.plan] || p.plan),
                        datasets: [{
                            data: stats.byPlan.map(p => p.count),
                            backgroundColor: [
                                'rgb(99, 102, 241)',
                                'rgb(139, 92, 246)',
                                'rgb(59, 130, 246)',
                                'rgb(16, 185, 129)',
                                'rgb(245, 158, 11)',
                                'rgb(239, 68, 68)'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right'
                            }
                        }
                    }
                });
            }
        }

        // Filter functionality
        async function applyFilters() {
            const status = document.getElementById('filterStatus').value;
            const plan = document.getElementById('filterPlan').value;
            const planType = document.getElementById('filterPlanType').value;

            try {
                const params = new URLSearchParams();
                if (status) params.append('status', status);
                if (plan) params.append('plan', plan);
                if (planType) params.append('planType', planType);

                const response = await fetch(`/admin/subscriptions?${params.toString()}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) throw new Error('Error al cargar suscripciones filtradas');

                const subscriptions = await response.json();
                displayRecentSubscriptions(subscriptions);
            } catch (error) {
                console.error('Error applying filters:', error);
                alert('Error al aplicar filtros: ' + error.message);
            }
        }

        function clearFilters() {
            document.getElementById('filterStatus').value = '';
            document.getElementById('filterPlan').value = '';
            document.getElementById('filterPlanType').value = '';
            loadSubscriptionStats();
        }

        // Export functionality
        async function exportSubscriptions(format) {
            try {
                const status = document.getElementById('filterStatus').value;
                const plan = document.getElementById('filterPlan').value;
                const planType = document.getElementById('filterPlanType').value;

                const params = new URLSearchParams();
                if (status) params.append('status', status);
                if (plan) params.append('plan', plan);
                if (planType) params.append('planType', planType);

                const url = `/admin/subscriptions/export/${format}?${params.toString()}`;

                const response = await fetch(url, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) throw new Error('Error al exportar datos');

                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `suscripciones_${new Date().toISOString().split('T')[0]}.${format}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(downloadUrl);
                document.body.removeChild(a);

                alert(`Datos exportados exitosamente en formato ${format.toUpperCase()}`);
            } catch (error) {
                console.error('Error exporting subscriptions:', error);
                alert('Error al exportar datos: ' + error.message);
            }
        }

        // Quick actions
        async function renewSubscription(subscriptionId) {
            if (!confirm('¿Está seguro que desea renovar esta suscripción por 30 días más?')) {
                return;
            }

            try {
                const response = await fetch(`/admin/subscriptions/${subscriptionId}/renew`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Error al renovar suscripción');
                }

                alert('Suscripción renovada exitosamente hasta ' + new Date(result.subscription.endDate).toLocaleDateString('es-UY'));
                loadSubscriptionStats();
            } catch (error) {
                console.error('Error renewing subscription:', error);
                alert('Error al renovar suscripción: ' + error.message);
            }
        }

        async function cancelSubscription(subscriptionId) {
            if (!confirm('¿Está seguro que desea cancelar esta suscripción? Esta acción no se puede deshacer.')) {
                return;
            }

            try {
                const response = await fetch(`/admin/subscriptions/${subscriptionId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || 'Error al cancelar suscripción');
                }

                alert('Suscripción cancelada exitosamente');
                loadSubscriptionStats();
            } catch (error) {
                console.error('Error cancelling subscription:', error);
                alert('Error al cancelar suscripción: ' + error.message);
            }
        }

        // Payment history functionality
        async function viewPaymentHistory(userId) {
            try {
                const response = await fetch(`/admin/payments/user/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });

                if (!response.ok) throw new Error('Error al cargar historial de pagos');

                const payments = await response.json();
                displayPaymentHistory(payments);

                const modal = document.getElementById('paymentHistoryModal');
                modal.style.display = 'flex';
            } catch (error) {
                console.error('Error loading payment history:', error);
                alert('Error al cargar historial de pagos: ' + error.message);
            }
        }

        function closePaymentModal() {
            const modal = document.getElementById('paymentHistoryModal');
            modal.style.display = 'none';
        }

        function displayPaymentHistory(payments) {
            const container = document.getElementById('paymentHistoryContent');

            if (!payments || payments.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 2rem;">No hay historial de pagos</p>';
                return;
            }

            const statusLabels = {
                'pending': { text: 'Pendiente', color: 'var(--warning-color)' },
                'completed': { text: 'Completado', color: 'var(--success-color)' },
                'failed': { text: 'Fallido', color: 'var(--danger-color)' },
                'refunded': { text: 'Reembolsado', color: 'var(--text-secondary)' }
            };

            container.innerHTML = `
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="background: var(--background);">
                        <tr>
                            <th style="padding: 0.75rem; text-align: left;">Fecha</th>
                            <th style="padding: 0.75rem; text-align: left;">Monto</th>
                            <th style="padding: 0.75rem; text-align: left;">Método</th>
                            <th style="padding: 0.75rem; text-align: left;">Estado</th>
                            <th style="padding: 0.75rem; text-align: left;">ID Transacción</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(payment => {
                            const status = statusLabels[payment.status] || { text: payment.status, color: 'var(--text-secondary)' };
                            const date = new Date(payment.createdAt).toLocaleDateString('es-UY');

                            return `
                                <tr style="border-bottom: 1px solid var(--background);">
                                    <td style="padding: 0.75rem;">${date}</td>
                                    <td style="padding: 0.75rem; font-weight: 500;">
                                        ${payment.amount} ${payment.currency}
                                    </td>
                                    <td style="padding: 0.75rem;">${payment.paymentMethod || 'N/A'}</td>
                                    <td style="padding: 0.75rem;">
                                        <span style="color: ${status.color}; font-weight: 500;">
                                            ${status.text}
                                        </span>
                                    </td>
                                    <td style="padding: 0.75rem; font-size: 0.75rem; color: var(--text-secondary);">
                                        ${payment.transactionId || 'N/A'}
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            `;
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('paymentHistoryModal');
            if (event.target === modal) {
                closePaymentModal();
            }
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
                const response = await fetch('/api/admin/visits/recent?limit=50');
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
