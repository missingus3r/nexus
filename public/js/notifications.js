(() => {
  const DEFAULT_DURATION = 4000;
  const HIDE_ANIMATION_MS = 250;

  const ensureContainer = () => {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  };

  const showToast = (message, options = {}) => {
    if (!message) return;

    const { type = 'info', duration = DEFAULT_DURATION } = options;
    const container = ensureContainer();

    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger CSS transition
    requestAnimationFrame(() => {
      toast.classList.add('visible');
    });

    const hide = () => {
      toast.classList.remove('visible');
      setTimeout(() => {
        if (toast.parentElement === container) {
          container.removeChild(toast);
        }
      }, HIDE_ANIMATION_MS);
    };

    const timeoutId = setTimeout(hide, Math.max(HIDE_ANIMATION_MS * 2, duration));

    toast.addEventListener('click', () => {
      clearTimeout(timeoutId);
      hide();
    });

    return toast;
  };

  const createTypedToast = (type) => (message, duration) => showToast(message, { type, duration });

  window.showToast = showToast;
  window.toastSuccess = createTypedToast('success');
  window.toastError = createTypedToast('error');
  window.toastWarning = createTypedToast('warning');
  window.toastInfo = createTypedToast('info');
})();
