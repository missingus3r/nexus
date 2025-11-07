let dashboardData = null;

// Load dashboard data on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardData();

    // Currency converter event listeners
    const fromAmount = document.getElementById('fromAmount');
    const fromCurrency = document.getElementById('fromCurrency');
    const toCurrency = document.getElementById('toCurrency');

    if (fromAmount) {
        fromAmount.addEventListener('input', performConversion);
    }

    if (fromCurrency) {
        fromCurrency.addEventListener('change', performConversion);
    }

    if (toCurrency) {
        toCurrency.addEventListener('change', performConversion);
    }

    // Update currency values in the insight card
    updateCurrencyCard();
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
    const notifModal = document.getElementById('notificationsModal');
    const currModal = document.getElementById('currencyModal');

    if (event.target === notifModal) {
        closeNotificationsModal();
    }
    if (event.target === currModal) {
        closeCurrencyModal();
    }
};

// ===== CURRENCY CONVERTER =====

// Exchange rates (relative to UYU - Peso Uruguayo)
// These are example rates - in production, you'd fetch these from an API
const exchangeRates = {
    UYU: 1,
    USD: 42.80,
    EUR: 46.10,
    ARS: 0.045,  // Peso Argentino
    BRL: 8.25,   // Real Brasileño
    UI: 5.8247,  // Unidad Indexada
    UR: 4765.32  // Unidad Reajustable
};

function openCurrencyModal() {
    const modal = document.getElementById('currencyModal');
    modal.classList.add('active');

    // Perform initial conversion
    performConversion();
}

function closeCurrencyModal() {
    const modal = document.getElementById('currencyModal');
    modal.classList.remove('active');
}

function swapCurrencies() {
    const fromCurrency = document.getElementById('fromCurrency');
    const toCurrency = document.getElementById('toCurrency');

    // Swap the values
    const temp = fromCurrency.value;
    fromCurrency.value = toCurrency.value;
    toCurrency.value = temp;

    // Perform conversion with new values
    performConversion();
}

function performConversion() {
    const amount = parseFloat(document.getElementById('fromAmount').value) || 0;
    const fromCurrency = document.getElementById('fromCurrency').value;
    const toCurrency = document.getElementById('toCurrency').value;

    // Convert to UYU first, then to target currency
    const amountInUYU = amount * exchangeRates[fromCurrency];
    const result = amountInUYU / exchangeRates[toCurrency];

    // Calculate exchange rate
    const rate = exchangeRates[toCurrency] / exchangeRates[fromCurrency];

    // Update UI
    document.getElementById('conversionResult').textContent = formatCurrency(result, toCurrency);
    document.getElementById('conversionRate').textContent = `1 ${fromCurrency} = ${formatNumber(rate, 4)} ${toCurrency}`;

    // Update last update time
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('ratesUpdateTime').textContent = `hoy a las ${timeStr}`;
}

function formatCurrency(value, currency) {
    // Format based on currency
    if (currency === 'ARS' || currency === 'UYU') {
        return value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else if (currency === 'UI') {
        return value.toLocaleString('es-UY', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
    } else if (currency === 'UR') {
        return value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
        return value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}

function formatNumber(value, decimals = 2) {
    return value.toLocaleString('es-UY', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
    });
}

function updateCurrencyCard() {
    // Update all currency values in the card
    const usdValue = document.getElementById('usdValue');
    const eurValue = document.getElementById('eurValue');
    const arsValue = document.getElementById('arsValue');
    const brlValue = document.getElementById('brlValue');
    const uiValue = document.getElementById('uiValue');
    const urValue = document.getElementById('urValue');

    if (usdValue) {
        usdValue.textContent = formatNumber(exchangeRates.USD, 2) + ' UYU';
    }

    if (eurValue) {
        eurValue.textContent = formatNumber(exchangeRates.EUR, 2) + ' UYU';
    }

    if (arsValue) {
        arsValue.textContent = formatNumber(exchangeRates.ARS, 3) + ' UYU';
    }

    if (brlValue) {
        brlValue.textContent = formatNumber(exchangeRates.BRL, 2) + ' UYU';
    }

    if (uiValue) {
        uiValue.textContent = formatNumber(exchangeRates.UI, 4) + ' UYU';
    }

    if (urValue) {
        urValue.textContent = formatNumber(exchangeRates.UR, 2) + ' UYU';
    }
}
