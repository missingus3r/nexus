let dashboardData = null;
let currentTime = null;
let timeUpdateInterval = null;

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
        const response = await fetch('/dashboard/data', {
            credentials: 'include'
        });
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

    // Initialize time display
    if (data.timeData) {
        initializeTimeDisplay(data.timeData);
    }

    // Render weather data
    if (data.weatherData) {
        renderWeather(data.weatherData);
    }

    // Render Bitcoin price
    if (data.bitcoinData) {
        renderBitcoin(data.bitcoinData);
    }

    // Render BCU exchange rates
    if (data.bcuRates) {
        renderBcuRates(data.bcuRates);
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

/**
 * Get weather emoji based on WMO weather code
 */
function getWeatherEmoji(weatherCode) {
    // WMO Weather interpretation codes to emojis
    if (weatherCode === 0) return '☀️'; // Clear sky
    if (weatherCode === 1) return '🌤️'; // Mainly clear
    if (weatherCode === 2) return '⛅'; // Partly cloudy
    if (weatherCode === 3) return '☁️'; // Overcast
    if (weatherCode === 45 || weatherCode === 48) return '🌫️'; // Fog
    if (weatherCode >= 51 && weatherCode <= 57) return '🌧️'; // Drizzle
    if (weatherCode >= 61 && weatherCode <= 67) return '🌧️'; // Rain
    if (weatherCode >= 71 && weatherCode <= 77) return '❄️'; // Snow
    if (weatherCode >= 80 && weatherCode <= 82) return '🌦️'; // Rain showers
    if (weatherCode >= 85 && weatherCode <= 86) return '🌨️'; // Snow showers
    if (weatherCode >= 95 && weatherCode <= 99) return '⛈️'; // Thunderstorm
    return '🌦️'; // Default
}

function renderWeather(weather) {
    const weatherElement = document.getElementById('currentWeather');
    const metaElement = document.getElementById('weatherMeta');
    const iconElement = document.getElementById('weatherIcon');

    if (weatherElement) {
        weatherElement.textContent = `${weather.temperature}°C · ${weather.description}`;
    }

    if (metaElement) {
        metaElement.textContent = `Sensación térmica ${weather.apparentTemperature}°C · Viento ${weather.windSpeed} km/h`;
    }

    if (iconElement) {
        iconElement.textContent = getWeatherEmoji(weather.weatherCode);
    }
}

function renderBitcoin(bitcoin) {
    const priceElement = document.getElementById('bitcoinPrice');
    const changeElement = document.getElementById('bitcoinChange');

    if (priceElement && bitcoin.price) {
        // Format price with thousands separator
        const formattedPrice = bitcoin.price.toLocaleString('es-UY', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
        priceElement.textContent = `USD ${formattedPrice}`;
    }

    if (changeElement && bitcoin.change24h !== undefined) {
        const change = bitcoin.change24h;
        const isPositive = change >= 0;
        const formattedChange = Math.abs(change).toFixed(1);
        const sign = isPositive ? '+' : '-';
        const className = isPositive ? 'positive' : 'negative';

        changeElement.innerHTML = `Cambio 24h: <span class="${className}">${sign}${formattedChange}%</span>`;
    }
}

function renderBcuRates(bcuRates) {
    // Update exchange rates object with BCU data
    if (bcuRates.USD && bcuRates.USD.billete) {
        exchangeRates.USD = bcuRates.USD.billete;
    }
    if (bcuRates.ARS && bcuRates.ARS.value) {
        exchangeRates.ARS = bcuRates.ARS.value;
    }
    if (bcuRates.BRL && bcuRates.BRL.value) {
        exchangeRates.BRL = bcuRates.BRL.value;
    }
    if (bcuRates.UI && bcuRates.UI.value) {
        exchangeRates.UI = bcuRates.UI.value;
    }
    if (bcuRates.UR && bcuRates.UR.value) {
        exchangeRates.UR = bcuRates.UR.value;
    }

    // Update currency card display
    updateCurrencyCard(bcuRates);

    // Update last update time in currency card
    const bcuUpdateTimeEl = document.getElementById('bcuUpdateTime');
    if (bcuRates.lastUpdate && bcuUpdateTimeEl) {
        const updateTime = new Date(bcuRates.lastUpdate);
        const timeStr = updateTime.toLocaleString('es-UY', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        bcuUpdateTimeEl.textContent = `Última actualización: ${timeStr}`;
    }

    // Show error message if sync failed
    const bcuErrorEl = document.getElementById('bcuError');
    if (bcuRates.hasError && bcuErrorEl) {
        bcuErrorEl.textContent = '⚠️ No se pudo obtener los nuevos valores desde el BCU';
        bcuErrorEl.style.display = 'block';
    } else if (bcuErrorEl) {
        bcuErrorEl.style.display = 'none';
    }

    // Update last update time in converter modal
    if (bcuRates.lastUpdate) {
        const updateTime = new Date(bcuRates.lastUpdate);
        const timeStr = updateTime.toLocaleString('es-UY', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        const ratesUpdateTimeEl = document.getElementById('ratesUpdateTime');
        if (ratesUpdateTimeEl) {
            ratesUpdateTimeEl.textContent = timeStr;
        }
    }
}

function renderSurlinkPosts(posts) {
    const container = document.getElementById('surlinkList');

    // Always show "Próximamente" message
    container.innerHTML = '<div class="empty-state"><div class="icon">🚧</div><p>Próximamente</p></div>';
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
        const response = await fetch(`/dashboard/notifications/${notificationId}/read`, {
            method: 'PATCH',
            credentials: 'include'
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
        const response = await fetch('/dashboard/notifications/read-all', {
            method: 'POST',
            credentials: 'include'
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

function updateCurrencyCard(bcuRates = null) {
    // Update all currency values in the card
    const usdValue = document.getElementById('usdValue');
    const eurValue = document.getElementById('eurValue');
    const arsValue = document.getElementById('arsValue');
    const brlValue = document.getElementById('brlValue');
    const uiValue = document.getElementById('uiValue');
    const urValue = document.getElementById('urValue');

    // Helper function to format value with change indicator
    const formatWithChange = (value, change) => {
        const formattedValue = formatNumber(value, value < 1 ? 3 : 2);
        if (change !== undefined && change !== null && change !== 0) {
            const isPositive = change >= 0;
            const sign = isPositive ? '+' : '-';
            const className = isPositive ? 'positive' : 'negative';
            return `${formattedValue} UYU <span class="${className}">${sign}${Math.abs(change).toFixed(1)}%</span>`;
        }
        return `${formattedValue} UYU`;
    };

    if (usdValue) {
        const change = bcuRates?.USD?.change || null;
        usdValue.innerHTML = formatWithChange(exchangeRates.USD, change);
    }

    if (eurValue) {
        // EUR not provided by BCU, keep static
        eurValue.textContent = formatNumber(exchangeRates.EUR, 2) + ' UYU';
    }

    if (arsValue) {
        const change = bcuRates?.ARS?.change || null;
        arsValue.innerHTML = formatWithChange(exchangeRates.ARS, change);
    }

    if (brlValue) {
        const change = bcuRates?.BRL?.change || null;
        brlValue.innerHTML = formatWithChange(exchangeRates.BRL, change);
    }

    if (uiValue) {
        const change = bcuRates?.UI?.change || null;
        uiValue.innerHTML = formatWithChange(exchangeRates.UI, change);
    }

    if (urValue) {
        const change = bcuRates?.UR?.change || null;
        urValue.innerHTML = formatWithChange(exchangeRates.UR, change);
    }
}

// ===== REAL-TIME CLOCK =====

function initializeTimeDisplay(timeData) {
    // Parse the datetime from the API
    const apiTime = new Date(timeData.datetime);

    // Store initial time data
    currentTime = apiTime;

    // Clear any existing interval
    if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
    }

    // Update the display immediately
    updateTimeDisplay(timeData.weekNumber, timeData.utcOffset);

    // Update every second
    timeUpdateInterval = setInterval(() => {
        currentTime = new Date(currentTime.getTime() + 1000);
        updateTimeDisplay(timeData.weekNumber, timeData.utcOffset);
    }, 1000);
}

function updateTimeDisplay(weekNumber, utcOffset) {
    if (!currentTime) return;

    // Format day of week and date
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                       'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    const dayOfWeek = dayNames[currentTime.getDay()];
    const day = currentTime.getDate();
    const month = monthNames[currentTime.getMonth()];

    // Format time with seconds
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentTime.getSeconds()).padStart(2, '0');

    // Update the display
    const dateTimeElement = document.getElementById('currentDateTime');
    const timezoneElement = document.getElementById('timezoneInfo');
    const weekElement = document.getElementById('weekInfo');

    if (dateTimeElement) {
        dateTimeElement.textContent = `${dayOfWeek}, ${day} de ${month} · ${hours}:${minutes}:${seconds}`;
    }

    if (timezoneElement) {
        timezoneElement.textContent = `Montevideo (${utcOffset})`;
    }

    if (weekElement) {
        weekElement.textContent = `Semana: ${weekNumber}`;
    }
}
