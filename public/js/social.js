const hamburger = document.querySelector('.hamburger');
const nav = document.querySelector('.platform-nav nav');

if (hamburger && nav) {
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    nav.classList.toggle('active');
  });

  nav.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      nav.classList.remove('active');
    });
  });

  document.addEventListener('click', (event) => {
    const isClickInsideNav = event.target.closest('.platform-nav');
    if (!isClickInsideNav) {
      hamburger.classList.remove('active');
      nav.classList.remove('active');
    }
  });
}

// Adoption modal functionality
const adoptionModal = document.getElementById('adoption-modal');
const openAdoptionModalButton = document.getElementById('open-adoption-modal');
const closeAdoptionModalButton = document.getElementById('close-adoption-modal');

const toggleAdoptionModal = (show) => {
  if (!adoptionModal) return;

  const isActive = adoptionModal.classList.contains('active');
  const shouldShow = typeof show === 'boolean' ? show : !isActive;

  if (shouldShow) {
    adoptionModal.classList.add('active');
    adoptionModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (closeAdoptionModalButton) {
      closeAdoptionModalButton.focus();
    }
  } else {
    adoptionModal.classList.remove('active');
    adoptionModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (openAdoptionModalButton) {
      openAdoptionModalButton.focus();
    }
  }
};

if (openAdoptionModalButton) {
  openAdoptionModalButton.addEventListener('click', () => toggleAdoptionModal(true));
}

if (closeAdoptionModalButton) {
  closeAdoptionModalButton.addEventListener('click', () => toggleAdoptionModal(false));
}

if (adoptionModal) {
  adoptionModal.addEventListener('click', (event) => {
    if (event.target === adoptionModal) {
      toggleAdoptionModal(false);
    }
  });
}

// Lost & Found modal functionality
const lostFoundModal = document.getElementById('lost-found-modal');
const openLostFoundModalButton = document.getElementById('open-lost-found-modal');
const closeLostFoundModalButton = document.getElementById('close-lost-found-modal');

const toggleLostFoundModal = (show) => {
  if (!lostFoundModal) return;

  const isActive = lostFoundModal.classList.contains('active');
  const shouldShow = typeof show === 'boolean' ? show : !isActive;

  if (shouldShow) {
    lostFoundModal.classList.add('active');
    lostFoundModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (closeLostFoundModalButton) {
      closeLostFoundModalButton.focus();
    }
  } else {
    lostFoundModal.classList.remove('active');
    lostFoundModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (openLostFoundModalButton) {
      openLostFoundModalButton.focus();
    }
  }
};

if (openLostFoundModalButton) {
  openLostFoundModalButton.addEventListener('click', () => toggleLostFoundModal(true));
}

if (closeLostFoundModalButton) {
  closeLostFoundModalButton.addEventListener('click', () => toggleLostFoundModal(false));
}

if (lostFoundModal) {
  lostFoundModal.addEventListener('click', (event) => {
    if (event.target === lostFoundModal) {
      toggleLostFoundModal(false);
    }
  });
}

// Global escape key listener for all modals
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    if (adoptionModal?.classList.contains('active')) {
      toggleAdoptionModal(false);
    }
    if (lostFoundModal?.classList.contains('active')) {
      toggleLostFoundModal(false);
    }
  }
});
