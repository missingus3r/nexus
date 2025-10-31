let dashboardData = null;

// Load dashboard data on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardData();
});

async function loadDashboardData() {
    try {
        const response = await fetch('/api/dashboard/data');
        const result = await response.json();

        if (result.success) {
            dashboardData = result.data;
            renderDashboard(dashboardData);
        } else {
            console.error('Error loading dashboard:', result.error);
        }
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
    }
}

function renderDashboard(data) {
    // Render user info
    document.getElementById('userName').textContent = data.user.name;
    document.getElementById('userEmail').textContent = data.user.email;
    document.getElementById('userAvatar').src = data.user.picture || '/images/default-avatar.png';

    // Update notification badge
    if (data.unreadNotificationsCount > 0) {
        document.getElementById('notificationBadge').textContent = data.unreadNotificationsCount;
        document.getElementById('notificationBadge').style.display = 'inline-block';
    } else {
        document.getElementById('notificationBadge').style.display = 'none';
    }

    // Render Centinel alerts
    renderCentinelAlerts(data.incidents);

    // Render Surlink posts
    renderSurlinkPosts(data.surlinkPosts);

    // Render forum threads
    renderForumThreads(data.forumThreads);
}

function renderCentinelAlerts(incidents) {
    const container = document.getElementById('centinelList');

    if (incidents.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>No hay alertas recientes</p></div>';
        return;
    }

    container.innerHTML = incidents.map(incident => {
        const typeLabels = {
            'homicidio': 'Homicidio',
            'rapiña': 'Rapiña',
            'hurto': 'Hurto',
            'copamiento': 'Copamiento',
            'violencia_domestica': 'Violencia Doméstica',
            'narcotrafico': 'Narcotráfico',
            'otro': 'Otro'
        };

        const date = new Date(incident.createdAt);
        const timeAgo = getTimeAgo(date);

        return `
            <div class="item">
                <h3>${typeLabels[incident.type] || incident.type}</h3>
                <p>${incident.description || 'Sin descripción'}</p>
                <div class="item-meta">
                    <span class="severity-badge severity-${incident.severity}">Nivel ${incident.severity}</span>
                    <span>📍 ${incident.neighborhood || 'Ubicación desconocida'}</span>
                    <span>🕒 ${timeAgo}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderSurlinkPosts(posts) {
    const container = document.getElementById('surlinkList');

    if (posts.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>No hay publicaciones recientes</p></div>';
        return;
    }

    container.innerHTML = posts.map(post => {
        const categoryLabels = {
            'casas': 'Inmuebles',
            'autos': 'Autos',
            'academy': 'Academia'
        };

        const date = new Date(post.createdAt);
        const timeAgo = getTimeAgo(date);

        const price = post.price?.amount
            ? `${post.price.currency} ${post.price.amount.toLocaleString()}`
            : 'Consultar';

        return `
            <div class="item" onclick="window.location.href='/surlink?id=${post.id}'">
                <h3>${post.title}</h3>
                <div class="item-meta">
                    <span class="category-badge">${categoryLabels[post.category] || post.category}</span>
                    <span>💰 ${price}</span>
                    <span>📍 ${post.city || 'Sin ubicación'}</span>
                    <span>🕒 ${timeAgo}</span>
                </div>
            </div>
        `;
    }).join('');
}

function renderForumThreads(threads) {
    const container = document.getElementById('forumList');

    if (threads.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📭</div><p>No hay discusiones recientes</p></div>';
        return;
    }

    container.innerHTML = threads.map(thread => {
        const date = new Date(thread.createdAt);
        const timeAgo = getTimeAgo(date);

        return `
            <div class="item" onclick="window.location.href='/forum-thread/${thread.id}'">
                <h3>${thread.title}</h3>
                <div class="item-meta">
                    ${thread.hashtags.slice(0, 3).map(tag =>
                        `<span class="category-badge">#${tag}</span>`
                    ).join('')}
                    <span>❤️ ${thread.likesCount}</span>
                    <span>💬 ${thread.commentsCount}</span>
                    <span>🕒 ${timeAgo}</span>
                </div>
            </div>
        `;
    }).join('');
}

function openNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    modal.classList.add('active');
    renderNotifications(dashboardData?.notifications || []);
}

function closeNotificationsModal() {
    const modal = document.getElementById('notificationsModal');
    modal.classList.remove('active');
}

function renderNotifications(notifications) {
    const container = document.getElementById('notificationsList');

    if (notifications.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">✅</div><p>No tienes notificaciones pendientes</p></div>';
        return;
    }

    container.innerHTML = notifications.map(notification => {
        const date = new Date(notification.createdAt);
        const timeAgo = getTimeAgo(date);
        const unreadClass = !notification.read ? 'unread' : '';

        return `
            <div class="notification-item ${unreadClass}" onclick="markNotificationAsRead('${notification._id}')">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
                <div class="notification-time">🕒 ${timeAgo}</div>
            </div>
        `;
    }).join('');
}

async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetch(`/api/dashboard/notifications/${notificationId}/read`, {
            method: 'PATCH'
        });

        if (response.ok) {
            // Reload dashboard data
            await loadDashboardData();
            // Re-render notifications
            renderNotifications(dashboardData?.notifications || []);
        }
    } catch (error) {
        console.error('Error marking notification as read:', error);
    }
}

async function markAllAsRead() {
    try {
        const response = await fetch('/api/dashboard/notifications/read-all', {
            method: 'POST'
        });

        if (response.ok) {
            // Reload dashboard data
            await loadDashboardData();
            closeNotificationsModal();
        }
    } catch (error) {
        console.error('Error marking all notifications as read:', error);
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + ' años';

    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + ' meses';

    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + ' días';

    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + ' horas';

    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + ' minutos';

    return 'Hace un momento';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('notificationsModal');
    if (event.target === modal) {
        closeNotificationsModal();
    }
};
