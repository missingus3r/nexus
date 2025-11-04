/**
 * Header Common JS
 * Lógica compartida para todos los headers de la aplicación
 */

document.addEventListener('DOMContentLoaded', function() {
    const hamburger = document.getElementById('hamburger');
    const nav = document.getElementById('nav');
    const navOverlay = document.getElementById('navOverlay');

    function toggleMenu() {
        hamburger.classList.toggle('active');
        nav.classList.toggle('active');
        navOverlay.classList.toggle('active');
        document.body.style.overflow = nav.classList.contains('active') ? 'hidden' : '';
    }

    function closeMenu() {
        hamburger.classList.remove('active');
        nav.classList.remove('active');
        navOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (hamburger) {
        hamburger.addEventListener('click', toggleMenu);

        // Close menu when clicking on overlay
        navOverlay.addEventListener('click', closeMenu);

        // Close menu when clicking on a link (except "Acerca de" and theme toggle)
        const navLinks = nav.querySelectorAll('a:not(#aboutLink)');
        navLinks.forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // About link handler (only exists on centinel page)
        const aboutLink = document.getElementById('aboutLink');
        if (aboutLink) {
            aboutLink.addEventListener('click', function(e) {
                e.preventDefault();
                closeMenu();

                // Open about modal if it exists (only on map page)
                const aboutModal = document.getElementById('aboutModal');
                if (aboutModal) {
                    aboutModal.classList.add('active');
                }
            });
        }

        // Prevent menu from closing when clicking on theme toggle
        const themeToggle = nav.querySelector('.theme-toggle-container');
        if (themeToggle) {
            themeToggle.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }
    }

    // Logout handler - limpiar storage antes de redirigir a Auth0
    const logoutLinks = document.querySelectorAll('a[href="/logout"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Limpiar storage local antes del logout
            localStorage.clear();
            sessionStorage.clear();

            // Dejar que Auth0 maneje el logout naturalmente (no preventDefault)
            // Esto asegura que se cierre la sesión OIDC completa
        });
    });
});
