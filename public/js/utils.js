/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} - Escaped text
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Get relative time from date
 * @param {Date} date - Date to format
 * @returns {string} - Formatted relative time
 */
function getTimeAgo(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);

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

/**
 * Format date for display
 * @param {string|Date} dateString - Date to format
 * @returns {string} - Formatted date
 */
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

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
  window.getTimeAgo = getTimeAgo;
  window.formatDate = formatDate;
}
