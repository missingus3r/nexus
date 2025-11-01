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

const modal = document.getElementById('adoption-modal');
const openModalButton = document.getElementById('open-adoption-modal');
const closeModalButton = document.getElementById('close-adoption-modal');

const toggleModal = (show) => {
  if (!modal) return;

  const isActive = modal.classList.contains('active');
  const shouldShow = typeof show === 'boolean' ? show : !isActive;

  if (shouldShow) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    if (closeModalButton) {
      closeModalButton.focus();
    }
  } else {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    if (openModalButton) {
      openModalButton.focus();
    }
  }
};

if (openModalButton) {
  openModalButton.addEventListener('click', () => toggleModal(true));
}

if (closeModalButton) {
  closeModalButton.addEventListener('click', () => toggleModal(false));
}

if (modal) {
  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      toggleModal(false);
    }
  });
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && modal?.classList.contains('active')) {
    toggleModal(false);
  }
});
