/**
 * Modal Helper - Utilities for managing modal behavior
 * Handles body scroll locking and modal accessibility
 */

// Track scroll position before locking
let scrollPosition = 0;

/**
 * Lock body scroll when modal opens
 */
function lockBodyScroll() {
    scrollPosition = window.pageYOffset;
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollPosition}px`;
    document.body.style.width = '100%';
    document.body.classList.add('modal-open');
}

/**
 * Unlock body scroll when modal closes
 */
function unlockBodyScroll() {
    document.body.style.removeProperty('overflow');
    document.body.style.removeProperty('position');
    document.body.style.removeProperty('top');
    document.body.style.removeProperty('width');
    document.body.classList.remove('modal-open');
    window.scrollTo(0, scrollPosition);
}

/**
 * Open a modal by ID
 * @param {string} modalId - The ID of the modal to open
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        lockBodyScroll();
        modal.classList.add('active');
        modal.style.display = 'flex';

        // Focus first focusable element for accessibility
        const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable) {
            setTimeout(() => focusable.focus(), 100);
        }
    }
}

/**
 * Close a modal by ID
 * @param {string} modalId - The ID of the modal to close
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            unlockBodyScroll();
        }, 300);
    }
}

/**
 * Setup modal close on background click
 * @param {string} modalId - The ID of the modal
 */
function setupModalBackgroundClose(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modalId);
            }
        });
    }
}

/**
 * Setup all modals on the page
 * Call this on DOMContentLoaded
 */
function initializeModals() {
    // Find all modals
    const modals = document.querySelectorAll('.modal');

    modals.forEach(modal => {
        const modalId = modal.id;
        if (!modalId) return;

        // Setup background close
        setupModalBackgroundClose(modalId);

        // Setup close button
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => closeModal(modalId));
        }

        // Setup ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('active')) {
                closeModal(modalId);
            }
        });
    });
}

// Auto-initialize on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModals);
} else {
    initializeModals();
}
