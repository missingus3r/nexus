// Hamburger menu functionality
const hamburger = document.querySelector('.hamburger');
const nav = document.querySelector('.platform-nav nav');

hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    nav.classList.toggle('active');
});

// Close menu when clicking on a link
const navLinks = document.querySelectorAll('.platform-nav nav a');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        hamburger.classList.remove('active');
        nav.classList.remove('active');
    });
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.platform-nav') && nav.classList.contains('active')) {
        hamburger.classList.remove('active');
        nav.classList.remove('active');
    }
});
